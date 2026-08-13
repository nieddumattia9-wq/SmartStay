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
      "stayopti-engine-v3-tests-"
    )
  );

const testDirectory =
  join(
    temporaryRoot,
    "tests",
    "engine-v3"
  );

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

function collectJavaScriptTests(
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
          return collectJavaScriptTests(
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

try {
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

  runCommand(
    process.execPath,
    [
      typeScriptCompiler,
      "-p",
      join(
        repositoryRoot,
        "tsconfig.tests.json"
      ),
      "--outDir",
      temporaryRoot,
    ],
    "StayOpti V3 test compilation"
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
    collectJavaScriptTests(
      testDirectory
    );

  if (
    testFiles.length ===
      0
  ) {
    fail(
      "No compiled StayOpti V3 tests were found."
    );
  }

  runCommand(
    process.execPath,
    [
      "--test",
      ...testFiles,
    ],
    "StayOpti Engine V3 tests"
  );
}
catch (
  error
) {
  console.error(
    `STAYOPTI ENGINE V3 TESTS: FAIL\n${error instanceof Error ? error.message : String(error)}`
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
