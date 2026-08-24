import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPLIT_F0_MATRIX_PATH,
  SPLIT_F0_MAX_HTTP_REQUESTS,
  SPLIT_F0_MAX_HTTP_REQUESTS_PER_SCENARIO,
  SPLIT_F0_REPOSITORY_ROOT,
  assertSplitF0EndpointAllowed,
  buildSplitF0LogicalSearchPlan,
  createSplitF0BudgetLedger,
  createSplitF0LiteApiTransport,
  loadSplitF0ScenarioMatrix,
  parseSplitF0CollectorArguments,
  runSplitF0Collector,
  stableStringifySplitF0,
  validateSplitF0BaseUrl,
  validateSplitF0SandboxKey,
} from "../../scripts/run-split-f0-read-only-collector.mjs";

const FIXED_OBSERVED_AT = "2026-09-01T12:00:00.000Z";
const SAFE_SANDBOX_KEY = ["sand", "unit-test-only"].join("_");

function executableOptions() {
  return {
    mode: "execute",
    environment: "sandbox",
    outputPath: path.join(path.parse(SPLIT_F0_REPOSITORY_ROOT).root, "split-f0-test-output"),
    baseUrl: "https://api.liteapi.travel/v3.0",
  };
}

function virtualTime() {
  let milliseconds = 0;
  return {
    now: () => milliseconds,
    sleep: async (duration) => {
      milliseconds += duration;
    },
  };
}

function mappedHotelForSearch(logicalSearch) {
  const isFull = logicalSearch.kind === "full-stay";
  const propertySuffix = isFull ? "single" : logicalSearch.segmentOrdinal === 0 ? "first" : "second";
  const total = isFull ? logicalSearch.period.nights * 100 : logicalSearch.period.nights * 42;
  return {
    sourceHotelId: `raw-hotel-${logicalSearch.scenarioId}-${propertySuffix}`,
    reviewScore: 9,
    reviewCount: 500,
    distance: 1,
    offers: [
      {
        id: `raw-offer-${logicalSearch.logicalSearchId}`,
        providerOfferReference: `raw-reference-${logicalSearch.logicalSearchId}`,
        currency: "EUR",
        price: total,
        totalKnownCost: total,
        taxesIncluded: true,
        unknownTaxes: 0,
        taxBreakdown: [{ description: "tax", amount: 1, included: true }],
        refundable: true,
        cancellationPenalty: null,
        paymentTiming: "pay-now",
        bookable: true,
        roomName: "Standard double room",
        mealPlan: "Breakfast included",
      },
    ],
  };
}

function successfulTransportFactory(callLog = []) {
  return async () => ({
    async request({ method, endpointPath, logicalSearch }) {
      callLog.push({ method, endpointPath, logicalSearch });
      return { status: 200, hotels: [mappedHotelForSearch(logicalSearch)] };
    },
  });
}

async function executeWithTransport(matrix, transportFactory, time = virtualTime()) {
  return runSplitF0Collector({
    matrix,
    options: executableOptions(),
    apiKey: SAFE_SANDBOX_KEY,
    transportFactory,
    observedAt: FIXED_OBSERVED_AT,
    sleep: time.sleep,
    monotonicNow: time.now,
  });
}

test("collector defaults to dry-run and constructs 8 scenarios with 40 logical searches without network", async () => {
  const options = parseSplitF0CollectorArguments([]);
  assert.equal(options.mode, "dry-run");
  const matrix = await loadSplitF0ScenarioMatrix();
  const calls = [];
  const result = await runSplitF0Collector({
    matrix,
    options,
    apiKey: null,
    transportFactory: successfulTransportFactory(calls),
  });
  assert.equal(result.collectorStatus, "DRY_RUN_ONLY");
  assert.deepEqual(result.dryRun, {
    status: "PASS",
    scenarios: 8,
    logicalSearches: 40,
    httpRequests: 0,
  });
  assert.equal(calls.length, 0);
  const plan = buildSplitF0LogicalSearchPlan(matrix);
  assert.equal(plan.length, 40);
  assert.deepEqual(
    Object.fromEntries(
      matrix.scenarios.map((scenario) => [
        scenario.scenarioId,
        plan.filter((search) => search.scenarioId === scenario.scenarioId).length,
      ])
    ),
    Object.fromEntries(matrix.scenarios.map((scenario) => [scenario.scenarioId, 5]))
  );
});

