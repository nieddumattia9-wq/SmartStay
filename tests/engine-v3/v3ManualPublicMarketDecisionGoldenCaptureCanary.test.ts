import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  STAYOPTI_MANUAL_MARKET_CREDENTIALS_LOADED_V3,
  STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3,
  validateManualMarketPaymentDecompositionV3,
  validateManualMarketPrivateIdentityPairV3,
  validateManualMarketTextConditionV3,
} from "../../src/engine-v3/evaluation/manualPublicMarketDecisionGoldenCaptureV3";

const root = process.cwd();
const compiledRoot = resolve(__dirname, "../..");
const hostPath = resolve(root, "scripts/run-v3-17t5b-manual-public-market-canary.mjs");
const launcherPath = resolve(root, "scripts/invoke-v3-17t5b-manual-public-market-canary.ps1");
const pickerPath = resolve(root, "scripts/select-v3-17t5b-private-evidence.ps1");
const zipPath = resolve(root, "scripts/create-v3-17t5b-evidence-zip.ps1");
const postfinalizationPath = resolve(root, "scripts/test-v3-17t5b-postfinalization-user-filesystem.ps1");
const custodyPath = resolve(root, "scripts/manual-market-session-custody-v2.mjs");
const host = readFileSync(hostPath, "utf8");
const launcher = readFileSync(launcherPath, "utf8");
const picker = readFileSync(pickerPath, "utf8");
const zipper = readFileSync(zipPath, "utf8");
const custody = readFileSync(custodyPath, "utf8");
const postfinalization = readFileSync(postfinalizationPath, "utf8");

test("T5B 01 interface is a guided Italian flow and not a JSON editor", () => {
  assert.match(host, /Scenario congelato: Firenze/);
  assert.match(host, /Alternativa idonea/);
  assert.doesNotMatch(host, /modifica(?:re)?\s+JSON/i);
});

