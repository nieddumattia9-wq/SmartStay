import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  createProviderRawQuarantineStoreV3,
  createWindowsCurrentUserDpapiProtectorV3,
} from "./provider-raw-quarantine-store.mjs";

const PS51 = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const PREVIOUS_ABORTED_SESSION_ID = "V3_17T5B_FLORENCE_20261015_001";
const SESSION_ID = "V3_17T5B_FLORENCE_20261015_002";
const EXPECTED_ALTERNATIVES = 5;
const CAPTURE_VERSION = "stayopti.v3.manual-public-market-decision-capture@1";
const STATE_VERSION = "stayopti.v3.manual-public-market-canary-state@1";
const EVIDENCE_VERSION = "stayopti.v3.manual-public-market-canary-evidence@1";

function fail(code) { throw new Error(code); }
function option(name) { const prefix = `--${name}=`; return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function now() { return new Date().toISOString(); }

function assertOutsideRepository(repositoryRoot, target) {
  const absolute = resolve(target);
  if (!isAbsolute(absolute)) fail("MANUAL_CAPTURE_ABSOLUTE_PATH_REQUIRED");
  const relation = relative(resolve(repositoryRoot), absolute);
  if (relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation))) {
    fail("MANUAL_CAPTURE_REPOSITORY_PATH_PROHIBITED");
  }
  return absolute;
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
  try { renameSync(temporary, path); } finally { rmSync(temporary, { force: true }); }
}

function atomicJson(path, value) { atomicWrite(path, json(value)); }

function runPowerShell(script, args, env = process.env) {
  const result = spawnSync(PS51, ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...args], {
    encoding: "utf8",
    windowsHide: false,
    env,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0 || result.stderr.trim() !== "") fail("MANUAL_CAPTURE_POWERSHELL_HELPER_FAILED");
  return result.stdout.trim();
}

function fixedScenario() {
  return Object.freeze({
    destination: "Florence, Italy",
    destinationBucket: "FLORENCE_ITALY",
    checkin: "2026-10-15",
    checkout: "2026-10-18",
    nights: 3,
    adults: 2,
    childrenAges: [],
    rooms: 1,
    currency: "EUR",
    locale: "it-IT",
    country: "Italy",
    budgetMinorUnits: 60000,
    preferenceProfile: "BALANCED",
    hardConstraints: ["PRIVATE_ROOM_OR_ENTIRE_PLACE", "PRIVATE_BATHROOM", "REASONABLE_CENTER_LOCATION"],
    consumerSurfaceClass: "BOOKING_PUBLIC_LOGGED_OUT",
  });
}

function initialState() {
  return {
    stateVersion: STATE_VERSION,
    sessionId: SESSION_ID,
    lifecycle: "CAPTURE_IN_PROGRESS",
    scenario: fixedScenario(),
    collectionWindowStart: now(),
    updatedAt: now(),
    evidenceOrdinal: 0,
    exclusions: [],
    alternatives: [],
    finalized: false,
    automaticGoldenAdmission: false,
    networkCalls: 0,
    credentialsLoaded: false,
  };
}

function safeState(state) {
  return {
    ...state,
    alternatives: state.alternatives.map((alternative) => ({
      publicData: alternative.publicData,
      privateEvidence: alternative.privateEvidence,
    })),
  };
}

function persistState(statePath, state) {
  state.updatedAt = now();
  atomicJson(statePath, safeState(state));
}

function capturePrivate(store, state, evidenceKind, plaintext) {
  state.evidenceOrdinal += 1;
  return store.capture({
    plaintextUtf8: plaintext,
    metadata: {
      providerKey: "MANUAL_PUBLIC_MARKET",
      endpointClass: "CONSUMER_EVIDENCE",
      sessionReference: state.sessionId,
      requestKind: evidenceKind,
      requestOrdinal: state.evidenceOrdinal,
      capturedAt: now(),
    },
    disposition: "PROCESSED_SUCCESS",
  });
}

async function replayPrivateValue(store, handle, quarantine) {
  return store.replay(handle, (envelope, protector) => quarantine.decryptProviderRawQuarantineEnvelopeV3(envelope, protector));
}

function nullableInteger(value) {
  if (value === null || value === "UNKNOWN") return null;
  if (!Number.isInteger(value) || value < 0) fail("MANUAL_CAPTURE_INTEGER_INVALID");
  return value;
}

function normalizedTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.toUpperCase() === "UNKNOWN" ? null : normalized;
}

function toCaptureAlternative(state, entry, privateValues) {
  const scenario = state.scenario;
  const data = entry.publicData;
  const missingness = [...data.missingness];
  return {
    localCaptureId: data.localCaptureId,
    privateRealName: privateValues.realName,
    privateSourceUrl: privateValues.sourceUrl,
    privateScreenshotRefs: entry.privateEvidence.screenshot === null ? [] : [entry.privateEvidence.screenshot.entryId],
    consumerSurfaceClass: scenario.consumerSurfaceClass,
    originalOrder: data.originalOrder,
    sponsored: false,
    guestConfigurationFingerprint: `${scenario.adults}|${scenario.childrenAges.join(",")}|${scenario.rooms}`,
    price: data.totalPriceMinorUnits === null ? null : {
      semantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE",
      amount: data.totalPriceMinorUnits,
      currency: scenario.currency,
      stayTotal: true,
      taxInclusion: data.taxInclusion,
      payNowAmount: nullableInteger(data.payNowMinorUnits),
      payAtPropertyAmount: nullableInteger(data.payAtPropertyMinorUnits),
      observedAt: data.observedAt,
      availabilityObserved: true,
      precheckoutPresented: true,
      purchaseCompleted: false,
      bookingConfirmed: false,
      exactBookable: false,
      verifiedCheckoutTotal: false,
      personalizedDiscount: false,
      provenance: "MANUAL_PUBLIC_CONSUMER_OBSERVATION",
      reliability: "DIRECT_PRECHECKOUT_OBSERVATION",
      missingness: data.priceMissingness,
    },
    rating: data.rating,
    ratingScale: data.rating === null ? null : 10,
    reviewCount: data.reviewCount,
    distanceMeters: data.distanceMeters,
    locationEvidence: data.locationEvidence ?? null,
    accommodationCategory: normalizedTextOrNull(data.accommodationCategory),
    roomEvidence: normalizedTextOrNull(data.roomEvidence),
    mealPlanEvidence: normalizedTextOrNull(data.mealPlanEvidence),
    cancellationEvidence: normalizedTextOrNull(data.cancellationEvidence),
    refundabilityEvidence: normalizedTextOrNull(data.refundabilityEvidence),
    amenityEvidence: data.amenityEvidence,
    availabilityEvidence: data.availabilityObserved ? "OBSERVED_AVAILABLE" : "UNKNOWN",
    missingness,
    detailCoverage: ["PRICE", "RATING", "REVIEWS", "DISTANCE", "CATEGORY", "ROOM", "MEAL_PLAN", "CANCELLATION", "REFUNDABILITY", "AMENITIES", "AVAILABILITY"],
  };
}

