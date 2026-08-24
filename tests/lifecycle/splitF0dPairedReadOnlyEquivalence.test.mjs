import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPLIT_F0D_ACTUAL_HTTP_REQUESTS,
  SPLIT_F0D_ENVIRONMENTS,
  SPLIT_F0D_EXPECTED_LIVE_DURATIONS,
  SPLIT_F0D_HARD_REQUEST_BUDGET,
  SPLIT_F0D_LIVE_CONFIRMATIONS,
  SPLIT_F0D_OFFICIAL_BASE_URL,
  SPLIT_F0D_RATES_ENDPOINT,
  SPLIT_F0D_REPOSITORY_ROOT,
  SPLIT_F0D_WAVES,
  buildSplitF0dPairedSchedule,
  classifySplitF0dCredential,
  classifySplitF0dTransportFailure,
  createSplitF0dRatesOnlyTransport,
  createSplitF0dDryRunConfigReceipt,
  fingerprintSplitF0dProviderIdentifierHmacV1,
  loadSplitF0dRunPlan,
  parseSplitF0dArguments,
  resolveSplitF0dLiveConfiguration,
  runSplitF0dDryRun,
  runSplitF0dPairedLive,
  runSplitF0dOfflineControls,
  validateSplitF0dFutureLiveConfiguration,
  validateSplitF0dRunPlan,
} from "../../scripts/run-split-f0d-paired-read-only-equivalence.mjs";
import {
  buildSplitF0LogicalSearchPlan,
  createSplitF0RatesRequestBodyV1,
  loadSplitF0ScenarioMatrix,
  sha256SplitF0,
  stableStringifySplitF0,
} from "../../scripts/run-split-f0-read-only-collector.mjs";

test("the paired plan binds the one existing eight-scenario matrix without duplicating live inputs", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const runPlan = await loadSplitF0dRunPlan();
  assert.deepEqual(await validateSplitF0dRunPlan(matrix, runPlan), {
    valid: true,
    issues: [],
  });
  assert.equal(matrix.scenarios.length, 8);
  assert.deepEqual(
    matrix.scenarios.map((scenario) => scenario.nights),
    SPLIT_F0D_EXPECTED_LIVE_DURATIONS
  );
  assert.deepEqual(
    runPlan.liveScenarioIds,
    matrix.scenarios.map((scenario) => scenario.scenarioId)
  );
  assert.equal(runPlan.sourceScenarioMatrixPath, "tests/engine-v3/fixtures/split-f0-scenario-matrix-v1.json");
  const fixtureText = await fs.readFile(
    path.join(SPLIT_F0D_REPOSITORY_ROOT, "tests/engine-v3/fixtures/split-f0d-equivalence-run-plan-v1.json"),
    "utf8"
  );
  for (const forbiddenDuplicatedField of ["destination", "checkIn", "checkOut", "occupancy"]) {
    assert.equal(fixtureText.includes(`\"${forbiddenDuplicatedField}\"`), false);
  }
});

test("two waves counterbalance every pair and prove identical sandbox/production request hashes", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const runPlan = await loadSplitF0dRunPlan();
  const schedule = buildSplitF0dPairedSchedule(matrix, runPlan);
  const logicalSearches = buildSplitF0LogicalSearchPlan(matrix);
  assert.equal(logicalSearches.length, 40);
  assert.equal(schedule.pairs.length, 80);
  assert.equal(schedule.plannedHttpRequests, 160);
  assert.equal(schedule.plannedHttpRequests, SPLIT_F0D_HARD_REQUEST_BUDGET);
  assert.deepEqual(SPLIT_F0D_ENVIRONMENTS, ["sandbox", "production"]);
  assert.deepEqual(SPLIT_F0D_WAVES, ["wave-a", "wave-b"]);

  const expectedReceiptKeys = [
    "canonicalBodySha256",
    "checkIn",
    "checkOut",
    "currency",
    "durationNights",
    "guestNationality",
    "logicalSearchId",
    "nonSecretConfiguration",
    "occupancy",
    "scenarioId",
    "searchKind",
    "segmentOrdinal",
    "splitPointId",
    "waveId",
  ];
  for (const pair of schedule.pairs) {
    assert.equal(
      pair.environmentRequestHashes.sandbox,
      pair.environmentRequestHashes.production
    );
    assert.deepEqual(Object.keys(pair.requestReceipt).sort(), expectedReceiptKeys);
    assert.equal("environment" in pair.requestReceipt, false);
    assert.equal("baseUrl" in pair.requestReceipt, false);
    assert.equal("credential" in pair.requestReceipt, false);
    assert.equal("headers" in pair.requestReceipt, false);
    assert.equal("timestamp" in pair.requestReceipt, false);
  }

  for (let ordinal = 0; ordinal < 40; ordinal += 1) {
    const waveA = schedule.pairs[ordinal];
    const waveB = schedule.pairs[40 + ordinal];
    assert.deepEqual(waveB.environmentOrder, [...waveA.environmentOrder].reverse());
    const body = createSplitF0RatesRequestBodyV1(logicalSearches[ordinal]);
    const expectedHash = `sha256:${sha256SplitF0(stableStringifySplitF0(body))}`;
    assert.equal(waveA.requestReceipt.canonicalBodySha256, expectedHash);
    assert.equal(waveB.requestReceipt.canonicalBodySha256, expectedHash);
  }
});

