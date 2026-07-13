const crypto = require("crypto");

const SEARCH_SESSION_TTL_MS =
  30 * 60 * 1000;

const sessions = new Map();

function cloneSearchSessionData(
  value
) {
  try {
    return structuredClone(
      value
    );
  } catch (error) {
    const cloneError =
      new Error(
        "Search session data must be safely cloneable."
      );

    cloneError.code =
      "INVALID_SEARCH_SESSION_DATA";

    cloneError.cause =
      error;

    throw cloneError;
  }
}

function removeExpiredSessions() {

  const now = Date.now();

  for (const [searchId, session] of sessions.entries()) {

    if (session.expiresAt <= now) {

      sessions.delete(searchId);

    }

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

  const sessionSnapshot =
    cloneSearchSessionData(
      session
    );

  const searchId =
    sessionSnapshot.searchId ||
    createSearchId();

  const savedSession = {
    ...sessionSnapshot,

    searchId,

    createdAt:
      sessionSnapshot.createdAt ??
      now,

    updatedAt:
      now,

    expiresAt:
      now + SEARCH_SESSION_TTL_MS,

    hotels:
      Array.isArray(
        sessionSnapshot.hotels
      )
        ? sessionSnapshot.hotels
        : [],

    status:
      sessionSnapshot.status ??
      "InProgress",

    searchIncomplete:
      sessionSnapshot.searchIncomplete ??
      true,

    isContinuing:
      sessionSnapshot.isContinuing ??
      false,

    lastError:
      sessionSnapshot.lastError ??
      null,
  };

  sessions.set(
    searchId,
    savedSession
  );

  return cloneSearchSessionData(
    savedSession
  );

}

function getSearchSession(searchId) {

  removeExpiredSessions();

  if (!searchId) {

    return null;

  }

  const session =
    sessions.get(
      searchId
    );

  return session
    ? cloneSearchSessionData(
        session
      )
    : null;

}

function updateSearchSession(searchId, updates = {}) {

  if (!searchId) {

    return null;

  }

  removeExpiredSessions();

  const currentSession =
    sessions.get(
      searchId
    );

  if (!currentSession) {

    return null;

  }

  const now = Date.now();

  const updatesSnapshot =
    cloneSearchSessionData(
      updates
    );

  const updatedSession = {
    ...currentSession,
    ...updatesSnapshot,

    searchId:
      currentSession.searchId,

    createdAt:
      currentSession.createdAt,

    updatedAt:
      now,

    expiresAt:
      now + SEARCH_SESSION_TTL_MS,
  };

  sessions.set(
    searchId,
    updatedSession
  );

  return cloneSearchSessionData(
    updatedSession
  );

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