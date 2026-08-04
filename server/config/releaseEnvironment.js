"use strict";

const {
  parseTrustProxy,
} = require(
  "./runtimeSecurityConfig"
);

const RELEASE_DEPLOYMENT_ENVIRONMENTS =
  new Set([
    "staging",
    "production",
  ]);

const REQUIRED_RELEASE_ENVIRONMENT_KEYS =
  Object.freeze([
    "CLIENT_ORIGINS",
    "DEPLOYMENT_ENV",
    "GEOAPIFY_API_KEY",
    "LITEAPI_API_KEY",
    "LITEAPI_WHITELABEL_BASE_URL",
    "NODE_ENV",
    "RELEASE_SHA",
    "RUNTIME_STATE_MODE",
    "TRUST_PROXY",
    "VITE_API_URL",
  ]);

const CONDITIONAL_ANALYTICS_RELEASE_ENVIRONMENT_KEYS =
  Object.freeze([
    "ANALYTICS_ADMIN_TOKEN",
    "ANALYTICS_ENABLED",
    "ANALYTICS_STORAGE_MODE",
    "ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED",
    "VITE_ANALYTICS_ENABLED",
  ]);

const IN_MEMORY_RUNTIME_STATE_MODE =
  "in-memory-single-instance";

const DISTRIBUTED_RUNTIME_STATE_MODE =
  "valkey-distributed";

const REQUIRED_RUNTIME_STATE_MODE =
  IN_MEMORY_RUNTIME_STATE_MODE;

const DISTRIBUTED_RELEASE_ENVIRONMENT_KEYS =
  Object.freeze([
    "PROVIDER_ACCOUNT_RATE_LIMITS_JSON",
    "PROVIDER_MAX_CONCURRENT_OPERATIONS",
    "SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED",
    "SMARTSTAY_OPERATIONAL_STATE_MODE",
    "SMARTSTAY_QUEUE_ENVIRONMENT",
    "SMARTSTAY_QUEUE_KEY_SECRET",
    "SMARTSTAY_QUEUE_REDIS_URL",
    "SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED",
    "SMARTSTAY_SEARCH_WORKER_CONCURRENCY",
    "SMARTSTAY_STATE_COMMAND_POOL_SIZE",
    "SMARTSTAY_STATE_ENVIRONMENT",
    "SMARTSTAY_STATE_KEY_SECRET",
    "SMARTSTAY_STATE_MAX_SESSIONS",
    "SMARTSTAY_STATE_REDIS_URL",
    "SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES",
  ]);

const RELEASE_RUNTIME_STATE_MODES =
  new Set([
    IN_MEMORY_RUNTIME_STATE_MODE,
    DISTRIBUTED_RUNTIME_STATE_MODE,
  ]);

const REQUIRED_ANALYTICS_STORAGE_MODE =
  "in-memory-single-instance";

const MIN_ANALYTICS_ADMIN_TOKEN_LENGTH =
  32;

const MIN_DISTRIBUTED_SECRET_BYTES =
  32;

const MIN_DISTRIBUTED_SESSION_AGGREGATE_BYTES =
  82_529_650;

const MAX_DISTRIBUTED_PROVIDER_CONCURRENCY =
  8;

function normalizeText(
  value
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeBooleanFlag(
  value
) {
  const normalized =
    normalizeText(value)
      .toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === ""
  ) {
    return false;
  }

  return null;
}

function getDeploymentEnvironment(
  environment =
    process.env
) {
  const explicit =
    normalizeText(
      environment
        .DEPLOYMENT_ENV
    ).toLowerCase();

  if (explicit) {
    return explicit;
  }

  return normalizeText(
    environment.NODE_ENV
  ).toLowerCase() ===
    "production"
    ? "production"
    : "development";
}

function isReleaseEnvironment(
  environment =
    process.env
) {
  return RELEASE_DEPLOYMENT_ENVIRONMENTS
    .has(
      getDeploymentEnvironment(
        environment
      )
    );
}

function createIssue(
  field,
  code,
  message
) {
  return Object.freeze({
    field,
    code,
    message,
  });
}

