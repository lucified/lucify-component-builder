"use strict";

require('chai').should()
var expect = require('chai').expect;
var fs = require('fs')
var builder = require('../')
var ENVS = require('../src/js/envs.js')

const deployOpt = require('../src/js/deploy-options.js')


var inspect = (obj) => console.log(require("util").inspect(obj,{ depth: null }))

describe("deploy options", () => {

  it("has equal path and assetContext", () => {
    const o = deployOpt(ENVS.TEST)
    o.path.should.equal(o.assetContext)
  })

  it("throws with unknown env", () => {
      expect(deployOpt.bind(null, "unknown")).to.throw(Error)
  })

  it("allows overrides", () => {
    const overrides = {
      bucket: "overridden",
      baseUrl: "overridden",
      maxAge: "overridden",
      assetContext: "overridden",
      path: "overridden",
      url: "overridden",
      project: "overridden",
      org: "overridden",
      commit: "overridden",
      branch: "overridden",
      flow: "overridden"
    }
    const o = deployOpt(ENVS.PRODUCTION, overrides)
    for (var k in overrides) {
      if (k === "url")
        o.should.have.property(k, overrides["url"]+overrides["assetContext"])
      else
        o.should.have.property(k, overrides[k])
    }
  })


})


describe("github-deploy", done => {

  xit("works", done => {
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