import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

export type StayOptiSourceSetCompletenessV3 =
  | "complete"
  | "partial"
  | "unknown";

export type StayOptiScaleCandidateDispositionV3 =
  | "retained-protected"
  | "retained-safe-bound"
  | "retained-missing-bound"
  | "pruned-ineligible"
  | "pruned-safe-bound";

export type StayOptiScaleScopeClaimV3 =
  | "complete-source-result-set"
  | "partial-source-result-set"
  | "current-analyzed-set";

export type StayOptiRelativeScarcityV3 =
  | "scarce-current-set"
  | "limited-current-set"
  | "ample-current-set"
  | "unknown";

export interface StayOptiScaleCandidateInputV3 {
  hotelId: string;
  eligible: boolean;
  coarseScoreLowerBound: number | null;
  coarseScoreUpperBound: number | null;
  fullDecisionScore: number | null;
  evidenceCoverage: number;
  protectedByPolicy: boolean;
}

export interface StayOptiSearchWideScaleOptionsV3 {
  fineEvaluationTarget?: number;
  outputCandidateLimit?: number;
  equivalenceTolerance?: number;
  strongAlternativeTolerance?: number;
  maximumCandidateCount?: number;
  maximumFineEvaluationCount?: number;
  maximumEstimatedWorkingBytes?: number;
  maximumCoarseOperationCount?: number;
}

export interface EvaluateStayOptiSearchWideScaleInputV3 {
  candidates: readonly StayOptiScaleCandidateInputV3[];
  sourceSetCompleteness?: StayOptiSourceSetCompletenessV3;
  sourceReportedHotelCount?: number | null;
  options?: StayOptiSearchWideScaleOptionsV3;
}

export interface StayOptiSearchWideScalePolicyV3 {
  fineEvaluationTarget: number;
  outputCandidateLimit: number;
  equivalenceTolerance: number;
  strongAlternativeTolerance: number;
  maximumCandidateCount: number;
  maximumFineEvaluationCount: number;
  maximumEstimatedWorkingBytes: number;
  maximumCoarseOperationCount: number;
}

