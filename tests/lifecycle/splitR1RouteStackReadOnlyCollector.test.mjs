import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPLIT_R1_AUTH_ENDPOINT,
  SPLIT_R1_CAUSAL_LEDGER_VERSION,
  SPLIT_R1_DESTINATION_ENDPOINT,
  SPLIT_R1_EXPECTED_DURATIONS,
  SPLIT_R1_HARD_HOTEL_SEARCH_HTTP_BUDGET,
  SPLIT_R1_HARD_TOTAL_ROUTESTACK_HTTP_BUDGET,
  SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
  SPLIT_R1_MAX_EARLY_WAKE_CYCLES,
  SPLIT_R1_MAX_RATE_LIMIT_WAIT_MS,
  SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS,
  SPLIT_R1_OFFICIAL_BASE_URL,
  SPLIT_R1_OURPRICE_PROBE_CONTINUATIONS,
  SPLIT_R1_OURPRICE_PROBE_CRITERIA,
  SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET,
  SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS,
  SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET,
  SPLIT_R1_OURPRICE_PROBE_VERSION,
  SPLIT_R1_OURPRICE_PROBE_V2_CONTINUATION_HTTP_BUDGET,
  SPLIT_R1_OURPRICE_PROBE_V2_CONTINUATIONS_PER_WINDOW,
  SPLIT_R1_OURPRICE_PROBE_V2_EARLY_STOP_COMMON_PROPERTY_THRESHOLD,
  SPLIT_R1_OURPRICE_PROBE_V2_HOTEL_SEARCH_HTTP_BUDGET,
  SPLIT_R1_OURPRICE_PROBE_V2_INITIAL_HTTP_BUDGET,
  SPLIT_R1_OURPRICE_PROBE_V2_LIVE_CONFIRMATIONS,
  SPLIT_R1_OURPRICE_PROBE_V2_TOTAL_HTTP_BUDGET,
  SPLIT_R1_OURPRICE_PROBE_V2_VERSION,
  SPLIT_R1_RATE_LIMIT_SAFETY_MARGIN_MS,
  SPLIT_R1_REPOSITORY_ROOT,
  SPLIT_R1_TARGETED_EXPECTED_DURATIONS,
  SPLIT_R1_TARGETED_MATRIX_VERSION,
  SPLIT_R1_TARGETED_PRICE_SEMANTICS_GATE,
  SPLIT_R1_TARGETED_RUN_STATUS,
  assertSplitR1OurpriceClassificationExclusiveV1,
  assertSplitR1OurpriceProbeInitialSearchAllowed,
  assertSplitR1OurpriceProbeV2SearchAllowed,
  assertSplitR1EndpointAllowed,
  assertSplitR1PersistedPayloadSafe,
  buildSplitR1CausalLedger,
  buildSplitR1DryRunPlan,
  buildSplitR1OurpriceSemanticsDryRunV1,
  buildSplitR1OurpriceSemanticsDryRunV2,
  buildSplitR1OurpriceSemanticsLogicalSearchesV1,
  buildSplitR1OurpriceSemanticsLogicalSearchesV2,
  buildSplitR1TargetedDryRunPlanV1,
  buildSplitR1TargetedLogicalSearchPlanV1,
  classifySplitR1TargetedResultV1,
  classifySplitR1OurpriceSemanticsMetricsV1,
  createSplitR1RequestBudgetLedger,
  createSplitR1ContinuationRequest,
  createSplitR1HotelSearchRequest,
  createSplitR1MonotonicRateLimiter,
  createSplitR1NativeTransport,
  createSplitR1PartnerTokenRequest,
  evaluateSplitR1SearchLevelScenario,
  evaluateSplitR1OurpriceSemanticsProbeV1,
  evaluateSplitR1OurpriceSemanticsProbeV2,
  fingerprintSplitR1Identifier,
  hasSplitR1OurpriceProbeContinuationMetadata,
  inspectSplitR1OurpriceProbeV2Continuation,
  normalizeSplitR1SearchPage,
  normalizeSplitR1SearchResponse,
  loadSplitR1OurpriceSemanticsProbeV1,
  loadSplitR1OurpriceSemanticsProbeV2,
  loadSplitR1TargetedScenarioMatrixV1,
  parseSplitR1Arguments,
  runSplitR1Collector,
  runSplitR1OurpriceSemanticsProbeV1,
  runSplitR1OurpriceSemanticsProbeV2,
  replaySplitR1CausalLedger,
  selectSplitR1DestinationCandidate,
  validateSplitR1BaseUrl,
  validateSplitR1OurpriceSemanticsProbeV1,
  validateSplitR1OurpriceSemanticsProbeV2,
  validateSplitR1TargetedScenarioMatrixV1,
} from "../../scripts/run-split-r1-routestack-read-only-collector.mjs";
import {
  buildSplitF0LogicalSearchPlan,
  loadSplitF0ScenarioMatrix,
  stableStringifySplitF0,
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

function targetedClassificationScenario(
  scenarioId,
  duration,
  splitComparisons = [],
  overrides = {}
) {
  return {
    scenarioId,
    duration,
    validComparison: true,
    baselineStable: true,
    samePropertyCounterfactualPositive: false,
    splitComparisons,
    ...overrides,
  };
}

function targetedClassificationInput(scenarios, overrides = {}) {
  return {
    priceSemanticsProven: true,
    causalLedgerComplete: true,
    replayDeterministic: true,
    providerDataSufficient: true,
    scenarios,
    ...overrides,
  };
}

function probeFingerprint(index) {
  return `hmac-sha256:${index.toString(16).padStart(64, "0")}`;
}

function probeReceipts(probe, count, priceForWindow, overrides = {}) {
  return ["A", "B", "AB"].map((windowId) => ({
    windowId,
    currency: overrides.receiptCurrency?.[windowId] ?? "EUR",
    occupancy: structuredClone(
      overrides.occupancy?.[windowId] ?? probe.scenario.occupancy
    ),
    offers: Array.from({ length: count }, (_, index) => ({
      propertyFingerprint: probeFingerprint(index + 1),
      totalMinorUnits: priceForWindow(windowId, index),
      currency: overrides.offerCurrency?.[windowId] ?? "EUR",
    })),
  }));
}

function probeContinuationEnvelope(
  hotels,
  { suffix = "page", next = true, status = "InProgress" } = {}
) {
  return {
    result: {
      currency: "EUR",
      result: hotels,
      status,
      ...(next
        ? {
            nextResultsKey: `memory-next-${suffix}`,
            correlationId: `memory-correlation-${suffix}`,
            token: `memory-token-${suffix}`,
          }
        : {}),
    },
  };
}

async function runOurpriceProbeV2WithFetch(fetchImpl) {
  const probe = await loadSplitR1OurpriceSemanticsProbeV2();
  let monotonicClock = 0;
  return runSplitR1OurpriceSemanticsProbeV2({
    probe,
    options: { mode: "ourprice-probe-v2-live" },
    environment: {
      ROUTESTACK_BASE_URL: SPLIT_R1_OFFICIAL_BASE_URL,
      ROUTESTACK_API_KEY: "synthetic-v2-key",
      ROUTESTACK_API_SECRET: "synthetic-v2-secret",
    },
    execArgv: [`--env-file=${path.join(SPLIT_R1_REPOSITORY_ROOT, "server", ".env")}`],
    fetchImpl,
    now: () => 1_800_000_000_000,
    randomUUID: () => "00000000-0000-4000-8000-000000000096",
    ephemeralRunKey: TEST_KEY,
    monotonicNow: () => monotonicClock,
    sleep: async (milliseconds) => {
      monotonicClock += milliseconds;
    },
  });
}

function coordinateLessRomePayload(id = "memory-rome-destination") {
  return {
    result: [
      { id: "memory-country-result", fullName: "Romania", type: "City" },
      {
        id,
        fullName: "Roma, Metropolitan City of Rome Capital, Italy",
        type: "City",
      },
      {
        id: "memory-romanian-city",
        fullName: "Timisoara, Timis, RO",
        country: "RO",
        type: "City",
        coordinates: { lat: 45.7489, long: 21.2087 },
      },
      {
        id: "memory-romanian-city-two",
        fullName: "Iasi, RO",
        country: "RO",
        type: "City",
        coordinates: { lat: 47.1585, long: 27.6014 },
      },
      {
        id: "memory-romanian-city-three",
        fullName: "Cluj-Napoca, RO",
        country: "RO",
        type: "City",
        coordinates: { lat: 46.7712, long: 23.6236 },
      },
      {
        id: "memory-romanian-city-four",
        fullName: "Constanta, RO",
        country: "RO",
        type: "City",
        coordinates: { lat: 44.1598, long: 28.6348 },
      },
      {
        id: "memory-romanian-city-five",
        fullName: "Bucharest, RO",
        country: "RO",
        type: "City",
        coordinates: { lat: 44.4268, long: 26.1025 },
      },
    ],
  };
}

function causalPage(logicalSearch, hotels, {
  currency = "EUR",
  key = TEST_KEY,
} = {}) {
  return normalizeSplitR1SearchPage(
    { result: { currency, result: hotels } },
    { logicalSearch, ephemeralRunKey: key }
  );
}

function causalSearchState(logicalSearch, pages, status = "COMPLETE") {
  return {
    logicalSearch,
    status,
    initialPageCount: pages.length > 0 ? 1 : 0,
    continuationCount: Math.max(0, pages.length - 1),
    pageDiagnostics: pages,
    offers: pages.flatMap((page) => page.offers),
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

test("targeted matrix freezes six high-variance scenarios and thirty zero-network searches", async () => {
  const matrix = await loadSplitR1TargetedScenarioMatrixV1();
  assert.equal(matrix.schemaVersion, SPLIT_R1_TARGETED_MATRIX_VERSION);
  assert.deepEqual(matrix.scenarios.map((scenario) => scenario.nights), SPLIT_R1_TARGETED_EXPECTED_DURATIONS);
  assert.deepEqual(
    matrix.scenarios.map((scenario) => scenario.destination.label),
    ["Roma", "Firenze", "Amsterdam", "Paris", "Madrid", "Barcelona"]
  );
  assert.equal(validateSplitR1TargetedScenarioMatrixV1(matrix).valid, true);
  for (const scenario of matrix.scenarios) {
    assert.equal(Number.isFinite(scenario.destination.latitude), true);
    assert.equal(Number.isFinite(scenario.destination.longitude), true);
    assert.deepEqual(scenario.occupancy, { adults: 2, childAges: [], rooms: 1, pets: 0 });
    assert.equal(scenario.currency, "EUR");
    assert.equal(scenario.constraints.maximumTotalPrice, null);
    assert.equal(scenario.constraints.maximumSwitches, 1);
    assert.equal(scenario.constraints.distinctPropertiesRequired, true);
    assert.equal(scenario.splitPoints.length, 2);
    for (const splitPoint of scenario.splitPoints) {
      assert.ok(splitPoint.nightsFromStart >= 2);
      assert.ok(scenario.nights - splitPoint.nightsFromStart >= 2);
    }
    for (const anchor of scenario.mechanismAnchors) {
      assert.ok(anchor.date >= scenario.checkIn && anchor.date < scenario.checkOut);
    }
  }
  const searches = buildSplitR1TargetedLogicalSearchPlanV1(matrix);
  assert.equal(searches.length, 30);
  for (const scenario of matrix.scenarios) {
    const scenarioSearches = searches.filter((search) => search.scenarioId === scenario.scenarioId);
    assert.equal(scenarioSearches.length, 5);
    for (const splitPoint of scenario.splitPoints) {
      const segments = scenarioSearches
        .filter((search) => search.splitPointId === splitPoint.splitPointId)
        .sort((left, right) => left.segmentOrdinal - right.segmentOrdinal);
      assert.equal(segments.length, 2);
      assert.equal(segments[0].period.checkIn, scenario.checkIn);
      assert.equal(segments[0].period.checkOut, segments[1].period.checkIn);
      assert.equal(segments[1].period.checkOut, scenario.checkOut);
      assert.equal(segments[0].period.nights + segments[1].period.nights, scenario.nights);
    }
  }
});

test("targeted CLI is explicit, dry-run-only and holds on unproven ourprice semantics", async () => {
  assert.deepEqual(parseSplitR1Arguments(["--targeted-matrix-v1"]), {
    mode: "targeted-dry-run",
  });
  assert.throws(
    () =>
      parseSplitR1Arguments([
        "--targeted-matrix-v1",
        "--execute-production-read-only",
        "--confirm-routestack-search-only",
      ]),
    /targeted-live-not-authorized/
  );
  const matrix = await loadSplitR1TargetedScenarioMatrixV1();
  let fetchCalls = 0;
  const result = await runSplitR1Collector({
    matrix,
    options: { mode: "targeted-dry-run" },
    environment: {},
    execArgv: [],
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("targeted-dry-run-must-not-fetch");
    },
  });
  assert.deepEqual(result, buildSplitR1TargetedDryRunPlanV1(matrix));
  assert.equal(result.scenarios, 6);
  assert.equal(result.logicalSearches, 30);
  assert.equal(result.httpRequests, 0);
  assert.equal(result.targetedLiveAuthorized, false);
  assert.equal(result.priceSemanticsGate, SPLIT_R1_TARGETED_PRICE_SEMANTICS_GATE);
  assert.equal(result.targetedRunStatus, SPLIT_R1_TARGETED_RUN_STATUS);
  assert.equal(result.causalLedgerRequired, SPLIT_R1_CAUSAL_LEDGER_VERSION);
  assert.equal(fetchCalls, 0);
});

test("targeted matrix validation fails closed on scenario, split and threshold drift", async () => {
  const matrix = await loadSplitR1TargetedScenarioMatrixV1();
  const dateDrift = structuredClone(matrix);
  dateDrift.scenarios[0].checkOut = "2027-01-05";
  assert.equal(validateSplitR1TargetedScenarioMatrixV1(dateDrift).valid, false);
  const splitDrift = structuredClone(matrix);
  splitDrift.scenarios[1].splitPoints[0].nightsFromStart = 3;
  assert.equal(validateSplitR1TargetedScenarioMatrixV1(splitDrift).valid, false);
  const thresholdDrift = structuredClone(matrix);
  thresholdDrift.precommittedCriteria.minimumGrossSavingRatio = 0.09;
  assert.equal(validateSplitR1TargetedScenarioMatrixV1(thresholdDrift).valid, false);
});

test("targeted future captures are bound to causal ledger v1 and deterministic replay", async () => {
  const matrix = await loadSplitR1TargetedScenarioMatrixV1();
  const searches = buildSplitR1TargetedLogicalSearchPlanV1(matrix);
  const states = searches.map((logicalSearch) =>
    causalSearchState(logicalSearch, [], "BUDGET_BOUNDED_INCOMPLETE")
  );
  const ledger = buildSplitR1CausalLedger(matrix, states);
  assert.equal(ledger.schemaVersion, SPLIT_R1_CAUSAL_LEDGER_VERSION);
  assert.equal(ledger.searches.length, 30);
  assert.equal(ledger.scenarios.length, 6);
  assert.equal(
    stableStringifySplitF0(replaySplitR1CausalLedger(ledger)),
    stableStringifySplitF0(ledger.replay)
  );
});

test("ourprice probe freezes Roma A, B and AB windows and defaults to three-search zero-network dry-run", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  assert.equal(probe.schemaVersion, SPLIT_R1_OURPRICE_PROBE_VERSION);
  assert.equal(validateSplitR1OurpriceSemanticsProbeV1(probe).valid, true);
  assert.deepEqual(probe.scenario.windows, [
    { windowId: "A", checkIn: "2027-02-02", checkOut: "2027-02-03", nights: 1 },
    { windowId: "B", checkIn: "2027-02-03", checkOut: "2027-02-04", nights: 1 },
    { windowId: "AB", checkIn: "2027-02-02", checkOut: "2027-02-04", nights: 2 },
  ]);
  const searches = buildSplitR1OurpriceSemanticsLogicalSearchesV1(probe);
  assert.equal(searches.length, 3);
  assert.deepEqual(searches.map((search) => search.windowId), ["A", "B", "AB"]);
  assert.equal(searches.every((search) => search.request.currency === "EUR"), true);
  assert.equal(searches.every((search) => search.request.occupancy.adults === 2), true);

  assert.deepEqual(parseSplitR1Arguments(["--ourprice-semantics-probe-v1"]), {
    mode: "ourprice-probe-dry-run",
  });
  let fetchCalls = 0;
  const result = await runSplitR1OurpriceSemanticsProbeV1({
    probe,
    options: { mode: "ourprice-probe-dry-run" },
    environment: {},
    execArgv: [],
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("ourprice-probe-dry-run-must-not-fetch");
    },
  });
  assert.deepEqual(result, buildSplitR1OurpriceSemanticsDryRunV1(probe));
  assert.equal(result.scenarios, 1);
  assert.equal(result.logicalHotelSearches, 3);
  assert.equal(result.httpRequests, 0);
  assert.equal(result.futureHotelSearchHttpCap, 3);
  assert.equal(result.futureTotalHttpCap, 5);
  assert.equal(result.continuationAllowed, false);
  assert.equal(result.targetedLiveMatrixAuthorized, false);
  assert.equal(fetchCalls, 0);
});

