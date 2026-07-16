import type {
  SmartStayAccommodationFeatureCodeV2,
} from "../categories/accommodationCategoryModel";

import type {
  SmartStayAccommodationProfileV2,
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
  SmartStayUnitType,
} from "../model/smartStayEvaluationV2";

export type SmartStayComfortStatusV2 =
  | "invalid"
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayTripProfileV2 =
  | "leisure"
  | "business"
  | "family"
  | "group"
  | "long-stay"
  | "mixed";

export type SmartStayComfortDimensionCodeV2 =
  | "comfort"
  | "practicality"
  | "flexibility";

export type SmartStayFeatureEvidenceStateV2 =
  | "known-true"
  | "known-false"
  | "unknown"
  | "not-applicable"
  | "conflicting";

export type SmartStayFeaturePreferenceKindV2 =
  | "required"
  | "preferred"
  | "avoided"
  | "contextual"
  | "none";

export type SmartStayMandatoryRequirementStatusV2 =
  | "satisfied"
  | "unmet"
  | "unverified"
  | "not-required";

export interface SmartStayComfortStayContextV2 {
  nights?:
    number | null;

  adults?:
    number | null;

  children?:
    number | null;

  rooms?:
    number | null;

  tripProfile?:
    SmartStayTripProfileV2;
}

export interface SmartStayComfortPreferencesV2 {
  requiredFeatureCodes?:
    SmartStayAccommodationFeatureCodeV2[];

  preferredFeatureCodes?:
    SmartStayAccommodationFeatureCodeV2[];

  avoidedFeatureCodes?:
    SmartStayAccommodationFeatureCodeV2[];

  requiredUnitTypes?:
    SmartStayUnitType[];

  preferredUnitTypes?:
    SmartStayUnitType[];

  customFeatureWeights?:
    Partial<
      Record<
        SmartStayAccommodationFeatureCodeV2,
        number
      >
    >;
}

export interface SmartStayComfortInputV2 {
  targetHotelId:
    string;

  accommodation:
    SmartStayAccommodationProfileV2;

  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;

  stayContext?:
    SmartStayComfortStayContextV2;

  preferences?:
    SmartStayComfortPreferencesV2;
}

export interface SmartStayComfortOptionsV2 {
  minimumEvidenceConfidence?:
    number;

  strongEvidenceCoverage?:
    number;
}

export interface SmartStayFeatureComfortEvaluationV2 {
  featureCode:
    SmartStayAccommodationFeatureCodeV2;

  dimension:
    SmartStayComfortDimensionCodeV2;

  evidenceState:
    SmartStayFeatureEvidenceStateV2;

  preferenceKind:
    SmartStayFeaturePreferenceKindV2;

  mandatoryStatus:
    SmartStayMandatoryRequirementStatusV2;

  weight:
    number;

  includedInScore:
    boolean;

  score:
    number | null;

  confidence:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayUnitTypeEvaluationV2 {
  unitType:
    SmartStayUnitType;

  requiredStatus:
    SmartStayMandatoryRequirementStatusV2;

  score:
    number | null;

  confidence:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayComfortDimensionV2 {
  score:
    number | null;

  confidence:
    number;

  evidenceCoverage:
    number;

  totalWeight:
    number;

  confirmedWeight:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayMandatoryRequirementsV2 {
  satisfied:
    boolean;

  unmetFeatureCodes:
    SmartStayAccommodationFeatureCodeV2[];

  unverifiedFeatureCodes:
    SmartStayAccommodationFeatureCodeV2[];

  requiredUnitTypeStatus:
    SmartStayMandatoryRequirementStatusV2;
}

export interface SmartStayComfortFlexibilityEvaluationV2 {
  hotelId:
    string;

  status:
    SmartStayComfortStatusV2;

  eligibleForPrimaryRanking:
    boolean;

  tripProfile:
    SmartStayTripProfileV2;

  mandatoryRequirements:
    SmartStayMandatoryRequirementsV2;

  unitType:
    SmartStayUnitTypeEvaluationV2;

  features:
    SmartStayFeatureComfortEvaluationV2[];

  dimensions: {
    comfort:
      SmartStayComfortDimensionV2;

    practicality:
      SmartStayComfortDimensionV2;

    flexibility:
      SmartStayComfortDimensionV2;
  };

  score:
    number | null;

  confidence:
    number;

  evidenceCoverage:
    number;

  warningCodes:
    string[];

  evidenceIds:
    string[];
}

type ResolvedEvidence = {
  state:
    SmartStayFeatureEvidenceStateV2;

  confidence:
    number;

  evidenceIds:
    string[];
};

type DimensionScoreItem = {
  score:
    number | null;

  weight:
    number;

  confidence:
    number;

  confirmed:
    boolean;

  evidenceIds:
    string[];
};

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

const FEATURE_DIMENSIONS:
  Readonly<
    Record<
      SmartStayAccommodationFeatureCodeV2,
      SmartStayComfortDimensionCodeV2
    >
  > = {
    "air-conditioning":
      "comfort",

    breakfast:
      "practicality",

    "daily-cleaning":
      "practicality",

    elevator:
      "comfort",

    "entire-place":
      "comfort",

    "hotel-room":
      "comfort",

    kitchen:
      "practicality",

    "multiple-bedrooms":
      "comfort",

    parking:
      "practicality",

    "private-bathroom":
      "comfort",

    "private-room":
      "comfort",

    reception:
      "flexibility",

    "self-check-in":
      "flexibility",

    "shared-room":
      "comfort",

    "washing-machine":
      "practicality",

    wifi:
      "practicality",

    workspace:
      "practicality",
  };

const BASE_FEATURE_WEIGHTS:
  Readonly<
    Record<
      SmartStayAccommodationFeatureCodeV2,
      number
    >
  > = {
    "air-conditioning":
      0.7,

    breakfast:
      0.3,

    "daily-cleaning":
      0.25,

    elevator:
      0.25,

    "entire-place":
      0,

    "hotel-room":
      0,

    kitchen:
      0.5,

    "multiple-bedrooms":
      0.15,

    parking:
      0.3,

    "private-bathroom":
      1,

    "private-room":
      0,

    reception:
      0.35,

    "self-check-in":
      0.45,

    "shared-room":
      0,

    "washing-machine":
      0.4,

    wifi:
      1,

    workspace:
      0.35,
  };

const DIMENSION_WEIGHTS:
  Readonly<
    Record<
      SmartStayComfortDimensionCodeV2,
      number
    >
  > = {
    comfort:
      0.45,

    practicality:
      0.35,

    flexibility:
      0.2,
  };

const DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE =
  0.6;

const DEFAULT_STRONG_EVIDENCE_COVERAGE =
  0.7;

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
    2
) {
  const factor =
    10 ** decimalPlaces;

  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
      factor
    ) /
    factor
  );
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

function normalizeConfidence(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return clamp(
    value,
    0,
    1
  );
}

function normalizeOptionalInteger(
  value:
    unknown,
  fieldName:
    string,
  allowZero:
    boolean
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    (
      allowZero
        ? value < 0
        : value <= 0
    )
  ) {
    throw new Error(
      `${fieldName} is invalid.`
    );
  }

