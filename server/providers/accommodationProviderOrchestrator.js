const {
  getEnabledAccommodationProviders,
  getAccommodationProviderById,
  getPrimaryEnabledAccommodationProvider,
} = require("./providerRegistry");

const {
  searchDestinationsAcrossProviders,
} = require(
  "./destinationSearchOrchestrator"
);

const {
  normalizeAccommodationSearchRequest,
} = require(
  "./common/accommodationSearchRequest"
);

const {
  loadConfiguredProviderAdapter,
} = require(
  "./common/configuredProviderAdapterService"
);

const {
  requireProviderAdapterMethod,
} = require(
  "./common/providerAdapterContract"
);

const {
  validateProviderSearchResult,
} = require(
  "./common/providerSearchResult"
);

const {
  beginProviderAttempt,
  recordProviderHealthyResponse,
  recordProviderFailure,
} = require(
  "./common/providerHealthService"
);

const {
  PROVIDER_SEARCH_OUTCOMES,
  isProviderHealthyOutcome,
  shouldCountProviderFailure,
  createProviderFailureDetails,
} = require(
  "./common/providerSearchOutcomeService"
);

const {
  executeProviderOperationWithTimeout,
} = require(
  "./common/providerOperationTimeoutService"
);

function getEnabledProvidersForCapability(
  capabilityName
) {
  return getEnabledAccommodationProviders()
    .filter(
      (provider) =>
        Boolean(
          provider.capabilities
            ?.[capabilityName]
        )
    );
}

function createAggregateFailureResult({
  currency = "EUR",
  attempts = [],
  noResults = false,
} = {}) {
  const code =
    noResults
      ? "NO_RESULTS"
      : "NO_PROVIDER_RETURNED_RESULTS";

  const message =
    noResults
      ? "No stays were found for this destination, dates and guest configuration."
      : "No accommodation provider returned usable hotel results for this search.";

  return {
    providerId:
      null,

    outcome:
      noResults
        ? PROVIDER_SEARCH_OUTCOMES
            .NO_RESULTS
        : PROVIDER_SEARCH_OUTCOMES
            .ERROR,

    data:
      null,

    rawData:
      null,

    currency,

    hotels:
      [],

    totalHotels:
      0,

    continuation:
      null,

    failedResponse: {
      success:
        false,

      message,

      code,

      status:
        noResults
          ? "Completed"
          : "Failed",

      searchIncomplete:
        false,

      continuation:
        null,

      nextResultsKey:
        null,

      currency,

      totalHotels:
        0,

      hotels:
        [],

      attempts,
    },
  };
}

function createCompatibleProviderData(
  result
) {
  const hasContinuation =
    Boolean(
      result.continuation
    );

  const status =
    hasContinuation
      ? "InProgress"
      : "Completed";

  return {
    success:
      result.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS,

    providerId:
      result.providerId,

    message:
      result.failedResponse
        ?.message ??
      null,

    code:
      result.failedResponse
        ?.code ??
      null,

    status,

    searchIncomplete:
      hasContinuation,

    continuation:
      result.continuation,

    rawProviderData:
      result.rawData,

    result: {
      status,

      currency:
        result.currency,

      hotels:
        [],

      continuation:
        result.continuation,

      nextResultsKey:
        result.continuation
          ?.cursor ??
        null,
    },
  };
}

function prepareProviderResult(
  expectedProviderId,
  result
) {
  const validatedResult =
    validateProviderSearchResult(
      result
    );

  if (
    validatedResult.providerId !==
    expectedProviderId
  ) {
    const error =
      new Error(
        `Provider result id mismatch: expected "${expectedProviderId}", received "${validatedResult.providerId}".`
      );

    error.code =
      "PROVIDER_RESULT_ID_MISMATCH";

    throw error;
  }

  return {
    ...validatedResult,

    data:
      createCompatibleProviderData(
        validatedResult
      ),
  };
}

