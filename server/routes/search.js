const express = require("express");

const router = express.Router();

const {
  getSearchSession,
} = require("../storage/searchSession");

const {
  searchDestinations,
  searchHotels,
  continueHotelSearch,
  getHotelDetails,
  getSearchStatus,
} = require("../services/stayService");

function getSearchIdFromRequest(req) {

  const searchId =
    typeof req.query.searchId === "string"
      ? req.query.searchId.trim()
      : "";

  return searchId || null;

}

function sendRouteError(res, error, fallbackMessage) {

  console.error(fallbackMessage);
  console.error("Status:", error.response?.status);
  console.error("Data:", error.response?.data);
  console.error("Message:", error.message);

  return res
    .status(error.response?.status || 500)
    .json({
      success: false,
      message: fallbackMessage,
      error: error.message,
      details: error.response?.data ?? null,
    });

}

function createPublicSearchSession(session) {

  return {
    searchId:
      session.searchId,

    status:
      session.status ?? null,

    searchIncomplete:
      session.searchIncomplete ?? false,

    isContinuing:
      session.isContinuing ?? false,

    currency:
      session.currency ?? null,

    nextResultsKey:
      session.nextResultsKey ?? null,

    totalHotels:
      session.hotels?.length ?? session.totalHotels ?? 0,

    hotels:
      session.hotels ?? [],

    lastError:
      session.lastError ?? null,

    createdAt:
      session.createdAt ?? null,

    updatedAt:
      session.updatedAt ?? null,
  };

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

    const results =
      await searchHotels(req.body);

    return res.json(results);

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to search hotels."
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
        message: "searchId is required.",
      });

    }

    const result =
      await continueHotelSearch(searchId);

    return res.json(result);

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to continue hotel search."
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
        message: "hotelId is required.",
      });

    }

    if (!searchId) {

      return res.status(400).json({
        success: false,
        message: "searchId is required.",
      });

    }

    const result =
      await getHotelDetails(
        hotelId,
        searchId
      );

    return res.json(result);

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
        message: "searchId is required.",
      });

    }

    const result =
      await getSearchStatus(searchId);

    return res.json(result);

  } catch (error) {

    return sendRouteError(
      res,
      error,
      "Unable to retrieve search status."
    );

  }

});

// =========================
// Search Session
// =========================

router.get("/search-session", (req, res) => {

  const searchId =
    getSearchIdFromRequest(req);

  if (!searchId) {

    return res.status(400).json({
      success: false,
      message: "searchId is required.",
    });

  }

  const session =
    getSearchSession(searchId);

  if (!session) {

    return res.status(404).json({
      success: false,
      message: "No active search session.",
    });

  }

  return res.json({
    success: true,
    session: createPublicSearchSession(session),
  });

});

module.exports = router;