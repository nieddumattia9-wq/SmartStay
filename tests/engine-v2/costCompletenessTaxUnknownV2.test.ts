import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  getBestComparableStayCost,
} from "../../src/utils/stayCost";

import {
  selectHotelOffers,
} from "../../src/utils/hotelOfferSelection";

import {
  classifyAccommodationV2,
} from "../../src/engine-v2/categories/accommodationCategoryModel";

import {
  buildHotelEvidenceModelV2,
} from "../../src/engine-v2/evidence/hotelEvidenceModel";

import {
  evaluateReliabilityGateV2,
} from "../../src/engine-v2/reliability/reliabilityGate";

import {
  evaluateDataConfidenceV2,
} from "../../src/engine-v2/risk/dataConfidenceEngine";

import {
  evaluateRiskV2,
} from "../../src/engine-v2/risk/riskEngine";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

function createTaxStatusUnknownOffer(): HotelOffer {
  return {
    id:
      "offer-1",

    provider:
      "LiteAPI",

    price:
      480,

    basePrice:
      480,

    saving:
      0,

    currency:
      "EUR",

    cancellationPolicy:
      "Refundable",

    refundableTag:
      "RFN",

    refundable:
      true,

    freeCancellationUntil:
      "2026-08-07T00:00:00Z",

    cancellationPenalty:
      null,

    cancellationPenaltyCurrency:
      null,

    cancellationPenaltyType:
      null,

    cancellationTimezone:
      "Europe/Rome",

    taxesIncluded:
      null,

    includedTaxes:
      0,

    excludedTaxes:
      0,

    unknownTaxes:
      0,

    totalKnownCost:
      480,

    roomName:
      "Superior Double Room",

    bookable:
      true,

    redirectable:
      false,
  };
}

function createTaxStatusUnknownHotel(): Hotel {
  return {
    id:
      "tax-status-unknown",

    dataSources: [
      "liteapi",
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
      createTaxStatusUnknownOffer(),
    ],

    name:
      "Tax Status Unknown Hotel",

    provider:
      "LiteAPI",

    accommodationCategory:
      "hotel",

    stars:
      4,

    reviewScore:
      9.1,

    reviewCount:
      1200,

    reviewText:
      "Excellent",

    price:
      480,

    basePrice:
      480,

    saving:
      0,

    currency:
      "EUR",

    taxesIncluded:
      null,

    includedTaxes:
      0,

    excludedTaxes:
      0,

    unknownTaxes:
      0,

    totalKnownCost:
      480,

    distance:
      0.8,

    image:
      "https://images.example/tax-status-unknown.jpg",

    address:
      "1 SmartStay Street",

    city:
      "Florence",

    country:
      "Italy",

    latitude:
      43.773,

    longitude:
      11.255,

    amenities: [
      "Private bathroom",
      "WiFi",
      "Air conditioning",
      "Breakfast",
      "Reception",
      "Elevator",
      "Daily housekeeping",
    ],

    facilities: [
      "Room service",
    ],
  };
}

function createSearchInput() {
  return {
    hotels: [
      createTaxStatusUnknownHotel(),
    ],

    preferenceId:
      "balanced" as const,

    selectedIndex:
      2,

    preferenceSource:
      "automatic" as const,

    totalBudget:
      500,

    maximumDistanceKm:
      5,

    selectedLocation: {
      latitude:
        43.7696,

      longitude:
        11.2558,

      confidence:
        1,

      label:
        "Florence",
    },

    nights:
      2,

    adults:
      2,

    children:
      0,

    rooms:
      1,

    destinationKey:
      "Florence, Italy",

    currency:
      "EUR",

    checkIn:
      "2026-08-10",

    checkOut:
      "2026-08-12",

    maximumVisibleResults:
      3,

    capturedAt:
      null,
  };
}

test(
  "A provider-reported amount with unconfirmed tax inclusion receives its own completeness state",
  () => {
    const hotel =
      createTaxStatusUnknownHotel();

    assert.equal(
      getBestComparableStayCost(
        hotel
      )?.completeness,
      "reported-tax-status-unknown"
    );

    assert.equal(
      selectHotelOffers(
        hotel
      ).primary?.completeness,
      "reported-tax-status-unknown"
    );
  }
);

