
var browserify = require('browserify');
var watchify = require('watchify');
var through = require("through");
var babelify = require('babelify');
var CombinedStream = require('combined-stream');
var source = require('vinyl-source-stream')
var buffer     = require('vinyl-buffer')
var handleErrors = require('./handleErrors.js');
var gulpif = require('gulp-if');
var $ = require('gulp-load-plugins')();
var hbs = require('handlebars');


var gulp = require('gulp');
var src  = gulp.src;
var dest = gulp.dest;


var assetManifest = {};


/**
 * Create a browserify bundle according
 * to the given configuration
 *
 * bundleConfig has the following properties:
 *
 *  devDest       - destination for dev build
 *  distDest      - destination for dist build
 *  newOutputName - name for the bundled javascript file
 *  entries       - the entry point for the bundle
 */
function bundle(bundleConfig, dev) {
  
  var shouldUglify = false;

  var config = {
      // these are needed for watchify
      cache: {}, packageCache: {}, fullPaths: false,
      // Specify the entry point of the bundle
      entries: bundleConfig.entries,
      // Enable source maps
      debug: dev
  };

  var bundler = browserify(config)
    .transform(babelify.configure({stage: 1}));

  var doBundle = function() {

    console.log("Bundling " + bundleConfig.newOutputName);

    //var destPath = dev ? bundleConfig.devDest : bundleConfig.distDest;
    var destPath = bundleConfig.dest;

    var assetManifest = [];
    var assets = "window.lucifyAssetManifest = " 
      + JSON.stringify(assetManifest) + ";";

    var combined = CombinedStream.create();  
	    combined.append(through().pause().queue(assets).end());
	    combined.append(bundler.bundle().on('error', handleErrors));

    var stream = combined
      .on('error', handleErrors)
      .pipe(source(bundleConfig.newOutputName))
      .pipe(buffer())
      .pipe(gulpif(!dev && shouldUglify, $.uglify()));

    if (!dev && bundleConfig.rev) {
      stream = stream.pipe($.rev());
    }

    // write scripts
    stream = stream.pipe(dest(destPath));

    // if (!dev) {
    //   stream = stream.pipe(collectManifest())
    //     .pipe(through2.obj(function(manifest, enc, cb) {
    //       _.merge(assetManifest, manifest)
    //       cb(null, manifest);
    //     }));
    // }
     
    return stream; 
  }

  if(global.isWatching) {
    //console.log("setting up watching");
    // Wrap with watchify and rebundle on changes
    bundler = watchify(bundler);
    // Rebundle on update
    bundler.on('update', doBundle);
  }

  return doBundle();
}

hbs.registerHelper("assetFilesScss", revved => {
  var paths = assetManifest;
  var a = Object.keys(paths).map(function(k) {
    var v = revved ? paths[k] : k;
    return "'" + v + "'";
  })
  return new hbs.SafeString(a.join(", "));
})

hbs.registerHelper("assetPath", key => {
  var paths = assetManifest;
  return new hbs.SafeString(paths[key] || key);
})

hbs.renderSync = function renderSync(str, context) {
  context = context || {};
  try {
    var fn = (typeof str === 'function' ? str : hbs.compile(str, context));
    return fn(context);
  } catch (err) {
    return err;
  }
};





module.exports.hbs = hbs;
module.exports.bundle = bundle;


