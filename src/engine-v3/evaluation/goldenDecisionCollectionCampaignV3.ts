import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";
import {
  STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3,
  STAYOPTI_GOLDEN_DECISION_ROLES_V3,
  STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3,
  type StayOptiGoldenDecisionCaseKindV3,
  type StayOptiGoldenDecisionRoleV3,
  type StayOptiGoldenDecisionSegmentV3,
  type StayOptiGoldenEvaluatorClassV3,
} from "./goldenDecisionDatasetV3";
import {
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
  type StayOptiRolePolicyProfileV3,
} from "../policy/personalUtilityRolePolicyV3";

export const STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3 =
  "3.0.0-golden-real-collection.1" as const;

export const STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_SCHEMA_VERSION_V3 =
  "3.0.0-golden-real-collection-schema.1" as const;

export const STAYOPTI_GOLDEN_COLLECTION_CONSENT_PROTOCOL_V3 =
  "stayopti-blind-evaluation-consent-v1" as const;

export const STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3 = Object.freeze({
  baselineCaseSlots: 120,
  adversarialCaseSlots: 40,
  counterfactualCaseSlots: 40,
  totalCaseSlots: STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3.goldenCases,
  humanBlindAssignmentSlots:
    STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3.humanBlindJudgments,
  expertBlindAssignmentSlots:
    STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3.expertBlindJudgments,
  evaluableAbstentionChallengeSlots:
    STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3.evaluableAbstentions,
  providerNeutralReplaySlots:
    STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3.providerNeutralReplays,
});

export type StayOptiGoldenCollectionSideOrderV3 =
  | "v2-left"
  | "v3-left";

export type StayOptiGoldenCollectionReadinessStatusV3 =
  | "real-case-collection-required"
  | "blind-evaluator-assignment-required"
  | "ready-for-blind-judgments";

export interface StayOptiGoldenCollectionCaseSlotV3 {
  caseSlotId: string;
  sequence: number;
  kind: StayOptiGoldenDecisionCaseKindV3;
  profile: StayOptiRolePolicyProfileV3;
  segment: StayOptiGoldenDecisionSegmentV3;
  role: StayOptiGoldenDecisionRoleV3;
  parentCaseSlotId: string | null;
  requiresEvaluableAbstentionChallenge: boolean;
  requiresProviderNeutralReplay: boolean;
  plannedSlotIsStatisticalEvidence: false;
  slotFingerprint: string;
}

export interface StayOptiGoldenBlindAssignmentSlotV3 {
  assignmentSlotId: string;
  sequence: number;
  caseSlotId: string;
  evaluatorClass: StayOptiGoldenEvaluatorClassV3;
  role: StayOptiGoldenDecisionRoleV3;
  internalSideOrder: StayOptiGoldenCollectionSideOrderV3;
  engineLabelsHidden: true;
  sameRoleComparison: true;
  plannedAssignmentIsBlindJudgment: false;
  assignmentSlotFingerprint: string;
}

export interface StayOptiGoldenRealCaseReceiptV3 {
  receiptId: string;
  caseSlotId: string;
  caseId: string;
  collectionWindowId: string;
  sourceSnapshotFingerprint: string;
  v2DecisionFingerprint: string;
  v3DecisionFingerprint: string;
  derivationFingerprint: string | null;
  abstentionChallengeEvidenceFingerprint: string | null;
  providerNeutralReplayFingerprint: string | null;
  evidenceBundleFingerprint: string;
  realSourceVerified: true;
  publicRatesVerified: true;
  rawSnapshotRetainedForAudit: true;
  directIdentifiersRemoved: true;
  providerIdentityRemoved: true;
  commercialSignalsRemoved: true;
  teacherOutputUsedAsGroundTruth: false;
  measurementState: "unmeasured";
}

export interface StayOptiGoldenEvaluatorAssignmentClaimV3 {
  claimId: string;
  assignmentSlotId: string;
  evaluatorClass: StayOptiGoldenEvaluatorClassV3;
  evaluatorPseudonym: string;
  consentProtocolVersion:
    typeof STAYOPTI_GOLDEN_COLLECTION_CONSENT_PROTOCOL_V3;
  independentEvaluatorAttested: true;
  engineLabelsHidden: true;
  sameRoleComparison: true;
  providerIdentityHidden: true;
  assignmentFingerprint: string;
}

