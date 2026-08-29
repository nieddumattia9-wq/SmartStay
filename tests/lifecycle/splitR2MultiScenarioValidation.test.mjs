import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
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
  SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_MAX_UTF8_BYTES,
  SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RECEIPT_VERSION,
  SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_MAX_UTF8_BYTES,
  SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_RECEIPT_VERSION,
  SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_MAX_UTF8_BYTES,
  SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RECEIPT_VERSION,
  SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_LIMITS,
  SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_FINGERPRINT,
  SPLIT_R2_SANITIZED_HTTP_STATUS_CLASSES,
  SPLIT_R2_SANITIZED_PROVIDER_ERROR_ENUMS,
  SPLIT_R2_FAILURE_SCOPES,
  SPLIT_R2_SEARCH_FAILURE_CIRCUIT_BREAKER,
  SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES,
  SPLIT_R2_PAGINATION_AWARE_EXECUTION_STATES,
  SPLIT_R2_PAGINATION_AWARE_RECEIPT_COMPLETENESS,
  SPLIT_R2_PAGINATION_AWARE_UNPROCESSABLE_REASONS,
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
  assertSplitR2RouteStackPublicPaginationSensitivityPlan,
  assertSplitR2RouteStackPublicPaginationSensitivityPreflight,
  assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan,
  assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight,
  assertSplitR2RouteStackPublicD0ContractCanaryPlan,
  assertSplitR2RouteStackPublicD0ContractCanaryPreflight,
  buildSplitR2CampaignPlan,
  buildSplitR2CompactReceipt,
  buildSplitR2LiteApiCanaryReceipt,
  buildSplitR2ScenarioPlan,
  buildSplitR2LiteApiCanaryPlan,
  buildSplitR2LiteApiZeroResultDiagnosisPlan,
  buildSplitR2RouteStackPublicCanaryBinding,
  buildSplitR2RouteStackPublicMultiScenarioPlan,
  buildSplitR2RouteStackPublicMultiScenarioReceipt,
  buildSplitR2RouteStackPublicPaginationSensitivityPlan,
  buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan,
  buildSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt,
  buildSplitR2HistoricalR2_8AForensicRecord,
  buildSplitR2HistoricalR2_9A_1D0FailureRecord,
  buildSplitR2RouteStackPublicRequestEquivalenceAudit,
  buildSplitR2RouteStackPublicD0ContractCanaryReceipt,
  buildSplitR2RouteStackPublicD0ContractCanaryPlan,
  classifySplitR2RouteStackPublicHttpFailure,
  classifySplitR2RouteStackPublicReproducibility,
  classifySplitR2PaginationBias,
  classifySplitR2PaginationSensitivity,
  classifySplitR2PaginationStabilization,
  splitR2PaginationTransition,
  classifySplitR2Saving,
  createSplitR2AuthoritativeHttpCounter,
  createSplitR2LiteApiCanaryCounter,
  createSplitR2LiteApiCanaryRequestBody,
  createSplitR2LiteApiDiagnosisCounter,
  createSplitR2LiteApiDiagnosisRatesBody,
  createSplitR2MonotonicLimiter,
  createSplitR2RouteStackPublicCanaryCounter,
  createSplitR2RouteStackPublicMultiScenarioCounter,
  createSplitR2RouteStackPublicPaginationSensitivityCounter,
  createSplitR2RouteStackPublicPaginationAwareMultiScenarioCounter,
  createSplitR2RouteStackPublicD0ContractCanaryCounter,
  createSplitR2SearchFailureCircuitBreaker,
  computeSplitR2UnrelatedDirtyFingerprint,
  decideSplitR2Campaign,
  evaluateSplitR2Scenario,
  normalizeSplitR2LiteApiCanaryResponse,
  diagnoseSplitR2LiteApiResponseShape,
  parseSplitR2LiteApiCanaryArguments,
  parseSplitR2LiteApiZeroResultDiagnosisArguments,
  parseSplitR2RouteStackPublicCanaryArguments,
  parseSplitR2RouteStackPublicMultiScenarioArguments,
  parseSplitR2RouteStackPublicPaginationSensitivityArguments,
  parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments,
  parseSplitR2RouteStackPublicD0ContractCanaryArguments,
  runSplitR2FakeLiteApiCanary,
  runSplitR2FakeLiteApiZeroResultDiagnosis,
  runSplitR2FakeRouteStackPublicCanary,
  runSplitR2FakeRouteStackPublicMultiScenario,
  runSplitR2FakeRouteStackPublicPaginationEarlyTerminal,
  runSplitR2FakeRouteStackPublicPaginationFullDepth,
  runSplitR2FakeRouteStackPublicPaginationAwareFullDepth,
  runSplitR2FakeRouteStackPublicPaginationAwareEarlyTerminal,
  runSplitR2FakeRouteStackPublicPaginationAwareEconomicCoverage,
  runSplitR2FakeRouteStackPublicPaginationAwareFailureBoundary,
  runSplitR2FakeRouteStackPublicPaginationAwareExactR2_9A,
  runSplitR2FakeRouteStackPublicPaginationAwareNoD2Eligible,
  runSplitR2FakeRouteStackPublicPaginationAwareNoEvaluableFailureBoundary,
  runSplitR2FakeRouteStackPublicPaginationAwareD2FailureBoundary,
  runSplitR2OfflineR2_9ForensicDiagnosis,
  runSplitR2FakeRouteStackPublicD0ContractCanary,
  runSplitR2FakeRouteStackPublicD0ContractCanaryExact,
  runSplitR2FakeFailureScopeControl,
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
  serializeSplitR2RouteStackPublicPaginationSensitivityReceipt,
  serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt,
  serializeSplitR2RouteStackPublicD0ContractCanaryReceipt,
  classifySplitR2PaginationAwareContinuation,
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
    ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY:
      "EXACT_45_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
    ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO:
      "EXACT_MAX_310_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
    ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_R2_9A:
      "EXACT_R2_9A_MAX_310_HTTP_D2_PARTIAL_SALVAGE_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
    ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY:
      "EXACT_MAX_5_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
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

function paginationPreflight(overrides = {}) {
  return {
    mode: "ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY",
    phase: "SPLIT-R2.7A",
    compact: true,
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    hostname: "mcp.routestack.ai",
    protocol: "https:",
    acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_45_HTTP",
    unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    authMax: 1,
    destinationMax: 2,
    initialSearchMax: 14,
    continuationD1Max: 14,
    continuationD2Max: 14,
    continuationMax: 28,
    totalMax: 45,
    maxContinuationDepth: 2,
    retries: 0,
    redirects: 0,
    concurrency: 1,
    minimumIntervalMs: 1_000,
    productionFallback: false,
    sandboxFallback: false,
    otherLiveModesSelected: 0,
    repositoryGatePassed: true,
    plan: buildSplitR2RouteStackPublicPaginationSensitivityPlan(),
    contractEvidence: {
      environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
      hostnameDeterminable: true,
      contractDeterminable: true,
      mutativeEndpointsSelected: false,
      sandboxFallback: false,
    },
    credentialReader: () => ({
      baseUrl: "https://mcp.routestack.ai",
      apiKey: "synthetic-public-key",
      apiSecret: "synthetic-public-secret",
    }),
    ...overrides,
  };
}

function transition(overrides = {}) {
  return {
    comparable: true,
    evaluabilityChanged: false,
    fullBaselineChanged: false,
    splitPairChanged: false,
    savingSignChanged: false,
    materialChanged: false,
    savingDeltaMinorUnits: 0,
    ...overrides,
  };
}

function depthEntry(d0ToD1 = transition(), d1ToD2 = transition()) {
  return { d0ToD1, d1ToD2 };
}

const PAGINATION_FULL_PROMISE = runSplitR2FakeRouteStackPublicPaginationFullDepth();
const PAGINATION_TERMINAL_PROMISE = runSplitR2FakeRouteStackPublicPaginationEarlyTerminal();

test("153 R2.7A capability is isolated, default-disabled and exact acknowledgements are mandatory", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY,
    "EXACT_45_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
  let reads = 0;
  for (const overrides of [
    { mode: "dry-run" },
    { acknowledgement: "MISSING" },
    { unknownCostAcknowledgement: "MISSING" },
    { noMutationAcknowledgement: "MISSING" },
    { otherLiveModesSelected: 1 },
  ]) {
    assert.throws(() => assertSplitR2RouteStackPublicPaginationSensitivityPreflight(
      paginationPreflight({ ...overrides, credentialReader: () => { reads += 1; return {}; } })
    ), /before-credentials/);
  }
  assert.equal(reads, 0);
  assert.equal(assertSplitR2RouteStackPublicPaginationSensitivityPreflight(
    paginationPreflight()).credentialsAccessed, true);
});

test("154 R2.7A authoritative plan is exactly scenarios 1,3 and structural breakpoints", () => {
  const plan = buildSplitR2RouteStackPublicPaginationSensitivityPlan();
  assert.equal(assertSplitR2RouteStackPublicPaginationSensitivityPlan(plan), plan);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.scenario.ordinal), [1, 3]);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.selectedBreakpointOrdinals),
    [[1, 7, 13], [1, 3, 6]]);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.logicalSearches.length), [7, 7]);
  assert.equal(plan.logicalSearches.length, 14);
  assert.equal(new Set(plan.scenarioPlans.map((entry) => entry.scenario.destination)).size, 2);
});

