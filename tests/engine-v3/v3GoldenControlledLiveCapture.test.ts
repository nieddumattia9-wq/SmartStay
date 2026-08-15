import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_AUDIT_V3,
  STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_TARGETS_V3,
  STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3,
  applyGoldenRealEvidenceBatchV3,
  buildGoldenControlledLiveCaptureExportV3,
  createGoldenCollectionCampaignV3,
  createGoldenControlledLiveCapturePlanV3,
  createGoldenControlledLiveCaptureSessionV3,
  createStableHashV3,
  validateGoldenControlledLiveCaptureExportV3,
  validateGoldenControlledLiveCapturePlanV3,
  validateGoldenControlledLiveCaptureSessionV3,
  verifyGoldenControlledLiveCaptureExportReplayV3,
  type StayOptiGoldenCollectionCampaignV3,
  type StayOptiGoldenControlledLiveCapturePlanInputV3,
  type StayOptiGoldenControlledLiveCapturePlanV3,
  type StayOptiGoldenControlledLiveCaptureSessionV3,
  type StayOptiGoldenControlledLiveCapturedAttemptV3,
  type StayOptiGoldenControlledLiveFailedAttemptV3,
  type StayOptiGoldenControlledLiveSearchScenarioV3,
} from "../../src/engine-v3";

interface FixtureV3 {
  planInput: StayOptiGoldenControlledLiveCapturePlanInputV3;
  sessionInput: {
    sessionId: string;
    batchId: string;
    requestedCaseSlotIds: string[];
  };
}

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-17d-controlled-live-capture-v1.json"
);

function fixture(): FixtureV3 {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureV3;
}

function fingerprint(value: unknown, namespace: string): string {
  return createStableHashV3(value, namespace);
}

function emptyCampaign(): StayOptiGoldenCollectionCampaignV3 {
  return createGoldenCollectionCampaignV3({
    campaignId: "golden-collection-campaign-v3-17b-real-v1",
    planningSeed: "fnv1a32-17b00001",
    caseReceipts: [],
    evaluatorAssignmentClaims: [],
  });
}

function planFor(
  campaign = emptyCampaign(),
  planInput = fixture().planInput
): StayOptiGoldenControlledLiveCapturePlanV3 {
  return createGoldenControlledLiveCapturePlanV3(campaign, planInput);
}

function sessionFor(
  plan: StayOptiGoldenControlledLiveCapturePlanV3,
  scenarios: readonly StayOptiGoldenControlledLiveSearchScenarioV3[],
  suffix = "test-v1"
): StayOptiGoldenControlledLiveCaptureSessionV3 {
  return createGoldenControlledLiveCaptureSessionV3(plan, {
    sessionId: `golden-controlled-live-session-${suffix}`,
    batchId: `golden-real-evidence-batch-${suffix}`,
    planFingerprint: plan.fingerprint,
    requestedCaseSlotIds: scenarios.map(({ caseSlotId }) => caseSlotId),
  });
}

function capturedAttempt(
  scenario: StayOptiGoldenControlledLiveSearchScenarioV3,
  index: number
): StayOptiGoldenControlledLiveCapturedAttemptV3 {
  const hash = (purpose: string) =>
    fingerprint(
      { purpose, scenarioId: scenario.scenarioId, index },
      "stayopti-v3-17d-test-live-capture"
    );
  return {
    attemptId: `golden-controlled-live-attempt-captured-${String(index).padStart(3, "0")}`,
    scenarioId: scenario.scenarioId,
    caseSlotId: scenario.caseSlotId,
    status: "captured",
    searchRequestFingerprint: scenario.searchRequestFingerprint,
    collectionWindowId: `collection-window-v3-17d-test-${String(index).padStart(3, "0")}`,
    realSearchExecutionFingerprint: hash("real-search-execution"),
    sourceSnapshotFingerprint: hash("source-snapshot"),
    publicRatesVerificationFingerprint: hash("public-rates-verification"),
    v2DecisionFingerprint: hash("v2-decision"),
    v3DecisionFingerprint: hash("v3-decision"),
    auditWitnessFingerprint: hash("audit-witness"),
    abstentionChallengeEvidenceFingerprint:
      scenario.abstentionChallengeRequired ? hash("abstention-challenge") : null,
    providerNeutralReplayFingerprint:
      scenario.providerNeutralReplayRequired ? hash("provider-neutral-replay") : null,
    networkExecutionObserved: true,
    realProviderResponseObserved: true,
    testDoubleUsed: false,
    rawSnapshotRetainedForAudit: true,
    directIdentifiersRemoved: true,
    providerIdentityRemoved: true,
    commercialSignalsRemoved: true,
    teacherOutputUsedAsGroundTruth: false,
  };
}

