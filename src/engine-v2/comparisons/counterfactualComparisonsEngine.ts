
import type {
  SmartStayComparisonFactV2,
  SmartStayEvidenceFactV2,
  SmartStayParetoEvaluationV2,
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
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

import type {
  SmartStayComfortFlexibilityEvaluationV2,
} from "../comfort/comfortFlexibilityEngine";

import type {
  SmartStayParetoDominanceComparisonV2,
  SmartStayParetoFrontierEvaluationV2,
} from "../pareto/paretoFrontierEngine";

export type SmartStayCounterfactualStatusV2 =
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayCounterfactualVerdictV2 =
  | "alternative-better-overall"
  | "selected-better-overall"
  | "trade-off"
  | "materially-equivalent"
  | "insufficient-data";

export type SmartStayCounterfactualParetoRelationV2 =
  | "alternative-dominates"
  | "selected-dominates"
  | "none"
  | "unknown";

export interface SmartStayCounterfactualPairV2 {
  selectedHotelId: string;
  alternativeHotelId: string;
}

export interface SmartStayCounterfactualCandidateV2 {
  hotelId: string;
  evidence: SmartStayEvidenceFactV2[];
  utility: SmartStayUserUtilityEvaluationV2;
  recommendation: SmartStayRecommendationEvaluationV2;
  risk: SmartStayRiskAssessmentV2;
  pareto: SmartStayParetoEvaluationV2;
  priceValue?: SmartStayPriceValueEvaluationV2;
  location?: SmartStayLocationEvaluationV2;
  comfortFlexibility?: SmartStayComfortFlexibilityEvaluationV2;
}

export interface SmartStayCounterfactualComparisonsInputV2 {
  candidates: SmartStayCounterfactualCandidateV2[];
  pairs?: SmartStayCounterfactualPairV2[];
  paretoFrontier?: SmartStayParetoFrontierEvaluationV2 | null;
}

export interface SmartStayCounterfactualComparisonsOptionsV2 {
  minimumEvidenceConfidence?: number;
  minimumDimensionConfidence?: number;
  minimumComparableDimensions?: number;
  minimumMeaningfulScoreDifference?: number;
  minimumMeaningfulAmountDifference?: number;
  minimumMeaningfulPriceRatio?: number;
  minimumMeaningfulDistanceDifferenceKm?: number;
  minimumMeaningfulRiskDifference?: number;
  equivalenceTolerance?: number;
  maximumGainFacts?: number;
  maximumLossFacts?: number;
  maximumNeutralFacts?: number;
}

export interface SmartStayCounterfactualDimensionDeltaV2 {
  dimension: SmartStayUtilityDimensionCodeV2;
  selectedScore: number;
  alternativeScore: number;
  delta: number;
  selectedConfidence: number;
  alternativeConfidence: number;
  configuredWeight: number;
  evidenceIds: string[];
}

export interface SmartStayCounterfactualComparisonEvaluationV2 {
  id: string;
  selectedHotelId: string;
  alternativeHotelId: string;
  selectedRole: SmartStayRecommendationEvaluationV2["role"];
  alternativeRole: SmartStayRecommendationEvaluationV2["role"];
  status: SmartStayCounterfactualStatusV2;
  verdict: SmartStayCounterfactualVerdictV2;
  paretoRelation: SmartStayCounterfactualParetoRelationV2;
  paretoBetterDimensionCodes: SmartStayUtilityDimensionCodeV2[];
  comparisonConfidence: number;
  selectedCost: number | null;
  alternativeCost: number | null;
  currency: string | null;
  switchCostDifferenceAmount: number | null;
  switchCostDifferencePercent: number | null;
  selectedUtilityScore: number | null;
  alternativeUtilityScore: number | null;
  switchUtilityDifference: number | null;
  selectedDistanceKm: number | null;
  alternativeDistanceKm: number | null;
  switchDistanceDifferenceKm: number | null;
  selectedRiskScore: number;
  alternativeRiskScore: number;
  switchRiskDifference: number;
  comparableDimensionCodes: SmartStayUtilityDimensionCodeV2[];
  unavailableDimensionCodes: SmartStayUtilityDimensionCodeV2[];
  dimensionDeltas: SmartStayCounterfactualDimensionDeltaV2[];
  gainFacts: SmartStayComparisonFactV2[];
  lossFacts: SmartStayComparisonFactV2[];
  neutralFacts: SmartStayComparisonFactV2[];
  evidenceIds: string[];
  reasonCodes: string[];
}

export interface SmartStayCounterfactualComparisonsEvaluationV2 {
  pairSource: "explicit" | "recommendation-targets";
  comparisons: SmartStayCounterfactualComparisonEvaluationV2[];
  reasonCodes: string[];
}

type ResolvedOptions = Required<
  SmartStayCounterfactualComparisonsOptionsV2
>;

type EvidenceCatalog = Map<
  string,
  SmartStayEvidenceFactV2
>;

type ComparableCost = {
  amount: number;
  currency: string;
  confidence: number;
  evidenceIds: string[];
};

type FactKind =
  | "gain"
  | "loss"
  | "neutral";

type FactCandidate = {
  kind: FactKind;
  fact: SmartStayComparisonFactV2;
  priority: number;
  confidence: number;
};

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

const DEFAULTS: ResolvedOptions = {
  minimumEvidenceConfidence: 0.55,
  minimumDimensionConfidence: 0.6,
  minimumComparableDimensions: 3,
  minimumMeaningfulScoreDifference: 3,
  minimumMeaningfulAmountDifference: 1,
  minimumMeaningfulPriceRatio: 0.01,
  minimumMeaningfulDistanceDifferenceKm: 0.2,
  minimumMeaningfulRiskDifference: 5,
  equivalenceTolerance: 1,
  maximumGainFacts: 4,
  maximumLossFacts: 4,
  maximumNeutralFacts: 2,
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

function uniqueSorted<T extends string>(
  values: T[]
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
    SmartStayCounterfactualComparisonsOptionsV2
): ResolvedOptions {
  const equivalenceTolerance =
    normalizeNonNegativeNumber(
      options.equivalenceTolerance,
      DEFAULTS.equivalenceTolerance
    );

  const minimumMeaningfulScoreDifference =
    normalizeNonNegativeNumber(
      options.minimumMeaningfulScoreDifference,
      DEFAULTS.minimumMeaningfulScoreDifference
    );

  if (
    minimumMeaningfulScoreDifference <=
    equivalenceTolerance
  ) {
    throw new Error(
      "Counterfactual minimumMeaningfulScoreDifference must be greater than equivalenceTolerance."
    );
  }

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

    minimumComparableDimensions:
      normalizePositiveInteger(
        options.minimumComparableDimensions,
        DEFAULTS.minimumComparableDimensions,
        DIMENSION_CODES.length
      ),

    minimumMeaningfulScoreDifference,

    minimumMeaningfulAmountDifference:
      normalizeNonNegativeNumber(
        options.minimumMeaningfulAmountDifference,
        DEFAULTS.minimumMeaningfulAmountDifference
      ),

    minimumMeaningfulPriceRatio:
      normalizeRatio(
        options.minimumMeaningfulPriceRatio,
        DEFAULTS.minimumMeaningfulPriceRatio
      ),

    minimumMeaningfulDistanceDifferenceKm:
      normalizeNonNegativeNumber(
        options.minimumMeaningfulDistanceDifferenceKm,
        DEFAULTS.minimumMeaningfulDistanceDifferenceKm
      ),

    minimumMeaningfulRiskDifference:
      normalizeNonNegativeNumber(
        options.minimumMeaningfulRiskDifference,
        DEFAULTS.minimumMeaningfulRiskDifference
      ),

    equivalenceTolerance,

    maximumGainFacts:
      normalizePositiveInteger(
        options.maximumGainFacts,
        DEFAULTS.maximumGainFacts,
        12
      ),

    maximumLossFacts:
      normalizePositiveInteger(
        options.maximumLossFacts,
        DEFAULTS.maximumLossFacts,
        12
      ),

    maximumNeutralFacts:
      normalizePositiveInteger(
        options.maximumNeutralFacts,
        DEFAULTS.maximumNeutralFacts,
        8
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
    SmartStayCounterfactualCandidateV2[]
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
        typeof fact.id !==
          "string" ||
        !fact.id.trim()
      ) {
        throw new Error(
          "Counterfactual comparisons received an evidence fact without a valid id."
        );
      }

      const id =
        fact.id.trim();

      const signature =
        evidenceSignature(
          fact
        );

      const previous =
        signatures.get(
          id
        );

      if (
        previous &&
        previous !==
          signature
      ) {
        throw new Error(
          `Evidence id conflict detected: ${id}`
        );
      }

      if (!previous) {
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

function resolveKnownEvidenceIds(
  ids:
    string[],
  catalog:
    EvidenceCatalog,
  minimumConfidence:
    number
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
          fact.availability ===
            "known" &&
          typeof fact.confidence ===
            "number" &&
          Number.isFinite(
            fact.confidence
          ) &&
          fact.confidence >=
            minimumConfidence
        );
      }
    )
  );
}

