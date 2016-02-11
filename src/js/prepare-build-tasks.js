
var gulp = require('gulp');
var path = require('path');
var through2   = require("through2");
var $ = require('gulp-load-plugins')();
var fs = require('fs');
var mkpath = require('mkpath');
var del = require('del');
var parseArgs = require('minimist');
var deepcopy = require('deepcopy');
var mergeStream = require('merge-stream');
var replaceall = require("replaceall");
var extend = require('object-extend');
var request = require('request');
var git = require('git-rev-sync');

var s3 = require('./s3.js');
const ENVS = require('./envs.js');
const defaultArtifactFile = 'build-info.json';

var buildTools = require('lucify-build-tools');
var embedCode = require('lucify-commons/src/js/embed-code.js');

var deployOptions = require('./deploy-options.js');
var githubDeploy = require('./github-deploy.js');

var src  = gulp.src;
var dest = gulp.dest;
var j = path.join;

var defaultPackagePath = j('node_modules', 'lucify-component-builder');

var options = parseArgs(process.argv, {default: {
  optimize: false,
  uglify: false,
  dev: true,
  packagePath: defaultPackagePath,
  force: false,
  simulate: false,
  bucket: null,
  profile: null
}});

if (options.profile != null) {
  console.log("Using AWS profile " + options.profile);
  process.env['AWS_DEFAULT_PROFILE'] = options.profile;
}


var context = require('./build-context.js')(
    options.dev, options.optimize, options.uglify);

var packagePath = options.packagePath;


String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


function html(context, opts, baseUrl, assetContext) {
  if (Array.isArray(opts.pageDefs)) {
      return mergeStream(opts.pageDefs.map(function(def) {
        return htmlForPage(context, def, baseUrl, assetContext, true);
      }));
  }

  if (Array.isArray(opts.embedDefs)) {
      return mergeStream(opts.embedDefs.map(function(def) {
        return htmlForPage(context, def, baseUrl, assetContext, false);
      }));
  }

  return htmlForPage(context, opts.pageDef, baseUrl, assetContext, true);
}


/*
 * Create index.html
 * with appropriate metadata
 */
function htmlForPage(context, pageDef, baseUrl, assetContext, rootRef) {

  function setImageUrl(def, imageType) {
     if (def[imageType]) {
       var key = def[imageType];
       var filename = (context.assetManifest[key] != null) ? context.assetManifest[key] : key;
       def[imageType] = baseUrl + assetContext + "images/" + filename;
    }
  }

  var def;
  if (pageDef != null) {
    def = deepcopy(pageDef);
    setImageUrl(def, 'twitterImage');
    setImageUrl(def, 'openGraphImage');
    setImageUrl(def, 'schemaImage');
  } else {
    def = {title: "Lucify component"};
  }

  var jsFileName = rootRef ? 'index.js' : getJsFileName(pageDef);
  def.jsResolvedFileName = context.assetManifest[jsFileName] || jsFileName;

  // default subpath by default
  def.path = def.path != null ? def.path : '';
  def.url = baseUrl + assetContext + def.path.replace('/', '');

  if (!def.url.endsWith('/')) {
    def.url = def.url + "/";
  }

  // by default, google analytics, riveted, etc are enabled
  def.googleAnalytics = def.googleAnalytics === false ? false : true;
  def.googleAnalyticsSendPageView = def.googleAnalyticsSendPageView === false ? false : true;

  def.riveted = def.riveted === false ? false : true;
  def.adsByGoogle = def.adsByGoogle === false ? false : true;
  def.iFrameResize = def.iFrameResize === false ? false : true;
  def.rootRef = rootRef;

  return src(j(packagePath, 'src', 'www', 'embed.hbs'))
    .pipe(through2.obj(function(file, enc, _cb) {
      file.contents = new Buffer(
        context.hbs.renderSync(file.contents.toString(), def));
      //file.path = file.path.replace(/\.hbs$/,'.html')
      this.push(file);
      _cb();
    }))
    //.pipe($.minifyHtml())
    .pipe($.rename('index.html'))
    .pipe(dest(context.destPath + def.path));
}


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


function getJsFileName(edef) {
    var ret = edef.path === '' ? 'index.js' : 'index' + replaceall('/', '-', edef.path) + '.js';
    return ret;
}


