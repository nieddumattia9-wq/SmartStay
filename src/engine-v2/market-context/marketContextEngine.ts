import type {
  SmartStayMarketContextCandidateV2,
  SmartStayMarketContextInputV2,
  SmartStayMarketContextObservationV2,
  SmartStayMarketContextSnapshotV2,
  SmartStayMarketDistributionV2,
  SmartStayMarketSegmentDescriptorV2,
  SmartStayMarketSegmentSnapshotV2,
} from "./marketContextModel";

import {
  EMPTY_MARKET_DISTRIBUTION_V2,
  calculateMarketSampleConfidenceV2,
  classifyMarketContextStatusV2,
  classifyMarketStarBandV2,
  clampMarketValueV2,
  createCategoryMarketSegmentV2,
  createMarketDistributionV2,
  createOverallMarketSegmentV2,
  createStarBandMarketSegmentV2,
  mergeMarketDistributionsV2,
  normalizeMarketCategoryV2,
  normalizeMarketCurrencyV2,
  normalizeMarketDestinationKeyV2,
  normalizePositiveMarketIntegerV2,
  normalizePositiveMarketNumberV2,
  roundMarketValueV2,
} from "./marketContextStatistics";

type CurrentSegmentValues = {
  descriptor: SmartStayMarketSegmentDescriptorV2;
  values: number[];
};

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
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      normalized
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
    ? normalized
    : null;
}

function normalizeTimestamp(
  value:
    unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    !Number.isFinite(
      Date.parse(
        value.trim()
      )
    )
  ) {
    return null;
  }

  return value.trim();
}

function resolveCandidateCurrency(
  candidates:
    SmartStayMarketContextCandidateV2[]
) {
  const counts =
    new Map<
      string,
      number
    >();

  for (
    const candidate
    of candidates
  ) {
    if (
      !candidate
        .eligibleForPrimaryRanking
    ) {
      continue;
    }

    const currency =
      normalizeMarketCurrencyV2(
        candidate.currency
      );

    const totalCost =
      normalizePositiveMarketNumberV2(
        candidate.totalCost
      );

    if (
      currency === null ||
      totalCost === null
    ) {
      continue;
    }

    counts.set(
      currency,
      (
        counts.get(
          currency
        ) ??
        0
      ) +
      1
    );
  }

  return (
    [
      ...counts.entries(),
    ].sort(
      (
        first,
        second
      ) =>
        second[1] -
          first[1] ||
        first[0].localeCompare(
          second[0]
        )
    )[0]?.[0] ??
    null
  );
}

function resolveObservationCurrency(
  observations:
    readonly SmartStayMarketContextObservationV2[],
  destinationKey:
    string |
    null,
  stayMonth:
    number |
    null
) {
  if (
    destinationKey ===
    null
  ) {
    return null;
  }

  const counts =
    new Map<
      string,
      number
    >();

  for (
    const observation
    of observations
  ) {
    const observationDestination =
      normalizeMarketDestinationKeyV2(
        observation.destinationKey
      );

    const currency =
      normalizeMarketCurrencyV2(
        observation.currency
      );

    const monthMatches =
      observation.stayMonth ===
        null ||
      stayMonth ===
        null ||
      observation.stayMonth ===
        stayMonth;

    if (
      observationDestination !==
        destinationKey ||
      currency ===
        null ||
      !monthMatches ||
      observation
        .distribution
        .sampleSize <
        3
    ) {
      continue;
    }

    counts.set(
      currency,
      (
        counts.get(
          currency
        ) ??
        0
      ) +
      observation
        .distribution
        .sampleSize
    );
  }

  return (
    [
      ...counts.entries(),
    ].sort(
      (
        first,
        second
      ) =>
        second[1] -
          first[1] ||
        first[0].localeCompare(
          second[0]
        )
    )[0]?.[0] ??
    null
  );
}

function parseSegmentDescriptor(
  segmentKey:
    string
):
  SmartStayMarketSegmentDescriptorV2 {
  if (
    segmentKey ===
    "overall"
  ) {
    return createOverallMarketSegmentV2();
  }

  if (
    segmentKey.startsWith(
      "category:"
    )
  ) {
    const category =
      normalizeMarketCategoryV2(
        segmentKey.slice(
          "category:".length
        )
      );

    return category ===
      null
      ? createOverallMarketSegmentV2()
      : createCategoryMarketSegmentV2(
          category
        );
  }

  if (
    segmentKey.startsWith(
      "star-band:"
    )
  ) {
    const starBand =
      segmentKey
        .slice(
          "star-band:".length
        )
        .trim();

    return starBand
      ? createStarBandMarketSegmentV2(
          starBand
        )
      : createOverallMarketSegmentV2();
  }

  return createOverallMarketSegmentV2();
}

