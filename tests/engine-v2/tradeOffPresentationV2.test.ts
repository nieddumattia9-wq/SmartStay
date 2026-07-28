import assert from "node:assert/strict";
import test from "node:test";

import type {
  HotelOffer,
} from "../../src/types/hotel";
import type {
  SmartStaySelectedOfferV2,
} from "../../src/engine-v2/offers/intentAwareOfferSelectionV2";

import {
  buildDisplayedTradeOffsV2,
  hasIndependentRiskFactorsV2,
  selectDistinctTradeOffMessagesV2,
} from "../../src/engine-v2/frontend/tradeOffPresentationV2";

const GENERIC_NON_REFUNDABLE =
  "The selected offer is non-refundable.";
const CONTEXTUAL_NON_REFUNDABLE =
  "The selected offer is non-refundable. The short booking window reduces the practical value of cancellation flexibility.";
const GENERIC_RISK =
  "Available evidence indicates some booking uncertainty.";
const GENERIC_TAX =
  "Some mandatory taxes or fees may still need final confirmation.";
const CONTEXTUAL_TAX =
  "The provider reported this amount, but tax inclusion was not confirmed and the final total may be higher.";

function createSelectedOffer(
  refundable: boolean | null,
  taxesIncluded: boolean | null
): SmartStaySelectedOfferV2 {
  return {
    hotelId: "hotel-1",
    offerId: "offer-1",
    provider: "provider-test",
    roomName: "Double room",
    amount: 450,
    currency: "EUR",
    completeness:
      taxesIncluded === null
        ? "reported-tax-status-unknown"
        : "reported-complete",
    bookable: true,
    refundable,
    freeCancellationUntil:
      refundable === true
        ? "2026-08-01"
        : null,
    cancellationPolicyKnown:
      refundable !== null,
    taxesIncluded,
    excludedTaxes: 0,
    unknownTaxes:
      taxesIncluded === null
        ? 25
        : 0,
    roomTier: "standard",
    roomTierRank: 2,
    selectionMode: "lowest-price",
    reasonCodes: [],
  };
}

function createVerifiedOffer(
  refundable: boolean | null,
  taxesIncluded: boolean | null
): HotelOffer {
  return {
    id: "verified-offer-1",
    provider: "provider-test",
    price: 450,
    basePrice: 450,
    saving: 0,
    currency: "EUR",
    cancellationPolicy:
      refundable === true
        ? "Free cancellation"
        : refundable === false
          ? "Non-refundable"
          : null,
    refundableTag: null,
    refundable,
    freeCancellationUntil:
      refundable === true
        ? "2026-08-01"
        : null,
    cancellationPenalty: null,
    cancellationPenaltyCurrency: null,
    cancellationPenaltyType: null,
    cancellationTimezone: null,
    taxesIncluded,
    includedTaxes: 0,
    excludedTaxes: 0,
    unknownTaxes:
      taxesIncluded === null
        ? 25
        : 0,
    totalKnownCost: 450,
    roomName: "Double room",
    mealPlan: null,
    bookable: true,
    redirectable: false,
  };
}

test(
  "semantic trade-off selection keeps the richer non-refundable explanation once",
  () => {
    const result =
      selectDistinctTradeOffMessagesV2(
        [
          GENERIC_NON_REFUNDABLE,
          CONTEXTUAL_NON_REFUNDABLE,
          GENERIC_NON_REFUNDABLE,
        ],
        2
      );

    assert.deepEqual(
      result,
      [
        CONTEXTUAL_NON_REFUNDABLE,
      ]
    );
  }
);

test(
  "displayed trade-offs stay capped at two distinct concepts and place generic risk last",
  () => {
    const result =
      selectDistinctTradeOffMessagesV2(
        [
          GENERIC_RISK,
          GENERIC_NON_REFUNDABLE,
          GENERIC_TAX,
        ],
        2
      );

    assert.deepEqual(
      result,
      [
        GENERIC_NON_REFUNDABLE,
        GENERIC_TAX,
      ]
    );
  }
);

test(
  "two separate cards receive the same semantic deduplication without sharing state",
  () => {
    const firstCard =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          GENERIC_NON_REFUNDABLE,
          CONTEXTUAL_NON_REFUNDABLE,
        ],
        selectedOffer:
          createSelectedOffer(
            false,
            true
          ),
        displayOfferOverride:
          null,
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    const secondCard =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          GENERIC_NON_REFUNDABLE,
          CONTEXTUAL_NON_REFUNDABLE,
        ],
        selectedOffer: {
          ...createSelectedOffer(
            false,
            true
          ),
          hotelId:
            "hotel-2",
          offerId:
            "offer-2",
        },
        displayOfferOverride:
          null,
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      firstCard,
      [
        CONTEXTUAL_NON_REFUNDABLE,
      ]
    );
    assert.deepEqual(
      secondCard,
      firstCard
    );
  }
);

test(
  "a verified refundable offer removes the stale non-refundable warning",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          CONTEXTUAL_NON_REFUNDABLE,
        ],
        selectedOffer:
          createSelectedOffer(
            false,
            true
          ),
        displayOfferOverride:
          createVerifiedOffer(
            true,
            true
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      []
    );
  }
);

