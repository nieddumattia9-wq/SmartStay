import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const DPAPI_SCRIPT = resolve(import.meta.dirname, "protect-v3-provider-raw-key-dpapi.ps1");
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function fail(code) { throw new Error(code); }

function assertOutsideRepository(repositoryRoot, target) {
  const absolute = resolve(target);
  if (!isAbsolute(absolute)) fail("PROVIDER_RAW_QUARANTINE_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(resolve(repositoryRoot), absolute);
  if (relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation))) {
    fail("PROVIDER_RAW_QUARANTINE_REPOSITORY_PATH_PROHIBITED");
  }
  return absolute;
}

function invokeDpapi(mode, inputBase64) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(inputBase64)) fail("PROVIDER_RAW_DPAPI_INPUT_INVALID");
  const result = spawnSync(PS51, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", DPAPI_SCRIPT, "-Mode", mode,
  ], {
    input: `${inputBase64}\n`,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0 || result.stderr !== "" || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.stdout)) fail("PROVIDER_RAW_DPAPI_OPERATION_FAILED");
  return result.stdout;
}

export function createWindowsCurrentUserDpapiProtectorV3() {
  return Object.freeze({
    protectionClass: "WINDOWS_CURRENT_USER_DPAPI",
    protectDataKey(value) { return invokeDpapi("Protect", value); },
    unprotectDataKey(value) { return invokeDpapi("Unprotect", value); },
  });
}

function atomicWriteJson(path, value, replace = false) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  const backup = `${path}.previous`;
  writeFileSync(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    if (!replace && existsSync(path)) fail("PROVIDER_RAW_QUARANTINE_ENTRY_EXISTS");
    if (replace && existsSync(path)) {
      if (existsSync(backup)) fail("PROVIDER_RAW_QUARANTINE_RECOVERY_REQUIRED");
      renameSync(path, backup);
    }
    renameSync(temporary, path);
    rmSync(backup, { force: true });
  } catch (error) {
    if (!existsSync(path) && existsSync(backup)) renameSync(backup, path);
    throw error;
  } finally {
    rmSync(temporary, { force: true });
  }
}

function readEnvelope(path, quarantine) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const validation = quarantine.validateProviderRawQuarantineEnvelopeV3(parsed);
  if (!validation.valid) fail(validation.issues[0] ?? "PROVIDER_RAW_QUARANTINE_ENVELOPE_INVALID");
  return parsed;
}

export function createProviderRawQuarantineStoreV3(input) {
  const root = assertOutsideRepository(input.repositoryRoot, input.root);
  const quarantine = input.quarantineModule;
  const keyProtector = input.keyProtector ?? createWindowsCurrentUserDpapiProtectorV3();
  mkdirSync(root, { recursive: true });
  const probe = randomBytes(32).toString("base64");
  if (keyProtector.unprotectDataKey(keyProtector.protectDataKey(probe)) !== probe) fail("PROVIDER_RAW_DPAPI_ROUNDTRIP_FAILED");

  const pathFor = (entryId) => join(root, `${entryId}.stayopti-rawq`);
  return Object.freeze({
    root,
    protectionReady: true,
    keyProtection: keyProtector.protectionClass,
    capture(capture) {
      const envelope = quarantine.createProviderRawQuarantineEnvelopeV3({ ...capture, keyProtector });
      const path = pathFor(envelope.entryId);
      atomicWriteJson(path, envelope);
      return Object.freeze({ entryId: envelope.entryId, path, envelopeFingerprint: envelope.envelopeFingerprint });
    },
    markProcessedSuccess(handle) {
      const current = readEnvelope(handle.path, quarantine);
      const replacement = quarantine.reclassifyProviderRawQuarantineEnvelopeV3({
        envelope: current,
        disposition: "PROCESSED_SUCCESS",
        keyProtector,
      });
      atomicWriteJson(handle.path, replacement, true);
      return Object.freeze({ entryId: replacement.entryId, path: handle.path, envelopeFingerprint: replacement.envelopeFingerprint });
    },
    replay(handle, replayFunction) {
      const envelope = readEnvelope(handle.path, quarantine);
      return replayFunction(envelope, keyProtector);
    },
    extend(handle, extendedAt, reason) {
      const envelope = readEnvelope(handle.path, quarantine);
      const result = quarantine.extendProviderRawQuarantineRetentionV3({ envelope, extendedAt, reason, keyProtector });
      atomicWriteJson(handle.path, result.envelope, true);
      return result.receipt;
    },
    purgeExpired(evaluatedAt) {
      const receipts = [];
      for (const name of readdirSync(root).filter((name) => name.endsWith(".stayopti-rawq")).sort()) {
        const path = join(root, name);
        const envelope = readEnvelope(path, quarantine);
        const receipt = quarantine.evaluateProviderRawQuarantineExpiryV3(envelope, evaluatedAt);
        if (receipt.action === "PURGE") rmSync(path, { force: true });
        receipts.push(receipt);
      }
      return receipts;
    },
  });
}
