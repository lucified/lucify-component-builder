
const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const mkpath = require('mkpath');
const del = require('del');
const parseArgs = require('minimist');
const replaceall = require('replaceall');
const gutil = require('gulp-util');
const defaultArtifactFile = 'build-info.json';
const Promise = require('bluebird');

const s3 = require('./s3.js');
const ENVS = require('./envs.js');
const bundleWebpack = require('./bundle-webpack.js');
const embedSupport = require('./embed-support.js');
const pageDefUtils = require('./page-def-utils.js');
const githubDeploy = require('./github-deploy.js');
const notify = require('./flowdock-notify');
const computeOptions = require('./deploy-options');

const j = path.join;



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

function generateMetaData(path) {
  const data = {
    stampUpdated: Math.floor(new Date().getTime() / 1000)
  };
  mkpath.sync(path);
  fs.writeFileSync(j(path, 'lucify-metadata.json'), JSON.stringify(data));
}


//
// Functions mapping directly to gulp tasks
// ----------------------------------------
//

/*
 * Bundle the main component
 */
function bundleMainComponent(opts, context, assetContext, callback) {

  const pageDefs = pageDefUtils.getEnrichedPageDefs(opts);
  const watch = context.dev; // TODO
  const entryPoint = opts.entryPoint;

  generateMetaData(context.destPath);

  bundleWebpack.bundle(
    entryPoint,
    null,
    context.destPath,
    pageDefs,
    watch,
    assetContext,
    opts.babelPaths,
    callback);
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


function embedSupportTask(context, templatePath, embedUrl, embedBaseUrl, callback) {
  embedSupport(context.destPath, templatePath, embedUrl, embedBaseUrl);
  callback();
}


//
// Setting up of tasks for CLI
// ---------------------------
//

var prepareBuildTasks = function(gulp, opts) {
  if (!opts) {
    opts = {};
  }

  if (!opts.entryPoint) {
    gutil.log('Error: entryPoint should be defined');
    process.exit(1);
  }

  if (!fs.statSync(opts.entryPoint).isFile()) {
    gutil.log(`Error: entryPoint ${opts.entryPoint} does not exist or is not a file`);
    process.exit(1);
  }

  // set default for embedCodes option to true
  opts.embedCodes = opts.embedCodes === false ? false : true;

  const deployOpt = computeOptions(getEnv(), opts);

  context.assetPath = !deployOpt.assetContext ? '' : deployOpt.assetContext;

  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('webpack', bundleMainComponent.bind(null, opts, context, deployOpt.assetContext));
  gulp.task('embed-support', embedSupportTask.bind(null,
      context,
      opts.embedCodesHtmlTemplate,
      deployOpt.baseUrl + deployOpt.assetContext,
      deployOpt.baseUrl + deployOpt.assetContext));
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

  var buildTaskNames = [];

  buildTaskNames.push('prepare-skeleton');
  if (opts.embedSupport) {
    buildTaskNames.push('embed-support');
  }
  buildTaskNames.push('webpack');
  if (opts.pretasks) {
    opts.pretasks.forEach(item => {
      buildTaskNames.push(item);
    });
  }

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
