import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createRequire,
} from "node:module";
import test from "node:test";

const require =
  createRequire(import.meta.url);

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
  createSearchQueueWorker,
} = require(
  "../../server/queue/searchQueueWorker.js"
);

const valkeyUrl =
  process.env
    .SMARTSTAY_TEST_VALKEY_URL;
const integrationEnabled =
  typeof valkeyUrl ===
    "string" &&
  valkeyUrl.trim().length >
    0;
const environment =
  `c5ops${process.pid}${Date.now()}`
    .toLowerCase()
    .slice(0, 32);
const hmacSecret =
  "smartstay-4c5-operations-valkey-secret-2026";

function createQueueConfig(
  overrides =
    {}
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
      "5",
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
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS:
      "250",
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS:
      "1000",
    SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS:
      "5000",
    ...overrides,
  });
}

function delay(
  milliseconds
) {
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
    timeoutMs =
      10_000,
    intervalMs =
      50,
  } =
    {}
) {
  const deadline =
    Date.now() +
    timeoutMs;
  let lastValue =
    null;

  while (
    Date.now() <
    deadline
  ) {
    lastValue =
      await predicate();

    if (lastValue) {
      return lastValue;
    }

    await delay(
      intervalMs
    );
  }

  throw new Error(
    `Search queue operations timeout; last value: ${JSON.stringify(lastValue)}`
  );
}

function payload(
  marker
) {
  return {
    destinationId:
      "rome",
    marker,
  };
}

function fingerprint(
  value
) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        value
      )
    )
    .digest("hex");
}

function admissionRequest(
  suffix
) {
  const searchPayload =
    payload(suffix);

  return {
    idempotencyKey:
      `queue-operations-${suffix}`,
    searchId:
      `ss2.123e4567-e89b-42d3-a456-42661417${suffix}`,
    payload:
      searchPayload,
    payloadFingerprint:
      fingerprint(
        searchPayload
      ),
  };
}

async function createRawClient() {
  const client =
    createClient({
      url:
        valkeyUrl,
      disableOfflineQueue:
        true,
    });

  client.on(
    "error",
    () => {}
  );
  await client.connect();

  return client;
}

async function cleanupNamespace() {
  const client =
    await createRawClient();

  try {
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
        ...(Array.isArray(
          batch
        )
          ? batch
          : [batch])
      );
    }

    if (keys.length > 0) {
      await client.del(
        keys
      );
    }
  }
  finally {
    client.destroy();
  }
}

test(
  "4C5 worker heartbeat enforces schema, ownership and expiry on real Valkey",
  {
    skip:
      !integrationEnabled,
    timeout:
      15_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig();
    const admission =
      createBullMqSearchQueueAdmission({
        config,
      });
    const rawClient =
      await createRawClient();
    const firstToken =
      "123e4567-e89b-42d3-a456-426614174501";
    const staleToken =
      "123e4567-e89b-42d3-a456-426614174502";
    const workerId =
      "123e4567-e89b-42d3-a456-426614174500";

    try {
      const initial =
        await admission
          .getSearchQueueAdmissionSnapshot();

      assert.equal(
        initial.schemaCompatible,
        false
      );
      assert.equal(
        initial.readyWorkers,
        0
      );

      assert.equal(
        await admission
          .writeSearchWorkerHeartbeat({
            workerId,
            heartbeatToken:
              firstToken,
            state:
              "ready",
            startedAt:
              Date.now(),
          }),
        true
      );

      const ready =
        await admission
          .getSearchQueueAdmissionSnapshot();

      assert.equal(
        ready.schemaCompatible,
        true
      );
      assert.equal(
        ready.readyWorkers,
        1
      );
      assert.ok(
        ready
          .lastReadyWorkerHeartbeatAgeMs <
          1_000
      );
      assert.equal(
        await admission
          .writeSearchWorkerHeartbeat({
            workerId,
            heartbeatToken:
              staleToken,
            state:
              "ready",
            startedAt:
              Date.now(),
          }),
        false
      );

      await delay(
        1_100
      );

      const expired =
        await admission
          .getSearchQueueAdmissionSnapshot();

      assert.equal(
        expired.readyWorkers,
        0
      );

      await rawClient.set(
        `${config.runtimePrefix}:schema-version`,
        "2"
      );

      await assert.rejects(
        admission
          .writeSearchWorkerHeartbeat({
            workerId:
              "123e4567-e89b-42d3-a456-426614174503",
            heartbeatToken:
              "123e4567-e89b-42d3-a456-426614174504",
            state:
              "ready",
            startedAt:
              Date.now(),
          }),
        (error) =>
          error?.code ===
            "SEARCH_QUEUE_SCHEMA_INCOMPATIBLE" &&
          error?.status ===
            503
      );
    }
    finally {
      rawClient.destroy();
      await admission.close();
      await cleanupNamespace();
    }
  }
);

