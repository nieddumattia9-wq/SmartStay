const { getPartnerToken } = require("./authService");

let currentToken = null;

let expiresAt = 0;

let pendingTokenRequest = null;

const TOKEN_TTL_MS =
  23 * 60 * 60 * 1000;

function isTokenValid() {

  return (
    currentToken &&
    Date.now() < expiresAt
  );

}

async function requestAndCacheToken() {

  console.log("🔄 Requesting new RouteStack token...");

  const auth = await getPartnerToken();

  if (!auth?.token) {

    throw new Error(
      "Unable to cache RouteStack token: token missing."
    );

  }

  currentToken = auth.token;

  expiresAt =
    Date.now() + TOKEN_TTL_MS;

  console.log("✅ RouteStack token cached.");

  return currentToken;

}

async function getToken() {

  if (isTokenValid()) {

    return currentToken;

  }

  if (pendingTokenRequest) {

    return pendingTokenRequest;

  }

  pendingTokenRequest = requestAndCacheToken();

  try {

    return await pendingTokenRequest;

  } finally {

    pendingTokenRequest = null;

  }

}

function clearToken() {

  currentToken = null;

  expiresAt = 0;

  pendingTokenRequest = null;

}

module.exports = {
  getToken,
  clearToken,
};