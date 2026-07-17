import assert from "node:assert/strict";
import test from "node:test";

import {
  getSmartStayGoldenScenarioV2,
  type SmartStayGoldenCandidateV2,
  type SmartStayGoldenScenarioV2,
} from "../../src/engine-v2/golden-dataset/goldenDatasetV2";

import {
  evaluateRankingStabilityDiversityV2,
  type SmartStayRankingStabilityDiversityCandidateV2,
} from "../../src/engine-v2/ranking/rankingStabilityDiversityEngine";

import type {
  SmartStayRecommendationRoleV2,
} from "../../src/engine-v2/model/smartStayEvaluationV2";

import type {
  SmartStayUtilityDimensionCodeV2,
  SmartStayUtilityPreferenceIdV2,
} from "../../src/engine-v2/utility/userUtilityEngine";

const UTILITY_WEIGHTS:
  Record<
    SmartStayUtilityPreferenceIdV2,
    Record<
      SmartStayUtilityDimensionCodeV2,
      number
    >
  > = {
  "maximum-comfort": {
    priceValue:
      0.08,

    quality:
      0.24,

    location:
      0.16,

    comfort:
      0.26,

    flexibility:
      0.12,

    categoryFit:
      0.07,

    userFit:
      0.07,
  },

  comfort: {
    priceValue:
      0.14,

    quality:
      0.22,

    location:
      0.17,

    comfort:
      0.22,

    flexibility:
      0.11,

    categoryFit:
      0.07,

    userFit:
      0.07,
  },

  balanced: {
    priceValue:
      0.22,

    quality:
      0.19,

    location:
      0.17,

    comfort:
      0.14,

    flexibility:
      0.1,

    categoryFit:
      0.08,

    userFit:
      0.1,
  },

  savings: {
    priceValue:
      0.34,

    quality:
      0.16,

    location:
      0.14,

    comfort:
      0.1,

    flexibility:
      0.08,

    categoryFit:
      0.08,

    userFit:
      0.1,
  },

  "maximum-savings": {
    priceValue:
      0.45,

    quality:
      0.14,

    location:
      0.11,

    comfort:
      0.08,

    flexibility:
      0.06,

    categoryFit:
      0.07,

    userFit:
      0.09,
  },
};

function getScenario(
  scenarioId:
    string
) {
  const scenario =
    getSmartStayGoldenScenarioV2(
      scenarioId
    );

  assert.ok(
    scenario
  );

  return scenario;
}

function getRole(
  scenario:
    SmartStayGoldenScenarioV2,
  hotelId:
    string
): SmartStayRecommendationRoleV2 {
  if (
    scenario
      .expectations
      .bestChoiceHotelId ===
    hotelId
  ) {
    return "best-choice";
  }

  if (
    scenario
      .expectations
      .bestSensibleSavingHotelId ===
    hotelId
  ) {
    return "best-sensible-saving";
  }

  if (
    scenario
      .expectations
      .worthwhileComfortUpgradeHotelId ===
    hotelId
  ) {
    return "worthwhile-comfort-upgrade";
  }

  return "unassigned";
}

function calculateUtilityScore(
  scenario:
    SmartStayGoldenScenarioV2,
  candidate:
    SmartStayGoldenCandidateV2
) {
  if (
    candidate.smartScore !==
    null
  ) {
    return candidate.smartScore;
  }

  const weights =
    UTILITY_WEIGHTS[
      scenario
        .search
        .preferenceId
    ];

  let weightedTotal =
    0;

  let availableWeight =
    0;

  for (
    const dimension
    of Object.keys(
      weights
    ) as SmartStayUtilityDimensionCodeV2[]
  ) {
    const score =
      candidate
        .dimensionScores[
          dimension
        ];

    if (score === null) {
      continue;
    }

    weightedTotal +=
      score *
      weights[
        dimension
      ];

    availableWeight +=
      weights[
        dimension
      ];
  }

  return availableWeight >
    0
    ? weightedTotal /
      availableWeight
    : null;
}

