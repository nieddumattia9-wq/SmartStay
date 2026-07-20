import type {
  SmartStayComfortFlexibilityEvaluationV2,
} from "../comfort/comfortFlexibilityEngine";

import type {
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

import type {
  SmartStayMarketContextSnapshotV2,
  SmartStayMarketContextSourceV2,
} from "../market-context/marketContextModel";

import {
  calculateBudgetPercentileFromDistributionV2,
  createMarketDistributionV2,
  normalizeMarketCurrencyV2,
} from "../market-context/marketContextStatistics";

import type {
  SmartStayScoreBreakdownV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayQualityEvaluationV2,
} from "../quality/qualityEngine";

import type {
  SmartStayUserUtilityEvaluationV2,
  SmartStayUtilityPreferenceIdV2,
} from "../utility/userUtilityEngine";

export type SmartStayBudgetIntentLevelV2 =
  | "constrained"
  | "value"
  | "balanced"
  | "premium"
  | "luxury";

export type SmartStayExperienceTierV2 =
  | "essential"
  | "standard"
  | "premium"
  | "luxury"
  | "unknown";

export type SmartStayBudgetIntentStatusV2 =
  | "unavailable"
  | "usable"
  | "strong-data";

export interface SmartStayBudgetIntentCandidateV2 {
  hotelId: string;
  eligibleForPrimaryRanking: boolean;
  accommodationCategory?: string | null;
  utility: SmartStayUserUtilityEvaluationV2;
  priceValue: SmartStayPriceValueEvaluationV2;
  quality: SmartStayQualityEvaluationV2;
  location: SmartStayLocationEvaluationV2;
  comfortFlexibility: SmartStayComfortFlexibilityEvaluationV2;
  scores: SmartStayScoreBreakdownV2;
}

export interface SmartStayBudgetIntentInputV2 {
  candidates: SmartStayBudgetIntentCandidateV2[];
  totalBudget?: number | null;
  nights?: number | null;
  rooms?: number | null;
  preferenceId?: SmartStayUtilityPreferenceIdV2 | string | null;
  marketContext?: SmartStayMarketContextSnapshotV2 | null;
}

export interface SmartStayBudgetIntentMarketV2 {
  basis: "per-room-night";
  source: SmartStayMarketContextSourceV2 | "candidate-fallback";
  confidence: number;
  seasonalIndex: number | null;
  currency: string | null;
  sampleSize: number;
  minimum: number | null;
  firstQuartile: number | null;
  median: number | null;
  thirdQuartile: number | null;
  ninetiethPercentile: number | null;
  maximum: number | null;
  budgetPercentile: number | null;
  budgetToMedianRatio: number | null;
  budgetToUpperQuartileRatio: number | null;
}

export interface SmartStayBudgetIntentPolicyV2 {
  active: boolean;
  experiencePriority: number;
  maximumBestChoiceExperienceLoss: number;
  maximumSavingExperienceLoss: number;
  minimumBestChoiceTierRank: number;
  experienceTargetRequired: boolean;
  savingRequiresExperienceParity: boolean;
}

export interface SmartStayBudgetIntentCandidateEvaluationV2 {
  hotelId: string;
  preferenceId: SmartStayUtilityPreferenceIdV2;
  intentAdjustedScore: number | null;
  experienceScore: number | null;
  experienceTier: SmartStayExperienceTierV2;
  experienceTierRank: number;
  marketPositionPercentile: number | null;
  minimumBestChoiceMarketPositionPercentile: number | null;
  meetsAspirationalMarketFloor: boolean;
  bestChoiceEligible: boolean;
  savingEligible: boolean;
  maximumSavingExperienceLoss: number;
  minimumSavingTierRank: number;
  savingRequiresExperienceParity: boolean;
  intentLevel: SmartStayBudgetIntentLevelV2;
  experienceGapFromBest: number | null;
  reasonCodes: string[];
}

export interface SmartStayBudgetIntentEvaluationV2 {
  status: SmartStayBudgetIntentStatusV2;
  preferenceId: SmartStayUtilityPreferenceIdV2;
  level: SmartStayBudgetIntentLevelV2;
  totalBudget: number | null;
  nights: number;
  rooms: number;
  budgetPerRoomNight: number | null;
  market: SmartStayBudgetIntentMarketV2;
  policy: SmartStayBudgetIntentPolicyV2;
  bestAvailableExperienceScore: number | null;
  targetExperienceFloor: number | null;
  targetExperienceTier: SmartStayExperienceTierV2;
  minimumBestChoiceMarketPositionPercentile: number | null;
  candidateEvaluations: SmartStayBudgetIntentCandidateEvaluationV2[];
  reasonCodes: string[];
}

type ExperienceWeights = {
  quality: number;
  comfort: number;
  location: number;
  flexibility: number;
  stars: number;
  categoryFit: number;
  userFit: number;
};

type CandidateSignal = {
  source: SmartStayBudgetIntentCandidateV2;
  totalCost: number | null;
  currency: string | null;
  utilityScore: number | null;
  experienceScore: number | null;
  experienceTier: SmartStayExperienceTierV2;
  experienceTierRank: number;
  marketPositionPercentile: number | null;
};

const PREFERENCE_IDS: readonly SmartStayUtilityPreferenceIdV2[] = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
];

