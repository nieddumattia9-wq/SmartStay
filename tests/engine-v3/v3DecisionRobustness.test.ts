import assert from "node:assert/strict";
import test from "node:test";

import {
  createStayOfferIntegritySnapshotV3,
  evaluateDecisionGeometryV3,
  evaluateDecisionRobustnessV3,
  evaluatePeerIntelligenceV3,
  evaluatePersonalUtilityV3,
  validateDecisionRobustnessV3,
  type CreateStayOfferIntegritySnapshotInputV3,
  type StayOptiConstraintRelaxationCandidateV3,
  type StayOptiGeometryBenefitDimensionV3,
  type StayOptiPeerCandidateV3,
  type StayOptiPreferenceResolutionV3,
  type StayOptiUtilityDimensionInputV3,
  type StayOptiUtilityDimensionV3,
} from "../../src/engine-v3";

const UTILITY_DIMENSIONS: readonly StayOptiUtilityDimensionV3[] = [
  "priceValue",
  "quality",
  "location",
  "comfort",
  "flexibility",
  "categoryFit",
  "userFit",
];

const DECLARED_BALANCED: StayOptiPreferenceResolutionV3 = {
  declaredPreferenceId: "balanced",
  inferredPreferenceId: null,
  resolvedPreferenceId: "balanced",
  origin: "declared",
  reasonCodes: ["preference:declared"],
};

type CandidateSpec = {
  id: string;
  cost: number;
  benefitBase: number;
  benefits?: Partial<Record<StayOptiGeometryBenefitDimensionV3, number | null>>;
  budget?: number;
  confidence?: number;
  eligible?: boolean;
  sourceRiskScore?: number | null;
  sourceRiskLevel?: "low" | "medium" | "high" | null;
  refundable?: boolean | null;
  taxesIncluded?: boolean | null;
  freshness?: "fresh" | "stale" | "unknown";
  snapshotMissing?: boolean;
};

function createDimensions(spec: CandidateSpec) {
  return Object.fromEntries(
    UTILITY_DIMENSIONS.map((dimension): [StayOptiUtilityDimensionV3, StayOptiUtilityDimensionInputV3] => {
      const score = dimension === "priceValue"
        ? 70
        : spec.benefits?.[dimension] === undefined
          ? spec.benefitBase
          : spec.benefits[dimension] ?? null;
      return [
        dimension,
        {
          score,
          confidence: spec.confidence ?? 0.95,
          evidenceIds: [`${spec.id}-${dimension}`],
        },
      ];
    })
  ) as Record<StayOptiUtilityDimensionV3, StayOptiUtilityDimensionInputV3>;
}

function createSnapshotInput(spec: CandidateSpec): CreateStayOfferIntegritySnapshotInputV3 {
  const taxesIncluded = spec.taxesIncluded === undefined ? true : spec.taxesIncluded;
  return {
    hotelId: spec.id,
    offerId: `offer:${spec.id}`,
    scope: {
      checkIn: "2026-10-10",
      checkOut: "2026-10-14",
      nights: 4,
      adults: 2,
      children: 0,
      rooms: 1,
    },
    roomName: "Double room",
    mealPlan: "Breakfast included",
    cancellation: {
      refundable: spec.refundable === undefined ? true : spec.refundable,
      freeCancellationUntil: spec.refundable === false ? null : "2026-10-08",
      penaltyAmount: spec.refundable === false ? spec.cost : 0,
      penaltyCurrency: "EUR",
      policyKnown: spec.refundable !== null,
    },
    payment: {
      timing: "pay-now",
      state: "known",
    },
    cost: {
      amount: spec.cost,
      currency: "EUR",
      completeness: taxesIncluded === null
        ? "reported-tax-status-unknown"
        : "reported-complete",
      taxesIncluded,
      includedTaxes: taxesIncluded === true ? 40 : 0,
      excludedTaxes: taxesIncluded === false ? 40 : 0,
      unknownTaxes: taxesIncluded === null ? 40 : 0,
      feeAmount: 0,
      feeState: "not-applicable",
    },
    bookable: true,
    recheckRequired: false,
    observedAt: "2026-08-14T02:00:00.000Z",
    freshness: spec.freshness ?? "fresh",
    evidenceIds: [`${spec.id}-offer-evidence`],
  };
}

