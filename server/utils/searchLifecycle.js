const SEARCH_LIFECYCLE_PHASES =
  Object.freeze({
    STARTING: "starting",
    RUNNING: "running",
    COMPLETE: "complete",
  });

const SEARCH_LIFECYCLE_OUTCOMES =
  Object.freeze({
    PENDING: "pending",
    RESULTS: "results",
    NO_RESULTS: "no-results",
    PARTIAL_RESULTS: "partial-results",
    PROVIDER_ERROR: "provider-error",
    TIMEOUT: "timeout",
    RATE_LIMITED: "rate-limited",
    SESSION_EXPIRED: "session-expired",
    SESSION_MISSING: "session-missing",
    CANCELLED: "cancelled",
  });

const SEARCH_PUBLIC_CODES =
  Object.freeze({
    PENDING: "SEARCH_PENDING",
    RESULTS_READY: "SEARCH_RESULTS_READY",
    NO_RESULTS: "SEARCH_NO_RESULTS",
    PARTIAL_RESULTS: "SEARCH_PARTIAL_RESULTS",
    PROVIDER_ERROR: "SEARCH_PROVIDER_ERROR",
    PROVIDER_UNAVAILABLE: "SEARCH_PROVIDER_UNAVAILABLE",
    TIMEOUT: "SEARCH_TIMEOUT",
    RATE_LIMITED: "SEARCH_RATE_LIMITED",
    SESSION_EXPIRED: "SEARCH_SESSION_EXPIRED",
    SESSION_MISSING: "SEARCH_SESSION_MISSING",
    CANCELLED: "SEARCH_CANCELLED",
  });

const PUBLIC_MESSAGES =
  Object.freeze({
    [SEARCH_PUBLIC_CODES.NO_RESULTS]:
      "No stays were found for this destination, dates and guest configuration.",

    [SEARCH_PUBLIC_CODES.PARTIAL_RESULTS]:
      "Some stays were found, but the search could not be completed. The available results are shown below.",

    [SEARCH_PUBLIC_CODES.PROVIDER_ERROR]:
      "We could not retrieve reliable results for this search. Please try again.",

    [SEARCH_PUBLIC_CODES.PROVIDER_UNAVAILABLE]:
      "Accommodation search is temporarily unavailable. Please try again shortly.",

    [SEARCH_PUBLIC_CODES.TIMEOUT]:
      "The accommodation search took too long to complete. Please try again.",

    [SEARCH_PUBLIC_CODES.RATE_LIMITED]:
      "Search is temporarily rate limited. Please try again shortly.",

    [SEARCH_PUBLIC_CODES.SESSION_EXPIRED]:
      "This search has expired. Please start a new search.",

    [SEARCH_PUBLIC_CODES.SESSION_MISSING]:
      "These search results are no longer available. Please start a new search.",

    [SEARCH_PUBLIC_CODES.CANCELLED]:
      "This search was cancelled.",
  });

