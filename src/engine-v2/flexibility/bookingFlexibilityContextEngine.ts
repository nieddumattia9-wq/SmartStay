import type {
  Hotel,
  HotelOffer,
} from "../../types/hotel";

export type SmartStayBookingLeadTimeBandV2 =
  | "same-day"
  | "last-minute"
  | "short-notice"
  | "standard"
  | "advance"
  | "unknown";

export type SmartStayRefundableMarketAvailabilityV2 =
  | "scarce"
  | "limited"
  | "mixed"
  | "common"
  | "unknown";

export type SmartStayFlexibilityCohortModeV2 =
  | "category-star-band"
  | "category"
  | "search-market";

export interface SmartStayBookingFlexibilityContextV2 {
  referenceAt:
    string | null;

  checkIn:
    string | null;

  leadTimeDays:
    number | null;

  leadTimeBand:
    SmartStayBookingLeadTimeBandV2;

  cohortMode:
    SmartStayFlexibilityCohortModeV2;

  cohortHotelCount:
    number;

  knownRefundabilityHotelCount:
    number;

  refundableAvailableHotelCount:
    number;

  nonRefundableOnlyHotelCount:
    number;

  unknownRefundabilityHotelCount:
    number;

  refundableAvailabilityShare:
    number | null;

  marketAvailability:
    SmartStayRefundableMarketAvailabilityV2;

  nonRefundablePenaltyMultiplier:
    number;

  flexibilityPremiumMultiplier:
    number;

  reasonCodes:
    string[];
}

export interface SmartStayBookingFlexibilityContextInputV2 {
  hotels:
    readonly Hotel[];

  checkIn?:
    string | null;

  referenceAt?:
    string | null;

  targetHotelId?:
    string | null;

  maximumDistanceKm?:
    number | null;
}

const DAY_MS =
  24 * 60 * 60 * 1000;

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}

function round(
  value:
    number,
  decimalPlaces =
    4
) {
  const factor =
    10 ** decimalPlaces;

  return Math.round(
    (
      value +
      Number.EPSILON
    ) * factor
  ) / factor;
}

function uniqueSorted(
  values:
    string[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort();
}

function normalizeIsoDate(
  value:
    unknown
) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return null;
  }

  const normalized =
    value.trim();

  const timestamp =
    Date.parse(
      normalized
    );

  return Number.isFinite(
    timestamp
  )
    ? normalized
    : null;
}

function getUtcDateStart(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function getLeadTimeDays(
  checkIn:
    string | null,
  referenceAt:
    string | null
) {
  if (
    checkIn === null ||
    referenceAt === null
  ) {
    return null;
  }

  const checkInStart =
    getUtcDateStart(
      checkIn
    );

  const referenceStart =
    getUtcDateStart(
      referenceAt
    );

  const difference =
    Math.ceil(
      (
        checkInStart -
        referenceStart
      ) / DAY_MS
    );

  return Number.isFinite(
    difference
  )
    ? Math.max(
        difference,
        0
      )
    : null;
}

function classifyLeadTime(
  leadTimeDays:
    number | null
): SmartStayBookingLeadTimeBandV2 {
  if (
    leadTimeDays ===
    null
  ) {
    return "unknown";
  }

  if (
    leadTimeDays ===
    0
  ) {
    return "same-day";
  }

  if (
    leadTimeDays <=
    7
  ) {
    return "last-minute";
  }

  if (
    leadTimeDays <=
    14
  ) {
    return "short-notice";
  }

  if (
    leadTimeDays <=
    30
  ) {
    return "standard";
  }

  return "advance";
}

function getLeadTimePenaltyMultiplier(
  band:
    SmartStayBookingLeadTimeBandV2
) {
  if (
    band ===
    "same-day"
  ) {
    return 0.15;
  }

  if (
    band ===
    "last-minute"
  ) {
    return 0.25;
  }

  if (
    band ===
    "short-notice"
  ) {
    return 0.5;
  }

  if (
    band ===
    "standard"
  ) {
    return 0.75;
  }

  return 1;
}

function normalizeCohortText(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        )
    : "";
}

