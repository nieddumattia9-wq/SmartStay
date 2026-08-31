import {
  STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3,
  STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3,
  type StayOptiExternalEvidenceStrengthV3,
} from "./externalHotelChoiceContractV3";

export const STAYOPTI_EXTERNAL_SOURCE_REGISTRY_VERSION_V3 =
  "stayopti.v3.external-hotel-choice-source-registry@1" as const;

export const STAYOPTI_EXTERNAL_SOURCE_ROLES_V3 = [
  "PRIMARY_BOOKING_CHOICE_DATASET_TARGET",
  "SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK",
  "CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK",
] as const;

export type StayOptiExternalSourceRoleV3 =
  typeof STAYOPTI_EXTERNAL_SOURCE_ROLES_V3[number];

export type StayOptiExternalSourceAccessStatusV3 =
  | "OFFICIAL_FILE_AVAILABLE"
  | "OFFICIAL_FILE_NOT_FOUND"
  | "OFFICIAL_PORTAL_UNAVAILABLE_502"
  | "OFFICIAL_TERMS_GATED_USER_ACTION_REQUIRED";

export type StayOptiExternalSourceProvenanceStatusV3 =
  | "FILE_LEVEL_PRIMARY_PROVENANCE_VERIFIED"
  | "PAPER_AND_OWNER_DESCRIPTION_VERIFIED_FILE_UNAVAILABLE"
  | "OFFICIAL_SCHEMA_VERIFIED_FILE_UNAVAILABLE"
  | "OFFICIAL_COMPETITION_PAGE_VERIFIED_FILE_NOT_ACCESSED"
  | "UNVERIFIED_MIRROR";

export type StayOptiExternalSourceLicenseStatusV3 =
  | "FILE_LEVEL_LICENSE_VERIFIED"
  | "PAPER_LICENSE_DECLARATION_NOT_FILE_BOUND"
  | "OFFICIAL_PRESENTATION_LICENSE_NOT_FILE_BOUND"
  | "COMPETITION_RULES_NOT_ACCEPTED_OR_VERIFIED"
  | "UNKNOWN";

export type StayOptiExternalCommercialUseStatusV3 = "YES" | "NO" | "UNKNOWN";

export type StayOptiExternalGoldenEligibilityV3 =
  "EXTERNAL_OBSERVATIONAL_NOT_REAL_GOLDEN";

export interface StayOptiExternalHotelChoiceSourceV3 {
  sourceId: string;
  sourceRole: StayOptiExternalSourceRoleV3;
  observedOutcomeType: readonly StayOptiExternalEvidenceStrengthV3[];
  hasChoiceSet: boolean;
  hasClick: boolean;
  hasBooking: boolean;
  hasPrice: boolean;
  hasOccupancy: boolean;
  hasAmenities: boolean;
  hasCancellation: boolean;
  accessStatus: StayOptiExternalSourceAccessStatusV3;
  provenanceStatus: StayOptiExternalSourceProvenanceStatusV3;
  licenseStatus: StayOptiExternalSourceLicenseStatusV3;
  commercialUseStatus: StayOptiExternalCommercialUseStatusV3;
  ingestionAllowed: boolean;
  goldenEligibility: StayOptiExternalGoldenEligibilityV3;
  permittedEvaluationUses: readonly string[];
  forbiddenClaims: readonly string[];
  automaticV3ChangeAllowed: false;
  blocksRealGoldenCollection: false;
}