function failedAttempt(
  scenario: StayOptiGoldenControlledLiveSearchScenarioV3,
  index: number
): StayOptiGoldenControlledLiveFailedAttemptV3 {
  return {
    attemptId: `golden-controlled-live-attempt-failed-${String(index).padStart(3, "0")}`,
    scenarioId: scenario.scenarioId,
    caseSlotId: scenario.caseSlotId,
    status: "failed",
    searchRequestFingerprint: scenario.searchRequestFingerprint,
    failureCode: "search-failed",
    failureFingerprint: fingerprint(
      { scenarioId: scenario.scenarioId, index, failure: "search" },
      "stayopti-v3-17d-test-live-failure"
    ),
    countedAsEvidence: false,
  };
}

test("V3-17D freezes exactly 120 uncollected baseline live scenarios", () => {
  const plan = planFor();
  assert.equal(validateGoldenControlledLiveCapturePlanV3(plan).valid, true);
  assert.equal(plan.scenarios.length, 120);
  assert.equal(plan.availableBaselineScenarios, 120);
  assert.equal(
    plan.scenarios.every(({ caseSlotId }) => Number(caseSlotId.slice(-3)) <= 120),
    true
  );
  assert.equal(plan.plannedScenariosCountedAsEvidence, false);
  assert.equal(plan.providerCallsPerformed, 0);
});

test("twenty provider-neutral destinations are represented six times each", () => {
  const plan = planFor();
  assert.equal(STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3.length, 20);
  for (const destinationId of STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3) {
    assert.equal(
      plan.scenarios.filter((scenario) => scenario.destinationId === destinationId).length,
      6
    );
  }
});

test("scenario matrix spans lead times, durations, parties, budgets and distances", () => {
  const plan = planFor();
  assert.equal(new Set(plan.scenarios.map(({ checkInDate }) => checkInDate)).size, 5);
  assert.deepEqual(
    [...new Set(plan.scenarios.map(({ maxDistanceMeters }) => maxDistanceMeters))].sort((a, b) => a - b),
    [500, 1000, 2000, 5000, 10000]
  );
  assert.deepEqual(
    [...new Set(plan.scenarios.map(({ adults }) => adults))].sort((a, b) => a - b),
    [1, 2, 3, 4]
  );
  assert.ok(plan.scenarios.every(({ childAges }) => childAges.every((age) => age >= 0 && age <= 12)));
  assert.ok(plan.scenarios.every(({ totalBudgetEuros }) => totalBudgetEuros > 0));
});

test("first scenario has deterministic provider-neutral search scope", () => {
  const scenario = planFor().scenarios[0];
  assert.ok(scenario !== undefined);
  assert.equal(scenario.destinationId, "firenze-it");
  assert.equal(scenario.checkInDate, "2026-08-29");
  assert.equal(scenario.checkOutDate, "2026-08-31");
  assert.equal(scenario.adults, 1);
  assert.equal(scenario.rooms, 1);
  assert.deepEqual(scenario.childAges, []);
  assert.equal(scenario.totalBudgetEuros, 180);
  assert.equal(scenario.maxDistanceMeters, 500);
  assert.equal(scenario.publicRatesRequired, true);
});

