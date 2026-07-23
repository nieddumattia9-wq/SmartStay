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
  AnalyticsValidationError,
  validateAnalyticsBatch,
  validateAnalyticsEvent,
} = require(
  "../../server/analytics/analyticsEventValidator.js"
);

function createEvent(
  overrides = {}
) {
  return {
    eventId:
      "00000000-0000-4000-8000-000000000001",
    eventName:
      "search_started",
    eventVersion:
      1,
    occurredAt:
      new Date().toISOString(),
    sessionId:
      "00000000-0000-4000-8000-000000000002",
    journeyId:
      "00000000-0000-4000-8000-000000000003",
    releaseSha:
      "7ac6936",
    page:
      "home",
    properties: {
      nightsBucket:
        "3-7",
      partySizeBucket:
        "2",
      roomCount:
        1,
      budgetProvided:
        true,
      distanceBand:
        "2km",
    },
    ...overrides,
  };
}

test(
  "analytics validator accepts a canonical coarse event batch",
  () => {
    const events =
      validateAnalyticsBatch({
        events: [
          createEvent(),
        ],
      });

    assert.equal(
      events.length,
      1
    );

    assert.equal(
      events[0].eventName,
      "search_started"
    );
  }
);

test(
  "analytics validator rejects raw travel, booking and provider identifiers recursively",
  () => {
    for (
      const forbiddenProperties of
      [
        {
          searchId:
            "private-search",
        },
        {
          offerId:
            "private-offer",
        },
        {
          providerContext: {
            token:
              "private-token",
          },
        },
        {
          destinationName:
            "Florence",
        },
      ]
    ) {
      assert.throws(
        () =>
          validateAnalyticsEvent(
            createEvent({
              properties: {
                ...createEvent()
                  .properties,
                ...forbiddenProperties,
              },
            })
          ),
        AnalyticsValidationError
      );
    }
  }
);

test(
  "analytics validator rejects unknown properties, invalid enums and oversized batches",
  () => {
    assert.throws(
      () =>
        validateAnalyticsEvent(
          createEvent({
            properties: {
              ...createEvent()
                .properties,
              unknownField:
                true,
            },
          })
        ),
      AnalyticsValidationError
    );

    assert.throws(
      () =>
        validateAnalyticsEvent(
          createEvent({
            properties: {
              ...createEvent()
                .properties,
              nightsBucket:
                "exactly-5",
            },
          })
        ),
      AnalyticsValidationError
    );

    assert.throws(
      () =>
        validateAnalyticsBatch({
          events:
            Array.from(
              {
                length:
                  21,
              },
              () =>
                createEvent()
            ),
        }),
      AnalyticsValidationError
    );
  }
);
