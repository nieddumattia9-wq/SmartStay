import assert from "node:assert/strict";
import test from "node:test";

import {
  SMARTSTAY_V3_VERSIONS,
  STAYOPTI_PROMOTION_THRESHOLDS_V3,
  createBlindEvaluationSetV3,
  createDefaultPromotionControlV3,
  createEvaluationCalibrationPlanV3,
  createGoldenDatasetV3,
  createPromotionAuthorizationV3,
  createPromotionReviewV3,
  createServingAssignmentV3,
  createShadowComparisonV3,
  createShadowRegressionDashboardV3,
  createStableHashV3,
  evaluatePromotionKillSwitchV3,
  evaluateV3AgainstV2Offline,
  runV3ShadowSafelyV3,
  validateDefaultPromotionControlV3,
  validateKillSwitchStateV3,
  validatePromotionAuthorizationV3,
  validatePromotionReviewV3,
  validateServingAssignmentV3,
  validateShadowObservationV3,
  validateShadowRegressionDashboardV3,
  type StayOptiBlindJudgmentInputV3,
  type StayOptiComparableDecisionV3,
  type StayOptiEvaluationSegmentV3,
  type StayOptiGoldenCaseInputV3,
  type StayOptiPromotionExternalGatesV3,
  type StayOptiShadowComparisonV3,
  type StayOptiShadowSafetySignalsV3,
} from "../../src/engine-v3";

const PROFILES = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
] as const;

const DESTINATIONS = [
  "urban",
  "resort",
  "rural",
  "airport",
  "mixed",
] as const;

const LEAD_TIMES = [
  "same-week",
  "short",
  "medium",
  "long",
  "very-long",
] as const;

const DURATIONS = [
  "one-night",
  "short-stay",
  "medium-stay",
  "long-stay",
  "extended-stay",
] as const;

const COVERAGE = [
  "high",
  "medium",
  "low",
  "unknown",
] as const;

function createSegment(index: number): StayOptiEvaluationSegmentV3 {
  return {
    profile: PROFILES[index % PROFILES.length],
    destination: DESTINATIONS[index % DESTINATIONS.length],
    leadTime: LEAD_TIMES[index % LEAD_TIMES.length],
    duration: DURATIONS[index % DURATIONS.length],
    coverage: COVERAGE[index % COVERAGE.length],
  };
}

function createDecision(
  engine: "v2" | "v3",
  index: number,
  overrides: Partial<StayOptiComparableDecisionV3> = {}
): StayOptiComparableDecisionV3 {
  const selectedSolutionToken = `solution-${index.toString().padStart(6, "0")}`;
  const core = {
    engine,
    engineVersion:
      engine === "v2" ? "2.0.0" : SMARTSTAY_V3_VERSIONS.engine,
    policyVersion:
      engine === "v2" ? "2.0.0-policy" : SMARTSTAY_V3_VERSIONS.policy,
    status: "recommended" as const,
    selectedSolutionToken,
    role: "best-choice" as const,
    reasonCodes: ["decision:recommended", "role:best-choice"],
    ...overrides,
  };

  return {
    ...core,
    decisionFingerprint: createStableHashV3(
      core,
      `stayopti-${engine}-shadow-decision`
    ),
  };
}

function createPassingSafety(): StayOptiShadowSafetySignalsV3 {
  return {
    priceIntegrity: "pass",
    publicRateConsistency: "verified",
    commercialFirewall: "pass",
    privacyFirewall: "pass",
    deterministicReplay: "pass",
    hardConstraints: "pass",
    recommendationSafety: "pass",
  };
}

function createComparison(
  index: number,
  safety = createPassingSafety()
): StayOptiShadowComparisonV3 {
  return createShadowComparisonV3({
    comparisonToken: `shadow-observation-${index.toString().padStart(6, "0")}`,
    segment: createSegment(index),
    v2: createDecision("v2", index),
    v3: createDecision("v3", index),
    safety,
  });
}

function createPassingShadowObservations() {
  return Array.from(
    { length: STAYOPTI_PROMOTION_THRESHOLDS_V3.minimumShadowObservationCount },
    (_, index) => createComparison(index)
  );
}

function evidenceFingerprint(character: string) {
  return `sha256-${character.repeat(64)}`;
}

function createPassingExternalGates(): StayOptiPromotionExternalGatesV3 {
  return {
    publicRateConsistency: {
      status: "pass",
      evidenceFingerprint: evidenceFingerprint("a"),
    },
    invariants: {
      status: "pass",
      evidenceFingerprint: evidenceFingerprint("b"),
    },
    security: {
      status: "pass",
      evidenceFingerprint: evidenceFingerprint("c"),
    },
    humanEvaluation: {
      status: "pass",
      evidenceFingerprint: evidenceFingerprint("d"),
    },
    monitoring: {
      status: "pass",
      evidenceFingerprint: evidenceFingerprint("e"),
    },
  };
}

