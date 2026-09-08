import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext, Script } from "node:vm";

const renderer = readFileSync(resolve(process.cwd(), "scripts/prospective-assisted-review-ui.mjs"), "utf8");
const html = runInNewContext(renderer.replace("export function renderProspectiveAssistedReviewHtmlV3", "function renderProspectiveAssistedReviewHtmlV3") + "\nrenderProspectiveAssistedReviewHtmlV3();") as string;
const client = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
assert.ok(client, "the actual renderer must expose its client script");

// Deliberately a portable DOM fixture, not a claim of browser or user-filesystem proof.
class ElementFixture {
  readonly tagName: string;
  children: ElementFixture[] = [];
  parent: ElementFixture | null = null;
  textContent = "";
  value = "";
  type = "";
  disabled = false;
  checked = false;
  src = "";
  open = false;
  className = "";
  id = "";
  onclick: (() => void) | null = null;
  onchange: (() => void) | null = null;
  readonly attributes: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly classes = new Set<string>();
  readonly classList = { add: (name: string) => { this.classes.add(name); }, remove: (name: string) => { this.classes.delete(name); }, toggle: (name: string, force?: boolean) => { if (force ?? !this.classes.has(name)) this.classes.add(name); else this.classes.delete(name); }, contains: (name: string) => this.classes.has(name) };
  constructor(tag: string) { this.tagName = tag; }
  append(...elements: ElementFixture[]) { for (const element of elements) { element.parent = this; this.children.push(element); if (this.tagName === "select" && this.children.length === 1) this.value = element.value; } }
  replaceChildren(...elements: ElementFixture[]) { this.children = []; this.append(...elements); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  removeAttribute(key: string) { delete this.attributes[key]; if (key === "src") this.src = ""; }
  addEventListener() {}
  scrollIntoView() {}
  querySelector(selector: string) { return selector === ".editor" ? descendants(this).find(element => element.className === "editor") || null : null; }
  focus() {}
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0]; }
  close() { this.open = false; }
}

function descendants(element: ElementFixture): ElementFixture[] {
  return [element, ...element.children.flatMap(descendants)];
}

function clientFixture(formControls: ElementFixture[] = [], transport?: (path: string, options: { body?: string }) => Promise<unknown>) {
  const ids = new Map<string, ElementFixture>();
  const get = (id: string) => { if (!ids.has(id)) ids.set(id, new ElementFixture("div")); return ids.get(id)!; };
  const context: Record<string, unknown> = {
    document: { getElementById: get, createElement: (tag: string) => new ElementFixture(tag), createTextNode: (text: string) => Object.assign(new ElementFixture("text"), { textContent: text }), querySelector: () => ({ getAttribute: () => "SYNTHETIC_CSRF" }), querySelectorAll: (selector: string) => selector === "input,select,textarea" ? formControls : selector.startsWith("input[name=selected-alternative]") ? descendants(get("selected-alternatives")).filter(element => element.tagName === "input" && (!selector.endsWith(":checked") || element.checked)) : selector === "button" ? [...new Set([...ids.values()].flatMap(descendants))].filter(element => element.tagName === "button") : [] },
    location: { href: "http://127.0.0.1:1234/", origin: "http://127.0.0.1:1234" },
    URL,
    fetch: (path: string, options: { body?: string }) => { if (transport) return transport(path, options); throw new Error("UI_UNIT_TEST_NETWORK_FORBIDDEN"); },
  };
  const hooked = client!.replace(/  load\(\);\r?\n\}\)\(\);\s*$/, "  globalThis.ui = { createValueEditor, editField, knownValue, formatMinorUnits, displayFieldValue, proofAddress, reviewed, renderSummary, renderSavedJudgments, renderEnabled, renderComparison, selectedOptions, eligibilityMessage, render, renderFields, renderJudgment, rememberDraft, reconcileDraft, reconsiderDraft, displayedBinding, showProof, load, draftRequiresRereview, getDraft(){return decisionDrafts.get(caseId);}, setAlternative(id){alternativeId=id;}, performAction(type,details) { return action(type,details); }, captureActions(capture) { action=async(type,details)=>{ capture({type,...details}); return true; }; }, setCase(item) { state={cases:[item]}; caseId=item.caseId; } };\n})();");
  assert.notEqual(hooked, client, "test hook must replace only the initial load of the real client");
  runInNewContext(hooked, context);
  return { ui: context.ui as { createValueEditor: (value: unknown, key: string, depth?: number, type?: string) => { element: ElementFixture; read: () => unknown }; editField: (section: ElementFixture, alt: unknown, field: unknown) => void; performAction: (type: string, details: unknown) => Promise<boolean>; captureActions: (capture: (action: unknown) => void) => void; knownValue: (wrapper: unknown) => string; formatMinorUnits: (value: unknown, currency?: string) => string; displayFieldValue: (key: string, wrapper: unknown, currency?: string) => string; proofAddress: (proof: unknown) => string | null; reviewed: (field: unknown) => boolean; renderSummary: () => void; renderSavedJudgments: (item: unknown) => void; renderEnabled: () => void; renderComparison: (item: unknown) => void; selectedOptions: () => void; eligibilityMessage: (item: unknown) => string | null; setCase: (item: unknown) => void; render: () => void; renderFields: (item: unknown) => void; renderJudgment: (item: unknown) => void; rememberDraft: () => void; reconcileDraft: (item: unknown) => unknown; reconsiderDraft: () => void; displayedBinding: () => { expectedRevision: number; contentFingerprint: string }; showProof: (proof: unknown) => void; load: () => Promise<void>; draftRequiresRereview: () => boolean; getDraft: () => { binding: { expectedRevision: number; contentFingerprint: string }; requiresRereview: boolean }; setAlternative: (id: string) => void }, get };
}

