import {
  createStableHashV3,
} from "../contract/stableHashV3";

export type StayOptiPreferenceIdV3 =
  | "maximum-comfort"
  | "comfort"
  | "balanced"
  | "savings"
  | "maximum-savings";

export type StayOptiPreferenceOriginV3 =
  | "declared"
  | "inferred"
  | "neutral-default";

export type StayOptiTripTypeV3 =
  | "leisure"
  | "business"
  | "family"
  | "group"
  | "long-stay"
  | "mixed";

export type StayOptiUtilityDimensionV3 =
  | "priceValue"
  | "quality"
  | "location"
  | "comfort"
  | "flexibility"
  | "categoryFit"
  | "userFit";

export interface StayOptiPreferenceResolutionInputV3 {
  preferenceId?:
    unknown;

  preferenceSource?:
    unknown;

  nights?:
    number |
    null;

  adults?:
    number |
    null;

  children?:
    number |
    null;

  rooms?:
    number |
    null;

  tripType?:
    StayOptiTripTypeV3 |
    null;
}

export interface StayOptiPreferenceResolutionV3 {
  declaredPreferenceId:
    StayOptiPreferenceIdV3 |
    null;

  inferredPreferenceId:
    StayOptiPreferenceIdV3 |
    null;

  resolvedPreferenceId:
    StayOptiPreferenceIdV3;

  origin:
    StayOptiPreferenceOriginV3;

  reasonCodes:
    string[];
}

export interface StayOptiUtilityDimensionInputV3 {
  score:
    number |
    null;

  confidence:
    number;

  evidenceIds:
    string[];
}

export interface StayOptiPersonalUtilityContextV3 {
  totalBudget:
    number |
    null;

  totalCost:
    number |
    null;

  nights:
    number |
    null;

  adults:
    number |
    null;

  children:
    number |
    null;

  rooms:
    number |
    null;

  maximumDistanceKm:
    number |
    null;

  leadTimeDays:
    number |
    null;

  tripType:
    StayOptiTripTypeV3;
}

export interface EvaluateStayOptiPersonalUtilityInputV3 {
  hotelId:
    string;

  preference:
    StayOptiPreferenceResolutionV3;

  context:
    StayOptiPersonalUtilityContextV3;

  dimensions:
    Record<
      StayOptiUtilityDimensionV3,
      StayOptiUtilityDimensionInputV3
    >;
}

export interface StayOptiUtilityInteractionV3 {
  code:
    string;

  dimension:
    StayOptiUtilityDimensionV3;

  weightDelta:
    number;
}

export interface StayOptiUtilityContributionV3 {
  dimension:
    StayOptiUtilityDimensionV3;

  available:
    boolean;

  sourceScore:
    number |
    null;

  transformedScore:
    number |
    null;

  confidence:
    number;

  configuredWeight:
    number;

  normalizedAvailableWeight:
    number;

  weightedValue:
    number;

  curve:
    "budget-no-spend-bias" |
    "diminishing-returns" |
    "unavailable";

  evidenceIds:
    string[];
}

export interface StayOptiPersonalUtilityEvaluationV3 {
  evaluationId:
    string;

  hotelId:
    string;

  status:
    "usable" |
    "unavailable";

  preference:
    StayOptiPreferenceResolutionV3;

  context:
    StayOptiPersonalUtilityContextV3;

  dimensions:
    Record<
      StayOptiUtilityDimensionV3,
      StayOptiUtilityDimensionInputV3
    >;

  interactions:
    StayOptiUtilityInteractionV3[];

  weights:
    Record<
      StayOptiUtilityDimensionV3,
      number
    >;

  contributions:
    StayOptiUtilityContributionV3[];

  utilityScore:
    number |
    null;

  scoreConfidence:
    number;

  evidenceCoverage:
    number;

  reasonCodes:
    string[];

  fingerprint:
    string;
}

const PREFERENCE_IDS:
  readonly StayOptiPreferenceIdV3[] = [
    "maximum-comfort",
    "comfort",
    "balanced",
    "savings",
    "maximum-savings",
  ];

