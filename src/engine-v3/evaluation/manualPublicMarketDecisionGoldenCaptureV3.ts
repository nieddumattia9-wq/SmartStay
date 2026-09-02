import { stableSerializeV3 } from "../contract/stableHashV3";
import { createGoldenBlindSha256DigestV3 } from "./goldenBlindCapsuleV3";
import {
  createProviderRawQuarantineEnvelopeV3,
  decryptProviderRawQuarantineEnvelopeV3,
  type StayOptiProviderRawKeyProtectorV3,
  type StayOptiProviderRawQuarantineEnvelopeV3,
} from "./providerRawQuarantineV3";

export const STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3 =
  "stayopti.v3.manual-public-market-decision-capture@1" as const;
export const STAYOPTI_MANUAL_MARKET_SNAPSHOT_VERSION_V3 =
  "stayopti.v3.manual-public-market-provider-neutral-snapshot@1" as const;
export const STAYOPTI_MANUAL_MARKET_BLIND_CAPSULE_VERSION_V3 =
  "stayopti.v3.manual-public-market-blind-capsule@1" as const;
export const STAYOPTI_MANUAL_MARKET_SHARED_EVIDENCE_VERSION_V3 =
  "stayopti.v3.manual-public-market-shared-evidence@1" as const;
export const STAYOPTI_MANUAL_MARKET_PRIVATE_EVIDENCE_RELATIVE_PATH_V3 =
  "StayOpti/private-evidence/manual-market-golden-capture" as const;
export const STAYOPTI_MANUAL_MARKET_MIN_ALTERNATIVES_V3 = 5 as const;
export const STAYOPTI_MANUAL_MARKET_MAX_ALTERNATIVES_V3 = 8 as const;

export const STAYOPTI_DORMANT_T5_EXECUTION_HEAD_V3 =
  "47b4075043afcd151a8f4f8fa8b5a8d3f2aaf669" as const;
export const STAYOPTI_DORMANT_T5_RUNNER_BUNDLE_HASH_V3 =
  "a3a4068e6af81f2a82b4cb2345ffc388f8ca057c46eca3db53d21766139ba206" as const;
export const STAYOPTI_DORMANT_T5_CANARY_MANIFEST_HASH_V3 =
  "f41b10e2680bc885019c77b37ce4f5ed7f57d86e7afd87615f7a498ce375073c" as const;
export const STAYOPTI_DORMANT_T5_CAMPAIGN_MANIFEST_HASH_V3 =
  "679264c6952ec726825126b3e9fe3200f6222575a1223ef5a12a51bb117e208a" as const;

export type StayOptiManualMarketGoldenClassV3 =
  | "DECISION_GOLDEN"
  | "LIVE_BOOKABLE_GOLDEN"
  | "DIAGNOSTIC_ONLY";

export type StayOptiManualMarketLifecycleV3 =
  | "DRAFT"
  | "CAPTURE_IN_PROGRESS"
  | "CAPTURE_COMPLETE"
  | "DIAGNOSTIC_ONLY"
  | "ELIGIBLE_FOR_BLIND_JUDGMENT"
  | "BLIND_JUDGMENT_RECORDED"
  | "ELIGIBLE_FOR_DECISION_GOLDEN_REVIEW"
  | "DECISION_GOLDEN_ADMITTED"
  | "REJECTED";

export type StayOptiManualMarketEvidenceStatusV3 = "KNOWN" | "UNKNOWN" | "MISSING";
export type StayOptiManualMarketFeatureEligibilityV3 =
  | "COMPARABLE_ACROSS_SET"
  | "AUDIT_ONLY"
  | "MISSING"
  | "UNKNOWN"
  | "EXCLUDED_FROM_DECISION";

export interface StayOptiManualMarketPriceV3 {
  semantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE";
  amount: number;
  currency: string;
  stayTotal: true;
  taxInclusion: "INCLUDED" | "EXCLUDED" | "UNKNOWN";
  payNowAmount: number | null;
  payAtPropertyAmount: number | null;
  observedAt: string;
  availabilityObserved: true;
  precheckoutPresented: true;
  purchaseCompleted: false;
  bookingConfirmed: false;
  exactBookable: false;
  verifiedCheckoutTotal: false;
  personalizedDiscount: false;
  provenance: "MANUAL_PUBLIC_CONSUMER_OBSERVATION";
  reliability: "DIRECT_PRECHECKOUT_OBSERVATION" | "LIMITED_MANUAL_OBSERVATION";
  missingness: readonly string[];
}

export interface StayOptiManualMarketAlternativeV3 {
  localCaptureId: string;
  privateRealName: string;
  privateSourceUrl: string;
  privateScreenshotRefs: readonly string[];
  consumerSurfaceClass: string;
  originalOrder: number;
  sponsored: boolean | null;
  guestConfigurationFingerprint: string;
  price: StayOptiManualMarketPriceV3 | null;
  rating: number | null;
  ratingScale: number | null;
  reviewCount: number | null;
  distanceMeters: number | null;
  accommodationCategory: string | null;
  roomEvidence: string | null;
  mealPlanEvidence: string | null;
  cancellationEvidence: string | null;
  refundabilityEvidence: string | null;
  amenityEvidence: readonly string[];
  availabilityEvidence: "OBSERVED_AVAILABLE" | "UNKNOWN" | "NOT_AVAILABLE";
  missingness: readonly string[];
  detailCoverage: readonly string[];
}

