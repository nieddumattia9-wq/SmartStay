"use strict";

const DAY_MS =
  24 * 60 * 60 * 1000;

const AGGREGATED_METRIC_RETENTION_MS =
  180 * DAY_MS;

const DURATION_BUCKET_ORDER =
  Object.freeze([
    "under-2s",
    "2-5s",
    "5-15s",
    "15-30s",
    "30-60s",
    "1-3m",
    "over-3m",
  ]);

const JOURNEY_COUNT_KEYS =
  Object.freeze([
    "searchesStarted",
    "searchesCompleted",
    "searchesFailed",
    "visibleResults",
    "noResults",
    "partialResults",
    "providerErrors",
    "resultsViewed",
    "recommendationsSelected",
    "detailsOpened",
    "rechecksStarted",
    "handoffsOpened",
    "recoveriesUsed",
    "journeysAbandoned",
  ]);

const FIRST_CHOICE_EVENT_NAMES =
  new Set([
    "recommendation_selected",
    "hotel_details_opened",
    "booking_recheck_started",
    "booking_handoff_opened",
  ]);

function createCounter() {
  return Object.create(null);
}

function incrementCounter(
  counter,
  key
) {
  if (
    typeof key !== "string" ||
    key.length === 0
  ) {
    return;
  }

  counter[key] =
    (counter[key] ?? 0) + 1;
}

function createJourneyCounts() {
  return Object.fromEntries(
    JOURNEY_COUNT_KEYS.map(
      (key) => [key, 0]
    )
  );
}

function createDailyAggregate(
  day
) {
  return {
    day,
    eventCounts:
      createCounter(),
    searchOutcomeCounts:
      createCounter(),
    searchDurationBuckets:
      createCounter(),
    visibleResultsBuckets:
      createCounter(),
    rolesShownCounts:
      createCounter(),
    selectedRoleCounts:
      createCounter(),
    selectionActionCounts:
      createCounter(),
    preferenceFieldCounts:
      createCounter(),
    preferenceChangeCounts:
      createCounter(),
    handoffAcceptedChangesCounts:
      createCounter(),
    recheckStateCounts:
      createCounter(),
    recoveryActionCounts:
      createCounter(),
    abandonmentStageCounts:
      createCounter(),
    firstChoiceDurationBuckets:
      createCounter(),
    journeyCounts:
      createJourneyCounts(),
  };
}

function toUtcDay(
  timestamp
) {
  return new Date(timestamp)
    .toISOString()
    .slice(0, 10);
}

function bucketDurationMs(
  durationMs
) {
  const normalized =
    Math.max(
      0,
      Number(durationMs) || 0
    );

  if (normalized < 2_000) {
    return "under-2s";
  }

  if (normalized < 5_000) {
    return "2-5s";
  }

  if (normalized < 15_000) {
    return "5-15s";
  }

  if (normalized < 30_000) {
    return "15-30s";
  }

  if (normalized < 60_000) {
    return "30-60s";
  }

  if (normalized < 180_000) {
    return "1-3m";
  }

  return "over-3m";
}

