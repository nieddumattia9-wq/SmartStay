import type {
  SmartStayComparisonFactV2,
  SmartStayEvidenceFactV2,
  SmartStayExplanationV2,
  SmartStayRiskAssessmentV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayRecommendationEvaluationV2,
} from "../recommendation/recommendationRolesEngine";

import type {
  SmartStayUserUtilityEvaluationV2,
  SmartStayUtilityContributionV2,
  SmartStayUtilityDimensionCodeV2,
} from "../utility/userUtilityEngine";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayQualityEvaluationV2,
} from "../quality/qualityEngine";

import type {
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

import type {
  SmartStayComfortFlexibilityEvaluationV2,
} from "../comfort/comfortFlexibilityEngine";

export type SmartStayEvidenceBasedExplanationStatusV2 =
  | "unavailable"
  | "usable"
  | "strong-data";

export interface SmartStayEvidenceBasedExplanationCandidateV2 {
  hotelId: string;
  evidence: SmartStayEvidenceFactV2[];
  utility: SmartStayUserUtilityEvaluationV2;
  recommendation: SmartStayRecommendationEvaluationV2;
  risk: SmartStayRiskAssessmentV2;
  priceValue?: SmartStayPriceValueEvaluationV2;
  quality?: SmartStayQualityEvaluationV2;
  location?: SmartStayLocationEvaluationV2;
  comfortFlexibility?: SmartStayComfortFlexibilityEvaluationV2;
}

export interface SmartStayEvidenceBasedExplanationsInputV2 {
  candidates: SmartStayEvidenceBasedExplanationCandidateV2[];
}

export interface SmartStayEvidenceBasedExplanationsOptionsV2 {
  minimumEvidenceConfidence?: number;
  minimumDimensionConfidence?: number;
  minimumStrengthScore?: number;
  maximumWeaknessScore?: number;
  minimumMeaningfulScoreDifference?: number;
  minimumMeaningfulAmountDifference?: number;
  minimumMeaningfulDistanceDifferenceKm?: number;
  maximumStrengthFacts?: number;
  maximumWeaknessFacts?: number;
  maximumComparisonFacts?: number;
}

export interface SmartStayEvidenceBasedExplanationEvaluationV2
  extends SmartStayExplanationV2 {
  hotelId: string;
  status: SmartStayEvidenceBasedExplanationStatusV2;
  explanationConfidence: number;
  factCount: number;
  reasonCodes: string[];
}

export interface SmartStayEvidenceBasedExplanationsEvaluationV2 {
  evaluations: SmartStayEvidenceBasedExplanationEvaluationV2[];
}

type FactSection =
  | "strength"
  | "weakness"
  | "comparison";

type FactCandidate = {
  section: FactSection;
  fact: SmartStayComparisonFactV2;
  priority: number;
  confidence: number;
};

type ResolvedOptions = Required<
  SmartStayEvidenceBasedExplanationsOptionsV2
>;

type EvidenceCatalog = Map<
  string,
  SmartStayEvidenceFactV2
>;

const DEFAULTS: ResolvedOptions = {
  minimumEvidenceConfidence: 0.55,
  minimumDimensionConfidence: 0.6,
  minimumStrengthScore: 72,
  maximumWeaknessScore: 45,
  minimumMeaningfulScoreDifference: 3,
  minimumMeaningfulAmountDifference: 1,
  minimumMeaningfulDistanceDifferenceKm: 0.2,
  maximumStrengthFacts: 3,
  maximumWeaknessFacts: 2,
  maximumComparisonFacts: 4,
};

const BENEFIT_DIMENSIONS:
  readonly SmartStayUtilityDimensionCodeV2[] = [
    "quality",
    "location",
    "comfort",
    "flexibility",
  ];

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
  decimalPlaces = 2
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

function uniqueSorted(
  values: string[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort(
    compareStrings
  );
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
    SmartStayEvidenceBasedExplanationsOptionsV2
): ResolvedOptions {
  return {
    minimumEvidenceConfidence:
      normalizeRatio(
        options.minimumEvidenceConfidence,
        DEFAULTS.minimumEvidenceConfidence
      ),

    minimumDimensionConfidence:
      normalizeRatio(
        options.minimumDimensionConfidence,
        DEFAULTS.minimumDimensionConfidence
      ),

    minimumStrengthScore:
      clamp(
        normalizeNonNegativeNumber(
          options.minimumStrengthScore,
          DEFAULTS.minimumStrengthScore
        ),
        0,
        100
      ),

    maximumWeaknessScore:
      clamp(
        normalizeNonNegativeNumber(
          options.maximumWeaknessScore,
          DEFAULTS.maximumWeaknessScore
        ),
        0,
        100
      ),

    minimumMeaningfulScoreDifference:
      normalizeNonNegativeNumber(
        options.minimumMeaningfulScoreDifference,
        DEFAULTS.minimumMeaningfulScoreDifference
      ),

    minimumMeaningfulAmountDifference:
      normalizeNonNegativeNumber(
        options.minimumMeaningfulAmountDifference,
        DEFAULTS.minimumMeaningfulAmountDifference
      ),

    minimumMeaningfulDistanceDifferenceKm:
      normalizeNonNegativeNumber(
        options.minimumMeaningfulDistanceDifferenceKm,
        DEFAULTS.minimumMeaningfulDistanceDifferenceKm
      ),

    maximumStrengthFacts:
      normalizePositiveInteger(
        options.maximumStrengthFacts,
        DEFAULTS.maximumStrengthFacts,
        8
      ),

    maximumWeaknessFacts:
      normalizePositiveInteger(
        options.maximumWeaknessFacts,
        DEFAULTS.maximumWeaknessFacts,
        8
      ),

    maximumComparisonFacts:
      normalizePositiveInteger(
        options.maximumComparisonFacts,
        DEFAULTS.maximumComparisonFacts,
        10
      ),
  };
}

function evidenceSignature(
  fact:
    SmartStayEvidenceFactV2
) {
  return JSON.stringify({
    code:
      fact.code,

    availability:
      fact.availability,

    value:
      fact.value,

    unit:
      fact.unit,

    source:
      fact.source,

    sourceProvider:
      fact.sourceProvider,

    sourceField:
      fact.sourceField,

    confidence:
      fact.confidence,

    severity:
      fact.severity,

    missingReasonCode:
      fact.missingReasonCode,
  });
}

function buildEvidenceCatalog(
  candidates:
    SmartStayEvidenceBasedExplanationCandidateV2[]
) {
  const catalog:
    EvidenceCatalog =
      new Map();

  const signatures =
    new Map<
      string,
      string
    >();

  for (
    const candidate
    of candidates
  ) {
    for (
      const fact
      of candidate.evidence
    ) {
      if (
        typeof fact.id !== "string" ||
        !fact.id.trim()
      ) {
        throw new Error(
          "Evidence-based explanations received an evidence fact without a valid id."
        );
      }

      const id =
        fact.id.trim();

      const signature =
        evidenceSignature(
          fact
        );

      const existingSignature =
        signatures.get(
          id
        );

      if (
        existingSignature &&
        existingSignature !==
          signature
      ) {
        throw new Error(
          `Evidence id conflict detected: ${id}`
        );
      }

      if (!existingSignature) {
        signatures.set(
          id,
          signature
        );

        catalog.set(
          id,
          {
            ...fact,
            id,
          }
        );
      }
    }
  }

  return catalog;
}

function resolveEvidenceIds(
  ids:
    string[],
  catalog:
    EvidenceCatalog,
  minimumConfidence:
    number,
  allowUnavailable =
    false
) {
  return uniqueSorted(
    ids.filter(
      (id) => {
        const fact =
          catalog.get(
            id
          );

        if (!fact) {
          return false;
        }

        if (
          typeof fact.confidence !==
            "number" ||
          !Number.isFinite(
            fact.confidence
          ) ||
          fact.confidence <
            minimumConfidence
        ) {
          return false;
        }

        if (
          fact.availability ===
          "not-applicable"
        ) {
          return false;
        }

        return allowUnavailable ||
          fact.availability ===
            "known";
      }
    )
  );
}

function resolveAnyEvidenceIds(
  ids:
    string[],
  catalog:
    EvidenceCatalog
) {
  return uniqueSorted(
    ids.filter(
      (id) => {
        const fact =
          catalog.get(
            id
          );

        return Boolean(
          fact &&
          fact.availability !==
            "not-applicable"
        );
      }
    )
  );
}

function createFactCandidate(
  input: {
    section:
      FactSection;

    code:
      string;

    messageKey:
      string;

    value:
      string | number | boolean | null;

    unit:
      string | null;

    targetHotelId:
      string | null;

    direction:
      SmartStayComparisonFactV2["direction"];

    evidenceIds:
      string[];

    priority:
      number;

    confidence:
      number;
  },
  catalog:
    EvidenceCatalog,
  minimumEvidenceConfidence:
    number,
  allowUnavailableEvidence =
    false
): FactCandidate | null {
  const evidenceIds =
    allowUnavailableEvidence
      ? resolveEvidenceIds(
          input.evidenceIds,
          catalog,
          minimumEvidenceConfidence,
          true
        )
      : resolveEvidenceIds(
          input.evidenceIds,
          catalog,
          minimumEvidenceConfidence
        );

  if (
    evidenceIds.length ===
    0
  ) {
    return null;
  }

  return {
    section:
      input.section,

    fact: {
      code:
        input.code,

      messageKey:
        input.messageKey,

      value:
        input.value,

      unit:
        input.unit,

      targetHotelId:
        input.targetHotelId,

      direction:
        input.direction,

      evidenceIds,
    },

    priority:
      input.priority,

    confidence:
      clamp(
        input.confidence,
        0,
        1
      ),
  };
}

function validateCandidateIds(
  candidates:
    SmartStayEvidenceBasedExplanationCandidateV2[]
) {
  const hotelIds =
    new Set<string>();

  for (
    const candidate
    of candidates
  ) {
    if (
      typeof candidate.hotelId !==
        "string" ||
      !candidate.hotelId.trim()
    ) {
      throw new Error(
        "Evidence-based explanation candidate requires a hotelId."
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
        `Evidence-based explanations received duplicate hotelId: ${hotelId}`
      );
    }

    hotelIds.add(
      hotelId
    );

    const componentHotelIds = [
      candidate.utility.hotelId,
      candidate.recommendation.hotelId,
      candidate.priceValue?.hotelId,
      candidate.quality?.hotelId,
      candidate.location?.hotelId,
      candidate.comfortFlexibility?.hotelId,
    ].filter(
      (
        value
      ): value is string =>
        typeof value ===
        "string"
    );

    if (
      componentHotelIds.some(
        (value) =>
          value !==
          hotelId
      )
    ) {
      throw new Error(
        `Evidence-based explanation candidate hotelId mismatch: ${hotelId}`
      );
    }
  }
}

function getContribution(
  utility:
    SmartStayUserUtilityEvaluationV2,
  dimension:
    SmartStayUtilityDimensionCodeV2
) {
  return utility
    .contributions
    .find(
      (contribution) =>
        contribution.dimension ===
        dimension
    ) ??
    null;
}

function getKnownDimension(
  utility:
    SmartStayUserUtilityEvaluationV2,
  dimension:
    SmartStayUtilityDimensionCodeV2,
  minimumConfidence:
    number
): SmartStayUtilityContributionV2 | null {
  const contribution =
    getContribution(
      utility,
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
      minimumConfidence
  ) {
    return null;
  }

  return contribution;
}

function addIfPresent(
  collection:
    FactCandidate[],
  candidate:
    FactCandidate | null
) {
  if (candidate) {
    collection.push(
      candidate
    );
  }
}

function collectStrengthFacts(
  candidate:
    SmartStayEvidenceBasedExplanationCandidateV2,
  catalog:
    EvidenceCatalog,
  options:
    ResolvedOptions
) {
  const facts:
    FactCandidate[] = [];

  const priceValue =
    candidate.priceValue;

  const currency =
    priceValue
      ?.currency ??
    candidate.recommendation
      .metrics.currency;

  if (
    priceValue &&
    priceValue.budget.provided ===
      true &&
    priceValue.budget.withinBudget ===
      true &&
    typeof priceValue
      .budget.differenceAmount ===
      "number" &&
    Number.isFinite(
      priceValue
        .budget
        .differenceAmount
    ) &&
    priceValue
      .budget
      .differenceAmount >=
      0 &&
    typeof currency ===
      "string"
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            "explanation-strength-within-budget",

          messageKey:
            "smartstay.explanation.strength.within_budget",

          value:
            round(
              priceValue
                .budget
                .differenceAmount
            ),

          unit:
            currency,

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds:
            priceValue.evidenceIds,

          priority:
            100,

          confidence:
            priceValue.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  if (
    priceValue &&
    typeof priceValue
      .relativePrice
      .savingPercentageAgainstMedian ===
      "number" &&
    Number.isFinite(
      priceValue
        .relativePrice
        .savingPercentageAgainstMedian
    ) &&
    priceValue
      .relativePrice
      .savingPercentageAgainstMedian >=
      5
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            "explanation-strength-below-peer-median",

          messageKey:
            "smartstay.explanation.strength.below_peer_median",

          value:
            round(
              priceValue
                .relativePrice
                .savingPercentageAgainstMedian,
              2
            ),

          unit:
            "%",

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds: [
            ...priceValue.evidenceIds,
            ...priceValue
              .peerBaseline
              .evidenceIds,
          ],

          priority:
            96,

          confidence:
            Math.min(
              priceValue.confidence,
              priceValue
                .peerBaseline
                .confidence
            ),
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  const quality =
    candidate.quality;

  if (
    quality &&
    quality.eligibleForPrimaryRanking ===
      true &&
    typeof quality.score ===
      "number" &&
    Number.isFinite(
      quality.score
    ) &&
    quality.score >=
      options.minimumStrengthScore &&
    quality.confidence >=
      options.minimumDimensionConfidence
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            "explanation-strength-quality",

          messageKey:
            "smartstay.explanation.strength.quality",

          value:
            round(
              quality.score
            ),

          unit:
            "points",

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds:
            quality.evidenceIds,

          priority:
            92,

          confidence:
            quality.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  const location =
    candidate.location;

  if (
    location &&
    location.eligibleForPrimaryRanking ===
      true &&
    typeof location.score ===
      "number" &&
    Number.isFinite(
      location.score
    ) &&
    location.score >=
      options.minimumStrengthScore &&
    location.confidence >=
      options.minimumDimensionConfidence &&
    typeof location
      .distance
      .selectedDistanceKm ===
      "number" &&
    Number.isFinite(
      location
        .distance
        .selectedDistanceKm
    )
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            "explanation-strength-location",

          messageKey:
            "smartstay.explanation.strength.location",

          value:
            round(
              location
                .distance
                .selectedDistanceKm,
              2
            ),

          unit:
            "km",

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds:
            location.evidenceIds,

          priority:
            88,

          confidence:
            location.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  for (
    const dimension
    of [
      "comfort",
      "flexibility",
    ] as const
  ) {
    const contribution =
      getKnownDimension(
        candidate.utility,
        dimension,
        options.minimumDimensionConfidence
      );

    if (
      !contribution ||
      (
        contribution.score ??
        0
      ) <
        options.minimumStrengthScore
    ) {
      continue;
    }

    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            `explanation-strength-${dimension}`,

          messageKey:
            `smartstay.explanation.strength.${dimension}`,

          value:
            round(
              contribution.score as number
            ),

          unit:
            "points",

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds:
            contribution.evidenceIds,

          priority:
            dimension ===
              "comfort"
              ? 84
              : 80,

          confidence:
            contribution.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  if (
    candidate.risk.level ===
      "low" &&
    typeof candidate.risk.score ===
      "number" &&
    Number.isFinite(
      candidate.risk.score
    ) &&
    candidate.risk.score <=
      20
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            "explanation-strength-low-risk",

          messageKey:
            "smartstay.explanation.strength.low_risk",

          value:
            round(
              candidate.risk.score
            ),

          unit:
            "risk-points",

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds:
            candidate.risk.evidenceIds,

          priority:
            70,

          confidence:
            Math.min(
              candidate.utility
                .scoreConfidence,
              candidate.utility
                .evidenceCoverage
            ),
        },
        catalog,
        options.minimumEvidenceConfidence,
        true
      )
    );
  }

  if (
    candidate.utility
      .scoreConfidence >=
      0.8 &&
    candidate.utility
      .evidenceCoverage >=
      0.8
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "strength",

          code:
            "explanation-strength-solid-data",

          messageKey:
            "smartstay.explanation.strength.solid_data",

          value:
            round(
              Math.min(
                candidate.utility
                  .scoreConfidence,
                candidate.utility
                  .evidenceCoverage
              ) *
              100,
              1
            ),

          unit:
            "%",

          targetHotelId:
            null,

          direction:
            "better",

          evidenceIds:
            candidate.utility
              .evidenceIds,

          priority:
            64,

          confidence:
            Math.min(
              candidate.utility
                .scoreConfidence,
              candidate.utility
                .evidenceCoverage
            ),
        },
        catalog,
        options.minimumEvidenceConfidence,
        true
      )
    );
  }

  return facts;
}

function collectWeaknessFacts(
  candidate:
    SmartStayEvidenceBasedExplanationCandidateV2,
  catalog:
    EvidenceCatalog,
  options:
    ResolvedOptions
) {
  const facts:
    FactCandidate[] = [];

  const priceValue =
    candidate.priceValue;

  const currency =
    priceValue
      ?.currency ??
    candidate.recommendation
      .metrics.currency;

  if (
    priceValue &&
    priceValue.budget.provided ===
      true &&
    priceValue.budget.withinBudget ===
      false &&
    typeof priceValue
      .budget.overageAmount ===
      "number" &&
    Number.isFinite(
      priceValue
        .budget
        .overageAmount
    ) &&
    priceValue
      .budget
      .overageAmount >
      0 &&
    typeof currency ===
      "string"
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            "explanation-weakness-above-budget",

          messageKey:
            "smartstay.explanation.weakness.above_budget",

          value:
            round(
              priceValue
                .budget
                .overageAmount
            ),

          unit:
            currency,

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            priceValue.evidenceIds,

          priority:
            100,

          confidence:
            priceValue.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  if (
    priceValue &&
    typeof priceValue
      .relativePrice
      .savingPercentageAgainstMedian ===
      "number" &&
    Number.isFinite(
      priceValue
        .relativePrice
        .savingPercentageAgainstMedian
    ) &&
    priceValue
      .relativePrice
      .savingPercentageAgainstMedian <=
      -5
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            "explanation-weakness-above-peer-median",

          messageKey:
            "smartstay.explanation.weakness.above_peer_median",

          value:
            round(
              Math.abs(
                priceValue
                  .relativePrice
                  .savingPercentageAgainstMedian
              ),
              2
            ),

          unit:
            "%",

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds: [
            ...priceValue.evidenceIds,
            ...priceValue
              .peerBaseline
              .evidenceIds,
          ],

          priority:
            90,

          confidence:
            Math.min(
              priceValue.confidence,
              priceValue
                .peerBaseline
                .confidence
            ),
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  const quality =
    candidate.quality;

  if (
    quality &&
    typeof quality.score ===
      "number" &&
    Number.isFinite(
      quality.score
    ) &&
    quality.score <=
      options.maximumWeaknessScore &&
    quality.confidence >=
      options.minimumDimensionConfidence
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            "explanation-weakness-quality",

          messageKey:
            "smartstay.explanation.weakness.quality",

          value:
            round(
              quality.score
            ),

          unit:
            "points",

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            quality.evidenceIds,

          priority:
            88,

          confidence:
            quality.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  const location =
    candidate.location;

  if (
    location &&
    typeof location.score ===
      "number" &&
    Number.isFinite(
      location.score
    ) &&
    location.score <=
      options.maximumWeaknessScore &&
    location.confidence >=
      options.minimumDimensionConfidence &&
    typeof location
      .distance
      .selectedDistanceKm ===
      "number" &&
    Number.isFinite(
      location
        .distance
        .selectedDistanceKm
    )
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            "explanation-weakness-location",

          messageKey:
            "smartstay.explanation.weakness.location",

          value:
            round(
              location
                .distance
                .selectedDistanceKm,
              2
            ),

          unit:
            "km",

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            location.evidenceIds,

          priority:
            84,

          confidence:
            location.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  for (
    const dimension
    of [
      "comfort",
      "flexibility",
    ] as const
  ) {
    const contribution =
      getKnownDimension(
        candidate.utility,
        dimension,
        options.minimumDimensionConfidence
      );

    if (
      !contribution ||
      (
        contribution.score ??
        100
      ) >
        options.maximumWeaknessScore
    ) {
      continue;
    }

    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            `explanation-weakness-${dimension}`,

          messageKey:
            `smartstay.explanation.weakness.${dimension}`,

          value:
            round(
              contribution.score as number
            ),

          unit:
            "points",

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            contribution.evidenceIds,

          priority:
            dimension ===
              "comfort"
              ? 80
              : 76,

          confidence:
            contribution.confidence,
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  if (
    candidate.risk.level ===
      "medium" ||
    candidate.risk.level ===
      "high"
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            `explanation-weakness-${candidate.risk.level}-risk`,

          messageKey:
            `smartstay.explanation.weakness.${candidate.risk.level}_risk`,

          value:
            round(
              candidate.risk.score
            ),

          unit:
            "risk-points",

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            candidate.risk.evidenceIds,

          priority:
            candidate.risk.level ===
              "high"
              ? 96
              : 82,

          confidence:
            Math.min(
              candidate.utility
                .scoreConfidence,
              candidate.utility
                .evidenceCoverage
            ),
        },
        catalog,
        options.minimumEvidenceConfidence,
        true
      )
    );
  }

  const refundableFacts =
    candidate.evidence.filter(
      (fact) =>
        fact.code ===
          "offer.refundable" &&
        fact.availability ===
          "known" &&
        fact.value ===
          false &&
        fact.confidence >=
          options.minimumEvidenceConfidence
    );

  if (
    refundableFacts.length >
    0
  ) {
    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            "explanation-weakness-non-refundable",

          messageKey:
            "smartstay.explanation.weakness.non_refundable",

          value:
            false,

          unit:
            null,

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            refundableFacts.map(
              (fact) =>
                fact.id
            ),

          priority:
            78,

          confidence:
            Math.max(
              ...refundableFacts.map(
                (fact) =>
                  fact.confidence
              )
            ),
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  const dataConfidence =
    Math.min(
      candidate.utility
        .scoreConfidence,
      candidate.utility
        .evidenceCoverage
    );

  if (
    dataConfidence <
    0.55
  ) {
    const limitedEvidenceIds =
      uniqueSorted(
        candidate.evidence
          .filter(
            (fact) =>
              fact.availability ===
                "unknown" ||
              fact.availability ===
                "conflicting"
          )
          .map(
            (fact) =>
              fact.id
          )
      );

    const fallbackEvidenceIds =
      limitedEvidenceIds.length >
      0
        ? limitedEvidenceIds
        : resolveAnyEvidenceIds(
            candidate.utility
              .evidenceIds,
            catalog
          );

    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "weakness",

          code:
            "explanation-weakness-limited-data",

          messageKey:
            "smartstay.explanation.weakness.limited_data",

          value:
            round(
              dataConfidence *
              100,
              1
            ),

          unit:
            "%",

          targetHotelId:
            null,

          direction:
            "worse",

          evidenceIds:
            fallbackEvidenceIds,

          priority:
            86,

          confidence:
            Math.max(
              dataConfidence,
              options.minimumEvidenceConfidence
            ),
        },
        catalog,
        options.minimumEvidenceConfidence,
        true
      )
    );
  }

  return facts;
}

function collectComparisonFacts(
  candidate:
    SmartStayEvidenceBasedExplanationCandidateV2,
  candidatesById:
    Map<
      string,
      SmartStayEvidenceBasedExplanationCandidateV2
    >,
  catalog:
    EvidenceCatalog,
  options:
    ResolvedOptions,
  reasonCodes:
    string[]
) {
  const facts:
    FactCandidate[] = [];

  const targetHotelId =
    candidate.recommendation
      .comparisonTargetHotelId;

  if (!targetHotelId) {
    return facts;
  }

  const target =
    candidatesById.get(
      targetHotelId
    );

  if (!target) {
    reasonCodes.push(
      "explanation-comparison-target-unavailable"
    );

    return facts;
  }

  const metrics =
    candidate.recommendation
      .metrics;

  const currency =
    metrics.currency ??
    candidate.priceValue
      ?.currency ??
    null;

  const targetPriceEvidence =
    target.priceValue
      ?.evidenceIds ??
    [];

  const candidatePriceEvidence =
    candidate.priceValue
      ?.evidenceIds ??
    [];

  const offerPriceComparisonCompatible =
    metrics
      .offerComparisonToBestChoice
      ?.comparable !==
    false;

  if (
    !offerPriceComparisonCompatible
  ) {
    reasonCodes.push(
      "explanation-price-comparison-suppressed-offer-incompatible"
    );
  }

  if (
    offerPriceComparisonCompatible &&
    typeof metrics
      .priceDifferenceAmount ===
      "number" &&
    Number.isFinite(
      metrics
        .priceDifferenceAmount
    ) &&
    Math.abs(
      metrics
        .priceDifferenceAmount
    ) >=
      options
        .minimumMeaningfulAmountDifference &&
    currency
  ) {
    const savesMoney =
      metrics
        .priceDifferenceAmount <
      0;

    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "comparison",

          code:
            savesMoney
              ? "explanation-comparison-saves-money"
              : "explanation-comparison-costs-more",

          messageKey:
            savesMoney
              ? "smartstay.explanation.comparison.saves_money"
              : "smartstay.explanation.comparison.costs_more",

          value:
            round(
              Math.abs(
                metrics
                  .priceDifferenceAmount
              )
            ),

          unit:
            currency,

          targetHotelId,

          direction:
            savesMoney
              ? "better"
              : "worse",

          evidenceIds: [
            ...candidatePriceEvidence,
            ...targetPriceEvidence,
          ],

          priority:
            100,

          confidence:
            Math.min(
              candidate.priceValue
                ?.confidence ??
              0,
              target.priceValue
                ?.confidence ??
              0
            ),
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  if (
    typeof metrics
      .utilityDifference ===
      "number" &&
    Number.isFinite(
      metrics
        .utilityDifference
    ) &&
    Math.abs(
      metrics
        .utilityDifference
    ) >=
      options
        .minimumMeaningfulScoreDifference
  ) {
    const better =
      metrics
        .utilityDifference >
      0;

    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "comparison",

          code:
            better
              ? "explanation-comparison-utility-gain"
              : "explanation-comparison-utility-loss",

          messageKey:
            better
              ? "smartstay.explanation.comparison.utility_gain"
              : "smartstay.explanation.comparison.utility_loss",

          value:
            round(
              Math.abs(
                metrics
                  .utilityDifference
              )
            ),

          unit:
            "points",

          targetHotelId,

          direction:
            better
              ? "better"
              : "worse",

          evidenceIds: [
            ...candidate.utility
              .evidenceIds,
            ...target.utility
              .evidenceIds,
          ],

          priority:
            88,

          confidence:
            Math.min(
              candidate.utility
                .scoreConfidence,
              target.utility
                .scoreConfidence,
              candidate.utility
                .evidenceCoverage,
              target.utility
                .evidenceCoverage
            ),
        },
        catalog,
        options.minimumEvidenceConfidence,
        true
      )
    );
  }

  if (
    typeof metrics
      .distanceDifferenceKm ===
      "number" &&
    Number.isFinite(
      metrics
        .distanceDifferenceKm
    ) &&
    Math.abs(
      metrics
        .distanceDifferenceKm
    ) >=
      options
        .minimumMeaningfulDistanceDifferenceKm
  ) {
    const closer =
      metrics
        .distanceDifferenceKm <
      0;

    addIfPresent(
      facts,
      createFactCandidate(
        {
          section:
            "comparison",

          code:
            closer
              ? "explanation-comparison-closer"
              : "explanation-comparison-farther",

          messageKey:
            closer
              ? "smartstay.explanation.comparison.closer"
              : "smartstay.explanation.comparison.farther",

          value:
            round(
              Math.abs(
                metrics
                  .distanceDifferenceKm
              ),
              2
            ),

          unit:
            "km",

          targetHotelId,

          direction:
            closer
              ? "better"
              : "worse",

          evidenceIds: [
            ...(
              candidate.location
                ?.evidenceIds ??
              []
            ),
            ...(
              target.location
                ?.evidenceIds ??
              []
            ),
          ],

          priority:
            82,

          confidence:
            Math.min(
              candidate.location
                ?.confidence ??
              0,
              target.location
                ?.confidence ??
              0
            ),
        },
        catalog,
        options.minimumEvidenceConfidence
      )
    );
  }

  if (
    candidate.recommendation
      .role ===
      "worthwhile-comfort-upgrade"
  ) {
    const dimension =
      metrics
        .upgradeStrongestGainDimension;

    const strongestGain =
      metrics
        .upgradeStrongestGain;

    if (
      dimension &&
      (
        BENEFIT_DIMENSIONS as
          readonly string[]
      ).includes(
        dimension
      ) &&
      typeof strongestGain ===
        "number" &&
      Number.isFinite(
        strongestGain
      ) &&
      strongestGain >=
        options
          .minimumMeaningfulScoreDifference
    ) {
      const candidateContribution =
        getKnownDimension(
          candidate.utility,
          dimension,
          options.minimumDimensionConfidence
        );

      const targetContribution =
        getKnownDimension(
          target.utility,
          dimension,
          options.minimumDimensionConfidence
        );

      addIfPresent(
        facts,
        createFactCandidate(
          {
            section:
              "comparison",

            code:
              `explanation-comparison-upgrade-${dimension}`,

            messageKey:
              `smartstay.explanation.comparison.upgrade_${dimension}`,

            value:
              round(
                strongestGain
              ),

            unit:
              "points",

            targetHotelId,

            direction:
              "better",

            evidenceIds: [
              ...(
                candidateContribution
                  ?.evidenceIds ??
                []
              ),
              ...(
                targetContribution
                  ?.evidenceIds ??
                []
              ),
            ],

            priority:
              96,

            confidence:
              Math.min(
                candidateContribution
                  ?.confidence ??
                0,
                targetContribution
                  ?.confidence ??
                0
              ),
          },
          catalog,
          options.minimumEvidenceConfidence
        )
      );
    }

    if (
      metrics
        .upgradeDiminishingReturnsStart ===
      true
    ) {
      addIfPresent(
        facts,
        createFactCandidate(
          {
            section:
              "comparison",

            code:
              "explanation-comparison-diminishing-returns",

            messageKey:
              "smartstay.explanation.comparison.diminishing_returns",

            value:
              true,

            unit:
              null,

            targetHotelId,

            direction:
              "neutral",

            evidenceIds:
              candidate.recommendation
                .evidenceIds,

            priority:
              70,

            confidence:
              Math.min(
                candidate.utility
                  .scoreConfidence,
                candidate.utility
                  .evidenceCoverage
              ),
          },
          catalog,
          options.minimumEvidenceConfidence,
          true
        )
      );
    }
  }

  return facts;
}

