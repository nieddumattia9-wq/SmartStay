import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  STAYOPTI_BROWSER_ASSISTED_DOSSIER_CUSTODY_VERSION_V3,
  STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3,
  normalizeDossierArchivePathV3,
  parseBrowserAssistedDossierChecksumsV3,
  validateBrowserAssistedDossierForCustodyV3,
  type StayOptiBrowserAssistedArchiveIndexV3,
  type StayOptiBrowserAssistedDossierDescriptorV3,
} from "../../src/engine-v3/evaluation/browserAssistedDossierIntakeV3";
import * as quarantineModule from "../../src/engine-v3/evaluation/providerRawQuarantineV3";
import type { StayOptiProviderRawKeyProtectorV3 } from "../../src/engine-v3/evaluation/providerRawQuarantineV3";

const ROOT = process.cwd();
const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_POWERSHELL_51_REQUIRED = process.platform === "win32"
  ? false
  : "requires real Windows PowerShell 5.1 and CurrentUser DPAPI; enforced by the required windows-latest release job";
const CUSTODY_MODULE = resolve(ROOT, "scripts/browser-assisted-dossier-custody-v3.mjs");
const CUSTODY_V2_MODULE = resolve(ROOT, "scripts/manual-market-session-custody-v2.mjs");
const importEsm = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
const contractModule = {
  STAYOPTI_BROWSER_ASSISTED_DOSSIER_CUSTODY_VERSION_V3,
  parseBrowserAssistedDossierChecksumsV3,
  validateBrowserAssistedDossierForCustodyV3,
};

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function assertPowerShell51Started(result: SpawnSyncReturns<string>, label: string) {
  assert.equal(result.error, undefined, `${label}: powershell.exe failed to start`);
  assert.notEqual(result.status, null, `${label}: powershell.exe returned status=null`);
  assert.equal(typeof result.stdout, "string", `${label}: powershell.exe stdout is unavailable`);
  assert.equal(typeof result.stderr, "string", `${label}: powershell.exe stderr is unavailable`);
}

function evidenceKnown(value: string, evidenceRefs: string[]) {
  return { status: "KNOWN" as const, reliability: "MEDIUM" as const, value, unknownReason: null, evidenceRefs };
}

function evidenceUnknown(reason: string) {
  return { status: "UNKNOWN" as const, reliability: "UNKNOWN" as const, value: null, unknownReason: reason, evidenceRefs: [] as string[] };
}

