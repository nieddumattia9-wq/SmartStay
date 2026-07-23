import {
  execFileSync,
} from "node:child_process";

import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  RELEASE_CANDIDATE_VERSION,
  aggregateFileEntries,
  assert,
  createFileEntry,
  normalizeSha,
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

  return {
    repositoryRoot:
      path.resolve(
        values.get(
          "--root"
        ) ??
        process.cwd()
      ),
    outputDirectory:
      path.resolve(
        values.get(
          "--output"
        ) ??
        path.join(
          process.cwd(),
          ".smartstay-release"
        )
      ),
    expectedReleaseSha:
      values.get(
        "--expected-sha"
      ) ??
      process.env
        .GITHUB_SHA ??
      process.env
        .RELEASE_SHA ??
      null,
  };
}

function git(
  repositoryRoot,
  args
) {
  const executable =
    process.platform ===
      "win32"
      ? "git.exe"
      : "git";

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
}

function listFilesRecursively(
  rootPath,
  relativeRoot
) {
  const absoluteRoot =
    path.join(
      rootPath,
      relativeRoot
    );

  assert(
    fs.existsSync(
      absoluteRoot
    ) &&
    fs.statSync(
      absoluteRoot
    ).isDirectory(),
    `Required release directory is missing: ${relativeRoot}`
  );

  const output =
    [];

  function visit(
    directory
  ) {
    for (
      const entry of
      fs.readdirSync(
        directory,
        {
          withFileTypes:
            true,
        }
      )
    ) {
      const target =
        path.join(
          directory,
          entry.name
        );

      assert(
        !entry.isSymbolicLink(),
        `Release artifacts may not contain symbolic links: ${target}`
      );

      if (
        entry.isDirectory()
      ) {
        visit(
          target
        );

        continue;
      }

      if (
        entry.isFile()
      ) {
        output.push(
          path
            .relative(
              rootPath,
              target
            )
            .replaceAll(
              "\\",
              "/"
            )
        );
      }
    }
  }

  visit(
    absoluteRoot
  );

  return output
    .sort();
}

function collectTrackedBackendFiles(
  repositoryRoot
) {
  return git(
    repositoryRoot,
    [
      "ls-files",
      "--",
      "server",
    ]
  )
    .split(
      /\r?\n/
    )
    .map(
      (entry) =>
        entry.trim()
    )
    .filter(Boolean)
    .filter(
      (entry) =>
        !entry
          .replaceAll(
            "\\",
            "/"
          )
          .split(
            "/"
          )
          .some(
            (segment) =>
              segment ===
                "node_modules" ||
              segment ===
                ".git" ||
              segment ===
                ".env" ||
              segment.startsWith(
                ".env."
              )
          )
    )
    .filter(
      (entry) =>
        fs.existsSync(
          path.join(
            repositoryRoot,
            entry
          )
        )
    )
    .sort();
}

function createReleaseCandidate({
  repositoryRoot,
  outputDirectory,
  expectedReleaseSha =
    null,
}) {
  const status =
    git(
      repositoryRoot,
      [
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ]
    );

  assert(
    !status,
    "Release candidate creation requires a clean working tree."
  );

  const releaseSha =
    normalizeSha(
      git(
        repositoryRoot,
        [
          "rev-parse",
          "HEAD",
        ]
      )
    );

  if (
    expectedReleaseSha
  ) {
    assert(
      releaseSha ===
        normalizeSha(
          expectedReleaseSha,
          "expected release SHA"
        ),
      "Repository HEAD does not match the requested release SHA."
    );
  }

  const frontendFiles =
    listFilesRecursively(
      repositoryRoot,
      "dist"
    )
      .map(
        (relativePath) =>
          createFileEntry(
            repositoryRoot,
            relativePath
          )
      );

  const backendFiles =
    collectTrackedBackendFiles(
      repositoryRoot
    )
      .map(
        (relativePath) =>
          createFileEntry(
            repositoryRoot,
            relativePath
          )
      );

  assert(
    frontendFiles.length >
      0,
    "Frontend release artifact is empty."
  );

  assert(
    backendFiles.length >
      0,
    "Backend release artifact is empty."
  );

  const lockfiles =
    Object.fromEntries(
      [
        "package-lock.json",
        "server/package-lock.json",
      ].map(
        (relativePath) => {
          const entry =
            createFileEntry(
              repositoryRoot,
              relativePath
            );

          return [
            relativePath,
            {
              sizeBytes:
                entry
                  .sizeBytes,
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
      new Date()
        .toISOString(),
    releaseSha,
    releaseShortSha:
      releaseSha.slice(
        0,
        12
      ),
    runtime: {
      node:
        process.version,
      runtimeStateMode:
        "in-memory-single-instance",
    },
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
      singleBackendInstance:
        true,
      runtimeStateMode:
        "in-memory-single-instance",
      routeStackRequired:
        false,
      manualProductionApproval:
        true,
      remoteStagingSmokeRequired:
        true,
      controlledLiveStagingJourneyRequired:
        true,
      previousCandidateRequiredForRollback:
        true,
    },
    actions: {
      deployExecuted:
        false,
      tagCreated:
        false,
      releaseCreated:
        false,
    },
  };

  fs.rmSync(
    outputDirectory,
    {
      recursive:
        true,
      force:
        true,
    }
  );

  fs.mkdirSync(
    outputDirectory,
    {
      recursive:
        true,
    }
  );

  const manifestPath =
    path.join(
      outputDirectory,
      "release-manifest.json"
    );

  writeJsonFile(
    manifestPath,
    manifest
  );

  fs.writeFileSync(
    path.join(
      outputDirectory,
      "release-summary.txt"
    ),
    [
      "SMARTSTAY RELEASE CANDIDATE",
      `Release SHA: ${releaseSha}`,
      `Frontend files: ${frontendFiles.length}`,
      `Frontend aggregate: ${manifest.artifacts.frontend.aggregateSha256}`,
      `Backend files: ${backendFiles.length}`,
      `Backend aggregate: ${manifest.artifacts.backend.aggregateSha256}`,
      "Deploy executed: NO",
      "Manual production approval required: YES",
      "",
    ].join(
      "\n"
    ),
    "utf8"
  );

  return {
    manifest,
    manifestPath,
  };
}

const isCli =
  process.argv[1] &&
  path.resolve(
    process.argv[1]
  ) ===
    path.resolve(
      fileURLToPath(
        import.meta.url
      )
    );

if (isCli) {
  try {
    const result =
      createReleaseCandidate(
        parseArguments()
      );

    process.stdout.write(
      `${JSON.stringify(
        {
          validationResult:
            "PASS",
          releaseSha:
            result.manifest
              .releaseSha,
          manifestPath:
            result.manifestPath,
          frontendFiles:
            result.manifest
              .artifacts
              .frontend
              .files
              .length,
          backendFiles:
            result.manifest
              .artifacts
              .backend
              .files
              .length,
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
            "RELEASE_CANDIDATE_FAILED",
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
}

export {
  collectTrackedBackendFiles,
  createReleaseCandidate,
  listFilesRecursively,
  parseArguments,
};