function getTempFileName(edef) {
    var ret = edef.path === '' ? 'component.jsx' : 'component' + replaceall('/', '-', edef.path) + '.jsx';
    return ret;
}


function createJsxAndBundle(opts, context, edef) {
  var destPath = context.destPath + edef.path;
  return mergeStream(
      generateJSX(edef.reactRouter, edef.componentPath, getTempFileName(edef)),
      bundleComponent(destPath, getJsFileName(edef), getTempFileName(edef)));
}


/*
 * Generate temporary JSX for wrapping the React
 * component at given path as an embeddable component
 */
function generateJSX(reactRouter, componentPath, tempFileName) {
  var bootstrapper = reactRouter === true ? 'bootstrap-react-router-component' : 'bootstrap-component';
  var template = fs.readFileSync(j(packagePath, 'src', 'js', 'component-template.jsx'), 'utf8');
  var data = template.replace('%REPLACE%', componentPath)
    .replace('%BOOTSTRAPPER%', bootstrapper);

  var destpath = "temp/";
  mkpath.sync(destpath);
  fs.writeFileSync(destpath + tempFileName, data);
  return src(j(packagePath, 'src', 'js', '*.jsx'))
    .pipe(dest(destpath));
}


/*
 * Bundle the component itself
 */
function bundleComponent(destPath, outputFileName, tempFileName) {
  var opts = {
      destPath: destPath,
      outputFileName: outputFileName
  }
  return buildTools.bundle('temp/' + tempFileName, context, opts);
}

/*
 * Bundle bootstrap code for embedding the component
 */
function bundleEmbedBootstrap() {
  return buildTools.bundle(j(packagePath, 'src', 'js', 'embed.jsx'),
    context, {rev: false, outputFileName: 'embed.js'});
}

/*
 * Bundle code for resizing embedded iFrame
 */
function bundleResize() {
  return buildTools.bundle(j(packagePath, 'src', 'js', 'resize.jsx'),
    context, {rev: false, outputFileName: 'resize.js'});
}


function embedCodes(context, opts, baseUrl, assetContext, cb) {
  if (!opts.embedCodes) {
     return cb();
  }
  if (Array.isArray(opts.embedDefs)) {
      return mergeStream(opts.embedDefs.map(function(def) {
        return embedCodesPage(context, baseUrl, assetContext, def.path, cb);
      }));
  }
  return embedCodesPage(context, baseUrl, assetContext, '', cb);
}


/*
 * Generate embed codes
 */
function embedCodesPage(context, baseUrl, assetContext, path, cb) {

  // if baseUrl is not defined, this is not
  // intended to be embeddable, and there is
  // no need to generate embed codes
  if (!baseUrl) {
    cb();
    return;
  }

  // for dev builds baseUrl is always localhost
  var urlPath = path.substring(1);
  var embedUrl = context.dev ? ("http://localhost:3000/" + urlPath) : baseUrl + assetContext + urlPath;
  var baseUrl = context.dev ? ("http://localhost:3000/") : baseUrl + assetContext;

  return src(j(packagePath, 'src', 'www', 'embed-codes.hbs'))
    .pipe(through2.obj(function(file, enc, _cb) {
      var params = {
        scriptTagEmbedCode: embedCode.getScriptTagEmbedCode(baseUrl, embedUrl),
        iFrameWithRemoteResizeEmbedCode: embedCode.getIFrameEmbedCodeWithRemoteResize(baseUrl, embedUrl),
        iFrameWithInlineResizeEmbedCode: embedCode.getIFrameEmbedCodeWithInlineResize(baseUrl, embedUrl),
      };
      file.contents = new Buffer(
        context.hbs.renderSync(file.contents.toString(), params));
      this.push(file);
      _cb();
    }))
    .pipe($.rename('embed-codes.html'))
    .pipe(dest(context.destPath + path));
}


function setWatch(cb) {
  context.watch = true;
  cb();
}


function prepareSkeleton(cb) {
    mkpath.sync(j('temp', 'data-assets'));
    mkpath.sync(j('temp', 'generated-images'));
    mkpath.sync('build');
    cb();
}


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
        "source": "CircleCI",
        //"from_name": "Mr. Robot",
        "from_address": "deploy@lucify.com",
        "subject": `Deployed branch ${project}/${branch} to ${env}`,
        "content": `<p>${gitMessage}</p> <p>${url}</p>`,
        "project": project,
        "tags":  ["#deployment", `#${env}`]
      }
    }
    request(options, (error, res, body) => {
      if(error) {
        console.log(error)
        return cb()
      }
      if(res.statusCode != 200) {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        console.log(`BODY: ${JSON.stringify(body)}`);
      }
      cb()
    });
}


