import { stableSerializeV3 } from "../contract/stableHashV3";
import {
  STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
  type StayOptiGoldenAlternativeV3,
  type StayOptiGoldenCaseV3,
  type StayOptiGoldenDecisionRecordV3,
  type StayOptiGoldenSingleStayRoleV3,
} from "./goldenCaseContractV3";
import {
  validateGoldenCaseV3,
} from "./goldenCaseValidatorV3";
import {
  STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3,
  STAYOPTI_GOLDEN_BLIND_CHOICES_V3,
  STAYOPTI_GOLDEN_BLIND_JUDGMENT_REASONS_V3,
  STAYOPTI_GOLDEN_BLIND_MANIFEST_VERSION_V3,
  type StayOptiGoldenBlindBatchV3,
  type StayOptiGoldenBlindCapsuleV3,
  type StayOptiGoldenBlindManifestV3,
  type StayOptiGoldenBlindTaskV3,
  type StayOptiGoldenBlindedAlternativeV3,
  type StayOptiGoldenBlindedDecisionV3,
} from "./goldenJudgmentContractV3";

const OPAQUE_ID = /^[A-Z0-9][A-Z0-9_-]{7,127}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

interface NodeDigestV3 {
  update(value: string, encoding: "utf8"): NodeDigestV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeDigestV3;
  createHmac(algorithm: "sha256", key: string): NodeDigestV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

const ROLE_QUESTIONS: Readonly<Record<StayOptiGoldenSingleStayRoleV3, string>> =
  Object.freeze({
    "best-choice": "Which decision is the best overall fit for this trip?",
    "best-sensible-saving":
      "Which decision offers the most sensible saving without excessive loss?",
    "worthwhile-comfort-upgrade":
      "Which decision best justifies any additional cost through meaningful comfort?",
    "abstention-near-tie":
      "Which decision responds more responsibly to the available evidence?",
  });

const LEAK_KEY = /^(?:goldenCaseId|searchFamilyId|policyVersion|provider|providerSourceKey|providerId|providerName|commission|markup|manifest|seed|secret|token|rawPayload|rawResponse|bookingId|prebookId|continuationId)$/i;
const LEAK_TEXT = /(?:\bV2\b|\bV3\b|policyVersion|provider|commission|markup|goldenCaseId|searchFamilyId|manifest|seed|secret|token)/i;

function compareStrings(first: string, second: string) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function nodeCrypto() {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as
    NodeCryptoV3 | undefined;
  if (
    typeof cryptoModule?.createHash !== "function" ||
    typeof cryptoModule.createHmac !== "function"
  ) {
    throw new Error("Golden blind cryptography requires the Node built-in crypto module.");
  }
  return cryptoModule;
}

export function createGoldenBlindSha256DigestV3(value: unknown, namespace: string) {
  return nodeCrypto().createHash("sha256")
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex");
}

function hmac(key: string, value: unknown, namespace: string) {
  return nodeCrypto().createHmac("sha256", key)
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex");
}

function opaque(prefix: string, digest: string) {
  return `${prefix}_${digest.slice(0, 32).toUpperCase()}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort(compareStrings);
}

function blindEvidence<T extends object | string>(value: {
  status: "KNOWN" | "UNKNOWN";
  reliability: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  value: T | null;
  unknownReason: string | null;
}) {
  return {
    status: value.status,
    reliability: value.reliability,
    value: value.value === null ? null : structuredClone(value.value),
    unknownReason: value.unknownReason,
  };
}

function blindAlternative(
  alternative: StayOptiGoldenAlternativeV3,
  alternativeRef: string,
): StayOptiGoldenBlindedAlternativeV3 {
  return {
    alternativeRef,
    totalTripCostMinorUnits: alternative.totalTripCostMinorUnits,
    currency: alternative.currency,
    taxFeeEvidence: blindEvidence(alternative.taxFeeEvidence),
    ratingEvidence: blindEvidence(alternative.ratingEvidence),
    reviewEvidence: blindEvidence(alternative.reviewEvidence),
    distanceEvidence: blindEvidence(alternative.distanceEvidence),
    accommodationCategoryEvidence: blindEvidence(
      alternative.accommodationCategoryEvidence,
    ),
    roomEvidence: blindEvidence(alternative.roomEvidence),
    cancellationEvidence: blindEvidence(alternative.cancellationEvidence),
    comfortEvidence: blindEvidence(alternative.comfortEvidence),
    dataReliability: alternative.dataReliability,
    costCompleteness: alternative.costCompleteness,
    bookabilityStatus: alternative.bookabilityStatus,
    missingEvidence: sortedUnique(alternative.missingEvidence),
  };
}

function blindDecision(
  decision: StayOptiGoldenDecisionRecordV3,
  alternativeRefs: ReadonlyMap<string, string>,
): StayOptiGoldenBlindedDecisionV3 {
  return {
    status: decision.status,
    selectedAlternativeRefs: decision.selectedAlternativeIds
      .map((id) => alternativeRefs.get(id))
      .filter((id): id is string => id !== undefined)
      .sort(compareStrings),
  };
}

function leakPaths(value: unknown, path = "capsule"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) => leakPaths(child, `${path}[${index}]`));
  }
  if (typeof value === "string") {
    return LEAK_TEXT.test(value) ? [path] : [];
  }
  if (value === null || typeof value !== "object") return [];
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return [path];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(LEAK_KEY.test(key) ? [`${path}.${key}`] : []),
    ...leakPaths(child, `${path}.${key}`),
  ]);
}

export function scanGoldenBlindCapsuleForLeaksV3(value: unknown) {
  return sortedUnique(leakPaths(value));
}

export function createGoldenBlindCapsuleFingerprintV3(
  capsule: StayOptiGoldenBlindCapsuleV3,
) {
  return createGoldenBlindSha256DigestV3(capsule, "stayopti-golden-blind-capsule");
}

function manifestFingerprint(
  manifest: Omit<StayOptiGoldenBlindManifestV3, "manifestFingerprint">,
) {
  return createGoldenBlindSha256DigestV3(manifest, "stayopti-golden-blind-manifest");
}

export interface StayOptiCreateGoldenBlindBatchInputV3 {
  cases: readonly StayOptiGoldenCaseV3[];
  batchId: string;
  privateSeed: string;
  batchKey: string;
}

export function createGoldenBlindBatchV3(
  input: StayOptiCreateGoldenBlindBatchInputV3,
): StayOptiGoldenBlindBatchV3 {
  if (!OPAQUE_ID.test(input.batchId) || input.privateSeed.length < 16 || input.batchKey.length < 16) {
    throw new Error("Golden blind generation requires an opaque batch ID, private seed and batch key.");
  }
  if (input.cases.length === 0) {
    throw new Error("Golden blind generation requires at least one Golden case.");
  }

  const ordered = input.cases.map((goldenCase) => {
    const validation = validateGoldenCaseV3(goldenCase);
    if (validation.disposition !== "GOLDEN_VALID" || validation.computedFingerprint === null) {
      throw new Error("Golden blind generation accepts only GOLDEN_VALID cases.");
    }
    if (goldenCase.expectedRole === ("split-saver" as StayOptiGoldenSingleStayRoleV3)) {
      throw new Error("Split cases are excluded from single-stay blind evaluation.");
    }
    if (
      goldenCase.decisions.v2.role !== goldenCase.expectedRole ||
      goldenCase.decisions.v3Candidate.role !== goldenCase.expectedRole
    ) {
      throw new Error("Golden blind decisions must share the declared evaluation role.");
    }
    return {
      goldenCase,
      fingerprint: validation.computedFingerprint,
      order: hmac(
        input.privateSeed,
        {
          caseFingerprint: validation.computedFingerprint,
          localCaseId: goldenCase.goldenCaseId,
          batchId: input.batchId,
        },
        "task-order",
      ),
    };
  }).sort((left, right) => compareStrings(left.order, right.order));

  const orientationStart = Number.parseInt(
    hmac(input.privateSeed, input.batchId, "side-balance").slice(0, 2),
    16,
  ) % 2;
  const tasks: StayOptiGoldenBlindTaskV3[] = [];
  const manifestEntries: StayOptiGoldenBlindManifestV3["entries"] = [];

  ordered.forEach(({ goldenCase, fingerprint }, index) => {
    const evaluationTaskId = opaque(
      "TASK",
      hmac(
        input.batchKey,
        { batchId: input.batchId, fingerprint, localCaseId: goldenCase.goldenCaseId },
        "task-id",
      ),
    );
    const blindedCaseId = opaque(
      "CASE",
      hmac(
        input.batchKey,
        { batchId: input.batchId, fingerprint, localCaseId: goldenCase.goldenCaseId },
        "case-id",
      ),
    );
    const alternativeRefs = new Map<string, string>();
    const alternatives = goldenCase.alternatives.map((alternative) => {
      const ref = opaque(
        "ALT",
        hmac(
          input.batchKey,
          { batchId: input.batchId, fingerprint, local: alternative.localAlternativeId },
          "alternative-id",
        ),
      );
      alternativeRefs.set(alternative.localAlternativeId, ref);
      return {
        order: hmac(
          input.privateSeed,
          { evaluationTaskId, ref },
          "alternative-order",
        ),
        value: blindAlternative(alternative, ref),
      };
    }).sort((left, right) => compareStrings(left.order, right.order))
      .map(({ value }) => value);

    const candidateOnA = index % 2 === orientationStart;
    const v2Decision = blindDecision(goldenCase.decisions.v2, alternativeRefs);
    const v3Decision = blindDecision(goldenCase.decisions.v3Candidate, alternativeRefs);
    const task: StayOptiGoldenBlindTaskV3 = {
      capsuleVersion: STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3,
      evaluationTaskId,
      batchId: input.batchId,
      blindedCaseId,
      role: goldenCase.expectedRole,
      evaluationQuestion: ROLE_QUESTIONS[goldenCase.expectedRole],
      travelerContext: {
        budgetMinorUnits: goldenCase.travelerContext.budgetMinorUnits,
        profile: goldenCase.travelerContext.profile,
        essentialConstraintCodes: sortedUnique(
          goldenCase.travelerContext.essentialConstraintCodes,
        ),
        distancePreference: structuredClone(
          goldenCase.travelerContext.distancePreference,
        ),
        comfortRequirements: {
          ...structuredClone(goldenCase.travelerContext.comfortRequirements),
          requiredCodes: sortedUnique(
            goldenCase.travelerContext.comfortRequirements.requiredCodes,
          ),
        },
        flexibilityRequirements: structuredClone(
          goldenCase.travelerContext.flexibilityRequirements,
        ),
      },
      tripContext: {
        nights: goldenCase.tripContext.nights,
        adults: goldenCase.tripContext.adults,
        childAges: [...goldenCase.tripContext.childAges],
        rooms: goldenCase.tripContext.rooms,
        expectedCurrency: goldenCase.tripContext.expectedCurrency,
        destinationBucket: goldenCase.tripContext.destinationBucket,
        bookingLeadTimeBucket: goldenCase.tripContext.bookingLeadTimeBucket,
        stayLengthBucket: goldenCase.tripContext.stayLengthBucket,
        seasonBucket: goldenCase.tripContext.seasonBucket,
      },
      alternatives,
      decisionA: candidateOnA ? v3Decision : v2Decision,
      decisionB: candidateOnA ? v2Decision : v3Decision,
      allowedChoices: [...STAYOPTI_GOLDEN_BLIND_CHOICES_V3],
      allowedReasonCodes: [...STAYOPTI_GOLDEN_BLIND_JUDGMENT_REASONS_V3],
    };
    const taskFingerprint = createGoldenBlindSha256DigestV3(
      task,
      "stayopti-golden-blind-task",
    );
    tasks.push(task);
    manifestEntries.push({
      evaluationTaskId,
      blindedCaseId,
      goldenCaseId: goldenCase.goldenCaseId,
      searchFamilyId: goldenCase.searchFamilyId,
      role: goldenCase.expectedRole,
      sideAEngine: candidateOnA ? "V3_CANDIDATE" : "V2_BASELINE",
      sideBEngine: candidateOnA ? "V2_BASELINE" : "V3_CANDIDATE",
      taskFingerprint,
      goldenCaseFingerprint: fingerprint,
    });
  });

  const capsule: StayOptiGoldenBlindCapsuleV3 = {
    capsuleVersion: STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3,
    batchId: input.batchId,
    tasks,
    taskCount: tasks.length,
    privateOfflineOnly: true,
  };
  const leaks = scanGoldenBlindCapsuleForLeaksV3(capsule);
  if (leaks.length > 0) {
    throw new Error(`Golden blind capsule anti-leak validation failed at ${leaks.join(", ")}.`);
  }
  const capsuleFingerprint = createGoldenBlindCapsuleFingerprintV3(capsule);
  const manifestBody: Omit<StayOptiGoldenBlindManifestV3, "manifestFingerprint"> = {
    manifestVersion: STAYOPTI_GOLDEN_BLIND_MANIFEST_VERSION_V3,
    capsuleVersion: STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3,
    goldenSchemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
    batchId: input.batchId,
    entries: manifestEntries.sort((left, right) =>
      compareStrings(left.evaluationTaskId, right.evaluationTaskId)
    ),
    capsuleFingerprint,
  };
  const manifest: StayOptiGoldenBlindManifestV3 = {
    ...manifestBody,
    manifestFingerprint: manifestFingerprint(manifestBody),
  };
  return deepFreeze({ capsule, manifest });
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderGoldenBlindEvaluationHtmlV3(
  capsule: StayOptiGoldenBlindCapsuleV3,
) {
  const leaks = scanGoldenBlindCapsuleForLeaksV3(capsule);
  if (leaks.length > 0) throw new Error("Cannot render a capsule that failed anti-leak validation.");
  const data = htmlEscape(JSON.stringify(capsule));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>StayOpti blind review</title><style>body{font:16px system-ui;max-width:960px;margin:2rem auto;padding:0 1rem}button,label{margin:.35rem}pre{white-space:pre-wrap;background:#f4f4f4;padding:1rem}.side{display:inline-block;vertical-align:top;width:46%;margin:1%;padding:1%;border:1px solid #bbb}</style></head><body><h1>Private blind review</h1><fieldset><legend>Evaluator binding</legend><label>Evaluator pseudonym <input id="evaluator" required pattern="[A-Za-z0-9_-]{8,128}"></label><label>Class <select id="class"><option>HUMAN</option><option>EXPERT</option></select></label><label>Consent version <input id="consent" required value="consent.1"></label><label>Created-at bucket <input id="created" required placeholder="YYYY-MM" pattern="[0-9]{4}-[0-9]{2}"></label></fieldset><p id="progress"></p><main id="task"></main><fieldset><legend>Judgment</legend><label><input type="radio" name="choice" value="A">A</label><label><input type="radio" name="choice" value="B">B</label><label><input type="radio" name="choice" value="TIE">Tie</label><label><input type="radio" name="choice" value="INSUFFICIENT_EVIDENCE">Insufficient evidence</label><label>Confidence <select id="confidence"><option value="">Required</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label><label>Duration bucket <select id="duration"><option>DURATION_SHORT</option><option>DURATION_MEDIUM</option><option>DURATION_LONG</option></select></label><label>Structured reason <select id="reason"></select></label><button id="record">Record</button><button id="download" disabled>Export judgments</button></fieldset><script type="application/json" id="capsule-data">${data}</script><script>(()=>{'use strict';const cap=JSON.parse(document.getElementById('capsule-data').textContent);const out=[];let i=0;const p=document.getElementById('progress'),t=document.getElementById('task'),r=document.getElementById('reason'),d=document.getElementById('download');function show(){const x=cap.tasks[i];p.textContent=(i+1)+' / '+cap.tasks.length;t.textContent='';const h=document.createElement('h2');h.textContent=x.role+': '+x.evaluationQuestion;t.appendChild(h);['A','B'].forEach(k=>{const box=document.createElement('section');box.className='side';const q=document.createElement('pre');q.textContent=JSON.stringify({decision:x['decision'+k],alternatives:x.alternatives},null,2);box.appendChild(q);t.appendChild(box)});r.textContent='';x.allowedReasonCodes.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;r.appendChild(o)})}document.getElementById('record').onclick=()=>{const c=document.querySelector('input[name=choice]:checked'),f=document.getElementById('confidence').value,e=document.getElementById('evaluator').value,s=document.getElementById('consent').value,z=document.getElementById('created').value;if(!c||!f||!e||!s||!z)return;const x=cap.tasks[i];out.push({judgmentSchemaVersion:'stayopti.golden-blind-judgment@1',judgmentId:'JUDGMENT_'+e.slice(-24)+'_'+x.evaluationTaskId.slice(-16),batchId:cap.batchId,evaluationTaskId:x.evaluationTaskId,evaluatorPseudonym:e,evaluatorClass:document.getElementById('class').value,choice:c.value,confidence:Number(f),reasonCodes:[r.value],durationBucket:document.getElementById('duration').value,consentVersion:s,createdAtBucket:z});i++;if(i<cap.tasks.length)show();else{p.textContent='Complete';t.textContent='';d.disabled=false}};d.onclick=()=>{const b=new Blob([JSON.stringify({batchId:cap.batchId,judgments:out})],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='blind-judgments.json';a.click();URL.revokeObjectURL(a.href)};show()})();</script></body></html>`;
}

export const STAYOPTI_GOLDEN_BLIND_CAPSULE_AUDIT_V3 = Object.freeze({
  privateOfflineOnly: true as const,
  callerProvidedPrivateSeedRequired: true as const,
  defaultSeedAllowed: false as const,
  seedPersisted: false as const,
  seedPrinted: false as const,
  crossBatchLinkability: false as const,
  splitAccepted: false as const,
  publicFrontendRouteAdded: false as const,
  publicBackendEndpointAdded: false as const,
  analyticsEmitted: false as const,
  providerCallsRequired: false as const,
});

export function isGoldenBlindSha256V3(value: unknown) {
  return typeof value === "string" && SHA256.test(value);
}
