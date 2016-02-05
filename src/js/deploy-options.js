
var git = require('git-rev-sync');
var name = require('project-name');


function getProject(opts) {
  if (process.env.PROJECT) {
    return process.env.PROJECT;
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
  return git.long();
}


function getBranch() {
  if (process.env.BRANCH) {
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
    prod: {
        bucket: 'lucify-prod',
        baseUrl: 'http://www.lucify.com/',
        getAssetContext: getAssetContext
    },
    staging: {
        bucket: 'lucify-staging',
        baseUrl: 'http://staging.lucify.com/',
        getAssetContext: getAssetContext
    },
    dev: {
        bucket: 'lucify-dev',
        baseUrl: 'http://dev.lucify.com/',
        getAssetContext: getAssetContext
    },
    testing: {
        bucket: 'lucify-development',
        baseUrl: 'http://lucify-development.s3-website-eu-west-1.amazonaws.com/',
        getAssetContext: getAssetContextTesting
    }
  },
  getProject: getProject
}


module.exports = deployOptions;
