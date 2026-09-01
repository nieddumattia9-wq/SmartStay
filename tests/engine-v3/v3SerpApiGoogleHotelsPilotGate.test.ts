import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
  STAYOPTI_SERPAPI_AUTOMATIC_RETRY_BUDGET_V3,
  STAYOPTI_SERPAPI_MAX_API_CALLS_V3,
  STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3,
  STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3,
  STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
  StayOptiSerpApiRequestLedgerV3,
  assertSerpApiPilotRequestAllowedV3,
  createSerpApiPilotManifestHashV3,
  executeSerpApiGoogleHotelsPilotV3,
  redactSerpApiDiagnosticV3,
  selectSerpApiPropertyDetailCandidatesV3,
  type StayOptiSerpApiPilotAuthorizationEnvelopeV3,
  type StayOptiSerpApiPilotRawStoreV3,
  type StayOptiSerpApiPilotTransportV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import type { SerpApiGoogleHotelsResponseV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";

const ROOT = process.cwd();
const TEST_KEY = "TEST_SERPAPI_VALUE_NOT_A_REAL_CREDENTIAL";

function source(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function filesUnder(directory: string): string[] {
  const absolute = resolve(ROOT, directory);
  return readdirSync(absolute).flatMap((entry) => {
    const path = join(absolute, entry);
    return statSync(path).isDirectory()
      ? filesUnder(relative(ROOT, path))
      : [relative(ROOT, path).replaceAll("\\", "/")];
  }).sort();
}

function responseFor(sessionIndex: number): SerpApiGoogleHotelsResponseV3 {
  const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex]!;
  return {
    search_metadata: {
      created_at: "2026-09-02T10:00:00Z",
      processed_at: "2026-09-02T10:00:01Z",
      status: "Success",
    },
    search_parameters: {
      q: session.destination,
      check_in_date: session.checkIn,
      check_out_date: session.checkOut,
      adults: session.adults,
      children: session.childAges.length,
      rooms: session.rooms,
      currency: session.currency,
      gl: session.gl,
      hl: session.hl,
      no_cache: true,
    },
    properties: [{
      type: "hotel",
      name: `Synthetic Stay ${sessionIndex + 1}`,
      property_token: `synthetic-property-reference-${sessionIndex + 1}`,
      hotel_class: 4,
      overall_rating: 4.4,
      reviews: 200,
      total_rate: { extracted_lowest: 420 },
      amenities: ["Wi-Fi"],
      free_cancellation: true,
    }],
  };
}

function authorization(overrides: Partial<StayOptiSerpApiPilotAuthorizationEnvelopeV3> = {}): StayOptiSerpApiPilotAuthorizationEnvelopeV3 {
  return {
    authorizationState: "AUTHORIZED_NOT_STARTED",
    literal: STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3,
    sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    accountPlan: "FREE",
    retentionAuthorized: true,
    ...overrides,
  };
}

class MemoryRawStore implements StayOptiSerpApiPilotRawStoreV3 {
  readonly values = new Map<string, string>();
  removeAllCount = 0;
  writeEphemeral(name: string, value: string) { this.values.set(name, value); }
  removeEphemeral(name: string) { this.values.delete(name); }
  removeAllEphemeral() { this.values.clear(); this.removeAllCount += 1; }
}

function transport(options: { failAt?: number; capture?: string[] } = {}) {
  let calls = 0;
  const implementation: StayOptiSerpApiPilotTransportV3 = {
    async send(request) {
      calls += 1;
      options.capture?.push(request.sanitizedUrl);
      if (calls === options.failAt) throw new Error(`transport failure ${request.url}`);
      return { httpStatus: 200, body: responseFor(calls - 1) };
    },
  };
  return { implementation, calls: () => calls };
}

async function run(options: {
  authorization?: StayOptiSerpApiPilotAuthorizationEnvelopeV3 | null;
  apiKey?: string;
  sourceSha?: string;
  nowIso?: string;
  failAt?: number;
} = {}) {
  const fakeTransport = transport({ failAt: options.failAt });
  const rawStore = new MemoryRawStore();
  try {
    const receipt = await executeSerpApiGoogleHotelsPilotV3({
      authorization: options.authorization === undefined ? authorization() : options.authorization,
      apiKey: options.apiKey === undefined ? TEST_KEY : options.apiKey,
      observedSourceSha: options.sourceSha ?? STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
      nowIso: options.nowIso ?? "2026-09-02T00:00:00Z",
      transport: fakeTransport.implementation,
      rawStore,
    });
    return { receipt, calls: fakeTransport.calls(), rawStore };
  } catch (error) {
    return { error, calls: fakeTransport.calls(), rawStore };
  }
}

test("V3-17T1 freezes twelve independent materialized sessions", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.length, 12);
  assert.equal(new Set(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.map((entry) => entry.sessionId)).size, 12);
  assert.equal(new Set(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.map((entry) => entry.destination)).size, 12);
  assert.ok(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.every((entry) => entry.checkIn < entry.checkOut));
});

