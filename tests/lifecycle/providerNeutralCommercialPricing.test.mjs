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
  LITEAPI_COMMERCIAL_PRICING_SCHEMA_VERSION,
  LITEAPI_PRICING_STATES,
  LITEAPI_PUBLIC_PRICE_FLOOR_MODE,
  LITEAPI_PUBLIC_RATE_PRICE_MODE,
  createLiteApiCommercialPricing,
  createLiteApiSelectionFingerprint,
  getLiteApiCommissionAmount,
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
  roomName = "Standard room",
  boardName = "Breakfast included",
  refundableTag = "RFN",
} = {}) {
  return {
    offerId,
    roomTypeId:
      "room-type-1",
    roomName:
      roomName,
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

function createInternalLiteApiOffer({
  state =
    LITEAPI_PRICING_STATES
      .MATERIALIZED,
  targetSellingPrice = 115,
  price = 115,
  publicPriceFloorMode =
    "enforced",
} = {}) {
  return {
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
        {
          ...createPolicy(),
          publicPriceFloorMode,
        },
      state,
      targetSellingPrice,
      requiredSellerCommissionPercent:
        state ===
          LITEAPI_PRICING_STATES
            .MATERIALIZED
          ? 8
          : null,
    },
    price,
    totalKnownCost:
      price,
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
}

function createLiteApiRecheckInput(
  offer
) {
  return {
    offer,
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
  "LiteAPI live per-rate commission arrays are parsed without exposing provider pricing to the core",
  () => {
    assert.equal(
      getLiteApiCommissionAmount({
        rates: [
          {
            commission: [
              {
                amount:
                  19.71,
                currency:
                  "EUR",
              },
            ],
          },
        ],
      }),
      19.71
    );

    const pricing =
      createLiteApiCommercialPricing({
        rate: {
          offerRetailRate: {
            amount:
              266.18,
            currency:
              "EUR",
          },
          suggestedSellingPrice: {
            amount:
              300.72,
            currency:
              "EUR",
          },
          rates: [
            {
              commission: [
                {
                  amount:
                    19.71,
                  currency:
                    "EUR",
                },
              ],
            },
          ],
        },
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      pricing.pricingControl.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );
    assert.equal(
      pricing.sellingPrice,
      266.18
    );
    assert.equal(
      pricing.pricingControl
        .targetSellingPrice,
      266.18
    );
    assert.equal(
      pricing.pricingControl
        .requiredSellerCommissionPercent,
      8
    );
    assert.equal(
      pricing.pricingControl
        .suggestedSellingPriceDiagnostic,
      300.72
    );
    assert.equal(
      pricing.pricingControl
        .policy
        .publicPriceFloorMode,
      LITEAPI_PUBLIC_PRICE_FLOOR_MODE
    );
    assert.equal(
      pricing.pricingControl
        .policy
        .providerPriceMode,
      LITEAPI_PUBLIC_RATE_PRICE_MODE
    );
  }
);

test(
  "LiteAPI multi-room per-rate commission arrays are summed once at offer level",
  () => {
    assert.equal(
      getLiteApiCommissionAmount({
        rates: [
          {
            commission: [
              {
                amount:
                  8,
                currency:
                  "EUR",
              },
            ],
          },
          {
            commission: [
              {
                amount:
                  12.34,
                currency:
                  "EUR",
              },
            ],
          },
        ],
      }),
      20.34
    );
  }
);

test(
  "LiteAPI per-rate commission parsing fails closed instead of accepting a partial multi-room amount",
  () => {
    assert.equal(
      getLiteApiCommissionAmount({
        rates: [
          {
            commission: [
              {
                amount:
                  8,
                currency:
                  "EUR",
              },
            ],
          },
          {
            commission: [],
          },
        ],
      }),
      null
    );
  }
);

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
  "Nuitee public rates use offerRetailRate while SSP remains diagnostic",
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
      108
    );

    assert.equal(
      belowFloor.pricingControl.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );

    assert.equal(
      belowFloor.pricingControl
        .requiredSellerCommissionPercent,
      8
    );

    assert.equal(
      belowFloor.pricingControl
        .suggestedSellingPriceDiagnostic,
      115
    );

    assert.equal(
      belowFloor.pricingControl
        .schemaVersion,
      LITEAPI_COMMERCIAL_PRICING_SCHEMA_VERSION
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

    assert.equal(
      aboveFloor.pricingControl
        .suggestedSellingPriceDiagnostic,
      105
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
  "a managed public-rate offer without offerRetailRate fails closed instead of displaying SSP",
  () => {
    const pricing =
      createLiteApiCommercialPricing({
        rate:
          createProviderRate({
            retail:
              null,
            publicFloor:
              115,
          }),
        commercialPricingPolicy:
          createPolicy(),
        requestedSellerCommissionPercent:
          8,
      });

    assert.equal(
      pricing.sellingPrice,
      null
    );
    assert.equal(
      pricing.pricingControl.state,
      LITEAPI_PRICING_STATES
        .UNVERIFIED
    );
    assert.equal(
      pricing.pricingControl
        .targetSellingPrice,
      0
    );
    assert.equal(
      pricing.pricingControl
        .suggestedSellingPriceDiagnostic,
      115
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
  "LiteAPI keeps provider-confirmed public offers even when SSP is above retail",
  () => {
    const pricingPolicy =
      createPolicy();

    const mapResponse =
      (roomTypes) =>
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
                roomTypes,
              },
            ],
          },
          "EUR",
          null,
          null,
          {
            commercialPricingPolicy:
              pricingPolicy,
            requestedSellerCommissionPercent:
              8,
          }
        );

    const hotels =
      mapResponse([
        createProviderRate({
          offerId:
            "offer-below-floor",
          retail:
            108,
          commission:
            8,
          publicFloor:
            115,
        }),
        createProviderRate({
          offerId:
            "offer-publicly-valid",
          retail:
            118,
          commission:
            8,
          publicFloor:
            115,
          roomName:
            "Deluxe room",
        }),
      ]);

    assert.equal(
      hotels.length,
      1
    );
    assert.equal(
      hotels[0].offers.length,
      2
    );
    assert.equal(
      hotels[0].offers[0]
        .providerOfferReference,
      "offer-below-floor"
    );
    assert.equal(
      hotels[0].offers[0].price,
      108
    );
    assert.equal(
      hotels[0].offers[0]
        .commercialPricing.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );

    const onlyBelowSsp =
      mapResponse([
        createProviderRate({
          offerId:
            "offer-below-floor-only",
        }),
      ]);

    assert.equal(
      onlyBelowSsp.length,
      1
    );
    assert.equal(
      onlyBelowSsp[0].offers[0].price,
      108
    );
  }
);

test(
  "the validated Florence public-rate sample maps retail, VAT and SSP diagnostics without leaking pricing controls",
  () => {
    const hotels =
      mapLiteApiHotelResponse(
        {
          data: [
            {
              hotelId:
                "validated-florence-hotel",
              hotel: {
                hotelId:
                  "validated-florence-hotel",
                name:
                  "Validated Florence Hotel",
              },
              rates: [
                {
                  offerId:
                    "validated-public-offer",
                  roomName:
                    "Twin Room",
                  boardName:
                    "Room Only",
                  refundableTag:
                    "NRFN",
                  offerRetailRate: {
                    amount:
                      461.78,
                    currency:
                      "EUR",
                  },
                  suggestedSellingPrice: {
                    amount:
                      476.32,
                    currency:
                      "EUR",
                  },
                  retailRate: {
                    commission: {
                      amount:
                        34.19,
                      currency:
                        "EUR",
                    },
                  },
                  taxesAndFees: [
                    {
                      description:
                        "VAT of 10% per night (Included in price)",
                      amount:
                        38.87,
                      currency:
                        "EUR",
                      included:
                        true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        "EUR",
        null,
        null,
        {
          commercialPricingPolicy:
            createPolicy(),
          requestedSellerCommissionPercent:
            8,
        }
      );

    assert.equal(
      hotels.length,
      1
    );

    const offer =
      hotels[0].offers[0];

    assert.equal(
      offer.price,
      461.78
    );
    assert.equal(
      offer.totalKnownCost,
      461.78
    );
    assert.equal(
      offer.includedTaxes,
      38.87
    );
    assert.equal(
      offer.excludedTaxes,
      0
    );
    assert.equal(
      offer.commercialPricing.state,
      LITEAPI_PRICING_STATES
        .MATERIALIZED
    );
    assert.equal(
      offer.commercialPricing
        .targetSellingPrice,
      461.78
    );
    assert.equal(
      offer.commercialPricing
        .suggestedSellingPriceDiagnostic,
      476.32
    );
    assert.equal(
      offer.commercialPricing
        .policy
        .publicPriceFloorMode,
      LITEAPI_PUBLIC_PRICE_FLOOR_MODE
    );

    const publicOffer =
      createPublicHotelOffer(
        offer,
        0,
        {
          id:
            "liteapi:validated-florence-hotel",
        }
      );

    const serialized =
      JSON.stringify(
        publicOffer
      );

    assert.equal(
      publicOffer.price,
      461.78
    );
    assert.equal(
      serialized.includes(
        "suggestedSellingPriceDiagnostic"
      ),
      false
    );
  }
);

test(
  "private pricing controls and provider selection data never enter the public offer",
  () => {
    const internalOffer =
      createLiteApiOffer({
        rate:
          createProviderRate({
            publicFloor:
              108,
          }),
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
      108
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
  "LiteAPI rates payload bounds a server-owned explicit margin and hotel scope",
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
  "non-public and legacy LiteAPI offers fail closed without a second Rates call",
  async () => {
    for (const state of [
      LITEAPI_PRICING_STATES
        .PUBLIC_SALE_UNAVAILABLE,
      LITEAPI_PRICING_STATES
        .MATERIALIZATION_REQUIRED,
      LITEAPI_PRICING_STATES
        .UNVERIFIED,
    ]) {
      let ratesCalls = 0;
      let prebookCalls = 0;

      const offer =
        createInternalLiteApiOffer({
          state,
        });

      const adapter =
        createLiteApiAdapter(
          createAdapterDependencies({
            searchLiteApiRates:
              async () => {
                ratesCalls += 1;

                return {
                  data:
                    null,
                  noContent:
                    true,
                };
              },
            prebookLiteApiOffer:
              async () => {
                prebookCalls += 1;

                return {
                  data:
                    null,
                  noContent:
                    true,
                };
              },
          })
        );

      await assert.rejects(
        () =>
          adapter.recheckOffer(
            createLiteApiRecheckInput(
              offer
            )
          ),
        (error) =>
          error.code ===
          "PROVIDER_PRICE_NOT_PUBLICLY_BOOKABLE"
      );

      assert.equal(
        ratesCalls,
        0
      );
      assert.equal(
        prebookCalls,
        0
      );
    }
  }
);

test(
  "a materialized LiteAPI offer goes directly to prebook without a second Rates call",
  async () => {
    const offer =
      createInternalLiteApiOffer();

    let ratesCalls = 0;
    let prebookReference =
      null;

    const adapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          searchLiteApiRates:
            async () => {
              ratesCalls += 1;

              return {
                data:
                  null,
                noContent:
                  true,
              };
            },
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
              offer:
                originalOffer,
              providerBookingReference:
                "prebook-1",
            }),
        })
      );

    const result =
      await adapter.recheckOffer(
        createLiteApiRecheckInput(
          offer
        )
      );

    assert.equal(
      ratesCalls,
      0
    );
    assert.equal(
      prebookReference,
      "offer-original"
    );
    assert.equal(
      result.outcome,
      "confirmed"
    );
  }
);

test(
  "a materialized offer still fails closed when prebook drops below its verified target",
  async () => {
    const offer =
      createInternalLiteApiOffer();

    let ratesCalls = 0;

    const adapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          searchLiteApiRates:
            async () => {
              ratesCalls += 1;

              return {
                data:
                  null,
                noContent:
                  true,
              };
            },
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
        adapter.recheckOffer(
          createLiteApiRecheckInput(
            offer
          )
        ),
      (error) =>
        error.code ===
        "PROVIDER_PREBOOK_PRICE_BELOW_TARGET"
    );

    assert.equal(
      ratesCalls,
      0
    );
  }
);

test(
  "a provider-public-rate offer accepts a lower verified Prebook price for canonical recheck handling",
  async () => {
    const offer =
      createInternalLiteApiOffer({
        publicPriceFloorMode:
          LITEAPI_PUBLIC_PRICE_FLOOR_MODE,
      });

    const adapter =
      createLiteApiAdapter(
        createAdapterDependencies({
          createLiteApiPrebookOffer:
            ({ originalOffer }) => ({
              offer: {
                ...originalOffer,
                price:
                  114.99,
                totalKnownCost:
                  114.99,
              },
              providerBookingReference:
                "prebook-1",
            }),
        })
      );

    const result =
      await adapter.recheckOffer(
        createLiteApiRecheckInput(
          offer
        )
      );

    assert.equal(
      result.outcome,
      "confirmed"
    );
    assert.equal(
      result.offer.price,
      114.99
    );
  }
);
