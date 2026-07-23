import {
  ANALYTICS_ENABLED,
  API_URL,
  RELEASE_SHA,
} from "../config/runtimeConfig";

import {
  bucketAnalyticsDuration,
} from "./analyticsBuckets";

import type {
  AnalyticsEntrySource,
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsPage,
  AnalyticsProperties,
  AnalyticsStage,
} from "./analyticsTypes";

const ANALYTICS_SESSION_STORAGE_KEY =
  "smartstay_analytics_session_v1";

const ANALYTICS_JOURNEY_STORAGE_KEY =
  "smartstay_analytics_journey_v1";

const ANALYTICS_SESSION_MAX_AGE_MS =
  120 * 60 * 1000;

const ANALYTICS_MAX_EVENT_BYTES =
  4096;

const ANALYTICS_MAX_BATCH_EVENTS =
  20;

const ANALYTICS_QUEUE_LIMIT =
  100;

const ANALYTICS_FLUSH_DELAY_MS =
  700;

const ANALYTICS_RETRY_DELAY_MS =
  4_000;

const ANALYTICS_ENDPOINT =
  `${API_URL}/analytics/events`;

const EVENT_PROPERTY_KEYS:
  Record<AnalyticsEventName, readonly string[]> = {
    page_view: [
      "entrySource",
    ],
    search_started: [
      "nightsBucket",
      "partySizeBucket",
      "roomCount",
      "budgetProvided",
      "distanceBand",
    ],
    search_completed: [
      "outcome",
      "durationBucket",
      "visibleResultsBucket",
    ],
    search_failed: [
      "outcome",
      "retryable",
      "publicCode",
      "durationBucket",
    ],
    results_viewed: [
      "visibleResultsBucket",
      "rolesShown",
    ],
    recommendation_selected: [
      "role",
      "selectionAction",
      "positionBucket",
    ],
    hotel_details_opened: [
      "role",
      "positionBucket",
    ],
    explanation_toggled: [
      "role",
      "expanded",
    ],
    search_preferences_changed: [
      "field",
      "changeKind",
    ],
    search_retried: [
      "stage",
      "recoveryAction",
    ],
    booking_recheck_started: [
      "role",
    ],
    booking_recheck_completed: [
      "role",
      "recheckState",
      "retryable",
    ],
    booking_handoff_prepared: [
      "role",
      "acceptedChanges",
    ],
    booking_handoff_opened: [
      "role",
    ],
    journey_abandoned: [
      "stage",
      "durationBucket",
    ],
    results_recovery_applied: [
      "recoveryAction",
    ],
  };

const REQUIRED_PROPERTY_KEYS:
  Record<AnalyticsEventName, readonly string[]> = {
    page_view: [],
    search_started:
      EVENT_PROPERTY_KEYS.search_started,
    search_completed:
      EVENT_PROPERTY_KEYS.search_completed,
    search_failed:
      EVENT_PROPERTY_KEYS.search_failed,
    results_viewed:
      EVENT_PROPERTY_KEYS.results_viewed,
    recommendation_selected:
      EVENT_PROPERTY_KEYS.recommendation_selected,
    hotel_details_opened:
      EVENT_PROPERTY_KEYS.hotel_details_opened,
    explanation_toggled:
      EVENT_PROPERTY_KEYS.explanation_toggled,
    search_preferences_changed:
      EVENT_PROPERTY_KEYS.search_preferences_changed,
    search_retried:
      EVENT_PROPERTY_KEYS.search_retried,
    booking_recheck_started:
      EVENT_PROPERTY_KEYS.booking_recheck_started,
    booking_recheck_completed:
      EVENT_PROPERTY_KEYS.booking_recheck_completed,
    booking_handoff_prepared:
      EVENT_PROPERTY_KEYS.booking_handoff_prepared,
    booking_handoff_opened:
      EVENT_PROPERTY_KEYS.booking_handoff_opened,
    journey_abandoned:
      EVENT_PROPERTY_KEYS.journey_abandoned,
    results_recovery_applied:
      EVENT_PROPERTY_KEYS.results_recovery_applied,
  };

