import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";
import {
  createGoldenCollectionCampaignV3,
  evaluateGoldenCollectionReadinessV3,
  validateGoldenCollectionCampaignV3,
  validateGoldenCollectionReadinessV3,
  type StayOptiGoldenCollectionCampaignV3,
  type StayOptiGoldenCollectionReadinessV3,
  type StayOptiGoldenCollectionValidationV3,
  type StayOptiGoldenRealCaseReceiptV3,
} from "./goldenDecisionCollectionCampaignV3";

export const STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_VERSION_V3 =
  "3.0.0-golden-real-evidence-checkpoint.1" as const;

export const STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_SCHEMA_VERSION_V3 =
  "3.0.0-golden-real-evidence-checkpoint-schema.1" as const;

export interface StayOptiGoldenRealEvidenceCheckpointSourceV3 {
  evidenceArchiveSha256: string;
  collector: string;
  collectorVersion: string;
  repositoryHead: string;
  batchId: string;
  batchInputFingerprint: string;
  batchFingerprint: string;
  campaignFingerprintBefore: string;
  campaignFingerprintAfter: string;
  realCapturesAccepted: number;
}

export interface StayOptiGoldenRealEvidenceCheckpointInputV3 {
  checkpointId: string;
  campaignId: string;
  planningSeed: string;
  sourceEvidence: StayOptiGoldenRealEvidenceCheckpointSourceV3;
  caseReceipts: StayOptiGoldenRealCaseReceiptV3[];
}

export interface StayOptiGoldenRealEvidenceCheckpointV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_SCHEMA_VERSION_V3;
  checkpointVersion:
    typeof STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_VERSION_V3;
  checkpointId: string;
  application: "offline-cumulative-real-evidence-checkpoint-only";
  campaignId: string;
  planningSeed: string;
  sourceEvidence: StayOptiGoldenRealEvidenceCheckpointSourceV3;
  caseReceipts: StayOptiGoldenRealCaseReceiptV3[];
  campaignFingerprint: string;
  readiness: StayOptiGoldenCollectionReadinessV3;
  importedCaseReceipts: number;
  capturesCountedWithoutReceipt: 0;
  fabricatedEvidenceAccepted: false;
  statisticalClaimAllowed: false;
  publicV3PromotionAllowed: false;
  splitEnabled: false;
  publicV2Changed: false;
  commercialSignalsUsed: false;
  inputFingerprint: string;
  fingerprint: string;
}

const FORBIDDEN_FIELDS =
  /"(name|email|phone|address|providerId|providerName|providerSlug|commission|markup|affiliateRevenue|clickProbability|userEconomicValue)"\s*:/i;

const PREMATURE_EVALUATION_FIELDS =
  /"(judgmentId|preference|measurement|normalizedRegretV2|normalizedRegretV3|outcomeCorrectV2|outcomeCorrectV3)"\s*:/i;

