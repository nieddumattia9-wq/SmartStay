import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateComfortFlexibilityV2,
} from "../../src/engine-v2/comfort/comfortFlexibilityEngine";

import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
} from "../../src/engine-v2/model/smartStayEvaluationV2";

function knownFact(
  code:
    string,
  value:
    string |
    number |
    boolean,
  confidence:
    number
): SmartStayEvidenceFactV2 {
  return {
    id:
      "known:" +
      code,

    code,

    availability:
      "known",

    value,

    unit:
      null,

    source:
      "provider",

    sourceProvider:
      "LiteAPI",

    sourceField:
      code,

    confidence,

    severity:
      "information",

    missingReasonCode:
      null,

    capturedAt:
      null,

    derivedFromEvidenceIds:
      [],
  };
}

function unknownFact(
  code:
    string
): SmartStayEvidenceFactV2 {
  return {
    id:
      "unknown:" +
      code,

    code,

    availability:
      "unknown",

    value:
      null,

    unit:
      null,

    source:
      "provider",

    sourceProvider:
      "LiteAPI",

    sourceField:
      code,

    confidence:
      0,

    severity:
      "information",

    missingReasonCode:
      "feature-not-reported",

    capturedAt:
      null,

    derivedFromEvidenceIds:
      [],
  };
}

const accommodation = {
  category:
    "hotel" as const,

  unitType:
    "hotel-room" as const,

  originalCategory:
    "Hotels",

  confidence:
    0.99,

  evidenceIds: [
    "category:hotel",
  ],
};

const reliabilityGate:
  SmartStayReliabilityGateV2 = {
    status:
      "strong-data",

    eligible:
      true,

    blockingReasonCodes:
      [],

    warningCodes:
      [],

    evidenceIds:
      [],
  };

const cancellationEvidence:
  SmartStayEvidenceFactV2[] = [
    knownFact(
      "offer.refundable",
      true,
      0.95
    ),

    knownFact(
      "offer.free-cancellation-until",
      "2026-09-01 10:00:00",
      0.9
    ),

    unknownFact(
      "feature.reception"
    ),

    unknownFact(
      "feature.self-check-in"
    ),
  ];

test(
  "unknown contextual arrival features do not dilute verified cancellation flexibility",
  () => {
    const evaluation =
      evaluateComfortFlexibilityV2({
        targetHotelId:
          "hotel:flexible",

        accommodation,

        evidence:
          cancellationEvidence,

        reliabilityGate,

        stayContext: {
          nights:
            2,
        },
      });

    assert.equal(
      evaluation
        .dimensions
        .flexibility
        .score,
      100
    );

    assert.equal(
      evaluation
        .dimensions
        .flexibility
        .evidenceCoverage,
      1
    );

    assert.ok(
      evaluation
        .dimensions
        .flexibility
        .confidence >=
        0.9
    );
  }
);

test(
  "an explicitly preferred unknown self-check-in remains a confidence penalty",
  () => {
    const evaluation =
      evaluateComfortFlexibilityV2({
        targetHotelId:
          "hotel:requested-self-check-in",

        accommodation,

        evidence:
          cancellationEvidence,

        reliabilityGate,

        stayContext: {
          nights:
            2,
        },

        preferences: {
          preferredFeatureCodes: [
            "self-check-in",
          ],
        },
      });

    assert.equal(
      evaluation
        .dimensions
        .flexibility
        .score,
      100
    );

    assert.ok(
      evaluation
        .dimensions
        .flexibility
        .evidenceCoverage <
        1
    );

    assert.ok(
      evaluation
        .dimensions
        .flexibility
        .confidence <
        0.6
    );
  }
);

test(
  "unknown contextual comfort features still do not invent a comfort score",
  () => {
    const evaluation =
      evaluateComfortFlexibilityV2({
        targetHotelId:
          "hotel:no-comfort-evidence",

        accommodation,

        evidence: [
          ...cancellationEvidence,

          unknownFact(
            "feature.air-conditioning"
          ),

          unknownFact(
            "feature.elevator"
          ),

          unknownFact(
            "feature.private-bathroom"
          ),
        ],

        reliabilityGate,

        stayContext: {
          nights:
            2,
        },
      });

    assert.equal(
      evaluation
        .dimensions
        .comfort
        .score,
      null
    );

    assert.equal(
      evaluation
        .dimensions
        .comfort
        .confidence,
      0
    );
  }
);
