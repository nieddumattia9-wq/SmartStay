import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1,
  SPLIT_F0_SCENARIO_MATRIX_VERSION_V1,
  SPLIT_F0_SUPPORTED_DURATIONS_V1,
  analyzeSplitF0CrossCaptureStabilityV1,
  buildSplitF0SegmentsV1,
  classifySplitF0OfferComparabilityV1,
  evaluateSplitF0EconomicOpportunityV1,
  selectSplitF0FixedSingleBaselineV1,
  splitF0MinorUnitsToMoneyV1,
  splitF0MoneyToMinorUnitsV1,
  validateSplitF0ScenarioV1,
  type SplitF0OfferSnapshotV1,
  type SplitF0ComparabilityIssueV1,
  type SplitF0ScenarioMatrixV1,
  type SplitF0ScenarioV1,
  type SplitF0SegmentV1,
} from "../../src/engine-v3/evaluation/splitF0EconomicFeasibilityPilotV3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/split-f0-scenario-matrix-v1.json"
);

function loadFixture(): SplitF0ScenarioMatrixV1 {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as SplitF0ScenarioMatrixV1;
}

function createOffer(
  scenario: SplitF0ScenarioV1,
  period: Pick<SplitF0SegmentV1, "checkIn" | "checkOut" | "nights">,
  offerSnapshotId: string,
  propertyId: string,
  totalCost: number,
  overrides: Partial<SplitF0OfferSnapshotV1> = {}
): SplitF0OfferSnapshotV1 {
  return {
    offerSnapshotId,
    propertyId,
    checkIn: period.checkIn,
    checkOut: period.checkOut,
    nights: period.nights,
    occupancy: scenario.occupancy,
    currency: scenario.currency,
    totalCost,
    totalCostCompleteness: "complete",
    taxes: "included",
    mandatoryCosts: "included",
    boardClass: "breakfast-included",
    cancellationClass: "fully-refundable",
    paymentTiming: "pay-later",
    roomClass: "standard",
    rating: scenario.constraints.minimumRating + 0.4,
    reviewCount: scenario.constraints.minimumReviewCount + 50,
    distanceKm: scenario.constraints.maximumDistanceKm - 0.5,
    bookable: true,
    freshness: "fresh",
    provenance: {
      sourceKind: "synthetic-contract-fixture",
      captureId: `${offerSnapshotId}-capture`,
      observedAt: "2026-08-24T12:00:00.000Z",
      contentDigest: `sha256:${"a".repeat(64)}`,
    },
    ...overrides,
  };
}

function comparableSetup() {
  const scenario = loadFixture().scenarios[0];
  assert.ok(scenario);
  const segments = buildSplitF0SegmentsV1(
    scenario,
    scenario.splitPoints[0].splitPointId
  );
  return {
    scenario,
    segments,
    single: createOffer(scenario, scenario, "offer-single", "hotel-single", 500),
    first: createOffer(scenario, segments[0], "offer-first", "hotel-first", 200),
    second: createOffer(scenario, segments[1], "offer-second", "hotel-second", 220),
  };
}

test("the frozen calibration matrix has eight deterministic scenarios", () => {
  const source = readFileSync(fixturePath, "utf8");
  const fixture = loadFixture();
  assert.equal(fixture.schemaVersion, SPLIT_F0_SCENARIO_MATRIX_VERSION_V1);
  assert.equal(fixture.scenarios.length, 8);
  assert.deepEqual(
    fixture.scenarios.map((scenario) => scenario.nights),
    [...SPLIT_F0_SUPPORTED_DURATIONS_V1]
  );
  assert.equal(new Set(fixture.scenarios.map((item) => item.destination.canonicalId)).size, 8);
  assert.equal(
    new Set(fixture.scenarios.map((item) => JSON.stringify(item.occupancy))).size,
    2
  );
  assert.equal(fixture.scenarios.filter((item) => item.occupancy.adults === 2).length, 6);
  assert.equal(
    JSON.stringify(JSON.parse(source)),
    JSON.stringify(JSON.parse(readFileSync(fixturePath, "utf8")))
  );
  assert.equal(fixture.networkRequired, false);
  assert.equal(fixture.prebookAllowed, false);
  assert.equal(fixture.bookingAllowed, false);
  assert.equal(fixture.paymentAllowed, false);
  assert.equal(fixture.publicV2Changed, false);
  assert.equal(fixture.publicV3Enabled, false);
  assert.equal(fixture.publicSplitEnabled, false);
});

