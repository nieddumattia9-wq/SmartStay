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
  priceValue: 0.26,
  quality: 0.22,
  location: 0.18,
  comfort: 0.13,
  flexibility: 0.08,
  categoryFit: 0.05,
  userFit: 0.08,
};

function candidate({
  hotelId,
  smartScore,
  totalCost,
  paretoStatus,
  preferenceId = "balanced",
  refundable = true,
  experienceScore,
  experienceTier,
  experienceTierRank,
  comfortScore,
}: {
  hotelId: string;
  smartScore: number;
  totalCost: number;
  paretoStatus: "frontier" | "dominated" | "unknown";
  preferenceId?: SmartStayUtilityPreferenceIdV2;
  refundable?: boolean;
  experienceScore?: number;
  experienceTier?:
    | "essential"
    | "standard"
    | "premium"
    | "luxury";
  experienceTierRank?: number;
  comfortScore?: number;
}): SmartStayRecommendationCandidateV2 {
  const budgetTotal = 500;
  const overageAmount = Math.max(totalCost - budgetTotal, 0);

  return {
    hotelId,
    eligibleForPrimaryRanking: true,
    smartScore,

    utility: {
      hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      preference: {
        id: preferenceId,
        selectedIndex:
          selectedIndexByPreference[
            preferenceId
          ],
        source: "default",
        weights,
      },
      rawUtilityScore: smartScore,
      utilityScore: smartScore,
      scoreConfidence: 0.95,
      evidenceCoverage: 0.95,
      availableDimensionCodes: Object.keys(weights),
      unavailableDimensionCodes: [],
      contributions: [],
      warningCodes: [],
      evidenceIds: [`utility:${hotelId}`],
    },

    pareto: {
      status: paretoStatus,
      dominatedByHotelIds:
        paretoStatus === "dominated"
          ? ["pareto-reference"]
          : [],
      dominatesHotelIds: [],
      reasonCodes: [`pareto:${paretoStatus}`],
    },

    risk: {
      score: 10,
      level: "low",
      factorCodes: [],
      evidenceIds: [`risk:${hotelId}`],
    },

    offerSelection: {
      hotelId,
      primary: null,
      offers: [],
      alternativeCount: 0,
      selectionMode: "lowest-price",
      selectedOffer: {
        hotelId,
        offerId: "offer-1",
        provider: "LiteAPI",
        roomName: "Standard Room",
        amount: totalCost,
        currency: "EUR",
        completeness: "reported-complete",
        bookable: true,
        refundable,
        freeCancellationUntil:
          refundable
            ? "2026-08-07T00:00:00Z"
            : null,
        cancellationPolicyKnown: true,
        taxesIncluded: true,
        excludedTaxes: 0,
        unknownTaxes: 0,
        roomTier: "standard",
        roomTierRank: 2,
        selectionMode: "lowest-price",
        reasonCodes: [
          "test-offer-selection",
        ],
      },
      reasonCodes: [
        "test-offer-selection",
      ],
    },

    ...(
      experienceScore !== undefined &&
      experienceTier !== undefined &&
      experienceTierRank !== undefined
        ? {
            budgetIntent: {
              hotelId,
              preferenceId,
              intentAdjustedScore: smartScore,
              experienceScore,
              experienceTier,
              experienceTierRank,
              marketPositionPercentile: 80,
              minimumBestChoiceMarketPositionPercentile: null,
              meetsAspirationalMarketFloor: true,
              bestChoiceEligible: true,
              savingEligible: true,
              maximumSavingExperienceLoss: 100,
              minimumSavingTierRank: 0,
              savingRequiresExperienceParity: false,
              intentLevel: "balanced",
              experienceGapFromBest: 0,
              reasonCodes: [
                "test-budget-intent",
              ],
            },
          }
        : {}
    ),

    ...(
      comfortScore !== undefined
        ? {
            comfortFlexibility: {
              hotelId,
              status: "strong-data",
              eligibleForPrimaryRanking: true,
              mandatoryRequirements: {
                satisfied: true,
              },
              dimensions: {
                comfort: {
                  score: comfortScore,
                  confidence: 0.95,
                  evidenceIds: [
                    `comfort:${hotelId}`,
                  ],
                },
                practicality: {
                  score: comfortScore,
                  confidence: 0.95,
                  evidenceIds: [
                    `practicality:${hotelId}`,
                  ],
                },
                flexibility: {
                  score:
                    refundable
                      ? 100
                      : 60,
                  confidence: 0.95,
                  evidenceIds: [
                    `flexibility:${hotelId}`,
                  ],
                },
              },
              evidenceIds: [
                `comfort-flexibility:${hotelId}`,
              ],
            },
          }
        : {}
    ),

    priceValue: {
      hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      totalCost,
      currency: "EUR",
      costCompleteness: "reported-complete",
      budget: {
        provided: true,
        total: budgetTotal,
        withinBudget: totalCost <= budgetTotal,
        differenceAmount: budgetTotal - totalCost,
        overageAmount,
        overageRatio: overageAmount / budgetTotal,
        utilizationRatio: totalCost / budgetTotal,
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
      evidenceIds: [`price:${hotelId}`],
    },
  } as unknown as SmartStayRecommendationCandidateV2;
}

test(
  "Best Choice uses the highest SmartScore across all eligible within-budget candidates",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "la-maison",
        smartScore: 85,
        totalCost: 323,
        paretoStatus: "frontier",
      }),
      candidate({
        hotelId: "hotel-ariele",
        smartScore: 95,
        totalCost: 370,
        paretoStatus: "dominated",
      }),
      candidate({
        hotelId: "fh55",
        smartScore: 92,
        totalCost: 326,
        paretoStatus: "frontier",
      }),
    ]);

    assert.equal(
      result.bestChoiceHotelId,
      "hotel-ariele"
    );

    const bestChoice = result.picks.find(
      (pick) =>
        pick.role === "best-choice" &&
        pick.primaryInGroup
    );

    assert.equal(
      bestChoice?.metrics.displayedSmartScore,
      95
    );

    assert.equal(
      result.evaluations
        .filter(
          (evaluation) =>
            evaluation.metrics.withinBudget === true
        )
        .some(
          (evaluation) =>
            (evaluation.metrics.displayedSmartScore ?? -1) >
            (bestChoice?.metrics.displayedSmartScore ?? -1)
        ),
      false
    );
  }
);

