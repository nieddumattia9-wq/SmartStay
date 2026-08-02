"use strict";

const {
  rateLimit,
  ipKeyGenerator,
} = require(
  "express-rate-limit"
);

const {
  createOperationalStateUnavailableError,
  normalizePositiveInteger,
} = require("./valkeyShared");

const DEFAULT_STORE_FAILURE_RETRY_AFTER_MS =
  500;

function normalizeRetryAfterMs(
  req,
  fallbackWindowMs
) {
  const resetTime =
    req?.rateLimit?.resetTime;

  if (resetTime instanceof Date) {
    return Math.max(
      0,
      resetTime.getTime() -
        Date.now()
    );
  }

  const fallback =
    Number(fallbackWindowMs);

  return Number.isFinite(fallback) &&
    fallback > 0
    ? fallback
    : null;
}

function createRateLimitHandler({
  scope = "api",
  windowMs = null,
} = {}) {
  return function handleRateLimit(
    req,
    res
  ) {
    const retryAfterMs =
      normalizeRetryAfterMs(
        req,
        windowMs
      );

    if (retryAfterMs !== null) {
      res.set(
        "Retry-After",
        String(
          Math.max(
            1,
            Math.ceil(
              retryAfterMs / 1000
            )
          )
        )
      );
    }

    req.log?.warn(
      "http.request.rate-limited",
      {
        method: req.method,
        path: req.path,
        scope,
        retryAfterMs,
      }
    );

    return res
      .status(429)
      .json({
        success: false,
        code: "RATE_LIMITED",
        message:
          "Too many requests. Please try again later.",
        retryAfterMs,
        requestId:
          req.requestId ?? null,
      });
  };
}

const INCREMENT_SCRIPT = String.raw`
local current = redis.call('GET', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])

if not current or ttl <= 0 then
  redis.call('SET', KEYS[1], 1, 'PX', tonumber(ARGV[1]))
  return {'1', ARGV[1]}
end

local total = redis.call('INCR', KEYS[1])
return {tostring(total), tostring(ttl)}
`;

const DECREMENT_SCRIPT = String.raw`
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current <= 1 then
  redis.call('DEL', KEYS[1])
  return 0
end
return redis.call('DECR', KEYS[1])
`;

function normalizeScope(value) {
  const scope =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  if (
    !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(
      scope
    )
  ) {
    throw new TypeError(
      "A valid endpoint rate-limit scope is required."
    );
  }

  return scope;
}

function createClientIdentity(req) {
  const address =
    typeof req?.ip === "string" &&
    req.ip.trim()
      ? req.ip.trim()
      : "unknown";

  return ipKeyGenerator(
    address,
    56
  );
}

function createValkeyRateLimitStore({
  executor,
  keyspace,
  scope,
  windowMs,
} = {}) {
  if (
    !executor ||
    typeof executor.execute !== "function" ||
    !keyspace ||
    typeof keyspace.endpointRateLimit !==
      "function"
  ) {
    throw new TypeError(
      "A Valkey executor and keyspace are required for endpoint rate limiting."
    );
  }

  const safeScope =
    normalizeScope(scope);

  let safeWindowMs =
    normalizePositiveInteger(
      windowMs,
      null,
      {
        minimum: 100,
        maximum:
          24 * 60 * 60 * 1000,
      }
    );

  if (!safeWindowMs) {
    throw new TypeError(
      `Invalid rate limit window for ${safeScope}.`
    );
  }

  return Object.freeze({
    localKeys: false,
    prefix: "",

    init(options = {}) {
      safeWindowMs =
        normalizePositiveInteger(
          options.windowMs,
          safeWindowMs,
          {
            minimum: 100,
            maximum:
              24 * 60 * 60 * 1000,
          }
        );
    },

    async increment(key) {
      const result =
        await executor.execute(
          (client) =>
            client.eval(
              INCREMENT_SCRIPT,
              {
                keys: [key],
                arguments: [
                  String(
                    safeWindowMs
                  ),
                ],
              }
            )
        );

      const totalHits =
        Number(result?.[0]);
      const ttlMs =
        Number(result?.[1]);

      if (
        !Number.isSafeInteger(
          totalHits
        ) ||
        totalHits < 1 ||
        !Number.isFinite(ttlMs) ||
        ttlMs < 0
      ) {
        throw createOperationalStateUnavailableError();
      }

      return {
        totalHits,
        resetTime:
          new Date(
            Date.now() + ttlMs
          ),
      };
    },

    async decrement(key) {
      await executor.execute(
        (client) =>
          client.eval(
            DECREMENT_SCRIPT,
            {
              keys: [key],
              arguments: [],
            }
          )
      );
    },

    async resetKey(key) {
      await executor.execute(
        (client) =>
          client.del(key)
      );
    },
  });
}