test("T5B 02 fixed scenario is exact", () => {
  for (const value of ["Florence, Italy", "2026-10-15", "2026-10-18", "budgetMinorUnits: 60000", "preferenceProfile: \"BALANCED\""]) assert.match(host, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("T5B 03 exactly five eligible alternatives are collected", () => {
  assert.match(host, /EXPECTED_ALTERNATIVES = 5/);
  assert.match(host, /state\.alternatives\.length < EXPECTED_ALTERNATIVES/);
});

test("T5B 04 progress is saved after each accepted or excluded result", () => {
  assert.ok((host.match(/persistState\(statePath, state\)/g) ?? []).length >= 4);
  assert.match(host, /Progresso:/);
});

test("T5B 05 a saved session resumes without re-entering prior hotels", () => {
  assert.match(host, /Ripresa automatica/);
  assert.match(host, /existsSync\(statePath\)/);
});

test("T5B 06 corrections are supported before finalization", () => {
  assert.match(host, /CORREGGI <alternativa 1\.\.5> <campo 3\.\.16>/);
  assert.match(host, /Le tre prove private restano invariate/);
});

test("T5B 07 private files are selected through a native dialog", () => {
  assert.match(picker, /OpenFileDialog/);
  assert.match(host, /selectPrivateFile/);
  assert.match(host, /readFileSync\(selectedFile\)/);
});

test("T5B 08 private evidence uses the encrypted CurrentUser store outside the repository", () => {
  assert.match(host, /createProviderRawQuarantineStoreV3/);
  assert.match(host, /createWindowsCurrentUserDpapiProtectorV3/);
  assert.match(launcher, /LocalApplicationData/);
  assert.match(launcher, /manual-market-golden-capture/);
});

test("T5B 09 private identity and proof are absent from sanitized Evidence", () => {
  assert.match(host, /PRIVATE_SOURCE_AND_PRESENTATION_METADATA/);
  assert.match(host, /privateEvidenceIncludedInSharedEvidence: false/);
  assert.match(host, /ensureNoSharedLeak/);
});

test("T5B 10 public precheckout prices retain non-bookable invariants", () => {
  for (const invariant of ["purchaseCompleted: false", "bookingConfirmed: false", "exactBookable: false", "verifiedCheckoutTotal: false", "personalizedDiscount: false"]) assert.match(host, new RegExp(invariant));
});

test("T5B 11 judgment, V3 execution and Golden admission remain disabled", () => {
  assert.match(host, /judgmentRecorded: false/);
  assert.match(host, /v3Executed: false/);
  assert.match(host, /automaticGoldenAdmission: false/);
  assert.match(host, /DECISION_GOLDEN_ADMITTED=NO/);
});

test("T5B 12 no network, scraping, credential or Booking automation capability exists", () => {
  assert.equal(STAYOPTI_MANUAL_MARKET_NETWORK_CALLS_V3, 0);
  assert.equal(STAYOPTI_MANUAL_MARKET_CREDENTIALS_LOADED_V3, false);
  assert.doesNotMatch(host, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https\.request|http\.request|puppeteer|playwright|selenium/i);
  assert.doesNotMatch(launcher, /Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer/i);
});

test("T5B 13 evidence ZIP is created from sanitized files only", () => {
  assert.match(zipper, /CreateFromDirectory/);
  assert.match(host, /rawPrivateEvidenceIncluded: false/);
  assert.doesNotMatch(host, /artifacts\.set\([^\n]*(?:privateLedger|screenshot|sourceUrl|realName)/i);
});

test("T5B 14 PowerShell launcher binds an explicit execution HEAD before startup", () => {
  assert.match(launcher, /ExpectedExecutionHead/);
  assert.match(launcher, /MANUAL_CAPTURE_HEAD_MISMATCH/);
  assert.match(launcher, /git diff --cached --name-only/);
});

test("T5B 15 PowerShell 5.1 scripts parse", { skip: process.platform !== "win32" }, () => {
  for (const path of [launcherPath, pickerPath, zipPath, postfinalizationPath]) {
    const parse = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$e=$null;$t=$null;[Management.Automation.Language.Parser]::ParseFile($env:STAYOPTI_PS,[ref]$t,[ref]$e)|Out-Null;if($e.Count){exit 1}"], { encoding: "utf8", windowsHide: true, env: { ...process.env, STAYOPTI_PS: path } });
    assert.equal(parse.status, 0, parse.stderr);
  }
});

test("T5B 16 synthetic dry run covers save, resume, encryption, snapshot, capsule and Evidence", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const run = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcherPath, "-Mode", "dry-run", "-ExpectedExecutionHead", head], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const receipt = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1)!);
  assert.deepEqual(receipt, {
    status: "PASS",
    alternatives: 5,
    progressiveSave: true,
    resume: true,
    validation: true,
    encryptedPrivateEvidence: true,
    tamperDetection: true,
    providerNeutralSnapshot: true,
    blindCapsule: false,
    sanitizedEvidence: true,
    plaintextPrivateEvidenceAtRest: false,
    sessionScopedCustody: true,
    atomicVersionedState: true,
    privateManifest: true,
    fileByFileFingerprintBinding: true,
    finalizedSessionReopened: true,
    powerShell51PostfinalizationVerifierAvailable: true,
    syntheticFixtureEligibleAsRealProof: false,
    automatedHttpRequests: 0,
    credentialsLoaded: false,
    syntheticArtifactsDeleted: true,
  });
});

test("T5B 17 name prompt rejects a pasted URL before any save", () => {
  assert.equal(validateManualMarketPrivateIdentityPairV3("https://www.booking.com/hotel/it/uno.it.html", "UNKNOWN").reasonCode, "MANUAL_CAPTURE_NAME_LOOKS_LIKE_URL");
  assert.match(host, /scrivi soltanto il nome visibile, non incollare il link/);
});

test("T5B 18 locally detectable cross-property name and URL mismatch is rejected", () => {
  assert.deepEqual(validateManualMarketPrivateIdentityPairV3("Palazzo Firenze", "https://www.booking.com/hotel/it/casa-arno.it.html"), {
    valid: false,
    reasonCode: "MANUAL_CAPTURE_NAME_URL_MISMATCH_DETECTED",
  });
  assert.equal(validateManualMarketPrivateIdentityPairV3("Palazzo Firenze", "https://www.booking.com/hotel/it/palazzo-firenze.it.html").valid, true);
});

test("T5B 19 category guidance and UNKNOWN are explicit", () => {
  for (const value of ["Hotel 3 stelle", "Appartamento", "Affittacamere", "Campeggio", "UNKNOWN"]) assert.match(host, new RegExp(value));
});

