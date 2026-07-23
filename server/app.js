"use strict";

const express =
  require(
    "express"
  );

const cors =
  require(
    "cors"
  );

const helmet =
  require(
    "helmet"
  );

const rateLimit =
  require(
    "express-rate-limit"
  );

const {
  createRuntimeSecurityConfig,
} =
  require(
    "./config/runtimeSecurityConfig"
  );

const {
  createRequestContextMiddleware,
} =
  require(
    "./middleware/requestContext"
  );

const {
  createSecurityLogger,
} =
  require(
    "./observability/securityLogger"
  );

function createRuntimeState() {
  let ready =
    true;

  return Object.freeze({
    isReady() {
      return ready;
    },

    setReady(
      value
    ) {
      ready =
        value ===
        true;
    },
  });
}

function createCorsOriginHandler(
  allowedOrigins
) {
  const allowed =
    new Set(
      allowedOrigins
    );

  return function verifyOrigin(
    origin,
    callback
  ) {
    if (
      !origin ||
      allowed.has(
        origin
      )
    ) {
      callback(
        null,
        true
      );

      return;
    }

    const error =
      new Error(
        "Origin is not allowed."
      );

    error.status =
      403;

    error.code =
      "CORS_ORIGIN_DENIED";

    callback(error);
  };
}

function createRateLimitHandler() {
  return function handleRateLimit(
    req,
    res
  ) {
    res.status(
      429
    ).json({
      success:
        false,

      code:
        "RATE_LIMITED",

      message:
        "Too many requests. Please try again later.",

      requestId:
        req.requestId ??
        null,
    });
  };
}

function createApp({
  config =
    createRuntimeSecurityConfig(),

  logger =
    createSecurityLogger({
      includeErrorStack:
        config.includeErrorStack,
    }),

  runtimeState =
    createRuntimeState(),

  searchRoutes =
    require(
      "./routes/search"
    ),
} = {}) {
  const app =
    express();

  app.disable(
    "x-powered-by"
  );

  app.set(
    "trust proxy",
    config.trustProxy
  );

  app.use(
    createRequestContextMiddleware({
      logger,
    })
  );

  app.use(
    helmet({
      referrerPolicy: {
        policy:
          "no-referrer",
      },
    })
  );

  app.use(
    (
      req,
      res,
      next
    ) => {
      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      next();
    }
  );

  app.use(
    cors({
      origin:
        createCorsOriginHandler(
          config.allowedOrigins
        ),

      credentials:
        false,

      optionsSuccessStatus:
        204,
    })
  );

  app.use(
    express.json({
      limit:
        config.jsonLimit,
    })
  );

  app.use(
    rateLimit({
      windowMs:
        config.rateLimitWindowMs,

      max:
        config.rateLimitMaxRequests,

      standardHeaders:
        true,

      legacyHeaders:
        false,

      skip:
        (req) =>
          req.path.startsWith(
            "/health"
          ),

      handler:
        createRateLimitHandler(),
    })
  );

  app.get(
    "/",
    (
      req,
      res
    ) => {
      res.json({
        status:
          "ok",

        service:
          config.serviceName,

        version:
          config.serviceVersion,

        requestId:
          req.requestId,
      });
    }
  );

  app.get(
    "/health/live",
    (
      req,
      res
    ) => {
      res.json({
        status:
          "ok",

        service:
          config.serviceName,

        requestId:
          req.requestId,
      });
    }
  );

  app.get(
    "/health/ready",
    (
      req,
      res
    ) => {
      const ready =
        runtimeState.isReady();

      res.status(
        ready
          ? 200
          : 503
      ).json({
        status:
          ready
            ? "ready"
            : "not-ready",

        service:
          config.serviceName,

        requestId:
          req.requestId,
      });
    }
  );

  app.get(
    "/health",
    (
      req,
      res
    ) => {
      const ready =
        runtimeState.isReady();

      res.status(
        ready
          ? 200
          : 503
      ).json({
        status:
          ready
            ? "ok"
            : "not-ready",

        service:
          config.serviceName,

        timestamp:
          new Date()
            .toISOString(),

        requestId:
          req.requestId,
      });
    }
  );

  app.use(
    "/api",
    searchRoutes
  );

  app.use(
    (
      req,
      res
    ) => {
      res.status(
        404
      ).json({
        success:
          false,

        code:
          "ROUTE_NOT_FOUND",

        message:
          "Route not found.",

        requestId:
          req.requestId ??
          null,
      });
    }
  );

  app.use(
    (
      error,
      req,
      res,
      next
    ) => {
      if (
        res.headersSent
      ) {
        next(error);

        return;
      }

      const isMalformedJson =
        error instanceof
          SyntaxError &&
        error.status ===
          400 &&
        error.type ===
          "entity.parse.failed";

      if (
        isMalformedJson
      ) {
        req.log.warn(
          "http.request.invalid-json",
          {
            method:
              req.method,

            path:
              req.path,

            error,
          }
        );

        res.status(
          400
        ).json({
          success:
            false,

          code:
            "INVALID_JSON",

          message:
            "Invalid JSON payload.",

          requestId:
            req.requestId ??
            null,
        });

        return;
      }

      const rawStatus =
        error.status ??
        error.statusCode;

      const status =
        Number.isInteger(
          rawStatus
        ) &&
        rawStatus >=
          400 &&
        rawStatus <=
          599
          ? rawStatus
          : 500;

      const publicCode =
        status ===
          403 &&
        error.code ===
          "CORS_ORIGIN_DENIED"
          ? "CORS_ORIGIN_DENIED"
          : status >=
              500
            ? "INTERNAL_ERROR"
            : "REQUEST_FAILED";

      const publicMessage =
        status ===
          403 &&
        error.code ===
          "CORS_ORIGIN_DENIED"
          ? "Origin is not allowed."
          : status >=
              500
            ? "Internal server error."
            : "Request failed.";

      req.log.error(
        "http.request.failed",
        {
          method:
            req.method,

          path:
            req.path,

          status,

          error,
        }
      );

      res.status(
        status
      ).json({
        success:
          false,

        code:
          publicCode,

        message:
          publicMessage,

        requestId:
          req.requestId ??
          null,
      });
    }
  );

  return {
    app,
    config,
    logger,
    runtimeState,
  };
}

module.exports = {
  createApp,
  createCorsOriginHandler,
  createRateLimitHandler,
  createRuntimeState,
};
