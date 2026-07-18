import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateRecommendationRolesV2,
  type SmartStayRecommendationCandidateV2,
} from "../../src/engine-v2/recommendation/recommendationRolesEngine";

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
}: {
  hotelId: string;
  smartScore: number;
  totalCost: number;
  paretoStatus: "frontier" | "dominated" | "unknown";
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
        id: "balanced",
        selectedIndex: 2,
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