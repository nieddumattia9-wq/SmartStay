"use strict";

const {
  createSecurityLogger,
} =
  require(
    "./securityLogger"
  );

const {
  getRequestContext,
} =
  require(
    "./asyncRequestContext"
  );

let fallbackLogger =
  createSecurityLogger();

function assertLogger(
  logger
) {
  if (
    !logger ||
    typeof logger.debug !==
      "function" ||
    typeof logger.info !==
      "function" ||
    typeof logger.warn !==
      "function" ||
    typeof logger.error !==
      "function"
  ) {
    throw new TypeError(
      "Operational logger requires debug, info, warn and error methods."
    );
  }
}

function configureOperationalLogger({
  logger,
} = {}) {
  assertLogger(
    logger
  );

  fallbackLogger =
    logger;

  return operationalLogger;
}

function normalizeData(
  data
) {
  if (
    data &&
    typeof data ===
      "object" &&
    !Array.isArray(data)
  ) {
    return data;
  }

  return {
    value:
      data ??
      null,
  };
}

function resolveLogger() {
  const requestContext =
    getRequestContext();

  if (
    requestContext?.logger
  ) {
    return requestContext.logger;
  }

  return fallbackLogger;
}

function emit(
  level,
  event,
  data =
    {}
) {
  const logger =
    resolveLogger();

  return logger[level](
    event,
    normalizeData(
      data
    )
  );
}

function createChildLogger(
  context =
    {}
) {
  const normalizedContext =
    normalizeData(
      context
    );

  return Object.freeze({
    debug:
      (
        event,
        data =
          {}
      ) =>
        emit(
          "debug",
          event,
          {
            ...normalizedContext,
            ...normalizeData(
              data
            ),
          }
        ),

    info:
      (
        event,
        data =
          {}
      ) =>
        emit(
          "info",
          event,
          {
            ...normalizedContext,
            ...normalizeData(
              data
            ),
          }
        ),

    warn:
      (
        event,
        data =
          {}
      ) =>
        emit(
          "warn",
          event,
          {
            ...normalizedContext,
            ...normalizeData(
              data
            ),
          }
        ),

    error:
      (
        event,
        data =
          {}
      ) =>
        emit(
          "error",
          event,
          {
            ...normalizedContext,
            ...normalizeData(
              data
            ),
          }
        ),
  });
}

const operationalLogger =
  Object.freeze({
    debug:
      (
        event,
        data
      ) =>
        emit(
          "debug",
          event,
          data
        ),

    info:
      (
        event,
        data
      ) =>
        emit(
          "info",
          event,
          data
        ),

    warn:
      (
        event,
        data
      ) =>
        emit(
          "warn",
          event,
          data
        ),

    error:
      (
        event,
        data
      ) =>
        emit(
          "error",
          event,
          data
        ),

    child:
      createChildLogger,
  });

module.exports = {
  configureOperationalLogger,
  createChildLogger,
  operationalLogger,
};