export const STAYOPTI_EXTERNAL_SOURCE_REGISTRY_REASON_CODES_V3 = [
  "EXTERNAL_SOURCE_DUPLICATE_ID",
  "EXTERNAL_SOURCE_ROLE_INVALID",
  "EXTERNAL_SOURCE_OUTCOME_CAPABILITY_MISMATCH",
  "EXTERNAL_SOURCE_BOOKING_CONFOUNDER_CLASSIFICATION_MISSING",
  "EXTERNAL_SOURCE_CLICK_CONFOUNDER_CLASSIFICATION_MISSING",
  "EXTERNAL_SOURCE_INGESTION_WITHOUT_OFFICIAL_FILE",
  "EXTERNAL_SOURCE_INGESTION_WITHOUT_FILE_PROVENANCE",
  "EXTERNAL_SOURCE_INGESTION_WITHOUT_FILE_LICENSE",
  "EXTERNAL_SOURCE_INGESTION_WITH_UNKNOWN_COMMERCIAL_USE",
  "EXTERNAL_SOURCE_MIRROR_NOT_ADMISSIBLE",
  "EXTERNAL_SOURCE_GOLDEN_BOUNDARY_VIOLATION",
  "EXTERNAL_SOURCE_AUTOMATIC_V3_CHANGE_FORBIDDEN",
  "EXTERNAL_SOURCE_REAL_GOLDEN_BLOCK_FORBIDDEN",
] as const;

export type StayOptiExternalSourceRegistryReasonCodeV3 =
  typeof STAYOPTI_EXTERNAL_SOURCE_REGISTRY_REASON_CODES_V3[number];

export interface StayOptiExternalSourceRegistryIssueV3 {
  sourceId: string;
  reasonCode: StayOptiExternalSourceRegistryReasonCodeV3;
}

const commonForbiddenClaims = Object.freeze([
  "OBJECTIVE_BEST_CHOICE",
  "UNCONFOUNDED_PREFERENCE",
  "GENERAL_MARKET_FREQUENCY",
  "REAL_GOLDEN_CASE",
  "AUTOMATIC_V3_POLICY_IMPROVEMENT",
]);