test("T5B 20 every field is contextualized by organic position and current name", () => {
  assert.match(host, /\[Posizione organica \$\{observedOrder\} — \$\{currentName\}\]/);
  assert.match(host, /alternativeFieldLabel\(observedOrder, draft\.realName/);
});

test("T5B 21 a draft is confirmed and field-correctable before persistence", () => {
  assert.match(host, /RIEPILOGO PRIMA DEL SALVATAGGIO/);
  assert.match(host, /SALVA, CORREGGI 1\.\.17 oppure ANNULLA/);
  const confirmationIndex = host.indexOf('action === "SALVA"');
  const encryptionIndex = host.indexOf('realName: capturePrivate');
  assert.ok(confirmationIndex >= 0 && encryptionIndex > confirmationIndex);
});

test("T5B 22 interrupted or cancelled incomplete alternative is never auto-saved", () => {
  assert.match(host, /partialAlternativeAutoSave: false/);
  assert.match(host, /Bozza annullata: nessuna alternativa e nessuna prova privata sono state salvate/);
  assert.doesNotMatch(host.slice(host.indexOf("async function collectAlternative"), host.indexOf("const privateEvidence")), /persistState\(/);
});

test("T5B 23 every completed field exposes immediate back and single-field correction", () => {
  assert.match(host, /Premi INVIO per continuare; oppure INDIETRO, CORREGGI 1\.\.17, RIEPILOGO o ANNULLA/);
  assert.match(host, /reviewProgressBeforeNextField/);
  assert.match(host, /Campo \$\{field\} corretto nella bozza in memoria/);
});

test("T5B 24 numeric values cannot become refundability or cancellation conditions", () => {
  assert.deepEqual(validateManualMarketTextConditionV3("123,45"), {
    valid: false,
    reasonCode: "MANUAL_CAPTURE_NUMERIC_VALUE_NOT_TEXT_CONDITION",
  });
  assert.equal(validateManualMarketTextConditionV3("CONDIZIONE TESTUALE VISIBILE ALL'UTENTE").valid, true);
  assert.equal(validateManualMarketTextConditionV3("UNKNOWN").valid, true);
  assert.match(host, /CONDIZIONE TESTUALE di rimborsabilità/);
});

test("T5B 25 pay-later wording cannot silently become a zero pay-at-property amount", () => {
  assert.match(host, /se leggi soltanto 'non paghi ora', scrivi UNKNOWN: non equivale a pagamento in struttura = 0/);
  assert.match(host, /IMPORTO NUMERICO da pagare in struttura/);
  assert.equal(validateManualMarketPaymentDecompositionV3(54400, 54360, 0).reasonCode, "MANUAL_CAPTURE_PAYMENT_SPLIT_MISMATCH");
  assert.equal(validateManualMarketPaymentDecompositionV3(54400, 54360, null).reasonCode, "MANUAL_CAPTURE_PAYMENT_SPLIT_PARTIALLY_UNKNOWN");
  assert.match(host, /Nessun dato è stato salvato/);
});

test("T5B 26 cancellation of the current draft preserves the session", () => {
  assert.match(host, /ANNULLA scarta soltanto l'alternativa corrente e conserva la sessione/);
  assert.match(host, /La sessione rimane disponibile/);
  assert.match(host, /interruptPartialPersistence: false/);
});

test("T5B 27 legacy diagnostic sessions are immutable and successor identity is explicit", () => {
  assert.match(host, /RETIRED_DIAGNOSTIC_SESSION_ID = "V3_17T5B_FLORENCE_20261015_002"/);
  assert.match(host, /validateSuccessorSessionIdV2\(option\("session-id"\)\)/);
  assert.match(launcher, /MANUAL_CAPTURE_SUCCESSOR_SESSION_ID_REQUIRED/);
  assert.match(host, /legacySessionRepairAllowed: false/);
});

test("T5B 28 finalized diagnostic session supports field-targeted offline repair and re-export", () => {
  assert.match(launcher, /repair-export/);
  assert.match(launcher, /--session-id=\$SessionId/);
  assert.match(launcher, /MANUAL_CAPTURE_SUCCESSOR_SESSION_ID_REQUIRED/);
  assert.match(launcher, /\$Mode -ieq 'repair-export'/);
  assert.doesNotMatch(launcher, /\$Mode -c(?:eq|ne) 'repair-export'/);
  assert.match(host, /CORREGGI <alternativa 1\.\.5> <campo 3\.\.16>/);
  assert.match(host, /ALTERNATIVES_REUSED=5/);
  assert.match(host, /PRIVATE_EVIDENCE_MODIFIED=NO/);
  assert.match(host, /allowBlindCapsule: false/);
  assert.match(host, /BLIND_CAPSULE_CREATED=NO/);
  assert.match(host, /V3_EXECUTED=NO/);
  assert.match(host, /GOLDEN_ADMISSION=NO/);
});

test("T5B 29 location entry preserves verified text instead of coercing it to distance", () => {
  assert.match(host, /posizione testuale verificata/);
  assert.match(host, /VERIFIED_TEXTUAL_POSITION/);
  assert.match(host, /locationEvidence/);
});

test("T5B 30 repair applies only after explicit single-field confirmation", () => {
  const applyIndex = host.indexOf('confirm !== "APPLICA"');
  const mutationIndex = host.indexOf("entry.publicData = repairedPublicData");
  assert.ok(applyIndex >= 0 && mutationIndex > applyIndex);
  assert.match(host, /Correzione annullata; lo stato salvato non è cambiato/);
});

test("T5B 31 synthetic repair reuses five alternatives, preserves private handles and exports without blind work", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const run = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcherPath, "-Mode", "repair-dry-run", "-ExpectedExecutionHead", head], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const receipt = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1)!);
  assert.deepEqual(receipt, {
    status: "PASS",
    existingAlternativesReused: 5,
    targetedFieldsRepaired: true,
    caseInsensitiveUnknownDetected: true,
    paymentSplitMismatchDetected: true,
    textualLocationPreserved: true,
    privateEvidenceModified: false,
    sanitizedReexport: true,
    blindCapsuleCreated: false,
    v3Executed: false,
    goldenAdmission: false,
    automatedHttpRequests: 0,
    syntheticArtifactsDeleted: true,
  });
});

