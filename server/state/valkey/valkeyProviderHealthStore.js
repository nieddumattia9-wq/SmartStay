"use strict";

const crypto = require("crypto");

const {
  normalizePositiveInteger,
} = require("./valkeyShared");

const PROVIDER_CIRCUIT_STATES =
  Object.freeze({
    CLOSED: "closed",
    OPEN: "open",
    HALF_OPEN: "half_open",
  });

const DEFAULT_PROVIDER_HEALTH_POLICY =
  Object.freeze({
    failureThreshold: 3,
    cooldownMs: 120_000,
  });

const DEFAULT_HEALTH_TTL_MS =
  24 * 60 * 60 * 1000;
const DEFAULT_HALF_OPEN_PROBE_LEASE_MS =
  30_000;

const BEGIN_ATTEMPT_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local cooldown = tonumber(ARGV[2])
local probe_lease = tonumber(ARGV[3])
local record_ttl = tonumber(ARGV[4])
local attempt_token = ARGV[5]
local state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
local next_attempt = tonumber(redis.call('HGET', KEYS[1], 'nextAttemptAt') or '0')

local function result(allowed, reason, token)
  local current_state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
  return {
    tostring(allowed),
    reason,
    token or '',
    current_state,
    redis.call('HGET', KEYS[1], 'consecutiveFailures') or '0',
    redis.call('HGET', KEYS[1], 'openedAt') or '',
    redis.call('HGET', KEYS[1], 'nextAttemptAt') or '',
    redis.call('HGET', KEYS[1], 'lastAttemptAt') or '',
    redis.call('HGET', KEYS[1], 'lastSuccessAt') or '',
    redis.call('HGET', KEYS[1], 'lastFailureAt') or '',
    redis.call('HGET', KEYS[1], 'lastErrorType') or '',
    redis.call('HGET', KEYS[1], 'lastErrorStatus') or '',
    redis.call('HGET', KEYS[1], 'halfOpenProbeToken') and '1' or '0'
  }
end

if state == 'open' then
  if next_attempt > now then
    redis.call('PEXPIRE', KEYS[1], record_ttl)
    redis.call('SADD', KEYS[2], KEYS[1])
    return result(0, 'circuit_open', '')
  end

  state = 'half_open'
  redis.call('HSET', KEYS[1], 'circuitState', state)
  redis.call('HDEL', KEYS[1], 'halfOpenProbeToken', 'halfOpenProbeExpiresAt')
end

if state == 'half_open' then
  local existing_token = redis.call('HGET', KEYS[1], 'halfOpenProbeToken')
  local existing_expiry = tonumber(redis.call('HGET', KEYS[1], 'halfOpenProbeExpiresAt') or '0')

  if existing_token and existing_expiry > now then
    redis.call('PEXPIRE', KEYS[1], record_ttl)
    redis.call('SADD', KEYS[2], KEYS[1])
    return result(0, 'half_open_probe_in_flight', '')
  end

  redis.call('HSET', KEYS[1],
    'circuitState', 'half_open',
    'halfOpenProbeToken', attempt_token,
    'halfOpenProbeExpiresAt', now + probe_lease,
    'lastAttemptAt', now)
  redis.call('PEXPIRE', KEYS[1], record_ttl)
  redis.call('SADD', KEYS[2], KEYS[1])
  return result(1, 'half_open_probe', attempt_token)
end

redis.call('HSET', KEYS[1],
  'circuitState', 'closed',
  'lastAttemptAt', now)
redis.call('HSETNX', KEYS[1], 'consecutiveFailures', 0)
redis.call('PEXPIRE', KEYS[1], record_ttl)
redis.call('SADD', KEYS[2], KEYS[1])
return result(1, 'circuit_closed', '')
`;

const RECORD_SUCCESS_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local record_ttl = tonumber(ARGV[2])
local attempt_token = ARGV[3]
local state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
local current_token = redis.call('HGET', KEYS[1], 'halfOpenProbeToken') or ''

local function result(reason)
  local current_state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
  return {
    '1', reason, '', current_state,
    redis.call('HGET', KEYS[1], 'consecutiveFailures') or '0',
    redis.call('HGET', KEYS[1], 'openedAt') or '',
    redis.call('HGET', KEYS[1], 'nextAttemptAt') or '',
    redis.call('HGET', KEYS[1], 'lastAttemptAt') or '',
    redis.call('HGET', KEYS[1], 'lastSuccessAt') or '',
    redis.call('HGET', KEYS[1], 'lastFailureAt') or '',
    redis.call('HGET', KEYS[1], 'lastErrorType') or '',
    redis.call('HGET', KEYS[1], 'lastErrorStatus') or '',
    redis.call('HGET', KEYS[1], 'halfOpenProbeToken') and '1' or '0'
  }
end

if (state == 'half_open' or state == 'open') and
   (attempt_token == '' or attempt_token ~= current_token) then
  return result('stale')
end

redis.call('HSET', KEYS[1],
  'circuitState', 'closed',
  'consecutiveFailures', 0,
  'lastSuccessAt', now)
redis.call('HDEL', KEYS[1],
  'openedAt',
  'nextAttemptAt',
  'halfOpenProbeToken',
  'halfOpenProbeExpiresAt')
redis.call('PEXPIRE', KEYS[1], record_ttl)
redis.call('SADD', KEYS[2], KEYS[1])
return result('updated')
`;

