import assert from "node:assert/strict";
import test from "node:test";

import {
  SMARTSTAY_GOLDEN_DATASET_V2,
  SMARTSTAY_GOLDEN_DATASET_VERSION_V2,
  getSmartStayGoldenDatasetFingerprintV2,
  type SmartStayGoldenScenarioV2,
} from "../../src/engine-v2/golden-dataset/goldenDatasetV2";

import {
  assertSmartStayCalibrationPassedV2,
  evaluateSmartStayCalibrationGateV2,
  formatSmartStayCalibrationReportV2,
  type SmartStayCalibrationGateInputV2,
  type SmartStayCalibrationScenarioObservationV2,
} from "../../src/engine-v2/calibration/calibrationGateV2";

function createScenarioObservation(
  scenario:
    SmartStayGoldenScenarioV2
): SmartStayCalibrationScenarioObservationV2 {
  return {
    scenarioId:
      scenario.id,

    bestChoiceHotelId:
      scenario
        .expectations
        .bestChoiceHotelId,

    bestSensibleSavingHotelId:
      scenario
        .expectations
        .bestSensibleSavingHotelId,

    worthwhileComfortUpgradeHotelId:
      scenario
        .expectations
        .worthwhileComfortUpgradeHotelId,

    visibleHotelIds:
      [
        ...scenario
          .expectations
          .visibleHotelIds,
      ],

    additionalHotelIds:
      [
        ...scenario
          .expectations
          .additionalHotelIds,
      ],

    paretoDominatedHotelIds:
      [
        ...scenario
          .expectations
          .paretoDominatedHotelIds,
      ],

    nearDuplicateGroups:
      scenario
        .expectations
        .nearDuplicateGroups
        .map(
          (group) => ({
            canonicalPropertyKey:
              group
                .canonicalPropertyKey,

            primaryHotelId:
              group.primaryHotelId,

            memberHotelIds:
              [
                ...group
                  .memberHotelIds,
              ],
          })
        ),

    pairwiseOrder:
      scenario
        .expectations
        .pairwiseOrder
        .map(
          (order) => ({
            higherHotelId:
              order.higherHotelId,

            lowerHotelId:
              order.lowerHotelId,
          })
        ),

    counterfactuals:
      scenario
        .expectations
        .counterfactuals
        .map(
          (comparison) => ({
            selectedHotelId:
              comparison
                .selectedHotelId,

            alternativeHotelId:
              comparison
                .alternativeHotelId,

            verdict:
              comparison.verdict,

            costDirection:
              comparison
                .expectedCostDirection,

            utilityDirection:
              comparison
                .expectedUtilityDirection,
          })
        ),

    mutationOutcomes:
      scenario.mutations.map(
        (mutation) => ({
          mutationId:
            mutation.id,

          passedInvariantCodes:
            [
              ...mutation
                .expectationCodes,
            ],

          failedInvariantCodes:
            [],
        })
      ),

    runFingerprints: [
      `${scenario.id}:stable`,
      `${scenario.id}:stable`,
    ],
  };
}

function createPassingInput():
  SmartStayCalibrationGateInputV2 {
  return {
    datasetVersion:
      SMARTSTAY_GOLDEN_DATASET_VERSION_V2,

    datasetFingerprint:
      getSmartStayGoldenDatasetFingerprintV2(),

    scenarios:
      SMARTSTAY_GOLDEN_DATASET_V2
        .map(
          createScenarioObservation
        ),
  };
}

function getScenarioObservation(
  input:
    SmartStayCalibrationGateInputV2,
  scenarioId:
    string
) {
  const scenario =
    input.scenarios.find(
      (entry) =>
        entry.scenarioId ===
        scenarioId
    );

  assert.ok(
    scenario
  );

  return scenario;
}

function getIssueCodes(
  input:
    SmartStayCalibrationGateInputV2
) {
  return evaluateSmartStayCalibrationGateV2(
    input
  ).issues.map(
    (issue) =>
      issue.code
  );
}

