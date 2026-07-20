import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
  SmartStayRiskAssessmentV2,
  SmartStayRiskLevelV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayComfortFlexibilityEvaluationV2,
} from "../comfort/comfortFlexibilityEngine";

import type {
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayQualityEvaluationV2,
} from "../quality/qualityEngine";

import {
  SMARTSTAY_DATA_CONFIDENCE_CRITICAL_FIELDS,
  type SmartStayDataConfidenceEvaluationV2,
} from "./dataConfidenceEngine";

export interface SmartStayRiskInputV2 {
  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;

  dataConfidence:
    SmartStayDataConfidenceEvaluationV2;

  priceValue?:
    SmartStayPriceValueEvaluationV2;

  quality?:
    SmartStayQualityEvaluationV2;

  location?:
    SmartStayLocationEvaluationV2;

  comfortFlexibility?:
    SmartStayComfortFlexibilityEvaluationV2;
}

export interface SmartStayRiskOptionsV2 {
  mediumThreshold?:
    number;

  highThreshold?:
    number;
}

export interface SmartStayRiskContributionV2 {
  code:
    string;

  points:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayRiskEvaluationV2
  extends SmartStayRiskAssessmentV2 {
  contributions:
    SmartStayRiskContributionV2[];
}

const DEFAULT_MEDIUM_THRESHOLD =
  30;

const DEFAULT_HIGH_THRESHOLD =
  60;

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

function getFacts(
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
  return getFacts(
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
        first,
        second
      ) =>
        second.confidence -
        first.confidence
    )[0] ??
    null;
}

function hasConflict(
  evidence:
    SmartStayEvidenceFactV2[],
  code:
    string
) {
  return getFacts(
    evidence,
    code
  ).some(
    (fact) =>
      fact.availability ===
      "conflicting"
  );
}

function addContribution(
  contributions:
    Map<
      string,
      SmartStayRiskContributionV2
    >,
  code:
    string,
  points:
    number,
  evidenceIds:
    string[] = []
) {
  if (
    !Number.isFinite(points) ||
    points <= 0
  ) {
    return;
  }

  const normalizedPoints =
    round(
      points
    );

  const existing =
    contributions.get(
      code
    );

  if (!existing) {
    contributions.set(
      code,
      {
        code,

        points:
          normalizedPoints,

        evidenceIds:
          uniqueSorted(
            evidenceIds
          ),
      }
    );

    return;
  }

  contributions.set(
    code,
    {
      code,

      points:
        Math.max(
          existing.points,
          normalizedPoints
        ),

      evidenceIds:
        uniqueSorted([
          ...existing.evidenceIds,
          ...evidenceIds,
        ]),
    }
  );
}

function addWarningContributions(
  contributions:
    Map<
      string,
      SmartStayRiskContributionV2
    >,
  prefix:
    string,
  warningCodes:
    string[],
  evidenceIds:
    string[]
) {
  for (
    const warning
    of warningCodes
  ) {
    let points =
      2;

    if (
      /conflict|disagree|discrep/i.test(
        warning
      )
    ) {
      points =
        8;
    }
    else if (
      /unavailable|unverified|limited|unknown/i.test(
        warning
      )
    ) {
      points =
        4;
    }

    addContribution(
      contributions,
      `${prefix}:${warning}`,
      points,
      evidenceIds
    );
  }
}

function getLevel(
  score:
    number,
  mediumThreshold:
    number,
  highThreshold:
    number
): SmartStayRiskLevelV2 {
  if (
    score >= highThreshold
  ) {
    return "high";
  }

  if (
    score >= mediumThreshold
  ) {
    return "medium";
  }

  return "low";
}

