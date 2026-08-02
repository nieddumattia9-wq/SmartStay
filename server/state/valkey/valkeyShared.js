"use strict";

const crypto = require("crypto");

const VALKEY_KEYSPACE_VERSION = "v1";
const DEFAULT_CONNECT_TIMEOUT_MS = 2_000;
const DEFAULT_COMMAND_TIMEOUT_MS = 3_000;
const DEFAULT_RETRY_AFTER_MS = 500;

const ENVIRONMENT_PATTERN =
  /^[a-z0-9][a-z0-9_-]{0,31}$/;

function createOperationalStateError({
  code,
  message,
  status = 503,
  retryable = false,
  retryAfterMs = null,
} = {}) {
  const error = new Error(message);

  error.name = "OperationalStateError";
  error.code = code;
  error.status = status;
  error.retryable = retryable;
  error.retryAfterMs =
    Number.isFinite(Number(retryAfterMs)) &&
    Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : null;

  return error;
}

function createOperationalStateUnavailableError() {
  return createOperationalStateError({
    code: "OPERATIONAL_STATE_UNAVAILABLE",
    message:
      "Shared operational state is temporarily unavailable. Please try again shortly.",
    status: 503,
    retryable: true,
    retryAfterMs: DEFAULT_RETRY_AFTER_MS,
  });
}

function isOperationalStateError(error) {
  return (
    error?.name === "OperationalStateError" ||
    typeof error?.code === "string" &&
      error.code.startsWith("OPERATIONAL_STATE_")
  );
}

function normalizePositiveInteger(
  value,
  fallback,
  { minimum = 1, maximum = Number.MAX_SAFE_INTEGER } = {}
) {
  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    return fallback;
  }

  return number;
}

function validateValkeyUrl(value) {
  const candidate =
    typeof value === "string"
      ? value.trim()
      : "";

  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    parsed = null;
  }

  if (
    !parsed ||
    !["redis:", "rediss:"].includes(
      parsed.protocol
    ) ||
    !parsed.hostname
  ) {
    throw createOperationalStateError({
      code: "OPERATIONAL_STATE_CONFIGURATION_INVALID",
      message:
        "SMARTSTAY_STATE_REDIS_URL must be a valid redis:// or rediss:// URL.",
      status: 500,
    });
  }

  return candidate;
}

function validateEnvironment(value) {
  const environment =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  if (!ENVIRONMENT_PATTERN.test(environment)) {
    throw createOperationalStateError({
      code: "OPERATIONAL_STATE_CONFIGURATION_INVALID",
      message:
        "SMARTSTAY_STATE_ENVIRONMENT must contain only lowercase letters, numbers, underscores or hyphens.",
      status: 500,
    });
  }

  return environment;
}

function validateHmacSecret(value) {
  const secret =
    typeof value === "string"
      ? value
      : "";

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw createOperationalStateError({
      code: "OPERATIONAL_STATE_CONFIGURATION_INVALID",
      message:
        "SMARTSTAY_STATE_KEY_SECRET must contain at least 32 UTF-8 bytes.",
      status: 500,
    });
  }

  return secret;
}

function createValkeyKeyspace({
  environment,
  hmacSecret,
} = {}) {
  const safeEnvironment =
    validateEnvironment(environment);
  const safeHmacSecret =
    validateHmacSecret(hmacSecret);
  const prefix =
    `ss:${VALKEY_KEYSPACE_VERSION}:${safeEnvironment}`;

  function opaque(component, value) {
    const normalized =
      typeof value === "string"
        ? value.trim()
        : "";

    if (
      !normalized ||
      normalized.length > 160 ||
      !/^[A-Za-z0-9._:-]+$/.test(
        normalized
      )
    ) {
      throw createOperationalStateError({
        code: "OPERATIONAL_STATE_KEY_INVALID",
        message:
          "The shared operational-state identifier is invalid.",
        status: 400,
      });
    }

    return `${prefix}:${component}:${normalized}`;
  }

  function hmac(component, value) {
    const digest = crypto
      .createHmac("sha256", safeHmacSecret)
      .update(String(value), "utf8")
      .digest("hex");

    return `${prefix}:${component}:${digest}`;
  }

  function scopedHmac(
    component,
    scope,
    value
  ) {
    const normalizedScope =
      typeof scope === "string"
        ? scope.trim().toLowerCase()
        : "";

    if (
      !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(
        normalizedScope
      )
    ) {
      throw createOperationalStateError({
        code: "OPERATIONAL_STATE_KEY_INVALID",
        message:
          "The shared operational-state scope is invalid.",
        status: 400,
      });
    }

    return hmac(
      `${component}:${normalizedScope}`,
      value
    );
  }

  return Object.freeze({
    environment: safeEnvironment,
    prefix,
    session(searchId) {
      return opaque("search-session", searchId);
    },
    tombstone(searchId) {
      return opaque("search-tombstone", searchId);
    },
    continuationLease(searchId) {
      return opaque("continuation-lock", searchId);
    },
    continuationFence(searchId) {
      return opaque("continuation-fence", searchId);
    },
    sessionExpiryIndex:
      `${prefix}:meta:search-session-expiry`,
    sessionSizeIndex:
      `${prefix}:meta:search-session-bytes`,
    sessionTotalBytes:
      `${prefix}:meta:search-session-total-bytes`,
    idempotency(idempotencyKey) {
      return hmac(
        "initial-search-idempotency",
        idempotencyKey
      );
    },
    idempotencyResponse(idempotencyKey) {
      return hmac(
        "initial-search-response",
        idempotencyKey
      );
    },
    idempotencyExpiryIndex:
      `${prefix}:meta:initial-search-idempotency-expiry`,
    idempotencyResponseKeyIndex:
      `${prefix}:meta:initial-search-response-keys`,
    idempotencyResponseSizeIndex:
      `${prefix}:meta:initial-search-response-bytes`,
    idempotencyTotalResponseBytes:
      `${prefix}:meta:initial-search-total-response-bytes`,
    bookingVerification(verificationId) {
      return opaque(
        "booking-verification",
        verificationId
      );
    },
    bookingHandoff(handoffId) {
      return opaque(
        "booking-handoff",
        handoffId
      );
    },
    bookingVerificationExpiryIndex:
      `${prefix}:meta:booking-verification-expiry`,
    bookingHandoffExpiryIndex:
      `${prefix}:meta:booking-handoff-expiry`,
    endpointRateLimit(scope, clientIdentity) {
      return scopedHmac(
        "endpoint-rate-limit",
        scope,
        clientIdentity
      );
    },
    providerCapacityGlobal:
      `${prefix}:provider-capacity:global`,
    providerCapacity(providerId) {
      return hmac(
        "provider-capacity",
        providerId
      );
    },
    providerCapacityWaitersGlobal:
      `${prefix}:provider-capacity-waiters:global`,
    providerCapacityWaiters(providerId) {
      return hmac(
        "provider-capacity-waiters",
        providerId
      );
    },
    providerAccountRate(providerId) {
      return hmac(
        "provider-account-rate",
        providerId
      );
    },
    providerCircuit(providerId) {
      return hmac(
        "provider-circuit",
        providerId
      );
    },
    providerCircuitIndex:
      `${prefix}:meta:provider-circuit-index`,
  });
}