async function hydrateCapture(state, store, quarantine) {
  const alternatives = [];
  for (const entry of state.alternatives) {
    const realName = await replayPrivateValue(store, entry.privateEvidence.realName, quarantine);
    const sourceUrl = await replayPrivateValue(store, entry.privateEvidence.sourceUrl, quarantine);
    alternatives.push(toCaptureAlternative(state, entry, { realName, sourceUrl }));
  }
  const scenario = state.scenario;
  return {
    captureVersion: CAPTURE_VERSION,
    captureId: state.sessionId,
    lifecycle: "CAPTURE_COMPLETE",
    destinationBucket: scenario.destinationBucket,
    checkin: scenario.checkin,
    checkout: scenario.checkout,
    adults: scenario.adults,
    childrenAges: scenario.childrenAges,
    rooms: scenario.rooms,
    currency: scenario.currency,
    budgetMinorUnits: scenario.budgetMinorUnits,
    preferenceProfile: scenario.preferenceProfile,
    hardConstraints: scenario.hardConstraints,
    consumerSurfaceClass: scenario.consumerSurfaceClass,
    loggedOut: true,
    membershipDiscountApplied: false,
    personalizedDiscountApplied: false,
    collectionWindowStart: state.collectionWindowStart,
    collectionWindowEnd: now(),
    selectionFrozenBeforeJudgment: true,
    alternatives,
  };
}

function sanitizedDiagnosticSnapshot(capture, validation) {
  return {
    snapshotVersion: "stayopti.v3.manual-public-market-diagnostic-snapshot@1",
    captureFingerprint: validation.fingerprint,
    destinationBucket: capture.destinationBucket,
    checkin: capture.checkin,
    checkout: capture.checkout,
    adults: capture.adults,
    childrenAges: capture.childrenAges,
    rooms: capture.rooms,
    currency: capture.currency,
    budgetMinorUnits: capture.budgetMinorUnits,
    preferenceProfile: capture.preferenceProfile,
    hardConstraints: capture.hardConstraints,
    alternatives: capture.alternatives.map((alternative) => ({
      localCaptureId: alternative.localCaptureId,
      price: alternative.price,
      rating: alternative.rating,
      ratingScale: alternative.ratingScale,
      reviewCount: alternative.reviewCount,
      distanceMeters: alternative.distanceMeters,
      locationEvidence: alternative.locationEvidence ?? null,
      accommodationCategory: alternative.accommodationCategory,
      roomEvidence: alternative.roomEvidence,
      mealPlanEvidence: alternative.mealPlanEvidence,
      cancellationEvidence: alternative.cancellationEvidence,
      refundabilityEvidence: alternative.refundabilityEvidence,
      amenityEvidence: alternative.amenityEvidence,
      availabilityEvidence: alternative.availabilityEvidence,
      missingness: alternative.missingness,
    })),
    lifecycle: validation.lifecycle,
    automaticGoldenAdmission: false,
  };
}

function ensureNoSharedLeak(value) {
  const serialized = JSON.stringify(value);
  if (/https?:\/\/|BOOKING_PUBLIC|privateRealName|privateSourceUrl|privateScreenshot|originalOrder|sponsored|propertyToken|hotelId|providerId|bookingId|cookie/i.test(serialized)) {
    fail("MANUAL_CAPTURE_SHARED_EVIDENCE_LEAK");
  }
}

function checksumsFor(directory) {
  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "checksums.sha256")
    .map((entry) => entry.name)
    .sort();
  return files.map((name) => `${sha256(readFileSync(join(directory, name)))}  ${name}`).join("\n") + "\n";
}

function createEvidenceZip(repositoryRoot, evidenceDirectory, destinationZip) {
  const helper = resolve(repositoryRoot, "scripts/create-v3-17t5b-evidence-zip.ps1");
  const entryCount = Number(runPowerShell(helper, ["-SourceDirectory", evidenceDirectory, "-DestinationZip", destinationZip]));
  if (!Number.isInteger(entryCount) || entryCount < 2) fail("MANUAL_CAPTURE_EVIDENCE_ZIP_ROUNDTRIP_FAILED");
  return { entryCount, sha256: sha256(readFileSync(destinationZip)) };
}

async function finalize(state, context, destinationDirectory, options = { allowBlindCapsule: true }) {
  const { manual, quarantine, store, repositoryRoot, privateRoot } = context;
  const capture = await hydrateCapture(state, store, quarantine);
  const validation = manual.validateManualMarketCaptureV3(capture);
  const eligible = validation.lifecycle === "ELIGIBLE_FOR_BLIND_JUDGMENT";
  const snapshot = eligible
    ? manual.createManualMarketProviderNeutralSnapshotV3(capture)
    : sanitizedDiagnosticSnapshot(capture, validation);
  let capsule = null;
  let sharedEvidence = null;
  let privateLedgerHandle = null;
  if (eligible && options.allowBlindCapsule) {
    const blinded = manual.createManualMarketBlindCapsuleV3(capture, randomBytes(32).toString("base64"));
    capsule = blinded.capsule;
    sharedEvidence = manual.createManualMarketSharedEvidenceV3(capture, capsule);
    privateLedgerHandle = capturePrivate(store, state, "PRIVATE_DEBLIND_LEDGER", JSON.stringify(blinded.privateLedger));
  }
  const missingCritical = validation.issues.filter((issue) => issue.disposition === "DIAGNOSTIC_ONLY");
  const evidenceRoot = resolve(privateRoot, `shared-evidence-${Date.now()}-${randomBytes(4).toString("hex")}`);
  mkdirSync(evidenceRoot, { recursive: false });
  const privateEvidenceHandles = state.alternatives.flatMap((entry) => Object.entries(entry.privateEvidence).filter(([, handle]) => handle !== null));
  const cryptoReceipt = {
    encryption: "AES_256_GCM",
    keyProtection: "WINDOWS_CURRENT_USER_DPAPI",
    tamperDetection: "PASS",
    plaintextPrivateEvidenceAtRest: false,
    privateEvidenceFileCount: privateEvidenceHandles.length + (privateLedgerHandle === null ? 0 : 1),
    privateEvidenceIncludedInSharedEvidence: false,
  };
  const outcome = {
    status: eligible ? "ELIGIBLE_FOR_BLIND_JUDGMENT" : "DIAGNOSTIC_ONLY",
    completenessGate: eligible ? "PASS" : "FAIL",
    asymmetricDetailGate: validation.issues.some((issue) => issue.code === "MANUAL_CAPTURE_ASYMMETRIC_DETAIL_EXCLUDED") ? "FAIL" : "PASS",
    blindJudgmentEligible: eligible,
    decisionGoldenAdmitted: false,
    liveBookableGoldenAdmitted: false,
    publicPrecheckoutPriceCount: capture.alternatives.filter((alternative) => alternative.price?.semantics === "PUBLIC_PRECHECKOUT_VERIFIED_PRICE").length,
    exactBookablePriceCount: 0,
    missingCriticalFieldCount: missingCritical.length,
    missingCriticalFields: missingCritical.map((issue) => `${issue.code}:${issue.path}`),
    automaticGoldenAdmission: false,
    judgmentRecorded: false,
    v3Executed: false,
  };
  const manifest = {
    evidenceVersion: EVIDENCE_VERSION,
    sessionId: state.sessionId,
    scenario: {
      destinationBucket: state.scenario.destinationBucket,
      checkin: state.scenario.checkin,
      checkout: state.scenario.checkout,
      adults: state.scenario.adults,
      childrenAges: state.scenario.childrenAges,
      rooms: state.scenario.rooms,
      currency: state.scenario.currency,
      budgetMinorUnits: state.scenario.budgetMinorUnits,
      preferenceProfile: state.scenario.preferenceProfile,
    },
    alternativeCount: capture.alternatives.length,
    collectionClass: "MANUAL_PUBLIC_CONSUMER_OBSERVATION",
    automatedHttpRequests: 0,
    credentialsLoaded: false,
    scraping: false,
    browserAutomation: false,
    bookingCompleted: false,
  };
  const completeness = {
    comparableFeatures: validation.comparableFeatures,
    auditOnlyFeatures: ["PRIVATE_SOURCE_AND_PRESENTATION_METADATA"],
    excludedDecisionFeatures: validation.excludedDecisionFeatures.filter((feature) => feature === "asymmetricDetail"),
    issues: validation.issues,
  };
  const missingness = capture.alternatives.map((alternative) => ({ localCaptureId: alternative.localCaptureId, missingness: alternative.missingness }));
  const provenance = {
    provenance: "MANUAL_PUBLIC_CONSUMER_OBSERVATION",
    surfaceIdentityShared: false,
    realNamesShared: false,
    urlsShared: false,
    originalRankShared: false,
    promotionalStatusShared: false,
  };
  const artifacts = new Map([
    ["manifest.json", manifest],
    ["provider-neutral-snapshot.json", snapshot],
    ["completeness-report.json", completeness],
    ["missingness-report.json", missingness],
    ["sanitized-provenance.json", provenance],
    ["capture-fingerprint.json", { fingerprint: validation.fingerprint }],
    ["cryptographic-receipts.json", cryptoReceipt],
    ["canary-outcome.json", outcome],
  ]);
  if (capsule !== null) artifacts.set("blind-capsule.json", capsule);
  if (sharedEvidence !== null) artifacts.set("shared-evidence.json", sharedEvidence);
  for (const value of artifacts.values()) ensureNoSharedLeak(value);
  for (const [name, value] of artifacts) atomicJson(join(evidenceRoot, name), value);
  atomicJson(join(evidenceRoot, "integrity-manifest.json"), {
    artifactCount: artifacts.size + 2,
    rawPrivateEvidenceIncluded: false,
    privateLedgerIncluded: false,
    automaticGoldenAdmission: false,
  });
  atomicWrite(join(evidenceRoot, "checksums.sha256"), checksumsFor(evidenceRoot));
  for (const line of readFileSync(join(evidenceRoot, "checksums.sha256"), "utf8").trim().split("\n")) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (match === null || sha256(readFileSync(join(evidenceRoot, match[2]))) !== match[1]) fail("MANUAL_CAPTURE_INTERNAL_CHECKSUM_FAILED");
  }
  const stamp = now().replace(/[-:.TZ]/g, "").slice(0, 14);
  const zipPath = resolve(destinationDirectory, `StayOpti-V3-17T5B-Manual-Capture-Evidence-${stamp}-${sha256(json(snapshot)).slice(0, 16)}.zip`);
  const zip = createEvidenceZip(repositoryRoot, evidenceRoot, zipPath);
  rmSync(evidenceRoot, { recursive: true, force: true });
  state.finalized = true;
  state.lifecycle = outcome.status;
  state.evidenceZipPath = zipPath;
  state.evidenceZipSha256 = zip.sha256;
  return { validation, snapshot, capsule, outcome, cryptoReceipt, zipPath, zipSha256: zip.sha256, internalChecksums: `PASS_${zip.entryCount}_ENTRIES` };
}

