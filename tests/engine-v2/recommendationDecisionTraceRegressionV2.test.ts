import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  SMARTSTAY_GOLDEN_DATASET_VERSION_V2,
  getSmartStayGoldenDatasetFingerprintV2,
  validateSmartStayGoldenDatasetV2,
} from "../../src/engine-v2/golden-dataset/goldenDatasetV2";

import {
  evaluateSmartStaySearchV2,
  evaluateSmartStaySearchWithInternalDiagnosticsV2,
  type SmartStayEngineV2SearchInput,
  type SmartStayEngineV2SearchResult,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  SMARTSTAY_DECISION_TRACE_ROLES_V2,
  validateRecommendationDecisionTraceV2,
  type SmartStayRecommendationDecisionTraceV2,
} from "../../src/engine-v2/recommendation/recommendationDecisionTraceV2";

import type {
  SmartStayUtilityPreferenceIdV2,
} from "../../src/engine-v2/utility/userUtilityEngine";

function createOffer(
  index: number,
  provider: string,
  totalCost: number
): HotelOffer {
  return {
    id: `offer-${index}`,
    provider,
    price: totalCost,
    basePrice: totalCost,
    saving: 0,
    currency: "EUR",
    cancellationPolicy: "Free cancellation before arrival",
    refundableTag: "Refundable",
    refundable: true,
    freeCancellationUntil: "2026-09-01T00:00:00.000Z",
    cancellationPenalty: 0,
    cancellationPenaltyCurrency: "EUR",
    cancellationPenaltyType: "amount",
    cancellationTimezone: "Europe/Rome",
    taxesIncluded: true,
    includedTaxes: 24,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: totalCost,
    roomName: "Standard double room",
    bookable: true,
  };
}

function createHotel(input: {
  id: string;
  provider: string;
  totalCost: number;
  stars: number;
  reviewScore: number;
  reviewCount: number;
  distance: number;
  latitude: number;
  longitude: number;
  offerIndex: number;
  canonicalName?: string;
  canonicalAddress?: string;
}): Hotel {
  return {
    id: input.id,
    dataSources: [input.provider],
    dataConfidence: "full",
    availableData: {
      hasPrice: true,
      hasBasePrice: true,
      hasSaving: true,
      hasStars: true,
      hasReviewScore: true,
      hasReviewCount: true,
      hasDistance: true,
      hasImage: true,
      hasAddress: true,
      hasCoordinates: true,
      hasAmenities: true,
    },
    offers: [
      createOffer(input.offerIndex, input.provider, input.totalCost),
    ],
    name: input.canonicalName ?? `Hotel ${input.id}`,
    provider: input.provider,
    accommodationCategory: "hotel",
    stars: input.stars,
    reviewScore: input.reviewScore,
    reviewCount: input.reviewCount,
    reviewCountRelation: "equal",
    reviewText: "Excellent",
    price: input.totalCost,
    basePrice: input.totalCost,
    saving: 0,
    currency: "EUR",
    taxesIncluded: true,
    includedTaxes: 24,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: input.totalCost,
    distance: input.distance,
    image: `https://images.example/${input.id}.jpg`,
    address:
      input.canonicalAddress ??
      `${input.offerIndex} ENG-01D Street`,
    city: "Florence",
    country: "Italy",
    latitude: input.latitude,
    longitude: input.longitude,
    amenities: [
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
      "Non-smoking rooms",
    ],
  };
}

const HOTELS: Hotel[] = [
  createHotel({
    id: "central-value",
    provider: "provider-a",
    totalCost: 380,
    stars: 4,
    reviewScore: 8.8,
    reviewCount: 850,
    distance: 0.8,
    latitude: 43.773,
    longitude: 11.255,
    offerIndex: 1,
    canonicalName: "Hotel Decision Centrale",
    canonicalAddress: "1 Decision Trace Street",
  }),
  createHotel({
    id: "budget-stay",
    provider: "provider-a",
    totalCost: 300,
    stars: 3,
    reviewScore: 8.2,
    reviewCount: 500,
    distance: 1.5,
    latitude: 43.777,
    longitude: 11.246,
    offerIndex: 2,
  }),
  createHotel({
    id: "comfort-upgrade",
    provider: "provider-b",
    totalCost: 470,
    stars: 5,
    reviewScore: 9.2,
    reviewCount: 1200,
    distance: 1,
    latitude: 43.768,
    longitude: 11.267,
    offerIndex: 3,
  }),
  createHotel({
    id: "secondary-option",
    provider: "provider-b",
    totalCost: 430,
    stars: 4,
    reviewScore: 8.4,
    reviewCount: 410,
    distance: 2.4,
    latitude: 43.781,
    longitude: 11.275,
    offerIndex: 4,
  }),
  createHotel({
    id: "far-cheap",
    provider: "provider-a",
    totalCost: 250,
    stars: 4,
    reviewScore: 8.6,
    reviewCount: 700,
    distance: 8,
    latitude: 43.84,
    longitude: 11.35,
    offerIndex: 5,
  }),
];

