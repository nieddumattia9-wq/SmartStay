import { stableSerializeV3 } from "../contract/stableHashV3";

export const STAYOPTI_PROVIDER_RAW_QUARANTINE_SCHEMA_VERSION_V3 =
  "stayopti.v3.provider-raw-quarantine@1" as const;
export const STAYOPTI_PROVIDER_RAW_REPLAY_RECEIPT_VERSION_V3 =
  "stayopti.v3.provider-raw-replay-receipt@1" as const;
export const STAYOPTI_PROVIDER_RAW_SUCCESS_RETENTION_DAYS_V3 = 14 as const;
export const STAYOPTI_PROVIDER_RAW_FAILURE_RETENTION_DAYS_V3 = 90 as const;
export const STAYOPTI_PROVIDER_RAW_MANUAL_EXTENSION_DAYS_V3 = 90 as const;

export type StayOptiProviderRawDispositionV3 =
  | "PROCESSED_SUCCESS"
  | "UNRECOGNIZED_PARTIAL_OR_ERROR";

export type StayOptiProviderRawExtensionReasonV3 =
  | "PARSER_REPAIR"
  | "SCHEMA_AUDIT"
  | "PROVIDER_INCIDENT"
  | "LEGAL_RETENTION_REVIEW";

export interface StayOptiProviderRawKeyProtectorV3 {
  readonly protectionClass: "WINDOWS_CURRENT_USER_DPAPI" | "SYNTHETIC_TEST_ONLY";
  protectDataKey(dataKeyBase64: string): string;
  unprotectDataKey(protectedDataKey: string): string;
}

export interface StayOptiProviderRawQuarantineMetadataV3 {
  providerKey: string;
  endpointClass: string;
  sessionReference: string;
  requestKind: string;
  requestOrdinal: number;
  capturedAt: string;
}

export interface StayOptiProviderRawQuarantineEnvelopeV3 {
  schemaVersion: typeof STAYOPTI_PROVIDER_RAW_QUARANTINE_SCHEMA_VERSION_V3;
  entryId: string;
  providerKey: string;
  endpointClass: string;
  sessionReference: string;
  requestKind: string;
  requestOrdinal: number;
  capturedAt: string;
  expiresAt: string;
  disposition: StayOptiProviderRawDispositionV3;
  plaintextSha256: string;
  encryption: "AES_256_GCM";
  keyProtection: StayOptiProviderRawKeyProtectorV3["protectionClass"];
  protectedDataKey: string;
  ivBase64: string;
  authTagBase64: string;
  ciphertextBase64: string;
  envelopeFingerprint: string;
}

export interface StayOptiProviderRawRetentionExtensionReceiptV3 {
  receiptVersion: "stayopti.v3.provider-raw-retention-extension@1";
  entryId: string;
  extendedAt: string;
  previousExpiresAt: string;
  newExpiresAt: string;
  extensionDays: typeof STAYOPTI_PROVIDER_RAW_MANUAL_EXTENSION_DAYS_V3;
  reason: StayOptiProviderRawExtensionReasonV3;
  previousEnvelopeFingerprint: string;
  newEnvelopeFingerprint: string;
}

export interface StayOptiProviderRawPurgeReceiptV3 {
  receiptVersion: "stayopti.v3.provider-raw-expiry-purge@1";
  entryId: string;
  evaluatedAt: string;
  expiresAt: string;
  action: "PURGE" | "RETAIN";
}

interface NodeHashV3 {
  update(value: string | Uint8Array, encoding?: "utf8"): NodeHashV3;
  digest(encoding: "hex"): string;
}

interface NodeCipherV3 {
  setAAD(value: Uint8Array): void;
  update(value: string, inputEncoding: "utf8"): Uint8Array;
  final(): Uint8Array;
  getAuthTag(): Uint8Array;
}

