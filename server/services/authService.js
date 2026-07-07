const axios = require("axios");

const config = require("../config/routeStack");

const {
  generateNonce,
  generateTimestamp,
  generateHmac,
} = require("../utils/crypto");

function maskValue(value, visibleChars = 8) {

  if (!value || typeof value !== "string") {
    return "";
  }

  if (value.length <= visibleChars) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, visibleChars)}...`;

}

async function getPartnerToken() {

  try {

    const nonce = generateNonce();

    const timestamp = generateTimestamp();

    const hmac = generateHmac(
      config.apiKey,
      config.apiSecret,
      timestamp,
      nonce
    );

    const payload = {
      apiKey: config.apiKey,
      timestamp,
      nonce,
      hmac,
    };

    console.log("\n========== RouteStack Auth ==========");
    console.log("Authenticating with partner-token endpoint...");
    console.log("Timestamp:", timestamp);
    console.log("API Key:", maskValue(config.apiKey));
    console.log("Nonce:", maskValue(nonce));
    console.log("HMAC:", maskValue(hmac));
    console.log("====================================\n");

    const response = await axios.post(
      `${config.baseUrl}/mcp/auth/partner-token`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    if (!response.data?.token) {

      throw new Error(
        "RouteStack authentication response did not include a token."
      );

    }

    console.log("✅ RouteStack partner token received.");
    console.log("Token:", maskValue(response.data.token, 24));
    console.log("Expires in:", response.data.expiresIn ?? "unknown");

    return response.data;

  } catch (error) {

    console.error("\n❌ RouteStack Authentication Error");

    if (error.response) {

      console.error("Status:", error.response.status);
      console.error("Body:", error.response.data);

    } else {

      console.error("Message:", error.message);

    }

    throw error;

  }

}

module.exports = {
  getPartnerToken,
};