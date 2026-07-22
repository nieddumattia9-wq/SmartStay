export type SearchRecoveryKind =
  | "session-expired"
  | "session-missing"
  | "invalid-link"
  | "offline"
  | "network"
  | "timeout"
  | "temporarily-unavailable"
  | "unknown";

export interface SearchRecoveryDecision {
  kind: SearchRecoveryKind;
  message: string;
  retryable: boolean;
  clearStoredSearchState: boolean;
  recognized: boolean;
}

type ErrorCarrier = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

function getErrorCarrier(
  error: unknown
): ErrorCarrier {
  return error &&
    typeof error === "object" &&
    !Array.isArray(error)
    ? error as ErrorCarrier
    : {};
}

function normalizeErrorCode(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function normalizeErrorStatus(
  value: unknown
) {
  const status =
    Number(
      value
    );

  return Number.isInteger(
    status
  )
    ? status
    : null;
}

export function getSearchRecoveryDecision(
  error: unknown,
  fallbackMessage =
    "Unable to continue this search."
): SearchRecoveryDecision {
  const source =
    getErrorCarrier(
      error
    );

  const code =
    normalizeErrorCode(
      source.code
    );

  const status =
    normalizeErrorStatus(
      source.status
    );

  if (
    code ===
      "SEARCH_SESSION_EXPIRED" ||
    status === 410
  ) {
    return {
      kind:
        "session-expired",
      message:
        "This search has expired. Start a new search to refresh availability.",
      retryable:
        false,
      clearStoredSearchState:
        true,
      recognized:
        true,
    };
  }

  if (
    code ===
      "SEARCH_SESSION_NOT_FOUND" ||
    code ===
      "SEARCH_SESSION_MISSING" ||
    status === 404
  ) {
    return {
      kind:
        "session-missing",
      message:
        "These search results are no longer available. The server may have restarted, so please start a new search.",
      retryable:
        false,
      clearStoredSearchState:
        true,
      recognized:
        true,
    };
  }

  if (
    code ===
      "SEARCH_ID_REQUIRED" ||
    (
      status === 400 &&
      !code
    )
  ) {
    return {
      kind:
        "invalid-link",
      message:
        "This search link is not valid. Please start a new search.",
      retryable:
        false,
      clearStoredSearchState:
        true,
      recognized:
        true,
    };
  }

  if (
    code ===
      "NETWORK_OFFLINE"
  ) {
    return {
      kind:
        "offline",
      message:
        "You appear to be offline. Reconnect and try again.",
      retryable:
        true,
      clearStoredSearchState:
        false,
      recognized:
        true,
    };
  }

  if (
    code ===
      "NETWORK_ERROR"
  ) {
    return {
      kind:
        "network",
      message:
        "SmartStay could not be reached. Check your connection and try again.",
      retryable:
        true,
      clearStoredSearchState:
        false,
      recognized:
        true,
    };
  }

  if (
    code ===
      "REQUEST_TIMEOUT" ||
    status === 408
  ) {
    return {
      kind:
        "timeout",
      message:
        "SmartStay took too long to respond. Try again.",
      retryable:
        true,
      clearStoredSearchState:
        false,
      recognized:
        true,
    };
  }

  if (
    status !== null &&
    status >= 500 &&
    status <= 599
  ) {
    return {
      kind:
        "temporarily-unavailable",
      message:
        "SmartStay is temporarily unavailable. Try again shortly.",
      retryable:
        true,
      clearStoredSearchState:
        false,
      recognized:
        true,
    };
  }

  return {
    kind:
      "unknown",
    message:
      fallbackMessage,
    retryable:
      false,
    clearStoredSearchState:
      false,
    recognized:
      false,
  };
}
