import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBudgetIntentV2,
  type SmartStayBudgetIntentCandidateEvaluationV2,
  type SmartStayBudgetIntentCandidateV2,
} from "../../src/engine-v2/intent/budgetIntentEngine";

import {
  evaluateRecommendationRolesV2,
  type SmartStayRecommendationCandidateV2,
} from "../../src/engine-v2/recommendation/recommendationRolesEngine";

import type {
  SmartStayUtilityPreferenceIdV2,
} from "../../src/engine-v2/utility/userUtilityEngine";

import type {
  SmartStayOfferSelectionV2,
} from "../../src/engine-v2/offers/intentAwareOfferSelectionV2";

import {
  evaluateMarketContextV2,
} from "../../src/engine-v2/market-context/marketContextEngine";

import type {
  SmartStayMarketContextObservationV2,
} from "../../src/engine-v2/market-context/marketContextModel";

type CandidateDefinition = {
  hotelId: string;
  totalCost: number;
  smartScore: number;
  utilityScore?: number;
  qualityScore: number;
  comfortScore: number;
  locationScore: number;
  flexibilityScore?: number;
  stars: number;
  category?: string;
  refundable?: boolean;
};

const PREFERENCE_WEIGHTS = {
  priceValue: 0.1,
  quality: 0.3,
  location: 0.15,
  comfort: 0.25,
  flexibility: 0.08,
  categoryFit: 0.05,
  userFit: 0.07,
};

