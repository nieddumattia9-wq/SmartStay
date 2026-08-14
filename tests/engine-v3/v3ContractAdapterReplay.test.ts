import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  adaptV2SearchResultToDecisionV3,
  createDecisionFingerprintV3,
  createStableHashV3,
  evaluateCommercialFirewallV3,
  runDeterministicDecisionReplayV3,
  validateStayOptiDecisionV3,
  validateStaySolutionV3,
  type StayOptiDecisionV3,
  type StaySolutionV3,
} from "../../src/engine-v3";

function createOffer(
  index:
    number,
  provider:
    string,
  totalCost:
    number
): HotelOffer {
  return {
    id:
      `offer-${index}`,
    provider,
    price:
      totalCost,
    basePrice:
      totalCost,
    saving:
      0,
    currency:
      "EUR",
    cancellationPolicy:
      "Free cancellation before arrival",
    refundableTag:
      "RFN",
    refundable:
      true,
    freeCancellationUntil:
      "2026-09-01",
    cancellationPenalty:
      0,
    cancellationPenaltyCurrency:
      "EUR",
    cancellationPenaltyType:
      "amount",
    cancellationTimezone:
      "Europe/Rome",
    taxesIncluded:
      true,
    includedTaxes:
      24,
    excludedTaxes:
      0,
    unknownTaxes:
      0,
    totalKnownCost:
      totalCost,
    roomName:
      "Double hotel room",
    mealPlan:
      "Breakfast included",
    bookable:
      true,
  };
}

function createHotel(
  input: {
    id:
      string;

    provider:
      string;

    totalCost:
      number;

    stars:
      number;

    reviewScore:
      number;

    reviewCount:
      number;

    distance:
      number;

    offerIndex:
      number;
  }
): Hotel {
  return {
    id:
      input.id,
    dataSources: [
      input.provider,
    ],
    dataConfidence:
      "full",
    availableData: {
      hasPrice:
        true,
      hasBasePrice:
        true,
      hasSaving:
        true,
      hasStars:
        true,
      hasReviewScore:
        true,
      hasReviewCount:
        true,
      hasDistance:
        true,
      hasImage:
        true,
      hasAddress:
        true,
      hasCoordinates:
        true,
      hasAmenities:
        true,
    },
    offers: [
      createOffer(
        input.offerIndex,
        input.provider,
        input.totalCost
      ),
    ],
    name:
      `Hotel ${input.id}`,
    provider:
      input.provider,
    stars:
      input.stars,
    reviewScore:
      input.reviewScore,
    reviewCount:
      input.reviewCount,
    reviewCountRelation:
      "equal",
    reviewText:
      "Strong reviews",
    price:
      input.totalCost,
    basePrice:
      input.totalCost,
    saving:
      0,
    currency:
      "EUR",
    taxesIncluded:
      true,
    includedTaxes:
      24,
    excludedTaxes:
      0,
    unknownTaxes:
      0,
    totalKnownCost:
      input.totalCost,
    distance:
      input.distance,
    image:
      `https://images.example/${input.id}.jpg`,
    address:
      `${input.offerIndex} StayOpti Street`,
    city:
      "Florence",
    country:
      "Italy",
    latitude:
      43.77 +
      input.offerIndex /
      1000,
    longitude:
      11.25 +
      input.offerIndex /
      1000,
    amenities: [
      "Hotel room",
      "Private bathroom",
      "WiFi",
      "Air conditioning",
      "Breakfast",
      "Reception",
      "Elevator",
    ],
    facilities: [
      "Front desk",
      "Daily housekeeping",
    ],
  };
}

