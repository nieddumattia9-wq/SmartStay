import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_ALLOWED_ORIGIN = "https://staging.smartstay.invalid";
const DEFAULT_DENIED_ORIGIN = "https://untrusted.smartstay.invalid";

function createSmokeError(message, detail = null) {
  const error = new Error(message);
  error.name = "SmartStayStagingSmokeError";
  error.detail = detail;
  return error;
}

function assert(condition, message, detail = null) {
  if (!condition) {
    throw createSmokeError(message, detail);
  }
}

function normalizeHttpsUrl(value, field, { originOnly = false } = {}) {
  const candidate = typeof value === "string" ? value.trim() : "";
  assert(candidate, `${field} is required.`);

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw createSmokeError(`${field} must be a valid URL.`);
  }

  assert(
    parsed.protocol === "https:" &&
      parsed.hostname &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1",
    `${field} must be a public HTTPS URL without credentials, query, or hash.`
  );

  if (originOnly) {
    assert(
      parsed.origin === candidate.replace(/\/$/, ""),
      `${field} must be an exact HTTPS origin.`
    );
    return parsed.origin;
  }

  return parsed.toString().replace(/\/$/, "");
}

function normalizeReleaseSha(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  assert(/^[0-9a-f]{7,64}$/i.test(candidate), "Expected release SHA is invalid.");
  return candidate;
}

function normalizeTimeout(value) {
  const parsed = Number(value ?? DEFAULT_TIMEOUT_MS);
  assert(
    Number.isInteger(parsed) && parsed >= 1_000 && parsed <= 120_000,
    "Smoke timeout must be an integer from 1000 to 120000 milliseconds."
  );
  return parsed;
}

function parseCliArguments(argv = process.argv.slice(2), environment = process.env) {
  const values = new Map();
  let local = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--local") {
      local = true;
      continue;
    }

    if (!token.startsWith("--")) {
      throw createSmokeError(`Unexpected argument: ${token}`);
    }

    const value = argv[index + 1];
    assert(value && !value.startsWith("--"), `Missing value for ${token}.`);
    values.set(token, value);
    index += 1;
  }

  const mode = local ? "local" : "remote";
  const timeoutMs = normalizeTimeout(
    values.get("--timeout-ms") ?? environment.SMARTSTAY_SMOKE_TIMEOUT_MS
  );

  const outputPath =
    values.get("--output") ??
    environment.SMARTSTAY_SMOKE_OUTPUT ??
    path.join(
      os.tmpdir(),
      `smartstay-staging-smoke-${mode}-${Date.now()}.json`
    );

  if (mode === "local") {
    return {
      mode,
      timeoutMs,
      outputPath: path.resolve(outputPath),
      repositoryRoot: path.resolve(
        values.get("--repo") ?? environment.SMARTSTAY_REPOSITORY_ROOT ?? process.cwd()
      ),
      expectedReleaseSha: values.get("--expected-release-sha") ?? environment.EXPECTED_RELEASE_SHA ?? null,
    };
  }

  const frontendUrl = normalizeHttpsUrl(
    values.get("--frontend-url") ?? environment.STAGING_FRONTEND_URL,
    "STAGING_FRONTEND_URL"
  );

  return {
    mode,
    timeoutMs,
    outputPath: path.resolve(outputPath),
    backendUrl: normalizeHttpsUrl(
      values.get("--backend-url") ?? environment.STAGING_BACKEND_URL,
      "STAGING_BACKEND_URL"
    ),
    frontendUrl,
    frontendOrigin: normalizeHttpsUrl(
      values.get("--frontend-origin") ?? environment.STAGING_FRONTEND_ORIGIN ?? new URL(frontendUrl).origin,
      "STAGING_FRONTEND_ORIGIN",
      { originOnly: true }
    ),
    deniedOrigin: normalizeHttpsUrl(
      values.get("--denied-origin") ?? environment.STAGING_DENIED_ORIGIN ?? DEFAULT_DENIED_ORIGIN,
      "STAGING_DENIED_ORIGIN",
      { originOnly: true }
    ),
    expectedReleaseSha: normalizeReleaseSha(
      values.get("--expected-release-sha") ??
        environment.EXPECTED_RELEASE_SHA ??
        environment.RELEASE_SHA
    ),
  };
}

function allocatePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function waitForMessage(child, predicate, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(createSmokeError("Timed out waiting for the staging process."));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      child.off("message", onMessage);
      child.off("exit", onExit);
    }

    function onMessage(message) {
      if (predicate(message)) {
        cleanup();
        resolve(message);
      }
    }

    function onExit(code, signal) {
      cleanup();
      reject(
        createSmokeError(
          `Staging process exited before the expected event: code=${code}, signal=${signal}`
        )
      );
    }

    child.on("message", onMessage);
    child.on("exit", onExit);
  });
}

