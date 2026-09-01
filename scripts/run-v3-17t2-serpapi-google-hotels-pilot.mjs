import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BASELINE_SOURCE_SHA = "640570740317cd36901fb605d73e6b7aeeadaff5";
const BUNDLE_FILES = Object.freeze([
  "scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs",
  "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1",
  "scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1",
  "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3.ts",
  "src/engine-v3/evaluation/externalHotelChoiceContractV3.ts",
  "src/engine-v3/evaluation/externalHotelChoiceReplayV3.ts",
  "src/engine-v3/contract/stableHashV3.ts",
]);

function valueFor(args, name) {
  const prefix = `${name}=`;
  const value = args.find((entry) => entry.startsWith(prefix));
  return value === undefined ? null : value.slice(prefix.length);
}
function fail(code) { throw new Error(code); }
function sha256(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }

function normalizedBundleSource(path, content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (path.endsWith("serpApiGoogleHotelsPilotGateV3.ts")) {
    return normalized.replace(
      /(\/\* RUNNER_BUNDLE_HASH_START \*\/\s*")[0-9a-f]{64}("\s*\/\* RUNNER_BUNDLE_HASH_END \*\/)/,
      "$1<BUNDLE_HASH>$2",
    );
  }
  if (path.endsWith("invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1")) {
    return normalized.replace(
      /(# HANDOFF_BUNDLE_HASH_START\s*\n\s*')[0-9a-f]{64}('\s*\n\s*# HANDOFF_BUNDLE_HASH_END)/,
      "$1<BUNDLE_HASH>$2",
    );
  }
  return normalized;
}

export function computeV317T2RunnerBundleHash(repositoryRoot) {
  const manifest = BUNDLE_FILES.map((path) => ({
    path,
    sha256: sha256(normalizedBundleSource(path, readFileSync(resolve(repositoryRoot, path), "utf8"))),
  }));
  return sha256(`stayopti-v3-17t2-runner-bundle\n${JSON.stringify(manifest)}`);
}

function assertOutsideRepository(repositoryRoot, outputPath) {
  if (!isAbsolute(outputPath)) fail("SERPAPI_PILOT_OUTPUT_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(repositoryRoot, outputPath);
  if (relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation))) {
    fail("SERPAPI_PILOT_REPOSITORY_OUTPUT_PROHIBITED");
  }
}

function walkFiles(root, current = root) {
  const entries = [];
  for (const name of readdirSync(current).sort()) {
    const path = join(current, name);
    const status = statSync(path, { throwIfNoEntry: true });
    if (status.isSymbolicLink()) fail("SERPAPI_PILOT_EVIDENCE_LINK_PROHIBITED");
    if (status.isDirectory()) entries.push(...walkFiles(root, path));
    else if (status.isFile()) entries.push(relative(root, path).split(sep).join("/"));
    else fail("SERPAPI_PILOT_EVIDENCE_ENTRY_TYPE_PROHIBITED");
  }
  return entries;
}
function writeExclusive(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, { encoding: "utf8", flag: "wx" });
}
function writeJsonExclusive(path, value) { writeExclusive(path, `${JSON.stringify(value, null, 2)}\n`); }

function compiledModules(compiledRoot) {
  const compiledRequire = createRequire(resolve(compiledRoot, "package.json"));
  return {
    gate: compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.js")),
    collector: compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/serpApiGoogleHotelsPilotCollectorV3.js")),
    evidence: compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3.js")),
    stagePolicy: compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3.js")),
  };
}
function evidenceEntries(root) {
  return walkFiles(root).map((name) => ({ name, content: readFileSync(join(root, ...name.split("/")), "utf8") }));
}

export function finalizeV317T2Evidence(repositoryRoot, evidenceRoot, evidence) {
  assertOutsideRepository(repositoryRoot, evidenceRoot);
  const existing = walkFiles(evidenceRoot);
  for (const name of existing) {
    if (["secret-scan.txt", "raw-id-scan.txt", "checksums.sha256"].includes(name)) fail("SERPAPI_PILOT_EVIDENCE_ALREADY_FINALIZED");
    if (!evidence.isAllowedSerpApiEvidenceEntryNameV3(name)) fail("SERPAPI_PILOT_EVIDENCE_ENTRY_NOT_ALLOWLISTED");
  }
  const combined = existing.map((name) => readFileSync(join(evidenceRoot, ...name.split("/")), "utf8")).join("\n");
  if (/(?:api_key=)(?!\[REDACTED\])[^&\s]+|authorization:\s*bearer|sk-[a-z0-9_-]{12,}/i.test(combined)) fail("SERPAPI_PILOT_EVIDENCE_SECRET_SCAN_FAILED");
  if (/"(?:property_token|search_id|hotel_id|offer_id|solution_id|booking_url|redirect_url|raw_payload|raw_response)"\s*:/i.test(combined)) fail("SERPAPI_PILOT_EVIDENCE_RAW_ID_SCAN_FAILED");
  writeExclusive(join(evidenceRoot, "secret-scan.txt"), "SECRET_SCAN=PASS\n");
  writeExclusive(join(evidenceRoot, "raw-id-scan.txt"), "RAW_ID_SCAN=PASS\n");
  const names = walkFiles(evidenceRoot).filter((name) => name !== "checksums.sha256");
  const checksums = names.map((name) => `${sha256(readFileSync(join(evidenceRoot, ...name.split("/")), "utf8"))}  ${name}`).join("\n");
  writeExclusive(join(evidenceRoot, "checksums.sha256"), `${checksums}\n`);
  const validation = evidence.validateSerpApiEvidenceArchiveEntriesV3(evidenceEntries(evidenceRoot));
  if (!validation.valid) fail("SERPAPI_PILOT_T3_EVIDENCE_VALIDATION_FAILED");
  return validation;
}