type AnalyticsSessionRecord = {
  id: string;
  createdAt: number;
  lastSeenAt: number;
};

type AnalyticsJourneyRecord = {
  id: string;
  startedAt: number;
  stage: AnalyticsStage;
};

type PrivacyAwareNavigator =
  Navigator & {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string;
  };

type PrivacyAwareWindow =
  Window & {
    doNotTrack?: string;
  };

let analyticsQueue:
  AnalyticsEvent[] = [];

let flushTimer:
  number | null = null;

let flushInProgress =
  false;

let currentPage:
  AnalyticsPage =
    "home";

const emittedOnceKeys =
  new Set<string>();

const ANALYTICS_STAGES =
  new Set<AnalyticsStage>([
    "home",
    "loading",
    "results",
    "details",
    "recheck",
    "handoff",
  ]);

function isOpaqueId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9._-]{8,128}$/.test(
      value
    )
  );
}

function createOpaqueId() {
  const browserCrypto =
    globalThis.crypto;

  if (
    browserCrypto &&
    typeof browserCrypto.randomUUID ===
      "function"
  ) {
    return browserCrypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}

function safeSessionStorageGet(
  key: string
) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(
  key: string,
  value: string
) {
  try {
    sessionStorage.setItem(
      key,
      value
    );
  } catch {
    // Analytics must never affect the product flow.
  }
}

function safeSessionStorageRemove(
  key: string
) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Analytics must never affect the product flow.
  }
}

function clearAnalyticsState() {
  safeSessionStorageRemove(
    ANALYTICS_SESSION_STORAGE_KEY
  );
  safeSessionStorageRemove(
    ANALYTICS_JOURNEY_STORAGE_KEY
  );
  analyticsQueue = [];

  if (
    flushTimer !== null &&
    typeof window !==
      "undefined"
  ) {
    window.clearTimeout(
      flushTimer
    );
    flushTimer = null;
  }
}

export function isAnalyticsPrivacyOptedOut() {
  if (
    typeof navigator ===
      "undefined"
  ) {
    return true;
  }

  const privacyNavigator =
    navigator as PrivacyAwareNavigator;

  const privacyWindow =
    typeof window !==
      "undefined"
      ? window as PrivacyAwareWindow
      : null;

  const doNotTrackValues = [
    privacyNavigator.doNotTrack,
    privacyNavigator.msDoNotTrack,
    privacyWindow?.doNotTrack,
  ];

  return (
    doNotTrackValues.some(
      (value) => {
        const normalized =
          String(
            value ??
            ""
          )
            .trim()
            .toLowerCase();

        return (
          normalized === "1" ||
          normalized === "yes"
        );
      }
    ) ||
    privacyNavigator
      .globalPrivacyControl ===
      true
  );
}

export function isAnalyticsCollectionEnabled() {
  const enabled =
    ANALYTICS_ENABLED &&
    !isAnalyticsPrivacyOptedOut();

  if (!enabled) {
    clearAnalyticsState();
  }

  return enabled;
}

function getSessionRecord():
  AnalyticsSessionRecord | null {
  if (
    !isAnalyticsCollectionEnabled()
  ) {
    return null;
  }

  const now =
    Date.now();

  const raw =
    safeSessionStorageGet(
      ANALYTICS_SESSION_STORAGE_KEY
    );

  if (raw) {
    try {
      const parsed =
        JSON.parse(raw) as
          Partial<AnalyticsSessionRecord>;

      if (
        isOpaqueId(
          parsed.id
        ) &&
        typeof parsed.createdAt ===
          "number" &&
        now - parsed.createdAt <=
          ANALYTICS_SESSION_MAX_AGE_MS
      ) {
        const record:
          AnalyticsSessionRecord = {
            id: parsed.id,
            createdAt:
              parsed.createdAt,
            lastSeenAt:
              now,
          };

        safeSessionStorageSet(
          ANALYTICS_SESSION_STORAGE_KEY,
          JSON.stringify(record)
        );

        return record;
      }
    } catch {
      // Replace malformed analytics-only storage.
    }
  }

  const record:
    AnalyticsSessionRecord = {
      id: createOpaqueId(),
      createdAt: now,
      lastSeenAt: now,
    };

  safeSessionStorageSet(
    ANALYTICS_SESSION_STORAGE_KEY,
    JSON.stringify(record)
  );

  return record;
}

