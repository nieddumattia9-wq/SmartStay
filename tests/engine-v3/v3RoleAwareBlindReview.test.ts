import assert from "node:assert/strict";
import test from "node:test";

import {
  STAYOPTI_ROLE_AWARE_BLIND_REVIEW_AUDIT_V3,
  STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
  createRoleAwareBlindReviewBundleV3,
  createRoleAwareDeblindReportV3,
  createStableHashV3,
  stableSerializeV3,
  validateRoleAwareBlindReviewBundleV3,
  type StayOptiBlindEvaluationRoleV3,
  type StayOptiRoleAwareBlindBundleV3,
  type StayOptiRoleAwareBlindSourceCaseV3,
  type StayOptiRoleAwareCandidateV3,
} from "../../src/engine-v3";

function createContext() {
  return {
    profile:
      "comfort" as const,
    destination:
      "urban" as const,
    leadTime:
      "medium" as const,
    duration:
      "short-stay" as const,
    coverage:
      "high" as const,
    nights:
      3,
    adults:
      2,
    children:
      0,
    rooms:
      1,
    totalBudget:
      1_200,
    maximumDistanceKm:
      4,
    currency:
      "EUR",
    analyzedOptionCount:
      12,
  };
}

function createFacts(
  status:
    StayOptiRoleAwareCandidateV3["status"],
  offset:
    number
) {
  const recommended =
    status ===
      "recommended";

  return {
    status,
    totalCost:
      recommended
        ? 640 +
          offset
        : null,
    currency:
      recommended
        ? "EUR"
        : null,
    starCategory:
      recommended
        ? 4
        : null,
    reviewScore:
      recommended
        ? 8.7 +
          offset /
            100
        : null,
    reviewCountBand:
      recommended
        ? "many" as const
        : "none" as const,
    distanceKm:
      recommended
        ? 1.4 +
          offset /
            100
        : null,
    refundable:
      recommended
        ? true
        : null,
    mealIncluded:
      recommended
        ? true
        : null,
    taxesStatus:
      recommended
        ? "complete" as const
        : "unknown" as const,
    dataConfidence:
      recommended
        ? "high" as const
        : "none" as const,
    riskLevel:
      recommended
        ? "low" as const
        : null,
    rankBand:
      recommended
        ? "top" as const
        : null,
    dimensions:
      recommended
        ? {
            priceValue:
              7.1 +
              offset /
                100,
            quality:
              8.8,
            location:
              9.1,
            comfort:
              8.9,
            flexibility:
              8.4,
            userFit:
              9,
            reliability:
              8.7,
          }
        : null,
  };
}

function createCandidate(
  engine:
    "v2" | "v3",
  role:
    StayOptiBlindEvaluationRoleV3,
  status:
    StayOptiRoleAwareCandidateV3["status"] =
      "recommended"
): StayOptiRoleAwareCandidateV3 {
  const offset =
    engine ===
      "v2"
      ? 0
      : 7;

  return {
    engine,
    role,
    status,
    decisionFingerprint:
      createStableHashV3(
        {
          engine,
          role,
          status,
        },
        "stayopti-v3-12b-test-decision"
      ),
    reasonCodes: [
      "reason:shared",
      `reason:${engine}`,
    ],
    facts:
      createFacts(
        status,
        offset
      ),
  };
}

function createSource(
  caseId:
    string,
  questionRole:
    StayOptiBlindEvaluationRoleV3,
  v2Role =
    questionRole,
  v3Role =
    questionRole
): StayOptiRoleAwareBlindSourceCaseV3 {
  const status =
    questionRole ===
      "abstention-near-tie"
      ? "abstained" as const
      : "recommended" as const;

  return {
    caseId,
    caseType:
      questionRole ===
        "abstention-near-tie"
        ? "adversarial"
        : "baseline",
    evaluationQuestionRole:
      questionRole,
    context:
      createContext(),
    v2:
      createCandidate(
        "v2",
        v2Role,
        status
      ),
    v3:
      createCandidate(
        "v3",
        v3Role,
        status
      ),
  };
}

function createBundle() {
  return createRoleAwareBlindReviewBundleV3([
    createSource(
      "case-best-choice-0001",
      "best-choice"
    ),
    createSource(
      "case-saving-0001",
      "best-sensible-saving"
    ),
    createSource(
      "case-upgrade-0001",
      "worthwhile-comfort-upgrade"
    ),
    createSource(
      "case-abstention-0001",
      "abstention-near-tie"
    ),
    createSource(
      "case-role-mismatch-0001",
      "best-choice",
      "best-choice",
      "best-sensible-saving"
    ),
  ]);
}

