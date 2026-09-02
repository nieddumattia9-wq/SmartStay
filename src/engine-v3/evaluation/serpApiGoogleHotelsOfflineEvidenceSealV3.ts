import { stableSerializeV3 } from "../contract/stableHashV3";

export const STAYOPTI_SERPAPI_OFFLINE_EVIDENCE_SEAL_VERSION_V3 =
  "stayopti.v3.serpapi-repaired-detail-offline-evidence-seal@1" as const;
export const STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3 =
  "2ec5cdaf314b363e2b48dbf856badd9c78591f66" as const;
export const STAYOPTI_SERPAPI_T2D_PARENT_SHA_V3 =
  "5c4f2b36568fa825599a62f25e2d2c18b52fb085" as const;
export const STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3 =
  "647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e" as const;
export const STAYOPTI_SERPAPI_T2E_ROOT_CAUSE_V3 =
  "VALID_UNSUPPORTED_UNWRAPPED_PROPERTY_DETAIL_SHAPE" as const;
export const STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-private-replay-parser@2" as const;

export const STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3 = Object.freeze([
  "seal-manifest.json",
  "source-evidence-reference.json",
  "encrypted-raw-integrity-receipt.json",
  "repair-commit-receipt.json",
  "parser-version-receipt.json",
  "parser-schema-fingerprint.json",
  "replay-before-repair.json",
  "replay-after-repair.json",
  "root-cause-receipt.json",
  "provider-neutrality-receipt.json",
  "price-semantics-receipt.json",
  "security-scan-receipt.json",
  "regression-receipt.json",
  "final-decision.json",
] as const);

export const STAYOPTI_SERPAPI_T2E_ARTIFACTS_V3 = Object.freeze([
  ...STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3,
  "checksums.sha256",
] as const);

export interface StayOptiSerpApiOfflineEvidenceSealEntryV3 {
  readonly name: typeof STAYOPTI_SERPAPI_T2E_ARTIFACTS_V3[number];
  readonly content: string;
}

export interface StayOptiSerpApiOfflineEvidenceSealInputV3 {
  readonly sealedAt: string;
  readonly sessionFingerprint: string;
  readonly encryptedRawSha256: readonly [string, string];
  readonly encryptedRawEnvelopeFingerprints: readonly [string, string];
  readonly observedReplaySchemaFingerprint: string;
  readonly resultCount: 29;
  readonly mergedDetailCount: 1;
  readonly targetedTests: string;
  readonly engineV3Regression: string;
  readonly engineV2Regression: string;
  readonly typescriptCompile: "PASS";
  readonly powershell51Parse: "PASS";
  readonly secretScan: "PASS";
  readonly rawDataScan: "PASS";
  readonly rawIdTokenScan: "PASS";
  readonly licenseProvenanceScan: "PASS";
}

export interface StayOptiSerpApiOfflineEvidenceSealValidationV3 {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly artifactCount: number;
  readonly checksumCount: number;
  readonly sealContextHash: string | null;
}

