import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

import {
  createProviderRawQuarantineStoreV3,
  createWindowsCurrentUserDpapiProtectorV3,
} from "./provider-raw-quarantine-store.mjs";

export const BROWSER_ASSISTED_DOSSIER_STATE_VERSION_V3 = "stayopti.v3.browser-assisted-dossier-state@1";
export const BROWSER_ASSISTED_DOSSIER_PRIVATE_MANIFEST_VERSION_V3 = "stayopti.v3.browser-assisted-dossier-private-manifest@1";

const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const INDEXER = resolve(import.meta.dirname, "index-v3-browser-assisted-dossier-archive.ps1");

function fail(code) { throw new Error(code); }
function sha256Bytes(value) { return createHash("sha256").update(value).digest("hex"); }
function sha256File(path) { return sha256Bytes(readFileSync(path)); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function dossierCanonicalFingerprintV3(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(stable(value))));
}

function controlledSessionId(value) {
  if (typeof value !== "string" || !/^V3_17[A-Z0-9_.-]{3,120}$/.test(value)) fail("DOSSIER_CUSTODY_SESSION_ID_INVALID");
  return value;
}

function outsideRepository(repositoryRoot, candidate) {
  const root = resolve(repositoryRoot);
  const target = resolve(candidate);
  if (!isAbsolute(target)) fail("DOSSIER_CUSTODY_ABSOLUTE_PRIVATE_ROOT_REQUIRED");
  const relation = relative(root, target);
  if (relation === "" || (relation !== ".." && !relation.startsWith(`..${sep}`) && !isAbsolute(relation))) fail("DOSSIER_CUSTODY_REPOSITORY_PATH_PROHIBITED");
  return target;
}

function safeChild(root, name) {
  const child = resolve(root, name);
  const relation = relative(resolve(root), child);
  if (relation === "" || relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) fail("DOSSIER_CUSTODY_PATH_INVALID");
  return child;
}

