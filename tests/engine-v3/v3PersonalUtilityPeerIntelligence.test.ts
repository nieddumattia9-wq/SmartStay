import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDiminishingReturnsV3,
  createBudgetUtilityV3,
  evaluatePeerIntelligenceV3,
  evaluatePersonalUtilityV3,
  resolvePersonalPreferenceV3,
  validatePeerAssignmentV3,
  validatePersonalUtilityEvaluationV3,
  type StayOptiPeerCandidateV3,
  type StayOptiPersonalUtilityContextV3,
  type StayOptiPreferenceResolutionV3,
  type StayOptiUtilityDimensionInputV3,
  type StayOptiUtilityDimensionV3,
} from "../../src/engine-v3";

const DIMENSION_CODES:
  readonly StayOptiUtilityDimensionV3[] = [
    "priceValue",
    "quality",
    "location",
    "comfort",
    "flexibility",
    "categoryFit",
    "userFit",
  ];

function createDimensions(
  overrides:
    Partial<
      Record<
        StayOptiUtilityDimensionV3,
        Partial<
          StayOptiUtilityDimensionInputV3
        >
      >
    > =
      {}
) {
  return Object.fromEntries(
    DIMENSION_CODES.map(
      (dimension) => [
        dimension,
        {
          score:
            overrides[
              dimension
            ]?.score ===
              undefined
              ? 70
              : overrides[
                  dimension
                ]?.score ??
                null,
          confidence:
            overrides[
              dimension
            ]?.confidence ??
            0.9,
          evidenceIds:
            overrides[
              dimension
            ]?.evidenceIds ??
            [
              `evidence-${dimension}`,
            ],
        },
      ]
    )
  ) as Record<
    StayOptiUtilityDimensionV3,
    StayOptiUtilityDimensionInputV3
  >;
}

