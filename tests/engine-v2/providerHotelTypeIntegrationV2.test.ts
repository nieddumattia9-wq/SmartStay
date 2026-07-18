import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import type {
  Hotel,
} from "../../src/types/hotel";

import {
  classifyAccommodationV2,
} from "../../src/engine-v2/categories/accommodationCategoryModel";

function createHotel(
  input: {
    id:
      string;

    name:
      string;

    providerHotelTypeId:
      number;

    providerHotelTypeName:
      string;

    accommodationCategory:
      string;
  }
): Hotel {
  return {
    id:
      input.id,

    dataSources: [
      "LiteAPI",
    ],

    dataConfidence:
      "full",

    availableData: {
      hasPrice:
        true,

      hasBasePrice:
        false,

      hasSaving:
        false,

      hasStars:
        true,

      hasReviewScore:
        true,

      hasReviewCount:
        true,

      hasDistance:
        true,

      hasImage:
        true,

      hasAddress:
        true,

      hasCoordinates:
        true,

      hasAmenities:
        false,
    },

    offers: [],

    name:
      input.name,

    provider:
      "LiteAPI",

    providerHotelTypeId:
      input.providerHotelTypeId,

    providerHotelTypeName:
      input.providerHotelTypeName,

    accommodationCategory:
      input.accommodationCategory,

    stars:
      4,

    reviewScore:
      9,

    reviewCount:
      1000,

    reviewText:
      "Excellent",

    price:
      300,

    basePrice:
      300,

    saving:
      0,

    currency:
      "EUR",

    distance:
      1,

    image:
      "https://images.example/hotel.jpg",

    address:
      "SmartStay Street",

    city:
      "Florence",

    country:
      "Italy",

    latitude:
      43.7696,

    longitude:
      11.2558,

    amenities: [],

    facilities: [],
  };
}

test(
  "Provider category overrides misleading accommodation names",
  () => {
    const hotel =
      createHotel({
        id:
          "liteapi:brand-b-and-b-hotel",

        name:
          "B&B Hotel Firenze City Center",

        providerHotelTypeId:
          204,

        providerHotelTypeName:
          "Hotels",

        accommodationCategory:
          "hotel",
      });

    const result =
      classifyAccommodationV2({
        hotel,

        explicitCategory:
          hotel
            .accommodationCategory,

        categorySourceField:
          "accommodationCategory",
      });

    assert.equal(
      result
        .profile
        .category,
      "hotel"
    );

    assert.equal(
      result
        .profile
        .unitType,
      "hotel-room"
    );

    assert.equal(
      result
        .profile
        .originalCategory,
      "hotel"
    );

    assert.deepEqual(
      result
        .matchedCategoryCodes,
      [
        "category-explicit",
      ]
    );

    assert.equal(
      result
        .evidence[0]
        ?.source,
      "provider"
    );

    assert.equal(
      result
        .evidence[0]
        ?.sourceField,
      "accommodationCategory"
    );
  }
);

