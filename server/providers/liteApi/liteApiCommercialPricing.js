const crypto =
  require("crypto");

const LITEAPI_PRICING_STATES =
  Object.freeze({
    MATERIALIZED:
      "materialized",
    MATERIALIZATION_REQUIRED:
      "materialization-required",
    UNVERIFIED:
      "unverified",
    UNMANAGED:
      "unmanaged",
  });

const PRICE_EPSILON =
  0.005;

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

function roundMarginUp(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return (
    Math.ceil(
      Math.max(0, value) *
      1_000_000 -
      0.0000001
    ) /
    1_000_000
  );
}

function getNestedRates(rate) {
  if (!isPlainObject(rate)) {
    return [];
  }

  return [
    rate.rates,
    rate.rate,
    rate.offers,
    rate.availableRates,
    rate.roomRates,
  ]
    .flatMap(asArray)
    .filter(isPlainObject);
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

function calculateRequiredLiteApiMargin({
  retailSellingPrice,
  commissionAmount = null,
  currentCommissionPercent,
  targetSellingPrice,
} = {}) {
  const retail =
    asNumber(
      retailSellingPrice
    );

  const target =
    asNumber(
      targetSellingPrice
    );

  const currentPercent =
    asNumber(
      currentCommissionPercent
    );

  if (
    retail === null ||
    retail <= 0 ||
    target === null ||
    target <= 0 ||
    currentPercent === null ||
    currentPercent <= 0
  ) {
    return null;
  }

  const normalizedCommission =
    asNumber(
      commissionAmount
    );

  if (
    normalizedCommission === null ||
    normalizedCommission <= 0 ||
    normalizedCommission >= retail
  ) {
    return null;
  }

  const commissionableBase =
    normalizedCommission /
    (currentPercent / 100);

  const currentNonCommissionAmount =
    retail -
    normalizedCommission;

  if (
    !Number.isFinite(
      commissionableBase
    ) ||
    commissionableBase <= 0 ||
    !Number.isFinite(
      currentNonCommissionAmount
    ) ||
    currentNonCommissionAmount < 0
  ) {
    return null;
  }

  const requiredPercent =
    (
      target -
      currentNonCommissionAmount
    ) /
    commissionableBase *
    100;

  if (
    !Number.isFinite(
      requiredPercent
    )
  ) {
    return null;
  }

  return roundMarginUp(
    Math.max(
      currentPercent,
      requiredPercent
    )
  );
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
    return {
      sellingPrice:
        publicPriceFloor ??
        retailSellingPrice,

      pricingControl: {
        schemaVersion:
          1,
        policy:
          null,
        state:
          LITEAPI_PRICING_STATES
            .UNMANAGED,
        targetSellingPrice:
          roundMoney(
            publicPriceFloor ??
            retailSellingPrice
          ),
        requiredSellerCommissionPercent:
          null,
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
    Math.max(
      retailSellingPrice ?? 0,
      publicPriceFloor ?? 0
    );

  const needsMaterialization =
    retailSellingPrice !== null &&
    publicPriceFloor !== null &&
    publicPriceFloor -
      retailSellingPrice >
      PRICE_EPSILON;

  const requiredSellerCommissionPercent =
    needsMaterialization
      ? calculateRequiredLiteApiMargin({
          retailSellingPrice,
          commissionAmount:
            commissionAmount,
          currentCommissionPercent,
          targetSellingPrice,
        })
      : currentCommissionPercent;

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
  else if (needsMaterialization) {
    state =
      requiredSellerCommissionPercent ===
        null
        ? LITEAPI_PRICING_STATES
            .UNVERIFIED
        : LITEAPI_PRICING_STATES
            .MATERIALIZATION_REQUIRED;
  }

  return {
    sellingPrice:
      roundMoney(
        targetSellingPrice
      ),

    pricingControl: {
      schemaVersion:
        1,

      policy: {
        schemaVersion:
          commercialPricingPolicy
            ?.schemaVersion ??
          1,
        minimumSellerCommissionPercent:
          minimumCommissionPercent,
        publicPriceFloorMode:
          "enforced",
      },

      state,

      targetSellingPrice:
        roundMoney(
          targetSellingPrice
        ),

      requiredSellerCommissionPercent:
        requiredSellerCommissionPercent ===
          null
          ? null
          : Number(
              requiredSellerCommissionPercent
                .toFixed(6)
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

  const descriptor = {
    roomName:
      pickFirstText(rate, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["name"],
      ]),
    roomCount:
      getSelectionSources(
        rate
      ).length,
    rates:
      getSelectionSources(rate)
        .map(
          createSelectionDescriptor
        ),
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

function isLiteApiPriceMaterialized({
  offer,
  minimumTargetSellingPrice,
} = {}) {
  const price =
    asNumber(
      offer?.price
    );

  const target =
    asNumber(
      minimumTargetSellingPrice
    );

  return (
    offer?.commercialPricing
      ?.state ===
      LITEAPI_PRICING_STATES
        .MATERIALIZED &&
    price !== null &&
    target !== null &&
    roundMoney(price) >=
      roundMoney(target)
  );
}

module.exports = {
  LITEAPI_PRICING_STATES,
  PRICE_EPSILON,
  calculateRequiredLiteApiMargin,
  createLiteApiCommercialPricing,
  createLiteApiSelectionFingerprint,
  getLiteApiCommissionAmount,
  getLiteApiPublicPriceFloor,
  getLiteApiRetailSellingPrice,
  isLiteApiPriceMaterialized,
};