function resolvePairEvidenceIds(
  selectedIds:
    string[],
  alternativeIds:
    string[],
  catalog:
    EvidenceCatalog,
  minimumConfidence:
    number
) {
  const selected =
    resolveKnownEvidenceIds(
      selectedIds,
      catalog,
      minimumConfidence
    );

  const alternative =
    resolveKnownEvidenceIds(
      alternativeIds,
      catalog,
      minimumConfidence
    );

  if (
    selected.length === 0 ||
    alternative.length === 0
  ) {
    return [];
  }

  return uniqueSorted([
    ...selected,
    ...alternative,
  ]);
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

function validateCandidates(
  candidates:
    SmartStayCounterfactualCandidateV2[]
) {
  const hotelIds =
    new Set<string>();

  let preferenceSignature:
    string | null =
      null;

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
        "Counterfactual candidate requires a hotelId."
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
        `Counterfactual comparisons received duplicate hotelId: ${hotelId}`
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
        `Counterfactual candidate hotelId mismatch: ${hotelId}`
      );
    }

    const currentSignature =
      createPreferenceSignature(
        candidate.utility
      );

    if (
      preferenceSignature ===
      null
    ) {
      preferenceSignature =
        currentSignature;
    }
    else if (
      currentSignature !==
      preferenceSignature
    ) {
      throw new Error(
        "Counterfactual candidates must use the same utility preference and weights."
      );
    }
  }
}

function normalizePair(
  pair:
    SmartStayCounterfactualPairV2
) {
  if (
    typeof pair.selectedHotelId !==
      "string" ||
    !pair.selectedHotelId.trim() ||
    typeof pair.alternativeHotelId !==
      "string" ||
    !pair.alternativeHotelId.trim()
  ) {
    throw new Error(
      "Counterfactual pair requires valid selectedHotelId and alternativeHotelId."
    );
  }

  const selectedHotelId =
    pair.selectedHotelId.trim();

  const alternativeHotelId =
    pair.alternativeHotelId.trim();

  if (
    selectedHotelId ===
    alternativeHotelId
  ) {
    throw new Error(
      "Counterfactual pair cannot compare a hotel with itself."
    );
  }

  return {
    selectedHotelId,
    alternativeHotelId,
  };
}

