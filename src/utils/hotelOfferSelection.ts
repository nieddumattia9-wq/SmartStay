import type {
  Hotel,
  HotelOffer,
} from "../types/hotel";

export type HotelOfferCompleteness =
  | "reported-complete"
  | "partial"
  | "unknown";

export type ComparableHotelOffer = {
  offer: HotelOffer;
  amount: number;
  currency: string;
  completeness: HotelOfferCompleteness;
  originalIndex: number;
};

export type HotelOfferSelection = {
  primary: ComparableHotelOffer | null;
  offers: ComparableHotelOffer[];
  alternativeCount: number;
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
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  const currency =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(currency)
    ? currency
    : "";
}

function normalizeText(
  value: unknown
) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
    : "";
}

function hasPublicOfferId(
  offer: HotelOffer
) {
  return /^offer-[1-9][0-9]*$/.test(
    offer.id.trim()
  );
}

function getOfferAmount(
  offer: HotelOffer
) {
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

function getOfferCompleteness(
  offer: HotelOffer
): HotelOfferCompleteness {
  const excludedTaxes =
    getNonNegativeNumber(
      offer.excludedTaxes
    );

  const unknownTaxes =
    getNonNegativeNumber(
      offer.unknownTaxes
    );

  if (unknownTaxes > 0) {
    return "partial";
  }

  if (
    offer.taxesIncluded === true
  ) {
    return "reported-complete";
  }

  if (
    offer.taxesIncluded === false &&
    excludedTaxes > 0
  ) {
    return "reported-complete";
  }

  if (
    offer.taxesIncluded === false ||
    excludedTaxes > 0
  ) {
    return "partial";
  }

  return "unknown";
}

function createCandidate(
  offer: HotelOffer,
  originalIndex: number
): ComparableHotelOffer | null {
  if (
    !hasPublicOfferId(offer)
  ) {
    return null;
  }

  const amount =
    getOfferAmount(offer);

  const currency =
    normalizeCurrency(
      offer.currency
    );

  if (
    amount === null ||
    !currency
  ) {
    return null;
  }

  return {
    offer,
    amount,
    currency,

    completeness:
      getOfferCompleteness(
        offer
      ),

    originalIndex,
  };
}

function getCompletenessPriority(
  completeness:
    HotelOfferCompleteness
) {
  if (
    completeness ===
    "reported-complete"
  ) {
    return 0;
  }

  if (
    completeness === "partial"
  ) {
    return 1;
  }

  return 2;
}

function createFingerprint(
  candidate:
    ComparableHotelOffer
) {
  return [
    normalizeText(
      candidate.offer.provider
    ),

    normalizeText(
      candidate.offer.roomName
    ),

    candidate.amount.toFixed(2),

    candidate.currency,

    normalizeText(
      candidate.offer
        .cancellationPolicy
    ),

    String(
      candidate.offer
        .refundable ?? ""
    ),

    normalizeText(
      candidate.offer
        .freeCancellationUntil
    ),

    String(
      candidate.offer
        .cancellationPenalty ?? ""
    ),

    normalizeText(
      candidate.offer
        .cancellationPenaltyCurrency
    ),

    normalizeText(
      candidate.offer
        .cancellationPenaltyType
    ),

    String(
      candidate.offer
        .taxesIncluded ?? ""
    ),
  ].join("|");
}

function removeDuplicates(
  offers:
    ComparableHotelOffer[]
) {
  const uniqueOffers =
    new Map<
      string,
      ComparableHotelOffer
    >();

  for (const offer of offers) {
    const fingerprint =
      createFingerprint(offer);

    if (
      !uniqueOffers.has(
        fingerprint
      )
    ) {
      uniqueOffers.set(
        fingerprint,
        offer
      );
    }
  }

  return Array.from(
    uniqueOffers.values()
  );
}

function compareOffers(
  firstOffer:
    ComparableHotelOffer,
  secondOffer:
    ComparableHotelOffer
) {
  const firstBookable =
    firstOffer.offer.bookable ===
    true;

  const secondBookable =
    secondOffer.offer.bookable ===
    true;

  if (
    firstBookable !==
    secondBookable
  ) {
    return firstBookable
      ? -1
      : 1;
  }

  if (
    firstOffer.amount !==
    secondOffer.amount
  ) {
    return (
      firstOffer.amount -
      secondOffer.amount
    );
  }

  const completenessDifference =
    getCompletenessPriority(
      firstOffer.completeness
    ) -
    getCompletenessPriority(
      secondOffer.completeness
    );

  if (
    completenessDifference !== 0
  ) {
    return completenessDifference;
  }

  const firstHasPolicy =
    Boolean(
      firstOffer.offer
        .cancellationPolicy
    );

  const secondHasPolicy =
    Boolean(
      secondOffer.offer
        .cancellationPolicy
    );

  if (
    firstHasPolicy !==
    secondHasPolicy
  ) {
    return firstHasPolicy
      ? -1
      : 1;
  }

  return (
    firstOffer.originalIndex -
    secondOffer.originalIndex
  );
}

export function selectHotelOffers(
  hotel: Hotel
): HotelOfferSelection {
  const validOffers =
    (hotel.offers ?? [])
      .map(
        (
          offer,
          originalIndex
        ) =>
          createCandidate(
            offer,
            originalIndex
          )
      )
      .filter(
        (
          offer
        ): offer is ComparableHotelOffer =>
          offer !== null
      );

  const preferredCurrency =
    normalizeCurrency(
      hotel.currency
    );

  const preferredOffers =
    preferredCurrency
      ? validOffers.filter(
          (offer) =>
            offer.currency ===
            preferredCurrency
        )
      : [];

  const comparisonCurrency =
    preferredOffers[0]
      ?.currency ??
    validOffers[0]
      ?.currency ??
    "";

  const sameCurrencyOffers =
    validOffers.filter(
      (offer) =>
        offer.currency ===
        comparisonCurrency
    );

  const offers =
    removeDuplicates(
      sameCurrencyOffers
    ).sort(compareOffers);

  return {
    primary:
      offers[0] ?? null,

    offers,

    alternativeCount:
      Math.max(
        offers.length - 1,
        0
      ),
  };
}
