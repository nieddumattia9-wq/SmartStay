import type {
  Hotel,
} from "../../types/hotel";

import type {
  SmartStayAccommodationCategory,
  SmartStayAccommodationProfileV2,
  SmartStayEvidenceFactV2,
  SmartStayUnitType,
} from "../model/smartStayEvaluationV2";

export type SmartStayAccommodationFeatureCodeV2 =
  | "air-conditioning"
  | "breakfast"
  | "daily-cleaning"
  | "elevator"
  | "entire-place"
  | "hotel-room"
  | "kitchen"
  | "multiple-bedrooms"
  | "parking"
  | "private-bathroom"
  | "private-room"
  | "reception"
  | "self-check-in"
  | "shared-room"
  | "washing-machine"
  | "wifi"
  | "workspace";

export type SmartStayFeatureTreatmentV2 =
  | "core"
  | "contextual"
  | "bonus-only"
  | "not-expected";

export interface SmartStayCategoryFeaturePolicyV2 {
  feature:
    SmartStayAccommodationFeatureCodeV2;

  treatment:
    SmartStayFeatureTreatmentV2;

  absencePenaltyAllowed:
    boolean;

  presenceBonusAllowed:
    boolean;

  reasonCode:
    string;
}

export interface SmartStayAccommodationCategoryInputV2 {
  hotel:
    Pick<
      Hotel,
      | "id"
      | "name"
      | "provider"
      | "amenities"
      | "facilities"
    >;

  explicitCategory?:
    unknown;

  explicitUnitType?:
    unknown;

  categorySourceField?:
    string | null;

  unitTypeSourceField?:
    string | null;
}

export interface SmartStayAccommodationCategoryResultV2 {
  profile:
    SmartStayAccommodationProfileV2;

  evidence:
    SmartStayEvidenceFactV2[];

  matchedCategoryCodes:
    string[];

  matchedUnitTypeCodes:
    string[];
}

type CategoryCandidate = {
  category:
    SmartStayAccommodationCategory;

  confidence:
    number;

  code:
    string;

  evidenceId:
    string;
};

type UnitTypeCandidate = {
  unitType:
    SmartStayUnitType;

  confidence:
    number;

  code:
    string;

  evidenceId:
    string;
};

type CategoryRule = {
  category:
    SmartStayAccommodationCategory;

  confidence:
    number;

  code:
    string;

  phrases:
    readonly string[];
};

type UnitTypeRule = {
  unitType:
    SmartStayUnitType;

  confidence:
    number;

  code:
    string;

  phrases:
    readonly string[];
};

const CATEGORY_RULES:
  readonly CategoryRule[] = [
    {
      category:
        "bed-and-breakfast",

      confidence:
        0.97,

      code:
        "category-name-bed-and-breakfast",

      phrases: [
        "bed and breakfast",
        "bed breakfast",
        "b and b",
        "b b",
      ],
    },
    {
      category:
        "aparthotel",

      confidence:
        0.95,

      code:
        "category-name-aparthotel",

      phrases: [
        "aparthotel",
        "apartment hotel",
        "hotel apartment",
        "hotel residence",
        "residence hotel",
        "serviced apartment",
      ],
    },
    {
      category:
        "vacation-rental",

      confidence:
        0.96,

      code:
        "category-name-vacation-rental",

      phrases: [
        "vacation rental",
        "holiday rental",
        "holiday home",
        "holiday house",
        "short term rental",
        "tourist rental",
        "casa vacanze",
        "locazione turistica",
      ],
    },
    {
      category:
        "hostel",

      confidence:
        0.95,

      code:
        "category-name-hostel",

      phrases: [
        "hostel",
        "youth hostel",
        "ostello",
      ],
    },
    {
      category:
        "guesthouse",

      confidence:
        0.92,

      code:
        "category-name-guesthouse",

      phrases: [
        "guest house",
        "guesthouse",
        "affittacamere",
        "pensione",
        "homestay",
      ],
    },
    {
      category:
        "resort",

      confidence:
        0.91,

      code:
        "category-name-resort",

      phrases: [
        "resort",
      ],
    },
    {
      category:
        "villa",

      confidence:
        0.9,

      code:
        "category-name-villa",

      phrases: [
        "villa",
      ],
    },
    {
      category:
        "apartment",

      confidence:
        0.88,

      code:
        "category-name-apartment",

      phrases: [
        "apartment",
        "apartments",
        "appartamento",
        "appartamenti",
        "studio apartment",
        "studio flat",
        "flat",
      ],
    },
    {
      category:
        "hotel",

      confidence:
        0.84,

      code:
        "category-name-hotel",

      phrases: [
        "hotel",
        "motel",
        "inn",
      ],
    },
  ];