function createCircuitOpenAttempt(
  provider,
  permission
) {
  return {
    providerId:
      provider.id,

    success:
      false,

    totalHotels:
      0,

    failed:
      true,

    outcome:
      PROVIDER_SEARCH_OUTCOMES
        .CIRCUIT_OPEN,

    code:
      "PROVIDER_CIRCUIT_OPEN",

    status:
      null,

    message:
      "Provider temporarily unavailable because its circuit is open.",

    retryAfterMs:
      permission.health
        .retryAfterMs,
  };
}

async function executeProviderOperation({
  provider,
  methodName,
  request,
  title,
}) {
  const permission =
    beginProviderAttempt(
      provider.id
    );

  if (!permission.allowed) {
    console.warn(
      `[PROVIDER:${provider.id}] Operation skipped:`,
      permission.reason
    );

    return {
      result:
        null,

      attempt:
        createCircuitOpenAttempt(
          provider,
          permission
        ),
    };
  }

  try {
    const adapter =
      await loadConfiguredProviderAdapter(
        provider.id
      );

    const operation =
      requireProviderAdapterMethod(
        adapter,
        methodName
      );

    const rawResult =
      await executeProviderOperationWithTimeout({
        providerId:
          provider.id,

        methodName,

        operation,

        timeoutMs:
          provider.operationTimeouts
            ?.[methodName],

        operationArguments: {
          request,

          context: {
            title,
          },
        },
      });

    const result =
      prepareProviderResult(
        provider.id,
        rawResult
      );

    if (
      isProviderHealthyOutcome(
        result.outcome
      )
    ) {
      recordProviderHealthyResponse(
        provider.id
      );
    } else if (
      shouldCountProviderFailure(
        result.outcome
      )
    ) {
      recordProviderFailure(
        provider.id,
        {
          errorType:
            result.outcome,

          message:
            result.failedResponse
              ?.message ??
            "Provider returned an unusable response.",
        }
      );
    }

    return {
      result,

      attempt: {
        providerId:
          provider.id,

        success:
          result.outcome ===
          PROVIDER_SEARCH_OUTCOMES
            .SUCCESS,

        totalHotels:
          result.hotels.length,

        failed:
          result.outcome !==
          PROVIDER_SEARCH_OUTCOMES
            .SUCCESS,

        outcome:
          result.outcome,

        code:
          result.failedResponse
            ?.code ??
          null,

        status:
          result.failedResponse
            ?.status ??
          null,

        message:
          result.failedResponse
            ?.message ??
          null,
      },
    };
  } catch (error) {
    const failureDetails =
      createProviderFailureDetails(
        error
      );

    const health =
      recordProviderFailure(
        provider.id,
        failureDetails
      );

    console.error(
      `[PROVIDER:${provider.id}] Operation failed:`,
      failureDetails.message
    );

    return {
      result:
        null,

      attempt: {
        providerId:
          provider.id,

        success:
          false,

        totalHotels:
          0,

        failed:
          true,

        outcome:
          failureDetails.errorType,

        code:
          failureDetails.code ??
          failureDetails.status ??
          null,

        status:
          failureDetails.status,

        message:
          failureDetails.message,

        circuitState:
          health.circuitState,

        consecutiveFailures:
          health.consecutiveFailures,
      },
    };
  }
}

