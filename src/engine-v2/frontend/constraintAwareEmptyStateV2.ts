export type SmartStayEmptyStateReasonV2 =
  | "provider-no-results"
  | "distance-constraint"
  | "budget-constraint"
  | "reliability-gate"
  | "product-policy"
  | "unknown";

export interface SmartStayDistanceRecoverySuggestionV2 {
  maximumDistanceKm:
    number | null;

  unlockedHotelCount:
    number;
}

export interface SmartStayBudgetRecoverySuggestionV2 {
  totalBudget:
    number;

  additionalBudget:
    number;

  unlockedHotelCount:
    number;
}

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

  budgetEligibleCandidateCount:
    number;

  budgetBlockedCandidateCount:
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

  recoveryDistanceSuggestions:
    SmartStayDistanceRecoverySuggestionV2[];

  recoveryBudgetSuggestions:
    SmartStayBudgetRecoverySuggestionV2[];
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

  budgetEligibleCandidateCount?:
    number;

  budgetBlockedCandidateCount?:
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

  recoveryCandidateTotalCosts?:
    number[];
}

const DISTANCE_RECOVERY_STEPS_KM = [
  0.5,
  1,
  2,
  5,
  10,
] as const;

const MAXIMUM_RECOVERY_SUGGESTIONS =
  2;

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

function roundMoney(
  value:
    number
) {
  return Number(
    value.toFixed(
      2
    )
  );
}

function buildDistanceRecoverySuggestions(
  currentMaximumDistanceKm:
    number,
  candidateDistancesKm:
    number[]
): SmartStayDistanceRecoverySuggestionV2[] {
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

  const suggestions:
    SmartStayDistanceRecoverySuggestionV2[] = [];

  let previousUnlockedCount =
    0;

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

    const unlockedHotelCount =
      meaningfulDistances.filter(
        (distance) =>
          distance <= step
      ).length;

    if (
      unlockedHotelCount <=
      previousUnlockedCount
    ) {
      continue;
    }

    suggestions.push({
      maximumDistanceKm:
        step,
      unlockedHotelCount,
    });

    previousUnlockedCount =
      unlockedHotelCount;

    if (
      suggestions.length >=
      MAXIMUM_RECOVERY_SUGGESTIONS
    ) {
      return suggestions;
    }
  }

  if (
    meaningfulDistances.length >
      previousUnlockedCount &&
    suggestions.length <
      MAXIMUM_RECOVERY_SUGGESTIONS
  ) {
    suggestions.push({
      maximumDistanceKm:
        null,
      unlockedHotelCount:
        meaningfulDistances.length,
    });
  }

  return suggestions;
}

function buildBudgetRecoverySuggestions(
  currentTotalBudget:
    number,
  candidateTotalCosts:
    number[]
): SmartStayBudgetRecoverySuggestionV2[] {
  const meaningfulCosts =
    candidateTotalCosts
      .filter(
        (totalCost) =>
          Number.isFinite(totalCost) &&
          totalCost >
            currentTotalBudget
      )
      .map(
        roundMoney
      )
      .sort(
        (first, second) =>
          first - second
      );

  const thresholds = [
    ...new Set(
      meaningfulCosts
    ),
  ];

  if (
    thresholds.length ===
    0
  ) {
    return [];
  }

  const createSuggestion =
    (
      totalBudget:
        number
    ): SmartStayBudgetRecoverySuggestionV2 => ({
      totalBudget,
      additionalBudget:
        roundMoney(
          totalBudget -
          currentTotalBudget
        ),
      unlockedHotelCount:
        meaningfulCosts.filter(
          (totalCost) =>
            totalCost <=
            totalBudget
        ).length,
    });

  const firstThreshold =
    thresholds[0];

  const suggestions = [
    createSuggestion(
      firstThreshold
    ),
  ];

  const targetUnlockedCount =
    Math.min(
      3,
      meaningfulCosts.length
    );

  const secondThreshold =
    thresholds.find(
      (threshold) =>
        threshold >
          firstThreshold &&
        meaningfulCosts.filter(
          (totalCost) =>
            totalCost <=
            threshold
        ).length >=
          targetUnlockedCount
    ) ??
    null;

  if (
    secondThreshold !==
      null &&
    suggestions.length <
      MAXIMUM_RECOVERY_SUGGESTIONS
  ) {
    suggestions.push(
      createSuggestion(
        secondThreshold
      )
    );
  }

  return suggestions;
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

  const budgetEligibleCandidateCount =
    normalizeCount(
      input.budgetEligibleCandidateCount
    );

  const budgetBlockedCandidateCount =
    normalizeCount(
      input.budgetBlockedCandidateCount ??
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

  const recoveryCandidateTotalCosts =
    (
      input
        .recoveryCandidateTotalCosts ??
      []
    ).filter(
      (totalCost) =>
        Number.isFinite(totalCost)
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
    (
      budgetEligibleCandidateCount >
        0
        ? (
            budgetBlockedCandidateCount >=
            budgetEligibleCandidateCount
          )
        : (
            budgetHiddenCount ===
            providerHotelCount
          )
    )
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

  const recoveryDistanceSuggestions =
    reason ===
      "distance-constraint" &&
    maximumDistanceKm !== null
      ? buildDistanceRecoverySuggestions(
          maximumDistanceKm,
          recoveryCandidateDistancesKm
        )
      : [];

  const recoveryBudgetSuggestions =
    reason ===
      "budget-constraint" &&
    totalBudget !== null
      ? buildBudgetRecoverySuggestions(
          totalBudget,
          recoveryCandidateTotalCosts
        )
      : [];

  const recoveryDistanceKmOptions =
    recoveryDistanceSuggestions.map(
      (suggestion) =>
        suggestion
          .maximumDistanceKm
    );

  return {
    reason,
    providerHotelCount,
    visibleHotelCount,
    distanceExceededCount,
    budgetHiddenCount,
    budgetEligibleCandidateCount,
    budgetBlockedCandidateCount,
    reliabilityBlockedCount,
    mandatoryConstraintExceededCount,
    productPolicyExcludedCount,
    maximumDistanceKm,
    totalBudget,
    recoveryDistanceKmOptions,
    recoveryDistanceSuggestions,
    recoveryBudgetSuggestions,
  };
}
