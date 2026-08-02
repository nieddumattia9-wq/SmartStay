import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require =
  createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

const {
  createClient,
} = require(
  "../../server/node_modules/redis"
);

const valkeyUrl =
  process.env
    .SMARTSTAY_TEST_VALKEY_URL;
const integrationEnabled =
  typeof valkeyUrl === "string" &&
  valkeyUrl.trim().length > 0;
const workerPath = fileURLToPath(
  new URL(
    "../fixtures/valkeyProviderProtectionWorker.mjs",
    import.meta.url
  )
);
const environment =
  `c3${process.pid}${Date.now()}`
    .toLowerCase()
    .slice(0, 32);
const hmacSecret =
  "smartstay-4c3-provider-protection-test-secret";
const permissiveAccountLimits =
  Object.freeze({
    "*": Object.freeze({
      maxRequests: 1_000,
      windowMs: 10_000,
    }),
  });

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createState(overrides = {}) {
  return createValkeyOperationalState({
    url: valkeyUrl,
    environment,
    hmacSecret,
    connectTimeoutMs: 2_000,
    commandTimeoutMs: 2_000,
    providerGlobalActiveLimit: 8,
    providerPerProviderActiveLimit: 8,
    providerGlobalQueuedLimit: 64,
    providerPerProviderQueuedLimit: 64,
    providerLeaseTtlMs: 500,
    providerAcquirePollMs: 10,
    providerAccountRateLimits:
      permissiveAccountLimits,
    providerCircuitFailureThreshold: 3,
    providerCircuitCooldownMs: 150,
    providerCircuitRecordTtlMs: 5_000,
    providerHalfOpenProbeLeaseMs: 500,
    ...overrides,
  });
}

async function cleanupNamespace() {
  const client = createClient({
    url: valkeyUrl,
    disableOfflineQueue: true,
  });
  client.on("error", () => {});

  try {
    await client.connect();
    const keys = [];

    for await (
      const batch of client.scanIterator({
        MATCH:
          `ss:v1:${environment}:*`,
        COUNT: 100,
      })
    ) {
      keys.push(
        ...(Array.isArray(batch)
          ? batch
          : [batch])
      );
    }

    if (keys.length > 0) {
      await client.del(keys);
    }
  } finally {
    if (client.isOpen) {
      client.destroy();
    }
  }
}

async function listNamespaceKeys() {
  const client = createClient({
    url: valkeyUrl,
    disableOfflineQueue: true,
  });
  client.on("error", () => {});

  try {
    await client.connect();
    const keys = [];

    for await (
      const batch of client.scanIterator({
        MATCH:
          `ss:v1:${environment}:*`,
        COUNT: 100,
      })
    ) {
      keys.push(
        ...(Array.isArray(batch)
          ? batch
          : [batch])
      );
    }

    return keys;
  } finally {
    if (client.isOpen) {
      client.destroy();
    }
  }
}

function runWorker(
  operation,
  extraEnvironment = {},
  onMessage = () => {}
) {
  return new Promise(
    (resolve, reject) => {
      const child = fork(
        workerPath,
        [],
        {
          env: {
            ...process.env,
            SMARTSTAY_TEST_VALKEY_URL:
              valkeyUrl,
            SMARTSTAY_TEST_STATE_ENVIRONMENT:
              environment,
            SMARTSTAY_TEST_STATE_SECRET:
              hmacSecret,
            SMARTSTAY_TEST_WORKER_OPERATION:
              operation,
            SMARTSTAY_TEST_GLOBAL_ACTIVE:
              "8",
            SMARTSTAY_TEST_PROVIDER_ACTIVE:
              "8",
            SMARTSTAY_TEST_LEASE_TTL_MS:
              "500",
            SMARTSTAY_TEST_ACCOUNT_RATE_LIMITS:
              JSON.stringify(
                permissiveAccountLimits
              ),
            ...extraEnvironment,
          },
          stdio: [
            "ignore",
            "pipe",
            "pipe",
            "ipc",
          ],
        }
      );
      const messages = [];
      let stderr = "";
      const timeout = setTimeout(
        () => {
          child.kill();
          reject(
            new Error(
              `Valkey provider-protection worker timeout: ${stderr}`
            )
          );
        },
        20_000
      );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr += chunk.toString(
            "utf8"
          );
        }
      );
      child.on(
        "message",
        (message) => {
          messages.push(message);
          onMessage(message);
        }
      );
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("exit", (code) => {
        clearTimeout(timeout);
        const failure =
          messages.find(
            (message) =>
              message?.ok === false
          );

        if (code !== 0 || failure) {
          reject(
            new Error(
              `Valkey provider-protection worker failed (${code}): ${stderr || failure?.errorMessage || "unknown"}`
            )
          );
          return;
        }

        resolve(messages);
      });
    }
  );
}