function cloneValue(
  value
) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function createAnalyticsAggregateState({
  retentionMs =
    AGGREGATED_METRIC_RETENTION_MS,
  journeyStateRetentionMs,
  now =
    () => Date.now(),
} = {}) {
  if (
    !Number.isFinite(retentionMs) ||
    retentionMs <= 0
  ) {
    throw new TypeError(
      "Analytics aggregate retentionMs must be positive."
    );
  }

  if (
    !Number.isFinite(
      journeyStateRetentionMs
    ) ||
    journeyStateRetentionMs <= 0
  ) {
    throw new TypeError(
      "Analytics journey state retention must be positive."
    );
  }

  const dailyBuckets =
    new Map();

  const journeyStates =
    new Map();

  function getBucket(
    timestamp
  ) {
    const day =
      toUtcDay(timestamp);

    if (!dailyBuckets.has(day)) {
      dailyBuckets.set(
        day,
        createDailyAggregate(day)
      );
    }

    return dailyBuckets.get(day);
  }

  function getJourneyState(
    event,
    timestamp
  ) {
    if (
      typeof event.journeyId !==
        "string"
    ) {
      return null;
    }

    let state =
      journeyStates.get(
        event.journeyId
      );

    if (!state) {
      state = {
        startedAt: null,
        firstChoiceAt: null,
        firstChoiceRecorded: false,
        lastSeenAt: timestamp,
        flags: new Set(),
        terminal: null,
      };

      journeyStates.set(
        event.journeyId,
        state
      );
    }

    state.lastSeenAt =
      Math.max(
        state.lastSeenAt,
        timestamp
      );

    return state;
  }

  function incrementJourneyOnce(
    state,
    bucket,
    flag,
    countKey
  ) {
    if (
      !state ||
      state.flags.has(flag)
    ) {
      return;
    }

    state.flags.add(flag);
    bucket.journeyCounts[
      countKey
    ] += 1;
  }

  function adjustJourneyCount(
    day,
    countKey,
    delta
  ) {
    const bucket =
      dailyBuckets.get(day);

    if (!bucket) {
      return;
    }

    bucket.journeyCounts[countKey] =
      Math.max(
        0,
        bucket.journeyCounts[countKey] +
          delta
      );
  }

  function removeTerminalOutcome(
    state
  ) {
    const terminal =
      state?.terminal;

    if (!terminal) {
      return;
    }

    for (const countKey of terminal.countKeys) {
      adjustJourneyCount(
        terminal.day,
        countKey,
        -1
      );
    }

    state.terminal = null;
  }

  function recordTerminalOutcome(
    state,
    bucket,
    kind,
    outcome
  ) {
    if (!state) {
      return;
    }

    removeTerminalOutcome(state);

    const countKeys =
      kind === "completed"
        ? ["searchesCompleted"]
        : ["searchesFailed"];

    if (
      outcome === "results" ||
      outcome === "partial-results"
    ) {
      countKeys.push(
        "visibleResults"
      );
    }

    if (outcome === "no-results") {
      countKeys.push("noResults");
    }

    if (
      outcome === "partial-results"
    ) {
      countKeys.push(
        "partialResults"
      );
    }

    if (
      outcome === "provider-error"
    ) {
      countKeys.push(
        "providerErrors"
      );
    }

    for (const countKey of countKeys) {
      bucket.journeyCounts[countKey] += 1;
    }

    state.terminal = {
      day: bucket.day,
      countKeys,
    };
  }

  function recordFirstChoice(
    state,
    timestamp
  ) {
    if (!state) {
      return;
    }

    if (
      state.firstChoiceAt === null ||
      timestamp < state.firstChoiceAt
    ) {
      state.firstChoiceAt =
        timestamp;
    }

    if (
      state.firstChoiceRecorded ||
      state.startedAt === null ||
      state.firstChoiceAt <
        state.startedAt
    ) {
      return;
    }

    const bucket =
      getBucket(
        state.firstChoiceAt
      );

    incrementCounter(
      bucket.firstChoiceDurationBuckets,
      bucketDurationMs(
        state.firstChoiceAt -
          state.startedAt
      )
    );

    state.firstChoiceRecorded =
      true;
  }

  function recordEvent(
    event
  ) {
    const occurredAt =
      Date.parse(
        event.occurredAt
      );

    if (!Number.isFinite(occurredAt)) {
      return;
    }

    const bucket =
      getBucket(occurredAt);

    const state =
      getJourneyState(
        event,
        occurredAt
      );

    incrementCounter(
      bucket.eventCounts,
      event.eventName
    );

    const properties =
      event.properties ?? {};

    switch (event.eventName) {
      case "search_started":
        if (state) {
          if (
            state.startedAt === null ||
            occurredAt < state.startedAt
          ) {
            state.startedAt =
              occurredAt;
          }

          incrementJourneyOnce(
            state,
            bucket,
            "search-started",
            "searchesStarted"
          );

          if (
            state.firstChoiceAt !== null
          ) {
            recordFirstChoice(
              state,
              state.firstChoiceAt
            );
          }
        }
        break;

      case "search_completed":
        incrementCounter(
          bucket.searchOutcomeCounts,
          properties.outcome
        );
        incrementCounter(
          bucket.searchDurationBuckets,
          properties.durationBucket
        );
        incrementCounter(
          bucket.visibleResultsBuckets,
          properties.visibleResultsBucket
        );
        recordTerminalOutcome(
          state,
          bucket,
          "completed",
          properties.outcome
        );
        break;

      case "search_failed":
        incrementCounter(
          bucket.searchOutcomeCounts,
          properties.outcome
        );
        incrementCounter(
          bucket.searchDurationBuckets,
          properties.durationBucket
        );
        recordTerminalOutcome(
          state,
          bucket,
          "failed",
          properties.outcome
        );
        break;

      case "results_viewed":
        incrementCounter(
          bucket.visibleResultsBuckets,
          properties.visibleResultsBucket
        );

        for (
          const role of
          properties.rolesShown ?? []
        ) {
          incrementCounter(
            bucket.rolesShownCounts,
            role
          );
        }

        incrementJourneyOnce(
          state,
          bucket,
          "results-viewed",
          "resultsViewed"
        );
        break;

      case "recommendation_selected":
        incrementCounter(
          bucket.selectedRoleCounts,
          properties.role
        );
        incrementCounter(
          bucket.selectionActionCounts,
          properties.selectionAction
        );
        incrementJourneyOnce(
          state,
          bucket,
          "recommendation-selected",
          "recommendationsSelected"
        );
        break;

      case "hotel_details_opened":
        incrementJourneyOnce(
          state,
          bucket,
          "details-opened",
          "detailsOpened"
        );
        break;

      case "search_preferences_changed":
        incrementCounter(
          bucket.preferenceFieldCounts,
          properties.field
        );
        incrementCounter(
          bucket.preferenceChangeCounts,
          `${properties.field}:${properties.changeKind}`
        );
        break;

      case "booking_handoff_prepared":
        incrementCounter(
          bucket.handoffAcceptedChangesCounts,
          properties.acceptedChanges
            ? "accepted"
            : "unchanged"
        );
        break;

      case "booking_recheck_started":
        incrementJourneyOnce(
          state,
          bucket,
          "recheck-started",
          "rechecksStarted"
        );
        break;

      case "booking_recheck_completed":
        incrementCounter(
          bucket.recheckStateCounts,
          properties.recheckState
        );
        break;

      case "booking_handoff_opened":
        incrementJourneyOnce(
          state,
          bucket,
          "handoff-opened",
          "handoffsOpened"
        );
        break;

      case "search_retried":
      case "results_recovery_applied":
        incrementCounter(
          bucket.recoveryActionCounts,
          properties.recoveryAction
        );
        incrementJourneyOnce(
          state,
          bucket,
          "recovery-used",
          "recoveriesUsed"
        );
        break;

      case "journey_abandoned":
        incrementCounter(
          bucket.abandonmentStageCounts,
          properties.stage
        );
        incrementJourneyOnce(
          state,
          bucket,
          "journey-abandoned",
          "journeysAbandoned"
        );
        break;

      default:
        break;
    }

    if (
      FIRST_CHOICE_EVENT_NAMES.has(
        event.eventName
      )
    ) {
      recordFirstChoice(
        state,
        occurredAt
      );
    }
  }

  function prune() {
    const currentTime =
      now();

    const aggregateCutoffDay =
      toUtcDay(
        currentTime -
          retentionMs
      );

    let removedAggregateBuckets =
      0;

    for (const day of dailyBuckets.keys()) {
      if (day < aggregateCutoffDay) {
        dailyBuckets.delete(day);
        removedAggregateBuckets += 1;
      }
    }

    const journeyCutoff =
      currentTime -
      journeyStateRetentionMs;

    let removedJourneyStates =
      0;

    for (
      const [
        journeyId,
        state,
      ] of journeyStates.entries()
    ) {
      if (
        state.lastSeenAt <
          journeyCutoff
      ) {
        journeyStates.delete(
          journeyId
        );
        removedJourneyStates += 1;
      }
    }

    return {
      removedAggregateBuckets,
      removedJourneyStates,
    };
  }

  function readBuckets({
    windowDays = 180,
  } = {}) {
    prune();

    const normalizedWindowDays =
      Math.min(
        180,
        Math.max(
          1,
          Number.parseInt(
            String(windowDays),
            10
          ) || 1
        )
      );

    const cutoffDay =
      toUtcDay(
        now() -
          (
            normalizedWindowDays - 1
          ) * DAY_MS
      );

    return [
      ...dailyBuckets.values(),
    ]
      .filter(
        (bucket) =>
          bucket.day >= cutoffDay
      )
      .sort(
        (left, right) =>
          left.day.localeCompare(
            right.day
          )
      )
      .map(cloneValue);
  }

  return Object.freeze({
    recordEvents(events) {
      const sortedEvents =
        [...events].sort(
          (left, right) =>
            Date.parse(left.occurredAt) -
            Date.parse(right.occurredAt)
        );

      for (const event of sortedEvents) {
        recordEvent(event);
      }

      prune();
    },

    readBuckets,

    clear() {
      dailyBuckets.clear();
      journeyStates.clear();
    },

    clearAggregates() {
      dailyBuckets.clear();
    },

    clearJourneyState() {
      journeyStates.clear();
    },

    prune,

    countBuckets() {
      prune();
      return dailyBuckets.size;
    },
  });
}

