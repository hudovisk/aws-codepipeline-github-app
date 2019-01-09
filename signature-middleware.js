const crypto = require("crypto");

const defaults = {
  algorithm: "sha1"
};

module.exports = config => (req, res, next) => {
  config = Object.assign({}, defaults, config);
  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(500).send("Missing req.rawBody");
  }

  const signature = req.header("X-Hub-Signature");

  if (!signature) {
    return res.status(400).send("Missing X-Hub-Signature header");
  } else {
    const body = Buffer.from(rawBody);
    const hmac = crypto.createHmac(config.algorithm, config.secret);
    hmac.update(body, "utf-8");

    if (signature !== `${defaults.algorithm}=${hmac.digest("hex")}`) {
      return res.status(400).send("Invalid X-Hub-Signature");
    }
  }

  return next();
};

module.exports.extractRawBody = function(req, res, buf) {
  req.rawBody = buf;
};