test("ourprice probe live mode requires both probe-specific confirmations", () => {
  assert.throws(
    () => parseSplitR1Arguments([SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS[0]]),
    /probe-flag-required/
  );
  assert.throws(
    () =>
      parseSplitR1Arguments([
        "--ourprice-semantics-probe-v1",
        SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS[0],
      ]),
    /probe-live-confirmations-incomplete/
  );
  assert.deepEqual(
    parseSplitR1Arguments([
      "--ourprice-semantics-probe-v1",
      ...SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS,
    ]),
    { mode: "ourprice-probe-live" }
  );
  assert.throws(
    () =>
      parseSplitR1Arguments([
        "--targeted-matrix-v1",
        "--ourprice-semantics-probe-v1",
      ]),
    /probe-incompatible-mode-flags/
  );
});

test("ourprice formulas and frozen thresholds identify total-stay semantics", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  const receipts = probeReceipts(probe, 10, (windowId, index) => {
    const priceA = 10_000 + index * 2;
    const priceB = 12_000 + index * 2;
    if (windowId === "A") return priceA;
    if (windowId === "B") return priceB;
    return priceA + priceB;
  });
  const result = evaluateSplitR1OurpriceSemanticsProbeV1(probe, receipts);
  assert.equal(result.classification, "TOTAL_STAY_EMPIRICALLY_SUPPORTED");
  assert.equal(result.metrics.commonPropertyCount, 10);
  assert.equal(result.metrics.medianTotalError, 0);
  assert.equal(result.metrics.p25TotalError, 0);
  assert.equal(result.metrics.p75TotalError, 0);
  assert.equal(result.metrics.medianNightlyError, 1);
  assert.equal(result.metrics.shareTotalCloser, 1);
  assert.equal(result.metrics.shareNightlyCloser, 0);
  assert.equal(result.metrics.shareTies, 0);
  assert.equal(result.outlierRemovalApplied, false);
  assert.equal(result.conclusionLimits.taxCompleteness, "UNPROVEN");
  assert.equal(result.conclusionLimits.targetedLiveMatrixAuthorized, false);
});

test("ourprice formulas and frozen thresholds identify nightly semantics", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  const receipts = probeReceipts(probe, 10, (windowId, index) => {
    const priceA = 10_000 + index * 2;
    const priceB = 12_000 + index * 2;
    if (windowId === "A") return priceA;
    if (windowId === "B") return priceB;
    return (priceA + priceB) / 2;
  });
  const result = evaluateSplitR1OurpriceSemanticsProbeV1(probe, receipts);
  assert.equal(result.classification, "NIGHTLY_EMPIRICALLY_SUPPORTED");
  assert.equal(result.metrics.medianNightlyError, 0);
  assert.equal(result.metrics.medianTotalError, 0.5);
  assert.equal(result.metrics.shareNightlyCloser, 1);
});

