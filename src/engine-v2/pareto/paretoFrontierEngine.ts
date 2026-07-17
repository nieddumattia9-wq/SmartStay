import type {
  SmartStayParetoEvaluationV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayUserUtilityEvaluationV2,
  SmartStayUtilityDimensionCodeV2,
} from "../utility/userUtilityEngine";

export interface SmartStayParetoCandidateV2 {
  hotelId:
    string;

  utility:
    SmartStayUserUtilityEvaluationV2;

  eligibleForPrimaryRanking:
    boolean;

  exclusionReasonCodes?:
    string[];
}

export interface SmartStayParetoFrontierOptionsV2 {
  dimensionCodes?:
    SmartStayUtilityDimensionCodeV2[];

  minimumDimensionConfidence?:
    number;

  minimumComparableDimensions?:
    number;

  nonWorseTolerance?:
    number;

  minimumImprovement?:
    number;
}

export interface SmartStayParetoCandidateEvaluationV2
  extends SmartStayParetoEvaluationV2 {
  hotelId:
    string;

  eligibleForFrontier:
    boolean;

  availableDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  excludedDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];
}

export interface SmartStayParetoDominanceComparisonV2 {
  dominantHotelId:
    string;

  dominatedHotelId:
    string;

  comparedDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  betterDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  equivalentDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];
}

export interface SmartStayParetoFrontierEvaluationV2 {
  preferenceId:
    string;

  dimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  frontierHotelIds:
    string[];

  dominatedHotelIds:
    string[];

  unknownHotelIds:
    string[];

  evaluations:
    SmartStayParetoCandidateEvaluationV2[];

  dominanceComparisons:
    SmartStayParetoDominanceComparisonV2[];
}

type NormalizedDimension = {
  score:
    number;

  confidence:
    number;
};

type NormalizedCandidate = {
  hotelId:
    string;

  utility:
    SmartStayUserUtilityEvaluationV2;

  eligible:
    boolean;

  availableDimensions:
    Map<
      SmartStayUtilityDimensionCodeV2,
      NormalizedDimension
    >;

  excludedDimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  exclusionReasonCodes:
    string[];
};

type ResolvedOptions = {
  dimensionCodes:
    SmartStayUtilityDimensionCodeV2[];

  minimumDimensionConfidence:
    number;

  minimumComparableDimensions:
    number;

  nonWorseTolerance:
    number;

  minimumImprovement:
    number;
};

const DEFAULT_DIMENSION_CODES:
  readonly SmartStayUtilityDimensionCodeV2[] = [
    "priceValue",
    "quality",
    "location",
    "comfort",
    "flexibility",
    "categoryFit",
    "userFit",
  ];

const DEFAULT_MINIMUM_DIMENSION_CONFIDENCE =
  0.55;

const DEFAULT_MINIMUM_COMPARABLE_DIMENSIONS =
  3;

const DEFAULT_NON_WORSE_TOLERANCE =
  1;

const DEFAULT_MINIMUM_IMPROVEMENT =
  2;

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

function compareStrings(
  first:
    string,
  second:
    string
) {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
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
  ].sort(
    compareStrings
  ) as Value[];
}

function isDimensionCode(
  value:
    unknown
): value is SmartStayUtilityDimensionCodeV2 {
  return (
    typeof value === "string" &&
    (
      DEFAULT_DIMENSION_CODES as
        readonly string[]
    ).includes(
      value
    )
  );
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

function normalizeNonNegativeNumber(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return fallback;
  }

  return value;
}

