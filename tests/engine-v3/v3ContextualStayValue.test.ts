import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateContextualStayValueV3,
  validateContextualStayValueV3,
  type EvaluateStayOptiContextualCandidateInputV3,
  type StayOptiContextualStayContextV3,
  type StayOptiRoomOptionInputV3,
} from "../../src/engine-v3";

const EVIDENCE = {
  source: "provider-structured" as const,
  confidence: 0.9,
  evidenceIds: ["evidence:verified"],
};

const CONTEXT: StayOptiContextualStayContextV3 = {
  preferenceId: "balanced",
  tripType: "leisure",
  nights: 4,
  adults: 2,
  children: 0,
  rooms: 1,
  leadTimeDays: 60,
  destination: null,
};

function room(
  offerId: string,
  cost: number,
  tierRank: number,
  input: Partial<StayOptiRoomOptionInputV3> = {}
): StayOptiRoomOptionInputV3 {
  return {
    offerId,
    roomName: offerId,
    totalCost: cost,
    currency: "EUR",
    bookable: true,
    comparisonScopeFingerprint: "scope:four-nights-two-adults-breakfast-refundable",
    tierRank,
    tierSource: "provider-structured",
    attributes: [],
    evidenceIds: [`evidence:${offerId}`],
    ...input,
  };
}

function candidate(
  hotelId: string,
  input: Partial<EvaluateStayOptiContextualCandidateInputV3> = {}
): EvaluateStayOptiContextualCandidateInputV3 {
  return {
    hotelId,
    totalCost: 500,
    currency: "EUR",
    straightLineDistanceKm: 0.8,
    straightLineEvidenceIds: ["evidence:distance"],
    travelPoints: [],
    selectedRoom: room("standard", 500, 2),
    roomAlternatives: [],
    cancellation: null,
    payment: null,
    capabilities: [],
    frictionSignals: [],
    evidenceIds: ["evidence:hotel"],
    ...input,
  };
}

test("trip-specific location uses direct travel time and never promotes straight-line distance", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: {
      ...CONTEXT,
      tripType: "business",
      destination: {
        contextId: "verified-business-district",
        source: "user-declared",
        confidence: 1,
        evidenceIds: ["evidence:destination-priority"],
        travelCategoryWeightOverrides: {
          business: 1.5,
          transport: 1.2,
        },
      },
    },
    candidates: [candidate("hotel-a", {
      travelPoints: [
        {
          pointId: "office",
          category: "business",
          importance: 1,
          travelTimeMinutes: 12,
          mode: "transit",
          source: "routing-engine",
          confidence: 0.95,
          evidenceIds: ["route:office"],
        },
        {
          pointId: "station",
          category: "transport",
          importance: 0.7,
          travelTimeMinutes: 8,
          mode: "walk",
          source: "transit-timetable",
          confidence: 0.9,
          evidenceIds: ["route:station"],
        },
        {
          pointId: "map-distance-only",
          category: "primary",
          importance: 1,
          travelTimeMinutes: 4,
          mode: "unknown",
          source: "straight-line",
          confidence: 1,
          evidenceIds: ["distance:fallback"],
        },
      ],
    })],
  });
  const location = evaluation.candidates[0].location;

  assert.equal(location.status, "usable");
  assert.deepEqual(location.usedPointIds, ["office", "station"]);
  assert.deepEqual(location.excludedPointIds, ["map-distance-only"]);
  assert.equal(location.destinationAdjusted, true);
  assert.ok((location.weightedTravelTimeMinutes ?? 0) > 8);
  assert.ok((location.weightedTravelTimeMinutes ?? 99) < 12);
  assert.ok((location.locationScore ?? 0) > 50);
});

test("straight-line distance alone stays an explicit fallback and cannot claim travel time", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a")],
  });
  const location = evaluation.candidates[0].location;

  assert.equal(location.status, "unavailable");
  assert.equal(location.weightedTravelTimeMinutes, null);
  assert.equal(location.locationScore, null);
  assert.equal(location.straightLineDistanceKm, 0.8);
  assert.ok(location.reasonCodes.includes("location:straight-line-fallback-only"));
});

