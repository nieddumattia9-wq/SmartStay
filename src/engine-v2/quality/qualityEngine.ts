import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayPeerGroupAssignmentV2,
} from "../peer-groups/peerGroupModel";

export type SmartStayQualityStatusV2 =
  | "invalid"
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayReviewPriorSourceV2 =
  | "peer-group"
  | "system-default";

export interface SmartStayQualityCandidateV2 {
  hotelId:
    string;

  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;
}

export interface SmartStayQualityOptionsV2 {
  minimumEvidenceConfidence?:
    number;

  minimumPeerReferenceCount?:
    number;

  priorReviewWeight?:
    number;

  defaultPriorReviewScore?:
    number;

  minimumStrongReviewCount?:
    number;

  starsWeight?:
    number;
}

export interface SmartStayReviewPriorV2 {
  source:
    SmartStayReviewPriorSourceV2;

  score:
    number;

  referenceCount:
    number;

  totalReviewCount:
    number;

  confidence:
    number;

  referenceHotelIds:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayReviewQualityV2 {
  rawScore:
    number | null;

  reviewCount:
    number | null;

  correctedScore:
    number | null;

  normalizedScore:
    number | null;

  priorWeight:
    number;

  prior:
    SmartStayReviewPriorV2;
}

export interface SmartStayStarQualityV2 {
  available:
    boolean;

  stars:
    number | null;

  normalizedScore:
    number | null;

