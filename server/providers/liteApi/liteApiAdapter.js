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
  ACCOMMODATION_PROVIDER_IDS.LITE_API;

function createLiteApiSearchInput(
  request
) {
  const destination =
    request?.destination ?? {};

  const stay =
    request?.stay ?? {};

  const rooms =
    Array.isArray(request?.rooms)
      ? request.rooms
      : [];

  return {
    cityName:
      destination.cityName || null,

    countryCode:
      destination.countryCode || "IT",

    latitude:
      Number.isFinite(
        destination.latitude
      )
        ? destination.latitude
        : null,

    longitude:
      Number.isFinite(
        destination.longitude
      )
        ? destination.longitude
        : null,

    radius:
      Number.isFinite(
        destination.radiusMeters
      )
        ? destination.radiusMeters
        : 8000,

    checkin:
      stay.checkin,

    checkout:
      stay.checkout,

    occupancies:
      rooms.map((room) => ({
        adults:
          room.adults,

        children:
          Array.isArray(
            room.childAges
          )
            ? room.childAges
            : [],
      })),

    currency:
      request?.currency ?? "EUR",
  };
}

const LITEAPI_HOTEL_METADATA_BATCH_SIZE =
  40;

function normalizeLiteApiMetadataHotelId(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  if (!normalized) {
    return null;
  }

  return normalized.startsWith(
    "liteapi:"
  )
    ? normalized.slice(
        "liteapi:".length
      )
    : normalized;
}

function collectLiteApiMetadataHotelIds(
  hotels
) {
  const hotelIds =
    new Set();

  for (
    const hotel
    of Array.isArray(hotels)
      ? hotels
      : []
  ) {
    if (
      hotel?.providerHotelTypeId !==
        null &&
      hotel?.providerHotelTypeId !==
        undefined
    ) {
      continue;
    }

    const candidates = [
      hotel?.sourceHotelId,
      hotel?.providerHotelId,
      hotel?.hotelId,
      hotel?.id,
    ];

    for (
      const candidate
      of candidates
    ) {
      const hotelId =
        normalizeLiteApiMetadataHotelId(
          candidate
        );

      if (!hotelId) {
        continue;
      }

      hotelIds.add(
        hotelId
      );

      break;
    }
  }

  return [
    ...hotelIds,
  ];
}