test("155 R2.7A plan drift and substitution fail closed with no price or result-count selector", () => {
  const plan = buildSplitR2RouteStackPublicPaginationSensitivityPlan();
  for (const bad of [
    { ...plan, scenarioPlans: plan.scenarioPlans.slice(0, 1) },
    { ...plan, logicalSearches: plan.logicalSearches.slice(1) },
  ]) {
    assert.throws(() => assertSplitR2RouteStackPublicPaginationSensitivityPlan(bad), /plan-divergence/);
  }
  assert.equal(Object.hasOwn(plan, "selectionPrice"), false);
  assert.equal(Object.hasOwn(plan, "resultCountSelector"), false);
  assert.equal(Object.hasOwn(plan, "replacementScenario"), false);
});

test("156 R2.7A exact 1/2/14/14/14/45 contract, D2 and Production host are mandatory", () => {
  for (const overrides of [
    { authMax: 2 }, { destinationMax: 3 }, { initialSearchMax: 15 },
    { continuationD1Max: 13 }, { continuationD2Max: 13 }, { continuationMax: 29 },
    { totalMax: 46 }, { maxContinuationDepth: 3 }, { retries: 1 }, { redirects: 1 },
    { concurrency: 2 }, { minimumIntervalMs: 999 }, { hostname: "evolvemcp.routestack.ai" },
    { sandboxFallback: true },
  ]) assert.throws(() => assertSplitR2RouteStackPublicPaginationSensitivityPreflight(
    paginationPreflight(overrides)), /before-credentials/);
});

test("157 R2.7A counter blocks auth2, destination3, initial15 and forbidden routes pre-transport", () => {
  const auth = createSplitR2RouteStackPublicPaginationSensitivityCounter();
  auth.reserve("AUTHENTICATION");
  assert.throws(() => auth.reserve("AUTHENTICATION"), /budget-exceeded/);
  const destination = createSplitR2RouteStackPublicPaginationSensitivityCounter();
  destination.reserve("DESTINATION"); destination.reserve("DESTINATION");
  assert.throws(() => destination.reserve("DESTINATION"), /budget-exceeded/);
  const initial = createSplitR2RouteStackPublicPaginationSensitivityCounter();
  for (let i = 0; i < 14; i += 1) initial.reserve("INITIAL_SEARCH", `q${i}`);
  assert.throws(() => initial.reserve("INITIAL_SEARCH", "q14"), /budget-exceeded/);
  assert.throws(() => initial.reserve("BOOKING"), /route-forbidden/);
  assert.throws(() => initial.reserve("CONTINUATION_D3", "q0"), /route-forbidden/);
});

test("158 R2.7A counter enforces breadth-first and same-search D1 to D2 binding", () => {
  const counter = createSplitR2RouteStackPublicPaginationSensitivityCounter();
  assert.throws(() => counter.reserve("CONTINUATION_D1", "q0"), /d1-order/);
  for (let i = 0; i < 14; i += 1) counter.reserve("INITIAL_SEARCH", `q${i}`);
  counter.closeDepth("D0");
  counter.reserve("CONTINUATION_D1", "q0");
  assert.throws(() => counter.reserve("CONTINUATION_D1", "q0"), /d1-order-or-cardinality/);
  assert.throws(() => counter.reserve("CONTINUATION_D2", "q0"), /d2-order/);
  counter.closeDepth("D1");
  assert.throws(() => counter.reserve("CONTINUATION_D2", "q1"), /d2-order-or-binding/);
  counter.reserve("CONTINUATION_D2", "q0");
  assert.throws(() => counter.reserve("CONTINUATION_D2", "q0"), /d2-order-or-binding/);
});

test("159 R2.7A fake full-depth campaign is exact breadth-first 45 HTTP", async () => {
  const receipt = await PAGINATION_FULL_PROMISE;
  assert.deepEqual([
    receipt.authHttpRequests, receipt.destinationHttpRequests, receipt.initialHttpRequests,
    receipt.continuationD1HttpRequests, receipt.continuationD2HttpRequests,
    receipt.continuationHttpRequests, receipt.totalHttpRequests,
  ], [1, 2, 14, 14, 14, 28, 45]);
  assert.equal(receipt.allD0BeforeAnyD1, true);
  assert.equal(receipt.allD1BeforeAnyD2, true);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.redirects, 0);
  assert.equal(receipt.maxObservedConcurrency, 1);
  assert.equal(receipt.minObservedRequestIntervalMs >= 1_000, true);
});

test("160 R2.7A cumulative union and inter-page dedup preserve the same HMAC identity", async () => {
  const receipt = await PAGINATION_FULL_PROMISE;
  assert.deepEqual(receipt.perDepthCumulativeDistinctOffers, { D0: 14, D1: 14, D2: 28 });
  assert.deepEqual(receipt.interPageDuplicatesRemoved, { D1: 14, D2: 14 });
  assert.equal(receipt.ephemeralHmacSecretPersisted, false);
});

test("161 R2.7A fake early-terminal campaign stops without continuation and is inconclusive", async () => {
  const receipt = await PAGINATION_TERMINAL_PROMISE;
  assert.equal(receipt.totalHttpRequests, 17);
  assert.equal(receipt.continuationHttpRequests, 0);
  assert.equal(receipt.status, "INCONCLUSIVE");
  assert.equal(receipt.sensitivityClassification, "PAGINATION_SENSITIVITY_INCONCLUSIVE");
});

test("162 R2.7A sensitivity categories are exact and mutually exclusive", () => {
  assert.equal(classifySplitR2PaginationSensitivity([
    depthEntry(transition({ savingSignChanged: true })),
  ]), "PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL");
  assert.equal(classifySplitR2PaginationSensitivity([
    depthEntry(transition({ materialChanged: true })),
  ]), "PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL");
  assert.equal(classifySplitR2PaginationSensitivity([
    depthEntry(transition({ evaluabilityChanged: true })),
  ]), "PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL");
  assert.equal(classifySplitR2PaginationSensitivity([
    depthEntry(transition({ fullBaselineChanged: true })),
  ]), "PAGINATION_SENSITIVITY_ECONOMIC_MINIMUM_ONLY");
  assert.equal(classifySplitR2PaginationSensitivity([depthEntry()]),
    "NO_PAGINATION_SENSITIVITY_OBSERVED_WITHIN_D2");
  assert.equal(classifySplitR2PaginationSensitivity([
    depthEntry({ comparable: false }, { comparable: false }),
  ]), "PAGINATION_SENSITIVITY_INCONCLUSIVE");
});

test("163 R2.7A stabilization categories are exact", () => {
  assert.equal(classifySplitR2PaginationStabilization([depthEntry()]), "STABLE_BY_D1");
  assert.equal(classifySplitR2PaginationStabilization([
    depthEntry(transition({ splitPairChanged: true }), transition()),
  ]), "STABLE_BY_D2");
  assert.equal(classifySplitR2PaginationStabilization([
    depthEntry(transition(), transition({ fullBaselineChanged: true })),
  ]), "STILL_CHANGING_AT_D2");
  assert.equal(classifySplitR2PaginationStabilization([
    depthEntry({ comparable: false }, transition()),
  ]), "NOT_DETERMINABLE");
});

test("164 R2.7A bias direction derives only from saving deltas", () => {
  assert.equal(classifySplitR2PaginationBias([
    depthEntry(transition({ savingDeltaMinorUnits: 1 }), transition({ savingDeltaMinorUnits: 0 })),
  ]), "FAVORS_SPLIT");
  assert.equal(classifySplitR2PaginationBias([
    depthEntry(transition({ savingDeltaMinorUnits: -1 }), transition({ savingDeltaMinorUnits: 0 })),
  ]), "FAVORS_FULL_STAY");
  assert.equal(classifySplitR2PaginationBias([
    depthEntry(transition({ savingDeltaMinorUnits: -1 }), transition({ savingDeltaMinorUnits: 1 })),
  ]), "BIDIRECTIONAL");
  assert.equal(classifySplitR2PaginationBias([depthEntry()]), "NO_DIRECTIONAL_CHANGE");
});

test("164A R2.7A baseline, pair, sign, material and evaluability events derive from canonical values", () => {
  const base = { depthObserved: true, evaluable: true, fullBaselineMinorUnits: 20_000,
    bestDistinctSplitPairTotalMinorUnits: 19_000, savingMinorUnits: 1_000,
    savingBasisPoints: 500, materialSignal: false };
  const changed = { ...base, fullBaselineMinorUnits: 21_000,
    bestDistinctSplitPairTotalMinorUnits: 19_500, savingMinorUnits: -500,
    savingBasisPoints: -238, materialSignal: true };
  const event = splitR2PaginationTransition(base, changed);
  assert.equal(event.fullBaselineChanged, true);
  assert.equal(event.splitPairChanged, true);
  assert.equal(event.savingSignChanged, true);
  assert.equal(event.materialChanged, true);
  assert.equal(event.savingDeltaMinorUnits, -1_500);
  assert.equal(splitR2PaginationTransition(base, { ...changed, evaluable: false }).evaluabilityChanged, true);
});

test("165 R2.7A receipt is deterministic, single-line, complete and below 12000 bytes", async () => {
  const receipt = await PAGINATION_FULL_PROMISE;
  const first = serializeSplitR2RouteStackPublicPaginationSensitivityReceipt(receipt);
  const second = serializeSplitR2RouteStackPublicPaginationSensitivityReceipt(receipt);
  assert.equal(first.json, second.json);
  assert.equal(first.json.includes("\n"), false);
  assert.equal(first.byteLength < SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_MAX_UTF8_BYTES, true);
  assert.equal(JSON.parse(first.json).receiptVersion,
    SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RECEIPT_VERSION);
  assert.equal(receipt.perBreakpointDepthEconomics.length, 6);
});