  return value;
}


function normalizeUnitTypeList(
  values:
    SmartStayUnitType[] |
    undefined
) {
  return [
    ...new Set(
      values ??
      []
    ),
  ].sort();
}

function inferTripProfile(
  context:
    SmartStayComfortStayContextV2
): SmartStayTripProfileV2 {
  if (
    context.tripProfile
  ) {
    return context.tripProfile;
  }

  const children =
    context.children ??
    0;

  const adults =
    context.adults ??
    0;

  const nights =
    context.nights ??
    0;

  if (
    children > 0
  ) {
    return "family";
  }

  if (
    adults >= 3
  ) {
    return "group";
  }

  if (
    nights >= 7
  ) {
    return "long-stay";
  }

  return "mixed";
}

function validatePreferences(
  preferences:
    SmartStayComfortPreferencesV2
) {
  const required =
    new Set(
      preferences
        .requiredFeatureCodes ??
      []
    );

  const preferred =
    new Set(
      preferences
        .preferredFeatureCodes ??
      []
    );

  const avoided =
    new Set(
      preferences
        .avoidedFeatureCodes ??
      []
    );

  for (
    const feature
    of required
  ) {
    if (
      avoided.has(
        feature
      )
    ) {
      throw new Error(
        `Feature cannot be both required and avoided: ${feature}`
      );
    }
  }

  for (
    const feature
    of preferred
  ) {
    if (
      avoided.has(
        feature
      )
    ) {
      throw new Error(
        `Feature cannot be both preferred and avoided: ${feature}`
      );
    }
  }

  for (
    const feature
    of FEATURE_CODES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        preferences
          .customFeatureWeights ??
        {},
        feature
      )
    ) {
      continue;
    }

    const weight =
      preferences
        .customFeatureWeights
        ?.[feature];

    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0
    ) {
      throw new Error(
        `Custom feature weight is invalid: ${feature}`
      );
    }
  }
}

function buildFeatureWeights(
  context:
    SmartStayComfortStayContextV2,
  preferences:
    SmartStayComfortPreferencesV2,
  tripProfile:
    SmartStayTripProfileV2
) {
  const weights:
    Record<
      SmartStayAccommodationFeatureCodeV2,
      number
    > = {
      ...BASE_FEATURE_WEIGHTS,
    };

  const nights =
    context.nights ??
    0;

  const adults =
    context.adults ??
    0;

  const children =
    context.children ??
    0;

  if (
    nights >= 5 ||
    tripProfile === "long-stay"
  ) {
    weights.kitchen +=
      1;

    weights[
      "washing-machine"
    ] +=
      1;

    weights.workspace +=
      0.4;

    weights[
      "private-bathroom"
    ] +=
      0.3;
  }

  if (
    tripProfile === "family" ||
    tripProfile === "group" ||
    children > 0 ||
    adults >= 3
  ) {
    weights.kitchen +=
      0.8;

    weights[
      "multiple-bedrooms"
    ] +=
      1;

    weights[
      "private-bathroom"
    ] +=
      0.6;

    weights[
      "washing-machine"
    ] +=
      0.5;

    weights.parking +=
      0.3;
  }

  if (
    tripProfile === "business"
  ) {
    weights.wifi +=
      1;

    weights.workspace +=
      1;

    weights[
      "self-check-in"
    ] +=
      0.5;

    weights.reception +=
      0.4;

    weights[
      "air-conditioning"
    ] +=
      0.3;
  }

  if (
    nights > 0 &&
    nights <= 2
  ) {
    weights.breakfast +=
      0.5;

    weights.reception +=
      0.5;

    weights[
      "self-check-in"
    ] +=
      0.5;

    weights[
      "daily-cleaning"
    ] +=
      0.3;
  }

  for (
    const feature
    of FEATURE_CODES
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        preferences
          .customFeatureWeights ??
        {},
        feature
      )
    ) {
      weights[feature] =
        preferences
          .customFeatureWeights
          ?.[feature] ??
        weights[feature];
    }
  }

  for (
    const feature
    of preferences
      .preferredFeatureCodes ??
    []
  ) {
    weights[feature] =
      Math.max(
        weights[feature],
        2
      );
  }

  for (
    const feature
    of preferences
      .avoidedFeatureCodes ??
    []
  ) {
    weights[feature] =
      Math.max(
        weights[feature],
        2
      );
  }

  for (
    const feature
    of preferences
      .requiredFeatureCodes ??
    []
  ) {
    weights[feature] =
      Math.max(
        weights[feature],
        2.5
      );
  }

  return weights;
}

