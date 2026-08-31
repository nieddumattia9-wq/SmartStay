import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  executeV317R2SingleWaveV3,
  inspectV317R2SandboxKeyPrefixV3,
  type StayOptiV317R2ExecutionDependenciesV3,
  type StayOptiV317R2MappedHotelV3,
  type StayOptiV317R2TransportResponseV3,
} from "../../src/engine-v3/evaluation/liteApiSandboxGoldenPilotExecutionV3";
import {
  STAYOPTI_V3_17R_FROZEN_PLAN_SHA256,
} from "../../src/engine-v3/evaluation/liteApiSandboxGoldenPilotGateV3";

function mappedHotels(): StayOptiV317R2MappedHotelV3[] {
  return Array.from({ length: 3 }, (_, index) => ({
    totalKnownCost: 420 + index * 37,
    price: 420 + index * 37,
    currency: "EUR",
    stars: 3 + index * 0.5,
    reviewScore: 8 + index * 0.3,
    reviewCount: 120 + index * 40,
    distance: 0.8 + index * 0.5,
    accommodationCategory: "hotel",
    refundable: index !== 2,
    freeCancellationUntil: index !== 2 ? "2027-01-31T00:00:00Z" : null,
    cancellationPenalty: 0,
    cancellationPenaltyCurrency: "EUR",
    taxesIncluded: true,
    includedTaxes: 42 + index,
    excludedTaxes: 0,
    unknownTaxes: 0,
    amenities: ["Wi-Fi", `Synthetic amenity ${index + 1}`],
    offers: [{ price: 420 + index * 37, currency: "EUR", roomName: `Synthetic room ${index + 1}` }],
  }));
}

function dependencies(
  transport: StayOptiV317R2ExecutionDependenciesV3["transport"],
) {
  let clock = 0;
  return {
    transport,
    normalizeRatesResponse: () => mappedHotels(),
    monotonicNowMs: () => clock,
    sleep: async (ms: number) => { clock += ms; },
    createSessionId: (ordinal: number) => `synthetic_session_${ordinal}`,
    collectedAt: () => "2026-08-31T12:00:00Z",
  } satisfies StayOptiV317R2ExecutionDependenciesV3;
}

function successResponse(): StayOptiV317R2TransportResponseV3 {
  return {
    httpStatus: 200,
    providerCode: null,
    retryAfterPresent: false,
    redirectObserved: false,
    sessionIdConsistent: true,
    rawResultCount: 3,
    body: { synthetic: true },
  };
}

test("V3-17R.2 recognizes only documented sandbox and production key prefixes", () => {
  assert.equal(inspectV317R2SandboxKeyPrefixV3("sand_synthetic"), "SANDBOX");
  assert.equal(inspectV317R2SandboxKeyPrefixV3("sandbox_synthetic"), "SANDBOX");
  assert.equal(inspectV317R2SandboxKeyPrefixV3("prod_synthetic"), "PRODUCTION");
  assert.equal(inspectV317R2SandboxKeyPrefixV3("unknown_synthetic"), "UNKNOWN");
  assert.equal(inspectV317R2SandboxKeyPrefixV3(null), "MISSING");
});

test("V3-17R.2 fake full wave performs exactly five sequential Rates requests", async () => {
  let calls = 0;
  const receipt = await executeV317R2SingleWaveV3(dependencies(async (request) => {
    calls += 1;
    assert.equal(request.method, "POST");
    assert.equal(request.endpointPath, "/hotels/rates");
    return successResponse();
  }));
  assert.equal(calls, 5);
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.httpRequests, 5);
  assert.equal(receipt.ratesHttpRequests, 5);
  assert.equal(receipt.allOtherEndpointRequests, 0);
  assert.equal(receipt.maxObservedConcurrency, 1);
  assert.equal(receipt.minimumObservedRequestIntervalMs, 1_000);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.redirectsFollowed, 0);
});

