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

export const STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_VERSION_V3 =
  "3.0.0-golden-real-evidence-batch.1" as const;

export const STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_SCHEMA_VERSION_V3 =
  "3.0.0-golden-real-evidence-batch-schema.1" as const;

export type StayOptiGoldenRealEvidenceBatchStatusV3 =
  | "no-evidence"
  | "partial-real-collection"
  | "real-case-plan-complete";

export interface StayOptiGoldenRealEvidenceCaptureV3 {
  captureId: string;
  caseSlotId: string;
  collectionWindowId: string;
  sourceKind: "controlled-live-search";
  realSearchExecutionFingerprint: string;
  sourceSnapshotFingerprint: string;
  publicRatesVerificationFingerprint: string;
  v2DecisionFingerprint: string;
  v3DecisionFingerprint: string;
  auditWitnessFingerprint: string;
  derivedFromCaseSlotId: string | null;
  derivationFingerprint: string | null;
  abstentionChallengeEvidenceFingerprint: string | null;
  providerNeutralReplayFingerprint: string | null;
  realSourceAttested: true;
  publicRatesVerified: true;
  rawSnapshotRetainedForAudit: true;
  directIdentifiersRemoved: true;
  providerIdentityRemoved: true;
  commercialSignalsRemoved: true;
  teacherOutputUsedAsGroundTruth: false;
  measurementState: "unmeasured";
}

export interface StayOptiGoldenRealEvidenceBatchInputV3 {
  batchId: string;
  campaignFingerprint: string;
  captures: StayOptiGoldenRealEvidenceCaptureV3[];
}

export interface StayOptiGoldenRealEvidenceBatchV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_SCHEMA_VERSION_V3;
  batchVersion: typeof STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_VERSION_V3;
  batchId: string;
  application: "offline-real-evidence-batch-intake-only";
  campaignFingerprintBefore: string;
  captures: StayOptiGoldenRealEvidenceCaptureV3[];
  issuedReceipts: StayOptiGoldenRealCaseReceiptV3[];
  updatedCampaign: StayOptiGoldenCollectionCampaignV3;
  readiness: StayOptiGoldenCollectionReadinessV3;
  status: StayOptiGoldenRealEvidenceBatchStatusV3;
  realCapturesAccepted: number;
  capturesCountedWithoutReceipt: 0;
  fabricatedEvidenceAccepted: false;
  statisticalClaimAllowed: false;
  publicV3PromotionAllowed: false;
  splitEnabled: false;
  publicV2Changed: false;
  commercialSignalsUsed: false;
  batchInputFingerprint: string;
  fingerprint: string;
}

const FORBIDDEN_FIELDS =
  /"(name|email|phone|address|providerId|providerName|providerSlug|commission|markup|affiliateRevenue|clickProbability|userEconomicValue)"\s*:/i;

const PREMATURE_EVALUATION_FIELDS =
  /"(judgmentId|preference|measurement|normalizedRegretV2|normalizedRegretV3|outcomeCorrectV2|outcomeCorrectV3)"\s*:/i;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function pad(value: number): string {
  return String(value).padStart(3, "0");
}

function hashSuffix(value: string): string {
  return value.replace(/^fnv1a32-/, "").slice(-8);
}

function canonicalInput(
  input: StayOptiGoldenRealEvidenceBatchInputV3
): StayOptiGoldenRealEvidenceBatchInputV3 {
  return {
    batchId: input.batchId,
    campaignFingerprint: input.campaignFingerprint,
    captures: input.captures
      .map((capture) => ({ ...capture }))
      .sort((left, right) =>
        left.caseSlotId.localeCompare(right.caseSlotId) ||
        left.captureId.localeCompare(right.captureId)
      ),
  };
}

function captureFingerprint(
  capture: StayOptiGoldenRealEvidenceCaptureV3
): string {
  return createStableHashV3(
    capture,
    "stayopti-v3-golden-real-evidence-capture"
  );
}

