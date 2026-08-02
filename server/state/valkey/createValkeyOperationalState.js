"use strict";

const {
  VALKEY_KEYSPACE_VERSION,
  createValkeyKeyspace,
  createValkeyCommandExecutor,
  normalizePositiveInteger,
} = require("./valkeyShared");

const {
  createValkeySearchSessionAdapters,
} = require(
  "./valkeySearchSessionStore"
);

const {
  createValkeySearchIdempotencyStore,
} = require(
  "./valkeySearchIdempotencyStore"
);

const {
  createValkeyBookingStores,
} = require("./valkeyBookingStores");

const {
  createValkeyEndpointRateLimitStoreFactory,
} = require(
  "./valkeyEndpointRateLimitStore"
);

const {
  createValkeyProviderCapacityCoordinator,
} = require(
  "./valkeyProviderCapacityCoordinator"
);

const {
  createValkeyProviderHealthStore,
} = require(
  "./valkeyProviderHealthStore"
);

function createValkeyOperationalStateResources({
  url,
  environment,
  hmacSecret,
  connectTimeoutMs,
  commandTimeoutMs,
  sessionTtlMs,
  tombstoneRetentionMs,
  continuationLeaseTtlMs,
  maxSessions,
  maxSessionBytes,
  aggregateSessionBytes,
  casRetries,
  idempotencyTtlMs,
  idempotencyPendingWaitMs,
  idempotencyPendingPollMs,
  idempotencyResponseMaxBytes,
  idempotencyMaxRecords,
  idempotencyMaxStoredResponseBytes,
  verificationTtlMs,
  handoffTtlMs,
  maxBookingVerifications,
  maxBookingHandoffs,
  providerGlobalActiveLimit,
  providerPerProviderActiveLimit,
  providerGlobalQueuedLimit,
  providerPerProviderQueuedLimit,
  providerLeaseTtlMs,
  providerAcquirePollMs,
  providerAccountRateLimits,
  providerAccountRateLimitsRequired,
  providerLeaseRenewalEnabled,
  providerCircuitFailureThreshold,
  providerCircuitCooldownMs,
  providerCircuitRecordTtlMs,
  providerHalfOpenProbeLeaseMs,
  createClient,
} = {}) {
  const keyspace = createValkeyKeyspace({
    environment,
    hmacSecret,
  });
  const executor =
    createValkeyCommandExecutor({
      url,
      connectTimeoutMs,
      commandTimeoutMs,
      createClient,
    });
  const search =
    createValkeySearchSessionAdapters({
      executor,
      keyspace,
      sessionTtlMs,
      tombstoneRetentionMs,
      continuationLeaseTtlMs,
      maxSessions,
      maxSessionBytes,
      aggregateSessionBytes,
      casRetries,
    });
  const idempotency =
    createValkeySearchIdempotencyStore({
      executor,
      keyspace,
      ttlMs: idempotencyTtlMs,
      pendingWaitMs:
        idempotencyPendingWaitMs,
      pendingPollMs:
        idempotencyPendingPollMs,
      maxResponseBytes:
        idempotencyResponseMaxBytes,
      maxRecords:
        idempotencyMaxRecords,
      maxStoredResponseBytes:
        idempotencyMaxStoredResponseBytes,
    });
  const booking = createValkeyBookingStores({
    executor,
    keyspace,
    verificationTtlMs,
    handoffTtlMs,
    maxBookingVerifications,
    maxBookingHandoffs,
  });
  const endpointRateLimitStoreFactory =
    createValkeyEndpointRateLimitStoreFactory({
      executor,
      keyspace,
    });
  const providerCapacityCoordinator =
    createValkeyProviderCapacityCoordinator({
      executor,
      keyspace,
      globalActiveLimit:
        providerGlobalActiveLimit,
      perProviderActiveLimit:
        providerPerProviderActiveLimit,
      globalQueuedLimit:
        providerGlobalQueuedLimit,
      perProviderQueuedLimit:
        providerPerProviderQueuedLimit,
      leaseTtlMs:
        providerLeaseTtlMs,
      acquirePollMs:
        providerAcquirePollMs,
      providerAccountRateLimits,
      accountRateLimitsRequired:
        providerAccountRateLimitsRequired,
      leaseRenewalEnabled:
        providerLeaseRenewalEnabled,
    });
  const providerHealthStore =
    createValkeyProviderHealthStore({
      executor,
      keyspace,
      failureThreshold:
        providerCircuitFailureThreshold,
      cooldownMs:
        providerCircuitCooldownMs,
      recordTtlMs:
        providerCircuitRecordTtlMs,
      halfOpenProbeLeaseMs:
        providerHalfOpenProbeLeaseMs,
    });

  return Object.freeze({
    keyspace,
    executor,
    searchSessionStore:
      search.searchSessionStore,
    continuationLeaseStore:
      search.continuationLeaseStore,
    initialSearchIdempotencyStore:
      idempotency,
    bookingVerificationStore:
      booking.bookingVerificationStore,
    bookingHandoffStore:
      booking.bookingHandoffStore,
    endpointRateLimitStoreFactory,
    providerCapacityCoordinator,
    providerHealthStore,
    async getReadinessSnapshot() {
      const observedSchemaVersion =
        await executor.execute(
          async (client) => {
            await client.set(
              keyspace
                .stateSchemaVersion,
              VALKEY_KEYSPACE_VERSION,
              {
                NX:
                  true,
              }
            );

            return client.get(
              keyspace
                .stateSchemaVersion
            );
          }
        );

      return Object.freeze({
        ready:
          observedSchemaVersion ===
          VALKEY_KEYSPACE_VERSION,
        mode:
          "valkey-distributed",
        expectedSchemaVersion:
          VALKEY_KEYSPACE_VERSION,
        observedSchemaVersion:
          observedSchemaVersion ??
          null,
      });
    },
    async ping() {
      return executor.execute(
        (client) => client.ping()
      );
    },
    close: executor.close,
  });
}