test("plan replay is deterministic and anchor changes are fingerprinted", () => {
  const first = planFor();
  const replay = planFor();
  const shifted = planFor(emptyCampaign(), {
    planId: fixture().planInput.planId,
    collectionAnchorDate: "2026-08-16",
  });
  assert.equal(first.inputFingerprint, replay.inputFingerprint);
  assert.equal(first.fingerprint, replay.fingerprint);
  assert.notEqual(first.fingerprint, shifted.fingerprint);
  assert.notEqual(
    first.scenarios[0]?.searchRequestFingerprint,
    shifted.scenarios[0]?.searchRequestFingerprint
  );
});

test("invalid date and malformed plan identifier fail closed", () => {
  const campaign = emptyCampaign();
  assert.throws(
    () => createGoldenControlledLiveCapturePlanV3(campaign, {
      planId: "invalid",
      collectionAnchorDate: "2026-02-30",
    }),
    /plan input invalid/
  );
});

test("empty fixture creates a zero-evidence session", () => {
  const data = fixture();
  const plan = planFor();
  const session = createGoldenControlledLiveCaptureSessionV3(plan, {
    ...data.sessionInput,
    planFingerprint: plan.fingerprint,
  });
  assert.equal(session.status, "empty");
  assert.equal(session.scenarios.length, 0);
  assert.equal(session.plannedScenariosCountedAsEvidence, false);
  assert.equal(session.providerCallsPerformedByModule, 0);
});

test("session accepts at most ten available baseline scenarios", () => {
  const plan = planFor();
  const session = sessionFor(plan, plan.scenarios.slice(0, 10), "ten-v1");
  assert.equal(session.status, "ready");
  assert.equal(session.scenarios.length, 10);
  assert.equal(session.externalLiveExecutorRequired, true);
});

test("eleven requested searches are rejected before any provider call", () => {
  const plan = planFor();
  assert.throws(
    () => sessionFor(plan, plan.scenarios.slice(0, 11), "eleven-v1"),
    /session-size-exceeded/
  );
});

test("session ordering is independent of requested slot order", () => {
  const plan = planFor();
  const selected = plan.scenarios.slice(0, 3);
  const forward = sessionFor(plan, selected, "ordering-v1");
  const reverse = sessionFor(plan, [...selected].reverse(), "ordering-v1");
  assert.deepEqual(forward.scenarios, reverse.scenarios);
  assert.equal(forward.inputFingerprint, reverse.inputFingerprint);
  assert.equal(forward.fingerprint, reverse.fingerprint);
});

test("session fingerprint rejects post-authorization mutation", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "session-tamper-v1");
  const tampered = structuredClone(session);
  (tampered as unknown as { providerCallsPerformedByModule: number })
    .providerCallsPerformedByModule = 1;
  assert.equal(validateGoldenControlledLiveCaptureSessionV3(tampered).valid, false);
});

test("duplicate and unavailable slots cannot enter a live session", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  assert.throws(
    () => createGoldenControlledLiveCaptureSessionV3(plan, {
      sessionId: "golden-controlled-live-session-duplicate-v1",
      batchId: "golden-real-evidence-batch-duplicate-v1",
      planFingerprint: plan.fingerprint,
      requestedCaseSlotIds: [scenario.caseSlotId, scenario.caseSlotId],
    }),
    /session-duplicate-slot/
  );
  assert.throws(
    () => createGoldenControlledLiveCaptureSessionV3(plan, {
      sessionId: "golden-controlled-live-session-derived-v1",
      batchId: "golden-real-evidence-batch-derived-v1",
      planFingerprint: plan.fingerprint,
      requestedCaseSlotIds: ["golden-collection-case-slot-121"],
    }),
    /session-slot-unavailable/
  );
});

