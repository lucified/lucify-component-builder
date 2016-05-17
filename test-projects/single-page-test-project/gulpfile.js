
var gulp = require('gulp');

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
  publishFromFolder: 'dist',
  assetContext: 'hello-world/'
};

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
