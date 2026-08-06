const {
  operationalLogger,
} = require(
  "../../observability/operationalLogger"
);

const crypto =
  require("crypto");

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

const {
  createProviderOfferRecheckConfirmed,
  createProviderOfferRecheckSoldOut,
} = require(
  "../common/providerOfferRecheckResult"
);

const {
  createProviderExternalBookingHandoff,
} = require(
  "../common/providerBookingHandoffResult"
);

const PROVIDER_ID =
  ACCOMMODATION_PROVIDER_IDS.LITE_API;

const {
  LITEAPI_PRICING_STATES,
  isLiteApiPriceMaterialized,
} = require(
  "./liteApiCommercialPricing"
);

function createAdapterSessionId() {
  return (
    "smartstay_" +
    Date.now() +
    "_" +
    crypto
      .randomBytes(8)
      .toString("hex")
  );
}

function getPricingPolicy(
  offer
) {
  const policy =
    offer?.commercialPricing
      ?.policy;

  return policy &&
    typeof policy === "object" &&
    !Array.isArray(policy)
      ? policy
      : null;
}

function getRequiredCommissionPercent(
  offer
) {
  const value =
    Number(
      offer?.commercialPricing
        ?.requiredSellerCommissionPercent
    );

  return (
    Number.isFinite(value) &&
    value > 0
  )
    ? value
    : null;
}

function getSelectionFingerprint(
  offer
) {
  const fingerprint =
    typeof offer
      ?.providerOfferContext
      ?.selectionFingerprint ===
      "string"
      ? offer
          .providerOfferContext
          .selectionFingerprint
          .trim()
      : "";

  return fingerprint || null;
}

function createLiteApiPricingError({
  code,
  message,
  status = 409,
} = {}) {
  const error =
    new Error(message);

  error.code =
    code;

  error.status =
    status;

  return error;
}

function createLiteApiMaterializationInput({
  hotelId,
  stayContext,
  providerContext,
  offer,
} = {}) {
  const normalizedHotelId =
    typeof hotelId === "string"
      ? hotelId.trim()
      : String(
          hotelId ?? ""
        ).trim();

  const checkin =
    typeof stayContext?.checkin ===
      "string"
      ? stayContext.checkin.trim()
      : "";

  const checkout =
    typeof stayContext?.checkout ===
      "string"
      ? stayContext.checkout.trim()
      : "";

  const sessionId =
    typeof providerContext?.sessionId ===
      "string"
      ? providerContext.sessionId.trim()
      : "";

  const occupancies =
    Array.isArray(
      stayContext?.rooms
    )
      ? stayContext.rooms.map(
          (room) => ({
            adults:
              room?.adults,
            children:
              Array.isArray(
                room?.childAges
              )
                ? room.childAges
                : [],
          })
        )
      : [];

  const margin =
    getRequiredCommissionPercent(
      offer
    );

  if (
    !normalizedHotelId ||
    !checkin ||
    !checkout ||
    occupancies.length === 0
  ) {
    throw createLiteApiPricingError({
      code:
        "PROVIDER_PRICING_CONTEXT_REQUIRED",
      message:
        "The selected offer cannot be priced safely without its stay context.",
    });
  }

  if (!sessionId) {
    throw createLiteApiPricingError({
      code:
        "PROVIDER_PRICING_SESSION_REQUIRED",
      message:
        "The selected offer cannot be priced safely without its provider session.",
    });
  }

  if (margin === null) {
    throw createLiteApiPricingError({
      code:
        "PROVIDER_PRICING_MARGIN_REQUIRED",
      message:
        "The provider-specific commission required for this offer is unavailable.",
    });
  }

  if (!getSelectionFingerprint(offer)) {
    throw createLiteApiPricingError({
      code:
        "PROVIDER_PRICING_SELECTION_REQUIRED",
      message:
        "The selected room and rate conditions cannot be matched safely.",
    });
  }

  return {
    hotelIds:
      [normalizedHotelId],
    checkin,
    checkout,
    occupancies,
    currency:
      stayContext?.currency ??
      offer?.currency ??
      "EUR",
    sessionId,
    margin,
  };
}