test(
  "Provider categories preserve hostel, guesthouse, bed and breakfast, and camping distinctions",
  () => {
    const scenarios = [
      {
        id:
          "hotel",

        name:
          "Starhotels Tuscany",

        providerHotelTypeId:
          204,

        providerHotelTypeName:
          "Hotels",

        accommodationCategory:
          "hotel",

        expectedCategory:
          "hotel",
      },

      {
        id:
          "hostel",

        name:
          "Plus Florence Hotel & Hostel",

        providerHotelTypeId:
          264,

        providerHotelTypeName:
          "Hostel/Backpacker accommodation",

        accommodationCategory:
          "hostel",

        expectedCategory:
          "hostel",
      },

      {
        id:
          "guesthouse",

        name:
          "B&B Le Stanze del Duomo",

        providerHotelTypeId:
          216,

        providerHotelTypeName:
          "Guest houses",

        accommodationCategory:
          "guesthouse",

        expectedCategory:
          "guesthouse",
      },

      {
        id:
          "bed-and-breakfast",

        name:
          "La Maison du Sage",

        providerHotelTypeId:
          208,

        providerHotelTypeName:
          "Bed and breakfasts",

        accommodationCategory:
          "bed-and-breakfast",

        expectedCategory:
          "bed-and-breakfast",
      },

      {
        id:
          "camping",

        name:
          "hu Firenze Camping in Town",

        providerHotelTypeId:
          254,

        providerHotelTypeName:
          "Campsite",

        accommodationCategory:
          "camping",

        expectedCategory:
          "camping",
      },
    ] as const;

    for (
      const scenario
      of scenarios
    ) {
      const hotel =
        createHotel({
          id:
            scenario.id,

          name:
            scenario.name,

          providerHotelTypeId:
            scenario
              .providerHotelTypeId,

          providerHotelTypeName:
            scenario
              .providerHotelTypeName,

          accommodationCategory:
            scenario
              .accommodationCategory,
        });

      const result =
        classifyAccommodationV2({
          hotel,

          explicitCategory:
            hotel
              .accommodationCategory,

          categorySourceField:
            "accommodationCategory",
        });

      assert.equal(
        result
          .profile
          .category,
        scenario
          .expectedCategory
      );

      assert.deepEqual(
        result
          .matchedCategoryCodes,
        [
          "category-explicit",
        ]
      );

      const explicitCategoryEvidence =
        result
          .evidence
          .find(
            (fact) =>
              fact.code ===
              "category-explicit"
          );

      assert.equal(
        explicitCategoryEvidence
          ?.confidence,
        0.99
      );

      assert.equal(
        explicitCategoryEvidence
          ?.source,
        "provider"
      );
    }
  }
);

test(
  "LiteAPI hotel type contract is carried from provider to Engine V2",
  () => {
    const providerSource =
      readFileSync(
        "server/providers/liteApi/liteApiProvider.js",
        "utf8"
      );

    const presenterSource =
      readFileSync(
        "server/presenters/publicHotelPresenter.js",
        "utf8"
      );

    const hotelTypeSource =
      readFileSync(
        "src/types/hotel.ts",
        "utf8"
      );

    const orchestratorSource =
      readFileSync(
        "src/engine-v2/orchestrator/smartStayEngineV2.ts",
        "utf8"
      );

    const categorySource =
      readFileSync(
        "src/engine-v2/categories/accommodationCategoryModel.ts",
        "utf8"
      );

    const evaluationModelSource =
      readFileSync(
        "src/engine-v2/model/smartStayEvaluationV2.ts",
        "utf8"
      );

    const peerGroupSource =
      readFileSync(
        "src/engine-v2/peer-groups/peerGroupModel.ts",
        "utf8"
      );

    assert.ok(
      providerSource.includes(
        "resolveLiteApiHotelType"
      )
    );

    assert.ok(
      providerSource.includes(
        "providerHotelTypeId"
      )
    );

    assert.ok(
      providerSource.includes(
        "accommodationCategory"
      )
    );

    assert.ok(
      presenterSource.includes(
        "providerHotelTypeName"
      )
    );

    assert.ok(
      hotelTypeSource.includes(
        "accommodationCategory?:"
      )
    );

    assert.ok(
      orchestratorSource.includes(
        "explicitCategory:"
      )
    );

    assert.ok(
      orchestratorSource.includes(
        "accommodationCategory"
      )
    );

    assert.ok(
      categorySource.includes(
        '"category-name-camping"'
      )
    );

    assert.ok(
      evaluationModelSource.includes(
        '| "camping"'
      )
    );

    assert.ok(
      peerGroupSource.includes(
        "camping: ["
      )
    );

    assert.ok(
      peerGroupSource.includes(
        '"camping",'
      )
    );
  }
);

type LiteApiRuntimeHotel = {
  id:
    string;

  sourceHotelId:
    string;

  providerHotelTypeId?:
    number;

  providerHotelTypeName?:
    string;

  accommodationCategory?:
    string;
};

type LiteApiRuntimeMetadata = {
  hotelData?: Array<{
    id:
      string;

    hotelTypeId:
      number;
  }>;
};

type LiteApiRuntimeSearchResult = {
  outcome:
    string;

  hotels:
    LiteApiRuntimeHotel[];
};

