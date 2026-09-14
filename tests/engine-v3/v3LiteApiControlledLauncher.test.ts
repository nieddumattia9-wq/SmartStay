import assert from "node:assert/strict";
import { spawn, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const SOURCE = process.cwd();
const PS51 = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
const BRANCH = "codex/evaluation-d0036-d0041";
const WIN51 = process.platform === "win32" ? false
  : "requires real Windows PowerShell 5.1 and CurrentUser DPAPI; executed by the required windows-latest release job";
const load = new Function("url", "return import(url)") as (url: string) => Promise<any>;
const moduleAt = (root: string, file: string) => load(pathToFileURL(join(root, file)).href);
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const writeJson = (file: string, value: unknown) => {
  const bytes = JSON.stringify(value, null, 2) + "\n";
  writeFileSync(file, bytes); return sha(bytes);
};
function git(root: string, args: string[]) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(r.error, undefined); assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function started(r: SpawnSyncReturns<string>) {
  assert.equal(r.error, undefined, "PowerShell 5.1 must actually start, not ENOENT or timeout");
  assert.notEqual(r.status, null, "status=null cannot satisfy a rejection assertion");
  assert.equal(typeof r.stdout, "string"); assert.equal(typeof r.stderr, "string");
}
function resultJson(r: SpawnSyncReturns<string>) {
  started(r); assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /CREDENTIAL_CLEARED_FROM_PROCESS=YES/);
  const end = r.stdout.lastIndexOf("}");
  assert.ok(r.stdout.indexOf("{") >= 0 && end >= 0, "structured receipt must be present");
  return JSON.parse(r.stdout.slice(r.stdout.indexOf("{"), end + 1));
}
function rejected(r: SpawnSyncReturns<string>, code: RegExp) {
  started(r); assert.equal(r.status, 1, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout + r.stderr, code);
  assert.doesNotMatch(r.stdout + r.stderr, /LiteAPI API key \(input non visibile\)/);
}
function treeFiles(root: string): Array<{ path: string; sha256: string; bytes: number; mtimeMs: number }> {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
    const file = join(root, e.name);
    assert.ok(!e.isSymbolicLink(), "test evidence must not contain links");
    if (e.isDirectory()) return treeFiles(file);
    const s = statSync(file); return [{ path: file, sha256: sha(readFileSync(file)), bytes: s.size, mtimeMs: s.mtimeMs }];
  });
}
function clean(root: string) {
  const target = resolve(root);
  assert.ok(target.startsWith(resolve(tmpdir()) + sep));
  assert.match(basename(target), /^StayOpti-D0062-Launcher-/);
  rmSync(target, { recursive: true, force: true });
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function fixture(count = 5, options: { autoCrlf?: boolean } = {}) {
  const temp = mkdtempSync(join(tmpdir(), "StayOpti-D0062-Launcher-"));
  try {
    const repo = join(temp, "candidate"); mkdirSync(repo);
    const plan = await moduleAt(SOURCE, "scripts/liteapi-controlled-plan-v1.mjs");
    const paths: string[] = plan.acquisitionCodePaths(SOURCE);
    for (const p of paths) { mkdirSync(dirname(join(repo, p)), { recursive: true }); copyFileSync(join(SOURCE, p), join(repo, p)); }
    if (options.autoCrlf) {
      const p = join(repo, "scripts/liteapi-controlled-plan-v1.mjs");
      writeFileSync(p, readFileSync(p, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
    }
    git(repo, ["init", "--initial-branch", BRANCH]);
    git(repo, ["config", "user.name", "Synthetic launcher validation"]);
    git(repo, ["config", "user.email", "validation@example.invalid"]);
    git(repo, ["config", "core.autocrlf", options.autoCrlf ? "true" : "false"]);
    git(repo, ["add", "--", ...paths]); git(repo, ["commit", "-m", "Synthetic D0062 launcher closure"]);
    assert.equal(git(repo, ["status", "--porcelain=v1", "-uall"]), "");
    const head = git(repo, ["rev-parse", "HEAD"]);
    const build = await moduleAt(SOURCE, "tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs");
    const registry = join(temp, "synthetic-registry");
    const data = build.documentaryFixture({ count, directory: registry });
    const configFile = join(temp, "config.json"), simulationFile = join(temp, "simulation.json"), inventoryFile = join(temp, "inventory.json");
    const f = { temp, repo, head, registry, paths, data, configFile, simulationFile, inventoryFile,
      configSha: writeJson(configFile, data.config), simulationSha: writeJson(simulationFile, data.simulation), inventorySha: "" };
    const inventory = invoke(f, "Inventory", { OutputPath: inventoryFile });
    const parsed = resultJson(inventory); f.inventorySha = sha(readFileSync(inventoryFile));
    assert.deepEqual(parsed.code.map((x: any) => x.path), paths);
    assert.equal(parsed.expectedHead, head); assert.equal(parsed.expectedBranch, BRANCH);
    assert.equal(existsSync(registry), false, "Inventory cannot create a private store");
    return f;
  } catch (e) { clean(temp); throw e; }
}
function args(f: Fixture, mode: string, override: Record<string, string> = {}) {
  const values: Record<string, string> = { ExpectedHead: f.head, ExpectedBranch: BRANCH };
  if (mode !== "Inventory") Object.assign(values, {
    ConfigPath: f.configFile, ConfigSha256: f.configSha,
    InventoryPath: f.inventoryFile, InventorySha256: f.inventorySha,
    ...(mode === "Simulate" ? { SimulationPath: f.simulationFile, SimulationSha256: f.simulationSha } : {}),
  });
  Object.assign(values, override);
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File",
    join(f.repo, "scripts/invoke-liteapi-controlled-acquisition.ps1"), "-Mode", mode,
    ...Object.entries(values).flatMap(([k, v]) => ["-" + k, v])];
}
function invoke(f: Fixture, mode: string, override: Record<string, string> = {}, timeout = 60_000) {
  const r = spawnSync(PS51, args(f, mode, override), { cwd: f.repo, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 3 * 1024 * 1024 });
  started(r); return r;
}
function replaceSimulation(f: Fixture, mutate: (simulation: any) => void) {
  mutate(f.data.simulation); f.simulationSha = writeJson(f.simulationFile, f.data.simulation);
}
function pendingProductionConfig(f: Fixture) {
  const c = structuredClone(f.data.config);
  c.origin = "LITEAPI_PRODUCTION"; c.caseId = "D0060_LITEAPI_NEW_BOLOGNA_20270110_CASE_001";
  Object.assign(c.scenario.searchRequest, { cityName: "Bologna", checkin: "2027-01-10", checkout: "2027-01-17", occupancies: [{ adults: 2, children: [6, 11] }] });
  c.scenario.party.childAgesAtStay = [6, 11];
  c.scenario.stay = { checkIn: "2027-01-10", checkOut: "2027-01-17", currency: "EUR" }; c.scenario.totalBudget = 1400;
  c.scenarioConfirmed = false; c.account = null; c.retention.directory = null;
  f.configSha = writeJson(f.configFile, c);
}
function journalArgs(f: Fixture) {
  const root = join(f.registry, "cases", f.data.config.caseId);
  const header = JSON.parse(readFileSync(join(root, "header.json"), "utf8"));
  assert.equal(header.binding.mode, "SYNTHETIC_ONLY");
  return { root, registryRoot: f.registry, repositoryRoot: f.repo, ...header.binding };
}
async function verify(f: Fixture) {
  const journal = await moduleAt(f.repo, "scripts/liteapi-acquisition-journal-v1.mjs");
  return { journal, input: journalArgs(f), state: journal.verifyAcquisitionJournal(journalArgs(f)) };
}

test("CL01 launcher is explicitly PS5.1 with process-only credential pipe and no implicit engine execution", () => {
  const ps = readFileSync(join(SOURCE, "scripts/invoke-liteapi-controlled-acquisition.ps1"), "utf8");
  const runner = readFileSync(join(SOURCE, "scripts/run-liteapi-controlled-acquisition.mjs"), "utf8");
  assert.match(ps, /PSVersionTable/); assert.doesNotMatch(ps, /\bpwsh(?:\.exe)?\b/i);
  assert.match(ps, /AsSecureString/); assert.match(ps, /RedirectStandardInput/); assert.match(ps, /ZeroFreeBSTR/);
  assert.doesNotMatch(ps, /SetEnvironmentVariable|Set-Clipboard|Invoke-Expression/);
  assert.doesNotMatch(runner, /executeObservedOfferDiagnostic\s*\(|executeReviewedEvidenceAppendix\s*\(/);
});

test("CL02 actual Inventory then pending production Preflight creates no custody or credential prompt", { skip: WIN51 }, async () => {
  const f = await fixture();
  try {
    pendingProductionConfig(f);
    const result = resultJson(invoke(f, "Preflight"));
    assert.equal(result.status, "HOLD_CONFIGURATION_PENDING"); assert.equal(result.expectedAuthorization, null);
    assert.equal(result.rawCustodyCreated, false); assert.equal(result.credentialLoaded, false);
    assert.equal(result.authorizationConsumed, false); assert.equal(result.providerRequests, 0);
    assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    assert.equal(result.dpapiProbe, "PASS_SYNTHETIC_BYTES_CURRENT_USER");
    assert.equal(existsSync(f.registry), false);
  } finally { clean(f.temp); }
});

test("CL03 checkpoint, inventory, configuration and staging changes reject before registry creation", { skip: WIN51 }, async () => {
  const f = await fixture();
  try {
    rejected(invoke(f, "Simulate", { ExpectedHead: "0".repeat(40) }), /CHECKPOINT_MISMATCH/);
    rejected(invoke(f, "Simulate", { ExpectedBranch: "main" }), /CHECKPOINT_MISMATCH/);
    rejected(invoke(f, "Simulate", { ConfigSha256: "0".repeat(64) }), /INPUT_FILE_HASH/);
    rejected(invoke(f, "Simulate", { InventorySha256: "0".repeat(64) }), /INPUT_FILE_HASH/);
    const originalConfig = readFileSync(f.configFile), originalConfigSha = f.configSha;
    const alteredConfig = JSON.parse(originalConfig.toString("utf8")); alteredConfig.limits.total = 18;
    f.configSha = writeJson(f.configFile, alteredConfig);
    rejected(invoke(f, "Simulate"), /LIMITS_CHANGED/);
    writeFileSync(f.configFile, originalConfig); f.configSha = originalConfigSha;
    const originalInventory = readFileSync(f.inventoryFile), originalInventorySha = f.inventorySha;
    const alteredInventory = JSON.parse(originalInventory.toString("utf8")); alteredInventory.code.pop();
    f.inventorySha = writeJson(f.inventoryFile, alteredInventory);
    rejected(invoke(f, "Simulate"), /CODE_INVENTORY_INCOMPLETE/);
    writeFileSync(f.inventoryFile, originalInventory); f.inventorySha = originalInventorySha;
    const original = readFileSync(join(f.repo, "scripts/liteapi-controlled-plan-v1.mjs"));
    writeFileSync(join(f.repo, "scripts/liteapi-controlled-plan-v1.mjs"), Buffer.concat([original, Buffer.from("\n// synthetic changed bytes\n")]));
    rejected(invoke(f, "Simulate"), /CODE_OR_PRESERVED_BYTES_CHANGED/);
    writeFileSync(join(f.repo, "scripts/liteapi-controlled-plan-v1.mjs"), original);
    writeFileSync(join(f.repo, "synthetic-staged.txt"), "SYNTHETIC_ONLY\n"); git(f.repo, ["add", "--", "synthetic-staged.txt"]);
    rejected(invoke(f, "Simulate"), /STAGING_NOT_EMPTY/);
    assert.equal(existsSync(f.registry), false);
  } finally { clean(f.temp); }
});

test("CL04 complete actual PS5.1 simulation makes exactly17 loopback requests, encrypts originals and rejects restart", { skip: WIN51 }, async () => {
  const f = await fixture();
  try {
    const result = resultJson(invoke(f, "Simulate"));
    assert.equal(result.status, "COMPLETE"); assert.equal(result.actualAttempts, 17);
    assert.equal(result.localHttpRequests, 17); assert.equal(result.providerHttpRequests, 0);
    assert.equal(result.prebookCreationsAttempted, 5); assert.equal(result.syntheticProofOnly, true);
    assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    assert.equal(result.credentialPersisted, false); assert.equal(result.credentialPrinted, false);
    assert.equal(result.credentialClearedFromProcess, true); assert.equal(result.journalVerified, true);
    const before = treeFiles(f.registry), { journal, input, state } = await verify(f);
    assert.equal(state.status, "COMPLETED"); assert.equal(state.keyProtection, "WINDOWS_CURRENT_USER_DPAPI");
    assert.equal(state.eventCount, 36); assert.equal(state.attemptsReserved, 17); assert.equal(state.lockPresent, false);
    assert.deepEqual(state.counts, { SEARCH: 1, HOTEL_DETAIL: 5, FACILITIES: 1, PREBOOK: 5, PREBOOK_GET: 5 });
    assert.equal(readdirSync(join(input.root, "encrypted")).length, 34);
    for (const r of state.requests) for (const direction of ["request", "response"] as const) {
      const ref = r[direction], encrypted = readFileSync(join(input.root, "encrypted", ref.file));
      assert.equal(sha(encrypted), ref.fileSha256);
      assert.doesNotMatch(encrypted.toString("utf8"), /invented-wire-property-|OFFER_\d+_|SESSION_\d+/);
    }
    const request = journal.decryptAcquisitionOriginal({ ...input, ordinal: 1, direction: "request" });
    assert.equal(sha(request), state.requests[0].request.rawSha256);
    const response = journal.decryptAcquisitionOriginal({ ...input, ordinal: 1, direction: "response" });
    assert.equal(sha(response), state.requests[0].response.rawSha256);
    const reconstructed = JSON.parse(response.toString("utf8"));
    assert.deepEqual(JSON.parse(Buffer.from(reconstructed.response.body.base64, "base64").toString("utf8")), f.data.simulation.responses[0].response);
    request.fill(0); response.fill(0);
    const context = { config: state.context.config, checkpoint: state.context.checkpoint };
    assert.deepEqual(context.config, f.data.config);
    assert.equal(context.checkpoint.head, f.head); assert.equal(context.checkpoint.branch, BRANCH);
    const captureModule = await moduleAt(f.repo, "scripts/liteapi-controlled-capture-v1.mjs");
    const observationModule = await moduleAt(f.repo, "scripts/liteapi-observation-diagnostic-v1.mjs");
    const reopened = captureModule.readAuthenticatedAcquisitionCapture(input, context);
    assert.equal(reopened.requests.length, 17); assert.equal(reopened.status, "COMPLETE");
    const prepared = observationModule.prepareLiteApiProviderObservation({ ...context, capture: reopened, evaluatedAt: new Date().toISOString() });
    assert.equal(prepared.status, "PREPARED_DIAGNOSTIC_INPUT"); assert.equal(prepared.input.candidates.length, 5);
    assert.equal(prepared.engineInvocations, 0); assert.equal(prepared.policyInvocations, 0); assert.equal(prepared.decision, null);
    assert.equal(prepared.syntheticProofOnly, true); assert.equal(prepared.humanReceiptCreated, false); assert.equal(prepared.goldenAdmission, false);
    assert.deepEqual(treeFiles(f.registry), before, "read-only reopening must preserve all journal bytes and timestamps");
    rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    assert.deepEqual(treeFiles(f.registry), before, "restart must not write to an existing attempt");
  } finally { clean(f.temp); }
});

test("CL05 real launcher stops after authentication, redirect and semantic search failure without follow-up requests", { skip: WIN51 }, async () => {
  for (const variant of ["AUTH", "REDIRECT", "SEMANTIC"] as const) {
    const f = await fixture();
    try {
      replaceSimulation(f, simulation => {
        const r = simulation.responses[0];
        if (variant === "AUTH") r.status = 401;
        else if (variant === "REDIRECT") r.status = 302;
        else r.response = { error: "SYNTHETIC_SEARCH_ERROR", data: [] };
      });
      const result = resultJson(invoke(f, "Simulate"));
      assert.equal(result.status, "ABORTED"); assert.equal(result.actualAttempts, 1);
      assert.equal(result.localHttpRequests, 1); assert.equal(result.providerHttpRequests, 0);
      assert.equal(result.prebookCreationsAttempted, 0); assert.equal(result.policyInvocations, 0);
      const { state } = await verify(f); assert.equal(state.status, "ABORTED");
      assert.equal(state.attemptsReserved, 1); assert.equal(state.counts.HOTEL_DETAIL, 0);
      if (variant === "AUTH") assert.equal(state.requests[0].errorClass, "HTTP_401");
      if (variant === "REDIRECT") assert.equal(state.requests[0].errorClass, "REDIRECT_REFUSED");
    } finally { clean(f.temp); }
  }
});

test("CL06 documented SEARCH timeout uses the sealed15s limit and preserves its consumed attempt without retry", { skip: WIN51 }, async () => {
  const f = await fixture();
  try {
    replaceSimulation(f, s => { s.responses[0].timeout = true; });
    assert.equal(f.data.config.timeoutMs.SEARCH, 15000);
    const result = resultJson(invoke(f, "Simulate", {}, 35_000));
    assert.equal(result.status, "ABORTED"); assert.equal(result.actualAttempts, 1);
    assert.equal(result.localHttpRequests, 1); assert.equal(result.providerHttpRequests, 0);
    const { state } = await verify(f); assert.equal(state.requests[0].errorClass, "TIMEOUT");
    assert.equal(state.attemptsReserved, 1); assert.equal(state.restartAllowed, false);
    const before = treeFiles(f.registry); rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    assert.deepEqual(treeFiles(f.registry), before);
  } finally { clean(f.temp); }
});

test("CL07 concurrent launcher start is refused while the first one-shot attempt finishes normally", { skip: WIN51 }, async () => {
  const f = await fixture(3);
  const child = spawn(PS51, args(f, "Simulate"), { cwd: f.repo, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = ""; child.stdout!.on("data", b => { stdout += b; }); child.stderr!.on("data", b => { stderr += b; });
  const done = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveDone, rejectDone) => { child.once("error", rejectDone); child.once("close", (code, signal) => resolveDone({ code, signal })); });
  try {
    const deadline = Date.now() + 15_000, event = join(f.registry, "cases", f.data.config.caseId, "events", "000002.json");
    while (!existsSync(event) && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
    assert.ok(existsSync(event), "first process must really reserve its request");
    rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    const ended = await done; assert.equal(ended.signal, null); assert.equal(ended.code, 0, stdout + stderr);
    assert.match(stdout, /CREDENTIAL_CLEARED_FROM_PROCESS=YES/);
    const { state } = await verify(f); assert.equal(state.attemptsReserved, 11); assert.equal(state.status, "COMPLETED");
    assert.equal(state.eventCount, 24); assert.equal(state.counts.SEARCH, 1);
  } finally { await done; clean(f.temp); }
});

test("CL08 stopping only the verified synthetic Node child leaves a non-resumable reserved attempt", { skip: WIN51 }, async () => {
  const f = await fixture(1);
  replaceSimulation(f, s => { s.responses[0].timeout = true; });
  const child = spawn(PS51, args(f, "Simulate"), { cwd: f.repo, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = ""; child.stdout!.on("data", b => { stdout += b; }); child.stderr!.on("data", b => { stderr += b; });
  const done = new Promise<number | null>((resolveDone, rejectDone) => { child.once("error", rejectDone); child.once("close", resolveDone); });
  const childPid = child.pid; assert.ok(childPid, "actual PowerShell PID required");
  const findAndStop = (stop: boolean) => {
    const command = "$ErrorActionPreference='Stop'; $matches=@(Get-CimInstance Win32_Process -Filter ('ParentProcessId='+$env:D0062_TEST_PARENT_PID) | Where-Object { $_.Name -ieq 'node.exe' -and $_.CommandLine.Contains($env:D0062_TEST_SCRIPT) }); if ($matches.Count -gt 1) { throw 'AMBIGUOUS_SYNTHETIC_CHILD' }; " +
      (stop ? "if ($matches.Count -ne 1) { throw 'SYNTHETIC_CHILD_NOT_FOUND' }; Stop-Process -Id $matches[0].ProcessId -Force -ErrorAction Stop; Write-Output 'VERIFIED_SYNTHETIC_CHILD_STOPPED'" : "Write-Output ('REMAINING_SYNTHETIC_CHILDREN='+$matches.Count)");
    const r = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
      encoding: "utf8", windowsHide: true, timeout: 10_000,
      env: { ...process.env, D0062_TEST_PARENT_PID: String(childPid), D0062_TEST_SCRIPT: join(f.repo, "scripts/run-liteapi-controlled-acquisition.mjs") },
    });
    started(r); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout;
  };
  try {
    const deadline = Date.now() + 12_000, event = join(f.registry, "cases", f.data.config.caseId, "events", "000002.json");
    while (!existsSync(event) && Date.now() < deadline) await new Promise(r => setTimeout(r, 40));
    assert.ok(existsSync(event), "the killed process must have persisted RESERVE before HTTP");
    assert.match(findAndStop(true), /VERIFIED_SYNTHETIC_CHILD_STOPPED/);
    assert.equal(await done, 1, stdout + stderr);
    assert.match(stdout + stderr, /LITEAPI_ACQUISITION_RUNNER_FAILED/);
    assert.match(findAndStop(false), /REMAINING_SYNTHETIC_CHILDREN=0/);
    const { state } = await verify(f);
    assert.equal(state.status, "INCOMPLETE_ONE_SHOT"); assert.equal(state.attemptsReserved, 1);
    assert.equal(state.activeOrdinal, 1); assert.equal(state.lockPresent, true); assert.equal(state.restartAllowed, false);
    const before = treeFiles(f.registry); rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    assert.deepEqual(treeFiles(f.registry), before, "no lock removal, refund or implicit resume after interruption");
  } finally {
    if (child.exitCode === null) {
      // Only the previously verified child of this synthetic PowerShell process;
      // never a broad process name kill or a real acquisition process.
      try { findAndStop(true); } catch { /* normal child exit can win this race */ }
    }
    await done; clean(f.temp);
  }
});

test("CL09 actual prebook timeout retains uncertain remote effect and never invents a GET identifier", { skip: WIN51 }, async () => {
  const f = await fixture(1);
  try {
    replaceSimulation(f, s => {
      const index = f.data.requests.findIndex((r: any) => r.kind === "PREBOOK");
      assert.equal(index, 3); s.responses[index].timeout = true;
      s.responses = s.responses.slice(0, index + 1);
    });
    assert.equal(f.data.config.timeoutMs.PREBOOK, 30_000);
    const result = resultJson(invoke(f, "Simulate", {}, 50_000));
    assert.equal(result.actualAttempts, 4); assert.equal(result.localHttpRequests, 4);
    assert.equal(result.prebookCreationsAttempted, 1); assert.equal(result.remotePrebookEffectUncertain, true);
    assert.equal(result.providerHttpRequests, 0); assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    const { state } = await verify(f);
    assert.equal(state.counts.PREBOOK, 1); assert.equal(state.counts.PREBOOK_GET, 0);
    assert.equal(state.requests.at(-1).errorClass, "TIMEOUT");
    assert.equal(state.requests.at(-1).state, "FAILED"); assert.equal(state.restartAllowed, false);
    const before = treeFiles(f.registry); rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    assert.deepEqual(treeFiles(f.registry), before);
  } finally { clean(f.temp); }
});

test("CL10 unsafe, existing or missing-parent output paths reject before the one-shot registry is created", { skip: WIN51 }, async () => {
  const f = await fixture(1);
  try {
    const existing = join(f.temp, "preserved-synthetic-output.json");
    const original = Buffer.from('{"synthetic":"must remain unchanged"}\n'); writeFileSync(existing, original);
    rejected(invoke(f, "Simulate", { OutputPath: existing }), /OUTPUT_ALREADY_PRESENT/);
    assert.deepEqual(readFileSync(existing), original);
    rejected(invoke(f, "Simulate", { OutputPath: join(f.repo, "synthetic-forbidden-output.json") }), /PRIVATE_PATH_IN_REPOSITORY/);
    rejected(invoke(f, "Simulate", { OutputPath: join(f.temp, "missing-parent", "output.json") }), /OUTPUT_PARENT_MISSING/);
    assert.equal(existsSync(f.registry), false); assert.equal(existsSync(join(f.temp, "missing-parent")), false);
    assert.equal(existsSync(join(f.repo, "synthetic-forbidden-output.json")), false);
  } finally { clean(f.temp); }
});

test("CL11 interrupted response bytes remain encrypted and authenticated but cannot become a normalized search", { skip: WIN51 }, async () => {
  const f = await fixture(3);
  try {
    // Even syntactically complete JSON cannot be trusted as a completed HTTP
    // response when the connection was interrupted before end-of-message.
    const partial = Buffer.from(JSON.stringify(f.data.simulation.responses[0].response));
    replaceSimulation(f, simulation => { simulation.responses[0].partialBytes = partial.toString("utf8"); });
    const result = resultJson(invoke(f, "Simulate"));
    assert.equal(result.status, "ABORTED"); assert.equal(result.actualAttempts, 1); assert.equal(result.localHttpRequests, 1);
    assert.equal(result.providerHttpRequests, 0); assert.equal(result.prebookCreationsAttempted, 0);
    assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    assert.equal(result.preparationStatus, "NOT_PREPARED"); assert.match(result.issues.join(" "), /SEARCH_UNUSABLE/);
    const before = treeFiles(f.registry), { journal, input, state } = await verify(f);
    assert.equal(state.status, "ABORTED"); assert.equal(state.attemptsReserved, 1); assert.equal(state.counts.HOTEL_DETAIL, 0);
    assert.equal(state.requests[0].state, "FAILED"); assert.equal(state.requests[0].errorClass, "TRANSPORT_FAILED");
    assert.equal(readdirSync(join(input.root, "encrypted")).length, 2);
    for (const direction of ["request", "response"] as const) {
      const ref = state.requests[0][direction], encrypted = readFileSync(join(input.root, "encrypted", ref.file));
      assert.equal(sha(encrypted), ref.fileSha256); assert.equal(encrypted.includes(partial), false);
    }
    const bytes = journal.decryptAcquisitionOriginal({ ...input, ordinal: 1, direction: "response" });
    assert.equal(sha(bytes), state.requests[0].response.rawSha256);
    const record = JSON.parse(bytes.toString("utf8")); bytes.fill(0);
    assert.equal(record.response, null); assert.equal(record.partialResponse.complete, false);
    assert.equal(record.partialResponse.body.sha256, sha(partial)); assert.equal(record.partialResponse.body.byteLength, partial.length);
    assert.deepEqual(Buffer.from(record.partialResponse.body.base64, "base64"), partial);
    const context = { config: state.context.config, checkpoint: state.context.checkpoint };
    const captureModule = await moduleAt(f.repo, "scripts/liteapi-controlled-capture-v1.mjs");
    const observationModule = await moduleAt(f.repo, "scripts/liteapi-observation-diagnostic-v1.mjs");
    const reopened = captureModule.readAuthenticatedAcquisitionCapture(input, context);
    assert.equal(reopened.requests[0].outcome, "FAILED"); assert.equal(reopened.selection, null);
    assert.throws(() => observationModule.prepareLiteApiProviderObservation({ ...context, capture: reopened, evaluatedAt: new Date().toISOString() }), /SEARCH_UNUSABLE/);
    assert.deepEqual(treeFiles(f.registry), before, "partial evidence verification and rejected preparation cannot mutate the journal");
    rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    assert.deepEqual(treeFiles(f.registry), before); partial.fill(0);
  } finally { clean(f.temp); }
});

test("CL12 interrupted prebook may have a remote effect but cannot authorize a GET or a retry", { skip: WIN51 }, async () => {
  const f = await fixture(1);
  try {
    const partial = Buffer.from('{"data":{"status":"SYNTHETIC_UNCONFIRMED_REMOTE_EFFECT"');
    replaceSimulation(f, simulation => {
      const index = f.data.requests.findIndex((r: any) => r.kind === "PREBOOK");
      assert.equal(index, 3); simulation.responses[index].partialBytes = partial.toString("utf8");
      simulation.responses = simulation.responses.slice(0, index + 1);
    });
    const result = resultJson(invoke(f, "Simulate"));
    assert.equal(result.actualAttempts, 4); assert.equal(result.localHttpRequests, 4);
    assert.equal(result.prebookCreationsAttempted, 1); assert.equal(result.remotePrebookEffectUncertain, true);
    assert.equal(result.providerHttpRequests, 0); assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    const before = treeFiles(f.registry), { journal, input, state } = await verify(f);
    assert.equal(state.counts.PREBOOK, 1); assert.equal(state.counts.PREBOOK_GET, 0); assert.equal(state.attemptsReserved, 4);
    assert.equal(state.requests[3].state, "FAILED"); assert.equal(state.requests[3].errorClass, "TRANSPORT_FAILED");
    const original = journal.decryptAcquisitionOriginal({ ...input, ordinal: 4, direction: "response" });
    assert.equal(sha(original), state.requests[3].response.rawSha256);
    const record = JSON.parse(original.toString("utf8")); original.fill(0);
    assert.equal(record.returnedPrebookId, null); assert.equal(record.response, null); assert.equal(record.partialResponse.complete, false);
    assert.deepEqual(Buffer.from(record.partialResponse.body.base64, "base64"), partial);
    assert.equal(record.partialResponse.body.sha256, sha(partial)); assert.equal(record.partialResponse.body.byteLength, partial.length);
    assert.deepEqual(treeFiles(f.registry), before);
    rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT/);
    assert.deepEqual(treeFiles(f.registry), before); partial.fill(0);
  } finally { clean(f.temp); }
});

test("CL13 production preflight preserves exact inventory hashes while allowing only Git CRLF/LF checkout equivalence", { skip: WIN51 }, async () => {
  const f = await fixture(1, { autoCrlf: true });
  try {
    pendingProductionConfig(f);
    const relative = "scripts/liteapi-controlled-plan-v1.mjs", codePath = join(f.repo, relative);
    const working = readFileSync(codePath), committed = spawnSync("git", ["show", f.head + ":" + relative], { cwd: f.repo, windowsHide: true });
    assert.equal(committed.error, undefined); assert.equal(committed.status, 0);
    assert.notEqual(sha(working), sha(committed.stdout), "fixture must exercise actual checkout bytes different from committed LF bytes");
    assert.equal(working.toString("utf8").replace(/\r\n/g, "\n"), committed.stdout.toString("utf8"));
    assert.equal(git(f.repo, ["status", "--porcelain=v1"]), "");
    const inventory = JSON.parse(readFileSync(f.inventoryFile, "utf8"));
    assert.equal(inventory.code.find((x: any) => x.path === relative).sha256, sha(working));
    const result = resultJson(invoke(f, "Preflight"));
    assert.equal(result.status, "HOLD_CONFIGURATION_PENDING"); assert.equal(result.rawCustodyCreated, false);
    writeFileSync(codePath, Buffer.concat([working, Buffer.from("\r\n// changed synthetic code, not only a line ending\r\n")]));
    rejected(invoke(f, "Preflight"), /CODE_OR_PRESERVED_BYTES_CHANGED/);
    const changed = sha(readFileSync(codePath));
    inventory.code.find((x: any) => x.path === relative).sha256 = changed;
    f.inventorySha = writeJson(f.inventoryFile, inventory);
    rejected(invoke(f, "Preflight"), /UNAPPROVED_WORKTREE_CHANGE/);
    // A caller-controlled exception list cannot certify executable changes.
    inventory.preserved.push({ path: relative, sha256: changed });
    f.inventorySha = writeJson(f.inventoryFile, inventory);
    rejected(invoke(f, "Preflight"), /EXECUTABLE_NOT_COMMITTED/);
    assert.equal(existsSync(f.registry), false);
  } finally { clean(f.temp); }
});