function createSharedStoreFailureHandler({
  scope,
  retryAfterMs =
    DEFAULT_STORE_FAILURE_RETRY_AFTER_MS,
} = {}) {
  const safeScope =
    normalizeScope(scope);
  const safeRetryAfterMs =
    normalizePositiveInteger(
      retryAfterMs,
      DEFAULT_STORE_FAILURE_RETRY_AFTER_MS,
      {
        minimum: 100,
        maximum: 30_000,
      }
    );

  return function handleSharedStoreFailure(
    error,
    req,
    res
  ) {
    req.log?.warn(
      "http.request.rate-limit-store-unavailable",
      {
        method: req.method,
        path: req.path,
        scope: safeScope,
        retryAfterMs:
          safeRetryAfterMs,
        errorCode:
          error?.code ?? null,
      }
    );

    res.set(
      "Retry-After",
      String(
        Math.max(
          1,
          Math.ceil(
            safeRetryAfterMs /
              1000
          )
        )
      )
    );

    return res
      .status(503)
      .json({
        success: false,
        code:
          "RATE_LIMIT_STORE_UNAVAILABLE",
        message:
          "Request protection is temporarily unavailable. Please try again shortly.",
        retryAfterMs:
          safeRetryAfterMs,
        requestId:
          req.requestId ?? null,
      });
  };
}

function createValkeyEndpointRateLimitStoreFactory({
  executor,
  keyspace,
} = {}) {
  function createLimiter({
    policy,
    scope,
    skip = null,
  }) {
    const safeScope =
      normalizeScope(scope);

    if (
      !policy ||
      !Number.isInteger(
        policy.windowMs
      ) ||
      policy.windowMs <= 0 ||
      !Number.isInteger(
        policy.maxRequests
      ) ||
      policy.maxRequests <= 0
    ) {
      throw new TypeError(
        `Invalid rate limit policy for ${safeScope}.`
      );
    }

    const store =
      createValkeyRateLimitStore({
        executor,
        keyspace,
        scope: safeScope,
        windowMs:
          policy.windowMs,
      });
    const failureHandler =
      createSharedStoreFailureHandler({
        scope: safeScope,
      });
    const middleware = rateLimit({
      windowMs:
        policy.windowMs,
      limit:
        policy.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      passOnStoreError: false,
      skip:
        typeof skip === "function"
          ? skip
          : undefined,
      keyGenerator(req) {
        return keyspace
          .endpointRateLimit(
            safeScope,
            createClientIdentity(req)
          );
      },
      store,
      handler:
        createRateLimitHandler({
          scope: safeScope,
          windowMs:
            policy.windowMs,
        }),
    });

    return function sharedRateLimiter(
      req,
      res,
      next
    ) {
      return middleware(
        req,
        res,
        (error) => {
          if (!error) {
            next();
            return;
          }

          failureHandler(
            error,
            req,
            res
          );
        }
      );
    };
  }

  function createEndpointRateLimiters({
    config,
  } = {}) {
    const endpointPolicies =
      config?.endpointRateLimits;

    if (!endpointPolicies) {
      throw new TypeError(
        "Endpoint rate limit configuration is required."
      );
    }

    return Object.freeze({
      api: createLimiter({
        policy: {
          windowMs:
            config.rateLimitWindowMs,
          maxRequests:
            config.rateLimitMaxRequests,
        },
        scope: "api",
        skip: (req) =>
          req.method === "OPTIONS" ||
          req.path.startsWith(
            "/health"
          ),
      }),
      destinationSearch:
        createLimiter({
          policy:
            endpointPolicies
              .destinationSearch,
          scope:
            "destination-search",
        }),
      hotelSearch: createLimiter({
        policy:
          endpointPolicies
            .hotelSearch,
        scope: "hotel-search",
      }),
      continuation: createLimiter({
        policy:
          endpointPolicies
            .continuation,
        scope:
          "search-continuation",
      }),
      hotelDetails: createLimiter({
        policy:
          endpointPolicies
            .hotelDetails,
        scope: "hotel-details",
      }),
      bookingRecheck:
        createLimiter({
          policy:
            endpointPolicies
              .bookingRecheck,
          scope:
            "booking-recheck",
        }),
      bookingHandoff:
        createLimiter({
          policy:
            endpointPolicies
              .bookingHandoff,
          scope:
            "booking-handoff",
        }),
      bookingOpen: createLimiter({
        policy:
          endpointPolicies
            .bookingOpen,
        scope: "booking-open",
      }),
      searchRead: createLimiter({
        policy:
          endpointPolicies
            .searchRead,
        scope: "search-read",
      }),
      analytics: createLimiter({
        policy:
          endpointPolicies
            .analytics,
        scope:
          "analytics-events",
      }),
      analyticsAdmin:
        createLimiter({
          policy:
            endpointPolicies
              .analyticsAdmin,
          scope:
            "analytics-admin",
        }),
    });
  }

  return Object.freeze({
    createEndpointRateLimiters,
    createLimiter,
    createRateLimitHandler,
    normalizeRetryAfterMs,
  });
}

module.exports = {
  DEFAULT_STORE_FAILURE_RETRY_AFTER_MS,
  createClientIdentity,
  createValkeyRateLimitStore,
  createSharedStoreFailureHandler,
  createValkeyEndpointRateLimitStoreFactory,
};