type LiteApiRuntimeAdapter = {
  searchHotels:
    (
      input: {
        request:
          unknown;

        signal?:
          AbortSignal;
      }
    ) =>
      Promise<
        LiteApiRuntimeSearchResult
      >;
};

const createLiteApiRuntimeAdapter =
  (
    require(
      process.cwd() +
        "/server/providers/liteApi/liteApiAdapter.js"
    ) as {
      createLiteApiAdapter:
        (
          dependencies:
            Record<
              string,
              unknown
            >
        ) =>
          LiteApiRuntimeAdapter;
    }
  ).createLiteApiAdapter;

function createLiteApiRuntimeRequest() {
  return {
    destination: {
      cityName:
        "Florence",

      countryCode:
        "IT",

      latitude:
        43.7696,

      longitude:
        11.2558,

      radiusMeters:
        8000,
    },

    stay: {
      checkin:
        "2026-09-01",

      checkout:
        "2026-09-04",
    },

    rooms: [
      {
        adults:
          2,

        childAges: [],
      },
    ],

    currency:
      "EUR",
  };
}

test(
  "LiteAPI search enriches rate hotels with batched static metadata",
  async () => {
    const providerHotelIds =
      Array.from(
        {
          length:
            41,
        },
        (
          _value,
          index
        ) =>
          "lp" +
          String(
            index + 1
          )
      );

    const metadataRequests:
      Array<{
        hotelIds:
          string;

        limit:
          number;

        language:
          string;
      }> = [];

    const mapperMetadata:
      Array<
        LiteApiRuntimeMetadata |
        null
      > = [];

    const adapter =
      createLiteApiRuntimeAdapter({
        searchLiteApiRates:
          async (
            _input:
              unknown
          ) => ({
            noContent:
              false,

            data: {
              rates:
                true,
            },
          }),

        getLiteApiHotels:
          async (
            params: {
              hotelIds:
                string;

              limit:
                number;

              language:
                string;
            },
            _options:
              unknown
          ) => {
            metadataRequests.push({
              ...params,
            });

            const ids =
              params
                .hotelIds
                .split(",");

            return {
              noContent:
                false,

              data: {
                data:
                  ids.map(
                    (
                      id,
                      index
                    ) => ({
                      id,

                      hotelTypeId:
                        metadataRequests.length ===
                          2 &&
                        index ===
                          0
                          ? 264
                          : 204,
                    })
                  ),
              },
            };
          },

        isLiteApiNoResults:
          (
            _data:
              unknown
          ) =>
            false,

        getLiteApiCurrency:
          (
            _data:
              unknown,
            fallback:
              string
          ) =>
            fallback,

        mapLiteApiHotelResponse:
          (
            _data:
              unknown,
            _currency:
              string,
            _searchLocation:
              unknown,
            metadata?:
              LiteApiRuntimeMetadata |
              null
          ) => {
            mapperMetadata.push(
              metadata ??
                null
            );

            const metadataById =
              new Map(
                (
                  metadata
                    ?.hotelData ??
                  []
                ).map(
                  (
                    record
                  ) => [
                    record.id,
                    record,
                  ]
                )
              );

            return providerHotelIds.map(
              (
                sourceHotelId
              ) => {
                const metadataRecord =
                  metadataById.get(
                    sourceHotelId
                  );

                const isHostel =
                  metadataRecord
                    ?.hotelTypeId ===
                  264;

                return {
                  id:
                    "liteapi:" +
                    sourceHotelId,

                  sourceHotelId,

                  ...(
                    metadataRecord
                      ? {
                          providerHotelTypeId:
                            metadataRecord
                              .hotelTypeId,

                          providerHotelTypeName:
                            isHostel
                              ? "Hostel/Backpacker accommodation"
                              : "Hotels",

                          accommodationCategory:
                            isHostel
                              ? "hostel"
                              : "hotel",
                        }
                      : {}
                  ),
                };
              }
            );
          },

        mapLiteApiHotelDetailsResponse:
          (
            _data:
              unknown,
            _hotelId:
              string
          ) =>
            null,

        mergeProviderHotelResults:
          (
            hotels:
              LiteApiRuntimeHotel[]
          ) =>
            hotels,
      });

    const result =
      await adapter.searchHotels({
        request:
          createLiteApiRuntimeRequest(),
      });

    assert.equal(
      metadataRequests.length,
      2
    );

    assert.equal(
      metadataRequests[0]
        ?.hotelIds
        .split(",")
        .length,
      40
    );

    assert.equal(
      metadataRequests[0]
        ?.limit,
      40
    );

    assert.equal(
      metadataRequests[0]
        ?.language,
      "en"
    );

    assert.equal(
      metadataRequests[1]
        ?.hotelIds
        .split(",")
        .length,
      1
    );

    assert.equal(
      metadataRequests[1]
        ?.limit,
      1
    );

    assert.equal(
      mapperMetadata.length,
      2
    );

    assert.equal(
      mapperMetadata[0],
      null
    );

    assert.equal(
      mapperMetadata[1]
        ?.hotelData
        ?.length,
      41
    );

    assert.equal(
      result
        .hotels
        .length,
      41
    );

    assert.ok(
      result
        .hotels
        .every(
          (
            hotel
          ) =>
            hotel
              .providerHotelTypeId !==
            undefined
        )
    );

    assert.equal(
      result
        .hotels[40]
        ?.accommodationCategory,
      "hostel"
    );
  }
);

