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

const REQUIRED_RUNTIME_STATE_MODE =
  "in-memory-single-instance";

function normalizeText(
  value
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
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

  if (
    normalizeText(
      environment
        .RUNTIME_STATE_MODE
    ) !==
      REQUIRED_RUNTIME_STATE_MODE
  ) {
    issues.push(
      createIssue(
        "RUNTIME_STATE_MODE",
        "SINGLE_INSTANCE_ACKNOWLEDGEMENT_REQUIRED",
        `RUNTIME_STATE_MODE must be ${REQUIRED_RUNTIME_STATE_MODE}.`
      )
    );
  }

  return issues;
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

    throw error;
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
  });
}

module.exports = {
  RELEASE_DEPLOYMENT_ENVIRONMENTS,
  REQUIRED_RELEASE_ENVIRONMENT_KEYS,
  REQUIRED_RUNTIME_STATE_MODE,
  assertReleaseEnvironment,
  collectReleaseEnvironmentIssues,
  getDeploymentEnvironment,
  isReleaseEnvironment,
  validateClientOrigins,
  validateHttpsUrl,
};
