import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPLIT_R2_COMPACT_MAX_UTF8_BYTES,
  SPLIT_R2_FROZEN_SCENARIOS,
  SPLIT_R2_LIVE_CAPABILITIES,
  SPLIT_R2_LITEAPI_CANARY_BREAKPOINT,
  SPLIT_R2_LITEAPI_CANARY_COMPACT_MAX_UTF8_BYTES,
  SPLIT_R2_LITEAPI_CANARY_RECEIPT_VERSION,
  SPLIT_R2_LITEAPI_RATES_PATH,
  SPLIT_R2_LITEAPI_SANDBOX_BASE_URL,
  SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS,
  SPLIT_R2_MATERIAL_BASIS_POINTS,
  SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
  SPLIT_R2_RECEIPT_VERSION,
  SPLIT_R2_ROUTE_STACK_SUBSET,
  SplitR2CompactReceiptError,
  adaptLiteApiSearchSnapshotR2,
  adaptRouteStackSearchSnapshotR2,
  aggregateSplitR2Provider,
  assertSplitR2RealTransportBlocked,
  assertSplitR2LiteApiCanaryPreflight,
  assertSplitR2RouteStackOfflinePreflight,
  buildSplitR2CampaignPlan,
  buildSplitR2CompactReceipt,
  buildSplitR2LiteApiCanaryReceipt,
  buildSplitR2ScenarioPlan,
  buildSplitR2LiteApiCanaryPlan,
  classifySplitR2Saving,
  createSplitR2AuthoritativeHttpCounter,
  createSplitR2LiteApiCanaryCounter,
  createSplitR2LiteApiCanaryRequestBody,
  createSplitR2MonotonicLimiter,
  decideSplitR2Campaign,
  evaluateSplitR2Scenario,
  normalizeSplitR2LiteApiCanaryResponse,
  parseSplitR2LiteApiCanaryArguments,
  runSplitR2FakeLiteApiCanary,
  runSplitR2LiteApiCanary,
  runSplitR2FakeCombinedCampaign,
  runSplitR2FakeProviderCampaign,
  runSplitR2Mode,
  serializeSplitR2CompactReceipt,
  serializeSplitR2LiteApiCanaryReceipt,
} from "../../scripts/run-split-r2-multi-scenario-validation.mjs";

const KEY = Buffer.alloc(32, 0x55);
const SCENARIO_14 = SPLIT_R2_FROZEN_SCENARIOS[0];
const SCENARIO_7 = SPLIT_R2_FROZEN_SCENARIOS[1];

function searchFor(scenario = SCENARIO_14, role = "FULL_STAY", breakpoint = null) {
  return buildSplitR2ScenarioPlan(scenario).logicalSearches.find(
    (search) =>
      search.searchRole === role &&
      (breakpoint === null || search.breakpointOrdinal === breakpoint)
  );
}

function liteOffer(overrides = {}) {
  return {
    propertyIdentity: "synthetic-test-property-a",
    occupancy: { rooms: 1, adults: 2, children: 0 },
    offerRetailRate: {
      totalMinorUnits: 10_000,
      currency: "EUR",
      semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED",
    },
    mandatoryComponentsComplete: true,
    mandatoryComponents: [],
    cancellationCategory: "FLEXIBLE",
    ...overrides,
  };
}

function liteAcquisition(offers = [liteOffer()], overrides = {}) {
  return {
    environment: "LITEAPI_SANDBOX",
    productionFallback: false,
    httpValid: true,
    jsonValid: true,
    collectionComplete: true,
    offers,
    ...overrides,
  };
}

function routeAcquisition(offers = [], overrides = {}) {
  return {
    environment: "ROUTESTACK_SANDBOX",
    productionFallback: false,
    httpValid: true,
    jsonValid: true,
    completeContinuationBindingCount: 0,
    offers,
    ...overrides,
  };
}

function aggregate(overrides = {}) {
  return {
    plannedScenarios: 6,
    evaluableScenarios: 6,
    scenariosWithRawPositive: 3,
    scenariosWithMaterialSignal: 2,
    destinationsWithMaterialSignal: 2,
    comparabilityViolations: 0,
    ...overrides,
  };
}

function scenarioSnapshots(scenario, acquisitionFactory) {
  const plan = buildSplitR2ScenarioPlan(scenario);
  return {
    plan,
    snapshots: plan.logicalSearches.map((search) =>
      adaptLiteApiSearchSnapshotR2(search, acquisitionFactory(search), KEY)
    ),
  };
}

const FAKE_COMBINED = runSplitR2FakeCombinedCampaign();
const FAKE_RECEIPT = buildSplitR2CompactReceipt("fake-combined", FAKE_COMBINED);

test("01 frozen matrix contains exactly six scenarios", () => {
  assert.equal(SPLIT_R2_FROZEN_SCENARIOS.length, 6);
});

test("02 frozen scenario order is stable", () => {
  assert.deepEqual(SPLIT_R2_FROZEN_SCENARIOS.map((scenario) => scenario.ordinal), [1, 2, 3, 4, 5, 6]);
});

test("03 frozen dates match the preregistration", () => {
  assert.deepEqual(
    SPLIT_R2_FROZEN_SCENARIOS.map(({ checkin, checkout }) => [checkin, checkout]),
    [
      ["2026-11-30", "2026-12-14"],
      ["2027-03-01", "2027-03-08"],
      ["2026-11-30", "2026-12-07"],
      ["2027-03-01", "2027-03-15"],
      ["2026-11-30", "2026-12-14"],
      ["2027-03-01", "2027-03-08"],
    ]
  );
});