const HOTELS: Hotel[] = [
  createHotel({
    id:
      "central-value",
    provider:
      "Provider A",
    totalCost:
      420,
    stars:
      4,
    reviewScore:
      8.9,
    reviewCount:
      920,
    distance:
      0.7,
    offerIndex:
      1,
  }),
  createHotel({
    id:
      "sensible-saving",
    provider:
      "Provider B",
    totalCost:
      330,
    stars:
      3,
    reviewScore:
      8.4,
    reviewCount:
      640,
    distance:
      1.1,
    offerIndex:
      2,
  }),
  createHotel({
    id:
      "comfort-upgrade",
    provider:
      "Provider A",
    totalCost:
      510,
    stars:
      5,
    reviewScore:
      9.2,
    reviewCount:
      1100,
    distance:
      0.5,
    offerIndex:
      3,
  }),
  createHotel({
    id:
      "weak-option",
    provider:
      "Provider B",
    totalCost:
      470,
    stars:
      3,
    reviewScore:
      7.5,
    reviewCount:
      90,
    distance:
      2.5,
    offerIndex:
      4,
  }),
];

const SEARCH_INPUT = {
  hotels:
    HOTELS,
  preferenceId:
    "balanced" as const,
  preferenceSource:
    "manual" as const,
  totalBudget:
    450,
  maximumDistanceKm:
    3,
  selectedLocation: {
    latitude:
      43.77,
    longitude:
      11.25,
    confidence:
      1,
  },
  nights:
    4,
  adults:
    2,
  children:
    0,
  rooms:
    1,
  checkIn:
    "2026-10-10",
  checkOut:
    "2026-10-14",
  currency:
    "EUR",
};

function createDecision(
  hotels:
    Hotel[] =
      HOTELS
) {
  const searchInput = {
    ...SEARCH_INPUT,
    hotels,
  };

  const result =
    evaluateSmartStaySearchV2(
      searchInput
    );

  return adaptV2SearchResultToDecisionV3({
    searchInput,
    result,
  });
}

function createValidSplitSolution(): StaySolutionV3 {
  return {
    solutionId:
      "solution:split:a-b",
    kind:
      "split",
    feasibility:
      "feasible",
    transitionCount:
      1,
    checkIn:
      "2026-10-10",
    checkOut:
      "2026-10-14",
    totalNights:
      4,
    totalCost: {
      amount:
        360,
      currency:
        "EUR",
      completeness:
        "reported-complete",
      taxesIncluded:
        true,
      includedTaxes:
        30,
      excludedTaxes:
        0,
      unknownTaxes:
        0,
    },
    evidenceIds: [
      "evidence-split-a",
      "evidence-split-b",
    ],
    segments: [
      {
        segmentId:
          "solution:split:a-b:segment:0",
        ordinal:
          0,
        checkIn:
          "2026-10-10",
        checkOut:
          "2026-10-12",
        nights:
          2,
        hotelId:
          "hotel-a",
        offerId:
          "offer-a",
        roomName:
          "Double room",
        mealPlan:
          "Breakfast",
        bookable:
          true,
        recheckRequired:
          true,
        cost: {
          amount:
            170,
          currency:
            "EUR",
          completeness:
            "reported-complete",
          taxesIncluded:
            true,
          includedTaxes:
            14,
          excludedTaxes:
            0,
          unknownTaxes:
            0,
        },
        evidenceIds: [
          "evidence-split-a",
        ],
      },
      {
        segmentId:
          "solution:split:a-b:segment:1",
        ordinal:
          1,
        checkIn:
          "2026-10-12",
        checkOut:
          "2026-10-14",
        nights:
          2,
        hotelId:
          "hotel-b",
        offerId:
          "offer-b",
        roomName:
          "Double room",
        mealPlan:
          "Room only",
        bookable:
          true,
        recheckRequired:
          true,
        cost: {
          amount:
            190,
          currency:
            "EUR",
          completeness:
            "reported-complete",
          taxesIncluded:
            true,
          includedTaxes:
            16,
          excludedTaxes:
            0,
          unknownTaxes:
            0,
        },
        evidenceIds: [
          "evidence-split-b",
        ],
      },
    ],
  };
}

