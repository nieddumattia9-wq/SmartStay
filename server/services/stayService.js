const axios = require("axios");

const config = require("../config/routeStack");

const { getToken } = require("./tokenManager");

const {
  mapDestinations,
} = require("../mappers/destinationMapper");

const {
  mapHotels,
} = require("../mappers/hotelMapper");

const {
  saveSearchSession,
  getSearchSession,
  updateSearchSession,
  appendHotelsToSearchSession,
} = require("../storage/searchSession");

const HOTEL_SEARCH_TIMEOUT_MS =
  120000;

const DESTINATION_SEARCH_TIMEOUT_MS =
  15000;

const ROUTESTACK_SUPPLIER_NO_RESULTS_CODE =
  204;

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

  const error = new Error(message);

  error.response = {
    status: response.status,
    headers: response.headers,
    data: response.data,
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
    { depth: null }
  );

  console.log("\n----- REQUEST HEADERS -----");
  console.dir(
    {
      Authorization: `Bearer ${maskValue(token, 30)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    { depth: null }
  );

}

function logRouteStackResponse(response) {

  console.log("\n----- HTTP STATUS -----");
  console.log(response.status);

  console.log("\n----- RESPONSE SUMMARY -----");

  const data = response.data ?? {};

  console.dir(
    {
      success: data.success,
      message: data.message,
      code: data.code,
      status: data.result?.status,
      count: data.result?.count,
      currency: data.result?.currency,
      nextResultsKey: data.result?.nextResultsKey,
      token: maskValue(data.result?.token, 18),
      correlationId: maskValue(data.result?.correlationId, 18),
      hotelsReceived: Array.isArray(data.result?.result)
        ? data.result.result.length
        : 0,
    },
    { depth: null }
  );

  console.log("=================================\n");

}

function isCompletedStatus(status) {

  return status === "Completed";

}

function isFailedSupplierResponse(data) {

  return (
    data?.success === false &&
    data?.code === ROUTESTACK_SUPPLIER_NO_RESULTS_CODE
  );

}

function getHotelsFromRouteStackResponse(data, currency) {

  const rawHotels =
    Array.isArray(data.result?.result)
      ? data.result.result
      : [];

  return mapHotels(
    rawHotels,
    {
      currency,
    }
  );

}

function createPublicSearchResponse({
  data,
  searchId = null,
  hotels = [],
  currency = "USD",
}) {

  return {
    success: Boolean(data.success),
    message: data.message ?? null,
    code: data.code ?? null,

    searchId,

    status: data.result?.status ?? null,

    searchIncomplete:
      data.searchIncomplete ?? false,

    nextResultsKey:
      data.result?.nextResultsKey ?? null,

    currency,

    totalHotels:
      hotels.length,

    hotels,
  };

}

async function callRouteStackHotelSearch(
  payload,
  title = "SEARCH HOTELS"
) {

  const partnerToken = await getToken();

  const endpoint =
    `${config.baseUrl}/mcp/hotel/search-hotels`;

  logRouteStackRequest(
    title,
    endpoint,
    payload,
    partnerToken
  );

  const response = await axios.post(
    endpoint,
    payload,
    {
      headers: createAuthHeaders(partnerToken),
      timeout: HOTEL_SEARCH_TIMEOUT_MS,
      validateStatus: () => true,
    }
  );

  logRouteStackResponse(response);

  ensureHttpSuccess(
    response,
    "RouteStack hotel search"
  );

  return response.data ?? {};

}

// =========================
// Search Destinations
// =========================

async function searchDestinations(query) {

  const token = await getToken();

  const endpoint =
    `${config.baseUrl}/mcp/hotel/search-destinations`;

  const payload = {
    query,
    type: "HOTEL",
  };

  logRouteStackRequest(
    "SEARCH DESTINATIONS",
    endpoint,
    payload,
    token
  );

  const response = await axios.post(
    endpoint,
    payload,
    {
      headers: createAuthHeaders(token),
      timeout: DESTINATION_SEARCH_TIMEOUT_MS,
      validateStatus: () => true,
    }
  );

  logRouteStackResponse(response);

  ensureHttpSuccess(
    response,
    "RouteStack destination search"
  );

  const data = response.data ?? {};

  return {
    success: Boolean(data.success),
    message: data.message ?? null,
    code: data.code ?? null,
    destinations: mapDestinations(data.result),
  };

}

// =========================
// Initial Hotel Search
// =========================

async function searchHotels(searchData) {

  const data =
    await callRouteStackHotelSearch(
      searchData,
      "SEARCH HOTELS - INITIAL"
    );

  const currency =
    data.result?.currency ??
    searchData.currency ??
    "USD";

  if (isFailedSupplierResponse(data)) {

    return {
      success: false,
      message:
        "Hotel supplier could not retrieve results for this search.",
      code: data.code ?? null,

      searchId: null,

      status: "Failed",
      searchIncomplete: false,
      nextResultsKey: null,

      currency,
      totalHotels: 0,
      hotels: [],
    };

  }

  const hotels =
    getHotelsFromRouteStackResponse(
      data,
      currency
    );

  let savedSession = null;

  if (
    data.success &&
    data.result?.token &&
    data.result?.correlationId
  ) {

    savedSession = saveSearchSession({
      originalSearchData: searchData,

      status:
        data.result.status ?? "InProgress",

      searchIncomplete:
        data.searchIncomplete ?? true,

      token:
        data.result.token,

      correlationId:
        data.result.correlationId,

      currency,

      nextResultsKey:
        data.result.nextResultsKey ?? null,

      totalHotels:
        hotels.length,

      hotels,

      isContinuing:
        false,

      lastError:
        null,
    });

    console.log(
      "💾 Search session saved:",
      savedSession.searchId
    );

  }

  return createPublicSearchResponse({
    data,
    searchId: savedSession?.searchId ?? null,
    hotels,
    currency,
  });

}
// =========================
// Continue Hotel Search
// =========================

async function continueHotelSearch(searchId) {

    if (!searchId) {
  
      throw new Error(
        "searchId is required to continue hotel search."
      );
  
    }
  
    const session =
      getSearchSession(searchId);
  
    if (!session) {
  
      throw new Error(
        "No active hotel search session."
      );
  
    }
  
    if (session.isContinuing) {
  
      return {
        success: true,
        searchId: session.searchId,
        status: session.status ?? "InProgress",
        searchIncomplete: session.searchIncomplete ?? true,
        isContinuing: true,
        totalHotels: session.hotels?.length ?? 0,
        nextResultsKey: session.nextResultsKey ?? null,
        hotels: session.hotels ?? [],
      };
  
    }
  
    if (isCompletedStatus(session.status)) {
  
      return {
        success: true,
        searchId: session.searchId,
        status: "Completed",
        searchIncomplete: false,
        isContinuing: false,
        totalHotels: session.hotels?.length ?? 0,
        nextResultsKey: null,
        hotels: session.hotels ?? [],
      };
  
    }
  
    if (!session.nextResultsKey) {
  
      const updatedSession =
        updateSearchSession(searchId, {
          status: "Completed",
          searchIncomplete: false,
          isContinuing: false,
          nextResultsKey: null,
        });
  
      return {
        success: true,
        searchId: updatedSession.searchId,
        status: updatedSession.status,
        searchIncomplete: updatedSession.searchIncomplete,
        isContinuing: false,
        totalHotels: updatedSession.hotels?.length ?? 0,
        nextResultsKey: updatedSession.nextResultsKey,
        hotels: updatedSession.hotels ?? [],
      };
  
    }
  
    updateSearchSession(searchId, {
      isContinuing: true,
      lastError: null,
    });
  
    try {
  
      const payload = {
        ...session.originalSearchData,
  
        nextResultsKey:
          session.nextResultsKey,
  
        token:
          session.token,
  
        correlationId:
          session.correlationId,
      };
  
      const data =
        await callRouteStackHotelSearch(
          payload,
          "SEARCH HOTELS - CONTINUE"
        );
  
      const currency =
        data.result?.currency ??
        session.currency ??
        session.originalSearchData?.currency ??
        "USD";
  
      if (isFailedSupplierResponse(data)) {
  
        const failedSession =
          updateSearchSession(searchId, {
            status: "Failed",
            searchIncomplete: false,
            isContinuing: false,
            lastError:
              "Hotel supplier could not retrieve more results for this search.",
          });
  
        return {
          success: false,
          message:
            "Hotel supplier could not retrieve more results for this search.",
          code: data.code ?? null,
  
          searchId,
          status: failedSession.status,
          searchIncomplete: false,
          isContinuing: false,
          totalHotels: failedSession.hotels?.length ?? 0,
          nextResultsKey: null,
          hotels: failedSession.hotels ?? [],
        };
  
      }
  
      const newHotels =
        getHotelsFromRouteStackResponse(
          data,
          currency
        );
  
      const sessionWithHotels =
        appendHotelsToSearchSession(
          searchId,
          newHotels
        );
  
      const updatedSession =
        updateSearchSession(searchId, {
          status:
            data.result?.status ??
            sessionWithHotels?.status ??
            "InProgress",
  
          searchIncomplete:
            data.searchIncomplete ??
            !isCompletedStatus(data.result?.status),
  
          token:
            data.result?.token ??
            session.token,
  
          correlationId:
            data.result?.correlationId ??
            session.correlationId,
  
          currency,
  
          nextResultsKey:
            data.result?.nextResultsKey ?? null,
  
          isContinuing:
            false,
  
          lastError:
            null,
        });
  
      return {
        success: Boolean(data.success),
        message: data.message ?? null,
        code: data.code ?? null,
  
        searchId: updatedSession.searchId,
  
        status: updatedSession.status,
  
        searchIncomplete:
          updatedSession.searchIncomplete,
  
        isContinuing:
          updatedSession.isContinuing,
  
        totalHotels:
          updatedSession.hotels?.length ?? 0,
  
        nextResultsKey:
          updatedSession.nextResultsKey,
  
        hotels:
          updatedSession.hotels ?? [],
      };
  
    } catch (error) {
  
      updateSearchSession(searchId, {
        isContinuing: false,
        lastError: error.message,
      });
  
      throw error;
  
    }
  
  }
  
  // =========================
  // Hotel Details
  // =========================
  
  async function getHotelDetails(
    hotelId,
    searchId = null
  ) {
  
    if (!hotelId) {
  
      throw new Error(
        "hotelId is required to retrieve hotel details."
      );
  
    }
  
    const partnerToken = await getToken();
  
    const session =
      getSearchSession(searchId);
  
    if (!session) {
  
      throw new Error(
        "No active hotel search session."
      );
  
    }
  
    const endpoint =
      `${config.baseUrl}/mcp/hotel/get-hotel-details`;
  
    const payload = {
      hotelId,
      contentType: "ALL",
      token: session.token,
      correlationId: session.correlationId,
    };
  
    logRouteStackRequest(
      "HOTEL DETAILS",
      endpoint,
      payload,
      partnerToken
    );
  
    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: createAuthHeaders(partnerToken),
        timeout: HOTEL_SEARCH_TIMEOUT_MS,
        validateStatus: () => true,
      }
    );
  
    logRouteStackResponse(response);
  
    ensureHttpSuccess(
      response,
      "RouteStack hotel details"
    );
  
    return response.data;
  
  }
  
  // =========================
  // Search Status
  // =========================
  
  async function getSearchStatus(searchId = null) {
  
    const session =
      getSearchSession(searchId);
  
    if (!session) {
  
      return {
        success: false,
        message: "No active search session.",
      };
  
    }
  
    return {
      success: true,
  
      searchId:
        session.searchId,
  
      status:
        session.status ?? "InProgress",
  
      searchIncomplete:
        session.searchIncomplete ?? true,
  
      isContinuing:
        session.isContinuing ?? false,
  
      totalHotels:
        session.hotels?.length ?? 0,
  
      nextResultsKey:
        session.nextResultsKey ?? null,
  
      lastError:
        session.lastError ?? null,
  
      updatedAt:
        session.updatedAt ?? null,
    };
  
  }
  
  module.exports = {
    searchDestinations,
    searchHotels,
    continueHotelSearch,
    getHotelDetails,
    getSearchStatus,
  };