test("V3-17T1 manifest covers required occupancy duration lead-time and preference strata", () => {
  const sessions = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions;
  assert.ok(sessions.some((entry) => entry.userContext === "SOLO"));
  assert.ok(sessions.some((entry) => entry.userContext === "COUPLE"));
  assert.ok(sessions.some((entry) => entry.userContext === "FAMILY"));
  assert.ok(sessions.some((entry) => entry.userContext === "THREE_ADULT_GROUP"));
  assert.ok(sessions.some((entry) => entry.durationNights === 1));
  assert.ok(sessions.some((entry) => entry.durationNights >= 5));
  assert.ok(sessions.some((entry) => entry.leadTimeDays < 60));
  assert.ok(sessions.some((entry) => entry.leadTimeDays > 270));
});

test("V3-17T1 manifest hash and authorization literal are deterministic and bound", () => {
  assert.match(STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, /^[0-9a-f]{64}$/);
  assert.equal(createSerpApiPilotManifestHashV3(), STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3);
  assert.equal(STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3, `AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_MAX48`);
});

test("V3-17T1 budgets are frozen inputs and no-cache is planned", () => {
  assert.ok(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.every((entry) => Number.isInteger(entry.budgetMinorUnits) && entry.budgetMinorUnits > 0));
  assert.ok(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.every((entry) => entry.noCache === true));
});

test("V3-17T1 gate stops at ready and grants neither calls nor retention", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3.authorizationState, "READY_FOR_EXPLICIT_AUTHORIZATION");
  assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.explicitCallAuthorizationGranted, false);
  assert.equal(STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3.authorizationGranted, false);
});

test("V3-17T1 without API key sends zero calls", async () => {
  const result = await run({ apiKey: "" });
  assert.equal(result.calls, 0);
  assert.match(String(result.error), /SERPAPI_PILOT_API_KEY_MISSING/);
});

test("V3-17T1 without authorization sends zero calls", async () => {
  const result = await run({ authorization: null });
  assert.equal(result.calls, 0);
  assert.match(String(result.error), /SERPAPI_PILOT_AUTHORIZATION_REQUIRED/);
});

test("V3-17T1 wrong authorization literal sends zero calls", async () => {
  const result = await run({ authorization: authorization({ literal: "PROCEED" }) });
  assert.equal(result.calls, 0);
  assert.match(String(result.error), /AUTHORIZATION_LITERAL_MISMATCH/);
});

test("V3-17T1 wrong manifest hash sends zero calls", async () => {
  const result = await run({ authorization: authorization({ manifestHash: "0".repeat(64) }) });
  assert.equal(result.calls, 0);
  assert.match(String(result.error), /MANIFEST_HASH_MISMATCH/);
});

test("V3-17T1 wrong source SHA sends zero calls", async () => {
  const result = await run({ sourceSha: "0".repeat(40) });
  assert.equal(result.calls, 0);
  assert.match(String(result.error), /SOURCE_SHA_MISMATCH/);
});

