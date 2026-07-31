import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  pathToFileURL,
} from "node:url";
import test from "node:test";
import ts from "typescript";

async function importMarketRelativePreference() {
  const source =
    await readFile(
      "src/engine-v2/intent/marketRelativePreferenceV2.ts",
      "utf8"
    );

  const compiled =
    ts.transpileModule(
      source,
      {
        compilerOptions: {
          module:
            ts.ModuleKind.ESNext,
          target:
            ts.ScriptTarget.ES2022,
        },
      }
    ).outputText;

  const temporaryDirectory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "smartstay-r5b-"
      )
    );

  const modulePath =
    path.join(
      temporaryDirectory,
      "marketRelativePreference.mjs"
    );

  await writeFile(
    modulePath,
    compiled,
    "utf8"
  );

  return {
    module:
      await import(
        pathToFileURL(
          modulePath
        ).href
      ),

    cleanup: () =>
      rm(
        temporaryDirectory,
        {
          recursive:
            true,
          force:
            true,
        }
      ),
  };
}

function createBudgetIntent({
  level,
  median,
  budgetPerRoomNight =
    166.67,
  status =
    "strong-data",
  source =
    "current-search",
  confidence =
    0.76,
  sampleSize =
    10,
}) {
  const hasMedian =
    typeof median ===
      "number" &&
    Number.isFinite(
      median
    );

  return {
    status:
      status,
    preferenceId:
      "balanced",
    level,
    totalBudget:
      500,
    nights:
      3,
    rooms:
      1,
    budgetPerRoomNight,
    market: {
      basis:
        "per-room-night",
      source:
        source,
      confidence:
        confidence,
      seasonalIndex:
        null,
      currency:
        "EUR",
      sampleSize:
        sampleSize,
      minimum:
        hasMedian
          ? median * 0.5
          : null,
      firstQuartile:
        hasMedian
          ? median * 0.75
          : null,
      median,
      thirdQuartile:
        hasMedian
          ? median * 1.25
          : null,
      ninetiethPercentile:
        hasMedian
          ? median * 1.7
          : null,
      maximum:
        hasMedian
          ? median * 2
          : null,
      budgetPercentile:
        level === "constrained"
          ? 10
          : 95,
      budgetToMedianRatio:
        hasMedian &&
        median > 0
          ? budgetPerRoomNight /
            median
          : null,
      budgetToUpperQuartileRatio:
        null,
    },
    policy: {
      active:
        true,
      experiencePriority:
        0.5,
      maximumBestChoiceExperienceLoss:
        10,
      maximumSavingExperienceLoss:
        10,
      minimumBestChoiceTierRank:
        0,
      experienceTargetRequired:
        false,
      savingRequiresExperienceParity:
        false,
    },
    bestAvailableExperienceScore:
      null,
    targetExperienceFloor:
      null,
    targetExperienceTier:
      "unknown",
    minimumBestChoiceMarketPositionPercentile:
      null,
    candidateEvaluations:
      [],
    reasonCodes:
      [],
  };
}

test(
  "R5B interprets the same budget differently using destination-market purchasing power",
  async () => {
    const {
      module,
      cleanup,
    } =
      await importMarketRelativePreference();

    try {
      const resolve =
        module.resolveMarketRelativeAutomaticPreferenceV2;

      const lowerCost =
        resolve({
          preferenceId:
            "balanced",
          selectedIndex:
            2,
          preferenceSource:
            "automatic",
          budgetIntent:
            createBudgetIntent({
              level:
                "premium",
              median:
                85,
            }),
        });

      const higherCost =
        resolve({
          preferenceId:
            "balanced",
          selectedIndex:
            2,
          preferenceSource:
            "automatic",
          budgetIntent:
            createBudgetIntent({
              level:
                "constrained",
              median:
                350,
            }),
        });

      assert.equal(
        lowerCost.effectivePreferenceId,
        "comfort"
      );

      assert.equal(
        higherCost.effectivePreferenceId,
        "maximum-savings"
      );
    } finally {
      await cleanup();
    }
  }
);

test(
  "R5B preserves manual preferences and uses the extreme absolute guard only without usable market evidence",
  async () => {
    const {
      module,
      cleanup,
    } =
      await importMarketRelativePreference();

    try {
      const resolve =
        module.resolveMarketRelativeAutomaticPreferenceV2;

      const manual =
        resolve({
          preferenceId:
            "maximum-comfort",
          selectedIndex:
            0,
          preferenceSource:
            "manual",
          budgetIntent:
            createBudgetIntent({
              level:
                "constrained",
              median:
                350,
            }),
        });

      const extreme =
        resolve({
          preferenceId:
            "maximum-comfort",
          selectedIndex:
            0,
          preferenceSource:
            "automatic",
          budgetIntent:
            createBudgetIntent({
              level:
                "balanced",
              median:
                null,
              budgetPerRoomNight:
                25,
              status:
                "unavailable",
              source:
                "unavailable",
              confidence:
                0,
              sampleSize:
                0,
            }),
        });

      assert.equal(
        manual.effectivePreferenceId,
        "maximum-comfort"
      );

      assert.equal(
        extreme.effectivePreferenceId,
        "maximum-savings"
      );

      assert.equal(
        extreme.source,
        "absolute-extreme-budget"
      );
    } finally {
      await cleanup();
    }
  }
);

test(
  "R5B uses a neutral preliminary pass and freezes market evidence before reranking",
  async () => {
    const [
      adapterSource,
      resultsSource,
      resolverSource,
    ] =
      await Promise.all([
        readFile(
          "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
          "utf8"
        ),
        readFile(
          "src/pages/Results/Results.tsx",
          "utf8"
        ),
        readFile(
          "src/engine-v2/intent/marketRelativePreferenceV2.ts",
          "utf8"
        ),
      ]);

    assert.match(
      adapterSource,
      /preferenceId:\s*"balanced"[\s\S]{0,120}selectedIndex:\s*2/
    );

    assert.match(
      adapterSource,
      /createFrozenMarketObservations\(/
    );

    assert.match(
      adapterSource,
      /marketContextMode:\s*"local-only"/
    );

    assert.match(
      resultsSource,
      /marketRelativeAutomaticBalance:\s*true/
    );

    assert.match(
      resultsSource,
      /preferenceResolution[\s\S]{0,120}effectiveSelectedIndex/
    );

    assert.doesNotMatch(
      resolverSource.toLowerCase(),
      /new york|brazil|brasil|france|portugal|italy|italia/
    );
  }
);

test(
  "R5B keeps automatic selection invisible while allowing automatic identifiers",
  async () => {
    const uxTestSource =
      await readFile(
        "tests/release/t0RecommendationGroupsUxPolish.test.mjs",
        "utf8"
      );

    assert.doesNotMatch(
      uxTestSource,
      /!results\.includes\(\s*"Automatic"/,
      "The legacy broad Automatic source check must be removed."
    );

    assert.match(
      uxTestSource,
      /visibleAutomaticCopy/
    );

    const legacyGate =
      spawnSync(
        process.execPath,
        [
          "--test",
          "tests/release/t0RecommendationGroupsUxPolish.test.mjs",
        ],
        {
          encoding:
            "utf8",
          windowsHide:
            true,
          shell:
            false,
        }
      );

    assert.equal(
      legacyGate.status,
      0,
      [
        "The updated Recommendation Groups UX gate must pass.",
        legacyGate.stdout ?? "",
        legacyGate.stderr ?? "",
      ].join("\n")
    );
  }
);