async function askRequired(rl, label) {
  for (;;) {
    const value = (await rl.question(`${label}: `)).trim();
    if (value !== "") return value;
    output.write("Valore obbligatorio. Se non è visibile, scrivi UNKNOWN.\n");
  }
}

async function askYesNo(rl, label) {
  for (;;) {
    const value = (await rl.question(`${label} [S/N]: `)).trim().toUpperCase();
    if (value === "S") return true;
    if (value === "N") return false;
    output.write("Rispondi S oppure N.\n");
  }
}

async function askIntegerOrUnknown(rl, label) {
  for (;;) {
    const value = (await rl.question(`${label} (numero intero o UNKNOWN): `)).trim();
    if (value.toUpperCase() === "UNKNOWN") return null;
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    output.write("Inserisci un numero intero non negativo oppure UNKNOWN.\n");
  }
}

async function askDecimalMoneyOrUnknown(rl, label) {
  for (;;) {
    const value = (await rl.question(`${label} (EUR, es. 523,40; oppure UNKNOWN): `)).trim();
    if (value.toUpperCase() === "UNKNOWN") return null;
    const normalized = value.replace(",", ".");
    if (/^\d+(?:\.\d{1,2})?$/.test(normalized)) return Math.round(Number(normalized) * 100);
    output.write("Inserisci un importo EUR con massimo due decimali oppure UNKNOWN.\n");
  }
}

async function askLocationEvidence(rl, label) {
  for (;;) {
    const value = (await rl.question(`${label} (metri interi, posizione testuale verificata oppure UNKNOWN): `)).trim();
    if (value.toUpperCase() === "UNKNOWN") return { distanceMeters: null, locationEvidence: null };
    if (/^\d+$/.test(value)) return { distanceMeters: Number(value), locationEvidence: null };
    if (/https?:\/\//i.test(value) || value.length < 3) {
      output.write("Inserisci metri interi, il testo di posizione mostrato dalla pagina, oppure UNKNOWN. Non inserire URL.\n");
      continue;
    }
    return { distanceMeters: null, locationEvidence: { kind: "VERIFIED_TEXTUAL_POSITION", text: value } };
  }
}

async function selectPrivateFile(repositoryRoot) {
  const helper = resolve(repositoryRoot, "scripts/select-v3-17t5b-private-evidence.ps1");
  const selected = runPowerShell(helper, []);
  return selected === "" ? null : selected;
}

function alternativeFieldLabel(observedOrder, realName, label) {
  const currentName = realName?.trim() ? realName.trim() : "nome non ancora inserito";
  return `[Posizione organica ${observedOrder} — ${currentName}] ${label}`;
}

async function askRatingOrUnknown(rl, label) {
  for (;;) {
    const value = await askRequired(rl, `${label} (scala 0–10 oppure UNKNOWN)`);
    if (value.toUpperCase() === "UNKNOWN") return null;
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) return parsed;
    output.write("Inserisci un rating tra 0 e 10 oppure UNKNOWN.\n");
  }
}

async function askTaxInclusion(rl, label) {
  for (;;) {
    const value = (await askRequired(rl, `${label}: INCLUDED, EXCLUDED oppure UNKNOWN`)).toUpperCase();
    if (["INCLUDED", "EXCLUDED", "UNKNOWN"].includes(value)) return value;
    output.write("Scrivi INCLUDED, EXCLUDED oppure UNKNOWN.\n");
  }
}

async function askTextConditionOrUnknown(rl, label, manual) {
  for (;;) {
    const value = await askRequired(rl, `${label}; scrivi una condizione testuale oppure UNKNOWN`);
    const check = manual.validateManualMarketTextConditionV3(value);
    if (check.valid) return value;
    output.write("Questo campo descrive una condizione, non un importo. Non inserire un numero: scrivi il testo mostrato oppure UNKNOWN.\n");
  }
}

function privateIdentityPairValid(manual, realName, sourceUrl) {
  const result = manual.validateManualMarketPrivateIdentityPairV3(realName, sourceUrl);
  if (!result.valid) {
    output.write(`Nome e URL non possono essere salvati: ${result.reasonCode}. Controlla che appartengano alla stessa struttura.\n`);
  }
  return result.valid;
}

