"use strict";

const DEFAULT_ALLOWED_ORIGIN =
  "http://localhost:5173";

const DEFAULT_JSON_LIMIT =
  "256kb";

const DEFAULT_RATE_LIMIT_WINDOW_MS =
  15 * 60 * 1000;

const DEFAULT_RATE_LIMIT_MAX_REQUESTS =
  1000;

const DEFAULT_SHUTDOWN_TIMEOUT_MS =
  10_000;


const DEFAULT_ENDPOINT_RATE_LIMITS =
  Object.freeze({
    destinationSearch:
      Object.freeze({
        windowMs:
          5 * 60 * 1000,
        maxRequests:
          180,
      }),

    hotelSearch:
      Object.freeze({
        windowMs:
          15 * 60 * 1000,
        maxRequests:
          60,
      }),

    continuation:
      Object.freeze({
        windowMs:
          15 * 60 * 1000,
        maxRequests:
          240,
      }),

    hotelDetails:
      Object.freeze({
        windowMs:
          15 * 60 * 1000,
        maxRequests:
          180,
      }),

    bookingRecheck:
      Object.freeze({
        windowMs:
          10 * 60 * 1000,
        maxRequests:
          30,
      }),

    bookingHandoff:
      Object.freeze({
        windowMs:
          10 * 60 * 1000,
        maxRequests:
          30,
      }),

    bookingOpen:
      Object.freeze({
        windowMs:
          10 * 60 * 1000,
        maxRequests:
          60,
      }),

    searchRead:
      Object.freeze({
        windowMs:
          15 * 60 * 1000,
        maxRequests:
          600,
      }),
  });

const ENDPOINT_RATE_LIMIT_ENVIRONMENT_KEYS =
  Object.freeze({
    destinationSearch:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_DESTINATION_SEARCH_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_DESTINATION_SEARCH_MAX_REQUESTS",
      }),

    hotelSearch:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_HOTEL_SEARCH_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_HOTEL_SEARCH_MAX_REQUESTS",
      }),

    continuation:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_CONTINUATION_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_CONTINUATION_MAX_REQUESTS",
      }),

    hotelDetails:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_HOTEL_DETAILS_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_HOTEL_DETAILS_MAX_REQUESTS",
      }),

    bookingRecheck:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_BOOKING_RECHECK_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_BOOKING_RECHECK_MAX_REQUESTS",
      }),

    bookingHandoff:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_BOOKING_HANDOFF_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_BOOKING_HANDOFF_MAX_REQUESTS",
      }),

    bookingOpen:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_BOOKING_OPEN_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_BOOKING_OPEN_MAX_REQUESTS",
      }),

    searchRead:
      Object.freeze({
        windowMs:
          "RATE_LIMIT_SEARCH_READ_WINDOW_MS",
        maxRequests:
          "RATE_LIMIT_SEARCH_READ_MAX_REQUESTS",
      }),
  });

