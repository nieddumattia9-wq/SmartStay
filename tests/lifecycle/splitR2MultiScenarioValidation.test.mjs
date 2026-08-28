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
  SPLIT_R2_LITEAPI_RESPONSE_SHAPE_RECEIPT_VERSION,
  SPLIT_R2_LITEAPI_STATIC_HOTELS_PATH,
  SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_MAX_UTF8_BYTES,
  SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_RECEIPT_VERSION,
  SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_MAX_UTF8_BYTES,
  SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RECEIPT_VERSION,
  SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_MAX_UTF8_BYTES,
  SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RECEIPT_VERSION,
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
  assertSplitR2LiteApiZeroResultDiagnosisPreflight,
  assertSplitR2RouteStackOfflinePreflight,
  assertSplitR2RouteStackPublicCanaryPreflight,
  assertSplitR2RouteStackPublicMultiScenarioPlan,
  assertSplitR2RouteStackPublicMultiScenarioPreflight,
  buildSplitR2CampaignPlan,
  buildSplitR2CompactReceipt,
  buildSplitR2LiteApiCanaryReceipt,
  buildSplitR2ScenarioPlan,
  buildSplitR2LiteApiCanaryPlan,
  buildSplitR2LiteApiZeroResultDiagnosisPlan,
  buildSplitR2RouteStackPublicCanaryBinding,
  buildSplitR2RouteStackPublicMultiScenarioPlan,
  buildSplitR2RouteStackPublicMultiScenarioReceipt,
  classifySplitR2RouteStackPublicReproducibility,
  classifySplitR2Saving,
  createSplitR2AuthoritativeHttpCounter,
  createSplitR2LiteApiCanaryCounter,
  createSplitR2LiteApiCanaryRequestBody,
  createSplitR2LiteApiDiagnosisCounter,
  createSplitR2LiteApiDiagnosisRatesBody,
  createSplitR2MonotonicLimiter,
  createSplitR2RouteStackPublicCanaryCounter,
  createSplitR2RouteStackPublicMultiScenarioCounter,
  decideSplitR2Campaign,
  evaluateSplitR2Scenario,
  normalizeSplitR2LiteApiCanaryResponse,
  diagnoseSplitR2LiteApiResponseShape,
  parseSplitR2LiteApiCanaryArguments,
  parseSplitR2LiteApiZeroResultDiagnosisArguments,
  parseSplitR2RouteStackPublicCanaryArguments,
  parseSplitR2RouteStackPublicMultiScenarioArguments,
  runSplitR2FakeLiteApiCanary,
  runSplitR2FakeLiteApiZeroResultDiagnosis,
  runSplitR2FakeRouteStackPublicCanary,
  runSplitR2FakeRouteStackPublicMultiScenario,
  runSplitR2LiteApiCanary,
  runSplitR2LiteApiZeroResultDiagnosis,
  runSplitR2RouteStackPublicCanary,
  runSplitR2FakeCombinedCampaign,
  runSplitR2FakeProviderCampaign,
  runSplitR2Mode,
  serializeSplitR2CompactReceipt,
  serializeSplitR2LiteApiCanaryReceipt,
  serializeSplitR2LiteApiZeroResultDiagnosisReceipt,
  serializeSplitR2RouteStackPublicCanaryReceipt,
  serializeSplitR2RouteStackPublicMultiScenarioReceipt,
  classifySplitR2LiteApiZeroResultCause,
  inspectSplitR2RouteStackPublicContractEvidence,
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

test("65 exact live capability registry includes the dedicated public multi-scenario mode", () => {
  assert.deepEqual(SPLIT_R2_LIVE_CAPABILITIES, {
    LITEAPI_SANDBOX_CANARY: "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
    LITEAPI_SANDBOX_ZERO_RESULT_DIAGNOSIS: "EXACT_MAX_41_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
    LITEAPI_SANDBOX_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
    ROUTESTACK_SANDBOX_CANARY: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
    ROUTESTACK_SANDBOX_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
    ROUTESTACK_PUBLIC_PRODUCTION_CANARY: "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
    ROUTESTACK_PUBLIC_PRODUCTION_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
    ROUTESTACK_PUBLIC_MULTI_SCENARIO: "EXACT_106_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
  });
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

function diagnosisPreflight(overrides = {}) {
  return {
    mode: "LITEAPI_SANDBOX_ZERO_RESULT_DIAGNOSIS",
    compact: true,
    environment: "LITEAPI_SANDBOX",
    acknowledgement: "I_ACKNOWLEDGE_LITEAPI_SANDBOX_MAX_41_DIAGNOSTIC_HTTP",
    hostname: "api.liteapi.travel",
    protocol: "https:",
    productionFallback: false,
    staticDiscoveryMax: 3,
    cityRatesMax: 18,
    hotelIdRatesMax: 18,
    anchorSuffixMax: 2,
    totalMax: 41,
    retries: 0,
    redirects: 0,
    concurrency: 1,
    minimumIntervalMs: 1_000,
    repositoryGatePassed: true,
    credentialReader: () => "sand_synthetic_diagnosis",
    ...overrides,
  };
}

function diagnosticProbe(overrides = {}) {
  return {
    probeOrdinal: 1,
    probeType: "CITY_RATES",
    cityOrdinal: 1,
    cityCode: "MILANO",
    cityName: "Milano",
    countryCode: "IT",
    windowCategory: "NEAR_TERM",
    durationCategory: "SEVEN_NIGHTS",
    durationNights: 7,
    checkin: "2026-09-28",
    checkout: "2026-10-05",
    locationMode: "CITY_COUNTRY",
    ...overrides,
  };
}

test("102 diagnosis live mode is default-disabled and credentials alone do not enable it", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.LITEAPI_SANDBOX_ZERO_RESULT_DIAGNOSIS,
    "EXACT_MAX_41_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED");
  let reads = 0;
  assert.throws(() => assertSplitR2LiteApiZeroResultDiagnosisPreflight(diagnosisPreflight({
    mode: "dry-run", credentialReader: () => { reads += 1; return "sand_forbidden"; },
  })), /before-credentials/);
  assert.equal(reads, 0);
});

