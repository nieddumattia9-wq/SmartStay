import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3,
  STAYOPTI_GOLDEN_DATASET_THRESHOLDS_V3,
  STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3,
  STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3,
  STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3,
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
  createGoldenDecisionDatasetV3,
  createStableHashV3,
  evaluateGoldenDecisionDatasetGateV3,
  validateGoldenDecisionDatasetGateV3,
  validateGoldenDecisionDatasetV3,
  verifyGoldenDecisionDatasetReplayV3,
  type StayOptiGoldenBlindJudgmentV3,
  type StayOptiGoldenDecisionCaseV3,
  type StayOptiGoldenDecisionDatasetInputV3,
  type StayOptiGoldenDecisionDatasetV3,
  type StayOptiGoldenDecisionMeasurementV3,
} from "../../src/engine-v3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-17a-golden-dataset-diagnostic-v1.json"
);

function fingerprint(value: unknown, namespace: string): string {
  return createStableHashV3(value, namespace);
}

function diagnosticInput(): StayOptiGoldenDecisionDatasetInputV3 {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as StayOptiGoldenDecisionDatasetInputV3;
}

function measurement(index: number): StayOptiGoldenDecisionMeasurementV3 {
  return {
    normalizedRegretV2: 0.2,
    normalizedRegretV3: 0.15,
    predictedConfidenceV2: 0.8,
    predictedConfidenceV3: 0.9,
    outcomeCorrectV2: true,
    outcomeCorrectV3: true,
    v3Abstained: index < 20,
    abstentionWarranted: index < 20,
    v3RobustChoice: index % 10 !== 0,
    v3Unstable: index % 20 === 0,
    providerNeutralReplay: index < 100,
    providerDependenceGap: 0.02,
    criticalRegression: false,
    adjudicationFingerprint: fingerprint(
      { index, adjudication: "independent-test-fixture" },
      "stayopti-v3-17a-test-adjudication"
    ),
  };
}

function eligibleCase(index: number): StayOptiGoldenDecisionCaseV3 {
  const caseId = `golden-case-${String(index).padStart(3, "0")}`;
  const profile = STAYOPTI_ROLE_POLICY_PROFILES_V3[
    index % STAYOPTI_ROLE_POLICY_PROFILES_V3.length
  ];
  const segment = STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3[
    index % STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3.length
  ];
  if (profile === undefined || segment === undefined) {
    throw new Error("Test taxonomy is incomplete.");
  }

  if (index < 120) {
    return {
      caseId,
      statisticalEligibility: "eligible",
      kind: "baseline",
      origin: "real-search-snapshot",
      profile,
      segment,
      role: "best-choice",
      parentCaseId: null,
      sourceEvidenceFingerprints: [
        fingerprint({ index, source: "real" }, "stayopti-v3-17a-test-source"),
      ],
      measurement: measurement(index),
    };
  }

  const adversarial = index < 160;
  const parentIndex = adversarial ? index - 120 : index - 120;
  return {
    caseId,
    statisticalEligibility: "eligible",
    kind: adversarial ? "adversarial" : "counterfactual",
    origin: adversarial ? "adversarial-derived" : "counterfactual-derived",
    profile,
    segment,
    role: "best-choice",
    parentCaseId: `golden-case-${String(parentIndex).padStart(3, "0")}`,
    sourceEvidenceFingerprints: [
      fingerprint({ index, source: adversarial ? "adversarial" : "counterfactual" }, "stayopti-v3-17a-test-source"),
    ],
    measurement: measurement(index),
  };
}

function judgment(
  index: number,
  evaluatorClass: "human" | "expert",
  preference: "v2" | "v3"
): StayOptiGoldenBlindJudgmentV3 {
  const caseIndex = index % 200;
  const classPrefix = evaluatorClass === "human" ? "human" : "expert";
  return {
    judgmentId: `golden-judgment-${classPrefix}-${String(index).padStart(3, "0")}`,
    caseId: `golden-case-${String(caseIndex).padStart(3, "0")}`,
    role: "best-choice",
    evaluatorClass,
    evaluatorPseudonym: fingerprint(
      { index, evaluatorClass },
      "stayopti-v3-17a-test-evaluator"
    ),
    statisticalEligibility: "eligible",
    assignmentFingerprint: fingerprint(
      { index, evaluatorClass, caseIndex, role: "best-choice" },
      "stayopti-v3-17a-test-assignment"
    ),
    preference,
    engineLabelsHidden: true,
    sameRoleComparison: true,
  };
}