test("ourprice classification remains inconclusive outside thresholds and below ten common properties", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  const ambiguousScale = probeReceipts(probe, 10, (windowId, index) => {
    if (windowId === "A") return 10_000 + index * 2;
    if (windowId === "B") return 12_000 + index * 2;
    return 16_000 + index * 2;
  });
  assert.equal(
    evaluateSplitR1OurpriceSemanticsProbeV1(probe, ambiguousScale).classification,
    "INCONCLUSIVE"
  );
  const nineProperties = probeReceipts(probe, 9, (windowId, index) => {
    const priceA = 10_000 + index * 2;
    const priceB = 12_000 + index * 2;
    if (windowId === "A") return priceA;
    if (windowId === "B") return priceB;
    return priceA + priceB;
  });
  const insufficient = evaluateSplitR1OurpriceSemanticsProbeV1(probe, nineProperties);
  assert.equal(insufficient.metrics.commonPropertyCount, 9);
  assert.equal(insufficient.classification, "INCONCLUSIVE");
});

test("ourprice criteria include exact boundaries and ambiguous classification fails closed", () => {
  assert.equal(SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.minimumCommonPropertyCount, 10);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.maximumMedianTotalError, 0.2);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.minimumMedianNightlyError, 0.35);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.minimumShareTotalCloser, 0.8);
  assert.equal(
    classifySplitR1OurpriceSemanticsMetricsV1({
      commonPropertyCount: 10,
      medianTotalError: 0.2,
      medianNightlyError: 0.35,
      shareTotalCloser: 0.8,
      shareNightlyCloser: 0.1,
    }),
    "TOTAL_STAY_EMPIRICALLY_SUPPORTED"
  );
  assert.equal(
    classifySplitR1OurpriceSemanticsMetricsV1({
      commonPropertyCount: 10,
      medianTotalError: 0.35,
      medianNightlyError: 0.2,
      shareTotalCloser: 0.1,
      shareNightlyCloser: 0.8,
    }),
    "NIGHTLY_EMPIRICALLY_SUPPORTED"
  );
  assert.throws(
    () => assertSplitR1OurpriceClassificationExclusiveV1(true, true),
    /AMBIGUOUS_CLASSIFICATION_INVARIANT_FAILURE/
  );
});

test("ourprice probe excludes currency mismatch and invalid prices without imputation", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  const currencyMismatch = probeReceipts(
    probe,
    10,
    (windowId) => (windowId === "AB" ? 20_000 : 10_000),
    { receiptCurrency: { B: "USD" } }
  );
  const currencyResult = evaluateSplitR1OurpriceSemanticsProbeV1(probe, currencyMismatch);
  assert.equal(currencyResult.metrics.commonPropertyCount, 0);
  assert.equal(currencyResult.classification, "INCONCLUSIVE");
  assert.equal(currencyResult.rejectionCountsByWindow.B.CURRENCY_MISMATCH, 10);

  const invalid = probeReceipts(probe, 3, () => 10_000);
  invalid[0].offers[0].totalMinorUnits = null;
  invalid[0].offers[1].totalMinorUnits = -1;
  invalid[0].offers[2].totalMinorUnits = "10000";
  const invalidResult = evaluateSplitR1OurpriceSemanticsProbeV1(probe, invalid);
  assert.equal(invalidResult.metrics.commonPropertyCount, 0);
  assert.equal(invalidResult.rejectionCountsByWindow.A.PRICE_NON_INTEGER, 2);
  assert.equal(invalidResult.rejectionCountsByWindow.A.PRICE_NON_POSITIVE, 1);
});

test("ourprice probe live stub is capped at one auth, one destination and three searches", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  const endpoints = [];
  let monotonicClock = 0;
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url);
    endpoints.push(parsed.pathname);
    assert.equal(init.redirect, "error");
    if (parsed.pathname === SPLIT_R1_AUTH_ENDPOINT) {
      return jsonResponse({ token: "memory-only-partner-token" });
    }
    if (parsed.pathname === SPLIT_R1_DESTINATION_ENDPOINT) {
      return jsonResponse({
        result: [
          {
            id: "memory-only-destination-id",
            coordinates: { lat: 41.9028, long: 12.4964 },
          },
        ],
      });
    }
    const request = JSON.parse(init.body);
    const hotels = Array.from({ length: 10 }, (_, index) => {
      const priceA = 100 + index;
      const priceB = 120 + index;
      const ourprice = request.checkIn === "2027-02-02" && request.checkOut === "2027-02-04"
        ? priceA + priceB
        : request.checkIn === "2027-02-02"
          ? priceA
          : priceB;
      return rawHotel(`memory-only-property-${index}`, ourprice);
    });
    return jsonResponse({ result: { currency: "EUR", result: hotels } });
  };
  const result = await runSplitR1Collector({
    matrix: probe,
    options: { mode: "ourprice-probe-live" },
    environment: {
      ROUTESTACK_BASE_URL: SPLIT_R1_OFFICIAL_BASE_URL,
      ROUTESTACK_API_KEY: "synthetic-key",
      ROUTESTACK_API_SECRET: "synthetic-secret",
    },
    execArgv: [`--env-file=${path.join(SPLIT_R1_REPOSITORY_ROOT, "server", ".env")}`],
    fetchImpl,
    now: () => 1_800_000_000_000,
    randomUUID: () => "00000000-0000-4000-8000-000000000099",
    ephemeralRunKey: TEST_KEY,
    monotonicNow: () => monotonicClock,
    sleep: async (milliseconds) => { monotonicClock += milliseconds; },
    budgetLimits: { hotelSearchHttpBudget: 80, totalRouteStackHttpBudget: 100 },
  });
  assert.equal(result.httpRequests, SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET);
  assert.equal(result.hotelSearchHttpRequests, SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET);
  assert.equal(result.continuationHttpRequests, SPLIT_R1_OURPRICE_PROBE_CONTINUATIONS);
  assert.equal(result.continuationMetadataPresent, false);
  assert.deepEqual(result.continuationMetadataPresentByWindow, {
    A: false,
    B: false,
    AB: false,
  });
  assert.deepEqual(endpoints, [
    SPLIT_R1_AUTH_ENDPOINT,
    SPLIT_R1_DESTINATION_ENDPOINT,
    SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
    SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
    SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
  ]);
  assert.equal(result.evaluation.classification, "TOTAL_STAY_EMPIRICALLY_SUPPORTED");
  const serialized = stableStringifySplitF0(result);
  for (const forbidden of [
    "memory-only-partner-token",
    "memory-only-destination-id",
    "memory-only-property-0",
    "synthetic-key",
    "synthetic-secret",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(result.evaluation.propertyFingerprintsPersisted, 0);
  assert.equal(result.evaluation.ephemeralSecretPersisted, false);
  assert.equal(result.evaluation.crossRunLinkability, false);
});

test("ourprice probe treats continuation metadata as sanitized observation and never follows it", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  let calls = 0;
  let monotonicClock = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const pathname = new URL(url).pathname;
    if (pathname === SPLIT_R1_AUTH_ENDPOINT) return jsonResponse({ token: "memory-token" });
    if (pathname === SPLIT_R1_DESTINATION_ENDPOINT) {
      return jsonResponse({
        result: [{ id: "memory-destination", coordinates: { lat: 41.9028, long: 12.4964 } }],
      });
    }
    return jsonResponse({
      result: {
        currency: "EUR",
        result: [rawHotel("memory-property", 100)],
        nextResultsKey: "memory-continuation-key",
        correlationId: "memory-correlation-id",
        token: "memory-continuation-token",
      },
    });
  };
  const result = await runSplitR1OurpriceSemanticsProbeV1({
    probe,
    options: { mode: "ourprice-probe-live" },
    environment: {
      ROUTESTACK_BASE_URL: SPLIT_R1_OFFICIAL_BASE_URL,
      ROUTESTACK_API_KEY: "synthetic-key",
      ROUTESTACK_API_SECRET: "synthetic-secret",
    },
    execArgv: [`--env-file=${path.join(SPLIT_R1_REPOSITORY_ROOT, "server", ".env")}`],
    fetchImpl,
    now: () => 1_800_000_000_000,
    randomUUID: () => "00000000-0000-4000-8000-000000000098",
    ephemeralRunKey: TEST_KEY,
    monotonicNow: () => monotonicClock,
    sleep: async (milliseconds) => { monotonicClock += milliseconds; },
  });
  assert.equal(calls, 5);
  assert.equal(result.httpRequests, 5);
  assert.equal(result.hotelSearchHttpRequests, 3);
  assert.equal(result.continuationHttpRequests, 0);
  assert.equal(result.continuationMetadataPresent, true);
  assert.deepEqual(result.continuationMetadataPresentByWindow, {
    A: true,
    B: true,
    AB: true,
  });
  assert.equal(result.evaluation.metrics.commonPropertyCount, 1);
  assert.equal(result.evaluation.classification, "INCONCLUSIVE");
  const serialized = stableStringifySplitF0(result);
  for (const forbidden of [
    "memory-continuation-key",
    "memory-correlation-id",
    "memory-continuation-token",
    "memory-property",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("ourprice probe distinguishes observable continuation metadata from a prohibited HTTP request", () => {
  assert.equal(
    hasSplitR1OurpriceProbeContinuationMetadata({
      result: { result: [], nextResultsKey: "memory-next" },
    }),
    true
  );
  assert.equal(
    hasSplitR1OurpriceProbeContinuationMetadata({
      result: { result: [], correlation_id: "memory-correlation", continuationToken: "memory-token" },
    }),
    true
  );
  assert.equal(
    hasSplitR1OurpriceProbeContinuationMetadata({ result: { result: [] } }),
    false
  );
  assert.equal(
    assertSplitR1OurpriceProbeInitialSearchAllowed({
      endpointPath: SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
      continuationRequest: false,
    }),
    true
  );
  assert.throws(
    () =>
      assertSplitR1OurpriceProbeInitialSearchAllowed({
        endpointPath: SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        continuationRequest: true,
      }),
    /continuation-http-request-prohibited/
  );
  assert.throws(
    () =>
      assertSplitR1OurpriceProbeInitialSearchAllowed({
        endpointPath: "/mcp/hotel/search-hotels/continuation",
        continuationRequest: false,
      }),
    /search-endpoint-not-allowlisted/
  );
});

test("ourprice probe completes three metadata-bearing empty initial pages as inconclusive", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  let calls = 0;
  let monotonicClock = 0;
  const result = await runSplitR1OurpriceSemanticsProbeV1({
    probe,
    options: { mode: "ourprice-probe-live" },
    environment: {
      ROUTESTACK_BASE_URL: SPLIT_R1_OFFICIAL_BASE_URL,
      ROUTESTACK_API_KEY: "synthetic-key",
      ROUTESTACK_API_SECRET: "synthetic-secret",
    },
    execArgv: [`--env-file=${path.join(SPLIT_R1_REPOSITORY_ROOT, "server", ".env")}`],
    fetchImpl: async (url) => {
      calls += 1;
      const pathname = new URL(url).pathname;
      if (pathname === SPLIT_R1_AUTH_ENDPOINT) return jsonResponse({ token: "memory-token" });
      if (pathname === SPLIT_R1_DESTINATION_ENDPOINT) {
        return jsonResponse({
          result: [{ id: "memory-destination", coordinates: { lat: 41.9028, long: 12.4964 } }],
        });
      }
      return jsonResponse({
        result: { currency: "EUR", result: [], nextResultsKey: "memory-next" },
      });
    },
    now: () => 1_800_000_000_000,
    randomUUID: () => "00000000-0000-4000-8000-000000000097",
    ephemeralRunKey: TEST_KEY,
    monotonicNow: () => monotonicClock,
    sleep: async (milliseconds) => { monotonicClock += milliseconds; },
  });
  assert.equal(calls, 5);
  assert.equal(result.continuationHttpRequests, 0);
  assert.equal(result.continuationMetadataPresent, true);
  assert.equal(result.evaluation.metrics.commonPropertyCount, 0);
  assert.equal(result.evaluation.classification, "INCONCLUSIVE");
});

test("ourprice probe fixture rejects any increase to its frozen 3/5 budget", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  const hotelIncrease = structuredClone(probe);
  hotelIncrease.futureLiveContract.hotelSearchHttpBudget = 4;
  assert.equal(validateSplitR1OurpriceSemanticsProbeV1(hotelIncrease).valid, false);
  const totalIncrease = structuredClone(probe);
  totalIncrease.futureLiveContract.totalRouteStackHttpBudget = 6;
  assert.equal(validateSplitR1OurpriceSemanticsProbeV1(totalIncrease).valid, false);
});

