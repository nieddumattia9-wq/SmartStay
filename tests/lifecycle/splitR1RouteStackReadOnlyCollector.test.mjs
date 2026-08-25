import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPLIT_R1_AUTH_ENDPOINT,
  SPLIT_R1_DESTINATION_ENDPOINT,
  SPLIT_R1_EXPECTED_DURATIONS,
  SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
  SPLIT_R1_OFFICIAL_BASE_URL,
  SPLIT_R1_REPOSITORY_ROOT,
  assertSplitR1EndpointAllowed,
  assertSplitR1PersistedPayloadSafe,
  buildSplitR1DryRunPlan,
  createSplitR1ContinuationRequest,
  createSplitR1HotelSearchRequest,
  createSplitR1NativeTransport,
  createSplitR1PartnerTokenRequest,
  evaluateSplitR1SearchLevelScenario,
  normalizeSplitR1SearchResponse,
  parseSplitR1Arguments,
  runSplitR1Collector,
  selectSplitR1DestinationCandidate,
  validateSplitR1BaseUrl,
} from "../../scripts/run-split-r1-routestack-read-only-collector.mjs";
import {
  buildSplitF0LogicalSearchPlan,
  loadSplitF0ScenarioMatrix,
} from "../../scripts/run-split-f0-read-only-collector.mjs";

const TEST_KEY = Buffer.alloc(32, 7);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function rawHotel(id, ourprice, currency = "EUR") {
  return {
    id,
    ourprice,
    baseprice: ourprice + 100,
    saving: 999999,
    currency,
  };
}

