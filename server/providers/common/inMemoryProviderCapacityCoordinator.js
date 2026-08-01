"use strict";

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

const MAX_PROVIDER_CONCURRENT_OPERATIONS =
  parsePositiveInteger(
    process.env
      .PROVIDER_MAX_CONCURRENT_OPERATIONS,
    8
  );

const MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER =
  parsePositiveInteger(
    process.env
      .PROVIDER_MAX_CONCURRENT_OPERATIONS_PER_PROVIDER,
    MAX_PROVIDER_CONCURRENT_OPERATIONS
  );

const MAX_PROVIDER_QUEUED_OPERATIONS =
  parsePositiveInteger(
    process.env
      .PROVIDER_MAX_QUEUED_OPERATIONS,
    64
  );

const MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER =
  parsePositiveInteger(
    process.env
      .PROVIDER_MAX_QUEUED_OPERATIONS_PER_PROVIDER,
    32
  );

let activeProviderOperationCount =
  0;

const activeProviderOperationCounts =
  new Map();

const providerOperationQueue =
  [];

function normalizeOperationName(
  methodName
) {
  if (
    typeof methodName !==
      "string" ||
    methodName.trim().length ===
      0
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
    providerId.trim().length ===
      0
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId.trim();
}

function createProviderOperationCapacityError({
  providerId,
  methodName,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const normalizedMethodName =
    normalizeOperationName(
      methodName
    );

  const error =
    new Error(
      `Provider operation capacity is full for "${normalizedProviderId}".`
    );

  error.name =
    "ProviderOperationCapacityError";
  error.code =
    "PROVIDER_CAPACITY_EXCEEDED";
  error.status =
    503;
  error.providerId =
    normalizedProviderId;
  error.methodName =
    normalizedMethodName;
  error.retryable =
    true;
  error.retryAfterMs =
    250;

  return error;
}

function getAbortReason(
  signal
) {
  if (
    signal?.reason instanceof
      Error
  ) {
    return signal.reason;
  }

  const error =
    new Error(
      "Provider operation was aborted."
    );

  error.name =
    "AbortError";
  error.code =
    "PROVIDER_OPERATION_ABORTED";
  error.status =
    499;

  return error;
}

function getActiveProviderOperationCount(
  providerId
) {
  return activeProviderOperationCounts
    .get(providerId) ??
    0;
}

function canStartProviderOperation(
  providerId
) {
  return (
    activeProviderOperationCount <
      MAX_PROVIDER_CONCURRENT_OPERATIONS &&
    getActiveProviderOperationCount(
      providerId
    ) <
      MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER
  );
}

function createCapacityRelease(
  providerId
) {
  let released =
    false;

  return () => {
    if (released) {
      return false;
    }

    released =
      true;

    activeProviderOperationCount =
      Math.max(
        0,
        activeProviderOperationCount -
          1
      );

    const providerCount =
      Math.max(
        0,
        getActiveProviderOperationCount(
          providerId
        ) - 1
      );

    if (providerCount > 0) {
      activeProviderOperationCounts
        .set(
          providerId,
          providerCount
        );
    }
    else {
      activeProviderOperationCounts
        .delete(providerId);
    }

    drainProviderOperationQueue();

    return true;
  };
}

function grantProviderOperationCapacity(
  waiter
) {
  activeProviderOperationCount +=
    1;

  activeProviderOperationCounts.set(
    waiter.providerId,
    getActiveProviderOperationCount(
      waiter.providerId
    ) + 1
  );

  if (waiter.abortListener) {
    waiter.signal.removeEventListener(
      "abort",
      waiter.abortListener
    );
  }

  waiter.resolve(
    createCapacityRelease(
      waiter.providerId
    )
  );
}

function drainProviderOperationQueue() {
  while (
    activeProviderOperationCount <
      MAX_PROVIDER_CONCURRENT_OPERATIONS &&
    providerOperationQueue.length > 0
  ) {
    const waiterIndex =
      providerOperationQueue
        .findIndex(
          (waiter) =>
            canStartProviderOperation(
              waiter.providerId
            )
        );

    if (waiterIndex < 0) {
      return;
    }

    const [waiter] =
      providerOperationQueue.splice(
        waiterIndex,
        1
      );

    if (waiter.signal.aborted) {
      waiter.reject(
        getAbortReason(
          waiter.signal
        )
      );
      continue;
    }

    grantProviderOperationCapacity(
      waiter
    );
  }
}

function acquireProviderOperationCapacity({
  providerId,
  methodName,
  signal,
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
    !signal ||
    typeof signal.addEventListener !==
      "function"
  ) {
    throw new Error(
      "A valid provider operation AbortSignal is required."
    );
  }

  if (signal.aborted) {
    return Promise.reject(
      getAbortReason(signal)
    );
  }

  if (
    canStartProviderOperation(
      normalizedProviderId
    )
  ) {
    activeProviderOperationCount +=
      1;

    activeProviderOperationCounts.set(
      normalizedProviderId,
      getActiveProviderOperationCount(
        normalizedProviderId
      ) + 1
    );

    return Promise.resolve(
      createCapacityRelease(
        normalizedProviderId
      )
    );
  }

  const queuedForProvider =
    providerOperationQueue.filter(
      (waiter) =>
        waiter.providerId ===
        normalizedProviderId
    ).length;

  if (
    providerOperationQueue.length >=
      MAX_PROVIDER_QUEUED_OPERATIONS ||
    queuedForProvider >=
      MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER
  ) {
    return Promise.reject(
      createProviderOperationCapacityError({
        providerId:
          normalizedProviderId,
        methodName:
          normalizedMethodName,
      })
    );
  }

  return new Promise(
    (resolve, reject) => {
      const waiter = {
        providerId:
          normalizedProviderId,
        methodName:
          normalizedMethodName,
        signal,
        resolve,
        reject,
        abortListener:
          null,
      };

      waiter.abortListener =
        () => {
          const index =
            providerOperationQueue
              .indexOf(waiter);

          if (index >= 0) {
            providerOperationQueue.splice(
              index,
              1
            );
          }

          reject(
            getAbortReason(signal)
          );
        };

      signal.addEventListener(
        "abort",
        waiter.abortListener,
        {
          once:
            true,
        }
      );

      providerOperationQueue.push(
        waiter
      );

      drainProviderOperationQueue();
    }
  );
}

function getProviderOperationCapacitySnapshot() {
  return {
    active:
      activeProviderOperationCount,
    queued:
      providerOperationQueue.length,
    activeByProvider:
      Object.fromEntries(
        activeProviderOperationCounts
      ),
    maximumActive:
      MAX_PROVIDER_CONCURRENT_OPERATIONS,
    maximumActivePerProvider:
      MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER,
    maximumQueued:
      MAX_PROVIDER_QUEUED_OPERATIONS,
    maximumQueuedPerProvider:
      MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER,
  };
}

module.exports = {
  MAX_PROVIDER_CONCURRENT_OPERATIONS,
  MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER,
  MAX_PROVIDER_QUEUED_OPERATIONS,
  MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER,
  acquireProviderOperationCapacity,
  createProviderOperationCapacityError,
  getProviderOperationCapacitySnapshot,
};