function syntheticPackage(screenshotCount = 15) {
  const fileBytes = new Map<string, Buffer>();
  const timestampPath = "metadata/timestamps.json";
  const manifestPath = "metadata/manifest.json";
  const captureLogPath = "metadata/capture-log.json";
  fileBytes.set(timestampPath, Buffer.from(JSON.stringify({ schemaVersion: "synthetic-timestamps@1" })));
  fileBytes.set(manifestPath, Buffer.from(JSON.stringify({ schemaVersion: "synthetic-dossier@1" })));
  fileBytes.set(captureLogPath, Buffer.from(JSON.stringify({ schemaVersion: "synthetic-capture-log@1" })));
  const artifacts: StayOptiBrowserAssistedDossierDescriptorV3["artifacts"][number][] = [
    { evidenceRef: "EVIDENCE_TIMESTAMPS", archiveEntryPath: timestampPath, kind: "TIMESTAMP_DOCUMENT", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null },
    { evidenceRef: "EVIDENCE_MANIFEST", archiveEntryPath: manifestPath, kind: "DOSSIER_MANIFEST", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null },
    { evidenceRef: "EVIDENCE_CAPTURE_LOG", archiveEntryPath: captureLogPath, kind: "CAPTURE_LOG", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null },
  ];
  const alternativeCount = screenshotCount === 15 ? 5 : 1;
  const alternatives: StayOptiBrowserAssistedDossierDescriptorV3["alternatives"][number][] = [];
  for (let alternativeIndex = 0; alternativeIndex < alternativeCount; alternativeIndex += 1) {
    const localAlternativeRef = `ALT_${String(alternativeIndex + 1).padStart(2, "0")}`;
    const screenshotEvidenceRefs: string[] = [];
    const owned = screenshotCount === 15 ? 3 : screenshotCount;
    for (let screenshotIndex = 0; screenshotIndex < owned; screenshotIndex += 1) {
      const ordinal = alternativeIndex * owned + screenshotIndex + 1;
      const evidenceRef = `SCREEN_${String(ordinal).padStart(2, "0")}`;
      const archiveEntryPath = `screenshots/alternative-${alternativeIndex + 1}-${screenshotIndex + 1}.png`;
      const bytes = Buffer.from(`\x89PNG\r\n\x1a\nSYNTHETIC_${ordinal}`, "binary");
      fileBytes.set(archiveEntryPath, bytes);
      screenshotEvidenceRefs.push(evidenceRef);
      artifacts.push({
        evidenceRef,
        archiveEntryPath,
        kind: "SCREENSHOT",
        expectedSha256: sha256(bytes),
        alternativeRef: localAlternativeRef,
        declaredCapturedAt: `2026-09-05T10:${String(ordinal).padStart(2, "0")}:00.000Z`,
        captureTimeSourceRef: "EVIDENCE_TIMESTAMPS",
      });
    }
    alternatives.push({
      localAlternativeRef,
      screenshotEvidenceRefs,
      taxAndCostDisclosure: {
        observedDisplayStatement: evidenceKnown("Include tasse e costi", [screenshotEvidenceRefs[0]]),
        itemizedTaxBreakdown: evidenceUnknown("ITEMIZED_TAX_BREAKDOWN_NOT_VISIBLE"),
      },
    });
  }
  const checksumPath = "checksums.sha256";
  const checksums = [...fileBytes.entries()].map(([path, bytes]) => ({ path, sha256: sha256(bytes) }));
  const checksumText = `${checksums.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`;
  fileBytes.set(checksumPath, Buffer.from(checksumText));
  artifacts.push({ evidenceRef: "EVIDENCE_CHECKSUMS", archiveEntryPath: checksumPath, kind: "CHECKSUM_MANIFEST", expectedSha256: null, alternativeRef: null, declaredCapturedAt: null, captureTimeSourceRef: null });
  for (const artifact of artifacts) {
    artifact.expectedSha256 = sha256(fileBytes.get(artifact.archiveEntryPath)!);
  }
  const indexEntries = [...fileBytes.entries()].map(([path, bytes]) => ({ path, byteLength: bytes.length, sha256: sha256(bytes), archiveTimestamp: "2026-09-05T12:00:00.000Z" }));
  const descriptor: StayOptiBrowserAssistedDossierDescriptorV3 = {
    schemaVersion: STAYOPTI_BROWSER_ASSISTED_DOSSIER_SCHEMA_VERSION_V3,
    dossierId: "SYNTHETIC_BROWSER_DOSSIER_001",
    sessionId: "V3_17T5B_SYNTHETIC_BROWSER_DOSSIER_001",
    expectedArchiveSha256: "0".repeat(64),
    checksumArtifactPath: checksumPath,
    acquisition: {
      mode: "BROWSER_ASSISTED_AGENT",
      browserAutomation: "ASSISTED_BROWSER_INTERACTION_DISCLOSED",
      loggedOut: "DECLARED",
      incognito: "UNKNOWN",
      personalizationAbsent: "UNKNOWN",
      provenanceLimitations: ["SYNTHETIC_FIXTURE_ONLY", "CAPTURE_NOT_RETROACTIVELY_CERTIFIED"],
    },
    artifacts,
    alternatives,
    transcriptionReview: {
      status: "HUMAN_REVIEWED",
      separateFromCollector: true,
      reviewProtocolVersion: "synthetic-review@1",
      reviewedAtBucket: "2026-09-05",
    },
    classification: {
      eligibility: "DIAGNOSTIC_ONLY",
      ineligibilityReasons: ["PRELIMINARY_BROWSER_ASSISTED_PILOT", "NO_PREOBSERVATION_SCENARIO_FREEZE_PROOF"],
      prohibitedAutomaticUses: ["BLIND_JUDGMENT", "V3_REPLAY", "GOLDEN_ADMISSION"],
    },
  };
  const archiveIndex: StayOptiBrowserAssistedArchiveIndexV3 = { archiveSha256: descriptor.expectedArchiveSha256, entries: indexEntries };
  return { descriptor, fileBytes, checksums, archiveIndex };
}

