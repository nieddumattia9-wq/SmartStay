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

import {
  evaluateSmartUpgradeCurveV2,
  type SmartStayUpgradeBenefitDimensionV2,
  type SmartStayUpgradeCurveCandidateV2,
  type SmartStayUpgradeCurveEvaluationV2,
  type SmartStayUpgradeCurveOptionsV2,
  type SmartStayUpgradeCurvePointV2,
} from "../upgrade/smartUpgradeCurveEngine";

export type SmartStayPrimaryRecommendationRoleV2 = Exclude<
  SmartStayRecommendationRoleV2,
  "unassigned" | "best-location"
>;

export interface SmartStayRecommendationCandidateV2 {
  hotelId: string;
  eligibleForPrimaryRanking: boolean;
  utility: SmartStayUserUtilityEvaluationV2;
  pareto: SmartStayParetoEvaluationV2;
  risk: SmartStayRiskAssessmentV2;
  smartScore?: number | null;
  priceValue?: SmartStayPriceValueEvaluationV2;
  location?: SmartStayLocationEvaluationV2;
  comfortFlexibility?: SmartStayComfortFlexibilityEvaluationV2;
  exclusionReasonCodes?: string[];
}

export interface SmartStayRecommendationRolesOptionsV2 {
  minimumScoreConfidence?: number;
  minimumEvidenceCoverage?: number;
  minimumAlternativeUtilityScore?: number;
  maximumSavingUtilityLoss?: number;
  minimumSavingAmount?: number;
  minimumSavingRatio?: number;
  maximumAlternativeLocationLoss?: number;
  minimumSpecializedConfidence?: number;
  maximumBestChoiceScoreDifference?: number;
  maximumBestChoiceConfidenceDifference?: number;
  maximumBestChoiceCoverageDifference?: number;
  maximumBestChoiceRiskDifference?: number;
  maximumSavingAssignmentDifference?: number;
  maximumSavingRatioDifference?: number;
  maximumSavingUtilityLossDifference?: number;
  maximumUpgradeAssignmentDifference?: number;
  maximumUpgradeOverageRatioDifference?: number;
  maximumUpgradeAdjustedBenefitDifference?: number;
  maximumUpgradeEfficiencyDifference?: number;
  upgradeCurveOptions?: SmartStayUpgradeCurveOptionsV2;
  maximumInitiallyVisiblePerGroup?: number;
}

export interface SmartStayRecommendationMetricsV2 {
  smartScore: number | null;
  displayedSmartScore: number | null;
  utilityScore: number | null;
  utilityDifference: number | null;
  scoreConfidence: number;
  evidenceCoverage: number;
  riskScore: number;
  totalCost: number | null;
  currency: string | null;
  budgetTotal: number | null;
  withinBudget: boolean | null;
  budgetOverageAmount: number | null;
  budgetOveragePercent: number | null;
  priceDifferenceAmount: number | null;
  priceDifferencePercent: number | null;
  locationScore: number | null;
  distanceKm: number | null;
  distanceDifferenceKm: number | null;
  comfortScore: number | null;
  comfortDifference: number | null;
  upgradeExperienceGain: number | null;
  upgradeAdjustedBenefit: number | null;
  upgradeEfficiencyPerBudgetPercent: number | null;
  upgradeStrongestGainDimension: SmartStayUpgradeBenefitDimensionV2 | null;
  upgradeStrongestGain: number | null;
  upgradeDiminishingReturnsStart: boolean;
}

export interface SmartStayRecommendationEvaluationV2
  extends SmartStayRecommendationV2 {
  hotelId: string;
  assignmentScore: number | null;
  tieGroupId: string | null;
  groupPosition: number | null;
  primaryInGroup: boolean;
  metrics: SmartStayRecommendationMetricsV2;
}

export interface SmartStayRecommendationPickV2 {
  hotelId: string;
  role: SmartStayPrimaryRecommendationRoleV2;
  comparisonTargetHotelId: string | null;
  assignmentScore: number;
  tieGroupId: string;
  groupPosition: number;
  primaryInGroup: boolean;
  reasonCodes: string[];
  evidenceIds: string[];
  metrics: SmartStayRecommendationMetricsV2;
}

export interface SmartStayRecommendationRoleGroupV2 {
  tieGroupId: string;
  role: SmartStayPrimaryRecommendationRoleV2;
  primaryHotelId: string;
  memberHotelIds: string[];
  initiallyVisibleHotelIds: string[];
  additionalHotelIds: string[];
  comparisonTargetHotelId: string | null;
  reasonCodes: string[];
}

export interface SmartStayRecommendationRolesEvaluationV2 {
  bestChoiceHotelId: string | null;
  upgradeCurve: SmartStayUpgradeCurveEvaluationV2 | null;
  groups: SmartStayRecommendationRoleGroupV2[];
  picks: SmartStayRecommendationPickV2[];
  evaluations: SmartStayRecommendationEvaluationV2[];
}

type ComparableCost = {
  amount: number;
  currency: string;
  evidenceIds: string[];
};

type LocationSignal = {
  score: number;
  distanceKm: number;
  confidence: number;
  evidenceIds: string[];
};

type ComfortSignal = {
  score: number;
  confidence: number;
  strongestDimensionScore: number;
  evidenceIds: string[];
};

type NormalizedCandidate = {
  hotelId: string;
  source: SmartStayRecommendationCandidateV2;
  roleEligible: boolean;
  smartScore: number | null;
  recommendationScore: number | null;
  utilityScore: number | null;
  scoreConfidence: number;
  evidenceCoverage: number;
  riskScore: number;
  cost: ComparableCost | null;
  location: LocationSignal | null;
  comfort: ComfortSignal | null;
  exclusionReasonCodes: string[];
};

type SavingAlternative = {
  candidate: NormalizedCandidate;
  savingAmount: number;
  savingRatio: number;
  utilityLoss: number;
  assignmentScore: number;
};

