import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

// Evaluation-only fixture builder. There is deliberately no real-data mode,
// provider transport, credential input or custody destination override.
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[A-Z][A-Z0-9_]{2,80}$/;
const SYNTHETIC_CONSUMER_ASSERTIONS = Object.freeze({ loggedOut: "VERIFIED", incognito: "UNKNOWN", personalizationAbsent: "VERIFIED" });
const SYNTHETIC_VERIFICATION_LIMIT = "VERIFIED_VALUES_ARE_SYNTHETIC_SCENARIO_ASSERTIONS_NOT_REAL_BROWSER_VERIFICATION";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (code) => { throw new Error(code); };
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
const fingerprint = (value) => sha(Buffer.from(JSON.stringify(stable(value))));
function inside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
function noLinks(path) {
  let cursor = resolve(path);
  for (;;) {
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail("SYNTHETIC_CUSTODY_LINK_REJECTED");
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}
function exclusive(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes, { flag: "wx" });
  return sha(bytes);
}
function observedWrapper(value, proofRef) {
  if (!value || !["KNOWN", "UNKNOWN"].includes(value.status) ||
      !["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(value.reliability)) fail("SYNTHETIC_CUSTODY_WRAPPER_REQUIRED");
  if (value.status === "UNKNOWN") {
    if (value.value !== null || typeof value.unknownReason !== "string" || value.unknownReason.trim() === "") fail("SYNTHETIC_CUSTODY_UNKNOWN_INVALID");
  } else if (value.value === null || value.value === undefined || value.unknownReason !== null) fail("SYNTHETIC_CUSTODY_KNOWN_INVALID");
  return { status: value.status, reliability: value.reliability, value: value.value,
    evidenceRefs: [proofRef], unknownReason: value.unknownReason };
}
function unknown(ref, reason) {
  return { status: "UNKNOWN", reliability: "UNKNOWN", value: null, evidenceRefs: [ref], unknownReason: reason };
}
function taxField(fields, primary, alias) {
  if (fields[primary] && fields[alias] && fingerprint(fields[primary]) !== fingerprint(fields[alias])) fail("SYNTHETIC_CUSTODY_TAX_ALIAS_CONFLICT");
  return fields[primary] ?? fields[alias];
}
function checkInputs(input) {
  if (input?.syntheticOnly !== true || !ID.test(input.caseId ?? "") || !input.caseId.includes("SYNTHETIC")) fail("SYNTHETIC_CUSTODY_ONLY");
  if (typeof input.repoRoot !== "string" || resolve(input.repoRoot) !== REPOSITORY_ROOT) fail("SYNTHETIC_CUSTODY_REPOSITORY_MISMATCH");
  if (!isAbsolute(input.root ?? "") || !isAbsolute(input.repoRoot ?? "") ||
      !inside(tmpdir(), input.root) || inside(input.repoRoot, input.root) || resolve(input.root) === resolve(input.repoRoot)) fail("SYNTHETIC_CUSTODY_TEMP_ROOT_REQUIRED");
  noLinks(input.root);
  if (!existsSync(input.root) || !statSync(input.root).isDirectory()) fail("SYNTHETIC_CUSTODY_PREPARED_ROOT_REQUIRED");
  if (!isAbsolute(input.scenarioSealPath ?? "") || !inside(input.root, input.scenarioSealPath) || !SHA256.test(input.scenarioSealHash ?? "")) fail("SYNTHETIC_CUSTODY_SCENARIO_SEAL_REQUIRED");
  noLinks(input.scenarioSealPath);
  if (!existsSync(input.scenarioSealPath) || !statSync(input.scenarioSealPath).isFile()) fail("SYNTHETIC_CUSTODY_SCENARIO_SEAL_REQUIRED");
  const sealBytes = readFileSync(input.scenarioSealPath);
  if (sha(sealBytes) !== input.scenarioSealHash) fail("SYNTHETIC_CUSTODY_SCENARIO_SEAL_MISMATCH");
  let scenarioSeal;
  try { scenarioSeal = JSON.parse(sealBytes.toString("utf8")); } catch { fail("SYNTHETIC_CUSTODY_SCENARIO_JSON_INVALID"); }
  if (!scenarioSeal || typeof scenarioSeal !== "object" || Array.isArray(scenarioSeal)) fail("SYNTHETIC_CUSTODY_SCENARIO_JSON_INVALID");
  if (!Array.isArray(input.alternatives) || ![5, 8].includes(input.alternatives.length)) fail("SYNTHETIC_CUSTODY_ALTERNATIVES_REQUIRED");
  const alternativeIds = new Set();
  const normalized = input.alternatives.map((alternative) => {
    const alternativeId = alternative.alternativeId ?? alternative.id;
    if (!ID.test(alternativeId ?? "") || !alternativeId.includes("SYNTHETIC") || alternativeIds.has(alternativeId)) fail("SYNTHETIC_CUSTODY_ALTERNATIVE_ID_INVALID");
    alternativeIds.add(alternativeId);
    if (!alternative.fields || Object.getPrototypeOf(alternative.fields) !== Object.prototype ||
        Object.keys(alternative.fields).length === 0 || Object.keys(alternative.fields).length > 80) fail("SYNTHETIC_CUSTODY_FIELDS_REQUIRED");
    for (const [key, value] of Object.entries(alternative.fields)) {
      if (!/^[A-Za-z][A-Za-z0-9_.]{0,100}$/.test(key)) fail("SYNTHETIC_CUSTODY_FIELD_INVALID");
      observedWrapper(value, "SYNTHETIC_VALIDATION_ONLY");
      if (JSON.stringify(value.value)?.length > 4000) fail("SYNTHETIC_CUSTODY_FIELD_TOO_LARGE");
    }
    return { alternativeId, fields: alternative.fields };
  });
  if (!Array.isArray(input.observations) || input.observations.length !== normalized.length) fail("SYNTHETIC_CUSTODY_OBSERVATIONS_REQUIRED");
  const observationIds = new Set();
  const observations = input.observations.map((observation) => {
    if (!alternativeIds.has(observation.alternativeId) || observationIds.has(observation.alternativeId) ||
        typeof observation.observedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(observation.observedAt) ||
        !Number.isFinite(Date.parse(observation.observedAt)) || new Date(observation.observedAt).toISOString() !== observation.observedAt ||
        Date.parse(observation.observedAt) > Date.now() ||
        typeof observation.source !== "string" || !observation.source.includes("SYNTHETIC")) fail("SYNTHETIC_CUSTODY_OBSERVATION_INVALID");
    observationIds.add(observation.alternativeId);
    // Claimed observation time is kept distinct from actual file creation and
    // custody time; the persisted scenario bytes are independently bound below.
    return { ...observation, syntheticOnly: true };
  });
  return { normalized, observations, sealBytes };
}
function runPs(args, options = {}) {
  const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", ...args], {
    encoding: "utf8", windowsHide: true, timeout: 240000, maxBuffer: 8 * 1024 * 1024, ...options,
  });
  if (result.error || result.status === null || typeof result.stdout !== "string" || typeof result.stderr !== "string") fail("SYNTHETIC_CUSTODY_POWERSHELL_NOT_STARTED");
  if (result.status !== 0) {
    const controlled = `${result.stdout}\n${result.stderr}`.match(/\bDOSSIER_[A-Z0-9_]+\b/);
    fail(controlled?.[0] ?? "SYNTHETIC_CUSTODY_POWERSHELL_FAILED");
  }
  return result.stdout;
}
function handoff(repoRoot, mode, parameters) {
  const args = ["-File", join(repoRoot, "scripts/invoke-browser-assisted-dossier-handoff.ps1"), "-Mode", mode];
  for (const [key, value] of Object.entries(parameters)) args.push(`-${key}`, String(value));
  args.push("-SyntheticFixture");
  let result;
  try { result = JSON.parse(runPs(args, { cwd: repoRoot })); } catch (error) {
    if (/^(?:DOSSIER|SYNTHETIC_CUSTODY)_[A-Z0-9_]+$/.test(error?.message ?? "")) throw error;
    fail("SYNTHETIC_CUSTODY_HANDOFF_OUTPUT_INVALID");
  }
  if (!result || typeof result.status !== "string") fail("SYNTHETIC_CUSTODY_HANDOFF_OUTPUT_INVALID");
  return result;
}
function groupFor(key) {
  if (/price|amount|tax|currency|payment|cancellation|refund|deposit|meal|board|observedDisplayStatement/i.test(key)) return "OFFER";
  if (/location|distance|coordinate|rating|review|category|star/i.test(key)) return "CONTEXT";
  return "ROOM";
}
const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function imageBytes(alternativeId, group, entries, observedAt) {
  const lines = ["PROVA SINTETICA - NON OFFERTA REALE", `${alternativeId} / ${group}`, `Istante dichiarato simulato: ${observedAt}`, ""];
  for (const [key, value] of entries) {
    const text = `${key}: ${value.status === "UNKNOWN" ? `UNKNOWN (${value.unknownReason})` : JSON.stringify(value.value)} [${value.reliability}]`;
    for (let start = 0; start < text.length; start += 92) lines.push(text.slice(start, start + 92));
    lines.push("");
  }
  if (!entries.length) lines.push("Nessun campo di questo gruppo nel caso sintetico; nessuna inferenza.");
  const height = Math.max(240, 64 + lines.length * 24);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="0 0 1120 ${height}"><rect width="1120" height="${height}" fill="#ffffff"/><g font-family="monospace" font-size="17" fill="#182b35">${lines.map((line, index) => `<text x="24" y="${36 + index * 24}">${escape(line)}</text>`).join("")}</g></svg>`);
}
function inventory(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) fail("SYNTHETIC_CUSTODY_LINK_REJECTED");
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) { const metadata = statSync(path); files.push({ path: relative(root, path).split(sep).join("/"), sha256: sha(readFileSync(path)), byteLength: metadata.size, lastWriteTimeMs: metadata.mtimeMs }); }
      else fail("SYNTHETIC_CUSTODY_FILE_TYPE_INVALID");
    }
  }
  visit(root);
  return files;
}

/** Create and reopen only an explicitly synthetic five/eight-alternative
 * dossier via the unchanged D-0037 PowerShell 5.1 launcher. compiledRoot is
 * intentionally not used to bypass the launcher's sealed compilation path. */
export function prepareSyntheticCustody(input) {
  const { normalized, observations, sealBytes } = checkInputs(input);
  if (process.platform !== "win32") fail("SYNTHETIC_CUSTODY_WINDOWS_51_REQUIRED");
  const work = join(resolve(input.root), "synthetic-dossier-custody");
  if (existsSync(work)) fail("SYNTHETIC_CUSTODY_OVERWRITE_REJECTED");
  mkdirSync(work);
  const source = join(work, "source");
  const privateRoot = join(work, "private");
  const sessionId = `V3_17_${input.caseId}`;
  const files = new Map(); const artifacts = []; const proofFiles = []; const rows = []; const descriptorAlternatives = [];
  const prefix = "SYNTHETIC_PACKAGE/";
  function artifact(path, kind, evidenceRef, bytes, alternativeRef = null, declaredCapturedAt = null) {
    const archiveEntryPath = `${prefix}${path}`;
    files.set(archiveEntryPath, bytes);
    artifacts.push({ evidenceRef, archiveEntryPath, kind, expectedSha256: sha(bytes), alternativeRef, declaredCapturedAt,
      captureTimeSourceRef: declaredCapturedAt === null ? null : "SYNTHETIC_CAPTURE_LOG" });
    return archiveEntryPath;
  }
  artifact("scenario-seal.json", "DOSSIER_MANIFEST", "SYNTHETIC_SCENARIO_SEAL", sealBytes);
  artifact("capture-log.json", "CAPTURE_LOG", "SYNTHETIC_CAPTURE_LOG", jsonBytes({ schemaVersion: "synthetic-prospective-capture-log@1", syntheticOnly: true, caseId: input.caseId, scenarioSealSha256: input.scenarioSealHash, observations }));
  artifact("provenance.json", "PROVENANCE_DOCUMENT", "SYNTHETIC_PROVENANCE", jsonBytes({ syntheticOnly: true, acquisitionMode: "SIMULATED_BROWSER_ASSISTED", browserWasUsed: false,
    simulatedConsumerAssertions: SYNTHETIC_CONSUMER_ASSERTIONS, realConsumerVerificationPerformed: false, provenanceLimitations: [SYNTHETIC_VERIFICATION_LIMIT],
    specimenNotRealMarketEvidence: true, scenarioSealPersistedBeforeEvidenceFiles: true, scenarioSealSha256: input.scenarioSealHash }));
  for (const alternative of normalized) {
    const observation = observations.find((value) => value.alternativeId === alternative.alternativeId);
    const screenshotRefs = []; const fields = Object.entries(alternative.fields).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    for (const group of ["ROOM", "OFFER", "CONTEXT"]) {
      const evidenceRef = `${alternative.alternativeId}_${group}_SCREEN`;
      const entries = fields.filter(([key]) => groupFor(key) === group);
      const bytes = imageBytes(alternative.alternativeId, group, entries, observation.observedAt);
      const path = artifact(`screenshots/${alternative.alternativeId}-${group}.svg`, "SCREENSHOT", evidenceRef, bytes, alternative.alternativeId, observation.observedAt);
      screenshotRefs.push(evidenceRef);
      proofFiles.push({ alternativeId: alternative.alternativeId, group, fieldKeys: entries.map(([key]) => key), evidenceRef, proofRef: evidenceRef, originalPath: join(source, ...path.split("/")), mediaType: "image/svg+xml", sha256: sha(bytes), byteLength: bytes.length });
      for (const [fieldKey, value] of entries) rows.push({ field: `${alternative.alternativeId}.${fieldKey}`, alternativeId: alternative.alternativeId, fieldKey, evidence: observedWrapper(value, evidenceRef) });
    }
    const offerRef = `${alternative.alternativeId}_OFFER_SCREEN`;
    const statement = taxField(alternative.fields, "observedDisplayStatement", "taxInclusionStatement");
    const breakdown = taxField(alternative.fields, "itemizedTaxBreakdown", "taxBreakdown");
    descriptorAlternatives.push({ localAlternativeRef: alternative.alternativeId, screenshotEvidenceRefs: screenshotRefs, taxAndCostDisclosure: {
      observedDisplayStatement: statement ? observedWrapper(statement, offerRef) : unknown(offerRef, "SYNTHETIC_FIELD_NOT_SUPPLIED"),
      itemizedTaxBreakdown: breakdown ? observedWrapper(breakdown, offerRef) : unknown(offerRef, "SYNTHETIC_FIELD_NOT_SUPPLIED"),
    } });
  }
  const checksumArtifactPath = `${prefix}checksums.sha256`;
  artifact("checksums.sha256", "CHECKSUM_MANIFEST", "SYNTHETIC_CHECKSUMS", Buffer.from(`${[...files].map(([path, bytes]) => `${sha(bytes)}  ${path.slice(prefix.length)}`).join("\n")}\n`));
  for (const [path, bytes] of files) exclusive(join(source, ...path.split("/")), bytes);
  const archivePath = join(work, "synthetic-originals.zip");
  runPs(["-Command", "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:STAYOPTI_SYNTHETIC_SOURCE,$env:STAYOPTI_SYNTHETIC_ARCHIVE)"], {
    cwd: input.repoRoot, env: { ...process.env, STAYOPTI_SYNTHETIC_SOURCE: source, STAYOPTI_SYNTHETIC_ARCHIVE: archivePath },
  });
  const descriptor = {
    schemaVersion: "stayopti.v3.browser-assisted-dossier@1", dossierId: `SYNTHETIC_${input.caseId}`, sessionId,
    expectedArchiveSha256: sha(readFileSync(archivePath)), checksumArtifactPath,
    acquisition: { mode: "BROWSER_ASSISTED_AGENT", browserAutomation: "ASSISTED_BROWSER_INTERACTION_DISCLOSED", ...SYNTHETIC_CONSUMER_ASSERTIONS,
      provenanceLimitations: ["SYNTHETIC_FIXTURE_ONLY", "NO_REAL_BROWSER_USED", "NO_REAL_COLLECTION_OR_HUMAN_REVIEW", SYNTHETIC_VERIFICATION_LIMIT] },
    artifacts, alternatives: descriptorAlternatives,
    transcriptionReview: { status: "NOT_REVIEWED", separateFromCollector: false, reviewProtocolVersion: null, reviewedAtBucket: null },
    classification: { eligibility: "DIAGNOSTIC_ONLY", ineligibilityReasons: ["SYNTHETIC_FIXTURE_ONLY", "NO_HUMAN_JUDGMENT", "CUSTODY_NOT_ELIGIBILITY"], prohibitedAutomaticUses: ["BLIND_JUDGMENT", "V3_REPLAY", "GOLDEN_ADMISSION"] },
  };
  const descriptorPath = join(work, "descriptor.synthetic.json");
  const descriptorHash = exclusive(descriptorPath, jsonBytes(descriptor));
  const dataMap = { dossierId: descriptor.dossierId, descriptorSha256: descriptorHash, status: "SYNTHETIC_TEST_ONLY", scenarioSealSha256: input.scenarioSealHash, rows };
  const dataMapPath = join(work, "data-map.synthetic.json");
  const dataMapHash = exclusive(dataMapPath, jsonBytes(dataMap));
  const reviewReceipt = { schemaVersion: "stayopti.v3.dossier-transcription-review@1", reviewStatus: "SYNTHETIC_TEST_ONLY", reviewerClass: "SYNTHETIC_TEST_ONLY", reviewerPseudonym: "REVIEWER_SYNTHETIC_PROTOTYPE", separateFromCollector: true, reviewProtocolVersion: "synthetic-prospective-review@1", reviewedAtBucket: new Date().toISOString().slice(0, 10),
    dossierId: descriptor.dossierId, sessionId, archiveSha256: descriptor.expectedArchiveSha256, descriptorFileSha256: descriptorHash, descriptorFingerprint: fingerprint(descriptor), dataMapFileSha256: dataMapHash, dataMapFingerprint: fingerprint(dataMap),
    retentionAcknowledged: { successRetentionDays: 14, start: "COLLECTOR_CUSTODY_START", purge: "EXPLICIT_ONLY" }, dataUseScope: "PRIVATE_DIAGNOSTIC_CUSTODY_ONLY" };
  const reviewReceiptPath = join(work, "review-receipt.synthetic.json");
  const reviewHash = exclusive(reviewReceiptPath, jsonBytes(reviewReceipt));
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: input.repoRoot, encoding: "utf8", windowsHide: true });
  if (git.error || git.status !== 0 || !/^[a-f0-9]{40}\s*$/.test(git.stdout ?? "")) fail("SYNTHETIC_CUSTODY_HEAD_UNAVAILABLE");
  const head = git.stdout.trim();
  const codeManifestPath = join(work, "code-manifest.synthetic.json");
  const code = handoff(input.repoRoot, "CodeManifest", { ExpectedHead: head, OutputPath: codeManifestPath });
  if (code.status !== "CODE_IDENTIFIED_NOT_AUTHORIZED" || code.codeManifestSha256 !== sha(readFileSync(codeManifestPath))) fail("SYNTHETIC_CUSTODY_CODE_MANIFEST_MISMATCH");
  const args = { ExpectedHead: head, CodeManifestPath: codeManifestPath, CodeManifestSha256: code.codeManifestSha256,
    ArchivePath: archivePath, ArchiveSha256: descriptor.expectedArchiveSha256, DescriptorPath: descriptorPath, DescriptorSha256: descriptorHash,
    DataMapPath: dataMapPath, DataMapSha256: dataMapHash, ReviewReceiptPath: reviewReceiptPath, ReviewReceiptSha256: reviewHash, SessionId: sessionId, PrivateRoot: privateRoot };
  const preflightResult = handoff(input.repoRoot, "Preflight", args);
  if (preflightResult.status !== "READY_FOR_EXPLICIT_IMPORT_AUTHORIZATION" || preflightResult.syntheticProofOnly !== true || preflightResult.custodyCreated !== false ||
      !preflightResult.requiredAuthorizationLiteral?.endsWith("_SYNTHETIC_TEST_ONLY")) fail("SYNTHETIC_CUSTODY_PREFLIGHT_REJECTED");
  if (sha(readFileSync(input.scenarioSealPath)) !== input.scenarioSealHash) fail("SYNTHETIC_CUSTODY_SCENARIO_CHANGED");
  const importResult = handoff(input.repoRoot, "Import", { ...args, AuthorizationLiteral: preflightResult.requiredAuthorizationLiteral });
  if (importResult.status !== "PASS_DIAGNOSTIC_CUSTODY" || importResult.syntheticProofOnly !== true) fail("SYNTHETIC_CUSTODY_IMPORT_FAILED");
  const sessionRoot = join(privateRoot, sessionId);
  const beforeReopen = inventory(sessionRoot);
  const reopenResult = handoff(input.repoRoot, "Reopen", { ExpectedHead: head, CodeManifestPath: codeManifestPath, CodeManifestSha256: code.codeManifestSha256, SessionId: sessionId, PrivateRoot: privateRoot });
  if (reopenResult.status !== "PASS_REOPEN_DIAGNOSTIC_CUSTODY" || reopenResult.syntheticProofOnly !== true || !reopenResult.reviewMaterialsVerified) fail("SYNTHETIC_CUSTODY_REOPEN_FAILED");
  const afterReopen = inventory(sessionRoot);
  if (JSON.stringify(beforeReopen) !== JSON.stringify(afterReopen)) fail("SYNTHETIC_CUSTODY_REOPEN_MUTATED_CONTENTS");
  const manifest = JSON.parse(readFileSync(join(sessionRoot, "private-manifest.json"), "utf8"));
  const state = JSON.parse(readFileSync(join(sessionRoot, "session-state.json"), "utf8"));
  if (state.eligibility !== "DIAGNOSTIC_ONLY" || state.automaticGoldenAdmission !== false || state.blindJudgmentEligible !== false || state.v3ReplayEligible !== false || state.screenshotCount !== normalized.length * 3) fail("SYNTHETIC_CUSTODY_ELIGIBILITY_LEAK");
  const artifactBindings = manifest.artifactBindings.map((binding) => {
    const bytes = files.get(binding.archiveEntryPath);
    if (!bytes || sha(bytes) !== binding.originalSha256 || sha(readFileSync(join(source, ...binding.archiveEntryPath.split("/")))) !== binding.originalSha256) fail("SYNTHETIC_CUSTODY_ORIGINAL_BYTES_MISMATCH");
    const envelopeBytes = readFileSync(join(sessionRoot, binding.relativeEnvelopePath));
    const envelope = JSON.parse(envelopeBytes.toString("utf8"));
    if (sha(envelopeBytes) !== binding.envelopeFileSha256 || envelope.keyProtection !== "WINDOWS_CURRENT_USER_DPAPI" || Date.parse(envelope.expiresAt) - Date.parse(envelope.capturedAt) !== 14 * 86400000) fail("SYNTHETIC_CUSTODY_ENVELOPE_INVALID");
    return { ...binding };
  });
  if (artifactBindings.length !== files.size || sha(readFileSync(input.scenarioSealPath)) !== input.scenarioSealHash) fail("SYNTHETIC_CUSTODY_FINAL_BINDING_MISMATCH");
  const integrityProof = { schemaVersion: "stayopti.synthetic-prospective-custody-proof@1", status: "PASS", syntheticProofOnly: true,
    actualD0037Launcher: true, powershell51RequiredAndStarted: true, currentUserDpapiVerified: true,
    caseId: input.caseId, sessionId, scenarioSealSha256: input.scenarioSealHash, codeManifestSha256: code.codeManifestSha256,
    alternativeCount: normalized.length, screenshotCount: state.screenshotCount, artifactCount: state.artifactCount,
    reviewMaterialsEncrypted: 4, originalsByteIdentical: true, reopenNonMutating: true, recoveryPreserved: existsSync(join(sessionRoot, "session-state.recovery.json")),
    importedAt: state.importedAt, custodyStartedAt: state.custodyStartedAt, expiresAt: new Date(Date.parse(state.custodyStartedAt) + 14 * 86400000).toISOString(),
    automaticGoldenAdmission: false, humanReviewPerformed: false, realCustodyCertified: false, networkCalls: 0 };
  const integrityProofPath = join(work, "synthetic-custody-proof.json");
  exclusive(integrityProofPath, jsonBytes(integrityProof));
  return { syntheticProofOnly: true, sessionId, sessionRoot, descriptorPath, dataMapPath, reviewReceiptPath, archivePath,
    codeManifestPath, proofFiles, fieldProofBindings: rows.map((row) => ({ alternativeId: row.alternativeId, fieldKey: row.fieldKey, proofRef: row.evidence.evidenceRefs[0] })),
    artifactBindings, preflightResult, importResult, reopenResult, integrityProof, integrityProofPath, sessionInventory: afterReopen };
}
