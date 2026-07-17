import type {
  SmartStayDimensionScoreV2,
  SmartStayReliabilityGateV2,
  SmartStayScoreBreakdownV2,
} from "../model/smartStayEvaluationV2";

export type SmartStayUtilityStatusV2 =
  | "invalid"
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayUtilityPreferenceIdV2 =
  | "maximum-comfort"
  | "comfort"
  | "balanced"
  | "savings"
  | "maximum-savings";

export type SmartStayUtilityPreferenceSourceV2 =
  | "automatic"
  | "manual"
  | "default";

export type SmartStayUtilityDimensionCodeV2 =
  | "priceValue"
  | "quality"
  | "location"
  | "comfort"
  | "flexibility"
  | "categoryFit"
  | "userFit";

export interface SmartStayUserUtilityInputV2 {
  targetHotelId:
    string;

  scores:
    SmartStayScoreBreakdownV2;

  reliabilityGate:
    SmartStayReliabilityGateV2;

  preferenceId?:
    SmartStayUtilityPreferenceIdV2 |
    string |
    null;

  selectedIndex?:
    number |
    null;

  preferenceSource?:
    SmartStayUtilityPreferenceSourceV2;
}

export interface SmartStayUserUtilityOptionsV2 {
  customWeights?:
    Partial<
      Record<
        SmartStayUtilityDimensionCodeV2,
        number
      >
    >;

  minimumStrongCoverage?:
    number;

  minimumStrongConfidence?:
    number;

  lowCoverageThreshold?:
    number;

  lowConfidenceThreshold?:
    number;
}

export interface SmartStayUtilityPreferenceV2 {
  id:
    SmartStayUtilityPreferenceIdV2;

  selectedIndex:
    number;

  source:
    SmartStayUtilityPreferenceSourceV2;

  weights:
    Record<
      SmartStayUtilityDimensionCodeV2,
      number
    >;
}

export interface SmartStayUtilityContributionV2 {
  dimension:
    SmartStayUtilityDimensionCodeV2;

  available:
    boolean;

  score:
    number | null;

  confidence:
    number;

  configuredWeight:
    number;

  normalizedAvailableWeight:
    number;

  weightedValue:
    number;

  signalCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayUserUtilityEvaluationV2 {
  hotelId:
    string;

  status:
    SmartStayUtilityStatusV2;

  eligibleForPrimaryRanking:
    boolean;

  preference:
    SmartStayUtilityPreferenceV2;

  rawUtilityScore:
    number | null;

  utilityScore:
    number | null;

  scoreConfidence:
    number;

  evidenceCoverage:
    number;

  availableDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  unavailableDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  contributions:
    SmartStayUtilityContributionV2[];

  warningCodes:
    string[];

  evidenceIds:
    string[];
}

type ResolvedPreference = {
  id:
    SmartStayUtilityPreferenceIdV2;

  selectedIndex:
    number;

  source:
    SmartStayUtilityPreferenceSourceV2;

  warningCodes:
    string[];
};

type NormalizedDimension = {
  score:
    number | null;

  confidence:
    number;

  signalCodes:
    string[];

  evidenceIds:
    string[];

  invalid:
    boolean;
};

const PREFERENCE_IDS:
  readonly SmartStayUtilityPreferenceIdV2[] = [
    "maximum-comfort",
    "comfort",
    "balanced",
    "savings",
    "maximum-savings",
  ];

const DIMENSION_CODES:
  readonly SmartStayUtilityDimensionCodeV2[] = [
    "priceValue",
    "quality",
    "location",
    "comfort",
    "flexibility",
    "categoryFit",
    "userFit",
  ];

const BASE_WEIGHTS:
  Readonly<
    Record<
      SmartStayUtilityPreferenceIdV2,
      Readonly<
        Record<
          SmartStayUtilityDimensionCodeV2,
          number
        >
      >
    >
  > = {
    "maximum-comfort": {
      priceValue:
        0.1,

      quality:
        0.28,

      location:
        0.2,

      comfort:
        0.2,

      flexibility:
        0.1,

      categoryFit:
        0.05,

      userFit:
        0.07,
    },

    comfort: {
      priceValue:
        0.16,

      quality:
        0.26,

      location:
        0.2,

      comfort:
        0.17,

      flexibility:
        0.09,

      categoryFit:
        0.05,

      userFit:
        0.07,
    },

    balanced: {
      priceValue:
        0.26,

      quality:
        0.22,

      location:
        0.18,

      comfort:
        0.13,

      flexibility:
        0.08,

      categoryFit:
        0.05,

      userFit:
        0.08,
    },

    savings: {
      priceValue:
        0.4,

      quality:
        0.18,

      location:
        0.14,

      comfort:
        0.09,

      flexibility:
        0.07,

      categoryFit:
        0.04,

      userFit:
        0.08,
    },

    "maximum-savings": {
      priceValue:
        0.52,

      quality:
        0.15,

      location:
        0.1,

      comfort:
        0.06,

      flexibility:
        0.05,

      categoryFit:
        0.03,

      userFit:
        0.09,
    },
  };

const DEFAULT_MINIMUM_STRONG_COVERAGE =
  0.8;

const DEFAULT_MINIMUM_STRONG_CONFIDENCE =
  0.8;

const DEFAULT_LOW_COVERAGE_THRESHOLD =
  0.55;

const DEFAULT_LOW_CONFIDENCE_THRESHOLD =
  0.55;

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

function uniqueSorted<
  Value extends string
>(
  values:
    Value[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort() as Value[];
}

function normalizeRatio(
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

function isPreferenceId(
  value:
    unknown
): value is SmartStayUtilityPreferenceIdV2 {
  return (
    typeof value === "string" &&
    (
      PREFERENCE_IDS as
        readonly string[]
    ).includes(
      value
    )
  );
}

function resolvePreference(
  input:
    SmartStayUserUtilityInputV2
): ResolvedPreference {
  const source =
    input.preferenceSource ??
    (
      input.preferenceId ||
      input.selectedIndex !==
        null &&
      input.selectedIndex !==
        undefined
        ? "automatic"
        : "default"
    );

  if (
    isPreferenceId(
      input.preferenceId
    )
  ) {
    return {
      id:
        input.preferenceId,

      selectedIndex:
        PREFERENCE_IDS.indexOf(
          input.preferenceId
        ),

      source,

      warningCodes:
        [],
    };
  }

  if (
    typeof input.selectedIndex ===
      "number" &&
    Number.isFinite(
      input.selectedIndex
    )
  ) {
    const roundedIndex =
      Math.round(
        input.selectedIndex
      );

    const selectedIndex =
      clamp(
        roundedIndex,
        0,
        PREFERENCE_IDS.length - 1
      );

    return {
      id:
        PREFERENCE_IDS[
          selectedIndex
        ],

      selectedIndex,

      source,

      warningCodes:
        roundedIndex ===
        selectedIndex
          ? []
          : [
              "preference-index-clamped",
            ],
    };
  }

  return {
    id:
      "balanced",

    selectedIndex:
      2,

    source:
      "default",

    warningCodes:
      input.preferenceId
        ? [
            "preference-id-invalid-defaulted",
          ]
        : [
            "preference-defaulted-balanced",
          ],
  };
}

function createWeights(
  preferenceId:
    SmartStayUtilityPreferenceIdV2,
  customWeights:
    SmartStayUserUtilityOptionsV2[
      "customWeights"
    ]
) {
  const weights:
    Record<
      SmartStayUtilityDimensionCodeV2,
      number
    > = {
      ...BASE_WEIGHTS[
        preferenceId
      ],
    };

  for (
    const dimension
    of DIMENSION_CODES
  ) {
    if (
      !Object.prototype
        .hasOwnProperty.call(
          customWeights ??
          {},
          dimension
        )
    ) {
      continue;
    }

    const customWeight =
      customWeights?.[
        dimension
      ];

    if (
      typeof customWeight !==
        "number" ||
      !Number.isFinite(
        customWeight
      ) ||
      customWeight < 0
    ) {
      throw new Error(
        `Invalid utility weight: ${dimension}`
      );
    }

    weights[dimension] =
      customWeight;
  }

  const totalWeight =
    DIMENSION_CODES.reduce(
      (
        total,
        dimension
      ) =>
        total +
        weights[dimension],
      0
    );

  if (
    totalWeight <= 0
  ) {
    throw new Error(
      "User Utility Engine requires at least one positive weight."
    );
  }

  for (
    const dimension
    of DIMENSION_CODES
  ) {
    weights[dimension] =
      weights[dimension] /
      totalWeight;
  }

  return weights;
}

function normalizeDimension(
  dimension:
    SmartStayDimensionScoreV2
): NormalizedDimension {
  const evidenceIds =
    uniqueSorted(
      dimension.evidenceIds
    );

  const signalCodes =
    uniqueSorted(
      dimension.signalCodes
    );

  if (
    dimension.score === null
  ) {
    return {
      score:
        null,

      confidence:
        0,

      signalCodes,

      evidenceIds,

      invalid:
        false,
    };
  }

  if (
    typeof dimension.score !==
      "number" ||
    !Number.isFinite(
      dimension.score
    ) ||
    dimension.score < 0 ||
    dimension.score > 100
  ) {
    return {
      score:
        null,

      confidence:
        0,

      signalCodes,

      evidenceIds,

      invalid:
        true,
    };
  }

  return {
    score:
      round(
        dimension.score
      ),

    confidence:
      round(
        normalizeRatio(
          dimension.confidence,
          0
        ),
        4
      ),

    signalCodes,

    evidenceIds,

    invalid:
      false,
  };
}

function getDimension(
  scores:
    SmartStayScoreBreakdownV2,
  code:
    SmartStayUtilityDimensionCodeV2
) {
  return scores[code];
}

export function evaluateUserUtilityV2(
  input:
    SmartStayUserUtilityInputV2,
  options:
    SmartStayUserUtilityOptionsV2 = {}
): SmartStayUserUtilityEvaluationV2 {
  if (
    typeof input.targetHotelId !==
      "string" ||
    !input.targetHotelId.trim()
  ) {
    throw new Error(
      "User Utility Engine requires a targetHotelId."
    );
  }

  const resolvedPreference =
    resolvePreference(
      input
    );

  const weights =
    createWeights(
      resolvedPreference.id,
      options.customWeights
    );

  const warningCodes = [
    ...resolvedPreference
      .warningCodes,
  ];

  const normalizedDimensions =
    new Map<
      SmartStayUtilityDimensionCodeV2,
      NormalizedDimension
    >();

  for (
    const dimension
    of DIMENSION_CODES
  ) {
    const normalized =
      normalizeDimension(
        getDimension(
          input.scores,
          dimension
        )
      );

    normalizedDimensions.set(
      dimension,
      normalized
    );

    if (normalized.invalid) {
      warningCodes.push(
        `dimension-score-invalid:${dimension}`
      );
    }
  }

  const totalConfiguredWeight =
    DIMENSION_CODES.reduce(
      (
        total,
        dimension
      ) =>
        total +
        weights[dimension],
      0
    );

  const availableDimensions =
    DIMENSION_CODES.filter(
      (dimension) => {
        const normalized =
          normalizedDimensions.get(
            dimension
          );

        return Boolean(
          normalized &&
          normalized.score !==
            null &&
          weights[dimension] > 0
        );
      }
    );

  const unavailableDimensions =
    DIMENSION_CODES.filter(
      (dimension) =>
        !availableDimensions.includes(
          dimension
        ) &&
        weights[dimension] > 0
    );

  const availableWeight =
    availableDimensions.reduce(
      (
        total,
        dimension
      ) =>
        total +
        weights[dimension],
      0
    );

  const rawUtilityScore =
    availableWeight > 0
      ? availableDimensions.reduce(
          (
            total,
            dimension
          ) => {
            const normalized =
              normalizedDimensions.get(
                dimension
              );

            return (
              total +
              (
                normalized?.score ??
                0
              ) *
              weights[dimension]
            );
          },
          0
        ) /
        availableWeight
      : null;

  const evidenceCoverage =
    totalConfiguredWeight > 0
      ? availableWeight /
        totalConfiguredWeight
      : 0;

  const scoreConfidence =
    totalConfiguredWeight > 0
      ? DIMENSION_CODES.reduce(
          (
            total,
            dimension
          ) => {
            const normalized =
              normalizedDimensions.get(
                dimension
              );

            return (
              total +
              (
                normalized?.score !==
                null
                  ? normalized
                      ?.confidence ??
                    0
                  : 0
              ) *
              weights[dimension]
            );
          },
          0
        ) /
        totalConfiguredWeight
      : 0;

  const contributions =
    DIMENSION_CODES.map(
      (
        dimension
      ): SmartStayUtilityContributionV2 => {
        const normalized =
          normalizedDimensions.get(
            dimension
          ) ?? {
            score:
              null,

            confidence:
              0,

            signalCodes:
              [],

            evidenceIds:
              [],

            invalid:
              false,
          };

        const available =
          normalized.score !==
            null &&
          weights[dimension] >
            0;

        const normalizedAvailableWeight =
          available &&
          availableWeight > 0
            ? weights[dimension] /
              availableWeight
            : 0;

        return {
          dimension,

          available,

          score:
            normalized.score,

          confidence:
            normalized.confidence,

          configuredWeight:
            round(
              weights[dimension],
              4
            ),

          normalizedAvailableWeight:
            round(
              normalizedAvailableWeight,
              4
            ),

          weightedValue:
            round(
              available
                ? (
                    normalized.score ??
                    0
                  ) *
                  normalizedAvailableWeight
                : 0,
              4
            ),

          signalCodes:
            normalized.signalCodes,

          evidenceIds:
            normalized.evidenceIds,
        };
      }
    );

  const minimumStrongCoverage =
    normalizeRatio(
      options.minimumStrongCoverage,
      DEFAULT_MINIMUM_STRONG_COVERAGE
    );

  const minimumStrongConfidence =
    normalizeRatio(
      options.minimumStrongConfidence,
      DEFAULT_MINIMUM_STRONG_CONFIDENCE
    );

  const lowCoverageThreshold =
    normalizeRatio(
      options.lowCoverageThreshold,
      DEFAULT_LOW_COVERAGE_THRESHOLD
    );

  const lowConfidenceThreshold =
    normalizeRatio(
      options.lowConfidenceThreshold,
      DEFAULT_LOW_CONFIDENCE_THRESHOLD
    );

  if (
    unavailableDimensions.length >
    0
  ) {
    warningCodes.push(
      ...unavailableDimensions.map(
        (dimension) =>
          `utility-dimension-unavailable:${dimension}`
      )
    );
  }

  if (
    evidenceCoverage <
    lowCoverageThreshold
  ) {
    warningCodes.push(
      "utility-evidence-coverage-low"
    );
  }

  if (
    scoreConfidence <
    lowConfidenceThreshold
  ) {
    warningCodes.push(
      "utility-score-confidence-low"
    );
  }

  if (
    input.reliabilityGate
      .eligible === false
  ) {
    warningCodes.push(
      "target-not-eligible-for-primary-ranking"
    );
  }

  let status:
    SmartStayUtilityStatusV2;

  let utilityScore:
    number | null =
      rawUtilityScore === null
        ? null
        : round(
            rawUtilityScore
          );

  if (
    input.reliabilityGate
      .status === "invalid"
  ) {
    status =
      "invalid";

    utilityScore =
      null;
  }
  else if (
    utilityScore === null
  ) {
    status =
      "unavailable";
  }
  else {
    const strongData =
      input.reliabilityGate
        .status ===
        "strong-data" &&
      input.reliabilityGate
        .eligible === true &&
      evidenceCoverage >=
        minimumStrongCoverage &&
      scoreConfidence >=
        minimumStrongConfidence;

    status =
      strongData
        ? "strong-data"
        : "usable";
  }

  return {
    hotelId:
      input.targetHotelId
        .trim(),

    status,

    eligibleForPrimaryRanking:
      input.reliabilityGate
        .eligible === true &&
      utilityScore !== null,

    preference: {
      id:
        resolvedPreference.id,

      selectedIndex:
        resolvedPreference
          .selectedIndex,

      source:
        resolvedPreference.source,

      weights:
        Object.fromEntries(
          DIMENSION_CODES.map(
            (dimension) => [
              dimension,
              round(
                weights[dimension],
                4
              ),
            ]
          )
        ) as Record<
          SmartStayUtilityDimensionCodeV2,
          number
        >,
    },

    rawUtilityScore:
      rawUtilityScore === null
        ? null
        : round(
            rawUtilityScore,
            4
          ),

    utilityScore,

    scoreConfidence:
      round(
        scoreConfidence,
        4
      ),

    evidenceCoverage:
      round(
        evidenceCoverage,
        4
      ),

    availableDimensionCodes:
      uniqueSorted(
        availableDimensions
      ),

    unavailableDimensionCodes:
      uniqueSorted(
        unavailableDimensions
      ),

    contributions,

    warningCodes:
      uniqueSorted(
        warningCodes
      ),

    evidenceIds:
      uniqueSorted([
        ...contributions.flatMap(
          (contribution) =>
            contribution.evidenceIds
        ),

        ...input
          .reliabilityGate
          .evidenceIds,
      ]),
  };
}