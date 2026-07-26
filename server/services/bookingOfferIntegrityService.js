const crypto = require("crypto");

const {
  getAccommodationProviderById,
} = require("../providers/providerRegistry");

const PUBLIC_OFFER_ID_PATTERN =
  /^offer-[a-f0-9]{24}$/i;

function normalizeText(
  value
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeIdentityText(
  value
) {
  return normalizeText(
    value
  )
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number.toFixed(2)
    : "";
}

function normalizeBoolean(
  value
) {
  return typeof value ===
    "boolean"
    ? String(value)
    : "";
}

function getFirstText(
  source,
  paths
) {
  for (const path of paths) {
    let current =
      source;

    for (const key of path) {
      current =
        current?.[key];
    }

    const text =
      normalizeText(
        current
      );

    if (text) {
      return text;
    }
  }

  return "";
}

function normalizeChildAges(
  value
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const rawAge =
        item &&
        typeof item ===
          "object"
          ? item.age
          : item;

      const age =
        Number(rawAge);

      return Number.isFinite(
        age
      )
        ? Math.max(
            0,
            Math.round(age)
          )
        : null;
    })
    .filter(
      (age) =>
        age !== null
    );
}

function createBookingStayContext(
  searchData
) {
  const source =
    searchData &&
    typeof searchData ===
      "object" &&
    !Array.isArray(searchData)
      ? searchData
      : {};

  const defaultAdults =
    source.adults ??
    source.guests
      ?.adults ??
    source.occupancy
      ?.adults;

  const defaultChildren =
    source.childAges ??
    source.childrenAges ??
    source.children ??
    source.guests
      ?.childAges ??
    source.guests
      ?.childrenAges ??
    source.guests
      ?.children ??
    source.occupancy
      ?.children;

  const hasDefaultOccupancy =
    defaultAdults !==
      null &&
    defaultAdults !==
      undefined ||
    Array.isArray(
      defaultChildren
    );

  const rawRooms =
    Array.isArray(
      source.rooms
    ) &&
    source.rooms.length > 0
      ? source.rooms
      : hasDefaultOccupancy
        ? [
            {
              adults:
                defaultAdults,
              childAges:
                defaultChildren,
            },
          ]
        : [];

  const rooms =
    rawRooms.map((room) => ({
      adults:
        Math.max(
          1,
          Math.round(
            Number(
              room?.adults
            ) || 1
          )
        ),
      childAges:
        normalizeChildAges(
          room?.childAges ??
          room?.childrenAges ??
          room?.children
        ),
    }));

  return {
    checkin:
      getFirstText(
        source,
        [
          ["checkin"],
          ["checkIn"],
          ["check_in"],
          ["arrivalDate"],
          ["startDate"],
          ["dates", "checkin"],
          ["dates", "checkIn"],
          ["dates", "startDate"],
        ]
      ) ||
      null,

    checkout:
      getFirstText(
        source,
        [
          ["checkout"],
          ["checkOut"],
          ["check_out"],
          ["departureDate"],
          ["endDate"],
          ["dates", "checkout"],
          ["dates", "checkOut"],
          ["dates", "endDate"],
        ]
      ) ||
      null,

    currency:
      (
        getFirstText(
          source,
          [
            ["currency"],
            ["selectedCurrency"],
          ]
        ) ||
        null
      )?.toUpperCase() ??
      null,

    rooms,
  };
}

function getStableInternalOfferId(
  offer
) {
  const internalId =
    normalizeText(
      offer?.id
    );

  if (
    !internalId ||
    /(?:^|:)rate_[0-9]+$/i.test(
      internalId
    ) ||
    /:primary$/i.test(
      internalId
    )
  ) {
    return "";
  }

  return internalId;
}

function createOfferIdentityPayload(
  offer
) {
  const source =
    offer &&
    typeof offer ===
      "object" &&
    !Array.isArray(offer)
      ? offer
      : {};

  return [
    normalizeIdentityText(
      source.sourceProvider
    ),
    normalizeIdentityText(
      getStableInternalOfferId(
        source
      )
    ),
    normalizeIdentityText(
      source.roomName
    ),
    normalizeIdentityText(
      source.mealPlan
    ),
    normalizeNumber(
      source.totalKnownCost ??
      source.price
    ),
    normalizeIdentityText(
      source.currency
    ),
    normalizeBoolean(
      source.refundable
    ),
    normalizeIdentityText(
      source.freeCancellationUntil
    ),
    normalizeNumber(
      source.excludedTaxes
    ),
    normalizeNumber(
      source.unknownTaxes
    ),
    normalizeIdentityText(
      source.cancellationPolicy
    ),
    normalizeIdentityText(
      source.deepLink
    ),
  ].join("\u001f");
}