function sumCounters(
  target,
  source
) {
  for (
    const [key, value] of
    Object.entries(source ?? {})
  ) {
    target[key] =
      (target[key] ?? 0) +
      value;
  }
}

function sumJourneyCounts(
  target,
  source
) {
  for (const key of JOURNEY_COUNT_KEYS) {
    target[key] +=
      Number(source?.[key] ?? 0);
  }
}

function createPreferenceDimensionCounts(
  counter
) {
  return Object.freeze({
    budgetChanges:
      Number(counter?.budget ?? 0),
    distanceChanges:
      Number(counter?.distance ?? 0),
    preferenceChanges:
      Number(counter?.preference ?? 0),
  });
}

function createPreferenceChangeKindCounts(
  counter
) {
  const result = {
    increased: 0,
    decreased: 0,
    cleared: 0,
    selected: 0,
  };

  for (
    const [compoundKey, count] of
    Object.entries(counter ?? {})
  ) {
    const separatorIndex =
      compoundKey.indexOf(":");

    if (separatorIndex < 0) {
      continue;
    }

    const changeKind =
      compoundKey.slice(
        separatorIndex + 1
      );

    if (
      Object.prototype
        .hasOwnProperty.call(
          result,
          changeKind
        )
    ) {
      result[changeKind] +=
        Number(count ?? 0);
    }
  }

  return Object.freeze(result);
}

