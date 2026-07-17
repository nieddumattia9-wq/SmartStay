import assert from "node:assert/strict";
import test from "node:test";

import {
  SMARTSTAY_GOLDEN_DATASET_V2,
  SMARTSTAY_GOLDEN_DATASET_VERSION_V2,
  getSmartStayGoldenDatasetFingerprintV2,
  getSmartStayGoldenScenarioV2,
  validateSmartStayGoldenDatasetV2,
} from "../../src/engine-v2/golden-dataset/goldenDatasetV2";

test(
  "Golden Dataset V2 has the expected stable contract",
  () => {
    const validation =
      validateSmartStayGoldenDatasetV2();

    assert.equal(
      validation.version,
      SMARTSTAY_GOLDEN_DATASET_VERSION_V2
    );

    assert.equal(
      validation.scenarioCount,
      10
    );

    assert.equal(
      validation.candidateCount,
      39
    );

    assert.equal(
      validation.mutationCount,
      3
    );

    assert.equal(
      validation.counterfactualCount,
      7
    );

    assert.equal(
      validation.nearDuplicateGroupCount,
      1
    );

    assert.equal(
      validation.coveredInvariantCodes.length,
      20
    );

    assert.equal(
      validation.fingerprint,
      "47114588"
    );
  }
);

test(
  "Golden Dataset fingerprint is deterministic",
  () => {
    const first =
      getSmartStayGoldenDatasetFingerprintV2();

    const clone =
      JSON.parse(
        JSON.stringify(
          SMARTSTAY_GOLDEN_DATASET_V2
        )
      ) as typeof SMARTSTAY_GOLDEN_DATASET_V2;

    const second =
      getSmartStayGoldenDatasetFingerprintV2(
        clone
      );

    assert.equal(
      first,
      second
    );
  }
);

test(
  "Golden Dataset exposes all scenario kinds exactly once",
  () => {
    const kinds =
      SMARTSTAY_GOLDEN_DATASET_V2
        .map(
          (scenario) =>
            scenario.kind
        );

    assert.equal(
      new Set(
        kinds
      ).size,
      10
    );
  }
);

test(
  "Golden Dataset scenario lookup is deterministic",
  () => {
    const scenario =
      getSmartStayGoldenScenarioV2(
        "turin-near-duplicate-providers"
      );

    assert.ok(
      scenario
    );

    assert.equal(
      scenario.expectations
        .nearDuplicateGroups
        .length,
      1
    );

    assert.equal(
      getSmartStayGoldenScenarioV2(
        "unknown-scenario"
      ),
      null
    );
  }
);