export interface StayOptiManualMarketCaptureV3 {
  captureVersion: typeof STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3;
  captureId: string;
  lifecycle: StayOptiManualMarketLifecycleV3;
  destinationBucket: string;
  checkin: string;
  checkout: string;
  adults: number;
  childrenAges: readonly number[];
  rooms: number;
  currency: string;
  budgetMinorUnits: number;
  preferenceProfile: string;
  hardConstraints: readonly string[];
  consumerSurfaceClass: string;
  loggedOut: true;
  membershipDiscountApplied: false;
  personalizedDiscountApplied: false;
  collectionWindowStart: string;
  collectionWindowEnd: string;
  selectionFrozenBeforeJudgment: true;
  alternatives: readonly StayOptiManualMarketAlternativeV3[];
  declaredFingerprint?: string;
}

export interface StayOptiManualMarketValidationIssueV3 {
  code: string;
  path: string;
  disposition: "REJECTED" | "DIAGNOSTIC_ONLY" | "AUDIT_ONLY";
}

export interface StayOptiManualMarketValidationV3 {
  valid: boolean;
  lifecycle: "REJECTED" | "DIAGNOSTIC_ONLY" | "ELIGIBLE_FOR_BLIND_JUDGMENT";
  goldenClass: "DIAGNOSTIC_ONLY" | "DECISION_GOLDEN_CANDIDATE";
  issues: readonly StayOptiManualMarketValidationIssueV3[];
  comparableFeatures: readonly string[];
  auditOnlyFeatures: readonly string[];
  excludedDecisionFeatures: readonly string[];
  fingerprint: string | null;
}

export interface StayOptiManualMarketSnapshotAlternativeV3 {
  blindAlternativeId: string;
  price: StayOptiManualMarketPriceV3;
  rating: number;
  ratingScale: number;
  reviewCount: number;
  distanceMeters: number;
  accommodationCategory: string;
  roomEvidence: string;
  mealPlanEvidence: string;
  cancellationEvidence: string;
  refundabilityEvidence: string;
  amenityEvidence: readonly string[];
  availabilityEvidence: "OBSERVED_AVAILABLE";
  missingness: readonly string[];
}

export interface StayOptiManualMarketSnapshotV3 {
  snapshotVersion: typeof STAYOPTI_MANUAL_MARKET_SNAPSHOT_VERSION_V3;
  captureFingerprint: string;
  destinationBucket: string;
  checkin: string;
  checkout: string;
  adults: number;
  childrenAges: readonly number[];
  rooms: number;
  currency: string;
  budgetMinorUnits: number;
  preferenceProfile: string;
  hardConstraints: readonly string[];
  alternatives: readonly StayOptiManualMarketSnapshotAlternativeV3[];
  priceSemantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE";
  goldenClass: "DECISION_GOLDEN_CANDIDATE";
  liveBookableGoldenAvailable: false;
  automaticGoldenAdmission: false;
  snapshotFingerprint: string;
}

export interface StayOptiManualMarketBlindCapsuleV3 {
  capsuleVersion: typeof STAYOPTI_MANUAL_MARKET_BLIND_CAPSULE_VERSION_V3;
  capsuleId: string;
  snapshotFingerprint: string;
  tripContext: Omit<StayOptiManualMarketSnapshotV3, "alternatives" | "snapshotFingerprint" | "captureFingerprint" | "snapshotVersion" | "goldenClass" | "liveBookableGoldenAvailable" | "automaticGoldenAdmission">;
  alternatives: readonly StayOptiManualMarketSnapshotAlternativeV3[];
  judgmentPrompt: string;
  judgmentMustPrecedeDecisionReveal: true;
  allowedChoices: readonly string[];
  capsuleFingerprint: string;
}

export interface StayOptiManualMarketPrivateBlindLedgerV3 {
  ledgerVersion: "stayopti.v3.manual-public-market-private-blind-ledger@1";
  capsuleId: string;
  captureFingerprint: string;
  entries: readonly {
    blindAlternativeId: string;
    localCaptureId: string;
    privateRealName: string;
  }[];
  judgmentRecorded: boolean;
  decisionRevealed: boolean;
  ledgerFingerprint: string;
}

export interface StayOptiManualMarketJudgmentV3 {
  judgmentVersion: "stayopti.v3.manual-public-market-blind-judgment@1";
  judgmentId: string;
  capsuleId: string;
  evaluatorPseudonym: string;
  selectedAlternativeId: string | null;
  acceptableAlternativeIds: readonly string[];
  unacceptableAlternativeIds: readonly string[];
  insufficientEvidence: boolean;
  confidence: 1 | 2 | 3 | 4 | 5;
  reasonCodes: readonly string[];
  createdAtBucket: string;
}

