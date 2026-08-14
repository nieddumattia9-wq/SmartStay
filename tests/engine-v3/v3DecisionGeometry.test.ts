import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDecisionGeometryV3,
  evaluatePeerIntelligenceV3,
  evaluatePersonalUtilityV3,
  validateDecisionGeometryV3,
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

const BENEFIT_DIMENSIONS: readonly StayOptiGeometryBenefitDimensionV3[] = [
  "quality",
  "location",
  "comfort",
  "flexibility",
  "categoryFit",
  "userFit",
];

const DECLARED_BALANCED: StayOptiPreferenceResolutionV3 = {
  declaredPreferenceId:
    "balanced",
  inferredPreferenceId:
    null,
  resolvedPreferenceId:
    "balanced",
  origin:
    "declared",
  reasonCodes: [
    "preference:declared",
  ],
};

type CandidateSpec = {
  id:
    string;
  cost:
    number;
  benefits?:
    Partial<Record<StayOptiGeometryBenefitDimensionV3, number | null>>;
  benefitBase?:
    number;
  budget?:
    number | null;
  currency?:
    string;
  eligible?:
    boolean;
  costIntegrityStatus?:
    "complete" | "provisional" | "incomplete" | "conflicting";
  roomName?:
    string | null;
  mealPlan?:
    string | null;
  refundable?:
    boolean | null;
};

function createDimensions(spec: CandidateSpec) {
  const entries: Array<[
    StayOptiUtilityDimensionV3,
    StayOptiUtilityDimensionInputV3,
  ]> = UTILITY_DIMENSIONS.map((dimension) => {
    const score = dimension === "priceValue"
      ? 70
      : spec.benefits?.[dimension] === undefined
        ? spec.benefitBase ?? 70
        : spec.benefits[dimension] ?? null;

    return [
      dimension,
      {
        score,
        confidence:
          0.9,
        evidenceIds: [
          `${spec.id}-${dimension}`,
        ],
      },
    ];
  });

  return Object.fromEntries(entries) as Record<
    StayOptiUtilityDimensionV3,
    StayOptiUtilityDimensionInputV3
  >;
}

function createPeerCandidate(spec: CandidateSpec): StayOptiPeerCandidateV3 {
  return {
    hotelId:
      spec.id,
    scopeFingerprint:
      "geometry-scope",
    destinationKey:
      "rome",
    category:
      "hotel",
    unitType:
      "hotel-room",
    roomName:
      spec.roomName === undefined ? "Double room" : spec.roomName,
    mealPlan:
      spec.mealPlan === undefined ? "Breakfast included" : spec.mealPlan,
    refundable:
      spec.refundable === undefined ? true : spec.refundable,
    totalCost:
      spec.cost,
    currency:
      spec.currency ?? "EUR",
    qualityScore:
      75,
    distanceKm:
      1,
    eligible:
      spec.eligible ?? true,
    evidenceIds: [
      `${spec.id}-peer-evidence`,
    ],
  };
}

function createGeometry(specs: CandidateSpec[]) {
  const assignments = evaluatePeerIntelligenceV3(
    specs.map(createPeerCandidate)
  );
  const assignmentByHotelId = new Map(
    assignments.map((assignment) => [assignment.hotelId, assignment] as const)
  );

  return evaluateDecisionGeometryV3(
    specs.map((spec) => {
      const peerAssignment = assignmentByHotelId.get(spec.id);

      assert.ok(peerAssignment);

      return {
        hotelId:
          spec.id,
        solutionId:
          `solution:${spec.id}`,
        eligible:
          spec.eligible ?? true,
        totalCost:
          spec.cost,
        currency:
          spec.currency ?? "EUR",
        costIntegrityStatus:
          spec.costIntegrityStatus ?? "complete",
        utility:
          evaluatePersonalUtilityV3({
            hotelId:
              spec.id,
            preference:
              DECLARED_BALANCED,
            context: {
              totalBudget:
                spec.budget === undefined ? 1000 : spec.budget,
              totalCost:
                spec.cost,
              nights:
                4,
              adults:
                2,
              children:
                0,
              rooms:
                1,
              maximumDistanceKm:
                3,
              leadTimeDays:
                30,
              tripType:
                "leisure",
            },
            dimensions:
              createDimensions(spec),
          }),
        peerAssignment,
      };
    })
  );
}

