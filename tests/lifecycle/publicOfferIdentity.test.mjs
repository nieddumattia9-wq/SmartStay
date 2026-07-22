import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createPublicOfferId,
  isPublicOfferId,
  resolveOfferByPublicId,
} = require(
  "../../server/services/bookingOfferIntegrityService.js"
);

const {
  createPublicHotel,
} = require(
  "../../server/presenters/publicHotelPresenter.js"
);

function createOffer(
  overrides = {}
) {
  return {
    id:
      "provider-a:hotel-1:rate-123",
    sourceProvider:
      "provider-a",
    price:
      120,
    totalKnownCost:
      132,
    currency:
      "EUR",
    roomName:
      "Standard room",
    refundable:
      true,
    freeCancellationUntil:
      "2026-08-01T12:00:00Z",
    excludedTaxes:
      12,
    unknownTaxes:
      0,
    cancellationPolicy:
      "Refundable",
    deepLink:
      "https://booking.example/offer-a",
    ...overrides,
  };
}

test(
  "public offer ids are opaque, deterministic and order-independent",
  () => {
    const first =
      createOffer();

    const second =
      createOffer({
        id:
          "provider-a:hotel-1:rate-456",
        roomName:
          "Suite",
        price:
          220,
        totalKnownCost:
          232,
        deepLink:
          "https://booking.example/offer-b",
      });

    const firstId =
      createPublicOfferId(
        first
      );

    const repeatedId =
      createPublicOfferId({
        ...first,
      });

    assert.equal(
      firstId,
      repeatedId
    );

    assert.match(
      firstId,
      /^offer-[a-f0-9]{24}$/
    );

    assert.equal(
      firstId.includes(
        "provider-a"
      ),
      false
    );

    assert.notEqual(
      firstId,
      createPublicOfferId(
        second
      )
    );

    assert.equal(
      resolveOfferByPublicId(
        [second, first],
        firstId
      ),
      first
    );

    assert.equal(
      isPublicOfferId(
        "offer-1"
      ),
      false
    );
  }
);


test(
  "public presentation keeps offer identity stable when provider order changes",
  () => {
    const first =
      createOffer();

    const second =
      createOffer({
        id:
          "provider-a:hotel-1:rate-456",
        roomName:
          "Suite",
        price:
          220,
        totalKnownCost:
          232,
        deepLink:
          "https://booking.example/offer-b",
      });

    function present(offers) {
      return createPublicHotel({
        id:
          "provider-a:hotel-1",
        sourceProvider:
          "provider-a",
        dataConfidence:
          "partial",
        availableData:
          {},
        offers,
        name:
          "Hotel One",
        provider:
          "Provider A",
        stars:
          4,
        reviewScore:
          null,
        reviewCount:
          null,
        reviewText:
          "",
        price:
          120,
        basePrice:
          120,
        saving:
          0,
        currency:
          "EUR",
        distance:
          null,
        image:
          "",
        address:
          "",
        city:
          "",
        country:
          "",
        latitude:
          null,
        longitude:
          null,
        amenities:
          [],
        facilities:
          [],
      });
    }

    const forward =
      present([
        first,
        second,
      ]);

    const reversed =
      present([
        second,
        first,
      ]);

    const forwardByRoom =
      new Map(
        forward.offers.map(
          (offer) => [
            offer.roomName,
            offer.id,
          ]
        )
      );

    const reversedByRoom =
      new Map(
        reversed.offers.map(
          (offer) => [
            offer.roomName,
            offer.id,
          ]
        )
      );

    assert.deepEqual(
      reversedByRoom,
      forwardByRoom
    );

    assert.equal(
      forward.offers.every(
        (offer) =>
          offer.redirectable ===
          false
      ),
      true
    );
  }
);