function passingInput(): StayOptiGoldenDecisionDatasetInputV3 {
  const cases = Array.from({ length: 200 }, (_, index) => eligibleCase(index));
  const human = Array.from({ length: 300 }, (_, index) =>
    judgment(index, "human", index < 180 ? "v3" : "v2")
  );
  const expert = Array.from({ length: 100 }, (_, index) =>
    judgment(index, "expert", index < 60 ? "v3" : "v2")
  );
  return {
    datasetId: "golden-dataset-v3-17a-passing-test",
    cases,
    judgments: [...human, ...expert],
    diagnosticInventories: structuredClone(diagnosticInput().diagnosticInventories),
  };
}

test("V3-17A creates a valid diagnostic inventory without inventing a real sample", () => {
  const dataset = createGoldenDecisionDatasetV3(diagnosticInput());
  const gate = evaluateGoldenDecisionDatasetGateV3(dataset);

  assert.equal(dataset.datasetVersion, STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3);
  assert.equal(validateGoldenDecisionDatasetV3(dataset).valid, true);
  assert.equal(gate.status, "collection-required");
  assert.equal(gate.counts.eligibleGoldenCases, 0);
  assert.equal(gate.counts.legacyDiagnosticInventoryJudgmentsExcluded, 15);
  assert.equal(gate.statisticalClaimAllowed, false);
  assert.equal(gate.publicV3PromotionAllowed, false);
});

test("sample minimums and quantitative thresholds exactly match the frozen roadmap", () => {
  assert.deepEqual(STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3, {
    goldenCases: 200,
    adversarialCases: 40,
    counterfactualCases: 40,
    humanBlindJudgments: 300,
    expertBlindJudgments: 100,
    evaluableAbstentions: 20,
    providerNeutralReplays: 100,
  });
  assert.deepEqual(STAYOPTI_GOLDEN_DATASET_THRESHOLDS_V3, {
    normalizedRegretV3Maximum: 0.2,
    regretImprovementOverV2Minimum: 0.02,
    humanPairwiseWinRateV3Minimum: 0.55,
    expertPairwiseWinRateV3Minimum: 0.55,
    expectedCalibrationErrorV3Maximum: 0.1,
    abstentionPrecisionMinimum: 0.8,
    robustChoiceRateMinimum: 0.8,
    instabilityRateMaximum: 0.1,
    maximumSegmentRegretGap: 0.1,
    maximumProviderDependenceGap: 0.05,
    criticalRegressionsMaximum: 0,
  });
  assert.equal(Object.isFrozen(STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3), true);
  assert.equal(Object.isFrozen(STAYOPTI_GOLDEN_DATASET_THRESHOLDS_V3), true);
});

test("a complete synthetic gate fixture proves the calculator can pass every frozen criterion", () => {
  const dataset = createGoldenDecisionDatasetV3(passingInput());
  const gate = evaluateGoldenDecisionDatasetGateV3(dataset);

  assert.equal(gate.status, "passed");
  assert.equal(gate.criteria.every(({ status }) => status === "pass"), true);
  assert.equal(gate.metrics.normalizedRegretV3, 0.15);
  assert.equal(gate.metrics.regretImprovementOverV2, 0.05);
  assert.equal(gate.metrics.humanPairwiseWinRateV3, 0.6);
  assert.equal(gate.metrics.expertPairwiseWinRateV3, 0.6);
  assert.equal(gate.metrics.expectedCalibrationErrorV3, 0.1);
  assert.equal(gate.metrics.abstentionPrecision, 1);
  assert.equal(gate.metrics.robustChoiceRate, 0.9);
  assert.equal(gate.metrics.instabilityRate, 0.05);
  assert.equal(gate.metrics.maximumSegmentRegretGap, 0);
  assert.equal(gate.metrics.providerDependenceGap, 0.02);
  assert.equal(gate.metrics.criticalRegressions, 0);
  assert.equal(gate.statisticalClaimAllowed, true);
  assert.equal(gate.publicV3PromotionAllowed, false);
  assert.equal(validateGoldenDecisionDatasetGateV3(gate).valid, true);
});