test("166 R2.7A maximum receipt fixture fits and oversize fails without truncation", async () => {
  const receipt = await PAGINATION_FULL_PROMISE;
  assert.equal(serializeSplitR2RouteStackPublicPaginationSensitivityReceipt({
    ...receipt,
    perDepthCollectionCounts: {
      D0: { ...receipt.perDepthCollectionCounts.D0, cumulativeRawResults: 99_999_999 },
      D1: receipt.perDepthCollectionCounts.D1,
      D2: receipt.perDepthCollectionCounts.D2,
    },
  }).byteLength < 12_000, true);
  assert.throws(() => serializeSplitR2RouteStackPublicPaginationSensitivityReceipt({
    ...receipt, allowlistedDiagnosticPadding: "x".repeat(12_000),
  }), SplitR2CompactReceiptError);
});

test("167 R2.7A compact receipt excludes raw identifiers, continuation metadata, payloads and secrets", async () => {
  const json = serializeSplitR2RouteStackPublicPaginationSensitivityReceipt(await PAGINATION_FULL_PROMISE).json;
  for (const prohibited of [
    "synthetic-property", "synthetic-destination", "synthetic-correlation", "synthetic-token",
    "synthetic-next", "Authorization", "nextResultsKey", "propertyFingerprint",
  ]) assert.equal(json.includes(prohibited), false);
  const receipt = JSON.parse(json);
  assert.deepEqual([receipt.rawIdsPersisted, receipt.rawContinuationIdsPersisted,
    receipt.rawMetadataValuesPersisted, receipt.payloadsOrRawResponsesPersisted], [0, 0, 0, 0]);
  assert.equal(receipt.secretValuesExposed, false);
});

test("168 R2.7A historical modes still prohibit continuation and runtime claims remain false", async () => {
  const historical = createSplitR2RouteStackPublicMultiScenarioCounter();
  assert.throws(() => historical.reserve("CONTINUATION"), /route-forbidden/);
  const receipt = await PAGINATION_FULL_PROMISE;
  assert.equal(receipt.continuationContractChangedOutsideMicrostudy, false);
  assert.equal(receipt.publicRuntimeChanged, false);
  assert.equal(receipt.productionBookingAuthorized, false);
  assert.equal(receipt.completenessClaimAllowed, false);
  assert.equal(receipt.globalOptimumClaimAllowed, false);
  assert.equal(receipt.marketFrequencyClaimAllowed, false);
});

test("169 R2.7A CLI requires exact flag, phase, compact mode and acknowledgements", () => {
  const args = [
    "--r2-routestack-public-pagination-sensitivity", "--compact", "--phase=SPLIT-R2.7A",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_45_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`,
  ];
  assert.equal(parseSplitR2RouteStackPublicPaginationSensitivityArguments(args).expectedHead, "a".repeat(40));
  assert.throws(() => parseSplitR2RouteStackPublicPaginationSensitivityArguments(args.slice(0, 8)),
    /cli-contract-invalid/);
});

function paginationAwarePreflight(overrides = {}) {
  return {
    mode: "ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO", phase: "SPLIT-R2.8A", compact: true,
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED", hostname: "mcp.routestack.ai", protocol: "https:",
    acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP",
    unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    authMax: 1, destinationMax: 3, initialSearchMax: 102, continuationD1Max: 102,
    continuationD2Max: 102, continuationMax: 204, totalMax: 310, maxContinuationDepth: 2,
    retries: 0, redirects: 0, concurrency: 1, minimumIntervalMs: 1_000,
    productionFallback: false, sandboxFallback: false, liteApiFallback: false,
    otherLiveModesSelected: 0, repositoryGatePassed: true,
    plan: buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(),
    contractEvidence: { environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
      hostnameDeterminable: true, contractDeterminable: true, mutativeEndpointsSelected: false,
      sandboxFallback: false },
    credentialReader: () => ({ baseUrl: "https://mcp.routestack.ai",
      apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret" }),
    ...overrides,
  };
}

const PAGINATION_AWARE_FULL_PROMISE = runSplitR2FakeRouteStackPublicPaginationAwareFullDepth();
const PAGINATION_AWARE_EARLY_PROMISE = runSplitR2FakeRouteStackPublicPaginationAwareEarlyTerminal();
const PAGINATION_AWARE_FAILURE_PROMISE = runSplitR2FakeRouteStackPublicPaginationAwareFailureBoundary();
const PAGINATION_AWARE_R2_9A_PROMISE = runSplitR2FakeRouteStackPublicPaginationAwareExactR2_9A();
const PAGINATION_AWARE_NO_D2_PROMISE = runSplitR2FakeRouteStackPublicPaginationAwareNoD2Eligible();
const PAGINATION_AWARE_NO_EVALUABLE_PROMISE =
  runSplitR2FakeRouteStackPublicPaginationAwareNoEvaluableFailureBoundary();
const PAGINATION_AWARE_D2_FAILURE_PROMISE =
  runSplitR2FakeRouteStackPublicPaginationAwareD2FailureBoundary();

test("170 R2.8A capability is default-disabled and exact mode precedes credentials", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO,
    "EXACT_MAX_310_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
  let reads = 0;
  for (const overrides of [{ mode: "dry-run" }, { acknowledgement: "MISSING" },
    { unknownCostAcknowledgement: "MISSING" }, { noMutationAcknowledgement: "MISSING" },
    { otherLiveModesSelected: 1 }, { sandboxFallback: true }, { liteApiFallback: true }]) {
    assert.throws(() => assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(
      paginationAwarePreflight({ ...overrides, credentialReader: () => { reads += 1; return {}; } })),
    /before-credentials/);
  }
  assert.equal(reads, 0);
  assert.equal(assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(
    paginationAwarePreflight()).credentialsAccessed, true);
});

test("171 R2.8A authoritative plan is exactly 3 scenarios, 102 searches and 32 breakpoints", () => {
  const plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  assert.equal(assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(plan), plan);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.scenario.ordinal), [1, 3, 5]);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.logicalSearches.length), [41, 20, 41]);
  assert.deepEqual(plan.scenarioPlans.map((entry) => entry.breakpoints), [13, 6, 13]);
  assert.equal(plan.logicalSearches.length, 102);
  assert.equal(new Set(plan.scenarioPlans.map((entry) => entry.scenario.destination)).size, 3);
  assert.throws(() => assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan({
    ...plan, logicalSearches: plan.logicalSearches.slice(1),
  }), /plan-divergence/);
});

test("172 R2.8A exact 1/3/102/102/102/310 contract is immutable", () => {
  for (const overrides of [{ authMax: 2 }, { destinationMax: 4 }, { initialSearchMax: 103 },
    { continuationD1Max: 103 }, { continuationD2Max: 103 }, { continuationMax: 205 },
    { totalMax: 311 }, { maxContinuationDepth: 3 }, { retries: 1 }, { redirects: 1 },
    { concurrency: 2 }, { minimumIntervalMs: 999 }, { hostname: "evolvemcp.routestack.ai" }]) {
    assert.throws(() => assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(
      paginationAwarePreflight(overrides)), /before-credentials/);
  }
});

test("173 R2.8A counter blocks D3, request 311 and enforces breadth-first bindings", () => {
  const counter = createSplitR2RouteStackPublicPaginationAwareMultiScenarioCounter();
  assert.throws(() => counter.reserve("CONTINUATION_D1", "q0"), /d1-order/);
  for (let i = 0; i < 102; i += 1) counter.reserve("INITIAL_SEARCH", `q${i}`);
  assert.throws(() => counter.reserve("INITIAL_SEARCH", "q102"), /budget|d0-order/);
  counter.closeDepth("D0");
  for (let i = 0; i < 102; i += 1) counter.reserve("CONTINUATION_D1", `q${i}`);
  assert.throws(() => counter.reserve("CONTINUATION_D1", "q0"), /d1-order|budget/);
  counter.closeDepth("D1");
  for (let i = 0; i < 102; i += 1) counter.reserve("CONTINUATION_D2", `q${i}`);
  assert.equal(counter.snapshot().total, 306);
  assert.throws(() => counter.reserve("CONTINUATION_D3", "q0"), /route-forbidden/);
  counter.reserve("AUTHENTICATION");
  counter.reserve("DESTINATION"); counter.reserve("DESTINATION"); counter.reserve("DESTINATION");
  assert.equal(counter.snapshot().total, 310);
  assert.throws(() => counter.reserve("DESTINATION"), /budget/);
});

test("174 R2.8A continuation metadata is exact, non-ambiguous and non-recursive", () => {
  assert.equal(classifySplitR2PaginationAwareContinuation({ result: {
    correlationId: "c", token: "t", nextResultsKey: "n", result: [],
  } }).classification, "ELIGIBLE");
  assert.equal(classifySplitR2PaginationAwareContinuation({ result: { result: [] } }).classification, "NONE");
  assert.equal(classifySplitR2PaginationAwareContinuation({ result: {
    correlationId: "c", token: "t", nextResultsKey: "n", result: [],
  }, data: { correlationId: "c2", token: "t2", nextResultsKey: "n2" } }).classification, "AMBIGUOUS");
  assert.equal(SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES.length, 8);
  assert.equal(new Set(SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES).size, 8);
});

test("175 R2.8A fake full-depth campaign is exact 310 HTTP breadth-first and D3-free", async () => {
  const receipt = await PAGINATION_AWARE_FULL_PROMISE;
  assert.deepEqual([receipt.authHttpRequests, receipt.destinationHttpRequests, receipt.initialHttpRequests,
    receipt.continuationD1HttpRequests, receipt.continuationD2HttpRequests,
    receipt.continuationHttpRequests, receipt.totalHttpRequests], [1, 3, 102, 102, 102, 204, 310]);
  assert.equal(receipt.allD0BeforeAnyD1, true);
  assert.equal(receipt.allD1BeforeAnyD2, true);
  assert.equal(receipt.d3HttpRequests, 0);
  assert.equal(receipt.maxObservedConcurrency, 1);
  assert.equal(receipt.minObservedRequestIntervalMs >= 1_000, true);
  assert.equal(receipt.completionStateCounts.PROVIDER_EXHAUSTED_AFTER_D2, 102);
});

test("176 R2.8A early-terminal fixture uses only eligible continuations and classifies all states", async () => {
  const receipt = await PAGINATION_AWARE_EARLY_PROMISE;
  assert.equal(receipt.totalHttpRequests < 310, true);
  assert.equal(receipt.completionStateCounts.PROVIDER_EXHAUSTED_AFTER_INITIAL > 0, true);
  assert.equal(receipt.completionStateCounts.PROVIDER_EXHAUSTED_AFTER_D1 > 0, true);
  assert.equal(receipt.completionStateCounts.PROVIDER_EXHAUSTED_AFTER_D2 > 0, true);
  assert.equal(receipt.completionStateCounts.DEPTH_CAPPED_WITH_MORE_AVAILABLE > 0, true);
  assert.equal(receipt.completionStateCounts.ZERO_RAW_PROVIDER_EXHAUSTED > 0, true);
  assert.equal(receipt.completionStateCounts.AMBIGUOUS_CONTINUATION_METADATA > 0, true);
  assert.equal(receipt.completionStateCounts.UNPROCESSABLE_RESPONSE > 0, true);
});

test("177 R2.8A depth-capped searches are diagnostic-only and dual denominators are explicit", async () => {
  const receipt = await runSplitR2FakeRouteStackPublicPaginationAwareEconomicCoverage();
  assert.equal(receipt.primaryEconomicEligibleSearches + receipt.primaryEconomicExcludedSearches, 102);
  assert.equal(receipt.primaryEconomicExcludedSearches >=
    receipt.completionStateCounts.DEPTH_CAPPED_WITH_MORE_AVAILABLE, true);
  assert.equal(receipt.breakpointsEvaluable + receipt.breakpointsNotEvaluable, 32);
  assert.equal(receipt.scenarioCount, 3);
});

test("178 R2.8A receipt is deterministic single-line, reconstructible and below 16000 bytes", async () => {
  const receipt = await PAGINATION_AWARE_FULL_PROMISE;
  const a = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(receipt);
  const b = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(receipt);
  assert.equal(a.json, b.json);
  assert.equal(a.json.includes("\n"), false);
  assert.equal(a.byteLength < SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_MAX_UTF8_BYTES, true);
  assert.equal(receipt.receiptVersion,
    SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_RECEIPT_VERSION);
  assert.equal(receipt.searchDiagnostics.length, 102);
  assert.equal(receipt.searchDiagnostics.every((entry) => entry.length === 18), true);
});

test("179 R2.8A oversize fails closed without truncation", async () => {
  const receipt = await PAGINATION_AWARE_FULL_PROMISE;
  assert.throws(() => serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt({
    ...receipt, allowlistedDiagnosticPadding: "x".repeat(16_000),
  }), SplitR2CompactReceiptError);
});

test("180 R2.8A compact output excludes raw identifiers, continuation data, payloads and secrets", async () => {
  const json = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(
    await PAGINATION_AWARE_FULL_PROMISE).json;
  for (const prohibited of ["synthetic-property", "synthetic-destination", "synthetic-c-", "synthetic-t-",
    "synthetic-n-", "Authorization", "nextResultsKey", "propertyFingerprint"])
    assert.equal(json.includes(prohibited), false);
  const receipt = JSON.parse(json);
  assert.deepEqual([receipt.rawIdsPersisted, receipt.rawContinuationIdsPersisted,
    receipt.rawMetadataValuesPersisted, receipt.payloadsOrRawResponsesPersisted], [0, 0, 0, 0]);
  assert.equal(receipt.ephemeralHmacSecretPersisted, false);
  assert.equal(receipt.crossRunLinkability, false);
  assert.equal(receipt.secretValuesExposed, false);
});

test("181 R2.8A economics, material thresholds and historical claims remain frozen", async () => {
  const receipt = await PAGINATION_AWARE_FULL_PROMISE;
  assert.equal(SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS, 10_000);
  assert.equal(SPLIT_R2_MATERIAL_BASIS_POINTS, 1_000);
  assert.equal(receipt.r2_5aResultPreserved, true);
  assert.equal(receipt.r2_5aEconomicInferenceValidity, "NOT_ROBUST_TO_PAGINATION");
  assert.equal(receipt.r2_5aFrequencyEvidenceUsable, false);
  assert.equal(receipt.r2_5aMaterialRecurrenceConclusionUsable, false);
  assert.equal(receipt.qualityFrictionImplemented, false);
  assert.equal(receipt.userUsableSplitEvaluated, false);
  assert.equal(receipt.completenessClaimAllowed, false);
  assert.equal(receipt.publicRuntimeChanged, false);
});

test("182 R2.8A CLI requires exact phase, compact flag and all acknowledgements", () => {
  const args = ["--r2-routestack-public-pagination-aware-multi-scenario", "--compact", "--phase=SPLIT-R2.8A",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`];
  assert.equal(parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(args).expectedHead, "a".repeat(40));
  assert.throws(() => parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(args.slice(0, 8)),
    /cli-contract-invalid/);
});

