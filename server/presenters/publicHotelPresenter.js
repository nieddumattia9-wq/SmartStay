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
        "https:" &&
      url.protocol !==
        "http:"
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
  index
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

  return {
    id:
      `offer-${index + 1}`,

    provider:
      getText(
        source.provider,
        "Provider"
      ),

    price:
      getFiniteNumber(
        source.price,
        0
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
      getText(
        source.currency,
        "EUR"
      ),

    cancellationPolicy:
      getNullableText(
        source.cancellationPolicy
      ),

    taxesIncluded:
      getNullableBoolean(
        source.taxesIncluded
      ),

    roomName:
      getNullableText(
        source.roomName
      ),

    deepLink:
      getSafeHttpUrl(
        source.deepLink
      ),
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
          createPublicHotelOffer
        )
      : [];

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

    reviewText:
      getText(
        hotel.reviewText
      ),

    price:
      getFiniteNumber(
        hotel.price,
        0
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
        "EUR"
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

module.exports = {
  createPublicHotel,
  createPublicHotelOffer,
  createPublicHotels,
  getSafeHttpUrl,
};