test(
  "V2 compatibility adapter produces a valid versioned V3 decision without changing V2 ranking",
  () => {
    const decision =
      createDecision();

    assert.equal(
      decision.schemaVersion,
      "3.0.0-decision.10"
    );
    assert.equal(
      decision.engineVersion,
      "3.0.0-alpha.10"
    );
    assert.equal(
      decision.mode,
      "compatibility-v2"
    );
    assert.equal(
      decision.personalization
        .phase,
      "v3-03"
    );
    assert.equal(
      decision.personalization
        .rankingApplication,
      "shadow-only"
    );
    assert.equal(
      decision.personalization
        .preference.origin,
      "declared"
    );
    assert.equal(
      decision.personalization
        .preference
        .declaredPreferenceId,
      "balanced"
    );
    assert.equal(
      decision.personalization
        .preference
        .inferredPreferenceId,
      null
    );
    assert.equal(
      decision.personalization
        .utilityEvaluations
        .length,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.personalization
        .peerAssignments
        .length,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.decisionGeometry
        .phase,
      "v3-04"
    );
    assert.equal(
      decision.decisionGeometry
        .rankingApplication,
      "shadow-only"
    );
    assert.equal(
      decision.decisionGeometry
        .candidates
        .length,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.decisionGeometry
        .candidates
        .every(
          (candidate) =>
            candidate
              .strongParetoStatus ===
            "unknown"
        ),
      true
    );
    assert.equal(
      decision.decisionGeometry
        .exactThresholdCount,
      0
    );
    assert.equal(
      decision.internalTrace
        .decisionGeometryEvaluationId,
      decision.decisionGeometry
        .evaluationId
    );
    assert.equal(
      decision.robustness
        .phase,
      "v3-05"
    );
    assert.equal(
      decision.robustness
        .rankingApplication,
      "shadow-only"
    );
    assert.equal(
      decision.robustness
        .candidates
        .length,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.internalTrace
        .decisionRobustnessEvaluationId,
      decision.robustness
        .evaluationId
    );
    assert.equal(
      decision.contextualStayValue
        .phase,
      "v3-06"
    );
    assert.equal(
      decision.contextualStayValue
        .rankingApplication,
      "shadow-only"
    );
    assert.equal(
      decision.contextualStayValue
        .publicPresentation,
      "disabled"
    );
    assert.equal(
      decision.contextualStayValue
        .decisionGainGate
        .rankingEnabled,
      false
    );
    assert.equal(
      decision.contextualStayValue
        .candidates.length,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.internalTrace
        .contextualStayValueEvaluationId,
      decision.contextualStayValue
        .evaluationId
    );
    assert.equal(
      decision.thesis.phase,
      "v3-07"
    );
    assert.equal(
      decision.thesis
        .rankingApplication,
      "shadow-only"
    );
    assert.equal(
      decision.thesis
        .publicPresentation,
      "disabled"
    );
    assert.equal(
      decision.thesis
        .publicGate.copyEnabled,
      false
    );
    assert.equal(
      decision.thesis
        .numericPolicy
        .publicPercentageCount,
      0
    );
    assert.equal(
      decision.thesis
        .copyEvidenceLinks
        .every(
          (link) =>
            link.evidenceIds.length >
              0 &&
            link.derivationIds.length >
              0
        ),
      true
    );
    assert.equal(
      decision.internalTrace
        .decisionExplanationEvaluationId,
      decision.thesis
        .evaluationId
    );
    assert.equal(
      decision.searchWideScaleCoverage
        .phase,
      "v3-08"
    );
    assert.equal(
      decision.searchWideScaleCoverage
        .rankingApplication,
      "shadow-only"
    );
    assert.equal(
      decision.searchWideScaleCoverage
        .runtimeApplication,
      "shadow-plan-only"
    );
    assert.equal(
      decision.searchWideScaleCoverage
        .publicPresentation,
      "disabled"
    );
    assert.equal(
      decision.searchWideScaleCoverage
        .scope
        .marketCoverageClaimAllowed,
      false
    );
    assert.equal(
      decision.searchWideScaleCoverage
        .candidates.length,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.internalTrace
        .searchWideScaleCoverageEvaluationId,
      decision.searchWideScaleCoverage
        .evaluationId
    );
    assert.equal(
      decision.outcomeLearning
        .phase,
      "v3-09"
    );
    assert.equal(
      decision.outcomeLearning
        .collectionApplication,
      "disabled-by-default"
    );
    assert.equal(
      decision.outcomeLearning
        .runtimeApplication,
      "contract-only"
    );
    assert.equal(
      decision.outcomeLearning
        .learningPolicy
        .productionSelfModificationAllowed,
      false
    );
    assert.equal(
      decision.outcomeLearning
        .sourceDecisionInputFingerprint,
      decision.replay
        .inputFingerprint
    );
    assert.equal(
      decision.internalTrace
        .outcomeDataLoopEvaluationId,
      decision.outcomeLearning
        .evaluationId
    );
    assert.equal(
      decision.evaluationCalibration
        .phase,
      "v3-10"
    );
    assert.equal(
      decision.evaluationCalibration
        .evaluationApplication,
      "offline-protocol-only"
    );
    assert.equal(
      decision.evaluationCalibration
        .thresholdFreeze
        .status,
      "frozen-before-results"
    );
    assert.equal(
      decision.evaluationCalibration
        .thresholdFreeze
        .resultsObserved,
      false
    );
    assert.equal(
      decision.evaluationCalibration
        .promotionPolicy
        .automaticProductionPromotionAllowed,
      false
    );
    assert.equal(
      decision.evaluationCalibration
        .sourceDecisionInputFingerprint,
      decision.replay
        .inputFingerprint
    );
    assert.equal(
      decision.internalTrace
        .evaluationCalibrationEvaluationId,
      decision.evaluationCalibration
        .evaluationId
    );
    assert.equal(
      validateStayOptiDecisionV3(
        decision
      ).valid,
      true
    );

    const v2Result =
      evaluateSmartStaySearchV2(
        SEARCH_INPUT
      );

    for (
      const candidate
      of decision.candidates
    ) {
      const hotelId =
        decision.solutions.find(
          (solution) =>
            solution.solutionId ===
            candidate.solutionId
        )?.segments[0]
          ?.hotelId;

      const v2Pick =
        v2Result
          .recommendationRoles
          .picks.find(
            (pick) =>
              pick.hotelId ===
                hotelId &&
              pick.role ===
                candidate.role
          );

      assert.equal(
        candidate.utilityScore,
        v2Pick?.metrics
          .utilityScore
      );
    }
    assert.equal(
      decision.replay
        .decisionFingerprint,
      createDecisionFingerprintV3(
        decision
      )
    );
    assert.equal(
      decision.solutions.every(
        (solution) =>
          solution.kind ===
          "single"
      ),
      true
    );
    assert.equal(
      decision.integrity.phase,
      "v3-02"
    );
    assert.equal(
      decision.integrity
        .coverage
        .offerSnapshotCount,
      decision.coverage
        .analyzedHotelCount
    );
    assert.equal(
      decision.integrity
        .coverage
        .exactStayScopeCount,
      decision.integrity
        .coverage
        .offerSnapshotCount
    );
    assert.equal(
      decision.integrity
        .coverage
        .completeNightlyEvidenceCount,
      0
    );
    assert.equal(
      decision.integrity
        .coverage
        .publicRatesConsistency,
      "unverified"
    );
    assert.equal(
      decision.integrity
        .coverage
        .publicV3Promotion,
      "blocked"
    );
    assert.equal(
      decision.integrity
        .coverage
        .publicSplitPromotion,
      "blocked"
    );
    assert.equal(
      decision.solutions.every(
        (solution) =>
          solution.segments.every(
            (segment) =>
              decision.integrity
                .offerSnapshots.some(
                  (snapshot) =>
                    snapshot.hotelId ===
                      segment.hotelId &&
                    snapshot.offerId ===
                      segment.offerId
                )
          )
      ),
      true
    );
  }
);