const EXPERIENCE_TIER_RANK: Readonly<
  Record<SmartStayExperienceTierV2, number>
> = {
  unknown: 0,
  essential: 1,
  standard: 2,
  premium: 3,
  luxury: 4,
};

const MAXIMUM_COMFORT_ASPIRATIONAL_COHORT_SIZE =
  3;

const MINIMUM_LUXURY_ASPIRATIONAL_MARKET_PERCENTILE =
  85;

const EXPERIENCE_WEIGHTS: Readonly<
  Record<SmartStayUtilityPreferenceIdV2, ExperienceWeights>
> = {
  "maximum-comfort": {
    quality: 0.27,
    comfort: 0.25,
    location: 0.13,
    flexibility: 0.08,
    stars: 0.2,
    categoryFit: 0.04,
    userFit: 0.03,
  },
  comfort: {
    quality: 0.28,
    comfort: 0.23,
    location: 0.16,
    flexibility: 0.08,
    stars: 0.15,
    categoryFit: 0.04,
    userFit: 0.06,
  },
  balanced: {
    quality: 0.25,
    comfort: 0.18,
    location: 0.2,
    flexibility: 0.08,
    stars: 0.1,
    categoryFit: 0.07,
    userFit: 0.12,
  },
  savings: {
    quality: 0.27,
    comfort: 0.15,
    location: 0.18,
    flexibility: 0.08,
    stars: 0.07,
    categoryFit: 0.07,
    userFit: 0.18,
  },
  "maximum-savings": {
    quality: 0.27,
    comfort: 0.12,
    location: 0.16,
    flexibility: 0.07,
    stars: 0.05,
    categoryFit: 0.07,
    userFit: 0.26,
  },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number, decimalPlaces = 2) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizePositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function normalizeScore(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.max(Math.round(value), 1)
    : fallback;
}

function normalizePreferenceId(
  value: unknown,
  candidates: SmartStayBudgetIntentCandidateV2[]
): SmartStayUtilityPreferenceIdV2 {
  if (
    typeof value === "string" &&
    (PREFERENCE_IDS as readonly string[]).includes(value)
  ) {
    return value as SmartStayUtilityPreferenceIdV2;
  }

  return candidates[0]?.utility.preference.id ?? "balanced";
}