test("the complete D1 run is deterministic, dry-run-only and plans exactly 160 future requests", async () => {
  const first = await runSplitF0dDryRun();
  const second = await runSplitF0dDryRun();
  assert.equal(stableStringifySplitF0(first), stableStringifySplitF0(second));
  assert.equal(first.status, "PASS");
  assert.equal(first.executionMode, "DRY_RUN_ONLY");
  assert.equal(first.originalScenarioMatrixReused, true);
  assert.equal(first.liveScenarioCount, 8);
  assert.deepEqual(first.liveDurations, [5, 7, 10, 12, 14, 21, 28, 30]);
  assert.equal(first.logicalSearchesPerScenario, 5);
  assert.equal(first.requestPairCount, 80);
  assert.equal(first.plannedLiveHttpRequests, 160);
  assert.equal(first.actualHttpRequests, 0);
  assert.equal(first.actualHttpRequests, SPLIT_F0D_ACTUAL_HTTP_REQUESTS);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.sandboxCalls, 0);
  assert.equal(first.productionCalls, 0);
  assert.equal(first.prebookCalls, 0);
  assert.equal(first.bookingCalls, 0);
  assert.equal(first.paymentCalls, 0);
  assert.equal(first.pairedRequestHashMatch, true);
  assert.equal(first.pairLevelExecutionPlanned, true);
  assert.equal(first.sandboxProductionOrderCounterbalanced, true);
  assert.equal(first.marketEvidence, false);
  assert.equal(first.policyEligible, false);
  assert.equal(first.publicRecommendationAllowed, false);
});

test("offline controls cover the two-night boundary and four provider-neutral replay branches", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const runPlan = await loadSplitF0dRunPlan();
  const offline = runSplitF0dOfflineControls(matrix, runPlan);
  assert.equal(offline.twoNightControl.nights, 2);
  assert.equal(offline.twoNightControl.fullStayValid, true);
  assert.deepEqual(offline.twoNightControl.admissibleSplitPoints, []);
  assert.equal(offline.twoNightControl.plannedProviderRequests, 0);
  assert.equal(offline.twoNightControl.actualProviderRequests, 0);
  assert.equal(offline.replayControls.length, 4);

  const [noSaving, candidate, incomplete, availability] = offline.replayControls;
  assert.equal(noSaving.economicSignal, "NO_GROSS_SAVING");
  assert.equal(candidate.grossSavingMinorUnits, 8_000);
  assert.equal(candidate.baselineSelectionMode, "PRIMARY_FIXED_BEST_SINGLE");
  assert.equal(candidate.matchedBucketDiagnosticOnly, true);
  assert.equal(candidate.publicRecommendationProduced, false);
  assert.equal(Number.isInteger(candidate.fixedBaselineTotalMinorUnits), true);
  assert.equal(Number.isInteger(candidate.grossSavingMinorUnits), true);
  assert.equal(incomplete.comparabilityLevel, "NON_COMPARABLE");
  assert.equal(incomplete.issues.includes("total-cost-incomplete"), true);
  assert.equal(availability.bestSingleChanged, true);
  assert.equal(availability.beforeLoss.fixedBaselineOfferSnapshotId, "offline.single-a");
  assert.equal(availability.afterLoss.fixedBaselineOfferSnapshotId, "offline.single-b");
  assert.equal(availability.publicRecommendationProduced, false);
});