test("199 eligible cases cannot satisfy the Golden sample gate", () => {
  const input = passingInput();
  input.cases = input.cases.filter(({ caseId }) => caseId !== "golden-case-199");
  input.judgments = input.judgments.filter(
    ({ caseId }) => caseId !== "golden-case-199"
  );
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );
  const criterion = gate.criteria.find(
    ({ criterionId }) => criterionId === "sample:golden-cases"
  );

  assert.equal(gate.status, "collection-required");
  assert.equal(criterion?.actual, 199);
  assert.equal(criterion?.status, "fail");
  assert.equal(gate.statisticalClaimAllowed, false);
});

test("forty adversarial and forty counterfactual cases are independent requirements", () => {
  const input = passingInput();
  const candidate = input.cases.find(({ caseId }) => caseId === "golden-case-120");
  assert.ok(candidate !== undefined);
  candidate.kind = "baseline";
  candidate.origin = "real-search-snapshot";
  candidate.parentCaseId = null;
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );
  const adversarial = gate.criteria.find(
    ({ criterionId }) => criterionId === "sample:adversarial-cases"
  );
  const counterfactual = gate.criteria.find(
    ({ criterionId }) => criterionId === "sample:counterfactual-cases"
  );

  assert.equal(adversarial?.actual, 39);
  assert.equal(adversarial?.status, "fail");
  assert.equal(counterfactual?.actual, 40);
  assert.equal(counterfactual?.status, "pass");
});

test("human and expert blind-judgment volumes are counted separately", () => {
  const input = passingInput();
  input.judgments = input.judgments.filter(
    ({ judgmentId }) => judgmentId !== "golden-judgment-human-299"
  );
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );

  assert.equal(gate.counts.humanBlindJudgments, 299);
  assert.equal(gate.counts.expertBlindJudgments, 100);
  assert.equal(gate.status, "collection-required");
});

test("sufficient volume without a measurable expert comparison remains measurement-required", () => {
  const input = passingInput();
  for (const judgmentValue of input.judgments) {
    if (judgmentValue.evaluatorClass === "expert") {
      judgmentValue.preference = "abstain";
    }
  }
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );

  assert.equal(gate.counts.expertBlindJudgments, 100);
  assert.equal(gate.metrics.expertPairwiseWinRateV3, null);
  assert.equal(gate.status, "measurement-required");
  assert.equal(gate.statisticalClaimAllowed, false);
});

test("normalized regret above 0.20 fails after sufficient collection", () => {
  const input = passingInput();
  for (const candidate of input.cases) {
    if (candidate.measurement !== null) candidate.measurement.normalizedRegretV3 = 0.21;
  }
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );

  assert.equal(gate.status, "failed");
  assert.equal(
    gate.criteria.find(
      ({ criterionId }) => criterionId === "performance:normalized-regret-v3"
    )?.status,
    "fail"
  );
});

test("V3 calibration cannot regress against V2", () => {
  const input = passingInput();
  for (const candidate of input.cases) {
    if (candidate.measurement !== null) candidate.measurement.predictedConfidenceV3 = 0.5;
  }
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );

  assert.equal(gate.status, "failed");
  assert.equal(
    gate.criteria.find(
      ({ criterionId }) => criterionId === "performance:ece-no-v2-regression"
    )?.status,
    "fail"
  );
});

test("one critical regression blocks the gate", () => {
  const input = passingInput();
  const candidate = input.cases[0];
  assert.ok(candidate !== undefined && candidate.measurement !== null);
  candidate.measurement.criticalRegression = true;
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );

  assert.equal(gate.status, "failed");
  assert.equal(gate.metrics.criticalRegressions, 1);
});

test("diagnostic cases and judgments are excluded from all statistical counts", () => {
  const input = diagnosticInput();
  input.cases.push({
    caseId: "golden-case-legacy-diagnostic",
    statisticalEligibility: "diagnostic-only",
    kind: "baseline",
    origin: "legacy-diagnostic",
    profile: "balanced",
    segment: "uncertain-evidence",
    role: "best-choice",
    parentCaseId: null,
    sourceEvidenceFingerprints: [
      fingerprint("legacy-case", "stayopti-v3-17a-test-source"),
    ],
    measurement: null,
  });
  input.judgments.push({
    judgmentId: "golden-judgment-legacy-diagnostic",
    caseId: "golden-case-legacy-diagnostic",
    role: "best-choice",
    evaluatorClass: "human",
    evaluatorPseudonym: fingerprint("legacy-evaluator", "stayopti-v3-17a-test-evaluator"),
    statisticalEligibility: "diagnostic-only",
    assignmentFingerprint: fingerprint("legacy-assignment", "stayopti-v3-17a-test-assignment"),
    preference: "v3",
    engineLabelsHidden: true,
    sameRoleComparison: true,
  });
  const gate = evaluateGoldenDecisionDatasetGateV3(
    createGoldenDecisionDatasetV3(input)
  );

  assert.equal(gate.counts.eligibleGoldenCases, 0);
  assert.equal(gate.counts.humanBlindJudgments, 0);
  assert.equal(gate.counts.diagnosticCasesExcluded, 1);
  assert.equal(gate.counts.diagnosticJudgmentsExcluded, 1);
  assert.equal(gate.counts.legacyDiagnosticInventoryJudgmentsExcluded, 15);
});