test("103 exact diagnosis preflight accepts only 41/3/18/18/2 and Sandbox", () => {
  const result = assertSplitR2LiteApiZeroResultDiagnosisPreflight(diagnosisPreflight());
  assert.equal(result.plan.maximumHttpRequests, 41);
  for (const overrides of [{ totalMax: 42 }, { staticDiscoveryMax: 4 }, { hostname: "api.liteapi.travel.example" },
    { environment: "LITEAPI_PRODUCTION" }, { retries: 1 }, { redirects: 1 }, { concurrency: 2 },
    { minimumIntervalMs: 999 }]) {
    assert.throws(() => assertSplitR2LiteApiZeroResultDiagnosisPreflight(diagnosisPreflight(overrides)), /before-credentials/);
  }
});

test("104 diagnosis plan freezes three static, eighteen city, eighteen identity and two anchor probes", () => {
  const plan = buildSplitR2LiteApiZeroResultDiagnosisPlan();
  assert.equal(SPLIT_R2_LITEAPI_STATIC_HOTELS_PATH, "/data/hotels");
  assert.equal(plan.staticDiscoveries.length, 3);
  assert.equal(plan.rateProbes.length, 38);
  assert.equal(plan.rateProbes.filter((probe) => probe.probeType === "CITY_RATES").length, 18);
  assert.equal(plan.rateProbes.filter((probe) => probe.probeType === "HOTEL_ID_RATES").length, 18);
  assert.equal(plan.rateProbes.filter((probe) => probe.probeType === "ANCHOR_SUFFIX").length, 2);
});

test("105 diagnosis dates, cities, durations and anchor suffix are exact", () => {
  const plan = buildSplitR2LiteApiZeroResultDiagnosisPlan();
  assert.deepEqual(plan.cities.map((city) => city.code), ["MILANO", "FIRENZE", "ROMA"]);
  assert.deepEqual(plan.windows.map((window) => window.category), ["NEAR_TERM", "PLUS_90", "PLUS_180"]);
  assert.equal(plan.rateProbes.every((probe) => [7, 14].includes(probe.durationNights)), true);
  const anchors = plan.rateProbes.filter((probe) => probe.probeType === "ANCHOR_SUFFIX");
  assert.equal(anchors.every((probe) => probe.checkin === "2026-12-07" && probe.checkout === "2026-12-14"), true);
});

test("106 city and provider-identity request bindings are mutually exclusive and contract-equivalent", () => {
  const city = createSplitR2LiteApiDiagnosisRatesBody(diagnosticProbe(), [], "fixed");
  const ids = createSplitR2LiteApiDiagnosisRatesBody(diagnosticProbe({ locationMode: "HOTEL_IDS_IN_MEMORY" }), ["aa"], "fixed");
  for (const body of [city, ids]) {
    assert.deepEqual(body.occupancies, [{ adults: 2, children: [] }]);
    assert.equal(body.guestNationality, "IT");
    assert.equal(body.currency, "EUR");
    assert.equal(body.limit, 80);
    assert.equal(body.timeout, 12);
    assert.equal(body.maxRatesPerHotel, 3);
    assert.equal(body.includeHotelData, true);
  }
  assert.equal("hotelIds" in city, false);
  assert.equal("cityName" in ids || "countryCode" in ids, false);
  assert.deepEqual(ids.hotelIds, ["aa"]);
});

test("107 diagnosis authoritative counter blocks the forty-second request pre-transport", () => {
  const counter = createSplitR2LiteApiDiagnosisCounter();
  for (let index = 0; index < 3; index += 1) counter.reserve("STATIC_DISCOVERY");
  for (let index = 0; index < 18; index += 1) counter.reserve("CITY_RATES");
  for (let index = 0; index < 18; index += 1) counter.reserve("HOTEL_ID_RATES");
  for (let index = 0; index < 2; index += 1) counter.reserve("ANCHOR_SUFFIX");
  assert.equal(counter.snapshot().total, 41);
  assert.throws(() => counter.reserve("ANCHOR_SUFFIX"), /budget-exhausted-before-transport/);
  assert.throws(() => counter.reserve("OTHER"), /role-forbidden/);
});

test("108 response-shape receipt inspects only allowlisted paths without recursive enumeration", () => {
  const receipt = diagnoseSplitR2LiteApiResponseShape({ data: [{ hotelId: "not-persisted" }], unknown: { deep: [] } }, "RATES");
  assert.equal(receipt.receiptVersion, SPLIT_R2_LITEAPI_RESPONSE_SHAPE_RECEIPT_VERSION);
  assert.equal(receipt.responseContainerClassification, "UNIQUE");
  assert.equal(receipt.selectedResultContainerPath, "data");
  assert.equal(receipt.unknownKeyEnumeration, false);
  assert.equal(receipt.paths.some((entry) => entry.path.includes("unknown")), false);
  assert.equal(JSON.stringify(receipt).includes("not-persisted"), false);
});