function getPreferenceKind(
  feature:
    SmartStayAccommodationFeatureCodeV2,
  preferences:
    SmartStayComfortPreferencesV2,
  weight:
    number
): SmartStayFeaturePreferenceKindV2 {
  if (
    (
      preferences
        .requiredFeatureCodes ??
      []
    ).includes(
      feature
    )
  ) {
    return "required";
  }

  if (
    (
      preferences
        .preferredFeatureCodes ??
      []
    ).includes(
      feature
    )
  ) {
    return "preferred";
  }

  if (
    (
      preferences
        .avoidedFeatureCodes ??
      []
    ).includes(
      feature
    )
  ) {
    return "avoided";
  }

  if (
    weight > 0
  ) {
    return "contextual";
  }

  return "none";
}

function resolveEvidence(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string,
  minimumEvidenceConfidence:
    number
): ResolvedEvidence {
  const facts =
    evidence.filter(
      (fact) =>
        fact.code === code
    );

  const evidenceIds =
    uniqueSorted(
      facts.map(
        (fact) =>
          fact.id
      )
    );

  if (
    facts.some(
      (fact) =>
        fact.availability ===
        "conflicting"
    )
  ) {
    return {
      state:
        "conflicting",

      confidence:
        0,

      evidenceIds,
    };
  }

  const knownFacts =
    facts
      .filter(
        (fact) =>
          fact.availability ===
            "known" &&
          fact.confidence >=
            minimumEvidenceConfidence
      )
      .sort(
        (
          firstFact,
          secondFact
        ) =>
          secondFact.confidence -
          firstFact.confidence
      );

  const knownBooleanValues =
    new Set<boolean>();

  for (
    const fact
    of knownFacts
  ) {
    if (
      typeof fact.value !==
      "boolean"
    ) {
      return {
        state:
          "conflicting",

        confidence:
          0,

        evidenceIds,
      };
    }

    knownBooleanValues.add(
      fact.value
    );
  }

  if (
    knownBooleanValues.size > 1
  ) {
    return {
      state:
        "conflicting",

      confidence:
        0,

      evidenceIds,
    };
  }

  if (
    knownBooleanValues.size === 1
  ) {
    const value =
      [
        ...knownBooleanValues,
      ][0];

    return {
      state:
        value
          ? "known-true"
          : "known-false",

      confidence:
        knownFacts[0]
          ?.confidence ??
        0,

      evidenceIds,
    };
  }

  const unavailableFacts =
    facts.filter(
      (fact) =>
        fact.availability ===
          "unknown" ||
        fact.availability ===
          "not-applicable"
    );

  if (
    unavailableFacts.length > 0 &&
    unavailableFacts.every(
      (fact) =>
        fact.availability ===
        "not-applicable"
    )
  ) {
    return {
      state:
        "not-applicable",

      confidence:
        Math.max(
          ...unavailableFacts.map(
            (fact) =>
              fact.confidence
          ),
          0
        ),

      evidenceIds,
    };
  }

  return {
    state:
      "unknown",

    confidence:
      Math.max(
        ...facts.map(
          (fact) =>
            fact.confidence
        ),
        0
      ),

    evidenceIds,
  };
}

function getMandatoryStatus(
  evidenceState:
    SmartStayFeatureEvidenceStateV2,
  required:
    boolean
): SmartStayMandatoryRequirementStatusV2 {
  if (!required) {
    return "not-required";
  }

  if (
    evidenceState ===
    "known-true"
  ) {
    return "satisfied";
  }

  if (
    evidenceState ===
    "known-false"
  ) {
    return "unmet";
  }

  return "unverified";
}

function getFeatureScore(
  evidenceState:
    SmartStayFeatureEvidenceStateV2,
  preferenceKind:
    SmartStayFeaturePreferenceKindV2
) {
  const avoided =
    preferenceKind ===
    "avoided";

  if (
    evidenceState ===
    "known-true"
  ) {
    return avoided
      ? 0
      : 100;
  }

  if (
    evidenceState ===
    "known-false"
  ) {
    return avoided
      ? 100
      : 0;
  }

  return null;
}

