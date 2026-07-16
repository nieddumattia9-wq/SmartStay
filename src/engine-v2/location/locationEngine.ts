import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
} from "../model/smartStayEvaluationV2";

export type SmartStayLocationStatusV2 =
  | "invalid"
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayDistanceSourceV2 =
  | "reconciled"
  | "calculated"
  | "provider-selected-location"
  | "provider-unverified"
  | "unavailable";

export type SmartStayProviderDistanceReferenceV2 =
  | "selected-location"
  | "provider-default"
  | "unknown";

export interface SmartStayGeoPointV2 {
  latitude:
    number;

  longitude:
    number;

  confidence?:
    number;

  label?:
    string | null;
}

export interface SmartStayLocationInputV2 {
  targetHotelId:
    string;

  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;

  selectedLocation:
    SmartStayGeoPointV2 | null;

  maximumDistanceKm?:
    number | null;

  providerDistanceReference?:
    SmartStayProviderDistanceReferenceV2;
}

export interface SmartStayLocationOptionsV2 {
  minimumEvidenceConfidence?:
    number;

  absoluteAgreementToleranceKm?:
    number;

  relativeAgreementTolerance?:
    number;

  unrestrictedDistanceScaleKm?:
    number;
}

export interface SmartStayDistanceEvaluationV2 {
  providerDistanceKm:
    number | null;

  calculatedDistanceKm:
    number | null;

  selectedDistanceKm:
    number | null;

  source:
    SmartStayDistanceSourceV2;

  discrepancyKm:
    number | null;

  discrepancyRatio:
    number | null;
}

export interface SmartStayDistanceConstraintV2 {
  provided:
    boolean;

  maximumDistanceKm:
    number | null;

  withinLimit:
    boolean | null;

  overageKm:
    number | null;

  utilizationRatio:
    number | null;
}

export interface SmartStayLocationEvaluationV2 {
  hotelId:
    string;

  status:
    SmartStayLocationStatusV2;

  eligibleForPrimaryRanking:
    boolean;

  distance:
    SmartStayDistanceEvaluationV2;

  constraint:
    SmartStayDistanceConstraintV2;

  score:
    number | null;

  confidence:
    number;

  warningCodes:
    string[];

  evidenceIds:
    string[];
}

type ProviderDistanceFacts = {
  fact:
    SmartStayEvidenceFactV2 | null;

  distanceKm:
    number | null;

  evidenceIds:
    string[];
};

type PropertyCoordinateFacts = {
  fact:
    SmartStayEvidenceFactV2 | null;

  point:
    SmartStayGeoPointV2 | null;

  evidenceIds:
    string[];
};

type SelectedDistance = {
  source:
    SmartStayDistanceSourceV2;

  selectedDistanceKm:
    number | null;

  discrepancyKm:
    number | null;

  discrepancyRatio:
    number | null;

  confidence:
    number;

  warningCodes:
    string[];
};

const DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE =
  0.6;

const DEFAULT_ABSOLUTE_AGREEMENT_TOLERANCE_KM =
  0.35;

const DEFAULT_RELATIVE_AGREEMENT_TOLERANCE =
  0.2;

const DEFAULT_UNRESTRICTED_DISTANCE_SCALE_KM =
  7;

const EARTH_RADIUS_KM =
  6371.0088;

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
    3
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

function normalizePositiveNumber(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

function isFiniteNumber(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isNonNegativeFiniteNumber(
  value:
    unknown
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0
  );
}

function validateGeoPoint(
  point:
    SmartStayGeoPointV2,
  fieldName:
    string
) {
  const latitude =
    point.latitude;

  const longitude =
    point.longitude;

  if (
    !isFiniteNumber(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      `${fieldName} latitude is invalid.`
    );
  }

  if (
    !isFiniteNumber(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      `${fieldName} longitude is invalid.`
    );
  }
}

function validateMaximumDistance(
  value:
    number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !isFiniteNumber(value) ||
    value <= 0
  ) {
    throw new Error(
      "Maximum distance must be a positive finite number."
    );
  }

  return value;
}

function toRadians(
  degrees:
    number
) {
  return (
    degrees *
    Math.PI /
    180
  );
}

