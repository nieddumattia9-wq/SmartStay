import assert from "node:assert/strict";
import test from "node:test";
import {
  STAYOPTI_DORMANT_T5_CAMPAIGN_MANIFEST_HASH_V3,
  STAYOPTI_DORMANT_T5_CANARY_MANIFEST_HASH_V3,
  STAYOPTI_DORMANT_T5_EXECUTION_HEAD_V3,
  STAYOPTI_DORMANT_T5_RUNNER_BUNDLE_HASH_V3,
  STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3,
  STAYOPTI_MANUAL_MARKET_LIVE_BOOKABLE_GOLDEN_AVAILABLE_V3,
  STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3,
  STAYOPTI_MANUAL_MARKET_T3_CLASSIFICATION_V3,
  assertManualMarketLifecycleTransitionV3,
  classifyDormantSerpApiT5AuthorizationV3,
  createManualMarketBlindCapsuleV3,
  createManualMarketProviderNeutralSnapshotV3,
  createManualMarketSharedEvidenceV3,
  encryptManualMarketPrivateEvidenceV3,
  fingerprintManualMarketCaptureV3,
  markManualMarketDecisionRevealedV3,
  normalizeManualMarketUnknownTextV3,
  recordManualMarketBlindJudgmentV3,
  renderManualMarketCaptureInterfaceHtmlV3,
  validateManualMarketCaptureV3,
  verifyManualMarketPrivateEvidenceV3,
  type StayOptiManualMarketCaptureV3,
  type StayOptiManualMarketJudgmentV3,
  type StayOptiManualMarketPriceV3,
} from "../../src/engine-v3/evaluation/manualPublicMarketDecisionGoldenCaptureV3";

const syntheticProtector = Object.freeze({
  protectionClass: "SYNTHETIC_TEST_ONLY" as const,
  protectDataKey(value: string) { return `SYNTHETIC.KEY.${value}`; },
  unprotectDataKey(value: string) {
    if (!value.startsWith("SYNTHETIC.KEY.")) throw new Error("SYNTHETIC_KEY_INVALID");
    return value.slice("SYNTHETIC.KEY.".length);
  },
});

function price(amount: number): StayOptiManualMarketPriceV3 {
  return {
    semantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE",
    amount,
    currency: "EUR",
    stayTotal: true,
    taxInclusion: "UNKNOWN",
    payNowAmount: null,
    payAtPropertyAmount: null,
    observedAt: "2026-09-02T10:00:00.000Z",
    availabilityObserved: true,
    precheckoutPresented: true,
    purchaseCompleted: false,
    bookingConfirmed: false,
    exactBookable: false,
    verifiedCheckoutTotal: false,
    personalizedDiscount: false,
    provenance: "MANUAL_PUBLIC_CONSUMER_OBSERVATION",
    reliability: "DIRECT_PRECHECKOUT_OBSERVATION",
    missingness: ["TAX_SPLIT_UNKNOWN"],
  };
}