function getFeatureConfidence(
  resolved:
    ResolvedEvidence
) {
  if (
    resolved.state ===
      "known-true" ||
    resolved.state ===
      "known-false"
  ) {
    return resolved.confidence;
  }

  if (
    resolved.state ===
    "not-applicable"
  ) {
    return clamp(
      resolved.confidence *
      0.5,
      0,
      1
    );
  }

  if (
    resolved.state ===
    "conflicting"
  ) {
    return 0.05;
  }

  return 0.15;
}

function evaluateFeatures(
  evidence:
    SmartStayEvidenceFactV2[],
  weights:
    Record<
      SmartStayAccommodationFeatureCodeV2,
      number
    >,
  preferences:
    SmartStayComfortPreferencesV2,
  minimumEvidenceConfidence:
    number
) {
  return FEATURE_CODES.map(
    (
      feature
    ): SmartStayFeatureComfortEvaluationV2 => {
      const weight =
        weights[feature];

      const preferenceKind =
        getPreferenceKind(
          feature,
          preferences,
          weight
        );

      const resolved =
        resolveEvidence(
          evidence,
          `feature.${feature}`,
          minimumEvidenceConfidence
        );

      const mandatoryStatus =
        getMandatoryStatus(
          resolved.state,
          preferenceKind ===
            "required"
        );

      const score =
        getFeatureScore(
          resolved.state,
          preferenceKind
        );

      return {
        featureCode:
          feature,

        dimension:
          FEATURE_DIMENSIONS[
            feature
          ],

        evidenceState:
          resolved.state,

        preferenceKind,

        mandatoryStatus,

        weight:
          round(
            weight,
            3
          ),

        includedInScore:
          weight > 0 &&
          score !== null,

        score,

        confidence:
          round(
            getFeatureConfidence(
              resolved
            ),
            4
          ),

        evidenceIds:
          resolved.evidenceIds,
      };
    }
  );
}

function arePrivateRoomTypesCompatible(
  first:
    SmartStayUnitType,
  second:
    SmartStayUnitType
) {
  return (
    (
      first === "hotel-room" &&
      second === "private-room"
    ) ||
    (
      first === "private-room" &&
      second === "hotel-room"
    )
  );
}

function getContextualUnitTypeScore(
  unitType:
    SmartStayUnitType,
  tripProfile:
    SmartStayTripProfileV2
) {
  if (
    unitType === "unknown"
  ) {
    return null;
  }

  if (
    tripProfile === "family"
  ) {
    const scores:
      Record<
        SmartStayUnitType,
        number
      > = {
        "entire-place":
          100,

        "private-room":
          60,

        "shared-room":
          20,

        "hotel-room":
          70,

        unknown:
          50,
      };

    return scores[
      unitType
    ];
  }

  if (
    tripProfile === "group"
  ) {
    const scores:
      Record<
        SmartStayUnitType,
        number
      > = {
        "entire-place":
          95,

        "private-room":
          65,

        "shared-room":
          35,

        "hotel-room":
          60,

        unknown:
          50,
      };

    return scores[
      unitType
    ];
  }

  if (
    tripProfile === "long-stay"
  ) {
    const scores:
      Record<
        SmartStayUnitType,
        number
      > = {
        "entire-place":
          100,

        "private-room":
          70,

        "shared-room":
          30,

        "hotel-room":
          60,

        unknown:
          50,
      };

    return scores[
      unitType
    ];
  }

  if (
    tripProfile === "business"
  ) {
    const scores:
      Record<
        SmartStayUnitType,
        number
      > = {
        "entire-place":
          85,

        "private-room":
          75,

        "shared-room":
          30,

        "hotel-room":
          95,

        unknown:
          50,
      };

    return scores[
      unitType
    ];
  }

  return null;
}

function evaluateUnitType(
  accommodation:
    SmartStayAccommodationProfileV2,
  preferences:
    SmartStayComfortPreferencesV2,
  tripProfile:
    SmartStayTripProfileV2
): SmartStayUnitTypeEvaluationV2 {
  const requiredUnitTypes =
    normalizeUnitTypeList(
      preferences.requiredUnitTypes
    );

  const preferredUnitTypes =
    normalizeUnitTypeList(
      preferences.preferredUnitTypes
    );

  let requiredStatus:
    SmartStayMandatoryRequirementStatusV2 =
      "not-required";

  if (
    requiredUnitTypes.length > 0
  ) {
    if (
      accommodation.unitType ===
      "unknown"
    ) {
      requiredStatus =
        "unverified";
    }
    else if (
      requiredUnitTypes.includes(
        accommodation.unitType
      )
    ) {
      requiredStatus =
        "satisfied";
    }
    else {
      requiredStatus =
        "unmet";
    }
  }

  let score:
    number | null = null;

  if (
    preferredUnitTypes.length > 0
  ) {
    if (
      accommodation.unitType ===
      "unknown"
    ) {
      score =
        null;
    }
    else if (
      preferredUnitTypes.includes(
        accommodation.unitType
      )
    ) {
      score =
        100;
    }
    else if (
      preferredUnitTypes.some(
        (preferredUnitType) =>
          arePrivateRoomTypesCompatible(
            preferredUnitType,
            accommodation.unitType
          )
      )
    ) {
      score =
        75;
    }
    else {
      score =
        25;
    }
  }
  else {
    score =
      getContextualUnitTypeScore(
        accommodation.unitType,
        tripProfile
      );
  }

  return {
    unitType:
      accommodation.unitType,

    requiredStatus,

    score,

    confidence:
      accommodation.unitType ===
      "unknown"
        ? 0.2
        : round(
            accommodation.confidence,
            4
          ),

    evidenceIds:
      uniqueSorted(
        accommodation.evidenceIds
      ),
  };
}

