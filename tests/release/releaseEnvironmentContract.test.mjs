import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createRequire,
} from "node:module";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

const require =
  createRequire(
    import.meta.url
  );

const typescript =
  require(
    "typescript"
  );

const currentDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  path.resolve(
    currentDirectory,
    "../.."
  );

const {
  DISTRIBUTED_RELEASE_ENVIRONMENT_KEYS,
  DISTRIBUTED_RUNTIME_STATE_MODE,
  REQUIRED_ANALYTICS_STORAGE_MODE,
  REQUIRED_RUNTIME_STATE_MODE,
  assertDistributedWorkerEnvironment,
  assertReleaseEnvironment,
  collectDistributedWorkerEnvironmentIssues,
  collectReleaseEnvironmentIssues,
} =
  require(
    path.join(
      repositoryRoot,
      "server/config/releaseEnvironment.js"
    )
  );

function createValidReleaseEnvironment(
  overrides =
    {}
) {
  return {
    NODE_ENV:
      "production",
    DEPLOYMENT_ENV:
      "staging",
    CLIENT_ORIGINS:
      "https://staging.example.com",
    TRUST_PROXY:
      "1",
    VITE_API_URL:
      "/api",
    GEOAPIFY_API_KEY:
      "test-geoapify-key",
    LITEAPI_API_KEY:
      "test-liteapi-key",
    LITEAPI_WHITELABEL_BASE_URL:
      "https://checkout.example.com",
    RELEASE_SHA:
      "c690ac53efe16a41d82c1f3ddf611ffdad78a081",
    RUNTIME_STATE_MODE:
      REQUIRED_RUNTIME_STATE_MODE,
    ...overrides,
  };
}

function createValidDistributedReleaseEnvironment(
  overrides =
    {}
) {
  const redisUrl =
    "rediss://smartstay-valkey.internal:6379/0";

  return createValidReleaseEnvironment({
    RUNTIME_STATE_MODE:
      DISTRIBUTED_RUNTIME_STATE_MODE,
    SMARTSTAY_OPERATIONAL_STATE_MODE:
      DISTRIBUTED_RUNTIME_STATE_MODE,
    SMARTSTAY_STATE_REDIS_URL:
      redisUrl,
    SMARTSTAY_STATE_ENVIRONMENT:
      "staging",
    SMARTSTAY_STATE_KEY_SECRET:
      "state-secret-with-at-least-32-bytes-4e1",
    SMARTSTAY_STATE_COMMAND_POOL_SIZE:
      "4",
    SMARTSTAY_STATE_MAX_SESSIONS:
      "1000",
    SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES:
      "134217728",
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED:
      "true",
    SMARTSTAY_QUEUE_REDIS_URL:
      redisUrl,
    SMARTSTAY_QUEUE_ENVIRONMENT:
      "staging",
    SMARTSTAY_QUEUE_KEY_SECRET:
      "queue-secret-with-at-least-32-bytes-4e1",
    SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED:
      "1000",
    SMARTSTAY_SEARCH_WORKER_CONCURRENCY:
      "4",
    PROVIDER_MAX_CONCURRENT_OPERATIONS:
      "8",
    PROVIDER_ACCOUNT_RATE_LIMITS_JSON:
      JSON.stringify({
        liteapi: {
          maxRequests:
            10,
          windowMs:
            1_000,
        },
      }),
    ANALYTICS_ENABLED:
      "false",
    VITE_ANALYTICS_ENABLED:
      "false",
    ...overrides,
  });
}

async function loadCompiledTypeScriptModule(
  relativePath
) {
  const sourcePath =
    path.join(
      repositoryRoot,
      relativePath
    );

  const source =
    fs.readFileSync(
      sourcePath,
      "utf8"
    );

  const output =
    typescript.transpileModule(
      source,
      {
        compilerOptions: {
          module:
            typescript
              .ModuleKind
              .CommonJS,
          target:
            typescript
              .ScriptTarget
              .ES2022,
        },
        fileName:
          sourcePath,
      }
    ).outputText;

  const temporaryDirectory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "smartstay-release-test-"
      )
    );

  const outputPath =
    path.join(
      temporaryDirectory,
      "module.cjs"
    );

  fs.writeFileSync(
    outputPath,
    output,
    "utf8"
  );

  try {
    delete require.cache[
      require.resolve(
        outputPath
      )
    ];

    return require(
      outputPath
    );
  } finally {
    fs.rmSync(
      temporaryDirectory,
      {
        recursive:
          true,
        force:
          true,
      }
    );
  }
}

test(
  "release environment accepts the canonical single-instance staging contract",
  () => {
    const result =
      assertReleaseEnvironment({
        environment:
          createValidReleaseEnvironment(),
      });

    assert.equal(
      result.release,
      true
    );

    assert.equal(
      result.deploymentEnvironment,
      "staging"
    );

    assert.equal(
      result.runtimeStateMode,
      REQUIRED_RUNTIME_STATE_MODE
    );
  }
);

