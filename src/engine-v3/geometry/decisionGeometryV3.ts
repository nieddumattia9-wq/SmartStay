import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
} from "../contract/stableHashV3";

import {
  validatePeerAssignmentV3,
  type StayOptiPeerAssignmentV3,
} from "../peer/peerIntelligenceV3";

import {
  createBudgetUtilityV3,
  validatePersonalUtilityEvaluationV3,
  type StayOptiPersonalUtilityEvaluationV3,
  type StayOptiUtilityDimensionV3,
} from "../utility/personalUtilityV3";

export const STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3 = [
  "quality",
  "location",
  "comfort",
  "flexibility",
  "categoryFit",
  "userFit",
] as const satisfies readonly StayOptiUtilityDimensionV3[];

export type StayOptiGeometryBenefitDimensionV3 =
  typeof STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3[number];

export type StayOptiGeometryDimensionV3 =
  | "totalCost"
  | StayOptiGeometryBenefitDimensionV3;

export type StayOptiGeometryCandidateStatusV3 =
  | "comparable"
  | "ineligible"
  | "incomplete"
  | "peer-unavailable";

export type StayOptiParetoStatusV3 =
  | "frontier"
  | "dominated"
  | "unknown";

export type StayOptiDominanceKindV3 =
  | "pareto-non-worse"
  | "strict-all";

export type StayOptiPairwiseOutcomeV3 =
  | "first-preferred"
  | "second-preferred"
  | "utility-equivalent"
  | "incomparable";

export type StayOptiMarginalTrendV3 =
  | "baseline"
  | "increasing-return"
  | "stable-return"
  | "diminishing-return"
  | "negative-return";

export type StayOptiThresholdResolutionStatusV3 =
  | "available"
  | "unattainable"
  | "unbounded-by-utility"
  | "unavailable";

export type StayOptiThresholdVerdictV3 =
  | "worthwhile"
  | "not-justified"
  | "unavailable";

export type StayOptiDecisionMapZoneV3 =
  | "saving-edge"
  | "efficient-frontier"
  | "diminishing-returns"
  | "unsupported-premium"
  | "dominated"
  | "insufficient-evidence";

export interface EvaluateStayOptiDecisionGeometryCandidateV3 {
  hotelId:
    string;

  solutionId:
    string |
    null;

  eligible:
    boolean;

  totalCost:
    number |
    null;

  currency:
    string |
    null;

  costIntegrityStatus:
    | "complete"
    | "provisional"
    | "incomplete"
    | "conflicting";

  utility:
    StayOptiPersonalUtilityEvaluationV3;

  peerAssignment:
    StayOptiPeerAssignmentV3;
}

export interface StayOptiDecisionGeometryOptionsV3 {
  benefitNonWorseTolerance?:
    number;

  benefitMaterialImprovement?:
    number;

  costNonWorseTolerance?:
    number;

  costMaterialImprovementRatio?:
    number;

  pairwiseUtilityTolerance?:
    number;
}

export interface StayOptiGeometryCandidateEvaluationV3 {
  hotelId:
    string;

  solutionId:
    string |
    null;

  status:
    StayOptiGeometryCandidateStatusV3;

  totalCost:
    number |
    null;

  currency:
    string |
    null;

  utilityScore:
    number |
    null;

  strongParetoStatus:
    StayOptiParetoStatusV3;

  weakParetoStatus:
    StayOptiParetoStatusV3;

  availableDimensions:
    StayOptiGeometryDimensionV3[];

  missingDimensions:
    StayOptiGeometryDimensionV3[];

  comparablePeerHotelIds:
    string[];

  dominatedByHotelIds:
    string[];

  strictlyDominatedByHotelIds:
    string[];

  dominatesHotelIds:
    string[];