function createDimension(
  items:
    DimensionScoreItem[]
): SmartStayComfortDimensionV2 {
  const relevantItems =
    items.filter(
      (item) =>
        item.weight > 0
    );

  const scoredItems =
    relevantItems.filter(
      (item) =>
        item.score !== null
    );

  const totalWeight =
    relevantItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.weight,
      0
    );

  const scoredWeight =
    scoredItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.weight,
      0
    );

  const confirmedWeight =
    relevantItems
      .filter(
        (item) =>
          item.confirmed
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          item.weight,
        0
      );

  const evidenceCoverage =
    totalWeight > 0
      ? confirmedWeight /
        totalWeight
      : 0;

  const evidenceIds =
    uniqueSorted(
      relevantItems.flatMap(
        (item) =>
          item.evidenceIds
      )
    );

  if (
    totalWeight <= 0 ||
    scoredWeight <= 0 ||
    confirmedWeight <= 0
  ) {
    return {
      score:
        null,

      confidence:
        0,

      evidenceCoverage:
        round(
          evidenceCoverage,
          4
        ),

      totalWeight:
        round(
          totalWeight,
          3
        ),

      confirmedWeight:
        round(
          confirmedWeight,
          3
        ),

      evidenceIds,
    };
  }

  const score =
    scoredItems.reduce(
      (
        total,
        item
      ) =>
        total +
        (
          item.score ??
          0
        ) *
        item.weight,
      0
    ) /
    scoredWeight;

  const rawConfidence =
    relevantItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.confidence *
        item.weight,
      0
    ) /
    totalWeight;

  const confidence =
    rawConfidence *
    (
      0.5 +
      evidenceCoverage *
      0.5
    );

  return {
    score:
      round(
        score
      ),

    confidence:
      round(
        clamp(
          confidence,
          0,
          1
        ),
        4
      ),

    evidenceCoverage:
      round(
        evidenceCoverage,
        4
      ),

    totalWeight:
      round(
        totalWeight,
        3
      ),

    confirmedWeight:
      round(
        confirmedWeight,
        3
      ),

    evidenceIds,
  };
}

function featureToScoreItem(
  feature:
    SmartStayFeatureComfortEvaluationV2
): DimensionScoreItem {
  return {
    score:
      feature.includedInScore
        ? feature.score
        : null,

    weight:
      feature.evidenceState ===
      "not-applicable"
        ? 0
        : feature.weight,

    confidence:
      feature.confidence,

    confirmed:
      feature.evidenceState ===
        "known-true" ||
      feature.evidenceState ===
        "known-false",

    evidenceIds:
      feature.evidenceIds,
  };
}

function createUnitScoreItem(
  unitType:
    SmartStayUnitTypeEvaluationV2
): DimensionScoreItem {
  return {
    score:
      unitType.unitType ===
      "unknown"
        ? null
        : unitType.score,

    weight:
      1.25,

    confidence:
      unitType.confidence,

    confirmed:
      unitType.unitType !==
      "unknown",

    evidenceIds:
      unitType.evidenceIds,
  };
}

function resolveGeneralFact(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string,
  minimumEvidenceConfidence:
    number
) {
  const facts =
    evidence.filter(
      (fact) =>
        fact.code === code
    );

  const evidenceIds =
    uniqueSorted(
      facts.map(
        (fact) =>
          fact.id
      )
    );

  if (
    facts.some(
      (fact) =>
        fact.availability ===
        "conflicting"
    )
  ) {
    return {
      state:
        "conflicting" as const,

      fact:
        null,

      evidenceIds,
    };
  }

  const knownFact =
    facts
      .filter(
        (fact) =>
          fact.availability ===
            "known" &&
          fact.confidence >=
            minimumEvidenceConfidence
      )
      .sort(
        (
          firstFact,
          secondFact
        ) =>
          secondFact.confidence -
          firstFact.confidence
      )[0] ??
    null;

  if (knownFact) {
    return {
      state:
        "known" as const,

      fact:
        knownFact,

      evidenceIds,
    };
  }

  if (
    facts.length > 0 &&
    facts.every(
      (fact) =>
        fact.availability ===
        "not-applicable"
    )
  ) {
    return {
      state:
        "not-applicable" as const,

      fact:
        null,

      evidenceIds,
    };
  }

  return {
    state:
      "unknown" as const,

    fact:
      null,

    evidenceIds,
  };
}

function isValidCancellationDeadline(
  value:
    unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return false;
  }

  return Number.isFinite(
    Date.parse(
      value.trim()
    )
  );
}

