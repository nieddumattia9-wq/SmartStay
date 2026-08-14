import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import {
  SMARTSTAY_BLIND_EVALUATION_SCHEMA_VERSION_V3,
  SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3,
  SMARTSTAY_GOLDEN_DATASET_SCHEMA_VERSION_V3,
} from "../contract/versionsV3";

export type StayOptiGoldenCaseTypeV3 =
  | "baseline"
  | "adversarial"
  | "counterfactual";

export type StayOptiEvaluationProfileV3 =
  | "maximum-comfort"
  | "comfort"
  | "balanced"
  | "savings"
  | "maximum-savings";

export type StayOptiEvaluationDestinationV3 =
  | "urban"
  | "resort"
  | "rural"
  | "airport"
  | "mixed";

export type StayOptiEvaluationLeadTimeV3 =
  | "same-week"
  | "short"
  | "medium"
  | "long"
  | "very-long";

export type StayOptiEvaluationDurationV3 =
  | "one-night"
  | "short-stay"
  | "medium-stay"
  | "long-stay"
  | "extended-stay";

export type StayOptiEvaluationCoverageV3 =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type StayOptiCriticalRegressionCodeV3 =
  | "commercial-influence"
  | "hard-constraint-violation"
  | "non-deterministic-decision"
  | "pii-in-trace"
  | "price-integrity"
  | "privacy-violation"
  | "public-rate-integrity"
  | "unsafe-recommendation";

export interface StayOptiEvaluationSegmentV3 {
  profile: StayOptiEvaluationProfileV3;
  destination: StayOptiEvaluationDestinationV3;
  leadTime: StayOptiEvaluationLeadTimeV3;
  duration: StayOptiEvaluationDurationV3;
  coverage: StayOptiEvaluationCoverageV3;
}

export interface StayOptiEngineCaseObservationV3 {
  abstained: boolean;
  predictedConfidence: number;
  decisionCorrect: boolean;
  realizedUtility: number;
  selectedQuality: number;
  selectedCost: number;
}

export interface StayOptiGoldenCaseInputV3 {
  caseId: string;
  caseType: StayOptiGoldenCaseTypeV3;
  segment: StayOptiEvaluationSegmentV3;
  currency: string;
  oracleUtility: number;
  shouldAbstain: boolean;
  v2: StayOptiEngineCaseObservationV3;
  v3: StayOptiEngineCaseObservationV3;
  v3StableUnderPerturbation: boolean;
  providerNeutralReplay: "stable" | "changed" | "unavailable";
  criticalRegressions: StayOptiCriticalRegressionCodeV3[];
}

export interface StayOptiGoldenDatasetV3 {
  schemaVersion: typeof SMARTSTAY_GOLDEN_DATASET_SCHEMA_VERSION_V3;
  evaluationApplication: "offline-only";
  commerciallyNeutral: true;
  piiAllowed: false;
  cases: StayOptiGoldenCaseInputV3[];
  counts: {
    total: number;
    baseline: number;
    adversarial: number;
    counterfactual: number;
  };
  fingerprint: string;
}

export type StayOptiBlindEvaluatorTypeV3 =
  | "human"
  | "expert";

export type StayOptiBlindEngineLabelV3 =
  | "v2"
  | "v3";

export interface StayOptiBlindJudgmentInputV3 {
  judgmentId: string;
  caseId: string;
  evaluatorToken: string;
  evaluatorType: StayOptiBlindEvaluatorTypeV3;
  blinded: true;
  leftEngine: StayOptiBlindEngineLabelV3;
  rightEngine: StayOptiBlindEngineLabelV3;
  winner: "left" | "right" | "tie";
}

export interface StayOptiBlindEvaluationSetV3 {
  schemaVersion: typeof SMARTSTAY_BLIND_EVALUATION_SCHEMA_VERSION_V3;
  evaluationApplication: "offline-only";
  labelsRandomized: true;
  evaluatorPiiAllowed: false;
  judgments: StayOptiBlindJudgmentInputV3[];
  counts: {
    total: number;
    human: number;
    expert: number;
  };
  fingerprint: string;
}

export interface StayOptiEvaluationThresholdsV3 {
  minimumGoldenCaseCount: number;
  minimumAdversarialCaseCount: number;
  minimumCounterfactualCaseCount: number;
  minimumHumanJudgmentCount: number;
  minimumExpertJudgmentCount: number;
  minimumAbstentionDecisionCount: number;
  minimumProviderNeutralReplayCount: number;
  minimumCasesPerSegmentGroup: number;
  maximumNormalizedRegretV3: number;
  minimumNormalizedRegretImprovement: number;
  minimumBlindPairwiseWinRateV3: number;
  maximumCalibrationErrorV3: number;
  maximumCalibrationRegression: number;
  minimumAbstentionPrecision: number;
  minimumRobustChoiceRate: number;
  maximumInstabilityRate: number;
  maximumFairnessGap: number;
  maximumProviderDependenceGap: number;
  maximumCriticalRegressionCount: number;
  qualityLossTolerance: number;
}