function validateSynthetic(screenshotCount = 15) {
  const fixture = syntheticPackage(screenshotCount);
  return { fixture, result: validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: fixture.checksums }) };
}

function nestSyntheticPackage(fixture: ReturnType<typeof syntheticPackage>, prefix = "bundle/nested/") {
  const originalEntries = [...fixture.fileBytes];
  fixture.fileBytes.clear();
  for (const [path, bytes] of originalEntries) fixture.fileBytes.set(`${prefix}${path}`, bytes);
  for (const artifact of fixture.descriptor.artifacts) artifact.archiveEntryPath = `${prefix}${artifact.archiveEntryPath}`;
  fixture.descriptor.checksumArtifactPath = `${prefix}${fixture.descriptor.checksumArtifactPath}`;
  fixture.archiveIndex.entries = fixture.archiveIndex.entries.map((entry) => ({ ...entry, path: `${prefix}${entry.path}` }));
  return fixture;
}

function parseFixtureChecksums(fixture: ReturnType<typeof syntheticPackage>) {
  return parseBrowserAssistedDossierChecksumsV3(fixture.fileBytes.get(fixture.descriptor.checksumArtifactPath)!.toString("utf8"), fixture.descriptor.checksumArtifactPath);
}

function useRealSyntheticJpegScreenshots(fixture: ReturnType<typeof syntheticPackage>) {
  // Create genuine image bytes in memory; the archive deliberately retains a
  // .png filename. Custody must preserve bytes, not rename or transcode them.
  const generated = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "Add-Type -AssemblyName System.Drawing; $image = New-Object Drawing.Bitmap 2,2; $stream = New-Object IO.MemoryStream; try { $image.Save($stream, [Drawing.Imaging.ImageFormat]::Jpeg); [Console]::Write([Convert]::ToBase64String($stream.ToArray())) } finally { $stream.Dispose(); $image.Dispose() }"], { encoding: "utf8", windowsHide: true });
  assertPowerShell51Started(generated, "in-memory synthetic JPEG generation");
  assert.equal(generated.status, 0, `${generated.stdout}\n${generated.stderr}`);
  const jpegBytes = Buffer.from(generated.stdout.trim(), "base64");
  assert.deepEqual([...jpegBytes.subarray(0, 2)], [0xff, 0xd8]);
  assert.deepEqual([...jpegBytes.subarray(-2)], [0xff, 0xd9]);
  for (const artifact of fixture.descriptor.artifacts.filter((entry) => entry.kind === "SCREENSHOT")) {
    assert.equal(artifact.archiveEntryPath.endsWith(".png"), true);
    fixture.fileBytes.set(artifact.archiveEntryPath, Buffer.from(jpegBytes));
  }
  fixture.checksums = [...fixture.fileBytes.entries()]
    .filter(([path]) => path !== fixture.descriptor.checksumArtifactPath)
    .map(([path, bytes]) => ({ path, sha256: sha256(bytes) }));
  fixture.fileBytes.set(fixture.descriptor.checksumArtifactPath, Buffer.from(`${fixture.checksums.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`));
  for (const artifact of fixture.descriptor.artifacts) artifact.expectedSha256 = sha256(fixture.fileBytes.get(artifact.archiveEntryPath)!);
  fixture.archiveIndex.entries = [...fixture.fileBytes.entries()].map(([path, bytes]) => ({ path, byteLength: bytes.length, sha256: sha256(bytes), archiveTimestamp: "2026-09-05T12:00:00.000Z" }));
  return fixture;
}

function createZipFixture(fixture: ReturnType<typeof syntheticPackage>) {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-Dossier-Fixture-"));
  const source = join(root, "source");
  const archive = join(root, "dossier.zip");
  mkdirSync(source);
  for (const [path, bytes] of fixture.fileBytes) {
    const target = join(source, ...path.split("/"));
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(target, bytes);
  }
  const zip = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:STAYOPTI_DOSSIER_SOURCE,$env:STAYOPTI_DOSSIER_ZIP,[IO.Compression.CompressionLevel]::Optimal,$false)"], {
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, STAYOPTI_DOSSIER_SOURCE: source, STAYOPTI_DOSSIER_ZIP: archive },
  });
  assertPowerShell51Started(zip, "synthetic dossier ZIP creation");
  assert.equal(zip.status, 0, `${zip.stdout}\n${zip.stderr}`);
  fixture.descriptor.expectedArchiveSha256 = sha256(readFileSync(archive));
  return { root, archive };
}

