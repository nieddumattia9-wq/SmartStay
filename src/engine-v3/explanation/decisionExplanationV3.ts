import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import type {
  StayOptiDecisionGeometryV3,
  StayOptiGeometryBenefitDimensionV3,
  StayOptiGeometryDimensionV3,
} from "../geometry/decisionGeometryV3";

import type {
  StayOptiDecisionRobustnessV3,
  StayOptiRobustnessCandidateEvaluationV3,
} from "../robustness/decisionRobustnessV3";

import type {
  StayOptiContextualCandidateEvaluationV3,
  StayOptiContextualStayValueEvaluationV3,
} from "../contextual/contextualStayValueV3";

import type {
  StayOptiPersonalUtilityEvaluationV3,
  StayOptiUtilityDimensionV3,
} from "../utility/personalUtilityV3";

export const STAYOPTI_EXPLANATION_SLOT_IDS_V3 = [
  "recommendation",
  "primary-reason",
  "main-trade-off",
  "best-alternative",
  "switch-condition",
  "uncertainty",
] as const;

export type StayOptiExplanationSlotIdV3 =
  typeof STAYOPTI_EXPLANATION_SLOT_IDS_V3[number];

export type StayOptiExplanationStatusV3 =
  | "recommended"
  | "abstained"
  | "unavailable";

export type StayOptiExplanationClaimStatusV3 =
  | "available"
  | "unavailable";

export type StayOptiExplanationClaimCodeV3 =
  | "recommendation:best-current-fit"
  | "recommendation:only-evidenced-option"
  | "recommendation:no-clear-winner"
  | "recommendation:no-good-option"
  | "recommendation:insufficient-evidence"
  | "recommendation:no-feasible-option"
  | "primary:lower-total-cost"
  | "primary:shorter-travel-time"
  | "primary:stronger-quality"
  | "primary:stronger-location"
  | "primary:stronger-comfort"
  | "primary:stronger-flexibility"
  | "primary:stronger-category-fit"
  | "primary:stronger-user-fit"
  | "primary:best-evidenced-fit"
  | "primary:near-tie"
  | "primary:insufficient-evidence"
  | "primary:no-good-option"
  | "primary:unstable-choice"
  | "primary:no-feasible-option"
  | "trade-off:higher-total-cost"
  | "trade-off:longer-travel-time"
  | "trade-off:weaker-quality"
  | "trade-off:weaker-location"
  | "trade-off:weaker-comfort"
  | "trade-off:weaker-flexibility"
  | "trade-off:weaker-category-fit"
  | "trade-off:weaker-user-fit"
  | "trade-off:higher-choice-risk"
  | "alternative:lower-total-cost"
  | "alternative:shorter-travel-time"
  | "alternative:stronger-quality"
  | "alternative:stronger-location"
  | "alternative:stronger-comfort"
  | "alternative:stronger-flexibility"
  | "alternative:stronger-category-fit"
  | "alternative:stronger-user-fit"
  | "alternative:closest-evidenced-option"
  | "switch:alternative-price-at-or-below"
  | "switch:recommended-price-above"
  | "switch:verified-budget-relaxation"
  | "switch:verified-distance-relaxation"
  | "switch:verified-date-relaxation"
  | "switch:verified-category-relaxation"
  | "uncertainty:near-tie"
  | "uncertainty:insufficient-evidence"
  | "uncertainty:no-good-option"
  | "uncertainty:unstable-choice"
  | "uncertainty:recheck-required"
  | "uncertainty:material-evidence-gap"
  | "uncertainty:stable-under-tested-scenarios"
  | "unavailable";

export type StayOptiExplanationNumericFactCodeV3 =
  | "total-cost-difference"
  | "travel-time-difference"
  | "switch-price-threshold"
  | "constraint-relaxation-amount";

export type StayOptiExplanationNumericUnitV3 =
  | "currency"
  | "minutes"
  | "kilometres"
  | "days"
  | "category-step";

export interface StayOptiExplanationNumericFactV3 {
  code: StayOptiExplanationNumericFactCodeV3;
  value: number;
  unit: StayOptiExplanationNumericUnitV3;
  currency: string | null;
  publicDisplay: true;
}