function normalizedOffer(logicalSearch, property, cents) {
  return {
    schemaVersion: "stayopti.split-r1.search-level-offer@1",
    logicalSearchId: logicalSearch.logicalSearchId,
    scenarioId: logicalSearch.scenarioId,
    searchKind: logicalSearch.kind,
    splitPointId: logicalSearch.splitPointId,
    segmentOrdinal: logicalSearch.segmentOrdinal,
    propertyFingerprint: `hmac-sha256:${property.padEnd(64, "0")}`,
    totalMinorUnits: cents,
    total: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`,
    currency: "EUR",
    basePriceDiagnosticAvailable: true,
    providerSavingUsed: false,
    taxCompleteness: "unknown",
    comparabilityCeiling: "CONDITIONAL_COMPARABLE",
    evidenceLimits: [
      "search-level-total-cost-semantics-unproven",
      "taxes-and-mandatory-costs-unproven",
      "room-board-cancellation-payment-unproven",
    ],
  };
}

test("default mode is deterministic dry-run with eight scenarios, forty searches and zero fetch", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  assert.deepEqual(parseSplitR1Arguments([]), { mode: "dry-run" });
  assert.deepEqual(parseSplitR1Arguments(["--dry-run"]), { mode: "dry-run" });
  let fetchCalls = 0;
  const result = await runSplitR1Collector({
    matrix,
    options: parseSplitR1Arguments([]),
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("network-must-not-run");
    },
  });
  assert.equal(result.mode, "DRY_RUN_ONLY");
  assert.equal(result.scenarios, 8);
  assert.deepEqual(result.durations, SPLIT_R1_EXPECTED_DURATIONS);
  assert.equal(result.logicalSearches, 40);
  assert.equal(result.httpRequests, 0);
  assert.equal(fetchCalls, 0);
  assert.deepEqual(Object.values(result.searchesByScenario), Array(8).fill(5));
  assert.deepEqual(result, buildSplitR1DryRunPlan(matrix));
});

test("live mode requires both confirmations before credential or network access", async () => {
  assert.throws(
    () => parseSplitR1Arguments(["--execute-production-read-only"]),
    /live-confirmations-incomplete/
  );
  assert.throws(() => parseSplitR1Arguments(["--unknown"]), /unknown-argument/);
  assert.deepEqual(
    parseSplitR1Arguments([
      "--execute-production-read-only",
      "--confirm-routestack-search-only",
    ]),
    { mode: "execute-production-read-only" }
  );
});

test("partner-token request uses integer seconds and HMAC-SHA256 base64url over the exact contract", () => {
  const apiKey = "synthetic-key";
  const apiSecret = "synthetic-secret";
  const nonce = "00000000-0000-4000-8000-000000000001";
  const request = createSplitR1PartnerTokenRequest({
    apiKey,
    apiSecret,
    now: () => 1_800_000_123_987,
    randomUUID: () => nonce,
  });
  assert.equal(request.timestamp, 1_800_000_123);
  assert.equal(Number.isSafeInteger(request.timestamp), true);
  assert.equal(request.nonce, nonce);
  assert.equal(
    request.hmac,
    crypto
      .createHmac("sha256", apiSecret)
      .update(`${apiKey}:${request.timestamp}:${nonce}`)
      .digest("base64url")
  );
  assert.match(request.hmac, /^[A-Za-z0-9_-]+$/);
});

test("host and endpoint allowlists admit only the three read-only RouteStack surfaces", () => {
  assert.equal(validateSplitR1BaseUrl(SPLIT_R1_OFFICIAL_BASE_URL), SPLIT_R1_OFFICIAL_BASE_URL);
  for (const endpoint of [
    SPLIT_R1_AUTH_ENDPOINT,
    SPLIT_R1_DESTINATION_ENDPOINT,
    SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
  ]) {
    assert.equal(assertSplitR1EndpointAllowed("POST", endpoint), true);
  }
  for (const url of [
    "http://mcp.routestack.ai",
    "https://example.com",
    "https://mcp.routestack.ai/extra",
    "https://user@example.com",
  ]) {
    assert.throws(() => validateSplitR1BaseUrl(url), /not-allowlisted/);
  }
  for (const endpoint of [
    "/mcp/hotel/get-hotel-details",
    "/mcp/hotel/rooms-and-rates",
    "/mcp/hotel/revalidate",
    "/mcp/hotel/prebook",
    "/mcp/hotel/book",
    "/mcp/payment",
  ]) {
    assert.throws(() => assertSplitR1EndpointAllowed("POST", endpoint), /not-allowlisted/);
  }
});

test("geographic destination selection is deterministic, unique and bounded to frozen coordinates", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[1];
  const selected = selectSplitR1DestinationCandidate(
    {
      result: [
        { id: "far", coordinates: { lat: 45.6, long: 9.3 } },
        { id: "nearest", coordinates: { lat: 45.4643, long: 9.1901 } },
      ],
    },
    scenario
  );
  assert.equal(selected.id, "nearest");
  assert.ok(selected.distanceKm < 1);
  assert.throws(
    () =>
      selectSplitR1DestinationCandidate(
        { result: [{ id: "far", coordinates: { lat: 46.5, long: 10.5 } }] },
        scenario
      ),
    /not-within-25km/
  );
});

test("hotel search request conforms to required OpenAPI roomCount and rooms contract", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const search = buildSplitF0LogicalSearchPlan(matrix)[0];
  const request = createSplitR1HotelSearchRequest(search, {
    id: "memory-only-destination",
    latitude: search.request.latitude,
    longitude: search.request.longitude,
  });
  assert.deepEqual(Object.keys(request).sort(), [
    "checkIn",
    "checkOut",
    "currency",
    "destinationId",
    "lat",
    "long",
    "roomCount",
    "rooms",
  ]);
  assert.equal(request.roomCount, request.rooms.length);
  assert.equal(request.rooms[0].adults, search.request.occupancy.adults);
  assert.equal(request.rooms[0].children, request.rooms[0].childAges.length);
  assert.equal("city" in request, false);
  assert.equal("destinationType" in request, false);
});

test("continuation preserves the original body and same-session private context for at most two calls", () => {
  const original = {
    destinationId: "memory-only",
    lat: 1,
    long: 2,
    checkIn: "2027-01-01",
    checkOut: "2027-01-07",
    roomCount: 1,
    rooms: [{ adults: 2, children: 0, childAges: [] }],
    currency: "EUR",
  };
  const response = {
    result: {
      token: "memory-token",
      correlationId: "memory-correlation",
      nextResultsKey: "memory-next",
    },
  };
  const continuation = createSplitR1ContinuationRequest(original, response, 2);
  assert.deepEqual(
    Object.fromEntries(Object.entries(continuation).filter(([key]) => !(key in response.result))),
    original
  );
  assert.equal(continuation.token, response.result.token);
  assert.equal(continuation.correlationId, response.result.correlationId);
  assert.equal(continuation.nextResultsKey, response.result.nextResultsKey);
  assert.throws(() => createSplitR1ContinuationRequest(original, response, 3), /budget-exceeded/);
});

test("native fetch transport disables redirects and never reaches a forbidden request", async () => {
  const calls = [];
  const transport = createSplitR1NativeTransport({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ token: "memory-only-token" });
    },
  });
  await transport.post(SPLIT_R1_AUTH_ENDPOINT, {
    apiKey: "synthetic",
    timestamp: 1_800_000_000,
    nonce: "synthetic",
    hmac: "synthetic",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${SPLIT_R1_OFFICIAL_BASE_URL}${SPLIT_R1_AUTH_ENDPOINT}`);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.redirect, "error");
  assert.throws(
    () => assertSplitR1EndpointAllowed("POST", "/mcp/hotel/get-hotel-details"),
    /not-allowlisted/
  );
});

test("search-level normalization uses ourprice only, ignores provider saving and persists only run-local identity", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const logicalSearch = buildSplitF0LogicalSearchPlan(matrix)[0];
  const offers = normalizeSplitR1SearchResponse(
    {
      result: {
        currency: "EUR",
        result: [
          rawHotel("raw-hotel-one", 123.45),
          rawHotel("raw-hotel-no-positive-price", 0),
          { id: "raw-hotel-base-only", baseprice: 1 },
        ],
      },
    },
    { logicalSearch, ephemeralRunKey: TEST_KEY }
  );
  assert.equal(offers.length, 1);
  assert.equal(offers[0].totalMinorUnits, 12345);
  assert.equal(offers[0].total, "123.45");
  assert.equal(offers[0].providerSavingUsed, false);
  assert.equal(offers[0].taxCompleteness, "unknown");
  assert.equal(offers[0].comparabilityCeiling, "CONDITIONAL_COMPARABLE");
  const serialized = JSON.stringify(offers);
  assert.equal(serialized.includes("raw-hotel-one"), false);
  assert.match(offers[0].propertyFingerprint, /^hmac-sha256:[0-9a-f]{64}$/);
});

