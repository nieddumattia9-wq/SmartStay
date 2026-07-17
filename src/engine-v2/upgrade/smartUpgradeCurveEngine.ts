import type {
  SmartStayParetoEvaluationV2,
  SmartStayRiskAssessmentV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayUserUtilityEvaluationV2,
  SmartStayUtilityContributionV2,
  SmartStayUtilityDimensionCodeV2,
} from "../utility/userUtilityEngine";

export type SmartStayUpgradeBenefitDimensionV2 =
  | "quality"
  | "location"
  | "comfort"
  | "flexibility";

export type SmartStayUpgradePointStatusV2 =
  | "baseline"
  | "worthwhile"
  | "weak"
  | "not-justified"
  | "excluded";

export type SmartStayUpgradeCurveStatusV2 =
  | "unavailable"
  | "usable"
  | "strong-data";

export interface SmartStayUpgradeCurveCandidateV2 {
  hotelId:
    string;

  eligibleForPrimaryRanking:
    boolean;

  utility:
    SmartStayUserUtilityEvaluationV2;

  priceValue:
    SmartStayPriceValueEvaluationV2;

  risk:
    SmartStayRiskAssessmentV2;

  pareto:
    SmartStayParetoEvaluationV2;

  exclusionReasonCodes?:
    string[];
}

export interface SmartStayUpgradeCurveInputV2 {
  baselineHotelId:
    string;

  candidates:
    SmartStayUpgradeCurveCandidateV2[];
}

export interface SmartStayUpgradeCurveOptionsV2 {
  minimumScoreConfidence?:
    number;

  minimumEvidenceCoverage?:
    number;

  minimumPriceConfidence?:
    number;

  requireReportedCompleteCost?:
    boolean;

  minimumDimensionConfidence?:
    number;

  minimumComparableDimensions?:
    number;

  maximumBudgetOverageRatio?:
    number;

  minimumExperienceGain?:
    number;

  minimumStrongDimensionGain?:
    number;

  maximumUtilityLoss?:
    number;

  maximumSingleDimensionLoss?:
    number;

  minimumAdjustedBenefit?:
    number;

  minimumEfficiencyPerBudgetPercent?:
    number;

  minimumDiminishingReturnEfficiency?:
    number;

  diminishingReturnRelativeDrop?:
    number;
}

export interface SmartStayUpgradeDimensionComparisonV2 {
  dimension:
    SmartStayUpgradeBenefitDimensionV2;

  baselineScore:
    number;

  candidateScore:
    number;

  gain:
    number;

  baselineConfidence:
    number;

  candidateConfidence:
    number;

  normalizedWeight:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayUpgradeMarginalEvaluationV2 {
  previousHotelId:
    string;

  incrementalCost:
    number;

  incrementalBudgetOverageRatio:
    number;

  incrementalAdjustedBenefit:
    number;

  marginalBenefitPerBudgetPercent:
    number | null;

  marginalBenefitPer100Currency:
    number | null;
}

export interface SmartStayUpgradeCurvePointV2 {
  hotelId:
    string;

  status:
    SmartStayUpgradePointStatusV2;

  curveEligible:
    boolean;

  paretoStatus:
    SmartStayParetoEvaluationV2["status"];

  totalCost:
    number | null;

  currency:
    string | null;

  budgetTotal:
    number | null;

  withinBudget:
    boolean | null;

  budgetOverageAmount:
    number | null;

  budgetOverageRatio:
    number | null;

  priceDifferenceFromBaselineAmount:
    number | null;

  priceDifferenceFromBaselineRatio:
    number | null;

  utilityScore:
    number | null;

  utilityGain:
    number | null;

  scoreConfidence:
    number;

  evidenceCoverage:
    number;

  riskScore:
    number;

  riskLevel:
    SmartStayRiskAssessmentV2["level"];

  comparableDimensionCodes:
    SmartStayUpgradeBenefitDimensionV2[];

  excludedDimensionCodes:
    SmartStayUpgradeBenefitDimensionV2[];

  dimensionComparisons:
    SmartStayUpgradeDimensionComparisonV2[];

  experienceGain:
    number | null;

  grossExperienceGain:
    number | null;

  weightedExperienceLoss:
    number | null;

  strongestGainDimension:
    SmartStayUpgradeBenefitDimensionV2 | null;

  strongestGain:
    number | null;

  strongestLossDimension:
    SmartStayUpgradeBenefitDimensionV2 | null;

  strongestLoss:
    number | null;

  positiveDimensionCount:
    number;

  negativeDimensionCount:
    number;

  confidenceFactor:
    number;

  adjustedBenefit:
    number | null;

  efficiencyPerBudgetPercent:
    number | null;

  costPerAdjustedBenefitPoint:
    number | null;

  efficientFrontier:
    boolean;

  dominatedByHotelIds:
    string[];

  marginalFromPreviousEfficientPoint:
    SmartStayUpgradeMarginalEvaluationV2 | null;

  reasonCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayUpgradeCurveEvaluationV2 {
  status:
    SmartStayUpgradeCurveStatusV2;

  baselineHotelId:
    string;

  budgetTotal:
    number;

  currency:
    string;

  benefitDimensionCodes:
    SmartStayUpgradeBenefitDimensionV2[];

  points:
    SmartStayUpgradeCurvePointV2[];

  efficientFrontierHotelIds:
    string[];

  worthwhileUpgradeHotelIds:
    string[];

  bestValueUpgradeHotelId:
    string | null;

  maximumBenefitUpgradeHotelId:
    string | null;

  diminishingReturnsStartHotelId:
    string | null;

  excludedHotelIds:
    string[];

  reasonCodes:
    string[];
}

type ComparableCost = {
  amount:
    number;

  currency:
    string;

  budgetTotal:
    number;

  withinBudget:
    boolean;

  overageAmount:
    number;

  overageRatio:
    number;

  evidenceIds:
    string[];
};

type DimensionSignal = {
  score:
    number;

  confidence:
    number;

  configuredWeight:
    number;

  evidenceIds:
    string[];
};

type NormalizedCandidate = {
  hotelId:
    string;

  source:
    SmartStayUpgradeCurveCandidateV2;

  baseEligible:
    boolean;

  utilityScore:
    number | null;

  scoreConfidence:
    number;

  evidenceCoverage:
    number;

  riskScore:
    number;

  cost:
    ComparableCost | null;

  dimensions:
    Map<
      SmartStayUpgradeBenefitDimensionV2,
      DimensionSignal
    >;

  exclusionReasonCodes:
    string[];
};

type ResolvedOptions = Required<
  SmartStayUpgradeCurveOptionsV2
>;

const BENEFIT_DIMENSIONS:
  readonly SmartStayUpgradeBenefitDimensionV2[] = [
    "quality",
    "location",
    "comfort",
    "flexibility",
  ];

const DEFAULTS:
  ResolvedOptions = {
    minimumScoreConfidence:
      0.55,

    minimumEvidenceCoverage:
      0.55,

    minimumPriceConfidence:
      0.6,

    requireReportedCompleteCost:
      true,

    minimumDimensionConfidence:
      0.6,

    minimumComparableDimensions:
      3,

    maximumBudgetOverageRatio:
      0.25,

    minimumExperienceGain:
      4,

    minimumStrongDimensionGain:
      8,

    maximumUtilityLoss:
      6,

    maximumSingleDimensionLoss:
      12,

    minimumAdjustedBenefit:
      3,

    minimumEfficiencyPerBudgetPercent:
      0.25,

    minimumDiminishingReturnEfficiency:
      0.2,

    diminishingReturnRelativeDrop:
      0.5,
  };

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

function uniqueSorted<
  Value extends string
>(
  values:
    Value[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort(
    compareStrings
  ) as Value[];
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

function normalizePositiveInteger(
  value:
    unknown,
  fallback:
    number,
  maximum:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 1
  ) {
    return fallback;
  }

  return clamp(
    Math.round(value),
    1,
    maximum
  );
}

function resolveOptions(
  options:
    SmartStayUpgradeCurveOptionsV2
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

    minimumPriceConfidence:
      normalizeRatio(
        options.minimumPriceConfidence,
        DEFAULTS.minimumPriceConfidence
      ),

    requireReportedCompleteCost:
      typeof options.requireReportedCompleteCost ===
        "boolean"
        ? options.requireReportedCompleteCost
        : DEFAULTS.requireReportedCompleteCost,

    minimumDimensionConfidence:
      normalizeRatio(
        options.minimumDimensionConfidence,
        DEFAULTS.minimumDimensionConfidence
      ),

    minimumComparableDimensions:
      normalizePositiveInteger(
        options.minimumComparableDimensions,
        DEFAULTS.minimumComparableDimensions,
        BENEFIT_DIMENSIONS.length
      ),

    maximumBudgetOverageRatio:
      normalizeRatio(
        options.maximumBudgetOverageRatio,
        DEFAULTS.maximumBudgetOverageRatio
      ),

    minimumExperienceGain:
      normalizeNonNegativeNumber(
        options.minimumExperienceGain,
        DEFAULTS.minimumExperienceGain
      ),

    minimumStrongDimensionGain:
      normalizeNonNegativeNumber(
        options.minimumStrongDimensionGain,
        DEFAULTS.minimumStrongDimensionGain
      ),

    maximumUtilityLoss:
      normalizeNonNegativeNumber(
        options.maximumUtilityLoss,
        DEFAULTS.maximumUtilityLoss
      ),

    maximumSingleDimensionLoss:
      normalizeNonNegativeNumber(
        options.maximumSingleDimensionLoss,
        DEFAULTS.maximumSingleDimensionLoss
      ),

    minimumAdjustedBenefit:
      normalizeNonNegativeNumber(
        options.minimumAdjustedBenefit,
        DEFAULTS.minimumAdjustedBenefit
      ),

    minimumEfficiencyPerBudgetPercent:
      normalizeNonNegativeNumber(
        options.minimumEfficiencyPerBudgetPercent,
        DEFAULTS.minimumEfficiencyPerBudgetPercent
      ),

    minimumDiminishingReturnEfficiency:
      normalizeNonNegativeNumber(
        options.minimumDiminishingReturnEfficiency,
        DEFAULTS.minimumDiminishingReturnEfficiency
      ),

    diminishingReturnRelativeDrop:
      normalizeRatio(
        options.diminishingReturnRelativeDrop,
        DEFAULTS.diminishingReturnRelativeDrop
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

function normalizeUtilityScore(
  value:
    unknown
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    return null;
  }

  return value;
}

function extractCost(
  evaluation:
    SmartStayPriceValueEvaluationV2,
  options:
    ResolvedOptions
): ComparableCost | null {
  const currency =
    normalizeCurrency(
      evaluation.currency
    );

  const budget =
    evaluation.budget;

  if (
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    evaluation.eligibleForPrimaryRanking !== true ||
    typeof evaluation.totalCost !== "number" ||
    !Number.isFinite(
      evaluation.totalCost
    ) ||
    evaluation.totalCost <= 0 ||
    !currency ||
    typeof evaluation.confidence !== "number" ||
    !Number.isFinite(
      evaluation.confidence
    ) ||
    evaluation.confidence <
      options.minimumPriceConfidence ||
    (
      options.requireReportedCompleteCost &&
      evaluation.costCompleteness !==
        "reported-complete"
    ) ||
    budget.provided !== true ||
    typeof budget.total !== "number" ||
    !Number.isFinite(
      budget.total
    ) ||
    budget.total <= 0 ||
    typeof budget.withinBudget !== "boolean"
  ) {
    return null;
  }

  const computedOverageAmount =
    Math.max(
      evaluation.totalCost -
      budget.total,
      0
    );

  const computedOverageRatio =
    computedOverageAmount /
    budget.total;

  if (
    typeof budget.overageAmount === "number" &&
    Number.isFinite(
      budget.overageAmount
    ) &&
    Math.abs(
      budget.overageAmount -
      computedOverageAmount
    ) > 0.02
  ) {
    return null;
  }

  if (
    typeof budget.overageRatio === "number" &&
    Number.isFinite(
      budget.overageRatio
    ) &&
    Math.abs(
      budget.overageRatio -
      computedOverageRatio
    ) > 0.0002
  ) {
    return null;
  }

  if (
    budget.withinBudget !==
    (
      evaluation.totalCost <=
      budget.total
    )
  ) {
    return null;
  }

  return {
    amount:
      evaluation.totalCost,

    currency,

    budgetTotal:
      budget.total,

    withinBudget:
      budget.withinBudget,

    overageAmount:
      computedOverageAmount,

    overageRatio:
      computedOverageRatio,

    evidenceIds:
      uniqueSorted(
        evaluation.evidenceIds
      ),
  };
}

function isBenefitDimension(
  value:
    SmartStayUtilityDimensionCodeV2
): value is SmartStayUpgradeBenefitDimensionV2 {
  return (
    BENEFIT_DIMENSIONS as
      readonly SmartStayUtilityDimensionCodeV2[]
  ).includes(
    value
  );
}

function extractDimensions(
  contributions:
    SmartStayUtilityContributionV2[],
  minimumDimensionConfidence:
    number
) {
  const dimensions =
    new Map<
      SmartStayUpgradeBenefitDimensionV2,
      DimensionSignal
    >();

  for (
    const contribution
    of contributions
  ) {
    if (
      !isBenefitDimension(
        contribution.dimension
      ) ||
      contribution.available !== true ||
      typeof contribution.score !== "number" ||
      !Number.isFinite(
        contribution.score
      ) ||
      contribution.score < 0 ||
      contribution.score > 100 ||
      typeof contribution.confidence !== "number" ||
      !Number.isFinite(
        contribution.confidence
      ) ||
      contribution.confidence <
        minimumDimensionConfidence ||
      typeof contribution.configuredWeight !== "number" ||
      !Number.isFinite(
        contribution.configuredWeight
      ) ||
      contribution.configuredWeight <= 0
    ) {
      continue;
    }

    dimensions.set(
      contribution.dimension,
      {
        score:
          contribution.score,

        confidence:
          contribution.confidence,

        configuredWeight:
          contribution.configuredWeight,

        evidenceIds:
          uniqueSorted(
            contribution.evidenceIds
          ),
      }
    );
  }

  return dimensions;
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
    SmartStayUpgradeCurveCandidateV2,
  options:
    ResolvedOptions
): NormalizedCandidate {
  if (
    typeof candidate.hotelId !== "string" ||
    !candidate.hotelId.trim()
  ) {
    throw new Error(
      "Smart Upgrade Curve candidate requires a hotelId."
    );
  }

  const hotelId =
    candidate.hotelId.trim();

  if (
    candidate.utility.hotelId !== hotelId ||
    candidate.priceValue.hotelId !== hotelId
  ) {
    throw new Error(
      `Smart Upgrade Curve candidate hotelId mismatch: ${hotelId}`
    );
  }

  const utilityScore =
    normalizeUtilityScore(
      candidate.utility.utilityScore
    );

  const scoreConfidence =
    normalizeRatio(
      candidate.utility.scoreConfidence,
      0
    );

  const evidenceCoverage =
    normalizeRatio(
      candidate.utility.evidenceCoverage,
      0
    );

  const riskScore =
    clamp(
      typeof candidate.risk.score === "number" &&
      Number.isFinite(
        candidate.risk.score
      )
        ? candidate.risk.score
        : 100,
      0,
      100
    );

  const baseEligible =
    candidate.eligibleForPrimaryRanking === true &&
    candidate.utility.eligibleForPrimaryRanking === true &&
    candidate.utility.status !== "invalid" &&
    candidate.utility.status !== "unavailable" &&
    utilityScore !== null &&
    scoreConfidence >=
      options.minimumScoreConfidence &&
    evidenceCoverage >=
      options.minimumEvidenceCoverage &&
    candidate.risk.level !== "high" &&
    riskScore < 60;

  return {
    hotelId,

    source:
      candidate,

    baseEligible,

    utilityScore,

    scoreConfidence,

    evidenceCoverage,

    riskScore,

    cost:
      extractCost(
        candidate.priceValue,
        options
      ),

    dimensions:
      extractDimensions(
        candidate.utility.contributions,
        options.minimumDimensionConfidence
      ),

    exclusionReasonCodes:
      uniqueSorted(
        candidate.exclusionReasonCodes ??
        []
      ),
  };
}

function createEmptyPoint(
  candidate:
    NormalizedCandidate,
  reasonCodes:
    string[]
): SmartStayUpgradeCurvePointV2 {
  return {
    hotelId:
      candidate.hotelId,

    status:
      "excluded",

    curveEligible:
      false,

    paretoStatus:
      candidate.source.pareto.status,

    totalCost:
      candidate.cost
        ? round(
            candidate.cost.amount
          )
        : null,

    currency:
      candidate.cost?.currency ??
      null,

    budgetTotal:
      candidate.cost
        ? round(
            candidate.cost.budgetTotal
          )
        : null,

    withinBudget:
      candidate.cost?.withinBudget ??
      null,

    budgetOverageAmount:
      candidate.cost
        ? round(
            candidate.cost.overageAmount
          )
        : null,

    budgetOverageRatio:
      candidate.cost
        ? round(
            candidate.cost.overageRatio,
            4
          )
        : null,

    priceDifferenceFromBaselineAmount:
      null,

    priceDifferenceFromBaselineRatio:
      null,

    utilityScore:
      candidate.utilityScore === null
        ? null
        : round(
            candidate.utilityScore
          ),

    utilityGain:
      null,

    scoreConfidence:
      round(
        candidate.scoreConfidence,
        4
      ),

    evidenceCoverage:
      round(
        candidate.evidenceCoverage,
        4
      ),

    riskScore:
      round(
        candidate.riskScore
      ),

    riskLevel:
      candidate.source.risk.level,

    comparableDimensionCodes:
      [],

    excludedDimensionCodes:
      [
        ...BENEFIT_DIMENSIONS,
      ],

    dimensionComparisons:
      [],

    experienceGain:
      null,

    grossExperienceGain:
      null,

    weightedExperienceLoss:
      null,

    strongestGainDimension:
      null,

    strongestGain:
      null,

    strongestLossDimension:
      null,

    strongestLoss:
      null,

    positiveDimensionCount:
      0,

    negativeDimensionCount:
      0,

    confidenceFactor:
      0,

    adjustedBenefit:
      null,

    efficiencyPerBudgetPercent:
      null,

    costPerAdjustedBenefitPoint:
      null,

    efficientFrontier:
      false,

    dominatedByHotelIds:
      [],

    marginalFromPreviousEfficientPoint:
      null,

    reasonCodes:
      uniqueSorted([
        ...candidate
          .exclusionReasonCodes,
        ...reasonCodes,
      ]),

    evidenceIds:
      uniqueSorted([
        ...candidate.source
          .utility.evidenceIds,
        ...candidate.source
          .priceValue.evidenceIds,
        ...candidate.source
          .risk.evidenceIds,
      ]),
  };
}

function createBaselinePoint(
  baseline:
    NormalizedCandidate
): SmartStayUpgradeCurvePointV2 {
  const cost =
    baseline.cost as ComparableCost;

  const comparableDimensionCodes =
    uniqueSorted([
      ...baseline.dimensions.keys(),
    ]);

  return {
    ...createEmptyPoint(
      baseline,
      [
        "upgrade-curve-baseline",
        "upgrade-curve-baseline-within-budget",
      ]
    ),

    status:
      "baseline",

    curveEligible:
      true,

    totalCost:
      round(
        cost.amount
      ),

    currency:
      cost.currency,

    budgetTotal:
      round(
        cost.budgetTotal
      ),

    withinBudget:
      true,

    budgetOverageAmount:
      0,

    budgetOverageRatio:
      0,

    priceDifferenceFromBaselineAmount:
      0,

    priceDifferenceFromBaselineRatio:
      0,

    utilityGain:
      0,

    comparableDimensionCodes,

    excludedDimensionCodes:
      BENEFIT_DIMENSIONS.filter(
        (dimension) =>
          !baseline.dimensions.has(
            dimension
          )
      ),

    confidenceFactor:
      round(
        Math.min(
          baseline.scoreConfidence,
          baseline.evidenceCoverage
        ),
        4
      ),

    adjustedBenefit:
      0,

    efficiencyPerBudgetPercent:
      null,

    costPerAdjustedBenefitPoint:
      null,

    efficientFrontier:
      true,
  };
}

function createUpgradePoint(
  candidate:
    NormalizedCandidate,
  baseline:
    NormalizedCandidate,
  options:
    ResolvedOptions
): SmartStayUpgradeCurvePointV2 {
  if (!candidate.baseEligible) {
    return createEmptyPoint(
      candidate,
      [
        "upgrade-candidate-not-eligible",
      ]
    );
  }

  if (!candidate.cost) {
    return createEmptyPoint(
      candidate,
      [
        "upgrade-comparable-cost-unavailable",
      ]
    );
  }

  const baselineCost =
    baseline.cost as ComparableCost;

  const baselineUtility =
    baseline.utilityScore as number;

  if (
    candidate.cost.currency !==
    baselineCost.currency
  ) {
    return createEmptyPoint(
      candidate,
      [
        "upgrade-currency-mismatch",
      ]
    );
  }

  if (
    Math.abs(
      candidate.cost.budgetTotal -
      baselineCost.budgetTotal
    ) > 0.02
  ) {
    return createEmptyPoint(
      candidate,
      [
        "upgrade-budget-context-mismatch",
      ]
    );
  }

  if (
    candidate.cost.withinBudget ||
    candidate.cost.overageRatio <= 0
  ) {
    return createEmptyPoint(
      candidate,
      [
        "upgrade-candidate-not-above-budget",
      ]
    );
  }

  if (
    candidate.cost.overageRatio >
    options.maximumBudgetOverageRatio
  ) {
    const point =
      createEmptyPoint(
        candidate,
        [
          "upgrade-budget-overage-excessive",
        ]
      );

    point.status =
      "not-justified";

    point.totalCost =
      round(
        candidate.cost.amount
      );

    point.currency =
      candidate.cost.currency;

    point.budgetTotal =
      round(
        candidate.cost.budgetTotal
      );

    point.withinBudget =
      false;

    point.budgetOverageAmount =
      round(
        candidate.cost.overageAmount
      );

    point.budgetOverageRatio =
      round(
        candidate.cost.overageRatio,
        4
      );

    point.priceDifferenceFromBaselineAmount =
      round(
        candidate.cost.amount -
        baselineCost.amount
      );

    point.priceDifferenceFromBaselineRatio =
      round(
        (
          candidate.cost.amount -
          baselineCost.amount
        ) /
        baselineCost.amount,
        4
      );

    return point;
  }

  const baselineDimensionCodes =
    uniqueSorted([
      ...baseline.dimensions.keys(),
    ]);

  const missingDimensionCodes =
    baselineDimensionCodes.filter(
      (dimension) =>
        !candidate.dimensions.has(
          dimension
        )
    );

  if (
    baselineDimensionCodes.length <
      options.minimumComparableDimensions ||
    missingDimensionCodes.length > 0
  ) {
    return createEmptyPoint(
      candidate,
      [
        baselineDimensionCodes.length <
          options.minimumComparableDimensions
          ? "upgrade-baseline-comparable-data-insufficient"
          : "upgrade-candidate-comparable-data-insufficient",
        ...missingDimensionCodes.map(
          (dimension) =>
            `upgrade-dimension-unavailable:${dimension}`
        ),
      ]
    );
  }

  const totalConfiguredWeight =
    baselineDimensionCodes.reduce(
      (
        total,
        dimension
      ) =>
        total +
        (
          baseline.dimensions.get(
            dimension
          )?.configuredWeight ??
          0
        ),
      0
    );

  if (
    totalConfiguredWeight <= 0
  ) {
    return createEmptyPoint(
      candidate,
      [
        "upgrade-dimension-weights-unavailable",
      ]
    );
  }

  const dimensionComparisons =
    baselineDimensionCodes.map(
      (
        dimension
      ): SmartStayUpgradeDimensionComparisonV2 => {
        const baselineDimension =
          baseline.dimensions.get(
            dimension
          ) as DimensionSignal;

        const candidateDimension =
          candidate.dimensions.get(
            dimension
          ) as DimensionSignal;

        const normalizedWeight =
          baselineDimension
            .configuredWeight /
          totalConfiguredWeight;

        return {
          dimension,

          baselineScore:
            round(
              baselineDimension.score
            ),

          candidateScore:
            round(
              candidateDimension.score
            ),

          gain:
            round(
              candidateDimension.score -
              baselineDimension.score
            ),

          baselineConfidence:
            round(
              baselineDimension.confidence,
              4
            ),

          candidateConfidence:
            round(
              candidateDimension.confidence,
              4
            ),

          normalizedWeight:
            round(
              normalizedWeight,
              6
            ),

          evidenceIds:
            uniqueSorted([
              ...baselineDimension
                .evidenceIds,
              ...candidateDimension
                .evidenceIds,
            ]),
        };
      }
    );

  const experienceGain =
    dimensionComparisons.reduce(
      (
        total,
        comparison
      ) =>
        total +
        comparison.gain *
        comparison.normalizedWeight,
      0
    );

  const grossExperienceGain =
    dimensionComparisons.reduce(
      (
        total,
        comparison
      ) =>
        total +
        Math.max(
          comparison.gain,
          0
        ) *
        comparison.normalizedWeight,
      0
    );

  const weightedExperienceLoss =
    dimensionComparisons.reduce(
      (
        total,
        comparison
      ) =>
        total +
        Math.max(
          -comparison.gain,
          0
        ) *
        comparison.normalizedWeight,
      0
    );

  const strongestGainComparison =
    dimensionComparisons
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          second.gain -
            first.gain ||
          compareStrings(
            first.dimension,
            second.dimension
          )
      )[0] ??
    null;

  const strongestLossComparison =
    dimensionComparisons
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          first.gain -
            second.gain ||
          compareStrings(
            first.dimension,
            second.dimension
          )
      )[0] ??
    null;

  const positiveDimensionCount =
    dimensionComparisons.filter(
      (comparison) =>
        comparison.gain > 0
    ).length;

  const negativeDimensionCount =
    dimensionComparisons.filter(
      (comparison) =>
        comparison.gain < 0
    ).length;

  const weightedPairConfidence =
    dimensionComparisons.reduce(
      (
        total,
        comparison
      ) =>
        total +
        Math.min(
          comparison.baselineConfidence,
          comparison.candidateConfidence
        ) *
        comparison.normalizedWeight,
      0
    );

  const confidenceFactor =
    Math.min(
      baseline.scoreConfidence,
      baseline.evidenceCoverage,
      candidate.scoreConfidence,
      candidate.evidenceCoverage,
      weightedPairConfidence
    );

  const adjustedBenefit =
    Math.max(
      experienceGain,
      0
    ) *
    confidenceFactor;

  const budgetOveragePercent =
    candidate.cost.overageRatio *
    100;

  const efficiencyPerBudgetPercent =
    budgetOveragePercent > 0
      ? adjustedBenefit /
        budgetOveragePercent
      : null;

  const costPerAdjustedBenefitPoint =
    adjustedBenefit > 0
      ? candidate.cost.overageAmount /
        adjustedBenefit
      : null;

  const utilityGain =
    (
      candidate.utilityScore as number
    ) -
    baselineUtility;

  const strongestGain =
    strongestGainComparison
      ? Math.max(
          strongestGainComparison.gain,
          0
        )
      : 0;

  const strongestLoss =
    strongestLossComparison
      ? Math.max(
          -strongestLossComparison.gain,
          0
        )
      : 0;

  const reasonCodes:
    string[] = [
      "upgrade-above-budget",
      "upgrade-same-currency-comparison",
      "upgrade-comparable-dimensions-verified",
    ];

  const meaningfulGain =
    experienceGain >=
      options.minimumExperienceGain ||
    strongestGain >=
      options.minimumStrongDimensionGain;

  const utilityLossWithinLimit =
    utilityGain >=
    -options.maximumUtilityLoss;

  const dimensionLossWithinLimit =
    strongestLoss <=
    options.maximumSingleDimensionLoss;

  const adjustedBenefitSufficient =
    adjustedBenefit >=
    options.minimumAdjustedBenefit;

  const efficiencySufficient =
    efficiencyPerBudgetPercent !== null &&
    efficiencyPerBudgetPercent >=
      options.minimumEfficiencyPerBudgetPercent;

  const paretoEligible =
    candidate.source.pareto.status ===
    "frontier";

  if (meaningfulGain) {
    reasonCodes.push(
      "upgrade-meaningful-experience-gain"
    );
  }
  else {
    reasonCodes.push(
      "upgrade-experience-gain-too-small"
    );
  }

  if (utilityLossWithinLimit) {
    reasonCodes.push(
      "upgrade-utility-loss-within-limit"
    );
  }
  else {
    reasonCodes.push(
      "upgrade-utility-loss-excessive"
    );
  }

  if (dimensionLossWithinLimit) {
    reasonCodes.push(
      "upgrade-dimension-loss-within-limit"
    );
  }
  else {
    reasonCodes.push(
      "upgrade-dimension-loss-excessive"
    );
  }

  if (adjustedBenefitSufficient) {
    reasonCodes.push(
      "upgrade-confidence-adjusted-benefit-sufficient"
    );
  }
  else {
    reasonCodes.push(
      "upgrade-confidence-adjusted-benefit-low"
    );
  }

  if (efficiencySufficient) {
    reasonCodes.push(
      "upgrade-cost-efficiency-sufficient"
    );
  }
  else {
    reasonCodes.push(
      "upgrade-cost-efficiency-low"
    );
  }

  if (!paretoEligible) {
    reasonCodes.push(
      candidate.source.pareto.status ===
        "dominated"
        ? "upgrade-pareto-dominated"
        : "upgrade-pareto-unverified"
    );
  }

  let status:
    SmartStayUpgradePointStatusV2;

  if (
    meaningfulGain &&
    utilityLossWithinLimit &&
    dimensionLossWithinLimit &&
    adjustedBenefitSufficient &&
    efficiencySufficient &&
    paretoEligible
  ) {
    status =
      "worthwhile";
  }
  else if (
    experienceGain > 0 &&
    utilityLossWithinLimit &&
    dimensionLossWithinLimit &&
    candidate.source.pareto.status !==
      "dominated"
  ) {
    status =
      "weak";
  }
  else {
    status =
      "not-justified";
  }

  return {
    hotelId:
      candidate.hotelId,

    status,

    curveEligible:
      true,

    paretoStatus:
      candidate.source.pareto.status,

    totalCost:
      round(
        candidate.cost.amount
      ),

    currency:
      candidate.cost.currency,

    budgetTotal:
      round(
        candidate.cost.budgetTotal
      ),

    withinBudget:
      false,

    budgetOverageAmount:
      round(
        candidate.cost.overageAmount
      ),

    budgetOverageRatio:
      round(
        candidate.cost.overageRatio,
        4
      ),

    priceDifferenceFromBaselineAmount:
      round(
        candidate.cost.amount -
        baselineCost.amount
      ),

    priceDifferenceFromBaselineRatio:
      round(
        (
          candidate.cost.amount -
          baselineCost.amount
        ) /
        baselineCost.amount,
        4
      ),

    utilityScore:
      round(
        candidate.utilityScore as number
      ),

    utilityGain:
      round(
        utilityGain
      ),

    scoreConfidence:
      round(
        candidate.scoreConfidence,
        4
      ),

    evidenceCoverage:
      round(
        candidate.evidenceCoverage,
        4
      ),

    riskScore:
      round(
        candidate.riskScore
      ),

    riskLevel:
      candidate.source.risk.level,

    comparableDimensionCodes:
      baselineDimensionCodes,

    excludedDimensionCodes:
      BENEFIT_DIMENSIONS.filter(
        (dimension) =>
          !baselineDimensionCodes.includes(
            dimension
          )
      ),

    dimensionComparisons,

    experienceGain:
      round(
        experienceGain,
        4
      ),

    grossExperienceGain:
      round(
        grossExperienceGain,
        4
      ),

    weightedExperienceLoss:
      round(
        weightedExperienceLoss,
        4
      ),

    strongestGainDimension:
      strongestGainComparison &&
      strongestGainComparison.gain > 0
        ? strongestGainComparison.dimension
        : null,

    strongestGain:
      round(
        strongestGain
      ),

    strongestLossDimension:
      strongestLossComparison &&
      strongestLossComparison.gain < 0
        ? strongestLossComparison.dimension
        : null,

    strongestLoss:
      round(
        strongestLoss
      ),

    positiveDimensionCount,

    negativeDimensionCount,

    confidenceFactor:
      round(
        confidenceFactor,
        4
      ),

    adjustedBenefit:
      round(
        adjustedBenefit,
        4
      ),

    efficiencyPerBudgetPercent:
      efficiencyPerBudgetPercent === null
        ? null
        : round(
            efficiencyPerBudgetPercent,
            4
          ),

    costPerAdjustedBenefitPoint:
      costPerAdjustedBenefitPoint === null
        ? null
        : round(
            costPerAdjustedBenefitPoint,
            4
          ),

    efficientFrontier:
      false,

    dominatedByHotelIds:
      [],

    marginalFromPreviousEfficientPoint:
      null,

    reasonCodes:
      uniqueSorted([
        ...candidate
          .exclusionReasonCodes,
        ...reasonCodes,
      ]),

    evidenceIds:
      uniqueSorted([
        ...candidate.source
          .utility.evidenceIds,
        ...candidate.source
          .priceValue.evidenceIds,
        ...candidate.source
          .risk.evidenceIds,
        ...dimensionComparisons.flatMap(
          (comparison) =>
            comparison.evidenceIds
        ),
        ...baseline.source
          .utility.evidenceIds,
        ...baseline.source
          .priceValue.evidenceIds,
      ]),
  };
}

function applyEfficientFrontier(
  points:
    SmartStayUpgradeCurvePointV2[]
) {
  const comparablePoints =
    points.filter(
      (point) =>
        (
          point.status === "worthwhile" ||
          point.status === "weak"
        ) &&
        point.paretoStatus === "frontier" &&
        point.budgetOverageRatio !== null &&
        point.adjustedBenefit !== null
    );

  for (
    const point
    of comparablePoints
  ) {
    const dominators =
      comparablePoints.filter(
        (other) => {
          if (
            other.hotelId ===
            point.hotelId ||
            other.budgetOverageRatio ===
              null ||
            other.adjustedBenefit ===
              null ||
            point.budgetOverageRatio ===
              null ||
            point.adjustedBenefit ===
              null
          ) {
            return false;
          }

          const noMoreExpensive =
            other.budgetOverageRatio <=
            point.budgetOverageRatio +
              0.000001;

          const noLessBenefit =
            other.adjustedBenefit >=
            point.adjustedBenefit -
              0.000001;

          const strictlyBetter =
            other.budgetOverageRatio <
              point.budgetOverageRatio -
                0.000001 ||
            other.adjustedBenefit >
              point.adjustedBenefit +
                0.000001;

          return (
            noMoreExpensive &&
            noLessBenefit &&
            strictlyBetter
          );
        }
      );

    point.dominatedByHotelIds =
      uniqueSorted(
        dominators.map(
          (dominator) =>
            dominator.hotelId
        )
      );

    point.efficientFrontier =
      dominators.length === 0;

    if (
      dominators.length > 0
    ) {
      point.reasonCodes =
        uniqueSorted([
          ...point.reasonCodes,
          "upgrade-dominated-on-curve",
        ]);

      if (
        point.status ===
        "worthwhile"
      ) {
        point.status =
          "not-justified";
      }
    }
    else {
      point.reasonCodes =
        uniqueSorted([
          ...point.reasonCodes,
          "upgrade-efficient-frontier",
        ]);
    }
  }
}

function applyMarginalEvaluations(
  baselinePoint:
    SmartStayUpgradeCurvePointV2,
  points:
    SmartStayUpgradeCurvePointV2[],
  options:
    ResolvedOptions
) {
  const efficientPoints =
    points
      .filter(
        (point) =>
          (
            point.status === "worthwhile" ||
            point.status === "weak"
          ) &&
          point.paretoStatus === "frontier" &&
          point.efficientFrontier &&
          point.totalCost !== null &&
          point.budgetOverageRatio !== null &&
          point.adjustedBenefit !== null
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            first.totalCost as number
          ) -
            (
              second.totalCost as number
            ) ||
          compareStrings(
            first.hotelId,
            second.hotelId
          )
      );