test("04 occupancy and currency are frozen", () => {
  assert.equal(
    SPLIT_R2_FROZEN_SCENARIOS.every(
      (scenario) => scenario.rooms === 1 && scenario.adults === 2 && scenario.children === 0 && scenario.currency === "EUR"
    ),
    true
  );
});

test("05 matrix has three seven-night scenarios", () => {
  assert.equal(SPLIT_R2_FROZEN_SCENARIOS.filter((scenario) => scenario.durationNights === 7).length, 3);
});

test("06 matrix has three fourteen-night scenarios", () => {
  assert.equal(SPLIT_R2_FROZEN_SCENARIOS.filter((scenario) => scenario.durationNights === 14).length, 3);
});

test("07 seven-night plan has six breakpoints and twenty searches", () => {
  const plan = buildSplitR2ScenarioPlan(SCENARIO_7);
  assert.equal(plan.breakpoints, 6);
  assert.equal(plan.logicalSearches.length, 20);
});

test("08 fourteen-night plan has thirteen breakpoints and forty-one searches", () => {
  const plan = buildSplitR2ScenarioPlan(SCENARIO_14);
  assert.equal(plan.breakpoints, 13);
  assert.equal(plan.logicalSearches.length, 41);
});

test("09 LiteAPI plan has 183 logical searches", () => {
  assert.equal(buildSplitR2CampaignPlan("LITEAPI_SANDBOX").logicalSearches.length, 183);
});

test("10 RouteStack subset is exactly scenarios one three and five", () => {
  assert.deepEqual(SPLIT_R2_ROUTE_STACK_SUBSET, [1, 3, 5]);
});

test("11 RouteStack plan has 102 logical searches", () => {
  assert.equal(buildSplitR2CampaignPlan("ROUTESTACK_SANDBOX").logicalSearches.length, 102);
});

test("12 RouteStack fake campaign reserves at most 106 HTTP", () => {
  assert.equal(FAKE_COMBINED.routeStack.http.total, 106);
});

test("13 combined fake campaign reserves exactly 289 HTTP", () => {
  assert.equal(FAKE_COMBINED.combinedHttp.total, 289);
});

test("14 plan cannot accept an unfrozen scenario substitute", () => {
  assert.throws(() => buildSplitR2ScenarioPlan({ ...SCENARIO_14 }), /scenario-not-frozen/);
});

test("15 scenario allocation is not price based", () => {
  assert.equal(FAKE_RECEIPT.boundaries.noCherryPicking, true);
});

test("16 scenario allocation does not maximize result count", () => {
  assert.equal(FAKE_RECEIPT.boundaries.noScenarioReplacement, true);
});

test("17 LiteAPI included mandatory tax is not added twice", () => {
  const offer = liteOffer({
    mandatoryComponents: [{ mandatory: true, known: true, included: true, amountMinorUnits: 1_000, currency: "EUR" }],
  });
  const snapshot = adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY);
  assert.equal(snapshot.offers[0].totalMinorUnits, 10_000);
  assert.equal(snapshot.offers[0].mandatoryTaxState, "KNOWN_INCLUDED");
});

test("18 LiteAPI excluded mandatory tax is added once", () => {
  const offer = liteOffer({
    mandatoryComponents: [{ mandatory: true, known: true, included: false, amountMinorUnits: 1_000, currency: "EUR" }],
  });
  const snapshot = adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY);
  assert.equal(snapshot.offers[0].totalMinorUnits, 11_000);
  assert.equal(snapshot.offers[0].mandatoryTaxState, "KNOWN_EXCLUDED_ADDED_ONCE");
});

test("19 LiteAPI pay-at-property mandatory amount is retained separately", () => {
  const offer = liteOffer({
    mandatoryComponents: [{ mandatory: true, known: true, included: false, payAtProperty: true, amountMinorUnits: 800, currency: "EUR" }],
  });
  const snapshot = adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY);
  assert.equal(snapshot.offers[0].payAtPropertyMandatoryMinorUnits, 800);
  assert.equal(snapshot.offers[0].totalMinorUnits, 10_800);
});

test("20 unknown mandatory component fails closed", () => {
  const offer = liteOffer({
    mandatoryComponents: [{ mandatory: true, known: false }],
  });
  const snapshot = adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY);
  assert.equal(snapshot.comparabilityClassification, "INCOMPARABLE_MANDATORY_COMPONENT_UNKNOWN");
  assert.equal(snapshot.offers.length, 0);
});

test("21 included and excluded components avoid double counting", () => {
  const offer = liteOffer({
    mandatoryComponents: [
      { mandatory: true, known: true, included: true, amountMinorUnits: 500, currency: "EUR" },
      { mandatory: true, known: true, included: false, amountMinorUnits: 700, currency: "EUR" },
    ],
  });
  const snapshot = adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY);
  assert.equal(snapshot.offers[0].totalMinorUnits, 10_700);
  assert.equal(snapshot.offers[0].mandatoryTaxMinorUnits, 1_200);
});

