import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import test from "node:test";
import {
  createSerpApiT2CRequiredAuthorizationLiteralV3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
  STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";

const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const REPOSITORY = process.cwd();
const HANDOFF = resolve(REPOSITORY, "scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1");
const LAUNCHER = resolve(REPOSITORY, "scripts/invoke-v3-17t2-serpapi-google-hotels-pilot.ps1");
const RUNNER = resolve(REPOSITORY, "scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs");
const handoffSource = readFileSync(HANDOFF, "utf8");
const launcherSource = readFileSync(LAUNCHER, "utf8");
const runnerSource = readFileSync(RUNNER, "utf8");
const CURRENT_EXECUTION_HEAD = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPOSITORY, encoding: "utf8" }).stdout.trim();
const CURRENT_CANARY_LITERAL = createSerpApiT2CRequiredAuthorizationLiteralV3(CURRENT_EXECUTION_HEAD);
const WINDOWS_POWERSHELL_51_REQUIRED = process.platform === "win32"
  ? false
  : "requires real Windows PowerShell 5.1; enforced by the required windows-latest release job";

function psQuote(value: string) { return `'${value.replaceAll("'", "''")}'`; }

function assertPowerShell51Started(result: SpawnSyncReturns<string>, label: string) {
  assert.equal(result.error, undefined, `${label}: powershell.exe failed to start`);
  assert.notEqual(result.status, null, `${label}: powershell.exe returned status=null`);
  assert.equal(typeof result.stdout, "string", `${label}: powershell.exe stdout is unavailable`);
  assert.equal(typeof result.stderr, "string", `${label}: powershell.exe stderr is unavailable`);
}

function withDetachedWorktree<T>(run: (checkout: string, head: string) => T): T {
  const container = mkdtempSync(join(tmpdir(), "StayOpti-D0034-T1C-Detached-"));
  const checkout = join(container, "checkout");
  const add = spawnSync("git", ["worktree", "add", "--detach", checkout, "HEAD"], {
    cwd: REPOSITORY,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(add.status, 0, `${add.stdout}\n${add.stderr}`);
  const nodeModules = join(checkout, "node_modules");
  symlinkSync(resolve(REPOSITORY, "node_modules"), nodeModules, "junction");
  const branch = spawnSync("git", ["branch", "--show-current"], { cwd: checkout, encoding: "utf8", windowsHide: true });
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: checkout, encoding: "utf8", windowsHide: true });
  assert.equal(branch.status, 0);
  assert.equal(branch.stdout, "");
  assert.equal(head.status, 0);
  try {
    return run(checkout, head.stdout.trim());
  } finally {
    rmdirSync(nodeModules);
    const remove = spawnSync("git", ["worktree", "remove", "--force", checkout], { cwd: REPOSITORY, encoding: "utf8", windowsHide: true });
    assert.equal(remove.status, 0, `${remove.stdout}\n${remove.stderr}`);
    rmSync(container, { recursive: true, force: true });
  }
}

function withAttachedMainClone<T>(run: (checkout: string, head: string) => T): T {
  const container = mkdtempSync(join(tmpdir(), "StayOpti-D0034-T1C-Main-"));
  const checkout = join(container, "checkout");
  const sourceHead = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPOSITORY, encoding: "utf8", windowsHide: true });
  assert.equal(sourceHead.status, 0);
  const head = sourceHead.stdout.trim();
  const clone = spawnSync("git", ["clone", "--no-hardlinks", "--no-checkout", "--quiet", REPOSITORY, checkout], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(clone.status, 0, `${clone.stdout}\n${clone.stderr}`);
  const attach = spawnSync("git", ["checkout", "--quiet", "-B", "main", head], { cwd: checkout, encoding: "utf8", windowsHide: true });
  assert.equal(attach.status, 0, `${attach.stdout}\n${attach.stderr}`);
  const nodeModules = join(checkout, "node_modules");
  symlinkSync(resolve(REPOSITORY, "node_modules"), nodeModules, "junction");
  const branch = spawnSync("git", ["branch", "--show-current"], { cwd: checkout, encoding: "utf8", windowsHide: true });
  assert.equal(branch.status, 0);
  assert.equal(branch.stdout.trim(), "main");
  try {
    return run(checkout, head);
  } finally {
    rmdirSync(nodeModules);
    rmSync(container, { recursive: true, force: true });
  }
}

