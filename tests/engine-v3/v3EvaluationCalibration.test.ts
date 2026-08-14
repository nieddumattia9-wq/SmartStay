import assert from "node:assert/strict";
import test from "node:test";

import {
  createBlindEvaluationSetV3,
  createEvaluationCalibrationPlanV3,
  createGoldenDatasetV3,
  evaluateV3AgainstV2Offline,
  validateBlindEvaluationSetV3,
  validateEvaluationCalibrationPlanV3,
  validateEvaluationCalibrationResultV3,
  validateGoldenDatasetV3,
  type StayOptiBlindJudgmentInputV3,
  type StayOptiGoldenCaseInputV3,
} from "../../src/engine-v3";

import {
  stableSerializeV3,
} from "../../src/engine-v3/contract/stableHashV3";

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

function createPassingCases() {
  return Array.from(
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
        segment: {
          profile: PROFILES[index % PROFILES.length],
          destination: DESTINATIONS[index % DESTINATIONS.length],
          leadTime: LEAD_TIMES[index % LEAD_TIMES.length],
          duration: DURATIONS[index % DURATIONS.length],
          coverage: COVERAGE[index % COVERAGE.length],
        },
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
}

function winnerSide(
  desired: "v2" | "v3" | "tie",
  leftEngine: "v2" | "v3"
) {
  if (desired === "tie") {
    return "tie" as const;
  }

  return desired === leftEngine
    ? ("left" as const)
    : ("right" as const);
}

function createPassingJudgments() {
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

  return [...human, ...expert];
}

function createPlan() {
  return createEvaluationCalibrationPlanV3({
    sourceDecisionInputFingerprint: "fnv1a32-1234abcd",
  });
}

function createPassingEvaluation() {
  return evaluateV3AgainstV2Offline({
    plan: createPlan(),
    dataset: createGoldenDatasetV3(createPassingCases()),
    blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
  });
}

test(
  "V3-10 freezes quantitative thresholds before results and remains offline-only",
  () => {
    const plan = createPlan();

    assert.equal(plan.phase, "v3-10");
    assert.equal(plan.thresholdFreeze.status, "frozen-before-results");
    assert.equal(plan.thresholdFreeze.resultsObserved, false);
    assert.equal(plan.thresholdFreeze.thresholds.minimumGoldenCaseCount, 200);
    assert.equal(plan.thresholdFreeze.thresholds.minimumBlindPairwiseWinRateV3, 0.55);
    assert.equal(plan.promotionPolicy.productionSelfModificationAllowed, false);
    assert.equal(plan.promotionPolicy.automaticProductionPromotionAllowed, false);
    assert.equal(plan.promotionPolicy.publicV3Enabled, false);
    assert.equal(plan.promotionPolicy.nextEligibleGate, "v3-11-shadow");
    assert.equal(Object.isFrozen(plan), true);
    assert.equal(Object.isFrozen(plan.thresholdFreeze.thresholds), true);
    assert.equal(validateEvaluationCalibrationPlanV3(plan).valid, true);
  }
);

test(
  "threshold and policy mutation is detected before offline evaluation",
  () => {
    const thresholdMutation = structuredClone(createPlan());
    thresholdMutation.thresholdFreeze.thresholds.maximumNormalizedRegretV3 = 0.9;

    assert.equal(validateEvaluationCalibrationPlanV3(thresholdMutation).valid, false);
    assert.ok(
      validateEvaluationCalibrationPlanV3(thresholdMutation).issues.includes(
        "fingerprint-mismatch"
      )
    );

    const policyMutation = structuredClone(createPlan());
    policyMutation.promotionPolicy.automaticProductionPromotionAllowed = true as false;
    assert.ok(
      validateEvaluationCalibrationPlanV3(policyMutation).issues.includes(
        "invalid-shape"
      )
    );
  }
);

test(
  "Golden Dataset expands baseline with adversarial and counterfactual cases deterministically",
  () => {
    const cases = createPassingCases();
    const first = createGoldenDatasetV3(cases);
    const second = createGoldenDatasetV3([...cases].reverse());

    assert.equal(first.counts.total, 200);
    assert.equal(first.counts.baseline, 120);
    assert.equal(first.counts.adversarial, 40);
    assert.equal(first.counts.counterfactual, 40);
    assert.equal(first.commerciallyNeutral, true);
    assert.equal(first.piiAllowed, false);
    assert.equal(first.fingerprint, second.fingerprint);
    assert.equal(stableSerializeV3(first), stableSerializeV3(second));
    assert.equal(validateGoldenDatasetV3(first).valid, true);
  }
);

test(
  "Golden Dataset rejects duplicate IDs, PII and commercial/provider identifiers",
  () => {
    const sample = createPassingCases()[0];
    assert.throws(
      () => createGoldenDatasetV3([sample, structuredClone(sample)]),
      /unique/
    );

    const withEmail = {
      ...sample,
      email: "guest@example.com",
    } as StayOptiGoldenCaseInputV3;
    assert.throws(() => createGoldenDatasetV3([withEmail]), /PII/);

    const withCommission = {
      ...sample,
      commission: 15,
    } as StayOptiGoldenCaseInputV3;
    assert.throws(() => createGoldenDatasetV3([withCommission]), /commercial/);

    const withProviderId = {
      ...sample,
      providerId: "provider-secret",
    } as StayOptiGoldenCaseInputV3;
    assert.throws(() => createGoldenDatasetV3([withProviderId]), /provider/);

    const withFreeText = {
      ...sample,
      notes: "unbounded evaluator note",
    } as StayOptiGoldenCaseInputV3;
    assert.throws(() => createGoldenDatasetV3([withFreeText]), /unexpected/);
  }
);

test(
  "blind human and expert judgments are pseudonymous, randomized and deterministic",
  () => {
    const judgments = createPassingJudgments();
    const first = createBlindEvaluationSetV3(judgments);
    const second = createBlindEvaluationSetV3([...judgments].reverse());

    assert.deepEqual(first.counts, { total: 400, human: 300, expert: 100 });
    assert.equal(first.labelsRandomized, true);
    assert.equal(first.evaluatorPiiAllowed, false);
    assert.equal(first.fingerprint, second.fingerprint);
    assert.equal(validateBlindEvaluationSetV3(first).valid, true);
  }
);

test(
  "blind evaluation rejects duplicate judgments, visible labels and evaluator PII",
  () => {
    const sample = createPassingJudgments()[0];
    assert.throws(
      () => createBlindEvaluationSetV3([sample, structuredClone(sample)]),
      /unique/
    );

    const unblinded = {
      ...sample,
      blinded: false,
    } as unknown as StayOptiBlindJudgmentInputV3;
    assert.throws(() => createBlindEvaluationSetV3([unblinded]), /invalid/);

    const withName = {
      ...sample,
      fullName: "Evaluator Person",
    } as StayOptiBlindJudgmentInputV3;
    assert.throws(() => createBlindEvaluationSetV3([withName]), /PII/);
  }
);

test(
  "insufficient observations cannot be presented as evidence that V3 beats V2",
  () => {
    const result = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3([createPassingCases()[0]]),
      blindEvaluation: createBlindEvaluationSetV3([
        createPassingJudgments()[0],
        createPassingJudgments()[300],
      ]),
    });

    assert.equal(result.status, "insufficient-data");
    assert.equal(result.candidatePolicy.state, "not-eligible");
    assert.equal(result.candidatePolicy.productionPromotionAllowed, false);
    assert.ok(result.gates.some((gate) => gate.status === "insufficient-data"));
  }
);