test(
  "Unknown tax inclusion remains usable without being promoted to strong data",
  () => {
    const hotel =
      createTaxStatusUnknownHotel();

    const accommodation =
      classifyAccommodationV2({
        hotel,

        explicitCategory:
          hotel.accommodationCategory,
      });

    const evidence =
      buildHotelEvidenceModelV2({
        hotel,

        accommodation:
          accommodation.profile,

        categoryEvidence:
          accommodation.evidence,

        offerSelectionPreferenceId:
          "balanced",
      });

    const costFact =
      evidence.facts.find(
        (fact) =>
          fact.code ===
          "stay.cost.total"
      );

    const completenessFact =
      evidence.facts.find(
        (fact) =>
          fact.code ===
          "stay.cost.completeness"
      );

    assert.equal(
      costFact?.availability,
      "known"
    );

    assert.equal(
      costFact?.confidence,
      0.82
    );

    assert.equal(
      completenessFact?.value,
      "reported-tax-status-unknown"
    );

    const reliability =
      evaluateReliabilityGateV2({
        evidence:
          evidence.facts,
      });

    assert.equal(
      reliability.status,
      "usable"
    );

    assert.equal(
      reliability.eligible,
      true
    );

    assert.ok(
      reliability.warningCodes.includes(
        "cost-tax-status-unknown"
      )
    );

    const dataConfidence =
      evaluateDataConfidenceV2({
        evidence:
          evidence.facts,
      });

    const risk =
      evaluateRiskV2({
        evidence:
          evidence.facts,

        reliabilityGate:
          reliability,

        dataConfidence,
      });

    assert.ok(
      risk.factorCodes.includes(
        "tax-inclusion-status-unknown"
      )
    );
  }
);

test(
  "The live ranking keeps the stay visible and discloses the possible tax increase",
  () => {
    const input =
      createSearchInput();

    const result =
      evaluateSmartStaySearchV2(
        input
      );

    assert.ok(
      result.ranking.visibleHotelIds.includes(
        "tax-status-unknown"
      )
    );

    const evaluation =
      result.evaluations.find(
        (candidate) =>
          candidate.hotel.id ===
          "tax-status-unknown"
      );

    assert.equal(
      evaluation
        ?.evidence
        .find(
          (fact) =>
            fact.code ===
            "stay.cost.completeness"
        )
        ?.value,
      "reported-tax-status-unknown"
    );

    assert.ok(
      evaluation
        ?.scores
        .priceValue
        .signalCodes
        .includes(
          "target-tax-status-unknown"
        )
    );

    assert.equal(
      evaluation
        ?.constraints
        .find(
          (constraint) =>
            constraint.kind ===
            "budget"
        )
        ?.status,
      "unknown"
    );

    assert.ok(
      !evaluation
        ?.explanation
        .strengthFacts
        .some(
          (fact) =>
            fact.code ===
            "explanation-strength-within-budget"
        )
    );

    const frontend =
      buildSmartStayFrontendViewV2(
        input
      );

    const frontendEvaluation =
      frontend.rankedHotels.find(
        (candidate) =>
          candidate.hotel.id ===
          "tax-status-unknown"
      );

    assert.equal(
      frontendEvaluation
        ?.selectedOffer
        ?.completeness,
      "reported-tax-status-unknown"
    );

    assert.ok(
      frontendEvaluation
        ?.tradeOffs
        .includes(
          "The provider reported this amount, but tax inclusion was not confirmed and the final total may be higher."
        )
    );

    assert.ok(
      !frontendEvaluation
        ?.strengths
        .some(
          (strength) =>
            strength.startsWith(
              "Fits your total budget"
            )
        )
    );
  }
);

test(
  "Results and HotelCard expose the tax-status caveat in user-facing copy",
  () => {
    const resultsSource =
      readFileSync(
        "src/pages/Results/Results.tsx",
        "utf8"
      );

    const hotelCardSource =
      readFileSync(
        "src/components/HotelCard/HotelCard.tsx",
        "utf8"
      );

    assert.ok(
      resultsSource.includes(
        "tax inclusion not confirmed, so the final total may be higher"
      )
    );

    assert.ok(
      hotelCardSource.includes(
        "Provider-reported stay amount; tax inclusion was not confirmed"
      )
    );
  }
);