test(
  "Best Sensible Saving remains available for a large saving with acceptable quality loss",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "hotel-ariele",
        smartScore: 95,
        totalCost: 370,
        paretoStatus: "dominated",
      }),
      candidate({
        hotelId: "plus-florence",
        smartScore: 81,
        totalCost: 206,
        paretoStatus: "frontier",
      }),
      candidate({
        hotelId: "la-maison",
        smartScore: 85,
        totalCost: 323,
        paretoStatus: "frontier",
      }),
    ]);

    assert.equal(
      result.bestChoiceHotelId,
      "hotel-ariele"
    );

    const saving = result.picks.find(
      (pick) =>
        pick.role === "best-sensible-saving" &&
        pick.primaryInGroup
    );

    assert.equal(
      saving?.hotelId,
      "plus-florence"
    );

    assert.equal(
      saving?.comparisonTargetHotelId,
      "hotel-ariele"
    );

    assert.equal(
      saving?.metrics.priceDifferenceAmount,
      -164
    );

    assert.equal(
      saving?.metrics.displayedSmartScore,
      81
    );
  }
);

test(
  "Best Sensible Saving rejects a trivial discount",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "best",
        smartScore: 95,
        totalCost: 370,
        paretoStatus: "frontier",
      }),
      candidate({
        hotelId: "trivial-saving",
        smartScore: 88,
        totalCost: 350,
        paretoStatus: "frontier",
      }),
    ]);

    assert.equal(
      result.picks.some(
        (pick) =>
          pick.role === "best-sensible-saving"
      ),
      false
    );
  }
);

test(
  "Balanced allows a meaningful non-refundable saving and marks the flexibility trade-off",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "balanced-best",
        smartScore: 95,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: true,
      }),
      candidate({
        hotelId: "balanced-saving",
        smartScore: 88,
        totalCost: 375,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: false,
      }),
    ]);

    const saving = result.picks.find(
      (pick) =>
        pick.role ===
          "best-sensible-saving"
    );

    assert.equal(
      saving?.hotelId,
      "balanced-saving"
    );

    assert.equal(
      saving?.metrics
        .offerComparisonToBestChoice
        ?.comparable,
      false
    );

    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-less-flexibility"
      )
    );

    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-non-refundable-tradeoff"
      )
    );
  }
);

test(
  "Balanced rejects a modest non-refundable saving below its flexibility threshold",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "balanced-best",
        smartScore: 95,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: true,
      }),
      candidate({
        hotelId: "balanced-small-saving",
        smartScore: 90,
        totalCost: 410,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: false,
      }),
    ]);

    assert.equal(
      result.picks.some(
        (pick) =>
          pick.role ===
            "best-sensible-saving"
      ),
      false
    );
  }
);