test("every scenario validates and both split points fully cover the stay", () => {
  for (const scenario of loadFixture().scenarios) {
    assert.deepEqual(validateSplitF0ScenarioV1(scenario), { valid: true, issues: [] });
    assert.equal(scenario.splitPoints.length, 2);
    for (const splitPoint of scenario.splitPoints) {
      const segments = buildSplitF0SegmentsV1(scenario, splitPoint.splitPointId);
      assert.equal(segments.length, 2);
      assert.equal(segments[0].checkIn, scenario.checkIn);
      assert.equal(segments[0].checkOut, segments[1].checkIn);
      assert.equal(segments[1].checkOut, scenario.checkOut);
      assert.ok(segments[0].nights >= 2);
      assert.ok(segments[1].nights >= 2);
      assert.equal(segments[0].nights + segments[1].nights, scenario.nights);
      assert.deepEqual(segments[0].occupancy, scenario.occupancy);
      assert.deepEqual(segments[1].occupancy, scenario.occupancy);
    }
  }
});

test("comparability admits a complete matching bucket", () => {
  const { scenario, segments, single, first, second } = comparableSetup();
  const result = classifySplitF0OfferComparabilityV1(
    scenario,
    segments,
    single,
    [first, second]
  );
  assert.equal(result.comparable, true);
  assert.equal(result.comparabilityLevel, "STRICT_COMPARABLE");
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.evidenceLimits, []);
  assert.deepEqual(result.knownIncompatibilities, []);
  assert.equal(result.bucket?.currency, "EUR");
  assert.equal(result.bucket?.boardClass, "breakfast-included");
  assert.equal(result.bucket?.cancellationClass, "fully-refundable");
  assert.equal(result.bucket?.paymentTiming, "pay-later");
});

test("comparability fails closed for each material incompatibility", () => {
  const { scenario, segments, single, first, second } = comparableSetup();
  const cases: Array<{
    issue: SplitF0ComparabilityIssueV1;
    first?: Partial<SplitF0OfferSnapshotV1>;
    second?: Partial<SplitF0OfferSnapshotV1>;
  }> = [
    { issue: "duplicate-hotel", second: { propertyId: first.propertyId } },
    { issue: "currency-mismatch", first: { currency: "USD" } },
    { issue: "unknown-taxes-or-mandatory-costs", first: { taxes: "unknown" } },
    {
      issue: "occupancy-mismatch",
      first: { occupancy: { adults: 1, childAges: [], rooms: 1, pets: 0 } },
    },
    { issue: "board-incompatible", first: { boardClass: "room-only" } },
    {
      issue: "cancellation-incompatible",
      first: { cancellationClass: "non-refundable" },
    },
    { issue: "payment-incompatible", first: { paymentTiming: "pay-now" } },
    { issue: "room-class-incompatible", first: { roomClass: "other" } },
    { issue: "room-class-incompatible", first: { roomClass: "unknown" } },
    { issue: "quality-floor-not-met", first: { rating: 1 } },
    { issue: "review-evidence-floor-not-met", first: { reviewCount: 0 } },
    {
      issue: "location-constraint-not-met",
      first: { distanceKm: scenario.constraints.maximumDistanceKm + 1 },
    },
    { issue: "rate-stale-or-unknown", first: { freshness: "stale" } },
    { issue: "offer-not-bookable", first: { bookable: false } },
    { issue: "total-cost-incomplete", first: { totalCostCompleteness: "incomplete" } },
    { issue: "split-period-invalid", first: { checkOut: scenario.checkOut } },
  ];
  for (const current of cases) {
    const classified = classifySplitF0OfferComparabilityV1(
      scenario,
      segments,
      single,
      [
        { ...first, ...current.first },
        { ...second, ...current.second },
      ]
    );
    assert.equal(classified.comparable, false, current.issue);
    assert.equal(classified.comparabilityLevel, "NON_COMPARABLE", current.issue);
    assert.equal(classified.issues.includes(current.issue), true, current.issue);
    assert.equal(
      classified.knownIncompatibilities.includes(current.issue),
      true,
      current.issue
    );
  }
});