function createCurrentSegments(
  candidates:
    SmartStayMarketContextCandidateV2[],
  currency:
    string |
    null,
  nights:
    number,
  rooms:
    number
) {
  const segmentValues =
    new Map<
      string,
      CurrentSegmentValues
    >();

  const ensureSegment = (
    descriptor:
      SmartStayMarketSegmentDescriptorV2
  ) => {
    const existing =
      segmentValues.get(
        descriptor.key
      );

    if (existing) {
      return existing;
    }

    const created = {
      descriptor,
      values:
        [],
    };

    segmentValues.set(
      descriptor.key,
      created
    );

    return created;
  };

  ensureSegment(
    createOverallMarketSegmentV2()
  );

  if (currency === null) {
    return segmentValues;
  }

  const divisor =
    nights *
    rooms;

  for (
    const candidate
    of candidates
  ) {
    const candidateCurrency =
      normalizeMarketCurrencyV2(
        candidate.currency
      );

    const totalCost =
      normalizePositiveMarketNumberV2(
        candidate.totalCost
      );

    if (
      !candidate
        .eligibleForPrimaryRanking ||
      candidateCurrency !==
        currency ||
      totalCost ===
        null
    ) {
      continue;
    }

    const perRoomNight =
      totalCost /
      divisor;

    ensureSegment(
      createOverallMarketSegmentV2()
    )
      .values
      .push(
        perRoomNight
      );

    const category =
      normalizeMarketCategoryV2(
        candidate
          .accommodationCategory
      );

    if (category !== null) {
      ensureSegment(
        createCategoryMarketSegmentV2(
          category
        )
      )
        .values
        .push(
          perRoomNight
        );
    }

    const starBand =
      classifyMarketStarBandV2(
        candidate.stars
      );

    if (
      starBand !==
      null
    ) {
      ensureSegment(
        createStarBandMarketSegmentV2(
          starBand
        )
      )
        .values
        .push(
          perRoomNight
        );
    }
  }

  return segmentValues;
}

function isMatchingObservation(
  observation:
    SmartStayMarketContextObservationV2,
  destinationKey:
    string |
    null,
  currency:
    string |
    null,
  stayMonth:
    number |
    null
) {
  const observationDestination =
    normalizeMarketDestinationKeyV2(
      observation.destinationKey
    );

  const observationCurrency =
    normalizeMarketCurrencyV2(
      observation.currency
    );

  const monthMatches =
    observation.stayMonth ===
      null ||
    stayMonth ===
      null ||
    observation.stayMonth ===
      stayMonth;

  return (
    destinationKey !==
      null &&
    observationDestination ===
      destinationKey &&
    currency !==
      null &&
    observationCurrency ===
      currency &&
    monthMatches &&
    observation
      .distribution
      .sampleSize >=
      3 &&
    observation
      .distribution
      .median !==
      null &&
    observation.confidence >
      0
  );
}

function createSourcesForMode(
  mode:
    SmartStayMarketContextInputV2[
      "mode"
    ],
  currentDistribution:
    SmartStayMarketDistributionV2,
  observations:
    SmartStayMarketContextObservationV2[]
) {
  const currentSource =
    currentDistribution.sampleSize >=
      3
      ? {
          distribution:
            currentDistribution,

          confidence:
            calculateMarketSampleConfidenceV2(
              currentDistribution
                .sampleSize
            ),

          source:
            "current-search" as const,
        }
      : null;

  const localSources =
    observations.map(
      (
        observation
      ) => ({
        distribution:
          observation
            .distribution,

        confidence:
          clampMarketValueV2(
            observation.confidence,
            0,
            1
          ),

        source:
          observation.source,
      })
    );

  if (mode === "off") {
    return [];
  }

  if (
    mode ===
    "current-search"
  ) {
    return currentSource
      ? [
          currentSource,
        ]
      : [];
  }

  if (
    mode ===
    "local-only"
  ) {
    return localSources;
  }

  return [
    ...(
      currentSource
        ? [
            currentSource,
          ]
        : []
    ),
    ...localSources,
  ];
}

