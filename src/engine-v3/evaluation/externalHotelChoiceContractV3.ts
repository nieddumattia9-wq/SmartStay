export const STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3 =
  "stayopti.v3.external-hotel-choice-session@1" as const;

export const STAYOPTI_EXTERNAL_HOTEL_CHOICE_VALIDATOR_VERSION_V3 =
  "stayopti.v3.external-hotel-choice-validator@1" as const;

export const STAYOPTI_EXTERNAL_PROVIDER_NEUTRAL_REPLAY_VERSION_V3 =
  "stayopti.v3.external-provider-neutral-replay@1" as const;

export const STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3 = [
  "IMPRESSION_ONLY",
  "DETAIL_VIEW",
  "CLICK_OUT",
  "BOOKING_OBSERVED",
  "POST_STAY_SATISFIED",
  "WOULD_CHOOSE_AGAIN",
] as const;

export type StayOptiExternalEvidenceStrengthV3 =
  typeof STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3[number];

export const STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3 =
  "STRONG_REVEALED_PREFERENCE_WITH_CONFOUNDERS" as const;

export const STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3 =
  "MODERATE_REVEALED_PREFERENCE_WITH_CONFOUNDERS" as const;

export const STAYOPTI_EXTERNAL_BIAS_FLAGS_V3 = [
  "POSITION_BIAS",
  "ADVERTISING_BIAS",
  "DEFAULT_SORT_BIAS",
  "POPULARITY_BIAS",
  "AVAILABILITY_BIAS",
  "PRICE_OR_PROMOTION_BIAS",
  "LOYALTY_BIAS",
  "DEVICE_BIAS",
  "MARKET_OR_CURRENCY_BIAS",
  "MISSING_DATA_BIAS",
  "UNOBSERVED_ALTERNATIVES",
  "UNOBSERVED_VISIBLE_INFORMATION",
  "OFF_PLATFORM_TRANSACTION_UNOBSERVED",
  "CLICK_WITHOUT_BOOKING",
  "CANCELLATION_OUTCOME_UNOBSERVED",
  "RESAMPLED_OR_OBFUSCATED_DISTRIBUTION",
  "TEMPORAL_OBSOLESCENCE",
  "DESTINATION_NOT_RECONSTRUCTABLE",
  "EXACT_PRICE_NOT_RECONSTRUCTABLE",
] as const;

export type StayOptiExternalBiasFlagV3 =
  typeof STAYOPTI_EXTERNAL_BIAS_FLAGS_V3[number];

export type StayOptiExternalKnownValueV3<T> =
  | { state: "KNOWN"; value: T; provenance: string }
  | { state: "BUCKETED"; value: T; provenance: string }
  | { state: "UNKNOWN"; value: null; provenance: string };

export type StayOptiExternalLicenseStatusV3 =
  | "VERIFIED_PERMISSIVE"
  | "VERIFIED_NON_COMMERCIAL"
  | "TERMS_ACCEPTANCE_REQUIRED"
  | "UNKNOWN"
  | "SYNTHETIC_FIXTURE_ONLY";

export type StayOptiExternalSourceAuthorityV3 =
  | "PRIMARY_OFFICIAL"
  | "PRIMARY_OFFICIAL_SCHEMA"
  | "UNVERIFIED_MIRROR";

export interface StayOptiExternalSourceLicenseV3 {
  status: StayOptiExternalLicenseStatusV3;
  licenseName: string | null;
  licenseUrl: string | null;
  commercialUse: "YES" | "NO" | "UNKNOWN";
  accountRequired: boolean;
  termsAcceptanceRequired: boolean;
  persistentIngestionAllowed: boolean;
}

export interface StayOptiExternalProvenanceV3 {
  authority: StayOptiExternalSourceAuthorityV3;
  primarySourceUrl: string;
  downloadUrl: string | null;
  adapterVersion: string;
  mappingVersion: string;
  sourceRowGrouping: "ONE_SEARCH_SESSION";
  redistributionAllowed: boolean;
}

export type StayOptiExternalChoiceSetCompletenessV3 =
  | "COMPLETE_VISIBLE_SET"
  | "PARTIAL_VISIBLE_SET"
  | "UNKNOWN";

export type StayOptiExternalMappingCompletenessV3 =
  | "COMPLETE_FOR_REPLAY"
  | "PARTIAL_DIAGNOSTIC_ONLY"
  | "INSUFFICIENT";

export type StayOptiExternalDatasetPartitionV3 =
  | "TRAIN"
  | "VALIDATION"
  | "TEST"
  | "UNASSIGNED";