function getJourneyRecord():
  AnalyticsJourneyRecord | null {
  const raw =
    safeSessionStorageGet(
      ANALYTICS_JOURNEY_STORAGE_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as
        Partial<AnalyticsJourneyRecord>;

    if (
      isOpaqueId(
        parsed.id
      ) &&
      typeof parsed.startedAt ===
        "number" &&
      typeof parsed.stage ===
        "string" &&
      ANALYTICS_STAGES.has(
        parsed.stage as
          AnalyticsStage
      )
    ) {
      return parsed as
        AnalyticsJourneyRecord;
    }
  } catch {
    // Ignore malformed analytics-only storage.
  }

  safeSessionStorageRemove(
    ANALYTICS_JOURNEY_STORAGE_KEY
  );

  return null;
}

function saveJourneyRecord(
  record: AnalyticsJourneyRecord
) {
  safeSessionStorageSet(
    ANALYTICS_JOURNEY_STORAGE_KEY,
    JSON.stringify(record)
  );
}

export function beginAnalyticsJourney() {
  if (
    !isAnalyticsCollectionEnabled()
  ) {
    return null;
  }

  const record:
    AnalyticsJourneyRecord = {
      id: createOpaqueId(),
      startedAt: Date.now(),
      stage: "home",
    };

  saveJourneyRecord(record);
  emittedOnceKeys.clear();

  return record.id;
}

export function setAnalyticsJourneyStage(
  stage: AnalyticsStage
) {
  currentPage = stage;

  const journey =
    getJourneyRecord();

  if (!journey) {
    return;
  }

  saveJourneyRecord({
    ...journey,
    stage,
  });
}

export function completeAnalyticsJourney() {
  safeSessionStorageRemove(
    ANALYTICS_JOURNEY_STORAGE_KEY
  );
}

export function getAnalyticsJourneyDurationMs() {
  const journey =
    getJourneyRecord();

  return journey
    ? Math.max(
        0,
        Date.now() -
          journey.startedAt
      )
    : 0;
}

function getAnalyticsEntrySource():
  AnalyticsEntrySource {
  if (
    typeof document ===
      "undefined"
  ) {
    return "unknown";
  }

  if (!document.referrer) {
    return "direct";
  }

  try {
    const referrerOrigin =
      new URL(
        document.referrer
      ).origin;

    return referrerOrigin ===
      window.location.origin
      ? "internal"
      : "unknown";
  } catch {
    return "unknown";
  }
}

function hasValidProperties(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties
) {
  const keys =
    Object.keys(properties);

  const allowed =
    new Set(
      EVENT_PROPERTY_KEYS[eventName]
    );

  if (
    keys.some(
      (key) =>
        !allowed.has(key)
    )
  ) {
    return false;
  }

  return REQUIRED_PROPERTY_KEYS[
    eventName
  ].every(
    (key) =>
      Object.prototype
        .hasOwnProperty.call(
          properties,
          key
        )
  );
}

function getEventByteSize(
  event: AnalyticsEvent
) {
  return new TextEncoder()
    .encode(
      JSON.stringify(event)
    ).byteLength;
}

function enqueueAnalyticsEvent(
  event: AnalyticsEvent
) {
  if (
    getEventByteSize(event) >
      ANALYTICS_MAX_EVENT_BYTES
  ) {
    return;
  }

  analyticsQueue.push(event);

  if (
    analyticsQueue.length >
      ANALYTICS_QUEUE_LIMIT
  ) {
    analyticsQueue =
      analyticsQueue.slice(
        -ANALYTICS_QUEUE_LIMIT
      );
  }

  scheduleAnalyticsFlush();
}

