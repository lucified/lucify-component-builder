
var path = require('path');
var gulp = require('gulp');

var opts = {
  pageDef: {
    indexHtmlTemplate: path.resolve('src/www/index-template.hbs')
  },
  embedCodesHtmlTemplate: path.resolve('src/www/embed-codes-template.hbs'),
  entryPoint: path.resolve('src/js/components/entry-point.jsx'),
  assetContext: 'hello-world/',
  embedSupport: true
};

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
