
var gulp = require('gulp');
var through2 = require('through2');
var $ = require('gulp-load-plugins')();
var mergeStream = require('merge-stream');
var embedCode = require('lucify-commons/src/js/embed-code.js');

var src  = gulp.src;
var dest = gulp.dest;


function embedCodes(context, opts, assetContext) {
  if (Array.isArray(opts.embedDefs)) {
    return mergeStream(opts.embedDefs.map(function(def) {
      return embedCodesPage(context, opts.baseUrl, assetContext, def.path);
    }));
  }
  return embedCodesPage(context, opts.baseUrl, assetContext, '');
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
  var urlPath = path.substring(1) + '/';
  var embedUrl = context.dev ? ('http://localhost:3000/' + urlPath) : baseUrl + assetContext + urlPath;
  var embedBaseUrl = context.dev ? ('http://localhost:3000/') : baseUrl + assetContext;

  var templatePath = require.resolve('../../src/www/embed-codes.hbs');

  return src(templatePath)
    .pipe(through2.obj(function(file, enc, _cb) {
      var params = {
        scriptTagEmbedCode: embedCode.getScriptTagEmbedCode(embedBaseUrl, embedUrl),
        iFrameWithRemoteResizeEmbedCode: embedCode.getIFrameEmbedCodeWithRemoteResize(embedBaseUrl, embedUrl),
        iFrameWithInlineResizeEmbedCode: embedCode.getIFrameEmbedCodeWithInlineResize(embedBaseUrl, embedUrl)
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