const DECLARED_BALANCED:
  StayOptiPreferenceResolutionV3 = {
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

function createContext(
  overrides:
    Partial<
      StayOptiPersonalUtilityContextV3
    > =
      {}
): StayOptiPersonalUtilityContextV3 {
  return {
    totalBudget:
      1000,
    totalCost:
      600,
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
      20,
    tripType:
      "mixed",
    ...overrides,
  };
}

function createUtility(
  input: {
    hotelId?:
      string;

    preference?:
      StayOptiPreferenceResolutionV3;

    context?:
      Partial<
        StayOptiPersonalUtilityContextV3
      >;

    dimensions?:
      ReturnType<
        typeof createDimensions
      >;
  } =
    {}
) {
  return evaluatePersonalUtilityV3({
    hotelId:
      input.hotelId ??
      "hotel-a",
    preference:
      input.preference ??
      DECLARED_BALANCED,
    context:
      createContext(
        input.context
      ),
    dimensions:
      input.dimensions ??
      createDimensions(),
  });
}

function createPeerCandidate(
  hotelId:
    string,
  overrides:
    Partial<
      StayOptiPeerCandidateV3
    > =
      {}
): StayOptiPeerCandidateV3 {
  return {
    hotelId,
    scopeFingerprint:
      "scope-one",
    destinationKey:
      "florence",
    category:
      "hotel",
    unitType:
      "hotel-room",
    roomName:
      "Double room",
    mealPlan:
      "Breakfast included",
    refundable:
      true,
    totalCost:
      400,
    currency:
      "EUR",
    qualityScore:
      80,
    distanceKm:
      1,
    eligible:
      true,
    evidenceIds: [
      `evidence-${hotelId}`,
    ],
    ...overrides,
  };
}

test(
  "non-linear utility is monotone and has diminishing gains",
  () => {
    const low =
      applyDiminishingReturnsV3(
        20
      );

    const middle =
      applyDiminishingReturnsV3(
        50
      );

    const high =
      applyDiminishingReturnsV3(
        80
      );

    assert.ok(
      low < middle &&
      middle < high
    );
    assert.ok(
      middle -
        low >
      high -
        middle
    );
    assert.equal(
      applyDiminishingReturnsV3(
        100
      ),
      100
    );
  }
);

test(
  "budget utility rewards lower cost and penalizes overspend without a spend-to-budget bonus",
  () => {
    assert.ok(
      createBudgetUtilityV3(
        400,
        1000
      ) >
      createBudgetUtilityV3(
        900,
        1000
      )
    );
    assert.ok(
      createBudgetUtilityV3(
        900,
        1000
      ) >
      createBudgetUtilityV3(
        1100,
        1000
      )
    );

    const cheaper =
      createUtility({
        hotelId:
          "cheaper",
        context: {
          totalCost:
            400,
        },
      });

    const budgetFiller =
      createUtility({
        hotelId:
          "budget-filler",
        context: {
          totalCost:
            900,
        },
      });

    assert.ok(
      (
        cheaper.utilityScore ??
        0
      ) >
      (
        budgetFiller.utilityScore ??
        0
      )
    );
  }
);

test(
  "raising the budget improves affordability but never makes an identical expensive stay beat a cheaper one",
  () => {
    for (
      const budget
      of [
        700,
        1000,
        2000,
      ]
    ) {
      const cheaper =
        createUtility({
          hotelId:
            `cheaper-${budget}`,
          context: {
            totalBudget:
              budget,
            totalCost:
              500,
          },
        });

      const expensive =
        createUtility({
          hotelId:
            `expensive-${budget}`,
          context: {
            totalBudget:
              budget,
            totalCost:
              650,
          },
        });

      assert.ok(
        (
          cheaper.utilityScore ??
          0
        ) >
        (
          expensive.utilityScore ??
          0
        )
      );
    }
  }
);

test(
  "declared, inferred and neutral preferences remain separate",
  () => {
    const declared =
      resolvePersonalPreferenceV3({
        preferenceId:
          "maximum-comfort",
        preferenceSource:
          "manual",
        nights:
          10,
      });

    const inferred =
      resolvePersonalPreferenceV3({
        preferenceSource:
          "automatic",
        nights:
          10,
        tripType:
          "long-stay",
      });

    const neutral =
      resolvePersonalPreferenceV3({
        preferenceId:
          "not-a-profile",
        preferenceSource:
          "default",
      });

    assert.deepEqual(
      declared,
      {
        declaredPreferenceId:
          "maximum-comfort",
        inferredPreferenceId:
          null,
        resolvedPreferenceId:
          "maximum-comfort",
        origin:
          "declared",
        reasonCodes: [
          "preference:declared",
        ],
      }
    );
    assert.equal(
      inferred.origin,
      "inferred"
    );
    assert.equal(
      inferred.inferredPreferenceId,
      "savings"
    );
    assert.equal(
      neutral.origin,
      "neutral-default"
    );
    assert.equal(
      neutral.resolvedPreferenceId,
      "balanced"
    );
  }
);

test(
  "duration, trip, lead-time and group interactions change only documented weights",
  () => {
    const baseline =
      createUtility();

    const contextual =
      createUtility({
        context: {
          nights:
            10,
          adults:
            4,
          children:
            1,
          rooms:
            2,
          maximumDistanceKm:
            1,
          leadTimeDays:
            45,
          tripType:
            "business",
        },
      });

    const interactionCodes =
      new Set(
        contextual.interactions.map(
          (interaction) =>
            interaction.code
        )
      );

    assert.deepEqual(
      [
        ...interactionCodes,
      ].sort(),
      [
        "interaction:budget-duration",
        "interaction:distance-trip-type",
        "interaction:flexibility-lead-time",
        "interaction:room-group",
      ]
    );
    assert.ok(
      contextual.weights
        .priceValue >
      baseline.weights
        .priceValue
    );
    assert.ok(
      contextual.weights
        .flexibility >
      baseline.weights
        .flexibility
    );
    assert.ok(
      contextual.weights
        .userFit >
      baseline.weights
        .userFit
    );
  }
);

test(
  "irrelevant identity and evidence order do not change the utility score",
  () => {
    const first =
      createUtility({
        hotelId:
          "hotel-a",
      });

    const reordered =
      createDimensions();

    reordered.quality
      .evidenceIds = [
        "z",
        "a",
        "z",
      ];

    const second =
      createUtility({
        hotelId:
          "hotel-b",
        dimensions:
          reordered,
      });

    assert.equal(
      first.utilityScore,
      second.utilityScore
    );
    assert.deepEqual(
      second.dimensions
        .quality
        .evidenceIds,
      [
        "a",
        "z",
      ]
    );
  }
);

test(
  "missing dimensions remain unavailable and lower coverage instead of becoming zero quality",
  () => {
    const dimensions =
      createDimensions({
        quality: {
          score:
            null,
          confidence:
            1,
        },
        comfort: {
          score:
            null,
          confidence:
            1,
        },
      });

    const evaluation =
      createUtility({
        dimensions,
      });

    assert.ok(
      evaluation.evidenceCoverage <
        1
    );
    assert.ok(
      evaluation.scoreConfidence <
        1
    );
    assert.equal(
      evaluation.contributions.find(
        (contribution) =>
          contribution.dimension ===
          "quality"
      )?.curve,
      "unavailable"
    );
  }
);

test(
  "personal utility fingerprints detect mutation",
  () => {
    const evaluation =
      createUtility();

    assert.equal(
      validatePersonalUtilityEvaluationV3(
        evaluation
      ).valid,
      true
    );

    evaluation.utilityScore =
      99;

    assert.equal(
      validatePersonalUtilityEvaluationV3(
        evaluation
      ).valid,
      false
    );
  }
);

test(
  "peer intelligence builds an exact contextual cohort with medians",
  () => {
    const assignments =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "hotel-c",
          {
            totalCost:
              500,
            qualityScore:
              90,
          }
        ),
        createPeerCandidate(
          "hotel-a",
          {
            totalCost:
              300,
            qualityScore:
              70,
          }
        ),
        createPeerCandidate(
          "hotel-b",
          {
            totalCost:
              400,
            qualityScore:
              80,
          }
        ),
      ]);

    const assignment =
      assignments.find(
        (candidate) =>
          candidate.hotelId ===
          "hotel-b"
      );

    assert.equal(
      assignment?.mode,
      "exact-context"
    );
    assert.equal(
      assignment
        ?.directComparisonAllowed,
      true
    );
    assert.equal(
      assignment
        ?.medianTotalCost,
      400
    );
    assert.equal(
      assignment
        ?.medianQualityScore,
      80
    );
  }
);

