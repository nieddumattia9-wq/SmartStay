import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3,
  STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3,
  STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import {
  STAYOPTI_SERPAPI_T2B_MAX2_STAGE_POLICY_V3,
  StayOptiSerpApiStagedRequestLedgerV3,
  stageSessionIndexesV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3";
import {
  createSerpApiResponseDiagnosticV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3";
import {
  STAYOPTI_PROVIDER_RAW_FAILURE_RETENTION_DAYS_V3,
  STAYOPTI_PROVIDER_RAW_SUCCESS_RETENTION_DAYS_V3,
  createProviderRawQuarantineEnvelopeV3,
  decryptProviderRawQuarantineEnvelopeV3,
  validateProviderRawQuarantineEnvelopeV3,
  type StayOptiProviderRawKeyProtectorV3,
} from "../../src/engine-v3/evaluation/providerRawQuarantineV3";

const stage = STAYOPTI_SERPAPI_T2B_MAX2_STAGE_POLICY_V3;
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const protector: StayOptiProviderRawKeyProtectorV3 = {
  protectionClass: "SYNTHETIC_TEST_ONLY",
  protectDataKey(value) { return Buffer.from(value, "utf8").toString("base64"); },
  unprotectDataKey(value) { return Buffer.from(value, "base64").toString("utf8"); },
};
const metadata = {
  providerKey: "SYNTHETIC_SOURCE",
  endpointClass: "SYNTHETIC_SEARCH",
  sessionReference: "SESSION_001",
  requestKind: "MAIN_SEARCH",
  requestOrdinal: 1,
  capturedAt: "2026-09-01T10:00:00.000Z",
};

function ledger() {
  return new StayOptiSerpApiStagedRequestLedgerV3({
    pilotId: "PILOT",
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    runnerBundleHash: "a".repeat(64),
    stage: "CANARY",
    allowedSessionIndexes: [0],
    maximumRequests: 2,
  });
}

function validateMain(value: StayOptiSerpApiStagedRequestLedgerV3) {
  const ordinal = value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "MAIN_SEARCH" });
  value.transmit(ordinal, "2026-09-01T10:00:00.000Z");
  value.validate(ordinal, "b".repeat(64), true, true);
}

