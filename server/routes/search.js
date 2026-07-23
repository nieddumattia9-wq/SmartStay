const express = require("express");

const router = express.Router();

const {
  requireSearchSession,
} = require("../storage/searchSession");

const {
  executeInitialSearchIdempotently,
  isSearchIdempotencyError,
} = require("../storage/searchIdempotency");

const {
  createPublicHotelDetails,
  createPublicHotelOffer,
} = require("../presenters/publicHotelPresenter");

const {
  createPublicSearchPayload,
  createPublicSearchSession,
  createPublicSearchStatus,
} = require("../presenters/publicSearchPresenter");

const {
  deriveSearchLifecycle,
  getPublicLifecycleMessage,
} = require("../utils/searchLifecycle");

const {
  extractRetryAfterMs,
} = require(
  "../providers/common/providerRetryPolicy"
);

const {
  searchDestinations,
  searchHotels,
  continueHotelSearch,
  getHotelDetails,
  getSearchStatus,
} = require("../services/stayService");

const {
  resolveBookingRedirect,
} = require("../services/bookingRedirectService");

const {
  recheckBookingOffer,
} = require(
  "../services/bookingOfferRecheckService"
);

const {
  prepareBookingHandoff,
  resolveBookingHandoff:
    resolvePreparedBookingHandoff,
} = require(
  "../services/bookingHandoffService"
);

const {
  isRequestValidationError,
  validateBookingHandoffOpenRequest,
  validateBookingHandoffRequest,
  validateBookingOfferRecheckRequest,
  validateBookingRedirectRequest,
  validateContinueHotelSearchRequest,
  validateDestinationSearchRequest,
  validateHotelDetailsRequest,
  validateHotelSearchRequest,
  validateSearchReadRequest,
} = require(
  "../validation/requestValidation"
);

function requireSearchIdValue(
  value
) {
  const searchId =
    typeof value === "string"
      ? value.trim()
      : "";

  if (searchId) {
    return searchId;
  }

  const error =
    new Error(
      "searchId is required."
    );

  error.code =
    "SEARCH_ID_REQUIRED";

  error.status =
    400;

  throw error;
}

const PUBLIC_ROUTE_ERROR_CODES =
  new Set([
    "SEARCH_ID_REQUIRED",
    "SEARCH_ID_INVALID",
    "SEARCH_SESSION_NOT_FOUND",
    "SEARCH_SESSION_EXPIRED",
    "IDEMPOTENCY_KEY_REQUIRED",
    "IDEMPOTENCY_KEY_INVALID",
    "IDEMPOTENCY_PAYLOAD_INVALID",
    "IDEMPOTENCY_KEY_CONFLICT",
    "IDEMPOTENCY_CAPACITY_REACHED",
    "HOTEL_ID_REQUIRED",
    "HOTEL_ID_INVALID",
    "HOTEL_NOT_IN_SEARCH",
    "OFFER_ID_REQUIRED",
    "OFFER_ID_INVALID",
    "OFFER_NOT_IN_HOTEL",
    "OFFER_NOT_BOOKABLE",
    "OFFER_HANDOFF_UNSUPPORTED",
    "BOOKING_VERIFICATION_CAPACITY_REACHED",
    "BOOKING_VERIFICATION_ID_INVALID",
    "BOOKING_VERIFICATION_EXPIRED",
    "BOOKING_CHANGES_CONFIRMATION_REQUIRED",
    "BOOKING_HANDOFF_UNAVAILABLE",
    "BOOKING_HANDOFF_REFERENCE_MISSING",
    "BOOKING_HANDOFF_NOT_CONFIGURED",
    "BOOKING_HANDOFF_CAPACITY_REACHED",
    "BOOKING_HANDOFF_ID_INVALID",
    "BOOKING_HANDOFF_EXPIRED",
    "HOTEL_SOURCE_UNAVAILABLE",
    "DESTINATION_QUERY_INVALID",
    "INVALID_REQUEST",
    "INVALID_SEARCH_REQUEST",
    "UNSUPPORTED_MEDIA_TYPE",
  ]);

function isValidHttpStatus(
  status
) {

  return (
    Number.isInteger(
      status
    ) &&
    status >= 400 &&
    status <= 599
  );

}

