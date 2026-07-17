import type {
  SmartStayParetoEvaluationV2,
  SmartStayRecommendationRoleV2,
  SmartStayRecommendationV2,
  SmartStayRiskAssessmentV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayUserUtilityEvaluationV2,
} from "../utility/userUtilityEngine";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

import type {
  SmartStayComfortFlexibilityEvaluationV2,
} from "../comfort/comfortFlexibilityEngine";

export interface SmartStayRecommendationCandidateV2 {
  hotelId:
    string;

  eligibleForPrimaryRanking:
    boolean;

  utility:
    SmartStayUserUtilityEvaluationV2;

  pareto:
    SmartStayParetoEvaluationV2;

  risk:
    SmartStayRiskAssessmentV2;

  priceValue?:
    SmartStayPriceValueEvaluationV2;

  location?:
    SmartStayLocationEvaluationV2;

  comfortFlexibility?:
    SmartStayComfortFlexibilityEvaluationV2;

  exclusionReasonCodes?:
    string[];
}

export interface SmartStayRecommendationRolesOptionsV2 {
  minimumScoreConfidence?:
    number;

  minimumEvidenceCoverage?:
    number;

  minimumAlternativeUtilityScore?:
    number;

  maximumSavingUtilityLoss?:
    number;

  minimumSavingAmount?:
    number;

  minimumSavingRatio?:
    number;

  maximumAlternativeLocationLoss?:
    number;

  minimumComfortGain?:
    number;

  minimumStrongestComfortGain?:
    number;

  maximumComfortUtilityLoss?:
    number;

  maximumComfortPricePremiumRatio?:
    number;

  maximumBudgetOverageRatio?:
    number;

  minimumLocationScoreGain?:
    number;

  minimumDistanceGainKm?:
    number;

  minimumDistanceGainRatio?:
    number;

  maximumLocationUtilityLoss?:
    number;

  maximumLocationPricePremiumRatio?:
    number;

  minimumSpecializedConfidence?:
    number;
}

export interface SmartStayRecommendationMetricsV2 {
  utilityScore:
    number | null;

  utilityDifference:
    number | null;

  scoreConfidence:
    number;

  riskScore:
    number;

  totalCost:
    number | null;

  currency:
    string | null;

  priceDifferenceAmount:
    number | null;

  priceDifferencePercent:
    number | null;

  locationScore:
    number | null;

  distanceKm:
    number | null;

  distanceDifferenceKm:
    number | null;

  comfortScore:
    number | null;

  comfortDifference:
    number | null;
}

export interface SmartStayRecommendationEvaluationV2
  extends SmartStayRecommendationV2 {
  hotelId:
    string;

  assignmentScore:
    number | null;

  metrics:
    SmartStayRecommendationMetricsV2;
}

export interface SmartStayRecommendationPickV2 {
  hotelId:
    string;

  role:
    Exclude<
      SmartStayRecommendationRoleV2,
      "unassigned"
    >;

  comparisonTargetHotelId:
    string | null;

  assignmentScore:
    number;

  reasonCodes:
    string[];

  evidenceIds:
    string[];

  metrics:
    SmartStayRecommendationMetricsV2;
}

export interface SmartStayRecommendationRolesEvaluationV2 {
  bestChoiceHotelId:
    string | null;

  picks:
    SmartStayRecommendationPickV2[];

  evaluations:
    SmartStayRecommendationEvaluationV2[];
}

type ComparableCost = {
  amount:
    number;

  currency:
    string;

  evidenceIds:
    string[];
};

type LocationSignal = {
  score:
    number;

  distanceKm:
    number;

  confidence:
    number;

  evidenceIds:
    string[];
};

type ComfortSignal = {
  score:
    number;

  confidence:
    number;

  strongestDimensionScore:
    number;

  evidenceIds:
    string[];
};

type NormalizedCandidate = {
  hotelId:
    string;

  source:
    SmartStayRecommendationCandidateV2;

  roleEligible:
    boolean;

  utilityScore:
    number | null;

  scoreConfidence:
    number;

  evidenceCoverage:
    number;

  cost:
    ComparableCost | null;

  location:
    LocationSignal | null;

  comfort:
    ComfortSignal | null;

  exclusionReasonCodes:
    string[];
};

type ResolvedOptions = Required<
  SmartStayRecommendationRolesOptionsV2
>;

const DEFAULTS:
  ResolvedOptions = {
    minimumScoreConfidence:
      0.55,

    minimumEvidenceCoverage:
      0.55,

    minimumAlternativeUtilityScore:
      65,

    maximumSavingUtilityLoss:
      10,

    minimumSavingAmount:
      10,

    minimumSavingRatio:
      0.05,

    maximumAlternativeLocationLoss:
      15,

    minimumComfortGain:
      8,

    minimumStrongestComfortGain:
      10,

    maximumComfortUtilityLoss:
      12,

    maximumComfortPricePremiumRatio:
      0.35,

    maximumBudgetOverageRatio:
      0.25,

    minimumLocationScoreGain:
      5,

    minimumDistanceGainKm:
      0.3,

    minimumDistanceGainRatio:
      0.15,

    maximumLocationUtilityLoss:
      12,

    maximumLocationPricePremiumRatio:
      0.35,

    minimumSpecializedConfidence:
      0.6,
  };

