
var gulp = require('gulp');
var path = require('path');
var j = path.join;
var through2 = require('through2');
var $ = require('gulp-load-plugins')();
var mergeStream = require('merge-stream');
var embedCode = require('lucify-commons/src/js/embed-code.js');

var src  = gulp.src;
var dest = gulp.dest;


function embedCodes(context, opts) {
  if (Array.isArray(opts.embedDefs)) {
      return mergeStream(opts.embedDefs.map(function(def) {
        return embedCodesPage(context, opts.baseUrl, opts.assetContext, def.path);
      }));
  }
  return embedCodesPage(context, opts.baseUrl, opts.assetContext, '');
}


/*
 * Generate embed codes
 */
function embedCodesPage(context, baseUrl, assetContext, path) {

  // if baseUrl is not defined, this is not
  // intended to be embeddable, and there is
  // no need to generate embed codes
  if (!baseUrl) {
    cb();
    return;
  }

  // for dev builds baseUrl is always localhost
  var urlPath = path.substring(1) + "/";
  var embedUrl = context.dev ? ("http://localhost:3000/" + urlPath) : baseUrl + assetContext + urlPath;
  var baseUrl = context.dev ? ("http://localhost:3000/") : baseUrl + assetContext;

  var templatePath = require.resolve('../../src/www/embed-codes.hbs');

  return src(templatePath)
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

module.exports.embedCodes = embedCodes;
module.exports.embedCodesPage = embedCodesPage;