type UpgradeAlternative = {
  candidate: NormalizedCandidate;
  point: SmartStayUpgradeCurvePointV2;
  assignmentScore: number;
};

type ResolvedOptions = Omit<
  Required<SmartStayRecommendationRolesOptionsV2>,
  "upgradeCurveOptions"
> & {
  upgradeCurveOptions: SmartStayUpgradeCurveOptionsV2;
};

const DEFAULTS: ResolvedOptions = {
  minimumScoreConfidence: 0.55,
  minimumEvidenceCoverage: 0.55,
  minimumAlternativeUtilityScore: 65,
  maximumSavingUtilityLoss: 10,
  minimumSavingAmount: 10,
  minimumSavingRatio: 0.05,
  maximumAlternativeLocationLoss: 15,
  minimumSpecializedConfidence: 0.6,
  maximumBestChoiceScoreDifference: 0.75,
  maximumBestChoiceConfidenceDifference: 0.12,
  maximumBestChoiceCoverageDifference: 0.12,
  maximumBestChoiceRiskDifference: 10,
  maximumSavingAssignmentDifference: 2,
  maximumSavingRatioDifference: 0.025,
  maximumSavingUtilityLossDifference: 2,
  maximumUpgradeAssignmentDifference: 3,
  maximumUpgradeOverageRatioDifference: 0.04,
  maximumUpgradeAdjustedBenefitDifference: 3,
  maximumUpgradeEfficiencyDifference: 0.35,
  upgradeCurveOptions: {},
  maximumInitiallyVisiblePerGroup: 3,
};

const ROLE_ORDER: readonly SmartStayPrimaryRecommendationRoleV2[] = [
  "best-choice",
  "best-sensible-saving",
  "worthwhile-comfort-upgrade",
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number, decimalPlaces = 2) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function compareStrings(first: string, second: string) {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort(compareStrings);
}

function normalizeRatio(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, 1)
    : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? clamp(Math.round(value), 1, 10)
    : fallback;
}

function resolveOptions(
  options: SmartStayRecommendationRolesOptionsV2
): ResolvedOptions {
  return {
    minimumScoreConfidence: normalizeRatio(
      options.minimumScoreConfidence,
      DEFAULTS.minimumScoreConfidence
    ),
    minimumEvidenceCoverage: normalizeRatio(
      options.minimumEvidenceCoverage,
      DEFAULTS.minimumEvidenceCoverage
    ),
    minimumAlternativeUtilityScore: normalizeNonNegativeNumber(
      options.minimumAlternativeUtilityScore,
      DEFAULTS.minimumAlternativeUtilityScore
    ),
    maximumSavingUtilityLoss: normalizeNonNegativeNumber(
      options.maximumSavingUtilityLoss,
      DEFAULTS.maximumSavingUtilityLoss
    ),
    minimumSavingAmount: normalizeNonNegativeNumber(
      options.minimumSavingAmount,
      DEFAULTS.minimumSavingAmount
    ),
    minimumSavingRatio: normalizeRatio(
      options.minimumSavingRatio,
      DEFAULTS.minimumSavingRatio
    ),
    maximumAlternativeLocationLoss: normalizeNonNegativeNumber(
      options.maximumAlternativeLocationLoss,
      DEFAULTS.maximumAlternativeLocationLoss
    ),
    minimumSpecializedConfidence: normalizeRatio(
      options.minimumSpecializedConfidence,
      DEFAULTS.minimumSpecializedConfidence
    ),
    maximumBestChoiceScoreDifference: normalizeNonNegativeNumber(
      options.maximumBestChoiceScoreDifference,
      DEFAULTS.maximumBestChoiceScoreDifference
    ),
    maximumBestChoiceConfidenceDifference: normalizeRatio(
      options.maximumBestChoiceConfidenceDifference,
      DEFAULTS.maximumBestChoiceConfidenceDifference
    ),
    maximumBestChoiceCoverageDifference: normalizeRatio(
      options.maximumBestChoiceCoverageDifference,
      DEFAULTS.maximumBestChoiceCoverageDifference
    ),
    maximumBestChoiceRiskDifference: normalizeNonNegativeNumber(
      options.maximumBestChoiceRiskDifference,
      DEFAULTS.maximumBestChoiceRiskDifference
    ),
    maximumSavingAssignmentDifference: normalizeNonNegativeNumber(
      options.maximumSavingAssignmentDifference,
      DEFAULTS.maximumSavingAssignmentDifference
    ),
    maximumSavingRatioDifference: normalizeRatio(
      options.maximumSavingRatioDifference,
      DEFAULTS.maximumSavingRatioDifference
    ),
    maximumSavingUtilityLossDifference: normalizeNonNegativeNumber(
      options.maximumSavingUtilityLossDifference,
      DEFAULTS.maximumSavingUtilityLossDifference
    ),
    maximumUpgradeAssignmentDifference: normalizeNonNegativeNumber(
      options.maximumUpgradeAssignmentDifference,
      DEFAULTS.maximumUpgradeAssignmentDifference
    ),
    maximumUpgradeOverageRatioDifference: normalizeRatio(
      options.maximumUpgradeOverageRatioDifference,
      DEFAULTS.maximumUpgradeOverageRatioDifference
    ),
    maximumUpgradeAdjustedBenefitDifference: normalizeNonNegativeNumber(
      options.maximumUpgradeAdjustedBenefitDifference,
      DEFAULTS.maximumUpgradeAdjustedBenefitDifference
    ),
    maximumUpgradeEfficiencyDifference: normalizeNonNegativeNumber(
      options.maximumUpgradeEfficiencyDifference,
      DEFAULTS.maximumUpgradeEfficiencyDifference
    ),
    upgradeCurveOptions: {
      ...(options.upgradeCurveOptions ?? DEFAULTS.upgradeCurveOptions),
    },
    maximumInitiallyVisiblePerGroup: normalizePositiveInteger(
      options.maximumInitiallyVisiblePerGroup,
      DEFAULTS.maximumInitiallyVisiblePerGroup
    ),
  };
}

