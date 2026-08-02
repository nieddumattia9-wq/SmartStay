"use strict";

const crypto =
  require("node:crypto");

const {
  operationalLogger,
} = require(
  "../observability/operationalLogger"
);

const {
  collectOperationalMetrics,
} = require(
  "../observability/operationalReadiness"
);

function createWorkerRuntimeError(
  code,
  message
) {
  const error =
    new Error(message);

  error.name =
    "SearchWorkerRuntimeError";
  error.code =
    code;
  error.status =
    503;
  error.retryable =
    false;

  return error;
}

function createSearchWorkerRuntime({
  config,
  operationalState,
  searchWorker,
  logger =
    operationalLogger,
  metricsCollector =
    collectOperationalMetrics,
  randomUuid =
    crypto.randomUUID,
  now =
    Date.now,
  setIntervalFn =
    setInterval,
  clearIntervalFn =
    clearInterval,
} = {}) {
  const admission =
    operationalState
      ?.searchQueueAdmission;

  if (
    !config?.enabled ||
    !admission?.enabled ||
    typeof admission
      .writeSearchWorkerHeartbeat !==
      "function" ||
    typeof admission
      .removeSearchWorkerHeartbeat !==
      "function" ||
    !searchWorker ||
    typeof searchWorker
      .waitUntilReady !==
      "function" ||
    typeof searchWorker
      .drain !==
      "function" ||
    typeof searchWorker
      .pauseAcquisition !==
      "function" ||
    typeof searchWorker
      .resumeAcquisition !==
      "function"
  ) {
    throw createWorkerRuntimeError(
      "SEARCH_WORKER_RUNTIME_INVALID",
      "Search worker runtime dependencies are incomplete."
    );
  }

  const workerId =
    randomUuid();
  const heartbeatToken =
    randomUuid();
  const startedAt =
    Math.floor(
      Number(now())
    );
  let state =
    "starting";
  let heartbeatTimer =
    null;
  let heartbeatPromise =
    null;
  let startPromise =
    null;
  let stopPromise =
    null;

  function heartbeatRecord(
    nextState
  ) {
    return {
      workerId,
      heartbeatToken,
      state:
        nextState,
      startedAt,
    };
  }

  function getRuntimeSnapshot() {
    return Object.freeze({
      state,
      startedAt,
      heartbeatIntervalMs:
        config
          .workerHeartbeatIntervalMs,
      heartbeatTtlMs:
        config
          .workerHeartbeatTtlMs,
      drainTimeoutMs:
        config
          .workerDrainTimeoutMs,
    });
  }

  function clearHeartbeatTimer() {
    if (!heartbeatTimer) {
      return;
    }

    clearIntervalFn(
      heartbeatTimer
    );
    heartbeatTimer =
      null;
  }

  function scheduleHeartbeat() {
    clearHeartbeatTimer();

    heartbeatTimer =
      setIntervalFn(
        () => {
          void heartbeat();
        },
        config
          .workerHeartbeatIntervalMs
      );

    heartbeatTimer
      ?.unref?.();
  }

  async function removeOwnedHeartbeat(
    signal
  ) {
    try {
      return await admission
        .removeSearchWorkerHeartbeat({
          workerId,
          heartbeatToken,
        });
    }
    catch (error) {
      logger.warn(
        "search.worker.heartbeat-remove-failed",
        {
          signal,
          code:
            error?.code ??
            null,
        }
      );

      return false;
    }
  }

  async function pauseAfterFailure(
    error
  ) {
    state =
      "degraded";

    try {
      await searchWorker
        .pauseAcquisition();
    }
    catch {
      // The heartbeat failure already makes this worker unavailable to producers.
    }

    try {
      await admission
        .writeSearchWorkerHeartbeat(
          heartbeatRecord(
            "degraded"
          )
        );
    }
    catch {
      // Expiry removes an unreachable worker heartbeat automatically.
    }

    logger.error(
      "search.worker.heartbeat-failed",
      {
        code:
          error?.code ??
          "SEARCH_WORKER_HEARTBEAT_FAILED",
      }
    );
  }

  async function emitHeartbeatMetrics() {
    const metrics =
      await metricsCollector({
        operationalState,
      });
    const workerMetrics =
      searchWorker
        .getWorkerMetricsSnapshot();

    logger.info(
      "search.worker.heartbeat",
      {
        state,
        uptimeMs:
          Math.max(
            0,
            Math.floor(
              Number(now())
            ) -
              startedAt
          ),
        queueAdmitted:
          metrics.queue.admitted,
        queueActive:
          metrics.queue.active,
        queueWaiting:
          metrics.queue.waiting,
        queueDelayed:
          metrics.queue.delayed,
        queueFailed:
          metrics.queue.failed,
        queueOldestJobAgeMs:
          metrics.queue
            .oldestJobAgeMs,
        activeSessions:
          metrics.sessions.active,
        providerActive:
          metrics
            .providerCapacity
            .active,
        providerWaiting:
          metrics
            .providerCapacity
            .waiting,
        workerActive:
          workerMetrics.active,
        workerCompletedTotal:
          workerMetrics
            .completedTotal,
        workerFailedTotal:
          workerMetrics.failedTotal,
        workerStalledTotal:
          workerMetrics
            .stalledTotal,
        queueWaitP50Ms:
          workerMetrics
            .queueWaitP50Ms,
        queueWaitP95Ms:
          workerMetrics
            .queueWaitP95Ms,
        queueWaitP99Ms:
          workerMetrics
            .queueWaitP99Ms,
      }
    );

    return metrics;
  }

  async function heartbeat() {
    if (
      state === "stopped" ||
      state === "starting"
    ) {
      return null;
    }

    if (heartbeatPromise) {
      return heartbeatPromise;
    }

    heartbeatPromise =
      (async () => {
        const targetState =
          state ===
            "draining"
            ? "draining"
            : "ready";

        try {
          const written =
            await admission
              .writeSearchWorkerHeartbeat(
                heartbeatRecord(
                  targetState
                )
              );

          if (!written) {
            throw createWorkerRuntimeError(
              "SEARCH_WORKER_HEARTBEAT_STALE",
              "Search worker heartbeat ownership was lost."
            );
          }

          if (
            state ===
              "degraded" &&
            targetState ===
              "ready"
          ) {
            await searchWorker
              .resumeAcquisition();

            logger.info(
              "search.worker.heartbeat-recovered",
              {}
            );
          }

          state =
            targetState;

          return await emitHeartbeatMetrics();
        }
        catch (error) {
          if (
            state !==
              "draining"
          ) {
            await pauseAfterFailure(
              error
            );
          }

          return null;
        }
        finally {
          heartbeatPromise =
            null;
        }
      })();

    return heartbeatPromise;
  }

  async function start() {
    if (startPromise) {
      return startPromise;
    }

    startPromise =
      (async () => {
        let registered =
          false;

        try {
          await searchWorker
            .waitUntilReady();

          registered =
            await admission
              .writeSearchWorkerHeartbeat(
                heartbeatRecord(
                  "ready"
                )
              );

          if (!registered) {
            throw createWorkerRuntimeError(
              "SEARCH_WORKER_HEARTBEAT_STALE",
              "Search worker heartbeat registration was rejected."
            );
          }

          state =
            "ready";
          await emitHeartbeatMetrics();

          scheduleHeartbeat();

          return getRuntimeSnapshot();
        }
        catch (error) {
          if (registered) {
            await removeOwnedHeartbeat(
              "startup-failed"
            );
          }

          state =
            "stopped";

          throw error;
        }
      })();

    return startPromise;
  }

  async function stop(
    signal =
      "shutdown"
  ) {
    if (stopPromise) {
      return stopPromise;
    }

    stopPromise =
      (async () => {
        clearHeartbeatTimer();

        if (heartbeatPromise) {
          await heartbeatPromise;
        }

        state =
          "draining";
        let drainResult;

        try {
          await admission
            .writeSearchWorkerHeartbeat(
              heartbeatRecord(
                "draining"
              )
            );
        }
        catch (error) {
          logger.warn(
            "search.worker.drain-heartbeat-failed",
            {
              signal,
              code:
                error?.code ??
                null,
            }
          );
        }

        scheduleHeartbeat();

        try {
          drainResult =
            await searchWorker.drain({
              timeoutMs:
                config
                  .workerDrainTimeoutMs,
            });
        }
        finally {
          clearHeartbeatTimer();

          if (heartbeatPromise) {
            await heartbeatPromise;
          }

          await removeOwnedHeartbeat(
            signal
          );

          state =
            "stopped";
        }

        return Object.freeze({
          ...drainResult,
          state,
        });
      })();

    return stopPromise;
  }

  return Object.freeze({
    start,
    heartbeat,
    stop,
    getRuntimeSnapshot,
  });
}

module.exports = {
  createSearchWorkerRuntime,
};
