export type SearchLifecyclePhase =
  | "starting"
  | "running"
  | "complete";

export type SearchLifecycleOutcome =
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

export interface SearchLifecycle {
  phase: SearchLifecyclePhase;
  outcome: SearchLifecycleOutcome;
  retryable: boolean;
  publicCode: string;
  retryAfterMs: number | null;
}

export interface SearchLifecycleCarrier {
  lifecycle?: SearchLifecycle | null;
  status?: string | null;
  totalHotels?: number | null;
}

const COMPLETED_OUTCOMES =
  new Set<SearchLifecycleOutcome>([
    "results",
    "no-results",
    "partial-results",
  ]);

const FAILURE_OUTCOMES =
  new Set<SearchLifecycleOutcome>([
    "provider-error",
    "timeout",
    "rate-limited",
    "session-expired",
    "session-missing",
    "cancelled",
  ]);

export function isSearchLifecycleComplete(
  carrier: SearchLifecycleCarrier
) {
  if (
    carrier.lifecycle?.phase ===
      "complete" &&
    COMPLETED_OUTCOMES.has(
      carrier.lifecycle.outcome
    )
  ) {
    return true;
  }

  return carrier.status ===
    "Completed";
}

export function isSearchLifecycleFailure(
  carrier: SearchLifecycleCarrier
) {
  if (
    carrier.lifecycle &&
    FAILURE_OUTCOMES.has(
      carrier.lifecycle.outcome
    )
  ) {
    return true;
  }

  return carrier.status ===
    "Failed" &&
    !(
      Number(carrier.totalHotels) > 0
    );
}

export function hasPartialSearchResults(
  carrier: SearchLifecycleCarrier
) {
  return (
    carrier.lifecycle?.outcome ===
      "partial-results" ||
    (
      carrier.status === "Failed" &&
      Number(carrier.totalHotels) > 0
    )
  );
}

export function getSearchLifecycleLabel(
  lifecycle?: SearchLifecycle | null
) {
  switch (lifecycle?.outcome) {
    case "results":
      return "Completed";

    case "no-results":
      return "Completed — no stays found";

    case "partial-results":
      return "Partial results";

    case "rate-limited":
      return "Temporarily rate limited";

    case "timeout":
      return "Timed out";

    case "provider-error":
      return "Provider unavailable";

    case "session-expired":
      return "Expired";

    case "session-missing":
      return "Unavailable";

    case "cancelled":
      return "Cancelled";

    case "pending":
      return lifecycle.phase === "starting"
        ? "Starting"
        : "In progress";

    default:
      return null;
  }
}
