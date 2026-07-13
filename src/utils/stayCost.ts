import type {
  Hotel,
  HotelOffer,
} from "../types/hotel";

export type StayCostCompleteness =
  | "reported-complete"
  | "partial"
  | "unknown";

export type ComparableStayCost = {
  amount: number;
  currency: string;
  completeness: StayCostCompleteness;
  taxesIncluded: boolean | null;
  excludedTaxes: number;
  unknownTaxes: number;
};

function isPositiveNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function getNonNegativeNumber(
  value: unknown
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  )
    ? value
    : 0;
}

function normalizeCurrency(
  value: unknown,
  fallback = "EUR"
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return fallback;
  }

  return value
    .trim()
    .toUpperCase();
}

function getCompleteness(
  taxesIncluded:
    boolean |
    null |
    undefined,
  excludedTaxesInput: unknown,
  unknownTaxesInput: unknown
): StayCostCompleteness {
  const excludedTaxes =
    getNonNegativeNumber(
      excludedTaxesInput
    );

  const unknownTaxes =
    getNonNegativeNumber(
      unknownTaxesInput
    );

  if (unknownTaxes > 0) {
    return "partial";
  }

  if (taxesIncluded === true) {
    return "reported-complete";
  }

  if (
    taxesIncluded === false &&
    excludedTaxes > 0
  ) {
    return "reported-complete";
  }

  if (
    taxesIncluded === false ||
    excludedTaxes > 0
  ) {
    return "partial";
  }

  return "unknown";
}

export function getComparableOfferAmount(
  offer: HotelOffer
): number | null {
  if (
    isPositiveNumber(
      offer.totalKnownCost
    )
  ) {
    return offer.totalKnownCost;
  }

  if (
    isPositiveNumber(
      offer.price
    )
  ) {
    return offer.price;
  }

  return null;
}

function createOfferCandidate(
  offer: HotelOffer,
  fallbackCurrency: string
): ComparableStayCost | null {
  const amount =
    getComparableOfferAmount(
      offer
    );

  if (amount === null) {
    return null;
  }

  return {
    amount,

    currency:
      normalizeCurrency(
        offer.currency,
        fallbackCurrency
      ),

    completeness:
      getCompleteness(
        offer.taxesIncluded,
        offer.excludedTaxes,
        offer.unknownTaxes
      ),

    taxesIncluded:
      offer.taxesIncluded ?? null,

    excludedTaxes:
      getNonNegativeNumber(
        offer.excludedTaxes
      ),

    unknownTaxes:
      getNonNegativeNumber(
        offer.unknownTaxes
      ),
  };
}

function createHotelFallback(
  hotel: Hotel
): ComparableStayCost | null {
  const amount =
    isPositiveNumber(
      hotel.totalKnownCost
    )
      ? hotel.totalKnownCost
      : isPositiveNumber(
          hotel.price
        )
        ? hotel.price
        : null;

  if (amount === null) {
    return null;
  }

  return {
    amount,

    currency:
      normalizeCurrency(
        hotel.currency
      ),

    completeness:
      getCompleteness(
        hotel.taxesIncluded,
        hotel.excludedTaxes,
        hotel.unknownTaxes
      ),

    taxesIncluded:
      hotel.taxesIncluded ?? null,

    excludedTaxes:
      getNonNegativeNumber(
        hotel.excludedTaxes
      ),

    unknownTaxes:
      getNonNegativeNumber(
        hotel.unknownTaxes
      ),
  };
}

export function getBestComparableStayCost(
  hotel: Hotel
): ComparableStayCost | null {
  const preferredCurrency =
    normalizeCurrency(
      hotel.currency
    );

  const candidates =
    (hotel.offers ?? [])
      .map((offer) =>
        createOfferCandidate(
          offer,
          preferredCurrency
        )
      )
      .filter(
        (
          candidate
        ): candidate is ComparableStayCost =>
          candidate !== null
      );

  if (candidates.length === 0) {
    return createHotelFallback(
      hotel
    );
  }

  const matchingCurrency =
    candidates.filter(
      (candidate) =>
        candidate.currency ===
        preferredCurrency
    );

  const comparableCandidates =
    matchingCurrency.length > 0
      ? matchingCurrency
      : candidates;

  return [...comparableCandidates]
    .sort(
      (
        firstCandidate,
        secondCandidate
      ) =>
        firstCandidate.amount -
        secondCandidate.amount
    )[0];
}