function validateHttpsUrl(
  value,
  field,
  {
    allowRelative =
      false,
  } = {}
) {
  const candidate =
    normalizeText(
      value
    );

  if (!candidate) {
    return createIssue(
      field,
      "REQUIRED",
      `${field} is required.`
    );
  }

  if (
    allowRelative &&
    candidate.startsWith(
      "/"
    )
  ) {
    if (
      candidate.startsWith(
        "//"
      ) ||
      candidate
        .split("/")
        .some(
          (segment) =>
            segment ===
              ".." ||
            segment ===
              "."
        )
    ) {
      return createIssue(
        field,
        "INVALID_RELATIVE_URL",
        `${field} must start with a single slash.`
      );
    }

    try {
      const parsed =
        new URL(
          candidate,
          "https://smartstay.invalid"
        );

      if (
        parsed.search ||
        parsed.hash ||
        parsed.pathname ===
          "/"
      ) {
        return createIssue(
          field,
          "INVALID_RELATIVE_URL",
          `${field} must be a clean relative API path.`
        );
      }

      return null;
    } catch {
      return createIssue(
        field,
        "INVALID_URL",
        `${field} must be a valid URL or relative path.`
      );
    }
  }

  try {
    const parsed =
      new URL(
        candidate
      );

    if (
      parsed.protocol !==
        "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.hostname ===
        "localhost" ||
      parsed.hostname ===
        "127.0.0.1"
    ) {
      return createIssue(
        field,
        "HTTPS_URL_REQUIRED",
        `${field} must be a public HTTPS URL without credentials, query, or hash.`
      );
    }

    return null;
  } catch {
    return createIssue(
      field,
      "INVALID_URL",
      `${field} must be a valid URL.`
    );
  }
}

function validateClientOrigins(
  value
) {
  const candidate =
    normalizeText(
      value
    );

  if (!candidate) {
    return [
      createIssue(
        "CLIENT_ORIGINS",
        "REQUIRED",
        "CLIENT_ORIGINS is required."
      ),
    ];
  }

  const issues =
    [];

  const origins =
    candidate
      .split(",")
      .map(
        (entry) =>
          entry.trim()
      )
      .filter(Boolean);

  if (
    origins.length ===
      0
  ) {
    return [
      createIssue(
        "CLIENT_ORIGINS",
        "REQUIRED",
        "At least one client origin is required."
      ),
    ];
  }

  for (
    const origin of
    origins
  ) {
    if (
      origin ===
        "*"
    ) {
      issues.push(
        createIssue(
          "CLIENT_ORIGINS",
          "WILDCARD_NOT_ALLOWED",
          "Wildcard CORS origins are not allowed."
        )
      );

      continue;
    }

    try {
      const parsed =
        new URL(
          origin
        );

      if (
        parsed.protocol !==
          "https:" ||
        parsed.origin !==
          origin ||
        parsed.username ||
        parsed.password ||
        parsed.hostname ===
          "localhost" ||
        parsed.hostname ===
          "127.0.0.1"
      ) {
        issues.push(
          createIssue(
            "CLIENT_ORIGINS",
            "HTTPS_ORIGIN_REQUIRED",
            "Every release client origin must be an exact public HTTPS origin."
          )
        );
      }
    } catch {
      issues.push(
        createIssue(
          "CLIENT_ORIGINS",
          "INVALID_ORIGIN",
          "CLIENT_ORIGINS contains an invalid origin."
        )
      );
    }
  }

  return issues;
}

function validateRedisUrl(
  value,
  field
) {
  const candidate =
    normalizeText(
      value
    );

  if (!candidate) {
    return createIssue(
      field,
      "REQUIRED",
      `${field} is required.`
    );
  }

  try {
    const parsed =
      new URL(
        candidate
      );

    if (
      ![
        "redis:",
        "rediss:",
      ].includes(
        parsed.protocol
      ) ||
      !parsed.hostname ||
      parsed.hash
    ) {
      return createIssue(
        field,
        "INVALID_REDIS_URL",
        `${field} must be a valid redis:// or rediss:// URL.`
      );
    }

    return null;
  } catch {
    return createIssue(
      field,
      "INVALID_REDIS_URL",
      `${field} must be a valid redis:// or rediss:// URL.`
    );
  }
}