test("109 multiple allowlisted result containers are ambiguous and fail closed", () => {
  const receipt = diagnoseSplitR2LiteApiResponseShape({ data: [{}], results: [{}] }, "RATES");
  assert.equal(receipt.responseContainerClassification, "AMBIGUOUS");
  assert.equal(receipt.normalizationAllowed, false);
  assert.equal(receipt.selectedResultContainerPath, "AMBIGUOUS");
});

function causalProbe(overrides = {}) {
  return {
    probeType: "CITY_RATES", cityOrdinal: 1, windowCategory: "NEAR_TERM",
    durationCategory: "SEVEN_NIGHTS", locationMode: "CITY_COUNTRY", rawResultCount: 0,
    finalDistinctComparableOfferCount: 0, responseExtractionMismatch: false, ...overrides,
  };
}

test("110 causal classifier distinguishes extractor and both location-binding mismatches", () => {
  const statics = [{ validProviderIdentityPresent: true }, { validProviderIdentityPresent: true }, { validProviderIdentityPresent: true }];
  const extractor = classifySplitR2LiteApiZeroResultCause(statics, [causalProbe({ responseExtractionMismatch: true })]);
  assert.equal(extractor.demonstratedFactors.includes("R2_RESPONSE_EXTRACTION_MISMATCH"), true);
  const cityEmpty = classifySplitR2LiteApiZeroResultCause(statics, [
    causalProbe(), causalProbe({ locationMode: "HOTEL_IDS_IN_MEMORY", rawResultCount: 1 }),
  ]);
  assert.equal(cityEmpty.demonstratedFactors.includes("CITY_LOCATION_BINDING_EMPTY"), true);
  const idsEmpty = classifySplitR2LiteApiZeroResultCause(statics, [
    causalProbe({ rawResultCount: 1 }), causalProbe({ locationMode: "HOTEL_IDS_IN_MEMORY" }),
  ]);
  assert.equal(idsEmpty.demonstratedFactors.includes("HOTEL_ID_BINDING_EMPTY"), true);
});

test("111 causal classifier distinguishes date horizon, long stays and city availability", () => {
  const statics = [{ validProviderIdentityPresent: true }, { validProviderIdentityPresent: true }, { validProviderIdentityPresent: true }];
  const probes = [
    causalProbe({ rawResultCount: 1 }),
    causalProbe({ durationCategory: "FOURTEEN_NIGHTS" }),
    causalProbe({ windowCategory: "PLUS_90" }),
    causalProbe({ windowCategory: "PLUS_90", durationCategory: "FOURTEEN_NIGHTS" }),
    causalProbe({ windowCategory: "PLUS_180" }),
    causalProbe({ windowCategory: "PLUS_180", durationCategory: "FOURTEEN_NIGHTS" }),
    causalProbe({ cityOrdinal: 2 }), causalProbe({ cityOrdinal: 3 }),
  ];
  const result = classifySplitR2LiteApiZeroResultCause(statics, probes);
  assert.equal(result.rootCauseClassification, "MULTIPLE_CAUSAL_FACTORS");
  for (const factor of ["FUTURE_DATE_INVENTORY_HORIZON", "LONG_STAY_AVAILABILITY_LIMIT", "CITY_SPECIFIC_AVAILABILITY"]) {
    assert.equal(result.demonstratedFactors.includes(factor), true);
  }
});

test("112 causal classifier distinguishes broadly empty, key/content empty and mandatory-component block", () => {
  const emptyProbe = causalProbe();
  assert.equal(classifySplitR2LiteApiZeroResultCause([
    { validProviderIdentityPresent: true }, { validProviderIdentityPresent: true }, { validProviderIdentityPresent: true },
  ], [emptyProbe]).rootCauseClassification, "SANDBOX_RATE_INVENTORY_BROADLY_EMPTY");
  assert.equal(classifySplitR2LiteApiZeroResultCause([
    { validProviderIdentityPresent: false }, { validProviderIdentityPresent: false }, { validProviderIdentityPresent: false },
  ], [emptyProbe]).rootCauseClassification, "SANDBOX_KEY_OR_CONTENT_SCOPE_EMPTY");
  assert.equal(classifySplitR2LiteApiZeroResultCause([{ validProviderIdentityPresent: true }], [
    causalProbe({ rawResultCount: 3, finalDistinctComparableOfferCount: 0 }),
  ]).demonstratedFactors.includes("LITEAPI_CONTRACT_BLOCKED"), true);
});

test("113 fake diagnosis performs exact 3/18/18/2/41 with no Production or RouteStack", async () => {
  const receipt = await runSplitR2FakeLiteApiZeroResultDiagnosis();
  assert.equal(receipt.status, "PASS");
  assert.deepEqual([receipt.http.staticDiscovery, receipt.http.cityRates, receipt.http.hotelIdRates,
    receipt.http.anchorSuffix, receipt.http.total], [3, 18, 18, 2, 41]);
  assert.equal(receipt.http.liteApiProduction, 0);
  assert.equal(receipt.http.routeStack, 0);
  assert.equal(receipt.http.maxObservedConcurrency, 1);
  assert.equal(receipt.http.minimumObservedRequestIntervalMs >= 1_000, true);
});

test("114 empty static discovery safely skips identity-bound probes and leaves budget unused", async () => {
  let now = 0;
  const calls = [];
  const response = (payload, url) => ({ status: 200, redirected: false, url,
    headers: { get: () => "application/json" }, text: async () => JSON.stringify(payload) });
  const receipt = await runSplitR2LiteApiZeroResultDiagnosis({
    sourceSha: "a".repeat(40), apiKey: "sand_synthetic_diagnosis",
    monotonicNow: () => now, sleeper: async (delay) => { now += delay; },
    fetchImplementation: async (url, options) => {
      calls.push({ url: String(url), method: options.method });
      return response({ data: [] }, String(url));
    },
  });
  assert.equal(receipt.http.staticDiscovery, 3);
  assert.equal(receipt.http.cityRates, 18);
  assert.equal(receipt.http.hotelIdRates, 0);
  assert.equal(receipt.http.anchorSuffix, 1);
  assert.equal(receipt.http.total, 22);
  assert.equal(calls.length, 22);
  assert.equal(receipt.causal.rootCauseClassification, "SANDBOX_KEY_OR_CONTENT_SCOPE_EMPTY");
});

