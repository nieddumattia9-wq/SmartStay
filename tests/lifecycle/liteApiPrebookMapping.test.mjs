import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
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
    refundable:
      true,
    cancellationPolicy:
      "Refundable",
    bookable:
      true,
  };
}

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
                    false,
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
      120
    );

    assert.equal(
      mapped.offer.totalKnownCost,
      132
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
