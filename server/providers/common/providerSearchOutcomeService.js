const PROVIDER_SEARCH_OUTCOMES = {
  SUCCESS: "success",
  NO_RESULTS: "no_results",
  ERROR: "error",
  TIMEOUT: "timeout",
  UNAVAILABLE: "unavailable",
  CIRCUIT_OPEN: "circuit_open",
};

const TIMEOUT_ERROR_CODES =
  new Set([
    "ECONNABORTED",
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
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

function isTimeoutError(error) {
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
    status === 429 ||
    (
      status !== null &&
      status >= 500
    )
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

    if (
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
        .UNAVAILABLE
  );
}

function createProviderFailureDetails(
  error
) {
  return {
    errorType:
      classifyProviderException(
        error
      ),

    status:
      getProviderErrorStatus(error),

    code:
      getProviderErrorCode(error),

    message:
      getProviderErrorMessage(error),
  };
}

module.exports = {
  PROVIDER_SEARCH_OUTCOMES,
  getProviderErrorStatus,
  getProviderErrorCode,
  getProviderErrorMessage,
  isProviderNoResultsResponse,
  isTimeoutError,
  isUnavailableError,
  classifyProviderException,
  classifyProviderResult,
  isProviderHealthyOutcome,
  shouldCountProviderFailure,
  createProviderFailureDetails,
};