export function evaluateRiskV2(
  input:
    SmartStayRiskInputV2,
  options:
    SmartStayRiskOptionsV2 = {}
): SmartStayRiskEvaluationV2 {
  const mediumThreshold =
    clamp(
      typeof options.mediumThreshold ===
        "number" &&
      Number.isFinite(
        options.mediumThreshold
      )
        ? options.mediumThreshold
        : DEFAULT_MEDIUM_THRESHOLD,
      0,
      100
    );

  const highThreshold =
    Math.max(
      mediumThreshold,
      clamp(
        typeof options.highThreshold ===
          "number" &&
        Number.isFinite(
          options.highThreshold
        )
          ? options.highThreshold
          : DEFAULT_HIGH_THRESHOLD,
        0,
        100
      )
    );

  const contributions =
    new Map<
      string,
      SmartStayRiskContributionV2
    >();

  if (
    input.dataConfidence.level ===
    "none"
  ) {
    addContribution(
      contributions,
      "data-confidence-none",
      35,
      input.dataConfidence.evidenceIds
    );
  }
  else if (
    input.dataConfidence.level ===
    "low"
  ) {
    addContribution(
      contributions,
      "data-confidence-low",
      25,
      input.dataConfidence.evidenceIds
    );
  }
  else if (
    input.dataConfidence.level ===
    "medium"
  ) {
    addContribution(
      contributions,
      "data-confidence-medium",
      10,
      input.dataConfidence.evidenceIds
    );
  }

  if (
    input.dataConfidence
      .criticalCoverage < 60
  ) {
    addContribution(
      contributions,
      "critical-data-coverage-limited",
      15,
      input.dataConfidence.evidenceIds
    );
  }

  const criticalFields =
    new Set<string>(
      SMARTSTAY_DATA_CONFIDENCE_CRITICAL_FIELDS
    );

  for (
    const code
    of input.dataConfidence
      .conflictingFieldCodes
  ) {
    const facts =
      getFacts(
        input.evidence,
        code
      );

    addContribution(
      contributions,
      `evidence-conflicting:${code}`,
      criticalFields.has(
        code
      )
        ? 12
        : 6,
      facts.map(
        (fact) =>
          fact.id
      )
    );
  }

  if (
    input.reliabilityGate.status ===
    "invalid"
  ) {
    for (
      const reason
      of input.reliabilityGate
        .blockingReasonCodes
    ) {
      addContribution(
        contributions,
        `reliability-blocking:${reason}`,
        20,
        input.reliabilityGate.evidenceIds
      );
    }
  }
  else if (
    input.reliabilityGate.status ===
    "low-confidence"
  ) {
    addContribution(
      contributions,
      "reliability-low-confidence",
      45,
      input.reliabilityGate.evidenceIds
    );
  }

  addWarningContributions(
    contributions,
    "reliability-warning",
    input.reliabilityGate.warningCodes,
    input.reliabilityGate.evidenceIds
  );

  const completeness =
    getKnownFact(
      input.evidence,
      "stay.cost.completeness"
    );

  if (
    hasConflict(
      input.evidence,
      "stay.cost.completeness"
    )
  ) {
    addContribution(
      contributions,
      "cost-completeness-conflicting",
      25,
      getFacts(
        input.evidence,
        "stay.cost.completeness"
      ).map(
        (fact) =>
          fact.id
      )
    );
  }
  else if (
    !completeness
  ) {
    addContribution(
      contributions,
      "cost-completeness-unavailable",
      20
    );
  }
  else if (
    completeness.value ===
    "reported-tax-status-unknown"
  ) {
    addContribution(
      contributions,
      "tax-inclusion-status-unknown",
      14,
      [completeness.id]
    );
  }
  else if (
    completeness.value ===
    "partial"
  ) {
    addContribution(
      contributions,
      "cost-partially-known",
      18,
      [completeness.id]
    );
  }
  else if (
    completeness.value !==
    "reported-complete"
  ) {
    addContribution(
      contributions,
      "cost-completeness-unknown",
      24,
      [completeness.id]
    );
  }

  const refundable =
    getKnownFact(
      input.evidence,
      "offer.refundable"
    );

  if (
    hasConflict(
      input.evidence,
      "offer.refundable"
    )
  ) {
    addContribution(
      contributions,
      "refundability-conflicting",
      15,
      getFacts(
        input.evidence,
        "offer.refundable"
      ).map(
        (fact) =>
          fact.id
      )
    );
  }
  else if (
    !refundable
  ) {
    addContribution(
      contributions,
      "refundability-unavailable",
      8
    );
  }
  else if (
    refundable.value ===
    false
  ) {
    addContribution(
      contributions,
      "offer-non-refundable",
      18,
      [refundable.id]
    );
  }
  else if (
    refundable.value ===
    true &&
    !getKnownFact(
      input.evidence,
      "offer.free-cancellation-until"
    )
  ) {
    addContribution(
      contributions,
      "free-cancellation-deadline-unavailable",
      5,
      [refundable.id]
    );
  }

  const penalty =
    getKnownFact(
      input.evidence,
      "offer.cancellation-penalty"
    );

  const totalCost =
    getKnownFact(
      input.evidence,
      "stay.cost.total"
    );

  if (
    penalty &&
    typeof penalty.value ===
      "number" &&
    Number.isFinite(
      penalty.value
    ) &&
    penalty.value > 0
  ) {
    let points =
      6;

    const penaltyCurrency =
      typeof penalty.unit ===
        "string"
        ? penalty.unit
            .trim()
            .toUpperCase()
        : "";

    const totalCostCurrency =
      totalCost &&
      typeof totalCost.unit ===
        "string"
        ? totalCost.unit
            .trim()
            .toUpperCase()
        : "";

    const comparableCurrencies =
      Boolean(
        penaltyCurrency &&
        totalCostCurrency &&
        penaltyCurrency ===
          totalCostCurrency
      );

    if (
      totalCost &&
      typeof totalCost.value ===
        "number" &&
      Number.isFinite(
        totalCost.value
      ) &&
      totalCost.value > 0 &&
      comparableCurrencies
    ) {
      const ratio =
        penalty.value /
        totalCost.value;

      points =
        ratio >= 1
          ? 20
          : ratio >= 0.5
            ? 12
            : ratio >= 0.2
              ? 8
              : 4;
    }
    else if (
      totalCost &&
      penaltyCurrency &&
      totalCostCurrency &&
      penaltyCurrency !==
        totalCostCurrency
    ) {
      addContribution(
        contributions,
        "cancellation-penalty-currency-mismatch",
        8,
        [
          penalty.id,
          totalCost.id,
        ]
      );
    }

    addContribution(
      contributions,
      "cancellation-penalty-exposure",
      points,
      [penalty.id]
    );
  }

  const reviewCount =
    getKnownFact(
      input.evidence,
      "review.count"
    );

  if (
    hasConflict(
      input.evidence,
      "review.count"
    )
  ) {
    addContribution(
      contributions,
      "review-count-conflicting",
      12,
      getFacts(
        input.evidence,
        "review.count"
      ).map(
        (fact) =>
          fact.id
      )
    );
  }
  else if (
    !reviewCount
  ) {
    addContribution(
      contributions,
      "review-count-unavailable",
      8
    );
  }
  else if (
    typeof reviewCount.value ===
      "number" &&
    Number.isFinite(
      reviewCount.value
    )
  ) {
    const count =
      reviewCount.value;

    if (count <= 0) {
      addContribution(
        contributions,
        "no-review-history",
        12,
        [reviewCount.id]
      );
    }
    else if (count < 5) {
      addContribution(
        contributions,
        "very-limited-review-history",
        10,
        [reviewCount.id]
      );
    }
    else if (count < 20) {
      addContribution(
        contributions,
        "limited-review-history",
        7,
        [reviewCount.id]
      );
    }
    else if (count < 50) {
      addContribution(
        contributions,
        "moderate-review-history",
        4,
        [reviewCount.id]
      );
    }
  }

  const distanceFacts =
    getFacts(
      input.evidence,
      "location.distance"
    );

  const coordinateFacts =
    getFacts(
      input.evidence,
      "location.coordinates"
    );

  if (
    hasConflict(
      input.evidence,
      "location.distance"
    ) ||
    hasConflict(
      input.evidence,
      "location.coordinates"
    )
  ) {
    addContribution(
      contributions,
      "location-evidence-conflicting",
      12,
      [
        ...distanceFacts,
        ...coordinateFacts,
      ].map(
        (fact) =>
          fact.id
      )
    );
  }
  else if (
    !getKnownFact(
      input.evidence,
      "location.distance"
    ) &&
    !getKnownFact(
      input.evidence,
      "location.coordinates"
    )
  ) {
    addContribution(
      contributions,
      "location-evidence-unavailable",
      6
    );
  }

  if (
    input.comfortFlexibility
  ) {
    const mandatory =
      input.comfortFlexibility
        .mandatoryRequirements;

    if (
      mandatory
        .unverifiedFeatureCodes
        .length > 0
    ) {
      addContribution(
        contributions,
        "mandatory-features-unverified",
        Math.min(
          mandatory
            .unverifiedFeatureCodes
            .length *
            4,
          16
        ),
        input.comfortFlexibility
          .evidenceIds
      );
    }

    if (
      mandatory
        .unmetFeatureCodes
        .length > 0
    ) {
      addContribution(
        contributions,
        "mandatory-features-unmet",
        20,
        input.comfortFlexibility
          .evidenceIds
      );
    }

    if (
      mandatory
        .requiredUnitTypeStatus ===
      "unverified"
    ) {
      addContribution(
        contributions,
        "required-unit-type-unverified",
        8,
        input.comfortFlexibility
          .unitType
          .evidenceIds
      );
    }

    if (
      mandatory
        .requiredUnitTypeStatus ===
      "unmet"
    ) {
      addContribution(
        contributions,
        "required-unit-type-unmet",
        15,
        input.comfortFlexibility
          .unitType
          .evidenceIds
      );
    }
  }

  if (input.priceValue) {
    addWarningContributions(
      contributions,
      "price-warning",
      input.priceValue.warningCodes,
      input.priceValue.evidenceIds
    );
  }

  if (input.quality) {
    addWarningContributions(
      contributions,
      "quality-warning",
      input.quality.warningCodes,
      input.quality.evidenceIds
    );
  }

  if (input.location) {
    addWarningContributions(
      contributions,
      "location-warning",
      input.location.warningCodes,
      input.location.evidenceIds
    );
  }

  if (input.comfortFlexibility) {
    addWarningContributions(
      contributions,
      "comfort-warning",
      input.comfortFlexibility
        .warningCodes,
      input.comfortFlexibility
        .evidenceIds
    );
  }

  const sortedContributions =
    [
      ...contributions.values(),
    ].sort(
      (
        first,
        second
      ) =>
        second.points -
          first.points ||
        first.code.localeCompare(
          second.code
        )
    );

  let score =
    sortedContributions.reduce(
      (
        total,
        contribution
      ) =>
        total +
        contribution.points,
      0
    );

  if (
    input.reliabilityGate.status ===
    "invalid"
  ) {
    score =
      100;
  }
  else if (
    input.reliabilityGate.status ===
    "low-confidence"
  ) {
    score =
      Math.max(
        score,
        75
      );
  }

  score =
    round(
      clamp(
        score,
        0,
        100
      )
    );

  return {
    score,

    level:
      getLevel(
        score,
        mediumThreshold,
        highThreshold
      ),

    factorCodes:
      sortedContributions.map(
        (contribution) =>
          contribution.code
      ),

    evidenceIds:
      uniqueSorted([
        ...input
          .dataConfidence
          .evidenceIds,

        ...input
          .reliabilityGate
          .evidenceIds,

        ...sortedContributions
          .flatMap(
            (contribution) =>
              contribution.evidenceIds
          ),
      ]),

    contributions:
      sortedContributions,
  };
}