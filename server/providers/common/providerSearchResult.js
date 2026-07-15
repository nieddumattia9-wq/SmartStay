const {
  PROVIDER_SEARCH_OUTCOMES,
} = require(
  "./providerSearchOutcomeService"
);

const FAILURE_OUTCOMES =
  new Set([
    PROVIDER_SEARCH_OUTCOMES.ERROR,
    PROVIDER_SEARCH_OUTCOMES.TIMEOUT,
    PROVIDER_SEARCH_OUTCOMES.UNAVAILABLE,
    PROVIDER_SEARCH_OUTCOMES.CIRCUIT_OPEN,
  ]);

const DEFAULT_FAILURE_CODES = {
  [PROVIDER_SEARCH_OUTCOMES.ERROR]:
    "PROVIDER_ERROR",

  [PROVIDER_SEARCH_OUTCOMES.TIMEOUT]:
    "PROVIDER_TIMEOUT",

  [PROVIDER_SEARCH_OUTCOMES.UNAVAILABLE]:
    "PROVIDER_UNAVAILABLE",

  [PROVIDER_SEARCH_OUTCOMES.CIRCUIT_OPEN]:
    "PROVIDER_CIRCUIT_OPEN",
};

function normalizeProviderId(
  providerId
) {
  if (
    typeof providerId !== "string" ||
    providerId.trim().length === 0
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId
    .trim()
    .toLowerCase();
}

function normalizeCurrency(
  currency,
  fallbackCurrency = "EUR"
) {
  const normalizedCurrency =
    typeof currency === "string"
      ? currency.trim().toUpperCase()
      : "";

  if (
    /^[A-Z]{3}$/.test(
      normalizedCurrency
    )
  ) {
    return normalizedCurrency;
  }

  const normalizedFallback =
    typeof fallbackCurrency === "string"
      ? fallbackCurrency
          .trim()
          .toUpperCase()
      : "EUR";

  return /^[A-Z]{3}$/.test(
    normalizedFallback
  )
    ? normalizedFallback
    : "EUR";
}

function normalizeHotels(hotels) {
  return Array.isArray(hotels)
    ? hotels
    : [];
}

function createProviderContinuation({
  providerId,
  cursor,
} = {}) {
  if (
    cursor === null ||
    cursor === undefined
  ) {
    return null;
  }

  return {
    providerId:
      normalizeProviderId(
        providerId
      ),

    cursor,
  };
}

function createCompatibilityFailureResponse({
  outcome,
  code,
  message,
  currency,
  status,
  retryable,
}) {
  return {
    success: false,

    message,

    code,

    status,

    searchIncomplete:
      false,

    nextResultsKey:
      null,

    currency,

    totalHotels:
      0,

    hotels:
      [],

    retryable,
  };
}

function createProviderSuccessResult({
  providerId,
  currency,
  hotels,
  rawData = null,
  continuation = null,
  providerContext = null,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedHotels =
    normalizeHotels(
      hotels
    );

  if (
    normalizedHotels.length === 0
  ) {
    throw new Error(
      `Provider "${normalizedProviderId}" cannot return success without hotels.`
    );
  }

  const normalizedCurrency =
    normalizeCurrency(
      currency
    );

  return {
    providerId:
      normalizedProviderId,

    outcome:
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS,

    currency:
      normalizedCurrency,

    hotels:
      normalizedHotels,

    totalHotels:
      normalizedHotels.length,

    continuation:
      continuation
        ? createProviderContinuation({
            providerId:
              normalizedProviderId,

            cursor:
              continuation.cursor ??
              continuation,
          })
        : null,

    providerContext,

    rawData,

    data:
      rawData,

    failedResponse:
      null,
  };
}

function createProviderNoResultsResult({
  providerId,
  currency,
  rawData = null,
  message =
    "No stays were found for this search.",
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedCurrency =
    normalizeCurrency(
      currency
    );

  return {
    providerId:
      normalizedProviderId,

    outcome:
      PROVIDER_SEARCH_OUTCOMES
        .NO_RESULTS,

    currency:
      normalizedCurrency,

    hotels:
      [],

    totalHotels:
      0,

    continuation:
      null,

    rawData,

    data:
      rawData,

    failedResponse:
      createCompatibilityFailureResponse({
        outcome:
          PROVIDER_SEARCH_OUTCOMES
            .NO_RESULTS,

        code:
          "NO_RESULTS",

        message,

        currency:
          normalizedCurrency,

        status:
          "Completed",

        retryable:
          false,
      }),
  };
}

function createProviderFailureResult({
  providerId,
  currency,
  outcome =
    PROVIDER_SEARCH_OUTCOMES.ERROR,
  code,
  message,
  status = null,
  retryable,
  rawData = null,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  if (
    !FAILURE_OUTCOMES.has(
      outcome
    )
  ) {
    throw new Error(
      `Invalid provider failure outcome: ${outcome}`
    );
  }

  const normalizedCurrency =
    normalizeCurrency(
      currency
    );

  const failureCode =
    code ??
    DEFAULT_FAILURE_CODES[
      outcome
    ];

  const failureMessage =
    message ??
    "The accommodation provider could not complete the search.";

  const isRetryable =
    typeof retryable === "boolean"
      ? retryable
      : outcome !==
        PROVIDER_SEARCH_OUTCOMES
          .ERROR;

  return {
    providerId:
      normalizedProviderId,

    outcome,

    currency:
      normalizedCurrency,

    hotels:
      [],

    totalHotels:
      0,

    continuation:
      null,

    rawData,

    data:
      rawData,

    failedResponse:
      createCompatibilityFailureResponse({
        outcome,
        code:
          failureCode,

        message:
          failureMessage,

        currency:
          normalizedCurrency,

        status:
          status ??
          "Failed",

        retryable:
          isRetryable,
      }),
  };
}

function validateProviderSearchResult(
  result
) {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      "Provider search result must be an object."
    );
  }

  normalizeProviderId(
    result.providerId
  );

  const validOutcomes =
    Object.values(
      PROVIDER_SEARCH_OUTCOMES
    );

  if (
    !validOutcomes.includes(
      result.outcome
    )
  ) {
    throw new Error(
      `Invalid provider search outcome: ${result.outcome}`
    );
  }

  if (
    !Array.isArray(
      result.hotels
    )
  ) {
    throw new Error(
      "Provider search result hotels must be an array."
    );
  }

  if (
    result.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS &&
    result.hotels.length === 0
  ) {
    throw new Error(
      "Successful provider result must contain at least one hotel."
    );
  }

  if (
    result.outcome !==
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS &&
    result.hotels.length > 0
  ) {
    throw new Error(
      "Non-success provider result cannot contain hotels."
    );
  }

  if (
    result.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS &&
    result.failedResponse !== null
  ) {
    throw new Error(
      "Successful provider result cannot contain failedResponse."
    );
  }

  if (
    result.outcome !==
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS &&
    !result.failedResponse
  ) {
    throw new Error(
      "Non-success provider result must contain failedResponse."
    );
  }

  return result;
}

module.exports = {
  createProviderContinuation,
  createProviderSuccessResult,
  createProviderNoResultsResult,
  createProviderFailureResult,
  validateProviderSearchResult,
};