export function calculateHaversineDistanceKmV2(
  firstPoint:
    SmartStayGeoPointV2,
  secondPoint:
    SmartStayGeoPointV2
) {
  validateGeoPoint(
    firstPoint,
    "First point"
  );

  validateGeoPoint(
    secondPoint,
    "Second point"
  );

  const firstLatitude =
    toRadians(
      firstPoint.latitude
    );

  const secondLatitude =
    toRadians(
      secondPoint.latitude
    );

  const latitudeDifference =
    toRadians(
      secondPoint.latitude -
      firstPoint.latitude
    );

  const longitudeDifference =
    toRadians(
      secondPoint.longitude -
      firstPoint.longitude
    );

  const haversine =
    (
      Math.sin(
        latitudeDifference /
        2
      ) **
      2
    ) +
    (
      Math.cos(
        firstLatitude
      ) *
      Math.cos(
        secondLatitude
      ) *
      (
        Math.sin(
          longitudeDifference /
          2
        ) **
        2
      )
    );

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(
        haversine
      ),
      Math.sqrt(
        1 -
        haversine
      )
    );

  return (
    EARTH_RADIUS_KM *
    angularDistance
  );
}

function getKnownFact(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string,
  minimumConfidence:
    number
) {
  return evidence
    .filter(
      (fact) =>
        fact.code === code &&
        fact.availability ===
          "known" &&
        fact.confidence >=
          minimumConfidence
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
}

function extractProviderDistance(
  evidence:
    SmartStayEvidenceFactV2[],
  minimumEvidenceConfidence:
    number
): ProviderDistanceFacts {
  const fact =
    getKnownFact(
      evidence,
      "location.distance",
      minimumEvidenceConfidence
    );

  const distanceKm =
    fact &&
    isNonNegativeFiniteNumber(
      fact.value
    )
      ? fact.value
      : null;

  return {
    fact,

    distanceKm,

    evidenceIds:
      fact
        ? [
            fact.id,
          ]
        : [],
  };
}

function parseCoordinateValue(
  value:
    unknown
): SmartStayGeoPointV2 | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const parts =
    value
      .split(",")
      .map(
        (part) =>
          part.trim()
      );

  if (
    parts.length !== 2
  ) {
    return null;
  }

  const latitude =
    Number(
      parts[0]
    );

  const longitude =
    Number(
      parts[1]
    );

  if (
    !isFiniteNumber(latitude) ||
    !isFiniteNumber(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function extractPropertyCoordinates(
  evidence:
    SmartStayEvidenceFactV2[],
  minimumEvidenceConfidence:
    number
): PropertyCoordinateFacts {
  const fact =
    getKnownFact(
      evidence,
      "location.coordinates",
      minimumEvidenceConfidence
    );

  const point =
    fact
      ? parseCoordinateValue(
          fact.value
        )
      : null;

  return {
    fact,

    point,

    evidenceIds:
      fact
        ? [
            fact.id,
          ]
        : [],
  };
}

function calculateCalculatedDistanceConfidence(
  coordinateFact:
    SmartStayEvidenceFactV2,
  selectedLocation:
    SmartStayGeoPointV2
) {
  const selectedLocationConfidence =
    normalizeConfidence(
      selectedLocation.confidence,
      1
    );

  return clamp(
    Math.min(
      coordinateFact.confidence,
      selectedLocationConfidence
    ) *
    0.97,
    0,
    1
  );
}

function calculateDiscrepancyRatio(
  firstDistance:
    number,
  secondDistance:
    number
) {
  const denominator =
    Math.max(
      firstDistance,
      secondDistance,
      0.1
    );

  return (
    Math.abs(
      firstDistance -
      secondDistance
    ) /
    denominator
  );
}

function reconcileDistances(
  providerDistanceKm:
    number,
  providerConfidence:
    number,
  calculatedDistanceKm:
    number,
  calculatedConfidence:
    number,
  absoluteAgreementToleranceKm:
    number,
  relativeAgreementTolerance:
    number
): SelectedDistance {
  const discrepancyKm =
    Math.abs(
      providerDistanceKm -
      calculatedDistanceKm
    );

  const discrepancyRatio =
    calculateDiscrepancyRatio(
      providerDistanceKm,
      calculatedDistanceKm
    );

  const agreementToleranceKm =
    Math.max(
      absoluteAgreementToleranceKm,
      calculatedDistanceKm *
      relativeAgreementTolerance
    );

  if (
    discrepancyKm <=
    agreementToleranceKm
  ) {
    const totalConfidence =
      providerConfidence +
      calculatedConfidence;

    const reconciledDistance =
      totalConfidence > 0
        ? (
            providerDistanceKm *
              providerConfidence +
            calculatedDistanceKm *
              calculatedConfidence
          ) /
          totalConfidence
        : calculatedDistanceKm;

    const confidence =
      clamp(
        (
          providerConfidence +
          calculatedConfidence
        ) /
        2 +
        0.05,
        0,
        1
      );

    return {
      source:
        "reconciled",

      selectedDistanceKm:
        reconciledDistance,

      discrepancyKm,

      discrepancyRatio,

      confidence,

      warningCodes:
        [],
    };
  }

  return {
    source:
      "calculated",

    selectedDistanceKm:
      calculatedDistanceKm,

    discrepancyKm,

    discrepancyRatio,

    confidence:
      calculatedConfidence *
      0.75,

    warningCodes: [
      "provider-calculated-distance-conflict",
    ],
  };
}

function selectDistance(
  providerDistance:
    ProviderDistanceFacts,
  calculatedDistanceKm:
    number | null,
  calculatedConfidence:
    number,
  providerDistanceReference:
    SmartStayProviderDistanceReferenceV2,
  absoluteAgreementToleranceKm:
    number,
  relativeAgreementTolerance:
    number
): SelectedDistance {
  const providerDistanceKm =
    providerDistance.distanceKm;

  const providerConfidence =
    providerDistance.fact
      ?.confidence ??
    0;

  const providerMatchesSelectedLocation =
    providerDistanceReference ===
    "selected-location";

  if (
    providerDistanceKm !== null &&
    calculatedDistanceKm !== null &&
    providerMatchesSelectedLocation
  ) {
    return reconcileDistances(
      providerDistanceKm,
      providerConfidence,
      calculatedDistanceKm,
      calculatedConfidence,
      absoluteAgreementToleranceKm,
      relativeAgreementTolerance
    );
  }

  if (
    calculatedDistanceKm !== null
  ) {
    return {
      source:
        "calculated",

      selectedDistanceKm:
        calculatedDistanceKm,

      discrepancyKm:
        providerDistanceKm !== null
          ? Math.abs(
              providerDistanceKm -
              calculatedDistanceKm
            )
          : null,

      discrepancyRatio:
        providerDistanceKm !== null
          ? calculateDiscrepancyRatio(
              providerDistanceKm,
              calculatedDistanceKm
            )
          : null,

      confidence:
        calculatedConfidence,

      warningCodes:
        providerDistanceKm !== null &&
        !providerMatchesSelectedLocation
          ? [
              "provider-distance-reference-unverified",
            ]
          : [],
    };
  }

  if (
    providerDistanceKm !== null &&
    providerMatchesSelectedLocation
  ) {
    return {
      source:
        "provider-selected-location",

      selectedDistanceKm:
        providerDistanceKm,

      discrepancyKm:
        null,

      discrepancyRatio:
        null,

      confidence:
        providerConfidence,

      warningCodes:
        [],
    };
  }

  if (
    providerDistanceKm !== null
  ) {
    return {
      source:
        "provider-unverified",

      selectedDistanceKm:
        providerDistanceKm,

      discrepancyKm:
        null,

      discrepancyRatio:
        null,

      confidence:
        providerConfidence *
        0.55,

      warningCodes: [
        "provider-distance-reference-unverified",
      ],
    };
  }

  return {
    source:
      "unavailable",

    selectedDistanceKm:
      null,

    discrepancyKm:
      null,

    discrepancyRatio:
      null,

    confidence:
      0,

    warningCodes: [
      "location-distance-unavailable",
    ],
  };
}

function createDistanceConstraint(
  selectedDistance:
    SelectedDistance,
  maximumDistanceKm:
    number | null
): SmartStayDistanceConstraintV2 {
  if (
    maximumDistanceKm === null
  ) {
    return {
      provided:
        false,

      maximumDistanceKm:
        null,

      withinLimit:
        null,

      overageKm:
        null,

      utilizationRatio:
        null,
    };
  }

  if (
    selectedDistance.selectedDistanceKm ===
    null
  ) {
    return {
      provided:
        true,

      maximumDistanceKm:
        round(
          maximumDistanceKm
        ),

      withinLimit:
        null,

      overageKm:
        null,

      utilizationRatio:
        null,
    };
  }

  if (
    selectedDistance.source ===
    "provider-unverified"
  ) {
    return {
      provided:
        true,

      maximumDistanceKm:
        round(
          maximumDistanceKm
        ),

      withinLimit:
        null,

      overageKm:
        null,

      utilizationRatio:
        round(
          selectedDistance
            .selectedDistanceKm /
          maximumDistanceKm,
          4
        ),
    };
  }

  const withinLimit =
    selectedDistance.selectedDistanceKm <=
    maximumDistanceKm;

  return {
    provided:
      true,

    maximumDistanceKm:
      round(
        maximumDistanceKm
      ),

    withinLimit,

    overageKm:
      round(
        Math.max(
          selectedDistance
            .selectedDistanceKm -
          maximumDistanceKm,
          0
        )
      ),

    utilizationRatio:
      round(
        selectedDistance
          .selectedDistanceKm /
        maximumDistanceKm,
        4
      ),
  };
}

function calculateDistanceFitScore(
  distanceKm:
    number,
  maximumDistanceKm:
    number | null,
  unrestrictedDistanceScaleKm:
    number
) {
  if (
    maximumDistanceKm === null
  ) {
    return (
      100 *
      Math.exp(
        -distanceKm /
        unrestrictedDistanceScaleKm
      )
    );
  }

  const ratio =
    distanceKm /
    maximumDistanceKm;

  if (
    ratio <= 1
  ) {
    return clamp(
      100 -
      25 *
      (
        ratio **
        1.4
      ),
      0,
      100
    );
  }

  return clamp(
    75 *
    Math.exp(
      -4 *
      (
        ratio -
        1
      )
    ),
    0,
    100
  );
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

function calculateOverallConfidence(
  distanceConfidence:
    number,
  gate:
    SmartStayReliabilityGateV2
) {
  return clamp(
    distanceConfidence *
      0.8 +
    getReliabilityConfidence(
      gate
    ) *
      0.2,
    0,
    1
  );
}

function createInvalidEvaluation(
  input:
    SmartStayLocationInputV2,
  maximumDistanceKm:
    number | null,
  warningCode:
    string
): SmartStayLocationEvaluationV2 {
  return {
    hotelId:
      input.targetHotelId,

    status:
      "invalid",

    eligibleForPrimaryRanking:
      false,

    distance: {
      providerDistanceKm:
        null,

      calculatedDistanceKm:
        null,

      selectedDistanceKm:
        null,

      source:
        "unavailable",

      discrepancyKm:
        null,

      discrepancyRatio:
        null,
    },

    constraint: {
      provided:
        maximumDistanceKm !== null,

      maximumDistanceKm:
        maximumDistanceKm === null
          ? null
          : round(
              maximumDistanceKm
            ),

      withinLimit:
        null,

      overageKm:
        null,

      utilizationRatio:
        null,
    },

    score:
      null,

    confidence:
      0,

    warningCodes: [
      warningCode,
    ],

    evidenceIds:
      uniqueSorted(
        input
          .reliabilityGate
          .evidenceIds
      ),
  };
}

export function evaluateLocationV2(
  input:
    SmartStayLocationInputV2,
  options:
    SmartStayLocationOptionsV2 = {}
): SmartStayLocationEvaluationV2 {
  if (
    !input.targetHotelId.trim()
  ) {
    throw new Error(
      "Location evaluation requires a targetHotelId."
    );
  }

  if (
    input.selectedLocation
  ) {
    validateGeoPoint(
      input.selectedLocation,
      "Selected location"
    );
  }

  const maximumDistanceKm =
    validateMaximumDistance(
      input.maximumDistanceKm
    );

  if (
    input
      .reliabilityGate
      .status === "invalid"
  ) {
    return createInvalidEvaluation(
      input,
      maximumDistanceKm,
      "target-reliability-invalid"
    );
  }

  const minimumEvidenceConfidence =
    normalizeConfidence(
      options.minimumEvidenceConfidence,
      DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE
    );

  const absoluteAgreementToleranceKm =
    normalizePositiveNumber(
      options.absoluteAgreementToleranceKm,
      DEFAULT_ABSOLUTE_AGREEMENT_TOLERANCE_KM
    );

  const relativeAgreementTolerance =
    normalizePositiveNumber(
      options.relativeAgreementTolerance,
      DEFAULT_RELATIVE_AGREEMENT_TOLERANCE
    );

  const unrestrictedDistanceScaleKm =
    normalizePositiveNumber(
      options.unrestrictedDistanceScaleKm,
      DEFAULT_UNRESTRICTED_DISTANCE_SCALE_KM
    );

  const providerDistance =
    extractProviderDistance(
      input.evidence,
      minimumEvidenceConfidence
    );

  const propertyCoordinates =
    extractPropertyCoordinates(
      input.evidence,
      minimumEvidenceConfidence
    );

  let calculatedDistanceKm:
    number | null = null;

  let calculatedConfidence =
    0;

  if (
    input.selectedLocation &&
    propertyCoordinates.point &&
    propertyCoordinates.fact
  ) {
    calculatedDistanceKm =
      calculateHaversineDistanceKmV2(
        input.selectedLocation,
        propertyCoordinates.point
      );

    calculatedConfidence =
      calculateCalculatedDistanceConfidence(
        propertyCoordinates.fact,
        input.selectedLocation
      );
  }

  const providerDistanceReference =
    input.providerDistanceReference ??
    "unknown";

  const selectedDistance =
    selectDistance(
      providerDistance,
      calculatedDistanceKm,
      calculatedConfidence,
      providerDistanceReference,
      absoluteAgreementToleranceKm,
      relativeAgreementTolerance
    );

  const constraint =
    createDistanceConstraint(
      selectedDistance,
      maximumDistanceKm
    );

  const warningCodes = [
    ...selectedDistance
      .warningCodes,
  ];

  if (
    !input.selectedLocation
  ) {
    warningCodes.push(
      "selected-location-coordinates-unavailable"
    );
  }

  if (
    !propertyCoordinates.point
  ) {
    warningCodes.push(
      "property-coordinates-unavailable"
    );
  }

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
    maximumDistanceKm !== null &&
    constraint.withinLimit === null
  ) {
    warningCodes.push(
      "explicit-distance-limit-unverified"
    );
  }

  if (
    constraint.withinLimit === false
  ) {
    warningCodes.push(
      "outside-explicit-distance-limit"
    );
  }

  const score =
    selectedDistance.selectedDistanceKm ===
    null
      ? null
      : calculateDistanceFitScore(
          selectedDistance
            .selectedDistanceKm,
          maximumDistanceKm,
          unrestrictedDistanceScaleKm
        );

  const confidence =
    calculateOverallConfidence(
      selectedDistance.confidence,
      input.reliabilityGate
    );

  const normalizedWarnings =
    uniqueSorted(
      warningCodes
    );

  let status:
    SmartStayLocationStatusV2;

  if (
    score === null
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
      selectedDistance.source !==
        "provider-unverified" &&
      confidence >= 0.85 &&
      normalizedWarnings.length ===
        0;

    status =
      strongData
        ? "strong-data"
        : "usable";
  }

  const explicitConstraintSatisfied =
    maximumDistanceKm === null ||
    constraint.withinLimit === true;

  return {
    hotelId:
      input.targetHotelId,

    status,

    eligibleForPrimaryRanking:
      input
        .reliabilityGate
        .eligible === true &&
      score !== null &&
      explicitConstraintSatisfied,

    distance: {
      providerDistanceKm:
        providerDistance.distanceKm ===
        null
          ? null
          : round(
              providerDistance
                .distanceKm
            ),

      calculatedDistanceKm:
        calculatedDistanceKm === null
          ? null
          : round(
              calculatedDistanceKm
            ),

      selectedDistanceKm:
        selectedDistance
          .selectedDistanceKm === null
          ? null
          : round(
              selectedDistance
                .selectedDistanceKm
            ),

      source:
        selectedDistance.source,

      discrepancyKm:
        selectedDistance
          .discrepancyKm === null
          ? null
          : round(
              selectedDistance
                .discrepancyKm
            ),

      discrepancyRatio:
        selectedDistance
          .discrepancyRatio === null
          ? null
          : round(
              selectedDistance
                .discrepancyRatio,
              4
            ),
    },

    constraint,

    score:
      score === null
        ? null
        : round(
            score,
            2
          ),

    confidence:
      round(
        confidence,
        4
      ),

    warningCodes:
      normalizedWarnings,

    evidenceIds:
      uniqueSorted([
        ...providerDistance
          .evidenceIds,

        ...propertyCoordinates
          .evidenceIds,

        ...input
          .reliabilityGate
          .evidenceIds,
      ]),
  };
}
