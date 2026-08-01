"use strict";

const {
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
  });
}

module.exports = {
  createValkeyOperationalStateResources,
  getValkeyOperationalStateConfig,
};