test("V3-17T1 expired manifest sends zero calls", async () => {
  const result = await run({ nowIso: "2028-01-01T00:00:00Z" });
  assert.equal(result.calls, 0);
  assert.match(String(result.error), /MANIFEST_EXPIRED/);
});

test("V3-17T1 unapproved endpoint is blocked", () => {
  assert.throws(() => assertSerpApiPilotRequestAllowedV3({ endpoint: "https://example.invalid", engine: "google_hotels", requestKind: "MAIN_SEARCH" }), /ENDPOINT_NOT_ALLOWLISTED/);
  assert.throws(() => assertSerpApiPilotRequestAllowedV3({ endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3, engine: "google_search", requestKind: "MAIN_SEARCH" }), /ENDPOINT_NOT_ALLOWLISTED/);
});

test("V3-17T1 request 49 is blocked before transport", () => {
  const ledger = new StayOptiSerpApiRequestLedgerV3();
  for (let index = 0; index < STAYOPTI_SERPAPI_MAX_API_CALLS_V3; index += 1) {
    ledger.reserve("SESSION", "PROPERTY_DETAIL");
    ledger.complete();
  }
  assert.throws(() => ledger.reserve("SESSION", "PROPERTY_DETAIL"), /ABORT_REQUEST_CAP_REACHED/);
});

test("V3-17T1 concurrency above one is blocked", () => {
  const ledger = new StayOptiSerpApiRequestLedgerV3();
  ledger.reserve("SESSION", "MAIN_SEARCH");
  assert.throws(() => ledger.reserve("SESSION", "PROPERTY_DETAIL"), /CONCURRENCY_LIMIT_EXCEEDED/);
});

test("V3-17T1 automatic retry budget is exactly zero", () => {
  assert.equal(STAYOPTI_SERPAPI_AUTOMATIC_RETRY_BUDGET_V3, 0);
  assert.equal(STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3.retryBudget, 0);
});

test("V3-17T1 pagination is blocked", () => {
  assert.throws(() => assertSerpApiPilotRequestAllowedV3({ endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3, engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3, requestKind: "MAIN_SEARCH", paginationToken: "fixture-token" }), /AUTOMATIC_PAGINATION_PROHIBITED/);
});

test("V3-17T1 reviews photos and non-Google-Hotels engines are blocked", () => {
  for (const engine of ["google_hotels_reviews", "google_hotels_photos", "google_search"]) {
    assert.throws(() => assertSerpApiPilotRequestAllowedV3({ endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3, engine, requestKind: "MAIN_SEARCH" }), /ENDPOINT_NOT_ALLOWLISTED/);
  }
});

test("V3-17T1 API key redaction removes query and diagnostic values", () => {
  const diagnostic = redactSerpApiDiagnosticV3(`https://serpapi.com/search.json?engine=google_hotels&api_key=${TEST_KEY}&q=Rome`);
  assert.doesNotMatch(diagnostic, new RegExp(TEST_KEY));
  assert.match(diagnostic, /api_key=%5BREDACTED%5D|api_key=\[REDACTED\]/);
});

test("V3-17T1 successful stub collection deletes raw payloads", async () => {
  const result = await run();
  assert.equal(result.calls, 12);
  assert.equal(result.rawStore.values.size, 0);
  assert.equal(result.receipt?.status, "COMPLETED");
  assert.equal(result.receipt?.rawPayloadsPersisted, 0);
});

test("V3-17T1 simulated abort deletes raw payloads and performs no retry", async () => {
  const result = await run({ failAt: 3 });
  assert.equal(result.calls, 3);
  assert.equal(result.rawStore.values.size, 0);
  assert.equal(result.receipt?.status, "ABORTED");
  assert.equal(result.receipt?.requestCount, 3);
});