function fixture(count = 5): StayOptiManualMarketCaptureV3 {
  return {
    captureVersion: STAYOPTI_MANUAL_MARKET_CAPTURE_VERSION_V3,
    captureId: "MANUAL_CAPTURE_001",
    lifecycle: "CAPTURE_COMPLETE",
    destinationBucket: "EU_CITY_IT_01",
    checkin: "2026-10-10",
    checkout: "2026-10-12",
    adults: 2,
    childrenAges: [],
    rooms: 1,
    currency: "EUR",
    budgetMinorUnits: 120000,
    preferenceProfile: "BALANCED",
    hardConstraints: ["ONE_ROOM"],
    consumerSurfaceClass: "PUBLIC_CONSUMER_WEB_LOGGED_OUT",
    loggedOut: true,
    membershipDiscountApplied: false,
    personalizedDiscountApplied: false,
    collectionWindowStart: "2026-09-02T10:00:00.000Z",
    collectionWindowEnd: "2026-09-02T10:08:00.000Z",
    selectionFrozenBeforeJudgment: true,
    alternatives: Array.from({ length: count }, (_, index) => ({
      localCaptureId: `MANUAL_ALT_${String(index + 1).padStart(2, "0")}`,
      privateRealName: `Private property ${index + 1}`,
      privateSourceUrl: `https://consumer.invalid/property/${index + 1}`,
      privateScreenshotRefs: [`PRIVATE_SCREEN_${index + 1}`],
      consumerSurfaceClass: "PUBLIC_CONSUMER_WEB_LOGGED_OUT",
      originalOrder: index + 1,
      sponsored: index === 0,
      guestConfigurationFingerprint: "2||1",
      price: price(70000 + index * 5000),
      rating: 8.1 + index * 0.1,
      ratingScale: 10,
      reviewCount: 300 + index,
      distanceMeters: 500 + index * 100,
      locationEvidence: null,
      accommodationCategory: "HOTEL",
      roomEvidence: "DOUBLE_ROOM",
      mealPlanEvidence: "ROOM_ONLY",
      cancellationEvidence: "FREE_CANCELLATION_UNTIL_SYNTHETIC_DAY",
      refundabilityEvidence: "REFUNDABLE_UNTIL_SYNTHETIC_DAY",
      amenityEvidence: ["WIFI"],
      availabilityEvidence: "OBSERVED_AVAILABLE",
      missingness: ["CANCELLATION_DETAIL_UNKNOWN"],
      detailCoverage: ["PRICE", "RATING", "REVIEWS", "DISTANCE", "ROOM", "AMENITIES"],
    })),
  };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function codes(capture: StayOptiManualMarketCaptureV3) { return validateManualMarketCaptureV3(capture).issues.map((issue) => issue.code); }

test("old SerpApi T5 authorization is explicitly revoked", () => {
  assert.deepEqual(classifyDormantSerpApiT5AuthorizationV3({ executionHead: STAYOPTI_DORMANT_T5_EXECUTION_HEAD_V3, runnerBundleHash: STAYOPTI_DORMANT_T5_RUNNER_BUNDLE_HASH_V3, canaryManifestHash: STAYOPTI_DORMANT_T5_CANARY_MANIFEST_HASH_V3, campaignManifestHash: STAYOPTI_DORMANT_T5_CAMPAIGN_MANIFEST_HASH_V3 }), {
    allowed: false, status: "DORMANT_NOT_AUTHORIZED", gateClassification: "DORMANT_DIAGNOSTIC_ONLY", failureClassification: "AUTHORIZATION_REVOKED_OR_EXECUTION_HEAD_MISMATCH", remainingReachable: false, automaticGoldenAdmission: false,
  });
});
test("changed head is also rejected fail-closed", () => assert.equal(classifyDormantSerpApiT5AuthorizationV3({ executionHead: "f".repeat(40), runnerBundleHash: STAYOPTI_DORMANT_T5_RUNNER_BUNDLE_HASH_V3, canaryManifestHash: STAYOPTI_DORMANT_T5_CANARY_MANIFEST_HASH_V3, campaignManifestHash: STAYOPTI_DORMANT_T5_CAMPAIGN_MANIFEST_HASH_V3 }).allowed, false));
test("T5A declares zero network", () => assert.equal(STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3, 0));
test("valid five-alternative capture is eligible", () => assert.equal(validateManualMarketCaptureV3(fixture()).lifecycle, "ELIGIBLE_FOR_BLIND_JUDGMENT"));
test("fewer than five alternatives fail closed", () => assert.ok(codes(fixture(4)).includes("MANUAL_CAPTURE_TOO_FEW_ALTERNATIVES")));
test("more than eight alternatives are rejected", () => assert.ok(codes(fixture(9)).includes("MANUAL_CAPTURE_TOO_MANY_ALTERNATIVES")));
test("mixed consumer surfaces are rejected", () => { const value = clone(fixture()); value.alternatives[1].consumerSurfaceClass = "OTHER"; assert.ok(codes(value).includes("MANUAL_CAPTURE_MIXED_CONSUMER_SURFACE")); });
test("mixed currencies are rejected", () => { const value = clone(fixture()); value.alternatives[1].price!.currency = "USD"; assert.ok(codes(value).includes("MANUAL_CAPTURE_CURRENCY_MISMATCH")); });
test("guest configuration mismatch is rejected", () => { const value = clone(fixture()); value.alternatives[1].guestConfigurationFingerprint = "1||1"; assert.ok(codes(value).includes("MANUAL_CAPTURE_GUEST_CONFIGURATION_MISMATCH")); });
test("personalized capture context is rejected", () => { const value = clone(fixture()); value.personalizedDiscountApplied = true as false; assert.ok(codes(value).includes("MANUAL_CAPTURE_PERSONALIZED_CONTEXT_REJECTED")); });
test("personalized price is rejected", () => { const value = clone(fixture()); value.alternatives[1].price!.personalizedDiscount = true as false; assert.ok(codes(value).includes("MANUAL_CAPTURE_PRICE_OVERCLAIM_REJECTED")); });
test("missing price becomes diagnostic only", () => { const value = clone(fixture()); value.alternatives[1].price = null; assert.equal(validateManualMarketCaptureV3(value).lifecycle, "DIAGNOSTIC_ONLY"); });
test("missing availability becomes diagnostic only", () => { const value = clone(fixture()); value.alternatives[1].availabilityEvidence = "UNKNOWN"; assert.ok(codes(value).includes("MANUAL_CAPTURE_AVAILABILITY_REQUIRED")); });
test("missingness is preserved in snapshot", () => assert.deepEqual(createManualMarketProviderNeutralSnapshotV3(fixture()).alternatives[0].missingness, ["CANCELLATION_DETAIL_UNKNOWN"]));
test("asymmetric detail is audit-only and excluded", () => { const value = clone(fixture()); value.alternatives[1].detailCoverage = [...value.alternatives[1].detailCoverage, "SINGLE_ITEM_DETAIL"]; const result = validateManualMarketCaptureV3(value); assert.equal(result.valid, true); assert.ok(result.excludedDecisionFeatures.includes("asymmetricDetail")); });
test("precheckout price never becomes exact", () => { const snapshot = createManualMarketProviderNeutralSnapshotV3(fixture()); assert.equal(snapshot.alternatives.every((item) => !item.price.exactBookable && !item.price.verifiedCheckoutTotal), true); });
test("purchase and booking remain false", () => { const snapshot = createManualMarketProviderNeutralSnapshotV3(fixture()); assert.equal(snapshot.alternatives.every((item) => !item.price.purchaseCompleted && !item.price.bookingConfirmed), true); });
test("live-bookable Golden is unreachable", () => assert.equal(STAYOPTI_MANUAL_MARKET_LIVE_BOOKABLE_GOLDEN_AVAILABLE_V3, false));
test("snapshot never admits Golden automatically", () => assert.equal(createManualMarketProviderNeutralSnapshotV3(fixture()).automaticGoldenAdmission, false));
test("private evidence is AES-GCM encrypted", () => { const envelope = encryptManualMarketPrivateEvidenceV3({ captureId: "MANUAL_CAPTURE_001", evidenceKind: "SCREENSHOT", plaintext: "synthetic screenshot bytes", capturedAt: "2026-09-02T10:00:00.000Z", disposition: "PROCESSED_SUCCESS", keyProtector: syntheticProtector }); assert.equal(envelope.encryption, "AES_256_GCM"); assert.doesNotMatch(envelope.ciphertextBase64, /synthetic screenshot/); });
test("private evidence roundtrip is authenticated", () => { const envelope = encryptManualMarketPrivateEvidenceV3({ captureId: "MANUAL_CAPTURE_001", evidenceKind: "SOURCE_URL", plaintext: "https://consumer.invalid/private", capturedAt: "2026-09-02T10:00:00.000Z", disposition: "PROCESSED_SUCCESS", keyProtector: syntheticProtector }); assert.equal(verifyManualMarketPrivateEvidenceV3(envelope, syntheticProtector), "https://consumer.invalid/private"); });
test("private evidence tampering is rejected", () => { const envelope = encryptManualMarketPrivateEvidenceV3({ captureId: "MANUAL_CAPTURE_001", evidenceKind: "PROPERTY_NAME", plaintext: "private name", capturedAt: "2026-09-02T10:00:00.000Z", disposition: "PROCESSED_SUCCESS", keyProtector: syntheticProtector }); assert.throws(() => verifyManualMarketPrivateEvidenceV3({ ...envelope, ciphertextBase64: `${envelope.ciphertextBase64.slice(0, -2)}AA` }, syntheticProtector)); });
test("shared evidence excludes screenshot and URL", () => { const { capsule } = createManualMarketBlindCapsuleV3(fixture(), "SYNTHETIC_PRIVATE_BATCH_KEY_001"); const serialized = JSON.stringify(createManualMarketSharedEvidenceV3(fixture(), capsule)); assert.doesNotMatch(serialized, /consumer\.invalid|PRIVATE_SCREEN|Private property/); });
test("blind capsule hides source name rank and sponsorship", () => { const serialized = JSON.stringify(createManualMarketBlindCapsuleV3(fixture(), "SYNTHETIC_PRIVATE_BATCH_KEY_001").capsule); assert.doesNotMatch(serialized, /consumerSurface|privateRealName|originalOrder|sponsored|Private property|consumer\.invalid/i); });
test("fingerprint is deterministic across key ordering", () => { const first = fixture(); const second = JSON.parse(JSON.stringify(first)) as StayOptiManualMarketCaptureV3; assert.equal(fingerprintManualMarketCaptureV3(first), fingerprintManualMarketCaptureV3(second)); });
test("provider order does not change provider-neutral snapshot", () => { const first = fixture(); const second = { ...clone(first), alternatives: [...first.alternatives].reverse() }; assert.deepEqual(createManualMarketProviderNeutralSnapshotV3(first).alternatives, createManualMarketProviderNeutralSnapshotV3(second).alternatives); });
test("blind judgment must precede decision reveal", () => { const { privateLedger } = createManualMarketBlindCapsuleV3(fixture(), "SYNTHETIC_PRIVATE_BATCH_KEY_001"); assert.throws(() => markManualMarketDecisionRevealedV3(privateLedger), /BEFORE_BLIND_JUDGMENT/); });
test("valid judgment enables later decision reveal", () => { const { capsule, privateLedger } = createManualMarketBlindCapsuleV3(fixture(), "SYNTHETIC_PRIVATE_BATCH_KEY_001"); const judgment: StayOptiManualMarketJudgmentV3 = { judgmentVersion: "stayopti.v3.manual-public-market-blind-judgment@1", judgmentId: "JUDGMENT_001", capsuleId: capsule.capsuleId, evaluatorPseudonym: "EVALUATOR_001", selectedAlternativeId: capsule.alternatives[0].blindAlternativeId, acceptableAlternativeIds: [], unacceptableAlternativeIds: [], insufficientEvidence: false, confidence: 4, reasonCodes: ["BETTER_TOTAL_VALUE"], createdAtBucket: "2026-09" }; assert.equal(markManualMarketDecisionRevealedV3(recordManualMarketBlindJudgmentV3(privateLedger, judgment)).decisionRevealed, true); });
test("T3 sample remains diagnostic-only", () => assert.equal(STAYOPTI_MANUAL_MARKET_T3_CLASSIFICATION_V3, "DIAGNOSTIC_ONLY"));
test("explicit Golden admission is required", () => assert.throws(() => assertManualMarketLifecycleTransitionV3("ELIGIBLE_FOR_DECISION_GOLDEN_REVIEW", "DECISION_GOLDEN_ADMITTED", false), /EXPLICIT_ADMISSION_REQUIRED/));
test("explicit future action can perform Decision Golden admission", () => assert.equal(assertManualMarketLifecycleTransitionV3("ELIGIBLE_FOR_DECISION_GOLDEN_REVIEW", "DECISION_GOLDEN_ADMITTED", true), "DECISION_GOLDEN_ADMITTED"));
test("interface is offline and resumable", () => { const html = renderManualMarketCaptureInterfaceHtmlV3(); assert.match(html, /type="file"/); assert.match(html, /Save draft/); assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/i); });
test("interface does not expose a Golden admission control", () => assert.doesNotMatch(renderManualMarketCaptureInterfaceHtmlV3(), /DECISION_GOLDEN_ADMITTED/));
test("non-finite prices are rejected", () => { const value = fixture(); value.alternatives[0].price!.amount = Number.NaN; assert.ok(codes(value).includes("MANUAL_CAPTURE_NON_FINITE_NUMBER")); });
test("duplicate alternatives are rejected", () => { const value = clone(fixture()); value.alternatives[1].localCaptureId = value.alternatives[0].localCaptureId; assert.ok(codes(value).includes("MANUAL_CAPTURE_DUPLICATE_ALTERNATIVE")); });
test("unfrozen selection is rejected", () => { const value = clone(fixture()); value.selectionFrozenBeforeJudgment = false as true; assert.ok(codes(value).includes("MANUAL_CAPTURE_SELECTION_NOT_FROZEN")); });
test("private source changes do not change decision fingerprint", () => { const first = fixture(); const second = clone(first); second.alternatives[0].privateRealName = "Different private name"; second.alternatives[0].privateSourceUrl = "https://another.invalid"; second.alternatives[0].sponsored = false; second.alternatives[0].originalOrder = 99; assert.equal(fingerprintManualMarketCaptureV3(first), fingerprintManualMarketCaptureV3(second)); });
test("blind labels are deterministic", () => { const first = createManualMarketBlindCapsuleV3(fixture(), "SYNTHETIC_PRIVATE_BATCH_KEY_001"); const second = createManualMarketBlindCapsuleV3(fixture(), "SYNTHETIC_PRIVATE_BATCH_KEY_001"); assert.equal(first.capsule.capsuleFingerprint, second.capsule.capsuleFingerprint); });
test("blind labels do not leak original order", () => { const first = fixture(); const second = clone(first); second.alternatives.forEach((alternative, index) => { alternative.originalOrder = 50 - index; }); assert.deepEqual(createManualMarketBlindCapsuleV3(first, "SYNTHETIC_PRIVATE_BATCH_KEY_001").capsule.alternatives, createManualMarketBlindCapsuleV3(second, "SYNTHETIC_PRIVATE_BATCH_KEY_001").capsule.alternatives); });
test("blind capsule requires a caller key", () => assert.throws(() => createManualMarketBlindCapsuleV3(fixture(), "short"), /PRIVATE_BATCH_KEY_REQUIRED/));
test("declared fingerprint mismatch is rejected", () => { const value = fixture(); value.declaredFingerprint = "0".repeat(64); assert.ok(codes(value).includes("MANUAL_CAPTURE_FINGERPRINT_MISMATCH")); });
test("UNKNOWN text is normalized case-insensitively and remains missing evidence", () => {
  assert.equal(normalizeManualMarketUnknownTextV3(" unknown "), null);
  const value = clone(fixture());
  value.alternatives[4].mealPlanEvidence = "unknown";
  const result = validateManualMarketCaptureV3(value);
  assert.equal(result.lifecycle, "DIAGNOSTIC_ONLY");
  assert.ok(result.issues.some((issue) => issue.path === "$.alternatives[4].mealPlanEvidence" && issue.code === "MANUAL_CAPTURE_COMPARABLE_FIELD_MISSING"));
});
test("known payment components must reconcile exactly to the displayed total", () => {
  const value = clone(fixture());
  value.alternatives[4].price!.payNowAmount = 9990;
  value.alternatives[4].price!.payAtPropertyAmount = 0;
  value.alternatives[4].price!.amount = 10000;
  assert.ok(codes(value).includes("MANUAL_CAPTURE_PAYMENT_SPLIT_MISMATCH"));
  assert.equal(validateManualMarketCaptureV3(value).lifecycle, "DIAGNOSTIC_ONLY");
});
test("verified textual position is preserved without fabricating a distance", () => {
  const value = clone(fixture());
  value.alternatives[4].distanceMeters = null;
  value.alternatives[4].locationEvidence = { kind: "VERIFIED_TEXTUAL_POSITION", text: "quartiere centrale vicino al museo civico" };
  const validation = validateManualMarketCaptureV3(value);
  assert.equal(validation.valid, true);
  const snapshot = createManualMarketProviderNeutralSnapshotV3(value);
  assert.ok(snapshot.alternatives.some((alternative) => alternative.distanceMeters === null && alternative.locationEvidence?.kind === "VERIFIED_TEXTUAL_POSITION"));
});
test("implausible calendar day in a textual condition is diagnostic", () => {
  const value = clone(fixture());
  value.alternatives[4].refundabilityEvidence = "RIMBORSABILE FINO AL 99 OTT";
  assert.ok(codes(value).includes("MANUAL_CAPTURE_TEXT_DATE_IMPLAUSIBLE"));
});
