
var git = require('git-rev-sync');
var name = require('project-name');


function getProject(opts) {
  if (process.env.PROJECT) {
    return process.env.PROJECT;
  }
  if (process.env.CIRCLE_PROJECT_REPONAME) {
    return process.env.CIRCLE_PROJECT_REPONAME;
  }
  if (opts.project) {
    return opts.project;
  }
  if (name()) {
    return name();
  }
  return 'unknown-project';
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
    return process.env.BRANCH;
  }
  return git.branch();
}


function getAssetContextTesting(opts) {
   var project = getProject(opts);
   var branch = getBranch();
   var path = `${project}-${branch}`;
   path += getCommit() ? `-${getCommit().substr(0, 7)}` : '';
   path += "/";
   return path;
}


function getAssetContext(opts) {
  return opts.assetContext;
}


var deployOptions = {
  targets: {
    production: {
        bucket: 'lucify-prod',
        baseUrl: 'http://www.lucify.com/',
        getAssetContext: getAssetContext,
        maxAge: 3600
    },
    staging: {
        bucket: 'lucify-staging',
        baseUrl: 'http://staging.lucify.com/',
        getAssetContext: getAssetContext,
        maxAge: 0
    },
    development: {
        bucket: 'lucify-dev',
        baseUrl: 'http://dev.lucify.com/',
        getAssetContext: getAssetContext,
        maxAge: 0
    },
    test: {
        bucket: 'lucify-development',
        baseUrl: 'http://lucify-development.s3-website-eu-west-1.amazonaws.com/',
        getAssetContext: getAssetContextTesting,
        maxAge: 0
    }
  },
  getProject: getProject
}


module.exports = deployOptions;
