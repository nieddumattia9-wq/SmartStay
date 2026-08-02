import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const {
  SEARCH_QUEUE_FEATURE_FLAG,
  SEARCH_QUEUE_JOB_NAMES,
  SEARCH_QUEUE_NAME,
  SEARCH_QUEUE_PRIORITIES,
  getSearchQueueConfig,
} = require(
  "../../server/queue/searchQueueConfig.js"
);

const {
  createSearchJobId,
} = require(
  "../../server/queue/searchQueueAdmission.js"
);

const {
  createQueuedSearchProcessor,
  validateQueuedSearchJob,
} = require(
  "../../server/queue/searchQueueWorker.js"
);

const searchSession = require(
  "../../server/storage/searchSession.js"
);

const root = process.cwd();
const hmacSecret =
  "smartstay-4c4-search-queue-contract-secret";

function enabledEnvironment(
  overrides = {}
) {
  return {
    [SEARCH_QUEUE_FEATURE_FLAG]:
      "true",
    SMARTSTAY_QUEUE_REDIS_URL:
      "redis://127.0.0.1:6379/0",
    SMARTSTAY_QUEUE_ENVIRONMENT:
      "c4-contract",
    SMARTSTAY_QUEUE_KEY_SECRET:
      hmacSecret,
    ...overrides,
  };
}

function createValidJob(
  overrides = {}
) {
  return {
    id:
      `search-${"a".repeat(64)}`,
    name:
      SEARCH_QUEUE_JOB_NAMES
        .INITIAL_SEARCH,
    data: {
      schemaVersion:
        1,
      searchId:
        "ss2.123e4567-e89b-42d3-a456-426614174000",
      admissionToken:
        "123e4567-e89b-42d3-a456-426614174001",
      payloadFingerprint:
        "b".repeat(64),
      payload: {
        destinationId:
          "rome",
      },
    },
    opts: {
      attempts:
        3,
    },
    attemptsMade:
      0,
    ...overrides,
  };
}

test(
  "4C4 keeps asynchronous search disabled by default and validates every live queue prerequisite",
  () => {
    const disabled =
      getSearchQueueConfig({});

    assert.equal(
      disabled.enabled,
      false
    );
    assert.equal(
      disabled.queueName,
      SEARCH_QUEUE_NAME
    );

    for (const environment of [
      {
        [SEARCH_QUEUE_FEATURE_FLAG]:
          "sometimes",
      },
      enabledEnvironment({
        SMARTSTAY_QUEUE_REDIS_URL:
          "https://example.invalid",
      }),
      enabledEnvironment({
        SMARTSTAY_QUEUE_ENVIRONMENT:
          "INVALID ENVIRONMENT",
      }),
      enabledEnvironment({
        SMARTSTAY_QUEUE_KEY_SECRET:
          "too-short",
      }),
      enabledEnvironment({
        SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED:
          "1001",
      }),
    ]) {
      assert.throws(
        () =>
          getSearchQueueConfig(
            environment
          ),
        (error) =>
          error?.code ===
          "SEARCH_QUEUE_CONFIGURATION_INVALID"
      );
    }

    const enabled =
      getSearchQueueConfig(
        enabledEnvironment()
      );

    assert.equal(
      enabled.enabled,
      true
    );
    assert.equal(
      enabled.maxAdmittedJobs,
      1_000
    );
    assert.equal(
      enabled.prefix,
      "ss:v1:c4-contract:bullmq"
    );
  }
);

test(
  "all 4C4 job classes have explicit non-zero priority and initial-search identity is HMAC-only",
  () => {
    assert.deepEqual(
      SEARCH_QUEUE_PRIORITIES,
      {
        BOOKING_RECHECK:
          1,
        INITIAL_SEARCH:
          5,
        CONTINUATION:
          10,
      }
    );

    for (
      const priority of
      Object.values(
        SEARCH_QUEUE_PRIORITIES
      )
    ) {
      assert.ok(priority > 0);
    }

    const rawKey =
      "private-idempotency-key-0001";
    const first =
      createSearchJobId({
        idempotencyKey:
          rawKey,
        hmacSecret,
      });
    const replay =
      createSearchJobId({
        idempotencyKey:
          rawKey,
        hmacSecret,
      });

    assert.equal(first, replay);
    assert.match(
      first,
      /^search-[a-f0-9]{64}$/
    );
    assert.equal(
      first.includes(rawKey),
      false
    );
  }
);