test("payment evidence distinguishes strict, conditional and demonstrated incompatibility", () => {
  const { scenario, segments, single, first, second } = comparableSetup();
  const strict = classifySplitF0OfferComparabilityV1(
    scenario,
    segments,
    single,
    [first, second]
  );
  assert.equal(strict.comparabilityLevel, "STRICT_COMPARABLE");

  const allUnknown = classifySplitF0OfferComparabilityV1(
    scenario,
    segments,
    { ...single, paymentTiming: "unknown" },
    [
      { ...first, paymentTiming: "unknown" },
      { ...second, paymentTiming: "unknown" },
    ]
  );
  assert.equal(allUnknown.comparable, true);
  assert.equal(allUnknown.comparabilityLevel, "CONDITIONAL_COMPARABLE");
  assert.deepEqual(allUnknown.evidenceLimits, ["payment-timing-unknown"]);
  assert.deepEqual(allUnknown.knownIncompatibilities, []);

  const knownUnknown = classifySplitF0OfferComparabilityV1(
    scenario,
    segments,
    single,
    [
      { ...first, paymentTiming: "unknown" },
      { ...second, paymentTiming: "unknown" },
    ]
  );
  assert.equal(knownUnknown.comparable, true);
  assert.equal(knownUnknown.comparabilityLevel, "CONDITIONAL_COMPARABLE");
  assert.deepEqual(knownUnknown.evidenceLimits, ["payment-timing-known-unknown"]);

  const knownDifferent = classifySplitF0OfferComparabilityV1(
    scenario,
    segments,
    single,
    [{ ...first, paymentTiming: "pay-now" }, second]
  );
  assert.equal(knownDifferent.comparable, false);
  assert.equal(knownDifferent.comparabilityLevel, "NON_COMPARABLE");
  assert.deepEqual(knownDifferent.knownIncompatibilities, ["payment-incompatible"]);
});

test("evaluation uses the cheapest comparable single and exact gross metrics", () => {
  const { scenario, single, first, second } = comparableSetup();
  const moreExpensiveSingle = createOffer(
    scenario,
    scenario,
    "offer-single-expensive",
    "hotel-single-expensive",
    550
  );
  const result = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [moreExpensiveSingle, single],
    firstSegmentOffers: [first],
    secondSegmentOffers: [second],
  });
  assert.equal(result.technicalValidity, true);
  assert.equal(result.comparability, "COMPARABLE");
  assert.equal(result.comparabilityLevel, "STRICT_COMPARABLE");
  assert.equal(result.singleOfferSnapshotId, single.offerSnapshotId);
  assert.equal(result.singleTotal, 500);
  assert.equal(result.splitTotal, 420);
  assert.equal(result.grossSavingAmount, 80);
  assert.equal(result.grossSavingRatio, 0.16);
  assert.equal(result.economicSignal, "POSITIVE_50_TO_149");
  assert.deepEqual(
    result.frictionSensitivity,
    [
      [0, 80],
      [25, 55],
      [50, 30],
      [75, 5],
      [100, -20],
      [150, -70],
    ].map(([hypotheticalFrictionEur, netSavingAtFriction]) => {
      const netSavingAtFrictionMinorUnits =
        splitF0MoneyToMinorUnitsV1(80) -
        splitF0MoneyToMinorUnitsV1(hypotheticalFrictionEur);
      return {
        hypotheticalFrictionEur,
        netSavingAtFriction,
        netSavingAtFrictionMinorUnits,
        netSavingAtFrictionFormatted: splitF0MinorUnitsToMoneyV1(
          netSavingAtFrictionMinorUnits
        ),
      };
    })
  );
  assert.equal(result.publicRecommendationProduced, false);
});

