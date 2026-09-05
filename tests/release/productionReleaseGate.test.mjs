import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  execFileSync,
} from "node:child_process";

import {
  createReleaseCandidate,
} from "../../scripts/create-release-candidate.mjs";

import {
  LIVE_JOURNEY_VERSION,
  RELEASE_CANDIDATE_VERSION,
  REMOTE_SMOKE_VERSION,
  aggregateFileEntries,
  createFileEntry,
  createProductionReleasePlan,
  normalizeArtifactPath,
  validateReleaseCandidateManifest,
  validateRemoteSmokeReport,
  validateRollbackManifests,
  verifyManifestFiles,
} from "../../scripts/releaseCandidateCore.mjs";

function createFixture() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "smartstay-release-gate-"
      )
    );

  fs.mkdirSync(
    path.join(
      root,
      "dist"
    ),
    {
      recursive:
        true,
    }
  );

  fs.mkdirSync(
    path.join(
      root,
      "server"
    ),
    {
      recursive:
        true,
    }
  );

  fs.writeFileSync(
    path.join(
      root,
      "dist",
      "index.html"
    ),
    "<html></html>",
    "utf8"
  );

  fs.writeFileSync(
    path.join(
      root,
      "server",
      "server.js"
    ),
    "\"use strict\";\n",
    "utf8"
  );

  fs.writeFileSync(
    path.join(
      root,
      "package-lock.json"
    ),
    "{}\n",
    "utf8"
  );

  fs.writeFileSync(
    path.join(
      root,
      "server",
      "package-lock.json"
    ),
    "{}\n",
    "utf8"
  );

  const frontendFiles = [
    createFileEntry(
      root,
      "dist/index.html"
    ),
  ];

  const backendFiles = [
    createFileEntry(
      root,
      "server/server.js"
    ),
    createFileEntry(
      root,
      "server/package-lock.json"
    ),
  ];

  const lockfiles =
    Object.fromEntries(
      [
        "package-lock.json",
        "server/package-lock.json",
      ].map(
        (relativePath) => {
          const entry =
            createFileEntry(
              root,
              relativePath
            );

          return [
            relativePath,
            {
              sizeBytes:
                entry.sizeBytes,
              sha256:
                entry.sha256,
            },
          ];
        }
      )
    );

  const manifest = {
    reportVersion:
      RELEASE_CANDIDATE_VERSION,
    kind:
      "smartstay-release-candidate",
    generatedAt:
      "2026-07-23T00:00:00.000Z",
    releaseSha:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    artifacts: {
      frontend: {
        root:
          "dist",
        files:
          frontendFiles,
        aggregateSha256:
          aggregateFileEntries(
            frontendFiles
          ),
      },
      backend: {
        root:
          "server",
        files:
          backendFiles,
        aggregateSha256:
          aggregateFileEntries(
            backendFiles
          ),
      },
    },
    lockfiles,
    constraints: {
      backendInstances:
        2,
      searchWorkerInstances:
        2,
      runtimeStateMode:
        "valkey-distributed",
      sharedValkeyRequired:
        true,
      asynchronousSearchQueueRequired:
        true,
      providerAccountRateLimitsRequired:
        true,
      processLocalAnalyticsAllowed:
        false,
      routeStackRequired:
        false,
    },
  };

  return {
    root,
    manifest,
  };
}

function createRemoteSmoke(
  releaseSha
) {
  return {
    reportVersion:
      REMOTE_SMOKE_VERSION,
    validationResult:
      "PASS",
    mode:
      "remote",
    releaseSha,
    frontendUrl:
      "https://staging.smartstay.example",
    backendUrl:
      "https://api-staging.smartstay.example",
    checks: [
      {
        name:
          "frontend-https-load",
        passed:
          true,
      },
      {
        name:
          "readiness",
        passed:
          true,
      },
    ],
    liveProviderCalls:
      0,
  };
}

function createLiveJourney(
  releaseSha
) {
  return {
    reportVersion:
      LIVE_JOURNEY_VERSION,
    validationResult:
      "PASS",
    releaseSha,
    liveProviderCalls:
      4,
    checks: {
      destinationSearch:
        "PASS",
      hotelSearch:
        "PASS",
      lifecycle:
        "PASS",
      engineSelectedDetails:
        "PASS",
      selectedOfferIntegrity:
        "PASS",
      offerRecheck:
        "PASS",
      secureHandoff:
        "PASS",
      publicRedaction:
        "PASS",
      browserConsole:
        "PASS",
    },
    checkoutHttps:
      true,
    secretLeaks:
      0,
    providerPrivateLeaks:
      0,
  };
}

