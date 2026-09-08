import type { StayOptiGoldenEvidenceValueV3 } from "./goldenCaseContractV3";

export const STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3 =
  "stayopti.v3.browser-assisted-dossier@1" as const;

export const STAYOPTI_BROWSER_ASSISTED_DOSSIER_VALIDATOR_VERSION_V3 =
  "stayopti.v3.browser-assisted-dossier-validator@2" as const;

export const STAYOPTI_BROWSER_ASSISTED_DOSSIER_CUSTODY_VERSION_V3 =
  "stayopti.v3.manual-market-dossier-custody@3" as const;

export type StayOptiDossierAcquisitionModeV3 =
  | "MANUAL_USER_DIRECT"
  | "BROWSER_ASSISTED_AGENT";

export type StayOptiDossierObservedStateV3 =
  | "VERIFIED"
  | "DECLARED"
  | "UNKNOWN";

export type StayOptiDossierBrowserAutomationStateV3 =
  | "NOT_USED_VERIFIED"
  | "ASSISTED_BROWSER_INTERACTION_DISCLOSED"
  | "UNKNOWN";

export type StayOptiDossierArtifactKindV3 =
  | "SCREENSHOT"
  | "CAPTURE_LOG"
  | "PROVENANCE_DOCUMENT"
  | "DOSSIER_MANIFEST"
  | "TRANSCRIPTION_DATA"
  | "TIMESTAMP_DOCUMENT"
  | "CHECKSUM_MANIFEST"
  | "OTHER_SUPPORTING_DOCUMENT";

export interface StayOptiBrowserAssistedDossierArtifactV3 {
  evidenceRef: string;
  archiveEntryPath: string;
  kind: StayOptiDossierArtifactKindV3;
  expectedSha256: string | null;
  alternativeRef: string | null;
  declaredCapturedAt: string | null;
  captureTimeSourceRef: string | null;
}

export interface StayOptiBrowserAssistedDossierAlternativeV3 {
  localAlternativeRef: string;
  screenshotEvidenceRefs: readonly string[];
  taxAndCostDisclosure: {
    observedDisplayStatement: StayOptiGoldenEvidenceValueV3<string>;
    itemizedTaxBreakdown: StayOptiGoldenEvidenceValueV3<{
      taxMinorUnits: number;
      feeMinorUnits: number;
      currency: string;
    }>;
  };
}

export interface StayOptiBrowserAssistedDossierDescriptorV3 {
  schemaVersion: typeof STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3;
  dossierId: string;
  sessionId: string;
  expectedArchiveSha256: string;
  checksumArtifactPath: string;
  acquisition: {
    mode: StayOptiDossierAcquisitionModeV3;
    browserAutomation: StayOptiDossierBrowserAutomationStateV3;
    loggedOut: StayOptiDossierObservedStateV3;
    incognito: StayOptiDossierObservedStateV3;
    personalizationAbsent: StayOptiDossierObservedStateV3;
    provenanceLimitations: readonly string[];
  };
  artifacts: readonly StayOptiBrowserAssistedDossierArtifactV3[];
  alternatives: readonly StayOptiBrowserAssistedDossierAlternativeV3[];
  transcriptionReview: {
    status: "NOT_REVIEWED" | "HUMAN_REVIEWED";
    separateFromCollector: boolean;
    reviewProtocolVersion: string | null;
    reviewedAtBucket: string | null;
  };
  classification: {
    eligibility: "DIAGNOSTIC_ONLY";
    ineligibilityReasons: readonly string[];
    prohibitedAutomaticUses: readonly (
      | "BLIND_JUDGMENT"
      | "V3_REPLAY"
      | "GOLDEN_ADMISSION"
    )[];
  };
}

export interface StayOptiBrowserAssistedArchiveEntryV3 {
  path: string;
  byteLength: number;
  sha256: string;
  archiveTimestamp: string | null;
}

export interface StayOptiBrowserAssistedArchiveIndexV3 {
  archiveSha256: string;
  entries: readonly StayOptiBrowserAssistedArchiveEntryV3[];
}

export interface StayOptiBrowserAssistedChecksumEntryV3 {
  path: string;
  sha256: string;
}

