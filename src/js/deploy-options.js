

function getProject(opts) {
  if (process.env.PROJECT) {
    return process.env.PROJECT;
  }
  if (opts.project) {
    return opts.project;
  }
  return 'unknown-project';
}


function getAssetContextTesting(opts) {
   var project = getProject();
   var branch = process.env.BRANCH;
   var path = `${project}-${branch}`;
   path += process.env.COMMIT ? `-${process.env.COMMIT.substr(0, 7)}` : '';
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