export interface StayOptiGoldenCollectionCampaignInputV3 {
  campaignId: string;
  planningSeed: string;
  caseReceipts: StayOptiGoldenRealCaseReceiptV3[];
  evaluatorAssignmentClaims: StayOptiGoldenEvaluatorAssignmentClaimV3[];
}

export interface StayOptiGoldenCollectionCampaignV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_SCHEMA_VERSION_V3;
  campaignVersion: typeof STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3;
  campaignId: string;
  planningSeed: string;
  application: "offline-real-evidence-collection-only";
  caseSlots: StayOptiGoldenCollectionCaseSlotV3[];
  blindAssignmentSlots: StayOptiGoldenBlindAssignmentSlotV3[];
  caseReceipts: StayOptiGoldenRealCaseReceiptV3[];
  evaluatorAssignmentClaims: StayOptiGoldenEvaluatorAssignmentClaimV3[];
  plannedSlotsCountedAsEvidence: false;
  plannedAssignmentsCountedAsJudgments: false;
  fabricatedCasesAllowed: false;
  fabricatedJudgmentsAllowed: false;
  statisticalClaimAllowed: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  commercialSignalsUsed: false;
  inputFingerprint: string;
  fingerprint: string;
}

export interface StayOptiGoldenCollectionValidationV3 {
  valid: boolean;
  violations: string[];
}

export interface StayOptiGoldenCollectionCriterionV3 {
  criterionId: string;
  category: "real-cases" | "blind-assignments";
  threshold: number;
  actual: number;
  status: "pass" | "fail";
}

export interface StayOptiGoldenCollectionCountsV3 {
  plannedCaseSlots: number;
  collectedRealCases: number;
  collectedBaselineCases: number;
  collectedAdversarialCases: number;
  collectedCounterfactualCases: number;
  collectedEvaluableAbstentionChallenges: number;
  collectedProviderNeutralReplays: number;
  plannedHumanBlindAssignments: number;
  plannedExpertBlindAssignments: number;
  claimedHumanBlindAssignments: number;
  claimedExpertBlindAssignments: number;
  blindJudgmentsCounted: 0;
}