function createPeerCandidate(spec: CandidateSpec): StayOptiPeerCandidateV3 {
  return {
    hotelId: spec.id,
    scopeFingerprint: "robustness-scope",
    destinationKey: "rome",
    category: "hotel",
    unitType: "hotel-room",
    roomName: "Double room",
    mealPlan: "Breakfast included",
    refundable: spec.refundable === undefined ? true : spec.refundable,
    totalCost: spec.cost,
    currency: "EUR",
    qualityScore: spec.benefitBase,
    distanceKm: 1,
    eligible: spec.eligible ?? true,
    evidenceIds: [`${spec.id}-peer-evidence`],
  };
}

function createEvaluation(
  specs: CandidateSpec[],
  options: {
    anchorHotelId?: string | null;
    relaxations?: StayOptiConstraintRelaxationCandidateV3[];
  } = {}
) {
  const snapshots = new Map(
    specs.map((spec) => [
      spec.id,
      spec.snapshotMissing
        ? null
        : createStayOfferIntegritySnapshotV3(createSnapshotInput(spec)),
    ] as const)
  );
  const assignments = evaluatePeerIntelligenceV3(specs.map(createPeerCandidate));
  const assignmentByHotelId = new Map(
    assignments.map((assignment) => [assignment.hotelId, assignment] as const)
  );
  const utilities = specs.map((spec) => evaluatePersonalUtilityV3({
    hotelId: spec.id,
    preference: DECLARED_BALANCED,
    context: {
      totalBudget: spec.budget ?? 1000,
      totalCost: spec.cost,
      nights: 4,
      adults: 2,
      children: 0,
      rooms: 1,
      maximumDistanceKm: 3,
      leadTimeDays: 30,
      tripType: "leisure",
    },
    dimensions: createDimensions(spec),
  }));
  const utilityByHotelId = new Map(
    utilities.map((utility) => [utility.hotelId, utility] as const)
  );
  const geometry = evaluateDecisionGeometryV3(specs.map((spec) => {
    const utility = utilityByHotelId.get(spec.id);
    const peerAssignment = assignmentByHotelId.get(spec.id);
    assert.ok(utility);
    assert.ok(peerAssignment);
    const snapshot = snapshots.get(spec.id) ?? null;
    return {
      hotelId: spec.id,
      solutionId: `solution:${spec.id}`,
      eligible: spec.eligible ?? true,
      totalCost: snapshot?.cost.total.amount ?? spec.cost,
      currency: "EUR",
      costIntegrityStatus: snapshot?.cost.integrityStatus ?? "incomplete",
      utility,
      peerAssignment,
    };
  }));
  const geometryByHotelId = new Map(
    geometry.candidates.map((candidate) => [candidate.hotelId, candidate] as const)
  );

  return evaluateDecisionRobustnessV3({
    candidates: specs.map((spec) => {
      const utility = utilityByHotelId.get(spec.id);
      const geometryCandidate = geometryByHotelId.get(spec.id);
      assert.ok(utility);
      assert.ok(geometryCandidate);
      return {
        hotelId: spec.id,
        solutionId: `solution:${spec.id}`,
        eligible: spec.eligible ?? true,
        utility,
        geometry: geometryCandidate,
        offerSnapshot: snapshots.get(spec.id) ?? null,
        sourceRiskScore: spec.sourceRiskScore ?? 0,
        sourceRiskLevel: spec.sourceRiskLevel ?? "low",
      };
    }),
    decisionGeometry: geometry,
    anchorHotelId: options.anchorHotelId ?? specs[0]?.id ?? null,
    constraintRelaxations: options.relaxations ?? [],
  });
}

test("a strong low-risk choice remains recommended across deterministic sensitivity scenarios", () => {
  const evaluation = createEvaluation([
    { id: "strong", cost: 450, benefitBase: 90 },
    { id: "alternative", cost: 520, benefitBase: 70 },
  ], { anchorHotelId: "strong" });

  assert.equal(validateDecisionRobustnessV3(evaluation).valid, true);
  assert.equal(evaluation.robustChoiceHotelId, "strong");
  assert.equal(evaluation.recommendationPolicy, "recommend");
  assert.equal(evaluation.abstentionCode, null);
  assert.ok((evaluation.robustChoiceScore ?? 0) >= 70);
  assert.equal(
    evaluation.scenarios.filter((scenario) => scenario.status === "evaluated").length,
    9
  );
});

