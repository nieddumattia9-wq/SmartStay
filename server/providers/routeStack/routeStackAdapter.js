const {
  ACCOMMODATION_PROVIDER_IDS,
} = require("../providerRegistry");

const {
  mergeProviderHotelResults,
} = require("../common/hotelMergeService");

const {
  createProviderSuccessResult,
  createProviderNoResultsResult,
} = require("../common/providerSearchResult");

const PROVIDER_ID =
  ACCOMMODATION_PROVIDER_IDS.ROUTESTACK;

function getStringValue(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getFiniteNumber(value) {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function createRouteStackAdapterError({
  message,
  code,
  status = 502,
} = {}) {
  const error =
    new Error(
      message ??
      "RouteStack adapter operation failed."
    );

  error.code =
    code ??
    "ROUTESTACK_ADAPTER_ERROR";

  error.status =
    Number.isFinite(status)
      ? status
      : 502;

  return error;
}

function normalizeRouteStackCursor(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value === "string") {
    const normalizedValue =
      value.trim();

    return normalizedValue ||
      null;
  }

  return value;
}

function normalizePrivateContextValue(value) {
  const normalizedValue =
    getStringValue(value);

  return normalizedValue ||
    null;
}

function normalizeRouteStackDestination(
  destination
) {
  if (
    !destination ||
    typeof destination !== "object" ||
    Array.isArray(destination)
  ) {
    return null;
  }

  const id =
    getStringValue(
      destination.id ??
      destination.destinationId
    );

  if (!id) {
    return null;
  }

  return {
    id,

    type:
      getStringValue(
        destination.type ??
        destination.destinationType
      ) || "City",

    name:
      getStringValue(
        destination.name
      ) || null,

    city:
      getStringValue(
        destination.city
      ) || null,

    country:
      getStringValue(
        destination.country
      ) || null,

    lat:
      getFiniteNumber(
        destination.lat
      ),

    lng:
      getFiniteNumber(
        destination.lng
      ),
  };
}

function createRouteStackRooms(
  rooms
) {
  const normalizedRooms =
    Array.isArray(rooms)
      ? rooms
      : [];

  return normalizedRooms.map(
    (room) => {
      const childAges =
        Array.isArray(
          room?.childAges
        )
          ? room.childAges
          : [];

      return {
        childAges,

        children:
          childAges.length,

        adults:
          Number.isFinite(
            room?.adults
          )
            ? room.adults
            : 1,
      };
    }
  );
}

function createRouteStackSearchPayload({
  request,
  destination,
  continuationCursor = null,
  providerContext = null,
} = {}) {
  const requestDestination =
    request?.destination ?? {};

  const stay =
    request?.stay ?? {};

  const normalizedDestination =
    normalizeRouteStackDestination(
      destination
    );

  if (!normalizedDestination) {
    throw createRouteStackAdapterError({
      message:
        "A valid RouteStack destination is required.",

      code:
        "ROUTESTACK_DESTINATION_CONTEXT_REQUIRED",

      status:
        400,
    });
  }

  const latitude =
    getFiniteNumber(
      requestDestination.latitude
    );

  const longitude =
    getFiniteNumber(
      requestDestination.longitude
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    throw createRouteStackAdapterError({
      message:
        "RouteStack requires valid destination coordinates.",

      code:
        "ROUTESTACK_COORDINATES_REQUIRED",

      status:
        400,
    });
  }

  const payload = {
    long:
      longitude,

    lat:
      latitude,

    rooms:
      createRouteStackRooms(
        request?.rooms
      ),

    checkOut:
      stay.checkout,

    checkIn:
      stay.checkin,

    destinationId:
      normalizedDestination.id,

    currency:
      request?.currency ?? "EUR",

    destinationType:
      normalizedDestination.type,
  };

  const normalizedCursor =
    normalizeRouteStackCursor(
      continuationCursor
    );

  if (normalizedCursor !== null) {
    const token =
      normalizePrivateContextValue(
        providerContext?.token
      );

    const correlationId =
      normalizePrivateContextValue(
        providerContext?.correlationId
      );

    if (
      !token ||
      !correlationId
    ) {
      throw createRouteStackAdapterError({
        message:
          "RouteStack continuation requires private token and correlationId context.",

        code:
          "ROUTESTACK_CONTINUATION_CONTEXT_REQUIRED",

        status:
          409,
      });
    }

    payload.nextResultsKey =
      normalizedCursor;

    payload.token =
      token;

    payload.correlationId =
      correlationId;
  }

  return payload;
}

function getRouteStackResultContainer(
  rawData
) {
  return (
    rawData?.result &&
    typeof rawData.result === "object" &&
    !Array.isArray(rawData.result)
  )
    ? rawData.result
    : {};
}

function getRouteStackContinuationCursor(
  rawData
) {
  return normalizeRouteStackCursor(
    getRouteStackResultContainer(
      rawData
    ).nextResultsKey
  );
}

function createRouteStackProviderContext({
  rawData,
  previousContext = null,
  destination,
} = {}) {
  const result =
    getRouteStackResultContainer(
      rawData
    );

  const normalizedDestination =
    normalizeRouteStackDestination(
      destination ??
      previousContext?.destination
    );

  return {
    token:
      normalizePrivateContextValue(
        result.token
      ) ??
      normalizePrivateContextValue(
        previousContext?.token
      ),

    correlationId:
      normalizePrivateContextValue(
        result.correlationId
      ) ??
      normalizePrivateContextValue(
        previousContext?.correlationId
      ),

    destination:
      normalizedDestination,
  };
}

function ensureContinuationContext({
  continuation,
  providerContext,
} = {}) {
  if (!continuation) {
    return;
  }

  if (
    !providerContext?.token ||
    !providerContext?.correlationId
  ) {
    throw createRouteStackAdapterError({
      message:
        "RouteStack returned a continuation without the private context required to use it.",

      code:
        "ROUTESTACK_CONTINUATION_CONTEXT_MISSING",
    });
  }
}

function createRouteStackSearchResult({
  rawData,
  request,
  destination,
  previousContext,
  dependencies,
} = {}) {
  const {
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackHotelResponse,
    mergeHotels,
  } = dependencies;

  const currency =
    getRouteStackCurrency(
      rawData,
      request?.currency ?? "EUR"
    );

  if (
    isRouteStackSupplierNoResults(
      rawData
    )
  ) {
    return createProviderNoResultsResult({
      providerId:
        PROVIDER_ID,

      currency,

      rawData,

      message:
        "RouteStack returned no additional hotel availability.",
    });
  }

  if (rawData?.success === false) {
    throw createRouteStackAdapterError({
      message:
        rawData?.message ??
        "RouteStack hotel search failed.",

      code:
        "ROUTESTACK_SEARCH_FAILED",
    });
  }

  const mappedHotels =
    mapRouteStackHotelResponse(
      rawData,
      currency
    );

  const hotels =
    mergeHotels(
      mappedHotels
    );

  const continuationCursor =
    getRouteStackContinuationCursor(
      rawData
    );

  const continuation =
    continuationCursor !== null
      ? {
          providerId:
            PROVIDER_ID,

          cursor:
            continuationCursor,
        }
      : null;

  const providerContext =
    createRouteStackProviderContext({
      rawData,
      previousContext,
      destination,
    });

  ensureContinuationContext({
    continuation,
    providerContext,
  });

  if (
    hotels.length === 0 &&
    !continuation
  ) {
    return createProviderNoResultsResult({
      providerId:
        PROVIDER_ID,

      currency,

      rawData,

      message:
        "RouteStack returned no usable hotels for this search.",
    });
  }

  return createProviderSuccessResult({
    providerId:
      PROVIDER_ID,

    currency,

    hotels,

    rawData,

    continuation,

    providerContext,
  });
}

function loadDefaultDependencies() {
  const {
    searchRouteStackDestinations,
    searchRouteStackHotels,
  } = require("./routeStackClient");

  const {
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackDestinationResponse,
    mapRouteStackHotelResponse,
  } = require("./routeStackProvider");

  const {
    createRouteStackDestinationResolver,
  } = require(
    "./routeStackDestinationResolver"
  );

  const resolveRouteStackDestination =
    createRouteStackDestinationResolver({
      searchRouteStackDestinations,
      mapRouteStackDestinationResponse,
    });

  return {
    resolveRouteStackDestination,
    searchRouteStackHotels,
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackHotelResponse,

    mergeHotels:
      mergeProviderHotelResults,
  };
}

function createRouteStackAdapter(
  dependencies
) {
  const resolvedDependencies =
    dependencies ??
    loadDefaultDependencies();

  const {
    resolveRouteStackDestination,
    searchRouteStackHotels,
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackHotelResponse,
    mergeHotels,
  } = resolvedDependencies;

  const requiredFunctions = {
    resolveRouteStackDestination,
    searchRouteStackHotels,
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackHotelResponse,
    mergeHotels,
  };

  for (
    const [
      dependencyName,
      dependencyValue,
    ] of Object.entries(
      requiredFunctions
    )
  ) {
    if (
      typeof dependencyValue !==
        "function"
    ) {
      throw new Error(
        `RouteStack adapter dependency "${dependencyName}" must be a function.`
      );
    }
  }

  const resultDependencies = {
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackHotelResponse,
    mergeHotels,
  };

  return {
    providerId:
      PROVIDER_ID,

    async searchHotels({
      request,
      context,
      signal,
    } = {}) {
      if (request?.continuation) {
        throw createRouteStackAdapterError({
          message:
            "Initial RouteStack search cannot contain a continuation cursor.",

          code:
            "ROUTESTACK_INITIAL_SEARCH_HAS_CONTINUATION",

          status:
            400,
        });
      }

      const resolution =
        await resolveRouteStackDestination({
          request,
          signal,
        });

      const destination =
        normalizeRouteStackDestination(
          resolution?.destination
        );

      if (!destination) {
        return createProviderNoResultsResult({
          providerId:
            PROVIDER_ID,

          currency:
            request?.currency ?? "EUR",

          rawData:
            resolution?.rawData ?? null,

          message:
            "RouteStack could not resolve a matching destination.",
        });
      }

      const payload =
        createRouteStackSearchPayload({
          request,
          destination,
        });

      const rawData =
        await searchRouteStackHotels(
          payload,
          context?.title ??
            "SEARCH HOTELS - ROUTESTACK",
          {
            signal,
          }
        );

      return createRouteStackSearchResult({
        rawData,
        request,
        destination,
        previousContext:
          null,

        dependencies:
          resultDependencies,
      });
    },

    async continueHotelSearch({
      request,
      context,
      signal,
    } = {}) {
      const continuation =
        request?.continuation;

      const continuationCursor =
        normalizeRouteStackCursor(
          continuation?.cursor
        );

      if (
        continuation?.providerId !==
          PROVIDER_ID ||
        continuationCursor === null
      ) {
        throw createRouteStackAdapterError({
          message:
            "A valid RouteStack continuation is required.",

          code:
            "ROUTESTACK_CONTINUATION_REQUIRED",

          status:
            400,
        });
      }

      const previousContext =
        request?.providerContext;

      const destination =
        normalizeRouteStackDestination(
          previousContext?.destination
        );

      const payload =
        createRouteStackSearchPayload({
          request,
          destination,
          continuationCursor,
          providerContext:
            previousContext,
        });

      const rawData =
        await searchRouteStackHotels(
          payload,
          context?.title ??
            "SEARCH HOTELS - ROUTESTACK CONTINUE",
          {
            signal,
          }
        );

      return createRouteStackSearchResult({
        rawData,
        request,
        destination,
        previousContext,

        dependencies:
          resultDependencies,
      });
    },
  };
}

async function loadRouteStackAdapter() {
  return createRouteStackAdapter();
}

module.exports = {
  PROVIDER_ID,
  createRouteStackRooms,
  createRouteStackSearchPayload,
  createRouteStackProviderContext,
  createRouteStackSearchResult,
  createRouteStackAdapter,
  loadRouteStackAdapter,
};
