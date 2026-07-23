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

const {
  configureOperationalLogger,
} =
  require(
    "./observability/operationalLogger"
  );

const {
  createEndpointRateLimiters,
  createRateLimitHandler,
} =
  require(
    "./middleware/endpointRateLimits"
  );

const {
  createInMemoryAnalyticsEventStore,
} =
  require(
    "./analytics/analyticsEventStore"
  );

const {
  createAnalyticsEventHandler,
} =
  require(
    "./routes/analytics"
  );

const {
  createAnalyticsAdminAuthorization,
  createAnalyticsDeletionHandler,
  createAnalyticsReportHandler,
} =
  require(
    "./routes/analyticsAdmin"
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

  analyticsEventStore =
    null,
} = {}) {
  const app =
    express();

  const effectiveAnalyticsEventStore =
    analyticsEventStore ??
    createInMemoryAnalyticsEventStore({
      maxEvents:
        config.analyticsStoreMaxEvents,
    });

  configureOperationalLogger({
    logger,
  });

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

  const endpointRateLimiters =
    createEndpointRateLimiters({
      config,
    });

  const analyticsAdminAuthorization =
    createAnalyticsAdminAuthorization({
      enabled:
        config.analyticsEnabled,
      adminToken:
        config.analyticsAdminToken,
    });

  app.use(
    endpointRateLimiters.api
  );

  app.post(
    "/api/analytics/events",
    endpointRateLimiters
      .analytics,
    express.json({
      limit:
        config.analyticsJsonLimit,
    }),
    createAnalyticsEventHandler({
      enabled:
        config.analyticsEnabled,
      store:
        effectiveAnalyticsEventStore,
    })
  );

  app.get(
    "/api/internal/analytics/report",
    endpointRateLimiters
      .analyticsAdmin,
    analyticsAdminAuthorization,
    createAnalyticsReportHandler({
      store:
        effectiveAnalyticsEventStore,
    })
  );

  app.delete(
    "/api/internal/analytics/data",
    endpointRateLimiters
      .analyticsAdmin,
    analyticsAdminAuthorization,
    express.json({
      limit: "4kb",
    }),
    createAnalyticsDeletionHandler({
      store:
        effectiveAnalyticsEventStore,
    })
  );

  app.post(
    "/api/search-destinations",
    endpointRateLimiters
      .destinationSearch
  );

  app.post(
    "/api/search-hotels",
    endpointRateLimiters
      .hotelSearch
  );

  app.post(
    "/api/search-hotels/continue",
    endpointRateLimiters
      .continuation
  );

  app.post(
    "/api/hotel-details",
    endpointRateLimiters
      .hotelDetails
  );

  app.post(
    "/api/booking-offer-recheck",
    endpointRateLimiters
      .bookingRecheck
  );

  app.post(
    "/api/booking-handoff",
    endpointRateLimiters
      .bookingHandoff
  );

  app.get(
    "/api/booking-handoff/open",
    endpointRateLimiters
      .bookingOpen
  );

  app.get(
    "/api/booking-redirect",
    endpointRateLimiters
      .bookingOpen
  );

  app.get(
    "/api/search-status",
    endpointRateLimiters
      .searchRead
  );

  app.get(
    "/api/search-session",
    endpointRateLimiters
      .searchRead
  );

  app.use(
    express.json({
      limit:
        config.jsonLimit,
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

        environment:
          config
            .deploymentEnvironment,

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

        version:
          config.serviceVersion,

        environment:
          config
            .deploymentEnvironment,

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

        version:
          config.serviceVersion,

        environment:
          config
            .deploymentEnvironment,

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

        version:
          config.serviceVersion,

        environment:
          config
            .deploymentEnvironment,

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

      const isPayloadTooLarge =
        error?.type ===
          "entity.too.large" ||
        error?.status ===
          413;

      if (
        isPayloadTooLarge
      ) {
        req.log.warn(
          "http.request.payload-too-large",
          {
            method:
              req.method,
            path:
              req.path,
            status:
              413,
          }
        );

        res.status(
          413
        ).json({
          success:
            false,
          code:
            "PAYLOAD_TOO_LARGE",
          message:
            "Request payload is too large.",
          requestId:
            req.requestId ??
            null,
        });

        return;
      }

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

      const isCorsFailure =
        status ===
          403 &&
        error.code ===
          "CORS_ORIGIN_DENIED";

      const isExposedFailure =
        error?.exposePublic ===
          true &&
        typeof error?.code ===
          "string" &&
        error.code.trim();

      const publicCode =
        isCorsFailure
          ? "CORS_ORIGIN_DENIED"
          : isExposedFailure
            ? error.code
            : status >=
                500
              ? "INTERNAL_ERROR"
              : "REQUEST_FAILED";

      const publicMessage =
        isCorsFailure
          ? "Origin is not allowed."
          : isExposedFailure &&
              typeof error.message ===
                "string" &&
              error.message.trim()
            ? error.message
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

        ...(isExposedFailure &&
        typeof error.field ===
          "string" &&
        error.field.trim()
          ? {
              field:
                error.field,
            }
          : {}),

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
    analyticsEventStore:
      effectiveAnalyticsEventStore,
  };
}

module.exports = {
  createApp,
  createCorsOriginHandler,
  createRateLimitHandler,
  createRuntimeState,
};
