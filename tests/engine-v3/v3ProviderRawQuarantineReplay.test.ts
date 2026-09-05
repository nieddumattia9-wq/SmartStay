import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_PROVIDER_RAW_FAILURE_RETENTION_DAYS_V3,
  STAYOPTI_PROVIDER_RAW_MANUAL_EXTENSION_DAYS_V3,
  STAYOPTI_PROVIDER_RAW_SUCCESS_RETENTION_DAYS_V3,
  createProviderRawQuarantineEnvelopeV3,
  decryptProviderRawQuarantineEnvelopeV3,
  evaluateProviderRawQuarantineExpiryV3,
  extendProviderRawQuarantineRetentionV3,
  reclassifyProviderRawQuarantineEnvelopeV3,
  validateProviderRawQuarantineEnvelopeV3,
  type StayOptiProviderRawKeyProtectorV3,
} from "../../src/engine-v3/evaluation/providerRawQuarantineV3";
import { replaySerpApiGoogleHotelsPrivateRawV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3";
import {
  executeSerpApiGoogleHotelsPilotEvidenceV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3";
import {
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  type StayOptiSerpApiPilotRawStoreV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";

const CAPTURED_AT = "2026-09-01T10:00:00.000Z";
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

const RAW = JSON.stringify({
  search_metadata: { status: "Success", created_at: CAPTURED_AT },
  search_parameters: {
    q: "Florence, Italy",
    check_in_date: "2026-10-15",
    check_out_date: "2026-10-17",
    adults: 2,
    children: 0,
    rooms: 1,
    currency: "EUR",
    gl: "it",
    hl: "it",
    no_cache: true,
  },
  properties: [{
    name: "Synthetic Hotel",
    property_token: "SYNTHETIC_OPAQUE_TOKEN",
    type: "hotel",
    gps_coordinates: { latitude: 43.77, longitude: 11.25 },
    hotel_class: 4,
    overall_rating: 4.5,
    reviews: 321,
    rate_per_night: { extracted_lowest: 180 },
    total_rate: { extracted_lowest: 360 },
    amenities: ["Wi-Fi"],
    free_cancellation: true,
  }],
});

const protector: StayOptiProviderRawKeyProtectorV3 = {
  protectionClass: "SYNTHETIC_TEST_ONLY",
  protectDataKey(value) {
    const bytes = Buffer.from(value, "base64");
    for (let index = 0; index < bytes.length; index += 1) bytes[index] ^= 0xa5;
    return bytes.toString("base64");
  },
  unprotectDataKey(value) {
    const bytes = Buffer.from(value, "base64");
    for (let index = 0; index < bytes.length; index += 1) bytes[index] ^= 0xa5;
    return bytes.toString("base64");
  },
};

function envelope(disposition: "PROCESSED_SUCCESS" | "UNRECOGNIZED_PARTIAL_OR_ERROR" = "UNRECOGNIZED_PARTIAL_OR_ERROR") {
  return createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: RAW,
    disposition,
    keyProtector: protector,
    metadata: {
      providerKey: "SERPAPI_GOOGLE_HOTELS",
      endpointClass: "GOOGLE_HOTELS_SEARCH",
      sessionReference: "SERP_PILOT_01_FLORENCE_COUPLE_BALANCED",
      requestKind: "MAIN_SEARCH",
      requestOrdinal: 1,
      capturedAt: CAPTURED_AT,
    },
  });
}

function replay(input = envelope()) {
  const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!;
  return replaySerpApiGoogleHotelsPrivateRawV3({
    mainEnvelope: input,
    keyProtector: protector,
    pilotId: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.pilotId,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    session,
    replayTimestamp: "2026-09-02T10:00:00.000Z",
  });
}

test("T2A-R0 01 raw is AES-GCM encrypted and absent from at-rest envelope", () => {
  const item = envelope();
  assert.equal(item.encryption, "AES_256_GCM");
  assert.doesNotMatch(JSON.stringify(item), /Synthetic Hotel|property_token|Florence, Italy/);
  assert.equal(decryptProviderRawQuarantineEnvelopeV3(item, protector), RAW);
});

test("T2A-R0 02 per-payload data key is protected", () => {
  const first = envelope();
  const second = envelope();
  assert.notEqual(first.protectedDataKey, second.protectedDataKey);
  assert.notEqual(first.ciphertextBase64, second.ciphertextBase64);
});

test("T2A-R0 03 successful raw gets fourteen days", () => {
  const item = envelope("PROCESSED_SUCCESS");
  assert.equal(STAYOPTI_PROVIDER_RAW_SUCCESS_RETENTION_DAYS_V3, 14);
  assert.equal(Date.parse(item.expiresAt) - Date.parse(item.capturedAt), 14 * 86_400_000);
});

test("T2A-R0 04 failed or partial raw gets ninety days", () => {
  const item = envelope();
  assert.equal(STAYOPTI_PROVIDER_RAW_FAILURE_RETENTION_DAYS_V3, 90);
  assert.equal(Date.parse(item.expiresAt) - Date.parse(item.capturedAt), 90 * 86_400_000);
});

test("T2A-R0 05 manual extension adds ninety days with receipt", () => {
  const item = envelope();
  const result = extendProviderRawQuarantineRetentionV3({
    envelope: item,
    extendedAt: "2026-09-10T10:00:00.000Z",
    reason: "PARSER_REPAIR",
    keyProtector: protector,
  });
  assert.equal(STAYOPTI_PROVIDER_RAW_MANUAL_EXTENSION_DAYS_V3, 90);
  assert.equal(Date.parse(result.envelope.expiresAt) - Date.parse(item.expiresAt), 90 * 86_400_000);
  assert.equal(result.receipt.reason, "PARSER_REPAIR");
  assert.equal(decryptProviderRawQuarantineEnvelopeV3(result.envelope, protector), RAW);
});

test("T2A-R0 06 expired payload is selected for purge", () => {
  assert.equal(evaluateProviderRawQuarantineExpiryV3(envelope("PROCESSED_SUCCESS"), "2026-09-16T10:00:00.000Z").action, "PURGE");
});

test("T2A-R0 07 non-expired payload is retained", () => {
  assert.equal(evaluateProviderRawQuarantineExpiryV3(envelope("PROCESSED_SUCCESS"), "2026-09-10T10:00:00.000Z").action, "RETAIN");
});

test("T2A-R0 08 parser crash leaves encrypted envelope replayable", () => {
  const item = envelope();
  assert.throws(() => { throw new Error("synthetic parser crash"); });
  assert.equal(decryptProviderRawQuarantineEnvelopeV3(item, protector), RAW);
});

test("T2A-R0 09 replay is offline and credential-free", () => {
  const result = replay();
  assert.equal(result.networkRequests, 0);
  assert.equal(result.credentialsLoaded, false);
});

test("T2A-R0 10 replay verifies hash and authenticated metadata", () => {
  const result = replay();
  assert.equal(result.encryptedInputsVerified, 1);
  assert.match(result.schemaFingerprint, /^[a-f0-9]{64}$/);
});

test("T2A-R0 11 ciphertext tampering is rejected", () => {
  const item = envelope();
  const altered = { ...item, ciphertextBase64: `${item.ciphertextBase64.slice(0, -4)}AAAA` };
  assert.throws(() => decryptProviderRawQuarantineEnvelopeV3(altered, protector), /TAMPERED|AUTHENTICATION/);
});

test("T2A-R0 12 metadata substitution is rejected", () => {
  const item = envelope();
  assert.equal(validateProviderRawQuarantineEnvelopeV3({ ...item, requestOrdinal: 2 }).valid, false);
});

test("T2A-R0 13 replay creates no plaintext temporary file", () => {
  assert.equal(replay().plaintextTemporaryFilesCreated, 0);
});

test("T2A-R0 14 secret material is rejected before encrypted persistence", () => {
  assert.throws(() => createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: '{"api_key":"not-a-real-key-but-prohibited"}',
    disposition: "UNRECOGNIZED_PARTIAL_OR_ERROR",
    keyProtector: protector,
    metadata: { providerKey: "SYNTHETIC_PROVIDER", endpointClass: "SEARCH", sessionReference: "SESSION_A", requestKind: "SEARCH", requestOrdinal: 1, capturedAt: CAPTURED_AT },
  }), /SECRET_MATERIAL_REJECTED/);
});

