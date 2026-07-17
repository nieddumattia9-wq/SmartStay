import type {
  SmartStayAccommodationProfileV2,
  SmartStayRankBand,
  SmartStayRiskAssessmentV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayPrimaryRecommendationRoleV2,
  SmartStayRecommendationEvaluationV2,
} from "../recommendation/recommendationRolesEngine";

import type {
  SmartStayUserUtilityEvaluationV2,
} from "../utility/userUtilityEngine";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

export type SmartStayRankingStabilityDiversityStatusV2 =
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayRankingDiversityDimensionV2 =
  | "category"
  | "unit-type"
  | "provider"
  | "price-band"
  | "distance-band";

export interface SmartStayRankingStabilityDiversityCandidateV2 {
  hotelId: string;
  eligibleForRanking: boolean;
  recommendation: SmartStayRecommendationEvaluationV2;
  utility: SmartStayUserUtilityEvaluationV2;
  accommodation: SmartStayAccommodationProfileV2;
  risk: SmartStayRiskAssessmentV2;
  priceValue?: SmartStayPriceValueEvaluationV2;
  location?: SmartStayLocationEvaluationV2;
  sourceProvider?: string | null;
  propertyIdentityKey?: string | null;
  offerIdentityKey?: string | null;
  exclusionReasonCodes?: string[];
}

export interface SmartStayRankingStabilityDiversityInputV2 {
  candidates: SmartStayRankingStabilityDiversityCandidateV2[];
  previousRankingHotelIds?: string[];
}

export interface SmartStayRankingStabilityDiversityOptionsV2 {
  maximumVisibleResults?: number;
  scoreEquivalenceTolerance?: number;
  confidenceEquivalenceTolerance?: number;
  coverageEquivalenceTolerance?: number;
  riskEquivalenceTolerance?: number;
  priceEquivalenceRatio?: number;
  maximumDiversityScoreSacrifice?: number;
  diversityPenaltyScale?: number;
  maximumSameCategoryVisible?: number;
  maximumSameUnitTypeVisible?: number;
  maximumSameProviderVisible?: number;
  maximumVisiblePerNearDuplicateGroup?: number;
  priceBandRatio?: number;
  distanceBandKm?: number;
  minimumStrongConfidence?: number;
  minimumStrongCoverage?: number;
  protectPrimaryRecommendationRoles?: boolean;
}

export interface SmartStayRankingStabilityBandV2 {
  id: string;
  anchorHotelId: string;
  memberHotelIds: string[];
  minimumScore: number;
  maximumScore: number;
  previousOrderApplied: boolean;
}

export interface SmartStayRankingNearDuplicateGroupV2 {
  id: string;
  identityKey: string;
  primaryHotelId: string;
  memberHotelIds: string[];
  suppressedHotelIds: string[];
}

export interface SmartStayRankingCandidateEvaluationV2 {
  hotelId: string;
  eligible: boolean;
  baseScore: number | null;
  baseRank: number | null;
  stableRank: number | null;
  diversifiedRank: number | null;
  visibleRank: number | null;
  visible: boolean;
  rankBand: SmartStayRankBand;
  stabilityBandId: string | null;
  nearDuplicateGroupId: string | null;
  roleAnchor: boolean;
  diversityPenalty: number;
  suppressedByHotelId: string | null;
  deterministicKey: string;
  diversityDimensionCodes: SmartStayRankingDiversityDimensionV2[];
  reasonCodes: string[];
  evidenceIds: string[];
}

export interface SmartStayRankingStabilityDiversityEvaluationV2 {
  status: SmartStayRankingStabilityDiversityStatusV2;
  baseRankingHotelIds: string[];
  stableRankingHotelIds: string[];
  diversifiedRankingHotelIds: string[];
  visibleHotelIds: string[];
  additionalHotelIds: string[];
  excludedHotelIds: string[];
  stabilityBands: SmartStayRankingStabilityBandV2[];
  nearDuplicateGroups: SmartStayRankingNearDuplicateGroupV2[];
  evaluations: SmartStayRankingCandidateEvaluationV2[];
  stabilityApplied: boolean;
  diversityApplied: boolean;
  reasonCodes: string[];
}

type ResolvedOptions = Required<
  SmartStayRankingStabilityDiversityOptionsV2
>;

type ComparableCost = {
  amount: number;
  currency: string;
};

type NormalizedCandidate = {
  hotelId: string;
  source: SmartStayRankingStabilityDiversityCandidateV2;
  eligible: boolean;
  score: number | null;
  confidence: number;
  coverage: number;
  riskScore: number;
  cost: ComparableCost | null;
  distanceKm: number | null;
  provider: string | null;
  category: SmartStayAccommodationProfileV2["category"];
  unitType: SmartStayAccommodationProfileV2["unitType"];
  nearDuplicateKey: string | null;
  roleAnchor: boolean;
  exclusionReasonCodes: string[];
  evidenceIds: string[];
};

type StableCandidate = NormalizedCandidate & {
  baseRank: number;
  stableRank: number;
  stabilityBandId: string;
};

type DiversitySelection = {
  candidate: StableCandidate;
  penalty: number;
  dimensionCodes: SmartStayRankingDiversityDimensionV2[];
  nearDuplicateFallback: boolean;
};

const PRIMARY_ROLE_ORDER:
  readonly SmartStayPrimaryRecommendationRoleV2[] = [
    "best-choice",
    "best-sensible-saving",
    "worthwhile-comfort-upgrade",
  ];