test("a structured comparable room upgrade is worthwhile only inside the preference premium gate", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a", {
      roomAlternatives: [
        room("superior-too-expensive", 560, 3),
        room("superior-worthwhile", 530, 3, {
          attributes: [{
            code: "balcony",
            state: true,
            ...EVIDENCE,
          }],
        }),
      ],
    })],
  });
  const upgrade = evaluation.candidates[0].roomUpgrade;

  assert.equal(upgrade.status, "worthwhile");
  assert.equal(upgrade.alternativeOfferId, "superior-worthwhile");
  assert.equal(upgrade.premiumAmount, 30);
  assert.equal(upgrade.premiumRatio, 0.06);
  assert.equal(upgrade.maximumPremiumRatio, 0.07);
});

test("room semantics inferred only from a name cannot authorize an upgrade", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a", {
      selectedRoom: room("standard", 500, 2, {
        tierSource: "semantic-inference",
      }),
      roomAlternatives: [room("suite", 510, 6)],
    })],
  });

  assert.equal(evaluation.candidates[0].roomUpgrade.status, "unavailable");
});

test("an expensive room upgrade is retained as not worthwhile instead of being recommended", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a", {
      roomAlternatives: [room("superior", 600, 3)],
    })],
  });

  assert.equal(evaluation.candidates[0].roomUpgrade.status, "not-worthwhile");
  assert.equal(evaluation.candidates[0].roomUpgrade.premiumRatio, 0.2);
});

test("cancellation has a monetary expected value only with an explicit probability source", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a", {
      cancellation: {
        policyKnown: true,
        refundable: true,
        freeCancellationUntil: "2026-10-01",
        penaltyAmount: 0,
        penaltyCurrency: "EUR",
        changeProbability: {
          value: 0.2,
          source: "user-declared",
          confidence: 1,
          evidenceIds: ["user:change-probability"],
        },
        ...EVIDENCE,
      },
    })],
  });
  const flexibility = evaluation.candidates[0].flexibility;

  assert.equal(flexibility.cancellationProtectionAmount, 500);
  assert.equal(flexibility.cancellationProtectionScore, 100);
  assert.equal(flexibility.expectedCancellationValue, 100);
  assert.ok(flexibility.reasonCodes.includes("flexibility:monetary-value-available"));
});

test("refundability without a declared or calibrated change probability stays utility-only", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a", {
      cancellation: {
        policyKnown: true,
        refundable: true,
        freeCancellationUntil: "2026-10-01",
        penaltyAmount: 0,
        penaltyCurrency: "EUR",
        changeProbability: null,
        ...EVIDENCE,
      },
    })],
  });

  assert.equal(evaluation.candidates[0].flexibility.expectedCancellationValue, null);
  assert.ok(evaluation.candidates[0].flexibility.reasonCodes.includes(
    "flexibility:monetary-value-unavailable"
  ));
});

test("pay-later time value requires verified deferral and a declared or calibrated value rate", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a", {
      payment: {
        timing: "pay-later",
        deferralDays: 30,
        annualValueRate: {
          value: 0.05,
          source: "user-declared",
          confidence: 1,
          evidenceIds: ["user:annual-value-rate"],
        },
        ...EVIDENCE,
      },
    })],
  });

  assert.equal(evaluation.candidates[0].flexibility.paymentTiming, "pay-later");
  assert.equal(evaluation.candidates[0].flexibility.paymentTimingValue, 2.05);
});