const PICK_ROLE_ORDER:
  readonly Exclude<
    SmartStayRecommendationRoleV2,
    "unassigned"
  >[] = [
    "best-choice",
    "best-sensible-saving",
    "worthwhile-comfort-upgrade",
    "best-location",
  ];

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}

function round(
  value:
    number,
  decimalPlaces =
    2
) {
  const factor =
    10 ** decimalPlaces;

  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
      factor
    ) /
    factor
  );
}

function compareStrings(
  first:
    string,
  second:
    string
) {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

function uniqueSorted(
  values:
    string[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort(
    compareStrings
  );
}

function normalizeRatio(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return clamp(
    value,
    0,
    1
  );
}

function normalizeNonNegativeNumber(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return fallback;
  }

  return value;
}

function resolveOptions(
  options:
    SmartStayRecommendationRolesOptionsV2
): ResolvedOptions {
  return {
    minimumScoreConfidence:
      normalizeRatio(
        options.minimumScoreConfidence,
        DEFAULTS.minimumScoreConfidence
      ),

    minimumEvidenceCoverage:
      normalizeRatio(
        options.minimumEvidenceCoverage,
        DEFAULTS.minimumEvidenceCoverage
      ),

    minimumAlternativeUtilityScore:
      normalizeNonNegativeNumber(
        options.minimumAlternativeUtilityScore,
        DEFAULTS.minimumAlternativeUtilityScore
      ),

    maximumSavingUtilityLoss:
      normalizeNonNegativeNumber(
        options.maximumSavingUtilityLoss,
        DEFAULTS.maximumSavingUtilityLoss
      ),

    minimumSavingAmount:
      normalizeNonNegativeNumber(
        options.minimumSavingAmount,
        DEFAULTS.minimumSavingAmount
      ),

    minimumSavingRatio:
      normalizeRatio(
        options.minimumSavingRatio,
        DEFAULTS.minimumSavingRatio
      ),

    maximumAlternativeLocationLoss:
      normalizeNonNegativeNumber(
        options.maximumAlternativeLocationLoss,
        DEFAULTS.maximumAlternativeLocationLoss
      ),

    minimumComfortGain:
      normalizeNonNegativeNumber(
        options.minimumComfortGain,
        DEFAULTS.minimumComfortGain
      ),

    minimumStrongestComfortGain:
      normalizeNonNegativeNumber(
        options.minimumStrongestComfortGain,
        DEFAULTS.minimumStrongestComfortGain
      ),

    maximumComfortUtilityLoss:
      normalizeNonNegativeNumber(
        options.maximumComfortUtilityLoss,
        DEFAULTS.maximumComfortUtilityLoss
      ),

    maximumComfortPricePremiumRatio:
      normalizeRatio(
        options.maximumComfortPricePremiumRatio,
        DEFAULTS.maximumComfortPricePremiumRatio
      ),

    maximumBudgetOverageRatio:
      normalizeRatio(
        options.maximumBudgetOverageRatio,
        DEFAULTS.maximumBudgetOverageRatio
      ),

    minimumLocationScoreGain:
      normalizeNonNegativeNumber(
        options.minimumLocationScoreGain,
        DEFAULTS.minimumLocationScoreGain
      ),

    minimumDistanceGainKm:
      normalizeNonNegativeNumber(
        options.minimumDistanceGainKm,
        DEFAULTS.minimumDistanceGainKm
      ),

    minimumDistanceGainRatio:
      normalizeRatio(
        options.minimumDistanceGainRatio,
        DEFAULTS.minimumDistanceGainRatio
      ),

    maximumLocationUtilityLoss:
      normalizeNonNegativeNumber(
        options.maximumLocationUtilityLoss,
        DEFAULTS.maximumLocationUtilityLoss
      ),

    maximumLocationPricePremiumRatio:
      normalizeRatio(
        options.maximumLocationPricePremiumRatio,
        DEFAULTS.maximumLocationPricePremiumRatio
      ),

    minimumSpecializedConfidence:
      normalizeRatio(
        options.minimumSpecializedConfidence,
        DEFAULTS.minimumSpecializedConfidence
      ),
  };
}

function normalizeCurrency(
  value:
    unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalized
  )
    ? normalized
    : null;
}