test("115 compact diagnosis receipt is deterministic, single-line, safe and below 16000 bytes", async () => {
  const receipt = await runSplitR2FakeLiteApiZeroResultDiagnosis();
  const first = serializeSplitR2LiteApiZeroResultDiagnosisReceipt(receipt);
  const second = serializeSplitR2LiteApiZeroResultDiagnosisReceipt(receipt);
  assert.equal(first.json, second.json);
  assert.equal(first.json.includes("\n"), false);
  assert.equal(first.byteLength < SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_MAX_UTF8_BYTES, true);
  const parsed = JSON.parse(first.json);
  assert.equal(parsed.receiptVersion, SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_RECEIPT_VERSION);
  for (const prohibited of ["synthetic-static", "synthetic-city", "not-persisted", "X-Api-Key", "sand_synthetic", "taxesAndFees", "offerRetailRate"]) {
    assert.equal(first.json.includes(prohibited), false);
  }
  assert.equal(parsed.privacy.rawIdsInOutput, 0);
});

test("116 diagnosis compact receipt oversize fails without truncation", () => {
  assert.throws(() => serializeSplitR2LiteApiZeroResultDiagnosisReceipt({
    status: "BLOCKED", receiptVersion: SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_RECEIPT_VERSION,
    padding: "x".repeat(16_100),
  }), SplitR2CompactReceiptError);
});