function validateIntegerSetting(
  environment,
  field,
  {
    minimum =
      1,
    maximum =
      Number.MAX_SAFE_INTEGER,
  } = {}
) {
  const candidate =
    normalizeText(
      environment[field]
    );
  const number =
    Number(candidate);

  if (!candidate) {
    return createIssue(
      field,
      "REQUIRED",
      `${field} is required.`
    );
  }

  if (
    !Number.isSafeInteger(
      number
    ) ||
    number < minimum ||
    number > maximum
  ) {
    return createIssue(
      field,
      "OUTSIDE_DISTRIBUTED_LIMIT",
      `${field} must be an integer from ${minimum} to ${maximum}.`
    );
  }

  return null;
}

function collectProviderAccountRateLimitIssues(
  value
) {
  const field =
    "PROVIDER_ACCOUNT_RATE_LIMITS_JSON";
  const candidate =
    normalizeText(
      value
    );

  if (!candidate) {
    return [
      createIssue(
        field,
        "REQUIRED",
        `${field} is required for a distributed release.`
      ),
    ];
  }

  let source;

  try {
    source =
      JSON.parse(
        candidate
      );
  } catch {
    return [
      createIssue(
        field,
        "INVALID_PROVIDER_RATE_LIMITS",
        `${field} must be valid JSON.`
      ),
    ];
  }

  if (
    !source ||
    typeof source !==
      "object" ||
    Array.isArray(
      source
    ) ||
    Object.keys(
      source
    ).length ===
      0
  ) {
    return [
      createIssue(
        field,
        "INVALID_PROVIDER_RATE_LIMITS",
        `${field} must be a non-empty object keyed by provider id.`
      ),
    ];
  }

  const issues =
    [];

  if (
    !Object.prototype
      .hasOwnProperty.call(
        source,
        "liteapi"
      ) &&
    !Object.prototype
      .hasOwnProperty.call(
        source,
        "*"
      )
  ) {
    issues.push(
      createIssue(
        field,
        "LITEAPI_RATE_LIMIT_REQUIRED",
        `${field} must define liteapi or a wildcard policy.`
      )
    );
  }

  for (
    const [
      providerId,
      policy,
    ] of Object.entries(
      source
    )
  ) {
    if (
      !policy ||
      typeof policy !==
        "object" ||
      Array.isArray(
        policy
      ) ||
      !Number.isSafeInteger(
        Number(
          policy.maxRequests
        )
      ) ||
      Number(
        policy.maxRequests
      ) < 1 ||
      Number(
        policy.maxRequests
      ) > 1_000_000 ||
      !Number.isSafeInteger(
        Number(
          policy.windowMs
        )
      ) ||
      Number(
        policy.windowMs
      ) < 100 ||
      Number(
        policy.windowMs
      ) >
        24 * 60 * 60 * 1_000
    ) {
      issues.push(
        createIssue(
          field,
          "INVALID_PROVIDER_RATE_LIMIT_POLICY",
          `Provider rate limit policy "${providerId}" is invalid.`
        )
      );
    }
  }

  return issues;
}