test("22 missing currency is incomparable", () => {
  const offer = liteOffer({ offerRetailRate: { totalMinorUnits: 10_000, semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED" } });
  assert.equal(
    adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY).comparabilityClassification,
    "INCOMPARABLE_CURRENCY"
  );
});

test("23 wrong currency is incomparable", () => {
  const offer = liteOffer({ offerRetailRate: { totalMinorUnits: 10_000, currency: "USD", semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED" } });
  assert.equal(
    adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY).comparabilityClassification,
    "INCOMPARABLE_CURRENCY"
  );
});

test("24 invalid total price is incomparable", () => {
  const offer = liteOffer({ offerRetailRate: { totalMinorUnits: 0, currency: "EUR", semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED" } });
  assert.equal(
    adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY).comparabilityClassification,
    "INCOMPARABLE_PRICE_SEMANTICS"
  );
});

test("25 LiteAPI requires confirmed search-window total semantics", () => {
  const offer = liteOffer({ offerRetailRate: { totalMinorUnits: 10_000, currency: "EUR", semantics: "NIGHTLY" } });
  assert.equal(
    adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([offer]), KEY).comparabilityClassification,
    "INCOMPARABLE_PRICE_SEMANTICS"
  );
});

test("26 provider-neutral snapshot excludes provider payload fields", () => {
  const snapshot = adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition(), KEY);
  for (const key of ["rawHotelId", "providerPayload", "providerResponse", "bookingUrl", "commission", "markup"]) {
    assert.equal(Object.hasOwn(snapshot, key), false);
  }
  assert.equal(snapshot.contractVersion, SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION);
});

test("27 RouteStack snapshot is explicitly bounded", () => {
  const snapshot = adaptRouteStackSearchSnapshotR2(
    searchFor(),
    routeAcquisition([{ propertyIdentity: "synthetic-route-a", ourpriceMinorUnits: 10_000, currency: "EUR" }]),
    KEY
  );
  assert.equal(snapshot.boundedSnapshotUsable, true);
  assert.equal(snapshot.providerDeclaredTerminal, false);
});

test("28 RouteStack continuation is detected but never executed", () => {
  const snapshot = adaptRouteStackSearchSnapshotR2(searchFor(), routeAcquisition([], { completeContinuationBindingCount: 1 }), KEY);
  assert.equal(snapshot.continuationAvailable, true);
  assert.equal(snapshot.continuationEligible, true);
  assert.equal(snapshot.continuationExecuted, false);
});

test("29 RouteStack Sandbox and Production bindings are separate", () => {
  assert.throws(
    () => adaptRouteStackSearchSnapshotR2(searchFor(), routeAcquisition([], { environment: "ROUTESTACK_PUBLIC_PRODUCTION" }), KEY),
    /environment-binding-invalid/
  );
});

test("30 provider fallback is prohibited", () => {
  assert.throws(
    () => adaptLiteApiSearchSnapshotR2(searchFor(), liteAcquisition([], { productionFallback: true }), KEY),
    /environment-binding-invalid/
  );
});

test("31 full-stay baseline is independent from distinct Split pair availability", () => {
  const { plan, snapshots } = scenarioSnapshots(SCENARIO_7, () =>
    liteAcquisition([liteOffer({ propertyIdentity: "synthetic-only-property" })])
  );
  const result = evaluateSplitR2Scenario("LITEAPI_SANDBOX", plan, snapshots);
  assert.equal(result.baselineAvailable, true);
  assert.equal(result.evaluatedBreakpoints, 0);
});

test("32 distinct-property fake pairs are evaluable", () => {
  const result = FAKE_COMBINED.liteApi.scenarioResults[0];
  assert.equal(result.evaluatedBreakpoints, 13);
});

test("33 scenario without baseline remains non-evaluable", () => {
  const { plan, snapshots } = scenarioSnapshots(SCENARIO_7, () => liteAcquisition([]));
  const result = evaluateSplitR2Scenario("LITEAPI_SANDBOX", plan, snapshots);
  assert.equal(result.baselineAvailable, false);
  assert.equal(result.notEvaluableReasonCounts.NO_FULL_STAY_BASELINE, 6);
});

test("34 non-evaluable funnel preserves multiple allowlisted reasons", () => {
  const { plan, snapshots } = scenarioSnapshots(SCENARIO_7, () => liteAcquisition([]));
  const result = evaluateSplitR2Scenario("LITEAPI_SANDBOX", plan, snapshots);
  assert.equal(Object.keys(result.notEvaluableReasonCounts).length >= 4, true);
});

test("35 raw positive below material threshold remains non-material", () => {
  const result = classifySplitR2Saving(9_999, 50_000);
  assert.equal(result.breakpointClass, "RAW_POSITIVE_SPLIT");
  assert.equal(result.materialPriceSignal, false);
});

test("36 one hundred euro below ten percent remains non-material", () => {
  assert.equal(classifySplitR2Saving(10_000, 200_000).materialPriceSignal, false);
});

test("37 ten percent below one hundred euro remains non-material", () => {
  assert.equal(classifySplitR2Saving(9_000, 90_000).materialPriceSignal, false);
});

test("38 both material thresholds produce material signal", () => {
  const result = classifySplitR2Saving(10_000, 100_000);
  assert.equal(result.savingBasisPoints, 1_000);
  assert.equal(result.materialPriceSignal, true);
  assert.equal(result.userUsableSplit, false);
});

test("39 primary provider reproduced rule", () => {
  assert.deepEqual(decideSplitR2Campaign(aggregate(), null), ["PRIMARY_PROVIDER_REPRODUCED"]);
});

test("40 primary provider promising but insufficient rule", () => {
  const decisions = decideSplitR2Campaign(
    aggregate({ evaluableScenarios: 3, scenariosWithMaterialSignal: 1, destinationsWithMaterialSignal: 1 }),
    null
  );
  assert.deepEqual(decisions, ["PRIMARY_PROVIDER_PROMISING_BUT_INSUFFICIENT"]);
});

test("41 primary provider not reproduced rule", () => {
  const decisions = decideSplitR2Campaign(
    aggregate({ scenariosWithMaterialSignal: 0, destinationsWithMaterialSignal: 0 }),
    null
  );
  assert.deepEqual(decisions, ["PRIMARY_PROVIDER_NOT_REPRODUCED"]);
});

test("42 LiteAPI contract blocked rule", () => {
  assert.deepEqual(decideSplitR2Campaign(aggregate({ comparabilityViolations: 1 }), null), ["LITEAPI_CONTRACT_BLOCKED"]);
});

test("43 cross-provider recurrence rule", () => {
  const decisions = decideSplitR2Campaign(aggregate(), {
    evaluableScenarios: 2,
    scenariosWithMaterialSignal: 1,
  });
  assert.equal(decisions.includes("CROSS_PROVIDER_RECURRENCE_SUPPORTED"), true);
});

test("44 RouteStack-only signal rule", () => {
  const decisions = decideSplitR2Campaign(
    aggregate({ evaluableScenarios: 6, scenariosWithMaterialSignal: 0, destinationsWithMaterialSignal: 0 }),
    { evaluableScenarios: 3, scenariosWithMaterialSignal: 1 }
  );
  assert.equal(decisions.includes("ROUTESTACK_ONLY_SIGNAL"), true);
});

test("45 provider aggregate uses median of scenario medians", () => {
  const results = [100, 300, 10_000].map((medianSavingMinorUnits, index) => ({
    scenarioOrdinal: index + 1,
    destination: `D${index}`,
    anchor: index === 0,
    evaluatedBreakpoints: 1,
    scenarioHasRawPositive: true,
    scenarioHasMaterialSignal: false,
    medianSavingMinorUnits,
    technicalClassification: "SCENARIO_NO_MATERIAL_PRICE_SIGNAL",
    collectionComparabilityViolation: false,
  }));
  assert.equal(aggregateSplitR2Provider("LITEAPI_SANDBOX", results).medianOfScenarioMediansMinorUnits, 300);
});

test("46 cross-provider recurrence does not compare property identity", () => {
  assert.equal(FAKE_RECEIPT.boundaries.crossProviderPropertyMatchRequired, false);
});

test("47 compact receipt is deterministic", () => {
  const first = serializeSplitR2CompactReceipt(FAKE_RECEIPT).json;
  const second = serializeSplitR2CompactReceipt(buildSplitR2CompactReceipt("fake-combined", FAKE_COMBINED)).json;
  assert.equal(first, second);
});

test("48 compact receipt JSON is single-line", () => {
  const { json } = serializeSplitR2CompactReceipt(FAKE_RECEIPT);
  assert.equal(json.includes("\n"), false);
  assert.deepEqual(JSON.parse(json), JSON.parse(json));
});

test("49 compact receipt remains below sixteen thousand bytes", () => {
  assert.equal(serializeSplitR2CompactReceipt(FAKE_RECEIPT).byteLength < SPLIT_R2_COMPACT_MAX_UTF8_BYTES, true);
});

test("50 compact receipt oversize fails closed without truncation", () => {
  assert.throws(
    () => serializeSplitR2CompactReceipt({ receiptVersion: SPLIT_R2_RECEIPT_VERSION, padding: "x".repeat(20_000) }),
    SplitR2CompactReceiptError
  );
});

test("51 compact output contains no raw provider IDs", () => {
  const { json } = serializeSplitR2CompactReceipt(FAKE_RECEIPT);
  assert.equal(json.includes("synthetic-r2"), false);
  assert.equal(json.includes("propertyId"), false);
});

test("52 compact output contains no pseudonym list", () => {
  const { json } = serializeSplitR2CompactReceipt(FAKE_RECEIPT);
  assert.equal(json.includes("hmac-sha256:"), false);
  assert.equal(json.includes("propertyFingerprints"), false);
});

test("53 credentials alone cannot enable live mode", () => {
  let credentialReads = 0;
  const result = assertSplitR2RealTransportBlocked({
    credentialsPresent: true,
    credentialReader: () => {
      credentialReads += 1;
    },
  });
  assert.equal(result.blocked, true);
  assert.equal(credentialReads, 0);
});

test("54 real transport is blocked before credentials or sockets", () => {
  let touched = 0;
  assert.throws(
    () => assertSplitR2RealTransportBlocked({ mode: "real", credentialReader: () => { touched += 1; } }),
    /live-hold/
  );
  assert.equal(touched, 0);
});

test("55 public runtime remains unchanged and Split disabled", () => {
  assert.equal(FAKE_RECEIPT.boundaries.publicRuntimeChanged, false);
  assert.equal(FAKE_RECEIPT.boundaries.publicSplitEnabled, false);
});

test("56 R1 evaluator primitives are used by the R2 scenario result", () => {
  const result = FAKE_COMBINED.liteApi.scenarioResults[0];
  assert.equal(result.bestSavingMinorUnits, 15_000);
  assert.equal(result.bestSavingBasisPoints, 1_500);
});

test("57 fake combined campaign accounts 183 plus 106 with zero real HTTP", () => {
  assert.equal(FAKE_COMBINED.liteApi.http.total, 183);
  assert.equal(FAKE_COMBINED.routeStack.http.total, 106);
  assert.equal(FAKE_COMBINED.combinedHttp.total, 289);
  assert.equal(FAKE_RECEIPT.httpCounters.realHttpRequests, 0);
});

test("58 LiteAPI 184th search is blocked pre-transport", () => {
  const counter = createSplitR2AuthoritativeHttpCounter("LITEAPI_SANDBOX");
  for (let index = 0; index < 183; index += 1) counter.reserve("initial");
  assert.throws(() => counter.reserve("initial"), /budget-exceeded/);
});

test("59 RouteStack second auth fourth destination and 103rd initial are blocked", () => {
  const auth = createSplitR2AuthoritativeHttpCounter("ROUTESTACK_SANDBOX");
  auth.reserve("auth");
  assert.throws(() => auth.reserve("auth"), /budget-exceeded/);
  const destination = createSplitR2AuthoritativeHttpCounter("ROUTESTACK_SANDBOX");
  for (let index = 0; index < 3; index += 1) destination.reserve("destination");
  assert.throws(() => destination.reserve("destination"), /budget-exceeded/);
  const initial = createSplitR2AuthoritativeHttpCounter("ROUTESTACK_SANDBOX");
  for (let index = 0; index < 102; index += 1) initial.reserve("initial");
  assert.throws(() => initial.reserve("initial"), /budget-exceeded/);
});

test("60 any RouteStack continuation is blocked", () => {
  assert.throws(
    () => createSplitR2AuthoritativeHttpCounter("ROUTESTACK_SANDBOX").reserve("continuation"),
    /budget-exceeded/
  );
});

test("61 combined 290th request is blocked", () => {
  const counter = createSplitR2AuthoritativeHttpCounter("COMBINED");
  counter.reserve("auth");
  for (let index = 0; index < 3; index += 1) counter.reserve("destination");
  for (let index = 0; index < 285; index += 1) counter.reserve("initial");
  assert.throws(() => counter.reserve("initial"), /budget-exceeded/);
});

test("62 fake transports preserve retry redirect and concurrency invariants", () => {
  assert.equal(FAKE_COMBINED.liteApi.http.retries, 0);
  assert.equal(FAKE_COMBINED.routeStack.http.redirects, 0);
  assert.equal(FAKE_COMBINED.liteApi.http.maxObservedConcurrency, 1);
  assert.equal(FAKE_COMBINED.routeStack.http.maxObservedConcurrency, 1);
});

test("63 ambiguous RouteStack continuation metadata fails closed", () => {
  const snapshot = adaptRouteStackSearchSnapshotR2(searchFor(), routeAcquisition([], { completeContinuationBindingCount: 2 }), KEY);
  assert.equal(snapshot.collectionClassification, "AMBIGUOUS_CONTINUATION_METADATA");
  assert.equal(snapshot.boundedSnapshotUsable, false);
  assert.equal(snapshot.continuationExecuted, false);
});

test("64 missing RouteStack continuation key means no continuation exposed", () => {
  const snapshot = adaptRouteStackSearchSnapshotR2(searchFor(), routeAcquisition(), KEY);
  assert.equal(snapshot.collectionClassification, "PROVIDER_NO_CONTINUATION_EXPOSED");
  assert.equal(snapshot.providerDeclaredTerminal, false);
});

test("65 only the exact LiteAPI canary capability is implemented", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.LITEAPI_SANDBOX_CANARY, "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED");
  assert.equal(
    Object.entries(SPLIT_R2_LIVE_CAPABILITIES)
      .filter(([name]) => name !== "LITEAPI_SANDBOX_CANARY")
      .every(([, value]) => value === "NOT_IMPLEMENTED_OR_LIVE_HOLD"),
    true
  );
});

test("66 dry-run has exact matrix and zero HTTP", () => {
  const receipt = runSplitR2Mode("dry-run");
  assert.equal(receipt.frozenMatrix.length, 6);
  assert.equal(receipt.httpCounters.realHttpRequests, 0);
  assert.equal(receipt.httpCounters.combined.total, 0);
});

test("67 fake LiteAPI mode executes the full offline plan", () => {
  const result = runSplitR2FakeProviderCampaign("LITEAPI_SANDBOX");
  assert.equal(result.scenarioResults.length, 6);
  assert.equal(result.http.initial, 183);
});

test("68 fake RouteStack mode executes only the frozen subset", () => {
  const result = runSplitR2FakeProviderCampaign("ROUTESTACK_SANDBOX");
  assert.deepEqual(result.scenarioResults.map((entry) => entry.scenarioOrdinal), [1, 3, 5]);
  assert.equal(result.http.initial, 102);
});

test("69 fake combined decision supports cross-provider recurrence", () => {
  assert.equal(FAKE_COMBINED.decisions.includes("CROSS_PROVIDER_RECURRENCE_SUPPORTED"), true);
});

test("70 source imports no public runtime adapter or decision core", async () => {
  const source = await fs.readFile(
    path.resolve("scripts/run-split-r2-multi-scenario-validation.mjs"),
    "utf8"
  );
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/gu)].map((match) => match[1]);
  assert.deepEqual(imports.filter((value) => /server|frontend|decisionCore|orchestrator/iu.test(value)), []);
});