export const STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3:
  readonly StayOptiExternalHotelChoiceSourceV3[] = Object.freeze([
    Object.freeze({
      sourceId: "EXPEDIA_RECTOUR_2021",
      sourceRole: "PRIMARY_BOOKING_CHOICE_DATASET_TARGET",
      observedOutcomeType: Object.freeze(["IMPRESSION_ONLY", "CLICK_OUT", "BOOKING_OBSERVED"] as const),
      hasChoiceSet: true,
      hasClick: true,
      hasBooking: true,
      hasPrice: true,
      hasOccupancy: true,
      hasAmenities: true,
      hasCancellation: true,
      accessStatus: "OFFICIAL_FILE_NOT_FOUND",
      provenanceStatus: "PAPER_AND_OWNER_DESCRIPTION_VERIFIED_FILE_UNAVAILABLE",
      licenseStatus: "OFFICIAL_PRESENTATION_LICENSE_NOT_FILE_BOUND",
      commercialUseStatus: "UNKNOWN",
      ingestionAllowed: false,
      goldenEligibility: "EXTERNAL_OBSERVATIONAL_NOT_REAL_GOLDEN",
      permittedEvaluationUses: Object.freeze([
        "FUTURE_PROVIDER_NEUTRAL_BOOKING_CHOICE_REPLAY_AFTER_ADMISSION",
        "OFFLINE_BEHAVIORAL_BENCHMARK_AFTER_ADMISSION",
      ]),
      forbiddenClaims: commonForbiddenClaims,
      automaticV3ChangeAllowed: false,
      blocksRealGoldenCollection: false,
    }),
    Object.freeze({
      sourceId: "TRIVAGO_RECSYS_CHALLENGE_2019",
      sourceRole: "SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK",
      observedOutcomeType: Object.freeze(["IMPRESSION_ONLY", "CLICK_OUT"] as const),
      hasChoiceSet: true,
      hasClick: true,
      hasBooking: false,
      hasPrice: true,
      hasOccupancy: false,
      hasAmenities: false,
      hasCancellation: false,
      accessStatus: "OFFICIAL_PORTAL_UNAVAILABLE_502",
      provenanceStatus: "OFFICIAL_SCHEMA_VERIFIED_FILE_UNAVAILABLE",
      licenseStatus: "UNKNOWN",
      commercialUseStatus: "UNKNOWN",
      ingestionAllowed: false,
      goldenEligibility: "EXTERNAL_OBSERVATIONAL_NOT_REAL_GOLDEN",
      permittedEvaluationUses: Object.freeze([
        "FUTURE_SESSION_INTENT_BENCHMARK_AFTER_ADMISSION",
        "FUTURE_CLICK_OUT_RANKING_REPLAY_AFTER_ADMISSION",
      ]),
      forbiddenClaims: Object.freeze([...commonForbiddenClaims, "BOOKING_GROUND_TRUTH"]),
      automaticV3ChangeAllowed: false,
      blocksRealGoldenCollection: false,
    }),
    Object.freeze({
      sourceId: "EXPEDIA_PERSONALIZED_SORT_2013",
      sourceRole: "CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK",
      observedOutcomeType: Object.freeze(["IMPRESSION_ONLY", "CLICK_OUT", "BOOKING_OBSERVED"] as const),
      hasChoiceSet: true,
      hasClick: true,
      hasBooking: true,
      hasPrice: true,
      hasOccupancy: true,
      hasAmenities: false,
      hasCancellation: false,
      accessStatus: "OFFICIAL_TERMS_GATED_USER_ACTION_REQUIRED",
      provenanceStatus: "OFFICIAL_COMPETITION_PAGE_VERIFIED_FILE_NOT_ACCESSED",
      licenseStatus: "COMPETITION_RULES_NOT_ACCEPTED_OR_VERIFIED",
      commercialUseStatus: "UNKNOWN",
      ingestionAllowed: false,
      goldenEligibility: "EXTERNAL_OBSERVATIONAL_NOT_REAL_GOLDEN",
      permittedEvaluationUses: Object.freeze([
        "FUTURE_CLICK_AND_BOOKING_RANKING_BENCHMARK_AFTER_TERMS_REVIEW",
      ]),
      forbiddenClaims: commonForbiddenClaims,
      automaticV3ChangeAllowed: false,
      blocksRealGoldenCollection: false,
    }),
  ] satisfies readonly StayOptiExternalHotelChoiceSourceV3[]);

const expectedRoles: Readonly<Record<string, StayOptiExternalSourceRoleV3>> = Object.freeze({
  EXPEDIA_RECTOUR_2021: "PRIMARY_BOOKING_CHOICE_DATASET_TARGET",
  TRIVAGO_RECSYS_CHALLENGE_2019: "SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK",
  EXPEDIA_PERSONALIZED_SORT_2013: "CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK",
});