function collectDistributedRuntimeIssues(
  environment,
  deploymentEnvironment
) {
  const issues =
    [];

  if (
    normalizeText(
      environment
        .SMARTSTAY_OPERATIONAL_STATE_MODE
    ) !==
      DISTRIBUTED_RUNTIME_STATE_MODE
  ) {
    issues.push(
      createIssue(
        "SMARTSTAY_OPERATIONAL_STATE_MODE",
        "DISTRIBUTED_OPERATIONAL_STATE_REQUIRED",
        `SMARTSTAY_OPERATIONAL_STATE_MODE must be ${DISTRIBUTED_RUNTIME_STATE_MODE}.`
      )
    );
  }

  if (
    normalizeBooleanFlag(
      environment
        .SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED
    ) !== true
  ) {
    issues.push(
      createIssue(
        "SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED",
        "DISTRIBUTED_QUEUE_REQUIRED",
        "SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED must be true."
      )
    );
  }

  const stateUrlIssue =
    validateRedisUrl(
      environment
        .SMARTSTAY_STATE_REDIS_URL,
      "SMARTSTAY_STATE_REDIS_URL"
    );
  const queueUrlIssue =
    validateRedisUrl(
      environment
        .SMARTSTAY_QUEUE_REDIS_URL,
      "SMARTSTAY_QUEUE_REDIS_URL"
    );

  if (stateUrlIssue) {
    issues.push(
      stateUrlIssue
    );
  }

  if (queueUrlIssue) {
    issues.push(
      queueUrlIssue
    );
  }

  if (
    !stateUrlIssue &&
    !queueUrlIssue &&
    normalizeText(
      environment
        .SMARTSTAY_STATE_REDIS_URL
    ) !==
      normalizeText(
        environment
          .SMARTSTAY_QUEUE_REDIS_URL
      )
  ) {
    issues.push(
      createIssue(
        "SMARTSTAY_QUEUE_REDIS_URL",
        "DISTRIBUTED_DATASTORE_MISMATCH",
        "State and queue must use the same staging Valkey connection."
      )
    );
  }

  for (
    const field of
    [
      "SMARTSTAY_STATE_ENVIRONMENT",
      "SMARTSTAY_QUEUE_ENVIRONMENT",
    ]
  ) {
    if (
      normalizeText(
        environment[field]
      ).toLowerCase() !==
        deploymentEnvironment
    ) {
      issues.push(
        createIssue(
          field,
          "DISTRIBUTED_NAMESPACE_MISMATCH",
          `${field} must match DEPLOYMENT_ENV.`
        )
      );
    }
  }

  for (
    const field of
    [
      "SMARTSTAY_STATE_KEY_SECRET",
      "SMARTSTAY_QUEUE_KEY_SECRET",
    ]
  ) {
    if (
      Buffer.byteLength(
        typeof environment[field] ===
          "string"
          ? environment[field]
          : "",
        "utf8"
      ) <
        MIN_DISTRIBUTED_SECRET_BYTES
    ) {
      issues.push(
        createIssue(
          field,
          "DISTRIBUTED_SECRET_TOO_SHORT",
          `${field} must contain at least ${MIN_DISTRIBUTED_SECRET_BYTES} UTF-8 bytes.`
        )
      );
    }
  }

  for (
    const [
      field,
      minimum,
      maximum,
    ] of
    [
      [
        "SMARTSTAY_STATE_COMMAND_POOL_SIZE",
        1,
        8,
      ],
      [
        "SMARTSTAY_STATE_MAX_SESSIONS",
        1_000,
        100_000,
      ],
      [
        "SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES",
        MIN_DISTRIBUTED_SESSION_AGGREGATE_BYTES,
        8 * 1_024 * 1_024 * 1_024,
      ],
      [
        "SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED",
        1_000,
        1_000,
      ],
      [
        "SMARTSTAY_SEARCH_WORKER_CONCURRENCY",
        1,
        32,
      ],
      [
        "PROVIDER_MAX_CONCURRENT_OPERATIONS",
        1,
        MAX_DISTRIBUTED_PROVIDER_CONCURRENCY,
      ],
    ]
  ) {
    const issue =
      validateIntegerSetting(
        environment,
        field,
        {
          minimum,
          maximum,
        }
      );

    if (issue) {
      issues.push(
        issue
      );
    }
  }

  issues.push(
    ...collectProviderAccountRateLimitIssues(
      environment
        .PROVIDER_ACCOUNT_RATE_LIMITS_JSON
    )
  );

  return issues;
}

