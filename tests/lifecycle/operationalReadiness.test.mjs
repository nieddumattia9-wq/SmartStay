import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(import.meta.url);

const {
  DEFAULT_WORKER_DRAIN_TIMEOUT_MS,
  DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS,
  DEFAULT_WORKER_HEARTBEAT_TTL_MS,
  SEARCH_QUEUE_SCHEMA_VERSION,
  getSearchQueueConfig,
} = require(
  "../../server/queue/searchQueueConfig.js"
);

const {
  collectOperationalMetrics,
  createOperationalReadinessProbe,
} = require(
  "../../server/observability/operationalReadiness.js"
);

const {
  createSearchWorkerRuntime,
} = require(
  "../../server/queue/searchWorkerRuntime.js"
);

const workerId =
  "123e4567-e89b-42d3-a456-426614174101";
const heartbeatToken =
  "123e4567-e89b-42d3-a456-426614174102";

function enabledEnvironment(
  overrides =
    {}
) {
  return {
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED:
      "true",
    SMARTSTAY_QUEUE_REDIS_URL:
      "redis://127.0.0.1:6379/0",
    SMARTSTAY_QUEUE_ENVIRONMENT:
      "c5-contract",
    SMARTSTAY_QUEUE_KEY_SECRET:
      "smartstay-4c5-contract-secret-at-least-32-bytes",
    ...overrides,
  };
}

function queueSnapshot(
  overrides =
    {}
) {
  return {
    enabled:
      true,
    mode:
      "bullmq-distributed",
    admitted:
      4,
    active:
      2,
    waiting:
      1,
    delayed:
      1,
    failed:
      3,
    oldestJobAgeMs:
      750,
    maximumAdmitted:
      100,
    schemaCompatible:
      true,
    expectedSchemaVersion:
      "1",
    observedSchemaVersion:
      "1",
    readyWorkers:
      1,
    drainingWorkers:
      0,
    degradedWorkers:
      0,
    lastReadyWorkerHeartbeatAgeMs:
      50,
    ...overrides,
  };
}

function operationalState(
  {
    stateReady =
      true,
    queue =
      queueSnapshot(),
  } =
    {}
) {
  return {
    mode:
      "valkey-distributed",
    distributed:
      true,
    async getReadinessSnapshot() {
      return {
        ready:
          stateReady,
        mode:
          "valkey-distributed",
        expectedSchemaVersion:
          "v1",
        observedSchemaVersion:
          stateReady
            ? "v1"
            : null,
      };
    },
    searchSessionStore: {
      async getSearchSessionCount() {
        return 4;
      },
    },
    providerCapacityCoordinator: {
      async getProviderOperationCapacitySnapshot() {
        return {
          active:
            3,
          queued:
            2,
          maximumActive:
            8,
          maximumQueued:
            64,
          activeByProvider: {
            "private-provider-id":
              3,
          },
        };
      },
    },
    searchQueueAdmission: {
      async getSearchQueueAdmissionSnapshot() {
        return {
          ...queue,
          rawJobIds: [
            "private-job-id",
          ],
        };
      },
    },
  };
}

test(
  "4C5 queue runtime settings are bounded and remain disabled by default",
  () => {
    const disabled =
      getSearchQueueConfig({});
    const enabled =
      getSearchQueueConfig(
        enabledEnvironment()
      );

    assert.equal(
      disabled.enabled,
      false
    );
    assert.equal(
      disabled.schemaVersion,
      SEARCH_QUEUE_SCHEMA_VERSION
    );
    assert.equal(
      enabled.workerHeartbeatIntervalMs,
      DEFAULT_WORKER_HEARTBEAT_INTERVAL_MS
    );
    assert.equal(
      enabled.workerHeartbeatTtlMs,
      DEFAULT_WORKER_HEARTBEAT_TTL_MS
    );
    assert.equal(
      enabled.workerDrainTimeoutMs,
      DEFAULT_WORKER_DRAIN_TIMEOUT_MS
    );
    assert.equal(
      enabled.runtimePrefix,
      "ss:v1:c5-contract:search-queue-runtime"
    );

    assert.throws(
      () =>
        getSearchQueueConfig(
          enabledEnvironment({
            SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS:
              "1000",
            SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS:
              "1500",
          })
        ),
      (error) =>
        error?.code ===
          "SEARCH_QUEUE_CONFIGURATION_INVALID"
    );
  }
);