const DIMENSIONS:
  readonly StayOptiUtilityDimensionV3[] = [
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
      StayOptiPreferenceIdV3,
      Readonly<
        Record<
          StayOptiUtilityDimensionV3,
          number
        >
      >
    >
  > = {
    "maximum-comfort": {
      priceValue: 0.1,
      quality: 0.28,
      location: 0.2,
      comfort: 0.2,
      flexibility: 0.1,
      categoryFit: 0.05,
      userFit: 0.07,
    },
    comfort: {
      priceValue: 0.16,
      quality: 0.26,
      location: 0.2,
      comfort: 0.17,
      flexibility: 0.09,
      categoryFit: 0.05,
      userFit: 0.07,
    },
    balanced: {
      priceValue: 0.26,
      quality: 0.22,
      location: 0.18,
      comfort: 0.13,
      flexibility: 0.08,
      categoryFit: 0.05,
      userFit: 0.08,
    },
    savings: {
      priceValue: 0.4,
      quality: 0.18,
      location: 0.14,
      comfort: 0.09,
      flexibility: 0.07,
      categoryFit: 0.04,
      userFit: 0.08,
    },
    "maximum-savings": {
      priceValue: 0.52,
      quality: 0.15,
      location: 0.1,
      comfort: 0.06,
      flexibility: 0.05,
      categoryFit: 0.03,
      userFit: 0.09,
    },
  };

function clamp(
  value:
    number,
  minimum =
    0,
  maximum =
    1
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
  digits =
    4
) {
  const factor =
    10 ** digits;

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
    factor
  ) /
  factor;
}

function uniqueSorted(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values.filter(
        Boolean
      )
    ),
  ].sort();
}

function normalizeCount(
  value:
    unknown,
  allowZero:
    boolean
) {
  return typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    (
      allowZero
        ? value >= 0
        : value > 0
    )
    ? value
    : null;
}

function normalizePositive(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
    ? value
    : null;
}

function normalizeNonNegative(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >= 0
    ? value
    : null;
}

export function isStayOptiPreferenceIdV3(
  value:
    unknown
): value is StayOptiPreferenceIdV3 {
  return typeof value ===
      "string" &&
    (
      PREFERENCE_IDS as
        readonly string[]
    ).includes(
      value
    );
}

function inferTripType(
  input:
    StayOptiPreferenceResolutionInputV3
): StayOptiTripTypeV3 {
  if (
    input.tripType
  ) {
    return input.tripType;
  }

  if (
    normalizeCount(
      input.children,
      true
    ) !== null &&
    (
      input.children ??
      0
    ) > 0
  ) {
    return "family";
  }

  if (
    (
      normalizeCount(
        input.adults,
        false
      ) ??
      0
    ) >= 3 ||
    (
      normalizeCount(
        input.rooms,
        false
      ) ??
      0
    ) >= 2
  ) {
    return "group";
  }

  if (
    (
      normalizeCount(
        input.nights,
        false
      ) ??
      0
    ) >= 7
  ) {
    return "long-stay";
  }

  return "mixed";
}

function inferPreference(
  input:
    StayOptiPreferenceResolutionInputV3
) {
  const tripType =
    inferTripType(
      input
    );

  if (
    tripType ===
      "family" ||
    tripType ===
      "business"
  ) {
    return "comfort" as const;
  }

  if (
    tripType ===
      "group" ||
    tripType ===
      "long-stay"
  ) {
    return "savings" as const;
  }

  return "balanced" as const;
}

export function resolvePersonalPreferenceV3(
  input:
    StayOptiPreferenceResolutionInputV3
): StayOptiPreferenceResolutionV3 {
  const validPreference =
    isStayOptiPreferenceIdV3(
      input.preferenceId
    )
      ? input.preferenceId
      : null;

  if (
    input.preferenceSource ===
      "manual" &&
    validPreference !==
      null
  ) {
    return {
      declaredPreferenceId:
        validPreference,
      inferredPreferenceId:
        null,
      resolvedPreferenceId:
        validPreference,
      origin:
        "declared",
      reasonCodes: [
        "preference:declared",
      ],
    };
  }

  if (
    input.preferenceSource ===
      "automatic" &&
    validPreference !==
      null
  ) {
    return {
      declaredPreferenceId:
        null,
      inferredPreferenceId:
        validPreference,
      resolvedPreferenceId:
        validPreference,
      origin:
        "inferred",
      reasonCodes: [
        "preference:inferred",
      ],
    };
  }

  if (
    input.preferenceSource ===
      "automatic"
  ) {
    const inferredPreference =
      inferPreference(
        input
      );

    return {
      declaredPreferenceId:
        null,
      inferredPreferenceId:
        inferredPreference,
      resolvedPreferenceId:
        inferredPreference,
      origin:
        "inferred",
      reasonCodes: [
        "preference:inferred",
      ],
    };
  }

  return {
    declaredPreferenceId:
      null,
    inferredPreferenceId:
      null,
    resolvedPreferenceId:
      "balanced",
    origin:
      "neutral-default",
    reasonCodes: [
      "preference:neutral-default",
    ],
  };
}

