
const mkpath = require('mkpath');
const embedCode = require('lucify-embed-code');
const hbs = require('handlebars');
const fs = require('fs');
const j = require('path').join;

/*
 * Add support for embedding with an auto-resizing
 * iframe for a web project by:
 *  - Creating an html page with embed codes
 *  - Copying supporting scripts files
 *
 * destPath     -- Path where to create embed codes and supporting script files
 * templatePath -- Path to template file for embed codes. Set to null to use default.
 * embedUrl     -- URL to be used for embedding iframe
 * embedBaseUrl -- Base url for supporting script files
 * cb           -- Callback to call when finished (optional)
 *
 * TODO: move to its own project
 */


function embedSupport(destPath, templatePath, embedUrl, embedBaseUrl) {
  mkpath.sync(destPath);
  createEmbedCodesPage(destPath, templatePath, embedUrl, embedBaseUrl);
  copyEmbedScript(destPath);
  copyResizeScript(destPath);
}


function copyEmbedScript(destPath) {
  const scriptFile = require.resolve('lucify-embed-code/lib/embed.js');
  fs.writeFileSync(j(destPath, 'embed.js'), fs.readFileSync(scriptFile));
}


function copyResizeScript(destPath) {
  const scriptFile = require.resolve('iframe-resizer/js/iframeResizer.min.js');
  fs.writeFileSync(j(destPath, 'resize.js'), fs.readFileSync(scriptFile));
}


function createEmbedCodesPage(destPath, template, embedUrl, embedBaseUrl) {

  // prepare template params
  const params = {
    scriptTagEmbedCode: embedCode.getScriptTagEmbedCode(embedBaseUrl, embedUrl),
    iFrameWithRemoteResizeEmbedCode: embedCode.getIFrameEmbedCodeWithRemoteResize(embedBaseUrl, embedUrl),
    iFrameWithInlineResizeEmbedCode: embedCode.getIFrameEmbedCodeWithInlineResize(embedBaseUrl, embedUrl)
  }

  // render template
  const templatePath = template || require.resolve('../../src/www/embed-codes.hbs');
  const renderedString = hbs.renderSync(fs.readFileSync(templatePath, 'utf8'), params);
  fs.writeFileSync(j(destPath, 'embed-codes.html'), renderedString);
}


module.exports = embedSupport;
