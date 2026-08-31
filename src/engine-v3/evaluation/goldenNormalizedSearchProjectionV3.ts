import {
  type StayOptiNormalizedDecisionAlternativeV3,
  type StayOptiNormalizedDecisionSourceCapsuleV3,
  validateNormalizedDecisionSourceCapsuleV3,
} from "./normalizedDecisionSourceCapsuleV3";

import {
  STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
  STAYOPTI_GOLDEN_MAX_PRIMARY_CASES_PER_FAMILY_V3,
  type StayOptiGoldenAlternativeV3,
  type StayOptiGoldenCaseValidationResultV3,
  type StayOptiGoldenCaseV3,
  type StayOptiGoldenDecisionRecordV3,
  type StayOptiGoldenEvidenceValueV3,
  type StayOptiGoldenReliabilityV3,
  type StayOptiGoldenReviewEvidenceV3,
  type StayOptiGoldenSingleStayRoleV3,
} from "./goldenCaseContractV3";

import {
  createGoldenCaseFingerprintV3,
  validateGoldenCaseV3,
} from "./goldenCaseValidatorV3";

import {
  stableSerializeV3,
} from "../contract/stableHashV3";

import type {
  SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import type {
  StayOptiRolePolicyProfileV3,
} from "../policy/personalUtilityRolePolicyV3";

export const STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3 =
  "stayopti.v3.golden-normalized-projection@1" as const;

export const STAYOPTI_GOLDEN_BOUNDED_COLLECTION_BOUNDARY_V3 =
  "BOUNDED_PROVIDER_RETURNED_SNAPSHOT" as const;

export const STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3 = Object.freeze([
  "balanced",
  "maximum-comfort",
  "savings",
  "maximum-savings",
] as const satisfies readonly StayOptiRolePolicyProfileV3[]);

export interface StayOptiGoldenNormalizedEvidenceSupplementV3 {
  taxFeeEvidence?: {
    totalKnownMinorUnits: number;
    taxesIncluded: boolean;
    feesIncluded: boolean;
  };
  roomEvidence?: {
    roomTypeCode: string;
  };
  reviewSourceClass?: StayOptiGoldenReviewEvidenceV3["sourceClass"];
  accommodationCategoryCode?: string;
  distanceMeasurement?: "TRAVEL_TIME" | "WALKING_DISTANCE" | "STRAIGHT_LINE";
}

export interface StayOptiGoldenFrozenDecisionV3 {
  status: "SELECTED" | "ABSTAINED";
  sourceAlternativeId: string | null;
  policyVersion: string;
  confidenceBps: number;
  reasonCodes?: SmartStayReasonCodeV3[];
  fallbackStatus?: "NOT_USED" | "USED" | "NOT_APPLICABLE";
}

export interface StayOptiGoldenFrozenCasePlanV3 {
  goldenCaseId: string;
  profile: StayOptiRolePolicyProfileV3;
  expectedRole: StayOptiGoldenSingleStayRoleV3;
  budgetMinorUnits: number;
  essentialConstraintCodes: string[];
  maximumDistanceMeters: number | null;
  comfortRequirementCodes: string[];
  minimumRefundability: "REFUNDABLE" | "NON_REFUNDABLE_ACCEPTABLE" | null;
  payLaterRequired: boolean | null;
  abstentionEvaluable: boolean;
  v2: StayOptiGoldenFrozenDecisionV3;
  v3Candidate: StayOptiGoldenFrozenDecisionV3;
}

export interface StayOptiGoldenProjectionInputV3 {
  normalizedSnapshot: StayOptiNormalizedDecisionSourceCapsuleV3;
  frozenCasePlan: readonly StayOptiGoldenFrozenCasePlanV3[];
  projectionVersion: typeof STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3;
  searchFamilyId: string;
  providerSourceKey: string;
  providerExhaustedWithinCap: boolean;
  evidenceBySourceAlternativeId?: Readonly<Record<string, StayOptiGoldenNormalizedEvidenceSupplementV3>>;
}

export type StayOptiGoldenProjectionIssueCodeV3 =
  | "PROJECTION_SOURCE_CAPSULE_INVALID"
  | "PROJECTION_PLAN_EMPTY"
  | "PROJECTION_PLAN_LIMIT_EXCEEDED"
  | "PROJECTION_PROFILE_NOT_FROZEN"
  | "PROJECTION_PROFILE_DUPLICATE"
  | "PROJECTION_SPLIT_ROLE_PROHIBITED"
  | "PROJECTION_CURRENCY_MISMATCH"
  | "PROJECTION_PRICE_INVALID"
  | "PROJECTION_NORMALIZED_ALTERNATIVE_DUPLICATE"
  | "PROJECTION_DECISION_REFERENCE_INVALID";

export interface StayOptiGoldenProjectionIssueV3 {
  code: StayOptiGoldenProjectionIssueCodeV3;
  path: string;
}

export interface StayOptiGoldenProjectionCaseResultV3 {
  goldenCase: StayOptiGoldenCaseV3;
  validation: StayOptiGoldenCaseValidationResultV3;
}

export interface StayOptiGoldenProjectionResultV3 {
  projectionVersion: typeof STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3;
  collectionBoundary: typeof STAYOPTI_GOLDEN_BOUNDED_COLLECTION_BOUNDARY_V3;
  providerExhaustedWithinCap: boolean;
  cases: StayOptiGoldenProjectionCaseResultV3[];
  issues: StayOptiGoldenProjectionIssueV3[];
  validCases: number;
  quarantinedCases: number;
  rejectedCases: number;
  inputMutated: false;
  splitIncluded: false;
  rawProviderIdentifiersPersisted: 0;
}

function issue(
  issues: StayOptiGoldenProjectionIssueV3[],
  code: StayOptiGoldenProjectionIssueCodeV3,
  path: string,
) {
  issues.push({ code, path });
}

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedIssues(issues: readonly StayOptiGoldenProjectionIssueV3[]) {
  return [...new Map(issues.map((entry) => [`${entry.path}\u0000${entry.code}`, entry])).values()]
    .sort((left, right) => compareStrings(left.path, right.path) || compareStrings(left.code, right.code));
}

function toMinorUnits(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const scaled = value * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-7) return null;
  return Math.round(scaled);
}

