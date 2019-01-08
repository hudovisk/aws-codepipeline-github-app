const express = require("express");
const bodyParser = require("body-parser");
const octokit = require("@octokit/rest")();
const jwt = require("jsonwebtoken");
const githubMiddleware = require("./github-middleware");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({
  verify: githubMiddleware.extractRawBody
}));
app.use(bodyParser.urlencoded({ extended: true }));

function generateJWT() {
  return jwt.sign(
    {
      iat: Math.floor(new Date() / 1000),
      exp: Math.floor(new Date() / 1000) + 60,
      iss: process.env.GITHUB_APP_ID
    },
    process.env.GITHUB_APP_PEM,
    { algorithm: "RS256" }
  );
}

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
  const payload = {
    owner,
    repo,
    name,
    head_sha,
    status,
    conclusion,
    completed_at,
    output,
    actions
  };
  octokit.checks.create(payload);
}

async function handleAction(body) {
  const owner = body.repository.owner.login;
  const repo = body.repository.name;
  const check_run_id = body.check_run.id;
  let status = "in_progress";
  let actions = [];
  await octokit.checks.update({owner, repo, check_run_id, status, actions })
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  status = "completed"
  const conclusion = "success"
  const completed_at = new Date().toISOString();
  const output = {
    title: "Environment created!",
    summary: "link to env: [https://example.com](https://example.com)"
  };
  actions = [{
    label: "Destroy",
    description: "Destroy new environment",
    identifier: "destroy"
  }]
  await octokit.checks.update({owner, repo, check_run_id, status, conclusion, completed_at, output, actions })
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

app.post("/", githubMiddleware, async (req, res) => {
  const eventName = req.get("X-GitHub-Event");
  const body = req.body;

  console.log(eventName);
  console.log(req.body);

  try {
    let token = generateJWT();
    octokit.authenticate({ type: "app", token });
  
    const installation_id = body.installation.id;
    const { data } = await octokit.apps.createInstallationToken({
      installation_id
    });
    octokit.authenticate({ type: "token", token: data.token });
  
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
  } catch(e) {
    console.error(e);
  }

  return res.send();
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
