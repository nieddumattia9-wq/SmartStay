const crypto = require("crypto");

const SEARCH_SESSION_TTL_MS =
  30 * 60 * 1000;

const EXPIRED_SEARCH_ID_RETENTION_MS =
  SEARCH_SESSION_TTL_MS;

const SEARCH_SESSION_STATES =
  Object.freeze({
    MISSING:
      "missing",

    ACTIVE:
      "active",

    EXPIRED:
      "expired",

    NOT_FOUND:
      "not_found",
  });

const sessions = new Map();

const expiredSearchIds =
  new Map();

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

  for (
    const [
      searchId,
      session,
    ] of sessions.entries()
  ) {

    if (
      session.expiresAt <=
      now
    ) {

      sessions.delete(
        searchId
      );

      expiredSearchIds.set(
        searchId,
        now +
          EXPIRED_SEARCH_ID_RETENTION_MS
      );

    }

  }

  for (
    const [
      searchId,
      retentionExpiresAt,
    ] of expiredSearchIds.entries()
  ) {

    if (
      retentionExpiresAt <=
      now
    ) {

      expiredSearchIds.delete(
        searchId
      );

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

  expiredSearchIds.delete(
    searchId
  );

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

function normalizeSearchId(
  searchId
) {

  return typeof searchId ===
    "string"
    ? searchId.trim()
    : "";

}

function getSearchSessionState(
  searchId
) {

  removeExpiredSessions();

  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  if (!normalizedSearchId) {

    return SEARCH_SESSION_STATES
      .MISSING;

  }

  if (
    sessions.has(
      normalizedSearchId
    )
  ) {

    return SEARCH_SESSION_STATES
      .ACTIVE;

  }

  if (
    expiredSearchIds.has(
      normalizedSearchId
    )
  ) {

    return SEARCH_SESSION_STATES
      .EXPIRED;

  }

  return SEARCH_SESSION_STATES
    .NOT_FOUND;

}

function createSearchSessionError({
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

function getSearchSession(searchId) {

  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  if (
    getSearchSessionState(
      normalizedSearchId
    ) !==
    SEARCH_SESSION_STATES
      .ACTIVE
  ) {

    return null;

  }

  return cloneSearchSessionData(
    sessions.get(
      normalizedSearchId
    )
  );

}

function requireSearchSession(
  searchId
) {

  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  const state =
    getSearchSessionState(
      normalizedSearchId
    );

  if (
    state ===
    SEARCH_SESSION_STATES
      .MISSING
  ) {

    throw createSearchSessionError({
      code:
        "SEARCH_ID_REQUIRED",

      message:
        "searchId is required.",

      status:
        400,
    });

  }

  if (
    state ===
    SEARCH_SESSION_STATES
      .EXPIRED
  ) {

    throw createSearchSessionError({
      code:
        "SEARCH_SESSION_EXPIRED",

      message:
        "This search session has expired. Start a new search.",

      status:
        410,
    });

  }

  if (
    state ===
    SEARCH_SESSION_STATES
      .NOT_FOUND
  ) {

    throw createSearchSessionError({
      code:
        "SEARCH_SESSION_NOT_FOUND",

      message:
        "The requested search session was not found.",

      status:
        404,
    });

  }

  return cloneSearchSessionData(
    sessions.get(
      normalizedSearchId
    )
  );

}

function tryAcquireSearchContinuation(
  searchId
) {

  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  const currentSession =
    requireSearchSession(
      normalizedSearchId
    );

  if (
    currentSession.isContinuing
  ) {

    return {
      acquired:
        false,

      session:
        currentSession,
    };

  }

  const now =
    Date.now();

  const internalSession =
    sessions.get(
      normalizedSearchId
    );

  const lockedSession = {
    ...internalSession,

    isContinuing:
      true,

    lastError:
      null,

    updatedAt:
      now,

    expiresAt:
      now +
      SEARCH_SESSION_TTL_MS,
  };

  sessions.set(
    normalizedSearchId,
    lockedSession
  );

  return {
    acquired:
      true,

    session:
      cloneSearchSessionData(
        lockedSession
      ),
  };

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

  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  if (!normalizedSearchId) {

    return;

  }

  sessions.delete(
    normalizedSearchId
  );

  expiredSearchIds.delete(
    normalizedSearchId
  );

}

function getSearchSessionCount() {

  removeExpiredSessions();

  return sessions.size;

}

module.exports = {
  SEARCH_SESSION_TTL_MS,
  EXPIRED_SEARCH_ID_RETENTION_MS,
  SEARCH_SESSION_STATES,
  saveSearchSession,
  getSearchSession,
  getSearchSessionState,
  requireSearchSession,
  tryAcquireSearchContinuation,
  updateSearchSession,
  appendHotelsToSearchSession,
  clearSearchSession,
  getSearchSessionCount,
};