export function createBudgetUtilityV3(
  totalCost:
    number,
  totalBudget:
    number
) {
  if (
    !Number.isFinite(
      totalCost
    ) ||
    !Number.isFinite(
      totalBudget
    ) ||
    totalCost <= 0 ||
    totalBudget <= 0
  ) {
    throw new Error(
      "Budget utility requires positive finite cost and budget."
    );
  }

  const utilization =
    totalCost /
    totalBudget;

  if (
    utilization <= 1
  ) {
    return round(
      100 -
      35 *
      utilization **
        1.35,
      6
    );
  }

  return round(
    Math.max(
      0,
      65 -
      100 *
      (
        utilization -
        1
      ) **
        0.85
    ),
    6
  );
}

export function applyDiminishingReturnsV3(
  score:
    number
) {
  if (
    !Number.isFinite(
      score
    ) ||
    score < 0 ||
    score > 100
  ) {
    throw new Error(
      "Diminishing-returns score must be between 0 and 100."
    );
  }

  const normalized =
    score /
    100;

  const steepness =
    2.2;

  return round(
    100 *
    (
      1 -
      Math.exp(
        -steepness *
        normalized
      )
    ) /
    (
      1 -
      Math.exp(
        -steepness
      )
    ),
    6
  );
}

function normalizeContext(
  context:
    StayOptiPersonalUtilityContextV3
): StayOptiPersonalUtilityContextV3 {
  return {
    totalBudget:
      normalizePositive(
        context.totalBudget
      ),
    totalCost:
      normalizePositive(
        context.totalCost
      ),
    nights:
      normalizeCount(
        context.nights,
        false
      ),
    adults:
      normalizeCount(
        context.adults,
        false
      ),
    children:
      normalizeCount(
        context.children,
        true
      ),
    rooms:
      normalizeCount(
        context.rooms,
        false
      ),
    maximumDistanceKm:
      normalizePositive(
        context.maximumDistanceKm
      ),
    leadTimeDays:
      normalizeNonNegative(
        context.leadTimeDays
      ),
    tripType:
      context.tripType,
  };
}

function normalizeDimensions(
  dimensions:
    EvaluateStayOptiPersonalUtilityInputV3[
      "dimensions"
    ]
) {
  return Object.fromEntries(
    DIMENSIONS.map(
      (dimension) => {
        const input =
          dimensions[
            dimension
          ];

        const score =
          typeof input.score ===
              "number" &&
            Number.isFinite(
              input.score
            ) &&
            input.score >= 0 &&
            input.score <= 100
            ? round(
                input.score,
                6
              )
            : null;

        return [
          dimension,
          {
            score,
            confidence:
              round(
                clamp(
                  Number.isFinite(
                    input.confidence
                  )
                    ? input.confidence
                    : 0
                ),
                6
              ),
            evidenceIds:
              uniqueSorted(
                input.evidenceIds
              ),
          },
        ];
      }
    )
  ) as EvaluateStayOptiPersonalUtilityInputV3[
    "dimensions"
  ];
}

