const DEFAULT_PROVIDER_RETRY_AFTER_MS =
  2_500;

const DEFAULT_MAX_PROVIDER_RETRY_AFTER_MS =
  30 * 60 * 1000;

function normalizeNonNegativeNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return (
    Number.isFinite(number) &&
    number >= 0
  )
    ? number
    : null;
}

function normalizeRetryAfterMs(
  value,
  {
    maximumMs =
      DEFAULT_MAX_PROVIDER_RETRY_AFTER_MS,
  } = {}
) {
  const directValue =
    normalizeNonNegativeNumber(
      value
    );

  return directValue === null
    ? null
    : Math.min(
        directValue,
        maximumMs
      );
}

function parseRetryAfterHeaderMs(
  value,
  {
    nowMs = Date.now(),
    maximumMs =
      DEFAULT_MAX_PROVIDER_RETRY_AFTER_MS,
  } = {}
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const trimmedValue =
    String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const seconds =
    Number(trimmedValue);

  if (
    Number.isFinite(seconds) &&
    seconds >= 0
  ) {
    return Math.min(
      seconds * 1000,
      maximumMs
    );
  }

  const retryDate =
    Date.parse(trimmedValue);

  if (!Number.isFinite(retryDate)) {
    return null;
  }

  return Math.min(
    Math.max(
      0,
      retryDate - nowMs
    ),
    maximumMs
  );
}

function readHeader(
  headers,
  name
) {
  if (!headers) {
    return null;
  }

  if (
    typeof headers.get ===
      "function"
  ) {
    return headers.get(name);
  }

  const normalizedName =
    name.toLowerCase();

  for (
    const [key, value] of
      Object.entries(headers)
  ) {
    if (
      key.toLowerCase() ===
      normalizedName
    ) {
      return value;
    }
  }

  return null;
}

function extractRetryAfterMs(
  source,
  options = {}
) {
  const candidates = [
    source?.retryAfterMs,
    source?.retry_after_ms,
    source?.response?.data
      ?.retryAfterMs,
    source?.response?.data
      ?.retry_after_ms,
    source?.data?.retryAfterMs,
    source?.data?.retry_after_ms,
  ];

  for (const candidate of candidates) {
    const normalized =
      normalizeRetryAfterMs(
        candidate,
        options
      );

    if (normalized !== null) {
      return normalized;
    }
  }

  const headerValue =
    readHeader(
      source?.response?.headers ??
      source?.headers,
      "retry-after"
    );

  return parseRetryAfterHeaderMs(
    headerValue,
    options
  );
}

function isRateLimitedProviderFailure({
  status,
  code,
  outcome,
} = {}) {
  const normalizedCode =
    typeof code === "string"
      ? code.trim().toUpperCase()
      : String(code ?? "")
          .trim()
          .toUpperCase();

  const normalizedOutcome =
    typeof outcome === "string"
      ? outcome.trim().toLowerCase()
      : "";

  return (
    Number(status) === 429 ||
    normalizedCode === "429" ||
    normalizedCode ===
      "RATE_LIMITED" ||
    normalizedCode ===
      "PROVIDER_RATE_LIMITED" ||
    normalizedCode ===
      "TOO_MANY_REQUESTS" ||
    normalizedCode ===
      "HTTP_429" ||
    normalizedOutcome ===
      "rate_limited" ||
    normalizedOutcome ===
      "rate-limited"
  );
}

function resolveProviderRetryPolicy({
  status,
  code,
  outcome,
  explicitRetryable,
  retryAfterMs,
  nowMs = Date.now(),
} = {}) {
  const rateLimited =
    isRateLimitedProviderFailure({
      status,
      code,
      outcome,
    });

  const normalizedOutcome =
    typeof outcome === "string"
      ? outcome.trim().toLowerCase()
      : "";

  const transientOutcome =
    new Set([
      "timeout",
      "unavailable",
      "circuit_open",
      "circuit-open",
      "rate_limited",
      "rate-limited",
    ]).has(normalizedOutcome);

  const retryable =
    typeof explicitRetryable ===
      "boolean"
      ? explicitRetryable
      : rateLimited ||
        transientOutcome;

  if (!retryable) {
    return {
      retryable: false,
      retryAfterMs: null,
      nextAttemptAt: null,
      rateLimited,
    };
  }

  const normalizedDelay =
    normalizeRetryAfterMs(
      retryAfterMs,
      {
        nowMs,
      }
    ) ??
    DEFAULT_PROVIDER_RETRY_AFTER_MS;

  return {
    retryable: true,
    retryAfterMs:
      normalizedDelay,
    nextAttemptAt:
      nowMs + normalizedDelay,
    rateLimited,
  };
}

module.exports = {
  DEFAULT_PROVIDER_RETRY_AFTER_MS,
  DEFAULT_MAX_PROVIDER_RETRY_AFTER_MS,
  normalizeRetryAfterMs,
  parseRetryAfterHeaderMs,
  extractRetryAfterMs,
  isRateLimitedProviderFailure,
  resolveProviderRetryPolicy,
};