function resolveOptions(
  options:
    SmartStayParetoFrontierOptionsV2
): ResolvedOptions {
  const requestedDimensions =
    options.dimensionCodes ??
    [
      ...DEFAULT_DIMENSION_CODES,
    ];

  const dimensionCodes =
    uniqueSorted(
      requestedDimensions.filter(
        isDimensionCode
      )
    );

  if (dimensionCodes.length === 0) {
    throw new Error(
      "Pareto Frontier requires at least one valid dimension."
    );
  }

  const minimumComparableDimensions =
    typeof options
      .minimumComparableDimensions ===
      "number" &&
    Number.isFinite(
      options.minimumComparableDimensions
    )
      ? clamp(
          Math.round(
            options.minimumComparableDimensions
          ),
          1,
          dimensionCodes.length
        )
      : Math.min(
          DEFAULT_MINIMUM_COMPARABLE_DIMENSIONS,
          dimensionCodes.length
        );

  const nonWorseTolerance =
    normalizeNonNegativeNumber(
      options.nonWorseTolerance,
      DEFAULT_NON_WORSE_TOLERANCE
    );

  const minimumImprovement =
    normalizeNonNegativeNumber(
      options.minimumImprovement,
      DEFAULT_MINIMUM_IMPROVEMENT
    );

  if (
    minimumImprovement <=
    nonWorseTolerance
  ) {
    throw new Error(
      "Pareto minimumImprovement must be greater than nonWorseTolerance."
    );
  }

  return {
    dimensionCodes,

    minimumDimensionConfidence:
      normalizeRatio(
        options.minimumDimensionConfidence,
        DEFAULT_MINIMUM_DIMENSION_CONFIDENCE
      ),

    minimumComparableDimensions,

    nonWorseTolerance,

    minimumImprovement,
  };
}

function createPreferenceSignature(
  utility:
    SmartStayUserUtilityEvaluationV2,
  dimensionCodes:
    SmartStayUtilityDimensionCodeV2[]
) {
  const weightSignature =
    dimensionCodes
      .map(
        (dimension) => {
          const weight =
            utility.preference
              .weights[
                dimension
              ];

          return [
            dimension,
            Number.isFinite(weight)
              ? weight.toFixed(6)
              : "invalid",
          ].join(":");
        }
      )
      .join("|");

  return [
    utility.preference.id,
    weightSignature,
  ].join("::");
}

function normalizeCandidate(
  candidate:
    SmartStayParetoCandidateV2,
  options:
    ResolvedOptions
): NormalizedCandidate {
  if (
    typeof candidate.hotelId !==
      "string" ||
    !candidate.hotelId.trim()
  ) {
    throw new Error(
      "Pareto candidate requires a hotelId."
    );
  }

  const hotelId =
    candidate.hotelId.trim();

  if (
    candidate.utility.hotelId !==
    hotelId
  ) {
    throw new Error(
      `Pareto candidate hotelId mismatch: ${hotelId}`
    );
  }

  const contributionMap =
    new Map(
      candidate.utility
        .contributions
        .map(
          (contribution) => [
            contribution.dimension,
            contribution,
          ] as const
        )
    );

  const availableDimensions =
    new Map<
      SmartStayUtilityDimensionCodeV2,
      NormalizedDimension
    >();

  const excludedDimensionCodes:
    SmartStayUtilityDimensionCodeV2[] = [];

  for (
    const dimension
    of options.dimensionCodes
  ) {
    const configuredWeight =
      candidate.utility
        .preference
        .weights[
          dimension
        ];

    if (
      typeof configuredWeight !==
        "number" ||
      !Number.isFinite(
        configuredWeight
      ) ||
      configuredWeight <= 0
    ) {
      excludedDimensionCodes.push(
        dimension
      );

      continue;
    }

    const contribution =
      contributionMap.get(
        dimension
      );

    if (
      !contribution ||
      contribution.available !==
        true ||
      typeof contribution.score !==
        "number" ||
      !Number.isFinite(
        contribution.score
      ) ||
      contribution.score < 0 ||
      contribution.score > 100 ||
      typeof contribution.confidence !==
        "number" ||
      !Number.isFinite(
        contribution.confidence
      ) ||
      contribution.confidence <
        options.minimumDimensionConfidence
    ) {
      excludedDimensionCodes.push(
        dimension
      );

      continue;
    }

    availableDimensions.set(
      dimension,
      {
        score:
          contribution.score,

        confidence:
          contribution.confidence,
      }
    );
  }

  const eligible =
    candidate
      .eligibleForPrimaryRanking ===
      true &&
    candidate.utility
      .eligibleForPrimaryRanking ===
      true &&
    candidate.utility.utilityScore !==
      null &&
    candidate.utility.status !==
      "invalid" &&
    candidate.utility.status !==
      "unavailable";

  return {
    hotelId,

    utility:
      candidate.utility,

    eligible,

    availableDimensions,

    excludedDimensionCodes:
      uniqueSorted(
        excludedDimensionCodes
      ),

    exclusionReasonCodes:
      uniqueSorted(
        candidate
          .exclusionReasonCodes ??
        []
      ),
  };
}