test("183 R2.8A historical live modes still forbid continuation outside their exact contracts", () => {
  assert.throws(() => createSplitR2RouteStackPublicMultiScenarioCounter().reserve("CONTINUATION"), /route-forbidden/);
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_PRODUCTION_CANARY,
    "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED");
});

test("184 R2.9 HTTP maximum is a ceiling and an early terminal wave is not invalidated", async () => {
  const receipt = await PAGINATION_AWARE_EARLY_PROMISE;
  assert.equal(receipt.totalHttpRequests < receipt.totalHttpBudget, true);
  assert.notEqual(receipt.failureClassification, "HTTP_BUDGET_NOT_FULLY_CONSUMED");
  assert.equal(receipt.totalHttpBudget, 310);
});

test("185 R2.9 observed abort boundary accounts exactly 102 searches without overlap", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.deepEqual(receipt.executionStateCounts, {
    EXECUTED_TO_TERMINAL_STATE: 66,
    FAILED_DURING_EXECUTION: 1,
    NOT_EXECUTED_AFTER_WAVE_ABORT: 35,
  });
  assert.equal(receipt.accountingSum, 102);
  assert.equal(receipt.accountingMatchesTotal, true);
  assert.equal(receipt.accountingOverlapDetected, false);
  assert.equal(receipt.totalHttpRequests, 159);
  assert.equal(receipt.continuationD1HttpRequests, 53);
  assert.equal(receipt.continuationD2HttpRequests, 0);
});

test("186 R2.9 abort salvages only completely observed breakpoint economics", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.equal(receipt.primaryCampaignInferenceStatus, "NOT_EVALUABLE_WAVE_ABORTED");
  assert.equal(receipt.primaryReproducibilityClassification, "PROVIDER_OR_CONTRACT_FAILURE");
  assert.equal(receipt.breakpointsEvaluable, 0);
  assert.equal(receipt.partialWaveAnalysis.economicallyEvaluableBreakpoints, 19);
  assert.equal(receipt.partialWaveAnalysis.notEvaluableBreakpoints, 13);
  assert.equal(receipt.partialWaveAnalysis.perScenario[0].evaluableBreakpoints, 13);
  assert.equal(receipt.partialWaveAnalysis.perScenario[1].evaluableBreakpoints, 6);
  assert.equal(receipt.partialWaveAnalysis.perScenario[2].evaluableBreakpoints, 0);
  assert.equal(receipt.partialWaveAnalysis.perScenario[2].bestSavingMinorUnits, null);
  assert.equal(receipt.partialWaveAnalysis.reproducibilityClassificationAllowed, false);
});

test("187 R2.9 saving and material thresholds remain byte-semantic invariants", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.equal(SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS, 10_000);
  assert.equal(SPLIT_R2_MATERIAL_BASIS_POINTS, 1_000);
  assert.equal(receipt.partialWaveAnalysis.bestSavingMinorUnits, 20_000);
  assert.equal(receipt.partialWaveAnalysis.bestSavingBasisPoints, 2_000);
  assert.equal(receipt.partialWaveAnalysis.materialBreakpoints, 19);
});

test("188 R2.9 historical evidence declares non-reconstructability without invented economics", () => {
  const record = buildSplitR2HistoricalR2_8AForensicRecord();
  assert.equal(record.status, "FAIL");
  assert.equal(record.partialWaveEconomicReconstructability, "NOT_RECONSTRUCTABLE_DATA_NOT_RETAINED");
  assert.equal(record.partialWaveEconomicResultsComputed, false);
  assert.equal(record.failedScenarioOrdinal, null);
  assert.equal(record.failedLogicalSearchOrdinal, null);
  assert.equal(record.failureOrigin, "NOT_RECONSTRUCTABLE");
});