test("V3-17R.2 projects no more than twenty provider-neutral sandbox diagnostics", async () => {
  const receipt = await executeV317R2SingleWaveV3(dependencies(async () => successResponse()));
  assert.equal(receipt.sandboxCasesProjected, 20);
  assert.equal(receipt.providerNeutralSnapshots.length, 5);
  assert.equal(receipt.sandboxCaseReceipts.length, 20);
  assert.equal(receipt.sandboxCaseClassification, "SANDBOX_DIAGNOSTIC_NOT_REAL_GOLDEN");
  assert.equal(receipt.goldenCasesRealCollected, 0);
  assert.equal(receipt.realJudgmentsCollected, 0);
  assert.equal(receipt.v3_17GateMet, false);
  assert.equal(receipt.v3_18EntryAllowed, false);
});

test("V3-17R.2 true no-results advances without retry and without projected cases", async () => {
  const receipt = await executeV317R2SingleWaveV3(dependencies(async () => ({
    ...successResponse(),
    providerCode: 2001,
    rawResultCount: 0,
    body: { code: 2001 },
  })));
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.httpRequests, 5);
  assert.equal(receipt.noResultsCount, 5);
  assert.equal(receipt.sandboxCasesProjected, 0);
  assert.equal(receipt.retries, 0);
});

test("V3-17R.2 stops immediately after the first provider error", async () => {
  let calls = 0;
  const receipt = await executeV317R2SingleWaveV3(dependencies(async () => {
    calls += 1;
    return { ...successResponse(), httpStatus: 401, providerCode: null, rawResultCount: null };
  }));
  assert.equal(receipt.status, "FAIL");
  assert.equal(receipt.failureClassification, "AUTHENTICATION_FAILURE");
  assert.equal(calls, 1);
  assert.equal(receipt.httpRequests, 1);
  assert.equal(receipt.searchFamiliesAttempted, 1);
});

test("V3-17R.2 blocks a manually observed redirect and sends no later request", async () => {
  let calls = 0;
  const receipt = await executeV317R2SingleWaveV3(dependencies(async () => {
    calls += 1;
    return { ...successResponse(), httpStatus: 302, redirectObserved: true, rawResultCount: null };
  }));
  assert.equal(receipt.status, "FAIL");
  assert.equal(receipt.failureClassification, "REDIRECT_BLOCKED");
  assert.equal(calls, 1);
  assert.equal(receipt.redirectsFollowed, 0);
});

test("V3-17R.2 stops on session mismatch and retains no continuation capability", async () => {
  let calls = 0;
  const receipt = await executeV317R2SingleWaveV3(dependencies(async () => {
    calls += 1;
    return { ...successResponse(), sessionIdConsistent: false };
  }));
  assert.equal(receipt.status, "FAIL");
  assert.equal(receipt.failureClassification, "SESSION_ID_INCOHERENT");
  assert.equal(calls, 1);
  assert.equal(receipt.allOtherEndpointRequests, 0);
});

test("V3-17R.2 receipt and snapshots contain no raw identifiers, payloads or secrets", async () => {
  const receipt = await executeV317R2SingleWaveV3(dependencies(async () => successResponse()));
  const serialized = JSON.stringify(receipt);
  for (const forbidden of ["hotelId", "rateId", "offerId", "bookingId", "prebookId", "continuationId", "rawResponse", "rawPayload", "apiKey", "authorizationHeader"]) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false);
  }
  assert.equal(receipt.rawProviderResponseCommitted, false);
  assert.equal(receipt.rawIdentifiersPersisted, 0);
  assert.equal(receipt.secretValuesPersisted, 0);
});

test("V3-17R.2 preserves the frozen plan and keeps the live host private and fail-closed", async () => {
  assert.equal(STAYOPTI_V3_17R_FROZEN_PLAN_SHA256, "34e450c9cfafad2fec76898dc74c4b935dbe7f6ac3485f45e9068078ae557c9a");
  const source = await readFile("scripts/run-v3-17r2-liteapi-sandbox-pilot.mjs", "utf8");
  assert.match(source, /redirect:\s*"manual"/);
  assert.match(source, /\/hotels\/rates/);
  assert.doesNotMatch(source, /rates\/prebook|\/bookings|\/places|price-index|public-price/i);
  const publicIndex = await readFile("src/engine-v3/index.ts", "utf8");
  assert.equal(publicIndex.includes("liteApiSandboxGoldenPilotExecutionV3"), false);
});