function extractCost(
  evaluation:
    SmartStayPriceValueEvaluationV2 | undefined
): ComparableCost | null {
  if (!evaluation) {
    return null;
  }

  if (
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    typeof evaluation.totalCost !== "number" ||
    !Number.isFinite(
      evaluation.totalCost
    ) ||
    evaluation.totalCost <= 0
  ) {
    return null;
  }

  const currency =
    normalizeCurrency(
      evaluation.currency
    );

  if (!currency) {
    return null;
  }

  return {
    amount:
      evaluation.totalCost,

    currency,

    evidenceIds:
      uniqueSorted(
        evaluation.evidenceIds
      ),
  };
}

function extractLocation(
  evaluation:
    SmartStayLocationEvaluationV2 | undefined,
  minimumConfidence:
    number
): LocationSignal | null {
  if (!evaluation) {
    return null;
  }

  if (
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    typeof evaluation.score !== "number" ||
    !Number.isFinite(
      evaluation.score
    ) ||
    typeof evaluation.distance.selectedDistanceKm !==
      "number" ||
    !Number.isFinite(
      evaluation.distance.selectedDistanceKm
    ) ||
    evaluation.distance.selectedDistanceKm < 0 ||
    typeof evaluation.confidence !== "number" ||
    !Number.isFinite(
      evaluation.confidence
    ) ||
    evaluation.confidence <
      minimumConfidence
  ) {
    return null;
  }

  return {
    score:
      evaluation.score,

    distanceKm:
      evaluation.distance
        .selectedDistanceKm,

    confidence:
      evaluation.confidence,

    evidenceIds:
      uniqueSorted(
        evaluation.evidenceIds
      ),
  };
}

function extractComfort(
  evaluation:
    SmartStayComfortFlexibilityEvaluationV2 | undefined,
  minimumConfidence:
    number
): ComfortSignal | null {
  if (!evaluation) {
    return null;
  }

  if (
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    evaluation.mandatoryRequirements.satisfied !== true
  ) {
    return null;
  }

  const weightedDimensions = [
    {
      dimension:
        evaluation.dimensions.comfort,

      weight:
        0.5,
    },
    {
      dimension:
        evaluation.dimensions.practicality,

      weight:
        0.3,
    },
    {
      dimension:
        evaluation.dimensions.flexibility,

      weight:
        0.2,
    },
  ].filter(
    (entry) =>
      typeof entry.dimension.score ===
        "number" &&
      Number.isFinite(
        entry.dimension.score
      ) &&
      typeof entry.dimension.confidence ===
        "number" &&
      Number.isFinite(
        entry.dimension.confidence
      ) &&
      entry.dimension.confidence >=
        minimumConfidence
  );

  if (
    weightedDimensions.length < 2
  ) {
    return null;
  }

  const totalWeight =
    weightedDimensions.reduce(
      (
        total,
        entry
      ) =>
        total +
        entry.weight,
      0
    );

  if (totalWeight <= 0) {
    return null;
  }

  const score =
    weightedDimensions.reduce(
      (
        total,
        entry
      ) =>
        total +
        (
          entry.dimension.score ??
          0
        ) *
        entry.weight,
      0
    ) /
    totalWeight;

  const confidence =
    weightedDimensions.reduce(
      (
        total,
        entry
      ) =>
        total +
        entry.dimension.confidence *
        entry.weight,
      0
    ) /
    totalWeight;

  const strongestDimensionScore =
    Math.max(
      ...weightedDimensions.map(
        (entry) =>
          entry.dimension.score ??
          0
      )
    );

  return {
    score:
      round(
        score,
        4
      ),

    confidence:
      round(
        confidence,
        4
      ),

    strongestDimensionScore:
      round(
        strongestDimensionScore,
        4
      ),

    evidenceIds:
      uniqueSorted([
        ...weightedDimensions.flatMap(
          (entry) =>
            entry.dimension.evidenceIds
        ),

        ...evaluation.evidenceIds,
      ]),
  };
}

function createPreferenceSignature(
  utility:
    SmartStayUserUtilityEvaluationV2
) {
  const weights =
    Object.entries(
      utility.preference.weights
    )
      .sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first[0],
            second[0]
          )
      )
      .map(
        ([
          dimension,
          weight,
        ]) =>
          `${dimension}:${weight.toFixed(6)}`
      )
      .join("|");

  return [
    utility.preference.id,
    weights,
  ].join("::");
}