test("189 R2.9 incomplete D1 is distinct from a breadth-first ordering violation", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.equal(receipt.d0PhaseCompleted, true);
  assert.equal(receipt.d1PhaseCompleted, false);
  assert.equal(receipt.d2PhaseStarted, false);
  assert.equal(receipt.breadthFirstOrderViolation, false);
  assert.equal(receipt.allD0BeforeAnyD1, true);
  assert.equal(receipt.allD1BeforeAnyD2, true);
});

test("190 R2.9 unprocessable accounting is depth, scenario, role and reason sanitized", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.equal(receipt.completionStateCounts.UNPROCESSABLE_RESPONSE, 14);
  assert.deepEqual([receipt.unprocessableAtD0, receipt.unprocessableAtD1, receipt.unprocessableAtD2], [14, 0, 0]);
  assert.equal(receipt.unprocessableOverlapDetected, false);
  assert.equal(receipt.unprocessableScenarioCounts[1], 14);
  assert.equal(receipt.unprocessableRoleCounts.NIGHTLY, 14);
  assert.equal(receipt.unprocessableReasonCounts.INVALID_RESULTS_TYPE, 14);
  assert.equal(SPLIT_R2_PAGINATION_AWARE_UNPROCESSABLE_REASONS.includes("INVALID_RESULTS_TYPE"), true);
});

test("191 R2.9 abort receipt is single-line, complete, numeric-sized and below 16000 bytes", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  const serialized = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(receipt);
  const parsed = JSON.parse(serialized.json);
  assert.equal(serialized.json.includes("\n"), false);
  assert.equal(parsed.compactReceiptUtf8Bytes, serialized.byteLength);
  assert.equal(Number.isInteger(parsed.compactReceiptUtf8Bytes), true);
  assert.equal(parsed.compactReceiptUtf8Bytes > 0, true);
  assert.equal(serialized.byteLength < 16_000, true);
  assert.equal(parsed.receiptCompleteness, "PARTIAL_WAVE_ABORTED_WITH_EXPLORATORY_ECONOMICS");
});

test("192 R2.9 sanitized failure boundary stops D2, retry and subsequent requests", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.deepEqual([receipt.failureBoundary.failedDepth, receipt.failureBoundary.failedD1RequestOrdinal], ["D1", 53]);
  assert.equal(receipt.failureBoundary.failureOrigin, "NETWORK_TRANSPORT");
  assert.equal(receipt.failureBoundary.failureHttpStatusCategory, "NO_HTTP_RESPONSE");
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.redirects, 0);
  assert.equal(receipt.d3HttpRequests, 0);
});

test("193 R2.9 execution and terminal state domains are exact and non-overlapping", async () => {
  const receipt = await PAGINATION_AWARE_FAILURE_PROMISE;
  assert.equal(SPLIT_R2_PAGINATION_AWARE_EXECUTION_STATES.length, 3);
  assert.equal(new Set(SPLIT_R2_PAGINATION_AWARE_EXECUTION_STATES).size, 3);
  assert.equal(SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES.length, 8);
  const completionSum = Object.values(receipt.completionStateCounts).reduce((sum, value) => sum + value, 0);
  assert.equal(completionSum, 67);
  assert.equal(completionSum + receipt.executionStateCounts.NOT_EXECUTED_AFTER_WAVE_ABORT, 102);
});

