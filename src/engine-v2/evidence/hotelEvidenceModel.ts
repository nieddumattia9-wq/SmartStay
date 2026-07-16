import type {
  Hotel,
} from "../../types/hotel";

import {
  getBestComparableStayCost,
} from "../../utils/stayCost";

import {
  getAccommodationCategoryFeaturePolicyV2,
} from "../categories/accommodationCategoryModel";

import type {
  SmartStayAccommodationFeatureCodeV2,
} from "../categories/accommodationCategoryModel";

import type {
  SmartStayAccommodationProfileV2,
  SmartStayEvidenceFactV2,
} from "../model/smartStayEvaluationV2";

import {
  createConflictingEvidenceFactV2,
  createEvidenceAvailabilityIndexV2,
  createKnownEvidenceFactV2,
  createNotApplicableEvidenceFactV2,
  createUnknownEvidenceFactV2,
  deduplicateEvidenceFactsV2,
} from "./evidenceFactFactory";

export interface SmartStayHotelEvidenceInputV2 {
  hotel:
    Hotel;

  accommodation:
    SmartStayAccommodationProfileV2;

  categoryEvidence?:
    SmartStayEvidenceFactV2[];

  capturedAt?:
    string | null;
}

export interface SmartStayHotelEvidenceResultV2 {
  facts:
    SmartStayEvidenceFactV2[];

  knownFieldCodes:
    string[];

  unknownFieldCodes:
    string[];

  notApplicableFieldCodes:
    string[];

  conflictingFieldCodes:
    string[];
}

const FEATURE_CODES:
  readonly SmartStayAccommodationFeatureCodeV2[] = [
    "air-conditioning",
    "breakfast",
    "daily-cleaning",
    "elevator",
    "entire-place",
    "hotel-room",
    "kitchen",
    "multiple-bedrooms",
    "parking",
    "private-bathroom",
    "private-room",
    "reception",
    "self-check-in",
    "shared-room",
    "washing-machine",
    "wifi",
    "workspace",
  ];

const FEATURE_ALIASES:
  Partial<
    Record<
      SmartStayAccommodationFeatureCodeV2,
      readonly string[]
    >
  > = {
    "air-conditioning": [
      "air conditioning",
      "air conditioned",
      "air conditioner",
      "aria condizionata",
    ],

    breakfast: [
      "breakfast",
      "continental breakfast",
      "buffet breakfast",
      "colazione",
    ],

    "daily-cleaning": [
      "daily cleaning",
      "daily housekeeping",
      "housekeeping daily",
      "pulizia giornaliera",
    ],

    elevator: [
      "elevator",
      "lift",
      "ascensore",
    ],

    "entire-place": [
      "entire place",
      "entire apartment",
      "entire home",
      "whole apartment",
      "whole house",
      "intero appartamento",
      "intera casa",
      "alloggio intero",
    ],

    "hotel-room": [
      "hotel room",
      "camera hotel",
    ],

    kitchen: [
      "kitchen",
      "kitchenette",
      "cooking facilities",
      "cucina",
      "angolo cottura",
    ],

    "multiple-bedrooms": [
      "multiple bedrooms",
      "two bedrooms",
      "three bedrooms",
      "2 bedrooms",
      "3 bedrooms",
      "due camere",
      "tre camere",
    ],

    parking: [
      "parking",
      "car park",
      "garage",
      "parcheggio",
    ],

    "private-bathroom": [
      "private bathroom",
      "ensuite bathroom",
      "en suite bathroom",
      "bagno privato",
    ],

    "private-room": [
      "private room",
      "camera privata",
    ],

    reception: [
      "reception",
      "front desk",
      "reception desk",
      "24 hour desk",
      "24-hour desk",
    ],

    "self-check-in": [
      "self check in",
      "self-check-in",
      "contactless check in",
      "key box",
      "keybox",
      "check in autonomo",
    ],

    "shared-room": [
      "shared room",
      "shared dormitory",
      "dormitory",
      "dorm room",
      "camera condivisa",
      "posto letto",
    ],

    "washing-machine": [
      "washing machine",
      "washer",
      "laundry machine",
      "lavatrice",
    ],

    wifi: [
      "wifi",
      "wi fi",
      "wireless internet",
      "internet access",
    ],

    workspace: [
      "workspace",
      "work desk",
      "business desk",
      "scrivania",
      "spazio di lavoro",
    ],
  };