function resolvePairs(
  input:
    SmartStayCounterfactualComparisonsInputV2,
  candidatesById:
    Map<
      string,
      SmartStayCounterfactualCandidateV2
    >
) {
  const explicit =
    input.pairs !==
    undefined;

  const sourcePairs =
    explicit
      ? input.pairs ??
        []
      : [
          ...candidatesById.values(),
        ]
          .filter(
            (candidate) =>
              typeof candidate
                .recommendation
                .comparisonTargetHotelId ===
                "string" &&
              candidate.recommendation
                .comparisonTargetHotelId
                .trim() &&
              candidate.recommendation
                .comparisonTargetHotelId !==
                candidate.hotelId
          )
          .map(
            (
              candidate
            ): SmartStayCounterfactualPairV2 => ({
              selectedHotelId:
                candidate.recommendation
                  .comparisonTargetHotelId as string,

              alternativeHotelId:
                candidate.hotelId,
            })
          );

  const deduplicated =
    new Map<
      string,
      SmartStayCounterfactualPairV2
    >();

  for (
    const rawPair
    of sourcePairs
  ) {
    const pair =
      normalizePair(
        rawPair
      );

    if (
      !candidatesById.has(
        pair.selectedHotelId
      ) ||
      !candidatesById.has(
        pair.alternativeHotelId
      )
    ) {
      throw new Error(
        `Counterfactual pair references an unknown hotel: ${pair.selectedHotelId} -> ${pair.alternativeHotelId}`
      );
    }

    const key =
      [
        pair.selectedHotelId,
        pair.alternativeHotelId,
      ].join("::");

    deduplicated.set(
      key,
      pair
    );
  }

  return {
    pairSource:
      explicit
        ? "explicit" as const
        : "recommendation-targets" as const,

    pairs:
      [
        ...deduplicated.values(),
      ].sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first.selectedHotelId,
            second.selectedHotelId
          ) ||
          compareStrings(
            first.alternativeHotelId,
            second.alternativeHotelId
          )
      ),
  };
}

function getKnownFactByCode(
  candidate:
    SmartStayCounterfactualCandidateV2,
  code:
    string,
  minimumConfidence:
    number
) {
  return candidate.evidence
    .filter(
      (fact) =>
        fact.code ===
          code &&
        fact.availability ===
          "known" &&
        fact.confidence >=
          minimumConfidence
    )
    .sort(
      (
        first,
        second
      ) =>
        second.confidence -
          first.confidence ||
        compareStrings(
          first.id,
          second.id
        )
    )[0] ??
    null;
}

function normalizeCurrency(
  value:
    unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim()
      .toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalized
  )
    ? normalized
    : null;
}

function extractComparableCost(
  candidate:
    SmartStayCounterfactualCandidateV2,
  options:
    ResolvedOptions
): ComparableCost | null {
  const evaluation =
    candidate.priceValue;

  if (
    !evaluation ||
    evaluation.status ===
      "invalid" ||
    evaluation.status ===
      "unavailable" ||
    typeof evaluation.totalCost !==
      "number" ||
    !Number.isFinite(
      evaluation.totalCost
    ) ||
    evaluation.totalCost <=
      0 ||
    evaluation.costCompleteness !==
      "reported-complete" ||
    evaluation.confidence <
      options.minimumDimensionConfidence
  ) {
    return null;
  }

  const costFact =
    getKnownFactByCode(
      candidate,
      "stay.cost.total",
      options.minimumEvidenceConfidence
    );

  const currencyFact =
    getKnownFactByCode(
      candidate,
      "stay.currency",
      options.minimumEvidenceConfidence
    );

  const completenessFact =
    getKnownFactByCode(
      candidate,
      "stay.cost.completeness",
      options.minimumEvidenceConfidence
    );

  const currency =
    normalizeCurrency(
      evaluation.currency
    );

  if (
    !costFact ||
    typeof costFact.value !==
      "number" ||
    !Number.isFinite(
      costFact.value
    ) ||
    Math.abs(
      costFact.value -
      evaluation.totalCost
    ) >
      0.01 ||
    !currencyFact ||
    normalizeCurrency(
      currencyFact.value
    ) !==
      currency ||
    !completenessFact ||
    completenessFact.value !==
      "reported-complete" ||
    !currency
  ) {
    return null;
  }

  return {
    amount:
      evaluation.totalCost,

    currency,

    confidence:
      Math.min(
        evaluation.confidence,
        costFact.confidence,
        currencyFact.confidence,
        completenessFact.confidence
      ),

    evidenceIds:
      uniqueSorted([
        costFact.id,
        currencyFact.id,
        completenessFact.id,
      ]),
  };
}

function getKnownContribution(
  candidate:
    SmartStayCounterfactualCandidateV2,
  dimension:
    SmartStayUtilityDimensionCodeV2,
  minimumConfidence:
    number
): SmartStayUtilityContributionV2 | null {
  const contribution =
    candidate.utility
      .contributions
      .find(
        (entry) =>
          entry.dimension ===
          dimension
      ) ??
    null;

  if (
    !contribution ||
    contribution.available !==
      true ||
    typeof contribution.score !==
      "number" ||
    !Number.isFinite(
      contribution.score
    ) ||
    contribution.score <
      0 ||
    contribution.score >
      100 ||
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

function createDimensionDeltas(
  selected:
    SmartStayCounterfactualCandidateV2,
  alternative:
    SmartStayCounterfactualCandidateV2,
  catalog:
    EvidenceCatalog,
  options:
    ResolvedOptions
) {
  const deltas:
    SmartStayCounterfactualDimensionDeltaV2[] = [];

  const unavailable:
    SmartStayUtilityDimensionCodeV2[] = [];

  for (
    const dimension
    of DIMENSION_CODES
  ) {
    const selectedContribution =
      getKnownContribution(
        selected,
        dimension,
        options.minimumDimensionConfidence
      );

    const alternativeContribution =
      getKnownContribution(
        alternative,
        dimension,
        options.minimumDimensionConfidence
      );

    if (
      !selectedContribution ||
      !alternativeContribution
    ) {
      unavailable.push(
        dimension
      );

      continue;
    }

    const evidenceIds =
      resolvePairEvidenceIds(
        selectedContribution.evidenceIds,
        alternativeContribution.evidenceIds,
        catalog,
        options.minimumEvidenceConfidence
      );

    if (
      evidenceIds.length ===
      0
    ) {
      unavailable.push(
        dimension
      );

      continue;
    }

    deltas.push({
      dimension,

      selectedScore:
        round(
          selectedContribution.score as number
        ),

      alternativeScore:
        round(
          alternativeContribution.score as number
        ),

      delta:
        round(
          (
            alternativeContribution.score as number
          ) -
          (
            selectedContribution.score as number
          )
        ),

      selectedConfidence:
        round(
          selectedContribution.confidence,
          4
        ),

      alternativeConfidence:
        round(
          alternativeContribution.confidence,
          4
        ),

      configuredWeight:
        round(
          (
            selectedContribution.configuredWeight +
            alternativeContribution.configuredWeight
          ) /
          2,
          4
        ),

      evidenceIds,
    });
  }

  return {
    deltas:
      deltas.sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first.dimension,
            second.dimension
          )
      ),

    unavailable:
      uniqueSorted(
        unavailable
      ),
  };
}

