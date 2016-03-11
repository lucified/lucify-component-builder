var hbs = require('handlebars');
var through2 = require('through2');


var BuildContext = function(dev, uglify, optimize, destPath) {
  this.dev = dev;
  this.assetManifest = {};
  this.initHandleBars();
  this.uglify = uglify;
  this.optimize = optimize;
  this.assetPath = '';

  if (!destPath) {
    this.destPath = this.dev ? 'build' : 'dist';
  } else {
    this.destPath = destPath;
  }
};


BuildContext.prototype.initHandleBars = function() {

  hbs.registerHelper('assetPath', function(key) {
    var paths = this.assetManifest;
    if (!this.dev) {
      return new hbs.SafeString(this.assetPath + (paths[key] || key));
    } else {
      return new hbs.SafeString(paths[key] || key);
    }
  }.bind(this));

  hbs.renderSync = function renderSync(str, context) {
    context = context || {};
    try {
      var fn = (typeof str === 'function' ? str : hbs.compile(str, context));
      return fn(context);
    } catch (err) {
      throw err;
    }
  };

  this.hbs = hbs;
};


BuildContext.prototype.collectManifest = function() {
  var firstFile = null;
  return through2.obj(function(file, _enc, cb) {
    // ignore all non-rev'd files
    if (!file.path) {
      cb();
      return;
    }

    firstFile = firstFile || file;

    var path = relPath(firstFile.base, file.path);

    if (!file.revOrigPath) {
      this.assetManifest[relPath(firstFile.base, file.path)] = path;

    } else {
      this.assetManifest[relPath(file.revOrigBase, file.revOrigPath)] = path;

    }

    cb();
  }.bind(this));
};


function relPath(base, filePath) {
  if (filePath.indexOf(base) !== 0) {
    return filePath.replace(/\\/g, '/');
  }
  var newPath = filePath.substr(base.length).replace(/\\/g, '/');

  if (newPath[0] === '/') {
    return newPath.substr(1);
  }

  return newPath;
}


module.exports = (dev, uglify, optimize, destPath) => new BuildContext(dev, uglify, optimize, destPath);
