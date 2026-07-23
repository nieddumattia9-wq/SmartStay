import assert from "node:assert/strict";
import fs from "node:fs";
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
  DAY_MS,
  createAnalyticsBetaReport,
} = require(
  "../../server/analytics/analyticsMeasurement.js"
);

const {
  createInMemoryAnalyticsEventStore,
} = require(
  "../../server/analytics/analyticsEventStore.js"
);

function createEvent({
  id,
  eventName,
  occurredAt,
  journeyId =
    "journey-analytics-0001",
  page = "results",
  properties = {},
}) {
  return {
    eventId: id,
    eventName,
    eventVersion: 1,
    occurredAt:
      new Date(occurredAt)
        .toISOString(),
    sessionId:
      "session-analytics-0001",
    journeyId,
    releaseSha:
      "85b712d",
    page,
    properties,
  };
}

test(
  "analytics measurement produces the canonical beta rates without raw identifiers",
  () => {
    let now =
      Date.UTC(
        2026,
        6,
        23,
        12,
        0,
        0
      );

    const store =
      createInMemoryAnalyticsEventStore({
        maxEvents: 100,
        now: () => now,
      });

    const startedAt =
      now - 20_000;

    store.write([
      createEvent({
        id: "event-measure-0001",
        eventName:
          "search_started",
        occurredAt:
          startedAt,
        page: "home",
        properties: {
          nightsBucket: "3-7",
          partySizeBucket: "2",
          roomCount: 1,
          budgetProvided: true,
          distanceBand: "2km",
        },
      }),
      createEvent({
        id: "event-measure-0002",
        eventName:
          "search_completed",
        occurredAt:
          startedAt + 8_000,
        page: "loading",
        properties: {
          outcome: "results",
          durationBucket: "5-15s",
          visibleResultsBucket:
            "4-10",
        },
      }),
      createEvent({
        id: "event-measure-0003",
        eventName:
          "results_viewed",
        occurredAt:
          startedAt + 9_000,
        properties: {
          visibleResultsBucket:
            "4-10",
          rolesShown: [
            "best-choice",
            "best-location",
          ],
        },
      }),
      createEvent({
        id: "event-measure-0004",
        eventName:
          "hotel_details_opened",
        occurredAt:
          startedAt + 12_000,
        page: "details",
        properties: {
          role: "best-choice",
          positionBucket: "1",
        },
      }),
      createEvent({
        id: "event-measure-0005",
        eventName:
          "booking_recheck_started",
        occurredAt:
          startedAt + 14_000,
        page: "recheck",
        properties: {
          role: "best-choice",
        },
      }),
      createEvent({
        id: "event-measure-0006",
        eventName:
          "booking_handoff_opened",
        occurredAt:
          startedAt + 18_000,
        page: "handoff",
        properties: {
          role: "best-choice",
        },
      }),
    ]);

    const report =
      createAnalyticsBetaReport({
        buckets:
          store.readAggregateBuckets({
            windowDays: 30,
          }),
        storageStatus:
          store.getStorageStatus(),
        windowDays: 30,
        now: () => now,
      });

    assert.equal(
      report.metrics
        .searchCompletionRate,
      1
    );
    assert.equal(
      report.metrics
        .visibleResultsRate,
      1
    );
    assert.equal(
      report.metrics
        .detailsOpenRate,
      1
    );
    assert.equal(
      report.metrics
        .recheckRate,
      1
    );
    assert.equal(
      report.metrics
        .handoffRate,
      1
    );
    assert.equal(
      report.metrics
        .medianSearchDurationBucket,
      "5-15s"
    );
    assert.equal(
      report.metrics
        .medianTimeToFirstChoiceBucket,
      "5-15s"
    );
    assert.equal(
      report.distributions
        .rolesShownCounts
        ["best-choice"],
      1
    );
    assert.equal(
      report.sampleReadiness,
      "insufficient-sample"
    );

    const serialized =
      JSON.stringify(report);

    for (
      const forbidden of
      [
        "journey-analytics-0001",
        "session-analytics-0001",
        "event-measure-0001",
      ]
    ) {
      assert.equal(
        serialized.includes(forbidden),
        false
      );
    }
  }
);

test(
  "raw and aggregate retention are separate and deletion is executable",
  () => {
    let now =
      Date.UTC(
        2026,
        0,
        1
      );

    const store =
      createInMemoryAnalyticsEventStore({
        maxEvents: 10,
        now: () => now,
      });

    store.write([
      createEvent({
        id: "event-retention-0001",
        eventName: "page_view",
        occurredAt: now,
        journeyId:
          "journey-retention-0001",
        page: "home",
        properties: {},
      }),
    ]);

    assert.equal(store.count(), 1);
    assert.equal(
      store
        .readAggregateBuckets({
          windowDays: 180,
        })
        .length,
      1
    );

    now += 31 * DAY_MS;

    assert.equal(store.count(), 0);
    assert.equal(
      store
        .readAggregateBuckets({
          windowDays: 180,
        })
        .length,
      1
    );

    const deletion =
      store.deleteData(
        "aggregates"
      );

    assert.equal(
      deletion.before
        .aggregateBucketCount,
      1
    );
    assert.equal(
      deletion.after
        .aggregateBucketCount,
      0
    );

    assert.throws(
      () =>
        store.deleteData(
          "unknown"
        ),
      /scope is invalid/i
    );
  }
);