test(
  "missing adversarial or counterfactual coverage remains insufficient rather than a benchmark failure",
  () => {
    const cases = createPassingCases();
    cases.slice(120, 160).forEach((item) => {
      item.caseType = "baseline";
    });

    const result = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(cases),
      blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
    });

    assert.equal(result.status, "insufficient-data");
    assert.ok(
      result.gates.some(
        (gate) =>
          gate.gateId === "dataset-adversarial" &&
          gate.status === "insufficient-data"
      )
    );
  }
);

test(
  "a synthetic fully observed benchmark passes only the frozen offline gate",
  () => {
    const result = createPassingEvaluation();

    assert.equal(result.status, "pass");
    assert.equal(result.thresholdsFrozenBeforeResults, true);
    assert.equal(result.candidatePolicy.state, "eligible-for-v3-11-shadow-gate");
    assert.equal(result.candidatePolicy.productionPromotionAllowed, false);
    assert.equal(result.candidatePolicy.automaticPromotionAllowed, false);
    assert.equal(result.candidatePolicy.publicV3Enabled, false);
    assert.equal(result.gates.every((gate) => gate.status === "pass"), true);
    assert.equal(validateEvaluationCalibrationResultV3(result).valid, true);
  }
);

test(
  "normalized regret and calibration metrics compare V3 against V2 without decorative confidence",
  () => {
    const result = createPassingEvaluation();

    assert.deepEqual(result.metrics.regret.v2, { count: 200, value: 0.2 });
    assert.deepEqual(result.metrics.regret.v3, { count: 200, value: 0.05 });
    assert.equal(result.metrics.regret.improvementV3OverV2, 0.15);
    assert.equal(result.metrics.calibration.v2ExpectedCalibrationError, 0.7);
    assert.equal(result.metrics.calibration.v3ExpectedCalibrationError, 0.05);
    assert.equal(result.metrics.calibration.regressionV3MinusV2, -0.65);
  }
);

