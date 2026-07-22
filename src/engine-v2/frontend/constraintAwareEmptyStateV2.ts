export type SmartStayEmptyStateReasonV2 =
  | "provider-no-results"
  | "distance-constraint"
  | "budget-constraint"
  | "reliability-gate"
  | "product-policy"
  | "unknown";

export interface SmartStayEmptyStateV2 {
  reason:
    SmartStayEmptyStateReasonV2;

  providerHotelCount:
    number;

  visibleHotelCount:
    number;

  distanceExceededCount:
    number;

  budgetHiddenCount:
    number;

  reliabilityBlockedCount:
    number;

  mandatoryConstraintExceededCount:
    number;

  productPolicyExcludedCount:
    number;

  maximumDistanceKm:
    number | null;

  totalBudget:
    number | null;

  recoveryDistanceKmOptions:
    Array<number | null>;
}

export interface SmartStayEmptyStateDiagnosticInputV2 {
  providerHotelCount:
    number;

  visibleHotelCount:
    number;

  distanceExceededCount?:
    number;

  budgetHiddenCount?:
    number;

  reliabilityBlockedCount?:
    number;

  mandatoryConstraintExceededCount?:
    number;

  productPolicyExcludedCount?:
    number;

  maximumDistanceKm?:
    number | null;

  totalBudget?:
    number | null;

  recoveryCandidateDistancesKm?:
    number[];
}

const DISTANCE_RECOVERY_STEPS_KM = [
  0.5,
  1,
  2,
  5,
  10,
] as const;

function normalizeCount(
  value:
    unknown
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  return Math.floor(value);
}

function normalizeOptionalNumber(
  value:
    unknown
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function buildDistanceRecoveryOptions(
  currentMaximumDistanceKm:
    number,
  candidateDistancesKm:
    number[]
): Array<number | null> {
  const meaningfulDistances =
    candidateDistancesKm
      .filter(
        (distance) =>
          Number.isFinite(distance) &&
          distance >
            currentMaximumDistanceKm
      )
      .sort(
        (first, second) =>
          first - second
      );

  const usefulSteps:
    number[] = [];

  for (
    const step of
    DISTANCE_RECOVERY_STEPS_KM
  ) {
    if (
      step <=
      currentMaximumDistanceKm
    ) {
      continue;
    }

    const unlocksCandidate =
      meaningfulDistances.some(
        (distance) =>
          distance <= step
      );

    if (!unlocksCandidate) {
      continue;
    }

    usefulSteps.push(step);

    if (usefulSteps.length >= 2) {
      break;
    }
  }

  return [
    ...usefulSteps,
    null,
  ];
}

export function diagnoseSmartStayEmptyStateV2(
  input:
    SmartStayEmptyStateDiagnosticInputV2
): SmartStayEmptyStateV2 | null {
  const providerHotelCount =
    normalizeCount(
      input.providerHotelCount
    );

  const visibleHotelCount =
    normalizeCount(
      input.visibleHotelCount
    );

  if (visibleHotelCount > 0) {
    return null;
  }

  const distanceExceededCount =
    normalizeCount(
      input.distanceExceededCount
    );

  const budgetHiddenCount =
    normalizeCount(
      input.budgetHiddenCount
    );

  const reliabilityBlockedCount =
    normalizeCount(
      input.reliabilityBlockedCount
    );

  const mandatoryConstraintExceededCount =
    normalizeCount(
      input.mandatoryConstraintExceededCount
    );

  const productPolicyExcludedCount =
    normalizeCount(
      input.productPolicyExcludedCount
    );

  const maximumDistanceKm =
    normalizeOptionalNumber(
      input.maximumDistanceKm
    );

  const totalBudget =
    normalizeOptionalNumber(
      input.totalBudget
    );

  const recoveryCandidateDistancesKm =
    (
      input
        .recoveryCandidateDistancesKm ??
      []
    ).filter(
      (distance) =>
        Number.isFinite(distance)
    );

  let reason:
    SmartStayEmptyStateReasonV2 =
      "unknown";

  if (providerHotelCount === 0) {
    reason =
      "provider-no-results";
  }
  else if (
    maximumDistanceKm !== null &&
    distanceExceededCount ===
      providerHotelCount &&
    recoveryCandidateDistancesKm
      .length >
      0
  ) {
    reason =
      "distance-constraint";
  }
  else if (
    reliabilityBlockedCount ===
      providerHotelCount
  ) {
    reason =
      "reliability-gate";
  }
  else if (
    totalBudget !== null &&
    budgetHiddenCount ===
      providerHotelCount
  ) {
    reason =
      "budget-constraint";
  }
  else if (
    mandatoryConstraintExceededCount > 0 ||
    productPolicyExcludedCount > 0
  ) {
    reason =
      "product-policy";
  }

  const recoveryDistanceKmOptions =
    reason ===
      "distance-constraint" &&
    maximumDistanceKm !== null
      ? buildDistanceRecoveryOptions(
          maximumDistanceKm,
          recoveryCandidateDistancesKm
        )
      : [];

  return {
    reason,
    providerHotelCount,
    visibleHotelCount,
    distanceExceededCount,
    budgetHiddenCount,
    reliabilityBlockedCount,
    mandatoryConstraintExceededCount,
    productPolicyExcludedCount,
    maximumDistanceKm,
    totalBudget,
    recoveryDistanceKmOptions,
  };
}
