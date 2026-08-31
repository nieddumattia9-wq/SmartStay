import assert from "node:assert/strict";
import test from "node:test";

import type { StayOptiGoldenProjectionCaseResultV3 } from "../../src/engine-v3/evaluation/goldenNormalizedSearchProjectionV3";
import {
  assertV317RNoRawProviderMaterialV3,
  evaluateV317RPreNetworkGateV3,
  selectV317RSandboxDiagnosticCasesV3,
  StayOptiV317RBoundedGovernorV3,
  STAYOPTI_V3_17R_EVIDENCE_BOUNDARY,
  STAYOPTI_V3_17R_FROZEN_PLAN,
  STAYOPTI_V3_17R_FROZEN_PLAN_SHA256,
  STAYOPTI_V3_17R_OBSERVED_PRE_NETWORK_DECISION,
  STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE,
  STAYOPTI_V3_17R_RATES_PATH,
  STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION,
  type StayOptiV317RDispatchIntentV3,
  type StayOptiV317RPreNetworkEvidenceV3,
} from "../../src/engine-v3/evaluation/liteApiSandboxGoldenPilotGateV3";

function readyEvidence(
  overrides: Partial<StayOptiV317RPreNetworkEvidenceV3> = {},
): StayOptiV317RPreNetworkEvidenceV3 {
  return {
    repositoryPreflightPassed: true,
    sandboxIdentityVerified: true,
    sandboxBaseUrlVerified: true,
    productionEndpointExcluded: true,
    ratesOnlyEnforced: true,
    accountSpecificZeroCostVerified: true,
    paidEndpointsExcluded: true,
    httpHardCapEnforced: true,
    retryDisabled: true,
    redirectDisabled: true,
    concurrencyOneEnforced: true,
    minimumIntervalEnforced: true,
    singleWaveEnforced: true,
    ...overrides,
  };
}

function readyGovernor() {
  const governor = new StayOptiV317RBoundedGovernorV3(
    evaluateV317RPreNetworkGateV3(readyEvidence()),
  );
  governor.beginWave();
  return governor;
}

function intent(
  familyIndex: number,
  overrides: Partial<StayOptiV317RDispatchIntentV3> = {},
): StayOptiV317RDispatchIntentV3 {
  return {
    familyId: STAYOPTI_V3_17R_FROZEN_PLAN.families[familyIndex]!.familyId,
    planSha256: STAYOPTI_V3_17R_FROZEN_PLAN_SHA256,
    method: "POST",
    baseUrl: STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE,
    endpointPath: STAYOPTI_V3_17R_RATES_PATH,
    retryOrdinal: 0,
    redirectCount: 0,
    waveOrdinal: 1,
    monotonicStartMs: familyIndex * 1_000,
    credentialsLoadedAfterGate: true,
    ...overrides,
  };
}

function completeSuccess(governor: StayOptiV317RBoundedGovernorV3, familyIndex: number) {
  const authorization = governor.authorizeRatesRequest(intent(familyIndex));
  governor.recordResponse({
    requestOrdinal: authorization.requestOrdinal,
    outcome: "SUCCESS",
    sessionIdConsistent: true,
  });
}

function syntheticProjectedCase(index: number): StayOptiGoldenProjectionCaseResultV3 {
  return {
    goldenCase: {
      goldenCaseId: `GOLDEN_SANDBOX_SYNTHETIC_${String(index).padStart(3, "0")}`,
      declaredFingerprint: String(index).padStart(64, "0"),
    },
    validation: {
      disposition: "GOLDEN_VALID",
      issues: [],
    },
  } as unknown as StayOptiGoldenProjectionCaseResultV3;
}

test("V3-17R observed account evidence fails closed before credentials and network", () => {
  assert.equal(STAYOPTI_V3_17R_OBSERVED_PRE_NETWORK_DECISION.status, "SAFE_HOLD_PRE_NETWORK");
  assert.equal(STAYOPTI_V3_17R_OBSERVED_PRE_NETWORK_DECISION.credentialReadAuthorized, false);
  assert.equal(STAYOPTI_V3_17R_OBSERVED_PRE_NETWORK_DECISION.networkAuthorized, false);
  assert.deepEqual(STAYOPTI_V3_17R_OBSERVED_PRE_NETWORK_DECISION.missingEvidence, [
    "ACCOUNT_SPECIFIC_ZERO_COST_ATTESTATION_MISSING",
    "SANDBOX_BASE_URL_ACCOUNT_BINDING_MISSING",
    "SANDBOX_IDENTITY_ATTESTATION_MISSING",
  ]);
});

test("V3-17R account-specific zero cost is mandatory independently of public documentation", () => {
  const decision = evaluateV317RPreNetworkGateV3(readyEvidence({ accountSpecificZeroCostVerified: false }));
  assert.equal(decision.status, "SAFE_HOLD_PRE_NETWORK");
  assert.equal(decision.missingEvidence[0], "ACCOUNT_SPECIFIC_ZERO_COST_ATTESTATION_MISSING");
});

