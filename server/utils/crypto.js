const crypto = require("crypto");

function generateNonce(length = 32) {

  return crypto.randomBytes(length).toString("hex");

}

function generateTimestamp() {

  return Math.floor(Date.now() / 1000);

}

function generateHmac(
  apiKey,
  apiSecret,
  timestamp,
  nonce
) {

  if (!apiKey || !apiSecret || !timestamp || !nonce) {

    throw new Error(
      "Unable to generate HMAC: missing required parameter."
    );

  }

  const payload = `${apiKey}:${timestamp}:${nonce}`;

  return crypto
    .createHmac("sha256", apiSecret)
    .update(payload)
    .digest("base64url");

}

module.exports = {
  generateNonce,
  generateTimestamp,
  generateHmac,
};