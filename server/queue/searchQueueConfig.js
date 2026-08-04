"use strict";

const SEARCH_QUEUE_FEATURE_FLAG =
  "SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED";

const SEARCH_QUEUE_NAME =
  "smartstay-searches";

const SEARCH_QUEUE_SCHEMA_VERSION =
  "1";

const SEARCH_QUEUE_JOB_NAMES =
  Object.freeze({
    INITIAL_SEARCH:
      "initial-search",
  });

const SEARCH_QUEUE_PRIORITIES =
  Object.freeze({
    BOOKING_RECHECK:
      1,
    INITIAL_SEARCH:
      5,
    CONTINUATION:
      10,
  });

const DEFAULT_MAX_ADMITTED_JOBS =
  1_000;
const DEFAULT_ADMISSION_LEASE_MS =
  30 * 60 * 1_000;
const DEFAULT_CONNECT_TIMEOUT_MS =
  1_000;
const DEFAULT_COMMAND_TIMEOUT_MS =
  1_500;
const DEFAULT_RETRY_AFTER_MS =
  1_000;
const DEFAULT_JOB_ATTEMPTS =
  3;
const DEFAULT_JOB_BACKOFF_MS =
  1_000;
const DEFAULT_JOB_BACKOFF_JITTER =
  0.25;
const DEFAULT_JOB_RETENTION_SECONDS =
  30 * 60;
const DEFAULT_FAILED_JOB_RETENTION_SECONDS =
  30 * 60;
const DEFAULT_JOB_PAYLOAD_MAX_BYTES =
  64 * 1_024;
const DEFAULT_WORKER_CONCURRENCY =
  2;
const DEFAULT_WORKER_START_TIMEOUT_MS =
  30_000;
const DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS =
  5_000;
const DEFAULT_WORKER_HEARTBEAT_TTL_MS =
  20_000;
const DEFAULT_WORKER_DRAIN_TIMEOUT_MS =
  30_000;

const ENVIRONMENT_PATTERN =
  /^[a-z0-9][a-z0-9_-]{0,31}$/;

function createSearchQueueConfigurationError(
  message
) {
  const error =
    new Error(message);

  error.name =
    "SearchQueueConfigurationError";
  error.code =
    "SEARCH_QUEUE_CONFIGURATION_INVALID";
  error.status =
    500;
  error.retryable =
    false;

  return error;
}

function normalizeBooleanFlag(
  value,
  fallback = false
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    ["1", "true", "yes", "on"]
      .includes(normalized)
  ) {
    return true;
  }

  if (
    ["0", "false", "no", "off"]
      .includes(normalized)
  ) {
    return false;
  }

  throw createSearchQueueConfigurationError(
    `${SEARCH_QUEUE_FEATURE_FLAG} must be true or false.`
  );
}

function normalizePositiveInteger(
  value,
  fallback,
  {
    minimum = 1,
    maximum =
      Number.MAX_SAFE_INTEGER,
  } = {}
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw createSearchQueueConfigurationError(
      "A search queue numeric setting is outside its supported range."
    );
  }

  return number;
}

function validateQueueUrl(value) {
  const candidate =
    typeof value === "string"
      ? value.trim()
      : "";

  let parsed;

  try {
    parsed =
      new URL(candidate);
  }
  catch {
    parsed = null;
  }

  if (
    !parsed ||
    !["redis:", "rediss:"]
      .includes(parsed.protocol) ||
    !parsed.hostname
  ) {
    throw createSearchQueueConfigurationError(
      "SMARTSTAY_QUEUE_REDIS_URL must be a valid redis:// or rediss:// URL."
    );
  }

  return candidate;
}

function validateQueueEnvironment(value) {
  const environment =
    typeof value === "string"
      ? value
          .trim()
          .toLowerCase()
      : "";

  if (
    !ENVIRONMENT_PATTERN.test(
      environment
    )
  ) {
    throw createSearchQueueConfigurationError(
      "SMARTSTAY_QUEUE_ENVIRONMENT must contain only lowercase letters, numbers, underscores or hyphens."
    );
  }

  return environment;
}

function validateQueueSecret(value) {
  const secret =
    typeof value === "string"
      ? value
      : "";

  if (
    Buffer.byteLength(
      secret,
      "utf8"
    ) < 32
  ) {
    throw createSearchQueueConfigurationError(
      "SMARTSTAY_QUEUE_KEY_SECRET or SMARTSTAY_STATE_KEY_SECRET must contain at least 32 UTF-8 bytes."
    );
  }

  return secret;
}

