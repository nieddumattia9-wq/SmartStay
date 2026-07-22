import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createPublicOfferId,
  getOfferHandoffState,
} = require(
  "../../server/services/bookingOfferIntegrityService.js"
);

const {
  resolveBookingOffer,
} = require(
  "../../server/services/bookingRedirectService.js"
);

function createHotel() {
  return {
    id:
      "liteapi:hotel-1",
    sourceProvider:
      "liteapi",
    offers: [
      {
        id:
          "liteapi:hotel-1:rate-a",
        sourceProvider:
          "liteapi",
        price:
          100,
        totalKnownCost:
          110,
        currency:
          "EUR",
        roomName:
          "Standard room",
        refundable:
          false,
        excludedTaxes:
          10,
        deepLink:
          "https://booking.example/rate-a",
      },
      {
        id:
          "liteapi:hotel-1:rate-b",
        sourceProvider:
          "liteapi",
        price:
          130,
        totalKnownCost:
          140,
        currency:
          "EUR",
        roomName:
          "Flexible room",
        refundable:
          true,
        excludedTaxes:
          10,
        deepLink:
          "https://booking.example/rate-b",
      },
    ],
  };
}

test(
  "booking offer resolution selects the exact opaque offer instead of an array index",
  () => {
    const hotel =
      createHotel();

    const requestedOffer =
      hotel.offers[1];

    const publicOfferId =
      createPublicOfferId(
        requestedOffer
      );

    const resolved =
      resolveBookingOffer({
        session: {
          hotels:
            [hotel],
        },
        hotelId:
          hotel.id,
        offerId:
          publicOfferId,
      });

    assert.equal(
      resolved.offer,
      requestedOffer
    );

    assert.equal(
      resolved.offerId,
      publicOfferId
    );

    assert.throws(
      () =>
        resolveBookingOffer({
          session: {
            hotels:
              [hotel],
          },
          hotelId:
            hotel.id,
          offerId:
            "offer-2",
        }),
      (error) =>
        error?.code ===
        "OFFER_ID_INVALID"
    );
  }
);

test(
  "provider capabilities gate redirects independently from commercial availability",
  () => {
    const hotel =
      createHotel();

    const handoff =
      getOfferHandoffState({
        hotel,
        offer:
          hotel.offers[0],
      });

    assert.equal(
      handoff.state,
      "booking-api-required"
    );

    assert.equal(
      handoff.redirectUrl,
      null
    );
  }
);