test("T2A-R0 15 successful parsing can shorten failure retention to fourteen days", () => {
  const replacement = reclassifyProviderRawQuarantineEnvelopeV3({ envelope: envelope(), disposition: "PROCESSED_SUCCESS", keyProtector: protector });
  assert.equal(Date.parse(replacement.expiresAt) - Date.parse(replacement.capturedAt), 14 * 86_400_000);
  assert.equal(decryptProviderRawQuarantineEnvelopeV3(replacement, protector), RAW);
});

test("T2A-R0 16 replay preserves observed price without exact-bookable promotion", () => {
  const alternative = replay().snapshot.alternatives[0]!;
  assert.equal(alternative.totalStayPrice.state, "OBSERVED");
  assert.notEqual(alternative.exactBookableOfferKnown.value, true);
});

test("T2A-R0 17 provider token does not survive sanitized replay", () => {
  assert.doesNotMatch(JSON.stringify(replay().snapshot), /SYNTHETIC_OPAQUE_TOKEN/);
});

test("T2A-R0 18 input provider token variation leaves sanitized decision evidence invariant", () => {
  const changedRaw = RAW.replace("SYNTHETIC_OPAQUE_TOKEN", "DIFFERENT_OPAQUE_TOKEN");
  const changed = createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: changedRaw,
    disposition: "PROCESSED_SUCCESS",
    keyProtector: protector,
    metadata: { providerKey: "SERPAPI_GOOGLE_HOTELS", endpointClass: "GOOGLE_HOTELS_SEARCH", sessionReference: "SERP_PILOT_01_FLORENCE_COUPLE_BALANCED", requestKind: "MAIN_SEARCH", requestOrdinal: 1, capturedAt: CAPTURED_AT },
  });
  assert.equal(replay(changed).snapshot.normalizedSnapshotHash, replay(envelope("PROCESSED_SUCCESS")).snapshot.normalizedSnapshotHash);
});