test("117 diagnosis CLI accepts only the exact six-argument acknowledgement", () => {
  const args = [
    "--r2-liteapi-sandbox-zero-result-diagnosis", "--compact", "--environment=LITEAPI_SANDBOX",
    "--acknowledgement=I_ACKNOWLEDGE_LITEAPI_SANDBOX_MAX_41_DIAGNOSTIC_HTTP",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`,
  ];
  assert.equal(parseSplitR2LiteApiZeroResultDiagnosisArguments(args).expectedHead, "a".repeat(40));
  assert.throws(() => parseSplitR2LiteApiZeroResultDiagnosisArguments(args.slice(0, 5)), /cli-contract-invalid/);
});

function publicCanaryPreflight(overrides = {}) {
  return {
    mode: "ROUTESTACK_PUBLIC_CONTRACT_CANARY",
    phase: "SPLIT-R2.4",
    compact: true,
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    hostname: "mcp.routestack.ai",
    protocol: "https:",
    acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_3_HTTP",
    noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    authMax: 1,
    destinationMax: 1,
    initialSearchMax: 1,
    continuationMax: 0,
    totalMax: 3,
    retries: 0,
    redirects: 0,
    concurrency: 1,
    minimumIntervalMs: 1_000,
    productionFallback: false,
    sandboxFallback: false,
    repositoryGatePassed: true,
    credentialReader: () => ({
      baseUrl: "https://mcp.routestack.ai",
      apiKey: "synthetic-public-key",
      apiSecret: "synthetic-public-secret",
    }),
    ...overrides,
  };
}

async function runPublicCanaryWithSearchPayload(searchPayload) {
  let now = 0;
  let ordinal = 0;
  const calls = [];
  const responses = [
    { token: "synthetic-bearer-memory-only" },
    { result: [{ id: "synthetic-destination-memory-only", city: "Milano", country: "IT",
      type: "City", fullName: "Milano, Italy", coordinates: { lat: 45.4642, long: 9.19 } }] },
    searchPayload,
  ];
  const receipt = await runSplitR2RouteStackPublicCanary({
    sourceSha: "a".repeat(40),
    apiKey: "synthetic-public-key",
    apiSecret: "synthetic-public-secret",
    monotonicNow: () => now,
    sleeper: async (delay) => { now += delay; },
    now: () => 1_800_000_000_000,
    randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      calls.push({ url: String(url), options });
      const payload = responses[ordinal];
      ordinal += 1;
      return { status: 200, redirected: false, url: String(url),
        headers: { get: () => "application/json" }, text: async () => JSON.stringify(payload) };
    },
  });
  return { receipt, calls };
}

test("118 public RouteStack canary is explicit, default-disabled and credentials alone do not enable it", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_PRODUCTION_CANARY,
    "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED");
  let reads = 0;
  assert.throws(() => assertSplitR2RouteStackPublicCanaryPreflight(publicCanaryPreflight({
    mode: "dry-run", credentialReader: () => { reads += 1; return {}; },
  })), /before-credentials/);
  assert.equal(reads, 0);
});

test("119 public contract evidence binds exact Production host and three read-only POST endpoints", () => {
  const evidence = inspectSplitR2RouteStackPublicContractEvidence();
  assert.equal(evidence.environmentClassification, "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED");
  assert.equal(evidence.hostnameCategory, "ROUTESTACK_PUBLIC_PRODUCTION_HOST");
  assert.equal(evidence.contractDeterminable, true);
  assert.equal(evidence.mutativeEndpointsSelected, false);
  assert.deepEqual(Object.values(evidence.methods), ["POST", "POST", "POST"]);
});

test("120 Sandbox, confusable hosts and ambiguous contracts fail before credentials", () => {
  for (const evidence of [
    inspectSplitR2RouteStackPublicContractEvidence({ baseUrl: "https://evolvemcp.routestack.ai" }),
    inspectSplitR2RouteStackPublicContractEvidence({ baseUrl: "https://mcp.routestack.ai.example" }),
    inspectSplitR2RouteStackPublicContractEvidence({ searchEndpoint: "/mcp/hotel/search-hotels/continue" }),
  ]) {
    let reads = 0;
    assert.throws(() => assertSplitR2RouteStackPublicCanaryPreflight(publicCanaryPreflight({
      contractEvidence: evidence, credentialReader: () => { reads += 1; return {}; },
    })), /before-credentials/);
    assert.equal(reads, 0);
  }
});

test("121 exact public preflight accepts only 3/1/1/1/0 and no mutation acknowledgement", () => {
  const result = assertSplitR2RouteStackPublicCanaryPreflight(publicCanaryPreflight());
  assert.equal(result.credentialsAccessed, true);
  for (const overrides of [{ totalMax: 4 }, { initialSearchMax: 2 }, { continuationMax: 1 },
    { retries: 1 }, { redirects: 1 }, { concurrency: 2 }, { minimumIntervalMs: 999 },
    { sandboxFallback: true }, { noMutationAcknowledgement: "MISSING" }]) {
    assert.throws(() => assertSplitR2RouteStackPublicCanaryPreflight(publicCanaryPreflight(overrides)),
      /before-credentials/);
  }
});

test("122 public canary binding freezes Milano full-stay scenario and exact occupancy", () => {
  const { scenario, logicalSearch } = buildSplitR2RouteStackPublicCanaryBinding();
  assert.deepEqual([scenario.destination.label, scenario.destination.countryCode], ["Milano", "IT"]);
  assert.deepEqual([logicalSearch.request.checkIn, logicalSearch.request.checkOut],
    ["2026-11-30", "2026-12-14"]);
  assert.deepEqual(logicalSearch.request.occupancy, { rooms: 1, adults: 2, childAges: [] });
  assert.equal(logicalSearch.request.currency, "EUR");
});

test("123 authoritative public counter blocks second initial, fourth total, continuation and forbidden routes", () => {
  const counter = createSplitR2RouteStackPublicCanaryCounter();
  counter.reserve("AUTHENTICATION");
  counter.reserve("DESTINATION");
  counter.reserve("INITIAL_SEARCH");
  assert.equal(counter.snapshot().total, 3);
  assert.throws(() => counter.reserve("INITIAL_SEARCH"), /budget-exceeded-before-transport/);
  assert.throws(() => counter.reserve("AUTHENTICATION"), /budget-exceeded-before-transport/);
  assert.throws(() => counter.reserve("CONTINUATION"), /route-forbidden/);
  assert.throws(() => counter.reserve("BOOKING"), /route-forbidden/);
});

test("124 fake public canary performs exact auth destination initial sequence with zero continuation", async () => {
  const receipt = await runSplitR2FakeRouteStackPublicCanary();
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.totalHttpRequests, 3);
  assert.equal(receipt.maxObservedConcurrency, 1);
  assert.equal(receipt.minObservedRequestIntervalMs >= 1_000, true);
  assert.equal(receipt.continuationExecuted, false);
  assert.equal(receipt.publicContractCanaryConclusion,
    "ROUTESTACK_PUBLIC_READ_ONLY_SEARCH_CONTRACT_VERIFIED");
});

test("125 complete continuation metadata remains observed-only and cannot create a fourth call", async () => {
  const { receipt, calls } = await runPublicCanaryWithSearchPayload({ result: { currency: "EUR",
    correlationId: "synthetic-correlation-memory-only", token: "synthetic-search-memory-only",
    nextResultsKey: "synthetic-next-memory-only",
    result: [{ id: "synthetic-property-memory-only", ourprice: 123.45 }] } });
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.continuationMetadataCategory, "COMPLETE_BINDING_PRESENT_NOT_EXECUTED");
  assert.equal(receipt.continuationExecuted, false);
  assert.equal(calls.length, 3);
});

test("126 zero results are contract-reached INCONCLUSIVE without a second wave", async () => {
  const { receipt, calls } = await runPublicCanaryWithSearchPayload({ result: { currency: "EUR", result: [] } });
  assert.equal(receipt.status, "INCONCLUSIVE");
  assert.equal(receipt.rawResultCount, 0);
  assert.equal(receipt.usableBoundedSnapshot, false);
  assert.equal(calls.length, 3);
});

test("127 nonnumeric price and currency mismatch remain visible and INCONCLUSIVE", async () => {
  const nonnumeric = await runPublicCanaryWithSearchPayload({ result: { currency: "EUR",
    result: [{ id: "synthetic-property-memory-only", ourprice: "not-a-number" }] } });
  assert.equal(nonnumeric.receipt.status, "INCONCLUSIVE");
  assert.equal(nonnumeric.receipt.numericPriceCoverageNumerator, 0);
  const mismatch = await runPublicCanaryWithSearchPayload({ result: { currency: "USD",
    result: [{ id: "synthetic-property-memory-only", ourprice: 100 }] } });
  assert.equal(mismatch.receipt.status, "INCONCLUSIVE");
  assert.equal(mismatch.receipt.nonExpectedCurrencyCount, 1);
  assert.equal(mismatch.receipt.expectedCurrencyMatchCount, 0);
});

test("128 compact public receipt is deterministic, single-line, sanitized and below 8000 bytes", async () => {
  const receipt = await runSplitR2FakeRouteStackPublicCanary();
  const first = serializeSplitR2RouteStackPublicCanaryReceipt(receipt);
  const second = serializeSplitR2RouteStackPublicCanaryReceipt(receipt);
  assert.equal(first.json, second.json);
  assert.equal(first.json.includes("\n"), false);
  assert.equal(first.byteLength < SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_MAX_UTF8_BYTES, true);
  assert.equal(JSON.parse(first.json).receiptVersion, SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RECEIPT_VERSION);
  for (const prohibited of ["synthetic-destination", "synthetic-property", "synthetic-correlation",
    "synthetic-search-token", "synthetic-next", "synthetic-public-secret", "Authorization"] ) {
    assert.equal(first.json.includes(prohibited), false);
  }
});

test("129 compact public receipt oversize fails without truncation", () => {
  assert.throws(() => serializeSplitR2RouteStackPublicCanaryReceipt({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RECEIPT_VERSION,
    status: "BLOCKED",
    padding: "x".repeat(8_100),
  }), SplitR2CompactReceiptError);
});

test("130 public canary CLI requires phase, compact and both exact acknowledgements", () => {
  const args = [
    "--r2-routestack-public-contract-canary", "--compact", "--phase=SPLIT-R2.4",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_3_HTTP",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`,
  ];
  assert.equal(parseSplitR2RouteStackPublicCanaryArguments(args).expectedHead, "a".repeat(40));
  assert.throws(() => parseSplitR2RouteStackPublicCanaryArguments(args.slice(0, 7)), /cli-contract-invalid/);
});