test(
  "LiteAPI search stays available when static metadata enrichment fails",
  async () => {
    const providerHotelIds = [
      "lp-fallback-1",
      "lp-fallback-2",
    ];

    let mapperCallCount =
      0;

    const warningMessages:
      string[] = [];

    const adapter =
      createLiteApiRuntimeAdapter({
        searchLiteApiRates:
          async (
            _input:
              unknown
          ) => ({
            noContent:
              false,

            data: {
              rates:
                true,
            },
          }),

        getLiteApiHotels:
          async (
            _params:
              unknown,
            _options:
              unknown
          ) => {
            throw new Error(
              "metadata unavailable"
            );
          },

        isLiteApiNoResults:
          (
            _data:
              unknown
          ) =>
            false,

        getLiteApiCurrency:
          (
            _data:
              unknown,
            fallback:
              string
          ) =>
            fallback,

        mapLiteApiHotelResponse:
          (
            _data:
              unknown,
            _currency:
              string,
            _searchLocation:
              unknown,
            _metadata?:
              LiteApiRuntimeMetadata |
              null
          ) => {
            mapperCallCount +=
              1;

            return providerHotelIds.map(
              (
                sourceHotelId
              ) => ({
                id:
                  "liteapi:" +
                  sourceHotelId,

                sourceHotelId,
              })
            );
          },

        mapLiteApiHotelDetailsResponse:
          (
            _data:
              unknown,
            _hotelId:
              string
          ) =>
            null,

        mergeProviderHotelResults:
          (
            hotels:
              LiteApiRuntimeHotel[]
          ) =>
            hotels,
      });

    const originalWarn =
      console.warn;

    let result:
      LiteApiRuntimeSearchResult |
      null =
        null;

    console.warn =
      (
        ...values:
          unknown[]
      ) => {
        warningMessages.push(
          values
            .map(
              String
            )
            .join(" ")
        );
      };

    try {
      result =
        await adapter.searchHotels({
          request:
            createLiteApiRuntimeRequest(),
        });
    }
    finally {
      console.warn =
        originalWarn;
    }

    assert.ok(
      result
    );

    assert.equal(
      result
        .hotels
        .length,
      2
    );

    assert.equal(
      mapperCallCount,
      1
    );

    assert.equal(
      warningMessages.length,
      1
    );

    assert.match(
      warningMessages[0] ??
        "",
      /metadata unavailable/
    );
  }
);