test("sandbox identity gate rejects absent, production and unknown keys before network", async () => {
  assert.deepEqual(validateSplitF0SandboxKey(null), {
    valid: false,
    reason: "sandbox-key-absent",
  });
  assert.equal(validateSplitF0SandboxKey("prod_example").reason, "production-key-prohibited");
  assert.equal(
    validateSplitF0SandboxKey("unknown_example").reason,
    "sandbox-key-prefix-unrecognized"
  );
  assert.equal(validateSplitF0SandboxKey(SAFE_SANDBOX_KEY).valid, true);
  const matrix = await loadSplitF0ScenarioMatrix();
  for (const key of [null, "prod_example", "unknown_example"]) {
    const calls = [];
    const result = await runSplitF0Collector({
      matrix,
      options: executableOptions(),
      apiKey: key,
      transportFactory: successfulTransportFactory(calls),
    });
    assert.equal(result.collectorStatus, "BLOCKED_SANDBOX_CREDENTIAL_NOT_PROVEN");
    assert.equal(result.network.httpRequests, 0);
    assert.equal(calls.length, 0);
  }
});

test("CLI and base URL gates reject production, incompatible flags, repository output, HTTP and arbitrary hosts", () => {
  assert.throws(
    () => parseSplitF0CollectorArguments(["--execute", "--environment", "production"]),
    /production-environment-prohibited/
  );
  assert.throws(() => parseSplitF0CollectorArguments(["--dry-run", "--execute"]), /modes-incompatible/);
  assert.throws(() => parseSplitF0CollectorArguments(["--unknown"]), /flag-unknown/);
  assert.throws(
    () =>
      parseSplitF0CollectorArguments([
        "--execute",
        "--environment",
        "sandbox",
        "--output",
        path.join(SPLIT_F0_REPOSITORY_ROOT, "tmp"),
      ]),
    /output-path-inside-repository/
  );
  assert.equal(validateSplitF0BaseUrl("http://api.liteapi.travel/v3.0").valid, false);
  assert.equal(validateSplitF0BaseUrl("https://localhost/v3.0").valid, false);
  assert.equal(validateSplitF0BaseUrl("https://127.0.0.1/v3.0").valid, false);
  assert.equal(validateSplitF0BaseUrl("https://example.com/v3.0").valid, false);
  assert.equal(validateSplitF0BaseUrl("https://user:pass@api.liteapi.travel/v3.0").valid, false);
  assert.equal(validateSplitF0BaseUrl("https://api.liteapi.travel/v3.0").valid, true);
});

test("endpoint allowlist blocks Prebook, Book, payment and every non-read-only surface", () => {
  assert.equal(assertSplitF0EndpointAllowed("POST", "/hotels/rates"), "rates-search");
  assert.equal(assertSplitF0EndpointAllowed("GET", "/data/hotels"), "static-hotel-metadata");
  assert.equal(assertSplitF0EndpointAllowed("GET", "/data/facilities"), "static-hotel-facilities");
  for (const endpoint of [
    "/rates/prebook",
    "/rates/book",
    "/booking/create",
    "/payments",
    "/wallet",
    "/checkout",
    "/rates/cancel",
    "/commission",
  ]) {
    assert.throws(() => assertSplitF0EndpointAllowed("POST", endpoint), /endpoint-prohibited/);
  }
  assert.throws(() => assertSplitF0EndpointAllowed("GET", "/destinations"), /not-allowlisted/);
});

