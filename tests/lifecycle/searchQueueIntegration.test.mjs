import assert from "node:assert/strict";
import { fork } from "node:child_process";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require =
  createRequire(import.meta.url);

const {
  Queue,
  createNodeRedisClient,
} = require(
  "../../server/node_modules/bullmq"
);

const {
  createClient,
} = require(
  "../../server/node_modules/redis"
);

const {
  createBullMqSearchQueueAdmission,
} = require(
  "../../server/queue/searchQueueAdmission.js"
);

const {
  getSearchQueueConfig,
} = require(
  "../../server/queue/searchQueueConfig.js"
);

const {
  createQueuedSearchProcessor,
  createSearchQueueWorker,
} = require(
  "../../server/queue/searchQueueWorker.js"
);

const {
  createValkeyOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

const valkeyUrl =
  process.env
    .SMARTSTAY_TEST_VALKEY_URL;
const integrationEnabled =
  typeof valkeyUrl === "string" &&
  valkeyUrl.trim().length > 0;
const environment =
  `c4${process.pid}${Date.now()}`
    .toLowerCase()
    .slice(0, 32);
const hmacSecret =
  "smartstay-4c4-real-valkey-queue-secret-2026";
const crashWorkerPath =
  fileURLToPath(
    new URL(
      "../fixtures/searchQueueCrashWorker.mjs",
      import.meta.url
    )
  );
const publicRouteProbePath =
  fileURLToPath(
    new URL(
      "../fixtures/searchQueuePublicRouteProbe.mjs",
      import.meta.url
    )
  );

function createQueueConfig(
  overrides = {}
) {
  return getSearchQueueConfig({
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED:
      "true",
    SMARTSTAY_QUEUE_REDIS_URL:
      valkeyUrl,
    SMARTSTAY_QUEUE_ENVIRONMENT:
      environment,
    SMARTSTAY_QUEUE_KEY_SECRET:
      hmacSecret,
    SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED:
      "2",
    SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS:
      "5000",
    SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS:
      "2000",
    SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS:
      "2000",
    SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS:
      "500",
    SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS:
      "3",
    SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS:
      "100",
    SMARTSTAY_SEARCH_WORKER_CONCURRENCY:
      "1",
    ...overrides,
  });
}

function queuedPayload(marker) {
  return {
    destinationId:
      "rome",
    checkIn:
      "2026-09-01",
    checkOut:
      "2026-09-04",
    rooms: [
      {
        adults:
          2,
        children:
          0,
        childAges: [],
      },
    ],
    marker,
  };
}

function fingerprint(payload) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(payload)
    )
    .digest("hex");
}

function admissionRequest({
  idempotencyKey,
  searchId: requestedSearchId,
  payload,
}) {
  return {
    idempotencyKey,
    searchId:
      requestedSearchId,
    payload,
    payloadFingerprint:
      fingerprint(payload),
  };
}

function searchId(suffix) {
  return `ss2.123e4567-e89b-42d3-a456-42661417${suffix}`;
}

function delay(milliseconds) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

async function waitFor(
  predicate,
  {
    timeoutMs = 10_000,
    intervalMs = 50,
  } = {}
) {
  const deadline =
    Date.now() + timeoutMs;
  let lastValue = null;

  while (Date.now() < deadline) {
    lastValue =
      await predicate();

    if (lastValue) {
      return lastValue;
    }

    await delay(intervalMs);
  }

  throw new Error(
    `Search queue integration timeout; last value: ${JSON.stringify(lastValue)}`
  );
}