test("Prospective UI 01 real emitted client parses without external assets", () => {
  assert.doesNotThrow(() => new Script(client!));
  assert.doesNotMatch(html, /(?:src|href)\s*=\s*["']https?:/i);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /nessuna raccolta reale/);
  assert.match(html, /non produce giudizi ciechi qualificati/);
});

test("Prospective UI 02 structured numeric editing remains numeric", () => {
  const { ui } = clientFixture(), editor = ui.createValueEditor({ totalAmount: 60000, room: { adults: 2, privateBathroom: true } }, "offerta");
  const amount = descendants(editor.element).find(element => element.tagName === "input")!;
  amount.value = "59000";
  assert.equal(JSON.stringify(editor.read()), JSON.stringify({ totalAmount: 59000, room: { adults: 2, privateBathroom: true } }));
  amount.value = "non paghi ora";
  assert.throws(() => editor.read(), /richiede un numero/);
});

test("Prospective UI 03 unknown stays unknown rather than zero or false", () => {
  const { ui } = clientFixture();
  assert.match(ui.knownValue({ status: "UNKNOWN", value: null, reason: "NOT_DOCUMENTED" }), /UNKNOWN.*NOT_DOCUMENTED/);
  const editor = ui.createValueEditor(null, "distanceMeters", 0, "number");
  assert.throws(() => editor.read(), /Completa/);
  assert.equal(descendants(editor.element).find(element => element.tagName === "input")!.value, "");
});

test("Prospective UI 04 protected price semantics cannot be edited true", () => {
  const { ui } = clientFixture();
  for (const key of ["exactBookable", "verifiedCheckoutTotal", "sellerSpecific", "purchaseCompleted", "bookingConfirmed", "automaticGoldenAdmission"]) {
    const editor = ui.createValueEditor(false, key);
    assert.equal(descendants(editor.element).filter(element => ["input", "select"].includes(element.tagName)).length, 0);
    assert.equal(editor.read(), false);
  }
});

test("Prospective UI 05 every amenity can be edited and added without JSON", () => {
  const { ui } = clientFixture(), editor = ui.createValueEditor(["WIFI", "PRIVATE_BATHROOM"], "amenities");
  const controls = descendants(editor.element);
  controls.find(element => element.tagName === "input")!.value = "AIR_CONDITIONING";
  controls.find(element => element.textContent === "Aggiungi elemento")!.onclick!();
  assert.throws(() => editor.read(), /Completa/);
  const inputs = descendants(editor.element).filter(element => element.tagName === "input");
  inputs[2].value = "WIFI";
  assert.equal(JSON.stringify(editor.read()), JSON.stringify(["AIR_CONDITIONING", "PRIVATE_BATHROOM", "WIFI"]));
  assert.equal(descendants(editor.element).filter(element => element.tagName === "textarea").length, 0);
});

test("Prospective UI 06 new numeric or boolean list entries have no invented default", () => {
  const { ui } = clientFixture();
  for (const kind of ["number", "boolean"]) {
    const editor = ui.createValueEditor([], "items"), controls = descendants(editor.element);
    controls.find(element => element.tagName === "select")!.value = kind;
    controls.find(element => element.textContent === "Aggiungi elemento")!.onclick!();
    assert.throws(() => editor.read(), /Completa/);
    const input = descendants(editor.element).find(element => element.tagName === "input")!;
    input.value = kind === "number" ? "3" : "false";
    assert.equal(JSON.stringify(editor.read()), kind === "number" ? "[3]" : "[false]");
  }
});

test("Prospective UI 07 unsafe object keys and excessive nesting fail closed", () => {
  const { ui } = clientFixture();
  assert.throws(() => ui.createValueEditor(JSON.parse('{"__proto__":false}'), "unsafe"), /non sicuro/);
  assert.throws(() => ui.createValueEditor("value", "nested", 9), /troppo profonda/);
});

test("Prospective UI 08 proof references are constrained to the loopback API origin", () => {
  const { ui } = clientFixture();
  assert.equal(ui.proofAddress({ url: "/api/proof/SYNTHETIC_01" }), "http://127.0.0.1:1234/api/proof/SYNTHETIC_01");
  for (const url of ["https://external.invalid/api/proof/x", "file:///private/x", "/not-proof/x", "http://user:password@127.0.0.1:1234/api/proof/x", "/api/proof/x?secret=x", "/api/proof/x#hidden"]) assert.equal(ui.proofAddress({ url }), null);
});

test("Prospective UI 09 unreviewed and unknown statuses cannot approve hidden fields", () => {
  const { ui } = clientFixture();
  for (const reviewStatus of [undefined, "PENDING", "UNKNOWN", "AUTO_APPROVED"]) assert.equal(ui.reviewed({ reviewStatus }), false);
  for (const reviewStatus of ["CORRECT", "CORRECTED", "UNVERIFIABLE"]) assert.equal(ui.reviewed({ reviewStatus }), true);
});

test("Prospective UI 10 summary covers five and eight full alternatives regardless of filter", () => {
  for (const count of [5, 8]) {
    const { ui, get } = clientFixture();
    get("field-filter").value = "critical";
    ui.setCase({ caseId: "SYNTHETIC", alternatives: Array.from({ length: count }, (_, index) => ({ id: String(index), label: "Alternativa " + index, fields: [{ key: "critical", critical: true, value: { status: "KNOWN", value: 42 }, reviewStatus: "CORRECT" }, { key: "notCritical", critical: false, value: { status: "UNKNOWN", reason: "NOT_DOCUMENTED" }, reviewStatus: "PENDING" }] })) });
    ui.renderSummary();
    const elements = descendants(get("full-summary"));
    assert.equal(elements.filter(element => element.tagName === "tr").length, 1 + 2 * count);
    assert.equal(elements.find(element => element.id === "confirm-review")!.disabled, true);
    assert.equal(elements.find(element => element.id === "review-confirm")!.checked, false);
  }
});

test("Prospective UI 11 decision options and confidence distinguish ties and abstention", () => {
  for (const value of ["SELECT", "TIE", "NONE_ADEQUATE", "INSUFFICIENT_EVIDENCE"]) assert.match(html, new RegExp('value="' + value + '"'));
  assert.match(client!, /selectedAlternativeIds\.length<2/);
  assert.match(client!, /confidence<1\|\|confidence>5/);
  assert.match(client!, /blockingField\|\|null:null/);
  assert.match(html, /Motivo decisivo breve<\/label><select/);
  assert.doesNotMatch(html, /<textarea/);
});

test("Prospective UI 12 exposure is explicit and never assigns expert status", () => {
  for (const key of ["knownData", "recognizesCase", "knowsEngineAdvice"]) assert.match(client!, new RegExp(key));
  assert.match(client!, /Rispondi separatamente a tutte e tre/);
  assert.match(client!, /Non sono conteggiate come giudizi ciechi umani o esperti/);
  assert.doesNotMatch(html, /value="EXPERT"/);
});

test("Prospective UI 13 no storage shortcuts, automatic reviews or suggestions", () => {
  assert.doesNotMatch(client!, /localStorage|sessionStorage|indexedDB|\.innerHTML\s*=/);
  assert.match(client!, /confirmed:true/);
  assert.match(client!, /APPLICA CORREZIONE/);
  assert.match(client!, /Annulla modifica non salvata/);
  assert.match(client!, /allFields\(item\)\.some\(\(\{field\}\)=>!reviewed\(field\)\)/);
  assert.doesNotMatch(client!, /engineSuggestion|recommendedAlternative|bestChoice/);
});

test("Prospective UI 14 proof dialog supports open, zoom and native Escape", () => {
  assert.match(html, /<dialog id="proof-dialog"/);
  assert.match(client!, /\.showModal\(\)/);
  assert.match(client!, /classList\.toggle\('zoomed'\)/);
  assert.match(client!, /proof-dialog-close.*\.close\(\)/);
  assert.match(client!, /noopener,noreferrer/);
});

test("Prospective UI 15 eligibility blocks saving even after human transcript confirmation", () => {
  const { ui, get } = clientFixture();
  for (const eligible of [undefined, false, true]) {
    const item = { caseId: "SYNTHETIC", alternatives: [], reviewConfirmed: true, comparison: { alternatives: [{ label: "ALT_A", selectionId: "SYNTHETIC_1", fields: {} }] }, eligibility: { eligible, eligibilityBlockers: ["MISSING_CRITICAL_FIELD"] } };
    ui.setCase(item); ui.renderEnabled();
    assert.equal(get("save-judgment").disabled, eligible !== true);
    assert.equal(ui.eligibilityMessage(item) === null, eligible === true);
  }
});

test("Prospective UI 16 saved judgment remains fully readable including invalidation and blocker", () => {
  const { ui, get } = clientFixture();
  ui.renderSavedJudgments({ alternatives: [{ id: "ALT_A", label: "Alternativa A", fields: [{ key: "mealPlan", label: "Trattamento" }] }], invalidatedJudgmentIds: ["J_01"], judgments: [{ recordedAt: "2026-09-06T12:00:00Z", dataRevision: 1, judgment: { judgmentId: "J_01", choice: "INSUFFICIENT_EVIDENCE", selectedAlternativeIds: [], confidence: 4, reasonCodes: ["EVIDENCE_TOO_INCOMPLETE"], blockingField: "mealPlan" } }] });
  const values = descendants(get("judgment-receipt")).map(element => element.textContent).join("\n");
  for (const expected of ["NON VALIDA PER I DATI CORRENTI", "Dati insufficienti", "4 / 5", "Informazione necessaria mancante", "Trattamento", "2026-09-06T12:00:00Z"]) assert.ok(values.includes(expected), expected);
});

test("Prospective UI 17 canonical reason codes remain exact and conditional", () => {
  for (const reason of ["BETTER_CONTEXTUAL_FIT", "SENSIBLE_SAVING", "JUSTIFIED_COMFORT", "BETTER_LOCATION", "BETTER_FLEXIBILITY", "LOWER_DECISION_RISK", "OPTIONS_EQUIVALENT", "HARD_CONSTRAINT_NOT_MET", "EVIDENCE_TOO_INCOMPLETE", "TRADEOFF_NOT_JUSTIFIED"]) assert.ok(client!.includes(reason));
  assert.match(client!, /TIE:'OPTIONS_EQUIVALENT'/);
  assert.match(client!, /NONE_ADEQUATE:'TRADEOFF_NOT_JUSTIFIED'/);
  assert.match(client!, /INSUFFICIENT_EVIDENCE:'EVIDENCE_TOO_INCOMPLETE'/);
  assert.doesNotMatch(client!, /BETTER_QUALITY|OTHER_ALLOWED_STRUCTURED_REASON/);
});

test("Prospective UI 18 stopping is explicit and conserves saved progress", () => {
  assert.match(html, /Chiudi demo \(progressi conservati\)/);
  assert.match(client!, /request\('\/api\/stop',\{\}\)/);
  assert.match(client!, /medesima DataRoot per riprendere/);
  assert.match(client!, /modifiche non confermate non sono state salvate/);
  assert.doesNotMatch(client!, /method:'DELETE'|\/api\/delete|\/api\/purge/);
});

test("Prospective UI 19 actual UNKNOWN numeric correction emits numbers and preserves proof refs", async () => {
  for (const fieldKey of ["totalStayPriceMinorUnits", "payNowMinorUnits", "payAtPropertyMinorUnits", "rating", "ratingScale", "reviewCount", "distanceMeters"]) {
    const { ui } = clientFixture(), section = new ElementFixture("section"), actions: unknown[] = [];
    ui.captureActions(action => actions.push(action));
    ui.editField(section, { id: "SYNTHETIC_ALT_01" }, { key: fieldKey, label: "Etichetta italiana diversa dal codice", value: { status: "UNKNOWN", value: null, reason: "NOT_DOCUMENTED", evidenceRefs: ["SYNTHETIC_PROOF_01"] } });
    const controls = descendants(section), status = controls.find(element => element.tagName === "select")!, number = controls.find(element => element.tagName === "input")!, save = controls.find(element => element.textContent === "APPLICA CORREZIONE")!;
    status.value = "KNOWN";
    await save.onclick!();
    assert.equal(actions.length, 0, "blank UNKNOWN must not invent zero");
    number.value = "7.7";
    await save.onclick!();
    assert.equal(JSON.stringify(actions), JSON.stringify([{ type: "CORRECT_FIELD", alternativeId: "SYNTHETIC_ALT_01", fieldKey, value: { status: "KNOWN", value: 7.7, reason: null, evidenceRefs: ["SYNTHETIC_PROOF_01"] } }]));
  }
});

test("Prospective UI 20 comparison has no fallback to private review and excludes asymmetric values", () => {
  const { ui, get } = clientFixture();
  const review = [{ id: "PRIVATE_REVIEW_ORDER", fields: [{ key: "secret", value: "DO_NOT_COMPARE_THIS" }] }];
  ui.renderComparison({ alternatives: review, comparison: null });
  assert.doesNotMatch(descendants(get("comparison")).map(element => element.textContent).join("\n"), /DO_NOT_COMPARE_THIS/);
  ui.renderComparison({ alternatives: review, comparison: { alternatives: [{ label: "ALT_A", selectionId: "SYNTHETIC_ALT_1", fields: { amenities: { status: "KNOWN", value: "ASYMMETRIC_DETAIL_ONLY", comparativeEligibility: "AUDIT_ONLY_NOT_COMPARABLE", reliability: "MEDIUM" }, mealPlan: { status: "UNKNOWN", unknownReason: "NOT_DOCUMENTED", comparativeEligibility: "UNKNOWN_NOT_NEGATIVE_EVIDENCE", reliability: "LOW" } } }] } });
  const text = descendants(get("comparison")).map(element => element.textContent).join("\n");
  assert.doesNotMatch(text, /ASYMMETRIC_DETAIL_ONLY|DO_NOT_COMPARE_THIS/);
  for (const value of ["ALT_A", "AUDIT_ONLY_NOT_COMPARABLE", "Consulta il dato nella revisione", "UNKNOWN — non è evidenza negativa", "non sono prezzi esatti prenotabili"]) assert.ok(text.includes(value), value);
});

test("Prospective UI 21 neutral selection labels and ordering come only from comparison", () => {
  const { ui, get } = clientFixture();
  ui.setCase({ caseId: "SYNTHETIC", alternatives: [{ id: "OLD_ORDER", label: "PRIVATE_ORIGINAL", fields: [] }], comparison: { alternatives: [{ label: "ALT_B", selectionId: "OPAQUE_TWO" }, { label: "ALT_A", selectionId: "OPAQUE_ONE" }] } });
  get("outcome").value = "TIE"; ui.selectedOptions();
  const elements = descendants(get("selected-alternatives")), inputs = elements.filter(element => element.tagName === "input");
  assert.deepEqual(inputs.map(element => element.value), ["OPAQUE_TWO", "OPAQUE_ONE"]);
  assert.doesNotMatch(elements.map(element => element.textContent).join("\n"), /PRIVATE_ORIGINAL/);
});

test("Prospective UI 22 temporal provenance and same-origin mutation protection are explicit", () => {
  assert.match(client!, /X-Demo-CSRF/);
  assert.match(client!, /meta\[name="demo-csrf"\]/);
  for (const key of ["observedAt", "observedLocalDateTime", "leadTimeCalendarDays", "collectionWindow", "custodyStartedAt", "expiresAt", "importedAt"]) assert.ok(client!.includes(key), key);
  assert.match(client!, /non costituiscono certificazione temporale indipendente/);
  assert.match(client!, /non coincidono con la cattura/);
  assert.match(client!, /loggedOut/);
  assert.match(client!, /incognito/);
  assert.match(client!, /personalizationAbsent/);
});

test("Prospective UI 23 euro readouts preserve original minor units and numeric editing", () => {
  const { ui, get } = clientFixture(), value = { status: "KNOWN", value: 40000, comparativeEligibility: "COMPARABLE_ACROSS_SET", reliability: "MEDIUM" };
  assert.equal(ui.formatMinorUnits(40000, "EUR"), "400,00 EUR (40000 centesimi)");
  for (const key of ["totalStayPriceMinorUnits", "payNowMinorUnits", "payAtPropertyMinorUnits"]) assert.equal(ui.displayFieldValue(key, value, "EUR"), "400,00 EUR (40000 centesimi)");
  assert.equal(ui.displayFieldValue("rating", { status: "KNOWN", value: 8.2 }, "EUR"), "8.2");
  assert.match(ui.displayFieldValue("payNowMinorUnits", { status: "UNKNOWN", value: null, reason: "NOT_DOCUMENTED" }, "EUR"), /^UNKNOWN/);
  assert.doesNotMatch(ui.formatMinorUnits(40000), /EUR/);
  assert.equal(ui.createValueEditor(40000, "totalStayPriceMinorUnits", 0, "number").read(), 40000);
  ui.renderComparison({ comparison: { scenario: { currency: "EUR" }, alternatives: [{ label: "ALT_A", selectionId: "SYNTHETIC", fields: { totalStayPriceMinorUnits: value } }] } });
  assert.ok(descendants(get("comparison")).some(element => element.textContent === "400,00 EUR (40000 centesimi)"));
  assert.match(client!, /key==='budgetMinorUnits'\?formatMinorUnits\(value,item\.scenario\.currency\)/);
  assert.match(client!, /Distanza documentata dal riferimento \(metri\)/);
  assert.doesNotMatch(client!, /Distanza documentata dal centro/);
});

test("Prospective UI 24 pending asynchronous action locks form edits and restores prior disabled states", async () => {
  const choice = new ElementFixture("select"), correction = new ElementFixture("input"), protectedInput = new ElementFixture("input");
  choice.value = "TIE"; correction.value = "40000"; protectedInput.disabled = true;
  let rejectTransport!: (reason: Error) => void;
  const pending = new Promise<unknown>((_resolve, reject) => { rejectTransport = reject; });
  const { ui } = clientFixture([choice, correction, protectedInput], () => pending);
  ui.setCase({ caseId: "SYNTHETIC", revision: 1, contentFingerprint: "SYNTHETIC_FP", alternatives: [], comparison: null });
  const response = ui.performAction("RECORD_EXPOSURE", { exposure: { knownData: true, recognizesCase: false, knowsEngineAdvice: false } });
  assert.equal(choice.disabled, true);
  assert.equal(correction.disabled, true);
  assert.equal(protectedInput.disabled, true);
  rejectTransport(new Error("SYNTHETIC_CONTROLLED_FAILURE"));
  assert.equal(await response, false);
  assert.equal(choice.disabled, false);
  assert.equal(correction.disabled, false);
  assert.equal(protectedInput.disabled, true);
  assert.equal(choice.value, "TIE");
  assert.equal(correction.value, "40000");
});

function continuityCase(revision = 1, contentFingerprint = "SYNTHETIC_CONTENT_A") {
  const alternatives = Array.from({ length: 5 }, (_, index) => ({ id: "SYNTHETIC_" + index, label: "Alternativa sintetica " + index,
    fields: [{ key: "rating", label: "Rating", value: { status: "KNOWN", value: 8, evidenceRefs: ["PROOF_" + index] }, reviewStatus: "CORRECT" }, { key: "mealPlan", label: "Trattamento", value: { status: index === 0 ? "UNKNOWN" : "KNOWN", value: index === 0 ? null : "ROOM_ONLY", evidenceRefs: ["PROOF_" + index] }, reviewStatus: "UNVERIFIABLE" }],
    proofs: [{ ref: "PROOF_" + index, url: "/api/proof/SYNTHETIC_" + index, label: "Prova sintetica" }],
  }));
  return { caseId: "SYNTHETIC_CONTINUITY", revision, contentFingerprint, scenario: { currency: "EUR" }, alternatives, reviewConfirmed: true, exposure: { knownData: true, recognizesCase: false, knowsEngineAdvice: false }, comparison: { scenario: { currency: "EUR" }, alternatives: alternatives.map(alt => ({ label: alt.label, selectionId: alt.id, fields: {} })) }, eligibility: { eligible: true } };
}

function fillDecisionDraft(fixture: ReturnType<typeof clientFixture>) {
  const { ui, get } = fixture;
  get("outcome").value = "TIE"; ui.selectedOptions();
  for (const input of descendants(get("selected-alternatives")).filter(element => element.tagName === "input").slice(0, 2)) input.checked = true;
  get("confidence").value = "4"; get("reason").value = "OPTIONS_EQUIVALENT"; get("judgment-confirm").checked = true;
  get("exposure-knownData").value = "true"; get("exposure-recognizesCase").value = "false"; get("exposure-knowsEngineAdvice").value = "false";
}

test("Prospective UI 25 action posts the displayed revision and fingerprint, never caller overrides", async () => {
  const item = continuityCase(7), requests: unknown[] = [];
  const { ui } = clientFixture([], async (_path, options) => { requests.push(JSON.parse(options.body!)); return { ok: true, json: async () => ({ cases: [{ ...item, revision: 8 }] }) }; });
  ui.setCase(item); ui.render();
  assert.equal(await ui.performAction("REVIEW_FIELD", { alternativeId: item.alternatives[0].id, fieldKey: "rating", reviewStatus: "CORRECT", expectedRevision: 99, contentFingerprint: "NOT_DISPLAYED" }), true);
  assert.deepEqual(requests, [{ alternativeId: "SYNTHETIC_0", fieldKey: "rating", reviewStatus: "CORRECT", expectedRevision: 7, contentFingerprint: "SYNTHETIC_CONTENT_A", caseId: item.caseId, type: "REVIEW_FIELD" }]);
});

test("Prospective UI 26 stale refusal does not silently reload or rebind the displayed version", async () => {
  let requests = 0;
  const fixture = clientFixture([], async () => { requests++; return { ok: false, json: async () => ({ error: "DEMO_DISPLAYED_VERSION_STALE" }) }; });
  fixture.ui.setCase(continuityCase(7)); fixture.ui.render(); fillDecisionDraft(fixture);
  assert.equal(await fixture.ui.performAction("CONFIRM_REVIEW", { confirmed: true }), false);
  assert.equal(requests, 1);
  assert.equal(fixture.ui.displayedBinding().expectedRevision, 7);
  assert.equal(fixture.ui.displayedBinding().contentFingerprint, "SYNTHETIC_CONTENT_A");
  assert.equal(fixture.get("outcome").value, "TIE");
  assert.match(fixture.get("status").textContent, /azione non è stata salvata.*Rileggi progressi salvati.*rileggi/s);
});

test("Prospective UI 27 missing displayed binding produces no request", async () => {
  let requests = 0;
  const { ui, get } = clientFixture([], async () => { requests++; throw new Error("SHOULD_NOT_SEND"); });
  ui.setCase({ ...continuityCase(), contentFingerprint: undefined });
  assert.equal(await ui.performAction("CONFIRM_REVIEW", { confirmed: true }), false);
  assert.equal(requests, 0); assert.match(get("status").textContent, /Versione dei dati non disponibile/);
});

test("Prospective UI 28 proof remains visible through a real successful review action rerender", async () => {
  const item = continuityCase(), next = { ...item, revision: 2 };
  const { ui, get } = clientFixture([], async () => ({ ok: true, json: async () => ({ cases: [next] }) }));
  ui.setCase(item); ui.render(); ui.showProof(item.alternatives[0].proofs[0]); get("proof-dialog").open = true;
  assert.equal(await ui.performAction("REVIEW_FIELD", { alternativeId: "SYNTHETIC_0", fieldKey: "rating", reviewStatus: "CORRECT" }), true);
  assert.equal(get("proof-image").src, "http://127.0.0.1:1234/api/proof/SYNTHETIC_0");
  assert.equal(get("proof-image").classes.has("hidden"), false);
  assert.equal(get("proof-open").disabled, false);
  assert.equal(get("proof-dialog").open, true);
});

test("Prospective UI 29 removed proof, changed URL or changed alternative clears the old proof", () => {
  for (const change of ["removed", "url", "alternative"]) {
    const item = continuityCase(), { ui, get } = clientFixture(); ui.setCase(item); ui.render(); ui.showProof(item.alternatives[0].proofs[0]); get("proof-dialog").open = true;
    if (change === "removed") item.alternatives[0].proofs = [];
    if (change === "url") item.alternatives[0].proofs[0].url = "/api/proof/DIFFERENT_SYNTHETIC";
    if (change === "alternative") ui.setAlternative(item.alternatives[1].id);
    ui.renderFields(item);
    assert.equal(get("proof-image").src, ""); assert.equal(get("proof-open").disabled, true); assert.equal(get("proof-dialog").open, false);
  }
});

test("Prospective UI 30 nonmaterial update retains complete judgment and exposure drafts", async () => {
  const item = continuityCase(7), fixture = clientFixture([], async () => ({ ok: true, json: async () => ({ cases: [{ ...item, revision: 8 }] }) }));
  fixture.ui.setCase(item); fixture.ui.render(); fillDecisionDraft(fixture);
  assert.equal(await fixture.ui.performAction("RECORD_EXPOSURE", { exposure: item.exposure }), true);
  assert.equal(fixture.get("outcome").value, "TIE"); assert.equal(fixture.get("confidence").value, "4"); assert.equal(fixture.get("reason").value, "OPTIONS_EQUIVALENT"); assert.equal(fixture.get("judgment-confirm").checked, true);
  assert.deepEqual(descendants(fixture.get("selected-alternatives")).filter(element => element.tagName === "input" && element.checked).map(element => element.value), ["SYNTHETIC_0", "SYNTHETIC_1"]);
  assert.equal(fixture.get("exposure-knownData").value, "true"); assert.equal(fixture.ui.getDraft().binding.expectedRevision, 8); assert.equal(fixture.ui.draftRequiresRereview(), false);
});

test("Prospective UI 31 material update preserves but blocks the draft until explicit reconsideration", async () => {
  const item = continuityCase(7), changed = continuityCase(8, "SYNTHETIC_CONTENT_B"); let requests = 0;
  const fixture = clientFixture([], async () => { requests++; return { ok: true, json: async () => ({ cases: [changed] }) }; });
  fixture.ui.setCase(item); fixture.ui.render(); fillDecisionDraft(fixture); await fixture.ui.load();
  assert.equal(fixture.get("outcome").value, "TIE"); assert.equal(fixture.get("confidence").value, "4"); assert.equal(fixture.ui.draftRequiresRereview(), true); assert.equal(fixture.get("judgment-confirm").checked, false); assert.equal(fixture.get("save-judgment").disabled, true);
  assert.equal(fixture.ui.getDraft().binding.contentFingerprint, "SYNTHETIC_CONTENT_A");
  assert.equal(await fixture.ui.performAction("RECORD_JUDGMENT", {}), false); assert.equal(requests, 1);
  fixture.ui.reconsiderDraft();
  assert.equal(fixture.ui.draftRequiresRereview(), false); assert.equal(fixture.ui.getDraft().binding.contentFingerprint, "SYNTHETIC_CONTENT_B"); assert.equal(fixture.get("judgment-confirm").checked, false); assert.equal(requests, 1, "reconsideration is not a recorded judgment or automatic review");
});

test("Prospective UI 32 no-adequate is an optional documented tradeoff, not a fabricated hard violation", () => {
  const { ui, get } = clientFixture(); ui.setCase(continuityCase()); get("outcome").value = "NONE_ADEQUATE"; ui.selectedOptions();
  assert.deepEqual(get("reason").children.map(element => element.value), ["", "TRADEOFF_NOT_JUSTIFIED"]);
  assert.deepEqual(get("blocking-field").children.map(element => element.value), ["", "rating"]);
  assert.match(get("blocking-label").textContent, /facoltativo/);
  assert.match(html, /anche se i vincoli essenziali sono soddisfatti/);
  assert.doesNotMatch(get("blocking-field").children.map(element => element.value).join(" "), /hardConstraints|mealPlan/);
});

test("Prospective UI 33 field editor survives unrelated updates and cannot apply after material change", async () => {
  const item = continuityCase(), { ui, get } = clientFixture(); ui.setCase(item); ui.render();
  const section = descendants(get("fields")).find(element => element.className === "field")!;
  ui.editField(section, item.alternatives[0], item.alternatives[0].fields[0]);
  const editor = section.querySelector(".editor")!, input = descendants(editor).find(element => element.tagName === "input")!;
  input.value = "8.7";
  ui.setCase({ ...item, revision: 2 }); ui.render();
  assert.ok(descendants(get("fields")).includes(editor)); assert.equal(input.value, "8.7");
  const save = descendants(editor).find(element => element.textContent === "APPLICA CORREZIONE")!;
  assert.equal(save.disabled, false);
  ui.setCase(continuityCase(3, "SYNTHETIC_CONTENT_CHANGED")); ui.render();
  assert.ok(descendants(get("fields")).includes(editor)); assert.equal(input.value, "8.7"); assert.equal(save.disabled, true);
  await save.onclick!(); assert.match(get("status").textContent, /I dati sono cambiati.*rileggi/);
});
