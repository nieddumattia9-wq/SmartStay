import path from "node:path";

import {
  assert,
  readJsonFile,
  validateReleaseCandidateManifest,
  verifyManifestFiles,
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

    assert(
      key.startsWith(
        "--"
      ),
      `Unexpected argument: ${key}`
    );

    const value =
      argv[index + 1];

    assert(
      value &&
      !value.startsWith(
        "--"
      ),
      `Missing value for ${key}`
    );

    values.set(
      key,
      value
    );

    index +=
      1;
  }

  const manifestPath =
    values.get(
      "--manifest"
    );

  assert(
    manifestPath,
    "--manifest is required."
  );

  return {
    manifestPath:
      path.resolve(
        manifestPath
      ),
    rootPath:
      path.resolve(
        values.get(
          "--root"
        ) ??
        process.cwd()
      ),
    expectedReleaseSha:
      values.get(
        "--expected-sha"
      ) ??
      null,
  };
}

try {
  const config =
    parseArguments();

  const manifest =
    readJsonFile(
      config.manifestPath
    );

  const result =
    validateReleaseCandidateManifest(
      manifest,
      {
        expectedReleaseSha:
          config
            .expectedReleaseSha,
      }
    );

  verifyManifestFiles(
    manifest,
    config.rootPath
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        validationResult:
          "PASS",
        releaseSha:
          result.releaseSha,
        manifestPath:
          config.manifestPath,
        rootPath:
          config.rootPath,
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
          "RELEASE_CANDIDATE_VERIFICATION_FAILED",
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