interface NodeDecipherV3 {
  setAAD(value: Uint8Array): void;
  setAuthTag(value: Uint8Array): void;
  update(value: Uint8Array): Uint8Array;
  final(): Uint8Array;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeHashV3;
  randomBytes(size: number): Uint8Array;
  createCipheriv(algorithm: "aes-256-gcm", key: Uint8Array, iv: Uint8Array): NodeCipherV3;
  createDecipheriv(algorithm: "aes-256-gcm", key: Uint8Array, iv: Uint8Array): NodeDecipherV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

function nodeCryptoV3() {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (
    typeof cryptoModule?.createHash !== "function" ||
    typeof cryptoModule.randomBytes !== "function" ||
    typeof cryptoModule.createCipheriv !== "function" ||
    typeof cryptoModule.createDecipheriv !== "function"
  ) {
    throw new Error("PROVIDER_RAW_QUARANTINE_NODE_CRYPTO_REQUIRED");
  }
  return cryptoModule;
}

function sha256(value: string | Uint8Array) {
  return nodeCryptoV3().createHash("sha256").update(value, typeof value === "string" ? "utf8" : undefined).digest("hex");
}

function concatBytes(...parts: readonly Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    binary += String.fromCharCode(...value.subarray(offset, Math.min(value.length, offset + 0x8000)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("PROVIDER_RAW_QUARANTINE_BASE64_INVALID");
  }
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) result[index] = binary.charCodeAt(index);
  return result;
}

function parseIso(value: string, code: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(code);
  return parsed;
}

function assertControlledLabel(value: string, code: string) {
  if (!/^[A-Z][A-Z0-9_.-]{0,79}$/.test(value)) throw new Error(code);
}

function assertSecretFreeRaw(value: string) {
  const prohibited = [
    /(?:^|[?&"'\s])api[_-]?key(?:["'\s]*[:=])["']?(?!\[REDACTED\])[^&\s"']+/i,
    /authorization\s*[:=]\s*["']?(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+/i,
    /"(?:access_token|refresh_token|client_secret|password)"\s*:\s*"[^"\s]+"/i,
  ];
  if (prohibited.some((pattern) => pattern.test(value))) {
    throw new Error("PROVIDER_RAW_QUARANTINE_SECRET_MATERIAL_REJECTED");
  }
}

function retentionDays(disposition: StayOptiProviderRawDispositionV3) {
  return disposition === "PROCESSED_SUCCESS"
    ? STAYOPTI_PROVIDER_RAW_SUCCESS_RETENTION_DAYS_V3
    : STAYOPTI_PROVIDER_RAW_FAILURE_RETENTION_DAYS_V3;
}

function plusDays(iso: string, days: number) {
  return new Date(parseIso(iso, "PROVIDER_RAW_QUARANTINE_TIMESTAMP_INVALID") + days * 86_400_000).toISOString();
}

function envelopeMaterial(envelope: Omit<StayOptiProviderRawQuarantineEnvelopeV3, "envelopeFingerprint">) {
  return stableSerializeV3(envelope);
}

function withoutFingerprint(envelope: StayOptiProviderRawQuarantineEnvelopeV3) {
  const { envelopeFingerprint: _ignored, ...rest } = envelope;
  return rest;
}

function aadHeader(envelope: Pick<
  StayOptiProviderRawQuarantineEnvelopeV3,
  | "schemaVersion" | "entryId" | "providerKey" | "endpointClass"
  | "sessionReference" | "requestKind" | "requestOrdinal" | "capturedAt"
  | "expiresAt" | "disposition" | "plaintextSha256" | "encryption"
  | "keyProtection" | "protectedDataKey"
>) {
  return {
    schemaVersion: envelope.schemaVersion,
    entryId: envelope.entryId,
    providerKey: envelope.providerKey,
    endpointClass: envelope.endpointClass,
    sessionReference: envelope.sessionReference,
    requestKind: envelope.requestKind,
    requestOrdinal: envelope.requestOrdinal,
    capturedAt: envelope.capturedAt,
    expiresAt: envelope.expiresAt,
    disposition: envelope.disposition,
    plaintextSha256: envelope.plaintextSha256,
    encryption: envelope.encryption,
    keyProtection: envelope.keyProtection,
    protectedDataKey: envelope.protectedDataKey,
  };
}

function assertEnvelope(envelope: StayOptiProviderRawQuarantineEnvelopeV3) {
  if (envelope.schemaVersion !== STAYOPTI_PROVIDER_RAW_QUARANTINE_SCHEMA_VERSION_V3) throw new Error("PROVIDER_RAW_QUARANTINE_SCHEMA_UNSUPPORTED");
  if (!/^RAWQ_[A-F0-9]{32}$/.test(envelope.entryId)) throw new Error("PROVIDER_RAW_QUARANTINE_ENTRY_ID_INVALID");
  assertControlledLabel(envelope.providerKey, "PROVIDER_RAW_QUARANTINE_PROVIDER_KEY_INVALID");
  assertControlledLabel(envelope.endpointClass, "PROVIDER_RAW_QUARANTINE_ENDPOINT_CLASS_INVALID");
  assertControlledLabel(envelope.sessionReference, "PROVIDER_RAW_QUARANTINE_SESSION_REFERENCE_INVALID");
  assertControlledLabel(envelope.requestKind, "PROVIDER_RAW_QUARANTINE_REQUEST_KIND_INVALID");
  if (!Number.isInteger(envelope.requestOrdinal) || envelope.requestOrdinal < 1) throw new Error("PROVIDER_RAW_QUARANTINE_REQUEST_ORDINAL_INVALID");
  parseIso(envelope.capturedAt, "PROVIDER_RAW_QUARANTINE_TIMESTAMP_INVALID");
  parseIso(envelope.expiresAt, "PROVIDER_RAW_QUARANTINE_EXPIRY_INVALID");
  if (envelope.encryption !== "AES_256_GCM") throw new Error("PROVIDER_RAW_QUARANTINE_ENCRYPTION_INVALID");
  if (!/^[a-f0-9]{64}$/.test(envelope.plaintextSha256) || !/^[a-f0-9]{64}$/.test(envelope.envelopeFingerprint)) throw new Error("PROVIDER_RAW_QUARANTINE_FINGERPRINT_INVALID");
  if (envelope.envelopeFingerprint !== sha256(envelopeMaterial(withoutFingerprint(envelope)))) throw new Error("PROVIDER_RAW_QUARANTINE_ENVELOPE_TAMPERED");
}

export function createProviderRawQuarantineEnvelopeV3(input: {
  plaintextUtf8: string;
  metadata: StayOptiProviderRawQuarantineMetadataV3;
  disposition: StayOptiProviderRawDispositionV3;
  keyProtector: StayOptiProviderRawKeyProtectorV3;
}): StayOptiProviderRawQuarantineEnvelopeV3 {
  assertSecretFreeRaw(input.plaintextUtf8);
  assertControlledLabel(input.metadata.providerKey, "PROVIDER_RAW_QUARANTINE_PROVIDER_KEY_INVALID");
  assertControlledLabel(input.metadata.endpointClass, "PROVIDER_RAW_QUARANTINE_ENDPOINT_CLASS_INVALID");
  assertControlledLabel(input.metadata.sessionReference, "PROVIDER_RAW_QUARANTINE_SESSION_REFERENCE_INVALID");
  assertControlledLabel(input.metadata.requestKind, "PROVIDER_RAW_QUARANTINE_REQUEST_KIND_INVALID");
  if (!Number.isInteger(input.metadata.requestOrdinal) || input.metadata.requestOrdinal < 1) throw new Error("PROVIDER_RAW_QUARANTINE_REQUEST_ORDINAL_INVALID");
  parseIso(input.metadata.capturedAt, "PROVIDER_RAW_QUARANTINE_TIMESTAMP_INVALID");
  return encryptProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: input.plaintextUtf8,
    metadata: input.metadata,
    disposition: input.disposition,
    expiresAt: plusDays(input.metadata.capturedAt, retentionDays(input.disposition)),
    keyProtector: input.keyProtector,
  });
}

function encryptProviderRawQuarantineEnvelopeV3(input: {
  plaintextUtf8: string;
  metadata: StayOptiProviderRawQuarantineMetadataV3;
  disposition: StayOptiProviderRawDispositionV3;
  expiresAt: string;
  keyProtector: StayOptiProviderRawKeyProtectorV3;
  entryId?: string;
}) {
  assertSecretFreeRaw(input.plaintextUtf8);
  const crypto = nodeCryptoV3();
  const dataKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const protectedDataKey = input.keyProtector.protectDataKey(bytesToBase64(dataKey));
  if (protectedDataKey.length < 16 || /\s/.test(protectedDataKey)) throw new Error("PROVIDER_RAW_QUARANTINE_PROTECTED_KEY_INVALID");
  const entryId = input.entryId ?? `RAWQ_${sha256(crypto.randomBytes(32)).slice(0, 32).toUpperCase()}`;
  const header = aadHeader({
    schemaVersion: STAYOPTI_PROVIDER_RAW_QUARANTINE_SCHEMA_VERSION_V3,
    entryId,
    ...input.metadata,
    expiresAt: input.expiresAt,
    disposition: input.disposition,
    plaintextSha256: sha256(input.plaintextUtf8),
    encryption: "AES_256_GCM",
    keyProtection: input.keyProtector.protectionClass,
    protectedDataKey,
  });
  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
  cipher.setAAD(new TextEncoder().encode(stableSerializeV3(header)));
  const ciphertext = concatBytes(cipher.update(input.plaintextUtf8, "utf8"), cipher.final());
  dataKey.fill(0);
  const body = {
    ...header,
    ivBase64: bytesToBase64(iv),
    authTagBase64: bytesToBase64(cipher.getAuthTag()),
    ciphertextBase64: bytesToBase64(ciphertext),
  };
  return { ...body, envelopeFingerprint: sha256(envelopeMaterial(body)) };
}

export function decryptProviderRawQuarantineEnvelopeV3(
  envelope: StayOptiProviderRawQuarantineEnvelopeV3,
  keyProtector: StayOptiProviderRawKeyProtectorV3,
) {
  assertEnvelope(envelope);
  if (envelope.keyProtection !== keyProtector.protectionClass) throw new Error("PROVIDER_RAW_QUARANTINE_KEY_PROTECTION_MISMATCH");
  const key = base64ToBytes(keyProtector.unprotectDataKey(envelope.protectedDataKey));
  if (key.length !== 32) throw new Error("PROVIDER_RAW_QUARANTINE_DATA_KEY_INVALID");
  try {
    const decipher = nodeCryptoV3().createDecipheriv("aes-256-gcm", key, base64ToBytes(envelope.ivBase64));
    decipher.setAAD(new TextEncoder().encode(stableSerializeV3(aadHeader(envelope))));
    decipher.setAuthTag(base64ToBytes(envelope.authTagBase64));
    const plaintextBytes = concatBytes(decipher.update(base64ToBytes(envelope.ciphertextBase64)), decipher.final());
    const plaintext = new TextDecoder("utf-8", { fatal: true }).decode(plaintextBytes);
    plaintextBytes.fill(0);
    if (sha256(plaintext) !== envelope.plaintextSha256) throw new Error("PROVIDER_RAW_QUARANTINE_PLAINTEXT_HASH_MISMATCH");
    return plaintext;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PROVIDER_RAW_QUARANTINE_")) throw error;
    throw new Error("PROVIDER_RAW_QUARANTINE_AUTHENTICATION_FAILED");
  } finally {
    key.fill(0);
  }
}

export function reclassifyProviderRawQuarantineEnvelopeV3(input: {
  envelope: StayOptiProviderRawQuarantineEnvelopeV3;
  disposition: StayOptiProviderRawDispositionV3;
  keyProtector: StayOptiProviderRawKeyProtectorV3;
}) {
  const plaintext = decryptProviderRawQuarantineEnvelopeV3(input.envelope, input.keyProtector);
  return encryptProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: plaintext,
    disposition: input.disposition,
    expiresAt: plusDays(input.envelope.capturedAt, retentionDays(input.disposition)),
    keyProtector: input.keyProtector,
    entryId: input.envelope.entryId,
    metadata: {
      providerKey: input.envelope.providerKey,
      endpointClass: input.envelope.endpointClass,
      sessionReference: input.envelope.sessionReference,
      requestKind: input.envelope.requestKind,
      requestOrdinal: input.envelope.requestOrdinal,
      capturedAt: input.envelope.capturedAt,
    },
  });
}