const DEFAULTS: ResolvedOptions = {
  maximumVisibleResults: 10,
  scoreEquivalenceTolerance: 0.75,
  confidenceEquivalenceTolerance: 0.08,
  coverageEquivalenceTolerance: 0.08,
  riskEquivalenceTolerance: 6,
  priceEquivalenceRatio: 0.03,
  maximumDiversityScoreSacrifice: 3,
  diversityPenaltyScale: 6,
  maximumSameCategoryVisible: 4,
  maximumSameUnitTypeVisible: 4,
  maximumSameProviderVisible: 4,
  maximumVisiblePerNearDuplicateGroup: 1,
  priceBandRatio: 0.15,
  distanceBandKm: 1,
  minimumStrongConfidence: 0.8,
  minimumStrongCoverage: 0.8,
  protectPrimaryRecommendationRoles: true,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number
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
  value: number,
  decimalPlaces = 4
) {
  const factor =
    10 ** decimalPlaces;

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
    factor
  ) /
  factor;
}

function compareStrings(
  first: string,
  second: string
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
  values: Value[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort(
    compareStrings
  ) as Value[];
}

function normalizeRatio(
  value: unknown,
  fallback: number
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? clamp(
        value,
        0,
        1
      )
    : fallback;
}

function normalizeNonNegativeNumber(
  value: unknown,
  fallback: number
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : fallback;
}

function normalizePositiveNumber(
  value: unknown,
  fallback: number
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : fallback;
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  maximum: number
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? clamp(
        Math.round(value),
        1,
        maximum
      )
    : fallback;
}

function resolveOptions(
  options:
    SmartStayRankingStabilityDiversityOptionsV2
): ResolvedOptions {
  return {
    maximumVisibleResults:
      normalizePositiveInteger(
        options.maximumVisibleResults,
        DEFAULTS.maximumVisibleResults,
        100
      ),

    scoreEquivalenceTolerance:
      normalizeNonNegativeNumber(
        options.scoreEquivalenceTolerance,
        DEFAULTS.scoreEquivalenceTolerance
      ),

    confidenceEquivalenceTolerance:
      normalizeRatio(
        options.confidenceEquivalenceTolerance,
        DEFAULTS.confidenceEquivalenceTolerance
      ),

    coverageEquivalenceTolerance:
      normalizeRatio(
        options.coverageEquivalenceTolerance,
        DEFAULTS.coverageEquivalenceTolerance
      ),

    riskEquivalenceTolerance:
      normalizeNonNegativeNumber(
        options.riskEquivalenceTolerance,
        DEFAULTS.riskEquivalenceTolerance
      ),

    priceEquivalenceRatio:
      normalizeRatio(
        options.priceEquivalenceRatio,
        DEFAULTS.priceEquivalenceRatio
      ),

    maximumDiversityScoreSacrifice:
      normalizeNonNegativeNumber(
        options.maximumDiversityScoreSacrifice,
        DEFAULTS.maximumDiversityScoreSacrifice
      ),

    diversityPenaltyScale:
      normalizeNonNegativeNumber(
        options.diversityPenaltyScale,
        DEFAULTS.diversityPenaltyScale
      ),

    maximumSameCategoryVisible:
      normalizePositiveInteger(
        options.maximumSameCategoryVisible,
        DEFAULTS.maximumSameCategoryVisible,
        100
      ),

    maximumSameUnitTypeVisible:
      normalizePositiveInteger(
        options.maximumSameUnitTypeVisible,
        DEFAULTS.maximumSameUnitTypeVisible,
        100
      ),

    maximumSameProviderVisible:
      normalizePositiveInteger(
        options.maximumSameProviderVisible,
        DEFAULTS.maximumSameProviderVisible,
        100
      ),

    maximumVisiblePerNearDuplicateGroup:
      normalizePositiveInteger(
        options.maximumVisiblePerNearDuplicateGroup,
        DEFAULTS.maximumVisiblePerNearDuplicateGroup,
        20
      ),

    priceBandRatio:
      normalizePositiveNumber(
        options.priceBandRatio,
        DEFAULTS.priceBandRatio
      ),

    distanceBandKm:
      normalizePositiveNumber(
        options.distanceBandKm,
        DEFAULTS.distanceBandKm
      ),

    minimumStrongConfidence:
      normalizeRatio(
        options.minimumStrongConfidence,
        DEFAULTS.minimumStrongConfidence
      ),

    minimumStrongCoverage:
      normalizeRatio(
        options.minimumStrongCoverage,
        DEFAULTS.minimumStrongCoverage
      ),

    protectPrimaryRecommendationRoles:
      options.protectPrimaryRecommendationRoles ??
      DEFAULTS.protectPrimaryRecommendationRoles,
  };
}

function normalizeOptionalKey(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeProvider(
  value: unknown
) {
  return normalizeOptionalKey(
    value
  );
}

function normalizeCurrency(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalized
  )
    ? normalized
    : null;
}

function getComparableCost(
  evaluation:
    SmartStayPriceValueEvaluationV2 |
    undefined
): ComparableCost | null {
  if (
    !evaluation ||
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    typeof evaluation.totalCost !== "number" ||
    !Number.isFinite(
      evaluation.totalCost
    ) ||
    evaluation.totalCost <= 0
  ) {
    return null;
  }

  const currency =
    normalizeCurrency(
      evaluation.currency
    );

  if (!currency) {
    return null;
  }

  return {
    amount:
      evaluation.totalCost,
    currency,
  };
}

function getComparableDistance(
  evaluation:
    SmartStayLocationEvaluationV2 |
    undefined
) {
  if (
    !evaluation ||
    evaluation.status === "invalid" ||
    evaluation.status === "unavailable" ||
    typeof evaluation
      .distance
      .selectedDistanceKm !== "number" ||
    !Number.isFinite(
      evaluation
        .distance
        .selectedDistanceKm
    ) ||
    evaluation
      .distance
      .selectedDistanceKm < 0 ||
    typeof evaluation.confidence !== "number" ||
    !Number.isFinite(
      evaluation.confidence
    ) ||
    evaluation.confidence < 0.55
  ) {
    return null;
  }

  return evaluation
    .distance
    .selectedDistanceKm;
}

function getCandidateScore(
  candidate:
    SmartStayRankingStabilityDiversityCandidateV2
) {
  const smartScore =
    candidate.recommendation
      .metrics.smartScore;

  if (
    typeof smartScore === "number" &&
    Number.isFinite(smartScore)
  ) {
    return clamp(
      smartScore,
      0,
      100
    );
  }

  const recommendationUtility =
    candidate.recommendation
      .metrics.utilityScore;

  if (
    typeof recommendationUtility === "number" &&
    Number.isFinite(
      recommendationUtility
    )
  ) {
    return clamp(
      recommendationUtility,
      0,
      100
    );
  }

  const utilityScore =
    candidate.utility.utilityScore;

  return typeof utilityScore === "number" &&
    Number.isFinite(utilityScore)
    ? clamp(
        utilityScore,
        0,
        100
      )
    : null;
}

function createPreferenceSignature(
  utility:
    SmartStayUserUtilityEvaluationV2
) {
  const weights =
    Object.entries(
      utility.preference.weights
    )
      .sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first[0],
            second[0]
          )
      )
      .map(
        ([
          dimension,
          weight,
        ]) =>
          `${dimension}:${Number(weight).toFixed(6)}`
      )
      .join("|");

  return [
    utility.preference.id,
    weights,
  ].join("::");
}

