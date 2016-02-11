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

  function getBucket() {
    if (opts.bucket) {
      return opts.bucket;
    }
    if (process.env.BUCKET) {
      return process.env.BUCKET;
    }
    return deployOptions[env].bucket;
  }

  function getBaseUrl() {
    if (opts.baseUrl) {
      return opts.baseUrl;
    }
    if (process.env.BASEURL) {
      return process.env.BASEURL;
    }
    return deployOptions[env].baseUrl;
  }

  function getMaxAge() {
    if (opts.maxAge) {
      return opts.maxAge;
    }
    if (process.env.MAXAGE) {
      return process.env.MAXAGE;
    }
    return deployOptions[env].maxAge;
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

  if (!deployOptions[env]) throw new Error(`Unknown environment ${env}`)

  return {
    bucket: getBucket(),
    baseUrl: getBaseUrl(),
    maxAge: getMaxAge(),
    assetContext: getAssetContext(),
    path: getAssetContext(),
    url: getBaseUrl() + getAssetContext(),
    project: getProject(),
    org: getOrg(),
    commit: getCommit(),
    branch: getBranch(),
    flow: getFlow(),
    env: env
  }
}

