import type {
  SmartStayDataConfidenceLevelV2,
  SmartStayDataConfidenceV2,
  SmartStayEvidenceAvailability,
  SmartStayEvidenceFactV2,
} from "../model/smartStayEvaluationV2";

export interface SmartStayDataConfidenceInputV2 {
  evidence:
    SmartStayEvidenceFactV2[];
}

export interface SmartStayDataConfidenceOptionsV2 {
  fieldWeights?:
    Partial<
      Record<
        string,
        number
      >
    >;

  mediumThreshold?:
    number;

  highThreshold?:
    number;

  lowConfidenceThreshold?:
    number;
}

export interface SmartStayDataConfidenceFieldV2 {
  code:
    string;

  availability:
    SmartStayEvidenceAvailability;

  weight:
    number;

  confidence:
    number;

  contribution:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayDataConfidenceEvaluationV2
  extends SmartStayDataConfidenceV2 {
  conflictingFieldCodes:
    string[];

  lowConfidenceFieldCodes:
    string[];

  weightedCoverage:
    number;

  criticalCoverage:
    number;

  fields:
    SmartStayDataConfidenceFieldV2[];
}

type ResolvedField = {
  availability:
    SmartStayEvidenceAvailability;

  confidence:
    number;

  evidenceIds:
    string[];
};

export const SMARTSTAY_DATA_CONFIDENCE_FIELD_WEIGHTS:
  Readonly<
    Record<
      string,
      number
    >
  > = {
    "stay.cost.total":
      4,

    "stay.currency":
      3,

    "offer.bookable":
      3,

    "offer.count":
      2.5,

    "stay.cost.completeness":
      2.5,

    "offer.refundable":
      1.5,

    "location.distance":
      1.5,

    "location.coordinates":
      1.5,

    "review.score":
      1.5,

    "review.count":
      1.5,

    "offer.cancellation":
      1,

    "offer.free-cancellation-until":
      0.8,

    "offer.cancellation-penalty":
      0.8,

    "property.amenities":
      0.75,

    "property.stars":
      0.75,

    "property.address":
      0.5,

    "property.image":
      0.25,
  };

export const SMARTSTAY_DATA_CONFIDENCE_CRITICAL_FIELDS =
  [
    "stay.cost.total",
    "stay.currency",
    "offer.count",
    "offer.bookable",
  ] as const;

const DEFAULT_MEDIUM_THRESHOLD =
  55;

const DEFAULT_HIGH_THRESHOLD =
  80;

const DEFAULT_LOW_CONFIDENCE_THRESHOLD =
  0.6;

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

function normalizeThreshold(
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
    100
  );
}

function normalizeConfidence(
  value:
    unknown
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return clamp(
    value,
    0,
    1
  );
}

function createValueKey(
  value:
    SmartStayEvidenceFactV2["value"]
) {
  return [
    typeof value,
    JSON.stringify(
      value
    ),
  ].join(":");
}

function resolveField(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string
): ResolvedField {
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
      availability:
        "conflicting",

      confidence:
        0,

      evidenceIds,
    };
  }

  const knownFacts =
    facts.filter(
      (fact) =>
        fact.availability ===
        "known"
    );

  const knownValues =
    new Set(
      knownFacts.map(
        (fact) =>
          createValueKey(
            fact.value
          )
      )
    );

  if (
    knownValues.size > 1
  ) {
    return {
      availability:
        "conflicting",

      confidence:
        0,

      evidenceIds,
    };
  }

  if (
    knownFacts.length > 0
  ) {
    return {
      availability:
        "known",

      confidence:
        Math.max(
          ...knownFacts.map(
            (fact) =>
              normalizeConfidence(
                fact.confidence
              )
          ),
          0
        ),

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
      availability:
        "not-applicable",

      confidence:
        Math.max(
          ...facts.map(
            (fact) =>
              normalizeConfidence(
                fact.confidence
              )
          ),
          0
        ),

      evidenceIds,
    };
  }

  return {
    availability:
      "unknown",

    confidence:
      0,

    evidenceIds,
  };
}

function createFieldWeights(
  customWeights:
    SmartStayDataConfidenceOptionsV2[
      "fieldWeights"
    ]
) {
  const weights:
    Record<
      string,
      number
    > = {
      ...SMARTSTAY_DATA_CONFIDENCE_FIELD_WEIGHTS,
    };

  for (
    const [
      code,
      weight,
    ]
    of Object.entries(
      customWeights ??
      {}
    )
  ) {
    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0
    ) {
      throw new Error(
        `Invalid data-confidence weight: ${code}`
      );
    }

    weights[code] =
      weight;
  }

  return weights;
}

function getLevel(
  score:
    number,
  knownFieldCodes:
    string[],
  criticalCoverage:
    number,
  conflictingFieldCodes:
    string[],
  lowConfidenceFieldCodes:
    string[],
  mediumThreshold:
    number,
  highThreshold:
    number
): SmartStayDataConfidenceLevelV2 {
  if (
    knownFieldCodes.length === 0
  ) {
    return "none";
  }

  const criticalFields =
    new Set<string>(
      SMARTSTAY_DATA_CONFIDENCE_CRITICAL_FIELDS
    );

  const criticalConflict =
    conflictingFieldCodes.some(
      (code) =>
        criticalFields.has(
          code
        )
    );

  const criticalLowConfidence =
    lowConfidenceFieldCodes.some(
      (code) =>
        criticalFields.has(
          code
        )
    );

  if (
    score >= highThreshold &&
    criticalCoverage >= 80 &&
    !criticalConflict &&
    !criticalLowConfidence
  ) {
    return "high";
  }

  if (
    score >= mediumThreshold
  ) {
    return "medium";
  }

  return "low";
}