function atomicExclusive(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temporary, content, { flag: "wx" });
  try {
    if (existsSync(path)) fail("DOSSIER_CUSTODY_OVERWRITE_PROHIBITED");
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function indexArchive(archivePath, expectedArchiveSha256, extractionRoot, powershellPath = PS51) {
  if (!existsSync(resolve(archivePath)) || !statSync(resolve(archivePath)).isFile()) fail("DOSSIER_ARCHIVE_MISSING_BEFORE_POWERSHELL");
  const result = spawnSync(powershellPath, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", INDEXER,
    "-ArchivePath", resolve(archivePath),
    "-ExpectedSha256", expectedArchiveSha256,
    "-ExtractionRoot", extractionRoot,
  ], { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error !== undefined || result.status === null) fail("DOSSIER_POWERSHELL_51_NOT_STARTED");
  if (result.status !== 0 || typeof result.stdout !== "string" || result.stdout.trim().length === 0) {
    const diagnostic = `${typeof result.stdout === "string" ? result.stdout : ""}\n${typeof result.stderr === "string" ? result.stderr : ""}`;
    const controlled = diagnostic.match(/DOSSIER_[A-Z0-9_]+/)?.[0];
    fail(controlled ?? "DOSSIER_ARCHIVE_INDEX_FAILED");
  }
  try { return JSON.parse(result.stdout); }
  catch { fail("DOSSIER_ARCHIVE_INDEX_OUTPUT_INVALID"); }
}

function artifactPlaintext(path, artifact) {
  const bytes = readFileSync(path);
  return json({
    evidenceRef: artifact.evidenceRef,
    archiveEntryPath: artifact.archiveEntryPath,
    encoding: "BASE64",
    originalByteLength: bytes.length,
    originalSha256: sha256Bytes(bytes),
    bytesBase64: bytes.toString("base64"),
  });
}

function fault(input, marker) {
  if (input.faultAt === marker) fail(`DOSSIER_SYNTHETIC_FAULT_${marker}`);
}

export function importBrowserAssistedDossierToCustodyV3(input) {
  const repositoryRoot = resolve(input.repositoryRoot);
  const privateRoot = outsideRepository(repositoryRoot, input.privateRoot);
  const sessionId = controlledSessionId(input.descriptor.sessionId);
  if (sessionId !== input.sessionId) fail("DOSSIER_CUSTODY_SESSION_ID_MISMATCH");
  const finalRoot = safeChild(privateRoot, sessionId);
  if (existsSync(finalRoot)) fail("DOSSIER_CUSTODY_SESSION_EXISTS");
  const stagingRoot = safeChild(privateRoot, `.importing-${sessionId}-${randomBytes(8).toString("hex")}`);
  const extractionRoot = join(tmpdir(), `StayOpti-Dossier-Extract-${randomBytes(12).toString("hex")}`);
  const importedAt = input.importedAt ?? new Date().toISOString();
  const custodyStartedAt = input.custodyStartedAt ?? new Date().toISOString();
  let archiveIndex;
  try {
    fault(input, "BEFORE_ARCHIVE_INDEX");
    archiveIndex = indexArchive(input.archivePath, input.descriptor.expectedArchiveSha256, extractionRoot, input.powershellPath);
    fault(input, "AFTER_ARCHIVE_INDEX");
    const checksumPath = safeChild(extractionRoot, input.descriptor.checksumArtifactPath);
    if (!existsSync(checksumPath) || !statSync(checksumPath).isFile()) fail("DOSSIER_CHECKSUM_MANIFEST_MISSING");
    const checksumEntries = input.contractModule.parseBrowserAssistedDossierChecksumsV3(
      readFileSync(checksumPath, "utf8"), input.descriptor.checksumArtifactPath,
    );
    const validation = input.contractModule.validateBrowserAssistedDossierForCustodyV3({
      descriptor: input.descriptor,
      archiveIndex,
      checksumEntries,
      importedAt,
      custodyStartedAt,
    });
    if (!validation.validForCustodyImport) fail(validation.issues[0] ?? "DOSSIER_CONTRACT_VALIDATION_FAILED");
    fault(input, "AFTER_CONTRACT_VALIDATION");

    mkdirSync(stagingRoot, { recursive: false });
    const encryptedRoot = join(stagingRoot, "encrypted");
    const keyProtector = input.keyProtector ?? createWindowsCurrentUserDpapiProtectorV3();
    const store = createProviderRawQuarantineStoreV3({
      repositoryRoot,
      root: encryptedRoot,
      quarantineModule: input.quarantineModule,
      keyProtector,
    });
    const bindings = [];
    let ordinal = 0;
    for (const artifact of input.descriptor.artifacts) {
      ordinal += 1;
      const sourcePath = safeChild(extractionRoot, artifact.archiveEntryPath);
      const handle = store.capture({
        plaintextUtf8: artifactPlaintext(sourcePath, artifact),
        metadata: {
          providerKey: "PUBLIC_MARKET_DOSSIER",
          endpointClass: "OFFLINE_ARCHIVE_IMPORT",
          sessionReference: sessionId,
          requestKind: `DOSSIER_${artifact.kind}`,
          requestOrdinal: ordinal,
          capturedAt: custodyStartedAt,
        },
        disposition: "PROCESSED_SUCCESS",
      });
      bindings.push({
        evidenceRef: artifact.evidenceRef,
        artifactKind: artifact.kind,
        archiveEntryPath: artifact.archiveEntryPath,
        alternativeRef: artifact.alternativeRef,
        declaredCapturedAt: artifact.declaredCapturedAt,
        captureTimeSourceRef: artifact.captureTimeSourceRef,
        entryId: handle.entryId,
        relativeEnvelopePath: `encrypted/${basename(handle.path)}`,
        envelopeFingerprint: handle.envelopeFingerprint,
        envelopeFileSha256: sha256File(handle.path),
        originalSha256: archiveIndex.entries.find((entry) => entry.path === artifact.archiveEntryPath).sha256,
      });
      fault(input, `AFTER_ARTIFACT_${ordinal}`);
    }

    // The handoff supplies these exact, reviewed bytes. Keep them encrypted in
    // the same atomic transaction, not in a plaintext post-import sidecar.
    const reviewMaterialBindings = [];
    for (const material of input.reviewMaterials ?? []) {
      if (!["DESCRIPTOR", "DATA_MAP", "HUMAN_REVIEW_RECEIPT", "CODE_MANIFEST"].includes(material.role) ||
          reviewMaterialBindings.some((binding) => binding.role === material.role)) fail("DOSSIER_REVIEW_MATERIAL_ROLE_INVALID");
      const bytes = Buffer.from(material.bytes);
      const document = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
      const fileSha256 = sha256Bytes(bytes);
      const canonicalFingerprint = dossierCanonicalFingerprintV3(document);
      if (fileSha256 !== material.fileSha256 || canonicalFingerprint !== material.canonicalFingerprint) fail("DOSSIER_REVIEW_MATERIAL_CHANGED");
      const handle = store.capture({
        plaintextUtf8: json({ role: material.role, bytesBase64: bytes.toString("base64") }),
        metadata: {
          providerKey: "PUBLIC_MARKET_DOSSIER", endpointClass: "OFFLINE_ARCHIVE_IMPORT",
          sessionReference: sessionId, requestKind: `REVIEW_${material.role}`,
          requestOrdinal: ++ordinal, capturedAt: custodyStartedAt,
        },
        disposition: "PROCESSED_SUCCESS",
      });
      reviewMaterialBindings.push({
        role: material.role, fileSha256, canonicalFingerprint,
        relativeEnvelopePath: `encrypted/${basename(handle.path)}`,
        envelopeFileSha256: sha256File(handle.path), envelopeFingerprint: handle.envelopeFingerprint,
      });
      const reopened = JSON.parse(input.quarantineModule.decryptProviderRawQuarantineEnvelopeV3(
        JSON.parse(readFileSync(handle.path, "utf8")), keyProtector,
      ));
      const reopenedBytes = Buffer.from(reopened.bytesBase64, "base64");
      if (sha256Bytes(reopenedBytes) !== fileSha256) fail("DOSSIER_REVIEW_MATERIAL_REOPEN_MISMATCH");
      reopenedBytes.fill(0);
      bytes.fill(0);
      fault(input, `AFTER_REVIEW_${material.role}`);
    }
    if (input.reviewMaterials !== undefined && reviewMaterialBindings.length !== 4) fail("DOSSIER_REVIEW_MATERIAL_SET_INCOMPLETE");

    const privateManifestMaterial = {
      manifestVersion: BROWSER_ASSISTED_DOSSIER_PRIVATE_MANIFEST_VERSION_V3,
      custodyVersion: input.contractModule.STAYOPTI_BROWSER_ASSISTED_DOSSIER_CUSTODY_VERSION_V3,
      sessionId,
      dossierId: input.descriptor.dossierId,
      archiveSha256: archiveIndex.archiveSha256,
      importedAt,
      custodyStartedAt,
      artifactBindings: bindings,
      ...(input.reviewMaterials === undefined ? {} : { reviewMaterialBindings }),
      alternativeScreenshotBindings: input.descriptor.alternatives.map((alternative) => ({
        localAlternativeRef: alternative.localAlternativeRef,
        screenshotEvidenceRefs: [...alternative.screenshotEvidenceRefs],
      })),
    };
    const privateManifestFingerprint = sha256Bytes(Buffer.from(JSON.stringify(stable(privateManifestMaterial))));
    const privateManifest = { ...privateManifestMaterial, privateManifestFingerprint };
    atomicExclusive(join(stagingRoot, "private-manifest.json"), json(privateManifest));
    fault(input, "AFTER_PRIVATE_MANIFEST");

    for (const binding of bindings) {
      const envelopePath = safeChild(stagingRoot, binding.relativeEnvelopePath);
      if (sha256File(envelopePath) !== binding.envelopeFileSha256) fail("DOSSIER_ENVELOPE_FILE_HASH_MISMATCH");
      const envelope = JSON.parse(readFileSync(envelopePath, "utf8"));
      const plaintext = input.quarantineModule.decryptProviderRawQuarantineEnvelopeV3(envelope, keyProtector);
      const decoded = JSON.parse(plaintext);
      const bytes = Buffer.from(decoded.bytesBase64, "base64");
      if (decoded.originalSha256 !== binding.originalSha256 || sha256Bytes(bytes) !== binding.originalSha256) fail("DOSSIER_CUSTODY_REOPEN_MISMATCH");
    }
    fault(input, "AFTER_REOPEN_VALIDATION");

    const descriptorFingerprint = sha256Bytes(Buffer.from(JSON.stringify(stable(input.descriptor))));
    const state = {
      stateVersion: BROWSER_ASSISTED_DOSSIER_STATE_VERSION_V3,
      custodyVersion: input.contractModule.STAYOPTI_BROWSER_ASSISTED_DOSSIER_CUSTODY_VERSION_V3,
      sessionId,
      dossierId: input.descriptor.dossierId,
      status: "FINALIZED_DIAGNOSTIC_ONLY",
      acquisitionMode: input.descriptor.acquisition.mode,
      descriptorFingerprint,
      archiveSha256: archiveIndex.archiveSha256,
      declaredCaptureTimesPreserved: true,
      declaredCaptureTimeSourcesPreserved: true,
      importedAt,
      custodyStartedAt,
      collectorCustodyBeginsAtImport: true,
      retroactiveCaptureCertification: false,
      retroactiveScenarioFreezeCertification: false,
      artifactCount: bindings.length,
      checksumCount: checksumEntries.length,
      screenshotCount: bindings.filter((entry) => entry.artifactKind === "SCREENSHOT").length,
      privateManifestFingerprint,
      ...(input.reviewMaterials === undefined ? {} : {
        reviewMaterialsRequired: true,
        reviewMaterialCount: reviewMaterialBindings.length,
      }),
      custodyIntegrityValidated: true,
      eligibility: "DIAGNOSTIC_ONLY",
      blindJudgmentEligible: false,
      v3ReplayEligible: false,
      automaticGoldenAdmission: false,
      ineligibilityReasons: [...input.descriptor.classification.ineligibilityReasons].sort(),
    };
    const stateContent = json(state);
    atomicExclusive(join(stagingRoot, "state-history", `session-state-r000001-${sha256Bytes(Buffer.from(stateContent)).slice(0, 16)}.json`), stateContent);
    atomicExclusive(join(stagingRoot, "session-state.recovery.json"), stateContent);
    atomicExclusive(join(stagingRoot, "session-state.json"), stateContent);
    fault(input, "BEFORE_FINAL_RENAME");
    if (existsSync(finalRoot)) fail("DOSSIER_CUSTODY_SESSION_EXISTS");
    renameSync(stagingRoot, finalRoot);
    return Object.freeze({
      sessionId,
      sessionRoot: finalRoot,
      archiveSha256: archiveIndex.archiveSha256,
      state,
      privateManifestFingerprint,
      artifactCount: state.artifactCount,
      checksumCount: state.checksumCount,
      screenshotCount: state.screenshotCount,
      automaticBlindJudgmentEligible: false,
      automaticReplayEligible: false,
      automaticGoldenAdmission: false,
    });
  } finally {
    if (existsSync(extractionRoot)) rmSync(extractionRoot, { recursive: true, force: true });
    if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true });
  }
}