function createUnsafeZipFixture(paths: readonly string[]) {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-Dossier-UnsafeFixture-"));
  const archive = join(root, "dossier.zip");
  const spec = join(root, "synthetic-entries.json");
  writeFileSync(spec, JSON.stringify(paths));
  const zipped = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; $paths = Get-Content -Raw -LiteralPath $env:STAYOPTI_DOSSIER_SPEC | ConvertFrom-Json; $zip = [IO.Compression.ZipFile]::Open($env:STAYOPTI_DOSSIER_ZIP, [IO.Compression.ZipArchiveMode]::Create); try { foreach ($entryPath in $paths) { $entry = $zip.CreateEntry($entryPath); $stream = $entry.Open(); try { $stream.WriteByte(42) } finally { $stream.Dispose() } } } finally { $zip.Dispose() }"], {
    encoding: "utf8", windowsHide: true,
    env: { ...process.env, STAYOPTI_DOSSIER_SPEC: spec, STAYOPTI_DOSSIER_ZIP: archive },
  });
  try {
    assertPowerShell51Started(zipped, "unsafe-name synthetic ZIP creation");
    assert.equal(zipped.status, 0, `${zipped.stdout}\n${zipped.stderr}`);
    return { root, archive, archiveSha256: sha256(readFileSync(archive)) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

const SYNTHETIC_KEY_PROTECTOR: StayOptiProviderRawKeyProtectorV3 = {
  protectionClass: "SYNTHETIC_TEST_ONLY",
  protectDataKey: (value) => value,
  unprotectDataKey: (value) => value,
};

test("browser-assisted dossier accepts variable screenshot counts and preserves diagnostic-only semantics", () => {
  const fifteen = validateSynthetic(15);
  assert.equal(fifteen.result.validForCustodyImport, true);
  assert.equal(fifteen.result.screenshotCount, 15);
  assert.equal(fifteen.result.automaticBlindJudgmentEligible, false);
  assert.equal(fifteen.result.automaticReplayEligible, false);
  assert.equal(fifteen.result.automaticGoldenAdmission, false);
  const one = validateSynthetic(1);
  assert.equal(one.result.validForCustodyImport, true);
  assert.equal(one.result.screenshotCount, 1);
});

test("observed inclusive-tax wording remains separate from an unknown itemized breakdown", () => {
  const { fixture, result } = validateSynthetic();
  assert.equal(result.validForCustodyImport, true);
  for (const alternative of fixture.descriptor.alternatives) {
    assert.equal(alternative.taxAndCostDisclosure.observedDisplayStatement.value, "Include tasse e costi");
    assert.equal(alternative.taxAndCostDisclosure.itemizedTaxBreakdown.status, "UNKNOWN");
    assert.equal(alternative.taxAndCostDisclosure.itemizedTaxBreakdown.value, null);
  }
});

test("browser-assisted mode cannot claim browser automation was not used", () => {
  const { fixture } = validateSynthetic();
  (fixture.descriptor.acquisition as { browserAutomation: unknown }).browserAutomation = "NOT_USED_VERIFIED";
  const result = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: fixture.checksums });
  assert.ok(result.issues.includes("DOSSIER_ASSISTED_BROWSER_MODE_NOT_DISCLOSED"));
});

test("logged-out, incognito and non-personalization states remain independently unknown-capable", () => {
  const { fixture, result } = validateSynthetic();
  assert.equal(result.validForCustodyImport, true);
  assert.equal(fixture.descriptor.acquisition.loggedOut, "DECLARED");
  assert.equal(fixture.descriptor.acquisition.incognito, "UNKNOWN");
  assert.equal(fixture.descriptor.acquisition.personalizationAbsent, "UNKNOWN");
});

test("bad archive and artifact hashes fail closed", () => {
  const { fixture } = validateSynthetic();
  const badArchive = { ...fixture.archiveIndex, archiveSha256: "f".repeat(64) };
  assert.ok(validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: badArchive, checksumEntries: fixture.checksums }).issues.includes("DOSSIER_ARCHIVE_HASH_MISMATCH"));
  fixture.descriptor.artifacts[0].expectedSha256 = "e".repeat(64);
  assert.ok(validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: fixture.checksums }).issues.some((issue) => issue.startsWith("DOSSIER_ARTIFACT_HASH_MISMATCH")));
});

