
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
  paths: ['node_modules/lucify-commons', 'test_modules/module1'],
  publishFromFolder: 'dist',
  assetContext: 'test-path/',
  pageDefs: defs
}


var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
