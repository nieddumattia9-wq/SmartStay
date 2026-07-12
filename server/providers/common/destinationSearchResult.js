const {
  normalizeProviderId,
} = require(
  "./providerAdapterContract"
);

const {
  PROVIDER_SEARCH_OUTCOMES,
} = require(
  "./providerSearchOutcomeService"
);

const DESTINATION_FAILURE_OUTCOMES =
  new Set([
    PROVIDER_SEARCH_OUTCOMES.ERROR,
    PROVIDER_SEARCH_OUTCOMES.TIMEOUT,
    PROVIDER_SEARCH_OUTCOMES.UNAVAILABLE,
    PROVIDER_SEARCH_OUTCOMES.CIRCUIT_OPEN,
  ]);

const DEFAULT_FAILURE_CODES = {
  [PROVIDER_SEARCH_OUTCOMES.ERROR]:
    "DESTINATION_PROVIDER_ERROR",

  [PROVIDER_SEARCH_OUTCOMES.TIMEOUT]:
    "DESTINATION_PROVIDER_TIMEOUT",

  [PROVIDER_SEARCH_OUTCOMES.UNAVAILABLE]:
    "DESTINATION_PROVIDER_UNAVAILABLE",

  [PROVIDER_SEARCH_OUTCOMES.CIRCUIT_OPEN]:
    "PROVIDER_CIRCUIT_OPEN",
};

function normalizeDestinations(
  destinations
) {
  return Array.isArray(destinations)
    ? destinations
    : [];
}

function createDestinationSuccessResult({
  providerId,
  destinations,
  rawData = null,
  message =
    "Destinations retrieved successfully.",
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedDestinations =
    normalizeDestinations(
      destinations
    );

  if (
    normalizedDestinations.length === 0
  ) {
    throw new Error(
      `Destination provider "${normalizedProviderId}" cannot return success without destinations.`
    );
  }

  return {
    providerId:
      normalizedProviderId,

    outcome:
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS,

    success:
      true,

    message,

    code:
      "DESTINATIONS_FOUND",

    destinations:
      normalizedDestinations,

    totalDestinations:
      normalizedDestinations.length,

    rawData,

    failedResponse:
      null,
  };
}

function createDestinationNoResultsResult({
  providerId,
  rawData = null,
  message =
    "No matching destinations were found.",
} = {}) {
  return {
    providerId:
      normalizeProviderId(
        providerId
      ),

    outcome:
      PROVIDER_SEARCH_OUTCOMES
        .NO_RESULTS,

    success:
      true,

    message,

    code:
      204,

    destinations:
      [],

    totalDestinations:
      0,

    rawData,

    failedResponse:
      null,
  };
}

function createDestinationFailureResult({
  providerId,
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
    !DESTINATION_FAILURE_OUTCOMES.has(
      outcome
    )
  ) {
    throw new Error(
      `Invalid destination failure outcome: ${outcome}`
    );
  }

  const failureCode =
    code ??
    DEFAULT_FAILURE_CODES[
      outcome
    ];

  const failureMessage =
    message ??
    "The destination provider could not complete the search.";

  const isRetryable =
    typeof retryable === "boolean"
      ? retryable
      : outcome !==
        PROVIDER_SEARCH_OUTCOMES.ERROR;

  const failedResponse = {
    success:
      false,

    message:
      failureMessage,

    code:
      failureCode,

    status:
      status ??
      "Failed",

    destinations:
      [],

    totalDestinations:
      0,

    retryable:
      isRetryable,
  };

  return {
    providerId:
      normalizedProviderId,

    outcome,

    success:
      false,

    message:
      failureMessage,

    code:
      failureCode,

    destinations:
      [],

    totalDestinations:
      0,

    rawData,

    failedResponse,
  };
}

function validateDestinationSearchResult(
  result
) {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      "Destination search result must be an object."
    );
  }

  normalizeProviderId(
    result.providerId
  );

  if (
    !Object.values(
      PROVIDER_SEARCH_OUTCOMES
    ).includes(
      result.outcome
    )
  ) {
    throw new Error(
      `Invalid destination search outcome: ${result.outcome}`
    );
  }

  if (
    !Array.isArray(
      result.destinations
    )
  ) {
    throw new Error(
      "Destination search result must contain a destinations array."
    );
  }

  if (
    result.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS &&
    result.destinations.length === 0
  ) {
    throw new Error(
      "Successful destination result must contain destinations."
    );
  }

  if (
    result.outcome !==
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS &&
    result.destinations.length > 0
  ) {
    throw new Error(
      "Non-success destination result cannot contain destinations."
    );
  }

  if (
    DESTINATION_FAILURE_OUTCOMES.has(
      result.outcome
    ) &&
    !result.failedResponse
  ) {
    throw new Error(
      "Technical destination failure must contain failedResponse."
    );
  }

  return result;
}

module.exports = {
  createDestinationSuccessResult,
  createDestinationNoResultsResult,
  createDestinationFailureResult,
  validateDestinationSearchResult,
};