test(
  "4C5 queue snapshot reports real depth and oldest job age without job identity",
  {
    skip:
      !integrationEnabled,
    timeout:
      15_000,
  },
  async () => {
    await cleanupNamespace();
    const config =
      createQueueConfig();
    const admission =
      createBullMqSearchQueueAdmission({
        config,
      });

    try {
      const first =
        await admission.admitSearch(
          admissionRequest(
            "4510"
          )
        );
      await delay(
        50
      );
      const second =
        await admission.admitSearch(
          admissionRequest(
            "4511"
          )
        );
      const snapshot =
        await waitFor(
          async () => {
            const value =
              await admission
                .getSearchQueueAdmissionSnapshot();

            return value.waiting ===
              2
              ? value
              : null;
          }
        );

      assert.equal(
        snapshot.admitted,
        2
      );
      assert.equal(
        snapshot.maximumAdmitted,
        5
      );
      assert.ok(
        snapshot.oldestJobAgeMs >=
          40
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          snapshot,
          "jobIds"
        ),
        false
      );

      assert.equal(
        await admission
          .releaseSearchAdmission({
            jobId:
              first.jobId,
            admissionToken:
              first
                .admissionToken,
          }),
        true
      );
      assert.equal(
        await admission
          .releaseSearchAdmission({
            jobId:
              second.jobId,
            admissionToken:
              second
                .admissionToken,
          }),
        true
      );
    }
    finally {
      await admission.close();
      await cleanupNamespace();
    }
  }
);

test(
  "4C5 graceful worker drain finishes active work and leaves queued work to a replacement",
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
    const processedByFirst =
      new Set();
    const processedBySecond =
      new Set();
    let signalFirstActive;
    let releaseFirst;
    const firstActive =
      new Promise(
        (resolve) => {
          signalFirstActive =
            resolve;
        }
      );
    const firstRelease =
      new Promise(
        (resolve) => {
          releaseFirst =
            resolve;
        }
      );

    async function executeAndRelease(
      job,
      target
    ) {
      const execution =
        await admission
          .beginSearchExecution({
            jobId:
              job.id,
            admissionToken:
              job.data
                .admissionToken,
          });

      target.add(
        job.id
      );

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
        completed:
          true,
      };
    }

    const firstWorker =
      createSearchQueueWorker({
        config,
        operationalState:
          {},
        async processor(job) {
          signalFirstActive();
          await firstRelease;

          return executeAndRelease(
            job,
            processedByFirst
          );
        },
      });
    let secondWorker =
      null;

    try {
      await firstWorker
        .waitUntilReady();
      await admission.admitSearch(
        admissionRequest(
          "4520"
        )
      );
      await admission.admitSearch(
        admissionRequest(
          "4521"
        )
      );
      await firstActive;

      const drainPromise =
        firstWorker.drain({
          timeoutMs:
            5_000,
        });

      await delay(
        100
      );

      secondWorker =
        createSearchQueueWorker({
          config,
          operationalState:
            {},
          processor:
            (job) =>
              executeAndRelease(
                job,
                processedBySecond
              ),
        });

      await secondWorker
        .waitUntilReady();
      releaseFirst();

      const drainResult =
        await drainPromise;

      await waitFor(
        async () => {
          const snapshot =
            await admission
              .getSearchQueueAdmissionSnapshot();

          return processedByFirst.size ===
              1 &&
            processedBySecond.size ===
              1 &&
            snapshot.admitted ===
              0;
        }
      );

      assert.deepEqual(
        {
          drained:
            drainResult.drained,
          forced:
            drainResult.forced,
          activeAtTimeout:
            drainResult
              .activeAtTimeout,
        },
        {
          drained:
            true,
          forced:
            false,
          activeAtTimeout:
            0,
        }
      );
      assert.equal(
        processedByFirst.size,
        1
      );
      assert.equal(
        processedBySecond.size,
        1
      );
      assert.equal(
        firstWorker
          .getWorkerMetricsSnapshot()
          .active,
        0
      );
    }
    finally {
      releaseFirst?.();
      await Promise.allSettled([
        firstWorker.close(),
        secondWorker?.close(),
        admission.close(),
      ]);
      await cleanupNamespace();
    }
  }
);
