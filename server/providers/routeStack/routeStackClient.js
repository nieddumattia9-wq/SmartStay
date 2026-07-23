const {
  operationalLogger,
} = require(
  "../../observability/operationalLogger"
);

const axios = require("axios");

const config = require("../../config/routeStack");

const {
  getToken,
} = require("../../services/tokenManager");

const HOTEL_SEARCH_TIMEOUT_MS =
  120000;

const DESTINATION_SEARCH_TIMEOUT_MS =
  15000;

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

async function callRouteStackPost({
  endpointPath,
  payload,
  title,
  timeout,
  errorContext,
  signal,
}) {
  const startedAt =
    Date.now();

  operationalLogger.debug(
    "provider.http.started",
    {
      providerId:
        "routestack",

      operation:
        title,

      method:
        "POST",

      endpointPath,
    }
  );

  try {
    const partnerToken =
      await getToken();

    const endpoint =
      `${config.baseUrl}${endpointPath}`;

    const response =
      await axios.post(
        endpoint,
        payload,
        {
          headers:
            createAuthHeaders(
              partnerToken
            ),

          signal,

          timeout,

          validateStatus:
            () =>
              true,
        }
      );

    operationalLogger[
      response.status >=
          200 &&
        response.status <
          400
        ? "info"
        : "warn"
    ](
      "provider.http.completed",
      {
        providerId:
          "routestack",

        operation:
          title,

        method:
          "POST",

        endpointPath,

        status:
          response.status,

        resultCount:
          Array.isArray(
            response.data
              ?.result
              ?.result
          )
            ? response.data
                .result
                .result
                .length
            : Number.isFinite(
                Number(
                  response.data
                    ?.result
                    ?.count
                )
              )
              ? Number(
                  response.data
                    .result
                    .count
                )
              : null,

        durationMs:
          Math.max(
            0,
            Date.now() -
            startedAt
          ),
      }
    );

    ensureHttpSuccess(
      response,
      errorContext
    );

    return (
      response.data ??
      {}
    );
  }
  catch (error) {
    operationalLogger.error(
      "provider.http.failed",
      {
        providerId:
          "routestack",

        operation:
          title,

        method:
          "POST",

        endpointPath,

        status:
          error?.response
            ?.status ??
          error?.status ??
          null,

        code:
          error?.code ??
          null,

        durationMs:
          Math.max(
            0,
            Date.now() -
            startedAt
          ),

        error,
      }
    );

    throw error;
  }
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