const CAPTURE_ID = /^[A-Z][A-Z0-9_-]{7,95}$/;
const CURRENCY = /^[A-Z]{3}$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PROHIBITED_PUBLIC_KEY = /(?:providerId|propertyToken|hotelId|offerId|bookingId|prebookId|continuationId|commission|markup|rawPayload|rawResponse|apiKey|accessToken|password|secret)/i;

function compare(first: string, second: string) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function digest(value: unknown, namespace: string) {
  return createGoldenBlindSha256DigestV3(value, namespace);
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort(compare);
}

function sameStringSet(first: readonly string[], second: readonly string[]) {
  return stableSerializeV3(sortedUnique(first)) === stableSerializeV3(sortedUnique(second));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function scanJsonSafety(value: unknown, path: string, issues: StayOptiManualMarketValidationIssueV3[]) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    issues.push({ code: "MANUAL_CAPTURE_NON_JSON_VALUE", path, disposition: "REJECTED" });
    return;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push({ code: "MANUAL_CAPTURE_NON_FINITE_NUMBER", path, disposition: "REJECTED" });
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (!Array.isArray(value) && !isPlainRecord(value)) {
    issues.push({ code: "MANUAL_CAPTURE_NON_PLAIN_OBJECT", path, disposition: "REJECTED" });
    return;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    const childPath = `${path}.${key}`;
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      issues.push({ code: "MANUAL_CAPTURE_UNSAFE_KEY", path: childPath, disposition: "REJECTED" });
      continue;
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      issues.push({ code: "MANUAL_CAPTURE_ACCESSOR_REJECTED", path: childPath, disposition: "REJECTED" });
      continue;
    }
    scanJsonSafety(descriptor.value, childPath, issues);
  }
}

function captureFingerprintMaterial(capture: StayOptiManualMarketCaptureV3) {
  const { declaredFingerprint: _ignored, ...material } = capture;
  return {
    ...material,
    consumerSurfaceClass: "PRIVATE_CAPTURE_PROTOCOL_VERIFIED",
    alternatives: [...material.alternatives]
      .map((alternative) => ({
        localCaptureId: alternative.localCaptureId,
        guestConfigurationFingerprint: alternative.guestConfigurationFingerprint,
        price: alternative.price === null ? null : { ...alternative.price, missingness: sortedUnique(alternative.price.missingness) },
        rating: alternative.rating,
        ratingScale: alternative.ratingScale,
        reviewCount: alternative.reviewCount,
        distanceMeters: alternative.distanceMeters,
        accommodationCategory: alternative.accommodationCategory,
        roomEvidence: alternative.roomEvidence,
        mealPlanEvidence: alternative.mealPlanEvidence,
        cancellationEvidence: alternative.cancellationEvidence,
        refundabilityEvidence: alternative.refundabilityEvidence,
        amenityEvidence: sortedUnique(alternative.amenityEvidence),
        availabilityEvidence: alternative.availabilityEvidence,
        missingness: sortedUnique(alternative.missingness),
        detailCoverage: sortedUnique(alternative.detailCoverage),
      }))
      .sort((a, b) => compare(a.localCaptureId, b.localCaptureId)),
    hardConstraints: sortedUnique(material.hardConstraints),
  };
}

export function fingerprintManualMarketCaptureV3(capture: StayOptiManualMarketCaptureV3) {
  return digest(captureFingerprintMaterial(capture), "manual-public-market-capture-v3");
}

function validatePrice(price: StayOptiManualMarketPriceV3 | null, currency: string, path: string, issues: StayOptiManualMarketValidationIssueV3[]) {
  if (price === null) {
    issues.push({ code: "MANUAL_CAPTURE_PRICE_REQUIRED", path, disposition: "DIAGNOSTIC_ONLY" });
    return;
  }
  if (price.semantics !== "PUBLIC_PRECHECKOUT_VERIFIED_PRICE") issues.push({ code: "MANUAL_CAPTURE_PRICE_SEMANTICS_INVALID", path, disposition: "REJECTED" });
  if (!Number.isInteger(price.amount) || price.amount < 0) issues.push({ code: "MANUAL_CAPTURE_PRICE_INVALID", path: `${path}.amount`, disposition: "REJECTED" });
  if (price.currency !== currency) issues.push({ code: "MANUAL_CAPTURE_CURRENCY_MISMATCH", path: `${path}.currency`, disposition: "REJECTED" });
  if (!price.stayTotal || !price.availabilityObserved || !price.precheckoutPresented) issues.push({ code: "MANUAL_CAPTURE_PRECHECKOUT_EVIDENCE_REQUIRED", path, disposition: "DIAGNOSTIC_ONLY" });
  if (price.purchaseCompleted || price.bookingConfirmed || price.exactBookable || price.verifiedCheckoutTotal || price.personalizedDiscount) issues.push({ code: "MANUAL_CAPTURE_PRICE_OVERCLAIM_REJECTED", path, disposition: "REJECTED" });
  if (!ISO_INSTANT.test(price.observedAt)) issues.push({ code: "MANUAL_CAPTURE_OBSERVED_AT_INVALID", path: `${path}.observedAt`, disposition: "REJECTED" });
  for (const [field, amount] of [["payNowAmount", price.payNowAmount], ["payAtPropertyAmount", price.payAtPropertyAmount]] as const) {
    if (amount !== null && (!Number.isInteger(amount) || amount < 0)) issues.push({ code: "MANUAL_CAPTURE_PRICE_COMPONENT_INVALID", path: `${path}.${field}`, disposition: "REJECTED" });
  }
}