test("194 R2.9 fingerprint excludes authorized paths, ignores Git status and detects byte changes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stayopti-r2-9-fingerprint-"));
  try {
    const unrelated = path.join(root, "unrelated.bin");
    const authorized = path.join(root, "scripts", "run-split-r2-multi-scenario-validation.mjs");
    await fs.mkdir(path.dirname(authorized), { recursive: true });
    await fs.writeFile(unrelated, Buffer.from([1, 2, 3]));
    await fs.writeFile(authorized, "phase-change", "utf8");
    const entries = [{ category: "UNTRACKED", relativePath: "unrelated.bin" },
      { category: "TRACKED_UNSTAGED", relativePath: "scripts/run-split-r2-multi-scenario-validation.mjs" }];
    const first = computeSplitR2UnrelatedDirtyFingerprint(entries, root);
    const reordered = computeSplitR2UnrelatedDirtyFingerprint([...entries].reverse().map((entry) =>
      ({ ...entry, category: "DIFFERENT_STATUS" })), root);
    assert.equal(first.count, 1);
    assert.equal(first.fingerprint, reordered.fingerprint);
    await fs.writeFile(unrelated, Buffer.from([1, 2, 4]));
    const changed = computeSplitR2UnrelatedDirtyFingerprint(entries, root);
    assert.notEqual(changed.fingerprint, first.fingerprint);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("195 R2.9 abort receipt destroys metadata/HMAC and exposes no raw identifiers", async () => {
  const json = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(
    await PAGINATION_AWARE_FAILURE_PROMISE).json;
  for (const prohibited of ["synthetic-property", "synthetic-destination", "synthetic-c-", "synthetic-t-",
    "synthetic-n-", "Authorization", "nextResultsKey", "propertyFingerprint"])
    assert.equal(json.includes(prohibited), false);
  const receipt = JSON.parse(json);
  assert.deepEqual([receipt.rawIdsPersisted, receipt.rawContinuationIdsPersisted,
    receipt.rawMetadataValuesPersisted, receipt.payloadsOrRawResponsesPersisted], [0, 0, 0, 0]);
  assert.equal(receipt.ephemeralHmacSecretPersisted, false);
  assert.equal(receipt.crossRunLinkability, false);
  assert.equal(receipt.secretValuesExposed, false);
});

test("196 R2.9 full-depth and early-terminal regression fixtures remain valid", async () => {
  const full = await PAGINATION_AWARE_FULL_PROMISE;
  const early = await PAGINATION_AWARE_EARLY_PROMISE;
  assert.equal(full.totalHttpRequests, 310);
  assert.equal(full.accountingMatchesTotal, true);
  assert.equal(early.totalHttpRequests < 310, true);
  assert.equal(early.accountingMatchesTotal, true);
});

test("197 R2.9 forensic diagnosis is offline with no credential or transport surface", () => {
  const diagnosis = runSplitR2OfflineR2_9ForensicDiagnosis();
  assert.equal(diagnosis.mode, "OFFLINE_FORENSIC_DIAGNOSIS");
  assert.deepEqual([diagnosis.providerCalls, diagnosis.httpRequests, diagnosis.credentialsAccessed,
    diagnosis.liveWaveAuthorized], [0, 0, false, false]);
  assert.equal(diagnosis.historicalRecord.status, "FAIL");
});

test("198 R2.9B exact R2.9A phase is accepted without weakening the CLI contract", () => {
  const args = ["--r2-routestack-public-pagination-aware-multi-scenario", "--compact",
    "--phase=SPLIT-R2.9A", "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`];
  const parsed = parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(args);
  assert.equal(parsed.phase, "SPLIT-R2.9A");
  assert.equal(assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(
    paginationAwarePreflight({ phase: parsed.phase })).phase, "SPLIT-R2.9A");
  for (const invalid of [args.filter((entry) => !entry.startsWith("--phase=")),
    args.map((entry) => entry === "--phase=SPLIT-R2.9A" ? "--phase=split-r2.9a" : entry),
    args.map((entry) => entry === "--phase=SPLIT-R2.9A" ? "--phase=SPLIT-R2.9" : entry)]) {
    assert.throws(() => parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(invalid),
      /cli-contract-invalid/);
  }
});

test("199 R2.9B historical R2.8A phase remains exact and credentials alone enable neither phase", () => {
  const historical = ["--r2-routestack-public-pagination-aware-multi-scenario", "--compact",
    "--phase=SPLIT-R2.8A", "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    `--expected-head=${"a".repeat(40)}`, `--expected-dirty-fingerprint=${"b".repeat(64)}`];
  assert.equal(parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(historical).phase,
    "SPLIT-R2.8A");
  let reads = 0;
  assert.throws(() => assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(
    paginationAwarePreflight({ phase: undefined, credentialReader: () => { reads += 1; return {}; } })),
  /before-credentials/);
  assert.throws(() => assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(
    paginationAwarePreflight({ phase: "SPLIT-R2.9A", otherLiveModesSelected: 1,
      credentialReader: () => { reads += 1; return {}; } })), /before-credentials/);
  assert.equal(reads, 0);
});

test("200 R2.9B capability registry distinguishes R2.8A and R2.9A deterministically", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO,
    "EXACT_MAX_310_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_R2_9A,
    "EXACT_R2_9A_MAX_310_HTTP_D2_PARTIAL_SALVAGE_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
  assert.deepEqual(Object.keys(SPLIT_R2_LIVE_CAPABILITIES), [...Object.keys(SPLIT_R2_LIVE_CAPABILITIES)]);
});

test("201 R2.9B d2PhaseCompleted distinguishes full, empty, D1-abort and D2-abort phases", async () => {
  const [full, noD2, d1Abort, d2Abort] = await Promise.all([PAGINATION_AWARE_R2_9A_PROMISE,
    PAGINATION_AWARE_NO_D2_PROMISE, PAGINATION_AWARE_FAILURE_PROMISE, PAGINATION_AWARE_D2_FAILURE_PROMISE]);
  assert.deepEqual([full.d2PhaseStarted, full.d2PhaseCompleted], [true, true]);
  assert.deepEqual([noD2.d1PhaseCompleted, noD2.d2PhaseStarted, noD2.d2PhaseCompleted], [true, false, true]);
  assert.deepEqual([d1Abort.d1PhaseCompleted, d1Abort.d2PhaseStarted, d1Abort.d2PhaseCompleted],
    [false, false, false]);
  assert.deepEqual([d2Abort.d1PhaseCompleted, d2Abort.d2PhaseStarted, d2Abort.d2PhaseCompleted],
    [true, true, false]);
});

test("202 R2.9B receipt completeness enums preserve history and distinguish salvage coverage", async () => {
  assert.deepEqual(SPLIT_R2_PAGINATION_AWARE_RECEIPT_COMPLETENESS, [
    "COMPLETE_TECHNICAL_AND_ECONOMIC",
    "COMPLETE_TECHNICAL_INSUFFICIENT_ECONOMIC_COVERAGE",
    "PARTIAL_WAVE_ABORTED_WITH_EXPLORATORY_ECONOMICS",
    "PARTIAL_WAVE_ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMICS",
    "PARTIAL_WAVE_ABORTED_WITHOUT_EVALUABLE_BREAKPOINTS",
    "NOT_EMITTED",
  ]);
  const salvage = await PAGINATION_AWARE_FAILURE_PROMISE;
  const noEvaluable = await PAGINATION_AWARE_NO_EVALUABLE_PROMISE;
  const nonReconstructable = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt({
    sourceSha: "6".repeat(40), phase: "SPLIT-R2.9A", states: [], scenarioResults: [],
    partialScenarioResults: null, failureClassification: "SYNTHETIC_HISTORICAL_DATA_DESTROYED",
  });
  assert.equal(salvage.receiptCompleteness, "PARTIAL_WAVE_ABORTED_WITH_EXPLORATORY_ECONOMICS");
  assert.equal(noEvaluable.partialWaveAnalysis.economicallyEvaluableBreakpoints, 0);
  assert.equal(noEvaluable.receiptCompleteness, "PARTIAL_WAVE_ABORTED_WITHOUT_EVALUABLE_BREAKPOINTS");
  assert.equal(nonReconstructable.partialWaveAnalysis, null);
  assert.equal(nonReconstructable.receiptCompleteness,
    "PARTIAL_WAVE_ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMICS");
  assert.equal(buildSplitR2HistoricalR2_8AForensicRecord().receiptCompleteness,
    "PARTIAL_WAVE_ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMICS");
});

test("203 R2.9B exact-mode and abort receipts are numeric-sized, private and below 16000 bytes", async () => {
  const receipts = await Promise.all([PAGINATION_AWARE_R2_9A_PROMISE, PAGINATION_AWARE_FAILURE_PROMISE,
    PAGINATION_AWARE_NO_EVALUABLE_PROMISE]);
  const serialized = receipts.map((receipt) =>
    serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(receipt));
  assert.deepEqual(receipts.map((receipt) => receipt.phase), ["SPLIT-R2.9A", "SPLIT-R2.8A", "SPLIT-R2.9A"]);
  for (const entry of serialized) {
    const parsed = JSON.parse(entry.json);
    assert.equal(Number.isInteger(parsed.compactReceiptUtf8Bytes), true);
    assert.equal(parsed.compactReceiptUtf8Bytes, entry.byteLength);
    assert.equal(entry.byteLength < 16_000, true);
    for (const prohibited of ["synthetic-property", "synthetic-destination", "synthetic-c-",
      "synthetic-t-", "synthetic-n-", "Authorization", "nextResultsKey", "propertyFingerprint"])
      assert.equal(entry.json.includes(prohibited), false);
  }
});

test("204 R2.9B exact-mode fake preserves plan, budget ceiling, guards and economics", async () => {
  const receipt = await PAGINATION_AWARE_R2_9A_PROMISE;
  assert.equal(receipt.phase, "SPLIT-R2.9A");
  assert.deepEqual([receipt.scenarioCount, receipt.logicalSearchesPlanned, receipt.breakpointsPlanned], [3, 102, 32]);
  assert.deepEqual([receipt.authHttpRequests, receipt.destinationHttpRequests, receipt.initialHttpRequests,
    receipt.continuationD1HttpRequests, receipt.continuationD2HttpRequests, receipt.totalHttpRequests],
  [1, 3, 102, 102, 102, 310]);
  assert.equal(receipt.d3HttpRequests, 0);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.redirects, 0);
  assert.equal(SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS, 10_000);
  assert.equal(SPLIT_R2_MATERIAL_BASIS_POINTS, 1_000);
  assert.equal(receipt.publicRuntimeChanged, false);
});

test("205 R2.10 historical R2.9A.1 result is preserved without invented 4xx detail", () => {
  const record = buildSplitR2HistoricalR2_9A_1D0FailureRecord();
  assert.deepEqual([record.status, record.totalHttpRequests, record.failedDepth, record.failureHttpStatusCategory],
    ["INCONCLUSIVE", 5, "D0", "HTTP_4XX"]);
  assert.equal(record.authorizationConsumed, true);
  assert.equal(record.secondWaveExecuted, false);
  assert.equal(record.exactHttpStatusReconstructable, false);
  assert.equal(record.exactHttpStatus, "UNKNOWN_NOT_RETAINED");
  assert.equal(record.retryAfterPresent, "UNKNOWN_NOT_RETAINED");
  assert.equal(record.sanitizedProviderErrorClass, "UNKNOWN_4XX");
});

test("206 R2.10 R2.8A and R2.9A provider-bound request contracts are identical", () => {
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  assert.equal(audit.completed, true);
  assert.equal(audit.r2_8AEquivalentToR2_9A, true);
  assert.equal(audit.fingerprints.r2_8A, audit.fingerprints.r2_9A);
});

test("207 R2.10 public canary and R2.5A use the same provider-bound request contract", () => {
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  assert.equal(audit.r2_9AEquivalentToPublicCanary, true);
  assert.equal(audit.r2_9AEquivalentToR2_5A, true);
  assert.equal(new Set(Object.values(audit.fingerprints)).size, 1);
});

test("208 R2.10 phase and diagnostic fields never enter the provider request", () => {
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  assert.equal(audit.phaseLabelSentToProvider, false);
  assert.equal(audit.diagnosticFieldsSentToProvider, false);
});

test("209 R2.10 method path key schema and value types are exact", () => {
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  assert.deepEqual([audit.methodMatch, audit.pathTemplateMatch, audit.bodyKeySetMatch,
    audit.bodyValueTypesMatch], [true, true, true, true]);
});

test("210 R2.10 scenario 1 dates occupancy EUR and initial pagination state are valid", () => {
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  assert.deepEqual([audit.scenario1DatesValid, audit.scenario1OccupancyValid,
    audit.scenario1CurrencyValid, audit.initialContinuationStateValid], [true, true, true, true]);
});

test("211 R2.10 exact 400 401 403 and 404 classes are sanitized", () => {
  const values = [400, 401, 403, 404].map((statusCode) =>
    classifySplitR2RouteStackPublicHttpFailure({ statusCode }));
  assert.deepEqual(values.map((entry) => entry.httpStatusClass), [
    "HTTP_400_BAD_REQUEST", "HTTP_401_UNAUTHENTICATED", "HTTP_403_FORBIDDEN", "HTTP_404_NOT_FOUND"]);
  assert.deepEqual(values.map((entry) => entry.providerErrorEnum), [
    "REQUEST_VALIDATION_REJECTED", "AUTHENTICATION_REJECTED", "AUTHORIZATION_REJECTED",
    "ENDPOINT_OR_RESOURCE_NOT_FOUND"]);
});

test("212 R2.10 exact 409 422 and 429 classes are sanitized", () => {
  const values = [409, 422, 429].map((statusCode) =>
    classifySplitR2RouteStackPublicHttpFailure({ statusCode }));
  assert.deepEqual(values.map((entry) => entry.httpStatusClass), [
    "HTTP_409_CONFLICT", "HTTP_422_UNPROCESSABLE_ENTITY", "HTTP_429_RATE_LIMITED"]);
  assert.deepEqual(values.map((entry) => entry.providerErrorEnum), [
    "REQUEST_CONFLICT", "REQUEST_SEMANTICALLY_REJECTED", "RATE_LIMITED"]);
});

test("213 R2.10 other 4xx 5xx and network classes are deterministic", () => {
  const other = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 418 });
  const server = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 503 });
  const network = classifySplitR2RouteStackPublicHttpFailure({ networkFailure: true });
  assert.deepEqual([other.httpStatusClass, server.httpStatusClass, network.httpStatusClass],
    ["HTTP_OTHER_4XX", "HTTP_5XX", "NETWORK_TRANSPORT_FAILURE"]);
  assert.deepEqual([other.providerErrorEnum, server.providerErrorEnum, network.providerErrorEnum],
    ["UNKNOWN_4XX", "PROVIDER_SERVER_ERROR", "NETWORK_FAILURE"]);
});

test("214 R2.10 Retry-After retains presence only and provider enums remain allowlisted", () => {
  const present = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 429, retryAfterPresent: true });
  const absent = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 400 });
  assert.deepEqual([present.retryAfterPresent, absent.retryAfterPresent], ["PRESENT", "ABSENT"]);
  assert.equal(SPLIT_R2_SANITIZED_PROVIDER_ERROR_ENUMS.includes(present.providerErrorEnum), true);
  assert.equal(SPLIT_R2_SANITIZED_HTTP_STATUS_CLASSES.includes(present.httpStatusClass), true);
});

