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

function loadDefaultDependencies() {
  const {
    searchLiteApiRates,
    getLiteApiHotels,
  } = require("./liteApiClient");

  const {
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
  } = require("./liteApiProvider");

  return {
    searchLiteApiRates,
    getLiteApiHotels,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
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
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
    mergeProviderHotelResults:
      mergeHotels,
  } = resolvedDependencies;

  const requiredFunctions = {
    searchLiteApiRates,
    getLiteApiHotels,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
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
    } = {}) {
      const providerInput =
        createLiteApiSearchInput(
          request
        );

      const response =
        await searchLiteApiRates(
          providerInput
        );

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

      const mappedHotels =
        mapLiteApiHotelResponse(
          rawData,
          currency,
          {
            latitude:
              providerInput.latitude,

            longitude:
              providerInput.longitude,
          }
        );

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

      return getLiteApiHotels({
        hotelIds:
          hotelId,
      });
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