export interface StayOptiEvaluationCalibrationPlanV3 {
  evaluationId: string;
  version: typeof SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3;
  phase: "v3-10";
  evaluationApplication: "offline-protocol-only";
  rankingApplication: "shadow-only";
  publicPresentation: "disabled";
  sourceDecisionInputFingerprint: string;
  thresholdFreeze: {
    status: "frozen-before-results";
    resultsObserved: false;
    thresholds: StayOptiEvaluationThresholdsV3;
    thresholdFingerprint: string;
  };
  datasetPolicy: {
    schemaVersion: typeof SMARTSTAY_GOLDEN_DATASET_SCHEMA_VERSION_V3;
    requiredCaseTypes: StayOptiGoldenCaseTypeV3[];
    requiredSegmentDimensions: Array<keyof StayOptiEvaluationSegmentV3>;
    adversarialCasesRequired: true;
    counterfactualCasesRequired: true;
    commerciallyNeutral: true;
    piiAllowed: false;
  };
  blindEvaluationPolicy: {
    schemaVersion: typeof SMARTSTAY_BLIND_EVALUATION_SCHEMA_VERSION_V3;
    humanEvaluationRequired: true;
    expertEvaluationRequired: true;
    labelsRandomized: true;
    evaluatorPiiAllowed: false;
  };
  promotionPolicy: {
    productionSelfModificationAllowed: false;
    automaticProductionPromotionAllowed: false;
    publicV3Enabled: false;
    nextEligibleGate: "v3-11-shadow";
    publicRatesGateRemainsExternal: true;
  };
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiMetricValueV3 {
  count: number;
  value: number | null;
}

export interface StayOptiRegretMetricsV3 {
  v2: StayOptiMetricValueV3;
  v3: StayOptiMetricValueV3;
  improvementV3OverV2: number | null;
}

export interface StayOptiPairwiseMetricsV3 {
  human: StayOptiPairwiseGroupV3;
  expert: StayOptiPairwiseGroupV3;
  combined: StayOptiPairwiseGroupV3;
}

export interface StayOptiPairwiseGroupV3 {
  judgmentCount: number;
  v2Wins: number;
  v3Wins: number;
  ties: number;
  v3EffectiveWinRate: number | null;
}

export interface StayOptiCalibrationMetricsV3 {
  binCount: 10;
  v2ExpectedCalibrationError: number | null;
  v3ExpectedCalibrationError: number | null;
  regressionV3MinusV2: number | null;
}

export interface StayOptiAbstentionMetricsV3 {
  decisionCount: number;
  appropriateCount: number;
  precision: number | null;
  coverage: number | null;
  missedNecessaryAbstentionCount: number;
}

export interface StayOptiStabilityMetricsV3 {
  caseCount: number;
  stableChoiceCount: number;
  robustChoiceRate: number | null;
  instabilityRate: number | null;
}

export type StayOptiSegmentDimensionV3 =
  | "profile"
  | "destination"
  | "leadTime"
  | "duration"
  | "coverage";

export interface StayOptiSegmentMetricGroupV3 {
  value: string;
  caseCount: number;
  v2NormalizedRegret: number;
  v3NormalizedRegret: number;
  regretImprovementV3OverV2: number;
  v3CorrectRate: number;
}

export interface StayOptiSegmentReportV3 {
  dimension: StayOptiSegmentDimensionV3;
  groups: StayOptiSegmentMetricGroupV3[];
  eligibleGroupCount: number;
  maximumV3RegretGap: number | null;
  sufficient: boolean;
}

export interface StayOptiFairnessMetricsV3 {
  maximumObservedSegmentRegretGap: number | null;
  allRequiredSegmentsSufficient: boolean;
}

export interface StayOptiProviderDependenceMetricsV3 {
  replayCount: number;
  stableCount: number;
  changedCount: number;
  unavailableCount: number;
  dependenceGap: number | null;
}

export interface StayOptiMonetaryValueMetricsV3 {
  currency: string;
  qualityPreservingSavingCaseCount: number;
  totalMoneySavedWithoutQualityLoss: number;
  averageMoneySavedWithoutQualityLoss: number | null;
  qualityUpgradeCaseCount: number;
  totalExtraCostForQualityGain: number;
  totalQualityGain: number;
  qualityGainedPerExtraCurrencyUnit: number | null;
}

export type StayOptiEvaluationGateStatusV3 =
  | "pass"
  | "fail"
  | "insufficient-data";

export interface StayOptiEvaluationGateV3 {
  gateId: string;
  status: StayOptiEvaluationGateStatusV3;
  actual: number | null;
  comparator: ">=" | "<=";
  threshold: number;
}

export interface StayOptiEvaluationCalibrationResultV3 {
  evaluationId: string;
  version: typeof SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3;
  phase: "v3-10";
  evaluationApplication: "offline-only";
  status: StayOptiEvaluationGateStatusV3;
  protocolFingerprint: string;
  thresholdFingerprint: string;
  datasetFingerprint: string;
  blindEvaluationFingerprint: string;
  thresholdsFrozenBeforeResults: true;
  metrics: {
    regret: StayOptiRegretMetricsV3;
    pairwise: StayOptiPairwiseMetricsV3;
    calibration: StayOptiCalibrationMetricsV3;
    abstention: StayOptiAbstentionMetricsV3;
    stability: StayOptiStabilityMetricsV3;
    fairness: StayOptiFairnessMetricsV3;
    providerDependence: StayOptiProviderDependenceMetricsV3;
    monetaryValueByCurrency: StayOptiMonetaryValueMetricsV3[];
    criticalRegressionCount: number;
  };
  segmentReports: StayOptiSegmentReportV3[];
  gates: StayOptiEvaluationGateV3[];
  candidatePolicy: {
    state:
      | "not-eligible"
      | "eligible-for-v3-11-shadow-gate";
    productionPromotionAllowed: false;
    automaticPromotionAllowed: false;
    publicV3Enabled: false;
    nextGate: "v3-11-shadow";
  };
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiEvaluationValidationV3 {
  valid: boolean;
  issues: Array<
    | "invalid-shape"
    | "fingerprint-mismatch"
    | "deterministic-replay-mismatch"
  >;
}

const FROZEN_THRESHOLDS: StayOptiEvaluationThresholdsV3 = {
  minimumGoldenCaseCount: 200,
  minimumAdversarialCaseCount: 40,
  minimumCounterfactualCaseCount: 40,
  minimumHumanJudgmentCount: 300,
  minimumExpertJudgmentCount: 100,
  minimumAbstentionDecisionCount: 20,
  minimumProviderNeutralReplayCount: 100,
  minimumCasesPerSegmentGroup: 10,
  maximumNormalizedRegretV3: 0.2,
  minimumNormalizedRegretImprovement: 0.02,
  minimumBlindPairwiseWinRateV3: 0.55,
  maximumCalibrationErrorV3: 0.1,
  maximumCalibrationRegression: 0,
  minimumAbstentionPrecision: 0.8,
  minimumRobustChoiceRate: 0.8,
  maximumInstabilityRate: 0.1,
  maximumFairnessGap: 0.1,
  maximumProviderDependenceGap: 0.05,
  maximumCriticalRegressionCount: 0,
  qualityLossTolerance: 0.02,
};

const SEGMENT_DIMENSIONS: StayOptiSegmentDimensionV3[] = [
  "profile",
  "destination",
  "leadTime",
  "duration",
  "coverage",
];

const CASE_TYPES: StayOptiGoldenCaseTypeV3[] = [
  "baseline",
  "adversarial",
  "counterfactual",
];

const PROFILE_VALUES = new Set<string>([
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
]);

const DESTINATION_VALUES = new Set<string>([
  "urban",
  "resort",
  "rural",
  "airport",
  "mixed",
]);

const LEAD_TIME_VALUES = new Set<string>([
  "same-week",
  "short",
  "medium",
  "long",
  "very-long",
]);

const DURATION_VALUES = new Set<string>([
  "one-night",
  "short-stay",
  "medium-stay",
  "long-stay",
  "extended-stay",
]);

const COVERAGE_VALUES = new Set<string>([
  "high",
  "medium",
  "low",
  "unknown",
]);

const CRITICAL_REGRESSION_CODES = new Set<StayOptiCriticalRegressionCodeV3>([
  "commercial-influence",
  "hard-constraint-violation",
  "non-deterministic-decision",
  "pii-in-trace",
  "price-integrity",
  "privacy-violation",
  "public-rate-integrity",
  "unsafe-recommendation",
]);

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: readonly number[]) {
  return values.length === 0
    ? null
    : round(values.reduce((total, value) => total + value, 0) / values.length);
}

function requireUnitInterval(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(`${label} must be in the inclusive range 0..1.`);
  }