test("conditional comparisons retain economic analysis without policy or public eligibility", () => {
  const { scenario, single, first, second } = comparableSetup();
  const result = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [{ ...single, paymentTiming: "unknown" }],
    firstSegmentOffers: [{ ...first, paymentTiming: "unknown" }],
    secondSegmentOffers: [{ ...second, paymentTiming: "unknown" }],
  });
  assert.equal(result.comparability, "COMPARABLE");
  assert.equal(result.comparabilityLevel, "CONDITIONAL_COMPARABLE");
  assert.equal(result.grossSavingAmount, 80);
  assert.equal(result.evidenceLimits.includes("payment-timing-unknown"), true);
  assert.deepEqual(result.knownIncompatibilities, []);
  assert.equal(result.publicRecommendationProduced, false);
});

test("all economic signal classes and friction thresholds are deterministic", () => {
  const { scenario, single, first, second } = comparableSetup();
  const cases = [
    { splitTotal: 500, expected: "NO_GROSS_SAVING" },
    { splitTotal: 499, expected: "POSITIVE_BELOW_50" },
    { splitTotal: 450, expected: "POSITIVE_50_TO_149" },
    { splitTotal: 350, expected: "POSITIVE_150_TO_299" },
    { splitTotal: 200, expected: "POSITIVE_300_PLUS" },
  ] as const;
  for (const current of cases) {
    const firstCost = current.splitTotal / 2;
    const result = evaluateSplitF0EconomicOpportunityV1({
      scenario,
      splitPointId: scenario.splitPoints[0].splitPointId,
      singleStayOffers: [single],
      firstSegmentOffers: [{ ...first, totalCost: firstCost }],
      secondSegmentOffers: [{ ...second, totalCost: current.splitTotal - firstCost }],
    });
    assert.equal(result.economicSignal, current.expected);
    assert.deepEqual(
      result.frictionSensitivity.map((item) => item.hypotheticalFrictionEur),
      [...SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1]
    );
  }
  const noData = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [single],
    firstSegmentOffers: [{ ...first, currency: "USD" }],
    secondSegmentOffers: [second],
  });
  assert.equal(noData.economicSignal, "NO_COMPARABLE_DATA");
  assert.equal(noData.technicalValidity, true);
});

test("one fixed best single is selected before Split and cannot be replaced by a costlier matching bucket", () => {
  const scenario = loadFixture().scenarios[0];
  assert.ok(scenario);
  const fixedSingle = createOffer(
    scenario,
    scenario,
    "offer-fixed-best",
    "hotel-fixed-best",
    100,
    {
      boardClass: "room-only",
      cancellationClass: "non-refundable",
      roomClass: "standard",
    }
  );
  const diagnosticSingle = createOffer(
    scenario,
    scenario,
    "offer-diagnostic-expensive",
    "hotel-diagnostic-expensive",
    1_000,
    {
      boardClass: "breakfast-included",
      cancellationClass: "fully-refundable",
      roomClass: "suite",
    }
  );
  assert.equal(
    selectSplitF0FixedSingleBaselineV1(
      scenario,
      [diagnosticSingle, fixedSingle]
    )?.offerSnapshotId,
    fixedSingle.offerSnapshotId
  );
  const halfSegments = buildSplitF0SegmentsV1(
    scenario,
    scenario.splitPoints[0].splitPointId
  );
  const half = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [diagnosticSingle, fixedSingle],
    fixedSingleBaseline: fixedSingle,
    firstSegmentOffers: [
      createOffer(
        scenario,
        halfSegments[0],
        "offer-half-a",
        "hotel-half-a",
        200,
        { roomClass: "suite" }
      ),
    ],
    secondSegmentOffers: [
      createOffer(
        scenario,
        halfSegments[1],
        "offer-half-b",
        "hotel-half-b",
        200,
        { roomClass: "suite" }
      ),
    ],
  });
  assert.equal(half.fixedBaseline?.offerSnapshotId, fixedSingle.offerSnapshotId);
  assert.equal(half.singleTotal, 100);
  assert.equal(half.comparability, "NO_COMPARABLE_DATA");
  assert.equal(
    half.issues.includes("NO_COMPARABLE_SPLIT_FOR_FIXED_BASELINE"),
    true
  );
  assert.equal(half.grossSavingAmount, null);
  assert.equal(half.matchedBucketDiagnostic?.singleTotal, 1_000);
  assert.equal(half.matchedBucketDiagnostic?.grossSavingAmount, 600);

  const altSegments = buildSplitF0SegmentsV1(
    scenario,
    scenario.splitPoints[1].splitPointId
  );
  const alt = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[1].splitPointId,
    singleStayOffers: [diagnosticSingle, fixedSingle],
    fixedSingleBaseline: fixedSingle,
    firstSegmentOffers: [
      createOffer(
        scenario,
        altSegments[0],
        "offer-alt-a",
        "hotel-alt-a",
        40,
        {
          boardClass: "room-only",
          cancellationClass: "non-refundable",
          roomClass: "standard",
        }
      ),
    ],
    secondSegmentOffers: [
      createOffer(
        scenario,
        altSegments[1],
        "offer-alt-b",
        "hotel-alt-b",
        40,
        {
          boardClass: "room-only",
          cancellationClass: "non-refundable",
          roomClass: "standard",
        }
      ),
    ],
  });
  assert.equal(alt.fixedBaseline?.offerSnapshotId, fixedSingle.offerSnapshotId);
  assert.equal(alt.singleTotal, 100);
  assert.equal(alt.grossSavingAmount, 20);
  assert.equal(alt.baselineSelectionMode, "PRIMARY_FIXED_BEST_SINGLE");
});