function findPacket(
  bundle:
    StayOptiRoleAwareBlindBundleV3,
  role:
    StayOptiBlindEvaluationRoleV3
) {
  const packet =
    bundle.packets.find(
      (candidate) =>
        candidate.evaluationQuestionRole ===
          role
    );

  assert.notEqual(
    packet,
    undefined
  );

  if (
    packet ===
      undefined
  ) {
    throw new Error(
      `Missing packet for ${role}.`
    );
  }

  return packet;
}

test(
  "V3-12B creates deterministic packets separated by explicit evaluation role",
  () => {
    const first =
      createBundle();

    const second =
      createRoleAwareBlindReviewBundleV3([
        createSource(
          "case-role-mismatch-0001",
          "best-choice",
          "best-choice",
          "best-sensible-saving"
        ),
        createSource(
          "case-abstention-0001",
          "abstention-near-tie"
        ),
        createSource(
          "case-upgrade-0001",
          "worthwhile-comfort-upgrade"
        ),
        createSource(
          "case-saving-0001",
          "best-sensible-saving"
        ),
        createSource(
          "case-best-choice-0001",
          "best-choice"
        ),
      ]);

    assert.equal(
      stableSerializeV3(
        first
      ),
      stableSerializeV3(
        second
      )
    );

    assert.deepEqual(
      validateRoleAwareBlindReviewBundleV3(
        first
      ),
      {
        valid:
          true,
        issues: [],
      }
    );

    assert.deepEqual(
      first.packets.map(
        (packet) =>
          packet.evaluationQuestionRole
      ),
      [
        "best-choice",
        "best-sensible-saving",
        "worthwhile-comfort-upgrade",
        "abstention-near-tie",
      ]
    );

    assert.deepEqual(
      first.counts,
      {
        source:
          5,
        evaluable:
          4,
        rejected:
          1,
        rolePackets:
          4,
      }
    );

    for (
      const packet
      of first.packets
    ) {
      assert.equal(
        packet.cases.every(
          (reviewCase) =>
            reviewCase.evaluationQuestionRole ===
              packet.evaluationQuestionRole
        ),
        true
      );
    }
  }
);

test(
  "role mismatch fails closed and remains only in the sealed rejection audit",
  () => {
    const bundle =
      createBundle();

    assert.deepEqual(
      bundle.sealed.rejections,
      [
        {
          caseId:
            "case-role-mismatch-0001",
          evaluationQuestionRole:
            "best-choice",
          v2Role:
            "best-choice",
          v3Role:
            "best-sensible-saving",
          v2Status:
            "recommended",
          v3Status:
            "recommended",
          reason:
            "role-mismatch",
        },
      ]
    );

    assert.equal(
      bundle.packets.some(
        (packet) =>
          packet.cases.some(
            (reviewCase) =>
              reviewCase.caseId ===
                "case-role-mismatch-0001"
          )
      ),
      false
    );

    const tampered =
      structuredClone(
        bundle
      );

    tampered.sealed.assignments[0]!
      .rightRole =
      "best-sensible-saving";

    const validation =
      validateRoleAwareBlindReviewBundleV3(
        tampered
      );

    assert.equal(
      validation.valid,
      false
    );
    assert.equal(
      validation.issues.includes(
        "role-mismatch"
      ),
      true
    );
  }
);

test(
  "visible packets expose the question but never engine labels, side roles or identities",
  () => {
    const bundle =
      createBundle();

    const visible =
      JSON.stringify(
        bundle.packets
      );

    assert.equal(
      visible.includes(
        "evaluationQuestionRole"
      ),
      true
    );

    for (
      const forbidden
      of [
        "leftLabel",
        "rightLabel",
        "leftRole",
        "rightRole",
        "decisionFingerprint",
        "reasonCodes",
        "engineVersion",
        "providerName",
        "propertyName",
        "hotelName",
        "\"v2\"",
        "\"v3\"",
      ]
    ) {
      assert.equal(
        visible.includes(
          forbidden
        ),
        false,
        `visible packet leaked ${forbidden}`
      );
    }
  }
);