test(
  "release candidate manifest verifies file hashes, aggregates and lockfiles",
  () => {
    const fixture =
      createFixture();

    try {
      assert.equal(
        validateReleaseCandidateManifest(
          fixture.manifest,
          {
            expectedReleaseSha:
              fixture.manifest
                .releaseSha,
          }
        ).releaseSha,
        fixture.manifest
          .releaseSha
      );

      assert.equal(
        verifyManifestFiles(
          fixture.manifest,
          fixture.root
        ),
        true
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive:
            true,
          force:
            true,
        }
      );
    }
  }
);

test(
  "release candidate rejects environment files, dependencies and traversal",
  () => {
    for (
      const candidate of
      [
        "../secret",
        "server/.env",
        "server/.env.production",
        "server/node_modules/package/index.js",
        ".git/config",
      ]
    ) {
      assert.throws(
        () =>
          normalizeArtifactPath(
            candidate
          ),
        /artifact|traverse|environment|dependencies|Git/i
      );
    }
  }
);

test(
  "release verification detects any changed artifact",
  () => {
    const fixture =
      createFixture();

    try {
      fs.writeFileSync(
        path.join(
          fixture.root,
          "dist",
          "index.html"
        ),
        "<html>changed</html>",
        "utf8"
      );

      assert.throws(
        () =>
          verifyManifestFiles(
            fixture.manifest,
            fixture.root
          ),
        /differs from its manifest/
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive:
            true,
          force:
            true,
        }
      );
    }
  }
);

test(
  "remote staging smoke must be PASS, remote, HTTPS, exact SHA and provider-free",
  () => {
    const report =
      createRemoteSmoke(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      );

    assert.equal(
      validateRemoteSmokeReport(
        report,
        report.releaseSha
      ),
      true
    );

    assert.throws(
      () =>
        validateRemoteSmokeReport(
          {
            ...report,
            mode:
              "local",
          },
          report.releaseSha
        ),
      /remote staging smoke/
    );

    assert.throws(
      () =>
        validateRemoteSmokeReport(
          {
            ...report,
            liveProviderCalls:
              1,
          },
          report.releaseSha
        ),
      /must not call providers/
    );
  }
);

test(
  "production plan requires live staging evidence and a different rollback candidate",
  () => {
    const current =
      createFixture();

    const rollback =
      structuredClone(
        current.manifest
      );

    rollback.releaseSha =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    try {
      assert.deepEqual(
        validateRollbackManifests(
          current.manifest,
          rollback
        ),
        {
          currentSha:
            current.manifest
              .releaseSha,
          rollbackSha:
            rollback
              .releaseSha,
        }
      );

      const plan =
        createProductionReleasePlan({
          candidateManifest:
            current.manifest,
          stagingSmokeReport:
            createRemoteSmoke(
              current.manifest
                .releaseSha
            ),
          liveJourneyReport:
            createLiveJourney(
              current.manifest
                .releaseSha
            ),
          rollbackManifest:
            rollback,
          productionFrontendUrl:
            "https://www.smartstay.example",
          productionBackendUrl:
            "https://api.smartstay.example",
          evidenceHashes: {
            candidateManifest:
              "1".repeat(
                64
              ),
            stagingSmokeReport:
              "2".repeat(
                64
              ),
            liveJourneyReport:
              "3".repeat(
                64
              ),
            rollbackManifest:
              "4".repeat(
                64
              ),
          },
        });

      assert.equal(
        plan.validationResult,
        "PASS"
      );

      assert.equal(
        plan.actions
          .deployExecuted,
        false
      );

      assert.equal(
        plan.production
          .manualApprovalRequired,
        true
      );

      assert.equal(
        plan.production
          .minimumBackendInstances,
        2
      );

      assert.equal(
        plan.production
          .minimumSearchWorkerInstances,
        2
      );

      assert.equal(
        plan.production
          .distributedRuntimeRequired,
        true
      );

      assert.throws(
        () =>
          createProductionReleasePlan({
            candidateManifest:
              current.manifest,
            stagingSmokeReport:
              createRemoteSmoke(
                current.manifest
                  .releaseSha
              ),
            liveJourneyReport: {
              ...createLiveJourney(
                current.manifest
                  .releaseSha
              ),
              liveProviderCalls:
                0,
            },
            rollbackManifest:
              rollback,
            productionFrontendUrl:
              "https://www.smartstay.example",
            productionBackendUrl:
              "https://api.smartstay.example",
          }),
        /bounded number of real provider calls/
      );
    } finally {
      fs.rmSync(
        current.root,
        {
          recursive:
            true,
          force:
            true,
        }
      );
    }
  }
);

