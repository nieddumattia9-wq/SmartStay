const axios = require("axios");

const config = require("../config/routeStack");

const {
  generateNonce,
  generateTimestamp,
  generateHmac,
} = require("../utils/crypto");

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

    console.log("\n========== RouteStack ==========");
    console.log("Authenticating...");
    console.log("Timestamp:", timestamp);
    console.log("Nonce:", nonce);
    console.log("===============================\n");

    console.log("\n===== REQUEST PAYLOAD =====");
    console.log(payload);
    console.log("===========================\n");

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

    console.log("✅ Partner Token ricevuto!");
    console.log(response.data);

    return response.data;

  } catch (error) {

    console.error("\n❌ RouteStack Authentication Error");

    console.error("Status:", error.response?.status);
    console.error("Headers:", error.response?.headers);
    console.error("Body:", error.response?.data);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

module.exports = {
  getPartnerToken,
};