test(
  "later terminal outcomes replace earlier retry failures for journey-level rates",
  () => {
    const now =
      Date.UTC(
        2026,
        6,
        23,
        14,
        0,
        0
      );

    const store =
      createInMemoryAnalyticsEventStore({
        now: () => now,
      });

    store.write([
      createEvent({
        id: "event-retry-final-0001",
        eventName:
          "search_started",
        occurredAt:
          now - 30_000,
        journeyId:
          "journey-retry-final-0001",
        page: "home",
        properties: {
          nightsBucket: "3-7",
          partySizeBucket: "2",
          roomCount: 1,
          budgetProvided: true,
          distanceBand: "2km",
        },
      }),
      createEvent({
        id: "event-retry-final-0002",
        eventName:
          "search_failed",
        occurredAt:
          now - 20_000,
        journeyId:
          "journey-retry-final-0001",
        page: "loading",
        properties: {
          outcome: "timeout",
          retryable: true,
          publicCode:
            "SEARCH_TIMEOUT",
          durationBucket: "5-15s",
        },
      }),
      createEvent({
        id: "event-retry-final-0003",
        eventName:
          "search_completed",
        occurredAt:
          now - 5_000,
        journeyId:
          "journey-retry-final-0001",
        page: "loading",
        properties: {
          outcome: "results",
          durationBucket: "15-30s",
          visibleResultsBucket:
            "4-10",
        },
      }),
    ]);

    const report =
      createAnalyticsBetaReport({
        buckets:
          store.readAggregateBuckets({
            windowDays: 30,
          }),
        storageStatus:
          store.getStorageStatus(),
        windowDays: 30,
        now: () => now,
      });

    assert.equal(
      report.metrics
        .searchCompletedCount,
      1
    );
    assert.equal(
      report.metrics
        .searchFailedCount,
      0
    );
    assert.equal(
      report.metrics
        .visibleResultsRate,
      1
    );
    assert.equal(
      report.distributions
        .eventCounts
        .search_failed,
      1
    );
    assert.equal(
      report.distributions
        .eventCounts
        .search_completed,
      1
    );
  }
);

function normalizeFieldKey(
  value
) {
  return String(value)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function collectObjectKeys(
  value,
  target = []
) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectObjectKeys(
        entry,
        target
      );
    }

    return target;
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return target;
  }

  for (
    const [key, nestedValue] of
    Object.entries(value)
  ) {
    target.push(key);
    collectObjectKeys(
      nestedValue,
      target
    );
  }

  return target;
}

test(
  "aggregate report keeps preference-change metrics free of forbidden field names",
  () => {
    const now =
      Date.UTC(
        2026,
        6,
        23,
        15,
        0,
        0
      );

    const store =
      createInMemoryAnalyticsEventStore({
        now: () => now,
      });

    store.write([
      createEvent({
        id:
          "event-preference-privacy-0001",
        eventName:
          "search_started",
        occurredAt:
          now - 10_000,
        journeyId:
          "journey-preference-privacy-0001",
        page: "home",
        properties: {
          nightsBucket: "3-7",
          partySizeBucket: "2",
          roomCount: 1,
          budgetProvided: true,
          distanceBand: "2km",
        },
      }),
      createEvent({
        id:
          "event-preference-privacy-0002",
        eventName:
          "search_preferences_changed",
        occurredAt:
          now - 5_000,
        journeyId:
          "journey-preference-privacy-0001",
        page: "results",
        properties: {
          field: "budget",
          changeKind: "increased",
        },
      }),
    ]);

    const report =
      createAnalyticsBetaReport({
        buckets:
          store.readAggregateBuckets({
            windowDays: 30,
          }),
        storageStatus:
          store.getStorageStatus(),
        windowDays: 30,
        now: () => now,
      });

    assert.equal(
      report.distributions
        .preferenceDimensionCounts
        .budgetChanges,
      1
    );
    assert.equal(
      report.distributions
        .preferenceChangeKindCounts
        .increased,
      1
    );

    const contract =
      JSON.parse(
        fs.readFileSync(
          new URL(
            "../../contracts/analytics-event-contract.v1.json",
            import.meta.url
          ),
          "utf8"
        ).replace(/^\uFEFF/, "")
      );

    const forbiddenKeys =
      new Set(
        contract.forbiddenFields
          .map(normalizeFieldKey)
      );

    const detected =
      collectObjectKeys(report)
        .filter(
          (key) =>
            forbiddenKeys.has(
              normalizeFieldKey(key)
            )
        );

    assert.deepEqual(
      detected,
      []
    );
  }
);
