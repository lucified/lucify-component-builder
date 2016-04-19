
const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const mkpath = require('mkpath');
const del = require('del');
const parseArgs = require('minimist');
const replaceall = require('replaceall');
const gutil = require('gulp-util');
const s3 = require('./s3.js');
const ENVS = require('./envs.js');
const defaultArtifactFile = 'build-info.json';
const Promise = require('bluebird');

const bundleWebpack = require('./bundle-webpack.js');

const embedCodeUtils = require('./embed-code-utils.js');
const pageDefUtils = require('./page-def-utils.js');

const githubDeploy = require('./github-deploy.js');

const j = path.join;

const notify = require('./flowdock-notify');

const computeOptions = require('./deploy-options');
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



function getTempFileName(componentPath) {
  var ret = componentPath === '' ? 'component.jsx' : 'component' + replaceall('/', '-', componentPath) + '.jsx';
  return ret;
}

/*
 * Copy bootstrap JSX files to the project's temp directory
 *
 * We cannot only set up the entry point and make it reference
 * resources via require('lucify-component-builder/...'), because
 * resolving those requires will not work for the test-projects,
 * which have a symlinked lucify-component-builder in their node_modules.
 *
 * The reason why that does not work is that require() uses the realPath
 *
 *
 */
function copyTempJsx() {
  return gulp.src(__dirname + '/react-bootstrap/*.jsx')
    .pipe(gulp.dest('temp'));
}


function generateMetaData(path) {
  var data = {
    stampUpdated: Math.floor(new Date().getTime() / 1000)
  };
  fs.writeFileSync(j(path, 'lucify-metadata.json'), JSON.stringify(data));
}


/*
 * Create JSX and run webpack to create the associated bundle
 *
 * destPath      -- path below which all files are created
 * entryPoint    -- path to entry point for bundle
 * componentPath -- path to React component to be bundled (only applies if entry point not defined)
 * reactRouter   -- enable react-router
 * pageDefs      -- page definitions for creating associated html files
 * watch         -- start watching with webback-dev-server
 *
 */
function createJsxAndBundle(destPath, entryPoint, componentPath, reactRouter, pageDefs, watch, assetContext, babelPaths, callback) {

  if (!entryPoint) {
    var tempFileName = getTempFileName(componentPath);
    generateJSX(reactRouter, componentPath, tempFileName);
    entryPoint = './temp/' + tempFileName;
  }

  generateMetaData(destPath);
  bundleWebpack.bundle(
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
  var bootstrapper = './bootstrap-component.jsx';
  if (reactRouter) {
    bootstrapper = './bootstrap-react-router-component.jsx';
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
    createJsxAndBundle(context.destPath, opts.entryPoint, componentPath,
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
    return createJsxAndBundlePromisified(destPath, null, edef.componentPath,
      opts.reactRouter, [pageDef], watch, assetContext + edef.path.substring(1) + '/', opts.babelPaths);
  });

  return Promise.all(promises).then(function() {
    callback();
  }).error(function(err) {
    gutil.log(`Error(s) during bundling ${err}`);
  });

}


function bundleEmbedBootstrap(context, assetContext, callback) {
  var entryPoint = require.resolve('./entry-points/embed.jsx');
  var outputFileName = 'embed.js';
  var destPath = context.destPath;
  var pageDefs = null;
  var watch = false;
  return bundleWebpack.bundle(entryPoint, outputFileName, destPath, pageDefs, watch, assetContext, null, callback);
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
  return bundleWebpack.bundle(entryPoint, outputFileName, destPath, pageDefs, watch, assetContext, null, callback);
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




function getEnv() {
  if(process.env.LUCIFY_ENV)
    return process.env.LUCIFY_ENV;
  if(process.env.NODE_ENV)
    return process.env.NODE_ENV;
  return ENVS.TEST;
}

function clean(folder) {
  return del(folder || 'dist')
    .catch(console.log);
}


function writeBuildArtifact(url, fileName, cb) {
  const fn = fileName || defaultArtifactFile;
  const folder = process.env.CIRCLE_ARTIFACTS;
  if(folder)
    fs.writeFileSync(`${folder}/${fn}`, JSON.stringify({url: url}));
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

  const deployOpt = computeOptions(getEnv(), opts);

  context.assetPath = !deployOpt.assetContext ? '' : deployOpt.assetContext;

  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('copy-temp-jsx', copyTempJsx);
  gulp.task('bundle-components', bundleComponents.bind(null, opts, context, deployOpt.assetContext));
  gulp.task('bundle-embed-bootstrap', bundleEmbedBootstrap.bind(null, context, deployOpt.assetContext));
  gulp.task('bundle-resize', bundleResize.bind(null, context, opts.assetContext));
  gulp.task('embed-codes', embedCodeUtils.embedCodes.bind(null, context, opts, deployOpt.baseUrl, deployOpt.assetContext));
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
    'copy-temp-jsx',
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

prepareBuildTasks.computeOptions = computeOptions.bind(null, getEnv());
prepareBuildTasks.webpackConf = bundleWebpack.getConfig;
prepareBuildTasks.bundle = bundleWebpack.plainBundle;
prepareBuildTasks.clean = clean;

module.exports = prepareBuildTasks;
