import { createGoldenBlindSha256DigestV3 } from "./goldenBlindCapsuleV3";
import {
  STAYOPTI_GOLDEN_BLIND_CHOICES_V3,
  STAYOPTI_GOLDEN_BLIND_JUDGMENT_REASONS_V3,
  STAYOPTI_GOLDEN_JUDGMENT_LEDGER_VERSION_V3,
  STAYOPTI_GOLDEN_JUDGMENT_SCHEMA_VERSION_V3,
  type StayOptiGoldenBlindJudgmentV3,
  type StayOptiGoldenBlindTaskV3,
  type StayOptiGoldenJudgmentLedgerV3,
  type StayOptiGoldenJudgmentValidationIssueV3,
  type StayOptiGoldenJudgmentValidationReasonCodeV3,
  type StayOptiGoldenJudgmentValidationResultV3,
} from "./goldenJudgmentContractV3";

const REQUIRED_KEYS = [
  "batchId",
  "choice",
  "confidence",
  "consentVersion",
  "createdAtBucket",
  "durationBucket",
  "evaluationTaskId",
  "evaluatorClass",
  "evaluatorPseudonym",
  "judgmentId",
  "judgmentSchemaVersion",
  "reasonCodes",
] as const;

const OPAQUE_ID = /^[A-Z0-9][A-Z0-9_-]{7,127}$/i;
const VERSION = /^[A-Z0-9][A-Z0-9._@-]{2,127}$/i;
const BUCKET = /^(?:\d{4}-(?:\d{2}|Q[1-4])|[A-Z][A-Z0-9_-]{2,63})$/;
const PRECISE_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SECRET_TEXT = /(?:\bBearer\s+[A-Za-z0-9._~-]+|\bsk-[A-Za-z0-9_-]{12,})/i;
const UNSAFE_KEY = /^(?:name|firstName|lastName|email|phone|ip|ipAddress|userAgent|address|providerId|hotelId|rateId|offerId|bookingId|prebookId|continuationId|rawPayload|rawResponse|apiKey|accessToken|refreshToken|secret|password|commission|markup|freeText|comment|message|__proto__|prototype|constructor)$/i;

function compareStrings(first: string, second: string) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pushIssue(
  issues: StayOptiGoldenJudgmentValidationIssueV3[],
  reasonCode: StayOptiGoldenJudgmentValidationReasonCodeV3,
  path: string,
) {
  issues.push({ reasonCode, path });
}

function sortedIssues(issues: readonly StayOptiGoldenJudgmentValidationIssueV3[]) {
  const unique = new Map<string, StayOptiGoldenJudgmentValidationIssueV3>();
  for (const issue of issues) unique.set(`${issue.reasonCode}\n${issue.path}`, issue);
  return [...unique.values()].sort((left, right) =>
    compareStrings(left.reasonCode, right.reasonCode) || compareStrings(left.path, right.path)
  );
}

function scanSafety(
  value: unknown,
  path: string,
  issues: StayOptiGoldenJudgmentValidationIssueV3[],
  seen: Set<object>,
) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" ||
    (typeof value === "number" && !Number.isFinite(value))) {
    pushIssue(issues, "JUDGMENT_JSON_VALUE_INVALID", path);
    return;
  }
  if (typeof value === "string") {
    if (EMAIL.test(value) || SECRET_TEXT.test(value)) {
      pushIssue(issues, "JUDGMENT_UNSAFE_FIELD_PRESENT", path);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) {
    pushIssue(issues, "JUDGMENT_JSON_VALUE_INVALID", path);
    return;
  }
  seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length > 0) {
      pushIssue(issues, "JUDGMENT_JSON_VALUE_INVALID", path);
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || descriptor.get !== undefined ||
        descriptor.set !== undefined || !("value" in descriptor)
      ) {
        pushIssue(issues, "JUDGMENT_OBJECT_PROTOTYPE_INVALID", `${path}[${index}]`);
        continue;
      }
      scanSafety(descriptor.value, `${path}[${index}]`, issues, seen);
    }
    if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9]\d*)$/.test(key))) {
      pushIssue(issues, "JUDGMENT_UNEXPECTED_FIELD", path);
    }
    seen.delete(value);
    return;
  }
  if (prototype !== Object.prototype && prototype !== null) {
    pushIssue(issues, "JUDGMENT_OBJECT_PROTOTYPE_INVALID", path);
    seen.delete(value);
    return;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    pushIssue(issues, "JUDGMENT_JSON_VALUE_INVALID", path);
  }
  for (const key of Object.keys(descriptors).sort(compareStrings)) {
    const descriptor = descriptors[key];
    const childPath = `${path}.${key}`;
    if (UNSAFE_KEY.test(key)) pushIssue(issues, "JUDGMENT_UNSAFE_FIELD_PRESENT", childPath);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined ||
      !("value" in descriptor)) {
      pushIssue(issues, "JUDGMENT_OBJECT_PROTOTYPE_INVALID", childPath);
      continue;
    }
    scanSafety(descriptor.value, childPath, issues, seen);
  }
  seen.delete(value);
}