  confidence:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayQualityEvaluationV2 {
  hotelId:
    string;

  status:
    SmartStayQualityStatusV2;

  eligibleForPrimaryRanking:
    boolean;

  reviewQuality:
    SmartStayReviewQualityV2;

  starQuality:
    SmartStayStarQualityV2;

  score:
    number | null;

  confidence:
    number;

  warningCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayQualityInputV2 {
  targetHotelId:
    string;

  candidates:
    SmartStayQualityCandidateV2[];

  peerGroupAssignment:
    SmartStayPeerGroupAssignmentV2;
}

type ReviewFacts = {
  scoreFact:
    SmartStayEvidenceFactV2 | null;

  countFact:
    SmartStayEvidenceFactV2 | null;

  rawScore:
    number | null;

  reviewCount:
    number | null;

  evidenceIds:
    string[];
};

type StarFacts = {
  fact:
    SmartStayEvidenceFactV2 | null;

  stars:
    number | null;

  evidenceIds:
    string[];
};

type ReviewReference = {
  hotelId:
    string;

  score:
    number;

  reviewCount:
    number;

  weight:
    number;

  confidence:
    number;

  evidenceIds:
    string[];
};

const DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE =
  0.6;

const DEFAULT_MINIMUM_PEER_REFERENCE_COUNT =
  2;

const DEFAULT_PRIOR_REVIEW_WEIGHT =
  40;

const DEFAULT_PRIOR_REVIEW_SCORE =
  7.5;

const DEFAULT_MINIMUM_STRONG_REVIEW_COUNT =
  50;

const DEFAULT_STARS_WEIGHT =
  0.15;

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

function normalizePositiveNumber(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

function normalizePositiveInteger(
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

function normalizeReviewScore(
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
    10
  );
}

function isValidReviewScore(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10
  );
}

function isValidReviewCount(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isValidStars(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 5
  );
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

function extractReviewFacts(
  candidate:
    SmartStayQualityCandidateV2,
  minimumEvidenceConfidence:
    number
): ReviewFacts {
  const scoreFact =
    getKnownFact(
      candidate.evidence,
      "review.score",
      minimumEvidenceConfidence
    );

  const countFact =
    getKnownFact(
      candidate.evidence,
      "review.count",
      minimumEvidenceConfidence
    );

  const rawScore =
    scoreFact &&
    isValidReviewScore(
      scoreFact.value
    )
      ? scoreFact.value
      : null;

  const reviewCount =
    countFact &&
    isValidReviewCount(
      countFact.value
    )
      ? countFact.value
      : null;

  return {
    scoreFact,

    countFact,

    rawScore,

    reviewCount,

    evidenceIds:
      uniqueSorted(
        [
          scoreFact?.id,
          countFact?.id,
        ].filter(
          (
            evidenceId
          ): evidenceId is string =>
            Boolean(
              evidenceId
            )
        )
      ),
  };
}

function extractStarFacts(
  candidate:
    SmartStayQualityCandidateV2,
  minimumEvidenceConfidence:
    number
): StarFacts {
  const fact =
    getKnownFact(
      candidate.evidence,
      "property.stars",
      minimumEvidenceConfidence
    );

  const stars =
    fact &&
    isValidStars(
      fact.value
    )
      ? fact.value
      : null;

  return {
    fact,

    stars,

    evidenceIds:
      fact
        ? [
            fact.id,
          ]
        : [],
  };
}

function validateCandidateIds(
  candidates:
    SmartStayQualityCandidateV2[]
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
        "Quality candidate requires a hotelId."
      );
    }

    if (
      candidateIds.has(
        hotelId
      )
    ) {
      throw new Error(
        `Duplicate quality candidate: ${hotelId}`
      );
    }

    candidateIds.add(
      hotelId
    );
  }
}

function isEligiblePeerReference(
  candidate:
    SmartStayQualityCandidateV2
) {
  return (
    candidate
      .reliabilityGate
      .eligible === true &&
    (
      candidate
        .reliabilityGate
        .status === "usable" ||
      candidate
        .reliabilityGate
        .status === "strong-data"
    )
  );
}

function calculateReviewReferenceWeight(
  reviewCount:
    number
) {
  return Math.min(
    Math.sqrt(
      Math.max(
        reviewCount,
        1
      )
    ),
    30
  );
}

function createReviewReferences(
  input:
    SmartStayQualityInputV2,
  candidatesById:
    Map<
      string,
      SmartStayQualityCandidateV2
    >,
  minimumEvidenceConfidence:
    number
) {
  const references:
    ReviewReference[] = [];

  const peerHotelIds =
    uniqueSorted(
      input
        .peerGroupAssignment
        .memberHotelIds
        .filter(
          (hotelId) =>
            hotelId !==
            input.targetHotelId
        )
    );

  for (
    const hotelId
    of peerHotelIds
  ) {
    const candidate =
      candidatesById.get(
        hotelId
      );

    if (
      !candidate ||
      !isEligiblePeerReference(
        candidate
      )
    ) {
      continue;
    }

    const reviewFacts =
      extractReviewFacts(
        candidate,
        minimumEvidenceConfidence
      );

    if (
      reviewFacts.rawScore === null ||
      reviewFacts.reviewCount === null ||
      reviewFacts.reviewCount <= 0
    ) {
      continue;
    }

    const confidenceValues =
      [
        reviewFacts
          .scoreFact
          ?.confidence,

        reviewFacts
          .countFact
          ?.confidence,
      ].filter(
        (
          confidence
        ): confidence is number =>
          typeof confidence ===
            "number"
      );

    const confidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce(
            (
              total,
              current
            ) =>
              total +
              current,
            0
          ) /
          confidenceValues.length
        : 0;

    references.push({
      hotelId,

      score:
        reviewFacts.rawScore,

      reviewCount:
        reviewFacts.reviewCount,

      weight:
        calculateReviewReferenceWeight(
          reviewFacts.reviewCount
        ),

      confidence,

      evidenceIds:
        reviewFacts.evidenceIds,
    });
  }

  return references.sort(
    (
      firstReference,
      secondReference
    ) =>
      firstReference
        .hotelId
        .localeCompare(
          secondReference
            .hotelId
        )
  );
}

function calculatePeerPriorConfidence(
  references:
    ReviewReference[],
  assignment:
    SmartStayPeerGroupAssignmentV2,
  minimumPeerReferenceCount:
    number
) {
  if (
    references.length === 0
  ) {
    return 0;
  }

  const referenceStrength =
    Math.min(
      references.length /
      Math.max(
        minimumPeerReferenceCount,
        1
      ),
      1
    );

  const reviewVolume =
    references.reduce(
      (
        total,
        reference
      ) =>
        total +
        reference.reviewCount,
      0
    );

  const volumeStrength =
    Math.min(
      Math.log10(
        reviewVolume +
        1
      ) /
      3,
      1
    );

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

  return clamp(
    assignment
      .peerGroup
      .confidence *
      0.4 +
    referenceStrength *
      0.2 +
    volumeStrength *
      0.15 +
    averageEvidenceConfidence *
      0.25,
    0,
    1
  );
}

function createReviewPrior(
  input:
    SmartStayQualityInputV2,
  candidatesById:
    Map<
      string,
      SmartStayQualityCandidateV2
    >,
  minimumEvidenceConfidence:
    number,
  minimumPeerReferenceCount:
    number,
  defaultPriorReviewScore:
    number
): SmartStayReviewPriorV2 {
  const references =
    createReviewReferences(
      input,
      candidatesById,
      minimumEvidenceConfidence
    );

  if (
    references.length <
    minimumPeerReferenceCount
  ) {
    return {
      source:
        "system-default",

      score:
        round(
          defaultPriorReviewScore,
          4
        ),

      referenceCount:
        references.length,

      totalReviewCount:
        references.reduce(
          (
            total,
            reference
          ) =>
            total +
            reference.reviewCount,
          0
        ),

      confidence:
        references.length > 0
          ? 0.3
          : 0.2,

      referenceHotelIds:
        references.map(
          (reference) =>
            reference.hotelId
        ),

      evidenceIds:
        uniqueSorted([
          ...input
            .peerGroupAssignment
            .peerGroup
            .evidenceIds,

          ...references.flatMap(
            (reference) =>
              reference.evidenceIds
          ),
        ]),
    };
  }

  const totalWeight =
    references.reduce(
      (
        total,
        reference
      ) =>
        total +
        reference.weight,
      0
    );

  const weightedScore =
    references.reduce(
      (
        total,
        reference
      ) =>
        total +
        reference.score *
        reference.weight,
      0
    ) /
    totalWeight;

  return {
    source:
      "peer-group",

    score:
      round(
        weightedScore,
        4
      ),

    referenceCount:
      references.length,

    totalReviewCount:
      references.reduce(
        (
          total,
          reference
        ) =>
          total +
          reference.reviewCount,
        0
      ),

    confidence:
      round(
        calculatePeerPriorConfidence(
          references,
          input.peerGroupAssignment,
          minimumPeerReferenceCount
        ),
        4
      ),

    referenceHotelIds:
      references.map(
        (reference) =>
          reference.hotelId
      ),

    evidenceIds:
      uniqueSorted([
        ...input
          .peerGroupAssignment
          .peerGroup
          .evidenceIds,

        ...references.flatMap(
          (reference) =>
            reference.evidenceIds
        ),
      ]),
  };
}

function calculateBayesianReviewScore(
  rawScore:
    number,
  reviewCount:
    number,
  priorScore:
    number,
  priorWeight:
    number
) {
  return (
    (
      reviewCount *
      rawScore
    ) +
    (
      priorWeight *
      priorScore
    )
  ) /
  (
    reviewCount +
    priorWeight
  );
}

function createReviewQuality(
  reviewFacts:
    ReviewFacts,
  prior:
    SmartStayReviewPriorV2,
  priorWeight:
    number
): SmartStayReviewQualityV2 {
  if (
    reviewFacts.rawScore === null ||
    reviewFacts.reviewCount === null ||
    reviewFacts.reviewCount <= 0
  ) {
    return {
      rawScore:
        reviewFacts.rawScore,

      reviewCount:
        reviewFacts.reviewCount,

      correctedScore:
        null,

      normalizedScore:
        null,

      priorWeight:
        round(
          priorWeight,
          2
        ),

      prior,
    };
  }

  const correctedScore =
    calculateBayesianReviewScore(
      reviewFacts.rawScore,
      reviewFacts.reviewCount,
      prior.score,
      priorWeight
    );

  return {
    rawScore:
      round(
        reviewFacts.rawScore,
        2
      ),

    reviewCount:
      reviewFacts.reviewCount,

    correctedScore:
      round(
        correctedScore,
        4
      ),

    normalizedScore:
      round(
        correctedScore *
        10
      ),

    priorWeight:
      round(
        priorWeight,
        2
      ),

    prior,
  };
}

function createStarQuality(
  starFacts:
    StarFacts
): SmartStayStarQualityV2 {
  if (
    starFacts.stars === null ||
    !starFacts.fact
  ) {
    return {
      available:
        false,

      stars:
        null,

      normalizedScore:
        null,

      confidence:
        0,

      evidenceIds:
        [],
    };
  }

  return {
    available:
      true,

    stars:
      round(
        starFacts.stars,
        1
      ),

    normalizedScore:
      round(
        (
          starFacts.stars /
          5
        ) *
        100
      ),

    confidence:
      round(
        starFacts
          .fact
          .confidence,
        4
      ),

    evidenceIds:
      starFacts.evidenceIds,
  };
}

function calculateCombinedQualityScore(
  reviewScore:
    number | null,
  starScore:
    number | null,
  starsWeight:
    number
) {
  if (
    reviewScore !== null &&
    starScore !== null
  ) {
    return (
      reviewScore *
      (
        1 -
        starsWeight
      ) +
      starScore *
      starsWeight
    );
  }

  if (
    reviewScore !== null
  ) {
    return reviewScore;
  }

  if (
    starScore !== null
  ) {
    return starScore;
  }

  return null;
}

function calculateTargetEvidenceConfidence(
  reviewFacts:
    ReviewFacts,
  starFacts:
    StarFacts
) {
  const weightedValues:
    {
      value:
        number;

      weight:
        number;
    }[] = [];

  if (
    reviewFacts.scoreFact
  ) {
    weightedValues.push({
      value:
        reviewFacts
          .scoreFact
          .confidence,

      weight:
        0.4,
    });
  }

  if (
    reviewFacts.countFact
  ) {
    weightedValues.push({
      value:
        reviewFacts
          .countFact
          .confidence,

      weight:
        0.4,
    });
  }

  if (
    starFacts.fact
  ) {
    weightedValues.push({
      value:
        starFacts
          .fact
          .confidence,

      weight:
        0.2,
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
        current
      ) =>
        total +
        current.weight,
      0
    );

  return clamp(
    weightedValues.reduce(
      (
        total,
        current
      ) =>
        total +
        current.value *
        current.weight,
      0
    ) /
    totalWeight,
    0,
    1
  );
}

function getGateConfidence(
  gate:
    SmartStayReliabilityGateV2
) {
  if (
    gate.status ===
    "strong-data"
  ) {
    return 1;
  }

  if (
    gate.status ===
    "usable"
  ) {
    return 0.82;
  }

  if (
    gate.status ===
    "low-confidence"
  ) {
    return 0.4;
  }

  return 0;
}

function calculateOverallConfidence(
  targetEvidenceConfidence:
    number,
  prior:
    SmartStayReviewPriorV2,
  gate:
    SmartStayReliabilityGateV2,
  reviewAvailable:
    boolean,
  starsAvailable:
    boolean
) {
  const components:
    {
      value:
        number;

      weight:
        number;
    }[] = [
      {
        value:
          targetEvidenceConfidence,

        weight:
          0.55,
      },

      {
        value:
          getGateConfidence(
            gate
          ),

        weight:
          0.15,
      },
    ];

  if (reviewAvailable) {
    components.push({
      value:
        prior.confidence,

      weight:
        0.3,
    });
  }
  else if (starsAvailable) {
    components.push({
      value:
        0.45,

      weight:
        0.3,
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

function createInvalidEvaluation(
  input:
    SmartStayQualityInputV2,
  warningCode:
    string,
  evidenceIds:
    string[]
): SmartStayQualityEvaluationV2 {
  const emptyPrior:
    SmartStayReviewPriorV2 = {
      source:
        "system-default",

      score:
        DEFAULT_PRIOR_REVIEW_SCORE,

      referenceCount:
        0,

      totalReviewCount:
        0,

      confidence:
        0,

      referenceHotelIds:
        [],

      evidenceIds:
        [],
    };

  return {
    hotelId:
      input.targetHotelId,

    status:
      "invalid",

    eligibleForPrimaryRanking:
      false,

    reviewQuality: {
      rawScore:
        null,

      reviewCount:
        null,

      correctedScore:
        null,

      normalizedScore:
        null,

      priorWeight:
        DEFAULT_PRIOR_REVIEW_WEIGHT,

      prior:
        emptyPrior,
    },

    starQuality: {
      available:
        false,

      stars:
        null,

      normalizedScore:
        null,

      confidence:
        0,

      evidenceIds:
        [],
    },

    score:
      null,

    confidence:
      0,

    warningCodes: [
      warningCode,
    ],

    evidenceIds:
      uniqueSorted(
        evidenceIds
      ),
  };
}

export function evaluateQualityV2(
  input:
    SmartStayQualityInputV2,
  options:
    SmartStayQualityOptionsV2 = {}
): SmartStayQualityEvaluationV2 {
  validateCandidateIds(
    input.candidates
  );

  if (
    !input.targetHotelId.trim()
  ) {
    throw new Error(
      "Quality evaluation requires a targetHotelId."
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

  const candidatesById =
    new Map<
      string,
      SmartStayQualityCandidateV2
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
      "target-candidate-not-found",
      input
        .peerGroupAssignment
        .peerGroup
        .evidenceIds
    );
  }

  if (
    target
      .reliabilityGate
      .status === "invalid"
  ) {
    return createInvalidEvaluation(
      input,
      "target-reliability-invalid",
      [
        ...target
          .reliabilityGate
          .evidenceIds,

        ...input
          .peerGroupAssignment
          .peerGroup
          .evidenceIds,
      ]
    );
  }

  const minimumEvidenceConfidence =
    normalizeConfidence(
      options.minimumEvidenceConfidence,
      DEFAULT_MINIMUM_EVIDENCE_CONFIDENCE
    );

  const minimumPeerReferenceCount =
    normalizePositiveInteger(
      options.minimumPeerReferenceCount,
      DEFAULT_MINIMUM_PEER_REFERENCE_COUNT
    );

  const priorReviewWeight =
    normalizePositiveNumber(
      options.priorReviewWeight,
      DEFAULT_PRIOR_REVIEW_WEIGHT
    );

  const defaultPriorReviewScore =
    normalizeReviewScore(
      options.defaultPriorReviewScore,
      DEFAULT_PRIOR_REVIEW_SCORE
    );

  const minimumStrongReviewCount =
    normalizePositiveInteger(
      options.minimumStrongReviewCount,
      DEFAULT_MINIMUM_STRONG_REVIEW_COUNT
    );

  const starsWeight =
    clamp(
      normalizeConfidence(
        options.starsWeight,
        DEFAULT_STARS_WEIGHT
      ),
      0,
      0.35
    );

  const reviewFacts =
    extractReviewFacts(
      target,
      minimumEvidenceConfidence
    );

  const starFacts =
    extractStarFacts(
      target,
      minimumEvidenceConfidence
    );

  const prior =
    createReviewPrior(
      input,
      candidatesById,
      minimumEvidenceConfidence,
      minimumPeerReferenceCount,
      defaultPriorReviewScore
    );

  const reviewQuality =
    createReviewQuality(
      reviewFacts,
      prior,
      priorReviewWeight
    );

  const starQuality =
    createStarQuality(
      starFacts
    );

  const score =
    calculateCombinedQualityScore(
      reviewQuality.normalizedScore,
      starQuality.normalizedScore,
      starsWeight
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
    reviewFacts.rawScore === null
  ) {
    warningCodes.push(
      "review-score-unavailable"
    );
  }

  if (
    reviewFacts.reviewCount === null
  ) {
    warningCodes.push(
      "review-count-unavailable"
    );
  }
  else if (
    reviewFacts.reviewCount === 0
  ) {
    warningCodes.push(
      "review-count-zero"
    );
  }

  if (
    prior.source ===
    "system-default"
  ) {
    warningCodes.push(
      "peer-review-prior-insufficient"
    );
  }

  if (
    reviewQuality
      .normalizedScore === null &&
    starQuality.available
  ) {
    warningCodes.push(
      "quality-based-on-stars-only"
    );
  }

  if (
    score === null
  ) {
    warningCodes.push(
      "quality-evidence-unavailable"
    );
  }

  const targetEvidenceConfidence =
    calculateTargetEvidenceConfidence(
      reviewFacts,
      starFacts
    );

  const confidence =
    calculateOverallConfidence(
      targetEvidenceConfidence,
      prior,
      target.reliabilityGate,
      reviewQuality
        .normalizedScore !== null,
      starQuality.available
    );

  const normalizedWarnings =
    uniqueSorted(
      warningCodes
    );

  let status:
    SmartStayQualityStatusV2;

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
      reviewQuality
        .normalizedScore !== null &&
      (
        reviewQuality.reviewCount ??
        0
      ) >=
        minimumStrongReviewCount &&
      prior.source ===
        "peer-group" &&
      prior.confidence >=
        0.75 &&
      confidence >=
        0.85 &&
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

    reviewQuality,

    starQuality,

    score:
      score === null
        ? null
        : round(
            score
          ),

    confidence:
      round(
        confidence,
        4
      ),

    warningCodes:
      normalizedWarnings,

    evidenceIds:
      uniqueSorted([
        ...reviewFacts
          .evidenceIds,

        ...starFacts
          .evidenceIds,

        ...prior
          .evidenceIds,

        ...target
          .reliabilityGate
          .evidenceIds,
      ]),
  };
}
