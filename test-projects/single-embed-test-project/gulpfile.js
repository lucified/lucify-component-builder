
var gulp = require('gulp');

var opts = {
  publishFromFolder: 'dist',
  assetContext: 'embed/hello-world/',
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
