
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
  embedCodes: false,
  paths: ['node_modules/lucify-commons', 'test_modules/module1'],
  publishFromFolder: 'dist',
  assetContext: 'hello-world/'
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
