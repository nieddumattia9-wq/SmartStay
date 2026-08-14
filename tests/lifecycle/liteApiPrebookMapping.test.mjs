import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createLiteApiOffer,
  createLiteApiPrebookOffer,
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
