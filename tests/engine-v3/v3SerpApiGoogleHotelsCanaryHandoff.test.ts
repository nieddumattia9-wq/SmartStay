import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3,
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

function psQuote(value: string) { return `'${value.replaceAll("'", "''")}'`; }

function runHandoff(input: { failure?: string; preflight?: boolean } = {}) {
  const diagnosticRoot = mkdtempSync(join(tmpdir(), "StayOpti-T1C-Test-"));
  const failure = input.failure ?? "NONE";
  const preflight = input.preflight ?? failure !== "EMPTY_KEY";
  const command = [
    `& ${psQuote(HANDOFF)}`,
    preflight ? "-HandoffPreflightOnly" : "",
    "-OfflineTestMode",
    `-InjectedFailure ${psQuote(failure)}`,
    `-DiagnosticDirectory ${psQuote(diagnosticRoot)}`,
    "-SkipFinalPause",
    failure === "EMPTY_KEY" ? `-AuthorizationLiteral ${psQuote(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3)}` : "",
    "; Write-Output 'PARENT_SENTINEL=REACHED'",
  ].filter(Boolean).join(" ");
  const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    cwd: REPOSITORY,
    encoding: "utf8",
    env: { ...process.env, SERPAPI_API_KEY: "" },
    timeout: 120_000,
  });
  const logs = readdirSync(diagnosticRoot).map((name) => readFileSync(join(diagnosticRoot, name), "utf8"));
  rmSync(diagnosticRoot, { recursive: true, force: true });
  return { ...result, combined: `${result.stdout}\n${result.stderr}`, logs };
}

test("T1C 01 reproduces the original pre-key PowerShell execution-policy boundary", () => {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-T1C-Policy-"));
  const harmless = join(root, "probe.ps1");
  writeFileSync(harmless, "Write-Output 'SCRIPT_BODY_REACHED'\r\n", "utf8");
  const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-File", harmless], { encoding: "utf8" });
  rmSync(root, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /SCRIPT_BODY_REACHED/);
  assert.match(`${result.stdout}\n${result.stderr}`, /UnauthorizedAccess|esecuzione di script.*disabilitata/i);
});

test("T1C 02 handoff preflight reaches immediately before the secure key prompt", () => {
  const result = runHandoff({ preflight: true });
  assert.equal(result.status, 0);
  assert.match(result.combined, /READY_FOR_SECURE_KEY_PROMPT=YES/);
  assert.match(result.combined, /HANDOFF_RESULT=PASS/);
  assert.match(result.combined, /PARENT_SENTINEL=REACHED/);
});

test("T1C 03 preflight uses zero credentials", () => { const result = runHandoff(); assert.match(result.combined, /CREDENTIALS_LOADED=NO/); assert.match(result.combined, /API_KEY_PROMPT_REACHED=NO/); });
test("T1C 04 preflight uses zero network", () => { const result = runHandoff(); assert.match(result.combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/); });
test("T1C 05 preflight does not consume authorization", () => { const result = runHandoff(); assert.match(result.combined, /AUTHORIZATION_CONSUMED=NO/); });

for (const [index, failure] of ["HEAD", "DIRTY", "BUNDLE", "COMPILE", "MANIFEST", "LITERAL", "RUNNER_PREFLIGHT", "LAUNCHER_PREFLIGHT"].entries()) {
  test(`T1C ${String(index + 6).padStart(2, "0")} ${failure} failure returns to the parent sentinel`, () => {
    const result = runHandoff({ failure });
    assert.equal(result.status, 0);
    assert.match(result.combined, /HANDOFF_RESULT=FAIL/);
    assert.match(result.combined, /PARENT_SENTINEL=REACHED/);
    assert.match(result.combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/);
    assert.equal(result.logs.length, 1);
  });
}

test("T1C 14 empty key is fail-closed without transport and returns to parent", () => {
  const result = runHandoff({ failure: "EMPTY_KEY", preflight: false });
  assert.equal(result.status, 0);
  assert.match(result.combined, /STAYOPTI_T1C_API_KEY_MISSING/);
  assert.match(result.combined, /PARENT_SENTINEL=REACHED/);
  assert.match(result.combined, /SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0/);
});

test("T1C 15 every pre-network failure writes one atomic sanitized diagnostic log", () => {
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

test("T1C 17 diagnostic allowlist excludes secrets", () => { const result = runHandoff({ failure: "HEAD" }); assert.doesNotMatch(result.logs.join("\n"), /api_key=|bearer|securestring|bstr/i); });
test("T1C 18 diagnostic allowlist excludes property tokens", () => { const result = runHandoff({ failure: "HEAD" }); assert.doesNotMatch(result.logs.join("\n"), /property_token/i); });
test("T1C 19 diagnostic allowlist excludes request URLs and payloads", () => { const result = runHandoff({ failure: "HEAD" }); assert.doesNotMatch(result.logs.join("\n"), /https?:\/\/|rawPayload|rawResponse|<html/i); });
test("T1C 20 handoff contains no PowerShell exit statement", () => { assert.doesNotMatch(handoffSource, /(^|[;{}\s])exit(?:\s|$)/im); assert.doesNotMatch(launcherSource, /(^|[;{}\s])exit(?:\s|$)/im); });
test("T1C 21 final pause is in the unconditional cleanup path", () => { assert.match(handoffSource, /finally\s*\{[\s\S]*Read-Host 'Premi Invio dopo aver copiato il risultato'/); });
test("T1C 22 canary session remains the only Stage A session", () => { assert.match(handoffSource, /SERP_PILOT_01_FLORENCE_COUPLE_BALANCED/); assert.match(handoffSource, /ExpectedCanaryIndex = 0/); });
test("T2B 23 repaired MAX2 remains hard-bound", () => { assert.match(handoffSource, /ExpectedCanaryCap = 2/); assert.match(handoffSource, /--single-stage-max-2/); assert.doesNotMatch(handoffSource, /--single-stage-max-44/); });
test("T1C 24 evaluation boundary remains provider-neutral", () => { const core = readFileSync(resolve(REPOSITORY, "src/engine-v3/index.ts"), "utf8"); assert.doesNotMatch(core, /serpApiGoogleHotelsPilotCollectorV3|canary-handoff/); });
test("T1C 25 old canary literal is revoked and bundle changes", () => { assert.ok(STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3.includes(`AUTHORIZE_V3_17T2_CANARY_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_RUNNER_c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01_RETENTION_V2_MAX4`)); assert.notEqual(STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3, "c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01"); });
test("T1C 26 launcher has deterministic preflight-only mode", () => { assert.match(launcherSource, /HandoffPreflightOnly/); assert.match(launcherSource, /READY_FOR_SECURE_KEY_PROMPT=YES/); });
test("T1C 27 launcher and handoff use .NET SHA-256 instead of cmdlet autoload", () => { assert.doesNotMatch(`${handoffSource}\n${launcherSource}`, /Get-FileHash/); assert.match(handoffSource, /Security\.Cryptography\.SHA256/); });
test("T1C 28 process-scoped execution-policy repair is explicit", () => { assert.match(handoffSource, /-ExecutionPolicy Bypass -File \$PilotLauncher/); });
test("T1C 29 manifest remains immutable", () => { assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, "e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88"); });
test("T2B 30 new literal remains canary MAX2 only", () => { assert.match(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3, /^AUTHORIZE_V3_17T2_CANARY_[0-9a-f]{64}_RUNNER_[0-9a-f]{64}_RETENTION_V2_MAX2$/); assert.doesNotMatch(STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3, /MAX48|REMAINING/); });
