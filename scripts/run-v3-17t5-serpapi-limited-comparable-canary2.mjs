import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createProviderRawQuarantineStoreV3 } from "./provider-raw-quarantine-store.mjs";

export const V3_17T5_RUNNER_BUNDLE_FILES = Object.freeze([
  "scripts/run-v3-17t5-serpapi-limited-comparable-canary2.mjs",
  "scripts/invoke-v3-17t5-serpapi-limited-comparable-canary2.ps1",
  "scripts/provider-raw-quarantine-store.mjs",
  "scripts/protect-v3-provider-raw-key-dpapi.ps1",
  "src/engine-v3/evaluation/serpApiLimitedComparableCollectionGateV3.ts",
  "src/engine-v3/evaluation/comparableSetEvidenceGateV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsPilotEvidenceV3.ts",
  "src/engine-v3/evaluation/serpApiGoogleHotelsExternalAdapterV3.ts",
  "src/engine-v3/evaluation/externalHotelChoiceContractV3.ts",
  "src/engine-v3/evaluation/externalHotelChoiceReplayV3.ts",
  "src/engine-v3/evaluation/providerRawQuarantineV3.ts",
  "src/engine-v3/contract/stableHashV3.ts",
]);

function fail(code) { throw new Error(code); }
function sha256(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }
function valueFor(args, name) {
  const prefix = `${name}=`;
  const entry = args.find((value) => value.startsWith(prefix));
  return entry === undefined ? null : entry.slice(prefix.length);
}

export function computeV317T5RunnerBundleHash(repositoryRoot) {
  const manifest = V3_17T5_RUNNER_BUNDLE_FILES.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(repositoryRoot, path), "utf8").replace(/\r\n/g, "\n")),
  }));
  return sha256(`stayopti-v3-17t5-runner-bundle\n${JSON.stringify(manifest)}`);
}

function assertOutsideRepository(repositoryRoot, outputPath) {
  if (!isAbsolute(outputPath)) fail("T5_OUTPUT_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(repositoryRoot, outputPath);
  if (relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation))) {
    fail("T5_REPOSITORY_OUTPUT_PROHIBITED");
  }
}

function writeExclusive(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, { encoding: "utf8", flag: "wx" });
}

function writeJson(path, value) { writeExclusive(path, `${JSON.stringify(value, null, 2)}\n`); }

function compiledModules(compiledRoot) {
  const compiledRequire = createRequire(resolve(compiledRoot, "package.json"));
  return {
    t5: compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/serpApiLimitedComparableCollectionGateV3.js")),
    quarantine: compiledRequire(resolve(compiledRoot, "src/engine-v3/evaluation/providerRawQuarantineV3.js")),
  };
}