test(
  "strong and weak Pareto frontiers use explicit nested mathematical definitions",
  () => {
    const geometry = createGeometry([
      {
        id: "dominant",
        cost: 400,
        benefitBase: 80,
      },
      {
        id: "strictly-dominated",
        cost: 500,
        benefitBase: 70,
      },
      {
        id: "saving-tradeoff",
        cost: 330,
        benefitBase: 60,
      },
    ]);
    const relation = geometry.dominanceRelations.find(
      (candidateRelation) =>
        candidateRelation.dominantHotelId === "dominant" &&
        candidateRelation.dominatedHotelId === "strictly-dominated"
    );
    const dominated = geometry.candidates.find(
      (candidate) => candidate.hotelId === "strictly-dominated"
    );

    assert.ok(relation);
    assert.deepEqual(
      relation.kinds,
      [
        "pareto-non-worse",
        "strict-all",
      ]
    );
    assert.equal(dominated?.strongParetoStatus, "dominated");
    assert.equal(dominated?.weakParetoStatus, "dominated");
    assert.equal(
      dominated?.primaryEliminationVariable,
      relation.decisiveDimension
    );
    assert.ok(geometry.strongParetoFrontierHotelIds.includes("saving-tradeoff"));
  }
);

test(
  "a non-worse option can dominate the strong frontier without strict-all dominance",
  () => {
    const geometry = createGeometry([
      {
        id: "cheaper-equal",
        cost: 400,
        benefitBase: 70,
      },
      {
        id: "expensive-equal",
        cost: 500,
        benefitBase: 70,
      },
      {
        id: "tradeoff",
        cost: 350,
        benefitBase: 60,
      },
    ]);
    const relation = geometry.dominanceRelations.find(
      (candidateRelation) =>
        candidateRelation.dominantHotelId === "cheaper-equal" &&
        candidateRelation.dominatedHotelId === "expensive-equal"
    );
    const expensive = geometry.candidates.find(
      (candidate) => candidate.hotelId === "expensive-equal"
    );

    assert.deepEqual(relation?.kinds, ["pareto-non-worse"]);
    assert.equal(expensive?.strongParetoStatus, "dominated");
    assert.equal(expensive?.weakParetoStatus, "frontier");
  }
);

test(
  "missing benefit evidence produces unknown geometry and never a loss",
  () => {
    const geometry = createGeometry([
      {
        id: "complete-a",
        cost: 400,
        benefitBase: 75,
      },
      {
        id: "complete-b",
        cost: 450,
        benefitBase: 70,
      },
      {
        id: "missing-quality",
        cost: 550,
        benefitBase: 90,
        benefits: {
          quality:
            null,
        },
      },
    ]);
    const missing = geometry.candidates.find(
      (candidate) => candidate.hotelId === "missing-quality"
    );

    assert.equal(missing?.status, "incomplete");
    assert.equal(missing?.strongParetoStatus, "unknown");
    assert.equal(missing?.weakParetoStatus, "unknown");
    assert.deepEqual(missing?.dominatedByHotelIds, []);
    assert.ok(missing?.missingDimensions.includes("quality"));
    assert.ok(
      missing?.reasonCodes.includes("geometry:missing-data-not-disadvantage")
    );
  }
);

test(
  "fallback peer cohorts cannot authorize Pareto or pairwise comparisons",
  () => {
    const geometry = createGeometry([
      {
        id: "known-a",
        cost: 400,
        benefitBase: 80,
      },
      {
        id: "unknown-meal",
        cost: 450,
        benefitBase: 70,
        mealPlan: null,
      },
      {
        id: "known-c",
        cost: 500,
        benefitBase: 60,
      },
    ]);

    assert.equal(
      geometry.candidates.every(
        (candidate) => candidate.strongParetoStatus === "unknown"
      ),
      true
    );
    assert.equal(geometry.dominanceRelations.length, 0);
    assert.equal(geometry.pairwiseFinalistComparisons.length, 0);
  }
);

