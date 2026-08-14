import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDecisionExplanationV3,
  validateDecisionExplanationV3,
  type EvaluateStayOptiDecisionExplanationInputV3,
  type StayOptiAbstentionCodeV3,
  type StayOptiContextualCandidateEvaluationV3,
  type StayOptiContextualStayValueEvaluationV3,
  type StayOptiDecisionGeometryV3,
  type StayOptiDecisionRobustnessV3,
  type StayOptiGeometryDimensionV3,
  type StayOptiPersonalUtilityEvaluationV3,
  type StayOptiRobustnessCandidateEvaluationV3,
  type StayOptiUtilityDimensionInputV3,
  type StayOptiUtilityDimensionV3,
} from "../../src/engine-v3";

const DIMENSIONS: readonly StayOptiUtilityDimensionV3[] = [
  "priceValue",
  "quality",
  "location",
  "comfort",
  "flexibility",
  "categoryFit",
  "userFit",
];

const DEFAULT_SCORES: Readonly<
  Record<string, Readonly<Record<StayOptiUtilityDimensionV3, number>>>
> = {
  a: {
    priceValue: 86,
    quality: 88,
    location: 82,
    comfort: 84,
    flexibility: 78,
    categoryFit: 85,
    userFit: 87,
  },
  b: {
    priceValue: 72,
    quality: 74,
    location: 76,
    comfort: 72,
    flexibility: 82,
    categoryFit: 76,
    userFit: 75,
  },
};

type FixtureOptions = {
  order?: string[];
  costs?: Record<string, number>;
  scores?: Record<string, Partial<Record<StayOptiUtilityDimensionV3, number>>>;
  decisiveDimension?: StayOptiGeometryDimensionV3;
  recommendationPolicy?: "recommend" | "abstain";
  recommendedHotelId?: string | null;
  preferredAlternativeHotelId?: string | null;
  abstentionCode?: StayOptiAbstentionCodeV3 | null;
  nearTie?: boolean;
  stable?: boolean;
  exactThreshold?: boolean;
  thresholdAmount?: number;
  travelTimes?: Record<string, number | null>;
  evidenceAvailable?: boolean;
  contextualStatus?: "usable" | "partial" | "unavailable";
  recheckRequired?: boolean;
};

function scoreFor(
  options: FixtureOptions,
  hotelId: string,
  dimension: StayOptiUtilityDimensionV3
) {
  return options.scores?.[hotelId]?.[dimension] ??
    DEFAULT_SCORES[hotelId]?.[dimension] ??
    70;
}

function evidenceIds(
  options: FixtureOptions,
  hotelId: string,
  dimension: string
) {
  return options.evidenceAvailable === false
    ? []
    : [`evidence:${hotelId}:${dimension}`];
}