test("131 public canary preserves R1, R2 matrix and public runtime boundaries", async () => {
  const receipt = await runSplitR2FakeRouteStackPublicCanary();
  assert.equal(SPLIT_R2_FROZEN_SCENARIOS.length, 6);
  assert.equal(buildSplitR2CampaignPlan("LITEAPI_SANDBOX").logicalSearches.length, 183);
  assert.equal(receipt.publicRuntimeChanged, false);
  assert.equal(receipt.productionBookingAuthorized, false);
  assert.equal(receipt.completenessClaimAllowed, false);
  assert.equal(receipt.globalOptimumClaimAllowed, false);
});

test("132 dry-run remains six scenarios, 285 searches and zero HTTP", () => {
  const receipt = runSplitR2Mode("dry-run");
  assert.equal(receipt.frozenMatrix.length, 6);
  assert.equal(receipt.frozenMatrix.reduce((total, entry) => total + entry.logicalSearches, 0), 183);
  assert.equal(receipt.frozenMatrix.filter((entry) => entry.routeStackAssigned)
    .reduce((total, entry) => total + entry.logicalSearches, 0), 102);
  assert.equal(receipt.httpCounters.realHttpRequests, 0);
});

function publicMultiScenarioPreflight(overrides = {}) {
  return {
    mode: "ROUTESTACK_PUBLIC_MULTI_SCENARIO",
    phase: "SPLIT-R2.5A",
    compact: true,
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    hostname: "mcp.routestack.ai",
    protocol: "https:",
    acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_106_HTTP",
    unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    authMax: 1,
    destinationMax: 3,
    initialSearchMax: 102,
    continuationMax: 0,
    totalMax: 106,
    retries: 0,
    redirects: 0,
    concurrency: 1,
    minimumIntervalMs: 1_000,
    productionFallback: false,
    sandboxFallback: false,
    otherLiveModesSelected: 0,
    repositoryGatePassed: true,
    plan: buildSplitR2RouteStackPublicMultiScenarioPlan(),
    credentialReader: () => ({
      baseUrl: "https://mcp.routestack.ai",
      apiKey: "synthetic-public-key",
      apiSecret: "synthetic-public-secret",
    }),
    ...overrides,
  };
}

const FAKE_PUBLIC_MULTI_PROMISE = runSplitR2FakeRouteStackPublicMultiScenario();

test("133 public multi-scenario mode is default-disabled and credentials alone are insufficient", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_MULTI_SCENARIO,
    "EXACT_106_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
  let reads = 0;
  assert.throws(() => assertSplitR2RouteStackPublicMultiScenarioPreflight(
    publicMultiScenarioPreflight({ mode: "dry-run", credentialReader: () => { reads += 1; return {}; } })
  ), /before-credentials/);
  assert.equal(reads, 0);
});

test("134 budget, unknown-cost and no-mutation acknowledgements are independently mandatory", () => {
  for (const overrides of [
    { acknowledgement: "MISSING" },
    { unknownCostAcknowledgement: "MISSING" },
    { noMutationAcknowledgement: "MISSING" },
  ]) {
    let reads = 0;
    assert.throws(() => assertSplitR2RouteStackPublicMultiScenarioPreflight(
      publicMultiScenarioPreflight({ ...overrides, credentialReader: () => { reads += 1; return {}; } })
    ), /before-credentials/);
    assert.equal(reads, 0);
  }
});

test("135 public multi-scenario and every other live mode are mutually exclusive", () => {
  let reads = 0;
  assert.throws(() => assertSplitR2RouteStackPublicMultiScenarioPreflight(
    publicMultiScenarioPreflight({ otherLiveModesSelected: 1, credentialReader: () => { reads += 1; return {}; } })
  ), /before-credentials/);
  assert.equal(reads, 0);
});

test("136 authoritative plan is exact 1,3,5 with three destinations and 41,20,41 searches", () => {
  const plan = buildSplitR2RouteStackPublicMultiScenarioPlan();
  assert.equal(assertSplitR2RouteStackPublicMultiScenarioPlan(plan), plan);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.scenario.ordinal), [1, 3, 5]);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.logicalSearches.length), [41, 20, 41]);
  assert.equal(new Set(plan.scenarioPlans.map((entry) => entry.scenario.destination)).size, 3);
  assert.equal(plan.logicalSearches.length, 102);
});

