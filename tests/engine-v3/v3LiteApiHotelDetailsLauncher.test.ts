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
const moduleAt = (root: string, path: string) => load(pathToFileURL(join(root, path)).href);
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
  const start = r.stdout.indexOf("{"), end = r.stdout.lastIndexOf("}");
  assert.ok(start >= 0 && end >= start, "structured launcher receipt is required");
  return JSON.parse(r.stdout.slice(start, end + 1));
}
function rejected(r: SpawnSyncReturns<string>, code: RegExp) {
  started(r); assert.equal(r.status, 1, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout + r.stderr, code);
  assert.doesNotMatch(r.stdout + r.stderr, /LiteAPI Production Private API Key|SYNTHETIC_NOT_A_REAL_KEY/);
}
function treeFiles(root: string): Array<{ path: string; sha256: string; bytes: number; mtimeMs: number }> {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
    const path = join(root, e.name);
    assert.ok(!e.isSymbolicLink(), "synthetic evidence may not contain links");
    if (e.isDirectory()) return treeFiles(path);
    const s = statSync(path); return [{ path, sha256: sha(readFileSync(path)), bytes: s.size, mtimeMs: s.mtimeMs }];
  });
}
function clean(root: string) {
  const target = resolve(root);
  assert.ok(target.startsWith(resolve(tmpdir()) + sep));
  assert.match(basename(target), /^StayOpti-D0066-Launcher-/);
  rmSync(target, { recursive: true, force: true });
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
async function fixture(count = 5, mutateDetail?: (payload: any, index: number) => void) {
  const temp = mkdtempSync(join(tmpdir(), "StayOpti-D0066-Launcher-"));
  try {
    const repo = join(temp, "candidate"); mkdirSync(repo);
    const plan = await moduleAt(SOURCE, "scripts/liteapi-hotel-detail-plan-v1.mjs");
    const paths: string[] = plan.hotelDetailCodePaths(SOURCE);
    for (const path of paths) { mkdirSync(dirname(join(repo, path)), { recursive: true }); copyFileSync(join(SOURCE, path), join(repo, path)); }
    git(repo, ["init", "--initial-branch", BRANCH]);
    git(repo, ["config", "user.name", "Synthetic launcher validation"]);
    git(repo, ["config", "user.email", "validation@example.invalid"]);
    git(repo, ["config", "core.autocrlf", "false"]);
    git(repo, ["add", "--", ...paths]); git(repo, ["commit", "-m", "Synthetic D0066 launcher closure"]);
    assert.equal(git(repo, ["status", "--porcelain=v1", "-uall"]), "");
    const head = git(repo, ["rev-parse", "HEAD"]), registry = join(temp, "synthetic-registry");
    const build = await moduleAt(SOURCE, "tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs");
    const data = build.hotelDetailFixture({ count, directory: registry, mutateDetail });
    const configFile = join(temp, "config.json"), simulationFile = join(temp, "simulation.json"), inventoryFile = join(temp, "inventory.json");
    const f = { temp, repo, head, registry, paths, data, configFile, simulationFile, inventoryFile,
      configSha: writeJson(configFile, data.config), simulationSha: writeJson(simulationFile, data.simulation), inventorySha: "" };
    const copiedPlan = await moduleAt(repo, "scripts/liteapi-hotel-detail-plan-v1.mjs");
    const expectedInventory = copiedPlan.createHotelDetailInventory(repo, { expectedHead: head, expectedBranch: BRANCH });
    const parsed = resultJson(invoke(f, "Inventory", { OutputPath: inventoryFile }));
    assert.deepEqual(parsed, expectedInventory, "the actual wrapper must seal exactly the copied synthetic executable closure");
    f.inventorySha = sha(readFileSync(inventoryFile));
    assert.deepEqual(parsed.code.map((x: any) => x.path), paths);
    assert.equal(parsed.expectedHead, head); assert.equal(parsed.expectedBranch, BRANCH);
    assert.equal(existsSync(registry), false, "Inventory cannot create private custody");
    return f;
  } catch (e) { clean(temp); throw e; }
}
function args(f: Fixture, mode: string, override: Record<string, string> = {}) {
  const values: Record<string, string> = { ExpectedHead: f.head, ExpectedBranch: BRANCH };
  if (mode !== "Inventory") Object.assign(values, {
    ConfigPath: f.configFile, ConfigSha256: f.configSha, InventoryPath: f.inventoryFile, InventorySha256: f.inventorySha,
    ...(mode === "Simulate" ? { SimulationPath: f.simulationFile, SimulationSha256: f.simulationSha } : {}),
  });
  Object.assign(values, override);
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File",
    join(f.repo, "scripts/invoke-liteapi-hotel-detail-enrichment.ps1"), "-Mode", mode,
    ...Object.entries(values).flatMap(([key, value]) => ["-" + key, value])];
}
function invoke(f: Fixture, mode: string, override: Record<string, string> = {}) {
  const r = spawnSync(PS51, args(f, mode, override), {
    cwd: f.repo, encoding: "utf8", windowsHide: true, timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
  });
  started(r); return r;
}
function replaceSimulation(f: Fixture, mutate: (simulation: any) => void) {
  mutate(f.data.simulation); f.simulationSha = writeJson(f.simulationFile, f.data.simulation);
}
function journalArgs(f: Fixture) {
  const root = join(f.registry, "cases", f.data.config.caseId), header = JSON.parse(readFileSync(join(root, "header.json"), "utf8"));
  assert.equal(header.binding.mode, "SYNTHETIC_ONLY");
  return { root, registryRoot: f.registry, repositoryRoot: f.repo, ...header.binding };
}
async function verify(f: Fixture) {
  const journal = await moduleAt(f.repo, "scripts/liteapi-hotel-details-journal-v1.mjs"), input = journalArgs(f);
  return { input, state: journal.verifyHotelDetailsJournal(input) };
}