test(
  "Savings accepts the same non-refundable discount that Balanced rejects",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "savings-best",
        smartScore: 95,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "savings",
        refundable: true,
      }),
      candidate({
        hotelId: "savings-alternative",
        smartScore: 90,
        totalCost: 410,
        paretoStatus: "frontier",
        preferenceId: "savings",
        refundable: false,
      }),
    ]);

    const saving = result.picks.find(
      (pick) =>
        pick.role ===
          "best-sensible-saving"
    );

    assert.equal(
      saving?.hotelId,
      "savings-alternative"
    );

    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-flexibility-policy:savings"
      )
    );
  }
);

test(
  "Maximum Comfort rejects a non-refundable saving even when the discount is large",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "maximum-comfort-best",
        smartScore: 95,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "maximum-comfort",
        refundable: true,
      }),
      candidate({
        hotelId: "maximum-comfort-saving",
        smartScore: 85,
        totalCost: 300,
        paretoStatus: "frontier",
        preferenceId: "maximum-comfort",
        refundable: false,
      }),
    ]);

    assert.equal(
      result.picks.some(
        (pick) =>
          pick.role ===
            "best-sensible-saving"
      ),
      false
    );
  }
);

test(
  "Comparable booking conditions keep the Best Sensible Saving role at the normal threshold",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "comparable-best",
        smartScore: 95,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: true,
      }),
      candidate({
        hotelId: "comparable-saving",
        smartScore: 90,
        totalCost: 410,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: true,
      }),
    ]);

    const saving = result.picks.find(
      (pick) =>
        pick.role ===
          "best-sensible-saving"
    );

    assert.equal(
      saving?.hotelId,
      "comparable-saving"
    );

    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-comparable-offer-conditions"
      )
    );

    assert.equal(
      saving?.metrics
        .offerComparisonToBestChoice
        ?.comparable,
      true
    );
  }
);


test(
  "Comfort rejects a non-refundable saving that also causes a major experience downgrade",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "comfort-best",
        smartScore: 96,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "comfort",
        refundable: true,
        experienceScore: 96,
        experienceTier: "luxury",
        experienceTierRank: 4,
        comfortScore: 100,
      }),
      candidate({
        hotelId: "comfort-major-downgrade",
        smartScore: 89,
        totalCost: 250,
        paretoStatus: "frontier",
        preferenceId: "comfort",
        refundable: false,
        experienceScore: 72,
        experienceTier: "standard",
        experienceTierRank: 2,
        comfortScore: 60,
      }),
    ]);

    assert.equal(
      result.picks.some(
        (pick) =>
          pick.role ===
            "best-sensible-saving"
      ),
      false
    );
  }
);

test(
  "Comfort allows a large non-refundable saving when the experience remains coherent",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "comfort-best",
        smartScore: 96,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "comfort",
        refundable: true,
        experienceScore: 94,
        experienceTier: "luxury",
        experienceTierRank: 4,
        comfortScore: 100,
      }),
      candidate({
        hotelId: "comfort-coherent-saving",
        smartScore: 89,
        totalCost: 325,
        paretoStatus: "frontier",
        preferenceId: "comfort",
        refundable: false,
        experienceScore: 84,
        experienceTier: "premium",
        experienceTierRank: 3,
        comfortScore: 92,
      }),
    ]);

    const saving = result.picks.find(
      (pick) =>
        pick.role ===
          "best-sensible-saving"
    );

    assert.equal(
      saving?.hotelId,
      "comfort-coherent-saving"
    );

    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-experience-policy:comfort"
      )
    );

    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-experience-coherent"
      )
    );
  }
);

test(
  "Balanced still allows a one-tier experience downgrade when the saving is meaningful",
  () => {
    const result = evaluateRecommendationRolesV2([
      candidate({
        hotelId: "balanced-best",
        smartScore: 95,
        totalCost: 500,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: true,
        experienceScore: 90,
        experienceTier: "premium",
        experienceTierRank: 3,
        comfortScore: 100,
      }),
      candidate({
        hotelId: "balanced-coherent-saving",
        smartScore: 88,
        totalCost: 375,
        paretoStatus: "frontier",
        preferenceId: "balanced",
        refundable: false,
        experienceScore: 75,
        experienceTier: "standard",
        experienceTierRank: 2,
        comfortScore: 85,
      }),
    ]);

    assert.equal(
      result.picks.find(
        (pick) =>
          pick.role ===
            "best-sensible-saving"
      )?.hotelId,
      "balanced-coherent-saving"
    );
  }
);
