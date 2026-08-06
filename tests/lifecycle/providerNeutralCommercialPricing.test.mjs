import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const Module =
  require("node:module");

const originalModuleLoad =
  Module._load;

Module._load =
  function loadPureLiteApiClientDependency(
    request,
    parent,
    isMain
  ) {
    if (request === "axios") {
      return {};
    }

    if (request === "dotenv") {
      return {
        config:
          () => ({}),
      };
    }

    return originalModuleLoad.call(
      this,
      request,
      parent,
      isMain
    );
  };

let createLiteApiRatesPayload;

try {
  ({
    createLiteApiRatesPayload,
  } = require(
    "../../server/providers/liteApi/liteApiClient.js"
  ));
}
finally {
  Module._load =
    originalModuleLoad;
}

const {
  createCommercialPricingPolicy,
  getCommercialPricingPolicy,
} = require(
  "../../server/config/commercialPricing.js"
);

const {
  normalizeAccommodationSearchRequest,
} = require(
  "../../server/providers/common/accommodationSearchRequest.js"
);

const {
  LITEAPI_PRICING_STATES,
  calculateRequiredLiteApiMargin,
  createLiteApiCommercialPricing,
  createLiteApiSelectionFingerprint,
} = require(
  "../../server/providers/liteApi/liteApiCommercialPricing.js"
);

const {
  createLiteApiAdapter,
} = require(
  "../../server/providers/liteApi/liteApiAdapter.js"
);

const {
  createLiteApiOffer,
} = require(
  "../../server/providers/liteApi/liteApiOfferMapper.js"
);

const {
  mapLiteApiHotelResponse,
} = require(
  "../../server/providers/liteApi/liteApiProvider.js"
);

const {
  createPublicHotelOffer,
} = require(
  "../../server/presenters/publicHotelPresenter.js"
);

const {
  createBookingOfferRecheckService,
  getProviderContextForOffer,
} = require(
  "../../server/services/bookingOfferRecheckService.js"
);

function createPolicy(
  minimumSellerCommissionPercent = 8
) {
  return createCommercialPricingPolicy({
    minimumSellerCommissionPercent,
  });
}

function createProviderRate({
  offerId = "offer-original",
  retail = 108,
  commission = 8,
  publicFloor = 115,
  boardName = "Breakfast included",
  refundableTag = "RFN",
} = {}) {
  return {
    offerId,
    roomTypeId:
      "room-type-1",
    roomName:
      "Standard room",
    boardName,
    refundableTag,
    offerRetailRate: {
      amount:
        retail,
      currency:
        "EUR",
    },
    retailRate: {
      commission: {
        amount:
          commission,
        currency:
          "EUR",
      },
    },
    suggestedSellingPrice: {
      amount:
        publicFloor,
      currency:
        "EUR",
    },
    cancellationPolicies: {
      refundableTag,
      cancelPolicyInfos: [
        {
          cancelTime:
            "2026-10-01 12:00:00",
          amount:
            retail,
          currency:
            "EUR",
          timezone:
            "GMT",
        },
      ],
    },
  };
}

function createAdapterDependencies(
  overrides = {}
) {
  return {
    searchLiteApiRates:
      async () => ({
        data:
          null,
        noContent:
          true,
      }),
    createLiteApiSessionId:
      () =>
        "smartstay-session-1",
    getLiteApiHotels:
      async () => ({
        data:
          null,
        noContent:
          true,
      }),
    getLiteApiFacilities:
      async () => ({
        data:
          null,
        noContent:
          true,
      }),
    prebookLiteApiOffer:
      async () => ({
        data: {
          prebookId:
            "prebook-1",
        },
        noContent:
          false,
      }),
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
          "prebook-1",
      }),
    mergeProviderHotelResults:
      (hotels) => hotels,
    ...overrides,
  };
}