test(
  "production plan rejects same release as rollback and unsafe production URLs",
  () => {
    const fixture =
      createFixture();

    try {
      assert.throws(
        () =>
          validateRollbackManifests(
            fixture.manifest,
            fixture.manifest
          ),
        /must differ/
      );

      const rollback =
        structuredClone(
          fixture.manifest
        );

      rollback.releaseSha =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

      assert.throws(
        () =>
          createProductionReleasePlan({
            candidateManifest:
              fixture.manifest,
            stagingSmokeReport:
              createRemoteSmoke(
                fixture.manifest
                  .releaseSha
              ),
            liveJourneyReport:
              createLiveJourney(
                fixture.manifest
                  .releaseSha
              ),
            rollbackManifest:
              rollback,
            productionFrontendUrl:
              "http://www.smartstay.example",
            productionBackendUrl:
              "https://api.smartstay.example",
          }),
        /public HTTPS URL/
      );
    } finally {
      fs.rmSync(
        fixture.root,
        {
          recursive:
            true,
          force:
            true,
        }
      );
    }
  }
);

test(
  "release candidate creation uses a clean Git commit and ignored frontend build output",
  () => {
    const root =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "smartstay-release-candidate-git-"
        )
      );

    try {
      fs.mkdirSync(
        path.join(
          root,
          "server"
        ),
        {
          recursive:
            true,
        }
      );

      fs.writeFileSync(
        path.join(
          root,
          ".gitignore"
        ),
        "dist/\n.smartstay-release/\n",
        "utf8"
      );

      fs.writeFileSync(
        path.join(
          root,
          "package-lock.json"
        ),
        "{}\n",
        "utf8"
      );

      fs.writeFileSync(
        path.join(
          root,
          "server",
          "server.js"
        ),
        "\"use strict\";\n",
        "utf8"
      );

      fs.writeFileSync(
        path.join(
          root,
          "server",
          "package-lock.json"
        ),
        "{}\n",
        "utf8"
      );

      const git =
        process.platform ===
          "win32"
          ? "git.exe"
          : "git";

      const runGit =
        (args) =>
          execFileSync(
            git,
            args,
            {
              cwd:
                root,
              encoding:
                "utf8",
              windowsHide:
                true,
            }
          ).trim();

      runGit([
        "init",
      ]);

      runGit([
        "config",
        "user.email",
        "smartstay-tests@example.invalid",
      ]);

      runGit([
        "config",
        "user.name",
        "SmartStay Tests",
      ]);

      runGit([
        "add",
        ".",
      ]);

      runGit([
        "commit",
        "-m",
        "fixture",
      ]);

      const releaseSha =
        runGit([
          "rev-parse",
          "HEAD",
        ]);

      fs.mkdirSync(
        path.join(
          root,
          "dist"
        ),
        {
          recursive:
            true,
        }
      );

      fs.writeFileSync(
        path.join(
          root,
          "dist",
          "index.html"
        ),
        "<html></html>",
        "utf8"
      );

      const result =
        createReleaseCandidate({
          repositoryRoot:
            root,
          outputDirectory:
            path.join(
              root,
              ".smartstay-release"
            ),
          expectedReleaseSha:
            releaseSha,
        });

      assert.equal(
        result.manifest
          .releaseSha,
        releaseSha
      );

      assert.equal(
        result.manifest
          .actions
          .deployExecuted,
        false
      );

      assert.equal(
        verifyManifestFiles(
          result.manifest,
          root
        ),
        true
      );
    } finally {
      fs.rmSync(
        root,
        {
          recursive:
            true,
          force:
            true,
        }
      );
    }
  }
);

test(
  "repository release workflow creates evidence but contains no deployment command",
  () => {
    const repositoryRoot =
      path.resolve(
        path.dirname(
          new URL(
            import.meta.url
          ).pathname
            .replace(
              /^\/([A-Za-z]:)/,
              "$1"
            )
        ),
        "../.."
      );

    const packageJson =
      JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            "package.json"
          ),
          "utf8"
        )
      );

    for (
      const scriptName of
      [
        "release:candidate",
        "release:verify",
        "release:evidence",
        "rollback:verify",
      ]
    ) {
      assert.equal(
        typeof packageJson
          .scripts[
            scriptName
          ],
        "string"
      );
    }

    const workflow =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          ".github",
          "workflows",
          "release-gate.yml"
        ),
        "utf8"
      ).replace(/\r\n/g, "\n");

    assert.match(
      workflow,
      /Create immutable release candidate manifest/
    );

    assert.match(
      workflow,
      /actions\/upload-artifact@[0-9a-f]{40}/i
    );

    assert.doesNotMatch(
      workflow,
      /\b(?:deploy|kubectl|terraform|serverless)\b/i
    );
  }
);

