"use strict";

var git = require('git-rev-sync');
var name = require('project-name');

const ENVS = require('./envs.js')

var deployOptions = {}
deployOptions[ENVS.PRODUCTION] = {
  bucket: 'lucify-prod',
  baseUrl: 'http://www.lucify.com/',
  maxAge: 3600
}
deployOptions[ENVS.STAGING] = {
  bucket: 'lucify-staging',
  baseUrl: 'http://staging.lucify.com/',
  maxAge: 0
}
deployOptions[ENVS.DEVELOPMENT] = {
  bucket: 'lucify-dev',
  baseUrl: 'http://dev.lucify.com/',
  maxAge: 0
}
deployOptions[ENVS.TEST] = {
  bucket: 'lucify-development',
  baseUrl: 'http://lucify-development.s3-website-eu-west-1.amazonaws.com/',
  maxAge: 0
}

module.exports = function(env, opts_) {

  let opts = opts_ || {}

  function getProject() {
    if (opts.project) {
      return opts.project;
    }
    if (process.env.PROJECT) {
      return process.env.PROJECT;
    }
    if (process.env.CIRCLE_PROJECT_REPONAME) {
      return process.env.CIRCLE_PROJECT_REPONAME;
    }
    if (name()) {
      return name();
    }
    return 'unknown-project';
  }

  function getOrg() {
    if (opts.org) {
      return opts.org;
    }
    if (process.env.ORG) {
      return process.env.ORG;
    }
    if (process.env.CIRCLE_PROJECT_USERNAME) {
      return process.env.CIRCLE_PROJECT_USERNAME;
    }
    return 'lucified';
  }

  function getFlow() {
    if (opts.flow) {
      return opts.flow;
    }
    if (process.env.FLOW) {
      return process.env.FLOW;
    }
    return '2dc8dfef-2d5c-441d-9a87-e46d6266babb'; // testing flow
  }

  function getCommit() {
    if (process.env.COMMIT) {
      return process.env.COMMIT;
    }
    if (process.env.CIRCLE_SHA1) {
      return process.env.CIRCLE_SHA1;
    }
    return git.long();
  }

  function getBranch() {
    if (process.env.BRANCH) {
      return process.env.BRANCH;
    }
    if (process.env.CIRCLE_BRANCH) {
      return process.env.CIRCLE_BRANCH;
    }
    return git.branch();
  }

  function getAssetContext() {
    if (opts.assetContext && env !== ENVS.TEST)
      return opts.assetContext;

    var project = getProject();
    var branch = getBranch();
    var path = `${project}-${branch}`;
    path += getCommit() ? `-${getCommit().substr(0, 7)}` : '';
    path += "/";

    return path;
  }


  let o = deployOptions[env]
  if (!o) throw new Error(`Unknown environment ${env}`)

  o.assetContext = getAssetContext()
  o.path = o.assetContext
  o.url = o.baseUrl + o.assetContext
  o.project = getProject()
  o.org = getOrg()
  o.commit = getCommit()
  o.branch = getBranch()
  o.flow = getFlow()
  o.env = env

  return o
}

