import type {
  AnalyticsChangeKind,
  AnalyticsDistanceBand,
  AnalyticsDurationBucket,
  AnalyticsNightsBucket,
  AnalyticsPartySizeBucket,
  AnalyticsPositionBucket,
  AnalyticsRole,
  AnalyticsVisibleResultsBucket,
} from "./analyticsTypes";

export function bucketAnalyticsDuration(
  durationMs: number
): AnalyticsDurationBucket {
  const value =
    Number.isFinite(durationMs)
      ? Math.max(0, durationMs)
      : 0;

  if (value < 2_000) return "under-2s";
  if (value < 5_000) return "2-5s";
  if (value < 15_000) return "5-15s";
  if (value < 30_000) return "15-30s";
  if (value < 60_000) return "30-60s";
  if (value < 180_000) return "1-3m";
  return "over-3m";
}

export function bucketAnalyticsResults(
  count: number
): AnalyticsVisibleResultsBucket {
  const value =
    Number.isFinite(count)
      ? Math.max(0, Math.floor(count))
      : 0;

  if (value === 0) return "0";
  if (value <= 3) return "1-3";
  if (value <= 10) return "4-10";
  if (value <= 25) return "11-25";
  return "26+";
}

export function bucketAnalyticsNights(
  nights: number | null
): AnalyticsNightsBucket {
  const value =
    typeof nights === "number" &&
    Number.isFinite(nights)
      ? Math.max(1, Math.floor(nights))
      : 1;

  if (value <= 2) return "1-2";
  if (value <= 7) return "3-7";
  if (value <= 14) return "8-14";
  if (value <= 30) return "15-30";
  return "31-90";
}

export function bucketAnalyticsPartySize(
  partySize: number
): AnalyticsPartySizeBucket {
  const value =
    Number.isFinite(partySize)
      ? Math.max(1, Math.floor(partySize))
      : 1;

  if (value === 1) return "1";
  if (value === 2) return "2";
  if (value <= 4) return "3-4";
  if (value <= 8) return "5-8";
  return "9-32";
}

export function bucketAnalyticsDistance(
  maxDistanceKm: number | null
): AnalyticsDistanceBand {
  if (maxDistanceKm === null) return "any";
  if (maxDistanceKm <= 0.5) return "500m";
  if (maxDistanceKm <= 1) return "1km";
  if (maxDistanceKm <= 2) return "2km";
  if (maxDistanceKm <= 5) return "5km";
  return "10km";
}

export function bucketAnalyticsPosition(
  zeroBasedIndex: number
): AnalyticsPositionBucket {
  if (zeroBasedIndex <= 0) return "1";
  if (zeroBasedIndex <= 2) return "2-3";
  if (zeroBasedIndex <= 9) return "4-10";
  return "11+";
}

export function getAnalyticsChangeKind(
  previousValue: number | null,
  nextValue: number | null
): AnalyticsChangeKind {
  if (nextValue === null) return "cleared";
  if (previousValue === null) return "selected";
  if (nextValue > previousValue) return "increased";
  if (nextValue < previousValue) return "decreased";
  return "selected";
}

export function mapAnalyticsRole(
  role: string | null | undefined
): AnalyticsRole {
  switch (role) {
    case "best-choice":
      return "best-choice";

    case "cheaper-alternative":
    case "best-sensible-saving":
      return "best-sensible-saving";

    case "comfort-upgrade":
      return "comfort-upgrade";

    case "best-location":
      return "best-location";

    default:
      return "unassigned";
  }
}
