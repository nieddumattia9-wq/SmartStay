"use strict";

const OPERATIONAL_STATE_MODES =
  Object.freeze({
    IN_MEMORY_SINGLE_INSTANCE:
      "in-memory-single-instance",

    VALKEY_DISTRIBUTED:
      "valkey-distributed",
  });

function createPortContract({
  interfaceName,
  methods,
  values = [],
}) {
  return Object.freeze({
    interfaceName,
    methods:
      Object.freeze([
        ...methods,
      ]),
    values:
      Object.freeze([
        ...values,
      ]),
  });
}

const OPERATIONAL_STATE_PORT_CONTRACTS =
  Object.freeze({
    searchSessionStore:
      createPortContract({
        interfaceName:
          "SearchSessionStore",
        methods: [
          "saveSearchSession",
          "getSearchSession",
          "getSearchSessionState",
          "requireSearchSession",
          "claimInitialSearchExecution",
          "updateInitialSearchExecution",
          "updateSearchSession",
          "appendHotelsToSearchSession",
          "clearSearchSession",
          "getSearchSessionCount",
        ],
      }),

    continuationLeaseStore:
      createPortContract({
        interfaceName:
          "ContinuationLeaseStore",
        methods: [
          "tryAcquireSearchContinuation",
          "renewSearchContinuation",
          "releaseSearchContinuation",
        ],
      }),

    initialSearchIdempotencyStore:
      createPortContract({
        interfaceName:
          "InitialSearchIdempotencyStore",
        methods: [
          "normalizeIdempotencyKey",
          "validateIdempotencyKey",
          "createSearchPayloadFingerprint",
          "isSearchIdempotencyError",
          "executeInitialSearchIdempotently",
          "clearSearchIdempotencyRecords",
          "getSearchIdempotencyRecordCount",
          "getSearchIdempotencyStoredResponseBytes",
        ],
      }),

    bookingVerificationStore:
      createPortContract({
        interfaceName:
          "BookingVerificationStore",
        methods: [
          "saveBookingVerification",
          "getBookingVerification",
          "requireBookingVerification",
        ],
      }),

    bookingHandoffStore:
      createPortContract({
        interfaceName:
          "BookingHandoffStore",
        methods: [
          "saveBookingHandoff",
          "requireBookingHandoff",
        ],
      }),

    endpointRateLimitStoreFactory:
      createPortContract({
        interfaceName:
          "EndpointRateLimitStoreFactory",
        methods: [
          "createEndpointRateLimiters",
          "createLimiter",
          "createRateLimitHandler",
          "normalizeRetryAfterMs",
        ],
      }),

    providerCapacityCoordinator:
      createPortContract({
        interfaceName:
          "ProviderCapacityCoordinator",
        methods: [
          "acquireProviderOperationCapacity",
          "createProviderOperationCapacityError",
          "getProviderOperationCapacitySnapshot",
        ],
        values: [
          "MAX_PROVIDER_CONCURRENT_OPERATIONS",
          "MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER",
          "MAX_PROVIDER_QUEUED_OPERATIONS",
          "MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER",
        ],
      }),

    providerHealthStore:
      createPortContract({
        interfaceName:
          "ProviderHealthStore",
        methods: [
          "beginProviderAttempt",
          "recordProviderSuccess",
          "recordProviderFailure",
          "recordProviderHealthyResponse",
          "getProviderHealth",
          "resetProviderHealth",
          "resetAllProviderHealth",
        ],
      }),

    searchQueueAdmission:
      createPortContract({
        interfaceName:
          "SearchQueueAdmission",
        methods: [
          "admitSearch",
          "beginSearchExecution",
          "renewSearchAdmission",
          "releaseSearchAdmission",
          "writeSearchWorkerHeartbeat",
          "removeSearchWorkerHeartbeat",
          "getSearchQueueAdmissionSnapshot",
        ],
        values: [
          "enabled",
        ],
      }),
  });

function createOperationalStateContractError(
  message
) {
  const error =
    new TypeError(message);

  error.code =
    "OPERATIONAL_STATE_CONTRACT_INVALID";

  return error;
}

function getOperationalStatePortContract(
  portName
) {
  const contract =
    OPERATIONAL_STATE_PORT_CONTRACTS[
      portName
    ];

  if (!contract) {
    throw createOperationalStateContractError(
      `Unknown operational state port "${portName}".`
    );
  }

  return contract;
}

function assertOperationalStatePort(
  portName,
  adapter
) {
  const contract =
    getOperationalStatePortContract(
      portName
    );

  if (
    !adapter ||
    typeof adapter !== "object" ||
    Array.isArray(adapter)
  ) {
    throw createOperationalStateContractError(
      `${contract.interfaceName} adapter must be an object.`
    );
  }

  for (const methodName of contract.methods) {
    if (
      typeof adapter[methodName] !==
        "function"
    ) {
      throw createOperationalStateContractError(
        `${contract.interfaceName} is missing method "${methodName}".`
      );
    }
  }

  for (const valueName of contract.values) {
    if (
      adapter[valueName] ===
        undefined
    ) {
      throw createOperationalStateContractError(
        `${contract.interfaceName} is missing value "${valueName}".`
      );
    }
  }

  return adapter;
}

function createOperationalStatePort(
  portName,
  source,
  metadata = {}
) {
  const contract =
    getOperationalStatePortContract(
      portName
    );

  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {
    throw createOperationalStateContractError(
      `${contract.interfaceName} adapter must be an object.`
    );
  }

  const adapter = {
    interfaceName:
      contract.interfaceName,
    implementation:
      metadata.implementation ??
      "unspecified",
  };

  for (const methodName of contract.methods) {
    Object.defineProperty(
      adapter,
      methodName,
      {
        enumerable:
          true,
        get() {
          const method =
            source[methodName];

          if (
            typeof method !==
              "function"
          ) {
            throw createOperationalStateContractError(
              `${contract.interfaceName} is missing method "${methodName}".`
            );
          }

          return method;
        },
      }
    );
  }

  for (const valueName of contract.values) {
    Object.defineProperty(
      adapter,
      valueName,
      {
        enumerable:
          true,
        get() {
          const value =
            source[valueName];

          if (
            value ===
              undefined
          ) {
            throw createOperationalStateContractError(
              `${contract.interfaceName} is missing value "${valueName}".`
            );
          }

          return value;
        },
      }
    );
  }

  return Object.freeze(
    adapter
  );
}

module.exports = {
  OPERATIONAL_STATE_MODES,
  OPERATIONAL_STATE_PORT_CONTRACTS,
  getOperationalStatePortContract,
  assertOperationalStatePort,
  createOperationalStatePort,
};
