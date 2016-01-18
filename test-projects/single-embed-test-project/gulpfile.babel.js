
var gulp = require('gulp');

var opts = {
  paths: ['node_modules/lucify-commons', 'test_modules/module1'],
  publishFromFolder: 'dist',
  defaultBucket: 'lucify-dev',
  maxAge: 3600,
  assetContext: 'embed/hello-world/',
  baseUrl: 'http://dev.lucify.com/'
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