async function request(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    ...options,
  });
  const text = await response.text();

  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}

function parseLogLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { unparsable: line };
      }
    });
}

function createRecorder(checks) {
  return function record(name, passed, detail = null) {
    checks.push({ name, passed: passed === true, detail });
    assert(passed === true, `${name} failed.`, detail);
  };
}

async function exerciseBackend({
  backendUrl,
  allowedOrigin,
  deniedOrigin,
  expectedReleaseSha,
  timeoutMs,
}) {
  const checks = [];
  const record = createRecorder(checks);
  const customRequestId = "smoke-request-39c22b-0001";

  const live = await request(
    `${backendUrl}/health/live`,
    {
      headers: {
        Origin: allowedOrigin,
        "X-Request-ID": customRequestId,
      },
    },
    timeoutMs
  );

  record("liveness-http-200", live.status === 200, live.status);
  record(
    "release-sha-in-liveness",
    live.body?.version === expectedReleaseSha,
    live.body
  );
  record(
    "staging-environment-in-liveness",
    live.body?.environment === "staging",
    live.body
  );
  record(
    "request-id-roundtrip",
    live.headers["x-request-id"] === customRequestId &&
      live.body?.requestId === customRequestId,
    {
      header: live.headers["x-request-id"],
      body: live.body?.requestId,
    }
  );
  record(
    "allowed-cors-origin",
    live.headers["access-control-allow-origin"] === allowedOrigin,
    live.headers["access-control-allow-origin"]
  );
  record(
    "security-headers",
    live.headers["cache-control"] === "no-store" &&
      live.headers["referrer-policy"] === "no-referrer" &&
      live.headers["x-content-type-options"] === "nosniff" &&
      !("x-powered-by" in live.headers),
    live.headers
  );

  const ready = await request(
    `${backendUrl}/health/ready`,
    { headers: { Origin: allowedOrigin } },
    timeoutMs
  );

  record(
    "readiness-http-200",
    ready.status === 200 &&
      ready.body?.status === "ready" &&
      ready.body?.version === expectedReleaseSha,
    ready
  );

  const legacy = await request(
    `${backendUrl}/health`,
    { headers: { Origin: allowedOrigin } },
    timeoutMs
  );

  record(
    "legacy-health-compatible",
    legacy.status === 200 &&
      legacy.body?.status === "ok" &&
      legacy.body?.version === expectedReleaseSha,
    legacy
  );

  const preflight = await request(
    `${backendUrl}/api/search-hotels`,
    {
      method: "OPTIONS",
      headers: {
        Origin: allowedOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "content-type,idempotency-key,x-request-id",
      },
    },
    timeoutMs
  );

  record(
    "cors-preflight",
    preflight.status === 204 &&
      preflight.headers["access-control-allow-origin"] === allowedOrigin,
    preflight
  );

  const denied = await request(
    `${backendUrl}/health/live`,
    { headers: { Origin: deniedOrigin } },
    timeoutMs
  );

  record(
    "untrusted-origin-denied",
    denied.status === 403 &&
      denied.body?.code === "CORS_ORIGIN_DENIED" &&
      !denied.headers["access-control-allow-origin"],
    denied
  );

  const invalidSearch = await request(
    `${backendUrl}/api/search-hotels`,
    {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        "Content-Type": "application/json",
        "Idempotency-Key": "smoke-idempotency-39c22b-0001",
      },
      body: "{}",
    },
    timeoutMs
  );

  record(
    "invalid-search-blocked-before-provider",
    invalidSearch.status === 400 &&
      invalidSearch.body?.code === "INVALID_SEARCH_REQUEST" &&
      typeof invalidSearch.body?.requestId === "string" &&
      invalidSearch.body.requestId.length > 0,
    invalidSearch
  );

  const unsupportedMedia = await request(
    `${backendUrl}/api/search-hotels`,
    {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        "Content-Type": "text/plain",
        "Idempotency-Key": "smoke-idempotency-39c22b-0002",
      },
      body: "not-json",
    },
    timeoutMs
  );

  record(
    "unsupported-media-type",
    unsupportedMedia.status === 415 &&
      unsupportedMedia.body?.code === "UNSUPPORTED_MEDIA_TYPE",
    unsupportedMedia
  );

  const missingRoute = await request(
    `${backendUrl}/does-not-exist`,
    { headers: { Origin: allowedOrigin } },
    timeoutMs
  );

  record(
    "canonical-route-not-found",
    missingRoute.status === 404 &&
      missingRoute.body?.code === "ROUTE_NOT_FOUND" &&
      typeof missingRoute.body?.requestId === "string" &&
      missingRoute.body.requestId.length > 0,
    missingRoute
  );

  return {
    checks,
    customRequestId,
  };
}