function runHandoff(input: { failure?: string; preflight?: boolean } = {}) {
  const failure = input.failure ?? "NONE";
  const preflight = input.preflight ?? failure !== "EMPTY_KEY";
  const withCheckout = preflight ? withDetachedWorktree : withAttachedMainClone;
  return withCheckout((checkout) => {
    const diagnosticRoot = mkdtempSync(join(tmpdir(), "StayOpti-T1C-Test-"));
    const checkoutHandoff = resolve(checkout, "scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1");
    const command = [
      `& ${psQuote(checkoutHandoff)}`,
      preflight ? "-HandoffPreflightOnly" : "",
      "-OfflineTestMode",
      `-InjectedFailure ${psQuote(failure)}`,
      `-DiagnosticDirectory ${psQuote(diagnosticRoot)}`,
      "-SkipFinalPause",
      failure === "EMPTY_KEY" ? `-AuthorizationLiteral ${psQuote(CURRENT_CANARY_LITERAL)}` : "",
      "; Write-Output 'PARENT_SENTINEL=REACHED'",
    ].filter(Boolean).join(" ");
    const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      cwd: checkout,
      encoding: "utf8",
      env: { ...process.env, SERPAPI_API_KEY: "" },
      timeout: 120_000,
    });
    assertPowerShell51Started(result, `T1C ${failure} isolated handoff`);
    const logs = readdirSync(diagnosticRoot).map((name) => readFileSync(join(diagnosticRoot, name), "utf8"));
    assert.equal(logs.length, 1, `T1C ${failure} handoff must write exactly one diagnostic log`);
    assert.ok(logs[0]!.trim().length > 0, `T1C ${failure} diagnostic log must not be empty`);
    rmSync(diagnosticRoot, { recursive: true, force: true });
    return { ...result, combined: `${result.stdout}\n${result.stderr}`, logs };
  });
}

// T1C 01-15 and 17-19 exercise the real Windows PowerShell 5.1 process.
// T1C 16 and 20-30 are universal static/domain checks and run on every OS.
test("T1C 01 reproduces the original pre-key PowerShell execution-policy boundary deterministically", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-T1C-Policy-"));
  const harmless = join(root, "probe.ps1");
  writeFileSync(harmless, "Write-Output 'SCRIPT_BODY_REACHED'\r\n", "utf8");
  const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Restricted", "-File", harmless], { encoding: "utf8" });
  assertPowerShell51Started(result, "T1C explicit Restricted policy probe");
  rmSync(root, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /SCRIPT_BODY_REACHED/);
  assert.match(`${result.stdout}\n${result.stderr}`, /UnauthorizedAccess|esecuzione di script.*disabilitata/i);
});

test("T1C 02 handoff preflight reaches immediately before the secure key prompt", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const result = runHandoff({ preflight: true });
  assert.equal(result.status, 0);
  assert.match(result.combined, /READY_FOR_SECURE_KEY_PROMPT=YES/);
  assert.match(result.combined, /HANDOFF_RESULT=PASS/);
  assert.match(result.combined, /PARENT_SENTINEL=REACHED/);
});

test("T1C 03 preflight uses zero credentials", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => { const result = runHandoff(); assert.match(result.combined, /CREDENTIALS_LOADED=NO/); assert.match(result.combined, /API_KEY_PROMPT_REACHED=NO/); });
test("T1C 04 preflight uses zero network", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => { const result = runHandoff(); assert.match(result.combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/); });
test("T1C 05 preflight does not consume authorization", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => { const result = runHandoff(); assert.match(result.combined, /AUTHORIZATION_CONSUMED=NO/); });