  let previousPoint =
    baselinePoint;

  let bestPreviousEfficiency =
    0;

  let diminishingReturnsStartHotelId:
    string | null = null;

  for (
    let index = 0;
    index < efficientPoints.length;
    index++
  ) {
    const point =
      efficientPoints[index];

    const incrementalCost =
      (
        point.totalCost as number
      ) -
      (
        previousPoint.totalCost as number
      );

    const incrementalBudgetOverageRatio =
      (
        point.budgetOverageRatio as number
      ) -
      (
        previousPoint.budgetOverageRatio ??
        0
      );

    const incrementalAdjustedBenefit =
      (
        point.adjustedBenefit as number
      ) -
      (
        previousPoint.adjustedBenefit ??
        0
      );

    const marginalBenefitPerBudgetPercent =
      incrementalBudgetOverageRatio > 0
        ? incrementalAdjustedBenefit /
          (
            incrementalBudgetOverageRatio *
            100
          )
        : null;

    const marginalBenefitPer100Currency =
      incrementalCost > 0
        ? incrementalAdjustedBenefit /
          incrementalCost *
          100
        : null;

    point.marginalFromPreviousEfficientPoint = {
      previousHotelId:
        previousPoint.hotelId,

      incrementalCost:
        round(
          incrementalCost
        ),

      incrementalBudgetOverageRatio:
        round(
          incrementalBudgetOverageRatio,
          4
        ),

      incrementalAdjustedBenefit:
        round(
          incrementalAdjustedBenefit,
          4
        ),

      marginalBenefitPerBudgetPercent:
        marginalBenefitPerBudgetPercent ===
          null
          ? null
          : round(
              marginalBenefitPerBudgetPercent,
              4
            ),

      marginalBenefitPer100Currency:
        marginalBenefitPer100Currency ===
          null
          ? null
          : round(
              marginalBenefitPer100Currency,
              4
            ),
    };

    if (
      index > 0 &&
      diminishingReturnsStartHotelId ===
        null &&
      marginalBenefitPerBudgetPercent !==
        null &&
      (
        marginalBenefitPerBudgetPercent <
          options.minimumDiminishingReturnEfficiency ||
        (
          bestPreviousEfficiency > 0 &&
          marginalBenefitPerBudgetPercent <
            bestPreviousEfficiency *
            options.diminishingReturnRelativeDrop
        )
      )
    ) {
      diminishingReturnsStartHotelId =
        point.hotelId;

      point.reasonCodes =
        uniqueSorted([
          ...point.reasonCodes,
          "upgrade-diminishing-returns-start",
        ]);
    }

    if (
      marginalBenefitPerBudgetPercent !==
        null
    ) {
      bestPreviousEfficiency =
        Math.max(
          bestPreviousEfficiency,
          marginalBenefitPerBudgetPercent
        );
    }

    previousPoint =
      point;
  }

