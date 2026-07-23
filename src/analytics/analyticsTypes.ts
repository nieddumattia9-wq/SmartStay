export type AnalyticsPage =
  | "home"
  | "loading"
  | "results"
  | "details"
  | "recheck"
  | "handoff";

export type AnalyticsStage =
  AnalyticsPage;

export type AnalyticsRole =
  | "best-choice"
  | "best-sensible-saving"
  | "comfort-upgrade"
  | "best-location"
  | "unassigned";

export type AnalyticsPositionBucket =
  | "1"
  | "2-3"
  | "4-10"
  | "11+";

export type AnalyticsSearchOutcome =
  | "pending"
  | "results"
  | "no-results"
  | "partial-results"
  | "provider-error"
  | "timeout"
  | "rate-limited"
  | "session-expired"
  | "session-missing"
  | "cancelled";

export type AnalyticsRecheckState =
  | "confirmed"
  | "changed"
  | "sold-out"
  | "recheck-required";

export type AnalyticsDurationBucket =
  | "under-2s"
  | "2-5s"
  | "5-15s"
  | "15-30s"
  | "30-60s"
  | "1-3m"
  | "over-3m";

export type AnalyticsVisibleResultsBucket =
  | "0"
  | "1-3"
  | "4-10"
  | "11-25"
  | "26+";

export type AnalyticsNightsBucket =
  | "1-2"
  | "3-7"
  | "8-14"
  | "15-30"
  | "31-90";

export type AnalyticsPartySizeBucket =
  | "1"
  | "2"
  | "3-4"
  | "5-8"
  | "9-32";

export type AnalyticsDistanceBand =
  | "500m"
  | "1km"
  | "2km"
  | "5km"
  | "10km"
  | "any";

export type AnalyticsEntrySource =
  | "direct"
  | "internal"
  | "campaign"
  | "unknown";

export type AnalyticsSelectionAction =
  | "details"
  | "explanation"
  | "recheck"
  | "handoff";

export type AnalyticsPreferenceField =
  | "budget"
  | "distance"
  | "preference";

export type AnalyticsChangeKind =
  | "increased"
  | "decreased"
  | "cleared"
  | "selected";

export type AnalyticsRecoveryAction =
  | "retry"
  | "new-search"
  | "relax-distance"
  | "raise-budget"
  | "view-partial";

export type AnalyticsPrimitive =
  | boolean
  | number
  | string;

export type AnalyticsPropertyValue =
  | AnalyticsPrimitive
  | string[];

export type AnalyticsProperties =
  Record<
    string,
    AnalyticsPropertyValue
  >;

export type AnalyticsEventName =
  | "page_view"
  | "search_started"
  | "search_completed"
  | "search_failed"
  | "results_viewed"
  | "recommendation_selected"
  | "hotel_details_opened"
  | "explanation_toggled"
  | "search_preferences_changed"
  | "search_retried"
  | "booking_recheck_started"
  | "booking_recheck_completed"
  | "booking_handoff_prepared"
  | "booking_handoff_opened"
  | "journey_abandoned"
  | "results_recovery_applied";

export type AnalyticsEvent = {
  eventId: string;
  eventName: AnalyticsEventName;
  eventVersion: 1;
  occurredAt: string;
  sessionId: string;
  releaseSha: string;
  page: AnalyticsPage;
  properties: AnalyticsProperties;
  journeyId?: string;
};