test("71 receipt version and material thresholds are frozen", () => {
  assert.equal(FAKE_RECEIPT.receiptVersion, SPLIT_R2_RECEIPT_VERSION);
  assert.equal(SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS, 10_000);
  assert.equal(SPLIT_R2_MATERIAL_BASIS_POINTS, 1_000);
});

test("72 package scripts are not required to expose a live R2 command", async () => {
  const packageJson = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));
  assert.equal(Object.keys(packageJson.scripts).some((name) => /split-r2-live/iu.test(name)), false);
});

test("73 currency diagnostics distinguish missing non-expected and invalid types", () => {
  const search = searchFor();
  const missing = adaptLiteApiSearchSnapshotR2(
    search,
    liteAcquisition([
      liteOffer({ offerRetailRate: { totalMinorUnits: 10_000, semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED" } }),
    ]),
    KEY
  );
  const nonExpected = adaptLiteApiSearchSnapshotR2(
    search,
    liteAcquisition([
      liteOffer({ offerRetailRate: { totalMinorUnits: 10_000, currency: "USD", semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED" } }),
    ]),
    KEY
  );
  const invalid = adaptLiteApiSearchSnapshotR2(
    search,
    liteAcquisition([
      liteOffer({ offerRetailRate: { totalMinorUnits: 10_000, currency: 7, semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED" } }),
    ]),
    KEY
  );
  assert.equal(missing.economicEligibilityFunnel.missingCurrencyCount, 1);
  assert.equal(nonExpected.economicEligibilityFunnel.nonExpectedCurrencyCount, 1);
  assert.equal(invalid.economicEligibilityFunnel.invalidCurrencyTypeCount, 1);
});

function canaryPreflight(overrides = {}) {
  return {
    mode: "LITEAPI_SANDBOX_CONTRACT_CANARY",
    compact: true,
    environment: "LITEAPI_SANDBOX",
    ackHttpBudget: 3,
    hostname: "api.liteapi.travel",
    protocol: "https:",
    productionFallback: false,
    scenarioOrdinal: 1,
    breakpointOrdinal: 7,
    fullStayMax: 1,
    prefixMax: 1,
    suffixMax: 1,
    totalMax: 3,
    otherHttpMax: 0,
    retries: 0,
    redirects: 0,
    concurrency: 1,
    minimumIntervalMs: 1_000,
    repositoryGatePassed: true,
    credentialReader: () => "sand_synthetic_test_key",
    ...overrides,
  };
}

function canaryPayload({
  identities = ["aa", "bb"],
  amount = "100.00",
  currency = "EUR",
  taxesAndFees = [],
  extra = {},
} = {}) {
  return {
    data: identities.map((hotelId) => ({
      hotelId,
      rates: [{ offerRetailRate: { amount, currency }, taxesAndFees }],
    })),
    ...extra,
  };
}

function canaryNormalized(role, payload = canaryPayload()) {
  const search = buildSplitR2LiteApiCanaryPlan().searches.find((entry) => entry.searchRole === role);
  return normalizeSplitR2LiteApiCanaryResponse(search, payload, KEY, 200);
}

test("74 exact canary binding is full midpoint prefix suffix", () => {
  const plan = buildSplitR2LiteApiCanaryPlan();
  assert.equal(plan.breakpointOrdinal, SPLIT_R2_LITEAPI_CANARY_BREAKPOINT);
  assert.deepEqual(plan.searches.map((entry) => [entry.searchRole, entry.checkin, entry.checkout]), [
    ["FULL_STAY", "2026-11-30", "2026-12-14"],
    ["PREFIX", "2026-11-30", "2026-12-07"],
    ["SUFFIX", "2026-12-07", "2026-12-14"],
  ]);
});

test("75 canary is disabled by default before credential read", () => {
  let reads = 0;
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight({ credentialReader: () => { reads += 1; } }), /before-credentials/);
  assert.equal(reads, 0);
});

test("76 credentials alone do not enable canary", () => {
  let reads = 0;
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight({ credentialsPresent: true, credentialReader: () => { reads += 1; } }), /before-credentials/);
  assert.equal(reads, 0);
});

test("77 incomplete compact and budget flags block before credentials", () => {
  let reads = 0;
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ compact: false, credentialReader: () => { reads += 1; } })), /before-credentials/);
  assert.equal(reads, 0);
});

test("78 non Sandbox environment and production fallback are blocked", () => {
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ environment: "LITEAPI_PRODUCTION" })), /before-credentials/);
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ productionFallback: true })), /before-credentials/);
});