export interface StayOptiBrowserAssistedDossierValidationResultV3 {
  validatorVersion: typeof STAYOPTI_BROWSER_ASSISTED_DOSSIER_VALIDATOR_VERSION_V3;
  validForCustodyImport: boolean;
  custodyIntegrityEligible: boolean;
  diagnosticOnly: true;
  automaticBlindJudgmentEligible: false;
  automaticReplayEligible: false;
  automaticGoldenAdmission: false;
  artifactCount: number;
  checksumCount: number;
  screenshotCount: number;
  issues: readonly string[];
}

const SHA256 = /^[a-f0-9]{64}$/;
const CONTROLLED_ID = /^[A-Z0-9][A-Z0-9_.-]{2,127}$/;
const EVIDENCE_REF = /^[A-Z0-9][A-Z0-9_.:-]{2,159}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeDossierArchivePathV3(value: string) {
  if (typeof value !== "string" || value.length === 0 || value.length > 240 || /[\\\u0000-\u001f\u007f:<>"|?*]/.test(value)) {
    throw new Error("DOSSIER_ARCHIVE_PATH_UNSAFE");
  }
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) throw new Error("DOSSIER_ARCHIVE_PATH_UNSAFE");
  const parts = value.split("/");
  // Windows strips trailing dots/spaces and resolves reserved device names even
  // with an extension. Reject these names before any cross-platform extraction.
  if (parts.some((part) => part.length === 0 || part === "." || part === ".." || part !== part.trim() || /[. ]$/.test(part) ||
      /^(?:CON|PRN|AUX|NUL|COM[1-9\u00b9\u00b2\u00b3]|LPT[1-9\u00b9\u00b2\u00b3])(?:\.|$)/i.test(part))) throw new Error("DOSSIER_ARCHIVE_PATH_UNSAFE");
  return parts.join("/");
}

/** sha256sum paths are relative to the checksum document's directory, never
 * guessed from basenames, ZIP roots or the process CWD. Returned paths address
 * the archive root and can be passed directly to the custody validator. */