function isPrimaryRole(
  role:
    SmartStayRecommendationEvaluationV2["role"]
): role is SmartStayPrimaryRecommendationRoleV2 {
  return (
    PRIMARY_ROLE_ORDER as
      readonly string[]
  ).includes(
    role
  );
}

function validateInput(
  input:
    SmartStayRankingStabilityDiversityInputV2
) {
  const hotelIds =
    new Set<string>();

  let preferenceSignature:
    string | null =
      null;

  for (
    const candidate
    of input.candidates
  ) {
    if (
      typeof candidate.hotelId !== "string" ||
      !candidate.hotelId.trim()
    ) {
      throw new Error(
        "Ranking Stability & Diversity candidate requires a hotelId."
      );
    }

    const hotelId =
      candidate.hotelId.trim();

    if (
      hotelIds.has(
        hotelId
      )
    ) {
      throw new Error(
        `Ranking Stability & Diversity received duplicate hotelId: ${hotelId}`
      );
    }

    hotelIds.add(
      hotelId
    );

    const componentHotelIds = [
      candidate.utility.hotelId,
      candidate.recommendation.hotelId,
      candidate.priceValue?.hotelId,
      candidate.location?.hotelId,
    ].filter(
      (
        value
      ): value is string =>
        typeof value === "string"
    );

    if (
      componentHotelIds.some(
        (value) =>
          value !== hotelId
      )
    ) {
      throw new Error(
        `Ranking Stability & Diversity candidate hotelId mismatch: ${hotelId}`
      );
    }

    const signature =
      createPreferenceSignature(
        candidate.utility
      );

    if (
      preferenceSignature === null
    ) {
      preferenceSignature =
        signature;
    }
    else if (
      signature !==
      preferenceSignature
    ) {
      throw new Error(
        "Ranking Stability & Diversity candidates must use the same utility preference and weights."
      );
    }
  }

  const previousIds =
    input.previousRankingHotelIds ??
    [];

  const previousSet =
    new Set<string>();

  for (
    const value
    of previousIds
  ) {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new Error(
        "Previous ranking contains an invalid hotelId."
      );
    }

    const hotelId =
      value.trim();

    if (
      previousSet.has(
        hotelId
      )
    ) {
      throw new Error(
        `Previous ranking contains duplicate hotelId: ${hotelId}`
      );
    }

    previousSet.add(
      hotelId
    );
  }
}

function normalizeCandidate(
  candidate:
    SmartStayRankingStabilityDiversityCandidateV2
): NormalizedCandidate {
  const hotelId =
    candidate.hotelId.trim();

  const score =
    getCandidateScore(
      candidate
    );

  const confidence =
    normalizeRatio(
      candidate.utility
        .scoreConfidence,
      0
    );

  const coverage =
    normalizeRatio(
      candidate.utility
        .evidenceCoverage,
      0
    );

  const riskScore =
    clamp(
      typeof candidate.risk.score === "number" &&
      Number.isFinite(
        candidate.risk.score
      )
        ? candidate.risk.score
        : 100,
      0,
      100
    );

  const propertyIdentityKey =
    normalizeOptionalKey(
      candidate.propertyIdentityKey
    );

  const offerIdentityKey =
    normalizeOptionalKey(
      candidate.offerIdentityKey
    );

  const nearDuplicateKey =
    propertyIdentityKey
      ? `property:${propertyIdentityKey}`
      : offerIdentityKey
        ? `offer:${offerIdentityKey}`
        : null;

  const roleAnchor =
    candidate.recommendation
      .primaryInGroup === true &&
    isPrimaryRole(
      candidate.recommendation.role
    );

  const eligible =
    candidate.eligibleForRanking === true &&
    candidate.utility
      .eligibleForPrimaryRanking === true &&
    candidate.utility.status !== "invalid" &&
    candidate.utility.status !== "unavailable" &&
    score !== null &&
    candidate.risk.level !== "high" &&
    riskScore < 60;

  return {
    hotelId,
    source:
      candidate,
    eligible,
    score,
    confidence,
    coverage,
    riskScore,
    cost:
      getComparableCost(
        candidate.priceValue
      ),
    distanceKm:
      getComparableDistance(
        candidate.location
      ),
    provider:
      normalizeProvider(
        candidate.sourceProvider
      ),
    category:
      candidate.accommodation
        .category,
    unitType:
      candidate.accommodation
        .unitType,
    nearDuplicateKey,
    roleAnchor,
    exclusionReasonCodes:
      uniqueSorted(
        candidate.exclusionReasonCodes ??
        []
      ),
    evidenceIds:
      uniqueSorted([
        ...candidate.utility
          .evidenceIds,
        ...candidate.recommendation
          .evidenceIds,
        ...candidate.risk
          .evidenceIds,
        ...candidate.accommodation
          .evidenceIds,
        ...(
          candidate.priceValue
            ?.evidenceIds ??
          []
        ),
        ...(
          candidate.location
            ?.evidenceIds ??
          []
        ),
      ]),
  };
}