function normalizeCandidate(
  candidate:
    SmartStayRecommendationCandidateV2,
  options:
    ResolvedOptions
): NormalizedCandidate {
  if (
    typeof candidate.hotelId !==
      "string" ||
    !candidate.hotelId.trim()
  ) {
    throw new Error(
      "Recommendation candidate requires a hotelId."
    );
  }

  const hotelId =
    candidate.hotelId.trim();

  const componentHotelIds = [
    candidate.utility.hotelId,
    candidate.priceValue?.hotelId,
    candidate.location?.hotelId,
    candidate.comfortFlexibility?.hotelId,
  ].filter(
    (
      componentHotelId
    ): componentHotelId is string =>
      typeof componentHotelId ===
      "string"
  );

  if (
    componentHotelIds.some(
      (componentHotelId) =>
        componentHotelId !==
        hotelId
    )
  ) {
    throw new Error(
      `Recommendation candidate hotelId mismatch: ${hotelId}`
    );
  }

  const utilityScore =
    typeof candidate.utility
      .utilityScore === "number" &&
    Number.isFinite(
      candidate.utility.utilityScore
    )
      ? candidate.utility.utilityScore
      : null;

  const scoreConfidence =
    normalizeRatio(
      candidate.utility
        .scoreConfidence,
      0
    );

  const evidenceCoverage =
    normalizeRatio(
      candidate.utility
        .evidenceCoverage,
      0
    );

  const riskScore =
    clamp(
      Number.isFinite(
        candidate.risk.score
      )
        ? candidate.risk.score
        : 100,
      0,
      100
    );

  const roleEligible =
    candidate
      .eligibleForPrimaryRanking ===
      true &&
    candidate.utility
      .eligibleForPrimaryRanking ===
      true &&
    candidate.utility.status !==
      "invalid" &&
    candidate.utility.status !==
      "unavailable" &&
    utilityScore !== null &&
    scoreConfidence >=
      options.minimumScoreConfidence &&
    evidenceCoverage >=
      options.minimumEvidenceCoverage &&
    candidate.risk.level !==
      "high" &&
    riskScore < 60;

  return {
    hotelId,

    source:
      candidate,

    roleEligible,

    utilityScore,

    scoreConfidence,

    evidenceCoverage,

    cost:
      extractCost(
        candidate.priceValue
      ),

    location:
      extractLocation(
        candidate.location,
        options.minimumSpecializedConfidence
      ),

    comfort:
      extractComfort(
        candidate.comfortFlexibility,
        options.minimumSpecializedConfidence
      ),

    exclusionReasonCodes:
      uniqueSorted(
        candidate
          .exclusionReasonCodes ??
        []
      ),
  };
}

function sortBestChoiceCandidates(
  candidates:
    NormalizedCandidate[]
) {
  return candidates
    .slice()
    .sort(
      (
        first,
        second
      ) =>
        (
          second.utilityScore ??
          -1
        ) -
          (
            first.utilityScore ??
            -1
          ) ||
        second.scoreConfidence -
          first.scoreConfidence ||
        second.evidenceCoverage -
          first.evidenceCoverage ||
        first.source.risk.score -
          second.source.risk.score ||
        compareStrings(
          first.hotelId,
          second.hotelId
        )
    );
}

function canUseAsAlternative(
  candidate:
    NormalizedCandidate,
  assignedHotelIds:
    Set<string>,
  options:
    ResolvedOptions
) {
  return (
    candidate.roleEligible &&
    !assignedHotelIds.has(
      candidate.hotelId
    ) &&
    candidate.source.pareto.status ===
      "frontier" &&
    candidate.utilityScore !==
      null &&
    candidate.utilityScore >=
      options.minimumAlternativeUtilityScore
  );
}

function isLocationCompatible(
  candidate:
    NormalizedCandidate,
  bestChoice:
    NormalizedCandidate,
  maximumLoss:
    number
) {
  if (
    bestChoice.location &&
    !candidate.location
  ) {
    return false;
  }

  if (
    candidate.location &&
    bestChoice.location &&
    bestChoice.location.score -
      candidate.location.score >
      maximumLoss
  ) {
    return false;
  }

  return true;
}

function createBaseMetrics(
  candidate:
    NormalizedCandidate
): SmartStayRecommendationMetricsV2 {
  return {
    utilityScore:
      candidate.utilityScore ===
      null
        ? null
        : round(
            candidate.utilityScore
          ),

    utilityDifference:
      null,

    scoreConfidence:
      round(
        candidate.scoreConfidence,
        4
      ),

    riskScore:
      round(
        candidate.source.risk.score
      ),

    totalCost:
      candidate.cost
        ? round(
            candidate.cost.amount
          )
        : null,

    currency:
      candidate.cost?.currency ??
      null,

    priceDifferenceAmount:
      null,

    priceDifferencePercent:
      null,

    locationScore:
      candidate.location
        ? round(
            candidate.location.score
          )
        : null,

    distanceKm:
      candidate.location
        ? round(
            candidate.location.distanceKm
          )
        : null,

    distanceDifferenceKm:
      null,

    comfortScore:
      candidate.comfort
        ? round(
            candidate.comfort.score
          )
        : null,

    comfortDifference:
      null,
  };
}

