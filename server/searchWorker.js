"use strict";

const path =
  require("node:path");

require("dotenv").config({
  path:
    path.join(
      __dirname,
      ".env"
    ),
  override:
    false,
});

const {
  configureOperationalLogger,
} = require(
  "./observability/operationalLogger"
);

const {
  createSecurityLogger,
} = require(
  "./observability/securityLogger"
);

const {
  assertDistributedWorkerEnvironment,
} = require(
  "./config/releaseEnvironment"
);

const {
  closeOperationalState,
  getOperationalState,
} = require(
  "./state/operationalState"
);

const {
  getSearchQueueConfig,
} = require(
  "./queue/searchQueueConfig"
);

const {
  createSearchQueueWorker,
} = require(
  "./queue/searchQueueWorker"
);

const {
  createSearchWorkerRuntime,
} = require(
  "./queue/searchWorkerRuntime"
);

async function startSearchWorker({
  environment =
    process.env,
  processObject =
    process,
} = {}) {
  assertDistributedWorkerEnvironment({
    environment,
  });

  const config =
    getSearchQueueConfig(
      environment
    );
  const logger =
    createSecurityLogger({
      environment,
      includeErrorStack:
        false,
    });

  configureOperationalLogger({
    logger,
  });

  const operationalState =
    getOperationalState();
  const searchWorker =
    createSearchQueueWorker({
      config,
      operationalState,
    });
  const workerRuntime =
    createSearchWorkerRuntime({
      config,
      operationalState,
      searchWorker,
      logger,
    });
  let stopping =
    false;
  let stopPromise =
    null;

  async function stop(signal) {
    if (stopping) {
      return stopPromise;
    }

    stopping =
      true;

    logger.info(
      "search.worker.stopping",
      {
        signal,
      }
    );

    stopPromise =
      (async () => {
        try {
          const drainResult =
            await workerRuntime
              .stop(signal);

          await closeOperationalState();

          logger.info(
            "search.worker.stopped",
            {
              signal,
              drained:
                drainResult.drained,
              forced:
                drainResult.forced,
              activeAtTimeout:
                drainResult
                  .activeAtTimeout,
              drainDurationMs:
                drainResult.durationMs,
            }
          );

          return drainResult;
        }
        catch (error) {
          processObject.exitCode =
            1;

          try {
            await closeOperationalState();
          }
          catch {
            // The original stop failure remains authoritative.
          }

          logger.error(
            "search.worker.stop-failed",
            {
              signal,
              code:
                error?.code ??
                null,
            }
          );

          throw error;
        }
      })();

    return stopPromise;
  }

  processObject.once(
    "SIGINT",
    () => {
      void stop("SIGINT")
        .catch(() => {});
    }
  );

  processObject.once(
    "SIGTERM",
    () => {
      void stop("SIGTERM")
        .catch(() => {});
    }
  );

  try {
    await workerRuntime.start();
  }
  catch (error) {
    try {
      await searchWorker.close();
      await closeOperationalState();
    }
    catch {
      // Startup reports the first authoritative failure.
    }

    throw error;
  }

  logger.info(
    "search.worker.started",
    {
      queueName:
        config.queueName,
      concurrency:
        config.workerConcurrency,
      heartbeatIntervalMs:
        config
          .workerHeartbeatIntervalMs,
      heartbeatTtlMs:
        config
          .workerHeartbeatTtlMs,
      drainTimeoutMs:
        config
          .workerDrainTimeoutMs,
    }
  );

  return Object.freeze({
    searchWorker,
    workerRuntime,
    stop,
  });
}

if (
  require.main ===
  module
) {
  const bootstrapLogger =
    createSecurityLogger({
      environment:
        process.env,
      includeErrorStack:
        false,
    });

  startSearchWorker()
    .catch((error) => {
      process.exitCode = 1;

      bootstrapLogger.error(
        "search.worker.start-failed",
        {
          code:
            error?.code ??
            "SEARCH_WORKER_START_FAILED",
        }
      );
    });
}

module.exports = {
  startSearchWorker,
};
