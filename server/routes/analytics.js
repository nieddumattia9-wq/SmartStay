"use strict";

const {
  validateAnalyticsBatch,
} =
  require(
    "../analytics/analyticsEventValidator"
  );

function hasPrivacyOptOutSignal(
  req
) {
  const doNotTrack =
    String(
      req.get(
        "DNT"
      ) ??
      ""
    )
      .trim()
      .toLowerCase();

  const globalPrivacyControl =
    String(
      req.get(
        "Sec-GPC"
      ) ??
      ""
    )
      .trim()
      .toLowerCase();

  return (
    doNotTrack === "1" ||
    doNotTrack === "yes" ||
    globalPrivacyControl ===
      "1"
  );
}

function createAnalyticsEventHandler({
  enabled = false,
  store,
} = {}) {
  if (
    !store ||
    typeof store.write !==
      "function"
  ) {
    throw new TypeError(
      "Analytics event store is required."
    );
  }

  return function receiveAnalyticsEvents(
    req,
    res,
    next
  ) {
    if (
      enabled !== true ||
      hasPrivacyOptOutSignal(req)
    ) {
      res.status(204).end();
      return;
    }

    try {
      const events =
        validateAnalyticsBatch(
          req.body
        );

      const accepted =
        store.write(events);

      res.status(202).json({
        success: true,
        accepted,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createAnalyticsEventHandler,
  hasPrivacyOptOutSignal,
};