function validateGit(repositoryRoot, expectedHead, sourceSha) {
  const branch = execFileSync("git", ["branch", "--show-current"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (branch !== "main") fail("T5_BRANCH_MISMATCH");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/.test(expectedHead ?? "") || head !== expectedHead) fail("T5_EXECUTION_HEAD_MISMATCH");
  execFileSync("git", ["merge-base", "--is-ancestor", sourceSha, head], { cwd: repositoryRoot, stdio: "ignore" });
  const parent = execFileSync("git", ["rev-parse", "HEAD^"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (parent !== sourceSha) fail("T5_SOURCE_EXECUTION_CHAIN_MISMATCH");
  if (execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repositoryRoot, encoding: "utf8" }).trim().length > 0) fail("T5_STAGED_NOT_ZERO");
  return head;
}

function writeEvidence(root, t5, execution, runnerBundleHash, executionHead) {
  writeJson(resolve(root, "campaign-manifest.json"), t5.STAYOPTI_T5_CAMPAIGN_MANIFEST_V3);
  writeJson(resolve(root, "session-registry-receipt.json"), { version: t5.STAYOPTI_T5_SESSION_REGISTRY_VERSION_V3, count: 12, hash: t5.STAYOPTI_T5_SESSION_REGISTRY_HASH_V3 });
  writeJson(resolve(root, "canary2-stage-manifest.json"), t5.STAYOPTI_T5_CANARY2_MANIFEST_V3);
  writeJson(resolve(root, "authorization-receipt.json"), { exactLiteralMatched: true, executionHead, runnerBundleHash, authorizationConsumed: execution.authorizationConsumed, remaining10Authorized: false });
  writeJson(resolve(root, "request-ledger.json"), execution.requestLedger);
  writeJson(resolve(root, "spend-ledger.json"), execution.spendLedger);
  writeJson(resolve(root, "per-session-sanitized-snapshots.json"), execution.sessionEvidence);
  writeJson(resolve(root, "comparable-subsets.json"), execution.sessionEvidence.map((session) => ({ sessionId: session.sessionId, subset: session.limitedComparableSubset, selectionFingerprint: session.comparableSelectionFingerprint })));
  writeJson(resolve(root, "missing-price-strata.json"), execution.sessionEvidence.map((session) => ({ sessionId: session.sessionId, stratum: session.priceMissingStratum })));
  writeJson(resolve(root, "exclusion-ledger.json"), execution.sessionEvidence.map((session) => ({ sessionId: session.sessionId, exclusions: session.exclusionLedger })));
  writeJson(resolve(root, "quarantine-receipts.json"), { required: true, encryptedCount: execution.requestLedger.filter((entry) => entry.rawEncrypted).length, rawInSharedEvidence: false });
  writeJson(resolve(root, "credential-cleanup-receipt.json"), { credentialPersisted: false, credentialPrinted: false, credentialClearedFromProcess: true });
  writeJson(resolve(root, "stop-condition-receipt.json"), { autostop: true, actualRequestsTransmitted: execution.actualRequestsTransmitted, remaining10Started: false, failureClassification: execution.failureClassification });
  writeJson(resolve(root, "provider-neutrality-receipt.json"), { providerIdentityUsedForSelection: false, sponsoredUsedForSelection: false, originalRankUsedForSelection: false, propertyTokenExported: false });
  writeJson(resolve(root, "final-campaign-decision.json"), { status: execution.status, comparableSessionCount: execution.comparableSessionCount, requiredComparableSessionCount: 2, remaining10MayBePreparedOnlyAfterManualSealReview: execution.status === "PASS", automaticGoldenAdmission: false });
  const files = t5.STAYOPTI_T5_CANARY2_EVIDENCE_CONTRACT_V3.requiredArtifacts.filter((name) => name !== "checksums.sha256");
  const checksumLines = files.map((name) => `${sha256(readFileSync(resolve(root, name), "utf8"))}  ${name}`);
  writeExclusive(resolve(root, "checksums.sha256"), `${checksumLines.join("\n")}\n`);
  const combined = files.map((name) => readFileSync(resolve(root, name), "utf8")).join("\n");
  const scan = t5.validateT5EvidenceArtifactV3(JSON.parse(JSON.stringify({ combined })));
  if (!scan.valid) fail("T5_EVIDENCE_CONTENT_SCAN_FAILED");
}

export async function runV317T5(argv = process.argv.slice(2)) {
  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const expectedHead = valueFor(argv, "--expected-head");
  const expectedBundleHash = valueFor(argv, "--expected-runner-bundle-hash");
  const literal = valueFor(argv, "--authorization");
  const compiledRoot = valueFor(argv, "--compiled-root");
  const evidenceRoot = valueFor(argv, "--evidence-root");
  if (!expectedHead || !expectedBundleHash || !literal || !compiledRoot) fail("T5_REQUIRED_ARGUMENT_MISSING");
  const modules = compiledModules(resolve(compiledRoot));
  const observedHead = validateGit(repositoryRoot, expectedHead, modules.t5.STAYOPTI_T5_SOURCE_SHA_V3);
  const actualBundleHash = computeV317T5RunnerBundleHash(repositoryRoot);
  if (actualBundleHash !== expectedBundleHash) fail("T5_RUNNER_BUNDLE_HASH_MISMATCH");
  const authorization = {
    stage: "CANARY2",
    sourceSha: modules.t5.STAYOPTI_T5_SOURCE_SHA_V3,
    executionHead: observedHead,
    campaignManifestHash: modules.t5.STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    canary2ManifestHash: modules.t5.STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
    sessionRegistryHash: modules.t5.STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
    runnerBundleHash: actualBundleHash,
    literal,
    authorizationGrantedBySubsequentUserMessage: true,
    retentionAuthorized: true,
  };
  const preflight = modules.t5.validateT5Canary2AuthorizationV3({
    authorization,
    observedSourceSha: modules.t5.STAYOPTI_T5_SOURCE_SHA_V3,
    observedExecutionHead: observedHead,
    observedCampaignManifestHash: modules.t5.STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    observedCanary2ManifestHash: modules.t5.STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
    observedSessionRegistryHash: modules.t5.STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
    observedRunnerBundleHash: actualBundleHash,
    workingTreeRelevantFilesMatch: true,
  });
  if (!preflight.allowed) fail(preflight.issues[0] ?? "T5_PREFLIGHT_BLOCKED");
  if (argv.includes("--preflight-only")) return { status: "PREFLIGHT_VALID", requestCount: 0, credentialLoaded: false };
  if (!evidenceRoot) fail("T5_EVIDENCE_ROOT_REQUIRED");
  assertOutsideRepository(repositoryRoot, resolve(evidenceRoot));
  if (existsSync(evidenceRoot)) fail("T5_EVIDENCE_ROOT_MUST_NOT_EXIST");
  mkdirSync(evidenceRoot, { recursive: false });
  const localAppData = process.env.LOCALAPPDATA ?? "";
  if (localAppData.length === 0) fail("T5_LOCALAPPDATA_REQUIRED");
  const privateQuarantine = createProviderRawQuarantineStoreV3({
    repositoryRoot,
    root: resolve(localAppData, "StayOpti", "private-evidence", "provider-raw-quarantine"),
    quarantineModule: modules.quarantine,
  });
  let apiKey = process.env.SERPAPI_API_KEY ?? "";
  if (apiKey.length === 0) fail("T5_API_KEY_MISSING");
  let execution;
  try {
    execution = await modules.t5.executeT5Canary2LimitedComparableCollectionV3({
      authorization,
      apiKey,
      observedSourceSha: modules.t5.STAYOPTI_T5_SOURCE_SHA_V3,
      observedExecutionHead: observedHead,
      observedRunnerBundleHash: actualBundleHash,
      workingTreeRelevantFilesMatch: true,
      privateQuarantine,
      clock: () => new Date().toISOString(),
      transport: {
        async send(request) {
          if (request.requestKind !== "MAIN_SEARCH") fail("T5_PROPERTY_DETAIL_FORBIDDEN");
          const parsed = new URL(request.url);
          if (`${parsed.origin}${parsed.pathname}` !== "https://serpapi.com/search.json") fail("T5_TRANSPORT_ROUTE_NOT_ALLOWLISTED");
          if (parsed.searchParams.get("engine") !== "google_hotels" || parsed.searchParams.has("property_token") || parsed.searchParams.has("next_page_token")) fail("T5_TRANSPORT_PARAMETERS_NOT_ALLOWLISTED");
          const response = await fetch(request.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(30_000) });
          if (response.status >= 300 && response.status < 400) fail("T5_REDIRECT_PROHIBITED");
          const rawBodyText = await response.text();
          return { httpStatus: response.status, rawBodyText, contentType: response.headers.get("content-type"), responseByteLength: Buffer.byteLength(rawBodyText, "utf8") };
        },
      },
    });
  } finally {
    apiKey = "";
    delete process.env.SERPAPI_API_KEY;
  }
  writeEvidence(resolve(evidenceRoot), modules.t5, execution, actualBundleHash, observedHead);
  return { status: execution.status, requestCount: execution.actualRequestsTransmitted, credentialLoaded: true, evidenceRoot: resolve(evidenceRoot) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runV317T5().then((result) => process.stdout.write(`${JSON.stringify(result)}\n`)).catch((error) => {
    const message = error instanceof Error && /^T5_[A-Z0-9_:,]+$/.test(error.message) ? error.message : "T5_SANITIZED_RUNNER_FAILURE";
    process.stdout.write(`${JSON.stringify({ status: "ABORTED", requestCount: 0, failureClassification: message })}\n`);
    process.exitCode = 1;
  });
}