async function runLocalSmoke({
  repositoryRoot,
  expectedReleaseSha = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  outputPath = null,
} = {}) {
  const startedAt = Date.now();
  const root = path.resolve(repositoryRoot ?? process.cwd());
  const releaseSha =
    normalizeReleaseSha(
      expectedReleaseSha ??
        process.env.GITHUB_SHA ??
        process.env.RELEASE_SHA
    );

  const port = await allocatePort();
  const wrapperPath = path.join(
    os.tmpdir(),
    `smartstay-staging-smoke-child-${process.pid}-${Date.now()}.cjs`
  );
  const serverEntry = path.join(root, "server", "server.js");
  const allowedOrigin = DEFAULT_ALLOWED_ORIGIN;
  const deniedOrigin = DEFAULT_DENIED_ORIGIN;
  const secretValues = {
    GEOAPIFY_API_KEY: "geo-smoke-secret-39c22b",
    LITEAPI_API_KEY: "lite-smoke-secret-39c22b",
  };

  fs.writeFileSync(
    wrapperPath,
    `"use strict";
const { startServer } = require(${JSON.stringify(serverEntry)});
const runtime = startServer({ environment: process.env });
function publishStarted() {
  if (runtime.server.listening) {
    process.send?.({ type: "started", port: runtime.server.address().port });
    return;
  }
  runtime.server.once("listening", publishStarted);
}
publishStarted();
process.on("message", (message) => {
  if (message?.type !== "shutdown") return;
  runtime.server.once("close", () => {
    process.send?.({ type: "stopped" });
    runtime.removeProcessSafetyHandlers?.();
    setImmediate(() => process.exit(process.exitCode ?? 0));
  });
  runtime.stop("SMOKE_TEST");
});
`,
    "utf8"
  );

  const child = fork(wrapperPath, [], {
    cwd: root,
    silent: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DEPLOYMENT_ENV: "staging",
      PORT: String(port),
      CLIENT_ORIGINS: allowedOrigin,
      TRUST_PROXY: "1",
      VITE_API_URL: "https://api-staging.smartstay.invalid/api",
      GEOAPIFY_API_KEY: secretValues.GEOAPIFY_API_KEY,
      LITEAPI_API_KEY: secretValues.LITEAPI_API_KEY,
      LITEAPI_WHITELABEL_BASE_URL:
        "https://checkout-staging.smartstay.invalid",
      RELEASE_SHA: releaseSha,
      RUNTIME_STATE_MODE: "in-memory-single-instance",
      DOTENV_CONFIG_QUIET: "true",
    },
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const started = await waitForMessage(
      child,
      (message) => message?.type === "started",
      timeoutMs
    );

    assert(started.port === port, "The backend started on an unexpected port.");

    const backendResult = await exerciseBackend({
      backendUrl: `http://127.0.0.1:${port}`,
      allowedOrigin,
      deniedOrigin,
      expectedReleaseSha: releaseSha,
      timeoutMs,
    });

    const stoppedPromise = waitForMessage(
      child,
      (message) => message?.type === "stopped",
      timeoutMs
    );
    child.send({ type: "shutdown" });
    await stoppedPromise;

    await new Promise((resolve) => {
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once("exit", resolve);
    });

    const records = parseLogLines(stdout);
    const checks = [...backendResult.checks];
    const record = createRecorder(checks);
    const events = records.map((recordEntry) => recordEntry.event).filter(Boolean);

    record(
      "structured-service-lifecycle-logs",
      events.includes("service.started") &&
        events.includes("service.stopping") &&
        events.includes("service.stopped"),
      events
    );

    record(
      "request-id-in-structured-log",
      Boolean(
        records.find(
          (entry) =>
            entry.event === "http.request.completed" &&
            entry.requestId === backendResult.customRequestId
        )
      ),
      null
    );

    record(
      "secrets-absent-from-logs",
      !Object.values(secretValues).some((secret) =>
        `${stdout}\n${stderr}`.includes(secret)
      ),
      null
    );

    const providerEvents = records.filter(
      (entry) =>
        typeof entry.event === "string" && entry.event.startsWith("provider.")
    );

    record("provider-live-calls-zero", providerEvents.length === 0, providerEvents);
    record(
      "child-process-clean-exit",
      child.exitCode === 0,
      { exitCode: child.exitCode, signalCode: child.signalCode }
    );

    const report = {
      reportVersion: "39C22B-staging-runtime-smoke-v1",
      generatedAt: new Date().toISOString(),
      validationResult: "PASS",
      mode: "local",
      releaseSha,
      runtime: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        deploymentEnvironment: "staging",
        runtimeStateMode: "in-memory-single-instance",
      },
      checks,
      logs: {
        structuredRecordCount: records.filter((entry) => entry.event).length,
        unparsableLineCount: records.filter((entry) => entry.unparsable).length,
        stderrPresent: Boolean(stderr.trim()),
        providerEventCount: providerEvents.length,
      },
      liveProviderCalls: 0,
      durationMs: Date.now() - startedAt,
    };

    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
    }

    return report;
  } finally {
    if (child.exitCode === null) {
      child.kill();
    }
    fs.rmSync(wrapperPath, { force: true });
  }
}

