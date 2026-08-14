import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import {
  SMARTSTAY_OUTCOME_DATA_LOOP_VERSION_V3,
  SMARTSTAY_OUTCOME_EVENT_SCHEMA_VERSION_V3,
} from "../contract/versionsV3";

export const STAYOPTI_OUTCOME_EVENT_NAMES_V3 = [
  "decision-shown",
  "choice-recorded",
  "recheck-recorded",
  "booking-attributed",
  "post-stay-feedback",
] as const;

export type StayOptiOutcomeEventNameV3 =
  typeof STAYOPTI_OUTCOME_EVENT_NAMES_V3[number];

export type StayOptiOutcomeConfidenceBandV3 =
  | "high"
  | "medium"
  | "low"
  | "unavailable";

export type StayOptiOutcomeCoverageStateV3 =
  | "complete-source-set"
  | "partial-source-set"
  | "current-analyzed-set";

export type StayOptiOutcomeSolutionKindV3 =
  | "single"
  | "split"
  | "none";

export interface StayOptiOutcomeConsentInputV3 {
  consentId: string;
  subjectToken: string;
  status: "granted" | "denied" | "withdrawn";
  recordedAt: string;
  expiresAt: string | null;
  doNotTrack: boolean;
  globalPrivacyControl: boolean;
}