function createUtility(
  options: FixtureOptions,
  hotelId: string
): StayOptiPersonalUtilityEvaluationV3 {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map(
      (dimension): [StayOptiUtilityDimensionV3, StayOptiUtilityDimensionInputV3] => [
        dimension,
        {
          score: scoreFor(options, hotelId, dimension),
          confidence: 0.9,
          evidenceIds: evidenceIds(options, hotelId, dimension),
        },
      ]
    )
  ) as Record<StayOptiUtilityDimensionV3, StayOptiUtilityDimensionInputV3>;
  const weights = Object.fromEntries(
    DIMENSIONS.map(
      (dimension) => [dimension, 1 / DIMENSIONS.length]
    )
  ) as Record<StayOptiUtilityDimensionV3, number>;

  return {
    evaluationId: `utility:${hotelId}`,
    hotelId,
    status: "usable",
    preference: {
      declaredPreferenceId: "balanced",
      inferredPreferenceId: null,
      resolvedPreferenceId: "balanced",
      origin: "declared",
      reasonCodes: ["preference:declared"],
    },
    context: {
      totalBudget: 600,
      totalCost: options.costs?.[hotelId] ?? (hotelId === "a" ? 420 : 500),
      nights: 4,
      adults: 2,
      children: 0,
      rooms: 1,
      maximumDistanceKm: 3,
      leadTimeDays: 30,
      tripType: "leisure",
    },
    dimensions,
    interactions: [],
    weights,
    contributions: DIMENSIONS.map((dimension) => ({
      dimension,
      available: true,
      sourceScore: scoreFor(options, hotelId, dimension),
      transformedScore: scoreFor(options, hotelId, dimension),
      confidence: 0.9,
      configuredWeight: weights[dimension],
      normalizedAvailableWeight: weights[dimension],
      weightedValue: scoreFor(options, hotelId, dimension) * weights[dimension],
      curve: dimension === "priceValue"
        ? "budget-no-spend-bias"
        : "diminishing-returns",
      evidenceIds: evidenceIds(options, hotelId, dimension),
    })),
    utilityScore: DIMENSIONS.reduce(
      (total, dimension) => total + scoreFor(options, hotelId, dimension),
      0
    ) / DIMENSIONS.length,
    scoreConfidence: 0.9,
    evidenceCoverage: options.evidenceAvailable === false ? 0 : 1,
    reasonCodes: ["utility:evaluated"],
    fingerprint: `fnv1a32-${hotelId === "a" ? "aaaaaaaa" : "bbbbbbbb"}`,
  };
}

function createGeometry(
  options: FixtureOptions,
  hotelIds: string[]
): StayOptiDecisionGeometryV3 {
  const costs = Object.fromEntries(
    hotelIds.map(
      (hotelId) => [hotelId, options.costs?.[hotelId] ?? (hotelId === "a" ? 420 : 500)]
    )
  ) as Record<string, number>;
  const lowerCostHotelId = costs.a <= costs.b ? "a" : "b";
  const higherCostHotelId = lowerCostHotelId === "a" ? "b" : "a";
  const decisiveDimension = options.decisiveDimension ?? "quality";
  const recommendedHotelId = options.recommendedHotelId === undefined
    ? "a"
    : options.recommendedHotelId;

  return {
    evaluationId: "geometry:evaluation",
    phase: "v3-04",
    rankingApplication: "shadow-only",
    status: "usable",
    dimensions: ["totalCost", ...DIMENSIONS.filter(
      (dimension): dimension is Exclude<StayOptiUtilityDimensionV3, "priceValue"> =>
        dimension !== "priceValue"
    )],
    candidates: hotelIds.map((hotelId) => ({
      hotelId,
      solutionId: `solution:${hotelId}`,
      status: "comparable",
      totalCost: costs[hotelId],
      currency: "EUR",
      utilityScore: 80,
      strongParetoStatus: "frontier",
      weakParetoStatus: "frontier",
      availableDimensions: ["totalCost", "quality", "location", "comfort", "flexibility", "categoryFit", "userFit"],
      missingDimensions: [],
      comparablePeerHotelIds: hotelIds.filter((id) => id !== hotelId),
      dominatedByHotelIds: [],
      strictlyDominatedByHotelIds: [],
      dominatesHotelIds: [],
      primaryEliminationVariable: null,
      reasonCodes: ["geometry:evaluated"],
    })),
    strongParetoFrontierHotelIds: [...hotelIds].sort(),
    weakParetoFrontierHotelIds: [...hotelIds].sort(),
    dominanceRelations: [],
    pairwiseFinalistComparisons: [{
      comparisonId: "pairwise:a:b",
      firstHotelId: "a",
      secondHotelId: "b",
      outcome: recommendedHotelId === null
        ? "utility-equivalent"
        : recommendedHotelId === "a"
          ? "first-preferred"
          : "second-preferred",
      preferredHotelId: recommendedHotelId,
      decisiveDimension: recommendedHotelId === null ? null : decisiveDimension,
      utilityDeltaFirstMinusSecond: recommendedHotelId === null
        ? 0
        : recommendedHotelId === "a"
          ? 5
          : -5,
      dominanceKind: null,
      reasonCodes: ["geometry:pairwise-preferred"],
    }],
    marginalValueSegments: [],
    tradeOffThresholds: [{
      thresholdId: "threshold:a:b",
      lowerCostHotelId,
      higherCostHotelId,
      currency: "EUR",
      actualPremiumAmount: Math.abs(costs.a - costs.b),
      higherCostMaximumSensiblePrice: {
        status: options.exactThreshold === false ? "unavailable" : "available",
        amount: options.exactThreshold === false
          ? null
          : options.thresholdAmount ?? 470,
        currency: options.exactThreshold === false ? null : "EUR",
        againstHotelId: lowerCostHotelId,
      },
      upgradeThresholdAmount: options.exactThreshold === false
        ? null
        : options.thresholdAmount ?? 470,
      upgradeVerdict: "worthwhile",
      actualSavingAmount: Math.abs(costs.a - costs.b),
      lowerCostMaximumSensiblePrice: {
        status: "unavailable",
        amount: null,
        currency: null,
        againstHotelId: higherCostHotelId,
      },
      savingThresholdAmount: null,
      savingVerdict: "unavailable",
      exact: options.exactThreshold !== false,
      reasonCodes: [
        options.exactThreshold === false
          ? "geometry:threshold-unavailable"
          : "geometry:threshold-available",
      ],
    }],
    decisionMap: {
      internalOnly: true,
      points: [],
    },
    exactThresholdCount: options.exactThreshold === false ? 0 : 1,
    reasonCodes: ["geometry:evaluated", "geometry:shadow-only"],
    fingerprint: "fnv1a32-11111111",
  };
}