test("group and long-stay utility uses verified capabilities and explicit destination multipliers", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: {
      ...CONTEXT,
      tripType: "long-stay",
      nights: 10,
      adults: 4,
      rooms: 2,
      destination: {
        contextId: "verified-local-context",
        source: "calibrated-model",
        confidence: 0.9,
        evidenceIds: ["destination:calibrated"],
        capabilityWeightMultipliers: {
          kitchen: 1.5,
        },
      },
    },
    candidates: [candidate("hotel-a", {
      capabilities: [
        { code: "kitchen", state: true, ...EVIDENCE },
        { code: "laundry", state: false, ...EVIDENCE },
        { code: "private-bathroom", state: true, ...EVIDENCE },
        {
          code: "workspace",
          state: false,
          source: "unverified",
          confidence: 1,
          evidenceIds: ["claim:unverified"],
        },
      ],
    })],
  });
  const interactions = evaluation.candidates[0].contextInteractions;

  assert.equal(interactions.status, "usable");
  assert.equal(interactions.interactions.some((item) =>
    item.capabilityCode === "workspace"
  ), false);
  assert.ok(interactions.interactions.some((item) =>
    item.capabilityCode === "kitchen" && item.utilityDelta === 9
  ));
  assert.ok(interactions.reasonCodes.includes("interaction:long-stay"));
  assert.ok(interactions.reasonCodes.includes("interaction:group"));
  assert.ok(interactions.reasonCodes.includes("interaction:destination-aware"));
});

test("convenience and friction need at least two verified signals", () => {
  const partial = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("partial", {
      frictionSignals: [{
        code: "front-desk",
        convenienceImpact: 0.5,
        weight: 0.8,
        ...EVIDENCE,
      }],
    })],
  });
  assert.equal(partial.candidates[0].convenience.status, "partial");
  assert.equal(partial.candidates[0].convenience.convenienceIndex, null);

  const usable = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("usable", {
      frictionSignals: [
        {
          code: "front-desk",
          convenienceImpact: 0.5,
          weight: 0.8,
          ...EVIDENCE,
        },
        {
          code: "elevator",
          convenienceImpact: 0.3,
          weight: 0.5,
          ...EVIDENCE,
        },
        {
          code: "rules-complexity",
          convenienceImpact: -1,
          weight: 1,
          source: "unverified",
          confidence: 1,
          evidenceIds: ["claim:unknown"],
        },
      ],
    })],
  });
  const convenience = usable.candidates[0].convenience;

  assert.equal(convenience.status, "usable");
  assert.equal(convenience.usableSignalCount, 2);
  assert.equal(convenience.suppliedSignalCount, 3);
  assert.equal(convenience.convenienceIndex, 71.15);
  assert.equal(convenience.decisionFrictionScore, 28.85);
});

test("contextual evaluation is deterministic under candidate and evidence permutation", () => {
  const firstCandidate = candidate("a", {
    frictionSignals: [
      { code: "elevator", convenienceImpact: 0.3, weight: 0.5, ...EVIDENCE },
      { code: "front-desk", convenienceImpact: 0.5, weight: 0.8, ...EVIDENCE },
    ],
  });
  const secondCandidate = candidate("b");
  const first = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [firstCandidate, secondCandidate],
  });
  const second = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [secondCandidate, {
      ...firstCandidate,
      frictionSignals: [...firstCandidate.frictionSignals].reverse(),
    }],
  });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.candidates, second.candidates);
});

test("fingerprints detect mutation and rollout remains shadow-only pending the Golden Dataset gate", () => {
  const evaluation = evaluateContextualStayValueV3({
    context: CONTEXT,
    candidates: [candidate("hotel-a")],
  });

  assert.equal(evaluation.rankingApplication, "shadow-only");
  assert.equal(evaluation.publicPresentation, "disabled");
  assert.equal(evaluation.decisionGainGate.rankingEnabled, false);
  assert.equal(evaluation.decisionGainGate.publicCopyEnabled, false);
  assert.equal(validateContextualStayValueV3(evaluation).valid, true);

  const mutated = structuredClone(evaluation);
  mutated.candidates[0].location.straightLineDistanceKm = 99;
  assert.equal(validateContextualStayValueV3(mutated).valid, false);
});
