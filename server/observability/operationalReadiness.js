"use strict";

const DEFAULT_READINESS_DEADLINE_MS =
  2_000;

function normalizeCount(value) {
  const number =
    Number(value);

  return Number.isFinite(number) &&
    number >= 0
    ? Math.floor(number)
    : 0;
}

function disabledQueueSnapshot() {
  return Object.freeze({
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
    delayed:
      0,
    failed:
      0,
    oldestJobAgeMs:
      0,
    maximumAdmitted:
      0,
    schemaCompatible:
      true,
    expectedSchemaVersion:
      "1",
    observedSchemaVersion:
      "1",
    readyWorkers:
      0,
    drainingWorkers:
      0,
    degradedWorkers:
      0,
    lastReadyWorkerHeartbeatAgeMs:
      null,
  });
}

async function collectOperationalMetrics({
  operationalState,
} = {}) {
  if (
    !operationalState ||
    typeof operationalState !==
      "object"
  ) {
    throw new TypeError(
      "Operational metrics require operational state."
    );
  }

  const sessionCountPromise =
    typeof operationalState
      .searchSessionStore
      ?.getSearchSessionCount ===
      "function"
      ? Promise.resolve(
          operationalState
            .searchSessionStore
            .getSearchSessionCount()
        )
      : Promise.resolve(0);
  const providerCapacityPromise =
    typeof operationalState
      .providerCapacityCoordinator
      ?.getProviderOperationCapacitySnapshot ===
      "function"
      ? Promise.resolve(
          operationalState
            .providerCapacityCoordinator
            .getProviderOperationCapacitySnapshot()
        )
      : Promise.resolve({});
  const queuePromise =
    typeof operationalState
      .searchQueueAdmission
      ?.getSearchQueueAdmissionSnapshot ===
      "function"
      ? Promise.resolve(
          operationalState
            .searchQueueAdmission
            .getSearchQueueAdmissionSnapshot()
        )
      : Promise.resolve(
          disabledQueueSnapshot()
        );
  const [
    sessionCount,
    providerCapacity,
    queue,
  ] = await Promise.all([
    sessionCountPromise,
    providerCapacityPromise,
    queuePromise,
  ]);

  return Object.freeze({
    schemaVersion:
      1,
    sessions:
      Object.freeze({
        active:
          normalizeCount(
            sessionCount
          ),
      }),
    providerCapacity:
      Object.freeze({
        active:
          normalizeCount(
            providerCapacity
              ?.active
          ),
        waiting:
          normalizeCount(
            providerCapacity
              ?.queued
          ),
        maximumActive:
          normalizeCount(
            providerCapacity
              ?.maximumActive
          ),
        maximumWaiting:
          normalizeCount(
            providerCapacity
              ?.maximumQueued
          ),
      }),
    queue:
      Object.freeze({
        enabled:
          queue?.enabled ===
          true,
        mode:
          typeof queue?.mode ===
            "string"
            ? queue.mode
            : "unknown",
        admitted:
          normalizeCount(
            queue?.admitted
          ),
        active:
          normalizeCount(
            queue?.active
          ),
        waiting:
          normalizeCount(
            queue?.waiting
          ),
        delayed:
          normalizeCount(
            queue?.delayed
          ),
        failed:
          normalizeCount(
            queue?.failed
          ),
        oldestJobAgeMs:
          normalizeCount(
            queue
              ?.oldestJobAgeMs
          ),
        maximumAdmitted:
          normalizeCount(
            queue
              ?.maximumAdmitted
          ),
        schemaCompatible:
          queue
            ?.schemaCompatible !==
          false,
        expectedSchemaVersion:
          String(
            queue
              ?.expectedSchemaVersion ??
            "1"
          ),
        observedSchemaVersion:
          queue
            ?.observedSchemaVersion ??
          null,
        readyWorkers:
          normalizeCount(
            queue?.readyWorkers
          ),
        drainingWorkers:
          normalizeCount(
            queue
              ?.drainingWorkers
          ),
        degradedWorkers:
          normalizeCount(
            queue
              ?.degradedWorkers
          ),
        lastReadyWorkerHeartbeatAgeMs:
          queue
            ?.lastReadyWorkerHeartbeatAgeMs ===
              null ||
          queue
            ?.lastReadyWorkerHeartbeatAgeMs ===
              undefined
            ? null
            : normalizeCount(
                queue
                  .lastReadyWorkerHeartbeatAgeMs
              ),
      }),
  });
}