test("215 R2.10 unknown scope fails closed and global failures abort immediately", () => {
  const unknown = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 400 });
  const global = runSplitR2FakeFailureScopeControl("GLOBAL_ABORT");
  assert.equal(unknown.failureScope, "UNKNOWN_SCOPE_FAIL_CLOSED");
  assert.equal(global.failure.failureScope, "GLOBAL_FATAL_FAILURE");
  assert.equal(global.breaker.aborted, true);
  assert.equal(global.requestsAfterFailure, 0);
  assert.deepEqual(SPLIT_R2_FAILURE_SCOPES, ["GLOBAL_FATAL_FAILURE",
    "SEARCH_SCOPED_CONTINUABLE_FAILURE", "UNKNOWN_SCOPE_FAIL_CLOSED"]);
});

test("216 R2.10 search-scoped continuation requires explicit documented allowlisting", () => {
  const generic = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 422 });
  const documented = runSplitR2FakeFailureScopeControl("SEARCH_SCOPED_CONTINUATION");
  assert.equal(generic.failureScope, "UNKNOWN_SCOPE_FAIL_CLOSED");
  assert.equal(documented.failure.failureScope, "SEARCH_SCOPED_CONTINUABLE_FAILURE");
  assert.equal(documented.breaker.aborted, false);
  assert.equal(documented.independentSearchContinues, true);
});

test("217 R2.10 circuit breaker stops at three consecutive search-scoped failures", () => {
  const result = runSplitR2FakeFailureScopeControl("CIRCUIT_BREAKER");
  assert.deepEqual([result.attempts, result.breaker.consecutiveSearchScopedFailures,
    result.breaker.totalSearchScopedFailures, result.breaker.aborted], [3, 3, 3, true]);
  assert.equal(SPLIT_R2_SEARCH_FAILURE_CIRCUIT_BREAKER.maxConsecutiveSearchScopedFailures, 3);
});

test("218 R2.10 circuit breaker stops at ten total non-consecutive search failures", () => {
  const breaker = createSplitR2SearchFailureCircuitBreaker();
  for (let index = 0; index < 9; index += 1) {
    breaker.recordFailure("SEARCH_SCOPED_CONTINUABLE_FAILURE");
    breaker.recordSuccess();
  }
  assert.equal(breaker.snapshot().aborted, false);
  const final = breaker.recordFailure("SEARCH_SCOPED_CONTINUABLE_FAILURE");
  assert.deepEqual([final.totalSearchScopedFailures, final.aborted], [10, true]);
  assert.equal(SPLIT_R2_SEARCH_FAILURE_CIRCUIT_BREAKER.retryMax, 0);
});

test("219 R2.10 frozen D0 canary has exact 1 auth 3 destination 1 initial 0 continuation 5 total", () => {
  const receipt = runSplitR2FakeRouteStackPublicD0ContractCanary();
  assert.deepEqual([receipt.authHttpRequests, receipt.destinationHttpRequests, receipt.initialHttpRequests,
    receipt.continuationHttpRequests, receipt.totalHttpRequests], [1, 3, 1, 0, 5]);
  assert.deepEqual(SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_LIMITS,
    { AUTHENTICATION: 1, DESTINATION: 3, INITIAL_SEARCH: 1, CONTINUATION: 0, total: 5 });
});

test("220 R2.10 second initial and every continuation are blocked before transport", () => {
  const counter = createSplitR2RouteStackPublicD0ContractCanaryCounter();
  counter.reserve("INITIAL_SEARCH");
  assert.throws(() => counter.reserve("INITIAL_SEARCH"), /budget-exceeded-before-transport/);
  assert.throws(() => counter.reserve("CONTINUATION"), /route-forbidden-before-transport/);
});

test("221 R2.10 fake 2xx canary verifies only the D0 contract", () => {
  const receipt = runSplitR2FakeRouteStackPublicD0ContractCanary("HTTP_2XX_PROCESSABLE");
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.contractConclusion, "D0_CONTRACT_VERIFIED_HTTP_2XX_PROCESSABLE");
  assert.equal(receipt.responseProcessable, true);
  assert.equal(receipt.exactCliPhase, "SPLIT-R2.10A");
});

test("222 R2.10 fake 4xx canaries preserve exact status and sanitized conclusion", () => {
  for (const [outcome, code] of [["HTTP_400", 400], ["HTTP_401", 401], ["HTTP_403", 403],
    ["HTTP_404", 404], ["HTTP_422", 422], ["HTTP_429", 429]]) {
    const receipt = runSplitR2FakeRouteStackPublicD0ContractCanary(outcome);
    assert.equal(receipt.httpStatusCode, code);
    assert.equal(receipt.contractConclusion, "D0_CONTRACT_HTTP_4XX_REQUEST_REJECTED");
    assert.equal(receipt.responseProcessable, false);
  }
});

test("223 R2.10 fake 5xx and network canaries remain distinct", () => {
  const server = runSplitR2FakeRouteStackPublicD0ContractCanary("HTTP_5XX");
  const network = runSplitR2FakeRouteStackPublicD0ContractCanary("NETWORK_FAILURE");
  assert.equal(server.contractConclusion, "D0_CONTRACT_HTTP_5XX_PROVIDER_FAILURE");
  assert.equal(network.contractConclusion, "D0_CONTRACT_NETWORK_FAILURE");
  assert.equal(network.httpStatusCode, null);
});

test("224 R2.10 D0 canary receipt is private single-line and below 6000 bytes", () => {
  const receipt = buildSplitR2RouteStackPublicD0ContractCanaryReceipt();
  const serialized = serializeSplitR2RouteStackPublicD0ContractCanaryReceipt(receipt);
  assert.equal(receipt.receiptVersion, SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RECEIPT_VERSION);
  assert.equal(serialized.json.includes("\n"), false);
  assert.equal(serialized.byteLength < SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_MAX_UTF8_BYTES, true);
  assert.deepEqual([receipt.rawIdsPersisted, receipt.rawContinuationIdsPersisted,
    receipt.payloadsOrRawResponsesPersisted, receipt.secretValuesExposed], [0, 0, 0, false]);
  for (const prohibited of ["Authorization", "nextResultsKey", "correlationId", "token", "propertyFingerprint"])
    assert.equal(serialized.json.includes(prohibited), false);
});

test("225 R2.10B binds the D0 canary capability without executing live transport", () => {
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY,
    "EXACT_MAX_5_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
  assert.equal(runSplitR2OfflineR2_9ForensicDiagnosis().httpRequests, 0);
});

const R2_10A_EXACT_ARGS = Object.freeze([
  "--r2-routestack-public-d0-contract-canary",
  "--compact",
  "--phase=SPLIT-R2.10A",
  "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
  "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_5_HTTP",
  "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
  "--acknowledgement-read-only=I_ACKNOWLEDGE_READ_ONLY",
  "--acknowledgement-no-retry=I_ACKNOWLEDGE_NO_RETRY",
  "--acknowledgement-no-continuation=I_ACKNOWLEDGE_NO_CONTINUATION",
  "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  `--expected-head=${"a".repeat(40)}`,
  `--expected-dirty-fingerprint=${"b".repeat(64)}`,
]);

function r2_10APreflightOptions(overrides = {}) {
  return {
    mode: "ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY", phase: "SPLIT-R2.10A", compact: true,
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED", hostname: "mcp.routestack.ai",
    protocol: "https:", acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_5_HTTP",
    unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    readOnlyAcknowledgement: "I_ACKNOWLEDGE_READ_ONLY",
    noRetryAcknowledgement: "I_ACKNOWLEDGE_NO_RETRY",
    noContinuationAcknowledgement: "I_ACKNOWLEDGE_NO_CONTINUATION",
    noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
    authMax: 1, destinationMax: 3, initialSearchMax: 1, continuationMax: 0, totalMax: 5,
    retries: 0, redirects: 0, concurrency: 1, minimumIntervalMs: 1_000,
    productionFallback: false, sandboxFallback: false, liteApiFallback: false,
    otherLiveModesSelected: 0, repositoryGatePassed: true,
    plan: buildSplitR2RouteStackPublicD0ContractCanaryPlan(),
    credentialReader: () => ({ baseUrl: "https://mcp.routestack.ai",
      apiKey: "synthetic-key", apiSecret: "synthetic-secret" }),
    ...overrides,
  };
}

test("226 R2.10B exact CLI phase is case-sensitive and aliases fail closed", () => {
  const parsed = parseSplitR2RouteStackPublicD0ContractCanaryArguments([...R2_10A_EXACT_ARGS]);
  assert.equal(parsed.phase, "SPLIT-R2.10A");
  assert.throws(() => parseSplitR2RouteStackPublicD0ContractCanaryArguments(
    R2_10A_EXACT_ARGS.map((entry) => entry === "--phase=SPLIT-R2.10A" ? "--phase=split-r2.10a" : entry)
  ), /cli-contract-invalid/);
  assert.throws(() => parseSplitR2RouteStackPublicD0ContractCanaryArguments(
    R2_10A_EXACT_ARGS.map((entry) => entry === "--r2-routestack-public-d0-contract-canary"
      ? "--r2-routestack-public-canary" : entry)
  ), /cli-contract-invalid/);
});

