import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createBookingOfferRecheckService,
} = require(
  "../../server/services/bookingOfferRecheckService.js"
);

const {
  createPublicOfferId,
} = require(
  "../../server/services/bookingOfferIntegrityService.js"
);

function createFixture() {
  const offer = {
    id:
      "provider-a:hotel-1:offer-1",
    sourceProvider:
      "provider-a",
    providerOfferReference:
      "private-provider-offer-token",
    provider:
      "Provider A",
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
    freeCancellationUntil:
      "2026-09-01T12:00:00Z",
    cancellationPolicy:
      "Refundable",
    bookable:
      true,
  };

  const hotel = {
    id:
      "provider-a:hotel-1",
    sourceHotelId:
      "hotel-1",
    sourceProvider:
      "provider-a",
    providerContext: {
      secret:
        "internal",
    },
    offers:
      [offer],
  };

  const session = {
    searchId:
      "search-1",
    hotels:
      [hotel],
  };

  return {
    offer,
    hotel,
    session,
    offerId:
      createPublicOfferId(
        offer
      ),
  };
}

function createService({
  providerResult,
  capabilities = {
    offerRecheck:
      true,
  },
} = {}) {
  const fixture =
    createFixture();

  const saved = [];

  const service =
    createBookingOfferRecheckService({
      requireSession:
        () => fixture.session,
      getProvider:
        () => ({
          enabled:
            true,
          capabilities,
        }),
      executeRecheck:
        async () =>
          providerResult,
      saveVerification:
        (value) => {
          saved.push(value);
          return {
            verificationId:
              "verify-public-1",
            createdAt:
              1000,
            expiresAt:
              2000,
          };
        },
    });

  return {
    fixture,
    service,
    saved,
  };
}

test(
  "confirmed rechecks keep provider booking references private and create a verification",
  async () => {
    const fixture =
      createFixture();

    const confirmedOffer = {
      ...fixture.offer,
    };

    const setup =
      createService({
        providerResult: {
          outcome:
            "confirmed",
          offer:
            confirmedOffer,
          providerBookingReference:
            "private-prebook-id",
        },
      });

    const result =
      await setup.service({
        searchId:
          "search-1",
        hotelId:
          setup.fixture.hotel.id,
        offerId:
          setup.fixture.offerId,
      });

    assert.equal(
      result.state,
      "confirmed"
    );

    assert.equal(
      result.requiresUserConfirmation,
      false
    );

    assert.equal(
      result.verification.id,
      "verify-public-1"
    );

    assert.equal(
      setup.saved[0]
        .providerBookingReference,
      "private-prebook-id"
    );

    assert.equal(
      JSON.stringify(result)
        .includes(
          "private-prebook-id"
        ),
      false
    );
  }
);

test(
  "price or booking-condition changes require explicit user confirmation",
  async () => {
    const fixture =
      createFixture();

    const setup =
      createService({
        providerResult: {
          outcome:
            "confirmed",
          offer: {
            ...fixture.offer,
            price:
              125,
            totalKnownCost:
              135,
            refundable:
              false,
            cancellationPolicy:
              "Non-refundable",
          },
          providerBookingReference:
            "private-prebook-id",
        },
      });

    const result =
      await setup.service({
        searchId:
          "search-1",
        hotelId:
          setup.fixture.hotel.id,
        offerId:
          setup.fixture.offerId,
      });

    assert.equal(
      result.state,
      "changed"
    );

    assert.equal(
      result.requiresUserConfirmation,
      true
    );

    assert.deepEqual(
      result.changedFields,
      [
        "price",
        "totalKnownCost",
        "refundable",
        "cancellationPolicy",
      ]
    );
  }
);

test(
  "sold-out and unsupported providers produce deterministic public states",
  async () => {
    const soldOut =
      createService({
        providerResult: {
          outcome:
            "sold_out",
          offer:
            null,
        },
      });

    const soldOutResult =
      await soldOut.service({
        searchId:
          "search-1",
        hotelId:
          soldOut.fixture.hotel.id,
        offerId:
          soldOut.fixture.offerId,
      });

    assert.equal(
      soldOutResult.state,
      "sold-out"
    );

    const unsupported =
      createService({
        capabilities: {
          offerRecheck:
            false,
        },
      });

    const unsupportedResult =
      await unsupported.service({
        searchId:
          "search-1",
        hotelId:
          unsupported.fixture.hotel.id,
        offerId:
          unsupported.fixture.offerId,
      });

    assert.equal(
      unsupportedResult.state,
      "recheck-required"
    );

    assert.equal(
      unsupportedResult.code,
      "OFFER_RECHECK_UNSUPPORTED"
    );
  }
);
