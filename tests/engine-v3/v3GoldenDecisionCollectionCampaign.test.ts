import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3,
  STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3,
  STAYOPTI_GOLDEN_DECISION_CASE_KINDS_V3,
  STAYOPTI_GOLDEN_DECISION_ROLES_V3,
  STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3,
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
  createGoldenCollectionCampaignV3,
  createGoldenEvaluatorAssignmentClaimV3,
  createStableHashV3,
  evaluateGoldenCollectionReadinessV3,
  validateGoldenCollectionCampaignV3,
  validateGoldenCollectionReadinessV3,
  verifyGoldenCollectionCampaignReplayV3,
  type StayOptiGoldenCollectionCampaignInputV3,
  type StayOptiGoldenCollectionCampaignV3,
  type StayOptiGoldenCollectionCaseSlotV3,
  type StayOptiGoldenRealCaseReceiptV3,
} from "../../src/engine-v3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-17b-real-collection-campaign-v1.json"
);

function fingerprint(value: unknown, namespace: string): string {
  return createStableHashV3(value, namespace);
}

function emptyInput(): StayOptiGoldenCollectionCampaignInputV3 {
  return JSON.parse(
    readFileSync(fixturePath, "utf8")
  ) as StayOptiGoldenCollectionCampaignInputV3;
}

function receiptFor(
  slot: StayOptiGoldenCollectionCaseSlotV3,
  index: number
): StayOptiGoldenRealCaseReceiptV3 {
  const id = String(index + 1).padStart(3, "0");
  const hash = (purpose: string) =>
    fingerprint(
      { purpose, caseSlotId: slot.caseSlotId, index },
      "stayopti-v3-17b-test-real-evidence"
    );
  return {
    receiptId: `golden-real-case-receipt-${id}`,
    caseSlotId: slot.caseSlotId,
    caseId: `golden-case-real-${id}`,
    collectionWindowId: `collection-window-test-${id}`,
    sourceSnapshotFingerprint: hash("source-snapshot"),
    v2DecisionFingerprint: hash("v2-decision"),
    v3DecisionFingerprint: hash("v3-decision"),
    derivationFingerprint:
      slot.kind === "baseline" ? null : hash("derived-case"),
    abstentionChallengeEvidenceFingerprint:
      slot.requiresEvaluableAbstentionChallenge
        ? hash("evaluable-abstention-challenge")
        : null,
    providerNeutralReplayFingerprint:
      slot.requiresProviderNeutralReplay
        ? hash("provider-neutral-replay")
        : null,
    evidenceBundleFingerprint: hash("evidence-bundle"),
    realSourceVerified: true,
    publicRatesVerified: true,
    rawSnapshotRetainedForAudit: true,
    directIdentifiersRemoved: true,
    providerIdentityRemoved: true,
    commercialSignalsRemoved: true,
    teacherOutputUsedAsGroundTruth: false,
    measurementState: "unmeasured",
  };
}

function completeInput(): StayOptiGoldenCollectionCampaignInputV3 {
  const input = emptyInput();
  const planned = createGoldenCollectionCampaignV3(input);
  return {
    ...input,
    caseReceipts: planned.caseSlots.map(receiptFor),
    evaluatorAssignmentClaims: planned.blindAssignmentSlots.map(
      (slot, index) =>
        createGoldenEvaluatorAssignmentClaimV3(
          slot,
          `golden-assignment-claim-${slot.evaluatorClass}-${String(
            index + 1
          ).padStart(3, "0")}`,
          fingerprint(
            { assignmentSlotId: slot.assignmentSlotId, evaluator: index },
            "stayopti-v3-17b-test-evaluator"
          )
        )
    ),
  };
}