test("HDL01 actual PS5.1 Inventory, five GETs, CurrentUser DPAPI and unchanged authenticated reopen", { skip: WIN51 }, async () => {
  const f = await fixture();
  try {
    const inputHashes = [sha(readFileSync(f.configFile)), sha(readFileSync(f.simulationFile)), sha(readFileSync(f.inventoryFile))];
    const r = resultJson(invoke(f, "Simulate"));
    assert.equal(r.status, "COMPLETE", r.failureClass); assert.equal(r.actualAttempts, 5); assert.equal(r.localHttpRequests, 5);
    assert.equal(r.providerHttpRequests, 0); assert.equal(r.engineInvocations, 0); assert.equal(r.policyInvocations, 0);
    assert.equal(r.prebookCreationsAttempted, 0); assert.equal(r.restartAllowed, false);
    assert.equal(r.offerPriceRefreshed, false); assert.equal(r.offerAvailabilityRefreshed, false); assert.equal(r.providerOfferExpiryInferred, false);
    const { input, state } = await verify(f);
    assert.equal(state.keyProtection, "WINDOWS_CURRENT_USER_DPAPI"); assert.equal(state.status, "COMPLETED");
    assert.equal(state.eventCount, 12); assert.deepEqual(state.counts, { HOTEL_DETAIL: 5 });
    assert.equal(readdirSync(join(input.root, "encrypted")).length, 10);
    const before = treeFiles(f.registry), capture = await moduleAt(f.repo, "scripts/liteapi-hotel-details-capture-v1.mjs");
    const originals = capture.readAuthenticatedHotelDetails(input);
    assert.equal(originals.records.length, 5);
    for (const [i, pair] of originals.records.entries()) {
      assert.deepEqual(pair.request, f.data.records[i].request);
      assert.equal(pair.request.method, "GET"); assert.equal(pair.request.path, "/v3.0/data/hotel");
      assert.equal(pair.request.query.timeout, 4); assert.equal(pair.request.query.language, "en"); assert.equal(pair.request.body, null);
      const bytes = Buffer.from(pair.response.response.body.base64, "base64");
      try { assert.deepEqual(JSON.parse(bytes.toString("utf8")), f.data.simulation.responses[i].response); } finally { bytes.fill(0); }
    }
    for (const file of readdirSync(join(input.root, "encrypted"))) {
      assert.doesNotMatch(readFileSync(join(input.root, "encrypted", file), "utf8"), /SYNTHETIC_DETAIL_PROPERTY_|SYNTHETIC_OFFER_|Invented Maple/);
    }
    assert.deepEqual(treeFiles(f.registry), before, "reopening cannot rewrite custody, markers or timestamps");
    assert.deepEqual([sha(readFileSync(f.configFile)), sha(readFileSync(f.simulationFile)), sha(readFileSync(f.inventoryFile))], inputHashes);
    rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT|CASE_ALREADY_CONSUMED/);
    assert.deepEqual(treeFiles(f.registry), before, "a second run cannot reset a consumed acquisition");
  } finally { clean(f.temp); }
});

