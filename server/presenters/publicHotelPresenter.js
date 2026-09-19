const {
  inferReviewCountRelation,
} = require("../utils/reviewCountRelation");

const {
  createPublicOfferId,
  getOfferHandoffState,
} = require(
  "../services/bookingOfferIntegrityService"
);
const { offerFingerprint, normalizeCurrency } = require("../providers/common/commercialSummary");

function createPublicCommercialSummary(hotel) {
  const summary = hotel.commercialSummary;
  if (summary?.version !== "search-currency-summary@1") return undefined;
  const selected = (hotel.offers ?? []).find(offer =>
    offerFingerprint(offer) === summary.selectedOfferFingerprint);
  return {
    version: summary.version,
    status: summary.status,
    searchCurrency: summary.searchCurrency,
    offerCount: summary.offerCount,
    comparableOfferCount: summary.comparableOfferCount,
    selectedOfferId: selected ? createPublicOfferId(selected) : null,
    // Display observation binding only; not a new booking/handoff identity.
    selectedObservationId: selected ? offerFingerprint(selected) : null,
    selectionBasis: summary.selectionBasis,
  };
}

const AVAILABLE_DATA_KEYS = [
  "hasPrice",
  "hasBasePrice",
  "hasSaving",
  "hasStars",
  "hasReviewScore",
  "hasReviewCount",
  "hasImage",
  "hasAddress",
  "hasCoordinates",
  "hasDistance",
  "hasAmenities",
];

const VALID_DATA_CONFIDENCE =
  new Set([
    "full",
    "partial",
    "limited",
  ]);

function getText(
  value,
  fallback = ""
) {

  return typeof value ===
    "string"
    ? value.trim()
    : fallback;

}

function getNullableText(
  value
) {

  const text =
    getText(
      value
    );

  return text ||
    null;

}

function getFiniteNumber(
  value,
  fallback = null
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return fallback;

  }

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;

}

function getNullableBoolean(
  value
) {

  return typeof value ===
    "boolean"
    ? value
    : null;

}

function getStringArray(
  value
) {

  if (!Array.isArray(value)) {

    return [];

  }

  return Array.from(
    new Set(
      value
        .map(
          (item) =>
            getText(
              item
            )
        )
        .filter(
          Boolean
        )
    )
  );

}

function getSafeHttpUrl(
  value
) {

  const candidate =
    getText(
      value
    );

  if (!candidate) {

    return null;

  }

  try {

    const url =
      new URL(
        candidate
      );

    if (
      url.protocol !==
        "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {

      return null;

    }

    return url.toString();

  } catch {

    return null;

  }

}

function createPublicAvailableData(
  availableData
) {

  const source =
    availableData &&
    typeof availableData ===
      "object" &&
    !Array.isArray(
      availableData
    )
      ? availableData
      : {};

  return Object.fromEntries(
    AVAILABLE_DATA_KEYS.map(
      (key) => [
        key,
        source[key] ===
          true,
      ]
    )
  );

}

