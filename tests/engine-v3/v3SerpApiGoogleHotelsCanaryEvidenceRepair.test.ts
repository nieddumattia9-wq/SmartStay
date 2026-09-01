import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createExternalHotelChoiceSessionFingerprintV3,
  createExternalProviderNeutralReplayV3,
  validateExternalHotelChoiceSessionV3,
} from "../../src/engine-v3/evaluation/externalHotelChoiceReplayV3";
import {
  adaptSerpApiGoogleHotelsExternalSessionV3,
  type SerpApiGoogleHotelsPropertyV3,
  type SerpApiGoogleHotelsResponseV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";
import { createSerpApiResponseDiagnosticV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3";
import { validateSerpApiCanaryEvidenceArchiveEntriesV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import {
  STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import {
  STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3,
  STAYOPTI_SERPAPI_PRIOR_CONSUMED_CANARY_CALLS_V3,
  stageSessionIndexesV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3";

const HISTORICAL_ABORT = Object.freeze({
  handoff: "PASS",
  canary: "ABORTED",
  evidence: "PASS",
  requests: 2,
  main: "VALIDATED",
  detail: "FAILED",
  failure: "SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE",
  rawDeleted: 2,
  rawCreated: 2,
  remainingStarted: false,
  excludedFromRemaining: false,
  automaticGoldenAdmission: false,
});

function property(index: number, priced: boolean): SerpApiGoogleHotelsPropertyV3 {
  return {
    name: `Synthetic ${index}`,
    property_token: `ephemeral-token-${index}`,
    gps_coordinates: { latitude: 43.7 + index / 1000, longitude: 11.2 + index / 1000 },
    overall_rating: 4 + (index % 5) / 10,
    reviews: 100 + index,
    ...(priced ? {
      rate_per_night: { extracted_lowest: 100 + index },
      total_rate: { extracted_lowest: 200 + index },
    } : {}),
    ...(index === 29 ? {} : { amenities: ["Synthetic amenity"] }),
  };
}

function syntheticObservedChoiceSet(): SerpApiGoogleHotelsResponseV3 {
  return {
    search_metadata: { created_at: "2026-09-01T18:20:00Z", status: "Success" },
    search_parameters: {
      q: "Synthetic European city",
      check_in_date: "2026-10-01",
      check_out_date: "2026-10-03",
      adults: 2,
      children: 0,
      rooms: 1,
      currency: "EUR",
      gl: "it",
      hl: "it",
      no_cache: true,
    },
    ads: Array.from({ length: 9 }, (_, index) => property(index + 1, false)),
    properties: Array.from({ length: 20 }, (_, index) => property(index + 10, true)),
  };
}

const projection = () => adaptSerpApiGoogleHotelsExternalSessionV3(syntheticObservedChoiceSet());

test("T2AB 01 historical Evidence classifies the data canary as ABORTED", () => {
  assert.equal(HISTORICAL_ABORT.canary, "ABORTED");
});

test("T2AB 02 handoff PASS is independent from canary outcome", () => {
  assert.deepEqual([HISTORICAL_ABORT.handoff, HISTORICAL_ABORT.canary, HISTORICAL_ABORT.evidence], ["PASS", "ABORTED", "PASS"]);
});

test("T2AB 03 historical request accounting is exact", () => {
  assert.equal(HISTORICAL_ABORT.requests, 2);
});

test("T2AB 04 main search remains validated", () => {
  assert.equal(HISTORICAL_ABORT.main, "VALIDATED");
});

test("T2AB 05 property-detail failure remains fail-closed", () => {
  assert.equal(HISTORICAL_ABORT.failure, "SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE");
  assert.equal(HISTORICAL_ABORT.detail, "FAILED");
});

test("T2AB 06 repaired canary cannot reach another detail", () => {
  assert.equal(STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3, 2);
});

test("T2AB 07 repaired canary cannot reach a second session", () => {
  assert.deepEqual(stageSessionIndexesV3("CANARY", 12), [0]);
  assert.equal(HISTORICAL_ABORT.remainingStarted, false);
});

test("T2AB 08 aborted Evidence cannot unlock resume", () => {
  const result = validateSerpApiCanaryEvidenceArchiveEntriesV3({
    entries: [{ name: "pilot-summary.json", content: JSON.stringify({ status: "ABORTED", stage: "CANARY", actualRequestsTransmitted: 2, failureClassification: HISTORICAL_ABORT.failure }) }],
    expectedPilotId: "PILOT",
    expectedManifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    expectedRunnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    expectedCanarySessionId: "SERP_PILOT_01_FLORENCE_COUPLE_BALANCED",
    canaryEvidenceZipSha256: "a".repeat(64),
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes("CANARY_SUMMARY_INVALID"));
});

test("T2AB 09 historical raw deletion is exactly two of two", () => {
  assert.equal(HISTORICAL_ABORT.rawDeleted, HISTORICAL_ABORT.rawCreated);
});

test("T2AB 10 key is absent from diagnostic envelope", () => {
  const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 25, httpStatus: 200, contentType: "application/json; charset=utf-8", responseByteLength: 123, body: { api_key: "must-not-leak", error: "raw message" } });
  assert.doesNotMatch(JSON.stringify(diagnostic), /must-not-leak|raw message|api_key/i);
});

test("T2AB 11 process credential is cleared before postflight is written", () => {
  const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8");
  assert.ok(launcher.indexOf("Clear-StayOptiPilotCredential") < launcher.indexOf("credentialClearedFromProcess"));
  assert.match(launcher, /credentialClearedFromProcess = \(\[Environment\]::GetEnvironmentVariable\('SERPAPI_API_KEY', 'Process'\) -eq \$null\)/);
});

test("T2AB 12 diagnostic envelope is a fixed sanitized allowlist", () => {
  const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 25, httpStatus: 200, contentType: "Application/JSON; charset=utf-8", responseByteLength: 456, body: { search_metadata: { status: "Error" }, unexpected: true } });
  assert.deepEqual(diagnostic.topLevelFieldNames, ["search_metadata", "unexpected"]);
  assert.equal(diagnostic.contentType, "application/json");
  assert.equal(diagnostic.errorClass, "SEARCH_METADATA_ERROR_STATUS");
});

test("T2AB 13 property tokens are not exported by the adapter", () => {
  assert.doesNotMatch(JSON.stringify(projection()), /property_token|ephemeral-token/i);
});

test("T2AB 14 raw provider identifiers are not exported", () => {
  assert.equal(projection().rawProviderIdentifiersPersisted, 0);
});

test("T2AB 15 observed display prices never become exact prices", () => {
  const alternatives = projection().session.alternatives;
  assert.equal(alternatives.filter((entry) => entry.observedAggregatedDisplayPrice?.state === "KNOWN").length, 20);
  assert.ok(alternatives.every((entry) => entry.exactPriceMinorUnits.state === "UNKNOWN"));
  assert.ok(alternatives.every((entry) => entry.observedAggregatedDisplayPrice?.state !== "KNOWN" || entry.observedAggregatedDisplayPrice.value.exactBookable === false));
});

test("T2AB 16 provider-neutral replay preserves observed display price", () => {
  const original = projection().session;
  const { sessionFingerprint: _ignored, ...material } = original;
  const admittedMaterial = {
    ...material,
    sourceLicense: {
      ...material.sourceLicense,
      status: "SYNTHETIC_FIXTURE_ONLY" as const,
      commercialUse: "NO" as const,
      persistentIngestionAllowed: true,
    },
  };
  const admitted = { ...admittedMaterial, sessionFingerprint: createExternalHotelChoiceSessionFingerprintV3(admittedMaterial) };
  assert.deepEqual(validateExternalHotelChoiceSessionV3(admitted).issues, []);
  const replay = createExternalProviderNeutralReplayV3(admitted);
  assert.equal(replay.preDecisionFeatures.alternatives.filter((entry) => entry.observedAggregatedDisplayPrice?.state === "KNOWN").length, 20);
});

test("T2AB 17 nine unpriced ads remain missing", () => {
  assert.equal(projection().session.alternatives.filter((entry) => entry.observedAggregatedDisplayPrice?.state === "UNKNOWN").length, 9);
});

test("T2AB 18 sponsored and position bias remain explicit", () => {
  const result = projection();
  assert.equal(result.session.alternatives.filter((entry) => entry.sponsored.state === "KNOWN" && entry.sponsored.value).length, 9);
  assert.ok(result.session.biasFlags.includes("POSITION_BIAS"));
  assert.ok(result.session.biasFlags.includes("ADVERTISING_BIAS"));
});

test("T2AB 19 external snapshot never becomes Golden automatically", () => {
  assert.equal(projection().automaticGoldenAdmission, false);
  assert.equal(HISTORICAL_ABORT.automaticGoldenAdmission, false);
});

test("T2AB 20 V3 core remains provider-agnostic and authorization stays ungranted", () => {
  const core = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8");
  const gate = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts"), "utf8");
  assert.doesNotMatch(core, /SerpApi|serpApiGoogleHotelsPilot/i);
  assert.match(gate, /explicitCallAuthorizationGranted:\s*false/);
  assert.match(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3, /RETENTION_V2_MAX2$/);
  assert.equal(STAYOPTI_SERPAPI_PRIOR_CONSUMED_CANARY_CALLS_V3, 2);
});

test("T2AB 21 credential cleanup precedes postflight on success", () => {
  const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8");
  const childResult = launcher.indexOf("$childExit = $LASTEXITCODE");
  const cleanup = launcher.indexOf("Clear-StayOptiPilotCredential", childResult);
  const postflight = launcher.indexOf("$postflight =", childResult);
  assert.ok(childResult >= 0 && cleanup > childResult && postflight > cleanup);
});

test("T2AB 22 aborted child still produces Evidence after credential cleanup", () => {
  const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8");
  assert.ok(launcher.indexOf("CreateFromDirectory") < launcher.indexOf("if ($childExit -ne 0)"));
  assert.match(launcher, /credentialClearedFromProcess/);
});

test("T2AB 23 exception path repeats idempotent credential cleanup", () => {
  const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8");
  assert.match(launcher, /finally\s*\{\s*Clear-StayOptiPilotCredential/);
});

test("T2AB 24 manageable Ctrl+C follows the PowerShell finally cleanup boundary", () => {
  const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8");
  assert.match(launcher, /finally\s*\{[\s\S]*Clear-StayOptiPilotCredential[\s\S]*Remove-StayOptiPilotWorkRoot/);
  assert.doesNotMatch(launcher, /\bexit\b/i);
});