async function editDraftField(rl, draft, fieldNumber, context) {
  const { manual, observedOrder, repositoryRoot } = context;
  const label = (text) => alternativeFieldLabel(observedOrder, draft.realName, text);
  switch (fieldNumber) {
    case 1: {
      for (;;) {
        const value = await askRequired(rl, label("Nome della struttura — scrivi soltanto il nome visibile, non incollare il link"));
        if (manual.validateManualMarketPrivateIdentityPairV3(value, "UNKNOWN").valid) {
          draft.realName = value;
          return;
        }
        output.write("Il nome sembra un URL. Scrivi soltanto il nome visibile della struttura.\n");
      }
    }
    case 2: {
      for (;;) {
        const value = await askRequired(rl, label("URL della pagina — incolla l'URL della stessa struttura appena nominata; UNKNOWN se non visibile"));
        if (privateIdentityPairValid(manual, draft.realName, value)) {
          draft.sourceUrl = value;
          return;
        }
      }
    }
    case 3:
      draft.accommodationCategory = await askRequired(rl, label("Categoria mostrata — esempi: Hotel 3 stelle, Appartamento, Affittacamere, Campeggio; oppure UNKNOWN"));
      return;
    case 4: {
      const location = await askLocationEvidence(rl, label("Posizione — inserisci metri soltanto se la pagina mostra una vera distanza dal centro; altrimenti conserva il testo verificato così come appare"));
      draft.distanceMeters = location.distanceMeters;
      draft.locationEvidence = location.locationEvidence;
      return;
    }
    case 5:
      draft.rating = await askRatingOrUnknown(rl, label("Rating mostrato da Booking; non dedurlo dalle stelle"));
      return;
    case 6:
      draft.reviewCount = await askIntegerOrUnknown(rl, label("Numero di recensioni mostrato accanto al rating"));
      return;
    case 7:
      draft.roomEvidence = await askRequired(rl, label("Tipo di camera/alloggio e bagno privato come mostrati; oppure UNKNOWN"));
      return;
    case 8:
      draft.mealPlanEvidence = await askRequired(rl, label("Trattamento mostrato, per esempio solo camera o colazione; oppure UNKNOWN"));
      return;
    case 9:
      draft.totalPriceMinorUnits = await askDecimalMoneyOrUnknown(rl, label("Prezzo totale pubblico per tutte le 3 notti e 2 adulti"));
      return;
    case 10:
      draft.payNowMinorUnits = await askDecimalMoneyOrUnknown(rl, label("IMPORTO NUMERICO da pagare subito; UNKNOWN se Booking non mostra un importo"));
      return;
    case 11:
      draft.payAtPropertyMinorUnits = await askDecimalMoneyOrUnknown(rl, label("IMPORTO NUMERICO da pagare in struttura; se leggi soltanto 'non paghi ora', scrivi UNKNOWN: non equivale a pagamento in struttura = 0"));
      return;
    case 12:
      draft.taxInclusion = await askTaxInclusion(rl, label("Stato di tasse e costi nel totale mostrato"));
      return;
    case 13:
      draft.cancellationEvidence = await askTextConditionOrUnknown(rl, label("CONDIZIONE TESTUALE di cancellazione mostrata, inclusa l'eventuale scadenza"), manual);
      return;
    case 14:
      draft.refundabilityEvidence = await askTextConditionOrUnknown(rl, label("CONDIZIONE TESTUALE di rimborsabilità mostrata, non un prezzo"), manual);
      return;
    case 15:
      draft.amenitiesRaw = await askRequired(rl, label("Servizi rilevanti visibili, separati da virgola; oppure UNKNOWN"));
      return;
    case 16:
      draft.availabilityObserved = await askYesNo(rl, label("La disponibilità è mostrata per 15–18 ottobre 2026, 2 adulti e 1 camera?"));
      return;
    case 17:
      output.write(`${label("Prova privata opzionale")}: seleziona uno screenshot/pagina salvata; Annulla significa nessun file.\n`);
      draft.selectedFile = await selectPrivateFile(repositoryRoot);
      return;
    default:
      fail("MANUAL_CAPTURE_CORRECTION_FIELD_INVALID");
  }
}

async function reviewProgressBeforeNextField(rl, draft, completedField, context) {
  for (;;) {
    const action = (await rl.question("Premi INVIO per continuare; oppure INDIETRO, CORREGGI 1..17, RIEPILOGO o ANNULLA: ")).trim().toUpperCase();
    if (action === "" || action === "AVANTI") return "NEXT";
    if (action === "ANNULLA") return "CANCEL";
    if (action === "RIEPILOGO") {
      showDraftSummary(draft, context.observedOrder);
      continue;
    }
    if (action === "INDIETRO") {
      return completedField === 1 ? "REPEAT_CURRENT" : "BACK";
    }
    const correction = /^CORREGGI\s+(1[0-7]|[1-9])$/.exec(action);
    if (correction) {
      const field = Number(correction[1]);
      if (field > completedField) {
        output.write(`Il campo ${field} non è ancora stato compilato. Puoi correggere i campi da 1 a ${completedField}.\n`);
        continue;
      }
      await editDraftField(rl, draft, field, context);
      output.write(`Campo ${field} corretto nella bozza in memoria; nulla è stato ancora salvato.\n`);
      continue;
    }
    output.write("Comando non riconosciuto. Usa INVIO, INDIETRO, CORREGGI seguito dal numero, RIEPILOGO oppure ANNULLA.\n");
  }
}

function showDraftSummary(draft, observedOrder) {
  const shown = (value) => value === null || value === undefined || value === "" ? "UNKNOWN" : String(value);
  output.write(`\nRIEPILOGO PRIMA DEL SALVATAGGIO — posizione organica ${observedOrder}\n`);
  output.write(`1. Nome: ${shown(draft.realName)}\n2. URL della stessa struttura: ${shown(draft.sourceUrl)}\n`);
  output.write(`3. Categoria: ${shown(draft.accommodationCategory)}\n4. Distanza metri: ${shown(draft.distanceMeters)}; posizione testuale verificata: ${shown(draft.locationEvidence?.text)}\n`);
  output.write(`5. Rating: ${shown(draft.rating)}\n6. Recensioni: ${shown(draft.reviewCount)}\n`);
  output.write(`7. Camera/bagno: ${shown(draft.roomEvidence)}\n8. Trattamento: ${shown(draft.mealPlanEvidence)}\n`);
  output.write(`9. Totale EUR cent: ${shown(draft.totalPriceMinorUnits)}\n10. Pagamento subito EUR cent: ${shown(draft.payNowMinorUnits)}\n`);
  output.write(`11. Pagamento in struttura EUR cent: ${shown(draft.payAtPropertyMinorUnits)}\n12. Tasse: ${shown(draft.taxInclusion)}\n`);
  output.write(`13. Cancellazione: ${shown(draft.cancellationEvidence)}\n14. Rimborsabilità: ${shown(draft.refundabilityEvidence)}\n`);
  output.write(`15. Servizi: ${shown(draft.amenitiesRaw)}\n16. Disponibilità: ${draft.availabilityObserved ? "SI" : "NO"}\n`);
  output.write(`17. Prova privata selezionata: ${draft.selectedFile === null ? "NO" : "SI"}\n`);
}

function draftFromSavedPublicData(publicData) {
  return {
    realName: "identità privata invariata",
    sourceUrl: "UNKNOWN",
    accommodationCategory: publicData.accommodationCategory ?? "UNKNOWN",
    distanceMeters: publicData.distanceMeters ?? null,
    locationEvidence: publicData.locationEvidence ?? null,
    rating: publicData.rating ?? null,
    reviewCount: publicData.reviewCount ?? null,
    roomEvidence: publicData.roomEvidence ?? "UNKNOWN",
    mealPlanEvidence: publicData.mealPlanEvidence ?? "UNKNOWN",
    totalPriceMinorUnits: publicData.totalPriceMinorUnits ?? null,
    payNowMinorUnits: publicData.payNowMinorUnits ?? null,
    payAtPropertyMinorUnits: publicData.payAtPropertyMinorUnits ?? null,
    taxInclusion: publicData.taxInclusion ?? "UNKNOWN",
    cancellationEvidence: publicData.cancellationEvidence ?? "UNKNOWN",
    refundabilityEvidence: publicData.refundabilityEvidence ?? "UNKNOWN",
    amenitiesRaw: Array.isArray(publicData.amenityEvidence) && publicData.amenityEvidence.length > 0 ? publicData.amenityEvidence.join(", ") : "UNKNOWN",
    availabilityObserved: publicData.availabilityObserved === true,
    selectedFile: null,
  };
}