function winnerSide(
  desired: "v2" | "v3" | "tie",
  leftEngine: "v2" | "v3"
) {
  if (desired === "tie") return "tie" as const;
  return desired === leftEngine ? ("left" as const) : ("right" as const);
}

function createPassingEvaluation() {
  const cases = Array.from(
    { length: 200 },
    (_, index): StayOptiGoldenCaseInputV3 => {
      const savingCase = index % 2 === 0;
      return {
        caseId: `case-${index.toString().padStart(6, "0")}`,
        caseType:
          index < 120
            ? "baseline"
            : index < 160
              ? "adversarial"
              : "counterfactual",
        segment: createSegment(index),
        currency: index % 4 < 2 ? "EUR" : "USD",
        oracleUtility: 0.95,
        shouldAbstain: index < 20,
        v2: {
          abstained: false,
          predictedConfidence: 0.7,
          decisionCorrect: false,
          realizedUtility: 0.75,
          selectedQuality: 0.8,
          selectedCost: savingCase ? 120 : 100,
        },
        v3: {
          abstained: index < 20,
          predictedConfidence: 0.95,
          decisionCorrect: true,
          realizedUtility: 0.9,
          selectedQuality: savingCase ? 0.8 : 0.9,
          selectedCost: savingCase ? 100 : 120,
        },
        v3StableUnderPerturbation: index < 190,
        providerNeutralReplay: index < 198 ? "stable" : "changed",
        criticalRegressions: [],
      };
    }
  );

  const human = Array.from(
    { length: 300 },
    (_, index): StayOptiBlindJudgmentInputV3 => {
      const leftEngine = index % 2 === 0 ? "v2" : "v3";
      const desired = index < 210 ? "v3" : index < 240 ? "tie" : "v2";
      return {
        judgmentId: `judgment-human-${index.toString().padStart(5, "0")}`,
        caseId: `case-${(index % 200).toString().padStart(6, "0")}`,
        evaluatorToken: `evaluator-human-${(index % 30).toString().padStart(3, "0")}`,
        evaluatorType: "human",
        blinded: true,
        leftEngine,
        rightEngine: leftEngine === "v2" ? "v3" : "v2",
        winner: winnerSide(desired, leftEngine),
      };
    }
  );

  const expert = Array.from(
    { length: 100 },
    (_, index): StayOptiBlindJudgmentInputV3 => {
      const leftEngine = index % 2 === 0 ? "v3" : "v2";
      const desired = index < 70 ? "v3" : index < 80 ? "tie" : "v2";
      return {
        judgmentId: `judgment-expert-${index.toString().padStart(5, "0")}`,
        caseId: `case-${(index % 200).toString().padStart(6, "0")}`,
        evaluatorToken: `evaluator-expert-${(index % 20).toString().padStart(3, "0")}`,
        evaluatorType: "expert",
        blinded: true,
        leftEngine,
        rightEngine: leftEngine === "v2" ? "v3" : "v2",
        winner: winnerSide(desired, leftEngine),
      };
    }
  );

  const plan = createEvaluationCalibrationPlanV3({
    sourceDecisionInputFingerprint: "fnv1a32-1234abcd",
  });

  return evaluateV3AgainstV2Offline({
    plan,
    dataset: createGoldenDatasetV3(cases),
    blindEvaluation: createBlindEvaluationSetV3([...human, ...expert]),
  });
}

function createNoCanaryEvidence() {
  return {
    status: "not-run" as const,
    observationCount: 0,
    monitoredHours: 0,
    errorRateRegression: null,
    p95LatencyRegressionMs: null,
    criticalRegressionCount: 0,
    rollbackDrill: "not-run" as const,
    evidenceFingerprint: null,
  };
}

test("V3-11 defaults to V2 public with V3 disabled and no automatic promotion", () => {
  const control = createDefaultPromotionControlV3();

  assert.equal(control.stage, "off");
  assert.equal(control.publicServingEngine, "v2");
  assert.equal(control.v3Execution, "disabled");
  assert.equal(control.canaryAllocationBasisPoints, 0);
  assert.equal(control.automaticPromotionAllowed, false);
  assert.equal(control.publicV3Enabled, false);
  assert.equal(control.manualApprovalRequired, true);
  assert.equal(control.killSwitch, "armed");
  assert.equal(validateDefaultPromotionControlV3(control), true);
});