function normalizeText(
  value:
    unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /&/g,
      " and "
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

function normalizeProvider(
  value:
    unknown
) {
  return (
    normalizeText(
      value
    ) ||
    null
  );
}

function normalizeCurrency(
  value:
    unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalized
  )
    ? normalized
    : null;
}

function isFiniteNumber(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(
      value
    )
  );
}

function isPositiveNumber(
  value:
    unknown
): value is number {
  return (
    isFiniteNumber(
      value
    ) &&
    value > 0
  );
}

function isNonNegativeNumber(
  value:
    unknown
): value is number {
  return (
    isFiniteNumber(
      value
    ) &&
    value >= 0
  );
}

function hasText(
  value:
    unknown
): value is string {
  return (
    typeof value === "string" &&
    Boolean(
      value.trim()
    )
  );
}

function createEvidenceId(
  hotel:
    Hotel,
  suffix:
    string
) {
  const normalizedHotelId =
    normalizeText(
      hotel.id
    )
      .replace(
        /\s+/g,
        "-"
      ) ||
    "unknown-hotel";

  return (
    `${normalizedHotelId}:${suffix}`
  );
}

function containsPhrase(
  text:
    string,
  phrase:
    string
) {
  const normalizedText =
    normalizeText(
      text
    );

  const normalizedPhrase =
    normalizeText(
      phrase
    );

  if (
    !normalizedText ||
    !normalizedPhrase
  ) {
    return false;
  }

  return (
    ` ${normalizedText} `
  ).includes(
    ` ${normalizedPhrase} `
  );
}

function createKnownTextFact(
  hotel:
    Hotel,
  input: {
    code:
      string;

    value:
      unknown;

    sourceField:
      string;

    missingReasonCode:
      string;

    provider:
      string | null;

    capturedAt:
      string | null;
  }
) {
  const id =
    createEvidenceId(
      hotel,
      input.code.replace(
        /\./g,
        "-"
      )
    );

  if (
    !hasText(
      input.value
    )
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        input.code,

      sourceProvider:
        input.provider,

      sourceField:
        input.sourceField,

      missingReasonCode:
        input.missingReasonCode,

      capturedAt:
        input.capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      input.code,

    value:
      input.value.trim(),

    source:
      "provider",

    sourceProvider:
      input.provider,

    sourceField:
      input.sourceField,

    confidence:
      0.9,

    capturedAt:
      input.capturedAt,
  });
}

function createCurrencyFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const currencies =
    new Set<string>();

  const hotelCurrency =
    normalizeCurrency(
      hotel.currency
    );

  if (hotelCurrency) {
    currencies.add(
      hotelCurrency
    );
  }

  for (
    const offer
    of hotel.offers ?? []
  ) {
    const offerCurrency =
      normalizeCurrency(
        offer.currency
      );

    if (offerCurrency) {
      currencies.add(
        offerCurrency
      );
    }
  }

  const values =
    [
      ...currencies,
    ].sort();

  const id =
    createEvidenceId(
      hotel,
      "stay-currency"
    );

  if (
    values.length === 0
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        "stay.currency",

      sourceProvider:
        provider,

      sourceField:
        "currency|offers.currency",

      missingReasonCode:
        "currency-unavailable",

      severity:
        "blocking",

      capturedAt,
    });
  }

  if (
    values.length > 1
  ) {
    return createConflictingEvidenceFactV2({
      id,

      code:
        "stay.currency",

      value:
        values.join(
          ","
        ),

      sourceProvider:
        provider,

      sourceField:
        "currency|offers.currency",

      missingReasonCode:
        "multiple-currencies-detected",

      severity:
        "blocking",

      capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      "stay.currency",

    value:
      values[0],

    source:
      "provider",

    sourceProvider:
      provider,

    sourceField:
      "currency|offers.currency",

    confidence:
      0.98,

    capturedAt,
  });
}