test(
  "release environment rejects missing secrets, wildcard CORS and ambiguous runtime state",
  () => {
    const issues =
      collectReleaseEnvironmentIssues(
        createValidReleaseEnvironment({
          CLIENT_ORIGINS:
            "*",
          GEOAPIFY_API_KEY:
            "",
          LITEAPI_API_KEY:
            "",
          RUNTIME_STATE_MODE:
            "shared",
          TRUST_PROXY:
            "invalid",
        })
      );

    const issueCodes =
      new Set(
        issues.map(
          (issue) =>
            issue.code
        )
      );

    assert.equal(
      issueCodes.has(
        "WILDCARD_NOT_ALLOWED"
      ),
      true
    );

    assert.equal(
      issueCodes.has(
        "REQUIRED"
      ),
      true
    );

    assert.equal(
      issueCodes.has(
        "INVALID_TRUST_PROXY"
      ),
      true
    );

    assert.equal(
      issueCodes.has(
        "RUNTIME_STATE_MODE_UNSUPPORTED"
      ),
      true
    );
  }
);

test(
  "release environment accepts the 4E distributed staging contract for API and worker",
  () => {
    const environment =
      createValidDistributedReleaseEnvironment();
    const apiResult =
      assertReleaseEnvironment({
        environment,
      });
    const workerResult =
      assertDistributedWorkerEnvironment({
        environment,
      });

    assert.equal(
      apiResult.runtimeStateMode,
      DISTRIBUTED_RUNTIME_STATE_MODE
    );
    assert.equal(
      apiResult.analyticsEnabled,
      false
    );
    assert.equal(
      workerResult.runtimeStateMode,
      DISTRIBUTED_RUNTIME_STATE_MODE
    );
  }
);

test(
  "distributed release fails closed on datastore drift, weak secrets, missing quota, excessive concurrency and process-local analytics",
  () => {
    const issues =
      collectReleaseEnvironmentIssues(
        createValidDistributedReleaseEnvironment({
          SMARTSTAY_QUEUE_REDIS_URL:
            "rediss://other-valkey.internal:6379/0",
          SMARTSTAY_QUEUE_ENVIRONMENT:
            "other",
          SMARTSTAY_STATE_KEY_SECRET:
            "short",
          PROVIDER_ACCOUNT_RATE_LIMITS_JSON:
            "{}",
          PROVIDER_MAX_CONCURRENT_OPERATIONS:
            "9",
          ANALYTICS_ENABLED:
            "true",
          VITE_ANALYTICS_ENABLED:
            "true",
          ANALYTICS_ADMIN_TOKEN:
            "a".repeat(32),
          ANALYTICS_STORAGE_MODE:
            REQUIRED_ANALYTICS_STORAGE_MODE,
          ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED:
            "true",
        })
      );
    const issueCodes =
      new Set(
        issues.map(
          (issue) =>
            issue.code
        )
      );

    for (
      const expectedCode of
      [
        "DISTRIBUTED_DATASTORE_MISMATCH",
        "DISTRIBUTED_NAMESPACE_MISMATCH",
        "DISTRIBUTED_SECRET_TOO_SHORT",
        "INVALID_PROVIDER_RATE_LIMITS",
        "OUTSIDE_DISTRIBUTED_LIMIT",
        "DISTRIBUTED_ANALYTICS_UNSUPPORTED",
      ]
    ) {
      assert.equal(
        issueCodes.has(
          expectedCode
        ),
        true,
        expectedCode
      );
    }
  }
);

test(
  "production and search workers cannot fall back to process-local state",
  () => {
    const productionIssues =
      collectReleaseEnvironmentIssues(
        createValidReleaseEnvironment({
          DEPLOYMENT_ENV:
            "production",
        })
      );
    const workerIssues =
      collectDistributedWorkerEnvironmentIssues(
        createValidReleaseEnvironment()
      );

    assert.equal(
      productionIssues.some(
        (issue) =>
          issue.code ===
            "DISTRIBUTED_RUNTIME_REQUIRED"
      ),
      true
    );
    assert.equal(
      workerIssues.some(
        (issue) =>
          issue.code ===
            "DISTRIBUTED_RUNTIME_REQUIRED"
      ),
      true
    );
  }
);

test(
  "invalid deployment environment cannot bypass production validation",
  () => {
    const issues =
      collectReleaseEnvironmentIssues(
        createValidReleaseEnvironment({
          DEPLOYMENT_ENV:
            "invalid",
        })
      );

    assert.equal(
      issues.some(
        (issue) =>
          issue.code ===
            "INVALID_DEPLOYMENT_ENV"
      ),
      true
    );
  }
);

test(
  "release contract does not require disabled RouteStack credentials",
  () => {
    const environment =
      createValidReleaseEnvironment();

    delete environment
      .ROUTESTACK_API_KEY;

    delete environment
      .ROUTESTACK_API_SECRET;

    assert.doesNotThrow(
      () =>
        assertReleaseEnvironment({
          environment,
        })
    );
  }
);