function compareDominance(
  possibleDominator:
    NormalizedCandidate,
  possibleDominated:
    NormalizedCandidate,
  options:
    ResolvedOptions
): SmartStayParetoDominanceComparisonV2 | null {
  if (
    !possibleDominator.eligible ||
    !possibleDominated.eligible
  ) {
    return null;
  }

  const dominatedDimensions = [
    ...possibleDominated
      .availableDimensions
      .keys(),
  ].sort(
    compareStrings
  );

  if (
    dominatedDimensions.length <
    options.minimumComparableDimensions
  ) {
    return null;
  }

  const dominatorCoversAllDimensions =
    dominatedDimensions.every(
      (dimension) =>
        possibleDominator
          .availableDimensions
          .has(
            dimension
          )
    );

  if (
    !dominatorCoversAllDimensions
  ) {
    return null;
  }

  const betterDimensionCodes:
    SmartStayUtilityDimensionCodeV2[] = [];

  const equivalentDimensionCodes:
    SmartStayUtilityDimensionCodeV2[] = [];

  for (
    const dimension
    of dominatedDimensions
  ) {
    const dominatorDimension =
      possibleDominator
        .availableDimensions
        .get(
          dimension
        );

    const dominatedDimension =
      possibleDominated
        .availableDimensions
        .get(
          dimension
        );

    if (
      !dominatorDimension ||
      !dominatedDimension
    ) {
      return null;
    }

    const difference =
      dominatorDimension.score -
      dominatedDimension.score;

    if (
      difference <
      -options.nonWorseTolerance
    ) {
      return null;
    }

    if (
      difference >=
      options.minimumImprovement
    ) {
      betterDimensionCodes.push(
        dimension
      );
    }
    else {
      equivalentDimensionCodes.push(
        dimension
      );
    }
  }

  if (
    betterDimensionCodes.length ===
    0
  ) {
    return null;
  }

  return {
    dominantHotelId:
      possibleDominator.hotelId,

    dominatedHotelId:
      possibleDominated.hotelId,

    comparedDimensionCodes:
      uniqueSorted(
        dominatedDimensions
      ),

    betterDimensionCodes:
      uniqueSorted(
        betterDimensionCodes
      ),

    equivalentDimensionCodes:
      uniqueSorted(
        equivalentDimensionCodes
      ),
  };
}