function createCostFacts(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const cost =
    getBestComparableStayCost(
      hotel
    );

  if (
    !cost ||
    !isPositiveNumber(
      cost.amount
    )
  ) {
    return [
      createUnknownEvidenceFactV2({
        id:
          createEvidenceId(
            hotel,
            "stay-cost-total"
          ),

        code:
          "stay.cost.total",

        sourceProvider:
          provider,

        sourceField:
          "totalKnownCost|price|offers",

        missingReasonCode:
          "comparable-stay-cost-unavailable",

        severity:
          "blocking",

        capturedAt,
      }),

      createUnknownEvidenceFactV2({
        id:
          createEvidenceId(
            hotel,
            "stay-cost-completeness"
          ),

        code:
          "stay.cost.completeness",

        source:
          "derived",

        sourceProvider:
          provider,

        sourceField:
          "taxes|totalKnownCost|offers",

        missingReasonCode:
          "cost-completeness-unavailable",

        capturedAt,
      }),
    ];
  }

  const confidence =
    cost.completeness ===
      "reported-complete"
      ? 0.98
      : cost.completeness ===
          "partial"
        ? 0.72
        : 0.5;

  const severity:
    "information" | "warning" =
    cost.completeness ===
      "reported-complete"
      ? "information"
      : "warning";

  return [
    createKnownEvidenceFactV2({
      id:
        createEvidenceId(
          hotel,
          "stay-cost-total"
        ),

      code:
        "stay.cost.total",

      value:
        cost.amount,

      unit:
        normalizeCurrency(
          cost.currency
        ),

      source:
        "derived",

      sourceProvider:
        provider,

      sourceField:
        "totalKnownCost|price|offers",

      confidence,

      severity,

      capturedAt,
    }),

    createKnownEvidenceFactV2({
      id:
        createEvidenceId(
          hotel,
          "stay-cost-completeness"
        ),

      code:
        "stay.cost.completeness",

      value:
        cost.completeness,

      source:
        "derived",

      sourceProvider:
        provider,

      sourceField:
        "taxes|totalKnownCost|offers",

      confidence,

      severity,

      capturedAt,
    }),
  ];
}

function createReviewScoreFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const id =
    createEvidenceId(
      hotel,
      "review-score"
    );

  if (
    hotel.reviewScore === null ||
    hotel.reviewScore === undefined
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        "review.score",

      sourceProvider:
        provider,

      sourceField:
        "reviewScore",

      missingReasonCode:
        "review-score-unavailable",

      capturedAt,
    });
  }

  if (
    !isFiniteNumber(
      hotel.reviewScore
    ) ||
    hotel.reviewScore < 0 ||
    hotel.reviewScore > 10
  ) {
    return createConflictingEvidenceFactV2({
      id,

      code:
        "review.score",

      value:
        isFiniteNumber(
          hotel.reviewScore
        )
          ? hotel.reviewScore
          : null,

      unit:
        "0-10",

      sourceProvider:
        provider,

      sourceField:
        "reviewScore",

      missingReasonCode:
        "review-score-invalid",

      capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      "review.score",

    value:
      hotel.reviewScore,

    unit:
      "0-10",

    source:
      "provider",

    sourceProvider:
      provider,

    sourceField:
      "reviewScore",

    confidence:
      0.95,

    capturedAt,
  });
}

function createReviewCountFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const id =
    createEvidenceId(
      hotel,
      "review-count"
    );

  if (
    hotel.reviewCount === null ||
    hotel.reviewCount === undefined
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        "review.count",

      sourceProvider:
        provider,

      sourceField:
        "reviewCount",

      missingReasonCode:
        "review-count-unavailable",

      capturedAt,
    });
  }

  if (
    !isNonNegativeNumber(
      hotel.reviewCount
    )
  ) {
    return createConflictingEvidenceFactV2({
      id,

      code:
        "review.count",

      value:
        isFiniteNumber(
          hotel.reviewCount
        )
          ? hotel.reviewCount
          : null,

      unit:
        "reviews",

      sourceProvider:
        provider,

      sourceField:
        "reviewCount",

      missingReasonCode:
        "review-count-invalid",

      capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      "review.count",

    value:
      hotel.reviewCount,

    unit:
      "reviews",

    source:
      "provider",

    sourceProvider:
      provider,

    sourceField:
      "reviewCount",

    confidence:
      0.95,

    capturedAt,
  });
}

function createDistanceFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const id =
    createEvidenceId(
      hotel,
      "location-distance"
    );

  if (
    hotel.distance === null ||
    hotel.distance === undefined
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        "location.distance",

      sourceProvider:
        provider,

      sourceField:
        "distance",

      missingReasonCode:
        "distance-unavailable",

      capturedAt,
    });
  }

  if (
    !isNonNegativeNumber(
      hotel.distance
    )
  ) {
    return createConflictingEvidenceFactV2({
      id,

      code:
        "location.distance",

      value:
        isFiniteNumber(
          hotel.distance
        )
          ? hotel.distance
          : null,

      unit:
        "km",

      sourceProvider:
        provider,

      sourceField:
        "distance",

      missingReasonCode:
        "distance-invalid",

      capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      "location.distance",

    value:
      hotel.distance,

    unit:
      "km",

    source:
      "provider",

    sourceProvider:
      provider,

    sourceField:
      "distance",

    confidence:
      0.94,

    capturedAt,
  });
}

function createCoordinatesFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const id =
    createEvidenceId(
      hotel,
      "location-coordinates"
    );

  const latitude =
    hotel.latitude;

  const longitude =
    hotel.longitude;

  const hasLatitude =
    isFiniteNumber(
      latitude
    );

  const hasLongitude =
    isFiniteNumber(
      longitude
    );

  if (
    hasLatitude &&
    hasLongitude
  ) {
    const coordinatesValid =
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    if (!coordinatesValid) {
      return createConflictingEvidenceFactV2({
        id,

        code:
          "location.coordinates",

        value:
          `${hotel.latitude},${hotel.longitude}`,

        unit:
          "latitude,longitude",

        sourceProvider:
          provider,

        sourceField:
          "latitude|longitude",

        missingReasonCode:
          "coordinates-out-of-range",

        capturedAt,
      });
    }

    return createKnownEvidenceFactV2({
      id,

      code:
        "location.coordinates",

      value:
        `${hotel.latitude},${hotel.longitude}`,

      unit:
        "latitude,longitude",

      source:
        "provider",

      sourceProvider:
        provider,

      sourceField:
        "latitude|longitude",

      confidence:
        0.94,

      capturedAt,
    });
  }

  return createUnknownEvidenceFactV2({
    id,

    code:
      "location.coordinates",

    value:
      hasLatitude
        ? String(
            hotel.latitude
          )
        : hasLongitude
          ? String(
              hotel.longitude
            )
          : null,

    sourceProvider:
      provider,

    sourceField:
      "latitude|longitude",

    missingReasonCode:
      hasLatitude ||
      hasLongitude
        ? "partial-coordinates"
        : "coordinates-unavailable",

    capturedAt,
  });
}

function createStarsFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const id =
    createEvidenceId(
      hotel,
      "property-stars"
    );

  if (
    !isPositiveNumber(
      hotel.stars
    )
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        "property.stars",

      sourceProvider:
        provider,

      sourceField:
        "stars",

      missingReasonCode:
        "official-stars-unavailable",

      capturedAt,
    });
  }

  if (
    hotel.stars > 5
  ) {
    return createConflictingEvidenceFactV2({
      id,

      code:
        "property.stars",

      value:
        hotel.stars,

      unit:
        "stars",

      sourceProvider:
        provider,

      sourceField:
        "stars",

      missingReasonCode:
        "official-stars-out-of-range",

      capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      "property.stars",

    value:
      hotel.stars,

    unit:
      "stars",

    source:
      "provider",

    sourceProvider:
      provider,

    sourceField:
      "stars",

    confidence:
      0.9,

    capturedAt,
  });
}

function createAmenitiesFact(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const amenities =
    [
      ...(hotel.amenities ?? []),
      ...(hotel.facilities ?? []),
    ]
      .filter(
        hasText
      )
      .map(
        (value) =>
          value.trim()
      );

  const id =
    createEvidenceId(
      hotel,
      "property-amenities"
    );

  if (
    amenities.length === 0
  ) {
    return createUnknownEvidenceFactV2({
      id,

      code:
        "property.amenities",

      sourceProvider:
        provider,

      sourceField:
        "amenities|facilities",

      missingReasonCode:
        "amenities-unavailable",

      capturedAt,
    });
  }

  return createKnownEvidenceFactV2({
    id,

    code:
      "property.amenities",

    value:
      amenities.length,

    unit:
      "items",

    source:
      "provider",

    sourceProvider:
      provider,

    sourceField:
      "amenities|facilities",

    confidence:
      0.86,

    capturedAt,
  });
}