export function validateManualMarketCaptureV3(capture: StayOptiManualMarketCaptureV3): StayOptiManualMarketValidationV3 {
  const issues: StayOptiManualMarketValidationIssueV3[] = [];
  scanJsonSafety(capture, "$", issues);
  if (capture.captureVersion !== STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3) issues.push({ code: "MANUAL_CAPTURE_SCHEMA_UNSUPPORTED", path: "$.captureVersion", disposition: "REJECTED" });
  if (!CAPTURE_ID.test(capture.captureId)) issues.push({ code: "MANUAL_CAPTURE_ID_INVALID", path: "$.captureId", disposition: "REJECTED" });
  if (!ISO_DAY.test(capture.checkin) || !ISO_DAY.test(capture.checkout) || capture.checkout <= capture.checkin) issues.push({ code: "MANUAL_CAPTURE_DATES_INVALID", path: "$.checkin", disposition: "REJECTED" });
  if (!CURRENCY.test(capture.currency)) issues.push({ code: "MANUAL_CAPTURE_CURRENCY_INVALID", path: "$.currency", disposition: "REJECTED" });
  if (!Number.isInteger(capture.budgetMinorUnits) || capture.budgetMinorUnits < 0) issues.push({ code: "MANUAL_CAPTURE_BUDGET_INVALID", path: "$.budgetMinorUnits", disposition: "REJECTED" });
  if (!capture.loggedOut || capture.membershipDiscountApplied || capture.personalizedDiscountApplied) issues.push({ code: "MANUAL_CAPTURE_PERSONALIZED_CONTEXT_REJECTED", path: "$", disposition: "REJECTED" });
  if (!capture.selectionFrozenBeforeJudgment) issues.push({ code: "MANUAL_CAPTURE_SELECTION_NOT_FROZEN", path: "$.selectionFrozenBeforeJudgment", disposition: "REJECTED" });
  if (!ISO_INSTANT.test(capture.collectionWindowStart) || !ISO_INSTANT.test(capture.collectionWindowEnd) || capture.collectionWindowEnd < capture.collectionWindowStart) issues.push({ code: "MANUAL_CAPTURE_WINDOW_INVALID", path: "$.collectionWindowStart", disposition: "REJECTED" });
  if (capture.alternatives.length < STAYOPTI_MANUAL_MARKET_MIN_ALTERNATIVES_V3) issues.push({ code: "MANUAL_CAPTURE_TOO_FEW_ALTERNATIVES", path: "$.alternatives", disposition: "DIAGNOSTIC_ONLY" });
  if (capture.alternatives.length > STAYOPTI_MANUAL_MARKET_MAX_ALTERNATIVES_V3) issues.push({ code: "MANUAL_CAPTURE_TOO_MANY_ALTERNATIVES", path: "$.alternatives", disposition: "REJECTED" });
  const ids = new Set<string>();
  const comparable = new Set(["price", "rating", "reviewCount", "distance", "category", "room", "mealPlan", "cancellation", "refundability", "amenities", "availability"]);
  const auditOnly = new Set(["consumerSurface", "originalOrder", "sponsored", "privateRealName", "privateSourceUrl", "privateScreenshotRefs"]);
  const excluded = new Set(auditOnly);
  const firstCoverage = capture.alternatives[0]?.detailCoverage ?? [];
  for (const [index, alternative] of capture.alternatives.entries()) {
    const path = `$.alternatives[${index}]`;
    if (ids.has(alternative.localCaptureId)) issues.push({ code: "MANUAL_CAPTURE_DUPLICATE_ALTERNATIVE", path: `${path}.localCaptureId`, disposition: "REJECTED" });
    ids.add(alternative.localCaptureId);
    if (!CAPTURE_ID.test(alternative.localCaptureId)) issues.push({ code: "MANUAL_CAPTURE_ALTERNATIVE_ID_INVALID", path: `${path}.localCaptureId`, disposition: "REJECTED" });
    if (alternative.consumerSurfaceClass !== capture.consumerSurfaceClass) issues.push({ code: "MANUAL_CAPTURE_MIXED_CONSUMER_SURFACE", path: `${path}.consumerSurfaceClass`, disposition: "REJECTED" });
    if (alternative.guestConfigurationFingerprint !== `${capture.adults}|${capture.childrenAges.join(",")}|${capture.rooms}`) issues.push({ code: "MANUAL_CAPTURE_GUEST_CONFIGURATION_MISMATCH", path: `${path}.guestConfigurationFingerprint`, disposition: "REJECTED" });
    validatePrice(alternative.price, capture.currency, `${path}.price`, issues);
    if (alternative.availabilityEvidence !== "OBSERVED_AVAILABLE") issues.push({ code: "MANUAL_CAPTURE_AVAILABILITY_REQUIRED", path: `${path}.availabilityEvidence`, disposition: "DIAGNOSTIC_ONLY" });
    for (const [field, value] of [["rating", alternative.rating], ["ratingScale", alternative.ratingScale], ["reviewCount", alternative.reviewCount], ["distanceMeters", alternative.distanceMeters], ["accommodationCategory", alternative.accommodationCategory], ["roomEvidence", alternative.roomEvidence], ["mealPlanEvidence", alternative.mealPlanEvidence], ["cancellationEvidence", alternative.cancellationEvidence], ["refundabilityEvidence", alternative.refundabilityEvidence]] as const) {
      if (value === null) {
        comparable.delete(field === "ratingScale" ? "rating" : field);
        excluded.add(field);
        issues.push({ code: "MANUAL_CAPTURE_COMPARABLE_FIELD_MISSING", path: `${path}.${field}`, disposition: "DIAGNOSTIC_ONLY" });
      }
    }
    if (!sameStringSet(firstCoverage, alternative.detailCoverage)) {
      issues.push({ code: "MANUAL_CAPTURE_ASYMMETRIC_DETAIL_EXCLUDED", path: `${path}.detailCoverage`, disposition: "AUDIT_ONLY" });
      excluded.add("asymmetricDetail");
    }
  }
  const fingerprint = issues.some((issue) => issue.disposition === "REJECTED") ? null : fingerprintManualMarketCaptureV3(capture);
  if (capture.declaredFingerprint !== undefined && fingerprint !== null && capture.declaredFingerprint !== fingerprint) issues.push({ code: "MANUAL_CAPTURE_FINGERPRINT_MISMATCH", path: "$.declaredFingerprint", disposition: "REJECTED" });
  const orderedIssues = [...issues].sort((a, b) => compare(`${a.code}|${a.path}`, `${b.code}|${b.path}`));
  const rejected = orderedIssues.some((issue) => issue.disposition === "REJECTED");
  const diagnostic = orderedIssues.some((issue) => issue.disposition === "DIAGNOSTIC_ONLY");
  return Object.freeze({
    valid: !rejected && !diagnostic,
    lifecycle: rejected ? "REJECTED" : diagnostic ? "DIAGNOSTIC_ONLY" : "ELIGIBLE_FOR_BLIND_JUDGMENT",
    goldenClass: rejected || diagnostic ? "DIAGNOSTIC_ONLY" : "DECISION_GOLDEN_CANDIDATE",
    issues: Object.freeze(orderedIssues),
    comparableFeatures: Object.freeze([...comparable].sort(compare)),
    auditOnlyFeatures: Object.freeze([...auditOnly].sort(compare)),
    excludedDecisionFeatures: Object.freeze([...excluded].sort(compare)),
    fingerprint,
  });
}

