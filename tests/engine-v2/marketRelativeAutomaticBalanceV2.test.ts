import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveMarketRelativeAutomaticPreferenceV2,
} from "../../src/engine-v2/intent/marketRelativePreferenceV2";

import type {
  SmartStayBudgetIntentEvaluationV2,
  SmartStayBudgetIntentLevelV2,
  SmartStayBudgetIntentStatusV2,
} from "../../src/engine-v2/intent/budgetIntentEngine";

function budgetIntent(
  overrides: {
    status?: SmartStayBudgetIntentStatusV2;
    level?: SmartStayBudgetIntentLevelV2;
    budgetPerRoomNight?: number | null;
    marketMedian?: number | null;
    marketSampleSize?: number;
    marketConfidence?: number;
    marketSource?:
      SmartStayBudgetIntentEvaluationV2["market"]["source"];
    budgetPercentile?: number | null;
    budgetToMedianRatio?: number | null;
  } = {}
): SmartStayBudgetIntentEvaluationV2 {
  const status =
    overrides.status ??
    "strong-data";

  const level =
    overrides.level ??
    "balanced";

  const budgetPerRoomNight =
    overrides.budgetPerRoomNight ??
    166.67;

  const marketMedian =
    overrides.marketMedian ??
    170;

  const marketSampleSize =
    overrides.marketSampleSize ??
    12;

  const marketConfidence =
    overrides.marketConfidence ??
    0.8;

  return {
    status,
    preferenceId:
      "balanced",
    level,
    totalBudget:
      500,
    nights:
      3,
    rooms:
      1,
    budgetPerRoomNight,
    market: {
      basis:
        "per-room-night",
      source:
        overrides.marketSource ??
        (
          status === "unavailable"
            ? "candidate-fallback"
            : "current-search"
        ),
      confidence:
        marketConfidence,
      seasonalIndex:
        null,
      currency:
        "EUR",
      sampleSize:
        marketSampleSize,
      minimum:
        marketMedian === null
          ? null
          : marketMedian * 0.5,
      firstQuartile:
        marketMedian === null
          ? null
          : marketMedian * 0.75,
      median:
        marketMedian,
      thirdQuartile:
        marketMedian === null
          ? null
          : marketMedian * 1.25,
      ninetiethPercentile:
        marketMedian === null
          ? null
          : marketMedian * 1.7,
      maximum:
        marketMedian === null
          ? null
          : marketMedian * 2,
      budgetPercentile:
        overrides.budgetPercentile ??
        50,
      budgetToMedianRatio:
        overrides.budgetToMedianRatio ??
        (
          marketMedian === null ||
          marketMedian <= 0 ||
          budgetPerRoomNight === null
            ? null
            : budgetPerRoomNight /
              marketMedian
        ),
      budgetToUpperQuartileRatio:
        null,
    },
    policy: {
      active:
        status !== "unavailable",
      experiencePriority:
        0.5,
      maximumBestChoiceExperienceLoss:
        10,
      maximumSavingExperienceLoss:
        10,
      minimumBestChoiceTierRank:
        0,
      experienceTargetRequired:
        false,
      savingRequiresExperienceParity:
        false,
    },
    bestAvailableExperienceScore:
      null,
    targetExperienceFloor:
      null,
    targetExperienceTier:
      "unknown",
    minimumBestChoiceMarketPositionPercentile:
      null,
    candidateEvaluations:
      [],
    reasonCodes:
      [],
  };
}

test(
  "The same total budget becomes Comfort when it has strong local purchasing power",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "balanced",
        selectedIndex:
          2,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            level:
              "premium",
            marketMedian:
              85,
            budgetToMedianRatio:
              1.96,
          }),
      });

    assert.equal(
      result.effectivePreferenceId,
      "comfort"
    );

    assert.equal(
      result.source,
      "market-strong-data"
    );
  }
);

