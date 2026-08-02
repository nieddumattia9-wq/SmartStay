"use strict";

const crypto = require("crypto");

const {
  createOperationalStateError,
  createOperationalStateUnavailableError,
  normalizePositiveInteger,
} = require("./valkeyShared");

const DEFAULT_GLOBAL_ACTIVE_LIMIT = 8;
const DEFAULT_PER_PROVIDER_ACTIVE_LIMIT = 8;
const DEFAULT_GLOBAL_QUEUED_LIMIT = 64;
const DEFAULT_PER_PROVIDER_QUEUED_LIMIT = 32;
const DEFAULT_LEASE_TTL_MS = 40_000;
const DEFAULT_ACQUIRE_POLL_MS = 25;
const DEFAULT_RETRY_AFTER_MS = 250;

const ACQUIRE_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local lease_ttl = tonumber(ARGV[2])
local waiter_ttl = tonumber(ARGV[3])
local global_limit = tonumber(ARGV[4])
local provider_limit = tonumber(ARGV[5])
local global_queue_limit = tonumber(ARGV[6])
local provider_queue_limit = tonumber(ARGV[7])
local lease_token = ARGV[8]
local waiter_token = ARGV[9]
local rate_max = tonumber(ARGV[10])
local rate_window = tonumber(ARGV[11])

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now)
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', now)

local global_active = redis.call('ZCARD', KEYS[1])
local provider_active = redis.call('ZCARD', KEYS[2])

if global_active < global_limit and provider_active < provider_limit then
  if rate_max > 0 then
    local current = tonumber(redis.call('GET', KEYS[5]) or '0')
    local ttl = redis.call('PTTL', KEYS[5])

    if ttl <= 0 then
      current = 0
    end

    if current >= rate_max then
      redis.call('ZREM', KEYS[3], waiter_token)
      redis.call('ZREM', KEYS[4], waiter_token)
      return {'rate-limited', tostring(math.max(1, ttl))}
    end

    if current == 0 then
      redis.call('SET', KEYS[5], 1, 'PX', rate_window)
    else
      redis.call('INCR', KEYS[5])
    end
  end

  local expires_at = now + lease_ttl
  redis.call('ZADD', KEYS[1], expires_at, lease_token)
  redis.call('ZADD', KEYS[2], expires_at, lease_token)
  redis.call('ZREM', KEYS[3], waiter_token)
  redis.call('ZREM', KEYS[4], waiter_token)
  return {'acquired', tostring(expires_at)}
end

local already_waiting = redis.call('ZSCORE', KEYS[3], waiter_token)

if not already_waiting then
  if redis.call('ZCARD', KEYS[3]) >= global_queue_limit or
     redis.call('ZCARD', KEYS[4]) >= provider_queue_limit then
    return {'queue-full'}
  end
end

local waiter_expires_at = now + waiter_ttl
redis.call('ZADD', KEYS[3], waiter_expires_at, waiter_token)
redis.call('ZADD', KEYS[4], waiter_expires_at, waiter_token)
return {'waiting'}
`;

const RENEW_SCRIPT = String.raw`
local global_score = redis.call('ZSCORE', KEYS[1], ARGV[1])
local provider_score = redis.call('ZSCORE', KEYS[2], ARGV[1])

if not global_score or not provider_score then
  return 0
end

local expires_at = tonumber(ARGV[2]) + tonumber(ARGV[3])
redis.call('ZADD', KEYS[1], expires_at, ARGV[1])
redis.call('ZADD', KEYS[2], expires_at, ARGV[1])
return expires_at
`;

const RELEASE_SCRIPT = String.raw`
local removed_global = redis.call('ZREM', KEYS[1], ARGV[1])
local removed_provider = redis.call('ZREM', KEYS[2], ARGV[1])
if removed_global == 1 and removed_provider == 1 then
  return 1
end
return 0
`;

const REMOVE_WAITER_SCRIPT = String.raw`
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('ZREM', KEYS[2], ARGV[1])
return 1
`;

const SNAPSHOT_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
local active = redis.call('ZCARD', KEYS[1])
local queued = redis.call('ZCARD', KEYS[2])

if #KEYS >= 4 then
  redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now)
  redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', now)
  return {
    tostring(active),
    tostring(queued),
    tostring(redis.call('ZCARD', KEYS[3])),
    tostring(redis.call('ZCARD', KEYS[4]))
  }
end

return {tostring(active), tostring(queued)}
`;

