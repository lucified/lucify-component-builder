
var gulp = require('gulp');

var defs = [
  {
    title: 'Test Index Title',
    path: '',
    description: 'Test index description',
    twitterImage: '20euro.png',
    openGraphImage: '50euro.png',
    schemaImage: '100euro.png'
  },
  {
    path: '/subpage',
    title: 'Test Subpage Title',
    description: 'Test subpage description',
    twitterImage: '100euro.png',
    openGraphImage: '50euro.png',
    schemaImage: '20euro.png'
  }
];


var opts = {
  publishFromFolder: 'dist',
  assetContext: 'test-path/',
  pageDefs: defs,
  embedCodes: false,
  iframeResize: false
}


var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
