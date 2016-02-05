
var gulp = require('gulp');

var opts = {
  paths: ['node_modules/lucify-commons', 'test_modules/module1'],
  publishFromFolder: 'dist',
  assetContext: 'embed/hello-world/',
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