function createPublicHotelOffer(
  offer,
  _index,
  hotel = null
) {

  const source =
    offer &&
    typeof offer ===
      "object" &&
    !Array.isArray(
      offer
    )
      ? offer
      : {};
  const explicitSummary = hotel?.commercialSummary?.version === "search-currency-summary@1";

  return {
    id:
      createPublicOfferId(
        source
      ),
    ...(explicitSummary ? { observationId: offerFingerprint(source) } : {}),

    provider:
      getText(
        source.provider,
        "Provider"
      ),

    price:
      getFiniteNumber(
        explicitSummary && typeof source.price !== "number" && typeof source.price !== "string"
          ? null : source.price,
        explicitSummary ? null : 0
      ),

    basePrice:
      getFiniteNumber(
        source.basePrice,
        0
      ),

    saving:
      getFiniteNumber(
        source.saving,
        0
      ),

    currency:
      explicitSummary ? normalizeCurrency(source.currency) : getText(source.currency, "EUR"),

    cancellationPolicy:
      getNullableText(
        source.cancellationPolicy
      ),

    refundableTag:
      getNullableText(
        source.refundableTag
      ),

    refundable:
      getNullableBoolean(
        source.refundable
      ),

    freeCancellationUntil:
      getNullableText(
        source.freeCancellationUntil
      ),

    cancellationPenalty:
      typeof source.cancellationPenalty ===
        "number" &&
      Number.isFinite(
        source.cancellationPenalty
      ) &&
      source.cancellationPenalty >= 0
        ? source.cancellationPenalty
        : null,

    cancellationPenaltyCurrency:
      getNullableText(
        source.cancellationPenaltyCurrency
      ),

    cancellationPenaltyType:
      getNullableText(
        source.cancellationPenaltyType
      ),

    cancellationTimezone:
      getNullableText(
        source.cancellationTimezone
      ),

    taxesIncluded:
      getNullableBoolean(
        source.taxesIncluded
      ),

    includedTaxes:
      getFiniteNumber(
        source.includedTaxes,
        0
      ),

    excludedTaxes:
      getFiniteNumber(
        source.excludedTaxes,
        0
      ),

    unknownTaxes:
      getFiniteNumber(
        source.unknownTaxes,
        0
      ),

    totalKnownCost:
      getFiniteNumber(
        source.totalKnownCost
      ),

    roomName:
      getNullableText(
        source.roomName
      ),

    mealPlan:
      getNullableText(
        source.mealPlan
      ),

    /*
     * A live provider rate can be commercially usable even when the
     * provider does not expose a direct redirect URL. Keep availability
     * separate from booking handoff capability.
     */
    bookable:
      getNullableBoolean(
        source.bookable
      ) ??
      (
        (
          getFiniteNumber(
            source.totalKnownCost
          ) ??
          getFiniteNumber(
            source.price
          ) ??
          0
        ) >
        0
      ),

    redirectable:
      getOfferHandoffState({
        offer:
          source,
        hotel,
      }).state ===
      "redirect-ready",
  };

}

function createPublicHotel(
  hotel
) {

  if (
    !hotel ||
    typeof hotel !==
      "object" ||
    Array.isArray(
      hotel
    )
  ) {

    return null;

  }

  const id =
    getText(
      hotel.id
    );

  if (!id) {

    return null;

  }

  const dataConfidence =
    VALID_DATA_CONFIDENCE.has(
      hotel.dataConfidence
    )
      ? hotel.dataConfidence
      : "limited";

  const offers =
    Array.isArray(
      hotel.offers
    )
      ? hotel.offers.map(
          (
            offer,
            index
          ) =>
            createPublicHotelOffer(
              offer,
              index,
              hotel
            )
        )
      : [];
  const commercialSummary = createPublicCommercialSummary(hotel);

  return {
    id,

    dataSources:
      getStringArray(
        hotel.dataSources
      ),

    dataConfidence,

    availableData:
      createPublicAvailableData(
        hotel.availableData
      ),

    offers,
    ...(commercialSummary ? { commercialSummary } : {}),

    name:
      getText(
        hotel.name,
        "Accommodation"
      ),

    provider:
      getText(
        hotel.provider,
        "Provider"
      ),

    providerHotelTypeId:
      getFiniteNumber(
        hotel.providerHotelTypeId
      ),

    providerHotelTypeName:
      getNullableText(
        hotel.providerHotelTypeName
      ),

    accommodationCategory:
      getNullableText(
        hotel.accommodationCategory
      ),

    stars:
      getFiniteNumber(
        hotel.stars,
        0
      ),

    reviewScore:
      getFiniteNumber(
        hotel.reviewScore
      ),

    reviewCount:
      getFiniteNumber(
        hotel.reviewCount
      ),

    reviewCountRelation:
      inferReviewCountRelation({
        reviewCount:
          getFiniteNumber(
            hotel.reviewCount
          ),

        reviewCountRelation:
          hotel.reviewCountRelation,

        sourceProvider:
          hotel.reviewSourceProvider ??
          hotel.sourceProvider,

        provider:
          hotel.provider,
      }),

    reviewText:
      getText(
        hotel.reviewText
      ),

    price:
      getFiniteNumber(
        hotel.price,
        commercialSummary ? null : 0
      ),

    basePrice:
      getFiniteNumber(
        hotel.basePrice,
        0
      ),

    saving:
      getFiniteNumber(
        hotel.saving,
        0
      ),

    currency:
      getText(
        hotel.currency,
        commercialSummary ? null : "EUR"
      ),

    taxesIncluded:
      getNullableBoolean(
        hotel.taxesIncluded
      ),

    includedTaxes:
      getFiniteNumber(
        hotel.includedTaxes,
        0
      ),

    excludedTaxes:
      getFiniteNumber(
        hotel.excludedTaxes,
        0
      ),

    unknownTaxes:
      getFiniteNumber(
        hotel.unknownTaxes,
        0
      ),

    totalKnownCost:
      getFiniteNumber(
        hotel.totalKnownCost
      ),

    distance:
      getFiniteNumber(
        hotel.distance
      ),

    image:
      getSafeHttpUrl(
        hotel.image
      ) ?? "",

    address:
      getText(
        hotel.address
      ),

    city:
      getText(
        hotel.city
      ),

    country:
      getText(
        hotel.country
      ),

    latitude:
      getFiniteNumber(
        hotel.latitude
      ),

    longitude:
      getFiniteNumber(
        hotel.longitude
      ),

    amenities:
      getStringArray(
        hotel.amenities
      ),

    facilities:
      getStringArray(
        hotel.facilities
      ),
  };

}

