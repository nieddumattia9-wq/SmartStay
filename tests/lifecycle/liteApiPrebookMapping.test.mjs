import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createLiteApiOffer,
  createLiteApiPrebookOffer,
  getLiteApiOfferRecords,
} = require(
  "../../server/providers/liteApi/liteApiOfferMapper.js"
);

const {
  createLiteApiAdapter,
} = require(
  "../../server/providers/liteApi/liteApiAdapter.js"
);

function createOriginalOffer() {
  return {
    id:
      "liteapi:hotel-1:offer-token",
    sourceProvider:
      "liteapi",
    providerOfferReference:
      "offer-token",
    provider:
      "LiteAPI",
    price:
      100,
    totalKnownCost:
      110,
    currency:
      "EUR",
    taxesIncluded:
      false,
    includedTaxes:
      0,
    excludedTaxes:
      10,
    unknownTaxes:
      0,
    roomName:
      "Standard room",
    mealPlan:
      "Room only",
    refundable:
      true,
    cancellationPolicy:
      "Refundable",
    bookable:
      true,
  };
}

function createMultiRoomRate({
  duplicateAliases = false,
} = {}) {
  const rooms = [
    {
      offerId:
        "room-offer-a",
      roomName:
        "Standard room",
      roomTypeId:
        "room-type-a",
      boardName:
        "Breakfast included",
      refundableTag:
        "RFN",
      refundable:
        true,
      adults:
        2,
      childCount:
        0,
      offerRetailRate: {
        amount:
          95,
        currency:
          "EUR",
      },
    },
    {
      offerId:
        "room-offer-b",
      roomName:
        "Twin room",
      roomTypeId:
        "room-type-b",
      boardName:
        "Breakfast included",
      refundableTag:
        "RFN",
      refundable:
        true,
      adults:
        1,
      childCount:
        0,
      offerRetailRate: {
        amount:
          95,
        currency:
          "EUR",
      },
    },
  ];

  return {
    offerId:
      "multi-room-offer",
    offerRetailRate: {
      amount:
        190,
      currency:
        "EUR",
    },
    rates:
      rooms,
    ...(duplicateAliases
      ? {
          roomRates:
            rooms.map(
              (room) => ({
                ...room,
              })
            ),
        }
      : {}),
  };
}