function createComparisonMetrics(
  candidate:
    NormalizedCandidate,
  bestChoice:
    NormalizedCandidate
): SmartStayRecommendationMetricsV2 {
  const metrics =
    createBaseMetrics(
      candidate
    );

  metrics.utilityDifference =
    candidate.utilityScore !==
      null &&
    bestChoice.utilityScore !==
      null
      ? round(
          candidate.utilityScore -
          bestChoice.utilityScore
        )
      : null;

  if (
    candidate.cost &&
    bestChoice.cost &&
    candidate.cost.currency ===
      bestChoice.cost.currency
  ) {
    const differenceAmount =
      candidate.cost.amount -
      bestChoice.cost.amount;

    metrics.priceDifferenceAmount =
      round(
        differenceAmount
      );

    metrics.priceDifferencePercent =
      round(
        (
          differenceAmount /
          bestChoice.cost.amount
        ) *
        100,
        2
      );
  }

  if (
    candidate.location &&
    bestChoice.location
  ) {
    metrics.distanceDifferenceKm =
      round(
        candidate.location.distanceKm -
        bestChoice.location.distanceKm
      );
  }

  if (
    candidate.comfort &&
    bestChoice.comfort
  ) {
    metrics.comfortDifference =
      round(
        candidate.comfort.score -
        bestChoice.comfort.score
      );
  }

  return metrics;
}

function createPick(
  candidate:
    NormalizedCandidate,
  role:
    SmartStayRecommendationPickV2[
      "role"
    ],
  comparisonTargetHotelId:
    string | null,
  assignmentScore:
    number,
  reasonCodes:
    string[],
  evidenceIds:
    string[],
  metrics:
    SmartStayRecommendationMetricsV2
): SmartStayRecommendationPickV2 {
  return {
    hotelId:
      candidate.hotelId,

    role,

    comparisonTargetHotelId,

    assignmentScore:
      round(
        assignmentScore,
        4
      ),

    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),

    evidenceIds:
      uniqueSorted(
        evidenceIds
      ),

    metrics,
  };
}

function selectBestChoice(
  candidates:
    NormalizedCandidate[]
) {
  const eligible =
    candidates.filter(
      (candidate) =>
        candidate.roleEligible
    );

  const frontier =
    eligible.filter(
      (candidate) =>
        candidate.source.pareto.status ===
        "frontier"
    );

  return sortBestChoiceCandidates(
    frontier.length > 0
      ? frontier
      : eligible
  )[0] ??
  null;
}

function selectSensibleSaving(
  candidates:
    NormalizedCandidate[],
  bestChoice:
    NormalizedCandidate,
  assignedHotelIds:
    Set<string>,
  options:
    ResolvedOptions
) {
  if (!bestChoice.cost) {
    return null;
  }

  const bestChoiceCost =
    bestChoice.cost;

  const alternatives =
    candidates
      .filter(
        (candidate) =>
          canUseAsAlternative(
            candidate,
            assignedHotelIds,
            options
          )
      )
      .map(
        (candidate) => {
          if (
            !candidate.cost ||
            candidate.cost.currency !==
              bestChoiceCost.currency ||
            candidate.utilityScore ===
              null ||
            bestChoice.utilityScore ===
              null
          ) {
            return null;
          }

          const savingAmount =
            bestChoiceCost.amount -
            candidate.cost.amount;

          const savingRatio =
            savingAmount /
            bestChoiceCost.amount;

          const utilityLoss =
            bestChoice.utilityScore -
            candidate.utilityScore;

          const minimumSavingAmount =
            Math.max(
              options.minimumSavingAmount,
              bestChoiceCost.amount *
                options.minimumSavingRatio
            );

          if (
            savingAmount <
              minimumSavingAmount ||
            savingRatio <
              options.minimumSavingRatio ||
            utilityLoss >
              options.maximumSavingUtilityLoss ||
            !isLocationCompatible(
              candidate,
              bestChoice,
              options.maximumAlternativeLocationLoss
            )
          ) {
            return null;
          }

          const assignmentScore =
            candidate.utilityScore +
            savingRatio *
              30 -
            Math.max(
              utilityLoss,
              0
            ) *
              0.5 -
            candidate.source.risk.score *
              0.05;

          return {
            candidate,
            savingAmount,
            savingRatio,
            utilityLoss,
            assignmentScore,
          };
        }
      )
      .filter(
        (
          alternative
        ): alternative is NonNullable<
          typeof alternative
        > =>
          alternative !== null
      )
      .sort(
        (
          first,
          second
        ) =>
          second.assignmentScore -
            first.assignmentScore ||
          second.candidate.utilityScore! -
            first.candidate.utilityScore! ||
          second.savingRatio -
            first.savingRatio ||
          compareStrings(
            first.candidate.hotelId,
            second.candidate.hotelId
          )
      );

  const selected =
    alternatives[0];

  if (!selected) {
    return null;
  }

  const metrics =
    createComparisonMetrics(
      selected.candidate,
      bestChoice
    );

  return createPick(
    selected.candidate,
    "best-sensible-saving",
    bestChoice.hotelId,
    selected.assignmentScore,
    [
      "recommendation-best-sensible-saving",
      "recommendation-meaningful-saving",
      "recommendation-same-currency-comparison",
      "recommendation-utility-loss-within-limit",
    ],
    [
      ...selected.candidate
        .source.utility
        .evidenceIds,
      ...selected.candidate.cost!
        .evidenceIds,
      ...bestChoice.source.utility
        .evidenceIds,
      ...bestChoiceCost
        .evidenceIds,
      ...selected.candidate.source.risk
        .evidenceIds,
    ],
    metrics
  );
}