test("stale plan fingerprint cannot authorize a session", () => {
  const plan = planFor();
  assert.throws(
    () => createGoldenControlledLiveCaptureSessionV3(plan, {
      sessionId: "golden-controlled-live-session-stale-v1",
      batchId: "golden-real-evidence-batch-stale-v1",
      planFingerprint: fingerprint("stale", "test"),
      requestedCaseSlotIds: [],
    }),
    /session-input-invalid/
  );
});

test("empty execution exports zero captures and zero evidence", () => {
  const plan = planFor();
  const session = sessionFor(plan, [], "empty-export-v1");
  const result = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [],
  });
  assert.equal(validateGoldenControlledLiveCaptureExportV3(result).valid, true);
  assert.equal(result.status, "empty");
  assert.deepEqual(result.counts, {
    requested: 0,
    captured: 0,
    failed: 0,
    pending: 0,
    exportedCaptures: 0,
  });
  assert.equal(result.batchInput.captures.length, 0);
});

test("one attested live success exports a V3-17C-compatible capture and receipt", () => {
  const campaign = emptyCampaign();
  const plan = planFor(campaign);
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "captured-v1");
  const result = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [capturedAttempt(scenario, 1)],
  });
  const intake = applyGoldenRealEvidenceBatchV3(campaign, result.batchInput);

  assert.equal(result.status, "complete");
  assert.equal(result.counts.captured, 1);
  assert.equal(result.batchInput.captures.length, 1);
  assert.equal(intake.issuedReceipts.length, 1);
  assert.equal(intake.readiness.counts.collectedBaselineCases, 1);
});

test("a failed live attempt is audited but never exported as evidence", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "failed-v1");
  const result = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [failedAttempt(scenario, 1)],
  });

  assert.equal(result.status, "complete");
  assert.equal(result.counts.failed, 1);
  assert.equal(result.counts.exportedCaptures, 0);
  assert.equal(result.batchInput.captures.length, 0);
  assert.equal(result.failedAttemptsCountedAsEvidence, false);
});

test("unattempted searches remain pending and count as zero evidence", () => {
  const plan = planFor();
  const selected = plan.scenarios.slice(0, 2);
  const first = selected[0];
  assert.ok(first !== undefined);
  const session = sessionFor(plan, selected, "pending-v1");
  const result = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [capturedAttempt(first, 1)],
  });

  assert.equal(result.status, "partial");
  assert.equal(result.counts.pending, 1);
  assert.equal(result.pendingAttemptsCountedAsEvidence, false);
});

test("captured and failed attempts can close one audited session", () => {
  const plan = planFor();
  const first = plan.scenarios[0];
  const second = plan.scenarios[1];
  assert.ok(first !== undefined && second !== undefined);
  const session = sessionFor(plan, [first, second], "mixed-v1");
  const result = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [capturedAttempt(first, 1), failedAttempt(second, 2)],
  });
  assert.equal(result.status, "complete");
  assert.deepEqual(result.counts, {
    requested: 2,
    captured: 1,
    failed: 1,
    pending: 0,
    exportedCaptures: 1,
  });
});

test("duplicate attempt IDs and duplicate scenario attempts fail closed", () => {
  const plan = planFor();
  const first = plan.scenarios[0];
  const second = plan.scenarios[1];
  assert.ok(first !== undefined && second !== undefined);
  const session = sessionFor(plan, [first, second], "duplicates-v1");
  const one = capturedAttempt(first, 1);
  const two = capturedAttempt(second, 2);
  two.attemptId = one.attemptId;
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [one, two],
    }),
    /duplicate-controlled-live-attempt/
  );

  const repeated = capturedAttempt(first, 3);
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [one, repeated],
    }),
    /duplicate-controlled-live-scenario-attempt/
  );
});

