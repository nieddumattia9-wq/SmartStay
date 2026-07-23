import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  test,
} from "node:test";
import {
  fileURLToPath,
} from "node:url";

const repositoryRoot =
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url
      )
    ),
    "../.."
  );

function read(relativePath) {
  return fs.readFileSync(
    path.join(
      repositoryRoot,
      relativePath
    ),
    "utf8"
  );
}

test(
  "beta analytics gate is permanent release evidence and remains provider-neutral",
  () => {
    const packageManifest =
      JSON.parse(
        read("package.json")
      );

    assert.equal(
      packageManifest.scripts
        ["gate:analytics-beta"],
      "node scripts/run-analytics-beta-measurement-gate.mjs"
    );

    assert.match(
      packageManifest.scripts
        ["release:ci"],
      /npm run gate:analytics-beta/
    );

    const gate =
      read(
        "scripts/run-analytics-beta-measurement-gate.mjs"
      );

    assert.match(
      gate,
      /providerLiveCalls:\s*0/
    );
    assert.match(
      gate,
      /externalAnalyticsCalls:\s*0/
    );
    assert.doesNotMatch(
      gate,
      /LiteAPI|RouteStack|providerContext/
    );
  }
);

test(
  "analytics report and deletion surfaces are admin-protected and never expose raw records",
  () => {
    const app =
      read("server/app.js");
    const admin =
      read(
        "server/routes/analyticsAdmin.js"
      );

    assert.match(
      app,
      /\/api\/internal\/analytics\/report/
    );
    assert.match(
      app,
      /\/api\/internal\/analytics\/data/
    );
    assert.match(
      admin,
      /timingSafeEqual/
    );
    assert.match(
      admin,
      /createAnalyticsBetaReport/
    );
    assert.doesNotMatch(
      admin,
      /readAll\(/
    );
  }
);

test(
  "beta analytics adds no third-party SDK and documents volatile storage honestly",
  () => {
    const manifests = [
      JSON.parse(
        read("package.json")
      ),
      JSON.parse(
        read("server/package.json")
      ),
    ];

    const dependencyNames =
      manifests.flatMap(
        (manifest) => [
          ...Object.keys(
            manifest.dependencies ?? {}
          ),
          ...Object.keys(
            manifest.devDependencies ?? {}
          ),
        ]
      );

    for (
      const forbiddenSdk of
      [
        "@google-analytics/data",
        "@segment/analytics-node",
        "mixpanel",
        "posthog-node",
        "hotjar",
      ]
    ) {
      assert.equal(
        dependencyNames.includes(
          forbiddenSdk
        ),
        false
      );
    }

    const privacy =
      read(
        "docs/ANALYTICS_PRIVACY.md"
      );
    const measurement =
      read(
        "docs/ANALYTICS_BETA_MEASUREMENT.md"
      );

    assert.match(
      privacy,
      /in-memory-single-instance/
    );
    assert.match(
      measurement,
      /lost when the backend restarts/i
    );
    assert.match(
      measurement,
      /100 started search journeys/i
    );
  }
);
