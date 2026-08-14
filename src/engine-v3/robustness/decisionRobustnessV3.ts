import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
} from "../contract/stableHashV3";

import type {
  StayOfferIntegritySnapshotV3,
} from "../integrity/stayOfferIntegrityV3";

import type {
  StayOptiDecisionGeometryV3,
  StayOptiGeometryCandidateEvaluationV3,
} from "../geometry/decisionGeometryV3";

import {
  createBudgetUtilityV3,
  validatePersonalUtilityEvaluationV3,
  type StayOptiPersonalUtilityEvaluationV3,
  type StayOptiUtilityDimensionV3,
} from "../utility/personalUtilityV3";

export const STAYOPTI_ROBUSTNESS_SCENARIOS_V3 = [
  "baseline",
  "budget-tight",
  "budget-relaxed",
  "savings-priority",
  "quality-priority",
  "location-priority",
  "comfort-priority",
  "flexibility-priority",
  "evidence-downside",
] as const;

export type StayOptiRobustnessScenarioIdV3 =
  typeof STAYOPTI_ROBUSTNESS_SCENARIOS_V3[number];

export type StayOptiRiskSignalCodeV3 =
  | "source-choice-risk"
  | "cost-provisional"
  | "cost-incomplete"
  | "cost-conflicting"
  | "taxes-estimated"
  | "taxes-unknown"
  | "taxes-conflicting"
  | "fees-unknown"
  | "cancellation-conditional"
  | "cancellation-non-refundable"
  | "cancellation-unknown"
  | "pay-now-non-refundable"
  | "bookability-recheck"
  | "bookability-unknown"
  | "bookability-sold-out"
  | "offer-stale"
  | "offer-snapshot-missing";

export type StayOptiRobustnessCandidateStatusV3 =
  | "usable"
  | "ineligible"
  | "incomplete";

export type StayOptiAbstentionCodeV3 =
  | "no-feasible-solution"
  | "insufficient-evidence"
  | "no-good-option"
  | "indistinguishable-options"
  | "unstable-choice";

export type StayOptiConstraintRelaxationKindV3 =
  | "budget-increase"
  | "distance-increase"
  | "date-flexibility"
  | "category-relaxation";

export interface EvaluateStayOptiRobustnessCandidateV3 {
  hotelId: string;
  solutionId: string | null;
  eligible: boolean;
  utility: StayOptiPersonalUtilityEvaluationV3;
  geometry: StayOptiGeometryCandidateEvaluationV3;
  offerSnapshot: StayOfferIntegritySnapshotV3 | null;
  sourceRiskScore: number | null;
  sourceRiskLevel: "low" | "medium" | "high" | null;
}

export interface StayOptiConstraintRelaxationCandidateV3 {
  relaxationId: string;
  kind: StayOptiConstraintRelaxationKindV3;
  changeAmount: number;
  changeUnit: "currency" | "kilometres" | "days" | "category-step";
  normalizedChange: number;
  expectedRiskAdjustedUtility: number;
  newlyEligibleHotelIds: string[];
  evidenceStatus: "verified" | "estimated" | "unknown";
}

export interface StayOptiDecisionRobustnessOptionsV3 {
  riskPenaltyMaximum?: number;
  uncertaintyWidthMaximum?: number;
  scenarioTieTolerance?: number;
  nearTieTolerance?: number;
  indistinguishableTolerance?: number;
  noGoodUtilityThreshold?: number;
  minimumEvidenceStrength?: number;
  minimumRelaxationGain?: number;
}

export interface StayOptiRiskSignalV3 {
  code: StayOptiRiskSignalCodeV3;
  severity: number;
  evidenceIds: string[];
}