export interface StayOptiExternalHotelAlternativeV3 {
  anonymousPropertyId: string;
  displayedRank: number;
  sponsored: StayOptiExternalKnownValueV3<boolean>;
  starRating: StayOptiExternalKnownValueV3<number>;
  reviewRating: StayOptiExternalKnownValueV3<number>;
  reviewCount: StayOptiExternalKnownValueV3<number>;
  exactPriceMinorUnits: StayOptiExternalKnownValueV3<number>;
  priceBucket: StayOptiExternalKnownValueV3<string>;
  freeCancellation: StayOptiExternalKnownValueV3<boolean>;
  amenities: StayOptiExternalKnownValueV3<string[]>;
  availabilityStatus: StayOptiExternalKnownValueV3<"AVAILABLE" | "UNAVAILABLE">;
  clicked: boolean;
  booked: boolean;
  missingness: string[];
  fieldProvenance: Readonly<Record<string, string>>;
}

export type StayOptiExternalObservedActionTypeV3 =
  | "IMPRESSION"
  | "DETAIL_VIEW"
  | "CLICK_OUT"
  | "BOOKING"
  | "POST_STAY_SATISFIED"
  | "WOULD_CHOOSE_AGAIN"
  | "NO_ACTION";

export interface StayOptiExternalObservedActionV3 {
  ordinal: number;
  actionType: StayOptiExternalObservedActionTypeV3;
  anonymousPropertyId: string | null;
  occurredAtBucket: string;
}

export interface ExternalHotelChoiceSessionV3 {
  schemaVersion: typeof STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3;
  sourceDatasetId: string;
  sourceVersion: string;
  sourceLicense: StayOptiExternalSourceLicenseV3;
  provenance: StayOptiExternalProvenanceV3;
  sessionFingerprint: string;
  searchTimestamp: string;
  historicalPeriod: string;
  destinationToken: string;
  checkin: string | null;
  checkout: string | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  filters: string[];
  sortType: string;
  deviceContext: string | null;
  currencyKnown: StayOptiExternalKnownValueV3<string>;
  exactPriceAvailable: boolean;
  choiceSetCompleteness: StayOptiExternalChoiceSetCompletenessV3;
  alternatives: StayOptiExternalHotelAlternativeV3[];
  observedActions: StayOptiExternalObservedActionV3[];
  bookingObserved: boolean;
  biasFlags: StayOptiExternalBiasFlagV3[];
  evidenceStrength: StayOptiExternalEvidenceStrengthV3;
  mappingCompleteness: StayOptiExternalMappingCompletenessV3;
  allowedUses: string[];
  prohibitedClaims: string[];
  datasetPartition: StayOptiExternalDatasetPartitionV3;
  anonymousUserCluster: string | null;
  corpusClass: "EXTERNAL_OBSERVATIONAL_CORPUS";
  automaticGoldenAdmission: false;
}

export const STAYOPTI_EXTERNAL_VALIDATION_REASON_CODES_V3 = [
  "EXTERNAL_SCHEMA_UNSUPPORTED",
  "EXTERNAL_FIELD_INVALID",
  "EXTERNAL_UNSAFE_FIELD_PRESENT",
  "EXTERNAL_SOURCE_NOT_PRIMARY",
  "EXTERNAL_LICENSE_BLOCKS_PERSISTENCE",
  "EXTERNAL_FINGERPRINT_MISMATCH",
  "EXTERNAL_SESSION_EMPTY",
  "EXTERNAL_DUPLICATE_ALTERNATIVE",
  "EXTERNAL_DISPLAY_RANK_INVALID",
  "EXTERNAL_ACTION_REFERENCE_INVALID",
  "EXTERNAL_EVIDENCE_STRENGTH_MISMATCH",
  "EXTERNAL_BOOKING_LABEL_INCONSISTENT",
  "EXTERNAL_PRICE_REPRESENTATION_CONFLICT",
  "EXTERNAL_BIAS_FLAG_MISSING",
  "EXTERNAL_GOLDEN_BOUNDARY_VIOLATION",
  "EXTERNAL_LABEL_FEATURE_LEAKAGE",
  "EXTERNAL_PARTITION_LEAKAGE",
  "EXTERNAL_DUPLICATE_SESSION",
] as const;

export type StayOptiExternalValidationReasonCodeV3 =
  typeof STAYOPTI_EXTERNAL_VALIDATION_REASON_CODES_V3[number];

export interface StayOptiExternalValidationIssueV3 {
  reasonCode: StayOptiExternalValidationReasonCodeV3;
  path: string;
}

