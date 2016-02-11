"use strict";

require('chai').should()
var fs = require('fs')
var builder = require('../')
var ENVS = require('../src/js/envs.js')

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

    let githubDeploy = builder.githubDeploy
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
  it("works", done => {
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
})