test(
  "queued jobs reject malformed identity, oversized payloads and implicit job classes",
  () => {
    const config = {
      jobPayloadMaxBytes:
        4_096,
    };
    const valid =
      createValidJob();

    assert.deepEqual(
      validateQueuedSearchJob(
        valid,
        config
      ),
      {
        jobId:
          valid.id,
        searchId:
          valid.data.searchId,
        admissionToken:
          valid.data
            .admissionToken,
        payloadFingerprint:
          valid.data
            .payloadFingerprint,
        payload: {
          destinationId:
            "rome",
        },
      }
    );

    for (const invalid of [
      createValidJob({
        id:
          "raw-idempotency-key",
      }),
      createValidJob({
        name:
          "continuation",
      }),
      createValidJob({
        data: {
          ...valid.data,
          admissionToken:
            "not-a-token",
        },
      }),
      createValidJob({
        data: {
          ...valid.data,
          payload: {
            value:
              "x".repeat(5_000),
          },
        },
      }),
    ]) {
      assert.throws(
        () =>
          validateQueuedSearchJob(
            invalid,
            config
          ),
        (error) =>
          error?.code ===
          "SEARCH_QUEUE_JOB_INVALID"
      );
    }
  }
);

test(
  "initial search session writes are fenced so a stalled attempt cannot overwrite its successor",
  async () => {
    let searchId = null;

    try {
      const session =
        searchSession
          .saveSearchSession({
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
      searchId =
        session.searchId;
      const first = {
        executionToken:
          "123e4567-e89b-42d3-a456-426614174010",
        fencingNumber:
          1,
      };
      const second = {
        executionToken:
          "123e4567-e89b-42d3-a456-426614174011",
        fencingNumber:
          2,
      };

      assert.equal(
        searchSession
          .claimInitialSearchExecution(
            session.searchId,
            first
          ).claimed,
        true
      );
      assert.equal(
        searchSession
          .claimInitialSearchExecution(
            session.searchId,
            second
          ).claimed,
        true
      );

      assert.throws(
        () =>
          searchSession
            .updateInitialSearchExecution(
              session.searchId,
              {
                initialSearchStage:
                  "complete",
                status:
                  "Completed",
              },
              first
            ),
        (error) =>
          error?.code ===
          "SEARCH_INITIAL_EXECUTION_STALE"
      );

      const completed =
        searchSession
          .updateInitialSearchExecution(
            session.searchId,
            {
              initialSearchStage:
                "complete",
              status:
                "Completed",
            },
            second
          );

      assert.equal(
        completed.status,
        "Completed"
      );
      assert.equal(
        completed
          .initialSearchExecutionToken,
        null
      );
    }
    finally {
      if (searchId) {
        searchSession
          .clearSearchSession(
            searchId
          );
      }
    }
  }
);

test(
  "worker retries renew the admission with the current fence and terminal attempts release that exact fence",
  async () => {
    const renewals = [];
    const releases = [];
    const retries = [];
    const admission = {
      enabled:
        true,
      async beginSearchExecution() {
        return {
          searchId:
            createValidJob()
              .data.searchId,
          fencingNumber:
            7,
        };
      },
      async renewSearchAdmission(
        value
      ) {
        renewals.push(value);
        return true;
      },
      async releaseSearchAdmission(
        value
      ) {
        releases.push(value);
        return true;
      },
    };
    const config = {
      jobPayloadMaxBytes:
        4_096,
      jobBackoffMs:
        500,
      admissionLeaseMs:
        600,
    };
    const retryProcessor =
      createQueuedSearchProcessor({
        config,
        operationalState: {
          searchQueueAdmission:
            admission,
        },
        async executeSearch() {
          const error =
            new Error(
              "private provider detail"
            );
          error.code =
            "PROVIDER_TIMEOUT";
          error.retryable =
            true;
          error.retryAfterMs =
            750;
          throw error;
        },
        async markRetry(value) {
          retries.push(value);
        },
        async markFailed() {
          throw new Error(
            "unexpected terminal failure"
          );
        },
      });

    await assert.rejects(
      () =>
        retryProcessor(
          createValidJob()
        ),
      (error) =>
        error?.name ===
          "QueuedSearchRetryError" &&
        error?.message ===
          "Queued accommodation search will be retried."
    );

    assert.equal(
      retries.length,
      1
    );
    assert.equal(
      renewals.length,
      1
    );
    assert.equal(
      renewals[0]
        .fencingNumber,
      7
    );
    assert.equal(
      releases.length,
      0
    );

    const terminalProcessor =
      createQueuedSearchProcessor({
        config,
        operationalState: {
          searchQueueAdmission:
            admission,
        },
        async executeSearch({
          assertInitialSearchOwnership,
        }) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                550
              )
          );
          await assertInitialSearchOwnership();

          return {
            status:
              "Completed",
          };
        },
        async markRetry() {},
        async markFailed() {},
      });

    await terminalProcessor(
      createValidJob()
    );

    assert.equal(
      releases.length,
      1
    );
    assert.ok(
      renewals.length >= 4,
      `expected retry renewal, heartbeat renewals and final ownership assertion; observed ${renewals.length}`
    );
    assert.equal(
      releases[0]
        .fencingNumber,
      7
    );
  }
);