export interface StayOptiExplanationClaimV3 {
  claimId: string;
  slot: StayOptiExplanationSlotIdV3;
  status: StayOptiExplanationClaimStatusV3;
  claimCode: StayOptiExplanationClaimCodeV3;
  messageKey: string;
  subjectHotelId: string | null;
  comparisonHotelId: string | null;
  evidenceIds: string[];
  derivationIds: string[];
  numericFacts: StayOptiExplanationNumericFactV3[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiExplanationCopyEvidenceLinkV3 {
  claimId: string;
  evidenceIds: string[];
  derivationIds: string[];
}

export type StayOptiExplanationStrengthLabelV3 =
  | "robust-across-tested-scenarios"
  | "sensitive-to-tested-assumptions"
  | "near-tie"
  | "abstained"
  | "unavailable";

export interface EvaluateStayOptiDecisionExplanationInputV3 {
  solutionMappings: Array<{
    hotelId: string;
    solutionId: string | null;
  }>;
  preferredAlternativeHotelId: string | null;
  utilityEvaluations: StayOptiPersonalUtilityEvaluationV3[];
  decisionGeometry: StayOptiDecisionGeometryV3;
  decisionRobustness: StayOptiDecisionRobustnessV3;
  contextualStayValue: StayOptiContextualStayValueEvaluationV3;
  legacyPrimaryEvidenceIds?: string[];
  legacyTradeOffEvidenceIds?: string[];
  sourceReasonCodes?: string[];
}

export interface StayOptiDecisionExplanationV3 {
  evaluationId: string;
  phase: "v3-07";
  rankingApplication: "shadow-only";
  publicPresentation: "disabled";
  publicGate: {
    status: "pending-blind-comprehension";
    copyEnabled: false;
    requiresBlindComprehensionTest: true;
    requiresCalibratedConfidence: true;
    requiresEvidenceCopyAlignment: true;
  };
  status: StayOptiExplanationStatusV3;
  titleKey: string;
  recommendedHotelId: string | null;
  recommendedSolutionId: string | null;
  bestAlternativeHotelId: string | null;
  bestAlternativeSolutionId: string | null;
  strengthLabel: StayOptiExplanationStrengthLabelV3;
  publicNumericConfidence: null;
  recommendation: StayOptiExplanationClaimV3;
  primaryReason: StayOptiExplanationClaimV3;
  mainTradeOff: StayOptiExplanationClaimV3;
  bestAlternative: StayOptiExplanationClaimV3;
  switchCondition: StayOptiExplanationClaimV3;
  uncertainty: StayOptiExplanationClaimV3;
  copyEvidenceLinks: StayOptiExplanationCopyEvidenceLinkV3[];
  primaryEvidenceIds: string[];
  tradeOffEvidenceIds: string[];
  sourceReasonCodes: string[];
  exactSwitchThresholdAvailable: boolean;
  compression: {
    format: "six-statement-ten-second-thesis";
    maximumStatementCount: 6;
    availableStatementCount: number;
  };
  numericPolicy: {
    publicPercentageCount: 0;
    uncalibratedPercentagesAllowed: false;
  };
  sourceEvaluationIds: {
    decisionGeometryEvaluationId: string;
    decisionRobustnessEvaluationId: string;
    contextualStayValueEvaluationId: string;
  };
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiDecisionExplanationValidationV3 {
  valid: boolean;
  issues: string[];
}

type UtilityByHotelId = Map<string, StayOptiPersonalUtilityEvaluationV3>;

type CandidateComparison = {
  dimension: StayOptiGeometryDimensionV3;
  advantage: number;
  evidenceIds: string[];
};

const BENEFIT_DIMENSIONS: readonly StayOptiGeometryBenefitDimensionV3[] = [
  "quality",
  "location",
  "comfort",
  "flexibility",
  "categoryFit",
  "userFit",
];

const DIMENSION_PRIMARY_CODES: Readonly<
  Record<StayOptiGeometryBenefitDimensionV3, StayOptiExplanationClaimCodeV3>
> = {
  quality: "primary:stronger-quality",
  location: "primary:stronger-location",
  comfort: "primary:stronger-comfort",
  flexibility: "primary:stronger-flexibility",
  categoryFit: "primary:stronger-category-fit",
  userFit: "primary:stronger-user-fit",
};

const DIMENSION_TRADE_OFF_CODES: Readonly<
  Record<StayOptiGeometryBenefitDimensionV3, StayOptiExplanationClaimCodeV3>
> = {
  quality: "trade-off:weaker-quality",
  location: "trade-off:weaker-location",
  comfort: "trade-off:weaker-comfort",
  flexibility: "trade-off:weaker-flexibility",
  categoryFit: "trade-off:weaker-category-fit",
  userFit: "trade-off:weaker-user-fit",
};

const DIMENSION_ALTERNATIVE_CODES: Readonly<
  Record<StayOptiGeometryBenefitDimensionV3, StayOptiExplanationClaimCodeV3>
> = {
  quality: "alternative:stronger-quality",
  location: "alternative:stronger-location",
  comfort: "alternative:stronger-comfort",
  flexibility: "alternative:stronger-flexibility",
  categoryFit: "alternative:stronger-category-fit",
  userFit: "alternative:stronger-user-fit",
};

function uniqueSorted(values: readonly string[]) {
  return [
    ...new Set(
      values.filter(
        (value) => value.length > 0
      )
    ),
  ].sort();
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function findSolutionId(
  mappings: EvaluateStayOptiDecisionExplanationInputV3["solutionMappings"],
  hotelId: string | null
) {
  if (hotelId === null) {
    return null;
  }

  return mappings.find(
    (mapping) => mapping.hotelId === hotelId
  )?.solutionId ?? null;
}

function candidateEvidenceIds(
  hotelId: string,
  utilityByHotelId: UtilityByHotelId,
  robustnessByHotelId: Map<string, StayOptiRobustnessCandidateEvaluationV3>,
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  const utility = utilityByHotelId.get(hotelId);
  const robustness = robustnessByHotelId.get(hotelId);
  const contextual = contextualByHotelId.get(hotelId);

  return uniqueSorted([
    ...(utility?.contributions.flatMap(
      (contribution) => contribution.evidenceIds
    ) ?? []),
    ...(robustness?.riskSignals.flatMap(
      (signal) => signal.evidenceIds
    ) ?? []),
    ...(contextual?.location.evidenceIds ?? []),
    ...(contextual?.roomUpgrade.evidenceIds ?? []),
    ...(contextual?.flexibility.evidenceIds ?? []),
    ...(contextual?.contextInteractions.evidenceIds ?? []),
    ...(contextual?.convenience.evidenceIds ?? []),
  ]);
}

function dimensionEvidenceIds(
  hotelIds: readonly string[],
  dimension: StayOptiUtilityDimensionV3,
  utilityByHotelId: UtilityByHotelId
) {
  return uniqueSorted(
    hotelIds.flatMap((hotelId) => {
      const utility = utilityByHotelId.get(hotelId);
      const contribution = utility?.contributions.find(
        (entry) => entry.dimension === dimension
      );

      return [
        ...(utility?.dimensions[dimension].evidenceIds ?? []),
        ...(contribution?.evidenceIds ?? []),
      ];
    })
  );
}

function contextualLocationEvidenceIds(
  hotelIds: readonly string[],
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  return uniqueSorted(
    hotelIds.flatMap(
      (hotelId) => contextualByHotelId.get(hotelId)?.location.evidenceIds ?? []
    )
  );
}

function createUnavailableClaim(slot: StayOptiExplanationSlotIdV3): StayOptiExplanationClaimV3 {
  return {
    claimId: createStableHashV3(
      { slot, status: "unavailable" },
      "stayopti-v3-explanation-claim"
    ),
    slot,
    status: "unavailable",
    claimCode: "unavailable",
    messageKey: "stayopti.v3.explanation.unavailable",
    subjectHotelId: null,
    comparisonHotelId: null,
    evidenceIds: [],
    derivationIds: [],
    numericFacts: [],
    reasonCodes: [
      slot === "main-trade-off"
        ? "explanation:trade-off-unavailable"
        : slot === "best-alternative"
          ? "explanation:alternative-unavailable"
          : slot === "switch-condition"
            ? "explanation:switch-condition-unavailable"
            : slot === "uncertainty"
              ? "explanation:uncertainty-unavailable"
              : slot === "primary-reason"
                ? "explanation:primary-reason-unavailable"
                : "explanation:recommendation-unavailable",
    ],
  };
}

function createClaim(input: {
  slot: StayOptiExplanationSlotIdV3;
  claimCode: StayOptiExplanationClaimCodeV3;
  subjectHotelId: string | null;
  comparisonHotelId: string | null;
  evidenceIds: string[];
  derivationIds: string[];
  numericFacts?: StayOptiExplanationNumericFactV3[];
  reasonCode: SmartStayReasonCodeV3;
}) {
  const evidenceIds = uniqueSorted(input.evidenceIds);
  const derivationIds = uniqueSorted(input.derivationIds);

  if (evidenceIds.length === 0 || derivationIds.length === 0) {
    return createUnavailableClaim(input.slot);
  }

  const claimIdentity = {
    slot: input.slot,
    claimCode: input.claimCode,
    subjectHotelId: input.subjectHotelId,
    comparisonHotelId: input.comparisonHotelId,
    evidenceIds,
    derivationIds,
    numericFacts: input.numericFacts ?? [],
  };

  return {
    claimId: createStableHashV3(
      claimIdentity,
      "stayopti-v3-explanation-claim"
    ),
    slot: input.slot,
    status: "available" as const,
    claimCode: input.claimCode,
    messageKey: `stayopti.v3.explanation.${input.claimCode.replaceAll(":", ".")}`,
    subjectHotelId: input.subjectHotelId,
    comparisonHotelId: input.comparisonHotelId,
    evidenceIds,
    derivationIds,
    numericFacts: input.numericFacts ?? [],
    reasonCodes: [input.reasonCode],
  };
}

function findPairwiseComparison(
  geometry: StayOptiDecisionGeometryV3,
  firstHotelId: string,
  secondHotelId: string
) {
  return geometry.pairwiseFinalistComparisons.find(
    (comparison) =>
      (
        comparison.firstHotelId === firstHotelId &&
        comparison.secondHotelId === secondHotelId
      ) ||
      (
        comparison.firstHotelId === secondHotelId &&
        comparison.secondHotelId === firstHotelId
      )
  ) ?? null;
}

function findTradeOffThreshold(
  geometry: StayOptiDecisionGeometryV3,
  firstHotelId: string,
  secondHotelId: string
) {
  return geometry.tradeOffThresholds.find(
    (threshold) =>
      (
        threshold.lowerCostHotelId === firstHotelId &&
        threshold.higherCostHotelId === secondHotelId
      ) ||
      (
        threshold.lowerCostHotelId === secondHotelId &&
        threshold.higherCostHotelId === firstHotelId
      )
  ) ?? null;
}

function geometryCost(
  geometry: StayOptiDecisionGeometryV3,
  hotelId: string
) {
  const candidate = geometry.candidates.find(
    (entry) => entry.hotelId === hotelId
  );

  return {
    amount: candidate?.totalCost ?? null,
    currency: candidate?.currency ?? null,
  };
}

function compareBenefitDimensions(
  subjectHotelId: string,
  comparisonHotelId: string,
  utilityByHotelId: UtilityByHotelId
) {
  const subject = utilityByHotelId.get(subjectHotelId);
  const comparison = utilityByHotelId.get(comparisonHotelId);

  if (subject === undefined || comparison === undefined) {
    return [];
  }

  return BENEFIT_DIMENSIONS.flatMap((dimension): CandidateComparison[] => {
    const subjectScore = subject.dimensions[dimension].score;
    const comparisonScore = comparison.dimensions[dimension].score;
    const evidenceIds = dimensionEvidenceIds(
      [subjectHotelId, comparisonHotelId],
      dimension,
      utilityByHotelId
    );

    if (
      subjectScore === null ||
      comparisonScore === null ||
      evidenceIds.length === 0
    ) {
      return [];
    }

    const configuredWeight = subject.contributions.find(
      (entry) => entry.dimension === dimension
    )?.configuredWeight ?? 0;

    return [{
      dimension,
      advantage: round((subjectScore - comparisonScore) * Math.max(configuredWeight, 0.01), 6),
      evidenceIds,
    }];
  });
}

function selectAlternativeHotelId(
  input: EvaluateStayOptiDecisionExplanationInputV3,
  recommendedHotelId: string | null
) {
  const usable = input.decisionRobustness.candidates
    .filter(
      (candidate) =>
        candidate.hotelId !== recommendedHotelId &&
        candidate.status === "usable" &&
        candidate.riskAdjustedUtility !== null &&
        findSolutionId(
          input.solutionMappings,
          candidate.hotelId
        ) !== null
    )
    .sort(
      (first, second) =>
        (second.riskAdjustedUtility ?? Number.NEGATIVE_INFINITY) -
          (first.riskAdjustedUtility ?? Number.NEGATIVE_INFINITY) ||
        first.choiceRiskScore - second.choiceRiskScore ||
        first.hotelId.localeCompare(second.hotelId)
    );

  if (
    input.preferredAlternativeHotelId !== null &&
    usable.some(
      (candidate) => candidate.hotelId === input.preferredAlternativeHotelId
    )
  ) {
    return input.preferredAlternativeHotelId;
  }

  return usable[0]?.hotelId ?? null;
}

function recommendationClaim(
  status: StayOptiExplanationStatusV3,
  recommendedHotelId: string | null,
  alternativeHotelId: string | null,
  input: EvaluateStayOptiDecisionExplanationInputV3,
  utilityByHotelId: UtilityByHotelId,
  robustnessByHotelId: Map<string, StayOptiRobustnessCandidateEvaluationV3>,
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  const robustness = input.decisionRobustness;
  const evidenceHotelIds = status === "recommended" && recommendedHotelId !== null
    ? [recommendedHotelId, ...(alternativeHotelId === null ? [] : [alternativeHotelId])]
    : robustness.nearTie.hotelIds.length > 0
      ? robustness.nearTie.hotelIds
      : robustness.candidates.map((candidate) => candidate.hotelId);
  const evidenceIds = uniqueSorted([
    ...evidenceHotelIds.flatMap(
      (hotelId) => candidateEvidenceIds(
        hotelId,
        utilityByHotelId,
        robustnessByHotelId,
        contextualByHotelId
      )
    ),
    ...(input.legacyPrimaryEvidenceIds ?? []),
  ]);

  let claimCode: StayOptiExplanationClaimCodeV3;

  if (status === "recommended") {
    claimCode = alternativeHotelId === null
      ? "recommendation:only-evidenced-option"
      : "recommendation:best-current-fit";
  }
  else if (robustness.abstentionCode === "no-good-option") {
    claimCode = "recommendation:no-good-option";
  }
  else if (robustness.abstentionCode === "insufficient-evidence") {
    claimCode = "recommendation:insufficient-evidence";
  }
  else if (robustness.abstentionCode === "no-feasible-solution") {
    claimCode = "recommendation:no-feasible-option";
  }
  else {
    claimCode = "recommendation:no-clear-winner";
  }

  return createClaim({
    slot: "recommendation",
    claimCode,
    subjectHotelId: recommendedHotelId,
    comparisonHotelId: alternativeHotelId,
    evidenceIds,
    derivationIds: [robustness.evaluationId],
    reasonCode: status === "recommended"
      ? "explanation:recommendation-available"
      : "explanation:abstention-explained",
  });
}

function primaryReasonClaim(
  status: StayOptiExplanationStatusV3,
  recommendedHotelId: string | null,
  alternativeHotelId: string | null,
  input: EvaluateStayOptiDecisionExplanationInputV3,
  utilityByHotelId: UtilityByHotelId,
  robustnessByHotelId: Map<string, StayOptiRobustnessCandidateEvaluationV3>,
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  if (status !== "recommended" || recommendedHotelId === null) {
    const abstentionCode = input.decisionRobustness.abstentionCode;
    const claimCode: StayOptiExplanationClaimCodeV3 =
      abstentionCode === "insufficient-evidence"
        ? "primary:insufficient-evidence"
        : abstentionCode === "no-good-option"
          ? "primary:no-good-option"
          : abstentionCode === "unstable-choice"
            ? "primary:unstable-choice"
            : abstentionCode === "no-feasible-solution"
              ? "primary:no-feasible-option"
              : "primary:near-tie";
    const evidenceHotelIds = input.decisionRobustness.nearTie.hotelIds.length > 0
      ? input.decisionRobustness.nearTie.hotelIds
      : input.decisionRobustness.candidates.map((candidate) => candidate.hotelId);
    const evidenceIds = evidenceHotelIds.flatMap(
      (hotelId) => candidateEvidenceIds(
        hotelId,
        utilityByHotelId,
        robustnessByHotelId,
        contextualByHotelId
      )
    );

    return createClaim({
      slot: "primary-reason",
      claimCode,
      subjectHotelId: null,
      comparisonHotelId: null,
      evidenceIds,
      derivationIds: [input.decisionRobustness.evaluationId],
      reasonCode: "explanation:primary-reason-available",
    });
  }

  if (alternativeHotelId === null) {
    return createClaim({
      slot: "primary-reason",
      claimCode: "primary:best-evidenced-fit",
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: null,
      evidenceIds: candidateEvidenceIds(
        recommendedHotelId,
        utilityByHotelId,
        robustnessByHotelId,
        contextualByHotelId
      ),
      derivationIds: [input.decisionRobustness.evaluationId],
      reasonCode: "explanation:primary-reason-available",
    });
  }

  const pairwise = findPairwiseComparison(
    input.decisionGeometry,
    recommendedHotelId,
    alternativeHotelId
  );
  const recommendedCost = geometryCost(input.decisionGeometry, recommendedHotelId);
  const alternativeCost = geometryCost(input.decisionGeometry, alternativeHotelId);
  const contextualRecommended = contextualByHotelId.get(recommendedHotelId);
  const contextualAlternative = contextualByHotelId.get(alternativeHotelId);
  const recommendedTravelTime = contextualRecommended?.location.weightedTravelTimeMinutes ?? null;
  const alternativeTravelTime = contextualAlternative?.location.weightedTravelTimeMinutes ?? null;

  if (
    pairwise?.decisiveDimension === "location" &&
    recommendedTravelTime !== null &&
    alternativeTravelTime !== null &&
    recommendedTravelTime < alternativeTravelTime
  ) {
    return createClaim({
      slot: "primary-reason",
      claimCode: "primary:shorter-travel-time",
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: contextualLocationEvidenceIds(
        [recommendedHotelId, alternativeHotelId],
        contextualByHotelId
      ),
      derivationIds: [
        pairwise.comparisonId,
        input.contextualStayValue.evaluationId,
      ],
      numericFacts: [{
        code: "travel-time-difference",
        value: round(alternativeTravelTime - recommendedTravelTime),
        unit: "minutes",
        currency: null,
        publicDisplay: true,
      }],
      reasonCode: "explanation:primary-reason-available",
    });
  }

  if (
    recommendedCost.amount !== null &&
    alternativeCost.amount !== null &&
    recommendedCost.currency !== null &&
    recommendedCost.currency === alternativeCost.currency &&
    recommendedCost.amount < alternativeCost.amount &&
    (
      pairwise?.decisiveDimension === "totalCost" ||
      pairwise === null
    )
  ) {
    return createClaim({
      slot: "primary-reason",
      claimCode: "primary:lower-total-cost",
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: dimensionEvidenceIds(
        [recommendedHotelId, alternativeHotelId],
        "priceValue",
        utilityByHotelId
      ),
      derivationIds: [
        pairwise?.comparisonId ?? input.decisionGeometry.evaluationId,
      ],
      numericFacts: [{
        code: "total-cost-difference",
        value: round(alternativeCost.amount - recommendedCost.amount),
        unit: "currency",
        currency: recommendedCost.currency,
        publicDisplay: true,
      }],
      reasonCode: "explanation:primary-reason-available",
    });
  }

  const benefitComparisons = compareBenefitDimensions(
    recommendedHotelId,
    alternativeHotelId,
    utilityByHotelId
  ).filter((comparison) => comparison.advantage > 0);
  const decisiveBenefit = pairwise?.decisiveDimension !== null &&
    pairwise?.decisiveDimension !== undefined &&
    pairwise.decisiveDimension !== "totalCost"
      ? benefitComparisons.find(
          (comparison) => comparison.dimension === pairwise.decisiveDimension
        ) ?? null
      : null;
  const selected = decisiveBenefit ?? benefitComparisons.sort(
    (first, second) =>
      second.advantage - first.advantage ||
      first.dimension.localeCompare(second.dimension)
  )[0] ?? null;

  if (selected !== null && selected.dimension !== "totalCost") {
    return createClaim({
      slot: "primary-reason",
      claimCode: DIMENSION_PRIMARY_CODES[selected.dimension],
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: selected.evidenceIds,
      derivationIds: [
        pairwise?.comparisonId ?? input.decisionGeometry.evaluationId,
      ],
      reasonCode: "explanation:primary-reason-available",
    });
  }

  return createClaim({
    slot: "primary-reason",
    claimCode: "primary:best-evidenced-fit",
    subjectHotelId: recommendedHotelId,
    comparisonHotelId: alternativeHotelId,
    evidenceIds: candidateEvidenceIds(
      recommendedHotelId,
      utilityByHotelId,
      robustnessByHotelId,
      contextualByHotelId
    ),
    derivationIds: [input.decisionRobustness.evaluationId],
    reasonCode: "explanation:primary-reason-available",
  });
}

function tradeOffClaim(
  recommendedHotelId: string | null,
  alternativeHotelId: string | null,
  input: EvaluateStayOptiDecisionExplanationInputV3,
  utilityByHotelId: UtilityByHotelId,
  robustnessByHotelId: Map<string, StayOptiRobustnessCandidateEvaluationV3>,
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  if (recommendedHotelId === null || alternativeHotelId === null) {
    return createUnavailableClaim("main-trade-off");
  }

  const recommendedCost = geometryCost(input.decisionGeometry, recommendedHotelId);
  const alternativeCost = geometryCost(input.decisionGeometry, alternativeHotelId);
  const pairwise = findPairwiseComparison(
    input.decisionGeometry,
    recommendedHotelId,
    alternativeHotelId
  );

  if (
    recommendedCost.amount !== null &&
    alternativeCost.amount !== null &&
    recommendedCost.currency !== null &&
    recommendedCost.currency === alternativeCost.currency &&
    recommendedCost.amount > alternativeCost.amount
  ) {
    return createClaim({
      slot: "main-trade-off",
      claimCode: "trade-off:higher-total-cost",
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: uniqueSorted([
        ...dimensionEvidenceIds(
          [recommendedHotelId, alternativeHotelId],
          "priceValue",
          utilityByHotelId
        ),
        ...(input.legacyTradeOffEvidenceIds ?? []),
      ]),
      derivationIds: [
        pairwise?.comparisonId ?? input.decisionGeometry.evaluationId,
      ],
      numericFacts: [{
        code: "total-cost-difference",
        value: round(recommendedCost.amount - alternativeCost.amount),
        unit: "currency",
        currency: recommendedCost.currency,
        publicDisplay: true,
      }],
      reasonCode: "explanation:trade-off-available",
    });
  }

  const contextualRecommended = contextualByHotelId.get(recommendedHotelId);
  const contextualAlternative = contextualByHotelId.get(alternativeHotelId);
  const recommendedTravelTime = contextualRecommended?.location.weightedTravelTimeMinutes ?? null;
  const alternativeTravelTime = contextualAlternative?.location.weightedTravelTimeMinutes ?? null;

  if (
    recommendedTravelTime !== null &&
    alternativeTravelTime !== null &&
    recommendedTravelTime > alternativeTravelTime
  ) {
    return createClaim({
      slot: "main-trade-off",
      claimCode: "trade-off:longer-travel-time",
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: contextualLocationEvidenceIds(
        [recommendedHotelId, alternativeHotelId],
        contextualByHotelId
      ),
      derivationIds: [input.contextualStayValue.evaluationId],
      numericFacts: [{
        code: "travel-time-difference",
        value: round(recommendedTravelTime - alternativeTravelTime),
        unit: "minutes",
        currency: null,
        publicDisplay: true,
      }],
      reasonCode: "explanation:trade-off-available",
    });
  }

  const benefitWeaknesses = compareBenefitDimensions(
    recommendedHotelId,
    alternativeHotelId,
    utilityByHotelId
  ).filter((comparison) => comparison.advantage < 0)
    .sort(
      (first, second) =>
        first.advantage - second.advantage ||
        first.dimension.localeCompare(second.dimension)
    );
  const selectedWeakness = benefitWeaknesses[0] ?? null;

  if (selectedWeakness !== null && selectedWeakness.dimension !== "totalCost") {
    return createClaim({
      slot: "main-trade-off",
      claimCode: DIMENSION_TRADE_OFF_CODES[selectedWeakness.dimension],
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: uniqueSorted([
        ...selectedWeakness.evidenceIds,
        ...(input.legacyTradeOffEvidenceIds ?? []),
      ]),
      derivationIds: [
        pairwise?.comparisonId ?? input.decisionGeometry.evaluationId,
      ],
      reasonCode: "explanation:trade-off-available",
    });
  }

  const recommendedRisk = robustnessByHotelId.get(recommendedHotelId);
  const alternativeRisk = robustnessByHotelId.get(alternativeHotelId);

  if (
    recommendedRisk !== undefined &&
    alternativeRisk !== undefined &&
    recommendedRisk.choiceRiskScore > alternativeRisk.choiceRiskScore
  ) {
    return createClaim({
      slot: "main-trade-off",
      claimCode: "trade-off:higher-choice-risk",
      subjectHotelId: recommendedHotelId,
      comparisonHotelId: alternativeHotelId,
      evidenceIds: uniqueSorted([
        ...recommendedRisk.riskSignals.flatMap((signal) => signal.evidenceIds),
        ...alternativeRisk.riskSignals.flatMap((signal) => signal.evidenceIds),
      ]),
      derivationIds: [input.decisionRobustness.evaluationId],
      reasonCode: "explanation:trade-off-available",
    });
  }

  return createUnavailableClaim("main-trade-off");
}

function alternativeClaim(
  recommendedHotelId: string | null,
  alternativeHotelId: string | null,
  input: EvaluateStayOptiDecisionExplanationInputV3,
  utilityByHotelId: UtilityByHotelId,
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  if (alternativeHotelId === null) {
    return createUnavailableClaim("best-alternative");
  }

  if (recommendedHotelId === null) {
    const evidenceIds = dimensionEvidenceIds(
      [alternativeHotelId],
      "priceValue",
      utilityByHotelId
    );
    return createClaim({
      slot: "best-alternative",
      claimCode: "alternative:closest-evidenced-option",
      subjectHotelId: alternativeHotelId,
      comparisonHotelId: null,
      evidenceIds,
      derivationIds: [input.decisionRobustness.evaluationId],
      reasonCode: "explanation:alternative-available",
    });
  }

  const recommendedCost = geometryCost(input.decisionGeometry, recommendedHotelId);
  const alternativeCost = geometryCost(input.decisionGeometry, alternativeHotelId);

  if (
    recommendedCost.amount !== null &&
    alternativeCost.amount !== null &&
    recommendedCost.currency !== null &&
    recommendedCost.currency === alternativeCost.currency &&
    alternativeCost.amount < recommendedCost.amount
  ) {
    return createClaim({
      slot: "best-alternative",
      claimCode: "alternative:lower-total-cost",
      subjectHotelId: alternativeHotelId,
      comparisonHotelId: recommendedHotelId,
      evidenceIds: dimensionEvidenceIds(
        [recommendedHotelId, alternativeHotelId],
        "priceValue",
        utilityByHotelId
      ),
      derivationIds: [input.decisionGeometry.evaluationId],
      numericFacts: [{
        code: "total-cost-difference",
        value: round(recommendedCost.amount - alternativeCost.amount),
        unit: "currency",
        currency: recommendedCost.currency,
        publicDisplay: true,
      }],
      reasonCode: "explanation:alternative-available",
    });
  }

  const contextualRecommended = contextualByHotelId.get(recommendedHotelId);
  const contextualAlternative = contextualByHotelId.get(alternativeHotelId);
  const recommendedTravelTime = contextualRecommended?.location.weightedTravelTimeMinutes ?? null;
  const alternativeTravelTime = contextualAlternative?.location.weightedTravelTimeMinutes ?? null;

  if (
    recommendedTravelTime !== null &&
    alternativeTravelTime !== null &&
    alternativeTravelTime < recommendedTravelTime
  ) {
    return createClaim({
      slot: "best-alternative",
      claimCode: "alternative:shorter-travel-time",
      subjectHotelId: alternativeHotelId,
      comparisonHotelId: recommendedHotelId,
      evidenceIds: contextualLocationEvidenceIds(
        [recommendedHotelId, alternativeHotelId],
        contextualByHotelId
      ),
      derivationIds: [input.contextualStayValue.evaluationId],
      numericFacts: [{
        code: "travel-time-difference",
        value: round(recommendedTravelTime - alternativeTravelTime),
        unit: "minutes",
        currency: null,
        publicDisplay: true,
      }],
      reasonCode: "explanation:alternative-available",
    });
  }

  const alternativeAdvantages = compareBenefitDimensions(
    alternativeHotelId,
    recommendedHotelId,
    utilityByHotelId
  ).filter((comparison) => comparison.advantage > 0)
    .sort(
      (first, second) =>
        second.advantage - first.advantage ||
        first.dimension.localeCompare(second.dimension)
    );
  const selected = alternativeAdvantages[0] ?? null;

  if (selected !== null && selected.dimension !== "totalCost") {
    return createClaim({
      slot: "best-alternative",
      claimCode: DIMENSION_ALTERNATIVE_CODES[selected.dimension],
      subjectHotelId: alternativeHotelId,
      comparisonHotelId: recommendedHotelId,
      evidenceIds: selected.evidenceIds,
      derivationIds: [input.decisionGeometry.evaluationId],
      reasonCode: "explanation:alternative-available",
    });
  }

  return createClaim({
    slot: "best-alternative",
    claimCode: "alternative:closest-evidenced-option",
    subjectHotelId: alternativeHotelId,
    comparisonHotelId: recommendedHotelId,
    evidenceIds: dimensionEvidenceIds(
      [alternativeHotelId],
      "priceValue",
      utilityByHotelId
    ),
    derivationIds: [input.decisionRobustness.evaluationId],
    reasonCode: "explanation:alternative-available",
  });
}

function exactSwitchClaim(
  recommendedHotelId: string | null,
  alternativeHotelId: string | null,
  input: EvaluateStayOptiDecisionExplanationInputV3,
  utilityByHotelId: UtilityByHotelId
) {
  if (recommendedHotelId === null || alternativeHotelId === null) {
    const selected = input.decisionRobustness.constraintRelaxation.selected;

    if (
      input.decisionRobustness.constraintRelaxation.status !== "recommended" ||
      selected === null ||
      selected.evidenceStatus !== "verified"
    ) {
      return createUnavailableClaim("switch-condition");
    }

    const claimCode: StayOptiExplanationClaimCodeV3 =
      selected.kind === "budget-increase"
        ? "switch:verified-budget-relaxation"
        : selected.kind === "distance-increase"
          ? "switch:verified-distance-relaxation"
          : selected.kind === "date-flexibility"
            ? "switch:verified-date-relaxation"
            : "switch:verified-category-relaxation";
    const factUnit: StayOptiExplanationNumericUnitV3 =
      selected.changeUnit === "currency"
        ? "currency"
        : selected.changeUnit;
    const factCurrency = factUnit === "currency"
      ? input.decisionGeometry.candidates.find(
          (candidate) => candidate.currency !== null
        )?.currency ?? null
      : null;
    const evidenceIds = uniqueSorted(
      input.utilityEvaluations.flatMap(
        (utility) => utility.contributions.flatMap(
          (contribution) => contribution.evidenceIds
        )
      )
    );

    if (factUnit === "currency" && factCurrency === null) {
      return createUnavailableClaim("switch-condition");
    }

    return createClaim({
      slot: "switch-condition",
      claimCode,
      subjectHotelId: null,
      comparisonHotelId: null,
      evidenceIds,
      derivationIds: [
        selected.relaxationId,
        input.decisionRobustness.evaluationId,
      ],
      numericFacts: [{
        code: "constraint-relaxation-amount",
        value: round(selected.changeAmount),
        unit: factUnit,
        currency: factCurrency,
        publicDisplay: true,
      }],
      reasonCode: "explanation:switch-condition-available",
    });
  }

  const threshold = findTradeOffThreshold(
    input.decisionGeometry,
    recommendedHotelId,
    alternativeHotelId
  );

  if (threshold === null || !threshold.exact) {
    return createUnavailableClaim("switch-condition");
  }

  const maximumSensiblePrice = threshold.higherCostMaximumSensiblePrice;

  if (
    maximumSensiblePrice.status !== "available" ||
    maximumSensiblePrice.amount === null ||
    maximumSensiblePrice.currency === null
  ) {
    return createUnavailableClaim("switch-condition");
  }

  const alternativeIsHigherCost = threshold.higherCostHotelId === alternativeHotelId;
  const claimCode: StayOptiExplanationClaimCodeV3 = alternativeIsHigherCost
    ? "switch:alternative-price-at-or-below"
    : "switch:recommended-price-above";

  return createClaim({
    slot: "switch-condition",
    claimCode,
    subjectHotelId: alternativeIsHigherCost
      ? alternativeHotelId
      : recommendedHotelId,
    comparisonHotelId: alternativeIsHigherCost
      ? recommendedHotelId
      : alternativeHotelId,
    evidenceIds: dimensionEvidenceIds(
      [recommendedHotelId, alternativeHotelId],
      "priceValue",
      utilityByHotelId
    ),
    derivationIds: [
      threshold.thresholdId,
      input.decisionGeometry.evaluationId,
    ],
    numericFacts: [{
      code: "switch-price-threshold",
      value: round(maximumSensiblePrice.amount),
      unit: "currency",
      currency: maximumSensiblePrice.currency,
      publicDisplay: true,
    }],
    reasonCode: "explanation:switch-condition-available",
  });
}

function uncertaintyClaim(
  status: StayOptiExplanationStatusV3,
  recommendedHotelId: string | null,
  alternativeHotelId: string | null,
  input: EvaluateStayOptiDecisionExplanationInputV3,
  utilityByHotelId: UtilityByHotelId,
  robustnessByHotelId: Map<string, StayOptiRobustnessCandidateEvaluationV3>,
  contextualByHotelId: Map<string, StayOptiContextualCandidateEvaluationV3>
) {
  const robustness = input.decisionRobustness;
  const evidenceHotelIds = uniqueSorted([
    ...(recommendedHotelId === null ? [] : [recommendedHotelId]),
    ...(alternativeHotelId === null ? [] : [alternativeHotelId]),
    ...robustness.nearTie.hotelIds,
  ]);
  const fallbackHotelIds = evidenceHotelIds.length > 0
    ? evidenceHotelIds
    : robustness.candidates.map((candidate) => candidate.hotelId);
  const evidenceIds = fallbackHotelIds.flatMap(
    (hotelId) => candidateEvidenceIds(
      hotelId,
      utilityByHotelId,
      robustnessByHotelId,
      contextualByHotelId
    )
  );
  let claimCode: StayOptiExplanationClaimCodeV3;

  if (robustness.abstentionCode === "insufficient-evidence") {
    claimCode = "uncertainty:insufficient-evidence";
  }
  else if (robustness.abstentionCode === "no-good-option") {
    claimCode = "uncertainty:no-good-option";
  }
  else if (robustness.abstentionCode === "unstable-choice") {
    claimCode = "uncertainty:unstable-choice";
  }
  else if (robustness.nearTie.status === "detected") {
    claimCode = "uncertainty:near-tie";
  }
  else {
    const recommendedRobustness = recommendedHotelId === null
      ? null
      : robustnessByHotelId.get(recommendedHotelId) ?? null;
    const recommendedContext = recommendedHotelId === null
      ? null
      : contextualByHotelId.get(recommendedHotelId) ?? null;
    const recheckRequired = recommendedRobustness?.riskSignals.some(
      (signal) =>
        signal.code === "bookability-recheck" ||
        signal.code === "offer-stale"
    ) ?? false;
    const materialEvidenceGap =
      recommendedRobustness !== null &&
      (
        recommendedRobustness.evidenceStrength < 0.7 ||
        recommendedContext?.status !== "usable"
      );
    const evaluatedScenarios = robustness.scenarios.filter(
      (scenario) => scenario.status === "evaluated"
    );
    const stableAcrossScenarios =
      status === "recommended" &&
      recommendedHotelId !== null &&
      evaluatedScenarios.length > 0 &&
      evaluatedScenarios.every(
        (scenario) => scenario.winnerHotelIds.includes(recommendedHotelId)
      );

    claimCode = recheckRequired
      ? "uncertainty:recheck-required"
      : materialEvidenceGap
        ? "uncertainty:material-evidence-gap"
        : stableAcrossScenarios
          ? "uncertainty:stable-under-tested-scenarios"
          : "uncertainty:unstable-choice";
  }

  return createClaim({
    slot: "uncertainty",
    claimCode,
    subjectHotelId: recommendedHotelId,
    comparisonHotelId: alternativeHotelId,
    evidenceIds,
    derivationIds: [robustness.evaluationId],
    reasonCode: "explanation:uncertainty-available",
  });
}

function createCopyEvidenceLinks(claims: readonly StayOptiExplanationClaimV3[]) {
  return claims
    .filter((claim) => claim.status === "available")
    .map((claim): StayOptiExplanationCopyEvidenceLinkV3 => ({
      claimId: claim.claimId,
      evidenceIds: claim.evidenceIds,
      derivationIds: claim.derivationIds,
    }))
    .sort(
      (first, second) => first.claimId.localeCompare(second.claimId)
    );
}

function explanationFingerprint(
  explanation: Omit<StayOptiDecisionExplanationV3, "fingerprint">
) {
  return createStableHashV3(
    explanation,
    "stayopti-v3-decision-explanation"
  );
}

function strengthLabel(
  status: StayOptiExplanationStatusV3,
  recommendedHotelId: string | null,
  robustness: StayOptiDecisionRobustnessV3
): StayOptiExplanationStrengthLabelV3 {
  if (status === "unavailable") {
    return "unavailable";
  }

  if (status === "abstained") {
    return robustness.nearTie.status === "detected"
      ? "near-tie"
      : "abstained";
  }

  if (robustness.nearTie.status === "detected") {
    return "near-tie";
  }

  const evaluatedScenarios = robustness.scenarios.filter(
    (scenario) => scenario.status === "evaluated"
  );
  const stable = recommendedHotelId !== null &&
    evaluatedScenarios.length > 0 &&
    evaluatedScenarios.every(
      (scenario) => scenario.winnerHotelIds.includes(recommendedHotelId)
    );

  return stable
    ? "robust-across-tested-scenarios"
    : "sensitive-to-tested-assumptions";
}

export function evaluateDecisionExplanationV3(
  input: EvaluateStayOptiDecisionExplanationInputV3
): StayOptiDecisionExplanationV3 {
  const utilityEvaluations = [...input.utilityEvaluations].sort(
    (first, second) => first.hotelId.localeCompare(second.hotelId)
  );
  const utilityByHotelId: UtilityByHotelId = new Map(
    utilityEvaluations.map(
      (utility) => [utility.hotelId, utility]
    )
  );
  const robustnessByHotelId = new Map(
    input.decisionRobustness.candidates.map(
      (candidate) => [candidate.hotelId, candidate]
    )
  );
  const contextualByHotelId = new Map(
    input.contextualStayValue.candidates.map(
      (candidate) => [candidate.hotelId, candidate]
    )
  );
  const robustPreferredHotelId =
    input.decisionRobustness.recommendationPolicy === "recommend" &&
    input.decisionRobustness.policyPreferredHotelId !== null &&
    utilityByHotelId.has(input.decisionRobustness.policyPreferredHotelId)
      ? input.decisionRobustness.policyPreferredHotelId
      : null;
  const recommendedHotelId =
    findSolutionId(
      input.solutionMappings,
      robustPreferredHotelId
    ) !== null
      ? robustPreferredHotelId
      : null;
  const status: StayOptiExplanationStatusV3 = recommendedHotelId !== null
    ? "recommended"
    : input.decisionRobustness.recommendationPolicy === "abstain"
      ? "abstained"
      : "unavailable";
  const alternativeHotelId = selectAlternativeHotelId(
    input,
    recommendedHotelId
  );
  const recommendation = recommendationClaim(
    status,
    recommendedHotelId,
    alternativeHotelId,
    input,
    utilityByHotelId,
    robustnessByHotelId,
    contextualByHotelId
  );
  const primaryReason = primaryReasonClaim(
    status,
    recommendedHotelId,
    alternativeHotelId,
    input,
    utilityByHotelId,
    robustnessByHotelId,
    contextualByHotelId
  );
  const mainTradeOff = tradeOffClaim(
    recommendedHotelId,
    alternativeHotelId,
    input,
    utilityByHotelId,
    robustnessByHotelId,
    contextualByHotelId
  );
  const bestAlternative = alternativeClaim(
    recommendedHotelId,
    alternativeHotelId,
    input,
    utilityByHotelId,
    contextualByHotelId
  );
  const switchCondition = exactSwitchClaim(
    recommendedHotelId,
    alternativeHotelId,
    input,
    utilityByHotelId
  );
  const uncertainty = uncertaintyClaim(
    status,
    recommendedHotelId,
    alternativeHotelId,
    input,
    utilityByHotelId,
    robustnessByHotelId,
    contextualByHotelId
  );
  const claims = [
    recommendation,
    primaryReason,
    mainTradeOff,
    bestAlternative,
    switchCondition,
    uncertainty,
  ];
  const copyEvidenceLinks = createCopyEvidenceLinks(claims);
  const exactSwitchThresholdAvailable =
    switchCondition.status === "available" &&
    switchCondition.numericFacts.some(
      (fact) => fact.code === "switch-price-threshold"
    );
  const explanationWithoutFingerprint: Omit<
    StayOptiDecisionExplanationV3,
    "fingerprint"
  > = {
    evaluationId: createStableHashV3(
      {
        geometry: input.decisionGeometry.evaluationId,
        robustness: input.decisionRobustness.evaluationId,
        contextual: input.contextualStayValue.evaluationId,
        recommendedHotelId,
        alternativeHotelId,
      },
      "stayopti-v3-decision-explanation-evaluation"
    ),
    phase: "v3-07",
    rankingApplication: "shadow-only",
    publicPresentation: "disabled",
    publicGate: {
      status: "pending-blind-comprehension",
      copyEnabled: false,
      requiresBlindComprehensionTest: true,
      requiresCalibratedConfidence: true,
      requiresEvidenceCopyAlignment: true,
    },
    status,
    titleKey: status === "recommended"
      ? "stayopti.v3.decision.recommended"
      : status === "abstained"
        ? "stayopti.v3.decision.abstained"
        : "stayopti.v3.decision.unavailable",
    recommendedHotelId,
    recommendedSolutionId: findSolutionId(input.solutionMappings, recommendedHotelId),
    bestAlternativeHotelId: alternativeHotelId,
    bestAlternativeSolutionId: findSolutionId(input.solutionMappings, alternativeHotelId),
    strengthLabel: strengthLabel(
      status,
      recommendedHotelId,
      input.decisionRobustness
    ),
    publicNumericConfidence: null,
    recommendation,
    primaryReason,
    mainTradeOff,
    bestAlternative,
    switchCondition,
    uncertainty,
    copyEvidenceLinks,
    primaryEvidenceIds: primaryReason.status === "available"
      ? primaryReason.evidenceIds
      : recommendation.evidenceIds,
    tradeOffEvidenceIds: mainTradeOff.evidenceIds,
    sourceReasonCodes: uniqueSorted(input.sourceReasonCodes ?? []),
    exactSwitchThresholdAvailable,
    compression: {
      format: "six-statement-ten-second-thesis",
      maximumStatementCount: 6,
      availableStatementCount: claims.filter(
        (claim) => claim.status === "available"
      ).length,
    },
    numericPolicy: {
      publicPercentageCount: 0,
      uncalibratedPercentagesAllowed: false,
    },
    sourceEvaluationIds: {
      decisionGeometryEvaluationId: input.decisionGeometry.evaluationId,
      decisionRobustnessEvaluationId: input.decisionRobustness.evaluationId,
      contextualStayValueEvaluationId: input.contextualStayValue.evaluationId,
    },
    reasonCodes: uniqueReasonCodesV3([
      "explanation:evaluated",
      "explanation:shadow-only",
      "explanation:public-gate-pending",
      "explanation:copy-evidence-aligned",
      "explanation:no-uncalibrated-percentage",
      ...claims.flatMap((claim) => claim.reasonCodes),
    ]),
  };

  const explanation: StayOptiDecisionExplanationV3 = {
    ...explanationWithoutFingerprint,
    fingerprint: explanationFingerprint(explanationWithoutFingerprint),
  };

  const validation = validateDecisionExplanationV3(explanation);

  if (!validation.valid) {
    throw new Error(
      `Invalid StayOpti V3-07 explanation: ${validation.issues.join(", ")}.`
    );
  }

  return explanation;
}

export function validateDecisionExplanationV3(
  explanation: StayOptiDecisionExplanationV3
): StayOptiDecisionExplanationValidationV3 {
  const issues: string[] = [];
  const claims = [
    explanation.recommendation,
    explanation.primaryReason,
    explanation.mainTradeOff,
    explanation.bestAlternative,
    explanation.switchCondition,
    explanation.uncertainty,
  ];

  if (
    explanation.phase !== "v3-07" ||
    explanation.rankingApplication !== "shadow-only" ||
    explanation.publicPresentation !== "disabled" ||
    explanation.publicGate.status !== "pending-blind-comprehension" ||
    explanation.publicGate.copyEnabled !== false
  ) {
    issues.push("rollout-gate-invalid");
  }

  if (
    explanation.publicNumericConfidence !== null ||
    explanation.numericPolicy.publicPercentageCount !== 0 ||
    explanation.numericPolicy.uncalibratedPercentagesAllowed !== false
  ) {
    issues.push("uncalibrated-numeric-confidence-exposed");
  }

  if (
    explanation.compression.maximumStatementCount !== 6 ||
    explanation.compression.availableStatementCount !== claims.filter(
      (claim) => claim.status === "available"
    ).length ||
    explanation.compression.availableStatementCount > 6
  ) {
    issues.push("ten-second-compression-invalid");
  }

  claims.forEach((claim, index) => {
    if (claim.slot !== STAYOPTI_EXPLANATION_SLOT_IDS_V3[index]) {
      issues.push(`slot-order-invalid:${index}`);
    }

    if (claim.status === "available") {
      if (
        claim.claimCode === "unavailable" ||
        claim.evidenceIds.length === 0 ||
        claim.derivationIds.length === 0 ||
        stableSerializeV3(claim.evidenceIds) !== stableSerializeV3(uniqueSorted(claim.evidenceIds)) ||
        stableSerializeV3(claim.derivationIds) !== stableSerializeV3(uniqueSorted(claim.derivationIds))
      ) {
        issues.push(`available-claim-unproven:${claim.slot}`);
      }
    }
    else if (
      claim.claimCode !== "unavailable" ||
      claim.evidenceIds.length !== 0 ||
      claim.derivationIds.length !== 0 ||
      claim.numericFacts.length !== 0
    ) {
      issues.push(`unavailable-claim-fabricated:${claim.slot}`);
    }

    claim.numericFacts.forEach((fact) => {
      if (
        !Number.isFinite(fact.value) ||
        fact.value < 0 ||
        fact.publicDisplay !== true ||
        (fact.unit === "currency") !== (fact.currency !== null)
      ) {
        issues.push(`numeric-fact-invalid:${claim.slot}:${fact.code}`);
      }
    });
  });

  const expectedLinks = createCopyEvidenceLinks(claims);

  if (
    stableSerializeV3(expectedLinks) !==
    stableSerializeV3(explanation.copyEvidenceLinks)
  ) {
    issues.push("copy-evidence-links-mismatch");
  }

  if (
    explanation.status === "recommended"
      ? explanation.recommendedHotelId === null ||
        explanation.recommendedSolutionId === null
      : explanation.recommendedHotelId !== null ||
        explanation.recommendedSolutionId !== null
  ) {
    issues.push("recommendation-status-mismatch");
  }

  if (
    explanation.bestAlternativeHotelId === explanation.recommendedHotelId &&
    explanation.bestAlternativeHotelId !== null
  ) {
    issues.push("alternative-equals-recommendation");
  }

  if (
    explanation.exactSwitchThresholdAvailable !==
    (
      explanation.switchCondition.status === "available" &&
      explanation.switchCondition.numericFacts.some(
        (fact) => fact.code === "switch-price-threshold"
      )
    )
  ) {
    issues.push("exact-switch-threshold-mismatch");
  }

  const {
    fingerprint: ignoredFingerprint,
    ...withoutFingerprint
  } = explanation;

  void ignoredFingerprint;

  if (explanationFingerprint(withoutFingerprint) !== explanation.fingerprint) {
    issues.push("fingerprint-mismatch");
  }

  return {
    valid: issues.length === 0,
    issues: uniqueSorted(issues),
  };
}

export function assertDecisionExplanationV3(
  explanation: StayOptiDecisionExplanationV3
) {
  const validation = validateDecisionExplanationV3(explanation);

  if (!validation.valid) {
    throw new Error(
      `Invalid StayOptiDecisionExplanationV3: ${validation.issues.join(", ")}.`
    );
  }

  return explanation;
}