test("V3-17R sandbox identity and sandbox base binding are both mandatory", () => {
  const decision = evaluateV317RPreNetworkGateV3(readyEvidence({
    sandboxIdentityVerified: false,
    sandboxBaseUrlVerified: false,
  }));
  assert.equal(decision.status, "SAFE_HOLD_PRE_NETWORK");
  assert.equal(decision.missingEvidence.length, 2);
});

test("V3-17R missing credentials stop before the HTTP counter advances", () => {
  const governor = readyGovernor();
  assert.throws(
    () => governor.authorizeRatesRequest(intent(0, { credentialsLoadedAfterGate: false })),
    /CREDENTIALS_UNAVAILABLE_BEFORE_TRANSPORT/,
  );
  assert.equal(governor.snapshot().httpRequests, 0);
});

test("V3-17R freezes five distinct future search families and a deterministic SHA-256 plan", () => {
  assert.equal(STAYOPTI_V3_17R_FROZEN_PLAN.families.length, 5);
  assert.equal(new Set(STAYOPTI_V3_17R_FROZEN_PLAN.families.map(({ familyId }) => familyId)).size, 5);
  assert.equal(STAYOPTI_V3_17R_FROZEN_PLAN.families.every(({ checkin, checkout }) =>
    Date.parse(checkin) > Date.parse("2026-08-31") && Date.parse(checkout) > Date.parse(checkin)), true);
  assert.match(STAYOPTI_V3_17R_FROZEN_PLAN_SHA256, /^[0-9a-f]{64}$/);
});

test("V3-17R blocks a potential sixth HTTP request before transport", () => {
  const governor = readyGovernor();
  for (let index = 0; index < 5; index += 1) completeSuccess(governor, index);
  assert.throws(
    () => governor.authorizeRatesRequest(intent(0, { monotonicStartMs: 5_000 })),
    /HTTP_HARD_CAP_EXCEEDED/,
  );
  assert.equal(governor.snapshot().httpRequests, 5);
});

test("V3-17R retry is impossible before transport", () => {
  const governor = readyGovernor();
  assert.throws(() => governor.authorizeRatesRequest(intent(0, { retryOrdinal: 1 })), /RETRY_PROHIBITED/);
  assert.equal(governor.snapshot().retries, 0);
});

test("V3-17R concurrency greater than one is blocked", () => {
  const governor = readyGovernor();
  governor.authorizeRatesRequest(intent(0));
  assert.throws(() => governor.authorizeRatesRequest(intent(1, { monotonicStartMs: 1_000 })), /CONCURRENCY_LIMIT_EXCEEDED/);
});

test("V3-17R enforces at least 1000 ms between request starts", () => {
  const governor = readyGovernor();
  completeSuccess(governor, 0);
  assert.throws(() => governor.authorizeRatesRequest(intent(1, { monotonicStartMs: 999 })), /MINIMUM_REQUEST_INTERVAL_NOT_MET/);
  assert.equal(governor.snapshot().httpRequests, 1);
});

test("V3-17R prohibits a second wave", () => {
  const governor = readyGovernor();
  governor.finishWave();
  assert.throws(() => governor.beginWave(2), /SECOND_WAVE_PROHIBITED/);
});

test("V3-17R allowlists only POST Rates and blocks paid or mutative endpoint families", () => {
  for (const endpointPath of ["/rates/prebook", "/bookings", "/places", "/price-index", "/public-price"]) {
    const governor = readyGovernor();
    assert.throws(() => governor.authorizeRatesRequest(intent(0, { endpointPath })), /ENDPOINT_NOT_ALLOWLISTED/);
    assert.equal(governor.snapshot().httpRequests, 0);
  }
});

test("V3-17R blocks every non-allowlisted or production base URL", () => {
  const governor = readyGovernor();
  assert.throws(
    () => governor.authorizeRatesRequest(intent(0, { baseUrl: "https://production.invalid/v3.0" })),
    /BASE_URL_NOT_ALLOWLISTED/,
  );
});

test("V3-17R redirects are blocked before transport", () => {
  const governor = readyGovernor();
  assert.throws(() => governor.authorizeRatesRequest(intent(0, { redirectCount: 1 })), /REDIRECT_PROHIBITED/);
  assert.equal(governor.snapshot().redirects, 0);
});

test("V3-17R true no-results is diagnostic and never causes retry", () => {
  const governor = readyGovernor();
  const first = governor.authorizeRatesRequest(intent(0));
  governor.recordResponse({ requestOrdinal: first.requestOrdinal, outcome: "NO_RESULTS", sessionIdConsistent: true });
  const second = governor.authorizeRatesRequest(intent(1));
  assert.equal(second.requestOrdinal, 2);
  assert.equal(governor.snapshot().noResultsCount, 1);
  assert.equal(governor.snapshot().retries, 0);
});

