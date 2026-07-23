"use strict";

const crypto =
  require(
    "node:crypto"
  );

const {
  runWithRequestContext,
} =
  require(
    "../observability/asyncRequestContext"
  );

const REQUEST_ID_HEADER =
  "X-Request-ID";

const REQUEST_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function createRequestId(
  candidate
) {
  if (
    typeof candidate ===
      "string"
  ) {
    const normalized =
      candidate.trim();

    if (
      REQUEST_ID_PATTERN.test(
        normalized
      )
    ) {
      return normalized;
    }
  }

  return (
    "req-" +
    crypto.randomUUID()
  );
}

function createRequestContextMiddleware({
  logger,
  now =
    () =>
      Date.now(),
} = {}) {
  if (
    !logger ||
    typeof logger.child !==
      "function"
  ) {
    throw new TypeError(
      "Request context middleware requires a logger."
    );
  }

  return function requestContext(
    req,
    res,
    next
  ) {
    const requestId =
      createRequestId(
        req.get(
          REQUEST_ID_HEADER
        )
      );

    const startedAt =
      now();

    req.requestId =
      requestId;

    req.log =
      logger.child({
        requestId,
      });

    res.setHeader(
      REQUEST_ID_HEADER,
      requestId
    );

    return runWithRequestContext(
      {
        requestId,
        logger:
          req.log,
      },
      () => {
        res.once(
          "finish",
          () => {
            req.log.info(
              "http.request.completed",
              {
                method:
                  req.method,

                path:
                  req.path,

                status:
                  res.statusCode,

                durationMs:
                  Math.max(
                    0,
                    now() -
                    startedAt
                  ),
              }
            );
          }
        );

        next();
      }
    );
  };
}

module.exports = {
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  createRequestContextMiddleware,
  createRequestId,
};
