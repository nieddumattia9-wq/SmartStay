import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateRecommendationRolesV2,
  type SmartStayRecommendationCandidateV2,
} from "../../src/engine-v2/recommendation/recommendationRolesEngine";

import type {
  SmartStayUtilityPreferenceIdV2,
} from "../../src/engine-v2/utility/userUtilityEngine";

const selectedIndexByPreference: Readonly<
  Record<SmartStayUtilityPreferenceIdV2, number>
> = {
  "maximum-comfort": 0,
  comfort: 1,
  balanced: 2,
  savings: 3,
  "maximum-savings": 4,
};

const weights = {
  priceValue: 0.2,
  quality: 0.24,
  location: 0.16,
  comfort: 0.2,
  flexibility: 0.08,
  categoryFit: 0.04,
  userFit: 0.08,
};

type CandidateInput = {
  hotelId: string;
  preferenceId: SmartStayUtilityPreferenceIdV2;
  totalCost: number;
  smartScore: number;
  intentAdjustedScore?: number | null;
  experienceScore?: number | null;
  experienceTier?: "essential" | "standard" | "premium" | "luxury" | "unknown";
  marketPositionPercentile?: number | null;
  bestChoiceEligible?: boolean;
  meetsAspirationalMarketFloor?: boolean;
  intentLevel?: "constrained" | "value" | "balanced" | "premium" | "luxury";
  scoreConfidence?: number;
  evidenceCoverage?: number;
  riskScore?: number;
};

function candidate(input: CandidateInput): SmartStayRecommendationCandidateV2 {
  const budgetTotal = 1500;
  const experienceTier = input.experienceTier ?? "premium";
  const tierRank = {
    unknown: 0,
    essential: 1,
    standard: 2,
    premium: 3,
    luxury: 4,
  }[experienceTier];
  const bestChoiceEligible = input.bestChoiceEligible ?? true;
  const meetsAspirationalMarketFloor =
    input.meetsAspirationalMarketFloor ?? true;
  const experienceScore = input.experienceScore ?? null;
  const scoreConfidence = input.scoreConfidence ?? 0.95;
  const evidenceCoverage = input.evidenceCoverage ?? 0.95;
  const riskScore = input.riskScore ?? 10;

  return {
    hotelId: input.hotelId,
    eligibleForPrimaryRanking: true,
    smartScore: input.smartScore,

    utility: {
      hotelId: input.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      preference: {
        id: input.preferenceId,
        selectedIndex: selectedIndexByPreference[input.preferenceId],
        source: "manual",
        weights,
      },
      rawUtilityScore: input.smartScore,
      utilityScore: input.smartScore,
      scoreConfidence,
      evidenceCoverage,
      availableDimensionCodes: Object.keys(weights),
      unavailableDimensionCodes: [],
      contributions: [],
      warningCodes: [],
      evidenceIds: [`utility:${input.hotelId}`],
    },

    pareto: {
      status: "frontier",
      dominatedByHotelIds: [],
      dominatesHotelIds: [],
      reasonCodes: ["pareto:frontier"],
    },

    risk: {
      score: riskScore,
      level: "low",
      factorCodes: [],
      evidenceIds: [`risk:${input.hotelId}`],
    },

    priceValue: {
      hotelId: input.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      totalCost: input.totalCost,
      currency: "EUR",
      costCompleteness: "reported-complete",
      budget: {
        provided: true,
        total: budgetTotal,
        withinBudget: input.totalCost <= budgetTotal,
        differenceAmount: budgetTotal - input.totalCost,
        overageAmount: Math.max(input.totalCost - budgetTotal, 0),
        overageRatio: Math.max(input.totalCost - budgetTotal, 0) / budgetTotal,
        utilizationRatio: input.totalCost / budgetTotal,
        fitScore: 90,
      },
      peerBaseline: {
        available: false,
        mode: "unavailable",
        assignedSampleSize: 0,
        eligibleReferenceCount: 0,
        excludedCurrencyMismatchCount: 0,
        excludedMissingPriceCount: 0,
        minimum: null,
        firstQuartile: null,
        median: null,
        thirdQuartile: null,
        maximum: null,
        confidence: 0,
        referenceHotelIds: [],
        evidenceIds: [],
      },
      relativePrice: {
        ratioToMedian: null,
        savingAgainstMedian: null,
        savingPercentageAgainstMedian: null,
        pricePercentile: null,
        valueScore: null,
      },
      score: 90,
      confidence: 0.95,
      warningCodes: [],
      evidenceIds: [`price:${input.hotelId}`],
    },

    budgetIntent: {
      hotelId: input.hotelId,
      preferenceId: input.preferenceId,
      intentAdjustedScore: input.intentAdjustedScore ?? null,
      experienceScore,
      experienceTier,
      experienceTierRank: tierRank,
      marketPositionPercentile:
        input.marketPositionPercentile ?? null,
      minimumBestChoiceMarketPositionPercentile:
        input.preferenceId === "maximum-comfort" ? 85 : null,
      meetsAspirationalMarketFloor,
      bestChoiceEligible,
      savingEligible: true,
      maximumSavingExperienceLoss: 5,
      minimumSavingTierRank:
        input.preferenceId === "maximum-comfort" ||
        input.preferenceId === "comfort"
          ? tierRank
          : 0,
      savingRequiresExperienceParity:
        input.preferenceId === "maximum-comfort" ||
        input.preferenceId === "comfort",
      intentLevel: input.intentLevel ?? "premium",
      experienceGapFromBest:
        experienceScore === null ? null : Math.max(98 - experienceScore, 0),
      reasonCodes: [
        `budget-intent-preference:${input.preferenceId}`,
        `experience-tier:${experienceTier}`,
        "experience-floor-satisfied",
        "experience-tier-floor-satisfied",
        meetsAspirationalMarketFloor
          ? "luxury-aspirational-market-floor-satisfied"
          : "luxury-aspirational-market-floor-not-satisfied",
      ],
    },
  } as unknown as SmartStayRecommendationCandidateV2;
}

