import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
  SmartStayReliabilityGateStatus,
} from "../model/smartStayEvaluationV2";

export interface SmartStayReliabilityGateInputV2 {
  evidence:
    SmartStayEvidenceFactV2[];
}

export interface SmartStayReliabilityGateOptionsV2 {
  minimumCriticalConfidence?:
    number;

  strongCriticalConfidence?:
    number;
}

type GateAccumulator = {
  blockingReasonCodes:
    string[];

  criticalWarningCodes:
    string[];

  supportingWarningCodes:
    string[];

  evidenceIds:
    string[];
};

const DEFAULT_MINIMUM_CRITICAL_CONFIDENCE =
  0.6;

const DEFAULT_STRONG_CRITICAL_CONFIDENCE =
  0.9;

const CRITICAL_FIELD_CODES = [
  "stay.cost.total",
  "stay.currency",
  "offer.count",
  "offer.bookable",
] as const;

const SUPPORTING_FIELD_CODES = [
  "stay.cost.completeness",
  "location.distance",
  "location.coordinates",
  "review.score",
  "review.count",
  "offer.cancellation",
] as const;

function clampConfidence(
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

  return Math.min(
    Math.max(
      value,
      0
    ),
    1
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

function getFactsByCode(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string
) {
  return evidence.filter(
    (fact) =>
      fact.code === code
  );
}

function getKnownFact(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string
) {
  return getFactsByCode(
    evidence,
    code
  )
    .filter(
      (fact) =>
        fact.availability ===
        "known"
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

function addEvidenceIds(
  accumulator:
    GateAccumulator,
  facts:
    SmartStayEvidenceFactV2[]
) {
  accumulator.evidenceIds.push(
    ...facts.map(
      (fact) =>
        fact.id
    )
  );
}

function hasConflict(
  facts:
    SmartStayEvidenceFactV2[]
) {
  return facts.some(
    (fact) =>
      fact.availability ===
      "conflicting"
  );
}

function hasBlockingUnavailableFact(
  facts:
    SmartStayEvidenceFactV2[]
) {
  return facts.some(
    (fact) =>
      fact.severity === "blocking" &&
      fact.availability !== "known"
  );
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

function isPositiveInteger(
  value:
    unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function evaluateComparableCost(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator,
  minimumConfidence:
    number
) {
  const facts =
    getFactsByCode(
      evidence,
      "stay.cost.total"
    );

  addEvidenceIds(
    accumulator,
    facts
  );

  if (hasConflict(facts)) {
    accumulator.blockingReasonCodes.push(
      "comparable-cost-conflicting"
    );

    return;
  }

  const knownFact =
    getKnownFact(
      evidence,
      "stay.cost.total"
    );

  if (!knownFact) {
    if (
      hasBlockingUnavailableFact(
        facts
      )
    ) {
      accumulator.blockingReasonCodes.push(
        "comparable-cost-unavailable"
      );
    } else {
      accumulator.criticalWarningCodes.push(
        "comparable-cost-unverified"
      );
    }

    return;
  }

  if (
    !isPositiveFiniteNumber(
      knownFact.value
    )
  ) {
    accumulator.blockingReasonCodes.push(
      "comparable-cost-invalid"
    );

    return;
  }

  if (
    knownFact.confidence <
    minimumConfidence
  ) {
    accumulator.criticalWarningCodes.push(
      "comparable-cost-low-confidence"
    );
  }
}

function evaluateCurrency(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator,
  minimumConfidence:
    number
) {
  const facts =
    getFactsByCode(
      evidence,
      "stay.currency"
    );

  addEvidenceIds(
    accumulator,
    facts
  );

  if (hasConflict(facts)) {
    accumulator.blockingReasonCodes.push(
      "currency-conflicting"
    );

    return;
  }

  const knownFact =
    getKnownFact(
      evidence,
      "stay.currency"
    );

  if (!knownFact) {
    if (
      hasBlockingUnavailableFact(
        facts
      )
    ) {
      accumulator.blockingReasonCodes.push(
        "currency-unavailable"
      );
    } else {
      accumulator.criticalWarningCodes.push(
        "currency-unverified"
      );
    }

    return;
  }

  if (
    typeof knownFact.value !== "string" ||
    !/^[A-Z]{3}$/.test(
      knownFact.value
    )
  ) {
    accumulator.blockingReasonCodes.push(
      "currency-invalid"
    );

    return;
  }

  if (
    knownFact.confidence <
    minimumConfidence
  ) {
    accumulator.criticalWarningCodes.push(
      "currency-low-confidence"
    );
  }
}

function evaluateOfferCount(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator,
  minimumConfidence:
    number
) {
  const facts =
    getFactsByCode(
      evidence,
      "offer.count"
    );

  addEvidenceIds(
    accumulator,
    facts
  );

  if (hasConflict(facts)) {
    accumulator.blockingReasonCodes.push(
      "offer-count-conflicting"
    );

    return;
  }

  const knownFact =
    getKnownFact(
      evidence,
      "offer.count"
    );

  if (!knownFact) {
    if (
      hasBlockingUnavailableFact(
        facts
      )
    ) {
      accumulator.blockingReasonCodes.push(
        "offers-unavailable"
      );
    } else {
      accumulator.criticalWarningCodes.push(
        "offer-count-unverified"
      );
    }

    return;
  }

  if (
    !isPositiveInteger(
      knownFact.value
    )
  ) {
    accumulator.blockingReasonCodes.push(
      "no-valid-offers"
    );

    return;
  }

  if (
    knownFact.confidence <
    minimumConfidence
  ) {
    accumulator.criticalWarningCodes.push(
      "offer-count-low-confidence"
    );
  }
}

function evaluateBookability(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator,
  minimumConfidence:
    number
) {
  const facts =
    getFactsByCode(
      evidence,
      "offer.bookable"
    );

  addEvidenceIds(
    accumulator,
    facts
  );

  if (hasConflict(facts)) {
    accumulator.blockingReasonCodes.push(
      "bookability-conflicting"
    );

    return;
  }

  const knownFact =
    getKnownFact(
      evidence,
      "offer.bookable"
    );

  if (!knownFact) {
    accumulator.criticalWarningCodes.push(
      "bookability-unverified"
    );

    return;
  }

  if (
    typeof knownFact.value !==
    "boolean"
  ) {
    accumulator.blockingReasonCodes.push(
      "bookability-invalid"
    );

    return;
  }

  if (knownFact.value === false) {
    accumulator.blockingReasonCodes.push(
      "no-bookable-offer"
    );

    return;
  }

  if (
    knownFact.confidence <
    minimumConfidence
  ) {
    accumulator.criticalWarningCodes.push(
      "bookability-low-confidence"
    );
  }
}

function evaluateCostCompleteness(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator
) {
  const facts =
    getFactsByCode(
      evidence,
      "stay.cost.completeness"
    );

  addEvidenceIds(
    accumulator,
    facts
  );

  if (hasConflict(facts)) {
    accumulator.supportingWarningCodes.push(
      "cost-completeness-conflicting"
    );

    return false;
  }

  const knownFact =
    getKnownFact(
      evidence,
      "stay.cost.completeness"
    );

  if (!knownFact) {
    accumulator.supportingWarningCodes.push(
      "cost-completeness-unavailable"
    );

    return false;
  }

  if (
    knownFact.value ===
    "reported-complete"
  ) {
    return true;
  }

  if (
    knownFact.value ===
    "reported-tax-status-unknown"
  ) {
    accumulator.supportingWarningCodes.push(
      "cost-tax-status-unknown"
    );

    return false;
  }

  if (
    knownFact.value ===
    "partial"
  ) {
    accumulator.supportingWarningCodes.push(
      "cost-partially-known"
    );

    return false;
  }

  accumulator.supportingWarningCodes.push(
    "cost-not-reported-complete"
  );

  return false;
}

function evaluateLocationEvidence(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator
) {
  const distanceFacts =
    getFactsByCode(
      evidence,
      "location.distance"
    );

  const coordinateFacts =
    getFactsByCode(
      evidence,
      "location.coordinates"
    );

  addEvidenceIds(
    accumulator,
    [
      ...distanceFacts,
      ...coordinateFacts,
    ]
  );

  if (
    hasConflict(distanceFacts) ||
    hasConflict(coordinateFacts)
  ) {
    accumulator.supportingWarningCodes.push(
      "location-evidence-conflicting"
    );
  }

  const distanceFact =
    getKnownFact(
      evidence,
      "location.distance"
    );

  const coordinatesFact =
    getKnownFact(
      evidence,
      "location.coordinates"
    );

  const hasReliableDistance =
    Boolean(
      distanceFact &&
      typeof distanceFact.value ===
        "number" &&
      Number.isFinite(
        distanceFact.value
      ) &&
      distanceFact.value >= 0 &&
      distanceFact.confidence >= 0.8
    );

  const hasReliableCoordinates =
    Boolean(
      coordinatesFact &&
      typeof coordinatesFact.value ===
        "string" &&
      coordinatesFact.value.includes(
        ","
      ) &&
      coordinatesFact.confidence >= 0.8
    );

  if (
    !hasReliableDistance &&
    !hasReliableCoordinates
  ) {
    accumulator.supportingWarningCodes.push(
      "location-evidence-limited"
    );

    return false;
  }

  return true;
}

function evaluateReviewEvidence(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator
) {
  const scoreFacts =
    getFactsByCode(
      evidence,
      "review.score"
    );

  const countFacts =
    getFactsByCode(
      evidence,
      "review.count"
    );

  addEvidenceIds(
    accumulator,
    [
      ...scoreFacts,
      ...countFacts,
    ]
  );

  if (
    hasConflict(scoreFacts) ||
    hasConflict(countFacts)
  ) {
    accumulator.supportingWarningCodes.push(
      "review-evidence-conflicting"
    );

    return false;
  }

  const scoreFact =
    getKnownFact(
      evidence,
      "review.score"
    );

  const countFact =
    getKnownFact(
      evidence,
      "review.count"
    );

  const scoreReliable =
    Boolean(
      scoreFact &&
      typeof scoreFact.value ===
        "number" &&
      Number.isFinite(
        scoreFact.value
      ) &&
      scoreFact.value >= 0 &&
      scoreFact.value <= 10 &&
      scoreFact.confidence >= 0.8
    );

  const countReliable =
    Boolean(
      countFact &&
      typeof countFact.value ===
        "number" &&
      Number.isFinite(
        countFact.value
      ) &&
      countFact.value >= 0 &&
      countFact.confidence >= 0.8
    );

  if (
    !scoreReliable ||
    !countReliable
  ) {
    accumulator.supportingWarningCodes.push(
      "review-evidence-limited"
    );

    return false;
  }

  return true;
}

function evaluateCancellationEvidence(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator
) {
  const facts =
    getFactsByCode(
      evidence,
      "offer.cancellation"
    );

  addEvidenceIds(
    accumulator,
    facts
  );

  if (hasConflict(facts)) {
    accumulator.supportingWarningCodes.push(
      "cancellation-evidence-conflicting"
    );

    return false;
  }

  const knownFact =
    getKnownFact(
      evidence,
      "offer.cancellation"
    );

  if (
    !knownFact ||
    knownFact.confidence < 0.8
  ) {
    accumulator.supportingWarningCodes.push(
      "cancellation-policy-limited"
    );

    return false;
  }

  return true;
}

function collectOtherConflicts(
  evidence:
    SmartStayEvidenceFactV2[],
  accumulator:
    GateAccumulator
) {
  const alreadyHandledCodes =
    new Set<string>([
      ...CRITICAL_FIELD_CODES,
      ...SUPPORTING_FIELD_CODES,
    ]);

  const otherConflictingFacts =
    evidence.filter(
      (fact) =>
        fact.availability ===
          "conflicting" &&
        !alreadyHandledCodes.has(
          fact.code
        )
    );

  if (
    otherConflictingFacts.length === 0
  ) {
    return;
  }

  addEvidenceIds(
    accumulator,
    otherConflictingFacts
  );

  accumulator.supportingWarningCodes.push(
    "non-critical-evidence-conflicts"
  );
}

function criticalFactsMeetStrongThreshold(
  evidence:
    SmartStayEvidenceFactV2[],
  threshold:
    number
) {
  return CRITICAL_FIELD_CODES.every(
    (code) => {
      const knownFact =
        getKnownFact(
          evidence,
          code
        );

      return Boolean(
        knownFact &&
        knownFact.confidence >=
          threshold
      );
    }
  );
}

function createGateResult(
  status:
    SmartStayReliabilityGateStatus,
  eligible:
    boolean,
  accumulator:
    GateAccumulator
): SmartStayReliabilityGateV2 {
  return {
    status,

    eligible,

    blockingReasonCodes:
      uniqueSorted(
        accumulator.blockingReasonCodes
      ),

    warningCodes:
      uniqueSorted([
        ...accumulator
          .criticalWarningCodes,

        ...accumulator
          .supportingWarningCodes,
      ]),

    evidenceIds:
      uniqueSorted(
        accumulator.evidenceIds
      ),
  };
}

export function evaluateReliabilityGateV2(
  input:
    SmartStayReliabilityGateInputV2,
  options:
    SmartStayReliabilityGateOptionsV2 = {}
): SmartStayReliabilityGateV2 {
  const evidence =
    input.evidence;

  const minimumCriticalConfidence =
    clampConfidence(
      options.minimumCriticalConfidence,
      DEFAULT_MINIMUM_CRITICAL_CONFIDENCE
    );

  const strongCriticalConfidence =
    Math.max(
      minimumCriticalConfidence,
      clampConfidence(
        options.strongCriticalConfidence,
        DEFAULT_STRONG_CRITICAL_CONFIDENCE
      )
    );

  const accumulator:
    GateAccumulator = {
      blockingReasonCodes: [],
      criticalWarningCodes: [],
      supportingWarningCodes: [],
      evidenceIds: [],
    };

  evaluateComparableCost(
    evidence,
    accumulator,
    minimumCriticalConfidence
  );

  evaluateCurrency(
    evidence,
    accumulator,
    minimumCriticalConfidence
  );

  evaluateOfferCount(
    evidence,
    accumulator,
    minimumCriticalConfidence
  );

  evaluateBookability(
    evidence,
    accumulator,
    minimumCriticalConfidence
  );

  if (
    accumulator
      .blockingReasonCodes
      .length > 0
  ) {
    return createGateResult(
      "invalid",
      false,
      accumulator
    );
  }

  if (
    accumulator
      .criticalWarningCodes
      .length > 0
  ) {
    return createGateResult(
      "low-confidence",
      false,
      accumulator
    );
  }

  const completeCost =
    evaluateCostCompleteness(
      evidence,
      accumulator
    );

  const reliableLocation =
    evaluateLocationEvidence(
      evidence,
      accumulator
    );

  const reliableReviews =
    evaluateReviewEvidence(
      evidence,
      accumulator
    );

  const reliableCancellation =
    evaluateCancellationEvidence(
      evidence,
      accumulator
    );

  collectOtherConflicts(
    evidence,
    accumulator
  );

  const strongCriticalFacts =
    criticalFactsMeetStrongThreshold(
      evidence,
      strongCriticalConfidence
    );

  const strongData =
    strongCriticalFacts &&
    completeCost &&
    reliableLocation &&
    reliableReviews &&
    reliableCancellation &&
    accumulator
      .supportingWarningCodes
      .length === 0;

  return createGateResult(
    strongData
      ? "strong-data"
      : "usable",
    true,
    accumulator
  );
}