  primaryEliminationVariable:
    StayOptiGeometryDimensionV3 |
    null;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiDominanceRelationV3 {
  dominantHotelId:
    string;

  dominatedHotelId:
    string;

  kinds:
    StayOptiDominanceKindV3[];

  comparedDimensions:
    StayOptiGeometryDimensionV3[];

  betterDimensions:
    StayOptiGeometryDimensionV3[];

  equivalentDimensions:
    StayOptiGeometryDimensionV3[];

  decisiveDimension:
    StayOptiGeometryDimensionV3;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiPairwiseComparisonV3 {
  comparisonId:
    string;

  firstHotelId:
    string;

  secondHotelId:
    string;

  outcome:
    StayOptiPairwiseOutcomeV3;

  preferredHotelId:
    string |
    null;

  decisiveDimension:
    StayOptiGeometryDimensionV3 |
    null;

  utilityDeltaFirstMinusSecond:
    number |
    null;

  dominanceKind:
    StayOptiDominanceKindV3 |
    null;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiMaximumSensiblePriceV3 {
  status:
    StayOptiThresholdResolutionStatusV3;

  amount:
    number |
    null;

  currency:
    string |
    null;

  againstHotelId:
    string;
}

export interface StayOptiTradeOffThresholdV3 {
  thresholdId:
    string;

  lowerCostHotelId:
    string;

  higherCostHotelId:
    string;

  currency:
    string;

  actualPremiumAmount:
    number;

  higherCostMaximumSensiblePrice:
    StayOptiMaximumSensiblePriceV3;

  upgradeThresholdAmount:
    number |
    null;

  upgradeVerdict:
    StayOptiThresholdVerdictV3;

  actualSavingAmount:
    number;

  lowerCostMaximumSensiblePrice:
    StayOptiMaximumSensiblePriceV3;

  savingThresholdAmount:
    number |
    null;

  savingVerdict:
    StayOptiThresholdVerdictV3;

  exact:
    boolean;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiMarginalValueSegmentV3 {
  segmentId:
    string;

  peerGroupId:
    string;

  lowerCostHotelId:
    string;

  higherCostHotelId:
    string;

  incrementalCost:
    number;

  incrementalUtility:
    number;

  marginalUtilityPerCurrencyUnit:
    number;

  marginalUtilityPer100Currency:
    number;

  trend:
    StayOptiMarginalTrendV3;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiDecisionMapPointV3 {
  hotelId:
    string;

  totalCost:
    number |
    null;

  utilityScore:
    number |
    null;

  zone:
    StayOptiDecisionMapZoneV3;

  incomingMarginalSegmentIds:
    string[];

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiDecisionGeometryV3 {
  evaluationId:
    string;

  phase:
    "v3-04";

  rankingApplication:
    "shadow-only";

  status:
    | "usable"
    | "partial"
    | "unavailable";

  dimensions:
    StayOptiGeometryDimensionV3[];

  candidates:
    StayOptiGeometryCandidateEvaluationV3[];

  strongParetoFrontierHotelIds:
    string[];

  weakParetoFrontierHotelIds:
    string[];

  dominanceRelations:
    StayOptiDominanceRelationV3[];

  pairwiseFinalistComparisons:
    StayOptiPairwiseComparisonV3[];

  marginalValueSegments:
    StayOptiMarginalValueSegmentV3[];

  tradeOffThresholds:
    StayOptiTradeOffThresholdV3[];

  decisionMap: {
    internalOnly:
      true;

    points:
      StayOptiDecisionMapPointV3[];
  };

  exactThresholdCount:
    number;

  reasonCodes:
    SmartStayReasonCodeV3[];

  fingerprint:
    string;
}

type ResolvedOptions = Required<StayOptiDecisionGeometryOptionsV3>;

type NormalizedBenefit = {
  score:
    number;

  confidence:
    number;

  weightedValue:
    number;
};

type NormalizedCandidate = {
  source:
    EvaluateStayOptiDecisionGeometryCandidateV3;

  hotelId:
    string;

  solutionId:
    string |
    null;

  status:
    StayOptiGeometryCandidateStatusV3;

  totalCost:
    number |
    null;

  currency:
    string |
    null;

  utilityScore:
    number |
    null;

  benefits:
    Map<StayOptiGeometryBenefitDimensionV3, NormalizedBenefit>;

  availableDimensions:
    StayOptiGeometryDimensionV3[];

  missingDimensions:
    StayOptiGeometryDimensionV3[];

  peerAssignment:
    StayOptiPeerAssignmentV3;
};

type PairComparability = {
  comparable:
    boolean;

  reasonCodes:
    SmartStayReasonCodeV3[];
};

const ALL_DIMENSIONS: readonly StayOptiGeometryDimensionV3[] = [
  "totalCost",
  ...STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3,
];

const DEFAULT_OPTIONS: ResolvedOptions = {
  benefitNonWorseTolerance:
    0.25,
  benefitMaterialImprovement:
    1,
  costNonWorseTolerance:
    0.01,
  costMaterialImprovementRatio:
    0.005,
  pairwiseUtilityTolerance:
    0.25,
};

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function uniqueSorted<Value extends string>(values: readonly Value[]) {
  return [...new Set(values)].sort() as Value[];
}

function normalizeFiniteNonNegative(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function normalizeFinitePositive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function resolveOptions(options: StayOptiDecisionGeometryOptionsV3): ResolvedOptions {
  const resolved = {
    benefitNonWorseTolerance:
      normalizeFiniteNonNegative(
        options.benefitNonWorseTolerance,
        DEFAULT_OPTIONS.benefitNonWorseTolerance
      ),
    benefitMaterialImprovement:
      normalizeFiniteNonNegative(
        options.benefitMaterialImprovement,
        DEFAULT_OPTIONS.benefitMaterialImprovement
      ),
    costNonWorseTolerance:
      normalizeFiniteNonNegative(
        options.costNonWorseTolerance,
        DEFAULT_OPTIONS.costNonWorseTolerance
      ),
    costMaterialImprovementRatio:
      normalizeFiniteNonNegative(
        options.costMaterialImprovementRatio,
        DEFAULT_OPTIONS.costMaterialImprovementRatio
      ),
    pairwiseUtilityTolerance:
      normalizeFiniteNonNegative(
        options.pairwiseUtilityTolerance,
        DEFAULT_OPTIONS.pairwiseUtilityTolerance
      ),
  };

  if (
    resolved.benefitMaterialImprovement <=
    resolved.benefitNonWorseTolerance
  ) {
    throw new Error(
      "Decision Geometry material improvement must exceed the non-worse tolerance."
    );
  }

  return resolved;
}

function normalizeCandidate(
  candidate: EvaluateStayOptiDecisionGeometryCandidateV3
): NormalizedCandidate {
  const hotelId = candidate.hotelId.trim();

  if (!hotelId) {
    throw new Error("Decision Geometry requires a hotelId.");
  }

  if (
    candidate.utility.hotelId !== hotelId ||
    candidate.peerAssignment.hotelId !== hotelId ||
    !validatePersonalUtilityEvaluationV3(candidate.utility).valid ||
    !validatePeerAssignmentV3(candidate.peerAssignment).valid
  ) {
    throw new Error(`Decision Geometry received invalid linked evidence for ${hotelId}.`);
  }

  const totalCost = normalizeFinitePositive(candidate.totalCost);
  const currency = candidate.currency?.trim().toUpperCase() || null;
  const contributionByDimension = new Map(
    candidate.utility.contributions.map((contribution) => [
      contribution.dimension,
      contribution,
    ] as const)
  );
  const benefits = new Map<
    StayOptiGeometryBenefitDimensionV3,
    NormalizedBenefit
  >();

  for (const dimension of STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3) {
    const contribution = contributionByDimension.get(dimension);

    if (
      contribution?.available === true &&
      contribution.transformedScore !== null &&
      Number.isFinite(contribution.transformedScore) &&
      contribution.confidence > 0
    ) {
      benefits.set(dimension, {
        score:
          contribution.transformedScore,
        confidence:
          contribution.confidence,
        weightedValue:
          contribution.weightedValue,
      });
    }
  }

  const availableDimensions: StayOptiGeometryDimensionV3[] = [];

  if (
    totalCost !== null &&
    currency !== null &&
    candidate.costIntegrityStatus === "complete"
  ) {
    availableDimensions.push("totalCost");
  }

  for (const dimension of STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3) {
    if (benefits.has(dimension)) {
      availableDimensions.push(dimension);
    }
  }

  const missingDimensions = ALL_DIMENSIONS.filter(
    (dimension) => !availableDimensions.includes(dimension)
  );

  let status: StayOptiGeometryCandidateStatusV3;

  if (!candidate.eligible) {
    status = "ineligible";
  }
  else if (missingDimensions.length > 0 || candidate.utility.utilityScore === null) {
    status = "incomplete";
  }
  else if (!candidate.peerAssignment.directComparisonAllowed) {
    status = "peer-unavailable";
  }
  else {
    status = "comparable";
  }

  return {
    source:
      candidate,
    hotelId,
    solutionId:
      candidate.solutionId?.trim() || null,
    status,
    totalCost,
    currency,
    utilityScore:
      candidate.utility.utilityScore,
    benefits,
    availableDimensions:
      uniqueSorted(availableDimensions),
    missingDimensions:
      uniqueSorted(missingDimensions),
    peerAssignment:
      candidate.peerAssignment,
  };
}

function pairComparability(
  first: NormalizedCandidate,
  second: NormalizedCandidate
): PairComparability {
  const directPeer =
    first.peerAssignment.directComparisonAllowed &&
    second.peerAssignment.directComparisonAllowed &&
    first.peerAssignment.memberHotelIds.includes(second.hotelId) &&
    second.peerAssignment.memberHotelIds.includes(first.hotelId);

  const comparable =
    first.status === "comparable" &&
    second.status === "comparable" &&
    first.currency !== null &&
    first.currency === second.currency &&
    directPeer;

  return {
    comparable,
    reasonCodes:
      comparable
        ? uniqueReasonCodesV3([
            "geometry:evaluated",
          ])
        : uniqueReasonCodesV3([
            "geometry:comparison-incomparable",
            "geometry:missing-data-not-disadvantage",
          ]),
  };
}

function createDominanceRelation(
  possibleDominator: NormalizedCandidate,
  possibleDominated: NormalizedCandidate,
  options: ResolvedOptions
): StayOptiDominanceRelationV3 | null {
  if (!pairComparability(possibleDominator, possibleDominated).comparable) {
    return null;
  }

  const dominatorCost = possibleDominator.totalCost as number;
  const dominatedCost = possibleDominated.totalCost as number;
  const costAdvantage = dominatedCost - dominatorCost;
  const materialCostImprovement = Math.max(
    1,
    dominatedCost * options.costMaterialImprovementRatio
  );

  if (costAdvantage < -options.costNonWorseTolerance) {
    return null;
  }

  const betterDimensions: StayOptiGeometryDimensionV3[] = [];
  const equivalentDimensions: StayOptiGeometryDimensionV3[] = [];
  const normalizedAdvantages = new Map<StayOptiGeometryDimensionV3, number>();

  if (costAdvantage >= materialCostImprovement) {
    betterDimensions.push("totalCost");
  }
  else {
    equivalentDimensions.push("totalCost");
  }

  normalizedAdvantages.set(
    "totalCost",
    dominatedCost > 0
      ? costAdvantage / dominatedCost * 100
      : 0
  );

  for (const dimension of STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3) {
    const dominantValue = possibleDominator.benefits.get(dimension)?.score;
    const dominatedValue = possibleDominated.benefits.get(dimension)?.score;

    if (dominantValue === undefined || dominatedValue === undefined) {
      return null;
    }

    const advantage = dominantValue - dominatedValue;

    if (advantage < -options.benefitNonWorseTolerance) {
      return null;
    }

    if (advantage >= options.benefitMaterialImprovement) {
      betterDimensions.push(dimension);
    }
    else {
      equivalentDimensions.push(dimension);
    }

    normalizedAdvantages.set(dimension, advantage);
  }

  if (betterDimensions.length === 0) {
    return null;
  }

  const kinds: StayOptiDominanceKindV3[] = [
    "pareto-non-worse",
  ];

  if (betterDimensions.length === ALL_DIMENSIONS.length) {
    kinds.push("strict-all");
  }

  const decisiveDimension = [...betterDimensions].sort((first, second) =>
    (normalizedAdvantages.get(second) ?? 0) -
      (normalizedAdvantages.get(first) ?? 0) ||
    first.localeCompare(second)
  )[0];

  return {
    dominantHotelId:
      possibleDominator.hotelId,
    dominatedHotelId:
      possibleDominated.hotelId,
    kinds:
      uniqueSorted(kinds),
    comparedDimensions:
      [...ALL_DIMENSIONS],
    betterDimensions:
      uniqueSorted(betterDimensions),
    equivalentDimensions:
      uniqueSorted(equivalentDimensions),
    decisiveDimension,
    reasonCodes:
      uniqueReasonCodesV3([
        "geometry:evaluated",
      ]),
  };
}

function createDominanceRelations(
  candidates: NormalizedCandidate[],
  options: ResolvedOptions
) {
  const relations: StayOptiDominanceRelationV3[] = [];

  for (const possibleDominator of candidates) {
    for (const possibleDominated of candidates) {
      if (possibleDominator.hotelId === possibleDominated.hotelId) {
        continue;
      }

      const relation = createDominanceRelation(
        possibleDominator,
        possibleDominated,
        options
      );

      if (relation) {
        relations.push(relation);
      }
    }
  }

  return relations.sort((first, second) =>
    first.dominantHotelId.localeCompare(second.dominantHotelId) ||
    first.dominatedHotelId.localeCompare(second.dominatedHotelId)
  );
}

function selectDecisiveUtilityDimension(
  first: NormalizedCandidate,
  second: NormalizedCandidate,
  preferredHotelId: string
): StayOptiGeometryDimensionV3 | null {
  const preferred = preferredHotelId === first.hotelId ? first : second;
  const alternative = preferredHotelId === first.hotelId ? second : first;
  const differences: Array<{
    dimension: StayOptiGeometryDimensionV3;
    value: number;
  }> = [];

  const preferredPrice = preferred.source.utility.contributions.find(
    (contribution) => contribution.dimension === "priceValue"
  );
  const alternativePrice = alternative.source.utility.contributions.find(
    (contribution) => contribution.dimension === "priceValue"
  );

  if (preferredPrice && alternativePrice) {
    differences.push({
      dimension:
        "totalCost",
      value:
        preferredPrice.weightedValue - alternativePrice.weightedValue,
    });
  }

  for (const dimension of STAYOPTI_GEOMETRY_BENEFIT_DIMENSIONS_V3) {
    const preferredValue = preferred.benefits.get(dimension)?.weightedValue;
    const alternativeValue = alternative.benefits.get(dimension)?.weightedValue;

    if (preferredValue !== undefined && alternativeValue !== undefined) {
      differences.push({
        dimension,
        value:
          preferredValue - alternativeValue,
      });
    }
  }

  return differences
    .filter((difference) => difference.value > 0)
    .sort((firstDifference, secondDifference) =>
      secondDifference.value - firstDifference.value ||
      firstDifference.dimension.localeCompare(secondDifference.dimension)
    )[0]?.dimension ?? null;
}

function createPairwiseComparisons(
  candidates: NormalizedCandidate[],
  candidateEvaluations: StayOptiGeometryCandidateEvaluationV3[],
  relations: StayOptiDominanceRelationV3[],
  options: ResolvedOptions
) {
  const evaluationByHotelId = new Map(
    candidateEvaluations.map((evaluation) => [evaluation.hotelId, evaluation] as const)
  );
  const finalists = candidates.filter(
    (candidate) =>
      evaluationByHotelId.get(candidate.hotelId)?.strongParetoStatus === "frontier"
  );
  const comparisons: StayOptiPairwiseComparisonV3[] = [];

  for (let firstIndex = 0; firstIndex < finalists.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < finalists.length;
      secondIndex += 1
    ) {
      const first = finalists[firstIndex];
      const second = finalists[secondIndex];
      const comparability = pairComparability(first, second);
      const comparisonId = createStableHashV3(
        {
          firstHotelId:
            first.hotelId,
          secondHotelId:
            second.hotelId,
        },
        "stayopti-v3-pairwise-comparison"
      );

      if (!comparability.comparable) {
        comparisons.push({
          comparisonId,
          firstHotelId:
            first.hotelId,
          secondHotelId:
            second.hotelId,
          outcome:
            "incomparable",
          preferredHotelId:
            null,
          decisiveDimension:
            null,
          utilityDeltaFirstMinusSecond:
            null,
          dominanceKind:
            null,
          reasonCodes:
            comparability.reasonCodes,
        });
        continue;
      }

      const directRelation = relations.find(
        (relation) =>
          relation.dominantHotelId === first.hotelId &&
          relation.dominatedHotelId === second.hotelId
      ) ?? relations.find(
        (relation) =>
          relation.dominantHotelId === second.hotelId &&
          relation.dominatedHotelId === first.hotelId
      ) ?? null;
      const utilityDelta = round(
        (first.utilityScore as number) - (second.utilityScore as number),
        6
      );
      let preferredHotelId: string | null = null;
      let outcome: StayOptiPairwiseOutcomeV3;
      let dominanceKind: StayOptiDominanceKindV3 | null = null;

      if (directRelation) {
        preferredHotelId = directRelation.dominantHotelId;
        outcome = preferredHotelId === first.hotelId
          ? "first-preferred"
          : "second-preferred";
        dominanceKind = directRelation.kinds.includes("strict-all")
          ? "strict-all"
          : "pareto-non-worse";
      }
      else if (utilityDelta > options.pairwiseUtilityTolerance) {
        preferredHotelId = first.hotelId;
        outcome = "first-preferred";
      }
      else if (utilityDelta < -options.pairwiseUtilityTolerance) {
        preferredHotelId = second.hotelId;
        outcome = "second-preferred";
      }
      else {
        outcome = "utility-equivalent";
      }

      comparisons.push({
        comparisonId,
        firstHotelId:
          first.hotelId,
        secondHotelId:
          second.hotelId,
        outcome,
        preferredHotelId,
        decisiveDimension:
          directRelation?.decisiveDimension ??
          (preferredHotelId === null
            ? null
            : selectDecisiveUtilityDimension(first, second, preferredHotelId)),
        utilityDeltaFirstMinusSecond:
          utilityDelta,
        dominanceKind,
        reasonCodes:
          uniqueReasonCodesV3([
            "geometry:evaluated",
            outcome === "utility-equivalent"
              ? "geometry:pairwise-equivalent"
              : "geometry:pairwise-preferred",
          ]),
      });
    }
  }

  return comparisons;
}

function utilityAtHypotheticalPrice(
  candidate: NormalizedCandidate,
  totalCost: number
) {
  const budget = normalizeFinitePositive(candidate.source.utility.context.totalBudget);
  const priceContribution = candidate.source.utility.contributions.find(
    (contribution) => contribution.dimension === "priceValue"
  );

  if (
    budget === null ||
    !priceContribution ||
    !priceContribution.available ||
    priceContribution.normalizedAvailableWeight <= 0
  ) {
    return null;
  }

  const nonPriceUtility = candidate.source.utility.contributions
    .filter((contribution) => contribution.dimension !== "priceValue")
    .reduce((total, contribution) => total + contribution.weightedValue, 0);
  const priceUtility = createBudgetUtilityV3(totalCost, budget);

  return nonPriceUtility +
    priceUtility * priceContribution.normalizedAvailableWeight;
}

function solveMaximumSensiblePrice(
  candidate: NormalizedCandidate,
  reference: NormalizedCandidate
): StayOptiMaximumSensiblePriceV3 {
  const candidateBudget = normalizeFinitePositive(
    candidate.source.utility.context.totalBudget
  );
  const referenceBudget = normalizeFinitePositive(
    reference.source.utility.context.totalBudget
  );
  const referenceUtility = reference.utilityScore;

  const unavailable: StayOptiMaximumSensiblePriceV3 = {
    status:
      "unavailable",
    amount:
      null,
    currency:
      candidate.currency,
    againstHotelId:
      reference.hotelId,
  };

  if (
    !pairComparability(candidate, reference).comparable ||
    candidateBudget === null ||
    referenceBudget === null ||
    Math.abs(candidateBudget - referenceBudget) > 0.01 ||
    referenceUtility === null ||
    candidate.currency === null ||
    candidate.currency !== reference.currency
  ) {
    return unavailable;
  }

  const lowerPrice = Math.max(0.000001, candidateBudget * 0.000001);
  const upperPrice = candidateBudget * 2;
  const maximumUtility = utilityAtHypotheticalPrice(candidate, lowerPrice);
  const minimumUtility = utilityAtHypotheticalPrice(candidate, upperPrice);

  if (maximumUtility === null || minimumUtility === null) {
    return unavailable;
  }

  if (referenceUtility > maximumUtility + 0.000001) {
    return {
      ...unavailable,
      status:
        "unattainable",
    };
  }

  if (referenceUtility <= minimumUtility + 0.000001) {
    return {
      ...unavailable,
      status:
        "unbounded-by-utility",
    };
  }

  let low = lowerPrice;
  let high = upperPrice;

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    const utility = utilityAtHypotheticalPrice(candidate, middle);

    if (utility === null) {
      return unavailable;
    }

    if (utility >= referenceUtility) {
      low = middle;
    }
    else {
      high = middle;
    }
  }

  return {
    status:
      "available",
    amount:
      round(low, 2),
    currency:
      candidate.currency,
    againstHotelId:
      reference.hotelId,
  };
}

function thresholdVerdict(
  maximumSensiblePrice: StayOptiMaximumSensiblePriceV3,
  actualPrice: number
): StayOptiThresholdVerdictV3 {
  if (maximumSensiblePrice.status === "unavailable") {
    return "unavailable";
  }

  if (maximumSensiblePrice.status === "unattainable") {
    return "not-justified";
  }

  if (maximumSensiblePrice.status === "unbounded-by-utility") {
    return "worthwhile";
  }

  return actualPrice <= (maximumSensiblePrice.amount as number) + 0.01
    ? "worthwhile"
    : "not-justified";
}

function createTradeOffThreshold(
  first: NormalizedCandidate,
  second: NormalizedCandidate
): StayOptiTradeOffThresholdV3 | null {
  if (
    !pairComparability(first, second).comparable ||
    first.totalCost === null ||
    second.totalCost === null ||
    first.currency === null ||
    first.currency !== second.currency ||
    Math.abs(first.totalCost - second.totalCost) <= 0.01
  ) {
    return null;
  }

  const lower = first.totalCost < second.totalCost ? first : second;
  const higher = first.totalCost < second.totalCost ? second : first;
  const actualPremiumAmount = round(
    (higher.totalCost as number) - (lower.totalCost as number),
    2
  );
  const higherMaximum = solveMaximumSensiblePrice(higher, lower);
  const lowerMaximum = solveMaximumSensiblePrice(lower, higher);
  const upgradeThresholdAmount = higherMaximum.status === "available"
    ? round(
        Math.max(0, (higherMaximum.amount as number) - (lower.totalCost as number)),
        2
      )
    : higherMaximum.status === "unattainable"
      ? 0
      : null;
  const savingThresholdAmount = lowerMaximum.status === "available"
    ? round(
        Math.max(0, (higher.totalCost as number) - (lowerMaximum.amount as number)),
        2
      )
    : lowerMaximum.status === "unbounded-by-utility"
      ? 0
      : null;
  const exact =
    higherMaximum.status === "available" ||
    lowerMaximum.status === "available";

  return {
    thresholdId:
      createStableHashV3(
        {
          lowerCostHotelId:
            lower.hotelId,
          higherCostHotelId:
            higher.hotelId,
          lowerCost:
            lower.totalCost,
          higherCost:
            higher.totalCost,
          lowerUtility:
            lower.utilityScore,
          higherUtility:
            higher.utilityScore,
        },
        "stayopti-v3-trade-off-threshold"
      ),
    lowerCostHotelId:
      lower.hotelId,
    higherCostHotelId:
      higher.hotelId,
    currency:
      lower.currency as string,
    actualPremiumAmount,
    higherCostMaximumSensiblePrice:
      higherMaximum,
    upgradeThresholdAmount,
    upgradeVerdict:
      thresholdVerdict(higherMaximum, higher.totalCost as number),
    actualSavingAmount:
      actualPremiumAmount,
    lowerCostMaximumSensiblePrice:
      lowerMaximum,
    savingThresholdAmount,
    savingVerdict:
      thresholdVerdict(lowerMaximum, lower.totalCost as number),
    exact,
    reasonCodes:
      uniqueReasonCodesV3([
        exact
          ? "geometry:threshold-available"
          : "geometry:threshold-unavailable",
      ]),
  };
}

function createTradeOffThresholds(
  candidates: NormalizedCandidate[],
  comparisons: StayOptiPairwiseComparisonV3[]
) {
  const candidateByHotelId = new Map(
    candidates.map((candidate) => [candidate.hotelId, candidate] as const)
  );

  return comparisons
    .filter((comparison) => comparison.outcome !== "incomparable")
    .map((comparison) => {
      const first = candidateByHotelId.get(comparison.firstHotelId);
      const second = candidateByHotelId.get(comparison.secondHotelId);
      return first && second
        ? createTradeOffThreshold(first, second)
        : null;
    })
    .filter(
      (threshold): threshold is StayOptiTradeOffThresholdV3 => threshold !== null
    )
    .sort((first, second) =>
      first.lowerCostHotelId.localeCompare(second.lowerCostHotelId) ||
      first.higherCostHotelId.localeCompare(second.higherCostHotelId)
    );
}

function createCandidateEvaluations(
  candidates: NormalizedCandidate[],
  relations: StayOptiDominanceRelationV3[]
) {
  return candidates.map((candidate): StayOptiGeometryCandidateEvaluationV3 => {
    const comparablePeerHotelIds = candidates
      .filter(
        (other) =>
          other.hotelId !== candidate.hotelId &&
          pairComparability(candidate, other).comparable
      )
      .map((other) => other.hotelId)
      .sort();
    const incoming = relations.filter(
      (relation) => relation.dominatedHotelId === candidate.hotelId
    );
    const outgoing = relations.filter(
      (relation) => relation.dominantHotelId === candidate.hotelId
    );
    const strictIncoming = incoming.filter(
      (relation) => relation.kinds.includes("strict-all")
    );
    const geometryKnown =
      candidate.status === "comparable" && comparablePeerHotelIds.length > 0;
    const strongParetoStatus: StayOptiParetoStatusV3 = !geometryKnown
      ? "unknown"
      : incoming.length > 0
        ? "dominated"
        : "frontier";
    const weakParetoStatus: StayOptiParetoStatusV3 = !geometryKnown
      ? "unknown"
      : strictIncoming.length > 0
        ? "dominated"
        : "frontier";
    const primaryEliminationVariable = incoming
      .slice()
      .sort((first, second) =>
        first.decisiveDimension.localeCompare(second.decisiveDimension) ||
        first.dominantHotelId.localeCompare(second.dominantHotelId)
      )[0]?.decisiveDimension ?? null;
    const reasonCodes: SmartStayReasonCodeV3[] = [
      "geometry:missing-data-not-disadvantage",
    ];

    if (!geometryKnown) {
      reasonCodes.push("geometry:comparison-incomparable");
    }
    else {
      reasonCodes.push(
        strongParetoStatus === "frontier"
          ? "geometry:strong-pareto-frontier"
          : "geometry:strong-pareto-dominated",
        weakParetoStatus === "frontier"
          ? "geometry:weak-pareto-frontier"
          : "geometry:weak-pareto-dominated"
      );
    }

    return {
      hotelId:
        candidate.hotelId,
      solutionId:
        candidate.solutionId,
      status:
        candidate.status,
      totalCost:
        candidate.totalCost,
      currency:
        candidate.currency,
      utilityScore:
        candidate.utilityScore,
      strongParetoStatus,
      weakParetoStatus,
      availableDimensions:
        candidate.availableDimensions,
      missingDimensions:
        candidate.missingDimensions,
      comparablePeerHotelIds,
      dominatedByHotelIds:
        uniqueSorted(incoming.map((relation) => relation.dominantHotelId)),
      strictlyDominatedByHotelIds:
        uniqueSorted(strictIncoming.map((relation) => relation.dominantHotelId)),
      dominatesHotelIds:
        uniqueSorted(outgoing.map((relation) => relation.dominatedHotelId)),
      primaryEliminationVariable,
      reasonCodes:
        uniqueReasonCodesV3(reasonCodes),
    };
  });
}

function createMarginalValueSegments(
  candidates: NormalizedCandidate[],
  candidateEvaluations: StayOptiGeometryCandidateEvaluationV3[]
) {
  const evaluationByHotelId = new Map(
    candidateEvaluations.map((evaluation) => [evaluation.hotelId, evaluation] as const)
  );
  const groupIds = uniqueSorted(
    candidates
      .filter(
        (candidate) =>
          candidate.peerAssignment.directComparisonAllowed &&
          candidate.peerAssignment.groupId !== null &&
          evaluationByHotelId.get(candidate.hotelId)?.strongParetoStatus === "frontier"
      )
      .map((candidate) => candidate.peerAssignment.groupId as string)
  );
  const segments: StayOptiMarginalValueSegmentV3[] = [];

  for (const peerGroupId of groupIds) {
    const points = candidates
      .filter(
        (candidate) =>
          candidate.peerAssignment.groupId === peerGroupId &&
          evaluationByHotelId.get(candidate.hotelId)?.strongParetoStatus === "frontier" &&
          candidate.totalCost !== null &&
          candidate.utilityScore !== null
      )
      .sort((first, second) =>
        (first.totalCost as number) - (second.totalCost as number) ||
        first.hotelId.localeCompare(second.hotelId)
      );
    let previousSlope: number | null = null;

    for (let index = 1; index < points.length; index += 1) {
      const lower = points[index - 1];
      const higher = points[index];
      const incrementalCost = (higher.totalCost as number) - (lower.totalCost as number);

      if (
        incrementalCost <= 0.01 ||
        !pairComparability(lower, higher).comparable
      ) {
        continue;
      }

      const incrementalUtility =
        (higher.utilityScore as number) - (lower.utilityScore as number);
      const slope = incrementalUtility / incrementalCost;
      let trend: StayOptiMarginalTrendV3;

      if (slope < 0) {
        trend = "negative-return";
      }
      else if (previousSlope === null) {
        trend = "baseline";
      }
      else if (slope < previousSlope - 0.00000001) {
        trend = "diminishing-return";
      }
      else if (slope > previousSlope + 0.00000001) {
        trend = "increasing-return";
      }
      else {
        trend = "stable-return";
      }

      const segmentWithoutId = {
        peerGroupId,
        lowerCostHotelId:
          lower.hotelId,
        higherCostHotelId:
          higher.hotelId,
        incrementalCost:
          round(incrementalCost, 2),
        incrementalUtility:
          round(incrementalUtility, 6),
        marginalUtilityPerCurrencyUnit:
          round(slope, 8),
        marginalUtilityPer100Currency:
          round(slope * 100, 6),
        trend,
      };

      segments.push({
        segmentId:
          createStableHashV3(
            segmentWithoutId,
            "stayopti-v3-marginal-value-segment"
          ),
        ...segmentWithoutId,
        reasonCodes:
          uniqueReasonCodesV3([
            "geometry:marginal-value-evaluated",
            ...(trend === "diminishing-return" || trend === "negative-return"
              ? ["geometry:diminishing-returns" as const]
              : []),
          ]),
      });

      previousSlope = slope;
    }
  }

  return segments.sort((first, second) =>
    first.peerGroupId.localeCompare(second.peerGroupId) ||
    first.incrementalCost - second.incrementalCost ||
    first.lowerCostHotelId.localeCompare(second.lowerCostHotelId) ||
    first.higherCostHotelId.localeCompare(second.higherCostHotelId)
  );
}

function createDecisionMap(
  candidates: StayOptiGeometryCandidateEvaluationV3[],
  marginalSegments: StayOptiMarginalValueSegmentV3[]
) {
  const incomingByHotelId = new Map<string, StayOptiMarginalValueSegmentV3[]>();

  for (const segment of marginalSegments) {
    const incoming = incomingByHotelId.get(segment.higherCostHotelId) ?? [];
    incoming.push(segment);
    incomingByHotelId.set(segment.higherCostHotelId, incoming);
  }

  return {
    internalOnly:
      true as const,
    points:
      candidates.map((candidate): StayOptiDecisionMapPointV3 => {
        const incoming = incomingByHotelId.get(candidate.hotelId) ?? [];
        let zone: StayOptiDecisionMapZoneV3;

        if (candidate.strongParetoStatus === "unknown") {
          zone = "insufficient-evidence";
        }
        else if (candidate.strongParetoStatus === "dominated") {
          zone = "dominated";
        }
        else if (incoming.some((segment) => segment.trend === "negative-return")) {
          zone = "unsupported-premium";
        }
        else if (incoming.some((segment) => segment.trend === "diminishing-return")) {
          zone = "diminishing-returns";
        }
        else if (incoming.length === 0) {
          zone = "saving-edge";
        }
        else {
          zone = "efficient-frontier";
        }

        return {
          hotelId:
            candidate.hotelId,
          totalCost:
            candidate.totalCost,
          utilityScore:
            candidate.utilityScore,
          zone,
          incomingMarginalSegmentIds:
            incoming.map((segment) => segment.segmentId).sort(),
          reasonCodes:
            uniqueReasonCodesV3([
              "geometry:decision-map-internal",
              ...(zone === "diminishing-returns" || zone === "unsupported-premium"
                ? ["geometry:diminishing-returns" as const]
                : []),
              ...(zone === "insufficient-evidence"
                ? ["geometry:missing-data-not-disadvantage" as const]
                : []),
            ]),
        };
      }),
  };
}

function createFingerprint(
  evaluation: Omit<StayOptiDecisionGeometryV3, "fingerprint">
) {
  return createStableHashV3(evaluation, "stayopti-v3-decision-geometry");
}

export function evaluateDecisionGeometryV3(
  inputCandidates: EvaluateStayOptiDecisionGeometryCandidateV3[],
  options: StayOptiDecisionGeometryOptionsV3 = {}
): StayOptiDecisionGeometryV3 {
  const resolvedOptions = resolveOptions(options);
  const candidates = inputCandidates
    .map(normalizeCandidate)
    .sort((first, second) => first.hotelId.localeCompare(second.hotelId));
  const hotelIds = candidates.map((candidate) => candidate.hotelId);

  if (new Set(hotelIds).size !== hotelIds.length) {
    throw new Error("Decision Geometry requires unique hotel IDs.");
  }

  const relations = createDominanceRelations(candidates, resolvedOptions);
  const candidateEvaluations = createCandidateEvaluations(candidates, relations);
  const pairwiseComparisons = createPairwiseComparisons(
    candidates,
    candidateEvaluations,
    relations,
    resolvedOptions
  );
  const thresholds = createTradeOffThresholds(candidates, pairwiseComparisons);
  const marginalSegments = createMarginalValueSegments(
    candidates,
    candidateEvaluations
  );
  const knownCandidateCount = candidateEvaluations.filter(
    (candidate) => candidate.strongParetoStatus !== "unknown"
  ).length;
  const status: StayOptiDecisionGeometryV3["status"] =
    candidates.length === 0 || knownCandidateCount === 0
      ? "unavailable"
      : knownCandidateCount === candidates.length
        ? "usable"
        : "partial";
  const exactThresholdCount = thresholds.filter((threshold) => threshold.exact).length;
  const reasonCodes: SmartStayReasonCodeV3[] = [
    "geometry:shadow-only",
    "geometry:commercially-neutral",
    "geometry:decision-map-internal",
    "geometry:missing-data-not-disadvantage",
    status === "usable"
      ? "geometry:evaluated"
      : status === "partial"
        ? "geometry:partial"
        : "geometry:unavailable",
    exactThresholdCount > 0
      ? "geometry:threshold-available"
      : "geometry:threshold-unavailable",
  ];

  if (marginalSegments.length > 0) {
    reasonCodes.push("geometry:marginal-value-evaluated");
  }

  if (
    marginalSegments.some(
      (segment) =>
        segment.trend === "diminishing-return" ||
        segment.trend === "negative-return"
    )
  ) {
    reasonCodes.push("geometry:diminishing-returns");
  }

  const evaluationWithoutFingerprint: Omit<
    StayOptiDecisionGeometryV3,
    "fingerprint"
  > = {
    evaluationId:
      createStableHashV3(
        {
          hotelIds,
          utilityFingerprints:
            candidates.map((candidate) => candidate.source.utility.fingerprint),
          peerFingerprints:
            candidates.map((candidate) => candidate.peerAssignment.fingerprint),
          resolvedOptions,
        },
        "stayopti-v3-decision-geometry-id"
      ),
    phase:
      "v3-04",
    rankingApplication:
      "shadow-only",
    status,
    dimensions:
      [...ALL_DIMENSIONS],
    candidates:
      candidateEvaluations,
    strongParetoFrontierHotelIds:
      candidateEvaluations
        .filter((candidate) => candidate.strongParetoStatus === "frontier")
        .map((candidate) => candidate.hotelId),
    weakParetoFrontierHotelIds:
      candidateEvaluations
        .filter((candidate) => candidate.weakParetoStatus === "frontier")
        .map((candidate) => candidate.hotelId),
    dominanceRelations:
      relations,
    pairwiseFinalistComparisons:
      pairwiseComparisons,
    marginalValueSegments:
      marginalSegments,
    tradeOffThresholds:
      thresholds,
    decisionMap:
      createDecisionMap(candidateEvaluations, marginalSegments),
    exactThresholdCount,
    reasonCodes:
      uniqueReasonCodesV3(reasonCodes),
  };

  return {
    ...evaluationWithoutFingerprint,
    fingerprint:
      createFingerprint(evaluationWithoutFingerprint),
  };
}

export function validateDecisionGeometryV3(
  evaluation: StayOptiDecisionGeometryV3
) {
  const {
    fingerprint: ignoredFingerprint,
    ...withoutFingerprint
  } = evaluation;
  void ignoredFingerprint;

  const candidateIds = evaluation.candidates.map((candidate) => candidate.hotelId);
  const candidateIdSet = new Set(candidateIds);
  const relationIdsValid = evaluation.dominanceRelations.every(
    (relation) =>
      relation.dominantHotelId !== relation.dominatedHotelId &&
      candidateIdSet.has(relation.dominantHotelId) &&
      candidateIdSet.has(relation.dominatedHotelId) &&
      relation.kinds.includes("pareto-non-worse") &&
      relation.betterDimensions.length > 0 &&
      relation.comparedDimensions.length === ALL_DIMENSIONS.length &&
      (!relation.kinds.includes("strict-all") ||
        relation.betterDimensions.length === ALL_DIMENSIONS.length)
  );
  const comparisonIds = new Set<string>();
  const comparisonsValid = evaluation.pairwiseFinalistComparisons.every(
    (comparison) => {
      const unique = !comparisonIds.has(comparison.comparisonId);
      comparisonIds.add(comparison.comparisonId);
      return unique &&
        comparison.firstHotelId !== comparison.secondHotelId &&
        candidateIdSet.has(comparison.firstHotelId) &&
        candidateIdSet.has(comparison.secondHotelId) &&
        (comparison.preferredHotelId === null ||
          comparison.preferredHotelId === comparison.firstHotelId ||
          comparison.preferredHotelId === comparison.secondHotelId) &&
        (comparison.outcome === "incomparable"
          ? comparison.utilityDeltaFirstMinusSecond === null &&
            comparison.preferredHotelId === null
          : comparison.utilityDeltaFirstMinusSecond !== null);
    }
  );
  const segmentIds = new Set<string>();
  const marginalSegmentsValid = evaluation.marginalValueSegments.every(
    (segment) => {
      const unique = !segmentIds.has(segment.segmentId);
      segmentIds.add(segment.segmentId);
      return unique &&
        segment.lowerCostHotelId !== segment.higherCostHotelId &&
        candidateIdSet.has(segment.lowerCostHotelId) &&
        candidateIdSet.has(segment.higherCostHotelId) &&
        Number.isFinite(segment.incrementalCost) &&
        segment.incrementalCost > 0 &&
        Number.isFinite(segment.incrementalUtility) &&
        Number.isFinite(segment.marginalUtilityPerCurrencyUnit) &&
        Number.isFinite(segment.marginalUtilityPer100Currency);
    }
  );
  const thresholdIds = new Set<string>();
  const thresholdsValid = evaluation.tradeOffThresholds.every((threshold) => {
    const unique = !thresholdIds.has(threshold.thresholdId);
    thresholdIds.add(threshold.thresholdId);
    return unique &&
      threshold.lowerCostHotelId !== threshold.higherCostHotelId &&
      candidateIdSet.has(threshold.lowerCostHotelId) &&
      candidateIdSet.has(threshold.higherCostHotelId) &&
      threshold.actualPremiumAmount > 0 &&
      threshold.actualSavingAmount === threshold.actualPremiumAmount &&
      (!threshold.exact ||
        threshold.higherCostMaximumSensiblePrice.status === "available" ||
        threshold.lowerCostMaximumSensiblePrice.status === "available");
  });
  const mapCandidateIds = evaluation.decisionMap.points
    .map((point) => point.hotelId)
    .sort();
  const exactThresholdCount = evaluation.tradeOffThresholds.filter(
    (threshold) => threshold.exact
  ).length;
  const valid =
    evaluation.fingerprint === createFingerprint(withoutFingerprint) &&
    evaluation.phase === "v3-04" &&
    evaluation.rankingApplication === "shadow-only" &&
    evaluation.decisionMap.internalOnly === true &&
    new Set(candidateIds).size === candidateIds.length &&
    evaluation.exactThresholdCount === exactThresholdCount &&
    JSON.stringify([...candidateIds].sort()) === JSON.stringify(mapCandidateIds) &&
    relationIdsValid &&
    comparisonsValid &&
    marginalSegmentsValid &&
    thresholdsValid;

  return {
    valid,
  };
}

export function assertDecisionGeometryV3(
  evaluation: StayOptiDecisionGeometryV3
) {
  if (!validateDecisionGeometryV3(evaluation).valid) {
    throw new Error("Invalid StayOpti Decision Geometry V3 evaluation.");
  }

  return evaluation;
}