function createRobustnessCandidate(
  options: FixtureOptions,
  hotelId: string
): StayOptiRobustnessCandidateEvaluationV3 {
  return {
    hotelId,
    solutionId: `solution:${hotelId}`,
    status: "usable",
    utilityScore: hotelId === "a" ? 84 : 76,
    sourceRiskScore: 5,
    canonicalRiskFloor: 0,
    choiceRiskScore: hotelId === "a" ? 5 : 8,
    choiceRiskLevel: "low",
    riskPenalty: 1,
    evidenceStrength: options.evidenceAvailable === false ? 0.1 : 0.95,
    uncertaintyWidth: 2,
    riskAdjustedUtility: hotelId === "a" ? 83 : 74,
    downsideUtility: hotelId === "a" ? 80 : 70,
    comparablePeerHotelIds: [hotelId === "a" ? "b" : "a"],
    riskSignals: options.recheckRequired && hotelId === "a"
      ? [{
          code: "bookability-recheck",
          severity: 0.5,
          evidenceIds: evidenceIds(options, hotelId, "recheck"),
        }]
      : [],
    reasonCodes: ["risk:evaluated"],
  };
}

function createRobustness(
  options: FixtureOptions,
  hotelIds: string[]
): StayOptiDecisionRobustnessV3 {
  const recommendationPolicy = options.recommendationPolicy ?? "recommend";
  const recommendedHotelId = options.recommendedHotelId === undefined
    ? "a"
    : options.recommendedHotelId;
  const abstentionCode = recommendationPolicy === "abstain"
    ? options.abstentionCode ?? "indistinguishable-options"
    : null;
  const winnerHotelIds = options.stable === false
    ? ["b"]
    : recommendedHotelId === null
      ? ["a", "b"]
      : [recommendedHotelId];

  return {
    evaluationId: "robustness:evaluation",
    phase: "v3-05",
    rankingApplication: "shadow-only",
    status: "usable",
    anchorHotelId: "a",
    comparisonCohortHotelIds: [...hotelIds].sort(),
    candidates: hotelIds.map(
      (hotelId) => createRobustnessCandidate(options, hotelId)
    ),
    scenarios: ["baseline", "quality-priority", "savings-priority"].map(
      (scenarioId, index) => ({
        scenarioId: scenarioId as "baseline" | "quality-priority" | "savings-priority",
        status: "evaluated" as const,
        candidateScores: hotelIds.map((hotelId) => ({
          hotelId,
          riskAdjustedUtility: hotelId === winnerHotelIds[0] ? 85 - index : 72,
        })),
        winnerHotelIds: index === 2 && options.stable === false
          ? ["b"]
          : winnerHotelIds,
        reasonCodes: ["robustness:scenario-evaluated" as const],
      })
    ),
    candidateRegret: hotelIds.map((hotelId) => ({
      hotelId,
      scenarioCount: 3,
      winRate: hotelId === recommendedHotelId ? 1 : 0,
      expectedRegret: hotelId === recommendedHotelId ? 0 : 5,
      maximumRegret: hotelId === recommendedHotelId ? 0 : 8,
      robustChoiceScore: hotelId === recommendedHotelId ? 100 : 0,
    })),
    robustChoiceHotelId: recommendationPolicy === "recommend" ? recommendedHotelId : null,
    robustChoiceScore: recommendationPolicy === "recommend" ? 100 : null,
    expectedRegret: recommendationPolicy === "recommend" ? 0 : null,
    maximumRegret: recommendationPolicy === "recommend" ? 0 : null,
    nearTie: {
      status: options.nearTie ? "detected" : "not-detected",
      hotelIds: options.nearTie ? ["a", "b"] : [],
      riskAdjustedUtilityDelta: options.nearTie ? 0.2 : 9,
      indistinguishable: options.nearTie ?? false,
    },
    noGoodOption: {
      status: abstentionCode === "no-good-option" ? "detected" : "not-detected",
      bestRiskAdjustedUtility: abstentionCode === "no-good-option" ? 20 : 83,
      bestDownsideUtility: abstentionCode === "no-good-option" ? 10 : 80,
    },
    recommendationPolicy,
    policyPreferredHotelId: recommendationPolicy === "recommend" ? recommendedHotelId : null,
    abstentionCode,
    constraintRelaxation: {
      status: "not-needed",
      selected: null,
      consideredRelaxationIds: [],
      reasonCodes: ["relaxation:not-needed"],
    },
    reasonCodes: ["robustness:evaluated", "robustness:shadow-only"],
    fingerprint: "fnv1a32-22222222",
  };
}

