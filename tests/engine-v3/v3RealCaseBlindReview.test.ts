import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  buildSmartStayFrontendRuntimeV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  STAYOPTI_REAL_CASE_BLIND_REVIEW_AUDIT_V3,
  adaptV2SearchResultToDecisionV3,
  createBoundPublicRateEvidenceV3,
  createBlindEvaluationFromReviewResponsesV3,
  createHotelSelectionTokenV3,
  createIndependentV3ComparableDecisionV3,
  createRealCaseBlindReviewBundleV3,
  renderBlindReviewHtmlV3,
  stableSerializeV3,
  validateBlindEvaluationSetV3,
  validateRealCaseBlindReviewBundleV3,
} from "../../src/engine-v3";

function createOffer(
  index:
    number,
  provider:
    string,
  totalCost:
    number,
  refundable:
    boolean
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
      refundable
        ? "Free cancellation before arrival"
        : "Non refundable",
    refundableTag:
      refundable
        ? "RFN"
        : "NRF",
    refundable,
    freeCancellationUntil:
      refundable
        ? "2026-09-01"
        : null,
    cancellationPenalty:
      refundable
        ? 0
        : totalCost,
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
    name:
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
    refundable:
      boolean;
    index:
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
        input.index,
        input.provider,
        input.totalCost,
        input.refundable
      ),
    ],
    name:
      input.name,
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
      `${input.index} StayOpti Street`,
    city:
      "Florence",
    country:
      "Italy",
    latitude:
      43.77 +
      input.index /
        1_000,
    longitude:
      11.25 +
      input.index /
        1_000,
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

const PRIVATE_PROVIDERS = [
  "Provider A",
  "Provider B",
] as const;

const HOTELS:
  Hotel[] = [
    createHotel({
      id:
        "central-value",
      name:
        "Hotel central-value",
      provider:
        PRIVATE_PROVIDERS[0],
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
      refundable:
        true,
      index:
        1,
    }),
    createHotel({
      id:
        "sensible-saving",
      name:
        "Hotel sensible-saving",
      provider:
        PRIVATE_PROVIDERS[1],
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
      refundable:
        true,
      index:
        2,
    }),
    createHotel({
      id:
        "comfort-upgrade",
      name:
        "Hotel comfort-upgrade",
      provider:
        PRIVATE_PROVIDERS[0],
      totalCost:
        510,
      stars:
        5,
      reviewScore:
        9.2,
      reviewCount:
        1_100,
      distance:
        0.5,
      refundable:
        true,
      index:
        3,
    }),
    createHotel({
      id:
        "weak-option",
      name:
        "Hotel weak-option",
      provider:
        PRIVATE_PROVIDERS[1],
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
      refundable:
        true,
      index:
        4,
    }),
  ];

