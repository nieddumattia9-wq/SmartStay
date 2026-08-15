const crypto =
  require("crypto");

const LITEAPI_PRICING_STATES =
  Object.freeze({
    MATERIALIZED:
      "materialized",
    PUBLIC_SALE_UNAVAILABLE:
      "public-sale-unavailable",
    // Kept only so offers stored by the previous release fail closed.
    MATERIALIZATION_REQUIRED:
      "materialization-required",
    UNVERIFIED:
      "unverified",
    UNMANAGED:
      "unmanaged",
  });

const PRICE_EPSILON =
  0.005;

const LITEAPI_COMMERCIAL_PRICING_SCHEMA_VERSION =
  2;

const LITEAPI_PUBLIC_RATE_PRICE_MODE =
  "offer-retail-rate";

const LITEAPI_PUBLIC_PRICE_FLOOR_MODE =
  "reference-only";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  return [value];
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
        value
          .trim()
          .replace(",", ".")
      );

    return Number.isFinite(parsed)
      ? parsed
      : null;
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

function asText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  return "";
}

function getValueByPath(
  source,
  path
) {
  return path.reduce(
    (currentValue, key) =>
      currentValue === null ||
      currentValue === undefined
        ? undefined
        : currentValue[key],
    source
  );
}

function pickFirstNumber(
  source,
  paths
) {
  for (const path of paths) {
    const value =
      asNumber(
        getValueByPath(
          source,
          path
        )
      );

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function pickFirstText(
  source,
  paths
) {
  for (const path of paths) {
    const value =
      asText(
        getValueByPath(
          source,
          path
        )
      );

    if (value) {
      return value;
    }
  }

  return "";
}

function roundMoney(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(
    value.toFixed(2)
  );
}

function getNestedRates(rate) {
  if (!isPlainObject(rate)) {
    return [];
  }

  const candidates = [
    rate.rates,
    rate.rate,
    rate.offers,
    rate.availableRates,
    rate.roomRates,
  ];

  for (const candidate of candidates) {
    const nestedRates =
      asArray(candidate)
        .filter(isPlainObject);

    if (nestedRates.length > 0) {
      return nestedRates;
    }
  }

  return [];
}

function getLiteApiRetailSellingPrice(
  rate
) {
  return pickFirstNumber(rate, [
    ["offerRetailRate", "amount"],
    ["offerRetailRate"],
    ["retailRate", "total", 0, "amount"],
    ["retailRate", "total", "amount"],
    ["retailRate", "amount"],
    ["price", "amount"],
    ["price"],
    ["amount"],
    ["total"],
    ["totalPrice"],
    ["sellingPrice"],
  ]);
}

function getLiteApiPublicPriceFloor(
  rate
) {
  return pickFirstNumber(rate, [
    ["suggestedSellingPrice", "amount"],
    ["suggestedSellingPrice", 0, "amount"],
    ["suggestedSellingPrice"],
    [
      "retailRate",
      "suggestedSellingPrice",
      0,
      "amount",
    ],
    [
      "retailRate",
      "suggestedSellingPrice",
      "amount",
    ],
    ["retailRate", "suggestedSellingPrice"],
  ]);
}

function getCommissionFromSource(
  source
) {
  return pickFirstNumber(source, [
    ["retailRate", "commission", 0, "amount"],
    ["retailRate", "commission", 0],
    ["retailRate", "commission", "amount"],
    ["retailRate", "commission"],
    ["commission", 0, "amount"],
    ["commission", 0],
    ["commission", "amount"],
    ["commission"],
  ]);
}

function getLiteApiCommissionAmount(
  rate
) {
  const directCommission =
    getCommissionFromSource(
      rate
    );

  if (
    directCommission !== null &&
    directCommission >= 0
  ) {
    return roundMoney(
      directCommission
    );
  }

  const nestedCommissions =
    getNestedRates(rate)
      .map(
        getCommissionFromSource
      );

  if (
    nestedCommissions.length === 0 ||
    nestedCommissions.some(
      (value) =>
        value === null ||
        value < 0
    )
  ) {
    return null;
  }

  return roundMoney(
    nestedCommissions.reduce(
      (total, value) =>
        total + value,
      0
    )
  );
}

function getMinimumCommissionPercent(
  commercialPricingPolicy
) {
  const value =
    asNumber(
      commercialPricingPolicy
        ?.minimumSellerCommissionPercent
    );

  return (
    value !== null &&
    value > 0
  )
    ? value
    : null;
}

function createLiteApiCommercialPricing({
  rate,
  commercialPricingPolicy = null,
  requestedSellerCommissionPercent = null,
} = {}) {
  const retailSellingPrice =
    getLiteApiRetailSellingPrice(
      rate
    );

  const publicPriceFloor =
    getLiteApiPublicPriceFloor(
      rate
    );

  const minimumCommissionPercent =
    getMinimumCommissionPercent(
      commercialPricingPolicy
    );

  if (minimumCommissionPercent === null) {
    const unmanagedSellingPrice =
      retailSellingPrice ??
      publicPriceFloor;

    return {
      sellingPrice:
        unmanagedSellingPrice,

      pricingControl: {
        schemaVersion:
          LITEAPI_COMMERCIAL_PRICING_SCHEMA_VERSION,
        policy:
          null,
        state:
          LITEAPI_PRICING_STATES
            .UNMANAGED,
        targetSellingPrice:
          roundMoney(
            unmanagedSellingPrice
          ),
        requiredSellerCommissionPercent:
          null,
        providerPriceMode:
          retailSellingPrice !== null
            ? LITEAPI_PUBLIC_RATE_PRICE_MODE
            : "legacy-reference-fallback",
        suggestedSellingPriceDiagnostic:
          roundMoney(
            publicPriceFloor
          ),
      },
    };
  }

  const currentCommissionPercent =
    asNumber(
      requestedSellerCommissionPercent
    ) ??
    minimumCommissionPercent;

  const commissionAmount =
    getLiteApiCommissionAmount(
      rate
    );

  const commissionVerified =
    commissionAmount !== null &&
    commissionAmount > 0 &&
    retailSellingPrice !== null &&
    commissionAmount <
      retailSellingPrice;

  const targetSellingPrice =
    retailSellingPrice ?? 0;

  let state =
    LITEAPI_PRICING_STATES
      .MATERIALIZED;

  if (
    retailSellingPrice === null ||
    targetSellingPrice <= 0 ||
    !commissionVerified
  ) {
    state =
      LITEAPI_PRICING_STATES
        .UNVERIFIED;
  }
  return {
    sellingPrice:
      state ===
        LITEAPI_PRICING_STATES
          .MATERIALIZED
        ? roundMoney(
            targetSellingPrice
          )
        : null,

    pricingControl: {
      schemaVersion:
        LITEAPI_COMMERCIAL_PRICING_SCHEMA_VERSION,

      policy: {
        schemaVersion:
          commercialPricingPolicy
            ?.schemaVersion ??
          1,
        minimumSellerCommissionPercent:
          minimumCommissionPercent,
        publicPriceFloorMode:
          LITEAPI_PUBLIC_PRICE_FLOOR_MODE,
        providerPriceMode:
          LITEAPI_PUBLIC_RATE_PRICE_MODE,
      },

      state,

      targetSellingPrice:
        roundMoney(
          targetSellingPrice
        ),

      requiredSellerCommissionPercent:
        state ===
          LITEAPI_PRICING_STATES
            .MATERIALIZED
          ? Number(
              currentCommissionPercent
                .toFixed(6)
            )
          : null,

      providerPriceMode:
        LITEAPI_PUBLIC_RATE_PRICE_MODE,

      suggestedSellingPriceDiagnostic:
        roundMoney(
          publicPriceFloor
        ),
    },
  };
}

function getSelectionSources(rate) {
  if (
    rate?.__liteApiSelectedNestedRate ===
      true
  ) {
    return [rate];
  }

  const nestedRates =
    getNestedRates(rate);

  return nestedRates.length > 0
    ? nestedRates
    : [rate];
}

function getLiteApiSelectionRoomCount(
  rate
) {
  if (!isPlainObject(rate)) {
    return 0;
  }

  return getSelectionSources(
    rate
  ).length;
}

function createSelectionDescriptor(
  source
) {
  const cancellationPolicy =
    source?.cancellationPolicies ??
    source?.cancellationPolicy ??
    null;

  const penalties =
    asArray(
      cancellationPolicy
        ?.cancelPolicyInfos ??
      cancellationPolicy
        ?.cancelPenalties ??
      cancellationPolicy
        ?.penalties
    );

  return {
    roomTypeId:
      pickFirstText(source, [
        ["mappedRoomId"],
        ["roomTypeId"],
        ["roomId"],
      ]),
    roomName:
      pickFirstText(source, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["name"],
      ]),
    board:
      pickFirstText(source, [
        ["boardType"],
        ["boardName"],
        ["boardDescription"],
        ["mealPlan"],
      ]),
    refundable:
      pickFirstText(source, [
        ["refundableTag"],
        ["cancellationPolicies", "refundableTag"],
        ["refundable"],
      ]),
    adults:
      pickFirstNumber(source, [
        ["adults"],
        ["adultCount"],
        ["occupancy", "adults"],
      ]),
    childCount:
      pickFirstNumber(source, [
        ["childCount"],
        ["occupancy", "childCount"],
      ]),
    occupancyNumber:
      pickFirstNumber(source, [
        ["occupancyNumber"],
      ]),
    maxOccupancy:
      pickFirstNumber(source, [
        ["maxOccupancy"],
      ]),
    children:
      asArray(
        source?.children ??
        source?.childAges ??
        source?.occupancy?.children
      ).map((child) =>
        asNumber(
          child?.age ??
          child
        )
      ).sort(
        (first, second) => {
          if (first === second) {
            return 0;
          }

          if (first === null) {
            return 1;
          }

          if (second === null) {
            return -1;
          }

          return first - second;
        }
      ),
    cancellationDeadlines:
      penalties
        .map((penalty) =>
          pickFirstText(
            penalty,
            [
              ["cancelTime"],
              ["cancellationTime"],
              ["from"],
              ["deadline"],
            ]
          )
        )
        .filter(Boolean)
        .sort(),
  };
}

function createLiteApiSelectionFingerprint(
  rate
) {
  if (!isPlainObject(rate)) {
    return null;
  }

  const fallbackRoomName =
    pickFirstText(rate, [
      ["roomName"],
      ["roomType"],
      ["roomTypeName"],
      ["name"],
    ]);

  const selectionDescriptors =
    getSelectionSources(rate)
      .map(
        createSelectionDescriptor
      )
      .map((descriptor) => ({
        ...descriptor,
        roomName:
          descriptor.roomName ||
          fallbackRoomName,
      }))
      .sort(
        (first, second) =>
          JSON.stringify(first)
            .localeCompare(
              JSON.stringify(second)
            )
      );

  const descriptor = {
    roomCount:
      selectionDescriptors.length,
    rates:
      selectionDescriptors,
  };

  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        descriptor
      )
    )
    .digest("hex")
    .slice(0, 32);
}

module.exports = {
  LITEAPI_COMMERCIAL_PRICING_SCHEMA_VERSION,
  LITEAPI_PRICING_STATES,
  LITEAPI_PUBLIC_PRICE_FLOOR_MODE,
  LITEAPI_PUBLIC_RATE_PRICE_MODE,
  PRICE_EPSILON,
  createLiteApiCommercialPricing,
  createLiteApiSelectionFingerprint,
  getLiteApiCommissionAmount,
  getLiteApiPublicPriceFloor,
  getLiteApiRetailSellingPrice,
  getLiteApiSelectionRoomCount,
};