test("budget ledger enforces 120 global and 15 per scenario without overruns", () => {
  const scenarioBudget = createSplitF0BudgetLedger();
  for (let index = 0; index < SPLIT_F0_MAX_HTTP_REQUESTS_PER_SCENARIO; index += 1) {
    scenarioBudget.reserve("scenario-a");
  }
  assert.throws(() => scenarioBudget.reserve("scenario-a"), /scenario-http-budget-exhausted/);
  assert.equal(scenarioBudget.scenarioCount("scenario-a"), 15);

  const globalBudget = createSplitF0BudgetLedger();
  for (let index = 0; index < SPLIT_F0_MAX_HTTP_REQUESTS; index += 1) {
    globalBudget.reserve(`scenario-${Math.floor(index / 15)}`);
  }
  assert.throws(() => globalBudget.reserve("scenario-final"), /global-http-budget-exhausted/);
  assert.equal(globalBudget.httpRequests, 120);
});

test("rate limiter serializes successful requests at no more than four per second", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const time = virtualTime();
  const starts = [];
  const result = await executeWithTransport(
    matrix,
    async () => ({
      async request({ logicalSearch }) {
        starts.push(time.now());
        return { status: 200, hotels: [mappedHotelForSearch(logicalSearch)] };
      },
    }),
    time
  );
  assert.equal(result.network.httpRequests, 40);
  assert.equal(starts.length, 40);
  for (let index = 1; index < starts.length; index += 1) {
    assert.ok(starts[index] - starts[index - 1] >= 250);
  }
});

test("retry policy is limited to two retries and never retries permanent 4xx", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const transient = await executeWithTransport(matrix, async () => ({
    async request() {
      const error = new Error("temporary");
      error.status = 503;
      throw error;
    },
  }));
  assert.equal(transient.network.httpRequests, 120);
  assert.equal(transient.network.retries, 80);
  assert.equal(transient.network.providerErrors, 40);

  const permanent = await executeWithTransport(matrix, async () => ({
    async request() {
      const error = new Error("permanent");
      error.status = 400;
      throw error;
    },
  }));
  assert.equal(permanent.network.httpRequests, 40);
  assert.equal(permanent.network.retries, 0);
  assert.equal(permanent.network.providerErrors, 40);
});

test("normalized sandbox output fingerprints raw IDs, strips secrets and remains byte-identical for identical inputs", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const first = await executeWithTransport(matrix, successfulTransportFactory());
  const second = await executeWithTransport(matrix, successfulTransportFactory());
  const firstBytes = stableStringifySplitF0(first);
  assert.equal(firstBytes, stableStringifySplitF0(second));
  assert.equal(first.environment, "sandbox");
  assert.equal(first.technicalCalibrationOnly, true);
  assert.equal(first.marketEvidence, false);
  assert.equal(first.policyEligible, false);
  assert.equal(first.publicRecommendationAllowed, false);
  assert.equal(first.counters.normalizedOffers, 40);
  assert.equal(first.counters.scenariosWithComparableData, 8);
  assert.equal(first.counters.sandboxLogicalSearches, 40);
  for (const forbidden of [
    SAFE_SANDBOX_KEY,
    "raw-hotel-",
    "raw-offer-",
    "raw-reference-",
    "X-Api-Key",
    "providerOfferReference",
    "hotelName",
    "address",
    "deepLink",
    "commission",
    "markup",
  ]) {
    assert.equal(firstBytes.includes(forbidden), false, forbidden);
  }
  for (const search of first.searches) {
    for (const offer of search.offers) {
      assert.match(offer.propertyId, /^property\.[0-9a-f]{64}$/);
      assert.match(offer.offerSnapshotId, /^offer\.[0-9a-f]{64}$/);
    }
  }
});