test(
  "frontend API URL is local in development and safe in production",
  async () => {
    const {
      resolveApiBaseUrl,
    } =
      await loadCompiledTypeScriptModule(
        "src/config/apiBaseUrl.ts"
      );

    assert.equal(
      resolveApiBaseUrl({
        configuredUrl:
          "",
        isProduction:
          false,
      }),
      "http://localhost:3001/api"
    );

    assert.equal(
      resolveApiBaseUrl({
        configuredUrl:
          "",
        isProduction:
          true,
      }),
      "/api"
    );

    assert.equal(
      resolveApiBaseUrl({
        configuredUrl:
          "https://api.example.com/api/",
        isProduction:
          true,
      }),
      "https://api.example.com/api"
    );

    assert.throws(
      () =>
        resolveApiBaseUrl({
          configuredUrl:
            "http://api.example.com/api",
          isProduction:
            true,
        }),
      /HTTPS/
    );

    assert.throws(
      () =>
        resolveApiBaseUrl({
          configuredUrl:
            "/api?token=secret",
          isProduction:
            true,
        }),
      /query string or hash/
    );
  }
);

test(
  "frontend API service no longer owns a localhost production fallback",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "src/services/api.ts"
        ),
        "utf8"
      );

    assert.match(
      source,
      /from "\.\.\/config\/runtimeConfig"/
    );

    assert.doesNotMatch(
      source,
      /http:\/\/localhost:3001\/api/
    );
  }
);

test(
  "release examples, workflow and scripts expose the permanent deployment contract",
  () => {
    const frontendExample =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          ".env.example"
        ),
        "utf8"
      );

    const backendExample =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "server/.env.example"
        ),
        "utf8"
      );

    const workflow =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          ".github/workflows/release-gate.yml"
        ),
        "utf8"
      );

    const packageManifest =
      JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            "package.json"
          ),
          "utf8"
        )
      );

    assert.match(
      frontendExample,
      /VITE_API_URL=\/api/
    );

    for (
      const key of
      new Set([
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
        ...DISTRIBUTED_RELEASE_ENVIRONMENT_KEYS,
      ])
    ) {
      assert.match(
        backendExample,
        new RegExp(
          `^${key}=`,
          "m"
        )
      );
    }

    assert.match(
      workflow,
      /npm ci --prefix server/
    );

    assert.equal(
      packageManifest
        .scripts
        ["test:release"],
      "node --test tests/release/*.test.mjs"
    );

    assert.equal(
      packageManifest
        .scripts
        ["release:gate"],
      "npm run release:ci && npm run check:release-env"
    );
  }
);

test(
  "health endpoints expose release identity without environment secrets",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "server/app.js"
        ),
        "utf8"
      );

    assert.match(
      source,
      /version:\s*config\.serviceVersion/
    );

    assert.match(
      source,
      /environment:\s*config\s*\.deploymentEnvironment/
    );

    assert.doesNotMatch(
      source,
      /LITEAPI_API_KEY/
    );
  }
);


test(
  "release environment requires matched analytics flags, admin protection and explicit volatile storage acknowledgement",
  () => {
    const enabledEnvironment =
      createValidReleaseEnvironment({
        ANALYTICS_ENABLED:
          "true",
        VITE_ANALYTICS_ENABLED:
          "true",
        ANALYTICS_ADMIN_TOKEN:
          "a".repeat(32),
        ANALYTICS_STORAGE_MODE:
          REQUIRED_ANALYTICS_STORAGE_MODE,
        ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED:
          "true",
      });

    const result =
      assertReleaseEnvironment({
        environment:
          enabledEnvironment,
      });

    assert.equal(
      result.analyticsEnabled,
      true
    );
    assert.equal(
      result.analyticsStorageMode,
      REQUIRED_ANALYTICS_STORAGE_MODE
    );

    const issues =
      collectReleaseEnvironmentIssues(
        createValidReleaseEnvironment({
          ANALYTICS_ENABLED:
            "true",
          VITE_ANALYTICS_ENABLED:
            "false",
          ANALYTICS_ADMIN_TOKEN:
            "short",
          ANALYTICS_STORAGE_MODE:
            "persistent",
          ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED:
            "false",
        })
      );

    const issueCodes =
      new Set(
        issues.map(
          (issue) =>
            issue.code
        )
      );

    for (
      const expectedCode of
      [
        "ANALYTICS_FLAG_MISMATCH",
        "ANALYTICS_ADMIN_TOKEN_REQUIRED",
        "ANALYTICS_STORAGE_MODE_REQUIRED",
        "VOLATILE_ANALYTICS_ACKNOWLEDGEMENT_REQUIRED",
      ]
    ) {
      assert.equal(
        issueCodes.has(
          expectedCode
        ),
        true,
        expectedCode
      );
    }
  }
);
