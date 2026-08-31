import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const SOURCE_SHA = "2b448470c2782834da62d89850d2f4f127998b0d";
const BASE_URL = "https://api.liteapi.travel/v3.0";
const RATES_PATH = "/hotels/rates";
const REQUIRED_FLAGS = Object.freeze([
  "--execute-v3-17r2-single-wave",
  "--ack-user-confirmed-sandbox",
  "--ack-user-confirmed-zero-cost",
  "--ack-rates-only-max-5",
  "--ack-no-retry-redirect-or-mutation",
]);

function argumentValue(args, name) {
  const prefix = `${name}=`;
  const entry = args.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function readExactEnvironmentValues(path, names) {
  const values = new Map();
  const allowed = new Set(names);
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !allowed.has(match[1])) continue;
    if (values.has(match[1])) throw new Error("V3_17R2_ENVIRONMENT_KEY_AMBIGUOUS");
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

function sandboxPrefix(value) {
  return typeof value === "string" && (value.startsWith("sand_") || value.startsWith("sandbox_"));
}

function safeProviderCode(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body.code ?? body.errorCode ?? null;
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function rawResultCount(body) {
  if (Array.isArray(body)) return body.length;
  if (!body || typeof body !== "object") return null;
  for (const key of ["data", "hotels", "results"]) {
    if (Array.isArray(body[key])) return body[key].length;
  }
  if (body.data && typeof body.data === "object") {
    for (const key of ["hotels", "results"]) {
      if (Array.isArray(body.data[key])) return body.data[key].length;
    }
  }
  return null;
}

function sessionIdConsistent(body, expected) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  const candidates = [
    body.sessionId,
    body.data && typeof body.data === "object" ? body.data.sessionId : null,
    body.result && typeof body.result === "object" ? body.result.sessionId : null,
  ].filter((value) => typeof value === "string" && value.length > 0);
  return candidates.length === 0 || candidates.every((value) => value === expected);
}

function requestPayload(family, sessionId, timeoutSeconds) {
  return {
    checkin: family.checkin,
    checkout: family.checkout,
    currency: family.currency,
    guestNationality: family.guestNationality,
    occupancies: family.occupancies.map(({ adults, children }) => ({ adults, children: [...children] })),
    limit: family.limit,
    timeout: timeoutSeconds,
    maxRatesPerHotel: family.maxRatesPerHotel,
    roomMapping: family.roomMapping,
    includeHotelData: family.includeHotelData,
    sessionId,
    cityName: family.destination.cityName,
    countryCode: family.destination.countryCode,
  };
}

function assertOutputOutsideRepository(repositoryRoot, outputPath) {
  if (!isAbsolute(outputPath)) throw new Error("V3_17R2_OUTPUT_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(repositoryRoot, outputPath);
  if (relation === "" || (!relation.startsWith("..") && !isAbsolute(relation))) {
    throw new Error("V3_17R2_REPOSITORY_OUTPUT_PROHIBITED");
  }
  const tempRelation = relative(resolve(tmpdir()), resolve(outputPath));
  if (tempRelation.startsWith("..") || isAbsolute(tempRelation)) throw new Error("V3_17R2_OUTPUT_MUST_BE_UNDER_TEMP");
}

export async function runV317R2Live(argv = process.argv.slice(2)) {
  for (const flag of REQUIRED_FLAGS) {
    if (!argv.includes(flag)) throw new Error("V3_17R2_EXACT_ACKNOWLEDGEMENT_MISSING");
  }
  const compiledRootValue = argumentValue(argv, "--compiled-root");
  const outputValue = argumentValue(argv, "--output");
  if (!compiledRootValue || !outputValue) throw new Error("V3_17R2_REQUIRED_PATH_ARGUMENT_MISSING");

  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const observedHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (observedHead !== SOURCE_SHA) throw new Error("V3_17R2_SOURCE_SHA_MISMATCH");
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (staged.length > 0) throw new Error("V3_17R2_STAGED_NOT_ZERO");

  const outputPath = resolve(outputValue);
  assertOutputOutsideRepository(repositoryRoot, outputPath);
  const environment = readExactEnvironmentValues(resolve(repositoryRoot, "server/.env"), [
    "LITEAPI_BASE_URL",
    "LITEAPI_API_KEY",
    "LITEAPI_TIMEOUT_SECONDS",
  ]);
  const baseUrl = environment.get("LITEAPI_BASE_URL") ?? BASE_URL;
  let apiKey = environment.get("LITEAPI_API_KEY") ?? "";
  const timeoutCandidate = Number(environment.get("LITEAPI_TIMEOUT_SECONDS") ?? "12");
  const timeoutSeconds = Number.isFinite(timeoutCandidate) && timeoutCandidate >= 6 ? Math.min(timeoutCandidate, 30) : 12;
  if (baseUrl !== BASE_URL) throw new Error("V3_17R2_SANDBOX_BASE_URL_MISMATCH");
  if (!sandboxPrefix(apiKey)) throw new Error("V3_17R2_SANDBOX_KEY_PREFIX_NOT_VERIFIED");

  const compiledRoot = resolve(compiledRootValue);
  const compiledRequire = createRequire(resolve(compiledRoot, "package.json"));
  const execution = compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/liteApiSandboxGoldenPilotExecutionV3.js"));
  const providerRequire = createRequire(resolve(repositoryRoot, "server/package.json"));
  const { mapLiteApiHotelResponse } = providerRequire(resolve(repositoryRoot, "server/providers/liteApi/liteApiProvider.js"));

  const receipt = await execution.executeV317R2SingleWaveV3({
    async transport(request) {
      if (request.method !== "POST" || request.baseUrl !== BASE_URL || request.endpointPath !== RATES_PATH) {
        throw new Error("V3_17R2_TRANSPORT_ROUTE_NOT_ALLOWLISTED");
      }
      const response = await fetch(`${BASE_URL}${RATES_PATH}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(requestPayload(request.family, request.sessionId, timeoutSeconds)),
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutSeconds * 1_000 + 3_000),
      });
      const redirectObserved = response.status >= 300 && response.status < 400;
      let body = null;
      try {
        const responseText = await response.text();
        body = responseText.length === 0 ? null : JSON.parse(responseText);
      } catch {
        body = null;
      }
      return {
        httpStatus: response.status,
        providerCode: safeProviderCode(body),
        retryAfterPresent: response.headers.has("retry-after"),
        redirectObserved,
        sessionIdConsistent: sessionIdConsistent(body, request.sessionId),
        rawResultCount: rawResultCount(body),
        body,
      };
    },
    normalizeRatesResponse(body) {
      return mapLiteApiHotelResponse(body, "EUR", null, null, { maximumRecords: 80 });
    },
    monotonicNowMs: () => performance.now(),
    sleep: (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, Math.ceil(ms))),
    createSessionId: (familyOrdinal) => `stayopti_v317r2_${familyOrdinal}_${randomUUID().replaceAll("-", "")}`,
    collectedAt: () => new Date().toISOString(),
  });

  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  apiKey = "";
  return {
    status: receipt.status,
    outputPath,
    authorizationConsumed: receipt.authorizationConsumed,
    httpRequests: receipt.httpRequests,
    ratesHttpRequests: receipt.ratesHttpRequests,
    searchFamiliesAttempted: receipt.searchFamiliesAttempted,
    sandboxCasesProjected: receipt.sandboxCasesProjected,
    failureClassification: receipt.failureClassification,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runV317R2Live()
    .then((summary) => process.stdout.write(`${JSON.stringify(summary)}\n`))
    .catch((error) => {
      const classification = error instanceof Error && /^V3_17R2_[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "V3_17R2_SANITIZED_EXECUTION_FAILURE";
      process.stdout.write(`${JSON.stringify({ status: "FAIL", failureClassification: classification })}\n`);
      process.exitCode = 1;
    });
}
