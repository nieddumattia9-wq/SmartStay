const { getPartnerToken } = require("./authService");

let currentToken = null;

let expiresAt = 0;

async function getToken() {

  const now = Date.now();

  if (
    currentToken &&
    now < expiresAt
  ) {
    return currentToken;
  }

  console.log("🔄 Requesting new RouteStack token...");

  const auth = await getPartnerToken();

  currentToken = auth.token;

  expiresAt =
    now +
    (23 * 60 * 60 * 1000);

  console.log("✅ Token cached.");

  return currentToken;

}

module.exports = {
  getToken,
};