test("ourprice probe v1 fixture and zero-continuation boundary remain byte-identical", async () => {
  const fixturePath = path.join(
    SPLIT_R1_REPOSITORY_ROOT,
    "tests",
    "engine-v3",
    "fixtures",
    "split-r1-ourprice-semantics-probe-v1.json"
  );
  const bytes = await fs.readFile(fixturePath);
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    "c9f9643f967d9d39383998268685ad7af5cfd7ab898d7f253d3fc9e1d8da92d1"
  );
  const probe = await loadSplitR1OurpriceSemanticsProbeV1();
  assert.equal(probe.futureLiveContract.continuationAllowed, false);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_CONTINUATIONS, 0);
  assert.throws(
    () =>
      assertSplitR1OurpriceProbeInitialSearchAllowed({
        endpointPath: SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        continuationRequest: true,
      }),
    /continuation-http-request-prohibited/
  );
});

test("ourprice probe v2 freezes bounded budgets and defaults to one-scenario zero-network dry-run", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV2();
  const v1 = await loadSplitR1OurpriceSemanticsProbeV1();
  assert.equal(probe.schemaVersion, SPLIT_R1_OURPRICE_PROBE_V2_VERSION);
  assert.equal(validateSplitR1OurpriceSemanticsProbeV2(probe).valid, true);
  assert.equal(
    stableStringifySplitF0(probe.scenario),
    stableStringifySplitF0(v1.scenario)
  );
  assert.equal(SPLIT_R1_OURPRICE_PROBE_V2_INITIAL_HTTP_BUDGET, 3);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_V2_CONTINUATIONS_PER_WINDOW, 2);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_V2_CONTINUATION_HTTP_BUDGET, 6);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_V2_HOTEL_SEARCH_HTTP_BUDGET, 9);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_V2_TOTAL_HTTP_BUDGET, 11);
  assert.equal(SPLIT_R1_OURPRICE_PROBE_V2_EARLY_STOP_COMMON_PROPERTY_THRESHOLD, 10);
  assert.deepEqual(parseSplitR1Arguments(["--ourprice-semantics-probe-v2"]), {
    mode: "ourprice-probe-v2-dry-run",
  });
  assert.throws(
    () => parseSplitR1Arguments(["--ourprice-semantics-probe-v2", "--continuations=3"]),
    /unknown-argument/
  );
  assert.throws(
    () =>
      parseSplitR1Arguments([
        "--ourprice-semantics-probe-v2",
        SPLIT_R1_OURPRICE_PROBE_V2_LIVE_CONFIRMATIONS[0],
      ]),
    /v2-live-confirmations-incomplete/
  );
  assert.deepEqual(
    parseSplitR1Arguments([
      "--ourprice-semantics-probe-v2",
      ...SPLIT_R1_OURPRICE_PROBE_V2_LIVE_CONFIRMATIONS,
    ]),
    { mode: "ourprice-probe-v2-live" }
  );
  let fetchCalls = 0;
  const result = await runSplitR1OurpriceSemanticsProbeV2({
    probe,
    options: { mode: "ourprice-probe-v2-dry-run" },
    environment: {},
    execArgv: [],
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("ourprice-probe-v2-dry-run-must-not-fetch");
    },
  });
  assert.deepEqual(result, buildSplitR1OurpriceSemanticsDryRunV2(probe));
  assert.equal(buildSplitR1OurpriceSemanticsLogicalSearchesV2(probe).length, 3);
  assert.equal(result.scenarios, 1);
  assert.equal(result.logicalHotelSearches, 3);
  assert.equal(result.httpRequests, 0);
  assert.equal(result.futureInitialHotelSearchHttpCap, 3);
  assert.equal(result.futureContinuationHttpCap, 6);
  assert.equal(result.futureHotelSearchHttpCap, 9);
  assert.equal(result.futureTotalHttpCap, 11);
  assert.equal(result.continuationPerWindowMax, 2);
  assert.equal(result.continuationScheduler, "BREADTH_FIRST");
  assert.equal(result.retries, 0);
  assert.equal(result.redirects, 0);
  assert.equal(result.concurrency, 1);
  assert.equal(result.minRequestStartIntervalMs, 1_000);
  assert.equal(fetchCalls, 0);

  for (const [field, value] of [
    ["hotelSearchInitialHttpBudget", 4],
    ["continuationPerWindowMax", 3],
    ["hotelSearchContinuationHttpBudget", 7],
    ["hotelSearchHttpBudget", 10],
    ["totalRouteStackHttpBudget", 12],
  ]) {
    const drift = structuredClone(probe);
    drift.futureLiveContract[field] = value;
    assert.equal(validateSplitR1OurpriceSemanticsProbeV2(drift).valid, false);
  }
});

test("ourprice probe v2 keeps the v1 total, nightly and inconclusive classification criteria", async () => {
  const probe = await loadSplitR1OurpriceSemanticsProbeV2();
  const total = probeReceipts(probe, 10, (windowId, index) => {
    const a = 10_000 + index * 2;
    const b = 12_000 + index * 2;
    return windowId === "A" ? a : windowId === "B" ? b : a + b;
  });
  const nightly = probeReceipts(probe, 10, (windowId, index) => {
    const a = 10_000 + index * 2;
    const b = 12_000 + index * 2;
    return windowId === "A" ? a : windowId === "B" ? b : (a + b) / 2;
  });
  assert.equal(
    evaluateSplitR1OurpriceSemanticsProbeV2(probe, total).classification,
    "TOTAL_STAY_EMPIRICALLY_SUPPORTED"
  );
  assert.equal(
    evaluateSplitR1OurpriceSemanticsProbeV2(probe, nightly).classification,
    "NIGHTLY_EMPIRICALLY_SUPPORTED"
  );
  assert.equal(
    evaluateSplitR1OurpriceSemanticsProbeV2(probe, total.map((receipt) => ({
      ...receipt,
      offers: receipt.offers.slice(0, 9),
    }))).classification,
    "INCONCLUSIVE"
  );
});

test("ourprice probe v2 continuation gate rejects a third request, missing keys and terminal pages", () => {
  assert.equal(
    assertSplitR1OurpriceProbeV2SearchAllowed({
      endpointPath: SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
      continuationOrdinal: 2,
    }),
    true
  );
  assert.throws(
    () =>
      assertSplitR1OurpriceProbeV2SearchAllowed({
        endpointPath: SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        continuationOrdinal: 3,
      }),
    /continuation-budget-exceeded/
  );
  assert.equal(
    inspectSplitR1OurpriceProbeV2Continuation(
      probeContinuationEnvelope([], { suffix: "active" })
    ).canContinue,
    true
  );
  assert.equal(
    inspectSplitR1OurpriceProbeV2Continuation(
      probeContinuationEnvelope([], { suffix: "terminal", status: "Completed" })
    ).canContinue,
    false
  );
  assert.equal(
    inspectSplitR1OurpriceProbeV2Continuation(
      probeContinuationEnvelope([], { next: false, status: "InProgress" })
    ).canContinue,
    false
  );
});