function createPublicHotels(
  hotels
) {

  if (!Array.isArray(hotels)) {

    return [];

  }

  return hotels
    .map(
      createPublicHotel
    )
    .filter(
      Boolean
    );

}

function createPublicHotelDetails(
  hotel
) {

  if (
    !hotel ||
    typeof hotel !==
      "object" ||
    Array.isArray(
      hotel
    )
  ) {

    return null;

  }

  const id =
    getText(
      hotel.id
    );

  if (!id) {

    return null;

  }

  const images =
    getStringArray(
      hotel.images
    )
      .map(
        getSafeHttpUrl
      )
      .filter(
        Boolean
      );

  return {
    id,

    provider:
      getText(
        hotel.provider,
        "Provider"
      ),

    name:
      getText(
        hotel.name,
        "Accommodation"
      ),

    description:
      getNullableText(
        hotel.description
      ),

    stars:
      getFiniteNumber(
        hotel.stars,
        0
      ),

    reviewScore:
      getFiniteNumber(
        hotel.reviewScore
      ),

    reviewCount:
      getFiniteNumber(
        hotel.reviewCount
      ),

    reviewCountRelation:
      inferReviewCountRelation({
        reviewCount:
          getFiniteNumber(
            hotel.reviewCount
          ),

        reviewCountRelation:
          hotel.reviewCountRelation,

        sourceProvider:
          hotel.reviewSourceProvider ??
          hotel.sourceProvider,

        provider:
          hotel.provider,
      }),

    address:
      getText(
        hotel.address
      ),

    city:
      getText(
        hotel.city
      ),

    country:
      getText(
        hotel.country
      ),

    latitude:
      getFiniteNumber(
        hotel.latitude
      ),

    longitude:
      getFiniteNumber(
        hotel.longitude
      ),

    images,

    amenities:
      getStringArray(
        hotel.amenities
      ),

    facilities:
      getStringArray(
        hotel.facilities
      ),

    checkIn:
      getNullableText(
        hotel.checkIn
      ),

    checkOut:
      getNullableText(
        hotel.checkOut
      ),
  };

}

module.exports = {
  createPublicHotel,
  createPublicHotelDetails,
  createPublicHotelOffer,
  createPublicHotels,
  getSafeHttpUrl,
};
