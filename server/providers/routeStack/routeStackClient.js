const axios = require("axios");

const config = require("../../config/routeStack");

const {
  getToken,
} = require("../../services/tokenManager");

const HOTEL_SEARCH_TIMEOUT_MS =
  120000;

const DESTINATION_SEARCH_TIMEOUT_MS =
  15000;

function maskValue(value, visibleChars = 12) {

  if (!value || typeof value !== "string") {

    return "";

  }

  if (value.length <= visibleChars) {

    return "*".repeat(value.length);

  }

  return `${value.slice(0, visibleChars)}...`;

}

function createAuthHeaders(token) {

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

}

function createHttpError(message, response) {

  const error =
    new Error(message);

  error.response = {
    status:
      response.status,

    headers:
      response.headers,

    data:
      response.data,
  };

  return error;

}

function ensureHttpSuccess(response, context) {

  if (response.status >= 400) {

    throw createHttpError(
      `${context} failed with HTTP status ${response.status}.`,
      response
    );

  }

}

function sanitizePayloadForLog(payload = {}) {

  return {
    ...payload,

    token:
      payload.token
        ? maskValue(payload.token, 18)
        : undefined,

    correlationId:
      payload.correlationId
        ? maskValue(payload.correlationId, 18)
        : undefined,
  };

}

function logRouteStackRequest(
  title,
  endpoint,
  payload,
  token
) {

  console.log(`\n========== ${title} ==========`);
  console.log("Endpoint:", endpoint);

  console.log("\n----- REQUEST PAYLOAD -----");
  console.dir(
    sanitizePayloadForLog(payload),
    {
      depth: null,
    }
  );

  console.log("\n----- REQUEST HEADERS -----");
  console.dir(
    {
      Authorization:
        `Bearer ${maskValue(token, 30)}`,

      "Content-Type":
        "application/json",

      Accept:
        "application/json",
    },
    {
      depth: null,
    }
  );

}

function logRouteStackResponse(response) {

  console.log("\n----- HTTP STATUS -----");
  console.log(response.status);

  console.log("\n----- RESPONSE SUMMARY -----");

  const data =
    response.data ?? {};

  console.dir(
    {
      success:
        data.success,

      message:
        data.message,

      code:
        data.code,

      status:
        data.result?.status,

      count:
        data.result?.count,

      currency:
        data.result?.currency,

      nextResultsKey:
        data.result?.nextResultsKey,

      token:
        maskValue(data.result?.token, 18),

      correlationId:
        maskValue(data.result?.correlationId, 18),

      hotelsReceived:
        Array.isArray(data.result?.result)
          ? data.result.result.length
          : 0,
    },
    {
      depth: null,
    }
  );

  console.log("=================================\n");

}

async function callRouteStackPost({
  endpointPath,
  payload,
  title,
  timeout,
  errorContext,
  signal,
}) {

  const partnerToken =
    await getToken();

  const endpoint =
    `${config.baseUrl}${endpointPath}`;

  logRouteStackRequest(
    title,
    endpoint,
    payload,
    partnerToken
  );

  const response =
    await axios.post(
      endpoint,
      payload,
      {
        headers:
          createAuthHeaders(partnerToken),

        signal,

        timeout,

        validateStatus:
          () => true,
      }
    );

  logRouteStackResponse(response);

  ensureHttpSuccess(
    response,
    errorContext
  );

  return response.data ?? {};

}

async function searchRouteStackDestinations(
  query,
  { signal } = {}
) {

  return callRouteStackPost({
    endpointPath:
      "/mcp/hotel/search-destinations",

    payload: {
      query,
      type: "HOTEL",
    },

    title:
      "SEARCH DESTINATIONS",

    signal,

    timeout:
      DESTINATION_SEARCH_TIMEOUT_MS,

    errorContext:
      "RouteStack destination search",
  });

}

async function searchRouteStackHotels(
  payload,
  title = "SEARCH HOTELS",
  { signal } = {}
) {

  return callRouteStackPost({
    endpointPath:
      "/mcp/hotel/search-hotels",

    payload,

    title,

    signal,

    timeout:
      HOTEL_SEARCH_TIMEOUT_MS,

    errorContext:
      "RouteStack hotel search",
  });

}

async function getRouteStackHotelDetails({
  hotelId,
  token,
  correlationId,
  signal,
}) {

  return callRouteStackPost({
    endpointPath:
      "/mcp/hotel/get-hotel-details",

    payload: {
      hotelId,
      contentType: "ALL",
      token,
      correlationId,
    },

    title:
      "HOTEL DETAILS",

    signal,

    timeout:
      HOTEL_SEARCH_TIMEOUT_MS,

    errorContext:
      "RouteStack hotel details",
  });

}

module.exports = {
  searchRouteStackDestinations,
  searchRouteStackHotels,
  getRouteStackHotelDetails,
};