test(
  "a verified change to non-refundable adds exactly one current warning",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [],
        selectedOffer:
          createSelectedOffer(
            true,
            true
          ),
        displayOfferOverride:
          createVerifiedOffer(
            false,
            true
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      [
        GENERIC_NON_REFUNDABLE,
      ]
    );
  }
);

test(
  "tax uncertainty keeps the richer tax explanation once",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          GENERIC_TAX,
          CONTEXTUAL_TAX,
        ],
        selectedOffer:
          createSelectedOffer(
            true,
            null
          ),
        displayOfferOverride:
          null,
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      [
        CONTEXTUAL_TAX,
      ]
    );
  }
);

test(
  "generic risk is suppressed when refundability factors are already explained",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "offer-non-refundable",
          "cancellation-penalty-exposure",
        ],
        {
          refundability: true,
        }
      ),
      false
    );
  }
);

test(
  "generic risk remains available for an independent location factor",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "offer-non-refundable",
          "location-warning:outside-selected-distance",
        ],
        {
          refundability: true,
        }
      ),
      true
    );
  }
);

test(
  "technical location fallback warnings do not create a generic risk echo",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "offer-non-refundable",
          "location-warning:selected-location-coordinates-unavailable",
          "location-warning:property-coordinates-unavailable",
          "location-warning:provider-distance-reference-unverified",
        ],
        {
          refundability: true,
        }
      ),
      false
    );
  }
);

test(
  "an unverifiable hard distance limit remains an independent booking risk",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "offer-non-refundable",
          "location-warning:explicit-distance-limit-unverified",
        ],
        {
          refundability: true,
        }
      ),
      true
    );
  }
);

test(
  "an unexplained risk level is not repeated when concrete coverage already exists",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [],
        {
          refundability: true,
        }
      ),
      false
    );
  }
);

test(
  "medium data confidence does not create a second generic warning beside a concrete non-refundable trade-off",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "offer-non-refundable",
          "data-confidence-medium",
        ],
        {
          refundability: true,
        }
      ),
      false
    );
  }
);

test(
  "material unverified comfort requirements remain an independent booking risk",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "offer-non-refundable",
          "mandatory-features-unverified",
        ],
        {
          refundability: true,
        }
      ),
      true
    );
  }
);


test(
  "a verified non-refundable change stays visible ahead of older secondary trade-offs",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          "Exceeds your total budget by €25.",
          "Located farther from your selected point.",
        ],
        selectedOffer:
          createSelectedOffer(
            true,
            true
          ),
        displayOfferOverride:
          createVerifiedOffer(
            false,
            true
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      [
        GENERIC_NON_REFUNDABLE,
        "Exceeds your total budget by €25.",
      ]
    );
  }
);

test(
  "a verified unknown tax status stays visible ahead of older secondary trade-offs",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          "Exceeds your total budget by €25.",
          "Located farther from your selected point.",
        ],
        selectedOffer:
          createSelectedOffer(
            true,
            true
          ),
        displayOfferOverride:
          createVerifiedOffer(
            true,
            null
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      [
        GENERIC_TAX,
        "Exceeds your total budget by €25.",
      ]
    );
  }
);

test(
  "a concrete low-confidence explanation covers its risk factor without a generic warning",
  () => {
    assert.equal(
      hasIndependentRiskFactorsV2(
        [
          "data-confidence-low",
        ],
        {
          dataConfidence: true,
        }
      ),
      false
    );
  }
);

test(
  "different comfort requirements remain separate trade-offs",
  () => {
    const result =
      selectDistinctTradeOffMessagesV2(
        [
          "Parking availability is not confirmed.",
          "The selected room type is not confirmed.",
        ],
        2
      );

    assert.deepEqual(
      result,
      [
        "Parking availability is not confirmed.",
        "The selected room type is not confirmed.",
      ]
    );
  }
);

test(
  "a verified unknown refundability removes a stale non-refundable warning",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          CONTEXTUAL_NON_REFUNDABLE,
        ],
        selectedOffer:
          createSelectedOffer(
            false,
            true
          ),
        displayOfferOverride:
          createVerifiedOffer(
            null,
            true
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      []
    );
  }
);

test(
  "a verified known tax status removes stale tax uncertainty",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [
          CONTEXTUAL_TAX,
        ],
        selectedOffer:
          createSelectedOffer(
            true,
            null
          ),
        displayOfferOverride:
          createVerifiedOffer(
            true,
            true
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      []
    );
  }
);

test(
  "a verified change to unknown tax status adds one current tax warning",
  () => {
    const result =
      buildDisplayedTradeOffsV2({
        tradeOffs: [],
        selectedOffer:
          createSelectedOffer(
            true,
            true
          ),
        displayOfferOverride:
          createVerifiedOffer(
            true,
            null
          ),
        riskLevel:
          "medium",
        dataConfidenceLevel:
          "high",
      });

    assert.deepEqual(
      result,
      [
        GENERIC_TAX,
      ]
    );
  }
);
