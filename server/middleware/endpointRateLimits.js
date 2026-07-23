"use strict";

const rateLimit =
  require(
    "express-rate-limit"
  );

function normalizeRetryAfterMs(
  req,
  fallbackWindowMs
) {
  const resetTime =
    req?.rateLimit
      ?.resetTime;

  if (
    resetTime instanceof
      Date
  ) {
    return Math.max(
      0,
      resetTime.getTime() -
      Date.now()
    );
  }

  const normalizedFallback =
    Number(
      fallbackWindowMs
    );

  return Number.isFinite(
    normalizedFallback
  ) &&
    normalizedFallback >
      0
    ? normalizedFallback
    : null;
}

function createRateLimitHandler({
  scope =
    "api",
  windowMs =
    null,
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

    if (
      retryAfterMs !==
        null
    ) {
      res.set(
        "Retry-After",
        String(
          Math.max(
            1,
            Math.ceil(
              retryAfterMs /
              1000
            )
          )
        )
      );
    }

    req.log?.warn(
      "http.request.rate-limited",
      {
        method:
          req.method,
        path:
          req.path,
        scope,
        retryAfterMs,
      }
    );

    return res
      .status(429)
      .json({
        success:
          false,
        code:
          "RATE_LIMITED",
        message:
          "Too many requests. Please try again later.",
        retryAfterMs,
        requestId:
          req.requestId ??
          null,
      });
  };
}

function createLimiter({
  policy,
  scope,
  skip =
    null,
}) {
  if (
    !policy ||
    !Number.isInteger(
      policy.windowMs
    ) ||
    policy.windowMs <=
      0 ||
    !Number.isInteger(
      policy.maxRequests
    ) ||
    policy.maxRequests <=
      0
  ) {
    throw new TypeError(
      `Invalid rate limit policy for ${scope}.`
    );
  }

  return rateLimit({
    windowMs:
      policy.windowMs,
    max:
      policy.maxRequests,
    standardHeaders:
      true,
    legacyHeaders:
      false,
    skip:
      typeof skip ===
        "function"
        ? skip
        : undefined,
    handler:
      createRateLimitHandler({
        scope,
        windowMs:
          policy.windowMs,
      }),
  });
}

function createEndpointRateLimiters({
  config,
} = {}) {
  const endpointPolicies =
    config
      ?.endpointRateLimits;

  if (!endpointPolicies) {
    throw new TypeError(
      "Endpoint rate limit configuration is required."
    );
  }

  return Object.freeze({
    api:
      createLimiter({
        policy: {
          windowMs:
            config.rateLimitWindowMs,
          maxRequests:
            config.rateLimitMaxRequests,
        },
        scope:
          "api",
        skip:
          (req) =>
            req.method ===
              "OPTIONS" ||
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

    hotelSearch:
      createLimiter({
        policy:
          endpointPolicies
            .hotelSearch,
        scope:
          "hotel-search",
      }),

    continuation:
      createLimiter({
        policy:
          endpointPolicies
            .continuation,
        scope:
          "search-continuation",
      }),

    hotelDetails:
      createLimiter({
        policy:
          endpointPolicies
            .hotelDetails,
        scope:
          "hotel-details",
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

    bookingOpen:
      createLimiter({
        policy:
          endpointPolicies
            .bookingOpen,
        scope:
          "booking-open",
      }),

    searchRead:
      createLimiter({
        policy:
          endpointPolicies
            .searchRead,
        scope:
          "search-read",
      }),

    analytics:
      createLimiter({
        policy:
          endpointPolicies
            .analytics,
        scope:
          "analytics-events",
      }),
  });
}

module.exports = {
  createEndpointRateLimiters,
  createLimiter,
  createRateLimitHandler,
  normalizeRetryAfterMs,
};