test("79 exact LiteAPI hostname and HTTPS are mandatory", () => {
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ hostname: "api.liteapi.travel.example" })), /before-credentials/);
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ protocol: "http:" })), /before-credentials/);
  assert.equal(SPLIT_R2_LITEAPI_SANDBOX_BASE_URL, "https://api.liteapi.travel/v3.0");
});

test("80 scenario and breakpoint drift block before credentials", () => {
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ scenarioOrdinal: 2 })), /before-credentials/);
  assert.throws(() => assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ breakpointOrdinal: 2 })), /before-credentials/);
});

test("81 exact canary preflight reads one valid Sandbox credential", () => {
  let reads = 0;
  const result = assertSplitR2LiteApiCanaryPreflight(canaryPreflight({ credentialReader: () => { reads += 1; return "sand_synthetic_test_key"; } }));
  assert.equal(result.credentialsAccessed, true);
  assert.equal(reads, 1);
});

test("82 role budgets allow exactly three requests and block the fourth", () => {
  const counter = createSplitR2LiteApiCanaryCounter();
  counter.reserve("FULL_STAY");
  counter.reserve("PREFIX");
  counter.reserve("SUFFIX");
  assert.equal(counter.snapshot().total, 3);
  assert.throws(() => counter.reserve("SUFFIX"), /budget-exceeded/);
});