export function evaluateDataConfidenceV2(
  input:
    SmartStayDataConfidenceInputV2,
  options:
    SmartStayDataConfidenceOptionsV2 = {}
): SmartStayDataConfidenceEvaluationV2 {
  const weights =
    createFieldWeights(
      options.fieldWeights
    );

  const mediumThreshold =
    normalizeThreshold(
      options.mediumThreshold,
      DEFAULT_MEDIUM_THRESHOLD
    );

  const highThreshold =
    Math.max(
      mediumThreshold,
      normalizeThreshold(
        options.highThreshold,
        DEFAULT_HIGH_THRESHOLD
      )
    );

  const lowConfidenceThreshold =
    clamp(
      typeof options
        .lowConfidenceThreshold ===
        "number" &&
      Number.isFinite(
        options.lowConfidenceThreshold
      )
        ? options.lowConfidenceThreshold
        : DEFAULT_LOW_CONFIDENCE_THRESHOLD,
      0,
      1
    );

  const fields =
    Object.keys(
      weights
    )
      .sort()
      .map(
        (
          code
        ): SmartStayDataConfidenceFieldV2 => {
          const resolved =
            resolveField(
              input.evidence,
              code
            );

          const weight =
            weights[code] ??
            0;

          const contribution =
            resolved.availability ===
            "known"
              ? weight *
                resolved.confidence
              : 0;

          return {
            code,

            availability:
              resolved.availability,

            weight:
              round(
                weight,
                3
              ),

            confidence:
              round(
                resolved.confidence,
                4
              ),

            contribution:
              round(
                contribution,
                4
              ),

            evidenceIds:
              resolved.evidenceIds,
          };
        }
      );

  const applicableFields =
    fields.filter(
      (field) =>
        field.weight > 0 &&
        field.availability !==
        "not-applicable"
    );

  const knownFields =
    applicableFields.filter(
      (field) =>
        field.availability ===
        "known"
    );

  const applicableWeight =
    applicableFields.reduce(
      (
        total,
        field
      ) =>
        total +
        field.weight,
      0
    );

  const knownWeight =
    knownFields.reduce(
      (
        total,
        field
      ) =>
        total +
        field.weight,
      0
    );

  const weightedContribution =
    knownFields.reduce(
      (
        total,
        field
      ) =>
        total +
        field.contribution,
      0
    );

  const score =
    applicableWeight > 0
      ? clamp(
          weightedContribution /
          applicableWeight *
          100,
          0,
          100
        )
      : 0;

  const criticalFields =
    fields.filter(
      (field) =>
        (
          SMARTSTAY_DATA_CONFIDENCE_CRITICAL_FIELDS as
            readonly string[]
        ).includes(
          field.code
        ) &&
        field.availability !==
          "not-applicable"
    );

  const criticalWeight =
    criticalFields.reduce(
      (
        total,
        field
      ) =>
        total +
        field.weight,
      0
    );

  const criticalContribution =
    criticalFields.reduce(
      (
        total,
        field
      ) =>
        total +
        field.contribution,
      0
    );

  const criticalCoverage =
    criticalWeight > 0
      ? criticalContribution /
        criticalWeight *
        100
      : 0;

  const knownFieldCodes =
    uniqueSorted(
      knownFields.map(
        (field) =>
          field.code
      )
    );

  const unknownFieldCodes =
    uniqueSorted(
      applicableFields
        .filter(
          (field) =>
            field.availability ===
            "unknown"
        )
        .map(
          (field) =>
            field.code
        )
    );

  const notApplicableFieldCodes =
    uniqueSorted(
      fields
        .filter(
          (field) =>
            field.availability ===
            "not-applicable"
        )
        .map(
          (field) =>
            field.code
        )
    );

  const conflictingFieldCodes =
    uniqueSorted(
      applicableFields
        .filter(
          (field) =>
            field.availability ===
            "conflicting"
        )
        .map(
          (field) =>
            field.code
        )
    );

  const lowConfidenceFieldCodes =
    uniqueSorted(
      knownFields
        .filter(
          (field) =>
            field.confidence <
            lowConfidenceThreshold
        )
        .map(
          (field) =>
            field.code
        )
    );

  const normalizedScore =
    round(
      score
    );

  return {
    score:
      normalizedScore,

    level:
      getLevel(
        normalizedScore,
        knownFieldCodes,
        criticalCoverage,
        conflictingFieldCodes,
        lowConfidenceFieldCodes,
        mediumThreshold,
        highThreshold
      ),

    knownFieldCodes,

    unknownFieldCodes,

    notApplicableFieldCodes,

    conflictingFieldCodes,

    lowConfidenceFieldCodes,

    weightedCoverage:
      round(
        applicableWeight > 0
          ? knownWeight /
            applicableWeight *
            100
          : 0
      ),

    criticalCoverage:
      round(
        criticalCoverage
      ),

    evidenceIds:
      uniqueSorted(
        fields.flatMap(
          (field) =>
            field.evidenceIds
        )
      ),

    fields,
  };
}