function evidenceBundleFingerprint(
  capture: StayOptiGoldenRealEvidenceCaptureV3,
  slotFingerprint: string
): string {
  return createStableHashV3(
    {
      captureFingerprint: captureFingerprint(capture),
      slotFingerprint,
      sourceSnapshotFingerprint: capture.sourceSnapshotFingerprint,
      publicRatesVerificationFingerprint:
        capture.publicRatesVerificationFingerprint,
      v2DecisionFingerprint: capture.v2DecisionFingerprint,
      v3DecisionFingerprint: capture.v3DecisionFingerprint,
      auditWitnessFingerprint: capture.auditWitnessFingerprint,
      derivationFingerprint: capture.derivationFingerprint,
      abstentionChallengeEvidenceFingerprint:
        capture.abstentionChallengeEvidenceFingerprint,
      providerNeutralReplayFingerprint:
        capture.providerNeutralReplayFingerprint,
    },
    "stayopti-v3-golden-real-evidence-bundle"
  );
}

function resultFingerprint(
  payload: Omit<StayOptiGoldenRealEvidenceBatchV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-real-evidence-batch"
  );
}

function validateCaptureShape(
  capture: StayOptiGoldenRealEvidenceCaptureV3
): string[] {
  const violations: string[] = [];
  const requiredFingerprints = [
    capture.realSearchExecutionFingerprint,
    capture.sourceSnapshotFingerprint,
    capture.publicRatesVerificationFingerprint,
    capture.v2DecisionFingerprint,
    capture.v3DecisionFingerprint,
    capture.auditWitnessFingerprint,
  ];
  if (
    !/^golden-real-evidence-capture-[a-z0-9-]+$/.test(capture.captureId) ||
    !/^golden-collection-case-slot-\d{3}$/.test(capture.caseSlotId) ||
    !/^collection-window-[a-z0-9-]+$/.test(capture.collectionWindowId) ||
    capture.sourceKind !== "controlled-live-search" ||
    !requiredFingerprints.every(isStableHashV3) ||
    capture.realSourceAttested !== true ||
    capture.publicRatesVerified !== true ||
    capture.rawSnapshotRetainedForAudit !== true ||
    capture.directIdentifiersRemoved !== true ||
    capture.providerIdentityRemoved !== true ||
    capture.commercialSignalsRemoved !== true ||
    capture.teacherOutputUsedAsGroundTruth !== false ||
    capture.measurementState !== "unmeasured"
  ) {
    violations.push(`capture-contract-invalid:${capture.captureId}`);
  }
  const serialized = JSON.stringify(capture);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push(`capture-forbidden-field:${capture.captureId}`);
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push(`capture-premature-evaluation-field:${capture.captureId}`);
  }
  return violations;
}

function statusFor(
  campaign: StayOptiGoldenCollectionCampaignV3,
  readiness: StayOptiGoldenCollectionReadinessV3
): StayOptiGoldenRealEvidenceBatchStatusV3 {
  if (campaign.caseReceipts.length === 0) {
    return "no-evidence";
  }
  return readiness.caseCollectionComplete
    ? "real-case-plan-complete"
    : "partial-real-collection";
}