function createInteractions(
  context:
    StayOptiPersonalUtilityContextV3
) {
  const interactions:
    StayOptiUtilityInteractionV3[] =
      [];

  const add = (
    code:
      string,
    dimension:
      StayOptiUtilityDimensionV3,
    weightDelta:
      number
  ) => {
    interactions.push({
      code,
      dimension,
      weightDelta:
        round(
          weightDelta,
          6
        ),
    });
  };

  if (
    (
      context.nights ??
      0
    ) >= 7 ||
    context.tripType ===
      "long-stay"
  ) {
    add(
      "interaction:budget-duration",
      "priceValue",
      0.16
    );
    add(
      "interaction:budget-duration",
      "comfort",
      0.03
    );
    add(
      "interaction:budget-duration",
      "location",
      -0.02
    );
  }

  if (
    context.tripType ===
      "business"
  ) {
    add(
      "interaction:distance-trip-type",
      "location",
      0.05
    );
    add(
      "interaction:flexibility-lead-time",
      "flexibility",
      0.03
    );
  }
  else if (
    context.tripType ===
      "leisure"
  ) {
    add(
      "interaction:distance-trip-type",
      "location",
      0.02
    );
    add(
      "interaction:distance-trip-type",
      "quality",
      0.02
    );
  }

  if (
    (
      context.maximumDistanceKm ??
      Number.POSITIVE_INFINITY
    ) <= 1
  ) {
    add(
      "interaction:distance-trip-type",
      "location",
      0.04
    );
  }

  if (
    (
      context.leadTimeDays ??
      0
    ) >= 30
  ) {
    add(
      "interaction:flexibility-lead-time",
      "flexibility",
      0.05
    );
  }

  if (
    (
      context.children ??
      0
    ) > 0 ||
    (
      context.adults ??
      0
    ) >= 3 ||
    (
      context.rooms ??
      0
    ) >= 2 ||
    context.tripType ===
      "family" ||
    context.tripType ===
      "group"
  ) {
    add(
      "interaction:room-group",
      "comfort",
      0.05
    );
    add(
      "interaction:room-group",
      "categoryFit",
      0.02
    );
    add(
      "interaction:room-group",
      "userFit",
      0.04
    );
  }

  return interactions.sort(
    (
      first,
      second
    ) =>
      first.code.localeCompare(
        second.code
      ) ||
      first.dimension.localeCompare(
        second.dimension
      ) ||
      first.weightDelta -
        second.weightDelta
  );
}

function createWeights(
  preferenceId:
    StayOptiPreferenceIdV3,
  interactions:
    StayOptiUtilityInteractionV3[]
) {
  const unnormalized = {
    ...BASE_WEIGHTS[
      preferenceId
    ],
  };

  for (
    const interaction
    of interactions
  ) {
    unnormalized[
      interaction.dimension
    ] = Math.max(
      0.01,
      unnormalized[
        interaction.dimension
      ] +
      interaction.weightDelta
    );
  }

  const total =
    DIMENSIONS.reduce(
      (
        sum,
        dimension
      ) =>
        sum +
        unnormalized[
          dimension
        ],
      0
    );

  return Object.fromEntries(
    DIMENSIONS.map(
      (dimension) => [
        dimension,
        round(
          unnormalized[
            dimension
          ] /
          total,
          8
        ),
      ]
    )
  ) as Record<
    StayOptiUtilityDimensionV3,
    number
  >;
}

function createFingerprint(
  evaluation:
    Omit<
      StayOptiPersonalUtilityEvaluationV3,
      "fingerprint"
    >
) {
  return createStableHashV3(
    evaluation,
    "stayopti-v3-personal-utility"
  );
}

