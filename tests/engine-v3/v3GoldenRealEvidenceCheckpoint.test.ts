import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3,
  STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_AUDIT_V3,
  createGoldenPilotReceiptCheckpointV3,
  createGoldenRealEvidenceCheckpointV3,
  resumeGoldenCollectionCampaignFromCheckpointV3,
  validateGoldenCollectionCampaignV3,
  validateGoldenRealEvidenceCheckpointV3,
  verifyGoldenRealEvidenceCheckpointReplayV3,
  type StayOptiGoldenRealEvidenceCheckpointInputV3,
  type StayOptiGoldenRealEvidenceCheckpointV3,
} from "../../src/engine-v3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-17f-golden-pilot-receipt-checkpoint-v1.json"
);

function fixture(): StayOptiGoldenRealEvidenceCheckpointInputV3 {
  return JSON.parse(
    readFileSync(fixturePath, "utf8")
  ) as StayOptiGoldenRealEvidenceCheckpointInputV3;
}

test("V3-17F freezes the three accepted V3-17E pilot receipts", () => {
  const checkpoint = createGoldenPilotReceiptCheckpointV3();
  assert.equal(validateGoldenRealEvidenceCheckpointV3(checkpoint).valid, true);
  assert.equal(checkpoint.importedCaseReceipts, 3);
  assert.deepEqual(
    checkpoint.caseReceipts.map(({ caseSlotId }) => caseSlotId),
    [
      "golden-collection-case-slot-001",
      "golden-collection-case-slot-002",
      "golden-collection-case-slot-003",
    ]
  );
  assert.equal(checkpoint.inputFingerprint, "fnv1a32-62fde014");
  assert.equal(checkpoint.fingerprint, "fnv1a32-e21dd712");
});

test("fixture and embedded pilot checkpoint are deterministic", () => {
  const fromFixture = createGoldenRealEvidenceCheckpointV3(fixture());
  assert.deepEqual(fromFixture, STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3);
  assert.equal(verifyGoldenRealEvidenceCheckpointReplayV3(fromFixture), true);
  assert.equal(fromFixture.sourceEvidence.batchFingerprint, "fnv1a32-d7439093");
  assert.equal(
    fromFixture.sourceEvidence.evidenceArchiveSha256,
    "263185686c0f5622e235e2724d61338e0ea2ebcf010a814d9dd3e03fd30125a7"
  );
});

test("checkpoint resumes the cumulative campaign at three of two hundred", () => {
  const checkpoint = createGoldenPilotReceiptCheckpointV3();
  const campaign = resumeGoldenCollectionCampaignFromCheckpointV3(checkpoint);
  assert.equal(validateGoldenCollectionCampaignV3(campaign).valid, true);
  assert.equal(campaign.fingerprint, "fnv1a32-053c4b56");
  assert.equal(campaign.caseReceipts.length, 3);
  assert.equal(checkpoint.readiness.fingerprint, "fnv1a32-67ac51dc");
  assert.equal(checkpoint.readiness.counts.plannedCaseSlots, 200);
  assert.equal(checkpoint.readiness.counts.collectedRealCases, 3);
  assert.equal(checkpoint.readiness.counts.collectedBaselineCases, 3);
  assert.equal(checkpoint.readiness.counts.collectedAdversarialCases, 0);
  assert.equal(checkpoint.readiness.counts.collectedCounterfactualCases, 0);
  assert.equal(
    checkpoint.readiness.counts.collectedEvaluableAbstentionChallenges,
    1
  );
  assert.equal(checkpoint.readiness.counts.collectedProviderNeutralReplays, 2);
  assert.equal(checkpoint.readiness.status, "real-case-collection-required");
});

test("checkpoint remains offline and cannot promote public V3", () => {
  const checkpoint = createGoldenPilotReceiptCheckpointV3();
  assert.equal(checkpoint.capturesCountedWithoutReceipt, 0);
  assert.equal(checkpoint.fabricatedEvidenceAccepted, false);
  assert.equal(checkpoint.statisticalClaimAllowed, false);
  assert.equal(checkpoint.publicV3PromotionAllowed, false);
  assert.equal(checkpoint.publicV2Changed, false);
  assert.equal(checkpoint.splitEnabled, false);
  assert.equal(checkpoint.commercialSignalsUsed, false);
  assert.equal(STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_AUDIT_V3.nextUncollectedCaseSlotId, "golden-collection-case-slot-004");
});

test("receipt mutation invalidates checkpoint replay", () => {
  const tampered = structuredClone(
    STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3
  ) as StayOptiGoldenRealEvidenceCheckpointV3;
  const receipt = tampered.caseReceipts[1];
  assert.ok(receipt !== undefined);
  receipt.sourceSnapshotFingerprint = "fnv1a32-00000000";
  const validation = validateGoldenRealEvidenceCheckpointV3(tampered);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.violations.includes("checkpoint-reconstruction-failed") ||
      validation.violations.includes("checkpoint-replay-invalid")
  );
  assert.equal(verifyGoldenRealEvidenceCheckpointReplayV3(tampered), false);
});

test("duplicate receipt for the same case slot fails closed", () => {
  const input = fixture();
  const first = input.caseReceipts[0];
  assert.ok(first !== undefined);
  input.caseReceipts.push({
    ...first,
    receiptId: "golden-real-case-receipt-duplicate-001",
    caseId: "golden-case-real-duplicate-001",
  });
  assert.throws(
    () => createGoldenRealEvidenceCheckpointV3(input),
    /duplicate-case-slot-receipt/
  );
});

test("checkpoint contains no provider identity, PII or commercial fields", () => {
  const serialized = JSON.stringify(
    STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3
  );
  assert.doesNotMatch(
    serialized,
    /"(name|email|phone|address|providerId|providerName|providerSlug|commission|markup|affiliateRevenue|clickProbability|userEconomicValue)"\s*:/i
  );
  assert.doesNotMatch(
    serialized,
    /"(judgmentId|preference|measurement|normalizedRegretV2|normalizedRegretV3|outcomeCorrectV2|outcomeCorrectV3)"\s*:/i
  );
});