function fingerprint(value: unknown, namespace: string) {
  return createGoldenBlindSha256DigestV3(value, namespace);
}

function canonicalJudgment(value: StayOptiGoldenBlindJudgmentV3) {
  return {
    ...value,
    reasonCodes: [...new Set(value.reasonCodes)].sort(compareStrings),
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function validateGoldenBlindJudgmentV3(
  value: unknown,
  tasks: readonly StayOptiGoldenBlindTaskV3[],
): StayOptiGoldenJudgmentValidationResultV3 {
  const issues: StayOptiGoldenJudgmentValidationIssueV3[] = [];
  scanSafety(value, "judgment", issues, new Set<object>());
  if (!isPlainRecord(value)) {
    pushIssue(issues, "JUDGMENT_FIELD_TYPE_INVALID", "judgment");
    return { valid: false, issues: sortedIssues(issues) };
  }
  const actualKeys = Object.keys(value).sort(compareStrings);
  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(value, key)) pushIssue(issues, "JUDGMENT_FIELD_MISSING", `judgment.${key}`);
  }
  for (const key of actualKeys) {
    if (!(REQUIRED_KEYS as readonly string[]).includes(key)) {
      pushIssue(issues, "JUDGMENT_UNEXPECTED_FIELD", `judgment.${key}`);
    }
  }
  if (value.judgmentSchemaVersion !== STAYOPTI_GOLDEN_JUDGMENT_SCHEMA_VERSION_V3) {
    pushIssue(issues, "JUDGMENT_SCHEMA_UNSUPPORTED", "judgment.judgmentSchemaVersion");
  }
  if (typeof value.judgmentId !== "string" || !OPAQUE_ID.test(value.judgmentId)) {
    pushIssue(issues, "JUDGMENT_FIELD_TYPE_INVALID", "judgment.judgmentId");
  }
  if (typeof value.batchId !== "string" || !OPAQUE_ID.test(value.batchId) ||
    typeof value.evaluationTaskId !== "string" || !OPAQUE_ID.test(value.evaluationTaskId)) {
    pushIssue(issues, "JUDGMENT_FIELD_TYPE_INVALID", "judgment.taskBinding");
  }
  const boundTask = tasks.find((task) => task.evaluationTaskId === value.evaluationTaskId);
  if (boundTask === undefined || boundTask.batchId !== value.batchId) {
    pushIssue(issues, "JUDGMENT_TASK_UNKNOWN", "judgment.evaluationTaskId");
  }
  if (typeof value.evaluatorPseudonym !== "string" || !OPAQUE_ID.test(value.evaluatorPseudonym)) {
    pushIssue(issues, "JUDGMENT_EVALUATOR_PSEUDONYM_INVALID", "judgment.evaluatorPseudonym");
  }
  if (value.evaluatorClass !== "HUMAN" && value.evaluatorClass !== "EXPERT") {
    pushIssue(issues, "JUDGMENT_EVALUATOR_CLASS_INVALID", "judgment.evaluatorClass");
  }
  if (!(STAYOPTI_GOLDEN_BLIND_CHOICES_V3 as readonly unknown[]).includes(value.choice)) {
    pushIssue(issues, "JUDGMENT_CHOICE_INVALID", "judgment.choice");
  }
  if (!Number.isInteger(value.confidence) || Number(value.confidence) < 1 || Number(value.confidence) > 5) {
    pushIssue(issues, "JUDGMENT_CONFIDENCE_INVALID", "judgment.confidence");
  }
  if (!Array.isArray(value.reasonCodes) || value.reasonCodes.length === 0 ||
    value.reasonCodes.some((reason) =>
      typeof reason !== "string" ||
      !(STAYOPTI_GOLDEN_BLIND_JUDGMENT_REASONS_V3 as readonly string[]).includes(reason)
    )) {
    pushIssue(issues, "JUDGMENT_REASON_UNKNOWN", "judgment.reasonCodes");
  }
  if (typeof value.durationBucket !== "string" || !BUCKET.test(value.durationBucket)) {
    pushIssue(issues, "JUDGMENT_FIELD_TYPE_INVALID", "judgment.durationBucket");
  }
  if (typeof value.consentVersion !== "string" || !VERSION.test(value.consentVersion)) {
    pushIssue(issues, "JUDGMENT_CONSENT_MISSING", "judgment.consentVersion");
  }
  if (typeof value.createdAtBucket !== "string" || !BUCKET.test(value.createdAtBucket)) {
    pushIssue(issues, "JUDGMENT_FIELD_TYPE_INVALID", "judgment.createdAtBucket");
  }
  if (typeof value.createdAtBucket === "string" && PRECISE_TIMESTAMP.test(value.createdAtBucket)) {
    pushIssue(issues, "JUDGMENT_PRECISE_TIMESTAMP_PROHIBITED", "judgment.createdAtBucket");
  }
  return { valid: issues.length === 0, issues: sortedIssues(issues) };
}

