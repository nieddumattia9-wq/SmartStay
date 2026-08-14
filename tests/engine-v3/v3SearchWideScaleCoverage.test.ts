import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  evaluateSearchWideScaleCoverageV3,
  validateSearchWideScaleCoverageV3,
  type StayOptiScaleCandidateInputV3,
} from "../../src/engine-v3";

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function candidate(
  hotelId: string,
  score: number | null,
  input: Partial<StayOptiScaleCandidateInputV3> = {}
): StayOptiScaleCandidateInputV3 {
  const lower = score === null
    ? null
    : round(Math.max(0, score - 0.25));
  const upper = score === null
    ? null
    : round(Math.min(100, score + 0.25));

  return {
    hotelId,
    eligible: true,
    coarseScoreLowerBound: lower,
    coarseScoreUpperBound: upper,
    fullDecisionScore: score,
    evidenceCoverage: 0.9,
    protectedByPolicy: false,
    ...input,
  };
}

function largeCandidateSet(count: number) {
  return Array.from(
    { length: count },
    (_, index) => candidate(
      `hotel-${String(index).padStart(5, "0")}`,
      round(Math.max(0, 100 - index / 100))
    )
  );
}

test(
  "coarse-to-fine evaluation preserves the full result across ten thousand hotels within frozen work budgets",
  () => {
    const candidates = largeCandidateSet(10_000);
    const startedAt = performance.now();
    const evaluation = evaluateSearchWideScaleCoverageV3({
      candidates,
      sourceSetCompleteness: "complete",
      sourceReportedHotelCount: candidates.length,
    });
    const durationMs = performance.now() - startedAt;

    assert.equal(evaluation.status, "pass");
    assert.equal(evaluation.equivalence.status, "equivalent");
    assert.equal(evaluation.equivalence.maximumTopScoreLoss, 0);
    assert.deepEqual(evaluation.equivalence.lostStrongAlternativeHotelIds, []);
    assert.deepEqual(evaluation.equivalence.boundViolationHotelIds, []);
    assert.deepEqual(
      evaluation.equivalence.coarseToFineTopHotelIds,
      evaluation.equivalence.fullTopHotelIds
    );
    assert.ok(evaluation.workBudget.fineEvaluationCount < 400);
    assert.equal(evaluation.workBudget.withinBudget, true);
    assert.ok(durationMs < 5_000);
    assert.equal(validateSearchWideScaleCoverageV3(evaluation).valid, true);
  }
);

test(
  "candidate permutation cannot change the scale plan, scope or fingerprint",
  () => {
    const candidates = largeCandidateSet(2_000);
    const first = evaluateSearchWideScaleCoverageV3({ candidates });
    const second = evaluateSearchWideScaleCoverageV3({
      candidates: [...candidates].reverse(),
    });

    assert.equal(first.fingerprint, second.fingerprint);
    assert.equal(first.evaluationId, second.evaluationId);
    assert.deepEqual(first.retainedHotelIds, second.retainedHotelIds);
    assert.deepEqual(first.equivalence, second.equivalence);
  }
);

test(
  "adding thousands of safely dominated options cannot displace the strong finalists",
  () => {
    const finalists = [
      candidate("best", 93, { protectedByPolicy: true }),
      candidate("alternative", 91.5),
      candidate("third", 89),
      candidate("fourth", 87),
    ];
    const baseline = evaluateSearchWideScaleCoverageV3({ candidates: finalists });
    const dominated = Array.from(
      { length: 5_000 },
      (_, index) => candidate(
        `dominated-${String(index).padStart(4, "0")}`,
        round(Math.max(0, 40 - index / 125))
      )
    );
    const expanded = evaluateSearchWideScaleCoverageV3({
      candidates: [...dominated, ...finalists],
    });

    assert.deepEqual(
      expanded.equivalence.fullTopHotelIds,
      baseline.equivalence.fullTopHotelIds
    );
    assert.deepEqual(
      expanded.equivalence.coarseToFineTopHotelIds,
      baseline.equivalence.coarseToFineTopHotelIds
    );
    assert.equal(expanded.equivalence.status, "equivalent");
    assert.deepEqual(expanded.equivalence.lostStrongAlternativeHotelIds, []);
    assert.ok(expanded.prunedHotelIds.length > 4_500);
  }
);

test(
  "unknown bounds and policy finalists are retained instead of being unsafely pruned",
  () => {
    const evaluation = evaluateSearchWideScaleCoverageV3({
      candidates: [
        candidate("known-best", 90),
        candidate("unknown-bound", 89, {
          coarseScoreLowerBound: null,
          coarseScoreUpperBound: null,
        }),
        candidate("protected", 50, {
          protectedByPolicy: true,
        }),
      ],
    });
    const unknown = evaluation.candidates.find(
      (item) => item.hotelId === "unknown-bound"
    );
    const protectedCandidate = evaluation.candidates.find(
      (item) => item.hotelId === "protected"
    );

    assert.equal(unknown?.disposition, "retained-missing-bound");
    assert.equal(unknown?.retainedForFineEvaluation, true);
    assert.equal(protectedCandidate?.disposition, "retained-protected");
    assert.equal(protectedCandidate?.retainedForFineEvaluation, true);
  }
);

