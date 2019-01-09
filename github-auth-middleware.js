const jwt = require("jsonwebtoken");

function generateJWT({ app_id, pem }) {
  return jwt.sign(
    {
      iat: Math.floor(new Date() / 1000),
      exp: Math.floor(new Date() / 1000) + 60,
      iss: app_id
    },
    pem,
    { algorithm: "RS256" }
  );
}

module.exports = config => async (req, res, next) => {
  const { octokit } = config;
  let token = generateJWT(config);
  octokit.authenticate({ type: "app", token });

  const installation_id = req.body.installation.id;
  const { data } = await octokit.apps.createInstallationToken({
    installation_id
  });
  octokit.authenticate({ type: "token", token: data.token });

  return next();
};
