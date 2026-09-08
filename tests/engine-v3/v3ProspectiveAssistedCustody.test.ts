import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const ROOT = process.cwd();
const HELPER = join(ROOT, "scripts/prospective-assisted-synthetic-custody.mjs");
const WINDOWS_ONLY = process.platform === "win32" ? false
  : "requires real Windows PowerShell 5.1 and CurrentUser DPAPI; executed by mandatory windows-latest release gate";
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const load = new Function("path", "return import(path)") as (path: string) => Promise<{
  prepareSyntheticCustody(input: Record<string, unknown>): {
    syntheticProofOnly: boolean; sessionRoot: string; descriptorPath: string; dataMapPath: string; reviewReceiptPath: string;
    proofFiles: { originalPath: string; sha256: string; byteLength: number; fieldKeys: string[]; proofRef: string; alternativeId: string; mediaType: string }[];
    fieldProofBindings: { alternativeId: string; fieldKey: string; proofRef: string }[];
    integrityProof: { status: string; screenshotCount: number; alternativeCount: number; currentUserDpapiVerified: boolean; reopenNonMutating: boolean; originalsByteIdentical: boolean; realCustodyCertified: boolean; humanReviewPerformed: boolean; networkCalls: number };
    importResult: { status: string }; reopenResult: { status: string };
  };
}>;
const known = (value: unknown) => ({ status: "KNOWN", value, reliability: "HIGH", evidenceRefs: [], unknownReason: null });
const unknown = () => ({ status: "UNKNOWN", value: null, reliability: "UNKNOWN", evidenceRefs: [], unknownReason: "SYNTHETIC_NOT_DOCUMENTED" });