test(
  "V3-01 keeps Temporal Optimization contract-only and never fabricates a Split card",
  () => {
    const decision =
      createDecision();

    assert.deepEqual(
      decision.temporalOptimization,
      {
        status:
          "not-evaluated",
        maximumTransitions:
          1,
        splitSolutionId:
          null,
        grossSavingAmount:
          null,
        grossSavingRatio:
          null,
        switchingCost:
          null,
        addedRisk:
          null,
        friction:
          null,
        netValue:
          null,
        reasonCodes: [
          "temporal:not-evaluated",
        ],
      }
    );

    assert.equal(
      decision.candidates.some(
        (candidate) =>
          candidate.role ===
          "split-saver"
      ),
      false
    );
    assert.equal(
      decision.integrity
        .coverage
        .offlineTemporalEvaluation,
      "blocked"
    );
    assert.equal(
      decision.integrity
        .offerSnapshots.every(
          (snapshot) =>
            snapshot.temporalPriceEvidence
              .nights.length ===
              0
        ),
      true
    );
  }
);

test(
  "V3 decision replay is deterministic and independent from provider input order",
  () => {
    const replay =
      runDeterministicDecisionReplayV3(
        () =>
          createDecision()
      );

    assert.equal(
      replay.verification
        .matches,
      true
    );
    assert.deepEqual(
      replay.first,
      replay.second
    );

    const reversed =
      createDecision([
        ...HOTELS,
      ].reverse());

    assert.equal(
      replay.first.replay
        .inputFingerprint,
      reversed.replay
        .inputFingerprint
    );
    assert.equal(
      replay.first.replay
        .decisionFingerprint,
      reversed.replay
        .decisionFingerprint
    );
  }
);