function selectMaterializedLiteApiOffer({
  hotels,
  originalOffer,
} = {}) {
  const expectedFingerprint =
    getSelectionFingerprint(
      originalOffer
    );

  const matchingOffers =
    (
      Array.isArray(hotels)
        ? hotels
        : []
    )
      .flatMap((hotel) =>
        Array.isArray(hotel?.offers)
          ? hotel.offers
          : []
      )
      .filter(
        (candidate) =>
          getSelectionFingerprint(
            candidate
          ) ===
          expectedFingerprint
      );

  if (matchingOffers.length !== 1) {
    throw createLiteApiPricingError({
      code:
        "PROVIDER_PRICING_SELECTION_MISMATCH",
      message:
        "The provider did not return exactly the selected room and booking conditions.",
    });
  }

  const selectedOffer =
    matchingOffers[0];

  if (
    !isLiteApiPriceMaterialized({
      offer:
        selectedOffer,
      minimumTargetSellingPrice:
        originalOffer
          ?.commercialPricing
          ?.targetSellingPrice,
    })
  ) {
    throw createLiteApiPricingError({
      code:
        "PROVIDER_PRICE_FLOOR_NOT_MATERIALIZED",
      message:
        "The provider did not materialize a bookable price at or above the public selling target.",
    });
  }

  return selectedOffer;
}

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

    commercialPricingPolicy:
      request
        ?.commercialPricingPolicy ??
      null,
  };
}

const LITEAPI_HOTEL_METADATA_BATCH_SIZE =
  40;

const MAX_LITEAPI_HOTELS_PER_SEARCH =
  80;

function limitLiteApiHotels(
  hotels
) {
  return Array.isArray(hotels)
    ? hotels.slice(
        0,
        MAX_LITEAPI_HOTELS_PER_SEARCH
      )
    : [];
}

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

    operationalLogger.warn(
      "provider.enrichment.skipped",
      {
        providerId:
          PROVIDER_ID,

        enrichment:
          "hotel-metadata",

        error,
      }
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

    operationalLogger.warn(
      "provider.enrichment.skipped",
      {
        providerId:
          PROVIDER_ID,

        enrichment:
          "facility-dictionary",

        error,
      }
    );

    return hotelMetadata;
  }
}

