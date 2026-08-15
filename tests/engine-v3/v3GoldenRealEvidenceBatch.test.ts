import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_AUDIT_V3,
  applyGoldenRealEvidenceBatchV3,
  createGoldenCollectionCampaignV3,
  createStableHashV3,
  validateGoldenRealEvidenceBatchV3,
  verifyGoldenRealEvidenceBatchReplayV3,
  type StayOptiGoldenCollectionCampaignV3,
  type StayOptiGoldenCollectionCaseSlotV3,
  type StayOptiGoldenRealEvidenceBatchInputV3,
  type StayOptiGoldenRealEvidenceCaptureV3,
} from "../../src/engine-v3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-17c-real-evidence-batch-v1.json"
);

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

function captureFor(
  slot: StayOptiGoldenCollectionCaseSlotV3,
  index: number,
  sourceSnapshotFingerprint?: string
): StayOptiGoldenRealEvidenceCaptureV3 {
  const hash = (purpose: string) =>
    fingerprint(
      { purpose, caseSlotId: slot.caseSlotId, index },
      "stayopti-v3-17c-test-real-evidence"
    );
  return {
    captureId: `golden-real-evidence-capture-${String(index).padStart(3, "0")}`,
    caseSlotId: slot.caseSlotId,
    collectionWindowId: `collection-window-v3-17c-test-${String(index).padStart(3, "0")}`,
    sourceKind: "controlled-live-search",
    realSearchExecutionFingerprint: hash("real-search-execution"),
    sourceSnapshotFingerprint:
      sourceSnapshotFingerprint ?? hash("source-snapshot"),
    publicRatesVerificationFingerprint: hash("public-rates-verification"),
    v2DecisionFingerprint: hash("v2-decision"),
    v3DecisionFingerprint: hash("v3-decision"),
    auditWitnessFingerprint: hash("audit-witness"),
    derivedFromCaseSlotId: slot.parentCaseSlotId,
    derivationFingerprint:
      slot.kind === "baseline" ? null : hash("derivation"),
    abstentionChallengeEvidenceFingerprint:
      slot.requiresEvaluableAbstentionChallenge
        ? hash("abstention-challenge")
        : null,
    providerNeutralReplayFingerprint: slot.requiresProviderNeutralReplay
      ? hash("provider-neutral-replay")
      : null,
    realSourceAttested: true,
    publicRatesVerified: true,
    rawSnapshotRetainedForAudit: true,
    directIdentifiersRemoved: true,
    providerIdentityRemoved: true,
    commercialSignalsRemoved: true,
    teacherOutputUsedAsGroundTruth: false,
    measurementState: "unmeasured",
  };
}

function inputFor(
  campaign: StayOptiGoldenCollectionCampaignV3,
  captures: StayOptiGoldenRealEvidenceCaptureV3[],
  suffix = "test-v1"
): StayOptiGoldenRealEvidenceBatchInputV3 {
  return {
    batchId: `golden-real-evidence-batch-${suffix}`,
    campaignFingerprint: campaign.fingerprint,
    captures,
  };
}

test("V3-17C empty intake accepts zero evidence and issues zero receipts", () => {
  const campaign = emptyCampaign();
  const fixture = JSON.parse(
    readFileSync(fixturePath, "utf8")
  ) as StayOptiGoldenRealEvidenceBatchInputV3;
  assert.equal(fixture.campaignFingerprint, campaign.fingerprint);
  const result = applyGoldenRealEvidenceBatchV3(campaign, fixture);

  assert.equal(validateGoldenRealEvidenceBatchV3(result).valid, true);
  assert.equal(result.status, "no-evidence");
  assert.equal(result.realCapturesAccepted, 0);
  assert.equal(result.issuedReceipts.length, 0);
  assert.equal(result.updatedCampaign.caseReceipts.length, 0);
  assert.equal(result.readiness.counts.collectedRealCases, 0);
  assert.equal(result.statisticalClaimAllowed, false);
});