export interface StayOptiOutcomeConsentStateV3
  extends StayOptiOutcomeConsentInputV3 {
  phase: "v3-09";
  purpose: "decision-outcome-learning";
  collectionAllowed: boolean;
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiDecisionShownPayloadV3 {
  decisionFingerprint: string;
  engineVersion: string;
  policyVersion: string;
  decisionSchemaVersion: string;
  evidenceSchemaVersion: string;
  decisionStatus: "recommended" | "abstained" | "no-feasible-solution";
  recommendedOptionToken: string | null;
  alternativeOptionTokens: string[];
  recommendationKind: StayOptiOutcomeSolutionKindV3;
  confidenceBand: StayOptiOutcomeConfidenceBandV3;
  coverageState: StayOptiOutcomeCoverageStateV3;
}

export type StayOptiDifferentChoiceReasonV3 =
  | "price"
  | "quality"
  | "location"
  | "room"
  | "flexibility"
  | "trust"
  | "other-enum"
  | "not-applicable";

export type StayOptiDecisionDurationBucketV3 =
  | "under-15s"
  | "15-60s"
  | "1-3m"
  | "3-10m"
  | "over-10m"
  | "unknown";

export interface StayOptiChoiceRecordedPayloadV3 {
  choiceOutcome:
    | "accepted-recommendation"
    | "different-option"
    | "abandoned";
  selectedOptionToken: string | null;
  differentChoiceReason: StayOptiDifferentChoiceReasonV3;
  timeToDecisionBucket: StayOptiDecisionDurationBucketV3;
}

export interface StayOptiRecheckRecordedPayloadV3 {
  optionToken: string | null;
  recheckState: "confirmed" | "changed" | "sold-out" | "not-run";
  handoffState: "not-started" | "prepared" | "opened" | "failed";
}

export interface StayOptiBookingAttributedPayloadV3 {
  attributionStatus: "attributed" | "not-attributed";
  optionToken: string | null;
  attributionConfidence: "deterministic" | "same-session" | "unavailable";
  recheckVerified: boolean;
}

export type StayOptiDeclaredRegretV3 =
  | "none"
  | "low"
  | "medium"
  | "high";

export type StayOptiRegretCauseV3 =
  | "none"
  | "price"
  | "quality"
  | "location"
  | "room"
  | "flexibility"
  | "service"
  | "switch-friction"
  | "other-enum";

export type StayOptiMainIssueV3 =
  | "none"
  | "price"
  | "quality"
  | "location"
  | "room"
  | "flexibility"
  | "service"
  | "handoff"
  | "switch-friction"
  | "other-enum";

export interface StayOptiPostStayFeedbackPayloadV3 {
  satisfaction: 1 | 2 | 3 | 4 | 5;
  wouldChooseSameAgain: boolean;
  declaredRegret: StayOptiDeclaredRegretV3;
  regretCause: StayOptiRegretCauseV3;
  mainIssue: StayOptiMainIssueV3;
  savingOutcome:
    | "saved-without-quality-loss"
    | "saved-with-quality-loss"
    | "no-saving"
    | "unknown";
  qualityPerEuroOutcome: "positive" | "neutral" | "negative" | "unknown";
  chosenSolutionKind: "single" | "split";
  splitFalsePositive: boolean | null;
  regretComparedToBestSingle: "lower" | "same" | "higher" | "unknown" | null;
}

interface StayOptiOutcomeEventBaseInputV3 {
  eventId: string;
  occurredAt: string;
  subjectToken: string;
  decisionLinkToken: string;
  consentId: string;
}

export type StayOptiOutcomeEventInputV3 =
  | (StayOptiOutcomeEventBaseInputV3 & {
      eventName: "decision-shown";
      payload: StayOptiDecisionShownPayloadV3;
    })
  | (StayOptiOutcomeEventBaseInputV3 & {
      eventName: "choice-recorded";
      payload: StayOptiChoiceRecordedPayloadV3;
    })
  | (StayOptiOutcomeEventBaseInputV3 & {
      eventName: "recheck-recorded";
      payload: StayOptiRecheckRecordedPayloadV3;
    })
  | (StayOptiOutcomeEventBaseInputV3 & {
      eventName: "booking-attributed";
      payload: StayOptiBookingAttributedPayloadV3;
    })
  | (StayOptiOutcomeEventBaseInputV3 & {
      eventName: "post-stay-feedback";
      payload: StayOptiPostStayFeedbackPayloadV3;
    });

interface StayOptiOutcomeEventEnvelopeV3 {
  schemaVersion: typeof SMARTSTAY_OUTCOME_EVENT_SCHEMA_VERSION_V3;
  dataClassification: "pseudonymous";
  eventId: string;
  occurredAt: string;
  subjectToken: string;
  decisionLinkToken: string;
  consentId: string;
  fingerprint: string;
}

export type StayOptiOutcomeEventV3 =
  | (StayOptiOutcomeEventEnvelopeV3 & {
      eventName: "decision-shown";
      payload: StayOptiDecisionShownPayloadV3;
    })
  | (StayOptiOutcomeEventEnvelopeV3 & {
      eventName: "choice-recorded";
      payload: StayOptiChoiceRecordedPayloadV3;
    })
  | (StayOptiOutcomeEventEnvelopeV3 & {
      eventName: "recheck-recorded";
      payload: StayOptiRecheckRecordedPayloadV3;
    })
  | (StayOptiOutcomeEventEnvelopeV3 & {
      eventName: "booking-attributed";
      payload: StayOptiBookingAttributedPayloadV3;
    })
  | (StayOptiOutcomeEventEnvelopeV3 & {
      eventName: "post-stay-feedback";
      payload: StayOptiPostStayFeedbackPayloadV3;
    });

export interface StayOptiOutcomeDataLoopPlanV3 {
  evaluationId: string;
  phase: "v3-09";
  version: typeof SMARTSTAY_OUTCOME_DATA_LOOP_VERSION_V3;
  eventSchemaVersion: typeof SMARTSTAY_OUTCOME_EVENT_SCHEMA_VERSION_V3;
  sourceDecisionInputFingerprint: string;
  collectionApplication: "disabled-by-default";
  runtimeApplication: "contract-only";
  publicPresentation: "disabled";
  consentPolicy: {
    explicitConsentRequired: true;
    doNotTrackBlocksCollection: true;
    globalPrivacyControlBlocksCollection: true;
    withdrawalStopsCollection: true;
  };
  privacyPolicy: {
    pseudonymousOnly: true;
    piiAllowed: false;
    crossSessionTracking: false;
    rawEventRetentionDays: 30;
    aggregateRetentionDays: 180;
    deletionMode: "subject-token-cascade";
  };
  attributionPolicy: {
    mode: "consented-decision-link-token";
    rawBookingReferenceAllowed: false;
    rawProviderReferenceAllowed: false;
    measurementStatus: "schema-and-tests-ready";
  };
  learningPolicy: {
    productionSelfModificationAllowed: false;
    candidateGeneration: "offline-only";
    promotionPath: readonly [
      "offline-evaluation",
      "shadow",
      "controlled-promotion",
    ];
    canaryRequired: true;
    rollbackRequired: true;
    policyVersionAuditRequired: true;
  };
  eventFlow: readonly [
    "decision-shown",
    "choice-recorded",
    "recheck-recorded",
    "booking-attributed",
    "post-stay-feedback",
  ];
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiOutcomeEventValidationV3 {
  valid: boolean;
  issues: Array<
    | "invalid-shape"
    | "invalid-consent"
    | "privacy-signal-blocked"
    | "pii-detected"
    | "fingerprint-mismatch"
  >;
}

export interface StayOptiOfflineOutcomeRecordV3 {
  decisionKey: string;
  decisionFingerprint: string;
  policyVersion: string;
  recommendationKind: StayOptiOutcomeSolutionKindV3;
  confidenceBand: StayOptiOutcomeConfidenceBandV3;
  coverageState: StayOptiOutcomeCoverageStateV3;
  choiceOutcome:
    | "accepted-recommendation"
    | "different-option"
    | "abandoned"
    | "not-observed";
  differentChoiceReason: StayOptiDifferentChoiceReasonV3;
  timeToDecisionBucket: StayOptiDecisionDurationBucketV3;
  recheckState: StayOptiRecheckRecordedPayloadV3["recheckState"] | "not-observed";
  handoffState: StayOptiRecheckRecordedPayloadV3["handoffState"] | "not-observed";
  bookingAttribution: StayOptiBookingAttributedPayloadV3["attributionStatus"] | "not-observed";
  satisfaction: 1 | 2 | 3 | 4 | 5 | null;
  wouldChooseSameAgain: boolean | null;
  declaredRegret: StayOptiDeclaredRegretV3 | "not-observed";
  regretCause: StayOptiRegretCauseV3 | "not-observed";
  mainIssue: StayOptiMainIssueV3 | "not-observed";
  savingOutcome: StayOptiPostStayFeedbackPayloadV3["savingOutcome"] | "not-observed";
  qualityPerEuroOutcome: StayOptiPostStayFeedbackPayloadV3["qualityPerEuroOutcome"] | "not-observed";
  chosenSolutionKind: "single" | "split" | "not-observed";
  splitFalsePositive: boolean | null;
  regretComparedToBestSingle: StayOptiPostStayFeedbackPayloadV3["regretComparedToBestSingle"];
  outcomeComplete: boolean;
}

export interface StayOptiOfflineOutcomeDatasetV3 {
  datasetVersion: "3.0.0-outcome-dataset.1";
  status: "ready" | "empty";
  dataClassification: "pseudonymized-offline";
  sourceEventCount: number;
  consentedEventCount: number;
  records: StayOptiOfflineOutcomeRecordV3[];
  metrics: {
    decisionCount: number;
    recommendationAcceptedCount: number;
    differentChoiceCount: number;
    abandonmentCount: number;
    attributedBookingCount: number;
    postStayFeedbackCount: number;
    wouldChooseSameAgainCount: number;
    declaredRegretCount: number;
    savedWithoutQualityLossCount: number;
    splitOutcomeCount: number;
    splitFalsePositiveCount: number;
  };
  learningSafety: {
    productionPolicyMutationAllowed: false;
    candidateDestination: "offline-evaluation-only";
    promotionPath: readonly [
      "offline-evaluation",
      "shadow",
      "controlled-promotion",
    ];
  };
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiOutcomeDeletionReceiptV3 {
  receiptVersion: "3.0.0-outcome-deletion.1";
  receiptId: string;
  requestedAt: string;
  subjectTokenHash: string;
  status: "deleted" | "not-found";
  deletedEventCount: number;
  deletedDecisionCount: number;
  retainedEventCount: number;
  deletionScope: readonly ["raw-outcome-events"];
  pseudonymousDatasetRebuildRequired: true;
  fingerprint: string;
}

const EVENT_NAMES = new Set<string>(STAYOPTI_OUTCOME_EVENT_NAMES_V3);
const VERSION_PATTERN = /^3\.0\.0-[a-z0-9.-]+$/;
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /^\+?(?:\d[\s().-]*){7,15}$/;

const PII_FIELD_KEYS = new Set([
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "firstname",
  "lastname",
  "fullname",
  "address",
  "postaladdress",
  "ip",
  "ipaddress",
  "useragent",
  "passport",
  "passportnumber",
  "identitydocument",
]);

function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: unknown, keys: readonly string[]) {
  return isPlainObject(value) &&
    stableSerializeV3(Object.keys(value).sort()) ===
      stableSerializeV3([...keys].sort());
}

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isOpaqueToken(value: unknown): value is string {
  return typeof value === "string" &&
    OPAQUE_TOKEN_PATTERN.test(value) &&
    !EMAIL_PATTERN.test(value) &&
    !PHONE_PATTERN.test(value);
}

function isEnumValue(value: unknown, values: readonly string[]) {
  return typeof value === "string" && values.includes(value);
}

export function findOutcomePiiViolationsV3(value: unknown) {
  const violations: string[] = [];
  const visited = new Set<object>();

  function visit(current: unknown, path: string) {
    if (typeof current === "string") {
      if (EMAIL_PATTERN.test(current)) {
        violations.push(path || "value");
      }
      return;
    }

    if (current === null || typeof current !== "object" || visited.has(current)) {
      return;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, nested] of Object.entries(current)) {
      const nestedPath = path ? `${path}.${key}` : key;
      if (PII_FIELD_KEYS.has(normalizeFieldKey(key))) {
        violations.push(nestedPath);
      }
      visit(nested, nestedPath);
    }
  }

  visit(value, "");
  return [...new Set(violations)].sort();
}

function withoutFingerprint<T extends { fingerprint: string }>(value: T) {
  const { fingerprint: _fingerprint, ...rest } = value;
  return rest;
}

function validateConsentInput(input: StayOptiOutcomeConsentInputV3) {
  if (
    !hasExactKeys(input, [
      "consentId",
      "subjectToken",
      "status",
      "recordedAt",
      "expiresAt",
      "doNotTrack",
      "globalPrivacyControl",
    ]) ||
    !isOpaqueToken(input.consentId) ||
    !isOpaqueToken(input.subjectToken) ||
    !isEnumValue(input.status, ["granted", "denied", "withdrawn"]) ||
    !isIsoInstant(input.recordedAt) ||
    (input.expiresAt !== null && !isIsoInstant(input.expiresAt)) ||
    typeof input.doNotTrack !== "boolean" ||
    typeof input.globalPrivacyControl !== "boolean"
  ) {
    throw new Error("Invalid V3-09 outcome consent input.");
  }

  if (
    input.expiresAt !== null &&
    Date.parse(input.expiresAt) <= Date.parse(input.recordedAt)
  ) {
    throw new Error("Outcome consent expiry must follow its recorded time.");
  }
}

export function createOutcomeConsentStateV3(
  input: StayOptiOutcomeConsentInputV3
): StayOptiOutcomeConsentStateV3 {
  validateConsentInput(input);

  const privacyBlocked = input.doNotTrack || input.globalPrivacyControl;
  const collectionAllowed = input.status === "granted" && !privacyBlocked;
  const reasonCodes = uniqueReasonCodesV3([
    "outcome:consent-required",
    "outcome:pseudonymous-only",
    collectionAllowed ? "outcome:consent-valid" : "outcome:consent-denied",
    ...(privacyBlocked
      ? ["outcome:privacy-signal-blocked" as const]
      : []),
  ]);

  const stateWithoutFingerprint = {
    ...input,
    phase: "v3-09" as const,
    purpose: "decision-outcome-learning" as const,
    collectionAllowed,
    reasonCodes,
  };

  return {
    ...stateWithoutFingerprint,
    fingerprint: createStableHashV3(
      stateWithoutFingerprint,
      "stayopti-v3-outcome-consent"
    ),
  };
}

export function validateOutcomeConsentStateV3(
  state: StayOptiOutcomeConsentStateV3
) {
  try {
    const expected = createOutcomeConsentStateV3({
      consentId: state.consentId,
      subjectToken: state.subjectToken,
      status: state.status,
      recordedAt: state.recordedAt,
      expiresAt: state.expiresAt,
      doNotTrack: state.doNotTrack,
      globalPrivacyControl: state.globalPrivacyControl,
    });

    return {
      valid: stableSerializeV3(state) === stableSerializeV3(expected),
      issues: stableSerializeV3(state) === stableSerializeV3(expected)
        ? []
        : ["deterministic-replay-mismatch" as const],
    };
  }
  catch {
    return {
      valid: false,
      issues: ["invalid-shape" as const],
    };
  }
}

export function createOutcomeDataLoopPlanV3(input: {
  sourceDecisionInputFingerprint: string;
}): StayOptiOutcomeDataLoopPlanV3 {
  if (!isStableHashV3(input.sourceDecisionInputFingerprint)) {
    throw new Error("V3-09 Outcome Data Loop requires a stable decision input fingerprint.");
  }

  const planWithoutFingerprint = {
    evaluationId: createStableHashV3(
      {
        version: SMARTSTAY_OUTCOME_DATA_LOOP_VERSION_V3,
        sourceDecisionInputFingerprint: input.sourceDecisionInputFingerprint,
      },
      "stayopti-v3-outcome-plan-id"
    ),
    phase: "v3-09" as const,
    version: SMARTSTAY_OUTCOME_DATA_LOOP_VERSION_V3,
    eventSchemaVersion: SMARTSTAY_OUTCOME_EVENT_SCHEMA_VERSION_V3,
    sourceDecisionInputFingerprint: input.sourceDecisionInputFingerprint,
    collectionApplication: "disabled-by-default" as const,
    runtimeApplication: "contract-only" as const,
    publicPresentation: "disabled" as const,
    consentPolicy: {
      explicitConsentRequired: true as const,
      doNotTrackBlocksCollection: true as const,
      globalPrivacyControlBlocksCollection: true as const,
      withdrawalStopsCollection: true as const,
    },
    privacyPolicy: {
      pseudonymousOnly: true as const,
      piiAllowed: false as const,
      crossSessionTracking: false as const,
      rawEventRetentionDays: 30 as const,
      aggregateRetentionDays: 180 as const,
      deletionMode: "subject-token-cascade" as const,
    },
    attributionPolicy: {
      mode: "consented-decision-link-token" as const,
      rawBookingReferenceAllowed: false as const,
      rawProviderReferenceAllowed: false as const,
      measurementStatus: "schema-and-tests-ready" as const,
    },
    learningPolicy: {
      productionSelfModificationAllowed: false as const,
      candidateGeneration: "offline-only" as const,
      promotionPath: [
        "offline-evaluation",
        "shadow",
        "controlled-promotion",
      ] as const,
      canaryRequired: true as const,
      rollbackRequired: true as const,
      policyVersionAuditRequired: true as const,
    },
    eventFlow: [...STAYOPTI_OUTCOME_EVENT_NAMES_V3] as [
      "decision-shown",
      "choice-recorded",
      "recheck-recorded",
      "booking-attributed",
      "post-stay-feedback",
    ],
    reasonCodes: uniqueReasonCodesV3([
      "outcome:schema-versioned",
      "outcome:collection-disabled-default",
      "outcome:consent-required",
      "outcome:pseudonymous-only",
      "outcome:attribution-measured",
      "outcome:retention-enforced",
      "outcome:deletion-tested",
      "outcome:offline-only",
      "outcome:no-production-self-modification",
      "outcome:shadow-promotion-required",
      "outcome:trace-pii-free",
    ]),
  };

  return {
    ...planWithoutFingerprint,
    fingerprint: createStableHashV3(
      planWithoutFingerprint,
      "stayopti-v3-outcome-plan"
    ),
  };
}

export function validateOutcomeDataLoopPlanV3(
  plan: StayOptiOutcomeDataLoopPlanV3
) {
  try {
    const expected = createOutcomeDataLoopPlanV3({
      sourceDecisionInputFingerprint: plan.sourceDecisionInputFingerprint,
    });
    const replayMatches = stableSerializeV3(plan) === stableSerializeV3(expected);
    const piiFree = findOutcomePiiViolationsV3(plan).length === 0;

    return {
      valid: replayMatches && piiFree,
      issues: [
        ...(!replayMatches ? ["deterministic-replay-mismatch" as const] : []),
        ...(!piiFree ? ["pii-detected" as const] : []),
      ],
    };
  }
  catch {
    return {
      valid: false,
      issues: ["invalid-shape" as const],
    };
  }
}

function validateDecisionShownPayload(payload: StayOptiDecisionShownPayloadV3) {
  if (
    !hasExactKeys(payload, [
      "decisionFingerprint",
      "engineVersion",
      "policyVersion",
      "decisionSchemaVersion",
      "evidenceSchemaVersion",
      "decisionStatus",
      "recommendedOptionToken",
      "alternativeOptionTokens",
      "recommendationKind",
      "confidenceBand",
      "coverageState",
    ]) ||
    !isStableHashV3(payload.decisionFingerprint) ||
    !VERSION_PATTERN.test(payload.engineVersion) ||
    !VERSION_PATTERN.test(payload.policyVersion) ||
    !VERSION_PATTERN.test(payload.decisionSchemaVersion) ||
    !VERSION_PATTERN.test(payload.evidenceSchemaVersion) ||
    !isEnumValue(payload.decisionStatus, [
      "recommended",
      "abstained",
      "no-feasible-solution",
    ]) ||
    (payload.recommendedOptionToken !== null &&
      !isOpaqueToken(payload.recommendedOptionToken)) ||
    !Array.isArray(payload.alternativeOptionTokens) ||
    payload.alternativeOptionTokens.length > 4 ||
    payload.alternativeOptionTokens.some((token) => !isOpaqueToken(token)) ||
    new Set(payload.alternativeOptionTokens).size !== payload.alternativeOptionTokens.length ||
    (payload.recommendedOptionToken !== null &&
      payload.alternativeOptionTokens.includes(payload.recommendedOptionToken)) ||
    !isEnumValue(payload.recommendationKind, ["single", "split", "none"]) ||
    !isEnumValue(payload.confidenceBand, ["high", "medium", "low", "unavailable"]) ||
    !isEnumValue(payload.coverageState, [
      "complete-source-set",
      "partial-source-set",
      "current-analyzed-set",
    ])
  ) {
    throw new Error("Invalid decision-shown outcome payload.");
  }

  if (
    payload.decisionStatus === "recommended"
      ? payload.recommendedOptionToken === null || payload.recommendationKind === "none"
      : payload.recommendedOptionToken !== null || payload.recommendationKind !== "none"
  ) {
    throw new Error("Decision status and recommendation fields are inconsistent.");
  }
}

function validateChoicePayload(payload: StayOptiChoiceRecordedPayloadV3) {
  if (
    !hasExactKeys(payload, [
      "choiceOutcome",
      "selectedOptionToken",
      "differentChoiceReason",
      "timeToDecisionBucket",
    ]) ||
    !isEnumValue(payload.choiceOutcome, [
      "accepted-recommendation",
      "different-option",
      "abandoned",
    ]) ||
    (payload.selectedOptionToken !== null && !isOpaqueToken(payload.selectedOptionToken)) ||
    !isEnumValue(payload.differentChoiceReason, [
      "price",
      "quality",
      "location",
      "room",
      "flexibility",
      "trust",
      "other-enum",
      "not-applicable",
    ]) ||
    !isEnumValue(payload.timeToDecisionBucket, [
      "under-15s",
      "15-60s",
      "1-3m",
      "3-10m",
      "over-10m",
      "unknown",
    ])
  ) {
    throw new Error("Invalid choice-recorded outcome payload.");
  }

  const validChoiceShape =
    payload.choiceOutcome === "accepted-recommendation"
      ? payload.selectedOptionToken !== null &&
        payload.differentChoiceReason === "not-applicable"
      : payload.choiceOutcome === "different-option"
        ? payload.selectedOptionToken !== null &&
          payload.differentChoiceReason !== "not-applicable"
        : payload.selectedOptionToken === null &&
          payload.differentChoiceReason === "not-applicable";

  if (!validChoiceShape) {
    throw new Error("Choice outcome and selected option fields are inconsistent.");
  }
}

function validateRecheckPayload(payload: StayOptiRecheckRecordedPayloadV3) {
  if (
    !hasExactKeys(payload, ["optionToken", "recheckState", "handoffState"]) ||
    (payload.optionToken !== null && !isOpaqueToken(payload.optionToken)) ||
    !isEnumValue(payload.recheckState, ["confirmed", "changed", "sold-out", "not-run"]) ||
    !isEnumValue(payload.handoffState, ["not-started", "prepared", "opened", "failed"]) ||
    (payload.recheckState === "not-run"
      ? payload.optionToken !== null || payload.handoffState !== "not-started"
      : payload.optionToken === null)
  ) {
    throw new Error("Invalid recheck-recorded outcome payload.");
  }
}

function validateBookingPayload(payload: StayOptiBookingAttributedPayloadV3) {
  if (
    !hasExactKeys(payload, [
      "attributionStatus",
      "optionToken",
      "attributionConfidence",
      "recheckVerified",
    ]) ||
    !isEnumValue(payload.attributionStatus, ["attributed", "not-attributed"]) ||
    (payload.optionToken !== null && !isOpaqueToken(payload.optionToken)) ||
    !isEnumValue(payload.attributionConfidence, [
      "deterministic",
      "same-session",
      "unavailable",
    ]) ||
    typeof payload.recheckVerified !== "boolean"
  ) {
    throw new Error("Invalid booking-attributed outcome payload.");
  }

  if (
    payload.attributionStatus === "attributed"
      ? payload.optionToken === null || payload.attributionConfidence === "unavailable"
      : payload.optionToken !== null ||
        payload.attributionConfidence !== "unavailable" ||
        payload.recheckVerified
  ) {
    throw new Error("Booking attribution fields are inconsistent.");
  }
}

function validatePostStayPayload(payload: StayOptiPostStayFeedbackPayloadV3) {
  if (
    !hasExactKeys(payload, [
      "satisfaction",
      "wouldChooseSameAgain",
      "declaredRegret",
      "regretCause",
      "mainIssue",
      "savingOutcome",
      "qualityPerEuroOutcome",
      "chosenSolutionKind",
      "splitFalsePositive",
      "regretComparedToBestSingle",
    ]) ||
    !Number.isInteger(payload.satisfaction) ||
    payload.satisfaction < 1 ||
    payload.satisfaction > 5 ||
    typeof payload.wouldChooseSameAgain !== "boolean" ||
    !isEnumValue(payload.declaredRegret, ["none", "low", "medium", "high"]) ||
    !isEnumValue(payload.regretCause, [
      "none",
      "price",
      "quality",
      "location",
      "room",
      "flexibility",
      "service",
      "switch-friction",
      "other-enum",
    ]) ||
    !isEnumValue(payload.mainIssue, [
      "none",
      "price",
      "quality",
      "location",
      "room",
      "flexibility",
      "service",
      "handoff",
      "switch-friction",
      "other-enum",
    ]) ||
    !isEnumValue(payload.savingOutcome, [
      "saved-without-quality-loss",
      "saved-with-quality-loss",
      "no-saving",
      "unknown",
    ]) ||
    !isEnumValue(payload.qualityPerEuroOutcome, ["positive", "neutral", "negative", "unknown"]) ||
    !isEnumValue(payload.chosenSolutionKind, ["single", "split"]) ||
    (payload.splitFalsePositive !== null && typeof payload.splitFalsePositive !== "boolean") ||
    (payload.regretComparedToBestSingle !== null &&
      !isEnumValue(payload.regretComparedToBestSingle, ["lower", "same", "higher", "unknown"]))
  ) {
    throw new Error("Invalid post-stay-feedback outcome payload.");
  }

  if (
    (payload.declaredRegret === "none") !== (payload.regretCause === "none") ||
    (payload.chosenSolutionKind === "single"
      ? payload.splitFalsePositive !== null || payload.regretComparedToBestSingle !== null
      : payload.regretComparedToBestSingle === null)
  ) {
    throw new Error("Post-stay regret or split fields are inconsistent.");
  }
}

function validatePayload(
  eventName: StayOptiOutcomeEventNameV3,
  payload: StayOptiOutcomeEventV3["payload"]
) {
  switch (eventName) {
    case "decision-shown":
      validateDecisionShownPayload(payload as StayOptiDecisionShownPayloadV3);
      return;
    case "choice-recorded":
      validateChoicePayload(payload as StayOptiChoiceRecordedPayloadV3);
      return;
    case "recheck-recorded":
      validateRecheckPayload(payload as StayOptiRecheckRecordedPayloadV3);
      return;
    case "booking-attributed":
      validateBookingPayload(payload as StayOptiBookingAttributedPayloadV3);
      return;
    case "post-stay-feedback":
      validatePostStayPayload(payload as StayOptiPostStayFeedbackPayloadV3);
      return;
  }
}

export function createOutcomeEventV3(
  input: StayOptiOutcomeEventInputV3
): StayOptiOutcomeEventV3 {
  if (
    !hasExactKeys(input, [
      "eventId",
      "eventName",
      "occurredAt",
      "subjectToken",
      "decisionLinkToken",
      "consentId",
      "payload",
    ]) ||
    !isOpaqueToken(input.eventId) ||
    !EVENT_NAMES.has(input.eventName) ||
    !isIsoInstant(input.occurredAt) ||
    !isOpaqueToken(input.subjectToken) ||
    !isOpaqueToken(input.decisionLinkToken) ||
    !isOpaqueToken(input.consentId)
  ) {
    throw new Error("Invalid V3-09 outcome event envelope.");
  }

  validatePayload(input.eventName, input.payload);

  if (findOutcomePiiViolationsV3(input).length > 0) {
    throw new Error("V3-09 outcome event contains PII.");
  }

  const eventWithoutFingerprint = {
    schemaVersion: SMARTSTAY_OUTCOME_EVENT_SCHEMA_VERSION_V3,
    dataClassification: "pseudonymous" as const,
    ...input,
  };

  return {
    ...eventWithoutFingerprint,
    fingerprint: createStableHashV3(
      eventWithoutFingerprint,
      "stayopti-v3-outcome-event"
    ),
  } as StayOptiOutcomeEventV3;
}

export function validateOutcomeEventV3(
  event: StayOptiOutcomeEventV3,
  consent?: StayOptiOutcomeConsentStateV3
): StayOptiOutcomeEventValidationV3 {
  const issues: StayOptiOutcomeEventValidationV3["issues"] = [];

  try {
    if (
      !hasExactKeys(event, [
        "schemaVersion",
        "dataClassification",
        "eventId",
        "eventName",
        "occurredAt",
        "subjectToken",
        "decisionLinkToken",
        "consentId",
        "payload",
        "fingerprint",
      ]) ||
      event.schemaVersion !== SMARTSTAY_OUTCOME_EVENT_SCHEMA_VERSION_V3 ||
      event.dataClassification !== "pseudonymous"
    ) {
      issues.push("invalid-shape");
    }

    const recreated = createOutcomeEventV3({
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      subjectToken: event.subjectToken,
      decisionLinkToken: event.decisionLinkToken,
      consentId: event.consentId,
      payload: event.payload,
    } as StayOptiOutcomeEventInputV3);

    if (event.fingerprint !== recreated.fingerprint) {
      issues.push("fingerprint-mismatch");
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message.includes("PII") ? "pii-detected" : "invalid-shape");
  }

  if (findOutcomePiiViolationsV3(event).length > 0) {
    issues.push("pii-detected");
  }

  if (consent !== undefined) {
    const consentValid = validateOutcomeConsentStateV3(consent).valid;
    const eventTime = Date.parse(event.occurredAt);
    const consentTime = Date.parse(consent.recordedAt);
    const expiryTime = consent.expiresAt === null ? null : Date.parse(consent.expiresAt);
    const identityMatches = consent.consentId === event.consentId &&
      consent.subjectToken === event.subjectToken;

    if (
      !consentValid ||
      !identityMatches ||
      !consent.collectionAllowed ||
      eventTime < consentTime ||
      (expiryTime !== null && eventTime > expiryTime)
    ) {
      issues.push("invalid-consent");
    }

    if (consent.doNotTrack || consent.globalPrivacyControl) {
      issues.push("privacy-signal-blocked");
    }
  }

  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

export function assertOutcomeEventV3(
  event: StayOptiOutcomeEventV3,
  consent: StayOptiOutcomeConsentStateV3
) {
  const validation = validateOutcomeEventV3(event, consent);
  if (!validation.valid) {
    throw new Error(`Invalid V3-09 outcome event: ${validation.issues.join(", ")}.`);
  }
  return event;
}

function sortEvents(events: readonly StayOptiOutcomeEventV3[]) {
  return [...events].sort(
    (first, second) =>
      first.occurredAt.localeCompare(second.occurredAt) ||
      first.eventId.localeCompare(second.eventId)
  );
}

function createOfflineRecord(events: StayOptiOutcomeEventV3[]) {
  const shown = events.find((event) => event.eventName === "decision-shown");
  if (shown === undefined || shown.eventName !== "decision-shown") {
    throw new Error("Every outcome sequence requires exactly one decision-shown event.");
  }

  const choice = events.find((event) => event.eventName === "choice-recorded");
  const recheck = events.find((event) => event.eventName === "recheck-recorded");
  const booking = events.find((event) => event.eventName === "booking-attributed");
  const feedback = events.find((event) => event.eventName === "post-stay-feedback");

  return {
    decisionKey: createStableHashV3(shown.decisionLinkToken, "stayopti-v3-outcome-decision-key"),
    decisionFingerprint: shown.payload.decisionFingerprint,
    policyVersion: shown.payload.policyVersion,
    recommendationKind: shown.payload.recommendationKind,
    confidenceBand: shown.payload.confidenceBand,
    coverageState: shown.payload.coverageState,
    choiceOutcome:
      choice?.eventName === "choice-recorded" ? choice.payload.choiceOutcome : "not-observed",
    differentChoiceReason:
      choice?.eventName === "choice-recorded"
        ? choice.payload.differentChoiceReason
        : "not-applicable",
    timeToDecisionBucket:
      choice?.eventName === "choice-recorded"
        ? choice.payload.timeToDecisionBucket
        : "unknown",
    recheckState:
      recheck?.eventName === "recheck-recorded" ? recheck.payload.recheckState : "not-observed",
    handoffState:
      recheck?.eventName === "recheck-recorded" ? recheck.payload.handoffState : "not-observed",
    bookingAttribution:
      booking?.eventName === "booking-attributed"
        ? booking.payload.attributionStatus
        : "not-observed",
    satisfaction:
      feedback?.eventName === "post-stay-feedback" ? feedback.payload.satisfaction : null,
    wouldChooseSameAgain:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.wouldChooseSameAgain
        : null,
    declaredRegret:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.declaredRegret
        : "not-observed",
    regretCause:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.regretCause
        : "not-observed",
    mainIssue:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.mainIssue
        : "not-observed",
    savingOutcome:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.savingOutcome
        : "not-observed",
    qualityPerEuroOutcome:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.qualityPerEuroOutcome
        : "not-observed",
    chosenSolutionKind:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.chosenSolutionKind
        : "not-observed",
    splitFalsePositive:
      feedback?.eventName === "post-stay-feedback" ? feedback.payload.splitFalsePositive : null,
    regretComparedToBestSingle:
      feedback?.eventName === "post-stay-feedback"
        ? feedback.payload.regretComparedToBestSingle
        : null,
    outcomeComplete:
      choice?.eventName === "choice-recorded" &&
      feedback?.eventName === "post-stay-feedback",
  } satisfies StayOptiOfflineOutcomeRecordV3;
}

function assertValidSequence(events: StayOptiOutcomeEventV3[]) {
  const counts = new Map<StayOptiOutcomeEventNameV3, number>();
  events.forEach((event) => counts.set(event.eventName, (counts.get(event.eventName) ?? 0) + 1));

  if ((counts.get("decision-shown") ?? 0) !== 1) {
    throw new Error("Each outcome sequence requires exactly one decision-shown event.");
  }

  for (const eventName of STAYOPTI_OUTCOME_EVENT_NAMES_V3.slice(1)) {
    if ((counts.get(eventName) ?? 0) > 1) {
      throw new Error(`Outcome sequence contains duplicate ${eventName} events.`);
    }
  }

  const sorted = sortEvents(events);
  if (sorted[0]?.eventName !== "decision-shown") {
    throw new Error("Outcome event ordering must start with decision-shown.");
  }

  const choiceIndex = sorted.findIndex((event) => event.eventName === "choice-recorded");
  for (const eventName of ["recheck-recorded", "booking-attributed", "post-stay-feedback"] as const) {
    const index = sorted.findIndex((event) => event.eventName === eventName);
    if (index >= 0 && (choiceIndex < 0 || index < choiceIndex)) {
      throw new Error(`${eventName} requires a prior choice-recorded event.`);
    }
  }

  if (new Set(events.map((event) => event.subjectToken)).size !== 1) {
    throw new Error("Outcome sequence cannot mix pseudonymous subjects.");
  }
}

export function buildOfflineOutcomeDatasetV3(input: {
  events: readonly StayOptiOutcomeEventV3[];
  consents: readonly StayOptiOutcomeConsentStateV3[];
}): StayOptiOfflineOutcomeDatasetV3 {
  const consentById = new Map<string, StayOptiOutcomeConsentStateV3>();
  for (const consent of input.consents) {
    if (consentById.has(consent.consentId) || !validateOutcomeConsentStateV3(consent).valid) {
      throw new Error("Outcome dataset requires unique valid consent records.");
    }
    consentById.set(consent.consentId, consent);
  }

  const eventIds = new Set<string>();
  const sequences = new Map<string, StayOptiOutcomeEventV3[]>();
  for (const event of input.events) {
    const consent = consentById.get(event.consentId);
    if (consent === undefined || !validateOutcomeEventV3(event, consent).valid) {
      throw new Error(`Outcome dataset rejected invalid or unconsented event ${event.eventId}.`);
    }
    if (eventIds.has(event.eventId)) {
      throw new Error("Outcome dataset event IDs must be unique.");
    }
    eventIds.add(event.eventId);
    const sequence = sequences.get(event.decisionLinkToken) ?? [];
    sequence.push(event);
    sequences.set(event.decisionLinkToken, sequence);
  }

  const records = [...sequences.values()]
    .map((events) => {
      assertValidSequence(events);
      return createOfflineRecord(sortEvents(events));
    })
    .sort((first, second) => first.decisionKey.localeCompare(second.decisionKey));

  const metrics = {
    decisionCount: records.length,
    recommendationAcceptedCount: records.filter(
      (record) => record.choiceOutcome === "accepted-recommendation"
    ).length,
    differentChoiceCount: records.filter(
      (record) => record.choiceOutcome === "different-option"
    ).length,
    abandonmentCount: records.filter((record) => record.choiceOutcome === "abandoned").length,
    attributedBookingCount: records.filter(
      (record) => record.bookingAttribution === "attributed"
    ).length,
    postStayFeedbackCount: records.filter((record) => record.satisfaction !== null).length,
    wouldChooseSameAgainCount: records.filter(
      (record) => record.wouldChooseSameAgain === true
    ).length,
    declaredRegretCount: records.filter(
      (record) =>
        record.declaredRegret !== "not-observed" && record.declaredRegret !== "none"
    ).length,
    savedWithoutQualityLossCount: records.filter(
      (record) => record.savingOutcome === "saved-without-quality-loss"
    ).length,
    splitOutcomeCount: records.filter((record) => record.chosenSolutionKind === "split").length,
    splitFalsePositiveCount: records.filter((record) => record.splitFalsePositive === true).length,
  };

  const datasetWithoutFingerprint = {
    datasetVersion: "3.0.0-outcome-dataset.1" as const,
    status: records.length > 0 ? "ready" as const : "empty" as const,
    dataClassification: "pseudonymized-offline" as const,
    sourceEventCount: input.events.length,
    consentedEventCount: input.events.length,
    records,
    metrics,
    learningSafety: {
      productionPolicyMutationAllowed: false as const,
      candidateDestination: "offline-evaluation-only" as const,
      promotionPath: [
        "offline-evaluation",
        "shadow",
        "controlled-promotion",
      ] as const,
    },
    reasonCodes: uniqueReasonCodesV3([
      "outcome:offline-dataset-ready",
      "outcome:offline-only",
      "outcome:no-production-self-modification",
      "outcome:shadow-promotion-required",
      "outcome:attribution-measured",
      "outcome:pseudonymous-only",
    ]),
  };

  return {
    ...datasetWithoutFingerprint,
    fingerprint: createStableHashV3(
      datasetWithoutFingerprint,
      "stayopti-v3-offline-outcome-dataset"
    ),
  };
}

export function validateOfflineOutcomeDatasetV3(
  dataset: StayOptiOfflineOutcomeDatasetV3
) {
  const expectedFingerprint = createStableHashV3(
    withoutFingerprint(dataset),
    "stayopti-v3-offline-outcome-dataset"
  );
  const safetyValid = dataset.learningSafety.productionPolicyMutationAllowed === false &&
    dataset.learningSafety.candidateDestination === "offline-evaluation-only" &&
    stableSerializeV3(dataset.learningSafety.promotionPath) ===
      stableSerializeV3(["offline-evaluation", "shadow", "controlled-promotion"]);
  const piiFree = findOutcomePiiViolationsV3(dataset).length === 0;

  return {
    valid: dataset.fingerprint === expectedFingerprint && safetyValid && piiFree,
    issues: [
      ...(dataset.fingerprint !== expectedFingerprint ? ["fingerprint-mismatch" as const] : []),
      ...(!safetyValid ? ["unsafe-learning-policy" as const] : []),
      ...(!piiFree ? ["pii-detected" as const] : []),
    ],
  };
}

export function deleteOutcomeSubjectDataV3(input: {
  events: readonly StayOptiOutcomeEventV3[];
  subjectToken: string;
  requestedAt: string;
}) {
  if (!isOpaqueToken(input.subjectToken) || !isIsoInstant(input.requestedAt)) {
    throw new Error("Invalid V3-09 outcome deletion request.");
  }

  const deleted = input.events.filter((event) => event.subjectToken === input.subjectToken);
  const retainedEvents = input.events.filter((event) => event.subjectToken !== input.subjectToken);
  const subjectTokenHash = createStableHashV3(
    input.subjectToken,
    "stayopti-v3-outcome-subject"
  );
  const receiptCore = {
    receiptVersion: "3.0.0-outcome-deletion.1" as const,
    requestedAt: input.requestedAt,
    subjectTokenHash,
    status: deleted.length > 0 ? "deleted" as const : "not-found" as const,
    deletedEventCount: deleted.length,
    deletedDecisionCount: new Set(deleted.map((event) => event.decisionLinkToken)).size,
    retainedEventCount: retainedEvents.length,
    deletionScope: ["raw-outcome-events"] as const,
    pseudonymousDatasetRebuildRequired: true as const,
  };
  const receiptId = createStableHashV3(receiptCore, "stayopti-v3-outcome-deletion-id");
  const receiptWithoutFingerprint = {
    ...receiptCore,
    receiptId,
  };
  const receipt: StayOptiOutcomeDeletionReceiptV3 = {
    ...receiptWithoutFingerprint,
    fingerprint: createStableHashV3(
      receiptWithoutFingerprint,
      "stayopti-v3-outcome-deletion-receipt"
    ),
  };

  return {
    retainedEvents: [...retainedEvents],
    receipt,
  };
}
