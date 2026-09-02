import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createProviderRawQuarantineEnvelopeV3,
  decryptProviderRawQuarantineEnvelopeV3,
  validateProviderRawQuarantineEnvelopeV3,
  type StayOptiProviderRawKeyProtectorV3,
} from "../../src/engine-v3/evaluation/providerRawQuarantineV3";
import {
  classifySerpApiPropertyDetailShapeV3,
  mergeSerpApiDetailResponseV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3";
import {
  createSerpApiResponseDiagnosticV3,
  executeSerpApiGoogleHotelsPilotEvidenceV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3";
import {
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  createSerpApiT2CRequiredAuthorizationLiteralV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import { replaySerpApiGoogleHotelsPrivateRawV3 } from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3";

const CAPTURED_AT = "2026-09-02T07:48:00.000Z";
const SYNTHETIC_TOKEN = "SYNTHETIC_TRANSIENT_PROPERTY_REFERENCE";
const protector: StayOptiProviderRawKeyProtectorV3 = {
  protectionClass: "SYNTHETIC_TEST_ONLY",
  protectDataKey(value) { return Buffer.from(value, "base64").reverse().toString("base64"); },
  unprotectDataKey(value) { return Buffer.from(value, "base64").reverse().toString("base64"); },
};

const mainBody = {
  search_metadata: { status: "Success", created_at: CAPTURED_AT },
  search_parameters: {
    q: "Synthetic European destination",
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
    name: "Synthetic accommodation",
    property_token: SYNTHETIC_TOKEN,
    type: "hotel",
    overall_rating: 4.5,
    reviews: 200,
    total_rate: { extracted_lowest: 320 },
  }],
};

const unwrappedDetailBody = {
  search_metadata: { status: "Success" },
  search_parameters: { engine: "google_hotels" },
  name: "Synthetic accommodation detail",
  type: "hotel",
  extracted_hotel_class: 4,
  gps_coordinates: { latitude: 43.7, longitude: 11.2 },
  amenities: ["Synthetic amenity"],
  free_cancellation: true,
  provider_id: "SYNTHETIC_RAW_PROVIDER_ID",
};

function envelope(requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL", body: unknown, requestOrdinal: number) {
  return createProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: JSON.stringify(body),
    disposition: requestKind === "MAIN_SEARCH" ? "PROCESSED_SUCCESS" : "UNRECOGNIZED_PARTIAL_OR_ERROR",
    keyProtector: protector,
    metadata: {
      providerKey: "SERPAPI_GOOGLE_HOTELS",
      endpointClass: "GOOGLE_HOTELS_SEARCH",
      sessionReference: "SERP_PILOT_01_FLORENCE_COUPLE_BALANCED",
      requestKind,
      requestOrdinal,
      capturedAt: CAPTURED_AT,
    },
  });
}

function replay(detailBody: unknown = unwrappedDetailBody) {
  return replaySerpApiGoogleHotelsPrivateRawV3({
    mainEnvelope: envelope("MAIN_SEARCH", mainBody, 1),
    detailEnvelopes: [{ envelope: envelope("PROPERTY_DETAIL", detailBody, 2), alternativeRank: 1 }],
    keyProtector: protector,
    pilotId: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.pilotId,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    session: STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0]!,
    replayTimestamp: "2026-09-02T08:00:00.000Z",
  });
}

test("T2D 01 an unwrapped property detail is recognized structurally", () => {
  assert.equal(classifySerpApiPropertyDetailShapeV3(unwrappedDetailBody), "UNWRAPPED_PROPERTY");
});

test("T2D 02 historical wrapped property detail shapes remain supported", () => {
  assert.equal(classifySerpApiPropertyDetailShapeV3({ property: { amenities: [] } }), "WRAPPED_PROPERTY");
  assert.equal(classifySerpApiPropertyDetailShapeV3({ properties: [{ amenities: [] }] }), "WRAPPED_PROPERTIES_ARRAY");
  assert.equal(classifySerpApiPropertyDetailShapeV3({ ads: [{ amenities: [] }] }), "WRAPPED_ADS_ARRAY");
});

test("T2D 03 the generalized unwrapped detail merges without changing base identity", () => {
  const merged = mergeSerpApiDetailResponseV3(mainBody, 1, unwrappedDetailBody);
  assert.equal(merged.properties?.[0]?.name, mainBody.properties[0]!.name);
  assert.deepEqual(merged.properties?.[0]?.amenities, ["Synthetic amenity"]);
  assert.equal(merged.properties?.[0]?.hotel_class, 4);
});

test("T2D 04 main plus unwrapped detail replays successfully offline", () => {
  const result = replay();
  assert.equal(result.networkRequests, 0);
  assert.equal(result.credentialsLoaded, false);
  assert.equal(result.encryptedInputsVerified, 2);
  assert.equal(result.snapshot.alternatives[0]!.detailEnrichmentStatus, "MERGED");
});

test("T2D 05 provider error remains a controlled provider error", () => {
  const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 1, httpStatus: 200, contentType: "application/json", bodyParsed: true, body: { error: "synthetic message excluded" } });
  assert.equal(diagnostic.errorClass, "PROVIDER_ERROR_FIELD_PRESENT");
  assert.doesNotMatch(JSON.stringify(diagnostic), /synthetic message excluded/);
});

test("T2D 06 asynchronous incomplete status remains fail closed", () => {
  const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 1, httpStatus: 200, contentType: "application/json", bodyParsed: true, body: { ...unwrappedDetailBody, search_metadata: { status: "Processing" } } });
  assert.equal(diagnostic.errorClass, "ASYNC_INCOMPLETE_STATUS");
});

