const {
  requireSearchSession,
} = require("../storage/searchSession");

const {
  getOfferHandoffState,
  getSafeBookingUrl,
  isPublicOfferId,
  resolveOfferByPublicId,
} = require(
  "./bookingOfferIntegrityService"
);

function createBookingRedirectError({
  code,
  message,
  status,
}) {
  const error =
    new Error(message);

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
    typeof value ===
      "string"
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
    ) ?? null;

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

function requirePublicOfferId(
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

  if (
    !isPublicOfferId(
      normalizedOfferId
    )
  ) {
    throw createBookingRedirectError({
      code:
        "OFFER_ID_INVALID",
      message:
        "offerId is invalid.",
      status:
        400,
    });
  }

  return normalizedOfferId;
}

function resolveBookingOffer({
  session,
  hotelId,
  offerId,
} = {}) {
  const hotel =
    requireCanonicalHotel(
      session,
      hotelId
    );

  const normalizedOfferId =
    requirePublicOfferId(
      offerId
    );

  const offer =
    resolveOfferByPublicId(
      hotel.offers,
      normalizedOfferId
    );

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

  return {
    hotel,
    offer,
    offerId:
      normalizedOfferId,
  };
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

  const {
    hotel,
    offer,
  } = resolveBookingOffer({
    session,
    hotelId,
    offerId,
  });

  const handoff =
    getOfferHandoffState({
      offer,
      hotel,
    });

  if (
    handoff.state !==
      "redirect-ready" ||
    !handoff.redirectUrl
  ) {
    throw createBookingRedirectError({
      code:
        "OFFER_HANDOFF_UNSUPPORTED",
      message:
        "This offer cannot currently be opened through a verified booking handoff.",
      status:
        409,
    });
  }

  return {
    redirectUrl:
      handoff.redirectUrl,
  };
}

module.exports = {
  getSafeBookingUrl,
  resolveBookingOffer,
  resolveBookingRedirect,
};
