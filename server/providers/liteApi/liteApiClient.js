const axios = require("axios");
const crypto = require("crypto");

const {
  LITEAPI_BASE_URL,
  LITEAPI_API_KEY,
  LITEAPI_DEFAULT_CURRENCY,
  LITEAPI_DEFAULT_GUEST_NATIONALITY,
  LITEAPI_TIMEOUT_SECONDS,
  LITEAPI_RESULTS_LIMIT,
  assertLiteApiConfig,
} = require("../../config/liteApi");

const DEFAULT_HTTP_TIMEOUT_MS =
  Math.max(LITEAPI_TIMEOUT_SECONDS, 6) * 1000 + 3000;

function maskValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (value.length <= 8) {
    return "****";
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function buildLiteApiUrl(endpointPath) {
  const cleanBaseUrl =
    LITEAPI_BASE_URL.replace(/\/+$/, "");

  const cleanEndpointPath =
    endpointPath.startsWith("/")
      ? endpointPath
      : `/${endpointPath}`;

  return `${cleanBaseUrl}${cleanEndpointPath}`;
}

function createLiteApiHeaders() {
  assertLiteApiConfig();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Api-Key": LITEAPI_API_KEY,
  };
}

function sanitizePayloadForLog(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  return JSON.parse(
    JSON.stringify(payload)
  );
}

function logLiteApiRequest({
  title,
  method,
  endpointPath,
  payload,
  params,
}) {
  console.log(`\n[LITEAPI] ${title}`);
  console.log("[LITEAPI] Method:", method);
  console.log("[LITEAPI] Endpoint:", endpointPath);
  console.log(
    "[LITEAPI] API Key:",
    maskValue(LITEAPI_API_KEY)
  );

  if (params) {
    console.log(
      "[LITEAPI] Params:",
      sanitizePayloadForLog(params)
    );
  }

  if (payload) {
    console.log(
      "[LITEAPI] Payload:",
      sanitizePayloadForLog(payload)
    );
  }
}

function logLiteApiResponse({
  title,
  status,
  data,
}) {
  console.log(`[LITEAPI] ${title} status:`, status);

  if (status === 204) {
    console.log("[LITEAPI] No content / no availability.");
    return;
  }

  if (data && typeof data === "object") {
    const keys = Object.keys(data);

    console.log(
      "[LITEAPI] Response keys:",
      keys
    );
  }
}

function createLiteApiError({
  endpointPath,
  status,
  data,
  message,
}) {
  const error = new Error(
    message ||
    `LiteAPI request failed with status ${status}`
  );

  error.provider = "liteapi";
  error.endpointPath = endpointPath;
  error.status = status;
  error.data = data;

  return error;
}

function createLiteApiSessionId(prefix = "smartstay") {
  const randomId =
    crypto.randomBytes(8).toString("hex");

  return `${prefix}_${Date.now()}_${randomId}`;
}

async function callLiteApiGet({
  endpointPath,
  params = {},
  title = "GET",
  timeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
  signal,
}) {
  const url =
    buildLiteApiUrl(endpointPath);

  logLiteApiRequest({
    title,
    method: "GET",
    endpointPath,
    params,
  });

  const response = await axios.get(
    url,
    {
      headers: createLiteApiHeaders(),
      params,
      timeout: timeoutMs,
      signal,
      validateStatus: () => true,
    }
  );

  logLiteApiResponse({
    title,
    status: response.status,
    data: response.data,
  });

  if (response.status === 204) {
    return {
      status: 204,
      data: null,
      noContent: true,
    };
  }

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw createLiteApiError({
      endpointPath,
      status: response.status,
      data: response.data,
    });
  }

  return {
    status: response.status,
    data: response.data,
    noContent: false,
  };
}

async function callLiteApiPost({
  endpointPath,
  payload = {},
  title = "POST",
  timeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
  signal,
}) {
  const url =
    buildLiteApiUrl(endpointPath);

  logLiteApiRequest({
    title,
    method: "POST",
    endpointPath,
    payload,
  });

  const response = await axios.post(
    url,
    payload,
    {
      headers: createLiteApiHeaders(),
      timeout: timeoutMs,
      signal,
      validateStatus: () => true,
    }
  );

  logLiteApiResponse({
    title,
    status: response.status,
    data: response.data,
  });

  if (response.status === 204) {
    return {
      status: 204,
      data: null,
      noContent: true,
    };
  }

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw createLiteApiError({
      endpointPath,
      status: response.status,
      data: response.data,
    });
  }

  return {
    status: response.status,
    data: response.data,
    noContent: false,
  };
}

async function getLiteApiHotels(
  params = {},
  {
    signal,
  } = {}
) {
  return callLiteApiGet({
    endpointPath: "/data/hotels",
    params,
    title: "GET HOTEL DATA",
    signal,
  });
}