function createCandidate(
  definition: CandidateDefinition,
  preferenceId: SmartStayUtilityPreferenceIdV2,
  totalBudget = 1500
): SmartStayBudgetIntentCandidateV2 & SmartStayRecommendationCandidateV2 {
  const utilityScore = definition.utilityScore ?? definition.smartScore;
  const flexibilityScore = definition.flexibilityScore ?? 92;
  const withinBudget = definition.totalCost <= totalBudget;
  const overageAmount = Math.max(definition.totalCost - totalBudget, 0);
  const commonDimension = (
    score: number,
    code: string
  ) => ({
    score,
    confidence: 0.95,
    evidenceCoverage: 0.95,
    totalWeight: 1,
    confirmedWeight: 1,
    warningCodes: [],
    evidenceIds: [`${code}:${definition.hotelId}`],
  });

  const refundable =
    definition.refundable ??
    definition.stars >= 5;

  const selectedOffer = {
    hotelId:
      definition.hotelId,
    offerId:
      "offer-1",
    provider:
      "Test Provider",
    roomName:
      definition.stars >= 5
        ? "Deluxe Room"
        : "Standard Room",
    amount:
      definition.totalCost,
    currency:
      "EUR",
    completeness:
      "reported-complete" as const,
    bookable:
      true,
    refundable,
    freeCancellationUntil:
      refundable
        ? "2026-08-07T00:00:00Z"
        : null,
    cancellationPolicyKnown:
      true,
    taxesIncluded:
      true,
    excludedTaxes:
      0,
    unknownTaxes:
      0,
    roomTier:
      definition.stars >= 5
        ? "premium" as const
        : "standard" as const,
    roomTierRank:
      definition.stars >= 5
        ? 4
        : 2,
    selectionMode:
      "lowest-price" as const,
    reasonCodes: [
      "offer-selection-test-fixture",
    ],
  };

  const offerSelection:
    SmartStayOfferSelectionV2 = {
      hotelId:
        definition.hotelId,
      primary:
        null,
      offers:
        [],
      alternativeCount:
        0,
      selectionMode:
        "lowest-price",
      selectedOffer,
      reasonCodes:
        selectedOffer.reasonCodes,
    };

  const candidate = {
    hotelId: definition.hotelId,
    eligibleForPrimaryRanking: true,
    accommodationCategory: definition.category ?? "hotel",
    smartScore: definition.smartScore,
    offerSelection,

    utility: {
      hotelId: definition.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      preference: {
        id: preferenceId,
        selectedIndex:
          preferenceId === "maximum-comfort"
            ? 0
            : preferenceId === "comfort"
              ? 1
              : preferenceId === "balanced"
                ? 2
                : preferenceId === "savings"
                  ? 3
                  : 4,
        source: "user",
        weights: PREFERENCE_WEIGHTS,
      },
      rawUtilityScore: utilityScore,
      utilityScore,
      scoreConfidence: 0.95,
      evidenceCoverage: 0.95,
      availableDimensionCodes: Object.keys(PREFERENCE_WEIGHTS),
      unavailableDimensionCodes: [],
      contributions: [],
      warningCodes: [],
      evidenceIds: [`utility:${definition.hotelId}`],
    },

    priceValue: {
      hotelId: definition.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      totalCost: definition.totalCost,
      currency: "EUR",
      costCompleteness: "reported-complete",
      budget: {
        provided: true,
        total: totalBudget,
        withinBudget,
        differenceAmount: totalBudget - definition.totalCost,
        overageAmount,
        overageRatio: overageAmount / totalBudget,
        utilizationRatio: definition.totalCost / totalBudget,
        fitScore: withinBudget ? 100 : 0,
      },
      peerBaseline: {
        available: true,
        mode: "category-distance",
        assignedSampleSize: 8,
        eligibleReferenceCount: 8,
        excludedCurrencyMismatchCount: 0,
        excludedMissingPriceCount: 0,
        minimum: 150,
        firstQuartile: 300,
        median: 550,
        thirdQuartile: 900,
        maximum: 1400,
        confidence: 0.95,
        referenceHotelIds: [],
        evidenceIds: [],
      },
      relativePrice: {
        ratioToMedian: definition.totalCost / 550,
        savingAgainstMedian: 550 - definition.totalCost,
        savingPercentageAgainstMedian:
          ((550 - definition.totalCost) / 550) * 100,
        pricePercentile: null,
        valueScore: definition.smartScore,
      },
      score: definition.smartScore,
      confidence: 0.95,
      warningCodes: [],
      evidenceIds: [`price:${definition.hotelId}`],
    },

    quality: {
      hotelId: definition.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      score: definition.qualityScore,
      confidence: 0.95,
      reviewQuality: {
        score: definition.qualityScore,
        confidence: 0.95,
      },
      starQuality: {
        stars: definition.stars,
        normalizedScore: definition.stars * 20,
        confidence: 0.95,
      },
      warningCodes: [],
      evidenceIds: [`quality:${definition.hotelId}`],
    },

    location: {
      hotelId: definition.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      score: definition.locationScore,
      confidence: 0.95,
      distance: {
        selectedDistanceKm: Math.max((100 - definition.locationScore) / 20, 0.1),
      },
      warningCodes: [],
      evidenceIds: [`location:${definition.hotelId}`],
    },

    comfortFlexibility: {
      hotelId: definition.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      mandatoryRequirements: {
        satisfied: true,
        unmetFeatureCodes: [],
        unverifiedFeatureCodes: [],
        requiredUnitTypeStatus: "not-required",
      },
      dimensions: {
        comfort: commonDimension(definition.comfortScore, "comfort"),
        practicality: commonDimension(
          Math.max(definition.comfortScore - 2, 0),
          "practicality"
        ),
        flexibility: commonDimension(flexibilityScore, "flexibility"),
      },
      score:
        definition.comfortScore * 0.7 +
        flexibilityScore * 0.3,
      confidence: 0.95,
      evidenceCoverage: 0.95,
      warningCodes: [],
      evidenceIds: [`comfort-evaluation:${definition.hotelId}`],
    },

    scores: {
      priceValue: {
        score: definition.smartScore,
        confidence: 0.95,
        evidenceIds: [],
      },
      quality: {
        score: definition.qualityScore,
        confidence: 0.95,
        evidenceIds: [],
      },
      location: {
        score: definition.locationScore,
        confidence: 0.95,
        evidenceIds: [],
      },
      comfort: {
        score: definition.comfortScore,
        confidence: 0.95,
        evidenceIds: [],
      },
      flexibility: {
        score: flexibilityScore,
        confidence: 0.95,
        evidenceIds: [],
      },
      categoryFit: {
        score:
          definition.category === "resort" ||
          definition.category === "villa"
            ? 98
            : definition.stars >= 5
              ? 96
              : definition.stars >= 4
                ? 90
                : 78,
        confidence: 0.95,
        evidenceIds: [],
      },
      userFit: {
        score: definition.smartScore,
        confidence: 0.95,
        evidenceIds: [],
      },
    },

    pareto: {
      status: "frontier",
      dominatedByHotelIds: [],
      dominatesHotelIds: [],
      reasonCodes: ["pareto-frontier"],
    },

    risk: {
      score: 8,
      level: "low",
      factorCodes: [],
      evidenceIds: [`risk:${definition.hotelId}`],
    },

    exclusionReasonCodes: [],
  } as unknown as SmartStayBudgetIntentCandidateV2 &
    SmartStayRecommendationCandidateV2;

  return candidate;
}