test("227 R2.10B preflight requires every acknowledgement before credentials", () => {
  let reads = 0;
  const credentialReader = () => { reads += 1; return { baseUrl: "https://mcp.routestack.ai",
    apiKey: "synthetic-key", apiSecret: "synthetic-secret" }; };
  assert.throws(() => assertSplitR2RouteStackPublicD0ContractCanaryPreflight(
    r2_10APreflightOptions({ mode: null, credentialReader })
  ), /preflight-failed-before-credentials/);
  assert.equal(reads, 0);
  assert.throws(() => assertSplitR2RouteStackPublicD0ContractCanaryPreflight(
    r2_10APreflightOptions({ acknowledgement: null, credentialReader })
  ), /preflight-failed-before-credentials/);
  assert.equal(reads, 0);
  const result = assertSplitR2RouteStackPublicD0ContractCanaryPreflight(
    r2_10APreflightOptions({ credentialReader })
  );
  assert.equal(result.credentialsAccessed, true);
  assert.equal(reads, 1);
});

test("228 R2.10B live modes are mutually exclusive and sandbox fallback is impossible", () => {
  let reads = 0;
  const credentialReader = () => { reads += 1; return null; };
  for (const override of [{ otherLiveModesSelected: 1 }, { sandboxFallback: true },
    { productionFallback: true }, { liteApiFallback: true }]) {
    assert.throws(() => assertSplitR2RouteStackPublicD0ContractCanaryPreflight(
      r2_10APreflightOptions({ ...override, credentialReader })
    ), /preflight-failed-before-credentials/);
  }
  assert.equal(reads, 0);
});

test("229 R2.10B authoritative plan binds three destinations and only scenario-one full stay", () => {
  const plan = buildSplitR2RouteStackPublicD0ContractCanaryPlan();
  assert.equal(assertSplitR2RouteStackPublicD0ContractCanaryPlan(plan), plan);
  assert.deepEqual(plan.scenarioBindings.map((entry) => entry.scenarioOrdinal), [1, 3, 5]);
  assert.deepEqual([plan.logicalSearch.scenarioOrdinal, plan.logicalSearch.logicalSearchOrdinal,
    plan.logicalSearch.searchRole, plan.logicalSearch.breakpointOrdinal], [1, 1, "FULL_STAY", null]);
  assert.equal(plan.logicalSearch.providerBinding.request.currency, "EUR");
});

test("230 R2.10B request contract remains semantically identical across historical public modes", () => {
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  assert.deepEqual(new Set(Object.values(audit.fingerprints)), new Set([
    SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_FINGERPRINT]));
  assert.deepEqual([audit.phaseLabelSentToProvider, audit.diagnosticFieldsSentToProvider,
    audit.initialContinuationStateValid], [false, false, true]);
});

test("231 R2.10B fake 2xx result dispatch reaches exactly five HTTP and binds success receipt", async () => {
  const { receipt, transmittedRequests } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact();
  assert.deepEqual([transmittedRequests, receipt.authHttpRequests, receipt.destinationHttpRequests,
    receipt.initialHttpRequests, receipt.continuationHttpRequests, receipt.totalHttpRequests],
  [5, 1, 3, 1, 0, 5]);
  assert.deepEqual([receipt.status, receipt.responseProcessable, receipt.inventoryAvailable,
    receipt.d0ContractVerified, receipt.authorizationConsumed], ["PASS", true, true, true, false]);
  assert.equal(receipt.canaryConclusion,
    "ROUTESTACK_PUBLIC_INITIAL_D0_READ_ONLY_CONTRACT_CURRENTLY_VERIFIED");
  assert.equal(receipt.minObservedRequestIntervalMs >= 1_000, true);
});

test("232 R2.10B fake 2xx empty verifies structure without economic evidence", async () => {
  const { receipt } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact("HTTP_2XX_EMPTY");
  assert.deepEqual([receipt.status, receipt.responseProcessable, receipt.inventoryAvailable,
    receipt.rawResultCount, receipt.economicBreakpointsEvaluated, receipt.splitSavingEvaluated],
  ["PASS", true, false, 0, 0, false]);
});

test("233 R2.10B fake 2xx unprocessable remains inconclusive and stops", async () => {
  const { receipt, transmittedRequests } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact(
    "HTTP_2XX_UNPROCESSABLE");
  assert.deepEqual([transmittedRequests, receipt.status, receipt.responseProcessable,
    receipt.d0ContractVerified, receipt.secondSearchExecuted], [5, "INCONCLUSIVE", false, false, false]);
});

test("234 R2.10B granular initial HTTP classes and Retry-After are bound", async () => {
  const profiles = [["HTTP_400", 400, "HTTP_400_BAD_REQUEST"],
    ["HTTP_401", 401, "HTTP_401_UNAUTHENTICATED"], ["HTTP_403", 403, "HTTP_403_FORBIDDEN"],
    ["HTTP_404", 404, "HTTP_404_NOT_FOUND"], ["HTTP_409", 409, "HTTP_409_CONFLICT"],
    ["HTTP_422", 422, "HTTP_422_UNPROCESSABLE_ENTITY"],
    ["HTTP_429", 429, "HTTP_429_RATE_LIMITED"],
    ["HTTP_OTHER_4XX", 418, "HTTP_OTHER_4XX"], ["HTTP_5XX", 503, "HTTP_5XX"]];
  for (const [profile, code, category] of profiles) {
    const { receipt, transmittedRequests } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact(profile);
    assert.deepEqual([transmittedRequests, receipt.status, receipt.httpStatusCode,
      receipt.httpStatusClass, receipt.continuationExecuted, receipt.secondSearchExecuted],
    [5, "INCONCLUSIVE", code, category, false, false]);
    assert.equal(receipt.retryAfterPresent, profile === "HTTP_429" ? "PRESENT" : "ABSENT");
  }
});

test("235 R2.10B network failure is sanitized and never retried", async () => {
  const { receipt, transmittedRequests } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact(
    "NETWORK_FAILURE");
  assert.deepEqual([transmittedRequests, receipt.httpStatusCode, receipt.httpStatusClass,
    receipt.failureScope, receipt.retries, receipt.totalHttpRequests],
  [5, null, "NETWORK_TRANSPORT_FAILURE", "GLOBAL_FATAL_FAILURE", 0, 5]);
});

test("236 R2.10B auth and each destination failure stop immediately below the ceiling", async () => {
  for (const [profile, expected] of [["AUTH_401", 1], ["DESTINATION_1_404", 2],
    ["DESTINATION_2_404", 3], ["DESTINATION_3_404", 4]]) {
    const { receipt, transmittedRequests } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact(profile);
    assert.equal(transmittedRequests, expected);
    assert.equal(receipt.totalHttpRequests, expected);
    assert.equal(receipt.initialHttpRequests, 0);
    assert.equal(receipt.status, "INCONCLUSIVE");
  }
});

test("237 R2.10B counter blocks second auth fourth destination second search continuation and sixth total", () => {
  const counter = createSplitR2RouteStackPublicD0ContractCanaryCounter();
  counter.reserve("AUTHENTICATION");
  assert.throws(() => counter.reserve("AUTHENTICATION"), /budget-exceeded-before-transport/);
  counter.reserve("DESTINATION"); counter.reserve("DESTINATION"); counter.reserve("DESTINATION");
  assert.throws(() => counter.reserve("DESTINATION"), /budget-exceeded-before-transport/);
  counter.reserve("INITIAL_SEARCH");
  assert.throws(() => counter.reserve("INITIAL_SEARCH"), /budget-exceeded-before-transport/);
  assert.throws(() => counter.reserve("CONTINUATION"), /route-forbidden-before-transport/);
  assert.deepEqual([counter.snapshot().total, counter.snapshot().retries,
    counter.snapshot().redirects], [5, 0, 0]);
});

test("238 R2.10B success and failure receipts are deterministic private and below 6000 bytes", async () => {
  const success = (await runSplitR2FakeRouteStackPublicD0ContractCanaryExact()).receipt;
  const failure = (await runSplitR2FakeRouteStackPublicD0ContractCanaryExact("HTTP_429")).receipt;
  for (const receipt of [success, failure]) {
    const first = serializeSplitR2RouteStackPublicD0ContractCanaryReceipt(receipt);
    const second = serializeSplitR2RouteStackPublicD0ContractCanaryReceipt(receipt);
    assert.deepEqual(first, second);
    assert.equal(first.byteLength < SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_MAX_UTF8_BYTES, true);
    assert.equal(first.json.includes("\n"), false);
    for (const prohibited of ["Authorization", "nextResultsKey", "correlationId",
      "synthetic-property", "synthetic-destination", "synthetic-secret", "synthetic-key"])
      assert.equal(first.json.includes(prohibited), false);
    assert.deepEqual([receipt.rawIdsPersisted, receipt.rawContinuationIdsPersisted,
      receipt.rawMetadataValuesPersisted, receipt.payloadsOrRawResponsesPersisted,
      receipt.secretValuesExposed, receipt.crossRunLinkability], [0, 0, 0, 0, false, false]);
  }
});

test("239 R2.10B capability registry remains exact deterministic and duplicate-free", () => {
  const keys = Object.keys(SPLIT_R2_LIVE_CAPABILITIES);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(keys, Object.keys(SPLIT_R2_LIVE_CAPABILITIES));
  assert.equal(SPLIT_R2_LIVE_CAPABILITIES.ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY,
    "EXACT_MAX_5_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED");
});

test("240 R2.10B keeps public runtime unchanged and fake authorization unconsumed", async () => {
  const { receipt } = await runSplitR2FakeRouteStackPublicD0ContractCanaryExact();
  assert.deepEqual([receipt.publicRuntimeChanged, receipt.productionBookingAuthorized,
    receipt.authorizationConsumed, receipt.secondLiveWaveExecuted], [false, false, false, false]);
});
