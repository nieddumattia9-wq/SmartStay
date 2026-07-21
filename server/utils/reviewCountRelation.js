const VALID_REVIEW_COUNT_RELATIONS =
  new Set([
    "equal",
    "at-least",
    "estimated",
    "unknown",
  ]);

const LITEAPI_REVIEW_COUNT_CAP =
  20000;

function normalizeReviewCountRelation(
  value
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[_\s]+/g,
        "-"
      );

  return VALID_REVIEW_COUNT_RELATIONS.has(
    normalized
  )
    ? normalized
    : null;
}

function normalizeProviderName(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function isLiteApiProvider(
  ...values
) {
  return values.some(
    (value) =>
      normalizeProviderName(
        value
      ).includes(
        "liteapi"
      )
  );
}

function normalizeReviewCount(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return (
    Number.isFinite(number) &&
    number >= 0
  )
    ? number
    : null;
}

function inferReviewCountRelation({
  reviewCount,
  reviewCountRelation,
  sourceProvider,
  provider,
} = {}) {
  const explicitRelation =
    normalizeReviewCountRelation(
      reviewCountRelation
    );

  if (explicitRelation) {
    return explicitRelation;
  }

  const normalizedCount =
    normalizeReviewCount(
      reviewCount
    );

  if (normalizedCount === null) {
    return "unknown";
  }

  if (
    isLiteApiProvider(
      sourceProvider,
      provider
    )
  ) {
    return normalizedCount ===
      LITEAPI_REVIEW_COUNT_CAP
        ? "at-least"
        : "equal";
  }

  return "unknown";
}

function combineReviewCountRelations(
  firstRelation,
  secondRelation
) {
  const first =
    normalizeReviewCountRelation(
      firstRelation
    ) ??
    "unknown";

  const second =
    normalizeReviewCountRelation(
      secondRelation
    ) ??
    "unknown";

  if (first === second) {
    return first;
  }

  if (
    first === "unknown" ||
    second === "unknown"
  ) {
    return "unknown";
  }

  if (
    first === "estimated" ||
    second === "estimated"
  ) {
    return "estimated";
  }

  if (
    first === "at-least" ||
    second === "at-least"
  ) {
    return "at-least";
  }

  return "equal";
}

module.exports = {
  LITEAPI_REVIEW_COUNT_CAP,
  VALID_REVIEW_COUNT_RELATIONS,
  combineReviewCountRelations,
  inferReviewCountRelation,
  normalizeReviewCountRelation,
};