test("T2B 01 MAX2 policy is exact", () => assert.deepEqual(stage, {
  maximumTotalRequests: 2, mainSearchMaximum: 1, propertyDetailMaximum: 1,
  sessionsMaximum: 1, maximumConcurrency: 1, retryBudget: 0, paginationBudget: 0,
  propertyDetailSelectionMaximum: 1, autostop: true, remainingStageAuthorized: false,
  automaticGoldenAdmission: false, encryptedPrivateQuarantineRequired: true,
}));
test("T2B 02 literal binds the required source checkpoint", () => assert.match(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3, new RegExp(`HEAD_${STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3}_`)));
test("T2B 03 literal binds manifest and MAX2 dimensions", () => assert.match(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3, new RegExp(`MANIFEST_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_[\\s\\S]*MAIN1_DETAIL1_SESSIONS1_CONCURRENCY1_RETRIES0_PAGINATION0`)));
test("T2B 04 literal binds encrypted quarantine, autostop and no remaining", () => assert.match(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3, /QUARANTINE_AES256GCM_DPAPI_CURRENTUSER_AUTOSTOP_REMAINING_NO$/));
test("T2B 05 literal is generated but not authorized", () => assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.explicitCallAuthorizationGranted, false));
test("T2B 06 prior e485 MAX2 literal is revoked", () => assert.ok(STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3.some((value) => value.includes("e48525178e847c30e0c597ab67671327d5f972763b00882f33fdef111365ddde"))));
test("T2B 07 immutable canary selects only manifest session zero", () => assert.deepEqual(stageSessionIndexesV3("CANARY", 12), [0]));
test("T2B 08 property detail cannot precede validated search", () => assert.throws(() => ledger().plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 1 }), /MAIN_SEARCH_VALIDATION_REQUIRED/));
test("T2B 09 main search can be reserved only once", () => { const value = ledger(); validateMain(value); assert.throws(() => value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "MAIN_SEARCH" }), /DUPLICATE_REQUEST|MAIN_SEARCH_CAP_REACHED/); });
test("T2B 10 at most one property detail can be reserved", () => { const value = ledger(); validateMain(value); const ordinal = value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 1 }); value.transmit(ordinal, "2026-09-01T10:00:01.000Z"); value.validate(ordinal, "c".repeat(64), true, true); assert.throws(() => value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 2 }), /CAP_REACHED|PROPERTY_DETAIL_CAP_REACHED/); });
test("T2B 11 a third request is impossible", () => { const value = ledger(); validateMain(value); const ordinal = value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 1 }); value.transmit(ordinal, "2026-09-01T10:00:01.000Z"); value.validate(ordinal, "c".repeat(64), true, true); assert.equal(value.transmittedCount(), 2); assert.throws(() => value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "PROPERTY_DETAIL", alternativeRank: 2 }), /CAP_REACHED/); });
test("T2B 12 a second session is impossible", () => assert.throws(() => ledger().plan({ sessionId: "SESSION_002", sessionIndex: 1, requestType: "MAIN_SEARCH" }), /SESSION_NOT_ALLOWED/));
test("T2B 13 concurrency above one is impossible", () => { const value = ledger(); value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "MAIN_SEARCH" }); assert.throws(() => value.plan({ sessionId: "SESSION_001", sessionIndex: 0, requestType: "MAIN_SEARCH" }), /CONCURRENCY_LIMIT_EXCEEDED/); });
test("T2B 14 retries and pagination are frozen at zero", () => { assert.equal(stage.retryBudget, 0); assert.equal(stage.paginationBudget, 0); });
test("T2B 15 remaining stage and automatic Golden admission stay disabled", () => { assert.equal(stage.remainingStageAuthorized, false); assert.equal(stage.automaticGoldenAdmission, false); });
test("T2B 16 successful raw uses AES-GCM and fourteen-day retention", () => { const envelope = createProviderRawQuarantineEnvelopeV3({ plaintextUtf8: '{"safe":true}', metadata, disposition: "PROCESSED_SUCCESS", keyProtector: protector }); assert.equal(envelope.encryption, "AES_256_GCM"); assert.equal(STAYOPTI_PROVIDER_RAW_SUCCESS_RETENTION_DAYS_V3, 14); assert.equal(decryptProviderRawQuarantineEnvelopeV3(envelope, protector), '{"safe":true}'); });
test("T2B 17 failed raw uses ninety-day retention", () => { const envelope = createProviderRawQuarantineEnvelopeV3({ plaintextUtf8: '{"safe":false}', metadata, disposition: "UNRECOGNIZED_PARTIAL_OR_ERROR", keyProtector: protector }); assert.equal(STAYOPTI_PROVIDER_RAW_FAILURE_RETENTION_DAYS_V3, 90); assert.equal(Date.parse(envelope.expiresAt) - Date.parse(envelope.capturedAt), 90 * 86_400_000); });
test("T2B 18 plaintext raw is absent from the encrypted envelope", () => { const envelope = createProviderRawQuarantineEnvelopeV3({ plaintextUtf8: '{"distinctive":"PLAINTEXT_SENTINEL"}', metadata, disposition: "PROCESSED_SUCCESS", keyProtector: protector }); assert.doesNotMatch(JSON.stringify(envelope), /PLAINTEXT_SENTINEL/); });
test("T2B 19 encrypted envelope tampering is rejected", () => { const envelope = createProviderRawQuarantineEnvelopeV3({ plaintextUtf8: '{"safe":true}', metadata, disposition: "PROCESSED_SUCCESS", keyProtector: protector }); assert.equal(validateProviderRawQuarantineEnvelopeV3({ ...envelope, requestOrdinal: 2 }).valid, false); });
test("T2B 20 private replay is offline", () => assert.doesNotMatch(source("src/engine-v3/evaluation/serpApiGoogleHotelsPrivateReplayV3.ts"), /\bfetch\s*\(|https?:\/\//));
test("T2B 21 diagnostic envelope exposes only controlled shape data", () => { const diagnostic = createSerpApiResponseDiagnosticV3({ requestOrdinal: 2, requestKind: "PROPERTY_DETAIL", alternativeRank: 1, httpStatus: 422, contentType: "application/json; charset=utf-8", responseByteLength: 12, body: { error: "not persisted", search_metadata: { status: "Error" }, safe_field: true } }); assert.deepEqual(Object.keys(diagnostic).sort(), ["alternativeRank", "contentType", "errorClass", "errorPresent", "httpStatus", "requestKind", "requestOrdinal", "responseByteLength", "schemaMismatchPaths", "searchMetadataStatus", "topLevelFieldNames"].sort()); assert.doesNotMatch(JSON.stringify(diagnostic), /not persisted/); });
test("T2B 22 token and raw payload fields are prohibited from Evidence", () => { const evidence = source("src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3.ts"); assert.match(evidence, /forbiddenKeyFragments/); assert.match(evidence, /rawpayload/); assert.match(evidence, /FORBIDDEN_KEY/); });
test("T2B 23 observed display price never becomes exact bookable", () => { const replay = source("src/engine-v3/evaluation/externalHotelChoiceReplayV3.ts"); assert.match(replay, /OBSERVED_AGGREGATED_DISPLAY_PRICE/); assert.match(replay, /exactBookable === false/); assert.match(replay, /sellerSpecific === false/); });
test("T2B 24 Engine V3 core does not import the SerpApi collector", () => assert.doesNotMatch(source("src/engine-v3/index.ts"), /serpApiGoogleHotelsPilotCollectorV3|providerRawQuarantineV3/));
test("T2B 25 PowerShell handoff clears credentials and stays fail-visible", () => { const handoff = source("scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1"); assert.match(handoff, /ZeroFreeBSTR/); assert.match(handoff, /SetEnvironmentVariable\('SERPAPI_API_KEY', \$null, 'Process'\)/); assert.match(handoff, /HANDOFF_RESULT=/); assert.match(handoff, /CANARY_RESULT=/); assert.match(handoff, /COLLECTION_RESULT=/); assert.match(handoff, /EVIDENCE_RESULT=/); });