test("canonical non-refundable risk is kept separate and can change the robust choice", () => {
  const evaluation = createEvaluation([
    {
      id: "risky",
      cost: 430,
      benefitBase: 82,
      refundable: false,
      sourceRiskScore: 82,
      sourceRiskLevel: "high",
    },
    {
      id: "safer",
      cost: 450,
      benefitBase: 80,
      refundable: false,
      sourceRiskScore: 5,
      sourceRiskLevel: "low",
    },
    {
      id: "third-peer",
      cost: 480,
      benefitBase: 75,
      refundable: false,
      sourceRiskScore: 10,
      sourceRiskLevel: "low",
    },
  ], { anchorHotelId: "risky" });
  const risky = evaluation.candidates.find((candidate) => candidate.hotelId === "risky");
  const safer = evaluation.candidates.find((candidate) => candidate.hotelId === "safer");

  assert.ok(risky);
  assert.ok(safer);
  assert.ok(risky.choiceRiskScore > safer.choiceRiskScore);
  assert.ok(risky.riskSignals.some((signal) => signal.code === "pay-now-non-refundable"));
  assert.ok((risky.riskAdjustedUtility ?? 0) < (risky.utilityScore ?? 0));
  assert.equal(evaluation.robustChoiceHotelId, "safer");
});

test("practically identical options produce an honest abstention instead of false precision", () => {
  const evaluation = createEvaluation([
    { id: "tie-a", cost: 500, benefitBase: 80 },
    { id: "tie-b", cost: 500, benefitBase: 80 },
    { id: "tie-c", cost: 500, benefitBase: 80 },
  ]);

  assert.equal(evaluation.nearTie.status, "detected");
  assert.equal(evaluation.nearTie.indistinguishable, true);
  assert.equal(evaluation.recommendationPolicy, "abstain");
  assert.equal(evaluation.abstentionCode, "indistinguishable-options");
  assert.equal(evaluation.policyPreferredHotelId, null);
});

test("deliberately weak evidence triggers abstention", () => {
  const evaluation = createEvaluation([
    { id: "weak-a", cost: 500, benefitBase: 75, confidence: 0.05 },
    { id: "weak-b", cost: 540, benefitBase: 70, confidence: 0.05 },
    { id: "weak-c", cost: 580, benefitBase: 65, confidence: 0.05 },
  ]);

  assert.equal(evaluation.recommendationPolicy, "abstain");
  assert.equal(evaluation.abstentionCode, "insufficient-evidence");
});

test("one strong feasible option is not rejected merely because no direct alternative exists", () => {
  const evaluation = createEvaluation([
    { id: "only-strong", cost: 450, benefitBase: 90, confidence: 0.98 },
  ]);

  assert.equal(evaluation.robustChoiceHotelId, "only-strong");
  assert.equal(evaluation.recommendationPolicy, "recommend");
  assert.equal(evaluation.noGoodOption.status, "not-detected");
});

test("a genuinely poor high-risk set activates no-good-option detection", () => {
  const evaluation = createEvaluation([
    {
      id: "poor-a",
      cost: 1300,
      budget: 500,
      benefitBase: 10,
      sourceRiskScore: 90,
      sourceRiskLevel: "high",
      refundable: false,
    },
    {
      id: "poor-b",
      cost: 1400,
      budget: 500,
      benefitBase: 8,
      sourceRiskScore: 85,
      sourceRiskLevel: "high",
      refundable: false,
    },
  ]);

  assert.equal(evaluation.noGoodOption.status, "detected");
  assert.equal(evaluation.recommendationPolicy, "abstain");
  assert.equal(evaluation.abstentionCode, "no-good-option");
});

