import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayPeerGroupAssignmentV2,
} from "../peer-groups/peerGroupModel";

export type SmartStayPriceValueStatusV2 =
  | "invalid"
  | "unavailable"
  | "usable"
  | "strong-data";

export interface SmartStayPriceValueCandidateV2 {
  hotelId:
    string;

  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;
}

export interface SmartStayPriceValueOptionsV2 {
  minimumEvidenceConfidence?:
    number;

  minimumPeerReferenceCount?:
    number;
}

export interface SmartStayBudgetEvaluationV2 {
  provided:
    boolean;

  total:
    number | null;

  withinBudget:
    boolean | null;

  differenceAmount:
    number | null;

  overageAmount:
    number | null;

  overageRatio:
    number | null;

  utilizationRatio:
    number | null;

  fitScore:
    number | null;
}

export interface SmartStayPeerPriceBaselineV2 {
  available:
    boolean;

  mode:
    SmartStayPeerGroupAssignmentV2[
      "peerGroup"
    ]["mode"];

  assignedSampleSize:
    number;

  eligibleReferenceCount:
    number;

  excludedCurrencyMismatchCount:
    number;

  excludedMissingPriceCount:
    number;

  minimum:
    number | null;

  firstQuartile:
    number | null;

  median:
    number | null;

  thirdQuartile:
    number | null;

  maximum:
    number | null;

  confidence:
    number;

  referenceHotelIds:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayRelativePriceEvaluationV2 {
  ratioToMedian:
    number | null;

  savingAgainstMedian:
    number | null;

  savingPercentageAgainstMedian:
    number | null;

  pricePercentile:
    number | null;

  valueScore:
    number | null;
}

export interface SmartStayPriceValueEvaluationV2 {
  hotelId:
    string;

  status:
    SmartStayPriceValueStatusV2;

  eligibleForPrimaryRanking:
    boolean;

  totalCost:
    number | null;

  currency:
    string | null;

  costCompleteness:
    string | null;

  budget:
    SmartStayBudgetEvaluationV2;

  peerBaseline:
    SmartStayPeerPriceBaselineV2;

  relativePrice:
    SmartStayRelativePriceEvaluationV2;

  score:
    number | null;

  confidence:
    number;

  warningCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayPriceValueInputV2 {
  targetHotelId:
    string;

  candidates:
    SmartStayPriceValueCandidateV2[];

  peerGroupAssignment:
    SmartStayPeerGroupAssignmentV2;

  budgetTotal?:
    number | null;
}

type PriceFactBundle = {
  costFact:
    SmartStayEvidenceFactV2 | null;

  currencyFact:
    SmartStayEvidenceFactV2 | null;

  completenessFact:
    SmartStayEvidenceFactV2 | null;

  totalCost:
    number | null;

  currency:
    string | null;

  completeness:
    string | null;

  evidenceIds:
    string[];
};

type PeerReference = {
  hotelId:
    string;

  totalCost:
    number;

  currency:
    string;

  confidence:
    number;

  evidenceIds:
    string[];
};

const DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE =
  0.6;

const DEFAULT_MINIMUM_PEER_REFERENCE_COUNT =
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

function normalizeConfidence(
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

function normalizeMinimum(
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

  return Math.max(
    1,
    Math.floor(value)
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

function isPositiveFiniteNumber(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function normalizeCurrency(
  value:
    unknown
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

function getKnownFact(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string,
  minimumConfidence:
    number
) {
  return evidence
    .filter(
      (fact) =>
        fact.code === code &&
        fact.availability ===
          "known" &&
        fact.confidence >=
          minimumConfidence
    )
    .sort(
      (
        firstFact,
        secondFact
      ) =>
        secondFact.confidence -
        firstFact.confidence
    )[0] ??
    null;
}

function extractPriceFacts(
  candidate:
    SmartStayPriceValueCandidateV2,
  minimumEvidenceConfidence:
    number
): PriceFactBundle {
  const costFact =
    getKnownFact(
      candidate.evidence,
      "stay.cost.total",
      minimumEvidenceConfidence
    );

  const currencyFact =
    getKnownFact(
      candidate.evidence,
      "stay.currency",
      minimumEvidenceConfidence
    );

  const completenessFact =
    getKnownFact(
      candidate.evidence,
      "stay.cost.completeness",
      minimumEvidenceConfidence
    );

  const totalCost =
    costFact &&
    isPositiveFiniteNumber(
      costFact.value
    )
      ? costFact.value
      : null;

  const currency =
    currencyFact
      ? normalizeCurrency(
          currencyFact.value
        )
      : null;

  const completeness =
    completenessFact &&
    typeof completenessFact.value ===
      "string" &&
    completenessFact.value.trim()
      ? completenessFact.value.trim()
      : null;

  return {
    costFact,

    currencyFact,

    completenessFact,

    totalCost,

    currency,

    completeness,

    evidenceIds:
      uniqueSorted(
        [
          costFact?.id,
          currencyFact?.id,
          completenessFact?.id,
        ].filter(
          (
            evidenceId
          ): evidenceId is string =>
            Boolean(evidenceId)
        )
      ),
  };
}

function validateCandidateIds(
  candidates:
    SmartStayPriceValueCandidateV2[]
) {
  const candidateIds =
    new Set<string>();

  for (
    const candidate
    of candidates
  ) {
    const hotelId =
      candidate.hotelId.trim();

    if (!hotelId) {
      throw new Error(
        "Price-value candidate requires a hotelId."
      );
    }

    if (
      candidateIds.has(
        hotelId
      )
    ) {
      throw new Error(
        `Duplicate price-value candidate: ${hotelId}`
      );
    }

    candidateIds.add(
      hotelId
    );
  }
}

function validateBudget(
  budgetTotal:
    number | null | undefined
) {
  if (
    budgetTotal === null ||
    budgetTotal === undefined
  ) {
    return null;
  }

  if (
    !isPositiveFiniteNumber(
      budgetTotal
    )
  ) {
    throw new Error(
      "Budget total must be a positive finite number."
    );
  }

  return budgetTotal;
}

function calculateBudgetFitScore(
  totalCost:
    number,
  budgetTotal:
    number
) {
  const utilizationRatio =
    totalCost /
    budgetTotal;

  if (
    utilizationRatio <= 1
  ) {
    return clamp(
      100 -
      20 *
      (
        utilizationRatio **
        1.6
      ),
      0,
      100
    );
  }

  return clamp(
    80 *
    Math.exp(
      -3 *
      (
        utilizationRatio -
        1
      )
    ),
    0,
    100
  );
}

function createBudgetEvaluation(
  totalCost:
    number | null,
  budgetTotal:
    number | null,
  costCompleteness:
    string | null =
      null
): SmartStayBudgetEvaluationV2 {
  if (
    budgetTotal === null ||
    totalCost === null
  ) {
    return {
      provided:
        budgetTotal !== null,

      total:
        budgetTotal,

      withinBudget:
        null,

      differenceAmount:
        null,

      overageAmount:
        null,

      overageRatio:
        null,

      utilizationRatio:
        null,

      fitScore:
        null,
    };
  }

  const differenceAmount =
    budgetTotal -
    totalCost;

  const overageAmount =
    Math.max(
      totalCost -
      budgetTotal,
      0
    );

  const utilizationRatio =
    totalCost /
    budgetTotal;

  const withinBudget =
    totalCost >
      budgetTotal
      ? false
      : costCompleteness ===
          "reported-complete"
        ? true
        : null;

  return {
    provided:
      true,

    total:
      round(
        budgetTotal
      ),

    withinBudget,

    differenceAmount:
      round(
        differenceAmount
      ),

    overageAmount:
      round(
        overageAmount
      ),

    overageRatio:
      round(
        overageAmount /
        budgetTotal,
        4
      ),

    utilizationRatio:
      round(
        utilizationRatio,
        4
      ),

    fitScore:
      round(
        calculateBudgetFitScore(
          totalCost,
          budgetTotal
        )
      ),
  };
}

function percentile(
  sortedValues:
    number[],
  percentileValue:
    number
) {
  if (
    sortedValues.length === 0
  ) {
    return null;
  }

  if (
    sortedValues.length === 1
  ) {
    return sortedValues[0];
  }

  const position =
    (
      sortedValues.length -
      1
    ) *
    percentileValue;

  const lowerIndex =
    Math.floor(
      position
    );

  const upperIndex =
    Math.ceil(
      position
    );

  const lowerValue =
    sortedValues[
      lowerIndex
    ];

  const upperValue =
    sortedValues[
      upperIndex
    ];

  if (
    lowerIndex === upperIndex
  ) {
    return lowerValue;
  }

  return (
    lowerValue +
    (
      upperValue -
      lowerValue
    ) *
    (
      position -
      lowerIndex
    )
  );
}

function calculatePricePercentile(
  targetCost:
    number,
  referenceCosts:
    number[]
) {
  if (
    referenceCosts.length === 0
  ) {
    return null;
  }

  const lowerCount =
    referenceCosts.filter(
      (cost) =>
        cost < targetCost
    ).length;

  const equalCount =
    referenceCosts.filter(
      (cost) =>
        cost === targetCost
    ).length;

  return (
    (
      lowerCount +
      equalCount * 0.5
    ) /
    referenceCosts.length
  ) * 100;
}

function calculateRelativeValueScore(
  ratioToMedian:
    number
) {
  if (
    ratioToMedian <= 0.75
  ) {
    return 100;
  }

  if (
    ratioToMedian <= 1
  ) {
    return (
      100 -
      20 *
      (
        (
          ratioToMedian -
          0.75
        ) /
        0.25
      )
    );
  }

  if (
    ratioToMedian <= 1.25
  ) {
    return (
      80 -
      40 *
      (
        (
          ratioToMedian -
          1
        ) /
        0.25
      )
    );
  }

  if (
    ratioToMedian <= 1.5
  ) {
    return (
      40 -
      30 *
      (
        (
          ratioToMedian -
          1.25
        ) /
        0.25
      )
    );
  }

  return Math.max(
    0,
    10 -
    20 *
    (
      ratioToMedian -
      1.5
    )
  );
}

function createUnavailablePeerBaseline(
  assignment:
    SmartStayPeerGroupAssignmentV2,
  excludedCurrencyMismatchCount:
    number,
  excludedMissingPriceCount:
    number
): SmartStayPeerPriceBaselineV2 {
  return {
    available:
      false,

    mode:
      assignment
        .peerGroup
        .mode,

    assignedSampleSize:
      assignment
        .peerGroup
        .sampleSize,

    eligibleReferenceCount:
      0,

    excludedCurrencyMismatchCount,

    excludedMissingPriceCount,

    minimum:
      null,

    firstQuartile:
      null,

    median:
      null,

    thirdQuartile:
      null,

    maximum:
      null,

    confidence:
      0,

    referenceHotelIds:
      [],

    evidenceIds:
      uniqueSorted(
        assignment
          .peerGroup
          .evidenceIds
      ),
  };
}

function buildPeerBaseline(
  input:
    SmartStayPriceValueInputV2,
  candidatesById:
    Map<
      string,
      SmartStayPriceValueCandidateV2
    >,
  targetCurrency:
    string,
  minimumEvidenceConfidence:
    number,
  minimumPeerReferenceCount:
    number
): SmartStayPeerPriceBaselineV2 {
  const assignment =
    input.peerGroupAssignment;

  if (
    assignment.peerGroup.mode ===
      "unavailable" ||
    assignment.memberHotelIds.length ===
      0
  ) {
    return createUnavailablePeerBaseline(
      assignment,
      0,
      0
    );
  }

  const references:
    PeerReference[] = [];

  let excludedCurrencyMismatchCount =
    0;

  let excludedMissingPriceCount =
    0;

  const referenceMemberIds =
    uniqueSorted(
      assignment
        .memberHotelIds
        .filter(
          (hotelId) =>
            hotelId !==
            input.targetHotelId
        )
    );

  for (
    const hotelId
    of referenceMemberIds
  ) {
    const candidate =
      candidatesById.get(
        hotelId
      );

    if (
      !candidate ||
      !candidate
        .reliabilityGate
        .eligible
    ) {
      excludedMissingPriceCount +=
        1;

      continue;
    }

    const priceFacts =
      extractPriceFacts(
        candidate,
        minimumEvidenceConfidence
      );

    if (
      priceFacts.totalCost === null ||
      priceFacts.currency === null
    ) {
      excludedMissingPriceCount +=
        1;

      continue;
    }

    if (
      priceFacts.currency !==
      targetCurrency
    ) {
      excludedCurrencyMismatchCount +=
        1;

      continue;
    }

    const factConfidences =
      [
        priceFacts
          .costFact
          ?.confidence,

        priceFacts
          .currencyFact
          ?.confidence,
      ].filter(
        (
          confidence
        ): confidence is number =>
          typeof confidence ===
            "number"
      );

    references.push({
      hotelId,

      totalCost:
        priceFacts.totalCost,

      currency:
        priceFacts.currency,

      confidence:
        factConfidences.length > 0
          ? factConfidences.reduce(
              (
                total,
                confidence
              ) =>
                total +
                confidence,
              0
            ) /
            factConfidences.length
          : 0,

      evidenceIds:
        priceFacts.evidenceIds,
    });
  }

  if (
    references.length <
    minimumPeerReferenceCount
  ) {
    return createUnavailablePeerBaseline(
      assignment,
      excludedCurrencyMismatchCount,
      excludedMissingPriceCount
    );
  }

  const sortedReferences =
    references
      .slice()
      .sort(
        (
          firstReference,
          secondReference
        ) =>
          firstReference.totalCost -
            secondReference.totalCost ||
          firstReference.hotelId.localeCompare(
            secondReference.hotelId
          )
      );

  const sortedCosts =
    sortedReferences.map(
      (reference) =>
        reference.totalCost
    );

  const potentialReferenceCount =
    Math.max(
      referenceMemberIds.length,
      1
    );

  const referenceCoverage =
    references.length /
    potentialReferenceCount;

  const averageEvidenceConfidence =
    references.reduce(
      (
        total,
        reference
      ) =>
        total +
        reference.confidence,
      0
    ) /
    references.length;

  const confidence =
    clamp(
      assignment
        .peerGroup
        .confidence *
      referenceCoverage *
      averageEvidenceConfidence,
      0,
      1
    );

  return {
    available:
      true,

    mode:
      assignment
        .peerGroup
        .mode,

    assignedSampleSize:
      assignment
        .peerGroup
        .sampleSize,

    eligibleReferenceCount:
      references.length,

    excludedCurrencyMismatchCount,

    excludedMissingPriceCount,

    minimum:
      round(
        sortedCosts[0]
      ),

    firstQuartile:
      round(
        percentile(
          sortedCosts,
          0.25
        ) as number
      ),

    median:
      round(
        percentile(
          sortedCosts,
          0.5
        ) as number
      ),

    thirdQuartile:
      round(
        percentile(
          sortedCosts,
          0.75
        ) as number
      ),

    maximum:
      round(
        sortedCosts[
          sortedCosts.length -
          1
        ]
      ),

    confidence:
      round(
        confidence,
        4
      ),

    referenceHotelIds:
      sortedReferences.map(
        (reference) =>
          reference.hotelId
      ),

    evidenceIds:
      uniqueSorted([
        ...assignment
          .peerGroup
          .evidenceIds,

        ...references.flatMap(
          (reference) =>
            reference.evidenceIds
        ),
      ]),
  };
}

function createRelativePriceEvaluation(
  totalCost:
    number | null,
  peerBaseline:
    SmartStayPeerPriceBaselineV2,
  candidatesById:
    Map<
      string,
      SmartStayPriceValueCandidateV2
    >,
  minimumEvidenceConfidence:
    number
): SmartStayRelativePriceEvaluationV2 {
  if (
    totalCost === null ||
    !peerBaseline.available ||
    peerBaseline.median === null
  ) {
    return {
      ratioToMedian:
        null,

      savingAgainstMedian:
        null,

      savingPercentageAgainstMedian:
        null,

      pricePercentile:
        null,

      valueScore:
        null,
    };
  }

  const referenceCosts =
    peerBaseline
      .referenceHotelIds
      .map(
        (hotelId) => {
          const candidate =
            candidatesById.get(
              hotelId
            );

          if (!candidate) {
            return null;
          }

          return extractPriceFacts(
            candidate,
            minimumEvidenceConfidence
          ).totalCost;
        }
      )
      .filter(
        (
          cost
        ): cost is number =>
          cost !== null
      );

  const ratioToMedian =
    totalCost /
    peerBaseline.median;

  const savingAgainstMedian =
    peerBaseline.median -
    totalCost;

  return {
    ratioToMedian:
      round(
        ratioToMedian,
        4
      ),

    savingAgainstMedian:
      round(
        savingAgainstMedian
      ),

    savingPercentageAgainstMedian:
      round(
        (
          savingAgainstMedian /
          peerBaseline.median
        ) *
        100,
        2
      ),

    pricePercentile:
      round(
        calculatePricePercentile(
          totalCost,
          referenceCosts
        ) as number,
        2
      ),

    valueScore:
      round(
        calculateRelativeValueScore(
          ratioToMedian
        )
      ),
  };
}

function calculateCombinedScore(
  budgetFitScore:
    number | null,
  peerValueScore:
    number | null
) {
  if (
    budgetFitScore !== null &&
    peerValueScore !== null
  ) {
    return (
      budgetFitScore *
        0.6 +
      peerValueScore *
        0.4
    );
  }

  if (
    budgetFitScore !== null
  ) {
    return budgetFitScore;
  }

  if (
    peerValueScore !== null
  ) {
    return peerValueScore;
  }

  return null;
}

function calculateTargetEvidenceConfidence(
  priceFacts:
    PriceFactBundle
) {
  const weightedValues:
    {
      value:
        number;

      weight:
        number;
    }[] = [];

  if (
    priceFacts.costFact
  ) {
    weightedValues.push({
      value:
        priceFacts
          .costFact
          .confidence,

      weight:
        0.5,
    });
  }

  if (
    priceFacts.currencyFact
  ) {
    weightedValues.push({
      value:
        priceFacts
          .currencyFact
          .confidence,

      weight:
        0.2,
    });
  }

  if (
    priceFacts.completenessFact
  ) {
    weightedValues.push({
      value:
        priceFacts
          .completenessFact
          .confidence,

      weight:
        0.3,
    });
  }

  if (
    weightedValues.length === 0
  ) {
    return 0;
  }

  const totalWeight =
    weightedValues.reduce(
      (
        total,
        item
      ) =>
        total +
        item.weight,
      0
    );

  const weightedTotal =
    weightedValues.reduce(
      (
        total,
        item
      ) =>
        total +
        item.value *
        item.weight,
      0
    );

  let confidence =
    weightedTotal /
    totalWeight;

  if (
    priceFacts.completeness ===
    "reported-tax-status-unknown"
  ) {
    confidence *= 0.9;
  }
  else if (
    priceFacts.completeness ===
    "partial"
  ) {
    confidence *= 0.85;
  }
  else if (
    priceFacts.completeness !==
    "reported-complete"
  ) {
    confidence *= 0.7;
  }

  return clamp(
    confidence,
    0,
    1
  );
}

function calculateOverallConfidence(
  targetEvidenceConfidence:
    number,
  peerBaseline:
    SmartStayPeerPriceBaselineV2,
  budgetProvided:
    boolean
) {
  const components = [
    {
      value:
        targetEvidenceConfidence,

      weight:
        0.5,
    },
  ];

  if (
    peerBaseline.available
  ) {
    components.push({
      value:
        peerBaseline.confidence,

      weight:
        0.35,
    });
  }

  if (
    budgetProvided
  ) {
    components.push({
      value:
        1,

      weight:
        0.15,
    });
  }

  const totalWeight =
    components.reduce(
      (
        total,
        component
      ) =>
        total +
        component.weight,
      0
    );

  return clamp(
    components.reduce(
      (
        total,
        component
      ) =>
        total +
        component.value *
        component.weight,
      0
    ) /
    totalWeight,
    0,
    1
  );
}

function createEmptyRelativePrice():
  SmartStayRelativePriceEvaluationV2 {
  return {
    ratioToMedian:
      null,

    savingAgainstMedian:
      null,

    savingPercentageAgainstMedian:
      null,

    pricePercentile:
      null,

    valueScore:
      null,
  };
}

function createInvalidEvaluation(
  input:
    SmartStayPriceValueInputV2,
  target:
    SmartStayPriceValueCandidateV2 | null,
  budgetTotal:
    number | null,
  warningCode:
    string
): SmartStayPriceValueEvaluationV2 {
  return {
    hotelId:
      input.targetHotelId,

    status:
      "invalid",

    eligibleForPrimaryRanking:
      false,

    totalCost:
      null,

    currency:
      null,

    costCompleteness:
      null,

    budget:
      createBudgetEvaluation(
        null,
        budgetTotal
      ),

    peerBaseline:
      createUnavailablePeerBaseline(
        input.peerGroupAssignment,
        0,
        0
      ),

    relativePrice:
      createEmptyRelativePrice(),

    score:
      null,

    confidence:
      0,

    warningCodes: [
      warningCode,
    ],

    evidenceIds:
      uniqueSorted([
        ...(
          target
            ?.reliabilityGate
            .evidenceIds ??
          []
        ),

        ...input
          .peerGroupAssignment
          .peerGroup
          .evidenceIds,
      ]),
  };
}

export function evaluatePriceValueV2(
  input:
    SmartStayPriceValueInputV2,
  options:
    SmartStayPriceValueOptionsV2 = {}
): SmartStayPriceValueEvaluationV2 {
  validateCandidateIds(
    input.candidates
  );

  if (
    !input.targetHotelId.trim()
  ) {
    throw new Error(
      "Price-value evaluation requires a targetHotelId."
    );
  }

  if (
    input
      .peerGroupAssignment
      .hotelId !==
    input.targetHotelId
  ) {
    throw new Error(
      "Peer-group assignment does not match the target hotel."
    );
  }

  const budgetTotal =
    validateBudget(
      input.budgetTotal
    );

  const minimumEvidenceConfidence =
    normalizeConfidence(
      options.minimumEvidenceConfidence,
      DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE
    );

  const minimumPeerReferenceCount =
    normalizeMinimum(
      options.minimumPeerReferenceCount,
      DEFAULT_MINIMUM_PEER_REFERENCE_COUNT
    );

  const candidatesById =
    new Map<
      string,
      SmartStayPriceValueCandidateV2
    >(
      input.candidates.map(
        (candidate) => [
          candidate.hotelId,
          candidate,
        ]
      )
    );

  const target =
    candidatesById.get(
      input.targetHotelId
    ) ??
    null;

  if (!target) {
    return createInvalidEvaluation(
      input,
      null,
      budgetTotal,
      "target-candidate-not-found"
    );
  }

  if (
    target
      .reliabilityGate
      .status === "invalid"
  ) {
    return createInvalidEvaluation(
      input,
      target,
      budgetTotal,
      "target-reliability-invalid"
    );
  }

  const priceFacts =
    extractPriceFacts(
      target,
      minimumEvidenceConfidence
    );

  if (
    priceFacts.totalCost === null
  ) {
    return createInvalidEvaluation(
      input,
      target,
      budgetTotal,
      "target-comparable-cost-unavailable"
    );
  }

  if (
    priceFacts.currency === null
  ) {
    return createInvalidEvaluation(
      input,
      target,
      budgetTotal,
      "target-currency-unavailable"
    );
  }

  const peerBaseline =
    buildPeerBaseline(
      input,
      candidatesById,
      priceFacts.currency,
      minimumEvidenceConfidence,
      minimumPeerReferenceCount
    );

  const budget =
    createBudgetEvaluation(
      priceFacts.totalCost,
      budgetTotal,
      priceFacts.completeness
    );

  const relativePrice =
    createRelativePriceEvaluation(
      priceFacts.totalCost,
      peerBaseline,
      candidatesById,
      minimumEvidenceConfidence
    );

  const score =
    calculateCombinedScore(
      budget.fitScore,
      relativePrice.valueScore
    );

  const warningCodes:
    string[] = [];

  if (
    target
      .reliabilityGate
      .eligible === false
  ) {
    warningCodes.push(
      "target-not-eligible-for-primary-ranking"
    );
  }

  if (
    priceFacts.completeness !==
    "reported-complete"
  ) {
    warningCodes.push(
      priceFacts.completeness ===
        "reported-tax-status-unknown"
        ? "target-tax-status-unknown"
        : priceFacts.completeness ===
            "partial"
          ? "target-cost-partial"
          : "target-cost-completeness-unavailable"
    );
  }

  if (
    budgetTotal === null
  ) {
    warningCodes.push(
      "budget-not-provided"
    );
  }

  if (
    !peerBaseline.available
  ) {
    warningCodes.push(
      input
        .peerGroupAssignment
        .peerGroup
        .mode ===
        "unavailable"
        ? "peer-group-unavailable"
        : "peer-baseline-insufficient"
    );
  }

  if (
    peerBaseline
      .excludedCurrencyMismatchCount >
    0
  ) {
    warningCodes.push(
      "peer-currency-mismatch"
    );
  }

  if (
    peerBaseline
      .excludedMissingPriceCount >
    0
  ) {
    warningCodes.push(
      "peer-price-evidence-missing"
    );
  }

  const targetEvidenceConfidence =
    calculateTargetEvidenceConfidence(
      priceFacts
    );

  const confidence =
    calculateOverallConfidence(
      targetEvidenceConfidence,
      peerBaseline,
      budgetTotal !== null
    );

  const normalizedWarnings =
    uniqueSorted(
      warningCodes
    );

  let status:
    SmartStayPriceValueStatusV2;

  if (
    score === null
  ) {
    status =
      "unavailable";
  }
  else {
    const strongData =
      target
        .reliabilityGate
        .status === "strong-data" &&
      target
        .reliabilityGate
        .eligible === true &&
      priceFacts.completeness ===
        "reported-complete" &&
      peerBaseline.available &&
      peerBaseline.confidence >=
        0.75 &&
      budgetTotal !== null &&
      confidence >= 0.85 &&
      normalizedWarnings.length ===
        0;

    status =
      strongData
        ? "strong-data"
        : "usable";
  }

  return {
    hotelId:
      input.targetHotelId,

    status,

    eligibleForPrimaryRanking:
      target
        .reliabilityGate
        .eligible === true &&
      score !== null,

    totalCost:
      round(
        priceFacts.totalCost
      ),

    currency:
      priceFacts.currency,

    costCompleteness:
      priceFacts.completeness,

    budget,

    peerBaseline,

    relativePrice,

    score:
      score === null
        ? null
        : round(score),

    confidence:
      round(
        confidence,
        4
      ),

    warningCodes:
      normalizedWarnings,

    evidenceIds:
      uniqueSorted([
        ...priceFacts
          .evidenceIds,

        ...peerBaseline
          .evidenceIds,

        ...target
          .reliabilityGate
          .evidenceIds,
      ]),
  };
}