function getSearchQueueConfig(
  environmentVariables =
    process.env
) {
  const enabled =
    normalizeBooleanFlag(
      environmentVariables[
        SEARCH_QUEUE_FEATURE_FLAG
      ],
      false
    );

  if (!enabled) {
    return Object.freeze({
      enabled:
        false,
      featureFlag:
        SEARCH_QUEUE_FEATURE_FLAG,
      queueName:
        SEARCH_QUEUE_NAME,
      schemaVersion:
        SEARCH_QUEUE_SCHEMA_VERSION,
      jobNames:
        SEARCH_QUEUE_JOB_NAMES,
      priorities:
        SEARCH_QUEUE_PRIORITIES,
    });
  }

  const queueEnvironment =
    validateQueueEnvironment(
      environmentVariables
        .SMARTSTAY_QUEUE_ENVIRONMENT ??
      environmentVariables
        .SMARTSTAY_STATE_ENVIRONMENT
    );
  const workerHeartbeatIntervalMs =
    normalizePositiveInteger(
      environmentVariables
        .SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS,
      DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS,
      {
        minimum:
          250,
        maximum:
          60_000,
      }
    );
  const workerHeartbeatTtlMs =
    normalizePositiveInteger(
      environmentVariables
        .SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS,
      DEFAULT_WORKER_HEARTBEAT_TTL_MS,
      {
        minimum:
          1_000,
        maximum:
          5 * 60 * 1_000,
      }
    );

  if (
    workerHeartbeatTtlMs <
      workerHeartbeatIntervalMs * 2
  ) {
    throw createSearchQueueConfigurationError(
      "SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS must be at least twice the heartbeat interval."
    );
  }

  return Object.freeze({
    enabled:
      true,
    featureFlag:
      SEARCH_QUEUE_FEATURE_FLAG,
    url:
      validateQueueUrl(
        environmentVariables
          .SMARTSTAY_QUEUE_REDIS_URL
      ),
    environment:
      queueEnvironment,
    hmacSecret:
      validateQueueSecret(
        environmentVariables
          .SMARTSTAY_QUEUE_KEY_SECRET ??
        environmentVariables
          .SMARTSTAY_STATE_KEY_SECRET
      ),
    queueName:
      SEARCH_QUEUE_NAME,
    schemaVersion:
      SEARCH_QUEUE_SCHEMA_VERSION,
    prefix:
      `ss:v1:${queueEnvironment}:bullmq`,
    admissionPrefix:
      `ss:v1:${queueEnvironment}:search-queue-admission`,
    runtimePrefix:
      `ss:v1:${queueEnvironment}:search-queue-runtime`,
    jobNames:
      SEARCH_QUEUE_JOB_NAMES,
    priorities:
      SEARCH_QUEUE_PRIORITIES,
    maxAdmittedJobs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED,
        DEFAULT_MAX_ADMITTED_JOBS,
        {
          maximum:
            DEFAULT_MAX_ADMITTED_JOBS,
        }
      ),
    admissionLeaseMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS,
        DEFAULT_ADMISSION_LEASE_MS,
        {
          minimum:
            1_000,
          maximum:
            2 * 60 * 60 * 1_000,
        }
      ),
    connectTimeoutMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS,
        DEFAULT_CONNECT_TIMEOUT_MS,
        {
          minimum:
            100,
          maximum:
            30_000,
        }
      ),
    commandTimeoutMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS,
        DEFAULT_COMMAND_TIMEOUT_MS,
        {
          minimum:
            100,
          maximum:
            30_000,
        }
      ),
    retryAfterMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS,
        DEFAULT_RETRY_AFTER_MS,
        {
          minimum:
            100,
          maximum:
            60_000,
        }
      ),
    jobAttempts:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS,
        DEFAULT_JOB_ATTEMPTS,
        {
          maximum:
            10,
        }
      ),
    jobBackoffMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS,
        DEFAULT_JOB_BACKOFF_MS,
        {
          minimum:
            100,
          maximum:
            60_000,
        }
      ),
    jobBackoffJitter:
      DEFAULT_JOB_BACKOFF_JITTER,
    completedRetentionSeconds:
      DEFAULT_JOB_RETENTION_SECONDS,
    failedRetentionSeconds:
      DEFAULT_FAILED_JOB_RETENTION_SECONDS,
    jobPayloadMaxBytes:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_QUEUE_JOB_MAX_BYTES,
        DEFAULT_JOB_PAYLOAD_MAX_BYTES,
        {
          minimum:
            4_096,
          maximum:
            256 * 1_024,
        }
      ),
    workerConcurrency:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_WORKER_CONCURRENCY,
        DEFAULT_WORKER_CONCURRENCY,
        {
          maximum:
            32,
        }
      ),
    workerStartTimeoutMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_WORKER_START_TIMEOUT_MS,
        DEFAULT_WORKER_START_TIMEOUT_MS,
        {
          minimum:
            1_000,
          maximum:
            2 * 60 * 1_000,
        }
      ),
    workerHeartbeatIntervalMs,
    workerHeartbeatTtlMs,
    workerDrainTimeoutMs:
      normalizePositiveInteger(
        environmentVariables
          .SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS,
        DEFAULT_WORKER_DRAIN_TIMEOUT_MS,
        {
          minimum:
            1_000,
          maximum:
            2 * 60 * 1_000,
        }
      ),
  });
}

module.exports = {
  SEARCH_QUEUE_FEATURE_FLAG,
  SEARCH_QUEUE_NAME,
  SEARCH_QUEUE_SCHEMA_VERSION,
  SEARCH_QUEUE_JOB_NAMES,
  SEARCH_QUEUE_PRIORITIES,
  DEFAULT_MAX_ADMITTED_JOBS,
  DEFAULT_WORKER_START_TIMEOUT_MS,
  DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS,
  DEFAULT_WORKER_HEARTBEAT_TTL_MS,
  DEFAULT_WORKER_DRAIN_TIMEOUT_MS,
  createSearchQueueConfigurationError,
  getSearchQueueConfig,
};
