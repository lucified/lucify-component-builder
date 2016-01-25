
var gulp = require('gulp');

var opts = {
  babelPaths: [require.resolve('lucify-commons').replace('index.js', 'src')],
  publishFromFolder: 'dist',
  assetContext: 'embed/hello-world/',
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