function createRankingCandidate(
  scenario:
    SmartStayGoldenScenarioV2,
  candidate:
    SmartStayGoldenCandidateV2
): SmartStayRankingStabilityDiversityCandidateV2 {
  const preferenceId =
    scenario
      .search
      .preferenceId;

  const weights =
    UTILITY_WEIGHTS[
      preferenceId
    ];

  const utilityScore =
    calculateUtilityScore(
      scenario,
      candidate
    );

  const role =
    getRole(
      scenario,
      candidate.hotelId
    );

  const roleAssigned =
    role !==
    "unassigned";

  const budgetTotal =
    scenario
      .search
      .budgetTotal;

  const overageAmount =
    budgetTotal !==
      null &&
    candidate.totalCost !==
      null
      ? Math.max(
          candidate.totalCost -
            budgetTotal,
          0
        )
      : null;

  const overageRatio =
    budgetTotal !==
      null &&
    budgetTotal >
      0 &&
    overageAmount !==
      null
      ? overageAmount /
        budgetTotal
      : null;

  const utilityEvidenceId =
    `${candidate.hotelId}:utility`;

  const rankingEligible =
    candidate
      .eligibleForPrimaryRanking &&
    candidate
      .mandatoryRequirementsSatisfied &&
    candidate
      .distanceConstraintSatisfied !==
      false;

  return {
    hotelId:
      candidate.hotelId,

    eligibleForRanking:
      rankingEligible,

    utility: {
      hotelId:
        candidate.hotelId,

      status:
        candidate
          .reliabilityStatus ===
          "invalid"
          ? "invalid"
          : utilityScore ===
              null
            ? "unavailable"
            : candidate
                  .reliabilityStatus ===
                "strong-data"
              ? "strong-data"
              : "usable",

      eligibleForPrimaryRanking:
        candidate
          .eligibleForPrimaryRanking &&
        utilityScore !==
          null,

      preference: {
        id:
          preferenceId,

        selectedIndex:
          [
            "maximum-comfort",
            "comfort",
            "balanced",
            "savings",
            "maximum-savings",
          ].indexOf(
            preferenceId
          ),

        source:
          "manual",

        weights: {
          ...weights,
        },
      },

      rawUtilityScore:
        utilityScore,

      utilityScore,

      scoreConfidence:
        candidate
          .scoreConfidence,

      evidenceCoverage:
        candidate
          .evidenceCoverage,

      availableDimensionCodes:
        (
          Object.keys(
            candidate
              .dimensionScores
          ) as SmartStayUtilityDimensionCodeV2[]
        ).filter(
          (dimension) =>
            candidate
              .dimensionScores[
                dimension
              ] !==
            null
        ),

      unavailableDimensionCodes:
        (
          Object.keys(
            candidate
              .dimensionScores
          ) as SmartStayUtilityDimensionCodeV2[]
        ).filter(
          (dimension) =>
            candidate
              .dimensionScores[
                dimension
              ] ===
            null
        ),

      contributions:
        (
          Object.keys(
            candidate
              .dimensionScores
          ) as SmartStayUtilityDimensionCodeV2[]
        ).map(
          (dimension) => {
            const score =
              candidate
                .dimensionScores[
                  dimension
                ];

            return {
              dimension,

              available:
                score !==
                null,

              score,

              confidence:
                score ===
                null
                  ? 0
                  : candidate
                      .dimensionConfidence,

              configuredWeight:
                weights[
                  dimension
                ],

              normalizedAvailableWeight:
                weights[
                  dimension
                ],

              weightedValue:
                score ===
                  null
                  ? 0
                  : score *
                    weights[
                      dimension
                    ],

              signalCodes:
                [],

              evidenceIds: [
                `${candidate.hotelId}:${dimension}`,
              ],
            };
          }
        ),

      warningCodes:
        [],

      evidenceIds: [
        utilityEvidenceId,
      ],
    },

    recommendation: {
      hotelId:
        candidate.hotelId,

      role,

      eligible:
        roleAssigned,

      reasonCodes:
        [],

      comparisonTargetHotelId:
        role ===
          "best-choice"
          ? null
          : scenario
              .expectations
              .bestChoiceHotelId,

      evidenceIds: [
        `${candidate.hotelId}:recommendation`,
      ],

      assignmentScore:
        roleAssigned
          ? utilityScore
          : null,

      tieGroupId:
        roleAssigned
          ? `recommendation:${role}:${candidate.hotelId}`
          : null,

      groupPosition:
        roleAssigned
          ? 1
          : null,

      primaryInGroup:
        roleAssigned,

      metrics: {
        smartScore:
          candidate.smartScore,

        displayedSmartScore:
          candidate.smartScore,

        utilityScore,

        utilityDifference:
          null,

        scoreConfidence:
          candidate
            .scoreConfidence,

        evidenceCoverage:
          candidate
            .evidenceCoverage,

        riskScore:
          candidate.riskScore,

        totalCost:
          candidate.totalCost,

        currency:
          candidate.currency,

        budgetTotal,

        withinBudget:
          candidate.withinBudget,

        budgetOverageAmount:
          overageAmount,

        budgetOveragePercent:
          overageRatio ===
            null
            ? null
            : overageRatio *
              100,

        priceDifferenceAmount:
          null,

        priceDifferencePercent:
          null,

        locationScore:
          candidate
            .dimensionScores
            .location,

        distanceKm:
          candidate.distanceKm,

        distanceDifferenceKm:
          null,

        comfortScore:
          candidate
            .dimensionScores
            .comfort,

        comfortDifference:
          null,

        upgradeExperienceGain:
          null,

        upgradeAdjustedBenefit:
          null,

        upgradeEfficiencyPerBudgetPercent:
          null,

        upgradeStrongestGainDimension:
          null,

        upgradeStrongestGain:
          null,

        upgradeDiminishingReturnsStart:
          false,
      },
    },

    accommodation: {
      category:
        candidate.category,

      unitType:
        candidate.unitType,

      originalCategory:
        candidate.category,

      confidence:
        candidate
          .dimensionConfidence,

      evidenceIds: [
        `${candidate.hotelId}:accommodation`,
      ],
    },

    risk: {
      score:
        candidate.riskScore,

      level:
        candidate.riskLevel,

      factorCodes:
        [],

      evidenceIds: [
        `${candidate.hotelId}:risk`,
      ],
    },

    priceValue:
      candidate.totalCost ===
        null
        ? undefined
        : {
            hotelId:
              candidate.hotelId,

            status:
              candidate
                .costCompleteness ===
                "reported-complete"
                ? "strong-data"
                : "usable",

            eligibleForPrimaryRanking:
              candidate
                .eligibleForPrimaryRanking,

            totalCost:
              candidate.totalCost,

            currency:
              candidate.currency,

            costCompleteness:
              candidate
                .costCompleteness,

            budget: {
              provided:
                budgetTotal !==
                null,

              total:
                budgetTotal,

              withinBudget:
                candidate
                  .withinBudget,

              differenceAmount:
                budgetTotal ===
                  null
                  ? null
                  : budgetTotal -
                    candidate.totalCost,

              overageAmount,

              overageRatio,

              utilizationRatio:
                budgetTotal ===
                  null ||
                budgetTotal <=
                  0
                  ? null
                  : candidate
                      .totalCost /
                    budgetTotal,

              fitScore:
                candidate
                  .dimensionScores
                  .priceValue,
            },

            peerBaseline: {
              available:
                true,

              mode:
                "same-category",

              assignedSampleSize:
                3,

              eligibleReferenceCount:
                3,

              excludedCurrencyMismatchCount:
                0,

              excludedMissingPriceCount:
                0,

              minimum:
                candidate.totalCost,

              firstQuartile:
                candidate.totalCost,

              median:
                candidate.totalCost,

              thirdQuartile:
                candidate.totalCost,

              maximum:
                candidate.totalCost,

              confidence:
                candidate
                  .dimensionConfidence,

              referenceHotelIds:
                [],

              evidenceIds:
                [],
            },

            relativePrice: {
              ratioToMedian:
                1,

              savingAgainstMedian:
                0,

              savingPercentageAgainstMedian:
                0,

              pricePercentile:
                0.5,

              valueScore:
                candidate
                  .dimensionScores
                  .priceValue,
            },

            score:
              candidate
                .dimensionScores
                .priceValue,

            confidence:
              candidate
                .scoreConfidence,

            warningCodes:
              [],

            evidenceIds: [
              `${candidate.hotelId}:price`,
            ],
          },

    location:
      candidate.distanceKm ===
        null
        ? undefined
        : {
            hotelId:
              candidate.hotelId,

            status:
              "usable",

            eligibleForPrimaryRanking:
              candidate
                .distanceConstraintSatisfied !==
              false,

            distance: {
              providerDistanceKm:
                candidate.distanceKm,

              calculatedDistanceKm:
                candidate.distanceKm,

              selectedDistanceKm:
                candidate.distanceKm,

              source:
                "reconciled",

              discrepancyKm:
                0,

              discrepancyRatio:
                0,
            },

            constraint: {
              provided:
                scenario
                  .search
                  .maximumDistanceKm !==
                null,

              maximumDistanceKm:
                scenario
                  .search
                  .maximumDistanceKm,

              withinLimit:
                candidate
                  .distanceConstraintSatisfied,

              overageKm:
                candidate
                  .distanceConstraintSatisfied ===
                  false &&
                scenario
                  .search
                  .maximumDistanceKm !==
                  null
                  ? Math.max(
                      candidate.distanceKm -
                        scenario
                          .search
                          .maximumDistanceKm,
                      0
                    )
                  : 0,

              utilizationRatio:
                scenario
                  .search
                  .maximumDistanceKm ===
                  null
                  ? null
                  : candidate
                      .distanceKm /
                    scenario
                      .search
                      .maximumDistanceKm,
            },

            score:
              candidate
                .dimensionScores
                .location,

            confidence:
              candidate
                .dimensionConfidence,

            warningCodes:
              [],

            evidenceIds: [
              `${candidate.hotelId}:location`,
            ],
          },

    sourceProvider:
      candidate.provider,

    propertyIdentityKey:
      candidate
        .canonicalPropertyKey,

    offerIdentityKey:
      `${candidate.provider}:${candidate.hotelId}`,

    exclusionReasonCodes:
      [],
  };
}

