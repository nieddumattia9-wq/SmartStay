const COMMERCIAL_PRICING_POLICY_VERSION =
  1;

const DEFAULT_MINIMUM_SELLER_COMMISSION_PERCENT =
  8;

const MINIMUM_SELLER_COMMISSION_PERCENT =
  0.01;

const MAXIMUM_SELLER_COMMISSION_PERCENT =
  100;

function normalizeCommissionPercent(
  value,
  fallbackValue =
    DEFAULT_MINIMUM_SELLER_COMMISSION_PERCENT
) {
  const selectedValue =
    value === null ||
    value === undefined ||
    value === ""
      ? fallbackValue
      : value;

  const normalizedText =
    typeof selectedValue === "string"
      ? selectedValue
          .trim()
          .replace(",", ".")
      : selectedValue;

  const parsedValue =
    Number(normalizedText);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <
      MINIMUM_SELLER_COMMISSION_PERCENT ||
    parsedValue >
      MAXIMUM_SELLER_COMMISSION_PERCENT
  ) {
    const error =
      new Error(
        "SMARTSTAY_MINIMUM_COMMISSION_PERCENT must be a number between 0.01 and 100."
      );

    error.code =
      "INVALID_COMMERCIAL_PRICING_CONFIG";

    throw error;
  }

  return Number(
    parsedValue.toFixed(4)
  );
}

function createCommercialPricingPolicy({
  minimumSellerCommissionPercent =
    DEFAULT_MINIMUM_SELLER_COMMISSION_PERCENT,
} = {}) {
  return Object.freeze({
    schemaVersion:
      COMMERCIAL_PRICING_POLICY_VERSION,

    minimumSellerCommissionPercent:
      normalizeCommissionPercent(
        minimumSellerCommissionPercent
      ),

    publicPriceFloorMode:
      "enforced",
  });
}

function getCommercialPricingPolicy({
  environment = process.env,
} = {}) {
  return createCommercialPricingPolicy({
    minimumSellerCommissionPercent:
      environment
        ?.SMARTSTAY_MINIMUM_COMMISSION_PERCENT ??
      DEFAULT_MINIMUM_SELLER_COMMISSION_PERCENT,
  });
}

module.exports = {
  COMMERCIAL_PRICING_POLICY_VERSION,
  DEFAULT_MINIMUM_SELLER_COMMISSION_PERCENT,
  MINIMUM_SELLER_COMMISSION_PERCENT,
  MAXIMUM_SELLER_COMMISSION_PERCENT,
  normalizeCommissionPercent,
  createCommercialPricingPolicy,
  getCommercialPricingPolicy,
};