async function getLiteApiFacilities(
  params = {},
  {
    signal,
  } = {}
) {
  return callLiteApiGet({
    endpointPath:
      "/data/facilities",

    params,

    title:
      "GET HOTEL FACILITIES",

    signal,
  });
}

async function getLiteApiRates(
  payload = {},
  {
    signal,
  } = {}
) {
  return callLiteApiPost({
    endpointPath: "/hotels/rates",
    payload,
    title: "GET HOTEL RATES",
    signal,
  });
}

function normalizeLiteApiChildren(
  children
) {
  if (!Array.isArray(children)) {
    return [];
  }

  return children
    .map((age) => {
      const parsedAge =
        typeof age === "number"
          ? age
          : Number(age);

      if (
        !Number.isFinite(parsedAge) ||
        parsedAge < 0
      ) {
        return null;
      }

      return Math.round(parsedAge);
    })
    .filter((age) => age !== null);
}

function normalizeLiteApiOccupancy(
  occupancy = {}
) {
  const parsedAdults =
    typeof occupancy.adults === "number"
      ? occupancy.adults
      : Number(occupancy.adults);

  const adults =
    Number.isFinite(parsedAdults) &&
    parsedAdults > 0
      ? Math.max(
          1,
          Math.round(parsedAdults)
        )
      : 1;

  return {
    adults,

    children:
      normalizeLiteApiChildren(
        occupancy.children
      ),
  };
}

function createLiteApiOccupancies({
  occupancies = null,
  adults = 2,
  children = [],
} = {}) {
  const normalizedOccupancies =
    Array.isArray(occupancies)
      ? occupancies.map(
          normalizeLiteApiOccupancy
        )
      : [];

  if (normalizedOccupancies.length > 0) {
    return normalizedOccupancies;
  }

  return [
    normalizeLiteApiOccupancy({
      adults,
      children,
    }),
  ];
}

function createLiteApiRatesPayload({
  cityName,
  countryCode = "IT",
  latitude = null,
  longitude = null,
  radius = 8000,
  checkin,
  checkout,
  occupancies = null,
  adults = 2,
  children = [],
  currency = LITEAPI_DEFAULT_CURRENCY,
  guestNationality = LITEAPI_DEFAULT_GUEST_NATIONALITY,
  limit = LITEAPI_RESULTS_LIMIT,
  sessionId = createLiteApiSessionId(),
} = {}) {
  const payload = {
    checkin,
    checkout,
    currency,
    guestNationality,

    occupancies:
      createLiteApiOccupancies({
        occupancies,
        adults,
        children,
      }),

    limit,
    timeout: LITEAPI_TIMEOUT_SECONDS,
    maxRatesPerHotel: 3,
    roomMapping: true,
    includeHotelData: true,
    sessionId,
  };

  if (
    cityName &&
    countryCode
  ) {
    payload.cityName = cityName;
    payload.countryCode = countryCode;

    return payload;
  }

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    payload.latitude = latitude;
    payload.longitude = longitude;

    payload.radius = Math.max(
      Number(radius) || 8000,
      1500
    );

    return payload;
  }

  throw new Error(
    "LiteAPI rates search requires either cityName/countryCode or latitude/longitude/radius."
  );
}

async function searchLiteApiRates({
  cityName,
  countryCode = "IT",
  latitude = null,
  longitude = null,
  radius = 8000,
  checkin,
  checkout,
  occupancies = null,
  adults = 2,
  children = [],
  currency = LITEAPI_DEFAULT_CURRENCY,
  guestNationality = LITEAPI_DEFAULT_GUEST_NATIONALITY,
  limit = LITEAPI_RESULTS_LIMIT,
  sessionId = createLiteApiSessionId(),
  signal,
} = {}) {
  const payload =
    createLiteApiRatesPayload({
      cityName,
      countryCode,
      latitude,
      longitude,
      radius,
      checkin,
      checkout,
      occupancies,
      adults,
      children,
      currency,
      guestNationality,
      limit,
      sessionId,
    });

  return getLiteApiRates(
    payload,
    {
      signal,
    }
  );
}

async function searchLiteApiRatesByCity(
  options = {}
) {
  return searchLiteApiRates(options);
}
module.exports = {
    callLiteApiGet,
    callLiteApiPost,
    getLiteApiHotels,
    getLiteApiFacilities,
    getLiteApiRates,
    createLiteApiSessionId,
    createLiteApiOccupancies,
    createLiteApiRatesPayload,
    createLiteApiCityRatesPayload: createLiteApiRatesPayload,
    searchLiteApiRates,
    searchLiteApiRatesByCity,
  };