function compareBaseCandidates(
  first:
    NormalizedCandidate,
  second:
    NormalizedCandidate
) {
  if (
    first.eligible !==
    second.eligible
  ) {
    return first.eligible
      ? -1
      : 1;
  }

  return (
    (second.score ?? -1) -
      (first.score ?? -1) ||
    second.confidence -
      first.confidence ||
    second.coverage -
      first.coverage ||
    first.riskScore -
      second.riskScore ||
    (
      first.cost?.amount ??
      Number.POSITIVE_INFINITY
    ) -
      (
        second.cost?.amount ??
        Number.POSITIVE_INFINITY
      ) ||
    compareStrings(
      first.hotelId,
      second.hotelId
    )
  );
}

function costsEquivalent(
  first:
    ComparableCost | null,
  second:
    ComparableCost | null,
  maximumRatio:
    number
) {
  if (
    !first ||
    !second
  ) {
    return true;
  }

  if (
    first.currency !==
    second.currency
  ) {
    return false;
  }

  return Math.abs(
    first.amount -
    second.amount
  ) /
  Math.max(
    first.amount,
    second.amount,
    1
  ) <=
  maximumRatio;
}

function candidatesEquivalent(
  anchor:
    NormalizedCandidate,
  candidate:
    NormalizedCandidate,
  options:
    ResolvedOptions
) {
  if (
    !anchor.eligible ||
    !candidate.eligible ||
    anchor.score === null ||
    candidate.score === null
  ) {
    return false;
  }

  return (
    Math.abs(
      anchor.score -
      candidate.score
    ) <=
      options
        .scoreEquivalenceTolerance &&
    Math.abs(
      anchor.confidence -
      candidate.confidence
    ) <=
      options
        .confidenceEquivalenceTolerance &&
    Math.abs(
      anchor.coverage -
      candidate.coverage
    ) <=
      options
        .coverageEquivalenceTolerance &&
    Math.abs(
      anchor.riskScore -
      candidate.riskScore
    ) <=
      options
        .riskEquivalenceTolerance &&
    costsEquivalent(
      anchor.cost,
      candidate.cost,
      options.priceEquivalenceRatio
    )
  );
}

function createStabilityBands(
  baseEligible:
    NormalizedCandidate[],
  previousOrder:
    Map<string, number>,
  options:
    ResolvedOptions
) {
  const grouped:
    NormalizedCandidate[][] = [];

  for (
    const candidate
    of baseEligible
  ) {
    const current =
      grouped[
        grouped.length -
        1
      ];

    if (
      !current ||
      !candidatesEquivalent(
        current[0],
        candidate,
        options
      )
    ) {
      grouped.push([
        candidate,
      ]);
    }
    else {
      current.push(
        candidate
      );
    }
  }

  const bands:
    SmartStayRankingStabilityBandV2[] = [];

  const stableCandidates:
    StableCandidate[] = [];

  let stableRank =
    1;

  for (
    const members
    of grouped
  ) {
    const baseOrder =
      new Map(
        members.map(
          (
            member,
            index
          ) => [
            member.hotelId,
            index,
          ] as const
        )
      );

    const previousMembers =
      members.filter(
        (member) =>
          previousOrder.has(
            member.hotelId
          )
      );

    const previousOrderApplied =
      previousMembers.length > 1;

    const orderedMembers =
      members
        .slice()
        .sort(
          (
            first,
            second
          ) => {
            const firstPrevious =
              previousOrder.get(
                first.hotelId
              );

            const secondPrevious =
              previousOrder.get(
                second.hotelId
              );

            if (
              firstPrevious !== undefined &&
              secondPrevious !== undefined
            ) {
              return (
                firstPrevious -
                secondPrevious
              );
            }

            if (
              firstPrevious !== undefined
            ) {
              return -1;
            }

            if (
              secondPrevious !== undefined
            ) {
              return 1;
            }

            return (
              (baseOrder.get(
                first.hotelId
              ) ?? 0) -
              (baseOrder.get(
                second.hotelId
              ) ?? 0)
            );
          }
        );

    const bandMemberIds =
      uniqueSorted(
        members.map(
          (member) =>
            member.hotelId
        )
      );

    const bandId =
      `stability:${bandMemberIds.join("|")}`;

    const scores =
      members.map(
        (member) =>
          member.score as number
      );

    bands.push({
      id:
        bandId,
      anchorHotelId:
        members[0].hotelId,
      memberHotelIds:
        orderedMembers.map(
          (member) =>
            member.hotelId
        ),
      minimumScore:
        round(
          Math.min(
            ...scores
          )
        ),
      maximumScore:
        round(
          Math.max(
            ...scores
          )
        ),
      previousOrderApplied,
    });

    for (
      const member
      of orderedMembers
    ) {
      stableCandidates.push({
        ...member,
        baseRank:
          baseEligible.findIndex(
            (candidate) =>
              candidate.hotelId ===
              member.hotelId
          ) +
          1,
        stableRank,
        stabilityBandId:
          bandId,
      });

      stableRank +=
        1;
    }
  }

  return {
    bands,
    stableCandidates,
  };
}