test("83 endpoint roles other than the three rates windows are blocked", () => {
  const counter = createSplitR2LiteApiCanaryCounter();
  for (const role of ["AUTH", "DETAILS", "RECHECK", "PREBOOK", "BOOKING", "PAGINATION", "CONTINUATION"]) {
    assert.throws(() => counter.reserve(role), /role-forbidden/);
  }
  assert.equal(SPLIT_R2_LITEAPI_RATES_PATH, "/hotels/rates");
});

test("84 request body derives only from canonical binding", () => {
  const search = buildSplitR2LiteApiCanaryPlan().searches[0];
  const body = createSplitR2LiteApiCanaryRequestBody(search, "synthetic");
  assert.equal(body.checkin, search.checkin);
  assert.equal(body.checkout, search.checkout);
  assert.equal(body.cityName, "Milano");
  assert.deepEqual(body.occupancies, [{ adults: 2, children: [] }]);
  assert.throws(() => createSplitR2LiteApiCanaryRequestBody({ ...search, checkout: "2026-12-13" }, "synthetic"), /not-canonical/);
});

test("85 monotonic limiter waits through an early wake and never weakens 1000ms", async () => {
  let now = 0;
  const waits = [];
  const limiter = createSplitR2MonotonicLimiter({
    monotonicNow: () => now,
    sleeper: async (milliseconds) => { waits.push(milliseconds); now += waits.length === 1 ? milliseconds - 3 : milliseconds; },
  });
  limiter.markStarted();
  await limiter.ready();
  limiter.markStarted();
  assert.equal(now >= 1_000, true);
  assert.equal(waits.length >= 2, true);
  assert.equal(limiter.snapshot().minimumObservedRequestIntervalMs >= 1_000, true);
});