function scheduleAnalyticsFlush(
  delayMs =
    ANALYTICS_FLUSH_DELAY_MS
) {
  if (
    typeof window ===
      "undefined" ||
    flushTimer !== null
  ) {
    return;
  }

  flushTimer =
    window.setTimeout(
      () => {
        flushTimer = null;
        void flushAnalyticsQueue();
      },
      delayMs
    );
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  page: AnalyticsPage,
  properties: AnalyticsProperties,
  {
    onceKey = null,
  }: {
    onceKey?: string | null;
  } = {}
) {
  try {
    if (
      !isAnalyticsCollectionEnabled() ||
      !hasValidProperties(
        eventName,
        properties
      )
    ) {
      return false;
    }

    if (
      onceKey &&
      emittedOnceKeys.has(onceKey)
    ) {
      return false;
    }

    const session =
      getSessionRecord();

    if (!session) {
      return false;
    }

    const journey =
      getJourneyRecord();

    const event:
      AnalyticsEvent = {
        eventId:
          createOpaqueId(),
        eventName,
        eventVersion: 1,
        occurredAt:
          new Date().toISOString(),
        sessionId:
          session.id,
        releaseSha:
          RELEASE_SHA,
        page,
        properties,
        ...(journey
          ? {
              journeyId:
                journey.id,
            }
          : {}),
      };

    if (onceKey) {
      emittedOnceKeys.add(onceKey);
    }

    enqueueAnalyticsEvent(event);
    return true;
  } catch {
    return false;
  }
}

export function trackAnalyticsPageView(
  page: AnalyticsPage
) {
  setAnalyticsJourneyStage(page);

  return trackAnalyticsEvent(
    "page_view",
    page,
    {
      entrySource:
        getAnalyticsEntrySource(),
    },
    {
      onceKey:
        `page-view:${page}`,
    }
  );
}

export function trackAnalyticsJourneyAbandonment() {
  const journey =
    getJourneyRecord();

  if (!journey) {
    return false;
  }

  const tracked =
    trackAnalyticsEvent(
      "journey_abandoned",
      currentPage,
      {
        stage:
          journey.stage,
        durationBucket:
          bucketAnalyticsDuration(
            Date.now() -
              journey.startedAt
          ),
      },
      {
        onceKey:
          "journey-abandoned",
      }
    );

  completeAnalyticsJourney();
  return tracked;
}

export async function flushAnalyticsQueue({
  keepalive = false,
}: {
  keepalive?: boolean;
} = {}) {
  if (
    flushInProgress ||
    analyticsQueue.length ===
      0 ||
    !isAnalyticsCollectionEnabled()
  ) {
    return;
  }

  flushInProgress = true;

  const maximumBatchEvents =
    keepalive
      ? Math.min(
          15,
          ANALYTICS_MAX_BATCH_EVENTS
        )
      : ANALYTICS_MAX_BATCH_EVENTS;

  const batch =
    analyticsQueue.splice(
      0,
      maximumBatchEvents
    );

  let shouldRetry =
    true;

  let retryDelayMs =
    ANALYTICS_RETRY_DELAY_MS;

  try {
    const response =
      await fetch(
        ANALYTICS_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "omit",
          cache: "no-store",
          referrerPolicy:
            "no-referrer",
          keepalive,
          body: JSON.stringify({
            events: batch,
          }),
        }
      );

    if (!response.ok) {
      const permanentClientFailure =
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429;

      shouldRetry =
        !permanentClientFailure;

      if (
        response.status === 429
      ) {
        const retryAfterSeconds =
          Number(
            response.headers.get(
              "Retry-After"
            )
          );

        if (
          Number.isFinite(
            retryAfterSeconds
          ) &&
          retryAfterSeconds > 0
        ) {
          retryDelayMs =
            Math.min(
              60_000,
              Math.max(
                ANALYTICS_RETRY_DELAY_MS,
                retryAfterSeconds *
                  1000
              )
            );
        }
      }

      throw new Error(
        "Analytics delivery failed."
      );
    }
  } catch {
    if (shouldRetry) {
      analyticsQueue = [
        ...batch,
        ...analyticsQueue,
      ].slice(
        -ANALYTICS_QUEUE_LIMIT
      );

      scheduleAnalyticsFlush(
        retryDelayMs
      );
    }
  } finally {
    flushInProgress = false;

    if (
      analyticsQueue.length > 0 &&
      flushTimer === null
    ) {
      scheduleAnalyticsFlush();
    }
  }
}