test(
  "a pure price increase never improves geometry",
  () => {
    const geometry = createGeometry([
      {
        id: "same-cheap",
        cost: 400,
        benefitBase: 72,
      },
      {
        id: "same-expensive",
        cost: 600,
        benefitBase: 72,
      },
      {
        id: "other",
        cost: 350,
        benefitBase: 55,
      },
    ]);
    const expensive = geometry.candidates.find(
      (candidate) => candidate.hotelId === "same-expensive"
    );
    const relation = geometry.dominanceRelations.find(
      (candidateRelation) =>
        candidateRelation.dominantHotelId === "same-cheap" &&
        candidateRelation.dominatedHotelId === "same-expensive"
    );

    assert.ok(relation?.betterDimensions.includes("totalCost"));
    assert.equal(expensive?.strongParetoStatus, "dominated");
  }
);

test(
  "dominance is irreflexive, asymmetric and transitive on a strict chain",
  () => {
    const geometry = createGeometry([
      {
        id: "a",
        cost: 300,
        benefitBase: 90,
      },
      {
        id: "b",
        cost: 400,
        benefitBase: 80,
      },
      {
        id: "c",
        cost: 500,
        benefitBase: 70,
      },
    ]);
    const relationKeys = new Set(
      geometry.dominanceRelations.map(
        (relation) => `${relation.dominantHotelId}>${relation.dominatedHotelId}`
      )
    );

    assert.equal(
      geometry.dominanceRelations.some(
        (relation) => relation.dominantHotelId === relation.dominatedHotelId
      ),
      false
    );
    assert.equal(relationKeys.has("a>b"), true);
    assert.equal(relationKeys.has("b>a"), false);
    assert.equal(relationKeys.has("b>c"), true);
    assert.equal(relationKeys.has("a>c"), true);
  }
);

test(
  "a free material benefit improvement cannot worsen Pareto status",
  () => {
    const geometry = createGeometry([
      {
        id: "improved",
        cost: 450,
        benefitBase: 70,
        benefits: {
          quality: 85,
        },
      },
      {
        id: "baseline",
        cost: 450,
        benefitBase: 70,
      },
      {
        id: "tradeoff",
        cost: 350,
        benefitBase: 55,
      },
    ]);
    const improved = geometry.candidates.find(
      (candidate) => candidate.hotelId === "improved"
    );
    const baseline = geometry.candidates.find(
      (candidate) => candidate.hotelId === "baseline"
    );

    assert.equal(improved?.strongParetoStatus, "frontier");
    assert.equal(baseline?.strongParetoStatus, "dominated");
    assert.ok(baseline?.dominatedByHotelIds.includes("improved"));
  }
);

test(
  "currency mismatch cannot become a cross-currency economic comparison",
  () => {
    const geometry = createGeometry([
      {
        id: "eur-a",
        cost: 300,
        currency: "EUR",
        benefitBase: 80,
      },
      {
        id: "usd",
        cost: 350,
        currency: "USD",
        benefitBase: 70,
      },
      {
        id: "eur-c",
        cost: 400,
        currency: "EUR",
        benefitBase: 60,
      },
    ]);

    assert.equal(geometry.dominanceRelations.length, 0);
    assert.equal(geometry.tradeOffThresholds.length, 0);
    assert.equal(
      geometry.candidates.find((candidate) => candidate.hotelId === "usd")
        ?.strongParetoStatus,
      "unknown"
    );
  }
);

