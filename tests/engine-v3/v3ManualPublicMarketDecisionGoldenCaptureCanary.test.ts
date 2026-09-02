import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  STAYOPTI_MANUAL_MARKET_CREDENTIALS_LOADED_V3,
  STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3,
} from "../../src/engine-v3/evaluation/manualPublicMarketDecisionGoldenCaptureV3";

const root = process.cwd();
const hostPath = resolve(root, "scripts/run-v3-17t5b-manual-public-market-canary.mjs");
const launcherPath = resolve(root, "scripts/invoke-v3-17t5b-manual-public-market-canary.ps1");
const pickerPath = resolve(root, "scripts/select-v3-17t5b-private-evidence.ps1");
const zipPath = resolve(root, "scripts/create-v3-17t5b-evidence-zip.ps1");
const host = readFileSync(hostPath, "utf8");
const launcher = readFileSync(launcherPath, "utf8");
const picker = readFileSync(pickerPath, "utf8");
const zipper = readFileSync(zipPath, "utf8");

test("T5B 01 interface is a guided Italian flow and not a JSON editor", () => {
  assert.match(host, /Scenario congelato: Firenze/);
  assert.match(host, /Alternativa idonea/);
  assert.doesNotMatch(host, /modifica(?:re)?\s+JSON/i);
});

test("T5B 02 fixed scenario is exact", () => {
  for (const value of ["Florence, Italy", "2026-10-15", "2026-10-18", "budgetMinorUnits: 60000", "preferenceProfile: \"BALANCED\""]) assert.match(host, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("T5B 03 exactly five eligible alternatives are collected", () => {
  assert.match(host, /EXPECTED_ALTERNATIVES = 5/);
  assert.match(host, /state\.alternatives\.length < EXPECTED_ALTERNATIVES/);
});

test("T5B 04 progress is saved after each accepted or excluded result", () => {
  assert.ok((host.match(/persistState\(statePath, state\)/g) ?? []).length >= 4);
  assert.match(host, /Progresso:/);
});

test("T5B 05 a saved session resumes without re-entering prior hotels", () => {
  assert.match(host, /Ripresa automatica/);
  assert.match(host, /existsSync\(statePath\)/);
});

test("T5B 06 corrections are supported before finalization", () => {
  assert.match(host, /CORREGGI 1\.\.5/);
  assert.match(host, /Alternativa \$\{index \+ 1\} corretta e salvata/);
});

test("T5B 07 private files are selected through a native dialog", () => {
  assert.match(picker, /OpenFileDialog/);
  assert.match(host, /selectPrivateFile/);
  assert.match(host, /readFileSync\(selectedFile\)/);
});

test("T5B 08 private evidence uses the encrypted CurrentUser store outside the repository", () => {
  assert.match(host, /createProviderRawQuarantineStoreV3/);
  assert.match(host, /createWindowsCurrentUserDpapiProtectorV3/);
  assert.match(launcher, /LocalApplicationData/);
  assert.match(launcher, /manual-market-golden-capture/);
});

test("T5B 09 private identity and proof are absent from sanitized Evidence", () => {
  assert.match(host, /PRIVATE_SOURCE_AND_PRESENTATION_METADATA/);
  assert.match(host, /privateEvidenceIncludedInSharedEvidence: false/);
  assert.match(host, /ensureNoSharedLeak/);
});

test("T5B 10 public precheckout prices retain non-bookable invariants", () => {
  for (const invariant of ["purchaseCompleted: false", "bookingConfirmed: false", "exactBookable: false", "verifiedCheckoutTotal: false", "personalizedDiscount: false"]) assert.match(host, new RegExp(invariant));
});

test("T5B 11 judgment, V3 execution and Golden admission remain disabled", () => {
  assert.match(host, /judgmentRecorded: false/);
  assert.match(host, /v3Executed: false/);
  assert.match(host, /automaticGoldenAdmission: false/);
  assert.match(host, /DECISION_GOLDEN_ADMITTED=NO/);
});

test("T5B 12 no network, scraping, credential or Booking automation capability exists", () => {
  assert.equal(STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3, 0);
  assert.equal(STAYOPTI_MANUAL_MARKET_CREDENTIALS_LOADED_V3, false);
  assert.doesNotMatch(host, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https\.request|http\.request|puppeteer|playwright|selenium/i);
  assert.doesNotMatch(launcher, /Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer/i);
});

test("T5B 13 evidence ZIP is created from sanitized files only", () => {
  assert.match(zipper, /CreateFromDirectory/);
  assert.match(host, /rawPrivateEvidenceIncluded: false/);
  assert.doesNotMatch(host, /artifacts\.set\([^\n]*(?:privateLedger|screenshot|sourceUrl|realName)/i);
});

test("T5B 14 PowerShell launcher binds an explicit execution HEAD before startup", () => {
  assert.match(launcher, /ExpectedExecutionHead/);
  assert.match(launcher, /MANUAL_CAPTURE_HEAD_MISMATCH/);
  assert.match(launcher, /git diff --cached --name-only/);
});

test("T5B 15 PowerShell 5.1 scripts parse", { skip: process.platform !== "win32" }, () => {
  for (const path of [launcherPath, pickerPath, zipPath]) {
    const parse = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$e=$null;$t=$null;[Management.Automation.Language.Parser]::ParseFile($env:STAYOPTI_PS,[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}"], { encoding: "utf8", windowsHide: true, env: { ...process.env, STAYOPTI_PS: path } });
    assert.equal(parse.status, 0, parse.stderr);
  }
});

test("T5B 16 synthetic dry run covers save, resume, encryption, snapshot, capsule and Evidence", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const run = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcherPath, "-Mode", "dry-run", "-ExpectedExecutionHead", head], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const receipt = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1)!);
  assert.deepEqual(receipt, {
    status: "PASS",
    alternatives: 5,
    progressiveSave: true,
    resume: true,
    validation: true,
    encryptedPrivateEvidence: true,
    tamperDetection: true,
    providerNeutralSnapshot: true,
    blindCapsule: true,
    sanitizedEvidence: true,
    plaintextPrivateEvidenceAtRest: false,
    automatedHttpRequests: 0,
    credentialsLoaded: false,
    syntheticArtifactsDeleted: true,
  });
});