test(
  "pairwise win rate respects randomized left/right labels and gives ties half weight",
  () => {
    const result = createPassingEvaluation();

    assert.deepEqual(result.metrics.pairwise.human, {
      judgmentCount: 300,
      v2Wins: 60,
      v3Wins: 210,
      ties: 30,
      v3EffectiveWinRate: 0.75,
    });
    assert.deepEqual(result.metrics.pairwise.expert, {
      judgmentCount: 100,
      v2Wins: 20,
      v3Wins: 70,
      ties: 10,
      v3EffectiveWinRate: 0.75,
    });
    assert.equal(result.metrics.pairwise.combined.v3EffectiveWinRate, 0.75);
  }
);

test(
  "abstention quality measures precision, coverage and missed necessary abstentions",
  () => {
    const result = createPassingEvaluation();

    assert.deepEqual(result.metrics.abstention, {
      decisionCount: 20,
      appropriateCount: 20,
      precision: 1,
      coverage: 0.1,
      missedNecessaryAbstentionCount: 0,
    });

    const cases = createPassingCases();
    cases.slice(0, 20).forEach((item) => {
      item.shouldAbstain = false;
    });
    const failed = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(cases),
      blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
    });
    assert.equal(failed.metrics.abstention.precision, 0);
    assert.equal(failed.status, "fail");
  }
);

test(
  "stability and fairness are segmented across every required context dimension",
  () => {
    const result = createPassingEvaluation();

    assert.equal(result.metrics.stability.robustChoiceRate, 0.95);
    assert.equal(result.metrics.stability.instabilityRate, 0.05);
    assert.equal(result.segmentReports.length, 5);
    assert.deepEqual(
      result.segmentReports.map((report) => report.dimension),
      ["profile", "destination", "leadTime", "duration", "coverage"]
    );
    assert.equal(result.metrics.fairness.allRequiredSegmentsSufficient, true);
    assert.equal(result.metrics.fairness.maximumObservedSegmentRegretGap, 0);
  }
);

test(
  "unstable or segment-skewed behavior fails quantitative safety gates",
  () => {
    const cases = createPassingCases();
    cases.forEach((item, index) => {
      item.v3StableUnderPerturbation = index < 100;
      if (item.segment.profile === "maximum-comfort") {
        item.v3.realizedUtility = 0.55;
      }
    });

    const result = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(cases),
      blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
    });

    assert.equal(result.status, "fail");
    assert.ok(
      result.gates.some(
        (gate) => gate.gateId === "instability-rate" && gate.status === "fail"
      )
    );
    assert.ok(
      result.gates.some(
        (gate) => gate.gateId === "fairness-gap" && gate.status === "fail"
      )
    );
  }
);

test(
  "provider-neutral replay measures dependence without exposing provider identity",
  () => {
    const result = createPassingEvaluation();
    assert.deepEqual(result.metrics.providerDependence, {
      replayCount: 200,
      stableCount: 198,
      changedCount: 2,
      unavailableCount: 0,
      dependenceGap: 0.01,
    });

    const cases = createPassingCases();
    cases.slice(0, 50).forEach((item) => {
      item.providerNeutralReplay = "changed";
    });
    const failed = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(cases),
      blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
    });
    assert.equal(failed.status, "fail");
    assert.ok(
      failed.gates.some(
        (gate) =>
          gate.gateId === "provider-dependence-gap" && gate.status === "fail"
      )
    );
  }
);

