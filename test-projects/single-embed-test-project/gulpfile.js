
var gulp = require('gulp');

var opts = {
  babelPaths: [require.resolve('lucify-commons').replace('index.js', 'src')],
  publishFromFolder: 'dist',
  defaultBucket: 'lucify-dev',
  maxAge: 3600,
  assetContext: 'embed/hello-world/',
  baseUrl: 'http://dev.lucify.com/'
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