test("V3-17T1 API key is absent from sanitized receipt and saved URLs", async () => {
  const captured: string[] = [];
  const fakeTransport = transport({ capture: captured });
  const receipt = await executeSerpApiGoogleHotelsPilotV3({ authorization: authorization(), apiKey: TEST_KEY, observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3, nowIso: "2026-09-02T00:00:00Z", transport: fakeTransport.implementation, rawStore: new MemoryRawStore() });
  assert.doesNotMatch(JSON.stringify(receipt), new RegExp(TEST_KEY));
  assert.ok(captured.every((entry) => !entry.includes(TEST_KEY) && entry.includes("REDACTED")));
});

test("V3-17T1 property-detail selection is deterministic and capped at three", () => {
  const candidates = [0, 1, 2, 3].map((index) => ({ localReference: `ALT_${index}`, propertyToken: `token-${index}`, selectedByV2: index === 1, selectedByV3: index === 2, decisionScoreBps: 8000 - index * 100, evidenceCompletenessBps: 9000 - index * 100, totalPriceMinorUnits: 40000 + index * 1000, ratingNormalizedBps: 8000 - index * 100 }));
  const first = selectSerpApiPropertyDetailCandidatesV3(candidates);
  const second = selectSerpApiPropertyDetailCandidatesV3([...candidates].reverse());
  assert.deepEqual(first.map((entry) => entry.localReference), second.map((entry) => entry.localReference));
  assert.equal(first.length, 3);
});

test("V3-17T1 property token and local reference never determine enrichment selection", () => {
  const base = [{ localReference: "ALT_Z", propertyToken: "token-z", selectedByV2: true, selectedByV3: false, decisionScoreBps: 9000, evidenceCompletenessBps: 9000, totalPriceMinorUnits: 40000, ratingNormalizedBps: 9000 }, { localReference: "ALT_A", propertyToken: "token-a", selectedByV2: false, selectedByV3: true, decisionScoreBps: 8500, evidenceCompletenessBps: 8500, totalPriceMinorUnits: 42000, ratingNormalizedBps: 8500 }];
  const changed = base.map((entry, index) => ({ ...entry, localReference: `RANDOM_${index}`, propertyToken: `random-${index}` }));
  assert.deepEqual(selectSerpApiPropertyDetailCandidatesV3(base).map(({ localReference: _local, propertyToken: _token, ...entry }) => entry), selectSerpApiPropertyDetailCandidatesV3(changed).map(({ localReference: _local, propertyToken: _token, ...entry }) => entry));
});

test("V3-17T1 semantic ties do not use opaque identity to fill detail slots", () => {
  const tied = ["Z", "A"].map((suffix) => ({ localReference: `ALT_${suffix}`, propertyToken: `token-${suffix}`, selectedByV2: false, selectedByV3: false, decisionScoreBps: 8000, evidenceCompletenessBps: 8000, totalPriceMinorUnits: 50000, ratingNormalizedBps: 8000 }));
  assert.equal(selectSerpApiPropertyDetailCandidatesV3(tied).length, 1);
});

test("V3-17T1 projected sessions remain candidates rather than Golden admissions", async () => {
  const result = await run();
  assert.equal(result.receipt?.automaticGoldenAdmission, false);
  assert.equal(result.receipt?.v3_17GateMet, false);
  assert.equal(result.receipt?.v3_18EntryAllowed, false);
});

test("V3-17T1 main searches use exact Google Hotels endpoint and no-cache", async () => {
  const captured: string[] = [];
  const fakeTransport = transport({ capture: captured });
  await executeSerpApiGoogleHotelsPilotV3({ authorization: authorization(), apiKey: TEST_KEY, observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3, nowIso: "2026-09-02T00:00:00Z", transport: fakeTransport.implementation, rawStore: new MemoryRawStore() });
  assert.equal(captured.length, 12);
  assert.ok(captured.every((entry) => entry.startsWith(STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3) && entry.includes("engine=google_hotels") && entry.includes("no_cache=true")));
});