test("HDL02 wrong checkpoint, config, simulation, inventory, code and staging fail before progress", { skip: WIN51 }, async () => {
  const f = await fixture(2);
  try {
    for (const [override, code] of [
      [{ ExpectedHead: "0".repeat(40) }, /CHECKPOINT_MISMATCH/], [{ ExpectedBranch: "main" }, /CHECKPOINT_MISMATCH/],
      [{ ConfigSha256: "0".repeat(64) }, /INPUT_FILE_HASH/], [{ InventorySha256: "0".repeat(64) }, /INPUT_FILE_HASH/],
      [{ SimulationSha256: "0".repeat(64) }, /INPUT_FILE_HASH/],
    ] as Array<[Record<string, string>, RegExp]>) {
      rejected(invoke(f, "Simulate", override), code); assert.equal(existsSync(f.registry), false);
    }
    const configBytes = readFileSync(f.configFile), originalConfigSha = f.configSha;
    const alteredConfig = JSON.parse(configBytes.toString("utf8")); alteredConfig.controls.limits.total = 6;
    f.configSha = writeJson(f.configFile, alteredConfig);
    rejected(invoke(f, "Simulate"), /CONTROLS_OUTSIDE_PROFILE/); assert.equal(existsSync(f.registry), false);
    writeFileSync(f.configFile, configBytes); f.configSha = originalConfigSha;
    const inventoryBytes = readFileSync(f.inventoryFile), originalInventorySha = f.inventorySha;
    const alteredInventory = JSON.parse(inventoryBytes.toString("utf8")); alteredInventory.code.pop();
    f.inventorySha = writeJson(f.inventoryFile, alteredInventory);
    rejected(invoke(f, "Simulate"), /CODE_INVENTORY_INCOMPLETE/); assert.equal(existsSync(f.registry), false);
    writeFileSync(f.inventoryFile, inventoryBytes); f.inventorySha = originalInventorySha;
    const path = join(f.repo, "scripts/liteapi-hotel-detail-plan-v1.mjs"), bytes = readFileSync(path);
    writeFileSync(path, Buffer.concat([bytes, Buffer.from("\n// synthetic altered code\n")]));
    rejected(invoke(f, "Simulate"), /CODE_OR_PRESERVED_BYTES_CHANGED/); assert.equal(existsSync(f.registry), false);
    writeFileSync(path, bytes);
    writeFileSync(join(f.repo, "synthetic-staged.txt"), "SYNTHETIC_ONLY\n"); git(f.repo, ["add", "--", "synthetic-staged.txt"]);
    rejected(invoke(f, "Simulate"), /STAGING_NOT_EMPTY/); assert.equal(existsSync(f.registry), false);
  } finally { clean(f.temp); }
});