async function cleanupNamespace() {
  const client =
    createClient({
      url:
        valkeyUrl,
      disableOfflineQueue:
        true,
    });

  client.on("error", () => {});

  try {
    await client.connect();
    const keys = [];

    for await (
      const batch of
      client.scanIterator({
        MATCH:
          `ss:v1:${environment}:*`,
        COUNT:
          100,
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
  }
  finally {
    if (client.isOpen) {
      client.destroy();
    }
  }
}

async function createInspector(
  config
) {
  const rawClient =
    createClient({
      url:
        config.url,
      disableOfflineQueue:
        true,
    });
  rawClient.on(
    "error",
    () => {}
  );
  const queue =
    new Queue(
      config.queueName,
      {
        connection:
          createNodeRedisClient(
            rawClient
          ),
        prefix:
          config.prefix,
      }
    );

  await queue.waitUntilReady();

  return {
    queue,
    async close() {
      await queue.close();

      if (rawClient.isOpen) {
        rawClient.destroy();
      }
    },
  };
}

function runCrashWorker(
  config
) {
  return new Promise(
    (resolve, reject) => {
      const child =
        fork(
          crashWorkerPath,
          [],
          {
            env: {
              ...process.env,
              SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED:
                "true",
              SMARTSTAY_QUEUE_REDIS_URL:
                config.url,
              SMARTSTAY_QUEUE_ENVIRONMENT:
                config.environment,
              SMARTSTAY_QUEUE_KEY_SECRET:
                hmacSecret,
              SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED:
                String(
                  config
                    .maxAdmittedJobs
                ),
              SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS:
                String(
                  config
                    .admissionLeaseMs
                ),
              SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS:
                "2000",
              SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS:
                "2000",
              SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS:
                "500",
              SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS:
                "3",
              SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS:
                "100",
              SMARTSTAY_SEARCH_WORKER_CONCURRENCY:
                "1",
            },
            stdio: [
              "ignore",
              "pipe",
              "pipe",
              "ipc",
            ],
          }
        );
      let activeJobId = null;
      let stderr = "";
      const timeout =
        setTimeout(
          () => {
            child.kill();
            reject(
              new Error(
                `Crash worker timeout: ${stderr}`
              )
            );
          },
          12_000
        );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr +=
            chunk.toString(
              "utf8"
            );
        }
      );
      child.on(
        "message",
        (message) => {
          if (
            message?.event ===
              "active"
          ) {
            activeJobId =
              message.jobId;
          }

          if (
            message?.ok ===
              false
          ) {
            clearTimeout(timeout);
            reject(
              new Error(
                message.errorMessage
              )
            );
          }
        }
      );
      child.on(
        "error",
        (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      );
      child.on(
        "exit",
        (code) => {
          clearTimeout(timeout);

          if (
            code !== 91 ||
            !activeJobId
          ) {
            reject(
              new Error(
                `Crash worker exited ${code}: ${stderr}`
              )
            );
            return;
          }

          resolve({
            code,
            activeJobId,
          });
        }
      );
    }
  );
}

function runPublicRouteProbe(
  config
) {
  return new Promise(
    (resolve, reject) => {
      const child =
        fork(
          publicRouteProbePath,
          [],
          {
            env: {
              ...process.env,
              NODE_ENV:
                "test",
              SMARTSTAY_OPERATIONAL_STATE_MODE:
                "valkey-distributed",
              SMARTSTAY_STATE_REDIS_URL:
                config.url,
              SMARTSTAY_STATE_ENVIRONMENT:
                config.environment,
              SMARTSTAY_STATE_KEY_SECRET:
                hmacSecret,
              SMARTSTAY_STATE_CONNECT_TIMEOUT_MS:
                "2000",
              SMARTSTAY_STATE_COMMAND_TIMEOUT_MS:
                "2000",
              SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED:
                "true",
              SMARTSTAY_QUEUE_REDIS_URL:
                config.url,
              SMARTSTAY_QUEUE_ENVIRONMENT:
                config.environment,
              SMARTSTAY_QUEUE_KEY_SECRET:
                hmacSecret,
              SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED:
                String(
                  config
                    .maxAdmittedJobs
                ),
              SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS:
                String(
                  config
                    .admissionLeaseMs
                ),
              SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS:
                "2000",
              SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS:
                "2000",
              SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS:
                "500",
              SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS:
                "3",
              SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS:
                "100",
              SMARTSTAY_SEARCH_WORKER_CONCURRENCY:
                "1",
            },
            stdio: [
              "ignore",
              "pipe",
              "pipe",
              "ipc",
            ],
          }
        );
      let result = null;
      let stderr = "";
      const timeout =
        setTimeout(
          () => {
            child.kill();
            reject(
              new Error(
                `Public queue route probe timeout: ${stderr}`
              )
            );
          },
          15_000
        );

      child.stderr.on(
        "data",
        (chunk) => {
          stderr +=
            chunk.toString(
              "utf8"
            );
        }
      );
      child.on(
        "message",
        (message) => {
          result = message;
        }
      );
      child.on(
        "error",
        (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      );
      child.on(
        "exit",
        (code) => {
          clearTimeout(timeout);

          if (
            code !== 0 ||
            result?.ok !== true
          ) {
            reject(
              new Error(
                `Public queue route probe failed (${code}): ${stderr || result?.errorMessage || "unknown"}`
              )
            );
            return;
          }

          resolve(result);
        }
      );
    }
  );
}

test(
  "public POST admission returns 202 immediately and replays one opaque queued search",
  {
    skip:
      !integrationEnabled,
    timeout:
      20_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig();

    try {
      const probe =
        await runPublicRouteProbe(
          config
        );

      assert.equal(
        probe.first.status,
        202
      );
      assert.equal(
        probe.first.replayed,
        "false"
      );
      assert.equal(
        probe.first.coalesced,
        "false"
      );
      assert.equal(
        probe.first.cacheControl,
        "no-store"
      );
      assert.match(
        probe.first.body.searchId,
        /^ss2\.[0-9a-f-]{36}$/
      );
      assert.equal(
        probe.first.body.status,
        "Queued"
      );
      assert.equal(
        probe.first.body
          .initialSearchStage,
        "queued"
      );
      assert.equal(
        probe.replay.status,
        202
      );
      assert.equal(
        probe.replay.replayed,
        "true"
      );
      assert.deepEqual(
        probe.replay.body,
        probe.first.body
      );
      assert.equal(
        probe.status.httpStatus,
        200
      );
      assert.equal(
        probe.status.body.searchId,
        probe.first.body.searchId
      );
      assert.equal(
        probe.status.body
          .initialSearchStage,
        "queued"
      );
    }
    finally {
      await cleanupNamespace();
    }
  }
);

test(
  "real Valkey enforces one global admission cap, deterministic deduplication and fenced release",
  {
    skip:
      !integrationEnabled,
    timeout:
      20_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig();
    const first =
      createBullMqSearchQueueAdmission({
        config,
      });
    const second =
      createBullMqSearchQueueAdmission({
        config,
      });
    const inspector =
      await createInspector(config);

    try {
      const payloadA =
        queuedPayload("a");
      const admittedA =
        await first.admitSearch(
          admissionRequest({
          idempotencyKey:
            "queue-admission-a-0001",
          searchId:
            searchId("4000"),
          payload:
              payloadA,
          })
        );
      const replayA =
        await second.admitSearch(
          admissionRequest({
          idempotencyKey:
            "queue-admission-a-0001",
          searchId:
            searchId("4001"),
          payload:
              payloadA,
          })
        );
      const admittedB =
        await second.admitSearch(
          admissionRequest({
          idempotencyKey:
            "queue-admission-b-0001",
          searchId:
            searchId("4002"),
          payload:
            queuedPayload("b"),
          })
        );

      assert.equal(
        replayA.jobId,
        admittedA.jobId
      );
      assert.equal(
        replayA.searchId,
        admittedA.searchId
      );
      assert.equal(
        replayA.replayed,
        true
      );
      await assert.rejects(
        () =>
          second.admitSearch(
            admissionRequest({
              idempotencyKey:
                "queue-admission-a-0001",
              searchId:
                searchId("4004"),
              payload:
                queuedPayload(
                  "conflict"
                ),
            })
          ),
        (error) =>
          error?.code ===
            "IDEMPOTENCY_KEY_CONFLICT" &&
          error?.status === 409
      );
      await assert.rejects(
        () =>
          first.admitSearch(
            admissionRequest({
            idempotencyKey:
              "queue-admission-c-0001",
            searchId:
              searchId("4003"),
            payload:
              queuedPayload("c"),
            })
          ),
        (error) =>
          error?.code ===
            "SEARCH_CAPACITY_TEMPORARILY_EXHAUSTED" &&
          error?.status === 503
      );

      const snapshot =
        await first
          .getSearchQueueAdmissionSnapshot();

      assert.equal(
        snapshot.admitted,
        2
      );
      assert.equal(
        snapshot.waiting,
        2
      );
      assert.equal(
        snapshot.maximumAdmitted,
        2
      );

      const storedA =
        await inspector.queue
          .getJob(admittedA.jobId);

      assert.equal(
        storedA.opts.priority,
        5
      );
      assert.equal(
        JSON.stringify(
          storedA.data
        ).includes(
          "queue-admission-a-0001"
        ),
        false
      );

      const firstExecution =
        await first
          .beginSearchExecution({
            jobId:
              admittedA.jobId,
            admissionToken:
              admittedA
                .admissionToken,
          });
      const secondExecution =
        await second
          .beginSearchExecution({
            jobId:
              admittedA.jobId,
            admissionToken:
              admittedA
                .admissionToken,
          });

      assert.equal(
        firstExecution.fencingNumber,
        1
      );
      assert.equal(
        secondExecution.fencingNumber,
        2
      );
      assert.equal(
        await first
          .releaseSearchAdmission({
            jobId:
              admittedA.jobId,
            admissionToken:
              admittedA
                .admissionToken,
          }),
        false
      );
      assert.equal(
        await first
          .renewSearchAdmission({
            jobId:
              admittedA.jobId,
            admissionToken:
              admittedA
                .admissionToken,
            fencingNumber:
              firstExecution
                .fencingNumber,
          }),
        false
      );
      assert.equal(
        await first
          .releaseSearchAdmission({
            jobId:
              admittedA.jobId,
            admissionToken:
              admittedA
                .admissionToken,
            fencingNumber:
              firstExecution
                .fencingNumber,
          }),
        false
      );
      assert.equal(
        await second
          .releaseSearchAdmission({
            jobId:
              admittedA.jobId,
            admissionToken:
              admittedA
                .admissionToken,
            fencingNumber:
              secondExecution
                .fencingNumber,
          }),
        true
      );

      const uncertainPayload =
        queuedPayload(
          "uncertain-add"
        );
      const uncertainFirst =
        await first.admitSearch(
          admissionRequest({
            idempotencyKey:
              "queue-uncertain-add-0001",
            searchId:
              searchId("4005"),
            payload:
              uncertainPayload,
          })
        );

      assert.equal(
        await first
          .releaseSearchAdmission({
            jobId:
              uncertainFirst.jobId,
            admissionToken:
              uncertainFirst
                .admissionToken,
          }),
        true
      );

      const uncertainReplay =
        await second.admitSearch(
          admissionRequest({
            idempotencyKey:
              "queue-uncertain-add-0001",
            searchId:
              searchId("4006"),
            payload:
              uncertainPayload,
          })
        );

      assert.equal(
        uncertainReplay.replayed,
        true
      );
      assert.equal(
        uncertainReplay.searchId,
        uncertainFirst.searchId
      );

      const uncertainExecution =
        await second
          .beginSearchExecution({
            jobId:
              uncertainReplay.jobId,
            admissionToken:
              uncertainReplay
                .admissionToken,
          });

      assert.equal(
        uncertainExecution.searchId,
        uncertainFirst.searchId
      );
      assert.equal(
        await second
          .releaseSearchAdmission({
            jobId:
              uncertainReplay.jobId,
            admissionToken:
              uncertainReplay
                .admissionToken,
            fencingNumber:
              uncertainExecution
                .fencingNumber,
          }),
        true
      );
      assert.equal(
        await second
          .releaseSearchAdmission({
            jobId:
              admittedB.jobId,
            admissionToken:
              admittedB
                .admissionToken,
          }),
        true
      );
    }
    finally {
      await Promise.allSettled([
        inspector.close(),
        first.close(),
        second.close(),
      ]);
      await cleanupNamespace();
    }
  }
);

test(
  "real Valkey session fencing rejects a late initial-search writer after redelivery",
  {
    skip:
      !integrationEnabled,
    timeout:
      20_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig();
    const state =
      createValkeyOperationalState({
        url:
          valkeyUrl,
        environment,
        hmacSecret,
        connectTimeoutMs:
          2_000,
        commandTimeoutMs:
          2_000,
        providerAccountRateLimits: {
          "*": {
            maxRequests:
              1_000,
            windowMs:
              10_000,
          },
        },
        searchQueueConfig:
          config,
      });

    try {
      const session =
        await state
          .searchSessionStore
          .saveSearchSession({
            originalSearchData:
              queuedPayload(
                "session-fence"
              ),
            status:
              "Queued",
            hotels: [],
            initialSearchStage:
              "queued",
            initialSearchExecutionToken:
              null,
            initialSearchFencingNumber:
              0,
          });
      const payload =
        queuedPayload(
          "session-fence"
        );
      const admitted =
        await state
          .searchQueueAdmission
          .admitSearch(
            admissionRequest({
            idempotencyKey:
              "queue-session-fence-0001",
            searchId:
              session.searchId,
            payload:
                payload,
            })
          );
      const firstAdmission =
        await state
          .searchQueueAdmission
          .beginSearchExecution({
            jobId:
              admitted.jobId,
            admissionToken:
              admitted
                .admissionToken,
          });
      const firstExecution = {
        executionToken:
          "123e4567-e89b-42d3-a456-426614174401",
        fencingNumber:
          firstAdmission
            .fencingNumber,
      };

      assert.equal(
        (
          await state
            .searchSessionStore
            .claimInitialSearchExecution(
              session.searchId,
              firstExecution
            )
        ).claimed,
        true
      );

      const secondAdmission =
        await state
          .searchQueueAdmission
          .beginSearchExecution({
            jobId:
              admitted.jobId,
            admissionToken:
              admitted
                .admissionToken,
          });
      const secondExecution = {
        executionToken:
          "123e4567-e89b-42d3-a456-426614174402",
        fencingNumber:
          secondAdmission
            .fencingNumber,
      };

      assert.equal(
        (
          await state
            .searchSessionStore
            .claimInitialSearchExecution(
              session.searchId,
              secondExecution
            )
        ).claimed,
        true
      );
      await assert.rejects(
        () =>
          state.searchSessionStore
            .updateInitialSearchExecution(
              session.searchId,
              {
                initialSearchStage:
                  "complete",
                status:
                  "Completed",
              },
              firstExecution
            ),
        (error) =>
          error?.code ===
          "SEARCH_INITIAL_EXECUTION_STALE"
      );

      const completed =
        await state
          .searchSessionStore
          .updateInitialSearchExecution(
            session.searchId,
            {
              initialSearchStage:
                "complete",
              status:
                "Completed",
            },
            secondExecution
          );

      assert.equal(
        completed.status,
        "Completed"
      );
      assert.equal(
        await state
          .searchQueueAdmission
          .releaseSearchAdmission({
            jobId:
              admitted.jobId,
            admissionToken:
              admitted
                .admissionToken,
            fencingNumber:
              firstAdmission
                .fencingNumber,
          }),
        false
      );
      assert.equal(
        await state
          .searchQueueAdmission
          .releaseSearchAdmission({
            jobId:
              admitted.jobId,
            admissionToken:
              admitted
                .admissionToken,
            fencingNumber:
              secondAdmission
                .fencingNumber,
          }),
        true
      );
    }
    finally {
      await state.close();
      await cleanupNamespace();
    }
  }
);

test(
  "retained duplicate delivery is harmless and does not execute the provider search twice",
  {
    skip:
      !integrationEnabled,
    timeout:
      20_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig();
    const admission =
      createBullMqSearchQueueAdmission({
        config,
      });
    let executions = 0;
    const processor =
      createQueuedSearchProcessor({
        config,
        operationalState: {
          searchQueueAdmission:
            admission,
        },
        async executeSearch({
          assertInitialSearchOwnership,
        }) {
          await assertInitialSearchOwnership();
          executions += 1;

          return {
            status:
              "Completed",
          };
        },
        async markRetry() {},
        async markFailed() {},
      });
    const worker =
      createSearchQueueWorker({
        config,
        operationalState: {},
        processor,
        workerOptions: {
          lockDuration:
            1_000,
          stalledInterval:
            250,
        },
      });

    try {
      await worker.waitUntilReady();
      const retainedPayload =
        queuedPayload(
          "retained"
        );
      const first =
        await admission.admitSearch(
          admissionRequest({
          idempotencyKey:
            "queue-retained-delivery-0001",
          searchId:
            searchId("4100"),
          payload:
              retainedPayload,
          })
        );

      await waitFor(
        async () => {
          const snapshot =
            await admission
              .getSearchQueueAdmissionSnapshot();

          return executions === 1 &&
            snapshot.admitted === 0;
        }
      );

      const replay =
        await admission.admitSearch(
          admissionRequest({
          idempotencyKey:
            "queue-retained-delivery-0001",
          searchId:
            searchId("4101"),
          payload:
              retainedPayload,
          })
        );

      assert.equal(
        replay.jobId,
        first.jobId
      );
      assert.equal(
        replay.searchId,
        first.searchId
      );
      assert.equal(
        replay.replayed,
        true
      );

      await delay(300);
      assert.equal(executions, 1);
      assert.equal(
        (
          await admission
            .getSearchQueueAdmissionSnapshot()
        ).admitted,
        0
      );
    }
    finally {
      await Promise.allSettled([
        worker.close(),
        admission.close(),
      ]);
      await cleanupNamespace();
    }
  }
);

test(
  "BullMQ recovers a stalled job after a worker process crash and completes it once",
  {
    skip:
      !integrationEnabled,
    timeout:
      30_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig({
        SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS:
          "10000",
      });
    const admission =
      createBullMqSearchQueueAdmission({
        config,
      });
    const crashPayload =
      queuedPayload("crash");
    const admitted =
      await admission.admitSearch(
        admissionRequest({
        idempotencyKey:
          "queue-crash-recovery-0001",
        searchId:
          searchId("4200"),
        payload:
            crashPayload,
        })
      );
    let recoveryWorker = null;
    let recovered = 0;

    try {
      const crash =
        await runCrashWorker(
          config
        );

      assert.equal(
        crash.activeJobId,
        admitted.jobId
      );

      recoveryWorker =
        createSearchQueueWorker({
          config,
          operationalState: {},
          workerOptions: {
            lockDuration:
              300,
            stalledInterval:
              100,
          },
          async processor(job) {
            const execution =
              await admission
                .beginSearchExecution({
                  jobId:
                    job.id,
                  admissionToken:
                    job.data
                      .admissionToken,
                });
            recovered += 1;

            await admission
              .releaseSearchAdmission({
                jobId:
                  job.id,
                admissionToken:
                  job.data
                    .admissionToken,
                fencingNumber:
                  execution
                    .fencingNumber,
              });

            return {
              recovered:
                true,
            };
          },
        });

      await recoveryWorker
        .waitUntilReady();

      await waitFor(
        async () => {
          const snapshot =
            await admission
              .getSearchQueueAdmissionSnapshot();

          return recovered === 1 &&
            snapshot.admitted === 0;
        },
        {
          timeoutMs:
            15_000,
        }
      );

      assert.equal(recovered, 1);
    }
    finally {
      await Promise.allSettled([
        recoveryWorker?.close(),
        admission.close(),
      ]);
      await cleanupNamespace();
    }
  }
);