const UNIT_TYPE_RULES:
  readonly UnitTypeRule[] = [
    {
      unitType:
        "shared-room",

      confidence:
        0.97,

      code:
        "unit-type-shared-room",

      phrases: [
        "shared room",
        "shared dormitory",
        "dormitory room",
        "dorm room",
        "posto letto",
        "camera condivisa",
      ],
    },
    {
      unitType:
        "private-room",

      confidence:
        0.96,

      code:
        "unit-type-private-room",

      phrases: [
        "private room",
        "camera privata",
      ],
    },
    {
      unitType:
        "entire-place",

      confidence:
        0.97,

      code:
        "unit-type-entire-place",

      phrases: [
        "entire place",
        "entire apartment",
        "entire home",
        "entire house",
        "whole apartment",
        "whole house",
        "intero appartamento",
        "intera casa",
        "alloggio intero",
      ],
    },
    {
      unitType:
        "hotel-room",

      confidence:
        0.93,

      code:
        "unit-type-hotel-room",

      phrases: [
        "hotel room",
        "camera hotel",
        "camera d hotel",
      ],
    },
  ];

const EXPLICIT_CATEGORY_ALIASES:
  Readonly<
    Record<
      string,
      SmartStayAccommodationCategory
    >
  > = {
    hotel:
      "hotel",

    hotels:
      "hotel",

    motel:
      "hotel",

    inn:
      "hotel",

    "bed and breakfast":
      "bed-and-breakfast",

    "bed breakfast":
      "bed-and-breakfast",

    "b and b":
      "bed-and-breakfast",

    bb:
      "bed-and-breakfast",

    apartment:
      "apartment",

    apartments:
      "apartment",

    appartamento:
      "apartment",

    appartamenti:
      "apartment",

    flat:
      "apartment",

    "vacation rental":
      "vacation-rental",

    "holiday rental":
      "vacation-rental",

    "holiday home":
      "vacation-rental",

    "casa vacanze":
      "vacation-rental",

    "locazione turistica":
      "vacation-rental",

    aparthotel:
      "aparthotel",

    "apartment hotel":
      "aparthotel",

    "serviced apartment":
      "aparthotel",

    hostel:
      "hostel",

    ostello:
      "hostel",

    guesthouse:
      "guesthouse",

    "guest house":
      "guesthouse",

    affittacamere:
      "guesthouse",

    homestay:
      "guesthouse",

    villa:
      "villa",

    resort:
      "resort",

    other:
      "other",

    unknown:
      "unknown",
  };

const EXPLICIT_UNIT_TYPE_ALIASES:
  Readonly<
    Record<
      string,
      SmartStayUnitType
    >
  > = {
    "entire place":
      "entire-place",

    "entire home":
      "entire-place",

    "entire apartment":
      "entire-place",

    "whole apartment":
      "entire-place",

    "intero appartamento":
      "entire-place",

    "alloggio intero":
      "entire-place",

    "private room":
      "private-room",

    "camera privata":
      "private-room",

    "shared room":
      "shared-room",

    "camera condivisa":
      "shared-room",

    dormitory:
      "shared-room",

    "hotel room":
      "hotel-room",

    "camera hotel":
      "hotel-room",

    unknown:
      "unknown",
  };