function createOfferFacts(
  hotel:
    Hotel,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const offers =
    hotel.offers ?? [];

  if (
    offers.length === 0
  ) {
    return [
      createUnknownEvidenceFactV2({
        id:
          createEvidenceId(
            hotel,
            "offer-count"
          ),

        code:
          "offer.count",

        sourceProvider:
          provider,

        sourceField:
          "offers",

        missingReasonCode:
          "offers-unavailable",

        severity:
          "blocking",

        capturedAt,
      }),

      createUnknownEvidenceFactV2({
        id:
          createEvidenceId(
            hotel,
            "offer-bookable"
          ),

        code:
          "offer.bookable",

        sourceProvider:
          provider,

        sourceField:
          "offers.bookable",

        missingReasonCode:
          "bookability-unavailable",

        capturedAt,
      }),

      createUnknownEvidenceFactV2({
        id:
          createEvidenceId(
            hotel,
            "offer-cancellation"
          ),

        code:
          "offer.cancellation",

        sourceProvider:
          provider,

        sourceField:
          "offers.cancellationPolicy",

        missingReasonCode:
          "cancellation-policy-unavailable",

        capturedAt,
      }),
    ];
  }

  const cancellationPolicies =
    offers
      .map(
        (offer) =>
          offer.cancellationPolicy
      )
      .filter(
        hasText
      );

  return [
    createKnownEvidenceFactV2({
      id:
        createEvidenceId(
          hotel,
          "offer-count"
        ),

      code:
        "offer.count",

      value:
        offers.length,

      unit:
        "offers",

      source:
        "provider",

      sourceProvider:
        provider,

      sourceField:
        "offers",

      confidence:
        0.96,

      capturedAt,
    }),

    createKnownEvidenceFactV2({
      id:
        createEvidenceId(
          hotel,
          "offer-bookable"
        ),

      code:
        "offer.bookable",

      value:
        offers.some(
          (offer) =>
            offer.bookable === true
        ),

      source:
        "provider",

      sourceProvider:
        provider,

      sourceField:
        "offers.bookable",

      confidence:
        0.96,

      capturedAt,
    }),

    cancellationPolicies.length > 0
      ? createKnownEvidenceFactV2({
          id:
            createEvidenceId(
              hotel,
              "offer-cancellation"
            ),

          code:
            "offer.cancellation",

          value:
            cancellationPolicies.length,

          unit:
            "policies",

          source:
            "provider",

          sourceProvider:
            provider,

          sourceField:
            "offers.cancellationPolicy",

          confidence:
            0.9,

          capturedAt,
        })
      : createUnknownEvidenceFactV2({
          id:
            createEvidenceId(
              hotel,
              "offer-cancellation"
            ),

          code:
            "offer.cancellation",

          sourceProvider:
            provider,

          sourceField:
            "offers.cancellationPolicy",

          missingReasonCode:
            "cancellation-policy-unavailable",

          capturedAt,
        }),
  ];
}

function isFeatureConfirmedByUnitType(
  accommodation:
    SmartStayAccommodationProfileV2,
  feature:
    SmartStayAccommodationFeatureCodeV2
) {
  return (
    (
      feature === "entire-place" &&
      accommodation.unitType ===
        "entire-place"
    ) ||
    (
      feature === "private-room" &&
      accommodation.unitType ===
        "private-room"
    ) ||
    (
      feature === "shared-room" &&
      accommodation.unitType ===
        "shared-room"
    ) ||
    (
      feature === "hotel-room" &&
      accommodation.unitType ===
        "hotel-room"
    )
  );
}

