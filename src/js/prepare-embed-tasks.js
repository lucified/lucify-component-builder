
var gulp = require('gulp');
var path = require('path');
var through2   = require("through2");
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var fs = require('fs');
var mkpath = require('mkpath');

var buildTools = require('lucify-build-tools');

var src  = gulp.src;
var dest = gulp.dest;
var j = path.join;

var parseArgs = require('minimist');

var packagePath = j('node_modules', 'lucify-embed');


var options = parseArgs(process.argv, {default: {
	optimize: false, 
	uglify: false,
	dev: true}});

var context = new buildTools.BuildContext(
	options.dev, options.optimize, options.uglify);


/*
 * Generate HTML for the embed
 */
function htmlForEmbed() {

  return src(j(packagePath, 'src', 'www', 'embed.hbs'))
    .pipe(through2.obj(function(file, enc, _cb) {
      
      var asset = 'index.js';
      var params = {asset: asset};
      
      // replace asset paths with revisioned data
      file.contents = new Buffer(
        context.hbs.renderSync(file.contents.toString(), params)) 
      file.path = file.path.replace(/\.hbs$/,'.html')

      // push to the outer stream
      this.push(file);
      _cb();
    }))
    //.pipe($.minifyHtml())
    .pipe($.rename('index.html'))
    .pipe(dest(context.destPath));
}


/*
 * Generate temporary JSX for wrapping the react component
 * at given path as an embeddable component
 */
function generateJSX(cb) {
  var componentPath = 'index.js';
  var template = fs.readFileSync(j(packagePath, 'src', 'js', 'embed-template.jsx'), 'utf8');
  var data = template.replace('%REPLACE%', componentPath);
  var destpath = "temp/";
  mkpath.sync(destpath);
  fs.writeFileSync(destpath + 'embed.jsx', data);
  cb();
}


function bundleEmbed() {
	var bundleConfig = {
		entries: 'temp/embed.jsx',
		dest: 'build',
		newOutputName: 'index.js',
	};
	return buildTools.bundle('temp/embed.jsx', context);
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



var prepareEmbedTasks = function(gulp, opts) {
	
  if (!opts) {
      opts = {};
  }

  gulp.task('watch', function(cb) {
      gulp.watch('./**/*.scss', gulp.series('styles'));
      cb();
  });

  
  gulp.task('prepare-skeleton', prepareSkeleton);
  gulp.task('set-watch', setWatch);
	gulp.task('html-for-embed', htmlForEmbed);
  gulp.task('images', buildTools.images.bind(null, context, opts.paths));
  gulp.task('data', buildTools.data.bind(null, context, opts.paths));
	gulp.task('styles', buildTools.styles.bind(null, context));
	gulp.task('bundle-embed', bundleEmbed);
	gulp.task('generate-jsx', generateJSX);

  var buildTaskNames = ['html-for-embed', 'images', 'data', 'styles', 'generate-jsx', 'bundle-embed'];
  if (opts.pretasks) {
    buildTaskNames = opts.pretasks.concat(buildTaskNames);
  }
  buildTaskNames = ['prepare-skeleton'].concat(buildTaskNames);

	gulp.task('build', gulp.series(buildTaskNames));
  gulp.task('serve', buildTools.serve);
	gulp.task('serve-prod', buildTools.serveProd);
  
  gulp.task('default', gulp.series('set-watch', 'build', 'watch', 'serve'));
}


module.exports = prepareEmbedTasks;