function issue(
  issues: StayOptiExternalSourceRegistryIssueV3[],
  sourceId: string,
  reasonCode: StayOptiExternalSourceRegistryReasonCodeV3,
) {
  issues.push({ sourceId, reasonCode });
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

export function classifyExternalObservedOutcomeV3(
  outcome: StayOptiExternalEvidenceStrengthV3,
) {
  if (outcome === "BOOKING_OBSERVED") {
    return STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3;
  }
  if (outcome === "CLICK_OUT") {
    return STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3;
  }
  return "EXPOSURE_OR_WEAK_INTEREST_NOT_FINAL_PREFERENCE" as const;
}

export function evaluateExternalSourceIngestionV3(
  source: StayOptiExternalHotelChoiceSourceV3,
) {
  const reasons: StayOptiExternalSourceRegistryReasonCodeV3[] = [];
  if (source.accessStatus !== "OFFICIAL_FILE_AVAILABLE") {
    reasons.push("EXTERNAL_SOURCE_INGESTION_WITHOUT_OFFICIAL_FILE");
  }
  if (source.provenanceStatus === "UNVERIFIED_MIRROR") {
    reasons.push("EXTERNAL_SOURCE_MIRROR_NOT_ADMISSIBLE");
  }
  if (source.provenanceStatus !== "FILE_LEVEL_PRIMARY_PROVENANCE_VERIFIED") {
    reasons.push("EXTERNAL_SOURCE_INGESTION_WITHOUT_FILE_PROVENANCE");
  }
  if (source.licenseStatus !== "FILE_LEVEL_LICENSE_VERIFIED") {
    reasons.push("EXTERNAL_SOURCE_INGESTION_WITHOUT_FILE_LICENSE");
  }
  if (source.commercialUseStatus === "UNKNOWN") {
    reasons.push("EXTERNAL_SOURCE_INGESTION_WITH_UNKNOWN_COMMERCIAL_USE");
  }
  return {
    ingestionAllowed: reasons.length === 0 && source.ingestionAllowed,
    reasonCodes: sortedUnique(reasons) as StayOptiExternalSourceRegistryReasonCodeV3[],
  };
}

export function validateExternalHotelChoiceSourceRegistryV3(
  sources: readonly StayOptiExternalHotelChoiceSourceV3[] =
    STAYOPTI_EXTERNAL_HOTEL_CHOICE_SOURCE_REGISTRY_V3,
) {
  const issues: StayOptiExternalSourceRegistryIssueV3[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (seen.has(source.sourceId)) issue(issues, source.sourceId, "EXTERNAL_SOURCE_DUPLICATE_ID");
    seen.add(source.sourceId);

    const expectedRole = expectedRoles[source.sourceId];
    if (expectedRole !== undefined && source.sourceRole !== expectedRole) {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_ROLE_INVALID");
    }
    const outcomes = new Set(source.observedOutcomeType);
    if (outcomes.has("CLICK_OUT") !== source.hasClick || outcomes.has("BOOKING_OBSERVED") !== source.hasBooking) {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_OUTCOME_CAPABILITY_MISMATCH");
    }
    if (source.hasBooking && classifyExternalObservedOutcomeV3("BOOKING_OBSERVED") !== "STRONG_REVEALED_PREFERENCE_WITH_CONFOUNDERS") {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_BOOKING_CONFOUNDER_CLASSIFICATION_MISSING");
    }
    if (source.hasClick && classifyExternalObservedOutcomeV3("CLICK_OUT") !== "MODERATE_REVEALED_PREFERENCE_WITH_CONFOUNDERS") {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_CLICK_CONFOUNDER_CLASSIFICATION_MISSING");
    }
    const admission = evaluateExternalSourceIngestionV3(source);
    if (source.ingestionAllowed && !admission.ingestionAllowed) {
      for (const reasonCode of admission.reasonCodes) issue(issues, source.sourceId, reasonCode);
    }
    if (source.goldenEligibility !== "EXTERNAL_OBSERVATIONAL_NOT_REAL_GOLDEN") {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_GOLDEN_BOUNDARY_VIOLATION");
    }
    if (source.automaticV3ChangeAllowed !== false) {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_AUTOMATIC_V3_CHANGE_FORBIDDEN");
    }
    if (source.blocksRealGoldenCollection !== false) {
      issue(issues, source.sourceId, "EXTERNAL_SOURCE_REAL_GOLDEN_BLOCK_FORBIDDEN");
    }
  }
  return {
    registryVersion: STAYOPTI_EXTERNAL_SOURCE_REGISTRY_VERSION_V3,
    valid: issues.length === 0,
    issues: [...issues].sort((left, right) =>
      `${left.sourceId}|${left.reasonCode}`.localeCompare(`${right.sourceId}|${right.reasonCode}`, "en")),
    sourceCount: sources.length,
    ingestedSourceCount: sources.filter((source) => source.ingestionAllowed).length,
    externalDataBlocksRealGoldenCollection: sources.some((source) => source.blocksRealGoldenCollection),
    externalDataAutomaticallyChangesV3: sources.some((source) => source.automaticV3ChangeAllowed),
  };
}