function collectReleaseEnvironmentIssues(
  environment =
    process.env
) {
  const explicitDeploymentEnvironment =
    normalizeText(
      environment
        .DEPLOYMENT_ENV
    ).toLowerCase();

  const nodeEnv =
    normalizeText(
      environment.NODE_ENV
    ).toLowerCase();

  const shouldValidateRelease =
    Boolean(
      explicitDeploymentEnvironment
    ) ||
    nodeEnv ===
      "production";

  if (
    !shouldValidateRelease
  ) {
    return [];
  }

  const issues =
    [];

  const deploymentEnvironment =
    getDeploymentEnvironment(
      environment
    );

  if (
    !RELEASE_DEPLOYMENT_ENVIRONMENTS
      .has(
        deploymentEnvironment
      )
  ) {
    issues.push(
      createIssue(
        "DEPLOYMENT_ENV",
        "INVALID_DEPLOYMENT_ENV",
        "DEPLOYMENT_ENV must be staging or production."
      )
    );
  }

  if (
    normalizeText(
      environment.NODE_ENV
    ).toLowerCase() !==
      "production"
  ) {
    issues.push(
      createIssue(
        "NODE_ENV",
        "PRODUCTION_REQUIRED",
        "NODE_ENV must be production for staging and production releases."
      )
    );
  }

  issues.push(
    ...validateClientOrigins(
      environment.CLIENT_ORIGINS ??
      environment.CLIENT_ORIGIN
    )
  );

  if (
    !Object.prototype
      .hasOwnProperty.call(
        environment,
        "TRUST_PROXY"
      )
  ) {
    issues.push(
      createIssue(
        "TRUST_PROXY",
        "REQUIRED",
        "TRUST_PROXY must be set explicitly."
      )
    );
  }
  else {
    try {
      parseTrustProxy(
        environment.TRUST_PROXY
      );
    } catch {
      issues.push(
        createIssue(
          "TRUST_PROXY",
          "INVALID_TRUST_PROXY",
          "TRUST_PROXY must be false, true, or an integer from 0 to 10."
        )
      );
    }
  }

  for (
    const key of
    [
      "GEOAPIFY_API_KEY",
      "LITEAPI_API_KEY",
    ]
  ) {
    if (
      !normalizeText(
        environment[key]
      )
    ) {
      issues.push(
        createIssue(
          key,
          "REQUIRED",
          `${key} is required.`
        )
      );
    }
  }

  const frontendApiIssue =
    validateHttpsUrl(
      environment.VITE_API_URL,
      "VITE_API_URL",
      {
        allowRelative:
          true,
      }
    );

  if (
    frontendApiIssue
  ) {
    issues.push(
      frontendApiIssue
    );
  }

  const handoffIssue =
    validateHttpsUrl(
      environment
        .LITEAPI_WHITELABEL_BASE_URL,
      "LITEAPI_WHITELABEL_BASE_URL"
    );

  if (
    handoffIssue
  ) {
    issues.push(
      handoffIssue
    );
  }

  const releaseSha =
    normalizeText(
      environment.RELEASE_SHA
    );

  if (
    !/^[0-9a-f]{7,64}$/i.test(
      releaseSha
    )
  ) {
    issues.push(
      createIssue(
        "RELEASE_SHA",
        "INVALID_RELEASE_SHA",
        "RELEASE_SHA must be a Git commit hash."
      )
    );
  }

  const runtimeStateMode =
    normalizeText(
      environment
        .RUNTIME_STATE_MODE
    );

  if (
    !RELEASE_RUNTIME_STATE_MODES
      .has(
        runtimeStateMode
      )
  ) {
    issues.push(
      createIssue(
        "RUNTIME_STATE_MODE",
        "RUNTIME_STATE_MODE_UNSUPPORTED",
        "RUNTIME_STATE_MODE must declare an approved release topology."
      )
    );
  }
  else if (
    deploymentEnvironment ===
      "production" &&
    runtimeStateMode !==
      DISTRIBUTED_RUNTIME_STATE_MODE
  ) {
    issues.push(
      createIssue(
        "RUNTIME_STATE_MODE",
        "DISTRIBUTED_RUNTIME_REQUIRED",
        `Production requires RUNTIME_STATE_MODE=${DISTRIBUTED_RUNTIME_STATE_MODE}.`
      )
    );
  }

  if (
    runtimeStateMode ===
      DISTRIBUTED_RUNTIME_STATE_MODE
  ) {
    issues.push(
      ...collectDistributedRuntimeIssues(
        environment,
        deploymentEnvironment
      )
    );
  }

  const backendAnalyticsEnabled =
    normalizeBooleanFlag(
      environment.ANALYTICS_ENABLED
    );

  const frontendAnalyticsEnabled =
    normalizeBooleanFlag(
      environment.VITE_ANALYTICS_ENABLED
    );

  if (
    backendAnalyticsEnabled === null ||
    frontendAnalyticsEnabled === null
  ) {
    issues.push(
      createIssue(
        "ANALYTICS_ENABLED",
        "INVALID_ANALYTICS_FLAG",
        "Analytics flags must be true, false, 1, or 0."
      )
    );
  }
  else if (
    backendAnalyticsEnabled !==
      frontendAnalyticsEnabled
  ) {
    issues.push(
      createIssue(
        "ANALYTICS_ENABLED",
        "ANALYTICS_FLAG_MISMATCH",
        "VITE_ANALYTICS_ENABLED and ANALYTICS_ENABLED must match."
      )
    );
  }

  if (
    runtimeStateMode ===
      DISTRIBUTED_RUNTIME_STATE_MODE &&
    backendAnalyticsEnabled ===
      true
  ) {
    issues.push(
      createIssue(
        "ANALYTICS_ENABLED",
        "DISTRIBUTED_ANALYTICS_UNSUPPORTED",
        "Analytics must stay disabled until a shared analytics store is available."
      )
    );
  }

  if (backendAnalyticsEnabled === true) {
    const adminToken =
      normalizeText(
        environment.ANALYTICS_ADMIN_TOKEN
      );

    if (
      adminToken.length <
        MIN_ANALYTICS_ADMIN_TOKEN_LENGTH
    ) {
      issues.push(
        createIssue(
          "ANALYTICS_ADMIN_TOKEN",
          "ANALYTICS_ADMIN_TOKEN_REQUIRED",
          `ANALYTICS_ADMIN_TOKEN must contain at least ${MIN_ANALYTICS_ADMIN_TOKEN_LENGTH} characters.`
        )
      );
    }

    if (
      normalizeText(
        environment.ANALYTICS_STORAGE_MODE
      ).toLowerCase() !==
        REQUIRED_ANALYTICS_STORAGE_MODE
    ) {
      issues.push(
        createIssue(
          "ANALYTICS_STORAGE_MODE",
          "ANALYTICS_STORAGE_MODE_REQUIRED",
          `ANALYTICS_STORAGE_MODE must be ${REQUIRED_ANALYTICS_STORAGE_MODE}.`
        )
      );
    }

    if (
      normalizeBooleanFlag(
        environment.ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED
      ) !== true
    ) {
      issues.push(
        createIssue(
          "ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED",
          "VOLATILE_ANALYTICS_ACKNOWLEDGEMENT_REQUIRED",
          "Volatile analytics storage must be explicitly acknowledged."
        )
      );
    }
  }

  return issues;
}

