
var gulp = require('gulp');
var path = require('path');

var opts = {
  assetContext: 'embed/hello-world/',
  entryPoint: path.resolve('src/js/entry-point.jsx'),
  embedSupport: true
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
