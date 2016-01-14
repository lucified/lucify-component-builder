
var gulp = require('gulp');

var template = require('lucify-commons/src/js/lucify-page-def-template.js');

var opts = {

  pageDef: template.apply({
    title: "Hello World Title",
    description: 'Hello World description',
    ogType: 'article',
    twitterImage: '50euro.jpg',
    openGraphImage: '100euro.jpg',
    schemaImage: '200euro.jpg'
  }),

  iFrameResize: false,
  paths: ['node_modules/lucify-commons', 'test_modules/module1'],
  publishFromFolder: 'dist',
  defaultBucket: 'lucify-dev',
  maxAge: 3600,
  assetContext: 'hello-world/',
  baseUrl: 'http://dev.lucify.com/',
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