export interface StayOptiGoldenCollectionReadinessV3 {
  campaignVersion: typeof STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3;
  campaignFingerprint: string;
  status: StayOptiGoldenCollectionReadinessStatusV3;
  counts: StayOptiGoldenCollectionCountsV3;
  criteria: StayOptiGoldenCollectionCriterionV3[];
  caseCollectionComplete: boolean;
  blindEvaluatorAssignmentsComplete: boolean;
  readyForBlindJudgmentCollection: boolean;
  goldenDatasetGatePassed: false;
  statisticalClaimAllowed: false;
  publicV3PromotionAllowed: false;
  splitEnabled: false;
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

function caseKindFor(index: number): StayOptiGoldenDecisionCaseKindV3 {
  if (index < STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.baselineCaseSlots) {
    return "baseline";
  }
  if (
    index <
    STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.baselineCaseSlots +
      STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.adversarialCaseSlots
  ) {
    return "adversarial";
  }
  return "counterfactual";
}

function sideOrderFor(
  planningSeed: string,
  assignmentSlotId: string
): StayOptiGoldenCollectionSideOrderV3 {
  const fingerprint = createStableHashV3(
    { planningSeed, assignmentSlotId },
    "stayopti-v3-golden-collection-side-order"
  );
  const finalDigit = Number.parseInt(fingerprint.slice(-1), 16);
  return finalDigit % 2 === 0 ? "v2-left" : "v3-left";
}

function buildCaseSlots(
  planningSeed: string
): StayOptiGoldenCollectionCaseSlotV3[] {
  return Array.from(
    { length: STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.totalCaseSlots },
    (_, index) => {
      const sequence = index + 1;
      const caseSlotId = `golden-collection-case-slot-${pad(sequence)}`;
      const kind = caseKindFor(index);
      const profile = STAYOPTI_ROLE_POLICY_PROFILES_V3[
        Math.floor(index / STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3.length) %
          STAYOPTI_ROLE_POLICY_PROFILES_V3.length
      ];
      const segment = STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3[
        index % STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3.length
      ];
      const role = STAYOPTI_GOLDEN_DECISION_ROLES_V3[
        (index + Math.floor(index / 5)) %
          STAYOPTI_GOLDEN_DECISION_ROLES_V3.length
      ];
      if (profile === undefined || segment === undefined || role === undefined) {
        throw new Error("Golden collection taxonomy is incomplete.");
      }
      const derivedIndex = Math.max(
        0,
        index - STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.baselineCaseSlots
      );
      const parentCaseSlotId = kind === "baseline"
        ? null
        : `golden-collection-case-slot-${pad(
            (derivedIndex %
              STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.baselineCaseSlots) +
              1
          )}`;
      const payload = {
        caseSlotId,
        sequence,
        kind,
        profile,
        segment,
        role,
        parentCaseSlotId,
        requiresEvaluableAbstentionChallenge: index % 10 === 0,
        requiresProviderNeutralReplay: index % 2 === 0,
        plannedSlotIsStatisticalEvidence: false as const,
      };
      return {
        ...payload,
        slotFingerprint: createStableHashV3(
          { planningSeed, payload },
          "stayopti-v3-golden-collection-case-slot"
        ),
      };
    }
  );
}

function assignmentCaseIndex(
  evaluatorClass: StayOptiGoldenEvaluatorClassV3,
  index: number
): number {
  if (evaluatorClass === "human") {
    return index < 200 ? index : ((index - 200) * 37) % 200;
  }
  return (index * 73 + 17) % 200;
}

function buildBlindAssignmentSlots(
  planningSeed: string,
  caseSlots: readonly StayOptiGoldenCollectionCaseSlotV3[]
): StayOptiGoldenBlindAssignmentSlotV3[] {
  const build = (
    evaluatorClass: StayOptiGoldenEvaluatorClassV3,
    count: number
  ): StayOptiGoldenBlindAssignmentSlotV3[] =>
    Array.from({ length: count }, (_, index) => {
      const sequence = index + 1;
      const assignmentSlotId =
        `golden-assignment-slot-${evaluatorClass}-${pad(sequence)}`;
      const caseSlot = caseSlots[assignmentCaseIndex(evaluatorClass, index)];
      if (caseSlot === undefined) {
        throw new Error("Golden collection case assignment is incomplete.");
      }
      const payload = {
        assignmentSlotId,
        sequence,
        caseSlotId: caseSlot.caseSlotId,
        evaluatorClass,
        role: caseSlot.role,
        internalSideOrder: sideOrderFor(planningSeed, assignmentSlotId),
        engineLabelsHidden: true as const,
        sameRoleComparison: true as const,
        plannedAssignmentIsBlindJudgment: false as const,
      };
      return {
        ...payload,
        assignmentSlotFingerprint: createStableHashV3(
          { planningSeed, payload },
          "stayopti-v3-golden-blind-assignment-slot"
        ),
      };
    });

  return [
    ...build(
      "human",
      STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.humanBlindAssignmentSlots
    ),
    ...build(
      "expert",
      STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3.expertBlindAssignmentSlots
    ),
  ];
}

function canonicalInput(
  input: StayOptiGoldenCollectionCampaignInputV3
): StayOptiGoldenCollectionCampaignInputV3 {
  return {
    campaignId: input.campaignId,
    planningSeed: input.planningSeed,
    caseReceipts: input.caseReceipts
      .map((receipt) => ({ ...receipt }))
      .sort((left, right) => left.receiptId.localeCompare(right.receiptId)),
    evaluatorAssignmentClaims: input.evaluatorAssignmentClaims
      .map((claim) => ({ ...claim }))
      .sort((left, right) => left.claimId.localeCompare(right.claimId)),
  };
}

function campaignFingerprint(
  payload: Omit<StayOptiGoldenCollectionCampaignV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-golden-collection-campaign");
}

function readinessFingerprint(
  payload: Omit<StayOptiGoldenCollectionReadinessV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-golden-collection-readiness");
}

function expectedAssignmentFingerprint(
  slot: StayOptiGoldenBlindAssignmentSlotV3,
  evaluatorPseudonym: string
): string {
  return createStableHashV3(
    {
      assignmentSlotFingerprint: slot.assignmentSlotFingerprint,
      evaluatorPseudonym,
      consentProtocolVersion: STAYOPTI_GOLDEN_COLLECTION_CONSENT_PROTOCOL_V3,
    },
    "stayopti-v3-golden-evaluator-assignment-claim"
  );
}

export function createGoldenEvaluatorAssignmentClaimV3(
  slot: StayOptiGoldenBlindAssignmentSlotV3,
  claimId: string,
  evaluatorPseudonym: string
): StayOptiGoldenEvaluatorAssignmentClaimV3 {
  return {
    claimId,
    assignmentSlotId: slot.assignmentSlotId,
    evaluatorClass: slot.evaluatorClass,
    evaluatorPseudonym,
    consentProtocolVersion: STAYOPTI_GOLDEN_COLLECTION_CONSENT_PROTOCOL_V3,
    independentEvaluatorAttested: true,
    engineLabelsHidden: true,
    sameRoleComparison: true,
    providerIdentityHidden: true,
    assignmentFingerprint: expectedAssignmentFingerprint(
      slot,
      evaluatorPseudonym
    ),
  };
}

export function validateGoldenCollectionCampaignV3(
  campaign: StayOptiGoldenCollectionCampaignV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  const add = (code: string, entityId: string) => {
    violations.push(`${code}:${entityId}`);
  };

  if (
    campaign.schemaVersion !==
      STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_SCHEMA_VERSION_V3 ||
    campaign.campaignVersion !== STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3 ||
    campaign.application !== "offline-real-evidence-collection-only" ||
    !/^golden-collection-campaign-[a-z0-9-]+$/.test(campaign.campaignId) ||
    !isStableHashV3(campaign.planningSeed)
  ) {
    add("campaign-contract-invalid", campaign.campaignId);
  }

  if (
    campaign.plannedSlotsCountedAsEvidence !== false ||
    campaign.plannedAssignmentsCountedAsJudgments !== false ||
    campaign.fabricatedCasesAllowed !== false ||
    campaign.fabricatedJudgmentsAllowed !== false ||
    campaign.statisticalClaimAllowed !== false ||
    campaign.publicV2Changed !== false ||
    campaign.publicV3Enabled !== false ||
    campaign.splitEnabled !== false ||
    campaign.commercialSignalsUsed !== false
  ) {
    add("campaign-firewall-open", campaign.campaignId);
  }

  const expectedCaseSlots = buildCaseSlots(campaign.planningSeed);
  const expectedAssignmentSlots = buildBlindAssignmentSlots(
    campaign.planningSeed,
    expectedCaseSlots
  );
  if (JSON.stringify(campaign.caseSlots) !== JSON.stringify(expectedCaseSlots)) {
    add("case-plan-mutated", campaign.campaignId);
  }
  if (
    JSON.stringify(campaign.blindAssignmentSlots) !==
    JSON.stringify(expectedAssignmentSlots)
  ) {
    add("blind-assignment-plan-mutated", campaign.campaignId);
  }

  const caseSlotById = new Map(
    campaign.caseSlots.map((slot) => [slot.caseSlotId, slot])
  );
  const receiptIds = new Set<string>();
  const receivedCaseSlots = new Set<string>();
  const caseIds = new Set<string>();
  for (const receipt of campaign.caseReceipts) {
    const slot = caseSlotById.get(receipt.caseSlotId);
    if (receiptIds.has(receipt.receiptId)) {
      add("duplicate-case-receipt", receipt.receiptId);
    }
    if (receivedCaseSlots.has(receipt.caseSlotId)) {
      add("duplicate-case-slot-receipt", receipt.receiptId);
    }
    if (caseIds.has(receipt.caseId)) {
      add("duplicate-collected-case", receipt.caseId);
    }
    receiptIds.add(receipt.receiptId);
    receivedCaseSlots.add(receipt.caseSlotId);
    caseIds.add(receipt.caseId);

    const baselineDerivationValid =
      slot?.kind === "baseline" && receipt.derivationFingerprint === null;
    const derivedDerivationValid =
      slot !== undefined &&
      slot.kind !== "baseline" &&
      isStableHashV3(receipt.derivationFingerprint);
    const abstentionEvidenceValid = slot === undefined
      ? false
      : slot.requiresEvaluableAbstentionChallenge
        ? isStableHashV3(receipt.abstentionChallengeEvidenceFingerprint)
        : receipt.abstentionChallengeEvidenceFingerprint === null;
    const providerReplayValid = slot === undefined
      ? false
      : slot.requiresProviderNeutralReplay
        ? isStableHashV3(receipt.providerNeutralReplayFingerprint)
        : receipt.providerNeutralReplayFingerprint === null;

    if (
      slot === undefined ||
      !/^golden-real-case-receipt-[a-z0-9-]+$/.test(receipt.receiptId) ||
      !/^golden-case-[a-z0-9-]+$/.test(receipt.caseId) ||
      !/^collection-window-[a-z0-9-]+$/.test(receipt.collectionWindowId) ||
      !isStableHashV3(receipt.sourceSnapshotFingerprint) ||
      !isStableHashV3(receipt.v2DecisionFingerprint) ||
      !isStableHashV3(receipt.v3DecisionFingerprint) ||
      !isStableHashV3(receipt.evidenceBundleFingerprint) ||
      (!baselineDerivationValid && !derivedDerivationValid) ||
      !abstentionEvidenceValid ||
      !providerReplayValid ||
      receipt.realSourceVerified !== true ||
      receipt.publicRatesVerified !== true ||
      receipt.rawSnapshotRetainedForAudit !== true ||
      receipt.directIdentifiersRemoved !== true ||
      receipt.providerIdentityRemoved !== true ||
      receipt.commercialSignalsRemoved !== true ||
      receipt.teacherOutputUsedAsGroundTruth !== false ||
      receipt.measurementState !== "unmeasured"
    ) {
      add("real-case-receipt-invalid", receipt.receiptId);
    }
  }

  const assignmentSlotById = new Map(
    campaign.blindAssignmentSlots.map((slot) => [slot.assignmentSlotId, slot])
  );
  const claimIds = new Set<string>();
  const claimedAssignmentSlots = new Set<string>();
  const evaluatorCaseAssignments = new Set<string>();
  for (const claim of campaign.evaluatorAssignmentClaims) {
    const slot = assignmentSlotById.get(claim.assignmentSlotId);
    if (claimIds.has(claim.claimId)) {
      add("duplicate-assignment-claim", claim.claimId);
    }
    if (claimedAssignmentSlots.has(claim.assignmentSlotId)) {
      add("duplicate-assignment-slot-claim", claim.claimId);
    }
    claimIds.add(claim.claimId);
    claimedAssignmentSlots.add(claim.assignmentSlotId);

    const evaluatorCaseKey = slot === undefined
      ? claim.claimId
      : [slot.caseSlotId, claim.evaluatorClass, claim.evaluatorPseudonym].join("|");
    if (evaluatorCaseAssignments.has(evaluatorCaseKey)) {
      add("duplicate-evaluator-case-assignment", claim.claimId);
    }
    evaluatorCaseAssignments.add(evaluatorCaseKey);

    if (
      slot === undefined ||
      !/^golden-assignment-claim-[a-z0-9-]+$/.test(claim.claimId) ||
      claim.evaluatorClass !== slot.evaluatorClass ||
      !isStableHashV3(claim.evaluatorPseudonym) ||
      claim.consentProtocolVersion !==
        STAYOPTI_GOLDEN_COLLECTION_CONSENT_PROTOCOL_V3 ||
      claim.independentEvaluatorAttested !== true ||
      claim.engineLabelsHidden !== true ||
      claim.sameRoleComparison !== true ||
      claim.providerIdentityHidden !== true ||
      claim.assignmentFingerprint !==
        expectedAssignmentFingerprint(slot, claim.evaluatorPseudonym)
    ) {
      add("evaluator-assignment-claim-invalid", claim.claimId);
    }
  }

  const serialized = JSON.stringify(campaign);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    add("forbidden-field", campaign.campaignId);
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    add("premature-evaluation-field", campaign.campaignId);
  }