function createFact(
  input: {
    kind: FactKind;
    code: string;
    messageKey: string;
    value: string | number | boolean | null;
    unit: string | null;
    selectedHotelId: string;
    direction: SmartStayComparisonFactV2["direction"];
    evidenceIds: string[];
    priority: number;
    confidence: number;
  }
): FactCandidate | null {
  if (
    input.evidenceIds.length ===
    0
  ) {
    return null;
  }

  return {
    kind:
      input.kind,

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
        input.selectedHotelId,

      direction:
        input.direction,

      evidenceIds:
        uniqueSorted(
          input.evidenceIds
        ),
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

function addFact(
  facts:
    FactCandidate[],
  fact:
    FactCandidate | null
) {
  if (fact) {
    facts.push(
      fact
    );
  }
}

function selectFacts(
  facts:
    FactCandidate[],
  kind:
    FactKind,
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
    of facts.filter(
      (entry) =>
        entry.kind ===
        kind
    )
  ) {
    const key = [
      candidate.fact.code,
      candidate.fact.targetHotelId ??
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
        )
    )
    .slice(
      0,
      maximum
    );
}

function getParetoRelation(
  selected:
    SmartStayCounterfactualCandidateV2,
  alternative:
    SmartStayCounterfactualCandidateV2,
  frontier:
    SmartStayParetoFrontierEvaluationV2 |
    null |
    undefined
) {
  let direct:
    SmartStayParetoDominanceComparisonV2 |
    null =
      null;

  if (frontier) {
    direct =
      frontier
        .dominanceComparisons
        .find(
          (comparison) =>
            (
              comparison.dominantHotelId ===
                alternative.hotelId &&
              comparison.dominatedHotelId ===
                selected.hotelId
            ) ||
            (
              comparison.dominantHotelId ===
                selected.hotelId &&
              comparison.dominatedHotelId ===
                alternative.hotelId
            )
        ) ??
      null;
  }

  if (direct) {
    const alternativeDominates =
      direct.dominantHotelId ===
      alternative.hotelId;

    return {
      relation:
        alternativeDominates
          ? "alternative-dominates" as const
          : "selected-dominates" as const,

      betterDimensionCodes:
        uniqueSorted(
          direct.betterDimensionCodes
        ),
    };
  }

  if (
    alternative.pareto
      .dominatesHotelIds
      .includes(
        selected.hotelId
      ) ||
    selected.pareto
      .dominatedByHotelIds
      .includes(
        alternative.hotelId
      )
  ) {
    return {
      relation:
        "alternative-dominates" as const,

      betterDimensionCodes:
        [] as SmartStayUtilityDimensionCodeV2[],
    };
  }

  if (
    selected.pareto
      .dominatesHotelIds
      .includes(
        alternative.hotelId
      ) ||
    alternative.pareto
      .dominatedByHotelIds
      .includes(
        selected.hotelId
      )
  ) {
    return {
      relation:
        "selected-dominates" as const,

      betterDimensionCodes:
        [] as SmartStayUtilityDimensionCodeV2[],
    };
  }

  if (
    selected.pareto.status ===
      "unknown" ||
    alternative.pareto.status ===
      "unknown"
  ) {
    return {
      relation:
        "unknown" as const,

      betterDimensionCodes:
        [] as SmartStayUtilityDimensionCodeV2[],
    };
  }

  return {
    relation:
      "none" as const,

    betterDimensionCodes:
      [] as SmartStayUtilityDimensionCodeV2[],
  };
}

function getMandatoryEvidenceIds(
  candidate:
    SmartStayCounterfactualCandidateV2,
  status:
    "unmet" |
    "unverified"
) {
  const evaluation =
    candidate
      .comfortFlexibility;

  if (!evaluation) {
    return [];
  }

  return uniqueSorted(
    evaluation.features
      .filter(
        (feature) =>
          feature.mandatoryStatus ===
          status
      )
      .flatMap(
        (feature) =>
          feature.evidenceIds
      )
  );
}

function calculateComparisonConfidence(
  selected:
    SmartStayCounterfactualCandidateV2,
  alternative:
    SmartStayCounterfactualCandidateV2,
  dimensions:
    SmartStayCounterfactualDimensionDeltaV2[],
  facts:
    FactCandidate[]
) {
  const baseConfidence =
    Math.min(
      selected.utility
        .scoreConfidence,
      selected.utility
        .evidenceCoverage,
      alternative.utility
        .scoreConfidence,
      alternative.utility
        .evidenceCoverage
    );

  const dimensionConfidence =
    dimensions.length >
      0
      ? dimensions.reduce(
          (
            total,
            dimension
          ) =>
            total +
            Math.min(
              dimension.selectedConfidence,
              dimension.alternativeConfidence
            ),
          0
        ) /
        dimensions.length
      : 0;

  const factConfidence =
    facts.length >
      0
      ? facts.reduce(
          (
            total,
            fact
          ) =>
            total +
            fact.confidence,
          0
        ) /
        facts.length
      : 0;

  return clamp(
    Math.min(
      baseConfidence,
      Math.max(
        dimensionConfidence,
        factConfidence
      )
    ),
    0,
    1
  );
}

function evaluatePair(
  pair:
    SmartStayCounterfactualPairV2,
  selected:
    SmartStayCounterfactualCandidateV2,
  alternative:
    SmartStayCounterfactualCandidateV2,
  catalog:
    EvidenceCatalog,
  frontier:
    SmartStayParetoFrontierEvaluationV2 |
    null |
    undefined,
  options:
    ResolvedOptions
): SmartStayCounterfactualComparisonEvaluationV2 {
  const reasonCodes:
    string[] = [
      "counterfactual-switch-evaluated",
      "counterfactual-selected-option-fixed",
      "counterfactual-alternative-compared",
    ];

  const facts:
    FactCandidate[] = [];

  const {
    deltas,
    unavailable,
  } = createDimensionDeltas(
    selected,
    alternative,
    catalog,
    options
  );

  for (
    const delta
    of deltas
  ) {
    if (
      delta.delta >=
      options.minimumMeaningfulScoreDifference
    ) {
      addFact(
        facts,
        createFact({
          kind:
            "gain",

          code:
            `counterfactual-gain-${delta.dimension}`,

          messageKey:
            `smartstay.counterfactual.gain.${delta.dimension}`,

          value:
            round(
              delta.delta
            ),

          unit:
            "points",

          selectedHotelId:
            selected.hotelId,

          direction:
            "better",

          evidenceIds:
            delta.evidenceIds,

          priority:
            80 +
            delta.configuredWeight *
            10,

          confidence:
            Math.min(
              delta.selectedConfidence,
              delta.alternativeConfidence
            ),
        })
      );
    }
    else if (
      delta.delta <=
      -options.minimumMeaningfulScoreDifference
    ) {
      addFact(
        facts,
        createFact({
          kind:
            "loss",

          code:
            `counterfactual-loss-${delta.dimension}`,

          messageKey:
            `smartstay.counterfactual.loss.${delta.dimension}`,

          value:
            round(
              Math.abs(
                delta.delta
              )
            ),

          unit:
            "points",

          selectedHotelId:
            selected.hotelId,

          direction:
            "worse",

          evidenceIds:
            delta.evidenceIds,

          priority:
            80 +
            delta.configuredWeight *
            10,

          confidence:
            Math.min(
              delta.selectedConfidence,
              delta.alternativeConfidence
            ),
        })
      );
    }
    else if (
      Math.abs(
        delta.delta
      ) <=
      options.equivalenceTolerance
    ) {
      addFact(
        facts,
        createFact({
          kind:
            "neutral",

          code:
            `counterfactual-equivalent-${delta.dimension}`,

          messageKey:
            `smartstay.counterfactual.neutral.${delta.dimension}`,

          value:
            round(
              Math.abs(
                delta.delta
              )
            ),

          unit:
            "points",

          selectedHotelId:
            selected.hotelId,

          direction:
            "neutral",

          evidenceIds:
            delta.evidenceIds,

          priority:
            40 +
            delta.configuredWeight *
            10,

          confidence:
            Math.min(
              delta.selectedConfidence,
              delta.alternativeConfidence
            ),
        })
      );
    }
  }

  const selectedCost =
    extractComparableCost(
      selected,
      options
    );

  const alternativeCost =
    extractComparableCost(
      alternative,
      options
    );

  let currency:
    string | null =
      null;

  let switchCostDifferenceAmount:
    number | null =
      null;

  let switchCostDifferencePercent:
    number | null =
      null;

  if (
    selectedCost &&
    alternativeCost &&
    selectedCost.currency ===
      alternativeCost.currency
  ) {
    currency =
      selectedCost.currency;

    switchCostDifferenceAmount =
      round(
        alternativeCost.amount -
        selectedCost.amount
      );

    switchCostDifferencePercent =
      round(
        (
          switchCostDifferenceAmount /
          selectedCost.amount
        ) *
        100,
        2
      );

    const priceRatio =
      Math.abs(
        switchCostDifferenceAmount
      ) /
      selectedCost.amount;

    if (
      Math.abs(
        switchCostDifferenceAmount
      ) >=
        options.minimumMeaningfulAmountDifference &&
      priceRatio >=
        options.minimumMeaningfulPriceRatio
    ) {
      const savesMoney =
        switchCostDifferenceAmount <
        0;

      addFact(
        facts,
        createFact({
          kind:
            savesMoney
              ? "gain"
              : "loss",

          code:
            savesMoney
              ? "counterfactual-gain-saves-money"
              : "counterfactual-loss-costs-more",

          messageKey:
            savesMoney
              ? "smartstay.counterfactual.gain.saves_money"
              : "smartstay.counterfactual.loss.costs_more",

          value:
            round(
              Math.abs(
                switchCostDifferenceAmount
              )
            ),

          unit:
            currency,

          selectedHotelId:
            selected.hotelId,

          direction:
            savesMoney
              ? "better"
              : "worse",

          evidenceIds:
            uniqueSorted([
              ...selectedCost
                .evidenceIds,
              ...alternativeCost
                .evidenceIds,
            ]),

          priority:
            100,

          confidence:
            Math.min(
              selectedCost.confidence,
              alternativeCost.confidence
            ),
        })
      );
    }
  }
  else {
    reasonCodes.push(
      selectedCost &&
      alternativeCost
        ? "counterfactual-price-currency-mismatch"
        : "counterfactual-price-comparison-unavailable"
    );
  }

  const selectedUtilityScore =
    typeof selected.utility
      .utilityScore ===
      "number" &&
    Number.isFinite(
      selected.utility
        .utilityScore
    )
      ? selected.utility
          .utilityScore
      : null;

  const alternativeUtilityScore =
    typeof alternative.utility
      .utilityScore ===
      "number" &&
    Number.isFinite(
      alternative.utility
        .utilityScore
    )
      ? alternative.utility
          .utilityScore
      : null;

  let switchUtilityDifference:
    number | null =
      null;

  if (
    selectedUtilityScore !==
      null &&
    alternativeUtilityScore !==
      null
  ) {
    const utilityEvidenceIds =
      resolvePairEvidenceIds(
        selected.utility.evidenceIds,
        alternative.utility.evidenceIds,
        catalog,
        options.minimumEvidenceConfidence
      );

    switchUtilityDifference =
      round(
        alternativeUtilityScore -
        selectedUtilityScore
      );

    if (
      Math.abs(
        switchUtilityDifference
      ) >=
      options.minimumMeaningfulScoreDifference
    ) {
      const utilityGain =
        switchUtilityDifference >
        0;

      addFact(
        facts,
        createFact({
          kind:
            utilityGain
              ? "gain"
              : "loss",

          code:
            utilityGain
              ? "counterfactual-gain-utility"
              : "counterfactual-loss-utility",

          messageKey:
            utilityGain
              ? "smartstay.counterfactual.gain.utility"
              : "smartstay.counterfactual.loss.utility",

          value:
            round(
              Math.abs(
                switchUtilityDifference
              )
            ),

          unit:
            "points",

          selectedHotelId:
            selected.hotelId,

          direction:
            utilityGain
              ? "better"
              : "worse",

          evidenceIds:
            utilityEvidenceIds,

          priority:
            96,

          confidence:
            Math.min(
              selected.utility
                .scoreConfidence,
              selected.utility
                .evidenceCoverage,
              alternative.utility
                .scoreConfidence,
              alternative.utility
                .evidenceCoverage
            ),
        })
      );
    }
  }

  const selectedDistanceKm =
    selected.location &&
    typeof selected.location
      .distance
      .selectedDistanceKm ===
      "number" &&
    Number.isFinite(
      selected.location
        .distance
        .selectedDistanceKm
    ) &&
    selected.location
      .confidence >=
      options.minimumDimensionConfidence
      ? selected.location
          .distance
          .selectedDistanceKm
      : null;

  const alternativeDistanceKm =
    alternative.location &&
    typeof alternative.location
      .distance
      .selectedDistanceKm ===
      "number" &&
    Number.isFinite(
      alternative.location
        .distance
        .selectedDistanceKm
    ) &&
    alternative.location
      .confidence >=
      options.minimumDimensionConfidence
      ? alternative.location
          .distance
          .selectedDistanceKm
      : null;

  let switchDistanceDifferenceKm:
    number | null =
      null;

  if (
    selectedDistanceKm !==
      null &&
    alternativeDistanceKm !==
      null
  ) {
    const distanceEvidenceIds =
      resolvePairEvidenceIds(
        selected.location
          ?.evidenceIds ??
          [],
        alternative.location
          ?.evidenceIds ??
          [],
        catalog,
        options.minimumEvidenceConfidence
      );

    switchDistanceDifferenceKm =
      round(
        alternativeDistanceKm -
        selectedDistanceKm,
        2
      );

    if (
      Math.abs(
        switchDistanceDifferenceKm
      ) >=
      options.minimumMeaningfulDistanceDifferenceKm
    ) {
      const closer =
        switchDistanceDifferenceKm <
        0;

      addFact(
        facts,
        createFact({
          kind:
            closer
              ? "gain"
              : "loss",

          code:
            closer
              ? "counterfactual-gain-closer"
              : "counterfactual-loss-farther",

          messageKey:
            closer
              ? "smartstay.counterfactual.gain.closer"
              : "smartstay.counterfactual.loss.farther",

          value:
            round(
              Math.abs(
                switchDistanceDifferenceKm
              ),
              2
            ),

          unit:
            "km",

          selectedHotelId:
            selected.hotelId,

          direction:
            closer
              ? "better"
              : "worse",

          evidenceIds:
            distanceEvidenceIds,

          priority:
            90,

          confidence:
            Math.min(
              selected.location
                ?.confidence ??
                0,
              alternative.location
                ?.confidence ??
                0
            ),
        })
      );
    }
  }

  const switchRiskDifference =
    round(
      alternative.risk.score -
      selected.risk.score
    );

  if (
    Math.abs(
      switchRiskDifference
    ) >=
      options.minimumMeaningfulRiskDifference
  ) {
    const riskEvidenceIds =
      resolvePairEvidenceIds(
        selected.risk.evidenceIds,
        alternative.risk.evidenceIds,
        catalog,
        options.minimumEvidenceConfidence
      );

    const lowerRisk =
      switchRiskDifference <
      0;

    addFact(
      facts,
      createFact({
        kind:
          lowerRisk
            ? "gain"
            : "loss",

        code:
          lowerRisk
            ? "counterfactual-gain-lower-risk"
            : "counterfactual-loss-higher-risk",

        messageKey:
          lowerRisk
            ? "smartstay.counterfactual.gain.lower_risk"
            : "smartstay.counterfactual.loss.higher_risk",

        value:
          round(
            Math.abs(
              switchRiskDifference
            )
          ),

        unit:
          "risk-points",

        selectedHotelId:
          selected.hotelId,

        direction:
          lowerRisk
            ? "better"
            : "worse",

        evidenceIds:
          riskEvidenceIds,

        priority:
          88,

        confidence:
          Math.min(
            selected.utility
              .scoreConfidence,
            alternative.utility
              .scoreConfidence
          ),
      })
    );
  }

  const selectedWithinBudget =
    selected.priceValue
      ?.budget
      .withinBudget;

  const alternativeWithinBudget =
    alternative.priceValue
      ?.budget
      .withinBudget;

  if (
    selectedWithinBudget ===
      true &&
    alternativeWithinBudget ===
      false &&
    alternative.priceValue &&
    typeof alternative
      .priceValue
      .budget
      .overageAmount ===
      "number" &&
    alternative.priceValue
      .budget
      .overageAmount >
      0 &&
    alternativeCost
  ) {
    addFact(
      facts,
      createFact({
        kind:
          "loss",

        code:
          "counterfactual-loss-crosses-budget",

        messageKey:
          "smartstay.counterfactual.loss.crosses_budget",

        value:
          round(
            alternative.priceValue
              .budget
              .overageAmount
          ),

        unit:
          alternativeCost.currency,

        selectedHotelId:
          selected.hotelId,

        direction:
          "worse",

        evidenceIds:
          alternativeCost
            .evidenceIds,

        priority:
          99,

        confidence:
          alternativeCost
            .confidence,
      })
    );
  }
  else if (
    selectedWithinBudget ===
      false &&
    alternativeWithinBudget ===
      true &&
    selected.priceValue &&
    typeof selected.priceValue
      .budget
      .overageAmount ===
      "number" &&
    selected.priceValue
      .budget
      .overageAmount >
      0 &&
    selectedCost
  ) {
    addFact(
      facts,
      createFact({
        kind:
          "gain",

        code:
          "counterfactual-gain-returns-within-budget",

        messageKey:
          "smartstay.counterfactual.gain.returns_within_budget",

        value:
          round(
            selected.priceValue
              .budget
              .overageAmount
          ),

        unit:
          selectedCost.currency,

        selectedHotelId:
          selected.hotelId,

        direction:
          "better",

        evidenceIds:
          selectedCost
            .evidenceIds,

        priority:
          99,

        confidence:
          selectedCost
            .confidence,
      })
    );
  }

  const selectedMandatory =
    selected
      .comfortFlexibility
      ?.mandatoryRequirements;

  const alternativeMandatory =
    alternative
      .comfortFlexibility
      ?.mandatoryRequirements;

  let alternativeMandatoryBlocked =
    false;

  if (
    selectedMandatory
      ?.satisfied ===
      true &&
    alternativeMandatory &&
    alternativeMandatory
      .unmetFeatureCodes
      .length >
      0
  ) {
    alternativeMandatoryBlocked =
      true;

    const evidenceIds =
      resolveKnownEvidenceIds(
        getMandatoryEvidenceIds(
          alternative,
          "unmet"
        ),
        catalog,
        options.minimumEvidenceConfidence
      );

    addFact(
      facts,
      createFact({
        kind:
          "loss",

        code:
          "counterfactual-loss-mandatory-requirement-unmet",

        messageKey:
          "smartstay.counterfactual.loss.mandatory_requirement_unmet",

        value:
          alternativeMandatory
            .unmetFeatureCodes
            .join(","),

        unit:
          null,

        selectedHotelId:
          selected.hotelId,

        direction:
          "worse",

        evidenceIds,

        priority:
          110,

        confidence:
          alternative
            .comfortFlexibility
            ?.confidence ??
            0,
      })
    );
  }

  if (
    alternativeMandatory &&
    (
      alternativeMandatory
        .unverifiedFeatureCodes
        .length >
        0 ||
      alternativeMandatory
        .requiredUnitTypeStatus ===
        "unverified"
    )
  ) {
    reasonCodes.push(
      "counterfactual-alternative-mandatory-requirements-unverified"
    );
  }

  const pareto =
    getParetoRelation(
      selected,
      alternative,
      frontier
    );

  if (
    pareto.relation !==
    "none"
  ) {
    reasonCodes.push(
      `counterfactual-pareto-${pareto.relation}`
    );
  }

  const selectedGains =
    selectFacts(
      facts,
      "gain",
      options.maximumGainFacts
    );

  const selectedLosses =
    selectFacts(
      facts,
      "loss",
      options.maximumLossFacts
    );

  const selectedNeutrals =
    selectFacts(
      facts,
      "neutral",
      options.maximumNeutralFacts
    );

  const selectedFacts = [
    ...selectedGains,
    ...selectedLosses,
    ...selectedNeutrals,
  ];

  const enoughComparableDimensions =
    deltas.length >=
    options.minimumComparableDimensions;

  const materiallyEquivalent =
    enoughComparableDimensions &&
    deltas.every(
      (delta) =>
        Math.abs(
          delta.delta
        ) <=
        options.equivalenceTolerance
    ) &&
    (
      switchCostDifferenceAmount ===
        null ||
      selectedCost ===
        null ||
      Math.abs(
        switchCostDifferenceAmount
      ) <
        options.minimumMeaningfulAmountDifference ||
      Math.abs(
        switchCostDifferenceAmount
      ) /
        selectedCost.amount <
        options.minimumMeaningfulPriceRatio
    ) &&
    (
      switchUtilityDifference ===
        null ||
      Math.abs(
        switchUtilityDifference
      ) <
        options.minimumMeaningfulScoreDifference
    ) &&
    (
      switchDistanceDifferenceKm ===
        null ||
      Math.abs(
        switchDistanceDifferenceKm
      ) <
        options.minimumMeaningfulDistanceDifferenceKm
    ) &&
    Math.abs(
      switchRiskDifference
    ) <
      options.minimumMeaningfulRiskDifference;

  let verdict:
    SmartStayCounterfactualVerdictV2;

  if (
    selectedFacts.length ===
      0 &&
    !materiallyEquivalent
  ) {
    verdict =
      "insufficient-data";
  }
  else if (
    alternativeMandatoryBlocked ||
    pareto.relation ===
      "selected-dominates"
  ) {
    verdict =
      "selected-better-overall";
  }
  else if (
    pareto.relation ===
      "alternative-dominates"
  ) {
    verdict =
      "alternative-better-overall";
  }
  else if (
    materiallyEquivalent
  ) {
    verdict =
      "materially-equivalent";
  }
  else if (
    selectedGains.length >
      0 &&
    selectedLosses.length >
      0
  ) {
    verdict =
      "trade-off";
  }
  else if (
    selectedGains.length >
      0
  ) {
    verdict =
      "alternative-better-overall";
  }
  else if (
    selectedLosses.length >
      0
  ) {
    verdict =
      "selected-better-overall";
  }
  else {
    verdict =
      "insufficient-data";
  }

  const comparisonConfidence =
    calculateComparisonConfidence(
      selected,
      alternative,
      deltas,
      selectedFacts
    );

  let status:
    SmartStayCounterfactualStatusV2;

  if (
    selectedFacts.length ===
      0 &&
    !materiallyEquivalent
  ) {
    status =
      "unavailable";

    reasonCodes.push(
      "counterfactual-comparison-unavailable"
    );
  }
  else if (
    comparisonConfidence >=
      0.8 &&
    enoughComparableDimensions &&
    selectedFacts.every(
      (fact) =>
        fact.fact
          .evidenceIds
          .length >
        0
    )
  ) {
    status =
      "strong-data";

    reasonCodes.push(
      "counterfactual-strong-data"
    );
  }
  else {
    status =
      "usable";

    reasonCodes.push(
      "counterfactual-usable"
    );
  }

  if (
    enoughComparableDimensions
  ) {
    reasonCodes.push(
      "counterfactual-comparable-dimensions-sufficient"
    );
  }
  else {
    reasonCodes.push(
      "counterfactual-comparable-dimensions-limited"
    );
  }

  if (
    selectedGains.length >
    0
  ) {
    reasonCodes.push(
      "counterfactual-gains-available"
    );
  }

  if (
    selectedLosses.length >
    0
  ) {
    reasonCodes.push(
      "counterfactual-losses-available"
    );
  }

  if (
    selectedNeutrals.length >
    0
  ) {
    reasonCodes.push(
      "counterfactual-equivalences-available"
    );
  }

  if (
    selectedFacts.every(
      (fact) =>
        fact.fact
          .evidenceIds
          .length >
        0
    )
  ) {
    reasonCodes.push(
      "counterfactual-evidence-verified"
    );
  }

  const evidenceIds =
    uniqueSorted(
      selectedFacts.flatMap(
        (fact) =>
          fact.fact
            .evidenceIds
      )
    );

  return {
    id:
      [
        pair.selectedHotelId,
        pair.alternativeHotelId,
      ].join("::"),

    selectedHotelId:
      selected.hotelId,

    alternativeHotelId:
      alternative.hotelId,

    selectedRole:
      selected.recommendation
        .role,

    alternativeRole:
      alternative.recommendation
        .role,

    status,

    verdict,

    paretoRelation:
      pareto.relation,

    paretoBetterDimensionCodes:
      pareto
        .betterDimensionCodes,

    comparisonConfidence:
      round(
        comparisonConfidence,
        4
      ),

    selectedCost:
      selectedCost
        ? round(
            selectedCost.amount
          )
        : null,

    alternativeCost:
      alternativeCost
        ? round(
            alternativeCost.amount
          )
        : null,

    currency,

    switchCostDifferenceAmount,

    switchCostDifferencePercent,

    selectedUtilityScore:
      selectedUtilityScore ===
        null
        ? null
        : round(
            selectedUtilityScore
          ),

    alternativeUtilityScore:
      alternativeUtilityScore ===
        null
        ? null
        : round(
            alternativeUtilityScore
          ),

    switchUtilityDifference,

    selectedDistanceKm:
      selectedDistanceKm ===
        null
        ? null
        : round(
            selectedDistanceKm,
            2
          ),

    alternativeDistanceKm:
      alternativeDistanceKm ===
        null
        ? null
        : round(
            alternativeDistanceKm,
            2
          ),

    switchDistanceDifferenceKm,

    selectedRiskScore:
      round(
        selected.risk.score
      ),

    alternativeRiskScore:
      round(
        alternative.risk.score
      ),

    switchRiskDifference,

    comparableDimensionCodes:
      deltas.map(
        (delta) =>
          delta.dimension
      ),

    unavailableDimensionCodes:
      unavailable,

    dimensionDeltas:
      deltas,

    gainFacts:
      selectedGains.map(
        (fact) =>
          fact.fact
      ),

    lossFacts:
      selectedLosses.map(
        (fact) =>
          fact.fact
      ),

    neutralFacts:
      selectedNeutrals.map(
        (fact) =>
          fact.fact
      ),

    evidenceIds,

    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),
  };
}