export interface StayOptiRobustnessCandidateEvaluationV3 {
  hotelId: string;
  solutionId: string | null;
  status: StayOptiRobustnessCandidateStatusV3;
  utilityScore: number | null;
  sourceRiskScore: number | null;
  canonicalRiskFloor: number;
  choiceRiskScore: number;
  choiceRiskLevel: "low" | "medium" | "high";
  riskPenalty: number;
  evidenceStrength: number;
  uncertaintyWidth: number;
  riskAdjustedUtility: number | null;
  downsideUtility: number | null;
  comparablePeerHotelIds: string[];
  riskSignals: StayOptiRiskSignalV3[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiScenarioCandidateScoreV3 {
  hotelId: string;
  riskAdjustedUtility: number;
}

export interface StayOptiRobustnessScenarioV3 {
  scenarioId: StayOptiRobustnessScenarioIdV3;
  status: "evaluated" | "not-applicable";
  candidateScores: StayOptiScenarioCandidateScoreV3[];
  winnerHotelIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiCandidateRegretV3 {
  hotelId: string;
  scenarioCount: number;
  winRate: number;
  expectedRegret: number;
  maximumRegret: number;
  robustChoiceScore: number;
}

export interface StayOptiNearTieV3 {
  status: "detected" | "not-detected" | "unavailable";
  hotelIds: string[];
  riskAdjustedUtilityDelta: number | null;
  indistinguishable: boolean;
}

export interface StayOptiNoGoodOptionV3 {
  status: "detected" | "not-detected" | "unavailable";
  bestRiskAdjustedUtility: number | null;
  bestDownsideUtility: number | null;
}

export interface StayOptiConstraintRelaxationEvaluationV3 {
  status: "recommended" | "not-needed" | "unavailable";
  selected: StayOptiConstraintRelaxationCandidateV3 | null;
  consideredRelaxationIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiDecisionRobustnessV3 {
  evaluationId: string;
  phase: "v3-05";
  rankingApplication: "shadow-only";
  status: "usable" | "partial" | "unavailable";
  anchorHotelId: string | null;
  comparisonCohortHotelIds: string[];
  candidates: StayOptiRobustnessCandidateEvaluationV3[];
  scenarios: StayOptiRobustnessScenarioV3[];
  candidateRegret: StayOptiCandidateRegretV3[];
  robustChoiceHotelId: string | null;
  robustChoiceScore: number | null;
  expectedRegret: number | null;
  maximumRegret: number | null;
  nearTie: StayOptiNearTieV3;
  noGoodOption: StayOptiNoGoodOptionV3;
  recommendationPolicy: "recommend" | "abstain";
  policyPreferredHotelId: string | null;
  abstentionCode: StayOptiAbstentionCodeV3 | null;
  constraintRelaxation: StayOptiConstraintRelaxationEvaluationV3;
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

type ResolvedOptions = Required<StayOptiDecisionRobustnessOptionsV3>;

type ScenarioScoreInput = {
  candidate: EvaluateStayOptiRobustnessCandidateV3;
  evaluation: StayOptiRobustnessCandidateEvaluationV3;
};

const DEFAULT_OPTIONS: ResolvedOptions = {
  riskPenaltyMaximum: 14,
  uncertaintyWidthMaximum: 12,
  scenarioTieTolerance: 0.75,
  nearTieTolerance: 1.5,
  indistinguishableTolerance: 0.5,
  noGoodUtilityThreshold: 45,
  minimumEvidenceStrength: 0.35,
  minimumRelaxationGain: 2,
};

const PREFERENCE_SCENARIO_DIMENSION: Readonly<
  Partial<Record<StayOptiRobustnessScenarioIdV3, StayOptiUtilityDimensionV3>>
> = {
  "savings-priority": "priceValue",
  "quality-priority": "quality",
  "location-priority": "location",
  "comfort-priority": "comfort",
  "flexibility-priority": "flexibility",
};

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function normalizeScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : null;
}

function resolveOptions(
  options: StayOptiDecisionRobustnessOptionsV3
): ResolvedOptions {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const positiveKeys: Array<keyof ResolvedOptions> = [
    "riskPenaltyMaximum",
    "uncertaintyWidthMaximum",
    "scenarioTieTolerance",
    "nearTieTolerance",
    "indistinguishableTolerance",
    "noGoodUtilityThreshold",
    "minimumRelaxationGain",
  ];

  for (const key of positiveKeys) {
    if (!Number.isFinite(resolved[key]) || resolved[key] < 0) {
      throw new Error(`Invalid V3-05 robustness option: ${key}.`);
    }
  }

  if (
    !Number.isFinite(resolved.minimumEvidenceStrength) ||
    resolved.minimumEvidenceStrength < 0 ||
    resolved.minimumEvidenceStrength > 1 ||
    resolved.indistinguishableTolerance > resolved.nearTieTolerance
  ) {
    throw new Error("Invalid V3-05 evidence or near-tie thresholds.");
  }

  return resolved;
}

function addRiskSignal(
  signals: StayOptiRiskSignalV3[],
  code: StayOptiRiskSignalCodeV3,
  severity: number,
  evidenceIds: readonly string[] = []
) {
  signals.push({
    code,
    severity: clamp(severity, 0, 100),
    evidenceIds: uniqueSorted(evidenceIds),
  });
}

function createRiskSignals(
  candidate: EvaluateStayOptiRobustnessCandidateV3
) {
  const signals: StayOptiRiskSignalV3[] = [];
  const sourceRiskScore = normalizeScore(candidate.sourceRiskScore);

  if (sourceRiskScore !== null && sourceRiskScore > 0) {
    addRiskSignal(signals, "source-choice-risk", sourceRiskScore);
  }

  const snapshot = candidate.offerSnapshot;
  if (snapshot === null) {
    addRiskSignal(signals, "offer-snapshot-missing", 55);
    return signals;
  }

  const costEvidenceIds = uniqueSorted([
    ...snapshot.cost.total.evidenceIds,
    ...snapshot.cost.taxes.evidenceIds,
    ...snapshot.cost.fees.evidenceIds,
  ]);

  if (snapshot.cost.integrityStatus === "provisional") {
    addRiskSignal(signals, "cost-provisional", 35, costEvidenceIds);
  }
  else if (snapshot.cost.integrityStatus === "incomplete") {
    addRiskSignal(signals, "cost-incomplete", 75, costEvidenceIds);
  }
  else if (snapshot.cost.integrityStatus === "conflicting") {
    addRiskSignal(signals, "cost-conflicting", 100, costEvidenceIds);
  }

  if (snapshot.cost.taxes.state === "estimated") {
    addRiskSignal(signals, "taxes-estimated", 15, snapshot.cost.taxes.evidenceIds);
  }
  else if (snapshot.cost.taxes.state === "unknown") {
    addRiskSignal(signals, "taxes-unknown", 35, snapshot.cost.taxes.evidenceIds);
  }
  else if (snapshot.cost.taxes.state === "conflicting") {
    addRiskSignal(signals, "taxes-conflicting", 80, snapshot.cost.taxes.evidenceIds);
  }

  if (snapshot.cost.fees.state === "unknown") {
    addRiskSignal(signals, "fees-unknown", 20, snapshot.cost.fees.evidenceIds);
  }

  if (snapshot.cancellation.status === "conditional") {
    addRiskSignal(signals, "cancellation-conditional", 20);
  }
  else if (snapshot.cancellation.status === "non-refundable") {
    addRiskSignal(signals, "cancellation-non-refundable", 40);
  }
  else if (snapshot.cancellation.status === "unknown") {
    addRiskSignal(signals, "cancellation-unknown", 30);
  }

  if (
    snapshot.cancellation.status === "non-refundable" &&
    snapshot.payment.timing === "pay-now"
  ) {
    addRiskSignal(signals, "pay-now-non-refundable", 45);
  }

  if (snapshot.bookability.status === "recheck-required") {
    addRiskSignal(
      signals,
      "bookability-recheck",
      35,
      snapshot.bookability.evidenceIds
    );
  }
  else if (snapshot.bookability.status === "unknown") {
    addRiskSignal(
      signals,
      "bookability-unknown",
      55,
      snapshot.bookability.evidenceIds
    );
  }
  else if (snapshot.bookability.status === "sold-out") {
    addRiskSignal(
      signals,
      "bookability-sold-out",
      100,
      snapshot.bookability.evidenceIds
    );
  }

  if (snapshot.bookability.freshness === "stale") {
    addRiskSignal(
      signals,
      "offer-stale",
      35,
      snapshot.bookability.evidenceIds
    );
  }

  return signals.sort(
    (first, second) => second.severity - first.severity || first.code.localeCompare(second.code)
  );
}

function canonicalRiskFloor(signals: readonly StayOptiRiskSignalV3[]) {
  const canonical = signals.filter((signal) => signal.code !== "source-choice-risk");
  if (canonical.length === 0) {
    return 0;
  }

  const [largest, ...remaining] = canonical.map((signal) => signal.severity);
  return round(clamp(largest + remaining.reduce((sum, value) => sum + value * 0.12, 0), 0, 100), 4);
}

function snapshotEvidenceStrength(snapshot: StayOfferIntegritySnapshotV3 | null) {
  if (snapshot === null) {
    return 0.25;
  }

  const costStrength = snapshot.cost.integrityStatus === "complete"
    ? 1
    : snapshot.cost.integrityStatus === "provisional"
      ? 0.7
      : snapshot.cost.integrityStatus === "incomplete"
        ? 0.3
        : 0;

  const bookabilityStrength = snapshot.bookability.status === "bookable"
    ? snapshot.bookability.freshness === "fresh" ? 1 : 0.75
    : snapshot.bookability.status === "recheck-required"
      ? 0.65
      : snapshot.bookability.status === "unknown"
        ? 0.35
        : 0;

  return round((costStrength + bookabilityStrength) / 2, 6);
}

function createCandidateEvaluation(
  candidate: EvaluateStayOptiRobustnessCandidateV3,
  options: ResolvedOptions
): StayOptiRobustnessCandidateEvaluationV3 {
  if (
    candidate.hotelId.trim().length === 0 ||
    candidate.utility.hotelId !== candidate.hotelId ||
    candidate.geometry.hotelId !== candidate.hotelId ||
    !validatePersonalUtilityEvaluationV3(candidate.utility).valid ||
    (candidate.offerSnapshot !== null && candidate.offerSnapshot.hotelId !== candidate.hotelId)
  ) {
    throw new Error(`Invalid V3-05 candidate evidence for ${candidate.hotelId || "<missing>"}.`);
  }

  const sourceRiskScore = normalizeScore(candidate.sourceRiskScore);
  const signals = createRiskSignals(candidate);
  const canonicalFloor = canonicalRiskFloor(signals);
  const choiceRiskScore = round(Math.max(sourceRiskScore ?? 0, canonicalFloor), 4);
  const choiceRiskLevel = choiceRiskScore >= 70
    ? "high"
    : choiceRiskScore >= 35
      ? "medium"
      : "low";

  const completenessStrength =
    candidate.utility.evidenceCoverage * 0.6 +
    snapshotEvidenceStrength(candidate.offerSnapshot) * 0.4;
  const evidenceStrength = round(clamp(
    Math.sqrt(candidate.utility.scoreConfidence * completenessStrength),
    0,
    1
  ), 6);

  const utilityScore = candidate.utility.utilityScore;
  const riskPenalty = round(choiceRiskScore / 100 * options.riskPenaltyMaximum, 6);
  const uncertaintyWidth = round((1 - evidenceStrength) * options.uncertaintyWidthMaximum, 6);

  const snapshotUsable = candidate.offerSnapshot !== null &&
    candidate.offerSnapshot.cost.integrityStatus !== "incomplete" &&
    candidate.offerSnapshot.cost.integrityStatus !== "conflicting" &&
    candidate.offerSnapshot.bookability.status !== "sold-out";

  const status: StayOptiRobustnessCandidateStatusV3 = !candidate.eligible
    ? "ineligible"
    : utilityScore === null || candidate.utility.status !== "usable" || !snapshotUsable
      ? "incomplete"
      : "usable";

  const riskAdjustedUtility = status === "usable" && utilityScore !== null
    ? round(clamp(utilityScore - riskPenalty, 0, 100), 6)
    : null;

  const downsideUtility = riskAdjustedUtility === null
    ? null
    : round(clamp(riskAdjustedUtility - uncertaintyWidth, 0, 100), 6);

  return {
    hotelId: candidate.hotelId,
    solutionId: candidate.solutionId,
    status,
    utilityScore,
    sourceRiskScore,
    canonicalRiskFloor: canonicalFloor,
    choiceRiskScore,
    choiceRiskLevel,
    riskPenalty,
    evidenceStrength,
    uncertaintyWidth,
    riskAdjustedUtility,
    downsideUtility,
    comparablePeerHotelIds: uniqueSorted(candidate.geometry.comparablePeerHotelIds),
    riskSignals: signals,
    reasonCodes: uniqueReasonCodesV3([
      "risk:shadow-only",
      ...(status === "usable" ? ["risk:evaluated" as const] : ["risk:insufficient-evidence" as const]),
      ...(sourceRiskScore !== null ? ["risk:source-score-used" as const] : []),
      ...(canonicalFloor > 0 ? ["risk:canonical-floor-applied" as const] : []),
      "risk:uncertainty-separate",
    ]),
  };
}

function scoreWithPerturbedWeight(
  utility: StayOptiPersonalUtilityEvaluationV3,
  dimension: StayOptiUtilityDimensionV3,
  multiplier: number
) {
  const available = utility.contributions.filter(
    (contribution) => contribution.available && contribution.transformedScore !== null
  );

  const weightTotal = available.reduce(
    (sum, contribution) => sum + contribution.configuredWeight *
      (contribution.dimension === dimension ? multiplier : 1),
    0
  );

  if (weightTotal <= 0) {
    return null;
  }

  return round(available.reduce((sum, contribution) => {
    const weight = contribution.configuredWeight *
      (contribution.dimension === dimension ? multiplier : 1);
    return sum + (contribution.transformedScore as number) * weight / weightTotal;
  }, 0), 6);
}

function scoreWithBudget(
  utility: StayOptiPersonalUtilityEvaluationV3,
  budgetMultiplier: number
) {
  const totalCost = utility.context.totalCost;
  const totalBudget = utility.context.totalBudget;
  if (totalCost === null || totalBudget === null || totalCost <= 0 || totalBudget <= 0) {
    return null;
  }

  const replacement = createBudgetUtilityV3(totalCost, totalBudget * budgetMultiplier);
  return round(utility.contributions.reduce((sum, contribution) => {
    if (!contribution.available || contribution.transformedScore === null) {
      return sum;
    }
    const score = contribution.dimension === "priceValue"
      ? replacement
      : contribution.transformedScore;
    return sum + score * contribution.normalizedAvailableWeight;
  }, 0), 6);
}

function scoreEvidenceDownside(
  utility: StayOptiPersonalUtilityEvaluationV3
) {
  const available = utility.contributions.filter(
    (contribution) => contribution.available && contribution.transformedScore !== null
  );
  if (available.length === 0) {
    return null;
  }

  return round(available.reduce((sum, contribution) => {
    const pessimisticScore = clamp(
      (contribution.transformedScore as number) - (1 - contribution.confidence) * 20,
      0,
      100
    );
    return sum + pessimisticScore * contribution.normalizedAvailableWeight;
  }, 0), 6);
}

function scenarioUtility(
  candidate: EvaluateStayOptiRobustnessCandidateV3,
  evaluation: StayOptiRobustnessCandidateEvaluationV3,
  scenarioId: StayOptiRobustnessScenarioIdV3
) {
  if (evaluation.status !== "usable" || evaluation.utilityScore === null) {
    return null;
  }

  let rawUtility: number | null = evaluation.utilityScore;
  if (scenarioId === "budget-tight") {
    rawUtility = scoreWithBudget(candidate.utility, 0.9);
  }
  else if (scenarioId === "budget-relaxed") {
    rawUtility = scoreWithBudget(candidate.utility, 1.1);
  }
  else if (scenarioId === "evidence-downside") {
    rawUtility = scoreEvidenceDownside(candidate.utility);
  }
  else {
    const dimension = PREFERENCE_SCENARIO_DIMENSION[scenarioId];
    if (dimension !== undefined) {
      rawUtility = scoreWithPerturbedWeight(candidate.utility, dimension, 1.25);
    }
  }

  if (rawUtility === null) {
    return null;
  }

  const uncertaintyPenalty = scenarioId === "evidence-downside"
    ? evaluation.uncertaintyWidth
    : 0;

  return round(clamp(rawUtility - evaluation.riskPenalty - uncertaintyPenalty, 0, 100), 6);
}

function createComparisonCohort(
  candidates: readonly StayOptiRobustnessCandidateEvaluationV3[],
  requestedAnchorHotelId: string | null
) {
  const usable = candidates.filter((candidate) => candidate.status === "usable");
  const requestedAnchor = usable.find((candidate) => candidate.hotelId === requestedAnchorHotelId);
  const anchor = requestedAnchor ?? usable.slice().sort(
    (first, second) =>
      (second.riskAdjustedUtility as number) - (first.riskAdjustedUtility as number) ||
      first.hotelId.localeCompare(second.hotelId)
  )[0] ?? null;

  if (anchor === null) {
    return { anchorHotelId: null, hotelIds: [] as string[] };
  }

  const peers = usable.filter((candidate) =>
    candidate.hotelId === anchor.hotelId ||
    (
      anchor.comparablePeerHotelIds.includes(candidate.hotelId) &&
      candidate.comparablePeerHotelIds.includes(anchor.hotelId)
    )
  );

  return {
    anchorHotelId: anchor.hotelId,
    hotelIds: peers.map((candidate) => candidate.hotelId).sort(),
  };
}

function createScenarios(
  sourceByHotelId: ReadonlyMap<string, ScenarioScoreInput>,
  cohortHotelIds: readonly string[],
  options: ResolvedOptions
) {
  return STAYOPTI_ROBUSTNESS_SCENARIOS_V3.map(
    (scenarioId): StayOptiRobustnessScenarioV3 => {
      const scores = cohortHotelIds.flatMap((hotelId) => {
        const source = sourceByHotelId.get(hotelId);
        if (source === undefined) {
          return [];
        }
        const score = scenarioUtility(source.candidate, source.evaluation, scenarioId);
        return score === null ? [] : [{ hotelId, riskAdjustedUtility: score }];
      }).sort(
        (first, second) =>
          second.riskAdjustedUtility - first.riskAdjustedUtility ||
          first.hotelId.localeCompare(second.hotelId)
      );

      if (scores.length === 0) {
        return {
          scenarioId,
          status: "not-applicable",
          candidateScores: [],
          winnerHotelIds: [],
          reasonCodes: ["robustness:scenario-not-applicable"],
        };
      }

      const best = scores[0].riskAdjustedUtility;
      const winners = scores.filter(
        (score) => best - score.riskAdjustedUtility <= options.scenarioTieTolerance
      ).map((score) => score.hotelId).sort();

      return {
        scenarioId,
        status: "evaluated",
        candidateScores: scores,
        winnerHotelIds: winners,
        reasonCodes: ["robustness:scenario-evaluated"],
      };
    }
  );
}

function createCandidateRegret(
  cohortHotelIds: readonly string[],
  scenarios: readonly StayOptiRobustnessScenarioV3[],
  evaluationByHotelId: ReadonlyMap<string, StayOptiRobustnessCandidateEvaluationV3>
) {
  const evaluated = scenarios.filter((scenario) => scenario.status === "evaluated");

  return cohortHotelIds.map((hotelId): StayOptiCandidateRegretV3 => {
    const regrets = evaluated.flatMap((scenario) => {
      const candidateScore = scenario.candidateScores.find((score) => score.hotelId === hotelId);
      if (candidateScore === undefined || scenario.candidateScores.length === 0) {
        return [];
      }
      return [round(scenario.candidateScores[0].riskAdjustedUtility - candidateScore.riskAdjustedUtility, 6)];
    });

    const wins = evaluated.filter((scenario) => scenario.winnerHotelIds.includes(hotelId)).length;
    const expectedRegret = regrets.length === 0
      ? 0
      : round(regrets.reduce((sum, regret) => sum + regret, 0) / regrets.length, 6);
    const maximumRegret = regrets.length === 0 ? 0 : Math.max(...regrets);
    const winRate = evaluated.length === 0 ? 0 : round(wins / evaluated.length, 6);
    const evidenceStrength = evaluationByHotelId.get(hotelId)?.evidenceStrength ?? 0;
    const regretProtection = 1 - clamp(expectedRegret / 10, 0, 1);
    const robustChoiceScore = round(
      100 * (winRate * 0.5 + regretProtection * 0.3 + evidenceStrength * 0.2),
      4
    );

    return {
      hotelId,
      scenarioCount: regrets.length,
      winRate,
      expectedRegret,
      maximumRegret: round(maximumRegret, 6),
      robustChoiceScore,
    };
  }).sort(
    (first, second) =>
      second.robustChoiceScore - first.robustChoiceScore ||
      first.expectedRegret - second.expectedRegret ||
      first.hotelId.localeCompare(second.hotelId)
  );
}

function detectNearTie(
  baseline: StayOptiRobustnessScenarioV3 | undefined,
  candidateRegret: readonly StayOptiCandidateRegretV3[],
  options: ResolvedOptions
): StayOptiNearTieV3 {
  if (baseline?.status !== "evaluated" || baseline.candidateScores.length < 2) {
    return {
      status: "unavailable",
      hotelIds: [],
      riskAdjustedUtilityDelta: null,
      indistinguishable: false,
    };
  }

  const [first, second] = baseline.candidateScores;
  const delta = round(first.riskAdjustedUtility - second.riskAdjustedUtility, 6);
  const firstRobust = candidateRegret.find((candidate) => candidate.hotelId === first.hotelId);
  const secondRobust = candidateRegret.find((candidate) => candidate.hotelId === second.hotelId);
  const robustDelta = firstRobust === undefined || secondRobust === undefined
    ? Number.POSITIVE_INFINITY
    : Math.abs(firstRobust.robustChoiceScore - secondRobust.robustChoiceScore);

  return {
    status: delta <= options.nearTieTolerance ? "detected" : "not-detected",
    hotelIds: delta <= options.nearTieTolerance
      ? [first.hotelId, second.hotelId].sort()
      : [],
    riskAdjustedUtilityDelta: delta,
    indistinguishable:
      delta <= options.indistinguishableTolerance && robustDelta <= 3,
  };
}

function detectNoGoodOption(
  robustChoice: StayOptiRobustnessCandidateEvaluationV3 | null,
  options: ResolvedOptions
): StayOptiNoGoodOptionV3 {
  if (
    robustChoice === null ||
    robustChoice.riskAdjustedUtility === null ||
    robustChoice.downsideUtility === null
  ) {
    return {
      status: "unavailable",
      bestRiskAdjustedUtility: null,
      bestDownsideUtility: null,
    };
  }

  const strongCandidate =
    robustChoice.riskAdjustedUtility >= 60 &&
    robustChoice.evidenceStrength >= 0.65 &&
    robustChoice.choiceRiskScore < 60;

  const detected = !strongCandidate && (
    robustChoice.riskAdjustedUtility < options.noGoodUtilityThreshold ||
    (robustChoice.downsideUtility < 40 && robustChoice.choiceRiskScore >= 60)
  );

  return {
    status: detected ? "detected" : "not-detected",
    bestRiskAdjustedUtility: robustChoice.riskAdjustedUtility,
    bestDownsideUtility: robustChoice.downsideUtility,
  };
}

function resolveAbstention(
  anchorHotelId: string | null,
  robustChoice: StayOptiCandidateRegretV3 | null,
  candidateRegret: readonly StayOptiCandidateRegretV3[],
  robustChoiceEvaluation: StayOptiRobustnessCandidateEvaluationV3 | null,
  nearTie: StayOptiNearTieV3,
  noGoodOption: StayOptiNoGoodOptionV3,
  options: ResolvedOptions
): StayOptiAbstentionCodeV3 | null {
  if (robustChoice === null || robustChoiceEvaluation === null) {
    return "no-feasible-solution";
  }
  if (robustChoiceEvaluation.evidenceStrength < options.minimumEvidenceStrength) {
    return "insufficient-evidence";
  }
  if (noGoodOption.status === "detected") {
    return "no-good-option";
  }
  if (nearTie.indistinguishable) {
    return "indistinguishable-options";
  }

  const anchorRegret = anchorHotelId === null
    ? null
    : candidateRegret.find((candidate) => candidate.hotelId === anchorHotelId) ?? null;

  if (
    anchorHotelId !== null &&
    robustChoice.hotelId !== anchorHotelId &&
    anchorRegret !== null &&
    anchorRegret.winRate < 0.4 &&
    robustChoice.robustChoiceScore - anchorRegret.robustChoiceScore >= 8
  ) {
    return "unstable-choice";
  }

  return null;
}

function validateRelaxationCandidate(
  candidate: StayOptiConstraintRelaxationCandidateV3
) {
  return candidate.relaxationId.trim().length > 0 &&
    Number.isFinite(candidate.changeAmount) && candidate.changeAmount > 0 &&
    Number.isFinite(candidate.normalizedChange) && candidate.normalizedChange > 0 &&
    Number.isFinite(candidate.expectedRiskAdjustedUtility) &&
    candidate.expectedRiskAdjustedUtility >= 0 &&
    candidate.expectedRiskAdjustedUtility <= 100;
}

function evaluateConstraintRelaxation(
  abstentionCode: StayOptiAbstentionCodeV3 | null,
  currentBestUtility: number | null,
  candidates: readonly StayOptiConstraintRelaxationCandidateV3[],
  options: ResolvedOptions
): StayOptiConstraintRelaxationEvaluationV3 {
  if (abstentionCode === null) {
    return {
      status: "not-needed",
      selected: null,
      consideredRelaxationIds: [],
      reasonCodes: ["relaxation:not-needed"],
    };
  }

  const baseline = currentBestUtility ?? 0;
  const verified = candidates.filter(
    (candidate) =>
      validateRelaxationCandidate(candidate) &&
      candidate.evidenceStatus === "verified" &&
      candidate.expectedRiskAdjustedUtility - baseline >= options.minimumRelaxationGain
  ).sort((first, second) => {
    const firstEfficiency =
      (first.expectedRiskAdjustedUtility - baseline) / first.normalizedChange;
    const secondEfficiency =
      (second.expectedRiskAdjustedUtility - baseline) / second.normalizedChange;
    return secondEfficiency - firstEfficiency ||
      first.normalizedChange - second.normalizedChange ||
      first.relaxationId.localeCompare(second.relaxationId);
  });

  if (verified.length === 0) {
    return {
      status: "unavailable",
      selected: null,
      consideredRelaxationIds: candidates
        .filter(validateRelaxationCandidate)
        .map((candidate) => candidate.relaxationId)
        .sort(),
      reasonCodes: ["relaxation:unavailable"],
    };
  }

  return {
    status: "recommended",
    selected: verified[0],
    consideredRelaxationIds: verified.map((candidate) => candidate.relaxationId),
    reasonCodes: ["relaxation:recommended"],
  };
}

function createFingerprint(
  evaluation: Omit<StayOptiDecisionRobustnessV3, "fingerprint">
) {
  return createStableHashV3(evaluation, "stayopti-v3-decision-robustness");
}

export function evaluateDecisionRobustnessV3(input: {
  candidates: readonly EvaluateStayOptiRobustnessCandidateV3[];
  decisionGeometry: StayOptiDecisionGeometryV3;
  anchorHotelId?: string | null;
  constraintRelaxations?: readonly StayOptiConstraintRelaxationCandidateV3[];
  options?: StayOptiDecisionRobustnessOptionsV3;
}): StayOptiDecisionRobustnessV3 {
  const options = resolveOptions(input.options ?? {});
  const hotelIds = input.candidates.map((candidate) => candidate.hotelId);
  if (new Set(hotelIds).size !== hotelIds.length) {
    throw new Error("V3-05 robustness requires unique hotel IDs.");
  }

  const geometryIds = input.decisionGeometry.candidates
    .map((candidate) => candidate.hotelId)
    .sort();
  if (JSON.stringify([...hotelIds].sort()) !== JSON.stringify(geometryIds)) {
    throw new Error("V3-05 robustness candidates must exactly cover Decision Geometry.");
  }

  const candidates = input.candidates
    .map((candidate) => createCandidateEvaluation(candidate, options))
    .sort((first, second) => first.hotelId.localeCompare(second.hotelId));

  const candidateByHotelId = new Map(
    candidates.map((candidate) => [candidate.hotelId, candidate])
  );
  const sourceByHotelId = new Map<string, ScenarioScoreInput>(
    input.candidates.map((candidate) => {
      const evaluation = candidateByHotelId.get(candidate.hotelId);
      if (evaluation === undefined) {
        throw new Error(`Missing V3-05 candidate evaluation for ${candidate.hotelId}.`);
      }
      return [candidate.hotelId, { candidate, evaluation }];
    })
  );

  const cohort = createComparisonCohort(candidates, input.anchorHotelId ?? null);
  const scenarios = createScenarios(sourceByHotelId, cohort.hotelIds, options);
  const candidateRegret = createCandidateRegret(
    cohort.hotelIds,
    scenarios,
    candidateByHotelId
  );
  const robustChoice = candidateRegret[0] ?? null;
  const robustChoiceEvaluation = robustChoice === null
    ? null
    : candidateByHotelId.get(robustChoice.hotelId) ?? null;
  const baseline = scenarios.find((scenario) => scenario.scenarioId === "baseline");
  const nearTie = detectNearTie(baseline, candidateRegret, options);
  const noGoodOption = detectNoGoodOption(robustChoiceEvaluation, options);
  const abstentionCode = resolveAbstention(
    cohort.anchorHotelId,
    robustChoice,
    candidateRegret,
    robustChoiceEvaluation,
    nearTie,
    noGoodOption,
    options
  );
  const recommendationPolicy = abstentionCode === null ? "recommend" : "abstain";
  const constraintRelaxation = evaluateConstraintRelaxation(
    abstentionCode,
    robustChoiceEvaluation?.riskAdjustedUtility ?? null,
    input.constraintRelaxations ?? [],
    options
  );

  const usableCount = candidates.filter((candidate) => candidate.status === "usable").length;
  const status: StayOptiDecisionRobustnessV3["status"] = usableCount === 0
    ? "unavailable"
    : usableCount === candidates.length
      ? "usable"
      : "partial";

  const reasonCodes = uniqueReasonCodesV3([
    "risk:shadow-only",
    "robustness:shadow-only",
    ...(usableCount > 0 ? ["risk:evaluated" as const, "robustness:evaluated" as const, "regret:evaluated" as const] : []),
    ...(nearTie.status === "detected" ? ["robustness:near-tie" as const] : []),
    ...(noGoodOption.status === "detected" ? ["robustness:no-good-option" as const] : []),
    ...(robustChoice !== null && robustChoice.winRate >= 0.7
      ? ["robustness:scenario-stable" as const]
      : usableCount > 0
        ? ["robustness:scenario-unstable" as const]
        : []),
    ...(abstentionCode === null
      ? ["abstention:not-required" as const]
      : abstentionCode === "no-feasible-solution"
        ? ["abstention:no-feasible-solution" as const]
        : abstentionCode === "insufficient-evidence"
          ? ["abstention:insufficient-evidence" as const]
          : abstentionCode === "no-good-option"
            ? ["abstention:no-good-option" as const]
            : abstentionCode === "indistinguishable-options"
              ? ["abstention:indistinguishable-options" as const]
              : ["abstention:unstable-choice" as const]),
    ...constraintRelaxation.reasonCodes,
  ]);

  const withoutFingerprint: Omit<StayOptiDecisionRobustnessV3, "fingerprint"> = {
    evaluationId: createStableHashV3({
      geometryFingerprint: input.decisionGeometry.fingerprint,
      utilityFingerprints: input.candidates.map((candidate) => candidate.utility.fingerprint).sort(),
      sourceRisk: input.candidates.map((candidate) => ({
        hotelId: candidate.hotelId,
        sourceRiskScore: candidate.sourceRiskScore,
        sourceRiskLevel: candidate.sourceRiskLevel,
        snapshotId: candidate.offerSnapshot?.snapshotId ?? null,
      })).sort((first, second) => first.hotelId.localeCompare(second.hotelId)),
      anchorHotelId: input.anchorHotelId ?? null,
      options,
      constraintRelaxations: input.constraintRelaxations ?? [],
    }, "stayopti-v3-decision-robustness-evaluation"),
    phase: "v3-05",
    rankingApplication: "shadow-only",
    status,
    anchorHotelId: cohort.anchorHotelId,
    comparisonCohortHotelIds: cohort.hotelIds,
    candidates,
    scenarios,
    candidateRegret,
    robustChoiceHotelId: robustChoice?.hotelId ?? null,
    robustChoiceScore: robustChoice?.robustChoiceScore ?? null,
    expectedRegret: robustChoice?.expectedRegret ?? null,
    maximumRegret: robustChoice?.maximumRegret ?? null,
    nearTie,
    noGoodOption,
    recommendationPolicy,
    policyPreferredHotelId: recommendationPolicy === "recommend"
      ? robustChoice?.hotelId ?? null
      : null,
    abstentionCode,
    constraintRelaxation,
    reasonCodes,
  };

  return {
    ...withoutFingerprint,
    fingerprint: createFingerprint(withoutFingerprint),
  };
}

export function validateDecisionRobustnessV3(
  evaluation: StayOptiDecisionRobustnessV3
) {
  const { fingerprint: ignoredFingerprint, ...withoutFingerprint } = evaluation;
  const candidateIds = evaluation.candidates.map((candidate) => candidate.hotelId);
  const uniqueCandidateIds = new Set(candidateIds).size === candidateIds.length;
  const cohortValid = evaluation.comparisonCohortHotelIds.every(
    (hotelId) => candidateIds.includes(hotelId)
  );
  const candidatesValid = evaluation.candidates.every((candidate) =>
    candidate.hotelId.trim().length > 0 &&
    candidate.choiceRiskScore >= 0 && candidate.choiceRiskScore <= 100 &&
    candidate.evidenceStrength >= 0 && candidate.evidenceStrength <= 1 &&
    candidate.riskPenalty >= 0 &&
    candidate.uncertaintyWidth >= 0 &&
    (candidate.riskAdjustedUtility === null ||
      (Number.isFinite(candidate.riskAdjustedUtility) && candidate.riskAdjustedUtility >= 0 && candidate.riskAdjustedUtility <= 100)) &&
    (candidate.downsideUtility === null ||
      (Number.isFinite(candidate.downsideUtility) && candidate.downsideUtility >= 0 && candidate.downsideUtility <= 100))
  );
  const scenariosValid = evaluation.scenarios.every((scenario) =>
    scenario.candidateScores.every((score) =>
      candidateIds.includes(score.hotelId) &&
      Number.isFinite(score.riskAdjustedUtility) &&
      score.riskAdjustedUtility >= 0 && score.riskAdjustedUtility <= 100
    ) &&
    scenario.winnerHotelIds.every((hotelId) =>
      scenario.candidateScores.some((score) => score.hotelId === hotelId)
    )
  );
  const robustChoiceValid = evaluation.robustChoiceHotelId === null
    ? evaluation.robustChoiceScore === null && evaluation.expectedRegret === null
    : candidateIds.includes(evaluation.robustChoiceHotelId) &&
      evaluation.robustChoiceScore !== null &&
      evaluation.robustChoiceScore >= 0 && evaluation.robustChoiceScore <= 100 &&
      evaluation.expectedRegret !== null && evaluation.expectedRegret >= 0;
  const policyValid = evaluation.recommendationPolicy === "recommend"
    ? evaluation.abstentionCode === null &&
      evaluation.policyPreferredHotelId === evaluation.robustChoiceHotelId &&
      evaluation.policyPreferredHotelId !== null
    : evaluation.abstentionCode !== null && evaluation.policyPreferredHotelId === null;
  const relaxationValid = evaluation.constraintRelaxation.status === "recommended"
    ? evaluation.constraintRelaxation.selected !== null
    : evaluation.constraintRelaxation.selected === null;

  return {
    valid:
      evaluation.phase === "v3-05" &&
      evaluation.rankingApplication === "shadow-only" &&
      uniqueCandidateIds &&
      cohortValid &&
      candidatesValid &&
      scenariosValid &&
      robustChoiceValid &&
      policyValid &&
      relaxationValid &&
      evaluation.fingerprint === createFingerprint(withoutFingerprint),
  };
}

export function assertDecisionRobustnessV3(
  evaluation: StayOptiDecisionRobustnessV3
) {
  if (!validateDecisionRobustnessV3(evaluation).valid) {
    throw new Error("Invalid StayOpti V3-05 Decision Robustness evaluation.");
  }
  return evaluation;
}
