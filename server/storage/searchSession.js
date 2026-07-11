const crypto = require("crypto");

const SEARCH_SESSION_TTL_MS =
  30 * 60 * 1000;

const sessions = new Map();

let latestSearchId = null;

function removeExpiredSessions() {

  const now = Date.now();

  for (const [searchId, session] of sessions.entries()) {

    if (session.expiresAt <= now) {

      sessions.delete(searchId);

      if (latestSearchId === searchId) {

        latestSearchId = null;

      }

    }

  }

  if (!latestSearchId && sessions.size > 0) {

    const remainingSearchIds =
      Array.from(sessions.keys());

    latestSearchId =
      remainingSearchIds[remainingSearchIds.length - 1];

  }

}

function createSearchId() {

  return crypto.randomUUID();

}

function saveSearchSession(session) {

  if (!session || typeof session !== "object") {

    throw new Error(
      "Unable to save search session: invalid session."
    );

  }

  removeExpiredSessions();

  const now = Date.now();

  const searchId =
    session.searchId || createSearchId();

  const savedSession = {
    ...session,

    searchId,

    createdAt:
      session.createdAt ?? now,

    updatedAt:
      now,

    expiresAt:
      now + SEARCH_SESSION_TTL_MS,

    hotels:
      Array.isArray(session.hotels)
        ? session.hotels
        : [],

    status:
      session.status ?? "InProgress",

    searchIncomplete:
      session.searchIncomplete ?? true,

    isContinuing:
      session.isContinuing ?? false,

    lastError:
      session.lastError ?? null,
  };

  sessions.set(searchId, savedSession);

  latestSearchId = searchId;

  return savedSession;

}

function getSearchSession(searchId) {

  removeExpiredSessions();

  if (!searchId) {

    return null;

  }

  return sessions.get(searchId) ?? null;

}

function updateSearchSession(searchId, updates = {}) {

  if (!searchId) {

    return null;

  }

  removeExpiredSessions();

  const currentSession =
    sessions.get(searchId);

  if (!currentSession) {

    return null;

  }

  const now = Date.now();

  const updatedSession = {
    ...currentSession,
    ...updates,

    searchId:
      currentSession.searchId,

    createdAt:
      currentSession.createdAt,

    updatedAt:
      now,

    expiresAt:
      now + SEARCH_SESSION_TTL_MS,
  };

  sessions.set(searchId, updatedSession);

  latestSearchId = searchId;

  return updatedSession;

}

function appendHotelsToSearchSession(
  searchId,
  hotels = []
) {

  if (!Array.isArray(hotels)) {

    return getSearchSession(searchId);

  }

  const currentSession =
    getSearchSession(searchId);

  if (!currentSession) {

    return null;

  }

  const hotelsById = new Map();

  for (const hotel of currentSession.hotels ?? []) {

    if (hotel?.id) {

      hotelsById.set(hotel.id, hotel);

    }

  }

  for (const hotel of hotels) {

    if (hotel?.id) {

      hotelsById.set(hotel.id, hotel);

    }

  }

  const mergedHotels =
    Array.from(hotelsById.values());

  return updateSearchSession(searchId, {
    hotels: mergedHotels,
    totalHotels: mergedHotels.length,
  });

}

function clearSearchSession(searchId) {

  if (!searchId) {

    return;

  }

  sessions.delete(searchId);

  if (latestSearchId === searchId) {

    const remainingSearchIds =
      Array.from(sessions.keys());

    latestSearchId =
      remainingSearchIds.length > 0
        ? remainingSearchIds[remainingSearchIds.length - 1]
        : null;

  }

}

function getSearchSessionCount() {

  removeExpiredSessions();

  return sessions.size;

}

module.exports = {
  saveSearchSession,
  getSearchSession,
  updateSearchSession,
  appendHotelsToSearchSession,
  clearSearchSession,
  getSearchSessionCount,
};