test("V3-17R provider error aborts immediately and blocks later families", () => {
  const governor = readyGovernor();
  const first = governor.authorizeRatesRequest(intent(0));
  assert.throws(
    () => governor.recordResponse({ requestOrdinal: first.requestOrdinal, outcome: "PROVIDER_ERROR", sessionIdConsistent: true }),
    /PROVIDER_OR_TRANSPORT_ABORT/,
  );
  assert.throws(() => governor.authorizeRatesRequest(intent(1)), /WAVE_NOT_ACTIVE/);
});

test("V3-17R inconsistent session identity aborts collection", () => {
  const governor = readyGovernor();
  const first = governor.authorizeRatesRequest(intent(0));
  assert.throws(
    () => governor.recordResponse({ requestOrdinal: first.requestOrdinal, outcome: "SUCCESS", sessionIdConsistent: false }),
    /SESSION_ID_INCOHERENT/,
  );
  assert.equal(governor.snapshot().aborted, true);
});

test("V3-17R rejects a changed plan before transport", () => {
  const governor = readyGovernor();
  assert.throws(() => governor.authorizeRatesRequest(intent(0, { planSha256: "0".repeat(64) })), /FROZEN_PLAN_MISMATCH/);
  assert.equal(governor.snapshot().httpRequests, 0);
});

test("V3-17R rejects non-frozen and repeated search families", () => {
  const governor = readyGovernor();
  assert.throws(() => governor.authorizeRatesRequest(intent(0, { familyId: "SEARCH_FAMILY_NOT_FROZEN" })), /FAMILY_NOT_FROZEN/);
  completeSuccess(governor, 0);
  assert.throws(() => governor.authorizeRatesRequest(intent(0, { monotonicStartMs: 1_000 })), /SECOND_REQUEST_FOR_FAMILY_PROHIBITED/);
});

test("V3-17R deterministically limits a projected batch to twenty sandbox diagnostics", () => {
  const projected = Array.from({ length: 25 }, (_, index) => syntheticProjectedCase(25 - index));
  const selected = selectV317RSandboxDiagnosticCasesV3(projected);
  assert.equal(selected.length, 20);
  assert.equal(selected[0]!.goldenCase.goldenCaseId, "GOLDEN_SANDBOX_SYNTHETIC_001");
  assert.equal(selected[19]!.goldenCase.goldenCaseId, "GOLDEN_SANDBOX_SYNTHETIC_020");
  assert.equal(selected.every(({ classification }) => classification === STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION), true);
});

test("V3-17R sandbox diagnostics never increment real Golden or judgment counters", () => {
  assert.deepEqual(STAYOPTI_V3_17R_EVIDENCE_BOUNDARY, {
    goldenCasesRealCollected: 0,
    realJudgmentsCollected: 0,
    v3_17GateMet: false,
    v3_18EntryAllowed: false,
    globalOptimumClaimAllowed: false,
    marketFrequencyClaimAllowed: false,
    productionCollectionAuthorized: false,
  });
});

test("V3-17R rejects raw provider material, secrets and authentication headers", () => {
  assert.equal(assertV317RNoRawProviderMaterialV3({ caseCount: 0, classification: STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION }), true);
  for (const unsafe of [{ rawResponse: {} }, { hotelId: "synthetic" }, { apiKey: "synthetic" }, { authorization: "synthetic" }]) {
    assert.throws(() => assertV317RNoRawProviderMaterialV3(unsafe), /RAW_PROVIDER_OR_SECRET_MATERIAL_PRESENT/);
  }
});

test("V3-17R gate itself blocks network when any technical guard is not proven", () => {
  for (const key of [
    "productionEndpointExcluded",
    "ratesOnlyEnforced",
    "paidEndpointsExcluded",
    "httpHardCapEnforced",
    "retryDisabled",
    "redirectDisabled",
    "concurrencyOneEnforced",
    "minimumIntervalEnforced",
    "singleWaveEnforced",
  ] as const) {
    const decision = evaluateV317RPreNetworkGateV3(readyEvidence({ [key]: false }));
    assert.equal(decision.networkAuthorized, false);
  }
});

test("V3-17R private module has no fetch, environment, LiteAPI client, raw adapter or public runtime binding", async () => {
  const fs = await import("node:fs/promises");
  const module = await fs.readFile("src/engine-v3/evaluation/liteApiSandboxGoldenPilotGateV3.ts", "utf8");
  const publicIndex = await fs.readFile("src/engine-v3/index.ts", "utf8");
  assert.equal(/\bfetch\s*\(|process\.env|dotenv|liteApiClient|liteApiAdapter|liteApiProvider/i.test(module), false);
  assert.equal(publicIndex.includes("liteApiSandboxGoldenPilotGateV3"), false);
});