test(
  "SmartStay owns a provider-neutral 8 percent default pricing policy",
  () => {
    assert.deepEqual(
      getCommercialPricingPolicy({
        environment: {},
      }),
      {
        schemaVersion:
          1,
        minimumSellerCommissionPercent:
          8,
        publicPriceFloorMode:
          "enforced",
      }
    );

    assert.equal(
      getCommercialPricingPolicy({
        environment: {
          SMARTSTAY_MINIMUM_COMMISSION_PERCENT:
            "8,5",
        },
      }).minimumSellerCommissionPercent,
      8.5
    );

    for (const invalid of [
      "0",
      "not-a-number",
      "101",
    ]) {
      assert.throws(
        () =>
          getCommercialPricingPolicy({
            environment: {
              SMARTSTAY_MINIMUM_COMMISSION_PERCENT:
                invalid,
            },
          }),
        (error) =>
          error.code ===
          "INVALID_COMMERCIAL_PRICING_CONFIG"
      );
    }
  }
);

test(
  "public search input cannot inject or disable the server-owned pricing policy",
  () => {
    const normalized =
      normalizeAccommodationSearchRequest({
        cityName:
          "Firenze",
        countryCode:
          "IT",
        checkin:
          "2026-10-10",
        checkout:
          "2026-10-12",
        commercialPricingPolicy: {
          minimumSellerCommissionPercent:
            0,
          publicPriceFloorMode:
            "disabled",
        },
      });

    assert.equal(
      "commercialPricingPolicy" in
        normalized,
      false
    );
  }
);

test(
  "offer recheck resolves the private context for the actual source provider",
  () => {
    const session = {
      providerId:
        "provider-a",
      providerContext: {
        sessionId:
          "legacy-session",
      },
      providerExecutions: [
        {
          providerId:
            "provider-a",
          providerContext: {
            sessionId:
              "provider-a-session",
          },
        },
        {
          providerId:
            "provider-b",
          providerContext: {
            sessionId:
              "provider-b-session",
          },
        },
      ],
    };

    assert.deepEqual(
      getProviderContextForOffer({
        session,
        hotel: {},
        sourceProvider:
          "provider-b",
      }),
      {
        sessionId:
          "provider-b-session",
      }
    );

    assert.equal(
      getProviderContextForOffer({
        session,
        hotel: {},
        sourceProvider:
          "provider-c",
      }),
      null
    );
  }
);

test(
  "provider-neutral recheck passes stay and source-specific private context to the adapter",
  async () => {
    const offer = {
      id:
        "provider-b:hotel-1:offer-1",
      sourceProvider:
        "provider-b",
      providerOfferReference:
        "private-offer-reference",
      provider:
        "Provider B",
      price:
        108,
      totalKnownCost:
        108,
      currency:
        "EUR",
      roomName:
        "Standard room",
      mealPlan:
        "Breakfast included",
      refundable:
        true,
      bookable:
        true,
    };

    const hotel = {
      id:
        "provider-b:hotel-1",
      sourceHotelId:
        "hotel-1",
      sourceProvider:
        "provider-b",
      offers:
        [offer],
    };

    const session = {
      searchId:
        "search-1",
      originalSearchData: {
        checkin:
          "2026-10-10",
        checkout:
          "2026-10-12",
        currency:
          "EUR",
        rooms: [
          {
            adults:
              2,
            childAges:
              [],
          },
        ],
      },
      providerExecutions: [
        {
          providerId:
            "provider-b",
          providerContext: {
            sessionId:
              "provider-b-session",
          },
        },
      ],
      hotels:
        [hotel],
    };

    let received =
      null;

    const service =
      createBookingOfferRecheckService({
        requireSession:
          async () => session,
        resolveOffer:
          () => ({
            hotel,
            offer,
            offerId:
              "offer-public-1",
          }),
        getProvider:
          () => ({
            enabled:
              true,
            capabilities: {
              offerRecheck:
                true,
            },
          }),
        executeRecheck:
          async (input) => {
            received =
              input;

            return {
              outcome:
                "confirmed",
              offer,
              providerBookingReference:
                "prebook-1",
            };
          },
        saveVerification:
          async () => ({
            verificationId:
              "verification-1",
            createdAt:
              1,
            expiresAt:
              2,
          }),
      });

    await service({
      searchId:
        "search-1",
      hotelId:
        "provider-b:hotel-1",
      offerId:
        "offer-public-1",
    });

    assert.deepEqual(
      received.providerContext,
      {
        sessionId:
          "provider-b-session",
      }
    );

    assert.deepEqual(
      received.stayContext,
      {
        checkin:
          "2026-10-10",
        checkout:
          "2026-10-12",
        currency:
          "EUR",
        rooms: [
          {
            adults:
              2,
            childAges:
              [],
          },
        ],
      }
    );
  }
);