test("T5B 32 retired diagnostic session cannot enter repair lookup", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T5B-Retired-"));
  try {
    const run = spawnSync("node", [hostPath, "--mode=repair-export", `--repository-root=${root}`, `--compiled-root=${compiledRoot}`, `--private-root=${privateRoot}`, "--session-id=V3_17T5B_FLORENCE_20261015_002"], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 120_000 });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /MANUAL_CAPTURE_LEGACY_DIAGNOSTIC_SESSION_IMMUTABLE/);
  } finally { rmSync(privateRoot, { recursive: true, force: true }); }
});

test("T5B 33 repair lookup fails closed when no explicit session identity is supplied", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T5B-RepairLookupMissing-"));
  try {
    const run = spawnSync("node", [hostPath, "--mode=repair-export", `--repository-root=${root}`, `--compiled-root=${compiledRoot}`, `--private-root=${privateRoot}`], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      input: "ANNULLA\n",
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /MANUAL_CAPTURE_REPAIR_SESSION_ID_REQUIRED/);
    assert.doesNotMatch(run.stdout, /OFFLINE_REPAIR_READY=YES/);
  } finally {
    rmSync(privateRoot, { recursive: true, force: true });
  }
});

test("T5B 34 true PowerShell launcher finalizes then reopens hardened synthetic custody", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  const run = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcherPath, "-Mode", "dry-run", "-ExpectedExecutionHead", head], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const receipt = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1)!);
  assert.equal(receipt.powerShell51PostfinalizationVerifierAvailable, true);
  assert.equal(receipt.finalizedSessionReopened, true);
  assert.equal(receipt.syntheticFixtureEligibleAsRealProof, false);
});

test("T5B 35 repair preflight distinguishes parse failure from a missing state file", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T5B-RepairParse-"));
  const sessionId = "V3_17T5B_SYNTHETIC_PARSE_010";
  const sessionRoot = join(privateRoot, sessionId);
  const statePath = join(sessionRoot, "session-state.json");
  mkdirSync(sessionRoot, { recursive: true });
  writeFileSync(statePath, "{invalid-json", "utf8");
  try {
    const run = spawnSync("node", [hostPath, "--mode=repair-preflight", `--repository-root=${root}`, `--compiled-root=${compiledRoot}`, `--private-root=${privateRoot}`, "--launcher-powershell-version=5.1", `--session-id=${sessionId}`], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    assert.notEqual(run.status, 0);
    const receipt = JSON.parse(run.stdout.trim().split(/\r?\n/)[0]);
    assert.equal(receipt.stateFileExists, true);
    assert.equal(receipt.stateFileIsFile, true);
    assert.equal(receipt.stateFileReadable, true);
    assert.equal(receipt.stateJsonParseable, false);
    assert.equal(receipt.failureClassification, "MANUAL_CAPTURE_REPAIR_SESSION_PARSE_FAILED");
    assert.equal(readFileSync(statePath, "utf8"), "{invalid-json");
  } finally {
    rmSync(privateRoot, { recursive: true, force: true });
  }
});