test(
  "queue dependencies, 202 admission and worker entrypoint stay outside Engine V2 and provider modules",
  () => {
    const queueFiles = [
      "server/queue/searchQueueAdmission.js",
      "server/queue/searchQueueConfig.js",
      "server/queue/searchQueueWorker.js",
      "server/searchWorker.js",
    ];
    const routeSource =
      fs.readFileSync(
        path.join(
          root,
          "server/routes/search.js"
        ),
        "utf8"
      );
    const workerEntrypointSource =
      fs.readFileSync(
        path.join(
          root,
          "server/searchWorker.js"
        ),
        "utf8"
      );

    assert.match(
      routeSource,
      /searchQueueAdmission\.enabled/
    );
    assert.match(
      routeSource,
      /\? 202\s*: 200/
    );
    assert.doesNotMatch(
      workerEntrypointSource,
      /console\.(?:debug|dir|error|info|log|warn)\s*\(/
    );
    assert.match(
      workerEntrypointSource,
      /search\.worker\.start-failed/
    );

    for (const relativePath of queueFiles) {
      assert.equal(
        fs.existsSync(
          path.join(
            root,
            relativePath
          )
        ),
        true,
        relativePath
      );
    }

    const engineFiles = [];

    for (const directory of [
      "src/engine-v2",
      "server/providers",
    ]) {
      const absolute =
        path.join(root, directory);

      if (!fs.existsSync(absolute)) {
        continue;
      }

      const pending = [absolute];

      while (pending.length > 0) {
        const current = pending.pop();

        for (
          const entry of
          fs.readdirSync(
            current,
            {
              withFileTypes:
                true,
            }
          )
        ) {
          if (
            entry.name ===
              "node_modules"
          ) {
            continue;
          }

          const entryPath =
            path.join(
              current,
              entry.name
            );

          if (entry.isDirectory()) {
            pending.push(entryPath);
          }
          else if (
            /\.[cm]?[jt]sx?$/.test(
              entry.name
            )
          ) {
            engineFiles.push(
              entryPath
            );
          }
        }
      }
    }

    for (const filePath of engineFiles) {
      const source =
        fs.readFileSync(
          filePath,
          "utf8"
        );

      assert.doesNotMatch(
        source,
        /\b(?:bullmq|ioredis)\b/i,
        path.relative(
          root,
          filePath
        )
      );
    }
  }
);
