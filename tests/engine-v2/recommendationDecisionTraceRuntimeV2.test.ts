import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  evaluateSmartStaySearchV2,
  evaluateSmartStaySearchWithInternalDiagnosticsV2,
  type SmartStayEngineV2SearchInput,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  SMARTSTAY_DECISION_TRACE_ROLES_V2,
  SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2,
  validateRecommendationDecisionTraceV2,
} from "../../src/engine-v2/recommendation/recommendationDecisionTraceV2";

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
    freeCancellationUntil: "2026-05-10T00:00:00.000Z",
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
    name: `Hotel ${input.id}`,
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
    address: `${input.offerIndex} Decision Trace Street`,
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

function createInput(hotels: Hotel[] = HOTELS): SmartStayEngineV2SearchInput {
  return {
    hotels,
    preferenceId: "balanced",
    selectedIndex: 2,
    preferenceSource: "automatic",
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
    checkIn: "2026-05-15",
    checkOut: "2026-05-18",
    capturedAt: "2026-04-01T10:00:00.000Z",
    bookingReferenceAt: "2026-04-01T10:00:00.000Z",
    marketContextMode: "hybrid",
    tripProfile: "leisure",
    maximumVisibleResults: 4,
  };
}

test(
  "Decision Trace diagnostic flag stays off without changing the production result",
  () => {
    const input = createInput();
    const productionResult = evaluateSmartStaySearchV2(input);
    const diagnosticRun =
      evaluateSmartStaySearchWithInternalDiagnosticsV2(input);

    assert.equal(diagnosticRun.recommendationDecisionTrace, null);
    assert.deepEqual(diagnosticRun.result, productionResult);
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        diagnosticRun.result,
        "recommendationDecisionTrace"
      ),
      false
    );
  }
);

test(
  "Decision Trace runtime covers every candidate and preserves exact role outcomes",
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
    assert.equal(
      trace.internalOnly,
      SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2
    );
    assert.equal(trace.generatedAt, "2026-04-01T10:00:00.000Z");
    assert.equal(trace.context.preferenceId, "balanced");
    assert.equal(trace.context.preferenceSource, "automatic");
    assert.equal(trace.context.budgetCurrency, "EUR");
    assert.equal(trace.candidates.length, HOTELS.length);
    assert.deepEqual(
      validateRecommendationDecisionTraceV2(trace),
      {
        valid: true,
        issues: [],
      }
    );

    const sourceSavingTrace = new Map(
      diagnosticRun.result.recommendationRoles.savingDecisionTrace.map(
        (candidate) => [candidate.hotelId, candidate] as const
      )
    );

    for (const candidate of trace.candidates) {
      assert.deepEqual(
        candidate.roleDecisions.map((decision) => decision.role),
        SMARTSTAY_DECISION_TRACE_ROLES_V2
      );
      assert.ok(candidate.identity.offerId);
      assert.ok(candidate.price.totalAmount);
      assert.ok(candidate.price.perRoomNightAmount);
      assert.equal(candidate.price.currency, "EUR");
      assert.equal(candidate.price.includedTaxes, 24);
      assert.equal(candidate.reputation.reviewCountRelation, "equal");

      const savingDecision = candidate.roleDecisions.find(
        (decision) => decision.role === "best-sensible-saving"
      );
      const sourceSaving = sourceSavingTrace.get(candidate.identity.hotelId);

      assert.ok(savingDecision);
      assert.ok(sourceSaving);
      assert.equal(savingDecision.outcome, sourceSaving.outcome);
      assert.deepEqual(savingDecision.reasonCodes, sourceSaving.reasonCodes);

      const bestLocationDecision = candidate.roleDecisions.find(
        (decision) => decision.role === "best-location"
      );

      assert.deepEqual(
        bestLocationDecision?.reasonCodes,
        ["decision-trace-best-location-role-not-implemented"]
      );
    }

    const farCandidate = trace.candidates.find(
      (candidate) => candidate.identity.hotelId === "far-cheap"
    );

    assert.ok(farCandidate);
    assert.equal(farCandidate.disposition, "excluded");
    assert.equal(farCandidate.finalRole, "unassigned");
    assert.ok(
      farCandidate.exclusionReasonCodes.includes("distance-limit-exceeded")
    );
    assert.equal(
      farCandidate.roleDecisions.some(
        (decision) => decision.outcome === "selected"
      ),
      false
    );

    const recommendedCandidates = trace.candidates.filter(
      (candidate) => candidate.disposition === "recommended"
    );

    assert.ok(recommendedCandidates.length > 0);
    for (const candidate of recommendedCandidates) {
      const selectedDecisions = candidate.roleDecisions.filter(
        (decision) => decision.outcome === "selected"
      );

      assert.equal(selectedDecisions.length, 1);
      assert.equal(selectedDecisions[0].role, candidate.finalRole);
    }

    assert.ok(
      trace.candidates.some(
        (candidate) => candidate.disposition === "eligible-full-list"
      )
    );
  }
);

test(
  "Decision Trace runtime is deterministic when provider order changes",
  () => {
    const forward = evaluateSmartStaySearchWithInternalDiagnosticsV2(
      createInput(),
      {
        recommendationDecisionTrace: true,
      }
    );
    const reversed = evaluateSmartStaySearchWithInternalDiagnosticsV2(
      createInput([...HOTELS].reverse()),
      {
        recommendationDecisionTrace: true,
      }
    );

    assert.deepEqual(reversed, forward);
  }
);

test(
  "Decision Trace runtime handles an empty provider result without inventing candidates",
  () => {
    const diagnosticRun =
      evaluateSmartStaySearchWithInternalDiagnosticsV2(
        createInput([]),
        {
          recommendationDecisionTrace: true,
        }
      );
    const trace = diagnosticRun.recommendationDecisionTrace;

    assert.ok(trace);
    assert.deepEqual(trace.candidates, []);
    assert.deepEqual(
      validateRecommendationDecisionTraceV2(trace),
      {
        valid: true,
        issues: [],
      }
    );
  }
);

test(
  "Decision Trace runtime remains provider-agnostic and outside frontend and public presenters",
  () => {
    const runtimeSource = readFileSync(
      resolve(
        process.cwd(),
        "src/engine-v2/recommendation/recommendationDecisionTraceRuntimeV2.ts"
      ),
      "utf8"
    );
    const frontendSource = readFileSync(
      resolve(
        process.cwd(),
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts"
      ),
      "utf8"
    );
    const publicPresenterSource = readFileSync(
      resolve(process.cwd(), "server/presenters/publicHotelPresenter.js"),
      "utf8"
    );

    assert.doesNotMatch(runtimeSource, /liteapi|routestack/i);
    assert.doesNotMatch(frontendSource, /recommendationDecisionTrace/i);
    assert.doesNotMatch(publicPresenterSource, /recommendationDecisionTrace/i);
  }
);
