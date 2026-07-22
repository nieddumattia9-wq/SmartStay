const {
  requireSearchSession,
} = require(
  "../storage/searchSession"
);

const {
  saveBookingVerification,
} = require(
  "../storage/bookingVerificationStore"
);

const {
  getAccommodationProviderById,
} = require(
  "../providers/providerRegistry"
);

const {
  recheckOfferWithProvider,
} = require(
  "../providers/accommodationProviderOrchestrator"
);

const {
  createProviderFailureDetails,
} = require(
  "../providers/common/providerSearchOutcomeService"
);

const {
  createPublicOfferId,
  compareBookingOfferSnapshots,
  getOfferSourceProvider,
  getProviderOfferReference,
} = require(
  "./bookingOfferIntegrityService"
);

const {
  resolveBookingOffer,
} = require(
  "./bookingRedirectService"
);

const BOOKING_OFFER_RECHECK_STATES =
  Object.freeze({
    CONFIRMED:
      "confirmed",
    CHANGED:
      "changed",
    SOLD_OUT:
      "sold-out",
    RECHECK_REQUIRED:
      "recheck-required",
  });

function getProviderHotelId(
  hotel
) {
  const sourceHotelId =
    typeof hotel?.sourceHotelId ===
      "string"
      ? hotel.sourceHotelId.trim()
      : "";

  if (sourceHotelId) {
    return sourceHotelId;
  }

  const canonicalId =
    typeof hotel?.id ===
      "string"
      ? hotel.id.trim()
      : "";

  if (canonicalId.includes(":")) {
    return canonicalId
      .split(":")
      .slice(1)
      .join(":");
  }

  return canonicalId || null;
}

function createRecheckRequiredResult({
  code,
  message,
  retryable = false,
  retryAfterMs = null,
} = {}) {
  return {
    state:
      BOOKING_OFFER_RECHECK_STATES
        .RECHECK_REQUIRED,
    code,
    message,
    retryable,
    retryAfterMs,
    requiresUserConfirmation:
      false,
    changedFields:
      [],
    verification:
      null,
    offer:
      null,
  };
}

function createBookingOfferRecheckService({
  requireSession =
    requireSearchSession,
  resolveOffer =
    resolveBookingOffer,
  getProvider =
    getAccommodationProviderById,
  executeRecheck =
    recheckOfferWithProvider,
  saveVerification =
    saveBookingVerification,
} = {}) {
  return async function recheckBookingOffer({
    searchId,
    hotelId,
    offerId,
  } = {}) {
    const session =
      requireSession(
        searchId
      );

    const {
      hotel,
      offer,
      offerId:
        canonicalOfferId,
    } = resolveOffer({
      session,
      hotelId,
      offerId,
    });

    const sourceProvider =
      getOfferSourceProvider({
        offer,
        hotel,
      });

    const provider =
      sourceProvider
        ? getProvider(
            sourceProvider
          )
        : null;

    if (
      !provider?.enabled ||
      !provider.capabilities
        ?.offerRecheck
    ) {
      return createRecheckRequiredResult({
        code:
          "OFFER_RECHECK_UNSUPPORTED",
        message:
          "This offer must be checked again with the booking provider before purchase.",
      });
    }

    if (
      !getProviderOfferReference(
        offer
      )
    ) {
      return createRecheckRequiredResult({
        code:
          "OFFER_RECHECK_REFERENCE_MISSING",
        message:
          "This offer cannot be checked again safely.",
      });
    }

    try {
      const providerResult =
        await executeRecheck({
          sourceProvider,
          hotelId:
            getProviderHotelId(
              hotel
            ),
          offer,
          providerContext:
            hotel?.providerContext ??
            null,
        });

      if (
        providerResult?.outcome ===
          "sold_out"
      ) {
        return {
          state:
            BOOKING_OFFER_RECHECK_STATES
              .SOLD_OUT,
          code:
            "OFFER_SOLD_OUT",
          message:
            "This offer is no longer available.",
          retryable:
            false,
          retryAfterMs:
            null,
          requiresUserConfirmation:
            false,
          changedFields:
            [],
          verification:
            null,
          offer:
            null,
        };
      }

      const confirmedOffer =
        providerResult?.offer;

      if (!confirmedOffer) {
        return createRecheckRequiredResult({
          code:
            "OFFER_RECHECK_INVALID_RESPONSE",
          message:
            "The booking provider could not confirm this offer.",
          retryable:
            true,
        });
      }

      const comparison =
        compareBookingOfferSnapshots(
          offer,
          confirmedOffer
        );

      const verification =
        saveVerification({
          searchId:
            session.searchId ??
            searchId,
          hotelId:
            hotel.id,
          originalOfferId:
            canonicalOfferId,
          confirmedOffer,
          sourceProvider,
          providerBookingReference:
            providerResult
              .providerBookingReference ??
            null,
          requiresUserConfirmation:
            comparison.changed,
          changedFields:
            comparison.changedFields,
        });

      return {
        state:
          comparison.changed
            ? BOOKING_OFFER_RECHECK_STATES
                .CHANGED
            : BOOKING_OFFER_RECHECK_STATES
                .CONFIRMED,
        code:
          comparison.changed
            ? "OFFER_CHANGED"
            : "OFFER_CONFIRMED",
        message:
          comparison.changed
            ? "The provider changed the price or booking conditions. Review the updated offer before continuing."
            : "The provider confirmed the current price and booking conditions.",
        retryable:
          false,
        retryAfterMs:
          null,
        requiresUserConfirmation:
          comparison.changed,
        changedFields:
          comparison.changedFields,
        verification: {
          id:
            verification
              .verificationId,
          verifiedAt:
            verification.createdAt,
          expiresAt:
            verification.expiresAt,
        },
        offer:
          confirmedOffer,
        confirmedOfferId:
          createPublicOfferId(
            confirmedOffer
          ),
      };
    } catch (error) {
      const failure =
        createProviderFailureDetails(
          error
        );

      return createRecheckRequiredResult({
        code:
          "OFFER_RECHECK_TEMPORARILY_UNAVAILABLE",
        message:
          "The booking provider could not confirm this offer right now.",
        retryable:
          failure.retryable,
        retryAfterMs:
          failure.retryAfterMs,
      });
    }
  };
}

const recheckBookingOffer =
  createBookingOfferRecheckService();

module.exports = {
  BOOKING_OFFER_RECHECK_STATES,
  createBookingOfferRecheckService,
  recheckBookingOffer,
};