test(
  "V3 config hashing is stable across object key order",
  () => {
    assert.equal(
      createStableHashV3({
        alpha:
          1,
        beta:
          2,
      }),
      createStableHashV3({
        beta:
          2,
        alpha:
          1,
      })
    );
  }
);

test(
  "commercial firewall rejects monetization fields at any depth",
  () => {
    assert.equal(
      evaluateCommercialFirewallV3({
        decision: {
          utility:
            90,
        },
      }).passed,
      true
    );

    const unsafe =
      evaluateCommercialFirewallV3({
        decision: {
          commercialPricing: {
            commissionPercent:
              8,
          },
        },
      });

    assert.equal(
      unsafe.passed,
      false
    );
    assert.deepEqual(
      unsafe.violations.map(
        (violation) =>
          violation.path
      ),
      [
        "decision.commercialPricing",
        "decision.commercialPricing.commissionPercent",
      ]
    );
  }
);

test(
  "commercial fields injected into a V3 decision fail contract validation",
  () => {
    const decision =
      createDecision();

    const unsafe = {
      ...decision,
      policySnapshot: {
        markup:
          12,
      },
    } as unknown as StayOptiDecisionV3;

    const validation =
      validateStayOptiDecisionV3(
        unsafe
      );

    assert.equal(
      validation.valid,
      false
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "decision-commercial-firewall-failed"
      ),
      true
    );
  }
);