export function applyGoldenRealEvidenceBatchV3(
  campaign: StayOptiGoldenCollectionCampaignV3,
  input: StayOptiGoldenRealEvidenceBatchInputV3
): StayOptiGoldenRealEvidenceBatchV3 {
  const campaignValidation = validateGoldenCollectionCampaignV3(campaign);
  if (!campaignValidation.valid) {
    throw new Error(
      `Cannot accept evidence into invalid Golden campaign V3: ${campaignValidation.violations.join(", ")}`
    );
  }

  const canonical = canonicalInput(input);
  const violations: string[] = [];
  const add = (code: string, entityId: string) => {
    violations.push(`${code}:${entityId}`);
  };
  if (
    !/^golden-real-evidence-batch-[a-z0-9-]+$/.test(canonical.batchId) ||
    !isStableHashV3(canonical.campaignFingerprint) ||
    canonical.campaignFingerprint !== campaign.fingerprint
  ) {
    add("batch-contract-invalid", canonical.batchId);
  }

  const slotById = new Map(
    campaign.caseSlots.map((slot) => [slot.caseSlotId, slot])
  );
  const existingReceiptBySlotId = new Map(
    campaign.caseReceipts.map((receipt) => [receipt.caseSlotId, receipt])
  );
  const captureBySlotId = new Map<string, StayOptiGoldenRealEvidenceCaptureV3>();
  const captureIds = new Set<string>();
  const captureSlotIds = new Set<string>();
  for (const capture of canonical.captures) {
    violations.push(...validateCaptureShape(capture));
    if (captureIds.has(capture.captureId)) {
      add("duplicate-capture-id", capture.captureId);
    }
    if (captureSlotIds.has(capture.caseSlotId)) {
      add("duplicate-capture-case-slot", capture.caseSlotId);
    }
    captureIds.add(capture.captureId);
    captureSlotIds.add(capture.caseSlotId);
    captureBySlotId.set(capture.caseSlotId, capture);
    if (existingReceiptBySlotId.has(capture.caseSlotId)) {
      add("case-slot-already-receipted", capture.caseSlotId);
    }
  }

  const baselineSnapshotOwner = new Map<string, string>();
  for (const receipt of campaign.caseReceipts) {
    const slot = slotById.get(receipt.caseSlotId);
    if (slot?.kind !== "baseline") {
      continue;
    }
    const previous = baselineSnapshotOwner.get(receipt.sourceSnapshotFingerprint);
    if (previous !== undefined && previous !== receipt.caseSlotId) {
      add("duplicate-baseline-source-snapshot", receipt.caseSlotId);
    }
    baselineSnapshotOwner.set(
      receipt.sourceSnapshotFingerprint,
      receipt.caseSlotId
    );
  }

  for (const capture of canonical.captures) {
    const slot = slotById.get(capture.caseSlotId);
    if (slot === undefined) {
      add("unknown-case-slot", capture.caseSlotId);
      continue;
    }

    const abstentionProofValid = slot.requiresEvaluableAbstentionChallenge
      ? isStableHashV3(capture.abstentionChallengeEvidenceFingerprint)
      : capture.abstentionChallengeEvidenceFingerprint === null;
    const replayProofValid = slot.requiresProviderNeutralReplay
      ? isStableHashV3(capture.providerNeutralReplayFingerprint)
      : capture.providerNeutralReplayFingerprint === null;
    if (!abstentionProofValid) {
      add("abstention-challenge-proof-invalid", capture.caseSlotId);
    }
    if (!replayProofValid) {
      add("provider-neutral-replay-proof-invalid", capture.caseSlotId);
    }

    if (slot.kind === "baseline") {
      if (
        capture.derivedFromCaseSlotId !== null ||
        capture.derivationFingerprint !== null
      ) {
        add("baseline-derivation-forbidden", capture.caseSlotId);
      }
      const previous = baselineSnapshotOwner.get(
        capture.sourceSnapshotFingerprint
      );
      if (previous !== undefined && previous !== capture.caseSlotId) {
        add("duplicate-baseline-source-snapshot", capture.caseSlotId);
      }
      baselineSnapshotOwner.set(
        capture.sourceSnapshotFingerprint,
        capture.caseSlotId
      );
      continue;
    }

    if (
      capture.derivedFromCaseSlotId !== slot.parentCaseSlotId ||
      !isStableHashV3(capture.derivationFingerprint)
    ) {
      add("derived-case-link-invalid", capture.caseSlotId);
      continue;
    }
    const parentCaseSlotId = slot.parentCaseSlotId;
    const parentReceipt = parentCaseSlotId === null
      ? undefined
      : existingReceiptBySlotId.get(parentCaseSlotId);
    const parentCapture = parentCaseSlotId === null
      ? undefined
      : captureBySlotId.get(parentCaseSlotId);
    const parentSourceSnapshotFingerprint =
      parentReceipt?.sourceSnapshotFingerprint ??
      parentCapture?.sourceSnapshotFingerprint;
    if (parentSourceSnapshotFingerprint === undefined) {
      add("derived-parent-real-snapshot-missing", capture.caseSlotId);
    } else if (
      capture.sourceSnapshotFingerprint !== parentSourceSnapshotFingerprint
    ) {
      add("derived-source-snapshot-mismatch", capture.caseSlotId);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Golden real evidence batch V3 invalid: ${uniqueSorted(violations).join(", ")}`
    );
  }

  const issuedReceipts = canonical.captures.map((capture) => {
    const slot = slotById.get(capture.caseSlotId);
    if (slot === undefined) {
      throw new Error(`Golden collection slot missing: ${capture.caseSlotId}`);
    }
    const suffix = hashSuffix(captureFingerprint(capture));
    const sequence = pad(slot.sequence);
    return {
      receiptId: `golden-real-case-receipt-${sequence}-${suffix}`,
      caseSlotId: capture.caseSlotId,
      caseId: `golden-case-real-${sequence}-${suffix}`,
      collectionWindowId: capture.collectionWindowId,
      sourceSnapshotFingerprint: capture.sourceSnapshotFingerprint,
      v2DecisionFingerprint: capture.v2DecisionFingerprint,
      v3DecisionFingerprint: capture.v3DecisionFingerprint,
      derivationFingerprint: capture.derivationFingerprint,
      abstentionChallengeEvidenceFingerprint:
        capture.abstentionChallengeEvidenceFingerprint,
      providerNeutralReplayFingerprint:
        capture.providerNeutralReplayFingerprint,
      evidenceBundleFingerprint: evidenceBundleFingerprint(
        capture,
        slot.slotFingerprint
      ),
      realSourceVerified: true,
      publicRatesVerified: true,
      rawSnapshotRetainedForAudit: true,
      directIdentifiersRemoved: true,
      providerIdentityRemoved: true,
      commercialSignalsRemoved: true,
      teacherOutputUsedAsGroundTruth: false,
      measurementState: "unmeasured",
    } satisfies StayOptiGoldenRealCaseReceiptV3;
  });

  const updatedCampaign = createGoldenCollectionCampaignV3({
    campaignId: campaign.campaignId,
    planningSeed: campaign.planningSeed,
    caseReceipts: [...campaign.caseReceipts, ...issuedReceipts],
    evaluatorAssignmentClaims: campaign.evaluatorAssignmentClaims,
  });
  const readiness = evaluateGoldenCollectionReadinessV3(updatedCampaign);
  const batchInputFingerprint = createStableHashV3(
    canonical,
    "stayopti-v3-golden-real-evidence-batch-input"
  );
  const payload: Omit<StayOptiGoldenRealEvidenceBatchV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_SCHEMA_VERSION_V3,
    batchVersion: STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_VERSION_V3,
    batchId: canonical.batchId,
    application: "offline-real-evidence-batch-intake-only",
    campaignFingerprintBefore: campaign.fingerprint,
    captures: canonical.captures,
    issuedReceipts,
    updatedCampaign,
    readiness,
    status: statusFor(updatedCampaign, readiness),
    realCapturesAccepted: issuedReceipts.length,
    capturesCountedWithoutReceipt: 0,
    fabricatedEvidenceAccepted: false,
    statisticalClaimAllowed: false,
    publicV3PromotionAllowed: false,
    splitEnabled: false,
    publicV2Changed: false,
    commercialSignalsUsed: false,
    batchInputFingerprint,
  };
  const result = {
    ...payload,
    fingerprint: resultFingerprint(payload),
  };
  const validation = validateGoldenRealEvidenceBatchV3(result);
  if (!validation.valid) {
    throw new Error(
      `Golden real evidence batch V3 result invalid: ${validation.violations.join(", ")}`
    );
  }
  return result;
}

export function validateGoldenRealEvidenceBatchV3(
  result: StayOptiGoldenRealEvidenceBatchV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  const campaignValidation = validateGoldenCollectionCampaignV3(
    result.updatedCampaign
  );
  const readinessValidation = validateGoldenCollectionReadinessV3(
    result.readiness
  );
  if (
    result.schemaVersion !==
      STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_SCHEMA_VERSION_V3 ||
    result.batchVersion !== STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_VERSION_V3 ||
    result.application !== "offline-real-evidence-batch-intake-only" ||
    !/^golden-real-evidence-batch-[a-z0-9-]+$/.test(result.batchId) ||
    !isStableHashV3(result.campaignFingerprintBefore) ||
    result.updatedCampaign.caseReceipts.length < result.issuedReceipts.length ||
    result.realCapturesAccepted !== result.captures.length ||
    result.realCapturesAccepted !== result.issuedReceipts.length ||
    result.capturesCountedWithoutReceipt !== 0 ||
    result.fabricatedEvidenceAccepted !== false ||
    result.statisticalClaimAllowed !== false ||
    result.publicV3PromotionAllowed !== false ||
    result.splitEnabled !== false ||
    result.publicV2Changed !== false ||
    result.commercialSignalsUsed !== false
  ) {
    violations.push("real-evidence-batch-contract-invalid");
  }
  if (!campaignValidation.valid) {
    violations.push("real-evidence-batch-campaign-invalid");
  }
  if (
    !readinessValidation.valid ||
    result.readiness.campaignFingerprint !== result.updatedCampaign.fingerprint
  ) {
    violations.push("real-evidence-batch-readiness-invalid");
  }
  if (result.status !== statusFor(result.updatedCampaign, result.readiness)) {
    violations.push("real-evidence-batch-status-invalid");
  }
  const receiptIds = new Set(
    result.updatedCampaign.caseReceipts.map(({ receiptId }) => receiptId)
  );
  if (!result.issuedReceipts.every(({ receiptId }) => receiptIds.has(receiptId))) {
    violations.push("real-evidence-batch-receipt-ledger-mismatch");
  }
  if (
    !isStableHashV3(result.batchInputFingerprint) ||
    !isStableHashV3(result.fingerprint)
  ) {
    violations.push("real-evidence-batch-fingerprint-invalid");
  } else {
    const { fingerprint: _fingerprint, ...payload } = result;
    if (result.fingerprint !== resultFingerprint(payload)) {
      violations.push("real-evidence-batch-fingerprint-invalid");
    }
  }
  const serialized = JSON.stringify(result);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push("real-evidence-batch-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push("real-evidence-batch-premature-evaluation-field");
  }
  return {
    valid: violations.length === 0,
    violations: uniqueSorted(violations),
  };
}

export function verifyGoldenRealEvidenceBatchReplayV3(
  campaign: StayOptiGoldenCollectionCampaignV3,
  input: StayOptiGoldenRealEvidenceBatchInputV3,
  expected: StayOptiGoldenRealEvidenceBatchV3
): boolean {
  const replay = applyGoldenRealEvidenceBatchV3(campaign, input);
  return (
    replay.batchInputFingerprint === expected.batchInputFingerprint &&
    replay.updatedCampaign.fingerprint === expected.updatedCampaign.fingerprint &&
    replay.fingerprint === expected.fingerprint
  );
}

export const STAYOPTI_GOLDEN_REAL_EVIDENCE_BATCH_AUDIT_V3 = Object.freeze({
  application: "offline-real-evidence-batch-intake-only" as const,
  realCaptureRequiredForEveryReceipt: true as const,
  publicRatesVerificationRequired: true as const,
  auditWitnessRequired: true as const,
  fabricatedEvidenceAllowed: false as const,
  statisticalClaimsAllowed: false as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  providerCallsAllowed: false as const,
  bookingOrPaymentChanged: false as const,
  analyticsChanged: false as const,
  deployChanged: false as const,
  piiAllowed: false as const,
  providerIdentityAllowed: false as const,
  commercialSignalsUsed: false as const,
  teacherOutputsUsedAsGroundTruth: false as const,
});