function normalizeCurrency(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function extractCost(
  evaluation: SmartStayPriceValueEvaluationV2 | undefined
): ComparableCost | null {
  if (
    !evaluation ||
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    typeof evaluation.totalCost !== "number" ||
    !Number.isFinite(evaluation.totalCost) ||
    evaluation.totalCost <= 0
  ) {
    return null;
  }

  const currency = normalizeCurrency(evaluation.currency);
  if (!currency) {
    return null;
  }

  return {
    amount: evaluation.totalCost,
    currency,
    evidenceIds: uniqueSorted(evaluation.evidenceIds),
  };
}

function hasVerifiedWithinBudget(candidate: NormalizedCandidate) {
  const budget = candidate.source.priceValue?.budget;
  return (
    candidate.cost !== null &&
    budget?.provided === true &&
    typeof budget.total === "number" &&
    Number.isFinite(budget.total) &&
    budget.total > 0 &&
    budget.withinBudget === true &&
    candidate.cost.amount <= budget.total
  );
}

function hasVerifiedBudgetOverage(candidate: NormalizedCandidate) {
  const budget = candidate.source.priceValue?.budget;
  return (
    candidate.cost !== null &&
    budget?.provided === true &&
    typeof budget.total === "number" &&
    Number.isFinite(budget.total) &&
    budget.total > 0 &&
    budget.withinBudget === false &&
    typeof budget.overageAmount === "number" &&
    Number.isFinite(budget.overageAmount) &&
    budget.overageAmount > 0 &&
    typeof budget.overageRatio === "number" &&
    Number.isFinite(budget.overageRatio) &&
    budget.overageRatio > 0 &&
    candidate.cost.amount > budget.total
  );
}

function extractLocation(
  evaluation: SmartStayLocationEvaluationV2 | undefined,
  minimumConfidence: number
): LocationSignal | null {
  if (
    !evaluation ||
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    typeof evaluation.score !== "number" ||
    !Number.isFinite(evaluation.score) ||
    typeof evaluation.distance.selectedDistanceKm !== "number" ||
    !Number.isFinite(evaluation.distance.selectedDistanceKm) ||
    evaluation.distance.selectedDistanceKm < 0 ||
    typeof evaluation.confidence !== "number" ||
    !Number.isFinite(evaluation.confidence) ||
    evaluation.confidence < minimumConfidence
  ) {
    return null;
  }

  return {
    score: evaluation.score,
    distanceKm: evaluation.distance.selectedDistanceKm,
    confidence: evaluation.confidence,
    evidenceIds: uniqueSorted(evaluation.evidenceIds),
  };
}

function extractComfort(
  evaluation: SmartStayComfortFlexibilityEvaluationV2 | undefined,
  minimumConfidence: number
): ComfortSignal | null {
  if (
    !evaluation ||
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    evaluation.mandatoryRequirements.satisfied !== true
  ) {
    return null;
  }

  const weightedDimensions = [
    { dimension: evaluation.dimensions.comfort, weight: 0.5 },
    { dimension: evaluation.dimensions.practicality, weight: 0.3 },
    { dimension: evaluation.dimensions.flexibility, weight: 0.2 },
  ].filter(
    (entry) =>
      typeof entry.dimension.score === "number" &&
      Number.isFinite(entry.dimension.score) &&
      typeof entry.dimension.confidence === "number" &&
      Number.isFinite(entry.dimension.confidence) &&
      entry.dimension.confidence >= minimumConfidence
  );

  if (weightedDimensions.length < 2) {
    return null;
  }

  const totalWeight = weightedDimensions.reduce(
    (total, entry) => total + entry.weight,
    0
  );
  if (totalWeight <= 0) {
    return null;
  }

  const score = weightedDimensions.reduce(
    (total, entry) => total + (entry.dimension.score ?? 0) * entry.weight,
    0
  ) / totalWeight;
  const confidence = weightedDimensions.reduce(
    (total, entry) => total + entry.dimension.confidence * entry.weight,
    0
  ) / totalWeight;
  const strongestDimensionScore = Math.max(
    ...weightedDimensions.map((entry) => entry.dimension.score ?? 0)
  );

  return {
    score: round(score, 4),
    confidence: round(confidence, 4),
    strongestDimensionScore: round(strongestDimensionScore, 4),
    evidenceIds: uniqueSorted([
      ...weightedDimensions.flatMap((entry) => entry.dimension.evidenceIds),
      ...evaluation.evidenceIds,
    ]),
  };
}

function createPreferenceSignature(
  utility: SmartStayUserUtilityEvaluationV2
) {
  const weights = Object.entries(utility.preference.weights)
    .sort((first, second) => compareStrings(first[0], second[0]))
    .map(([dimension, weight]) => `${dimension}:${weight.toFixed(6)}`)
    .join("|");
  return [utility.preference.id, weights].join("::");
}

function normalizeCandidate(
  candidate: SmartStayRecommendationCandidateV2,
  options: ResolvedOptions
): NormalizedCandidate {
  if (typeof candidate.hotelId !== "string" || !candidate.hotelId.trim()) {
    throw new Error("Recommendation candidate requires a hotelId.");
  }

  const hotelId = candidate.hotelId.trim();
  const componentHotelIds = [
    candidate.utility.hotelId,
    candidate.priceValue?.hotelId,
    candidate.location?.hotelId,
    candidate.comfortFlexibility?.hotelId,
  ].filter((value): value is string => typeof value === "string");

  if (componentHotelIds.some((value) => value !== hotelId)) {
    throw new Error(`Recommendation candidate hotelId mismatch: ${hotelId}`);
  }

  const utilityScore =
    typeof candidate.utility.utilityScore === "number" &&
    Number.isFinite(candidate.utility.utilityScore)
      ? candidate.utility.utilityScore
      : null;
  const smartScore =
    typeof candidate.smartScore === "number" &&
    Number.isFinite(candidate.smartScore)
      ? clamp(candidate.smartScore, 0, 100)
      : null;
  const recommendationScore = smartScore ?? utilityScore;
  const scoreConfidence = normalizeRatio(candidate.utility.scoreConfidence, 0);
  const evidenceCoverage = normalizeRatio(candidate.utility.evidenceCoverage, 0);
  const riskScore = clamp(
    Number.isFinite(candidate.risk.score) ? candidate.risk.score : 100,
    0,
    100
  );

  const roleEligible =
    candidate.eligibleForPrimaryRanking === true &&
    candidate.utility.eligibleForPrimaryRanking === true &&
    candidate.utility.status !== "invalid" &&
    candidate.utility.status !== "unavailable" &&
    recommendationScore !== null &&
    utilityScore !== null &&
    scoreConfidence >= options.minimumScoreConfidence &&
    evidenceCoverage >= options.minimumEvidenceCoverage &&
    candidate.risk.level !== "high" &&
    riskScore < 60;

  return {
    hotelId,
    source: candidate,
    roleEligible,
    smartScore,
    recommendationScore,
    utilityScore,
    scoreConfidence,
    evidenceCoverage,
    riskScore,
    cost: extractCost(candidate.priceValue),
    location: extractLocation(candidate.location, options.minimumSpecializedConfidence),
    comfort: extractComfort(
      candidate.comfortFlexibility,
      options.minimumSpecializedConfidence
    ),
    exclusionReasonCodes: uniqueSorted(candidate.exclusionReasonCodes ?? []),
  };
}

function sortBestChoiceCandidates(candidates: NormalizedCandidate[]) {
  return candidates.slice().sort(
    (first, second) =>
      (second.recommendationScore ?? -1) - (first.recommendationScore ?? -1) ||
      (second.utilityScore ?? -1) - (first.utilityScore ?? -1) ||
      second.scoreConfidence - first.scoreConfidence ||
      second.evidenceCoverage - first.evidenceCoverage ||
      first.riskScore - second.riskScore ||
      (first.cost?.amount ?? Number.POSITIVE_INFINITY) -
        (second.cost?.amount ?? Number.POSITIVE_INFINITY) ||
      compareStrings(first.hotelId, second.hotelId)
  );
}

function canUseAsAlternative(
  candidate: NormalizedCandidate,
  assignedHotelIds: Set<string>,
  options: ResolvedOptions
) {
  return (
    candidate.roleEligible &&
    !assignedHotelIds.has(candidate.hotelId) &&
    candidate.source.pareto.status === "frontier" &&
    candidate.utilityScore !== null &&
    candidate.utilityScore >= options.minimumAlternativeUtilityScore
  );
}

function isLocationCompatible(
  candidate: NormalizedCandidate,
  bestChoice: NormalizedCandidate,
  maximumLoss: number
) {
  if (bestChoice.location && !candidate.location) {
    return false;
  }
  return !(
    candidate.location &&
    bestChoice.location &&
    bestChoice.location.score - candidate.location.score > maximumLoss
  );
}

function createBaseMetrics(
  candidate: NormalizedCandidate
): SmartStayRecommendationMetricsV2 {
  const budget = candidate.source.priceValue?.budget;
  const budgetTotal =
    budget?.provided === true &&
    typeof budget.total === "number" &&
    Number.isFinite(budget.total) &&
    budget.total > 0
      ? budget.total
      : null;
  const withinBudget =
    budgetTotal !== null && typeof budget?.withinBudget === "boolean"
      ? budget.withinBudget
      : null;
  const budgetOverageAmount =
    budgetTotal !== null &&
    typeof budget?.overageAmount === "number" &&
    Number.isFinite(budget.overageAmount)
      ? Math.max(budget.overageAmount, 0)
      : null;
  const budgetOveragePercent =
    budgetTotal !== null &&
    typeof budget?.overageRatio === "number" &&
    Number.isFinite(budget.overageRatio)
      ? Math.max(budget.overageRatio, 0) * 100
      : null;

  return {
    smartScore: candidate.smartScore === null ? null : round(candidate.smartScore),
    displayedSmartScore:
      candidate.recommendationScore === null
        ? null
        : Math.round(candidate.recommendationScore),
    utilityScore:
      candidate.utilityScore === null ? null : round(candidate.utilityScore),
    utilityDifference: null,
    scoreConfidence: round(candidate.scoreConfidence, 4),
    evidenceCoverage: round(candidate.evidenceCoverage, 4),
    riskScore: round(candidate.riskScore),
    totalCost: candidate.cost ? round(candidate.cost.amount) : null,
    currency: candidate.cost?.currency ?? null,
    budgetTotal: budgetTotal === null ? null : round(budgetTotal),
    withinBudget,
    budgetOverageAmount:
      budgetOverageAmount === null ? null : round(budgetOverageAmount),
    budgetOveragePercent:
      budgetOveragePercent === null ? null : round(budgetOveragePercent, 2),
    priceDifferenceAmount: null,
    priceDifferencePercent: null,
    locationScore: candidate.location ? round(candidate.location.score) : null,
    distanceKm: candidate.location ? round(candidate.location.distanceKm) : null,
    distanceDifferenceKm: null,
    comfortScore: candidate.comfort ? round(candidate.comfort.score) : null,
    comfortDifference: null,
    upgradeExperienceGain: null,
    upgradeAdjustedBenefit: null,
    upgradeEfficiencyPerBudgetPercent: null,
    upgradeStrongestGainDimension: null,
    upgradeStrongestGain: null,
    upgradeDiminishingReturnsStart: false,
  };
}

function createComparisonMetrics(
  candidate: NormalizedCandidate,
  bestChoice: NormalizedCandidate
): SmartStayRecommendationMetricsV2 {
  const metrics = createBaseMetrics(candidate);
  if (candidate.utilityScore !== null && bestChoice.utilityScore !== null) {
    metrics.utilityDifference = round(
      candidate.utilityScore - bestChoice.utilityScore
    );
  }
  if (
    candidate.cost &&
    bestChoice.cost &&
    candidate.cost.currency === bestChoice.cost.currency
  ) {
    const difference = candidate.cost.amount - bestChoice.cost.amount;
    metrics.priceDifferenceAmount = round(difference);
    metrics.priceDifferencePercent = round(
      (difference / bestChoice.cost.amount) * 100,
      2
    );
  }
  if (candidate.location && bestChoice.location) {
    metrics.distanceDifferenceKm = round(
      candidate.location.distanceKm - bestChoice.location.distanceKm
    );
  }
  if (candidate.comfort && bestChoice.comfort) {
    metrics.comfortDifference = round(
      candidate.comfort.score - bestChoice.comfort.score
    );
  }
  return metrics;
}

function createUpgradeMetrics(
  candidate: NormalizedCandidate,
  bestChoice: NormalizedCandidate,
  point: SmartStayUpgradeCurvePointV2,
  curve: SmartStayUpgradeCurveEvaluationV2
): SmartStayRecommendationMetricsV2 {
  const metrics = createComparisonMetrics(candidate, bestChoice);
  metrics.upgradeExperienceGain =
    point.experienceGain === null ? null : round(point.experienceGain);
  metrics.upgradeAdjustedBenefit =
    point.adjustedBenefit === null ? null : round(point.adjustedBenefit);
  metrics.upgradeEfficiencyPerBudgetPercent =
    point.efficiencyPerBudgetPercent === null
      ? null
      : round(point.efficiencyPerBudgetPercent, 4);
  metrics.upgradeStrongestGainDimension = point.strongestGainDimension;
  metrics.upgradeStrongestGain =
    point.strongestGain === null ? null : round(point.strongestGain);
  metrics.upgradeDiminishingReturnsStart =
    curve.diminishingReturnsStartHotelId === candidate.hotelId;
  return metrics;
}

function createTieGroupId(
  role: SmartStayPrimaryRecommendationRoleV2,
  primaryHotelId: string
) {
  return `recommendation:${role}:${primaryHotelId}`;
}

function createPick(
  candidate: NormalizedCandidate,
  role: SmartStayPrimaryRecommendationRoleV2,
  comparisonTargetHotelId: string | null,
  assignmentScore: number,
  tieGroupId: string,
  groupPosition: number,
  reasonCodes: string[],
  evidenceIds: string[],
  metrics: SmartStayRecommendationMetricsV2
): SmartStayRecommendationPickV2 {
  return {
    hotelId: candidate.hotelId,
    role,
    comparisonTargetHotelId,
    assignmentScore: round(assignmentScore, 4),
    tieGroupId,
    groupPosition,
    primaryInGroup: groupPosition === 1,
    reasonCodes: uniqueSorted(reasonCodes),
    evidenceIds: uniqueSorted(evidenceIds),
    metrics,
  };
}

function createGroup(
  role: SmartStayPrimaryRecommendationRoleV2,
  picks: SmartStayRecommendationPickV2[],
  comparisonTargetHotelId: string | null,
  reasonCodes: string[],
  maximumInitiallyVisiblePerGroup: number
): SmartStayRecommendationRoleGroupV2 {
  const memberHotelIds = picks.map((pick) => pick.hotelId);
  return {
    tieGroupId: picks[0].tieGroupId,
    role,
    primaryHotelId: picks[0].hotelId,
    memberHotelIds,
    initiallyVisibleHotelIds: memberHotelIds.slice(
      0,
      maximumInitiallyVisiblePerGroup
    ),
    additionalHotelIds: memberHotelIds.slice(maximumInitiallyVisiblePerGroup),
    comparisonTargetHotelId,
    reasonCodes: uniqueSorted(reasonCodes),
  };
}

function selectBestChoiceGroup(
  candidates: NormalizedCandidate[],
  options: ResolvedOptions
) {
  const eligibleWithinBudget = candidates.filter(
    (candidate) => candidate.roleEligible && hasVerifiedWithinBudget(candidate)
  );
  const frontier = eligibleWithinBudget.filter(
    (candidate) => candidate.source.pareto.status === "frontier"
  );
  const unknown = eligibleWithinBudget.filter(
    (candidate) => candidate.source.pareto.status === "unknown"
  );
  const pool = frontier.length > 0
    ? frontier
    : unknown.length > 0
      ? unknown
      : eligibleWithinBudget;
  const ordered = sortBestChoiceCandidates(pool);
  const anchor = ordered[0] ?? null;
  if (!anchor || anchor.recommendationScore === null) {
    return null;
  }

  const anchorRecommendationScore = anchor.recommendationScore;
  const anchorDisplayedScore = Math.round(anchorRecommendationScore);
  const members = ordered.filter((candidate) => {
    if (candidate.recommendationScore === null) {
      return false;
    }
    return (
      Math.round(candidate.recommendationScore) === anchorDisplayedScore &&
      anchorRecommendationScore - candidate.recommendationScore <=
        options.maximumBestChoiceScoreDifference &&
      Math.abs(anchor.scoreConfidence - candidate.scoreConfidence) <=
        options.maximumBestChoiceConfidenceDifference &&
      Math.abs(anchor.evidenceCoverage - candidate.evidenceCoverage) <=
        options.maximumBestChoiceCoverageDifference &&
      candidate.riskScore - anchor.riskScore <=
        options.maximumBestChoiceRiskDifference
    );
  });

  const tieGroupId = createTieGroupId("best-choice", anchor.hotelId);
  const picks = members.map((candidate, index) =>
    createPick(
      candidate,
      "best-choice",
      null,
      candidate.recommendationScore ?? 0,
      tieGroupId,
      index + 1,
      [
        "recommendation-best-choice",
        "recommendation-within-budget-required",
        "recommendation-equivalent-top-score",
        candidate.smartScore === null
          ? "recommendation-score-fallback-to-utility"
          : "recommendation-smart-score-used",
        candidate.source.pareto.status === "frontier"
          ? "recommendation-pareto-frontier"
          : "recommendation-pareto-fallback",
      ],
      [
        ...candidate.source.utility.evidenceIds,
        ...candidate.source.risk.evidenceIds,
        ...(candidate.cost?.evidenceIds ?? []),
      ],
      createBaseMetrics(candidate)
    )
  );

  return {
    anchor,
    members,
    picks,
    group: createGroup(
      "best-choice",
      picks,
      null,
      [
        "recommendation-best-choice-group",
        members.length > 1
          ? "recommendation-multiple-equivalent-options"
          : "recommendation-single-best-option",
      ],
      options.maximumInitiallyVisiblePerGroup
    ),
  };
}

function buildSavingAlternatives(
  candidates: NormalizedCandidate[],
  bestChoice: NormalizedCandidate,
  assignedHotelIds: Set<string>,
  options: ResolvedOptions
): SavingAlternative[] {
  if (!bestChoice.cost || bestChoice.utilityScore === null) {
    return [];
  }
  const bestCost = bestChoice.cost;

  return candidates
    .filter(
      (candidate) =>
        canUseAsAlternative(candidate, assignedHotelIds, options) &&
        hasVerifiedWithinBudget(candidate)
    )
    .map((candidate): SavingAlternative | null => {
      if (
        !candidate.cost ||
        candidate.cost.currency !== bestCost.currency ||
        candidate.utilityScore === null
      ) {
        return null;
      }
      const savingAmount = bestCost.amount - candidate.cost.amount;
      const savingRatio = savingAmount / bestCost.amount;
      const utilityLoss = bestChoice.utilityScore! - candidate.utilityScore;
      const minimumSavingAmount = Math.max(
        options.minimumSavingAmount,
        bestCost.amount * options.minimumSavingRatio
      );
      if (
        savingAmount < minimumSavingAmount ||
        savingRatio < options.minimumSavingRatio ||
        utilityLoss > options.maximumSavingUtilityLoss ||
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
        savingRatio * 30 -
        Math.max(utilityLoss, 0) * 0.5 -
        candidate.riskScore * 0.05;
      return {
        candidate,
        savingAmount,
        savingRatio,
        utilityLoss,
        assignmentScore,
      };
    })
    .filter((value): value is SavingAlternative => value !== null)
    .sort(
      (first, second) =>
        second.assignmentScore - first.assignmentScore ||
        (second.candidate.utilityScore ?? -1) -
          (first.candidate.utilityScore ?? -1) ||
        second.savingRatio - first.savingRatio ||
        compareStrings(first.candidate.hotelId, second.candidate.hotelId)
    );
}

function selectSavingGroup(
  candidates: NormalizedCandidate[],
  bestChoice: NormalizedCandidate,
  assignedHotelIds: Set<string>,
  options: ResolvedOptions
) {
  const alternatives = buildSavingAlternatives(
    candidates,
    bestChoice,
    assignedHotelIds,
    options
  );
  const anchor = alternatives[0] ?? null;
  if (!anchor) {
    return null;
  }

  const members = alternatives.filter(
    (alternative) =>
      anchor.assignmentScore - alternative.assignmentScore <=
        options.maximumSavingAssignmentDifference &&
      Math.abs(anchor.savingRatio - alternative.savingRatio) <=
        options.maximumSavingRatioDifference &&
      Math.abs(anchor.utilityLoss - alternative.utilityLoss) <=
        options.maximumSavingUtilityLossDifference
  );
  const tieGroupId = createTieGroupId(
    "best-sensible-saving",
    anchor.candidate.hotelId
  );
  const picks = members.map((alternative, index) =>
    createPick(
      alternative.candidate,
      "best-sensible-saving",
      bestChoice.hotelId,
      alternative.assignmentScore,
      tieGroupId,
      index + 1,
      [
        "recommendation-best-sensible-saving",
        "recommendation-meaningful-saving",
        "recommendation-same-currency-comparison",
        "recommendation-utility-loss-within-limit",
        "recommendation-within-budget",
        "recommendation-equivalent-saving-value",
      ],
      [
        ...alternative.candidate.source.utility.evidenceIds,
        ...(alternative.candidate.cost?.evidenceIds ?? []),
        ...alternative.candidate.source.risk.evidenceIds,
        ...bestChoice.source.utility.evidenceIds,
        ...(bestChoice.cost?.evidenceIds ?? []),
      ],
      createComparisonMetrics(alternative.candidate, bestChoice)
    )
  );

  return {
    members: members.map((member) => member.candidate),
    picks,
    group: createGroup(
      "best-sensible-saving",
      picks,
      bestChoice.hotelId,
      [
        "recommendation-best-sensible-saving-group",
        members.length > 1
          ? "recommendation-multiple-equivalent-options"
          : "recommendation-single-saving-option",
      ],
      options.maximumInitiallyVisiblePerGroup
    ),
  };
}

function createUpgradeCurveCandidates(
  candidates: NormalizedCandidate[]
): SmartStayUpgradeCurveCandidateV2[] {
  return candidates
    .filter(
      (
        candidate
      ): candidate is NormalizedCandidate & {
        source: SmartStayRecommendationCandidateV2 & {
          priceValue: SmartStayPriceValueEvaluationV2;
        };
      } => candidate.source.priceValue !== undefined
    )
    .map((candidate) => ({
      hotelId: candidate.hotelId,
      eligibleForPrimaryRanking: candidate.source.eligibleForPrimaryRanking,
      utility: candidate.source.utility,
      priceValue: candidate.source.priceValue,
      risk: candidate.source.risk,
      pareto: candidate.source.pareto,
      exclusionReasonCodes: candidate.source.exclusionReasonCodes,
    }));
}

function evaluateUpgradeCurveSafely(
  candidates: NormalizedCandidate[],
  bestChoice: NormalizedCandidate,
  upgradeCurveOptions: SmartStayUpgradeCurveOptionsV2
): SmartStayUpgradeCurveEvaluationV2 | null {
  const curveCandidates = createUpgradeCurveCandidates(candidates);

  if (
    !curveCandidates.some(
      (candidate) => candidate.hotelId === bestChoice.hotelId
    )
  ) {
    return null;
  }

  try {
    return evaluateSmartUpgradeCurveV2(
      {
        baselineHotelId: bestChoice.hotelId,
        candidates: curveCandidates,
      },
      upgradeCurveOptions
    );
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message ===
      "Smart Upgrade Curve baseline must be an eligible, verified within-budget candidate with sufficient comparable dimensions."
    ) {
      return null;
    }

    throw error;
  }
}

function buildUpgradeAlternatives(
  candidates: NormalizedCandidate[],
  assignedHotelIds: Set<string>,
  curve: SmartStayUpgradeCurveEvaluationV2,
  options: ResolvedOptions
): UpgradeAlternative[] {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.hotelId, candidate] as const)
  );
  const pointsById = new Map(
    curve.points.map((point) => [point.hotelId, point] as const)
  );

  return curve.worthwhileUpgradeHotelIds
    .map((hotelId): UpgradeAlternative | null => {
      const candidate = candidatesById.get(hotelId) ?? null;
      const point = pointsById.get(hotelId) ?? null;

      if (
        !candidate ||
        !point ||
        !canUseAsAlternative(candidate, assignedHotelIds, options) ||
        point.status !== "worthwhile" ||
        point.efficientFrontier !== true ||
        point.adjustedBenefit === null ||
        point.efficiencyPerBudgetPercent === null
      ) {
        return null;
      }

      return {
        candidate,
        point,
        assignmentScore:
          point.adjustedBenefit + point.efficiencyPerBudgetPercent,
      };
    })
    .filter((value): value is UpgradeAlternative => value !== null)
    .sort(
      (first, second) =>
        second.assignmentScore - first.assignmentScore ||
        (second.point.adjustedBenefit ?? -1) -
          (first.point.adjustedBenefit ?? -1) ||
        (second.point.efficiencyPerBudgetPercent ?? -1) -
          (first.point.efficiencyPerBudgetPercent ?? -1) ||
        (first.point.budgetOverageRatio ?? Number.POSITIVE_INFINITY) -
          (second.point.budgetOverageRatio ?? Number.POSITIVE_INFINITY) ||
        compareStrings(first.candidate.hotelId, second.candidate.hotelId)
    );
}