const PILOT_CHECKPOINT_INPUT: StayOptiGoldenRealEvidenceCheckpointInputV3 = {
  checkpointId: "golden-real-evidence-checkpoint-v3-17f-pilot-20260815",
  campaignId: "golden-collection-campaign-v3-17b-real-v1",
  planningSeed: "fnv1a32-17b00001",
  sourceEvidence: {
    evidenceArchiveSha256:
      "263185686c0f5622e235e2724d61338e0ea2ebcf010a814d9dd3e03fd30125a7",
    collector: "StayOpti V3-17E Golden Controlled Live Capture Pilot Repair",
    collectorVersion: "2.0.0",
    repositoryHead: "185d93060577a383505de1a220016568c0a914dc",
    batchId: "golden-real-evidence-batch-v3-17e-pilot-20260815",
    batchInputFingerprint: "fnv1a32-e1eb5606",
    batchFingerprint: "fnv1a32-d7439093",
    campaignFingerprintBefore: "fnv1a32-f019e0fd",
    campaignFingerprintAfter: "fnv1a32-053c4b56",
    realCapturesAccepted: 3,
  },
  caseReceipts: [
    {
      receiptId: "golden-real-case-receipt-001-79340953",
      caseSlotId: "golden-collection-case-slot-001",
      caseId: "golden-case-real-001-79340953",
      collectionWindowId: "collection-window-v3-17e-pilot-20260815",
      sourceSnapshotFingerprint: "fnv1a32-c6841636",
      v2DecisionFingerprint: "fnv1a32-747c988d",
      v3DecisionFingerprint: "fnv1a32-b8a1d1b1",
      derivationFingerprint: null,
      abstentionChallengeEvidenceFingerprint: "fnv1a32-7d55bacb",
      providerNeutralReplayFingerprint: "fnv1a32-bb46fb5f",
      evidenceBundleFingerprint: "fnv1a32-d4d637c0",
      realSourceVerified: true,
      publicRatesVerified: true,
      rawSnapshotRetainedForAudit: true,
      directIdentifiersRemoved: true,
      providerIdentityRemoved: true,
      commercialSignalsRemoved: true,
      teacherOutputUsedAsGroundTruth: false,
      measurementState: "unmeasured",
    },
    {
      receiptId: "golden-real-case-receipt-002-2c7807ce",
      caseSlotId: "golden-collection-case-slot-002",
      caseId: "golden-case-real-002-2c7807ce",
      collectionWindowId: "collection-window-v3-17e-pilot-20260815",
      sourceSnapshotFingerprint: "fnv1a32-e85aad3a",
      v2DecisionFingerprint: "fnv1a32-747c988d",
      v3DecisionFingerprint: "fnv1a32-f7170802",
      derivationFingerprint: null,
      abstentionChallengeEvidenceFingerprint: null,
      providerNeutralReplayFingerprint: null,
      evidenceBundleFingerprint: "fnv1a32-d4411c98",
      realSourceVerified: true,
      publicRatesVerified: true,
      rawSnapshotRetainedForAudit: true,
      directIdentifiersRemoved: true,
      providerIdentityRemoved: true,
      commercialSignalsRemoved: true,
      teacherOutputUsedAsGroundTruth: false,
      measurementState: "unmeasured",
    },
    {
      receiptId: "golden-real-case-receipt-003-87a945c6",
      caseSlotId: "golden-collection-case-slot-003",
      caseId: "golden-case-real-003-87a945c6",
      collectionWindowId: "collection-window-v3-17e-pilot-20260815",
      sourceSnapshotFingerprint: "fnv1a32-65924494",
      v2DecisionFingerprint: "fnv1a32-747c988d",
      v3DecisionFingerprint: "fnv1a32-9f0d0d53",
      derivationFingerprint: null,
      abstentionChallengeEvidenceFingerprint: null,
      providerNeutralReplayFingerprint: "fnv1a32-2fc8add9",
      evidenceBundleFingerprint: "fnv1a32-856039b5",
      realSourceVerified: true,
      publicRatesVerified: true,
      rawSnapshotRetainedForAudit: true,
      directIdentifiersRemoved: true,
      providerIdentityRemoved: true,
      commercialSignalsRemoved: true,
      teacherOutputUsedAsGroundTruth: false,
      measurementState: "unmeasured",
    },
  ],
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function canonicalInput(
  input: StayOptiGoldenRealEvidenceCheckpointInputV3
): StayOptiGoldenRealEvidenceCheckpointInputV3 {
  return {
    checkpointId: input.checkpointId,
    campaignId: input.campaignId,
    planningSeed: input.planningSeed,
    sourceEvidence: { ...input.sourceEvidence },
    caseReceipts: input.caseReceipts
      .map((receipt) => ({ ...receipt }))
      .sort((left, right) =>
        left.caseSlotId.localeCompare(right.caseSlotId) ||
        left.receiptId.localeCompare(right.receiptId)
      ),
  };
}

function checkpointFingerprint(
  payload: Omit<StayOptiGoldenRealEvidenceCheckpointV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-real-evidence-checkpoint"
  );
}

function campaignFor(
  input: StayOptiGoldenRealEvidenceCheckpointInputV3
): StayOptiGoldenCollectionCampaignV3 {
  return createGoldenCollectionCampaignV3({
    campaignId: input.campaignId,
    planningSeed: input.planningSeed,
    caseReceipts: input.caseReceipts,
    evaluatorAssignmentClaims: [],
  });
}