test(
  "duplicate hotel identity is rejected before geometry can double count it",
  () => {
    assert.throws(
      () =>
        createGeometry([
          {
            id: "duplicate",
            cost: 300,
          },
          {
            id: "duplicate",
            cost: 400,
          },
          {
            id: "other",
            cost: 500,
          },
        ]),
      /unique hotel IDs/i
    );
  }
);

test(
  "pairwise finalists expose the preferred option and decisive variable",
  () => {
    const geometry = createGeometry([
      {
        id: "saving",
        cost: 350,
        benefitBase: 55,
      },
      {
        id: "balanced",
        cost: 500,
        benefitBase: 80,
      },
      {
        id: "premium",
        cost: 700,
        benefitBase: 86,
      },
    ]);
    const comparison = geometry.pairwiseFinalistComparisons.find(
      (candidateComparison) =>
        candidateComparison.firstHotelId === "balanced" &&
        candidateComparison.secondHotelId === "saving"
    );

    assert.ok(comparison);
    assert.notEqual(comparison.outcome, "incomparable");
    assert.ok(comparison.decisiveDimension);
    assert.equal(typeof comparison.utilityDeltaFirstMinusSecond, "number");
  }
);

test(
  "equal options remain utility-equivalent and neither dominates",
  () => {
    const geometry = createGeometry([
      {
        id: "clone-a",
        cost: 450,
        benefitBase: 70,
      },
      {
        id: "clone-b",
        cost: 450,
        benefitBase: 70,
      },
      {
        id: "clone-c",
        cost: 450,
        benefitBase: 70,
      },
    ]);

    assert.equal(geometry.dominanceRelations.length, 0);
    assert.equal(
      geometry.pairwiseFinalistComparisons.every(
        (comparison) => comparison.outcome === "utility-equivalent"
      ),
      true
    );
  }
);

test(
  "marginal value follows the efficient cost curve and detects diminishing returns",
  () => {
    const geometry = createGeometry([
      {
        id: "entry",
        cost: 300,
        benefitBase: 40,
      },
      {
        id: "value",
        cost: 450,
        benefitBase: 75,
      },
      {
        id: "upper",
        cost: 700,
        benefitBase: 82,
      },
    ]);

    assert.equal(geometry.marginalValueSegments.length, 2);
    assert.equal(
      geometry.marginalValueSegments[0].trend,
      "baseline"
    );
    assert.ok(
      [
        "diminishing-return",
        "negative-return",
      ].includes(geometry.marginalValueSegments[1].trend)
    );
    assert.ok(
      geometry.reasonCodes.includes("geometry:diminishing-returns")
    );
  }
);

test(
  "upgrade, saving and maximum sensible price thresholds come from the utility curve",
  () => {
    const geometry = createGeometry([
      {
        id: "saving",
        cost: 320,
        benefitBase: 48,
      },
      {
        id: "value",
        cost: 500,
        benefitBase: 78,
      },
      {
        id: "upper",
        cost: 720,
        benefitBase: 83,
      },
    ]);
    const threshold = geometry.tradeOffThresholds.find(
      (candidateThreshold) =>
        candidateThreshold.lowerCostHotelId === "saving" &&
        candidateThreshold.higherCostHotelId === "value"
    );

    assert.ok(threshold);
    assert.equal(threshold.currency, "EUR");
    assert.equal(threshold.actualPremiumAmount, 180);
    assert.equal(threshold.actualSavingAmount, 180);
    assert.equal(threshold.exact, true);
    assert.ok(
      threshold.higherCostMaximumSensiblePrice.status === "available" ||
      threshold.lowerCostMaximumSensiblePrice.status === "available"
    );
    assert.ok(geometry.exactThresholdCount > 0);
  }
);

test(
  "thresholds stay unavailable when no real budget curve exists",
  () => {
    const geometry = createGeometry([
      {
        id: "no-budget-a",
        cost: 350,
        benefitBase: 60,
        budget: null,
      },
      {
        id: "no-budget-b",
        cost: 500,
        benefitBase: 80,
        budget: null,
      },
      {
        id: "no-budget-c",
        cost: 700,
        benefitBase: 85,
        budget: null,
      },
    ]);

    assert.equal(geometry.exactThresholdCount, 0);
    assert.equal(
      geometry.tradeOffThresholds.every(
        (threshold) =>
          threshold.higherCostMaximumSensiblePrice.status === "unavailable" &&
          threshold.lowerCostMaximumSensiblePrice.status === "unavailable"
      ),
      true
    );
  }
);