test("shadow execution returns the exact V2 public object and records deterministic diffs", () => {
  const publicV2Result = { hotels: ["v2-hotel"], total: 1 };
  const result = runV3ShadowSafelyV3({
    mode: "shadow",
    comparisonToken: "shadow-request-000001",
    segment: createSegment(1),
    publicV2Result,
    v2Decision: createDecision("v2", 1),
    safety: createPassingSafety(),
    runV3: () =>
      createDecision("v3", 1, {
        reasonCodes: ["role:best-choice", "decision:recommended"],
      }),
  });

  assert.equal(result.publicResult, publicV2Result);
  assert.equal(result.publicServingEngine, "v2");
  assert.equal(result.v3Executed, true);
  assert.equal(result.shadowObservation?.recordType, "shadow-comparison");
  assert.equal(
    result.shadowObservation === null
      ? false
      : validateShadowObservationV3(result.shadowObservation).valid,
    true
  );
  if (result.shadowObservation?.recordType === "shadow-comparison") {
    assert.equal(result.shadowObservation.diff.kind, "none");
    assert.equal(result.shadowObservation.diff.exactReasonAgreement, true);
  }
});

test("a V3 exception remains non-authoritative and never leaks raw error text", () => {
  const publicV2Result = { result: "still-public-v2" };
  const result = runV3ShadowSafelyV3({
    mode: "shadow",
    comparisonToken: "shadow-request-000002",
    segment: createSegment(2),
    publicV2Result,
    v2Decision: createDecision("v2", 2),
    safety: createPassingSafety(),
    runV3: () => {
      throw new Error("secret provider payload should never be persisted");
    },
  });

  assert.equal(result.publicResult, publicV2Result);
  assert.equal(result.publicServingEngine, "v2");
  assert.equal(result.shadowObservation?.recordType, "shadow-error");
  assert.equal(
    JSON.stringify(result.shadowObservation).includes("secret provider"),
    false
  );
});

test("shadow records reject PII, provider and commercial fields", () => {
  const input = {
    comparisonToken: "shadow-request-000003",
    segment: createSegment(3),
    v2: createDecision("v2", 3),
    v3: createDecision("v3", 3),
    safety: createPassingSafety(),
    commission: 12,
  };

  assert.throws(
    () => createShadowComparisonV3(input as never),
    /PII, booking, provider or commercial/
  );
});

test("the shadow dashboard aggregates enough balanced evidence for canary review", () => {
  const dashboard = createShadowRegressionDashboardV3(
    createPassingShadowObservations()
  );

  assert.equal(dashboard.counts.observations, 1_000);
  assert.equal(dashboard.counts.comparisons, 1_000);
  assert.equal(dashboard.counts.executionErrors, 0);
  assert.equal(dashboard.counts.criticalRegressions, 0);
  assert.equal(dashboard.status, "ready-for-canary-review");
  assert.equal(dashboard.rawDecisionPayloadStored, false);
  assert.equal(dashboard.piiAllowed, false);
  assert.equal(dashboard.commercialFieldsAllowed, false);
  assert.equal(validateShadowRegressionDashboardV3(dashboard).valid, true);

  const mutated = structuredClone(dashboard);
  mutated.counts.criticalRegressions = 1;
  assert.equal(validateShadowRegressionDashboardV3(mutated).valid, false);
});

test("one critical price regression blocks the dashboard", () => {
  const observations = createPassingShadowObservations();
  observations[0] = createComparison(0, {
    ...createPassingSafety(),
    priceIntegrity: "fail",
  });
  const dashboard = createShadowRegressionDashboardV3(observations);

  assert.equal(dashboard.status, "blocked-by-regression");
  assert.equal(dashboard.gateSummary.zeroCriticalRegressions, false);
  assert.ok(
    dashboard.criticalRegressionCounts.some(
      (item) => item.code === "price-integrity" && item.count === 1
    )
  );
});

test("promotion review cannot leave off without real evaluation and human evidence", () => {
  const gates = createPassingExternalGates();
  gates.humanEvaluation = {
    status: "pending",
    evidenceFingerprint: null,
  };
  const review = createPromotionReviewV3({
    evaluationResult: null,
    shadowDashboard: null,
    externalGates: gates,
    canaryEvidence: createNoCanaryEvidence(),
  });

  assert.equal(review.highestEligibleStage, "off");
  assert.equal(review.publicV3Enabled, false);
  assert.equal(review.automaticPromotionAllowed, false);
  assert.ok(review.reasonCodes.includes("promotion:human-gate-required"));
  assert.ok(review.reasonCodes.includes("promotion:calibration-gate-required"));
  assert.equal(validatePromotionReviewV3(review).valid, true);
});