function parsePositiveInteger(
  value,
  fallback
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function parseAllowedOrigins(
  value
) {
  const entries =
    String(
      value ??
      DEFAULT_ALLOWED_ORIGIN
    )
      .split(",")
      .map(
        (entry) =>
          entry.trim()
      )
      .filter(Boolean);

  return [
    ...new Set(
      entries.length > 0
        ? entries
        : [
            DEFAULT_ALLOWED_ORIGIN,
          ]
    ),
  ];
}

function parseTrustProxy(
  value
) {
  const normalized =
    String(
      value ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    !normalized ||
    normalized ===
      "false" ||
    normalized ===
      "0"
  ) {
    return false;
  }

  if (
    normalized ===
      "true"
  ) {
    return 1;
  }

  const hops =
    Number(
      normalized
    );

  if (
    Number.isInteger(hops) &&
    hops >= 0 &&
    hops <= 10
  ) {
    return hops;
  }

  throw new Error(
    "TRUST_PROXY must be false, true, or an integer from 0 to 10."
  );
}

function createEndpointRateLimits({
  environment,
  overrides,
} = {}) {
  const configuredOverrides =
    overrides
      ?.endpointRateLimits ??
    {};

  const result =
    {};

  for (
    const [
      policyName,
      defaults,
    ] of Object.entries(
      DEFAULT_ENDPOINT_RATE_LIMITS
    )
  ) {
    const environmentKeys =
      ENDPOINT_RATE_LIMIT_ENVIRONMENT_KEYS[
        policyName
      ];

    const policyOverrides =
      configuredOverrides[
        policyName
      ] ??
      {};

    result[policyName] =
      Object.freeze({
        windowMs:
          parsePositiveInteger(
            policyOverrides.windowMs ??
            environment?.[
              environmentKeys.windowMs
            ],
            defaults.windowMs
          ),

        maxRequests:
          parsePositiveInteger(
            policyOverrides.maxRequests ??
            environment?.[
              environmentKeys.maxRequests
            ],
            defaults.maxRequests
          ),
      });
  }

  return Object.freeze(
    result
  );
}

function createRuntimeSecurityConfig({
  environment =
    process.env,
  overrides =
    {},
} = {}) {
  const allowedOrigins =
    Array.isArray(
      overrides.allowedOrigins
    )
      ? parseAllowedOrigins(
          overrides.allowedOrigins.join(
            ","
          )
        )
      : parseAllowedOrigins(
          environment.CLIENT_ORIGINS ??
          environment.CLIENT_ORIGIN
        );

  return Object.freeze({
    nodeEnv:
      String(
        overrides.nodeEnv ??
        environment.NODE_ENV ??
        "development"
      )
        .trim()
        .toLowerCase(),

    port:
      parsePositiveInteger(
        overrides.port ??
        environment.PORT,
        3001
      ),

    allowedOrigins,

    jsonLimit:
      String(
        overrides.jsonLimit ??
        environment.JSON_BODY_LIMIT ??
        DEFAULT_JSON_LIMIT
      ).trim(),

    trustProxy:
      overrides.trustProxy ??
      parseTrustProxy(
        environment.TRUST_PROXY
      ),

    rateLimitWindowMs:
      parsePositiveInteger(
        overrides
          .rateLimitWindowMs ??
        environment
          .RATE_LIMIT_WINDOW_MS,
        DEFAULT_RATE_LIMIT_WINDOW_MS
      ),

    rateLimitMaxRequests:
      parsePositiveInteger(
        overrides
          .rateLimitMaxRequests ??
        environment
          .RATE_LIMIT_MAX_REQUESTS,
        DEFAULT_RATE_LIMIT_MAX_REQUESTS
      ),

    endpointRateLimits:
      createEndpointRateLimits({
        environment,
        overrides,
      }),

    serviceName:
      String(
        overrides.serviceName ??
        environment.SERVICE_NAME ??
        "smartstay-backend"
      ).trim(),

    serviceVersion:
      String(
        overrides.serviceVersion ??
        environment.RELEASE_SHA ??
        environment.npm_package_version ??
        "development"
      ).trim(),

    includeErrorStack:
      overrides.includeErrorStack ??
      (
        environment
          .LOG_ERROR_STACKS ===
          "true" &&
        String(
          environment.NODE_ENV ??
          ""
        )
          .trim()
          .toLowerCase() !==
          "production"
      ),

    shutdownTimeoutMs:
      parsePositiveInteger(
        overrides
          .shutdownTimeoutMs ??
        environment
          .SHUTDOWN_TIMEOUT_MS,
        DEFAULT_SHUTDOWN_TIMEOUT_MS
      ),
  });
}

module.exports = {
  DEFAULT_ALLOWED_ORIGIN,
  DEFAULT_ENDPOINT_RATE_LIMITS,
  DEFAULT_JSON_LIMIT,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  createEndpointRateLimits,
  createRuntimeSecurityConfig,
  parseAllowedOrigins,
  parseTrustProxy,
};
