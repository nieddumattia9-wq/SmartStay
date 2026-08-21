import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3,
  STAYOPTI_LEGACY_DIAGNOSTIC_CASE_IDS_V3,
  STAYOPTI_LEGACY_DIAGNOSTIC_PROHIBITED_USES_V3,
  admitLegacyDiagnosticFixtureV3,
} from "../../src/engine-v3/evaluation/legacyDiagnosticQuarantineV3";

const fixturePath =
  resolve(
    process.cwd(),
    "tests/engine-v3/fixtures/v3-12a-diagnostic-judgments.json"
  );
const manifestPath =
  resolve(
    process.cwd(),
    "tests/engine-v3/fixtures/v3-12a-diagnostic-judgments.quarantine.json"
  );

function loadTexts() {
  return {
    fixture:
      readFileSync(
        fixturePath,
        "utf8"
      ),
    manifest:
      readFileSync(
        manifestPath,
        "utf8"
      ),
  };
}

test(
  "V3-12A.3 binds the byte-identical legacy fixture to all fifteen quarantined IDs",
  () => {
    const texts =
      loadTexts();
    const digest =
      createHash("sha256")
        .update(
          texts.fixture,
          "utf8"
        )
        .digest("hex");
    const result =
      admitLegacyDiagnosticFixtureV3(
        texts.fixture,
        texts.manifest,
        STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
      );

    assert.equal(
      digest,
      "44c81f0a68f2551c53e6a348d963c1d1076ab2ac524a1723460463db7ca5fa20"
    );
    if (
      result.status !== "admitted"
    ) {
      assert.fail(
        `Expected admitted quarantine context, received ${result.issueCode}.`
      );
    }

    const fixture =
      result.fixture as {
        cases: ReadonlyArray<{
          diagnosticId: string;
        }>;
      };

    assert.equal(
      fixture.cases.length,
      15
    );
    assert.deepEqual(
      fixture.cases.map(
        (candidate) =>
          candidate.diagnosticId
      ),
      STAYOPTI_LEGACY_DIAGNOSTIC_CASE_IDS_V3
    );
    assert.equal(
      result.provenanceStatus,
      "PARTIALLY_RECOVERED_NON_REPLAYABLE"
    );
    assert.equal(
      result.quarantineStatus,
      "LEGACY_DIAGNOSTIC_QUARANTINED"
    );
    assert.equal(
      Object.isFrozen(result),
      true
    );
    assert.equal(
      Object.isFrozen(result.fixture),
      true
    );
    assert.equal(
      Object.isFrozen(fixture.cases),
      true
    );
    assert.equal(
      Object.isFrozen(fixture.cases[0]),
      true
    );
  }
);

test(
  "every prohibited use is blocked explicitly without exposing partial records",
  () => {
    const texts =
      loadTexts();

    for (
      const prohibitedUse
      of STAYOPTI_LEGACY_DIAGNOSTIC_PROHIBITED_USES_V3
    ) {
      const result =
        admitLegacyDiagnosticFixtureV3(
          texts.fixture,
          texts.manifest,
          prohibitedUse
        );

      assert.deepEqual(
        result,
        {
          status: "blocked",
          allowedUse: null,
          quarantineStatus:
            "LEGACY_DIAGNOSTIC_QUARANTINED",
          provenanceStatus:
            "PARTIALLY_RECOVERED_NON_REPLAYABLE",
          fixture: null,
          issueCode:
            "LEGACY_DIAGNOSTIC_USE_PROHIBITED",
        },
        prohibitedUse
      );
      assert.equal(
        Object.isFrozen(result),
        true
      );
    }

    assert.equal(
      admitLegacyDiagnosticFixtureV3(
        texts.fixture,
        texts.manifest,
        "UNKNOWN_FUTURE_USE"
      ).issueCode,
      "LEGACY_DIAGNOSTIC_USE_PROHIBITED"
    );
  }
);

test(
  "digest, manifest and case-set drift all fail closed",
  () => {
    const texts =
      loadTexts();
    const fixture =
      JSON.parse(
        texts.fixture
      ) as {
        cases: unknown[];
      };
    const manifest =
      JSON.parse(
        texts.manifest
      ) as {
        allowedUse: string;
      };

    assert.equal(
      admitLegacyDiagnosticFixtureV3(
        `${texts.fixture}\n`,
        texts.manifest,
        STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
      ).issueCode,
      "LEGACY_DIAGNOSTIC_DIGEST_MISMATCH"
    );

    manifest.allowedUse =
      "REPLAY_INPUT";

    assert.equal(
      admitLegacyDiagnosticFixtureV3(
        texts.fixture,
        JSON.stringify(manifest),
        STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
      ).issueCode,
      "LEGACY_DIAGNOSTIC_MANIFEST_MISMATCH"
    );

    fixture.cases.pop();

    assert.equal(
      admitLegacyDiagnosticFixtureV3(
        JSON.stringify(fixture),
        texts.manifest,
        STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
      ).issueCode,
      "LEGACY_DIAGNOSTIC_DIGEST_MISMATCH"
    );
  }
);

test(
  "the quarantine module remains private and disconnected from public or decision boundaries",
  () => {
    const forbiddenFiles = [
      "src/engine-v3/index.ts",
      "src/engine-v3/orchestrator/stayOptiEngineV3.ts",
      "src/engine-v2/orchestrator/smartStayOrchestratorV2.ts",
      "src/main.tsx",
      "server/index.js",
    ];

    for (
      const relativePath
      of forbiddenFiles
    ) {
      const absolutePath =
        resolve(
          process.cwd(),
          relativePath
        );

      let source = "";

      try {
        source =
          readFileSync(
            absolutePath,
            "utf8"
          );
      }
      catch {
        continue;
      }

      assert.equal(
        source.includes(
          "legacyDiagnosticQuarantineV3"
        ),
        false,
        relativePath
      );
      assert.equal(
        source.includes(
          "v3-12a-diagnostic-judgments.json"
        ),
        false,
        relativePath
      );
    }
  }
);