function getDistanceEligibleHotels(
  hotels:
    readonly Hotel[],
  maximumDistanceKm:
    number |
    null |
    undefined
) {
  if (
    typeof maximumDistanceKm !==
      "number" ||
    !Number.isFinite(
      maximumDistanceKm
    ) ||
    maximumDistanceKm <
      0
  ) {
    return hotels;
  }

  return hotels.filter(
    (hotel) =>
      typeof hotel.distance ===
        "number" &&
      Number.isFinite(
        hotel.distance
      ) &&
      hotel.distance <=
        maximumDistanceKm
  );
}

function resolveCohort(
  hotels:
    readonly Hotel[],
  targetHotelId:
    string | null
): {
  hotels:
    readonly Hotel[];

  mode:
    SmartStayFlexibilityCohortModeV2;
} {
  const target =
    targetHotelId
      ? hotels.find(
          (hotel) =>
            hotel.id ===
            targetHotelId
        ) ??
        null
      : null;

  if (
    target ===
    null
  ) {
    return {
      hotels,
      mode:
        "search-market",
    };
  }

  const targetCategory =
    normalizeCohortText(
      target.accommodationCategory ??
      target.providerHotelTypeName
    );

  const sameCategory =
    targetCategory
      ? hotels.filter(
          (hotel) =>
            normalizeCohortText(
              hotel.accommodationCategory ??
              hotel.providerHotelTypeName
            ) ===
            targetCategory
        )
      : [];

  const categoryStarBand =
    sameCategory.filter(
      (hotel) =>
        target.stars >
          0 &&
        hotel.stars >
          0 &&
        Math.abs(
          hotel.stars -
          target.stars
        ) <=
          1
    );

  if (
    categoryStarBand.length >=
    3
  ) {
    return {
      hotels:
        categoryStarBand,
      mode:
        "category-star-band",
    };
  }

  if (
    sameCategory.length >=
    3
  ) {
    return {
      hotels:
        sameCategory,
      mode:
        "category",
    };
  }

  return {
    hotels,
    mode:
      "search-market",
  };
}

function getBookableOffers(
  hotel:
    Hotel
) {
  return (
    hotel.offers ??
    []
  ).filter(
    (
      offer
    ): offer is HotelOffer =>
      offer.bookable ===
      true
  );
}

function resolveCancellationDeadlineState(
  offer:
    HotelOffer,
  referenceAt:
    string |
    null
) {
  if (
    typeof offer.freeCancellationUntil !==
      "string" ||
    !offer.freeCancellationUntil.trim()
  ) {
    return "not-reported" as const;
  }

  const deadlineTimestamp =
    Date.parse(
      offer.freeCancellationUntil.trim()
    );

  if (
    !Number.isFinite(
      deadlineTimestamp
    )
  ) {
    return "not-reported" as const;
  }

  if (
    referenceAt ===
    null
  ) {
    return "active" as const;
  }

  const referenceTimestamp =
    Date.parse(
      referenceAt
    );

  if (
    !Number.isFinite(
      referenceTimestamp
    )
  ) {
    return "active" as const;
  }

  return deadlineTimestamp >
    referenceTimestamp
    ? "active" as const
    : "expired" as const;
}

function resolveHotelRefundability(
  hotel:
    Hotel,
  referenceAt:
    string |
    null
) {
  const offers =
    getBookableOffers(
      hotel
    );

  if (
    offers.some(
      (offer) =>
        offer.refundable ===
          true &&
        resolveCancellationDeadlineState(
          offer,
          referenceAt
        ) !==
          "expired"
    )
  ) {
    return "refundable-available" as const;
  }

  if (
    offers.some(
      (offer) =>
        offer.refundable ===
          false ||
        (
          offer.refundable ===
            true &&
          resolveCancellationDeadlineState(
            offer,
            referenceAt
          ) ===
            "expired"
        )
    )
  ) {
    return "non-refundable-only" as const;
  }

  return "unknown" as const;
}

function classifyMarketAvailability(
  knownHotelCount:
    number,
  refundableShare:
    number | null
): SmartStayRefundableMarketAvailabilityV2 {
  if (
    knownHotelCount <
      3 ||
    refundableShare ===
      null
  ) {
    return "unknown";
  }

  if (
    refundableShare <=
    0.15
  ) {
    return "scarce";
  }

  if (
    refundableShare <=
    0.35
  ) {
    return "limited";
  }

  if (
    refundableShare <=
    0.65
  ) {
    return "mixed";
  }

  return "common";
}