function createReadinessTimeoutError() {
  const error =
    new Error(
      "Operational readiness exceeded its deadline."
    );

  error.code =
    "READINESS_DEADLINE_EXCEEDED";

  return error;
}

async function withDeadline(
  operation,
  deadlineMs
) {
  let timeoutHandle;

  const timeout =
    new Promise(
      (_, reject) => {
        timeoutHandle =
          setTimeout(
            () => reject(
              createReadinessTimeoutError()
            ),
            deadlineMs
          );

        timeoutHandle.unref?.();
      }
    );

  try {
    return await Promise.race([
      Promise.resolve()
        .then(operation),
      timeout,
    ]);
  }
  finally {
    clearTimeout(
      timeoutHandle
    );
  }
}

function normalizeReadinessCode(error) {
  const candidate =
    typeof error?.code ===
      "string"
      ? error.code.trim()
      : "";

  return /^[A-Z0-9_]{3,80}$/
    .test(candidate)
    ? candidate
    : "OPERATIONAL_READINESS_FAILED";
}

function createOperationalReadinessProbe({
  operationalState,
  deadlineMs =
    DEFAULT_READINESS_DEADLINE_MS,
  collectMetrics =
    collectOperationalMetrics,
} = {}) {
  if (
    !operationalState ||
    typeof operationalState !==
      "object"
  ) {
    throw new TypeError(
      "Operational readiness requires operational state."
    );
  }

  const safeDeadlineMs =
    Number.isSafeInteger(
      Number(deadlineMs)
    ) &&
    Number(deadlineMs) >= 100 &&
    Number(deadlineMs) <= 30_000
      ? Number(deadlineMs)
      : DEFAULT_READINESS_DEADLINE_MS;

  async function inspect() {
    const stateReadiness =
      typeof operationalState
        .getReadinessSnapshot ===
        "function"
        ? await operationalState
            .getReadinessSnapshot()
        : Object.freeze({
            ready:
              operationalState
                .distributed !==
              true,
            mode:
              operationalState
                .mode ??
              "unknown",
            expectedSchemaVersion:
              "v1",
            observedSchemaVersion:
              operationalState
                .distributed ===
                true
                ? null
                : "v1",
          });
    const metrics =
      await collectMetrics({
        operationalState,
      });
    const queueReady =
      metrics.queue.enabled !==
        true ||
      (
        metrics.queue
          .schemaCompatible ===
          true &&
        metrics.queue
          .readyWorkers > 0
      );
    const ready =
      stateReadiness?.ready ===
        true &&
      queueReady;

    return Object.freeze({
      ready,
      code:
        ready
          ? "READY"
          : stateReadiness
              ?.ready !== true
            ? "OPERATIONAL_STATE_NOT_READY"
            : metrics.queue
                  .schemaCompatible !==
                true
              ? "SEARCH_QUEUE_SCHEMA_INCOMPATIBLE"
              : "SEARCH_WORKER_HEARTBEAT_MISSING",
      state:
        Object.freeze({
          mode:
            stateReadiness?.mode ??
            operationalState.mode ??
            "unknown",
          expectedSchemaVersion:
            stateReadiness
              ?.expectedSchemaVersion ??
            null,
          observedSchemaVersion:
            stateReadiness
              ?.observedSchemaVersion ??
            null,
        }),
      metrics,
    });
  }

  async function check() {
    try {
      return await withDeadline(
        inspect,
        safeDeadlineMs
      );
    }
    catch (error) {
      return Object.freeze({
        ready:
          false,
        code:
          normalizeReadinessCode(
            error
          ),
        state:
          null,
        metrics:
          null,
      });
    }
  }

  return Object.freeze({
    check,
  });
}

module.exports = {
  DEFAULT_READINESS_DEADLINE_MS,
  collectOperationalMetrics,
  createOperationalReadinessProbe,
};
