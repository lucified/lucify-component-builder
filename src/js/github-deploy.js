
var request = require('request');

/*
 * Create a deployment with GitHub deployment API
 */
function githubDeploy(project, org, branch, env, flow, cb) {

    if (!process.env.GITHUB_TOKEN) {
        console.log("No github token defined, not notifying deployment API");
        cb();
        return;
    }

    const task = "deploy"
    const robotName = "lucifer"

    var body = {
      ref: branch,
      task: task,
      force: false,
      auto_merge: false,
      environment: env,
      required_contexts: [],
      description: `${task} on ${env} from lucify-component-builder`,
      payload: {
        name: project,
        robotName: robotName,
        hosts: "",
        notify: {
          adapter: "flowdock",
          room: flow
//          user: @user
//          message_id: @messageId
//          thread_id: @threadId
        },
        // TODO: maybe set different provider when running local deploy?
        config: {
          provider: "circleci",
          circle_build_num: process.env.CIRCLE_BUILD_NUM
        }
      }
    }

    var options = {
      url: `https://api.github.com/repos/${org}/${project}/deployments`,
      method: 'POST',
      auth: {
        user: "lucified-lucifer",
        pass: process.env.GITHUB_TOKEN
      },
      headers: {
        'User-Agent': org
      },
      json: true,
      body: body
    }

    request(options, (error, res, body) => {
      if(error) {
        console.log(error)
        return cb(error)
      }

      const STATUS = res.statusCode
      const HEADERS = res.headers
      const BODY = body

      if(STATUS < 200 || STATUS >= 300) {
        console.log(`STATUS: ${STATUS}`);
        console.log(`HEADERS: ${JSON.stringify(HEADERS)}`);
        console.log(`BODY: ${JSON.stringify(BODY)}`);
        var err = new Error(`Received status ${STATUS}`)
        err.options = options
        return cb(err)
      }
      cb(null, {options, body})
    });
}

module.exports = githubDeploy;
