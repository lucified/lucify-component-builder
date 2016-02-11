var awspublish = require('gulp-awspublish');
var mergeStream = require('merge-stream');
var rename = require('gulp-rename');
var del = require('del');
var vfs = require('vinyl-fs');
var path = require('path')
var through2 = require('through2').obj

var entryPoints = [
  '**/*.html',
  '**/resize.js',
  '**/embed.js',
  '*.{png,ico}'
]

/*
 * Publish the given source files to AWS
 * with the given headers
 */
function publishToS3(bucket, simulate, force) {

  if (force) {
    del.sync('./.awspublish-*');
  }

  // Config object is passed to
  // new AWS.S3() as documented here:
  //   http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property

  var publisher = createPublisher(bucket);

  console.log(`Publishing to ${bucket}`)

  // We want to construct a pipeline that consists of multiple segments piped together.
  // The consumer of this pipeline needs to be able to pipe into its first segment
  // and to maybe continue it, i.e. to access its last segment. So we're returning
  // an array with the first and last segments of this pipeline.

  var first = publisher.publish({}, {
    force: force,
    simulate: simulate === true ? true : false
  })
  var cache = null
  if (!force) {
    cache = first.pipe(publisher.cache())
  }
  var last = (cache || first).pipe(awspublish.reporter())
  return [first, last]

}

/*
 * Create the AWS publisher
 */
function createPublisher(bucket) {
  // Access keys etc. are not needed in config as they
  // should be defined in the AWS credentials file.
  //
  // See:
  //   http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html
  //   https://www.npmjs.com/package/gulp-awspublish

  var config = {
    params: {
      'Bucket': bucket
    }
  };
  var publisher = awspublish.create(config);
  return publisher;
}

//
// https://github.com/jussi-kalliokoski/gulp-awspublish-router/blob/master/lib/utils/initFile.js
//
function s3Init(file) {
  if (file.s3) {
    return;
  }

  file.s3 = {};
  file.s3.headers = {};
  file.s3.path = file.path.replace(file.base, "").replace(new RegExp("\\" + path.sep, "g"), "/");
}

/*
 * Get file streams for all entry points assets
 * (assets without rev urls)
 */
function entryPointStream(sourceFolder) {

  if (!sourceFolder) {
    sourceFolder = 'dist';
  }

  return vfs.src(entryPoints, {
    cwd: sourceFolder
  })
}

/*
 * Get file streams for all hashed assets
 * (assets with rev urls)
 *
 * targetFolder -- folder to publish into
 * maxAge -- expiry age for header
 */
function assetStream(sourceFolder, maxAge) {

  if (maxAge === null || !isFinite(maxAge)) {
    maxAge = 3600;
  }

  console.log("Using max-age " + maxAge);

  if (!sourceFolder) {
    sourceFolder = 'dist';
  }

  var headers = {
    'Cache-Control': `max-age=${maxAge}, public`
  };

  // Select everything BUT the entrypoints
  var src = entryPoints.map(f => "!" + f)
  src.unshift('**/*.*')

  return vfs.src(src, {
      cwd: sourceFolder
    })
    .pipe(through2((file, enc, cb) => {
      s3Init(file)
      Object.assign(file.s3.headers, headers)
      cb(null, file)
    }))
}

module.exports = {
  entryPointStream,
  assetStream,
  publishToS3,
  publish: (entry, asset, bucket, simulate, force) => {

    // We want to construct a new stream that combines two others
    // sequentially. We pipe to it the first one, passing the option end: false,
    // listen for the 'end' event of the first stream and then pipe it the second one,
    // not passing the end option.

    var output = new require('stream').PassThrough({
      objectMode: true
    })

    // It is important to do deploy in series to
    // achieve an "atomic" update. uploading index.html
    // before hashed assets would be bad -- JOJ

    //console.log('bucket', bucket, 'folder', folder, 'maxAge', maxAge, 'simulate', simulate, 'force', force, 'entry_', entry, 'asset_', asset_)
    asset.once('end', () => entry.pipe(output))

    var s3 = publishToS3(bucket, simulate, force) // we get the first and last segments of the pipeline

    var stream = asset
      .pipe(output, {
        end: false
      })
      .pipe(s3[0])

    return s3[1]

  }
}