test(
  "operational metrics expose aggregate counts without provider, job or payload identity",
  async () => {
    const metrics =
      await collectOperationalMetrics({
        operationalState:
          operationalState(),
      });

    assert.deepEqual(
      metrics,
      {
        schemaVersion:
          1,
        sessions: {
          active:
            4,
        },
        providerCapacity: {
          active:
            3,
          waiting:
            2,
          maximumActive:
            8,
          maximumWaiting:
            64,
        },
        queue: {
          enabled:
            true,
          mode:
            "bullmq-distributed",
          admitted:
            4,
          active:
            2,
          waiting:
            1,
          delayed:
            1,
          failed:
            3,
          oldestJobAgeMs:
            750,
          maximumAdmitted:
            100,
          schemaCompatible:
            true,
          expectedSchemaVersion:
            "1",
          observedSchemaVersion:
            "1",
          readyWorkers:
            1,
          drainingWorkers:
            0,
          degradedWorkers:
            0,
          lastReadyWorkerHeartbeatAgeMs:
            50,
        },
      }
    );

    const serialized =
      JSON.stringify(
        metrics
      );

    assert.equal(
      serialized.includes(
        "private-provider-id"
      ),
      false
    );
    assert.equal(
      serialized.includes(
        "private-job-id"
      ),
      false
    );
  }
);

test(
  "dependency readiness requires state schema, queue schema and a current ready worker",
  async () => {
    const cases = [
      {
        state:
          operationalState(),
        ready:
          true,
        code:
          "READY",
      },
      {
        state:
          operationalState({
            queue:
              queueSnapshot({
                readyWorkers:
                  0,
              }),
          }),
        ready:
          false,
        code:
          "SEARCH_WORKER_HEARTBEAT_MISSING",
      },
      {
        state:
          operationalState({
            queue:
              queueSnapshot({
                schemaCompatible:
                  false,
                observedSchemaVersion:
                  "2",
              }),
          }),
        ready:
          false,
        code:
          "SEARCH_QUEUE_SCHEMA_INCOMPATIBLE",
      },
      {
        state:
          operationalState({
            stateReady:
              false,
          }),
        ready:
          false,
        code:
          "OPERATIONAL_STATE_NOT_READY",
      },
    ];

    for (const value of cases) {
      const result =
        await createOperationalReadinessProbe({
          operationalState:
            value.state,
        }).check();

      assert.equal(
        result.ready,
        value.ready,
        value.code
      );
      assert.equal(
        result.code,
        value.code
      );
    }
  }
);