function safeRate(
  numerator,
  denominator
) {
  if (denominator <= 0) {
    return null;
  }

  return Number(
    (
      numerator /
      denominator
    ).toFixed(4)
  );
}

function findMedianBucket(
  counter,
  order =
    DURATION_BUCKET_ORDER
) {
  const total =
    order.reduce(
      (sum, key) =>
        sum +
        Number(counter[key] ?? 0),
      0
    );

  if (total === 0) {
    return null;
  }

  const target =
    Math.ceil(total / 2);

  let cumulative = 0;

  for (const key of order) {
    cumulative +=
      Number(counter[key] ?? 0);

    if (cumulative >= target) {
      return key;
    }
  }

  return order[
    order.length - 1
  ];
}

function getSampleReadiness(
  searchStarts
) {
  if (searchStarts >= 100) {
    return "usable-beta-sample";
  }

  if (searchStarts >= 20) {
    return "early-signal";
  }

  return "insufficient-sample";
}

function createAnalyticsBetaReport({
  buckets,
  storageStatus,
  windowDays,
  now =
    () => Date.now(),
} = {}) {
  const eventCounts =
    createCounter();
  const searchOutcomeCounts =
    createCounter();
  const searchDurationBuckets =
    createCounter();
  const visibleResultsBuckets =
    createCounter();
  const rolesShownCounts =
    createCounter();
  const selectedRoleCounts =
    createCounter();
  const selectionActionCounts =
    createCounter();
  const preferenceFieldCounts =
    createCounter();
  const preferenceChangeCounts =
    createCounter();
  const handoffAcceptedChangesCounts =
    createCounter();
  const recheckStateCounts =
    createCounter();
  const recoveryActionCounts =
    createCounter();
  const abandonmentStageCounts =
    createCounter();
  const firstChoiceDurationBuckets =
    createCounter();
  const journeyCounts =
    createJourneyCounts();

  for (const bucket of buckets ?? []) {
    sumCounters(
      eventCounts,
      bucket.eventCounts
    );
    sumCounters(
      searchOutcomeCounts,
      bucket.searchOutcomeCounts
    );
    sumCounters(
      searchDurationBuckets,
      bucket.searchDurationBuckets
    );
    sumCounters(
      visibleResultsBuckets,
      bucket.visibleResultsBuckets
    );
    sumCounters(
      rolesShownCounts,
      bucket.rolesShownCounts
    );
    sumCounters(
      selectedRoleCounts,
      bucket.selectedRoleCounts
    );
    sumCounters(
      selectionActionCounts,
      bucket.selectionActionCounts
    );
    sumCounters(
      preferenceFieldCounts,
      bucket.preferenceFieldCounts
    );
    sumCounters(
      preferenceChangeCounts,
      bucket.preferenceChangeCounts
    );
    sumCounters(
      handoffAcceptedChangesCounts,
      bucket.handoffAcceptedChangesCounts
    );
    sumCounters(
      recheckStateCounts,
      bucket.recheckStateCounts
    );
    sumCounters(
      recoveryActionCounts,
      bucket.recoveryActionCounts
    );
    sumCounters(
      abandonmentStageCounts,
      bucket.abandonmentStageCounts
    );
    sumCounters(
      firstChoiceDurationBuckets,
      bucket.firstChoiceDurationBuckets
    );
    sumJourneyCounts(
      journeyCounts,
      bucket.journeyCounts
    );
  }

  const terminalSearches =
    journeyCounts.searchesCompleted +
    journeyCounts.searchesFailed;

  const resultsJourneys =
    journeyCounts.resultsViewed;

  const recoveryEligible =
    journeyCounts.noResults +
    journeyCounts.searchesFailed;

  return Object.freeze({
    schemaVersion: "1.0.0",
    generatedAt:
      new Date(now()).toISOString(),
    windowDays,
    sampleReadiness:
      getSampleReadiness(
        journeyCounts.searchesStarted
      ),
    storage: {
      mode:
        storageStatus.storageMode,
      volatile:
        storageStatus.volatile,
      rawEventCount:
        storageStatus.rawEventCount,
      aggregateBucketCount:
        storageStatus.aggregateBucketCount,
      rawRetentionDays:
        storageStatus.rawRetentionDays,
      aggregateRetentionDays:
        storageStatus.aggregateRetentionDays,
    },
    metrics: {
      searchStartedCount:
        journeyCounts.searchesStarted,
      searchCompletedCount:
        journeyCounts.searchesCompleted,
      searchFailedCount:
        journeyCounts.searchesFailed,
      searchCompletionRate:
        safeRate(
          journeyCounts.searchesCompleted,
          journeyCounts.searchesStarted
        ),
      visibleResultsRate:
        safeRate(
          journeyCounts.visibleResults,
          journeyCounts.searchesStarted
        ),
      noResultsRate:
        safeRate(
          journeyCounts.noResults,
          terminalSearches
        ),
      partialResultsRate:
        safeRate(
          journeyCounts.partialResults,
          terminalSearches
        ),
      providerErrorRate:
        safeRate(
          journeyCounts.providerErrors,
          terminalSearches
        ),
      detailsOpenRate:
        safeRate(
          journeyCounts.detailsOpened,
          resultsJourneys
        ),
      recommendationSelectionRate:
        safeRate(
          journeyCounts.recommendationsSelected,
          resultsJourneys
        ),
      recheckRate:
        safeRate(
          journeyCounts.rechecksStarted,
          resultsJourneys
        ),
      handoffRate:
        safeRate(
          journeyCounts.handoffsOpened,
          resultsJourneys
        ),
      recoveryUsageRate:
        safeRate(
          journeyCounts.recoveriesUsed,
          recoveryEligible
        ),
      journeyAbandonmentRate:
        safeRate(
          journeyCounts.journeysAbandoned,
          journeyCounts.searchesStarted
        ),
      medianSearchDurationBucket:
        findMedianBucket(
          searchDurationBuckets
        ),
      medianTimeToFirstChoiceBucket:
        findMedianBucket(
          firstChoiceDurationBuckets
        ),
    },
    distributions: {
      eventCounts,
      searchOutcomeCounts,
      searchDurationBuckets,
      visibleResultsBuckets,
      rolesShownCounts,
      selectedRoleCounts,
      selectionActionCounts,
      preferenceDimensionCounts:
        createPreferenceDimensionCounts(
          preferenceFieldCounts
        ),
      preferenceChangeKindCounts:
        createPreferenceChangeKindCounts(
          preferenceChangeCounts
        ),
      handoffAcceptedChangesCounts,
      recheckStateCounts,
      recoveryActionCounts,
      abandonmentStageCounts,
      firstChoiceDurationBuckets,
    },
    definitions: {
      searchCompletionRate:
        "Completed search journeys divided by started search journeys.",
      visibleResultsRate:
        "Journeys that produced results or partial results divided by started search journeys.",
      noResultsRate:
        "No-results journeys divided by terminal search journeys.",
      partialResultsRate:
        "Partial-results journeys divided by terminal search journeys.",
      providerErrorRate:
        "Provider-error journeys divided by terminal search journeys.",
      engagementRates:
        "Journey-level first occurrence divided by journeys that viewed results.",
      recoveryUsageRate:
        "Journeys using recovery divided by no-results plus failed journeys.",
    },
  });
}

module.exports = {
  AGGREGATED_METRIC_RETENTION_MS,
  DAY_MS,
  DURATION_BUCKET_ORDER,
  JOURNEY_COUNT_KEYS,
  bucketDurationMs,
  createAnalyticsAggregateState,
  createAnalyticsBetaReport,
};