test(
  "compatible categories may form a direct cohort only with compatible units and offer semantics",
  () => {
    const assignments =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "hotel-a"
        ),
        createPeerCandidate(
          "bnb-b",
          {
            category:
              "bed-and-breakfast",
            unitType:
              "private-room",
          }
        ),
        createPeerCandidate(
          "guest-c",
          {
            category:
              "guesthouse",
            unitType:
              "private-room",
          }
        ),
      ]);

    const target =
      assignments.find(
        (assignment) =>
          assignment.hotelId ===
          "hotel-a"
      );

    assert.equal(
      target?.mode,
      "compatible-context"
    );
    assert.equal(
      target
        ?.directComparisonAllowed,
      true
    );
  }
);

test(
  "cross-category fallback is explicit and cannot authorize direct comparison",
  () => {
    const assignments =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "hotel-a"
        ),
        createPeerCandidate(
          "apartment-b",
          {
            category:
              "apartment",
            unitType:
              "entire-place",
            roomName:
              "Entire apartment",
          }
        ),
        createPeerCandidate(
          "hostel-c",
          {
            category:
              "hostel",
            unitType:
              "shared-room",
            roomName:
              "Shared dormitory",
          }
        ),
      ]);

    const target =
      assignments.find(
        (assignment) =>
          assignment.hotelId ===
          "hotel-a"
      );

    assert.equal(
      target?.mode,
      "declared-fallback"
    );
    assert.equal(
      target
        ?.directComparisonAllowed,
      false
    );
    assert.ok(
      target?.reasonCodes.includes(
        "peer:fallback-explicit"
      )
    );
  }
);

test(
  "unknown meal or cancellation semantics block direct comparison",
  () => {
    const assignments =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "unknown-terms",
          {
            mealPlan:
              null,
            refundable:
              null,
          }
        ),
        createPeerCandidate(
          "known-b"
        ),
        createPeerCandidate(
          "known-c"
        ),
      ]);

    const target =
      assignments.find(
        (assignment) =>
          assignment.hotelId ===
          "unknown-terms"
      );

    assert.equal(
      target?.mode,
      "declared-fallback"
    );
    assert.equal(
      target
        ?.directComparisonAllowed,
      false
    );
  }
);

test(
  "unknown accommodation identity cannot create a direct peer cohort",
  () => {
    const assignments =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "unknown-a",
          {
            category:
              "unknown",
            unitType:
              "unknown",
          }
        ),
        createPeerCandidate(
          "unknown-b",
          {
            category:
              "unknown",
            unitType:
              "unknown",
          }
        ),
        createPeerCandidate(
          "unknown-c",
          {
            category:
              "unknown",
            unitType:
              "unknown",
          }
        ),
      ]);

    assert.equal(
      assignments[0].mode,
      "declared-fallback"
    );
    assert.equal(
      assignments[0]
        .directComparisonAllowed,
      false
    );
  }
);

test(
  "scope and currency mismatches never enter a direct peer group",
  () => {
    const assignments =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "hotel-a"
        ),
        createPeerCandidate(
          "hotel-b",
          {
            scopeFingerprint:
              "different-scope",
          }
        ),
        createPeerCandidate(
          "hotel-c",
          {
            currency:
              "USD",
          }
        ),
      ]);

    const target =
      assignments.find(
        (assignment) =>
          assignment.hotelId ===
          "hotel-a"
      );

    assert.equal(
      target?.mode,
      "unavailable"
    );
    assert.equal(
      target?.sampleSize,
      0
    );
    assert.ok(
      target?.exclusions.some(
        (exclusion) =>
          exclusion.reasonCodes.includes(
            "peer:excluded-search-scope-mismatch"
          )
      )
    );
  }
);

test(
  "peer assignments are deterministic under input permutation",
  () => {
    const candidates = [
      createPeerCandidate(
        "hotel-a"
      ),
      createPeerCandidate(
        "hotel-b",
        {
          evidenceIds: [
            "z",
            "a",
          ],
        }
      ),
      createPeerCandidate(
        "hotel-c"
      ),
    ];

    assert.deepEqual(
      evaluatePeerIntelligenceV3(
        candidates
      ),
      evaluatePeerIntelligenceV3(
        [
          ...candidates,
        ].reverse()
      )
    );
  }
);

test(
  "peer assignment fingerprints detect an unsafe post-evaluation mutation",
  () => {
    const assignment =
      evaluatePeerIntelligenceV3([
        createPeerCandidate(
          "hotel-a"
        ),
        createPeerCandidate(
          "hotel-b"
        ),
        createPeerCandidate(
          "hotel-c"
        ),
      ])[0];

    assert.equal(
      validatePeerAssignmentV3(
        assignment
      ).valid,
      true
    );

    assignment.directComparisonAllowed =
      false;

    assert.equal(
      validatePeerAssignmentV3(
        assignment
      ).valid,
      false
    );
  }
);