function createReleaseEnvironmentError(
  issues
) {
  const error =
    new Error(
      "Release environment validation failed."
    );

  error.name =
    "SmartStayReleaseEnvironmentError";

  error.code =
    "RELEASE_ENVIRONMENT_INVALID";

  error.issues =
    issues;

  return error;
}

function collectDistributedWorkerEnvironmentIssues(
  environment =
    process.env
) {
  const issues =
    [];
  const deploymentEnvironment =
    getDeploymentEnvironment(
      environment
    );

  if (
    !RELEASE_DEPLOYMENT_ENVIRONMENTS
      .has(
        deploymentEnvironment
      )
  ) {
    issues.push(
      createIssue(
        "DEPLOYMENT_ENV",
        "INVALID_DEPLOYMENT_ENV",
        "DEPLOYMENT_ENV must be staging or production."
      )
    );
  }

  if (
    normalizeText(
      environment.NODE_ENV
    ).toLowerCase() !==
      "production"
  ) {
    issues.push(
      createIssue(
        "NODE_ENV",
        "PRODUCTION_REQUIRED",
        "NODE_ENV must be production for a release worker."
      )
    );
  }

  if (
    !/^[0-9a-f]{7,64}$/i.test(
      normalizeText(
        environment.RELEASE_SHA
      )
    )
  ) {
    issues.push(
      createIssue(
        "RELEASE_SHA",
        "INVALID_RELEASE_SHA",
        "RELEASE_SHA must be a Git commit hash."
      )
    );
  }

  if (
    !normalizeText(
      environment.LITEAPI_API_KEY
    )
  ) {
    issues.push(
      createIssue(
        "LITEAPI_API_KEY",
        "REQUIRED",
        "LITEAPI_API_KEY is required."
      )
    );
  }

  if (
    normalizeText(
      environment
        .RUNTIME_STATE_MODE
    ) !==
      DISTRIBUTED_RUNTIME_STATE_MODE
  ) {
    issues.push(
      createIssue(
        "RUNTIME_STATE_MODE",
        "DISTRIBUTED_RUNTIME_REQUIRED",
        `The search worker requires RUNTIME_STATE_MODE=${DISTRIBUTED_RUNTIME_STATE_MODE}.`
      )
    );
  }

  issues.push(
    ...collectDistributedRuntimeIssues(
      environment,
      deploymentEnvironment
    )
  );

  return issues;
}

