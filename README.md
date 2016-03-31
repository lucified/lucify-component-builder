
# About

This is a pre-release of a package belonging to the Lucify platform. It has been published merely to satisfy dependencies of other packages. Any APIs may change without notice.

# Introduction

## Example 1: An embeddable visualisation

The most common use case for `lucify-component-builder` is to use it for building and deploying a React component as an embeddable static page. This is how for example <https://github.com/lucified/lucify-refugees> works. 

Assume you have the following source files in your project:
```
src/js/main.jsx
src/images/image-referenced-in-js.png
src/images/image-referenced-in-css.svg
src/scss/styles.scss
src/data/data.json
index.js
```

Let's also assume that:
- `index.js` requires the React compoment from `src/js/main.jsx` and exports it
- `main.jsx` requires `image-referenced-in-js.png`, 
- `main.jsx` requires `styles.scss`
- `main.jsx` requires `data.json`
- `styles.scss` references `image-references-in-css.svg`

To use `lucify-component-builder` for building the project, you will need to
include `lucify-component-builder`, `query-string` and `gulpjs/gulp#4.0` in the project's dependencies, and add the following `gulpfile.js` in the project root:

```
var gulp = require('gulp');
var opts = {
  assetContext: 'my-test-project/',
}
var builder = require('lucify-component-builder');
builder(gulp, opts);
```

Now you can run `gulp` to build a development version of the visualisation and start a `webpack-dev-server` listening on port `3000`. You can access it at <http://localhost:3000>.

To understand what is happening, it is better to run `gulp dist`. This will build a distribution in the `dist` folder. The `dist` folder will contain:

```
project-name-master-a3d8f0/styles-0f5a08f10b5e.scss
project-name-master-a3d8f0/image-referenced-in-js-dfa87sa89aa5.scss
project-name-master-a3d8f0/image-referenced-in-css-dsf98a7dfas5.svg
project-name-master-a3d8f0/data-e98r7q0r70qew.json
project-name-master-a3d8f0/styles-vv9s7fds78a8.scss
project-name-master-a3d8f0/bundle-8daf78s9.js
project-name-master-a3d8f0/embed.js
project-name-master-a3d8f0/resize.js
project-name-master-a3d8f0/index.html
project-name-master-a3d8f0/embed-codes.html
```

The build created a subfolder into `dist`, with its filename being composed of the project name, branch name and commit hash. This is default behavior for `dist` builds. 

You can `cd` to the `dist` folder and start a local web server, and everything should work.

Behind the scenes `lucify-component-builder` has used `webpack` to create a bundle with hashed filenames, including any referenced files in the bundle. Also the image referenced in the `scss` file is included. 

It also prepared `embed.js`, and `resize.js`, which are used for bootstrapping the embed in such a way that the iFrame will resize to the needed height on the parent page. To support this, the generated `index.html` also contains some resizing code. This is based on the `iframe-resizer` project.

The distribution also includes `embed-codes.html`, a simple html page with embed codes for the visualisation.

The created `bundle.js` also includes code for bootstrapping the React component. Its implementation is as follows:

```
var React = require('react');
var EmbedWithUrlParamsDecorator = require('./embed-with-url-params-decorator.jsx');
module.exports = function(Component) {
  var Comp = EmbedWithUrlParamsDecorator(Component);
  window.React = React;
  React.render(<Comp />, document.getElementById('content'));
};
```

It sets React to the `window` object to allow debugging to work in Chrome. It also decorates the React component with a decorator that will pass any passed URL parameters as props to the main entry point. The decorator will also make sure to convert strings containing numbers to the `Number` data type.

## Example 2: A standalone page

Let's move on to consider a React-based standalone page, that is not intended to be embedded. For most parts, it would work identically as the previous example.

We would however want to make sure that we have some page metadata in place, including social sharing images. We also wish avoid getting unnecessary `iFrameResizer` code into `index.html`.

We will achieve this with the following `gulpfile.js`:

```

var gulp = require('gulp');
var opts = {
  pageDef: {
    title: "Hello this is the title",
    description: 'This is the description',
    ogType: 'article',
    twitterImage: 'twitter-card.png',
    openGraphImage: 'open-graph-size.png',
    schemaImage: 'open-graph-size.png',
  }),
  iFrameResize: false,
  embedCodes: false,
  assetContext: 'my-test-project/',
}
var builder = require('lucify-component-builder');
builder(gulp, opts);
```