function createContextualCandidate(
  options: FixtureOptions,
  hotelId: string
): StayOptiContextualCandidateEvaluationV3 {
  const travelTime = options.travelTimes?.[hotelId] ?? null;
  const locationEvidence = travelTime === null
    ? []
    : evidenceIds(options, hotelId, "travel-time");

  return {
    hotelId,
    status: options.contextualStatus ?? (travelTime === null ? "partial" : "usable"),
    location: {
      status: travelTime === null ? "unavailable" : "usable",
      weightedTravelTimeMinutes: travelTime,
      locationScore: travelTime === null ? null : Math.max(0, 100 - travelTime),
      usedPointIds: travelTime === null ? [] : ["city-centre"],
      excludedPointIds: [],
      straightLineDistanceKm: null,
      destinationAdjusted: false,
      evidenceIds: locationEvidence,
      reasonCodes: [
        travelTime === null
          ? "location:travel-time-unavailable"
          : "location:travel-time-evaluated",
      ],
    },
    roomUpgrade: {
      status: "unavailable",
      selectedOfferId: null,
      alternativeOfferId: null,
      premiumAmount: null,
      premiumRatio: null,
      tierGain: null,
      attributeGain: null,
      maximumPremiumRatio: null,
      evidenceIds: [],
      reasonCodes: ["room:upgrade-unavailable"],
    },
    flexibility: {
      status: "unavailable",
      cancellationProtectionAmount: null,
      cancellationProtectionScore: null,
      expectedCancellationValue: null,
      paymentTiming: "unknown",
      paymentTimingValue: null,
      currency: null,
      evidenceIds: [],
      reasonCodes: ["flexibility:context-unavailable"],
    },
    contextInteractions: {
      status: "unavailable",
      utilityDelta: null,
      interactions: [],
      evidenceIds: [],
      reasonCodes: ["interaction:context-unavailable"],
    },
    convenience: {
      status: "unavailable",
      convenienceIndex: null,
      decisionFrictionScore: null,
      usableSignalCount: 0,
      suppliedSignalCount: 0,
      evidenceIds: [],
      reasonCodes: ["convenience:insufficient-coverage"],
    },
    activeSignals: travelTime === null ? [] : ["travel-time-location"],
    inactiveSignals: travelTime === null ? ["travel-time-location"] : [],
    reasonCodes: ["context:evaluated"],
    fingerprint: `fnv1a32-${hotelId === "a" ? "cccccccc" : "dddddddd"}`,
  };
}

