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
  normalizeRetryAfterMs,
} = require(
  "./common/providerRetryPolicy"
);

const {
  executeProviderOperationWithTimeout,
} = require(
  "./common/providerOperationTimeoutService"
);

const {
  validateProviderOfferRecheckResult,
} = require(
  "./common/providerOfferRecheckResult"
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

function getMinimumRetryAfterMs(
  attempts = []
) {
  const retryDelays =
    attempts
      .map(
        (attempt) =>
          normalizeRetryAfterMs(
            attempt?.retryAfterMs
          )
      )
      .filter(
        (value) =>
          value !== null
      );

  return retryDelays.length > 0
    ? Math.min(...retryDelays)
    : null;
}

function classifyAggregateFailure(
  attempts = [],
  {
    noResults = false,
  } = {}
) {
  if (noResults) {
    return {
      outcome:
        PROVIDER_SEARCH_OUTCOMES
          .NO_RESULTS,

      code:
        "NO_RESULTS",

      message:
        "No stays were found for this destination, dates and guest configuration.",
    };
  }

  const failedAttempts =
    attempts.filter(
      (attempt) =>
        attempt?.failed === true
    );

  const outcomes =
    failedAttempts.map(
      (attempt) =>
        attempt?.outcome
    );

  const allRateLimited =
    outcomes.length > 0 &&
    outcomes.every(
      (outcome) =>
        outcome ===
          PROVIDER_SEARCH_OUTCOMES
            .RATE_LIMITED ||
        outcome ===
          PROVIDER_SEARCH_OUTCOMES
            .CIRCUIT_OPEN
    ) &&
    outcomes.some(
      (outcome) =>
        outcome ===
        PROVIDER_SEARCH_OUTCOMES
          .RATE_LIMITED
    );

  if (allRateLimited) {
    return {
      outcome:
        PROVIDER_SEARCH_OUTCOMES
          .RATE_LIMITED,

      code:
        "PROVIDER_RATE_LIMITED",

      message:
        "Accommodation search is temporarily rate limited.",
    };
  }

  const allTimeouts =
    outcomes.length > 0 &&
    outcomes.every(
      (outcome) =>
        outcome ===
        PROVIDER_SEARCH_OUTCOMES
          .TIMEOUT
    );

  if (allTimeouts) {
    return {
      outcome:
        PROVIDER_SEARCH_OUTCOMES
          .TIMEOUT,

      code:
        "PROVIDER_TIMEOUT",

      message:
        "Accommodation providers took too long to respond.",
    };
  }

  const allUnavailable =
    outcomes.length > 0 &&
    outcomes.every(
      (outcome) =>
        outcome ===
          PROVIDER_SEARCH_OUTCOMES
            .UNAVAILABLE ||
        outcome ===
          PROVIDER_SEARCH_OUTCOMES
            .CIRCUIT_OPEN
    );

  if (allUnavailable) {
    return {
      outcome:
        PROVIDER_SEARCH_OUTCOMES
          .UNAVAILABLE,

      code:
        "PROVIDER_UNAVAILABLE",

      message:
        "Accommodation search is temporarily unavailable.",
    };
  }

  return {
    outcome:
      PROVIDER_SEARCH_OUTCOMES
        .ERROR,

    code:
      "NO_PROVIDER_RETURNED_RESULTS",

    message:
      "No accommodation provider returned usable hotel results for this search.",
  };
}

function createAggregateFailureResult({
  currency = "EUR",
  attempts = [],
  noResults = false,
} = {}) {
  const classification =
    classifyAggregateFailure(
      attempts,
      {
        noResults,
      }
    );

  const retryable =
    attempts.some(
      (attempt) =>
        attempt?.retryable === true
    );

  const retryAfterMs =
    getMinimumRetryAfterMs(
      attempts
    );

  return {
    providerId:
      null,

    outcome:
      classification.outcome,

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

    attempts,

    providerExecutions:
      [],

    failedResponse: {
      success:
        false,

      message:
        classification.message,

      code:
        classification.code,

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

      retryable,

      retryAfterMs,

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
  const lastErrorType =
    String(
      permission.health
        ?.lastErrorType ??
      ""
    )
      .trim()
      .toLowerCase();

  const rateLimited =
    lastErrorType ===
      PROVIDER_SEARCH_OUTCOMES
        .RATE_LIMITED;

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
      rateLimited
        ? PROVIDER_SEARCH_OUTCOMES
            .RATE_LIMITED
        : PROVIDER_SEARCH_OUTCOMES
            .CIRCUIT_OPEN,

    code:
      rateLimited
        ? "PROVIDER_RATE_LIMITED"
        : "PROVIDER_CIRCUIT_OPEN",

    status:
      null,

    message:
      rateLimited
        ? "Provider retry window is still active."
        : "Provider temporarily unavailable because its circuit is open.",

    retryable:
      true,

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

          status:
            result.failedResponse
              ?.status ??
            null,

          code:
            result.failedResponse
              ?.code ??
            null,

          message:
            result.failedResponse
              ?.message ??
            "Provider returned an unusable response.",

          retryAfterMs:
            result.failedResponse
              ?.retryAfterMs ??
            null,

          retryAfterWasExplicit:
            result.failedResponse
              ?.retryAfterMs !==
              null &&
            result.failedResponse
              ?.retryAfterMs !==
              undefined,
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

        retryable:
          result.failedResponse
            ?.retryable === true,

        retryAfterMs:
          Number.isFinite(
            Number(
              result.failedResponse
                ?.retryAfterMs
            )
          )
            ? Number(
                result.failedResponse
                  ?.retryAfterMs
              )
            : null,
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

        retryable:
          failureDetails.retryable,

        retryAfterMs:
          failureDetails.retryAfterMs,

        circuitState:
          health.circuitState,

        consecutiveFailures:
          health.consecutiveFailures,
      },
    };
  }
}

