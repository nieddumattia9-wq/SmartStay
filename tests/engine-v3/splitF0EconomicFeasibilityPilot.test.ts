import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1,
  SPLIT_F0_SCENARIO_MATRIX_VERSION_V1,
  SPLIT_F0_SUPPORTED_DURATIONS_V1,
  buildSplitF0SegmentsV1,
  classifySplitF0OfferComparabilityV1,
  evaluateSplitF0EconomicOpportunityV1,
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
  assert.deepEqual(result.issues, []);
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
    assert.equal(classified.issues.includes(current.issue), true, current.issue);
  }
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
    ].map(([hypotheticalFrictionEur, netSavingAtFriction]) => ({
      hypotheticalFrictionEur,
      netSavingAtFriction,
    }))
  );
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