const PREFERENCE_SCENARIOS:
  readonly {
    preferenceId: SmartStayUtilityPreferenceIdV2;
    selectedIndex: number;
  }[] = [
    {
      preferenceId: "maximum-comfort",
      selectedIndex: 0,
    },
    {
      preferenceId: "comfort",
      selectedIndex: 1,
    },
    {
      preferenceId: "balanced",
      selectedIndex: 2,
    },
    {
      preferenceId: "savings",
      selectedIndex: 3,
    },
    {
      preferenceId: "maximum-savings",
      selectedIndex: 4,
    },
  ];

const EXPECTED_DECISION_FINGERPRINTS:
  Record<SmartStayUtilityPreferenceIdV2, string> = {
    "maximum-comfort":
      "3317d2856da9d5faf9ada8aa8d5d5c4cc7b37bf537f38fbe572f8f2b4b1ecdf8",
    comfort:
      "4f85e31a85d97097a06b4cbb2062227176ac0fdb90c5dc04e88b86b112edc79a",
    balanced:
      "c9968674279d85f066939af5f9ee08ee3969840f4d51270faace6c13dfb035db",
    savings:
      "0f33e83683fcc2c5dac4da9ad710c4b23f4eb7f67efb78e09e31903211b27291",
    "maximum-savings":
      "ff51c2d551d347bf1100349684998269a2c8652362ef8bfe2e99f8f234148084",
  };

function createInput(
  preferenceId: SmartStayUtilityPreferenceIdV2 = "balanced",
  selectedIndex = 2,
  hotels: Hotel[] = HOTELS
): SmartStayEngineV2SearchInput {
  return {
    hotels,
    preferenceId,
    selectedIndex,
    preferenceSource: "manual",
    totalBudget: 500,
    maximumDistanceKm: 5,
    selectedLocation: {
      latitude: 43.7696,
      longitude: 11.2558,
      confidence: 1,
      label: "Florence",
    },
    nights: 3,
    adults: 2,
    children: 0,
    rooms: 1,
    destinationKey: "Florence, Italy",
    currency: "EUR",
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    capturedAt: "2026-08-01T10:00:00.000Z",
    bookingReferenceAt: "2026-08-01T10:00:00.000Z",
    marketContextMode: "hybrid",
    tripProfile: "leisure",
    maximumVisibleResults: 4,
  };
}

function createDecisionSurface(
  result: SmartStayEngineV2SearchResult,
  trace: SmartStayRecommendationDecisionTraceV2
) {
  return {
    engineVersion: result.engineVersion,
    pipelineVersion: result.pipelineVersion,
    preferenceId: result.budgetIntent.preferenceId,
    bestChoiceHotelId: result.recommendationRoles.bestChoiceHotelId,
    bestChoiceGroup: result.recommendationRoles.bestChoiceGroup,
    recommendationGroups: result.recommendationRoles.groups,
    recommendationPicks: result.recommendationRoles.picks.map(
      (pick) => ({
        hotelId: pick.hotelId,
        role: pick.role,
        comparisonTargetHotelId: pick.comparisonTargetHotelId,
        assignmentScore: pick.assignmentScore,
        tieGroupId: pick.tieGroupId,
        groupPosition: pick.groupPosition,
        primaryInGroup: pick.primaryInGroup,
        reasonCodes: pick.reasonCodes,
      })
    ),
    recommendationEvaluations:
      result.recommendationRoles.evaluations.map(
        (evaluation) => ({
          hotelId: evaluation.hotelId,
          role: evaluation.role,
          eligible: evaluation.eligible,
          assignmentScore: evaluation.assignmentScore,
          tieGroupId: evaluation.tieGroupId,
          groupPosition: evaluation.groupPosition,
          primaryInGroup: evaluation.primaryInGroup,
          reasonCodes: evaluation.reasonCodes,
        })
      ),
    ranking: {
      status: result.ranking.status,
      baseRankingHotelIds: result.ranking.baseRankingHotelIds,
      stableRankingHotelIds: result.ranking.stableRankingHotelIds,
      diversifiedRankingHotelIds:
        result.ranking.diversifiedRankingHotelIds,
      visibleHotelIds: result.ranking.visibleHotelIds,
      additionalHotelIds: result.ranking.additionalHotelIds,
      excludedHotelIds: result.ranking.excludedHotelIds,
      nearDuplicateGroups: result.ranking.nearDuplicateGroups,
    },
    trace: trace.candidates.map((candidate) => ({
      hotelId: candidate.identity.hotelId,
      offerId: candidate.identity.offerId,
      disposition: candidate.disposition,
      finalRole: candidate.finalRole,
      roleDecisions: candidate.roleDecisions.map((decision) => ({
        role: decision.role,
        outcome: decision.outcome,
        eligible: decision.eligible,
        comparisonTargetHotelId: decision.comparisonTargetHotelId,
        assignmentScore: decision.assignmentScore,
        thresholdChecks: decision.thresholdChecks,
        reasonCodes: decision.reasonCodes,
        evidenceIds: decision.evidenceIds,
      })),
      exclusionReasonCodes: candidate.exclusionReasonCodes,
      explanationEvidenceIds: candidate.explanationEvidenceIds,
    })),
  };
}