function publicAlternativeMaterial(alternative: StayOptiManualMarketAlternativeV3) {
  if (alternative.price === null || alternative.rating === null || alternative.ratingScale === null || alternative.reviewCount === null || alternative.distanceMeters === null || alternative.accommodationCategory === null || alternative.roomEvidence === null || alternative.mealPlanEvidence === null || alternative.cancellationEvidence === null || alternative.refundabilityEvidence === null || alternative.availabilityEvidence !== "OBSERVED_AVAILABLE") throw new Error("MANUAL_CAPTURE_ALTERNATIVE_NOT_COMPARABLE");
  return {
    price: { ...alternative.price, missingness: sortedUnique(alternative.price.missingness) },
    rating: alternative.rating,
    ratingScale: alternative.ratingScale,
    reviewCount: alternative.reviewCount,
    distanceMeters: alternative.distanceMeters,
    accommodationCategory: alternative.accommodationCategory,
    roomEvidence: alternative.roomEvidence,
    mealPlanEvidence: alternative.mealPlanEvidence,
    cancellationEvidence: alternative.cancellationEvidence,
    refundabilityEvidence: alternative.refundabilityEvidence,
    amenityEvidence: sortedUnique(alternative.amenityEvidence),
    availabilityEvidence: alternative.availabilityEvidence,
    missingness: sortedUnique(alternative.missingness),
  };
}

