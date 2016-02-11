"use strict";

require('chai').should()
var fs = require('fs')
var builder = require('../')
var ENVS = require('../src/js/envs.js')

var fileExists = require('file-exists');

const deployOpt = require('../src/js/deploy-options.js')


var inspect = (obj) => console.log(require("util").inspect(obj,{ depth: null }))

describe("deploy options", () => {

  it("has correct TEST attributes", () => {
    const o = deployOpt(ENVS.TEST)
    inspect(o)
    o.path.should.equal(o.assetContext)
  })

})


describe("github-deploy", done => {

  it("works", done => {
    const deployOpt = require('../src/js/deploy-options.js')(ENVS.TEST)
    let githubDeploy = require('../src/js/github-deploy.js')
    githubDeploy(deployOpt.project, deployOpt.org, deployOpt.branch, deployOpt.env, deployOpt.flow, (e, o) => {
      if(e) {
        inspect(e.options)
        done(e)
      }
      inspect(o)
      done()
    })
  })

})

describe("build test projects", () => {
  it("returns exit code zero for builds", done => {
    const parent = require('path').normalize(__dirname + "/../")
    const spawn = require('child_process').spawn;
    const p = spawn('./build-test-projects', [], {cwd: parent});

    p.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    p.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    p.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      if(code > 0) return done(new Error("Failed"))
      done()
    });
  })

  it("creates basic assets for single-page-test-project", done => {
    fileExists('test-projects/single-page-test-project/dist/hello-world/index.html').should.equal(true);
    fileExists('test-projects/single-page-test-project/dist/index.html').should.equal(false);
    done();
  });

  it("creates basic assets for single-embed-test-project", done => {
    fileExists('test-projects/single-embed-test-project/dist/embed/hello-world/index.html').should.equal(true);
    fileExists('test-projects/single-embed-test-project/dist/embed/hello-world/embed-codes.html').should.equal(true);
    fileExists('test-projects/single-embed-test-project/dist/embed/hello-world/embed.js').should.equal(true);
    fileExists('test-projects/single-embed-test-project/dist/embed/hello-world/resize.js').should.equal(true);
    fileExists('test-projects/single-embed-test-project/dist/index.html').should.equal(false);
    done();
  });

  it("creates basic assets for multi-embed-test-project", done => {
    fileExists('test-projects/multi-embed-test-project/dist/embed/hello-world/index.html').should.equal(true);
    fileExists('test-projects/multi-embed-test-project/dist/embed/hello-world/embed-codes.html').should.equal(true);
    fileExists('test-projects/multi-embed-test-project/dist/embed/subpath/hello-world-two/index.html').should.equal(true);
    fileExists('test-projects/multi-embed-test-project/dist/embed/subpath/hello-world-two/embed-codes.html').should.equal(true);
    fileExists('test-projects/multi-embed-test-project/dist/embed/embed.js').should.equal(true);
    fileExists('test-projects/multi-embed-test-project/dist/embed/resize.js').should.equal(true);
    fileExists('test-projects/multi-embed-test-project/dist/embed/index.html').should.equal(false);
    done();
  });

  it("creates basic assets for multi-page-test-project", done => {
    fileExists('test-projects/multi-page-test-project/dist/test-path/index.html').should.equal(true);
    fileExists('test-projects/multi-page-test-project/dist/test-path/embed-codes.html').should.equal(false);
    fileExists('test-projects/multi-page-test-project/dist/test-path/subpage/index.html').should.equal(true);
    done();
  });

})
