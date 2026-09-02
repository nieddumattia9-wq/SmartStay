import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
  STAYOPTI_T5_CAMPAIGN_MANIFEST_V3,
  STAYOPTI_T5_CANARY2_EVIDENCE_CONTRACT_V3,
  STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
  STAYOPTI_T5_CANARY2_MANIFEST_V3,
  STAYOPTI_T5_CANARY2_MAX_CALLS_V3,
  STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3,
  STAYOPTI_T5_REMAINING10_MANIFEST_HASH_V3,
  STAYOPTI_T5_REMAINING10_MANIFEST_V3,
  STAYOPTI_T5_REMAINING10_MAX_CALLS_V3,
  STAYOPTI_T5_REMAINING10_SESSION_INDEXES_V3,
  STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
  STAYOPTI_T5_SESSION_REGISTRY_V3,
  STAYOPTI_T5_SOURCE_SHA_V3,
  StayOptiT5Canary2RequestLedgerV3,
  createT5Canary2AuthorizationLiteralV3,
  createT5LimitedComparableSessionEvidenceV3,
  executeT5Canary2LimitedComparableCollectionV3,
  selectT5Canary2SessionIndexesV3,
  validateT5Canary2AuthorizationV3,
  validateT5EvidenceArtifactV3,
  type StayOptiT5Canary2AuthorizationV3,
  type StayOptiT5PrivateQuarantineV3,
} from "../../src/engine-v3/evaluation/serpApiLimitedComparableCollectionGateV3";
import {
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  type StayOptiSerpApiPilotRequestV3,
  type StayOptiSerpApiPilotTransportV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import { createSerpApiSanitizedSnapshotV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import type { SerpApiGoogleHotelsResponseV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";

const EXECUTION_HEAD = "1".repeat(40);
const RUNNER_HASH = "2".repeat(64);
const TEST_KEY = "SYNTHETIC_TEST_KEY_NOT_REAL";

function property(index: number, options: { missingPrice?: boolean; sponsored?: boolean; token?: string; name?: string } = {}) {
  const price = options.missingPrice ? {} : {
    rate_per_night: { extracted_lowest: 100 + index, extracted_before_taxes_fees: 100 + index },
    total_rate: { extracted_lowest: 200 + index, extracted_before_taxes_fees: 200 + index },
    prices: [{ source: `opaque-seller-${index}`, extracted_lowest: 200 + index }],
  };
  return {
    type: "hotel",
    name: options.name ?? `Synthetic property ${index}`,
    property_token: options.token ?? `temporary-property-token-${index}`,
    gps_coordinates: { latitude: 43 + index / 100, longitude: 11 + index / 100 },
    hotel_class: 3 + index % 2,
    overall_rating: 3.8 + index / 100,
    reviews: 100 + index,
    amenities: ["Wi-Fi", index % 2 === 0 ? "Pool" : "Breakfast"],
    free_cancellation: true,
    sponsored: options.sponsored ?? false,
    ...price,
  };
}

function responseFor(sessionIndex: number, options: { count?: number; missingPriceCount?: number; reverse?: boolean; mutateIdentity?: boolean; sponsoredAll?: boolean } = {}): SerpApiGoogleHotelsResponseV3 {
  const source = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex]!;
  const count = options.count ?? 10;
  const missingPriceCount = options.missingPriceCount ?? 1;
  const properties = Array.from({ length: count }, (_unused, index) => property(index + 1, {
    missingPrice: index >= count - missingPriceCount,
    token: options.mutateIdentity ? `changed-token-${index}` : undefined,
    name: options.mutateIdentity ? `Changed opaque name ${index}` : undefined,
    sponsored: options.sponsoredAll,
  }));
  if (options.reverse) properties.reverse();
  return {
    search_metadata: { created_at: "2026-09-02T13:00:00Z", processed_at: "2026-09-02T13:00:01Z", status: "Success" },
    search_parameters: {
      q: source.destination,
      check_in_date: source.checkIn,
      check_out_date: source.checkOut,
      adults: source.adults,
      children: source.childAges.length,
      rooms: source.rooms,
      currency: "EUR",
      gl: "it",
      hl: "it",
      no_cache: true,
    },
    properties,
  };
}

function authorization(overrides: Partial<StayOptiT5Canary2AuthorizationV3> = {}): StayOptiT5Canary2AuthorizationV3 {
  return {
    stage: "CANARY2",
    sourceSha: STAYOPTI_T5_SOURCE_SHA_V3,
    executionHead: EXECUTION_HEAD,
    campaignManifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    canary2ManifestHash: STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
    sessionRegistryHash: STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
    runnerBundleHash: RUNNER_HASH,
    literal: createT5Canary2AuthorizationLiteralV3({ executionHead: EXECUTION_HEAD, runnerBundleHash: RUNNER_HASH }),
    authorizationGrantedBySubsequentUserMessage: true,
    retentionAuthorized: true,
    ...overrides,
  };
}

function preflight(auth: StayOptiT5Canary2AuthorizationV3 | null = authorization()) {
  return validateT5Canary2AuthorizationV3({
    authorization: auth,
    observedSourceSha: STAYOPTI_T5_SOURCE_SHA_V3,
    observedExecutionHead: EXECUTION_HEAD,
    observedCampaignManifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    observedCanary2ManifestHash: STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
    observedSessionRegistryHash: STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
    observedRunnerBundleHash: RUNNER_HASH,
    workingTreeRelevantFilesMatch: true,
  });
}

function quarantine(options: { ready?: boolean; throwOnCapture?: boolean } = {}) {
  const captures: string[] = [];
  const successes: string[] = [];
  const value: StayOptiT5PrivateQuarantineV3 = {
    protectionReady: (options.ready ?? true) as true,
    capture(input) {
      if (options.throwOnCapture) throw new Error("T5_SYNTHETIC_QUARANTINE_FAILURE");
      captures.push(input.metadata.sessionReference);
      return { entryId: `RAWQ_TEST_${captures.length}`, envelopeFingerprint: "a".repeat(64) };
    },
    markProcessedSuccess(handle) { successes.push(handle.entryId); return handle; },
  };
  return { value, captures, successes };
}

function transport(options: { firstCount?: number; secondCount?: number; failFirst?: boolean } = {}) {
  const requests: StayOptiSerpApiPilotRequestV3[] = [];
  const value: StayOptiSerpApiPilotTransportV3 = {
    async send(request) {
      requests.push(request);
      if (options.failFirst && requests.length === 1) return { httpStatus: 500, contentType: "application/json", body: { error: "synthetic" }, bodyParsed: true };
      const sessionIndex = STAYOPTI_T5_SESSION_REGISTRY_V3.findIndex((session) => session.sessionId === request.sessionId);
      const count = requests.length === 1 ? options.firstCount : options.secondCount;
      const body = responseFor(sessionIndex, { count });
      return { httpStatus: 200, contentType: "application/json", body, bodyParsed: true, rawBodyText: JSON.stringify(body) };
    },
  };
  return { value, requests };
}

async function execute(options: { auth?: StayOptiT5Canary2AuthorizationV3 | null; key?: string; firstCount?: number; secondCount?: number; failFirst?: boolean; quarantineFailure?: boolean } = {}) {
  const network = transport({ firstCount: options.firstCount, secondCount: options.secondCount, failFirst: options.failFirst });
  const raw = quarantine({ throwOnCapture: options.quarantineFailure });
  const result = await executeT5Canary2LimitedComparableCollectionV3({
    authorization: options.auth === undefined ? authorization() : options.auth,
    apiKey: options.key ?? TEST_KEY,
    observedSourceSha: STAYOPTI_T5_SOURCE_SHA_V3,
    observedExecutionHead: EXECUTION_HEAD,
    observedRunnerBundleHash: RUNNER_HASH,
    workingTreeRelevantFilesMatch: true,
    transport: network.value,
    privateQuarantine: raw.value,
    clock: () => "2026-09-02T13:00:00.000Z",
  });
  return { result, network, raw };
}

function sessionArtifact(response: SerpApiGoogleHotelsResponseV3, sessionIndex = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!) {
  const source = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex]!;
  const snapshot = createSerpApiSanitizedSnapshotV3({
    pilotId: "SYNTHETIC_T5",
    manifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    session: source,
    response,
    captureTimestamp: "2026-09-02T13:00:00.000Z",
  });
  return createT5LimitedComparableSessionEvidenceV3({ sessionIndex, snapshot });
}

test("T5 01 T5 preparation has no network authority", () => {
  const result = preflight(authorization({ authorizationGrantedBySubsequentUserMessage: false }));
  assert.equal(result.networkAllowed, false);
});

test("T5 02 registry contains exactly twelve canonical sessions", () => assert.equal(STAYOPTI_T5_SESSION_REGISTRY_V3.length, 12));
test("T5 03 CANARY2 contains exactly two sessions", () => assert.equal(STAYOPTI_T5_CANARY2_MANIFEST_V3.sessionCount, 2));
test("T5 04 REMAINING10 contains exactly ten sessions", () => assert.equal(STAYOPTI_T5_REMAINING10_MANIFEST_V3.sessionCount, 10));
test("T5 05 stage subsets are disjoint", () => assert.equal(STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3.some((index) => STAYOPTI_T5_REMAINING10_SESSION_INDEXES_V3.includes(index)), false));
test("T5 06 stage union equals all twelve sessions", () => assert.deepEqual([...STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3, ...STAYOPTI_T5_REMAINING10_SESSION_INDEXES_V3].sort((a, b) => a - b), Array.from({ length: 12 }, (_unused, index) => index)));
test("T5 07 CANARY2 selection is deterministic", () => assert.deepEqual(selectT5Canary2SessionIndexesV3(), selectT5Canary2SessionIndexesV3(STAYOPTI_T5_SESSION_REGISTRY_V3)));
test("T5 08 CANARY2 cap is two", () => assert.equal(STAYOPTI_T5_CANARY2_MAX_CALLS_V3, 2));
test("T5 09 REMAINING10 cap is ten", () => assert.equal(STAYOPTI_T5_REMAINING10_MAX_CALLS_V3, 10));
test("T5 10 campaign cap is twelve", () => assert.equal(STAYOPTI_T5_CAMPAIGN_MANIFEST_V3.maximumCalls, 12));

test("T5 11 ledger permits only one request per session", () => {
  const index = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!;
  const session = STAYOPTI_T5_SESSION_REGISTRY_V3[index]!;
  const ledger = new StayOptiT5Canary2RequestLedgerV3();
  const ordinal = ledger.plan({ sessionId: session.sessionId, sessionIndex: index, requestKind: "MAIN_SEARCH" });
  ledger.transmit(ordinal, "T"); ledger.validate(ordinal, "a".repeat(64), true);
  assert.throws(() => ledger.plan({ sessionId: session.sessionId, sessionIndex: index, requestKind: "MAIN_SEARCH" }), /DUPLICATE_SESSION_REQUEST/);
});

test("T5 12 property detail is impossible", () => {
  const index = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!;
  const ledger = new StayOptiT5Canary2RequestLedgerV3();
  assert.throws(() => ledger.plan({ sessionId: STAYOPTI_T5_SESSION_REGISTRY_V3[index]!.sessionId, sessionIndex: index, requestKind: "PROPERTY_DETAIL" }), /PROPERTY_DETAIL_FORBIDDEN/);
});

test("T5 13 retry is frozen at zero", () => assert.equal(STAYOPTI_T5_CAMPAIGN_MANIFEST_V3.retries, 0));
test("T5 14 pagination is frozen at zero", () => assert.equal(STAYOPTI_T5_CAMPAIGN_MANIFEST_V3.pagination, 0));
test("T5 15 concurrency is frozen at one", () => assert.equal(STAYOPTI_T5_CAMPAIGN_MANIFEST_V3.concurrency, 1));

test("T5 16 third CANARY2 request is rejected", () => {
  const ledger = new StayOptiT5Canary2RequestLedgerV3();
  for (const index of STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3) {
    const ordinal = ledger.plan({ sessionId: STAYOPTI_T5_SESSION_REGISTRY_V3[index]!.sessionId, sessionIndex: index, requestKind: "MAIN_SEARCH" });
    ledger.transmit(ordinal, "T"); ledger.validate(ordinal, "a".repeat(64), true);
  }
  const firstIndex = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!;
  assert.throws(() => ledger.plan({ sessionId: STAYOPTI_T5_SESSION_REGISTRY_V3[firstIndex]!.sessionId, sessionIndex: firstIndex, requestKind: "MAIN_SEARCH" }), /DUPLICATE_SESSION_REQUEST|CAP_REACHED/);
});

test("T5 17 unregistered stage session is rejected", () => {
  const outside = STAYOPTI_T5_REMAINING10_SESSION_INDEXES_V3[0]!;
  const ledger = new StayOptiT5Canary2RequestLedgerV3();
  assert.throws(() => ledger.plan({ sessionId: STAYOPTI_T5_SESSION_REGISTRY_V3[outside]!.sessionId, sessionIndex: outside, requestKind: "MAIN_SEARCH" }), /SESSION_OUTSIDE_CANARY2/);
});

test("T5 18 altered registry hash fails before credential prompt", () => {
  const result = validateT5Canary2AuthorizationV3({
    authorization: authorization(), observedSourceSha: STAYOPTI_T5_SOURCE_SHA_V3, observedExecutionHead: EXECUTION_HEAD,
    observedCampaignManifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3, observedCanary2ManifestHash: STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
    observedSessionRegistryHash: "0".repeat(64), observedRunnerBundleHash: RUNNER_HASH, workingTreeRelevantFilesMatch: true,
  });
  assert.equal(result.credentialPromptAllowed, false); assert.ok(result.issues.includes("T5_SESSION_REGISTRY_MISMATCH"));
});

test("T5 19 old generic literal is rejected", () => assert.equal(preflight(authorization({ literal: `AUTHORIZE_V3_17T2_${"a".repeat(64)}` })).allowed, false));
test("T5 20 consumed T2C literal is rejected", () => assert.equal(preflight(authorization({ literal: `AUTHORIZE_V3_17T2C_MAX2_SOURCE_SHA_${STAYOPTI_T5_SOURCE_SHA_V3}` })).allowed, false));
test("T5 21 REMAINING10 is unreachable from the CANARY2 executor", () => assert.equal(STAYOPTI_T5_REMAINING10_MANIFEST_V3.reachableFromOtherStage, false));

test("T5 22 private quarantine is mandatory", async () => {
  const network = transport(); const raw = quarantine();
  const unavailable = { ...raw.value, protectionReady: false as true };
  await assert.rejects(() => executeT5Canary2LimitedComparableCollectionV3({ authorization: authorization(), apiKey: TEST_KEY, observedSourceSha: STAYOPTI_T5_SOURCE_SHA_V3, observedExecutionHead: EXECUTION_HEAD, observedRunnerBundleHash: RUNNER_HASH, workingTreeRelevantFilesMatch: true, transport: network.value, privateQuarantine: unavailable, clock: () => "T" }), /PRIVATE_QUARANTINE_REQUIRED/);
  assert.equal(network.requests.length, 0);
});

test("T5 23 quarantine failure has no plaintext fallback and stops the next session", async () => {
  const run = await execute({ quarantineFailure: true });
  assert.equal(run.network.requests.length, 1); assert.equal(run.result.status, "ABORTED"); assert.equal(run.result.sessionEvidence.length, 0);
});

test("T5 24 price-present and price-missing strata remain separate", () => {
  const artifact = sessionArtifact(responseFor(STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!, { count: 10, missingPriceCount: 2 }));
  assert.equal(artifact.pricePresentStratum.length, 8); assert.equal(artifact.priceMissingStratum.length, 2);
});

test("T5 25 missing price is explicit rather than negative evidence", () => {
  const artifact = sessionArtifact(responseFor(STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!, { count: 10, missingPriceCount: 1 }));
  assert.equal(artifact.priceMissingStratum[0]!.observedPriceMinorUnits, null);
  assert.ok(artifact.exclusionLedger.some((entry) => entry.reasonCodes.includes("T5_PRICE_MISSING_SEPARATE_STRATUM")));
});

test("T5 26 sponsorship mutation does not change selection", () => {
  const index = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!;
  const first = sessionArtifact(responseFor(index), index);
  const second = sessionArtifact(responseFor(index, { sponsoredAll: true }), index);
  assert.equal(first.comparableSelectionFingerprint, second.comparableSelectionFingerprint);
});

test("T5 27 original order mutation does not change selection", () => {
  const index = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!;
  const first = sessionArtifact(responseFor(index), index);
  const second = sessionArtifact(responseFor(index, { reverse: true }), index);
  assert.equal(first.comparableSelectionFingerprint, second.comparableSelectionFingerprint);
});

test("T5 28 opaque identity mutation does not change selection", () => {
  const index = STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!;
  const first = sessionArtifact(responseFor(index), index);
  const second = sessionArtifact(responseFor(index, { mutateIdentity: true }), index);
  assert.equal(first.comparableSelectionFingerprint, second.comparableSelectionFingerprint);
});

test("T5 29 property token is never exported", () => {
  const artifact = sessionArtifact(responseFor(STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3[0]!));
  assert.equal(JSON.stringify(artifact).includes("property_token"), false); assert.equal(artifact.propertyTokenExported, false);
});

test("T5 30 Evidence contract excludes raw and sanitized artifacts contain no secrets", () => {
  assert.ok(STAYOPTI_T5_CANARY2_EVIDENCE_CONTRACT_V3.forbiddenContent.includes("RAW_PROVIDER_PAYLOAD"));
  assert.ok(STAYOPTI_T5_CANARY2_EVIDENCE_CONTRACT_V3.forbiddenContent.includes("PROPERTY_TOKEN"));
  assert.deepEqual(validateT5EvidenceArtifactV3({ stage: "CANARY2", rawInSharedEvidence: false, propertyTokenExported: false }), { valid: true, violations: [] });
});
test("T5 31 REMAINING10 remains unauthorized", () => assert.equal(STAYOPTI_T5_REMAINING10_MANIFEST_V3.authorized, false));
test("T5 32 automatic Golden admission remains disabled", () => assert.equal(STAYOPTI_T5_CAMPAIGN_MANIFEST_V3.automaticGoldenAdmission, false));

test("T5 33 complete synthetic CANARY2 stops after two main searches", async () => {
  const run = await execute();
  assert.equal(run.result.status, "PASS"); assert.equal(run.result.actualRequestsTransmitted, 2); assert.equal(run.result.propertyDetailRequests, 0);
  assert.equal(run.result.remaining10Started, false); assert.equal(run.network.requests.every((request) => request.requestKind === "MAIN_SEARCH"), true);
});

test("T5 34 API key absence produces zero requests", async () => {
  const network = transport(); const raw = quarantine();
  await assert.rejects(() => executeT5Canary2LimitedComparableCollectionV3({ authorization: authorization(), apiKey: "", observedSourceSha: STAYOPTI_T5_SOURCE_SHA_V3, observedExecutionHead: EXECUTION_HEAD, observedRunnerBundleHash: RUNNER_HASH, workingTreeRelevantFilesMatch: true, transport: network.value, privateQuarantine: raw.value, clock: () => "T" }), /API_KEY_MISSING/);
  assert.equal(network.requests.length, 0);
});

test("T5 35 failed first main search stops campaign after one request", async () => {
  const run = await execute({ failFirst: true });
  assert.equal(run.network.requests.length, 1); assert.equal(run.result.status, "ABORTED"); assert.equal(run.result.remaining10Started, false);
});

test("T5 36 one diagnostic session prevents CANARY2 PASS", async () => {
  const run = await execute({ secondCount: 4 });
  assert.equal(run.result.actualRequestsTransmitted, 2); assert.equal(run.result.comparableSessionCount, 1); assert.equal(run.result.status, "ABORTED");
});

test("T5 37 URL and diagnostic URL redact the key", async () => {
  const run = await execute();
  for (const request of run.network.requests) {
    assert.equal(request.sanitizedUrl.includes(TEST_KEY), false);
    assert.match(request.sanitizedUrl, /\[REDACTED\]/);
  }
  assert.equal(JSON.stringify(run.result).includes(TEST_KEY), false);
});

test("T5 38 immutable hashes are distinct and well formed", () => {
  const hashes = [STAYOPTI_T5_SESSION_REGISTRY_HASH_V3, STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3, STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3, STAYOPTI_T5_REMAINING10_MANIFEST_HASH_V3];
  assert.equal(new Set(hashes).size, 4); assert.equal(hashes.every((hash) => /^[0-9a-f]{64}$/.test(hash)), true);
});

test("T5 39 runner bundle seals gate, launcher, adapter, registry and quarantine boundaries", () => {
  const runner = readFileSync(resolve(process.cwd(), "scripts/run-v3-17t5-serpapi-limited-comparable-canary2.mjs"), "utf8");
  for (const required of [
    "scripts/invoke-v3-17t5-serpapi-limited-comparable-canary2.ps1",
    "src/engine-v3/evaluation/serpApiLimitedComparableCollectionGateV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts",
    "scripts/provider-raw-quarantine-store.mjs",
  ]) assert.match(runner, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("T5 40 preflight completes before process credential access", () => {
  const runner = readFileSync(resolve(process.cwd(), "scripts/run-v3-17t5-serpapi-limited-comparable-canary2.mjs"), "utf8");
  const preflightOnly = runner.indexOf('argv.includes("--preflight-only")');
  const credentialRead = runner.indexOf("process.env.SERPAPI_API_KEY");
  assert.ok(preflightOnly >= 0 && credentialRead > preflightOnly);
});

test("T5 41 live transport is restricted to main-search without property detail or pagination", () => {
  const runner = readFileSync(resolve(process.cwd(), "scripts/run-v3-17t5-serpapi-limited-comparable-canary2.mjs"), "utf8");
  assert.match(runner, /request\.requestKind !== "MAIN_SEARCH"/);
  assert.match(runner, /parsed\.searchParams\.has\("property_token"\)/);
  assert.match(runner, /parsed\.searchParams\.has\("next_page_token"\)/);
  assert.match(runner, /redirect: "manual"/);
});

test("T5 42 PowerShell handoff keeps the key off the command line and clears it in finally", () => {
  const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t5-serpapi-limited-comparable-canary2.ps1"), "utf8");
  assert.match(launcher, /Read-Host 'SerpApi API key' -AsSecureString/);
  assert.match(launcher, /\$env:SERPAPI_API_KEY = \$PlainKey/);
  assert.match(launcher, /Remove-Item Env:SERPAPI_API_KEY/);
  assert.match(launcher, /ZeroFreeBSTR/);
  assert.doesNotMatch(launcher, /--api-key/);
});