function createFeatureFact(
  hotel:
    Hotel,
  accommodation:
    SmartStayAccommodationProfileV2,
  feature:
    SmartStayAccommodationFeatureCodeV2,
  searchableText:
    string,
  provider:
    string | null,
  capturedAt:
    string | null
) {
  const code =
    `feature.${feature}`;

  const id =
    createEvidenceId(
      hotel,
      code.replace(
        /\./g,
        "-"
      )
    );

  const matchedAlias =
    (
      FEATURE_ALIASES[
        feature
      ] ??
      []
    ).find(
      (alias) =>
        containsPhrase(
          searchableText,
          alias
        )
    );

  if (matchedAlias) {
    return createKnownEvidenceFactV2({
      id,

      code,

      value:
        true,

      source:
        "provider",

      sourceProvider:
        provider,

      sourceField:
        "amenities|facilities",

      confidence:
        0.84,

      capturedAt,
    });
  }

  if (
    isFeatureConfirmedByUnitType(
      accommodation,
      feature
    )
  ) {
    return createKnownEvidenceFactV2({
      id,

      code,

      value:
        true,

      source:
        "derived",

      sourceProvider:
        provider,

      sourceField:
        "accommodation.unitType",

      confidence:
        accommodation.confidence,

      capturedAt,

      derivedFromEvidenceIds:
        accommodation.evidenceIds,
    });
  }

  const policy =
    getAccommodationCategoryFeaturePolicyV2(
      accommodation.category,
      feature
    );

  if (
    policy.treatment ===
    "not-expected"
  ) {
    return createNotApplicableEvidenceFactV2({
      id,

      code,

      source:
        "system",

      sourceProvider:
        provider,

      sourceField:
        "category-feature-policy",

      missingReasonCode:
        policy.reasonCode,

      confidence:
        accommodation.confidence,

      capturedAt,

      derivedFromEvidenceIds:
        accommodation.evidenceIds,
    });
  }

  return createUnknownEvidenceFactV2({
    id,

    code,

    sourceProvider:
      provider,

    sourceField:
      "amenities|facilities",

    missingReasonCode:
      "feature-not-reported",

    capturedAt,
  });
}

export function buildHotelEvidenceModelV2(
  input:
    SmartStayHotelEvidenceInputV2
): SmartStayHotelEvidenceResultV2 {
  const hotel =
    input.hotel;

  const accommodation =
    input.accommodation;

  const provider =
    normalizeProvider(
      hotel.provider
    );

  const capturedAt =
    hasText(
      input.capturedAt
    )
      ? input.capturedAt.trim()
      : null;

  const facts:
    SmartStayEvidenceFactV2[] = [
      ...(
        input.categoryEvidence ??
        []
      ),

      createCurrencyFact(
        hotel,
        provider,
        capturedAt
      ),

      ...createCostFacts(
        hotel,
        provider,
        capturedAt
      ),

      createReviewScoreFact(
        hotel,
        provider,
        capturedAt
      ),

      createReviewCountFact(
        hotel,
        provider,
        capturedAt
      ),

      createDistanceFact(
        hotel,
        provider,
        capturedAt
      ),

      createCoordinatesFact(
        hotel,
        provider,
        capturedAt
      ),

      createStarsFact(
        hotel,
        provider,
        capturedAt
      ),

      createKnownTextFact(
        hotel,
        {
          code:
            "property.image",

          value:
            hotel.image,

          sourceField:
            "image",

          missingReasonCode:
            "image-unavailable",

          provider,

          capturedAt,
        }
      ),

      createKnownTextFact(
        hotel,
        {
          code:
            "property.address",

          value:
            hotel.address,

          sourceField:
            "address",

          missingReasonCode:
            "address-unavailable",

          provider,

          capturedAt,
        }
      ),

      createAmenitiesFact(
        hotel,
        provider,
        capturedAt
      ),

      ...createOfferFacts(
        hotel,
        provider,
        capturedAt
      ),
    ];

  const searchableText =
    [
      ...(hotel.amenities ?? []),
      ...(hotel.facilities ?? []),
    ]
      .map(
        normalizeText
      )
      .filter(
        Boolean
      )
      .join(
        " "
      );

  for (
    const feature
    of FEATURE_CODES
  ) {
    facts.push(
      createFeatureFact(
        hotel,
        accommodation,
        feature,
        searchableText,
        provider,
        capturedAt
      )
    );
  }

  const deduplicatedFacts =
    deduplicateEvidenceFactsV2(
      facts
    );

  return {
    facts:
      deduplicatedFacts,

    ...createEvidenceAvailabilityIndexV2(
      deduplicatedFacts
    ),
  };
}