test("T5B 36 repair-export emits the sanitized shared diagnostic before a fail-closed lookup error", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T5B-RepairMissing-"));
  const sessionId = "V3_17T5B_SYNTHETIC_MISSING_011";
  try {
    const run = spawnSync("node", [hostPath, "--mode=repair-export", `--repository-root=${root}`, `--compiled-root=${compiledRoot}`, `--private-root=${privateRoot}`, "--launcher-powershell-version=5.1", `--session-id=${sessionId}`], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    assert.notEqual(run.status, 0);
    const diagnosticLine = run.stderr.split(/\r?\n/).find((line) => line.startsWith("MANUAL_CAPTURE_REPAIR_PREFLIGHT="));
    assert.ok(diagnosticLine);
    const diagnostic = JSON.parse(diagnosticLine.slice("MANUAL_CAPTURE_REPAIR_PREFLIGHT=".length));
    assert.equal(diagnostic.sessionId, sessionId);
    assert.equal(diagnostic.stateFileExists, false);
    assert.equal(diagnostic.stateFileIsFile, false);
    assert.equal(diagnostic.stateFileReadable, false);
    assert.equal(diagnostic.failureClassification, "MANUAL_CAPTURE_REPAIR_SESSION_NOT_FOUND");
    assert.doesNotMatch(diagnosticLine, /hotelName|booking\.com|https?:\/\//i);
  } finally {
    rmSync(privateRoot, { recursive: true, force: true });
  }
});

test("T5B 37 successor custody is session-scoped and legacy diagnostic identities are immutable", () => {
  assert.match(custody, /MANUAL_CAPTURE_LEGACY_DIAGNOSTIC_SESSION_IMMUTABLE/);
  assert.match(custody, /encryptedRoot: join\(sessionRoot, "encrypted"\)/);
  assert.match(host, /legacySessionRepairAllowed: false/);
});

test("T5B 38 state is atomic, versioned, recoverable and never deleted at finalization", () => {
  assert.match(custody, /session-state\.recovery\.json/);
  assert.match(custody, /state-history/);
  assert.match(custody, /persistVersionedSessionStateV2/);
  assert.match(custody, /renameSync\(temporary, path\)/);
  assert.doesNotMatch(host.slice(host.indexOf("async function finalize"), host.indexOf("async function askRequired")), /rmSync\([^\n]*(?:statePath|sessionRoot|privateManifestPath)/);
});

test("T5B 39 each alternative is bound to three encrypted envelopes and shared Evidence receives non-identifying fingerprints", () => {
  for (const kind of ["PROPERTY_NAME", "SOURCE_URL", "SCREENSHOT"]) assert.match(custody, new RegExp(kind));
  assert.match(custody, /MANUAL_CAPTURE_THREE_PRIVATE_ENVELOPES_REQUIRED/);
  assert.match(host, /private-envelope-fingerprints\.json/);
  assert.match(custody, /FILE_BY_FILE_NON_IDENTIFYING_HASH_BINDING/);
});

test("T5B 40 fixtures and temporary roots can never be promoted as real filesystem proof", () => {
  assert.match(postfinalization, /eligibleAsRealOperationalProof/);
  assert.match(postfinalization, /fixtureOrTempResultPromotableToRealProof = \$false/);
  assert.match(postfinalization, /SYNTHETIC_TEMP_FIXTURE/);
  assert.match(host, /syntheticFixtureEligibleAsRealProof: false/);
});

test("T5B 41 successor save requires complete payment consistency and three private evidence items", () => {
  assert.match(host, /validateManualMarketPaymentDecompositionV3/);
  assert.match(host, /draft\.selectedFile === null/);
  assert.match(host, /Nessun dato è stato salvato/);
  assert.equal(validateManualMarketPaymentDecompositionV3(60000, 50000, 10000).valid, true);
});

test("T5B 42 implausible dates and case-insensitive unknown remain fail-closed", () => {
  assert.equal(validateManualMarketTextConditionV3("Rimborsabile prima del 122 ott").reasonCode, "MANUAL_CAPTURE_TEXT_DATE_IMPLAUSIBLE");
  assert.equal(validateManualMarketTextConditionV3("unknown").reasonCode, "MANUAL_CAPTURE_TEXT_CONDITION_UNKNOWN");
});

test("T5B 43 PowerShell 5.1 postfinalization verifier checks a synthetic session file by file and refuses real-proof promotion", { skip: process.platform !== "win32", timeout: 120_000 }, () => {
  const privateRoot = mkdtempSync(join(tmpdir(), "StayOpti-V3-17T5B-Postfinalization-"));
  const sessionId = "V3_17T5C_SYNTHETIC_POSTFINALIZATION_001";
  const sessionRoot = join(privateRoot, sessionId);
  const encryptedRoot = join(sessionRoot, "encrypted");
  const historyRoot = join(sessionRoot, "state-history");
  mkdirSync(encryptedRoot, { recursive: true });
  mkdirSync(historyRoot, { recursive: true });
  const alternatives = [];
  const alternativeBindings = [];
  const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  let ordinal = 0;
  for (let index = 0; index < 5; index += 1) {
    const localCaptureId = `MANUAL_ALT_${String(index + 1).padStart(2, "0")}`;
    const privateEvidence: Record<string, unknown> = {};
    const envelopes = [];
    for (const [field, evidenceKind] of [["realName", "PROPERTY_NAME"], ["sourceUrl", "SOURCE_URL"], ["screenshot", "SCREENSHOT"]] as const) {
      ordinal += 1;
      const entryId = `synthetic-entry-${String(ordinal).padStart(2, "0")}`;
      const envelopeFingerprint = hash(`fingerprint-${ordinal}`);
      const serialized = `${JSON.stringify({ entryId, envelopeFingerprint, sessionReference: sessionId, requestKind: evidenceKind })}\n`;
      const filename = `${entryId}.stayopti-rawq`;
      writeFileSync(join(encryptedRoot, filename), serialized, "utf8");
      const handle = { entryId, path: join(encryptedRoot, filename), envelopeFingerprint };
      privateEvidence[field] = handle;
      envelopes.push({ evidenceKind, requestOrdinal: ordinal, entryId, relativePath: `encrypted/${filename}`, envelopeFingerprint, envelopeFileSha256: hash(serialized), localCaptureId });
    }
    alternatives.push({ publicData: { localCaptureId }, privateEvidence });
    alternativeBindings.push({ localCaptureId, envelopes });
  }
  const manifest = { manifestVersion: "stayopti.v3.manual-public-market-private-manifest@2", sessionId, stateVersion: "stayopti.v3.manual-public-market-canary-state@2", alternativeBindings, createdAt: "2026-09-04T00:00:00.000Z", manifestFingerprint: hash("synthetic-manifest-material") };
  const manifestSerialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestHash = hash(manifestSerialized);
  writeFileSync(join(sessionRoot, "private-manifest.json"), manifestSerialized, "utf8");
  const state = { stateVersion: "stayopti.v3.manual-public-market-canary-state@2", sessionId, stateRevision: 2, alternatives, finalized: true, finalizedCustodyVerified: true, privateManifestFileSha256: manifestHash, finalizedPrivateManifestFileSha256: manifestHash };
  const stateSerialized = `${JSON.stringify(state, null, 2)}\n`;
  writeFileSync(join(sessionRoot, "session-state.json"), stateSerialized, "utf8");
  writeFileSync(join(sessionRoot, "session-state.recovery.json"), stateSerialized, "utf8");
  writeFileSync(join(historyRoot, "session-state-r000002-synthetic.json"), stateSerialized, "utf8");
  try {
    const run = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", postfinalizationPath, "-SessionId", sessionId, "-DiagnosticPrivateRoot", privateRoot, "-SyntheticFixture"], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 120_000 });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    const receipt = JSON.parse(run.stdout.trim());
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.envelopeCount, 15);
    assert.equal(receipt.eligibleAsRealOperationalProof, false);
    assert.equal(receipt.fixtureOrTempResultPromotableToRealProof, false);
  } finally { rmSync(privateRoot, { recursive: true, force: true }); }
});