function normalizeCurrency(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function calculateBudgetPercentile(budget: number, costs: number[]) {
  if (costs.length === 0) {
    return null;
  }

  return (
    costs.filter((cost) => cost <= budget).length /
    costs.length
  ) * 100;
}

function calculateMarketPositionPercentile(
  totalCost: number | null,
  currency: string | null,
  candidates: SmartStayBudgetIntentCandidateV2[],
  marketCurrency: string | null
) {
  if (
    totalCost === null ||
    currency === null ||
    marketCurrency === null ||
    currency !== marketCurrency
  ) {
    return null;
  }

  const costs = candidates
    .filter(
      (candidate) =>
        candidate.eligibleForPrimaryRanking === true &&
        normalizeCurrency(candidate.priceValue.currency) === marketCurrency
    )
    .map((candidate) => normalizePositiveNumber(candidate.priceValue.totalCost))
    .filter((value): value is number => value !== null)
    .sort((first, second) => first - second);

  if (costs.length === 0) {
    return null;
  }

  return round(
    (costs.filter((cost) => cost <= totalCost).length / costs.length) * 100,
    2
  );
}

function resolveMarketCurrency(
  candidates: SmartStayBudgetIntentCandidateV2[]
) {
  const counts = new Map<string, number>();

  for (const candidate of candidates) {
    if (!candidate.eligibleForPrimaryRanking) {
      continue;
    }

    const currency = normalizeCurrency(candidate.priceValue.currency);
    const totalCost = normalizePositiveNumber(candidate.priceValue.totalCost);

    if (!currency || totalCost === null) {
      continue;
    }

    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }

  return [...counts.entries()].sort(
    (first, second) =>
      second[1] - first[1] || first[0].localeCompare(second[0])
  )[0]?.[0] ?? null;
}

function createMarket(
  candidates: SmartStayBudgetIntentCandidateV2[],
  budgetPerRoomNight: number | null,
  nights: number,
  rooms: number,
  marketContext: SmartStayMarketContextSnapshotV2 | null
): SmartStayBudgetIntentMarketV2 {
  const suppliedContext =
    marketContext !== null &&
    marketContext.status !== "unavailable" &&
    marketContext.distribution.sampleSize >= 3 &&
    marketContext.distribution.median !== null
      ? marketContext
      : null;

  const currency =
    suppliedContext?.currency ??
    resolveMarketCurrency(candidates);

  const divisor =
    nights *
    rooms;

  const fallbackCosts =
    candidates
      .filter(
        (candidate) =>
          candidate.eligibleForPrimaryRanking === true &&
          normalizeCurrency(candidate.priceValue.currency) === currency
      )
      .map(
        (candidate) =>
          normalizePositiveNumber(
            candidate.priceValue.totalCost
          )
      )
      .filter(
        (
          value
        ): value is number =>
          value !==
          null
      )
      .map(
        (value) =>
          value /
          divisor
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

  const fallbackDistribution =
    createMarketDistributionV2(
      fallbackCosts
    );

  const distribution =
    suppliedContext?.distribution ??
    fallbackDistribution;

  const budgetPercentile =
    budgetPerRoomNight ===
      null
      ? null
      : suppliedContext
        ? calculateBudgetPercentileFromDistributionV2(
            budgetPerRoomNight,
            distribution
          )
        : calculateBudgetPercentile(
            budgetPerRoomNight,
            fallbackCosts
          );

  return {
    basis:
      "per-room-night",

    source:
      suppliedContext?.source ??
      "candidate-fallback",

    confidence:
      suppliedContext?.confidence ??
      (
        distribution.sampleSize >=
          8
          ? 0.62
          : distribution.sampleSize >=
              3
            ? 0.42
            : 0
      ),

    seasonalIndex:
      suppliedContext?.seasonalIndex ??
      null,

    currency:
      suppliedContext?.currency ??
      normalizeMarketCurrencyV2(
        currency
      ),

    sampleSize:
      distribution.sampleSize,

    minimum:
      distribution.minimum,

    firstQuartile:
      distribution.firstQuartile,

    median:
      distribution.median,

    thirdQuartile:
      distribution.thirdQuartile,

    ninetiethPercentile:
      distribution.ninetiethPercentile,

    maximum:
      distribution.maximum,

    budgetPercentile:
      budgetPercentile ===
        null
        ? null
        : round(
            budgetPercentile,
            2
          ),

    budgetToMedianRatio:
      budgetPerRoomNight !==
        null &&
      distribution.median !==
        null &&
      distribution.median >
        0
        ? round(
            budgetPerRoomNight /
            distribution.median,
            4
          )
        : null,

    budgetToUpperQuartileRatio:
      budgetPerRoomNight !==
        null &&
      distribution.thirdQuartile !==
        null &&
      distribution.thirdQuartile >
        0
        ? round(
            budgetPerRoomNight /
            distribution.thirdQuartile,
            4
          )
        : null,
  };
}

function resolveStatus(
  market: SmartStayBudgetIntentMarketV2,
  budgetPerRoomNight: number | null
): SmartStayBudgetIntentStatusV2 {
  if (
    budgetPerRoomNight === null ||
    market.sampleSize < 3
  ) {
    return "unavailable";
  }

  return (
    market.sampleSize >= 8 &&
    market.confidence >= 0.6
  )
    ? "strong-data"
    : "usable";
}

function resolveIntentLevel(
  market: SmartStayBudgetIntentMarketV2,
  budgetPerRoomNight: number | null
): SmartStayBudgetIntentLevelV2 {
  if (
    budgetPerRoomNight === null ||
    market.sampleSize < 3 ||
    market.firstQuartile === null ||
    market.median === null ||
    market.thirdQuartile === null ||
    market.ninetiethPercentile === null
  ) {
    return "balanced";
  }

  if (
    budgetPerRoomNight <
    market.firstQuartile *
      0.9
  ) {
    return "constrained";
  }

  if (
    budgetPerRoomNight <
    market.median *
      0.95
  ) {
    return "value";
  }

  if (
    budgetPerRoomNight <
    market.thirdQuartile *
      1.1
  ) {
    return "balanced";
  }

  const luxuryByPercentile =
    (
      market.budgetPercentile ??
      0
    ) >=
    95;

  const luxuryByMedian =
    (
      market.budgetToMedianRatio ??
      0
    ) >=
    3;

  const luxuryByUpperMarket =
    budgetPerRoomNight >=
    market.ninetiethPercentile *
      1.15;

  return (
    luxuryByPercentile ||
    luxuryByMedian ||
    luxuryByUpperMarket
  )
    ? "luxury"
    : "premium";
}

function createNeutralPolicy(): SmartStayBudgetIntentPolicyV2 {
  return {
    active: false,
    experiencePriority: 0,
    maximumBestChoiceExperienceLoss: 100,
    maximumSavingExperienceLoss: 100,
    minimumBestChoiceTierRank: 0,
    experienceTargetRequired: false,
    savingRequiresExperienceParity: false,
  };
}

function createPolicy(
  preferenceId: SmartStayUtilityPreferenceIdV2,
  level: SmartStayBudgetIntentLevelV2,
  active: boolean
): SmartStayBudgetIntentPolicyV2 {
  if (!active) {
    return createNeutralPolicy();
  }

  if (preferenceId === "maximum-comfort") {
    const values = {
      constrained: { priority: 0.78, bestLoss: 10, savingLoss: 8, tier: 1 },
      value: { priority: 0.82, bestLoss: 8, savingLoss: 7, tier: 1 },
      balanced: { priority: 0.85, bestLoss: 7, savingLoss: 6, tier: 2 },
      premium: { priority: 0.89, bestLoss: 5, savingLoss: 5, tier: 3 },
      luxury: { priority: 0.93, bestLoss: 4, savingLoss: 4, tier: 3 },
    }[level];

    return {
      active: true,
      experiencePriority: values.priority,
      maximumBestChoiceExperienceLoss: values.bestLoss,
      maximumSavingExperienceLoss: values.savingLoss,
      minimumBestChoiceTierRank: values.tier,
      experienceTargetRequired: true,
      savingRequiresExperienceParity: true,
    };
  }

  if (preferenceId === "comfort") {
    const values = {
      constrained: { priority: 0.55, bestLoss: 14, savingLoss: 14, tier: 1 },
      value: { priority: 0.6, bestLoss: 12, savingLoss: 12, tier: 1 },
      balanced: { priority: 0.65, bestLoss: 10, savingLoss: 10, tier: 1 },
      premium: { priority: 0.72, bestLoss: 8, savingLoss: 9, tier: 2 },
      luxury: { priority: 0.78, bestLoss: 7, savingLoss: 8, tier: 2 },
    }[level];

    return {
      active: true,
      experiencePriority: values.priority,
      maximumBestChoiceExperienceLoss: values.bestLoss,
      maximumSavingExperienceLoss: values.savingLoss,
      minimumBestChoiceTierRank: values.tier,
      experienceTargetRequired: true,
      savingRequiresExperienceParity:
        level === "premium" || level === "luxury",
    };
  }

  return createNeutralPolicy();
}

function normalizeDimensionScore(
  score: unknown,
  confidence: unknown,
  minimumConfidence = 0.55
) {
  return typeof score === "number" &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 100 &&
    typeof confidence === "number" &&
    Number.isFinite(confidence) &&
    confidence >= minimumConfidence
    ? score
    : null;
}

function calculateWeightedScore(
  values: Array<{ score: number | null; weight: number }>
) {
  const available = values.filter(
    (value): value is { score: number; weight: number } =>
      value.score !== null && value.weight > 0
  );
  const totalWeight = available.reduce(
    (total, value) => total + value.weight,
    0
  );

  if (totalWeight <= 0) {
    return null;
  }

  return (
    available.reduce(
      (total, value) => total + value.score * value.weight,
      0
    ) / totalWeight
  );
}

function createExperienceScore(
  candidate: SmartStayBudgetIntentCandidateV2,
  preferenceId: SmartStayUtilityPreferenceIdV2
) {
  const weights = EXPERIENCE_WEIGHTS[preferenceId];
  const score = calculateWeightedScore([
    {
      score: normalizeDimensionScore(
        candidate.quality.score,
        candidate.quality.confidence
      ),
      weight: weights.quality,
    },
    {
      score: normalizeDimensionScore(
        candidate.comfortFlexibility.dimensions.comfort.score,
        candidate.comfortFlexibility.dimensions.comfort.confidence
      ),
      weight: weights.comfort,
    },
    {
      score: normalizeDimensionScore(
        candidate.location.score,
        candidate.location.confidence
      ),
      weight: weights.location,
    },
    {
      score: normalizeDimensionScore(
        candidate.comfortFlexibility.dimensions.flexibility.score,
        candidate.comfortFlexibility.dimensions.flexibility.confidence
      ),
      weight: weights.flexibility,
    },
    {
      score: normalizeDimensionScore(
        candidate.quality.starQuality.normalizedScore,
        candidate.quality.starQuality.confidence
      ),
      weight: weights.stars,
    },
    {
      score: normalizeDimensionScore(
        candidate.scores.categoryFit.score,
        candidate.scores.categoryFit.confidence
      ),
      weight: weights.categoryFit,
    },
    {
      score: normalizeDimensionScore(
        candidate.scores.userFit.score,
        candidate.scores.userFit.confidence
      ),
      weight: weights.userFit,
    },
  ]);

  return score === null ? null : round(score, 4);
}

function classifyExperienceTier(
  candidate: SmartStayBudgetIntentCandidateV2,
  experienceScore: number | null
): SmartStayExperienceTierV2 {
  if (experienceScore === null) {
    return "unknown";
  }

  const stars = candidate.quality.starQuality.stars;
  const quality = candidate.quality.score;
  const comfort = candidate.comfortFlexibility.dimensions.comfort.score;
  const category = candidate.accommodationCategory?.trim().toLowerCase() ?? "";
  const premiumCategory =
    category === "resort" || category === "villa" || category === "aparthotel";

  if (
    (typeof stars === "number" && stars >= 4.5 && experienceScore >= 82) ||
    (premiumCategory && experienceScore >= 92) ||
    (experienceScore >= 95 &&
      typeof quality === "number" &&
      quality >= 92 &&
      typeof comfort === "number" &&
      comfort >= 90)
  ) {
    return "luxury";
  }

  if (
    (typeof stars === "number" && stars >= 4 && experienceScore >= 76) ||
    (experienceScore >= 90 &&
      typeof quality === "number" &&
      quality >= 88 &&
      typeof comfort === "number" &&
      comfort >= 85)
  ) {
    return "premium";
  }

  if (experienceScore >= 70) {
    return "standard";
  }

  return "essential";
}

function createCandidateSignals(
  candidates: SmartStayBudgetIntentCandidateV2[],
  preferenceId: SmartStayUtilityPreferenceIdV2,
  marketCurrency: string | null
): CandidateSignal[] {
  return candidates.map((candidate) => {
    const totalCost = normalizePositiveNumber(candidate.priceValue.totalCost);
    const currency = normalizeCurrency(candidate.priceValue.currency);
    const experienceScore = createExperienceScore(candidate, preferenceId);
    const experienceTier = classifyExperienceTier(candidate, experienceScore);

    return {
      source: candidate,
      totalCost,
      currency,
      utilityScore: normalizeScore(candidate.utility.utilityScore),
      experienceScore,
      experienceTier,
      experienceTierRank: EXPERIENCE_TIER_RANK[experienceTier],
      marketPositionPercentile: calculateMarketPositionPercentile(
        totalCost,
        currency,
        candidates,
        marketCurrency
      ),
    };
  });
}

function resolveHighestAvailableTierRank(
  signals: CandidateSignal[],
  totalBudget: number | null,
  marketCurrency: string | null
) {
  const ranks = signals
    .filter(
      (signal) =>
        signal.source.eligibleForPrimaryRanking === true &&
        signal.totalCost !== null &&
        totalBudget !== null &&
        signal.totalCost <= totalBudget &&
        signal.currency === marketCurrency &&
        signal.experienceScore !== null
    )
    .map((signal) => signal.experienceTierRank);

  return ranks.length > 0 ? Math.max(...ranks) : 0;
}

function resolveTargetTierRank(
  preferenceId: SmartStayUtilityPreferenceIdV2,
  highestAvailableTierRank: number,
  policy: SmartStayBudgetIntentPolicyV2
) {
  if (!policy.experienceTargetRequired) {
    return 0;
  }

  const preferenceTarget =
    preferenceId === "maximum-comfort"
      ? highestAvailableTierRank
      : preferenceId === "comfort"
        ? Math.max(highestAvailableTierRank - 1, 1)
        : 0;

  return clamp(
    Math.max(policy.minimumBestChoiceTierRank, preferenceTarget),
    0,
    4
  );
}

function tierFromRank(rank: number): SmartStayExperienceTierV2 {
  return (
    (Object.entries(EXPERIENCE_TIER_RANK).find(
      ([, value]) => value === rank
    )?.[0] as SmartStayExperienceTierV2 | undefined) ?? "unknown"
  );
}

function resolveMinimumBestChoiceMarketPositionPercentile(
  signals: CandidateSignal[],
  preferenceId: SmartStayUtilityPreferenceIdV2,
  intentLevel: SmartStayBudgetIntentLevelV2,
  targetExperienceFloor: number | null,
  targetTierRank: number
) {
  if (
    preferenceId !== "maximum-comfort" ||
    intentLevel !== "luxury" ||
    targetExperienceFloor === null
  ) {
    return null;
  }

  const coherentLuxurySignals = signals
    .filter(
      (signal) =>
        signal.source.eligibleForPrimaryRanking === true &&
        signal.experienceScore !== null &&
        signal.experienceScore >= targetExperienceFloor &&
        signal.experienceTierRank >= targetTierRank &&
        typeof signal.marketPositionPercentile === "number" &&
        Number.isFinite(signal.marketPositionPercentile)
    )
    .sort(
      (first, second) =>
        (second.marketPositionPercentile ?? -1) -
          (first.marketPositionPercentile ?? -1) ||
        (second.experienceScore ?? -1) -
          (first.experienceScore ?? -1) ||
        first.source.hotelId.localeCompare(second.source.hotelId)
    );

  if (coherentLuxurySignals.length === 0) {
    return null;
  }

  const cohortSize = Math.min(
    MAXIMUM_COMFORT_ASPIRATIONAL_COHORT_SIZE,
    coherentLuxurySignals.length
  );
  const highestPosition =
    coherentLuxurySignals[0]?.marketPositionPercentile ?? null;
  const cohortFloor =
    coherentLuxurySignals[cohortSize - 1]?.marketPositionPercentile ??
    highestPosition;

  if (highestPosition === null || cohortFloor === null) {
    return null;
  }

  return round(
    Math.min(
      highestPosition,
      Math.max(
        MINIMUM_LUXURY_ASPIRATIONAL_MARKET_PERCENTILE,
        cohortFloor
      )
    ),
    2
  );
}

function createAdjustedScore(
  signal: CandidateSignal,
  policy: SmartStayBudgetIntentPolicyV2,
  targetExperienceFloor: number | null,
  targetTierRank: number
) {
  if (
    !policy.active ||
    policy.experiencePriority <= 0 ||
    signal.utilityScore === null ||
    signal.experienceScore === null
  ) {
    return null;
  }

  const blendedScore =
    signal.experienceScore * policy.experiencePriority +
    signal.utilityScore * (1 - policy.experiencePriority);
  const experienceGap =
    targetExperienceFloor === null
      ? 0
      : Math.max(targetExperienceFloor - signal.experienceScore, 0);
  const tierGap = Math.max(targetTierRank - signal.experienceTierRank, 0);
  const coherencePenalty =
    policy.experienceTargetRequired
      ? experienceGap * 1.5 + tierGap * 6
      : 0;

  return round(clamp(blendedScore - coherencePenalty, 0, 100), 4);
}

export function evaluateBudgetIntentV2(
  input: SmartStayBudgetIntentInputV2
): SmartStayBudgetIntentEvaluationV2 {
  const totalBudget = normalizePositiveNumber(input.totalBudget);
  const nights = normalizePositiveInteger(input.nights, 1);
  const rooms = normalizePositiveInteger(input.rooms, 1);
  const preferenceId = normalizePreferenceId(
    input.preferenceId,
    input.candidates
  );
  const budgetPerRoomNight =
    totalBudget === null
      ? null
      : totalBudget /
        (
          nights *
          rooms
        );
  const market = createMarket(
    input.candidates,
    budgetPerRoomNight,
    nights,
    rooms,
    input.marketContext ?? null
  );
  const status = resolveStatus(
    market,
    budgetPerRoomNight
  );
  const level = resolveIntentLevel(
    market,
    budgetPerRoomNight
  );
  const policy = createPolicy(preferenceId, level, status !== "unavailable");
  const signals = createCandidateSignals(
    input.candidates,
    preferenceId,
    market.currency
  );
  const withinBudgetSignals = signals.filter(
    (signal) =>
      signal.source.eligibleForPrimaryRanking === true &&
      signal.totalCost !== null &&
      totalBudget !== null &&
      signal.totalCost <= totalBudget &&
      signal.currency === market.currency &&
      signal.experienceScore !== null
  );
  const bestAvailableExperienceScore =
    withinBudgetSignals.length > 0
      ? Math.max(
          ...withinBudgetSignals.map(
            (signal) => signal.experienceScore as number
          )
        )
      : null;
  const targetExperienceFloor =
    !policy.experienceTargetRequired || bestAvailableExperienceScore === null
      ? null
      : Math.max(
          bestAvailableExperienceScore -
            policy.maximumBestChoiceExperienceLoss,
          0
        );
  const highestAvailableTierRank = resolveHighestAvailableTierRank(
    signals,
    totalBudget,
    market.currency
  );
  const targetTierRank = resolveTargetTierRank(
    preferenceId,
    highestAvailableTierRank,
    policy
  );
  const minimumSavingTierRank = policy.savingRequiresExperienceParity
    ? targetTierRank
    : 0;
  const minimumBestChoiceMarketPositionPercentile =
    resolveMinimumBestChoiceMarketPositionPercentile(
      withinBudgetSignals,
      preferenceId,
      level,
      targetExperienceFloor,
      targetTierRank
    );

  const candidateEvaluations = signals
    .map((signal): SmartStayBudgetIntentCandidateEvaluationV2 => {
      const withinBudget =
        signal.totalCost !== null &&
        totalBudget !== null &&
        signal.totalCost <= totalBudget &&
        signal.currency === market.currency;
      const experienceGapFromBest =
        signal.experienceScore === null ||
        bestAvailableExperienceScore === null
          ? null
          : round(
              bestAvailableExperienceScore - signal.experienceScore,
              4
            );
      const meetsExperienceFloor =
        !policy.experienceTargetRequired ||
        (signal.experienceScore !== null &&
          targetExperienceFloor !== null &&
          signal.experienceScore >= targetExperienceFloor);
      const meetsTierFloor =
        !policy.experienceTargetRequired ||
        signal.experienceTierRank >= targetTierRank;
      const baseEligible =
        signal.source.eligibleForPrimaryRanking === true &&
        withinBudget &&
        signal.utilityScore !== null;
      const meetsAspirationalMarketFloor =
        minimumBestChoiceMarketPositionPercentile === null ||
        (typeof signal.marketPositionPercentile === "number" &&
          signal.marketPositionPercentile >=
            minimumBestChoiceMarketPositionPercentile);
      const bestChoiceEligible =
        baseEligible &&
        meetsExperienceFloor &&
        meetsTierFloor &&
        meetsAspirationalMarketFloor;
      const savingEligible =
        baseEligible &&
        (!policy.savingRequiresExperienceParity ||
          (signal.experienceScore !== null &&
            signal.experienceTierRank >= minimumSavingTierRank));
      const marketPositionReason =
        signal.marketPositionPercentile === null
          ? "luxury-market-position:unavailable"
          : signal.marketPositionPercentile >= 90
            ? "luxury-market-position:top-decile"
            : signal.marketPositionPercentile >= 75
              ? "luxury-market-position:upper-quartile"
              : "luxury-market-position:main-market";

      const reasonCodes = [
        `budget-intent-level:${level}`,
        `budget-intent-preference:${preferenceId}`,
        `experience-tier:${signal.experienceTier}`,
        marketPositionReason,
        policy.active
          ? "budget-intent-policy-active"
          : "budget-intent-policy-inactive",
        policy.experienceTargetRequired
          ? "experience-target-required"
          : "experience-target-not-required",
        meetsExperienceFloor
          ? "experience-floor-satisfied"
          : "experience-floor-not-satisfied",
        meetsTierFloor
          ? "experience-tier-floor-satisfied"
          : "experience-tier-floor-not-satisfied",
        meetsAspirationalMarketFloor
          ? "luxury-aspirational-market-floor-satisfied"
          : "luxury-aspirational-market-floor-not-satisfied",
        bestChoiceEligible
          ? "experience-target-satisfied"
          : "experience-target-not-satisfied",
        savingEligible
          ? "saving-experience-coherent"
          : "saving-experience-incoherent",
      ];

      return {
        hotelId: signal.source.hotelId,
        preferenceId,
        intentAdjustedScore: createAdjustedScore(
          signal,
          policy,
          targetExperienceFloor,
          targetTierRank
        ),
        experienceScore: signal.experienceScore,
        experienceTier: signal.experienceTier,
        experienceTierRank: signal.experienceTierRank,
        marketPositionPercentile: signal.marketPositionPercentile,
        minimumBestChoiceMarketPositionPercentile,
        meetsAspirationalMarketFloor,
        bestChoiceEligible,
        savingEligible,
        maximumSavingExperienceLoss: policy.maximumSavingExperienceLoss,
        minimumSavingTierRank,
        savingRequiresExperienceParity:
          policy.savingRequiresExperienceParity,
        intentLevel: level,
        experienceGapFromBest,
        reasonCodes: uniqueSorted(reasonCodes),
      };
    })
    .sort((first, second) => first.hotelId.localeCompare(second.hotelId));

  return {
    status,
    preferenceId,
    level,
    totalBudget: totalBudget === null ? null : round(totalBudget),
    nights,
    rooms,
    budgetPerRoomNight:
      budgetPerRoomNight === null
        ? null
        : round(
            budgetPerRoomNight
          ),
    market,
    policy,
    bestAvailableExperienceScore:
      bestAvailableExperienceScore === null
        ? null
        : round(bestAvailableExperienceScore, 4),
    targetExperienceFloor:
      targetExperienceFloor === null
        ? null
        : round(targetExperienceFloor, 4),
    targetExperienceTier: tierFromRank(targetTierRank),
    minimumBestChoiceMarketPositionPercentile,
    candidateEvaluations,
    reasonCodes: uniqueSorted([
      `budget-intent-level:${level}`,
      `budget-intent-preference:${preferenceId}`,
      `budget-intent-market-basis:${market.basis}`,
      `budget-intent-market-source:${market.source}`,
      market.seasonalIndex === null
        ? "budget-intent-seasonality-unavailable"
        : "budget-intent-seasonality-available",
      policy.active
        ? "budget-intent-policy-active"
        : "budget-intent-policy-inactive",
      policy.experienceTargetRequired
        ? "budget-intent-experience-target-active"
        : "budget-intent-experience-target-inactive",
      policy.savingRequiresExperienceParity
        ? "budget-intent-saving-parity-required"
        : "budget-intent-saving-parity-not-required",
    ]),
  };
}