function extractLiteApiHotelMetadataRecords(
  data
) {
  const candidates = [
    data?.data,
    data?.hotels,
    data?.items,
    data?.results,
    data?.result?.data,
    data?.result?.hotels,
    data?.data?.hotels,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return [];
}

const {
  enrichLiteApiHotelMetadataFacilities,
} = require("./liteApiFacilityMapper");

function isLiteApiMetadataAbort(
  error,
  signal
) {
  return (
    signal?.aborted ===
      true ||
    error?.name ===
      "AbortError" ||
    error?.code ===
      "ABORT_ERR" ||
    error?.code ===
      "ERR_CANCELED"
  );
}

async function loadLiteApiHotelMetadata({
  hotelIds,
  getLiteApiHotels,
  signal,
}) {
  if (
    !Array.isArray(
      hotelIds
    ) ||
    hotelIds.length === 0
  ) {
    return null;
  }

  const hotelData = [];

  for (
    let index = 0;
    index < hotelIds.length;
    index +=
      LITEAPI_HOTEL_METADATA_BATCH_SIZE
  ) {
    const batch =
      hotelIds.slice(
        index,
        index +
          LITEAPI_HOTEL_METADATA_BATCH_SIZE
      );

    const response =
      await getLiteApiHotels(
        {
          hotelIds:
            batch.join(
              ","
            ),

          limit:
            batch.length,

          language:
            "en",
        },
        {
          signal,
        }
      );

    if (
      response?.noContent
    ) {
      continue;
    }

    hotelData.push(
      ...extractLiteApiHotelMetadataRecords(
        response?.data ?? null
      )
    );
  }

  return hotelData.length > 0
    ? {
        hotelData,
      }
    : null;
}

async function tryLoadLiteApiHotelMetadata(
  options
) {
  let hotelMetadata =
    null;

  try {
    hotelMetadata =
      await loadLiteApiHotelMetadata(
        options
      );
  }
  catch (error) {
    if (
      isLiteApiMetadataAbort(
        error,
        options?.signal
      )
    ) {
      throw error;
    }

    console.warn(
      "[PROVIDER:liteapi] Static hotel metadata enrichment skipped:",
      error?.message ??
        error
    );

    return null;
  }

  if (
    !hotelMetadata ||
    typeof options
      ?.getLiteApiFacilities !==
      "function"
  ) {
    return hotelMetadata;
  }

  try {
    const response =
      await options
        .getLiteApiFacilities(
          {
            language:
              "en",
          },
          {
            signal:
              options.signal,
          }
        );

    if (
      response?.noContent
    ) {
      return hotelMetadata;
    }

    return enrichLiteApiHotelMetadataFacilities(
      hotelMetadata,
      response?.data ??
        null
    );
  }
  catch (error) {
    if (
      isLiteApiMetadataAbort(
        error,
        options?.signal
      )
    ) {
      throw error;
    }

    console.warn(
      "[PROVIDER:liteapi] Facility dictionary enrichment skipped:",
      error?.message ??
        error
    );

    return hotelMetadata;
  }
}

function loadDefaultDependencies() {
  const {
    searchLiteApiRates,
    getLiteApiHotels,
    getLiteApiFacilities,
  } = require("./liteApiClient");

  const {
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
  } = require("./liteApiProvider");

  const {
    mapLiteApiHotelDetailsResponse,
  } = require("./liteApiHotelDetailsMapper");

  return {
    searchLiteApiRates,
    getLiteApiHotels,
    getLiteApiFacilities,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
    mapLiteApiHotelDetailsResponse,
    mergeProviderHotelResults,
  };
}

function createLiteApiAdapter(
  dependencies
) {
  const resolvedDependencies =
    dependencies ??
    loadDefaultDependencies();

  const {
    searchLiteApiRates,
    getLiteApiHotels,
    getLiteApiFacilities,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
    mapLiteApiHotelDetailsResponse,
    mergeProviderHotelResults:
      mergeHotels,
  } = resolvedDependencies;

  const requiredFunctions = {
    searchLiteApiRates,
    getLiteApiHotels,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
    mapLiteApiHotelDetailsResponse,
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
        `LiteAPI adapter dependency "${dependencyName}" must be a function.`
      );
    }
  }

  return {
    providerId:
      PROVIDER_ID,

    async searchHotels({
      request,
      signal,
    } = {}) {
      const providerInput =
        createLiteApiSearchInput(
          request
        );

      const response =
        await searchLiteApiRates({
          ...providerInput,
          signal,
        });

      const rawData =
        response?.data ?? null;

      const currency =
        getLiteApiCurrency(
          rawData,
          providerInput.currency
        );

      if (
        response?.noContent ||
        isLiteApiNoResults(
          rawData
        )
      ) {
        return createProviderNoResultsResult({
          providerId:
            PROVIDER_ID,

          currency,

          rawData,

          message:
            "LiteAPI returned no hotel availability for this search.",
        });
      }

      const searchLocation = {
        latitude:
          providerInput.latitude,

        longitude:
          providerInput.longitude,
      };

      const preliminaryMappedHotels =
        mapLiteApiHotelResponse(
          rawData,
          currency,
          searchLocation
        );

      const providerHotelIds =
        collectLiteApiMetadataHotelIds(
          preliminaryMappedHotels
        );

      const hotelMetadata =
        await tryLoadLiteApiHotelMetadata({
          hotelIds:
            providerHotelIds,

          getLiteApiHotels,

          getLiteApiFacilities,

          signal,
        });

      const mappedHotels =
        hotelMetadata
          ? mapLiteApiHotelResponse(
              rawData,
              currency,
              searchLocation,
              hotelMetadata
            )
          : preliminaryMappedHotels;

      const hotels =
        mergeHotels(
          mappedHotels
        );

      console.log(
        "[PROVIDER:liteapi] Hotels mapped:",
        mappedHotels.length
      );

      console.log(
        "[PROVIDER:liteapi] Hotels after merge:",
        hotels.length
      );

      if (hotels.length === 0) {
        return createProviderNoResultsResult({
          providerId:
            PROVIDER_ID,

          currency,

          rawData,

          message:
            "LiteAPI returned no usable hotels for this search.",
        });
      }

      return createProviderSuccessResult({
        providerId:
          PROVIDER_ID,

        currency,

        hotels,

        rawData,
      });
    },

    async getHotelDetails({
      hotelId,
      signal,
    } = {}) {
      if (
        hotelId === null ||
        hotelId === undefined ||
        String(hotelId).trim() === ""
      ) {
        const error =
          new Error(
            "A hotelId is required."
          );

        error.code =
          "INVALID_HOTEL_ID";

        throw error;
      }

      const normalizedHotelId =
        String(
          hotelId
        ).trim();

      const response =
        await getLiteApiHotels(
          {
            hotelIds:
              normalizedHotelId,
          },
          {
            signal,
          }
        );

      if (
        response?.noContent
      ) {

        return null;

      }

      return mapLiteApiHotelDetailsResponse(
        response?.data ?? null,
        normalizedHotelId
      );
    },
  };
}

async function loadLiteApiAdapter() {
  return createLiteApiAdapter();
}

module.exports = {
  PROVIDER_ID,
  createLiteApiSearchInput,
  createLiteApiAdapter,
  loadLiteApiAdapter,
};
