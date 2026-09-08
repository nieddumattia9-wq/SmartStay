import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3,
  type StayOptiBrowserAssistedDossierDescriptorV3,
} from "../../src/engine-v3/evaluation/browserAssistedDossierIntakeV3";

const ROOT = process.cwd();
const LAUNCHER = resolve(ROOT, "scripts/invoke-browser-assisted-dossier-handoff.ps1");
const RUNNER = resolve(ROOT, "scripts/run-browser-assisted-dossier-handoff.mjs");
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_POWERSHELL_51_REQUIRED = process.platform === "win32" ? false
  : "requires real Windows PowerShell 5.1 and CurrentUser DPAPI; enforced by the required windows-latest release job";

function sha256(value: string | Uint8Array) { return createHash("sha256").update(value).digest("hex"); }
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)]));
  return value;
}
function fingerprint(value: unknown) { return sha256(JSON.stringify(canonical(value))); }
function writeJson(path: string, value: unknown) { const bytes = `${JSON.stringify(value, null, 2)}\n`; writeFileSync(path, bytes); return sha256(bytes); }
function assertStarted(result: SpawnSyncReturns<string>) {
  assert.equal(result.error, undefined, "Windows PowerShell 5.1 must actually start");
  assert.notEqual(result.status, null, "PowerShell status=null is not proof");
  assert.equal(typeof result.stdout, "string", "stdout must exist");
  assert.equal(typeof result.stderr, "string", "stderr must exist");
}
function command(mode: string, parameters: Record<string, string | undefined>, synthetic = true) {
  const args = ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", LAUNCHER, "-Mode", mode];
  for (const [key, value] of Object.entries(parameters)) if (value !== undefined) args.push(`-${key}`, value);
  if (synthetic) args.push("-SyntheticFixture");
  const result = spawnSync(PS51, args, { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 240_000, maxBuffer: 4 * 1024 * 1024 });
  assertStarted(result);
  return result;
}
function success(result: SpawnSyncReturns<string>) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.ok(result.stdout.trim().length > 0, "successful handoff must produce structured proof");
  return JSON.parse(result.stdout);
}
function rejected(result: SpawnSyncReturns<string>, expected: RegExp = /DOSSIER_[A-Z0-9_]+/) {
  assert.equal(result.status, 1, `expected controlled failure, got ${result.status}: ${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, expected);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-Synthetic-Dossier-Handoff-"));
  try {
  const source = join(root, "source");
  const privateRoot = join(root, "private");
  mkdirSync(source); mkdirSync(privateRoot);
  const files = new Map<string, Buffer>();
  const prefix = "SYNTHETIC_PACKAGE/";
  files.set(`${prefix}capture-log.json`, Buffer.from('{"kind":"SYNTHETIC_CAPTURE_LOG_ONLY"}'));
  files.set(`${prefix}provenance.md`, Buffer.from("Synthetic fixture. Capture not retroactively certified.\n"));
  const artifacts: StayOptiBrowserAssistedDossierDescriptorV3["artifacts"][number][] = [
    { evidenceRef: "SYNTHETIC_CAPTURE_LOG", archiveEntryPath: `${prefix}capture-log.json`, kind: "CAPTURE_LOG", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null },
    { evidenceRef: "SYNTHETIC_PROVENANCE", archiveEntryPath: `${prefix}provenance.md`, kind: "PROVENANCE_DOCUMENT", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null },
  ];
  const screenshotRefs: string[] = [];
  for (let ordinal = 1; ordinal <= 15; ordinal += 1) {
    const evidenceRef = `SYNTHETIC_SCREEN_${String(ordinal).padStart(2, "0")}`;
    const archiveEntryPath = `${prefix}screenshots/capture-${ordinal}.png`;
    // Deliberately JPEG-signature bytes under .png, proving no format conversion.
    const bytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`SYNTHETIC_JPEG_BYTES_${ordinal}`), Buffer.from([0xff, 0xd9])]);
    files.set(archiveEntryPath, bytes);
    screenshotRefs.push(evidenceRef);
    artifacts.push({ evidenceRef, archiveEntryPath, kind: "SCREENSHOT", expectedSha256: sha256(bytes), alternativeRef: "SYNTHETIC_ALT_01", declaredCapturedAt: `2026-01-01T10:${String(ordinal).padStart(2, "0")}:00.000Z`, captureTimeSourceRef: "SYNTHETIC_CAPTURE_LOG" });
  }
  const checksumArtifactPath = `${prefix}checksums.sha256`;
  files.set(checksumArtifactPath, Buffer.from(`${[...files.entries()].map(([path, bytes]) => `${sha256(bytes)}  ${path.slice(prefix.length)}`).join("\n")}\n`));
  artifacts.push({ evidenceRef: "SYNTHETIC_CHECKSUMS", archiveEntryPath: checksumArtifactPath, kind: "CHECKSUM_MANIFEST", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null });
  for (const artifact of artifacts) artifact.expectedSha256 = sha256(files.get(artifact.archiveEntryPath)!);
  for (const [path, bytes] of files) { const target = join(source, ...path.split("/")); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes); }
  const archivePath = join(root, "synthetic.zip");
  const zip = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:STAYOPTI_SYNTHETIC_SOURCE,$env:STAYOPTI_SYNTHETIC_ARCHIVE)"], {
    cwd: ROOT, encoding: "utf8", windowsHide: true,
    env: { ...process.env, STAYOPTI_SYNTHETIC_SOURCE: source, STAYOPTI_SYNTHETIC_ARCHIVE: archivePath },
  });
  assertStarted(zip); assert.equal(zip.status, 0, `${zip.stdout}\n${zip.stderr}`);
  const descriptor: StayOptiBrowserAssistedDossierDescriptorV3 = {
    schemaVersion: STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3,
    dossierId: "SYNTHETIC_HANDOFF_DOSSIER_001", sessionId: "V3_17T5B_SYNTHETIC_HANDOFF_001",
    expectedArchiveSha256: sha256(readFileSync(archivePath)), checksumArtifactPath,
    acquisition: { mode: "BROWSER_ASSISTED_AGENT", browserAutomation: "ASSISTED_BROWSER_INTERACTION_DISCLOSED", loggedOut: "UNKNOWN", incognito: "UNKNOWN", personalizationAbsent: "UNKNOWN", provenanceLimitations: ["SYNTHETIC_FIXTURE_ONLY", "NO_RETROACTIVE_CAPTURE_CERTIFICATION"] },
    artifacts, alternatives: [{ localAlternativeRef: "SYNTHETIC_ALT_01", screenshotEvidenceRefs: screenshotRefs, taxAndCostDisclosure: {
      observedDisplayStatement: { status: "KNOWN", reliability: "MEDIUM", value: "Include tasse e costi", evidenceRefs: [screenshotRefs[0]], unknownReason: null },
      itemizedTaxBreakdown: { status: "UNKNOWN", reliability: "UNKNOWN", value: null, evidenceRefs: [screenshotRefs[0]], unknownReason: "NOT_VISIBLE" },
    } }],
    transcriptionReview: { status: "NOT_REVIEWED", separateFromCollector: false, reviewProtocolVersion: null, reviewedAtBucket: null },
    classification: { eligibility: "DIAGNOSTIC_ONLY", ineligibilityReasons: ["SYNTHETIC_FIXTURE_ONLY", "PRELIMINARY_SINGLE_ALTERNATIVE"], prohibitedAutomaticUses: ["BLIND_JUDGMENT", "V3_REPLAY", "GOLDEN_ADMISSION"] },
  };
  const descriptorPath = join(root, "descriptor.json");
  const descriptorHash = writeJson(descriptorPath, descriptor);
  const dataMap = { dossierId: descriptor.dossierId, descriptorSha256: descriptorHash, status: "SYNTHETIC_TEST_ONLY", rows: [{ field: "mealPlan", evidence: { status: "UNKNOWN", reliability: "UNKNOWN", value: null, unknownReason: "NOT_VISIBLE", evidenceRefs: [screenshotRefs[0]] } }] };
  const dataMapPath = join(root, "data-map.json");
  const dataMapHash = writeJson(dataMapPath, dataMap);
  const reviewReceipt = {
    schemaVersion: "stayopti.v3.dossier-transcription-review@1", reviewStatus: "SYNTHETIC_TEST_ONLY", reviewerClass: "SYNTHETIC_TEST_ONLY", reviewerPseudonym: "REVIEWER_SYNTHETIC_001", separateFromCollector: true, reviewProtocolVersion: "synthetic-review@1", reviewedAtBucket: "2026-01-02",
    dossierId: descriptor.dossierId, sessionId: descriptor.sessionId, archiveSha256: descriptor.expectedArchiveSha256,
    descriptorFileSha256: descriptorHash, descriptorFingerprint: fingerprint(descriptor), dataMapFileSha256: dataMapHash, dataMapFingerprint: fingerprint(dataMap),
    retentionAcknowledged: { successRetentionDays: 14, start: "COLLECTOR_CUSTODY_START", purge: "EXPLICIT_ONLY" }, dataUseScope: "PRIVATE_DIAGNOSTIC_CUSTODY_ONLY",
  };
  const reviewReceiptPath = join(root, "review-receipt.json");
  const reviewReceiptHash = writeJson(reviewReceiptPath, reviewReceipt);
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(head.status, 0); assert.equal(typeof head.stdout, "string");
  const codeManifestPath = join(root, "code-manifest.json");
  const generated = success(command("CodeManifest", { ExpectedHead: head.stdout.trim(), OutputPath: codeManifestPath }));
  assert.equal(generated.codeManifestSha256, sha256(readFileSync(codeManifestPath)));
  const args = {
    ExpectedHead: head.stdout.trim(), CodeManifestPath: codeManifestPath, CodeManifestSha256: generated.codeManifestSha256,
    ArchivePath: archivePath, ArchiveSha256: descriptor.expectedArchiveSha256,
    DescriptorPath: descriptorPath, DescriptorSha256: descriptorHash,
    DataMapPath: dataMapPath, DataMapSha256: dataMapHash,
    ReviewReceiptPath: reviewReceiptPath, ReviewReceiptSha256: reviewReceiptHash,
    SessionId: descriptor.sessionId, PrivateRoot: privateRoot,
  };
  return { root, source, privateRoot, files, descriptor, reviewReceipt, dataMap, args };
  } catch (error) { cleanSynthetic(root); throw error; }
}

function cleanSynthetic(root: string) {
  const target = resolve(root);
  assert.ok(target.startsWith(`${resolve(tmpdir())}\\`) || target.startsWith(`${resolve(tmpdir())}/`));
  assert.match(target, /StayOpti-Synthetic-Dossier-Handoff-/);
  rmSync(target, { recursive: true, force: true });
}

test("dossier handoff remains offline, explicit and Windows PowerShell 5.1-only", () => {
  const launcher = readFileSync(LAUNCHER, "utf8");
  const runner = readFileSync(RUNNER, "utf8");
  assert.match(launcher, /PSVersionTable/);
  assert.doesNotMatch(launcher, /\bpwsh(?:\.exe)?\b/i);
  assert.doesNotMatch(runner, /\bfetch\s*\(|https?:\/\/|playwright|puppeteer|selenium/i);
  assert.match(runner, /SYNTHETIC_TEST_ONLY/);
});

test("real PS5.1 launcher preflights, imports and reopens fifteen original screenshot bytes with diagnostic custody", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const f = fixture();
  try {
    const before = readdirSync(f.privateRoot);
    const preflight = success(command("Preflight", f.args));
    assert.equal(preflight.status, "READY_FOR_EXPLICIT_IMPORT_AUTHORIZATION");
    assert.ok(typeof preflight.requiredAuthorizationLiteral === "string" && preflight.requiredAuthorizationLiteral.length > 0);
    assert.deepEqual(readdirSync(f.privateRoot), before, "preflight may not create custody");
    const imported = success(command("Import", { ...f.args, AuthorizationLiteral: preflight.requiredAuthorizationLiteral }));
    assert.equal(imported.status, "PASS_DIAGNOSTIC_CUSTODY");
    assert.equal(imported.screenshotCount, 15);
    assert.equal(imported.artifactCount, f.files.size);
    const statePath = join(f.privateRoot, f.descriptor.sessionId, "session-state.json");
    assert.equal(existsSync(statePath), true);
    const stateBeforeReopen = sha256(readFileSync(statePath));
    const reopened = success(command("Reopen", {
      ExpectedHead: f.args.ExpectedHead, CodeManifestPath: f.args.CodeManifestPath, CodeManifestSha256: f.args.CodeManifestSha256,
      PrivateRoot: f.privateRoot, SessionId: f.descriptor.sessionId,
    }));
    assert.equal(reopened.status, "PASS_REOPEN_DIAGNOSTIC_CUSTODY");
    assert.equal(reopened.screenshotCount, 15);
    assert.equal(reopened.artifactCount, f.files.size);
    assert.equal(reopened.reviewMaterialsVerified, true);
    assert.equal(reopened.stateDiagnosticOnly, true);
    assert.equal(reopened.syntheticProofOnly, true);
    assert.equal(sha256(readFileSync(statePath)), stateBeforeReopen, "reopening must be non-mutating");
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(state.eligibility, "DIAGNOSTIC_ONLY");
    assert.equal(state.automaticGoldenAdmission, false);
    assert.equal(state.blindJudgmentEligible, false);
    assert.equal(state.v3ReplayEligible, false);
    const manifest = JSON.parse(readFileSync(join(f.privateRoot, f.descriptor.sessionId, "private-manifest.json"), "utf8"));
    for (const binding of manifest.artifactBindings) {
      assert.equal(binding.originalSha256, sha256(f.files.get(binding.archiveEntryPath)!));
      const envelope = JSON.parse(readFileSync(join(f.privateRoot, f.descriptor.sessionId, binding.relativeEnvelopePath), "utf8"));
      assert.equal(envelope.keyProtection, "WINDOWS_CURRENT_USER_DPAPI");
      assert.equal(Date.parse(envelope.expiresAt) - Date.parse(envelope.capturedAt), 14 * 24 * 60 * 60 * 1000);
    }
    assert.deepEqual(manifest.reviewMaterialBindings.map((entry: { role: string }) => entry.role).sort(), ["CODE_MANIFEST", "DATA_MAP", "DESCRIPTOR", "HUMAN_REVIEW_RECEIPT"]);
    const reviewExpected = new Map([
      ["CODE_MANIFEST", f.args.CodeManifestSha256], ["DATA_MAP", f.args.DataMapSha256],
      ["DESCRIPTOR", f.args.DescriptorSha256], ["HUMAN_REVIEW_RECEIPT", f.args.ReviewReceiptSha256],
    ]);
    for (const binding of manifest.reviewMaterialBindings) {
      assert.equal(binding.fileSha256, reviewExpected.get(binding.role));
      const stored = readFileSync(join(f.privateRoot, f.descriptor.sessionId, binding.relativeEnvelopePath), "utf8");
      assert.doesNotMatch(stored, /NOT_VISIBLE|Include tasse e costi|descriptorFileSha256/);
      assert.equal(JSON.parse(stored).keyProtection, "WINDOWS_CURRENT_USER_DPAPI");
    }
    rejected(command("Import", { ...f.args, AuthorizationLiteral: preflight.requiredAuthorizationLiteral }), /DOSSIER_CUSTODY_SESSION_EXISTS/);
    assert.equal(sha256(readFileSync(statePath)), stateBeforeReopen, "overwrite refusal preserves existing state");
    const manifestPath = join(f.privateRoot, f.descriptor.sessionId, "private-manifest.json");
    const originalManifestBytes = readFileSync(manifestPath);
    const originalStateBytes = readFileSync(statePath);
    const tamperedManifest = JSON.parse(originalManifestBytes.toString("utf8"));
    tamperedManifest.artifactBindings.find((binding: { artifactKind: string }) => binding.artifactKind === "SCREENSHOT").alternativeRef = "SYNTHETIC_DIFFERENT_ALT";
    delete tamperedManifest.privateManifestFingerprint;
    tamperedManifest.privateManifestFingerprint = fingerprint(tamperedManifest);
    const tamperedState = { ...state, privateManifestFingerprint: tamperedManifest.privateManifestFingerprint };
    writeJson(manifestPath, tamperedManifest);
    writeJson(statePath, tamperedState);
    rejected(command("Reopen", {
      ExpectedHead: f.args.ExpectedHead, CodeManifestPath: f.args.CodeManifestPath, CodeManifestSha256: f.args.CodeManifestSha256,
      PrivateRoot: f.privateRoot, SessionId: f.descriptor.sessionId,
    }), /DOSSIER_REVIEW_ARTIFACT_BINDING_MISMATCH/);
    // Restore only the controlled fixture before exercising the independent envelope tamper.
    writeFileSync(manifestPath, originalManifestBytes);
    writeFileSync(statePath, originalStateBytes);
    const reviewEnvelope = join(f.privateRoot, f.descriptor.sessionId, manifest.reviewMaterialBindings[0].relativeEnvelopePath);
    writeFileSync(reviewEnvelope, `${readFileSync(reviewEnvelope, "utf8")} `);
    rejected(command("Reopen", {
      ExpectedHead: f.args.ExpectedHead, CodeManifestPath: f.args.CodeManifestPath, CodeManifestSha256: f.args.CodeManifestSha256,
      PrivateRoot: f.privateRoot, SessionId: f.descriptor.sessionId,
    }), /DOSSIER_[A-Z_]*(?:TAMPER|MISMATCH)[A-Z_]*/);
  } finally { cleanSynthetic(f.root); }
});

test("actual launcher rejects missing review, pending review and absent authorization without creating custody", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const f = fixture();
  try {
    rejected(command("Preflight", { ...f.args, ReviewReceiptPath: join(f.root, "absent.json") }), /DOSSIER_APPROVED_MATERIAL_REQUIRED/);
    const pending = { ...f.reviewReceipt, reviewStatus: "PENDING" };
    const pendingPath = join(f.root, "pending-review.json");
    const pendingHash = writeJson(pendingPath, pending);
    rejected(command("Preflight", { ...f.args, ReviewReceiptPath: pendingPath, ReviewReceiptSha256: pendingHash }), /DOSSIER_HUMAN_REVIEW_REQUIRED/);
    rejected(command("Import", f.args), /DOSSIER_EXPLICIT_IMPORT_AUTHORIZATION_REQUIRED/);
    rejected(command("Import", { ...f.args, AuthorizationLiteral: "PROCEEDI" }), /DOSSIER_EXPLICIT_IMPORT_AUTHORIZATION_REQUIRED/);
    assert.deepEqual(readdirSync(f.privateRoot), []);
  } finally { cleanSynthetic(f.root); }
});

test("actual launcher binds HEAD, code, archive, descriptor, data map and receipt bytes before custody", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const f = fixture();
  try {
    for (const key of ["ExpectedHead", "CodeManifestSha256", "ArchiveSha256", "DescriptorSha256", "DataMapSha256", "ReviewReceiptSha256"] as const) {
      const reason = key === "ExpectedHead" ? /DOSSIER_HEAD_MISMATCH/
        : key === "ArchiveSha256" ? /DOSSIER_SESSION_BINDING_MISMATCH/ : /DOSSIER_APPROVED_MATERIAL_HASH_MISMATCH/;
      rejected(command("Preflight", { ...f.args, [key]: "0".repeat(key === "ExpectedHead" ? 40 : 64) }), reason);
      assert.deepEqual(readdirSync(f.privateRoot), [], `${key} mismatch cannot create custody`);
    }
    const codeBefore = readFileSync(f.args.CodeManifestPath);
    writeFileSync(f.args.CodeManifestPath, `${codeBefore.toString("utf8")} `);
    rejected(command("Preflight", f.args), /DOSSIER_APPROVED_MATERIAL_HASH_MISMATCH/);
    assert.deepEqual(readdirSync(f.privateRoot), []);
  } finally { cleanSynthetic(f.root); }
});

test("synthetic review cannot pass a real import path or masquerade as human approval", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const f = fixture();
  try {
    rejected(command("Preflight", f.args, false), /DOSSIER_CURRENTUSER_PRIVATE_DESTINATION_REQUIRED/);
    const claimedHumanPath = join(f.root, "synthetic-claiming-human.json");
    const claimedHumanHash = writeJson(claimedHumanPath, { ...f.reviewReceipt, reviewStatus: "HUMAN_REVIEWED", reviewerClass: "HUMAN" });
    rejected(command("Preflight", { ...f.args, ReviewReceiptPath: claimedHumanPath, ReviewReceiptSha256: claimedHumanHash }), /DOSSIER_HUMAN_REVIEW_REQUIRED/);
    assert.equal(f.descriptor.transcriptionReview.status, "NOT_REVIEWED");
    assert.equal(f.reviewReceipt.reviewerClass, "SYNTHETIC_TEST_ONLY");
    assert.deepEqual(readdirSync(f.privateRoot), []);
  } finally { cleanSynthetic(f.root); }
});