test("money uses integer minor units and rejects unsupported precision", () => {
  assert.equal(
    splitF0MoneyToMinorUnitsV1(0.1) +
      splitF0MoneyToMinorUnitsV1(0.2),
    30
  );
  assert.equal(splitF0MinorUnitsToMoneyV1(30), "0.30");
  assert.equal(splitF0MinorUnitsToMoneyV1(-5), "-0.05");
  assert.equal(splitF0MoneyToMinorUnitsV1(26_845.72), 2_684_572);
  assert.equal(splitF0MoneyToMinorUnitsV1(0), 0);
  assert.throws(
    () => splitF0MoneyToMinorUnitsV1(1.001),
    /precision-unsupported/
  );
  assert.throws(() => splitF0MoneyToMinorUnitsV1(Number.POSITIVE_INFINITY));

  const { scenario, single, first, second } = comparableSetup();
  const exact = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [{ ...single, totalCost: 0.3 }],
    firstSegmentOffers: [{ ...first, totalCost: 0.1 }],
    secondSegmentOffers: [{ ...second, totalCost: 0.2 }],
  });
  assert.equal(exact.singleTotalMinorUnits, 30);
  assert.equal(exact.splitTotalMinorUnits, 30);
  assert.equal(exact.grossSavingMinorUnits, 0);
  assert.equal(exact.splitTotalFormatted, "0.30");
  assert.equal(exact.grossSavingAmountFormatted, "0.00");
});

