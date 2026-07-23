import fs from "node:fs";
import path from "node:path";

import {
  assert,
  createProductionReleasePlan,
  readJsonFile,
  sha256File,
  writeJsonFile,
} from "./releaseCandidateCore.mjs";

function parseArguments(
  argv =
    process.argv.slice(2)
) {
  const values =
    new Map();

  for (
    let index =
      0;
    index <
      argv.length;
    index +=
      1
  ) {
    const key =
      argv[index];
    const value =
      argv[index + 1];

    assert(
      key.startsWith(
        "--"
      ) &&
      value &&
      !value.startsWith(
        "--"
      ),
      `Invalid argument: ${key}`
    );

    values.set(
      key,
      value
    );

    index +=
      1;
  }

  const required =
    [
      "--candidate-manifest",
      "--staging-smoke-report",
      "--live-journey-report",
      "--rollback-manifest",
      "--production-frontend-url",
      "--production-backend-url",
      "--output",
    ];

  for (
    const key of
    required
  ) {
    assert(
      values.has(
        key
      ),
      `${key} is required.`
    );
  }

  return {
    candidateManifestPath:
      path.resolve(
        values.get(
          "--candidate-manifest"
        )
      ),
    stagingSmokeReportPath:
      path.resolve(
        values.get(
          "--staging-smoke-report"
        )
      ),
    liveJourneyReportPath:
      path.resolve(
        values.get(
          "--live-journey-report"
        )
      ),
    rollbackManifestPath:
      path.resolve(
        values.get(
          "--rollback-manifest"
        )
      ),
    productionFrontendUrl:
      values.get(
        "--production-frontend-url"
      ),
    productionBackendUrl:
      values.get(
        "--production-backend-url"
      ),
    outputPath:
      path.resolve(
        values.get(
          "--output"
        )
      ),
  };
}

try {
  const config =
    parseArguments();

  for (
    const filePath of
    [
      config
        .candidateManifestPath,
      config
        .stagingSmokeReportPath,
      config
        .liveJourneyReportPath,
      config
        .rollbackManifestPath,
    ]
  ) {
    assert(
      fs.existsSync(
        filePath
      ),
      `Evidence file is missing: ${filePath}`
    );
  }

  const evidenceHashes = {
    candidateManifest:
      sha256File(
        config
          .candidateManifestPath
      ),
    stagingSmokeReport:
      sha256File(
        config
          .stagingSmokeReportPath
      ),
    liveJourneyReport:
      sha256File(
        config
          .liveJourneyReportPath
      ),
    rollbackManifest:
      sha256File(
        config
          .rollbackManifestPath
      ),
  };

  const plan =
    createProductionReleasePlan({
      candidateManifest:
        readJsonFile(
          config
            .candidateManifestPath
        ),
      stagingSmokeReport:
        readJsonFile(
          config
            .stagingSmokeReportPath
        ),
      liveJourneyReport:
        readJsonFile(
          config
            .liveJourneyReportPath
        ),
      rollbackManifest:
        readJsonFile(
          config
            .rollbackManifestPath
        ),
      productionFrontendUrl:
        config
          .productionFrontendUrl,
      productionBackendUrl:
        config
          .productionBackendUrl,
      evidenceHashes,
    });

  writeJsonFile(
    config.outputPath,
    plan
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        validationResult:
          "PASS",
        candidateSha:
          plan.candidateSha,
        rollbackSha:
          plan.rollbackSha,
        outputPath:
          config.outputPath,
        deployExecuted:
          false,
      }
    )}\n`
  );
} catch (error) {
  process.stderr.write(
    `${JSON.stringify(
      {
        validationResult:
          "FAIL",
        code:
          error?.code ??
          "PRODUCTION_RELEASE_EVIDENCE_INVALID",
        message:
          error?.message ??
          String(
            error
          ),
      },
      null,
      2
    )}\n`
  );

  process.exitCode =
    1;
}