function sendRouteError(
  res,
  error,
  fallbackMessage,
  {
    includeSearchLifecycle = false,
  } = {}
) {

  const directStatus =
    error?.status;

  const providerStatus =
    error?.response?.status;

  const status =
    isValidHttpStatus(
      directStatus
    )
      ? directStatus
      : isValidHttpStatus(
          providerStatus
        )
        ? providerStatus
        : 500;

  const publicCode =
    PUBLIC_ROUTE_ERROR_CODES.has(
      error?.code
    )
      ? error.code
      : null;

  const retryAfterMs =
    extractRetryAfterMs(
      error
    );

  const lifecycle =
    includeSearchLifecycle &&
    !isRequestValidationError(
      error
    )
      ? deriveSearchLifecycle({
          success: false,
          status: "Failed",
          code:
            publicCode,
          httpStatus:
            status,
          retryable:
            typeof error?.retryable ===
              "boolean"
              ? error.retryable
              : undefined,
          retryAfterMs,
        })
      : null;

  const responseCode =
    lifecycle?.publicCode ??
    publicCode;

  const publicMessage =
    lifecycle
      ? (
          getPublicLifecycleMessage(
            lifecycle
          ) ??
          fallbackMessage
        )
      : publicCode
        ? error.message
        : fallbackMessage;

  const requestLog =
    res.req?.log;

  if (
    requestLog &&
    typeof requestLog.error ===
      "function"
  ) {
    requestLog.error(
      "api.route.failed",
      {
        method:
          res.req?.method,
        path:
          res.req?.path,
        status,
        code:
          error?.code ??
          null,
        providerResponse:
          error?.response?.data ??
          null,
        error,
      }
    );
  }
  else {
    console.error(
      fallbackMessage,
      {
        status,
        code:
          error?.code ??
          null,
      }
    );
  }

  if (
    lifecycle?.retryAfterMs != null &&
    lifecycle.retryAfterMs > 0
  ) {
    res.set(
      "Retry-After",
      String(
        Math.max(
          1,
          Math.ceil(
            lifecycle.retryAfterMs /
            1000
          )
        )
      )
    );
  }

  if (includeSearchLifecycle) {
    res.set(
      "Cache-Control",
      "no-store"
    );
  }

  return res
    .status(
      status
    )
    .json({
      success:
        false,

      code:
        responseCode,

      message:
        publicMessage,

      ...(isRequestValidationError(
        error
      ) &&
      typeof error?.field ===
        "string" &&
      error.field.trim()
        ? {
            field:
              error.field,
          }
        : {}),

      requestId:
        res.req?.requestId ??
        null,

      ...(lifecycle
        ? {
            retryAfterMs:
              lifecycle.retryAfterMs,

            lifecycle,
          }
        : {}),
    });

}

// =========================
// Search Destinations
// =========================

router.post("/search-destinations", async (req, res) => {

  try {

    const {
      query,
    } =
      validateDestinationSearchRequest(
        req
      );

    const results =
      await searchDestinations(query);

    return res.json(results);

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to search destinations."
    );

  }

});

// =========================
// Search Hotels
// =========================

router.post("/search-hotels", async (req, res) => {

  try {

    const payload =
      validateHotelSearchRequest(
        req
      );

    const idempotencyResult =
      await executeInitialSearchIdempotently({
        idempotencyKey:
          req.get(
            "Idempotency-Key"
          ),

        payload,

        execute:
          async () => {
            const results =
              await searchHotels(
                payload
              );

            return createPublicSearchPayload(
              results
            );
          },
      });

    res.set(
      "Idempotency-Replayed",
      idempotencyResult.replayed
        ? "true"
        : "false"
    );

    res.set(
      "Idempotency-Coalesced",
      idempotencyResult.coalesced
        ? "true"
        : "false"
    );

    res.set(
      "Cache-Control",
      "no-store"
    );

    return res.json(
      idempotencyResult.response
    );

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to search hotels.",
      {
        includeSearchLifecycle:
          !isSearchIdempotencyError(
            error
          ),
      }
    );

  }

});

// =========================
// Continue Hotel Search
// =========================

router.post("/search-hotels/continue", async (req, res) => {

  try {

    const {
      searchId: validatedSearchId,
    } =
      validateContinueHotelSearchRequest(
        req
      );

    const searchId =
      requireSearchIdValue(
        validatedSearchId
      );

    const result =
      await continueHotelSearch(searchId);

    res.set(
      "Cache-Control",
      "no-store"
    );

    return res.json(
      createPublicSearchPayload(
        result
      )
    );

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to continue hotel search.",
      {
        includeSearchLifecycle:
          true,
      }
    );

  }

});

// =========================
// Booking Offer Recheck
// =========================