async function searchHotelsWithPrimaryProvider({
  searchData,
  title,
  fallbackCurrency = "EUR",
}) {
  const request =
    normalizeAccommodationSearchRequest(
      searchData,
      {
        fallbackCurrency,
        fallbackRadiusMeters:
          8000,
      }
    );

  if (request.continuation) {
    const provider =
      getAccommodationProviderById(
        request.continuation
          .providerId
      );

    if (
      !provider?.enabled ||
      !provider.capabilities
        ?.continueHotelSearch
    ) {
      return createAggregateFailureResult({
        currency:
          request.currency,

        attempts: [
          {
            providerId:
              request.continuation
                .providerId,

            success:
              false,

            totalHotels:
              0,

            failed:
              true,

            outcome:
              PROVIDER_SEARCH_OUTCOMES
                .UNAVAILABLE,

            code:
              "PROVIDER_CONTINUATION_UNAVAILABLE",

            message:
              "The provider required to continue this search is unavailable.",
          },
        ],
      });
    }

    const execution =
      await executeProviderOperation({
        provider,
        methodName:
          "continueHotelSearch",
        request,
        title,
      });

    return (
      execution.result ??
      createAggregateFailureResult({
        currency:
          request.currency,

        attempts: [
          execution.attempt,
        ],
      })
    );
  }

  const providers =
    getEnabledProvidersForCapability(
      "searchHotels"
    );

  if (providers.length === 0) {
    return createAggregateFailureResult({
      currency:
        request.currency,
    });
  }

  const attempts = [];

  for (const provider of providers) {
    const execution =
      await executeProviderOperation({
        provider,
        methodName:
          "searchHotels",
        request,
        title,
      });

    attempts.push(
      execution.attempt
    );

    if (
      execution.result
        ?.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS
    ) {
      console.log(
        "[PROVIDER:selected]",
        {
          providerId:
            execution.result
              .providerId,

          hotels:
            execution.result
              .hotels.length,

          currency:
            execution.result
              .currency,

          continuation:
            Boolean(
              execution.result
                .continuation
            ),
        }
      );

      return execution.result;
    }
  }

  const allNoResults =
    attempts.length > 0 &&
    attempts.every(
      (attempt) =>
        attempt.outcome ===
        PROVIDER_SEARCH_OUTCOMES
          .NO_RESULTS
    );

  return createAggregateFailureResult({
    currency:
      request.currency,

    attempts,

    noResults:
      allNoResults,
  });
}

async function getHotelDetailsFromProvider({
  sourceProvider,
  hotelId,
  providerContext = null,
} = {}) {
  if (!hotelId) {
    const error =
      new Error(
        "hotelId is required to retrieve hotel details."
      );

    error.code =
      "INVALID_HOTEL_ID";

    throw error;
  }

  const fallbackProvider =
    getPrimaryEnabledAccommodationProvider();

  const providerId =
    sourceProvider ??
    fallbackProvider?.id ??
    null;

  const provider =
    providerId
      ? getAccommodationProviderById(
          providerId
        )
      : null;

  if (
    !provider?.enabled ||
    !provider.capabilities
      ?.hotelDetails
  ) {
    const error =
      new Error(
        "The hotel details provider is unavailable."
      );

    error.code =
      "PROVIDER_UNAVAILABLE";

    throw error;
  }

  const permission =
    beginProviderAttempt(
      provider.id
    );

  if (!permission.allowed) {
    const error =
      new Error(
        "The hotel details provider is temporarily unavailable."
      );

    error.code =
      "PROVIDER_CIRCUIT_OPEN";

    error.retryAfterMs =
      permission.health
        .retryAfterMs;

    throw error;
  }

  try {
    const adapter =
      await loadConfiguredProviderAdapter(
        provider.id
      );

    const getHotelDetails =
      requireProviderAdapterMethod(
        adapter,
        "getHotelDetails"
      );

    const details =
      await executeProviderOperationWithTimeout({
        providerId:
          provider.id,

        methodName:
          "getHotelDetails",

        operation:
          getHotelDetails,

        timeoutMs:
          provider.operationTimeouts
            ?.getHotelDetails,

        operationArguments: {
          hotelId,
          providerContext,
        },
      });

    recordProviderHealthyResponse(
      provider.id
    );

    return details;
  } catch (error) {
    recordProviderFailure(
      provider.id,
      createProviderFailureDetails(
        error
      )
    );

    throw error;
  }
}

module.exports = {
  searchDestinationsAcrossProviders,
  searchHotelsWithPrimaryProvider,
  getHotelDetailsFromProvider,
};