test("attempt must bind the exact session scenario and search request", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  const outside = plan.scenarios[1];
  assert.ok(scenario !== undefined && outside !== undefined);
  const session = sessionFor(plan, [scenario], "binding-v1");
  const mismatched = capturedAttempt(scenario, 1);
  mismatched.searchRequestFingerprint = fingerprint("wrong", "test");
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [mismatched],
    }),
    /attempt-binding-invalid/
  );
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [capturedAttempt(outside, 2)],
    }),
    /attempt-binding-invalid/
  );
});

test("network execution, real response and no-test-double attestations are mandatory", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "attestation-v1");
  for (const mutation of [
    { networkExecutionObserved: false },
    { realProviderResponseObserved: false },
    { testDoubleUsed: true },
  ]) {
    const attempt = Object.assign(capturedAttempt(scenario, 1), mutation);
    assert.throws(
      () => buildGoldenControlledLiveCaptureExportV3(session, {
        sessionFingerprint: session.fingerprint,
        attempts: [attempt],
      }),
      /captured-attempt-invalid/
    );
  }
});

test("Public Rates, audit witness and source snapshot proofs are mandatory", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "proofs-v1");
  for (const field of [
    "sourceSnapshotFingerprint",
    "publicRatesVerificationFingerprint",
    "auditWitnessFingerprint",
  ] as const) {
    const attempt = capturedAttempt(scenario, 1);
    attempt[field] = "missing";
    assert.throws(
      () => buildGoldenControlledLiveCaptureExportV3(session, {
        sessionFingerprint: session.fingerprint,
        attempts: [attempt],
      }),
      /captured-attempt-invalid/
    );
  }
});

test("scheduled replay and abstention proofs are mandatory", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario?.providerNeutralReplayRequired);
  assert.ok(scenario.abstentionChallengeRequired);
  const session = sessionFor(plan, [scenario], "scheduled-proofs-v1");
  const replayMissing = capturedAttempt(scenario, 1);
  replayMissing.providerNeutralReplayFingerprint = null;
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [replayMissing],
    }),
    /captured-attempt-invalid/
  );
  const abstentionMissing = capturedAttempt(scenario, 2);
  abstentionMissing.abstentionChallengeEvidenceFingerprint = null;
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [abstentionMissing],
    }),
    /captured-attempt-invalid/
  );
});

test("unscheduled replay and abstention proofs must remain absent", () => {
  const plan = planFor();
  const scenario = plan.scenarios[1];
  assert.ok(scenario !== undefined);
  assert.equal(scenario.providerNeutralReplayRequired, false);
  assert.equal(scenario.abstentionChallengeRequired, false);
  const session = sessionFor(plan, [scenario], "unscheduled-proofs-v1");
  const attempt = capturedAttempt(scenario, 2);
  attempt.providerNeutralReplayFingerprint = fingerprint("extra", "test");
  attempt.abstentionChallengeEvidenceFingerprint = fingerprint("extra-2", "test");
  assert.throws(
    () => buildGoldenControlledLiveCaptureExportV3(session, {
      sessionFingerprint: session.fingerprint,
      attempts: [attempt],
    }),
    /captured-attempt-invalid/
  );
});

test("PII, provider identity, credentials and commercial fields are rejected", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "forbidden-v1");
  for (const injected of [
    { email: "forbidden@example.test" },
    { providerName: "forbidden-provider" },
    { apiKey: "forbidden-key" },
    { commission: 1 },
  ]) {
    const attempt = Object.assign(capturedAttempt(scenario, 1), injected);
    assert.throws(
      () => buildGoldenControlledLiveCaptureExportV3(session, {
        sessionFingerprint: session.fingerprint,
        attempts: [attempt],
      }),
      /attempt-forbidden-field/
    );
  }
});

test("blind preferences and outcome metrics are premature during capture", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "premature-v1");
  for (const injected of [
    { preference: "v3" },
    { normalizedRegretV3: 0.1 },
    { outcomeCorrectV3: true },
  ]) {
    const attempt = Object.assign(capturedAttempt(scenario, 1), injected);
    assert.throws(
      () => buildGoldenControlledLiveCaptureExportV3(session, {
        sessionFingerprint: session.fingerprint,
        attempts: [attempt],
      }),
      /attempt-premature-evaluation-field/
    );
  }
});

