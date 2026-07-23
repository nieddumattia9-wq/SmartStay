"use strict";

const DEFAULT_MAX_EVENTS =
  20_000;

const RAW_EVENT_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000;

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

  let records =
    [];

  function prune() {
    const cutoff =
      now() - retentionMs;

    records =
      records.filter(
        (record) =>
          record.receivedAt >=
          cutoff
      );

    if (
      records.length >
        maxEvents
    ) {
      records =
        records.slice(
          -maxEvents
        );
    }
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

      let accepted =
        0;

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

        accepted += 1;
      }

      prune();

      return accepted;
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

    clear() {
      records = [];
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
