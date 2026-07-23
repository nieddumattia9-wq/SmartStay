"use strict";

const {
  AsyncLocalStorage,
} =
  require(
    "node:async_hooks"
  );

const requestContextStorage =
  new AsyncLocalStorage();

function runWithRequestContext(
  context,
  callback
) {
  if (
    typeof callback !==
      "function"
  ) {
    throw new TypeError(
      "Request context callback must be a function."
    );
  }

  const normalizedContext =
    Object.freeze({
      requestId:
        typeof context?.requestId ===
          "string"
          ? context.requestId
          : null,

      logger:
        context?.logger ??
        null,
    });

  return requestContextStorage.run(
    normalizedContext,
    callback
  );
}

function getRequestContext() {
  return (
    requestContextStorage
      .getStore() ??
    null
  );
}

module.exports = {
  getRequestContext,
  runWithRequestContext,
};