  return {
    efficientPoints,
    diminishingReturnsStartHotelId,
  };
}

export function evaluateSmartUpgradeCurveV2(
  input:
    SmartStayUpgradeCurveInputV2,
  options:
    SmartStayUpgradeCurveOptionsV2 = {}
): SmartStayUpgradeCurveEvaluationV2 {
  if (
    typeof input.baselineHotelId !==
      "string" ||
    !input.baselineHotelId.trim()
  ) {
    throw new Error(
      "Smart Upgrade Curve requires a baselineHotelId."
    );
  }

  const resolvedOptions =
    resolveOptions(
      options
    );

  const normalizedCandidates =
    input.candidates
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
      "Smart Upgrade Curve received duplicate hotelIds."
    );
  }

  const baselineHotelId =
    input.baselineHotelId.trim();

  const baseline =
    normalizedCandidates.find(
      (candidate) =>
        candidate.hotelId ===
        baselineHotelId
    ) ??
    null;

  if (!baseline) {
    throw new Error(
      "Smart Upgrade Curve baseline candidate was not found."
    );
  }

  if (
    normalizedCandidates.length > 1
  ) {
    const preferenceSignature =
      createPreferenceSignature(
        baseline.source.utility
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
          "Smart Upgrade Curve candidates must use the same utility preference and weights."
        );
      }
    }
  }

  if (
    !baseline.baseEligible ||
    !baseline.cost ||
    baseline.cost.withinBudget !==
      true ||
    baseline.cost.amount >
      baseline.cost.budgetTotal ||
    baseline.dimensions.size <
      resolvedOptions.minimumComparableDimensions
  ) {
    throw new Error(
      "Smart Upgrade Curve baseline must be an eligible, verified within-budget candidate with sufficient comparable dimensions."
    );
  }

  const baselinePoint =
    createBaselinePoint(
      baseline
    );

  const points = [
    baselinePoint,
    ...normalizedCandidates
      .filter(
        (candidate) =>
          candidate.hotelId !==
          baseline.hotelId
      )
      .map(
        (candidate) =>
          createUpgradePoint(
            candidate,
            baseline,
            resolvedOptions
          )
      ),
  ];

  applyEfficientFrontier(
    points
  );

  const {
    efficientPoints,
    diminishingReturnsStartHotelId,
  } = applyMarginalEvaluations(
    baselinePoint,
    points,
    resolvedOptions
  );

  points.sort(
    (
      first,
      second
    ) => {
      if (
        first.status ===
        "baseline"
      ) {
        return -1;
      }

      if (
        second.status ===
        "baseline"
      ) {
        return 1;
      }

      return (
        (
          first.totalCost ??
          Number.POSITIVE_INFINITY
        ) -
          (
            second.totalCost ??
            Number.POSITIVE_INFINITY
          ) ||
        compareStrings(
          first.hotelId,
          second.hotelId
        )
      );
    }
  );

  const worthwhilePoints =
    points
      .filter(
        (point) =>
          point.status ===
          "worthwhile" &&
          point.efficientFrontier
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            second.efficiencyPerBudgetPercent ??
            -1
          ) -
            (
              first.efficiencyPerBudgetPercent ??
              -1
            ) ||
          (
            second.adjustedBenefit ??
            -1
          ) -
            (
              first.adjustedBenefit ??
              -1
            ) ||
          (
            first.budgetOverageRatio ??
            Number.POSITIVE_INFINITY
          ) -
            (
              second.budgetOverageRatio ??
              Number.POSITIVE_INFINITY
            ) ||
          compareStrings(
            first.hotelId,
            second.hotelId
          )
      );

  const maximumBenefitPoint =
    worthwhilePoints
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          (
            second.adjustedBenefit ??
            -1
          ) -
            (
              first.adjustedBenefit ??
              -1
            ) ||
          (
            first.budgetOverageRatio ??
            Number.POSITIVE_INFINITY
          ) -
            (
              second.budgetOverageRatio ??
              Number.POSITIVE_INFINITY
            ) ||
          compareStrings(
            first.hotelId,
            second.hotelId
          )
      )[0] ??
    null;

  const comparableUpgradePoints =
    points.filter(
      (point) =>
        point.status !== "baseline" &&
        point.status !== "excluded"
    );

  const strongData =
    baseline.scoreConfidence >=
      0.8 &&
    baseline.evidenceCoverage >=
      0.8 &&
    comparableUpgradePoints.length > 0 &&
    comparableUpgradePoints.every(
      (point) =>
        point.confidenceFactor >=
        0.75
    );

  const reasonCodes:
    string[] = [
      "upgrade-curve-baseline-fixed-by-recommendation",
      "upgrade-curve-price-is-independent-axis",
      "upgrade-curve-benefit-excludes-price-value",
      "upgrade-curve-same-currency-only",
    ];

  if (
    worthwhilePoints.length === 0
  ) {
    reasonCodes.push(
      "upgrade-curve-no-worthwhile-upgrade"
    );
  }
  else {
    reasonCodes.push(
      "upgrade-curve-worthwhile-upgrade-available"
    );
  }

  if (
    diminishingReturnsStartHotelId
  ) {
    reasonCodes.push(
      "upgrade-curve-diminishing-returns-detected"
    );
  }

  return {
    status:
      comparableUpgradePoints.length ===
      0
        ? "unavailable"
        : strongData
          ? "strong-data"
          : "usable",

    baselineHotelId:
      baseline.hotelId,

    budgetTotal:
      round(
        baseline.cost.budgetTotal
      ),

    currency:
      baseline.cost.currency,

    benefitDimensionCodes:
      [
        ...BENEFIT_DIMENSIONS,
      ],

    points,

    efficientFrontierHotelIds:
      efficientPoints.map(
        (point) =>
          point.hotelId
      ),

    worthwhileUpgradeHotelIds:
      worthwhilePoints.map(
        (point) =>
          point.hotelId
      ),

    bestValueUpgradeHotelId:
      worthwhilePoints[0]
        ?.hotelId ??
      null,

    maximumBenefitUpgradeHotelId:
      maximumBenefitPoint
        ?.hotelId ??
      null,

    diminishingReturnsStartHotelId,

    excludedHotelIds:
      points
        .filter(
          (point) =>
            point.status ===
            "excluded"
        )
        .map(
          (point) =>
            point.hotelId
        )
        .sort(
          compareStrings
        ),

    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),
  };
}