export function reopenBrowserAssistedDossierCustodyV3(input) {
  const sessionRoot = resolve(input.sessionRoot);
  const state = JSON.parse(readFileSync(join(sessionRoot, "session-state.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(sessionRoot, "private-manifest.json"), "utf8"));
  if (state.stateVersion !== BROWSER_ASSISTED_DOSSIER_STATE_VERSION_V3 || state.status !== "FINALIZED_DIAGNOSTIC_ONLY") fail("DOSSIER_CUSTODY_STATE_INVALID");
  if (manifest.manifestVersion !== BROWSER_ASSISTED_DOSSIER_PRIVATE_MANIFEST_VERSION_V3 || manifest.privateManifestFingerprint !== state.privateManifestFingerprint) fail("DOSSIER_CUSTODY_MANIFEST_INVALID");
  if (manifest.sessionId !== state.sessionId || manifest.dossierId !== state.dossierId ||
      manifest.archiveSha256 !== state.archiveSha256 || manifest.importedAt !== state.importedAt ||
      manifest.custodyStartedAt !== state.custodyStartedAt ||
      !Array.isArray(manifest.artifactBindings) || manifest.artifactBindings.length !== state.artifactCount ||
      manifest.artifactBindings.filter((b) => b.artifactKind === "SCREENSHOT").length !== state.screenshotCount) fail("DOSSIER_CUSTODY_STATE_MANIFEST_MISMATCH");
  const material = { ...manifest };
  delete material.privateManifestFingerprint;
  if (sha256Bytes(Buffer.from(JSON.stringify(stable(material)))) !== manifest.privateManifestFingerprint) fail("DOSSIER_CUSTODY_MANIFEST_TAMPERED");
  const artifacts = [];
  for (const binding of manifest.artifactBindings) {
    const envelopePath = safeChild(sessionRoot, binding.relativeEnvelopePath);
    if (!existsSync(envelopePath) || sha256File(envelopePath) !== binding.envelopeFileSha256) fail("DOSSIER_CUSTODY_ENVELOPE_TAMPERED");
    const envelope = JSON.parse(readFileSync(envelopePath, "utf8"));
    const plaintext = input.quarantineModule.decryptProviderRawQuarantineEnvelopeV3(envelope, input.keyProtector);
    const decoded = JSON.parse(plaintext);
    const bytes = Buffer.from(decoded.bytesBase64, "base64");
    if (sha256Bytes(bytes) !== binding.originalSha256 || decoded.originalSha256 !== binding.originalSha256 ||
        decoded.originalByteLength !== bytes.length || decoded.evidenceRef !== binding.evidenceRef ||
        decoded.archiveEntryPath !== binding.archiveEntryPath || envelope.sessionReference !== state.sessionId ||
        envelope.requestKind !== `DOSSIER_${binding.artifactKind}` || envelope.capturedAt !== state.custodyStartedAt) fail("DOSSIER_CUSTODY_REOPEN_MISMATCH");
    artifacts.push(Object.freeze({
      evidenceRef: binding.evidenceRef,
      artifactKind: binding.artifactKind,
      alternativeRef: binding.alternativeRef,
      byteLength: bytes.length,
      sha256: binding.originalSha256,
    }));
    bytes.fill(0);
  }
  const reviewDocuments = {};
  const reviewMaterials = [];
  for (const binding of manifest.reviewMaterialBindings ?? []) {
    if (!["DESCRIPTOR", "DATA_MAP", "HUMAN_REVIEW_RECEIPT", "CODE_MANIFEST"].includes(binding.role) ||
        Object.hasOwn(reviewDocuments, binding.role)) fail("DOSSIER_REVIEW_MATERIAL_ROLE_INVALID");
    const path = safeChild(sessionRoot, binding.relativeEnvelopePath);
    if (!existsSync(path) || sha256File(path) !== binding.envelopeFileSha256) fail("DOSSIER_REVIEW_MATERIAL_TAMPERED");
    const decoded = JSON.parse(input.quarantineModule.decryptProviderRawQuarantineEnvelopeV3(
      JSON.parse(readFileSync(path, "utf8")), input.keyProtector,
    ));
    const bytes = Buffer.from(decoded.bytesBase64, "base64");
    const document = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
    if (decoded.role !== binding.role || sha256Bytes(bytes) !== binding.fileSha256 ||
        dossierCanonicalFingerprintV3(document) !== binding.canonicalFingerprint) fail("DOSSIER_REVIEW_MATERIAL_TAMPERED");
    reviewDocuments[binding.role] = document;
    reviewMaterials.push({ role: binding.role, fileSha256: binding.fileSha256, canonicalFingerprint: binding.canonicalFingerprint });
    bytes.fill(0);
  }
  if (state.reviewMaterialsRequired && (reviewMaterials.length !== 4 || state.reviewMaterialCount !== 4 ||
      dossierCanonicalFingerprintV3(reviewDocuments.DESCRIPTOR) !== state.descriptorFingerprint)) fail("DOSSIER_REVIEW_MATERIAL_SET_INCOMPLETE");
  if (state.reviewMaterialsRequired) {
    const descriptor = reviewDocuments.DESCRIPTOR;
    if (descriptor.sessionId !== state.sessionId || descriptor.dossierId !== state.dossierId ||
        descriptor.expectedArchiveSha256 !== state.archiveSha256 || descriptor.artifacts.length !== artifacts.length ||
        descriptor.classification.eligibility !== state.eligibility ||
        descriptor.acquisition.mode !== state.acquisitionMode ||
        new Set(manifest.artifactBindings.map((b) => b.evidenceRef)).size !== artifacts.length ||
        new Set(manifest.artifactBindings.map((b) => b.relativeEnvelopePath)).size !== artifacts.length) fail("DOSSIER_REVIEW_ARTIFACT_BINDING_MISMATCH");
    for (const source of descriptor.artifacts) {
      const binding = manifest.artifactBindings.find((b) => b.evidenceRef === source.evidenceRef);
      if (!binding || source.archiveEntryPath !== binding.archiveEntryPath || source.kind !== binding.artifactKind ||
          source.alternativeRef !== binding.alternativeRef || source.declaredCapturedAt !== binding.declaredCapturedAt ||
          source.captureTimeSourceRef !== binding.captureTimeSourceRef ||
          (source.expectedSha256 !== null && source.expectedSha256 !== binding.originalSha256)) fail("DOSSIER_REVIEW_ARTIFACT_BINDING_MISMATCH");
    }
    const expectedScreenshotBindings = descriptor.alternatives.map((a) => ({
      localAlternativeRef: a.localAlternativeRef, screenshotEvidenceRefs: [...a.screenshotEvidenceRefs],
    }));
    if (dossierCanonicalFingerprintV3(expectedScreenshotBindings) !== dossierCanonicalFingerprintV3(manifest.alternativeScreenshotBindings)) fail("DOSSIER_REVIEW_ARTIFACT_BINDING_MISMATCH");
  }
  // Private in-memory API output; the CLI emits only controlled verification
  // booleans/counts, never these documents or the source content.
  return Object.freeze({ state: Object.freeze(state), artifacts: Object.freeze(artifacts),
    reviewMaterials: Object.freeze(reviewMaterials), reviewDocuments: Object.freeze(reviewDocuments) });
}

export function sanitizedBrowserAssistedDossierCustodyProjectionV3(sessionRoot) {
  const root = resolve(sessionRoot);
  const state = JSON.parse(readFileSync(join(root, "session-state.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "private-manifest.json"), "utf8"));
  if (state.status !== "FINALIZED_DIAGNOSTIC_ONLY" || manifest.privateManifestFingerprint !== state.privateManifestFingerprint) fail("DOSSIER_CUSTODY_PROJECTION_SOURCE_INVALID");
  return Object.freeze({
    schemaVersion: "stayopti.v3.browser-assisted-dossier-custody-projection@1",
    sessionId: state.sessionId,
    archiveSha256: state.archiveSha256,
    acquisitionMode: state.acquisitionMode,
    importedAt: state.importedAt,
    custodyStartedAt: state.custodyStartedAt,
    custodyIntegrityValidated: true,
    eligibility: "DIAGNOSTIC_ONLY",
    automaticBlindJudgmentEligible: false,
    automaticReplayEligible: false,
    automaticGoldenAdmission: false,
    artifactBindings: Object.freeze(manifest.artifactBindings.map((binding) => Object.freeze({
      evidenceRef: binding.evidenceRef,
      artifactKind: binding.artifactKind,
      alternativeRef: binding.alternativeRef,
      originalSha256: binding.originalSha256,
      envelopeFingerprint: binding.envelopeFingerprint,
      envelopeFileSha256: binding.envelopeFileSha256,
    }))),
    alternativeScreenshotBindings: Object.freeze(manifest.alternativeScreenshotBindings.map((binding) => Object.freeze({
      localAlternativeRef: binding.localAlternativeRef,
      screenshotEvidenceRefs: Object.freeze([...binding.screenshotEvidenceRefs]),
    }))),
  });
}
