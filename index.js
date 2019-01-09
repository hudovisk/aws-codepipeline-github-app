const express = require("express");
const bodyParser = require("body-parser");
const octokit = require("@octokit/rest")();
const signatureMiddleware = require("./signature-middleware");
const githubAuthMiddleware = require("./github-auth-middleware");

const app = express();
const port = process.env.PORT || 3000;

app.use(
  bodyParser.json({
    verify: signatureMiddleware.extractRawBody
  })
);
app.use(bodyParser.urlencoded({ extended: true }));

async function createCheck(body) {
  const owner = body.repository.owner.login;
  const repo = body.repository.name;
  const name = "feature-env";
  const head_sha = body.check_suite.head_sha;
  const status = "completed";
  const conclusion = "neutral";
  const completed_at = new Date().toISOString();
  const output = {
    title: "Create environment!",
    summary: "Click the button to deploy a new environment!"
  };
  const actions = [
    {
      label: "Create",
      description: "Create new environment",
      identifier: "create"
    }
  ];
  octokit.checks.create({
    owner,
    repo,
    name,
    head_sha,
    status,
    conclusion,
    completed_at,
    output,
    actions
  });
}

async function handleAction(body) {
  const owner = body.repository.owner.login;
  const repo = body.repository.name;
  const check_run_id = body.check_run.id;
  let status = "in_progress";
  let actions = [];
  await octokit.checks.update({ owner, repo, check_run_id, status, actions });

  await new Promise(resolve => setTimeout(resolve, 3000));

  status = "completed";
  const conclusion = "success";
  const completed_at = new Date().toISOString();
  const output = {
    title: "Environment created!",
    summary: "link to env: [https://example.com](https://example.com)"
  };
  actions = [
    {
      label: "Destroy",
      description: "Destroy new environment",
      identifier: "destroy"
    }
  ];
  await octokit.checks.update({
    owner,
    repo,
    check_run_id,
    status,
    conclusion,
    completed_at,
    output,
    actions
  });
}

function handleCheckSuite(body) {
  const action = body.action;
  switch (action) {
    case "requested":
      return createCheck(body);
    default:
      console.log("unknow action: ", action);
  }
}

function handleCheckRun(body) {
  const action = body.action;
  switch (action) {
    case "requested_action":
      return handleAction(body);
    default:
      console.log("unknow action: ", action);
  }
}

app.post(
  "/",
  signatureMiddleware({ secret: process.env.GITHUB_WEBHOOK_SECRET }),
  githubAuthMiddleware({
    pem: process.env.GITHUB_APP_PEM,
    app_id: process.env.GITHUB_APP_ID,
    octokit
  }),
  async (req, res) => {
    const eventName = req.get("X-GitHub-Event");
    const body = req.body;

    try {
      switch (eventName) {
        case "check_suite":
          handleCheckSuite(body);
          break;
        case "check_run":
          handleCheckRun(body);
          break;
        default:
          console.log("unkown event name: ", eventName);
      }
    } catch (e) {
      console.error(e);
    }

    return res.send();
  }
);

app.listen(port, () => console.log(`Listening on port ${port}!`));