As before, `gulp` can be used to start a dev server. If we run `gulp dist`, we get something like below in `dist`:

```
project-name-master-a3d8f0/styles-0f5a08f10b5e.scss
project-name-master-a3d8f0/twitter-card-f90da8s9.svg
project-name-master-a3d8f0/open-graph-size-fd08faa0.svg
project-name-master-a3d8f0/image-referenced-in-js-dfa87sa89aa5.scss
project-name-master-a3d8f0/image-referenced-in-css-dsf98a7dfas5.svg
project-name-master-a3d8f0/data-e98r7q0r70qew.json
project-name-master-a3d8f0/styles-vv9s7fds78a8.scss
project-name-master-a3d8f0/bundle-ff09a8sd0a.js 
project-name-master-a3d8f0/index.html
```

Now `embed.js`, `resize.js` and `embed-codes.html` are missing. The images mentioned in pageDefs have been included, as required. (Note: this might not work currently in the webpack version).

This type of configuration is used in the internal `lucify-refugees-article`. 

## Example 3: Multi-embed project

What if we wish to multiple components in one project of which we wish to build embeds? In this case we use the `embedDefs` option to pass an array of embed definitions. Each embed definition contains the file system path to the React component and a target URL path, relative to `assetContext`. Appropriate `gulpfile.js` is below:

```
var gulp = require('gulp');
var opts = {
  embedDefs: [{
    componentPath: 'src/js/components/hello-world.jsx',
    path: '/hello-world'
  },
  {
    componentPath: 'src/js/components/hello-world-two.jsx',
    path: '/subpath/hello-world-two'
  }]
  assetContext: 'my-test-project/',
}
var builder = require('lucify-component-builder');
builder(gulp, opts);
```

This will create something similar to below in `dist`:

```
project-name-master-a3d8f0/hello-world/index.html
project-name-master-a3d8f0/hello-world/bundle-das8a9.js
project-name-master-a3d8f0/subpath/hello-world-two/index.html
project-name-master-a3d8f0/subpath/hello-world-two/bundle-das8a9.js
project-name-master-a3d8f0/embed.js
project-name-master-a3d8f0/resize.js
```

This type of configuration is used for building some of the embeds associated with the Finnish articles.

## Example 4: Multi-page `react-router` project

In this case we are building a whole React-router-based website, with each page having their own page metadata, etc. 

In this case, the project is a little bit different. The main entry point will not be React component, but a `react-router`. We use the `reactRouter: true` option to let `lucify-component-builder` know that this is the case. It will then use different bootstrapping code than the one used for React components.

The different pages and their metadata is done by the `pageDefs` option.

```
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
  assetContext: 'test-path/',
  pageDefs: defs,
  embedCodes: false,
  iframeResize: false,
  reactRouter: true
}

var builder = require('../../index.js'); // lucify-component-builder
builder(gulp, opts);

```

Running `gulp` dist will create a directory skeleton with `index.html` files in place for all the paths defined in pageDefs. 

This configuration is used for `lucify-website`.

## Deploying

The project includes a command `lucify-deploy`, which can be used to build and deploy a distribution to Amazon S3. It also supports notifying Flowdock or GitHub deployment API of the ongoing deployment.

Flowdock will be notified if a `FLOW_TOKEN` environment variable is defined.
GitHub will be notified if a `GITHUB_TOKEN` environment variable is defined.

`lucify-component-builder` includes by default the configuration for Lucify's different environments. The environment to be used is defined by the environment variable `LUCIFY_ENV`. Valid enviroments are `test`, `production` and `development`.

`lucify-deploy` should always be run with the AWS credentials. 

Any of the configuration can be overridden by using [options](https://github.com/lucified/lucify-component-builder/blob/master/API.md).

## Notes on bootstrapping

The way `lucify-component-builder` bootstraps the React components involves creating a temporary jsx file, that will serve an entry point for `webpack`. While this is conceptually quite ugly, it reduced significant copy-paste reuse of such bootstrapping code. 

## Test projects

The `test-projects` folder contains a simple test/example projects for each of the four examples presented here. Be sure to run `npm install` within those project's root foldes before trying `gulp` or `gulp dist`. Note that development mode (`gulp`) does not unfortunately work in a meaningful way for multi-embed projects.

# License

This project is released under the [MIT license](LICENSE).