function normalizeProviderId(value) {
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

function normalizeOperationName(value) {
  const methodName =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !methodName ||
    methodName.length > 128
  ) {
    throw new Error(
      "A valid provider operation name is required."
    );
  }

  return methodName;
}

function createConfigurationError(
  message
) {
  return createOperationalStateError({
    code:
      "OPERATIONAL_STATE_CONFIGURATION_INVALID",
    message,
    status: 500,
  });
}

function parseProviderAccountRateLimits(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return Object.freeze({});
  }

  let source = value;

  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      throw createConfigurationError(
        "PROVIDER_ACCOUNT_RATE_LIMITS_JSON must be valid JSON."
      );
    }
  }

  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {
    throw createConfigurationError(
      "Provider account rate limits must be an object keyed by provider id."
    );
  }

  const result = {};

  for (const [rawProviderId, rawPolicy] of
    Object.entries(source)) {
    const providerId =
      rawProviderId === "*"
        ? "*"
        : normalizeProviderId(
            rawProviderId
          );

    if (
      !rawPolicy ||
      typeof rawPolicy !== "object" ||
      Array.isArray(rawPolicy)
    ) {
      throw createConfigurationError(
        `Provider account rate limit for "${providerId}" must be an object.`
      );
    }

    const maxRequests =
      normalizePositiveInteger(
        rawPolicy.maxRequests,
        null,
        {
          minimum: 1,
          maximum: 1_000_000,
        }
      );
    const windowMs =
      normalizePositiveInteger(
        rawPolicy.windowMs,
        null,
        {
          minimum: 100,
          maximum:
            24 * 60 * 60 * 1000,
        }
      );

    if (!maxRequests || !windowMs) {
      throw createConfigurationError(
        `Provider account rate limit for "${providerId}" requires positive maxRequests and windowMs.`
      );
    }

    result[providerId] =
      Object.freeze({
        maxRequests,
        windowMs,
      });
  }

  return Object.freeze(result);
}

function getAbortReason(signal) {
  if (
    signal?.reason instanceof Error
  ) {
    return signal.reason;
  }

  const error = new Error(
    "Provider operation was aborted."
  );
  error.name = "AbortError";
  error.code =
    "PROVIDER_OPERATION_ABORTED";
  error.status = 499;

  return error;
}

function createProviderOperationCapacityError({
  providerId,
  methodName,
} = {}) {
  const safeProviderId =
    normalizeProviderId(providerId);
  const safeMethodName =
    normalizeOperationName(methodName);
  const error = new Error(
    `Provider operation capacity is full for "${safeProviderId}".`
  );

  error.name =
    "ProviderOperationCapacityError";
  error.code =
    "PROVIDER_CAPACITY_EXCEEDED";
  error.status = 503;
  error.providerId = safeProviderId;
  error.methodName = safeMethodName;
  error.retryable = true;
  error.retryAfterMs =
    DEFAULT_RETRY_AFTER_MS;

  return error;
}

function createProviderAccountRateLimitError({
  providerId,
  methodName,
  retryAfterMs,
} = {}) {
  const error = new Error(
    "Provider account request capacity is temporarily exhausted."
  );

  error.name =
    "ProviderAccountRateLimitError";
  error.code =
    "PROVIDER_ACCOUNT_RATE_LIMITED";
  error.status = 429;
  error.providerId =
    normalizeProviderId(providerId);
  error.methodName =
    normalizeOperationName(methodName);
  error.retryable = true;
  error.retryAfterMs =
    Math.max(
      1,
      Number(retryAfterMs) ||
        DEFAULT_RETRY_AFTER_MS
    );

  return error;
}

function createLeaseLostError({
  providerId,
  methodName,
} = {}) {
  const error = new Error(
    "Shared provider capacity ownership was lost."
  );

  error.name =
    "ProviderCapacityLeaseLostError";
  error.code =
    "PROVIDER_CAPACITY_LEASE_LOST";
  error.status = 503;
  error.providerId =
    normalizeProviderId(providerId);
  error.methodName =
    normalizeOperationName(methodName);
  error.retryable = true;
  error.retryAfterMs =
    DEFAULT_RETRY_AFTER_MS;

  return error;
}

