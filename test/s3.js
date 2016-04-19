var expect = require('chai').expect;

var es = require('event-stream');
var s3 = require('../src/js/s3');
var fs = require('fs');
var debug = require('gulp-debug');
var through2 = require('through2').obj;
var AWS = require('aws-sdk');

var _ = require('lodash');
AWS.config.update({region: process.env.AWS_REGION || 'eu-west-1'});

var sodium = require('libsodium-wrappers');


var inspect = (obj) => console.log(require('util').inspect(obj,{ depth: null })); // eslint-disable-line


describe('entrypoint-stream', () => {

  it('contains the entrypoints', done => {
    s3.entryPointStream('test/dist')
      .pipe(debug())
      .pipe(es.writeArray((err, files) => {
        expect(err).not.to.exist;
        expect(files).to.have.length(7);
        done();
      }));
  });

});

describe('asset-stream', () => {

  it('contains everything else', done => {
    s3.assetStream('test/dist')
      .pipe(debug())
      .pipe(es.writeArray((err, files) => {
        expect(err).not.to.exist;
        expect(files).to.have.length(4);
        done();
      }));
  });

});

describe('publish-stream', () => {

  it('contains everything in correct order', done => {

    var entries = [];
    var eStream = s3.entryPointStream('test/dist')
      .pipe(through2((f,_e,cb) => {
        entries.push(f);
        cb(null, f);
      }));
    var assets = [];
    var aStream = s3.assetStream('test/dist')
      .pipe(through2((f,_e,cb) => {
        assets.push(f);
        cb(null, f);
      }));

    const opt = {
      simulateDeployment: true,
      forceDeployment: true,
      bucket: 'lucify-test-bucket'
    };
    const streams = [aStream, eStream];
    console.log(streams[0].pipe);
    s3.publishInSeries(streams, opt)
      .pipe(debug())
      .pipe(es.writeArray((err, files) => {
        expect(err).not.to.exist;
        inspect(files.map(f => f.s3));
        expect(files).to.have.length(11);
        expect(files).to.have.length(entries.length+assets.length);
        for (var i = assets.length - 1; i >= 0; i--) { // first assets
          expect(assets[i].path).to.equal(files[i].path);
        }
        for (var j = entries.length - 1; j >= 0; j--) { // then entrypoints
          expect(entries[j].path).to.equal(files[j+assets.length].path);
        }
        done();
      }));
  });

});


describe('decryption', () => {

  it('can decrypt', () => {

    const key = sodium.to_base64(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES));
    const nonce = sodium.to_base64(sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES));
    const message = 'Hello world!';
    const cipherText = sodium.crypto_secretbox_easy(
      message,
      sodium.from_base64(nonce),
      sodium.from_base64(key),
      'base64'
    );

    console.log({
      key,
      nonce,
      cipherText
    });
    const clearText = s3.decrypt(cipherText, nonce, key);
    expect(clearText).to.equal(message);

  });

  it('fails when key or nonce has been tampered with', () => {

    const key = sodium.to_base64(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES));
    const nonce = sodium.to_base64(sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES));
    const message = 'Hello world!';
    const cipherText = sodium.crypto_secretbox_easy(
      message,
      sodium.from_base64(nonce),
      sodium.from_base64(key),
      'base64'
    );

    var l = key.length;
    var first = key.substring(0, 1);
    const tamperedKey = String.fromCodePoint(first.codePointAt(0) + 1) + key.substring(1, l);
    console.log({key, tamperedKey});

    expect(tamperedKey).to.not.equal(key);
    expect(sodium.from_base64(tamperedKey)).to.not.equal(sodium.from_base64(key));
    expect(s3.decrypt.bind(null, cipherText, nonce, tamperedKey)).to.throw(Error);

    l = nonce.length;
    first = nonce.substring(0, 1);
    const tamperedNonce = String.fromCodePoint(first.codePointAt(0) + 1) + nonce.substring(1, l);
    console.log({nonce, tamperedNonce});

    expect(tamperedNonce).to.not.equal(nonce);
    expect(sodium.from_base64(tamperedNonce)).to.not.equal(sodium.from_base64(nonce));
    expect(s3.decrypt.bind(null, cipherText, tamperedNonce, key)).to.throw(Error);



  });

});


describe('cache', () => {

  it('gets written correctly', done => {

    var bucket = 'lucify-test-bucket';
    var cacheFile = `.awspublish-${bucket}`;
    try {
      fs.unlinkSync(cacheFile, 'utf8');
    } catch(err) {
    }

    function uploadAndTest(state, done) {

      var entry = s3.entryPointStream('test/dist');
      var asset = s3.assetStream('test/dist');

      var combinedStream = s3.publishInSeries([asset, entry], {bucket});

      var files = [];
      return combinedStream
        .pipe(through2((f, _enc, cb) => {
          expect(f.s3).to.exist;
          expect(f.s3.state).to.equal(state);
          files.push(f);
          cb(null, f);
        }, () => {
          try {
            var cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            //inspect(cache)
            expect(_.keys(cache)).to.have.length(files.length);
            done();
          } catch(err) {
            done(err);
          }
        }));
    }
    cleanBucket(bucket, err => {
      if(err) return done(err);
      uploadAndTest('create', err => {
        if(err) return done(err);
        uploadAndTest('cache', done);
      });
    });
  });
});

function cleanBucket(bucket, cb) {
  var awsS3 = new AWS.S3();
  awsS3.listObjects({Bucket: bucket}, (err, data) => {
    if(err) {
      return cb(err);
    }
    //inspect(data.Contents.map(f => f.Key))
    var keys = data.Contents.map(f => _.pick(f, 'Key'));
    //inspect(keys)
    if(keys.length > 0) {
      del(keys, cb);
    } else {
      cb();
    }

    function del(keys, cb) {
      awsS3.deleteObjects({Bucket: bucket, Delete: {Objects: keys}}, (err, data) => {
        if(err) {
          return cb(err);
        }
        //inspect(data.Deleted.map(f => f.Key))
        console.log(`Deleted ${data.Deleted.length} files from ${bucket}`); // eslint-disable-line
        cb();
      });
    }
  });
}
