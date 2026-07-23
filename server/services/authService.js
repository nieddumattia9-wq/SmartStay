const {
  operationalLogger,
} = require(
  "../observability/operationalLogger"
);

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

    const startedAt =
      Date.now();

    operationalLogger.info(
      "provider.authentication.started",
      {
        providerId:
          "routestack",

        operation:
          "partner-token",
      }
    );

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

    operationalLogger.info(
      "provider.authentication.completed",
      {
        providerId:
          "routestack",

        operation:
          "partner-token",

        status:
          response.status,

        expiresIn:
          response.data.expiresIn ??
          null,

        durationMs:
          Math.max(
            0,
            Date.now() -
            startedAt
          ),
      }
    );

    return response.data;

  } catch (error) {

    operationalLogger.error(
      "provider.authentication.failed",
      {
        providerId:
          "routestack",

        operation:
          "partner-token",

        status:
          error?.response
            ?.status ??
          null,

        code:
          error?.code ??
          null,

        error,
      }
    );

    throw error;

  }

}

module.exports = {
  getPartnerToken,
};