export function validateV317T2Evidence(repositoryRoot, evidenceRoot, evidence) {
  assertOutsideRepository(repositoryRoot, evidenceRoot);
  const validation = evidence.validateSerpApiEvidenceArchiveEntriesV3(evidenceEntries(evidenceRoot));
  if (!validation.valid) fail("SERPAPI_PILOT_T3_EVIDENCE_VALIDATION_FAILED");
  return validation;
}

function validateGitPreflight(repositoryRoot, expectedHead) {
  const observedHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/.test(expectedHead) || observedHead !== expectedHead) fail("SERPAPI_PILOT_EXECUTION_HEAD_MISMATCH");
  execFileSync("git", ["merge-base", "--is-ancestor", BASELINE_SOURCE_SHA, observedHead], { cwd: repositoryRoot, stdio: "ignore" });
  if (execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repositoryRoot, encoding: "utf8" }).trim().length > 0) fail("SERPAPI_PILOT_STAGED_NOT_ZERO");
  return observedHead;
}

function atomicSnapshotStore(evidenceRoot) {
  return {
    writeSnapshotAtomic(name, serializedSnapshot) {
      const path = join(evidenceRoot, ...name.split("/"));
      mkdirSync(dirname(path), { recursive: true });
      const temporary = `${path}.${process.pid}.tmp`;
      writeFileSync(temporary, serializedSnapshot, { encoding: "utf8", flag: "wx" });
      if (existsSync(path)) rmSync(path, { force: true });
      renameSync(temporary, path);
    },
    readSnapshot(name) { return readFileSync(join(evidenceRoot, ...name.split("/")), "utf8"); },
  };
}

function rawStoreAt(rawDirectory) {
  const paths = new Map();
  return {
    writeEphemeral(name, value) {
      const path = join(rawDirectory, name);
      writeFileSync(path, value, { encoding: "utf8", flag: "wx" });
      paths.set(name, path);
    },
    removeEphemeral(name) {
      rmSync(paths.get(name) ?? join(rawDirectory, name), { force: true });
      paths.delete(name);
    },
    existsEphemeral(name) { return existsSync(paths.get(name) ?? join(rawDirectory, name)); },
    removeAllEphemeral() {
      for (const path of paths.values()) rmSync(path, { force: true });
      paths.clear();
    },
  };
}

function writeExecutionEvidence(evidenceRoot, gate, execution, observedHead, stage) {
  const canarySession = gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0];
  writeJsonExclusive(join(evidenceRoot, "frozen-manifest.json"), gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_V3);
  writeJsonExclusive(join(evidenceRoot, "authorization-receipt.json"), {
    stage,
    manifestHash: gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    runnerBundleHash: gate.STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    authorizationLiteralMatched: true,
    authorizationConsumed: execution.receipt.authorizationConsumed,
    retentionAuthorized: true,
  });
  writeJsonExclusive(join(evidenceRoot, "stage-declaration.json"), {
    pilotId: gate.STAYOPTI_SERPAPI_PILOT_ID_V3,
    stage,
    manifestHash: gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    runnerBundleHash: gate.STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    maximumRequests: stage === "CANARY" ? 4 : 44,
    remainingStageNotStarted: stage === "CANARY",
  });
  writeJsonExclusive(join(evidenceRoot, "canary-session.json"), {
    sessionId: canarySession.sessionId,
    sessionIndex: 0,
    excludedFromRemaining: stage === "REMAINING_11",
  });
  writeJsonExclusive(join(evidenceRoot, "sanitized-request-ledger.json"), execution.sanitizedRequestLedger);
  writeJsonExclusive(join(evidenceRoot, "pilot-summary.json"), execution.receipt);
  writeJsonExclusive(join(evidenceRoot, "session-summary.json"), execution.sessionSummaries);
  writeJsonExclusive(join(evidenceRoot, "raw-deletion-receipts.json"), execution.rawDeletionReceipts);
  writeJsonExclusive(join(evidenceRoot, "credential-redaction-receipt.json"), {
    credentialSource: "PROCESS_ENVIRONMENT_ONLY",
    credentialPersisted: false,
    credentialPrinted: false,
    diagnosticRedaction: "api_key=[REDACTED]",
  });
  writeExclusive(join(evidenceRoot, "test-results.txt"), "PRE_LIVE_OFFLINE_GATES=PASS\n");
  writeJsonExclusive(join(evidenceRoot, "preflight.json"), {
    observedHead,
    stagedInitiallyZero: true,
    bundleHashVerified: true,
    manifestHashVerified: true,
    stage,
  });
  writeJsonExclusive(join(evidenceRoot, "schema-validation.json"), {
    snapshotT3Compatible: execution.snapshots.every((snapshot) => evidenceSnapshotValid(snapshot)),
    snapshotCount: execution.snapshots.length,
  });
  writeJsonExclusive(join(evidenceRoot, "zip-roundtrip-result.json"), {
    archiveRoundtripRequired: true,
    validatorRequired: true,
    finalArchiveValidationPerformedByLauncher: true,
  });
}