test(
  "LiteAPI search resolves facilityIds into public amenity names",
  async () => {
    let facilityRequestCount =
      0;

    const mapperMetadata:
      Array<
        Record<
          string,
          unknown
        > |
        null
      > = [];

    const adapter =
      createLiteApiRuntimeAdapter({
        searchLiteApiRates:
          async (
            _input:
              unknown
          ) => ({
            noContent:
              false,

            data: {
              rates:
                true,
            },
          }),

        getLiteApiHotels:
          async (
            _params:
              unknown,
            _options:
              unknown
          ) => ({
            noContent:
              false,

            data: {
              data: [
                {
                  id:
                    "lp-facility",

                  hotelTypeId:
                    204,

                  facilityIds: [
                    10,
                    20,
                    30,
                  ],
                },
              ],
            },
          }),

        getLiteApiFacilities:
          async (
            params:
              Record<
                string,
                unknown
              >,
            _options:
              unknown
          ) => {
            facilityRequestCount +=
              1;

            assert.equal(
              params.language,
              "en"
            );

            return {
              noContent:
                false,

              data: {
                data: [
                  {
                    facility_id:
                      10,

                    facility:
                      "WiFi",

                    sort:
                      1,

                    translation: [
                      {
                        lang:
                          "it",

                        facility:
                          "Wi-Fi gratuito",
                      },

                      {
                        lang:
                          "en",

                        facility:
                          "Free WiFi",
                      },
                    ],
                  },

                  {
                    facility_id:
                      20,

                    facility:
                      "Air conditioning",

                    sort:
                      2,

                    translation:
                      [],
                  },

                  {
                    facility_id:
                      30,

                    facility:
                      "Reception",

                    sort:
                      3,

                    translation: [
                      {
                        lang:
                          "en-GB",

                        facility:
                          "24-hour reception",
                      },
                    ],
                  },
                ],
              },
            };
          },

        isLiteApiNoResults:
          (
            _data:
              unknown
          ) =>
            false,

        getLiteApiCurrency:
          (
            _data:
              unknown,
            fallback:
              string
          ) =>
            fallback,

        mapLiteApiHotelResponse:
          (
            _data:
              unknown,
            _currency:
              string,
            _searchLocation:
              unknown,
            metadata?:
              Record<
                string,
                unknown
              > |
              null
          ) => {
            mapperMetadata.push(
              metadata ??
                null
            );

            const hotelData =
              Array.isArray(
                metadata
                  ?.hotelData
              )
                ? metadata
                    ?.hotelData as Array<
                      Record<
                        string,
                        unknown
                      >
                    >
                : [];

            const metadataHotel =
              hotelData[0] ??
              null;

            const facilities =
              Array.isArray(
                metadataHotel
                  ?.facilities
              )
                ? metadataHotel
                    ?.facilities as string[]
                : [];

            return [
              {
                id:
                  "liteapi:lp-facility",

                sourceHotelId:
                  "lp-facility",

                ...(
                  metadataHotel
                    ? {
                        providerHotelTypeId:
                          204,

                        providerHotelTypeName:
                          "Hotels",

                        accommodationCategory:
                          "hotel",

                        amenities:
                          facilities,
                      }
                    : {}
                ),
              },
            ];
          },

        mapLiteApiHotelDetailsResponse:
          (
            _data:
              unknown,
            _hotelId:
              string
          ) =>
            null,

        mergeProviderHotelResults:
          (
            hotels:
              LiteApiRuntimeHotel[]
          ) =>
            hotels,
      });

    const result =
      await adapter.searchHotels({
        request:
          createLiteApiRuntimeRequest(),
      });

    assert.equal(
      facilityRequestCount,
      1
    );

    assert.equal(
      mapperMetadata.length,
      2
    );

    assert.equal(
      mapperMetadata[0],
      null
    );

    const enrichedMetadata =
      mapperMetadata[1] as {
        hotelData?: Array<{
          facilities?:
            string[];
        }>;
      };

    assert.deepEqual(
      enrichedMetadata
        .hotelData
        ?.[0]
        ?.facilities,
      [
        "Free WiFi",
        "Air conditioning",
        "24-hour reception",
      ]
    );

    const hotel =
      result
        .hotels[0] as
          LiteApiRuntimeHotel & {
            amenities?:
              string[];
          };

    assert.deepEqual(
      hotel.amenities,
      [
        "Free WiFi",
        "Air conditioning",
        "24-hour reception",
      ]
    );
  }
);
