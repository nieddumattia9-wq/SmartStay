import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createLiteApiOffer,
  createLiteApiPrebookOffer,
  normalizeCancellationDeadline,
} = require(
  "../../server/providers/liteApi/liteApiOfferMapper.js"
);

const {
  compareBookingOfferSnapshots,
  createBookingStayContext,
  createPublicOfferId,
} = require(
  "../../server/services/bookingOfferIntegrityService.js"
);

function createProviderRate({
  offerId = "selected-offer",
  publicAmount = 450.45,
  checkoutAmount = 311.63,
  excludedTaxes = 41.98,
  roomName = "Double or Twin",
  boardName = "Breakfast included",
} = {}) {
  return {
    offerId,
    roomName,
    boardName,
    suggestedSellingPrice: {
      amount:
        publicAmount,
      currency:
        "EUR",
    },
    offerRetailRate: {
      amount:
        checkoutAmount,
      currency:
        "EUR",
    },
    taxesAndFees: [
      {
        included:
          false,
        amount:
          excludedTaxes,
        currency:
          "EUR",
        description:
          "Local taxes",
      },
    ],
    cancellationPolicies: {
      refundableTag:
        "RFN",
      cancelPolicyInfos: [
        {
          cancelTime:
            "2026-08-04 10:00:00",
          amount:
            checkoutAmount,
          currency:
            "EUR",
          type:
            "amount",
          timezone:
            "GMT",
        },
      ],
    },
  };
}

test(
  "search and Prebook use the same provider-confirmed public retail total",
  () => {
    const rate =
      createProviderRate();

    const originalOffer =
      createLiteApiOffer({
        rate,
        hotelId:
          "hotel-1",
        index:
          0,
        fallbackCurrency:
          "EUR",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    const prebook =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          roomTypes: [
            {
              ...rate,
            },
          ],
        },
        originalOffer,
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.ok(
      originalOffer
    );

    assert.ok(
      prebook
    );

    assert.equal(
      originalOffer.price,
      311.63
    );

    assert.equal(
      originalOffer.totalKnownCost,
      353.61
    );

    assert.equal(
      prebook.offer.price,
      311.63
    );

    assert.equal(
      prebook.offer.totalKnownCost,
      353.61
    );

    assert.equal(
      prebook.offer.mealPlan,
      "Breakfast included"
    );

    assert.equal(
      prebook.offer
        .freeCancellationUntil,
      "2026-08-04T10:00:00.000Z"
    );

    assert.equal(
      prebook.providerBookingReference,
      "private-prebook-id"
    );

    assert.deepEqual(
      compareBookingOfferSnapshots(
        originalOffer,
        prebook.offer
      ).changedFields,
      []
    );
  }
);

test(
  "prebook refuses to guess when multiple rates do not match the selected provider offer",
  () => {
    const originalOffer =
      createLiteApiOffer({
        rate:
          createProviderRate(),
        hotelId:
          "hotel-1",
        index:
          0,
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    const prebook =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          roomTypes: [
            createProviderRate({
              offerId:
                "other-a",
            }),
            createProviderRate({
              offerId:
                "other-b",
            }),
          ],
        },
        originalOffer,
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.equal(
      prebook,
      null
    );
  }
);

test(
  "meal plan is part of canonical offer identity and comparison",
  () => {
    const roomOnly = {
      id:
        "liteapi:hotel-1:selected-offer",
      sourceProvider:
        "liteapi",
      price:
        100,
      totalKnownCost:
        100,
      currency:
        "EUR",
      roomName:
        "Double or Twin",
      mealPlan:
        "Room only",
      refundable:
        true,
      excludedTaxes:
        0,
      unknownTaxes:
        0,
      cancellationPolicy:
        "Refundable",
    };

    const breakfast = {
      ...roomOnly,
      mealPlan:
        "Breakfast included",
    };

    assert.notEqual(
      createPublicOfferId(
        roomOnly
      ),
      createPublicOfferId(
        breakfast
      )
    );

    assert.deepEqual(
      compareBookingOfferSnapshots(
        roomOnly,
        breakfast
      ).changedFields,
      [
        "mealPlan",
      ]
    );
  }
);

test(
  "GMT provider cancellation deadlines are preserved without a local-time shift",
  () => {
    assert.equal(
      normalizeCancellationDeadline(
        "2026-08-04 10:00:00",
        "GMT"
      ),
      "2026-08-04T10:00:00.000Z"
    );
  }
);

test(
  "booking verification binds dates, occupancy and currency to the checked offer",
  () => {
    assert.deepEqual(
      createBookingStayContext({
        checkIn:
          "2026-08-07",
        checkOut:
          "2026-08-10",
        currency:
          "eur",
        rooms: [
          {
            adults:
              2,
            children: [
              4,
            ],
          },
        ],
      }),
      {
        checkin:
          "2026-08-07",
        checkout:
          "2026-08-10",
        currency:
          "EUR",
        rooms: [
          {
            adults:
              2,
            childAges: [
              4,
            ],
          },
        ],
      }
    );
  }
);