test("HDL03 a second concurrent PS5.1 launcher cannot add requests or revive consumed authority", { skip: WIN51 }, async () => {
  const f = await fixture(2); replaceSimulation(f, s => { s.responses[0].delayMs = 4_000; });
  const child = spawn(PS51, args(f, "Simulate"), { cwd: f.repo, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = ""; child.stdout!.on("data", b => { stdout += b; }); child.stderr!.on("data", b => { stderr += b; });
  const done = new Promise<number | null>((ok, no) => { child.once("error", no); child.once("close", ok); });
  try {
    const reserved = join(f.registry, "cases", f.data.config.caseId, "events", "000002.json"), deadline = Date.now() + 15_000;
    while (!existsSync(reserved) && Date.now() < deadline) await new Promise(r => setTimeout(r, 40));
    assert.ok(existsSync(reserved), "first launcher must durably reserve before the rival starts");
    assert.equal(child.exitCode, null, "the rival starts while the initial process is still running");
    rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT|CASE_ALREADY_CONSUMED/);
    assert.equal(await done, 0, stdout + stderr);
    const { state } = await verify(f);
    assert.equal(state.status, "COMPLETED"); assert.equal(state.attemptsReserved, 2); assert.deepEqual(state.counts, { HOTEL_DETAIL: 2 });
    assert.equal(new Set(state.requests.map((r: any) => r.subjectSha256)).size, 2);
    const before = treeFiles(f.registry); rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT|CASE_ALREADY_CONSUMED/);
    assert.deepEqual(treeFiles(f.registry), before);
  } finally { await done; clean(f.temp); }
});

for (const defect of ["application", "http"] as const) test("HDL04 first " + defect + " error aborts, retains raw and cannot retry", { skip: WIN51 }, async () => {
  const f = await fixture(2);
  try {
    replaceSimulation(f, s => {
      if (defect === "http") s.responses[0].status = 503;
      s.responses[0].response = { error: { code: defect === "http" ? 503 : 4002, message: "Invented detail failure" } };
    });
    const r = resultJson(invoke(f, "Simulate"));
    assert.equal(r.status, "ABORTED"); assert.equal(r.failureClass, defect === "http" ? "HTTP_503" : "DETAIL_APPLICATION_ERROR");
    assert.equal(r.actualAttempts, 1); assert.equal(r.localHttpRequests, 1); assert.equal(r.providerHttpRequests, 0);
    assert.equal(r.engineInvocations, 0); assert.equal(r.policyInvocations, 0); assert.equal(r.prebookCreationsAttempted, 0);
    const { input, state } = await verify(f); assert.equal(state.requests.length, 1); assert.equal(state.requests[0].state, "FAILED");
    const capture = await moduleAt(f.repo, "scripts/liteapi-hotel-details-capture-v1.mjs"), originals = capture.readAuthenticatedHotelDetails(input);
    assert.deepEqual(JSON.parse(Buffer.from(originals.records[0].response.response.body.base64, "base64").toString("utf8")), f.data.simulation.responses[0].response);
    const before = treeFiles(f.registry); rejected(invoke(f, "Simulate"), /CASE_ALREADY_PRESENT|CASE_ALREADY_CONSUMED/);
    assert.deepEqual(treeFiles(f.registry), before);
  } finally { clean(f.temp); }
});

