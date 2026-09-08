import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dossierCanonicalFingerprintV3 as fingerprint, importBrowserAssistedDossierToCustodyV3, reopenBrowserAssistedDossierCustodyV3 } from "./browser-assisted-dossier-custody-v3.mjs";
import { createWindowsCurrentUserDpapiProtectorV3 } from "./provider-raw-quarantine-store.mjs";

// Evaluation-only local handoff. No transport, credential source or T5B mode.
const ROOT = resolve(import.meta.dirname, "..");
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const CODE_VERSION = "stayopti.v3.dossier-handoff-code@1";
const REVIEW_VERSION = "stayopti.v3.dossier-transcription-review@1";
const SEALED_PATHS = Object.freeze([
  "scripts/run-browser-assisted-dossier-handoff.mjs",
  "scripts/invoke-browser-assisted-dossier-handoff.ps1",
  "scripts/browser-assisted-dossier-custody-v3.mjs",
  "scripts/index-v3-browser-assisted-dossier-archive.ps1",
  "scripts/provider-raw-quarantine-store.mjs",
  "scripts/protect-v3-provider-raw-key-dpapi.ps1",
  "src/engine-v3/evaluation/browserAssistedDossierIntakeV3.ts",
  "src/engine-v3/evaluation/goldenCaseContractV3.ts",
  "src/engine-v3/evaluation/providerRawQuarantineV3.ts",
  "src/engine-v3/contract/stableHashV3.ts",
  "tsconfig.tests.json", "package.json", "package-lock.json",
  "node_modules/typescript/bin/tsc", "node_modules/typescript/lib/tsc.js",
  "node_modules/typescript/lib/_tsc.js", "node_modules/typescript/package.json",
].sort());
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (code) => { throw new Error(code); };
const same = (a, b) => fingerprint(a) === fingerprint(b);
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
  if (r.error || r.status !== 0 || typeof r.stdout !== "string") fail("DOSSIER_GIT_CHECK_FAILED");
  return r.stdout.trim();
}
function under(root, candidate) {
  const path = relative(resolve(root), resolve(candidate));
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}
function noLinks(path) {
  let cursor = resolve(path);
  for (;;) {
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail("DOSSIER_PATH_LINK_PROHIBITED");
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}
function externalPath(path) {
  if (typeof path !== "string" || !isAbsolute(path) || under(ROOT, path) || resolve(path) === ROOT) fail("DOSSIER_PRIVATE_PATH_REQUIRED");
  noLinks(path);
  return resolve(path);
}
function readMaterial(path, expected) {
  externalPath(path);
  if (!/^[a-f0-9]{64}$/.test(expected ?? "") || !existsSync(path) || !statSync(path).isFile()) fail("DOSSIER_APPROVED_MATERIAL_REQUIRED");
  const bytes = readFileSync(path);
  if (bytes.length > 8 * 1024 * 1024 || sha(bytes) !== expected) fail("DOSSIER_APPROVED_MATERIAL_HASH_MISMATCH");
  let document;
  try { document = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")); }
  catch { fail("DOSSIER_APPROVED_MATERIAL_JSON_INVALID"); }
  return { bytes, document, fileSha256: expected, canonicalFingerprint: fingerprint(document) };
}
function checkHead(expected) {
  if (!/^[a-f0-9]{40}$/.test(expected ?? "") || git(["rev-parse", "HEAD"]) !== expected) fail("DOSSIER_HEAD_MISMATCH");
  if (git(["diff", "--cached", "--name-only"]) !== "") fail("DOSSIER_STAGED_STATE_REJECTED");
}
function codeManifest(expected) {
  checkHead(expected);
  const files = SEALED_PATHS.map((path) => {
    const absolute = resolve(ROOT, path); noLinks(absolute);
    return { path, sha256: sha(readFileSync(absolute)) };
  });
  return { schemaVersion: CODE_VERSION, head: expected, branch: git(["branch", "--show-current"]),
    files, nodeVersion: process.version, nodeExecutableSha256: sha(readFileSync(process.execPath)),
    powershell51ExecutableSha256: sha(readFileSync(PS51)) };
}
function checkCode(o) {
  const material = readMaterial(o.CodeManifestPath, o.CodeManifestSha256);
  if (!same(material.document, codeManifest(o.ExpectedHead))) fail("DOSSIER_EXECUTABLE_CODE_CHANGED");
  return material;
}
function sessionDestination(o) {
  if (!/^V3_17[A-Z0-9_.-]{3,120}$/.test(o.SessionId ?? "") || o.SessionId.includes("..")) fail("DOSSIER_SESSION_ID_REQUIRED");
  const root = externalPath(o.PrivateRoot);
  if (o.SyntheticFixture) {
    if (!under(tmpdir(), root) || !o.SessionId.includes("SYNTHETIC")) fail("DOSSIER_SYNTHETIC_DESTINATION_REQUIRED");
  } else {
    const expected = join(process.env.LOCALAPPDATA ?? "", "StayOpti", "private-evidence", "browser-assisted-dossiers");
    if (!process.env.LOCALAPPDATA || root.toLowerCase() !== resolve(expected).toLowerCase() || under(tmpdir(), root)) fail("DOSSIER_CURRENTUSER_PRIVATE_DESTINATION_REQUIRED");
  }
  const sessionRoot = join(root, o.SessionId); noLinks(sessionRoot);
  return { root, sessionRoot };
}
function reviewCheck(descriptor, dataMap, receipt, hashes, synthetic) {
  const status = synthetic ? "SYNTHETIC_TEST_ONLY" : "HUMAN_REVIEWED";
  if (receipt?.schemaVersion !== REVIEW_VERSION || receipt.reviewStatus !== status ||
      receipt.reviewerClass !== (synthetic ? status : "HUMAN") || receipt.separateFromCollector !== true ||
      !/^REVIEWER_[A-Z0-9_]{3,80}$/.test(receipt.reviewerPseudonym ?? "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(receipt.reviewedAtBucket ?? "") ||
      !Number.isFinite(Date.parse(`${receipt.reviewedAtBucket}T00:00:00Z`)) ||
      new Date(`${receipt.reviewedAtBucket}T00:00:00Z`).toISOString().slice(0, 10) !== receipt.reviewedAtBucket ||
      typeof receipt.reviewProtocolVersion !== "string" || receipt.reviewProtocolVersion.length === 0) fail("DOSSIER_HUMAN_REVIEW_REQUIRED");
  if (synthetic) {
    if (!descriptor.dossierId?.startsWith("SYNTHETIC_") || !descriptor.sessionId?.includes("SYNTHETIC") ||
        descriptor.transcriptionReview?.status !== "NOT_REVIEWED") fail("DOSSIER_SYNTHETIC_PROOF_ONLY");
  } else if (descriptor.transcriptionReview?.status !== "HUMAN_REVIEWED" ||
      descriptor.transcriptionReview.separateFromCollector !== true ||
      descriptor.transcriptionReview.reviewedAtBucket !== receipt.reviewedAtBucket ||
      descriptor.transcriptionReview.reviewProtocolVersion !== receipt.reviewProtocolVersion) fail("DOSSIER_HUMAN_REVIEW_REQUIRED");
  if (receipt.dossierId !== descriptor.dossierId || receipt.sessionId !== descriptor.sessionId ||
      receipt.archiveSha256 !== descriptor.expectedArchiveSha256 ||
      receipt.descriptorFileSha256 !== hashes.descriptor || receipt.descriptorFingerprint !== fingerprint(descriptor) ||
      receipt.dataMapFileSha256 !== hashes.dataMap || receipt.dataMapFingerprint !== fingerprint(dataMap) ||
      dataMap.dossierId !== descriptor.dossierId || dataMap.descriptorSha256 !== hashes.descriptor || dataMap.status !== status) fail("DOSSIER_REVIEW_BINDING_MISMATCH");
  if (!same(receipt.retentionAcknowledged, { successRetentionDays: 14, start: "COLLECTOR_CUSTODY_START", purge: "EXPLICIT_ONLY" }) ||
      receipt.dataUseScope !== "PRIVATE_DIAGNOSTIC_CUSTODY_ONLY") fail("DOSSIER_RETENTION_ACKNOWLEDGEMENT_REQUIRED");
  const refs = new Set(descriptor.artifacts?.map((a) => a.evidenceRef));
  if (!Array.isArray(dataMap.rows) || dataMap.rows.length === 0) fail("DOSSIER_DATA_MAP_REQUIRED");
  const fields = new Set();
  for (const row of dataMap.rows) {
    const e = row.evidence;
    if (typeof row.field !== "string" || row.field.length === 0 || fields.has(row.field) ||
        !e || !["KNOWN", "UNKNOWN"].includes(e.status) || !["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(e.reliability) ||
        !Array.isArray(e.evidenceRefs) || e.evidenceRefs.some((r) => !refs.has(r)) ||
        (e.status === "UNKNOWN" && (e.value !== null || typeof e.unknownReason !== "string" || e.unknownReason.length === 0)) ||
        (e.status === "KNOWN" && (e.value === null || e.value === undefined || e.evidenceRefs.length === 0 || e.unknownReason !== null))) fail("DOSSIER_DATA_MAP_EVIDENCE_INVALID");
    fields.add(row.field);
  }
}
function materials(o) {
  const descriptor = readMaterial(o.DescriptorPath, o.DescriptorSha256);
  const dataMap = readMaterial(o.DataMapPath, o.DataMapSha256);
  const receipt = readMaterial(o.ReviewReceiptPath, o.ReviewReceiptSha256);
  reviewCheck(descriptor.document, dataMap.document, receipt.document, { descriptor: descriptor.fileSha256, dataMap: dataMap.fileSha256 }, o.SyntheticFixture);
  if (descriptor.document.sessionId !== o.SessionId || descriptor.document.expectedArchiveSha256 !== o.ArchiveSha256) fail("DOSSIER_SESSION_BINDING_MISMATCH");
  externalPath(o.ArchivePath);
  if (!existsSync(o.ArchivePath) || !statSync(o.ArchivePath).isFile() || statSync(o.ArchivePath).size > 100 * 1024 * 1024 ||
      sha(readFileSync(o.ArchivePath)) !== o.ArchiveSha256) fail("DOSSIER_ARCHIVE_HASH_MISMATCH");
  return { descriptor, dataMap, receipt };
}
function authorization(o) {
  return `AUTHORIZE_DOSSIER_DIAGNOSTIC_IMPORT_HEAD_${o.ExpectedHead}_CODE_${o.CodeManifestSha256}_ARCHIVE_${o.ArchiveSha256}_DESCRIPTOR_${o.DescriptorSha256}_MAP_${o.DataMapSha256}_REVIEW_${o.ReviewReceiptSha256}_SESSION_${o.SessionId}_DEST_${sha(Buffer.from(resolve(o.PrivateRoot).toLowerCase()))}_RETENTION14_EXPLICITPURGE_NO_ELIGIBILITY${o.SyntheticFixture ? "_SYNTHETIC_TEST_ONLY" : ""}`;
}
function compiledAction(action) {
  const temporary = mkdtempSync(join(tmpdir(), "StayOpti-Dossier-Handoff-Compile-"));
  try {
    const compiled = spawnSync(process.execPath, [join(ROOT, "node_modules/typescript/bin/tsc"), "-p", join(ROOT, "tsconfig.tests.json"), "--outDir", temporary], { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    if (compiled.error || compiled.status !== 0) fail("DOSSIER_TYPESCRIPT_COMPILE_FAILED");
    writeFileSync(join(temporary, "package.json"), '{"type":"commonjs"}', { flag: "wx" });
    const require = createRequire(join(temporary, "package.json"));
    return action(require(join(temporary, "src/engine-v3/evaluation/browserAssistedDossierIntakeV3.js")), require(join(temporary, "src/engine-v3/evaluation/providerRawQuarantineV3.js")));
  } finally {
    if (!under(tmpdir(), temporary)) fail("DOSSIER_TEMP_CLEANUP_PATH_INVALID");
    rmSync(temporary, { recursive: true, force: true });
  }
}
function validateArchive(o, descriptor, contract) {
  const extraction = join(tmpdir(), `StayOpti-Dossier-Handoff-Index-${randomBytes(12).toString("hex")}`);
  try {
    const r = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", join(ROOT, "scripts/index-v3-browser-assisted-dossier-archive.ps1"), "-ArchivePath", o.ArchivePath, "-ExpectedSha256", o.ArchiveSha256, "-ExtractionRoot", extraction], { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    if (r.error || r.status === null || r.status !== 0 || !r.stdout?.trim()) fail("DOSSIER_ARCHIVE_PREFLIGHT_FAILED");
    const archiveIndex = JSON.parse(r.stdout);
    const checksumPath = contract.normalizeDossierArchivePathV3(descriptor.checksumArtifactPath);
    const checksumEntries = contract.parseBrowserAssistedDossierChecksumsV3(readFileSync(join(extraction, checksumPath), "utf8"), checksumPath);
    const now = new Date().toISOString();
    const result = contract.validateBrowserAssistedDossierForCustodyV3({ descriptor, archiveIndex, checksumEntries, importedAt: now, custodyStartedAt: now });
    if (!result.validForCustodyImport) fail(result.issues[0] ?? "DOSSIER_VALIDATION_FAILED");
    return result;
  } finally {
    if (!under(tmpdir(), extraction)) fail("DOSSIER_TEMP_CLEANUP_PATH_INVALID");
    if (existsSync(extraction)) rmSync(extraction, { recursive: true, force: true });
  }
}
export function runDossierHandoffV3(o) {
  if (process.platform !== "win32" || !/^5\.1\./.test(o.LauncherPowerShellVersion ?? "")) fail("DOSSIER_POWERSHELL_51_REQUIRED");
  const mode = o.Mode?.toLowerCase();
  if (!["codemanifest", "preflight", "import", "reopen"].includes(mode)) fail("DOSSIER_MODE_INVALID");
  checkHead(o.ExpectedHead);
  if (mode === "codemanifest") {
    const path = externalPath(o.OutputPath);
    const bytes = jsonBytes(codeManifest(o.ExpectedHead));
    if (!existsSync(dirname(path)) || existsSync(path)) fail("DOSSIER_CODE_MANIFEST_OUTPUT_INVALID");
    writeFileSync(path, bytes, { flag: "wx" });
    return { status: "CODE_IDENTIFIED_NOT_AUTHORIZED", codeManifestSha256: sha(bytes) };
  }
  const code = checkCode(o);
  const destination = sessionDestination(o);
  if (mode === "reopen") {
    if (!existsSync(destination.sessionRoot)) fail("DOSSIER_CUSTODY_SESSION_MISSING");
    return compiledAction((_contract, quarantineModule) => {
      checkCode(o);
      const result = reopenBrowserAssistedDossierCustodyV3({ sessionRoot: destination.sessionRoot, quarantineModule, keyProtector: createWindowsCurrentUserDpapiProtectorV3() });
      if (!result.state.reviewMaterialsRequired || result.state.sessionId !== o.SessionId || result.state.automaticGoldenAdmission !== false || result.state.blindJudgmentEligible !== false || result.state.v3ReplayEligible !== false) fail("DOSSIER_REOPEN_REVIEW_REQUIRED");
      const docs = result.reviewDocuments;
      const hashes = Object.fromEntries(result.reviewMaterials.map((m) => [m.role, m.fileSha256]));
      if (hashes.CODE_MANIFEST !== o.CodeManifestSha256 || !same(docs.CODE_MANIFEST, code.document)) fail("DOSSIER_REOPEN_CODE_MISMATCH");
      reviewCheck(docs.DESCRIPTOR, docs.DATA_MAP, docs.HUMAN_REVIEW_RECEIPT, { descriptor: hashes.DESCRIPTOR, dataMap: hashes.DATA_MAP }, o.SyntheticFixture);
      return { status: "PASS_REOPEN_DIAGNOSTIC_CUSTODY", sessionId: o.SessionId, artifactCount: result.artifacts.length,
        screenshotCount: result.artifacts.filter((a) => a.artifactKind === "SCREENSHOT").length,
        reviewMaterialsVerified: true, stateDiagnosticOnly: true, syntheticProofOnly: !!o.SyntheticFixture,
        custodyProofScope: o.SyntheticFixture ? "SYNTHETIC_CURRENT_PROCESS_ONLY" : "CURRENTUSER_FILESYSTEM_REOPEN_ONLY",
        retroactiveCaptureCertification: false, automaticGoldenAdmission: false };
    });
  }
  if (existsSync(destination.sessionRoot)) fail("DOSSIER_CUSTODY_SESSION_EXISTS");
  const m = materials(o);
  const literal = authorization(o);
  if (mode === "import" && o.AuthorizationLiteral !== literal) fail("DOSSIER_EXPLICIT_IMPORT_AUTHORIZATION_REQUIRED");
  return compiledAction((contractModule, quarantineModule) => {
    const validation = validateArchive(o, m.descriptor.document, contractModule);
    checkCode(o);
    // Re-read approved bytes after compilation/indexing; no stale approval.
    const refreshed = materials(o);
    sessionDestination(o);
    if (existsSync(destination.sessionRoot)) fail("DOSSIER_CUSTODY_SESSION_EXISTS");
    if (mode === "preflight") return { status: "READY_FOR_EXPLICIT_IMPORT_AUTHORIZATION", requiredAuthorizationLiteral: literal,
      artifactCount: validation.artifactCount, screenshotCount: validation.screenshotCount, custodyCreated: false,
      syntheticProofOnly: !!o.SyntheticFixture, humanIdentityCryptographicallyVerified: false };
    mkdirSync(destination.root, { recursive: true });
    const reviewMaterials = [["DESCRIPTOR", refreshed.descriptor], ["DATA_MAP", refreshed.dataMap], ["HUMAN_REVIEW_RECEIPT", refreshed.receipt], ["CODE_MANIFEST", code]].map(([role, material]) => ({ role, ...material }));
    const result = importBrowserAssistedDossierToCustodyV3({ repositoryRoot: ROOT, privateRoot: destination.root,
      sessionId: o.SessionId, archivePath: o.ArchivePath, descriptor: refreshed.descriptor.document,
      contractModule, quarantineModule, reviewMaterials });
    return { status: "PASS_DIAGNOSTIC_CUSTODY", sessionId: o.SessionId, sessionRoot: result.sessionRoot,
      artifactCount: result.artifactCount, screenshotCount: result.screenshotCount, reviewMaterialsEncrypted: 4,
      syntheticProofOnly: !!o.SyntheticFixture, automaticGoldenAdmission: false, automaticReplayEligible: false,
      automaticBlindJudgmentEligible: false, retroactiveCaptureCertification: false };
  });
}
function parse(args) {
  const keys = new Set(["Mode", "ExpectedHead", "CodeManifestPath", "CodeManifestSha256", "ArchivePath", "ArchiveSha256", "DescriptorPath", "DescriptorSha256", "DataMapPath", "DataMapSha256", "ReviewReceiptPath", "ReviewReceiptSha256", "SessionId", "PrivateRoot", "AuthorizationLiteral", "OutputPath", "SyntheticFixture", "LauncherPowerShellVersion"]);
  const o = {};
  for (const arg of args) {
    const match = /^--([A-Za-z][A-Za-z0-9]*)=(.*)$/s.exec(arg);
    if (!match || !keys.has(match[1]) || Object.hasOwn(o, match[1])) fail("DOSSIER_ARGUMENTS_INVALID");
    o[match[1]] = match[2];
  }
  o.SyntheticFixture = o.SyntheticFixture === "true";
  return o;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(runDossierHandoffV3(parse(process.argv.slice(2))))}\n`); }
  catch (error) {
    // Never emit native parser paths, source strings, private data or stacks.
    process.stderr.write(`${/^DOSSIER_[A-Z0-9_]+$/.test(error?.message ?? "") ? error.message : "DOSSIER_HANDOFF_FAILED"}\n`);
    process.exitCode = 1;
  }
}
