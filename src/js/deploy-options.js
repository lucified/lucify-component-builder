'use strict';

var git = require('git-rev-sync');
var name = require('project-name');
var _ = require('lodash');

const ENVS = require('./envs.js');

var deployOptions = {};
deployOptions[ENVS.PRODUCTION] = {
  bucket: 'lucify-prod',
  baseUrl: 'http://www.lucify.com/',
  maxAge: 3600,
  simulateDeployment: false,
  forceDeployment: false
};
deployOptions[ENVS.STAGING] = {
  bucket: 'lucify-staging',
  baseUrl: 'http://staging.lucify.com/',
  maxAge: 0,
  simulateDeployment: false,
  forceDeployment: false
};
deployOptions[ENVS.DEVELOPMENT] = {
  bucket: 'lucify-dev',
  baseUrl: 'http://dev.lucify.com/',
  maxAge: 0,
  simulateDeployment: false,
  forceDeployment: false
};
deployOptions[ENVS.TEST] = {
  bucket: 'lucify-protected',
  baseUrl: 'https://protected.lucify.com/',
  maxAge: 0,
  simulateDeployment: false,
  forceDeployment: false
};

module.exports = function(env, opts_) {

  let opts = opts_ || {};

  function getProject() {
    let project = opts.project;
    if(_.isFunction(project)) {
      project = project(env);
    }
    if (_.isString(project)) {
      return project;
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
    let bucket = opts.bucket;
    if(_.isFunction(bucket)) {
      bucket = bucket(env);
    }
    if (_.isString(bucket)) {
      return bucket;
    }
    if (process.env.BUCKET) {
      return process.env.BUCKET;
    }
    return deployOptions[env].bucket;
  }


  function getSimulateDeployment() {
    let simulateDeployment = opts.simulateDeployment;
    if(_.isFunction(simulateDeployment)) {
      simulateDeployment = simulateDeployment(env);
    }
    if (_.isBoolean(simulateDeployment)) {
      return simulateDeployment;
    }
    if (process.env.SIMULATEDEPLOYMENT) {
      return true;
    }
    return deployOptions[env].simulateDeployment;
  }

  function getForceDeployment() {
    let forceDeployment = opts.forceDeployment;
    if(_.isFunction(forceDeployment)) {
      forceDeployment = forceDeployment(env);
    }
    if (_.isBoolean(forceDeployment)) {
      return forceDeployment;
    }
    if (process.env.FORCEDEPLOYMENT) {
      return true;
    }
    return deployOptions[env].forceDeployment;
  }

  function getBaseUrl() {
    let baseUrl = opts.baseUrl;
    if(_.isFunction(baseUrl)) {
      baseUrl = baseUrl(env);
    }
    if (_.isString(baseUrl)) {
      return baseUrl;
    }
    if (process.env.BASEURL) {
      return process.env.BASEURL;
    }
    return deployOptions[env].baseUrl;
  }

  function getMaxAge() {
    let maxAge = opts.maxAge;
    if(_.isFunction(maxAge)) {
      maxAge = maxAge(env);
    }
    if (_.isNumber(maxAge)) {
      return maxAge;
    }
    if (process.env.MAXAGE) {
      return process.env.MAXAGE;
    }
    return deployOptions[env].maxAge;
  }


  function getOrg() {
    let org = opts.org;
    if(_.isFunction(org)) {
      org = org(env);
    }
    if (_.isString(org)) {
      return org;
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
    let flow = opts.flow;
    if(_.isFunction(flow)) {
      flow = flow(env);
    }
    if (_.isString(flow)) {
      return flow;
    }
    if (process.env.FLOW) {
      return process.env.FLOW;
    }
    return '2dc8dfef-2d5c-441d-9a87-e46d6266babb'; // testing flow
  }

  function getCommit() {
    let commit = opts.commit;
    if(_.isFunction(commit)) {
      commit = commit(env);
    }
    if (_.isString(commit)) {
      return commit;
    }
    if (process.env.COMMIT) {
      return process.env.COMMIT;
    }
    if (process.env.CIRCLE_SHA1) {
      return process.env.CIRCLE_SHA1;
    }
    return git.long();
  }

  function getBranch() {
    let branch = opts.branch;
    if(_.isFunction(branch)) {
      branch = branch(env);
    }
    if (_.isString(branch)) {
      return branch;
    }
    if (process.env.BRANCH) {
      return process.env.BRANCH;
    }
    if (process.env.CIRCLE_BRANCH) {
      return process.env.CIRCLE_BRANCH;
    }
    return git.branch();
  }

  function getAssetContext() {
    let assetContext = opts.assetContext;
    if(_.isFunction(assetContext)) {
      assetContext = assetContext(env);
      if (_.isString(assetContext)) {
        return assetContext;
      }
    }

    if (_.isString(assetContext) && env !== ENVS.TEST)
      return assetContext;

    var project = getProject();
    var branch = getBranch();
    var path = `${project}-${branch}`;
    path += getCommit() ? `-${getCommit().substr(0, 7)}` : '';
    path += '/';

    return path;
  }

  if (!deployOptions[env]) throw new Error(`deploy-options: unknown environment ${env}`);

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
    simulateDeployment: getSimulateDeployment(),
    forceDeployment: getForceDeployment(),
    env: env
  };
};