test("86 included mandatory tax is known and not added twice", () => {
  const result = canaryNormalized("FULL_STAY", canaryPayload({
    taxesAndFees: [{ amount: "10.00", currency: "EUR", included: true }],
  }));
  assert.equal(result.diagnostics.knownIncludedTaxOfferCount, 2);
  assert.equal(result.deduplicatedOffers[0].totalMinorUnits, 10_000);
});

test("87 excluded mandatory tax is added once", () => {
  const result = canaryNormalized("FULL_STAY", canaryPayload({ identities: ["aa"],
    taxesAndFees: [{ amount: "10.00", currency: "EUR", included: false }],
  }));
  assert.equal(result.diagnostics.knownExcludedTaxOfferCount, 1);
  assert.equal(result.deduplicatedOffers[0].totalMinorUnits, 11_000);
});

test("88 known pay at property component is counted and added once", () => {
  const result = canaryNormalized("FULL_STAY", canaryPayload({ identities: ["aa"],
    taxesAndFees: [{ amount: "8.00", currency: "EUR", included: false, payAtProperty: true }],
  }));
  assert.equal(result.diagnostics.knownMandatoryPayAtPropertyOfferCount, 1);
  assert.equal(result.snapshot.offers[0].payAtPropertyMandatoryMinorUnits, 800);
  assert.equal(result.snapshot.offers[0].totalMinorUnits, 10_800);
});

test("89 missing or malformed mandatory components fail closed", () => {
  const missing = canaryNormalized("FULL_STAY", { data: [{ hotelId: "aa", rates: [{ offerRetailRate: { amount: "100.00", currency: "EUR" } }] }] });
  const malformed = canaryNormalized("FULL_STAY", canaryPayload({ identities: ["aa"], taxesAndFees: [{ amount: "10.00", currency: "EUR" }] }));
  assert.equal(missing.diagnostics.unknownMandatoryComponentOfferCount, 1);
  assert.equal(malformed.diagnostics.unknownMandatoryComponentOfferCount, 1);
  assert.equal(missing.deduplicatedOffers.length, 0);
});

test("90 missing wrong and invalid currency fail closed without persisting raw value", () => {
  const missing = canaryNormalized("FULL_STAY", canaryPayload({ identities: ["aa"], currency: null }));
  const wrong = canaryNormalized("FULL_STAY", canaryPayload({ identities: ["aa"], currency: "ZZZ" }));
  const invalid = canaryNormalized("FULL_STAY", canaryPayload({ identities: ["aa"], currency: 7 }));
  assert.equal(missing.diagnostics.missingCurrencyCount, 1);
  assert.equal(wrong.diagnostics.nonExpectedCurrencyCount, 1);
  assert.equal(invalid.diagnostics.invalidCurrencyTypeCount, 1);
  assert.equal(JSON.stringify(wrong).includes("ZZZ"), false);
});

test("91 non offerRetailRate price fallback is prohibited", () => {
  const payload = { data: [{ hotelId: "aa", rates: [{ totalPrice: "100.00", taxesAndFees: [] }] }] };
  const result = canaryNormalized("FULL_STAY", payload);
  assert.equal(result.diagnostics.numericTotalPriceEligibleCount, 0);
  assert.equal(result.deduplicatedOffers.length, 0);
});

test("92 pagination or continuation signal makes collection incomparable", () => {
  const result = canaryNormalized("FULL_STAY", canaryPayload({ extra: { hasMore: true } }));
  assert.equal(result.boundedSnapshotUsable, false);
  assert.equal(result.comparabilityClassification, "INCOMPARABLE_COLLECTION");
});

