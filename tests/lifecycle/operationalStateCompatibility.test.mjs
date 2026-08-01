import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(import.meta.url);

const root =
  process.cwd();

const {
  OPERATIONAL_STATE_MODES,
  OPERATIONAL_STATE_PORT_CONTRACTS,
  assertOperationalStatePort,
} = require(
  "../../server/state/operationalStateContracts.js"
);

const {
  createInMemoryOperationalState,
  getOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

function listJavaScriptFiles(
  directoryPath
) {
  const files = [];

  for (
    const entry of fs.readdirSync(
      directoryPath,
      {
        withFileTypes:
          true,
      }
    )
  ) {
    const entryPath =
      path.join(
        directoryPath,
        entry.name
      );

    if (entry.isDirectory()) {
      files.push(
        ...listJavaScriptFiles(
          entryPath
        )
      );
    }
    else if (
      entry.isFile() &&
      entry.name.endsWith(
        ".js"
      )
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

test(
  "all 4C1 operational-state ports have explicit runtime contracts",
  () => {
    assert.deepEqual(
      Object.keys(
        OPERATIONAL_STATE_PORT_CONTRACTS
      ),
      [
        "searchSessionStore",
        "continuationLeaseStore",
        "initialSearchIdempotencyStore",
        "bookingVerificationStore",
        "bookingHandoffStore",
        "endpointRateLimitStoreFactory",
        "providerCapacityCoordinator",
        "providerHealthStore",
        "searchQueueAdmission",
      ]
    );

    const state =
      getOperationalState();

    assert.equal(
      state.mode,
      OPERATIONAL_STATE_MODES
        .IN_MEMORY_SINGLE_INSTANCE
    );

    assert.equal(
      state.distributed,
      false
    );

    assert.equal(
      Object.isFrozen(state),
      true
    );

    for (
      const portName of Object.keys(
        OPERATIONAL_STATE_PORT_CONTRACTS
      )
    ) {
      const adapter =
        state[portName];

      assert.equal(
        Object.isFrozen(adapter),
        true,
        portName
      );

      assert.equal(
        adapter.implementation,
        "in-memory",
        portName
      );

      assert.equal(
        assertOperationalStatePort(
          portName,
          adapter
        ),
        adapter,
        portName
      );
    }
  }
);

test(
  "in-memory adapters preserve the exact legacy store functions",
  () => {
    const state =
      getOperationalState();

    const mappings = [
      [
        "searchSessionStore",
        require(
          "../../server/storage/searchSession.js"
        ),
      ],
      [
        "continuationLeaseStore",
        require(
          "../../server/storage/searchSession.js"
        ),
      ],
      [
        "initialSearchIdempotencyStore",
        require(
          "../../server/storage/searchIdempotency.js"
        ),
      ],
      [
        "bookingVerificationStore",
        require(
          "../../server/storage/bookingVerificationStore.js"
        ),
      ],
      [
        "bookingHandoffStore",
        require(
          "../../server/storage/bookingHandoffStore.js"
        ),
      ],
      [
        "endpointRateLimitStoreFactory",
        require(
          "../../server/middleware/endpointRateLimits.js"
        ),
      ],
      [
        "providerCapacityCoordinator",
        require(
          "../../server/providers/common/inMemoryProviderCapacityCoordinator.js"
        ),
      ],
      [
        "providerHealthStore",
        require(
          "../../server/providers/common/providerHealthService.js"
        ),
      ],
    ];

    for (
      const [
        portName,
        legacyModule,
      ] of mappings
    ) {
      const contract =
        OPERATIONAL_STATE_PORT_CONTRACTS[
          portName
        ];

      for (
        const methodName of contract.methods
      ) {
        assert.equal(
          state[portName][methodName],
          legacyModule[methodName],
          `${portName}.${methodName}`
        );
      }

      for (
        const valueName of contract.values
      ) {
        assert.equal(
          state[portName][valueName],
          legacyModule[valueName],
          `${portName}.${valueName}`
        );
      }
    }
  }
);

test(
  "search-session and continuation ports share the current in-memory state",
  () => {
    const {
      searchSessionStore,
      continuationLeaseStore,
    } = getOperationalState();

    const session =
      searchSessionStore
        .saveSearchSession({
          hotels:
            [],
          marker:
            "4c1-compatibility",
        });

    try {
      const acquired =
        continuationLeaseStore
          .tryAcquireSearchContinuation(
            session.searchId
          );

      assert.equal(
        acquired.acquired,
        true
      );

      const released =
        continuationLeaseStore
          .releaseSearchContinuation(
            session.searchId,
            acquired.lockToken,
            {
              status:
                "Completed",
            }
          );

      assert.equal(
        released.released,
        true
      );

      assert.equal(
        searchSessionStore
          .requireSearchSession(
            session.searchId
          )
          .status,
        "Completed"
      );
    }
    finally {
      searchSessionStore
        .clearSearchSession(
          session.searchId
        );
    }
  }
);

test(
  "in-memory continuation writes enforce active ownership and monotonic fencing",
  () => {
    const {
      searchSessionStore,
      continuationLeaseStore,
    } = getOperationalState();
    const session =
      searchSessionStore
        .saveSearchSession({
          hotels: [],
        });

    try {
      const first =
        continuationLeaseStore
          .tryAcquireSearchContinuation(
            session.searchId
          );

      assert.throws(
        () =>
          searchSessionStore
            .updateSearchSession(
              session.searchId,
              { marker: "unowned" }
            ),
        (error) =>
          error?.code ===
          "SEARCH_CONTINUATION_IN_PROGRESS"
      );

      searchSessionStore.updateSearchSession(
        session.searchId,
        {
          continuationLockExpiresAt:
            Date.now() - 1,
        },
        {
          lockToken: first.lockToken,
          fencingNumber:
            first.fencingNumber,
        }
      );

      assert.equal(
        continuationLeaseStore
          .renewSearchContinuation(
            session.searchId,
            first.lockToken,
            first.fencingNumber
          ).renewed,
        false
      );

      const second =
        continuationLeaseStore
          .tryAcquireSearchContinuation(
            session.searchId
          );

      assert.ok(
        second.fencingNumber >
          first.fencingNumber
      );
      assert.throws(
        () =>
          searchSessionStore
            .updateSearchSession(
              session.searchId,
              { marker: "stale" },
              {
                lockToken:
                  first.lockToken,
                fencingNumber:
                  first.fencingNumber,
              }
            ),
        (error) =>
          error?.code ===
          "SEARCH_CONTINUATION_LEASE_STALE"
      );

      assert.equal(
        continuationLeaseStore
          .releaseSearchContinuation(
            session.searchId,
            second.lockToken,
            { marker: "fresh" },
            {
              fencingNumber:
                second.fencingNumber,
            }
          ).released,
        true
      );
    } finally {
      searchSessionStore
        .clearSearchSession(
          session.searchId
        );
    }
  }
);

test(
  "partial legacy test doubles are validated only for accessed capabilities",
  () => {
    const requireSearchSession =
      () => ({
        searchId:
          "partial-double",
      });

    const state =
      createInMemoryOperationalState({
        searchSession: {
          requireSearchSession,
        },
      });

    assert.equal(
      state.searchSessionStore
        .requireSearchSession,
      requireSearchSession
    );

    assert.throws(
      () =>
        state.searchSessionStore
          .saveSearchSession,
      (error) =>
        error?.code ===
          "OPERATIONAL_STATE_CONTRACT_INVALID" &&
        /saveSearchSession/.test(
          error.message
        )
    );
  }
);

test(
  "search queue admission is explicit and disabled during 4C1",
  async () => {
    const admission =
      getOperationalState()
        .searchQueueAdmission;

    assert.equal(
      admission.enabled,
      false
    );

    assert.deepEqual(
      admission
        .getSearchQueueAdmissionSnapshot(),
      {
        enabled:
          false,
        mode:
          "disabled",
        admitted:
          0,
        active:
          0,
        waiting:
          0,
      }
    );

    await assert.rejects(
      admission.admitSearch({}),
      (error) =>
        error?.code ===
          "SEARCH_QUEUE_NOT_ENABLED" &&
        error?.status ===
          503 &&
        error?.retryable ===
          true
    );

    assert.equal(
      admission
        .releaseSearchAdmission(
          "not-admitted"
        ),
      false
    );
  }
);

test(
  "provider timeout keeps its public facade while using the capacity port",
  () => {
    const timeout =
      require(
        "../../server/providers/common/providerOperationTimeoutService.js"
      );

    assert.deepEqual(
      Object.keys(timeout),
      [
        "DEFAULT_PROVIDER_OPERATION_TIMEOUTS_MS",
        "MAX_PROVIDER_CONCURRENT_OPERATIONS",
        "MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER",
        "MAX_PROVIDER_QUEUED_OPERATIONS",
        "MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER",
        "resolveProviderOperationTimeoutMs",
        "createProviderOperationTimeoutError",
        "createProviderOperationCapacityError",
        "getProviderOperationCapacitySnapshot",
        "executeProviderOperationWithTimeout",
      ]
    );

    const coordinator =
      getOperationalState()
        .providerCapacityCoordinator;

    assert.equal(
      timeout
        .MAX_PROVIDER_CONCURRENT_OPERATIONS,
      coordinator
        .MAX_PROVIDER_CONCURRENT_OPERATIONS
    );

    assert.deepEqual(
      timeout
        .getProviderOperationCapacitySnapshot(),
      coordinator
        .getProviderOperationCapacitySnapshot()
    );
  }
);

test(
  "process-local modules are imported only by the 4C1 composition root",
  () => {
    const serverRoot =
      path.join(
        root,
        "server"
      );

    const allowedRelativePath =
      "state/operationalState.js";

    const forbiddenImports = [
      "storage/searchSession",
      "storage/searchIdempotency",
      "storage/bookingVerificationStore",
      "storage/bookingHandoffStore",
      "middleware/endpointRateLimits",
      "common/providerHealthService",
      "common/inMemoryProviderCapacityCoordinator",
    ];

    const violations = [];

    for (
      const filePath of listJavaScriptFiles(
        serverRoot
      )
    ) {
      const relativePath =
        path.relative(
          serverRoot,
          filePath
        ).replaceAll(
          path.sep,
          "/"
        );

      if (
        relativePath ===
          allowedRelativePath
      ) {
        continue;
      }

      const source =
        fs.readFileSync(
          filePath,
          "utf8"
        );

      for (
        const forbiddenImport of
          forbiddenImports
      ) {
        if (
          source.includes(
            forbiddenImport
          )
        ) {
          violations.push(
            `${relativePath}: ${forbiddenImport}`
          );
        }
      }
    }

    assert.deepEqual(
      violations,
      []
    );
  }
);

test(
  "4C2 confines the Redis-compatible dependency to shared-state adapters and keeps Engine V2 infrastructure-neutral",
  () => {
    const packageJson =
      JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            "package.json"
          ),
          "utf8"
        )
      );

    const serverPackageJson =
      JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            "server",
            "package.json"
          ),
          "utf8"
        )
      );

    const dependencyNames =
      Object.keys({
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...serverPackageJson.dependencies,
        ...serverPackageJson.devDependencies,
      });

    assert.deepEqual(
      dependencyNames.filter(
        (name) =>
          /^(bullmq|ioredis|redis|valkey)$/i
            .test(name)
      ),
      [
        "redis",
      ]
    );

    assert.equal(
      serverPackageJson
        .dependencies.redis,
      "6.2.0"
    );

    const redisImportFindings =
      listJavaScriptFiles(
        path.join(root, "server")
      )
        .filter((filePath) =>
          /require\(["']redis["']\)/
            .test(
              fs.readFileSync(
                filePath,
                "utf8"
              )
            )
        )
        .map((filePath) =>
          path
            .relative(
              path.join(root, "server"),
              filePath
            )
            .replaceAll(path.sep, "/")
        );

    assert.deepEqual(
      redisImportFindings,
      [
        "state/valkey/valkeyShared.js",
      ]
    );

    const engineRoot =
      path.join(
        root,
        "src",
        "engine-v2"
      );

    const findings =
      listJavaScriptFiles(
        engineRoot
      );

    assert.deepEqual(
      findings,
      []
    );

    const engineTypeScriptFiles = [];

    function collectTypeScript(
      directoryPath
    ) {
      for (
        const entry of fs.readdirSync(
          directoryPath,
          {
            withFileTypes:
              true,
          }
        )
      ) {
        const entryPath =
          path.join(
            directoryPath,
            entry.name
          );

        if (entry.isDirectory()) {
          collectTypeScript(
            entryPath
          );
        }
        else if (
          entry.isFile() &&
          entry.name.endsWith(
            ".ts"
          )
        ) {
          engineTypeScriptFiles.push(
            entryPath
          );
        }
      }
    }

    collectTypeScript(
      engineRoot
    );

    const infrastructureFindings =
      engineTypeScriptFiles
        .filter(
          (filePath) =>
            /(bullmq|ioredis|valkey|operationalState|redis)/i
              .test(
                fs.readFileSync(
                  filePath,
                  "utf8"
                )
              )
        )
        .map(
          (filePath) =>
            path.relative(
              root,
              filePath
            )
        );

    assert.deepEqual(
      infrastructureFindings,
      []
    );
  }
);