interface NodeHashV3 {
  update(value: string, encoding: "utf8"): NodeHashV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeHashV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

function nodeCryptoV3() {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") throw new Error("SERPAPI_T2E_NODE_CRYPTO_REQUIRED");
  return cryptoModule;
}

function sha256TextV3(value: string) {
  return nodeCryptoV3().createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256ObjectV3(value: unknown, namespace: string) {
  return sha256TextV3(`${namespace}\n${stableSerializeV3(value)}`);
}

function assertSha256V3(value: string, code: string) {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(code);
}

function assertIsoV3(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("SERPAPI_T2E_SEAL_TIMESTAMP_INVALID");
  }
}

function plainRecordV3(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function jsonV3(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const parserSchemaContractV3 = Object.freeze({
  parserVersion: STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3,
  acceptedPropertyDetailShapes: Object.freeze([
    "WRAPPED_PROPERTY",
    "WRAPPED_PROPERTIES_ARRAY",
    "WRAPPED_ADS_ARRAY",
    "UNWRAPPED_PROPERTY",
  ]),
  unwrappedPropertyRequirements: Object.freeze({
    requiredIdentity: "NON_EMPTY_LOCAL_PROPERTY_NAME",
    requiredEvidenceCardinality: "AT_LEAST_ONE",
    materialEvidenceFields: Object.freeze([
      "amenities",
      "extracted_hotel_class",
      "free_cancellation",
      "gps_coordinates",
      "hotel_class",
      "overall_rating",
      "prices",
      "rate_per_night",
      "reviews",
      "total_rate",
    ]),
  }),
  failClosedClasses: Object.freeze([
    "ASYNC_INCOMPLETE_STATUS",
    "CONTENT_TYPE_UNSUPPORTED",
    "DETAIL_SCHEMA_MISMATCH",
    "HTTP_STATUS_ERROR",
    "NON_JSON_OR_NON_OBJECT_RESPONSE",
    "PROVIDER_ERROR_FIELD_PRESENT",
    "SEARCH_METADATA_ERROR_STATUS",
  ]),
});

export function createSerpApiPropertyDetailParserSchemaFingerprintV3() {
  return sha256ObjectV3(parserSchemaContractV3, "stayopti-v3-serpapi-property-detail-parser-schema-v2");
}

function validateInputV3(input: StayOptiSerpApiOfflineEvidenceSealInputV3) {
  assertIsoV3(input.sealedAt);
  assertSha256V3(input.sessionFingerprint, "SERPAPI_T2E_SESSION_FINGERPRINT_INVALID");
  for (const hash of [...input.encryptedRawSha256, ...input.encryptedRawEnvelopeFingerprints]) {
    assertSha256V3(hash, "SERPAPI_T2E_RAW_HASH_INVALID");
  }
  if (new Set(input.encryptedRawSha256).size !== 2 || new Set(input.encryptedRawEnvelopeFingerprints).size !== 2) {
    throw new Error("SERPAPI_T2E_RAW_BINDING_NOT_UNIQUE");
  }
  assertSha256V3(input.observedReplaySchemaFingerprint, "SERPAPI_T2E_OBSERVED_SCHEMA_FINGERPRINT_INVALID");
  if (input.resultCount !== 29 || input.mergedDetailCount !== 1) throw new Error("SERPAPI_T2E_REPLAY_COUNTS_INVALID");
  if (input.targetedTests !== "PASS_25_OF_25") throw new Error("SERPAPI_T2E_TARGETED_TESTS_NOT_PASS");
  if (!/^PASS_[0-9]+_OF_[0-9]+$/.test(input.engineV3Regression)) throw new Error("SERPAPI_T2E_ENGINE_V3_NOT_PASS");
  if (input.engineV2Regression !== "PASS_196_OF_196") throw new Error("SERPAPI_T2E_ENGINE_V2_NOT_PASS");
  for (const value of [
    input.typescriptCompile,
    input.powershell51Parse,
    input.secretScan,
    input.rawDataScan,
    input.rawIdTokenScan,
    input.licenseProvenanceScan,
  ]) if (value !== "PASS") throw new Error("SERPAPI_T2E_REQUIRED_GATE_NOT_PASS");
}

function sealBindingV3(input: StayOptiSerpApiOfflineEvidenceSealInputV3) {
  return {
    sealVersion: STAYOPTI_SERPAPI_OFFLINE_EVIDENCE_SEAL_VERSION_V3,
    sealedAt: input.sealedAt,
    sourceEvidenceZipSha256: STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3,
    sourceEvidenceInternalChecksums: "PASS_18_OF_18",
    sessionFingerprint: input.sessionFingerprint,
    encryptedRawSha256: [...input.encryptedRawSha256].sort(),
    encryptedRawEnvelopeFingerprints: [...input.encryptedRawEnvelopeFingerprints].sort(),
    sourceSha: STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3,
    repairCommitSha: STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3,
    repairParentSha: STAYOPTI_SERPAPI_T2D_PARENT_SHA_V3,
    parserVersion: STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3,
    parserSchemaFingerprint: createSerpApiPropertyDetailParserSchemaFingerprintV3(),
    observedReplaySchemaFingerprint: input.observedReplaySchemaFingerprint,
    liveCanaryStatus: "ABORTED",
    liveCollectionStatus: "PARTIAL",
    liveEvidenceStatus: "PASS",
    offlineReplayStatus: "PASS",
    propertyDetailRootCause: STAYOPTI_SERPAPI_T2E_ROOT_CAUSE_V3,
    resultCount: input.resultCount,
    mergedDetailCount: input.mergedDetailCount,
  } as const;
}

function artifactV3(sealContextHash: string, body: Record<string, unknown>) {
  return { sealVersion: STAYOPTI_SERPAPI_OFFLINE_EVIDENCE_SEAL_VERSION_V3, sealContextHash, ...body };
}

export function createSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(
  input: StayOptiSerpApiOfflineEvidenceSealInputV3,
): readonly StayOptiSerpApiOfflineEvidenceSealEntryV3[] {
  validateInputV3(input);
  const binding = sealBindingV3(input);
  const sealContextHash = sha256ObjectV3(binding, "stayopti-v3-serpapi-t2e-seal-context");
  const parserSchemaFingerprint = createSerpApiPropertyDetailParserSchemaFingerprintV3();
  const bodies: Record<typeof STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3[number], Record<string, unknown>> = {
    "seal-manifest.json": artifactV3(sealContextHash, {
      sealedAt: input.sealedAt,
      artifactCount: STAYOPTI_SERPAPI_T2E_ARTIFACTS_V3.length,
      jsonArtifacts: STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3,
      checksumArtifact: "checksums.sha256",
      mutationInvalidatesSeal: true,
    }),
    "source-evidence-reference.json": artifactV3(sealContextHash, {
      sourceEvidenceZipSha256: STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3,
      internalChecksums: "PASS_18_OF_18",
      sessionFingerprint: input.sessionFingerprint,
      liveCanaryStatus: "ABORTED",
      liveCollectionStatus: "PARTIAL",
      liveEvidenceStatus: "PASS",
      actualRequestsTransmitted: 2,
    }),
    "encrypted-raw-integrity-receipt.json": artifactV3(sealContextHash, {
      encryptedRawFileCount: 2,
      encryptedRawSha256: [...input.encryptedRawSha256].sort(),
      envelopeFingerprints: [...input.encryptedRawEnvelopeFingerprints].sort(),
      matchedToSession: true,
      authenticity: "PASS",
      encryption: "AES_256_GCM",
      keyProtection: "WINDOWS_CURRENT_USER_DPAPI",
      filesModified: false,
      filesDeleted: false,
      propertyDetailRetentionDays: 90,
    }),
    "repair-commit-receipt.json": artifactV3(sealContextHash, {
      sourceSha: STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3,
      repairCommitSha: STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3,
      repairParentSha: STAYOPTI_SERPAPI_T2D_PARENT_SHA_V3,
      linearRepairCommit: true,
      publicRuntimeChanged: false,
      v3WeightsChanged: false,
    }),
    "parser-version-receipt.json": artifactV3(sealContextHash, {
      parserVersion: STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3,
      parserRepairStatus: "PASS",
      providerBoundary: "EVALUATION_ONLY",
    }),
    "parser-schema-fingerprint.json": artifactV3(sealContextHash, {
      parserSchemaFingerprint,
      observedReplaySchemaFingerprint: input.observedReplaySchemaFingerprint,
      acceptedShape: "UNWRAPPED_PROPERTY",
      failClosed: true,
    }),
    "replay-before-repair.json": artifactV3(sealContextHash, {
      mainSearchReplay: "PASS",
      propertyDetailReplay: "FAIL",
      failureClassification: "SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE",
      acceptedWrappersOnly: ["property", "properties[0]", "ads[0]"],
      capturedResponseShape: "UNWRAPPED_PROPERTY",
    }),
    "replay-after-repair.json": artifactV3(sealContextHash, {
      offlineReplayStatus: "PASS",
      mainSearchReplay: "PASS",
      propertyDetailReplay: "PASS",
      resultCount: input.resultCount,
      mergedDetailCount: input.mergedDetailCount,
      detailDataUsableOffline: true,
      networkCalls: 0,
      credentialsLoaded: false,
      temporaryPlaintextFilesRemaining: 0,
    }),
    "root-cause-receipt.json": artifactV3(sealContextHash, {
      rootCause: STAYOPTI_SERPAPI_T2E_ROOT_CAUSE_V3,
      detailResponseCategory: "VALID_UNSUPPORTED_SHAPE",
      fullyDemonstrated: true,
      providerError: false,
      asynchronousIncomplete: false,
      nonJson: false,
    }),
    "provider-neutrality-receipt.json": artifactV3(sealContextHash, {
      providerNeutrality: "PASS",
      v3CoreImportsSerpApi: false,
      propertyReferenceExported: false,
      rawProviderIdentifierExported: false,
      automaticGoldenAdmission: false,
      remainingStageAuthorized: false,
      remainingStageStarted: false,
    }),
    "price-semantics-receipt.json": artifactV3(sealContextHash, {
      observedPriceCount: 20,
      missingPriceCount: 9,
      observedPriceSemantics: "OBSERVED_AGGREGATED_DISPLAY_PRICE",
      exactBookablePriceInvented: false,
      sellerSpecificPriceInvented: false,
      verifiedCheckoutTotalInvented: false,
    }),
    "security-scan-receipt.json": artifactV3(sealContextHash, {
      rawAtRestEncrypted: true,
      plaintextRawAtRest: false,
      rawInRepository: false,
      rawInSeal: false,
      encryptedRawInSeal: false,
      secretsInSeal: false,
      propertyReferenceInSeal: false,
      rawProviderIdentifierInSeal: false,
      keyMaterialInSeal: false,
      credentialsLoaded: false,
      offlineReplayNetworkCalls: 0,
    }),
    "regression-receipt.json": artifactV3(sealContextHash, {
      targetedTests: input.targetedTests,
      engineV3Regression: input.engineV3Regression,
      engineV2Regression: input.engineV2Regression,
      typescriptCompile: input.typescriptCompile,
      powershell51Parse: input.powershell51Parse,
      secretScan: input.secretScan,
      rawDataScan: input.rawDataScan,
      rawIdTokenScan: input.rawIdTokenScan,
      licenseProvenanceScan: input.licenseProvenanceScan,
    }),
    "final-decision.json": artifactV3(sealContextHash, {
      liveCanaryStatus: "ABORTED",
      liveCollectionStatus: "PARTIAL",
      liveEvidenceStatus: "PASS",
      offlineReplayStatus: "PASS",
      parserRepairStatus: "PASS",
      detailDataUsableOffline: true,
      newProviderCallAuthorized: false,
      automaticGoldenAdmission: false,
      remainingStageAuthorized: false,
      remainingStageStarted: false,
      v3WeightsChanged: false,
    }),
  };
  const jsonEntries = STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3.map((name) => ({ name, content: jsonV3(bodies[name]) }));
  const checksums = jsonEntries
    .map((entry) => `${sha256TextV3(entry.content)}  ${entry.name}`)
    .sort()
    .join("\n") + "\n";
  return Object.freeze([...jsonEntries, { name: "checksums.sha256" as const, content: checksums }]);
}

const forbiddenKeysV3 = new Set([
  "apiKey", "authorization", "ciphertext", "clientSecret", "hotelId", "iv", "offerId",
  "password", "propertyToken", "protectedDataKey", "providerId", "queryString", "rawPayload",
  "rawResponse", "redirectUrl", "searchId", "secret", "url",
]);

function unsafeArtifactValueV3(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(unsafeArtifactValueV3);
  if (plainRecordV3(value)) {
    return Object.entries(value).some(([key, child]) => forbiddenKeysV3.has(key) || unsafeArtifactValueV3(child));
  }
  return typeof value === "string" && /https?:\/\/|api[_-]?key|property[_-]?token|authorization\s*[:=]|bearer\s+[a-z0-9._~+/=-]+/i.test(value);
}

export function validateSerpApiGoogleHotelsOfflineEvidenceSealEntriesV3(
  entries: readonly StayOptiSerpApiOfflineEvidenceSealEntryV3[],
): StayOptiSerpApiOfflineEvidenceSealValidationV3 {
  const issues: string[] = [];
  const sorted = [...entries].sort((left, right) => left.name.localeCompare(right.name));
  const names = sorted.map((entry) => entry.name);
  const expectedNames = [...STAYOPTI_SERPAPI_T2E_ARTIFACTS_V3].sort();
  if (new Set(names).size !== names.length) issues.push("SERPAPI_T2E_DUPLICATE_ARTIFACT");
  if (stableSerializeV3(names) !== stableSerializeV3(expectedNames)) issues.push("SERPAPI_T2E_ARTIFACT_SET_INVALID");
  const byName = new Map(sorted.map((entry) => [entry.name, entry.content]));
  const parsed = new Map<string, Record<string, unknown>>();
  let sealContextHash: string | null = null;
  for (const name of STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3) {
    const content = byName.get(name);
    if (content === undefined) continue;
    try {
      const value = JSON.parse(content) as unknown;
      if (!plainRecordV3(value)) throw new Error("NOT_OBJECT");
      if (unsafeArtifactValueV3(value)) issues.push(`SERPAPI_T2E_UNSAFE_ARTIFACT:${name}`);
      if (value.sealVersion !== STAYOPTI_SERPAPI_OFFLINE_EVIDENCE_SEAL_VERSION_V3) issues.push(`SERPAPI_T2E_VERSION_MISMATCH:${name}`);
      if (typeof value.sealContextHash !== "string" || !/^[0-9a-f]{64}$/.test(value.sealContextHash)) issues.push(`SERPAPI_T2E_CONTEXT_HASH_INVALID:${name}`);
      else if (sealContextHash === null) sealContextHash = value.sealContextHash;
      else if (sealContextHash !== value.sealContextHash) issues.push(`SERPAPI_T2E_CONTEXT_HASH_MISMATCH:${name}`);
      parsed.set(name, value);
    } catch {
      issues.push(`SERPAPI_T2E_JSON_INVALID:${name}`);
    }
  }
  const checksumContent = byName.get("checksums.sha256");
  let checksumCount = 0;
  if (checksumContent === undefined) issues.push("SERPAPI_T2E_CHECKSUMS_MISSING");
  else {
    const lines = checksumContent.split("\n").filter(Boolean);
    checksumCount = lines.length;
    const expectedChecksumNames = [...STAYOPTI_SERPAPI_T2E_JSON_ARTIFACTS_V3].sort();
    const observedChecksumNames: string[] = [];
    for (const line of lines) {
      const match = /^([0-9a-f]{64})  ([a-z0-9-]+\.json)$/.exec(line);
      if (match === null) { issues.push("SERPAPI_T2E_CHECKSUM_LINE_INVALID"); continue; }
      const [, expected, name] = match;
      observedChecksumNames.push(name!);
      const content = byName.get(name as StayOptiSerpApiOfflineEvidenceSealEntryV3["name"]);
      if (content === undefined || sha256TextV3(content) !== expected) issues.push(`SERPAPI_T2E_CHECKSUM_MISMATCH:${name}`);
    }
    if (stableSerializeV3(observedChecksumNames.sort()) !== stableSerializeV3(expectedChecksumNames)) issues.push("SERPAPI_T2E_CHECKSUM_SET_INVALID");
  }
  const source = parsed.get("source-evidence-reference.json");
  if (source?.sourceEvidenceZipSha256 !== STAYOPTI_SERPAPI_T2E_SOURCE_EVIDENCE_SHA256_V3) issues.push("SERPAPI_T2E_SOURCE_EVIDENCE_MISMATCH");
  const repair = parsed.get("repair-commit-receipt.json");
  if (repair?.repairCommitSha !== STAYOPTI_SERPAPI_T2E_SOURCE_SHA_V3 || repair?.repairParentSha !== STAYOPTI_SERPAPI_T2D_PARENT_SHA_V3) issues.push("SERPAPI_T2E_REPAIR_COMMIT_MISMATCH");
  const parser = parsed.get("parser-version-receipt.json");
  if (parser?.parserVersion !== STAYOPTI_SERPAPI_T2E_PARSER_VERSION_V3) issues.push("SERPAPI_T2E_PARSER_VERSION_MISMATCH");
  const parserSchema = parsed.get("parser-schema-fingerprint.json");
  if (parserSchema?.parserSchemaFingerprint !== createSerpApiPropertyDetailParserSchemaFingerprintV3()) issues.push("SERPAPI_T2E_PARSER_SCHEMA_FINGERPRINT_MISMATCH");
  const before = parsed.get("replay-before-repair.json");
  if (before?.mainSearchReplay !== "PASS" || before?.propertyDetailReplay !== "FAIL") issues.push("SERPAPI_T2E_REPLAY_BEFORE_INVALID");
  const after = parsed.get("replay-after-repair.json");
  if (after?.mainSearchReplay !== "PASS" || after?.propertyDetailReplay !== "PASS" || after?.networkCalls !== 0) issues.push("SERPAPI_T2E_REPLAY_AFTER_INVALID");
  const final = parsed.get("final-decision.json");
  if (final?.liveCanaryStatus !== "ABORTED" || final?.offlineReplayStatus !== "PASS" || final?.automaticGoldenAdmission !== false || final?.remainingStageAuthorized !== false) issues.push("SERPAPI_T2E_FINAL_DECISION_INVALID");
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze([...new Set(issues)].sort()), artifactCount: entries.length, checksumCount, sealContextHash });
}