test("missing evidence and incoherent screenshot references fail closed", () => {
  const { fixture } = validateSynthetic();
  fixture.descriptor.alternatives[0].screenshotEvidenceRefs = ["SCREEN_DOES_NOT_EXIST"];
  const result = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: fixture.checksums });
  assert.ok(result.issues.some((issue) => issue.startsWith("DOSSIER_SCREENSHOT_REFERENCE_INCOHERENT")));
  assert.ok(result.issues.some((issue) => issue.startsWith("DOSSIER_SCREENSHOT_UNASSOCIATED")));
});

test("unsafe paths and case-folded ZIP collisions are rejected", () => {
  assert.throws(() => normalizeDossierArchivePathV3("../escape.png"), /DOSSIER_ARCHIVE_PATH_UNSAFE/);
  assert.throws(() => normalizeDossierArchivePathV3("C:/escape.png"), /DOSSIER_ARCHIVE_PATH_UNSAFE/);
  const { fixture } = validateSynthetic();
  const first = fixture.archiveIndex.entries[0];
  const collided = { ...fixture.archiveIndex, entries: [...fixture.archiveIndex.entries, { ...first, path: first.path.toUpperCase() }] };
  const result = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: collided, checksumEntries: fixture.checksums });
  assert.ok(result.issues.some((issue) => issue.startsWith("DOSSIER_ARCHIVE_ENTRY_COLLISION")));
});

test("checksum documents resolve root and nested paths strictly from their own directory", () => {
  for (const fixture of [syntheticPackage(), nestSyntheticPackage(syntheticPackage())]) {
    const checksumEntries = parseFixtureChecksums(fixture);
    const before = JSON.stringify(fixture);
    const result = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries });
    assert.equal(result.validForCustodyImport, true);
    assert.deepEqual(parseFixtureChecksums(fixture), checksumEntries);
    assert.equal(JSON.stringify(fixture), before);
  }
});

test("checksum resolution never searches ZIP roots, strips directories or falls back to basename", () => {
  const fixture = nestSyntheticPackage(syntheticPackage(1));
  const checksumEntries = parseBrowserAssistedDossierChecksumsV3(`${"a".repeat(64)}  alternative-1-1.png\n`, fixture.descriptor.checksumArtifactPath);
  assert.equal(checksumEntries[0].path, "bundle/nested/alternative-1-1.png");
  const result = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries });
  assert.equal(result.validForCustodyImport, false);
  assert.ok(result.issues.includes("DOSSIER_CHECKSUM_COVERAGE_INCOMPLETE"));
});

test("checksum parser rejects bad hashes, duplicates, case collisions and self references", () => {
  for (const content of ["not-a-hash  image.png", `${"a".repeat(63)}  image.png`, " "]) {
    assert.throws(() => parseBrowserAssistedDossierChecksumsV3(content, "checksums.sha256"), /DOSSIER_CHECKSUM_DOCUMENT_INVALID/);
  }
  assert.throws(() => parseBrowserAssistedDossierChecksumsV3("", "checksums.sha256"), /DOSSIER_CHECKSUM_DOCUMENT_EMPTY/);
  for (const second of ["image.png", "IMAGE.PNG"]) {
    assert.throws(() => parseBrowserAssistedDossierChecksumsV3(`${"a".repeat(64)}  image.png\n${"b".repeat(64)}  ${second}`, "checksums.sha256"), /DOSSIER_CHECKSUM_ENTRY_COLLISION/);
  }
  assert.throws(() => parseBrowserAssistedDossierChecksumsV3(`${"a".repeat(64)}  checksums.sha256`, "checksums.sha256"), /DOSSIER_CHECKSUM_SELF_REFERENCE/);
});

