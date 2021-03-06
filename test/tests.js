'use strict';

var chai = require('chai');
chai.should();
var expect = chai.expect;
var _ = require('lodash');
var ENVS = require('../src/js/envs.js');

chai.use(require('chai-fs'));

const deployOpt = require('../src/js/deploy-options.js');


var inspect = (obj) => console.log(require('util').inspect(obj,{ depth: null })); // eslint-disable-line

describe('deploy options', () => {
  it('has equal path and assetContext', () => {
    const o = deployOpt(ENVS.TEST);
    o.path.should.equal(o.assetContext);
  });

  it('throws with unknown env', () => {
    expect(deployOpt.bind(null, 'unknown')).to.throw(Error);
  });

  it('allows simple overrides', () => {
    const overrides = {
      bucket: 'overridden',
      baseUrl: 'overridden',
      maxAge: 1800,
      assetContext: 'overridden',
      path: 'overridden',
      project: 'overridden',
      org: 'overridden',
      commit: 'overridden',
      branch: 'overridden',
      flow: 'overridden',
      simulateDeployment: true,
      forceDeployment: true
    };
    const o = deployOpt(ENVS.PRODUCTION, overrides);
    for (var k in overrides) {
      o.should.have.property(k, overrides[k]);
    }
  });

  it('allows function overrides', () => {

    const numbers = _.zipObject(_.values(ENVS), _.range(0,_.values(ENVS).length));

    const s = env => env;
    const i = env => numbers[env];
    const b = env => env === ENVS.PRODUCTION;

    const overrides = {
      bucket: s,
      baseUrl: s,
      maxAge: i,
      assetContext: s,
      path: s,
      project: s,
      org: s,
      commit: s,
      branch: s,
      flow: s,
      simulateDeployment: b,
      forceDeployment: b
    };

    for (var e in ENVS) {
      let env = ENVS[e];
      let o = deployOpt(env, overrides);
      for (var k in overrides) {
        o.should.have.property(k, overrides[k](env));
      }
    }
  });

});


describe('github-deploy', () => {

  it('works', done => {
    const deployOpt = require('../src/js/deploy-options.js')(ENVS.TEST);
    let githubDeploy = require('../src/js/github-deploy.js');
    githubDeploy(deployOpt.project, deployOpt.org, deployOpt.branch, deployOpt.env, deployOpt.flow, (e, o) => {
      if(e) {
        inspect(e.options);
        done(e);
      }
      inspect(o);
      done();
    });
  });


  it('is not called when FROM_HEAVEN is set', done => {
    const deployOpt = require('../src/js/deploy-options.js')(ENVS.TEST);
    let githubDeploy = require('../src/js/github-deploy.js');
    process.env.FROM_HEAVEN = 1;
    delete process.env.GITHUB_TOKEN;
    githubDeploy(deployOpt.project, deployOpt.org, deployOpt.branch, deployOpt.env, deployOpt.flow, (e, o) => {
      if(e) {
        inspect(e.options);
        done(e);
      }
      expect(o).to.exist;
      expect(o).to.equal('interrupted');
      done();
    });
  });

  it('is not called when GITHUB_TOKEN is not set', done => {
    const deployOpt = require('../src/js/deploy-options.js')(ENVS.TEST);
    let githubDeploy = require('../src/js/github-deploy.js');
    delete process.env.FROM_HEAVEN;
    delete process.env.GITHUB_TOKEN;
    githubDeploy(deployOpt.project, deployOpt.org, deployOpt.branch, deployOpt.env, deployOpt.flow, (e, o) => {
      if(e) {
        inspect(e.options);
        done(e);
      }
      expect(o).to.exist;
      expect(o).to.equal('interrupted');
      done();
    });
  });

});


describe('build test projects', () => {
  it('returns exit code zero for builds', done => {
    const parent = require('path').normalize(__dirname + '/../');
    const spawn = require('child_process').spawn;
    const p = spawn('./build-test-projects', [], {cwd: parent});

    p.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    p.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    p.on('close', (code) => {
      console.log(`child process exited with code ${code}`); // eslint-disable-line
      if(code > 0) return done(new Error('Failed'));
      done();
    });
  });

  it('creates basic assets for single-page-test-project', done => {
    'test-projects/single-page-test-project/dist/hello-world/lucify-metadata.json'.should.be.a.file().with.json;
    'test-projects/single-page-test-project/dist/hello-world/index.html'.should.be.a.file().and.not.empty;
    'test-projects/single-page-test-project/dist/index.html'.should.not.be.a.path();
    done();
  });

  it('creates basic assets for single-embed-test-project', done => {
    'test-projects/single-embed-test-project/dist/embed/hello-world/index.html'.should.be.a.file().and.not.empty;
    'test-projects/single-embed-test-project/dist/embed/hello-world/embed-codes.html'.should.be.a.file().and.not.empty;
    'test-projects/single-embed-test-project/dist/embed/hello-world/embed.js'.should.be.a.file().and.not.empty;
    'test-projects/single-embed-test-project/dist/embed/hello-world/resize.js'.should.be.a.file().and.not.empty;
    'test-projects/single-embed-test-project/dist/embed/hello-world/lucify-metadata.json'.should.be.a.file().with.json;
    'test-projects/single-embed-test-project/dist/index.html'.should.not.be.a.path();
    done();
  });

  it('creates basic assets for multi-page-test-project', done => {
    'test-projects/multi-page-test-project/dist/test-path/index.html'.should.be.a.file().and.not.empty;
    'test-projects/multi-page-test-project/dist/test-path/lucify-metadata.json'.should.be.a.file().with.json;
    'test-projects/multi-page-test-project/dist/test-path/embed-codes.html'.should.not.be.a.path();
    'test-projects/multi-page-test-project/dist/test-path/subpage/index.html'.should.be.a.file().and.not.empty;
    done();
  });

  it('creates basic assets for templates-test-project', done => {
    'test-projects/templates-test-project/dist/hello-world/lucify-metadata.json'.should.be.a.file().with.json;
    'test-projects/templates-test-project/dist/hello-world/index.html'.should.be.a.file().and.not.empty;
    'test-projects/templates-test-project/dist/hello-world/embed-codes.html'.should.be.a.file().and.not.empty;
    'test-projects/templates-test-project/dist/hello-world/index.html'.should.have.content.that.match(/HELLO/);
    'test-projects/templates-test-project/dist/hello-world/embed-codes.html'.should.have.content.that.match(/HELLO EMBED/);
    done();
  });

});
