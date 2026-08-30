import type {
  SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import type {
  StayOptiFreshRoleAwareRoleV3,
} from "./freshReplayableRoleAwareCapsuleV3";

import type {
  StayOptiRolePolicyProfileV3,
} from "../policy/personalUtilityRolePolicyV3";

export const STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3 =
  "stayopti.v3.golden-case@1" as const;

export const STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3 =
  "stayopti.v3.golden-case-validator@1" as const;

export const STAYOPTI_GOLDEN_CASE_FINGERPRINT_VERSION_V3 =
  "sha256:stayopti-golden-canonical-json@1" as const;

export const STAYOPTI_GOLDEN_MAX_PRIMARY_CASES_PER_FAMILY_V3 =
  4 as const;

export const STAYOPTI_GOLDEN_CASE_SOURCE_KINDS_V3 = [
  "REAL_NORMALIZED_SNAPSHOT",
  "CONTROLLED_ADVERSARIAL",
  "COUNTERFACTUAL_DERIVED",
] as const;

export type StayOptiGoldenCaseSourceKindV3 =
  typeof STAYOPTI_GOLDEN_CASE_SOURCE_KINDS_V3[number];

export const STAYOPTI_GOLDEN_VALIDATION_DISPOSITIONS_V3 = [
  "GOLDEN_VALID",
  "QUARANTINED_INCOMPLETE",
  "REJECTED_CONTRACT",
] as const;

export type StayOptiGoldenValidationDispositionV3 =
  typeof STAYOPTI_GOLDEN_VALIDATION_DISPOSITIONS_V3[number];

export type StayOptiGoldenSingleStayRoleV3 = Exclude<
  StayOptiFreshRoleAwareRoleV3,
  "split-saver"
>;

export type StayOptiGoldenKnowledgeStateV3 =
  | "KNOWN"
  | "UNKNOWN";

export type StayOptiGoldenReliabilityV3 =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "UNKNOWN";

export interface StayOptiGoldenEvidenceValueV3<T> {
  status: StayOptiGoldenKnowledgeStateV3;
  reliability: StayOptiGoldenReliabilityV3;
  value: T | null;
  unknownReason: string | null;
  evidenceRefs: string[];
}

export type StayOptiGoldenCollectionBoundaryV3 =
  | "PROVIDER_EXHAUSTED_WITHIN_CAP"
  | "DEPTH_CAPPED_DIAGNOSTIC_ONLY"
  | "CONTROLLED_OFFLINE_DERIVATION";

export interface StayOptiGoldenProvenanceV3 {
  origin: StayOptiGoldenCaseSourceKindV3;
  collectionBoundary: StayOptiGoldenCollectionBoundaryV3;
  normalizerVersion: string;
  evidenceSchemaVersion: string;
  providerSourceKey: string;
  freshnessBucket: string;
  transformationProcess: string;
  parentGoldenCaseId: string | null;
}

export type StayOptiGoldenLeadTimeBucketV3 =
  | "LAST_MINUTE"
  | "NEAR_TERM"
  | "MID_TERM"
  | "ADVANCE";

export type StayOptiGoldenStayLengthBucketV3 =
  | "VERY_SHORT"
  | "SHORT"
  | "MEDIUM"
  | "LONG"
  | "EXTENDED";

export type StayOptiGoldenSeasonBucketV3 =
  | "LOW"
  | "SHOULDER"
  | "HIGH"
  | "EVENT_OR_HOLIDAY";

export interface StayOptiGoldenTripContextV3 {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  childAges: number[];
  rooms: number;
  expectedCurrency: string;
  destinationBucket: string;
  bookingLeadTimeBucket: StayOptiGoldenLeadTimeBucketV3;
  stayLengthBucket: StayOptiGoldenStayLengthBucketV3;
  seasonBucket: StayOptiGoldenSeasonBucketV3;
}

export interface StayOptiGoldenDistancePreferenceV3 {
  status: StayOptiGoldenKnowledgeStateV3;
  maximumDistanceMeters: number | null;
  unknownReason: string | null;
}

export interface StayOptiGoldenRequirementSetV3 {
  status: StayOptiGoldenKnowledgeStateV3;
  requiredCodes: string[];
  unknownReason: string | null;
}

export interface StayOptiGoldenFlexibilityRequirementV3 {
  status: StayOptiGoldenKnowledgeStateV3;
  minimumRefundability:
    | "REFUNDABLE"
    | "NON_REFUNDABLE_ACCEPTABLE"
    | null;
  payLaterRequired: boolean | null;
  unknownReason: string | null;
}

export interface StayOptiGoldenTravelerContextV3 {
  budgetMinorUnits: number;
  profile: StayOptiRolePolicyProfileV3;
  essentialConstraintCodes: string[];
  distancePreference: StayOptiGoldenDistancePreferenceV3;
  comfortRequirements: StayOptiGoldenRequirementSetV3;
  flexibilityRequirements: StayOptiGoldenFlexibilityRequirementV3;
}

export interface StayOptiGoldenTaxFeeEvidenceV3 {
  totalKnownMinorUnits: number | null;
  taxesIncluded: boolean | null;
  feesIncluded: boolean | null;
}

export interface StayOptiGoldenRatingEvidenceV3 {
  score: number;
  scale: number;
}

export interface StayOptiGoldenReviewEvidenceV3 {
  count: number;
  sourceClass:
    | "VERIFIED_GUESTS"
    | "MIXED"
    | "UNKNOWN";
}

export interface StayOptiGoldenDistanceEvidenceV3 {
  meters: number;
  measurement:
    | "TRAVEL_TIME"
    | "WALKING_DISTANCE"
    | "STRAIGHT_LINE";
}

export interface StayOptiGoldenRoomEvidenceV3 {
  roomTypeCode: string;
  adults: number;
  childAges: number[];
  rooms: number;
}

export interface StayOptiGoldenCancellationEvidenceV3 {
  refundability:
    | "REFUNDABLE"
    | "NON_REFUNDABLE";
  freeCancellationUntilBucket: string | null;
  penaltyMinorUnits: number | null;
  penaltyCurrency: string | null;
}

export interface StayOptiGoldenComfortEvidenceV3 {
  featureCodes: string[];
}

export type StayOptiGoldenCostCompletenessV3 =
  | "COMPLETE"
  | "PARTIAL"
  | "UNKNOWN";

export type StayOptiGoldenBookabilityStatusV3 =
  | "AVAILABLE"
  | "REQUIRES_RECHECK"
  | "UNKNOWN";

export interface StayOptiGoldenAlternativeV3 {
  localAlternativeId: string;
  totalTripCostMinorUnits: number;
  currency: string;
  taxFeeEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenTaxFeeEvidenceV3>;
  ratingEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenRatingEvidenceV3>;
  reviewEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenReviewEvidenceV3>;
  distanceEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenDistanceEvidenceV3>;
  accommodationCategoryEvidence: StayOptiGoldenEvidenceValueV3<string>;
  roomEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenRoomEvidenceV3>;
  cancellationEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenCancellationEvidenceV3>;
  comfortEvidence: StayOptiGoldenEvidenceValueV3<StayOptiGoldenComfortEvidenceV3>;
  dataReliability: StayOptiGoldenReliabilityV3;
  costCompleteness: StayOptiGoldenCostCompletenessV3;
  bookabilityStatus: StayOptiGoldenBookabilityStatusV3;
  missingEvidence: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export type StayOptiGoldenDecisionStatusV3 =
  | "SELECTED"
  | "ABSTAINED";

export interface StayOptiGoldenDecisionRecordV3 {
  engineKey:
    | "V2_BASELINE"
    | "V3_CANDIDATE";
  policyVersion: string;
  status: StayOptiGoldenDecisionStatusV3;
  selectedAlternativeIds: string[];
  role: StayOptiGoldenSingleStayRoleV3;
  confidenceBps: number;
  reasonCodes: SmartStayReasonCodeV3[];
  evidenceRefs: string[];
  fallbackStatus:
    | "NOT_USED"
    | "USED"
    | "NOT_APPLICABLE";
}

export interface StayOptiGoldenDecisionSetV3 {
  v2: StayOptiGoldenDecisionRecordV3;
  v3Candidate: StayOptiGoldenDecisionRecordV3;
}

export interface StayOptiGoldenAbstentionEligibilityV3 {
  status:
    | "EVALUABLE"
    | "NOT_EVALUABLE";
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiGoldenTransformationV3 {
  ordinal: number;
  transformationId: string;
  kind:
    | "ADVERSARIAL"
    | "COUNTERFACTUAL";
  changedDimension: StayOptiGoldenCounterfactualDimensionV3 | null;
  descriptionCode: string;
  precommitted: true;
}

export const STAYOPTI_GOLDEN_COUNTERFACTUAL_DIMENSIONS_V3 = [
  "BUDGET",
  "PROFILE",
  "DISTANCE_PREFERENCE",
  "COMFORT_REQUIREMENT",
  "FLEXIBILITY_REQUIREMENT",
  "PRICE",
  "QUALITY",
  "EVIDENCE_AVAILABILITY",
] as const;

export type StayOptiGoldenCounterfactualDimensionV3 =
  typeof STAYOPTI_GOLDEN_COUNTERFACTUAL_DIMENSIONS_V3[number];

export interface StayOptiGoldenCounterfactualMetadataV3 {
  counterfactualPairId: string;
  parentGoldenCaseId: string;
  changedDimension: StayOptiGoldenCounterfactualDimensionV3;
  changedPaths: string[];
  precommittedBeforeEvaluation: true;
  sameSearchFamilyRequired: true;
}

export interface StayOptiGoldenCaseV3 {
  schemaVersion: typeof STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3;
  caseVersion: string;
  goldenCaseId: string;
  searchFamilyId: string;
  sourceKind: StayOptiGoldenCaseSourceKindV3;
  createdAtBucket: string;
  provenance: StayOptiGoldenProvenanceV3;
  tripContext: StayOptiGoldenTripContextV3;
  travelerContext: StayOptiGoldenTravelerContextV3;
  alternatives: StayOptiGoldenAlternativeV3[];
  decisions: StayOptiGoldenDecisionSetV3;
  expectedRole: StayOptiGoldenSingleStayRoleV3;
  abstentionEligibility: StayOptiGoldenAbstentionEligibilityV3;
  evidenceRefs: string[];
  transformations?: StayOptiGoldenTransformationV3[];
  counterfactual?: StayOptiGoldenCounterfactualMetadataV3;
  declaredFingerprint?: string;
}

export const STAYOPTI_GOLDEN_VALIDATION_REASON_CODES_V3 = [
  "GOLDEN_SCHEMA_UNSUPPORTED",
  "GOLDEN_REQUIRED_FIELD_MISSING",
  "GOLDEN_FIELD_TYPE_INVALID",
  "GOLDEN_UNSAFE_FIELD_PRESENT",
  "GOLDEN_RAW_PROVIDER_IDENTIFIER_PRESENT",
  "GOLDEN_SECRET_OR_TOKEN_PRESENT",
  "GOLDEN_PII_PRESENT",
  "GOLDEN_COMMERCIAL_FIELD_PRESENT",
  "GOLDEN_DUPLICATE_CASE_ID",
  "GOLDEN_DUPLICATE_ALTERNATIVE_ID",
  "GOLDEN_DECISION_REFERENCE_INVALID",
  "GOLDEN_CURRENCY_MISMATCH",
  "GOLDEN_PRICE_INVALID",
  "GOLDEN_FINGERPRINT_MISMATCH",
  "GOLDEN_PROVENANCE_INCOMPLETE",
  "GOLDEN_COUNTERFACTUAL_INVALID",
  "GOLDEN_FAMILY_LIMIT_EXCEEDED",
  "GOLDEN_EXACT_DUPLICATE",
  "GOLDEN_EXPLICIT_UNKNOWN_EVIDENCE_ACCEPTED",
  "GOLDEN_EVIDENCE_REFERENCE_UNRESOLVED",
  "GOLDEN_SOURCE_REQUIREMENT_INVALID",
  "GOLDEN_ID_INVALID",
  "GOLDEN_ROLE_INVALID",
  "GOLDEN_DECISION_AMBIGUOUS",
  "GOLDEN_OBJECT_PROTOTYPE_INVALID",
  "GOLDEN_JSON_VALUE_INVALID",
  "GOLDEN_SPLIT_SINGLE_STAY_PROHIBITED",
] as const;

export type StayOptiGoldenValidationReasonCodeV3 =
  typeof STAYOPTI_GOLDEN_VALIDATION_REASON_CODES_V3[number];

export interface StayOptiGoldenValidationIssueV3 {
  reasonCode: StayOptiGoldenValidationReasonCodeV3;
  path: string;
}

export interface StayOptiGoldenCaseValidationResultV3 {
  validatorVersion: typeof STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3;
  schemaVersion: typeof STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3;
  disposition: StayOptiGoldenValidationDispositionV3;
  issues: StayOptiGoldenValidationIssueV3[];
  computedFingerprint: string | null;
  explicitUnknownEvidenceAccepted: boolean;
  providerNeutralReplayEligible: boolean;
  evaluableAbstention: boolean;
}

export interface StayOptiGoldenCounterfactualValidationResultV3 {
  valid: boolean;
  issues: StayOptiGoldenValidationIssueV3[];
  counterfactualPairId: string | null;
  changedDimension: StayOptiGoldenCounterfactualDimensionV3 | null;
}

export interface StayOptiGoldenCorpusCountsV3 {
  totalReceived: number;
  valid: number;
  quarantined: number;
  rejected: number;
  exactDuplicates: number;
  familyCount: number;
  adversarialCases: number;
  counterfactualCases: number;
  evaluableAbstentions: number;
  providerNeutralReplayEligibleCases: number;
  splitCasesExcluded: number;
}

export interface StayOptiGoldenCorpusValidationResultV3 {
  valid: boolean;
  reports: StayOptiGoldenCaseValidationResultV3[];
  issues: StayOptiGoldenValidationIssueV3[];
  counts: StayOptiGoldenCorpusCountsV3;
  caseDenominator: number;
  searchFamilyDenominator: number;
  primaryCasesPerFamily: Readonly<Record<string, number>>;
  inputMutated: false;
  v3_17GateMet: false;
  v3_18EntryAllowed: false;
}