export function createEmptyGoldenJudgmentLedgerV3(
  batchId: string,
): StayOptiGoldenJudgmentLedgerV3 {
  if (!OPAQUE_ID.test(batchId)) throw new Error("Judgment ledger requires an opaque batch ID.");
  const body = {
    ledgerVersion: STAYOPTI_GOLDEN_JUDGMENT_LEDGER_VERSION_V3,
    batchId,
    judgments: [] as StayOptiGoldenBlindJudgmentV3[],
  };
  return deepFreeze({ ...body, fingerprint: fingerprint(body, "stayopti-golden-judgment-ledger") });
}

export function validateGoldenJudgmentLedgerV3(
  ledger: StayOptiGoldenJudgmentLedgerV3,
  tasks: readonly StayOptiGoldenBlindTaskV3[],
): StayOptiGoldenJudgmentValidationResultV3 {
  const issues: StayOptiGoldenJudgmentValidationIssueV3[] = [];
  if (ledger.ledgerVersion !== STAYOPTI_GOLDEN_JUDGMENT_LEDGER_VERSION_V3 ||
    !OPAQUE_ID.test(ledger.batchId) || !Array.isArray(ledger.judgments)) {
    pushIssue(issues, "JUDGMENT_FIELD_TYPE_INVALID", "ledger");
    return { valid: false, issues: sortedIssues(issues) };
  }
  const ids = new Set<string>();
  const evaluatorTasks = new Set<string>();
  for (let index = 0; index < ledger.judgments.length; index += 1) {
    const judgment = ledger.judgments[index];
    const result = validateGoldenBlindJudgmentV3(judgment, tasks);
    for (const issue of result.issues) {
      issues.push({ ...issue, path: `ledger.judgments[${index}].${issue.path}` });
    }
    if (ids.has(judgment.judgmentId)) {
      pushIssue(issues, "JUDGMENT_DUPLICATE_ID", `ledger.judgments[${index}].judgmentId`);
    }
    ids.add(judgment.judgmentId);
    const evaluatorTask = `${judgment.evaluatorPseudonym}\n${judgment.evaluationTaskId}`;
    if (evaluatorTasks.has(evaluatorTask)) {
      pushIssue(
        issues,
        "JUDGMENT_DUPLICATE_EVALUATOR_TASK",
        `ledger.judgments[${index}].evaluationTaskId`,
      );
    }
    evaluatorTasks.add(evaluatorTask);
    if (judgment.batchId !== ledger.batchId) {
      pushIssue(issues, "JUDGMENT_TASK_UNKNOWN", `ledger.judgments[${index}].batchId`);
    }
  }
  const body = {
    ledgerVersion: ledger.ledgerVersion,
    batchId: ledger.batchId,
    judgments: ledger.judgments.map(canonicalJudgment).sort((left, right) =>
      compareStrings(left.judgmentId, right.judgmentId)
    ),
  };
  if (ledger.fingerprint !== fingerprint(body, "stayopti-golden-judgment-ledger")) {
    pushIssue(issues, "JUDGMENT_OVERWRITE_PROHIBITED", "ledger.fingerprint");
  }
  return { valid: issues.length === 0, issues: sortedIssues(issues) };
}

export function appendGoldenBlindJudgmentV3(
  ledger: StayOptiGoldenJudgmentLedgerV3,
  judgmentValue: unknown,
  tasks: readonly StayOptiGoldenBlindTaskV3[],
): StayOptiGoldenJudgmentLedgerV3 {
  const ledgerValidation = validateGoldenJudgmentLedgerV3(ledger, tasks);
  if (!ledgerValidation.valid) throw new Error("Cannot append to an invalid or altered judgment ledger.");
  const validation = validateGoldenBlindJudgmentV3(judgmentValue, tasks);
  if (!validation.valid) {
    throw new Error(`Judgment rejected: ${validation.issues.map((issue) => issue.reasonCode).join(", ")}.`);
  }
  const judgment = canonicalJudgment(
    structuredClone(judgmentValue) as StayOptiGoldenBlindJudgmentV3,
  );
  if (ledger.judgments.some((item) => item.judgmentId === judgment.judgmentId)) {
    throw new Error("Judgment ID duplicate or overwrite prohibited.");
  }
  if (ledger.judgments.some((item) =>
    item.evaluationTaskId === judgment.evaluationTaskId &&
    item.evaluatorPseudonym === judgment.evaluatorPseudonym
  )) {
    throw new Error("An evaluator may judge a task only once.");
  }
  const judgments = [...ledger.judgments.map(canonicalJudgment), judgment]
    .sort((left, right) => compareStrings(left.judgmentId, right.judgmentId));
  const body = {
    ledgerVersion: STAYOPTI_GOLDEN_JUDGMENT_LEDGER_VERSION_V3,
    batchId: ledger.batchId,
    judgments,
  };
  return deepFreeze({ ...body, fingerprint: fingerprint(body, "stayopti-golden-judgment-ledger") });
}

export function createGoldenJudgmentLedgerFingerprintV3(
  ledger: Omit<StayOptiGoldenJudgmentLedgerV3, "fingerprint">,
) {
  return fingerprint(ledger, "stayopti-golden-judgment-ledger");
}