test("checksum coverage rejects missing artifacts, missing checksums and altered file hashes", () => {
  const fixture = syntheticPackage();
  const checksumEntries = [...parseFixtureChecksums(fixture)];
  const missing = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: { ...fixture.archiveIndex, entries: fixture.archiveIndex.entries.slice(1) }, checksumEntries });
  assert.equal(missing.validForCustodyImport, false);
  assert.ok(missing.issues.some((issue) => issue.startsWith("DOSSIER_REFERENCED_ARTIFACT_MISSING")));
  const coverage = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: checksumEntries.slice(1) });
  assert.ok(coverage.issues.includes("DOSSIER_CHECKSUM_COVERAGE_INCOMPLETE"));
  checksumEntries[0] = { ...checksumEntries[0], sha256: "e".repeat(64) };
  const altered = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries });
  assert.ok(altered.issues.some((issue) => issue.startsWith("DOSSIER_INTERNAL_CHECKSUM_MISMATCH")));
});

test("archive and checksum paths reject traversal, ADS, reserved Windows names and ambiguous suffixes", () => {
  const unsafe = ["../image.png", "/image.png", "C:/image.png", "dir\\image.png", "dir//image.png", "image.png:stream", "NUL.png", "dir/CON", "COM1.jpg", "LPT9.txt", "COM\u00b9.txt", "image.png.", "image.png ", " image.png", "dir./image.png", "dir /image.png", "image\t.png", "image?.png", "image|.png"];
  for (const path of unsafe) {
    assert.throws(() => normalizeDossierArchivePathV3(path), /DOSSIER_ARCHIVE_PATH_UNSAFE/);
    assert.throws(() => parseBrowserAssistedDossierChecksumsV3(`${"a".repeat(64)}  ${path}`, "nested/checksums.sha256"), /DOSSIER_ARCHIVE_PATH_UNSAFE/);
  }
});

test("real PowerShell indexer rejects unsafe ZIP aliases before extraction", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  for (const paths of [["image.png:stream"], ["CON.png"], ["dir\\..\\image.png"], ["dir\\image.png", "dir/image.png"], ["image.png."], ["image.png", "IMAGE.PNG"], ["dir", "dir/image.png"], ["../image.png"]]) {
    const fixture = createUnsafeZipFixture(paths);
    const extractionRoot = join(fixture.root, "extracted");
    try {
      const indexed = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", resolve(ROOT, "scripts/index-v3-browser-assisted-dossier-archive.ps1"), "-ArchivePath", fixture.archive, "-ExpectedSha256", fixture.archiveSha256, "-ExtractionRoot", extractionRoot], { encoding: "utf8", windowsHide: true });
      assertPowerShell51Started(indexed, "unsafe ZIP indexing");
      assert.equal(indexed.status, 41);
      assert.match(indexed.stderr, /DOSSIER_ARCHIVE_(?:PATH_UNSAFE|ENTRY_COLLISION|FILE_DIRECTORY_COLLISION)/);
      assert.equal(existsSync(extractionRoot), false);
    } finally { rmSync(fixture.root, { recursive: true, force: true }); }
  }
});

test("PowerShell indexer preserves legacy ZIP backslash separators through one canonical normalization", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const fixture = createUnsafeZipFixture(["nested\\screen.png"]);
  const extractionRoot = join(fixture.root, "extracted");
  try {
    const indexed = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", resolve(ROOT, "scripts/index-v3-browser-assisted-dossier-archive.ps1"), "-ArchivePath", fixture.archive, "-ExpectedSha256", fixture.archiveSha256, "-ExtractionRoot", extractionRoot], { encoding: "utf8", windowsHide: true });
    assertPowerShell51Started(indexed, "legacy separator ZIP indexing");
    assert.equal(indexed.status, 0, `${indexed.stdout}\n${indexed.stderr}`);
    const index = JSON.parse(indexed.stdout) as StayOptiBrowserAssistedArchiveIndexV3;
    assert.equal(index.entries[0].path, "nested/screen.png");
    assert.deepEqual([...readFileSync(join(extractionRoot, "nested", "screen.png"))], [42]);
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("PowerShell indexer never removes or overwrites a pre-existing extraction directory", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, () => {
  const fixture = createZipFixture(syntheticPackage(1));
  const extractionRoot = join(fixture.root, "existing");
  mkdirSync(extractionRoot);
  const preserved = join(extractionRoot, "synthetic-preserved.txt");
  writeFileSync(preserved, "PRESERVE_SYNTHETIC_BYTES");
  try {
    const indexed = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", resolve(ROOT, "scripts/index-v3-browser-assisted-dossier-archive.ps1"), "-ArchivePath", fixture.archive, "-ExpectedSha256", sha256(readFileSync(fixture.archive)), "-ExtractionRoot", extractionRoot], { encoding: "utf8", windowsHide: true });
    assertPowerShell51Started(indexed, "pre-existing extraction root check");
    assert.equal(indexed.status, 41);
    assert.match(indexed.stderr, /DOSSIER_EXTRACTION_ROOT_ALREADY_EXISTS/);
    assert.equal(readFileSync(preserved, "utf8"), "PRESERVE_SYNTHETIC_BYTES");
  } finally { rmSync(fixture.root, { recursive: true, force: true }); }
});

test("capture, import and custody timestamps remain distinct and ordered", () => {
  const { fixture } = validateSynthetic();
  const valid = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: fixture.checksums, importedAt: "2026-09-05T13:00:00.000Z", custodyStartedAt: "2026-09-05T13:01:00.000Z" });
  assert.equal(valid.validForCustodyImport, true);
  const invalid = validateBrowserAssistedDossierForCustodyV3({ descriptor: fixture.descriptor, archiveIndex: fixture.archiveIndex, checksumEntries: fixture.checksums, importedAt: "2026-09-05T09:00:00.000Z", custodyStartedAt: "2026-09-05T08:00:00.000Z" });
  assert.ok(invalid.issues.includes("DOSSIER_IMPORT_CUSTODY_TIMESTAMP_INVALID"));
  assert.ok(invalid.issues.some((issue) => issue.startsWith("DOSSIER_CAPTURE_AFTER_IMPORT")));
});