test(
  "the internal decision map labels dominated and diminishing-return points",
  () => {
    const geometry = createGeometry([
      {
        id: "entry",
        cost: 300,
        benefitBase: 40,
      },
      {
        id: "value",
        cost: 450,
        benefitBase: 75,
      },
      {
        id: "upper",
        cost: 700,
        benefitBase: 82,
      },
      {
        id: "dominated",
        cost: 800,
        benefitBase: 70,
      },
    ]);
    const dominated = geometry.decisionMap.points.find(
      (point) => point.hotelId === "dominated"
    );
    const upper = geometry.decisionMap.points.find(
      (point) => point.hotelId === "upper"
    );

    assert.equal(geometry.decisionMap.internalOnly, true);
    assert.equal(dominated?.zone, "dominated");
    assert.ok(
      upper?.zone === "diminishing-returns" ||
      upper?.zone === "unsupported-premium"
    );
  }
);

test(
  "geometry is deterministic under candidate permutation",
  () => {
    const specs: CandidateSpec[] = [
      {
        id: "a",
        cost: 350,
        benefitBase: 55,
      },
      {
        id: "b",
        cost: 500,
        benefitBase: 78,
      },
      {
        id: "c",
        cost: 700,
        benefitBase: 84,
      },
    ];
    const forward = createGeometry(specs);
    const reverse = createGeometry([...specs].reverse());

    assert.equal(forward.fingerprint, reverse.fingerprint);
    assert.deepEqual(forward, reverse);
  }
);

test(
  "geometry fingerprints reject post-evaluation mutation",
  () => {
    const geometry = createGeometry([
      {
        id: "a",
        cost: 350,
        benefitBase: 55,
      },
      {
        id: "b",
        cost: 500,
        benefitBase: 78,
      },
      {
        id: "c",
        cost: 700,
        benefitBase: 84,
      },
    ]);

    assert.equal(validateDecisionGeometryV3(geometry).valid, true);
    geometry.decisionMap.points[0].zone = "efficient-frontier";
    assert.equal(validateDecisionGeometryV3(geometry).valid, false);
  }
);

test(
  "incomplete cost integrity is not converted into a price disadvantage",
  () => {
    const geometry = createGeometry([
      {
        id: "complete-a",
        cost: 350,
        benefitBase: 70,
      },
      {
        id: "provisional",
        cost: 800,
        benefitBase: 50,
        costIntegrityStatus: "provisional",
      },
      {
        id: "complete-c",
        cost: 500,
        benefitBase: 75,
      },
    ]);
    const provisional = geometry.candidates.find(
      (candidate) => candidate.hotelId === "provisional"
    );

    assert.equal(provisional?.status, "incomplete");
    assert.equal(provisional?.strongParetoStatus, "unknown");
    assert.deepEqual(provisional?.dominatedByHotelIds, []);
  }
);

test(
  "Decision Geometry remains shadow-only and commercially neutral",
  () => {
    const geometry = createGeometry([
      {
        id: "a",
        cost: 350,
        benefitBase: 55,
      },
      {
        id: "b",
        cost: 500,
        benefitBase: 78,
      },
      {
        id: "c",
        cost: 700,
        benefitBase: 84,
      },
    ]);
    const serialized = JSON.stringify(geometry).toLowerCase();

    assert.equal(geometry.rankingApplication, "shadow-only");
    assert.ok(geometry.reasonCodes.includes("geometry:commercially-neutral"));
    assert.equal(/commission|markup|revenue|providerpriority/.test(serialized), false);
  }
);

assert.equal(BENEFIT_DIMENSIONS.length, 6);