test("collector source stays isolated from public runtime, V2/V3 decision cores and policy", async () => {
  const source = await fs.readFile(
    path.join(SPLIT_F0_REPOSITORY_ROOT, "scripts", "run-split-f0-read-only-collector.mjs"),
    "utf8"
  );
  const importSpecifiers = [
    ...source.matchAll(/(?:from\s+|require\(\s*)(["'])([^"']+)\1/g),
  ].map(
    (match) => match[2]
  );
  for (const forbidden of [
    "engine-v2",
    "independentDecisionEngineV3",
    "orchestrator",
    "frontend",
    "server.js",
    "policy",
  ]) {
    assert.equal(importSpecifiers.some((specifier) => specifier.includes(forbidden)), false, forbidden);
  }
  assert.equal(importSpecifiers.some((specifier) => specifier.endsWith("splitF0EconomicFeasibilityPilotV3.ts")), true);
  assert.equal(importSpecifiers.some((specifier) => specifier === "axios"), false);
  assert.equal(importSpecifiers.some((specifier) => specifier.endsWith("liteApiClient.js")), false);
  assert.equal(importSpecifiers.some((specifier) => specifier.endsWith("liteApiProvider.js")), true);
  assert.equal(source.includes("globalThis.fetch"), true);
});

test("Node 24 live transport is dependency-free and preserves key, endpoint, timeout and redirect gates", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const logicalSearch = buildSplitF0LogicalSearchPlan(matrix)[0];
  const calls = [];
  const transport = await createSplitF0LiteApiTransport({
    apiKey: SAFE_SANDBOX_KEY,
    baseUrl: "https://api.liteapi.travel/v3.0",
    fetchImplementation: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        status: 200,
        redirected: false,
        url: String(url),
        text: async () => JSON.stringify({ data: [] }),
      };
    },
    timeoutMs: 50,
  });
  const response = await transport.request({
    method: "POST",
    endpointPath: "/hotels/rates",
    logicalSearch,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.hotels, []);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[0].options.signal instanceof AbortSignal, true);
  assert.equal(calls[0].options.headers["X-Api-Key"], SAFE_SANDBOX_KEY);
  assert.equal(JSON.stringify(response).includes(SAFE_SANDBOX_KEY), false);
  await assert.rejects(
    transport.request({
      method: "POST",
      endpointPath: "/rates/prebook",
      logicalSearch,
    }),
    /endpoint-prohibited/
  );
  assert.equal(calls.length, 1);

  await assert.rejects(
    createSplitF0LiteApiTransport({
      apiKey: ["prod", "unit-test-only"].join("_"),
      baseUrl: "https://api.liteapi.travel/v3.0",
      fetchImplementation: async () => assert.fail("production key reached fetch"),
    }),
    /live-transport-gate-failed/
  );

  const redirected = await createSplitF0LiteApiTransport({
    apiKey: SAFE_SANDBOX_KEY,
    baseUrl: "https://api.liteapi.travel/v3.0",
    fetchImplementation: async (url) => ({
      status: 302,
      redirected: false,
      url: String(url),
      text: async () => "",
    }),
  });
  await assert.rejects(
    redirected.request({ method: "POST", endpointPath: "/hotels/rates", logicalSearch }),
    /redirect was blocked/
  );

  const timedOut = await createSplitF0LiteApiTransport({
    apiKey: SAFE_SANDBOX_KEY,
    baseUrl: "https://api.liteapi.travel/v3.0",
    fetchImplementation: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
        );
      }),
    timeoutMs: 2,
  });
  await assert.rejects(
    timedOut.request({ method: "POST", endpointPath: "/hotels/rates", logicalSearch }),
    (caught) => caught?.code === "ECONNABORTED"
  );

  const invalidJson = await createSplitF0LiteApiTransport({
    apiKey: SAFE_SANDBOX_KEY,
    baseUrl: "https://api.liteapi.travel/v3.0",
    fetchImplementation: async (url) => ({
      status: 200,
      redirected: false,
      url: String(url),
      text: async () => "not-json",
    }),
  });
  await assert.rejects(
    invalidJson.request({ method: "POST", endpointPath: "/hotels/rates", logicalSearch }),
    (caught) => caught?.code === "INVALID_PROVIDER_JSON"
  );
});

test("matrix is read deterministically from the committed F0B fixture", async () => {
  const first = await fs.readFile(SPLIT_F0_MATRIX_PATH);
  const second = await fs.readFile(SPLIT_F0_MATRIX_PATH);
  assert.deepEqual(first, second);
  const matrix = JSON.parse(first.toString("utf8"));
  assert.equal(matrix.scenarios.length, 8);
  assert.deepEqual(matrix.scenarios.map((scenario) => scenario.nights), [5, 7, 10, 12, 14, 21, 28, 30]);
});