  const { fingerprint: _fingerprint, ...payload } = campaign;
  if (
    !isStableHashV3(campaign.inputFingerprint) ||
    !isStableHashV3(campaign.fingerprint) ||
    campaign.fingerprint !== campaignFingerprint(payload)
  ) {
    add("campaign-fingerprint-invalid", campaign.campaignId);
  }

  return {
    valid: violations.length === 0,
    violations: uniqueSorted(violations),
  };
}

export function createGoldenCollectionCampaignV3(
  input: StayOptiGoldenCollectionCampaignInputV3
): StayOptiGoldenCollectionCampaignV3 {
  const canonical = canonicalInput(input);
  const caseSlots = buildCaseSlots(canonical.planningSeed);
  const blindAssignmentSlots = buildBlindAssignmentSlots(
    canonical.planningSeed,
    caseSlots
  );
  const inputFingerprint = createStableHashV3(
    canonical,
    "stayopti-v3-golden-collection-campaign-input"
  );
  const payload: Omit<StayOptiGoldenCollectionCampaignV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_SCHEMA_VERSION_V3,
    campaignVersion: STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3,
    campaignId: canonical.campaignId,
    planningSeed: canonical.planningSeed,
    application: "offline-real-evidence-collection-only",
    caseSlots,
    blindAssignmentSlots,
    caseReceipts: canonical.caseReceipts,
    evaluatorAssignmentClaims: canonical.evaluatorAssignmentClaims,
    plannedSlotsCountedAsEvidence: false,
    plannedAssignmentsCountedAsJudgments: false,
    fabricatedCasesAllowed: false,
    fabricatedJudgmentsAllowed: false,
    statisticalClaimAllowed: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    commercialSignalsUsed: false,
    inputFingerprint,
  };
  const campaign = {
    ...payload,
    fingerprint: campaignFingerprint(payload),
  };
  const validation = validateGoldenCollectionCampaignV3(campaign);
  if (!validation.valid) {
    throw new Error(
      `Golden collection campaign V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return campaign;
}

function collectionCriterion(
  criterionId: string,
  category: StayOptiGoldenCollectionCriterionV3["category"],
  threshold: number,
  actual: number
): StayOptiGoldenCollectionCriterionV3 {
  return {
    criterionId,
    category,
    threshold,
    actual,
    status: actual >= threshold ? "pass" : "fail",
  };
}

export function evaluateGoldenCollectionReadinessV3(
  campaign: StayOptiGoldenCollectionCampaignV3
): StayOptiGoldenCollectionReadinessV3 {
  const validation = validateGoldenCollectionCampaignV3(campaign);
  if (!validation.valid) {
    throw new Error(
      `Cannot evaluate invalid Golden collection campaign V3: ${validation.violations.join(", ")}`
    );
  }

  const caseSlotById = new Map(
    campaign.caseSlots.map((slot) => [slot.caseSlotId, slot])
  );
  const assignmentSlotById = new Map(
    campaign.blindAssignmentSlots.map((slot) => [slot.assignmentSlotId, slot])
  );
  const receiptSlots = campaign.caseReceipts
    .map((receipt) => caseSlotById.get(receipt.caseSlotId))
    .filter((slot): slot is StayOptiGoldenCollectionCaseSlotV3 => slot !== undefined);
  const claimedSlots = campaign.evaluatorAssignmentClaims
    .map((claim) => assignmentSlotById.get(claim.assignmentSlotId))
    .filter((slot): slot is StayOptiGoldenBlindAssignmentSlotV3 => slot !== undefined);

  const counts: StayOptiGoldenCollectionCountsV3 = {
    plannedCaseSlots: campaign.caseSlots.length,
    collectedRealCases: receiptSlots.length,
    collectedBaselineCases: receiptSlots.filter(({ kind }) => kind === "baseline").length,
    collectedAdversarialCases: receiptSlots.filter(({ kind }) => kind === "adversarial").length,
    collectedCounterfactualCases: receiptSlots.filter(({ kind }) => kind === "counterfactual").length,
    collectedEvaluableAbstentionChallenges: receiptSlots.filter(
      ({ requiresEvaluableAbstentionChallenge }) =>
        requiresEvaluableAbstentionChallenge
    ).length,
    collectedProviderNeutralReplays: receiptSlots.filter(
      ({ requiresProviderNeutralReplay }) => requiresProviderNeutralReplay
    ).length,
    plannedHumanBlindAssignments: campaign.blindAssignmentSlots.filter(
      ({ evaluatorClass }) => evaluatorClass === "human"
    ).length,
    plannedExpertBlindAssignments: campaign.blindAssignmentSlots.filter(
      ({ evaluatorClass }) => evaluatorClass === "expert"
    ).length,
    claimedHumanBlindAssignments: claimedSlots.filter(
      ({ evaluatorClass }) => evaluatorClass === "human"
    ).length,
    claimedExpertBlindAssignments: claimedSlots.filter(
      ({ evaluatorClass }) => evaluatorClass === "expert"
    ).length,
    blindJudgmentsCounted: 0,
  };
  const targets = STAYOPTI_GOLDEN_COLLECTION_TARGETS_V3;
  const criteria: StayOptiGoldenCollectionCriterionV3[] = [
    collectionCriterion("real-cases:total", "real-cases", targets.totalCaseSlots, counts.collectedRealCases),
    collectionCriterion("real-cases:baseline", "real-cases", targets.baselineCaseSlots, counts.collectedBaselineCases),
    collectionCriterion("real-cases:adversarial", "real-cases", targets.adversarialCaseSlots, counts.collectedAdversarialCases),
    collectionCriterion("real-cases:counterfactual", "real-cases", targets.counterfactualCaseSlots, counts.collectedCounterfactualCases),
    collectionCriterion("real-cases:evaluable-abstention-challenges", "real-cases", targets.evaluableAbstentionChallengeSlots, counts.collectedEvaluableAbstentionChallenges),
    collectionCriterion("real-cases:provider-neutral-replays", "real-cases", targets.providerNeutralReplaySlots, counts.collectedProviderNeutralReplays),
    collectionCriterion("blind-assignments:human", "blind-assignments", targets.humanBlindAssignmentSlots, counts.claimedHumanBlindAssignments),
    collectionCriterion("blind-assignments:expert", "blind-assignments", targets.expertBlindAssignmentSlots, counts.claimedExpertBlindAssignments),
  ];
  const caseCollectionComplete = criteria
    .filter(({ category }) => category === "real-cases")
    .every(({ status }) => status === "pass");
  const blindEvaluatorAssignmentsComplete = criteria
    .filter(({ category }) => category === "blind-assignments")
    .every(({ status }) => status === "pass");
  const status: StayOptiGoldenCollectionReadinessStatusV3 =
    !caseCollectionComplete
      ? "real-case-collection-required"
      : !blindEvaluatorAssignmentsComplete
        ? "blind-evaluator-assignment-required"
        : "ready-for-blind-judgments";
  const payload: Omit<StayOptiGoldenCollectionReadinessV3, "fingerprint"> = {
    campaignVersion: STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3,
    campaignFingerprint: campaign.fingerprint,
    status,
    counts,
    criteria,
    caseCollectionComplete,
    blindEvaluatorAssignmentsComplete,
    readyForBlindJudgmentCollection: status === "ready-for-blind-judgments",
    goldenDatasetGatePassed: false,
    statisticalClaimAllowed: false,
    publicV3PromotionAllowed: false,
    splitEnabled: false,
  };
  return {
    ...payload,
    fingerprint: readinessFingerprint(payload),
  };
}

export function validateGoldenCollectionReadinessV3(
  readiness: StayOptiGoldenCollectionReadinessV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  if (
    readiness.campaignVersion !== STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_VERSION_V3 ||
    !isStableHashV3(readiness.campaignFingerprint) ||
    readiness.goldenDatasetGatePassed !== false ||
    readiness.statisticalClaimAllowed !== false ||
    readiness.publicV3PromotionAllowed !== false ||
    readiness.splitEnabled !== false ||
    readiness.counts.blindJudgmentsCounted !== 0 ||
    readiness.readyForBlindJudgmentCollection !==
      (readiness.status === "ready-for-blind-judgments")
  ) {
    violations.push("collection-readiness-contract-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = readiness;
  if (
    !isStableHashV3(readiness.fingerprint) ||
    readiness.fingerprint !== readinessFingerprint(payload)
  ) {
    violations.push("collection-readiness-fingerprint-invalid");
  }
  return { valid: violations.length === 0, violations };
}

export function verifyGoldenCollectionCampaignReplayV3(
  input: StayOptiGoldenCollectionCampaignInputV3,
  expected: StayOptiGoldenCollectionCampaignV3
): boolean {
  const replay = createGoldenCollectionCampaignV3(input);
  return (
    replay.inputFingerprint === expected.inputFingerprint &&
    replay.fingerprint === expected.fingerprint &&
    replay.campaignVersion === expected.campaignVersion
  );
}

export const STAYOPTI_GOLDEN_COLLECTION_CAMPAIGN_AUDIT_V3 = Object.freeze({
  application: "offline-real-evidence-collection-only" as const,
  totalPlannedCaseSlots: 200 as const,
  totalPlannedBlindAssignmentSlots: 400 as const,
  plannedSlotsCountedAsEvidence: false as const,
  plannedAssignmentsCountedAsJudgments: false as const,
  fabricatedCasesAllowed: false as const,
  fabricatedJudgmentsAllowed: false as const,
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
