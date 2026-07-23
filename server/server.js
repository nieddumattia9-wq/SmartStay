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
  createSecurityLogger,
} =
  require(
    "./observability/securityLogger"
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

  const {
    app,
  } =
    createApp({
      config,
      logger,
      runtimeState,
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

    runtimeState.setReady(
      false
    );

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
        if (
          forceShutdownTimer
        ) {
          clearTimeoutFn(
            forceShutdownTimer
          );

          forceShutdownTimer =
            null;
        }

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

        logger.info(
          "service.stopped",
          {
            signal,

            exitCode:
              processObject.exitCode,
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
  createApp,
  createRuntimeState,
  normalizeExitCode,
  startServer,
};