const RECORD_FAILURE_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local threshold = tonumber(ARGV[2])
local cooldown = tonumber(ARGV[3])
local record_ttl = tonumber(ARGV[4])
local explicit_retry = tonumber(ARGV[5])
local retry_after = tonumber(ARGV[6])
local attempt_token = ARGV[7]
local error_type = ARGV[8]
local error_status = ARGV[9]
local state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
local current_token = redis.call('HGET', KEYS[1], 'halfOpenProbeToken') or ''

local function result(reason)
  local current_state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
  return {
    '1', reason, '', current_state,
    redis.call('HGET', KEYS[1], 'consecutiveFailures') or '0',
    redis.call('HGET', KEYS[1], 'openedAt') or '',
    redis.call('HGET', KEYS[1], 'nextAttemptAt') or '',
    redis.call('HGET', KEYS[1], 'lastAttemptAt') or '',
    redis.call('HGET', KEYS[1], 'lastSuccessAt') or '',
    redis.call('HGET', KEYS[1], 'lastFailureAt') or '',
    redis.call('HGET', KEYS[1], 'lastErrorType') or '',
    redis.call('HGET', KEYS[1], 'lastErrorStatus') or '',
    redis.call('HGET', KEYS[1], 'halfOpenProbeToken') and '1' or '0'
  }
end

if state == 'half_open' and
   (attempt_token == '' or attempt_token ~= current_token) then
  return result('stale')
end

if state == 'open' then
  return result('stale')
end

local failures = tonumber(redis.call('HGET', KEYS[1], 'consecutiveFailures') or '0') + 1
local should_open = state == 'half_open' or explicit_retry == 1 or failures >= threshold

redis.call('HSET', KEYS[1],
  'consecutiveFailures', failures,
  'lastFailureAt', now,
  'lastErrorType', error_type,
  'lastErrorStatus', error_status)
redis.call('HDEL', KEYS[1], 'halfOpenProbeToken', 'halfOpenProbeExpiresAt')

if should_open then
  local delay = cooldown
  if explicit_retry == 1 then
    delay = retry_after
  end
  redis.call('HSET', KEYS[1],
    'circuitState', 'open',
    'openedAt', now,
    'nextAttemptAt', now + delay)
else
  redis.call('HSET', KEYS[1], 'circuitState', 'closed')
  redis.call('HDEL', KEYS[1], 'openedAt', 'nextAttemptAt')
end

redis.call('PEXPIRE', KEYS[1], record_ttl)
redis.call('SADD', KEYS[2], KEYS[1])
return result('updated')
`;

const GET_HEALTH_SCRIPT = String.raw`
local state = redis.call('HGET', KEYS[1], 'circuitState') or 'closed'
return {
  '1', 'snapshot', '', state,
  redis.call('HGET', KEYS[1], 'consecutiveFailures') or '0',
  redis.call('HGET', KEYS[1], 'openedAt') or '',
  redis.call('HGET', KEYS[1], 'nextAttemptAt') or '',
  redis.call('HGET', KEYS[1], 'lastAttemptAt') or '',
  redis.call('HGET', KEYS[1], 'lastSuccessAt') or '',
  redis.call('HGET', KEYS[1], 'lastFailureAt') or '',
  redis.call('HGET', KEYS[1], 'lastErrorType') or '',
  redis.call('HGET', KEYS[1], 'lastErrorStatus') or '',
  redis.call('HGET', KEYS[1], 'halfOpenProbeToken') and '1' or '0'
}
`;

const RESET_ONE_SCRIPT = String.raw`
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], KEYS[1])
return 1
`;

const RESET_ALL_SCRIPT = String.raw`
local keys = redis.call('SMEMBERS', KEYS[1])
for _, key in ipairs(keys) do
  redis.call('DEL', key)
