const crypto = require("crypto");

const SEARCH_SESSION_TTL_MS =
  30 * 60 * 1000;

const MAX_SEARCH_SESSIONS =
  500;

const EXPIRED_SEARCH_ID_RETENTION_MS =
  SEARCH_SESSION_TTL_MS;

const CONTINUATION_LOCK_TTL_MS =
  5 * 60 * 1000;

const SEARCH_SESSION_ID_VERSION =
  "ss1";

const SEARCH_SESSION_PROCESS_GENERATION =
  crypto
    .randomBytes(8)
    .toString("hex");

const SEARCH_SESSION_ID_PATTERN =
  /^ss1\.([a-f0-9]{16})\.([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

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

let continuationFencingNumber =
  0;

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

function getSearchIdGeneration(
  searchId
) {
  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  const match =
    SEARCH_SESSION_ID_PATTERN.exec(
      normalizedSearchId
    );

  return match
    ? match[1].toLowerCase()
    : null;
}

function isSearchIdFromPreviousProcess(
  searchId
) {
  const generation =
    getSearchIdGeneration(
      searchId
    );

  return (
    generation !== null &&
    generation !==
      SEARCH_SESSION_PROCESS_GENERATION
  );
}

function createSearchId() {

  return [
    SEARCH_SESSION_ID_VERSION,
    SEARCH_SESSION_PROCESS_GENERATION,
    crypto.randomUUID(),
  ].join(".");

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

  if (
    !sessions.has(searchId) &&
    sessions.size >=
      MAX_SEARCH_SESSIONS
  ) {
    throw createSearchSessionError({
      code:
        "SEARCH_SESSION_CAPACITY_REACHED",

      message:
        "Hotel search capacity is temporarily full. Please try again shortly.",

      status:
        503,

      retryable:
        true,

      retryAfterMs:
        1_000,
    });
  }

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

    continuationLock:
      sessionSnapshot.continuationLock ??
      null,

    continuationLockExpiresAt:
      Number.isFinite(
        Number(
          sessionSnapshot
            .continuationLockExpiresAt
        )
      )
        ? Number(
            sessionSnapshot
              .continuationLockExpiresAt
          )
        : null,

    continuationFencingNumber:
      Number.isSafeInteger(
        Number(
          sessionSnapshot
            .continuationFencingNumber
        )
      ) &&
      Number(
        sessionSnapshot
          .continuationFencingNumber
      ) > 0
        ? Number(
            sessionSnapshot
              .continuationFencingNumber
          )
        : null,

    lastError:
      sessionSnapshot.lastError ??
      null,

    retryable:
      Boolean(
        sessionSnapshot.retryable
      ),

    retryAfterMs:
      sessionSnapshot.retryAfterMs !==
        null &&
      sessionSnapshot.retryAfterMs !==
        undefined &&
      sessionSnapshot.retryAfterMs !==
        "" &&
      Number.isFinite(
        Number(
          sessionSnapshot.retryAfterMs
        )
      ) &&
      Number(
        sessionSnapshot.retryAfterMs
      ) >= 0
        ? Number(
            sessionSnapshot.retryAfterMs
          )
        : null,
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

  /*
   * Search sessions are intentionally kept in
   * process memory for the MVP. The opaque search
   * id carries a random process generation so a
   * link created before a backend restart can be
   * classified as expired instead of being confused
   * with a search id that never existed.
   */
  if (
    isSearchIdFromPreviousProcess(
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
  retryable = false,
  retryAfterMs = null,
}) {

  const error =
    new Error(
      message
    );

  error.code =
    code;

  error.status =
    status;

  error.retryable =
    retryable;

  error.retryAfterMs =
    Number.isFinite(
      Number(retryAfterMs)
    ) &&
    Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : null;

  return error;

}

function getContinuationLeaseContext(
  options = {}
) {
  const source =
    options?.continuationLease ??
    options;
  const lockToken =
    typeof source?.lockToken ===
      "string"
      ? source.lockToken
      : "";
  const fencingNumber =
    Number(source?.fencingNumber);

  if (
    !lockToken ||
    !Number.isSafeInteger(
      fencingNumber
    ) ||
    fencingNumber <= 0
  ) {
    return null;
  }

  return {
    lockToken,
    fencingNumber,
  };
}

function hasActiveContinuationLease(
  session,
  now = Date.now()
) {
  return (
    session?.isContinuing === true &&
    typeof session
      .continuationLock === "string" &&
    session.continuationLock.length > 0 &&
    Number.isFinite(
      Number(
        session.continuationLockExpiresAt
      )
    ) &&
    Number(
      session.continuationLockExpiresAt
    ) > now &&
    Number.isSafeInteger(
      Number(
        session.continuationFencingNumber
      )
    ) &&
    Number(
      session.continuationFencingNumber
    ) > 0
  );
}

function assertContinuationWriteAllowed(
  session,
  options = {}
) {
  const lease =
    getContinuationLeaseContext(
      options
    );
  const active =
    hasActiveContinuationLease(
      session
    );

  if (!lease) {
    if (!active) {
      return;
    }

    throw createSearchSessionError({
      code:
        "SEARCH_CONTINUATION_IN_PROGRESS",
      message:
        "This search continuation is already being processed.",
      status:
        409,
      retryable:
        true,
      retryAfterMs:
        250,
    });
  }

  if (
    !active ||
    session.continuationLock !==
      lease.lockToken ||
    Number(
      session.continuationFencingNumber
    ) !== lease.fencingNumber
  ) {
    throw createSearchSessionError({
      code:
        "SEARCH_CONTINUATION_LEASE_STALE",
      message:
        "This search continuation is already being processed.",
      status:
        409,
      retryable:
        true,
      retryAfterMs:
        250,
    });
  }
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

  const now =
    Date.now();

  const hasActiveLock =
    hasActiveContinuationLease(
      currentSession,
      now
    );

  if (hasActiveLock) {
    return {
      acquired:
        false,

      lockToken:
        null,

      fencingNumber:
        null,

      session:
        currentSession,
    };
  }

  const lockToken =
    crypto.randomUUID();

  continuationFencingNumber =
    Math.max(
      continuationFencingNumber,
      Number(
        currentSession
          .continuationFencingNumber
      ) || 0
    ) + 1;

  const fencingNumber =
    continuationFencingNumber;

  const internalSession =
    sessions.get(
      normalizedSearchId
    );

  const lockedSession = {
    ...internalSession,

    isContinuing:
      true,

    continuationLock:
      lockToken,

    continuationLockExpiresAt:
      now +
      CONTINUATION_LOCK_TTL_MS,

    continuationFencingNumber:
      fencingNumber,

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

    lockToken,

    fencingNumber,

    session:
      cloneSearchSessionData(
        lockedSession
      ),
  };
}

function renewSearchContinuation(
  searchId,
  lockToken,
  fencingNumber = null
) {
  const normalizedSearchId =
    normalizeSearchId(searchId);

  removeExpiredSessions();

  const currentSession =
    sessions.get(normalizedSearchId);

  const hasMatchingFence =
    fencingNumber === null ||
    fencingNumber === undefined ||
    Number(fencingNumber) ===
      Number(
        currentSession
          ?.continuationFencingNumber
      );

  if (
    !currentSession ||
    typeof lockToken !== "string" ||
    !lockToken ||
    currentSession.continuationLock !==
      lockToken ||
    !hasActiveContinuationLease(
      currentSession
    ) ||
    !hasMatchingFence
  ) {
    return {
      renewed:
        false,
      session:
        currentSession
          ? cloneSearchSessionData(
              currentSession
            )
          : null,
    };
  }

  const now = Date.now();
  const renewedSession = {
    ...currentSession,
    isContinuing:
      true,
    continuationLockExpiresAt:
      now + CONTINUATION_LOCK_TTL_MS,
    updatedAt:
      now,
    expiresAt:
      now + SEARCH_SESSION_TTL_MS,
  };

  sessions.set(
    normalizedSearchId,
    renewedSession
  );

  return {
    renewed:
      true,
    session:
      cloneSearchSessionData(
        renewedSession
      ),
  };
}

function releaseSearchContinuation(
  searchId,
  lockToken,
  updates = {},
  options = {}
) {
  const normalizedSearchId =
    normalizeSearchId(
      searchId
    );

  if (
    !normalizedSearchId ||
    typeof lockToken !== "string" ||
    lockToken.length === 0
  ) {
    return {
      released:
        false,

      session:
        getSearchSession(
          normalizedSearchId
        ),
    };
  }

  removeExpiredSessions();

  const currentSession =
    sessions.get(
      normalizedSearchId
    );

  if (!currentSession) {
    return {
      released:
        false,

      session:
        null,
    };
  }

  if (
    currentSession
      .continuationLock !==
    lockToken ||
    !hasActiveContinuationLease(
      currentSession
    ) ||
    (
      options?.fencingNumber !==
        undefined &&
      options?.fencingNumber !==
        null &&
      Number(
        currentSession
          .continuationFencingNumber
      ) !==
        Number(
          options.fencingNumber
        )
    )
  ) {
    return {
      released:
        false,

      session:
        cloneSearchSessionData(
          currentSession
        ),
    };
  }

  const now =
    Date.now();

  const updatesSnapshot =
    cloneSearchSessionData(
      updates
    );

  const releasedSession = {
    ...currentSession,
    ...updatesSnapshot,

    searchId:
      currentSession.searchId,

    createdAt:
      currentSession.createdAt,

    isContinuing:
      false,

    continuationLock:
      null,

    continuationLockExpiresAt:
      null,

    updatedAt:
      now,

    expiresAt:
      now +
      SEARCH_SESSION_TTL_MS,
  };

  sessions.set(
    normalizedSearchId,
    releasedSession
  );

  return {
    released:
      true,

    session:
      cloneSearchSessionData(
        releasedSession
      ),
  };
}

function updateSearchSession(
  searchId,
  updates = {},
  options = {}
) {

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

  assertContinuationWriteAllowed(
    currentSession,
    options
  );

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
  hotels = [],
  options = {}
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
  }, options);

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
  MAX_SEARCH_SESSIONS,
  EXPIRED_SEARCH_ID_RETENTION_MS,
  CONTINUATION_LOCK_TTL_MS,
  SEARCH_SESSION_ID_VERSION,
  SEARCH_SESSION_STATES,
  saveSearchSession,
  getSearchSession,
  getSearchSessionState,
  requireSearchSession,
  tryAcquireSearchContinuation,
  renewSearchContinuation,
  releaseSearchContinuation,
  updateSearchSession,
  appendHotelsToSearchSession,
  clearSearchSession,
  getSearchSessionCount,
};