test("gates progress only from shadow to canary to public eligibility", () => {
  const evaluation = createPassingEvaluation();
  assert.equal(evaluation.status, "pass");

  const shadowReview = createPromotionReviewV3({
    evaluationResult: evaluation,
    shadowDashboard: null,
    externalGates: createPassingExternalGates(),
    canaryEvidence: createNoCanaryEvidence(),
  });
  assert.equal(shadowReview.highestEligibleStage, "shadow");

  const dashboard = createShadowRegressionDashboardV3(
    createPassingShadowObservations()
  );
  const canaryReview = createPromotionReviewV3({
    evaluationResult: evaluation,
    shadowDashboard: dashboard,
    externalGates: createPassingExternalGates(),
    canaryEvidence: createNoCanaryEvidence(),
  });
  assert.equal(canaryReview.highestEligibleStage, "canary");

  const publicReview = createPromotionReviewV3({
    evaluationResult: evaluation,
    shadowDashboard: dashboard,
    externalGates: createPassingExternalGates(),
    canaryEvidence: {
      status: "pass",
      observationCount: 500,
      monitoredHours: 24,
      errorRateRegression: 0.001,
      p95LatencyRegressionMs: 50,
      criticalRegressionCount: 0,
      rollbackDrill: "pass",
      evidenceFingerprint: evidenceFingerprint("f"),
    },
  });
  assert.equal(publicReview.highestEligibleStage, "public");
  assert.equal(publicReview.publicV3Enabled, false);
});

test("eligible stages still require manual authorization and never store its token", () => {
  const evaluation = createPassingEvaluation();
  const dashboard = createShadowRegressionDashboardV3(
    createPassingShadowObservations()
  );
  const review = createPromotionReviewV3({
    evaluationResult: evaluation,
    shadowDashboard: dashboard,
    externalGates: createPassingExternalGates(),
    canaryEvidence: createNoCanaryEvidence(),
  });

  const blocked = createPromotionAuthorizationV3({
    review,
    targetStage: "canary",
    manualApprovalToken: null,
  });
  assert.equal(blocked.status, "blocked");

  const authorized = createPromotionAuthorizationV3({
    review,
    targetStage: "canary",
    manualApprovalToken: "operator-approval-20260814",
  });
  assert.equal(authorized.status, "authorized");
  assert.equal(authorized.automaticPromotion, false);
  assert.equal(validatePromotionAuthorizationV3(authorized), true);
  assert.equal(
    JSON.stringify(authorized).includes("operator-approval-20260814"),
    false
  );
});

test("canary assignment is deterministic, bounded and kill-switch safe", () => {
  const evaluation = createPassingEvaluation();
  const dashboard = createShadowRegressionDashboardV3(
    createPassingShadowObservations()
  );
  const review = createPromotionReviewV3({
    evaluationResult: evaluation,
    shadowDashboard: dashboard,
    externalGates: createPassingExternalGates(),
    canaryEvidence: createNoCanaryEvidence(),
  });
  const authorization = createPromotionAuthorizationV3({
    review,
    targetStage: "canary",
    manualApprovalToken: "operator-approval-20260814",
  });
  const safeSwitch = evaluatePromotionKillSwitchV3({
    manualTrigger: false,
    priceIntegrity: "pass",
    publicRateConsistency: "verified",
    criticalRegressionCount: 0,
    errorRateRegression: 0,
    p95LatencyRegressionMs: 0,
  });
  assert.equal(validateKillSwitchStateV3(safeSwitch), true);

  const first = createServingAssignmentV3({
    authorization,
    exposureToken: "exposure-user-000001",
    canaryAllocationBasisPoints: 500,
    killSwitch: safeSwitch,
  });
  const second = createServingAssignmentV3({
    authorization,
    exposureToken: "exposure-user-000001",
    canaryAllocationBasisPoints: 500,
    killSwitch: safeSwitch,
  });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.canaryAllocationBasisPoints, 500);
  assert.equal(validateServingAssignmentV3(first), true);
  assert.equal(JSON.stringify(first).includes("exposure-user-000001"), false);

  const activeSwitch = evaluatePromotionKillSwitchV3({
    manualTrigger: false,
    priceIntegrity: "pass",
    publicRateConsistency: "failed",
    criticalRegressionCount: 0,
    errorRateRegression: 0,
    p95LatencyRegressionMs: 0,
  });
  const fallback = createServingAssignmentV3({
    authorization,
    exposureToken: "exposure-user-000001",
    canaryAllocationBasisPoints: 500,
    killSwitch: activeSwitch,
  });
  assert.equal(activeSwitch.active, true);
  assert.equal(activeSwitch.rollbackRequired, true);
  assert.equal(fallback.servingEngine, "v2");
  assert.equal(fallback.reason, "kill-switch-v2-fallback");
  assert.equal(fallback.rollbackRequired, true);
});
