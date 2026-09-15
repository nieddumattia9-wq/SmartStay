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
  assert.match(basename(target), /^StayOpti-D0064-Launcher-/);
  rmSync(target, { recursive: true, force: true });
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function fixture(count = 5, options: { autoCrlf?: boolean; mutatePlan?: (config:any)=>void } = {}) {
  const temp = mkdtempSync(join(tmpdir(), "StayOpti-D0064-Launcher-"));
  try {
    const repo = join(temp, "candidate"); mkdirSync(repo);
    const plan = await moduleAt(SOURCE, "scripts/liteapi-search-coverage-plan-v1.mjs");
    const paths: string[] = plan.coverageCodePaths(SOURCE);
    for (const p of paths) { mkdirSync(dirname(join(repo, p)), { recursive: true }); copyFileSync(join(SOURCE, p), join(repo, p)); }
    if (options.autoCrlf) {
      const p = join(repo, "scripts/liteapi-search-coverage-plan-v1.mjs");
      writeFileSync(p, readFileSync(p, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
    }
    git(repo, ["init", "--initial-branch", BRANCH]);
    git(repo, ["config", "user.name", "Synthetic launcher validation"]);
    git(repo, ["config", "user.email", "validation@example.invalid"]);
    git(repo, ["config", "core.autocrlf", options.autoCrlf ? "true" : "false"]);
    git(repo, ["add", "--", ...paths]); git(repo, ["commit", "-m", "Synthetic D0064 launcher closure"]);
    assert.equal(git(repo, ["status", "--porcelain=v1", "-uall"]), "");
    const head = git(repo, ["rev-parse", "HEAD"]);
    const build = await moduleAt(SOURCE, "tests/engine-v3/fixtures/liteApiCoverageSyntheticV1.mjs");
    const registry = join(temp, "synthetic-registry");
    const data = build.coverageFixture({ count, directory: registry, mutatePlan:options.mutatePlan });
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
    join(f.repo, "scripts/invoke-liteapi-search-coverage.ps1"), "-Mode", mode,
    ...Object.entries(values).flatMap(([k, v]) => ["-" + k, v])];
}
function invoke(f: Fixture, mode: string, override: Record<string, string> = {}, timeout = 60_000) {
  const r = spawnSync(PS51, args(f, mode, override), { cwd: f.repo, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 3 * 1024 * 1024 });
  started(r); return r;
}
function replaceSimulation(f: Fixture, mutate: (simulation: any) => void) {
  mutate(f.data.simulation); f.simulationSha = writeJson(f.simulationFile, f.data.simulation);
}
function journalArgs(f: Fixture) {
  const root = join(f.registry, "cases", f.data.config.caseId);
  const header = JSON.parse(readFileSync(join(root, "header.json"), "utf8"));
  assert.equal(header.binding.mode, "SYNTHETIC_ONLY");
  return { root, registryRoot: f.registry, repositoryRoot: f.repo, ...header.binding };
}
async function verify(f: Fixture) {
  const journal = await moduleAt(f.repo, "scripts/liteapi-search-coverage-journal-v1.mjs");
  return { journal, input: journalArgs(f), state: journal.verifyCoverageJournal(journalArgs(f)) };
}


test("CWL01 actual PS5.1 Inventory + full loopback + CurrentUser DPAPI, seal and byte-identical reopen", {skip:WIN51}, async()=>{
 const f=await fixture(3);try{
 const r=resultJson(invoke(f,"Simulate"));assert.equal(r.status,"COMPLETE",r.failureClass);assert.equal(r.actualAttempts,3);assert.equal(r.localHttpRequests,3);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(r.prebookCreationsAttempted,0);
 const {journal,input,state}=await verify(f);assert.equal(state.keyProtection,"WINDOWS_CURRENT_USER_DPAPI");assert.equal(state.eventCount,9);assert.equal(state.counts.CATALOG,1);assert.equal(state.counts.CITY_RATES,1);assert.equal(state.counts.ID_RATES,1);
 assert.equal(readdirSync(join(input.root,"encrypted")).length,7);
 const before=treeFiles(f.registry),m=await moduleAt(f.repo,"scripts/liteapi-search-coverage-capture-v1.mjs"),read=m.readCoverageOriginals(input);
 assert.deepEqual(read.selection,f.data.selection);assert.equal(read.records.length,3);assert.deepEqual(treeFiles(f.registry),before);
 for(const file of readdirSync(join(input.root,"encrypted"))){const bytes=readFileSync(join(input.root,"encrypted",file));assert.doesNotMatch(bytes.toString(),/SYNTHETIC_OPAQUE_|INVENTED_OFFER_/);}
 const seal=journal.decryptCoverageOriginal({...input,ordinal:0,direction:"selection"});assert.equal(sha(seal),state.selection.original.rawSha256);seal.fill(0);
 rejected(invoke(f,"Simulate"),/CASE_ALREADY_PRESENT/);assert.deepEqual(treeFiles(f.registry),before);
 }finally{clean(f.temp);}
});
test("CWL02 wrong checkpoint, altered config/inventory/code and staging reject before any progress", {skip:WIN51}, async()=>{
 const f=await fixture();try{
 rejected(invoke(f,"Simulate",{ExpectedHead:"0".repeat(40)}),/CHECKPOINT_MISMATCH/);
 rejected(invoke(f,"Simulate",{ExpectedBranch:"main"}),/CHECKPOINT_MISMATCH/);
 rejected(invoke(f,"Simulate",{ConfigSha256:"0".repeat(64)}),/INPUT_FILE_HASH/);
 rejected(invoke(f,"Simulate",{InventorySha256:"0".repeat(64)}),/INPUT_FILE_HASH/);
 const originalConfig=readFileSync(f.configFile),savedSha=f.configSha;
 const altered=JSON.parse(originalConfig.toString());altered.controls.limits.total=17;f.configSha=writeJson(f.configFile,altered);
 rejected(invoke(f,"Simulate"),/FROZEN_PLAN_CHANGED/);writeFileSync(f.configFile,originalConfig);f.configSha=savedSha;
 const inv=JSON.parse(readFileSync(f.inventoryFile,"utf8")),originalInv=readFileSync(f.inventoryFile),oldSha=f.inventorySha;inv.code.pop();f.inventorySha=writeJson(f.inventoryFile,inv);
 rejected(invoke(f,"Simulate"),/CODE_INVENTORY_INCOMPLETE/);writeFileSync(f.inventoryFile,originalInv);f.inventorySha=oldSha;
 const file=join(f.repo,"scripts/liteapi-search-coverage-plan-v1.mjs"),bytes=readFileSync(file);writeFileSync(file,Buffer.concat([bytes,Buffer.from("\n// synthetic altered code\n")]));
 rejected(invoke(f,"Simulate"),/CODE_OR_PRESERVED_BYTES_CHANGED/);writeFileSync(file,bytes);
 writeFileSync(join(f.repo,"synthetic-staged.txt"),"SYNTHETIC_ONLY");git(f.repo,["add","--","synthetic-staged.txt"]);
 rejected(invoke(f,"Simulate"),/STAGING_NOT_EMPTY/);assert.equal(existsSync(f.registry),false);
 }finally{clean(f.temp);}
});
test("CWL03 actual launcher respects sealed20s timeout, consumes and never restarts", {skip:WIN51}, async()=>{
 const f=await fixture();try{replaceSimulation(f,s=>{s.responses[0].timeout=true;});
 const r=resultJson(invoke(f,"Simulate",{},40000));assert.equal(r.status,"ABORTED");assert.equal(r.actualAttempts,1);assert.equal(r.failureClass,"TIMEOUT");assert.equal(r.localHttpRequests,1);assert.equal(r.providerHttpRequests,0);
 const {state}=await verify(f);assert.equal(state.requests[0].errorClass,"TIMEOUT");assert.equal(state.restartAllowed,false);const before=treeFiles(f.registry);
 rejected(invoke(f,"Simulate"),/CASE_ALREADY_PRESENT/);assert.deepEqual(treeFiles(f.registry),before);
 }finally{clean(f.temp);}
});
test("CWL04 true concurrent Windows launcher cannot start a second request stream", {skip:WIN51}, async()=>{
 const f=await fixture();replaceSimulation(f,s=>{s.responses[1].timeout=true;});
 const child=spawn(PS51,args(f,"Simulate"),{cwd:f.repo,windowsHide:true,stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="";child.stdout!.on("data",b=>stdout+=b);child.stderr!.on("data",b=>stderr+=b);
 const done=new Promise<number|null>((r,j)=>{child.once("error",j);child.once("close",r);});
 try{const deadline=Date.now()+15000,event=join(f.registry,"cases",f.data.config.caseId,"events","000002.json");
 while(!existsSync(event)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));assert.ok(existsSync(event));
 rejected(invoke(f,"Simulate"),/CASE_ALREADY_PRESENT|CASE_ALREADY_CONSUMED/);assert.equal(await done,0,stdout+stderr);
 const {state}=await verify(f);assert.equal(state.attemptsReserved,2);assert.equal(state.status,"ABORTED");
 }finally{await done;clean(f.temp);}
});
test("CWL05 stopping only the verified synthetic Node child leaves a non-resumable reserved attempt", { skip: WIN51 }, async () => {
  const f = await fixture(1);
  replaceSimulation(f, s => { s.responses[0].timeout = true; });
  const child = spawn(PS51, args(f, "Simulate"), { cwd: f.repo, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = ""; child.stdout!.on("data", b => { stdout += b; }); child.stderr!.on("data", b => { stderr += b; });
  const done = new Promise<number | null>((resolveDone, rejectDone) => { child.once("error", rejectDone); child.once("close", resolveDone); });
  const childPid = child.pid; assert.ok(childPid, "actual PowerShell PID required");
  const findAndStop = (stop: boolean) => {
    const command = "$ErrorActionPreference='Stop'; $matches=@(Get-CimInstance Win32_Process -Filter ('ParentProcessId='+$env:D0064_TEST_PARENT_PID) | Where-Object { $_.Name -ieq 'node.exe' -and $_.CommandLine.Contains($env:D0064_TEST_SCRIPT) }); if ($matches.Count -gt 1) { throw 'AMBIGUOUS_SYNTHETIC_CHILD' }; " +
      (stop ? "if ($matches.Count -ne 1) { throw 'SYNTHETIC_CHILD_NOT_FOUND' }; Stop-Process -Id $matches[0].ProcessId -Force -ErrorAction Stop; Write-Output 'VERIFIED_SYNTHETIC_CHILD_STOPPED'" : "Write-Output ('REMAINING_SYNTHETIC_CHILDREN='+$matches.Count)");
    const r = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
      encoding: "utf8", windowsHide: true, timeout: 10_000,
      env: { ...process.env, D0064_TEST_PARENT_PID: String(childPid), D0064_TEST_SCRIPT: join(f.repo, "scripts/run-liteapi-search-coverage.mjs") },
    });
    started(r); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout;
  };
  try {
    const deadline = Date.now() + 12_000, event = join(f.registry, "cases", f.data.config.caseId, "events", "000002.json");
    while (!existsSync(event) && Date.now() < deadline) await new Promise(r => setTimeout(r, 40));
    assert.ok(existsSync(event), "the killed process must have persisted RESERVE before HTTP");
    assert.match(findAndStop(true), /VERIFIED_SYNTHETIC_CHILD_STOPPED/);
    assert.equal(await done, 1, stdout + stderr);
    assert.match(stdout + stderr, /LITEAPI_COVERAGE_RUNNER_FAILED/);
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


test("CWL06 actual shipped approval/secure prompt block in Windows PS5.1, synthetic responses only", {skip:WIN51},()=>{
 const temp=mkdtempSync(join(tmpdir(),"StayOpti-D0064-Launcher-Prompt-"));
 try{
 const text=readFileSync(join(SOURCE,"scripts/invoke-liteapi-search-coverage.ps1"),"utf8"),start=text.indexOf("  Write-Host 'MAX3:"),end=text.indexOf('  $AcquisitionArgs+=',start);
 assert(start>=0&&end>start);const actual=text.slice(start,end);
 const script=join(temp,"prompt.ps1");
 writeFileSync(script,`$ErrorActionPreference='Stop'
$PreflightResult=[pscustomobject]@{expectedAuthorization='SYNTHETIC_LITERAL_ONLY'}
$script:Calls=@()
function Read-Host { param([string]$Prompt,[switch]$AsSecureString)
 $script:Calls+=@{prompt=$Prompt;secure=[bool]$AsSecureString}
 if($AsSecureString){$SyntheticSecure=New-Object Security.SecureString; foreach($SyntheticChar in 'SYNTHETIC_NOT_A_REAL_KEY'.ToCharArray()){$SyntheticSecure.AppendChar($SyntheticChar)}; return $SyntheticSecure}
 return 'SYNTHETIC_LITERAL_ONLY'
}
${actual}
if($Calls.Count -ne 2 -or $Calls[0].secure -or -not $Calls[1].secure -or $AcquisitionAuthorization -cne 'SYNTHETIC_LITERAL_ONLY' -or $AcquisitionSecure -isnot [Security.SecureString]){throw 'PROMPT_FLOW_FAILED'}
$AcquisitionSecure.Dispose();$AcquisitionSecure=$null;$AcquisitionAuthorization=$null
Write-Output 'SYNTHETIC_LITERAL_THEN_SECURESTRING=PASS'
`);
 const r=spawnSync(PS51,["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",script],{encoding:"utf8",windowsHide:true,timeout:15000});started(r);assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/SYNTHETIC_LITERAL_THEN_SECURESTRING=PASS/);assert.doesNotMatch(r.stdout+r.stderr,/SYNTHETIC_NOT_A_REAL_KEY/);
 // Wrong literal in the exact block must not reach the protected key prompt.
 const rejectedScript=readFileSync(script,"utf8").replace("return 'SYNTHETIC_LITERAL_ONLY'","return 'WRONG_LITERAL'");writeFileSync(script,rejectedScript);
 const bad=spawnSync(PS51,["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",script],{encoding:"utf8",windowsHide:true,timeout:15000});started(bad);assert.equal(bad.status,1);assert.match(bad.stderr,/AUTHORIZATION_NOT_ACCEPTED/);
 }finally{clean(temp);}
});
test("CWL07 zero/one catalog and204 through true launcher never enter MAX17 or engine", {skip:WIN51},async()=>{
 for(const count of [0,1]){const f=await fixture(count);try{replaceSimulation(f,s=>{s.responses[1].status=204;});
 const r=resultJson(invoke(f,"Simulate"));assert.equal(r.status,"COMPLETE");assert.equal(r.actualAttempts,count?3:2);assert.equal(r.catalog.selectedCount,count);assert.equal(r.arms.CITY_RATES.status,"NO_CONTENT");assert.equal(r.engineInvocations,0);assert.equal(r.prebookCreationsAttempted,0);
 }finally{clean(f.temp);}}
});
test("CWL08 same actual launcher executes a separately sealed invented plan without Bologna defaults", {skip:WIN51},async()=>{
 const f=await fixture(3,{mutatePlan:c=>{c.caseId='D0064_INVENTED_PLAN_B';Object.assign(c.scenario,{destination:'Invented Town B',countryCode:'FR',guestNationality:'DE',currency:'USD',checkin:'2099-11-11',checkout:'2099-11-13',nights:2,adults:1,childAges:[9],budget:950});Object.assign(c.controls,{seed:'INVENTED_PLAN_B_SEED',catalogLimit:4,maximumSelectedIds:2,ratesLimit:2,maxRatesPerHotel:1});}});
 try{const r=resultJson(invoke(f,'Simulate'));assert.equal(r.status,'COMPLETE',r.failureClass);assert.equal(r.actualAttempts,3);assert.equal(r.catalog.selectedCount,2);
 const {input}=await verify(f),m=await moduleAt(f.repo,'scripts/liteapi-search-coverage-capture-v1.mjs'),original=m.readCoverageOriginals(input);
 const q=original.records.map((x:any)=>x.request);assert.equal(q[0].query.cityName,'Invented Town B');assert.equal(q[0].query.limit,4);
 for(const x of q.slice(1)){assert.deepEqual(x.body.occupancies,[{adults:1,children:[9]}]);assert.equal(x.body.currency,'USD');assert.equal(x.body.guestNationality,'DE');assert.equal(x.body.timeout,12);assert.equal(x.body.limit,2);assert.equal(x.body.maxRatesPerHotel,1);}
 assert.deepEqual(q[2].body.hotelIds,original.selection.selectedIds);assert.equal(r.policyInvocations,0);
 const before=treeFiles(f.registry);rejected(invoke(f,'Simulate'),/CASE_ALREADY_PRESENT/);assert.deepEqual(treeFiles(f.registry),before);
 }finally{clean(f.temp);}
});
