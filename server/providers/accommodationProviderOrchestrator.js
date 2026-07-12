const {
  ACCOMMODATION_PROVIDER_IDS,
  getEnabledAccommodationProviders,
  isAccommodationProviderEnabled,
} = require("./providerRegistry");

const {
  mergeProviderHotelResults,
} = require("./common/hotelMergeService");

const {
  searchRouteStackDestinations,
  searchRouteStackHotels,
  getRouteStackHotelDetails,
} = require("./routeStack/routeStackClient");

const {
  isRouteStackSupplierNoResults,
  getRouteStackCurrency,
  mapRouteStackDestinationResponse,
  mapRouteStackHotelResponse,
  createRouteStackFailedSearchResponse,
} = require("./routeStack/routeStackProvider");

const {
  searchGeoapifyDestinations,
} = require("./geocoding/geoapifyGeocodingClient");

const {
  searchLiteApiRates,
  getLiteApiHotels,
} = require("./liteApi/liteApiClient");

const {
  isLiteApiNoResults,
  getLiteApiCurrency,
  mapLiteApiHotelResponse,
  createLiteApiFailedSearchResponse,
} = require("./liteApi/liteApiProvider");

function createNoProviderAvailableResponse(
  currency = "EUR"
) {
  return {
    success: false,
    message: "No accommodation provider is currently available.",
    code: "NO_PROVIDER_AVAILABLE",
    searchId: null,
    status: "Failed",
    searchIncomplete: false,
    nextResultsKey: null,
    currency,
    totalHotels: 0,
    hotels: [],
  };
}

function createAllProvidersFailedResponse({
  currency = "EUR",
  attempts = [],
} = {}) {
  return {
    success: false,
    message:
      "No accommodation provider returned usable hotel results for this search.",
    code: "NO_PROVIDER_RETURNED_RESULTS",
    searchId: null,
    status: "Completed",
    searchIncomplete: false,
    nextResultsKey: null,
    currency,
    totalHotels: 0,
    hotels: [],
    attempts,
  };
}

function isProviderNoResultsResponse(
  failedResponse
) {
  return (
    failedResponse?.code === 204 ||
    failedResponse?.code === "NO_RESULTS"
  );
}

function createAllProvidersNoResultsResponse({
  currency = "EUR",
  attempts = [],
} = {}) {
  return {
    success: false,
    message:
      "No stays were found for this destination, dates and guest configuration.",
    code: 204,
    searchId: null,
    status: "Completed",
    searchIncomplete: false,
    nextResultsKey: null,
    currency,
    totalHotels: 0,
    hotels: [],
    attempts,
  };
}

function createCompletedProviderData({
  providerId,
  currency,
  rawData,
}) {
  return {
    success: true,
    providerId,
    rawProviderData: rawData,
    result: {
      status: "Completed",
      currency,
      hotels: [],
      token: null,
      correlationId: null,
      nextResultsKey: null,
    },
  };
}

function ensureRouteStackEnabled() {
  return isAccommodationProviderEnabled(
    ACCOMMODATION_PROVIDER_IDS.ROUTESTACK
  );
}

function ensureLiteApiEnabled() {
  return isAccommodationProviderEnabled(
    ACCOMMODATION_PROVIDER_IDS.LITE_API
  );
}

function getEnabledHotelSearchProviders() {
  return getEnabledAccommodationProviders()
    .filter((provider) =>
      Boolean(provider.capabilities?.searchHotels)
    );
}

function getStringValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function getNestedValue(source, path) {
  return path.reduce((currentValue, key) => {
    if (
      currentValue === null ||
      currentValue === undefined
    ) {
      return undefined;
    }

    return currentValue[key];
  }, source);
}

