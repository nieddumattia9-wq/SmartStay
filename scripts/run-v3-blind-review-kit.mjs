import {
  existsSync,
  mkdtempSync,
  rmSync,
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

const scriptRoot =
  dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  resolve(
    scriptRoot,
    ".."
  );

const temporaryRoot =
  mkdtempSync(
    join(
      tmpdir(),
      "stayopti-v3-blind-review-"
    )
  );

function run(
  command,
  args,
  label
) {
  const result =
    spawnSync(
      command,
      args,
      {
        cwd:
          repositoryRoot,
        stdio:
          "inherit",
        env:
          process.env,
        windowsHide:
          true,
      }
    );

  if (
    result.error
  ) {
    throw result.error;
  }

  if (
    result.status !==
      0
  ) {
    throw new Error(
      `${label} failed with exit code ${result.status ?? 1}.`
    );
  }
}

try {
  const compiler =
    join(
      repositoryRoot,
      "node_modules",
      "typescript",
      "bin",
      "tsc"
    );

  if (
    !existsSync(
      compiler
    )
  ) {
    throw new Error(
      "Local TypeScript compiler not found. Run npm install before the offline kit."
    );
  }

  run(
    process.execPath,
    [
      compiler,
      "-p",
      join(
        repositoryRoot,
        "tsconfig.v3-blind-review.json"
      ),
      "--outDir",
      temporaryRoot,
    ],
    "V3 blind-review compilation"
  );

  run(
    process.execPath,
    [
      join(
        temporaryRoot,
        "tools",
        "v3BlindReviewCli.js"
      ),
      ...process.argv.slice(
        2
      ),
    ],
    "V3 blind-review operation"
  );
}
catch (
  error
) {
  console.error(
    `STAYOPTI V3 BLIND REVIEW KIT: FAIL\n${error instanceof Error ? error.message : String(error)}`
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