test("one attested baseline capture issues one deterministic receipt", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const input = inputFor(campaign, [captureFor(slot, 1)]);
  const result = applyGoldenRealEvidenceBatchV3(campaign, input);

  assert.equal(result.status, "partial-real-collection");
  assert.equal(result.realCapturesAccepted, 1);
  assert.equal(result.updatedCampaign.caseReceipts.length, 1);
  assert.match(result.issuedReceipts[0]?.receiptId ?? "", /^golden-real-case-receipt-001-[a-f0-9]{8}$/);
  assert.match(result.issuedReceipts[0]?.caseId ?? "", /^golden-case-real-001-[a-f0-9]{8}$/);
  assert.equal(result.readiness.counts.collectedRealCases, 1);
});

test("baseline and derived capture can enter atomically with the same real snapshot", () => {
  const campaign = emptyCampaign();
  const baselineSlot = campaign.caseSlots[0];
  const derivedSlot = campaign.caseSlots[120];
  assert.ok(baselineSlot !== undefined && derivedSlot !== undefined);
  const baseline = captureFor(baselineSlot, 1);
  const derived = captureFor(
    derivedSlot,
    121,
    baseline.sourceSnapshotFingerprint
  );
  const result = applyGoldenRealEvidenceBatchV3(
    campaign,
    inputFor(campaign, [derived, baseline], "same-batch-v1")
  );

  assert.equal(result.realCapturesAccepted, 2);
  assert.deepEqual(
    result.captures.map(({ caseSlotId }) => caseSlotId),
    [baselineSlot.caseSlotId, derivedSlot.caseSlotId]
  );
  assert.equal(
    result.issuedReceipts[1]?.sourceSnapshotFingerprint,
    result.issuedReceipts[0]?.sourceSnapshotFingerprint
  );
});

test("a later derived batch binds to an already receipted baseline", () => {
  const campaign = emptyCampaign();
  const baselineSlot = campaign.caseSlots[0];
  const derivedSlot = campaign.caseSlots[120];
  assert.ok(baselineSlot !== undefined && derivedSlot !== undefined);
  const baseline = captureFor(baselineSlot, 1);
  const first = applyGoldenRealEvidenceBatchV3(
    campaign,
    inputFor(campaign, [baseline], "baseline-v1")
  );
  const derived = captureFor(
    derivedSlot,
    121,
    baseline.sourceSnapshotFingerprint
  );
  const second = applyGoldenRealEvidenceBatchV3(
    first.updatedCampaign,
    inputFor(first.updatedCampaign, [derived], "derived-v1")
  );

  assert.equal(second.updatedCampaign.caseReceipts.length, 2);
  assert.equal(second.readiness.counts.collectedAdversarialCases, 1);
});

test("derived capture rejects a source snapshot different from its real parent", () => {
  const campaign = emptyCampaign();
  const baselineSlot = campaign.caseSlots[0];
  const derivedSlot = campaign.caseSlots[120];
  assert.ok(baselineSlot !== undefined && derivedSlot !== undefined);
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [
        captureFor(baselineSlot, 1),
        captureFor(derivedSlot, 121),
      ], "mismatch-v1")
    ),
    /derived-source-snapshot-mismatch/
  );
});

test("derived capture cannot precede its real parent snapshot", () => {
  const campaign = emptyCampaign();
  const derivedSlot = campaign.caseSlots[120];
  assert.ok(derivedSlot !== undefined);
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [captureFor(derivedSlot, 121)], "orphan-v1")
    ),
    /derived-parent-real-snapshot-missing/
  );
});

test("baseline capture rejects derivation claims", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const capture = captureFor(slot, 1);
  capture.derivedFromCaseSlotId = "golden-collection-case-slot-002";
  capture.derivationFingerprint = fingerprint("forbidden", "test");
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [capture], "baseline-derivation-v1")
    ),
    /baseline-derivation-forbidden/
  );
});

test("derived capture requires the frozen parent and derivation proof", () => {
  const campaign = emptyCampaign();
  const baselineSlot = campaign.caseSlots[0];
  const derivedSlot = campaign.caseSlots[120];
  assert.ok(baselineSlot !== undefined && derivedSlot !== undefined);
  const baseline = captureFor(baselineSlot, 1);
  const derived = captureFor(derivedSlot, 121, baseline.sourceSnapshotFingerprint);
  derived.derivationFingerprint = null;
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [baseline, derived], "derived-proof-v1")
    ),
    /derived-case-link-invalid/
  );
});