function createCancellationScoreItem(
  evidence:
    SmartStayEvidenceFactV2[],
  minimumEvidenceConfidence:
    number
): DimensionScoreItem {
  const refundable =
    resolveGeneralFact(
      evidence,
      "offer.refundable",
      minimumEvidenceConfidence
    );

  const deadline =
    resolveGeneralFact(
      evidence,
      "offer.free-cancellation-until",
      minimumEvidenceConfidence
    );

  const evidenceIds =
    uniqueSorted([
      ...refundable.evidenceIds,
      ...deadline.evidenceIds,
    ]);

  if (
    refundable.state ===
    "not-applicable"
  ) {
    return {
      score:
        null,

      weight:
        0,

      confidence:
        0,

      confirmed:
        false,

      evidenceIds,
    };
  }

  if (
    refundable.state ===
      "known" &&
    refundable.fact &&
    typeof refundable.fact.value ===
      "boolean"
  ) {
    if (
      refundable.fact.value ===
      false
    ) {
      return {
        score:
          0,

        weight:
          0.8,

        confidence:
          refundable.fact.confidence,

        confirmed:
          true,

        evidenceIds,
      };
    }

    const deadlineKnown =
      deadline.state ===
        "known" &&
      deadline.fact &&
      isValidCancellationDeadline(
        deadline.fact.value
      );

    return {
      score:
        deadlineKnown
          ? 100
          : 80,

      weight:
        0.8,

      confidence:
        deadlineKnown &&
        deadline.fact
          ? clamp(
              refundable.fact
                .confidence *
                0.75 +
              deadline.fact
                .confidence *
                0.25,
              0,
              1
            )
          : clamp(
              refundable.fact
                .confidence *
                0.8,
              0,
              1
            ),

      confirmed:
        true,

      evidenceIds,
    };
  }

  return {
    score:
      null,

    weight:
      0.8,

    confidence:
      refundable.state ===
        "conflicting"
        ? 0.05
        : 0.15,

    confirmed:
      false,

    evidenceIds,
  };
}

function combineDimensions(
  dimensions: {
    comfort:
      SmartStayComfortDimensionV2;

    practicality:
      SmartStayComfortDimensionV2;

    flexibility:
      SmartStayComfortDimensionV2;
  }
) {
  const entries:
    {
      dimension:
        SmartStayComfortDimensionV2;

      weight:
        number;
    }[] = [
      {
        dimension:
          dimensions.comfort,

        weight:
          DIMENSION_WEIGHTS
            .comfort,
      },

      {
        dimension:
          dimensions.practicality,

        weight:
          DIMENSION_WEIGHTS
            .practicality,
      },

      {
        dimension:
          dimensions.flexibility,

        weight:
          DIMENSION_WEIGHTS
            .flexibility,
      },
    ];

  const totalWeight =
    entries.reduce(
      (
        total,
        entry
      ) =>
        total +
        entry.weight,
      0
    );

  const scoredEntries =
    entries.filter(
      (entry) =>
        entry.dimension.score !==
        null
    );

  const scoredWeight =
    scoredEntries.reduce(
      (
        total,
        entry
      ) =>
        total +
        entry.weight,
      0
    );

  const evidenceIds =
    uniqueSorted(
      entries.flatMap(
        (entry) =>
          entry.dimension
            .evidenceIds
      )
    );

  if (
    totalWeight <= 0 ||
    scoredWeight <= 0
  ) {
    return {
      score:
        null,

      confidence:
        0,

      evidenceCoverage:
        0,

      evidenceIds,
    };
  }

  const score =
    scoredEntries.reduce(
      (
        total,
        entry
      ) =>
        total +
        (
          entry.dimension.score ??
          0
        ) *
        entry.weight,
      0
    ) /
    scoredWeight;

  const confidence =
    entries.reduce(
      (
        total,
        entry
      ) =>
        total +
        entry.dimension
          .confidence *
        entry.weight,
      0
    ) /
    totalWeight;

  const evidenceCoverage =
    entries.reduce(
      (
        total,
        entry
      ) =>
        total +
        entry.dimension
          .evidenceCoverage *
        entry.weight,
      0
    ) /
    totalWeight;

  return {
    score:
      round(
        score
      ),

    confidence:
      round(
        clamp(
          confidence,
          0,
          1
        ),
        4
      ),

    evidenceCoverage:
      round(
        clamp(
          evidenceCoverage,
          0,
          1
        ),
        4
      ),

    evidenceIds,
  };
}

function getReliabilityConfidence(
  gate:
    SmartStayReliabilityGateV2
) {
  if (
    gate.status ===
    "strong-data"
  ) {
    return 1;
  }

  if (
    gate.status ===
    "usable"
  ) {
    return 0.82;
  }

  if (
    gate.status ===
    "low-confidence"
  ) {
    return 0.4;
  }

  return 0;
}