test("137 plan has 13,6,13 breakpoints, one full stay each and deterministic equal-depth order", () => {
  const plan = buildSplitR2RouteStackPublicMultiScenarioPlan();
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.breakpoints), [13, 6, 13]);
  for (const scenario of plan.scenarioPlans) {
    assert.equal(scenario.logicalSearches.filter((entry) => entry.searchRole === "FULL_STAY").length, 1);
    const splitRoles = scenario.logicalSearches.filter((entry) => ["PREFIX", "SUFFIX"].includes(entry.searchRole));
    assert.deepEqual(splitRoles.slice(0, 4).map((entry) => entry.searchRole), ["PREFIX", "SUFFIX", "PREFIX", "SUFFIX"]);
  }
  assert.equal(buildSplitR2RouteStackPublicMultiScenarioPlan().logicalSearches
    .map((entry) => entry.logicalSearchId).join("|"), plan.logicalSearches
    .map((entry) => entry.logicalSearchId).join("|"));
});

test("138 plan drift, scenario replacement and count maximization fail before credentials", () => {
  const plan = buildSplitR2RouteStackPublicMultiScenarioPlan();
  for (const badPlan of [
    { ...plan, scenarioPlans: plan.scenarioPlans.slice(0, 2) },
    { ...plan, logicalSearches: plan.logicalSearches.slice(1) },
    { ...plan, publicScenarioBindings: plan.publicScenarioBindings.slice().reverse() },
  ]) {
    let reads = 0;
    assert.throws(() => assertSplitR2RouteStackPublicMultiScenarioPreflight(
      publicMultiScenarioPreflight({ plan: badPlan, credentialReader: () => { reads += 1; return {}; } })
    ), /plan-divergence/);
    assert.equal(reads, 0);
  }
});

test("139 exact 1/3/102/0/106 contract and limiter are mandatory", () => {
  assert.equal(assertSplitR2RouteStackPublicMultiScenarioPreflight(
    publicMultiScenarioPreflight()).credentialsAccessed, true);
  for (const overrides of [
    { authMax: 2 }, { destinationMax: 2 }, { initialSearchMax: 101 }, { continuationMax: 1 },
    { totalMax: 107 }, { retries: 1 }, { redirects: 1 }, { concurrency: 2 },
    { minimumIntervalMs: 999 }, { hostname: "evolvemcp.routestack.ai" },
    { hostname: "mcp.routestack.ai.example" }, { sandboxFallback: true },
  ]) {
    assert.throws(() => assertSplitR2RouteStackPublicMultiScenarioPreflight(
      publicMultiScenarioPreflight(overrides)), /before-credentials/);
  }
});

test("140 authoritative counter blocks second auth and fourth destination pre-transport", () => {
  const auth = createSplitR2RouteStackPublicMultiScenarioCounter();
  auth.reserve("AUTHENTICATION");
  assert.throws(() => auth.reserve("AUTHENTICATION"), /budget-exceeded-before-transport/);
  const destination = createSplitR2RouteStackPublicMultiScenarioCounter();
  for (let index = 0; index < 3; index += 1) destination.reserve("DESTINATION");
  assert.throws(() => destination.reserve("DESTINATION"), /budget-exceeded-before-transport/);
});

test("141 authoritative counter blocks initial 103, total 107, continuation and mutation", () => {
  const counter = createSplitR2RouteStackPublicMultiScenarioCounter();
  counter.reserve("AUTHENTICATION");
  for (let index = 0; index < 3; index += 1) counter.reserve("DESTINATION");
  for (let index = 0; index < 102; index += 1) counter.reserve("INITIAL_SEARCH");
  assert.equal(counter.snapshot().total, 106);
  assert.throws(() => counter.reserve("INITIAL_SEARCH"), /budget-exceeded-before-transport/);
  assert.throws(() => counter.reserve("CONTINUATION"), /route-forbidden/);
  assert.throws(() => counter.reserve("BOOKING"), /route-forbidden/);
});

test("142 fake campaign performs exact 106 calls with no continuation, retry or redirect", async () => {
  const receipt = await FAKE_PUBLIC_MULTI_PROMISE;
  assert.deepEqual([
    receipt.authHttpRequests, receipt.destinationHttpRequests, receipt.initialHttpRequests,
    receipt.continuationHttpRequests, receipt.totalHttpRequests,
  ], [1, 3, 102, 0, 106]);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.redirects, 0);
  assert.equal(receipt.maxObservedConcurrency, 1);
  assert.equal(receipt.minObservedRequestIntervalMs >= 1_000, true);
});

test("143 fake campaign evaluates three scenarios without treating breakpoints as scenarios", async () => {
  const receipt = await FAKE_PUBLIC_MULTI_PROMISE;
  assert.equal(receipt.perScenarioAggregates.length, 3);
  assert.deepEqual(receipt.perScenarioAggregates.map((entry) => entry.plannedBreakpoints), [13, 6, 13]);
  assert.equal(receipt.scenarioCount, 3);
  assert.equal(receipt.breakpointsEvaluable, 32);
  assert.equal(receipt.scenariosEvaluable, 3);
});

test("144 two material scenarios on two destinations reproduce across multiple scenarios", () => {
  assert.equal(classifySplitR2RouteStackPublicReproducibility({
    scenariosEvaluable: 3, scenariosWithRawPositive: 2, scenariosWithMaterialSignal: 2,
    destinationsWithMaterialSignal: 2,
  }), "REPRODUCED_ACROSS_MULTIPLE_SCENARIOS");
});