function fixture(count = 5) {
  const root = mkdtempSync(join(tmpdir(), "StayOpti-Synthetic-Prospective-Custody-Test-"));
  const scenarioSealPath = join(root, "scenario-seal.json");
  const seal = `${JSON.stringify({ schemaVersion: "synthetic-prospective-seal@1", syntheticOnly: true, alternativeCount: count, frozenAt: new Date().toISOString(), travelerNeedsDefinedBeforeEvidence: true })}\n`;
  writeFileSync(scenarioSealPath, seal, { flag: "wx" });
  const alternatives = Array.from({ length: count }, (_, index) => ({
    alternativeId: `SYNTHETIC_ALT_${String(index + 1).padStart(2, "0")}`,
    fields: {
      roomType: known("Synthetic private room"), occupancy: known({ adults: 2, children: 0, rooms: 1 }),
      mealPlan: unknown(), totalAmount: known(40000 + index * 1000), currency: known("EUR"),
      cancellation: known("Synthetic explicit cancellation condition"),
      ...(count === 8 ? { taxInclusionStatement: known("Include tasse e costi"), taxBreakdown: unknown() }
        : { observedDisplayStatement: known("Include tasse e costi"), itemizedTaxBreakdown: unknown() }),
      rating: known({ value: 8, scaleMaximum: 10 }), reviewCount: known(120 + index),
      locationDescription: known("Synthetic documented central-area description; numeric centre distance unknown"),
    },
  }));
  const observations = alternatives.map((alternative) => ({ alternativeId: alternative.alternativeId,
    observedAt: new Date().toISOString(), localDateTime: null, timeZone: "UTC", source: "SYNTHETIC_GENERATOR" }));
  return { root, input: { syntheticOnly: true, root, repoRoot: ROOT, caseId: `SYNTHETIC_CUSTODY_${count}_ALTERNATIVES`, scenarioSealPath, scenarioSealHash: hash(seal), alternatives, observations } };
}
function cleanup(root: string) {
  const target = resolve(root); const rel = relative(resolve(tmpdir()), target);
  assert.ok(rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`));
  assert.ok(target.includes("StayOpti-Synthetic-Prospective-Custody-Test-"));
  assert.equal(lstatSync(target).isSymbolicLink(), false);
  rmSync(target, { recursive: true, force: true });
}

test("prospective custody helper is synthetic-only and reuses the unchanged D0037 launcher", () => {
  const code = readFileSync(HELPER, "utf8");
  assert.match(code, /invoke-browser-assisted-dossier-handoff\.ps1/);
  assert.match(code, /-SyntheticFixture/);
  // The XML namespace identifies SVG syntax; it is not a network resource.
  assert.doesNotMatch(code.replaceAll("http://www.w3.org/2000/svg", "SVG_NAMESPACE"), /\bfetch\s*\(|https?:\/\/|\b(?:playwright|puppeteer|selenium|dotenv)\b|process\.env\.LOCALAPPDATA|\bpwsh(?:\.exe)?\b/i);
  assert.match(code, /result\.error \|\| result\.status === null/);
  assert.match(code, /typeof result\.stdout !== "string"/);
});

test("prospective custody rejects non-synthetic identity without creating a dossier directory", async () => {
  const module = await load(pathToFileURL(HELPER).href); const f = fixture();
  try {
    assert.throws(() => module.prepareSyntheticCustody({ ...f.input, syntheticOnly: false }), /SYNTHETIC_CUSTODY_ONLY/);
    assert.throws(() => module.prepareSyntheticCustody({ ...f.input, caseId: "REAL_CASE" }), /SYNTHETIC_CUSTODY_ONLY/);
    assert.equal(existsSync(join(f.root, "synthetic-dossier-custody")), false);
  } finally { cleanup(f.root); }
});

test("prospective custody rejects repository destination and unpersisted or changed scenario seal", async () => {
  const module = await load(pathToFileURL(HELPER).href); const f = fixture();
  try {
    assert.throws(() => module.prepareSyntheticCustody({ ...f.input, root: ROOT }), /SYNTHETIC_CUSTODY_TEMP_ROOT_REQUIRED/);
    assert.throws(() => module.prepareSyntheticCustody({ ...f.input, scenarioSealPath: join(f.root, "missing-seal.json") }), /SYNTHETIC_CUSTODY_SCENARIO_SEAL_REQUIRED/);
    assert.throws(() => module.prepareSyntheticCustody({ ...f.input, scenarioSealHash: "0".repeat(64) }), /SYNTHETIC_CUSTODY_SCENARIO_SEAL_MISMATCH/);
    assert.equal(existsSync(join(f.root, "synthetic-dossier-custody")), false);
  } finally { cleanup(f.root); }
});

test("prospective custody rejects duplicate alternative identity and malformed unknown wrappers", async () => {
  const module = await load(pathToFileURL(HELPER).href); const f = fixture();
  try {
    const duplicate = structuredClone(f.input);
    duplicate.alternatives[1].alternativeId = duplicate.alternatives[0].alternativeId;
    assert.throws(() => module.prepareSyntheticCustody(duplicate), /SYNTHETIC_CUSTODY_ALTERNATIVE_ID_INVALID/);
    const wrongUnknown = structuredClone(f.input);
    (wrongUnknown.alternatives[0].fields.mealPlan as Record<string, unknown>).value = false;
    assert.throws(() => module.prepareSyntheticCustody(wrongUnknown), /SYNTHETIC_CUSTODY_UNKNOWN_INVALID/);
    assert.equal(existsSync(join(f.root, "synthetic-dossier-custody")), false);
  } finally { cleanup(f.root); }
});

test("prospective custody rejects missing or future-dated observation associations", async () => {
  const module = await load(pathToFileURL(HELPER).href); const f = fixture();
  try {
    assert.throws(() => module.prepareSyntheticCustody({ ...f.input, observations: [] }), /SYNTHETIC_CUSTODY_OBSERVATIONS_REQUIRED/);
    const changed = structuredClone(f.input); changed.observations[0].observedAt = "2099-01-01T00:00:00.000Z";
    assert.throws(() => module.prepareSyntheticCustody(changed), /SYNTHETIC_CUSTODY_OBSERVATION_INVALID/);
    assert.equal(existsSync(join(f.root, "synthetic-dossier-custody")), false);
  } finally { cleanup(f.root); }
});

for (const count of [5, 8]) test(`actual PS5.1 D0037 import/reopen preserves ${count * 3} original synthetic proofs for ${count} alternatives`, { skip: WINDOWS_ONLY, timeout: 360000 }, async () => {
  const module = await load(pathToFileURL(HELPER).href); const f = fixture(count);
  try {
    const sealBefore = readFileSync(f.input.scenarioSealPath);
    const result = module.prepareSyntheticCustody(f.input);
    assert.equal(result.syntheticProofOnly, true);
    assert.equal(result.importResult.status, "PASS_DIAGNOSTIC_CUSTODY");
    assert.equal(result.reopenResult.status, "PASS_REOPEN_DIAGNOSTIC_CUSTODY");
    assert.equal(result.proofFiles.length, count * 3);
    assert.equal(result.integrityProof.status, "PASS");
    assert.equal(result.integrityProof.screenshotCount, count * 3);
    assert.equal(result.integrityProof.alternativeCount, count);
    assert.equal(result.integrityProof.currentUserDpapiVerified, true);
    assert.equal(result.integrityProof.originalsByteIdentical, true);
    assert.equal(result.integrityProof.reopenNonMutating, true);
    assert.equal(result.integrityProof.humanReviewPerformed, false);
    assert.equal(result.integrityProof.realCustodyCertified, false);
    assert.equal(result.integrityProof.networkCalls, 0);
    assert.deepEqual(readFileSync(f.input.scenarioSealPath), sealBefore);
    for (const proof of result.proofFiles) {
      const bytes = readFileSync(proof.originalPath);
      assert.equal(hash(bytes), proof.sha256);
      assert.equal(bytes.length, proof.byteLength);
      assert.equal(proof.mediaType, "image/svg+xml");
      assert.match(bytes.toString("utf8"), /PROVA SINTETICA/);
      assert.ok(bytes.length > 500, "readable evidence cards, not marker-only pixels");
      for (const field of proof.fieldKeys) assert.ok(bytes.toString("utf8").includes(field));
    }
    assert.equal(result.fieldProofBindings.length, count * Object.keys(f.input.alternatives[0].fields).length);
    for (const binding of result.fieldProofBindings) {
      const proof = result.proofFiles.find((candidate) => candidate.proofRef === binding.proofRef);
      assert.equal(proof?.alternativeId, binding.alternativeId);
      assert.ok(proof?.fieldKeys.includes(binding.fieldKey));
    }
    const receipt = JSON.parse(readFileSync(result.reviewReceiptPath, "utf8"));
    assert.equal(receipt.reviewStatus, "SYNTHETIC_TEST_ONLY");
    assert.equal(receipt.reviewerClass, "SYNTHETIC_TEST_ONLY");
    const descriptor = JSON.parse(readFileSync(result.descriptorPath, "utf8"));
    assert.equal(descriptor.transcriptionReview.status, "NOT_REVIEWED");
    assert.equal(descriptor.classification.eligibility, "DIAGNOSTIC_ONLY");
    assert.equal(descriptor.alternatives.length, count);
    const simulatedConditions = { loggedOut: "VERIFIED", incognito: "UNKNOWN", personalizationAbsent: "VERIFIED" };
    for (const [key, value] of Object.entries(simulatedConditions)) assert.equal(descriptor.acquisition[key], value);
    const limitation = "VERIFIED_VALUES_ARE_SYNTHETIC_SCENARIO_ASSERTIONS_NOT_REAL_BROWSER_VERIFICATION";
    assert.ok(descriptor.acquisition.provenanceLimitations.includes(limitation));
    const provenance = JSON.parse(readFileSync(join(dirname(result.descriptorPath), "source", "SYNTHETIC_PACKAGE", "provenance.json"), "utf8"));
    assert.deepEqual(provenance.simulatedConsumerAssertions, simulatedConditions);
    assert.equal(provenance.realConsumerVerificationPerformed, false);
    assert.equal(provenance.browserWasUsed, false);
    assert.ok(provenance.provenanceLimitations.includes(limitation));
    for (const alternative of descriptor.alternatives) {
      assert.equal(alternative.taxAndCostDisclosure.observedDisplayStatement.status, "KNOWN");
      assert.equal(alternative.taxAndCostDisclosure.observedDisplayStatement.value, "Include tasse e costi");
      assert.equal(alternative.taxAndCostDisclosure.itemizedTaxBreakdown.status, "UNKNOWN");
    }
    const state = JSON.parse(readFileSync(join(result.sessionRoot, "session-state.json"), "utf8"));
    assert.equal(state.automaticGoldenAdmission, false);
    assert.equal(state.blindJudgmentEligible, false);
    assert.equal(state.v3ReplayEligible, false);
    const snapshotBeforeOverwrite = hash(readFileSync(join(result.sessionRoot, "session-state.json")));
    assert.throws(() => module.prepareSyntheticCustody(f.input), /SYNTHETIC_CUSTODY_OVERWRITE_REJECTED/);
    assert.equal(hash(readFileSync(join(result.sessionRoot, "session-state.json"))), snapshotBeforeOverwrite);
  } finally { cleanup(f.root); }
});
