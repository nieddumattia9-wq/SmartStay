const {
  LITEAPI_PRICING_STATES,
  createLiteApiCommercialPricing,
  createLiteApiSelectionFingerprint,
  getLiteApiPublicPriceFloor,
  getLiteApiRetailSellingPrice,
} = require(
  "./liteApiCommercialPricing"
);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asArray(value) {
  if (Array.isArray(value)) return value;

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  return [value];
}

function asString(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function asNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed =
      Number(
        value.replace(",", ".")
      );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed =
        asNumber(item);

      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  if (isPlainObject(value)) {
    return asNumber(
      value.amount ??
      value.value ??
      value.total ??
      value.price
    );
  }

  return null;
}

function asBooleanOrNull(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function getValueByPath(
  source,
  path
) {
  return path.reduce(
    (currentValue, key) => {
      if (
        currentValue === null ||
        currentValue === undefined
      ) {
        return undefined;
      }

      return currentValue[key];
    },
    source
  );
}

function pickFirst(
  source,
  paths
) {
  for (const path of paths) {
    const value =
      getValueByPath(
        source,
        path
      );

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function pickString(
  source,
  paths
) {
  return asString(
    pickFirst(
      source,
      paths
    )
  );
}

function pickNumber(
  source,
  paths
) {
  return asNumber(
    pickFirst(
      source,
      paths
    )
  );
}

function roundMoney(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(
    value.toFixed(2)
  );
}

function calculateSavingPercent(
  price,
  basePrice
) {
  if (
    !price ||
    !basePrice ||
    basePrice <= price
  ) {
    return 0;
  }

  const saving =
    (
      (basePrice - price) /
      basePrice
    ) * 100;

  if (
    !Number.isFinite(saving) ||
    saving <= 0 ||
    saving > 80
  ) {
    return 0;
  }

  return Number(
    saving.toFixed(2)
  );
}

function getNestedRates(container) {
  if (!isPlainObject(container)) {
    return [];
  }

  return [
    container.rates,
    container.rate,
    container.offers,
    container.availableRates,
    container.roomRates,
  ]
    .flatMap(asArray)
    .filter(isPlainObject);
}

function getPublicPrice(rate) {
  const publicPriceFloor =
    getLiteApiPublicPriceFloor(
      rate
    );

  const retailSellingPrice =
    getLiteApiRetailSellingPrice(
      rate
    );

  if (
    publicPriceFloor !== null &&
    retailSellingPrice !== null
  ) {
    return Math.max(
      publicPriceFloor,
      retailSellingPrice
    );
  }

  return (
    publicPriceFloor ??
    retailSellingPrice
  );
}

function getCheckoutPrice(rate) {
  return (
    getLiteApiRetailSellingPrice(
      rate
    ) ??
    getPublicPrice(rate)
  );
}

function getRateCurrency(
  rate,
  fallbackCurrency = "EUR"
) {
  return (
    pickString(rate, [
      [
        "offerRetailRate",
        "currency",
      ],
      [
        "retailRate",
        "total",
        0,
        "currency",
      ],
      [
        "retailRate",
        "currency",
      ],
      ["price", "currency"],
      ["currency"],
      [
        "suggestedSellingPrice",
        "currency",
      ],
      [
        "suggestedSellingPrice",
        0,
        "currency",
      ],
    ]) ||
    fallbackCurrency ||
    "EUR"
  );
}

function getCheckoutCurrency(
  rate,
  fallbackCurrency = "EUR"
) {
  return (
    pickString(rate, [
      [
        "offerRetailRate",
        "currency",
      ],
      [
        "retailRate",
        "total",
        0,
        "currency",
      ],
      [
        "retailRate",
        "total",
        "currency",
      ],
      [
        "retailRate",
        "currency",
      ],
      ["price", "currency"],
      ["currency"],
      [
        "suggestedSellingPrice",
        "currency",
      ],
      [
        "suggestedSellingPrice",
        0,
        "currency",
      ],
    ]) ||
    fallbackCurrency ||
    "EUR"
  );
}

function buildRoomName(rate) {
  const nestedRoomNames =
    getNestedRates(rate)
      .map((nestedRate) =>
        pickString(
          nestedRate,
          [
            ["roomName"],
            ["roomType"],
            ["roomTypeName"],
            ["name"],
          ]
        )
      )
      .filter(Boolean);

  const uniqueRoomNames =
    [...new Set(
      nestedRoomNames
    )];

  if (
    uniqueRoomNames.length === 1
  ) {
    return nestedRoomNames.length > 1
      ? `${uniqueRoomNames[0]} × ${nestedRoomNames.length}`
      : uniqueRoomNames[0];
  }

  if (
    uniqueRoomNames.length > 1
  ) {
    return uniqueRoomNames.join(
      " + "
    );
  }

  return (
    pickString(rate, [
      ["roomName"],
      ["roomType"],
      ["roomTypeName"],
      ["boardName"],
      ["name"],
    ]) ||
    null
  );
}

function buildMealPlan(rate) {
  const nestedRates =
    getNestedRates(rate);

  const sources =
    nestedRates.length > 0
      ? nestedRates
      : [rate];

  const mealPlans =
    sources
      .map((source) =>
        pickString(source, [
          ["boardName"],
          ["boardDescription"],
          ["mealPlan"],
          ["mealPlanName"],
          ["boardType"],
        ])
      )
      .filter(Boolean);

  const uniqueMealPlans =
    [...new Set(
      mealPlans
    )];

  if (
    uniqueMealPlans.length === 0
  ) {
    return null;
  }

  if (
    uniqueMealPlans.length === 1
  ) {
    return uniqueMealPlans[0];
  }

  return uniqueMealPlans.join(
    " + "
  );
}

function mergeRoomWithRate(
  room,
  rate,
  index
) {
  return {
    ...room,
    ...rate,

    __liteApiSelectedNestedRate:
      true,

    roomName:
      pickString(rate, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["name"],
      ]) ||
      pickString(room, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["name"],
      ]),

    offerId:
      pickString(
        room,
        [["offerId"]]
      ) ||
      pickString(
        rate,
        [["offerId"]]
      ),

    rateId:
      pickString(rate, [
        ["rateId"],
        ["id"],
        ["rateToken"],
      ]) ||
      pickString(room, [
        ["offerId"],
        ["roomTypeId"],
        ["id"],
      ]) ||
      `rate_${index + 1}`,
  };
}

function getLiteApiOfferRecords(
  record
) {
  if (!isPlainObject(record)) {
    return [];
  }

  const offers = [];

  const roomCandidates = [
    record.roomTypes,
    record.rooms,
    record.roomRates,
    record.availableRooms,
    record.offers,
  ];

  for (
    const roomCandidate
    of roomCandidates
  ) {
    for (
      const room
      of asArray(roomCandidate)
    ) {
      if (!isPlainObject(room)) {
        continue;
      }

      const nestedRates =
        getNestedRates(room);

      const offerPrice =
        getPublicPrice(room);

      if (
        offerPrice !== null &&
        offerPrice > 0
      ) {
        offers.push({
          ...room,

          roomName:
            buildRoomName(room),

          rateId:
            pickString(room, [
              ["offerId"],
              ["roomTypeId"],
              ["rateId"],
              ["id"],
            ]) ||
            `rate_${offers.length + 1}`,
        });

        continue;
      }

      for (
        const nestedRate
        of nestedRates
      ) {
        const nestedPrice =
          getPublicPrice(
            nestedRate
          );

        if (
          nestedPrice === null ||
          nestedPrice <= 0
        ) {
          continue;
        }

        offers.push(
          mergeRoomWithRate(
            room,
            nestedRate,
            offers.length
          )
        );
      }
    }
  }

  for (
    const directCandidate
    of [
      record.rates,
      record.rate,
      record.availableRates,
      record.roomRates,
    ]
  ) {
    for (
      const rate
      of asArray(directCandidate)
    ) {
      if (
        isPlainObject(rate) &&
        getPublicPrice(rate) > 0
      ) {
        offers.push(
          mergeRoomWithRate(
            {},
            rate,
            offers.length
          )
        );
      }
    }
  }

  if (
    offers.length === 0 &&
    getPublicPrice(record) > 0
  ) {
    offers.push(
      mergeRoomWithRate(
        {},
        record,
        0
      )
    );
  }

  return offers;
}

function createTaxSummary(rate) {
  const taxItems = [];

  const sources =
    getNestedRates(rate);

  const rateSources =
    sources.length > 0
      ? sources
      : [rate];

  for (const source of rateSources) {
    const taxes =
      asArray(
        pickFirst(source, [
          ["taxesAndFees"],
          [
            "retailRate",
            "taxesAndFees",
          ],
        ])
      );

    for (const tax of taxes) {
      if (!isPlainObject(tax)) {
        continue;
      }

      const amount =
        pickNumber(
          tax,
          [
            ["amount"],
            ["value"],
            ["total"],
          ]
        );

      if (
        amount === null ||
        amount < 0
      ) {
        continue;
      }

      taxItems.push({
        description:
          pickString(tax, [
            ["description"],
            ["name"],
            ["type"],
            ["title"],
          ]) ||
          "Tax or fee",

        amount,

        currency:
          pickString(
            tax,
            [["currency"]]
          ) ||
          getRateCurrency(
            source,
            getRateCurrency(rate)
          ),

        included:
          asBooleanOrNull(
            pickFirst(tax, [
              ["included"],
              ["includedInPrice"],
              ["taxIncluded"],
            ])
          ),
      });
    }
  }

  const grouped =
    new Map();

  for (const item of taxItems) {
    const key =
      JSON.stringify([
        item.description
          .toLowerCase(),
        item.currency,
        item.included,
      ]);

    const existing =
      grouped.get(key);

    if (existing) {
      existing.amount =
        roundMoney(
          existing.amount +
          item.amount
        );
    } else {
      grouped.set(
        key,
        {
          ...item,
          amount:
            roundMoney(
              item.amount
            ),
        }
      );
    }
  }

  const taxBreakdown =
    [...grouped.values()];

  const sumByIncluded =
    (included) =>
      roundMoney(
        taxBreakdown
          .filter(
            (tax) =>
              tax.included ===
              included
          )
          .reduce(
            (total, tax) =>
              total + tax.amount,
            0
          )
      );

  let taxesIncluded = null;

  if (
    taxBreakdown.some(
      (tax) =>
        tax.included === false
    )
  ) {
    taxesIncluded = false;
  } else if (
    taxBreakdown.length > 0 &&
    taxBreakdown.every(
      (tax) =>
        tax.included === true
    )
  ) {
    taxesIncluded = true;
  }

  return {
    taxesIncluded,
    includedTaxes:
      sumByIncluded(true),
    excludedTaxes:
      sumByIncluded(false),
    unknownTaxes:
      sumByIncluded(null),
    taxBreakdown,
  };
}

function normalizeRefundableTag(
  value
) {
  if (typeof value === "boolean") {
    return value
      ? "RFN"
      : "NRFN";
  }

  const normalized =
    asString(value)
      .toUpperCase()
      .replace(
        /[\s_-]+/g,
        ""
      );

  if (
    [
      "RFN",
      "REFUNDABLE",
      "TRUE",
    ].includes(normalized)
  ) {
    return "RFN";
  }

  if (
    [
      "NRFN",
      "NONREFUNDABLE",
      "FALSE",
    ].includes(normalized)
  ) {
    return "NRFN";
  }

  return null;
}

function normalizeCancellationDeadline(
  value,
  timezone
) {
  const raw =
    asString(value);

  if (!raw) {
    return null;
  }

  if (
    /(?:z|[+-]\d{2}:?\d{2})$/i.test(
      raw
    )
  ) {
    const date =
      new Date(raw);

    return Number.isNaN(
      date.getTime()
    )
      ? raw
      : date.toISOString();
  }

  const match =
    raw.match(
      /^(\d{4}-\d{2}-\d{2})[ t](\d{2}:\d{2})(?::(\d{2}))?$/i
    );

  const normalizedTimezone =
    asString(timezone)
      .toUpperCase();

  if (
    match &&
    [
      "GMT",
      "UTC",
      "ETC/UTC",
      "ETC/GMT",
    ].includes(
      normalizedTimezone
    )
  ) {
    return (
      match[1] +
      "T" +
      match[2] +
      ":" +
      (match[3] ?? "00") +
      ".000Z"
    );
  }

  return raw;
}

function createCancellationSummary(
  rate
) {
  const nestedRates =
    getNestedRates(rate);

  const sources =
    nestedRates.length > 0
      ? nestedRates
      : [rate];

  const refundableTags =
    sources
      .map((source) =>
        normalizeRefundableTag(
          pickFirst(source, [
            ["refundableTag"],
            ["refundable"],
            [
              "cancellationPolicies",
              "refundableTag",
            ],
          ])
        )
      )
      .filter(Boolean);

  let refundableTag = null;
  let refundable = null;

  if (
    refundableTags.includes(
      "NRFN"
    )
  ) {
    refundableTag = "NRFN";
    refundable = false;
  } else if (
    refundableTags.length ===
      sources.length &&
    refundableTags.length > 0 &&
    refundableTags.every(
      (tag) => tag === "RFN"
    )
  ) {
    refundableTag = "RFN";
    refundable = true;
  }

  const groupedPenalties =
    new Map();

  for (const source of sources) {
    const policies =
      pickFirst(source, [
        ["cancellationPolicies"],
        ["cancellationPolicy"],
      ]);

    const penalties =
      asArray(
        isPlainObject(policies)
          ? (
              policies
                .cancelPolicyInfos ??
              policies
                .cancelPenalties ??
              policies.penalties
            )
          : null
      );

    for (const penalty of penalties) {
      if (!isPlainObject(penalty)) {
        continue;
      }

      const item = {
        cancelTime:
          normalizeCancellationDeadline(
            pickString(penalty, [
              ["cancelTime"],
              ["cancellationTime"],
              ["from"],
              ["deadline"],
            ]),
            pickString(penalty, [
              ["timezone"],
              ["timeZone"],
            ])
          ),

        amount:
          pickNumber(penalty, [
            ["amount"],
            ["value"],
            ["price"],
          ]),

        currency:
          pickString(
            penalty,
            [["currency"]]
          ) ||
          getRateCurrency(
            source,
            getRateCurrency(rate)
          ),

        type:
          pickString(penalty, [
            ["type"],
            ["penaltyType"],
          ]) ||
          null,

        timezone:
          pickString(penalty, [
            ["timezone"],
            ["timeZone"],
          ]) ||
          null,
      };

      const key =
        JSON.stringify([
          item.cancelTime,
          item.currency,
          item.type,
          item.timezone,
        ]);

      const existing =
        groupedPenalties.get(key);

      if (existing) {
        existing.amount =
          roundMoney(
            (existing.amount ?? 0) +
            (item.amount ?? 0)
          );
      } else {
        groupedPenalties.set(
          key,
          {
            ...item,

            amount:
              item.amount === null
                ? null
                : roundMoney(
                    item.amount
                  ),
          }
        );
      }
    }
  }

  const cancellationPolicies =
    [...groupedPenalties.values()]
      .sort(
        (first, second) =>
          (
            first.cancelTime ??
            ""
          ).localeCompare(
            second.cancelTime ??
            ""
          )
      );

  const firstPenalty =
    cancellationPolicies[0] ??
    null;

  const freeCancellationUntil =
    refundable === true
      ? firstPenalty
          ?.cancelTime ??
        null
      : null;

  let cancellationPolicy = null;

  if (refundable === false) {
    cancellationPolicy =
      "Non-refundable";
  } else if (
    refundable === true &&
    freeCancellationUntil
  ) {
    cancellationPolicy =
      `Refundable; cancellation fees apply from ${freeCancellationUntil}${
        firstPenalty?.timezone
          ? ` ${firstPenalty.timezone}`
          : ""
      }.`;
  } else if (
    refundable === true
  ) {
    cancellationPolicy =
      "Refundable";
  }

  return {
    refundableTag,
    refundable,
    freeCancellationUntil,

    cancellationPenalty:
      firstPenalty?.amount ??
      null,

    cancellationPenaltyCurrency:
      firstPenalty?.currency ??
      null,

    cancellationPenaltyType:
      firstPenalty?.type ??
      null,

    cancellationTimezone:
      firstPenalty?.timezone ??
      null,

    cancellationPolicies,
    cancellationPolicy,
  };
}

function getRateBasePrice(
  rate,
  price
) {
  const candidate =
    pickNumber(rate, [
      [
        "originalRetailRate",
        "total",
        0,
        "amount",
      ],
      [
        "originalRetailRate",
        "amount",
      ],
      [
        "strikethroughPrice",
        "amount",
      ],
      ["strikethroughPrice"],
      [
        "priceBeforeDiscount",
        "amount",
      ],
      ["priceBeforeDiscount"],
      ["basePrice", "amount"],
      ["basePrice"],
    ]);

  return (
    candidate !== null &&
    candidate > price
  )
    ? candidate
    : price;
}

function getDeepLink(rate) {
  return (
    pickString(rate, [
      ["deepLink"],
      ["deeplink"],
      ["bookingUrl"],
      ["bookingURL"],
      ["checkoutUrl"],
      ["url"],
    ]) ||
    null
  );
}

function createLiteApiOffer({
  rate,
  hotelId,
  index,
  fallbackCurrency = "EUR",
  sourceProvider,
  providerName,
  priceMode = "public",
  commercialPricingPolicy = null,
  requestedSellerCommissionPercent = null,
}) {
  const commercialPricing =
    createLiteApiCommercialPricing({
      rate,
      commercialPricingPolicy,
      requestedSellerCommissionPercent,
    });

  const publicSaleAvailable =
    commercialPricing
      .pricingControl
      .state ===
      LITEAPI_PRICING_STATES
        .MATERIALIZED ||
    commercialPricing
      .pricingControl
      .state ===
      LITEAPI_PRICING_STATES
        .UNMANAGED;

  if (
    priceMode !== "checkout" &&
    !publicSaleAvailable
  ) {
    return null;
  }

  const price =
    priceMode ===
      "checkout"
      ? getCheckoutPrice(
          rate
        )
      : commercialPricing
          .sellingPrice ??
        getPublicPrice(
          rate
        );

  if (
    price === null ||
    price <= 0
  ) {
    return null;
  }

  const basePrice =
    getRateBasePrice(
      rate,
      price
    );


  const currency =
    priceMode ===
      "checkout"
      ? getCheckoutCurrency(
          rate,
          fallbackCurrency
        )
      : getRateCurrency(
          rate,
          fallbackCurrency
        );

  const taxSummary =
    createTaxSummary(rate);

  const cancellationSummary =
    createCancellationSummary(
      rate
    );

  return {
    id:
      `${sourceProvider}:${hotelId}:${
        pickString(rate, [
          ["offerId"],
          ["rateId"],
          ["id"],
          ["roomId"],
          ["rateToken"],
        ]) ||
        `rate_${index + 1}`
      }`,

    provider:
      providerName,

    sourceProvider,

    providerOfferReference:
      pickString(rate, [
        ["offerId"],
        ["rateId"],
        ["rateToken"],
      ]) ||
      null,

    providerOfferContext: {
      selectionFingerprint:
        createLiteApiSelectionFingerprint(
          rate
        ),
    },

    commercialPricing:
      commercialPricing
        .pricingControl,

    price,


    basePrice,

    saving:
      calculateSavingPercent(
        price,
        basePrice
      ),

    currency,

    ...taxSummary,

    totalKnownCost:
      roundMoney(
        price +
        taxSummary.excludedTaxes
      ),

    ...cancellationSummary,

    bookable:
      true,

    roomName:
      buildRoomName(rate),

    mealPlan:
      buildMealPlan(rate),

    deepLink:
      getDeepLink(rate),
  };
}

function getLiteApiPrebookPayload(
  data
) {
  if (!isPlainObject(data)) {
    return null;
  }

  const nested =
    pickFirst(data, [
      ["data"],
      ["result"],
      ["prebook"],
    ]);

  return isPlainObject(nested)
    ? nested
    : data;
}

function getOfferReferenceCandidates(
  offer
) {
  return [
    pickString(
      offer,
      [["offerId"]]
    ),
    pickString(
      offer,
      [["rateId"]]
    ),
    pickString(
      offer,
      [["rateToken"]]
    ),
    pickString(
      offer,
      [["id"]]
    ),
  ].filter(Boolean);
}

function selectPrebookOfferRecord({
  payload,
  originalOffer,
} = {}) {
  const records =
    getLiteApiOfferRecords(
      payload
    );

  const expectedReference =
    asString(
      originalOffer
        ?.providerOfferReference
    );

  if (expectedReference) {
    const exactMatches =
      records.filter(
        (record) =>
          getOfferReferenceCandidates(
            record
          ).includes(
            expectedReference
          )
      );

    if (
      exactMatches.length === 1
    ) {
      return exactMatches[0];
    }

    if (
      exactMatches.length > 1
    ) {
      return null;
    }
  }

  if (
    records.length === 1
  ) {
    return records[0];
  }

  if (
    records.length === 0 &&
    getCheckoutPrice(payload) > 0
  ) {
    return payload;
  }

  return null;
}

function createLiteApiPrebookOffer({
  data,
  originalOffer,
  hotelId,
  sourceProvider,
  providerName,
  fallbackCurrency = "EUR",
} = {}) {
  const payload =
    getLiteApiPrebookPayload(
      data
    );

  if (!payload) {
    return null;
  }

  const offerRecord =
    selectPrebookOfferRecord({
      payload,
      originalOffer,
    });

  if (!offerRecord) {
    return null;
  }

  const mappedOffer =
    createLiteApiOffer({
      rate:
        offerRecord,
      hotelId,
      index:
        0,
      fallbackCurrency:
        pickString(payload, [
          ["currency"],
          ["price", "currency"],
        ]) ||
        originalOffer?.currency ||
        fallbackCurrency,
      sourceProvider,
      providerName,
      priceMode:
        "checkout",
    });

  if (!mappedOffer) {
    return null;
  }

  return {
    offer: {
      ...originalOffer,
      ...mappedOffer,

      id:
        originalOffer?.id ??
        mappedOffer.id,

      providerOfferReference:
        originalOffer
          ?.providerOfferReference ??
        mappedOffer
          .providerOfferReference,

      providerOfferContext:
        originalOffer
          ?.providerOfferContext ??
        mappedOffer
          .providerOfferContext ??
        null,

      commercialPricing:
        originalOffer
          ?.commercialPricing
          ? {
              ...originalOffer
                .commercialPricing,
              state:
                LITEAPI_PRICING_STATES
                  .MATERIALIZED,
              targetSellingPrice:
                roundMoney(
                  mappedOffer.price
                ),
            }
          : mappedOffer
              .commercialPricing,

      deepLink:
        originalOffer?.deepLink ??
        mappedOffer.deepLink ??
        null,
    },

    providerBookingReference:
      pickString(payload, [
        ["prebookId"],
        ["prebook", "id"],
        ["booking", "prebookId"],
      ]) ||
      null,
  };
}

module.exports = {
  createCancellationSummary,
  createLiteApiOffer,
  createLiteApiPrebookOffer,
  createTaxSummary,
  getCheckoutPrice,
  getLiteApiOfferRecords,
  normalizeCancellationDeadline,
  selectPrebookOfferRecord,
};