for (const [index, failure] of ["HEAD", "DIRTY", "BUNDLE", "COMPILE", "MANIFEST", "LITERAL", "RUNNER_PREFLIGHT", "LAUNCHER_PREFLIGHT"].entries()) {
  test(`T1C ${String(index + 6).padStart(2, "0")} ${failure} failure returns to the parent sentinel`, { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
    const result = runHandoff({ failure });
    assert.equal(result.status, 0);
    assert.match(result.combined, /HANDOFF_RESULT=FAIL/);
    assert.match(result.combined, /PARENT_SENTINEL=REACHED/);
    assert.match(result.combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/);
    assert.equal(result.logs.length, 1);
  });
}

test("T1C 14 empty key is fail-closed without transport and returns to parent", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const result = runHandoff({ failure: "EMPTY_KEY", preflight: false });
  assert.equal(result.status, 0);
  assert.match(result.combined, /STAYOPTI_T1C_API_KEY_MISSING/);
  assert.match(result.combined, /PARENT_SENTINEL=REACHED/);
  assert.match(result.combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/);
});

test("T1C 15 every pre-network failure writes one atomic sanitized diagnostic log", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const result = runHandoff({ failure: "LITERAL" });
  assert.equal(result.logs.length, 1);
  assert.match(result.logs[0]!, /FAILURE_CLASSIFICATION=STAYOPTI_T1C_LITERAL_MISMATCH/);
  assert.match(result.logs[0]!, /API_KEY_PROMPT_REACHED=NO/);
});

test("T1C 16 collector and launcher retain abort Evidence behavior", () => {
  assert.match(launcherSource, /CreateFromDirectory/);
  assert.match(launcherSource, /EVIDENCE_ZIP_VALIDATION_FAILED/);
  assert.match(runnerSource, /writeExecutionEvidence/);
});

test("T1C 17 diagnostic allowlist excludes secrets", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => { const result = runHandoff({ failure: "HEAD" }); assert.equal(result.logs.length, 1); assert.ok(result.logs[0]!.trim().length > 0); assert.doesNotMatch(result.logs.join("\n"), /api_key=|bearer|securestring|bstr/i); });
test("T1C 18 diagnostic allowlist excludes property tokens", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => { const result = runHandoff({ failure: "HEAD" }); assert.equal(result.logs.length, 1); assert.ok(result.logs[0]!.trim().length > 0); assert.doesNotMatch(result.logs.join("\n"), /property_token/i); });
test("T1C 19 diagnostic allowlist excludes request URLs and payloads", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => { const result = runHandoff({ failure: "HEAD" }); assert.equal(result.logs.length, 1); assert.ok(result.logs[0]!.trim().length > 0); assert.doesNotMatch(result.logs.join("\n"), /https?:\/\/|rawPayload|rawResponse|<html/i); });
test("T1C 20 handoff contains no PowerShell exit statement", () => { assert.doesNotMatch(handoffSource, /(^|[;{}\s])exit(?:\s|$)/im); assert.doesNotMatch(launcherSource, /(^|[;{}\s])exit(?:\s|$)/im); });
test("T1C 21 final pause is in the unconditional cleanup path", () => { assert.match(handoffSource, /finally\s*\{[\s\S]*Read-Host 'Premi Invio dopo aver copiato il risultato'/); });
test("T1C 22 canary session remains the only Stage A session", () => { assert.match(handoffSource, /SERP_PILOT_01_FLORENCE_COUPLE_BALANCED/); assert.match(handoffSource, /ExpectedCanaryIndex = 0/); });
test("T2B 23 repaired MAX2 remains hard-bound", () => { assert.match(handoffSource, /ExpectedCanaryCap = 2/); assert.match(handoffSource, /--single-stage-max-2/); assert.doesNotMatch(handoffSource, /--single-stage-max-44/); });
test("T1C 24 evaluation boundary remains provider-neutral", () => { const core = readFileSync(resolve(REPOSITORY, "src/engine-v3/index.ts"), "utf8"); assert.doesNotMatch(core, /serpApiGoogleHotelsPilotCollectorV3|canary-handoff/); });
test("T1C 25 old canary literal is revoked and bundle changes", () => { assert.ok(STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3.includes(`AUTHORIZE_V3_17T2_CANARY_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_RUNNER_c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01_RETENTION_V2_MAX4`)); assert.notEqual(STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, "c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01"); });
test("T1C 26 launcher has deterministic preflight-only mode", () => { assert.match(launcherSource, /HandoffPreflightOnly/); assert.match(launcherSource, /READY_FOR_SECURE_KEY_PROMPT=YES/); });
test("T1C 27 launcher uses .NET SHA-256 and handoff uses Git integrity checks instead of cmdlet autoload", () => { assert.doesNotMatch(`${handoffSource}\n${launcherSource}`, /Get-FileHash/); assert.match(launcherSource, /Security\.Cryptography\.SHA256/); assert.match(handoffSource, /git diff --quiet HEAD/); });
test("T1C 28 process-scoped execution-policy repair is explicit", () => { assert.match(handoffSource, /-ExecutionPolicy Bypass -File \$PilotLauncher/); });
test("T1C 29 manifest remains immutable", () => { assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, "e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88"); });
test("T2B 30 new literal binds checkpoint and every MAX2 guard", () => {
  assert.match(CURRENT_CANARY_LITERAL, /^AUTHORIZE_V3_17T2C_MAX2_SOURCE_SHA_[0-9a-f]{40}_EXECUTION_HEAD_[0-9a-f]{40}_MANIFEST_[0-9a-f]{64}_RUNNER_[0-9a-f]{64}_MAIN1_DETAIL1_SESSIONS1_CONCURRENCY1_RETRIES0_PAGINATION0_QUARANTINE_AES256GCM_DPAPI_CURRENTUSER_AUTOSTOP_REMAINING_NO$/);
  assert.doesNotMatch(CURRENT_CANARY_LITERAL, /MAX48|REMAINING_11/);
});
test("D0033 31 handoff requires a clean committed snapshot and has no ignored or developer-dirty dependency", () => {
  assert.match(handoffSource, /git status --porcelain=v1 --untracked-files=all/);
  assert.match(handoffSource, /observedDirty\.Count -ne 0/);
  assert.doesNotMatch(handoffSource, /ExpectedDirty|DevelopmentPaths|server\/\.env|realMeasurementCapturePilot|\.codex-remote-attachments/);
});