function deduplicateAndSelect(
  facts:
    FactCandidate[],
  maximum:
    number
) {
  const deduplicated =
    new Map<
      string,
      FactCandidate
    >();

  for (
    const candidate
    of facts
  ) {
    const key = [
      candidate.section,
      candidate.fact.code,
      candidate.fact
        .targetHotelId ??
      "",
    ].join("::");

    const existing =
      deduplicated.get(
        key
      );

    if (
      !existing ||
      candidate.priority >
        existing.priority ||
      (
        candidate.priority ===
          existing.priority &&
        candidate.confidence >
          existing.confidence
      )
    ) {
      deduplicated.set(
        key,
        candidate
      );
    }
  }

  return [
    ...deduplicated.values(),
  ]
    .sort(
      (
        first,
        second
      ) =>
        second.priority -
          first.priority ||
        second.confidence -
          first.confidence ||
        compareStrings(
          first.fact.code,
          second.fact.code
        ) ||
        compareStrings(
          first.fact
            .targetHotelId ??
          "",
          second.fact
            .targetHotelId ??
          ""
        )
    )
    .slice(
      0,
      maximum
    );
}

function calculateExplanationConfidence(
  facts:
    FactCandidate[]
) {
  if (
    facts.length ===
    0
  ) {
    return 0;
  }

  return clamp(
    facts.reduce(
      (
        total,
        fact
      ) =>
        total +
        fact.confidence,
      0
    ) /
    facts.length,
    0,
    1
  );
}