function buildMarketCandidates(
  preferenceId: SmartStayUtilityPreferenceIdV2,
  totalBudget = 1500
) {
  const definitions: CandidateDefinition[] = [
    {
      hotelId: "cheap-good",
      totalCost: 150,
      smartScore: 98,
      utilityScore: 98,
      qualityScore: 91,
      comfortScore: 78,
      locationScore: 97,
      stars: 3,
    },
    {
      hotelId: "value-four-star",
      totalCost: 300,
      smartScore: 93,
      qualityScore: 92,
      comfortScore: 87,
      locationScore: 94,
      stars: 4,
    },
    {
      hotelId: "premium-value",
      totalCost: 480,
      smartScore: 94,
      qualityScore: 94,
      comfortScore: 92,
      locationScore: 93,
      stars: 4,
    },
    {
      hotelId: "premium-central",
      totalCost: 650,
      smartScore: 92,
      qualityScore: 94,
      comfortScore: 93,
      locationScore: 98,
      stars: 4,
    },
    {
      hotelId: "luxury-saving",
      totalCost: 800,
      smartScore: 91,
      utilityScore: 91,
      qualityScore: 96,
      comfortScore: 96,
      locationScore: 95,
      flexibilityScore: 95,
      stars: 5,
    },
    {
      hotelId: "luxury-best",
      totalCost: 1200,
      smartScore: 94,
      utilityScore: 94,
      qualityScore: 98,
      comfortScore: 99,
      locationScore: 97,
      flexibilityScore: 97,
      stars: 5,
    },
    {
      hotelId: "luxury-expensive-weaker",
      totalCost: 1400,
      smartScore: 90,
      utilityScore: 90,
      qualityScore: 95,
      comfortScore: 94,
      locationScore: 92,
      flexibilityScore: 94,
      stars: 5,
    },
    {
      hotelId: "standard-reference",
      totalCost: 550,
      smartScore: 88,
      qualityScore: 88,
      comfortScore: 82,
      locationScore: 90,
      stars: 3,
    },
  ];

  return definitions.map((definition) =>
    createCandidate(definition, preferenceId, totalBudget)
  );
}

function attachIntent(
  candidates: Array<
    SmartStayBudgetIntentCandidateV2 & SmartStayRecommendationCandidateV2
  >,
  preferenceId: SmartStayUtilityPreferenceIdV2,
  totalBudget = 1500
) {
  const budgetIntent = evaluateBudgetIntentV2({
    candidates,
    totalBudget,
    nights: 1,
    rooms: 1,
    preferenceId,
  });
  const byHotelId = new Map<string, SmartStayBudgetIntentCandidateEvaluationV2>(
    budgetIntent.candidateEvaluations.map((evaluation) => [
      evaluation.hotelId,
      evaluation,
    ])
  );

  return {
    budgetIntent,
    recommendationCandidates: candidates.map((candidate) => ({
      ...candidate,
      budgetIntent: byHotelId.get(candidate.hotelId) ?? null,
    })) as SmartStayRecommendationCandidateV2[],
  };
}

test(
  "Budget Intent recognizes a luxury Maximum Comfort search relative to the real market",
  () => {
    const candidates = buildMarketCandidates("maximum-comfort");
    const result = evaluateBudgetIntentV2({
      candidates,
      totalBudget: 1500,
      nights: 1,
      rooms: 1,
      preferenceId: "maximum-comfort",
    });

    assert.equal(result.status, "strong-data");
    assert.equal(result.level, "luxury");
    assert.equal(result.policy.experienceTargetRequired, true);
    assert.equal(result.policy.savingRequiresExperienceParity, true);
    assert.ok((result.market.budgetToMedianRatio ?? 0) > 2);
    assert.equal(result.targetExperienceTier, "luxury");
    assert.equal(result.budgetPerRoomNight, 1500);
    assert.equal(
      result.candidateEvaluations.every(
        (evaluation) =>
          evaluation.preferenceId === "maximum-comfort"
      ),
      true
    );
    assert.ok(
      result.candidateEvaluations.some(
        (evaluation) =>
          evaluation.marketPositionPercentile === 100
      )
    );
  }
);