function toNonnegativeMinorUnits(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const scaled = value * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-7) return null;
  return Math.round(scaled);
}

function normalizedReliability(
  value: StayOptiNormalizedDecisionAlternativeV3["evidence"]["reliability"],
): StayOptiGoldenReliabilityV3 {
  if (value === "high") return "HIGH";
  if (value === "medium") return "MEDIUM";
  if (value === "low") return "LOW";
  return "UNKNOWN";
}

function known<T>(
  value: T,
  reliability: StayOptiGoldenReliabilityV3,
  evidenceRef: string,
): StayOptiGoldenEvidenceValueV3<T> {
  return {
    status: "KNOWN",
    reliability,
    value,
    unknownReason: null,
    evidenceRefs: [evidenceRef],
  };
}

function unknown<T>(
  reason: string,
  evidenceRef: string,
): StayOptiGoldenEvidenceValueV3<T> {
  return {
    status: "UNKNOWN",
    reliability: "UNKNOWN",
    value: null,
    unknownReason: reason,
    evidenceRefs: [evidenceRef],
  };
}

function materialAlternativeProjection(
  alternative: StayOptiNormalizedDecisionAlternativeV3,
  supplement: StayOptiGoldenNormalizedEvidenceSupplementV3 | undefined,
) {
  return {
    totalPrice: alternative.totalPrice,
    currency: alternative.currency,
    mandatoryCostStatus: alternative.mandatoryCostStatus,
    mandatoryCostAbsenceReason: alternative.mandatoryCostAbsenceReason,
    cancellation: alternative.cancellation,
    quality: alternative.quality,
    distanceKm: alternative.distanceKm,
    featureCodes: [...alternative.featureCodes].sort(),
    availabilityState: alternative.availabilityState,
    recheckState: alternative.recheckState,
    evidence: alternative.evidence,
    supplement: supplement ?? null,
  };
}

function cancellationBucket(timestamp: string | null): string | null {
  if (timestamp === null) return null;
  return "PROVIDER_DECLARED_BEFORE_CHECKIN";
}