test("future live configuration is fail-closed without exposing credential values", () => {
  const sandboxCredential = ["sand", "unit-test-only"].join("_");
  const productionCredential = ["prod", "unit-test-only"].join("_");
  const valid = validateSplitF0dFutureLiveConfiguration({
    sandboxBaseUrl: "https://api.liteapi.travel/v3.0",
    productionBaseUrl: "https://api.liteapi.travel/v3.0",
    sandboxCredential,
    productionCredential,
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.issues, []);
  const serialized = JSON.stringify(valid);
  assert.equal(serialized.includes(sandboxCredential), false);
  assert.equal(serialized.includes(productionCredential), false);
  assert.equal(valid.credentialReceipt.valuesExposed, false);
  assert.equal(classifySplitF0dCredential(sandboxCredential), "SAND");
  assert.equal(classifySplitF0dCredential(productionCredential), "PROD");

  const wrongProduction = validateSplitF0dFutureLiveConfiguration({
    sandboxBaseUrl: "https://api.liteapi.travel/v3.0",
    productionBaseUrl: "https://api.liteapi.travel/v3.0",
    sandboxCredential,
    productionCredential: sandboxCredential,
  });
  assert.equal(wrongProduction.valid, false);
  assert.equal(wrongProduction.issues.includes("PRODUCTION_CREDENTIAL_CLASS_NOT_PROVEN"), true);

  for (const invalidBaseUrl of [
    "http://api.liteapi.travel/v3.0",
    "https://localhost/v3.0",
    "https://api.liteapi.travel/v2.0",
    "https://user:password@api.liteapi.travel/v3.0",
  ]) {
    const invalid = validateSplitF0dFutureLiveConfiguration({
      sandboxBaseUrl: invalidBaseUrl,
      productionBaseUrl: "https://api.liteapi.travel/v3.0",
      sandboxCredential,
      productionCredential,
    });
    assert.equal(invalid.valid, false, invalidBaseUrl);
  }

  const receipt = createSplitF0dDryRunConfigReceipt();
  assert.equal(receipt.method, "POST");
  assert.equal(receipt.endpointPath, "/hotels/rates");
  assert.equal(receipt.httpsRequired, true);
  assert.deepEqual(receipt.hostAllowlist, ["api.liteapi.travel"]);
  assert.equal(receipt.redirects, "disabled");
  assert.equal(receipt.cache, "disabled");
  assert.equal(receipt.continuation, "none");
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.concurrency, 1);
  assert.equal(receipt.maxRequestsPerSecond, 1);
  assert.equal(receipt.hardRequestBudget, 160);
  assert.equal(receipt.fallbackBetweenEnvironments, false);
  assert.equal(receipt.credentialValuesExposed, false);
});

test("future identifier correlation uses only an ephemeral HMAC fingerprint", () => {
  const firstKey = new Uint8Array(32).fill(17);
  const secondKey = new Uint8Array(32).fill(23);
  const rawIdentifier = "synthetic-provider-id-for-contract-test";
  const first = fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, firstKey);
  const repeat = fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, firstKey);
  const differentRun = fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, secondKey);
  assert.match(first, /^hmac-sha256:[0-9a-f]{64}$/);
  assert.equal(first, repeat);
  assert.notEqual(first, differentRun);
  assert.equal(first.includes(rawIdentifier), false);
  assert.throws(
    () => fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, new Uint8Array(8)),
    /ephemeral-hmac-key-invalid/
  );
});

test("CLI defaults to dry-run and requires two live confirmations before environment access", () => {
  assert.deepEqual(parseSplitF0dArguments([]), { mode: "dry-run" });
  assert.deepEqual(parseSplitF0dArguments(["--dry-run"]), { mode: "dry-run" });
  assert.throws(
    () => parseSplitF0dArguments(["--execute-paired-live"]),
    /live-confirmations-required/
  );
  assert.throws(
    () => parseSplitF0dArguments(["--confirm-rates-only-production-access"]),
    /live-confirmations-required/
  );
  assert.throws(
    () => parseSplitF0dArguments([...SPLIT_F0D_LIVE_CONFIRMATIONS]),
    /output-directory-required/
  );
  assert.throws(
    () =>
      parseSplitF0dArguments([
        ...SPLIT_F0D_LIVE_CONFIRMATIONS,
        "--unknown",
      ]),
    /argument-invalid/
  );
});

