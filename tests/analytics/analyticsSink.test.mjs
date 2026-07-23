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
  createInMemoryAnalyticsEventStore,
} = require(
  "../../server/analytics/analyticsEventStore.js"
);

function createEvent(
  eventId
) {
  return {
    eventId,
    eventName:
      "page_view",
    properties: {},
  };
}

test(
  "analytics sink is bounded, in-memory and returns defensive copies",
  () => {
    let now =
      1_000;

    const store =
      createInMemoryAnalyticsEventStore({
        maxEvents:
          2,
        retentionMs:
          100,
        now:
          () => now,
      });

    const accepted =
      store.write([
        createEvent("event-1"),
        createEvent("event-2"),
        createEvent("event-3"),
        createEvent("event-3"),
      ]);

    assert.equal(
      accepted,
      3
    );

    assert.equal(
      store.getStorageMode(),
      "in-memory-single-instance"
    );

    assert.deepEqual(
      store
        .readAll()
        .map(
          (record) =>
            record.event.eventId
        ),
      [
        "event-2",
        "event-3",
      ]
    );

    const copy =
      store.readAll();

    copy[0].event.properties.changed =
      true;

    assert.equal(
      store.readAll()[0]
        .event.properties.changed,
      undefined
    );

    assert.equal(
      store.write([
        createEvent("event-3"),
      ]),
      0
    );

    assert.equal(
      store.count(),
      2
    );

    now += 101;

    assert.equal(
      store.count(),
      0
    );
  }
);