test("dataset replay is deterministic across input and evidence ordering", () => {
  const input = passingInput();
  const first = createGoldenDecisionDatasetV3(input);
  const reordered = structuredClone(input);
  reordered.cases.reverse();
  reordered.judgments.reverse();
  reordered.diagnosticInventories.reverse();
  for (const candidate of reordered.cases) {
    candidate.sourceEvidenceFingerprints.reverse();
  }
  const second = createGoldenDecisionDatasetV3(reordered);

  assert.deepEqual(second, first);
  assert.equal(verifyGoldenDecisionDatasetReplayV3(reordered, first), true);
  assert.deepEqual(
    evaluateGoldenDecisionDatasetGateV3(second),
    evaluateGoldenDecisionDatasetGateV3(first)
  );
});

test("duplicate case IDs fail closed", () => {
  const input = passingInput();
  input.cases.push(structuredClone(input.cases[0]));
  assert.throws(() => createGoldenDecisionDatasetV3(input), /duplicate-case/);
});

test("blind judgments cannot compare a different decision role", () => {
  const input = passingInput();
  const first = input.judgments[0];
  assert.ok(first !== undefined);
  first.role = "best-sensible-saving";
  assert.throws(() => createGoldenDecisionDatasetV3(input), /blind-judgment-invalid/);
});

test("the same evaluator cannot judge the same case and role twice", () => {
  const input = passingInput();
  const duplicate = structuredClone(input.judgments[0]);
  assert.ok(duplicate !== undefined);
  duplicate.judgmentId = "golden-judgment-human-duplicate";
  input.judgments.push(duplicate);
  assert.throws(
    () => createGoldenDecisionDatasetV3(input),
    /duplicate-evaluator-assignment/
  );
});

test("PII, provider identity and commercial fields fail the dataset firewall", () => {
  const valid = createGoldenDecisionDatasetV3(diagnosticInput());
  const injected = structuredClone(valid) as StayOptiGoldenDecisionDatasetV3 & {
    email?: string;
    providerId?: string;
    commission?: number;
  };
  injected.email = "forbidden@example.invalid";
  injected.providerId = "forbidden-provider";
  injected.commission = 10;
  const validation = validateGoldenDecisionDatasetV3(injected);

  assert.equal(validation.valid, false);
  assert.ok(validation.violations.some((value) => value.startsWith("forbidden-field")));
});

test("dataset and gate fingerprints detect mutation", () => {
  const dataset = createGoldenDecisionDatasetV3(diagnosticInput());
  const tamperedDataset = structuredClone(dataset);
  tamperedDataset.datasetId = "golden-dataset-tampered";
  assert.equal(validateGoldenDecisionDatasetV3(tamperedDataset).valid, false);

  const gate = evaluateGoldenDecisionDatasetGateV3(dataset);
  const tamperedGate = structuredClone(gate);
  tamperedGate.statisticalClaimAllowed = true;
  assert.equal(validateGoldenDecisionDatasetGateV3(tamperedGate).valid, false);
});

test("V3-17A audit freezes diagnostics, public runtime and commercial boundaries", () => {
  assert.equal(Object.isFrozen(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3), true);
  assert.equal(
    STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.legacyDiagnosticsUsedAsStatisticalEvidence,
    false
  );
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.teacherOutputsUsedAsGroundTruth, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.publicV2Changed, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.publicV3Enabled, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.splitEnabled, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.providerIdentitiesAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.commercialSignalsUsed, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.providerCallsAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.bookingOrPaymentChanged, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.analyticsChanged, false);
  assert.equal(STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3.deployChanged, false);
});