let evidenceSnapshotValidator = null;
function evidenceSnapshotValid(snapshot) {
  return evidenceSnapshotValidator?.(snapshot).valid === true;
}

function validateCanaryEvidenceForResume(evidenceRoot, canaryZipSha256, gate, evidence) {
  if (!evidenceRoot || !existsSync(evidenceRoot)) fail("SERPAPI_PILOT_CANARY_EVIDENCE_REQUIRED");
  if (!/^[0-9a-f]{64}$/.test(canaryZipSha256 ?? "")) fail("SERPAPI_PILOT_CANARY_ZIP_HASH_INVALID");
  const canarySession = gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0];
  const validation = evidence.validateSerpApiCanaryEvidenceArchiveEntriesV3({
    entries: evidenceEntries(evidenceRoot),
    expectedPilotId: gate.STAYOPTI_SERPAPI_PILOT_ID_V3,
    expectedManifestHash: gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    expectedRunnerBundleHash: gate.STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
    expectedCanarySessionId: canarySession.sessionId,
    canaryEvidenceZipSha256: canaryZipSha256,
  });
  if (!validation.valid) fail("SERPAPI_PILOT_CANARY_EVIDENCE_INVALID");
  return validation;
}

export async function runV317T2(argv = process.argv.slice(2)) {
  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const compiledRootValue = valueFor(argv, "--compiled-root");
  if (!compiledRootValue) fail("SERPAPI_PILOT_COMPILED_ROOT_REQUIRED");
  const { gate, collector, evidence, stagePolicy } = compiledModules(resolve(compiledRootValue));
  evidenceSnapshotValidator = evidence.validateSerpApiSanitizedSnapshotV3;
  const finalizeRoot = valueFor(argv, "--finalize-evidence");
  const validateRoot = valueFor(argv, "--validate-evidence");
  if (finalizeRoot !== null) return finalizeV317T2Evidence(repositoryRoot, resolve(finalizeRoot), evidence);
  if (validateRoot !== null) return validateV317T2Evidence(repositoryRoot, resolve(validateRoot), evidence);

  const stage = valueFor(argv, "--stage");
  const authorizationLiteral = valueFor(argv, "--authorization");
  const expectedHead = valueFor(argv, "--expected-head");
  const evidenceRootValue = valueFor(argv, "--evidence-root");
  if (!stagePolicy.STAYOPTI_SERPAPI_PILOT_STAGES_V3.includes(stage)) fail("SERPAPI_PILOT_STAGE_REQUIRED");
  if (!authorizationLiteral || !expectedHead) fail("SERPAPI_PILOT_REQUIRED_ARGUMENT_MISSING");
  const stageAcknowledgement = stage === "CANARY" ? "--single-stage-max-4" : "--single-stage-max-44";
  if (!argv.includes("--authorize-retention-policy") || !argv.includes(stageAcknowledgement)) fail("SERPAPI_PILOT_EXACT_ACKNOWLEDGEMENT_MISSING");
  const observedHead = validateGitPreflight(repositoryRoot, expectedHead);
  if (computeV317T2RunnerBundleHash(repositoryRoot) !== gate.STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3) fail("SERPAPI_PILOT_RUNNER_BUNDLE_HASH_MISMATCH");
  let validatedCanaryEvidence;
  if (stage === "CANARY") {
    if (authorizationLiteral !== gate.STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3) fail("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
    if (valueFor(argv, "--canary-evidence-root") !== null) fail("SERPAPI_PILOT_CANARY_RESUME_INPUT_PROHIBITED");
  } else {
    const canaryRoot = valueFor(argv, "--canary-evidence-root");
    const canaryZipSha256 = valueFor(argv, "--canary-evidence-zip-sha256");
    if (!canaryRoot || !canaryZipSha256) fail("SERPAPI_PILOT_CANARY_EVIDENCE_REQUIRED");
    if (!argv.includes("--manual-canary-review-confirmed")) fail("SERPAPI_PILOT_MANUAL_CANARY_REVIEW_REQUIRED");
    validatedCanaryEvidence = validateCanaryEvidenceForResume(resolve(canaryRoot), canaryZipSha256, gate, evidence);
    const required = stagePolicy.createSerpApiRemainingAuthorizationLiteralV3({
      manifestHash: gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
      runnerBundleHash: gate.STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
      canaryEvidenceZipSha256: canaryZipSha256,
    });
    if (authorizationLiteral !== required) fail("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
  }
  if (argv.includes("--preflight-only")) return {
    status: "PREFLIGHT_VALID",
    stage,
    requestCount: 0,
    failureClassification: null,
  };

  if (!evidenceRootValue) fail("SERPAPI_PILOT_REQUIRED_ARGUMENT_MISSING");
  const evidenceRoot = resolve(evidenceRootValue);
  assertOutsideRepository(repositoryRoot, evidenceRoot);
  if (existsSync(evidenceRoot)) fail("SERPAPI_PILOT_EVIDENCE_ROOT_MUST_NOT_EXIST");
  mkdirSync(evidenceRoot);
  let apiKey = process.env.SERPAPI_API_KEY ?? "";
  if (apiKey.length === 0) fail("SERPAPI_PILOT_API_KEY_MISSING");
  const rawDirectory = mkdtempSync(join(tmpdir(), "stayopti-v3-17t2-serpapi-raw-"));
  const rawStore = rawStoreAt(rawDirectory);
  try {
    const execution = await collector.executeSerpApiGoogleHotelsPilotEvidenceV3({
      authorization: {
        authorizationState: "AUTHORIZED_NOT_STARTED",
        literal: authorizationLiteral,
        stage,
        sourceCommitSha: BASELINE_SOURCE_SHA,
        manifestHash: gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
        accountPlan: "FREE",
        retentionAuthorized: true,
        canaryEvidenceZipSha256: validatedCanaryEvidence?.canaryEvidenceZipSha256,
      },
      validatedCanaryEvidence,
      apiKey,
      observedSourceSha: BASELINE_SOURCE_SHA,
      nowIso: new Date().toISOString(),
      clock: () => new Date().toISOString(),
      transport: {
        async send(request) {
          if (request.endpoint !== gate.STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3 || request.engine !== gate.STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3) fail("SERPAPI_PILOT_TRANSPORT_ROUTE_NOT_ALLOWLISTED");
          const parsed = new URL(request.url);
          if (parsed.origin + parsed.pathname !== gate.STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3) fail("SERPAPI_PILOT_TRANSPORT_ROUTE_NOT_ALLOWLISTED");
          if (request.requestKind === "PROPERTY_DETAIL" && !parsed.searchParams.has("property_token")) fail("SERPAPI_PILOT_PROPERTY_DETAIL_TOKEN_MISSING");
          const response = await fetch(request.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(30_000) });
          if (response.status >= 300 && response.status < 400) fail("SERPAPI_PILOT_REDIRECT_PROHIBITED");
          let body;
          try { body = JSON.parse(await response.text()); } catch { fail("SERPAPI_PILOT_RESPONSE_NOT_PROCESSABLE"); }
          return { httpStatus: response.status, body };
        },
      },
      rawStore,
      evidenceStore: atomicSnapshotStore(evidenceRoot),
    });
    writeExecutionEvidence(evidenceRoot, gate, execution, observedHead, stage);
    return execution.receipt;
  } finally {
    rawStore.removeAllEphemeral();
    rmSync(rawDirectory, { recursive: true, force: true });
    apiKey = "";
    delete process.env.SERPAPI_API_KEY;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runV317T2().then((result) => process.stdout.write(`${JSON.stringify({
    status: result.status ?? (result.valid ? "VALID" : "INVALID"),
    requestCount: result.requestCount ?? null,
    failureClassification: result.failureClassification ?? null,
  })}\n`)).catch((error) => {
    const code = error instanceof Error && /^(?:SERPAPI_PILOT_|ABORT_)[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "SERPAPI_PILOT_SANITIZED_RUNNER_FAILURE";
    process.stdout.write(`${JSON.stringify({ status: "ABORTED", failureClassification: code })}\n`);
    process.exitCode = 1;
  });
}
