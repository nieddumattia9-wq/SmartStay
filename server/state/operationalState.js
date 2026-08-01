"use strict";

const {
  OPERATIONAL_STATE_MODES,
  createOperationalStatePort,
} = require(
  "./operationalStateContracts"
);

function createSearchQueueDisabledError() {
  const error =
    new Error(
      "Asynchronous search queue admission is not enabled."
    );

  error.name =
    "SearchQueueDisabledError";
  error.code =
    "SEARCH_QUEUE_NOT_ENABLED";
  error.status =
    503;
  error.retryable =
    true;
  error.retryAfterMs =
    null;

  return error;
}

const disabledSearchQueueAdmission =
  Object.freeze({
    enabled:
      false,

    admitSearch() {
      return Promise.reject(
        createSearchQueueDisabledError()
      );
    },

    releaseSearchAdmission() {
      return false;
    },

    getSearchQueueAdmissionSnapshot() {
      return Object.freeze({
        enabled:
          false,
        mode:
          "disabled",
        admitted:
          0,
        active:
          0,
        waiting:
          0,
      });
    },
  });

function getSource(
  overrides,
  sourceName,
  loadDefault
) {
  if (
    Object.prototype.hasOwnProperty.call(
      overrides,
      sourceName
    )
  ) {
    return overrides[sourceName];
  }

  return loadDefault();
}

function defineLazyPort({
  target,
  portName,
  sourceName,
  overrides,
  loadDefault,
}) {
  Object.defineProperty(
    target,
    portName,
    {
      enumerable:
        true,
      get() {
        return createOperationalStatePort(
          portName,
          getSource(
            overrides,
            sourceName,
            loadDefault
          ),
          {
            implementation:
              "in-memory",
          }
        );
      },
    }
  );
}

function createInMemoryOperationalState(
  overrides = {}
) {
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides)
  ) {
    throw new TypeError(
      "Operational state overrides must be an object."
    );
  }

  const state = {
    mode:
      OPERATIONAL_STATE_MODES
        .IN_MEMORY_SINGLE_INSTANCE,
    distributed:
      false,
  };

  defineLazyPort({
    target: state,
    portName:
      "searchSessionStore",
    sourceName:
      "searchSession",
    overrides,
    loadDefault:
      () => require(
        "../storage/searchSession"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "continuationLeaseStore",
    sourceName:
      "searchSession",
    overrides,
    loadDefault:
      () => require(
        "../storage/searchSession"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "initialSearchIdempotencyStore",
    sourceName:
      "searchIdempotency",
    overrides,
    loadDefault:
      () => require(
        "../storage/searchIdempotency"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "bookingVerificationStore",
    sourceName:
      "bookingVerification",
    overrides,
    loadDefault:
      () => require(
        "../storage/bookingVerificationStore"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "bookingHandoffStore",
    sourceName:
      "bookingHandoff",
    overrides,
    loadDefault:
      () => require(
        "../storage/bookingHandoffStore"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "endpointRateLimitStoreFactory",
    sourceName:
      "endpointRateLimits",
    overrides,
    loadDefault:
      () => require(
        "../middleware/endpointRateLimits"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "providerCapacityCoordinator",
    sourceName:
      "providerCapacity",
    overrides,
    loadDefault:
      () => require(
        "../providers/common/inMemoryProviderCapacityCoordinator"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "providerHealthStore",
    sourceName:
      "providerHealth",
    overrides,
    loadDefault:
      () => require(
        "../providers/common/providerHealthService"
      ),
  });

  defineLazyPort({
    target: state,
    portName:
      "searchQueueAdmission",
    sourceName:
      "searchQueueAdmission",
    overrides,
    loadDefault:
      () =>
        disabledSearchQueueAdmission,
  });

  return Object.freeze(state);
}

function getOperationalState() {
  return createInMemoryOperationalState();
}

module.exports = {
  createSearchQueueDisabledError,
  createInMemoryOperationalState,
  getOperationalState,
};