test("V3-17B creates a real collection plan without counting planned slots as evidence", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());
  const readiness = evaluateGoldenCollectionReadinessV3(campaign);

  assert.equal(validateGoldenCollectionCampaignV3(campaign).valid, true);
  assert.equal(campaign.caseSlots.length, 200);
  assert.equal(campaign.blindAssignmentSlots.length, 400);
  assert.equal(campaign.caseReceipts.length, 0);
  assert.equal(campaign.evaluatorAssignmentClaims.length, 0);
  assert.equal(campaign.plannedSlotsCountedAsEvidence, false);
  assert.equal(campaign.plannedAssignmentsCountedAsJudgments, false);
  assert.equal(readiness.status, "real-case-collection-required");
  assert.equal(readiness.counts.collectedRealCases, 0);
  assert.equal(readiness.counts.blindJudgmentsCounted, 0);
  assert.equal(readiness.statisticalClaimAllowed, false);
});

test("the campaign freezes the exact 120/40/40 real-case quota", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());
  const count = (kind: string) =>
    campaign.caseSlots.filter((slot) => slot.kind === kind).length;

  assert.deepEqual(STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3, {
    baselineCaseSlots: 120,
    adversarialCaseSlots: 40,
    counterfactualCaseSlots: 40,
    totalCaseSlots: 200,
    humanBlindAssignmentSlots: 300,
    expertBlindAssignmentSlots: 100,
    evaluableAbstentionChallengeSlots: 20,
    providerNeutralReplaySlots: 100,
  });
  assert.equal(count("baseline"), 120);
  assert.equal(count("adversarial"), 40);
  assert.equal(count("counterfactual"), 40);
});

test("every frozen profile, segment, role and case kind is represented", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());

  assert.deepEqual(
    [...new Set(campaign.caseSlots.map(({ kind }) => kind))].sort(),
    [...STAYOPTI_GOLDEN_DECISION_CASE_KINDS_V3].sort()
  );
  assert.deepEqual(
    [...new Set(campaign.caseSlots.map(({ profile }) => profile))].sort(),
    [...STAYOPTI_ROLE_POLICY_PROFILES_V3].sort()
  );
  assert.deepEqual(
    [...new Set(campaign.caseSlots.map(({ segment }) => segment))].sort(),
    [...STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3].sort()
  );
  assert.deepEqual(
    [...new Set(campaign.caseSlots.map(({ role }) => role))].sort(),
    [...STAYOPTI_GOLDEN_DECISION_ROLES_V3].sort()
  );
});

test("derived slots always bind to a baseline real-search slot", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());
  const byId = new Map(campaign.caseSlots.map((slot) => [slot.caseSlotId, slot]));

  for (const slot of campaign.caseSlots) {
    if (slot.kind === "baseline") {
      assert.equal(slot.parentCaseSlotId, null);
      continue;
    }
    const parent = slot.parentCaseSlotId === null
      ? undefined
      : byId.get(slot.parentCaseSlotId);
    assert.equal(parent?.kind, "baseline");
  }
});

test("twenty abstention challenges and one hundred provider-neutral replays are scheduled", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());
  assert.equal(
    campaign.caseSlots.filter(
      ({ requiresEvaluableAbstentionChallenge }) =>
        requiresEvaluableAbstentionChallenge
    ).length,
    20
  );
  assert.equal(
    campaign.caseSlots.filter(
      ({ requiresProviderNeutralReplay }) => requiresProviderNeutralReplay
    ).length,
    100
  );
});

test("blind assignment planning freezes 300 human and 100 expert slots", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());
  const human = campaign.blindAssignmentSlots.filter(
    ({ evaluatorClass }) => evaluatorClass === "human"
  );
  const expert = campaign.blindAssignmentSlots.filter(
    ({ evaluatorClass }) => evaluatorClass === "expert"
  );
  assert.equal(human.length, 300);
  assert.equal(expert.length, 100);
  assert.ok(
    campaign.blindAssignmentSlots.every(
      ({ engineLabelsHidden, sameRoleComparison, plannedAssignmentIsBlindJudgment }) =>
        engineLabelsHidden && sameRoleComparison && !plannedAssignmentIsBlindJudgment
    )
  );
  assert.deepEqual(
    [...new Set(campaign.blindAssignmentSlots.map(({ internalSideOrder }) => internalSideOrder))].sort(),
    ["v2-left", "v3-left"]
  );
});