function evaluateScenarioRanking(
  scenario:
    SmartStayGoldenScenarioV2,
  candidates:
    SmartStayGoldenCandidateV2[] =
      scenario.candidates
) {
  return evaluateRankingStabilityDiversityV2(
    {
      candidates:
        candidates.map(
          (candidate) =>
            createRankingCandidate(
              scenario,
              candidate
            )
        ),

      previousRankingHotelIds:
        scenario
          .search
          .previousRankingHotelIds,
    },
    {
      maximumVisibleResults:
        scenario
          .expectations
          .visibleHotelIds
          .length,
    }
  );
}

test(
  "Ranking V2 groups near-duplicate provider offers",
  () => {
    const scenario =
      getScenario(
        "turin-near-duplicate-providers"
      );

    const evaluation =
      evaluateScenarioRanking(
        scenario
      );

    assert.deepEqual(
      evaluation.visibleHotelIds,
      scenario
        .expectations
        .visibleHotelIds
    );

    assert.equal(
      evaluation
        .nearDuplicateGroups
        .length,
      1
    );

    assert.deepEqual(
      evaluation
        .nearDuplicateGroups[0]
        ?.suppressedHotelIds,
      [
        "turin-grand-route",
      ]
    );
  }
);

test(
  "Ranking V2 preserves previous order only inside a real equivalence band",
  () => {
    const scenario =
      getScenario(
        "genoa-ranking-stability"
      );

    const evaluation =
      evaluateScenarioRanking(
        scenario
      );

    assert.deepEqual(
      evaluation.visibleHotelIds,
      scenario
        .expectations
        .visibleHotelIds
    );

    assert.equal(
      evaluation.stabilityApplied,
      true
    );

    const mutatedCandidates =
      scenario.candidates.map(
        (candidate) =>
          candidate.hotelId ===
            "genoa-tie-a"
            ? {
                ...candidate,

                smartScore:
                  86,
              }
            : candidate
      );

    const mutated =
      evaluateScenarioRanking(
        scenario,
        mutatedCandidates
      );

    assert.ok(
      mutated.visibleHotelIds.indexOf(
        "genoa-tie-a"
      ) <
      mutated.visibleHotelIds.indexOf(
        "genoa-tie-b"
      )
    );
  }
);

test(
  "Ranking V2 excludes candidates that violate a hard distance limit",
  () => {
    const scenario =
      getScenario(
        "milan-station-distance-limit"
      );

    const evaluation =
      evaluateScenarioRanking(
        scenario
      );

    assert.ok(
      !evaluation.visibleHotelIds.includes(
        "milan-cheap-far"
      )
    );

    assert.ok(
      evaluation.excludedHotelIds.includes(
        "milan-cheap-far"
      )
    );
  }
);

test(
  "Ranking V2 is deterministic when candidate input order changes",
  () => {
    const scenario =
      getScenario(
        "florence-balanced-couple"
      );

    const forward =
      evaluateScenarioRanking(
        scenario
      );

    const reversed =
      evaluateScenarioRanking(
        scenario,
        [
          ...scenario.candidates,
        ].reverse()
      );

    assert.deepEqual(
      reversed,
      forward
    );
  }
);