test("unverified Public Rates cannot produce a receipt", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const capture = captureFor(slot, 1);
  (capture as unknown as { publicRatesVerified: boolean }).publicRatesVerified = false;
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [capture], "public-rates-v1")
    ),
    /capture-contract-invalid/
  );
});

test("Public Rates verification fingerprint is mandatory", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const capture = captureFor(slot, 1);
  capture.publicRatesVerificationFingerprint = "missing";
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [capture], "public-rates-proof-v1")
    ),
    /capture-contract-invalid/
  );
});

test("real search execution and audit witness fingerprints are mandatory", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  for (const field of [
    "realSearchExecutionFingerprint",
    "auditWitnessFingerprint",
  ] as const) {
    const capture = captureFor(slot, 1);
    capture[field] = "missing";
    assert.throws(
      () => applyGoldenRealEvidenceBatchV3(
        campaign,
        inputFor(campaign, [capture], `missing-${field.toLowerCase()}-v1`)
      ),
      /capture-contract-invalid/
    );
  }
});

test("scheduled provider-neutral replay proof is mandatory", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot?.requiresProviderNeutralReplay);
  const capture = captureFor(slot, 1);
  capture.providerNeutralReplayFingerprint = null;
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [capture], "replay-proof-v1")
    ),
    /provider-neutral-replay-proof-invalid/
  );
});

test("scheduled abstention challenge proof is mandatory", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot?.requiresEvaluableAbstentionChallenge);
  const capture = captureFor(slot, 1);
  capture.abstentionChallengeEvidenceFingerprint = null;
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [capture], "abstention-proof-v1")
    ),
    /abstention-challenge-proof-invalid/
  );
});

test("unscheduled replay or abstention evidence cannot be smuggled in", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[1];
  assert.ok(slot !== undefined);
  assert.equal(slot.requiresProviderNeutralReplay, false);
  assert.equal(slot.requiresEvaluableAbstentionChallenge, false);
  const capture = captureFor(slot, 2);
  capture.providerNeutralReplayFingerprint = fingerprint("extra", "test");
  capture.abstentionChallengeEvidenceFingerprint = fingerprint("extra-2", "test");
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [capture], "unscheduled-proof-v1")
    ),
    /abstention-challenge-proof-invalid.*provider-neutral-replay-proof-invalid/
  );
});

test("duplicate capture identifiers are rejected", () => {
  const campaign = emptyCampaign();
  const firstSlot = campaign.caseSlots[0];
  const secondSlot = campaign.caseSlots[1];
  assert.ok(firstSlot !== undefined && secondSlot !== undefined);
  const first = captureFor(firstSlot, 1);
  const second = captureFor(secondSlot, 2);
  second.captureId = first.captureId;
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [first, second], "duplicate-id-v1")
    ),
    /duplicate-capture-id/
  );
});

test("one collection slot cannot be captured twice in the same batch", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [captureFor(slot, 1), captureFor(slot, 2)], "duplicate-slot-v1")
    ),
    /duplicate-capture-case-slot/
  );
});

test("an already receipted slot cannot be accepted again", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const first = applyGoldenRealEvidenceBatchV3(
    campaign,
    inputFor(campaign, [captureFor(slot, 1)], "first-v1")
  );
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      first.updatedCampaign,
      inputFor(first.updatedCampaign, [captureFor(slot, 2)], "second-v1")
    ),
    /case-slot-already-receipted/
  );
});

test("two baseline slots cannot reuse one real source snapshot", () => {
  const campaign = emptyCampaign();
  const firstSlot = campaign.caseSlots[0];
  const secondSlot = campaign.caseSlots[1];
  assert.ok(firstSlot !== undefined && secondSlot !== undefined);
  const first = captureFor(firstSlot, 1);
  const second = captureFor(secondSlot, 2, first.sourceSnapshotFingerprint);
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(
      campaign,
      inputFor(campaign, [first, second], "duplicate-source-v1")
    ),
    /duplicate-baseline-source-snapshot/
  );
});