test(
  "Maximum Comfort selects the strongest coherent experience instead of the cheapest high-utility stay",
  () => {
    const candidates = buildMarketCandidates("maximum-comfort");
    const { recommendationCandidates } = attachIntent(
      candidates,
      "maximum-comfort"
    );
    const result = evaluateRecommendationRolesV2(recommendationCandidates);

    assert.equal(result.bestChoiceHotelId, "luxury-best");
    assert.notEqual(result.bestChoiceHotelId, "cheap-good");
  }
);

test(
  "Maximum Comfort restricts Best Choice to the aspirational luxury market cohort",
  () => {
    const definitions: CandidateDefinition[] = [
      {
        hotelId: "luxury-no-compromise",
        totalCost: 1137,
        smartScore: 97,
        utilityScore: 97,
        qualityScore: 98,
        comfortScore: 98,
        locationScore: 99,
        flexibilityScore: 97,
        stars: 5,
      },
      {
        hotelId: "luxury-premium-value",
        totalCost: 363,
        smartScore: 98,
        utilityScore: 98,
        qualityScore: 98,
        comfortScore: 98,
        locationScore: 99,
        flexibilityScore: 99,
        stars: 5,
      },
      {
        hotelId: "premium-reference-1",
        totalCost: 180,
        smartScore: 88,
        qualityScore: 90,
        comfortScore: 85,
        locationScore: 91,
        stars: 4,
      },
      {
        hotelId: "premium-reference-2",
        totalCost: 240,
        smartScore: 89,
        qualityScore: 91,
        comfortScore: 86,
        locationScore: 92,
        stars: 4,
      },
      {
        hotelId: "premium-reference-3",
        totalCost: 300,
        smartScore: 90,
        qualityScore: 92,
        comfortScore: 87,
        locationScore: 93,
        stars: 4,
      },
      {
        hotelId: "premium-reference-4",
        totalCost: 450,
        smartScore: 91,
        qualityScore: 93,
        comfortScore: 89,
        locationScore: 94,
        stars: 4,
      },
      {
        hotelId: "luxury-reference",
        totalCost: 700,
        smartScore: 92,
        qualityScore: 95,
        comfortScore: 94,
        locationScore: 95,
        stars: 5,
      },
      {
        hotelId: "luxury-expensive-weaker",
        totalCost: 1400,
        smartScore: 88,
        utilityScore: 88,
        qualityScore: 90,
        comfortScore: 88,
        locationScore: 90,
        flexibilityScore: 90,
        stars: 5,
      },
    ];

    const candidates = definitions.map(
      (definition) =>
        createCandidate(
          definition,
          "maximum-comfort",
          1500
        )
    );
    const {
      budgetIntent,
      recommendationCandidates,
    } = attachIntent(
      candidates,
      "maximum-comfort",
      1500
    );
    const result =
      evaluateRecommendationRolesV2(
        recommendationCandidates
      );
    const noCompromiseIntent =
      budgetIntent.candidateEvaluations.find(
        (evaluation) =>
          evaluation.hotelId ===
          "luxury-no-compromise"
      );
    const premiumValueIntent =
      budgetIntent.candidateEvaluations.find(
        (evaluation) =>
          evaluation.hotelId ===
          "luxury-premium-value"
      );
    const bestChoice =
      result.picks.find(
        (pick) =>
          pick.role === "best-choice" &&
          pick.primaryInGroup
      );

    assert.equal(
      result.bestChoiceHotelId,
      "luxury-no-compromise"
    );
    assert.ok(
      (noCompromiseIntent
        ?.marketPositionPercentile ??
        0) >
      (premiumValueIntent
        ?.marketPositionPercentile ??
        0)
    );
    assert.equal(
      noCompromiseIntent?.meetsAspirationalMarketFloor,
      true
    );
    assert.equal(
      premiumValueIntent?.meetsAspirationalMarketFloor,
      false
    );
    assert.equal(
      premiumValueIntent?.bestChoiceEligible,
      false
    );
    assert.ok(
      bestChoice?.reasonCodes.includes(
        "recommendation-luxury-aspirational-cohort"
      )
    );
    assert.notEqual(
      result.bestChoiceHotelId,
      "luxury-expensive-weaker"
    );
  }
);

