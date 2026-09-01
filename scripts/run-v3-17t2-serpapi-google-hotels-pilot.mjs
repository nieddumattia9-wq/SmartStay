import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASELINE_SOURCE_SHA = "640570740317cd36901fb605d73e6b7aeeadaff5";

function valueFor(args, name) {
  const prefix = `${name}=`;
  const value = args.find((entry) => entry.startsWith(prefix));
  return value === undefined ? null : value.slice(prefix.length);
}

function fail(code) {
  throw new Error(code);
}

function assertOutsideRepository(repositoryRoot, outputPath) {
  if (!isAbsolute(outputPath)) fail("SERPAPI_PILOT_OUTPUT_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(repositoryRoot, outputPath);
  if (relation === "" || (!relation.startsWith("..") && !isAbsolute(relation))) {
    fail("SERPAPI_PILOT_REPOSITORY_OUTPUT_PROHIBITED");
  }
}

export async function runV317T2(argv = process.argv.slice(2)) {
  const authorizationLiteral = valueFor(argv, "--authorization");
  const expectedHead = valueFor(argv, "--expected-head");
  const compiledRootValue = valueFor(argv, "--compiled-root");
  const outputValue = valueFor(argv, "--output");
  if (!authorizationLiteral || !expectedHead || !compiledRootValue || !outputValue) {
    fail("SERPAPI_PILOT_REQUIRED_ARGUMENT_MISSING");
  }
  if (!argv.includes("--authorize-retention-policy") || !argv.includes("--single-wave-max-48")) {
    fail("SERPAPI_PILOT_EXACT_ACKNOWLEDGEMENT_MISSING");
  }

  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const observedHead = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  if (!/^[0-9a-f]{40}$/.test(expectedHead) || observedHead !== expectedHead) {
    fail("SERPAPI_PILOT_EXECUTION_HEAD_MISMATCH");
  }
  const baselineIsAncestor = execFileSync(
    "git",
    ["merge-base", "--is-ancestor", BASELINE_SOURCE_SHA, observedHead],
    { cwd: repositoryRoot, stdio: "ignore" },
  );
  void baselineIsAncestor;
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  if (staged.length > 0) fail("SERPAPI_PILOT_STAGED_NOT_ZERO");

  const outputPath = resolve(outputValue);
  assertOutsideRepository(repositoryRoot, outputPath);
  const compiledRoot = resolve(compiledRootValue);
  const compiledRequire = createRequire(resolve(compiledRoot, "package.json"));
  const gate = compiledRequire(resolve(
    compiledRoot,
    "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.js",
  ));
  if (authorizationLiteral !== gate.STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3) {
    fail("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
  }

  let apiKey = process.env.SERPAPI_API_KEY ?? "";
  if (apiKey.length === 0) fail("SERPAPI_PILOT_API_KEY_MISSING");
  const rawDirectory = mkdtempSync(join(tmpdir(), "stayopti-v3-17t2-serpapi-raw-"));
  const rawPaths = new Set();
  const rawStore = {
    writeEphemeral(name, value) {
      const path = join(rawDirectory, name);
      writeFileSync(path, value, { encoding: "utf8", flag: "wx" });
      rawPaths.add(path);
    },
    removeEphemeral(name) {
      const path = join(rawDirectory, name);
      rmSync(path, { force: true });
      rawPaths.delete(path);
    },
    removeAllEphemeral() {
      for (const path of rawPaths) rmSync(path, { force: true });
      rawPaths.clear();
    },
  };

  try {
    const receipt = await gate.executeSerpApiGoogleHotelsPilotV3({
      authorization: {
        authorizationState: "AUTHORIZED_NOT_STARTED",
        literal: authorizationLiteral,
        sourceCommitSha: BASELINE_SOURCE_SHA,
        manifestHash: gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
        accountPlan: "FREE",
        retentionAuthorized: true,
      },
      apiKey,
      observedSourceSha: BASELINE_SOURCE_SHA,
      nowIso: new Date().toISOString(),
      clock: () => new Date().toISOString(),
      transport: {
        async send(request) {
          if (
            request.endpoint !== gate.STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3 ||
            request.engine !== gate.STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3 ||
            request.requestKind !== "MAIN_SEARCH"
          ) fail("SERPAPI_PILOT_TRANSPORT_ROUTE_NOT_ALLOWLISTED");
          const response = await fetch(request.url, {
            method: "GET",
            redirect: "manual",
            signal: AbortSignal.timeout(30_000),
          });
          if (response.status >= 300 && response.status < 400) {
            fail("SERPAPI_PILOT_REDIRECT_PROHIBITED");
          }
          let body = null;
          try {
            body = JSON.parse(await response.text());
          } catch {
            fail("SERPAPI_PILOT_RESPONSE_NOT_PROCESSABLE");
          }
          return { httpStatus: response.status, body };
        },
      },
      rawStore,
    });
    writeFileSync(outputPath, `${JSON.stringify(receipt)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    return receipt;
  } finally {
    rawStore.removeAllEphemeral();
    rmSync(rawDirectory, { recursive: true, force: true });
    apiKey = "";
    delete process.env.SERPAPI_API_KEY;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runV317T2()
    .then((receipt) => process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      requestCount: receipt.requestCount,
      failureClassification: receipt.failureClassification,
    })}\n`))
    .catch((error) => {
      const code = error instanceof Error && /^SERPAPI_PILOT_[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "SERPAPI_PILOT_SANITIZED_RUNNER_FAILURE";
      process.stdout.write(`${JSON.stringify({ status: "ABORTED", failureClassification: code })}\n`);
      process.exitCode = 1;
    });
}