test(
  "two or more processes never exceed the aggregate provider active limit of eight",
  {
    skip: !integrationEnabled,
    timeout: 30_000,
  },
  async () => {
    await cleanupNamespace();
    let observedActive = 0;
    let maximumObservedActive = 0;

    try {
      const workers = Array.from(
        { length: 12 },
        () =>
          runWorker(
            "capacity-hold",
            {
              SMARTSTAY_TEST_HOLD_MS:
                "300",
            },
            (message) => {
              if (
                message?.event ===
                "acquired"
              ) {
                observedActive += 1;
                maximumObservedActive =
                  Math.max(
                    maximumObservedActive,
                    observedActive
                  );
              }

              if (
                message?.event ===
                "released"
              ) {
                observedActive -= 1;
              }
            }
          )
      );

      const results =
        await Promise.all(workers);

      assert.equal(
        results.length,
        12
      );
      assert.equal(
        maximumObservedActive,
        8
      );
      assert.equal(observedActive, 0);

      const state = createState();

      try {
        const snapshot =
          await state
            .providerCapacityCoordinator
            .getProviderOperationCapacitySnapshot({
              providerId:
                "provider-a",
            });

        assert.equal(
          snapshot.active,
          0
        );
        assert.equal(
          snapshot.queued,
          0
        );
        assert.equal(
          snapshot.maximumActive,
          8
        );
      } finally {
        await state.close();
      }
    } finally {
      await cleanupNamespace();
    }
  }
);

test(
  "provider leases renew while owned, expire after a leak, and reject late release of a newer lease",
  {
    skip: !integrationEnabled,
    timeout: 15_000,
  },
  async () => {
    await cleanupNamespace();

    const renewing = createState({
      providerGlobalActiveLimit: 1,
      providerPerProviderActiveLimit: 1,
      providerLeaseTtlMs: 120,
      providerLeaseRenewalEnabled: true,
    });

    try {
      const controller =
        new AbortController();
      const release =
        await renewing
          .providerCapacityCoordinator
          .acquireProviderOperationCapacity({
            providerId: "provider-a",
            methodName: "searchHotels",
            signal:
              controller.signal,
            leaseTtlMs: 120,
          });

      await delay(320);

      assert.equal(
        (
          await renewing
            .providerCapacityCoordinator
            .getProviderOperationCapacitySnapshot({
              providerId:
                "provider-a",
            })
        ).active,
        1
      );
      assert.equal(
        await release(),
        true
      );
    } finally {
      await renewing.close();
    }

    const staleOwner = createState({
      providerGlobalActiveLimit: 1,
      providerPerProviderActiveLimit: 1,
      providerLeaseTtlMs: 120,
      providerLeaseRenewalEnabled: false,
    });
    const newOwner = createState({
      providerGlobalActiveLimit: 1,
      providerPerProviderActiveLimit: 1,
      providerLeaseTtlMs: 120,
      providerLeaseRenewalEnabled: false,
    });

    try {
      const first =
        await staleOwner
          .providerCapacityCoordinator
          .acquireProviderOperationCapacity({
            providerId: "provider-a",
            methodName: "searchHotels",
            signal:
              new AbortController()
                .signal,
            leaseTtlMs: 120,
          });

      await delay(170);

      const second =
        await newOwner
          .providerCapacityCoordinator
          .acquireProviderOperationCapacity({
            providerId: "provider-a",
            methodName: "searchHotels",
            signal:
              new AbortController()
                .signal,
            leaseTtlMs: 120,
          });

      assert.equal(
        await first(),
        false
      );
      assert.equal(
        (
          await newOwner
            .providerCapacityCoordinator
            .getProviderOperationCapacitySnapshot({
              providerId:
                "provider-a",
            })
        ).active,
        1
      );
      assert.equal(
        await second(),
        true
      );
    } finally {
      await Promise.all([
        staleOwner.close(),
        newOwner.close(),
      ]);
      await cleanupNamespace();
    }
  }
);