test(
  "Maximum Comfort rejects a large saving that leaves the target experience tier",
  () => {
    const candidates = buildMarketCandidates("maximum-comfort");
    const { recommendationCandidates } = attachIntent(
      candidates,
      "maximum-comfort"
    );
    const result = evaluateRecommendationRolesV2(recommendationCandidates);
    const saving = result.picks.find(
      (pick) =>
        pick.role === "best-sensible-saving" &&
        pick.primaryInGroup
    );

    assert.equal(result.bestChoiceHotelId, "luxury-best");
    assert.equal(saving?.hotelId, "luxury-saving");
    assert.notEqual(saving?.hotelId, "cheap-good");
  }
);

test(
  "Balanced preserves price-quality behavior even when the budget is high",
  () => {
    const candidates = buildMarketCandidates("balanced");
    const { budgetIntent, recommendationCandidates } = attachIntent(
      candidates,
      "balanced"
    );
    const result = evaluateRecommendationRolesV2(recommendationCandidates);

    assert.equal(budgetIntent.policy.active, false);
    assert.equal(
      budgetIntent.candidateEvaluations.every(
        (evaluation) => evaluation.intentAdjustedScore === null
      ),
      true
    );
    assert.equal(result.bestChoiceHotelId, "cheap-good");
  }
);

test(
  "Maximum Comfort does not blindly choose the most expensive hotel",
  () => {
    const candidates = buildMarketCandidates("maximum-comfort");
    const { recommendationCandidates } = attachIntent(
      candidates,
      "maximum-comfort"
    );
    const result = evaluateRecommendationRolesV2(recommendationCandidates);

    assert.equal(result.bestChoiceHotelId, "luxury-best");
    assert.notEqual(
      result.bestChoiceHotelId,
      "luxury-expensive-weaker"
    );
  }
);


test(
  "Market Context interprets the same total budget differently across stay duration",
  () => {
    const candidates =
      buildMarketCandidates(
        "maximum-comfort"
      );

    const observation:
      SmartStayMarketContextObservationV2 = {
        id:
          "florence-may-market",

        destinationKey:
          "florence-italy",

        currency:
          "EUR",

        stayMonth:
          5,

        segmentKey:
          "overall",

        distribution: {
          sampleSize:
            80,

          minimum:
            90,

          firstQuartile:
            170,

          median:
            250,

          thirdQuartile:
            380,

          ninetiethPercentile:
            650,

          maximum:
            1200,
        },

        seasonalIndex:
          1.32,

        source:
          "local-memory",

        confidence:
          0.88,

        observedAt:
          null,

        leadTimeDays:
          45,
      };

    const marketContext =
      evaluateMarketContextV2({
        candidates:
          [],

        totalBudget:
          1500,

        nights:
          5,

        rooms:
          1,

        destinationKey:
          "Florence Italy",

        currency:
          "EUR",

        checkIn:
          "2026-05-15",

        mode:
          "local-only",

        observations: [
          observation,
        ],
      });

    const result =
      evaluateBudgetIntentV2({
        candidates,

        totalBudget:
          1500,

        nights:
          5,

        rooms:
          1,

        preferenceId:
          "maximum-comfort",

        marketContext,
      });

    assert.equal(
      result.budgetPerRoomNight,
      300
    );

    assert.equal(
      result.market.basis,
      "per-room-night"
    );

    assert.equal(
      result.market.source,
      "local-memory"
    );

    assert.equal(
      result.market.seasonalIndex,
      1.32
    );

    assert.equal(
      result.level,
      "balanced"
    );

    assert.notEqual(
      result.level,
      "luxury"
    );
  }
);

test(
  "Budget Intent and recommendation roles remain deterministic when provider order changes",
  () => {
    const candidates = buildMarketCandidates("maximum-comfort");
    const first = attachIntent(candidates, "maximum-comfort");
    const second = attachIntent(
      [...candidates].reverse(),
      "maximum-comfort"
    );
    const firstRoles = evaluateRecommendationRolesV2(
      first.recommendationCandidates
    );
    const secondRoles = evaluateRecommendationRolesV2(
      second.recommendationCandidates
    );

    assert.deepEqual(first.budgetIntent, second.budgetIntent);
    assert.deepEqual(firstRoles, secondRoles);
  }
);
