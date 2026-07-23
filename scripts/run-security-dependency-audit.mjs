import {
  spawnSync,
} from "node:child_process";

import {
  fileURLToPath,
} from "node:url";

import path from "node:path";

const DEFAULT_TIMEOUT_MS =
  120_000;

function normalizeVulnerabilityCounts(
  report
) {
  const counts =
    report?.metadata
      ?.vulnerabilities ??
    {};

  return Object.freeze({
    info:
      Number(
        counts.info
      ) ||
      0,

    low:
      Number(
        counts.low
      ) ||
      0,

    moderate:
      Number(
        counts.moderate
      ) ||
      0,

    high:
      Number(
        counts.high
      ) ||
      0,

    critical:
      Number(
        counts.critical
      ) ||
      0,

    total:
      Number(
        counts.total
      ) ||
      0,
  });
}

function evaluateAuditReport(
  report
) {
  const vulnerabilities =
    normalizeVulnerabilityCounts(
      report
    );

  return Object.freeze({
    vulnerabilities,

    blocking:
      vulnerabilities.high >
        0 ||
      vulnerabilities.critical >
        0,
  });
}

function createNpmAuditInvocation(
  args,
  {
    environment =
      process.env,
    platform =
      process.platform,
    nodeExecutable =
      process.execPath,
  } = {}
) {
  const npmExecPath =
    typeof environment
      ?.npm_execpath ===
      "string" &&
    environment
      .npm_execpath
      .trim()
      ? environment
          .npm_execpath
          .trim()
      : null;

  if (npmExecPath) {
    return Object.freeze({
      executable:
        nodeExecutable,
      args: [
        npmExecPath,
        ...args,
      ],
    });
  }

  if (
    platform ===
    "win32"
  ) {
    return Object.freeze({
      executable:
        environment
          ?.ComSpec ||
        "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        [
          "npm.cmd",
          ...args,
        ].join(
          " "
        ),
      ],
    });
  }

  return Object.freeze({
    executable:
      "npm",
    args,
  });
}

function runNpmAudit({
  name,
  cwd,
  omitDev =
    false,
  timeoutMs =
    DEFAULT_TIMEOUT_MS,
  spawn =
    spawnSync,
  environment =
    process.env,
  platform =
    process.platform,
  nodeExecutable =
    process.execPath,
} = {}) {
  const args = [
    "audit",
    "--json",
    "--audit-level=high",
  ];

  if (omitDev) {
    args.push(
      "--omit=dev"
    );
  }

  const startedAt =
    Date.now();

  const invocation =
    createNpmAuditInvocation(
      args,
      {
        environment,
        platform,
        nodeExecutable,
      }
    );

  const result =
    spawn(
      invocation.executable,
      invocation.args,
      {
        cwd,
        encoding:
          "utf8",
        timeout:
          timeoutMs,
        maxBuffer:
          16 * 1024 * 1024,
        windowsHide:
          true,
      }
    );

  if (result.error) {
    throw new Error(
      `${name} dependency audit could not run: ${result.error.message}`
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        result.stdout ||
        "{}"
      );
  }
  catch {
    throw new Error(
      `${name} dependency audit returned invalid JSON.`
    );
  }

  const evaluation =
    evaluateAuditReport(
      parsed
    );

  if (
    result.status !==
      0 &&
    !evaluation.blocking
  ) {
    throw new Error(
      `${name} dependency audit exited with code ${result.status} without a high or critical vulnerability report.`
    );
  }

  return Object.freeze({
    name,
    cwd,
    omitDev,
    exitCode:
      result.status,
    durationMs:
      Math.max(
        0,
        Date.now() -
        startedAt
      ),
    ...evaluation,
  });
}

function runSecurityDependencyAudit({
  repositoryRoot =
    process.cwd(),
  timeoutMs =
    DEFAULT_TIMEOUT_MS,
  spawn =
    spawnSync,
} = {}) {
  const root =
    path.resolve(
      repositoryRoot
    );

  const audits = [
    runNpmAudit({
      name:
        "root",
      cwd:
        root,
      timeoutMs,
      spawn,
    }),

    runNpmAudit({
      name:
        "server-production",
      cwd:
        path.join(
          root,
          "server"
        ),
      omitDev:
        true,
      timeoutMs,
      spawn,
    }),
  ];

  const blocking =
    audits.some(
      (audit) =>
        audit.blocking
    );

  return Object.freeze({
    blocking,
    audits,
  });
}

function printAuditSummary(
  result
) {
  for (
    const audit of
    result.audits
  ) {
    const {
      vulnerabilities,
    } =
      audit;

    console.log(
      [
        audit.name,
        `critical=${vulnerabilities.critical}`,
        `high=${vulnerabilities.high}`,
        `moderate=${vulnerabilities.moderate}`,
        `low=${vulnerabilities.low}`,
        `total=${vulnerabilities.total}`,
      ].join(
        " "
      )
    );
  }

  console.log(
    result.blocking
      ? "SMARTSTAY DEPENDENCY SECURITY AUDIT: FAIL"
      : "SMARTSTAY DEPENDENCY SECURITY AUDIT: PASS"
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(
    process.argv[1]
  ) ===
    fileURLToPath(
      import.meta.url
    );

if (isMain) {
  try {
    const result =
      runSecurityDependencyAudit();

    printAuditSummary(
      result
    );

    if (result.blocking) {
      process.exitCode =
        1;
    }
  }
  catch (error) {
    console.error(
      error instanceof
        Error
        ? error.message
        : String(
            error
          )
    );

    process.exitCode =
      1;
  }
}

export {
  DEFAULT_TIMEOUT_MS,
  createNpmAuditInvocation,
  evaluateAuditReport,
  normalizeVulnerabilityCounts,
  printAuditSummary,
  runNpmAudit,
  runSecurityDependencyAudit,
};