function selectComfortUpgrade(
  candidates:
    NormalizedCandidate[],
  bestChoice:
    NormalizedCandidate,
  assignedHotelIds:
    Set<string>,
  options:
    ResolvedOptions
) {
  if (
    !bestChoice.comfort ||
    !bestChoice.cost
  ) {
    return null;
  }

  const bestChoiceComfort =
    bestChoice.comfort;

  const bestChoiceCost =
    bestChoice.cost;

  const alternatives =
    candidates
      .filter(
        (candidate) =>
          canUseAsAlternative(
            candidate,
            assignedHotelIds,
            options
          )
      )
      .map(
        (candidate) => {
          if (
            !candidate.comfort ||
            !candidate.cost ||
            candidate.cost.currency !==
              bestChoiceCost.currency ||
            candidate.utilityScore ===
              null ||
            bestChoice.utilityScore ===
              null
          ) {
            return null;
          }

          const comfortGain =
            candidate.comfort.score -
            bestChoiceComfort.score;

          const strongestGain =
            candidate.comfort
              .strongestDimensionScore -
            bestChoiceComfort
              .strongestDimensionScore;

          const utilityLoss =
            bestChoice.utilityScore -
            candidate.utilityScore;

          const pricePremiumRatio =
            (
              candidate.cost.amount -
              bestChoiceCost.amount
            ) /
            bestChoiceCost.amount;

          const budgetOverageRatio =
            candidate.source
              .priceValue
              ?.budget
              .overageRatio ??
            0;

          if (
            comfortGain <
              options.minimumComfortGain ||
            strongestGain <
              options.minimumStrongestComfortGain ||
            utilityLoss >
              options.maximumComfortUtilityLoss ||
            pricePremiumRatio < 0 ||
            pricePremiumRatio >
              options.maximumComfortPricePremiumRatio ||
            budgetOverageRatio >
              options.maximumBudgetOverageRatio ||
            !isLocationCompatible(
              candidate,
              bestChoice,
              options.maximumAlternativeLocationLoss
            )
          ) {
            return null;
          }

          const assignmentScore =
            comfortGain *
              2 +
            strongestGain *
              0.5 +
            candidate.utilityScore -
            pricePremiumRatio *
              20 -
            candidate.source.risk.score *
              0.05;

          return {
            candidate,
            comfortGain,
            strongestGain,
            pricePremiumRatio,
            assignmentScore,
          };
        }
      )
      .filter(
        (
          alternative
        ): alternative is NonNullable<
          typeof alternative
        > =>
          alternative !== null
      )
      .sort(
        (
          first,
          second
        ) =>
          second.assignmentScore -
            first.assignmentScore ||
          second.comfortGain -
            first.comfortGain ||
          first.pricePremiumRatio -
            second.pricePremiumRatio ||
          compareStrings(
            first.candidate.hotelId,
            second.candidate.hotelId
          )
      );

  const selected =
    alternatives[0];

  if (!selected) {
    return null;
  }

  const metrics =
    createComparisonMetrics(
      selected.candidate,
      bestChoice
    );

  return createPick(
    selected.candidate,
    "worthwhile-comfort-upgrade",
    bestChoice.hotelId,
    selected.assignmentScore,
    [
      "recommendation-worthwhile-comfort-upgrade",
      "recommendation-meaningful-comfort-gain",
      "recommendation-price-premium-within-limit",
      "recommendation-utility-loss-within-limit",
    ],
    [
      ...selected.candidate
        .source.utility
        .evidenceIds,
      ...selected.candidate.comfort!
        .evidenceIds,
      ...selected.candidate.cost!
        .evidenceIds,
      ...bestChoice.source.utility
        .evidenceIds,
      ...bestChoiceComfort
        .evidenceIds,
      ...bestChoiceCost
        .evidenceIds,
      ...selected.candidate.source.risk
        .evidenceIds,
    ],
    metrics
  );
}

