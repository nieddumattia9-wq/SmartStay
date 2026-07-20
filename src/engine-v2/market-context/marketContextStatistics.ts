import type {
  SmartStayMarketContextSourceV2,
  SmartStayMarketContextStatusV2,
  SmartStayMarketDistributionV2,
  SmartStayMarketSegmentDescriptorV2,
} from "./marketContextModel";

export interface SmartStayWeightedMarketDistributionV2 {
  distribution: SmartStayMarketDistributionV2;
  confidence: number;
  source: SmartStayMarketContextSourceV2;
}

const DISTRIBUTION_FIELDS = [
  "minimum",
  "firstQuartile",
  "median",
  "thirdQuartile",
  "ninetiethPercentile",
  "maximum",
] as const;

export const EMPTY_MARKET_DISTRIBUTION_V2:
  SmartStayMarketDistributionV2 = {
    sampleSize: 0,
    minimum: null,
    firstQuartile: null,
    median: null,
    thirdQuartile: null,
    ninetiethPercentile: null,
    maximum: null,
  };

export function clampMarketValueV2(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function roundMarketValueV2(
  value: number,
  decimalPlaces = 2
) {
  const factor = 10 ** decimalPlaces;

  return (
    Math.round(
      (value + Number.EPSILON) *
        factor
    ) /
    factor
  );
}

export function normalizePositiveMarketNumberV2(
  value: unknown
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : null;
}

export function normalizePositiveMarketIntegerV2(
  value: unknown,
  fallback: number
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? Math.max(Math.round(value), 1)
    : fallback;
}

export function normalizeMarketCurrencyV2(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : null;
}

export function normalizeMarketDestinationKeyV2(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return normalized || null;
}

export function normalizeMarketCategoryV2(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return normalized &&
    normalized !== "unknown"
    ? normalized
    : null;
}

export function classifyMarketStarBandV2(
  value: unknown
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  if (value >= 4.5) {
    return "5";
  }

  if (value >= 3.5) {
    return "4";
  }

  if (value >= 2.5) {
    return "3";
  }

  return "1-2";
}

export function createOverallMarketSegmentV2():
  SmartStayMarketSegmentDescriptorV2 {
  return {
    key: "overall",
    kind: "overall",
    category: null,
    starBand: null,
  };
}

export function createCategoryMarketSegmentV2(
  category: string
): SmartStayMarketSegmentDescriptorV2 {
  return {
    key:
      `category:${category}`,
    kind:
      "category",
    category,
    starBand:
      null,
  };
}

export function createStarBandMarketSegmentV2(
  starBand: string
): SmartStayMarketSegmentDescriptorV2 {
  return {
    key:
      `star-band:${starBand}`,
    kind:
      "star-band",
    category:
      null,
    starBand,
  };
}

function percentile(
  sortedValues: number[],
  ratio: number
) {
  if (sortedValues.length === 0) {
    return null;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const position =
    (sortedValues.length - 1) *
    ratio;

  const lowerIndex =
    Math.floor(position);

  const upperIndex =
    Math.ceil(position);

  const lowerValue =
    sortedValues[lowerIndex];

  const upperValue =
    sortedValues[upperIndex];

  return lowerIndex === upperIndex
    ? lowerValue
    : lowerValue +
        (
          upperValue -
          lowerValue
        ) *
        (
          position -
          lowerIndex
        );
}

export function createMarketDistributionV2(
  values: readonly number[]
): SmartStayMarketDistributionV2 {
  const sortedValues =
    values
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

  if (sortedValues.length === 0) {
    return {
      ...EMPTY_MARKET_DISTRIBUTION_V2,
    };
  }

  const firstQuartile =
    percentile(
      sortedValues,
      0.25
    );

  const median =
    percentile(
      sortedValues,
      0.5
    );

  const thirdQuartile =
    percentile(
      sortedValues,
      0.75
    );

  const ninetiethPercentile =
    percentile(
      sortedValues,
      0.9
    );

  return {
    sampleSize:
      sortedValues.length,

    minimum:
      roundMarketValueV2(
        sortedValues[0]
      ),

    firstQuartile:
      firstQuartile === null
        ? null
        : roundMarketValueV2(
            firstQuartile
          ),

    median:
      median === null
        ? null
        : roundMarketValueV2(
            median
          ),

    thirdQuartile:
      thirdQuartile === null
        ? null
        : roundMarketValueV2(
            thirdQuartile
          ),

    ninetiethPercentile:
      ninetiethPercentile === null
        ? null
        : roundMarketValueV2(
            ninetiethPercentile
          ),

    maximum:
      roundMarketValueV2(
        sortedValues[
          sortedValues.length -
          1
        ]
      ),
  };
}

export function calculateMarketSampleConfidenceV2(
  sampleSize: number
) {
  if (sampleSize < 3) {
    return 0;
  }

  if (sampleSize < 8) {
    return 0.42;
  }

  if (sampleSize < 20) {
    return 0.62;
  }

  if (sampleSize < 50) {
    return 0.76;
  }

  return 0.86;
}

export function classifyMarketContextStatusV2(
  distribution:
    SmartStayMarketDistributionV2,
  confidence:
    number
): SmartStayMarketContextStatusV2 {
  if (
    distribution.sampleSize < 3 ||
    distribution.median === null
  ) {
    return "unavailable";
  }

  return (
    distribution.sampleSize >= 8 &&
    confidence >= 0.6
  )
    ? "strong-data"
    : "usable";
}

function weightedField(
  sources:
    readonly SmartStayWeightedMarketDistributionV2[],
  field:
    (typeof DISTRIBUTION_FIELDS)[number]
) {
  const values =
    sources
      .map(
        (source) => {
          const value =
            source
              .distribution[
                field
              ];

          const weight =
            Math.max(
              source
                .distribution
                .sampleSize,
              1
            ) *
            clampMarketValueV2(
              source.confidence,
              0.05,
              1
            );

          return typeof value ===
            "number"
            ? {
                value,
                weight,
              }
            : null;
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

  return totalWeight <= 0
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
        totalWeight
      );
}

export function mergeMarketDistributionsV2(
  sources:
    readonly SmartStayWeightedMarketDistributionV2[]
) {
  if (sources.length === 0) {
    return {
      distribution: {
        ...EMPTY_MARKET_DISTRIBUTION_V2,
      },

      confidence:
        0,

      source:
        "unavailable" as const,
    };
  }

  const sampleSize =
    sources.reduce(
      (
        total,
        source
      ) =>
        total +
        source
          .distribution
          .sampleSize,
      0
    );

  const confidenceWeight =
    sources.reduce(
      (
        total,
        source
      ) =>
        total +
        Math.max(
          source
            .distribution
            .sampleSize,
          1
        ),
      0
    );

  const confidence =
    confidenceWeight <= 0
      ? 0
      : sources.reduce(
          (
            total,
            source
          ) =>
            total +
            clampMarketValueV2(
              source.confidence,
              0,
              1
            ) *
            Math.max(
              source
                .distribution
                .sampleSize,
              1
            ),
          0
        ) /
        confidenceWeight;

  const sourceKinds =
    new Set(
      sources.map(
        (source) =>
          source.source
      )
    );

  const source:
    SmartStayMarketContextSourceV2 =
      sourceKinds.size > 1
        ? "hybrid"
        : (
            [
              ...sourceKinds,
            ][0] ??
            "unavailable"
          );

  return {
    distribution: {
      sampleSize,

      minimum:
        weightedField(
          sources,
          "minimum"
        ),

      firstQuartile:
        weightedField(
          sources,
          "firstQuartile"
        ),

      median:
        weightedField(
          sources,
          "median"
        ),

      thirdQuartile:
        weightedField(
          sources,
          "thirdQuartile"
        ),

      ninetiethPercentile:
        weightedField(
          sources,
          "ninetiethPercentile"
        ),

      maximum:
        weightedField(
          sources,
          "maximum"
        ),
    },

    confidence:
      roundMarketValueV2(
        clampMarketValueV2(
          confidence,
          0,
          1
        ),
        4
      ),

    source,
  };
}

function interpolatePercentile(
  value:
    number,
  lowerValue:
    number,
  upperValue:
    number,
  lowerPercentile:
    number,
  upperPercentile:
    number
) {
  if (upperValue <= lowerValue) {
    return upperPercentile;
  }

  return (
    lowerPercentile +
    (
      (
        value -
        lowerValue
      ) /
      (
        upperValue -
        lowerValue
      )
    ) *
    (
      upperPercentile -
      lowerPercentile
    )
  );
}

export function calculateBudgetPercentileFromDistributionV2(
  value:
    number,
  distribution:
    SmartStayMarketDistributionV2
) {
  const {
    minimum,
    firstQuartile,
    median,
    thirdQuartile,
    ninetiethPercentile,
    maximum,
  } =
    distribution;

  if (
    minimum === null ||
    firstQuartile === null ||
    median === null ||
    thirdQuartile === null ||
    ninetiethPercentile === null ||
    maximum === null
  ) {
    return null;
  }

  if (value <= minimum) {
    return 0;
  }

  if (value <= firstQuartile) {
    return interpolatePercentile(
      value,
      minimum,
      firstQuartile,
      0,
      25
    );
  }

  if (value <= median) {
    return interpolatePercentile(
      value,
      firstQuartile,
      median,
      25,
      50
    );
  }

  if (value <= thirdQuartile) {
    return interpolatePercentile(
      value,
      median,
      thirdQuartile,
      50,
      75
    );
  }

  if (
    value <=
    ninetiethPercentile
  ) {
    return interpolatePercentile(
      value,
      thirdQuartile,
      ninetiethPercentile,
      75,
      90
    );
  }

  if (value <= maximum) {
    return interpolatePercentile(
      value,
      ninetiethPercentile,
      maximum,
      90,
      100
    );
  }

  return 100;
}
