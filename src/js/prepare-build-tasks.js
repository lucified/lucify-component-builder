
var gulp = require('gulp');
var path = require('path');
var fs = require('fs');
var mkpath = require('mkpath');
var del = require('del');
var parseArgs = require('minimist');
var mergeStream = require('merge-stream');
var replaceall = require('replaceall');
var request = require('request');
var git = require('git-rev-sync');
var gutil = require('gulp-util');
var s3 = require('./s3.js');
const ENVS = require('./envs.js');
const defaultArtifactFile = 'build-info.json';
var Promise = require('bluebird');

//var buildTools = require('lucify-build-tools');
var bundleWebpack = require('./bundle-webpack.js');

var embedCodeUtils = require('./embed-code-utils.js');
var pageDefUtils = require('./page-def-utils.js');

var githubDeploy = require('./github-deploy.js');

var j = path.join;


//
// Detect options and prepare build context accordingly
// ----------------------------------------------------
//

var options = parseArgs(process.argv, {default: {
  optimize: false,
  uglify: false,
  dev: true,
  force: false,
  simulate: false,
  bucket: null,
  profile: null
}});

if (options.profile != null) {
  gutil.log('Using AWS profile ' + options.profile);
  process.env['AWS_DEFAULT_PROFILE'] = options.profile;
}

var context = require('./build-context.js')(
    options.dev, options.optimize, options.uglify);


//
// Private functions
// -----------------
//

function getTempFileName(path) {
  var ret = path === '' ? 'component.jsx' : 'component'
    + replaceall('/', '-', path);
    //+ replaceall('/', '-', path) + '.jsx';
  return ret;
}
String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


function bundleComponents(opts, context) {
  if (!opts.embedDefs) {
    return createJsxAndBundle(opts, context, {
      reactRouter: opts.reactRouter,
      componentPath: 'index.js',
      path: ''});
  }
  return mergeStream(opts.embedDefs.map(function(edef) {
    return createJsxAndBundle(opts, context, edef);
  }));
}



function getTempFileName(componentPath) {
  var ret = componentPath === '' ? 'component.jsx' : 'component' + replaceall('/', '-', componentPath) + '.jsx';
  return ret;
}


/*
 * Create JSX and run webpack to create the associated bundle
 *
 * destPath      -- path below which all files are created
 * componentPath -- path to React component to be bundled
 * reactRouter   -- enable react-router
 * pageDefs      -- page definitions for creating associated html files
 * watch         -- start watching with webback-dev-server
 *
 */
function createJsxAndBundle(destPath, componentPath, reactRouter, pageDefs, watch, assetContext, babelPaths, callback) {
  var tempFileName = getTempFileName(componentPath);
  generateJSX(reactRouter, componentPath, tempFileName);
  var entryPoint = './temp/' + tempFileName;

  gulp.src('./react-boostrap/*')
    .pipe(gulp.dest('temp'))
    .on('end', function() {
      bundleWebpack(
        entryPoint,
        null,
        destPath,
        pageDefs,
        watch,
        assetContext,
        babelPaths,
        callback);
    }
  );
}

var createJsxAndBundlePromisified = Promise.promisify(createJsxAndBundle);


/*
 * Generate temporary JSX for wrapping the React
 * component at given path as an embeddable component
 */
function generateJSX(reactRouter, componentPath, tempFileName) {
  var bootstrapper = './bootstrap-component.jsx';
  //var bootstrapper = require.resolve('./react-bootstrap/bootstrap-component.jsx');
  if (reactRouter) {
    bootstrapper = './bootstrap-react-router-component.jsx';
    //bootstrapper = require.resolve('./react-bootstrap/bootstrap-react-router-component.jsx');
  }
  var templateFile = require.resolve('./react-bootstrap/component-template.jsx');
  var template = fs.readFileSync(templateFile, 'utf8');
  var data = template.replace('%REPLACE%', componentPath)
    .replace('%BOOTSTRAPPER%', bootstrapper);
  var destpath = 'temp/';
  mkpath.sync(destpath);
  fs.writeFileSync(destpath + tempFileName, data);
}


//
// Functions mapping directly to gulp tasks
// ----------------------------------------
//

/*
 * Bundle the main component(s)
 */
function bundleComponents(opts, context, assetContext, callback) {

  var pageDefs = pageDefUtils.getEnrichedPageDefs(opts);

  if (!opts.embedDefs) {
    var watch = context.dev; // TODO
    var componentPath = 'index.js';
    createJsxAndBundle(context.destPath, componentPath,
      opts.reactRouter, pageDefs, watch, assetContext, opts.babelPaths, callback);
    return;
  }

  // multi-embeds are built one at a time
  //
  // (while webpack allows for multiple entry points
  // this seemed to get really complicated when considering
  // the need to also create index.html:s within a directory
  // structure)
  var promises = opts.embedDefs.map(edef => {
    var destPath = context.destPath + edef.path.substring(1);
    var watch = false;
    var pageDef = pageDefUtils.enrichPageDef(edef, opts.baseUrl, assetContext);
    pageDef.path = '';
    return createJsxAndBundlePromisified(destPath, edef.componentPath,
      opts.reactRouter, [pageDef], watch, assetContext + edef.path.substring(1) + '/', opts.babelPaths);
  });

  return Promise.all(promises).then(function() {
    callback();
  }).error(function(err) {
    gutil.log('error with with bundling' + err);
  });

}