test(
  "an invalid coarse bound blocks promotion instead of hiding a strong option",
  () => {
    const evaluation = evaluateSearchWideScaleCoverageV3({
      candidates: [
        candidate("apparent-best", 90),
        candidate("violated-bound", 95, {
          coarseScoreLowerBound: 60,
          coarseScoreUpperBound: 70,
        }),
      ],
    });

    assert.equal(evaluation.status, "blocked");
    assert.equal(evaluation.equivalence.status, "not-equivalent");
    assert.deepEqual(
      evaluation.equivalence.boundViolationHotelIds,
      ["violated-bound"]
    );
    assert.equal(validateSearchWideScaleCoverageV3(evaluation).valid, true);
  }
);

test(
  "a safe plan remains blocked when fine evaluation or deterministic memory budgets are exceeded",
  () => {
    const evaluation = evaluateSearchWideScaleCoverageV3({
      candidates: largeCandidateSet(1_000),
      options: {
        maximumFineEvaluationCount: 10,
        maximumEstimatedWorkingBytes: 1_024,
      },
    });

    assert.equal(evaluation.equivalence.status, "equivalent");
    assert.equal(evaluation.workBudget.fineEvaluationsWithinBudget, false);
    assert.equal(evaluation.workBudget.estimatedMemoryWithinBudget, false);
    assert.equal(evaluation.workBudget.withinBudget, false);
    assert.equal(evaluation.status, "blocked");
  }
);

test(
  "coverage claims distinguish complete, partial and unknown source sets without claiming the market",
  () => {
    const candidates = [
      candidate("a", 90),
      candidate("b", 80),
      candidate("c", 70),
    ];
    const complete = evaluateSearchWideScaleCoverageV3({
      candidates,
      sourceSetCompleteness: "complete",
      sourceReportedHotelCount: 3,
    });
    const partial = evaluateSearchWideScaleCoverageV3({
      candidates,
      sourceSetCompleteness: "partial",
      sourceReportedHotelCount: 12,
    });
    const unknown = evaluateSearchWideScaleCoverageV3({ candidates });

    assert.equal(complete.scope.claimScope, "complete-source-result-set");
    assert.equal(complete.scope.coverageRatioOfReportedSet, 1);
    assert.equal(partial.scope.claimScope, "partial-source-result-set");
    assert.equal(partial.scope.coverageRatioOfReportedSet, 0.25);
    assert.equal(unknown.scope.claimScope, "current-analyzed-set");
    assert.equal(unknown.scope.coverageRatioOfReportedSet, null);
    assert.equal(complete.scope.marketCoverageClaimAllowed, false);
    assert.equal(partial.scope.marketCoverageClaimAllowed, false);
    assert.equal(unknown.scope.marketCoverageClaimAllowed, false);
  }
);

test(
  "search-wide scarcity is descriptive of the analyzed set and never becomes commercial urgency",
  () => {
    const sparse = evaluateSearchWideScaleCoverageV3({
      candidates: [
        candidate("eligible", 80),
        ...Array.from(
          { length: 30 },
          (_, index) => candidate(`ineligible-${index}`, null, {
            eligible: false,
          })
        ),
      ],
    });

    assert.equal(
      sparse.searchWideContext.relativeScarcity,
      "scarce-current-set"
    );
    assert.equal(
      sparse.searchWideContext.scarcityBasis,
      "current-analyzed-set-only"
    );
    assert.equal(
      sparse.searchWideContext.commercialUrgencyClaimAllowed,
      false
    );
  }
);

test(
  "a result set without an evidence-backed full score stays unavailable rather than pretending equivalence",
  () => {
    const evaluation = evaluateSearchWideScaleCoverageV3({
      candidates: [
        candidate("unknown-a", null),
        candidate("unknown-b", null),
      ],
    });

    assert.equal(evaluation.status, "unavailable");
    assert.equal(evaluation.equivalence.status, "unavailable");
    assert.equal(evaluation.workBudget.fineEvaluationCount, 2);
    assert.equal(validateSearchWideScaleCoverageV3(evaluation).valid, true);
  }
);

test(
  "the V3-08 fingerprint detects post-evaluation plan mutation",
  () => {
    const evaluation = evaluateSearchWideScaleCoverageV3({
      candidates: largeCandidateSet(500),
    });
    const mutated = structuredClone(evaluation);
    mutated.candidates[0].retainedForFineEvaluation =
      !mutated.candidates[0].retainedForFineEvaluation;

    const validation = validateSearchWideScaleCoverageV3(mutated);

    assert.equal(validation.valid, false);
    assert.ok(validation.issues.includes("fingerprint-mismatch"));
    assert.ok(validation.issues.includes("deterministic-replay-mismatch"));
  }
);

test(
  "ambiguous source totals and duplicate hotel identities are rejected before scale planning",
  () => {
    assert.throws(
      () => evaluateSearchWideScaleCoverageV3({
        candidates: [candidate("same", 80), candidate("same", 70)],
      }),
      /unique hotel IDs/
    );
    assert.throws(
      () => evaluateSearchWideScaleCoverageV3({
        candidates: [candidate("a", 80)],
        sourceSetCompleteness: "unknown",
        sourceReportedHotelCount: 10,
      }),
      /unknown source set/
    );
    assert.throws(
      () => evaluateSearchWideScaleCoverageV3({
        candidates: [candidate("a", 80)],
        sourceSetCompleteness: "partial",
        sourceReportedHotelCount: 1,
      }),
      /partial source set/
    );
  }
);