function createInvalidEvaluation(
  input:
    SmartStayComfortInputV2,
  tripProfile:
    SmartStayTripProfileV2
): SmartStayComfortFlexibilityEvaluationV2 {
  const emptyDimension:
    SmartStayComfortDimensionV2 = {
      score:
        null,

      confidence:
        0,

      evidenceCoverage:
        0,

      totalWeight:
        0,

      confirmedWeight:
        0,

      evidenceIds:
        [],
    };

  return {
    hotelId:
      input.targetHotelId,

    status:
      "invalid",

    eligibleForPrimaryRanking:
      false,

    tripProfile,

    mandatoryRequirements: {
      satisfied:
        false,

      unmetFeatureCodes:
        [],

      unverifiedFeatureCodes:
        [],

      requiredUnitTypeStatus:
        "not-required",
    },

    unitType: {
      unitType:
        input
          .accommodation
          .unitType,

      requiredStatus:
        "not-required",

      score:
        null,

      confidence:
        0,

      evidenceIds:
        input
          .accommodation
          .evidenceIds,
    },

    features:
      [],

    dimensions: {
      comfort: {
        ...emptyDimension,
      },

      practicality: {
        ...emptyDimension,
      },

      flexibility: {
        ...emptyDimension,
      },
    },

    score:
      null,

    confidence:
      0,

    evidenceCoverage:
      0,

    warningCodes: [
      "target-reliability-invalid",
    ],

    evidenceIds:
      uniqueSorted([
        ...input
          .reliabilityGate
          .evidenceIds,

        ...input
          .accommodation
          .evidenceIds,
      ]),
  };
}

