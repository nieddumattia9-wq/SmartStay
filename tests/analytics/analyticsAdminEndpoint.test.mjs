import assert from "node:assert/strict";
import {
  createRequire,
} from "node:module";
import {
  test,
} from "node:test";

const require =
  createRequire(
    import.meta.url
  );

const {
  createAnalyticsAdminAuthorization,
  createAnalyticsDeletionHandler,
  createAnalyticsReportHandler,
  parseWindowDays,
} = require(
  "../../server/routes/analyticsAdmin.js"
);

const {
  createInMemoryAnalyticsEventStore,
} = require(
  "../../server/analytics/analyticsEventStore.js"
);

function createRequest({
  authorization = "",
  query = {},
  body = {},
} = {}) {
  return {
    requestId:
      "request-admin-test",
    query,
    body,
    get(name) {
      return name.toLowerCase() ===
        "authorization"
        ? authorization
        : undefined;
    },
  };
}

function createResponse() {
  return {
    statusCode: null,
    payload: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test(
  "analytics admin route is hidden while unavailable and rejects invalid credentials",
  () => {
    const unavailable =
      createAnalyticsAdminAuthorization({
        enabled: false,
        adminToken:
          "a".repeat(32),
      });

    const unavailableResponse =
      createResponse();

    unavailable(
      createRequest(),
      unavailableResponse,
      assert.fail
    );

    assert.equal(
      unavailableResponse.statusCode,
      404
    );

    const available =
      createAnalyticsAdminAuthorization({
        enabled: true,
        adminToken:
          "b".repeat(32),
      });

    const unauthorizedResponse =
      createResponse();

    available(
      createRequest({
        authorization:
          "Bearer wrong-token",
      }),
      unauthorizedResponse,
      assert.fail
    );

    assert.equal(
      unauthorizedResponse.statusCode,
      401
    );

    let authorized = false;

    available(
      createRequest({
        authorization:
          `Bearer ${"b".repeat(32)}`,
      }),
      createResponse(),
      () => {
        authorized = true;
      }
    );

    assert.equal(authorized, true);
  }
);

test(
  "analytics admin report returns aggregate-only data and deletion remains explicit",
  () => {
    const now =
      Date.UTC(
        2026,
        6,
        23,
        20,
        0,
        0
      );

    const store =
      createInMemoryAnalyticsEventStore({
        now: () => now,
      });

    store.write([
      {
        eventId:
          "event-admin-report-0001",
        eventName:
          "page_view",
        eventVersion: 1,
        occurredAt:
          new Date(now).toISOString(),
        sessionId:
          "session-admin-report-0001",
        releaseSha:
          "85b712d",
        page: "home",
        properties: {},
      },
    ]);

    const reportHandler =
      createAnalyticsReportHandler({
        store,
        now: () => now,
      });

    const reportResponse =
      createResponse();

    reportHandler(
      createRequest({
        query: {
          windowDays: "30",
        },
      }),
      reportResponse,
      assert.fail
    );

    assert.equal(
      reportResponse.statusCode,
      200
    );
    assert.equal(
      reportResponse.payload
        .report
        .distributions
        .eventCounts
        .page_view,
      1
    );

    const serialized =
      JSON.stringify(
        reportResponse.payload
      );

    assert.equal(
      serialized.includes(
        "session-admin-report-0001"
      ),
      false
    );
    assert.equal(
      serialized.includes(
        "event-admin-report-0001"
      ),
      false
    );

    const deletionHandler =
      createAnalyticsDeletionHandler({
        store,
      });

    const deletionResponse =
      createResponse();

    deletionHandler(
      createRequest({
        body: {
          scope: "all",
        },
      }),
      deletionResponse,
      assert.fail
    );

    assert.equal(
      deletionResponse.statusCode,
      200
    );
    assert.equal(
      deletionResponse.payload
        .deletion
        .after
        .rawEventCount,
      0
    );
    assert.equal(
      deletionResponse.payload
        .deletion
        .after
        .aggregateBucketCount,
      0
    );
  }
);

test(
  "analytics report windows are bounded to the aggregate retention contract",
  () => {
    assert.equal(
      parseWindowDays(undefined),
      30
    );
    assert.equal(
      parseWindowDays("180"),
      180
    );
    assert.throws(
      () => parseWindowDays("181"),
      /window is invalid/i
    );
  }
);
