module.exports = function notify(project, _org, branch, env, url, cb) {
  // we still support also the legacy flowdock PUSH api
  // notification, which will be delivered if a FLOW_TOKEN
  // is defined.

  if (!process.env.FLOW_TOKEN) {
    cb();
    return;
  }

  var gitMessage = git.message();

  var options = {
    url: `https://api.flowdock.com/v1/messages/team_inbox/${process.env.FLOW_TOKEN}`,
    method: 'POST',
    json: true,
    body: {
      'source': 'CircleCI',
      //"from_name": "Mr. Robot",
      'from_address': 'deploy@lucify.com',
      'subject': `Deployed branch ${project}/${branch} to ${env}`,
      'content': `<p>${gitMessage}</p> <p>${url}</p>`,
      'project': project,
      'tags':  ['#deployment', `#${env}`]
    }
  };
  request(options, (error, res, body) => {
    if(error) {
      gutil.log(error);
      return cb();
    }
    if(res.statusCode != 200) {
      gutil.log(`STATUS: ${res.statusCode}`);
      gutil.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      gutil.log(`BODY: ${JSON.stringify(body)}`);
    }
    cb();
  });
}
