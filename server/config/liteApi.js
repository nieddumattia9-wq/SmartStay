require("dotenv").config();

const LITEAPI_BASE_URL =
  process.env.LITEAPI_BASE_URL ||
  "https://api.liteapi.travel/v3.0";

const LITEAPI_API_KEY =
  process.env.LITEAPI_API_KEY || "";

const LITEAPI_DEFAULT_CURRENCY =
  process.env.LITEAPI_DEFAULT_CURRENCY ||
  "EUR";

const LITEAPI_DEFAULT_GUEST_NATIONALITY =
  process.env.LITEAPI_DEFAULT_GUEST_NATIONALITY ||
  "IT";

const LITEAPI_TIMEOUT_SECONDS =
  Number(process.env.LITEAPI_TIMEOUT_SECONDS || 12);

const LITEAPI_RESULTS_LIMIT =
  Number(process.env.LITEAPI_RESULTS_LIMIT || 80);

function getLiteApiConfig() {
  return {
    baseUrl: LITEAPI_BASE_URL,
    apiKey: LITEAPI_API_KEY,
    defaultCurrency: LITEAPI_DEFAULT_CURRENCY,
    defaultGuestNationality: LITEAPI_DEFAULT_GUEST_NATIONALITY,
    timeoutSeconds: LITEAPI_TIMEOUT_SECONDS,
    resultsLimit: LITEAPI_RESULTS_LIMIT,
  };
}

function assertLiteApiConfig() {
  if (!LITEAPI_API_KEY) {
    throw new Error(
      "Missing LITEAPI_API_KEY in server/.env"
    );
  }
}

module.exports = {
  LITEAPI_BASE_URL,
  LITEAPI_API_KEY,
  LITEAPI_DEFAULT_CURRENCY,
  LITEAPI_DEFAULT_GUEST_NATIONALITY,
  LITEAPI_TIMEOUT_SECONDS,
  LITEAPI_RESULTS_LIMIT,
  getLiteApiConfig,
  assertLiteApiConfig,
};