test("HDL05 successful detail without a mapped room preserves incomplete coverage and the other target", { skip: WIN51 }, async () => {
  const f = await fixture(2, (p, index) => { if (index === 0) p.data.rooms = []; });
  try {
    const sourceBefore = JSON.stringify(f.data.config.source), r = resultJson(invoke(f, "Simulate"));
    assert.equal(r.status, "COMPLETE", r.failureClass); assert.equal(r.actualAttempts, 2);
    const { input } = await verify(f), capture = await moduleAt(f.repo, "scripts/liteapi-hotel-details-capture-v1.mjs");
    const comparison = await moduleAt(f.repo, "scripts/liteapi-room-detail-comparison-v1.mjs");
    const originals = capture.readAuthenticatedHotelDetails(input), result = comparison.compareHotelDetailCapture(f.data.config.source, originals);
    assert.equal(result.offerCount, 2); assert.equal(result.roomFoundCount, 1); assert.equal(result.assessableCount, 1);
    assert.equal(result.offers[0].status, "MAPPED_ROOM_NOT_FOUND"); assert.equal(result.offers[0].compatibility, "NOT_ASSESSABLE");
    assert.equal(result.offers[1].compatibility, "COMPATIBLE_OBSERVATIONS_NOT_COMMERCIAL_CERTIFICATION");
    assert.ok(result.offers.every((o: any) => o.bookabilityCertified === false && o.commercialObservationsRefreshed === false));
    assert.equal(result.engineInvocations, 0); assert.equal(result.policyInvocations, 0);
    assert.equal(JSON.stringify(f.data.config.source), sourceBefore);
  } finally { clean(f.temp); }
});