test("attempt ordering does not change export or batch fingerprint", () => {
  const plan = planFor();
  const first = plan.scenarios[0];
  const second = plan.scenarios[1];
  assert.ok(first !== undefined && second !== undefined);
  const session = sessionFor(plan, [first, second], "replay-v1");
  const firstAttempt = capturedAttempt(first, 1);
  const secondAttempt = failedAttempt(second, 2);
  const forwardInput = {
    sessionFingerprint: session.fingerprint,
    attempts: [firstAttempt, secondAttempt],
  };
  const reverseInput = {
    sessionFingerprint: session.fingerprint,
    attempts: [secondAttempt, firstAttempt],
  };
  const forward = buildGoldenControlledLiveCaptureExportV3(session, forwardInput);
  const reverse = buildGoldenControlledLiveCaptureExportV3(session, reverseInput);
  assert.equal(forward.inputFingerprint, reverse.inputFingerprint);
  assert.equal(forward.fingerprint, reverse.fingerprint);
  assert.equal(
    verifyGoldenControlledLiveCaptureExportReplayV3(session, forwardInput, forward),
    true
  );
});

test("a receipted baseline disappears from the next live plan", () => {
  const campaign = emptyCampaign();
  const plan = planFor(campaign);
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "receipt-v1");
  const exported = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [capturedAttempt(scenario, 1)],
  });
  const intake = applyGoldenRealEvidenceBatchV3(campaign, exported.batchInput);
  const nextPlan = planFor(intake.updatedCampaign, {
    planId: "golden-controlled-live-plan-after-receipt-v1",
    collectionAnchorDate: fixture().planInput.collectionAnchorDate,
  });

  assert.equal(nextPlan.scenarios.length, 119);
  assert.equal(
    nextPlan.scenarios.some(({ caseSlotId }) => caseSlotId === scenario.caseSlotId),
    false
  );
});

test("export fingerprint detects post-build mutation", () => {
  const plan = planFor();
  const scenario = plan.scenarios[0];
  assert.ok(scenario !== undefined);
  const session = sessionFor(plan, [scenario], "tamper-v1");
  const result = buildGoldenControlledLiveCaptureExportV3(session, {
    sessionFingerprint: session.fingerprint,
    attempts: [capturedAttempt(scenario, 1)],
  });
  const tampered = structuredClone(result);
  (tampered as unknown as { statisticalClaimAllowed: boolean }).statisticalClaimAllowed = true;
  assert.equal(validateGoldenControlledLiveCaptureExportV3(tampered).valid, false);
});

test("V3-17D freezes runtime, evidence and commercial boundaries", () => {
  assert.deepEqual(STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_TARGETS_V3, {
    baselineScenarios: 120,
    destinationCount: 20,
    maximumScenariosPerSession: 10,
    currency: "EUR",
    locale: "it-IT",
  });
  assert.deepEqual(STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_AUDIT_V3, {
    application: "controlled-live-capture-protocol-only",
    baselineScenarioCount: 120,
    destinationCount: 20,
    maximumScenariosPerSession: 10,
    plannedScenariosCountedAsEvidence: false,
    failedAttemptsCountedAsEvidence: false,
    pendingAttemptsCountedAsEvidence: false,
    fabricatedCapturesAllowed: false,
    externalLiveExecutorRequired: true,
    providerCallsPerformedByModule: 0,
    bookingCallsPerformedByModule: 0,
    analyticsCallsPerformedByModule: 0,
    deploysPerformedByModule: 0,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    piiAllowed: false,
    providerIdentityAllowed: false,
    credentialsAllowed: false,
    commercialSignalsUsed: false,
    teacherOutputsUsedAsGroundTruth: false,
  });
});
