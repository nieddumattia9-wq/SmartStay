import assert from "node:assert/strict";
import test from "node:test";

import type {
  SmartStayEvidenceFactV2,
  SmartStayReliabilityGateV2,
} from "../../src/engine-v2/model/smartStayEvaluationV2";

import {
  evaluateRiskV2,
} from "../../src/engine-v2/risk/riskEngine";

import type {
  SmartStayDataConfidenceEvaluationV2,
} from "../../src/engine-v2/risk/dataConfidenceEngine";

function fact(
  id: string,
  code: string,
  value:
    string |
    number |
    boolean
): SmartStayEvidenceFactV2 {
  return {
    id,
    code,
    availability:
      "known",
    value,
    unit:
      code ===
        "stay.cost.total"
        ? "EUR"
        : null,
    source:
      "provider",
    sourceProvider:
      "provider-a",
    sourceField:
      code,
    confidence:
      1,
    severity:
      "information",
    missingReasonCode:
      null,
    capturedAt:
      "2026-07-24T00:00:00.000Z",
    derivedFromEvidenceIds:
      [],
  };
}

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

const dataConfidence:
  SmartStayDataConfidenceEvaluationV2 = {
    score:
      100,
    level:
      "high",
    knownFieldCodes: [
      "stay.cost.total",
      "stay.currency",
      "offer.count",
      "offer.bookable",
      "stay.cost.completeness",
      "offer.refundable",
      "review.count",
      "location.distance",
    ],
    unknownFieldCodes:
      [],
    notApplicableFieldCodes:
      [],
    evidenceIds:
      [],
    conflictingFieldCodes:
      [],
    lowConfidenceFieldCodes:
      [],
    weightedCoverage:
      100,
    criticalCoverage:
      100,
    fields:
      [],
  };

function evaluate(
  refundable:
    boolean
) {
  const evidence:
    SmartStayEvidenceFactV2[] = [
      fact(
        "cost",
        "stay.cost.total",
        500
      ),
      fact(
        "completeness",
        "stay.cost.completeness",
        "reported-complete"
      ),
      fact(
        "refundability",
        "offer.refundable",
        refundable
      ),
      fact(
        "reviews",
        "review.count",
        500
      ),
      fact(
        "distance",
        "location.distance",
        1
      ),
    ];

  if (refundable) {
    evidence.push(
      fact(
        "deadline",
        "offer.free-cancellation-until",
        "2026-09-01T00:00:00.000Z"
      )
    );
  }

  return evaluateRiskV2({
    evidence,
    reliabilityGate,
    dataConfidence,
  });
}

test(
  "a known non-refundable offer cannot be labelled low risk",
  () => {
    const result =
      evaluate(
        false
      );

    assert.equal(
      result.level,
      "medium"
    );

    assert.ok(
      result.factorCodes.includes(
        "offer-non-refundable"
      )
    );

    assert.ok(
      result.score >
        0
    );
  }
);

test(
  "an otherwise equivalent refundable offer can remain low risk",
  () => {
    const result =
      evaluate(
        true
      );

    assert.equal(
      result.level,
      "low"
    );

    assert.ok(
      !result.factorCodes.includes(
        "offer-non-refundable"
      )
    );
  }
);