function getPriceBand(
  candidate:
    StableCandidate,
  ratio:
    number
) {
  if (!candidate.cost) {
    return null;
  }

  const logarithmicBase =
    Math.log(
      1 +
      ratio
    );

  return logarithmicBase > 0
    ? `${candidate.cost.currency}:${Math.floor(
        Math.log(
          candidate.cost.amount
        ) /
        logarithmicBase
      )}`
    : `${candidate.cost.currency}:${Math.round(
        candidate.cost.amount
      )}`;
}

function getDistanceBand(
  candidate:
    StableCandidate,
  bandKm:
    number
) {
  return candidate.distanceKm ===
    null
    ? null
    : String(
        Math.floor(
          candidate.distanceKm /
          bandKm
        )
      );
}

function countSelectedBy<
  Key extends string
>(
  selected:
    StableCandidate[],
  selector:
    (
      candidate:
        StableCandidate
    ) => Key | null,
  value:
    Key | null
) {
  if (value === null) {
    return 0;
  }

  return selected.filter(
    (candidate) =>
      selector(candidate) ===
      value
  ).length;
}

function calculateDiversitySelection(
  candidate:
    StableCandidate,
  selected:
    StableCandidate[],
  nearDuplicateCounts:
    Map<string, number>,
  options:
    ResolvedOptions,
  allowNearDuplicateFallback:
    boolean
): DiversitySelection | null {
  const dimensions:
    SmartStayRankingDiversityDimensionV2[] = [];

  const nearDuplicateCount =
    candidate.nearDuplicateKey
      ? nearDuplicateCounts.get(
          candidate.nearDuplicateKey
        ) ??
        0
      : 0;

  const exceedsNearDuplicateLimit =
    candidate.nearDuplicateKey !==
      null &&
    nearDuplicateCount >=
      options
        .maximumVisiblePerNearDuplicateGroup;

  if (
    exceedsNearDuplicateLimit &&
    !allowNearDuplicateFallback
  ) {
    return null;
  }

  let rawPenalty =
    0;

  const sameCategoryCount =
    countSelectedBy(
      selected,
      (entry) =>
        entry.category,
      candidate.category
    );

  if (
    sameCategoryCount > 0
  ) {
    rawPenalty +=
      1;
  }
  else if (
    selected.length > 0
  ) {
    dimensions.push(
      "category"
    );
  }

  if (
    sameCategoryCount >=
    options.maximumSameCategoryVisible
  ) {
    rawPenalty +=
      3;
  }

  const sameUnitTypeCount =
    countSelectedBy(
      selected,
      (entry) =>
        entry.unitType,
      candidate.unitType
    );

  if (
    sameUnitTypeCount > 0
  ) {
    rawPenalty +=
      1;
  }
  else if (
    selected.length > 0
  ) {
    dimensions.push(
      "unit-type"
    );
  }

  if (
    sameUnitTypeCount >=
    options.maximumSameUnitTypeVisible
  ) {
    rawPenalty +=
      3;
  }

  const sameProviderCount =
    countSelectedBy(
      selected,
      (entry) =>
        entry.provider,
      candidate.provider
    );

  if (
    candidate.provider !== null &&
    sameProviderCount > 0
  ) {
    rawPenalty +=
      0.75;
  }
  else if (
    candidate.provider !== null &&
    selected.some(
      (entry) =>
        entry.provider !== null
    )
  ) {
    dimensions.push(
      "provider"
    );
  }

  if (
    candidate.provider !== null &&
    sameProviderCount >=
      options.maximumSameProviderVisible
  ) {
    rawPenalty +=
      2.5;
  }

  const candidatePriceBand =
    getPriceBand(
      candidate,
      options.priceBandRatio
    );

  const samePriceBandCount =
    countSelectedBy(
      selected,
      (entry) =>
        getPriceBand(
          entry,
          options.priceBandRatio
        ),
      candidatePriceBand
    );

  if (
    candidatePriceBand !== null &&
    samePriceBandCount > 0
  ) {
    rawPenalty +=
      0.75;
  }
  else if (
    candidatePriceBand !== null &&
    selected.some(
      (entry) =>
        getPriceBand(
          entry,
          options.priceBandRatio
        ) !== null
    )
  ) {
    dimensions.push(
      "price-band"
    );
  }

  const candidateDistanceBand =
    getDistanceBand(
      candidate,
      options.distanceBandKm
    );

  const sameDistanceBandCount =
    countSelectedBy(
      selected,
      (entry) =>
        getDistanceBand(
          entry,
          options.distanceBandKm
        ),
      candidateDistanceBand
    );

  if (
    candidateDistanceBand !== null &&
    sameDistanceBandCount > 0
  ) {
    rawPenalty +=
      0.5;
  }
  else if (
    candidateDistanceBand !== null &&
    selected.some(
      (entry) =>
        getDistanceBand(
          entry,
          options.distanceBandKm
        ) !== null
    )
  ) {
    dimensions.push(
      "distance-band"
    );
  }

  if (
    exceedsNearDuplicateLimit
  ) {
    rawPenalty +=
      20;
  }

  return {
    candidate,
    penalty:
      round(
        rawPenalty *
        options.diversityPenaltyScale,
        4
      ),
    dimensionCodes:
      uniqueSorted(
        dimensions
      ),
    nearDuplicateFallback:
      exceedsNearDuplicateLimit,
  };
}