test(
  "release artifacts require both the universal Linux gate and real Windows PowerShell 5.1 gate",
  () => {
    const repositoryRoot =
      path.resolve(
        path.dirname(
          new URL(
            import.meta.url
          ).pathname
            .replace(
              /^\/([A-Za-z]:)/,
              "$1"
            )
        ),
        "../.."
      );

    const workflow =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          ".github",
          "workflows",
          "release-gate.yml"
        ),
        "utf8"
      ).replace(/\r\n/g, "\n");

    const jobBlock =
      (jobName) => {
        const marker =
          `\n  ${jobName}:\n`;
        const start =
          workflow.indexOf(
            marker
          );

        assert.notEqual(
          start,
          -1,
          `Required workflow job ${jobName} is missing.`
        );

        const bodyStart =
          start + marker.length;
        const remainder =
          workflow.slice(
            bodyStart
          );
        const nextJob =
          remainder.match(
            /\n  [a-z0-9-]+:\n/i
          );

        return remainder.slice(
          0,
          nextJob?.index ?? remainder.length
        );
      };

    const linuxGate =
      jobBlock(
        "linux-release-gate"
      );
    const windowsGate =
      jobBlock(
        "windows-powershell-51-gate"
      );
    const releaseGate =
      jobBlock(
        "release-gate"
      );

    assert.match(
      linuxGate,
      /runs-on:\s*ubuntu-latest/
    );
    assert.match(
      linuxGate,
      /npm run release:ci/
    );
    assert.doesNotMatch(
      linuxGate,
      /Create immutable release candidate manifest|actions\/upload-artifact/
    );

    assert.match(
      windowsGate,
      /runs-on:\s*windows-latest/
    );
    assert.match(
      windowsGate,
      /shell:\s*powershell/
    );
    assert.match(
      windowsGate,
      /PSEdition\s+-ne\s+'Desktop'/
    );
    assert.match(
      windowsGate,
      /PSVersion\.Major\s+-ne\s+5/
    );
    assert.match(
      windowsGate,
      /PSVersion\.Minor\s+-ne\s+1/
    );
    assert.match(
      windowsGate,
      /C:\\Windows\\System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/
    );
    assert.match(
      windowsGate,
      /npm\.cmd run test:engine-v3/
    );
    assert.doesNotMatch(
      windowsGate,
      /\bpwsh\b|continue-on-error|Create immutable release candidate manifest|actions\/upload-artifact/i
    );

    assert.match(
      releaseGate,
      /needs:\s*\n\s+- linux-release-gate\s*\n\s+- windows-powershell-51-gate/
    );
    assert.match(
      releaseGate,
      /needs\.linux-release-gate\.result == 'success'/
    );
    assert.match(
      releaseGate,
      /needs\.windows-powershell-51-gate\.result == 'success'/
    );
    assert.match(
      releaseGate,
      /Create immutable release candidate manifest/
    );
    assert.match(
      releaseGate,
      /actions\/upload-artifact@[0-9a-f]{40}/i
    );
    assert.doesNotMatch(
      releaseGate,
      /continue-on-error/
    );

    const handoffTests =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "tests",
          "engine-v3",
          "v3SerpApiGoogleHotelsCanaryHandoff.test.ts"
        ),
        "utf8"
      );
    const evidenceTests =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "tests",
          "engine-v3",
          "v3SerpApiGoogleHotelsPilotEvidence.test.ts"
        ),
        "utf8"
      );
    const manualCaptureTests =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "tests",
          "engine-v3",
          "v3ManualPublicMarketDecisionGoldenCaptureCanary.test.ts"
        ),
        "utf8"
      );
    const quarantineTests =
      fs.readFileSync(
        path.join(
          repositoryRoot,
          "tests",
          "engine-v3",
          "v3ProviderRawQuarantineReplay.test.ts"
        ),
        "utf8"
      );

    for (
      const source of
      [
        handoffTests,
        evidenceTests,
        manualCaptureTests,
        quarantineTests,
      ]
    ) {
      assert.match(
        source,
        /requires real Windows PowerShell 5\.1; enforced by the required windows-latest release job/
      );
      assert.match(
        source,
        /powershell\.exe failed to start/
      );
      assert.match(
        source,
        /powershell\.exe returned status=null/
      );
      assert.match(
        source,
        /powershell\.exe stdout is unavailable/
      );
      assert.match(
        source,
        /powershell\.exe stderr is unavailable/
      );
    }
  }
);