  return value;
}

function requireNonNegative(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }

  return value;
}

function requireOpaqueToken(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value)
  ) {
    throw new Error(`${label} must be an opaque token.`);
  }

  return value;
}

function requireExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string
) {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} contains unexpected fields: ${unexpected.sort().join(", ")}.`);
  }
}

function findForbiddenFieldPaths(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenFieldPaths(item, `${path}.${index}`)
    );
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  const forbidden = /^(email|phone|fullName|firstName|lastName|booking(Id|Ref|Reference)|provider(Id|Name|Code)|commission|affiliate|revenue|margin)$/i;
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => [
      ...(forbidden.test(key) ? [`${path}.${key}`] : []),
      ...findForbiddenFieldPaths(child, `${path}.${key}`),
    ]
  );
}

function validateObservation(
  observation: StayOptiEngineCaseObservationV3,
  label: string
) {
  requireExactKeys(
    observation as unknown as Record<string, unknown>,
    [
      "abstained",
      "predictedConfidence",
      "decisionCorrect",
      "realizedUtility",
      "selectedQuality",
      "selectedCost",
    ],
    label
  );

  if (
    typeof observation.abstained !== "boolean" ||
    typeof observation.decisionCorrect !== "boolean"
  ) {
    throw new Error(`${label} requires boolean decision fields.`);
  }

  requireUnitInterval(observation.predictedConfidence, `${label}.predictedConfidence`);
  requireUnitInterval(observation.realizedUtility, `${label}.realizedUtility`);
  requireUnitInterval(observation.selectedQuality, `${label}.selectedQuality`);
  requireNonNegative(observation.selectedCost, `${label}.selectedCost`);
}

function validateGoldenCase(input: StayOptiGoldenCaseInputV3) {
  if (findForbiddenFieldPaths(input).length > 0) {
    throw new Error("Golden case contains PII, booking, provider or commercial fields.");
  }

  requireExactKeys(
    input as unknown as Record<string, unknown>,
    [
      "caseId",
      "caseType",
      "segment",
      "currency",
      "oracleUtility",
      "shouldAbstain",
      "v2",
      "v3",
      "v3StableUnderPerturbation",
      "providerNeutralReplay",
      "criticalRegressions",
    ],
    "Golden case"
  );

  requireExactKeys(
    input.segment as unknown as Record<string, unknown>,
    ["profile", "destination", "leadTime", "duration", "coverage"],
    "Golden case segment"
  );

  requireOpaqueToken(input.caseId, "caseId");

  if (!CASE_TYPES.includes(input.caseType)) {
    throw new Error("Golden case type is invalid.");
  }

  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("Golden cases require an ISO-style three-letter currency code.");
  }

  if (
    !PROFILE_VALUES.has(input.segment.profile) ||
    !DESTINATION_VALUES.has(input.segment.destination) ||
    !LEAD_TIME_VALUES.has(input.segment.leadTime) ||
    !DURATION_VALUES.has(input.segment.duration) ||
    !COVERAGE_VALUES.has(input.segment.coverage)
  ) {
    throw new Error("Golden case segment contains an unknown closed value.");
  }

  requireUnitInterval(input.oracleUtility, "oracleUtility");
  validateObservation(input.v2, "v2");
  validateObservation(input.v3, "v3");

  if (
    input.v2.realizedUtility > input.oracleUtility + 0.000001 ||
    input.v3.realizedUtility > input.oracleUtility + 0.000001
  ) {
    throw new Error("Realized utility cannot exceed the frozen case oracle utility.");
  }

  if (
    typeof input.shouldAbstain !== "boolean" ||
    typeof input.v3StableUnderPerturbation !== "boolean" ||
    !["stable", "changed", "unavailable"].includes(input.providerNeutralReplay)
  ) {
    throw new Error("Golden case safety labels are invalid.");
  }

  if (
    input.criticalRegressions.some(
      (code) => !CRITICAL_REGRESSION_CODES.has(code)
    )
  ) {
    throw new Error("Golden case contains an unknown critical regression code.");
  }

}

function createGoldenDatasetFingerprint(
  dataset: Omit<StayOptiGoldenDatasetV3, "fingerprint">
) {
  return createStableHashV3(dataset, "stayopti-v3-golden-dataset");
}

export function createGoldenDatasetV3(
  caseInputs: readonly StayOptiGoldenCaseInputV3[]
): StayOptiGoldenDatasetV3 {
  caseInputs.forEach(validateGoldenCase);

  const cases = caseInputs
    .map((input) => ({
      ...input,
      segment: { ...input.segment },
      v2: { ...input.v2 },
      v3: { ...input.v3 },
      criticalRegressions: [...new Set(input.criticalRegressions)].sort(),
    }))
    .sort((first, second) => first.caseId.localeCompare(second.caseId));

  if (new Set(cases.map((item) => item.caseId)).size !== cases.length) {
    throw new Error("Golden dataset case IDs must be unique.");
  }

  const withoutFingerprint: Omit<StayOptiGoldenDatasetV3, "fingerprint"> = {
    schemaVersion: SMARTSTAY_GOLDEN_DATASET_SCHEMA_VERSION_V3,
    evaluationApplication: "offline-only",
    commerciallyNeutral: true,
    piiAllowed: false,
    cases,
    counts: {
      total: cases.length,
      baseline: cases.filter((item) => item.caseType === "baseline").length,
      adversarial: cases.filter((item) => item.caseType === "adversarial").length,
      counterfactual: cases.filter((item) => item.caseType === "counterfactual").length,
    },
  };

  return {
    ...withoutFingerprint,
    fingerprint: createGoldenDatasetFingerprint(withoutFingerprint),
  };
}

export function validateGoldenDatasetV3(
  dataset: StayOptiGoldenDatasetV3
): StayOptiEvaluationValidationV3 {
  const issues: StayOptiEvaluationValidationV3["issues"] = [];

  if (
    dataset.schemaVersion !== SMARTSTAY_GOLDEN_DATASET_SCHEMA_VERSION_V3 ||
    dataset.evaluationApplication !== "offline-only" ||
    dataset.commerciallyNeutral !== true ||
    dataset.piiAllowed !== false
  ) {
    issues.push("invalid-shape");
  }

  const { fingerprint, ...withoutFingerprint } = dataset;
  if (fingerprint !== createGoldenDatasetFingerprint(withoutFingerprint)) {
    issues.push("fingerprint-mismatch");
  }

  try {
    const replay = createGoldenDatasetV3(dataset.cases);
    if (stableSerializeV3(replay) !== stableSerializeV3(dataset)) {
      issues.push("deterministic-replay-mismatch");
    }
  }
  catch {
    issues.push("invalid-shape");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

function validateBlindJudgment(judgment: StayOptiBlindJudgmentInputV3) {
  if (findForbiddenFieldPaths(judgment).length > 0) {
    throw new Error("Blind judgment contains evaluator PII or commercial fields.");
  }

  requireExactKeys(
    judgment as unknown as Record<string, unknown>,
    [
      "judgmentId",
      "caseId",
      "evaluatorToken",
      "evaluatorType",
      "blinded",
      "leftEngine",
      "rightEngine",
      "winner",
    ],
    "Blind judgment"
  );

  requireOpaqueToken(judgment.judgmentId, "judgmentId");
  requireOpaqueToken(judgment.caseId, "caseId");
  requireOpaqueToken(judgment.evaluatorToken, "evaluatorToken");

  if (
    !["human", "expert"].includes(judgment.evaluatorType) ||
    judgment.blinded !== true ||
    !["v2", "v3"].includes(judgment.leftEngine) ||
    !["v2", "v3"].includes(judgment.rightEngine) ||
    judgment.leftEngine === judgment.rightEngine ||
    !["left", "right", "tie"].includes(judgment.winner)
  ) {
    throw new Error("Blind judgment shape is invalid.");
  }

}

function createBlindEvaluationFingerprint(
  evaluation: Omit<StayOptiBlindEvaluationSetV3, "fingerprint">
) {
  return createStableHashV3(evaluation, "stayopti-v3-blind-evaluation");
}

export function createBlindEvaluationSetV3(
  judgmentInputs: readonly StayOptiBlindJudgmentInputV3[]
): StayOptiBlindEvaluationSetV3 {
  judgmentInputs.forEach(validateBlindJudgment);

  const judgments = judgmentInputs
    .map((judgment) => ({ ...judgment }))
    .sort((first, second) => first.judgmentId.localeCompare(second.judgmentId));

  if (
    new Set(judgments.map((item) => item.judgmentId)).size !== judgments.length
  ) {
    throw new Error("Blind judgment IDs must be unique.");
  }

  const withoutFingerprint: Omit<StayOptiBlindEvaluationSetV3, "fingerprint"> = {
    schemaVersion: SMARTSTAY_BLIND_EVALUATION_SCHEMA_VERSION_V3,
    evaluationApplication: "offline-only",
    labelsRandomized: true,
    evaluatorPiiAllowed: false,
    judgments,
    counts: {
      total: judgments.length,
      human: judgments.filter((item) => item.evaluatorType === "human").length,
      expert: judgments.filter((item) => item.evaluatorType === "expert").length,
    },
  };

  return {
    ...withoutFingerprint,
    fingerprint: createBlindEvaluationFingerprint(withoutFingerprint),
  };
}

export function validateBlindEvaluationSetV3(
  evaluation: StayOptiBlindEvaluationSetV3
): StayOptiEvaluationValidationV3 {
  const issues: StayOptiEvaluationValidationV3["issues"] = [];

  if (
    evaluation.schemaVersion !== SMARTSTAY_BLIND_EVALUATION_SCHEMA_VERSION_V3 ||
    evaluation.evaluationApplication !== "offline-only" ||
    evaluation.labelsRandomized !== true ||
    evaluation.evaluatorPiiAllowed !== false
  ) {
    issues.push("invalid-shape");
  }

  const { fingerprint, ...withoutFingerprint } = evaluation;
  if (fingerprint !== createBlindEvaluationFingerprint(withoutFingerprint)) {
    issues.push("fingerprint-mismatch");
  }

  try {
    const replay = createBlindEvaluationSetV3(evaluation.judgments);
    if (stableSerializeV3(replay) !== stableSerializeV3(evaluation)) {
      issues.push("deterministic-replay-mismatch");
    }
  }
  catch {
    issues.push("invalid-shape");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

function createThresholdFingerprint(thresholds: StayOptiEvaluationThresholdsV3) {
  return createStableHashV3(thresholds, "stayopti-v3-evaluation-thresholds");
}

function createPlanFingerprint(
  plan: Omit<StayOptiEvaluationCalibrationPlanV3, "fingerprint">
) {
  return createStableHashV3(plan, "stayopti-v3-evaluation-calibration-plan");
}

export function createEvaluationCalibrationPlanV3(input: {
  sourceDecisionInputFingerprint: string;
}): StayOptiEvaluationCalibrationPlanV3 {
  if (!isStableHashV3(input.sourceDecisionInputFingerprint)) {
    throw new Error("V3-10 requires a stable source decision input fingerprint.");
  }

  const thresholds = { ...FROZEN_THRESHOLDS };
  const planCore = {
    version: SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3,
    phase: "v3-10" as const,
    evaluationApplication: "offline-protocol-only" as const,
    rankingApplication: "shadow-only" as const,
    publicPresentation: "disabled" as const,
    sourceDecisionInputFingerprint: input.sourceDecisionInputFingerprint,
    thresholdFreeze: {
      status: "frozen-before-results" as const,
      resultsObserved: false as const,
      thresholds,
      thresholdFingerprint: createThresholdFingerprint(thresholds),
    },
    datasetPolicy: {
      schemaVersion: SMARTSTAY_GOLDEN_DATASET_SCHEMA_VERSION_V3,
      requiredCaseTypes: [...CASE_TYPES],
      requiredSegmentDimensions: [...SEGMENT_DIMENSIONS],
      adversarialCasesRequired: true as const,
      counterfactualCasesRequired: true as const,
      commerciallyNeutral: true as const,
      piiAllowed: false as const,
    },
    blindEvaluationPolicy: {
      schemaVersion: SMARTSTAY_BLIND_EVALUATION_SCHEMA_VERSION_V3,
      humanEvaluationRequired: true as const,
      expertEvaluationRequired: true as const,
      labelsRandomized: true as const,
      evaluatorPiiAllowed: false as const,
    },
    promotionPolicy: {
      productionSelfModificationAllowed: false as const,
      automaticProductionPromotionAllowed: false as const,
      publicV3Enabled: false as const,
      nextEligibleGate: "v3-11-shadow" as const,
      publicRatesGateRemainsExternal: true as const,
    },
    reasonCodes: uniqueReasonCodesV3([
      "evaluation:thresholds-frozen",
      "evaluation:results-not-observed",
      "evaluation:golden-dataset-required",
      "evaluation:adversarial-required",
      "evaluation:counterfactual-required",
      "evaluation:blind-human-required",
      "evaluation:blind-expert-required",
      "evaluation:offline-only",
      "evaluation:commercially-neutral",
      "evaluation:no-production-self-promotion",
      "evaluation:shadow-promotion-required",
    ]),
  };

  const withoutFingerprint: Omit<
    StayOptiEvaluationCalibrationPlanV3,
    "fingerprint"
  > = {
    evaluationId: createStableHashV3(
      planCore,
      "stayopti-v3-evaluation-calibration-plan-id"
    ),
    ...planCore,
  };

  const plan: StayOptiEvaluationCalibrationPlanV3 = {
    ...withoutFingerprint,
    fingerprint: createPlanFingerprint(withoutFingerprint),
  };

  Object.freeze(plan.thresholdFreeze.thresholds);
  Object.freeze(plan.thresholdFreeze);
  Object.freeze(plan.datasetPolicy.requiredCaseTypes);
  Object.freeze(plan.datasetPolicy.requiredSegmentDimensions);
  Object.freeze(plan.datasetPolicy);
  Object.freeze(plan.blindEvaluationPolicy);
  Object.freeze(plan.promotionPolicy);
  Object.freeze(plan.reasonCodes);
  return Object.freeze(plan);
}

export function validateEvaluationCalibrationPlanV3(
  plan: StayOptiEvaluationCalibrationPlanV3
): StayOptiEvaluationValidationV3 {
  const issues: StayOptiEvaluationValidationV3["issues"] = [];

  if (
    plan.version !== SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3 ||
    plan.phase !== "v3-10" ||
    plan.evaluationApplication !== "offline-protocol-only" ||
    plan.rankingApplication !== "shadow-only" ||
    plan.publicPresentation !== "disabled" ||
    plan.thresholdFreeze.status !== "frozen-before-results" ||
    plan.thresholdFreeze.resultsObserved !== false ||
    plan.promotionPolicy.productionSelfModificationAllowed !== false ||
    plan.promotionPolicy.automaticProductionPromotionAllowed !== false ||
    plan.promotionPolicy.publicV3Enabled !== false ||
    plan.promotionPolicy.nextEligibleGate !== "v3-11-shadow" ||
    plan.promotionPolicy.publicRatesGateRemainsExternal !== true
  ) {
    issues.push("invalid-shape");
  }

  const { fingerprint, ...withoutFingerprint } = plan;
  if (
    fingerprint !== createPlanFingerprint(withoutFingerprint) ||
    plan.thresholdFreeze.thresholdFingerprint !==
      createThresholdFingerprint(plan.thresholdFreeze.thresholds)
  ) {
    issues.push("fingerprint-mismatch");
  }

  try {
    const replay = createEvaluationCalibrationPlanV3({
      sourceDecisionInputFingerprint: plan.sourceDecisionInputFingerprint,
    });
    if (stableSerializeV3(replay) !== stableSerializeV3(plan)) {
      issues.push("deterministic-replay-mismatch");
    }
  }
  catch {
    issues.push("invalid-shape");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

function normalizedRegret(
  item: StayOptiGoldenCaseInputV3,
  engine: "v2" | "v3"
) {
  return round(Math.max(0, item.oracleUtility - item[engine].realizedUtility));
}

function createRegretMetrics(cases: readonly StayOptiGoldenCaseInputV3[]) {
  const v2Values = cases.map((item) => normalizedRegret(item, "v2"));
  const v3Values = cases.map((item) => normalizedRegret(item, "v3"));
  const v2 = average(v2Values);
  const v3 = average(v3Values);

  return {
    v2: { count: v2Values.length, value: v2 },
    v3: { count: v3Values.length, value: v3 },
    improvementV3OverV2:
      v2 === null || v3 === null ? null : round(v2 - v3),
  } satisfies StayOptiRegretMetricsV3;
}

function resolveWinningEngine(judgment: StayOptiBlindJudgmentInputV3) {
  return judgment.winner === "tie"
    ? "tie"
    : judgment.winner === "left"
      ? judgment.leftEngine
      : judgment.rightEngine;
}

function createPairwiseGroup(
  judgments: readonly StayOptiBlindJudgmentInputV3[]
): StayOptiPairwiseGroupV3 {
  const outcomes = judgments.map(resolveWinningEngine);
  const v2Wins = outcomes.filter((value) => value === "v2").length;
  const v3Wins = outcomes.filter((value) => value === "v3").length;
  const ties = outcomes.filter((value) => value === "tie").length;

  return {
    judgmentCount: outcomes.length,
    v2Wins,
    v3Wins,
    ties,
    v3EffectiveWinRate:
      outcomes.length === 0
        ? null
        : round((v3Wins + ties * 0.5) / outcomes.length),
  };
}

function createPairwiseMetrics(
  judgments: readonly StayOptiBlindJudgmentInputV3[]
): StayOptiPairwiseMetricsV3 {
  return {
    human: createPairwiseGroup(
      judgments.filter((item) => item.evaluatorType === "human")
    ),
    expert: createPairwiseGroup(
      judgments.filter((item) => item.evaluatorType === "expert")
    ),
    combined: createPairwiseGroup(judgments),
  };
}

function expectedCalibrationError(
  observations: readonly StayOptiEngineCaseObservationV3[]
) {
  if (observations.length === 0) {
    return null;
  }

  let weightedError = 0;
  for (let bin = 0; bin < 10; bin += 1) {
    const lower = bin / 10;
    const upper = (bin + 1) / 10;
    const inBin = observations.filter((item) =>
      item.predictedConfidence >= lower &&
      (bin === 9
        ? item.predictedConfidence <= upper
        : item.predictedConfidence < upper)
    );

    if (inBin.length === 0) {
      continue;
    }

    const confidence = average(inBin.map((item) => item.predictedConfidence)) ?? 0;
    const accuracy =
      inBin.filter((item) => item.decisionCorrect).length / inBin.length;
    weightedError +=
      (inBin.length / observations.length) * Math.abs(confidence - accuracy);
  }

  return round(weightedError);
}

function createCalibrationMetrics(cases: readonly StayOptiGoldenCaseInputV3[]) {
  const v2 = expectedCalibrationError(cases.map((item) => item.v2));
  const v3 = expectedCalibrationError(cases.map((item) => item.v3));
  return {
    binCount: 10 as const,
    v2ExpectedCalibrationError: v2,
    v3ExpectedCalibrationError: v3,
    regressionV3MinusV2:
      v2 === null || v3 === null ? null : round(v3 - v2),
  };
}

function createAbstentionMetrics(
  cases: readonly StayOptiGoldenCaseInputV3[]
): StayOptiAbstentionMetricsV3 {
  const abstentions = cases.filter((item) => item.v3.abstained);
  const appropriate = abstentions.filter((item) => item.shouldAbstain);
  const missed = cases.filter(
    (item) => item.shouldAbstain && !item.v3.abstained
  );

  return {
    decisionCount: abstentions.length,
    appropriateCount: appropriate.length,
    precision:
      abstentions.length === 0
        ? null
        : round(appropriate.length / abstentions.length),
    coverage:
      cases.length === 0 ? null : round(abstentions.length / cases.length),
    missedNecessaryAbstentionCount: missed.length,
  };
}

function createStabilityMetrics(
  cases: readonly StayOptiGoldenCaseInputV3[]
): StayOptiStabilityMetricsV3 {
  const stableChoiceCount = cases.filter(
    (item) => item.v3StableUnderPerturbation
  ).length;
  const robustChoiceRate =
    cases.length === 0 ? null : round(stableChoiceCount / cases.length);

  return {
    caseCount: cases.length,
    stableChoiceCount,
    robustChoiceRate,
    instabilityRate:
      robustChoiceRate === null ? null : round(1 - robustChoiceRate),
  };
}

function createSegmentReports(
  cases: readonly StayOptiGoldenCaseInputV3[],
  minimumCasesPerGroup: number
): StayOptiSegmentReportV3[] {
  return SEGMENT_DIMENSIONS.map((dimension) => {
    const grouped = new Map<string, StayOptiGoldenCaseInputV3[]>();
    cases.forEach((item) => {
      const value = item.segment[dimension];
      grouped.set(value, [...(grouped.get(value) ?? []), item]);
    });

    const groups = [...grouped.entries()]
      .map(([value, groupCases]) => {
        const v2 = average(groupCases.map((item) => normalizedRegret(item, "v2"))) ?? 0;
        const v3 = average(groupCases.map((item) => normalizedRegret(item, "v3"))) ?? 0;
        return {
          value,
          caseCount: groupCases.length,
          v2NormalizedRegret: v2,
          v3NormalizedRegret: v3,
          regretImprovementV3OverV2: round(v2 - v3),
          v3CorrectRate: round(
            groupCases.filter((item) => item.v3.decisionCorrect).length /
              groupCases.length
          ),
        };
      })
      .sort((first, second) => first.value.localeCompare(second.value));

    const eligible = groups.filter(
      (group) => group.caseCount >= minimumCasesPerGroup
    );
    const regrets = eligible.map((group) => group.v3NormalizedRegret);

    return {
      dimension,
      groups,
      eligibleGroupCount: eligible.length,
      maximumV3RegretGap:
        regrets.length < 2
          ? null
          : round(Math.max(...regrets) - Math.min(...regrets)),
      sufficient: eligible.length >= 2,
    };
  });
}

function createFairnessMetrics(
  reports: readonly StayOptiSegmentReportV3[]
): StayOptiFairnessMetricsV3 {
  const gaps = reports.flatMap((report) =>
    report.maximumV3RegretGap === null ? [] : [report.maximumV3RegretGap]
  );
  return {
    maximumObservedSegmentRegretGap:
      gaps.length === 0 ? null : round(Math.max(...gaps)),
    allRequiredSegmentsSufficient: reports.every((report) => report.sufficient),
  };
}

function createProviderDependenceMetrics(
  cases: readonly StayOptiGoldenCaseInputV3[]
): StayOptiProviderDependenceMetricsV3 {
  const stableCount = cases.filter(
    (item) => item.providerNeutralReplay === "stable"
  ).length;
  const changedCount = cases.filter(
    (item) => item.providerNeutralReplay === "changed"
  ).length;
  const unavailableCount = cases.filter(
    (item) => item.providerNeutralReplay === "unavailable"
  ).length;
  const replayCount = stableCount + changedCount;
  return {
    replayCount,
    stableCount,
    changedCount,
    unavailableCount,
    dependenceGap:
      replayCount === 0 ? null : round(changedCount / replayCount),
  };
}

function createMonetaryValueMetrics(
  cases: readonly StayOptiGoldenCaseInputV3[],
  qualityLossTolerance: number
): StayOptiMonetaryValueMetricsV3[] {
  const byCurrency = new Map<string, StayOptiGoldenCaseInputV3[]>();
  cases.forEach((item) => {
    byCurrency.set(item.currency, [...(byCurrency.get(item.currency) ?? []), item]);
  });

  return [...byCurrency.entries()]
    .map(([currency, currencyCases]) => {
      const savingCases = currencyCases.filter(
        (item) =>
          item.v3.selectedCost < item.v2.selectedCost &&
          item.v3.selectedQuality + qualityLossTolerance >= item.v2.selectedQuality
      );
      const savings = savingCases.map(
        (item) => item.v2.selectedCost - item.v3.selectedCost
      );
      const upgradeCases = currencyCases.filter(
        (item) =>
          item.v3.selectedCost > item.v2.selectedCost &&
          item.v3.selectedQuality > item.v2.selectedQuality
      );
      const totalExtraCostForQualityGain = upgradeCases.reduce(
        (total, item) => total + item.v3.selectedCost - item.v2.selectedCost,
        0
      );
      const totalQualityGain = upgradeCases.reduce(
        (total, item) => total + item.v3.selectedQuality - item.v2.selectedQuality,
        0
      );
      const totalMoneySavedWithoutQualityLoss = savings.reduce(
        (total, value) => total + value,
        0
      );

      return {
        currency,
        qualityPreservingSavingCaseCount: savingCases.length,
        totalMoneySavedWithoutQualityLoss: round(totalMoneySavedWithoutQualityLoss),
        averageMoneySavedWithoutQualityLoss: average(savings),
        qualityUpgradeCaseCount: upgradeCases.length,
        totalExtraCostForQualityGain: round(totalExtraCostForQualityGain),
        totalQualityGain: round(totalQualityGain),
        qualityGainedPerExtraCurrencyUnit:
          totalExtraCostForQualityGain === 0
            ? null
            : round(totalQualityGain / totalExtraCostForQualityGain),
      };
    })
    .sort((first, second) => first.currency.localeCompare(second.currency));
}

function thresholdGate(input: {
  gateId: string;
  actual: number | null;
  comparator: ">=" | "<=";
  threshold: number;
  countSufficient?: boolean;
  insufficientWhenBelow?: boolean;
}): StayOptiEvaluationGateV3 {
  const countSufficient = input.countSufficient ?? true;
  const status: StayOptiEvaluationGateStatusV3 =
    !countSufficient || input.actual === null
      ? "insufficient-data"
      : input.insufficientWhenBelow === true &&
          input.comparator === ">=" &&
          input.actual < input.threshold
        ? "insufficient-data"
      : input.comparator === ">="
        ? input.actual >= input.threshold
          ? "pass"
          : "fail"
        : input.actual <= input.threshold
          ? "pass"
          : "fail";

  return {
    gateId: input.gateId,
    status,
    actual: input.actual,
    comparator: input.comparator,
    threshold: input.threshold,
  };
}

function createResultFingerprint(
  result: Omit<StayOptiEvaluationCalibrationResultV3, "fingerprint">
) {
  return createStableHashV3(result, "stayopti-v3-evaluation-calibration-result");
}

export function evaluateV3AgainstV2Offline(input: {
  plan: StayOptiEvaluationCalibrationPlanV3;
  dataset: StayOptiGoldenDatasetV3;
  blindEvaluation: StayOptiBlindEvaluationSetV3;
}): StayOptiEvaluationCalibrationResultV3 {
  if (!validateEvaluationCalibrationPlanV3(input.plan).valid) {
    throw new Error("V3-10 evaluation plan is invalid or was mutated after freeze.");
  }

  if (!validateGoldenDatasetV3(input.dataset).valid) {
    throw new Error("V3-10 Golden Dataset is invalid or was mutated.");
  }

  if (!validateBlindEvaluationSetV3(input.blindEvaluation).valid) {
    throw new Error("V3-10 blind evaluation set is invalid or was mutated.");
  }

  const caseIds = new Set(input.dataset.cases.map((item) => item.caseId));
  if (
    input.blindEvaluation.judgments.some(
      (judgment) => !caseIds.has(judgment.caseId)
    )
  ) {
    throw new Error("Blind judgments must reference a case in the frozen Golden Dataset.");
  }

  const thresholds = input.plan.thresholdFreeze.thresholds;
  const regret = createRegretMetrics(input.dataset.cases);
  const pairwise = createPairwiseMetrics(input.blindEvaluation.judgments);
  const calibration = createCalibrationMetrics(input.dataset.cases);
  const abstention = createAbstentionMetrics(input.dataset.cases);
  const stability = createStabilityMetrics(input.dataset.cases);
  const segmentReports = createSegmentReports(
    input.dataset.cases,
    thresholds.minimumCasesPerSegmentGroup
  );
  const fairness = createFairnessMetrics(segmentReports);
  const providerDependence = createProviderDependenceMetrics(input.dataset.cases);
  const monetaryValueByCurrency = createMonetaryValueMetrics(
    input.dataset.cases,
    thresholds.qualityLossTolerance
  );
  const criticalRegressionCount = input.dataset.cases.reduce(
    (total, item) => total + item.criticalRegressions.length,
    0
  );

  const gates: StayOptiEvaluationGateV3[] = [
    thresholdGate({
      gateId: "dataset-total",
      actual: input.dataset.counts.total,
      comparator: ">=",
      threshold: thresholds.minimumGoldenCaseCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "dataset-adversarial",
      actual: input.dataset.counts.adversarial,
      comparator: ">=",
      threshold: thresholds.minimumAdversarialCaseCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "dataset-counterfactual",
      actual: input.dataset.counts.counterfactual,
      comparator: ">=",
      threshold: thresholds.minimumCounterfactualCaseCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "blind-human-count",
      actual: pairwise.human.judgmentCount,
      comparator: ">=",
      threshold: thresholds.minimumHumanJudgmentCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "blind-expert-count",
      actual: pairwise.expert.judgmentCount,
      comparator: ">=",
      threshold: thresholds.minimumExpertJudgmentCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "normalized-regret-v3",
      actual: regret.v3.value,
      comparator: "<=",
      threshold: thresholds.maximumNormalizedRegretV3,
      countSufficient: input.dataset.counts.total >= thresholds.minimumGoldenCaseCount,
    }),
    thresholdGate({
      gateId: "normalized-regret-improvement",
      actual: regret.improvementV3OverV2,
      comparator: ">=",
      threshold: thresholds.minimumNormalizedRegretImprovement,
      countSufficient: input.dataset.counts.total >= thresholds.minimumGoldenCaseCount,
    }),
    thresholdGate({
      gateId: "blind-human-win-rate",
      actual: pairwise.human.v3EffectiveWinRate,
      comparator: ">=",
      threshold: thresholds.minimumBlindPairwiseWinRateV3,
      countSufficient:
        pairwise.human.judgmentCount >= thresholds.minimumHumanJudgmentCount,
    }),
    thresholdGate({
      gateId: "blind-expert-win-rate",
      actual: pairwise.expert.v3EffectiveWinRate,
      comparator: ">=",
      threshold: thresholds.minimumBlindPairwiseWinRateV3,
      countSufficient:
        pairwise.expert.judgmentCount >= thresholds.minimumExpertJudgmentCount,
    }),
    thresholdGate({
      gateId: "calibration-error-v3",
      actual: calibration.v3ExpectedCalibrationError,
      comparator: "<=",
      threshold: thresholds.maximumCalibrationErrorV3,
      countSufficient: input.dataset.counts.total >= thresholds.minimumGoldenCaseCount,
    }),
    thresholdGate({
      gateId: "calibration-regression",
      actual: calibration.regressionV3MinusV2,
      comparator: "<=",
      threshold: thresholds.maximumCalibrationRegression,
      countSufficient: input.dataset.counts.total >= thresholds.minimumGoldenCaseCount,
    }),
    thresholdGate({
      gateId: "abstention-count",
      actual: abstention.decisionCount,
      comparator: ">=",
      threshold: thresholds.minimumAbstentionDecisionCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "abstention-precision",
      actual: abstention.precision,
      comparator: ">=",
      threshold: thresholds.minimumAbstentionPrecision,
      countSufficient:
        abstention.decisionCount >= thresholds.minimumAbstentionDecisionCount,
    }),
    thresholdGate({
      gateId: "robust-choice-rate",
      actual: stability.robustChoiceRate,
      comparator: ">=",
      threshold: thresholds.minimumRobustChoiceRate,
      countSufficient: input.dataset.counts.total >= thresholds.minimumGoldenCaseCount,
    }),
    thresholdGate({
      gateId: "instability-rate",
      actual: stability.instabilityRate,
      comparator: "<=",
      threshold: thresholds.maximumInstabilityRate,
      countSufficient: input.dataset.counts.total >= thresholds.minimumGoldenCaseCount,
    }),
    thresholdGate({
      gateId: "fairness-gap",
      actual: fairness.maximumObservedSegmentRegretGap,
      comparator: "<=",
      threshold: thresholds.maximumFairnessGap,
      countSufficient: fairness.allRequiredSegmentsSufficient,
    }),
    thresholdGate({
      gateId: "provider-neutral-replay-count",
      actual: providerDependence.replayCount,
      comparator: ">=",
      threshold: thresholds.minimumProviderNeutralReplayCount,
      insufficientWhenBelow: true,
    }),
    thresholdGate({
      gateId: "provider-dependence-gap",
      actual: providerDependence.dependenceGap,
      comparator: "<=",
      threshold: thresholds.maximumProviderDependenceGap,
      countSufficient:
        providerDependence.replayCount >=
        thresholds.minimumProviderNeutralReplayCount,
    }),
    thresholdGate({
      gateId: "critical-regressions",
      actual: criticalRegressionCount,
      comparator: "<=",
      threshold: thresholds.maximumCriticalRegressionCount,
    }),
  ];

  const status: StayOptiEvaluationGateStatusV3 = gates.some(
    (gate) => gate.status === "insufficient-data"
  )
    ? "insufficient-data"
    : gates.some((gate) => gate.status === "fail")
      ? "fail"
      : "pass";

  const resultCore = {
    version: SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3,
    phase: "v3-10" as const,
    evaluationApplication: "offline-only" as const,
    status,
    protocolFingerprint: input.plan.fingerprint,
    thresholdFingerprint: input.plan.thresholdFreeze.thresholdFingerprint,
    datasetFingerprint: input.dataset.fingerprint,
    blindEvaluationFingerprint: input.blindEvaluation.fingerprint,
    thresholdsFrozenBeforeResults: true as const,
    metrics: {
      regret,
      pairwise,
      calibration,
      abstention,
      stability,
      fairness,
      providerDependence,
      monetaryValueByCurrency,
      criticalRegressionCount,
    },
    segmentReports,
    gates,
    candidatePolicy: {
      state:
        status === "pass"
          ? ("eligible-for-v3-11-shadow-gate" as const)
          : ("not-eligible" as const),
      productionPromotionAllowed: false as const,
      automaticPromotionAllowed: false as const,
      publicV3Enabled: false as const,
      nextGate: "v3-11-shadow" as const,
    },
    reasonCodes: uniqueReasonCodesV3([
      "evaluation:thresholds-frozen",
      "evaluation:offline-only",
      "evaluation:primary-metrics-evaluated",
      "evaluation:segment-audited",
      "evaluation:provider-dependence-audited",
      "evaluation:commercially-neutral",
      "evaluation:no-production-self-promotion",
      "evaluation:shadow-promotion-required",
      "regret:normalized-evaluated",
      "calibration:evaluated",
      "fairness:evaluated",
      "savings:quality-preserved",
      "quality:marginal-evaluated",
      status === "pass"
        ? "evaluation:gate-pass"
        : status === "fail"
          ? "evaluation:gate-fail"
          : "evaluation:insufficient-data",
      ...(criticalRegressionCount > 0
        ? (["evaluation:critical-regression-blocked"] as const)
        : []),
    ]),
  };

  const withoutFingerprint: Omit<
    StayOptiEvaluationCalibrationResultV3,
    "fingerprint"
  > = {
    evaluationId: createStableHashV3(
      resultCore,
      "stayopti-v3-evaluation-calibration-result-id"
    ),
    ...resultCore,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createResultFingerprint(withoutFingerprint),
  };
}

export function validateEvaluationCalibrationResultV3(
  result: StayOptiEvaluationCalibrationResultV3
): StayOptiEvaluationValidationV3 {
  const issues: StayOptiEvaluationValidationV3["issues"] = [];

  const expectedStatus: StayOptiEvaluationGateStatusV3 = result.gates.some(
    (gate) => gate.status === "insufficient-data"
  )
    ? "insufficient-data"
    : result.gates.some((gate) => gate.status === "fail")
      ? "fail"
      : "pass";

  if (
    result.version !== SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3 ||
    result.phase !== "v3-10" ||
    result.evaluationApplication !== "offline-only" ||
    result.thresholdsFrozenBeforeResults !== true ||
    result.candidatePolicy.productionPromotionAllowed !== false ||
    result.candidatePolicy.automaticPromotionAllowed !== false ||
    result.candidatePolicy.publicV3Enabled !== false ||
    result.candidatePolicy.nextGate !== "v3-11-shadow" ||
    !["pass", "fail", "insufficient-data"].includes(result.status) ||
    result.status !== expectedStatus ||
    !isStableHashV3(result.protocolFingerprint) ||
    !isStableHashV3(result.thresholdFingerprint) ||
    !isStableHashV3(result.datasetFingerprint) ||
    !isStableHashV3(result.blindEvaluationFingerprint) ||
    (result.status === "pass") !==
      (result.candidatePolicy.state === "eligible-for-v3-11-shadow-gate")
  ) {
    issues.push("invalid-shape");
  }

  const { fingerprint, ...withoutFingerprint } = result;
  if (fingerprint !== createResultFingerprint(withoutFingerprint)) {
    issues.push("fingerprint-mismatch");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

export function assertEvaluationCalibrationPlanV3(
  plan: StayOptiEvaluationCalibrationPlanV3
) {
  const validation = validateEvaluationCalibrationPlanV3(plan);
  if (!validation.valid) {
    throw new Error(
      `Invalid V3-10 Evaluation & Calibration plan: ${validation.issues.join(", ")}.`
    );
  }
  return plan;
}

export function assertEvaluationCalibrationResultV3(
  result: StayOptiEvaluationCalibrationResultV3
) {
  const validation = validateEvaluationCalibrationResultV3(result);
  if (!validation.valid) {
    throw new Error(
      `Invalid V3-10 Evaluation & Calibration result: ${validation.issues.join(", ")}.`
    );
  }
  return result;
}