test(
  "Calibration Gate V2 passes the complete Golden Dataset baseline",
  () => {
    const evaluation =
      evaluateSmartStayCalibrationGateV2(
        createPassingInput()
      );

    assert.equal(
      evaluation.status,
      "pass"
    );

    assert.ok(
      evaluation.metrics.every(
        (metric) =>
          metric.passed
      )
    );

    assert.equal(
      evaluation.issues.length,
      0
    );

    assert.doesNotThrow(
      () =>
        assertSmartStayCalibrationPassedV2(
          evaluation
        )
    );

    assert.match(
      formatSmartStayCalibrationReportV2(
        evaluation
      ),
      /SMARTSTAY CALIBRATION GATE V2: PASS/
    );
  }
);

test(
  "Calibration Gate blocks a mandatory-requirement regression",
  () => {
    const input =
      createPassingInput();

    const observation =
      getScenarioObservation(
        input,
        "rome-family-hard-constraints"
      );

    observation.bestChoiceHotelId =
      "rome-cheap-hotel-room";

    const evaluation =
      evaluateSmartStayCalibrationGateV2(
        input
      );

    assert.equal(
      evaluation.status,
      "fail"
    );

    assert.ok(
      evaluation.issues.some(
        (issue) =>
          issue.code ===
            "best-choice-mandatory-violation" &&
          issue.scenarioId ===
            "rome-family-hard-constraints"
      )
    );

    assert.throws(
      () =>
        assertSmartStayCalibrationPassedV2(
          evaluation
        ),
      /best-choice-mandatory-violation/
    );
  }
);

test(
  "Calibration Gate blocks an invented Best Choice when budget is insufficient",
  () => {
    const input =
      createPassingInput();

    const observation =
      getScenarioObservation(
        input,
        "barcelona-insufficient-budget"
      );

    observation.bestChoiceHotelId =
      "barcelona-a";

    const issueCodes =
      getIssueCodes(
        input
      );

    assert.ok(
      issueCodes.includes(
        "unexpected-best-choice"
      )
    );

    assert.ok(
      issueCodes.includes(
        "best-choice-outside-budget"
      )
    );
  }
);

test(
  "Calibration Gate blocks visible near-duplicate offers",
  () => {
    const input =
      createPassingInput();

    const observation =
      getScenarioObservation(
        input,
        "turin-near-duplicate-providers"
      );

    observation.visibleHotelIds.push(
      "turin-grand-route"
    );

    observation.additionalHotelIds =
      observation
        .additionalHotelIds
        .filter(
          (hotelId) =>
            hotelId !==
            "turin-grand-route"
        );

    const issueCodes =
      getIssueCodes(
        input
      );

    assert.ok(
      issueCodes.includes(
        "near-duplicate-visible-duplication"
      )
    );
  }
);

test(
  "Calibration Gate blocks non-deterministic repeated runs",
  () => {
    const input =
      createPassingInput();

    const observation =
      getScenarioObservation(
        input,
        "genoa-ranking-stability"
      );

    observation.runFingerprints = [
      "genoa:first",
      "genoa:second",
    ];

    const evaluation =
      evaluateSmartStayCalibrationGateV2(
        input
      );

    assert.equal(
      evaluation.status,
      "fail"
    );

    assert.ok(
      evaluation.issues.some(
        (issue) =>
          issue.code ===
          "determinism-regression"
      )
    );
  }
);

test(
  "Calibration Gate blocks a failed metamorphic invariant",
  () => {
    const input =
      createPassingInput();

    const observation =
      getScenarioObservation(
        input,
        "florence-balanced-couple"
      );

    const mutation =
      observation
        .mutationOutcomes[0];

    assert.ok(
      mutation
    );

    mutation.passedInvariantCodes =
      [];

    mutation.failedInvariantCodes = [
      "price-increase-cannot-improve",
    ];

    const evaluation =
      evaluateSmartStayCalibrationGateV2(
        input
      );

    assert.equal(
      evaluation.status,
      "fail"
    );

    assert.ok(
      evaluation.issues.some(
        (issue) =>
          issue.code ===
          "mutation-invariant-failed"
      )
    );
  }
);

test(
  "Calibration Gate blocks a mismatched dataset fingerprint",
  () => {
    const input =
      createPassingInput();

    input.datasetFingerprint =
      "00000000";

    const evaluation =
      evaluateSmartStayCalibrationGateV2(
        input
      );

    assert.equal(
      evaluation.status,
      "fail"
    );

    assert.ok(
      evaluation.issues.some(
        (issue) =>
          issue.code ===
          "dataset-fingerprint-mismatch"
      )
    );
  }
);