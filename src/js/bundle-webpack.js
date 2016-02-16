const gutil         = require('gulp-util'),
  extend            = require('object-extend'),
  WebpackDevServer  = require('webpack-dev-server'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  webpack           = require('webpack'),
  path              = require('path'),
  parseArgs         = require('minimist');

var options = parseArgs(process.argv, {
  default: {
    hot: false
  }
});

/*
 *  Bundle a component
 *
 *  entryPoint        - the entry point for the bundle
 *  outputFileName    - file name for produced bundle
 *  destPath          - destination path for produced bundle,
 *                      relative to the root directory of the project
 *                      being built
 *  pageDefs          - options to pass on into the template
 *                      for each index.html entry point to be
 *                      generated. must be either an array (or null,
 *                      if no index.html:s need to be generated)
 *  watch             - start webpack-dev-server with hot reloading
 *                      setting this true will cause this to block
 *  babelPaths        - paths for which .js and .jsx files should be
 *                      run through babel-loader. this options is at
 *                      least needed for backwards compatiblity for some time
 */
function bundle(
  entryPoint,
  outputFileName,
  destPath,
  pageDefs,
  watch,
  assetContext,
  babelPaths,
  callback) {

  var config = {
    resolve: {
      modulesDirectories: ['node_modules']
    },
    module: {
      loaders: getLoaders(babelPaths)
    },
    resolveLoader: {
      root: [path.resolve(__dirname, '../node_modules')]
    },
    output: {
      filename: outputFileName,
      path: process.cwd() + '/' + destPath,
      publicPath: '/' + assetContext
    },
    entry: entryPoint,
    plugins: htmlWebpackPluginsFromPageDefs(pageDefs, watch),
    // enabling watch here seems to fix a weird problem where
    // the bundle would seemingly randomly be built incorrectly
    // when using the webpack-dev-server, resulting in TypeError
    // for embed-decorator in the browser console
    watch: watch
  };

  if (watch) {
    devServerBundle(config, destPath);
    return;
  }
  plainBundle(config, callback);
}

//
// Private functions
// -----------------
//

/*
 * Create HtmlWebpack plugin entries
 * based on given page defs
 */
function htmlWebpackPluginsFromPageDefs(pageDefs, watch) {
  var arr;
  if (Array.isArray(pageDefs)) {
    arr = pageDefs;
  } else {
    return [];
  }

  return arr.map(item => {
    if (!item.path) {
      item.path = '';
    }
    var config = {
      template: require.resolve('../www/embed.hbs'),
      inject: false,
      filename: path.join(item.path, 'index.html'),

      // this enables a script tag for automatic refresh
      // https://webpack.github.io/docs/webpack-dev-server.html#automatic-refresh
      devServer: watch
    };
    var fullConfig = extend(config, item);
    return new HtmlWebpackPlugin(fullConfig);
  });
}

/*
 * Start webpack dev server for given webpack configuration
 */
function devServerBundle(config, destPath) {
  const port = 3000;
  const host = '0.0.0.0';
  config.output.publicPath = '/';

  if (options.hot) {
    // Experimental setup for hot module replacement
    // enable via --hot option
    //
    // This seems to work correctly, but we get a message that
    // some modules could not be updated, as they would need a
    // full reload. I suspect this is related to the use of higher-order
    // components.
    //
    // https://medium.com/@dan_abramov/the-death-of-react-hot-loader-765fa791d7c4#.wrqoafdic
    // https://gaearon.github.io/react-hot-loader/getstarted/
    // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
    config.entry = [config.entry, 'webpack/hot/only-dev-server'];
    config.plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  const compiler = webpack(config);
  const server = new WebpackDevServer(compiler, {
    contentBase: destPath,
    noInfo: false,
    hot: options.hot,
    colors: true,
    quiet: false,
    stats: {
      colors: true,
      chunks: false,
      chunkOrigins: false,
      chunkModules: false,
      errorDetails: false,
      source: false,
      reasons: false,
      children: false,
      modules: false,
      version: false,
      hash: false,
      timings: false,
      assets: false
    }
  });

  server.listen(port, host, function(err) {

    // this is only run once after the
    // server has started
    //
    // it is unclear when err == true, at least
    // jsx syntax errors will not cause it
    // probably it may be caused by some configuration
    // problems
    //
    // ( webpack-dev-server is writing jsx syntax errors etc
    // to the console directly on its own )
    //

    if (err) {
      throw new gutil.PluginError('webpack-dev-server', err);
    }
    gutil.log(`[WebpackDevServer] listening on ${host}:${port}`);

    // keep the server alive or continue?
    // callback();
  });
}

/*
 * Create distribution for given webpack configuration
 */
function plainBundle(config, callback) {
  webpack(config, function(err, stats) {
    if (err || stats.hasErrors()) {
      gutil.log('[webpack] ERROR');
      if (err) {
        gutil.log('[webpack]', err);
      } else {
        gutil.log('[webpack]', stats.toString({
          chunks: false,
          colors: true
        }));
      }
      // for some strange reason process.exit(1) will not
      // work, so using SIGTERM. also
      process.kill(process.pid, 'SIGTERM');
      callback(true);
    }
    gutil.log('[webpack]', stats.toString({
      chunks: false,
      colors: true
    }));
    callback();
  });
}

/*
 * Get the webpack loaders object for the webpack configuration
 */
function getLoaders(babelPaths) {

  if (!babelPaths) {
    babelPaths = [];
  }

  return [{
    test: /\.(js|jsx)$/,
    loader: require.resolve('babel-loader'),
    //loaders: ['react-hot', 'babel-loader'],
    include: [
      process.cwd() + '/src',
      process.cwd() + '/temp',
      __dirname
    ].concat(babelPaths),
    query: {
      presets: [
        // https://github.com/babel/babel-loader/issues/166
        require.resolve('babel-preset-es2015'),
        require.resolve('babel-preset-stage-0'),
        require.resolve('babel-preset-react')
      ]
    }
  }, {
    test: /\.svg$/,
    loader: require.resolve('url-loader') + '?limit=10000&mimetype=image/svg+xml'
  }, {
    test: /\.scss$/,
    loaders: [
      require.resolve('style-loader'),
      require.resolve('css-loader') + '?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]',
      require.resolve('sass-loader')
    ]
  }, {
    test: /\.(jpeg|jpg|gif|png|json)$/,
    loaders: [require.resolve('file-loader') + '?name=[name]-[hash:12].[ext]']
  }, {
    test: /\.hbs$/,
    loader: require.resolve('handlebars-loader')
  }];
}

module.exports = bundle;
