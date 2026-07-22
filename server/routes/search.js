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

function getSearchIdFromRequest(req) {

  const searchId =
    typeof req.query.searchId === "string"
      ? req.query.searchId.trim()
      : "";

  return searchId || null;

}

const PUBLIC_ROUTE_ERROR_CODES =
  new Set([
    "SEARCH_ID_REQUIRED",
    "SEARCH_SESSION_NOT_FOUND",
    "SEARCH_SESSION_EXPIRED",
    "IDEMPOTENCY_KEY_REQUIRED",
    "IDEMPOTENCY_KEY_INVALID",
    "IDEMPOTENCY_PAYLOAD_INVALID",
    "IDEMPOTENCY_KEY_CONFLICT",
    "IDEMPOTENCY_CAPACITY_REACHED",
    "HOTEL_ID_REQUIRED",
    "HOTEL_NOT_IN_SEARCH",
    "OFFER_ID_REQUIRED",
    "OFFER_ID_INVALID",
    "OFFER_NOT_IN_HOTEL",
    "OFFER_NOT_BOOKABLE",
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
    includeSearchLifecycle
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

  console.error(
    fallbackMessage
  );

  console.error(
    "Status:",
    status
  );

  console.error(
    "Code:",
    error?.code
  );

  console.error(
    "Data:",
    error?.response?.data
  );

  console.error(
    "Message:",
    error?.message
  );

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

    const query =
      typeof req.body.query === "string"
        ? req.body.query.trim()
        : "";

    if (!query) {

      return res.status(400).json({
        success: false,
        message: "Missing search query.",
      });

    }

    if (query.length < 2) {

      return res.status(400).json({
        success: false,
        message: "Search query must contain at least 2 characters.",
      });

    }

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

    if (!req.body || typeof req.body !== "object") {

      return res.status(400).json({
        success: false,
        message: "Missing hotel search payload.",
      });

    }

    const idempotencyResult =
      await executeInitialSearchIdempotently({
        idempotencyKey:
          req.get(
            "Idempotency-Key"
          ),

        payload:
          req.body,

        execute:
          async () => {
            const results =
              await searchHotels(
                req.body
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

    const searchId =
      typeof req.body.searchId === "string"
        ? req.body.searchId.trim()
        : "";

    if (!searchId) {

      return res.status(400).json({
        success: false,
        code: "SEARCH_ID_REQUIRED",
        message: "searchId is required.",
      });

    }

    const result =
      await continueHotelSearch(searchId);

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
// Booking Redirect
// =========================

router.get("/booking-redirect", (req, res) => {

  try {

    const searchId =
      typeof req.query.searchId ===
        "string"
        ? req.query.searchId.trim()
        : "";

    const hotelId =
      typeof req.query.hotelId ===
        "string"
        ? req.query.hotelId.trim()
        : "";

    const offerId =
      typeof req.query.offerId ===
        "string"
        ? req.query.offerId.trim()
        : "";

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

    if (
      !req.body ||
      typeof req.body !== "object"
    ) {

      return res.status(400).json({
        success: false,
        message: "Missing hotel details payload.",
      });

    }

    const hotelId =
      typeof req.body.hotelId === "string"
        ? req.body.hotelId.trim()
        : "";

    const searchId =
      typeof req.body.searchId === "string"
        ? req.body.searchId.trim()
        : "";

    if (!hotelId) {

      return res.status(400).json({
        success: false,
        code: "HOTEL_ID_REQUIRED",
        message: "hotelId is required.",
      });

    }

    if (!searchId) {

      return res.status(400).json({
        success: false,
        code: "SEARCH_ID_REQUIRED",
        message: "searchId is required.",
      });

    }

    const result =
      await getHotelDetails(
        hotelId,
        searchId
      );

    return res.json({
      success:
        true,

      hotel:
        createPublicHotelDetails(
          result.hotel
        ),
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

    const searchId =
      getSearchIdFromRequest(req);

    if (!searchId) {

      return res.status(400).json({
        success: false,
        code: "SEARCH_ID_REQUIRED",
        message: "searchId is required.",
      });

    }

    const result =
      await getSearchStatus(searchId);

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

    const searchId =
      getSearchIdFromRequest(
        req
      );

    const session =
      requireSearchSession(
        searchId
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