export function evaluateParetoFrontierV2(
  candidates:
    SmartStayParetoCandidateV2[],
  options:
    SmartStayParetoFrontierOptionsV2 = {}
): SmartStayParetoFrontierEvaluationV2 {
  const resolvedOptions =
    resolveOptions(
      options
    );

  const normalizedCandidates =
    candidates
      .map(
        (candidate) =>
          normalizeCandidate(
            candidate,
            resolvedOptions
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first.hotelId,
            second.hotelId
          )
      );

  const hotelIds =
    normalizedCandidates.map(
      (candidate) =>
        candidate.hotelId
    );

  if (
    new Set(
      hotelIds
    ).size !==
    hotelIds.length
  ) {
    throw new Error(
      "Pareto Frontier received duplicate hotelIds."
    );
  }

  if (
    normalizedCandidates.length ===
    0
  ) {
    return {
      preferenceId:
        "unknown",

      dimensionCodes:
        resolvedOptions
          .dimensionCodes,

      frontierHotelIds:
        [],

      dominatedHotelIds:
        [],

      unknownHotelIds:
        [],

      evaluations:
        [],

      dominanceComparisons:
        [],
    };
  }

  const preferenceSignature =
    createPreferenceSignature(
      normalizedCandidates[0]
        .utility,
      resolvedOptions
        .dimensionCodes
    );

  for (
    const candidate
    of normalizedCandidates
  ) {
    const candidateSignature =
      createPreferenceSignature(
        candidate.utility,
        resolvedOptions
          .dimensionCodes
      );

    if (
      candidateSignature !==
      preferenceSignature
    ) {
      throw new Error(
        "Pareto candidates must use the same utility preference and weights."
      );
    }
  }

  const dominanceComparisons:
    SmartStayParetoDominanceComparisonV2[] = [];

  const dominatedBy =
    new Map<
      string,
      Set<string>
    >();

  const dominates =
    new Map<
      string,
      Set<string>
    >();

  for (
    const candidate
    of normalizedCandidates
  ) {
    dominatedBy.set(
      candidate.hotelId,
      new Set<string>()
    );

    dominates.set(
      candidate.hotelId,
      new Set<string>()
    );
  }

  for (
    const possibleDominator
    of normalizedCandidates
  ) {
    for (
      const possibleDominated
      of normalizedCandidates
    ) {
      if (
        possibleDominator.hotelId ===
        possibleDominated.hotelId
      ) {
        continue;
      }

      const comparison =
        compareDominance(
          possibleDominator,
          possibleDominated,
          resolvedOptions
        );

      if (!comparison) {
        continue;
      }

      dominanceComparisons.push(
        comparison
      );

      dominatedBy
        .get(
          possibleDominated.hotelId
        )
        ?.add(
          possibleDominator.hotelId
        );

      dominates
        .get(
          possibleDominator.hotelId
        )
        ?.add(
          possibleDominated.hotelId
        );
    }
  }

  dominanceComparisons.sort(
    (
      first,
      second
    ) =>
      compareStrings(
        first.dominantHotelId,
        second.dominantHotelId
      ) ||
      compareStrings(
        first.dominatedHotelId,
        second.dominatedHotelId
      )
  );

  const evaluations =
    normalizedCandidates.map(
      (
        candidate
      ): SmartStayParetoCandidateEvaluationV2 => {
        const dominatedByHotelIds =
          uniqueSorted([
            ...(
              dominatedBy.get(
                candidate.hotelId
              ) ??
              new Set<string>()
            ),
          ]);

        const dominatesHotelIds =
          uniqueSorted([
            ...(
              dominates.get(
                candidate.hotelId
              ) ??
              new Set<string>()
            ),
          ]);

        const availableDimensionCodes =
          uniqueSorted([
            ...candidate
              .availableDimensions
              .keys(),
          ]);

        const enoughComparableData =
          availableDimensionCodes.length >=
          resolvedOptions
            .minimumComparableDimensions;

        const reasonCodes = [
          ...candidate
            .exclusionReasonCodes,
        ];

        let status:
          SmartStayParetoCandidateEvaluationV2[
            "status"
          ];

        if (!candidate.eligible) {
          status =
            "unknown";

          reasonCodes.push(
            "pareto-not-eligible"
          );
        }
        else if (
          !enoughComparableData
        ) {
          status =
            "unknown";

          reasonCodes.push(
            "pareto-insufficient-comparable-data"
          );
        }
        else if (
          dominatedByHotelIds.length >
          0
        ) {
          status =
            "dominated";

          reasonCodes.push(
            "pareto-dominated"
          );
        }
        else {
          status =
            "frontier";

          reasonCodes.push(
            "pareto-frontier"
          );
        }

        if (
          dominatesHotelIds.length >
          0
        ) {
          reasonCodes.push(
            "pareto-dominates-alternative"
          );
        }

        if (
          candidate
            .excludedDimensionCodes
            .length > 0
        ) {
          reasonCodes.push(
            "pareto-dimensions-excluded"
          );
        }

        return {
          hotelId:
            candidate.hotelId,

          status,

          eligibleForFrontier:
            candidate.eligible &&
            enoughComparableData,

          dominatedByHotelIds,

          dominatesHotelIds,

          reasonCodes:
            uniqueSorted(
              reasonCodes
            ),

          availableDimensionCodes,

          excludedDimensionCodes:
            candidate
              .excludedDimensionCodes,
        };
      }
    );

  return {
    preferenceId:
      normalizedCandidates[0]
        .utility
        .preference
        .id,

    dimensionCodes:
      resolvedOptions
        .dimensionCodes,

    frontierHotelIds:
      evaluations
        .filter(
          (evaluation) =>
            evaluation.status ===
            "frontier"
        )
        .map(
          (evaluation) =>
            evaluation.hotelId
        ),

    dominatedHotelIds:
      evaluations
        .filter(
          (evaluation) =>
            evaluation.status ===
            "dominated"
        )
        .map(
          (evaluation) =>
            evaluation.hotelId
        ),

    unknownHotelIds:
      evaluations
        .filter(
          (evaluation) =>
            evaluation.status ===
            "unknown"
        )
        .map(
          (evaluation) =>
            evaluation.hotelId
        ),

    evaluations,

    dominanceComparisons,
  };
}