function parsePositiveInteger(
  value,
  fallbackValue = null
) {
  const parsedValue =
    Number.parseInt(
      value,
      10
    );

  return (
    Number.isInteger(
      parsedValue
    ) &&
    parsedValue > 0
  )
    ? parsedValue
    : fallbackValue;
}

const DEFAULT_GLOBAL_TIMEOUT_MS =
  parsePositiveInteger(
    process.env
      .PROVIDER_OPERATION_TIMEOUT_MS,
    30_000
  );

const DEFAULT_PROVIDER_OPERATION_TIMEOUTS_MS =
  Object.freeze({
    searchDestinations:
      parsePositiveInteger(
        process.env
          .PROVIDER_DESTINATION_SEARCH_TIMEOUT_MS,
        12_000
      ),

    searchHotels:
      parsePositiveInteger(
        process.env
          .PROVIDER_HOTEL_SEARCH_TIMEOUT_MS,
        DEFAULT_GLOBAL_TIMEOUT_MS
      ),

    continueHotelSearch:
      parsePositiveInteger(
        process.env
          .PROVIDER_HOTEL_CONTINUE_TIMEOUT_MS,
        DEFAULT_GLOBAL_TIMEOUT_MS
      ),

    getHotelDetails:
      parsePositiveInteger(
        process.env
          .PROVIDER_HOTEL_DETAILS_TIMEOUT_MS,
        15_000
      ),

    recheckOffer:
      parsePositiveInteger(
        process.env
          .PROVIDER_OFFER_RECHECK_TIMEOUT_MS,
        20_000
      ),

    default:
      DEFAULT_GLOBAL_TIMEOUT_MS,
  });

function normalizeOperationName(
  methodName
) {
  if (
    typeof methodName !==
      "string" ||
    methodName.trim().length === 0
  ) {
    throw new Error(
      "A valid provider operation name is required."
    );
  }

  return methodName.trim();
}

function normalizeProviderId(
  providerId
) {
  if (
    typeof providerId !==
      "string" ||
    providerId.trim().length === 0
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId.trim();
}

function resolveProviderOperationTimeoutMs(
  methodName,
  {
    timeoutMs,
  } = {}
) {
  const normalizedMethodName =
    normalizeOperationName(
      methodName
    );

  const explicitTimeout =
    parsePositiveInteger(
      timeoutMs
    );

  if (explicitTimeout) {
    return explicitTimeout;
  }

  return (
    DEFAULT_PROVIDER_OPERATION_TIMEOUTS_MS[
      normalizedMethodName
    ] ??
    DEFAULT_PROVIDER_OPERATION_TIMEOUTS_MS
      .default
  );
}

function createProviderOperationTimeoutError({
  providerId,
  methodName,
  timeoutMs,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedMethodName =
    normalizeOperationName(
      methodName
    );

  const normalizedTimeoutMs =
    parsePositiveInteger(
      timeoutMs
    );

  if (!normalizedTimeoutMs) {
    throw new Error(
      "A valid timeoutMs is required."
    );
  }

  const error =
    new Error(
      `Provider operation "${normalizedMethodName}" timed out after ${normalizedTimeoutMs} ms.`
    );

  error.name =
    "ProviderOperationTimeoutError";

  error.code =
    "PROVIDER_TIMEOUT";

  error.status =
    504;

  error.providerId =
    normalizedProviderId;

  error.methodName =
    normalizedMethodName;

  error.timeoutMs =
    normalizedTimeoutMs;

  error.retryable =
    true;

  return error;
}

async function executeProviderOperationWithTimeout({
  providerId,
  methodName,
  operation,
  operationArguments = {},
  timeoutMs,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedMethodName =
    normalizeOperationName(
      methodName
    );

  if (
    typeof operation !==
    "function"
  ) {
    throw new Error(
      `Provider operation "${normalizedMethodName}" must be a function.`
    );
  }

  if (
    !operationArguments ||
    typeof operationArguments !==
      "object" ||
    Array.isArray(
      operationArguments
    )
  ) {
    throw new Error(
      "Provider operation arguments must be an object."
    );
  }

  const resolvedTimeoutMs =
    resolveProviderOperationTimeoutMs(
      normalizedMethodName,
      {
        timeoutMs,
      }
    );

  const controller =
    new AbortController();

  let timeoutId =
    null;

  const operationPromise =
    Promise.resolve()
      .then(() =>
        operation({
          ...operationArguments,

          signal:
            controller.signal,
        })
      );

  const timeoutPromise =
    new Promise(
      (
        _resolve,
        reject
      ) => {
        timeoutId =
          setTimeout(
            () => {
              const timeoutError =
                createProviderOperationTimeoutError({
                  providerId:
                    normalizedProviderId,

                  methodName:
                    normalizedMethodName,

                  timeoutMs:
                    resolvedTimeoutMs,
                });

              reject(
                timeoutError
              );

              controller.abort(
                timeoutError
              );
            },
            resolvedTimeoutMs
          );

      }
    );

  try {
    return await Promise.race([
      operationPromise,
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(
        timeoutId
      );
    }
  }
}

module.exports = {
  DEFAULT_PROVIDER_OPERATION_TIMEOUTS_MS,
  resolveProviderOperationTimeoutMs,
  createProviderOperationTimeoutError,
  executeProviderOperationWithTimeout,
};
