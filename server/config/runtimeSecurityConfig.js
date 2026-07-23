"use strict";

const DEFAULT_ALLOWED_ORIGIN =
  "http://localhost:5173";

const DEFAULT_JSON_LIMIT =
  "1mb";

const DEFAULT_RATE_LIMIT_WINDOW_MS =
  15 * 60 * 1000;

const DEFAULT_RATE_LIMIT_MAX_REQUESTS =
  100;

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
  });
}

module.exports = {
  DEFAULT_ALLOWED_ORIGIN,
  DEFAULT_JSON_LIMIT,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  createRuntimeSecurityConfig,
  parseAllowedOrigins,
  parseTrustProxy,
};
