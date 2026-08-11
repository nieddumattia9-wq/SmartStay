import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  SMARTSTAY_DECISION_TRACE_ROLES_V2,
  SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2,
  SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2,
  validateRecommendationDecisionTraceV2,
  type SmartStayDecisionTraceRoleDecisionV2,
  type SmartStayDecisionTraceRoleOutcomeV2,
  type SmartStayDecisionTraceRoleV2,
  type SmartStayRecommendationDecisionCandidateTraceV2,
  type SmartStayRecommendationDecisionTraceV2,
} from "../../src/engine-v2/recommendation/recommendationDecisionTraceV2";

const MASTER_REQUIRED_FIELD_PATHS = [
  "identity.hotelId",
  "identity.offerId",
  "price.totalAmount",
  "price.perRoomNightAmount",
  "accommodation.category",
  "accommodation.roomName",
  "reputation.reviewRating",
  "reputation.reviewCount",
  "reputation.reviewProvenanceEvidenceIds",
  "location.distanceKm",
  "price.taxesIncluded",
  "bookingConditions.refundable",
  "bookingConditions.bookable",
  "reliability.status",
  "reliability.dataConfidenceLevel",
  "reliability.choiceRiskLevel",
  "scores.smartStayFitScore",
  "scores.utilityScore",
  "scores.experienceTier",
  "peerGroup.id",
  "bestChoiceComparison.savingAmount",
  "bestChoiceComparison.utilityLoss",
  "pareto.status",
  "roleDecisions.0.eligible",
  "exclusionReasonCodes",
  "finalRole",
  "explanationEvidenceIds",
] as const;

function createRoleDecision(
  role: SmartStayDecisionTraceRoleV2,
  outcome: SmartStayDecisionTraceRoleOutcomeV2
): SmartStayDecisionTraceRoleDecisionV2 {
  return {
    role,
    outcome,
    eligible:
      outcome === "selected" ||
      outcome === "eligible-not-selected",
    comparisonTargetHotelId:
      role === "best-choice"
        ? null
        : "hotel-best",
    assignmentScore:
      outcome === "not-applicable"
        ? null
        : 86,
    thresholdChecks: [
      {
        code: `threshold-${role}`,
        outcome:
          outcome === "rejected"
            ? "failed"
            : outcome === "not-applicable"
              ? "not-evaluated"
              : "passed",
        actualValue: 86,
        thresholdValue: 80,
        comparisonOperator: "gte",
        unit: "score",
        reasonCodes: [`threshold-${role}-${outcome}`],
        evidenceIds: [`evidence-threshold-${role}`],
      },
    ],
    reasonCodes: [`recommendation-${role}-${outcome}`],
    evidenceIds: [`evidence-role-${role}`],
  };
}

function createCandidate(): SmartStayRecommendationDecisionCandidateTraceV2 {
  return {
    identity: {
      hotelId: "hotel-best",
      offerId: "offer-best",
    },
    price: {
      totalAmount: 540,
      perRoomNightAmount: 90,
      currency: "EUR",
      completeness: "reported-complete",
      taxesIncluded: false,
      includedTaxes: 18,
      excludedTaxes: 24,
      unknownTaxes: 0,
    },
    accommodation: {
      category: "hotel",
      roomName: "Camera matrimoniale",
      roomTier: "standard",
    },
    reputation: {
      starRating: 4,
      reviewRating: 8.9,
      reviewCount: 1240,
      reviewCountRelation: "equal",
      reviewProvenanceEvidenceIds: ["evidence-reviews"],
    },
    location: {
      distanceKm: 0.8,
      locationScore: 91,
      evidenceIds: ["evidence-location"],
    },
    bookingConditions: {
      bookable: true,
      refundable: true,
      freeCancellationUntil: "2026-09-01T00:00:00.000Z",
      cancellationPolicyKnown: true,
      evidenceIds: ["evidence-booking"],
    },
    reliability: {
      status: "strong-data",
      eligible: true,
      dataConfidenceScore: 0.94,
      dataConfidenceLevel: "high",
      choiceRiskScore: 8,
      choiceRiskLevel: "low",
      reasonCodes: ["reliability-strong-data"],
      evidenceIds: ["evidence-reliability"],
    },
    scores: {
      smartStayFitScore: 92,
      utilityScore: 90,
      experienceScore: 87,
      experienceTier: "premium",
    },
    peerGroup: {
      id: "peer-hotel-four-star",
      mode: "same-category",
      category: "hotel",
      sampleSize: 18,
      confidence: 0.91,
      evidenceIds: ["evidence-peer-group"],
    },
    bestChoiceComparison: {
      bestChoiceHotelId: "hotel-best",
      savingAmount: 0,
      savingRatio: 0,
      utilityLoss: 0,
      reasonCodes: ["comparison-is-best-choice"],
      evidenceIds: ["evidence-comparison"],
    },
    pareto: {
      status: "frontier",
      dominatedByHotelIds: [],
      dominatesHotelIds: ["hotel-dominated"],
      reasonCodes: ["pareto-frontier"],
    },
    ranking: {
      finalRank: 1,
      rankBand: "top",
      tieGroupId: "recommendation:best-choice:hotel-best",
    },
    roleDecisions: [
      createRoleDecision("best-choice", "selected"),
      createRoleDecision(
        "best-sensible-saving",
        "not-applicable"
      ),
      createRoleDecision(
        "worthwhile-comfort-upgrade",
        "not-applicable"
      ),
      createRoleDecision("best-location", "eligible-not-selected"),
    ],
    disposition: "recommended",
    finalRole: "best-choice",
    exclusionReasonCodes: [],
    explanationEvidenceIds: ["evidence-explanation"],
  };
}