function pickFirstValue(source, paths) {
  for (const path of paths) {
    const value =
      getNestedValue(source, path);

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function pickStringValue(source, paths) {
  return getStringValue(
    pickFirstValue(source, paths)
  );
}

function pickNumberValue(source, paths) {
  const value =
    pickFirstValue(source, paths);

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed =
      Number(value.replace(",", "."));

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function logSelectedProvider(
  result,
  options = {}
) {
  console.log("[PROVIDER:selected]", {
    providerId: result.providerId,
    hotels: result.hotels.length,
    currency: result.currency,
    continuation:
      Boolean(options.continuation),
  });
}

function extractCityName(searchData) {
  const rawDestination =
    pickFirstValue(searchData, [
      ["cityName"],
      ["city"],
      ["destinationName"],
      ["location"],
      ["query"],
      ["destination", "cityName"],
      ["destination", "city"],
      ["destination", "name"],
      ["destination", "label"],
      ["destination", "displayName"],
    ]);

  if (
    rawDestination &&
    typeof rawDestination === "object"
  ) {
    return "";
  }

  const destinationText =
    getStringValue(rawDestination);

  if (!destinationText) {
    return "";
  }

  return destinationText
    .split(",")[0]
    .trim();
}

function extractCountryCode(searchData) {
  const countryCode =
    pickStringValue(searchData, [
      ["countryCode"],
      ["country"],
      ["destination", "countryCode"],
      ["destination", "country_code"],
      ["destination", "country"],
    ]);

  if (!countryCode) {
    return "IT";
  }

  if (countryCode.length === 2) {
    return countryCode.toUpperCase();
  }

  return "IT";
}

function extractLatitude(searchData) {
  return pickNumberValue(searchData, [
    ["latitude"],
    ["lat"],
    ["destination", "latitude"],
    ["destination", "lat"],
    ["location", "latitude"],
    ["location", "lat"],
  ]);
}

function extractLongitude(searchData) {
  return pickNumberValue(searchData, [
    ["longitude"],
    ["long"],
    ["lng"],
    ["lon"],
    ["destination", "longitude"],
    ["destination", "long"],
    ["destination", "lng"],
    ["destination", "lon"],
    ["location", "longitude"],
    ["location", "long"],
    ["location", "lng"],
    ["location", "lon"],
  ]);
}

function extractRadius(searchData) {
  const radius =
    pickNumberValue(searchData, [
      ["radius"],
      ["searchRadius"],
      ["destination", "radius"],
    ]);

  if (
    radius === null ||
    radius < 1500
  ) {
    return 8000;
  }

  return Math.round(radius);
}

function extractCheckin(searchData) {
  return pickStringValue(searchData, [
    ["checkin"],
    ["checkIn"],
    ["check_in"],
    ["arrivalDate"],
    ["startDate"],
    ["dates", "checkin"],
    ["dates", "checkIn"],
    ["dates", "startDate"],
  ]);
}

function extractCheckout(searchData) {
  return pickStringValue(searchData, [
    ["checkout"],
    ["checkOut"],
    ["check_out"],
    ["departureDate"],
    ["endDate"],
    ["dates", "checkout"],
    ["dates", "checkOut"],
    ["dates", "endDate"],
  ]);
}

function extractAdults(searchData) {
  const adults =
    pickNumberValue(searchData, [
      ["adults"],
      ["guests", "adults"],
      ["occupancy", "adults"],
      ["rooms", 0, "adults"],
    ]);

  if (
    adults === null ||
    adults <= 0
  ) {
    return 2;
  }

  return Math.max(
    1,
    Math.round(adults)
  );
}

function normalizeChildAges(children) {
  if (!Array.isArray(children)) {
    return [];
  }

  return children
    .map((child) => {
      if (typeof child === "number") {
        return child;
      }

      if (typeof child === "string") {
        const parsed =
          Number(child);

        return Number.isFinite(parsed)
          ? parsed
          : null;
      }

      return null;
    })
    .filter((child) =>
      child !== null &&
      child >= 0
    );
}

function extractChildren(searchData) {
  const children =
    pickFirstValue(searchData, [
      ["children"],
      ["childrenAges"],
      ["guests", "children"],
      ["guests", "childrenAges"],
      ["occupancy", "children"],
      ["rooms", 0, "childrenAges"],
      ["rooms", 0, "childAges"],
    ]);

  return normalizeChildAges(children);
}

function extractLiteApiOccupancies(
  searchData
) {
  const rooms =
    Array.isArray(searchData?.rooms)
      ? searchData.rooms
      : [];

  if (rooms.length === 0) {
    return [
      {
        adults:
          extractAdults(searchData),

        children:
          extractChildren(searchData),
      },
    ];
  }

  return rooms.map((room) => {
    const parsedAdults =
      typeof room?.adults === "number"
        ? room.adults
        : Number(room?.adults);

    const adults =
      Number.isFinite(parsedAdults) &&
      parsedAdults > 0
        ? Math.max(
            1,
            Math.round(parsedAdults)
          )
        : 1;

    const childAges =
      room?.childrenAges ??
      room?.childAges ??
      (
        Array.isArray(room?.children)
          ? room.children
          : []
      );

    return {
      adults,

      children:
        normalizeChildAges(
          childAges
        ),
    };
  });
}

function extractCurrency(
  searchData,
  fallbackCurrency = "EUR"
) {
  return (
    pickStringValue(searchData, [
      ["currency"],
      ["selectedCurrency"],
    ]) ||
    fallbackCurrency ||
    "EUR"
  );
}

function shouldUseRouteStackContinuation(
  searchData
) {
  return Boolean(
    searchData?.nextResultsKey ||
    searchData?.token ||
    searchData?.correlationId
  );
}

function createLiteApiSearchInput({
  searchData,
  fallbackCurrency,
}) {
  const cityName =
    extractCityName(searchData);

  const countryCode =
    extractCountryCode(searchData);

  const latitude =
    extractLatitude(searchData);

  const longitude =
    extractLongitude(searchData);

  const radius =
    extractRadius(searchData);

  const checkin =
    extractCheckin(searchData);

  const checkout =
    extractCheckout(searchData);

  const occupancies =
    extractLiteApiOccupancies(
      searchData
    );

  const currency =
    extractCurrency(
      searchData,
      fallbackCurrency
    );

  const hasCitySearch =
    Boolean(cityName && countryCode);

  const hasGeoSearch =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  if (
    !checkin ||
    !checkout ||
    (!hasCitySearch && !hasGeoSearch)
  ) {
    throw new Error(
      "LiteAPI search requires checkin, checkout and either cityName/countryCode or latitude/longitude."
    );
  }

  return {
    cityName,
    countryCode,
    latitude,
    longitude,
    radius,
    checkin,
    checkout,
    occupancies,
    currency,
  };
}

function hasUsableDestinations(response) {
  return (
    response?.success === true &&
    Array.isArray(response.destinations) &&
    response.destinations.length > 0
  );
}

async function searchDestinationsAcrossProviders(query) {
  let routeStackResponse = null;

  if (ensureRouteStackEnabled()) {
    try {
      const data =
        await searchRouteStackDestinations(query);

      routeStackResponse =
        mapRouteStackDestinationResponse(data);

      if (
        hasUsableDestinations(
          routeStackResponse
        )
      ) {
        console.log(
          "[DESTINATION:selected]",
          {
            providerId:
              ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,

            destinations:
              routeStackResponse.destinations.length,
          }
        );

        return routeStackResponse;
      }

      console.warn(
        "[DESTINATION:routestack] No usable destinations returned."
      );
    } catch (error) {
      console.error(
        "[DESTINATION:routestack] Search failed:",
        error.message
      );
    }
  }

  try {
    const geoapifyResponse =
      await searchGeoapifyDestinations(query);

    console.log(
      "[DESTINATION:selected]",
      {
        providerId:
          "geoapify",

        destinations:
          geoapifyResponse.destinations.length,
      }
    );

    return geoapifyResponse;
  } catch (error) {
    console.error(
      "[DESTINATION:geoapify] Search failed:",
      error.message
    );

    if (routeStackResponse?.success) {
      return routeStackResponse;
    }

    const unavailableError =
      new Error(
        "No destination search provider is currently available."
      );

    unavailableError.status =
      error.status ?? 503;

    throw unavailableError;
  }
}

async function searchHotelsWithLiteApi({
  searchData,
  fallbackCurrency = "EUR",
}) {
  if (!ensureLiteApiEnabled()) {
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.LITE_API,
      data: null,
      currency: fallbackCurrency,
      hotels: [],
      failedResponse:
        createLiteApiFailedSearchResponse(fallbackCurrency),
    };
  }

  const liteApiInput =
    createLiteApiSearchInput({
      searchData,
      fallbackCurrency,
    });

  const response =
    await searchLiteApiRates(liteApiInput);

  const currency =
    getLiteApiCurrency(
      response.data,
      liteApiInput.currency
    );

  if (
    response.noContent ||
    isLiteApiNoResults(response.data)
  ) {
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.LITE_API,
      data: response.data,
      currency,
      hotels: [],
      failedResponse:
        createLiteApiFailedSearchResponse(currency),
    };
  }
  
  const liteApiHotels =
    mapLiteApiHotelResponse(
      response.data,
      currency,
      {
        latitude:
          liteApiInput.latitude,

        longitude:
          liteApiInput.longitude,
      }
    );

  console.log(
    "[PROVIDER:liteapi] Hotels mapped:",
    liteApiHotels.length
  );

  const hotels =
    mergeProviderHotelResults(liteApiHotels);

  console.log(
    "[PROVIDER:liteapi] Hotels after merge:",
    hotels.length
  );

  if (hotels.length === 0) {
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.LITE_API,
      data: response.data,
      currency,
      hotels: [],
      failedResponse:
        createLiteApiFailedSearchResponse(currency),
    };
  }

  return {
    providerId: ACCOMMODATION_PROVIDER_IDS.LITE_API,
    data: createCompletedProviderData({
      providerId: ACCOMMODATION_PROVIDER_IDS.LITE_API,
      currency,
      rawData: response.data,
    }),
    currency,
    hotels,
    failedResponse: null,
  };
}