router.post("/booking-offer-recheck", async (req, res) => {
  try {
    const payload =
      validateBookingOfferRecheckRequest(
        req
      );

    const result =
      await recheckBookingOffer({
        searchId:
          payload.searchId,
        hotelId:
          payload.hotelId,
        offerId:
          payload.offerId,
      });

    res.set(
      "Cache-Control",
      "no-store"
    );

    if (
      result.retryAfterMs != null &&
      result.retryAfterMs > 0
    ) {
      res.set(
        "Retry-After",
        String(
          Math.max(
            1,
            Math.ceil(
              result.retryAfterMs /
              1000
            )
          )
        )
      );
    }

    return res.json({
      success:
        true,
      state:
        result.state,
      code:
        result.code,
      message:
        result.message,
      retryable:
        result.retryable,
      retryAfterMs:
        result.retryAfterMs,
      requiresUserConfirmation:
        result
          .requiresUserConfirmation,
      changedFields:
        result.changedFields,
      verification:
        result.verification,
      confirmedOfferId:
        result.confirmedOfferId ??
        null,
      offer:
        result.offer
          ? createPublicHotelOffer(
              result.offer,
              0
            )
          : null,
    });
  } catch (error) {
    return sendRouteError(
      res,
      error,
      "Unable to verify this booking offer."
    );
  }
});

// =========================
// Prepare Booking Handoff
// =========================

router.post("/booking-handoff", async (req, res) => {
  try {
    const payload =
      validateBookingHandoffRequest(
        req
      );

    const result =
      await prepareBookingHandoff({
        verificationId:
          payload
            .verificationId,
        acceptChanges:
          payload
            .acceptChanges,
      });

    const handoffId =
      result.handoff.id;

    const openUrl =
      `${req.baseUrl}/booking-handoff/open?handoffId=${encodeURIComponent(
        handoffId
      )}`;

    res.set(
      "Cache-Control",
      "no-store"
    );

    return res.json({
      success:
        true,
      state:
        result.state,
      code:
        result.code,
      message:
        result.message,
      handoff: {
        id:
          handoffId,
        expiresAt:
          result.handoff
            .expiresAt,
        openUrl,
      },
    });
  } catch (error) {
    return sendRouteError(
      res,
      error,
      "Unable to prepare secure checkout."
    );
  }
});

// =========================
// Open Booking Handoff
// =========================

router.get("/booking-handoff/open", (req, res) => {
  try {
    const {
      handoffId,
    } =
      validateBookingHandoffOpenRequest(
        req
      );

    const {
      redirectUrl,
    } =
      resolvePreparedBookingHandoff({
        handoffId,
      });

    res.set(
      "Cache-Control",
      "no-store"
    );

    res.set(
      "Referrer-Policy",
      "no-referrer"
    );

    return res.redirect(
      302,
      redirectUrl
    );
  } catch (error) {
    return sendRouteError(
      res,
      error,
      "Unable to open secure checkout."
    );
  }
});

// =========================
// Booking Redirect
// =========================

router.get("/booking-redirect", (req, res) => {

  try {

    const {
      searchId,
      hotelId,
      offerId,
    } =
      validateBookingRedirectRequest(
        req
      );

    const {
      redirectUrl,
    } = resolveBookingRedirect({
      searchId,
      hotelId,
      offerId,
    });

    res.set(
      "Cache-Control",
      "no-store"
    );

    res.set(
      "Referrer-Policy",
      "no-referrer"
    );

    return res.redirect(
      302,
      redirectUrl
    );

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to open this booking offer."
    );

  }

});

// =========================
// Hotel Details
// =========================

router.post("/hotel-details", async (req, res) => {

  try {

    const {
      hotelId,
      searchId,
      offerId,
    } =
      validateHotelDetailsRequest(
        req
      );

    const result =
      await getHotelDetails(
        hotelId,
        searchId,
        offerId || null
      );

    return res.json({
      success:
        true,

      hotel:
        createPublicHotelDetails(
          result.hotel
        ),

      offer:
        result.offer
          ? createPublicHotelOffer(
              result.offer,
              0,
              result.hotel
            )
          : null,
    });

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to retrieve hotel details."
    );

  }

});

// =========================
// Search Status
// =========================

router.get("/search-status", async (req, res) => {

  try {

    const {
      searchId: validatedSearchId,
    } =
      validateSearchReadRequest(
        req
      );

    const searchId =
      requireSearchIdValue(
        validatedSearchId
      );

    const result =
      await getSearchStatus(searchId);

    res.set(
      "Cache-Control",
      "no-store"
    );

    return res.json(
      createPublicSearchStatus(
        result
      )
    );

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to retrieve search status.",
      {
        includeSearchLifecycle:
          true,
      }
    );

  }

});

// =========================
// Search Session
// =========================

router.get("/search-session", (req, res) => {

  try {

    const {
      searchId,
    } =
      validateSearchReadRequest(
        req
      );

    const session =
      requireSearchSession(
        searchId
      );

    res.set(
      "Cache-Control",
      "no-store"
    );

    return res.json({
      success:
        true,

      session:
        createPublicSearchSession(
          session
        ),
    });

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to retrieve search session.",
      {
        includeSearchLifecycle:
          true,
      }
    );

  }

});

module.exports = router;
