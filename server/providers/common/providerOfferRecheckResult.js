const PROVIDER_OFFER_RECHECK_OUTCOMES =
  Object.freeze({
    CONFIRMED:
      "confirmed",

    SOLD_OUT:
      "sold_out",
  });

function normalizeProviderId(
  providerId
) {
  const normalized =
    typeof providerId === "string"
      ? providerId.trim().toLowerCase()
      : "";

  if (!normalized) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return normalized;
}

function createProviderOfferRecheckConfirmed({
  providerId,
  offer,
  providerBookingReference = null,
  rawData = null,
} = {}) {
  if (
    !offer ||
    typeof offer !== "object" ||
    Array.isArray(offer)
  ) {
    throw new Error(
      "A confirmed provider offer is required."
    );
  }

  return {
    providerId:
      normalizeProviderId(
        providerId
      ),

    outcome:
      PROVIDER_OFFER_RECHECK_OUTCOMES
        .CONFIRMED,

    offer,

    providerBookingReference:
      typeof providerBookingReference ===
        "string" &&
      providerBookingReference.trim()
        ? providerBookingReference.trim()
        : null,

    rawData,
  };
}

function createProviderOfferRecheckSoldOut({
  providerId,
  rawData = null,
} = {}) {
  return {
    providerId:
      normalizeProviderId(
        providerId
      ),

    outcome:
      PROVIDER_OFFER_RECHECK_OUTCOMES
        .SOLD_OUT,

    offer:
      null,

    providerBookingReference:
      null,

    rawData,
  };
}

function validateProviderOfferRecheckResult(
  result
) {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      "Provider offer recheck result must be an object."
    );
  }

  normalizeProviderId(
    result.providerId
  );

  if (
    !Object.values(
      PROVIDER_OFFER_RECHECK_OUTCOMES
    ).includes(result.outcome)
  ) {
    throw new Error(
      "Provider offer recheck outcome is invalid."
    );
  }

  if (
    result.outcome ===
      PROVIDER_OFFER_RECHECK_OUTCOMES
        .CONFIRMED &&
    (
      !result.offer ||
      typeof result.offer !== "object" ||
      Array.isArray(result.offer)
    )
  ) {
    throw new Error(
      "Confirmed provider recheck results require an offer."
    );
  }

  return result;
}

module.exports = {
  PROVIDER_OFFER_RECHECK_OUTCOMES,
  createProviderOfferRecheckConfirmed,
  createProviderOfferRecheckSoldOut,
  validateProviderOfferRecheckResult,
};