test("matched-bucket price and ratio outliers remain visible but outside the primary headline", () => {
  const scenario = loadFixture().scenarios[0];
  assert.ok(scenario);
  const fixedSingle = createOffer(
    scenario,
    scenario,
    "offer-fixed-low",
    "hotel-fixed-low",
    100,
    {
      boardClass: "room-only",
      cancellationClass: "non-refundable",
    }
  );
  const ordinarySingles = Array.from({ length: 8 }, (_, index) =>
    createOffer(
      scenario,
      scenario,
      `offer-ordinary-${index}`,
      `hotel-ordinary-${index}`,
      110 + index * 10,
      {
        boardClass: "room-only",
        cancellationClass: "non-refundable",
      }
    )
  );
  const outlierSingle = createOffer(
    scenario,
    scenario,
    "offer-outlier-single",
    "hotel-outlier-single",
    10_000,
    { roomClass: "suite" }
  );
  const segments = buildSplitF0SegmentsV1(
    scenario,
    scenario.splitPoints[0].splitPointId
  );
  const result = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [outlierSingle, ...ordinarySingles, fixedSingle],
    fixedSingleBaseline: fixedSingle,
    firstSegmentOffers: [
      createOffer(
        scenario,
        segments[0],
        "offer-outlier-a",
        "hotel-outlier-a",
        1_000,
        { roomClass: "suite" }
      ),
    ],
    secondSegmentOffers: [
      createOffer(
        scenario,
        segments[1],
        "offer-outlier-b",
        "hotel-outlier-b",
        1_000,
        { roomClass: "suite" }
      ),
    ],
  });
  assert.equal(result.grossSavingAmount, null);
  assert.equal(result.matchedBucketDiagnostic?.grossSavingAmount, 8_000);
  assert.deepEqual(
    result.matchedBucketDiagnostic?.outlierAssessment.flags,
    ["PRICE_LEVEL_OUTLIER", "SAVING_RATIO_OUTLIER"]
  );
  assert.equal(
    result.matchedBucketDiagnostic?.outlierAssessment.classification,
    "MULTIPLE_FLAGS"
  );
  assert.equal(
    result.matchedBucketDiagnostic?.outlierAssessment
      .productionReconfirmationRequired,
    true
  );
});

test("cross-capture instability quarantines material ratio and absolute changes deterministically", () => {
  const { scenario, single, first, second } = comparableSetup();
  const firstCapture = evaluateSplitF0EconomicOpportunityV1({
    scenario,
    splitPointId: scenario.splitPoints[0].splitPointId,
    singleStayOffers: [single],
    firstSegmentOffers: [first],
    secondSegmentOffers: [second],
  });
  const secondCapture = structuredClone(firstCapture);
  secondCapture.splitTotal = 200;
  secondCapture.splitTotalMinorUnits = 20_000;
  secondCapture.splitTotalFormatted = "200.00";
  secondCapture.grossSavingAmount = 300;
  secondCapture.grossSavingMinorUnits = 30_000;
  secondCapture.grossSavingAmountFormatted = "300.00";
  const analysis = analyzeSplitF0CrossCaptureStabilityV1(
    [firstCapture],
    [secondCapture]
  );
  assert.deepEqual(analysis.unstableScenarioIds, [scenario.scenarioId]);
  assert.equal(analysis.comparisons[0]?.baselineStable, true);
  assert.equal(analysis.comparisons[0]?.splitStable, false);
  assert.equal(analysis.comparisons[0]?.savingStable, false);
  assert.equal(
    analysis.comparisons[0]?.flags.includes("CROSS_CAPTURE_INSTABILITY"),
    true
  );
  assert.equal(analysis.capture1Summary.robustMaximumSaving, null);
  assert.equal(analysis.capture2Summary.robustMaximumSaving, null);
});

test("the Split F0 contract is private, provider-neutral and absent from boundaries", () => {
  const modulePath = resolve(
    process.cwd(),
    "src/engine-v3/evaluation/splitF0EconomicFeasibilityPilotV3.ts"
  );
  const moduleSource = readFileSync(modulePath, "utf8");
  assert.equal(/^\s*import\s/m.test(moduleSource), false);
  for (const forbidden of [
    "server/",
    "frontend",
    "orchestrator",
    "personalUtilityRolePolicyV3",
    "liteApi",
    "commission",
    "markup",
  ]) {
    assert.equal(moduleSource.includes(forbidden), false, forbidden);
  }
  const boundaryFiles = [
    "src/engine-v3/index.ts",
    "src/engine-v3/orchestrator/independentDecisionEngineV3.ts",
    "src/engine-v2/orchestrator/smartStayEngineV2.ts",
    "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
    "server/server.js",
  ];
  for (const relativePath of boundaryFiles) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    assert.equal(source.includes("splitF0EconomicFeasibilityPilotV3"), false, relativePath);
    assert.equal(source.includes("split-f0-scenario-matrix-v1"), false, relativePath);
  }
});