test("capture order does not change the batch or campaign fingerprint", () => {
  const campaign = emptyCampaign();
  const firstSlot = campaign.caseSlots[0];
  const secondSlot = campaign.caseSlots[1];
  assert.ok(firstSlot !== undefined && secondSlot !== undefined);
  const first = captureFor(firstSlot, 1);
  const second = captureFor(secondSlot, 2);
  const forwardInput = inputFor(campaign, [first, second], "deterministic-v1");
  const reverseInput = inputFor(campaign, [second, first], "deterministic-v1");
  const forward = applyGoldenRealEvidenceBatchV3(campaign, forwardInput);
  const reverse = applyGoldenRealEvidenceBatchV3(campaign, reverseInput);

  assert.equal(forward.batchInputFingerprint, reverse.batchInputFingerprint);
  assert.equal(forward.updatedCampaign.fingerprint, reverse.updatedCampaign.fingerprint);
  assert.equal(forward.fingerprint, reverse.fingerprint);
  assert.equal(verifyGoldenRealEvidenceBatchReplayV3(campaign, forwardInput, forward), true);
});

test("evidence mutation changes the receipt, campaign and batch fingerprint", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const original = captureFor(slot, 1);
  const mutated = structuredClone(original);
  mutated.auditWitnessFingerprint = fingerprint("changed-witness", "test");
  const first = applyGoldenRealEvidenceBatchV3(
    campaign,
    inputFor(campaign, [original], "mutation-v1")
  );
  const second = applyGoldenRealEvidenceBatchV3(
    campaign,
    inputFor(campaign, [mutated], "mutation-v1")
  );

  assert.notEqual(
    first.issuedReceipts[0]?.evidenceBundleFingerprint,
    second.issuedReceipts[0]?.evidenceBundleFingerprint
  );
  assert.notEqual(first.updatedCampaign.fingerprint, second.updatedCampaign.fingerprint);
  assert.notEqual(first.fingerprint, second.fingerprint);
});

test("PII, provider identity and commercial fields are rejected", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  for (const injected of [
    { email: "forbidden@example.test" },
    { providerName: "forbidden-provider" },
    { commission: 1 },
  ]) {
    const capture = Object.assign(captureFor(slot, 1), injected);
    assert.throws(
      () => applyGoldenRealEvidenceBatchV3(
        campaign,
        inputFor(campaign, [capture], "forbidden-field-v1")
      ),
      /capture-forbidden-field/
    );
  }
});

test("blind preference and outcome measurements are premature at intake", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  for (const injected of [
    { preference: "v3" },
    { normalizedRegretV3: 0.1 },
    { outcomeCorrectV3: true },
  ]) {
    const capture = Object.assign(captureFor(slot, 1), injected);
    assert.throws(
      () => applyGoldenRealEvidenceBatchV3(
        campaign,
        inputFor(campaign, [capture], "premature-field-v1")
      ),
      /capture-premature-evaluation-field/
    );
  }
});

test("campaign fingerprint binding rejects stale or foreign intake", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const input = inputFor(campaign, [captureFor(slot, 1)], "foreign-campaign-v1");
  input.campaignFingerprint = fingerprint("foreign", "test");
  assert.throws(
    () => applyGoldenRealEvidenceBatchV3(campaign, input),
    /batch-contract-invalid/
  );
});

test("tampering with a batch result invalidates its fingerprint", () => {
  const campaign = emptyCampaign();
  const slot = campaign.caseSlots[0];
  assert.ok(slot !== undefined);
  const result = applyGoldenRealEvidenceBatchV3(
    campaign,
    inputFor(campaign, [captureFor(slot, 1)], "tamper-v1")
  );
  const tampered = structuredClone(result);
  (tampered as unknown as { statisticalClaimAllowed: boolean }).statisticalClaimAllowed = true;
  assert.equal(validateGoldenRealEvidenceBatchV3(tampered).valid, false);
});

test("V3-17C freezes all production and commercial boundaries", () => {
  assert.deepEqual(STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_AUDIT_V3, {
    application: "offline-real-evidence-batch-intake-only",
    realCaptureRequiredForEveryReceipt: true,
    publicRatesVerificationRequired: true,
    auditWitnessRequired: true,
    fabricatedEvidenceAllowed: false,
    statisticalClaimsAllowed: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    providerCallsAllowed: false,
    bookingOrPaymentChanged: false,
    analyticsChanged: false,
    deployChanged: false,
    piiAllowed: false,
    providerIdentityAllowed: false,
    commercialSignalsUsed: false,
    teacherOutputsUsedAsGroundTruth: false,
  });
});