test("constraint relaxation selects only verified evidence-backed improvements", () => {
  const relaxations: StayOptiConstraintRelaxationCandidateV3[] = [
    {
      relaxationId: "estimated-budget",
      kind: "budget-increase",
      changeAmount: 50,
      changeUnit: "currency",
      normalizedChange: 0.1,
      expectedRiskAdjustedUtility: 80,
      newlyEligibleHotelIds: ["future-a"],
      evidenceStatus: "estimated",
    },
    {
      relaxationId: "verified-budget",
      kind: "budget-increase",
      changeAmount: 70,
      changeUnit: "currency",
      normalizedChange: 0.14,
      expectedRiskAdjustedUtility: 72,
      newlyEligibleHotelIds: ["future-b"],
      evidenceStatus: "verified",
    },
    {
      relaxationId: "verified-distance",
      kind: "distance-increase",
      changeAmount: 1,
      changeUnit: "kilometres",
      normalizedChange: 0.25,
      expectedRiskAdjustedUtility: 74,
      newlyEligibleHotelIds: ["future-c"],
      evidenceStatus: "verified",
    },
  ];
  const evaluation = createEvaluation([
    {
      id: "poor",
      cost: 1300,
      budget: 500,
      benefitBase: 10,
      sourceRiskScore: 90,
      sourceRiskLevel: "high",
      refundable: false,
    },
  ], { relaxations });

  assert.equal(evaluation.constraintRelaxation.status, "recommended");
  assert.equal(evaluation.constraintRelaxation.selected?.relaxationId, "verified-budget");
  assert.equal(
    evaluation.constraintRelaxation.consideredRelaxationIds.includes("estimated-budget"),
    false
  );
});

test("constraint relaxation stays unavailable when no verified alternate search exists", () => {
  const evaluation = createEvaluation([
    {
      id: "poor",
      cost: 1300,
      budget: 500,
      benefitBase: 10,
      sourceRiskScore: 90,
      sourceRiskLevel: "high",
      refundable: false,
    },
  ], {
    relaxations: [
      {
        relaxationId: "guess-only",
        kind: "budget-increase",
        changeAmount: 40,
        changeUnit: "currency",
        normalizedChange: 0.08,
        expectedRiskAdjustedUtility: 80,
        newlyEligibleHotelIds: ["unknown"],
        evidenceStatus: "estimated",
      },
    ],
  });

  assert.equal(evaluation.constraintRelaxation.status, "unavailable");
  assert.equal(evaluation.constraintRelaxation.selected, null);
});

test("candidate permutation does not change the V3-05 result", () => {
  const specs: CandidateSpec[] = [
    { id: "a", cost: 430, benefitBase: 83, sourceRiskScore: 20 },
    { id: "b", cost: 470, benefitBase: 79, sourceRiskScore: 10 },
    { id: "c", cost: 390, benefitBase: 70, sourceRiskScore: 5 },
  ];
  const first = createEvaluation(specs, { anchorHotelId: "a" });
  const second = createEvaluation([specs[2], specs[0], specs[1]], { anchorHotelId: "a" });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.robustChoiceHotelId, second.robustChoiceHotelId);
  assert.deepEqual(first.scenarios, second.scenarios);
});

test("the robustness fingerprint detects post-evaluation mutation", () => {
  const evaluation = createEvaluation([
    { id: "a", cost: 450, benefitBase: 85 },
    { id: "b", cost: 520, benefitBase: 70 },
  ]);
  const mutated = structuredClone(evaluation);
  mutated.candidates[0].choiceRiskScore = 99;

  assert.equal(validateDecisionRobustnessV3(evaluation).valid, true);
  assert.equal(validateDecisionRobustnessV3(mutated).valid, false);
});

test("missing canonical offer evidence becomes incomplete instead of a fabricated loss", () => {
  const evaluation = createEvaluation([
    { id: "complete", cost: 450, benefitBase: 80 },
    { id: "missing", cost: 400, benefitBase: 95, snapshotMissing: true },
  ], { anchorHotelId: "complete" });
  const missing = evaluation.candidates.find((candidate) => candidate.hotelId === "missing");

  assert.equal(missing?.status, "incomplete");
  assert.equal(missing?.riskAdjustedUtility, null);
  assert.equal(evaluation.robustChoiceHotelId, "complete");
});