function waitForPoll(
  milliseconds,
  signal
) {
  if (signal.aborted) {
    return Promise.reject(
      getAbortReason(signal)
    );
  }

  return new Promise(
    (resolve, reject) => {
      const timer = setTimeout(
        () => {
          signal.removeEventListener(
            "abort",
            onAbort
          );
          resolve();
        },
        milliseconds
      );
      timer.unref?.();

      function onAbort() {
        clearTimeout(timer);
        signal.removeEventListener(
          "abort",
          onAbort
        );
        reject(
          getAbortReason(signal)
        );
      }

      signal.addEventListener(
        "abort",
        onAbort,
        { once: true }
      );
    }
  );
}

function createValkeyProviderCapacityCoordinator({
  executor,
  keyspace,
  globalActiveLimit =
    DEFAULT_GLOBAL_ACTIVE_LIMIT,
  perProviderActiveLimit =
    DEFAULT_PER_PROVIDER_ACTIVE_LIMIT,
  globalQueuedLimit =
    DEFAULT_GLOBAL_QUEUED_LIMIT,
  perProviderQueuedLimit =
    DEFAULT_PER_PROVIDER_QUEUED_LIMIT,
  leaseTtlMs =
    DEFAULT_LEASE_TTL_MS,
  acquirePollMs =
    DEFAULT_ACQUIRE_POLL_MS,
  providerAccountRateLimits = {},
  accountRateLimitsRequired = false,
  leaseRenewalEnabled = true,
} = {}) {
  if (
    !executor ||
    typeof executor.execute !== "function" ||
    !keyspace ||
    typeof keyspace.providerCapacity !==
      "function"
  ) {
    throw new TypeError(
      "A Valkey executor and keyspace are required for provider coordination."
    );
  }

  const MAX_PROVIDER_CONCURRENT_OPERATIONS =
    normalizePositiveInteger(
      globalActiveLimit,
      DEFAULT_GLOBAL_ACTIVE_LIMIT,
      { maximum: 10_000 }
    );
  const MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER =
    normalizePositiveInteger(
      perProviderActiveLimit,
      MAX_PROVIDER_CONCURRENT_OPERATIONS,
      {
        maximum:
          MAX_PROVIDER_CONCURRENT_OPERATIONS,
      }
    );
  const MAX_PROVIDER_QUEUED_OPERATIONS =
    normalizePositiveInteger(
      globalQueuedLimit,
      DEFAULT_GLOBAL_QUEUED_LIMIT,
      { maximum: 100_000 }
    );
  const MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER =
    normalizePositiveInteger(
      perProviderQueuedLimit,
      Math.min(
        DEFAULT_PER_PROVIDER_QUEUED_LIMIT,
        MAX_PROVIDER_QUEUED_OPERATIONS
      ),
      {
        maximum:
          MAX_PROVIDER_QUEUED_OPERATIONS,
      }
    );
  const safeDefaultLeaseTtlMs =
    normalizePositiveInteger(
      leaseTtlMs,
      DEFAULT_LEASE_TTL_MS,
      {
        minimum: 100,
        maximum: 10 * 60 * 1000,
      }
    );
  const safeAcquirePollMs =
    normalizePositiveInteger(
      acquirePollMs,
      DEFAULT_ACQUIRE_POLL_MS,
      {
        minimum: 5,
        maximum: 1_000,
      }
    );
  const safeAccountRateLimits =
    parseProviderAccountRateLimits(
      providerAccountRateLimits
    );

  if (
    accountRateLimitsRequired === true &&
    Object.keys(
      safeAccountRateLimits
    ).length === 0
  ) {
    throw createConfigurationError(
      "PROVIDER_ACCOUNT_RATE_LIMITS_JSON is required in staging and production distributed modes."
    );
  }

  function resolveAccountRateLimit(
    providerId
  ) {
    const policy =
      safeAccountRateLimits[
        providerId
      ] ??
      safeAccountRateLimits["*"] ??
      null;

    if (
      !policy &&
      accountRateLimitsRequired ===
        true
    ) {
      throw createConfigurationError(
        `No account rate limit is configured for provider "${providerId}".`
      );
    }

    return policy;
  }

  async function removeWaiter(
    providerId,
    waiterToken
  ) {
    await executor.execute(
      (client) =>
        client.eval(
          REMOVE_WAITER_SCRIPT,
          {
            keys: [
              keyspace
                .providerCapacityWaitersGlobal,
              keyspace
                .providerCapacityWaiters(
                  providerId
                ),
            ],
            arguments: [waiterToken],
          }
        )
    );
  }

  function createCapacityRelease({
    providerId,
    methodName,
    leaseToken,
    safeLeaseTtlMs,
  }) {
    const globalKey =
      keyspace.providerCapacityGlobal;
    const providerKey =
      keyspace.providerCapacity(
        providerId
      );
    let released = false;
    let releasePromise = null;
    let renewalInFlight = false;
    let renewalTimer = null;
    let lossResolved = false;
    let resolveLoss;
    const lost = new Promise(
      (resolve) => {
        resolveLoss = resolve;
      }
    );

    function settleLoss(error) {
      if (
        lossResolved ||
        released
      ) {
        return;
      }

      lossResolved = true;
      clearInterval(renewalTimer);
      resolveLoss(error);
    }

    async function renew() {
      if (
        released ||
        renewalInFlight ||
        lossResolved
      ) {
        return;
      }

      renewalInFlight = true;

      try {
        const result =
          await executor.execute(
            (client) =>
              client.eval(
                RENEW_SCRIPT,
                {
                  keys: [
                    globalKey,
                    providerKey,
                  ],
                  arguments: [
                    leaseToken,
                    String(Date.now()),
                    String(
                      safeLeaseTtlMs
                    ),
                  ],
                }
              )
          );

        if (Number(result) <= 0) {
          settleLoss(
            createLeaseLostError({
              providerId,
              methodName,
            })
          );
        }
      } catch (error) {
        settleLoss(
          error?.code
            ? error
            : createOperationalStateUnavailableError()
        );
      } finally {
        renewalInFlight = false;
      }
    }

    if (leaseRenewalEnabled !== false) {
      renewalTimer = setInterval(
        renew,
        Math.max(
          50,
          Math.floor(
            safeLeaseTtlMs / 3
          )
        )
      );
      renewalTimer.unref?.();
    }

    async function release() {
      if (releasePromise) {
        return releasePromise;
      }

      released = true;
      clearInterval(renewalTimer);

      releasePromise =
        executor.execute(
          (client) =>
            client.eval(
              RELEASE_SCRIPT,
              {
                keys: [
                  globalKey,
                  providerKey,
                ],
                arguments: [
                  leaseToken,
                ],
              }
            )
        ).then(
          (result) =>
            Number(result) === 1
        );

      return releasePromise;
    }

    Object.defineProperties(
      release,
      {
        leaseToken: {
          enumerable: true,
          value: leaseToken,
        },
        lost: {
          enumerable: true,
          value: lost,
        },
      }
    );

    return release;
  }

  async function acquireProviderOperationCapacity({
    providerId,
    methodName,
    signal,
    leaseTtlMs:
      requestedLeaseTtlMs,
  } = {}) {
    const safeProviderId =
      normalizeProviderId(providerId);
    const safeMethodName =
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
      throw getAbortReason(signal);
    }

    const safeLeaseTtlMs =
      normalizePositiveInteger(
        requestedLeaseTtlMs,
        safeDefaultLeaseTtlMs,
        {
          minimum: 100,
          maximum: 10 * 60 * 1000,
        }
      );
    const accountRateLimit =
      resolveAccountRateLimit(
        safeProviderId
      );
    const leaseToken =
      crypto.randomUUID();
    const waiterToken =
      crypto.randomUUID();
    let waiterRegistered = false;

    try {
      while (true) {
        if (signal.aborted) {
          throw getAbortReason(signal);
        }

        const now = Date.now();
        const result =
          await executor.execute(
            (client) =>
              client.eval(
                ACQUIRE_SCRIPT,
                {
                  keys: [
                    keyspace
                      .providerCapacityGlobal,
                    keyspace
                      .providerCapacity(
                        safeProviderId
                      ),
                    keyspace
                      .providerCapacityWaitersGlobal,
                    keyspace
                      .providerCapacityWaiters(
                        safeProviderId
                      ),
                    keyspace
                      .providerAccountRate(
                        safeProviderId
                      ),
                  ],
                  arguments: [
                    String(now),
                    String(
                      safeLeaseTtlMs
                    ),
                    String(
                      safeLeaseTtlMs
                    ),
                    String(
                      MAX_PROVIDER_CONCURRENT_OPERATIONS
                    ),
                    String(
                      MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER
                    ),
                    String(
                      MAX_PROVIDER_QUEUED_OPERATIONS
                    ),
                    String(
                      MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER
                    ),
                    leaseToken,
                    waiterToken,
                    String(
                      accountRateLimit
                        ?.maxRequests ?? 0
                    ),
                    String(
                      accountRateLimit
                        ?.windowMs ?? 0
                    ),
                  ],
                }
              )
          );
        const outcome =
          String(result?.[0] ?? "");

        if (outcome === "acquired") {
          waiterRegistered = false;

          return createCapacityRelease({
            providerId:
              safeProviderId,
            methodName:
              safeMethodName,
            leaseToken,
            safeLeaseTtlMs,
          });
        }

        if (
          outcome ===
          "rate-limited"
        ) {
          waiterRegistered = false;

          throw createProviderAccountRateLimitError({
            providerId:
              safeProviderId,
            methodName:
              safeMethodName,
            retryAfterMs:
              Number(result?.[1]),
          });
        }

        if (outcome === "queue-full") {
          throw createProviderOperationCapacityError({
            providerId:
              safeProviderId,
            methodName:
              safeMethodName,
          });
        }

        if (outcome !== "waiting") {
          throw createOperationalStateUnavailableError();
        }

        waiterRegistered = true;

        await waitForPoll(
          safeAcquirePollMs,
          signal
        );
      }
    } catch (error) {
      if (waiterRegistered) {
        try {
          await removeWaiter(
            safeProviderId,
            waiterToken
          );
        } catch {
          // The waiter has a bounded lease and will be removed by expiry.
        }
      }

      throw error;
    }
  }

  async function getProviderOperationCapacitySnapshot(
    options = {}
  ) {
    const providerId =
      typeof options?.providerId ===
        "string" &&
      options.providerId.trim()
        ? normalizeProviderId(
            options.providerId
          )
        : null;
    const keys = [
      keyspace.providerCapacityGlobal,
      keyspace
        .providerCapacityWaitersGlobal,
    ];

    if (providerId) {
      keys.push(
        keyspace.providerCapacity(
          providerId
        ),
        keyspace.providerCapacityWaiters(
          providerId
        )
      );
    }

    const result =
      await executor.execute(
        (client) =>
          client.eval(
            SNAPSHOT_SCRIPT,
            {
              keys,
              arguments: [
                String(Date.now()),
              ],
            }
          )
      );

    const active =
      Number(result?.[0]);
    const queued =
      Number(result?.[1]);
    const providerActive =
      providerId
        ? Number(result?.[2])
        : null;
    const providerQueued =
      providerId
        ? Number(result?.[3])
        : null;

    return {
      active,
      queued,
      activeByProvider:
        providerId
          ? {
              [providerId]:
                providerActive,
            }
          : {},
      queuedByProvider:
        providerId
          ? {
              [providerId]:
                providerQueued,
            }
          : {},
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

  return Object.freeze({
    MAX_PROVIDER_CONCURRENT_OPERATIONS,
    MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER,
    MAX_PROVIDER_QUEUED_OPERATIONS,
    MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER,
    acquireProviderOperationCapacity,
    createProviderOperationCapacityError,
    getProviderOperationCapacitySnapshot,
  });
}

module.exports = {
  DEFAULT_GLOBAL_ACTIVE_LIMIT,
  DEFAULT_PER_PROVIDER_ACTIVE_LIMIT,
  DEFAULT_GLOBAL_QUEUED_LIMIT,
  DEFAULT_PER_PROVIDER_QUEUED_LIMIT,
  DEFAULT_LEASE_TTL_MS,
  DEFAULT_ACQUIRE_POLL_MS,
  parseProviderAccountRateLimits,
  createProviderOperationCapacityError,
  createProviderAccountRateLimitError,
  createValkeyProviderCapacityCoordinator,
};