export interface StayOptiExternalSessionValidationResultV3 {
  validatorVersion: typeof STAYOPTI_EXTERNAL_HOTEL_CHOICE_VALIDATOR_VERSION_V3;
  valid: boolean;
  persistentIngestionAllowed: boolean;
  issues: StayOptiExternalValidationIssueV3[];
  computedFingerprint: string | null;
  evidenceStrength: StayOptiExternalEvidenceStrengthV3 | null;
  biasFlags: StayOptiExternalBiasFlagV3[];
  preferenceLabelAvailable: boolean;
  automaticGoldenAdmission: false;
  v3WeightsChanged: false;
}

export interface StayOptiExternalReplayAlternativeV3 {
  anonymousPropertyId: string;
  displayedRank: number;
  sponsored: StayOptiExternalKnownValueV3<boolean>;
  starRating: StayOptiExternalKnownValueV3<number>;
  reviewRating: StayOptiExternalKnownValueV3<number>;
  reviewCount: StayOptiExternalKnownValueV3<number>;
  exactPriceMinorUnits: StayOptiExternalKnownValueV3<number>;
  priceBucket: StayOptiExternalKnownValueV3<string>;
  freeCancellation: StayOptiExternalKnownValueV3<boolean>;
  amenities: StayOptiExternalKnownValueV3<string[]>;
  availabilityStatus: StayOptiExternalKnownValueV3<"AVAILABLE" | "UNAVAILABLE">;
  missingness: string[];
}

export interface StayOptiExternalProviderNeutralReplayV3 {
  replayVersion: typeof STAYOPTI_EXTERNAL_PROVIDER_NEUTRAL_REPLAY_VERSION_V3;
  replayFingerprint: string;
  sessionFingerprint: string;
  sourceDatasetId: string;
  datasetPartition: StayOptiExternalDatasetPartitionV3;
  historicalPeriod: string;
  context: {
    destinationToken: string;
    checkin: string | null;
    checkout: string | null;
    adults: number | null;
    children: number | null;
    rooms: number | null;
    filters: string[];
    sortType: string;
    deviceContext: string | null;
    currencyKnown: StayOptiExternalKnownValueV3<string>;
  };
  preDecisionFeatures: {
    choiceSetCompleteness: StayOptiExternalChoiceSetCompletenessV3;
    alternatives: StayOptiExternalReplayAlternativeV3[];
    biasFlags: StayOptiExternalBiasFlagV3[];
  };
  evaluationLabels: {
    clickedAlternativeIds: string[];
    bookedAlternativeIds: string[];
    evidenceStrength: StayOptiExternalEvidenceStrengthV3;
    bookingClassification: typeof STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3 | null;
    clickClassification: typeof STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3 | null;
  };
  allowedUses: string[];
  prohibitedClaims: string[];
  automaticGoldenAdmission: false;
  automaticV3WeightChange: false;
  splitOutcomeObserved: false;
}

export interface StayOptiExternalReplaySamplingPlanV3 {
  targetIndependentSessions: 100;
  unitOfIndependence: "SEARCH_SESSION";
  completeChoiceSetRequiredWhenAvailable: true;
  deterministicSeedRequired: true;
  strata: readonly string[];
  splitStayHandling: "SYNTHETIC_COUNTERFACTUAL_FROM_REAL_BASE";
}

export const STAYOPTI_EXTERNAL_REPLAY_SAMPLING_PLAN_V3: StayOptiExternalReplaySamplingPlanV3 =
  Object.freeze({
    targetIndependentSessions: 100,
    unitOfIndependence: "SEARCH_SESSION",
    completeChoiceSetRequiredWhenAvailable: true,
    deterministicSeedRequired: true,
    strata: Object.freeze([
      "SOLO", "COUPLE", "FAMILY", "GROUP",
      "ONE_NIGHT", "MEDIUM_STAY", "LONG_STAY",
      "SHORT_LEAD_TIME", "LONG_LEAD_TIME",
      "BUDGET_SENSITIVE", "QUALITY_PRIORITY", "CANCELLATION_RELEVANT",
      "AMENITIES_PRESENT", "AMENITIES_ABSENT",
      "MANY_REVIEWS", "FEW_REVIEWS",
      "SMALL_CHOICE_SET", "LARGE_CHOICE_SET",
      "TOP_RANK_CHOICE", "LOW_RANK_CHOICE",
      "CLICK_WITHOUT_BOOKING", "BOOKING", "NO_ACTION",
      "ADS_PRESENT", "ADS_ABSENT",
    ]),
    splitStayHandling: "SYNTHETIC_COUNTERFACTUAL_FROM_REAL_BASE",
  });