test(
  "account quotas and endpoint rate limits remain shared across clients and processes",
  {
    skip: !integrationEnabled,
    timeout: 20_000,
  },
  async () => {
    await cleanupNamespace();
    const accountPolicy = {
      "provider-a": {
        maxRequests: 3,
        windowMs: 2_000,
      },
    };
    const first = createState({
      providerAccountRateLimits:
        accountPolicy,
    });
    const second = createState({
      providerAccountRateLimits:
        accountPolicy,
    });

    try {
      for (
        let index = 0;
        index < 3;
        index += 1
      ) {
        const state =
          index % 2 === 0
            ? first
            : second;
        const release =
          await state
            .providerCapacityCoordinator
            .acquireProviderOperationCapacity({
              providerId:
                "provider-a",
              methodName:
                "searchHotels",
              signal:
                new AbortController()
                  .signal,
            });
        await release();
      }

      await assert.rejects(
        () =>
          second
            .providerCapacityCoordinator
            .acquireProviderOperationCapacity({
              providerId:
                "provider-a",
              methodName:
                "searchHotels",
              signal:
                new AbortController()
                  .signal,
            }),
        (error) =>
          error?.code ===
            "PROVIDER_ACCOUNT_RATE_LIMITED" &&
          error?.status === 429 &&
          error?.retryAfterMs > 0
      );
    } finally {
      await Promise.all([
        first.close(),
        second.close(),
      ]);
    }

    const results =
      await Promise.all([
        runWorker(
          "endpoint-burst"
        ),
        runWorker(
          "endpoint-burst"
        ),
      ]);
    const statuses =
      results.flatMap(
        (messages) =>
          messages.find(
            (message) =>
              message.event ===
              "complete"
          )?.statuses ?? []
      );

    assert.equal(
      statuses.filter(
        (status) => status === 200
      ).length,
      5
    );
    assert.equal(
      statuses.filter(
        (status) => status === 429
      ).length,
      1
    );

    const keys =
      await listNamespaceKeys();

    assert.equal(
      keys.some((key) =>
        key.includes("127.0.0.1")
      ),
      false
    );
    assert.equal(
      keys.some((key) =>
        /:provider-a(?:$|:)/.test(
          key
        )
      ),
      false
    );

    await cleanupNamespace();
  }
);

test(
  "provider circuit state is shared and admits exactly one half-open probe across processes",
  {
    skip: !integrationEnabled,
    timeout: 20_000,
  },
  async () => {
    await cleanupNamespace();

    try {
      const failureMessages =
        await runWorker(
          "health-fail",
          {
            SMARTSTAY_TEST_CIRCUIT_COOLDOWN_MS:
              "1000",
          }
        );
      const opened =
        failureMessages.find(
          (message) =>
            message.event ===
            "complete"
        )?.health;

      assert.equal(
        opened?.circuitState,
        "open"
      );

      const blockedMessages =
        await runWorker(
          "health-begin",
          {
            SMARTSTAY_TEST_CIRCUIT_COOLDOWN_MS:
              "1000",
          }
        );
      const blocked =
        blockedMessages.find(
          (message) =>
            message.event ===
            "complete"
        )?.permission;

      assert.equal(
        blocked?.allowed,
        false
      );
      assert.equal(
        blocked?.reason,
        "circuit_open"
      );

      await delay(1_050);

      const probes =
        await Promise.all([
          runWorker(
            "health-begin",
            {
              SMARTSTAY_TEST_CIRCUIT_COOLDOWN_MS:
                "1000",
              SMARTSTAY_TEST_HALF_OPEN_LEASE_MS:
                "500",
            }
          ),
          runWorker(
            "health-begin",
            {
              SMARTSTAY_TEST_CIRCUIT_COOLDOWN_MS:
                "1000",
              SMARTSTAY_TEST_HALF_OPEN_LEASE_MS:
                "500",
            }
          ),
        ]);
      const permissions =
        probes.map(
          (messages) =>
            messages.find(
              (message) =>
                message.event ===
                "complete"
            ).permission
        );

      assert.equal(
        permissions.filter(
          (permission) =>
            permission.allowed
        ).length,
        1
      );
      assert.equal(
        permissions.filter(
          (permission) =>
            !permission.allowed &&
            permission.reason ===
              "half_open_probe_in_flight"
        ).length,
        1
      );

      const allowed =
        permissions.find(
          (permission) =>
            permission.allowed
        );
      const state = createState();

      try {
        const closed =
          await state
            .providerHealthStore
            .recordProviderHealthyResponse(
              "provider-a",
              {
                attemptToken:
                  allowed.attemptToken,
              }
            );

        assert.equal(
          closed.circuitState,
          "closed"
        );
        assert.equal(
          closed.consecutiveFailures,
          0
        );
      } finally {
        await state.close();
      }
    } finally {
      await cleanupNamespace();
    }
  }
);