function createPublicOfferId(
  offer
) {
  const payload =
    createOfferIdentityPayload(
      offer
    );

  return (
    "offer-" +
    crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex")
      .slice(0, 24)
  );
}

function isPublicOfferId(
  value
) {
  return (
    typeof value ===
      "string" &&
    PUBLIC_OFFER_ID_PATTERN.test(
      value.trim()
    )
  );
}

function resolveOfferByPublicId(
  offers,
  offerId
) {
  const normalizedOfferId =
    normalizeText(
      offerId
    );

  if (
    !isPublicOfferId(
      normalizedOfferId
    ) ||
    !Array.isArray(offers)
  ) {
    return null;
  }

  return offers.find(
    (offer) =>
      createPublicOfferId(
        offer
      ) ===
      normalizedOfferId
  ) ?? null;
}

function getOfferSourceProvider({
  offer,
  hotel,
} = {}) {
  return (
    normalizeText(
      offer?.sourceProvider
    ) ||
    normalizeText(
      hotel?.sourceProvider
    ) ||
    null
  );
}

function getSafeBookingUrl(
  value
) {
  const candidate =
    normalizeText(
      value
    );

  if (!candidate) {
    return null;
  }

  try {
    const url =
      new URL(candidate);

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    if (
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getOfferHandoffState({
  offer,
  hotel,
} = {}) {
  if (
    !offer ||
    typeof offer !==
      "object" ||
    Array.isArray(offer)
  ) {
    return {
      state:
        "unavailable",
      sourceProvider:
        null,
      redirectUrl:
        null,
    };
  }

  const sourceProvider =
    getOfferSourceProvider({
      offer,
      hotel,
    });

  const provider =
    sourceProvider
      ? getAccommodationProviderById(
          sourceProvider
        )
      : null;

  const supportsRedirect =
    Boolean(
      provider?.enabled &&
      (
        provider.capabilities
          ?.bookingRedirect ||
        provider.capabilities
          ?.bookingFormRedirect
      )
    );

  const redirectUrl =
    supportsRedirect
      ? getSafeBookingUrl(
          offer.deepLink
        )
      : null;

  if (redirectUrl) {
    return {
      state:
        "redirect-ready",
      sourceProvider,
      redirectUrl,
    };
  }

  if (
    provider?.enabled &&
    provider.capabilities
      ?.bookingApi
  ) {
    return {
      state:
        "booking-api-required",
      sourceProvider,
      redirectUrl:
        null,
    };
  }

  return {
    state:
      "unavailable",
    sourceProvider,
    redirectUrl:
      null,
  };
}

function getProviderOfferReference(
  offer
) {
  const reference =
    normalizeText(
      offer?.providerOfferReference
    );

  return reference || null;
}

function createBookingOfferSnapshot(
  offer
) {
  const source =
    offer &&
    typeof offer === "object" &&
    !Array.isArray(offer)
      ? offer
      : {};

  return {
    price:
      normalizeNumber(
        source.price
      ),

    totalKnownCost:
      normalizeNumber(
        source.totalKnownCost
      ),

    currency:
      normalizeIdentityText(
        source.currency
      ),

    taxesIncluded:
      normalizeBoolean(
        source.taxesIncluded
      ),

    includedTaxes:
      normalizeNumber(
        source.includedTaxes
      ),

    excludedTaxes:
      normalizeNumber(
        source.excludedTaxes
      ),

    unknownTaxes:
      normalizeNumber(
        source.unknownTaxes
      ),

    roomName:
      normalizeIdentityText(
        source.roomName
      ),

    mealPlan:
      normalizeIdentityText(
        source.mealPlan
      ),

    refundable:
      normalizeBoolean(
        source.refundable
      ),

    freeCancellationUntil:
      normalizeIdentityText(
        source.freeCancellationUntil
      ),

    cancellationPolicy:
      normalizeIdentityText(
        source.cancellationPolicy
      ),

    bookable:
      source.bookable !== false,
  };
}

function compareBookingOfferSnapshots(
  originalOffer,
  confirmedOffer
) {
  const original =
    createBookingOfferSnapshot(
      originalOffer
    );

  const confirmed =
    createBookingOfferSnapshot(
      confirmedOffer
    );

  const changedFields =
    Object.keys(original)
      .filter(
        (field) =>
          original[field] !==
          confirmed[field]
      );

  return {
    changed:
      changedFields.length > 0,

    changedFields,

    original,

    confirmed,
  };
}

module.exports = {
  PUBLIC_OFFER_ID_PATTERN,
  createPublicOfferId,
  createBookingOfferSnapshot,
  createBookingStayContext,
  compareBookingOfferSnapshots,
  getProviderOfferReference,
  getOfferHandoffState,
  getOfferSourceProvider,
  getSafeBookingUrl,
  isPublicOfferId,
  resolveOfferByPublicId,
};
