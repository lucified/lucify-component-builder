"use strict";

var gulp = require('gulp');
var path = require('path');
var through2   = require("through2");
var $ = require('gulp-load-plugins')();
var fs = require('fs');
var mkpath = require('mkpath');
var del = require('del');
var parseArgs = require('minimist');
var mergeStream = require('merge-stream');
var replaceall = require("replaceall");
var Promise = require('bluebird');
var request = require('request')

var s3 = require('./s3.js')
var bundleWebpack = require('./bundle-webpack.js');

var embedCodeUtils = require('./embed-code-utils.js');
var pageDefUtils = require('./page-def-utils.js');


var src  = gulp.src;
var dest = gulp.dest;
var j = path.join;

const ENVS = require('./envs.js')
const defaultArtifactFile = 'build-info.json'
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
  console.log("Using AWS profile " + options.profile);
  process.env['AWS_DEFAULT_PROFILE'] = options.profile;
}

var context = require('./build-context.js')(options.dev, options.optimize, options.uglify);


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
  return bundleWebpack(
      entryPoint,
      null,
      destPath,
      pageDefs,
      watch,
      assetContext,
      babelPaths,
      callback);
}
var createJsxAndBundlePromisified = Promise.promisify(createJsxAndBundle);


/*
 * Generate temporary JSX for wrapping the React
 * component at given path as an embeddable component
 */
function generateJSX(reactRouter, componentPath, tempFileName) {
  var bootstrapper = require.resolve('./react-bootstrap/bootstrap-component.jsx');
  if (reactRouter) {
    bootstrapper = require.resolve('./react-bootstrap/bootstrap-react-router-component.jsx');
  }
  var templateFile = require.resolve('./react-bootstrap/component-template.jsx');
  var template = fs.readFileSync(templateFile, 'utf8');
  var data = template.replace('%REPLACE%', componentPath)
    .replace('%BOOTSTRAPPER%', bootstrapper);
  var destpath = "temp/";
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
function bundleComponents(opts, context, callback) {

  var pageDefs = pageDefUtils.getEnrichedPageDefs(opts);

  if (!opts.embedDefs) {
    var watch = context.dev; // TODO
    var componentPath = 'index.js';
    createJsxAndBundle(context.destPath, componentPath,
      opts.reactRouter, pageDefs, watch, opts.assetContext, opts.babelPaths, callback);
    return;
  };

  // multi-embeds are built one at a time
  //
  // (while webpack allows for multiple entry points
  // this seemed to get really complicated when considering
  // the need to also create index.html:s within a directory
  // structure)
  var promises = opts.embedDefs.map(edef => {
    var destPath = context.destPath + edef.path.substring(1);
    var reactRouter = false; // TODO
    var watch = false;
    var pageDef = pageDefUtils.enrichPageDef(edef, opts.baseUrl, opts.assetContext);
    pageDef.path = '';
    return createJsxAndBundlePromisified(destPath, edef.componentPath,
      opts.reactRouter, [pageDef], watch, opts.assetContext + edef.path.substring(1) + '/', opts.babelPaths);
  });
  return Promise.all(promises).then(function() {
    callback();
  }).error(function(err) {
    console.log("error with with bundling" + err);
  });

}


/*
 * Bundle the generic embed bootstrap code
 * (which is the same for different components)
 */
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


function githubDeploy(project, org, branch, env, flow, cb) {

    const task = "deploy"
    const robotName = "lucifer"

    var body = {
      ref: branch,
      task: task,
      force: false,
      auto_merge: false,
      environment: env,
      required_contexts: [],
      description: `${task} on ${env} from lucify-component-builder`,
      payload: {
        name: project,
        robotName: robotName,
        hosts: "",
        notify: {
          adapter: "flowdock",
          room: flow
//          user: @user
//          message_id: @messageId
//          thread_id: @threadId
        },
        config: {
          provider: "circleci",
          circle_build_num: process.env.CIRCLE_BUILD_NUM
        }
      }
    }

    var options = {
      url: `https://api.github.com/repos/${org}/${project}/deployments`,
      method: 'POST',
      auth: {
        user: "lucified-lucifer",
        pass: process.env.GITHUB_TOKEN
      },
      headers: {
        'User-Agent': org
      },
      json: true,
      body: body
    }



    request(options, (error, res, body) => {
      if(error) {
        console.log(error)
        return cb(error)
      }

      const STATUS = res.statusCode
      const HEADERS = res.headers
      const BODY = body

      if(STATUS < 200 || STATUS >= 300) {
        console.log(`STATUS: ${STATUS}`);
        console.log(`HEADERS: ${JSON.stringify(HEADERS)}`);
        console.log(`BODY: ${JSON.stringify(BODY)}`);
        var err = new Error(`Received status ${STATUS}`)
        err.options = options
        return cb(err)
      }
      cb(null, {options, body})
    });
}



function writeBuildArtifact(url, fileName, cb) {
  const fn = fileName || defaultArtifactFile
  const folder = process.env.CIRCLE_ARTIFACTS
  if(folder)
    require('fs').writeFileSync(`${folder}/${fn}`, JSON.stringify({url: url}))
  cb()
}



function getEnv() {
  if(process.env.LUCIFY_ENV)
    return process.env.LUCIFY_ENV
  if(process.env.NODE_ENV)
    return process.env.NODE_ENV
  return ENVS.TEST;
}


var prep = function(gulp, opts) {
  if (!opts) {
      opts = {};
  }

  context.assetPath = !opts.assetContext ? "" : opts.assetContext;

  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('bundle-components', bundleComponents.bind(null, opts, context));
  gulp.task('bundle-embed-bootstrap', bundleEmbedBootstrap.bind(null, context, opts.assetContext));
  gulp.task('bundle-resize', bundleResize.bind(null, context, opts.assetContext));
  gulp.task('embed-codes', embedCodeUtils.embedCodes.bind(null, context, opts));
  //gulp.task('serve-prod', serveProd);
  gulp.task('setup-dist-build', setupDistBuild);

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

  const deployOpt = require('./deploy-options')(getEnv(), opts)


  gulp.task('s3-deploy', s3.publish
    .bind(null,
      s3.entryPointStream(opts.publishFromFolder),
      s3.assetStream(opts.publishFromFolder, opts.maxAge),
      deployOpt.bucket,
      options.simulate,
      options.force
    )
  )

  gulp.task('github-deploy', githubDeploy.bind(null,
      deployOpt.project,
      deployOpt.org,
      deployOpt.branch,
      deployOpt.env,
      deployOpt.flow
    )
  )

  gulp.task('build-artifact', writeBuildArtifact.bind(null, deployOpt.url, opts.artifactFile || defaultArtifactFile))

};

prep.getEnv = getEnv
prep.githubDeploy = githubDeploy
prep.options = options


module.exports = prep