function selectBestLocation(
  candidates:
    NormalizedCandidate[],
  bestChoice:
    NormalizedCandidate,
  assignedHotelIds:
    Set<string>,
  options:
    ResolvedOptions
) {
  if (
    !bestChoice.location ||
    !bestChoice.cost
  ) {
    return null;
  }

  const bestChoiceLocation =
    bestChoice.location;

  const bestChoiceCost =
    bestChoice.cost;

  const alternatives =
    candidates
      .filter(
        (candidate) =>
          canUseAsAlternative(
            candidate,
            assignedHotelIds,
            options
          )
      )
      .map(
        (candidate) => {
          if (
            !candidate.location ||
            !candidate.cost ||
            candidate.cost.currency !==
              bestChoiceCost.currency ||
            candidate.utilityScore ===
              null ||
            bestChoice.utilityScore ===
              null
          ) {
            return null;
          }

          const locationScoreGain =
            candidate.location.score -
            bestChoiceLocation.score;

          const distanceGainKm =
            bestChoiceLocation.distanceKm -
            candidate.location.distanceKm;

          const requiredDistanceGainKm =
            Math.max(
              options.minimumDistanceGainKm,
              bestChoiceLocation.distanceKm *
                options.minimumDistanceGainRatio
            );

          const utilityLoss =
            bestChoice.utilityScore -
            candidate.utilityScore;

          const pricePremiumRatio =
            (
              candidate.cost.amount -
              bestChoiceCost.amount
            ) /
            bestChoiceCost.amount;

          if (
            locationScoreGain <
              options.minimumLocationScoreGain ||
            distanceGainKm <
              requiredDistanceGainKm ||
            utilityLoss >
              options.maximumLocationUtilityLoss ||
            pricePremiumRatio >
              options.maximumLocationPricePremiumRatio ||
            candidate.source
              .location
              ?.constraint
              .withinLimit === false
          ) {
            return null;
          }

          const assignmentScore =
            locationScoreGain *
              2 +
            distanceGainKm *
              4 +
            candidate.utilityScore -
            Math.max(
              pricePremiumRatio,
              0
            ) *
              20 -
            candidate.source.risk.score *
              0.05;

          return {
            candidate,
            locationScoreGain,
            distanceGainKm,
            pricePremiumRatio,
            assignmentScore,
          };
        }
      )
      .filter(
        (
          alternative
        ): alternative is NonNullable<
          typeof alternative
        > =>
          alternative !== null
      )
      .sort(
        (
          first,
          second
        ) =>
          second.assignmentScore -
            first.assignmentScore ||
          second.locationScoreGain -
            first.locationScoreGain ||
          second.distanceGainKm -
            first.distanceGainKm ||
          compareStrings(
            first.candidate.hotelId,
            second.candidate.hotelId
          )
      );

  const selected =
    alternatives[0];

  if (!selected) {
    return null;
  }

  const metrics =
    createComparisonMetrics(
      selected.candidate,
      bestChoice
    );

  return createPick(
    selected.candidate,
    "best-location",
    bestChoice.hotelId,
    selected.assignmentScore,
    [
      "recommendation-best-location",
      "recommendation-meaningfully-closer",
      "recommendation-location-score-gain",
      "recommendation-utility-loss-within-limit",
    ],
    [
      ...selected.candidate
        .source.utility
        .evidenceIds,
      ...selected.candidate.location!
        .evidenceIds,
      ...selected.candidate.cost!
        .evidenceIds,
      ...bestChoice.source.utility
        .evidenceIds,
      ...bestChoiceLocation
        .evidenceIds,
      ...bestChoiceCost
        .evidenceIds,
      ...selected.candidate.source.risk
        .evidenceIds,
    ],
    metrics
  );
}