test("T2D 07 unexpected top-level shape remains rejected", () => {
  assert.equal(classifySerpApiPropertyDetailShapeV3({ search_metadata: { status: "Success" }, unrelated: true }), "UNSUPPORTED");
});

test("T2D 08 missing property identity wrapper remains rejected", () => {
  assert.equal(classifySerpApiPropertyDetailShapeV3({ amenities: ["Synthetic amenity"] }), "UNSUPPORTED");
});

test("T2D 09 an explicitly wrong content type is rejected", () => {
  const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 1, httpStatus: 200, contentType: "text/html", bodyParsed: true, body: unwrappedDetailBody });
  assert.equal(diagnostic.errorClass, "CONTENT_TYPE_UNSUPPORTED");
});

test("T2D 10 a non-JSON body is rejected", () => {
  const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 1, httpStatus: 200, contentType: "application/json", bodyParsed: false, body: null });
  assert.equal(diagnostic.errorClass, "NON_JSON_OR_NON_OBJECT_RESPONSE");
});

test("T2D 11 ciphertext tampering is rejected", () => {
  const item = envelope("PROPERTY_DETAIL", unwrappedDetailBody, 2);
  assert.throws(() => decryptProviderRawQuarantineEnvelopeV3({ ...item, ciphertextBase64: `${item.ciphertextBase64.slice(0, -4)}AAAA` }, protector), /TAMPERED|AUTHENTICATION/);
});

test("T2D 12 authenticated hash substitution is rejected", () => {
  const item = envelope("PROPERTY_DETAIL", unwrappedDetailBody, 2);
  assert.equal(validateProviderRawQuarantineEnvelopeV3({ ...item, plaintextSha256: "0".repeat(64) }).valid, false);
});

test("T2D 13 parser exceptions create no plaintext replay file", () => {
  assert.throws(() => replay({ search_metadata: { status: "Success" }, unexpected: true }), /DETAIL_RESPONSE_NOT_PROCESSABLE/);
  assert.equal(decryptProviderRawQuarantineEnvelopeV3(envelope("PROPERTY_DETAIL", unwrappedDetailBody, 2), protector), JSON.stringify(unwrappedDetailBody));
});

test("T2D 14 provider token and provider identifier do not survive replay", () => {
  const serialized = JSON.stringify(replay());
  assert.doesNotMatch(serialized, new RegExp(SYNTHETIC_TOKEN));
  assert.doesNotMatch(serialized, /SYNTHETIC_RAW_PROVIDER_ID/);
});

test("T2D 15 observed aggregated price is not promoted to exact bookable", () => {
  const alternative = replay().snapshot.alternatives[0]!;
  assert.equal(alternative.totalStayPrice.state, "OBSERVED");
  assert.notEqual(alternative.exactBookableOfferKnown.value, true);
});

test("T2D 16 private replay has no network or credential capability", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|SERPAPI_API_KEY|process\.env/);
});

test("T2D 17 core V3 does not import the repair boundary", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8");
  assert.doesNotMatch(source, /serpApiGoogleHotelsPrivateReplay|serpApiGoogleHotelsPilotEvidence/);
});

test("T2D 18 Stage REMAINING and automatic Golden admission remain disabled", () => {
  const stage = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3.ts"), "utf8");
  assert.match(stage, /remainingStageAuthorized:\s*false/);
  assert.match(stage, /automaticGoldenAdmission:\s*false/);
});

test("T2D 19 the collector accepts the generalized direct-root detail without retry", async () => {
  const executionHead = "1".repeat(40);
  let calls = 0;
  const raw = new Map<string, string>();
  const snapshots = new Map<string, string>();
  const result = await executeSerpApiGoogleHotelsPilotEvidenceV3({
    authorization: {
      authorizationState: "AUTHORIZED_NOT_STARTED",
      literal: createSerpApiT2CRequiredAuthorizationLiteralV3(executionHead),
      stage: "CANARY",
      sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
      executionHead,
      manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
      accountPlan: "FREE",
      retentionAuthorized: true,
    },
    apiKey: "SYNTHETIC_TEST_KEY_NOT_REAL",
    observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    observedExecutionHead: executionHead,
    nowIso: "2026-09-02T00:00:00Z",
    clock: () => CAPTURED_AT,
    transport: {
      async send(request) {
        calls += 1;
        return request.requestKind === "MAIN_SEARCH"
          ? { httpStatus: 200, contentType: "application/json", body: mainBody }
          : { httpStatus: 200, contentType: "application/json; charset=utf-8", body: unwrappedDetailBody };
      },
    },
    rawStore: {
      writeEphemeral(name, value) { raw.set(name, value); },
      removeEphemeral(name) { raw.delete(name); },
      removeAllEphemeral() { raw.clear(); },
      existsEphemeral(name) { return raw.has(name); },
    },
    evidenceStore: {
      writeSnapshotAtomic(name, value) { snapshots.set(name, value); },
      readSnapshot(name) { const value = snapshots.get(name); if (value === undefined) throw new Error("missing snapshot"); return value; },
    },
    privateRawQuarantine: {
      protectionReady: true,
      capture(input) { return { entryId: `RAWQ_SYNTHETIC_${input.metadata.requestOrdinal}`, envelopeFingerprint: "a".repeat(64) }; },
      markProcessedSuccess(handle) { return handle; },
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.receipt.status, "COMPLETED");
  assert.equal(result.snapshots[0]!.alternatives[0]!.detailEnrichmentStatus, "MERGED");
});
