import type {
  HotelReviewCountRelation,
} from "../types/hotel";

function getRelation(
  relation:
    HotelReviewCountRelation |
    undefined
): HotelReviewCountRelation {
  return relation ??
    "equal";
}

function formatCount(
  reviewCount:
    number
) {
  return reviewCount.toLocaleString(
    "en-US"
  );
}

function getReviewWord(
  reviewCount:
    number
) {
  return reviewCount === 1
    ? "review"
    : "reviews";
}

export function formatReviewCountLabel(
  reviewCount:
    number |
    null,
  relation?:
    HotelReviewCountRelation
) {
  if (
    reviewCount === null ||
    reviewCount <= 0
  ) {
    return "Review count unavailable";
  }

  const formattedCount =
    formatCount(
      reviewCount
    );

  const reviewWord =
    getReviewWord(
      reviewCount
    );

  const normalizedRelation =
    getRelation(
      relation
    );

  if (
    normalizedRelation ===
      "at-least"
  ) {
    return `${formattedCount}+ ${reviewWord}`;
  }

  if (
    normalizedRelation ===
      "estimated"
  ) {
    return `About ${formattedCount} ${reviewWord}`;
  }

  if (
    normalizedRelation ===
      "unknown"
  ) {
    return `${formattedCount} reported ${reviewWord}`;
  }

  return `${formattedCount} ${reviewWord}`;
}

export function formatReviewCountEvidencePhrase(
  reviewCount:
    number,
  relation?:
    HotelReviewCountRelation
) {
  const formattedCount =
    formatCount(
      reviewCount
    );

  const reviewWord =
    getReviewWord(
      reviewCount
    );

  const normalizedRelation =
    getRelation(
      relation
    );

  if (
    normalizedRelation ===
      "at-least"
  ) {
    return (
      " across at least " +
      formattedCount +
      " " +
      reviewWord
    );
  }

  if (
    normalizedRelation ===
      "estimated"
  ) {
    return (
      " across about " +
      formattedCount +
      " " +
      reviewWord
    );
  }

  if (
    normalizedRelation ===
      "unknown"
  ) {
    return (
      " with " +
      formattedCount +
      " " +
      reviewWord +
      " reported by the provider"
    );
  }

  return (
    " across " +
    formattedCount +
    " " +
    reviewWord
  );
}