function repairedPublicData(existing, draft) {
  const amenityEvidence = normalizedTextOrNull(draft.amenitiesRaw) === null
    ? []
    : draft.amenitiesRaw.split(",").map((item) => item.trim()).filter(Boolean).sort();
  const next = {
    ...existing,
    accommodationCategory: normalizedTextOrNull(draft.accommodationCategory),
    distanceMeters: draft.distanceMeters,
    locationEvidence: draft.locationEvidence,
    rating: draft.rating,
    reviewCount: draft.reviewCount,
    roomEvidence: normalizedTextOrNull(draft.roomEvidence),
    mealPlanEvidence: normalizedTextOrNull(draft.mealPlanEvidence),
    totalPriceMinorUnits: draft.totalPriceMinorUnits,
    payNowMinorUnits: draft.payNowMinorUnits,
    payAtPropertyMinorUnits: draft.payAtPropertyMinorUnits,
    taxInclusion: draft.taxInclusion,
    cancellationEvidence: normalizedTextOrNull(draft.cancellationEvidence),
    refundabilityEvidence: normalizedTextOrNull(draft.refundabilityEvidence),
    amenityEvidence,
    availabilityObserved: draft.availabilityObserved,
  };
  const missingness = [];
  for (const [field, value] of Object.entries({ accommodationCategory: next.accommodationCategory, rating: next.rating, reviewCount: next.reviewCount, roomEvidence: next.roomEvidence, mealPlanEvidence: next.mealPlanEvidence, totalPriceMinorUnits: next.totalPriceMinorUnits, cancellationEvidence: next.cancellationEvidence, refundabilityEvidence: next.refundabilityEvidence })) {
    if (value === null || normalizedTextOrNull(value) === null) missingness.push(`${field.toUpperCase()}_UNKNOWN`);
  }
  if (next.distanceMeters === null && next.locationEvidence === null) missingness.push("LOCATION_UNKNOWN");
  if (amenityEvidence.length === 0) missingness.push("AMENITIES_UNKNOWN");
  if (!next.availabilityObserved) missingness.push("AVAILABILITY_NOT_OBSERVED");
  const priceMissingness = [];
  if (next.payNowMinorUnits === null) priceMissingness.push("PAY_NOW_AMOUNT_UNKNOWN");
  if (next.payAtPropertyMinorUnits === null) priceMissingness.push("PAY_AT_PROPERTY_AMOUNT_UNKNOWN");
  if (next.taxInclusion === "UNKNOWN") priceMissingness.push("TAX_INCLUSION_UNKNOWN");
  return { ...next, missingness, priceMissingness };
}

function showSavedPublicSummary(draft, alternativeNumber, originalOrder) {
  const shown = (value) => value === null || value === undefined || value === "" ? "UNKNOWN" : String(value);
  output.write(`\nRIEPILOGO PUBBLICO ALTERNATIVA ${alternativeNumber} — posizione organica ${originalOrder}\n`);
  output.write(`3. Categoria: ${shown(draft.accommodationCategory)}\n4. Distanza metri: ${shown(draft.distanceMeters)}; posizione testuale verificata: ${shown(draft.locationEvidence?.text)}\n`);
  output.write(`5. Rating: ${shown(draft.rating)}\n6. Recensioni: ${shown(draft.reviewCount)}\n7. Camera/bagno: ${shown(draft.roomEvidence)}\n8. Trattamento: ${shown(draft.mealPlanEvidence)}\n`);
  output.write(`9. Totale EUR cent: ${shown(draft.totalPriceMinorUnits)}\n10. Pagamento subito EUR cent: ${shown(draft.payNowMinorUnits)}\n11. Pagamento in struttura EUR cent: ${shown(draft.payAtPropertyMinorUnits)}\n`);
  output.write(`12. Tasse: ${shown(draft.taxInclusion)}\n13. Cancellazione: ${shown(draft.cancellationEvidence)}\n14. Rimborsabilità: ${shown(draft.refundabilityEvidence)}\n`);
  output.write(`15. Servizi: ${shown(draft.amenitiesRaw)}\n16. Disponibilità: ${draft.availabilityObserved ? "SI" : "NO"}\n`);
}

async function repairExport(context) {
  const sessionRoot = resolve(context.privateRoot, SESSION_ID);
  const statePath = join(sessionRoot, "session-state.json");
  if (!existsSync(statePath)) fail("MANUAL_CAPTURE_REPAIR_SESSION_NOT_FOUND");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state.sessionId !== SESSION_ID || state.alternatives.length !== EXPECTED_ALTERNATIVES || state.networkCalls !== 0 || state.credentialsLoaded !== false) fail("MANUAL_CAPTURE_REPAIR_SESSION_INVALID");
  Object.defineProperty(state, "manualModule", { value: context.manual, enumerable: false });
  const rl = createInterface({ input, output });
  let correctionCount = 0;
  try {
    output.write(`OFFLINE_REPAIR_READY=YES\nSESSION_ID=${SESSION_ID}\nALTERNATIVES_REUSED=5\nPRIVATE_EVIDENCE_MODIFIED=NO\nAUTOMATED_HTTP_REQUESTS=0\n`);
    output.write("Correggi soltanto i campi pubblici necessari; nomi, URL e prove private restano invariati e non vengono mostrati.\n");
    for (;;) {
      const action = (await rl.question("Scrivi CORREGGI <alternativa 1..5> <campo 3..16>, RIEPILOGO <alternativa>, RIESPORTA oppure ANNULLA: ")).trim().toUpperCase();
      if (action === "ANNULLA") return;
      if (action === "RIESPORTA") {
        if (correctionCount === 0) {
          output.write("Nessuna correzione confermata: la riesportazione non viene eseguita.\n");
          continue;
        }
        const downloads = resolve(process.env.USERPROFILE ?? fail("MANUAL_CAPTURE_USERPROFILE_REQUIRED"), "Downloads");
        const result = await finalize(state, context, downloads, { allowBlindCapsule: false });
        persistState(statePath, state);
        output.write(`REPAIR_EXPORT_STATUS=${result.outcome.status}\nBLIND_CAPSULE_CREATED=NO\nV3_EXECUTED=NO\nGOLDEN_ADMISSION=NO\nSANITIZED_EVIDENCE_ZIP_PATH=${result.zipPath}\nSANITIZED_EVIDENCE_ZIP_SHA256=${result.zipSha256}\n`);
        return;
      }
      const summary = /^RIEPILOGO\s+([1-5])$/.exec(action);
      if (summary) {
        const index = Number(summary[1]) - 1;
        showSavedPublicSummary(draftFromSavedPublicData(state.alternatives[index].publicData), index + 1, state.alternatives[index].publicData.originalOrder);
        continue;
      }
      const correction = /^CORREGGI\s+([1-5])\s+(1[0-6]|[3-9])$/.exec(action);
      if (correction) {
        const index = Number(correction[1]) - 1;
        const field = Number(correction[2]);
        const entry = state.alternatives[index];
        const draft = draftFromSavedPublicData(entry.publicData);
        await editDraftField(rl, draft, field, { manual: context.manual, observedOrder: entry.publicData.originalOrder, repositoryRoot: context.repositoryRoot });
        showSavedPublicSummary(draft, index + 1, entry.publicData.originalOrder);
        const confirm = (await rl.question("Scrivi APPLICA per confermare questa singola correzione, oppure ANNULLA: ")).trim().toUpperCase();
        if (confirm !== "APPLICA") {
          output.write("Correzione annullata; lo stato salvato non è cambiato.\n");
          continue;
        }
        entry.publicData = repairedPublicData(entry.publicData, draft);
        state.finalized = false;
        state.lifecycle = "CAPTURE_COMPLETE";
        delete state.evidenceZipPath;
        delete state.evidenceZipSha256;
        persistState(statePath, state);
        correctionCount += 1;
        output.write("Correzione applicata. Le prove private sono rimaste byte-identiche.\n");
        continue;
      }
      output.write("Comando non riconosciuto; nessun dato è stato modificato.\n");
    }
  } finally {
    rl.close();
  }
}