async function runRemoteSmoke({
  backendUrl,
  frontendUrl,
  frontendOrigin,
  deniedOrigin = DEFAULT_DENIED_ORIGIN,
  expectedReleaseSha,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  outputPath = null,
} = {}) {
  const startedAt = Date.now();
  const checks = [];
  const record = createRecorder(checks);

  const normalizedBackendUrl = normalizeHttpsUrl(backendUrl, "backendUrl");
  const normalizedFrontendUrl = normalizeHttpsUrl(frontendUrl, "frontendUrl");
  const normalizedFrontendOrigin = normalizeHttpsUrl(
    frontendOrigin,
    "frontendOrigin",
    { originOnly: true }
  );
  const normalizedDeniedOrigin = normalizeHttpsUrl(
    deniedOrigin,
    "deniedOrigin",
    { originOnly: true }
  );
  const releaseSha = normalizeReleaseSha(expectedReleaseSha);

  const frontend = await request(normalizedFrontendUrl, {}, timeoutMs);
  record(
    "frontend-https-load",
    frontend.status >= 200 &&
      frontend.status < 400 &&
      String(frontend.headers["content-type"] ?? "").includes("text/html"),
    frontend
  );

  const backendResult = await exerciseBackend({
    backendUrl: normalizedBackendUrl,
    allowedOrigin: normalizedFrontendOrigin,
    deniedOrigin: normalizedDeniedOrigin,
    expectedReleaseSha: releaseSha,
    timeoutMs,
  });

  checks.push(...backendResult.checks);

  const report = {
    reportVersion: "39C22B-staging-runtime-smoke-v1",
    generatedAt: new Date().toISOString(),
    validationResult: "PASS",
    mode: "remote",
    releaseSha,
    frontendUrl: normalizedFrontendUrl,
    backendUrl: normalizedBackendUrl,
    checks,
    providerTriggeringRequests: 0,
    logInspection: "not-available-over-public-http",
    durationMs: Date.now() - startedAt,
  };

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
  }

  return report;
}

async function main() {
  const config = parseCliArguments();
  let report;

  if (config.mode === "local") {
    let expectedReleaseSha = config.expectedReleaseSha;
    if (!expectedReleaseSha) {
      const headPath = path.join(config.repositoryRoot, ".git", "HEAD");
      assert(fs.existsSync(headPath), "Could not resolve the local release SHA.");
      const { spawnSync } = await import("node:child_process");
      const result = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: config.repositoryRoot,
        encoding: "utf8",
        windowsHide: true,
      });
      assert(result.status === 0, "Could not resolve the local release SHA.", result.stderr);
      expectedReleaseSha = result.stdout.trim();
    }

    report = await runLocalSmoke({
      repositoryRoot: config.repositoryRoot,
      expectedReleaseSha,
      timeoutMs: config.timeoutMs,
      outputPath: config.outputPath,
    });
  } else {
    report = await runRemoteSmoke(config);
  }

  process.stdout.write(
    `${JSON.stringify({
      validationResult: report.validationResult,
      mode: report.mode,
      releaseSha: report.releaseSha,
      outputPath: config.outputPath,
      checks: report.checks.length,
    })}\n`
  );
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_ALLOWED_ORIGIN,
  DEFAULT_DENIED_ORIGIN,
  normalizeHttpsUrl,
  normalizeReleaseSha,
  parseCliArguments,
  runLocalSmoke,
  runRemoteSmoke,
};