test("V3-17T1 collector core contains neither process environment access nor fetch", () => {
  const collector = source("src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts");
  assert.doesNotMatch(collector, /process\.env|\bfetch\s*\(/);
});

test("V3-17T1 runner reads only SERPAPI_API_KEY after authorization preflight", () => {
  const runner = source("scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs");
  assert.match(runner, /process\.env\.SERPAPI_API_KEY/);
  assert.doesNotMatch(runner, /dotenv|readFileSync\([^)]*\.env|server[\\/]\.env/);
  assert.ok(runner.indexOf("AUTHORIZATION_LITERAL_MISMATCH") < runner.indexOf("process.env.SERPAPI_API_KEY"));
});

test("V3-17T1 PowerShell wrapper keeps the key out of command arguments", () => {
  const wrapper = source("scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1");
  assert.match(wrapper, /Read-Host 'SerpApi API key' -AsSecureString/);
  assert.match(wrapper, /ZeroFreeBSTR/);
  assert.match(wrapper, /SetEnvironmentVariable\('SERPAPI_API_KEY'/);
  assert.doesNotMatch(wrapper, /--api-key|api_key=/i);
});

test("V3-17T1 core V3 does not import collector or SerpApi", () => {
  const evaluationFiles = new Set([
    "src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts",
    "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts",
  ]);
  for (const file of filesUnder("src/engine-v3").filter((entry) => entry.endsWith(".ts") && !evaluationFiles.has(entry))) {
    assert.doesNotMatch(source(file), /serpApiGoogleHotelsPilotGateV3|serpApiGoogleHotelsExternalAdapterV3|SERPAPI_GOOGLE_HOTELS/, file);
  }
});

test("V3-17T1 public provider runtime does not import SerpApi", () => {
  for (const file of filesUnder("server/providers").filter((entry) => /\.[cm]?[jt]s$/.test(entry))) {
    assert.doesNotMatch(source(file), /serpapi|google.hotels/i, file);
  }
});

test("V3-17T1 collector does not implement booking clickout reviews photos or pagination", () => {
  const collector = source("src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts");
  assert.doesNotMatch(collector, /booking_url|clickout_url/);
  assert.ok(STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3.forbiddenEndpoints.includes("google_hotels_reviews"));
  assert.ok(STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3.forbiddenEndpoints.includes("google_hotels_photos"));
  assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.automaticPaginationAllowed, false);
});

test("V3-17T1 raw payload policy is temp-only delete-always", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3.rawPayloadStorage, "UNIQUE_TEMP_DIRECTORY_OUTSIDE_REPOSITORY");
  assert.equal(STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3.rawPayloadPolicy, "EPHEMERAL_TEMP_DELETE_ALWAYS");
  assert.equal(STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3.rawHtmlRetention, "NONE");
  assert.equal(STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3.imageRetention, "NONE");
});

test("V3-17T1 only twelve main requests execute in stub and cap remains 48", async () => {
  const result = await run();
  assert.equal(result.receipt?.mainSearchCount, 12);
  assert.equal(result.receipt?.propertyDetailCount, 0);
  assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.maximumApiCalls, 48);
});

test("V3-17T1 source account facts are metadata rather than authorization", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3.accountPlan, "FREE");
  assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.collectorNetworkEnabledInT1, false);
});

test("V3-17T1 receipt is deterministic and contains no raw payload", async () => {
  const first = await run();
  const second = await run();
  assert.equal(first.receipt?.receiptHash, second.receipt?.receiptHash);
  assert.doesNotMatch(JSON.stringify(first.receipt), /Synthetic Stay|property-reference|rawResponse/);
  assert.equal(first.receipt?.rawPayloadsPersisted, 0);
});

test("V3-17T1 static scripts do not import provider registry or LiteAPI", () => {
  for (const file of ["scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs", "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"]) {
    assert.doesNotMatch(source(file), /providerRegistry|liteApi|RouteStack/i, file);
  }
});

test("V3-17T1 leaves V3-17 unmet and V3-18 blocked", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.v3_17GateMet, false);
  assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.v3_18EntryAllowed, false);
});