function selectUpgradeGroup(
  candidates: NormalizedCandidate[],
  bestChoice: NormalizedCandidate,
  assignedHotelIds: Set<string>,
  options: ResolvedOptions
) {
  const curve = evaluateUpgradeCurveSafely(
    candidates,
    bestChoice,
    options.upgradeCurveOptions
  );

  if (!curve) {
    return {
      curve: null,
      members: [] as NormalizedCandidate[],
      picks: [] as SmartStayRecommendationPickV2[],
      group: null as SmartStayRecommendationRoleGroupV2 | null,
    };
  }

  const alternatives = buildUpgradeAlternatives(
    candidates,
    assignedHotelIds,
    curve,
    options
  );
  const anchor = alternatives[0] ?? null;

  if (!anchor) {
    return {
      curve,
      members: [] as NormalizedCandidate[],
      picks: [] as SmartStayRecommendationPickV2[],
      group: null as SmartStayRecommendationRoleGroupV2 | null,
    };
  }

  const anchorOverage = anchor.point.budgetOverageRatio ?? 0;
  const anchorBenefit = anchor.point.adjustedBenefit ?? 0;
  const anchorEfficiency = anchor.point.efficiencyPerBudgetPercent ?? 0;

  const members = alternatives.filter((alternative) =>
    anchor.assignmentScore - alternative.assignmentScore <=
      options.maximumUpgradeAssignmentDifference &&
    Math.abs(
      anchorOverage - (alternative.point.budgetOverageRatio ?? 0)
    ) <= options.maximumUpgradeOverageRatioDifference &&
    Math.abs(
      anchorBenefit - (alternative.point.adjustedBenefit ?? 0)
    ) <= options.maximumUpgradeAdjustedBenefitDifference &&
    Math.abs(
      anchorEfficiency -
        (alternative.point.efficiencyPerBudgetPercent ?? 0)
    ) <= options.maximumUpgradeEfficiencyDifference
  );
  const tieGroupId = createTieGroupId(
    "worthwhile-comfort-upgrade",
    anchor.candidate.hotelId
  );
  const picks = members.map((alternative, index) =>
    createPick(
      alternative.candidate,
      "worthwhile-comfort-upgrade",
      bestChoice.hotelId,
      alternative.assignmentScore,
      tieGroupId,
      index + 1,
      [
        "recommendation-worthwhile-smart-upgrade",
        "recommendation-upgrade-curve-verified",
        "recommendation-multidimensional-benefit",
        "recommendation-above-budget-upgrade",
        "recommendation-efficient-upgrade-frontier",
        "recommendation-equivalent-upgrade-value",
        ...alternative.point.reasonCodes,
      ],
      [
        ...alternative.point.evidenceIds,
        ...alternative.candidate.source.risk.evidenceIds,
        ...bestChoice.source.utility.evidenceIds,
        ...(bestChoice.cost?.evidenceIds ?? []),
      ],
      createUpgradeMetrics(
        alternative.candidate,
        bestChoice,
        alternative.point,
        curve
      )
    )
  );

  return {
    curve,
    members: members.map((member) => member.candidate),
    picks,
    group: createGroup(
      "worthwhile-comfort-upgrade",
      picks,
      bestChoice.hotelId,
      [
        "recommendation-smart-upgrade-group",
        "recommendation-upgrade-curve-source-of-truth",
        members.length > 1
          ? "recommendation-multiple-equivalent-options"
          : "recommendation-single-upgrade-option",
      ],
      options.maximumInitiallyVisiblePerGroup
    ),
  };
}