function createGoldenAlternative(
  alternative: StayOptiNormalizedDecisionAlternativeV3,
  supplement: StayOptiGoldenNormalizedEvidenceSupplementV3 | undefined,
  localAlternativeId: string,
  evidenceRef: string,
  occupancy: StayOptiNormalizedDecisionSourceCapsuleV3["context"]["occupancy"],
): StayOptiGoldenAlternativeV3 {
  const reliability = normalizedReliability(alternative.evidence.reliability);
  const priceMinorUnits = toMinorUnits(alternative.totalPrice) as number;
  const missingEvidence: string[] = [];

  const taxFeeEvidence = supplement?.taxFeeEvidence
    ? known(supplement.taxFeeEvidence, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["taxFeeEvidence"]["value"]>>(
        "TAX_FEE_COMPONENT_NOT_EXPLICIT_IN_NORMALIZED_SNAPSHOT",
        evidenceRef,
      );
  if (!supplement?.taxFeeEvidence) missingEvidence.push("MISSING_TAX_FEE_EVIDENCE");

  const ratingEvidence = alternative.quality.reviewScore !== null && alternative.quality.reviewScale !== null
    ? known({ score: alternative.quality.reviewScore, scale: alternative.quality.reviewScale }, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["ratingEvidence"]["value"]>>("RATING_NOT_OBSERVED", evidenceRef);
  if (ratingEvidence.status === "UNKNOWN") missingEvidence.push("MISSING_RATING_EVIDENCE");

  const reviewEvidence = alternative.quality.reviewCount !== null
    ? known({
        count: alternative.quality.reviewCount,
        sourceClass: supplement?.reviewSourceClass ?? "UNKNOWN",
      }, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["reviewEvidence"]["value"]>>("REVIEW_COUNT_NOT_OBSERVED", evidenceRef);
  if (reviewEvidence.status === "UNKNOWN") missingEvidence.push("MISSING_REVIEW_EVIDENCE");

  const distanceEvidence = alternative.distanceKm !== null
    ? known({
        meters: Math.round(alternative.distanceKm * 1_000),
        measurement: supplement?.distanceMeasurement ?? "STRAIGHT_LINE",
      }, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["distanceEvidence"]["value"]>>("DISTANCE_NOT_OBSERVED", evidenceRef);
  if (distanceEvidence.status === "UNKNOWN") missingEvidence.push("MISSING_DISTANCE_EVIDENCE");

  const categoryCode = supplement?.accommodationCategoryCode ??
    (alternative.quality.starCategory === null
      ? null
      : `CATEGORY_STAR_${Math.round(alternative.quality.starCategory)}`);
  const accommodationCategoryEvidence = categoryCode === null
    ? unknown<string>("ACCOMMODATION_CATEGORY_NOT_OBSERVED", evidenceRef)
    : known(categoryCode, reliability, evidenceRef);
  if (categoryCode === null) missingEvidence.push("MISSING_ACCOMMODATION_CATEGORY_EVIDENCE");

  const roomEvidence = supplement?.roomEvidence
    ? known({
        roomTypeCode: supplement.roomEvidence.roomTypeCode,
        adults: occupancy.adults,
        childAges: [...occupancy.childAges].sort((left, right) => left - right),
        rooms: occupancy.rooms,
      }, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["roomEvidence"]["value"]>>("ROOM_DETAIL_NOT_OBSERVED", evidenceRef);
  if (!supplement?.roomEvidence) missingEvidence.push("MISSING_ROOM_EVIDENCE");

  const cancellation = alternative.cancellation;
  const cancellationEvidence = cancellation.evidenceState !== "missing" &&
    cancellation.refundability !== "unknown" &&
    (cancellation.penaltyAmount === null || cancellation.penaltyCurrency !== null)
    ? known({
        refundability: cancellation.refundability === "refundable" ? "REFUNDABLE" as const : "NON_REFUNDABLE" as const,
        freeCancellationUntilBucket: cancellationBucket(cancellation.freeCancellationUntil),
        penaltyMinorUnits: cancellation.penaltyAmount === null ? null : toNonnegativeMinorUnits(cancellation.penaltyAmount),
        penaltyCurrency: cancellation.penaltyAmount === null ? null : cancellation.penaltyCurrency,
      }, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["cancellationEvidence"]["value"]>>("CANCELLATION_NOT_OBSERVED", evidenceRef);
  if (cancellationEvidence.status === "UNKNOWN") missingEvidence.push("MISSING_CANCELLATION_EVIDENCE");

  const comfortEvidence = alternative.featureCodes.length > 0
    ? known({ featureCodes: [...alternative.featureCodes].sort() }, reliability, evidenceRef)
    : unknown<NonNullable<StayOptiGoldenAlternativeV3["comfortEvidence"]["value"]>>("COMFORT_FEATURES_NOT_OBSERVED", evidenceRef);
  if (comfortEvidence.status === "UNKNOWN") missingEvidence.push("MISSING_COMFORT_EVIDENCE");

  return {
    localAlternativeId,
    totalTripCostMinorUnits: priceMinorUnits,
    currency: alternative.currency,
    taxFeeEvidence,
    ratingEvidence,
    reviewEvidence,
    distanceEvidence,
    accommodationCategoryEvidence,
    roomEvidence,
    cancellationEvidence,
    comfortEvidence,
    dataReliability: reliability,
    costCompleteness: alternative.mandatoryCostStatus === "complete"
      ? "COMPLETE"
      : alternative.mandatoryCostStatus === "partial"
        ? "PARTIAL"
        : "UNKNOWN",
    bookabilityStatus: alternative.availabilityState === "available"
      ? alternative.recheckState === "verified" ? "AVAILABLE" : "REQUIRES_RECHECK"
      : "UNKNOWN",
    missingEvidence: [...new Set(missingEvidence)].sort(),
    reasonCodes: ["solution:single"],
  };
}

function mapDecision(
  input: StayOptiGoldenFrozenDecisionV3,
  engineKey: "V2_BASELINE" | "V3_CANDIDATE",
  role: StayOptiGoldenSingleStayRoleV3,
  sourceToLocalId: ReadonlyMap<string, string>,
  evidenceRefs: string[],
): StayOptiGoldenDecisionRecordV3 | null {
  const localAlternativeId = input.sourceAlternativeId === null
    ? null
    : sourceToLocalId.get(input.sourceAlternativeId) ?? null;
  if ((input.status === "SELECTED") !== (localAlternativeId !== null)) return null;
  return {
    engineKey,
    policyVersion: input.policyVersion,
    status: input.status,
    selectedAlternativeIds: localAlternativeId === null ? [] : [localAlternativeId],
    role,
    confidenceBps: input.confidenceBps,
    reasonCodes: input.reasonCodes ?? ["decision:recommended"],
    evidenceRefs,
    fallbackStatus: input.fallbackStatus ?? "NOT_USED",
  };
}

function leadTimeBucket(collectedAt: string, checkIn: string) {
  const days = Math.floor((Date.parse(`${checkIn}T00:00:00Z`) - Date.parse(collectedAt)) / 86_400_000);
  if (days <= 3) return "LAST_MINUTE" as const;
  if (days <= 14) return "NEAR_TERM" as const;
  if (days <= 60) return "MID_TERM" as const;
  return "ADVANCE" as const;
}

function stayLengthBucket(nights: number) {
  if (nights <= 2) return "VERY_SHORT" as const;
  if (nights <= 4) return "SHORT" as const;
  if (nights <= 7) return "MEDIUM" as const;
  if (nights <= 14) return "LONG" as const;
  return "EXTENDED" as const;
}

function seasonBucket(checkIn: string) {
  const month = Number(checkIn.slice(5, 7));
  if ([6, 7, 8, 12].includes(month)) return "HIGH" as const;
  if ([4, 5, 9, 10].includes(month)) return "SHOULDER" as const;
  return "LOW" as const;
}

function destinationBucket(label: string, countryCode: string) {
  const safe = label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
  return `DESTINATION_${countryCode}_${safe || "GENERAL"}`;
}

function baseResult(
  providerExhaustedWithinCap: boolean,
  issues: readonly StayOptiGoldenProjectionIssueV3[],
): StayOptiGoldenProjectionResultV3 {
  return {
    projectionVersion: STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3,
    collectionBoundary: STAYOPTI_GOLDEN_BOUNDED_COLLECTION_BOUNDARY_V3,
    providerExhaustedWithinCap,
    cases: [],
    issues: sortedIssues(issues),
    validCases: 0,
    quarantinedCases: 0,
    rejectedCases: 0,
    inputMutated: false,
    splitIncluded: false,
    rawProviderIdentifiersPersisted: 0,
  };
}

export function projectNormalizedSearchFamilyToGoldenCasesV3(
  input: StayOptiGoldenProjectionInputV3,
): StayOptiGoldenProjectionResultV3 {
  const issues: StayOptiGoldenProjectionIssueV3[] = [];
  try {
    const snapshotValidation = validateNormalizedDecisionSourceCapsuleV3(input.normalizedSnapshot);
    if (!snapshotValidation.valid) issue(issues, "PROJECTION_SOURCE_CAPSULE_INVALID", "input.normalizedSnapshot");
  } catch {
    issue(issues, "PROJECTION_SOURCE_CAPSULE_INVALID", "input.normalizedSnapshot");
  }
  if (input.frozenCasePlan.length === 0) issue(issues, "PROJECTION_PLAN_EMPTY", "input.frozenCasePlan");
  if (input.frozenCasePlan.length > STAYOPTI_GOLDEN_MAX_PRIMARY_CASES_PER_FAMILY_V3) {
    issue(issues, "PROJECTION_PLAN_LIMIT_EXCEEDED", "input.frozenCasePlan");
  }
  const profiles = input.frozenCasePlan.map((entry) => entry.profile);
  if (profiles.some((profile) => !STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3.includes(profile as never))) {
    issue(issues, "PROJECTION_PROFILE_NOT_FROZEN", "input.frozenCasePlan.profile");
  }
  if (new Set(profiles).size !== profiles.length) issue(issues, "PROJECTION_PROFILE_DUPLICATE", "input.frozenCasePlan.profile");
  if (input.frozenCasePlan.some((entry) => String(entry.expectedRole) === "split-saver")) {
    issue(issues, "PROJECTION_SPLIT_ROLE_PROHIBITED", "input.frozenCasePlan.expectedRole");
  }

  const expectedCurrency = input.normalizedSnapshot.context.budget.currency;
  const evidence = input.evidenceBySourceAlternativeId ?? {};
  const materialKeys = new Map<string, string>();
  for (const [index, alternative] of input.normalizedSnapshot.alternatives.entries()) {
    if (alternative.currency !== expectedCurrency) issue(issues, "PROJECTION_CURRENCY_MISMATCH", `input.normalizedSnapshot.alternatives[${index}].currency`);
    if (toMinorUnits(alternative.totalPrice) === null) {
      issue(issues, "PROJECTION_PRICE_INVALID", `input.normalizedSnapshot.alternatives[${index}].totalPrice`);
      continue;
    }
    const materialKey = stableSerializeV3(materialAlternativeProjection(alternative, evidence[alternative.alternativeId]));
    if (materialKeys.has(materialKey)) issue(issues, "PROJECTION_NORMALIZED_ALTERNATIVE_DUPLICATE", "input.normalizedSnapshot.alternatives");
    materialKeys.set(materialKey, alternative.alternativeId);
  }
  if (issues.length > 0) return baseResult(input.providerExhaustedWithinCap, issues);

  const sortedAlternatives = [...input.normalizedSnapshot.alternatives]
    .sort((left, right) => compareStrings(
      stableSerializeV3(materialAlternativeProjection(left, evidence[left.alternativeId])),
      stableSerializeV3(materialAlternativeProjection(right, evidence[right.alternativeId])),
    ));
  const sourceToLocalId = new Map<string, string>();
  const evidenceRefs: string[] = [];
  const goldenAlternatives = sortedAlternatives.map((alternative, index) => {
    const localAlternativeId = `ALT_${String(index + 1).padStart(3, "0")}`;
    const evidenceRef = `EVIDENCE_ALT_${String(index + 1).padStart(3, "0")}`;
    sourceToLocalId.set(alternative.alternativeId, localAlternativeId);
    evidenceRefs.push(evidenceRef);
    return createGoldenAlternative(
      alternative,
      evidence[alternative.alternativeId],
      localAlternativeId,
      evidenceRef,
      input.normalizedSnapshot.context.occupancy,
    );
  });

  const projected: StayOptiGoldenProjectionCaseResultV3[] = [];
  for (const [index, plan] of input.frozenCasePlan.entries()) {
    const v2 = mapDecision(plan.v2, "V2_BASELINE", plan.expectedRole, sourceToLocalId, evidenceRefs);
    const v3Candidate = mapDecision(plan.v3Candidate, "V3_CANDIDATE", plan.expectedRole, sourceToLocalId, evidenceRefs);
    if (v2 === null || v3Candidate === null) {
      issue(issues, "PROJECTION_DECISION_REFERENCE_INVALID", `input.frozenCasePlan[${index}].decisions`);
      continue;
    }
    const snapshot = input.normalizedSnapshot;
    const candidate: Omit<StayOptiGoldenCaseV3, "declaredFingerprint"> = {
      schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
      caseVersion: "1.0.0",
      goldenCaseId: plan.goldenCaseId,
      searchFamilyId: input.searchFamilyId,
      sourceKind: "REAL_NORMALIZED_SNAPSHOT",
      createdAtBucket: snapshot.collectedAt.slice(0, 7),
      provenance: {
        origin: "REAL_NORMALIZED_SNAPSHOT",
        collectionBoundary: input.providerExhaustedWithinCap
          ? "PROVIDER_EXHAUSTED_WITHIN_CAP"
          : "DEPTH_CAPPED_DIAGNOSTIC_ONLY",
        normalizerVersion: snapshot.versions.normalizerVersion,
        evidenceSchemaVersion: snapshot.schemaVersion,
        providerSourceKey: input.providerSourceKey,
        freshnessBucket: snapshot.alternatives.every((entry) => entry.evidence.freshness === "fresh")
          ? "SAME_DAY"
          : "MIXED_OR_UNKNOWN",
        transformationProcess: input.projectionVersion,
        parentGoldenCaseId: null,
      },
      tripContext: {
        checkIn: snapshot.context.checkIn,
        checkOut: snapshot.context.checkOut,
        nights: snapshot.context.nights,
        adults: snapshot.context.occupancy.adults,
        childAges: [...snapshot.context.occupancy.childAges].sort((left, right) => left - right),
        rooms: snapshot.context.occupancy.rooms,
        expectedCurrency,
        destinationBucket: destinationBucket(snapshot.context.destination.label, snapshot.context.destination.countryCode),
        bookingLeadTimeBucket: leadTimeBucket(snapshot.collectedAt, snapshot.context.checkIn),
        stayLengthBucket: stayLengthBucket(snapshot.context.nights),
        seasonBucket: seasonBucket(snapshot.context.checkIn),
      },
      travelerContext: {
        budgetMinorUnits: plan.budgetMinorUnits,
        profile: plan.profile,
        essentialConstraintCodes: [...new Set(plan.essentialConstraintCodes)].sort(),
        distancePreference: plan.maximumDistanceMeters === null
          ? { status: "UNKNOWN", maximumDistanceMeters: null, unknownReason: "DISTANCE_PREFERENCE_NOT_FROZEN" }
          : { status: "KNOWN", maximumDistanceMeters: plan.maximumDistanceMeters, unknownReason: null },
        comfortRequirements: plan.comfortRequirementCodes.length === 0
          ? { status: "UNKNOWN", requiredCodes: [], unknownReason: "COMFORT_REQUIREMENTS_NOT_FROZEN" }
          : { status: "KNOWN", requiredCodes: [...new Set(plan.comfortRequirementCodes)].sort(), unknownReason: null },
        flexibilityRequirements: plan.minimumRefundability === null || plan.payLaterRequired === null
          ? { status: "UNKNOWN", minimumRefundability: null, payLaterRequired: null, unknownReason: "FLEXIBILITY_REQUIREMENTS_NOT_FROZEN" }
          : {
              status: "KNOWN",
              minimumRefundability: plan.minimumRefundability,
              payLaterRequired: plan.payLaterRequired,
              unknownReason: null,
            },
      },
      alternatives: goldenAlternatives.map((alternative) => ({ ...alternative })),
      decisions: { v2, v3Candidate },
      expectedRole: plan.expectedRole,
      abstentionEligibility: {
        status: plan.abstentionEvaluable ? "EVALUABLE" : "NOT_EVALUABLE",
        reasonCodes: [plan.abstentionEvaluable ? "abstention:indistinguishable-options" : "abstention:not-required"],
      },
      evidenceRefs: [...evidenceRefs],
    };
    const goldenCase: StayOptiGoldenCaseV3 = {
      ...candidate,
      declaredFingerprint: createGoldenCaseFingerprintV3(candidate as StayOptiGoldenCaseV3),
    };
    projected.push({ goldenCase, validation: validateGoldenCaseV3(goldenCase) });
  }

  return {
    projectionVersion: STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3,
    collectionBoundary: STAYOPTI_GOLDEN_BOUNDED_COLLECTION_BOUNDARY_V3,
    providerExhaustedWithinCap: input.providerExhaustedWithinCap,
    cases: projected,
    issues: sortedIssues(issues),
    validCases: projected.filter((entry) => entry.validation.disposition === "GOLDEN_VALID").length,
    quarantinedCases: projected.filter((entry) => entry.validation.disposition === "QUARANTINED_INCOMPLETE").length,
    rejectedCases: projected.filter((entry) => entry.validation.disposition === "REJECTED_CONTRACT").length,
    inputMutated: false,
    splitIncluded: false,
    rawProviderIdentifiersPersisted: 0,
  };
}
