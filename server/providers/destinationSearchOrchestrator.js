const {
  DESTINATION_PROVIDER_CAPABILITIES,
  getDestinationProvidersByCapability,
} = require(
  "./destinationProviderRegistry"
);

const {
  registerProviderAdapter,
  hasProviderAdapter,
  loadProviderAdapter,
} = require(
  "./common/providerAdapterRegistry"
);

const {
  requireProviderAdapterMethod,
} = require(
  "./common/providerAdapterContract"
);

const {
  validateDestinationSearchResult,
} = require(
  "./common/destinationSearchResult"
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

function normalizeDestinationQuery(
  query
) {
  return typeof query ===
    "string"
    ? query.trim()
    : "";
}

function createDestinationError({
  message,
  code,
  status,
} = {}) {
  const error =
    new Error(
      message ??
      "Destination search failed."
    );

  error.code =
    code ??
    "DESTINATION_PROVIDER_UNAVAILABLE";

  error.status =
    Number.isFinite(status)
      ? status
      : 503;

  return error;
}

function ensureProviderAdapterRegistered(
  provider
) {
  if (
    hasProviderAdapter(
      provider.id
    )
  ) {
    return;
  }

  if (
    typeof provider.adapterLoader !==
    "function"
  ) {
    throw createDestinationError({
      message:
        `No adapter loader is configured for destination provider "${provider.id}".`,

      code:
        "PROVIDER_ADAPTER_NOT_CONFIGURED",

      status:
        503,
    });
  }

  registerProviderAdapter(
    provider.id,
    provider.adapterLoader
  );
}

function createFailureDetailsFromResult(
  result
) {
  return {
    errorType:
      result.outcome,

    code:
      result.failedResponse
        ?.code ??
      result.code ??
      "DESTINATION_PROVIDER_ERROR",

    status:
      result.failedResponse
        ?.status ??
      null,

    message:
      result.failedResponse
        ?.message ??
      result.message ??
      "Destination provider returned an unusable response.",
  };
}

function getNumericFailureStatus(
  failureDetails
) {
  const status =
    Number(
      failureDetails?.status
    );

  return Number.isFinite(status)
    ? status
    : 503;
}

async function executeDestinationProvider({
  provider,
  query,
}) {
  const permission =
    beginProviderAttempt(
      provider.id
    );

  if (!permission.allowed) {
    console.warn(
      `[DESTINATION:${provider.id}] Search skipped:`,
      permission.reason
    );

    return {
      type:
        "failure",

      failureDetails: {
        errorType:
          PROVIDER_SEARCH_OUTCOMES
            .CIRCUIT_OPEN,

        code:
          "PROVIDER_CIRCUIT_OPEN",

        status:
          503,

        message:
          permission.reason ??
          "Provider circuit is open.",
      },
    };
  }

  try {
    ensureProviderAdapterRegistered(
      provider
    );

    const adapter =
      await loadProviderAdapter(
        provider.id
      );

    const searchDestinations =
      requireProviderAdapterMethod(
        adapter,
        "searchDestinations"
      );

    const rawResult =
      await searchDestinations({
        query,
      });

    const result =
      validateDestinationSearchResult(
        rawResult
      );

    if (
      result.providerId !==
      provider.id
    ) {
      const error =
        createDestinationError({
          message:
            `Destination adapter returned providerId "${result.providerId}" instead of "${provider.id}".`,

          code:
            "PROVIDER_ADAPTER_ID_MISMATCH",

          status:
            500,
        });

      throw error;
    }

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
        createFailureDetailsFromResult(
          result
        )
      );
    }

    if (
      result.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .SUCCESS
    ) {
      console.log(
        "[DESTINATION:selected]",
        {
          providerId:
            provider.id,

          destinations:
            result.destinations.length,
        }
      );

      return {
        type:
          "success",

        result,
      };
    }

    if (
      result.outcome ===
      PROVIDER_SEARCH_OUTCOMES
        .NO_RESULTS
    ) {
      return {
        type:
          "no_results",

        result,
      };
    }

    return {
      type:
        "failure",

      result,

      failureDetails:
        createFailureDetailsFromResult(
          result
        ),
    };
  } catch (error) {
    const failureDetails =
      createProviderFailureDetails(
        error
      );

    recordProviderFailure(
      provider.id,
      failureDetails
    );

    console.error(
      `[DESTINATION:${provider.id}] Search failed:`,
      failureDetails.message
    );

    return {
      type:
        "failure",

      error,

      failureDetails,
    };
  }
}

async function searchDestinationsAcrossProviders(
  query
) {
  const normalizedQuery =
    normalizeDestinationQuery(
      query
    );

  if (!normalizedQuery) {
    throw createDestinationError({
      message:
        "A destination search query is required.",

      code:
        "INVALID_DESTINATION_QUERY",

      status:
        400,
    });
  }

  const providers =
    getDestinationProvidersByCapability(
      DESTINATION_PROVIDER_CAPABILITIES
        .SEARCH_DESTINATIONS
    );

  if (providers.length === 0) {
    throw createDestinationError({
      message:
        "No destination search provider is configured.",

      code:
        "DESTINATION_PROVIDER_NOT_CONFIGURED",

      status:
        503,
    });
  }

  const noResults = [];
  const failures = [];

  for (const provider of providers) {
    const attempt =
      await executeDestinationProvider({
        provider,
        query:
          normalizedQuery,
      });

    if (
      attempt.type ===
      "success"
    ) {
      return attempt.result;
    }

    if (
      attempt.type ===
      "no_results"
    ) {
      noResults.push(
        attempt.result
      );

      continue;
    }

    failures.push(
      attempt.failureDetails
    );
  }

  if (
    noResults.length ===
    providers.length
  ) {
    return noResults[0];
  }

  const lastFailure =
    failures.at(-1);

  throw createDestinationError({
    message:
      "No destination search provider is currently available.",

    code:
      "DESTINATION_PROVIDER_UNAVAILABLE",

    status:
      getNumericFailureStatus(
        lastFailure
      ),
  });
}

module.exports = {
  normalizeDestinationQuery,
  executeDestinationProvider,
  searchDestinationsAcrossProviders,
};
