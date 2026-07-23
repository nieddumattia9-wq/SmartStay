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
  createApp,
  createRuntimeState,
} =
  require(
    "./app"
  );

function startServer({
  environment =
    process.env,
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

  function stop(
    signal
  ) {
    if (stopping) {
      return;
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
      }
    );

    server.close(
      (error) => {
        if (error) {
          logger.error(
            "service.stop-failed",
            {
              signal,
              error,
            }
          );

          process.exitCode =
            1;
        }
        else {
          logger.info(
            "service.stopped",
            {
              signal,
            }
          );
        }
      }
    );
  }

  process.once(
    "SIGTERM",
    () =>
      stop(
        "SIGTERM"
      )
  );

  process.once(
    "SIGINT",
    () =>
      stop(
        "SIGINT"
      )
  );

  return {
    app,
    config,
    logger,
    runtimeState,
    server,
    stop,
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
  startServer,
};