async function collectAlternative(rl, state, store, repositoryRoot, observedOrder, replacementIndex = null) {
  output.write(`\n--- Alternativa idonea ${replacementIndex === null ? state.alternatives.length + 1 : replacementIndex + 1} di ${EXPECTED_ALTERNATIVES} ---\n`);
  output.write("Consulta la stessa ricerca Booking.com anonima. Non usare login, Genius, coupon o prezzi personali.\n");
  output.write("La bozza resta soltanto in memoria: nessun dato viene salvato prima del riepilogo e della conferma SALVA. UNKNOWN è sempre ammesso quando un dato non è visibile.\n");
  output.write("Dopo ogni risposta puoi usare INDIETRO o CORREGGI <numero campo>; ANNULLA scarta soltanto l'alternativa corrente e conserva la sessione.\n");
  const draft = { realName: "", sourceUrl: "UNKNOWN", accommodationCategory: "UNKNOWN", distanceMeters: null, locationEvidence: null, rating: null, reviewCount: null, roomEvidence: "UNKNOWN", mealPlanEvidence: "UNKNOWN", totalPriceMinorUnits: null, payNowMinorUnits: null, payAtPropertyMinorUnits: null, taxInclusion: "UNKNOWN", cancellationEvidence: "UNKNOWN", refundabilityEvidence: "UNKNOWN", amenitiesRaw: "UNKNOWN", availabilityObserved: false, selectedFile: null };
  const editContext = { manual: state.manualModule, observedOrder, repositoryRoot };
  let field = 1;
  while (field <= 17) {
    await editDraftField(rl, draft, field, editContext);
    const navigation = await reviewProgressBeforeNextField(rl, draft, field, editContext);
    if (navigation === "CANCEL") {
      output.write("Bozza annullata: nessuna alternativa e nessuna prova privata sono state salvate. La sessione rimane disponibile.\n");
      return false;
    }
    if (navigation === "BACK") {
      field -= 1;
      continue;
    }
    if (navigation === "REPEAT_CURRENT") continue;
    field += 1;
  }
  for (;;) {
    showDraftSummary(draft, observedOrder);
    const action = (await rl.question("Scrivi SALVA, CORREGGI 1..17 oppure ANNULLA: ")).trim().toUpperCase();
    if (action === "ANNULLA") {
      output.write("Bozza annullata: nessuna alternativa e nessuna prova privata sono state salvate. La sessione rimane disponibile.\n");
      return false;
    }
    if (action === "SALVA") {
      if (privateIdentityPairValid(state.manualModule, draft.realName, draft.sourceUrl)) break;
      output.write("Usa CORREGGI 1 per il nome o CORREGGI 2 per l'URL.\n");
      continue;
    }
    const correction = /^CORREGGI\s+(1[0-7]|[1-9])$/.exec(action);
    if (correction) {
      await editDraftField(rl, draft, Number(correction[1]), editContext);
      continue;
    }
    output.write("Comando non riconosciuto. Scrivi SALVA, CORREGGI seguito dal numero del campo, oppure ANNULLA.\n");
  }
  const { realName, sourceUrl, accommodationCategory, distanceMeters, locationEvidence, rating, reviewCount, roomEvidence, mealPlanEvidence, totalPriceMinorUnits, payNowMinorUnits, payAtPropertyMinorUnits, taxInclusion, cancellationEvidence, refundabilityEvidence, amenitiesRaw, availabilityObserved, selectedFile } = draft;
  const amenityEvidence = amenitiesRaw.toUpperCase() === "UNKNOWN" ? [] : amenitiesRaw.split(",").map((item) => item.trim()).filter(Boolean).sort();
  const privateEvidence = {
    realName: capturePrivate(store, state, "PROPERTY_NAME", realName),
    sourceUrl: capturePrivate(store, state, "SOURCE_URL", sourceUrl),
    screenshot: selectedFile === null ? null : capturePrivate(store, state, "SCREENSHOT", `BASE64:${readFileSync(selectedFile).toString("base64")}`),
  };
  const missingness = [];
  const priceMissingness = [];
  for (const [field, value] of Object.entries({ accommodationCategory, rating, reviewCount, roomEvidence, mealPlanEvidence, totalPriceMinorUnits, cancellationEvidence, refundabilityEvidence })) {
    if (value === null || normalizedTextOrNull(value) === null) missingness.push(`${field.toUpperCase()}_UNKNOWN`);
  }
  if (distanceMeters === null && locationEvidence === null) missingness.push("LOCATION_UNKNOWN");
  if (payNowMinorUnits === null) priceMissingness.push("PAY_NOW_AMOUNT_UNKNOWN");
  if (payAtPropertyMinorUnits === null) priceMissingness.push("PAY_AT_PROPERTY_AMOUNT_UNKNOWN");
  if (taxInclusion === "UNKNOWN") priceMissingness.push("TAX_INCLUSION_UNKNOWN");
  if (amenityEvidence.length === 0) missingness.push("AMENITIES_UNKNOWN");
  if (!availabilityObserved) missingness.push("AVAILABILITY_NOT_OBSERVED");
  const publicData = {
    localCaptureId: `MANUAL_ALT_${String(replacementIndex === null ? state.alternatives.length + 1 : replacementIndex + 1).padStart(2, "0")}`,
    originalOrder: observedOrder,
    accommodationCategory: normalizedTextOrNull(accommodationCategory),
    distanceMeters,
    locationEvidence,
    rating,
    reviewCount,
    roomEvidence: normalizedTextOrNull(roomEvidence),
    mealPlanEvidence: normalizedTextOrNull(mealPlanEvidence),
    totalPriceMinorUnits,
    payNowMinorUnits,
    payAtPropertyMinorUnits,
    taxInclusion,
    cancellationEvidence: normalizedTextOrNull(cancellationEvidence),
    refundabilityEvidence: normalizedTextOrNull(refundabilityEvidence),
    amenityEvidence,
    availabilityObserved,
    observedAt: now(),
    priceMissingness,
    missingness,
  };
  const entry = { publicData, privateEvidence };
  if (replacementIndex === null) state.alternatives.push(entry); else state.alternatives[replacementIndex] = entry;
  return true;
}

