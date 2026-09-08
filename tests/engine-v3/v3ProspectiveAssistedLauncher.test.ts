import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const LAUNCHER = join(ROOT, "scripts/invoke-prospective-assisted-evaluation-demo.ps1");
const WINDOWS_ONLY = process.platform === "win32" ? false
  : "requires actual Windows PowerShell 5.1 and CurrentUser DPAPI; mandatory Windows release job, never pwsh";
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
type Running = { process: ChildProcessWithoutNullStreams; origin: string; csrf: string; ended: Promise<{ code: number | null; stderr: string }> };
type CodeBinding = { path: string; sha256: string; branch: string };
type DisplayedCase = { caseId: string; revision: number; contentFingerprint: string };

function argumentsFor(mode: string, root: string, head: string, code: CodeBinding) {
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", LAUNCHER,
    "-Mode", mode, "-DataRoot", root, "-ExpectedHead", head, "-ExpectedBranch", code.branch,
    "-CodeInventoryPath", code.path, "-CodeInventorySha256", code.sha256];
}
function finiteCommand(mode: string, root: string, head: string, code: CodeBinding) {
  const result = spawnSync(PS51, argumentsFor(mode, root, head, code), {
    cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 300000, maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, "the real powershell.exe must start");
  assert.notEqual(result.status, null, "missing/terminated PowerShell cannot satisfy the test");
  assert.equal(typeof result.stdout, "string"); assert.equal(typeof result.stderr, "string");
  assert.equal(result.status, 0, `synthetic launcher failure: ${result.stderr}`);
  assert.equal(result.stderr, "");
  const lines = result.stdout.trim().split(/\r?\n/);
  assert.ok(lines.length > 0 && lines.at(-1)?.startsWith("{"));
  return JSON.parse(lines.at(-1)!);
}
async function localOnly(running: Pick<Running, "origin" | "csrf">, path: string, body?: unknown) {
  const address = new URL(path, running.origin);
  assert.equal(address.protocol, "http:"); assert.equal(address.hostname, "127.0.0.1");
  assert.equal(address.origin, running.origin); assert.equal(address.username, ""); assert.equal(address.password, "");
  assert.ok(address.pathname === "/" || address.pathname.startsWith("/api/"));
  return await new Promise<{ status: number; bytes: Buffer; headers: Record<string, unknown> }>((ok, bad) => {
    const bytes = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const call = request(address, { method: bytes ? "POST" : "GET", agent: false,
      headers: bytes ? { "Content-Type": "application/json", "Content-Length": bytes.length, Origin: address.origin,
        "X-Demo-CSRF": running.csrf } : {} }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.once("end", () => ok({ status: response.statusCode ?? 0, bytes: Buffer.concat(chunks), headers: response.headers }));
    });
    call.once("error", bad); call.setTimeout(30000, () => call.destroy(Error("SYNTHETIC_LOOPBACK_TIMEOUT")));
    call.end(bytes);
  });
}
async function state(running: Running) {
  const response = await localOnly(running, "/api/state");
  assert.equal(response.status, 200); return JSON.parse(response.bytes.toString("utf8"));
}
function displayedBinding(displayed: DisplayedCase) {
  assert.ok(Number.isSafeInteger(displayed.revision));
  assert.match(displayed.contentFingerprint, /^[a-f0-9]{64}$/);
  return { expectedRevision: displayed.revision, contentFingerprint: displayed.contentFingerprint };
}
async function action(running: Running, displayed: DisplayedCase, body: Record<string, unknown>) {
  assert.equal(body.caseId, displayed.caseId);
  // The caller supplies the state actually shown to this client. Never GET or
  // replace a stale binding inside the transport helper.
  const response = await localOnly(running, "/api/action", { ...body, ...displayedBinding(displayed) });
  assert.equal(response.status, 200, response.bytes.toString("utf8"));
  return JSON.parse(response.bytes.toString("utf8"));
}
async function start(root: string, head: string, code: CodeBinding): Promise<Running> {
  const child = spawn(PS51, argumentsFor("Start", root, head, code), { cwd: ROOT, windowsHide: true, stdio: "pipe" });
  let stderr = ""; child.stderr.on("data", chunk => { stderr += chunk.toString("utf8"); });
  const ended = new Promise<{ code: number | null; stderr: string }>(ok => child.once("close", code => ok({ code, stderr })));
  const origin = await new Promise<string>((ok, bad) => {
    let output = ""; let ready = false;
    const timer = setTimeout(() => { child.kill(); bad(Error("SYNTHETIC_LAUNCHER_READY_TIMEOUT")); }, 60000);
    child.once("error", () => { clearTimeout(timer); bad(Error("SYNTHETIC_POWERSHELL_NOT_STARTED")); });
    child.once("close", () => { clearTimeout(timer); if (!ready) bad(Error(`SYNTHETIC_LAUNCHER_EXITED_BEFORE_READY:${stderr}`)); });
    child.stdout.on("data", chunk => {
      output += chunk.toString("utf8");
      const lines = output.split(/\r?\n/); output = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim().startsWith("{")) continue;
        const value = JSON.parse(line);
        if (value.status !== "SYNTHETIC_DEMO_READY") continue;
        assert.equal(value.realDataAllowed, false); assert.equal(value.externalHttpRequests, 0);
        assert.match(value.url, /^http:\/\/127\.0\.0\.1:\d+$/);
        ready = true; clearTimeout(timer); ok(value.url);
      }
    });
  });
  const running = { process: child, origin, csrf: "", ended };
  const page = await localOnly(running, "/"); assert.equal(page.status, 200);
  const token = /<meta name="demo-csrf" content="([a-f0-9]+)">/.exec(page.bytes.toString("utf8"));
  assert.ok(token, "local UI exposes a session CSRF value, never an API key"); running.csrf = token[1];
  return running;
}
async function stop(running: Running) {
  const response = await localOnly(running, "/api/stop", {}); assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.bytes.toString("utf8")).status, "SAVED_SYNTHETIC_ONLY");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([running.ended, new Promise<never>((_ok, bad) => { timer = setTimeout(() => bad(Error("SYNTHETIC_STOP_TIMEOUT")), 10000); })]);
    assert.equal(result.code, 0); assert.equal(result.stderr, "");
  } finally { if (timer) clearTimeout(timer); }
}
function custodyInventory(root: string) {
  const files: { path: string; sha256: string; byteLength: number; lastWriteTimeMs: number }[] = [];
  function visit(path: string) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = join(path, entry.name); assert.equal(entry.isSymbolicLink(), false);
      if (entry.isDirectory()) visit(target);
      else { const stat = statSync(target); files.push({ path: relative(root, target), sha256: hash(readFileSync(target)), byteLength: stat.size, lastWriteTimeMs: stat.mtimeMs }); }
    }
  }
  for (const count of [5, 8]) visit(join(root, `SYNTHETIC_CASE_${count}`, "synthetic-dossier-custody"));
  return files;
}
function eventInventory(root: string, caseId: string) {
  const path = join(root, caseId, "events");
  if (!existsSync(path)) return { directoryExists: false, files: [] };
  return { directoryExists: true, files: readdirSync(path).sort().map(name => {
    const file = join(path, name), stat = lstatSync(file);
    assert.equal(stat.isFile(), true); assert.equal(stat.isSymbolicLink(), false);
    return { name, byteLength: stat.size, lastWriteTimeMs: stat.mtimeMs, sha256: hash(readFileSync(file)) };
  }) };
}
function cleanup(root: string) {
  const full = resolve(root), rel = relative(resolve(tmpdir()), full);
  assert.ok(rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
  assert.match(rel, /^StayOpti-Synthetic-Review-Launcher-Test-/); assert.equal(lstatSync(full).isSymbolicLink(), false);
  rmSync(full, { recursive: true, force: true });
}

function treeInventory(root: string): { path: string; sha256: string }[] {
  return readdirSync(root).sort().flatMap(name => {
    const full = join(root, name); const stat = lstatSync(full);
    assert.equal(stat.isSymbolicLink(), false);
    return stat.isDirectory() ? treeInventory(full).map(f => ({ ...f, path: `${name}/${f.path}` }))
      : [{ path: name, sha256: hash(readFileSync(full)) }];
  });
}
function sourceFingerprint() {
  const files = ["src", "scripts"].flatMap(dir => treeInventory(join(ROOT, dir)).map(f => ({ path: `${dir}/${f.path}`, sha256: f.sha256 })));
  for (const path of ["tsconfig.tests.json", "package.json", "package-lock.json"]) files.push({ path, sha256: hash(readFileSync(join(ROOT, path))) });
  return hash(Buffer.from(JSON.stringify(files)));
}
function reject(mode: string, root: string, head: string, code: CodeBinding, error: RegExp) {
  const before = treeInventory(root);
  const result = spawnSync(PS51, argumentsFor(mode, root, head, code), { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 30000 });
  assert.equal(result.error, undefined); assert.notEqual(result.status, null); assert.notEqual(result.status, 0);
  assert.equal(typeof result.stderr, "string"); assert.match(result.stderr, error);
  assert.deepEqual(treeInventory(root), before, "rejection cannot change progress, compiled bytes or locks");
}

test("real PS5.1 synthetic launcher: two-client stale API rejection, review/edit, diagnostic judgment and reopen", { skip: WINDOWS_ONLY, timeout: 420000 }, async () => {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(git.status, 0); const head = git.stdout.trim(); assert.match(head, /^[a-f0-9]{40}$/);
  const observedBranch = spawnSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.equal(observedBranch.status, 0);
  // Authorize a NEW synthetic fixture explicitly. Never rebind saved progress.
  const branch = observedBranch.stdout.trim() || "DETACHED";
  const root = mkdtempSync(join(tmpdir(), "StayOpti-Synthetic-Review-Launcher-Test-"));
  // Keep the code-binding input outside DataRoot: a new preparation must see
  // an empty root and must traverse both real launcher hash parameters.
  const inventoryRoot = mkdtempSync(join(tmpdir(), "StayOpti-Synthetic-Review-Launcher-Test-Inventory-"));
  const inventoryPath = join(inventoryRoot, "synthetic-code-inventory.json");
  const paths = ["scripts/run-prospective-assisted-evaluation-demo.mjs", "scripts/invoke-prospective-assisted-evaluation-demo.ps1"];
  const inventory = { version: "stayopti.synthetic.demo-code-inventory@2", expectedBranch: branch, expectedHead: head,
    sourceFingerprint: sourceFingerprint(), syntheticOnly: true, codeFiles: paths.map(path => ({ path, sha256: hash(readFileSync(join(ROOT, path))) })) };
  const inventoryBytes = Buffer.from(`${JSON.stringify(inventory)}\n`);
  writeFileSync(inventoryPath, inventoryBytes, { flag: "wx" });
  const code = { path: inventoryPath, sha256: hash(inventoryBytes), branch };
  let running: Running | undefined;
  try {
    reject("PrepareOnly", root, "0".repeat(40), code, /DEMO_REPOSITORY_CHECKPOINT_CHANGED/);
    reject("PrepareOnly", root, head, { ...code, branch: "wrong/unauthorized-checkpoint" }, /DEMO_REPOSITORY_CHECKPOINT_CHANGED/);
    reject("PrepareOnly", root, head, { ...code, branch: "" }, /DEMO_EXPLICIT_CHECKPOINT_REQUIRED/);
    const tampered = join(inventoryRoot, "tampered.json");
    writeFileSync(tampered, JSON.stringify({ ...inventory, expectedHead: "0".repeat(40) }));
    reject("PrepareOnly", root, head, { ...code, path: tampered, sha256: hash(readFileSync(tampered)) }, /DEMO_INVENTORY_CHECKPOINT_MISMATCH/);
    writeFileSync(tampered, JSON.stringify({ ...inventory, codeFiles: [{ path: paths[0], sha256: "0".repeat(64) }] }));
    reject("PrepareOnly", root, head, { ...code, path: tampered, sha256: hash(readFileSync(tampered)) }, /DEMO_EXECUTABLE_CHANGED/);
    writeFileSync(tampered, JSON.stringify({ ...inventory, sourceFingerprint: "0".repeat(64) }));
    reject("PrepareOnly", root, head, { ...code, path: tampered, sha256: hash(readFileSync(tampered)) }, /DEMO_EXECUTABLE_CHANGED/);
    const wrongHash = spawnSync(PS51, argumentsFor("PrepareOnly", root, head, { ...code, sha256: "0".repeat(64) }), {
      cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024,
    });
    assert.equal(wrongHash.error, undefined); assert.notEqual(wrongHash.status, null);
    assert.equal(typeof wrongHash.stdout, "string"); assert.equal(typeof wrongHash.stderr, "string");
    assert.notEqual(wrongHash.status, 0);
    assert.match(wrongHash.stderr, /DEMO_CODE_INVENTORY_CHANGED/);
    assert.doesNotMatch(wrongHash.stderr, /DEMO_ARGUMENT_INVALID|ENOENT/);
    assert.deepEqual(readdirSync(root), [], "incorrect code seal fails before even the synthetic custody preparation");
    const prepared = finiteCommand("PrepareOnly", root, head, code);
    assert.equal(prepared.status, "PASS_SYNTHETIC_ONLY"); assert.equal(prepared.cases, 2);
    assert.equal(prepared.externalHttpRequests, 0); assert.equal(prepared.realCustodyCertified, false);
    const before = custodyInventory(root);
    const configPath = join(root, "demo.json"), configBytes = readFileSync(configPath), config = JSON.parse(configBytes.toString());
    assert.deepEqual(config.checkpoint, { branch, head, inventorySha256: code.sha256 });
    writeFileSync(tampered, Buffer.concat([inventoryBytes, Buffer.from("\n")]));
    reject("Inspect", root, head, { ...code, path: tampered, sha256: hash(readFileSync(tampered)) }, /DEMO_CONFIG_CHANGED/);
    writeFileSync(configPath, JSON.stringify({ ...config, sourceFingerprint: "0".repeat(64) }));
    reject("Inspect", root, head, code, /DEMO_SOURCE_CHANGED_SINCE_PREPARATION/);
    writeFileSync(configPath, JSON.stringify({ ...config, version: "stayopti.synthetic.assisted-demo@1" }));
    reject("Inspect", root, head, code, /DEMO_CONFIG_CHANGED/);
    writeFileSync(configPath, configBytes);
    const compiledPath = join(config.compiled, config.compiledFiles[0].path), compiledBytes = readFileSync(compiledPath);
    writeFileSync(compiledPath, Buffer.concat([compiledBytes, Buffer.from("\n")]));
    reject("Inspect", root, head, code, /DEMO_COMPILED_BYTES_CHANGED/);
    writeFileSync(compiledPath, compiledBytes);
    running = await start(root, head, code);
    let current = await state(running);
    assert.equal(current.synthetic, true); assert.deepEqual(current.cases.map((item: any) => item.alternatives.length), [5, 8]);
    assert.ok(current.cases.every((item: any) => item.comparison === null), "no comparison is exposed before confirmed transcription review");
    let proofCount = 0;
    for (const item of current.cases) {
      const bridge = json(join(root, item.caseId, "d0037-bridge.json"));
      for (const alternative of item.alternatives) {
        assert.equal(alternative.proofs.length, 3);
        for (const proof of alternative.proofs) {
          const response = await localOnly(running, proof.url); assert.equal(response.status, 200);
          assert.equal(response.headers["content-type"], "image/svg+xml");
          const bound = bridge.custody.proofFiles.find((p: any) => p.proofRef === proof.ref);
          assert.ok(bound); assert.equal(hash(response.bytes), bound.sha256); proofCount += 1;
        }
      }
    }
    assert.equal(proofCount, 39);
    const id = "SYNTHETIC_CASE_5", first = current.cases[0].alternatives[0].id;
    const originalRating = current.cases[0].alternatives[0].fields.find((field: any) => field.key === "rating").value.value;
    const amendedRating = Number((originalRating - 0.1).toFixed(1));
    // Two independent clients have seen revision zero. B does not refresh after
    // A changes a value, just like a second browser tab kept open on old data.
    const clientA = current;
    const clientB = await state(running);
    assert.deepEqual(displayedBinding(clientA.cases[0]), displayedBinding(clientB.cases[0]));
    const beforeAnyEvent = eventInventory(root, id);
    writeFileSync(inventoryPath, Buffer.concat([inventoryBytes, Buffer.from("\n")]));
    const changedCodeAction = await localOnly(running, "/api/action", { type: "REVIEW_FIELD", caseId: id,
      alternativeId: first, fieldKey: "rating", reviewStatus: "CORRECT", ...displayedBinding(clientA.cases[0]) });
    assert.equal(changedCodeAction.status, 400);
    assert.equal(JSON.parse(changedCodeAction.bytes.toString()).error, "DEMO_CODE_INVENTORY_CHANGED");
    assert.deepEqual(eventInventory(root, id), beforeAnyEvent);
    writeFileSync(inventoryPath, inventoryBytes);
    const missingBinding = await localOnly(running, "/api/action", { type: "REVIEW_FIELD", caseId: id,
      alternativeId: first, fieldKey: "rating", reviewStatus: "CORRECT" });
    assert.equal(missingBinding.status, 400);
    assert.equal(JSON.parse(missingBinding.bytes.toString("utf8")).error, "DEMO_DISPLAYED_BINDING_REQUIRED");
    assert.deepEqual(eventInventory(root, id), beforeAnyEvent, "missing client binding cannot create even an events directory");
    current = await action(running, clientA.cases[0], { type: "CORRECT_FIELD", caseId: id, alternativeId: first, fieldKey: "rating", value: { status: "KNOWN", value: amendedRating } });
    assert.notEqual(current.cases[0].contentFingerprint, clientB.cases[0].contentFingerprint);
    const afterClientAEdit = eventInventory(root, id);
    assert.equal(afterClientAEdit.files.length, 1);
    const staleActions = [
      { type: "REVIEW_FIELD", alternativeId: first, fieldKey: "rating", reviewStatus: "CORRECT" },
      { type: "CONFIRM_REVIEW", confirmed: true },
      { type: "RECORD_JUDGMENT", judgment: { outcome: "SELECT", selectedAlternativeIds: [first], confidence: 3, reasonCode: "BETTER_CONTEXTUAL_FIT", blockingField: null } },
      { type: "CORRECT_FIELD", alternativeId: first, fieldKey: "rating", value: { status: "KNOWN", value: originalRating } },
      { type: "RECORD_EXPOSURE", exposure: { knownData: true, recognizesCase: true, knowsEngineAdvice: false } },
    ];
    for (const body of staleActions) {
      const response = await localOnly(running, "/api/action", { ...body, caseId: id, ...displayedBinding(clientB.cases[0]) });
      assert.equal(response.status, 409, `client B ${body.type} must fail at the displayed-version boundary`);
      assert.equal(JSON.parse(response.bytes.toString("utf8")).error, "DEMO_DISPLAYED_VERSION_STALE");
      assert.deepEqual(eventInventory(root, id), afterClientAEdit, `stale ${body.type} cannot create, rewrite or append any event`);
    }
    for (const binding of [
      { expectedRevision: current.cases[0].revision, contentFingerprint: clientB.cases[0].contentFingerprint },
      { expectedRevision: current.cases[0].revision, contentFingerprint: "0".repeat(64) },
    ]) {
      const response = await localOnly(running, "/api/action", { type: "CONFIRM_REVIEW", caseId: id, confirmed: true, ...binding });
      assert.equal(response.status, 409);
      assert.equal(JSON.parse(response.bytes.toString("utf8")).error, "DEMO_DISPLAYED_VERSION_STALE");
      assert.deepEqual(eventInventory(root, id), afterClientAEdit, "current revision alone cannot rebind an old or forged content hash");
    }
    for (const alternative of current.cases[0].alternatives) for (const field of alternative.fields) {
      current = await action(running, current.cases[0], { type: "REVIEW_FIELD", caseId: id, alternativeId: alternative.id, fieldKey: field.key,
        reviewStatus: field.value.status === "UNKNOWN" ? "UNVERIFIABLE" : "CORRECT" });
    }
    // Content is unchanged by reviews, but an old revision must still fail:
    // another client may have reviewed or declared knowledge in the meantime.
    const beforeRejectedConfirm = eventInventory(root, id);
    const staleRevisionOnly = await localOnly(running, "/api/action", { type: "CONFIRM_REVIEW", caseId: id, confirmed: true,
      expectedRevision: current.cases[0].revision - 1, contentFingerprint: current.cases[0].contentFingerprint });
    assert.equal(staleRevisionOnly.status, 409);
    assert.equal(JSON.parse(staleRevisionOnly.bytes.toString("utf8")).error, "DEMO_DISPLAYED_VERSION_STALE");
    assert.equal((await state(running)).cases[0].reviewConfirmed, false);
    assert.deepEqual(eventInventory(root, id), beforeRejectedConfirm);
    current = await action(running, current.cases[0], { type: "CONFIRM_REVIEW", caseId: id, confirmed: true });
    assert.equal(current.cases[0].reviewConfirmed, true); assert.equal(current.cases[1].reviewConfirmed, false);
    const comparison = current.cases[0].comparison;
    assert.ok(comparison); assert.equal(current.cases[1].comparison, null);
    assert.equal(comparison.classification, "DIAGNOSTIC_ONLY"); assert.equal(comparison.synthetic, true);
    assert.equal(comparison.decisionOutputShown, false); assert.equal(comparison.exactBookable, false);
    assert.equal(comparison.verifiedCheckoutTotal, false); assert.equal(comparison.alternatives.length, 5);
    assert.deepEqual(comparison.alternatives.map((alternative: any) => alternative.label), ["ALT_A", "ALT_B", "ALT_C", "ALT_D", "ALT_E"]);
    const originalIds = current.cases[0].alternatives.map((alternative: any) => alternative.id);
    const comparativeIds = comparison.alternatives.map((alternative: any) => alternative.selectionId);
    assert.deepEqual([...comparativeIds].sort(), [...originalIds].sort());
    assert.notDeepEqual(comparativeIds, originalIds, "this controlled fixture's semantic presentation does not expose the original order");
    for (const alternative of comparison.alternatives) for (const field of Object.values(alternative.fields) as any[]) {
      assert.ok(["COMPARABLE_ACROSS_SET", "UNKNOWN_NOT_NEGATIVE_EVIDENCE", "AUDIT_ONLY_NOT_COMPARABLE"].includes(field.comparativeEligibility));
      assert.equal(Object.hasOwn(field, "evidenceRefs"), false);
      if (field.status === "UNKNOWN") assert.equal(field.comparativeEligibility, "UNKNOWN_NOT_NEGATIVE_EVIDENCE");
    }
    current = await action(running, current.cases[0], { type: "RECORD_EXPOSURE", caseId: id, exposure: { knownData: true, recognizesCase: true, knowsEngineAdvice: false } });
    const displayedDecision = current.cases[0];
    current = await action(running, displayedDecision, { type: "RECORD_JUDGMENT", caseId: id, judgment: { outcome: "SELECT", selectedAlternativeIds: [first], confidence: 3, reasonCode: "BETTER_CONTEXTUAL_FIT", blockingField: null } });
    assert.equal(current.cases[0].judgments.length, 1);
    assert.equal(current.cases[0].judgments[0].judgment.contentFingerprint, displayedDecision.contentFingerprint,
      "the saved judgment remains bound to the exact content displayed and submitted by the client");
    const lastEvent = json(join(root, id, "events", `${String(current.cases[0].revision).padStart(6, "0")}.json`));
    assert.equal(lastEvent.event.expectedRevision, displayedDecision.revision);
    assert.equal(lastEvent.event.judgment.contentFingerprint, displayedDecision.contentFingerprint);
    assert.equal(current.cases[0].judgments[0].qualification, "SYNTHETIC_EXPOSED_DIAGNOSTIC");
    const judgmentId = current.cases[0].judgments[0].judgment.judgmentId;
    current = await action(running, current.cases[0], { type: "CORRECT_FIELD", caseId: id, alternativeId: first, fieldKey: "rating", value: { status: "KNOWN", value: originalRating } });
    assert.equal(current.cases[0].reviewConfirmed, false); assert.equal(current.cases[0].currentJudgmentValid, false);
    assert.equal(current.cases[0].comparison, null, "a correction requires new review before comparison is shown again");
    assert.deepEqual(current.cases[0].invalidatedJudgmentIds, [judgmentId]);
    const revision = current.cases[0].revision;
    // Both requests deliberately carry the same displayed revision. Regardless
    // of transport arrival order, only one may append; the other must reload
    // the committed state and fail before another event can be written.
    const eightId = "SYNTHETIC_CASE_8", displayedEight = current.cases[1];
    const firstEight = displayedEight.alternatives[0].id;
    const beforeConcurrent = eventInventory(root, eightId);
    assert.equal(beforeConcurrent.files.length, 0);
    const simultaneous = await Promise.all(["rating", "reviewCount"].map(fieldKey => localOnly(running!, "/api/action", {
      type: "REVIEW_FIELD", caseId: eightId, alternativeId: firstEight, fieldKey, reviewStatus: "CORRECT",
      ...displayedBinding(displayedEight),
    })));
    assert.deepEqual(simultaneous.map(response => response.status).sort(), [200, 409]);
    const rejectedConcurrent = simultaneous.find(response => response.status === 409)!;
    assert.equal(JSON.parse(rejectedConcurrent.bytes.toString("utf8")).error, "DEMO_DISPLAYED_VERSION_STALE");
    current = await state(running);
    assert.equal(current.cases[1].revision, displayedEight.revision + 1);
    assert.equal(current.cases[1].contentFingerprint, displayedEight.contentFingerprint);
    assert.equal(eventInventory(root, eightId).files.length, beforeConcurrent.files.length + 1);
    const reviewedEightFields = current.cases[1].alternatives[0].fields.filter((field: any) => field.reviewStatus !== "PENDING");
    assert.equal(reviewedEightFields.length, 1, "the losing request cannot approve a second field indirectly");
    const displayedKnown = current.cases[1];
    const knownRating = displayedKnown.alternatives[0].fields.find((field: any) => field.key === "rating");
    assert.equal(knownRating.value.status, "KNOWN");
    const beforeCompound = eventInventory(root, eightId);
    current = await action(running, displayedKnown, { type: "REVIEW_FIELD", caseId: eightId,
      alternativeId: firstEight, fieldKey: "rating", reviewStatus: "UNVERIFIABLE" });
    const unknownRating = current.cases[1].alternatives[0].fields.find((field: any) => field.key === "rating");
    assert.equal(unknownRating.value.status, "UNKNOWN"); assert.equal(unknownRating.value.value, null);
    assert.equal(unknownRating.reviewStatus, "UNVERIFIABLE");
    assert.equal(current.cases[1].revision, displayedKnown.revision + 2);
    assert.notEqual(current.cases[1].contentFingerprint, displayedKnown.contentFingerprint);
    assert.equal(current.cases[1].eligibility.eligible, false, "unknown critical data cannot remain eligible");
    assert.equal(current.cases[1].comparison, null); assert.equal(current.cases[1].reviewConfirmed, false);
    assert.equal(current.cases[1].judgments.length, 0);
    const afterCompound = eventInventory(root, eightId);
    assert.equal(afterCompound.files.length, beforeCompound.files.length + 2);
    const compoundEvents = afterCompound.files.slice(-2).map(file => json(join(root, eightId, "events", file.name)).event);
    assert.deepEqual(compoundEvents.map(event => event.type), ["CORRECT_FIELD", "REVIEW_FIELD"]);
    assert.deepEqual(compoundEvents.map(event => event.expectedRevision), [displayedKnown.revision, displayedKnown.revision + 1]);
    assert.equal(compoundEvents[0].value.unknownReason, "REVIEWER_COULD_NOT_VERIFY");
    assert.equal(compoundEvents[1].status, "NOT_VERIFIABLE");
    const repeatedOldCompound = await localOnly(running, "/api/action", { type: "REVIEW_FIELD", caseId: eightId,
      alternativeId: firstEight, fieldKey: "rating", reviewStatus: "UNVERIFIABLE", ...displayedBinding(displayedKnown) });
    assert.equal(repeatedOldCompound.status, 409);
    assert.equal(JSON.parse(repeatedOldCompound.bytes.toString("utf8")).error, "DEMO_DISPLAYED_VERSION_STALE");
    assert.deepEqual(eventInventory(root, eightId), afterCompound, "the compound operation cannot rebind a duplicate old client action");
    const eightRevision = current.cases[1].revision;
    await stop(running); running = undefined;
    assert.equal(existsSync(join(root, "active-process.json")), false);
    assert.deepEqual(custodyInventory(root), before, "interactive corrections are separate events, never rewritten D0037 custody");
    running = await start(root, head, code); current = await state(running);
    assert.equal(current.cases[0].revision, revision); assert.equal(current.cases[0].judgments.length, 1);
    assert.deepEqual(current.cases[0].invalidatedJudgmentIds, [judgmentId]);
    assert.equal(current.cases[0].alternatives[0].fields.find((field: any) => field.key === "rating").value.value, originalRating);
    assert.equal(current.cases[0].reviewConfirmed, false); assert.equal(current.cases[1].revision, eightRevision);
    assert.equal(current.cases[1].alternatives[0].fields.find((field: any) => field.key === "rating").value.status, "UNKNOWN");
    assert.equal(current.cases[1].eligibility.eligible, false); assert.equal(current.cases[1].comparison, null);
    await stop(running); running = undefined;
    assert.equal(finiteCommand("Inspect", root, head, code).status, "PASS_SYNTHETIC_ONLY");
    assert.equal(hash(readFileSync(inventoryPath)), code.sha256);
    assert.deepEqual(custodyInventory(root), before);
  } finally {
    if (running) {
      try { await stop(running); } catch {
        // Terminate only the process tree created by this test, never an
        // arbitrary PID read from a session or a user's interactive terminal.
        if (running.process.pid && running.process.exitCode === null)
          spawnSync("taskkill.exe", ["/PID", String(running.process.pid), "/T", "/F"], { windowsHide: true });
      }
    }
    cleanup(root);
    cleanup(inventoryRoot);
  }
});

test("PS5.1 rejects actual staged changes in a separate synthetic repository before progress creation", { skip: WINDOWS_ONLY }, () => {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-Synthetic-Review-Launcher-Test-Staged-"));
  try {
    const repo = join(root, "repo"), data = join(root, "progress"); mkdirSync(repo); mkdirSync(data);
    cpSync(join(ROOT, "scripts"), join(repo, "scripts"), { recursive: true });
    writeFileSync(join(repo, "package.json"), '{"type":"module"}');
    const runGit = (args: string[]) => { const r = spawnSync("git", args, { cwd: repo, encoding: "utf8", windowsHide: true }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
    runGit(["init", "-b", "synthetic/checkpoint"]);
    runGit(["-c", "user.name=Synthetic", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "Synthetic checkpoint"]);
    runGit(["add", "package.json"]);
    const args = argumentsFor("PrepareOnly", data, runGit(["rev-parse", "HEAD"]), { branch: "synthetic/checkpoint", path: join(root, "not-read.json"), sha256: "0".repeat(64) });
    args[args.indexOf(LAUNCHER)] = join(repo, "scripts/invoke-prospective-assisted-evaluation-demo.ps1");
    const result = spawnSync(PS51, args, { cwd: repo, encoding: "utf8", windowsHide: true, timeout: 30000 });
    assert.equal(result.error, undefined); assert.notEqual(result.status, null); assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DEMO_REPOSITORY_CHECKPOINT_CHANGED/); assert.deepEqual(readdirSync(data), []);
    assert.equal(runGit(["diff", "--cached", "--name-only"]), "package.json");
  } finally { cleanup(root); }
});