function createContextual(
  options: FixtureOptions,
  hotelIds: string[]
): StayOptiContextualStayValueEvaluationV3 {
  return {
    evaluationId: "contextual:evaluation",
    phase: "v3-06",
    rankingApplication: "shadow-only",
    publicPresentation: "disabled",
    decisionGainGate: {
      status: "pending-golden-dataset",
      rankingEnabled: false,
      publicCopyEnabled: false,
    },
    context: {
      preferenceId: "balanced",
      tripType: "leisure",
      nights: 4,
      adults: 2,
      children: 0,
      rooms: 1,
      leadTimeDays: 30,
      destination: null,
    },
    candidates: hotelIds.map(
      (hotelId) => createContextualCandidate(options, hotelId)
    ),
    usableCandidateCount: options.contextualStatus === "usable"
      ? hotelIds.length
      : 0,
    activeSignalCount: Object.values(options.travelTimes ?? {}).filter(
      (value) => value !== null
    ).length,
    reasonCodes: ["context:evaluated", "context:shadow-only"],
    fingerprint: "fnv1a32-33333333",
  };
}

function createInput(
  options: FixtureOptions = {}
): EvaluateStayOptiDecisionExplanationInputV3 {
  const hotelIds = options.order ?? ["a", "b"];

  return {
    solutionMappings: hotelIds.map((hotelId) => ({
      hotelId,
      solutionId: `solution:${hotelId}`,
    })),
    preferredAlternativeHotelId: options.preferredAlternativeHotelId === undefined
      ? "b"
      : options.preferredAlternativeHotelId,
    utilityEvaluations: hotelIds.map(
      (hotelId) => createUtility(options, hotelId)
    ),
    decisionGeometry: createGeometry(options, hotelIds),
    decisionRobustness: createRobustness(options, hotelIds),
    contextualStayValue: createContextual(options, hotelIds),
    legacyPrimaryEvidenceIds: evidenceIds(options, "a", "legacy-primary"),
    legacyTradeOffEvidenceIds: evidenceIds(options, "a", "legacy-trade-off"),
    sourceReasonCodes: ["best-choice:fixture"],
  };
}

test("the V3-07 thesis is compressed into six evidence-linked slots and stays shadow-only", () => {
  const explanation = evaluateDecisionExplanationV3(createInput());
  const claims = [
    explanation.recommendation,
    explanation.primaryReason,
    explanation.mainTradeOff,
    explanation.bestAlternative,
    explanation.switchCondition,
    explanation.uncertainty,
  ];

  assert.equal(validateDecisionExplanationV3(explanation).valid, true);
  assert.equal(explanation.phase, "v3-07");
  assert.equal(explanation.rankingApplication, "shadow-only");
  assert.equal(explanation.publicPresentation, "disabled");
  assert.equal(explanation.publicGate.copyEnabled, false);
  assert.equal(claims.length, 6);
  assert.ok(explanation.compression.availableStatementCount <= 6);
});