test(
  "V3 contract rejects mutated utility, unsafe peer output, geometry, robustness, context, explanation, scale coverage and outcome plan",
  () => {
    const utilityMutation =
      createDecision();

    utilityMutation
      .personalization
      .utilityEvaluations[0]
      .utilityScore =
        100;

    assert.ok(
      validateStayOptiDecisionV3(
        utilityMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-personalization-utility-invalid"
      )
    );

    const peerMutation =
      createDecision();

    peerMutation
      .personalization
      .peerAssignments[0]
      .directComparisonAllowed =
        !peerMutation
          .personalization
          .peerAssignments[0]
          .directComparisonAllowed;

    assert.ok(
      validateStayOptiDecisionV3(
        peerMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-personalization-peer-invalid"
      )
    );

    const preferenceMutation =
      createDecision();

    preferenceMutation.context
      .preferenceId =
        "maximum-savings";

    assert.ok(
      validateStayOptiDecisionV3(
        preferenceMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-personalization-preference-invalid"
      )
    );

    const geometryMutation =
      createDecision();

    geometryMutation
      .decisionGeometry
      .fingerprint =
        "fnv1a32-00000000";

    assert.ok(
      validateStayOptiDecisionV3(
        geometryMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-geometry-invalid"
      )
    );

    const robustnessMutation =
      createDecision();

    robustnessMutation
      .robustness
      .fingerprint =
        "fnv1a32-00000000";

    assert.ok(
      validateStayOptiDecisionV3(
        robustnessMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-robustness-invalid"
      )
    );

    const contextualMutation =
      createDecision();

    contextualMutation
      .contextualStayValue
      .candidates[0]
      .convenience
      .convenienceIndex =
        99;

    assert.ok(
      validateStayOptiDecisionV3(
        contextualMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-contextual-invalid"
      )
    );

    const explanationMutation =
      createDecision();

    explanationMutation
      .thesis
      .primaryReason
      .messageKey =
        "stayopti.v3.explanation.fabricated";

    assert.ok(
      validateStayOptiDecisionV3(
        explanationMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-explanation-invalid"
      )
    );

    const scaleMutation =
      createDecision();

    scaleMutation
      .searchWideScaleCoverage
      .scope
      .marketCoverageClaimAllowed =
        true as false;

    assert.ok(
      validateStayOptiDecisionV3(
        scaleMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-scale-coverage-invalid"
      )
    );

    const outcomeMutation =
      createDecision();

    outcomeMutation
      .outcomeLearning
      .learningPolicy
      .productionSelfModificationAllowed =
        true as false;

    assert.ok(
      validateStayOptiDecisionV3(
        outcomeMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-outcome-data-loop-invalid"
      )
    );

    const evaluationMutation =
      structuredClone(
        createDecision()
      );

    evaluationMutation
      .evaluationCalibration
      .thresholdFreeze
      .resultsObserved =
        true as false;

    assert.ok(
      validateStayOptiDecisionV3(
        evaluationMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-evaluation-calibration-invalid"
      )
    );

    const traceMutation =
      createDecision();

    (traceMutation.internalTrace as unknown as {
      email: string;
    }).email =
      "guest@example.com";

    assert.ok(
      validateStayOptiDecisionV3(
        traceMutation
      ).issues.some(
        (issue) =>
          issue.code ===
          "decision-trace-pii-detected"
      )
    );
  }
);

test(
  "StaySolution validates a contiguous two-segment split with one transition",
  () => {
    assert.deepEqual(
      validateStaySolutionV3(
        createValidSplitSolution()
      ),
      {
        valid:
          true,
        issues:
          [],
      }
    );
  }
);

test(
  "StaySolution rejects gaps and more than one transition",
  () => {
    const split =
      createValidSplitSolution();

    split.segments[1].checkIn =
      "2026-10-13";

    split.segments.push({
      ...structuredClone(
        split.segments[1]
      ),
      segmentId:
        "solution:split:a-b:segment:2",
      ordinal:
        2,
      checkIn:
        "2026-10-14",
      checkOut:
        "2026-10-15",
      nights:
        1,
    });

    split.transitionCount =
      2;

    const validation =
      validateStaySolutionV3(
        split
      );

    assert.equal(
      validation.valid,
      false
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "solution-kind-segment-count-invalid"
      ),
      true
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "solution-transition-count-invalid"
      ),
      true
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "solution-segments-not-contiguous"
      ),
      true
    );
  }
);

test(
  "StaySolution rejects boundary, tax aggregation and feasibility contradictions",
  () => {
    const split =
      createValidSplitSolution();

    split.checkIn =
      "2026-10-09";
    split.totalCost.includedTaxes =
      31;
    split.segments[0].bookable =
      false;

    const validation =
      validateStaySolutionV3(
        split
      );

    assert.equal(
      validation.valid,
      false
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "solution-boundary-mismatch"
      ),
      true
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "solution-total-tax-mismatch"
      ),
      true
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "solution-feasibility-inconsistent"
      ),
      true
    );
  }
);

test(
  "V3 decision output contains no monetization field names or wall-clock timestamp",
  () => {
    const serialized =
      JSON.stringify(
        createDecision()
      );

    assert.doesNotMatch(
      serialized,
      /commission|markup|affiliateRevenue|commercialPricing/i
    );
    assert.doesNotMatch(
      serialized,
      /generatedAt|createdAt|Date\.now/i
    );
  }
);