export function evaluateRecommendationRolesV2(
  candidates:
    SmartStayRecommendationCandidateV2[],
  options:
    SmartStayRecommendationRolesOptionsV2 = {}
): SmartStayRecommendationRolesEvaluationV2 {
  const resolvedOptions =
    resolveOptions(
      options
    );

  const normalizedCandidates =
    candidates
      .map(
        (candidate) =>
          normalizeCandidate(
            candidate,
            resolvedOptions
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first.hotelId,
            second.hotelId
          )
      );

  const hotelIds =
    normalizedCandidates.map(
      (candidate) =>
        candidate.hotelId
    );

  if (
    new Set(
      hotelIds
    ).size !==
    hotelIds.length
  ) {
    throw new Error(
      "Recommendation Roles received duplicate hotelIds."
    );
  }

  if (
    normalizedCandidates.length > 1
  ) {
    const preferenceSignature =
      createPreferenceSignature(
        normalizedCandidates[0]
          .source.utility
      );

    for (
      const candidate
      of normalizedCandidates
    ) {
      if (
        createPreferenceSignature(
          candidate.source.utility
        ) !==
        preferenceSignature
      ) {
        throw new Error(
          "Recommendation candidates must use the same utility preference and weights."
        );
      }
    }
  }

  const bestChoice =
    selectBestChoice(
      normalizedCandidates
    );

  if (!bestChoice) {
    return {
      bestChoiceHotelId:
        null,

      picks:
        [],

      evaluations:
        normalizedCandidates.map(
          (candidate) => ({
            hotelId:
              candidate.hotelId,

            role:
              "unassigned",

            eligible:
              false,

            reasonCodes:
              uniqueSorted([
                ...candidate
                  .exclusionReasonCodes,
                "recommendation-no-eligible-best-choice",
              ]),

            comparisonTargetHotelId:
              null,

            evidenceIds:
              uniqueSorted([
                ...candidate.source
                  .utility.evidenceIds,
                ...candidate.source
                  .risk.evidenceIds,
              ]),

            assignmentScore:
              null,

            metrics:
              createBaseMetrics(
                candidate
              ),
          })
        ),
    };
  }

  const picks:
    SmartStayRecommendationPickV2[] = [];

  const assignedHotelIds =
    new Set<string>();

  const bestChoicePick =
    createPick(
      bestChoice,
      "best-choice",
      null,
      bestChoice.utilityScore ??
        0,
      [
        "recommendation-best-choice",
        "recommendation-highest-reliable-utility",
        bestChoice.source.pareto
          .status === "frontier"
          ? "recommendation-pareto-frontier"
          : "recommendation-pareto-fallback",
      ],
      [
        ...bestChoice.source
          .utility.evidenceIds,
        ...bestChoice.source
          .risk.evidenceIds,
      ],
      createBaseMetrics(
        bestChoice
      )
    );

  picks.push(
    bestChoicePick
  );

  assignedHotelIds.add(
    bestChoice.hotelId
  );

  const sensibleSaving =
    selectSensibleSaving(
      normalizedCandidates,
      bestChoice,
      assignedHotelIds,
      resolvedOptions
    );

  if (sensibleSaving) {
    picks.push(
      sensibleSaving
    );

    assignedHotelIds.add(
      sensibleSaving.hotelId
    );
  }

  const comfortUpgrade =
    selectComfortUpgrade(
      normalizedCandidates,
      bestChoice,
      assignedHotelIds,
      resolvedOptions
    );

  if (comfortUpgrade) {
    picks.push(
      comfortUpgrade
    );

    assignedHotelIds.add(
      comfortUpgrade.hotelId
    );
  }

  const bestLocation =
    selectBestLocation(
      normalizedCandidates,
      bestChoice,
      assignedHotelIds,
      resolvedOptions
    );

  if (bestLocation) {
    picks.push(
      bestLocation
    );

    assignedHotelIds.add(
      bestLocation.hotelId
    );
  }

  picks.sort(
    (
      first,
      second
    ) =>
      PICK_ROLE_ORDER.indexOf(
        first.role
      ) -
      PICK_ROLE_ORDER.indexOf(
        second.role
      )
  );

  const picksByHotelId =
    new Map(
      picks.map(
        (pick) => [
          pick.hotelId,
          pick,
        ] as const
      )
    );

  const evaluations =
    normalizedCandidates.map(
      (
        candidate
      ): SmartStayRecommendationEvaluationV2 => {
        const pick =
          picksByHotelId.get(
            candidate.hotelId
          );

        if (pick) {
          return {
            hotelId:
              candidate.hotelId,

            role:
              pick.role,

            eligible:
              true,

            reasonCodes:
              pick.reasonCodes,

            comparisonTargetHotelId:
              pick.comparisonTargetHotelId,

            evidenceIds:
              pick.evidenceIds,

            assignmentScore:
              pick.assignmentScore,

            metrics:
              pick.metrics,
          };
        }

        const reasonCodes = [
          ...candidate
            .exclusionReasonCodes,
        ];

        if (!candidate.roleEligible) {
          reasonCodes.push(
            "recommendation-not-eligible"
          );
        }
        else if (
          candidate.source.pareto.status !==
          "frontier"
        ) {
          reasonCodes.push(
            candidate.source.pareto.status ===
              "dominated"
              ? "recommendation-pareto-dominated"
              : "recommendation-pareto-not-frontier"
          );
        }
        else {
          reasonCodes.push(
            "recommendation-not-selected"
          );
        }

        return {
          hotelId:
            candidate.hotelId,

          role:
            "unassigned",

          eligible:
            candidate.roleEligible,

          reasonCodes:
            uniqueSorted(
              reasonCodes
            ),

          comparisonTargetHotelId:
            bestChoice.hotelId,

          evidenceIds:
            uniqueSorted([
              ...candidate.source
                .utility.evidenceIds,
              ...candidate.source
                .risk.evidenceIds,
            ]),

          assignmentScore:
            null,

          metrics:
            createComparisonMetrics(
              candidate,
              bestChoice
            ),
        };
      }
    );

  return {
    bestChoiceHotelId:
      bestChoice.hotelId,

    picks,

    evaluations,
  };
}