test("every available copy claim has a one-to-one evidence and derivation link", () => {
  const explanation = evaluateDecisionExplanationV3(createInput());
  const availableClaims = [
    explanation.recommendation,
    explanation.primaryReason,
    explanation.mainTradeOff,
    explanation.bestAlternative,
    explanation.switchCondition,
    explanation.uncertainty,
  ].filter((claim) => claim.status === "available");

  assert.equal(explanation.copyEvidenceLinks.length, availableClaims.length);
  for (const claim of availableClaims) {
    const link = explanation.copyEvidenceLinks.find(
      (entry) => entry.claimId === claim.claimId
    );
    assert.ok(link);
    assert.deepEqual(link.evidenceIds, claim.evidenceIds);
    assert.deepEqual(link.derivationIds, claim.derivationIds);
    assert.ok(link.evidenceIds.length > 0);
    assert.ok(link.derivationIds.length > 0);
  }
});

test("public explanation exposes neither an uncalibrated percentage nor numeric confidence", () => {
  const explanation = evaluateDecisionExplanationV3(createInput());

  assert.equal(explanation.publicNumericConfidence, null);
  assert.equal(explanation.numericPolicy.publicPercentageCount, 0);
  assert.equal(explanation.numericPolicy.uncalibratedPercentagesAllowed, false);
  const numericFacts = [
    explanation.recommendation,
    explanation.primaryReason,
    explanation.mainTradeOff,
    explanation.bestAlternative,
    explanation.switchCondition,
    explanation.uncertainty,
  ].flatMap((claim) => claim.numericFacts);
  assert.equal(
    JSON.stringify(numericFacts).includes("percentage"),
    false
  );
});

test("a cheaper recommendation states the exact absolute saving with its currency", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    decisiveDimension: "totalCost",
    costs: { a: 420, b: 500 },
  }));

  assert.equal(explanation.primaryReason.claimCode, "primary:lower-total-cost");
  assert.deepEqual(explanation.primaryReason.numericFacts, [{
    code: "total-cost-difference",
    value: 80,
    unit: "currency",
    currency: "EUR",
    publicDisplay: true,
  }]);
});

test("a location-led choice uses direct travel-time evidence and a minute difference", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    decisiveDimension: "location",
    travelTimes: { a: 12, b: 27 },
    contextualStatus: "usable",
  }));

  assert.equal(explanation.primaryReason.claimCode, "primary:shorter-travel-time");
  assert.equal(explanation.primaryReason.numericFacts[0]?.value, 15);
  assert.equal(explanation.primaryReason.numericFacts[0]?.unit, "minutes");
  assert.ok(
    explanation.primaryReason.evidenceIds.every(
      (id) => id.includes("travel-time")
    )
  );
});

test("a higher-cost recommendation explains both its premium and the cheaper alternative", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    costs: { a: 520, b: 420 },
    recommendedHotelId: "a",
    decisiveDimension: "quality",
  }));

  assert.equal(explanation.mainTradeOff.claimCode, "trade-off:higher-total-cost");
  assert.equal(explanation.mainTradeOff.numericFacts[0]?.value, 100);
  assert.equal(explanation.bestAlternative.claimCode, "alternative:lower-total-cost");
  assert.equal(explanation.bestAlternative.subjectHotelId, "b");
});

test("an exact utility threshold becomes the only numeric switch condition", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    exactThreshold: true,
    thresholdAmount: 468,
  }));

  assert.equal(explanation.exactSwitchThresholdAvailable, true);
  assert.equal(explanation.switchCondition.claimCode, "switch:alternative-price-at-or-below");
  assert.deepEqual(explanation.switchCondition.numericFacts, [{
    code: "switch-price-threshold",
    value: 468,
    unit: "currency",
    currency: "EUR",
    publicDisplay: true,
  }]);
});