function selectRoleAnchors(
  candidates:
    StableCandidate[],
  options:
    ResolvedOptions
) {
  if (
    !options
      .protectPrimaryRecommendationRoles
  ) {
    return [];
  }

  const selected:
    StableCandidate[] = [];

  const usedNearDuplicateKeys =
    new Set<string>();

  for (
    const role
    of PRIMARY_ROLE_ORDER
  ) {
    const candidate =
      candidates.find(
        (entry) =>
          entry.roleAnchor &&
          entry.source
            .recommendation
            .role === role &&
          (
            entry.nearDuplicateKey ===
              null ||
            !usedNearDuplicateKeys.has(
              entry.nearDuplicateKey
            )
          )
      ) ??
      null;

    if (!candidate) {
      continue;
    }

    selected.push(
      candidate
    );

    if (
      candidate.nearDuplicateKey
    ) {
      usedNearDuplicateKeys.add(
        candidate.nearDuplicateKey
      );
    }
  }

  return selected;
}

function diversifyCandidates(
  stableCandidates:
    StableCandidate[],
  options:
    ResolvedOptions
) {
  const selected =
    selectRoleAnchors(
      stableCandidates,
      options
    );

  const selectedIds =
    new Set(
      selected.map(
        (candidate) =>
          candidate.hotelId
      )
    );

  const nearDuplicateCounts =
    new Map<string, number>();

  for (
    const candidate
    of selected
  ) {
    if (
      candidate.nearDuplicateKey
    ) {
      nearDuplicateCounts.set(
        candidate.nearDuplicateKey,
        (
          nearDuplicateCounts.get(
            candidate.nearDuplicateKey
          ) ??
          0
        ) +
        1
      );
    }
  }

  const selectedMetadata =
    new Map<
      string,
      DiversitySelection
    >();

  for (
    const candidate
    of selected
  ) {
    selectedMetadata.set(
      candidate.hotelId,
      {
        candidate,
        penalty:
          0,
        dimensionCodes:
          [],
        nearDuplicateFallback:
          false,
      }
    );
  }

  const remaining =
    stableCandidates.filter(
      (candidate) =>
        !selectedIds.has(
          candidate.hotelId
        )
    );

  while (
    selected.length <
      Math.min(
        options.maximumVisibleResults,
        stableCandidates.length
      ) &&
    remaining.length > 0
  ) {
    const highestRemainingScore =
      Math.max(
        ...remaining.map(
          (candidate) =>
            candidate.score ??
            -1
        )
      );

    const qualityWindow =
      remaining.filter(
        (candidate) =>
          (
            candidate.score ??
            -1
          ) >=
          highestRemainingScore -
            options
              .maximumDiversityScoreSacrifice
      );

    let selections =
      qualityWindow
        .map(
          (candidate) =>
            calculateDiversitySelection(
              candidate,
              selected,
              nearDuplicateCounts,
              options,
              false
            )
        )
        .filter(
          (
            value
          ): value is DiversitySelection =>
            value !== null
        );

    let nearDuplicateFallback =
      false;

    if (
      selections.length === 0
    ) {
      nearDuplicateFallback =
        true;

      selections =
        qualityWindow
          .map(
            (candidate) =>
              calculateDiversitySelection(
                candidate,
                selected,
                nearDuplicateCounts,
                options,
                true
              )
          )
          .filter(
            (
              value
            ): value is DiversitySelection =>
              value !== null
          );
    }

    const next =
      selections
        .sort(
          (
            first,
            second
          ) =>
            first.penalty -
              second.penalty ||
            (
              second.candidate.score ??
              -1
            ) -
              (
                first.candidate.score ??
                -1
              ) ||
            first.candidate
              .stableRank -
              second.candidate
                .stableRank ||
            compareStrings(
              first.candidate
                .hotelId,
              second.candidate
                .hotelId
            )
        )[0] ??
      null;

    if (!next) {
      break;
    }

    if (
      nearDuplicateFallback
    ) {
      next.nearDuplicateFallback =
        true;
    }

    selected.push(
      next.candidate
    );

    selectedIds.add(
      next.candidate.hotelId
    );

    selectedMetadata.set(
      next.candidate.hotelId,
      next
    );

    if (
      next.candidate
        .nearDuplicateKey
    ) {
      nearDuplicateCounts.set(
        next.candidate
          .nearDuplicateKey,
        (
          nearDuplicateCounts.get(
            next.candidate
              .nearDuplicateKey
          ) ??
          0
        ) +
        1
      );
    }

    const index =
      remaining.findIndex(
        (candidate) =>
          candidate.hotelId ===
          next.candidate.hotelId
      );

    if (
      index >= 0
    ) {
      remaining.splice(
        index,
        1
      );
    }
  }

  const visible =
    selected.slice(
      0,
      options.maximumVisibleResults
    );

  const visibleIds =
    new Set(
      visible.map(
        (candidate) =>
          candidate.hotelId
      )
    );

  const additional =
    stableCandidates.filter(
      (candidate) =>
        !visibleIds.has(
          candidate.hotelId
        )
    );

  return {
    visible,
    additional,
    selectedMetadata,
  };
}