export function parseBrowserAssistedDossierChecksumsV3(
  content: string,
  checksumArtifactPath: string,
): readonly StayOptiBrowserAssistedChecksumEntryV3[] {
  const documentPath = normalizeDossierArchivePathV3(checksumArtifactPath);
  if (typeof content !== "string") throw new Error("DOSSIER_CHECKSUM_DOCUMENT_INVALID");
  const lastSlash = documentPath.lastIndexOf("/");
  const base = lastSlash < 0 ? "" : documentPath.slice(0, lastSlash + 1);
  const seen = new Set<string>();
  const entries: StayOptiBrowserAssistedChecksumEntryV3[] = [];
  for (const line of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (line.length === 0) continue;
    const match = /^([a-fA-F0-9]{64}) (?: |\*)(.+)$/.exec(line);
    if (match === null) throw new Error("DOSSIER_CHECKSUM_DOCUMENT_INVALID");
    const relativePath = normalizeDossierArchivePathV3(match[2]);
    const path = normalizeDossierArchivePathV3(`${base}${relativePath}`);
    const folded = path.toLocaleLowerCase("en-US");
    if (seen.has(folded)) throw new Error("DOSSIER_CHECKSUM_ENTRY_COLLISION");
    if (path === documentPath) throw new Error("DOSSIER_CHECKSUM_SELF_REFERENCE");
    seen.add(folded);
    entries.push(Object.freeze({ path, sha256: match[1].toLowerCase() }));
  }
  if (entries.length === 0) throw new Error("DOSSIER_CHECKSUM_DOCUMENT_EMPTY");
  return Object.freeze(entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function validIso(value: string | null) {
  if (value === null) return false;
  return ISO_INSTANT.test(value) && new Date(value).toISOString() === value;
}

function validateEvidenceValue(
  value: StayOptiGoldenEvidenceValueV3<unknown>,
  evidenceRefs: ReadonlySet<string>,
  issues: string[],
  path: string,
) {
  if (!isRecord(value) || !["KNOWN", "UNKNOWN"].includes(String(value.status)) ||
      !["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(String(value.reliability)) ||
      !Array.isArray(value.evidenceRefs) || value.evidenceRefs.some((ref) => typeof ref !== "string" || !evidenceRefs.has(ref))) {
    issues.push(`${path}:DOSSIER_EVIDENCE_WRAPPER_INVALID`);
    return;
  }
  if (value.status === "KNOWN") {
    if (value.value === null || value.unknownReason !== null || value.evidenceRefs.length === 0) issues.push(`${path}:DOSSIER_KNOWN_EVIDENCE_INVALID`);
  } else if (value.value !== null || typeof value.unknownReason !== "string" || value.unknownReason.trim().length === 0) {
    issues.push(`${path}:DOSSIER_UNKNOWN_EVIDENCE_INVALID`);
  }
}

export function validateBrowserAssistedDossierForCustodyV3(input: {
  descriptor: StayOptiBrowserAssistedDossierDescriptorV3;
  archiveIndex: StayOptiBrowserAssistedArchiveIndexV3;
  checksumEntries: readonly StayOptiBrowserAssistedChecksumEntryV3[];
  importedAt?: string;
  custodyStartedAt?: string;
}): StayOptiBrowserAssistedDossierValidationResultV3 {
  const issues: string[] = [];
  const descriptor = input.descriptor;
  if (!isRecord(descriptor) || descriptor.schemaVersion !== STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3) {
    issues.push("DOSSIER_SCHEMA_UNSUPPORTED");
  }
  if (!CONTROLLED_ID.test(descriptor.dossierId) || !CONTROLLED_ID.test(descriptor.sessionId)) issues.push("DOSSIER_ID_INVALID");
  if (!SHA256.test(descriptor.expectedArchiveSha256) || descriptor.expectedArchiveSha256 !== input.archiveIndex.archiveSha256) {
    issues.push("DOSSIER_ARCHIVE_HASH_MISMATCH");
  }

  const indexed = new Map<string, StayOptiBrowserAssistedArchiveEntryV3>();
  const indexedFolded = new Set<string>();
  for (const entry of input.archiveIndex.entries) {
    try {
      const path = normalizeDossierArchivePathV3(entry.path);
      const folded = path.toLocaleLowerCase("en-US");
      if (indexed.has(path) || indexedFolded.has(folded)) issues.push(`DOSSIER_ARCHIVE_ENTRY_COLLISION:${path}`);
      indexed.set(path, entry);
      indexedFolded.add(folded);
      if (!Number.isInteger(entry.byteLength) || entry.byteLength < 0 || !SHA256.test(entry.sha256)) issues.push(`DOSSIER_ARCHIVE_ENTRY_METADATA_INVALID:${path}`);
    } catch {
      issues.push("DOSSIER_ARCHIVE_PATH_UNSAFE");
    }
  }

  let checksumArtifactPath = "";
  try { checksumArtifactPath = normalizeDossierArchivePathV3(descriptor.checksumArtifactPath); }
  catch { issues.push("DOSSIER_CHECKSUM_ARTIFACT_PATH_UNSAFE"); }

  const checksums = new Map<string, string>();
  const checksumFolded = new Set<string>();
  for (const entry of input.checksumEntries) {
    try {
      const path = normalizeDossierArchivePathV3(entry.path);
      const folded = path.toLocaleLowerCase("en-US");
      if (checksums.has(path) || checksumFolded.has(folded)) issues.push(`DOSSIER_CHECKSUM_ENTRY_COLLISION:${path}`);
      checksums.set(path, entry.sha256);
      checksumFolded.add(folded);
      if (!SHA256.test(entry.sha256)) issues.push(`DOSSIER_CHECKSUM_INVALID:${path}`);
    } catch {
      issues.push("DOSSIER_CHECKSUM_PATH_UNSAFE");
    }
  }

  const evidenceRefs = new Set<string>();
  const artifactPaths = new Set<string>();
  const artifactFolded = new Set<string>();
  for (const artifact of descriptor.artifacts) {
    if (!EVIDENCE_REF.test(artifact.evidenceRef) || evidenceRefs.has(artifact.evidenceRef)) issues.push("DOSSIER_EVIDENCE_REF_INVALID_OR_DUPLICATE");
    evidenceRefs.add(artifact.evidenceRef);
    let path = "";
    try { path = normalizeDossierArchivePathV3(artifact.archiveEntryPath); }
    catch { issues.push(`DOSSIER_ARTIFACT_PATH_UNSAFE:${artifact.evidenceRef}`); continue; }
    const folded = path.toLocaleLowerCase("en-US");
    if (artifactPaths.has(path) || artifactFolded.has(folded)) issues.push(`DOSSIER_ARTIFACT_PATH_COLLISION:${path}`);
    artifactPaths.add(path);
    artifactFolded.add(folded);
    const archiveEntry = indexed.get(path);
    if (archiveEntry === undefined) issues.push(`DOSSIER_REFERENCED_ARTIFACT_MISSING:${artifact.evidenceRef}`);
    if (artifact.expectedSha256 !== null && (!SHA256.test(artifact.expectedSha256) || archiveEntry?.sha256 !== artifact.expectedSha256)) {
      issues.push(`DOSSIER_ARTIFACT_HASH_MISMATCH:${artifact.evidenceRef}`);
    }
    if (path !== checksumArtifactPath && checksums.get(path) !== archiveEntry?.sha256) issues.push(`DOSSIER_INTERNAL_CHECKSUM_MISMATCH:${artifact.evidenceRef}`);
    if (artifact.kind === "SCREENSHOT") {
      if (artifact.alternativeRef === null || !validIso(artifact.declaredCapturedAt) || artifact.captureTimeSourceRef === null) {
        issues.push(`DOSSIER_SCREENSHOT_PROVENANCE_INCOMPLETE:${artifact.evidenceRef}`);
      }
    }
  }
  if (artifactPaths.size !== indexed.size || [...indexed.keys()].some((path) => !artifactPaths.has(path))) issues.push("DOSSIER_ARCHIVE_ARTIFACT_SET_MISMATCH");
  if (checksums.size !== Math.max(0, indexed.size - 1) || [...indexed.keys()].some((path) => path !== checksumArtifactPath && !checksums.has(path))) {
    issues.push("DOSSIER_CHECKSUM_COVERAGE_INCOMPLETE");
  }

  const alternatives = new Set<string>();
  const screenshotRefs = new Set<string>();
  for (const alternative of descriptor.alternatives) {
    if (!EVIDENCE_REF.test(alternative.localAlternativeRef) || alternatives.has(alternative.localAlternativeRef)) issues.push("DOSSIER_ALTERNATIVE_REF_INVALID_OR_DUPLICATE");
    alternatives.add(alternative.localAlternativeRef);
    if (!Array.isArray(alternative.screenshotEvidenceRefs) || alternative.screenshotEvidenceRefs.length === 0) issues.push(`DOSSIER_SCREENSHOT_REQUIRED:${alternative.localAlternativeRef}`);
    for (const ref of alternative.screenshotEvidenceRefs) {
      if (screenshotRefs.has(ref)) issues.push(`DOSSIER_SCREENSHOT_REFERENCE_REUSED:${ref}`);
      screenshotRefs.add(ref);
      const artifact = descriptor.artifacts.find((candidate) => candidate.evidenceRef === ref);
      if (artifact?.kind !== "SCREENSHOT" || artifact.alternativeRef !== alternative.localAlternativeRef) issues.push(`DOSSIER_SCREENSHOT_REFERENCE_INCOHERENT:${ref}`);
    }
    validateEvidenceValue(alternative.taxAndCostDisclosure.observedDisplayStatement, evidenceRefs, issues, `${alternative.localAlternativeRef}.observedDisplayStatement`);
    validateEvidenceValue(alternative.taxAndCostDisclosure.itemizedTaxBreakdown, evidenceRefs, issues, `${alternative.localAlternativeRef}.itemizedTaxBreakdown`);
    const breakdown = alternative.taxAndCostDisclosure.itemizedTaxBreakdown;
    if (breakdown.status === "KNOWN" && (!isRecord(breakdown.value) || !Number.isInteger(breakdown.value.taxMinorUnits) || Number(breakdown.value.taxMinorUnits) < 0 ||
        !Number.isInteger(breakdown.value.feeMinorUnits) || Number(breakdown.value.feeMinorUnits) < 0 || typeof breakdown.value.currency !== "string" || !/^[A-Z]{3}$/.test(breakdown.value.currency))) {
      issues.push(`${alternative.localAlternativeRef}.itemizedTaxBreakdown:DOSSIER_TAX_BREAKDOWN_INVALID`);
    }
    if (alternative.taxAndCostDisclosure.observedDisplayStatement.status === "KNOWN" &&
        alternative.taxAndCostDisclosure.itemizedTaxBreakdown.status === "UNKNOWN") {
      // An observed inclusive display statement is retained without inventing an itemized breakdown.
    }
  }

  for (const artifact of descriptor.artifacts.filter((candidate) => candidate.kind === "SCREENSHOT")) {
    if (!screenshotRefs.has(artifact.evidenceRef)) issues.push(`DOSSIER_SCREENSHOT_UNASSOCIATED:${artifact.evidenceRef}`);
    if (artifact.captureTimeSourceRef !== null) {
      const source = descriptor.artifacts.find((candidate) => candidate.evidenceRef === artifact.captureTimeSourceRef);
      if (source === undefined || !["CAPTURE_LOG", "TIMESTAMP_DOCUMENT", "PROVENANCE_DOCUMENT"].includes(source.kind)) {
        issues.push(`DOSSIER_CAPTURE_TIME_SOURCE_INVALID:${artifact.evidenceRef}`);
      }
    }
  }

  if (descriptor.acquisition.mode === "BROWSER_ASSISTED_AGENT" && descriptor.acquisition.browserAutomation !== "ASSISTED_BROWSER_INTERACTION_DISCLOSED") {
    issues.push("DOSSIER_ASSISTED_BROWSER_MODE_NOT_DISCLOSED");
  }
  if (!Array.isArray(descriptor.acquisition.provenanceLimitations) || descriptor.acquisition.provenanceLimitations.length === 0 ||
      descriptor.acquisition.provenanceLimitations.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    issues.push("DOSSIER_PROVENANCE_LIMITATIONS_REQUIRED");
  }
  if (descriptor.acquisition.mode === "MANUAL_USER_DIRECT" && descriptor.acquisition.browserAutomation === "ASSISTED_BROWSER_INTERACTION_DISCLOSED") {
    issues.push("DOSSIER_ACQUISITION_MODE_CONFLICT");
  }
  if (descriptor.transcriptionReview.status === "HUMAN_REVIEWED" &&
      (!descriptor.transcriptionReview.separateFromCollector || descriptor.transcriptionReview.reviewProtocolVersion === null || descriptor.transcriptionReview.reviewedAtBucket === null)) {
    issues.push("DOSSIER_TRANSCRIPTION_REVIEW_NOT_SEPARATE");
  }
  if (descriptor.classification.eligibility !== "DIAGNOSTIC_ONLY" || descriptor.classification.ineligibilityReasons.length === 0 ||
      !(["BLIND_JUDGMENT", "V3_REPLAY", "GOLDEN_ADMISSION"] as const).every((value) => descriptor.classification.prohibitedAutomaticUses.includes(value))) {
    issues.push("DOSSIER_DIAGNOSTIC_CLASSIFICATION_REQUIRED");
  }

  if (input.importedAt !== undefined || input.custodyStartedAt !== undefined) {
    if (!validIso(input.importedAt ?? null) || !validIso(input.custodyStartedAt ?? null) || Date.parse(input.custodyStartedAt ?? "") < Date.parse(input.importedAt ?? "")) {
      issues.push("DOSSIER_IMPORT_CUSTODY_TIMESTAMP_INVALID");
    }
    for (const artifact of descriptor.artifacts.filter((candidate) => candidate.declaredCapturedAt !== null)) {
      if (Date.parse(artifact.declaredCapturedAt ?? "") > Date.parse(input.importedAt ?? "")) issues.push(`DOSSIER_CAPTURE_AFTER_IMPORT:${artifact.evidenceRef}`);
    }
  }

  const orderedIssues = [...new Set(issues)].sort();
  return Object.freeze({
    validatorVersion: STAYOPTI_BROWSER_ASSISTED_DOSSIER_VALIDATOR_VERSION_V3,
    validForCustodyImport: orderedIssues.length === 0,
    custodyIntegrityEligible: orderedIssues.length === 0,
    diagnosticOnly: true,
    automaticBlindJudgmentEligible: false,
    automaticReplayEligible: false,
    automaticGoldenAdmission: false,
    artifactCount: descriptor.artifacts.length,
    checksumCount: input.checksumEntries.length,
    screenshotCount: descriptor.artifacts.filter((entry) => entry.kind === "SCREENSHOT").length,
    issues: Object.freeze(orderedIssues),
  });
}