test("a non-exact threshold stays unavailable instead of inventing a counterfactual", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    exactThreshold: false,
  }));

  assert.equal(explanation.exactSwitchThresholdAvailable, false);
  assert.equal(explanation.switchCondition.status, "unavailable");
  assert.deepEqual(explanation.switchCondition.numericFacts, []);
});

test("an indistinguishable near-tie produces an honest abstention", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    recommendationPolicy: "abstain",
    recommendedHotelId: null,
    abstentionCode: "indistinguishable-options",
    nearTie: true,
  }));

  assert.equal(explanation.status, "abstained");
  assert.equal(explanation.recommendedHotelId, null);
  assert.equal(explanation.recommendedSolutionId, null);
  assert.equal(explanation.recommendation.claimCode, "recommendation:no-clear-winner");
  assert.equal(explanation.primaryReason.claimCode, "primary:near-tie");
  assert.equal(explanation.uncertainty.claimCode, "uncertainty:near-tie");
  assert.equal(explanation.strengthLabel, "near-tie");
});

test("insufficient evidence and no-good-option abstentions remain semantically distinct", () => {
  const insufficient = evaluateDecisionExplanationV3(createInput({
    recommendationPolicy: "abstain",
    recommendedHotelId: null,
    abstentionCode: "insufficient-evidence",
  }));
  const noGood = evaluateDecisionExplanationV3(createInput({
    recommendationPolicy: "abstain",
    recommendedHotelId: null,
    abstentionCode: "no-good-option",
  }));

  assert.equal(insufficient.primaryReason.claimCode, "primary:insufficient-evidence");
  assert.equal(insufficient.uncertainty.claimCode, "uncertainty:insufficient-evidence");
  assert.equal(noGood.primaryReason.claimCode, "primary:no-good-option");
  assert.equal(noGood.uncertainty.claimCode, "uncertainty:no-good-option");
});

test("missing source evidence makes claims unavailable rather than fabricated", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    evidenceAvailable: false,
  }));
  const claims = [
    explanation.recommendation,
    explanation.primaryReason,
    explanation.mainTradeOff,
    explanation.bestAlternative,
    explanation.switchCondition,
    explanation.uncertainty,
  ];

  assert.equal(validateDecisionExplanationV3(explanation).valid, true);
  assert.equal(
    claims.every(
      (claim) =>
        claim.status === "unavailable" &&
        claim.evidenceIds.length === 0 &&
        claim.numericFacts.length === 0
    ),
    true
  );
});

test("candidate and evidence input order cannot change the explanation", () => {
  const first = evaluateDecisionExplanationV3(createInput({
    order: ["a", "b"],
  }));
  const second = evaluateDecisionExplanationV3(createInput({
    order: ["b", "a"],
  }));

  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.copyEvidenceLinks, second.copyEvidenceLinks);
  assert.deepEqual(first.primaryReason, second.primaryReason);
});

test("the explanation fingerprint detects post-evaluation copy mutation", () => {
  const explanation = evaluateDecisionExplanationV3(createInput());
  const mutated = structuredClone(explanation);
  mutated.primaryReason.messageKey = "stayopti.v3.explanation.fabricated";

  assert.equal(validateDecisionExplanationV3(explanation).valid, true);
  assert.equal(validateDecisionExplanationV3(mutated).valid, false);
  assert.ok(
    validateDecisionExplanationV3(mutated).issues.includes("fingerprint-mismatch")
  );
});

test("recheck risk is disclosed before a generic stability statement", () => {
  const explanation = evaluateDecisionExplanationV3(createInput({
    recheckRequired: true,
  }));

  assert.equal(explanation.uncertainty.claimCode, "uncertainty:recheck-required");
  assert.ok(
    explanation.uncertainty.evidenceIds.some(
      (id) => id.includes("recheck")
    )
  );
});
