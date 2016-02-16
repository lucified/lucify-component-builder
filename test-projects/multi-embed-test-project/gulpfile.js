
// Note that currently only dist builds work correctly
// for multi-embed -projects

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
  babelPaths: [require.resolve('lucify-commons').replace('index.js', 'src')],
  publishFromFolder: 'dist',
  assetContext: 'embed/',
};


var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);