function resolveSeasonalIndex(
  observations:
    SmartStayMarketContextObservationV2[]
) {
  const values =
    observations
      .filter(
        (observation) =>
          observation
            .segmentKey ===
          "overall"
      )
      .map(
        (
          observation
        ) => {
          const value =
            normalizePositiveMarketNumberV2(
              observation
                .seasonalIndex
            );

          const weight =
            Math.max(
              observation
                .distribution
                .sampleSize,
              1
            ) *
            clampMarketValueV2(
              observation.confidence,
              0.05,
              1
            );

          return value ===
            null
            ? null
            : {
                value,
                weight,
              };
        }
      )
      .filter(
        (
          value
        ): value is {
          value:
            number;

          weight:
            number;
        } =>
          value !==
          null
      );

  const totalWeight =
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value.weight,
      0
    );

  return totalWeight <=
    0
    ? null
    : roundMarketValueV2(
        values.reduce(
          (
            total,
            value
          ) =>
            total +
            value.value *
            value.weight,
          0
        ) /
        totalWeight,
        4
      );
}

function resolveLeadTimeDays(
  checkIn:
    string |
    null,
  capturedAt:
    string |
    null
) {
  if (
    checkIn ===
      null ||
    capturedAt ===
      null
  ) {
    return null;
  }

  const checkInTimestamp =
    Date.parse(
      `${checkIn}T00:00:00.000Z`
    );

  const capturedTimestamp =
    Date.parse(
      capturedAt
    );

  if (
    !Number.isFinite(
      checkInTimestamp
    ) ||
    !Number.isFinite(
      capturedTimestamp
    )
  ) {
    return null;
  }

  return Math.max(
    Math.round(
      (
        checkInTimestamp -
        capturedTimestamp
      ) /
      86_400_000
    ),
    0
  );
}

function createGeneratedObservations(
  segmentValues:
    Map<
      string,
      CurrentSegmentValues
    >,
  destinationKey:
    string |
    null,
  currency:
    string |
    null,
  stayMonth:
    number |
    null,
  capturedAt:
    string |
    null,
  checkIn:
    string |
    null
) {
  if (
    destinationKey ===
      null ||
    currency ===
      null
  ) {
    return [];
  }

  return [
    ...segmentValues.values(),
  ]
    .map(
      (
        segment
      ):
        SmartStayMarketContextObservationV2 |
        null => {
        const distribution =
          createMarketDistributionV2(
            segment.values
          );

        if (
          distribution.sampleSize <
            3 ||
          distribution.median ===
            null
        ) {
          return null;
        }

        const confidence =
          calculateMarketSampleConfidenceV2(
            distribution
              .sampleSize
          );

        return {
          id: [
            "current-search",
            destinationKey,
            stayMonth ??
              "any-month",
            currency,
            segment
              .descriptor
              .key,
            distribution
              .sampleSize,
            distribution
              .median,
          ].join(
            ":"
          ),

          destinationKey,
          currency,
          stayMonth,

          segmentKey:
            segment
              .descriptor
              .key,

          distribution,

          seasonalIndex:
            null,

          source:
            "current-search" as const,

          confidence,

          observedAt:
            capturedAt,

          leadTimeDays:
            resolveLeadTimeDays(
              checkIn,
              capturedAt
            ),
        };
      }
    )
    .filter(
      (
        observation
      ): observation is SmartStayMarketContextObservationV2 =>
        observation !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        first.segmentKey.localeCompare(
          second.segmentKey
        )
    );
}