test("145 partial, not-reproduced, insufficient and contract-failure categories are exact", () => {
  assert.equal(classifySplitR2RouteStackPublicReproducibility({
    scenariosEvaluable: 3, scenariosWithRawPositive: 1, scenariosWithMaterialSignal: 1,
    destinationsWithMaterialSignal: 1,
  }), "PARTIALLY_REPRODUCED");
  assert.equal(classifySplitR2RouteStackPublicReproducibility({ scenariosEvaluable: 3 }), "NOT_REPRODUCED");
  assert.equal(classifySplitR2RouteStackPublicReproducibility({ scenariosEvaluable: 1 }),
    "INSUFFICIENT_EVALUABLE_DATA");
  assert.equal(classifySplitR2RouteStackPublicReproducibility({ contractFailure: true, scenariosEvaluable: 3 }),
    "PROVIDER_OR_CONTRACT_FAILURE");
});

test("146 pooled breakpoint values cannot influence scenario-level classification", () => {
  const input = { scenariosEvaluable: 3, scenariosWithRawPositive: 1, scenariosWithMaterialSignal: 1,
    destinationsWithMaterialSignal: 1 };
  assert.equal(classifySplitR2RouteStackPublicReproducibility({ ...input, pooledMedian: 999_999 }),
    classifySplitR2RouteStackPublicReproducibility({ ...input, pooledMedian: -999_999 }));
});

test("147 compact receipt is deterministic single-line, complete and below 16000 bytes", async () => {
  const receipt = await FAKE_PUBLIC_MULTI_PROMISE;
  const first = serializeSplitR2RouteStackPublicMultiScenarioReceipt(receipt);
  const second = serializeSplitR2RouteStackPublicMultiScenarioReceipt(receipt);
  assert.equal(first.json, second.json);
  assert.equal(first.json.includes("\n"), false);
  assert.equal(first.byteLength < SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_MAX_UTF8_BYTES, true);
  const parsed = JSON.parse(first.json);
  assert.equal(parsed.receiptVersion, SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RECEIPT_VERSION);
  assert.equal(parsed.perScenarioAggregates.length, 3);
  assert.equal(parsed.reproducibilityClassification, "REPRODUCED_ACROSS_MULTIPLE_SCENARIOS");
});

test("148 maximum aggregate fixture remains compact and oversize fails without truncation", async () => {
  const receipt = await FAKE_PUBLIC_MULTI_PROMISE;
  const large = { ...receipt, totalRawResults: 9_999_999, totalNormalizableResults: 9_999_999 };
  assert.equal(serializeSplitR2RouteStackPublicMultiScenarioReceipt(large).byteLength < 16_000, true);
  assert.throws(() => serializeSplitR2RouteStackPublicMultiScenarioReceipt({
    ...receipt, allowlistedDiagnosticPadding: "x".repeat(16_000),
  }), SplitR2CompactReceiptError);
});

test("149 compact receipt contains no raw identifiers, payloads, metadata or secrets", async () => {
  const json = serializeSplitR2RouteStackPublicMultiScenarioReceipt(await FAKE_PUBLIC_MULTI_PROMISE).json;
  for (const prohibited of [
    "synthetic-destination", "synthetic-s1", "synthetic-correlation", "synthetic-search-token",
    "synthetic-public-secret", "Authorization", "nextResultsKey", "propertyFingerprint",
  ]) assert.equal(json.includes(prohibited), false);
  const receipt = JSON.parse(json);
  assert.deepEqual([
    receipt.rawIdsPersisted, receipt.rawContinuationIdsPersisted,
    receipt.rawMetadataValuesPersisted, receipt.payloadsOrRawResponsesPersisted,
  ], [0, 0, 0, 0]);
});

test("150 campaign keeps public runtime, booking, claims and user usability disabled", async () => {
  const receipt = await FAKE_PUBLIC_MULTI_PROMISE;
  assert.equal(receipt.userUsableSplitEvaluated, false);
  assert.equal(receipt.productionBookingAuthorized, false);
  assert.equal(receipt.publicRuntimeChanged, false);
  assert.equal(receipt.completenessClaimAllowed, false);
  assert.equal(receipt.globalOptimumClaimAllowed, false);
  assert.equal(receipt.generalMarketFrequencyClaimAllowed, false);
  assert.equal(receipt.productionValidityClaimAllowed, false);
  assert.equal(receipt.commercialValidationClaimAllowed, false);
});

test("151 CLI requires exact mode, compact output and all acknowledgements", () => {
  const args = [
    "--r2-routestack-public-multi-scenario", "--compact", "--phase=SPLIT-R2.5A",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_106_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`,
  ];
  assert.equal(parseSplitR2RouteStackPublicMultiScenarioArguments(args).expectedHead, "a".repeat(40));
  assert.throws(() => parseSplitR2RouteStackPublicMultiScenarioArguments(args.slice(0, 8)),
    /cli-contract-invalid/);
});

test("152 R1, LiteAPI holds, public canary and dry-run remain unchanged", async () => {
  assert.equal(SPLIT_R2_FROZEN_SCENARIOS.length, 6);
  assert.equal(buildSplitR2CampaignPlan("LITEAPI_SANDBOX").logicalSearches.length, 183);
  assert.equal((await runSplitR2FakeRouteStackPublicCanary()).totalHttpRequests, 3);
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.LITEAPI_SANDBOX_CAMPAIGN, "NOT_IMPLEMENTED_OR_LIVE_HOLD");
  assert.equal(runSplitR2Mode("dry-run").httpCounters.realHttpRequests, 0);
});