function assertDistributedWorkerEnvironment({
  environment =
    process.env,
} = {}) {
  const issues =
    collectDistributedWorkerEnvironmentIssues(
      environment
    );

  if (
    issues.length >
      0
  ) {
    throw createReleaseEnvironmentError(
      issues
    );
  }

  return Object.freeze({
    deploymentEnvironment:
      getDeploymentEnvironment(
        environment
      ),
    runtimeStateMode:
      DISTRIBUTED_RUNTIME_STATE_MODE,
  });
}

function assertReleaseEnvironment({
  environment =
    process.env,
} = {}) {
  const issues =
    collectReleaseEnvironmentIssues(
      environment
    );

  if (
    issues.length >
      0
  ) {
    throw createReleaseEnvironmentError(
      issues
    );
  }

  return Object.freeze({
    deploymentEnvironment:
      getDeploymentEnvironment(
        environment
      ),

    release:
      isReleaseEnvironment(
        environment
      ),

    runtimeStateMode:
      normalizeText(
        environment
          .RUNTIME_STATE_MODE
      ) ||
      "development",

    analyticsEnabled:
      normalizeBooleanFlag(
        environment.ANALYTICS_ENABLED
      ) === true,

    analyticsStorageMode:
      normalizeText(
        environment.ANALYTICS_STORAGE_MODE
      ) ||
      "disabled",
  });
}

module.exports = {
  CONDITIONAL_ANALYTICS_RELEASE_ENVIRONMENT_KEYS,
  DISTRIBUTED_RELEASE_ENVIRONMENT_KEYS,
  DISTRIBUTED_RUNTIME_STATE_MODE,
  IN_MEMORY_RUNTIME_STATE_MODE,
  MAX_DISTRIBUTED_PROVIDER_CONCURRENCY,
  MIN_ANALYTICS_ADMIN_TOKEN_LENGTH,
  MIN_DISTRIBUTED_SECRET_BYTES,
  MIN_DISTRIBUTED_SESSION_AGGREGATE_BYTES,
  RELEASE_DEPLOYMENT_ENVIRONMENTS,
  REQUIRED_ANALYTICS_STORAGE_MODE,
  REQUIRED_RELEASE_ENVIRONMENT_KEYS,
  REQUIRED_RUNTIME_STATE_MODE,
  assertDistributedWorkerEnvironment,
  assertReleaseEnvironment,
  collectDistributedRuntimeIssues,
  collectDistributedWorkerEnvironmentIssues,
  collectReleaseEnvironmentIssues,
  getDeploymentEnvironment,
  isReleaseEnvironment,
  normalizeBooleanFlag,
  validateClientOrigins,
  validateHttpsUrl,
};
