import { stableSerializeV3 } from "../contract/stableHashV3";

export const STAYOPTI_COMPARABLE_SET_GATE_VERSION_V3 =
  "stayopti.v3.comparable-set-evidence-gate@1" as const;
export const STAYOPTI_COMPARABLE_SET_SELECTION_VERSION_V3 =
  "stayopti.v3.comparable-set-provider-neutral-selection@1" as const;

export const STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3 = 5 as const;
export const STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3 = 8 as const;
export const STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3 = 10 as const;

export type StayOptiComparableEvidenceTierV3 =
  | "DIAGNOSTIC_ONLY"
  | "LIMITED_COMPARABLE_JUDGMENT"
  | "FULL_DECISION_AND_BLIND_JUDGMENT";

export type StayOptiPriceSemanticV3 =
  | "OBSERVED_AGGREGATED_DISPLAY_PRICE"
  | "SELLER_SPECIFIC_OBSERVED_PRICE"
  | "EXACT_BOOKABLE_PRICE"
  | "VERIFIED_CHECKOUT_TOTAL";

export type StayOptiCapabilityStatusV3 =
  | "DEMONSTRATED"
  | "PARTIALLY_DEMONSTRATED"
  | "NOT_DEMONSTRATED"
  | "NOT_AVAILABLE"
  | "UNKNOWN_REQUIRES_CONTROLLED_TEST";

export const STAYOPTI_COMPARABLE_EVIDENCE_TIERS_V3 = Object.freeze([
  Object.freeze({
    tier: "DIAGNOSTIC_ONLY" as const,
    decisionReplayAllowed: false,
    blindJudgmentAllowed: false,
    goldenCandidateAllowed: false,
    purpose: "MISSINGNESS_BIAS_AND_SHAPE_DIAGNOSIS",
  }),
  Object.freeze({
    tier: "LIMITED_COMPARABLE_JUDGMENT" as const,
    decisionReplayAllowed: false,
    blindJudgmentAllowed: true,
    goldenCandidateAllowed: false,
    purpose: "LIMITED_RELATIVE_VALUE_AND_QUALITATIVE_COHERENCE_REVIEW",
  }),
  Object.freeze({
    tier: "FULL_DECISION_AND_BLIND_JUDGMENT" as const,
    decisionReplayAllowed: true,
    blindJudgmentAllowed: true,
    goldenCandidateAllowed: true,
    purpose: "CANONICAL_DECISION_REPLAY_AND_MANUAL_GOLDEN_REVIEW",
  }),
]);

export interface StayOptiSetWideFieldRequirementV3 {
  readonly field: string;
  readonly requiredTier: StayOptiComparableEvidenceTierV3;
  readonly mandatory: boolean;
  readonly requiredCoverageBps: number;
  readonly allowedMissingness: "EXPLICIT_UNKNOWN_ALLOWED" | "NONE";
  readonly semanticType: string;
  readonly reliabilityThreshold: string;
  readonly comparabilityRule: string;
  readonly use: "AUDIT_ONLY" | "DECISION_INPUT" | "CONFIDENCE_ONLY";
  readonly failureConsequence: string;
}