async function searchHotelsWithRouteStack({
  searchData,
  title,
  fallbackCurrency = "USD",
}) {
  if (!ensureRouteStackEnabled()) {
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
      data: null,
      currency: fallbackCurrency,
      hotels: [],
      failedResponse:
        createRouteStackFailedSearchResponse(fallbackCurrency),
    };
  }

  const data =
    await searchRouteStackHotels(
      searchData,
      title
    );

  const currency =
    getRouteStackCurrency(
      data,
      fallbackCurrency
    );

  if (isRouteStackSupplierNoResults(data)) {
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
      data,
      currency,
      hotels: [],
      failedResponse:
        createRouteStackFailedSearchResponse(currency),
    };
  }

  console.log("[PROVIDER:routestack] Raw response arrays:", {
    resultResult:
      Array.isArray(data?.result?.result)
        ? data.result.result.length
        : null,
    resultHotels:
      Array.isArray(data?.result?.hotels)
        ? data.result.hotels.length
        : null,
    hotels:
      Array.isArray(data?.hotels)
        ? data.hotels.length
        : null,
    data:
      Array.isArray(data?.data)
        ? data.data.length
        : null,
  });

  const routeStackHotels =
    mapRouteStackHotelResponse(
      data,
      currency
    );

  console.log(
    "[PROVIDER:routestack] Hotels mapped:",
    routeStackHotels.length
  );

  const hotels =
    mergeProviderHotelResults(
      routeStackHotels
    );

  console.log(
    "[PROVIDER:routestack] Hotels after merge:",
    hotels.length
  );

  if (hotels.length === 0) {
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
      data,
      currency,
      hotels: [],
      failedResponse:
        createRouteStackFailedSearchResponse(currency),
    };
  }

  return {
    providerId: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
    data,
    currency,
    hotels,
    failedResponse: null,
  };
}

