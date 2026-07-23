import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DENIED_ORIGIN,
  normalizeHttpsUrl,
  normalizeReleaseSha,
  parseCliArguments,
} from "../../scripts/run-staging-runtime-smoke.mjs";

test(
  "staging smoke CLI resolves a safe local contract without release secrets",
  () => {
    const config =
      parseCliArguments(
        [
          "--local",
          "--repo",
          process.cwd(),
          "--output",
          "C:/temp/smartstay-smoke.json",
          "--timeout-ms",
          "20000",
        ],
        {}
      );

    assert.equal(
      config.mode,
      "local"
    );

    assert.equal(
      config.timeoutMs,
      20_000
    );

    assert.match(
      config.outputPath,
      /smartstay-smoke\.json$/i
    );

    assert.equal(
      config.expectedReleaseSha,
      null
    );
  }
);

test(
  "remote staging smoke requires public HTTPS URLs and an exact release SHA",
  () => {
    const config =
      parseCliArguments(
        [],
        {
          STAGING_BACKEND_URL:
            "https://api-staging.smartstay.example",
          STAGING_FRONTEND_URL:
            "https://staging.smartstay.example",
          EXPECTED_RELEASE_SHA:
            "1234567890abcdef1234567890abcdef12345678",
        }
      );

    assert.equal(
      config.mode,
      "remote"
    );

    assert.equal(
      config.backendUrl,
      "https://api-staging.smartstay.example"
    );

    assert.equal(
      config.frontendOrigin,
      "https://staging.smartstay.example"
    );

    assert.equal(
      config.deniedOrigin,
      DEFAULT_DENIED_ORIGIN
    );

    assert.equal(
      config.expectedReleaseSha,
      "1234567890abcdef1234567890abcdef12345678"
    );
  }
);

test(
  "remote staging smoke rejects localhost, HTTP, credentials and query strings",
  () => {
    for (
      const candidate of
      [
        "http://staging.smartstay.example",
        "https://localhost:3001",
        "https://user:pass@staging.smartstay.example",
        "https://staging.smartstay.example?debug=1",
      ]
    ) {
      assert.throws(
        () =>
          normalizeHttpsUrl(
            candidate,
            "candidate"
          ),
        /public HTTPS URL/
      );
    }
  }
);

test(
  "release SHA validation accepts Git hashes and rejects arbitrary identifiers",
  () => {
    assert.equal(
      normalizeReleaseSha(
        "abcdef1"
      ),
      "abcdef1"
    );

    assert.throws(
      () =>
        normalizeReleaseSha(
          "release-latest"
        ),
      /release SHA is invalid/i
    );
  }
);

test(
  "remote staging smoke does not accept missing deployment coordinates",
  () => {
    assert.throws(
      () =>
        parseCliArguments(
          [],
          {}
        ),
      /STAGING_FRONTEND_URL is required/
    );
  }
);