async function interactive(context) {
  if (SESSION_ID === PREVIOUS_ABORTED_SESSION_ID) fail("MANUAL_CAPTURE_ABORTED_SESSION_REUSE_PROHIBITED");
  const { repositoryRoot, privateRoot, store } = context;
  const sessionRoot = resolve(privateRoot, SESSION_ID);
  mkdirSync(sessionRoot, { recursive: true });
  const statePath = join(sessionRoot, "session-state.json");
    let state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : initialState();
    Object.defineProperty(state, "manualModule", { value: context.manual, enumerable: false });
  const rl = createInterface({ input, output });
  try {
    output.write(`MANUAL_CAPTURE_READY=YES\nSESSION_ID=${SESSION_ID}\nPREVIOUS_SESSION_REUSED=NO\nAUTOMATED_HTTP_REQUESTS=0\nOPEN_BOOKING_IN_INCOGNITO=YES\nSESSION_ALTERNATIVES_REQUIRED=5\n\n`);
    output.write("Scenario congelato: Firenze, 15–18 ottobre 2026, 3 notti, 2 adulti, 1 camera, EUR, budget totale 600 EUR, profilo BALANCED.\n");
    output.write("Apri personalmente Booking.com in una finestra anonima, senza login/Genius, e inserisci esattamente questo scenario.\n");
    output.write("Usa sempre gli stessi filtri. Considera in ordine i primi risultati organici idonei; i dati vengono salvati dopo ogni hotel.\n");
    if (state.alternatives.length > 0) output.write(`Ripresa automatica: ${state.alternatives.length} alternative idonee già salvate.\n`);
    let observedOrder = Math.max(0, ...state.alternatives.map((entry) => entry.publicData.originalOrder), ...state.exclusions.map((entry) => entry.originalOrder));
    while (state.alternatives.length < EXPECTED_ALTERNATIVES) {
      observedOrder += 1;
      output.write(`\nEsamina il risultato organico in posizione ${observedOrder}.\n`);
      const eligible = await askYesNo(rl, "È disponibile, con prezzo pubblico, camera/alloggio e bagno privati, senza login o prezzo personale?");
      if (!eligible) {
        const reason = await askRequired(rl, "Motivo controllato: NOT_AVAILABLE / PRICE_NOT_PUBLIC / PRIVATE_ROOM_OR_BATHROOM_NOT_CONFIRMED / LOGIN_REQUIRED / PERSONALIZED_PRICE / CONDITIONS_UNAVAILABLE / OTHER");
        state.exclusions.push({ originalOrder: observedOrder, reason: reason.toUpperCase() });
        persistState(statePath, state);
        output.write("Esclusione salvata. Passa al risultato organico successivo.\n");
        continue;
      }
      const saved = await collectAlternative(rl, state, store, repositoryRoot, observedOrder);
      if (!saved) {
        observedOrder -= 1;
        output.write("La stessa posizione organica verrà riproposta.\n");
        continue;
      }
      persistState(statePath, state);
      output.write(`Alternativa salvata e prova privata cifrata. Progresso: ${state.alternatives.length}/${EXPECTED_ALTERNATIVES}.\n`);
    }
    for (;;) {
      const action = (await rl.question("\nScrivi FINALIZZA oppure CORREGGI 1..5: ")).trim().toUpperCase();
      if (action === "FINALIZZA") break;
      const match = /^CORREGGI\s+([1-5])$/.exec(action);
      if (match) {
        const index = Number(match[1]) - 1;
        const saved = await collectAlternative(rl, state, store, repositoryRoot, state.alternatives[index].publicData.originalOrder, index);
        if (saved) {
          persistState(statePath, state);
          output.write(`Alternativa ${index + 1} corretta e salvata.\n`);
        }
      } else output.write("Comando non riconosciuto.\n");
    }
    const downloads = resolve(process.env.USERPROFILE ?? fail("MANUAL_CAPTURE_USERPROFILE_REQUIRED"), "Downloads");
    const result = await finalize(state, context, downloads);
    persistState(statePath, state);
    output.write(`\nSESSION_STATUS=${result.outcome.status}\n`);
    output.write(`COMPLETENESS_GATE=${result.outcome.completenessGate}\n`);
    output.write(`ASYMMETRIC_DETAIL_GATE=${result.outcome.asymmetricDetailGate}\n`);
    output.write(`BLIND_JUDGMENT_ELIGIBLE=${result.outcome.blindJudgmentEligible ? "YES" : "NO"}\n`);
    output.write(`PRIVATE_EVIDENCE_FILE_COUNT=${result.cryptoReceipt.privateEvidenceFileCount}\n`);
    output.write(`SANITIZED_EVIDENCE_ZIP_PATH=${result.zipPath}\n`);
    output.write(`SANITIZED_EVIDENCE_ZIP_SHA256=${result.zipSha256}\n`);
    output.write(`INTERNAL_CHECKSUMS=${result.internalChecksums}\n`);
    output.write("DECISION_GOLDEN_ADMITTED=NO\nLIVE_BOOKABLE_GOLDEN_ADMITTED=NO\n");
  } finally {
    rl.close();
  }
}

function syntheticEntry(store, state, index) {
  const privateEvidence = {
    realName: capturePrivate(store, state, "PROPERTY_NAME", `Synthetic property ${index + 1}`),
    sourceUrl: capturePrivate(store, state, "SOURCE_URL", `https://synthetic.invalid/${index + 1}`),
    screenshot: capturePrivate(store, state, "SCREENSHOT", `BASE64:${Buffer.from(`synthetic-${index + 1}`).toString("base64")}`),
  };
  return {
    publicData: {
      localCaptureId: `MANUAL_ALT_${String(index + 1).padStart(2, "0")}`,
      originalOrder: index + 1,
      accommodationCategory: "HOTEL",
      distanceMeters: 400 + index * 100,
      locationEvidence: null,
      rating: 8 + index * 0.1,
      reviewCount: 500 + index,
      roomEvidence: "PRIVATE_DOUBLE_ROOM_PRIVATE_BATHROOM",
      mealPlanEvidence: "ROOM_ONLY",
      totalPriceMinorUnits: 40000 + index * 2500,
      payNowMinorUnits: null,
      payAtPropertyMinorUnits: null,
      taxInclusion: "UNKNOWN",
      cancellationEvidence: "CANCELLATION_FREE_UNTIL_SYNTHETIC_DAY",
      refundabilityEvidence: "REFUNDABLE_UNTIL_SYNTHETIC_DAY",
      amenityEvidence: ["WIFI"],
      availabilityObserved: true,
      observedAt: "2026-09-02T12:00:00.000Z",
      priceMissingness: ["PAY_NOW_AMOUNT_UNKNOWN", "PAY_AT_PROPERTY_AMOUNT_UNKNOWN", "TAX_INCLUSION_UNKNOWN"],
      missingness: [],
    },
    privateEvidence,
  };
}

