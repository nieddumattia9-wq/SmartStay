"use strict";

const path =
  require(
    "node:path"
  );

require(
  "dotenv"
).config({
  path:
    path.join(
      __dirname,
      ".env"
    ),

  override:
    false,
});

const {
  createRuntimeSecurityConfig,
} =
  require(
    "./config/runtimeSecurityConfig"
  );

const {
  assertReleaseEnvironment,
} =
  require(
    "./config/releaseEnvironment"
  );

const {
  createSecurityLogger,
} =
  require(
    "./observability/securityLogger"
  );

const {
  closeOperationalState,
  getOperationalState,
} =
  require(
    "./state/operationalState"
  );

const {
  installProcessSafetyHandlers,
} =
  require(
    "./observability/processSafety"
  );

const {
  createApp,
  createRuntimeState,
} =
  require(
    "./app"
  );

const HTTP_SERVER_CAPACITY_LIMITS =
  Object.freeze({
    requestTimeoutMs:
      60_000,

    headersTimeoutMs:
      15_000,

    keepAliveTimeoutMs:
      5_000,

    maxRequestsPerSocket:
      100,
  });

function configureHttpServerCapacity(
  server
) {
  if (
    !server ||
    typeof server !==
      "object"
  ) {
    throw new TypeError(
      "A valid HTTP server is required."
    );
  }

  server.requestTimeout =
    HTTP_SERVER_CAPACITY_LIMITS
      .requestTimeoutMs;

  server.headersTimeout =
    HTTP_SERVER_CAPACITY_LIMITS
      .headersTimeoutMs;

  server.keepAliveTimeout =
    HTTP_SERVER_CAPACITY_LIMITS
      .keepAliveTimeoutMs;

  server.maxRequestsPerSocket =
    HTTP_SERVER_CAPACITY_LIMITS
      .maxRequestsPerSocket;

  return server;
}

function normalizeExitCode(
  value,
  fallback =
    0
) {
  const parsed =
    Number(value);

  return Number.isInteger(
    parsed
  ) &&
  parsed >=
    0
    ? parsed
    : fallback;
}

function startServer({
  environment =
    process.env,
  processObject =
    process,
  setTimeoutFn =
    setTimeout,
  clearTimeoutFn =
    clearTimeout,
} = {}) {
  const releaseEnvironment =
    assertReleaseEnvironment({
      environment,
    });

  const config =
    createRuntimeSecurityConfig({
      environment,
    });

  const logger =
    createSecurityLogger({
      environment,

      includeErrorStack:
        config.includeErrorStack,
    });

  const runtimeState =
    createRuntimeState();

  const operationalState =
    getOperationalState();

  const {
    app,
  } =
    createApp({
      config,
      logger,
      runtimeState,
      operationalState,
    });

  const server =
    app.listen(
      config.port,
      () => {
        logger.info(
          "service.started",
          {
            service:
              config.serviceName,

            version:
              config.serviceVersion,

            deploymentEnvironment:
              config
                .deploymentEnvironment,

            runtimeStateMode:
              releaseEnvironment
                .runtimeStateMode,

            port:
              config.port,

            allowedOrigins:
              config.allowedOrigins,

            trustProxy:
              config.trustProxy,
          }
        );
      }
    );

  configureHttpServerCapacity(
    server
  );

  let stopping =
    false;

  let forceShutdownTimer =
    null;

  function updateExitCode(
    exitCode
  ) {
    const normalizedExitCode =
      normalizeExitCode(
        exitCode
      );

    const currentExitCode =
      normalizeExitCode(
        processObject.exitCode,
        0
      );

    processObject.exitCode =
      Math.max(
        currentExitCode,
        normalizedExitCode
      );
  }

  function stop(
    signal,
    {
      exitCode =
        0,
    } = {}
  ) {
    updateExitCode(
      exitCode
    );

    if (stopping) {
      return false;
    }

    stopping =
      true;

    runtimeState.beginDrain();

    logger.info(
      "service.stopping",
      {
        signal,

        exitCode:
          processObject.exitCode,

        shutdownTimeoutMs:
          config.shutdownTimeoutMs,
      }
    );

    forceShutdownTimer =
      setTimeoutFn(
        () => {
          logger.error(
            "service.shutdown-forced",
            {
              signal,

              exitCode:
                Math.max(
                  1,
                  normalizeExitCode(
                    processObject.exitCode,
                    1
                  )
                ),

              shutdownTimeoutMs:
                config.shutdownTimeoutMs,
            }
          );

          updateExitCode(
            1
          );

          if (
            typeof server
              .closeAllConnections ===
              "function"
          ) {
            server
              .closeAllConnections();
          }

          if (
            typeof processObject.exit ===
              "function"
          ) {
            processObject.exit(
              processObject.exitCode
            );
          }
        },
        config.shutdownTimeoutMs
      );

    forceShutdownTimer
      ?.unref?.();

    server.close(
      (error) => {
        if (error) {
          updateExitCode(
            1
          );

          logger.error(
            "service.stop-failed",
            {
              signal,
              error,
            }
          );

          return;
        }

        void closeOperationalState()
          .then(() => {
            if (
              forceShutdownTimer
            ) {
              clearTimeoutFn(
                forceShutdownTimer
              );

              forceShutdownTimer =
                null;
            }

            logger.info(
              "service.stopped",
              {
                signal,

                exitCode:
                  processObject.exitCode,
              }
            );
          })
          .catch(
            (closeError) => {
              updateExitCode(
                1
              );

              logger.error(
                "service.state-close-failed",
                {
                  signal,
                  error:
                    closeError,
                }
              );
            }
          );
      }
    );

    return true;
  }

  const removeProcessSafetyHandlers =
    installProcessSafetyHandlers({
      processObject,
      logger,
      stop,
    });

  return {
    app,
    config,
    logger,
    runtimeState,
    server,
    stop,
    removeProcessSafetyHandlers,
  };
}

if (
  require.main ===
  module
) {
  startServer();
}

module.exports = {
  HTTP_SERVER_CAPACITY_LIMITS,
  configureHttpServerCapacity,
  createApp,
  createRuntimeState,
  normalizeExitCode,
  startServer,
};
