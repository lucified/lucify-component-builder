
var gulp = require('gulp');

var embedDefs = [
  {
    componentPath: 'src/js/components/hello-world.jsx',
    path: '/hello-world'
  },
  {
    componentPath: 'src/js/components/hello-world-two.jsx',
    path: '/subpath/hello-world-two'
  }
];


var opts = {
  embedDefs: embedDefs,
  paths: ['node_modules/lucify-commons', 'test_modules/module1'],
  publishFromFolder: 'dist',
  defaultBucket: 'lucify-dev',
  maxAge: 3600,
  assetContext: 'embed/',
  baseUrl: 'http://dev.lucify.com/'
};


var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