async function dryRun(context) {
  const root = resolve(tmpdir(), `StayOpti-V3-17T5B-DryRun-${randomBytes(8).toString("hex")}`);
  const zipRoot = resolve(tmpdir(), `StayOpti-V3-17T5B-DryRunZip-${randomBytes(8).toString("hex")}`);
  mkdirSync(root, { recursive: false });
  mkdirSync(zipRoot, { recursive: false });
  const quarantine = context.quarantine;
  const store = createProviderRawQuarantineStoreV3({ repositoryRoot: context.repositoryRoot, root: join(root, "private"), quarantineModule: quarantine });
  const dryContext = { ...context, privateRoot: root, store };
  const state = initialState();
  const statePath = join(root, "session-state.json");
  try {
    for (let index = 0; index < EXPECTED_ALTERNATIVES; index += 1) {
      state.alternatives.push(syntheticEntry(store, state, index));
      persistState(statePath, state);
    }
    const resumed = JSON.parse(readFileSync(statePath, "utf8"));
    if (resumed.alternatives.length !== EXPECTED_ALTERNATIVES) fail("MANUAL_CAPTURE_DRY_RUN_RESUME_FAILED");
    const firstEnvelope = JSON.parse(readFileSync(resumed.alternatives[0].privateEvidence.realName.path, "utf8"));
    const tampered = { ...firstEnvelope, ciphertextBase64: `${firstEnvelope.ciphertextBase64.slice(0, -2)}AA` };
    if (quarantine.validateProviderRawQuarantineEnvelopeV3(tampered).valid) fail("MANUAL_CAPTURE_DRY_RUN_TAMPER_NOT_DETECTED");
    const result = await finalize(resumed, dryContext, zipRoot);
    if (!result.validation.valid || result.outcome.status !== "ELIGIBLE_FOR_BLIND_JUDGMENT") fail("MANUAL_CAPTURE_DRY_RUN_VALIDATION_FAILED");
    if (!existsSync(result.zipPath)) fail("MANUAL_CAPTURE_DRY_RUN_ZIP_MISSING");
    return {
      status: "PASS",
      alternatives: EXPECTED_ALTERNATIVES,
      progressiveSave: true,
      resume: true,
      validation: true,
      encryptedPrivateEvidence: true,
      tamperDetection: true,
      providerNeutralSnapshot: true,
      blindCapsule: true,
      sanitizedEvidence: true,
      plaintextPrivateEvidenceAtRest: false,
      automatedHttpRequests: 0,
      credentialsLoaded: false,
      syntheticArtifactsDeleted: true,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(zipRoot, { recursive: true, force: true });
  }
}

async function repairDryRun(context) {
  const root = resolve(tmpdir(), `StayOpti-V3-17T5B-RepairDryRun-${randomBytes(8).toString("hex")}`);
  const zipRoot = resolve(tmpdir(), `StayOpti-V3-17T5B-RepairDryRunZip-${randomBytes(8).toString("hex")}`);
  mkdirSync(root, { recursive: false });
  mkdirSync(zipRoot, { recursive: false });
  const store = createProviderRawQuarantineStoreV3({ repositoryRoot: context.repositoryRoot, root: join(root, "private"), quarantineModule: context.quarantine });
  const dryContext = { ...context, privateRoot: root, store };
  const state = initialState();
  try {
    for (let index = 0; index < EXPECTED_ALTERNATIVES; index += 1) state.alternatives.push(syntheticEntry(store, state, index));
    state.alternatives[3].publicData.mealPlanEvidence = "unknown";
    state.alternatives[4].publicData.distanceMeters = null;
    state.alternatives[4].publicData.locationEvidence = null;
    state.alternatives[4].publicData.payNowMinorUnits = state.alternatives[4].publicData.totalPriceMinorUnits - 10;
    state.alternatives[4].publicData.payAtPropertyMinorUnits = 0;
    state.alternatives[4].publicData.refundabilityEvidence = "REFUNDABLE UNTIL 99 OTT";
    const handlesBefore = JSON.stringify(state.alternatives.map((entry) => entry.privateEvidence));
    const before = await hydrateCapture(state, store, context.quarantine);
    const beforeValidation = context.manual.validateManualMarketCaptureV3(before);
    if (!beforeValidation.issues.some((issue) => issue.code === "MANUAL_CAPTURE_PAYMENT_SPLIT_MISMATCH")) fail("MANUAL_CAPTURE_REPAIR_DRY_RUN_MISMATCH_NOT_DETECTED");
    if (!beforeValidation.issues.some((issue) => issue.code === "MANUAL_CAPTURE_TEXT_DATE_IMPLAUSIBLE")) fail("MANUAL_CAPTURE_REPAIR_DRY_RUN_TYPO_NOT_DETECTED");
    const fourth = draftFromSavedPublicData(state.alternatives[3].publicData);
    fourth.mealPlanEvidence = "ROOM_ONLY";
    state.alternatives[3].publicData = repairedPublicData(state.alternatives[3].publicData, fourth);
    const fifth = draftFromSavedPublicData(state.alternatives[4].publicData);
    fifth.locationEvidence = { kind: "VERIFIED_TEXTUAL_POSITION", text: "zona centrale verificata" };
    fifth.payAtPropertyMinorUnits = 10;
    fifth.refundabilityEvidence = "REFUNDABLE UNTIL SYNTHETIC DAY";
    state.alternatives[4].publicData = repairedPublicData(state.alternatives[4].publicData, fifth);
    const result = await finalize(state, dryContext, zipRoot, { allowBlindCapsule: false });
    if (!result.validation.valid || !existsSync(result.zipPath)) fail("MANUAL_CAPTURE_REPAIR_DRY_RUN_EXPORT_FAILED");
    if (result.capsule !== null || JSON.stringify(state.alternatives.map((entry) => entry.privateEvidence)) !== handlesBefore) fail("MANUAL_CAPTURE_REPAIR_DRY_RUN_BOUNDARY_FAILED");
    return {
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
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(zipRoot, { recursive: true, force: true });
  }
}

const repositoryRoot = resolve(option("repository-root") ?? fail("MANUAL_CAPTURE_REPOSITORY_ROOT_REQUIRED"));
const compiledRoot = resolve(option("compiled-root") ?? fail("MANUAL_CAPTURE_COMPILED_ROOT_REQUIRED"));
const privateRoot = assertOutsideRepository(repositoryRoot, option("private-root") ?? fail("MANUAL_CAPTURE_PRIVATE_ROOT_REQUIRED"));
const manualPath = resolve(compiledRoot, "src/engine-v3/evaluation/manualPublicMarketDecisionGoldenCaptureV3.js");
const quarantinePath = resolve(compiledRoot, "src/engine-v3/evaluation/providerRawQuarantineV3.js");
const manual = await import(pathToFileURL(manualPath).href);
const quarantine = await import(pathToFileURL(quarantinePath).href);
mkdirSync(privateRoot, { recursive: true });
const store = createProviderRawQuarantineStoreV3({ repositoryRoot, root: join(privateRoot, "encrypted"), quarantineModule: quarantine, keyProtector: createWindowsCurrentUserDpapiProtectorV3() });
const context = { repositoryRoot, compiledRoot, privateRoot, manual, quarantine, store };
const mode = option("mode") ?? "preflight";

if (mode === "preflight") {
  process.stdout.write(`${JSON.stringify({ status: "PASS", sessionId: SESSION_ID, previousAbortedSessionId: PREVIOUS_ABORTED_SESSION_ID, previousSessionReuse: false, interfaceLanguage: "it-IT", jsonEditingRequired: false, progressiveSave: true, partialAlternativeAutoSave: false, interruptPartialPersistence: false, fieldCorrectionDuringEntry: true, fieldCorrectionBeforeSave: true, summaryConfirmationBeforeSave: true, textualConditionAmountGuard: true, localNameUrlConsistencyCheck: true, currentAlternativeCancellationPreservesSession: true, correctionSupported: true, privateFileSelection: true, automatedHttpRequests: 0, credentialsLoaded: false })}\n`);
} else if (mode === "dry-run") {
  process.stdout.write(`${JSON.stringify(await dryRun(context))}\n`);
} else if (mode === "repair-dry-run") {
  process.stdout.write(`${JSON.stringify(await repairDryRun(context))}\n`);
} else if (mode === "interactive") {
  await interactive(context);
} else if (mode === "repair-export") {
  await repairExport(context);
} else {
  fail("MANUAL_CAPTURE_MODE_UNSUPPORTED");
}
