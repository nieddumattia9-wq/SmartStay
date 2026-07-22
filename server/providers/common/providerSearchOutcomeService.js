const {
  extractRetryAfterMs,
  isRateLimitedProviderFailure,
  resolveProviderRetryPolicy,
} = require(
  "./providerRetryPolicy"
);

const PROVIDER_SEARCH_OUTCOMES = {
  SUCCESS: "success",
  NO_RESULTS: "no_results",
  ERROR: "error",
  TIMEOUT: "timeout",
  RATE_LIMITED: "rate_limited",
  UNAVAILABLE: "unavailable",
  CIRCUIT_OPEN: "circuit_open",
};

const TIMEOUT_ERROR_CODES =
  new Set([
    "ECONNABORTED",
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "PROVIDER_TIMEOUT",
  ]);

const UNAVAILABLE_ERROR_CODES =
  new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
  ]);

function normalizeStatus(value) {
  const parsedValue =
    Number(value);

  return Number.isInteger(parsedValue)
    ? parsedValue
    : null;
}

function getProviderErrorStatus(error) {
  return normalizeStatus(
    error?.status ??
    error?.response?.status
  );
}

function getProviderErrorCode(error) {
  const code =
    error?.code ??
    error?.response?.data?.code ??
    null;

  return code === null ||
    code === undefined
    ? null
    : String(code);
}

function getProviderErrorMessage(error) {
  return (
    error?.message ??
    error?.response?.data?.message ??
    "Provider search failed."
  );
}

function isProviderNoResultsResponse(
  failedResponse
) {
  return (
    failedResponse?.code === 204 ||
    failedResponse?.code === "204" ||
    failedResponse?.code ===
      "NO_RESULTS"
  );
}

function isRateLimitError(error) {
  return isRateLimitedProviderFailure({
    status:
      getProviderErrorStatus(error),
    code:
      getProviderErrorCode(error),
    outcome:
      error?.outcome,
  });
}

function isTimeoutError(error) {
  const status =
    getProviderErrorStatus(error);

  if (
    status === 408 ||
    status === 504
  ) {
    return true;
  }

  const code =
    getProviderErrorCode(error);

  if (
    code &&
    TIMEOUT_ERROR_CODES.has(
      code.toUpperCase()
    )
  ) {
    return true;
  }

  const message =
    getProviderErrorMessage(error)
      .toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("timed out")
  );
}

function isUnavailableError(error) {
  const status =
    getProviderErrorStatus(error);

  if (
    status !== null &&
    status >= 500
  ) {
    return true;
  }

  const code =
    getProviderErrorCode(error);

  return Boolean(
    code &&
    UNAVAILABLE_ERROR_CODES.has(
      code.toUpperCase()
    )
  );
}

function classifyProviderException(
  error
) {
  if (isRateLimitError(error)) {
    return PROVIDER_SEARCH_OUTCOMES
      .RATE_LIMITED;
  }

  if (isTimeoutError(error)) {
    return PROVIDER_SEARCH_OUTCOMES
      .TIMEOUT;
  }

  if (isUnavailableError(error)) {
    return PROVIDER_SEARCH_OUTCOMES
      .UNAVAILABLE;
  }

  return PROVIDER_SEARCH_OUTCOMES
    .ERROR;
}

function classifyProviderResult(
  result
) {
  if (!result) {
    return PROVIDER_SEARCH_OUTCOMES
      .ERROR;
  }

  const hotels =
    Array.isArray(result.hotels)
      ? result.hotels
      : [];

  if (
    !result.failedResponse &&
    hotels.length > 0
  ) {
    return PROVIDER_SEARCH_OUTCOMES
      .SUCCESS;
  }

  if (
    result.failedResponse &&
    isProviderNoResultsResponse(
      result.failedResponse
    )
  ) {
    return PROVIDER_SEARCH_OUTCOMES
      .NO_RESULTS;
  }

  if (result.failedResponse) {
    const code =
      String(
        result.failedResponse.code ??
        ""
      ).toUpperCase();

    const status =
      normalizeStatus(
        result.failedResponse.status
      );

    if (
      isRateLimitedProviderFailure({
        status,
        code,
        outcome:
          result.failedResponse
            .outcome,
      })
    ) {
      return PROVIDER_SEARCH_OUTCOMES
        .RATE_LIMITED;
    }

    if (
      status === 408 ||
      status === 504 ||
      code === "PROVIDER_TIMEOUT"
    ) {
      return PROVIDER_SEARCH_OUTCOMES
        .TIMEOUT;
    }

    if (
      code ===
        "PROVIDER_UNAVAILABLE" ||
      code ===
        "PROVIDER_CIRCUIT_OPEN"
    ) {
      return code ===
        "PROVIDER_CIRCUIT_OPEN"
        ? PROVIDER_SEARCH_OUTCOMES
            .CIRCUIT_OPEN
        : PROVIDER_SEARCH_OUTCOMES
            .UNAVAILABLE;
    }

    return PROVIDER_SEARCH_OUTCOMES
      .ERROR;
  }

  return PROVIDER_SEARCH_OUTCOMES
    .ERROR;
}

function isProviderHealthyOutcome(
  outcome
) {
  return (
    outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS ||
    outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .NO_RESULTS
  );
}

function shouldCountProviderFailure(
  outcome
) {
  return (
    outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .ERROR ||
    outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .TIMEOUT ||
    outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .RATE_LIMITED ||
    outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .UNAVAILABLE
  );
}

function createProviderFailureDetails(
  error
) {
  const errorType =
    classifyProviderException(
      error
    );

  const status =
    getProviderErrorStatus(error);

  const code =
    getProviderErrorCode(error);

  const retryAfterMs =
    extractRetryAfterMs(error);

  const retryPolicy =
    resolveProviderRetryPolicy({
      status,
      code,
      outcome:
        errorType,
      explicitRetryable:
        typeof error?.retryable ===
          "boolean"
          ? error.retryable
          : undefined,
      retryAfterMs,
    });

  return {
    errorType,
    status,
    code,
    message:
      getProviderErrorMessage(error),
    retryable:
      retryPolicy.retryable,
    retryAfterMs:
      retryPolicy.retryAfterMs,

    retryAfterWasExplicit:
      retryAfterMs !== null,
  };
}

module.exports = {
  PROVIDER_SEARCH_OUTCOMES,
  getProviderErrorStatus,
  getProviderErrorCode,
  getProviderErrorMessage,
  isProviderNoResultsResponse,
  isRateLimitError,
  isTimeoutError,
  isUnavailableError,
  classifyProviderException,
  classifyProviderResult,
  isProviderHealthyOutcome,
  shouldCountProviderFailure,
  createProviderFailureDetails,
};