function maximumComfortCandidates() {
  return [
    candidate({
      hotelId: "rocco-forte",
      preferenceId: "maximum-comfort",
      totalCost: 1137,
      smartScore: 95.4,
      intentAdjustedScore: 95.4,
      experienceScore: 98,
      experienceTier: "luxury",
      marketPositionPercentile: 100,
      intentLevel: "luxury",
    }),
    candidate({
      hotelId: "luxury-900",
      preferenceId: "maximum-comfort",
      totalCost: 900,
      smartScore: 95.3,
      intentAdjustedScore: 95.3,
      experienceScore: 97.8,
      experienceTier: "luxury",
      marketPositionPercentile: 95,
      intentLevel: "luxury",
    }),
    candidate({
      hotelId: "luxury-700",
      preferenceId: "maximum-comfort",
      totalCost: 700,
      smartScore: 95.2,
      intentAdjustedScore: 95.2,
      experienceScore: 97.5,
      experienceTier: "luxury",
      marketPositionPercentile: 90,
      intentLevel: "luxury",
    }),
    candidate({
      hotelId: "golden-tower",
      preferenceId: "maximum-comfort",
      totalCost: 363,
      smartScore: 95.1,
      intentAdjustedScore: 95.1,
      experienceScore: 97.2,
      experienceTier: "luxury",
      marketPositionPercentile: 80,
      bestChoiceEligible: false,
      meetsAspirationalMarketFloor: false,
      intentLevel: "luxury",
    }),
  ];
}

test(
  "Best Choice Group includes a coherent luxury equivalent outside the aspirational floor",
  () => {
    const result = evaluateRecommendationRolesV2(
      maximumComfortCandidates()
    );

    assert.ok(
      result.bestChoiceGroup?.allEquivalentHotelIds.includes(
        "golden-tower"
      )
    );
    assert.ok(
      result.picks.find(
        (pick) => pick.hotelId === "golden-tower"
      )?.reasonCodes.includes(
        "recommendation-luxury-equivalent-outside-aspirational-floor"
      )
    );
  }
);

test(
  "Maximum Comfort orders equivalent Best Choices from higher to lower price",
  () => {
    const result = evaluateRecommendationRolesV2(
      maximumComfortCandidates()
    );

    assert.equal(
      result.bestChoiceGroup?.orderingPolicy,
      "maximum-comfort-price-descending"
    );
    assert.deepEqual(
      result.bestChoiceGroup?.allEquivalentHotelIds,
      [
        "rocco-forte",
        "luxury-900",
        "luxury-700",
        "golden-tower",
      ]
    );
  }
);