function buildCheckpoint(
  input: StayOptiGoldenRealEvidenceCheckpointInputV3
): StayOptiGoldenRealEvidenceCheckpointV3 {
  const canonical = canonicalInput(input);
  const campaign = campaignFor(canonical);
  const readiness = evaluateGoldenCollectionReadinessV3(campaign);
  const inputFingerprint = createStableHashV3(
    canonical,
    "stayopti-v3-golden-real-evidence-checkpoint-input"
  );
  const payload: Omit<StayOptiGoldenRealEvidenceCheckpointV3, "fingerprint"> = {
    schemaVersion:
      STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_SCHEMA_VERSION_V3,
    checkpointVersion: STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_VERSION_V3,
    checkpointId: canonical.checkpointId,
    application: "offline-cumulative-real-evidence-checkpoint-only",
    campaignId: canonical.campaignId,
    planningSeed: canonical.planningSeed,
    sourceEvidence: canonical.sourceEvidence,
    caseReceipts: canonical.caseReceipts,
    campaignFingerprint: campaign.fingerprint,
    readiness,
    importedCaseReceipts: canonical.caseReceipts.length,
    capturesCountedWithoutReceipt: 0,
    fabricatedEvidenceAccepted: false,
    statisticalClaimAllowed: false,
    publicV3PromotionAllowed: false,
    splitEnabled: false,
    publicV2Changed: false,
    commercialSignalsUsed: false,
    inputFingerprint,
  };
  return {
    ...payload,
    fingerprint: checkpointFingerprint(payload),
  };
}

export function validateGoldenRealEvidenceCheckpointV3(
  checkpoint: StayOptiGoldenRealEvidenceCheckpointV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  const add = (code: string) => violations.push(code);
  if (
    checkpoint.schemaVersion !==
      STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_SCHEMA_VERSION_V3 ||
    checkpoint.checkpointVersion !==
      STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_VERSION_V3 ||
    !/^golden-real-evidence-checkpoint-[a-z0-9-]+$/.test(
      checkpoint.checkpointId
    ) ||
    checkpoint.application !==
      "offline-cumulative-real-evidence-checkpoint-only" ||
    checkpoint.capturesCountedWithoutReceipt !== 0 ||
    checkpoint.fabricatedEvidenceAccepted !== false ||
    checkpoint.statisticalClaimAllowed !== false ||
    checkpoint.publicV3PromotionAllowed !== false ||
    checkpoint.splitEnabled !== false ||
    checkpoint.publicV2Changed !== false ||
    checkpoint.commercialSignalsUsed !== false
  ) {
    add("checkpoint-contract-invalid");
  }
  const source = checkpoint.sourceEvidence;
  if (
    !/^[0-9a-f]{64}$/.test(source.evidenceArchiveSha256) ||
    source.collector !==
      "StayOpti V3-17E Golden Controlled Live Capture Pilot Repair" ||
    source.collectorVersion !== "2.0.0" ||
    !/^[0-9a-f]{40}$/.test(source.repositoryHead) ||
    !/^golden-real-evidence-batch-[a-z0-9-]+$/.test(source.batchId) ||
    !isStableHashV3(source.batchInputFingerprint) ||
    !isStableHashV3(source.batchFingerprint) ||
    !isStableHashV3(source.campaignFingerprintBefore) ||
    !isStableHashV3(source.campaignFingerprintAfter) ||
    !Number.isInteger(source.realCapturesAccepted) ||
    source.realCapturesAccepted <= 0 ||
    source.realCapturesAccepted !== checkpoint.caseReceipts.length ||
    checkpoint.importedCaseReceipts !== checkpoint.caseReceipts.length
  ) {
    add("checkpoint-source-evidence-invalid");
  }
  const serialized = JSON.stringify(checkpoint);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    add("checkpoint-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    add("checkpoint-premature-evaluation-field");
  }
  try {
    const expected = buildCheckpoint({
      checkpointId: checkpoint.checkpointId,
      campaignId: checkpoint.campaignId,
      planningSeed: checkpoint.planningSeed,
      sourceEvidence: checkpoint.sourceEvidence,
      caseReceipts: checkpoint.caseReceipts,
    });
    const campaign = campaignFor({
      checkpointId: checkpoint.checkpointId,
      campaignId: checkpoint.campaignId,
      planningSeed: checkpoint.planningSeed,
      sourceEvidence: checkpoint.sourceEvidence,
      caseReceipts: checkpoint.caseReceipts,
    });
    if (!validateGoldenCollectionCampaignV3(campaign).valid) {
      add("checkpoint-campaign-invalid");
    }
    if (!validateGoldenCollectionReadinessV3(checkpoint.readiness).valid) {
      add("checkpoint-readiness-invalid");
    }
    if (
      checkpoint.campaignFingerprint !== source.campaignFingerprintAfter ||
      checkpoint.campaignFingerprint !== campaign.fingerprint
    ) {
      add("checkpoint-campaign-binding-invalid");
    }
    if (
      !isStableHashV3(checkpoint.inputFingerprint) ||
      !isStableHashV3(checkpoint.fingerprint) ||
      JSON.stringify(checkpoint) !== JSON.stringify(expected)
    ) {
      add("checkpoint-replay-invalid");
    }
  } catch {
    add("checkpoint-reconstruction-failed");
  }
  return {
    valid: violations.length === 0,
    violations: uniqueSorted(violations),
  };
}