function evaluateCandidate(
  candidate:
    SmartStayEvidenceBasedExplanationCandidateV2,
  candidatesById:
    Map<
      string,
      SmartStayEvidenceBasedExplanationCandidateV2
    >,
  catalog:
    EvidenceCatalog,
  options:
    ResolvedOptions
): SmartStayEvidenceBasedExplanationEvaluationV2 {
  const reasonCodes:
    string[] = [];

  const strengthCandidates =
    collectStrengthFacts(
      candidate,
      catalog,
      options
    );

  const weaknessCandidates =
    collectWeaknessFacts(
      candidate,
      catalog,
      options
    );

  const comparisonCandidates =
    collectComparisonFacts(
      candidate,
      candidatesById,
      catalog,
      options,
      reasonCodes
    );

  const selectedStrengths =
    deduplicateAndSelect(
      strengthCandidates,
      options.maximumStrengthFacts
    );

  const selectedWeaknesses =
    deduplicateAndSelect(
      weaknessCandidates,
      options.maximumWeaknessFacts
    );

  const selectedComparisons =
    deduplicateAndSelect(
      comparisonCandidates,
      options.maximumComparisonFacts
    );

  const selectedFacts = [
    ...selectedStrengths,
    ...selectedWeaknesses,
    ...selectedComparisons,
  ];

  const evidenceIds =
    uniqueSorted(
      selectedFacts.flatMap(
        (entry) =>
          entry.fact
            .evidenceIds
      )
    );

  const explanationConfidence =
    calculateExplanationConfidence(
      selectedFacts
    );

  let status:
    SmartStayEvidenceBasedExplanationStatusV2;

  if (
    selectedFacts.length ===
    0
  ) {
    status =
      "unavailable";

    reasonCodes.push(
      "explanation-no-supported-facts"
    );
  }
  else if (
    explanationConfidence >=
      0.8 &&
    candidate.utility
      .scoreConfidence >=
      0.8 &&
    candidate.utility
      .evidenceCoverage >=
      0.8
  ) {
    status =
      "strong-data";

    reasonCodes.push(
      "explanation-strong-data"
    );
  }
  else {
    status =
      "usable";

    reasonCodes.push(
      "explanation-usable"
    );
  }

  if (
    selectedStrengths.length >
    0
  ) {
    reasonCodes.push(
      "explanation-strengths-available"
    );
  }

  if (
    selectedWeaknesses.length >
    0
  ) {
    reasonCodes.push(
      "explanation-weaknesses-available"
    );
  }

  if (
    selectedComparisons.length >
    0
  ) {
    reasonCodes.push(
      "explanation-comparisons-available"
    );
  }

  if (
    selectedFacts.every(
      (entry) =>
        entry.fact
          .evidenceIds
          .length >
        0
    )
  ) {
    reasonCodes.push(
      "explanation-evidence-verified"
    );
  }

  return {
    hotelId:
      candidate.hotelId,

    status,

    explanationConfidence:
      round(
        explanationConfidence,
        4
      ),

    factCount:
      selectedFacts.length,

    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),

    strengthFacts:
      selectedStrengths.map(
        (entry) =>
          entry.fact
      ),

    weaknessFacts:
      selectedWeaknesses.map(
        (entry) =>
          entry.fact
      ),

    comparisonFacts:
      selectedComparisons.map(
        (entry) =>
          entry.fact
      ),

    evidenceIds,
  };
}

export function evaluateEvidenceBasedExplanationsV2(
  input:
    SmartStayEvidenceBasedExplanationsInputV2,
  options:
    SmartStayEvidenceBasedExplanationsOptionsV2 = {}
): SmartStayEvidenceBasedExplanationsEvaluationV2 {
  validateCandidateIds(
    input.candidates
  );

  const resolvedOptions =
    resolveOptions(
      options
    );

  const normalizedCandidates =
    input.candidates
      .map(
        (candidate) => ({
          ...candidate,
          hotelId:
            candidate.hotelId
              .trim(),
        })
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

  const catalog =
    buildEvidenceCatalog(
      normalizedCandidates
    );

  const candidatesById =
    new Map(
      normalizedCandidates.map(
        (candidate) => [
          candidate.hotelId,
          candidate,
        ] as const
      )
    );

  return {
    evaluations:
      normalizedCandidates.map(
        (candidate) =>
          evaluateCandidate(
            candidate,
            candidatesById,
            catalog,
            resolvedOptions
          )
      ),
  };
}