export function evaluateCounterfactualComparisonsV2(
  input:
    SmartStayCounterfactualComparisonsInputV2,
  options:
    SmartStayCounterfactualComparisonsOptionsV2 = {}
): SmartStayCounterfactualComparisonsEvaluationV2 {
  validateCandidates(
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

  const candidatesById =
    new Map(
      normalizedCandidates.map(
        (candidate) => [
          candidate.hotelId,
          candidate,
        ] as const
      )
    );

  const catalog =
    buildEvidenceCatalog(
      normalizedCandidates
    );

  const {
    pairSource,
    pairs,
  } = resolvePairs(
    {
      ...input,

      candidates:
        normalizedCandidates,
    },
    candidatesById
  );

  const comparisons =
    pairs.map(
      (pair) =>
        evaluatePair(
          pair,
          candidatesById.get(
            pair.selectedHotelId
          ) as SmartStayCounterfactualCandidateV2,
          candidatesById.get(
            pair.alternativeHotelId
          ) as SmartStayCounterfactualCandidateV2,
          catalog,
          input.paretoFrontier,
          resolvedOptions
        )
    );

  const reasonCodes:
    string[] = [
      pairSource ===
        "explicit"
        ? "counterfactual-explicit-pairs"
        : "counterfactual-recommendation-target-pairs",
    ];

  if (
    comparisons.length ===
    0
  ) {
    reasonCodes.push(
      "counterfactual-no-comparisons"
    );
  }
  else {
    reasonCodes.push(
      "counterfactual-comparisons-available"
    );
  }

  if (
    comparisons.every(
      (comparison) =>
        comparison.evidenceIds
          .length >
        0 ||
        comparison.verdict ===
          "materially-equivalent"
    )
  ) {
    reasonCodes.push(
      "counterfactual-output-evidence-grounded"
    );
  }

  return {
    pairSource,

    comparisons,

    reasonCodes:
      uniqueSorted(
        reasonCodes
      ),
  };
}