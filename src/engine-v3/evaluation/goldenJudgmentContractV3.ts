import type {
  StayOptiGoldenSingleStayRoleV3,
} from "./goldenCaseContractV3";

export const STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3 =
  "stayopti.golden-blind-capsule@1" as const;

export const STAYOPTI_GOLDEN_BLIND_MANIFEST_VERSION_V3 =
  "stayopti.private.golden-blind-manifest@1" as const;

export const STAYOPTI_GOLDEN_JUDGMENT_SCHEMA_VERSION_V3 =
  "stayopti.golden-blind-judgment@1" as const;

export const STAYOPTI_GOLDEN_JUDGMENT_LEDGER_VERSION_V3 =
  "stayopti.private.golden-judgment-ledger@1" as const;

export const STAYOPTI_GOLDEN_DEBLIND_REPORT_VERSION_V3 =
  "stayopti.private.golden-deblind-report@1" as const;

export const STAYOPTI_GOLDEN_BLIND_CHOICES_V3 = [
  "A",
  "B",
  "TIE",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type StayOptiGoldenBlindChoiceV3 =
  typeof STAYOPTI_GOLDEN_BLIND_CHOICES_V3[number];

export const STAYOPTI_GOLDEN_BLIND_JUDGMENT_REASONS_V3 = [
  "BETTER_TOTAL_VALUE",
  "BETTER_QUALITY",
  "BETTER_PRICE",
  "BETTER_LOCATION",
  "BETTER_ROOM",
  "BETTER_FLEXIBILITY",
  "LOWER_DECISION_RISK",
  "MORE_COMPLETE_EVIDENCE",
  "TRADEOFF_NOT_JUSTIFIED",
  "OPTIONS_EFFECTIVELY_EQUIVALENT",
  "EVIDENCE_TOO_INCOMPLETE",
  "ROLE_MISMATCH",
  "OTHER_ALLOWED_STRUCTURED_REASON",
] as const;

export type StayOptiGoldenBlindJudgmentReasonV3 =
  typeof STAYOPTI_GOLDEN_BLIND_JUDGMENT_REASONS_V3[number];

export type StayOptiGoldenEvaluatorClassV3 = "HUMAN" | "EXPERT";

export interface StayOptiGoldenBlindedEvidenceV3<T> {
  status: "KNOWN" | "UNKNOWN";
  reliability: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  value: T | null;
  unknownReason: string | null;
}

export interface StayOptiGoldenBlindedAlternativeV3 {
  alternativeRef: string;
  totalTripCostMinorUnits: number;
  currency: string;
  taxFeeEvidence: StayOptiGoldenBlindedEvidenceV3<{
    totalKnownMinorUnits: number | null;
    taxesIncluded: boolean | null;
    feesIncluded: boolean | null;
  }>;
  ratingEvidence: StayOptiGoldenBlindedEvidenceV3<{
    score: number;
    scale: number;
  }>;
  reviewEvidence: StayOptiGoldenBlindedEvidenceV3<{
    count: number;
    sourceClass: "VERIFIED_GUESTS" | "MIXED" | "UNKNOWN";
  }>;
  distanceEvidence: StayOptiGoldenBlindedEvidenceV3<{
    meters: number;
    measurement: "TRAVEL_TIME" | "WALKING_DISTANCE" | "STRAIGHT_LINE";
  }>;
  accommodationCategoryEvidence: StayOptiGoldenBlindedEvidenceV3<string>;
  roomEvidence: StayOptiGoldenBlindedEvidenceV3<{
    roomTypeCode: string;
    adults: number;
    childAges: number[];
    rooms: number;
  }>;
  cancellationEvidence: StayOptiGoldenBlindedEvidenceV3<{
    refundability: "REFUNDABLE" | "NON_REFUNDABLE";
    freeCancellationUntilBucket: string | null;
    penaltyMinorUnits: number | null;
    penaltyCurrency: string | null;
  }>;
  comfortEvidence: StayOptiGoldenBlindedEvidenceV3<{
    featureCodes: string[];
  }>;
  dataReliability: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  costCompleteness: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  bookabilityStatus: "AVAILABLE" | "REQUIRES_RECHECK" | "UNKNOWN";
  missingEvidence: string[];
}

export interface StayOptiGoldenBlindedDecisionV3 {
  status: "SELECTED" | "ABSTAINED";
  selectedAlternativeRefs: string[];
}

export interface StayOptiGoldenBlindTaskV3 {
  capsuleVersion: typeof STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3;
  evaluationTaskId: string;
  batchId: string;
  blindedCaseId: string;
  role: StayOptiGoldenSingleStayRoleV3;
  evaluationQuestion: string;
  travelerContext: {
    budgetMinorUnits: number;
    profile: string;
    essentialConstraintCodes: string[];
    distancePreference: {
      status: "KNOWN" | "UNKNOWN";
      maximumDistanceMeters: number | null;
      unknownReason: string | null;
    };
    comfortRequirements: {
      status: "KNOWN" | "UNKNOWN";
      requiredCodes: string[];
      unknownReason: string | null;
    };
    flexibilityRequirements: {
      status: "KNOWN" | "UNKNOWN";
      minimumRefundability: "REFUNDABLE" | "NON_REFUNDABLE_ACCEPTABLE" | null;
      payLaterRequired: boolean | null;
      unknownReason: string | null;
    };
  };
  tripContext: {
    nights: number;
    adults: number;
    childAges: number[];
    rooms: number;
    expectedCurrency: string;
    destinationBucket: string;
    bookingLeadTimeBucket: string;
    stayLengthBucket: string;
    seasonBucket: string;
  };
  alternatives: StayOptiGoldenBlindedAlternativeV3[];
  decisionA: StayOptiGoldenBlindedDecisionV3;
  decisionB: StayOptiGoldenBlindedDecisionV3;
  allowedChoices: StayOptiGoldenBlindChoiceV3[];
  allowedReasonCodes: StayOptiGoldenBlindJudgmentReasonV3[];
}

export interface StayOptiGoldenBlindCapsuleV3 {
  capsuleVersion: typeof STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3;
  batchId: string;
  tasks: StayOptiGoldenBlindTaskV3[];
  taskCount: number;
  privateOfflineOnly: true;
}

export interface StayOptiGoldenBlindManifestEntryV3 {
  evaluationTaskId: string;
  blindedCaseId: string;
  goldenCaseId: string;
  searchFamilyId: string;
  role: StayOptiGoldenSingleStayRoleV3;
  sideAEngine: "V2_BASELINE" | "V3_CANDIDATE";
  sideBEngine: "V2_BASELINE" | "V3_CANDIDATE";
  taskFingerprint: string;
  goldenCaseFingerprint: string;
}

export interface StayOptiGoldenBlindManifestV3 {
  manifestVersion: typeof STAYOPTI_GOLDEN_BLIND_MANIFEST_VERSION_V3;
  capsuleVersion: typeof STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3;
  goldenSchemaVersion: string;
  batchId: string;
  entries: StayOptiGoldenBlindManifestEntryV3[];
  capsuleFingerprint: string;
  manifestFingerprint: string;
}

export interface StayOptiGoldenBlindBatchV3 {
  capsule: StayOptiGoldenBlindCapsuleV3;
  manifest: StayOptiGoldenBlindManifestV3;
}

export interface StayOptiGoldenBlindJudgmentV3 {
  judgmentSchemaVersion: typeof STAYOPTI_GOLDEN_JUDGMENT_SCHEMA_VERSION_V3;
  judgmentId: string;
  batchId: string;
  evaluationTaskId: string;
  evaluatorPseudonym: string;
  evaluatorClass: StayOptiGoldenEvaluatorClassV3;
  choice: StayOptiGoldenBlindChoiceV3;
  confidence: number;
  reasonCodes: StayOptiGoldenBlindJudgmentReasonV3[];
  durationBucket: string;
  consentVersion: string;
  createdAtBucket: string;
}

export const STAYOPTI_GOLDEN_JUDGMENT_REASON_CODES_V3 = [
  "JUDGMENT_SCHEMA_UNSUPPORTED",
  "JUDGMENT_FIELD_MISSING",
  "JUDGMENT_FIELD_TYPE_INVALID",
  "JUDGMENT_UNEXPECTED_FIELD",
  "JUDGMENT_TASK_UNKNOWN",
  "JUDGMENT_EVALUATOR_PSEUDONYM_INVALID",
  "JUDGMENT_EVALUATOR_CLASS_INVALID",
  "JUDGMENT_CHOICE_INVALID",
  "JUDGMENT_CONFIDENCE_INVALID",
  "JUDGMENT_REASON_UNKNOWN",
  "JUDGMENT_CONSENT_MISSING",
  "JUDGMENT_PRECISE_TIMESTAMP_PROHIBITED",
  "JUDGMENT_DUPLICATE_ID",
  "JUDGMENT_DUPLICATE_EVALUATOR_TASK",
  "JUDGMENT_OVERWRITE_PROHIBITED",
  "JUDGMENT_UNSAFE_FIELD_PRESENT",
  "JUDGMENT_OBJECT_PROTOTYPE_INVALID",
  "JUDGMENT_JSON_VALUE_INVALID",
] as const;

export type StayOptiGoldenJudgmentValidationReasonCodeV3 =
  typeof STAYOPTI_GOLDEN_JUDGMENT_REASON_CODES_V3[number];

export interface StayOptiGoldenJudgmentValidationIssueV3 {
  reasonCode: StayOptiGoldenJudgmentValidationReasonCodeV3;
  path: string;
}

export interface StayOptiGoldenJudgmentValidationResultV3 {
  valid: boolean;
  issues: StayOptiGoldenJudgmentValidationIssueV3[];
}

export interface StayOptiGoldenJudgmentLedgerV3 {
  ledgerVersion: typeof STAYOPTI_GOLDEN_JUDGMENT_LEDGER_VERSION_V3;
  batchId: string;
  judgments: StayOptiGoldenBlindJudgmentV3[];
  fingerprint: string;
}

export interface StayOptiGoldenDeblindCountV3 {
  v2: number;
  v3: number;
  tie: number;
  insufficientEvidence: number;
  total: number;
}

export interface StayOptiGoldenDeblindBreakdownV3 {
  key: string;
  counts: StayOptiGoldenDeblindCountV3;
}

export interface StayOptiGoldenEvaluatorConcentrationV3 {
  evaluatorClass: StayOptiGoldenEvaluatorClassV3;
  distinctEvaluators: number;
  judgmentCount: number;
  maximumShareBps: number | null;
  limitBps: 1000 | 2500;
  status: "PASS" | "FAIL" | "NOT_YET_APPLICABLE";
}

export interface StayOptiGoldenDeblindReportV3 {
  reportVersion: typeof STAYOPTI_GOLDEN_DEBLIND_REPORT_VERSION_V3;
  batchId: string;
  capsuleFingerprint: string;
  ledgerFingerprint: string;
  totalJudgments: number;
  caseDenominator: number;
  searchFamilyDenominator: number;
  overall: StayOptiGoldenDeblindCountV3;
  byRole: StayOptiGoldenDeblindBreakdownV3[];
  byEvaluatorClass: StayOptiGoldenDeblindBreakdownV3[];
  bySearchFamily: StayOptiGoldenDeblindBreakdownV3[];
  sideDistribution: { A: number; B: number; TIE: number; INSUFFICIENT_EVIDENCE: number };
  roleDistribution: Array<{ role: StayOptiGoldenSingleStayRoleV3; count: number }>;
  familyDistribution: Array<{ searchFamilyId: string; count: number }>;
  humanConcentration: StayOptiGoldenEvaluatorConcentrationV3;
  expertConcentration: StayOptiGoldenEvaluatorConcentrationV3;
  duplicateEvaluatorTaskCount: number;
  v3GateEvaluated: false;
  fingerprint: string;
}