export function evaluateRecommendationRolesV2(
  candidates: SmartStayRecommendationCandidateV2[],
  options: SmartStayRecommendationRolesOptionsV2 = {}
): SmartStayRecommendationRolesEvaluationV2 {
  const resolvedOptions = resolveOptions(options);
  const normalizedCandidates = candidates
    .map((candidate) => normalizeCandidate(candidate, resolvedOptions))
    .sort((first, second) => compareStrings(first.hotelId, second.hotelId));

  const hotelIds = normalizedCandidates.map((candidate) => candidate.hotelId);
  if (new Set(hotelIds).size !== hotelIds.length) {
    throw new Error("Recommendation Roles received duplicate hotelIds.");
  }

  if (normalizedCandidates.length > 1) {
    const signature = createPreferenceSignature(
      normalizedCandidates[0].source.utility
    );
    for (const candidate of normalizedCandidates) {
      if (createPreferenceSignature(candidate.source.utility) !== signature) {
        throw new Error(
          "Recommendation candidates must use the same utility preference and weights."
        );
      }
    }
  }

  const bestChoiceSelection = selectBestChoiceGroup(
    normalizedCandidates,
    resolvedOptions
  );

  if (!bestChoiceSelection) {
    return {
      bestChoiceHotelId: null,
      upgradeCurve: null,
      groups: [],
      picks: [],
      evaluations: normalizedCandidates.map((candidate) => ({
        hotelId: candidate.hotelId,
        role: "unassigned",
        eligible: false,
        reasonCodes: uniqueSorted([
          ...candidate.exclusionReasonCodes,
          "recommendation-no-eligible-within-budget-best-choice",
        ]),
        comparisonTargetHotelId: null,
        evidenceIds: uniqueSorted([
          ...candidate.source.utility.evidenceIds,
          ...candidate.source.risk.evidenceIds,
        ]),
        assignmentScore: null,
        tieGroupId: null,
        groupPosition: null,
        primaryInGroup: false,
        metrics: createBaseMetrics(candidate),
      })),
    };
  }

  const groups: SmartStayRecommendationRoleGroupV2[] = [
    bestChoiceSelection.group,
  ];
  const picks: SmartStayRecommendationPickV2[] = [
    ...bestChoiceSelection.picks,
  ];
  const assignedHotelIds = new Set(
    bestChoiceSelection.members.map((candidate) => candidate.hotelId)
  );
  const bestChoice = bestChoiceSelection.anchor;

  const savingSelection = selectSavingGroup(
    normalizedCandidates,
    bestChoice,
    assignedHotelIds,
    resolvedOptions
  );
  if (savingSelection) {
    groups.push(savingSelection.group);
    picks.push(...savingSelection.picks);
    for (const member of savingSelection.members) {
      assignedHotelIds.add(member.hotelId);
    }
  }

  const upgradeSelection = selectUpgradeGroup(
    normalizedCandidates,
    bestChoice,
    assignedHotelIds,
    resolvedOptions
  );
  if (upgradeSelection.group) {
    groups.push(upgradeSelection.group);
    picks.push(...upgradeSelection.picks);
    for (const member of upgradeSelection.members) {
      assignedHotelIds.add(member.hotelId);
    }
  }

  groups.sort(
    (first, second) =>
      ROLE_ORDER.indexOf(first.role) - ROLE_ORDER.indexOf(second.role)
  );
  picks.sort(
    (first, second) =>
      ROLE_ORDER.indexOf(first.role) - ROLE_ORDER.indexOf(second.role) ||
      first.groupPosition - second.groupPosition ||
      compareStrings(first.hotelId, second.hotelId)
  );

  const picksByHotelId = new Map(
    picks.map((pick) => [pick.hotelId, pick] as const)
  );

  const evaluations = normalizedCandidates.map(
    (candidate): SmartStayRecommendationEvaluationV2 => {
      const pick = picksByHotelId.get(candidate.hotelId);
      if (pick) {
        return {
          hotelId: candidate.hotelId,
          role: pick.role,
          eligible: true,
          reasonCodes: pick.reasonCodes,
          comparisonTargetHotelId: pick.comparisonTargetHotelId,
          evidenceIds: pick.evidenceIds,
          assignmentScore: pick.assignmentScore,
          tieGroupId: pick.tieGroupId,
          groupPosition: pick.groupPosition,
          primaryInGroup: pick.primaryInGroup,
          metrics: pick.metrics,
        };
      }

      const reasonCodes = [...candidate.exclusionReasonCodes];
      if (!candidate.roleEligible) {
        reasonCodes.push("recommendation-not-eligible");
      } else if (candidate.source.pareto.status === "dominated") {
        reasonCodes.push("recommendation-pareto-dominated");
      } else if (candidate.source.pareto.status === "unknown") {
        reasonCodes.push("recommendation-pareto-not-frontier");
      } else if (!hasVerifiedWithinBudget(candidate) && !hasVerifiedBudgetOverage(candidate)) {
        reasonCodes.push("recommendation-budget-status-unverified");
      } else {
        reasonCodes.push("recommendation-not-selected");
      }

      return {
        hotelId: candidate.hotelId,
        role: "unassigned",
        eligible: candidate.roleEligible,
        reasonCodes: uniqueSorted(reasonCodes),
        comparisonTargetHotelId: bestChoice.hotelId,
        evidenceIds: uniqueSorted([
          ...candidate.source.utility.evidenceIds,
          ...candidate.source.risk.evidenceIds,
        ]),
        assignmentScore: null,
        tieGroupId: null,
        groupPosition: null,
        primaryInGroup: false,
        metrics: createComparisonMetrics(candidate, bestChoice),
      };
    }
  );

  return {
    bestChoiceHotelId: bestChoice.hotelId,
    upgradeCurve: upgradeSelection.curve,
    groups,
    picks,
    evaluations,
  };
}