test(
  "the 8 percent commission remains earned when the resulting selling price equals the public floor",
  () => {
    const pricing =
      createLiteApiCommercialPricing({
        rate:
          createProviderRate({
            retail:
              108,
            commission:
              8,
            publicFloor:
              108,
          }),
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      pricing.sellingPrice,
      108
    );

    assert.equal(
      pricing.pricingControl.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );

    assert.equal(
      pricing.pricingControl
        .requiredSellerCommissionPercent,
      8
    );
  }
);

test(
  "the final selling price is the higher of minimum commission price and public floor",
  () => {
    const belowFloor =
      createLiteApiCommercialPricing({
        rate:
          createProviderRate({
            retail:
              108,
            commission:
              8,
            publicFloor:
              115,
          }),
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      belowFloor.sellingPrice,
      115
    );

    assert.equal(
      belowFloor.pricingControl.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZATION_REQUIRED
    );

    assert.equal(
      belowFloor.pricingControl
        .requiredSellerCommissionPercent,
      15
    );

    const aboveFloor =
      createLiteApiCommercialPricing({
        rate:
          createProviderRate({
            retail:
              108,
            commission:
              8,
            publicFloor:
              105,
          }),
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      aboveFloor.sellingPrice,
      108
    );

    assert.equal(
      aboveFloor.pricingControl.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );
  }
);

test(
  "required provider margin is rounded upward and never below the SmartStay minimum",
  () => {
    assert.equal(
      calculateRequiredLiteApiMargin({
        retailSellingPrice:
          108,
        commissionAmount:
          8,
        currentCommissionPercent:
          8,
        targetSellingPrice:
          109.01,
      }),
      9.01
    );

    assert.equal(
      calculateRequiredLiteApiMargin({
        retailSellingPrice:
          108,
        commissionAmount:
          8,
        currentCommissionPercent:
          8,
        targetSellingPrice:
          104,
      }),
      8
    );

    assert.deepEqual(
      [
        109,
        125,
        160,
      ].map(
        (targetSellingPrice) =>
          calculateRequiredLiteApiMargin({
            retailSellingPrice:
              108,
            commissionAmount:
              8,
            currentCommissionPercent:
              8,
            targetSellingPrice,
          })
      ),
      [
        9,
        25,
        60,
      ]
    );
  }
);

test(
  "required provider margin preserves fixed included amounts outside the commissionable base",
  () => {
    assert.equal(
      calculateRequiredLiteApiMargin({
        retailSellingPrice:
          128,
        commissionAmount:
          8,
        currentCommissionPercent:
          8,
        targetSellingPrice:
          135,
      }),
      15
    );

    const pricing =
      createLiteApiCommercialPricing({
        rate:
          createProviderRate({
            retail:
              128,
            commission:
              8,
            publicFloor:
              135,
          }),
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      pricing.pricingControl.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZATION_REQUIRED
    );

    assert.equal(
      pricing.pricingControl
        .requiredSellerCommissionPercent,
      15
    );
  }
);

test(
  "an offer without verifiable provider commission fails closed",
  () => {
    const rate =
      createProviderRate();

    delete rate
      .retailRate
      .commission;

    const pricing =
      createLiteApiCommercialPricing({
        rate,
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      pricing.pricingControl.state,
      LITEAPI_PRICING_STATES
        .UNVERIFIED
    );
  }
);

test(
  "provider selection fingerprint ignores price tokens but binds room, meal and refund conditions",
  () => {
    const original =
      createProviderRate();

    const rerated =
      createProviderRate({
        offerId:
          "offer-rerated",
        retail:
          115,
        commission:
          15,
      });

    assert.equal(
      createLiteApiSelectionFingerprint(
        original
      ),
      createLiteApiSelectionFingerprint(
        rerated
      )
    );

    assert.notEqual(
      createLiteApiSelectionFingerprint(
        original
      ),
      createLiteApiSelectionFingerprint(
        createProviderRate({
          boardName:
            "Room only",
        })
      )
    );

    assert.notEqual(
      createLiteApiSelectionFingerprint(
        original
      ),
      createLiteApiSelectionFingerprint(
        createProviderRate({
          refundableTag:
            "NRFN",
        })
      )
    );
  }
);

test(
  "real LiteAPI response mapping keeps the same selected room across a targeted rerate",
  () => {
    const pricingPolicy =
      createPolicy();

    const mapResponse =
      (
        rate,
        requestedSellerCommissionPercent
      ) =>
        mapLiteApiHotelResponse(
          {
            data: [
              {
                hotelId:
                  "hotel-1",
                hotel: {
                  hotelId:
                    "hotel-1",
                  name:
                    "Hotel Test",
                },
                roomTypes: [
                  rate,
                ],
              },
            ],
          },
          "EUR",
          null,
          null,
          {
            commercialPricingPolicy:
              pricingPolicy,
            requestedSellerCommissionPercent,
          }
        )[0]?.offers?.[0];

    const initial =
      mapResponse(
        createProviderRate(),
        8
      );

    const rerated =
      mapResponse(
        createProviderRate({
          offerId:
            "offer-materialized",
          retail:
            115,
          commission:
            15,
        }),
        15
      );

    assert.ok(initial);
    assert.ok(rerated);

    assert.equal(
      initial.price,
      115
    );

    assert.equal(
      initial.commercialPricing
        .state,
      LITEAPI_PRICING_STATES
        .MATERIALIZATION_REQUIRED
    );

    assert.equal(
      rerated.commercialPricing
        .state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );

    assert.equal(
      initial.providerOfferContext
        .selectionFingerprint,
      rerated.providerOfferContext
        .selectionFingerprint
    );

    assert.notEqual(
      initial
        .providerOfferReference,
      rerated
        .providerOfferReference
    );
  }
);

test(
  "private pricing controls and provider selection data never enter the public offer",
  () => {
    const internalOffer =
      createLiteApiOffer({
        rate:
          createProviderRate(),
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
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    const publicOffer =
      createPublicHotelOffer(
        internalOffer,
        0,
        {
          id:
            "liteapi:hotel-1",
        }
      );

    const serialized =
      JSON.stringify(
        publicOffer
      );

    assert.equal(
      publicOffer.price,
      115
    );

    for (const forbidden of [
      "commercialPricing",
      "providerOfferContext",
      "providerOfferReference",
      "requiredSellerCommissionPercent",
      "selectionFingerprint",
      "commission",
    ]) {
      assert.equal(
        serialized.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "LiteAPI initial search receives only the server-owned minimum commission and keeps its session private",
  async () => {
    let receivedInput =
      null;

    const adapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          searchLiteApiRates:
            async (input) => {
              receivedInput =
                input;

              return {
                data: {
                  results: [
                    {
                      hotelId:
                        "hotel-1",
                    },
                  ],
                },
                noContent:
                  false,
              };
            },
          mapLiteApiHotelResponse:
            () => [
              {
                id:
                  "liteapi:hotel-1",
                sourceHotelId:
                  "hotel-1",
                offers: [
                  {
                    price:
                      108,
                    currency:
                      "EUR",
                  },
                ],
              },
            ],
        })
      );

    const result =
      await adapter.searchHotels({
        request: {
          destination: {
            cityName:
              "Firenze",
            countryCode:
              "IT",
          },
          stay: {
            checkin:
              "2026-10-10",
            checkout:
              "2026-10-12",
          },
          rooms: [
            {
              adults:
                2,
              childAges:
                [],
            },
          ],
          currency:
            "EUR",
          commercialPricingPolicy:
            createPolicy(),
        },
      });

    assert.equal(
      receivedInput.margin,
      8
    );

    assert.equal(
      receivedInput.sessionId,
      "smartstay-session-1"
    );

    assert.equal(
      "commercialPricingPolicy" in
        receivedInput,
      false
    );

    assert.deepEqual(
      result.providerContext,
      {
        sessionId:
          "smartstay-session-1",
      }
    );
  }
);

test(
  "LiteAPI rates payload supports a single-hotel targeted rerate with a bounded explicit margin",
  () => {
    const payload =
      createLiteApiRatesPayload({
        hotelIds: [
          "hotel-1",
          "hotel-1",
        ],
        checkin:
          "2026-10-10",
        checkout:
          "2026-10-12",
        occupancies: [
          {
            adults:
              2,
            children:
              [],
          },
        ],
        currency:
          "EUR",
        guestNationality:
          "IT",
        sessionId:
          "smartstay-session-1",
        margin:
          15.1234564,
      });

    assert.deepEqual(
      payload.hotelIds,
      ["hotel-1"]
    );

    assert.equal(
      payload.margin,
      15.123456
    );

    assert.equal(
      payload.sessionId,
      "smartstay-session-1"
    );

    assert.equal(
      "cityName" in payload,
      false
    );

    assert.equal(
      "latitude" in payload,
      false
    );

    assert.throws(
      () =>
        createLiteApiRatesPayload({
          hotelIds:
            ["hotel-1"],
          checkin:
            "2026-10-10",
          checkout:
            "2026-10-12",
          margin:
            -1,
        }),
      /non-negative percentage/
    );
  }
);

test(
  "selected LiteAPI offer is rerated once, matched exactly and prebooked with the materialized reference",
  async () => {
    const pricingPolicy =
      createPolicy();

    const fingerprint =
      createLiteApiSelectionFingerprint(
        createProviderRate()
      );

    const originalOffer = {
      id:
        "liteapi:hotel-1:offer-original",
      sourceProvider:
        "liteapi",
      provider:
        "LiteAPI",
      providerOfferReference:
        "offer-original",
      providerOfferContext: {
        selectionFingerprint:
          fingerprint,
      },
      commercialPricing: {
        schemaVersion:
          1,
        policy:
          pricingPolicy,
        state:
          LITEAPI_PRICING_STATES
            .MATERIALIZATION_REQUIRED,
        targetSellingPrice:
          115,
        requiredSellerCommissionPercent:
          15,
      },
      price:
        115,
      totalKnownCost:
        115,
      currency:
        "EUR",
      roomName:
        "Standard room",
      mealPlan:
        "Breakfast included",
      refundable:
        true,
      bookable:
        true,
    };

    const materializedOffer = {
      ...originalOffer,
      providerOfferReference:
        "offer-materialized",
      commercialPricing: {
        ...originalOffer
          .commercialPricing,
        state:
          LITEAPI_PRICING_STATES
            .MATERIALIZED,
      },
    };

    let materializationInput =
      null;

    let prebookReference =
      null;

    const adapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          searchLiteApiRates:
            async (input) => {
              materializationInput =
                input;

              return {
                data: {
                  results: [
                    {
                      hotelId:
                        "hotel-1",
                    },
                  ],
                },
                noContent:
                  false,
              };
            },
          mapLiteApiHotelResponse:
            () => [
              {
                id:
                  "liteapi:hotel-1",
                offers:
                  [materializedOffer],
              },
            ],
          prebookLiteApiOffer:
            async (offerId) => {
              prebookReference =
                offerId;

              return {
                data: {
                  prebookId:
                    "prebook-1",
                },
                noContent:
                  false,
              };
            },
          createLiteApiPrebookOffer:
            ({ originalOffer }) => ({
              offer: {
                ...originalOffer,
                price:
                  115,
              },
              providerBookingReference:
                "prebook-1",
            }),
        })
      );

    const result =
      await adapter.recheckOffer({
        offer:
          originalOffer,
        hotelId:
          "hotel-1",
        providerContext: {
          sessionId:
            "smartstay-session-1",
        },
        stayContext: {
          checkin:
            "2026-10-10",
          checkout:
            "2026-10-12",
          currency:
            "EUR",
          rooms: [
            {
              adults:
                2,
              childAges:
                [],
            },
          ],
        },
      });

    assert.deepEqual(
      materializationInput.hotelIds,
      ["hotel-1"]
    );

    assert.equal(
      materializationInput.margin,
      15
    );

    assert.equal(
      materializationInput.sessionId,
      "smartstay-session-1"
    );

    assert.equal(
      prebookReference,
      "offer-materialized"
    );

    assert.equal(
      result.outcome,
      "confirmed"
    );
  }
);

test(
  "materialization fails closed on an ambiguous selection or a prebook price below target",
  async () => {
    const pricingPolicy =
      createPolicy();

    const originalOffer = {
      id:
        "liteapi:hotel-1:offer-original",
      sourceProvider:
        "liteapi",
      provider:
        "LiteAPI",
      providerOfferReference:
        "offer-original",
      providerOfferContext: {
        selectionFingerprint:
          "fingerprint-1",
      },
      commercialPricing: {
        schemaVersion:
          1,
        policy:
          pricingPolicy,
        state:
          LITEAPI_PRICING_STATES
            .MATERIALIZATION_REQUIRED,
        targetSellingPrice:
          115,
        requiredSellerCommissionPercent:
          15,
      },
      price:
        115,
      currency:
        "EUR",
    };

    const commonInput = {
      offer:
        originalOffer,
      hotelId:
        "hotel-1",
      providerContext: {
        sessionId:
          "smartstay-session-1",
      },
      stayContext: {
        checkin:
          "2026-10-10",
        checkout:
          "2026-10-12",
        currency:
          "EUR",
        rooms: [
          {
            adults:
              2,
            childAges:
              [],
          },
        ],
      },
    };

    const mismatchedAdapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          searchLiteApiRates:
            async () => ({
              data: {
                results:
                  [{}],
              },
              noContent:
                false,
            }),
          mapLiteApiHotelResponse:
            () => [
              {
                offers: [
                  {
                    ...originalOffer,
                    providerOfferContext: {
                      selectionFingerprint:
                        "different",
                    },
                    commercialPricing: {
                      ...originalOffer
                        .commercialPricing,
                      state:
                        LITEAPI_PRICING_STATES
                          .MATERIALIZED,
                    },
                  },
                ],
              },
            ],
        })
      );

    await assert.rejects(
      () =>
        mismatchedAdapter
          .recheckOffer(
            commonInput
          ),
      (error) =>
        error.code ===
        "PROVIDER_PRICING_SELECTION_MISMATCH"
    );

    const materializedOffer = {
      ...originalOffer,
      providerOfferReference:
        "offer-materialized",
      commercialPricing: {
        ...originalOffer
          .commercialPricing,
        state:
          LITEAPI_PRICING_STATES
            .MATERIALIZED,
      },
    };

    const belowTargetAdapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          searchLiteApiRates:
            async () => ({
              data: {
                results:
                  [{}],
              },
              noContent:
                false,
            }),
          mapLiteApiHotelResponse:
            () => [
              {
                offers:
                  [materializedOffer],
              },
            ],
          createLiteApiPrebookOffer:
            ({ originalOffer }) => ({
              offer: {
                ...originalOffer,
                price:
                  114.99,
              },
              providerBookingReference:
                "prebook-1",
            }),
        })
      );

    await assert.rejects(
      () =>
        belowTargetAdapter
          .recheckOffer(
            commonInput
          ),
      (error) =>
        error.code ===
        "PROVIDER_PREBOOK_PRICE_BELOW_TARGET"
    );
  }
);