async function tryProviderSearch({
  provider,
  searchData,
  title,
  fallbackCurrency,
}) {
  if (
    provider.id === ACCOMMODATION_PROVIDER_IDS.LITE_API
  ) {
    return searchHotelsWithLiteApi({
      searchData,
      fallbackCurrency,
    });
  }

  if (
    provider.id === ACCOMMODATION_PROVIDER_IDS.ROUTESTACK
  ) {
    return searchHotelsWithRouteStack({
      searchData,
      title,
      fallbackCurrency,
    });
  }

  return {
    providerId: provider.id,
    data: null,
    currency: fallbackCurrency,
    hotels: [],
    failedResponse: {
      ...createNoProviderAvailableResponse(fallbackCurrency),
      message:
        `Accommodation provider is not implemented yet: ${provider.id}`,
      code: "PROVIDER_NOT_IMPLEMENTED",
    },
  };
}

async function searchHotelsWithPrimaryProvider({
  searchData,
  title,
  fallbackCurrency = "EUR",
}) {
  const providers =
    getEnabledHotelSearchProviders();

  if (providers.length === 0) {
    return {
      providerId: null,
      data: null,
      currency: fallbackCurrency,
      hotels: [],
      failedResponse:
        createNoProviderAvailableResponse(fallbackCurrency),
    };
  }

  if (shouldUseRouteStackContinuation(searchData)) {
    const result =
      await searchHotelsWithRouteStack({
        searchData,
        title,
        fallbackCurrency,
      });

    if (
      !result.failedResponse &&
      result.hotels.length > 0
    ) {
      logSelectedProvider(
        result,
        { continuation: true }
      );
    }

    return result;
  }

  const attempts = [];

  for (const provider of providers) {
    try {
      const result =
        await tryProviderSearch({
          provider,
          searchData,
          title,
          fallbackCurrency,
        });

      attempts.push({
        providerId: provider.id,
        success:
          result.hotels.length > 0 &&
          !result.failedResponse,
        totalHotels:
          result.hotels.length,
        failed:
          Boolean(result.failedResponse),
        outcome:
          result.failedResponse
            ? isProviderNoResultsResponse(
                result.failedResponse
              )
              ? "no_results"
              : "error"
            : "success",
        code:
          result.failedResponse?.code ?? null,
        message:
          result.failedResponse?.message ??
          result.failedResponse?.error ??
          null,
      });

      if (
        !result.failedResponse &&
        result.hotels.length > 0
      ) {
        logSelectedProvider(
          result,
          { continuation: false }
        );

        return result;
      }
    } catch (error) {
      console.error(
        `[PROVIDER:${provider.id}] Search failed:`,
        error.message
      );

      attempts.push({
        providerId: provider.id,
        success: false,
        totalHotels: 0,
        failed: true,
        outcome: "error",
        code: error.status ?? null,
        status: error.status ?? null,
        message:
          error.message ??
          "Provider search failed.",
      });
    }
  }

  const allAttemptsReturnedNoResults =
    attempts.length > 0 &&
    attempts.every(
      (attempt) =>
        attempt.outcome === "no_results"
    );

  if (allAttemptsReturnedNoResults) {
    return {
      providerId: null,
      data: null,
      currency: fallbackCurrency,
      hotels: [],
      failedResponse:
        createAllProvidersNoResultsResponse({
          currency: fallbackCurrency,
          attempts,
        }),
    };
  }

  return {
    providerId: null,
    data: null,
    currency: fallbackCurrency,
    hotels: [],
    failedResponse:
      createAllProvidersFailedResponse({
        currency: fallbackCurrency,
        attempts,
      }),
  };
}

async function getHotelDetailsFromProvider({
  sourceProvider,
  hotelId,
  token,
  correlationId,
}) {
  const providerId =
    sourceProvider ??
    ACCOMMODATION_PROVIDER_IDS.LITE_API;

  if (
    providerId === ACCOMMODATION_PROVIDER_IDS.LITE_API
  ) {
    return getLiteApiHotels({
      hotelIds: hotelId,
    });
  }

  if (
    providerId === ACCOMMODATION_PROVIDER_IDS.ROUTESTACK
  ) {
    return getRouteStackHotelDetails({
      hotelId,
      token,
      correlationId,
    });
  }

  throw new Error(
    `Hotel details are not implemented for provider: ${providerId}`
  );
}

module.exports = {
  searchDestinationsAcrossProviders,
  searchHotelsWithPrimaryProvider,
  getHotelDetailsFromProvider,
};