function createMultiRoomOriginalOffer(
  rate = createMultiRoomRate()
) {
  return createLiteApiOffer({
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
}

function createSplitPrebookRoom(
  room,
  {
    offerId,
    amount,
    boardName,
  } = {}
) {
  return {
    roomName:
      room.roomName,
    roomTypeId:
      room.roomTypeId,
    rates: [
      {
        ...room,
        offerId:
          offerId ??
          `rotated-${room.offerId}`,
        boardName:
          boardName ??
          room.boardName,
        offerRetailRate: {
          amount:
            amount ??
            room.offerRetailRate
              .amount,
          currency:
            "EUR",
        },
      },
    ],
  };
}

test(
  "LiteAPI mapping marks every valid provider offer as explicitly bookable",
  () => {
    const mapped =
      createLiteApiOffer({
        rate: {
          offerId:
            "offer-token",
          offerRetailRate: {
            amount:
              110,
            currency:
              "EUR",
          },
          suggestedSellingPrice: {
            amount:
              120,
            currency:
              "EUR",
          },
          roomName:
            "Standard room",
        },
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

    assert.ok(
      mapped
    );

    assert.equal(
      mapped.bookable,
      true
    );
  }
);

test(
  "LiteAPI public search and checkout both use offerRetailRate while SSP stays diagnostic",
  () => {
    const providerRate = {
      offerId:
        "offer-token",
      suggestedSellingPrice: {
        amount:
          120,
        currency:
          "EUR",
      },
      offerRetailRate: {
        amount:
          95,
        currency:
          "EUR",
      },
      roomName:
        "Standard room",
    };

    const publicOffer =
      createLiteApiOffer({
        rate:
          providerRate,
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

    const checkoutOffer =
      createLiteApiOffer({
        rate:
          providerRate,
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
        priceMode:
          "checkout",
      });

    assert.equal(
      publicOffer.price,
      95
    );

    assert.equal(
      checkoutOffer.price,
      95
    );
  }
);

test(
  "LiteAPI prebook mapping keeps the original offer reference and extracts private prebook identity",
  () => {
    const originalOffer =
      createOriginalOffer();

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          hotelId:
            "hotel-1",
          roomTypes: [
            {
              roomName:
                "Standard room",
              rates: [
                {
                  offerId:
                    "offer-token",
                  suggestedSellingPrice: {
                    amount:
                      120,
                    currency:
                      "EUR",
                  },
                  offerRetailRate: {
                    amount:
                      95,
                    currency:
                      "EUR",
                  },
                  boardName:
                    "Breakfast included",
                  cancellationPolicies: {
                    refundableTag:
                      "RFN",
                    cancelPolicyInfos: [
                      {
                        cancelTime:
                          "2026-08-04 10:00:00",
                        amount:
                          95,
                        currency:
                          "EUR",
                        type:
                          "amount",
                        timezone:
                          "GMT",
                      },
                    ],
                  },
                  taxesAndFees: [
                    {
                      amount:
                        12,
                      currency:
                        "EUR",
                      included:
                        false,
                    },
                  ],
                  refundable:
                    true,
                },
              ],
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

    assert.equal(
      mapped.providerBookingReference,
      "private-prebook-id"
    );

    assert.equal(
      mapped.offer.providerOfferReference,
      "offer-token"
    );

    assert.equal(
      mapped.offer.price,
      95
    );

    assert.equal(
      mapped.offer.totalKnownCost,
      107
    );

    assert.equal(
      mapped.offer.mealPlan,
      "Breakfast included"
    );

    assert.equal(
      mapped.offer
        .freeCancellationUntil,
      "2026-08-04T10:00:00.000Z"
    );

    assert.equal(
      mapped.offer.bookable,
      true
    );
  }
);

test(
  "LiteAPI prebook selects the exact original provider offer instead of the first returned rate",
  () => {
    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          roomTypes: [
            {
              roomName:
                "Wrong room",
              rates: [
                {
                  offerId:
                    "wrong-offer",
                  offerRetailRate: {
                    amount:
                      70,
                    currency:
                      "EUR",
                  },
                },
              ],
            },
            {
              roomName:
                "Selected room",
              rates: [
                {
                  offerId:
                    "offer-token",
                  offerRetailRate: {
                    amount:
                      95,
                    currency:
                      "EUR",
                  },
                  boardName:
                    "Breakfast included",
                },
              ],
            },
          ],
        },
        originalOffer:
          createOriginalOffer(),
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.ok(
      mapped
    );

    assert.equal(
      mapped.offer.price,
      95
    );

    assert.equal(
      mapped.offer.roomName,
      "Selected room"
    );

    assert.equal(
      mapped.offer.mealPlan,
      "Breakfast included"
    );
  }
);

test(
  "LiteAPI prebook prefers the nested rate offer identity over a repeated room identity",
  () => {
    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          roomTypes: [
            {
              offerId:
                "shared-room-offer",
              roomName:
                "Shared room",
              rates: [
                {
                  offerId:
                    "wrong-offer",
                  offerRetailRate: {
                    amount:
                      70,
                    currency:
                      "EUR",
                  },
                },
                {
                  offerId:
                    "offer-token",
                  offerRetailRate: {
                    amount:
                      95,
                    currency:
                      "EUR",
                  },
                  boardName:
                    "Breakfast included",
                },
              ],
            },
          ],
        },
        originalOffer:
          createOriginalOffer(),
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.ok(
      mapped
    );

    assert.equal(
      mapped.offer.price,
      95
    );

    assert.equal(
      mapped.offer.mealPlan,
      "Breakfast included"
    );
  }
);

test(
  "LiteAPI prebook uses one stable selection fingerprint when the provider rotates offer identity",
  () => {
    const selectedRate = {
      offerId:
        "offer-token",
      offerRetailRate: {
        amount:
          95,
        currency:
          "EUR",
      },
      roomName:
        "Selected room",
      roomTypeId:
        "room-type-1",
      boardName:
        "Breakfast included",
      refundableTag:
        "RFN",
      refundable:
        true,
    };

    const originalOffer =
      createLiteApiOffer({
        rate:
          selectedRate,
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

    assert.ok(
      originalOffer
        .providerOfferContext
        .selectionFingerprint
    );

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          roomTypes: [
            {
              roomName:
                "Wrong room",
              rates: [
                {
                  offerId:
                    "rotated-wrong-offer",
                  offerRetailRate: {
                    amount:
                      70,
                    currency:
                      "EUR",
                  },
                  boardName:
                    "Room only",
                  refundable:
                    false,
                },
              ],
            },
            {
              roomName:
                "Selected room",
              rates: [
                {
                  ...selectedRate,
                  offerId:
                    "rotated-selected-offer",
                },
              ],
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
      mapped
    );

    assert.equal(
      mapped.offer.roomName,
      "Selected room"
    );

    assert.equal(
      mapped.offer.price,
      95
    );

    assert.equal(
      mapped.offer
        .providerOfferReference,
      "offer-token"
    );
  }
);

test(
  "LiteAPI prebook fails closed when rotated records share the same selection fingerprint",
  () => {
    const selectedRate = {
      offerId:
        "offer-token",
      offerRetailRate: {
        amount:
          95,
        currency:
          "EUR",
      },
      roomName:
        "Selected room",
      roomTypeId:
        "room-type-1",
      boardName:
        "Breakfast included",
      refundableTag:
        "RFN",
      refundable:
        true,
    };

    const originalOffer =
      createLiteApiOffer({
        rate:
          selectedRate,
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

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-prebook-id",
          roomTypes: [
            {
              roomName:
                "Selected room",
              rates: [
                {
                  ...selectedRate,
                  offerId:
                    "rotated-offer-a",
                },
                {
                  ...selectedRate,
                  offerId:
                    "rotated-offer-b",
                },
              ],
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

    assert.equal(
      mapped,
      null
    );
  }
);

test(
  "LiteAPI multi-room selection fingerprint is order-independent and ignores duplicate alias containers",
  () => {
    const firstOffer =
      createMultiRoomOriginalOffer(
        createMultiRoomRate({
          duplicateAliases:
            true,
        })
      );

    const reorderedRate =
      createMultiRoomRate();

    reorderedRate.offerId =
      "rotated-multi-room-offer";

    reorderedRate.rates =
      [...reorderedRate.rates]
        .reverse();

    const secondOffer =
      createMultiRoomOriginalOffer(
        reorderedRate
      );

    assert.ok(firstOffer);
    assert.ok(secondOffer);

    assert.equal(
      firstOffer
        .providerOfferContext
        .selectionFingerprint,
      secondOffer
        .providerOfferContext
        .selectionFingerprint
    );

    assert.equal(
      firstOffer
        .providerOfferContext
        .selectionRoomCount,
      2
    );
  }
);

test(
  "LiteAPI top-level roomRates are enumerated once",
  () => {
    const records =
      getLiteApiOfferRecords({
        roomRates: [
          {
            offerId:
              "one-room-rate",
            roomName:
              "Standard room",
            offerRetailRate: {
              amount:
                95,
              currency:
                "EUR",
            },
          },
        ],
      });

    assert.equal(
      records.length,
      1
    );
  }
);

test(
  "LiteAPI prebook aggregates split multi-room records when the full selection fingerprint matches",
  () => {
    const selectedRate =
      createMultiRoomRate({
        duplicateAliases:
          true,
      });

    const originalOffer =
      createMultiRoomOriginalOffer(
        selectedRate
      );

    const [firstRoom, secondRoom] =
      selectedRate.rates;

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-multi-room-prebook",
          roomTypes: [
            createSplitPrebookRoom(
              secondRoom,
              {
                offerId:
                  "rotated-room-b",
                amount:
                  99,
              }
            ),
            createSplitPrebookRoom(
              firstRoom,
              {
                offerId:
                  "rotated-room-a",
                amount:
                  101,
              }
            ),
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

    assert.ok(mapped);

    assert.equal(
      mapped.providerBookingReference,
      "private-multi-room-prebook"
    );

    assert.equal(
      mapped.offer
        .providerOfferReference,
      "multi-room-offer"
    );

    assert.equal(
      mapped.offer.price,
      200
    );

    assert.equal(
      mapped.offer.mealPlan,
      "Breakfast included"
    );
  }
);

test(
  "LiteAPI multi-room aggregation fails closed when one room condition changes",
  () => {
    const selectedRate =
      createMultiRoomRate();

    const [firstRoom, secondRoom] =
      selectedRate.rates;

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-multi-room-prebook",
          roomTypes: [
            createSplitPrebookRoom(
              firstRoom,
              {
                offerId:
                  "multi-room-offer",
              }
            ),
            createSplitPrebookRoom(
              secondRoom,
              {
                boardName:
                  "Room only",
              }
            ),
          ],
        },
        originalOffer:
          createMultiRoomOriginalOffer(
            selectedRate
          ),
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.equal(
      mapped,
      null
    );
  }
);

test(
  "LiteAPI multi-room aggregation fails closed when Prebook adds an unmatched room",
  () => {
    const selectedRate =
      createMultiRoomRate();

    const [firstRoom, secondRoom] =
      selectedRate.rates;

    const extraRoom = {
      ...secondRoom,
      roomName:
        "Suite",
      roomTypeId:
        "room-type-extra",
      offerId:
        "room-offer-extra",
    };

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-multi-room-prebook",
          roomTypes: [
            createSplitPrebookRoom(
              firstRoom
            ),
            createSplitPrebookRoom(
              secondRoom
            ),
            createSplitPrebookRoom(
              extraRoom
            ),
          ],
        },
        originalOffer:
          createMultiRoomOriginalOffer(
            selectedRate
          ),
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.equal(
      mapped,
      null
    );
  }
);

test(
  "LiteAPI multi-room aggregation fails closed when room currencies disagree",
  () => {
    const selectedRate =
      createMultiRoomRate();

    const [firstRoom, secondRoom] =
      selectedRate.rates;

    const secondPrebookRoom =
      createSplitPrebookRoom(
        secondRoom
      );

    secondPrebookRoom
      .rates[0]
      .offerRetailRate
      .currency = "USD";

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-multi-room-prebook",
          roomTypes: [
            createSplitPrebookRoom(
              firstRoom
            ),
            secondPrebookRoom,
          ],
        },
        originalOffer:
          createMultiRoomOriginalOffer(
            selectedRate
          ),
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.equal(
      mapped,
      null
    );
  }
);

test(
  "LiteAPI multi-room aggregation preserves the multiplicity of identical rooms",
  () => {
    const identicalRoom = {
      offerId:
        "room-offer-identical",
      roomName:
        "Standard room",
      roomTypeId:
        "room-type-identical",
      boardName:
        "Breakfast included",
      refundableTag:
        "RFN",
      refundable:
        true,
      adults:
        2,
      childCount:
        0,
      offerRetailRate: {
        amount:
          95,
        currency:
          "EUR",
      },
    };

    const selectedRate = {
      offerId:
        "two-identical-rooms",
      offerRetailRate: {
        amount:
          190,
        currency:
          "EUR",
      },
      rates: [
        {...identicalRoom},
        {...identicalRoom},
      ],
    };

    const mapped =
      createLiteApiPrebookOffer({
        data: {
          prebookId:
            "private-identical-rooms",
          roomTypes: [
            createSplitPrebookRoom(
              identicalRoom,
              {
                offerId:
                  "rotated-identical-a",
              }
            ),
            createSplitPrebookRoom(
              identicalRoom,
              {
                offerId:
                  "rotated-identical-b",
              }
            ),
          ],
        },
        originalOffer:
          createMultiRoomOriginalOffer(
            selectedRate
          ),
        hotelId:
          "hotel-1",
        sourceProvider:
          "liteapi",
        providerName:
          "LiteAPI",
      });

    assert.ok(mapped);

    assert.equal(
      mapped.offer.price,
      190
    );
  }
);

test(
  "LiteAPI adapter calls prebook with the exact private offer reference",
  async () => {
    let receivedOfferId =
      null;

    const adapter =
      createLiteApiAdapter({
        searchLiteApiRates:
          async () => ({
            data: null,
            noContent: true,
          }),
        getLiteApiHotels:
          async () => ({
            data: null,
            noContent: true,
          }),
        getLiteApiFacilities:
          async () => ({
            data: null,
            noContent: true,
          }),
        prebookLiteApiOffer:
          async (offerId) => {
            receivedOfferId =
              offerId;

            return {
              data: {
                prebookId:
                  "private-prebook-id",
              },
              noContent:
                false,
            };
          },
        isLiteApiNoResults:
          () => false,
        getLiteApiCurrency:
          () => "EUR",
        mapLiteApiHotelResponse:
          () => [],
        mapLiteApiHotelDetailsResponse:
          () => null,
        createLiteApiPrebookOffer:
          ({ originalOffer }) => ({
            offer:
              originalOffer,
            providerBookingReference:
              "private-prebook-id",
          }),
        mergeProviderHotelResults:
          (hotels) => hotels,
      });

    const result =
      await adapter.recheckOffer({
        hotelId:
          "hotel-1",
        offer:
          createOriginalOffer(),
      });

    assert.equal(
      receivedOfferId,
      "offer-token"
    );

    assert.equal(
      result.outcome,
      "confirmed"
    );

    assert.equal(
      result.providerBookingReference,
      "private-prebook-id"
    );
  }
);

test(
  "LiteAPI adapter can be constructed for search-only usage without prebook dependencies",
  async () => {
    const adapter =
      createLiteApiAdapter({
        searchLiteApiRates:
          async () => ({
            data: null,
            noContent: true,
          }),
        getLiteApiHotels:
          async () => ({
            data: null,
            noContent: true,
          }),
        getLiteApiFacilities:
          async () => ({
            data: null,
            noContent: true,
          }),
        isLiteApiNoResults:
          () => true,
        getLiteApiCurrency:
          () => "EUR",
        mapLiteApiHotelResponse:
          () => [],
        mapLiteApiHotelDetailsResponse:
          () => null,
        mergeProviderHotelResults:
          (hotels) => hotels,
      });

    assert.equal(
      typeof adapter.searchHotels,
      "function"
    );

    await assert.rejects(
      () =>
        adapter.recheckOffer({
          hotelId:
            "hotel-1",
          offer:
            createOriginalOffer(),
        }),
      (error) => {
        assert.equal(
          error.code,
          "PROVIDER_OFFER_RECHECK_UNAVAILABLE"
        );

        assert.equal(
          error.status,
          501
        );

        return true;
      }
    );
  }
);