export function evaluateComfortFlexibilityV2(
  input:
    SmartStayComfortInputV2,
  options:
    SmartStayComfortOptionsV2 = {}
): SmartStayComfortFlexibilityEvaluationV2 {
  if (
    !input.targetHotelId.trim()
  ) {
    throw new Error(
      "Comfort evaluation requires a targetHotelId."
    );
  }

  const stayContext =
    input.stayContext ??
    {};

  normalizeOptionalInteger(
    stayContext.nights,
    "Stay nights",
    false
  );

  normalizeOptionalInteger(
    stayContext.adults,
    "Adult count",
    false
  );

  normalizeOptionalInteger(
    stayContext.children,
    "Child count",
    true
  );

  normalizeOptionalInteger(
    stayContext.rooms,
    "Room count",
    false
  );

  const preferences =
    input.preferences ??
    {};

  validatePreferences(
    preferences
  );

  const tripProfile =
    inferTripProfile(
      stayContext
    );

  if (
    input
      .reliabilityGate
      .status === "invalid"
  ) {
    return createInvalidEvaluation(
      input,
      tripProfile
    );
  }

  const minimumEvidenceConfidence =
    normalizeConfidence(
      options.minimumEvidenceConfidence,
      DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE
    );

  const strongEvidenceCoverage =
    normalizeConfidence(
      options.strongEvidenceCoverage,
      DEFAULT_STRONG_EVIDENCE_COVERAGE
    );

  const featureWeights =
    buildFeatureWeights(
      stayContext,
      preferences,
      tripProfile
    );

  const features =
    evaluateFeatures(
      input.evidence,
      featureWeights,
      preferences,
      minimumEvidenceConfidence
    );

  const unitType =
    evaluateUnitType(
      input.accommodation,
      preferences,
      tripProfile
    );

  const comfortItems =
    features
      .filter(
        (feature) =>
          feature.dimension ===
          "comfort"
      )
      .map(
        featureToScoreItem
      );

  comfortItems.push(
    createUnitScoreItem(
      unitType
    )
  );

  const practicalityItems =
    features
      .filter(
        (feature) =>
          feature.dimension ===
          "practicality"
      )
      .map(
        featureToScoreItem
      );

  const flexibilityItems =
    features
      .filter(
        (feature) =>
          feature.dimension ===
          "flexibility"
      )
      .map(
        featureToScoreItem
      );

  flexibilityItems.push(
    createCancellationScoreItem(
      input.evidence,
      minimumEvidenceConfidence
    )
  );

  const dimensions = {
    comfort:
      createDimension(
        comfortItems
      ),

    practicality:
      createDimension(
        practicalityItems
      ),

    flexibility:
      createDimension(
        flexibilityItems
      ),
  };

  const combined =
    combineDimensions(
      dimensions
    );

  const unmetFeatureCodes =
    features
      .filter(
        (feature) =>
          feature.mandatoryStatus ===
          "unmet"
      )
      .map(
        (feature) =>
          feature.featureCode
      )
      .sort();

  const unverifiedFeatureCodes =
    features
      .filter(
        (feature) =>
          feature.mandatoryStatus ===
          "unverified"
      )
      .map(
        (feature) =>
          feature.featureCode
      )
      .sort();

  const requiredUnitTypeStatus =
    unitType.requiredStatus;

  const mandatorySatisfied =
    unmetFeatureCodes.length === 0 &&
    unverifiedFeatureCodes.length ===
      0 &&
    requiredUnitTypeStatus !==
      "unmet" &&
    requiredUnitTypeStatus !==
      "unverified";

  const warningCodes:
    string[] = [];

  if (
    input
      .reliabilityGate
      .eligible === false
  ) {
    warningCodes.push(
      "target-not-eligible-for-primary-ranking"
    );
  }

  if (
    unmetFeatureCodes.length > 0
  ) {
    warningCodes.push(
      "mandatory-feature-unmet"
    );
  }

  if (
    unverifiedFeatureCodes.length >
    0
  ) {
    warningCodes.push(
      "mandatory-feature-unverified"
    );
  }

  if (
    requiredUnitTypeStatus ===
    "unmet"
  ) {
    warningCodes.push(
      "required-unit-type-unmet"
    );
  }

  if (
    requiredUnitTypeStatus ===
    "unverified"
  ) {
    warningCodes.push(
      "required-unit-type-unverified"
    );
  }

  for (
    const feature
    of features
  ) {
    if (
      feature.preferenceKind ===
        "preferred" &&
      feature.evidenceState ===
        "unknown"
    ) {
      warningCodes.push(
        `preferred-feature-unverified:${feature.featureCode}`
      );
    }

    if (
      feature.evidenceState ===
      "conflicting"
    ) {
      warningCodes.push(
        `feature-evidence-conflicting:${feature.featureCode}`
      );
    }
  }

  if (
    combined.score === null
  ) {
    warningCodes.push(
      "comfort-evidence-unavailable"
    );
  }
  else if (
    combined.evidenceCoverage <
    0.35
  ) {
    warningCodes.push(
      "comfort-evidence-limited"
    );
  }

  const cancellationEvidence =
    resolveGeneralFact(
      input.evidence,
      "offer.cancellation",
      minimumEvidenceConfidence
    );

  if (
    cancellationEvidence.state ===
    "unknown"
  ) {
    warningCodes.push(
      "cancellation-information-unavailable"
    );
  }
  else if (
    cancellationEvidence.state ===
    "conflicting"
  ) {
    warningCodes.push(
      "cancellation-information-conflicting"
    );
  }

  const refundableEvidence =
    resolveGeneralFact(
      input.evidence,
      "offer.refundable",
      minimumEvidenceConfidence
    );

  if (
    refundableEvidence.state ===
    "unknown"
  ) {
    warningCodes.push(
      "cancellation-flexibility-unavailable"
    );
  }
  else if (
    refundableEvidence.state ===
    "conflicting"
  ) {
    warningCodes.push(
      "cancellation-flexibility-conflicting"
    );
  }
  else if (
    refundableEvidence.state ===
      "known" &&
    refundableEvidence.fact &&
    typeof refundableEvidence
      .fact.value !==
      "boolean"
  ) {
    warningCodes.push(
      "cancellation-refundability-invalid"
    );
  }
  else if (
    refundableEvidence.state ===
      "known" &&
    refundableEvidence.fact
      ?.value === true
  ) {
    const deadlineEvidence =
      resolveGeneralFact(
        input.evidence,
        "offer.free-cancellation-until",
        minimumEvidenceConfidence
      );

    if (
      deadlineEvidence.state ===
      "unknown"
    ) {
      warningCodes.push(
        "free-cancellation-deadline-unavailable"
      );
    }
    else if (
      deadlineEvidence.state ===
      "conflicting"
    ) {
      warningCodes.push(
        "free-cancellation-deadline-conflicting"
      );
    }
    else if (
      deadlineEvidence.state ===
        "known" &&
      deadlineEvidence.fact &&
      !isValidCancellationDeadline(
        deadlineEvidence.fact.value
      )
    ) {
      warningCodes.push(
        "free-cancellation-deadline-invalid"
      );
    }
  }

  const reliabilityConfidence =
    getReliabilityConfidence(
      input.reliabilityGate
    );

  const confidence =
    combined.score === null
      ? 0
      : clamp(
          combined.confidence *
            0.8 +
          reliabilityConfidence *
            0.2,
          0,
          1
        );

  const normalizedWarnings =
    uniqueSorted(
      warningCodes
    );

  let status:
    SmartStayComfortStatusV2;

  if (
    combined.score === null
  ) {
    status =
      "unavailable";
  }
  else {
    const strongData =
      input
        .reliabilityGate
        .status === "strong-data" &&
      input
        .reliabilityGate
        .eligible === true &&
      mandatorySatisfied &&
      combined.evidenceCoverage >=
        strongEvidenceCoverage &&
      confidence >= 0.85 &&
      normalizedWarnings.length ===
        0;

    status =
      strongData
        ? "strong-data"
        : "usable";
  }

  return {
    hotelId:
      input.targetHotelId,

    status,

    eligibleForPrimaryRanking:
      input
        .reliabilityGate
        .eligible === true &&
      combined.score !== null &&
      mandatorySatisfied,

    tripProfile,

    mandatoryRequirements: {
      satisfied:
        mandatorySatisfied,

      unmetFeatureCodes,

      unverifiedFeatureCodes,

      requiredUnitTypeStatus,
    },

    unitType,

    features,

    dimensions,

    score:
      combined.score,

    confidence:
      round(
        confidence,
        4
      ),

    evidenceCoverage:
      combined.evidenceCoverage,

    warningCodes:
      normalizedWarnings,

    evidenceIds:
      uniqueSorted([
        ...features.flatMap(
          (feature) =>
            feature.evidenceIds
        ),

        ...unitType
          .evidenceIds,

        ...dimensions
          .comfort
          .evidenceIds,

        ...dimensions
          .practicality
          .evidenceIds,

        ...dimensions
          .flexibility
          .evidenceIds,

        ...input
          .reliabilityGate
          .evidenceIds,
      ]),
  };
}