export function createManualMarketProviderNeutralSnapshotV3(capture: StayOptiManualMarketCaptureV3): StayOptiManualMarketSnapshotV3 {
  const validation = validateManualMarketCaptureV3(capture);
  if (!validation.valid || validation.fingerprint === null) throw new Error("MANUAL_CAPTURE_NOT_ELIGIBLE_FOR_SNAPSHOT");
  const ordered = capture.alternatives
    .map((alternative) => ({ alternative, material: publicAlternativeMaterial(alternative) }))
    .sort((first, second) => compare(stableSerializeV3(first.material), stableSerializeV3(second.material)));
  const alternatives = ordered.map(({ material }, index) => ({ blindAlternativeId: `ALT_${String.fromCharCode(65 + index)}`, ...material }));
  const base = {
    snapshotVersion: STAYOPTI_MANUAL_MARKET_SNAPSHOT_VERSION_V3,
    captureFingerprint: validation.fingerprint,
    destinationBucket: capture.destinationBucket,
    checkin: capture.checkin,
    checkout: capture.checkout,
    adults: capture.adults,
    childrenAges: [...capture.childrenAges],
    rooms: capture.rooms,
    currency: capture.currency,
    budgetMinorUnits: capture.budgetMinorUnits,
    preferenceProfile: capture.preferenceProfile,
    hardConstraints: sortedUnique(capture.hardConstraints),
    alternatives,
    priceSemantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE" as const,
    goldenClass: "DECISION_GOLDEN_CANDIDATE" as const,
    liveBookableGoldenAvailable: false as const,
    automaticGoldenAdmission: false as const,
  };
  return Object.freeze({ ...base, snapshotFingerprint: digest(base, "manual-public-market-snapshot-v3") });
}

function assertNoBlindLeak(value: unknown) {
  const serialized = stableSerializeV3(value);
  if (/SerpApi|Google Hotels|LiteAPI|Nuitee|sellerId|sellerName|sponsored|originalOrder|privateRealName|privateSourceUrl|privateScreenshotRefs|decisionScore|decisionResult/i.test(serialized)) throw new Error("MANUAL_BLIND_CAPSULE_LEAK_DETECTED");
  if (PROHIBITED_PUBLIC_KEY.test(serialized)) throw new Error("MANUAL_BLIND_CAPSULE_UNSAFE_FIELD");
}

export function createManualMarketBlindCapsuleV3(capture: StayOptiManualMarketCaptureV3, privateBatchKey: string) {
  if (privateBatchKey.length < 24) throw new Error("MANUAL_BLIND_PRIVATE_BATCH_KEY_REQUIRED");
  const snapshot = createManualMarketProviderNeutralSnapshotV3(capture);
  const capsuleId = `MMC_${digest({ key: privateBatchKey, snapshot: snapshot.snapshotFingerprint }, "manual-market-capsule-id").slice(0, 32).toUpperCase()}`;
  const tripContext = {
    destinationBucket: snapshot.destinationBucket,
    checkin: snapshot.checkin,
    checkout: snapshot.checkout,
    adults: snapshot.adults,
    childrenAges: snapshot.childrenAges,
    rooms: snapshot.rooms,
    currency: snapshot.currency,
    budgetMinorUnits: snapshot.budgetMinorUnits,
    preferenceProfile: snapshot.preferenceProfile,
    hardConstraints: snapshot.hardConstraints,
    priceSemantics: snapshot.priceSemantics,
  };
  const withoutFingerprint = {
    capsuleVersion: STAYOPTI_MANUAL_MARKET_BLIND_CAPSULE_VERSION_V3,
    capsuleId,
    snapshotFingerprint: snapshot.snapshotFingerprint,
    tripContext,
    alternatives: snapshot.alternatives,
    judgmentPrompt: "Choose the alternative that best satisfies the stated trip context, or record insufficient evidence.",
    judgmentMustPrecedeDecisionReveal: true as const,
    allowedChoices: [...snapshot.alternatives.map((alternative) => alternative.blindAlternativeId), "INSUFFICIENT_EVIDENCE"],
  };
  assertNoBlindLeak(withoutFingerprint);
  const capsule = Object.freeze({ ...withoutFingerprint, capsuleFingerprint: digest(withoutFingerprint, "manual-public-market-blind-capsule-v3") });
  const privateOrdered = capture.alternatives
    .map((alternative) => ({ alternative, serialized: stableSerializeV3(publicAlternativeMaterial(alternative)) }))
    .sort((first, second) => compare(first.serialized, second.serialized) || compare(first.alternative.localCaptureId, second.alternative.localCaptureId));
  const entries = privateOrdered.map(({ alternative }, index) => ({
    blindAlternativeId: snapshot.alternatives[index]!.blindAlternativeId,
    localCaptureId: alternative.localCaptureId,
    privateRealName: alternative.privateRealName,
  }));
  const ledgerBase = { ledgerVersion: "stayopti.v3.manual-public-market-private-blind-ledger@1" as const, capsuleId, captureFingerprint: snapshot.captureFingerprint, entries, judgmentRecorded: false, decisionRevealed: false };
  const privateLedger = Object.freeze({ ...ledgerBase, ledgerFingerprint: digest(ledgerBase, "manual-public-market-private-ledger-v3") });
  return Object.freeze({ snapshot, capsule, privateLedger });
}