test(
  "The same total budget becomes Maximum Savings in an expensive destination",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "balanced",
        selectedIndex:
          2,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            level:
              "constrained",
            marketMedian:
              350,
            budgetPercentile:
              10,
            budgetToMedianRatio:
              0.48,
          }),
      });

    assert.equal(
      result.effectivePreferenceId,
      "maximum-savings"
    );

    assert.equal(
      result.marketIntentLevel,
      "constrained"
    );
  }
);

test(
  "Strong luxury purchasing power can select Maximum Comfort without treating spend as the goal",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "balanced",
        selectedIndex:
          2,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            level:
              "luxury",
            marketMedian:
              70,
            budgetPercentile:
              98,
            budgetToMedianRatio:
              2.38,
          }),
      });

    assert.equal(
      result.effectivePreferenceId,
      "maximum-comfort"
    );

    assert.match(
      result.explanation,
      /within budget/i
    );
  }
);

test(
  "Usable but weaker market data moves only one preference step",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "maximum-comfort",
        selectedIndex:
          0,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            status:
              "usable",
            level:
              "constrained",
            marketMedian:
              350,
            marketSampleSize:
              4,
            marketConfidence:
              0.42,
          }),
      });

    assert.equal(
      result.effectivePreferenceId,
      "comfort"
    );

    assert.equal(
      result.reasonCodes.includes(
        "market-relative-balance:conservative-one-step-adjustment"
      ),
      true
    );
  }
);

test(
  "Manual preference is always preserved",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "maximum-comfort",
        selectedIndex:
          0,
        preferenceSource:
          "manual",
        budgetIntent:
          budgetIntent({
            level:
              "constrained",
            marketMedian:
              350,
          }),
      });

    assert.equal(
      result.effectivePreferenceId,
      "maximum-comfort"
    );

    assert.equal(
      result.source,
      "manual"
    );

    assert.equal(
      result.wasAdjusted,
      false
    );
  }
);

test(
  "Missing market evidence preserves the existing automatic fallback",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "savings",
        selectedIndex:
          3,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            status:
              "unavailable",
            level:
              "balanced",
            budgetPerRoomNight:
              120,
            marketMedian:
              null,
            marketSampleSize:
              0,
            marketConfidence:
              0,
          }),
        fallbackExplanation:
          "Existing automatic balance.",
      });

    assert.equal(
      result.effectivePreferenceId,
      "savings"
    );

    assert.equal(
      result.source,
      "absolute-fallback"
    );

    assert.equal(
      result.explanation,
      "Existing automatic balance."
    );
  }
);

test(
  "The existing extreme budget guard remains Maximum Savings even in a cheap destination",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "maximum-comfort",
        selectedIndex:
          0,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            level:
              "luxury",
            budgetPerRoomNight:
              25,
            marketMedian:
              12,
            budgetPercentile:
              99,
            budgetToMedianRatio:
              2.08,
          }),
      });

    assert.equal(
      result.effectivePreferenceId,
      "maximum-savings"
    );

    assert.equal(
      result.source,
      "absolute-extreme-budget"
    );
  }
);

test(
  "Candidate-only fallback prices do not recalibrate the automatic balance",
  () => {
    const result =
      resolveMarketRelativeAutomaticPreferenceV2({
        preferenceId:
          "comfort",
        selectedIndex:
          1,
        preferenceSource:
          "automatic",
        budgetIntent:
          budgetIntent({
            status:
              "strong-data",
            level:
              "constrained",
            marketSource:
              "candidate-fallback",
          }),
        fallbackExplanation:
          "Existing automatic balance.",
      });

    assert.equal(
      result.effectivePreferenceId,
      "comfort"
    );

    assert.equal(
      result.source,
      "absolute-fallback"
    );
  }
);

test(
  "Market-relative preference resolution is deterministic",
  () => {
    const input = {
      preferenceId:
        "balanced" as const,
      selectedIndex:
        2,
      preferenceSource:
        "automatic" as const,
      budgetIntent:
        budgetIntent({
          level:
            "premium",
          marketMedian:
            85,
        }),
    };

    assert.deepEqual(
      resolveMarketRelativeAutomaticPreferenceV2(
        input
      ),
      resolveMarketRelativeAutomaticPreferenceV2(
        input
      )
    );
  }
);