const CATEGORY_FEATURE_OVERRIDES:
  Partial<
    Record<
      SmartStayAccommodationCategory,
      Partial<
        Record<
          SmartStayAccommodationFeatureCodeV2,
          SmartStayCategoryFeaturePolicyV2
        >
      >
    >
  > = {
    hotel: {
      reception:
        createFeaturePolicy(
          "reception",
          "core",
          true,
          true,
          "hotel-reception-core"
        ),

      "hotel-room":
        createFeaturePolicy(
          "hotel-room",
          "core",
          true,
          true,
          "hotel-room-core"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "bonus-only",
          false,
          true,
          "hotel-breakfast-bonus-only"
        ),

      kitchen:
        createFeaturePolicy(
          "kitchen",
          "not-expected",
          false,
          true,
          "hotel-kitchen-not-expected"
        ),

      "washing-machine":
        createFeaturePolicy(
          "washing-machine",
          "not-expected",
          false,
          true,
          "hotel-washing-machine-not-expected"
        ),
    },

    "bed-and-breakfast": {
      breakfast:
        createFeaturePolicy(
          "breakfast",
          "bonus-only",
          false,
          true,
          "bed-and-breakfast-breakfast-bonus-only"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "contextual",
          false,
          true,
          "bed-and-breakfast-reception-contextual"
        ),

      "daily-cleaning":
        createFeaturePolicy(
          "daily-cleaning",
          "contextual",
          false,
          true,
          "bed-and-breakfast-cleaning-contextual"
        ),
    },

    apartment: {
      kitchen:
        createFeaturePolicy(
          "kitchen",
          "core",
          true,
          true,
          "apartment-kitchen-core"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "not-expected",
          false,
          false,
          "apartment-reception-not-expected"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "not-expected",
          false,
          true,
          "apartment-breakfast-not-expected"
        ),

      "daily-cleaning":
        createFeaturePolicy(
          "daily-cleaning",
          "not-expected",
          false,
          true,
          "apartment-cleaning-not-expected"
        ),

      "washing-machine":
        createFeaturePolicy(
          "washing-machine",
          "bonus-only",
          false,
          true,
          "apartment-washing-machine-bonus"
        ),

      "multiple-bedrooms":
        createFeaturePolicy(
          "multiple-bedrooms",
          "bonus-only",
          false,
          true,
          "apartment-multiple-bedrooms-bonus"
        ),
    },

    "vacation-rental": {
      kitchen:
        createFeaturePolicy(
          "kitchen",
          "core",
          true,
          true,
          "vacation-rental-kitchen-core"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "not-expected",
          false,
          false,
          "vacation-rental-reception-not-expected"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "not-expected",
          false,
          true,
          "vacation-rental-breakfast-not-expected"
        ),

      "daily-cleaning":
        createFeaturePolicy(
          "daily-cleaning",
          "not-expected",
          false,
          true,
          "vacation-rental-cleaning-not-expected"
        ),

      "self-check-in":
        createFeaturePolicy(
          "self-check-in",
          "bonus-only",
          false,
          true,
          "vacation-rental-self-check-in-bonus"
        ),

      "washing-machine":
        createFeaturePolicy(
          "washing-machine",
          "bonus-only",
          false,
          true,
          "vacation-rental-washing-machine-bonus"
        ),
    },

    aparthotel: {
      kitchen:
        createFeaturePolicy(
          "kitchen",
          "core",
          true,
          true,
          "aparthotel-kitchen-core"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "contextual",
          false,
          true,
          "aparthotel-reception-contextual"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "bonus-only",
          false,
          true,
          "aparthotel-breakfast-bonus-only"
        ),

      "daily-cleaning":
        createFeaturePolicy(
          "daily-cleaning",
          "contextual",
          false,
          true,
          "aparthotel-cleaning-contextual"
        ),
    },

    hostel: {
      "shared-room":
        createFeaturePolicy(
          "shared-room",
          "contextual",
          false,
          true,
          "hostel-shared-room-contextual"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "contextual",
          false,
          true,
          "hostel-reception-contextual"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "bonus-only",
          false,
          true,
          "hostel-breakfast-bonus-only"
        ),

      kitchen:
        createFeaturePolicy(
          "kitchen",
          "bonus-only",
          false,
          true,
          "hostel-kitchen-bonus"
        ),
    },

    guesthouse: {
      breakfast:
        createFeaturePolicy(
          "breakfast",
          "bonus-only",
          false,
          true,
          "guesthouse-breakfast-bonus-only"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "contextual",
          false,
          true,
          "guesthouse-reception-contextual"
        ),
    },

    villa: {
      kitchen:
        createFeaturePolicy(
          "kitchen",
          "core",
          true,
          true,
          "villa-kitchen-core"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "not-expected",
          false,
          true,
          "villa-breakfast-not-expected"
        ),

      reception:
        createFeaturePolicy(
          "reception",
          "not-expected",
          false,
          false,
          "villa-reception-not-expected"
        ),
    },

    resort: {
      reception:
        createFeaturePolicy(
          "reception",
          "core",
          true,
          true,
          "resort-reception-core"
        ),

      breakfast:
        createFeaturePolicy(
          "breakfast",
          "bonus-only",
          false,
          true,
          "resort-breakfast-bonus-only"
        ),
    },
  };

