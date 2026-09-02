import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

import {
  STAYOPTI_SERPAPI_T2E_ARTIFACTS_V3,
  STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3,
  STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3,
  STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3,
  createSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3,
  createSerpApiPropertyDetailParserSchemaFingerprintV3,
  validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3,
  type StayOptiSerpApiOfflineEvidenceSealEntryV3,
  type StayOptiSerpApiOfflineEvidenceSealInputV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsOfflineEvidenceSealV3";
import { classifySerpApiPropertyDetailShapeV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import { STAYOPTI_SERPAPI_PRIVATE_REPLAY_PARSER_VERSION_V3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);

function input(overrides: Partial<StayOptiSerpApiOfflineEvidenceSealInputV3> = {}): StayOptiSerpApiOfflineEvidenceSealInputV3 {
  return {
    sealedAt: "2026-09-02T12:00:00.000Z",
    sessionFingerprint: "e".repeat(64),
    encryptedRawSha256: [HASH_A, HASH_B],
    encryptedRawEnvelopeFingerprints: [HASH_C, HASH_D],
    observedReplaySchemaFingerprint: "f".repeat(64),
    resultCount: 29,
    mergedDetailCount: 1,
    targetedTests: "PASS_25_OF_25",
    engineV3Regression: "PASS_1316_OF_1316",
    engineV2Regression: "PASS_196_OF_196",
    typescriptCompile: "PASS",
    powershell51Parse: "PASS",
    secretScan: "PASS",
    rawDataScan: "PASS",
    rawIdTokenScan: "PASS",
    licenseProvenanceScan: "PASS",
    ...overrides,
  };
}

function entries() { return createSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(input()); }
function replace(entriesValue: readonly StayOptiSerpApiOfflineEvidenceSealEntryV3[], name: StayOptiSerpApiOfflineEvidenceSealEntryV3["name"], mutate: (content: string) => string) {
  return entriesValue.map((entry) => entry.name === name ? { ...entry, content: mutate(entry.content) } : entry);
}

test("T2E 01 creates the exact fifteen-artifact sanitized seal", () => {
  const created = entries();
  assert.equal(created.length, 15);
  assert.deepEqual(created.map((entry) => entry.name).sort(), [...STAYOPTI_SERPAPI_T2E_ARTIFACTS_V3].sort());
});
test("T2E 02 the complete seal validates with fourteen internal checksums", () => {
  const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(entries());
  assert.equal(result.valid, true); assert.equal(result.checksumCount, 14); assert.match(result.sealContextHash!, /^[0-9a-f]{64}$/);
});
test("T2E 03 the original Evidence hash is frozen", () => { assert.equal(STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3, "647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e"); });
test("T2E 04 the repair commit is frozen", () => { assert.equal(STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3, "2ec5cdaf314b363e2b48dbf856badd9c78591f66"); });
test("T2E 05 the private replay parser version is bound", () => { assert.equal(STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3, STAYOPTI_SERPAPI_PRIVATE_REPLAY_PARSER_VERSION_V3); });
test("T2E 06 parser schema fingerprint is deterministic", () => { assert.equal(createSerpApiPropertyDetailParserSchemaFingerprintV3(), createSerpApiPropertyDetailParserSchemaFingerprintV3()); assert.match(createSerpApiPropertyDetailParserSchemaFingerprintV3(), /^[0-9a-f]{64}$/); });
test("T2E 07 direct-root property detail remains accepted by repaired parser", () => { assert.equal(classifySerpApiPropertyDetailShapeV3({ name: "SYNTHETIC_STAY", amenities: ["WIFI"] }), "UNWRAPPED_PROPERTY"); });
test("T2E 08 historical wrapped property forms remain accepted", () => { assert.equal(classifySerpApiPropertyDetailShapeV3({ property: { name: "SYNTHETIC" } }), "WRAPPED_PROPERTY"); });
test("T2E 09 tampering one artifact invalidates the seal", () => { const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(replace(entries(), "final-decision.json", (content) => content.replace('"ABORTED"', '"PASS"'))); assert.equal(result.valid, false); assert.ok(result.issues.some((issue) => issue.includes("CHECKSUM_MISMATCH"))); });
test("T2E 10 omission of a required artifact is rejected", () => { const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(entries().filter((entry) => entry.name !== "root-cause-receipt.json")); assert.equal(result.valid, false); assert.ok(result.issues.includes("SERPAPI_T2E_ARTIFACT_SET_INVALID")); });
test("T2E 11 repair commit mismatch is rejected", () => { const changed = replace(entries(), "repair-commit-receipt.json", (content) => { const value = JSON.parse(content); value.repairCommitSha = "0".repeat(40); return `${JSON.stringify(value, null, 2)}\n`; }); const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(changed); assert.equal(result.valid, false); assert.ok(result.issues.includes("SERPAPI_T2E_REPAIR_COMMIT_MISMATCH")); });
test("T2E 12 parser fingerprint mismatch is rejected", () => { const changed = replace(entries(), "parser-schema-fingerprint.json", (content) => content.replace(createSerpApiPropertyDetailParserSchemaFingerprintV3(), HASH_A)); const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(changed); assert.equal(result.valid, false); assert.ok(result.issues.includes("SERPAPI_T2E_PARSER_SCHEMA_FINGERPRINT_MISMATCH")); });
test("T2E 13 source Evidence mismatch is rejected", () => { const changed = replace(entries(), "source-evidence-reference.json", (content) => content.replace(STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3, HASH_A)); const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(changed); assert.equal(result.valid, false); assert.ok(result.issues.includes("SERPAPI_T2E_SOURCE_EVIDENCE_MISMATCH")); });
test("T2E 14 unsafe secret-like values are rejected", () => { const changed = replace(entries(), "security-scan-receipt.json", (content) => content.replace('"credentialsLoaded": false', '"credentialsLoaded": false, "apiKey": "SYNTHETIC_SECRET_VALUE"')); const result = validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(changed); assert.equal(result.valid, false); assert.ok(result.issues.some((issue) => issue.includes("UNSAFE_ARTIFACT"))); });
test("T2E 15 property references and raw provider IDs cannot enter the seal", () => { for (const field of ["propertyToken", "providerId", "hotelId", "rawPayload"]) { const changed = replace(entries(), "security-scan-receipt.json", (content) => content.replace('"credentialsLoaded": false', `"credentialsLoaded": false, "${field}": "SYNTHETIC"`)); assert.equal(validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(changed).valid, false); } });
test("T2E 16 URLs and query strings cannot enter the seal", () => { const changed = replace(entries(), "security-scan-receipt.json", (content) => content.replace('"credentialsLoaded": false', '"credentialsLoaded": false, "note": "https://invalid.example/?x=1"')); assert.equal(validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(changed).valid, false); });
test("T2E 17 live canary remains ABORTED while offline replay is PASS", () => { const final = JSON.parse(entries().find((entry) => entry.name === "final-decision.json")!.content); assert.equal(final.liveCanaryStatus, "ABORTED"); assert.equal(final.offlineReplayStatus, "PASS"); });
test("T2E 18 replay before fails and replay after passes", () => { const created = entries(); assert.equal(JSON.parse(created.find((entry) => entry.name === "replay-before-repair.json")!.content).propertyDetailReplay, "FAIL"); assert.equal(JSON.parse(created.find((entry) => entry.name === "replay-after-repair.json")!.content).propertyDetailReplay, "PASS"); });
test("T2E 19 automatic Golden admission and Stage REMAINING remain disabled", () => { const final = JSON.parse(entries().find((entry) => entry.name === "final-decision.json")!.content); assert.equal(final.automaticGoldenAdmission, false); assert.equal(final.remainingStageAuthorized, false); assert.equal(final.remainingStageStarted, false); });
test("T2E 20 observed prices remain non-exact", () => { const price = JSON.parse(entries().find((entry) => entry.name === "price-semantics-receipt.json")!.content); assert.equal(price.observedPriceCount, 20); assert.equal(price.missingPriceCount, 9); assert.equal(price.exactBookablePriceInvented, false); });
test("T2E 21 provider neutrality is explicitly sealed", () => { const receipt = JSON.parse(entries().find((entry) => entry.name === "provider-neutrality-receipt.json")!.content); assert.equal(receipt.providerNeutrality, "PASS"); assert.equal(receipt.v3CoreImportsSerpApi, false); });
test("T2E 22 core V3 does not import SerpApi seal or replay modules", () => { const core = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8"); assert.doesNotMatch(core, /serpApiGoogleHotelsOfflineEvidenceSeal|serpApiGoogleHotelsPrivateReplay/); });
test("T2E 23 duplicate encrypted raw bindings are rejected", () => { assert.throws(() => createSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(input({ encryptedRawSha256: [HASH_A, HASH_A] })), /RAW_BINDING_NOT_UNIQUE/); });
test("T2E 24 seal construction cannot claim failed regression gates", () => { assert.throws(() => createSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(input({ typescriptCompile: "FAIL" as "PASS" })), /REQUIRED_GATE_NOT_PASS/); });
test("T2E 25 seal module has no network, credential, quarantine-path or file-I\/O capability", () => { const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsOfflineEvidenceSealV3.ts"), "utf8"); assert.doesNotMatch(source, /\bfetch\s*\(|SERPAPI_API_KEY|LOCALAPPDATA|readFileSync|writeFileSync|node:fs|node:https|node:http/); });