test(
  "money saved and quality gained remain separated by currency and quality semantics",
  () => {
    const result = createPassingEvaluation();

    assert.deepEqual(result.metrics.monetaryValueByCurrency, [
      {
        currency: "EUR",
        qualityPreservingSavingCaseCount: 50,
        totalMoneySavedWithoutQualityLoss: 1000,
        averageMoneySavedWithoutQualityLoss: 20,
        qualityUpgradeCaseCount: 50,
        totalExtraCostForQualityGain: 1000,
        totalQualityGain: 5,
        qualityGainedPerExtraCurrencyUnit: 0.005,
      },
      {
        currency: "USD",
        qualityPreservingSavingCaseCount: 50,
        totalMoneySavedWithoutQualityLoss: 1000,
        averageMoneySavedWithoutQualityLoss: 20,
        qualityUpgradeCaseCount: 50,
        totalExtraCostForQualityGain: 1000,
        totalQualityGain: 5,
        qualityGainedPerExtraCurrencyUnit: 0.005,
      },
    ]);
  }
);

test(
  "any critical regression blocks the candidate even when averages are strong",
  () => {
    const cases = createPassingCases();
    cases[0].criticalRegressions = ["price-integrity"];

    const result = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(cases),
      blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
    });

    assert.equal(result.status, "fail");
    assert.equal(result.metrics.criticalRegressionCount, 1);
    assert.equal(result.candidatePolicy.state, "not-eligible");
    assert.ok(result.reasonCodes.includes("evaluation:critical-regression-blocked"));
  }
);

test(
  "mutated datasets, blind sets and results fail their fingerprints",
  () => {
    const dataset = createGoldenDatasetV3(createPassingCases());
    dataset.cases[0].v3.realizedUtility = 0.1;
    assert.ok(validateGoldenDatasetV3(dataset).issues.includes("fingerprint-mismatch"));

    const blind = createBlindEvaluationSetV3(createPassingJudgments());
    blind.judgments[0].winner = "tie";
    assert.ok(
      validateBlindEvaluationSetV3(blind).issues.includes("fingerprint-mismatch")
    );

    const result = createPassingEvaluation();
    result.metrics.criticalRegressionCount = 99;
    assert.ok(
      validateEvaluationCalibrationResultV3(result).issues.includes(
        "fingerprint-mismatch"
      )
    );
  }
);

test(
  "blind judgments cannot refer to cases outside the frozen Golden Dataset",
  () => {
    const judgments = createPassingJudgments();
    judgments[0].caseId = "case-not-present-999";

    assert.throws(
      () =>
        evaluateV3AgainstV2Offline({
          plan: createPlan(),
          dataset: createGoldenDatasetV3(createPassingCases()),
          blindEvaluation: createBlindEvaluationSetV3(judgments),
        }),
      /reference a case/
    );
  }
);

test(
  "case and judgment input permutation cannot change the V3-10 result",
  () => {
    const forward = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(createPassingCases()),
      blindEvaluation: createBlindEvaluationSetV3(createPassingJudgments()),
    });
    const reverse = evaluateV3AgainstV2Offline({
      plan: createPlan(),
      dataset: createGoldenDatasetV3(createPassingCases().reverse()),
      blindEvaluation: createBlindEvaluationSetV3(
        createPassingJudgments().reverse()
      ),
    });

    assert.equal(forward.fingerprint, reverse.fingerprint);
    assert.equal(stableSerializeV3(forward), stableSerializeV3(reverse));
  }
);

test(
  "V3-10 artifacts contain no PII, booking, commission or automatic deploy fields",
  () => {
    const serialized = JSON.stringify({
      plan: createPlan(),
      result: createPassingEvaluation(),
    });

    assert.doesNotMatch(
      serialized,
      /email|phone|fullName|bookingId|bookingRef|providerId|commission|affiliate|revenue/i
    );
    assert.doesNotMatch(serialized, /deployNow|autoPromote|selfModify/i);
  }
);