test(
  "deterministic deblind keeps outcomes and reason diffs separated by role",
  () => {
    const bundle =
      createBundle();

    const bestChoice =
      findPacket(
        bundle,
        "best-choice"
      );

    const abstention =
      findPacket(
        bundle,
        "abstention-near-tie"
      );

    const responses = [
      {
        responseId:
          "response-best-choice-0001",
        packetId:
          bestChoice.packetId,
        packetFingerprint:
          bestChoice.fingerprint,
        caseId:
          bestChoice.cases[0]!.caseId,
        evaluatorToken:
          "reviewer-human-0001",
        evaluatorType:
          "human" as const,
        blinded:
          true as const,
        winner:
          "left" as const,
      },
      {
        responseId:
          "response-abstention-0001",
        packetId:
          abstention.packetId,
        packetFingerprint:
          abstention.fingerprint,
        caseId:
          abstention.cases[0]!.caseId,
        evaluatorToken:
          "reviewer-expert-0001",
        evaluatorType:
          "expert" as const,
        blinded:
          true as const,
        winner:
          "neither" as const,
      },
    ];

    const first =
      createRoleAwareDeblindReportV3(
        bundle,
        responses
      );

    const second =
      createRoleAwareDeblindReportV3(
        bundle,
        [...responses].reverse()
      );

    assert.equal(
      stableSerializeV3(
        first
      ),
      stableSerializeV3(
        second
      )
    );

    const assignment =
      bundle.sealed.assignments.find(
        (candidate) =>
          candidate.caseId ===
            bestChoice.cases[0]!.caseId
      )!;

    const bestChoiceJudgment =
      first.judgments.find(
        (judgment) =>
          judgment.evaluationQuestionRole ===
            "best-choice"
      )!;

    assert.equal(
      bestChoiceJudgment.winningEngine,
      assignment.leftLabel
    );

    assert.deepEqual(
      bestChoiceJudgment.reasonDiff,
      {
        shared: [
          "reason:shared",
        ],
        v2Only: [
          "reason:v2",
        ],
        v3Only: [
          "reason:v3",
        ],
      }
    );

    assert.deepEqual(
      first.byRole.find(
        (summary) =>
          summary.role ===
            "abstention-near-tie"
      ),
      {
        role:
          "abstention-near-tie",
        judgments:
          1,
        v2Wins:
          0,
        v3Wins:
          0,
        ties:
          0,
        neither:
          1,
      }
    );
  }
);

test(
  "responses are bound to their role packet and neither is abstention-only",
  () => {
    const bundle =
      createBundle();

    const bestChoice =
      findPacket(
        bundle,
        "best-choice"
      );

    const saving =
      findPacket(
        bundle,
        "best-sensible-saving"
      );

    assert.throws(
      () =>
        createRoleAwareDeblindReportV3(
          bundle,
          [
            {
              responseId:
                "response-cross-packet-0001",
              packetId:
                bestChoice.packetId,
              packetFingerprint:
                saving.fingerprint,
              caseId:
                bestChoice.cases[0]!.caseId,
              evaluatorToken:
                "reviewer-human-0002",
              evaluatorType:
                "human",
              blinded:
                true,
              winner:
                "left",
            },
          ]
        ),
      /Invalid or unbound/
    );

    assert.throws(
      () =>
        createRoleAwareDeblindReportV3(
          bundle,
          [
            {
              responseId:
                "response-neither-choice-0001",
              packetId:
                bestChoice.packetId,
              packetFingerprint:
                bestChoice.fingerprint,
              caseId:
                bestChoice.cases[0]!.caseId,
              evaluatorToken:
                "reviewer-human-0003",
              evaluatorType:
                "human",
              blinded:
                true,
              winner:
                "neither",
            },
          ]
        ),
      /abstention-near-tie/
    );
  }
);

test(
  "legacy V3-10 blind output is explicitly excluded from the V3-12B role-aware gate",
  () => {
    assert.deepEqual(
      STAYOPTI_ROLE_AWARE_BLIND_REVIEW_AUDIT_V3,
      {
        version:
          STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
        application:
          "offline-human-review-only",
        legacyRealCaseReviewRoleAwareGateEligible:
          false,
        roleMismatchHandling:
          "reject-and-audit",
        packetsSeparatedByRole:
          true,
        deterministicDeblind:
          true,
        abstentionEvaluatedSeparately:
          true,
        liveProviderCalls:
          false,
        bookingCalls:
          false,
        publicV2Changed:
          false,
        publicV3Enabled:
          false,
        splitEnabled:
          false,
        automaticPromotionAllowed:
          false,
      }
    );
  }
);
