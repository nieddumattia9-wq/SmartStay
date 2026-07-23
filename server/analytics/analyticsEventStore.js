"use strict";

const {
  AGGREGATED_METRIC_RETENTION_MS,
  DAY_MS,
  createAnalyticsAggregateState,
} = require(
  "./analyticsMeasurement"
);

const DEFAULT_MAX_EVENTS =
  20_000;

const RAW_EVENT_RETENTION_MS =
  30 * DAY_MS;

function cloneEvent(
  event
) {
  return {
    ...event,
    properties: {
      ...event.properties,
    },
  };
}

function createInMemoryAnalyticsEventStore({
  maxEvents =
    DEFAULT_MAX_EVENTS,
  retentionMs =
    RAW_EVENT_RETENTION_MS,
  aggregateRetentionMs =
    AGGREGATED_METRIC_RETENTION_MS,
  now =
    () => Date.now(),
} = {}) {
  if (
    !Number.isInteger(maxEvents) ||
    maxEvents <= 0
  ) {
    throw new TypeError(
      "Analytics store maxEvents must be a positive integer."
    );
  }

  if (
    !Number.isFinite(retentionMs) ||
    retentionMs <= 0
  ) {
    throw new TypeError(
      "Analytics store retentionMs must be positive."
    );
  }

  if (
    !Number.isFinite(
      aggregateRetentionMs
    ) ||
    aggregateRetentionMs <= 0
  ) {
    throw new TypeError(
      "Analytics aggregate retentionMs must be positive."
    );
  }

  let records = [];

  const aggregateState =
    createAnalyticsAggregateState({
      retentionMs:
        aggregateRetentionMs,
      journeyStateRetentionMs:
        retentionMs,
      now,
    });

  function pruneRaw() {
    const before =
      records.length;

    const cutoff =
      now() - retentionMs;

    records =
      records.filter(
        (record) =>
          record.receivedAt >= cutoff
      );

    if (
      records.length > maxEvents
    ) {
      records =
        records.slice(-maxEvents);
    }

    return before -
      records.length;
  }

  function prune() {
    return {
      removedRawEvents:
        pruneRaw(),
      ...aggregateState.prune(),
    };
  }

  function getStorageStatus() {
    prune();

    return Object.freeze({
      storageMode:
        "in-memory-single-instance",
      volatile: true,
      rawEventCount:
        records.length,
      aggregateBucketCount:
        aggregateState.countBuckets(),
      rawRetentionDays:
        Math.floor(
          retentionMs / DAY_MS
        ),
      aggregateRetentionDays:
        Math.floor(
          aggregateRetentionMs /
            DAY_MS
        ),
      maxRawEvents:
        maxEvents,
    });
  }

  function deleteData(
    scope = "all"
  ) {
    const allowedScopes =
      new Set([
        "expired",
        "raw",
        "aggregates",
        "all",
      ]);

    if (!allowedScopes.has(scope)) {
      throw new TypeError(
        "Analytics deletion scope is invalid."
      );
    }

    const before =
      getStorageStatus();

    if (scope === "expired") {
      prune();
    }

    if (
      scope === "raw" ||
      scope === "all"
    ) {
      records = [];
      aggregateState.clearJourneyState();
    }

    if (scope === "aggregates") {
      aggregateState.clear();
    }

    if (scope === "all") {
      aggregateState.clear();
    }

    return Object.freeze({
      scope,
      before,
      after:
        getStorageStatus(),
    });
  }

  return Object.freeze({
    write(events) {
      prune();

      const receivedAt =
        now();

      const knownEventIds =
        new Set(
          records.map(
            (record) =>
              record.event.eventId
          )
        );

      const acceptedEvents = [];

      for (const event of events) {
        if (
          knownEventIds.has(
            event.eventId
          )
        ) {
          continue;
        }

        knownEventIds.add(
          event.eventId
        );

        records.push({
          receivedAt,
          event:
            cloneEvent(event),
        });

        acceptedEvents.push(event);
      }

      if (
        acceptedEvents.length > 0
      ) {
        aggregateState.recordEvents(
          acceptedEvents
        );
      }

      prune();

      return acceptedEvents.length;
    },

    count() {
      prune();
      return records.length;
    },

    readAll() {
      prune();

      return records.map(
        (record) => ({
          receivedAt:
            record.receivedAt,
          event:
            cloneEvent(
              record.event
            ),
        })
      );
    },

    readAggregateBuckets(
      options = {}
    ) {
      return aggregateState
        .readBuckets(options);
    },

    getStorageStatus,

    deleteData,

    deleteExpired() {
      return deleteData(
        "expired"
      );
    },

    clear() {
      deleteData("all");
    },

    getStorageMode() {
      return "in-memory-single-instance";
    },
  });
}

module.exports = {
  DEFAULT_MAX_EVENTS,
  RAW_EVENT_RETENTION_MS,
  createInMemoryAnalyticsEventStore,
};