export interface StayOptiScaleCandidateEvaluationV3
  extends StayOptiScaleCandidateInputV3 {
  retainedForFineEvaluation: boolean;
  disposition: StayOptiScaleCandidateDispositionV3;
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiSearchWideScopeV3 {
  sourceSetCompleteness: StayOptiSourceSetCompletenessV3;
  sourceReportedHotelCount: number | null;
  analyzedHotelCount: number;
  coverageRatioOfReportedSet: number | null;
  claimScope: StayOptiScaleScopeClaimV3;
  marketCoverageClaimAllowed: false;
  scopeLabel: "analyzed-set-not-market";
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiSearchWideContextV3 {
  analyzedHotelCount: number;
  eligibleHotelCount: number;
  fullScoreHotelCount: number;
  highEvidenceHotelCount: number;
  eligibleRatio: number | null;
  relativeScarcity: StayOptiRelativeScarcityV3;
  scarcityBasis: "current-analyzed-set-only";
  commercialUrgencyClaimAllowed: false;
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiScaleEquivalenceAuditV3 {
  status: "equivalent" | "not-equivalent" | "unavailable";
  tolerance: number;
  strongAlternativeTolerance: number;
  fullTopHotelIds: string[];
  coarseToFineTopHotelIds: string[];
  exactTopSetMatch: boolean;
  maximumTopScoreLoss: number | null;
  strongAlternativeHotelIds: string[];
  lostStrongAlternativeHotelIds: string[];
  boundViolationHotelIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiScaleWorkBudgetV3 {
  coarseOperationCount: number;
  fineEvaluationCount: number;
  estimatedWorkingBytes: number;
  candidateCountWithinBudget: boolean;
  coarseOperationsWithinBudget: boolean;
  fineEvaluationsWithinBudget: boolean;
  estimatedMemoryWithinBudget: boolean;
  withinBudget: boolean;
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiSearchWideScaleCoverageV3 {
  evaluationId: string;
  phase: "v3-08";
  rankingApplication: "shadow-only";
  runtimeApplication: "shadow-plan-only";
  publicPresentation: "disabled";
  status: "pass" | "blocked" | "unavailable";
  policy: StayOptiSearchWideScalePolicyV3;
  candidates: StayOptiScaleCandidateEvaluationV3[];
  retainedHotelIds: string[];
  prunedHotelIds: string[];
  safeCutoffLowerBound: number | null;
  scope: StayOptiSearchWideScopeV3;
  searchWideContext: StayOptiSearchWideContextV3;
  equivalence: StayOptiScaleEquivalenceAuditV3;
  workBudget: StayOptiScaleWorkBudgetV3;
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiSearchWideScaleValidationV3 {
  valid: boolean;
  issues: Array<
    | "invalid-shape"
    | "fingerprint-mismatch"
    | "deterministic-replay-mismatch"
  >;
}

const DEFAULT_OPTIONS: StayOptiSearchWideScalePolicyV3 = {
  fineEvaluationTarget: 128,
  outputCandidateLimit: 4,
  equivalenceTolerance: 0.5,
  strongAlternativeTolerance: 2,
  maximumCandidateCount: 50_000,
  maximumFineEvaluationCount: 1_024,
  maximumEstimatedWorkingBytes: 64 * 1024 * 1024,
  maximumCoarseOperationCount: 2_000_000,
};

const SCORE_EPSILON = 0.000001;

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isFiniteInRange(
  value: unknown,
  minimum: number,
  maximum: number
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum;
}

function requirePositiveInteger(
  value: unknown,
  label: string
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function requireNonNegativeNumber(
  value: unknown,
  label: string
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }

  return value;
}

function resolveOptions(
  options: StayOptiSearchWideScaleOptionsV3 | undefined
): StayOptiSearchWideScalePolicyV3 {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  requirePositiveInteger(
    resolved.fineEvaluationTarget,
    "fineEvaluationTarget"
  );
  requirePositiveInteger(
    resolved.outputCandidateLimit,
    "outputCandidateLimit"
  );
  requirePositiveInteger(
    resolved.maximumCandidateCount,
    "maximumCandidateCount"
  );
  requirePositiveInteger(
    resolved.maximumFineEvaluationCount,
    "maximumFineEvaluationCount"
  );
  requirePositiveInteger(
    resolved.maximumEstimatedWorkingBytes,
    "maximumEstimatedWorkingBytes"
  );
  requirePositiveInteger(
    resolved.maximumCoarseOperationCount,
    "maximumCoarseOperationCount"
  );
  requireNonNegativeNumber(
    resolved.equivalenceTolerance,
    "equivalenceTolerance"
  );
  requireNonNegativeNumber(
    resolved.strongAlternativeTolerance,
    "strongAlternativeTolerance"
  );

  if (
    resolved.equivalenceTolerance > 100 ||
    resolved.strongAlternativeTolerance > 100
  ) {
    throw new Error("Scale tolerances cannot exceed the 0-100 decision scale.");
  }

  return resolved;
}

function validateCandidateInput(
  candidate: StayOptiScaleCandidateInputV3
) {
  if (
    typeof candidate.hotelId !== "string" ||
    candidate.hotelId.trim().length === 0 ||
    typeof candidate.eligible !== "boolean" ||
    typeof candidate.protectedByPolicy !== "boolean" ||
    !isFiniteInRange(candidate.evidenceCoverage, 0, 1) ||
    (
      candidate.fullDecisionScore !== null &&
      !isFiniteInRange(candidate.fullDecisionScore, 0, 100)
    )
  ) {
    throw new Error(`Invalid V3-08 scale candidate ${candidate.hotelId || "<missing>"}.`);
  }

  const bothBoundsMissing =
    candidate.coarseScoreLowerBound === null &&
    candidate.coarseScoreUpperBound === null;

  const bothBoundsPresent =
    isFiniteInRange(candidate.coarseScoreLowerBound, 0, 100) &&
    isFiniteInRange(candidate.coarseScoreUpperBound, 0, 100);

  if (
    !bothBoundsMissing &&
    !bothBoundsPresent
  ) {
    throw new Error(
      `V3-08 coarse score bounds must both be known or both be missing for ${candidate.hotelId}.`
    );
  }

  if (
    bothBoundsPresent &&
    candidate.coarseScoreLowerBound !== null &&
    candidate.coarseScoreUpperBound !== null &&
    candidate.coarseScoreLowerBound > candidate.coarseScoreUpperBound
  ) {
    throw new Error(`V3-08 coarse score bounds are inverted for ${candidate.hotelId}.`);
  }
}

function resolveScope(
  candidateCount: number,
  sourceSetCompleteness: StayOptiSourceSetCompletenessV3,
  sourceReportedHotelCount: number | null
): StayOptiSearchWideScopeV3 {
  if (
    sourceSetCompleteness === "unknown" &&
    sourceReportedHotelCount !== null
  ) {
    throw new Error(
      "An unknown source set cannot claim a reported total hotel count."
    );
  }

  if (
    sourceSetCompleteness !== "unknown" &&
    (
      sourceReportedHotelCount === null ||
      !Number.isInteger(sourceReportedHotelCount) ||
      sourceReportedHotelCount < 0
    )
  ) {
    throw new Error(
      "Complete or partial source sets require a non-negative reported hotel count."
    );
  }

  if (
    sourceSetCompleteness === "complete" &&
    sourceReportedHotelCount !== candidateCount
  ) {
    throw new Error(
      "A complete source set must contain exactly its reported hotel count."
    );
  }

  if (
    sourceSetCompleteness === "partial" &&
    (
      sourceReportedHotelCount === null ||
      sourceReportedHotelCount <= candidateCount
    )
  ) {
    throw new Error(
      "A partial source set must report more hotels than were analyzed."
    );
  }

  const claimScope: StayOptiScaleScopeClaimV3 =
    sourceSetCompleteness === "complete"
      ? "complete-source-result-set"
      : sourceSetCompleteness === "partial"
        ? "partial-source-result-set"
        : "current-analyzed-set";

  const sourceReasonCode: SmartStayReasonCodeV3 =
    sourceSetCompleteness === "complete"
      ? "scale:source-set-complete"
      : sourceSetCompleteness === "partial"
        ? "scale:source-set-partial"
        : "scale:source-set-unknown";

  return {
    sourceSetCompleteness,
    sourceReportedHotelCount,
    analyzedHotelCount: candidateCount,
    coverageRatioOfReportedSet:
      sourceReportedHotelCount === null ||
      sourceReportedHotelCount === 0
        ? sourceReportedHotelCount === 0 && candidateCount === 0
          ? 1
          : null
        : round(candidateCount / sourceReportedHotelCount),
    claimScope,
    marketCoverageClaimAllowed: false,
    scopeLabel: "analyzed-set-not-market",
    reasonCodes: uniqueReasonCodesV3([
      "scale:coverage-computed",
      "scale:analyzed-set-only",
      "scale:public-market-claim-blocked",
      sourceReasonCode,
    ]),
  };
}

function resolveSafeCutoff(
  candidates: readonly StayOptiScaleCandidateInputV3[],
  policy: StayOptiSearchWideScalePolicyV3
) {
  const knownLowerBounds = candidates
    .filter(
      (candidate) =>
        candidate.eligible &&
        candidate.coarseScoreLowerBound !== null
    )
    .map((candidate) => candidate.coarseScoreLowerBound as number)
    .sort((first, second) => second - first);

  if (knownLowerBounds.length === 0) {
    return null;
  }

  const targetIndex = Math.min(
    policy.fineEvaluationTarget,
    knownLowerBounds.length
  ) - 1;

  const finalistCutoff =
    knownLowerBounds[targetIndex] -
    policy.equivalenceTolerance;

  const strongAlternativeCutoff =
    knownLowerBounds[0] -
    policy.strongAlternativeTolerance -
    policy.equivalenceTolerance;

  return round(Math.max(0, Math.min(
    finalistCutoff,
    strongAlternativeCutoff
  )));
}

function evaluateCandidate(
  candidate: StayOptiScaleCandidateInputV3,
  safeCutoffLowerBound: number | null
): StayOptiScaleCandidateEvaluationV3 {
  let disposition: StayOptiScaleCandidateDispositionV3;

  if (!candidate.eligible) {
    disposition = "pruned-ineligible";
  }
  else if (candidate.protectedByPolicy) {
    disposition = "retained-protected";
  }
  else if (
    candidate.coarseScoreLowerBound === null ||
    candidate.coarseScoreUpperBound === null ||
    safeCutoffLowerBound === null
  ) {
    disposition = "retained-missing-bound";
  }
  else if (
    candidate.coarseScoreUpperBound + SCORE_EPSILON >=
    safeCutoffLowerBound
  ) {
    disposition = "retained-safe-bound";
  }
  else {
    disposition = "pruned-safe-bound";
  }

  const retainedForFineEvaluation = disposition.startsWith("retained-");

  const dispositionReasonCode: SmartStayReasonCodeV3 =
    disposition === "retained-protected"
      ? "scale:policy-candidate-protected"
      : disposition === "retained-missing-bound"
        ? "scale:missing-bound-protected"
        : disposition === "retained-safe-bound"
          ? "scale:safe-bound-retained"
          : disposition === "pruned-ineligible"
            ? "scale:ineligible-pruned"
            : "scale:safe-bound-pruned";

  return {
    ...candidate,
    hotelId: candidate.hotelId.trim(),
    retainedForFineEvaluation,
    disposition,
    reasonCodes: uniqueReasonCodesV3([
      "scale:coarse-to-fine-planned",
      dispositionReasonCode,
    ]),
  };
}

function compareFullScore(
  first: StayOptiScaleCandidateEvaluationV3,
  second: StayOptiScaleCandidateEvaluationV3
) {
  return (second.fullDecisionScore ?? -1) -
    (first.fullDecisionScore ?? -1) ||
    first.hotelId.localeCompare(second.hotelId);
}

function createEquivalenceAudit(
  candidates: readonly StayOptiScaleCandidateEvaluationV3[],
  policy: StayOptiSearchWideScalePolicyV3
): StayOptiScaleEquivalenceAuditV3 {
  const fullyScored = candidates
    .filter(
      (candidate) =>
        candidate.eligible &&
        candidate.fullDecisionScore !== null
    )
    .sort(compareFullScore);

  const plannedScored = fullyScored
    .filter((candidate) => candidate.retainedForFineEvaluation)
    .sort(compareFullScore);

  const fullTop = fullyScored.slice(0, policy.outputCandidateLimit);
  const plannedTop = plannedScored.slice(0, policy.outputCandidateLimit);
  const bestFullScore = fullTop[0]?.fullDecisionScore ?? null;
  const bestPlannedScore = plannedTop[0]?.fullDecisionScore ?? null;

  const maximumTopScoreLoss =
    bestFullScore === null ||
    bestPlannedScore === null
      ? null
      : round(Math.max(0, bestFullScore - bestPlannedScore));

  const strongAlternativeHotelIds = bestFullScore === null
    ? []
    : fullyScored
        .filter(
          (candidate) =>
            candidate.protectedByPolicy ||
            (
              candidate.fullDecisionScore !== null &&
              candidate.fullDecisionScore + SCORE_EPSILON >=
              bestFullScore - policy.strongAlternativeTolerance
            )
        )
        .map((candidate) => candidate.hotelId)
        .sort();

  const retainedSet = new Set(
    candidates
      .filter((candidate) => candidate.retainedForFineEvaluation)
      .map((candidate) => candidate.hotelId)
  );

  const lostStrongAlternativeHotelIds = strongAlternativeHotelIds
    .filter((hotelId) => !retainedSet.has(hotelId));

  const boundViolationHotelIds = candidates
    .filter(
      (candidate) =>
        candidate.fullDecisionScore !== null &&
        candidate.coarseScoreLowerBound !== null &&
        candidate.coarseScoreUpperBound !== null &&
        (
          candidate.fullDecisionScore + SCORE_EPSILON <
            candidate.coarseScoreLowerBound ||
          candidate.fullDecisionScore - SCORE_EPSILON >
            candidate.coarseScoreUpperBound
        )
    )
    .map((candidate) => candidate.hotelId)
    .sort();

  const fullTopHotelIds = fullTop.map((candidate) => candidate.hotelId);
  const coarseToFineTopHotelIds = plannedTop.map((candidate) => candidate.hotelId);
  const exactTopSetMatch = stableSerializeV3(
    [...fullTopHotelIds].sort()
  ) === stableSerializeV3(
    [...coarseToFineTopHotelIds].sort()
  );

  const status: StayOptiScaleEquivalenceAuditV3["status"] =
    fullyScored.length === 0
      ? "unavailable"
      : maximumTopScoreLoss !== null &&
          maximumTopScoreLoss <= policy.equivalenceTolerance + SCORE_EPSILON &&
          lostStrongAlternativeHotelIds.length === 0 &&
          boundViolationHotelIds.length === 0
        ? "equivalent"
        : "not-equivalent";

  return {
    status,
    tolerance: policy.equivalenceTolerance,
    strongAlternativeTolerance: policy.strongAlternativeTolerance,
    fullTopHotelIds,
    coarseToFineTopHotelIds,
    exactTopSetMatch,
    maximumTopScoreLoss,
    strongAlternativeHotelIds,
    lostStrongAlternativeHotelIds,
    boundViolationHotelIds,
    reasonCodes: uniqueReasonCodesV3([
      status === "equivalent"
        ? "scale:full-equivalence-pass"
        : status === "not-equivalent"
          ? "scale:full-equivalence-failed"
          : "scale:full-equivalence-unavailable",
      boundViolationHotelIds.length === 0
        ? "scale:bounds-validated"
        : "scale:bounds-violated",
      lostStrongAlternativeHotelIds.length === 0
        ? "scale:strong-alternatives-preserved"
        : "scale:strong-alternative-lost",
      "scale:safe-pruning-audited",
    ]),
  };
}

function createWorkBudget(
  candidateCount: number,
  retainedCount: number,
  policy: StayOptiSearchWideScalePolicyV3
): StayOptiScaleWorkBudgetV3 {
  const coarseOperationCount = Math.ceil(
    candidateCount *
    (
      7 +
      Math.log2(Math.max(2, candidateCount))
    )
  );

  const estimatedWorkingBytes =
    candidateCount * 320 +
    retainedCount * 192 +
    policy.fineEvaluationTarget * 64;

  const candidateCountWithinBudget =
    candidateCount <= policy.maximumCandidateCount;
  const coarseOperationsWithinBudget =
    coarseOperationCount <= policy.maximumCoarseOperationCount;
  const fineEvaluationsWithinBudget =
    retainedCount <= policy.maximumFineEvaluationCount;
  const estimatedMemoryWithinBudget =
    estimatedWorkingBytes <= policy.maximumEstimatedWorkingBytes;
  const withinBudget =
    candidateCountWithinBudget &&
    coarseOperationsWithinBudget &&
    fineEvaluationsWithinBudget &&
    estimatedMemoryWithinBudget;

  return {
    coarseOperationCount,
    fineEvaluationCount: retainedCount,
    estimatedWorkingBytes,
    candidateCountWithinBudget,
    coarseOperationsWithinBudget,
    fineEvaluationsWithinBudget,
    estimatedMemoryWithinBudget,
    withinBudget,
    reasonCodes: uniqueReasonCodesV3([
      "scale:dynamic-computation-bounded",
      withinBudget
        ? "scale:work-budget-pass"
        : "scale:work-budget-blocked",
    ]),
  };
}

function createSearchWideContext(
  candidates: readonly StayOptiScaleCandidateEvaluationV3[]
): StayOptiSearchWideContextV3 {
  const analyzedHotelCount = candidates.length;
  const eligibleHotelCount = candidates.filter(
    (candidate) => candidate.eligible
  ).length;
  const fullScoreHotelCount = candidates.filter(
    (candidate) =>
      candidate.eligible &&
      candidate.fullDecisionScore !== null
  ).length;
  const highEvidenceHotelCount = candidates.filter(
    (candidate) =>
      candidate.eligible &&
      candidate.evidenceCoverage >= 0.75
  ).length;
  const eligibleRatio = analyzedHotelCount === 0
    ? null
    : round(eligibleHotelCount / analyzedHotelCount);

  const relativeScarcity: StayOptiRelativeScarcityV3 =
    eligibleRatio === null
      ? "unknown"
      : eligibleHotelCount <= 2 || eligibleRatio < 0.05
        ? "scarce-current-set"
        : eligibleHotelCount <= 8 || eligibleRatio < 0.2
          ? "limited-current-set"
          : "ample-current-set";

  return {
    analyzedHotelCount,
    eligibleHotelCount,
    fullScoreHotelCount,
    highEvidenceHotelCount,
    eligibleRatio,
    relativeScarcity,
    scarcityBasis: "current-analyzed-set-only",
    commercialUrgencyClaimAllowed: false,
    reasonCodes: uniqueReasonCodesV3([
      "scale:search-wide-context",
      "scale:scarcity-current-set-only",
    ]),
  };
}

function createFingerprint(
  evaluation: Omit<StayOptiSearchWideScaleCoverageV3, "fingerprint">
) {
  return createStableHashV3(
    evaluation,
    "stayopti-v3-search-wide-scale-coverage"
  );
}

export function evaluateSearchWideScaleCoverageV3(
  input: EvaluateStayOptiSearchWideScaleInputV3
): StayOptiSearchWideScaleCoverageV3 {
  const policy = resolveOptions(input.options);
  const sourceSetCompleteness = input.sourceSetCompleteness ?? "unknown";
  const sourceReportedHotelCount = input.sourceReportedHotelCount ?? null;

  if (
    sourceSetCompleteness !== "complete" &&
    sourceSetCompleteness !== "partial" &&
    sourceSetCompleteness !== "unknown"
  ) {
    throw new Error("Invalid V3-08 source set completeness.");
  }

  const hotelIds = input.candidates.map((candidate) => candidate.hotelId.trim());
  if (new Set(hotelIds).size !== hotelIds.length) {
    throw new Error("V3-08 scale candidates require unique hotel IDs.");
  }

  const candidates = input.candidates
    .map((candidate) => {
      validateCandidateInput(candidate);
      return {
        ...candidate,
        hotelId: candidate.hotelId.trim(),
      };
    })
    .sort((first, second) => first.hotelId.localeCompare(second.hotelId));

  const safeCutoffLowerBound = resolveSafeCutoff(candidates, policy);
  const candidateEvaluations = candidates.map(
    (candidate) => evaluateCandidate(candidate, safeCutoffLowerBound)
  );
  const retainedHotelIds = candidateEvaluations
    .filter((candidate) => candidate.retainedForFineEvaluation)
    .map((candidate) => candidate.hotelId)
    .sort();
  const prunedHotelIds = candidateEvaluations
    .filter((candidate) => !candidate.retainedForFineEvaluation)
    .map((candidate) => candidate.hotelId)
    .sort();

  const scope = resolveScope(
    candidateEvaluations.length,
    sourceSetCompleteness,
    sourceReportedHotelCount
  );
  const searchWideContext = createSearchWideContext(candidateEvaluations);
  const equivalence = createEquivalenceAudit(candidateEvaluations, policy);
  const workBudget = createWorkBudget(
    candidateEvaluations.length,
    retainedHotelIds.length,
    policy
  );

  const status: StayOptiSearchWideScaleCoverageV3["status"] =
    equivalence.status === "unavailable"
      ? "unavailable"
      : equivalence.status === "equivalent" && workBudget.withinBudget
        ? "pass"
        : "blocked";

  const evaluationCore = {
    phase: "v3-08" as const,
    rankingApplication: "shadow-only" as const,
    runtimeApplication: "shadow-plan-only" as const,
    publicPresentation: "disabled" as const,
    status,
    policy,
    candidates: candidateEvaluations,
    retainedHotelIds,
    prunedHotelIds,
    safeCutoffLowerBound,
    scope,
    searchWideContext,
    equivalence,
    workBudget,
    reasonCodes: uniqueReasonCodesV3([
      "scale:shadow-only",
      "scale:coarse-to-fine-planned",
      "scale:safe-pruning-audited",
      ...scope.reasonCodes,
      ...searchWideContext.reasonCodes,
      ...equivalence.reasonCodes,
      ...workBudget.reasonCodes,
    ]),
  };

  const evaluationWithoutFingerprint: Omit<
    StayOptiSearchWideScaleCoverageV3,
    "fingerprint"
  > = {
    evaluationId: createStableHashV3(
      evaluationCore,
      "stayopti-v3-search-wide-scale-evaluation"
    ),
    ...evaluationCore,
  };

  return {
    ...evaluationWithoutFingerprint,
    fingerprint: createFingerprint(evaluationWithoutFingerprint),
  };
}

export function validateSearchWideScaleCoverageV3(
  evaluation: StayOptiSearchWideScaleCoverageV3
): StayOptiSearchWideScaleValidationV3 {
  const issues: StayOptiSearchWideScaleValidationV3["issues"] = [];

  if (
    evaluation.phase !== "v3-08" ||
    evaluation.rankingApplication !== "shadow-only" ||
    evaluation.runtimeApplication !== "shadow-plan-only" ||
    evaluation.publicPresentation !== "disabled" ||
    evaluation.scope.marketCoverageClaimAllowed !== false ||
    evaluation.scope.scopeLabel !== "analyzed-set-not-market" ||
    evaluation.searchWideContext.commercialUrgencyClaimAllowed !== false ||
    evaluation.searchWideContext.scarcityBasis !== "current-analyzed-set-only"
  ) {
    issues.push("invalid-shape");
  }

  const {
    fingerprint,
    ...withoutFingerprint
  } = evaluation;

  if (fingerprint !== createFingerprint(withoutFingerprint)) {
    issues.push("fingerprint-mismatch");
  }

  try {
    const replay = evaluateSearchWideScaleCoverageV3({
      candidates: evaluation.candidates.map((candidate) => ({
        hotelId: candidate.hotelId,
        eligible: candidate.eligible,
        coarseScoreLowerBound: candidate.coarseScoreLowerBound,
        coarseScoreUpperBound: candidate.coarseScoreUpperBound,
        fullDecisionScore: candidate.fullDecisionScore,
        evidenceCoverage: candidate.evidenceCoverage,
        protectedByPolicy: candidate.protectedByPolicy,
      })),
      sourceSetCompleteness: evaluation.scope.sourceSetCompleteness,
      sourceReportedHotelCount: evaluation.scope.sourceReportedHotelCount,
      options: evaluation.policy,
    });

    if (stableSerializeV3(replay) !== stableSerializeV3(evaluation)) {
      issues.push("deterministic-replay-mismatch");
    }
  }
  catch {
    issues.push("invalid-shape");
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

export function assertSearchWideScaleCoverageV3(
  evaluation: StayOptiSearchWideScaleCoverageV3
) {
  const validation = validateSearchWideScaleCoverageV3(evaluation);

  if (!validation.valid) {
    throw new Error(
      `Invalid V3-08 Search-wide Scale & Coverage evaluation: ${validation.issues.join(", ")}.`
    );
  }

  return evaluation;
}
