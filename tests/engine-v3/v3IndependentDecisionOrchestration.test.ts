import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  buildSmartStayFrontendRuntimeV2,
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  STAYOPTI_INDEPENDENT_DECISION_AUDIT_V3,
  STAYOPTI_FRONTEND_SHADOW_RUNTIME_AUDIT_V3,
  adaptV2SearchResultToDecisionV3,
  createBoundPublicRateEvidenceV3,
  createHotelSelectionTokenV3,
  createIndependentV3ComparableDecisionV3,
  createV2ComparableDecisionV3,
  deriveBoundPublicRateConsistencyV3,
  deriveIndependentShadowSafetySignalsV3,
  readFrontendShadowBufferV3,
  resetFrontendShadowBufferV3,
  runFrontendIndependentShadowRuntimeV3,
  runIndependentDecisionShadowV3,
  validateShadowObservationV3,
  type StayOptiV3CompatibilityPolicyInput,
} from "../../src/engine-v3";

function createOffer(
  index: number,
  provider: string,
  totalCost: number
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
    id: string;
    provider: string;
    totalCost: number;
    stars: number;
    reviewScore: number;
    reviewCount: number;
    distance: number;
    offerIndex: number;
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

const SEGMENT = {
  profile:
    "balanced" as const,
  destination:
    "urban" as const,
  leadTime:
    "medium" as const,
  duration:
    "short-stay" as const,
  coverage:
    "high" as const,
};

function createSource() {
  const result =
    evaluateSmartStaySearchV2(
      SEARCH_INPUT
    );

  return {
    result,
    decision:
      adaptV2SearchResultToDecisionV3({
        searchInput:
          SEARCH_INPUT,
        result,
      }),
  };
}

function createVerifiedPublicRateEvidence() {
  const {
    result,
    decision,
  } = createSource();

  const comparable =
    createIndependentV3ComparableDecisionV3(
      decision,
      result.recommendationRoles
        .bestChoiceHotelId
    );

  const selectedHotelId =
    decision.robustness
      .policyPreferredHotelId;

  const solution =
    decision.solutions.find(
      (candidate) =>
        candidate.kind ===
          "single" &&
        candidate.segments[0]
          ?.hotelId ===
          selectedHotelId
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
      "Test fixture requires one priced independent V3 recommendation."
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

test(
  "independent V3 defaults to off and returns the exact public V2 object without executing V3",
  () => {
    const result =
      evaluateSmartStaySearchV2(
        SEARCH_INPUT
      );

    const invalidIfExecuted = {
      publicSplitCardEnabled:
        true,
    } as unknown as StayOptiV3CompatibilityPolicyInput;

    const shadow =
      runIndependentDecisionShadowV3({
        comparisonToken:
          "independent-shadow-off-0001",
        segment:
          SEGMENT,
        searchInput:
          SEARCH_INPUT,
        publicV2Result:
          result,
        compatibilityPolicy:
          invalidIfExecuted,
      });

    assert.equal(
      shadow.publicResult,
      result
    );
    assert.equal(
      shadow.publicServingEngine,
      "v2"
    );
    assert.equal(
      shadow.v3Executed,
      false
    );
    assert.equal(
      shadow.shadowObservation,
      null
    );
  }
);

test(
  "V2 and independent V3 use the same semantic hotel-token projection",
  () => {
    const {
      result,
      decision,
    } = createSource();

    const v2 =
      createV2ComparableDecisionV3(
        result
      );

    const v3 =
      createIndependentV3ComparableDecisionV3(
        decision,
        result.recommendationRoles
          .bestChoiceHotelId
      );

    const v2HotelId =
      result.recommendationRoles
        .bestChoiceHotelId;

    assert.equal(
      v2.selectedSolutionToken,
      v2HotelId ===
        null
        ? null
        : createHotelSelectionTokenV3(
            v2HotelId
          )
    );

    const v3HotelId =
      decision.robustness
        .policyPreferredHotelId;

    assert.equal(
      v3.selectedSolutionToken,
      v3HotelId ===
        null
        ? null
        : createHotelSelectionTokenV3(
            v3HotelId
          )
    );
  }
);

test(
  "shadow mode records a valid independent comparison and never replaces public V2",
  () => {
    const result =
      evaluateSmartStaySearchV2(
        SEARCH_INPUT
      );

    const shadow =
      runIndependentDecisionShadowV3({
        mode:
          "shadow",
        comparisonToken:
          "independent-shadow-run-0001",
        segment:
          SEGMENT,
        searchInput:
          SEARCH_INPUT,
        publicV2Result:
          result,
        publicRateEvidence:
          createVerifiedPublicRateEvidence(),
      });

    assert.equal(
      shadow.publicResult,
      result
    );
    assert.equal(
      shadow.v3Executed,
      true
    );
    assert.equal(
      shadow.shadowObservation
        ?.recordType,
      "shadow-comparison"
    );

    if (
      shadow.shadowObservation ===
        null
    ) {
      assert.fail(
        "Expected an independent shadow observation."
      );
    }

    assert.deepEqual(
      validateShadowObservationV3(
        shadow.shadowObservation
      ),
      {
        valid:
          true,
        issues: [],
      }
    );

    if (
      shadow.shadowObservation
        .recordType ===
        "shadow-comparison"
    ) {
      assert.equal(
        shadow.shadowObservation
          .publicServingEngine,
        "v2"
      );
      assert.equal(
        shadow.shadowObservation
          .v3Authoritative,
        false
      );
      assert.equal(
        shadow.shadowObservation
          .safety
          .publicRateConsistency,
        "verified"
      );
      assert.equal(
        shadow.shadowObservation
          .safety
          .deterministicReplay,
        "pass"
      );
    }
  }
);

test(
  "unverified public rates remain a critical shadow regression",
  () => {
    const result =
      evaluateSmartStaySearchV2(
        SEARCH_INPUT
      );

    const shadow =
      runIndependentDecisionShadowV3({
        mode:
          "shadow",
        comparisonToken:
          "independent-shadow-run-0002",
        segment:
          SEGMENT,
        searchInput:
          SEARCH_INPUT,
        publicV2Result:
          result,
      });

    assert.equal(
      shadow.shadowObservation
        ?.recordType,
      "shadow-comparison"
    );

    if (
      shadow.shadowObservation
        ?.recordType ===
        "shadow-comparison"
    ) {
      assert.equal(
        shadow.shadowObservation
          .safety
          .publicRateConsistency,
        "unverified"
      );
      assert.ok(
        shadow.shadowObservation
          .criticalRegressions
          .includes(
            "public-rate-integrity"
          )
      );
    }
  }
);

test(
  "independent execution failures are isolated as shadow errors",
  () => {
    const result =
      evaluateSmartStaySearchV2(
        SEARCH_INPUT
      );

    const invalidPolicy = {
      publicSplitCardEnabled:
        true,
    } as unknown as StayOptiV3CompatibilityPolicyInput;

    const shadow =
      runIndependentDecisionShadowV3({
        mode:
          "shadow",
        comparisonToken:
          "independent-shadow-error-0001",
        segment:
          SEGMENT,
        searchInput:
          SEARCH_INPUT,
        publicV2Result:
          result,
        compatibilityPolicy:
          invalidPolicy,
      });

    assert.equal(
      shadow.publicResult,
      result
    );
    assert.equal(
      shadow.shadowObservation
        ?.recordType,
      "shadow-error"
    );
  }
);

test(
  "independent V3 can select an evaluated hotel outside the untouched V2 finalist picks",
  () => {
    const hotels =
      Array.from(
        {
          length:
            8,
        },
        (
          _unused,
          index
        ) =>
          createHotel({
            id:
              `candidate-1-${index}`,
            provider:
              index % 2 ===
                0
                ? "Provider A"
                : "Provider B",
            totalCost:
              260 +
              (
                37 +
                index *
                  53
              ) %
                390,
            stars:
              3 +
              (
                1 +
                index
              ) %
                3,
            reviewScore:
              7.5 +
              (
                (
                  11 +
                  index *
                    7
                ) %
                  20
              ) /
                10,
            reviewCount:
              120 +
              (
                83 +
                index *
                  197
              ) %
                1_800,
            distance:
              0.3 +
              (
                (
                  5 +
                  index *
                    3
                ) %
                  25
              ) /
                10,
            offerIndex:
              10 +
              index,
          })
      );

    const searchInput = {
      ...SEARCH_INPUT,
      hotels,
      preferenceId:
        "maximum-savings" as const,
    };

    const result =
      evaluateSmartStaySearchV2(
        searchInput
      );

    const decision =
      adaptV2SearchResultToDecisionV3({
        searchInput,
        result,
      });

    const v2HotelId =
      result.recommendationRoles
        .bestChoiceHotelId;
    const v3HotelId =
      decision.robustness
        .policyPreferredHotelId;
    const v2PickHotelIds =
      result.recommendationRoles
        .picks.map(
          (pick) =>
            pick.hotelId
        );

    assert.equal(
      v2HotelId,
      "candidate-1-0"
    );
    assert.equal(
      v3HotelId,
      "candidate-1-7"
    );
    assert.deepEqual(
      v2PickHotelIds,
      [
        "candidate-1-0",
        "candidate-1-1",
      ]
    );
    assert.equal(
      v2PickHotelIds.includes(
        v3HotelId ??
        ""
      ),
      false
    );

    const v3 =
      createIndependentV3ComparableDecisionV3(
        decision,
        v2HotelId
      );

    assert.equal(
      v3.status,
      "recommended"
    );
    assert.equal(
      v3.selectedSolutionToken,
      createHotelSelectionTokenV3(
        "candidate-1-7"
      )
    );
  }
);

test(
  "SPLIT is rejected before independent V3 comparison",
  () => {
    const {
      result,
      decision,
    } = createSource();

    const splitDecision =
      structuredClone(
        decision
      );

    splitDecision
      .temporalOptimization
      .status =
      "split-recommended";
    splitDecision
      .temporalOptimization
      .splitSolutionId =
      "solution:split:test";

    assert.throws(
      () =>
        createIndependentV3ComparableDecisionV3(
          splitDecision,
          result.recommendationRoles
            .bestChoiceHotelId
        ),
      /blocks SPLIT/
    );
  }
);

test(
  "safety derivation fails deterministic replay closed and keeps audit defaults frozen",
  () => {
    const {
      result,
      decision,
    } = createSource();

    const comparable =
      createIndependentV3ComparableDecisionV3(
        decision,
        result.recommendationRoles
          .bestChoiceHotelId
      );

    const safety =
      deriveIndependentShadowSafetySignalsV3({
        decision,
        comparable,
        publicRateEvidence:
          createVerifiedPublicRateEvidence(),
        deterministicReplayMatches:
          false,
      });

    assert.equal(
      safety.deterministicReplay,
      "fail"
    );
    assert.equal(
      STAYOPTI_INDEPENDENT_DECISION_AUDIT_V3
        .application,
      "internal-shadow-only"
    );
    assert.equal(
      STAYOPTI_INDEPENDENT_DECISION_AUDIT_V3
        .publicV2Unchanged,
      true
    );
    assert.equal(
      STAYOPTI_INDEPENDENT_DECISION_AUDIT_V3
        .splitRecommendationEnabled,
      false
    );
  }
);

test(
  "public-rate verification is bound to the selected decision and cannot be asserted with a bare status",
  () => {
    const {
      result,
      decision,
    } = createSource();

    const comparable =
      createIndependentV3ComparableDecisionV3(
        decision,
        result.recommendationRoles
          .bestChoiceHotelId
      );

    const evidence =
      createVerifiedPublicRateEvidence();

    assert.equal(
      deriveBoundPublicRateConsistencyV3({
        decision,
        comparable,
        evidence,
      }),
      "verified"
    );

    assert.equal(
      deriveBoundPublicRateConsistencyV3({
        decision,
        comparable,
        evidence: {
          ...evidence,
          decisionFingerprint:
            "fnv1a32-00000000",
        },
      }),
      "failed"
    );

    assert.equal(
      deriveBoundPublicRateConsistencyV3({
        decision,
        comparable,
      }),
      "unverified"
    );
  }
);

test(
  "the real Results runtime invokes the isolated V3 hook while the public V2 view stays byte-equivalent",
  () => {
    resetFrontendShadowBufferV3();

    const runtime =
      buildSmartStayFrontendRuntimeV2(
        SEARCH_INPUT
      );

    assert.deepEqual(
      runtime.view,
      buildSmartStayFrontendViewV2(
        SEARCH_INPUT
      )
    );

    const off =
      runFrontendIndependentShadowRuntimeV3({
        mode:
          "off",
        sourceToken:
          "runtime-link-test-0001",
        runtime,
      });

    assert.equal(
      off.publicResult,
      runtime.result
    );
    assert.equal(
      off.v3Executed,
      false
    );
    assert.deepEqual(
      readFrontendShadowBufferV3(),
      []
    );

    const shadow =
      runFrontendIndependentShadowRuntimeV3({
        mode:
          "shadow",
        sourceToken:
          "runtime-link-test-0002",
        runtime,
      });

    assert.equal(
      shadow.publicResult,
      runtime.result
    );
    assert.equal(
      shadow.publicServingEngine,
      "v2"
    );
    assert.equal(
      readFrontendShadowBufferV3()
        .length,
      1
    );
    assert.equal(
      STAYOPTI_FRONTEND_SHADOW_RUNTIME_AUDIT_V3
        .defaultMode,
      "off"
    );
    assert.equal(
      STAYOPTI_FRONTEND_SHADOW_RUNTIME_AUDIT_V3
        .externalTransmission,
      false
    );
    assert.equal(
      STAYOPTI_FRONTEND_SHADOW_RUNTIME_AUDIT_V3
        .splitEnabled,
      false
    );

    const resultsSource =
      readFileSync(
        resolve(
          process.cwd(),
          "src/pages/Results/Results.tsx"
        ),
        "utf8"
      );

    assert.match(
      resultsSource,
      /buildSmartStayFrontendRuntimeV2/
    );
    assert.match(
      resultsSource,
      /runFrontendIndependentShadowRuntimeV3/
    );
    assert.match(
      resultsSource,
      /if \(searchId\) \{/
    );

    resetFrontendShadowBufferV3();
  }
);

test(
  "independent comparable projection is deterministic",
  () => {
    const {
      result,
      decision,
    } = createSource();

    const first =
      createIndependentV3ComparableDecisionV3(
        decision,
        result.recommendationRoles
          .bestChoiceHotelId
      );

    const second =
      createIndependentV3ComparableDecisionV3(
        decision,
        result.recommendationRoles
          .bestChoiceHotelId
      );

    assert.deepEqual(
      first,
      second
    );
  }
);