function normalizeText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeCode(value) {
  const text = normalizeText(value);

  if (text) {
    return text.toUpperCase();
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  return "";
}

function normalizeStatus(value) {
  return normalizeText(value)
    .toLowerCase();
}

function getHotelsCount(payload) {
  if (Array.isArray(payload?.hotels)) {
    return payload.hotels.length;
  }

  const totalHotels =
    Number(payload?.totalHotels);

  return Number.isFinite(totalHotels) &&
    totalHotels > 0
    ? totalHotels
    : 0;
}

function getAttempts(payload) {
  return Array.isArray(payload?.attempts)
    ? payload.attempts
    : [];
}

function hasAttemptStatus(
  attempts,
  expectedStatus
) {
  return attempts.some((attempt) =>
    Number(attempt?.status) ===
    expectedStatus
  );
}

function hasAttemptOutcome(
  attempts,
  expectedOutcomes
) {
  const allowed =
    new Set(expectedOutcomes);

  return attempts.some((attempt) =>
    allowed.has(
      normalizeStatus(
        attempt?.outcome
      )
    )
  );
}

function getRetryAfterMs(payload) {
  const directValue =
    Number(payload?.retryAfterMs);

  if (
    Number.isFinite(directValue) &&
    directValue >= 0
  ) {
    return directValue;
  }

  for (const attempt of getAttempts(payload)) {
    const attemptValue =
      Number(attempt?.retryAfterMs);

    if (
      Number.isFinite(attemptValue) &&
      attemptValue >= 0
    ) {
      return attemptValue;
    }
  }

  return null;
}

function resolveRetryable(
  payload,
  fallbackValue
) {
  return typeof payload?.retryable ===
    "boolean"
    ? payload.retryable
    : fallbackValue;
}

function createLifecycle({
  phase,
  outcome,
  retryable,
  publicCode,
  retryAfterMs = null,
}) {
  return Object.freeze({
    phase,
    outcome,
    retryable: Boolean(retryable),
    publicCode,
    retryAfterMs:
      Number.isFinite(retryAfterMs) &&
      retryAfterMs >= 0
        ? retryAfterMs
        : null,
  });
}

function deriveSearchLifecycle(
  payload = {}
) {
  const status =
    normalizeStatus(
      payload.status ??
      payload.result?.status
    );

  const code =
    normalizeCode(payload.code);

  const attempts =
    getAttempts(payload);

  const hotelsCount =
    getHotelsCount(payload);

  const retryAfterMs =
    getRetryAfterMs(payload);

  const success =
    payload.success === true;

  const failed =
    payload.success === false ||
    status === "failed";

  const completed =
    status === "completed";

  const running =
    status === "inprogress" ||
    status === "in-progress" ||
    status === "running" ||
    payload.searchIncomplete === true ||
    payload.isContinuing === true ||
    Boolean(payload.continuation);

  const isSessionExpired =
    code ===
      "SEARCH_SESSION_EXPIRED" ||
    Number(payload.httpStatus) === 410;

  if (isSessionExpired) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .SESSION_EXPIRED,
      retryable: false,
      publicCode:
        SEARCH_PUBLIC_CODES
          .SESSION_EXPIRED,
    });
  }

  const isSessionMissing =
    code ===
      "SEARCH_SESSION_NOT_FOUND" ||
    code ===
      "SEARCH_ID_REQUIRED" ||
    Number(payload.httpStatus) === 404 ||
    Number(payload.httpStatus) === 400;

  if (isSessionMissing) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .SESSION_MISSING,
      retryable: false,
      publicCode:
        SEARCH_PUBLIC_CODES
          .SESSION_MISSING,
    });
  }

  const isNoResults =
    code === "204" ||
    code === "NO_RESULTS" ||
    code === "SEARCH_NO_RESULTS" ||
    (
      completed &&
      hotelsCount === 0 &&
      !failed
    );

  if (isNoResults) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .NO_RESULTS,
      retryable: false,
      publicCode:
        SEARCH_PUBLIC_CODES
          .NO_RESULTS,
    });
  }

  if (
    failed &&
    hotelsCount > 0
  ) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .PARTIAL_RESULTS,
      retryable:
        resolveRetryable(
          payload,
          true
        ),
      publicCode:
        SEARCH_PUBLIC_CODES
          .PARTIAL_RESULTS,
      retryAfterMs,
    });
  }

  const isRateLimited =
    Number(payload.httpStatus) === 429 ||
    code === "429" ||
    code === "RATE_LIMITED" ||
    code === "PROVIDER_RATE_LIMITED" ||
    hasAttemptStatus(
      attempts,
      429
    ) ||
    hasAttemptOutcome(
      attempts,
      [
        "rate_limited",
        "rate-limited",
      ]
    );

  if (failed && isRateLimited) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .RATE_LIMITED,
      retryable:
        resolveRetryable(
          payload,
          true
        ),
      publicCode:
        SEARCH_PUBLIC_CODES
          .RATE_LIMITED,
      retryAfterMs,
    });
  }

  const isTimeout =
    Number(payload.httpStatus) === 408 ||
    Number(payload.httpStatus) === 504 ||
    code === "REQUEST_TIMEOUT" ||
    code === "PROVIDER_TIMEOUT" ||
    code === "SEARCH_TIMEOUT" ||
    hasAttemptOutcome(
      attempts,
      ["timeout"]
    );

  if (failed && isTimeout) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .TIMEOUT,
      retryable:
        resolveRetryable(
          payload,
          true
        ),
      publicCode:
        SEARCH_PUBLIC_CODES
          .TIMEOUT,
      retryAfterMs,
    });
  }

  const isUnavailable =
    code ===
      "NO_PROVIDER_RETURNED_RESULTS" ||
    code ===
      "PROVIDER_UNAVAILABLE" ||
    code ===
      "PROVIDER_CIRCUIT_OPEN" ||
    hasAttemptOutcome(
      attempts,
      [
        "unavailable",
        "circuit_open",
        "circuit-open",
      ]
    );

  if (failed && isUnavailable) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .PROVIDER_ERROR,
      retryable:
        resolveRetryable(
          payload,
          true
        ),
      publicCode:
        SEARCH_PUBLIC_CODES
          .PROVIDER_UNAVAILABLE,
      retryAfterMs,
    });
  }

  if (failed) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .PROVIDER_ERROR,
      retryable:
        resolveRetryable(
          payload,
          true
        ),
      publicCode:
        SEARCH_PUBLIC_CODES
          .PROVIDER_ERROR,
      retryAfterMs,
    });
  }

  if (
    completed &&
    hotelsCount > 0
  ) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .RESULTS,
      retryable: false,
      publicCode:
        SEARCH_PUBLIC_CODES
          .RESULTS_READY,
    });
  }

  if (running) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .RUNNING,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .PENDING,
      retryable:
        resolveRetryable(
          payload,
          retryAfterMs !== null
        ),
      publicCode:
        SEARCH_PUBLIC_CODES
          .PENDING,
      retryAfterMs,
    });
  }

  if (
    success &&
    hotelsCount > 0
  ) {
    return createLifecycle({
      phase:
        SEARCH_LIFECYCLE_PHASES
          .COMPLETE,
      outcome:
        SEARCH_LIFECYCLE_OUTCOMES
          .RESULTS,
      retryable: false,
      publicCode:
        SEARCH_PUBLIC_CODES
          .RESULTS_READY,
    });
  }

  return createLifecycle({
    phase:
      SEARCH_LIFECYCLE_PHASES
        .STARTING,
    outcome:
      SEARCH_LIFECYCLE_OUTCOMES
        .PENDING,
    retryable: false,
    publicCode:
      SEARCH_PUBLIC_CODES
        .PENDING,
  });
}

function getPublicLifecycleMessage(
  lifecycle
) {
  return (
    PUBLIC_MESSAGES[
      lifecycle?.publicCode
    ] ??
    null
  );
}

function isLifecycleFailure(
  lifecycle
) {
  return new Set([
    SEARCH_LIFECYCLE_OUTCOMES
      .PROVIDER_ERROR,
    SEARCH_LIFECYCLE_OUTCOMES
      .TIMEOUT,
    SEARCH_LIFECYCLE_OUTCOMES
      .RATE_LIMITED,
    SEARCH_LIFECYCLE_OUTCOMES
      .SESSION_EXPIRED,
    SEARCH_LIFECYCLE_OUTCOMES
      .SESSION_MISSING,
    SEARCH_LIFECYCLE_OUTCOMES
      .CANCELLED,
  ]).has(
    lifecycle?.outcome
  );
}

module.exports = {
  SEARCH_LIFECYCLE_PHASES,
  SEARCH_LIFECYCLE_OUTCOMES,
  SEARCH_PUBLIC_CODES,
  deriveSearchLifecycle,
  getPublicLifecycleMessage,
  isLifecycleFailure,
};