end
redis.call('DEL', KEYS[1])
return #keys
`;

function validateProviderId(value) {
  const providerId =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !providerId ||
    providerId.length > 128
  ) {
    throw new Error(
      "A valid providerId is required."
    );
  }

  return providerId;
}

function resolveNow(options = {}) {
  return Number.isFinite(
    options.nowMs
  )
    ? Number(options.nowMs)
    : Date.now();
}

function resolveProviderHealthPolicy(
  policy = {},
  defaults =
    DEFAULT_PROVIDER_HEALTH_POLICY
) {
  return {
    failureThreshold:
      normalizePositiveInteger(
        policy.failureThreshold,
        defaults.failureThreshold,
        {
          minimum: 1,
          maximum: 100,
        }
      ),
    cooldownMs:
      normalizePositiveInteger(
        policy.cooldownMs,
        defaults.cooldownMs,
        {
          minimum: 50,
          maximum:
            24 * 60 * 60 * 1000,
        }
      ),
  };
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function parseSnapshot(
  result,
  providerId,
  now
) {
  const circuitState =
    String(result?.[3] ?? "closed");
  const nextAttemptAt =
    nullableNumber(result?.[6]);

  return {
    providerId,
    circuitState,
    consecutiveFailures:
      Math.max(
        0,
        Number(result?.[4]) || 0
      ),
    openedAt:
      nullableNumber(result?.[5]),
    nextAttemptAt,
    lastAttemptAt:
      nullableNumber(result?.[7]),
    lastSuccessAt:
      nullableNumber(result?.[8]),
    lastFailureAt:
      nullableNumber(result?.[9]),
    lastErrorType:
      String(result?.[10] ?? "") ||
      null,
    lastErrorMessage: null,
    lastErrorStatus:
      nullableNumber(result?.[11]),
    halfOpenProbeInFlight:
      String(result?.[12] ?? "0") ===
      "1",
    retryAfterMs:
      circuitState === "open" &&
      nextAttemptAt !== null
        ? Math.max(
            0,
            nextAttemptAt - now
          )
        : 0,
  };
}

function normalizeFailureType(failure) {
  const source =
    failure?.errorType ??
    failure?.code ??
    "provider_error";

  return String(source)
    .trim()
    .slice(0, 96) ||
    "provider_error";
}

function normalizeFailureStatus(failure) {
  const status =
    Number(failure?.status);

  return Number.isFinite(status)
    ? String(status)
    : "";
}

function createValkeyProviderHealthStore({
  executor,
  keyspace,
  failureThreshold =
    DEFAULT_PROVIDER_HEALTH_POLICY
      .failureThreshold,
  cooldownMs =
    DEFAULT_PROVIDER_HEALTH_POLICY
      .cooldownMs,
  recordTtlMs =
    DEFAULT_HEALTH_TTL_MS,
  halfOpenProbeLeaseMs =
    DEFAULT_HALF_OPEN_PROBE_LEASE_MS,
} = {}) {
  if (
    !executor ||
    typeof executor.execute !== "function" ||
    !keyspace ||
    typeof keyspace.providerCircuit !==
      "function"
  ) {
    throw new TypeError(
      "A Valkey executor and keyspace are required for provider health."
    );
  }

  const defaults =
    resolveProviderHealthPolicy({
      failureThreshold,
      cooldownMs,
    });
  const safeRecordTtlMs =
    normalizePositiveInteger(
      recordTtlMs,
      DEFAULT_HEALTH_TTL_MS,
      {
        minimum: 1_000,
        maximum:
          30 * 24 * 60 * 60 * 1000,
      }
    );
  const safeHalfOpenProbeLeaseMs =
    normalizePositiveInteger(
      halfOpenProbeLeaseMs,
      DEFAULT_HALF_OPEN_PROBE_LEASE_MS,
      {
        minimum: 50,
        maximum: 10 * 60 * 1000,
      }
    );

  function keys(providerId) {
    return [
      keyspace.providerCircuit(
        providerId
      ),
      keyspace.providerCircuitIndex,
    ];
  }

  async function beginProviderAttempt(
    providerId,
    options = {}
  ) {
    const safeProviderId =
      validateProviderId(providerId);
    const now = resolveNow(options);
    const policy =
      resolveProviderHealthPolicy(
        options.policy,
        defaults
      );
    const attemptToken =
      crypto.randomUUID();
    const result =
      await executor.execute(
        (client) =>
          client.eval(
            BEGIN_ATTEMPT_SCRIPT,
            {
              keys: keys(
                safeProviderId
              ),
              arguments: [
                String(now),
                String(
                  policy.cooldownMs
                ),
                String(
                  safeHalfOpenProbeLeaseMs
                ),
                String(
                  safeRecordTtlMs
                ),
                attemptToken,
              ],
            }
          )
      );
    const allowed =
      String(result?.[0]) === "1";
    const returnedToken =
      String(result?.[2] ?? "");

    return {
      allowed,
      reason:
        String(
          result?.[1] ??
            "circuit_closed"
        ),
      attemptToken:
        allowed && returnedToken
          ? returnedToken
          : null,
      health:
        parseSnapshot(
          result,
          safeProviderId,
          now
        ),
    };
  }

  async function recordProviderSuccess(
    providerId,
    options = {}
  ) {
    const safeProviderId =
      validateProviderId(providerId);
    const now = resolveNow(options);
    const attemptToken =
      typeof options.attemptToken ===
        "string"
        ? options.attemptToken
        : "";
    const result =
      await executor.execute(
        (client) =>
          client.eval(
            RECORD_SUCCESS_SCRIPT,
            {
              keys: keys(
                safeProviderId
              ),
              arguments: [
                String(now),
                String(
                  safeRecordTtlMs
                ),
                attemptToken,
              ],
            }
          )
      );

    return parseSnapshot(
      result,
      safeProviderId,
      now
    );
  }

  async function recordProviderFailure(
    providerId,
    failure = {},
    options = {}
  ) {
    const safeProviderId =
      validateProviderId(providerId);
    const now = resolveNow(options);
    const policy =
      resolveProviderHealthPolicy(
        options.policy,
        defaults
      );
    const retryAfterMs =
      Number(failure.retryAfterMs);
    const explicitRetry =
      failure.retryAfterWasExplicit ===
        true &&
      Number.isFinite(retryAfterMs) &&
      retryAfterMs >= 0;
    const attemptToken =
      typeof options.attemptToken ===
        "string"
        ? options.attemptToken
        : "";
    const result =
      await executor.execute(
        (client) =>
          client.eval(
            RECORD_FAILURE_SCRIPT,
            {
              keys: keys(
                safeProviderId
              ),
              arguments: [
                String(now),
                String(
                  policy
                    .failureThreshold
                ),
                String(
                  policy.cooldownMs
                ),
                String(
                  safeRecordTtlMs
                ),
                explicitRetry
                  ? "1"
                  : "0",
                String(
                  explicitRetry
                    ? retryAfterMs
                    : 0
                ),
                attemptToken,
                normalizeFailureType(
                  failure
                ),
                normalizeFailureStatus(
                  failure
                ),
              ],
            }
          )
      );

    return parseSnapshot(
      result,
      safeProviderId,
      now
    );
  }

  async function recordProviderHealthyResponse(
    providerId,
    options = {}
  ) {
    return recordProviderSuccess(
      providerId,
      options
    );
  }

  async function getProviderHealth(
    providerId,
    options = {}
  ) {
    const safeProviderId =
      validateProviderId(providerId);
    const now = resolveNow(options);
    const result =
      await executor.execute(
        (client) =>
          client.eval(
            GET_HEALTH_SCRIPT,
            {
              keys: [
                keyspace
                  .providerCircuit(
                    safeProviderId
                  ),
              ],
              arguments: [],
            }
          )
      );

    return parseSnapshot(
      result,
      safeProviderId,
      now
    );
  }

  async function resetProviderHealth(
    providerId
  ) {
    const safeProviderId =
      validateProviderId(providerId);

    await executor.execute(
      (client) =>
        client.eval(
          RESET_ONE_SCRIPT,
          {
            keys: keys(
              safeProviderId
            ),
            arguments: [],
          }
        )
    );
  }

  async function resetAllProviderHealth() {
    await executor.execute(
      (client) =>
        client.eval(
          RESET_ALL_SCRIPT,
          {
            keys: [
              keyspace
                .providerCircuitIndex,
            ],
            arguments: [],
          }
        )
    );
  }

  return Object.freeze({
    PROVIDER_CIRCUIT_STATES,
    DEFAULT_PROVIDER_HEALTH_POLICY:
      Object.freeze({
        ...defaults,
      }),
    beginProviderAttempt,
    recordProviderSuccess,
    recordProviderFailure,
    recordProviderHealthyResponse,
    getProviderHealth,
    resetProviderHealth,
    resetAllProviderHealth,
  });
}

module.exports = {
  PROVIDER_CIRCUIT_STATES,
  DEFAULT_PROVIDER_HEALTH_POLICY,
  DEFAULT_HEALTH_TTL_MS,
  DEFAULT_HALF_OPEN_PROBE_LEASE_MS,
  createValkeyProviderHealthStore,
};
