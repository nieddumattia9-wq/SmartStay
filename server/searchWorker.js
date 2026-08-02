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

async function startSearchWorker({
  environment =
    process.env,
  processObject =
    process,
} = {}) {
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
  let stopping =
    false;

  async function stop(signal) {
    if (stopping) {
      return;
    }

    stopping =
      true;

    logger.info(
      "search.worker.stopping",
      {
        signal,
      }
    );

    try {
      await searchWorker.close();
      await closeOperationalState();

      logger.info(
        "search.worker.stopped",
        {
          signal,
        }
      );
    }
    catch (error) {
      processObject.exitCode =
        1;

      logger.error(
        "search.worker.stop-failed",
        {
          signal,
          code:
            error?.code ??
            null,
        }
      );
    }
  }

  processObject.once(
    "SIGINT",
    () => {
      void stop("SIGINT");
    }
  );

  processObject.once(
    "SIGTERM",
    () => {
      void stop("SIGTERM");
    }
  );

  await searchWorker
    .waitUntilReady();

  logger.info(
    "search.worker.started",
    {
      queueName:
        config.queueName,
      concurrency:
        config.workerConcurrency,
    }
  );

  return Object.freeze({
    searchWorker,
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
