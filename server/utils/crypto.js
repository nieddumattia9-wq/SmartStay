const crypto = require("crypto");

function generateNonce(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

function generateTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function generateHmac(apiKey, apiSecret, timestamp, nonce) {
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