test("D0034 32 non-offline handoff fails closed in a true detached worktree before credentials", { skip: WINDOWS_POWERSHELL_51_REQUIRED, timeout: 120_000 }, () => {
  withDetachedWorktree((checkout) => {
    const detachedHandoff = resolve(checkout, "scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1");
    const isolatedProfile = mkdtempSync(join(tmpdir(), "StayOpti-D0034-T1C-Profile-"));
    try {
      const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", detachedHandoff], {
        cwd: checkout,
        encoding: "utf8",
        env: { ...process.env, USERPROFILE: isolatedProfile, SERPAPI_API_KEY: "" },
        input: "\n",
        timeout: 120_000,
      });
      assertPowerShell51Started(result, "T1C detached non-offline rejection");
      assert.equal(result.status, 0);
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.match(combined, /FAILURE_CLASSIFICATION=STAYOPTI_T1C_BRANCH_MISMATCH/);
      assert.match(combined, /API_KEY_PROMPT_REACHED=NO/);
      assert.match(combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/);
      assert.doesNotMatch(combined, /null-valued expression/i);
    } finally {
      rmSync(isolatedProfile, { recursive: true, force: true });
    }
  });
});

test("D0034 33 detached allowance is limited to offline preflight while main remains the real branch", () => {
  assert.match(handoffSource, /detachedOfflinePreflightAllowed = \$isDetachedHead -and \$OfflineTestMode -and \$HandoffPreflightOnly/);
  assert.match(handoffSource, /-not \$isDetachedHead -and \$observedBranch -ne \$ExpectedBranch/);
  assert.doesNotMatch(handoffSource, /GITHUB_(?:HEAD_REF|BASE_REF|REF|SHA)/);
});
