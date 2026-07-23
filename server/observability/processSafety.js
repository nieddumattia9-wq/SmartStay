"use strict";

function installProcessSafetyHandlers({
  processObject =
    process,
  logger,
  stop,
} = {}) {
  if (
    !processObject ||
    typeof processObject.once !==
      "function" ||
    typeof processObject.removeListener !==
      "function"
  ) {
    throw new TypeError(
      "Process safety handlers require an EventEmitter-compatible process object."
    );
  }

  if (
    !logger ||
    typeof logger.error !==
      "function"
  ) {
    throw new TypeError(
      "Process safety handlers require a logger."
    );
  }

  if (
    typeof stop !==
      "function"
  ) {
    throw new TypeError(
      "Process safety handlers require a stop function."
    );
  }

  const handlers = {
    SIGTERM:
      () =>
        stop(
          "SIGTERM",
          {
            exitCode:
              0,
          }
        ),

    SIGINT:
      () =>
        stop(
          "SIGINT",
          {
            exitCode:
              0,
          }
        ),

    unhandledRejection:
      (
        reason
      ) => {
        logger.error(
          "process.unhandled-rejection",
          {
            error:
              reason instanceof
                Error
                ? reason
                : new Error(
                    String(
                      reason
                    )
                  ),
          }
        );

        return stop(
          "unhandledRejection",
          {
            exitCode:
              1,
          }
        );
      },

    uncaughtException:
      (
        error
      ) => {
        logger.error(
          "process.uncaught-exception",
          {
            error:
              error instanceof
                Error
                ? error
                : new Error(
                    String(
                      error
                    )
                  ),
          }
        );

        return stop(
          "uncaughtException",
          {
            exitCode:
              1,
          }
        );
      },
  };

  for (
    const [
      event,
      handler,
    ] of Object.entries(
      handlers
    )
  ) {
    processObject.once(
      event,
      handler
    );
  }

  return function removeProcessSafetyHandlers() {
    for (
      const [
        event,
        handler,
      ] of Object.entries(
        handlers
      )
    ) {
      processObject.removeListener(
        event,
        handler
      );
    }
  };
}

module.exports = {
  installProcessSafetyHandlers,
};
