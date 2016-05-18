
var gulp = require('gulp');
var path = require('path');

var opts = {
  pageDef: {
    title: 'Hello World Title',
    description: 'Hello World description',
    ogType: 'article',
    twitterImage: '50euro.jpg',
    openGraphImage: '100euro.jpg',
    schemaImage: '200euro.jpg'
  },
  iFrameResize: false,
  embedCodes: false,
  assetContext: 'hello-world/',
  entryPoint: path.resolve('src/js/entry-point.jsx'),
};

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
