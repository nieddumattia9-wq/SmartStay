const {
  requireSearchSession,
} = require("../storage/searchSession");

function createBookingRedirectError({
  code,
  message,
  status,
}) {

  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.status =
    status;

  return error;

}

function getRequiredText({
  value,
  code,
  message,
}) {

  const normalizedValue =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!normalizedValue) {

    throw createBookingRedirectError({
      code,
      message,
      status:
        400,
    });

  }

  return normalizedValue;

}

function getSafeBookingUrl(
  value
) {

  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {

    return null;

  }

  try {

    const url =
      new URL(
        value.trim()
      );

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

function requireCanonicalHotel(
  session,
  hotelId
) {

  const normalizedHotelId =
    getRequiredText({
      value:
        hotelId,

      code:
        "HOTEL_ID_REQUIRED",

      message:
        "hotelId is required.",
    });

  const hotels =
    Array.isArray(
      session?.hotels
    )
      ? session.hotels
      : [];

  const hotel =
    hotels.find(
      (candidate) =>
        candidate?.id ===
        normalizedHotelId
    ) ??
    null;

  if (!hotel) {

    throw createBookingRedirectError({
      code:
        "HOTEL_NOT_IN_SEARCH",

      message:
        "The requested hotel does not belong to this search.",

      status:
        404,
    });

  }

  return hotel;

}

function getOfferIndex(
  offerId
) {

  const normalizedOfferId =
    getRequiredText({
      value:
        offerId,

      code:
        "OFFER_ID_REQUIRED",

      message:
        "offerId is required.",
    });

  const match =
    /^offer-([1-9][0-9]*)$/.exec(
      normalizedOfferId
    );

  if (!match) {

    throw createBookingRedirectError({
      code:
        "OFFER_ID_INVALID",

      message:
        "offerId is invalid.",

      status:
        400,
    });

  }

  return Number(
    match[1]
  ) - 1;

}

function resolveBookingRedirect({
  searchId,
  hotelId,
  offerId,
} = {}) {

  const session =
    requireSearchSession(
      searchId
    );

  const hotel =
    requireCanonicalHotel(
      session,
      hotelId
    );

  const offerIndex =
    getOfferIndex(
      offerId
    );

  const offers =
    Array.isArray(
      hotel.offers
    )
      ? hotel.offers
      : [];

  const offer =
    offers[offerIndex] ??
    null;

  if (!offer) {

    throw createBookingRedirectError({
      code:
        "OFFER_NOT_IN_HOTEL",

      message:
        "The requested offer does not belong to this hotel.",

      status:
        404,
    });

  }

  const redirectUrl =
    getSafeBookingUrl(
      offer.deepLink
    );

  if (!redirectUrl) {

    throw createBookingRedirectError({
      code:
        "OFFER_NOT_BOOKABLE",

      message:
        "This offer cannot currently be opened for booking.",

      status:
        409,
    });

  }

  return {
    redirectUrl,
  };

}

module.exports = {
  getSafeBookingUrl,
  resolveBookingRedirect,
};