function bundleEmbedBootstrap(context, assetContext, callback) {
  var entryPoint = require.resolve('./entry-points/embed.jsx');
  var outputFileName = 'embed.js';
  var destPath = context.destPath;
  var pageDefs = null;
  var watch = false;
  return bundleWebpack(entryPoint, outputFileName, destPath, pageDefs, watch, assetContext, null, callback);
}

/*
 * Bundle code for resizing embedded iFrame
 */
function bundleResize(context, assetContext, callback) {
  var entryPoint = require.resolve('./entry-points/resize.jsx');
  var outputFileName = 'resize.js';
  var destPath = context.destPath;
  var pageDefs = null;
  var watch = false;
  return bundleWebpack(entryPoint, outputFileName, destPath, pageDefs, watch, assetContext, null, callback);
}

/*
 * Prepare standard skeleton for some data-assets
 */
function prepareSkeleton(cb) {
  mkpath.sync(j('temp', 'data-assets'));
  mkpath.sync(j('temp', 'generated-images'));
  mkpath.sync('build');
  cb();
}


/*
 * Setup a distribution build
 */
function setupDistBuild(cb) {
  context.dev = false;
  context.destPath = j('dist', context.assetPath);
  del.sync('dist');
  cb();
}


function notify(project, org, branch, env, url, cb) {

  // we still support also the legacy flowdock PUSH api
  // notification, which will be delivered if a FLOW_TOKEN
  // is defined.

  if (!process.env.FLOW_TOKEN) {
    cb();
    return;
  }

  var gitMessage = git.message();

  var options = {
    url: `https://api.flowdock.com/v1/messages/team_inbox/${process.env.FLOW_TOKEN}`,
    method: 'POST',
    json: true,
    body: {
      'source': 'CircleCI',
      //"from_name": "Mr. Robot",
      'from_address': 'deploy@lucify.com',
      'subject': `Deployed branch ${project}/${branch} to ${env}`,
      'content': `<p>${gitMessage}</p> <p>${url}</p>`,
      'project': project,
      'tags':  ['#deployment', `#${env}`]
    }
  };
  request(options, (error, res, body) => {
    if(error) {
      gutil.log(error);
      return cb();
    }
    if(res.statusCode != 200) {
      gutil.log(`STATUS: ${res.statusCode}`);
      gutil.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      gutil.log(`BODY: ${JSON.stringify(body)}`);
    }
    cb();
  });
}


function getEnv() {
  if(process.env.LUCIFY_ENV)
    return process.env.LUCIFY_ENV;
  if(process.env.NODE_ENV)
    return process.env.NODE_ENV;
  return ENVS.TEST;
}


function writeBuildArtifact(url, fileName, cb) {
  const fn = fileName || defaultArtifactFile;
  const folder = process.env.CIRCLE_ARTIFACTS;
  if(folder)
    require('fs').writeFileSync(`${folder}/${fn}`, JSON.stringify({url: url}));
  cb();
}


//
// Setting up of tasks for CLI
// ---------------------------
//

var prepareBuildTasks = function(gulp, opts) {
  if (!opts) {
    opts = {};
  }

  // set default for embedCodes option to true
  opts.embedCodes = opts.embedCodes === false ? false : true;

  const deployOpt = require('./deploy-options')(getEnv(), opts);

  context.assetPath = !deployOpt.assetContext ? '' : deployOpt.assetContext;

  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('bundle-components', bundleComponents.bind(null, opts, context, deployOpt.assetContext));
  gulp.task('bundle-embed-bootstrap', bundleEmbedBootstrap.bind(null, context, deployOpt.assetContext));
  gulp.task('bundle-resize', bundleResize.bind(null, context, opts.assetContext));
  gulp.task('embed-codes', embedCodeUtils.embedCodes.bind(null, context, opts, deployOpt.baseUrl, deployOpt.assetContext));
  //gulp.task('serve-prod', buildTools.serveProd);
  gulp.task('setup-dist-build', setupDistBuild);
  gulp.task('notify', notify.bind(null, deployOpt.project,
       deployOpt.org,
       deployOpt.branch,
       deployOpt.env,
       deployOpt.url
       )
  );

  gulp.task('build-artifact', writeBuildArtifact.bind(null, deployOpt.url, opts.artifactFile || defaultArtifactFile));

  gulp.task('github-deploy', githubDeploy.bind(null,
       deployOpt.project,
       deployOpt.org,
       deployOpt.branch,
       deployOpt.env,
       deployOpt.flow
     )
  );

  var buildTaskNames = [
    'embed-codes',
    'bundle-embed-bootstrap',
    'bundle-resize',
    'bundle-components'];

  if (opts.pretasks) {
    buildTaskNames = opts.pretasks.concat(buildTaskNames);
  }
  buildTaskNames = ['prepare-skeleton'].concat(buildTaskNames);

  gulp.task('build', gulp.series(buildTaskNames));
  gulp.task('dist', gulp.series('setup-dist-build', 'build'));
  gulp.task('default', gulp.series('build'));

  gulp.task('s3-deploy', s3.publish
    .bind(null, opts.publishFromFolder, deployOpt));

};


module.exports = prepareBuildTasks;