export function evaluatePersonalUtilityV3(
  input:
    EvaluateStayOptiPersonalUtilityInputV3
): StayOptiPersonalUtilityEvaluationV3 {
  const hotelId =
    input.hotelId.trim();

  if (!hotelId) {
    throw new Error(
      "Personal utility requires a hotelId."
    );
  }

  const context =
    normalizeContext(
      input.context
    );

  const dimensions =
    normalizeDimensions(
      input.dimensions
    );

  const interactions =
    createInteractions(
      context
    );

  const weights =
    createWeights(
      input.preference
        .resolvedPreferenceId,
      interactions
    );

  const transformedScores =
    new Map<
      StayOptiUtilityDimensionV3,
      number |
      null
    >();

  for (
    const dimension
    of DIMENSIONS
  ) {
    const sourceScore =
      dimensions[
        dimension
      ].score;

    if (
      dimension ===
        "priceValue" &&
      context.totalCost !==
        null &&
      context.totalBudget !==
        null
    ) {
      transformedScores.set(
        dimension,
        createBudgetUtilityV3(
          context.totalCost,
          context.totalBudget
        )
      );
    }
    else {
      transformedScores.set(
        dimension,
        sourceScore ===
          null
          ? null
          : applyDiminishingReturnsV3(
              sourceScore
            )
      );
    }
  }

  const availableDimensions =
    DIMENSIONS.filter(
      (dimension) =>
        transformedScores.get(
          dimension
        ) !== null
    );

  const availableWeight =
    availableDimensions.reduce(
      (
        sum,
        dimension
      ) =>
        sum +
        weights[
          dimension
        ],
      0
    );

  const contributions =
    DIMENSIONS.map(
      (
        dimension
      ): StayOptiUtilityContributionV3 => {
        const source =
          dimensions[
            dimension
          ];

        const transformedScore =
          transformedScores.get(
            dimension
          ) ??
          null;

        const available =
          transformedScore !==
            null;

        const normalizedAvailableWeight =
          available &&
          availableWeight > 0
            ? weights[
                dimension
              ] /
              availableWeight
            : 0;

        return {
          dimension,
          available,
          sourceScore:
            source.score,
          transformedScore,
          confidence:
            source.confidence,
          configuredWeight:
            weights[
              dimension
            ],
          normalizedAvailableWeight:
            round(
              normalizedAvailableWeight,
              8
            ),
          weightedValue:
            round(
              (
                transformedScore ??
                0
              ) *
              normalizedAvailableWeight,
              6
            ),
          curve:
            !available
              ? "unavailable"
              : dimension ===
                    "priceValue" &&
                  context.totalCost !==
                    null &&
                  context.totalBudget !==
                    null
                ? "budget-no-spend-bias"
                : "diminishing-returns",
          evidenceIds:
            source.evidenceIds,
        };
      }
    );

  const utilityScore =
    availableWeight > 0
      ? round(
          contributions.reduce(
            (
              sum,
              contribution
            ) =>
              sum +
              contribution
                .weightedValue,
            0
          ),
          4
        )
      : null;

  const evidenceCoverage =
    round(
      availableWeight,
      6
    );

  const scoreConfidence =
    round(
      DIMENSIONS.reduce(
        (
          sum,
          dimension
        ) =>
          sum +
          (
            dimensions[
              dimension
            ].score ===
              null
              ? 0
              : dimensions[
                  dimension
                ].confidence
          ) *
          weights[
            dimension
          ],
        0
      ),
      6
    );

  const reasonCodes =
    uniqueSorted([
      ...input.preference
        .reasonCodes,
      ...interactions.map(
        (interaction) =>
          interaction.code
      ),
      utilityScore ===
        null
        ? "utility:unavailable"
        : "utility:evaluated",
      "utility:non-linear",
      ...(
        context.totalCost !==
          null &&
        context.totalBudget !==
          null
          ? [
              "utility:budget-no-spend-bias",
            ]
          : []
      ),
    ]);

  const evaluationWithoutFingerprint:
    Omit<
      StayOptiPersonalUtilityEvaluationV3,
      "fingerprint"
    > = {
      evaluationId:
        createStableHashV3(
          {
            hotelId,
            preference:
              input.preference,
            context,
            dimensions,
          },
          "stayopti-v3-utility-id"
        ),
      hotelId,
      status:
        utilityScore ===
          null
          ? "unavailable"
          : "usable",
      preference:
        input.preference,
      context,
      dimensions,
      interactions,
      weights,
      contributions,
      utilityScore,
      scoreConfidence,
      evidenceCoverage,
      reasonCodes,
    };

  return {
    ...evaluationWithoutFingerprint,
    fingerprint:
      createFingerprint(
        evaluationWithoutFingerprint
      ),
  };
}

export function validatePersonalUtilityEvaluationV3(
  evaluation:
    StayOptiPersonalUtilityEvaluationV3
) {
  const {
    fingerprint:
      ignoredFingerprint,
    ...withoutFingerprint
  } = evaluation;

  void ignoredFingerprint;

  const weightSum =
    DIMENSIONS.reduce(
      (
        sum,
        dimension
      ) =>
        sum +
        evaluation.weights[
          dimension
        ],
      0
    );

  const valid =
    evaluation.fingerprint ===
      createFingerprint(
        withoutFingerprint
      ) &&
    evaluation.hotelId.trim()
      .length > 0 &&
    Math.abs(
      weightSum -
      1
    ) <= 0.000001 &&
    (
      evaluation.utilityScore ===
        null ||
      (
        Number.isFinite(
          evaluation.utilityScore
        ) &&
        evaluation.utilityScore >=
          0 &&
        evaluation.utilityScore <=
          100
      )
    ) &&
    evaluation.scoreConfidence >=
      0 &&
    evaluation.scoreConfidence <=
      1 &&
    evaluation.evidenceCoverage >=
      0 &&
    evaluation.evidenceCoverage <=
      1;

  return {
    valid,
  };
}