const FRONTEND_INPUT = {
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

function createVerifiedPublicRateEvidence() {
  const runtime =
    buildSmartStayFrontendRuntimeV2(
      FRONTEND_INPUT
    );

  const decision =
    adaptV2SearchResultToDecisionV3({
      searchInput:
        runtime.searchInput,
      result:
        runtime.result,
    });

  const comparable =
    createIndependentV3ComparableDecisionV3(
      decision,
      runtime.result
        .recommendationRoles
        .bestChoiceHotelId
    );

  const solution =
    decision.solutions.find(
      (candidate) =>
        candidate.kind ===
          "single" &&
        candidate.segments[0]
          ?.hotelId !==
          undefined &&
        createHotelSelectionTokenV3(
          candidate.segments[0]
            .hotelId
        ) ===
          comparable
            .selectedSolutionToken
    ) ??
    null;

  if (
    comparable.selectedSolutionToken ===
      null ||
    solution ===
      null ||
    solution.totalCost.amount ===
      null ||
    solution.totalCost.currency ===
      null
  ) {
    throw new Error(
      `Blind-review fixture requires one priced V3 recommendation (token=${comparable.selectedSolutionToken ?? "null"}, solution=${solution === null ? "null" : "present"}, amount=${solution?.totalCost.amount ?? "null"}, currency=${solution?.totalCost.currency ?? "null"}).`
    );
  }

  return createBoundPublicRateEvidenceV3({
    evidenceType:
      "rates-prebook-get-prebook",
    decisionFingerprint:
      decision.replay
        .decisionFingerprint,
    hotelSelectionToken:
      comparable
        .selectedSolutionToken,
    currency:
      solution.totalCost
        .currency,
    ratesTotal:
      solution.totalCost
        .amount,
    prebookTotal:
      solution.totalCost
        .amount,
    retrievedPrebookTotal:
      solution.totalCost
        .amount +
      0.01,
  });
}

function createBundle() {
  return createRealCaseBlindReviewBundleV3([
    {
      caseId:
        "real-case-0001",
      caseType:
        "baseline",
      segment: {
        destination:
          "urban",
        leadTime:
          "medium",
        duration:
          "short-stay",
        coverage:
          "high",
      },
      publicRateEvidence:
        createVerifiedPublicRateEvidence(),
      frontendInput:
        FRONTEND_INPUT,
    },
  ]);
}

test(
  "exact frontend decision bridge preserves the public V2 view semantics",
  () => {
    const run =
      buildSmartStayFrontendRuntimeV2(
        FRONTEND_INPUT
      );

    assert.equal(
      run.result
        .recommendationRoles
        .bestChoiceHotelId,
      run.view.recommendationPicks.find(
        (pick) =>
          pick.role ===
          "best-choice"
      )?.evaluation.hotel.id ??
        null
    );

    assert.equal(
      run.searchInput
        .preferenceId,
      "balanced"
    );

    assert.equal(
      run.result
        .engineVersion,
      run.view.engineVersion
    );
  }
);

test(
  "real-case bundle is deterministic, sealed and identity-free on the review side",
  () => {
    const first =
      createBundle();

    const second =
      createBundle();

    assert.equal(
      stableSerializeV3(
        first
      ),
      stableSerializeV3(
        second
      )
    );

    assert.deepEqual(
      validateRealCaseBlindReviewBundleV3(
        first
      ),
      {
        valid:
          true,
        issues: [],
      }
    );

    const publicPacket =
      JSON.stringify(
        first.packet
      );

    for (
      const forbidden of [
        ...PRIVATE_PROVIDERS,
        "Hotel central-value",
        "Hotel sensible-saving",
        "Hotel comfort-upgrade",
        "central-value",
        "sensible-saving",
        "comfort-upgrade",
        "leftLabel",
        "rightLabel",
        "optionToken",
        "decisionFingerprint",
      ]
    ) {
      assert.equal(
        publicPacket.includes(
          forbidden
        ),
        false,
        `review packet leaked ${forbidden}`
      );
    }

    assert.equal(
      first.packet
        .counts.total,
      1
    );

    assert.equal(
      first.assignments
        .assignments[0]
        ?.leftLabel ===
        first.assignments
          .assignments[0]
          ?.rightLabel,
      false
    );

    assert.deepEqual(
      STAYOPTI_REAL_CASE_BLIND_REVIEW_AUDIT_V3,
      {
        version:
          "3.0.0-real-case-blind-review.1",
        application:
          "offline-human-review-only",
        liveProviderCalls:
          false,
        bookingCalls:
          false,
        publicV2Changed:
          false,
        publicV3Enabled:
          false,
        splitEnabled:
          false,
        automaticPromotionAllowed:
          false,
      }
    );
  }
);

test(
  "sealed assignments deblind real responses into the existing V3-10 schema",
  () => {
    const bundle =
      createBundle();

    const evaluation =
      createBlindEvaluationFromReviewResponsesV3(
        bundle,
        [
          {
            responseId:
              "review-response-0001",
            caseId:
              "real-case-0001",
            evaluatorToken:
              "reviewer-token-0001",
            evaluatorType:
              "human",
            blinded:
              true,
            winner:
              "left",
          },
        ]
      );

    assert.deepEqual(
      validateBlindEvaluationSetV3(
        evaluation
      ),
      {
        valid:
          true,
        issues: [],
      }
    );

    assert.equal(
      evaluation.judgments[0]
        ?.leftEngine,
      bundle.assignments
        .assignments[0]
        ?.leftLabel
    );

    assert.equal(
      evaluation.counts.human,
      1
    );

    assert.equal(
      evaluation.counts.expert,
      0
    );
  }
);

test(
  "offline HTML contains the review packet but never the sealed assignment labels",
  () => {
    const bundle =
      createBundle();

    const html =
      renderBlindReviewHtmlV3(
        bundle.packet
      );

    assert.match(
      html,
      /Valutazione cieca StayOpti/
    );

    assert.match(
      html,
      /stayopti-blind-responses/
    );

    assert.equal(
      html.includes(
        "leftLabel"
      ),
      false
    );

    assert.equal(
      html.includes(
        "rightLabel"
      ),
      false
    );

    assert.equal(
      html.includes(
        PRIVATE_PROVIDERS[0]
      ),
      false
    );
  }
);

test(
  "tampering and unbound public-rate evidence fail closed",
  () => {
    const bundle =
      createBundle();

    const tampered =
      structuredClone(
        bundle
      );

    tampered.packet.cases[0]!
      .context.totalBudget =
      999;

    assert.equal(
      validateRealCaseBlindReviewBundleV3(
        tampered
      ).valid,
      false
    );

    assert.throws(
      () =>
        createRealCaseBlindReviewBundleV3([
          {
            caseId:
              "real-case-0002",
            caseType:
              "baseline",
            segment: {
              destination:
                "urban",
              leadTime:
                "medium",
              duration:
                "short-stay",
              coverage:
                "high",
            },
            publicRateEvidence: {
              ...createVerifiedPublicRateEvidence(),
              decisionFingerprint:
                "fnv1a32-00000000",
            },
            frontendInput:
              FRONTEND_INPUT,
          },
        ]),
      /decision-bound verified public-rate evidence/
    );
  }
);