function createProviderExecutionDescriptor({
  provider,
  result,
  attempt,
} = {}) {
  if (!provider?.id) {
    return null;
  }

  return {
    providerId:
      provider.id,

    supportsContinuation:
      Boolean(
        provider.capabilities
          ?.continueHotelSearch
      ),

    continuation:
      result?.continuation ??
      null,

    providerContext:
      result?.providerContext ??
      null,

    outcome:
      result?.outcome ??
      attempt?.outcome ??
      null,

    code:
      attempt?.code ??
      result?.failedResponse
        ?.code ??
      null,

    message:
      attempt?.message ??
      result?.failedResponse
        ?.message ??
      null,

    retryable:
      attempt?.retryable === true ||
      result?.failedResponse
        ?.retryable === true,

    retryAfterMs:
      normalizeRetryAfterMs(
        attempt?.retryAfterMs ??
        result?.failedResponse
          ?.retryAfterMs
      ),
  };
}

async function continueHotelSearchForProvider({
  providerId,
  searchData,
  continuation,
  providerContext = null,
  title =
    "SEARCH HOTELS - CONTINUE",
  fallbackCurrency = "EUR",
} = {}) {
  const provider =
    getAccommodationProviderById(
      providerId
    );

  const normalizedRequest =
    normalizeAccommodationSearchRequest(
      {
        ...searchData,
        continuation,
      },
      {
        fallbackCurrency,
        fallbackRadiusMeters:
          8000,
      }
    );

  const request = {
    ...normalizedRequest,

    providerContext,
  };

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
            providerId ?? null,

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

          retryable:
            false,

          retryAfterMs:
            null,
        },
      ],
    });
  }

  if (
    request.continuation
      ?.providerId !==
    provider.id
  ) {
    return createAggregateFailureResult({
      currency:
        request.currency,

      attempts: [
        {
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
              .ERROR,

          code:
            "PROVIDER_CONTINUATION_MISMATCH",

          message:
            "The continuation does not belong to the selected provider.",

          retryable:
            false,

          retryAfterMs:
            null,
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

  if (!execution.result) {
    return createAggregateFailureResult({
      currency:
        request.currency,

      attempts: [
        execution.attempt,
      ],
    });
  }

  const providerExecution =
    createProviderExecutionDescriptor({
      provider,
      result:
        execution.result,
      attempt:
        execution.attempt,
    });

  return {
    ...execution.result,

    attempts: [
      execution.attempt,
    ],

    providerExecutions:
      providerExecution
        ? [providerExecution]
        : [],
  };
}

async function searchHotelsAcrossProviders({
  searchData,
  title,
  fallbackCurrency = "EUR",
  providerContext = null,
}) {
  const normalizedRequest =
    normalizeAccommodationSearchRequest(
      searchData,
      {
        fallbackCurrency,
        fallbackRadiusMeters:
          8000,
      }
    );

  const request = {
    ...normalizedRequest,
    providerContext,
  };

  if (request.continuation) {
    return continueHotelSearchForProvider({
      providerId:
        request.continuation
          .providerId,

      searchData:
        request,

      continuation:
        request.continuation,

      providerContext:
        request.providerContext,

      title,

      fallbackCurrency:
        request.currency,
    });
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

      const providerExecution =
        createProviderExecutionDescriptor({
          provider,
          result:
            execution.result,
          attempt:
            execution.attempt,
        });

      return {
        ...execution.result,

        attempts,

        providerExecutions:
          providerExecution
            ? [providerExecution]
            : [],
      };
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

  const providerId =
    typeof sourceProvider ===
      "string"
      ? sourceProvider.trim()
      : "";

  if (!providerId) {
    const error =
      new Error(
        "The source provider is required to retrieve hotel details."
      );

    error.code =
      "HOTEL_SOURCE_UNAVAILABLE";

    throw error;
  }

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

async function recheckOfferWithProvider({
  sourceProvider,
  hotelId,
  offer,
  providerContext = null,
} = {}) {
  const providerId =
    typeof sourceProvider === "string"
      ? sourceProvider.trim()
      : "";

  if (!providerId) {
    const error =
      new Error(
        "The offer source provider is required."
      );

    error.code =
      "OFFER_SOURCE_UNAVAILABLE";

    error.status =
      409;

    throw error;
  }

  const provider =
    getAccommodationProviderById(
      providerId
    );

  if (
    !provider?.enabled ||
    !provider.capabilities
      ?.offerRecheck
  ) {
    const error =
      new Error(
        "Live offer recheck is not supported for this provider."
      );

    error.code =
      "OFFER_RECHECK_UNSUPPORTED";

    error.status =
      409;

    throw error;
  }

  const permission =
    beginProviderAttempt(
      provider.id
    );

  if (!permission.allowed) {
    const error =
      new Error(
        "Live offer recheck is temporarily unavailable."
      );

    error.code =
      permission.reason ===
        "rate_limited"
        ? "PROVIDER_RATE_LIMITED"
        : "PROVIDER_CIRCUIT_OPEN";

    error.status =
      error.code ===
        "PROVIDER_RATE_LIMITED"
        ? 429
        : 503;

    error.retryable =
      true;

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

    const recheckOffer =
      requireProviderAdapterMethod(
        adapter,
        "recheckOffer"
      );

    const result =
      validateProviderOfferRecheckResult(
        await executeProviderOperationWithTimeout({
          providerId:
            provider.id,
          methodName:
            "recheckOffer",
          operation:
            recheckOffer,
          timeoutMs:
            provider.operationTimeouts
              ?.recheckOffer,
          operationArguments: {
            offer,
            hotelId,
            providerContext,
          },
        })
      );

    recordProviderHealthyResponse(
      provider.id
    );

    return result;
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
  searchHotelsAcrossProviders,

  /*
   * Temporary compatibility alias.
   * Core services use the provider-agnostic
   * orchestration name.
   */
  searchHotelsWithPrimaryProvider:
    searchHotelsAcrossProviders,

  continueHotelSearchForProvider,
  getHotelDetailsFromProvider,
  recheckOfferWithProvider,
};
