
var sprintf = require('sprintf');
var gutil = require('gulp-util');
var extend = require('object-extend');

var gulpWebpack = require('webpack-stream');
var WebpackDevServer = require("webpack-dev-server");
var HtmlWebpackPlugin = require('html-webpack-plugin')

var gulp = require('gulp');
var src  = gulp.src;
var dest = gulp.dest;

var webpack = require('webpack'),
path = require('path');


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
 */
function bundle(entryPoint, outputFileName, destPath, pageDefs, watch, assetContext, callback) {

  var config = {
     noInfo: false,
     resolve: {
       modulesDirectories: ['node_modules', 'components'],
       root: [path.resolve(__dirname,'../node_modules')]
     },
     module: {
       loaders: getLoaders()
     },
     resolveLoader: {
      root: [path.resolve(__dirname, '../node_modules')],
      modulesDirectories: ['node_modules'],
     },
     output: {
      filename: outputFileName,
      path: process.cwd() + "/" + destPath,
      publicPath: '/' + assetContext
     },
     entry: entryPoint,
     plugins: htmlWebpackPluginsFromPageDefs(pageDefs),
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
function htmlWebpackPluginsFromPageDefs(pageDefs) {
    var arr;
    if (Array.isArray(pageDefs)) {
      arr = pageDefs;
    } else {
      return [];
    }

    return arr.map(item => {
        var config = {
            template: 'node_modules/lucify-component-builder/src/www/embed.hbs',
            inject: 'body',
            filename: item.path + '/index.html'
        };
        var fullConfig = extend(config, item);
        return new HtmlWebpackPlugin(fullConfig);
    });
}


/*
 * Start webpack dev server for given webpack configuration
 */
function devServerBundle(config, destPath) {
  config.output.publicPath = '/';
  var compiler = webpack(config);
  new WebpackDevServer(compiler, {
      contentBase: destPath,
      noInfo: true

        // server and middleware options
  }).listen(3000, "localhost", function(err) {
        if(err) throw new gutil.PluginError("webpack-dev-server", err);
        // keep the server alive or continue?
        // callback();
  });
}


/*
 * Create distribution for given webpack configuration
 */
function plainBundle(config, callback) {
  webpack(config, function(err, stats) {
      if (err) {
        gutil.log("[webpack]", err);
        process.exit(1);
      }
      gutil.log("[webpack]", stats.toString({chunks: false}));
      callback();
  });
}


/*
 * Get the webpack loaders object for the webpack configuration
 */
function getLoaders() {
  return [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel',
        //loaders: ['react-hot', 'babel-loader'],
        include: [
          process.cwd() + '/src',
          process.cwd() + '/temp',
          process.cwd() + '/node_modules/lucify-commons/src' // TODO
        ],
        query: {
          presets: [
            // https://github.com/babel/babel-loader/issues/166
            require.resolve('babel-preset-es2015'),
            require.resolve('babel-preset-stage-0'),
            require.resolve('babel-preset-react')
          ]
        }
      },
      {
        test: /\.css$/,
        loaders: [
          'style-loader',
          'css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]',
          'postcss-loader'
        ]
      },
      {
        test: /\.svg$/,
        loader: 'url-loader?limit=10000&mimetype=image/svg+xml'
      },
      {
        test: /\.scss$/,
        loaders: ["style", "css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]", "sass"]
      },
      {
        test: /\.(jpeg|jpg|gif|png|json)$/,
        loaders: ["file-loader?name=[name]-[hash:12].[ext]"]
      },
      {
        test: /\.hbs$/,
        loader: "handlebars"
      }
  ];
}


module.exports = bundle;