test("fixed best single is selected once before both splits and all valid search-level pairs remain conditional", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[0];
  const searches = buildSplitF0LogicalSearchPlan(matrix).filter(
    (search) => search.scenarioId === scenario.scenarioId
  );
  const full = searches.find((search) => search.kind === "full-stay");
  const segmentSearches = searches.filter((search) => search.kind === "split-segment");
  const offers = [
    normalizedOffer(full, "single-cheap", 50_000),
    normalizedOffer(full, "single-expensive", 90_000),
    ...segmentSearches.flatMap((search) => [
      normalizedOffer(search, search.segmentOrdinal === 0 ? "hotel-a" : "hotel-b", 20_000),
      normalizedOffer(search, "duplicate", 10_000),
    ]),
  ];
  const result = evaluateSplitR1SearchLevelScenario(scenario, offers);
  assert.equal(result.fixedBaseline.totalMinorUnits, 50_000);
  assert.equal(result.fixedBaseline.selectedBeforeSplit, true);
  assert.equal(result.strictComparisons, 0);
  assert.equal(result.conditionalComparisons, 2);
  assert.equal(result.splitResults.length, 2);
  for (const split of result.splitResults) {
    assert.equal(split.comparabilityLevel, "CONDITIONAL_COMPARABLE");
    assert.equal(split.fixedBaselineTotalMinorUnits, 50_000);
    assert.equal(split.splitTotalMinorUnits, 30_000);
    assert.equal(split.grossSavingMinorUnits, 20_000);
    assert.equal(split.frictionSensitivity.length, 6);
    assert.deepEqual(
      split.frictionSensitivity.map((entry) => entry.hypotheticalFrictionEur),
      [0, 25, 50, 75, 100, 150]
    );
    assert.ok(split.evidenceLimits.includes("taxes-and-mandatory-costs-unproven"));
    assert.equal(split.publicRecommendationAllowed, false);
    assert.equal(split.policyEligible, false);
  }
});

test("same-property segment pair is not a Split and unsupported monetary precision fails closed", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[0];
  const searches = buildSplitF0LogicalSearchPlan(matrix).filter(
    (search) => search.scenarioId === scenario.scenarioId
  );
  const full = searches.find((search) => search.kind === "full-stay");
  const firstSplitSearches = searches.filter(
    (search) => search.splitPointId === scenario.splitPoints[0].splitPointId
  );
  const offers = [
    normalizedOffer(full, "single", 50_000),
    ...firstSplitSearches.map((search) => normalizedOffer(search, "same-hotel", 20_000)),
  ];
  const result = evaluateSplitR1SearchLevelScenario(scenario, offers);
  assert.equal(result.splitResults[0].comparabilityLevel, "NON_COMPARABLE");
  assert.equal(result.splitResults[0].reason, "distinct-property-pair-missing");
  assert.equal(result.strictComparisons, 0);

  const logicalSearch = searches[0];
  const normalized = normalizeSplitR1SearchResponse(
    { result: { currency: "EUR", result: [rawHotel("raw-id", 1.001)] } },
    { logicalSearch, ephemeralRunKey: TEST_KEY }
  );
  assert.deepEqual(normalized, []);
});

test("persisted payload scan rejects secret and provider-session key names", () => {
  assert.equal(
    assertSplitR1PersistedPayloadSafe({
      schemaVersion: "safe",
      propertyFingerprint: `hmac-sha256:${"a".repeat(64)}`,
      result: { policyEligible: false },
    }),
    true
  );
  for (const key of ["apiKey", "hotelId", "destinationId", "token", "nextResultsKey"] ) {
    assert.throws(() => assertSplitR1PersistedPayloadSafe({ [key]: "forbidden" }), /forbidden-persisted-key/);
  }
});

test("collector stays isolated from barrels, server, frontend, decision cores and policy", async () => {
  const collectorPath = path.join(
    SPLIT_R1_REPOSITORY_ROOT,
    "scripts",
    "run-split-r1-routestack-read-only-collector.mjs"
  );
  const source = await fs.readFile(collectorPath, "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.deepEqual(
    imports.filter((specifier) => /server|frontend|orchestrator|decisionCore|policy|engine-v2/i.test(specifier)),
    []
  );
  const indexSource = await fs.readFile(
    path.join(SPLIT_R1_REPOSITORY_ROOT, "src", "engine-v3", "index.ts"),
    "utf8"
  );
  assert.equal(indexSource.includes("splitR1RouteStack"), false);
  assert.equal(source.includes("/mcp/hotel/get-hotel-details"), false);
  assert.equal(source.includes("rooms-and-rates"), false);
  assert.equal(source.includes("prebook"), true);
  assert.equal(source.includes("publicRecommendationAllowed: false"), true);
});