test(
  "Best Choice Group exposes at most three choices and keeps further equivalents for the normal list",
  () => {
    const result = evaluateRecommendationRolesV2(
      maximumComfortCandidates()
    );

    assert.deepEqual(
      result.bestChoiceGroup?.visibleHotelIds,
      ["rocco-forte", "luxury-900", "luxury-700"]
    );
    assert.deepEqual(
      result.bestChoiceGroup?.additionalEquivalentHotelIds,
      ["golden-tower"]
    );
  }
);

test(
  "Comfort orders equivalent Best Choices by experience, SmartScore and then price",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "experience-first",
        preferenceId: "comfort",
        totalCost: 600,
        smartScore: 90.1,
        intentAdjustedScore: 90.1,
        experienceScore: 92,
        experienceTier: "premium",
      }),
      candidate({
        hotelId: "same-score-expensive",
        preferenceId: "comfort",
        totalCost: 800,
        smartScore: 90.4,
        intentAdjustedScore: 90.4,
        experienceScore: 91,
        experienceTier: "premium",
      }),
      candidate({
        hotelId: "same-score-cheaper",
        preferenceId: "comfort",
        totalCost: 700,
        smartScore: 90.4,
        intentAdjustedScore: 90.4,
        experienceScore: 91,
        experienceTier: "premium",
      }),
    ]);

    assert.equal(
      result.bestChoiceGroup?.orderingPolicy,
      "comfort-experience-descending"
    );
    assert.deepEqual(
      result.bestChoiceGroup?.allEquivalentHotelIds,
      [
        "experience-first",
        "same-score-cheaper",
        "same-score-expensive",
      ]
    );
  }
);

test(
  "Balanced and saving preferences order equivalent Best Choices from lower to higher price",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "expensive",
        preferenceId: "balanced",
        totalCost: 500,
        smartScore: 88.4,
      }),
      candidate({
        hotelId: "cheapest",
        preferenceId: "balanced",
        totalCost: 300,
        smartScore: 88.2,
      }),
      candidate({
        hotelId: "middle",
        preferenceId: "balanced",
        totalCost: 400,
        smartScore: 88.1,
      }),
    ]);

    assert.equal(
      result.bestChoiceGroup?.orderingPolicy,
      "value-price-ascending"
    );
    assert.deepEqual(
      result.bestChoiceGroup?.allEquivalentHotelIds,
      ["cheapest", "middle", "expensive"]
    );
  }
);

test(
  "Comfort Best Choice equivalence requires the same experience tier",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "premium-anchor",
        preferenceId: "comfort",
        totalCost: 600,
        smartScore: 91.3,
        intentAdjustedScore: 91.3,
        experienceScore: 91,
        experienceTier: "premium",
      }),
      candidate({
        hotelId: "luxury-different-tier",
        preferenceId: "comfort",
        totalCost: 650,
        smartScore: 91.2,
        intentAdjustedScore: 91.2,
        experienceScore: 92,
        experienceTier: "luxury",
      }),
    ]);

    assert.deepEqual(
      result.bestChoiceGroup?.allEquivalentHotelIds,
      ["premium-anchor"]
    );
  }
);

test(
  "Equivalent Best Choices are not duplicated as Best Sensible Saving and the legacy alias is preserved",
  () => {
    const result = evaluateRecommendationRolesV2(
      maximumComfortCandidates()
    );

    assert.equal(
      result.bestChoiceHotelId,
      result.bestChoiceGroup?.primaryHotelId
    );
    assert.equal(
      result.picks.some(
        (pick) =>
          pick.hotelId === "golden-tower" &&
          pick.role === "best-sensible-saving"
      ),
      false
    );
  }
);

test(
  "Best Choice Group remains deterministic when provider order changes",
  () => {
    const candidates = maximumComfortCandidates();
    const forward = evaluateRecommendationRolesV2(candidates);
    const reversed = evaluateRecommendationRolesV2(
      [...candidates].reverse()
    );

    assert.deepEqual(forward, reversed);
  }
);