export function createGoldenRealEvidenceCheckpointV3(
  input: StayOptiGoldenRealEvidenceCheckpointInputV3
): StayOptiGoldenRealEvidenceCheckpointV3 {
  const checkpoint = buildCheckpoint(input);
  const validation = validateGoldenRealEvidenceCheckpointV3(checkpoint);
  if (!validation.valid) {
    throw new Error(
      `Golden real-evidence checkpoint V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return checkpoint;
}

export function resumeGoldenCollectionCampaignFromCheckpointV3(
  checkpoint: StayOptiGoldenRealEvidenceCheckpointV3
): StayOptiGoldenCollectionCampaignV3 {
  const validation = validateGoldenRealEvidenceCheckpointV3(checkpoint);
  if (!validation.valid) {
    throw new Error(
      `Cannot resume invalid Golden real-evidence checkpoint V3: ${validation.violations.join(", ")}`
    );
  }
  return campaignFor({
    checkpointId: checkpoint.checkpointId,
    campaignId: checkpoint.campaignId,
    planningSeed: checkpoint.planningSeed,
    sourceEvidence: checkpoint.sourceEvidence,
    caseReceipts: checkpoint.caseReceipts,
  });
}

export function verifyGoldenRealEvidenceCheckpointReplayV3(
  checkpoint: StayOptiGoldenRealEvidenceCheckpointV3
): boolean {
  const validation = validateGoldenRealEvidenceCheckpointV3(checkpoint);
  if (!validation.valid) {
    return false;
  }
  const replay = buildCheckpoint({
    checkpointId: checkpoint.checkpointId,
    campaignId: checkpoint.campaignId,
    planningSeed: checkpoint.planningSeed,
    sourceEvidence: checkpoint.sourceEvidence,
    caseReceipts: checkpoint.caseReceipts,
  });
  return (
    replay.inputFingerprint === checkpoint.inputFingerprint &&
    replay.fingerprint === checkpoint.fingerprint &&
    replay.campaignFingerprint === checkpoint.campaignFingerprint &&
    replay.readiness.fingerprint === checkpoint.readiness.fingerprint
  );
}

export function createGoldenPilotReceiptCheckpointV3():
  StayOptiGoldenRealEvidenceCheckpointV3 {
  return createGoldenRealEvidenceCheckpointV3(PILOT_CHECKPOINT_INPUT);
}

export const STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3 = Object.freeze(
  createGoldenPilotReceiptCheckpointV3()
);

export const STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_AUDIT_V3 = Object.freeze({
  version: STAYOPTI_GOLDEN_REAL_EVIDENCE_CHECKPOINT_VERSION_V3,
  checkpointId: STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3.checkpointId,
  sourceEvidenceArchiveSha256:
    STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3.sourceEvidence
      .evidenceArchiveSha256,
  importedCaseReceipts:
    STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3.importedCaseReceipts,
  collectedRealCases:
    STAYOPTI_GOLDEN_PILOT_RECEIPT_CHECKPOINT_V3.readiness.counts
      .collectedRealCases,
  nextUncollectedCaseSlotId: "golden-collection-case-slot-004",
  evidenceArchiveStoredInRepository: false,
  rawProviderResponseStored: false,
  providerIdentityStored: false,
  commercialSignalsStored: false,
  publicV2Changed: false,
  publicV3Enabled: false,
  splitEnabled: false,
  statisticalClaimAllowed: false,
  publicV3PromotionAllowed: false,
});
