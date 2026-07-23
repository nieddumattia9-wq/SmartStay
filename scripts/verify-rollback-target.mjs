import {
  execFileSync,
} from "node:child_process";

import path from "node:path";

import {
  assert,
  normalizeSha,
  readJsonFile,
  validateReleaseCandidateManifest,
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

  for (
    const key of
    [
      "--current-sha",
      "--rollback-sha",
      "--rollback-manifest",
    ]
  ) {
    assert(
      values.has(
        key
      ),
      `${key} is required.`
    );
  }

  return {
    repositoryRoot:
      path.resolve(
        values.get(
          "--root"
        ) ??
        process.cwd()
      ),
    currentSha:
      values.get(
        "--current-sha"
      ),
    rollbackSha:
      values.get(
        "--rollback-sha"
      ),
    rollbackManifestPath:
      path.resolve(
        values.get(
          "--rollback-manifest"
        )
      ),
    outputPath:
      values.has(
        "--output"
      )
        ? path.resolve(
            values.get(
              "--output"
            )
          )
        : null,
  };
}

function git(
  repositoryRoot,
  args,
  {
    allowFailure =
      false,
  } = {}
) {
  const executable =
    process.platform ===
      "win32"
      ? "git.exe"
      : "git";

  try {
    return execFileSync(
      executable,
      args,
      {
        cwd:
          repositoryRoot,
        encoding:
          "utf8",
        windowsHide:
          true,
        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
      }
    ).trim();
  } catch (error) {
    if (
      allowFailure
    ) {
      return null;
    }

    throw error;
  }
}

function verifyRollbackTarget({
  repositoryRoot,
  currentSha,
  rollbackSha,
  rollbackManifest,
}) {
  const current =
    normalizeSha(
      currentSha,
      "current SHA"
    );

  const rollback =
    normalizeSha(
      rollbackSha,
      "rollback SHA"
    );

  assert(
    current !==
      rollback,
    "Rollback SHA must differ from the current release."
  );

  const manifest =
    validateReleaseCandidateManifest(
      rollbackManifest,
      {
        expectedReleaseSha:
          rollback,
      }
    );

  for (
    const sha of
    [
      current,
      rollback,
    ]
  ) {
    assert(
      git(
        repositoryRoot,
        [
          "cat-file",
          "-e",
          `${sha}^{commit}`,
        ],
        {
          allowFailure:
            true,
        }
      ) !==
        null,
      `Git commit is unavailable: ${sha}`
    );
  }

  const ancestorResult =
    git(
      repositoryRoot,
      [
        "merge-base",
        "--is-ancestor",
        rollback,
        current,
      ],
      {
        allowFailure:
          true,
      }
    );

  assert(
    ancestorResult !==
      null,
    "Rollback target must be an ancestor of the current release."
  );

  const remoteResult =
    git(
      repositoryRoot,
      [
        "merge-base",
        "--is-ancestor",
        rollback,
        "origin/main",
      ],
      {
        allowFailure:
          true,
      }
    );

  assert(
    remoteResult !==
      null,
    "Rollback target must be reachable from origin/main."
  );

  return Object.freeze({
    reportVersion:
      "39C22C-rollback-target-v1",
    validationResult:
      "PASS",
    currentSha:
      current,
    rollbackSha:
      manifest.releaseSha,
    deployExecuted:
      false,
    rollbackExecuted:
      false,
  });
}

try {
  const config =
    parseArguments();

  const result =
    verifyRollbackTarget({
      repositoryRoot:
        config.repositoryRoot,
      currentSha:
        config.currentSha,
      rollbackSha:
        config.rollbackSha,
      rollbackManifest:
        readJsonFile(
          config
            .rollbackManifestPath
        ),
    });

  if (
    config.outputPath
  ) {
    writeJsonFile(
      config.outputPath,
      result
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      result
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
          "ROLLBACK_TARGET_INVALID",
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

export {
  parseArguments,
  verifyRollbackTarget,
};