test(
  "worker heartbeat recovers from degradation and graceful stop removes its owned record",
  async () => {
    const writes = [];
    const removals = [];
    const logs = [];
    let failWrites =
      false;
    let pauses =
      0;
    let resumes =
      0;
    let drains =
      0;
    let cleared =
      0;
    const identities = [
      workerId,
      heartbeatToken,
    ];
    const state = {
      searchQueueAdmission: {
        enabled:
          true,
        async writeSearchWorkerHeartbeat(
          value
        ) {
          writes.push(value);

          if (failWrites) {
            const error =
              new Error(
                "private valkey detail"
              );
            error.code =
              "VALKEY_UNAVAILABLE";
            throw error;
          }

          return true;
        },
        async removeSearchWorkerHeartbeat(
          value
        ) {
          removals.push(value);
          return true;
        },
      },
    };
    const searchWorker = {
      async waitUntilReady() {},
      async pauseAcquisition() {
        pauses +=
          1;
      },
      async resumeAcquisition() {
        resumes +=
          1;
      },
      async drain(
        options
      ) {
        drains +=
          1;
        assert.equal(
          options.timeoutMs,
          5_000
        );

        return {
          drained:
            true,
          forced:
            false,
          activeAtTimeout:
            0,
          durationMs:
            12,
        };
      },
      getWorkerMetricsSnapshot() {
        return {
          active:
            0,
          completedTotal:
            2,
          failedTotal:
            1,
          stalledTotal:
            0,
          queueWaitP50Ms:
            10,
          queueWaitP95Ms:
            20,
          queueWaitP99Ms:
            30,
        };
      },
    };
    const logger = {
      info(
        event,
        details
      ) {
        logs.push({
          level:
            "info",
          event,
          details,
        });
      },
      warn(
        event,
        details
      ) {
        logs.push({
          level:
            "warn",
          event,
          details,
        });
      },
      error(
        event,
        details
      ) {
        logs.push({
          level:
            "error",
          event,
          details,
        });
      },
    };
    const runtime =
      createSearchWorkerRuntime({
        config: {
          enabled:
            true,
          workerHeartbeatIntervalMs:
            1_000,
          workerHeartbeatTtlMs:
            4_000,
          workerDrainTimeoutMs:
            5_000,
        },
        operationalState:
          state,
        searchWorker,
        logger,
        metricsCollector:
          async () => ({
            queue:
              queueSnapshot(),
            sessions: {
              active:
                4,
            },
            providerCapacity: {
              active:
                3,
              waiting:
                2,
            },
          }),
        randomUuid:
          () =>
            identities.shift(),
        now:
          () =>
            1_800_000_000_000,
        setIntervalFn:
          () => ({
            unref() {},
          }),
        clearIntervalFn:
          () => {
            cleared +=
              1;
          },
      });

    await runtime.start();
    assert.equal(
      runtime
        .getRuntimeSnapshot()
        .state,
      "ready"
    );

    failWrites =
      true;
    await runtime.heartbeat();
    assert.equal(
      runtime
        .getRuntimeSnapshot()
        .state,
      "degraded"
    );
    assert.equal(
      pauses,
      1
    );

    failWrites =
      false;
    await runtime.heartbeat();
    assert.equal(
      runtime
        .getRuntimeSnapshot()
        .state,
      "ready"
    );
    assert.equal(
      resumes,
      1
    );

    const stopped =
      await runtime.stop(
        "SIGTERM"
      );

    assert.equal(
      stopped.drained,
      true
    );
    assert.equal(
      drains,
      1
    );
    assert.equal(
      cleared,
      2
    );
    assert.equal(
      removals.length,
      1
    );
    assert.deepEqual(
      writes.map(
        (value) =>
          value.state
      ),
      [
        "ready",
        "ready",
        "degraded",
        "ready",
        "draining",
      ]
    );

    const serializedLogs =
      JSON.stringify(
        logs
      );

    assert.equal(
      serializedLogs.includes(
        workerId
      ),
      false
    );
    assert.equal(
      serializedLogs.includes(
        heartbeatToken
      ),
      false
    );
    assert.equal(
      serializedLogs.includes(
        "private valkey detail"
      ),
      false
    );
  }
);

test(
  "failed worker startup removes a registered heartbeat before returning failure",
  async () => {
    const removals = [];
    const identities = [
      workerId,
      heartbeatToken,
    ];
    const runtime =
      createSearchWorkerRuntime({
        config: {
          enabled:
            true,
          workerHeartbeatIntervalMs:
            1_000,
          workerHeartbeatTtlMs:
            4_000,
          workerDrainTimeoutMs:
            5_000,
        },
        operationalState: {
          searchQueueAdmission: {
            enabled:
              true,
            async writeSearchWorkerHeartbeat() {
              return true;
            },
            async removeSearchWorkerHeartbeat(
              value
            ) {
              removals.push(value);
              return true;
            },
          },
        },
        searchWorker: {
          async waitUntilReady() {},
          async pauseAcquisition() {},
          async resumeAcquisition() {},
          async drain() {
            return {};
          },
          getWorkerMetricsSnapshot() {
            return {};
          },
        },
        logger: {
          info() {},
          warn() {},
          error() {},
        },
        async metricsCollector() {
          const error =
            new Error(
              "private metrics failure"
            );
          error.code =
            "METRICS_UNAVAILABLE";
          throw error;
        },
        randomUuid:
          () =>
            identities.shift(),
        now:
          () =>
            1_800_000_000_000,
      });

    await assert.rejects(
      runtime.start(),
      (error) =>
        error?.code ===
          "METRICS_UNAVAILABLE"
    );
    assert.equal(
      removals.length,
      1
    );
    assert.equal(
      runtime
        .getRuntimeSnapshot()
        .state,
      "stopped"
    );
  }
);