test("complete test-only receipts make the campaign ready only for blind judgments", () => {
  const campaign = createGoldenCollectionCampaignV3(completeInput());
  const readiness = evaluateGoldenCollectionReadinessV3(campaign);

  assert.equal(validateGoldenCollectionReadinessV3(readiness).valid, true);
  assert.equal(readiness.status, "ready-for-blind-judgments");
  assert.equal(readiness.caseCollectionComplete, true);
  assert.equal(readiness.blindEvaluatorAssignmentsComplete, true);
  assert.equal(readiness.readyForBlindJudgmentCollection, true);
  assert.equal(readiness.counts.collectedRealCases, 200);
  assert.equal(readiness.counts.claimedHumanBlindAssignments, 300);
  assert.equal(readiness.counts.claimedExpertBlindAssignments, 100);
  assert.equal(readiness.counts.blindJudgmentsCounted, 0);
  assert.equal(readiness.goldenDatasetGatePassed, false);
  assert.equal(readiness.statisticalClaimAllowed, false);
  assert.equal(readiness.publicV3PromotionAllowed, false);
});

test("199 receipts keep real-case collection open", () => {
  const input = completeInput();
  input.caseReceipts.pop();
  const readiness = evaluateGoldenCollectionReadinessV3(
    createGoldenCollectionCampaignV3(input)
  );
  assert.equal(readiness.status, "real-case-collection-required");
  assert.equal(readiness.counts.collectedRealCases, 199);
});

test("299 human claims keep blind evaluator assignment open", () => {
  const input = completeInput();
  const humanIndex = input.evaluatorAssignmentClaims
    .map(({ evaluatorClass }) => evaluatorClass)
    .lastIndexOf("human");
  assert.ok(humanIndex >= 0);
  input.evaluatorAssignmentClaims.splice(humanIndex, 1);
  const readiness = evaluateGoldenCollectionReadinessV3(
    createGoldenCollectionCampaignV3(input)
  );
  assert.equal(readiness.status, "blind-evaluator-assignment-required");
  assert.equal(readiness.counts.claimedHumanBlindAssignments, 299);
  assert.equal(readiness.counts.blindJudgmentsCounted, 0);
});

test("baseline receipts reject fabricated derivation evidence", () => {
  const input = completeInput();
  const receipt = input.caseReceipts[0];
  assert.ok(receipt !== undefined);
  receipt.derivationFingerprint = fingerprint("forbidden", "test");
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /real-case-receipt-invalid/
  );
});

test("derived receipts require a derivation fingerprint", () => {
  const input = completeInput();
  const receipt = input.caseReceipts[120];
  assert.ok(receipt !== undefined);
  receipt.derivationFingerprint = null;
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /real-case-receipt-invalid/
  );
});

test("unverified Public Rates cannot enter the real collection ledger", () => {
  const input = completeInput();
  const receipt = input.caseReceipts[0];
  assert.ok(receipt !== undefined);
  (receipt as unknown as { publicRatesVerified: boolean }).publicRatesVerified =
    false;
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /real-case-receipt-invalid/
  );
});

test("scheduled provider-neutral replay evidence is mandatory", () => {
  const input = completeInput();
  const receipt = input.caseReceipts[0];
  assert.ok(receipt !== undefined);
  receipt.providerNeutralReplayFingerprint = null;
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /real-case-receipt-invalid/
  );
});

test("scheduled evaluable abstention evidence is mandatory", () => {
  const input = completeInput();
  const receipt = input.caseReceipts[0];
  assert.ok(receipt !== undefined);
  receipt.abstentionChallengeEvidenceFingerprint = null;
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /real-case-receipt-invalid/
  );
});

test("one real case cannot satisfy two collection slots", () => {
  const input = completeInput();
  const duplicate = structuredClone(input.caseReceipts[0]);
  assert.ok(duplicate !== undefined);
  duplicate.receiptId = "golden-real-case-receipt-duplicate";
  input.caseReceipts.push(duplicate);
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /duplicate-case-slot-receipt/
  );
});

