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

export const MANUAL_MARKET_STATE_VERSION_V2 = "stayopti.v3.manual-public-market-canary-state@2";
export const MANUAL_MARKET_PRIVATE_MANIFEST_VERSION_V2 = "stayopti.v3.manual-public-market-private-manifest@2";
export const LEGACY_DIAGNOSTIC_SESSION_IDS_V2 = Object.freeze([
  "V3_17T5B_FLORENCE_20261015_001",
  "V3_17T5B_FLORENCE_20261015_002",
]);

function fail(code) { throw new Error(code); }
export function sha256FileV2(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function sha256Text(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

export function validateSuccessorSessionIdV2(value) {
  if (typeof value !== "string" || !/^V3_17T5[A-Z0-9_]+$/.test(value)) fail("MANUAL_CAPTURE_SUCCESSOR_SESSION_ID_REQUIRED");
  if (LEGACY_DIAGNOSTIC_SESSION_IDS_V2.includes(value)) fail("MANUAL_CAPTURE_LEGACY_DIAGNOSTIC_SESSION_IMMUTABLE");
  return value;
}

export function createManualMarketSessionPathsV2(privateRoot, sessionId) {
  const acceptedSessionId = validateSuccessorSessionIdV2(sessionId);
  const root = resolve(privateRoot);
  const sessionRoot = resolve(root, acceptedSessionId);
  const relation = relative(root, sessionRoot);
  if (relation === "" || relation.startsWith(`..${sep}`) || relation === ".." || isAbsolute(relation)) fail("MANUAL_CAPTURE_SESSION_PATH_INVALID");
  return Object.freeze({
    privateRoot: root,
    sessionId: acceptedSessionId,
    sessionRoot,
    encryptedRoot: join(sessionRoot, "encrypted"),
    statePath: join(sessionRoot, "session-state.json"),
    stateRecoveryPath: join(sessionRoot, "session-state.recovery.json"),
    stateHistoryRoot: join(sessionRoot, "state-history"),
    privateManifestPath: join(sessionRoot, "private-manifest.json"),
    privateManifestHistoryRoot: join(sessionRoot, "private-manifest-history"),
  });
}

function atomicReplace(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  const displaced = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.displaced`;
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
  try {
    if (existsSync(path)) renameSync(path, displaced);
    renameSync(temporary, path);
    rmSync(displaced, { force: true });
  } catch (error) {
    if (!existsSync(path) && existsSync(displaced)) renameSync(displaced, path);
    throw error;
  } finally {
    rmSync(temporary, { force: true });
  }
}

function writeImmutable(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, content, { encoding: "utf8", flag: "wx" });
  else if (readFileSync(path, "utf8") !== content) fail("MANUAL_CAPTURE_IMMUTABLE_HISTORY_COLLISION");
}

export function persistVersionedSessionStateV2(paths, state) {
  if (state.sessionId !== paths.sessionId) fail("MANUAL_CAPTURE_STATE_SESSION_ID_MISMATCH");
  const next = {
    ...state,
    stateVersion: MANUAL_MARKET_STATE_VERSION_V2,
    stateRevision: Number.isInteger(state.stateRevision) ? state.stateRevision + 1 : 1,
    updatedAt: new Date().toISOString(),
  };
  const serialized = json(next);
  const fingerprint = sha256Text(serialized);
  const historyPath = join(paths.stateHistoryRoot, `session-state-r${String(next.stateRevision).padStart(6, "0")}-${fingerprint.slice(0, 16)}.json`);
  writeImmutable(historyPath, serialized);
  if (existsSync(paths.statePath)) atomicReplace(paths.stateRecoveryPath, readFileSync(paths.statePath, "utf8"));
  atomicReplace(paths.statePath, serialized);
  Object.assign(state, next);
  return Object.freeze({ stateRevision: next.stateRevision, stateFingerprint: fingerprint, historyPath });
}

function evidenceBinding(paths, localCaptureId, kind, handle) {
  if (!handle || typeof handle.path !== "string" || !existsSync(handle.path) || !statSync(handle.path).isFile()) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_MISSING");
  const resolved = resolve(handle.path);
  const expectedParent = resolve(paths.encryptedRoot);
  if (resolve(dirname(resolved)) !== expectedParent || !basename(resolved).endsWith(".stayopti-rawq")) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_OUTSIDE_SESSION");
  const parsed = JSON.parse(readFileSync(resolved, "utf8"));
  if (parsed?.entryId !== handle.entryId || parsed?.envelopeFingerprint !== handle.envelopeFingerprint) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_HANDLE_MISMATCH");
  if (parsed?.sessionReference !== paths.sessionId || parsed?.requestKind !== kind) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_METADATA_MISMATCH");
  return Object.freeze({
    evidenceKind: kind,
    requestOrdinal: parsed.requestOrdinal,
    entryId: handle.entryId,
    relativePath: `encrypted/${basename(resolved)}`,
    envelopeFingerprint: handle.envelopeFingerprint,
    envelopeFileSha256: sha256FileV2(resolved),
    localCaptureId,
  });
}

function privateManifestMaterial(paths, state) {
  const alternativeBindings = state.alternatives.map((alternative) => {
    const id = alternative?.publicData?.localCaptureId;
    if (typeof id !== "string") fail("MANUAL_CAPTURE_LOCAL_ALTERNATIVE_ID_MISSING");
    const evidence = alternative.privateEvidence;
    if (!evidence?.realName || !evidence?.sourceUrl || !evidence?.screenshot) fail("MANUAL_CAPTURE_THREE_PRIVATE_ENVELOPES_REQUIRED");
    return {
      localCaptureId: id,
      envelopes: [
        evidenceBinding(paths, id, "PROPERTY_NAME", evidence.realName),
        evidenceBinding(paths, id, "SOURCE_URL", evidence.sourceUrl),
        evidenceBinding(paths, id, "SCREENSHOT", evidence.screenshot),
      ],
    };
  });
  return {
    manifestVersion: MANUAL_MARKET_PRIVATE_MANIFEST_VERSION_V2,
    sessionId: paths.sessionId,
    stateVersion: MANUAL_MARKET_STATE_VERSION_V2,
    alternativeBindings,
    createdAt: state.collectionWindowStart,
  };
}

export function persistPrivateManifestV2(paths, state) {
  const material = privateManifestMaterial(paths, state);
  const materialSerialized = json(material);
  const manifestFingerprint = sha256Text(materialSerialized);
  const manifest = { ...material, manifestFingerprint };
  const serialized = json(manifest);
  const fileSha256 = sha256Text(serialized);
  const historyPath = join(paths.privateManifestHistoryRoot, `private-manifest-a${String(state.alternatives.length).padStart(2, "0")}-${fileSha256.slice(0, 16)}.json`);
  writeImmutable(historyPath, serialized);
  atomicReplace(paths.privateManifestPath, serialized);
  state.privateManifestFingerprint = manifestFingerprint;
  state.privateManifestFileSha256 = fileSha256;
  return Object.freeze({ manifest, manifestFingerprint, fileSha256, historyPath });
}

export function readAndVerifyPrivateManifestV2(paths, state) {
  if (!existsSync(paths.privateManifestPath)) fail("MANUAL_CAPTURE_PRIVATE_MANIFEST_MISSING");
  const serialized = readFileSync(paths.privateManifestPath, "utf8");
  const manifest = JSON.parse(serialized);
  const material = { ...manifest };
  delete material.manifestFingerprint;
  const expectedFingerprint = sha256Text(json(material));
  if (manifest.manifestVersion !== MANUAL_MARKET_PRIVATE_MANIFEST_VERSION_V2
    || manifest.sessionId !== paths.sessionId
    || manifest.stateVersion !== MANUAL_MARKET_STATE_VERSION_V2
    || manifest.manifestFingerprint !== expectedFingerprint
    || state.privateManifestFingerprint !== expectedFingerprint
    || state.privateManifestFileSha256 !== sha256Text(serialized)) fail("MANUAL_CAPTURE_PRIVATE_MANIFEST_INTEGRITY_FAILED");
  if (!Array.isArray(manifest.alternativeBindings) || manifest.alternativeBindings.length !== state.alternatives.length) fail("MANUAL_CAPTURE_PRIVATE_MANIFEST_ALTERNATIVE_COUNT_MISMATCH");
  for (const binding of manifest.alternativeBindings) {
    if (!Array.isArray(binding.envelopes) || binding.envelopes.length !== 3) fail("MANUAL_CAPTURE_THREE_PRIVATE_ENVELOPES_REQUIRED");
    for (const envelope of binding.envelopes) {
      if (!/^[a-f0-9]{64}$/.test(envelope.envelopeFingerprint) || !/^[a-f0-9]{64}$/.test(envelope.envelopeFileSha256)) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_FINGERPRINT_INVALID");
      const path = resolve(paths.sessionRoot, envelope.relativePath);
      if (!path.startsWith(`${resolve(paths.encryptedRoot)}${sep}`) || !existsSync(path) || sha256FileV2(path) !== envelope.envelopeFileSha256) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_FILE_INTEGRITY_FAILED");
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      if (parsed?.entryId !== envelope.entryId || parsed?.envelopeFingerprint !== envelope.envelopeFingerprint || parsed?.sessionReference !== paths.sessionId || parsed?.requestKind !== envelope.evidenceKind) fail("MANUAL_CAPTURE_PRIVATE_ENVELOPE_BINDING_INVALID");
    }
  }
  return Object.freeze({ manifest, manifestFileSha256: sha256Text(serialized) });
}

export function sanitizedEnvelopeFingerprintProjectionV2(manifest) {
  return Object.freeze({
    schemaVersion: "stayopti.v3.manual-public-market-envelope-fingerprint-projection@1",
    linkageScope: "FILE_BY_FILE_NON_IDENTIFYING_HASH_BINDING",
    alternativeBindings: manifest.alternativeBindings.map((binding) => ({
      localCaptureId: binding.localCaptureId,
      envelopes: binding.envelopes.map((entry) => ({
        evidenceKind: entry.evidenceKind,
        envelopeFingerprint: entry.envelopeFingerprint,
        envelopeFileSha256: entry.envelopeFileSha256,
      })),
    })),
  });
}