export function evaluateMarketContextV2(
  input:
    SmartStayMarketContextInputV2
): SmartStayMarketContextSnapshotV2 {
  const mode =
    input.mode ??
    "hybrid";

  const nights =
    normalizePositiveMarketIntegerV2(
      input.nights,
      1
    );

  const rooms =
    normalizePositiveMarketIntegerV2(
      input.rooms,
      1
    );

  const totalBudget =
    normalizePositiveMarketNumberV2(
      input.totalBudget
    );

  const destinationKey =
    normalizeMarketDestinationKeyV2(
      input.destinationKey
    );

  const checkIn =
    normalizeIsoDate(
      input.checkIn
    );

  const checkOut =
    normalizeIsoDate(
      input.checkOut
    );

  const capturedAt =
    normalizeTimestamp(
      input.capturedAt
    );

  const stayMonth =
    checkIn ===
      null
      ? null
      : Number(
          checkIn.slice(
            5,
            7
          )
        );

  const observations =
    [
      ...(
        input.observations ??
        []
      ),
    ];

  const currency =
    normalizeMarketCurrencyV2(
      input.currency
    ) ??
    resolveCandidateCurrency(
      input.candidates
    ) ??
    resolveObservationCurrency(
      observations,
      destinationKey,
      stayMonth
    );

  const currentSegments =
    createCurrentSegments(
      input.candidates,
      currency,
      nights,
      rooms
    );

  const matchingObservations =
    observations
      .filter(
        (
          observation
        ) =>
          isMatchingObservation(
            observation,
            destinationKey,
            currency,
            stayMonth
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          first.id.localeCompare(
            second.id
          )
      );

  const segmentKeys =
    new Set<
      string
    >([
      "overall",
      ...currentSegments.keys(),
      ...matchingObservations.map(
        (
          observation
        ) =>
          observation.segmentKey
      ),
    ]);

  const segmentSnapshots =
    [
      ...segmentKeys,
    ]
      .sort()
      .map(
        (
          segmentKey
        ): SmartStayMarketSegmentSnapshotV2 => {
          const descriptor =
            currentSegments.get(
              segmentKey
            )
              ?.descriptor ??
            parseSegmentDescriptor(
              segmentKey
            );

          const currentDistribution =
            createMarketDistributionV2(
              currentSegments.get(
                segmentKey
              )
                ?.values ??
              []
            );

          const localObservations =
            matchingObservations.filter(
              (
                observation
              ) =>
                observation
                  .segmentKey ===
                segmentKey
            );

          const merged =
            mergeMarketDistributionsV2(
              createSourcesForMode(
                mode,
                currentDistribution,
                localObservations
              )
            );

          const status =
            classifyMarketContextStatusV2(
              merged.distribution,
              merged.confidence
            );

          return {
            ...descriptor,

            status,

            source:
              merged.source,

            confidence:
              merged.confidence,

            distribution:
              merged.distribution,

            currentSearchDistribution:
              currentDistribution,

            matchingObservationCount:
              localObservations.length,

            reasonCodes:
              uniqueSorted([
                `market-segment:${descriptor.key}`,
                `market-segment-status:${status}`,
                `market-segment-source:${merged.source}`,
              ]),
          };
        }
      );

  const overall =
    segmentSnapshots.find(
      (
        segment
      ) =>
        segment.key ===
        "overall"
    ) ?? {
      ...createOverallMarketSegmentV2(),

      status:
        "unavailable" as const,

      source:
        "unavailable" as const,

      confidence:
        0,

      distribution: {
        ...EMPTY_MARKET_DISTRIBUTION_V2,
      },

      currentSearchDistribution: {
        ...EMPTY_MARKET_DISTRIBUTION_V2,
      },

      matchingObservationCount:
        0,

      reasonCodes:
        [],
    };

  const generatedObservations =
    createGeneratedObservations(
      currentSegments,
      destinationKey,
      currency,
      stayMonth,
      capturedAt,
      checkIn
    );

  const seasonalIndex =
    mode === "off" ||
    mode === "current-search"
      ? null
      : resolveSeasonalIndex(
          matchingObservations
        );

  return {
    status:
      overall.status,

    mode,

    source:
      overall.source,

    destinationKey,
    currency,
    checkIn,
    checkOut,
    stayMonth,
    nights,
    rooms,

    budgetPerRoomNight:
      totalBudget ===
        null
        ? null
        : roundMarketValueV2(
            totalBudget /
            (
              nights *
              rooms
            )
          ),

    confidence:
      overall.confidence,

    seasonalIndex,

    distribution:
      overall.distribution,

    currentSearchDistribution:
      overall
        .currentSearchDistribution,

    segments:
      segmentSnapshots.filter(
        (
          segment
        ) =>
          segment.key !==
          "overall"
      ),

    currentSearchSampleSize:
      overall
        .currentSearchDistribution
        .sampleSize,

    matchingObservationCount:
      matchingObservations.length,

    generatedObservations,

    reasonCodes:
      uniqueSorted([
        `market-context-mode:${mode}`,
        `market-context-source:${overall.source}`,
        `market-context-status:${overall.status}`,
        destinationKey ===
          null
          ? "market-context-destination-unavailable"
          : "market-context-destination-available",
        stayMonth ===
          null
          ? "market-context-stay-month-unavailable"
          : `market-context-stay-month:${stayMonth}`,
        seasonalIndex ===
          null
          ? "market-context-seasonality-unavailable"
          : "market-context-seasonality-available",
        matchingObservations.length >
          0
          ? "market-context-local-observations-used"
          : "market-context-local-observations-unavailable",
        generatedObservations.length >
          0
          ? "market-context-observations-generated"
          : "market-context-observations-not-generated",
      ]),
  };
}