function getEnv() {
  if(process.env.LUCIFY_ENV)
    return process.env.LUCIFY_ENV
  if(process.env.NODE_ENV)
    return process.env.NODE_ENV
  return ENVS.TEST;
}


function getBuildType() {
  return process.env.NODE_ENV ? process.env.NODE_ENV : "development";
}


function prepareDeployOptions(opts) {
    if (!opts.deployOptions) {
        opts.deployOptions = deployOptions;
    }
    opts.deployOptions = extend(deployOptions, opts.deployOptions);
}


function writeBuildArtifact(url, fileName, cb) {
   const fn = fileName || defaultArtifactFile
   const folder = process.env.CIRCLE_ARTIFACTS
   if(folder)
     require('fs').writeFileSync(`${folder}/${fn}`, JSON.stringify({url: url}))
   cb()
}


var prepareBuildTasks = function(gulp, opts) {
  if (!opts) {
      opts = {};
  }

  // set default for embedCodes option to true
  opts.embedCodes = opts.embedCodes === false ? false : true;

  const deployOpt = require('./deploy-options')(getEnv(), opts);

  if (!deployOpt) {
      console.log("Error: No deploy options found for target '" + getBuildType() + "'");
      console.log(opts);
      process.exit(1);
  }

  context.assetPath = !deployOpt.assetContext ? "" : deployOpt.assetContext;

  gulp.task('watch', function(cb) {
      gulp.watch('./**/*.scss', gulp.series('styles'));
      cb();
  });

  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('set-watch', setWatch);
  gulp.task('images', buildTools.images.bind(null, context, opts.paths));
  gulp.task('data', buildTools.data.bind(null, context, opts.paths));
  gulp.task('styles', buildTools.styles.bind(null, context));
  gulp.task('manifest', buildTools.manifest.bind(null, context));
  gulp.task('html', html.bind(null, context, opts, opts.baseUrl, deployOpt.assetContext));
  gulp.task('bundle-components', bundleComponents.bind(null, opts, context));
  gulp.task('bundle-embed-bootstrap', bundleEmbedBootstrap);
  gulp.task('bundle-resize', bundleResize);
  gulp.task('embed-codes', embedCodes.bind(null, context, opts, deployOpt.baseUrl, deployOpt.assetContext));
  gulp.task('serve', buildTools.serve);
  gulp.task('serve-prod', buildTools.serveProd);
  gulp.task('setup-dist-build', setupDistBuild);
  gulp.task('notify', notify.bind(null, deployOpt.project,
       deployOpt.org,
       deployOpt.branch,
       deployOpt.env,
       deployOpt.url
       )
  );

  gulp.task('build-artifact', writeBuildArtifact.bind(null, deployOpt.url, opts.artifactFile || defaultArtifactFile))

  gulp.task('github-deploy', githubDeploy.bind(null,
       deployOpt.project,
       deployOpt.org,
       deployOpt.branch,
       deployOpt.env,
       deployOpt.flow
     )
  );

  var buildTaskNames = [
    'images',
    'data',
    'styles',
    //'generate-jsx',
    'bundle-components',
    'bundle-embed-bootstrap',
    'bundle-resize',
    'manifest',
    'embed-codes',
    'html'];

  if (opts.pretasks) {
    buildTaskNames = opts.pretasks.concat(buildTaskNames);
  }
  buildTaskNames = ['prepare-skeleton'].concat(buildTaskNames);

  gulp.task('build', gulp.series(buildTaskNames));
  gulp.task('dist', gulp.series('setup-dist-build', 'build'));

  gulp.task('default', gulp.series(
    'set-watch', 'build', 'watch', 'serve'));

  //console.log(options)
  gulp.task('s3-deploy', s3.publish
    .bind(null,
      s3.entryPointStream(opts.publishFromFolder),
      s3.assetStream(opts.publishFromFolder, opts.maxAge),
      deployOpt.bucket,
      options.simulate,
      options.force
    )
  )
  gulp.task('s3-deployandnotify', gulp.series('s3-deploy', 'notify'))

};


module.exports = prepareBuildTasks;