function serializeBounded(
  value,
  {
    maxBytes,
    code,
    message,
    status = 413,
  }
) {
  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = null;
  }

  const bytes =
    typeof serialized === "string"
      ? Buffer.byteLength(serialized, "utf8")
      : null;

  if (
    !Number.isSafeInteger(bytes) ||
    bytes > maxBytes
  ) {
    throw createOperationalStateError({
      code,
      message,
      status,
    });
  }

  return Object.freeze({
    serialized,
    bytes,
  });
}

function parseStoredJson(
  value,
  {
    code = "OPERATIONAL_STATE_RECORD_INVALID",
    message =
      "Shared operational state contains an invalid record.",
  } = {}
) {
  try {
    return JSON.parse(value);
  } catch {
    throw createOperationalStateError({
      code,
      message,
      status: 503,
      retryable: false,
    });
  }
}

function cloneJsonValue(value, options) {
  const serialized = serializeBounded(
    value,
    options
  );

  return {
    ...serialized,
    value: parseStoredJson(
      serialized.serialized
    ),
  };
}

function createValkeyCommandExecutor({
  url,
  connectTimeoutMs =
    DEFAULT_CONNECT_TIMEOUT_MS,
  commandTimeoutMs =
    DEFAULT_COMMAND_TIMEOUT_MS,
  createClient: createClientOverride = null,
} = {}) {
  const safeUrl = validateValkeyUrl(url);
  const safeConnectTimeoutMs =
    normalizePositiveInteger(
      connectTimeoutMs,
      DEFAULT_CONNECT_TIMEOUT_MS,
      {
        minimum: 100,
        maximum: 30_000,
      }
    );
  const safeCommandTimeoutMs =
    normalizePositiveInteger(
      commandTimeoutMs,
      DEFAULT_COMMAND_TIMEOUT_MS,
      {
        minimum: 100,
        maximum: 30_000,
      }
    );

  const createClient =
    createClientOverride ??
    require("redis").createClient;

  const client = createClient({
    url: safeUrl,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: safeConnectTimeoutMs,
      reconnectStrategy(retries) {
        if (retries >= 3) {
          return new Error(
            "Shared operational state reconnect budget exhausted."
          );
        }

        return Math.min(
          100 * 2 ** retries,
          750
        );
      },
    },
  });

  client.on("error", () => {
    // Errors are converted to one provider-neutral public failure below.
  });

  let connectPromise = null;

  async function withTimeout(promise) {
    let timeoutHandle;

    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(
          createOperationalStateUnavailableError()
        ),
        safeCommandTimeoutMs
      );
      timeoutHandle.unref?.();
    });

    try {
      return await Promise.race([
        promise,
        timeout,
      ]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function ensureReady() {
    if (client.isReady) {
      return client;
    }

    if (!client.isOpen) {
      if (!connectPromise) {
        connectPromise = client
          .connect()
          .finally(() => {
            connectPromise = null;
          });
      }

      await withTimeout(connectPromise);
    }

    if (!client.isReady) {
      throw createOperationalStateUnavailableError();
    }

    return client;
  }

  async function execute(operation) {
    try {
      const readyClient = await ensureReady();

      return await withTimeout(
        Promise.resolve().then(
          () => operation(readyClient)
        )
      );
    } catch (error) {
      if (isOperationalStateError(error)) {
        throw error;
      }

      throw createOperationalStateUnavailableError();
    }
  }

  async function close() {
    try {
      if (client.isOpen) {
        client.destroy();
      }
    } catch {
      // Closing is best effort and never changes a completed request result.
    }
  }

  return Object.freeze({
    execute,
    close,
    get isReady() {
      return client.isReady === true;
    },
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    const handle = setTimeout(resolve, milliseconds);
    handle.unref?.();
  });
}

module.exports = {
  VALKEY_KEYSPACE_VERSION,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_COMMAND_TIMEOUT_MS,
  createOperationalStateError,
  createOperationalStateUnavailableError,
  isOperationalStateError,
  normalizePositiveInteger,
  validateValkeyUrl,
  validateEnvironment,
  validateHmacSecret,
  createValkeyKeyspace,
  serializeBounded,
  parseStoredJson,
  cloneJsonValue,
  createValkeyCommandExecutor,
  delay,
};