function createNearDuplicateGroups(
  stableCandidates:
    StableCandidate[],
  visibleHotelIds:
    Set<string>
) {
  const byKey =
    new Map<
      string,
      StableCandidate[]
    >();

  for (
    const candidate
    of stableCandidates
  ) {
    if (
      !candidate.nearDuplicateKey
    ) {
      continue;
    }

    const collection =
      byKey.get(
        candidate.nearDuplicateKey
      ) ??
      [];

    collection.push(
      candidate
    );

    byKey.set(
      candidate.nearDuplicateKey,
      collection
    );
  }

  return [
    ...byKey.entries(),
  ]
    .filter(
      ([, members]) =>
        members.length > 1
    )
    .sort(
      (
        first,
        second
      ) =>
        compareStrings(
          first[0],
          second[0]
        )
    )
    .map(
      ([
        identityKey,
        members,
      ]): SmartStayRankingNearDuplicateGroupV2 => {
        const ordered =
          members
            .slice()
            .sort(
              (
                first,
                second
              ) =>
                first.stableRank -
                  second.stableRank ||
                compareStrings(
                  first.hotelId,
                  second.hotelId
                )
            );

        const visibleMembers =
          ordered.filter(
            (member) =>
              visibleHotelIds.has(
                member.hotelId
              )
          );

        const primary =
          visibleMembers[0] ??
          ordered[0];

        return {
          id:
            `duplicate:${identityKey}`,
          identityKey,
          primaryHotelId:
            primary.hotelId,
          memberHotelIds:
            ordered.map(
              (member) =>
                member.hotelId
            ),
          suppressedHotelIds:
            ordered
              .filter(
                (member) =>
                  !visibleHotelIds.has(
                    member.hotelId
                  )
              )
              .map(
                (member) =>
                  member.hotelId
              ),
        };
      }
    );
}

function getRankBand(
  evaluation: {
    eligible: boolean;
    visibleRank: number | null;
    score: number | null;
  }
): SmartStayRankBand {
  if (
    !evaluation.eligible
  ) {
    return "excluded";
  }

  if (
    evaluation.visibleRank !==
      null &&
    evaluation.visibleRank <=
      3
  ) {
    return "top";
  }

  if (
    evaluation.visibleRank !==
      null
  ) {
    return "strong";
  }

  if (
    (
      evaluation.score ??
      0
    ) >=
    65
  ) {
    return "acceptable";
  }

  return "weak";
}