export function recordManualMarketBlindJudgmentV3(ledger: StayOptiManualMarketPrivateBlindLedgerV3, judgment: StayOptiManualMarketJudgmentV3) {
  if (ledger.decisionRevealed) throw new Error("MANUAL_BLIND_JUDGMENT_AFTER_DECISION_REVEAL_REJECTED");
  if (ledger.judgmentRecorded) throw new Error("MANUAL_BLIND_JUDGMENT_DUPLICATE_REJECTED");
  if (judgment.capsuleId !== ledger.capsuleId) throw new Error("MANUAL_BLIND_JUDGMENT_CAPSULE_MISMATCH");
  const ids = new Set(ledger.entries.map((entry) => entry.blindAlternativeId));
  for (const id of [judgment.selectedAlternativeId, ...judgment.acceptableAlternativeIds, ...judgment.unacceptableAlternativeIds]) if (id !== null && !ids.has(id)) throw new Error("MANUAL_BLIND_JUDGMENT_REFERENCE_INVALID");
  const nextBase = { ...ledger, judgmentRecorded: true as const };
  const { ledgerFingerprint: _ignored, ...material } = nextBase;
  return Object.freeze({ ...material, ledgerFingerprint: digest(material, "manual-public-market-private-ledger-v3") });
}

export function markManualMarketDecisionRevealedV3(ledger: StayOptiManualMarketPrivateBlindLedgerV3) {
  if (!ledger.judgmentRecorded) throw new Error("MANUAL_DECISION_REVEAL_BEFORE_BLIND_JUDGMENT_REJECTED");
  const { ledgerFingerprint: _ignored, ...material } = { ...ledger, decisionRevealed: true as const };
  return Object.freeze({ ...material, ledgerFingerprint: digest(material, "manual-public-market-private-ledger-v3") });
}

export function createManualMarketSharedEvidenceV3(capture: StayOptiManualMarketCaptureV3, capsule: StayOptiManualMarketBlindCapsuleV3) {
  const validation = validateManualMarketCaptureV3(capture);
  if (!validation.valid || validation.fingerprint === null) throw new Error("MANUAL_CAPTURE_SHARED_EVIDENCE_NOT_ELIGIBLE");
  const evidence = {
    evidenceVersion: STAYOPTI_MANUAL_MARKET_SHARED_EVIDENCE_VERSION_V3,
    captureFingerprint: validation.fingerprint,
    capsuleFingerprint: capsule.capsuleFingerprint,
    alternativeCount: capture.alternatives.length,
    priceSemantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE" as const,
    privateEvidenceEncrypted: true as const,
    privateEvidenceIncluded: false as const,
    automaticGoldenAdmission: false as const,
    liveBookableGoldenAvailable: false as const,
    lifecycle: "ELIGIBLE_FOR_BLIND_JUDGMENT" as const,
    checks: { noNetwork: true, noCredentials: true, noScraping: true, noProductApi: true },
  };
  assertNoBlindLeak(evidence);
  return Object.freeze({ ...evidence, evidenceFingerprint: digest(evidence, "manual-public-market-shared-evidence-v3") });
}

export function encryptManualMarketPrivateEvidenceV3(input: { captureId: string; evidenceKind: "SCREENSHOT" | "SAVED_PAGE" | "SOURCE_URL" | "PROPERTY_NAME"; plaintext: string; capturedAt: string; disposition: "PROCESSED_SUCCESS" | "UNRECOGNIZED_PARTIAL_OR_ERROR"; keyProtector: StayOptiProviderRawKeyProtectorV3 }): StayOptiProviderRawQuarantineEnvelopeV3 {
  return createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: input.plaintext,
    metadata: { providerKey: "MANUAL_PUBLIC_MARKET", endpointClass: "CONSUMER_EVIDENCE", sessionReference: input.captureId, requestKind: input.evidenceKind, requestOrdinal: 1, capturedAt: input.capturedAt },
    disposition: input.disposition,
    keyProtector: input.keyProtector,
  });
}

export function verifyManualMarketPrivateEvidenceV3(envelope: StayOptiProviderRawQuarantineEnvelopeV3, keyProtector: StayOptiProviderRawKeyProtectorV3) {
  return decryptProviderRawQuarantineEnvelopeV3(envelope, keyProtector);
}

export function classifyDormantSerpApiT5AuthorizationV3(input: { executionHead: string; runnerBundleHash: string; canaryManifestHash: string; campaignManifestHash: string }) {
  const matchesRevokedSeal = input.executionHead === STAYOPTI_DORMANT_T5_EXECUTION_HEAD_V3 && input.runnerBundleHash === STAYOPTI_DORMANT_T5_RUNNER_BUNDLE_HASH_V3 && input.canaryManifestHash === STAYOPTI_DORMANT_T5_CANARY_MANIFEST_HASH_V3 && input.campaignManifestHash === STAYOPTI_DORMANT_T5_CAMPAIGN_MANIFEST_HASH_V3;
  return Object.freeze({
    allowed: false as const,
    status: "DORMANT_NOT_AUTHORIZED" as const,
    gateClassification: "DORMANT_DIAGNOSTIC_ONLY" as const,
    failureClassification: matchesRevokedSeal ? "AUTHORIZATION_REVOKED_OR_EXECUTION_HEAD_MISMATCH" as const : "AUTHORIZATION_REVOKED_OR_EXECUTION_HEAD_MISMATCH" as const,
    remainingReachable: false as const,
    automaticGoldenAdmission: false as const,
  });
}