test("HDL06 actual PS5.1 literal precedes stored SecureString retrieval and sends only a synthetic pipe", { skip: WIN51 }, async () => {
  const temp = mkdtempSync(join(tmpdir(), "StayOpti-D0066-Launcher-Prompt-"));
  try {
    const plan = await moduleAt(SOURCE, "scripts/liteapi-hotel-detail-plan-v1.mjs");
    const build = await moduleAt(SOURCE, "tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs");
    const ready = plan.validateHotelDetailPlan(build.hotelDetailFixture({ directory: join(temp, "never-created") }).config, { synthetic: true }).status;
    const wrapper = readFileSync(join(SOURCE, "scripts/invoke-liteapi-hotel-detail-enrichment.ps1"), "utf8");
    assert.equal(wrapper.match(/-ReadyStatus '([^']+)'/)?.[1], ready, "wrapper must recognize the actual plan's ready status");
    const childScript = join(temp, "synthetic-preflight-and-pipe.mjs"), driver = join(temp, "prompt.ps1");
    writeFileSync(childScript, `const mode=process.argv.find(x=>x.startsWith('--Mode='));
if(mode==='--Mode=Preflight'){
 if(process.env.D0066_PROMPT_CASE==='PREFLIGHT_FAIL'){process.stderr.write('SYNTHETIC_PREFLIGHT_FAILED\\n');process.exitCode=1;}
 else process.stdout.write(JSON.stringify({status:${JSON.stringify(ready)},expectedAuthorization:'SYNTHETIC_LITERAL_ONLY'}));
}else if(mode==='--Mode=Acquire'){
 let value='';for await(const chunk of process.stdin)value+=chunk.toString('utf8');
 const valid=JSON.parse(value).credential==='SYNTHETIC_NOT_A_REAL_KEY'&&process.argv.includes('--Authorization=SYNTHETIC_LITERAL_ONLY');value='';
 if(!valid)process.exitCode=1;else process.stdout.write('SYNTHETIC_PIPE_RECEIVED_WITHOUT_CREDENTIAL_OUTPUT\\n');
}else process.exitCode=1;
`);
    writeFileSync(driver, `$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'PS51_REQUIRED'}
. $env:D0066_PROMPT_PRIMITIVE
$script:Calls=@()
function Read-Host { param([string]$Prompt,[switch]$AsSecureString)
 $script:Calls+=@{secure=[bool]$AsSecureString}
 if($AsSecureString){
  if($env:D0066_PROMPT_CASE -ne 'ACCEPT'){throw 'SECURE_PROMPT_REACHED_WITHOUT_AUTHORITY'}
  $SyntheticSecure=New-Object Security.SecureString
  foreach($SyntheticChar in 'SYNTHETIC_NOT_A_REAL_KEY'.ToCharArray()){$SyntheticSecure.AppendChar($SyntheticChar)}
  return $SyntheticSecure
 }
 if($env:D0066_PROMPT_CASE -eq 'WRONG_LITERAL'){return 'WRONG_LITERAL'}
 return 'SYNTHETIC_LITERAL_ONLY'
}
function Get-StayOptiLiteApiCredential { param([string]$Profile)
 if($Profile -cne 'Production' -or $env:D0066_PROMPT_CASE -ne 'ACCEPT'){throw 'STORE_READ_WITHOUT_AUTHORITY'}
 $script:Calls+=@{secure=$true}
 ConvertTo-SecureString 'SYNTHETIC_NOT_A_REAL_KEY' -AsPlainText -Force
}
$CapturedFailure=$null
try { Invoke-StayOptiProtectedProfile -Mode 'Acquire' -NodePath $env:D0066_PROMPT_NODE -NodeArguments @($env:D0066_PROMPT_CHILD,'--Mode=Acquire') -ReadyStatus $env:D0066_PROMPT_READY -SafetyNotice 'SYNTHETIC_ONLY_NO_PROVIDER' -ErrorPrefix 'LITEAPI_DETAIL' }
catch {$CapturedFailure=$_.Exception.Message}
if($env:D0066_PROMPT_CASE -eq 'ACCEPT'){
 if($null -ne $CapturedFailure -or $Calls.Count -ne 2 -or $Calls[0].secure -or -not $Calls[1].secure){throw 'ACCEPTED_PROMPT_FLOW_FAILED'}
}elseif($env:D0066_PROMPT_CASE -eq 'WRONG_LITERAL'){
 if($CapturedFailure -cne 'LITEAPI_DETAIL_AUTHORIZATION_NOT_ACCEPTED' -or $Calls.Count -ne 1 -or $Calls[0].secure){throw 'WRONG_LITERAL_PROMPT_GUARD_FAILED'}
}else{
 if($CapturedFailure -cne 'LITEAPI_DETAIL_PREFLIGHT_FAILED' -or $Calls.Count -ne 0){throw 'FAILED_PREFLIGHT_PROMPT_GUARD_FAILED'}
}
Write-Output ('PROTECTED_SYNTHETIC_PROMPT_CASE='+$env:D0066_PROMPT_CASE+';CALLS='+$Calls.Count+';PASS')
`);
    for (const scenario of ["ACCEPT", "WRONG_LITERAL", "PREFLIGHT_FAIL"]) {
      const r = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", driver], {
        cwd: temp, encoding: "utf8", windowsHide: true, timeout: 15_000,
        env: { ...process.env, D0066_PROMPT_CASE: scenario, D0066_PROMPT_NODE: process.execPath,
          D0066_PROMPT_CHILD: childScript, D0066_PROMPT_READY: ready, D0066_PROMPT_PRIMITIVE: join(SOURCE, "scripts/invoke-liteapi-profile-runner.ps1") },
      });
      started(r); assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, new RegExp("PROTECTED_SYNTHETIC_PROMPT_CASE=" + scenario + ";CALLS=" + (scenario === "ACCEPT" ? 2 : scenario === "WRONG_LITERAL" ? 1 : 0) + ";PASS"));
      assert.match(r.stdout, /CREDENTIAL_CLEARED_FROM_PROCESS=YES/);
      assert.doesNotMatch(r.stdout + r.stderr, /SYNTHETIC_NOT_A_REAL_KEY/);
      if (scenario === "ACCEPT") assert.match(r.stdout, /SYNTHETIC_PIPE_RECEIVED_WITHOUT_CREDENTIAL_OUTPUT/);
      else assert.doesNotMatch(r.stdout, /SYNTHETIC_PIPE_RECEIVED_WITHOUT_CREDENTIAL_OUTPUT/);
    }
    assert.equal(existsSync(join(temp, "never-created")), false);
  } finally { clean(temp); }
});
