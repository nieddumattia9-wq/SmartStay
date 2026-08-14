import {
  isSmartStayReasonCodeV3,
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";

import {
  SMARTSTAY_ENGINE_VERSION_V3,
  SMARTSTAY_POLICY_VERSION_V3,
  SMARTSTAY_PROMOTION_AUDIT_SCHEMA_VERSION_V3,
  SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
  SMARTSTAY_SHADOW_RECORD_SCHEMA_VERSION_V3,
} from "../contract/versionsV3";

import {
  validateEvaluationCalibrationResultV3,
  type StayOptiCriticalRegressionCodeV3,
  type StayOptiEvaluationCalibrationResultV3,
  type StayOptiEvaluationCoverageV3,
  type StayOptiEvaluationDestinationV3,
  type StayOptiEvaluationDurationV3,
  type StayOptiEvaluationLeadTimeV3,
  type StayOptiEvaluationProfileV3,
  type StayOptiEvaluationSegmentV3,
} from "../evaluation/evaluationCalibrationV3";

export type StayOptiPromotionStageV3 =
  | "off"
  | "shadow"
  | "canary"
  | "public";

export type StayOptiServingEngineV3 =
  | "v2"
  | "v3";

export type StayOptiComparableDecisionStatusV3 =
  | "recommended"
  | "abstained"
  | "no-feasible-solution";

export type StayOptiComparableDecisionRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "split-saver";

export interface StayOptiComparableDecisionV3 {
  engine: StayOptiServingEngineV3;
  engineVersion: string;
  policyVersion: string;
  decisionFingerprint: string;
  status: StayOptiComparableDecisionStatusV3;
  selectedSolutionToken: string | null;
  role: StayOptiComparableDecisionRoleV3 | null;
  reasonCodes: string[];
}

export interface StayOptiShadowSafetySignalsV3 {
  priceIntegrity: "pass" | "fail" | "unknown";
  publicRateConsistency: "verified" | "not-applicable" | "failed" | "unverified";
  commercialFirewall: "pass" | "fail";
  privacyFirewall: "pass" | "fail";
  deterministicReplay: "pass" | "fail";
  hardConstraints: "pass" | "fail";
  recommendationSafety: "pass" | "fail";
}

export type StayOptiShadowDiffKindV3 =
  | "none"
  | "reasons-only"
  | "role"
  | "selection"
  | "status"
  | "abstention";

export interface StayOptiShadowReasonDiffV3 {
  common: string[];
  addedInV3: string[];
  missingFromV3: string[];
}

export interface StayOptiShadowDecisionDiffV3 {
  kind: StayOptiShadowDiffKindV3;
  statusAgreement: boolean;
  selectionAgreement: boolean;
  roleAgreement: boolean;
  exactReasonAgreement: boolean;
  reasonDiff: StayOptiShadowReasonDiffV3;
}

export interface StayOptiPromotionAuditIdentityV3 {
  schemaVersion: typeof SMARTSTAY_PROMOTION_AUDIT_SCHEMA_VERSION_V3;
  internalOnly: true;
  engineVersion: typeof SMARTSTAY_ENGINE_VERSION_V3;
  policyVersion: typeof SMARTSTAY_POLICY_VERSION_V3;
  promotionVersion: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
}

export interface StayOptiShadowComparisonV3 {
  recordType: "shadow-comparison";
  schemaVersion: typeof SMARTSTAY_SHADOW_RECORD_SCHEMA_VERSION_V3;
  comparisonId: string;
  application: "internal-shadow-only";
  publicServingEngine: "v2";
  v3Authoritative: false;
  segment: StayOptiEvaluationSegmentV3;
  v2: StayOptiComparableDecisionV3;
  v3: StayOptiComparableDecisionV3;
  safety: StayOptiShadowSafetySignalsV3;
  diff: StayOptiShadowDecisionDiffV3;
  criticalRegressions: StayOptiCriticalRegressionCodeV3[];
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export interface StayOptiShadowErrorV3 {
  recordType: "shadow-error";
  schemaVersion: typeof SMARTSTAY_SHADOW_RECORD_SCHEMA_VERSION_V3;
  comparisonId: string;
  application: "internal-shadow-only";
  publicServingEngine: "v2";
  v3Authoritative: false;
  segment: StayOptiEvaluationSegmentV3;
  errorCode: "v3-shadow-execution-failed";
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export type StayOptiShadowObservationV3 =
  | StayOptiShadowComparisonV3
  | StayOptiShadowErrorV3;

export interface StayOptiShadowValidationV3 {
  valid: boolean;
  issues: Array<
    | "invalid-shape"
    | "fingerprint-mismatch"
    | "derived-diff-mismatch"
    | "critical-regression-mismatch"
  >;
}

export interface StayOptiShadowSegmentMetricV3 {
  dimension:
    | "profile"
    | "destination"
    | "leadTime"
    | "duration"
    | "coverage";
  value: string;
  observationCount: number;
  comparisonCount: number;
  executionErrorCount: number;
  selectionDivergenceCount: number;
  statusDivergenceCount: number;
  criticalRegressionCount: number;
}

export interface StayOptiShadowReasonDiffCountV3 {
  reasonCode: string;
  addedInV3Count: number;
  missingFromV3Count: number;
}

export interface StayOptiShadowRegressionDashboardV3 {
  dashboardId: string;
  version: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
  application: "internal-promotion-dashboard";
  publicServingEngine: "v2";
  rawDecisionPayloadStored: false;
  piiAllowed: false;
  commercialFieldsAllowed: false;
  counts: {
    observations: number;
    comparisons: number;
    executionErrors: number;
    exactDecisionAgreements: number;
    selectionDivergences: number;
    statusDivergences: number;
    abstentionDivergences: number;
    criticalRegressions: number;
  };
  rates: {
    executionErrorRate: number;
    exactDecisionAgreementRate: number | null;
    selectionAgreementRate: number | null;
    statusAgreementRate: number | null;
    exactReasonAgreementRate: number | null;
  };
  criticalRegressionCounts: Array<{
    code: StayOptiCriticalRegressionCodeV3;
    count: number;
  }>;
  reasonDiffCounts: StayOptiShadowReasonDiffCountV3[];
  segmentMetrics: StayOptiShadowSegmentMetricV3[];
  gateSummary: {
    minimumObservationCountMet: boolean;
    minimumComparisonCountMet: boolean;
    executionErrorRateWithinLimit: boolean;
    zeroCriticalRegressions: boolean;
    observedSegmentGroupsSufficient: boolean;
  };
  status:
    | "collecting-shadow-evidence"
    | "blocked-by-regression"
    | "ready-for-canary-review";
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export interface StayOptiPromotionThresholdsV3 {
  minimumShadowObservationCount: number;
  minimumShadowComparisonCount: number;
  minimumObservedSegmentGroupCount: number;
  maximumShadowExecutionErrorRate: number;
  maximumCriticalRegressionCount: number;
  maximumInitialCanaryBasisPoints: number;
  minimumCanaryObservationCount: number;
  minimumCanaryMonitoredHours: number;
  maximumCanaryErrorRateRegression: number;
  maximumCanaryP95LatencyRegressionMs: number;
}

export const STAYOPTI_PROMOTION_THRESHOLDS_V3:
  Readonly<StayOptiPromotionThresholdsV3> =
  Object.freeze({
    minimumShadowObservationCount: 1_000,
    minimumShadowComparisonCount: 990,
    minimumObservedSegmentGroupCount: 30,
    maximumShadowExecutionErrorRate: 0.005,
    maximumCriticalRegressionCount: 0,
    maximumInitialCanaryBasisPoints: 500,
    minimumCanaryObservationCount: 500,
    minimumCanaryMonitoredHours: 24,
    maximumCanaryErrorRateRegression: 0.002,
    maximumCanaryP95LatencyRegressionMs: 100,
  });

export interface StayOptiPromotionGateEvidenceV3 {
  status: "pass" | "fail" | "pending";
  evidenceFingerprint: string | null;
}

export interface StayOptiPromotionExternalGatesV3 {
  publicRateConsistency: StayOptiPromotionGateEvidenceV3;
  invariants: StayOptiPromotionGateEvidenceV3;
  security: StayOptiPromotionGateEvidenceV3;
  humanEvaluation: StayOptiPromotionGateEvidenceV3;
  monitoring: StayOptiPromotionGateEvidenceV3;
}

export interface StayOptiCanaryEvidenceV3 {
  status: "not-run" | "pass" | "fail";
  observationCount: number;
  monitoredHours: number;
  errorRateRegression: number | null;
  p95LatencyRegressionMs: number | null;
  criticalRegressionCount: number;
  rollbackDrill: "not-run" | "pass" | "fail";
  evidenceFingerprint: string | null;
}

export interface StayOptiPromotionGateResultV3 {
  gateId:
    | "evaluation-calibration"
    | "public-rate-consistency"
    | "invariants"
    | "security"
    | "human-evaluation"
    | "shadow-dashboard"
    | "monitoring"
    | "canary-evidence";
  status: "pass" | "fail" | "pending";
  requiredFor: Array<"shadow" | "canary" | "public">;
  evidenceFingerprint: string | null;
}

export interface StayOptiPromotionReviewV3 {
  reviewId: string;
  version: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
  phase: "v3-11";
  publicServingEngine: "v2";
  publicV3Enabled: false;
  automaticPromotionAllowed: false;
  manualApprovalRequired: true;
  highestEligibleStage: StayOptiPromotionStageV3;
  stageEligibility: {
    shadow: boolean;
    canary: boolean;
    public: boolean;
  };
  gateResults: StayOptiPromotionGateResultV3[];
  reasonCodes: SmartStayReasonCodeV3[];
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export interface StayOptiPromotionAuthorizationV3 {
  authorizationId: string;
  version: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
  targetStage: Exclude<StayOptiPromotionStageV3, "off">;
  status: "authorized" | "blocked";
  reviewFingerprint: string;
  manualApprovalRecorded: boolean;
  automaticPromotion: false;
  publicServingEngine:
    | "v2"
    | "mixed-canary"
    | "v3";
  canaryAllocationLimitBasisPoints: number;
  killSwitch: "armed";
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export interface StayOptiKillSwitchStateV3 {
  stateId: string;
  version: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
  armed: true;
  active: boolean;
  rollbackRequired: boolean;
  triggerCodes: Array<
    | "manual-trigger"
    | "price-integrity"
    | "public-rate-integrity"
    | "critical-regression"
    | "error-rate-regression"
    | "latency-regression"
  >;
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export interface StayOptiServingAssignmentV3 {
  assignmentId: string;
  version: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
  targetStage: Exclude<StayOptiPromotionStageV3, "off">;
  servingEngine: StayOptiServingEngineV3;
  canaryBucket: number | null;
  canaryAllocationBasisPoints: number;
  killSwitchActive: boolean;
  rollbackRequired: boolean;
  reason:
    | "authorization-blocked"
    | "shadow-v2-authoritative"
    | "canary-v2-control"
    | "canary-v3-assigned"
    | "public-v3-authorized"
    | "kill-switch-v2-fallback";
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

export interface StayOptiDefaultPromotionControlV3 {
  controlId: string;
  version: typeof SMARTSTAY_SHADOW_PROMOTION_VERSION_V3;
  stage: "off";
  publicServingEngine: "v2";
  v3Execution: "disabled";
  canaryAllocationBasisPoints: 0;
  automaticPromotionAllowed: false;
  publicV3Enabled: false;
  manualApprovalRequired: true;
  killSwitch: "armed";
  audit: StayOptiPromotionAuditIdentityV3;
  fingerprint: string;
}

const PROFILE_VALUES = new Set<StayOptiEvaluationProfileV3>([
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
]);

const DESTINATION_VALUES = new Set<StayOptiEvaluationDestinationV3>([
  "urban",
  "resort",
  "rural",
  "airport",
  "mixed",
]);

const LEAD_TIME_VALUES = new Set<StayOptiEvaluationLeadTimeV3>([
  "same-week",
  "short",
  "medium",
  "long",
  "very-long",
]);

const DURATION_VALUES = new Set<StayOptiEvaluationDurationV3>([
  "one-night",
  "short-stay",
  "medium-stay",
  "long-stay",
  "extended-stay",
]);

const COVERAGE_VALUES = new Set<StayOptiEvaluationCoverageV3>([
  "high",
  "medium",
  "low",
  "unknown",
]);

const CRITICAL_REGRESSION_ORDER: StayOptiCriticalRegressionCodeV3[] = [
  "commercial-influence",
  "hard-constraint-violation",
  "non-deterministic-decision",
  "pii-in-trace",
  "price-integrity",
  "privacy-violation",
  "public-rate-integrity",
  "unsafe-recommendation",
];

const STAGE_RANK: Record<StayOptiPromotionStageV3, number> = {
  off: 0,
  shadow: 1,
  canary: 2,
  public: 3,
};

const PROMOTION_GATE_REQUIREMENTS: Record<
  StayOptiPromotionGateResultV3["gateId"],
  ReadonlyArray<"shadow" | "canary" | "public">
> = {
  "evaluation-calibration": ["shadow", "canary", "public"],
  "public-rate-consistency": ["shadow", "canary", "public"],
  invariants: ["shadow", "canary", "public"],
  security: ["shadow", "canary", "public"],
  "human-evaluation": ["shadow", "canary", "public"],
  "shadow-dashboard": ["canary", "public"],
  monitoring: ["canary", "public"],
  "canary-evidence": ["public"],
};

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

function requireOpaqueToken(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value)
  ) {
    throw new Error(`${label} must be an opaque token.`);
  }
  return value;
}

function requireVersionToken(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-z][0-9a-z.+-]{2,63}$/i.test(value)
  ) {
    throw new Error(`${label} must be a bounded version token.`);
  }
  return value;
}

function normalizeReasonCodes(values: readonly string[]) {
  if (
    !Array.isArray(values) ||
    values.some(
      (value) =>
        typeof value !== "string" ||
        !/^[a-z0-9][a-z0-9:._-]{1,127}$/i.test(value)
    )
  ) {
    throw new Error("Shadow reason codes must be bounded machine-readable values.");
  }

  return [...new Set(values)].sort();
}

function validateSegment(segment: StayOptiEvaluationSegmentV3) {
  requireExactKeys(
    segment as unknown as Record<string, unknown>,
    ["profile", "destination", "leadTime", "duration", "coverage"],
    "Shadow segment"
  );

  if (
    !PROFILE_VALUES.has(segment.profile) ||
    !DESTINATION_VALUES.has(segment.destination) ||
    !LEAD_TIME_VALUES.has(segment.leadTime) ||
    !DURATION_VALUES.has(segment.duration) ||
    !COVERAGE_VALUES.has(segment.coverage)
  ) {
    throw new Error("Shadow segment contains an unknown closed value.");
  }
}

function findForbiddenFieldPaths(value: unknown, currentPath = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenFieldPaths(item, `${currentPath}.${index}`)
    );
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  const forbidden = /^(email|phone|fullName|firstName|lastName|booking(Id|Ref|Reference)|provider(Id|Name|Code)|commission|affiliate|revenue|margin|price|amount)$/i;
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => [
      ...(forbidden.test(key) ? [`${currentPath}.${key}`] : []),
      ...findForbiddenFieldPaths(child, `${currentPath}.${key}`),
    ]
  );
}

function createAuditIdentity(): StayOptiPromotionAuditIdentityV3 {
  return {
    schemaVersion: SMARTSTAY_PROMOTION_AUDIT_SCHEMA_VERSION_V3,
    internalOnly: true,
    engineVersion: SMARTSTAY_ENGINE_VERSION_V3,
    policyVersion: SMARTSTAY_POLICY_VERSION_V3,
    promotionVersion: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
  };
}

function isAuditIdentityValid(audit: StayOptiPromotionAuditIdentityV3) {
  return (
    audit.schemaVersion === SMARTSTAY_PROMOTION_AUDIT_SCHEMA_VERSION_V3 &&
    audit.internalOnly === true &&
    audit.engineVersion === SMARTSTAY_ENGINE_VERSION_V3 &&
    audit.policyVersion === SMARTSTAY_POLICY_VERSION_V3 &&
    audit.promotionVersion === SMARTSTAY_SHADOW_PROMOTION_VERSION_V3
  );
}

function createDefaultControlFingerprint(
  control: Omit<StayOptiDefaultPromotionControlV3, "fingerprint">
) {
  return createStableHashV3(control, "stayopti-v3-default-promotion-control");
}

export function createDefaultPromotionControlV3():
  StayOptiDefaultPromotionControlV3 {
  const core = {
    version: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
    stage: "off" as const,
    publicServingEngine: "v2" as const,
    v3Execution: "disabled" as const,
    canaryAllocationBasisPoints: 0 as const,
    automaticPromotionAllowed: false as const,
    publicV3Enabled: false as const,
    manualApprovalRequired: true as const,
    killSwitch: "armed" as const,
    audit: createAuditIdentity(),
  };
  const withoutFingerprint: Omit<
    StayOptiDefaultPromotionControlV3,
    "fingerprint"
  > = {
    controlId: createStableHashV3(
      core,
      "stayopti-v3-default-promotion-control-id"
    ),
    ...core,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createDefaultControlFingerprint(withoutFingerprint),
  };
}

export function validateDefaultPromotionControlV3(
  control: StayOptiDefaultPromotionControlV3
) {
  const { fingerprint, ...withoutFingerprint } = control;
  return (
    control.version === SMARTSTAY_SHADOW_PROMOTION_VERSION_V3 &&
    control.stage === "off" &&
    control.publicServingEngine === "v2" &&
    control.v3Execution === "disabled" &&
    control.canaryAllocationBasisPoints === 0 &&
    control.automaticPromotionAllowed === false &&
    control.publicV3Enabled === false &&
    control.manualApprovalRequired === true &&
    control.killSwitch === "armed" &&
    isAuditIdentityValid(control.audit) &&
    isStableHashV3(control.controlId) &&
    fingerprint === createDefaultControlFingerprint(withoutFingerprint)
  );
}

function validateComparableDecision(
  decision: StayOptiComparableDecisionV3,
  expectedEngine: StayOptiServingEngineV3
) {
  requireExactKeys(
    decision as unknown as Record<string, unknown>,
    [
      "engine",
      "engineVersion",
      "policyVersion",
      "decisionFingerprint",
      "status",
      "selectedSolutionToken",
      "role",
      "reasonCodes",
    ],
    `${expectedEngine.toUpperCase()} shadow decision`
  );

  if (decision.engine !== expectedEngine) {
    throw new Error(`Expected a ${expectedEngine.toUpperCase()} shadow decision.`);
  }

  requireVersionToken(decision.engineVersion, "engineVersion");
  requireVersionToken(decision.policyVersion, "policyVersion");
  if (!isStableHashV3(decision.decisionFingerprint)) {
    throw new Error("Shadow decisions require a stable decision fingerprint.");
  }

  if (
    !["recommended", "abstained", "no-feasible-solution"].includes(
      decision.status
    )
  ) {
    throw new Error("Shadow decision status is invalid.");
  }

  normalizeReasonCodes(decision.reasonCodes);

  if (decision.status === "recommended") {
    requireOpaqueToken(decision.selectedSolutionToken, "selectedSolutionToken");
    if (
      ![
        "best-choice",
        "best-sensible-saving",
        "worthwhile-comfort-upgrade",
        "split-saver",
      ].includes(decision.role ?? "")
    ) {
      throw new Error("Recommended shadow decisions require a valid role.");
    }
  }
  else if (decision.selectedSolutionToken !== null || decision.role !== null) {
    throw new Error("Non-recommendation shadow decisions cannot select a solution or role.");
  }
}

function normalizeComparableDecision(
  decision: StayOptiComparableDecisionV3,
  expectedEngine: StayOptiServingEngineV3
): StayOptiComparableDecisionV3 {
  validateComparableDecision(decision, expectedEngine);
  return {
    ...decision,
    reasonCodes: normalizeReasonCodes(decision.reasonCodes),
  };
}

function validateSafetySignals(signals: StayOptiShadowSafetySignalsV3) {
  requireExactKeys(
    signals as unknown as Record<string, unknown>,
    [
      "priceIntegrity",
      "publicRateConsistency",
      "commercialFirewall",
      "privacyFirewall",
      "deterministicReplay",
      "hardConstraints",
      "recommendationSafety",
    ],
    "Shadow safety signals"
  );

  if (
    !["pass", "fail", "unknown"].includes(signals.priceIntegrity) ||
    !["verified", "not-applicable", "failed", "unverified"].includes(
      signals.publicRateConsistency
    ) ||
    [
      signals.commercialFirewall,
      signals.privacyFirewall,
      signals.deterministicReplay,
      signals.hardConstraints,
      signals.recommendationSafety,
    ].some((value) => !["pass", "fail"].includes(value))
  ) {
    throw new Error("Shadow safety signals contain an unknown closed value.");
  }
}

function createCriticalRegressions(
  signals: StayOptiShadowSafetySignalsV3
): StayOptiCriticalRegressionCodeV3[] {
  const codes: StayOptiCriticalRegressionCodeV3[] = [];

  if (signals.commercialFirewall !== "pass") codes.push("commercial-influence");
  if (signals.hardConstraints !== "pass") codes.push("hard-constraint-violation");
  if (signals.deterministicReplay !== "pass") codes.push("non-deterministic-decision");
  if (signals.priceIntegrity !== "pass") codes.push("price-integrity");
  if (signals.privacyFirewall !== "pass") codes.push("privacy-violation");
  if (
    ![
      "verified",
      "not-applicable",
    ].includes(
      signals.publicRateConsistency
    )
  ) codes.push("public-rate-integrity");
  if (signals.recommendationSafety !== "pass") codes.push("unsafe-recommendation");

  return CRITICAL_REGRESSION_ORDER.filter((code) => codes.includes(code));
}

function createReasonDiff(
  v2Reasons: readonly string[],
  v3Reasons: readonly string[]
): StayOptiShadowReasonDiffV3 {
  const v2 = normalizeReasonCodes(v2Reasons);
  const v3 = normalizeReasonCodes(v3Reasons);
  const v2Set = new Set(v2);
  const v3Set = new Set(v3);

  return {
    common: v2.filter((code) => v3Set.has(code)),
    addedInV3: v3.filter((code) => !v2Set.has(code)),
    missingFromV3: v2.filter((code) => !v3Set.has(code)),
  };
}

function createDecisionDiff(
  v2: StayOptiComparableDecisionV3,
  v3: StayOptiComparableDecisionV3
): StayOptiShadowDecisionDiffV3 {
  const reasonDiff = createReasonDiff(v2.reasonCodes, v3.reasonCodes);
  const statusAgreement = v2.status === v3.status;
  const selectionAgreement =
    v2.selectedSolutionToken === v3.selectedSolutionToken;
  const roleAgreement = v2.role === v3.role;
  const exactReasonAgreement =
    reasonDiff.addedInV3.length === 0 &&
    reasonDiff.missingFromV3.length === 0;

  let kind: StayOptiShadowDiffKindV3 = "none";
  if (
    !statusAgreement &&
    (v2.status === "abstained" || v3.status === "abstained")
  ) {
    kind = "abstention";
  }
  else if (!statusAgreement) kind = "status";
  else if (!selectionAgreement) kind = "selection";
  else if (!roleAgreement) kind = "role";
  else if (!exactReasonAgreement) kind = "reasons-only";

  return {
    kind,
    statusAgreement,
    selectionAgreement,
    roleAgreement,
    exactReasonAgreement,
    reasonDiff,
  };
}

function createComparisonFingerprint(
  record: Omit<StayOptiShadowComparisonV3, "fingerprint">
) {
  return createStableHashV3(record, "stayopti-v3-shadow-comparison");
}

export function createShadowComparisonV3(input: {
  comparisonToken: string;
  segment: StayOptiEvaluationSegmentV3;
  v2: StayOptiComparableDecisionV3;
  v3: StayOptiComparableDecisionV3;
  safety: StayOptiShadowSafetySignalsV3;
}): StayOptiShadowComparisonV3 {
  if (findForbiddenFieldPaths(input).length > 0) {
    throw new Error("Shadow comparison contains PII, booking, provider or commercial fields.");
  }

  requireOpaqueToken(input.comparisonToken, "comparisonToken");
  validateSegment(input.segment);
  const v2 = normalizeComparableDecision(input.v2, "v2");
  const v3 = normalizeComparableDecision(input.v3, "v3");
  validateSafetySignals(input.safety);

  const core = {
    recordType: "shadow-comparison" as const,
    schemaVersion: SMARTSTAY_SHADOW_RECORD_SCHEMA_VERSION_V3,
    comparisonId: createStableHashV3(
      {
        comparisonToken: input.comparisonToken,
        v2DecisionFingerprint: v2.decisionFingerprint,
        v3DecisionFingerprint: v3.decisionFingerprint,
      },
      "stayopti-v3-shadow-comparison-id"
    ),
    application: "internal-shadow-only" as const,
    publicServingEngine: "v2" as const,
    v3Authoritative: false as const,
    segment: { ...input.segment },
    v2,
    v3,
    safety: { ...input.safety },
    diff: createDecisionDiff(v2, v3),
    criticalRegressions: createCriticalRegressions(input.safety),
    audit: createAuditIdentity(),
  };

  return {
    ...core,
    fingerprint: createComparisonFingerprint(core),
  };
}

function createShadowErrorFingerprint(
  record: Omit<StayOptiShadowErrorV3, "fingerprint">
) {
  return createStableHashV3(record, "stayopti-v3-shadow-error");
}

function createShadowErrorV3(input: {
  comparisonToken: string;
  segment: StayOptiEvaluationSegmentV3;
  v2DecisionFingerprint: string;
}): StayOptiShadowErrorV3 {
  requireOpaqueToken(input.comparisonToken, "comparisonToken");
  validateSegment(input.segment);
  if (!isStableHashV3(input.v2DecisionFingerprint)) {
    throw new Error("Shadow error records require the V2 decision fingerprint.");
  }

  const core = {
    recordType: "shadow-error" as const,
    schemaVersion: SMARTSTAY_SHADOW_RECORD_SCHEMA_VERSION_V3,
    comparisonId: createStableHashV3(
      {
        comparisonToken: input.comparisonToken,
        v2DecisionFingerprint: input.v2DecisionFingerprint,
      },
      "stayopti-v3-shadow-error-id"
    ),
    application: "internal-shadow-only" as const,
    publicServingEngine: "v2" as const,
    v3Authoritative: false as const,
    segment: { ...input.segment },
    errorCode: "v3-shadow-execution-failed" as const,
    audit: createAuditIdentity(),
  };

  return {
    ...core,
    fingerprint: createShadowErrorFingerprint(core),
  };
}

export function validateShadowObservationV3(
  observation: StayOptiShadowObservationV3
): StayOptiShadowValidationV3 {
  const issues: StayOptiShadowValidationV3["issues"] = [];

  try {
    validateSegment(observation.segment);

    if (
      observation.schemaVersion !== SMARTSTAY_SHADOW_RECORD_SCHEMA_VERSION_V3 ||
      observation.application !== "internal-shadow-only" ||
      observation.publicServingEngine !== "v2" ||
      observation.v3Authoritative !== false ||
      !isAuditIdentityValid(observation.audit) ||
      !isStableHashV3(observation.comparisonId)
    ) {
      issues.push("invalid-shape");
    }

    if (observation.recordType === "shadow-comparison") {
      validateComparableDecision(observation.v2, "v2");
      validateComparableDecision(observation.v3, "v3");
      validateSafetySignals(observation.safety);

      if (
        JSON.stringify(observation.diff) !==
        JSON.stringify(createDecisionDiff(observation.v2, observation.v3))
      ) {
        issues.push("derived-diff-mismatch");
      }

      if (
        JSON.stringify(observation.criticalRegressions) !==
        JSON.stringify(createCriticalRegressions(observation.safety))
      ) {
        issues.push("critical-regression-mismatch");
      }

      const { fingerprint, ...withoutFingerprint } = observation;
      if (fingerprint !== createComparisonFingerprint(withoutFingerprint)) {
        issues.push("fingerprint-mismatch");
      }
    }
    else if (observation.recordType === "shadow-error") {
      if (observation.errorCode !== "v3-shadow-execution-failed") {
        issues.push("invalid-shape");
      }
      const { fingerprint, ...withoutFingerprint } = observation;
      if (fingerprint !== createShadowErrorFingerprint(withoutFingerprint)) {
        issues.push("fingerprint-mismatch");
      }
    }
    else {
      issues.push("invalid-shape");
    }

    if (findForbiddenFieldPaths(observation).length > 0) {
      issues.push("invalid-shape");
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

export function runV3ShadowSafelyV3<TPublicResult>(input: {
  mode: "off" | "shadow";
  comparisonToken: string;
  segment: StayOptiEvaluationSegmentV3;
  publicV2Result: TPublicResult;
  v2Decision: StayOptiComparableDecisionV3;
  safety: StayOptiShadowSafetySignalsV3;
  runV3: () => StayOptiComparableDecisionV3;
}): {
  publicResult: TPublicResult;
  publicServingEngine: "v2";
  v3Executed: boolean;
  shadowObservation: StayOptiShadowObservationV3 | null;
} {
  return runV3ShadowWithDerivedSafetySafelyV3({
    mode: input.mode,
    comparisonToken: input.comparisonToken,
    segment: input.segment,
    publicV2Result: input.publicV2Result,
    v2Decision: input.v2Decision,
    runV3: () => ({
      decision: input.runV3(),
      safety: input.safety,
    }),
  });
}

export function runV3ShadowWithDerivedSafetySafelyV3<TPublicResult>(input: {
  mode: "off" | "shadow";
  comparisonToken: string;
  segment: StayOptiEvaluationSegmentV3;
  publicV2Result: TPublicResult;
  v2Decision: StayOptiComparableDecisionV3;
  runV3: () => {
    decision: StayOptiComparableDecisionV3;
    safety: StayOptiShadowSafetySignalsV3;
  };
}): {
  publicResult: TPublicResult;
  publicServingEngine: "v2";
  v3Executed: boolean;
  shadowObservation: StayOptiShadowObservationV3 | null;
} {
  const v2 = normalizeComparableDecision(input.v2Decision, "v2");
  validateSegment(input.segment);
  requireOpaqueToken(input.comparisonToken, "comparisonToken");

  if (input.mode === "off") {
    return {
      publicResult: input.publicV2Result,
      publicServingEngine: "v2",
      v3Executed: false,
      shadowObservation: null,
    };
  }

  try {
    const evaluation = input.runV3();
    return {
      publicResult: input.publicV2Result,
      publicServingEngine: "v2",
      v3Executed: true,
      shadowObservation: createShadowComparisonV3({
        comparisonToken: input.comparisonToken,
        segment: input.segment,
        v2,
        v3: evaluation.decision,
        safety: evaluation.safety,
      }),
    };
  }
  catch {
    return {
      publicResult: input.publicV2Result,
      publicServingEngine: "v2",
      v3Executed: true,
      shadowObservation: createShadowErrorV3({
        comparisonToken: input.comparisonToken,
        segment: input.segment,
        v2DecisionFingerprint: v2.decisionFingerprint,
      }),
    };
  }
}

function createDashboardFingerprint(
  dashboard: Omit<StayOptiShadowRegressionDashboardV3, "fingerprint">
) {
  return createStableHashV3(dashboard, "stayopti-v3-shadow-dashboard");
}

function safeRate(numerator: number, denominator: number) {
  return denominator === 0 ? null : round(numerator / denominator);
}

export function createShadowRegressionDashboardV3(
  observations: readonly StayOptiShadowObservationV3[]
): StayOptiShadowRegressionDashboardV3 {
  if (
    observations.some(
      (observation) => !validateShadowObservationV3(observation).valid
    )
  ) {
    throw new Error("Shadow dashboard requires valid immutable observations.");
  }

  const ids = observations.map((item) => item.comparisonId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Shadow dashboard observation IDs must be unique.");
  }

  const comparisons = observations.filter(
    (item): item is StayOptiShadowComparisonV3 =>
      item.recordType === "shadow-comparison"
  );
  const errors = observations.filter(
    (item) => item.recordType === "shadow-error"
  );
  const exactDecisionAgreements = comparisons.filter(
    (item) => item.diff.kind === "none"
  ).length;
  const selectionDivergences = comparisons.filter(
    (item) => !item.diff.selectionAgreement
  ).length;
  const statusDivergences = comparisons.filter(
    (item) => !item.diff.statusAgreement
  ).length;
  const abstentionDivergences = comparisons.filter(
    (item) => item.diff.kind === "abstention"
  ).length;
  const criticalRegressions = comparisons.reduce(
    (total, item) => total + item.criticalRegressions.length,
    0
  );

  const criticalRegressionCounts = CRITICAL_REGRESSION_ORDER
    .map((code) => ({
      code,
      count: comparisons.filter((item) => item.criticalRegressions.includes(code))
        .length,
    }))
    .filter((item) => item.count > 0);

  const reasonCodes = [
    ...new Set(
      comparisons.flatMap((item) => [
        ...item.diff.reasonDiff.addedInV3,
        ...item.diff.reasonDiff.missingFromV3,
      ])
    ),
  ].sort();
  const reasonDiffCounts = reasonCodes.map((reasonCode) => ({
    reasonCode,
    addedInV3Count: comparisons.filter((item) =>
      item.diff.reasonDiff.addedInV3.includes(reasonCode)
    ).length,
    missingFromV3Count: comparisons.filter((item) =>
      item.diff.reasonDiff.missingFromV3.includes(reasonCode)
    ).length,
  }));

  const dimensions = [
    "profile",
    "destination",
    "leadTime",
    "duration",
    "coverage",
  ] as const;
  const segmentMetrics = dimensions.flatMap((dimension) => {
    const values = [
      ...new Set(observations.map((item) => String(item.segment[dimension]))),
    ].sort();

    return values.map((value): StayOptiShadowSegmentMetricV3 => {
      const group = observations.filter(
        (item) => String(item.segment[dimension]) === value
      );
      const groupComparisons = group.filter(
        (item): item is StayOptiShadowComparisonV3 =>
          item.recordType === "shadow-comparison"
      );
      return {
        dimension,
        value,
        observationCount: group.length,
        comparisonCount: groupComparisons.length,
        executionErrorCount: group.length - groupComparisons.length,
        selectionDivergenceCount: groupComparisons.filter(
          (item) => !item.diff.selectionAgreement
        ).length,
        statusDivergenceCount: groupComparisons.filter(
          (item) => !item.diff.statusAgreement
        ).length,
        criticalRegressionCount: groupComparisons.reduce(
          (total, item) => total + item.criticalRegressions.length,
          0
        ),
      };
    });
  });

  const executionErrorRate = safeRate(errors.length, observations.length) ?? 0;
  const gateSummary = {
    minimumObservationCountMet:
      observations.length >=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.minimumShadowObservationCount,
    minimumComparisonCountMet:
      comparisons.length >=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.minimumShadowComparisonCount,
    executionErrorRateWithinLimit:
      executionErrorRate <=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumShadowExecutionErrorRate,
    zeroCriticalRegressions:
      criticalRegressions <=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumCriticalRegressionCount,
    observedSegmentGroupsSufficient:
      segmentMetrics.length > 0 &&
      segmentMetrics.every(
        (item) =>
          item.observationCount >=
          STAYOPTI_PROMOTION_THRESHOLDS_V3.minimumObservedSegmentGroupCount
      ),
  };

  const ready = Object.values(gateSummary).every(Boolean);
  const blocked =
    !gateSummary.zeroCriticalRegressions ||
    !gateSummary.executionErrorRateWithinLimit;

  const core = {
    version: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
    application: "internal-promotion-dashboard" as const,
    publicServingEngine: "v2" as const,
    rawDecisionPayloadStored: false as const,
    piiAllowed: false as const,
    commercialFieldsAllowed: false as const,
    counts: {
      observations: observations.length,
      comparisons: comparisons.length,
      executionErrors: errors.length,
      exactDecisionAgreements,
      selectionDivergences,
      statusDivergences,
      abstentionDivergences,
      criticalRegressions,
    },
    rates: {
      executionErrorRate,
      exactDecisionAgreementRate: safeRate(
        exactDecisionAgreements,
        comparisons.length
      ),
      selectionAgreementRate: safeRate(
        comparisons.length - selectionDivergences,
        comparisons.length
      ),
      statusAgreementRate: safeRate(
        comparisons.length - statusDivergences,
        comparisons.length
      ),
      exactReasonAgreementRate: safeRate(
        comparisons.filter((item) => item.diff.exactReasonAgreement).length,
        comparisons.length
      ),
    },
    criticalRegressionCounts,
    reasonDiffCounts,
    segmentMetrics,
    gateSummary,
    status: ready
      ? ("ready-for-canary-review" as const)
      : blocked
        ? ("blocked-by-regression" as const)
        : ("collecting-shadow-evidence" as const),
    audit: createAuditIdentity(),
  };

  const withoutFingerprint: Omit<
    StayOptiShadowRegressionDashboardV3,
    "fingerprint"
  > = {
    dashboardId: createStableHashV3(
      {
        observationFingerprints: observations
          .map((item) => item.fingerprint)
          .sort(),
        core,
      },
      "stayopti-v3-shadow-dashboard-id"
    ),
    ...core,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createDashboardFingerprint(withoutFingerprint),
  };
}

export function validateShadowRegressionDashboardV3(
  dashboard: StayOptiShadowRegressionDashboardV3
): StayOptiShadowValidationV3 {
  const issues: StayOptiShadowValidationV3["issues"] = [];

  if (
    dashboard.version !== SMARTSTAY_SHADOW_PROMOTION_VERSION_V3 ||
    dashboard.application !== "internal-promotion-dashboard" ||
    dashboard.publicServingEngine !== "v2" ||
    dashboard.rawDecisionPayloadStored !== false ||
    dashboard.piiAllowed !== false ||
    dashboard.commercialFieldsAllowed !== false ||
    !isStableHashV3(dashboard.dashboardId) ||
    !isAuditIdentityValid(dashboard.audit) ||
    !["collecting-shadow-evidence", "blocked-by-regression", "ready-for-canary-review"].includes(
      dashboard.status
    )
  ) {
    issues.push("invalid-shape");
  }

  const { fingerprint, ...withoutFingerprint } = dashboard;
  if (fingerprint !== createDashboardFingerprint(withoutFingerprint)) {
    issues.push("fingerprint-mismatch");
  }

  if (findForbiddenFieldPaths(dashboard).length > 0) {
    issues.push("invalid-shape");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

function isEvidenceFingerprint(value: unknown) {
  return (
    isStableHashV3(value) ||
    (typeof value === "string" && /^sha256-[0-9a-f]{64}$/.test(value))
  );
}

function validateGateEvidence(
  evidence: StayOptiPromotionGateEvidenceV3,
  label: string
) {
  requireExactKeys(
    evidence as unknown as Record<string, unknown>,
    ["status", "evidenceFingerprint"],
    label
  );

  if (!["pass", "fail", "pending"].includes(evidence.status)) {
    throw new Error(`${label} has an invalid status.`);
  }

  if (
    evidence.status === "pending"
      ? evidence.evidenceFingerprint !== null
      : !isEvidenceFingerprint(evidence.evidenceFingerprint)
  ) {
    throw new Error(`${label} has invalid evidence linkage.`);
  }
}

function validateExternalGates(gates: StayOptiPromotionExternalGatesV3) {
  requireExactKeys(
    gates as unknown as Record<string, unknown>,
    [
      "publicRateConsistency",
      "invariants",
      "security",
      "humanEvaluation",
      "monitoring",
    ],
    "Promotion external gates"
  );

  validateGateEvidence(gates.publicRateConsistency, "publicRateConsistency");
  validateGateEvidence(gates.invariants, "invariants");
  validateGateEvidence(gates.security, "security");
  validateGateEvidence(gates.humanEvaluation, "humanEvaluation");
  validateGateEvidence(gates.monitoring, "monitoring");
}

function canaryEvidencePasses(evidence: StayOptiCanaryEvidenceV3) {
  return (
    evidence.status === "pass" &&
    evidence.observationCount >=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.minimumCanaryObservationCount &&
    evidence.monitoredHours >=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.minimumCanaryMonitoredHours &&
    evidence.errorRateRegression !== null &&
    evidence.errorRateRegression <=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumCanaryErrorRateRegression &&
    evidence.p95LatencyRegressionMs !== null &&
    evidence.p95LatencyRegressionMs <=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumCanaryP95LatencyRegressionMs &&
    evidence.criticalRegressionCount === 0 &&
    evidence.rollbackDrill === "pass" &&
    isEvidenceFingerprint(evidence.evidenceFingerprint)
  );
}

function validateCanaryEvidence(evidence: StayOptiCanaryEvidenceV3) {
  requireExactKeys(
    evidence as unknown as Record<string, unknown>,
    [
      "status",
      "observationCount",
      "monitoredHours",
      "errorRateRegression",
      "p95LatencyRegressionMs",
      "criticalRegressionCount",
      "rollbackDrill",
      "evidenceFingerprint",
    ],
    "Canary evidence"
  );

  if (
    !["not-run", "pass", "fail"].includes(evidence.status) ||
    !Number.isInteger(evidence.observationCount) ||
    evidence.observationCount < 0 ||
    !Number.isFinite(evidence.monitoredHours) ||
    evidence.monitoredHours < 0 ||
    !Number.isInteger(evidence.criticalRegressionCount) ||
    evidence.criticalRegressionCount < 0 ||
    !["not-run", "pass", "fail"].includes(evidence.rollbackDrill) ||
    [evidence.errorRateRegression, evidence.p95LatencyRegressionMs].some(
      (value) => value !== null && (!Number.isFinite(value) || value < 0)
    )
  ) {
    throw new Error("Canary evidence contains invalid values.");
  }

  if (
    evidence.status === "not-run"
      ? evidence.evidenceFingerprint !== null
      : !isEvidenceFingerprint(evidence.evidenceFingerprint)
  ) {
    throw new Error("Canary evidence linkage is invalid.");
  }
}

function createPromotionReviewFingerprint(
  review: Omit<StayOptiPromotionReviewV3, "fingerprint">
) {
  return createStableHashV3(review, "stayopti-v3-promotion-review");
}

export function createPromotionReviewV3(input: {
  evaluationResult: StayOptiEvaluationCalibrationResultV3 | null;
  shadowDashboard: StayOptiShadowRegressionDashboardV3 | null;
  externalGates: StayOptiPromotionExternalGatesV3;
  canaryEvidence: StayOptiCanaryEvidenceV3;
}): StayOptiPromotionReviewV3 {
  validateExternalGates(input.externalGates);
  validateCanaryEvidence(input.canaryEvidence);

  const evaluationPass =
    input.evaluationResult !== null &&
    validateEvaluationCalibrationResultV3(input.evaluationResult).valid &&
    input.evaluationResult.status === "pass" &&
    input.evaluationResult.candidatePolicy.state ===
      "eligible-for-v3-11-shadow-gate";
  const dashboardPass =
    input.shadowDashboard !== null &&
    validateShadowRegressionDashboardV3(input.shadowDashboard).valid &&
    input.shadowDashboard.status === "ready-for-canary-review";

  const gateResults: StayOptiPromotionGateResultV3[] = [
    {
      gateId: "evaluation-calibration",
      status: evaluationPass
        ? "pass"
        : input.evaluationResult === null
          ? "pending"
          : "fail",
      requiredFor: ["shadow", "canary", "public"],
      evidenceFingerprint: input.evaluationResult?.fingerprint ?? null,
    },
    {
      gateId: "public-rate-consistency",
      status: input.externalGates.publicRateConsistency.status,
      requiredFor: ["shadow", "canary", "public"],
      evidenceFingerprint:
        input.externalGates.publicRateConsistency.evidenceFingerprint,
    },
    {
      gateId: "invariants",
      status: input.externalGates.invariants.status,
      requiredFor: ["shadow", "canary", "public"],
      evidenceFingerprint: input.externalGates.invariants.evidenceFingerprint,
    },
    {
      gateId: "security",
      status: input.externalGates.security.status,
      requiredFor: ["shadow", "canary", "public"],
      evidenceFingerprint: input.externalGates.security.evidenceFingerprint,
    },
    {
      gateId: "human-evaluation",
      status: input.externalGates.humanEvaluation.status,
      requiredFor: ["shadow", "canary", "public"],
      evidenceFingerprint: input.externalGates.humanEvaluation.evidenceFingerprint,
    },
    {
      gateId: "shadow-dashboard",
      status: dashboardPass
        ? "pass"
        : input.shadowDashboard === null
          ? "pending"
          : "fail",
      requiredFor: ["canary", "public"],
      evidenceFingerprint: input.shadowDashboard?.fingerprint ?? null,
    },
    {
      gateId: "monitoring",
      status: input.externalGates.monitoring.status,
      requiredFor: ["canary", "public"],
      evidenceFingerprint: input.externalGates.monitoring.evidenceFingerprint,
    },
    {
      gateId: "canary-evidence",
      status: canaryEvidencePasses(input.canaryEvidence)
        ? "pass"
        : input.canaryEvidence.status === "not-run"
          ? "pending"
          : "fail",
      requiredFor: ["public"],
      evidenceFingerprint: input.canaryEvidence.evidenceFingerprint,
    },
  ];

  const passFor = (stage: "shadow" | "canary" | "public") =>
    gateResults
      .filter((gate) => gate.requiredFor.includes(stage))
      .every((gate) => gate.status === "pass");

  const stageEligibility = {
    shadow: passFor("shadow"),
    canary: passFor("canary"),
    public: passFor("public"),
  };
  const highestEligibleStage: StayOptiPromotionStageV3 =
    stageEligibility.public
      ? "public"
      : stageEligibility.canary
        ? "canary"
        : stageEligibility.shadow
          ? "shadow"
          : "off";

  const reasonCodes = uniqueReasonCodesV3([
    "promotion:v2-public-authority",
    "promotion:public-disabled",
    "promotion:no-automatic-promotion",
    "promotion:manual-approval-required",
    "promotion:policy-audit-visible",
    "promotion:kill-switch-armed",
    evaluationPass
      ? "evaluation:gate-pass"
      : "promotion:calibration-gate-required",
    input.externalGates.humanEvaluation.status === "pass"
      ? "evaluation:blind-human-required"
      : "promotion:human-gate-required",
    input.externalGates.publicRateConsistency.status === "pass"
      ? "promotion:public-rates-verified"
      : "integrity:public-rates-unverified",
    input.externalGates.monitoring.status === "pass"
      ? "promotion:policy-audit-visible"
      : "promotion:monitoring-required",
    stageEligibility.canary
      ? "promotion:canary-eligible"
      : "promotion:canary-blocked",
    ...((input.shadowDashboard?.counts.criticalRegressions ?? 0) > 0
      ? (["promotion:critical-regression-blocked"] as const)
      : []),
  ]);

  const core = {
    version: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
    phase: "v3-11" as const,
    publicServingEngine: "v2" as const,
    publicV3Enabled: false as const,
    automaticPromotionAllowed: false as const,
    manualApprovalRequired: true as const,
    highestEligibleStage,
    stageEligibility,
    gateResults,
    reasonCodes,
    audit: createAuditIdentity(),
  };

  const withoutFingerprint: Omit<StayOptiPromotionReviewV3, "fingerprint"> = {
    reviewId: createStableHashV3(core, "stayopti-v3-promotion-review-id"),
    ...core,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createPromotionReviewFingerprint(withoutFingerprint),
  };
}

export function validatePromotionReviewV3(
  review: StayOptiPromotionReviewV3
): StayOptiShadowValidationV3 {
  const issues: StayOptiShadowValidationV3["issues"] = [];
  if (
    review.version !== SMARTSTAY_SHADOW_PROMOTION_VERSION_V3 ||
    review.phase !== "v3-11" ||
    review.publicServingEngine !== "v2" ||
    review.publicV3Enabled !== false ||
    review.automaticPromotionAllowed !== false ||
    review.manualApprovalRequired !== true ||
    !isStableHashV3(review.reviewId) ||
    !isAuditIdentityValid(review.audit) ||
    !Array.isArray(review.reasonCodes) ||
    review.reasonCodes.some((code) => !isSmartStayReasonCodeV3(code)) ||
    !["off", "shadow", "canary", "public"].includes(
      review.highestEligibleStage
    )
  ) {
    issues.push("invalid-shape");
  }

  const gateIds = review.gateResults.map((gate) => gate.gateId);
  const gateIdSet = new Set(gateIds);
  const expectedGateIds = Object.keys(PROMOTION_GATE_REQUIREMENTS) as Array<
    StayOptiPromotionGateResultV3["gateId"]
  >;
  if (
    gateIds.length !== expectedGateIds.length ||
    gateIdSet.size !== expectedGateIds.length ||
    expectedGateIds.some((gateId) => !gateIdSet.has(gateId)) ||
    review.gateResults.some((gate) => {
      const expectedRequirements = PROMOTION_GATE_REQUIREMENTS[gate.gateId];
      return (
        expectedRequirements === undefined ||
        !["pass", "fail", "pending"].includes(gate.status) ||
        JSON.stringify(gate.requiredFor) !==
          JSON.stringify(expectedRequirements) ||
        (gate.status === "pending"
          ? gate.evidenceFingerprint !== null
          : !isEvidenceFingerprint(gate.evidenceFingerprint))
      );
    })
  ) {
    issues.push("invalid-shape");
  }

  const gatePassesFor = (stage: "shadow" | "canary" | "public") =>
    expectedGateIds
      .filter((gateId) => PROMOTION_GATE_REQUIREMENTS[gateId].includes(stage))
      .every(
        (gateId) =>
          review.gateResults.find((gate) => gate.gateId === gateId)?.status ===
          "pass"
      );
  if (
    review.stageEligibility.shadow !== gatePassesFor("shadow") ||
    review.stageEligibility.canary !== gatePassesFor("canary") ||
    review.stageEligibility.public !== gatePassesFor("public")
  ) {
    issues.push("invalid-shape");
  }

  const expectedHighest = review.stageEligibility.public
    ? "public"
    : review.stageEligibility.canary
      ? "canary"
      : review.stageEligibility.shadow
        ? "shadow"
        : "off";
  if (review.highestEligibleStage !== expectedHighest) {
    issues.push("invalid-shape");
  }

  const { fingerprint, ...withoutFingerprint } = review;
  if (fingerprint !== createPromotionReviewFingerprint(withoutFingerprint)) {
    issues.push("fingerprint-mismatch");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

function createAuthorizationFingerprint(
  authorization: Omit<StayOptiPromotionAuthorizationV3, "fingerprint">
) {
  return createStableHashV3(authorization, "stayopti-v3-promotion-authorization");
}

export function createPromotionAuthorizationV3(input: {
  review: StayOptiPromotionReviewV3;
  targetStage: Exclude<StayOptiPromotionStageV3, "off">;
  manualApprovalToken: string | null;
}): StayOptiPromotionAuthorizationV3 {
  if (!validatePromotionReviewV3(input.review).valid) {
    throw new Error("Promotion authorization requires a valid review.");
  }

  if (!["shadow", "canary", "public"].includes(input.targetStage)) {
    throw new Error("Promotion target stage is invalid.");
  }

  const manualApprovalRecorded = input.manualApprovalToken !== null;
  if (manualApprovalRecorded) {
    requireOpaqueToken(input.manualApprovalToken, "manualApprovalToken");
  }

  const eligible =
    STAGE_RANK[input.targetStage] <=
    STAGE_RANK[input.review.highestEligibleStage];
  const authorized = eligible && manualApprovalRecorded;

  const core = {
    version: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
    targetStage: input.targetStage,
    status: authorized ? ("authorized" as const) : ("blocked" as const),
    reviewFingerprint: input.review.fingerprint,
    manualApprovalRecorded,
    automaticPromotion: false as const,
    publicServingEngine:
      authorized && input.targetStage === "public"
        ? ("v3" as const)
        : authorized && input.targetStage === "canary"
          ? ("mixed-canary" as const)
          : ("v2" as const),
    canaryAllocationLimitBasisPoints:
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumInitialCanaryBasisPoints,
    killSwitch: "armed" as const,
    audit: createAuditIdentity(),
  };

  const withoutFingerprint: Omit<
    StayOptiPromotionAuthorizationV3,
    "fingerprint"
  > = {
    authorizationId: createStableHashV3(
      {
        reviewFingerprint: input.review.fingerprint,
        targetStage: input.targetStage,
        approvalFingerprint:
          input.manualApprovalToken === null
            ? null
            : createStableHashV3(
                input.manualApprovalToken,
                "stayopti-v3-manual-approval"
              ),
      },
      "stayopti-v3-promotion-authorization-id"
    ),
    ...core,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createAuthorizationFingerprint(withoutFingerprint),
  };
}

export function validatePromotionAuthorizationV3(
  authorization: StayOptiPromotionAuthorizationV3
) {
  const { fingerprint, ...withoutFingerprint } = authorization;
  return (
    authorization.version === SMARTSTAY_SHADOW_PROMOTION_VERSION_V3 &&
    isStableHashV3(authorization.authorizationId) &&
    isStableHashV3(authorization.reviewFingerprint) &&
    ["shadow", "canary", "public"].includes(authorization.targetStage) &&
    ["authorized", "blocked"].includes(authorization.status) &&
    typeof authorization.manualApprovalRecorded === "boolean" &&
    (authorization.status !== "authorized" ||
      authorization.manualApprovalRecorded) &&
    authorization.automaticPromotion === false &&
    authorization.killSwitch === "armed" &&
    authorization.canaryAllocationLimitBasisPoints ===
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumInitialCanaryBasisPoints &&
    authorization.publicServingEngine ===
      (authorization.status === "authorized" &&
      authorization.targetStage === "public"
        ? "v3"
        : authorization.status === "authorized" &&
            authorization.targetStage === "canary"
          ? "mixed-canary"
          : "v2") &&
    isAuditIdentityValid(authorization.audit) &&
    fingerprint === createAuthorizationFingerprint(withoutFingerprint)
  );
}

function createKillSwitchFingerprint(
  state: Omit<StayOptiKillSwitchStateV3, "fingerprint">
) {
  return createStableHashV3(state, "stayopti-v3-kill-switch");
}

export function evaluatePromotionKillSwitchV3(input: {
  manualTrigger: boolean;
  priceIntegrity: "pass" | "fail";
  publicRateConsistency: "verified" | "failed";
  criticalRegressionCount: number;
  errorRateRegression: number;
  p95LatencyRegressionMs: number;
}): StayOptiKillSwitchStateV3 {
  if (
    typeof input.manualTrigger !== "boolean" ||
    !["pass", "fail"].includes(input.priceIntegrity) ||
    !["verified", "failed"].includes(input.publicRateConsistency) ||
    !Number.isInteger(input.criticalRegressionCount) ||
    input.criticalRegressionCount < 0 ||
    !Number.isFinite(input.errorRateRegression) ||
    input.errorRateRegression < 0 ||
    !Number.isFinite(input.p95LatencyRegressionMs) ||
    input.p95LatencyRegressionMs < 0
  ) {
    throw new Error("Kill-switch telemetry is invalid.");
  }

  const triggerCodes: StayOptiKillSwitchStateV3["triggerCodes"] = [];
  if (input.manualTrigger) triggerCodes.push("manual-trigger");
  if (input.priceIntegrity === "fail") triggerCodes.push("price-integrity");
  if (input.publicRateConsistency === "failed") {
    triggerCodes.push("public-rate-integrity");
  }
  if (input.criticalRegressionCount > 0) triggerCodes.push("critical-regression");
  if (
    input.errorRateRegression >
    STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumCanaryErrorRateRegression
  ) {
    triggerCodes.push("error-rate-regression");
  }
  if (
    input.p95LatencyRegressionMs >
    STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumCanaryP95LatencyRegressionMs
  ) {
    triggerCodes.push("latency-regression");
  }

  const active = triggerCodes.length > 0;
  const core = {
    version: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
    armed: true as const,
    active,
    rollbackRequired: active,
    triggerCodes,
    audit: createAuditIdentity(),
  };
  const withoutFingerprint: Omit<StayOptiKillSwitchStateV3, "fingerprint"> = {
    stateId: createStableHashV3(core, "stayopti-v3-kill-switch-id"),
    ...core,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createKillSwitchFingerprint(withoutFingerprint),
  };
}

export function validateKillSwitchStateV3(state: StayOptiKillSwitchStateV3) {
  const { fingerprint, ...withoutFingerprint } = state;
  const allowedTriggers: StayOptiKillSwitchStateV3["triggerCodes"] = [
    "manual-trigger",
    "price-integrity",
    "public-rate-integrity",
    "critical-regression",
    "error-rate-regression",
    "latency-regression",
  ];
  return (
    state.version === SMARTSTAY_SHADOW_PROMOTION_VERSION_V3 &&
    state.armed === true &&
    state.active === (state.triggerCodes.length > 0) &&
    state.rollbackRequired === state.active &&
    state.triggerCodes.every((code) => allowedTriggers.includes(code)) &&
    new Set(state.triggerCodes).size === state.triggerCodes.length &&
    isAuditIdentityValid(state.audit) &&
    isStableHashV3(state.stateId) &&
    fingerprint === createKillSwitchFingerprint(withoutFingerprint)
  );
}

function createAssignmentFingerprint(
  assignment: Omit<StayOptiServingAssignmentV3, "fingerprint">
) {
  return createStableHashV3(assignment, "stayopti-v3-serving-assignment");
}

export function createServingAssignmentV3(input: {
  authorization: StayOptiPromotionAuthorizationV3;
  exposureToken: string;
  canaryAllocationBasisPoints: number;
  killSwitch: StayOptiKillSwitchStateV3;
}): StayOptiServingAssignmentV3 {
  if (!validatePromotionAuthorizationV3(input.authorization)) {
    throw new Error("Serving assignment requires a valid promotion authorization.");
  }
  if (!validateKillSwitchStateV3(input.killSwitch)) {
    throw new Error("Serving assignment requires a valid kill-switch state.");
  }
  requireOpaqueToken(input.exposureToken, "exposureToken");

  if (
    !Number.isInteger(input.canaryAllocationBasisPoints) ||
    input.canaryAllocationBasisPoints < 0 ||
    input.canaryAllocationBasisPoints >
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumInitialCanaryBasisPoints
  ) {
    throw new Error("Canary allocation exceeds the frozen initial limit.");
  }

  const bucket =
    Number.parseInt(
      createStableHashV3(
        input.exposureToken,
        "stayopti-v3-canary-bucket"
      ).slice(-8),
      16
    ) % 10_000;

  let servingEngine: StayOptiServingEngineV3 = "v2";
  let reason: StayOptiServingAssignmentV3["reason"] =
    "authorization-blocked";
  let canaryBucket: number | null = null;
  let canaryAllocationBasisPoints = 0;

  if (input.killSwitch.active) {
    reason = "kill-switch-v2-fallback";
  }
  else if (input.authorization.status !== "authorized") {
    reason = "authorization-blocked";
  }
  else if (input.authorization.targetStage === "shadow") {
    reason = "shadow-v2-authoritative";
  }
  else if (input.authorization.targetStage === "canary") {
    canaryBucket = bucket;
    canaryAllocationBasisPoints = input.canaryAllocationBasisPoints;
    if (bucket < input.canaryAllocationBasisPoints) {
      servingEngine = "v3";
      reason = "canary-v3-assigned";
    }
    else {
      reason = "canary-v2-control";
    }
  }
  else {
    servingEngine = "v3";
    reason = "public-v3-authorized";
  }

  const core = {
    version: SMARTSTAY_SHADOW_PROMOTION_VERSION_V3,
    targetStage: input.authorization.targetStage,
    servingEngine,
    canaryBucket,
    canaryAllocationBasisPoints,
    killSwitchActive: input.killSwitch.active,
    rollbackRequired: input.killSwitch.rollbackRequired,
    reason,
    audit: createAuditIdentity(),
  };
  const withoutFingerprint: Omit<StayOptiServingAssignmentV3, "fingerprint"> = {
    assignmentId: createStableHashV3(
      {
        authorizationFingerprint: input.authorization.fingerprint,
        exposureFingerprint: createStableHashV3(
          input.exposureToken,
          "stayopti-v3-canary-exposure"
        ),
        killSwitchFingerprint: input.killSwitch.fingerprint,
        canaryAllocationBasisPoints,
      },
      "stayopti-v3-serving-assignment-id"
    ),
    ...core,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createAssignmentFingerprint(withoutFingerprint),
  };
}

export function validateServingAssignmentV3(
  assignment: StayOptiServingAssignmentV3
) {
  const { fingerprint, ...withoutFingerprint } = assignment;
  const validCanaryBucket =
    assignment.canaryBucket === null ||
    (Number.isInteger(assignment.canaryBucket) &&
      assignment.canaryBucket >= 0 &&
      assignment.canaryBucket < 10_000);
  const validReasonEnginePair =
    [
      "authorization-blocked",
      "shadow-v2-authoritative",
      "canary-v2-control",
      "kill-switch-v2-fallback",
    ].includes(assignment.reason)
      ? assignment.servingEngine === "v2"
      : assignment.servingEngine === "v3";
  const validKillSwitchFallback = assignment.killSwitchActive
    ? assignment.servingEngine === "v2" &&
      assignment.reason === "kill-switch-v2-fallback"
    : assignment.reason !== "kill-switch-v2-fallback";
  return (
    assignment.version === SMARTSTAY_SHADOW_PROMOTION_VERSION_V3 &&
    isStableHashV3(assignment.assignmentId) &&
    ["shadow", "canary", "public"].includes(assignment.targetStage) &&
    ["v2", "v3"].includes(assignment.servingEngine) &&
    Number.isInteger(assignment.canaryAllocationBasisPoints) &&
    assignment.canaryAllocationBasisPoints >= 0 &&
    assignment.canaryAllocationBasisPoints <=
      STAYOPTI_PROMOTION_THRESHOLDS_V3.maximumInitialCanaryBasisPoints &&
    validCanaryBucket &&
    validReasonEnginePair &&
    validKillSwitchFallback &&
    assignment.rollbackRequired === assignment.killSwitchActive &&
    isAuditIdentityValid(assignment.audit) &&
    fingerprint === createAssignmentFingerprint(withoutFingerprint)
  );
}