test("custody-v2 remains readable without implicit migration", async () => {
  const custodyV2: any = await importEsm(pathToFileURL(CUSTODY_V2_MODULE).href);
  const root = mkdtempSync(join(tmpdir(), "StayOpti-CustodyV2-Compatibility-"));
  try {
    const paths = custodyV2.createManualMarketSessionPathsV2(root, "V3_17T5B_SYNTHETIC_CUSTODY_V2_COMPAT");
    assert.equal(paths.sessionId, "V3_17T5B_SYNTHETIC_CUSTODY_V2_COMPAT");
    assert.equal(custodyV2.MANUAL_MARKET_STATE_VERSION_V2, "stayopti.v3.manual-public-market-canary-state@2");
    assert.notEqual(custodyV2.MANUAL_MARKET_STATE_VERSION_V2, STAYOPTI_BROWSER_ASSISTED_DOSSIER_CUSTODY_VERSION_V3);
    assert.equal(existsSync(paths.sessionRoot), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("fifteen genuine JPEG screenshots with png names and nested checksums round-trip byte-identically through real Windows DPAPI custody", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, async () => {
  const fixture = nestSyntheticPackage(useRealSyntheticJpegScreenshots(syntheticPackage(15)));
  const zip = createZipFixture(fixture);
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-Dossier-Private-"));
  try {
    const custody: any = await importEsm(pathToFileURL(CUSTODY_MODULE).href);
    const imported = custody.importBrowserAssistedDossierToCustodyV3({
      repositoryRoot: ROOT,
      privateRoot,
      sessionId: fixture.descriptor.sessionId,
      archivePath: zip.archive,
      descriptor: fixture.descriptor,
      contractModule,
      quarantineModule,
      importedAt: "2026-09-05T13:00:00.000Z",
      custodyStartedAt: "2026-09-05T13:01:00.000Z",
    });
    assert.equal(imported.screenshotCount, 15);
    assert.equal(imported.state.status, "FINALIZED_DIAGNOSTIC_ONLY");
    assert.equal(imported.state.collectorCustodyBeginsAtImport, true);
    assert.equal(imported.state.retroactiveCaptureCertification, false);
    const storeModule: any = await importEsm(pathToFileURL(resolve(ROOT, "scripts/provider-raw-quarantine-store.mjs")).href);
    const reopened = custody.reopenBrowserAssistedDossierCustodyV3({
      sessionRoot: imported.sessionRoot,
      quarantineModule,
      keyProtector: storeModule.createWindowsCurrentUserDpapiProtectorV3(),
    });
    const screenshots = reopened.artifacts.filter((entry: { artifactKind: string }) => entry.artifactKind === "SCREENSHOT");
    assert.equal(screenshots.length, 15);
    for (const screenshot of screenshots) {
      const artifact = fixture.descriptor.artifacts.find((entry) => entry.evidenceRef === screenshot.evidenceRef)!;
      assert.equal(screenshot.sha256, sha256(fixture.fileBytes.get(artifact.archiveEntryPath)!));
    }
    assert.equal(reopened.state.automaticGoldenAdmission, false);
    assert.equal(reopened.state.blindJudgmentEligible, false);
    assert.equal(reopened.state.v3ReplayEligible, false);
    const projection = custody.sanitizedBrowserAssistedDossierCustodyProjectionV3(imported.sessionRoot);
    assert.equal(projection.artifactBindings.filter((entry: { artifactKind: string }) => entry.artifactKind === "SCREENSHOT").length, 15);
    assert.equal(projection.alternativeScreenshotBindings.flatMap((entry: { screenshotEvidenceRefs: string[] }) => entry.screenshotEvidenceRefs).length, 15);
    assert.equal(JSON.stringify(projection).includes("archiveEntryPath"), false);
    assert.equal(projection.automaticBlindJudgmentEligible, false);
  } finally {
    rmSync(zip.root, { recursive: true, force: true });
    rmSync(privateRoot, { recursive: true, force: true });
  }
});

test("interrupted imports leave no valid session and retries cannot overwrite an existing session", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, async () => {
  const fixture = syntheticPackage(15);
  const zip = createZipFixture(fixture);
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-Dossier-Interruption-"));
  try {
    const custody: any = await importEsm(pathToFileURL(CUSTODY_MODULE).href);
    const common = { repositoryRoot: ROOT, privateRoot, sessionId: fixture.descriptor.sessionId, archivePath: zip.archive, descriptor: fixture.descriptor, contractModule, quarantineModule, keyProtector: SYNTHETIC_KEY_PROTECTOR, importedAt: "2026-09-05T13:00:00.000Z", custodyStartedAt: "2026-09-05T13:01:00.000Z" };
    assert.throws(() => custody.importBrowserAssistedDossierToCustodyV3({ ...common, faultAt: "AFTER_ARTIFACT_7" }), /DOSSIER_SYNTHETIC_FAULT_AFTER_ARTIFACT_7/);
    assert.equal(existsSync(join(privateRoot, fixture.descriptor.sessionId)), false);
    assert.deepEqual(readdirSync(privateRoot).filter((name) => name.startsWith(".importing-")), []);
    const imported = custody.importBrowserAssistedDossierToCustodyV3(common);
    assert.equal(existsSync(imported.sessionRoot), true);
    assert.throws(() => custody.importBrowserAssistedDossierToCustodyV3(common), /DOSSIER_CUSTODY_SESSION_EXISTS/);
  } finally {
    rmSync(zip.root, { recursive: true, force: true });
    rmSync(privateRoot, { recursive: true, force: true });
  }
});

test("wrong expected archive hash is rejected before custody is created", { skip: WINDOWS_POWERSHELL_51_REQUIRED }, async () => {
  const fixture = syntheticPackage(1);
  const zip = createZipFixture(fixture);
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-Dossier-BadHash-"));
  try {
    fixture.descriptor.expectedArchiveSha256 = "a".repeat(64);
    const custody: any = await importEsm(pathToFileURL(CUSTODY_MODULE).href);
    assert.throws(() => custody.importBrowserAssistedDossierToCustodyV3({ repositoryRoot: ROOT, privateRoot, sessionId: fixture.descriptor.sessionId, archivePath: zip.archive, descriptor: fixture.descriptor, contractModule, quarantineModule, keyProtector: SYNTHETIC_KEY_PROTECTOR }), /DOSSIER_ARCHIVE_HASH_MISMATCH/);
    assert.equal(existsSync(join(privateRoot, fixture.descriptor.sessionId)), false);
  } finally {
    rmSync(zip.root, { recursive: true, force: true });
    rmSync(privateRoot, { recursive: true, force: true });
  }
});

test("the custody implementation contains no network, browser or automatic promotion path", () => {
  const source = readFileSync(CUSTODY_MODULE, "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\/|playwright|puppeteer|selenium/i);
  assert.match(source, /automaticGoldenAdmission:\s*false/);
  assert.match(source, /automaticBlindJudgmentEligible:\s*false/);
  assert.match(source, /automaticReplayEligible:\s*false/);
});