function fingerprint(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

for (const scenario of PREFERENCE_SCENARIOS) {
  test(
    `Decision Trace preserves production decisions for ${scenario.preferenceId}`,
    () => {
      const input = createInput(
        scenario.preferenceId,
        scenario.selectedIndex
      );
      const inputSnapshot = structuredClone(input);
      const productionResult = evaluateSmartStaySearchV2(input);
      const diagnosticRun =
        evaluateSmartStaySearchWithInternalDiagnosticsV2(
          input,
          {
            recommendationDecisionTrace: true,
          }
        );
      const trace = diagnosticRun.recommendationDecisionTrace;

      assert.ok(trace);
      assert.deepEqual(diagnosticRun.result, productionResult);
      assert.deepEqual(input, inputSnapshot);
      assert.deepEqual(
        validateRecommendationDecisionTraceV2(trace),
        {
          valid: true,
          issues: [],
        }
      );
      assert.equal(
        trace.context.preferenceId,
        scenario.preferenceId
      );
      assert.deepEqual(
        trace.candidates
          .map((candidate) => candidate.identity.hotelId)
          .sort(),
        productionResult.evaluations
          .map((evaluation) => evaluation.hotel.id)
          .sort()
      );
      assert.equal(
        fingerprint(
          createDecisionSurface(productionResult, trace)
        ),
        EXPECTED_DECISION_FINGERPRINTS[scenario.preferenceId]
      );
    }
  );
}

test(
  "Decision Trace dispositions exactly partition recommended, full-list and excluded candidates",
  () => {
    const diagnosticRun =
      evaluateSmartStaySearchWithInternalDiagnosticsV2(
        createInput(),
        {
          recommendationDecisionTrace: true,
        }
      );
    const trace = diagnosticRun.recommendationDecisionTrace;

    assert.ok(trace);

    const result = diagnosticRun.result;
    const excludedHotelIds = new Set(result.ranking.excludedHotelIds);
    const suppressedHotelIds = new Set(
      result.ranking.nearDuplicateGroups.flatMap(
        (group) => group.suppressedHotelIds
      )
    );
    const eligibleFullListHotelIds = new Set([
      ...result.ranking.visibleHotelIds,
      ...result.ranking.additionalHotelIds,
      ...result.ranking.diversifiedRankingHotelIds,
    ]);
    const traceByHotelId = new Map(
      trace.candidates.map(
        (candidate) => [candidate.identity.hotelId, candidate] as const
      )
    );

    assert.equal(traceByHotelId.size, result.evaluations.length);

    for (const evaluation of result.evaluations) {
      const candidate = traceByHotelId.get(evaluation.hotel.id);

      assert.ok(candidate);

      const expectedDisposition =
        evaluation.recommendation.role !== "unassigned"
          ? "recommended"
          : eligibleFullListHotelIds.has(evaluation.hotel.id) &&
              !excludedHotelIds.has(evaluation.hotel.id) &&
              !suppressedHotelIds.has(evaluation.hotel.id)
            ? "eligible-full-list"
            : "excluded";

      assert.equal(candidate.disposition, expectedDisposition);
      assert.equal(candidate.finalRole, evaluation.recommendation.role);

      const selectedRoles = candidate.roleDecisions.filter(
        (decision) => decision.outcome === "selected"
      );

      if (candidate.finalRole === "unassigned") {
        assert.deepEqual(selectedRoles, []);
      } else {
        assert.equal(selectedRoles.length, 1);
        assert.equal(selectedRoles[0].role, candidate.finalRole);
      }
    }

    assert.ok(
      trace.candidates.some(
        (candidate) => candidate.disposition === "recommended"
      ),
      JSON.stringify(
        diagnosticRun.result.evaluations.map((evaluation) => ({
          hotelId: evaluation.hotel.id,
          reliabilityStatus: evaluation.reliabilityGate.status,
          blockingReasonCodes:
            evaluation.reliabilityGate.blockingReasonCodes,
          warningCodes: evaluation.reliabilityGate.warningCodes,
        }))
      )
    );
    assert.ok(
      trace.candidates.some(
        (candidate) => candidate.disposition === "eligible-full-list"
      )
    );
    assert.ok(
      trace.candidates.some(
        (candidate) => candidate.disposition === "excluded"
      )
    );
  }
);

test(
  "Decision Trace role evidence stays aligned with Recommendation Roles and the existing Saving trace",
  () => {
    const diagnosticRun =
      evaluateSmartStaySearchWithInternalDiagnosticsV2(
        createInput(),
        {
          recommendationDecisionTrace: true,
        }
      );
    const trace = diagnosticRun.recommendationDecisionTrace;

    assert.ok(trace);

    const recommendationByHotelId = new Map(
      diagnosticRun.result.recommendationRoles.evaluations.map(
        (evaluation) => [evaluation.hotelId, evaluation] as const
      )
    );
    const savingByHotelId = new Map(
      diagnosticRun.result.recommendationRoles.savingDecisionTrace.map(
        (candidate) => [candidate.hotelId, candidate] as const
      )
    );
    const evaluationByHotelId = new Map(
      diagnosticRun.result.evaluations.map(
        (evaluation) => [evaluation.hotel.id, evaluation] as const
      )
    );
    const availableEvidenceIds = new Set(
      diagnosticRun.result.evaluations.flatMap(
        (evaluation) => evaluation.evidence.map((fact) => fact.id)
      )
    );

    for (const candidate of trace.candidates) {
      const hotelId = candidate.identity.hotelId;
      const recommendation = recommendationByHotelId.get(hotelId);
      const saving = savingByHotelId.get(hotelId);
      const evaluation = evaluationByHotelId.get(hotelId);

      assert.ok(recommendation);
      assert.ok(saving);
      assert.ok(evaluation);
      assert.equal(candidate.finalRole, recommendation.role);
      assert.deepEqual(
        candidate.roleDecisions.map((decision) => decision.role),
        SMARTSTAY_DECISION_TRACE_ROLES_V2
      );

      const savingDecision = candidate.roleDecisions.find(
        (decision) => decision.role === "best-sensible-saving"
      );
      const bestLocationDecision = candidate.roleDecisions.find(
        (decision) => decision.role === "best-location"
      );

      assert.ok(savingDecision);
      assert.equal(savingDecision.outcome, saving.outcome);
      assert.deepEqual(savingDecision.reasonCodes, saving.reasonCodes);
      assert.ok(bestLocationDecision);
      assert.equal(bestLocationDecision.outcome, "not-applicable");
      assert.deepEqual(
        bestLocationDecision.reasonCodes,
        ["decision-trace-best-location-role-not-implemented"]
      );

      for (const evidenceId of candidate.explanationEvidenceIds) {
        assert.ok(
          availableEvidenceIds.has(evidenceId),
          `${hotelId} cites missing explanation evidence ${evidenceId}`
        );
      }
    }
  }
);

test(
  "Decision Trace diagnostics are deterministic and do not mutate canonical input",
  () => {
    const input = createInput();
    const inputSnapshot = structuredClone(input);
    const first = evaluateSmartStaySearchWithInternalDiagnosticsV2(
      input,
      {
        recommendationDecisionTrace: true,
      }
    );
    const second = evaluateSmartStaySearchWithInternalDiagnosticsV2(
      input,
      {
        recommendationDecisionTrace: true,
      }
    );
    const reversed = evaluateSmartStaySearchWithInternalDiagnosticsV2(
      createInput("balanced", 2, [...HOTELS].reverse()),
      {
        recommendationDecisionTrace: true,
      }
    );

    assert.deepEqual(second, first);
    assert.deepEqual(reversed, first);
    assert.deepEqual(input, inputSnapshot);
  }
);

test(
  "ENG-01D retains the approved Golden Dataset and invariant coverage baseline",
  () => {
    const validation = validateSmartStayGoldenDatasetV2();

    assert.equal(
      validation.version,
      SMARTSTAY_GOLDEN_DATASET_VERSION_V2
    );
    assert.equal(
      getSmartStayGoldenDatasetFingerprintV2(),
      "47114588"
    );
    assert.equal(validation.scenarioCount, 10);
    assert.equal(validation.candidateCount, 39);
    assert.equal(validation.coveredInvariantCodes.length, 20);

    for (const invariantCode of [
      "mandatory-requirements",
      "no-primary-when-no-within-budget",
      "duplicate-properties-grouped",
      "ranking-deterministic",
      "price-increase-cannot-improve",
      "role-separation",
      "explanations-grounded",
    ] as const) {
      assert.ok(
        validation.coveredInvariantCodes.includes(invariantCode)
      );
    }
  }
);