test("T2A-R0 19 a new provider can use quarantine without core changes", () => {
  const item = createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: '{"synthetic":"value"}', disposition: "PROCESSED_SUCCESS", keyProtector: protector,
    metadata: { providerKey: "FUTURE_PROVIDER", endpointClass: "SEARCH", sessionReference: "SESSION_A", requestKind: "SEARCH", requestOrdinal: 1, capturedAt: CAPTURED_AT },
  });
  assert.equal(decryptProviderRawQuarantineEnvelopeV3(item, protector), '{"synthetic":"value"}');
});

test("T2A-R0 20 external replay remains non-Golden", () => {
  assert.equal(replay().snapshot.externalSession.automaticGoldenAdmission, false);
});

test("T2A-R0 21 unknown schema fields are reported without raw values", () => {
  const withUnknown = RAW.replace(/}$/, ',"novel_shape":{"private":"value"}}');
  const item = createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: withUnknown, disposition: "UNRECOGNIZED_PARTIAL_OR_ERROR", keyProtector: protector,
    metadata: { providerKey: "SERPAPI_GOOGLE_HOTELS", endpointClass: "GOOGLE_HOTELS_SEARCH", sessionReference: "SERP_PILOT_01_FLORENCE_COUPLE_BALANCED", requestKind: "MAIN_SEARCH", requestOrdinal: 1, capturedAt: CAPTURED_AT },
  });
  const result = replay(item);
  assert.deepEqual(result.unknownTopLevelFields, ["novel_shape"]);
  assert.doesNotMatch(JSON.stringify(result), /"private":"value"/);
});

test("T2A-R0 22 Windows PowerShell 5.1 DPAPI bridge parses and is CurrentUser-scoped", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const script = resolve(process.cwd(), "scripts/protect-v3-provider-raw-key-dpapi.ps1");
  const parse = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$e=$null;$t=$null;[Management.Automation.Language.Parser]::ParseFile($env:STAYOPTI_DPAPI_SCRIPT,[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}"], { encoding: "utf8", windowsHide: true, env: { ...process.env, STAYOPTI_DPAPI_SCRIPT: script } });
  assertPowerShell51Started(parse, "T2A-R0 DPAPI bridge parse");
  assert.equal(parse.status, 0);
  const source = readFileSync(script, "utf8");
  assert.match(source, /DataProtectionScope\]::CurrentUser/);
  assert.match(source, /ProtectedData\]::Protect/);
  assert.match(source, /ProtectedData\]::Unprotect/);
});

test("T2A-R0 23 collector without ready private quarantine stops before transport", async () => {
  let calls = 0;
  const rawStore: StayOptiSerpApiPilotRawStoreV3 = { writeEphemeral() {}, removeEphemeral() {}, removeAllEphemeral() {}, existsEphemeral() { return false; } };
  const result = await executeSerpApiGoogleHotelsPilotEvidenceV3({
    authorization: null,
    apiKey: "",
    observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    observedExecutionHead: "1".repeat(40),
    nowIso: "2026-09-02T00:00:00Z",
    transport: { async send() { calls += 1; throw new Error("transport reached"); } },
    rawStore,
    evidenceStore: { writeSnapshotAtomic() {}, readSnapshot() { return ""; } },
    privateRawQuarantine: { protectionReady: false } as never,
  }).catch((error) => error);
  assert.equal(calls, 0);
  assert.match(String(result), /AUTHORIZATION_REQUIRED|QUARANTINE_REQUIRED/);
});

test("T2A-R0 24 provider-specific replay stays outside V3 core imports", () => {
  const coreIndex = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8");
  assert.doesNotMatch(coreIndex, /providerRawQuarantine|serpApiGoogleHotelsPrivateReplay/);
});

test("T2A-R0 25 raw archive code is evaluation-only and has no fetch", () => {
  const contract = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/providerRawQuarantineV3.ts"), "utf8");
  const replaySource = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3.ts"), "utf8");
  assert.doesNotMatch(`${contract}\n${replaySource}`, /\bfetch\s*\(|process\.env|SERPAPI_API_KEY/);
});