function createFeaturePolicy(
  feature:
    SmartStayAccommodationFeatureCodeV2,
  treatment:
    SmartStayFeatureTreatmentV2,
  absencePenaltyAllowed:
    boolean,
  presenceBonusAllowed:
    boolean,
  reasonCode:
    string
): SmartStayCategoryFeaturePolicyV2 {
  return {
    feature,
    treatment,
    absencePenaltyAllowed,
    presenceBonusAllowed,
    reasonCode,
  };
}

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

function hasPhrase(
  text:
    string,
  phrase:
    string
) {
  const normalizedText =
    normalizeText(text);

  const normalizedPhrase =
    normalizeText(phrase);

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

function asOriginalText(
  value:
    unknown
) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function clampConfidence(
  value:
    number
) {
  return Math.min(
    Math.max(
      value,
      0
    ),
    1
  );
}

function createEvidenceId(
  hotelId:
    string,
  suffix:
    string
) {
  const safeHotelId =
    normalizeText(hotelId)
      .replace(
        /\s+/g,
        "-"
      ) ||
    "unknown-hotel";

  return `${safeHotelId}:${suffix}`;
}

function createKnownEvidence(
  input: {
    id:
      string;

    code:
      string;

    value:
      string;

    confidence:
      number;

    source:
      "provider" | "derived";

    provider:
      string | null;

    sourceField:
      string | null;
  }
): SmartStayEvidenceFactV2 {
  return {
    id:
      input.id,

    code:
      input.code,

    availability:
      "known",

    value:
      input.value,

    unit:
      null,

    source:
      input.source,

    sourceProvider:
      input.provider,

    sourceField:
      input.sourceField,

    confidence:
      clampConfidence(
        input.confidence
      ),

    severity:
      "information",

    missingReasonCode:
      null,

    capturedAt:
      null,

    derivedFromEvidenceIds:
      [],
  };
}

function createUnknownEvidence(
  input: {
    id:
      string;

    code:
      string;

    value?:
      string | null;

    provider:
      string | null;

    sourceField:
      string | null;

    missingReasonCode:
      string;

    conflicting?:
      boolean;
  }
): SmartStayEvidenceFactV2 {
  return {
    id:
      input.id,

    code:
      input.code,

    availability:
      input.conflicting
        ? "conflicting"
        : "unknown",

    value:
      input.value ??
      null,

    unit:
      null,

    source:
      "derived",

    sourceProvider:
      input.provider,

    sourceField:
      input.sourceField,

    confidence:
      0,

    severity:
      "warning",

    missingReasonCode:
      input.missingReasonCode,

    capturedAt:
      null,

    derivedFromEvidenceIds:
      [],
  };
}

function getExplicitCategory(
  value:
    unknown
) {
  const normalized =
    normalizeText(value);

  return normalized
    ? EXPLICIT_CATEGORY_ALIASES[
        normalized
      ] ?? null
    : null;
}

function getExplicitUnitType(
  value:
    unknown
) {
  const normalized =
    normalizeText(value);

  return normalized
    ? EXPLICIT_UNIT_TYPE_ALIASES[
        normalized
      ] ?? null
    : null;
}

function collectCategoryCandidates(
  hotelId:
    string,
  searchableText:
    string,
  provider:
    string | null
) {
  const evidence:
    SmartStayEvidenceFactV2[] = [];

  const candidates:
    CategoryCandidate[] = [];

  for (
    const rule
    of CATEGORY_RULES
  ) {
    const matchingPhrase =
      rule.phrases.find(
        (phrase) =>
          hasPhrase(
            searchableText,
            phrase
          )
      );

    if (!matchingPhrase) {
      continue;
    }

    const evidenceId =
      createEvidenceId(
        hotelId,
        rule.code
      );

    evidence.push(
      createKnownEvidence({
        id:
          evidenceId,

        code:
          rule.code,

        value:
          matchingPhrase,

        confidence:
          rule.confidence,

        source:
          "derived",

        provider,

        sourceField:
          "hotel.name-and-features",
      })
    );

    candidates.push({
      category:
        rule.category,

      confidence:
        rule.confidence,

      code:
        rule.code,

      evidenceId,
    });
  }

  return {
    candidates,
    evidence,
  };
}

function collectUnitTypeCandidates(
  hotelId:
    string,
  searchableText:
    string,
  provider:
    string | null
) {
  const evidence:
    SmartStayEvidenceFactV2[] = [];

  const candidates:
    UnitTypeCandidate[] = [];

  for (
    const rule
    of UNIT_TYPE_RULES
  ) {
    const matchingPhrase =
      rule.phrases.find(
        (phrase) =>
          hasPhrase(
            searchableText,
            phrase
          )
      );

    if (!matchingPhrase) {
      continue;
    }

    const evidenceId =
      createEvidenceId(
        hotelId,
        rule.code
      );

    evidence.push(
      createKnownEvidence({
        id:
          evidenceId,

        code:
          rule.code,

        value:
          matchingPhrase,

        confidence:
          rule.confidence,

        source:
          "derived",

        provider,

        sourceField:
          "hotel.name-and-features",
      })
    );

    candidates.push({
      unitType:
        rule.unitType,

      confidence:
        rule.confidence,

      code:
        rule.code,

      evidenceId,
    });
  }

  return {
    candidates,
    evidence,
  };
}

function resolveCategoryCandidates(
  candidates:
    CategoryCandidate[]
) {
  const sorted =
    candidates
      .slice()
      .sort(
        (
          firstCandidate,
          secondCandidate
        ) =>
          secondCandidate.confidence -
          firstCandidate.confidence
      );

  const best =
    sorted[0] ??
    null;

  const second =
    sorted.find(
      (candidate) =>
        candidate.category !==
        best?.category
    ) ??
    null;

  if (!best) {
    return {
      category:
        "unknown" as const,

      confidence:
        0,

      evidenceIds:
        [] as string[],

      conflicting:
        false,
    };
  }

  if (
    second &&
    best.confidence -
      second.confidence <=
      0.05
  ) {
    return {
      category:
        "unknown" as const,

      confidence:
        0.25,

      evidenceIds:
        [
          best.evidenceId,
          second.evidenceId,
        ],

      conflicting:
        true,
    };
  }

  return {
    category:
      best.category,

    confidence:
      best.confidence,

    evidenceIds:
      sorted
        .filter(
          (candidate) =>
            candidate.category ===
            best.category
        )
        .map(
          (candidate) =>
            candidate.evidenceId
        ),

    conflicting:
      false,
  };
}

function resolveUnitTypeCandidates(
  candidates:
    UnitTypeCandidate[]
) {
  const sorted =
    candidates
      .slice()
      .sort(
        (
          firstCandidate,
          secondCandidate
        ) =>
          secondCandidate.confidence -
          firstCandidate.confidence
      );

  const best =
    sorted[0] ??
    null;

  const second =
    sorted.find(
      (candidate) =>
        candidate.unitType !==
        best?.unitType
    ) ??
    null;

  if (!best) {
    return {
      unitType:
        "unknown" as const,

      confidence:
        0,

      evidenceIds:
        [] as string[],

      conflicting:
        false,
    };
  }

  if (
    second &&
    best.confidence -
      second.confidence <=
      0.05
  ) {
    return {
      unitType:
        "unknown" as const,

      confidence:
        0.25,

      evidenceIds:
        [
          best.evidenceId,
          second.evidenceId,
        ],

      conflicting:
        true,
    };
  }

  return {
    unitType:
      best.unitType,

    confidence:
      best.confidence,

    evidenceIds:
      sorted
        .filter(
          (candidate) =>
            candidate.unitType ===
            best.unitType
        )
        .map(
          (candidate) =>
            candidate.evidenceId
        ),

    conflicting:
      false,
  };
}

function inferHotelRoomFromCategory(
  hotelId:
    string,
  category:
    SmartStayAccommodationCategory,
  categoryConfidence:
    number,
  provider:
    string | null
) {
  if (
    category !== "hotel" &&
    category !== "resort"
  ) {
    return null;
  }

  const evidenceId =
    createEvidenceId(
      hotelId,
      "unit-type-derived-hotel-room"
    );

  return {
    unitType:
      "hotel-room" as const,

    confidence:
      Math.min(
        categoryConfidence * 0.78,
        0.72
      ),

    evidence:
      createKnownEvidence({
        id:
          evidenceId,

        code:
          "unit-type-derived-hotel-room",

        value:
          "hotel-room",

        confidence:
          Math.min(
            categoryConfidence * 0.78,
            0.72
          ),

        source:
          "derived",

        provider,

        sourceField:
          "derived-from-category",
      }),
  };
}

export function getAccommodationCategoryFeaturePolicyV2(
  category:
    SmartStayAccommodationCategory,
  feature:
    SmartStayAccommodationFeatureCodeV2
): SmartStayCategoryFeaturePolicyV2 {
  const override =
    CATEGORY_FEATURE_OVERRIDES[
      category
    ]?.[
      feature
    ];

  if (override) {
    return {
      ...override,
    };
  }

  return createFeaturePolicy(
    feature,
    "contextual",
    false,
    true,
    "category-feature-contextual-default"
  );
}

export function classifyAccommodationV2(
  input:
    SmartStayAccommodationCategoryInputV2
): SmartStayAccommodationCategoryResultV2 {
  const hotel =
    input.hotel;

  const provider =
    normalizeText(
      hotel.provider
    ) ||
    null;

  const originalCategory =
    asOriginalText(
      input.explicitCategory
    );

  const evidence:
    SmartStayEvidenceFactV2[] = [];

  const explicitCategory =
    getExplicitCategory(
      input.explicitCategory
    );

  let category:
    SmartStayAccommodationCategory;

  let categoryConfidence:
    number;

  let categoryEvidenceIds:
    string[];

  let matchedCategoryCodes:
    string[];

  if (explicitCategory) {
    const evidenceId =
      createEvidenceId(
        hotel.id,
        "category-explicit"
      );

    evidence.push(
      createKnownEvidence({
        id:
          evidenceId,

        code:
          "category-explicit",

        value:
          explicitCategory,

        confidence:
          0.99,

        source:
          "provider",

        provider,

        sourceField:
          input.categorySourceField ??
          "category",
      })
    );

    category =
      explicitCategory;

    categoryConfidence =
      explicitCategory === "unknown"
        ? 0
        : 0.99;

    categoryEvidenceIds =
      [evidenceId];

    matchedCategoryCodes =
      ["category-explicit"];
  }
  else {
    if (originalCategory) {
      evidence.push(
        createUnknownEvidence({
          id:
            createEvidenceId(
              hotel.id,
              "category-explicit-unsupported"
            ),

          code:
            "category-explicit-unsupported",

          value:
            originalCategory,

          provider,

          sourceField:
            input.categorySourceField ??
            "category",

          missingReasonCode:
            "unsupported-explicit-category",
        })
      );
    }

    const searchableText =
      [
        hotel.name,
        ...(hotel.amenities ?? []),
        ...(hotel.facilities ?? []),
      ].join(
        " "
      );

    const collected =
      collectCategoryCandidates(
        hotel.id,
        searchableText,
        provider
      );

    evidence.push(
      ...collected.evidence
    );

    const resolved =
      resolveCategoryCandidates(
        collected.candidates
      );

    category =
      resolved.category;

    categoryConfidence =
      resolved.confidence;

    categoryEvidenceIds =
      resolved.evidenceIds;

    matchedCategoryCodes =
      collected.candidates.map(
        (candidate) =>
          candidate.code
      );

    if (
      resolved.conflicting
    ) {
      const conflictEvidenceId =
        createEvidenceId(
          hotel.id,
          "category-conflicting-signals"
        );

      evidence.push(
        createUnknownEvidence({
          id:
            conflictEvidenceId,

          code:
            "category-conflicting-signals",

          provider,

          sourceField:
            "hotel.name-and-features",

          missingReasonCode:
            "conflicting-category-signals",

          conflicting:
            true,
        })
      );

      categoryEvidenceIds.push(
        conflictEvidenceId
      );
    }

    if (
      category === "unknown" &&
      !resolved.conflicting
    ) {
      const unknownEvidenceId =
        createEvidenceId(
          hotel.id,
          "category-not-detected"
        );

      evidence.push(
        createUnknownEvidence({
          id:
            unknownEvidenceId,

          code:
            "category-not-detected",

          provider,

          sourceField:
            "hotel.name-and-features",

          missingReasonCode:
            "category-not-provided-or-detected",
        })
      );

      categoryEvidenceIds.push(
        unknownEvidenceId
      );
    }
  }

  const explicitUnitType =
    getExplicitUnitType(
      input.explicitUnitType
    );

  let unitType:
    SmartStayUnitType;

  let unitTypeConfidence:
    number;

  let unitTypeEvidenceIds:
    string[];

  let matchedUnitTypeCodes:
    string[];

  if (explicitUnitType) {
    const evidenceId =
      createEvidenceId(
        hotel.id,
        "unit-type-explicit"
      );

    evidence.push(
      createKnownEvidence({
        id:
          evidenceId,

        code:
          "unit-type-explicit",

        value:
          explicitUnitType,

        confidence:
          0.99,

        source:
          "provider",

        provider,

        sourceField:
          input.unitTypeSourceField ??
          "unitType",
      })
    );

    unitType =
      explicitUnitType;

    unitTypeConfidence =
      explicitUnitType === "unknown"
        ? 0
        : 0.99;

    unitTypeEvidenceIds =
      [evidenceId];

    matchedUnitTypeCodes =
      ["unit-type-explicit"];
  }
  else {
    const searchableText =
      [
        hotel.name,
        ...(hotel.amenities ?? []),
        ...(hotel.facilities ?? []),
      ].join(
        " "
      );

    const collected =
      collectUnitTypeCandidates(
        hotel.id,
        searchableText,
        provider
      );

    evidence.push(
      ...collected.evidence
    );

    const resolved =
      resolveUnitTypeCandidates(
        collected.candidates
      );

    unitType =
      resolved.unitType;

    unitTypeConfidence =
      resolved.confidence;

    unitTypeEvidenceIds =
      resolved.evidenceIds;

    matchedUnitTypeCodes =
      collected.candidates.map(
        (candidate) =>
          candidate.code
      );

    if (
      resolved.conflicting
    ) {
      const conflictEvidenceId =
        createEvidenceId(
          hotel.id,
          "unit-type-conflicting-signals"
        );

      evidence.push(
        createUnknownEvidence({
          id:
            conflictEvidenceId,

          code:
            "unit-type-conflicting-signals",

          provider,

          sourceField:
            "hotel.name-and-features",

          missingReasonCode:
            "conflicting-unit-type-signals",

          conflicting:
            true,
        })
      );

      unitTypeEvidenceIds.push(
        conflictEvidenceId
      );
    }

    if (
      unitType === "unknown" &&
      !resolved.conflicting
    ) {
      const inferred =
        inferHotelRoomFromCategory(
          hotel.id,
          category,
          categoryConfidence,
          provider
        );

      if (inferred) {
        unitType =
          inferred.unitType;

        unitTypeConfidence =
          inferred.confidence;

        evidence.push(
          inferred.evidence
        );

        unitTypeEvidenceIds.push(
          inferred.evidence.id
        );

        matchedUnitTypeCodes.push(
          inferred.evidence.code
        );
      }
      else {
        const unknownEvidenceId =
          createEvidenceId(
            hotel.id,
            "unit-type-not-detected"
          );

        evidence.push(
          createUnknownEvidence({
            id:
              unknownEvidenceId,

            code:
              "unit-type-not-detected",

            provider,

            sourceField:
              "hotel.name-and-features",

            missingReasonCode:
              "unit-type-not-provided-or-detected",
          })
        );

        unitTypeEvidenceIds.push(
          unknownEvidenceId
        );
      }
    }
  }

  const combinedConfidence =
    category === "unknown"
      ? categoryConfidence
      : unitType === "unknown"
        ? categoryConfidence
        : (
            categoryConfidence * 0.7 +
            unitTypeConfidence * 0.3
          );

  return {
    profile: {
      category,

      unitType,

      originalCategory,

      confidence:
        clampConfidence(
          combinedConfidence
        ),

      evidenceIds: [
        ...new Set([
          ...categoryEvidenceIds,
          ...unitTypeEvidenceIds,
        ]),
      ],
    },

    evidence,

    matchedCategoryCodes: [
      ...new Set(
        matchedCategoryCodes
      ),
    ],

    matchedUnitTypeCodes: [
      ...new Set(
        matchedUnitTypeCodes
      ),
    ],
  };
}
