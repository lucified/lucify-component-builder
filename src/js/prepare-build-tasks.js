
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

var buildTools = require('lucify-build-tools');
var bundleWebpack = require('./bundle-webpack.js');

var embedCodeUtils = require('./embed-code-utils.js');
var pageDefUtils = require('./page-def-utils.js');

var src  = gulp.src;
var dest = gulp.dest;
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
  console.log("Using AWS profile " + options.profile);
  process.env['AWS_DEFAULT_PROFILE'] = options.profile;
}

var context = new buildTools.BuildContext(
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
  var bootstrapper = reactRouter === true ? 'bootstrap-react-router-component' : 'bootstrap-component';
  var templateFile = require.resolve('./react-bootstrap/component-template.jsx');
  var template = fs.readFileSync(templateFile, 'utf8');
  var data = template.replace('%REPLACE%', componentPath)
    .replace('%BOOTSTRAPPER%', bootstrapper);
  var destpath = "temp/";
  mkpath.sync(destpath);
  fs.writeFileSync(destpath + tempFileName, data);
  var srcPath = j(__dirname, 'react-bootstrap', '*.jsx');
  return src(srcPath)
    .pipe(dest(destpath));
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
      opts.reactRouter, [pageDef], watch, opts.assetContext + edef.path.substring(1));
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


//
// Setting up of tasks for CLI
// ---------------------------
//

var prepareBuildTasks = function(gulp, opts) {
  if (!opts) {
      opts = {};
  }

  context.assetPath = !opts.assetContext ? "" : opts.assetContext;

  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('bundle-components', bundleComponents.bind(null, opts, context));
  gulp.task('bundle-embed-bootstrap', bundleEmbedBootstrap.bind(null, context, opts.assetContext));
  gulp.task('bundle-resize', bundleResize.bind(null, context, opts.assetContext));
  gulp.task('embed-codes', embedCodeUtils.embedCodes.bind(null, context, opts));
  gulp.task('serve-prod', buildTools.serveProd);
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

  //console.log(options)
  gulp.task('s3-deploy', buildTools.s3.publish
    .bind(null,
      buildTools.s3.entryPointStream(opts.publishFromFolder),
      buildTools.s3.assetStream(opts.publishFromFolder, opts.maxAge),
      options.bucket || opts.defaultBucket,
      options.simulate,
      options.force
    )
  )

};


module.exports = prepareBuildTasks;

