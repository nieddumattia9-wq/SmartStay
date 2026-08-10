import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";

const LEGACY_PUBLIC_BRAND =
  /\bSmartStay\b/g;

const RUNTIME_TEXT_EXTENSIONS =
  new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
  ]);

function readText(
  relativePath
) {
  return readFileSync(
    relativePath,
    "utf8"
  ).replace(
    /\r\n/g,
    "\n"
  );
}

function collectRuntimeTextFiles(
  directory
) {
  const files = [];

  for (
    const entry
    of readdirSync(
      directory,
      {
        withFileTypes:
          true,
      }
    )
  ) {
    const candidate =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      files.push(
        ...collectRuntimeTextFiles(
          candidate
        )
      );
      continue;
    }

    if (
      entry.isFile() &&
      RUNTIME_TEXT_EXTENSIONS.has(
        path.extname(
          entry.name
        )
      )
    ) {
      files.push(candidate);
    }
  }

  return files;
}

function locateLegacyBrand(
  relativePath
) {
  const text =
    readText(relativePath);

  const matches = [];

  for (
    const match
    of text.matchAll(
      LEGACY_PUBLIC_BRAND
    )
  ) {
    const before =
      text.slice(
        0,
        match.index
      );

    matches.push({
      path:
        relativePath.replaceAll(
          "\\",
          "/"
        ),
      line:
        before.split("\n")
          .length,
    });
  }

  return matches;
}

test(
  "StayOpti is the only standalone public brand in runtime surfaces",
  () => {
    const runtimeFiles = [
      "index.html",
      ...collectRuntimeTextFiles(
        "src"
      ),
    ];

    const legacyMatches =
      runtimeFiles.flatMap(
        locateLegacyBrand
      );

    assert.deepEqual(
      legacyMatches,
      [],
      `Legacy public brand remains in runtime source: ${JSON.stringify(
        legacyMatches
      )}`
    );

    const requiredPublicSignals = [
      [
        "index.html",
        "<title>StayOpti</title>",
      ],
      [
        "index.html",
        "StayOpti helps travelers find smarter stays",
      ],
      [
        "src/components/Navbar/Navbar.tsx",
        'aria-label="StayOpti home"',
      ],
      [
        "src/components/Hero/Hero.tsx",
        "StayOpti",
      ],
      [
        "src/components/TripOptimizer/TripOptimizer.tsx",
        "Find my stay",
      ],
      [
        "src/components/SmartOptimizer/SmartOptimizer.tsx",
        "Your StayOpti balance",
      ],
      [
        "src/components/HotelCard/HotelCard.tsx",
        "Full StayOpti comparison",
      ],
      [
        "src/components/HotelCard/HotelCard.tsx",
        "StayOpti fit",
      ],
      [
        "src/pages/Results/Results.tsx",
        "Your StayOpti recommendations",
      ],
      [
        "src/pages/Results/Results.tsx",
        "Ranked by StayOpti Engine",
      ],
      [
        "src/pages/BetaFeedback/BetaFeedback.tsx",
        "Help us improve StayOpti",
      ],
      [
        "src/pages/Privacy/Privacy.tsx",
        "StayOpti does not collect payment-card details",
      ],
    ];

    for (
      const [
        relativePath,
        signal,
      ]
      of requiredPublicSignals
    ) {
      assert.ok(
        readText(
          relativePath
        ).includes(signal),
        `Missing StayOpti public signal in ${relativePath}: ${signal}`
      );
    }
  }
);

test(
  "the public rebrand preserves compatibility-sensitive legacy identifiers",
  () => {
    const rootPackage =
      JSON.parse(
        readText(
          "package.json"
        )
      );

    const serverPackage =
      JSON.parse(
        readText(
          "server/package.json"
        )
      );

    assert.equal(
      rootPackage.name,
      "smartstay"
    );

    assert.equal(
      serverPackage.name,
      "smartstay-server"
    );

    for (
      const legacyPath
      of [
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
        "src/engine-v2/model/smartStayEvaluationV2.ts",
        "src/engine-v2/orchestrator/smartStayEngineV2.ts",
        "src/utils/smartStaySearchProfile.ts",
      ]
    ) {
      assert.ok(
        existsSync(
          legacyPath
        ),
        `Compatibility-sensitive path was renamed: ${legacyPath}`
      );
    }

    const results =
      readText(
        "src/pages/Results/Results.tsx"
      );

    const loading =
      readText(
        "src/components/LoadingScreen/LoadingScreen.tsx"
      );

    const analytics =
      readText(
        "src/analytics/analyticsClient.ts"
      );

    const searchMeta =
      readText(
        "src/utils/searchMeta.ts"
      );

    const evaluationModel =
      readText(
        "src/engine-v2/model/smartStayEvaluationV2.ts"
      );

    const serverEnvironment =
      readText(
        "server/.env.example"
      );

    const renderBlueprint =
      readText(
        "render.yaml"
      );

    for (
      const signal
      of [
        "smartstay_search_meta_",
        "smartstay_ranking_v2_",
      ]
    ) {
      assert.ok(
        results.includes(signal),
        `Results compatibility key changed: ${signal}`
      );
    }

    for (
      const signal
      of [
        "smartstay_pending_search",
        "smartstay_active_loading_search_id",
        "smartstay_pending_search_lock",
        "smartstay_search_meta_",
      ]
    ) {
      assert.ok(
        loading.includes(signal),
        `Loading compatibility key changed: ${signal}`
      );
    }

    for (
      const signal
      of [
        "smartstay_analytics_session_v1",
        "smartstay_analytics_journey_v1",
      ]
    ) {
      assert.ok(
        analytics.includes(signal),
        `Analytics continuity key changed: ${signal}`
      );
    }

    assert.match(
      searchMeta,
      /\bsmartStayProfile\b/
    );

    assert.match(
      evaluationModel,
      /\bSmartStayEvaluationV2\b/
    );

    assert.match(
      serverEnvironment,
      /^SMARTSTAY_STATE_KEY_SECRET=/m
    );

    assert.match(
      renderBlueprint,
      /name:\s*smartstay-staging-api/
    );

    assert.match(
      renderBlueprint,
      /name:\s*smartstay-staging-web/
    );
  }
);
