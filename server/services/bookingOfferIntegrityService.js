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

module.exports = {
  PUBLIC_OFFER_ID_PATTERN,
  createPublicOfferId,
  getOfferHandoffState,
  getOfferSourceProvider,
  getSafeBookingUrl,
  isPublicOfferId,
  resolveOfferByPublicId,
};