function createTrace(): SmartStayRecommendationDecisionTraceV2 {
  return {
    schemaVersion:
      SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2,
    internalOnly:
      SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2,
    engineVersion: "2.0.0",
    generatedAt: null,
    context: {
      preferenceId: "balanced",
      preferenceSource: "automatic",
      totalBudget: 600,
      budgetCurrency: "EUR",
      nights: 3,
      rooms: 2,
      budgetPerRoomNight: 100,
      marketStatus: "strong-data",
      marketMedianPerRoomNight: 112,
      marketBudgetPercentile: 44,
      reasonCodes: ["market-relative-preference-resolved"],
    },
    candidates: [createCandidate()],
  };
}

function hasOwnPath(
  root: unknown,
  path: string
) {
  let current: unknown = root;

  for (const segment of path.split(".")) {
    if (
      current === null ||
      (typeof current !== "object" && !Array.isArray(current)) ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return true;
}

test(
  "Recommendation Decision Trace contract covers every master-list field",
  () => {
    const trace = createTrace();
    const candidate = trace.candidates[0];

    assert.equal(MASTER_REQUIRED_FIELD_PATHS.length, 27);

    for (const path of MASTER_REQUIRED_FIELD_PATHS) {
      assert.equal(
        hasOwnPath(candidate, path),
        true,
        `Missing master-list field path: ${path}`
      );
    }

    assert.deepEqual(
      validateRecommendationDecisionTraceV2(trace),
      {
        valid: true,
        issues: [],
      }
    );
  }
);

test(
  "Decision Trace contract is internal and covers every declared recommendation role",
  () => {
    assert.equal(
      SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2,
      true
    );
    assert.deepEqual(
      SMARTSTAY_DECISION_TRACE_ROLES_V2,
      [
        "best-choice",
        "best-sensible-saving",
        "worthwhile-comfort-upgrade",
        "best-location",
      ]
    );

    const sourceText = readFileSync(
      resolve(
        process.cwd(),
        "src/engine-v2/recommendation/recommendationDecisionTraceV2.ts"
      ),
      "utf8"
    );

    assert.doesNotMatch(sourceText, /liteapi|routestack/i);
  }
);

test(
  "Decision Trace validation reports incomplete, contradictory and unsafe traces deterministically",
  () => {
    const trace = createTrace();
    const original = structuredClone(trace);
    const candidate = trace.candidates[0];

    candidate.roleDecisions.pop();
    candidate.roleDecisions[0].outcome = "eligible-not-selected";
    candidate.roleDecisions[1].thresholdChecks.push({
      ...candidate.roleDecisions[1].thresholdChecks[0],
    });
    candidate.disposition = "excluded";
    candidate.finalRole = "best-choice";
    candidate.exclusionReasonCodes = [];

    const invalidSnapshot = structuredClone(trace);

    const first = validateRecommendationDecisionTraceV2(trace);
    const second = validateRecommendationDecisionTraceV2(trace);

    assert.equal(first.valid, false);
    assert.deepEqual(first, second);
    assert.deepEqual(
      first.issues.map((issue) => issue.code),
      [
        "decision-trace-excluded-reason-missing",
        "decision-trace-non-recommended-role-assigned",
        "decision-trace-role-coverage-incomplete",
        "decision-trace-threshold-code-duplicate",
      ]
    );
    assert.deepEqual(trace, invalidSnapshot);
    assert.deepEqual(createTrace(), original);
  }
);