function getValkeyOperationalStateConfig(
  environmentVariables = process.env
) {
  const deploymentEnvironment =
    String(
      environmentVariables
        .DEPLOYMENT_ENV ??
      environmentVariables.NODE_ENV ??
      "development"
    )
      .trim()
      .toLowerCase();

  return Object.freeze({
    url:
      environmentVariables
        .SMARTSTAY_STATE_REDIS_URL,
    environment:
      environmentVariables
        .SMARTSTAY_STATE_ENVIRONMENT,
    hmacSecret:
      environmentVariables
        .SMARTSTAY_STATE_KEY_SECRET,
    connectTimeoutMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_STATE_CONNECT_TIMEOUT_MS,
        undefined,
        { minimum: 100, maximum: 30_000 }
      ),
    commandTimeoutMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_STATE_COMMAND_TIMEOUT_MS,
        undefined,
        { minimum: 100, maximum: 30_000 }
      ),
    aggregateSessionBytes:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES,
        undefined,
        {
          minimum: 1024 * 1024,
          maximum: 8 * 1024 * 1024 * 1024,
        }
      ),
    providerGlobalActiveLimit:
      environmentVariables
        .PROVIDER_MAX_CONCURRENT_OPERATIONS,
    providerPerProviderActiveLimit:
      environmentVariables
        .PROVIDER_MAX_CONCURRENT_OPERATIONS_PER_PROVIDER,
    providerGlobalQueuedLimit:
      environmentVariables
        .PROVIDER_MAX_QUEUED_OPERATIONS,
    providerPerProviderQueuedLimit:
      environmentVariables
        .PROVIDER_MAX_QUEUED_OPERATIONS_PER_PROVIDER,
    providerLeaseTtlMs:
      environmentVariables
        .PROVIDER_CAPACITY_LEASE_TTL_MS,
    providerAcquirePollMs:
      environmentVariables
        .PROVIDER_CAPACITY_ACQUIRE_POLL_MS,
    providerAccountRateLimits:
      environmentVariables
        .PROVIDER_ACCOUNT_RATE_LIMITS_JSON,
    providerAccountRateLimitsRequired:
      deploymentEnvironment ===
        "staging" ||
      deploymentEnvironment ===
        "production",
    providerCircuitFailureThreshold:
      environmentVariables
        .PROVIDER_CIRCUIT_FAILURE_THRESHOLD,
    providerCircuitCooldownMs:
      environmentVariables
        .PROVIDER_CIRCUIT_COOLDOWN_MS,
    providerCircuitRecordTtlMs:
      environmentVariables
        .PROVIDER_CIRCUIT_RECORD_TTL_MS,
    providerHalfOpenProbeLeaseMs:
      environmentVariables
        .PROVIDER_HALF_OPEN_PROBE_LEASE_MS,
  });
}

module.exports = {
  createValkeyOperationalStateResources,
  getValkeyOperationalStateConfig,
};
