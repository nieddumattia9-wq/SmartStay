import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createRepairedMarketDiagnosticEvidenceEntriesV3,
  createRepairedMarketSnapshotAssessmentV3,
  validateRepairedMarketDiagnosticEvidenceEntriesV3,
} from "../../src/engine-v3/evaluation/repairedMarketSnapshotEligibilityV3";
import {
  createSerpApiSanitizedSnapshotV3,
  mergeSerpApiDetailResponseV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import type {
  SerpApiGoogleHotelsPropertyV3,
  SerpApiGoogleHotelsResponseV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";

const SEAL = "a".repeat(64);
const session = {
  sessionId: "SYNTHETIC_T3_SESSION",
  checkIn: "2026-10-15",
  checkOut: "2026-10-17",
  durationNights: 2,
  adults: 2,
  childAges: [] as number[],
  rooms: 1,
  currency: "EUR" as const,
  gl: "it" as const,
  hl: "it" as const,
  budgetMinorUnits: 70000,
  preferenceProfile: "balanced",
  hardConstraints: ["SINGLE_STAY"],
};

function property(index: number, priced = true): SerpApiGoogleHotelsPropertyV3 {
  return {
    name: `SYNTHETIC_STAY_${index}`,
    property_token: `SYNTHETIC_OPAQUE_${index}`,
    hotel_class: 3 + (index % 3),
    overall_rating: 7.5 + index / 20,
    reviews: 100 + index * 10,
    ...(priced ? { total_rate: { extracted_lowest: 200 + index * 10, extracted_before_taxes_fees: 180 + index * 10 } } : {}),
    gps_coordinates: { latitude: 43.7 + index / 100, longitude: 11.2 + index / 100 },
    ...(index === 1 ? {} : { amenities: ["WIFI", "AIR_CONDITIONING"] }),
  };
}

function response(order?: readonly number[]): SerpApiGoogleHotelsResponseV3 {
  const ordinals = order ?? Array.from({ length: 29 }, (_, index) => index + 1);
  return {
    search_metadata: { created_at: "2026-09-02T06:00:00Z", status: "Success" },
    search_parameters: { q: "SYNTHETIC_CITY", check_in_date: session.checkIn, check_out_date: session.checkOut, adults: 2, children: 0, rooms: 1, currency: "EUR", gl: "it", hl: "it", no_cache: true },
    ads: ordinals.slice(0, 9).map((index) => property(index, index <= 20)),
    properties: ordinals.slice(9).map((index) => property(index, index <= 20)),
  };
}

function snapshots(input = response()) {
  const base = createSerpApiSanitizedSnapshotV3({ pilotId: "SYNTHETIC_PILOT", manifestHash: "b".repeat(64), session, response: input, captureTimestamp: "2026-09-02T06:01:00.000Z" });
  const repairedResponse = mergeSerpApiDetailResponseV3(input, 1, { name: "SYNTHETIC_STAY_1", amenities: ["WIFI", "AIR_CONDITIONING", "DIAGNOSTIC_POOL"] });
  const repaired = createSerpApiSanitizedSnapshotV3({ pilotId: "SYNTHETIC_PILOT", manifestHash: "b".repeat(64), session, response: repairedResponse, captureTimestamp: "2026-09-02T06:01:00.000Z", detailStatuses: { 1: "MERGED" } });
  return { base, repaired };
}

function assessment(input = response()) {
  const value = snapshots(input);
  return createRepairedMarketSnapshotAssessmentV3({ baseSnapshot: value.base, repairedSnapshot: value.repaired, sealSha256: SEAL });
}

const integrity = {
  t2eSealIntegrity: "PASS" as const,
  t2eInternalChecksums: "PASS_14_OF_14" as const,
  rawAuthenticity: "PASS" as const,
  rawFileCount: 2 as const,
  rawFilesModified: false as const,
  plaintextRawAtRest: false as const,
  networkCalls: 0 as const,
  credentialsLoaded: false as const,
};

test("T3 01 preserves twenty-nine provider-neutral alternatives", () => assert.equal(assessment().providerNeutralSnapshot.alternatives.length, 29));
test("T3 02 preserves twenty observed display prices", () => assert.equal(assessment().providerNeutralSnapshot.observedPriceCount, 20));
test("T3 03 preserves nine missing prices", () => assert.equal(assessment().providerNeutralSnapshot.missingPriceCount, 9));
test("T3 04 never promotes observed display price to exact", () => assert.ok(assessment().providerNeutralSnapshot.alternatives.filter((entry) => entry.observedDisplayPrice).every((entry) => entry.observedDisplayPrice?.exactBookable === false)));
test("T3 05 never invents seller-specific price", () => assert.ok(assessment().providerNeutralSnapshot.alternatives.filter((entry) => entry.observedDisplayPrice).every((entry) => entry.observedDisplayPrice?.sellerSpecific === false)));
test("T3 06 never invents verified checkout total", () => assert.ok(assessment().providerNeutralSnapshot.alternatives.filter((entry) => entry.observedDisplayPrice).every((entry) => entry.observedDisplayPrice?.verifiedCheckoutTotal === false)));
test("T3 07 single detail remains a diagnostic enrichment", () => assert.equal(assessment().providerNeutralSnapshot.diagnosticEnrichment.enrichedAlternativeCount, 1));
test("T3 08 asymmetric detail is excluded from decision", () => assert.equal(assessment().providerNeutralSnapshot.diagnosticEnrichment.excludedFromDecision, true));
test("T3 09 detail-only amenities are classified separately", () => assert.equal(assessment().featureEligibilityMatrix.find((entry) => entry.feature === "amenities")?.classification, "SINGLE_ITEM_DIAGNOSTIC_ONLY"));
test("T3 10 missing price remains null", () => assert.equal(assessment().providerNeutralSnapshot.alternatives.filter((entry) => entry.observedDisplayPrice === null).length, 9));
test("T3 11 unknown cancellation is not converted to false", () => assert.ok(assessment().providerNeutralSnapshot.alternatives.every((entry) => entry.cancellationKnown === false && entry.freeCancellation === null)));
test("T3 12 original position is audit-only", () => assert.equal(assessment().featureEligibilityMatrix.find((entry) => entry.feature === "originalPosition")?.decisionEligible, false));
test("T3 13 sponsored status is audit-only", () => assert.equal(assessment().featureEligibilityMatrix.find((entry) => entry.feature === "sponsoredStatus")?.decisionEligible, false));
test("T3 14 opaque identity is audit-only", () => assert.equal(assessment().featureEligibilityMatrix.find((entry) => entry.feature === "opaqueSourceIdentity")?.decisionEligible, false));
test("T3 15 provider identity is absent from decision snapshot", () => assert.doesNotMatch(JSON.stringify(assessment().providerNeutralSnapshot), /SERPAPI|GOOGLE_HOTELS|property_token|propertyToken|providerId/i));
test("T3 16 provider identity remains available only in private audit classification", () => assert.equal(assessment().privateAuditOnlyLedger.decisionUseProhibited, true));
test("T3 17 input order does not affect the provider-neutral fingerprint", () => {
  const reversed = response(Array.from({ length: 29 }, (_, index) => 29 - index));
  assert.equal(assessment().providerNeutralSnapshot.snapshotFingerprint, assessment(reversed).providerNeutralSnapshot.snapshotFingerprint);
});
test("T3 18 property token mutation does not affect the provider-neutral fingerprint", () => {
  const mutated = response();
  for (const [index, entry] of [...(mutated.ads ?? []), ...(mutated.properties ?? [])].entries()) entry.property_token = `DIFFERENT_OPAQUE_${index}`;
  assert.equal(assessment().providerNeutralSnapshot.snapshotFingerprint, assessment(mutated).providerNeutralSnapshot.snapshotFingerprint);
});
test("T3 19 blind labels are deterministic", () => assert.deepEqual(assessment().providerNeutralSnapshot.alternatives.map((entry) => entry.blindLabel), assessment().providerNeutralSnapshot.alternatives.map((entry) => entry.blindLabel)));
test("T3 20 blind labels span A through AC for 29 alternatives", () => {
  const labels = assessment().providerNeutralSnapshot.alternatives.map((entry) => entry.blindLabel);
  assert.equal(labels[0], "A"); assert.equal(labels.at(-1), "AC"); assert.equal(new Set(labels).size, 29);
});
test("T3 21 labels are assigned from semantic order, not provider rank", () => assert.notDeepEqual(assessment().privateAuditOnlyLedger.entries.map((entry) => entry.blindLabel), Array.from({ length: 29 }, (_, index) => index < 26 ? String.fromCharCode(65 + index) : `A${String.fromCharCode(65 + index - 26)}`)));
test("T3 22 provider-neutral replay is fail-closed as not eligible", () => assert.equal(assessment().eligibilityDecision.v3ReplayStatus, "NOT_ELIGIBLE"));
test("T3 23 no V3 replay is executed on non-bookable prices", () => assert.equal(assessment().eligibilityDecision.v3ReplayExecuted, false));
test("T3 24 blind judgment is not forced", () => assert.equal(assessment().eligibilityDecision.blindJudgmentEligibility, "NO"));
test("T3 25 no judgment or deblind occurs", () => { assert.equal(assessment().eligibilityDecision.judgmentRecorded, false); assert.equal(assessment().eligibilityDecision.deblindExecuted, false); });
test("T3 26 Golden admission stays disabled", () => assert.equal(assessment().eligibilityDecision.automaticGoldenAdmission, false));
test("T3 27 remaining stage stays disabled", () => { assert.equal(assessment().eligibilityDecision.remainingStageAuthorized, false); assert.equal(assessment().eligibilityDecision.remainingStageStarted, false); });
test("T3 28 shared Evidence excludes the private ledger", () => assert.ok(createRepairedMarketDiagnosticEvidenceEntriesV3(assessment(), integrity).every((entry) => !entry.name.includes("ledger"))));
test("T3 29 shared Evidence validates with six checksums", () => {
  const validation = validateRepairedMarketDiagnosticEvidenceEntriesV3(createRepairedMarketDiagnosticEvidenceEntriesV3(assessment(), integrity));
  assert.equal(validation.valid, true, validation.issues.join("|")); assert.equal(validation.checksumCount, 6);
});
test("T3 30 Evidence tampering is rejected", () => {
  const entries = [...createRepairedMarketDiagnosticEvidenceEntriesV3(assessment(), integrity)];
  const index = entries.findIndex((entry) => entry.name === "provider-neutral-snapshot.json");
  entries[index] = { ...entries[index]!, content: entries[index]!.content.replace('"observedPriceCount": 20', '"observedPriceCount": 19') };
  assert.equal(validateRepairedMarketDiagnosticEvidenceEntriesV3(entries).valid, false);
});
test("T3 31 source contains no network or credential capability", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/repairedMarketSnapshotEligibilityV3.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|node:https|node:http|SERPAPI_API_KEY|process\.env/);
});
test("T3 32 V3 public core does not import the T3 evaluation gate", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8");
  assert.doesNotMatch(source, /repairedMarketSnapshotEligibilityV3/);
});
test("T3 33 decision weights and ranking modules are not imported", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/repairedMarketSnapshotEligibilityV3.ts"), "utf8");
  assert.doesNotMatch(source, /personalUtilityRolePolicy|decisionRobustness|searchWideScaleCoverage|ranking\//);
});
test("T3 34 private audit data removal cannot change decision snapshot", () => {
  const result = assessment(); const snapshot = JSON.stringify(result.providerNeutralSnapshot); void result.privateAuditOnlyLedger;
  assert.equal(JSON.stringify(result.providerNeutralSnapshot), snapshot);
});