test("93 fake canary provides baseline and a distinct-property pair", () => {
  const receipt = runSplitR2FakeLiteApiCanary();
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.evaluation.fullStayBaselineAvailable, true);
  assert.equal(receipt.evaluation.distinctPropertyPairAvailable, true);
  assert.equal(receipt.failureClassification, "LITEAPI_CONTRACT_CANARY_COMPARABLE");
});

test("94 an empty segment makes the canary inventory-inconclusive", () => {
  const plan = buildSplitR2LiteApiCanaryPlan();
  const results = plan.searches.map((search) => normalizeSplitR2LiteApiCanaryResponse(
    search,
    search.searchRole === "SUFFIX" ? { data: [] } : canaryPayload(),
    KEY,
    200
  ));
  const receipt = buildSplitR2LiteApiCanaryReceipt({
    sourceSha: "a".repeat(40), results,
    http: { FULL_STAY: 1, PREFIX: 1, SUFFIX: 1, total: 3, maxObservedConcurrency: 1 },
    limiter: { minimumObservedRequestIntervalMs: 1_000 },
  });
  assert.equal(receipt.status, "INCONCLUSIVE");
  assert.equal(receipt.evaluation.distinctPropertyPairAvailable, false);
});

test("95 compact canary receipt is deterministic single-line and versioned", () => {
  const receipt = runSplitR2FakeLiteApiCanary();
  const first = serializeSplitR2LiteApiCanaryReceipt(receipt);
  const second = serializeSplitR2LiteApiCanaryReceipt(runSplitR2FakeLiteApiCanary());
  assert.equal(first.json, second.json);
  assert.equal(first.json.includes("\n"), false);
  assert.equal(JSON.parse(first.json).receiptVersion, SPLIT_R2_LITEAPI_CANARY_RECEIPT_VERSION);
  assert.equal(first.byteLength < SPLIT_R2_LITEAPI_CANARY_COMPACT_MAX_UTF8_BYTES, true);
});

test("96 compact canary oversize fails without truncation", () => {
  assert.throws(
    () => serializeSplitR2LiteApiCanaryReceipt({ receiptVersion: SPLIT_R2_LITEAPI_CANARY_RECEIPT_VERSION, padding: "x".repeat(8_100) }),
    SplitR2CompactReceiptError
  );
});

test("97 compact output excludes raw identifiers tax labels payloads and secrets", () => {
  const json = serializeSplitR2LiteApiCanaryReceipt(runSplitR2FakeLiteApiCanary()).json;
  for (const prohibited of ["fake-hotel", "local taxes", "propertyIdentity", "X-Api-Key", "sand_synthetic", "secret-test-value"]) {
    assert.equal(json.toLowerCase().includes(prohibited.toLowerCase()), false);
  }
});

test("98 fake canary accounts exactly three fake HTTP and zero real HTTP", () => {
  const receipt = runSplitR2FakeLiteApiCanary();
  assert.deepEqual([receipt.http.fullStay, receipt.http.prefix, receipt.http.suffix, receipt.http.total], [1, 1, 1, 3]);
  assert.equal(receipt.http.liteApiProduction, 0);
  assert.equal(receipt.http.routeStackSandbox, 0);
});

test("99 RouteStack Sandbox and public transports remain distinct held capabilities", () => {
  const result = assertSplitR2RouteStackOfflinePreflight();
  assert.equal(result.sandboxRealTransportStatus, "LIVE_HOLD");
  assert.equal(result.publicProductionTransportStatus, "LIVE_HOLD");
  assert.equal(result.environmentsSeparated, true);
  assert.equal(result.hostnamesInterchangeable, false);
  assert.equal(result.productionFallback, false);
  assert.equal(result.publicRuntimeChanged, false);
});

test("100 canary CLI accepts only the exact six-argument contract", () => {
  const args = [
    "--r2-liteapi-sandbox-contract-canary", "--compact", "--environment=LITEAPI_SANDBOX",
    "--ack-http-budget=3", `--expected-head=${"a".repeat(40)}`,
    `--expected-dirty-fingerprint=${"b".repeat(64)}`,
  ];
  assert.equal(parseSplitR2LiteApiCanaryArguments(args).expectedHead, "a".repeat(40));
  assert.throws(() => parseSplitR2LiteApiCanaryArguments(args.slice(0, 5)), /cli-contract-invalid/);
});

test("101 fake native canary transport performs three sequential POST rates calls", async () => {
  let now = 0;
  const calls = [];
  const receipt = await runSplitR2LiteApiCanary({
    sourceSha: "a".repeat(40),
    apiKey: "sand_synthetic_test_key",
    monotonicNow: () => now,
    sleeper: async (milliseconds) => { now += milliseconds; },
    fetchImplementation: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        status: 200,
        redirected: false,
        url: String(url),
        headers: { get: () => "application/json" },
        text: async () => JSON.stringify(canaryPayload()),
      };
    },
  });
  assert.equal(receipt.status, "PASS");
  assert.equal(calls.length, 3);
  assert.equal(calls.every((entry) => entry.url === "https://api.liteapi.travel/v3.0/hotels/rates"), true);
  assert.equal(calls.every((entry) => entry.options.method === "POST" && entry.options.redirect === "error"), true);
  assert.equal(receipt.http.minimumObservedRequestIntervalMs >= 1_000, true);
  assert.equal(receipt.http.maxObservedConcurrency, 1);
});
