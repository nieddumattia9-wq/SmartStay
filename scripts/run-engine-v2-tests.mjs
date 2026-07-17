import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  dirname,
  join,
  resolve,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  spawnSync,
} from "node:child_process";

const scriptDirectory =
  dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  resolve(
    scriptDirectory,
    ".."
  );

const temporaryRoot =
  mkdtempSync(
    join(
      tmpdir(),
      "smartstay-engine-v2-tests-"
    )
  );

const testDirectory =
  join(
    temporaryRoot,
    "tests",
    "engine-v2"
  );

const supportedFilters =
  new Set([
    "--calibration",
    "--ranking",
    "--golden",
  ]);

function fail(
  message
) {
  throw new Error(
    message
  );
}

function runCommand(
  executable,
  argumentsList,
  label
) {
  const result =
    spawnSync(
      executable,
      argumentsList,
      {
        cwd:
          repositoryRoot,

        stdio:
          "inherit",

        env:
          process.env,
      }
    );

  if (
    result.error
  ) {
    throw result.error;
  }

  if (
    result.signal
  ) {
    fail(
      `${label} terminated by signal ${result.signal}.`
    );
  }

  if (
    result.status !==
    0
  ) {
    fail(
      `${label} failed with exit code ${result.status}.`
    );
  }
}

function collectJavaScriptFiles(
  directory
) {
  if (
    !existsSync(
      directory
    )
  ) {
    return [];
  }

  return readdirSync(
    directory,
    {
      withFileTypes:
        true,
    }
  )
    .flatMap(
      (entry) => {
        const entryPath =
          join(
            directory,
            entry.name
          );

        if (
          entry.isDirectory()
        ) {
          return collectJavaScriptFiles(
            entryPath
          );
        }

        return entry.isFile() &&
          entry.name.endsWith(
            ".test.js"
          )
          ? [
              entryPath,
            ]
          : [];
      }
    )
    .sort();
}

function resolveRequestedFilter() {
  const requested =
    process.argv.slice(
      2
    );

  if (
    requested.length >
    1
  ) {
    fail(
      "Only one SmartStay test filter can be used at a time."
    );
  }

  const filter =
    requested[0] ??
    null;

  if (
    filter &&
    !supportedFilters.has(
      filter
    )
  ) {
    fail(
      `Unsupported SmartStay test filter: ${filter}`
    );
  }

  return filter;
}

function filterTestFiles(
  files,
  filter
) {
  if (
    filter ===
    "--calibration"
  ) {
    return files.filter(
      (filePath) =>
        filePath.includes(
          "calibrationGateV2.test.js"
        )
    );
  }

  if (
    filter ===
    "--ranking"
  ) {
    return files.filter(
      (filePath) =>
        filePath.includes(
          "rankingStabilityDiversityV2.test.js"
        )
    );
  }

  if (
    filter ===
    "--golden"
  ) {
    return files.filter(
      (filePath) =>
        filePath.includes(
          "goldenDatasetV2.test.js"
        )
    );
  }

  return files;
}

try {
  const filter =
    resolveRequestedFilter();

  const typeScriptCompiler =
    join(
      repositoryRoot,
      "node_modules",
      "typescript",
      "bin",
      "tsc"
    );

  if (
    !existsSync(
      typeScriptCompiler
    )
  ) {
    fail(
      "Local TypeScript compiler not found."
    );
  }

  const testConfig =
    join(
      repositoryRoot,
      "tsconfig.tests.json"
    );

  if (
    !existsSync(
      testConfig
    )
  ) {
    fail(
      "tsconfig.tests.json not found."
    );
  }

  runCommand(
    process.execPath,
    [
      typeScriptCompiler,
      "-p",
      testConfig,
      "--outDir",
      temporaryRoot,
    ],
    "SmartStay test compilation"
  );

  writeFileSync(
    join(
      temporaryRoot,
      "package.json"
    ),
    JSON.stringify(
      {
        type:
          "commonjs",
      },
      null,
      2
    ),
    "utf8"
  );

  const testFiles =
    filterTestFiles(
      collectJavaScriptFiles(
        testDirectory
      ),
      filter
    );

  if (
    testFiles.length ===
    0
  ) {
    fail(
      "No compiled SmartStay test files matched the requested filter."
    );
  }

  runCommand(
    process.execPath,
    [
      "--test",
      ...testFiles,
    ],
    "SmartStay Engine V2 tests"
  );
}
catch (
  error
) {
  const message =
    error instanceof Error
      ? error.message
      : String(
          error
        );

  console.error(
    `SMARTSTAY ENGINE V2 TESTS: FAIL\n${message}`
  );

  process.exitCode =
    1;
}
finally {
  rmSync(
    temporaryRoot,
    {
      recursive:
        true,

      force:
        true,
    }
  );
}