test("ourprice probe v2 accumulates pages breadth-first and early-stops after ten common properties", async () => {
  const hotelOrder = [];
  let hotelCalls = 0;
  const result = await runOurpriceProbeV2WithFetch(async (url, init) => {
    const pathname = new URL(url).pathname;
    if (pathname === SPLIT_R1_AUTH_ENDPOINT) {
      return jsonResponse({ token: "memory-v2-partner-token" });
    }
    if (pathname === SPLIT_R1_DESTINATION_ENDPOINT) {
      return jsonResponse({
        result: [{ id: "memory-v2-destination", coordinates: { lat: 41.9028, long: 12.4964 } }],
      });
    }
    hotelCalls += 1;
    const request = JSON.parse(init.body);
    const windowId = request.checkOut === "2027-02-03" ? "A"
      : request.checkIn === "2027-02-03" ? "B" : "AB";
    const continuation = Object.hasOwn(request, "nextResultsKey");
    hotelOrder.push(`${windowId}:${continuation ? 1 : 0}`);
    if (!continuation) {
      return jsonResponse(probeContinuationEnvelope([
        rawHotel("memory-v2-shared-0", 500),
      ], { suffix: `initial-${windowId}` }));
    }
    const hotels = Array.from({ length: 10 }, (_, index) => {
      const a = 100 + index;
      const b = 120 + index;
      const price = windowId === "A" ? a : windowId === "B" ? b : a + b;
      return rawHotel(`memory-v2-shared-${index}`, price);
    });
    return jsonResponse(
      probeContinuationEnvelope(hotels, { suffix: `round1-${windowId}` })
    );
  });
  assert.deepEqual(hotelOrder, ["A:0", "B:0", "AB:0", "A:1", "B:1", "AB:1"]);
  assert.equal(hotelCalls, 6);
  assert.equal(result.httpRequests, 8);
  assert.equal(result.hotelSearchInitialHttpRequests, 3);
  assert.equal(result.hotelSearchHttpRequests, 6);
  assert.equal(result.continuationHttpRequests, 3);
  assert.equal(result.continuationRoundsExecuted, 1);
  assert.equal(result.commonPropertyCountAfterFirstRound, 10);
  assert.equal(result.earlyStopApplied, true);
  assert.equal(result.evaluation.metrics.commonPropertyCount, 10);
  assert.equal(result.evaluation.classification, "TOTAL_STAY_EMPIRICALLY_SUPPORTED");
  assert.equal(result.evaluation.metrics.priceDistributions.A.minimumMinorUnits, 10_000);
  assert.equal(result.evaluation.rejectionCountsByWindow.A.DUPLICATE_PROPERTY_WORSE_PRICE, 1);
  const serialized = stableStringifySplitF0(result);
  for (const forbidden of [
    "memory-v2-partner-token",
    "memory-v2-destination",
    "memory-v2-shared-0",
    "memory-next-",
    "memory-correlation-",
    "memory-token-",
    "synthetic-v2-key",
    "synthetic-v2-secret",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(result.evaluation.rawIdentifiersPersisted, 0);
  assert.equal(result.evaluation.propertyFingerprintsPersisted, 0);
  assert.equal(result.evaluation.crossRunLinkability, false);
});

test("ourprice probe v2 executes at most two breadth-first continuation rounds and never a third", async () => {
  const hotelOrder = [];
  let hotelCalls = 0;
  const result = await runOurpriceProbeV2WithFetch(async (url, init) => {
    const pathname = new URL(url).pathname;
    if (pathname === SPLIT_R1_AUTH_ENDPOINT) {
      return jsonResponse({ token: "memory-v2-partner-token" });
    }
    if (pathname === SPLIT_R1_DESTINATION_ENDPOINT) {
      return jsonResponse({
        result: [{ id: "memory-v2-destination", coordinates: { lat: 41.9028, long: 12.4964 } }],
      });
    }
    hotelCalls += 1;
    const request = JSON.parse(init.body);
    const windowId = request.checkOut === "2027-02-03" ? "A"
      : request.checkIn === "2027-02-03" ? "B" : "AB";
    const continuationOrdinal = Object.hasOwn(request, "nextResultsKey")
      ? hotelCalls <= 6 ? 1 : 2
      : 0;
    hotelOrder.push(`${windowId}:${continuationOrdinal}`);
    if (continuationOrdinal === 0) {
      return jsonResponse(
        probeContinuationEnvelope([], { suffix: `initial-${windowId}` })
      );
    }
    const start = continuationOrdinal === 1 ? 0 : 5;
    const hotels = Array.from({ length: 5 }, (_, offset) => {
      const index = start + offset;
      const a = 100 + index;
      const b = 120 + index;
      const price = windowId === "A" ? a : windowId === "B" ? b : a + b;
      return rawHotel(`memory-v2-shared-${index}`, price);
    });
    return jsonResponse(
      probeContinuationEnvelope(hotels, {
        suffix: `round${continuationOrdinal}-${windowId}`,
      })
    );
  });
  assert.deepEqual(hotelOrder, [
    "A:0", "B:0", "AB:0",
    "A:1", "B:1", "AB:1",
    "A:2", "B:2", "AB:2",
  ]);
  assert.equal(hotelCalls, 9);
  assert.equal(result.httpRequests, 11);
  assert.equal(result.hotelSearchHttpRequests, 9);
  assert.equal(result.continuationHttpRequests, 6);
  assert.equal(result.continuationRoundsExecuted, 2);
  assert.equal(result.commonPropertyCountAfterFirstRound, 5);
  assert.equal(result.earlyStopApplied, false);
  assert.equal(result.evaluation.metrics.commonPropertyCount, 10);
  assert.equal(result.evaluation.classification, "TOTAL_STAY_EMPIRICALLY_SUPPORTED");
});

test("ourprice probe v2 continues only non-terminal windows with a valid nextResultsKey", async () => {
  const hotelOrder = [];
  let hotelCalls = 0;
  const result = await runOurpriceProbeV2WithFetch(async (url, init) => {
    const pathname = new URL(url).pathname;
    if (pathname === SPLIT_R1_AUTH_ENDPOINT) {
      return jsonResponse({ token: "memory-v2-partner-token" });
    }
    if (pathname === SPLIT_R1_DESTINATION_ENDPOINT) {
      return jsonResponse({
        result: [{ id: "memory-v2-destination", coordinates: { lat: 41.9028, long: 12.4964 } }],
      });
    }
    hotelCalls += 1;
    const request = JSON.parse(init.body);
    const windowId = request.checkOut === "2027-02-03" ? "A"
      : request.checkIn === "2027-02-03" ? "B" : "AB";
    const continuation = Object.hasOwn(request, "nextResultsKey");
    hotelOrder.push(`${windowId}:${continuation ? 1 : 0}`);
    if (continuation) {
      return jsonResponse(probeContinuationEnvelope([], { next: false }));
    }
    if (windowId === "A") {
      return jsonResponse(probeContinuationEnvelope([], { suffix: "active-a" }));
    }
    if (windowId === "B") {
      return jsonResponse(probeContinuationEnvelope([], { next: false }));
    }
    return jsonResponse(
      probeContinuationEnvelope([], { suffix: "terminal-ab", status: "Completed" })
    );
  });
  assert.deepEqual(hotelOrder, ["A:0", "B:0", "AB:0", "A:1"]);
  assert.equal(hotelCalls, 4);
  assert.equal(result.httpRequests, 6);
  assert.equal(result.continuationHttpRequests, 1);
  assert.equal(result.continuationRoundsExecuted, 1);
  assert.equal(result.evaluation.classification, "INCONCLUSIVE");
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

test("targeted classifier counts two split points in one scenario as one signal", () => {
  const scenarios = [
    targetedClassificationScenario("S1", 7, [
      { splitPointId: "half", distinctProperties: true, outlier: false, netSavingAt25Minor: 7_500, netSavingAt50Minor: 5_000, grossSavingRatio: 0.12 },
      { splitPointId: "alt", distinctProperties: true, outlier: false, netSavingAt25Minor: 8_000, netSavingAt50Minor: 5_500, grossSavingRatio: 0.14 },
    ]),
    ...[10, 12, 14, 21, 30].map((duration, index) =>
      targetedClassificationScenario(`S${index + 2}`, duration, [
        { splitPointId: "none", distinctProperties: true, outlier: false, netSavingAt25Minor: -100, netSavingAt50Minor: -2_600, grossSavingRatio: -0.01 },
      ])
    ),
  ];
  const result = classifySplitR1TargetedResultV1(targetedClassificationInput(scenarios));
  assert.equal(result.classification, "CANDIDATE_CONDITIONAL");
  assert.deepEqual(result.qualifyingScenarioIds, ["S1"]);
});

test("targeted classifier enforces candidate GO coverage, distinct scenarios, ratio and long stay", () => {
  const positive = (splitPointId) => ({
    splitPointId,
    distinctProperties: true,
    outlier: false,
    netSavingAt25Minor: 8_000,
    netSavingAt50Minor: 5_500,
    grossSavingRatio: 0.12,
  });
  const negative = {
    splitPointId: "negative",
    distinctProperties: true,
    outlier: false,
    netSavingAt25Minor: -100,
    netSavingAt50Minor: -2_600,
    grossSavingRatio: -0.01,
  };
  const scenarios = [
    targetedClassificationScenario("S1", 7, [positive("a")]),
    targetedClassificationScenario("S2", 14, [positive("b")]),
    targetedClassificationScenario("S3", 12, [negative]),
    targetedClassificationScenario("S4", 21, [negative]),
    targetedClassificationScenario("S5", 30, [negative]),
    targetedClassificationScenario("S6", 10, [negative], { validComparison: false }),
  ];
  const go = classifySplitR1TargetedResultV1(targetedClassificationInput(scenarios));
  assert.equal(go.classification, "CANDIDATE_GO");
  assert.deepEqual(go.qualifyingScenarioIds, ["S1", "S2"]);

  const withoutLongPositive = structuredClone(scenarios);
  withoutLongPositive[1].duration = 10;
  assert.equal(
    classifySplitR1TargetedResultV1(targetedClassificationInput(withoutLongPositive)).classification,
    "HOLD_NO_SIGNAL"
  );
});

test("targeted classifier freezes HOLD causes for no signal, weak ratio and same-property-only signal", () => {
  const negativeScenarios = [7, 10, 12, 14, 21, 30].map((duration, index) =>
    targetedClassificationScenario(`N${index}`, duration, [
      { splitPointId: "negative", distinctProperties: true, outlier: false, netSavingAt25Minor: -100, netSavingAt50Minor: -2_600, grossSavingRatio: -0.01 },
    ])
  );
  const noSignal = classifySplitR1TargetedResultV1(targetedClassificationInput(negativeScenarios));
  assert.equal(noSignal.classification, "HOLD_NO_SIGNAL");
  assert.ok(noSignal.reasonCodes.includes("ZERO_ROBUST_DISTINCT_POSITIVE_AT_25_EUR"));

  const weakRatio = structuredClone(negativeScenarios);
  weakRatio[0].splitComparisons = [
    { splitPointId: "weak", distinctProperties: true, outlier: false, netSavingAt25Minor: 1_000, netSavingAt50Minor: 1, grossSavingRatio: 0.09 },
  ];
  const weak = classifySplitR1TargetedResultV1(targetedClassificationInput(weakRatio));
  assert.equal(weak.classification, "HOLD_NO_SIGNAL");
  assert.ok(weak.reasonCodes.includes("ALL_POSITIVE_RATIOS_BELOW_10_PERCENT"));

  const sameProperty = structuredClone(negativeScenarios);
  sameProperty[0].samePropertyCounterfactualPositive = true;
  sameProperty[0].splitComparisons = [
    { splitPointId: "same", distinctProperties: false, outlier: false, netSavingAt25Minor: 5_000, netSavingAt50Minor: 2_500, grossSavingRatio: 0.2 },
  ];
  const same = classifySplitR1TargetedResultV1(targetedClassificationInput(sameProperty));
  assert.equal(same.classification, "HOLD_NO_SIGNAL");
  assert.ok(same.reasonCodes.includes("SAME_PROPERTY_ONLY_POSITIVITY"));
});

test("targeted classifier quarantines outliers and cannot evade methodology gates", () => {
  const scenarios = [7, 10, 12, 14, 21, 30].map((duration, index) =>
    targetedClassificationScenario(`Q${index}`, duration, [
      {
        splitPointId: "candidate",
        distinctProperties: true,
        outlier: index === 0,
        netSavingAt25Minor: index === 0 ? 10_000 : -100,
        netSavingAt50Minor: index === 0 ? 7_500 : -2_600,
        grossSavingRatio: index === 0 ? 0.2 : -0.01,
      },
    ])
  );
  const quarantined = classifySplitR1TargetedResultV1(targetedClassificationInput(scenarios));
  assert.equal(quarantined.classification, "HOLD_NO_SIGNAL");
  assert.ok(quarantined.reasonCodes.includes("POSITIVITY_DEPENDS_ON_OUTLIER_OR_UNSTABLE_BASELINE"));

  const unproven = classifySplitR1TargetedResultV1(
    targetedClassificationInput(scenarios, { priceSemanticsProven: false })
  );
  assert.equal(unproven.classification, "METHODOLOGY_INCONCLUSIVE");
  assert.ok(unproven.reasonCodes.includes("PRICE_SEMANTICS_UNPROVEN"));

  const incompleteCoverage = structuredClone(scenarios);
  incompleteCoverage.slice(3).forEach((scenario) => { scenario.validComparison = false; });
  const incomplete = classifySplitR1TargetedResultV1(targetedClassificationInput(incompleteCoverage));
  assert.equal(incomplete.classification, "METHODOLOGY_INCONCLUSIVE");
  assert.ok(incomplete.reasonCodes.includes("VALID_COVERAGE_BELOW_4_OF_6"));
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
  assert.equal(selected.selectionMode, "GEOSPATIAL_PRIMARY");
  assert.equal(selected.searchCoordinatesSource, "ROUTESTACK_DESTINATION_RESPONSE");
  assert.equal(selected.providerDestinationCoordinatesAvailable, true);
  assert.throws(
    () =>
      selectSplitR1DestinationCandidate(
        { result: [{ id: "far", coordinates: { lat: 46.5, long: 10.5 } }] },
        scenario
      ),
    /not-within-25km/
  );
});

test("unique coordinate-less Rome identity uses frozen coordinates with explicit provenance", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[0];
  const selected = selectSplitR1DestinationCandidate(
    coordinateLessRomePayload("memory-rome-without-coordinates"),
    scenario
  );
  assert.equal(selected.id, "memory-rome-without-coordinates");
  assert.equal(selected.latitude, 41.9028);
  assert.equal(selected.longitude, 12.4964);
  assert.equal(selected.distanceKm, null);
  assert.equal(
    selected.selectionMode,
    "UNIQUE_TEXT_COUNTRY_MATCH_WITH_FROZEN_COORDINATES"
  );
  assert.equal(selected.destinationIdSource, "ROUTESTACK_DESTINATION_RESPONSE");
  assert.equal(selected.searchCoordinatesSource, "FROZEN_SCENARIO_MATRIX");
  assert.equal(selected.providerDestinationCoordinatesAvailable, false);
  assert.notEqual(selected.id, "memory-romanian-city");
  assert.notEqual(selected.id, "memory-romanian-city-two");
  assert.notEqual(selected.id, "memory-romanian-city-three");
  assert.notEqual(selected.id, "memory-romanian-city-four");
  assert.notEqual(selected.id, "memory-romanian-city-five");
});

test("geospatial primary wins and coordinate-less fallback rejects contradictory or ambiguous identity", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[0];
  const fallback = coordinateLessRomePayload().result[1];
  const primary = selectSplitR1DestinationCandidate(
    {
      result: [
        fallback,
        {
          id: "memory-nearby-primary",
          fullName: "Provider canonical destination",
          type: "City",
          coordinates: { lat: 41.9029, long: 12.4965 },
        },
      ],
    },
    scenario
  );
  assert.equal(primary.id, "memory-nearby-primary");
  assert.equal(primary.selectionMode, "GEOSPATIAL_PRIMARY");

  assert.throws(
    () =>
      selectSplitR1DestinationCandidate(
        {
          result: [
            fallback,
            {
              id: "memory-contradictory-rome",
              fullName: "Rome, Italy",
              type: "City",
              coordinates: { lat: 45, long: 15 },
            },
          ],
        },
        scenario
      ),
    /coordinates-contradict/
  );
  assert.throws(
    () =>
      selectSplitR1DestinationCandidate(
        { result: [fallback, { ...fallback, id: "memory-second-rome" }] },
        scenario
      ),
    /nearest-ambiguous/
  );
});

test("coordinate-less fallback fails closed on country, substring, coordinates, type and frozen reference defects", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[0];
  const select = (candidate, scenarioOverride = scenario) =>
    selectSplitR1DestinationCandidate({ result: [candidate] }, scenarioOverride);

  assert.throws(
    () =>
      select({
        id: "memory-wrong-country",
        fullName: "Roma, France",
        country: "FR",
        type: "City",
      }),
    /not-within-25km/
  );
  assert.throws(
    () =>
      select({
        id: "memory-substring-only",
        fullName: "Roma Nord, Italy",
        type: "City",
      }),
    /not-within-25km/
  );
  assert.throws(
    () =>
      select({
        id: "memory-incompatible-type",
        fullName: "Roma, Italy",
        type: "Hotel",
      }),
    /not-within-25km/
  );
  assert.throws(
    () =>
      select({
        id: "memory-invalid-coordinates",
        fullName: "Roma, Italy",
        type: "City",
        coordinates: { lat: "not-a-number", long: 12.4964 },
      }),
    /coordinates-invalid/
  );
  assert.throws(
    () =>
      select({
        id: "memory-swapped-coordinates",
        fullName: "Roma, Italy",
        type: "City",
        coordinates: { lat: 12.4964, long: 41.9028 },
      }),
    /coordinates-appear-swapped/
  );
  assert.throws(
    () => select({ id: "memory-rome", fullName: "Roma, Italy", type: "City" }, {
      ...scenario,
      destination: { ...scenario.destination, latitude: undefined },
    }),
    /frozen-destination-coordinates-invalid/
  );
  assert.throws(
    () => select({ id: "memory-rome", fullName: "Roma, Italy", type: "City" }, {
      ...scenario,
      destination: { ...scenario.destination, longitude: "invalid" },
    }),
    /frozen-destination-coordinates-invalid/
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

test("atomic budgets admit hotel request 80 and total request 100 but block the next before fetch", () => {
  const hotelLedger = createSplitR1RequestBudgetLedger();
  for (let ordinal = 1; ordinal <= 80; ordinal += 1) {
    const reservation = hotelLedger.reserve("hotel-search");
    assert.equal(reservation.reserved, true);
    assert.equal(reservation.hotelSearchOrdinal, ordinal);
  }
  assert.deepEqual(hotelLedger.reserve("hotel-search"), {
    reserved: false,
    reason: "HOTEL_SEARCH_HTTP_BUDGET_EXHAUSTED",
  });
  assert.equal(hotelLedger.snapshot().hotelSearchRequests, 80);

  const totalLedger = createSplitR1RequestBudgetLedger();
  for (let ordinal = 1; ordinal <= 100; ordinal += 1) {
    const requestClass = ordinal <= 80 ? "hotel-search" : "destination";
    const reservation = totalLedger.reserve(requestClass);
    assert.equal(reservation.reserved, true);
    assert.equal(reservation.ordinal, ordinal);
  }
  assert.deepEqual(totalLedger.reserve("authentication"), {
    reserved: false,
    reason: "TOTAL_ROUTESTACK_HTTP_BUDGET_EXHAUSTED",
  });
  assert.equal(totalLedger.snapshot().totalRouteStackRequests, 100);
});

test("external settings can only tighten hard caps and rate interval", () => {
  assert.throws(
    () =>
      createSplitR1RequestBudgetLedger({
        hotelSearchHttpBudget: SPLIT_R1_HARD_HOTEL_SEARCH_HTTP_BUDGET + 1,
      }),
    /increase-prohibited/
  );
  assert.throws(
    () =>
      createSplitR1RequestBudgetLedger({
        totalRouteStackHttpBudget: SPLIT_R1_HARD_TOTAL_ROUTESTACK_HTTP_BUDGET + 1,
      }),
    /increase-prohibited/
  );
  assert.throws(
    () =>
      createSplitR1NativeTransport({
        fetchImpl: async () => jsonResponse({}),
        minRequestStartIntervalMs: SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS - 1,
      }),
    /rate-limit-increase-prohibited/
  );
  assert.doesNotThrow(() =>
    createSplitR1RequestBudgetLedger({
      hotelSearchHttpBudget: 40,
      totalRouteStackHttpBudget: 50,
    })
  );
});

test("monotonic limiter serializes fetches at 1000ms with observed concurrency one and retry zero", async () => {
  let milliseconds = 0;
  let active = 0;
  let maximumActive = 0;
  const starts = [];
  const transport = createSplitR1NativeTransport({
    monotonicNow: () => milliseconds,
    sleep: async (duration) => {
      milliseconds += duration - SPLIT_R1_RATE_LIMIT_SAFETY_MARGIN_MS;
    },
    fetchImpl: async (_url, options) => {
      starts.push(milliseconds);
      assert.equal(options.redirect, "error");
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return jsonResponse({ token: "memory-only-token" });
    },
  });
  await Promise.all([
    transport.post(SPLIT_R1_AUTH_ENDPOINT, {}),
    transport.post(SPLIT_R1_AUTH_ENDPOINT, {}),
    transport.post(SPLIT_R1_AUTH_ENDPOINT, {}),
  ]);
  assert.deepEqual(starts, [0, 1_000, 2_000]);
  assert.equal(maximumActive, 1);
  assert.equal(transport.getMaxObservedConcurrency(), 1);
  assert.equal(transport.getBudgetSnapshot().totalRouteStackRequests, 3);
});

test("monotonic limiter accepts exact threshold and sleeps through a 999ms early wake", async () => {
  let milliseconds = 0;
  const sleeps = [];
  const limiter = createSplitR1MonotonicRateLimiter({
    monotonicNow: () => milliseconds,
    sleep: async (duration) => {
      sleeps.push(duration);
      milliseconds += duration;
    },
  });
  assert.equal(await limiter.awaitStartSlot(), 0);
  milliseconds = 1_000;
  assert.equal(await limiter.awaitStartSlot(), 1_000);
  assert.deepEqual(sleeps, []);
  milliseconds = 1_999;
  assert.equal(await limiter.awaitStartSlot(), 2_001);
  assert.deepEqual(sleeps, [2]);
});

test("monotonic limiter tolerates repeated partial early wakes without weakening 1000ms", async () => {
  let milliseconds = 0;
  const wakeSequence = [400, 850, 999, 1_000];
  const sleeps = [];
  const limiter = createSplitR1MonotonicRateLimiter({
    monotonicNow: () => milliseconds,
    sleep: async (duration) => {
      sleeps.push(duration);
      milliseconds = wakeSequence.shift();
    },
  });
  assert.equal(await limiter.awaitStartSlot(), 0);
  assert.equal(await limiter.awaitStartSlot(), 1_000);
  assert.deepEqual(sleeps, [1_001, 601, 151, 2]);
  assert.equal(wakeSequence.length, 0);
});

test("clock failure stops before fetch and leaves an unsent request out of the ledger", async () => {
  let fetchCalls = 0;
  let transport;
  const ledgerDuringWait = [];
  const ledgerAtFetch = [];
  transport = createSplitR1NativeTransport({
    monotonicNow: () => 0,
    sleep: async () => {
      ledgerDuringWait.push(transport.getBudgetSnapshot().totalRouteStackRequests);
    },
    fetchImpl: async () => {
      fetchCalls += 1;
      ledgerAtFetch.push(transport.getBudgetSnapshot().totalRouteStackRequests);
      return jsonResponse({ token: "memory-only-token" });
    },
  });
  await transport.post(SPLIT_R1_AUTH_ENDPOINT, {});
  await assert.rejects(
    () => transport.post(SPLIT_R1_AUTH_ENDPOINT, {}),
    /RATE_LIMIT_CLOCK_DID_NOT_PROGRESS/
  );
  assert.equal(fetchCalls, 1);
  assert.deepEqual(ledgerAtFetch, [1]);
  assert.equal(transport.getBudgetSnapshot().totalRouteStackRequests, 1);
  assert.deepEqual(ledgerDuringWait, [1, 1, 1, 1]);
});

test("more than ten early wakes stops before an eleventh sleep", async () => {
  let milliseconds = 0;
  const wakeSequence = [991, 992, 993, 994, 995, 996, 997, 998, 999, 999.5];
  let sleepCalls = 0;
  const limiter = createSplitR1MonotonicRateLimiter({
    monotonicNow: () => milliseconds,
    sleep: async () => {
      sleepCalls += 1;
      milliseconds = wakeSequence.shift();
    },
  });
  await limiter.awaitStartSlot();
  await assert.rejects(() => limiter.awaitStartSlot(), /RATE_LIMIT_CLOCK_DID_NOT_PROGRESS/);
  assert.equal(sleepCalls, SPLIT_R1_MAX_EARLY_WAKE_CYCLES);
  assert.equal(wakeSequence.length, 0);
});

test("cumulative requested wait never exceeds the 5000ms fail-closed cap", async () => {
  let requestedWait = 0;
  const limiter = createSplitR1MonotonicRateLimiter({
    monotonicNow: () => 0,
    sleep: async (duration) => {
      requestedWait += duration;
    },
  });
  await limiter.awaitStartSlot();
  await assert.rejects(() => limiter.awaitStartSlot(), /RATE_LIMIT_CLOCK_DID_NOT_PROGRESS/);
  assert.equal(requestedWait, 4_004);
  assert.ok(requestedWait <= SPLIT_R1_MAX_RATE_LIMIT_WAIT_MS);
});

test("reserved request remains counted after HTTP failure and no retry is attempted", async () => {
  let fetchCalls = 0;
  const transport = createSplitR1NativeTransport({
    monotonicNow: () => 0,
    sleep: async () => {},
    fetchImpl: async () => {
      fetchCalls += 1;
      return jsonResponse({ error: "synthetic" }, 500);
    },
  });
  await assert.rejects(() => transport.post(SPLIT_R1_AUTH_ENDPOINT, {}), /http-500/);
  assert.equal(fetchCalls, 1);
  assert.equal(transport.getBudgetSnapshot().totalRouteStackRequests, 1);
});

test("live scheduling is breadth-first and budget exhaustion is returned as inconclusive", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const destinationsByLabel = new Map(
    matrix.scenarios.map((scenario) => [scenario.destination.label, scenario.destination])
  );
  let milliseconds = 0;
  const hotelRequestBodies = [];
  const result = await runSplitR1Collector({
    matrix,
    options: {
      mode: "execute-production-read-only",
    },
    environment: {
      ROUTESTACK_BASE_URL: SPLIT_R1_OFFICIAL_BASE_URL,
      ROUTESTACK_API_KEY: "synthetic-key",
      ROUTESTACK_API_SECRET: "synthetic-secret",
    },
    execArgv: [`--env-file=${path.join(SPLIT_R1_REPOSITORY_ROOT, "server", ".env")}`],
    now: () => 1_800_000_000_000,
    randomUUID: () => "00000000-0000-4000-8000-000000000001",
    ephemeralRunKey: TEST_KEY,
    monotonicNow: () => milliseconds,
    sleep: async (duration) => {
      milliseconds += duration;
    },
    fetchImpl: async (url, options) => {
      const endpoint = new URL(url).pathname;
      const body = JSON.parse(options.body);
      if (endpoint === SPLIT_R1_AUTH_ENDPOINT) {
        return jsonResponse({ token: "memory-only-token" });
      }
      if (endpoint === SPLIT_R1_DESTINATION_ENDPOINT) {
        const destination = destinationsByLabel.get(body.query);
        if (body.query === "Roma") {
          return jsonResponse(coordinateLessRomePayload("memory-destination-Roma"));
        }
        return jsonResponse({
          result: [
            {
              id: `memory-destination-${body.query}`,
              coordinates: {
                lat: destination.latitude,
                long: destination.longitude,
              },
            },
          ],
        });
      }
      assert.equal(endpoint, SPLIT_R1_HOTEL_SEARCH_ENDPOINT);
      hotelRequestBodies.push(body);
      return jsonResponse({
        result: {
          currency: "EUR",
          result: [rawHotel(`memory-hotel-${hotelRequestBodies.length}`, 100)],
          token: "memory-session-token",
          correlationId: "memory-correlation",
          nextResultsKey: `memory-next-${hotelRequestBodies.length}`,
        },
      });
    },
  });

  assert.equal(result.runStatus, "INCONCLUSIVE");
  assert.equal(result.httpRequests, 89);
  assert.equal(result.requestBudget.hotelSearchRequests, 80);
  assert.equal(result.requestBudget.requestsByClass.authentication, 1);
  assert.equal(result.requestBudget.requestsByClass.destination, 8);
  assert.equal(result.logicalSearchesCompleted, 0);
  assert.equal(result.logicalSearchesIncomplete, 40);
  assert.equal(result.maxObservedConcurrency, 1);
  assert.equal(hotelRequestBodies.length, 80);
  assert.equal(hotelRequestBodies.slice(0, 40).some((body) => "nextResultsKey" in body), false);
  assert.equal(hotelRequestBodies.slice(40).every((body) => "nextResultsKey" in body), true);
  assert.equal(
    result.incompleteSearches.every((search) => search.status === "BUDGET_BOUNDED_INCOMPLETE"),
    true
  );
  assert.equal(
    result.scenarios.every((scenario) => scenario.fixedBaseline === null),
    true
  );
  assert.equal(JSON.stringify(result).includes("memory-hotel-"), false);
  assert.equal(JSON.stringify(result).includes("memory-session-token"), false);
  assert.equal(JSON.stringify(result).includes("memory-destination-Roma"), false);
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

test("causal normalization reconciles every raw result and minimizes duplicate property prices", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const logicalSearch = buildSplitF0LogicalSearchPlan(matrix)[0];
  const page = causalPage(logicalSearch, [
    rawHotel("raw-ledger-good", 100),
    rawHotel("raw-ledger-good", 90),
    rawHotel("", 80),
    { id: "raw-ledger-missing-price" },
    { id: "raw-ledger-nonnumeric", ourprice: "not-a-number" },
    rawHotel("raw-ledger-nonpositive", 0),
    rawHotel("raw-ledger-precision", 1.001),
  ]);
  const missingCurrencyPage = normalizeSplitR1SearchPage(
    { result: { result: [rawHotel("raw-ledger-no-currency", 10)] } },
    { logicalSearch, ephemeralRunKey: TEST_KEY }
  );
  const mismatchPage = causalPage(logicalSearch, [rawHotel("raw-ledger-usd", 10)], {
    currency: "USD",
  });
  assert.equal(missingCurrencyPage.rejectionCounts.MISSING_CURRENCY, 1);
  assert.equal(mismatchPage.rejectionCounts.CURRENCY_MISMATCH, 1);
  assert.equal(mismatchPage.offers.length, 1);
  const mismatchLedger = buildSplitR1CausalLedger(
    matrix,
    [causalSearchState(logicalSearch, [mismatchPage])]
  );
  assert.equal(mismatchLedger.searches[0].normalizedResultCount, 0);
  assert.equal(mismatchLedger.searches[0].rejectionCounts.CURRENCY_MISMATCH, 1);

  const ledger = buildSplitR1CausalLedger(matrix, [causalSearchState(logicalSearch, [page])]);
  const search = ledger.searches[0];
  assert.equal(ledger.schemaVersion, SPLIT_R1_CAUSAL_LEDGER_VERSION);
  assert.equal(search.rawResultCount, 7);
  assert.equal(search.funnel.RAW_RESULTS, 7);
  assert.equal(search.normalizedResultCount, 1);
  assert.equal(search.rejectionCounts.MISSING_PROPERTY_ID, 1);
  assert.equal(search.rejectionCounts.MISSING_OURPRICE, 1);
  assert.equal(search.rejectionCounts.NON_NUMERIC_OURPRICE, 1);
  assert.equal(search.rejectionCounts.NON_POSITIVE_OURPRICE, 1);
  assert.equal(search.rejectionCounts.UNSUPPORTED_PRECISION, 1);
  assert.equal(search.rejectionCounts.DUPLICATE_PROPERTY_WORSE_PRICE, 1);
  assert.equal(search.properties[0].bestOurpriceMinor, 9_000);
  assert.equal(search.funnelReconciled, true);
  assert.equal(search.initialPageCount, 1);
  assert.equal(search.continuationPageCount, 0);

  const sameRun = fingerprintSplitR1Identifier("raw-ledger-good", TEST_KEY);
  assert.equal(search.properties[0].propertyFingerprint, sameRun);
  assert.equal(fingerprintSplitR1Identifier("raw-ledger-good", TEST_KEY), sameRun);
  assert.notEqual(
    fingerprintSplitR1Identifier("raw-ledger-good", Buffer.alloc(32, 8)),
    sameRun
  );
  const serialized = stableStringifySplitF0(ledger);
  for (const forbidden of [
    "raw-ledger-good",
    "raw-ledger-missing-price",
    "raw-ledger-nonnumeric",
    "raw-ledger-nonpositive",
    "raw-ledger-precision",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(serialized.includes(TEST_KEY.toString("hex")), false);
  assert.equal(ledger.privacy.ephemeralSecretPersisted, false);
  assert.equal(ledger.privacy.crossRunLinkability, false);
  assert.equal(ledger.privacy.rawIdentifiersPersisted, 0);
});

test("causal ledger preserves segment decomposition and replays headline plus counterfactuals deterministically", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[0];
  const searches = buildSplitF0LogicalSearchPlan(matrix).filter(
    (search) => search.scenarioId === scenario.scenarioId
  );
  const full = searches.find((search) => search.kind === "full-stay");
  const states = searches.map((search) => {
    if (search === full) {
      return causalSearchState(search, [causalPage(search, [
        rawHotel("raw-fixed-single", 500),
        rawHotel("raw-common-a", 700),
        rawHotel("raw-common-b", 800),
        rawHotel("raw-full-duplicate", 600),
        rawHotel("raw-full-duplicate", 550),
      ])]);
    }
    if (search.splitPointId === scenario.splitPoints[0].splitPointId) {
      return causalSearchState(search, [causalPage(search, search.segmentOrdinal === 0
        ? [
            rawHotel("raw-same-property", 10),
            rawHotel("raw-segment-a", 20),
            rawHotel("raw-common-a", 21),
            rawHotel("raw-common-b", 21.5),
          ]
        : [
            rawHotel("raw-same-property", 10),
            rawHotel("raw-segment-b", 20),
            rawHotel("raw-common-a", 22),
            rawHotel("raw-common-b", 22.5),
          ])]);
    }
    return causalSearchState(search, [causalPage(search, search.segmentOrdinal === 0
      ? [rawHotel("raw-alt-a", 240), rawHotel("raw-alt-same", 230)]
      : [rawHotel("raw-alt-b", 250), rawHotel("raw-alt-same", 230)])]);
  });
  const ledger = buildSplitR1CausalLedger(matrix, states);
  const scenarioReplay = ledger.replay.scenarios.find(
    (entry) => entry.scenarioId === scenario.scenarioId
  );
  const current = scenarioReplay.counterfactuals.find(
    (entry) => entry.mode === "CURRENT_DISTINCT_PROPERTY_POLICY"
  );
  const halfCurrent = current.splitResults.find(
    (entry) => entry.splitPointId === scenario.splitPoints[0].splitPointId
  );
  assert.notEqual(
    halfCurrent.selectedPair.segment1PropertyFingerprint,
    halfCurrent.selectedPair.segment2PropertyFingerprint
  );
  assert.equal(
    halfCurrent.selectedPair.segment1Minor + halfCurrent.selectedPair.segment2Minor,
    halfCurrent.selectedPair.splitTotalMinor
  );
  assert.equal(halfCurrent.selectedPair.fixedSingleMinor, 50_000);
  assert.equal(halfCurrent.selectedPair.grossSavingMinor, 47_000);
  assert.equal(halfCurrent.selectedPair.frictionSensitivity.length, 6);
  assert.equal(halfCurrent.selectedPair.breakEven.length, 6);
  assert.equal(halfCurrent.selectedPair.classification, "OUTLIER_DIAGNOSTIC");
  assert.ok(halfCurrent.funnel.SAME_PROPERTY_PAIR > 0);
  assert.ok(halfCurrent.funnel.CONDITIONAL_PAIR_ACCEPTED > 0);

  const sameAllowed = scenarioReplay.counterfactuals.find(
    (entry) => entry.mode === "SAME_PROPERTY_ALLOWED_DIAGNOSTIC"
  ).splitResults[0].selectedPair;
  assert.equal(sameAllowed.segment1PropertyFingerprint, sameAllowed.segment2PropertyFingerprint);
  assert.equal(sameAllowed.splitTotalMinor, 2_000);
  const noDistinct = scenarioReplay.counterfactuals.find(
    (entry) => entry.mode === "NO_DISTINCT_PROPERTY_REQUIREMENT"
  ).splitResults[0].selectedPair;
  assert.deepEqual(noDistinct, sameAllowed);

  const commonUniverse = scenarioReplay.counterfactuals.find(
    (entry) => entry.mode === "COMMON_PROPERTY_UNIVERSE_ONLY"
  ).splitResults[0].selectedPair;
  assert.ok(commonUniverse);
  assert.notEqual(
    commonUniverse.segment1PropertyFingerprint,
    commonUniverse.segment2PropertyFingerprint
  );
  const fullIntersection = scenarioReplay.counterfactuals.find(
    (entry) => entry.mode === "FULL_STAY_AND_BOTH_SEGMENTS_INTERSECTION"
  ).splitResults[0].selectedPair;
  assert.ok(fullIntersection);

  const directHeadline = evaluateSplitR1SearchLevelScenario(
    scenario,
    states.flatMap((state) => state.offers)
  );
  assert.equal(
    stableStringifySplitF0(scenarioReplay.headline),
    stableStringifySplitF0(directHeadline)
  );
  assert.equal(scenarioReplay.headline.fixedBaseline.totalMinorUnits, 50_000);
  assert.equal(scenarioReplay.headline.strictComparisons, 0);
  assert.equal(scenarioReplay.headline.splitResults[0].headlineEligible, false);
  assert.equal(ledger.priceNature, "UNPROVEN_SEARCH_LEVEL_WINDOW_PRICE");
  assert.equal(ledger.economicPolicy.distinctPropertyRequired, true);

  const reordered = structuredClone(ledger);
  reordered.searches.reverse();
  for (const search of reordered.searches) search.properties.reverse();
  assert.equal(
    stableStringifySplitF0(replaySplitR1CausalLedger(reordered)),
    stableStringifySplitF0(ledger.replay)
  );
  assert.equal(
    stableStringifySplitF0(replaySplitR1CausalLedger(ledger)),
    stableStringifySplitF0(ledger.replay)
  );
});

test("causal replay explains missing full baseline while preserving segment-only observations", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const scenario = matrix.scenarios[1];
  const searches = buildSplitF0LogicalSearchPlan(matrix).filter(
    (search) => search.scenarioId === scenario.scenarioId
  );
  const states = searches.map((search) => causalSearchState(search, [
    causalPage(search, search.kind === "full-stay"
      ? [{ id: "raw-full-without-price" }]
      : [rawHotel(`raw-segment-only-${search.logicalSearchId}`, 100)])
  ]));
  const ledger = buildSplitR1CausalLedger(matrix, states);
  const fullSearch = ledger.searches.find(
    (search) => search.scenarioId === scenario.scenarioId && search.searchRole === "FULL_STAY"
  );
  assert.equal(fullSearch.rawResultCount, 1);
  assert.equal(fullSearch.normalizedResultCount, 0);
  assert.equal(fullSearch.rejectionCounts.MISSING_OURPRICE, 1);
  const scenarioReplay = ledger.replay.scenarios.find(
    (entry) => entry.scenarioId === scenario.scenarioId
  );
  assert.equal(scenarioReplay.headline.fixedBaseline, null);
  assert.equal(
    scenarioReplay.headline.splitResults.every(
      (result) => result.reason === "fixed-full-stay-baseline-missing"
    ),
    true
  );
  const unconstrained = scenarioReplay.counterfactuals.find(
    (entry) => entry.mode === "UNCONSTRAINED_BEST_OBSERVED_SPLIT"
  );
  assert.ok(unconstrained.splitResults[0].selectedPair);
  assert.equal(unconstrained.splitResults[0].selectedPair.fixedSingleMinor, null);
  assert.equal(
    unconstrained.splitResults[0].selectedPair.classification,
    "DIAGNOSTIC_WITHOUT_FIXED_BASELINE"
  );
  assert.equal(
    unconstrained.splitResults[0].funnel.NO_FULL_STAY_BASELINE,
    1
  );
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
