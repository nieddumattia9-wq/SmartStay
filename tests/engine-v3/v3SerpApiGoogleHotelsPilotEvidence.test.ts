import assert from "node:assert/strict";
import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import type { SerpApiGoogleHotelsResponseV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3";
import {
  executeSerpApiGoogleHotelsPilotEvidenceV3,
  type StayOptiSerpApiPilotEvidenceStoreV3,
  type StayOptiSerpApiPrivateRawQuarantineV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3";
import {
  STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_VERSION_V3,
  STAYOPTI_SERPAPI_PILOT_SNAPSHOT_SCHEMA_VERSION_V3,
  createSerpApiSanitizedSnapshotV3,
  mergeSerpApiPropertyDetailV3,
  sha256SerpApiEvidenceV3,
  validateSerpApiEvidenceArchiveEntriesV3,
  validateSerpApiSanitizedSnapshotV3,
  type StayOptiSerpApiEvidenceArchiveEntryV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import {
  STAYOPTI_SERPAPI_MAX_API_CALLS_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  createSerpApiT2CRequiredAuthorizationLiteralV3,
  STAYOPTI_SERPAPI_REVOKED_AUTHORIZATION_LITERAL_V3,
  StayOptiSerpApiRequestLedgerV3,
  type StayOptiSerpApiPilotRawStoreV3,
  type StayOptiSerpApiPilotTransportV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";

const TEST_KEY = "SYNTHETIC_TEST_KEY_NOT_REAL";
const EXECUTION_HEAD = "1".repeat(40);
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_POWERSHELL_51_REQUIRED = process.platform === "win32"
  ? false
  : "requires real Windows PowerShell 5.1; enforced by the required windows-latest release job";

function assertPowerShell51Started(result: SpawnSyncReturns<string>, label: string) {
  assert.equal(result.error, undefined, `${label}: powershell.exe failed to start`);
  assert.notEqual(result.status, null, `${label}: powershell.exe returned status=null`);
  assert.equal(typeof result.stdout, "string", `${label}: powershell.exe stdout is unavailable`);
  assert.equal(typeof result.stderr, "string", `${label}: powershell.exe stderr is unavailable`);
}

function mainResponse(index = 0): SerpApiGoogleHotelsResponseV3 {
  const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[index]!;
  const property = (rank: number, sponsored = false) => ({
    type: "hotel",
    name: `Synthetic Hotel ${rank}`,
    property_token: `temporary-property-token-${index}-${rank}`,
    gps_coordinates: { latitude: 41 + rank / 100, longitude: 12 + rank / 100 },
    hotel_class: 3 + rank % 2,
    overall_rating: 4 + rank / 10,
    reviews: 50 * rank,
    rate_per_night: { extracted_lowest: 100 + rank, before_taxes_fees: `€${100 + rank}`, extracted_before_taxes_fees: 100 + rank },
    total_rate: { extracted_lowest: 200 + rank, before_taxes_fees: `€${200 + rank}`, extracted_before_taxes_fees: 200 + rank },
    prices: [{ source: "seller-a", extracted_lowest: 200 + rank }, { source: "seller-b", extracted_lowest: 205 + rank }],
    amenities: rank === 2 ? undefined : ["Wi-Fi"],
    free_cancellation: rank === 3 ? undefined : true,
    sponsored,
  });
  return {
    search_metadata: { created_at: "2026-09-02T10:00:00Z", processed_at: "2026-09-02T10:00:01Z", status: "Success" },
    search_parameters: {
      q: session.destination, check_in_date: session.checkIn, check_out_date: session.checkOut,
      adults: session.adults, children: session.childAges.length, rooms: session.rooms,
      currency: "EUR", gl: "it", hl: "it", no_cache: true,
    },
    ads: [property(1, true)],
    properties: [property(2), property(3), property(4)],
  };
}

function detailResponse(rank: number): SerpApiGoogleHotelsResponseV3 {
  return { property: { amenities: [`Detail amenity ${rank}`], free_cancellation: false } };
}

class MemoryRawStore implements StayOptiSerpApiPilotRawStoreV3 {
  readonly values = new Map<string, string>();
  readonly events: string[] = [];
  constructor(private readonly trace: string[] = []) {}
  writeEphemeral(name: string, value: string) { this.values.set(name, value); this.events.push(`raw-write:${name}`); this.trace.push(`raw-write:${name}`); }
  removeEphemeral(name: string) { this.values.delete(name); this.events.push(`raw-delete:${name}`); this.trace.push(`raw-delete:${name}`); }
  removeAllEphemeral() { this.values.clear(); this.events.push("raw-delete-all"); }
  existsEphemeral(name: string) { return this.values.has(name); }
}

class MemoryEvidenceStore implements StayOptiSerpApiPilotEvidenceStoreV3 {
  readonly values = new Map<string, string>();
  readonly events: string[] = [];
  constructor(private readonly trace: string[] = []) {}
  failWrites = false;
  writeSnapshotAtomic(name: string, value: string) {
    this.events.push(`snapshot-write:${name}`);
    this.trace.push(`snapshot-write:${name}`);
    if (this.failWrites) throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED");
    this.values.set(name, value);
  }
  readSnapshot(name: string) {
    this.events.push(`snapshot-read:${name}`);
    this.trace.push(`snapshot-read:${name}`);
    const value = this.values.get(name);
    if (value === undefined) throw new Error("SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED");
    return value;
  }
}

function memoryQuarantine(): StayOptiSerpApiPrivateRawQuarantineV3 {
  let ordinal = 0;
  return {
    protectionReady: true,
    capture() { ordinal += 1; return { entryId: `RAWQ_TEST_${ordinal}`, envelopeFingerprint: "a".repeat(64) }; },
    markProcessedSuccess(handle) { return handle; },
  };
}

function authorization(literal: string = createSerpApiT2CRequiredAuthorizationLiteralV3(EXECUTION_HEAD)) {
  return {
    authorizationState: "AUTHORIZED_NOT_STARTED" as const,
    literal,
    stage: "CANARY" as const,
    sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    executionHead: EXECUTION_HEAD,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    accountPlan: "FREE" as const,
    retentionAuthorized: true as const,
  };
}

async function execute(options: { failDetailAt?: number; failExport?: boolean; literal?: string } = {}) {
  const trace: string[] = [];
  const raw = new MemoryRawStore(trace);
  const evidence = new MemoryEvidenceStore(trace);
  evidence.failWrites = options.failExport ?? false;
  let calls = 0;
  let detailCalls = 0;
  const transport: StayOptiSerpApiPilotTransportV3 = {
    async send(request) {
      calls += 1;
      if (request.requestKind === "MAIN_SEARCH") {
        return { httpStatus: 200, body: mainResponse(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.findIndex((session) => session.sessionId === request.sessionId)) };
      }
      detailCalls += 1;
      if (detailCalls === options.failDetailAt) return { httpStatus: 500, body: {} };
      const parsed = new URL(request.url);
      assert.ok(parsed.searchParams.has("property_token"));
      return { httpStatus: 200, body: detailResponse(Number(parsed.searchParams.get("property_token")?.split("-").at(-1) ?? "1")) };
    },
  };
  try {
    const result = await executeSerpApiGoogleHotelsPilotEvidenceV3({
      authorization: authorization(options.literal), apiKey: TEST_KEY,
      observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
      observedExecutionHead: EXECUTION_HEAD,
      nowIso: "2026-09-02T00:00:00Z", clock: () => "2026-09-02T10:00:02Z",
      transport, rawStore: raw, evidenceStore: evidence, privateRawQuarantine: memoryQuarantine(),
    });
    return { result, raw, evidence, calls, detailCalls, trace };
  } catch (error) { return { error, raw, evidence, calls, detailCalls, trace }; }
}

let completeExecution: ReturnType<typeof execute> | null = null;
function complete() { completeExecution ??= execute(); return completeExecution; }

function requiredEntries(execution: Awaited<ReturnType<typeof execute>>["result"], partial = false) {
  assert.ok(execution);
  const entries: StayOptiSerpApiEvidenceArchiveEntryV3[] = [
    { name: "frozen-manifest.json", content: JSON.stringify(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3) },
    { name: "authorization-receipt.json", content: JSON.stringify({ matched: true }) },
    { name: "sanitized-request-ledger.json", content: JSON.stringify(execution.sanitizedRequestLedger) },
    { name: "pilot-summary.json", content: JSON.stringify({ ...execution.receipt, status: partial ? "ABORTED" : "COMPLETED" }) },
    { name: "session-summary.json", content: JSON.stringify(execution.sessionSummaries) },
    { name: "raw-deletion-receipts.json", content: JSON.stringify(execution.rawDeletionReceipts) },
    { name: "credential-redaction-receipt.json", content: JSON.stringify({ credentialPersisted: false }) },
    { name: "secret-scan.txt", content: "SECRET_SCAN=PASS\n" },
    { name: "raw-id-scan.txt", content: "RAW_ID_SCAN=PASS\n" },
    { name: "test-results.txt", content: "PASS\n" },
    { name: "preflight.json", content: JSON.stringify({ passed: true }) },
    { name: "postflight.json", content: JSON.stringify({ passed: true }) },
  ];
  const snapshots = partial ? execution.snapshots.slice(0, 1) : execution.snapshots;
  snapshots.forEach((snapshot, index) => entries.push({ name: `snapshots/session-${String(index + 1).padStart(2, "0")}.json`, content: JSON.stringify(snapshot) }));
  const checksums = entries.map((entry) => `${sha256SerpApiEvidenceV3(entry.content)}  ${entry.name}`).join("\n") + "\n";
  entries.push({ name: "checksums.sha256", content: checksums });
  return entries;
}

function rehash(entries: StayOptiSerpApiEvidenceArchiveEntryV3[]) {
  const without = entries.filter((entry) => entry.name !== "checksums.sha256");
  return [...without, { name: "checksums.sha256", content: without.map((entry) => `${sha256SerpApiEvidenceV3(entry.content)}  ${entry.name}`).join("\n") + "\n" }];
}

test("T1A 01 raw is normalized and exported before deletion", async () => {
  const run = await complete(); assert.ok(run.result);
  const snapshotWrite = run.trace.indexOf("snapshot-write:snapshots/session-01.json");
  const snapshotRead = run.trace.indexOf("snapshot-read:snapshots/session-01.json");
  const rawDelete = run.trace.indexOf("raw-delete:request-01.json");
  assert.ok(snapshotWrite >= 0 && snapshotRead > snapshotWrite && rawDelete > snapshotRead);
});
test("T1A 02 normalized snapshot is exported", async () => { const run = await complete(); assert.equal(run.evidence.values.size, 1); assert.ok([...run.evidence.values.values()].every((value) => value.includes(STAYOPTI_SERPAPI_PILOT_SNAPSHOT_SCHEMA_VERSION_V3))); });
test("T1A 03 exported snapshot is reread and validated", async () => { const run = await complete(); assert.ok(run.evidence.events.some((entry) => entry.startsWith("snapshot-read:"))); assert.equal(validateSerpApiSanitizedSnapshotV3(JSON.parse(run.evidence.values.values().next().value!)).valid, true); });
test("T2B 04 raw is deleted after repaired canary success", async () => { const run = await complete(); assert.equal(run.raw.values.size, 0); assert.equal(run.result?.rawDeletionReceipts.length, 2); });
test("T1A 05 raw is deleted after detail HTTP error", async () => { const run = await execute({ failDetailAt: 1 }); assert.equal(run.raw.values.size, 0); assert.equal(run.result?.receipt.status, "ABORTED"); });
test("T1A 06 raw is deleted if export fails", async () => { const run = await execute({ failExport: true }); assert.equal(run.raw.values.size, 0); assert.equal(run.result?.receipt.failureClassification, "SERPAPI_PILOT_SNAPSHOT_EXPORT_FAILED"); });
test("T1A 07 full returned choice set is preserved", async () => { const run = await complete(); assert.ok(run.result?.snapshots.every((snapshot) => snapshot.alternatives.length === 4)); });
test("T2B 08 the single property detail is really merged", async () => { const run = await complete(); assert.ok(run.result?.snapshots.every((snapshot) => snapshot.alternatives.filter((entry) => entry.detailEnrichmentStatus === "MERGED").length === 1)); });
test("T1A 09 details do not duplicate an alternative", () => { const merged = mergeSerpApiPropertyDetailV3({ name: "A", property_token: "opaque", reviews: 10 }, { name: "B", reviews: 99, amenities: ["Pool"] }); assert.equal(merged.name, "A"); assert.equal(merged.reviews, 10); assert.deepEqual(merged.amenities, ["Pool"]); });
test("T1A 10 at most three details execute per session", async () => { const run = await complete(); assert.ok(run.result?.sessionSummaries.every((entry) => entry.detailRequestsExecuted <= 3)); });
test("T2B 11 historical total request cap remains 48 while repaired canary stops at two", async () => { const run = await complete(); assert.equal(run.calls, 2); assert.equal(run.result?.receipt.requestCount, 2); assert.equal(STAYOPTI_SERPAPI_MAX_API_CALLS_V3, 48); const ledger = new StayOptiSerpApiRequestLedgerV3(); for (let i = 0; i < 48; i += 1) { ledger.reserve("S", "PROPERTY_DETAIL"); ledger.complete(); } assert.throws(() => ledger.reserve("S", "MAIN_SEARCH"), /CAP_REACHED/); });
test("T1A 12 no retry occurs", async () => { const run = await execute({ failDetailAt: 1 }); assert.equal(run.calls, 2); });
test("T2B 13 no pagination occurs", async () => { const run = await complete(); assert.equal(run.result?.receipt.requestCount, 2); assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.automaticPaginationAllowed, false); });
test("T1A 14 API key is absent from snapshots", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(run.result?.snapshots), new RegExp(TEST_KEY)); });
test("T1A 15 API key is absent from ledger", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(run.result?.sanitizedRequestLedger), new RegExp(TEST_KEY)); });
test("T1A 16 API key is absent from receipt", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(run.result?.receipt), new RegExp(TEST_KEY)); });
test("T1A 17 API key is absent from Evidence entries", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(requiredEntries(run.result)), new RegExp(TEST_KEY)); });
test("T1A 18 property token is absent from snapshots", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(run.result?.snapshots), /property[_-]?token/i); });
test("T1A 19 property token is absent from receipt", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(run.result?.receipt), /property[_-]?token/i); });
test("T1A 20 raw provider ID is absent from archive", async () => { const run = await complete(); const validation = validateSerpApiEvidenceArchiveEntriesV3(requiredEntries(run.result)); assert.deepEqual(validation.issues, []); });
test("T1A 21 sensitive URLs are absent", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(requiredEntries(run.result)), /serpapi\.com\/search\.json\?/i); });
test("T1A 22 images are absent", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(requiredEntries(run.result)), /image[_-]?url|thumbnail/i); });
test("T1A 23 raw HTML is absent", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(requiredEntries(run.result)), /rawhtml|<html/i); });
test("T1A 24 raw response objects are absent", async () => { const run = await complete(); assert.doesNotMatch(JSON.stringify(requiredEntries(run.result)), /"properties"\s*:/i); });
test("T1A 25 nightly and total stay prices remain distinct", async () => { const run = await complete(); const alt = run.result!.snapshots[0]!.alternatives[0]!; assert.equal(alt.nightlyPrice.state, "OBSERVED"); assert.equal(alt.totalStayPrice.state, "OBSERVED"); assert.notDeepEqual(alt.nightlyPrice, alt.totalStayPrice); });
test("T1A 26 unknown taxes are not invented", async () => { const run = await complete(); assert.equal(run.result!.snapshots[0]!.alternatives[0]!.taxesAndFeesKnown.state, "UNKNOWN"); });
test("T1A 27 unknown cancellation is not false", () => { const snapshot = createSerpApiSanitizedSnapshotV3({ pilotId: "P", manifestHash: "a".repeat(64), session: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!, response: { ...mainResponse(), ads: [], properties: [{ name: "Unknown cancellation" }] }, captureTimestamp: "2026-09-02T10:00:00Z" }); assert.equal(snapshot.alternatives[0]!.freeCancellation.state, "UNKNOWN"); });
test("T1A 28 sponsored remains a bias", async () => { const run = await complete(); assert.deepEqual(run.result!.snapshots[0]!.alternatives[0]!.sponsored, { state: "KNOWN", value: true, provenance: "SERPAPI_GOOGLE_HOTELS.ads" }); assert.ok(run.result!.snapshots[0]!.sessionBiasFlags.includes("ADVERTISING_BIAS")); });
test("T1A 29 anonymous ID cannot affect identity-elided decision inputs", async () => { const run = await complete(); const first = structuredClone(run.result!.snapshots[0]!); const second = structuredClone(first); second.alternatives.forEach((entry, index) => { entry.anonymousPropertyId = `ANON_CHANGED_${index}`; }); const elide = (value: typeof first) => value.alternatives.map(({ anonymousPropertyId: _id, ...entry }) => entry); assert.deepEqual(elide(first), elide(second)); });
test("T1A 30 input order does not alter canonical anonymous alternatives", () => { const first = createSerpApiSanitizedSnapshotV3({ pilotId: "P", manifestHash: "a".repeat(64), session: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!, response: mainResponse(), captureTimestamp: "2026-09-02T10:00:00Z" }); const reversed = mainResponse(); reversed.properties?.reverse(); const second = createSerpApiSanitizedSnapshotV3({ pilotId: "P", manifestHash: "a".repeat(64), session: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!, response: reversed, captureTimestamp: "2026-09-02T10:00:00Z" }); assert.deepEqual(first.alternatives.map(({ anonymousPropertyId: _id, displayedRank: _rank, ...entry }) => entry).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), second.alternatives.map(({ anonymousPropertyId: _id, displayedRank: _rank, ...entry }) => entry).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))); });
test("T1A 31 partial snapshot is classified", () => { const snapshot = createSerpApiSanitizedSnapshotV3({ pilotId: "P", manifestHash: "a".repeat(64), session: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!, response: { ...mainResponse(), ads: [], properties: [{ name: "Partial" }] }, captureTimestamp: "2026-09-02T10:00:00Z" }); assert.equal(snapshot.mappingCompleteness, "PARTIAL_DIAGNOSTIC_ONLY"); });
test("T1A 32 complete canary archive satisfies T3 validator", async () => { const run = await complete(); const result = validateSerpApiEvidenceArchiveEntriesV3(requiredEntries(run.result)); assert.deepEqual(result.issues, []); assert.equal(result.status, "COMPLETE"); assert.equal(result.snapshotCount, 1); assert.equal(result.replayInputAvailable, true); });
test("T1A 33 partial archive is structurally valid and partial", async () => { const run = await complete(); const result = validateSerpApiEvidenceArchiveEntriesV3(requiredEntries(run.result, true)); assert.deepEqual(result.issues, []); assert.equal(result.status, "PARTIAL"); });
test("T1A 34 unexpected archive file is rejected", async () => { const run = await complete(); const result = validateSerpApiEvidenceArchiveEntriesV3(rehash([...requiredEntries(run.result), { name: "unexpected.txt", content: "x" }])); assert.equal(result.valid, false); assert.ok(result.issues.some((issue) => issue.startsWith("ENTRY_NOT_ALLOWED"))); });
test("T1A 35 archive path traversal is rejected", async () => { const run = await complete(); const result = validateSerpApiEvidenceArchiveEntriesV3(rehash([...requiredEntries(run.result), { name: "../escape.json", content: "{}" }])); assert.equal(result.valid, false); });
test("T1A 36 archive secret is rejected", async () => { const run = await complete(); const entries = requiredEntries(run.result); entries.find((entry) => entry.name === "pilot-summary.json")!.content = JSON.stringify({ status: "COMPLETED", apiKey: "secret" }); assert.equal(validateSerpApiEvidenceArchiveEntriesV3(rehash(entries)).valid, false); });
test("T1A 37 archive raw provider ID is rejected", async () => { const run = await complete(); const entries = requiredEntries(run.result); entries.find((entry) => entry.name === "pilot-summary.json")!.content = JSON.stringify({ status: "COMPLETED", hotelId: "raw" }); assert.equal(validateSerpApiEvidenceArchiveEntriesV3(rehash(entries)).valid, false); });
test("T1A 38 corrupt archive JSON is rejected", async () => { const run = await complete(); const entries = requiredEntries(run.result); entries.find((entry) => entry.name === "pilot-summary.json")!.content = "{"; assert.equal(validateSerpApiEvidenceArchiveEntriesV3(rehash(entries)).valid, false); });
test("T1A 39 checksum mismatch is rejected", async () => { const run = await complete(); const entries = requiredEntries(run.result); entries.find((entry) => entry.name === "preflight.json")!.content = "changed"; assert.equal(validateSerpApiEvidenceArchiveEntriesV3(entries).valid, false); });
test("T1A 40 old authorization literal is revoked", async () => { const run = await execute({ literal: STAYOPTI_SERPAPI_REVOKED_AUTHORIZATION_LITERAL_V3 }); assert.equal(run.calls, 0); assert.match(String(run.error), /AUTHORIZATION_LITERAL_MISMATCH/); });
test("T1A 41 repaired authorization is source-and-execution-head-bound MAX2 and not granted", () => { assert.match(createSerpApiT2CRequiredAuthorizationLiteralV3(EXECUTION_HEAD), new RegExp(`^AUTHORIZE_V3_17T2C_MAX2_SOURCE_SHA_[0-9a-f]{40}_EXECUTION_HEAD_${EXECUTION_HEAD}_MANIFEST_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_RUNNER_${STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3}_MAIN1_DETAIL1_SESSIONS1_CONCURRENCY1_RETRIES0_PAGINATION0_QUARANTINE_AES256GCM_DPAPI_CURRENTUSER_AUTOSTOP_REMAINING_NO$`)); const gate = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts"), "utf8"); assert.match(gate, /explicitCallAuthorizationGranted:\s*false/); assert.equal(STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_VERSION_V3, "stayopti.v3.serpapi-google-hotels-retention@2"); });
test("T1A 42 tests use a fail-closed fake transport and no network", () => { const collector = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3.ts"), "utf8"); assert.doesNotMatch(collector, /\bfetch\s*\(|process\.env/); });
// T1A 01-42 are universal. T1A 43-44 require the real Windows PowerShell 5.1
// archive boundary and are enforced by the required windows-latest release job.
test("T1A 43 Evidence ZIP performs an actual PowerShell 5.1 roundtrip", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, async () => {
  const run = await complete();
  const root = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T1A-ZipTest-"));
  const staging = join(root, "staging"); const extracted = join(root, "extracted"); const zip = join(root, "evidence.zip");
  try {
    const expected = requiredEntries(run.result);
    for (const entry of expected.filter((item) => !["secret-scan.txt", "raw-id-scan.txt", "checksums.sha256"].includes(item.name))) {
      const path = join(staging, ...entry.name.split("/")); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, entry.content, "utf8");
    }
    execFileSync(process.execPath, [resolve(process.cwd(), "scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs"), `--compiled-root=${resolve(__dirname, "../..")}`, `--finalize-evidence=${staging}`], { stdio: "ignore" });
    const roundtrip = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:STAYOPTI_ZIP_STAGE,$env:STAYOPTI_ZIP_PATH,[IO.Compression.CompressionLevel]::Optimal,$false); [IO.Directory]::CreateDirectory($env:STAYOPTI_ZIP_EXTRACT)|Out-Null; [IO.Compression.ZipFile]::ExtractToDirectory($env:STAYOPTI_ZIP_PATH,$env:STAYOPTI_ZIP_EXTRACT)"], { encoding: "utf8", env: { ...process.env, STAYOPTI_ZIP_STAGE: staging, STAYOPTI_ZIP_PATH: zip, STAYOPTI_ZIP_EXTRACT: extracted } });
    assertPowerShell51Started(roundtrip, "T1A 43 ZIP roundtrip");
    assert.equal(roundtrip.status, 0, `T1A 43 ZIP roundtrip failed: ${roundtrip.stderr}`);
    const entries = expected.map((entry) => ({ name: entry.name, content: readFileSync(join(extracted, ...entry.name.split("/")), "utf8") }));
    assert.equal(validateSerpApiEvidenceArchiveEntriesV3(entries).valid, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test("T1A 44 a corrupted ZIP container is rejected by the ZIP parser", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T1A-CorruptZip-")); const zip = join(root, "corrupt.zip");
  try {
    writeFileSync(zip, "not-a-zip", "utf8");
    const corruptionProbe = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "try { Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead($env:STAYOPTI_ZIP_PATH); $z.Dispose(); Write-Output 'CORRUPT_ZIP_UNEXPECTEDLY_OPENED'; exit 0 } catch { Write-Output 'CORRUPT_ZIP_REJECTED_BY_DOTNET'; exit 23 }"], { encoding: "utf8", env: { ...process.env, STAYOPTI_ZIP_PATH: zip } });
    assertPowerShell51Started(corruptionProbe, "T1A 44 corrupted ZIP probe");
    assert.equal(corruptionProbe.status, 23);
    assert.match(corruptionProbe.stdout, /CORRUPT_ZIP_REJECTED_BY_DOTNET/);
    assert.doesNotMatch(corruptionProbe.stdout, /CORRUPT_ZIP_UNEXPECTEDLY_OPENED/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
