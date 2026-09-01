import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import type { SerpApiGoogleHotelsResponseV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";
import {
  executeSerpApiGoogleHotelsPilotEvidenceV3,
  type StayOptiSerpApiPilotEvidenceStoreV3,
  type StayOptiSerpApiPilotFaultPointV3,
  type StayOptiSerpApiPrivateRawQuarantineV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3";
import {
  sha256SerpApiEvidenceV3,
  validateSerpApiCanaryEvidenceArchiveEntriesV3,
  type StayOptiSerpApiEvidenceArchiveEntryV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import {
  createSerpApiT2CRequiredAuthorizationLiteralV3,
  STAYOPTI_SERPAPI_PILOT_ID_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  STAYOPTI_SERPAPI_REVOKED_MAX48_AUTHORIZATION_LITERAL_V3,
  type StayOptiSerpApiPilotRawStoreV3,
  type StayOptiSerpApiPilotTransportV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import {
  STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3,
  STAYOPTI_SERPAPI_PRIOR_CONSUMED_CANARY_CALLS_V3,
  STAYOPTI_SERPAPI_REMAINING_MAX_CALLS_V3,
  STAYOPTI_SERPAPI_STAGED_MAX_TOTAL_CALLS_V3,
  StayOptiSerpApiStagedRequestLedgerV3,
  createSerpApiRemainingAuthorizationLiteralV3,
  stageSessionIndexesV3,
  type StayOptiSerpApiPilotStageV3,
  type StayOptiSerpApiValidatedCanaryEvidenceV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3";

const KEY = "SYNTHETIC_CANARY_KEY_NOT_REAL";
const ZIP_HASH = "a".repeat(64);
const EXECUTION_HEAD = "1".repeat(40);
const CANARY_SESSION = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!;

function responseFor(sessionIndex: number): SerpApiGoogleHotelsResponseV3 {
  const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex]!;
  const property = (rank: number) => ({
    name: `Synthetic ${rank}`,
    property_token: `opaque-${sessionIndex}-${rank}`,
    type: "hotel",
    overall_rating: 4 + rank / 10,
    reviews: 100 + rank,
    total_rate: { extracted_lowest: 200 + rank },
    rate_per_night: { extracted_lowest: 100 + rank },
    amenities: ["Wi-Fi"],
    free_cancellation: true,
  });
  return {
    search_metadata: { created_at: "2026-09-02T10:00:00Z", processed_at: "2026-09-02T10:00:01Z", status: "Success" },
    search_parameters: { q: session.destination, check_in_date: session.checkIn, check_out_date: session.checkOut, adults: session.adults, children: session.childAges.length, rooms: session.rooms, currency: "EUR", gl: "it", hl: "it", no_cache: true },
    properties: [property(1), property(2), property(3), property(4)],
  };
}

function detailResponse(): SerpApiGoogleHotelsResponseV3 {
  return { property: { amenities: ["Synthetic detail"], free_cancellation: true } };
}

class MemoryRawStore implements StayOptiSerpApiPilotRawStoreV3 {
  readonly values = new Map<string, string>();
  writeEphemeral(name: string, value: string) { this.values.set(name, value); }
  removeEphemeral(name: string) { this.values.delete(name); }
  removeAllEphemeral() { this.values.clear(); }
  existsEphemeral(name: string) { return this.values.has(name); }
}

class MemoryEvidenceStore implements StayOptiSerpApiPilotEvidenceStoreV3 {
  readonly values = new Map<string, string>();
  failWrite = false;
  failRead = false;
  writeSnapshotAtomic(name: string, value: string) {
    if (this.failWrite) throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED");
    this.values.set(name, value);
  }
  readSnapshot(name: string) {
    if (this.failRead) throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED");
    const value = this.values.get(name);
    if (value === undefined) throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED");
    return value;
  }
}

function memoryQuarantine(): StayOptiSerpApiPrivateRawQuarantineV3 {
  let ordinal = 0;
  return {
    protectionReady: true,
    capture() { ordinal += 1; return { entryId: `RAWQ_TEST_${ordinal}`, envelopeFingerprint: "b".repeat(64) }; },
    markProcessedSuccess(handle) { return handle; },
  };
}

function validatedCanary(): StayOptiSerpApiValidatedCanaryEvidenceV3 {
  return {
    evidenceVersion: "stayopti.v3.serpapi-google-hotels-canary-resume@1",
    valid: true,
    status: "PASS",
    pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    canaryEvidenceZipSha256: ZIP_HASH,
    canarySessionId: CANARY_SESSION.sessionId,
    canarySessionIndex: 0,
    actualRequestsTransmitted: 2,
    remainingStageNotStarted: true,
    rawDeletionVerified: true,
    t3Compatible: true,
  };
}

function authorization(stage: StayOptiSerpApiPilotStageV3, literal?: string) {
  const canary = validatedCanary();
  return {
    authorizationState: "AUTHORIZED_NOT_STARTED" as const,
    stage,
    literal: literal ?? (stage === "CANARY" ? createSerpApiT2CRequiredAuthorizationLiteralV3(EXECUTION_HEAD) : createSerpApiRemainingAuthorizationLiteralV3({ manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, canaryEvidenceZipSha256: ZIP_HASH })),
    sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    executionHead: EXECUTION_HEAD,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    accountPlan: "FREE" as const,
    retentionAuthorized: true as const,
    canaryEvidenceZipSha256: stage === "REMAINING_11" ? canary.canaryEvidenceZipSha256 : undefined,
  };
}

async function run(input: {
  stage?: StayOptiSerpApiPilotStageV3;
  literal?: string;
  noKey?: boolean;
  noCanary?: boolean;
  failSearch?: boolean;
  failDetailAt?: number;
  fault?: StayOptiSerpApiPilotFaultPointV3;
  failWrite?: boolean;
  failRead?: boolean;
} = {}) {
  const stage = input.stage ?? "CANARY";
  const raw = new MemoryRawStore();
  const evidence = new MemoryEvidenceStore();
  evidence.failWrite = input.failWrite ?? false;
  evidence.failRead = input.failRead ?? false;
  let calls = 0;
  let detailCalls = 0;
  const sessions: string[] = [];
  const transport: StayOptiSerpApiPilotTransportV3 = {
    async send(request) {
      calls += 1;
      sessions.push(request.sessionId);
      if (request.requestKind === "MAIN_SEARCH") {
        if (input.failSearch) return { httpStatus: 500, body: {} };
        const index = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.findIndex((entry) => entry.sessionId === request.sessionId);
        return { httpStatus: 200, body: responseFor(index) };
      }
      detailCalls += 1;
      if (detailCalls === input.failDetailAt) return { httpStatus: 500, body: {} };
      return { httpStatus: 200, body: detailResponse() };
    },
  };
  try {
    const result = await executeSerpApiGoogleHotelsPilotEvidenceV3({
      authorization: authorization(stage, input.literal),
      apiKey: input.noKey ? "" : KEY,
      observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
      observedExecutionHead: EXECUTION_HEAD,
      nowIso: "2026-09-02T00:00:00Z",
      clock: () => "2026-09-02T10:00:02Z",
      transport,
      rawStore: raw,
      privateRawQuarantine: memoryQuarantine(),
      evidenceStore: evidence,
      validatedCanaryEvidence: stage === "REMAINING_11" && !input.noCanary ? validatedCanary() : undefined,
      faultInjector: input.fault ? (point) => { if (point === input.fault) throw new Error(`SERPAPI_PILOT_FAULT_${point}`); } : undefined,
    });
    return { result, raw, evidence, calls, detailCalls, sessions };
  } catch (error) {
    return { error, raw, evidence, calls, detailCalls, sessions };
  }
}

function entriesForCanary(execution: NonNullable<Awaited<ReturnType<typeof run>>["result"]>) {
  const snapshot = execution.snapshots[0]!;
  const entries: StayOptiSerpApiEvidenceArchiveEntryV3[] = [
    { name: "frozen-manifest.json", content: JSON.stringify(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3) },
    { name: "authorization-receipt.json", content: JSON.stringify({ stage: "CANARY", authorizationLiteralMatched: true, manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3 }) },
    { name: "stage-declaration.json", content: JSON.stringify({ pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3, stage: "CANARY", manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, maximumRequests: 2, remainingStageNotStarted: true }) },
    { name: "canary-session.json", content: JSON.stringify({ sessionId: CANARY_SESSION.sessionId, sessionIndex: 0, excludedFromRemaining: true }) },
    { name: "sanitized-request-ledger.json", content: JSON.stringify(execution.sanitizedRequestLedger) },
    { name: "pilot-summary.json", content: JSON.stringify(execution.receipt) },
    { name: "session-summary.json", content: JSON.stringify(execution.sessionSummaries) },
    { name: "raw-deletion-receipts.json", content: JSON.stringify(execution.rawDeletionReceipts) },
    { name: "credential-redaction-receipt.json", content: JSON.stringify({ credentialPersisted: false, credentialPrinted: false }) },
    { name: "sanitized-response-diagnostics.json", content: JSON.stringify(execution.responseDiagnostics) },
    { name: "schema-validation.json", content: JSON.stringify({ snapshotT3Compatible: true, snapshotCount: 1 }) },
    { name: "zip-roundtrip-result.json", content: JSON.stringify({ archiveRoundtripRequired: true, validatorRequired: true }) },
    { name: "secret-scan.txt", content: "SECRET_SCAN=PASS\n" },
    { name: "raw-id-scan.txt", content: "RAW_ID_SCAN=PASS\n" },
    { name: "test-results.txt", content: "PASS\n" },
    { name: "preflight.json", content: JSON.stringify({ passed: true }) },
    { name: "postflight.json", content: JSON.stringify({ remainingStageNotStarted: true, rawPayloadCommitted: false, credentialClearedFromProcess: true }) },
    { name: "snapshots/session-01.json", content: JSON.stringify(snapshot) },
  ];
  entries.push({ name: "checksums.sha256", content: entries.map((entry) => `${sha256SerpApiEvidenceV3(entry.content)}  ${entry.name}`).join("\n") + "\n" });
  return entries;
}

test("T1B 01 dry-run contract has no implicit authorization", () => { const source = readFileSync(resolve(process.cwd(), "scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs"), "utf8"); assert.match(source, /--preflight-only/); assert.doesNotMatch(source, /defaultAuthorization|authorization\s*\?\?/); });
test("T1B 02 missing stage fails before transport", async () => { const result = await executeSerpApiGoogleHotelsPilotEvidenceV3({ authorization: { ...authorization("CANARY"), stage: undefined } as never, apiKey: KEY, observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3, observedExecutionHead: EXECUTION_HEAD, nowIso: "2026-09-02T00:00:00Z", transport: { async send() { throw new Error("transport reached"); } }, rawStore: new MemoryRawStore(), evidenceStore: new MemoryEvidenceStore(), privateRawQuarantine: memoryQuarantine() }).catch((error) => error); assert.match(String(result), /STAGE_REQUIRED/); });
test("T1B 03 revoked MAX48 literal is rejected with zero calls", async () => { const result = await run({ literal: STAYOPTI_SERPAPI_REVOKED_MAX48_AUTHORIZATION_LITERAL_V3 }); assert.equal(result.calls, 0); assert.match(String(result.error), /LITERAL_MISMATCH/); });
test("T1B 04 wrong canary literal is rejected", async () => { const result = await run({ literal: "WRONG" }); assert.equal(result.calls, 0); });
test("T1B 05 canary can access only first session", () => { assert.deepEqual(stageSessionIndexesV3("CANARY", 12), [0]); });
test("T2B 06 repaired canary is capped at two", async () => { const result = await run(); assert.equal(result.calls, 2); assert.equal(result.result?.receipt.actualRequestsTransmitted, 2); });
test("T1B 07 search failure sends one and zero details", async () => { const result = await run({ failSearch: true }); assert.equal(result.calls, 1); assert.equal(result.detailCalls, 0); });
test("T1B 08 search schema/normalization fault sends zero details", async () => { const result = await run({ fault: "DURING_NORMALIZATION" }); assert.equal(result.calls, 1); assert.equal(result.detailCalls, 0); });
test("T1B 09 first detail failure prevents details two and three", async () => { const result = await run({ failDetailAt: 1 }); assert.equal(result.calls, 2); });
test("T2B 10 a second detail is unreachable", async () => { const result = await run({ failDetailAt: 2 }); assert.equal(result.calls, 2); assert.equal(result.detailCalls, 1); });
test("T2B 11 one valid detail cannot create request three", async () => { const result = await run(); assert.equal(result.calls, STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3); });
test("T1B 12 canary completion is terminal", async () => { const result = await run(); assert.equal(result.result?.receipt.status, "COMPLETED"); assert.equal(result.result?.receipt.remainingStageNotStarted, true); assert.equal(new Set(result.sessions).size, 1); });
test("T1B 13 remaining never starts automatically", async () => { const result = await run(); assert.equal(result.sessions.includes(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[1]!.sessionId), false); });
test("T1B 14 remaining without canary Evidence is blocked", async () => { const result = await run({ stage: "REMAINING_11", noCanary: true }); assert.equal(result.calls, 0); assert.match(String(result.error), /CANARY_EVIDENCE_REQUIRED/); });
test("T1B 15 altered canary archive is invalid", async () => { const runResult = await run(); const entries = entriesForCanary(runResult.result!); entries.find((entry) => entry.name === "postflight.json")!.content = "{}"; const validation = validateSerpApiCanaryEvidenceArchiveEntriesV3({ entries, expectedPilotId: STAYOPTI_SERPAPI_PILOT_ID_V3, expectedManifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, expectedRunnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, expectedCanarySessionId: CANARY_SESSION.sessionId, canaryEvidenceZipSha256: ZIP_HASH }); assert.equal(validation.valid, false); });
test("T1B 16 failed canary cannot validate for resume", async () => { const failed = await run({ failSearch: true }); assert.equal(failed.result?.receipt.status, "ABORTED"); });
test("T1B 17 wrong ZIP hash is rejected", () => { assert.throws(() => createSerpApiRemainingAuthorizationLiteralV3({ manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, runnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, canaryEvidenceZipSha256: "bad" }), /HASH_INVALID/); });
test("T1B 18 Stage A literal cannot authorize Stage B", async () => { const result = await run({ stage: "REMAINING_11", literal: createSerpApiT2CRequiredAuthorizationLiteralV3(EXECUTION_HEAD) }); assert.equal(result.calls, 0); });
test("T1B 19 canary session is excluded from remaining", async () => { const result = await run({ stage: "REMAINING_11" }); assert.equal(result.sessions.includes(CANARY_SESSION.sessionId), false); });
test("T1B 20 remaining contains exactly eleven sessions", async () => { const result = await run({ stage: "REMAINING_11" }); assert.equal(new Set(result.sessions).size, 11); });
test("T1B 21 remaining is capped at 44", async () => { const result = await run({ stage: "REMAINING_11" }); assert.equal(result.calls, STAYOPTI_SERPAPI_REMAINING_MAX_CALLS_V3); });
test("T1B 22 duplicate request is rejected", () => { const ledger = new StayOptiSerpApiStagedRequestLedgerV3({ pilotId: "P", manifestHash: "m", runnerBundleHash: "r", stage: "CANARY", allowedSessionIndexes: [0], maximumRequests: 2 }); const one = ledger.plan({ sessionId: "S", sessionIndex: 0, requestType: "MAIN_SEARCH" }); ledger.transmit(one, "T"); ledger.validate(one, "a".repeat(64), true, true); assert.throws(() => ledger.plan({ sessionId: "S", sessionIndex: 0, requestType: "MAIN_SEARCH" }), /DUPLICATE/); });
test("T1B 22a concurrency above one is rejected", () => { const ledger = new StayOptiSerpApiStagedRequestLedgerV3({ pilotId: "P", manifestHash: "m", runnerBundleHash: "r", stage: "CANARY", allowedSessionIndexes: [0], maximumRequests: 2 }); ledger.plan({ sessionId: "S", sessionIndex: 0, requestType: "MAIN_SEARCH" }); assert.throws(() => ledger.plan({ sessionId: "S", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 1 }), /CONCURRENCY_LIMIT_EXCEEDED/); });
test("T2B 22b request three is blocked before transmission", () => { const ledger = new StayOptiSerpApiStagedRequestLedgerV3({ pilotId: "P", manifestHash: "m", runnerBundleHash: "r", stage: "CANARY", allowedSessionIndexes: [0], maximumRequests: 2 }); for (let index = 0; index < 2; index += 1) { const ordinal = ledger.plan({ sessionId: "S", sessionIndex: 0, requestType: index === 0 ? "MAIN_SEARCH" : "PROPERTY_DETAIL", alternativeRank: index === 0 ? null : index }); ledger.transmit(ordinal, "T"); ledger.validate(ordinal, "a".repeat(64), index === 0, true); } assert.throws(() => ledger.plan({ sessionId: "S", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 2 }), /CAP_REACHED/); });
test("T1B 22c missing API key blocks the staged collector", async () => { const result = await run({ noKey: true }); assert.equal(result.calls, 0); assert.match(String(result.error), /API_KEY_MISSING/); });
test("T2B 23 historical plus repaired stages retain total theoretical cap 48", () => { assert.equal(STAYOPTI_SERPAPI_PRIOR_CONSUMED_CANARY_CALLS_V3 + STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3 + STAYOPTI_SERPAPI_REMAINING_MAX_CALLS_V3, STAYOPTI_SERPAPI_STAGED_MAX_TOTAL_CALLS_V3); });
test("T1B 24 raw is deleted across collector fault points", async () => { for (const fault of ["AFTER_SEARCH_TRANSMITTED", "DURING_SEARCH_PARSING", "DURING_NORMALIZATION", "DURING_SNAPSHOT_EXPORT", "DURING_SNAPSHOT_REREAD", "BEFORE_DETAIL_1", "AFTER_DETAIL_1", "AFTER_DETAIL_2"] as const) { const result = await run({ fault }); assert.equal(result.raw.values.size, 0, fault); } });
test("T1B 25 abort execution remains sanitizable", async () => { const result = await run({ failDetailAt: 1 }); assert.equal(result.result?.receipt.status, "ABORTED"); assert.doesNotMatch(JSON.stringify(result.result), /opaque-0-/); });
test("T1B 26 key is absent from artifacts", async () => { const result = await run(); assert.doesNotMatch(JSON.stringify(result.result), new RegExp(KEY)); });
test("T1B 27 property token is absent from artifacts", async () => { const result = await run(); assert.doesNotMatch(JSON.stringify(result.result), /property_token|opaque-0-/i); });
test("T1B 28 URL redaction remains mandatory", () => { const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3.ts"), "utf8"); assert.match(source, /redactSerpApiDiagnosticV3/); });
test("T1B 29 canary snapshot is T3-compatible", async () => { const result = await run(); const validation = validateSerpApiCanaryEvidenceArchiveEntriesV3({ entries: entriesForCanary(result.result!), expectedPilotId: STAYOPTI_SERPAPI_PILOT_ID_V3, expectedManifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, expectedRunnerBundleHash: STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, expectedCanarySessionId: CANARY_SESSION.sessionId, canaryEvidenceZipSha256: ZIP_HASH }); assert.deepEqual(validation.issues, []); assert.equal(validation.valid, true); assert.equal(validation.t3Compatible, true); });
test("T1B 30 collector remains evaluation-only and provider-neutral", () => { const core = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8"); assert.doesNotMatch(core, /serpApiGoogleHotelsPilotCollectorV3|serpApiGoogleHotelsPilotStageV3/); });

for (const [index, fault] of (["BEFORE_FIRST_REQUEST", "AFTER_SEARCH_TRANSMITTED", "DURING_SEARCH_PARSING", "DURING_NORMALIZATION", "DURING_SNAPSHOT_EXPORT", "DURING_SNAPSHOT_REREAD", "BEFORE_DETAIL_1", "AFTER_DETAIL_1", "AFTER_DETAIL_2"] as const).entries()) {
  test(`T1B fault ${String(index + 1).padStart(2, "0")} ${fault} is deterministic and fail-closed`, async () => {
    const first = await run({ fault });
    const second = await run({ fault });
    assert.equal(first.calls, second.calls);
    assert.equal(first.raw.values.size, 0);
    assert.equal(second.raw.values.size, 0);
    assert.equal(first.result?.receipt.status ?? "THREW", second.result?.receipt.status ?? "THREW");
  });
}

test("T1B fault 10 Evidence ZIP creation failure is modeled outside transport", () => { const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8"); assert.match(launcher, /CreateFromDirectory/); assert.match(launcher, /finally/); });
test("T1B fault 11 Evidence ZIP roundtrip failure is fail-closed", () => { const launcher = readFileSync(resolve(process.cwd(), "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1"), "utf8"); assert.match(launcher, /EVIDENCE_ZIP_VALIDATION_FAILED/); });