export function extendProviderRawQuarantineRetentionV3(input: {
  envelope: StayOptiProviderRawQuarantineEnvelopeV3;
  extendedAt: string;
  reason: StayOptiProviderRawExtensionReasonV3;
  keyProtector: StayOptiProviderRawKeyProtectorV3;
}) {
  if (!( ["PARSER_REPAIR", "SCHEMA_AUDIT", "PROVIDER_INCIDENT", "LEGAL_RETENTION_REVIEW"] as string[]).includes(input.reason)) {
    throw new Error("PROVIDER_RAW_QUARANTINE_EXTENSION_REASON_INVALID");
  }
  const extendedAt = parseIso(input.extendedAt, "PROVIDER_RAW_QUARANTINE_EXTENSION_TIMESTAMP_INVALID");
  const previousExpiry = parseIso(input.envelope.expiresAt, "PROVIDER_RAW_QUARANTINE_EXPIRY_INVALID");
  if (extendedAt >= previousExpiry) throw new Error("PROVIDER_RAW_QUARANTINE_EXTENSION_AFTER_EXPIRY_PROHIBITED");
  const plaintext = decryptProviderRawQuarantineEnvelopeV3(input.envelope, input.keyProtector);
  const newExpiresAt = new Date(previousExpiry + STAYOPTI_PROVIDER_RAW_MANUAL_EXTENSION_DAYS_V3 * 86_400_000).toISOString();
  const output = encryptProviderRawQuarantineEnvelopeV3({
    plaintextUtf8: plaintext,
    disposition: input.envelope.disposition,
    expiresAt: newExpiresAt,
    keyProtector: input.keyProtector,
    entryId: input.envelope.entryId,
    metadata: {
      providerKey: input.envelope.providerKey,
      endpointClass: input.envelope.endpointClass,
      sessionReference: input.envelope.sessionReference,
      requestKind: input.envelope.requestKind,
      requestOrdinal: input.envelope.requestOrdinal,
      capturedAt: input.envelope.capturedAt,
    },
  });
  const receipt: StayOptiProviderRawRetentionExtensionReceiptV3 = {
    receiptVersion: "stayopti.v3.provider-raw-retention-extension@1",
    entryId: input.envelope.entryId,
    extendedAt: input.extendedAt,
    previousExpiresAt: input.envelope.expiresAt,
    newExpiresAt,
    extensionDays: STAYOPTI_PROVIDER_RAW_MANUAL_EXTENSION_DAYS_V3,
    reason: input.reason,
    previousEnvelopeFingerprint: input.envelope.envelopeFingerprint,
    newEnvelopeFingerprint: output.envelopeFingerprint,
  };
  return { envelope: output, receipt };
}

export function evaluateProviderRawQuarantineExpiryV3(
  envelope: StayOptiProviderRawQuarantineEnvelopeV3,
  evaluatedAt: string,
): StayOptiProviderRawPurgeReceiptV3 {
  assertEnvelope(envelope);
  const now = parseIso(evaluatedAt, "PROVIDER_RAW_QUARANTINE_PURGE_TIMESTAMP_INVALID");
  return {
    receiptVersion: "stayopti.v3.provider-raw-expiry-purge@1",
    entryId: envelope.entryId,
    evaluatedAt,
    expiresAt: envelope.expiresAt,
    action: now >= Date.parse(envelope.expiresAt) ? "PURGE" : "RETAIN",
  };
}

export function validateProviderRawQuarantineEnvelopeV3(envelope: StayOptiProviderRawQuarantineEnvelopeV3) {
  try {
    assertEnvelope(envelope);
    return { valid: true as const, issues: [] as string[] };
  } catch (error) {
    return { valid: false as const, issues: [error instanceof Error ? error.message : "PROVIDER_RAW_QUARANTINE_INVALID"] };
  }
}