test("paired runner remains outside server, frontend, V2/V3 decision cores and public policy", async () => {
  const runnerPath = path.join(
    SPLIT_F0D_REPOSITORY_ROOT,
    "scripts",
    "run-split-f0d-paired-read-only-equivalence.mjs"
  );
  const source = await fs.readFile(runnerPath, "utf8");
  const importSpecifiers = [
    ...source.matchAll(/(?:from\s+|require\(\s*)(["'])([^"']+)\1/g),
  ].map((match) => match[2]);
  for (const forbidden of [
    "engine-v2",
    "independentDecisionEngineV3",
    "orchestrator",
    "frontend",
    "server/",
    "server\\",
    "policy",
  ]) {
    assert.equal(importSpecifiers.some((specifier) => specifier.includes(forbidden)), false, forbidden);
  }
  assert.equal(
    importSpecifiers.some((specifier) => specifier.endsWith("run-split-f0-read-only-collector.mjs")),
    true
  );
  assert.equal(
    importSpecifiers.some((specifier) => specifier.endsWith("splitF0EconomicFeasibilityPilotV3.ts")),
    true
  );
  assert.equal(source.includes("globalThis.fetch"), true);
  assert.equal(source.includes("/rates/prebook"), false);
  assert.equal(source.includes("/book"), false);
  assert.equal(source.includes("/payment"), false);

  const indexSource = await fs.readFile(
    path.join(SPLIT_F0D_REPOSITORY_ROOT, "src/engine-v3/index.ts"),
    "utf8"
  );
  assert.equal(indexSource.includes("splitF0dPaired"), false);
  assert.equal(indexSource.includes("run-split-f0d-paired"), false);
});

function splitF0dTestLiveOptions() {
  return {
    mode: "paired-live",
    sandboxCredentialVariableName: "SANDBOX_TEST_KEY",
    productionCredentialVariableName: "PRODUCTION_TEST_KEY",
    sandboxBaseUrlVariableName: null,
    productionBaseUrlVariableName: null,
    outputDirectory: path.join(
      process.env.TEMP ?? process.env.TMP ?? "C:\\Windows\\Temp",
      "split-f0d-test-output-not-created"
    ),
  };
}

function splitF0dTestLiveConfiguration() {
  return resolveSplitF0dLiveConfiguration(splitF0dTestLiveOptions(), {
    SANDBOX_TEST_KEY: ["sand", "unit-test-only"].join("_"),
    PRODUCTION_TEST_KEY: ["prod", "unit-test-only"].join("_"),
  });
}

function jsonResponse(url, payload, overrides = {}) {
  return {
    status: 200,
    redirected: false,
    url: String(url),
    headers: {
      get: (name) =>
        String(name).toLowerCase() === "content-type"
          ? "application/json; charset=utf-8"
          : null,
    },
    text: async () => JSON.stringify(payload),
    ...overrides,
  };
}

test("live configuration binds only variable names and fails closed on class or equality", () => {
  const valid = splitF0dTestLiveConfiguration();
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.issues, []);
  assert.equal(valid.baseUrls.sandbox, SPLIT_F0D_OFFICIAL_BASE_URL);
  assert.equal(valid.baseUrls.production, SPLIT_F0D_OFFICIAL_BASE_URL);
  assert.equal(valid.credentialReceipt.sandbox.observedClass, "SAND");
  assert.equal(valid.credentialReceipt.production.observedClass, "PROD");
  assert.equal(JSON.stringify(valid.credentialReceipt).includes("unit-test-only"), false);

  const missingProduction = resolveSplitF0dLiveConfiguration(
    splitF0dTestLiveOptions(),
    { SANDBOX_TEST_KEY: ["sand", "unit-test-only"].join("_") }
  );
  assert.equal(missingProduction.valid, false);
  assert.equal(
    missingProduction.issues.includes("PRODUCTION_CREDENTIAL_CLASS_NOT_PROVEN"),
    true
  );

  const same = ["sand", "same-test-only"].join("_");
  const equal = validateSplitF0dFutureLiveConfiguration({
    sandboxBaseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
    productionBaseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
    sandboxCredential: same,
    productionCredential: same,
  });
  assert.equal(equal.valid, false);
  assert.equal(
    equal.issues.includes("SANDBOX_PRODUCTION_CREDENTIALS_MUST_DIFFER"),
    true
  );
});

test("rates-only native transport enforces HTTPS, host, endpoint, JSON, redirect and key class", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const logicalSearch = buildSplitF0LogicalSearchPlan(matrix)[0];
  const calls = [];
  const productionTransport = await createSplitF0dRatesOnlyTransport({
    environment: "production",
    credential: ["prod", "unit-test-only"].join("_"),
    baseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
    fetchImplementation: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse(url, { data: [] });
    },
    timeoutMs: 50,
  });
  const response = await productionTransport.request({
    method: "POST",
    endpointPath: SPLIT_F0D_RATES_ENDPOINT,
    logicalSearch,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.hotels, []);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.liteapi.travel/v3.0/hotels/rates");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.signal instanceof AbortSignal, true);
  assert.equal(calls[0].options.cache, "no-store");
  await assert.rejects(
    productionTransport.request({
      method: "POST",
      endpointPath: "/rates/prebook",
      logicalSearch,
    }),
    /endpoint-prohibited/
  );
  assert.equal(calls.length, 1);

  await assert.rejects(
    createSplitF0dRatesOnlyTransport({
      environment: "production",
      credential: ["sand", "wrong-class"].join("_"),
      baseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
      fetchImplementation: async () => assert.fail("invalid key reached fetch"),
    }),
    /live-transport-gate-failed/
  );
  await assert.rejects(
    createSplitF0dRatesOnlyTransport({
      environment: "sandbox",
      credential: ["sand", "unit-test-only"].join("_"),
      baseUrl: "http://api.liteapi.travel/v3.0",
      fetchImplementation: async () => assert.fail("HTTP reached fetch"),
    }),
    /live-transport-gate-failed/
  );

  const invalidContentType = await createSplitF0dRatesOnlyTransport({
    environment: "sandbox",
    credential: ["sand", "unit-test-only"].join("_"),
    baseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
    fetchImplementation: async (url) =>
      jsonResponse(url, { data: [] }, {
        headers: { get: () => "text/html" },
      }),
  });
  await assert.rejects(
    invalidContentType.request({
      method: "POST",
      endpointPath: SPLIT_F0D_RATES_ENDPOINT,
      logicalSearch,
    }),
    (caught) => caught?.code === "INVALID_PROVIDER_CONTENT_TYPE"
  );

  const redirected = await createSplitF0dRatesOnlyTransport({
    environment: "sandbox",
    credential: ["sand", "unit-test-only"].join("_"),
    baseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
    fetchImplementation: async () => {
      throw new TypeError("redirect mode is set to error");
    },
  });
  await assert.rejects(
    redirected.request({
      method: "POST",
      endpointPath: SPLIT_F0D_RATES_ENDPOINT,
      logicalSearch,
    }),
    (caught) => caught?.code === "REDIRECT_PROHIBITED"
  );

  for (const status of [429, 503]) {
    const statusFailure = await createSplitF0dRatesOnlyTransport({
      environment: "sandbox",
      credential: ["sand", "unit-test-only"].join("_"),
      baseUrl: SPLIT_F0D_OFFICIAL_BASE_URL,
      fetchImplementation: async (url) => ({
        status,
        redirected: false,
        url: String(url),
        headers: { get: () => "text/html" },
        text: async () => "provider unavailable",
      }),
    });
    await assert.rejects(
      statusFailure.request({
        method: "POST",
        endpointPath: SPLIT_F0D_RATES_ENDPOINT,
        logicalSearch,
      }),
      (caught) =>
        caught?.code === "LITEAPI_HTTP_ERROR" && caught?.status === status
    );
  }
});

test("transport failure policy stops auth, redirect and rate limits globally with retry zero", () => {
  for (const status of [401, 403]) {
    assert.deepEqual(classifySplitF0dTransportFailure({ status }), {
      classification: "PROVIDER_AUTHORIZATION_FAILURE",
      globalStop: true,
    });
  }
  assert.deepEqual(classifySplitF0dTransportFailure({ status: 429 }), {
    classification: "RATE_LIMIT_STOP",
    globalStop: true,
  });
  assert.deepEqual(
    classifySplitF0dTransportFailure({ code: "ECONNABORTED" }),
    { classification: "TIMEOUT", globalStop: false }
  );
  assert.deepEqual(classifySplitF0dTransportFailure({ status: 503 }), {
    classification: "PROVIDER_5XX",
    globalStop: false,
  });
  assert.deepEqual(
    classifySplitF0dTransportFailure({ code: "REDIRECT_PROHIBITED" }),
    { classification: "REDIRECT_PROHIBITED", globalStop: true }
  );
});

function successfulMappedHotel(logicalSearch) {
  const isFull = logicalSearch.kind === "full-stay";
  const propertySuffix = isFull
    ? "single"
    : `segment-${logicalSearch.segmentOrdinal}`;
  return {
    sourceHotelId: `raw-hotel-${logicalSearch.scenarioId}-${propertySuffix}`,
    reviewScore: 9,
    reviewCount: 500,
    distance: 1,
    offers: [
      {
        providerOfferReference: `raw-offer-${logicalSearch.logicalSearchId}`,
        totalKnownCost: logicalSearch.period.nights * (isFull ? 100 : 40),
        currency: "EUR",
        unknownTaxes: 0,
        taxesIncluded: true,
        taxBreakdown: [{ amount: 0 }],
        mealPlan: "breakfast included",
        refundable: true,
        cancellationPenalty: 0,
        paymentTiming: "pay later",
        roomName: "standard room",
        bookable: true,
      },
    ],
  };
}

test("paired live scheduler performs exactly 80+80 counterbalanced stub requests and persists only HMAC IDs", async () => {
  const liveConfiguration = splitF0dTestLiveConfiguration();
  let monotonic = 0;
  const result = await runSplitF0dPairedLive({
    liveConfiguration,
    transportFactory: async ({ environment }) => ({
      async request({ method, endpointPath, logicalSearch }) {
        assert.equal(method, "POST");
        assert.equal(endpointPath, SPLIT_F0D_RATES_ENDPOINT);
        assert.equal(["sandbox", "production"].includes(environment), true);
        return {
          status: 200,
          hotels: [successfulMappedHotel(logicalSearch)],
        };
      },
    }),
    sleep: async (milliseconds) => {
      monotonic += milliseconds;
    },
    monotonicNow: () => monotonic,
    wallClockNow: () => Date.parse("2026-08-24T12:00:00.000Z") + monotonic,
    hmacKey: new Uint8Array(32).fill(31),
  });
  assert.equal(result.liveRunStatus, "COMPLETED");
  assert.equal(result.failureClassification, null);
  assert.equal(result.counters.actualHttpRequests, 160);
  assert.equal(result.counters.sandboxHttpRequests, 80);
  assert.equal(result.counters.productionHttpRequests, 80);
  assert.equal(result.counters.completePairedSearches, 80);
  assert.equal(result.counters.incompletePairedSearches, 0);
  assert.equal(result.errorLedger.length, 0);
  assert.equal(result.requestHashLedger.length, 80);
  assert.equal(result.requestHashLedger.every((item) => item.pairedHashMatch), true);
  assert.equal(
    result.productionSummary.pilotResultClassification,
    "REPEATED_PRODUCTION_NET_SIGNAL"
  );
  assert.deepEqual(result.productionSummary.repeatedPositiveDurations, [5, 7, 10, 12, 14, 21, 28, 30]);
  assert.equal(result.policyEligible, false);
  assert.equal(result.publicRecommendationAllowed, false);
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "unit-test-only",
    "raw-hotel-",
    "raw-offer-",
    "X-Api-Key",
    "authorization",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  for (const environment of SPLIT_F0D_ENVIRONMENTS) {
    for (const waveId of SPLIT_F0D_WAVES) {
      for (const search of result.waves[environment][waveId].searches) {
        for (const offer of search.offers) {
          assert.match(offer.propertyId, /^property\.[0-9a-f]{64}$/);
          assert.match(offer.offerSnapshotId, /^offer\.[0-9a-f]{64}$/);
          assert.equal(offer.provenance.sourceKind, `${environment}-read-only`);
        }
      }
    }
  }
});

test("global authorization failure stops the paired runner after one request without retry", async () => {
  let requests = 0;
  const result = await runSplitF0dPairedLive({
    liveConfiguration: splitF0dTestLiveConfiguration(),
    transportFactory: async () => ({
      async request() {
        requests += 1;
        throw Object.assign(new Error("sanitized authorization failure"), {
          status: 401,
          code: "LITEAPI_HTTP_ERROR",
        });
      },
    }),
    sleep: async () => {},
    monotonicNow: () => 0,
    wallClockNow: () => Date.parse("2026-08-24T12:00:00.000Z"),
    hmacKey: new Uint8Array(32).fill(41),
  });
  assert.equal(requests, 1);
  assert.equal(result.liveRunStatus, "INCONCLUSIVE");
  assert.equal(result.failureClassification, "PROVIDER_AUTHORIZATION_FAILURE");
  assert.equal(result.counters.actualHttpRequests, 1);
  assert.equal(result.counters.completePairedSearches, 0);
  assert.equal(result.counters.incompletePairedSearches, 80);
  assert.equal(result.safetyCounters.retries, 0);
});
