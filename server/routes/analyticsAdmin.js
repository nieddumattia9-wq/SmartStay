"use strict";

const crypto =
  require("node:crypto");

const {
  createAnalyticsBetaReport,
} = require(
  "../analytics/analyticsMeasurement"
);

const MAX_REPORT_WINDOW_DAYS =
  180;

const MIN_ADMIN_TOKEN_LENGTH =
  32;

function normalizeAdminToken(
  value
) {
  const token =
    String(value ?? "").trim();

  return token.length >=
    MIN_ADMIN_TOKEN_LENGTH
    ? token
    : "";
}

function getBearerToken(
  req
) {
  const authorization =
    String(
      req.get("Authorization") ??
      ""
    ).trim();

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization
    );

  return match
    ? match[1].trim()
    : "";
}

function tokensMatch(
  provided,
  expected
) {
  const normalizedProvided =
    Buffer.from(
      String(provided ?? ""),
      "utf8"
    );

  const normalizedExpected =
    Buffer.from(
      String(expected ?? ""),
      "utf8"
    );

  if (
    normalizedProvided.length === 0 ||
    normalizedProvided.length !==
      normalizedExpected.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    normalizedProvided,
    normalizedExpected
  );
}

function createAnalyticsAdminAuthorization({
  enabled = false,
  adminToken = "",
} = {}) {
  const expectedToken =
    normalizeAdminToken(
      adminToken
    );

  return function authorizeAnalyticsAdmin(
    req,
    res,
    next
  ) {
    if (
      enabled !== true ||
      !expectedToken
    ) {
      res.status(404).json({
        success: false,
        code:
          "ANALYTICS_ADMIN_NOT_AVAILABLE",
        message:
          "Resource not found.",
        requestId:
          req.requestId ?? null,
      });
      return;
    }

    if (
      !tokensMatch(
        getBearerToken(req),
        expectedToken
      )
    ) {
      res.status(401).json({
        success: false,
        code:
          "ANALYTICS_ADMIN_UNAUTHORIZED",
        message:
          "Authorization is required.",
        requestId:
          req.requestId ?? null,
      });
      return;
    }

    next();
  };
}

function parseWindowDays(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 30;
  }

  const candidate =
    String(value).trim();

  if (!/^\d{1,3}$/.test(candidate)) {
    const error =
      new Error(
        "Analytics report window is invalid."
      );

    error.status = 400;
    error.code =
      "INVALID_ANALYTICS_REPORT_WINDOW";
    error.exposePublic = true;
    error.field = "windowDays";

    throw error;
  }

  const windowDays =
    Number(candidate);

  if (
    !Number.isInteger(windowDays) ||
    windowDays < 1 ||
    windowDays >
      MAX_REPORT_WINDOW_DAYS
  ) {
    const error =
      new Error(
        "Analytics report window is invalid."
      );

    error.status = 400;
    error.code =
      "INVALID_ANALYTICS_REPORT_WINDOW";
    error.exposePublic = true;
    error.field = "windowDays";

    throw error;
  }

  return windowDays;
}

function createAnalyticsReportHandler({
  store,
  now =
    () => Date.now(),
} = {}) {
  if (
    !store ||
    typeof store.readAggregateBuckets !==
      "function" ||
    typeof store.getStorageStatus !==
      "function"
  ) {
    throw new TypeError(
      "Analytics measurement store is required."
    );
  }

  return function getAnalyticsReport(
    req,
    res,
    next
  ) {
    try {
      const windowDays =
        parseWindowDays(
          req.query?.windowDays
        );

      const report =
        createAnalyticsBetaReport({
          buckets:
            store.readAggregateBuckets({
              windowDays,
            }),
          storageStatus:
            store.getStorageStatus(),
          windowDays,
          now,
        });

      res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  };
}

function createAnalyticsDeletionHandler({
  store,
} = {}) {
  if (
    !store ||
    typeof store.deleteData !==
      "function"
  ) {
    throw new TypeError(
      "Analytics deletion store is required."
    );
  }

  return function deleteAnalyticsData(
    req,
    res,
    next
  ) {
    try {
      const scope =
        String(
          req.body?.scope ??
          "expired"
        )
          .trim()
          .toLowerCase();

      const result =
        store.deleteData(scope);

      res.status(200).json({
        success: true,
        deletion: result,
      });
    } catch (error) {
      if (
        error instanceof TypeError
      ) {
        error.status = 400;
        error.code =
          "INVALID_ANALYTICS_DELETION_SCOPE";
        error.exposePublic = true;
        error.field = "scope";
      }

      next(error);
    }
  };
}

module.exports = {
  MAX_REPORT_WINDOW_DAYS,
  MIN_ADMIN_TOKEN_LENGTH,
  createAnalyticsAdminAuthorization,
  createAnalyticsDeletionHandler,
  createAnalyticsReportHandler,
  getBearerToken,
  normalizeAdminToken,
  parseWindowDays,
  tokensMatch,
};