export function assertManualMarketLifecycleTransitionV3(from: StayOptiManualMarketLifecycleV3, to: StayOptiManualMarketLifecycleV3, explicitDecisionGoldenAdmission: boolean) {
  const allowed: Readonly<Record<StayOptiManualMarketLifecycleV3, readonly StayOptiManualMarketLifecycleV3[]>> = {
    DRAFT: ["CAPTURE_IN_PROGRESS", "REJECTED"],
    CAPTURE_IN_PROGRESS: ["CAPTURE_COMPLETE", "DIAGNOSTIC_ONLY", "REJECTED"],
    CAPTURE_COMPLETE: ["DIAGNOSTIC_ONLY", "ELIGIBLE_FOR_BLIND_JUDGMENT", "REJECTED"],
    DIAGNOSTIC_ONLY: ["REJECTED"],
    ELIGIBLE_FOR_BLIND_JUDGMENT: ["BLIND_JUDGMENT_RECORDED", "REJECTED"],
    BLIND_JUDGMENT_RECORDED: ["ELIGIBLE_FOR_DECISION_GOLDEN_REVIEW", "REJECTED"],
    ELIGIBLE_FOR_DECISION_GOLDEN_REVIEW: explicitDecisionGoldenAdmission ? ["DECISION_GOLDEN_ADMITTED", "REJECTED"] : ["REJECTED"],
    DECISION_GOLDEN_ADMITTED: [],
    REJECTED: [],
  };
  if (!allowed[from].includes(to)) throw new Error(to === "DECISION_GOLDEN_ADMITTED" ? "MANUAL_DECISION_GOLDEN_EXPLICIT_ADMISSION_REQUIRED" : "MANUAL_CAPTURE_LIFECYCLE_TRANSITION_REJECTED");
  return to;
}

export function renderManualMarketCaptureInterfaceHtmlV3() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>StayOpti private manual market capture</title><style>body{font:15px system-ui;max-width:1000px;margin:2rem auto;padding:0 1rem;color:#17202a}fieldset{margin:1rem 0;padding:1rem}label{display:block;margin:.5rem 0}input,textarea,select{width:100%;box-sizing:border-box;padding:.5rem}button{margin:.5rem .5rem .5rem 0;padding:.6rem}.warning{background:#fff4cc;padding:1rem}</style></head><body><h1>Private manual public-market capture</h1><p class="warning">Offline only. Use one logged-out consumer surface, identical trip configuration, 5–8 alternatives, complete pre-checkout prices, and freeze the selection before blind judgment. Private proof is encrypted separately and is never exported here.</p><fieldset><legend>Session JSON</legend><label>Resume a draft<input id="resume" type="file" accept="application/json"></label><textarea id="draft" rows="28" spellcheck="false"></textarea></fieldset><div id="issues" aria-live="polite"></div><button id="validate">Validate locally</button><button id="save">Save draft</button><script>"use strict";const template={captureVersion:"${STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3}",captureId:"MANUAL_CAPTURE_001",lifecycle:"DRAFT",destinationBucket:"",checkin:"",checkout:"",adults:2,childrenAges:[],rooms:1,currency:"EUR",budgetMinorUnits:0,preferenceProfile:"",hardConstraints:[],consumerSurfaceClass:"",loggedOut:true,membershipDiscountApplied:false,personalizedDiscountApplied:false,collectionWindowStart:"",collectionWindowEnd:"",selectionFrozenBeforeJudgment:true,alternatives:[]};const area=document.getElementById("draft"),issues=document.getElementById("issues");area.value=JSON.stringify(template,null,2);document.getElementById("resume").addEventListener("change",async e=>{const f=e.target.files[0];if(f)area.value=await f.text()});document.getElementById("validate").addEventListener("click",()=>{try{const d=JSON.parse(area.value);const m=[];if(!Array.isArray(d.alternatives)||d.alternatives.length<5||d.alternatives.length>8)m.push("Exactly 5–8 alternatives are required.");if(d.loggedOut!==true)m.push("Logged-out collection is required.");if(d.selectionFrozenBeforeJudgment!==true)m.push("Selection must be frozen before judgment.");issues.textContent=m.length?m.join(" "):"Local structural precheck passed; run the repository validator before sealing."}catch{issues.textContent="Invalid JSON."}});document.getElementById("save").addEventListener("click",()=>{let parsed;try{parsed=JSON.parse(area.value)}catch{issues.textContent="Invalid JSON.";return}const blob=new Blob([JSON.stringify(parsed,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="manual-market-capture-draft.json";a.click();URL.revokeObjectURL(a.href)});</script></body></html>`;
  if (/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/i.test(html)) throw new Error("MANUAL_CAPTURE_INTERFACE_NETWORK_OR_PERSISTENCE_REJECTED");
  return html;
}

export const STAYOPTI_MANUAL_MARKET_T3_CLASSIFICATION_V3 = "DIAGNOSTIC_ONLY" as const;
export const STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3 = 0 as const;
export const STAYOPTI_MANUAL_MARKET_CREDENTIALS_LOADED_V3 = false as const;
export const STAYOPTI_MANUAL_MARKET_LIVE_BOOKABLE_GOLDEN_AVAILABLE_V3 = false as const;