function getMarketPenaltyMultiplier(
  availability:
    SmartStayRefundableMarketAvailabilityV2
) {
  if (
    availability ===
    "scarce"
  ) {
    return 0.2;
  }

  if (
    availability ===
    "limited"
  ) {
    return 0.45;
  }

  if (
    availability ===
    "mixed"
  ) {
    return 0.75;
  }

  return 1;
}

export function evaluateBookingFlexibilityContextV2(
  input:
    SmartStayBookingFlexibilityContextInputV2
): SmartStayBookingFlexibilityContextV2 {
  const referenceAt =
    normalizeIsoDate(
      input.referenceAt
    );

  const checkIn =
    normalizeIsoDate(
      input.checkIn
    );

  const leadTimeDays =
    getLeadTimeDays(
      checkIn,
      referenceAt
    );

  const leadTimeBand =
    classifyLeadTime(
      leadTimeDays
    );

  const distanceEligibleHotels =
    getDistanceEligibleHotels(
      input.hotels,
      input.maximumDistanceKm
    );

  const cohort =
    resolveCohort(
      distanceEligibleHotels,
      typeof input.targetHotelId ===
        "string" &&
      input.targetHotelId.trim()
        ? input.targetHotelId.trim()
        : null
    );

  const states =
    cohort.hotels.map(
      (hotel) =>
        resolveHotelRefundability(
          hotel,
          referenceAt
        )
    );

  const refundableAvailableHotelCount =
    states.filter(
      (state) =>
        state ===
        "refundable-available"
    ).length;

  const nonRefundableOnlyHotelCount =
    states.filter(
      (state) =>
        state ===
        "non-refundable-only"
    ).length;

  const unknownRefundabilityHotelCount =
    states.filter(
      (state) =>
        state ===
        "unknown"
    ).length;

  const knownRefundabilityHotelCount =
    refundableAvailableHotelCount +
    nonRefundableOnlyHotelCount;

  const refundableAvailabilityShare =
    knownRefundabilityHotelCount >
    0
      ? round(
          refundableAvailableHotelCount /
            knownRefundabilityHotelCount
        )
      : null;

  const marketAvailability =
    classifyMarketAvailability(
      knownRefundabilityHotelCount,
      refundableAvailabilityShare
    );

  const leadTimeMultiplier =
    getLeadTimePenaltyMultiplier(
      leadTimeBand
    );

  const marketMultiplier =
    getMarketPenaltyMultiplier(
      marketAvailability
    );

  const nonRefundablePenaltyMultiplier =
    round(
      clamp(
        Math.min(
          leadTimeMultiplier,
          marketMultiplier
        ),
        0.15,
        1
      )
    );

  const flexibilityPremiumMultiplier =
    round(
      clamp(
        nonRefundablePenaltyMultiplier,
        0.35,
        1
      )
    );

  const reasonCodes:
    string[] = [
      `flexibility-cohort:${cohort.mode}`,
      `flexibility-lead-time:${leadTimeBand}`,
      `flexibility-market-availability:${marketAvailability}`,
  ];

  if (
    nonRefundablePenaltyMultiplier <
    1
  ) {
    reasonCodes.push(
      "flexibility-non-refundable-penalty-contextualized"
    );
  }

  if (
    leadTimeBand ===
      "same-day" ||
    leadTimeBand ===
      "last-minute"
  ) {
    reasonCodes.push(
      "flexibility-close-in-booking"
    );
  }

  if (
    marketAvailability ===
      "scarce" ||
    marketAvailability ===
      "limited"
  ) {
    reasonCodes.push(
      "flexibility-refundable-options-limited"
    );
  }

  return {
    referenceAt,
    checkIn,
    leadTimeDays,
    leadTimeBand,
    cohortMode:
      cohort.mode,
    cohortHotelCount:
      cohort.hotels.length,
    knownRefundabilityHotelCount,
    refundableAvailableHotelCount,
    nonRefundableOnlyHotelCount,
    unknownRefundabilityHotelCount,
    refundableAvailabilityShare,
    marketAvailability,
    nonRefundablePenaltyMultiplier,
    flexibilityPremiumMultiplier,
    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),
  };
}