export function evaluateRankingStabilityDiversityV2(
  input:
    SmartStayRankingStabilityDiversityInputV2,
  options:
    SmartStayRankingStabilityDiversityOptionsV2 = {}
): SmartStayRankingStabilityDiversityEvaluationV2 {
  validateInput(
    input
  );

  const resolvedOptions =
    resolveOptions(
      options
    );

  const normalized =
    input.candidates
      .map(
        normalizeCandidate
      )
      .sort(
        compareBaseCandidates
      );

  const eligible =
    normalized.filter(
      (candidate) =>
        candidate.eligible
    );

  const excluded =
    normalized.filter(
      (candidate) =>
        !candidate.eligible
    );

  const previousOrder =
    new Map(
      (
        input.previousRankingHotelIds ??
        []
      ).map(
        (
          hotelId,
          index
        ) => [
          hotelId.trim(),
          index,
        ] as const
      )
    );

  const {
    bands,
    stableCandidates,
  } = createStabilityBands(
    eligible,
    previousOrder,
    resolvedOptions
  );

  const {
    visible,
    additional,
    selectedMetadata,
  } = diversifyCandidates(
    stableCandidates,
    resolvedOptions
  );

  const visibleHotelIds =
    visible.map(
      (candidate) =>
        candidate.hotelId
    );

  const visibleSet =
    new Set(
      visibleHotelIds
    );

  const additionalHotelIds =
    additional.map(
      (candidate) =>
        candidate.hotelId
    );

  const diversifiedEligible = [
    ...visible,
    ...additional,
  ];

  const diversifiedRankingHotelIds = [
    ...diversifiedEligible.map(
      (candidate) =>
        candidate.hotelId
    ),
    ...excluded.map(
      (candidate) =>
        candidate.hotelId
    ),
  ];

  const diversifiedRankById =
    new Map(
      diversifiedRankingHotelIds.map(
        (
          hotelId,
          index
        ) => [
          hotelId,
          index +
          1,
        ] as const
      )
    );

  const visibleRankById =
    new Map(
      visibleHotelIds.map(
        (
          hotelId,
          index
        ) => [
          hotelId,
          index +
          1,
        ] as const
      )
    );

  const stableById =
    new Map(
      stableCandidates.map(
        (candidate) => [
          candidate.hotelId,
          candidate,
        ] as const
      )
    );

  const nearDuplicateGroups =
    createNearDuplicateGroups(
      stableCandidates,
      visibleSet
    );

  const duplicateGroupByHotelId =
    new Map<
      string,
      SmartStayRankingNearDuplicateGroupV2
    >();

  for (
    const group
    of nearDuplicateGroups
  ) {
    for (
      const hotelId
      of group.memberHotelIds
    ) {
      duplicateGroupByHotelId.set(
        hotelId,
        group
      );
    }
  }

  const evaluations =
    normalized
      .map(
        (
          candidate
        ): SmartStayRankingCandidateEvaluationV2 => {
          const stable =
            stableById.get(
              candidate.hotelId
            ) ??
            null;

          const visibleRank =
            visibleRankById.get(
              candidate.hotelId
            ) ??
            null;

          const diversifiedRank =
            diversifiedRankById.get(
              candidate.hotelId
            ) ??
            null;

          const metadata =
            selectedMetadata.get(
              candidate.hotelId
            ) ??
            null;

          const duplicateGroup =
            duplicateGroupByHotelId.get(
              candidate.hotelId
            ) ??
            null;

          const suppressedByHotelId =
            duplicateGroup &&
            !visibleSet.has(
              candidate.hotelId
            )
              ? duplicateGroup
                  .primaryHotelId
              : null;

          const reasonCodes = [
            ...candidate
              .exclusionReasonCodes,
          ];

          if (
            candidate.eligible
          ) {
            reasonCodes.push(
              "ranking-candidate-eligible"
            );
          }
          else {
            reasonCodes.push(
              "ranking-candidate-excluded"
            );
          }

          if (
            stable &&
            (
              bands.find(
                (band) =>
                  band.id ===
                  stable.stabilityBandId
              )?.memberHotelIds
                .length ??
              0
            ) > 1
          ) {
            reasonCodes.push(
              "ranking-equivalence-band"
            );
          }

          if (
            metadata &&
            metadata.dimensionCodes
              .length > 0
          ) {
            reasonCodes.push(
              "ranking-diversity-contribution"
            );
          }

          if (
            metadata
              ?.nearDuplicateFallback
          ) {
            reasonCodes.push(
              "ranking-near-duplicate-fallback"
            );
          }

          if (
            candidate.roleAnchor &&
            visibleRank !==
              null
          ) {
            reasonCodes.push(
              "ranking-primary-role-protected"
            );
          }

          if (
            suppressedByHotelId
          ) {
            reasonCodes.push(
              "ranking-near-duplicate-suppressed"
            );
          }

          if (
            visibleRank !== null
          ) {
            reasonCodes.push(
              "ranking-visible"
            );
          }
          else if (
            candidate.eligible
          ) {
            reasonCodes.push(
              "ranking-additional-result"
            );
          }

          const rankBand =
            getRankBand({
              eligible:
                candidate.eligible,
              visibleRank,
              score:
                candidate.score,
            });

          return {
            hotelId:
              candidate.hotelId,
            eligible:
              candidate.eligible,
            baseScore:
              candidate.score ===
                null
                ? null
                : round(
                    candidate.score
                  ),
            baseRank:
              stable?.baseRank ??
              null,
            stableRank:
              stable?.stableRank ??
              null,
            diversifiedRank,
            visibleRank,
            visible:
              visibleRank !== null,
            rankBand,
            stabilityBandId:
              stable
                ?.stabilityBandId ??
              null,
            nearDuplicateGroupId:
              duplicateGroup?.id ??
              null,
            roleAnchor:
              candidate.roleAnchor,
            diversityPenalty:
              metadata?.penalty ??
              0,
            suppressedByHotelId,
            deterministicKey:
              [
                "ranking-v2",
                stable
                  ?.stabilityBandId ??
                  "excluded",
                candidate.hotelId,
              ].join("::"),
            diversityDimensionCodes:
              metadata
                ?.dimensionCodes ??
              [],
            reasonCodes:
              uniqueSorted(
                reasonCodes
              ),
            evidenceIds:
              candidate.evidenceIds,
          };
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            first.diversifiedRank ??
            Number.POSITIVE_INFINITY
          ) -
            (
              second.diversifiedRank ??
              Number.POSITIVE_INFINITY
            ) ||
          compareStrings(
            first.hotelId,
            second.hotelId
          )
      );

  const baseRankingHotelIds =
    normalized.map(
      (candidate) =>
        candidate.hotelId
    );

  const stableRankingHotelIds = [
    ...stableCandidates.map(
      (candidate) =>
        candidate.hotelId
    ),
    ...excluded.map(
      (candidate) =>
        candidate.hotelId
    ),
  ];

  const stabilityApplied =
    bands.some(
      (band) =>
        band.previousOrderApplied
    ) &&
    JSON.stringify(
      stableRankingHotelIds
    ) !==
    JSON.stringify(
      baseRankingHotelIds
    );

  const stableVisibleBaseline =
    stableCandidates
      .slice(
        0,
        resolvedOptions
          .maximumVisibleResults
      )
      .map(
        (candidate) =>
          candidate.hotelId
      );

  const diversityApplied =
    JSON.stringify(
      visibleHotelIds
    ) !==
      JSON.stringify(
        stableVisibleBaseline
      ) ||
    nearDuplicateGroups.some(
      (group) =>
        group.suppressedHotelIds
          .length > 0
    );

  const reasonCodes:
    string[] = [];

  if (
    eligible.length === 0
  ) {
    reasonCodes.push(
      "ranking-no-eligible-candidates"
    );
  }
  else {
    reasonCodes.push(
      "ranking-deterministic-order"
    );
  }

  if (
    bands.some(
      (band) =>
        band.memberHotelIds
          .length > 1
    )
  ) {
    reasonCodes.push(
      "ranking-equivalence-bands-created"
    );
  }

  if (
    stabilityApplied
  ) {
    reasonCodes.push(
      "ranking-previous-order-preserved-within-equivalence"
    );
  }

  if (
    diversityApplied
  ) {
    reasonCodes.push(
      "ranking-diversity-applied"
    );
  }

  if (
    nearDuplicateGroups.length >
    0
  ) {
    reasonCodes.push(
      "ranking-near-duplicates-grouped"
    );
  }

  if (
    visible.some(
      (candidate) =>
        candidate.roleAnchor
    )
  ) {
    reasonCodes.push(
      "ranking-primary-recommendation-roles-protected"
    );
  }

  const strongData =
    visible.length > 0 &&
    visible.every(
      (candidate) =>
        candidate.confidence >=
          resolvedOptions
            .minimumStrongConfidence &&
        candidate.coverage >=
          resolvedOptions
            .minimumStrongCoverage
    );

  return {
    status:
      eligible.length === 0
        ? "unavailable"
        : strongData
          ? "strong-data"
          : "usable",
    baseRankingHotelIds,
    stableRankingHotelIds,
    diversifiedRankingHotelIds,
    visibleHotelIds,
    additionalHotelIds,
    excludedHotelIds:
      excluded.map(
        (candidate) =>
          candidate.hotelId
      ),
    stabilityBands:
      bands,
    nearDuplicateGroups,
    evaluations,
    stabilityApplied,
    diversityApplied,
    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),
  };
}