test("the same evaluator cannot claim the same case twice", () => {
  const planned = createGoldenCollectionCampaignV3(emptyInput());
  const firstSlot = planned.blindAssignmentSlots.find(
    ({ evaluatorClass }) => evaluatorClass === "human"
  );
  const secondSlot = planned.blindAssignmentSlots.find(
    (slot) =>
      slot.evaluatorClass === "human" &&
      slot.caseSlotId === firstSlot?.caseSlotId &&
      slot.assignmentSlotId !== firstSlot?.assignmentSlotId
  );
  assert.ok(firstSlot !== undefined && secondSlot !== undefined);
  const evaluatorPseudonym = fingerprint("duplicate-evaluator", "test");
  const input = emptyInput();
  input.evaluatorAssignmentClaims = [
    createGoldenEvaluatorAssignmentClaimV3(
      firstSlot,
      "golden-assignment-claim-duplicate-a",
      evaluatorPseudonym
    ),
    createGoldenEvaluatorAssignmentClaimV3(
      secondSlot,
      "golden-assignment-claim-duplicate-b",
      evaluatorPseudonym
    ),
  ];
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /duplicate-evaluator-case-assignment/
  );
});

test("blindness, consent and independence claims fail closed", () => {
  const input = completeInput();
  const claim = input.evaluatorAssignmentClaims[0];
  assert.ok(claim !== undefined);
  (claim as unknown as { engineLabelsHidden: boolean }).engineLabelsHidden = false;
  assert.throws(
    () => createGoldenCollectionCampaignV3(input),
    /evaluator-assignment-claim-invalid/
  );
});

test("PII, provider identity, commercial data and premature outcomes are rejected", () => {
  const valid = createGoldenCollectionCampaignV3(emptyInput());
  const injected = structuredClone(valid) as StayOptiGoldenCollectionCampaignV3 & {
    email?: string;
    providerId?: string;
    commission?: number;
    preference?: string;
  };
  injected.email = "forbidden@example.invalid";
  injected.providerId = "forbidden-provider";
  injected.commission = 10;
  injected.preference = "v3";
  const validation = validateGoldenCollectionCampaignV3(injected);
  assert.equal(validation.valid, false);
  assert.ok(validation.violations.some((value) => value.startsWith("forbidden-field")));
  assert.ok(
    validation.violations.some((value) => value.startsWith("premature-evaluation-field"))
  );
});

test("campaign planning and replay are deterministic under receipt ordering", () => {
  const input = completeInput();
  const first = createGoldenCollectionCampaignV3(input);
  const reordered: StayOptiGoldenCollectionCampaignInputV3 = {
    ...input,
    caseReceipts: [...input.caseReceipts].reverse(),
    evaluatorAssignmentClaims: [...input.evaluatorAssignmentClaims].reverse(),
  };
  const second = createGoldenCollectionCampaignV3(reordered);
  assert.deepEqual(second, first);
  assert.equal(verifyGoldenCollectionCampaignReplayV3(reordered, first), true);
});

test("campaign and readiness fingerprints detect mutation", () => {
  const campaign = createGoldenCollectionCampaignV3(emptyInput());
  const tamperedCampaign = structuredClone(campaign);
  const firstSlot = tamperedCampaign.caseSlots[0];
  assert.ok(firstSlot !== undefined);
  firstSlot.role = "best-sensible-saving";
  assert.equal(validateGoldenCollectionCampaignV3(tamperedCampaign).valid, false);

  const readiness = evaluateGoldenCollectionReadinessV3(campaign);
  const tamperedReadiness = structuredClone(readiness);
  (
    tamperedReadiness as unknown as { statisticalClaimAllowed: boolean }
  ).statisticalClaimAllowed = true;
  assert.equal(validateGoldenCollectionReadinessV3(tamperedReadiness).valid, false);
});

test("V3-17B audit freezes collection, runtime and commercial boundaries", () => {
  assert.equal(Object.isFrozen(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3), true);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.plannedSlotsCountedAsEvidence, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.plannedAssignmentsCountedAsJudgments, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.fabricatedCasesAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.fabricatedJudgmentsAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.statisticalClaimsAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.publicV2Changed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.publicV3Enabled, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.splitEnabled, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.providerCallsAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.piiAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.providerIdentityAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.commercialSignalsUsed, false);
  assert.equal(STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3.teacherOutputsUsedAsGroundTruth, false);
});