export const STAYOPTI_SET_WIDE_FIELD_MATRIX_V3: readonly StayOptiSetWideFieldRequirementV3[] = Object.freeze([
  { field: "stayAndOccupancyScope", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "CANONICAL_STAY_OCCUPANCY", reliabilityThreshold: "EXACT_MATCH", comparabilityRule: "IDENTICAL_SCOPE", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "availability", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "EXACT_SCOPE_AVAILABILITY", reliabilityThreshold: "CONFIRMED", comparabilityRule: "SAME_CAPTURE_BOUNDARY", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "totalStayPrice", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "EXACT_BOOKABLE_PRICE", reliabilityThreshold: "FRESH_SELLER_SPECIFIC", comparabilityRule: "TOTAL_STAY_MINOR_UNITS", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "currency", requiredTier: "LIMITED_COMPARABLE_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "ISO_4217", reliabilityThreshold: "KNOWN", comparabilityRule: "ONE_CURRENCY", use: "DECISION_INPUT", failureConsequence: "FAIL_LIMITED_AND_FULL" },
  { field: "taxAndFeeStatus", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "KNOWN_OR_EXPLICITLY_EXCLUDED_AMOUNT", reliabilityThreshold: "SOURCE_BOUND", comparabilityRule: "IDENTICAL_TAX_SEMANTICS", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "freshness", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "CAPTURE_BUCKET_AND_RECHECK_STATE", reliabilityThreshold: "CURRENT_FOR_DECISION", comparabilityRule: "ONE_CAPTURE_WINDOW", use: "CONFIDENCE_ONLY", failureConsequence: "FAIL_FULL_TIER" },
  { field: "roomOfferComparability", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "CANONICAL_ROOM_AND_OFFER", reliabilityThreshold: "STRUCTURED", comparabilityRule: "LIKE_FOR_LIKE_OR_DECLARED_DIFFERENCE", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "cancellationTerms", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "STRUCTURED_CANCELLATION", reliabilityThreshold: "SOURCE_BOUND", comparabilityRule: "SAME_TERM_SCHEMA", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "reviewRatingAndCount", requiredTier: "LIMITED_COMPARABLE_JUDGMENT", mandatory: true, requiredCoverageBps: 8000, allowedMissingness: "EXPLICIT_UNKNOWN_ALLOWED", semanticType: "NORMALIZED_RATING_WITH_COUNT", reliabilityThreshold: "PROVENANCE_KNOWN", comparabilityRule: "ONE_NORMALIZED_SCALE", use: "DECISION_INPUT", failureConsequence: "FAIL_IF_BELOW_THRESHOLD" },
  { field: "location", requiredTier: "LIMITED_COMPARABLE_JUDGMENT", mandatory: true, requiredCoverageBps: 8000, allowedMissingness: "EXPLICIT_UNKNOWN_ALLOWED", semanticType: "CANONICAL_LOCATION_EVIDENCE", reliabilityThreshold: "NORMALIZED_REFERENCE", comparabilityRule: "ONE_DESTINATION_ANCHOR", use: "DECISION_INPUT", failureConsequence: "FAIL_IF_BELOW_THRESHOLD" },
  { field: "essentialAmenities", requiredTier: "LIMITED_COMPARABLE_JUDGMENT", mandatory: true, requiredCoverageBps: 8000, allowedMissingness: "EXPLICIT_UNKNOWN_ALLOWED", semanticType: "CANONICAL_AMENITY_KEYS", reliabilityThreshold: "SET_WIDE_SOURCE", comparabilityRule: "ONE_ALLOWLIST", use: "DECISION_INPUT", failureConsequence: "FAIL_IF_BELOW_THRESHOLD" },
  { field: "propertyCategory", requiredTier: "FULL_DECISION_AND_BLIND_JUDGMENT", mandatory: true, requiredCoverageBps: 10000, allowedMissingness: "NONE", semanticType: "CANONICAL_ACCOMMODATION_TYPE", reliabilityThreshold: "STRUCTURED", comparabilityRule: "ONE_TAXONOMY", use: "DECISION_INPUT", failureConsequence: "FAIL_FULL_TIER" },
  { field: "sourceOrderAndPromotion", requiredTier: "DIAGNOSTIC_ONLY", mandatory: false, requiredCoverageBps: 0, allowedMissingness: "EXPLICIT_UNKNOWN_ALLOWED", semanticType: "EXPOSURE_BIAS", reliabilityThreshold: "AUDIT_ONLY", comparabilityRule: "NEVER_DECISION_MERIT", use: "AUDIT_ONLY", failureConsequence: "NONE" },
]);

export const STAYOPTI_PRICE_SEMANTIC_MATRIX_V3 = Object.freeze([
  Object.freeze({ semantic: "OBSERVED_AGGREGATED_DISPLAY_PRICE" as const, rankingUse: "PROHIBITED_FOR_FULL_DECISION", blindUse: "LIMITED_WITH_CAVEAT", goldenUse: "PROHIBITED", taxesAndFees: "UNKNOWN_OR_PARTIAL", freshness: "DISPLAY_CAPTURE_ONLY", sellerSpecific: false, availability: "UNPROVEN", recheckRequired: true, minimumReliability: "DISPLAYED_AGGREGATED_NOT_CHECKOUT_VERIFIED" }),
  Object.freeze({ semantic: "SELLER_SPECIFIC_OBSERVED_PRICE" as const, rankingUse: "LIMITED_UNLESS_BOOKABILITY_CONFIRMED", blindUse: "LIMITED_WITH_CAVEAT", goldenUse: "PROHIBITED_WITHOUT_BOOKABILITY", taxesAndFees: "EXPLICIT_STATUS_REQUIRED", freshness: "CAPTURE_REQUIRED", sellerSpecific: true, availability: "UNPROVEN_UNLESS_BOUND", recheckRequired: true, minimumReliability: "SELLER_AND_SCOPE_BOUND" }),
  Object.freeze({ semantic: "EXACT_BOOKABLE_PRICE" as const, rankingUse: "ALLOWED", blindUse: "ALLOWED", goldenUse: "MANUAL_REVIEW_CANDIDATE", taxesAndFees: "EXPLICIT_STATUS_REQUIRED", freshness: "CURRENT_FOR_DECISION", sellerSpecific: true, availability: "CONFIRMED_EXACT_SCOPE", recheckRequired: true, minimumReliability: "FRESH_BOOKABLE_TOTAL_STAY" }),
  Object.freeze({ semantic: "VERIFIED_CHECKOUT_TOTAL" as const, rankingUse: "ALLOWED", blindUse: "ALLOWED", goldenUse: "STRONGEST_MANUAL_REVIEW_CANDIDATE", taxesAndFees: "KNOWN_COMPLETE", freshness: "CHECKOUT_VERIFIED", sellerSpecific: true, availability: "CONFIRMED", recheckRequired: false, minimumReliability: "CHECKOUT_BOUND" }),
]);

export const STAYOPTI_CURRENT_SOURCE_CAPABILITY_MATRIX_V3 = Object.freeze([
  Object.freeze({ capability: "MAIN_SEARCH_SET_WIDE_RATING_REVIEW_LOCATION", status: "DEMONSTRATED" as const, evidence: "29_OF_29_IN_SEALED_SAMPLE" }),
  Object.freeze({ capability: "MAIN_SEARCH_SET_WIDE_AMENITIES", status: "PARTIALLY_DEMONSTRATED" as const, evidence: "28_OF_29_IN_SEALED_SAMPLE" }),
  Object.freeze({ capability: "MAIN_SEARCH_AGGREGATED_DISPLAY_PRICE", status: "PARTIALLY_DEMONSTRATED" as const, evidence: "20_OF_29_NON_BOOKABLE" }),
  Object.freeze({ capability: "PROPERTY_DETAIL_STRUCTURAL_REPLAY", status: "PARTIALLY_DEMONSTRATED" as const, evidence: "ONE_DIRECT_ROOT_DETAIL" }),
  Object.freeze({ capability: "SELLER_SPECIFIC_EXACT_BOOKABLE_OFFER", status: "NOT_DEMONSTRATED" as const, evidence: "EXACT_BOOKABLE_FALSE" }),
  Object.freeze({ capability: "TOTAL_STAY_PRICE_SET_WIDE", status: "NOT_DEMONSTRATED" as const, evidence: "NINE_PRICES_MISSING_AND_SEMANTICS_PARTIAL" }),
  Object.freeze({ capability: "TAX_AND_FEE_COMPLETENESS", status: "PARTIALLY_DEMONSTRATED" as const, evidence: "BEFORE_TAX_SIGNAL_ONLY_WITHOUT_CHECKOUT_PROOF" }),
  Object.freeze({ capability: "CANCELLATION_SET_WIDE", status: "NOT_DEMONSTRATED" as const, evidence: "UNKNOWN_IN_SEALED_SAMPLE" }),
  Object.freeze({ capability: "EXACT_SCOPE_AVAILABILITY", status: "NOT_DEMONSTRATED" as const, evidence: "DISPLAY_DOES_NOT_PROVE_BOOKABILITY" }),
  Object.freeze({ capability: "FRESHNESS", status: "PARTIALLY_DEMONSTRATED" as const, evidence: "CAPTURE_TIME_WITHOUT_OFFER_RECHECK" }),
  Object.freeze({ capability: "FULL_DECISION_AND_BLIND_JUDGMENT", status: "NOT_DEMONSTRATED" as const, evidence: "CRITICAL_SET_WIDE_FIELDS_MISSING" }),
]);

interface NodeHashV3 {
  update(value: string, encoding: "utf8"): NodeHashV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 { createHash(algorithm: "sha256"): NodeHashV3; }

function sha256(value: unknown, namespace: string) {
  const processValue = (globalThis as typeof globalThis & { process?: { getBuiltinModule?: (name: string) => unknown } }).process;
  const crypto = processValue?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (typeof crypto?.createHash !== "function") throw new Error("T4_NODE_CRYPTO_REQUIRED");
  return crypto.createHash("sha256").update(`${namespace}\n${stableSerializeV3(value)}`, "utf8").digest("hex");
}

export interface StayOptiComparableCandidateV3 {
  readonly localReference: string;
  readonly displayPriceMinorUnits: number | null;
  readonly currency: string | null;
  readonly budgetMinorUnits: number;
  readonly reviewRating: number | null;
  readonly reviewCount: number | null;
  readonly locationDistanceMeters: number | null;
  readonly essentialAmenities: readonly string[] | null;
  readonly propertyCategory: string | null;
  readonly stayScopeConsistent: boolean;
  readonly occupancyScopeConsistent: boolean;
  readonly auditOnly?: {
    readonly sourceLabel?: string;
    readonly opaqueIdentity?: string;
    readonly originalPosition?: number;
    readonly sponsored?: boolean;
    readonly detailRichness?: number;
  };
}

export interface StayOptiComparableSetSelectionV3 {
  readonly selectionVersion: typeof STAYOPTI_COMPARABLE_SET_SELECTION_VERSION_V3;
  readonly selectedLocalReferences: readonly string[];
  readonly selectedSemanticFingerprints: readonly string[];
  readonly inclusionReasons: Readonly<Record<string, readonly string[]>>;
  readonly missingPriceLocalReferences: readonly string[];
  readonly missingPricePolicy: "SEPARATE_MISSING_STRATUM_EXCLUDED_FROM_LIMITED_PRICE_COMPARISON";
  readonly selectionFrozenBeforeDetail: true;
  readonly selectionFingerprint: string;
}

interface CandidateMaterialV3 {
  readonly candidate: StayOptiComparableCandidateV3;
  readonly semantic: {
    readonly displayPriceMinorUnits: number;
    readonly currency: string;
    readonly budgetMinorUnits: number;
    readonly reviewRating: number | null;
    readonly reviewCount: number | null;
    readonly locationDistanceMeters: number | null;
    readonly essentialAmenities: readonly string[] | null;
    readonly propertyCategory: string | null;
    readonly stayScopeConsistent: true;
    readonly occupancyScopeConsistent: true;
  };
  readonly fingerprint: string;
}

function controlledReference(value: string) {
  if (!/^ALT_[A-Z0-9_]{1,60}$/.test(value)) throw new Error("T4_LOCAL_REFERENCE_INVALID");
}

function material(candidate: StayOptiComparableCandidateV3): CandidateMaterialV3 | null {
  controlledReference(candidate.localReference);
  if (candidate.displayPriceMinorUnits === null) return null;
  if (!Number.isInteger(candidate.displayPriceMinorUnits) || candidate.displayPriceMinorUnits < 0) throw new Error("T4_DISPLAY_PRICE_INVALID");
  if (!Number.isInteger(candidate.budgetMinorUnits) || candidate.budgetMinorUnits < 0) throw new Error("T4_BUDGET_INVALID");
  if (!/^[A-Z]{3}$/.test(candidate.currency ?? "")) throw new Error("T4_CURRENCY_INVALID");
  if (!candidate.stayScopeConsistent || !candidate.occupancyScopeConsistent) return null;
  const semantic = {
    displayPriceMinorUnits: candidate.displayPriceMinorUnits,
    currency: candidate.currency!,
    budgetMinorUnits: candidate.budgetMinorUnits,
    reviewRating: candidate.reviewRating,
    reviewCount: candidate.reviewCount,
    locationDistanceMeters: candidate.locationDistanceMeters,
    essentialAmenities: candidate.essentialAmenities === null ? null : [...new Set(candidate.essentialAmenities)].sort(),
    propertyCategory: candidate.propertyCategory,
    stayScopeConsistent: true as const,
    occupancyScopeConsistent: true as const,
  };
  return { candidate, semantic, fingerprint: sha256(semantic, "stayopti-v3-t4-comparable-candidate") };
}

function pick(
  values: readonly CandidateMaterialV3[],
  selected: Map<string, { value: CandidateMaterialV3; reasons: string[] }>,
  reason: string,
  compare: (left: CandidateMaterialV3, right: CandidateMaterialV3) => number,
) {
  const candidate = [...values].sort((left, right) => compare(left, right) || left.fingerprint.localeCompare(right.fingerprint))[0];
  if (candidate === undefined) return;
  const current = selected.get(candidate.fingerprint);
  if (current === undefined) selected.set(candidate.fingerprint, { value: candidate, reasons: [reason] });
  else current.reasons.push(reason);
}

export function freezeProviderNeutralComparableSetSelectionV3(
  candidates: readonly StayOptiComparableCandidateV3[],
  targetSize: number = STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3,
): StayOptiComparableSetSelectionV3 {
  if (!Number.isInteger(targetSize) || targetSize < STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3 || targetSize > STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3) {
    throw new Error("T4_COMPARABLE_SET_SIZE_OUT_OF_BOUNDS");
  }
  if (new Set(candidates.map((entry) => entry.localReference)).size !== candidates.length) throw new Error("T4_DUPLICATE_LOCAL_REFERENCE");
  const missingPriceLocalReferences = candidates.filter((entry) => entry.displayPriceMinorUnits === null).map((entry) => entry.localReference).sort();
  const eligible = candidates.map(material).filter((entry): entry is CandidateMaterialV3 => entry !== null);
  if (eligible.length < STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3) throw new Error("T4_INSUFFICIENT_PRICED_COMPARABLE_CANDIDATES");
  const selected = new Map<string, { value: CandidateMaterialV3; reasons: string[] }>();
  pick(eligible, selected, "SAVING_SIGNAL", (left, right) => left.semantic.displayPriceMinorUnits - right.semantic.displayPriceMinorUnits);
  pick(eligible, selected, "NEAR_BUDGET_SIGNAL", (left, right) => Math.abs(left.semantic.displayPriceMinorUnits - left.semantic.budgetMinorUnits) - Math.abs(right.semantic.displayPriceMinorUnits - right.semantic.budgetMinorUnits));
  pick(eligible.filter((entry) => entry.semantic.reviewRating !== null), selected, "QUALITY_SIGNAL", (left, right) => (right.semantic.reviewRating ?? -1) - (left.semantic.reviewRating ?? -1) || (right.semantic.reviewCount ?? -1) - (left.semantic.reviewCount ?? -1));
  pick(eligible.filter((entry) => entry.semantic.essentialAmenities !== null), selected, "COMFORT_SIGNAL", (left, right) => (right.semantic.essentialAmenities?.length ?? -1) - (left.semantic.essentialAmenities?.length ?? -1));
  pick(eligible.filter((entry) => entry.semantic.locationDistanceMeters !== null), selected, "LOCATION_SIGNAL", (left, right) => (left.semantic.locationDistanceMeters ?? Number.MAX_SAFE_INTEGER) - (right.semantic.locationDistanceMeters ?? Number.MAX_SAFE_INTEGER));
  const orderedByPrice = [...eligible].sort((left, right) => left.semantic.displayPriceMinorUnits - right.semantic.displayPriceMinorUnits || left.fingerprint.localeCompare(right.fingerprint));
  pick(orderedByPrice, selected, "MID_RANGE_CONTROL", (left, right) => Math.abs(orderedByPrice.indexOf(left) - (orderedByPrice.length - 1) / 2) - Math.abs(orderedByPrice.indexOf(right) - (orderedByPrice.length - 1) / 2));
  for (const entry of [...eligible].sort((left, right) => left.fingerprint.localeCompare(right.fingerprint))) {
    if (selected.size >= Math.min(targetSize, eligible.length)) break;
    if (!selected.has(entry.fingerprint)) selected.set(entry.fingerprint, { value: entry, reasons: ["DETERMINISTIC_DIVERSITY_CONTROL"] });
  }
  const rows = [...selected.values()].sort((left, right) => left.value.fingerprint.localeCompare(right.value.fingerprint));
  const fingerprintMaterial = rows.map((entry) => ({ semanticFingerprint: entry.value.fingerprint, reasons: [...new Set(entry.reasons)].sort() }));
  return Object.freeze({
    selectionVersion: STAYOPTI_COMPARABLE_SET_SELECTION_VERSION_V3,
    selectedLocalReferences: Object.freeze(rows.map((entry) => entry.value.candidate.localReference)),
    selectedSemanticFingerprints: Object.freeze(rows.map((entry) => entry.value.fingerprint)),
    inclusionReasons: Object.freeze(Object.fromEntries(rows.map((entry) => [entry.value.candidate.localReference, Object.freeze([...new Set(entry.reasons)].sort())]))),
    missingPriceLocalReferences: Object.freeze(missingPriceLocalReferences),
    missingPricePolicy: "SEPARATE_MISSING_STRATUM_EXCLUDED_FROM_LIMITED_PRICE_COMPARISON",
    selectionFrozenBeforeDetail: true,
    selectionFingerprint: sha256({ selectionVersion: STAYOPTI_COMPARABLE_SET_SELECTION_VERSION_V3, selected: fingerprintMaterial, missingPriceCount: missingPriceLocalReferences.length }, "stayopti-v3-t4-comparable-selection"),
  });
}

export interface StayOptiComparableSetCoverageV3 {
  readonly setSize: number;
  readonly selectionFrozenBeforeDetail: boolean;
  readonly asymmetricDecisionDetailCoverage: boolean;
  readonly displayPriceCoverageBps: number;
  readonly exactBookablePriceCoverageBps: number;
  readonly availabilityCoverageBps: number;
  readonly currencyCoverageBps: number;
  readonly stayOccupancyCoverageBps: number;
  readonly taxFeeStatusCoverageBps: number;
  readonly freshnessCoverageBps: number;
  readonly cancellationCoverageBps: number;
  readonly roomOfferCoverageBps: number;
  readonly ratingReviewCoverageBps: number;
  readonly locationCoverageBps: number;
  readonly amenityCoverageBps: number;
  readonly propertyCategoryCoverageBps: number;
  readonly detailCoverageBps: number;
}

function validCoverage(value: number) { return Number.isInteger(value) && value >= 0 && value <= 10000; }

export function evaluateComparableSetEvidenceTierV3(input: StayOptiComparableSetCoverageV3) {
  const issues: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (key.endsWith("CoverageBps") && !validCoverage(value as number)) issues.push(`T4_COVERAGE_INVALID:${key}`);
  }
  const sizeValid = Number.isInteger(input.setSize) && input.setSize >= STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3 && input.setSize <= STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3;
  const limited = sizeValid && input.selectionFrozenBeforeDetail && !input.asymmetricDecisionDetailCoverage &&
    input.displayPriceCoverageBps === 10000 && input.currencyCoverageBps === 10000 && input.stayOccupancyCoverageBps === 10000 &&
    input.ratingReviewCoverageBps >= 8000 && input.locationCoverageBps >= 8000 && input.amenityCoverageBps >= 8000;
  const full = limited && input.exactBookablePriceCoverageBps === 10000 && input.availabilityCoverageBps === 10000 &&
    input.taxFeeStatusCoverageBps === 10000 && input.freshnessCoverageBps === 10000 && input.cancellationCoverageBps === 10000 &&
    input.roomOfferCoverageBps === 10000 && input.propertyCategoryCoverageBps === 10000 && input.detailCoverageBps === 10000;
  const tier: StayOptiComparableEvidenceTierV3 = full ? "FULL_DECISION_AND_BLIND_JUDGMENT" : limited ? "LIMITED_COMPARABLE_JUDGMENT" : "DIAGNOSTIC_ONLY";
  if (!sizeValid) issues.push("T4_SET_SIZE_INVALID");
  if (!input.selectionFrozenBeforeDetail) issues.push("T4_SELECTION_NOT_FROZEN_BEFORE_DETAIL");
  if (input.asymmetricDecisionDetailCoverage) issues.push("T4_ASYMMETRIC_DETAIL_COVERAGE");
  if (input.displayPriceCoverageBps < 10000) issues.push("T4_DISPLAY_PRICE_COVERAGE_INCOMPLETE");
  if (input.exactBookablePriceCoverageBps < 10000) issues.push("T4_EXACT_BOOKABLE_COVERAGE_INCOMPLETE");
  if (input.availabilityCoverageBps < 10000) issues.push("T4_AVAILABILITY_COVERAGE_INCOMPLETE");
  return Object.freeze({ tier, validInput: !issues.some((entry) => entry.startsWith("T4_COVERAGE_INVALID")), issues: Object.freeze([...new Set(issues)].sort()), decisionReplayAllowed: full, limitedBlindJudgmentAllowed: limited, manualGoldenReviewPossible: full, automaticGoldenAdmission: false as const });
}

export const STAYOPTI_T4_EXISTING_T3_SAMPLE_DECISION_V3 = Object.freeze({
  existingSampleEligibility: "DIAGNOSTIC_ONLY" as const,
  alternativeCount: 29 as const,
  observedPriceCount: 20 as const,
  missingPriceCount: 9 as const,
  singleItemDetailCount: 1 as const,
  selectionFrozenUnderT4Protocol: false as const,
  automaticEligibilityUpgrade: false as const,
  reasonCodes: Object.freeze([
    "T4_SELECTION_PROTOCOL_NOT_FROZEN_BEFORE_DETAIL",
    "T4_PRICE_COVERAGE_INCOMPLETE",
    "T4_EXACT_BOOKABILITY_UNPROVEN",
    "T4_ASYMMETRIC_DETAIL_COVERAGE",
  ]),
});

export const STAYOPTI_T4_COLLECTION_STRATEGIES_V3 = Object.freeze([
  Object.freeze({ strategy: "A" as const, description: "MAIN_SEARCH_ONLY_COMPARABLE_SUBSET", reachableTier: "LIMITED_COMPARABLE_JUDGMENT" as const, minimumCallsPerSession: 1, targetCallsPerSession: 1, maximumCallsPerSession: 1, targetCallsForTwelveSessions: 12, worstCaseCallsForTwelveSessions: 12, identityMatchingRisk: "NONE_WITHIN_ONE_SOURCE", expectedFailurePoints: Object.freeze(["PRICE_COVERAGE_BELOW_SET_MINIMUM", "LOCATION_ANCHOR_MISSING", "TERMS_OR_FRESHNESS_INSUFFICIENT"]), goldenPotential: "NO", decision: "RECOMMENDED_LIMITED_LOW_CREDIT_PATH" }),
  Object.freeze({ strategy: "B" as const, description: "MAIN_PLUS_DETAIL_FOR_EVERY_FROZEN_ALTERNATIVE", reachableTier: "LIMITED_COMPARABLE_JUDGMENT" as const, minimumCallsPerSession: 6, targetCallsPerSession: 9, maximumCallsPerSession: 11, targetCallsForTwelveSessions: 108, worstCaseCallsForTwelveSessions: 132, identityMatchingRisk: "OPAQUE_REFERENCE_REQUIRED_WITHIN_SOURCE", expectedFailurePoints: Object.freeze(["DETAIL_SHAPE_VARIANCE", "ASYMMETRIC_FAILURE", "EXACT_BOOKABILITY_STILL_UNPROVEN"]), goldenPotential: "NO_WITH_CURRENT_EVIDENCE", decision: "REJECTED_COST_WITHOUT_FULL_TIER_PROOF" }),
  Object.freeze({ strategy: "C" as const, description: "EXTERNAL_MAIN_PLUS_OPERATIONAL_EXACT_OFFERS", reachableTier: "FULL_DECISION_AND_BLIND_JUDGMENT" as const, minimumCallsPerSession: null, targetCallsPerSession: null, maximumCallsPerSession: null, targetCallsForTwelveSessions: null, worstCaseCallsForTwelveSessions: null, identityMatchingRisk: "HIGH_CROSS_SOURCE_ENTITY_AND_OFFER_MATCHING", expectedFailurePoints: Object.freeze(["ENTITY_MATCH_FALSE_POSITIVE", "OFFER_SCOPE_MISMATCH", "FRESHNESS_SKEW"]), goldenPotential: "CONDITIONAL_MANUAL_REVIEW", decision: "REQUIRES_SEPARATE_PROVIDER_QUALIFICATION" }),
  Object.freeze({ strategy: "D" as const, description: "ONE_SOURCE_SET_WIDE_EXACT_BOOKABLE_OFFERS", reachableTier: "FULL_DECISION_AND_BLIND_JUDGMENT" as const, minimumCallsPerSession: null, targetCallsPerSession: null, maximumCallsPerSession: null, targetCallsForTwelveSessions: null, worstCaseCallsForTwelveSessions: null, identityMatchingRisk: "LOW_WITHIN_ONE_CANONICAL_SOURCE", expectedFailurePoints: Object.freeze(["SOURCE_NOT_QUALIFIED", "COST_UNKNOWN", "PAGINATION_OR_DEPTH_LIMIT"]), goldenPotential: "CONDITIONAL_MANUAL_REVIEW", decision: "PREFERRED_FULL_TIER_IF_SOURCE_QUALIFIED" }),
]);

export const STAYOPTI_T4_SELECTED_CALL_BUDGET_V3 = Object.freeze({
  strategy: "A" as const,
  minimumCallsPerSession: 1 as const,
  targetCallsPerSession: 1 as const,
  maximumCallsPerSession: 1 as const,
  targetSessionCount: 12 as const,
  maximumTotalCalls: 12 as const,
  worstCaseTotalCalls: 12 as const,
  oneSessionCanaryCalls: 1 as const,
  callsSavedOnCanaryStop: 11 as const,
  diagnosticErrorReserveCalls: 0 as const,
  failedCallConsumesSessionBudget: true as const,
  retries: 0 as const,
  concurrency: 1 as const,
  pagination: 0 as const,
  autostopRequired: true as const,
});

export const STAYOPTI_T4_COLLECTION_GATE_CONTRACT_V3 = Object.freeze({
  contractVersion: "stayopti.v3.comparable-set-collection-authorization-gate@1" as const,
  sourceSha: "TO_BE_BOUND_AT_FUTURE_GATE" as const,
  executionHead: "TO_BE_BOUND_AT_FUTURE_GATE" as const,
  manifestHash: "NOT_MATERIALIZED" as const,
  runnerBundleHash: "NOT_MATERIALIZED" as const,
  sessionCount: 12 as const,
  comparableSetSize: STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3,
  maximumCallsPerSession: 1 as const,
  maximumTotalCalls: 12 as const,
  concurrency: 1 as const,
  retries: 0 as const,
  pagination: 0 as const,
  autostop: true as const,
  encryptedPrivateQuarantine: true as const,
  perSessionStop: true as const,
  globalStop: true as const,
  spendLedgerRequired: true as const,
  authorizationLiteral: null,
  authorizationLiteralCreated: false as const,
  networkAuthorizationGranted: false as const,
  remainingStageAuthorized: false as const,
  automaticGoldenAdmission: false as const,
});

export function validateT4OfflineGateInvocationV3(input: {
  readonly authorizationLiteral?: string;
  readonly maximumCallsPerSession?: number;
  readonly maximumTotalCalls?: number;
  readonly remainingStageRequested?: boolean;
}) {
  const issues: string[] = ["T4_NETWORK_AUTHORIZATION_NOT_GRANTED"];
  if (typeof input.authorizationLiteral === "string") issues.push("T4_AUTHORIZATION_LITERAL_NOT_MATERIALIZED_OR_ACCEPTED");
  if (input.maximumCallsPerSession !== undefined && input.maximumCallsPerSession !== STAYOPTI_T4_SELECTED_CALL_BUDGET_V3.maximumCallsPerSession) issues.push("T4_PER_SESSION_CAP_OVERRIDE_REJECTED");
  if (input.maximumTotalCalls !== undefined && input.maximumTotalCalls !== STAYOPTI_T4_SELECTED_CALL_BUDGET_V3.maximumTotalCalls) issues.push("T4_GLOBAL_CAP_OVERRIDE_REJECTED");
  if (input.remainingStageRequested === true) issues.push("T4_REMAINING_STAGE_UNAUTHORIZED");
  return Object.freeze({ allowed: false as const, providerCalls: 0 as const, httpRequests: 0 as const, issues: Object.freeze([...new Set(issues)].sort()) });
}

export const STAYOPTI_T4_GO_NO_GO_DECISION_V3 = Object.freeze({
  decision: "GO_LIMITED_COMPARABLE_COLLECTION" as const,
  selectedStrategy: "A" as const,
  currentSourceFullTierFeasibility: false as const,
  limitedCollectionPurpose: "QUALITATIVE_RELATIVE_VALUE_AND_MISSINGNESS_EVALUATION_ONLY" as const,
  fullTierRequiresStrategy: "C_OR_D_AFTER_SEPARATE_QUALIFICATION" as const,
  noOperationalLiteralCreated: true as const,
  newCollectionAuthorizationGranted: false as const,
  remainingStageAuthorized: false as const,
  automaticGoldenAdmission: false as const,
});