function loadDefaultDependencies() {
  const {
    searchLiteApiRates,
    createLiteApiSessionId,
    getLiteApiHotels,
    getLiteApiFacilities,
    prebookLiteApiOffer,
  } = require("./liteApiClient");

  const {
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
  } = require("./liteApiProvider");

  const {
    mapLiteApiHotelDetailsResponse,
  } = require("./liteApiHotelDetailsMapper");

  const {
    createLiteApiPrebookOffer,
  } = require("./liteApiOfferMapper");

  const {
    createLiteApiWhitelabelCheckoutUrl,
  } = require("./liteApiBookingHandoff");

  return {
    searchLiteApiRates,
    createLiteApiSessionId,
    getLiteApiHotels,
    getLiteApiFacilities,
    prebookLiteApiOffer,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
    mapLiteApiHotelDetailsResponse,
    createLiteApiPrebookOffer,
    createLiteApiWhitelabelCheckoutUrl,
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
    createLiteApiSessionId,
    getLiteApiHotels,
    getLiteApiFacilities,
    prebookLiteApiOffer,
    isLiteApiNoResults,
    getLiteApiCurrency,
    mapLiteApiHotelResponse,
    mapLiteApiHotelDetailsResponse,
    createLiteApiPrebookOffer,
    createLiteApiWhitelabelCheckoutUrl,
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

  const optionalFunctions = {
    createLiteApiSessionId,
    prebookLiteApiOffer,
    createLiteApiPrebookOffer,
    createLiteApiWhitelabelCheckoutUrl,
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

  for (
    const [
      dependencyName,
      dependencyValue,
    ] of Object.entries(
      optionalFunctions
    )
  ) {
    if (
      dependencyValue !==
        undefined &&
      dependencyValue !==
        null &&
      typeof dependencyValue !==
        "function"
    ) {
      throw new Error(
        `LiteAPI adapter dependency "${dependencyName}" must be a function when provided.`
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

      const {
        commercialPricingPolicy,
        ...ratesInput
      } = providerInput;

      const sessionId =
        typeof createLiteApiSessionId ===
          "function"
          ? createLiteApiSessionId()
          : createAdapterSessionId();

      const minimumSellerCommissionPercent =
        Number(
          commercialPricingPolicy
            ?.minimumSellerCommissionPercent
        );

      const requestedSellerCommissionPercent =
        Number.isFinite(
          minimumSellerCommissionPercent
        ) &&
        minimumSellerCommissionPercent > 0
          ? minimumSellerCommissionPercent
          : null;

      const response =
        await searchLiteApiRates({
          ...ratesInput,
          sessionId,
          margin:
            requestedSellerCommissionPercent,
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

          rawData:
            null,

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
          searchLocation,
          null,
          {
            maximumRecords:
              MAX_LITEAPI_HOTELS_PER_SEARCH,
            commercialPricingPolicy,
            requestedSellerCommissionPercent,
          }
        );

      const preliminaryHotels =
        limitLiteApiHotels(
          mergeHotels(
            preliminaryMappedHotels
          )
        );

      const providerHotelIds =
        collectLiteApiMetadataHotelIds(
          preliminaryHotels
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
              hotelMetadata,
              {
                maximumRecords:
                  MAX_LITEAPI_HOTELS_PER_SEARCH,
                commercialPricingPolicy,
                requestedSellerCommissionPercent,
              }
            )
          : preliminaryMappedHotels;

      const hotels =
        limitLiteApiHotels(
          mergeHotels(
            mappedHotels
          )
        );

      operationalLogger.info(
        "provider.results-mapped",
        {
          providerId:
            PROVIDER_ID,

          mappedHotels:
            mappedHotels.length,

          mergedHotels:
            hotels.length,
        }
      );

      if (hotels.length === 0) {
        return createProviderNoResultsResult({
          providerId:
            PROVIDER_ID,

          currency,

          rawData:
            null,

          message:
            "LiteAPI returned no usable hotels for this search.",
        });
      }

      return createProviderSuccessResult({
          providerId:
            PROVIDER_ID,

          currency,

          hotels,

          providerContext: {
            sessionId,
          },

          rawData:
            null,
        });
    },

    async recheckOffer({
      offer,
      hotelId,
      providerContext,
      stayContext,
      signal,
    } = {}) {
      if (
        typeof prebookLiteApiOffer !==
          "function" ||
        typeof createLiteApiPrebookOffer !==
          "function"
      ) {
        const error =
          new Error(
            "LiteAPI offer recheck dependencies are unavailable."
          );

        error.code =
          "PROVIDER_OFFER_RECHECK_UNAVAILABLE";

        error.status =
          501;

        throw error;
      }

      try {
        let offerForPrebook =
          offer;

        const pricingState =
          offer?.commercialPricing
            ?.state;

        if (
          pricingState ===
          LITEAPI_PRICING_STATES
            .UNVERIFIED
        ) {
          throw createLiteApiPricingError({
            code:
              "PROVIDER_PRICE_UNVERIFIED",
            message:
              "The selected offer does not contain enough information to enforce the SmartStay pricing policy.",
          });
        }

        if (
          pricingState ===
          LITEAPI_PRICING_STATES
            .MATERIALIZATION_REQUIRED
        ) {
          const materializationInput =
            createLiteApiMaterializationInput({
              hotelId,
              stayContext,
              providerContext,
              offer,
            });

          const materializationResponse =
            await searchLiteApiRates({
              ...materializationInput,
              signal,
            });

          const materializationData =
            materializationResponse
              ?.data ??
            null;

          if (
            materializationResponse
              ?.noContent ||
            isLiteApiNoResults(
              materializationData
            )
          ) {
            return createProviderOfferRecheckSoldOut({
              providerId:
                PROVIDER_ID,
              rawData:
                null,
            });
          }

          const materializedHotels =
            mapLiteApiHotelResponse(
              materializationData,
              offer?.currency ??
                "EUR",
              null,
              null,
              {
                maximumRecords:
                  1,
                commercialPricingPolicy:
                  getPricingPolicy(
                    offer
                  ),
                requestedSellerCommissionPercent:
                  materializationInput
                    .margin,
              }
            );

          offerForPrebook =
            selectMaterializedLiteApiOffer({
              hotels:
                materializedHotels,
              originalOffer:
                offer,
            });
        }

        const providerOfferReference =
          typeof offerForPrebook
            ?.providerOfferReference ===
            "string"
            ? offerForPrebook
                .providerOfferReference
                .trim()
            : "";

        if (!providerOfferReference) {
          const error =
            new Error(
              "The provider offer reference is unavailable."
            );

          error.code =
            "PROVIDER_OFFER_REFERENCE_REQUIRED";

          error.status =
            409;

          throw error;
        }

        const response =
          await prebookLiteApiOffer(
            providerOfferReference,
            {
              usePaymentSdk:
                false,
              signal,
            }
          );

        if (
          response?.noContent
        ) {
          return createProviderOfferRecheckSoldOut({
            providerId:
              PROVIDER_ID,
            rawData:
              response?.data ??
              null,
          });
        }

        const mapped =
          createLiteApiPrebookOffer({
            data:
              response?.data ??
              null,
            originalOffer:
              offerForPrebook,
            hotelId,
            sourceProvider:
              PROVIDER_ID,
            providerName:
              offerForPrebook
                ?.provider ??
              "LiteAPI",
            fallbackCurrency:
              offerForPrebook
                ?.currency ??
              "EUR",
          });

        if (!mapped?.offer) {
          const error =
            new Error(
              "The provider returned an invalid prebook response."
            );

          error.code =
            "PROVIDER_RECHECK_INVALID_RESPONSE";

          error.status =
            502;

          throw error;
        }

        const enforcedTarget =
          Number(
            offerForPrebook
              ?.commercialPricing
              ?.targetSellingPrice
          );

        const verifiedPrice =
          Number(
            mapped.offer.price
          );

        if (
          getPricingPolicy(
            offerForPrebook
          ) &&
          (
            !Number.isFinite(
              enforcedTarget
            ) ||
            !Number.isFinite(
              verifiedPrice
            ) ||
            Number(
              verifiedPrice.toFixed(2)
            ) <
              Number(
                enforcedTarget.toFixed(2)
              )
          )
        ) {
          throw createLiteApiPricingError({
            code:
              "PROVIDER_PREBOOK_PRICE_BELOW_TARGET",
            message:
              "The verified checkout price is below the enforced public selling target.",
          });
        }

        return createProviderOfferRecheckConfirmed({
          providerId:
            PROVIDER_ID,
          offer:
            mapped.offer,
          providerBookingReference:
            mapped.providerBookingReference,
          rawData:
            response?.data ??
            null,
        });
      } catch (error) {
        const status =
          Number(
            error?.status ??
            error?.response?.status
          );

        const message =
          String(
            error?.message ??
            error?.response?.data
              ?.message ??
            ""
          ).toLowerCase();

        const unavailable =
          status === 404 ||
          status === 410 ||
          message.includes(
            "sold out"
          ) ||
          message.includes(
            "no longer available"
          ) ||
          message.includes(
            "offer expired"
          ) ||
          message.includes(
            "outdated offer"
          );

        if (unavailable) {
          return createProviderOfferRecheckSoldOut({
            providerId:
              PROVIDER_ID,
            rawData:
              error?.response?.data ??
              error?.data ??
              null,
          });
        }

        throw error;
      }
    },

    async createBookingHandoff({
      providerBookingReference,
    } = {}) {
      if (
        typeof createLiteApiWhitelabelCheckoutUrl !==
          "function"
      ) {
        const error =
          new Error(
            "LiteAPI booking handoff dependency is unavailable."
          );

        error.code =
          "PROVIDER_BOOKING_HANDOFF_UNAVAILABLE";

        error.status =
          501;

        throw error;
      }

      return createProviderExternalBookingHandoff({
        providerId:
          PROVIDER_ID,
        redirectUrl:
          createLiteApiWhitelabelCheckoutUrl({
            providerBookingReference,
          }),
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
  MAX_LITEAPI_HOTELS_PER_SEARCH,
  createLiteApiSearchInput,
  createLiteApiAdapter,
  limitLiteApiHotels,
  loadLiteApiAdapter,
};
