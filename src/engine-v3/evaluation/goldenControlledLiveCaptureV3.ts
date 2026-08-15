import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";
import {
  validateGoldenCollectionCampaignV3,
  type StayOptiGoldenCollectionCampaignV3,
  type StayOptiGoldenCollectionCaseSlotV3,
  type StayOptiGoldenCollectionValidationV3,
} from "./goldenDecisionCollectionCampaignV3";
import {
  type StayOptiGoldenRealEvidenceBatchInputV3,
  type StayOptiGoldenRealEvidenceCaptureV3,
} from "./goldenRealEvidenceBatchV3";

export const STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3 =
  "3.0.0-golden-controlled-live-capture.1" as const;

export const STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3 =
  "3.0.0-golden-controlled-live-capture-schema.1" as const;

export const STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3 = Object.freeze([
  "firenze-it",
  "roma-it",
  "milano-it",
  "venezia-it",
  "napoli-it",
  "bologna-it",
  "torino-it",
  "palermo-it",
  "barcellona-es",
  "madrid-es",
  "lisbona-pt",
  "parigi-fr",
  "londra-gb",
  "berlino-de",
  "vienna-at",
  "praga-cz",
  "amsterdam-nl",
  "atene-gr",
  "budapest-hu",
  "dublino-ie",
] as const);

export const STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_TARGETS_V3 =
  Object.freeze({
    baselineScenarios: 120,
    destinationCount: 20,
    maximumScenariosPerSession: 10,
    currency: "EUR" as const,
    locale: "it-IT" as const,
  });

export type StayOptiGoldenControlledLiveDestinationV3 =
  typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3[number];

export type StayOptiGoldenControlledLiveExportStatusV3 =
  | "empty"
  | "partial"
  | "complete";

export type StayOptiGoldenControlledLiveFailureCodeV3 =
  | "search-failed"
  | "public-rates-unverified"
  | "v2-decision-failed"
  | "v3-decision-failed"
  | "audit-witness-missing"
  | "provider-neutral-replay-failed"
  | "abstention-challenge-failed";

export interface StayOptiGoldenControlledLiveSearchScenarioV3 {
  scenarioId: string;
  sequence: number;
  caseSlotId: string;
  destinationId: StayOptiGoldenControlledLiveDestinationV3;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  rooms: number;
  childAges: number[];
  totalBudgetEuros: number;
  maxDistanceMeters: 500 | 1000 | 2000 | 5000 | 10000;
  currency: "EUR";
  locale: "it-IT";
  profile: StayOptiGoldenCollectionCaseSlotV3["profile"];
  segment: StayOptiGoldenCollectionCaseSlotV3["segment"];
  role: StayOptiGoldenCollectionCaseSlotV3["role"];
  publicRatesRequired: true;
  providerNeutralReplayRequired: boolean;
  abstentionChallengeRequired: boolean;
  plannedScenarioIsStatisticalEvidence: false;
  searchRequestFingerprint: string;
  scenarioFingerprint: string;
}

export interface StayOptiGoldenControlledLiveCapturePlanInputV3 {
  planId: string;
  collectionAnchorDate: string;
}

export interface StayOptiGoldenControlledLiveCapturePlanV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3;
  captureVersion: typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3;
  planId: string;
  campaignFingerprint: string;
  collectionAnchorDate: string;
  application: "controlled-live-capture-planning-only";
  scenarios: StayOptiGoldenControlledLiveSearchScenarioV3[];
  availableBaselineScenarios: number;
  plannedScenariosCountedAsEvidence: false;
  providerCallsPerformed: 0;
  bookingCallsPerformed: 0;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  commercialSignalsUsed: false;
  inputFingerprint: string;
  fingerprint: string;
}

export interface StayOptiGoldenControlledLiveCaptureSessionInputV3 {
  sessionId: string;
  batchId: string;
  planFingerprint: string;
  requestedCaseSlotIds: string[];
}

export interface StayOptiGoldenControlledLiveCaptureSessionV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3;
  captureVersion: typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3;
  sessionId: string;
  batchId: string;
  planFingerprint: string;
  campaignFingerprint: string;
  application: "external-controlled-live-execution-required";
  scenarios: StayOptiGoldenControlledLiveSearchScenarioV3[];
  status: "empty" | "ready";
  plannedScenariosCountedAsEvidence: false;
  externalLiveExecutorRequired: true;
  providerCallsPerformedByModule: 0;
  bookingCallsPerformedByModule: 0;
  inputFingerprint: string;
  fingerprint: string;
}

export interface StayOptiGoldenControlledLiveCapturedAttemptV3 {
  attemptId: string;
  scenarioId: string;
  caseSlotId: string;
  status: "captured";
  searchRequestFingerprint: string;
  collectionWindowId: string;
  realSearchExecutionFingerprint: string;
  sourceSnapshotFingerprint: string;
  publicRatesVerificationFingerprint: string;
  v2DecisionFingerprint: string;
  v3DecisionFingerprint: string;
  auditWitnessFingerprint: string;
  abstentionChallengeEvidenceFingerprint: string | null;
  providerNeutralReplayFingerprint: string | null;
  networkExecutionObserved: true;
  realProviderResponseObserved: true;
  testDoubleUsed: false;
  rawSnapshotRetainedForAudit: true;
  directIdentifiersRemoved: true;
  providerIdentityRemoved: true;
  commercialSignalsRemoved: true;
  teacherOutputUsedAsGroundTruth: false;
}

export interface StayOptiGoldenControlledLiveFailedAttemptV3 {
  attemptId: string;
  scenarioId: string;
  caseSlotId: string;
  status: "failed";
  searchRequestFingerprint: string;
  failureCode: StayOptiGoldenControlledLiveFailureCodeV3;
  failureFingerprint: string;
  countedAsEvidence: false;
}

export type StayOptiGoldenControlledLiveAttemptV3 =
  | StayOptiGoldenControlledLiveCapturedAttemptV3
  | StayOptiGoldenControlledLiveFailedAttemptV3;

export interface StayOptiGoldenControlledLiveCaptureExportInputV3 {
  sessionFingerprint: string;
  attempts: StayOptiGoldenControlledLiveAttemptV3[];
}

export interface StayOptiGoldenControlledLiveCaptureExportCountsV3 {
  requested: number;
  captured: number;
  failed: number;
  pending: number;
  exportedCaptures: number;
}

export interface StayOptiGoldenControlledLiveCaptureExportV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3;
  captureVersion: typeof STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3;
  sessionFingerprint: string;
  application: "controlled-live-capture-export-only";
  attempts: StayOptiGoldenControlledLiveAttemptV3[];
  counts: StayOptiGoldenControlledLiveCaptureExportCountsV3;
  status: StayOptiGoldenControlledLiveExportStatusV3;
  batchInput: StayOptiGoldenRealEvidenceBatchInputV3;
  failedAttemptsCountedAsEvidence: false;
  pendingAttemptsCountedAsEvidence: false;
  plannedScenariosCountedAsEvidence: false;
  fabricatedCapturesAllowed: false;
  statisticalClaimAllowed: false;
  publicV3PromotionAllowed: false;
  splitEnabled: false;
  publicV2Changed: false;
  commercialSignalsUsed: false;
  inputFingerprint: string;
  fingerprint: string;
}

const LEAD_TIME_DAYS = [14, 30, 60, 120, 210] as const;
const STAY_NIGHTS = [2, 3, 5, 7, 10] as const;
const ADULTS = [1, 2, 2, 3, 4] as const;
const BUDGET_PER_NIGHT = [90, 125, 175, 240, 340] as const;
const MAX_DISTANCE_METERS = [500, 1000, 2000, 5000, 10000] as const;
const FAILURE_CODES = new Set<StayOptiGoldenControlledLiveFailureCodeV3>([
  "search-failed",
  "public-rates-unverified",
  "v2-decision-failed",
  "v3-decision-failed",
  "audit-witness-missing",
  "provider-neutral-replay-failed",
  "abstention-challenge-failed",
]);

const FORBIDDEN_FIELDS =
  /"(name|email|phone|address|providerId|providerName|providerSlug|commission|markup|affiliateRevenue|clickProbability|userEconomicValue|credential|token|apiKey)"\s*:/i;

const PREMATURE_EVALUATION_FIELDS =
  /"(judgmentId|preference|measurement|normalizedRegretV2|normalizedRegretV3|outcomeCorrectV2|outcomeCorrectV3)"\s*:/i;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function pad(value: number): string {
  return String(value).padStart(3, "0");
}

function hashSuffix(value: string): string {
  return value.replace(/^fnv1a32-/, "").slice(-8);
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function addDays(value: string, days: number): string {
  const parsed = parseIsoDate(value);
  if (parsed === null) {
    throw new Error(`Invalid collection anchor date: ${value}`);
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function childAgesFor(index: number): number[] {
  if (index % 6 === 1) {
    return [5];
  }
  if (index % 6 === 2) {
    return [4, 10];
  }
  return [];
}

function scenarioFingerprint(
  payload: Omit<
    StayOptiGoldenControlledLiveSearchScenarioV3,
    "scenarioFingerprint"
  >
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-controlled-live-scenario"
  );
}

function planFingerprint(
  payload: Omit<StayOptiGoldenControlledLiveCapturePlanV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-controlled-live-plan"
  );
}

function sessionFingerprint(
  payload: Omit<StayOptiGoldenControlledLiveCaptureSessionV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-controlled-live-session"
  );
}

function exportFingerprint(
  payload: Omit<StayOptiGoldenControlledLiveCaptureExportV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-controlled-live-export"
  );
}

function buildScenario(
  slot: StayOptiGoldenCollectionCaseSlotV3,
  collectionAnchorDate: string
): StayOptiGoldenControlledLiveSearchScenarioV3 {
  const index = slot.sequence - 1;
  const destinationId = STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3[
    index % STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3.length
  ];
  const leadTimeDays = LEAD_TIME_DAYS[
    Math.floor(index / STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3.length) %
      LEAD_TIME_DAYS.length
  ];
  const nights = STAY_NIGHTS[index % STAY_NIGHTS.length];
  const adults = ADULTS[index % ADULTS.length];
  const budgetPerNight = BUDGET_PER_NIGHT[index % BUDGET_PER_NIGHT.length];
  const maxDistanceMeters = MAX_DISTANCE_METERS[
    index % MAX_DISTANCE_METERS.length
  ];
  if (
    destinationId === undefined ||
    leadTimeDays === undefined ||
    nights === undefined ||
    adults === undefined ||
    budgetPerNight === undefined ||
    maxDistanceMeters === undefined
  ) {
    throw new Error(`Golden live scenario taxonomy incomplete: ${slot.caseSlotId}`);
  }
  const checkInDate = addDays(collectionAnchorDate, leadTimeDays);
  const checkOutDate = addDays(checkInDate, nights);
  const requestPayload = {
    destinationId,
    checkInDate,
    checkOutDate,
    adults,
    rooms: adults >= 3 ? 2 : 1,
    childAges: childAgesFor(index),
    totalBudgetEuros: budgetPerNight * nights,
    maxDistanceMeters,
    currency: "EUR" as const,
    locale: "it-IT" as const,
    profile: slot.profile,
    segment: slot.segment,
    role: slot.role,
  };
  const searchRequestFingerprint = createStableHashV3(
    { slotFingerprint: slot.slotFingerprint, requestPayload },
    "stayopti-v3-golden-controlled-live-search-request"
  );
  const payload: Omit<
    StayOptiGoldenControlledLiveSearchScenarioV3,
    "scenarioFingerprint"
  > = {
    scenarioId: `golden-controlled-live-scenario-${pad(slot.sequence)}`,
    sequence: slot.sequence,
    caseSlotId: slot.caseSlotId,
    ...requestPayload,
    publicRatesRequired: true,
    providerNeutralReplayRequired: slot.requiresProviderNeutralReplay,
    abstentionChallengeRequired: slot.requiresEvaluableAbstentionChallenge,
    plannedScenarioIsStatisticalEvidence: false,
    searchRequestFingerprint,
  };
  return { ...payload, scenarioFingerprint: scenarioFingerprint(payload) };
}

function validateScenario(
  scenario: StayOptiGoldenControlledLiveSearchScenarioV3
): string[] {
  const violations: string[] = [];
  const checkIn = parseIsoDate(scenario.checkInDate);
  const checkOut = parseIsoDate(scenario.checkOutDate);
  const destinationAllowed = (
    STAYOPTI_GOLDEN_CONTROLLED_LIVE_DESTINATIONS_V3 as readonly string[]
  ).includes(scenario.destinationId);
  const { scenarioFingerprint: _fingerprint, ...payload } = scenario;
  if (
    !/^golden-controlled-live-scenario-\d{3}$/.test(scenario.scenarioId) ||
    !/^golden-collection-case-slot-\d{3}$/.test(scenario.caseSlotId) ||
    !Number.isInteger(scenario.sequence) ||
    scenario.sequence < 1 ||
    !destinationAllowed ||
    checkIn === null ||
    checkOut === null ||
    checkOut.getTime() <= checkIn.getTime() ||
    !Number.isInteger(scenario.adults) ||
    scenario.adults < 1 ||
    scenario.adults > 4 ||
    !Number.isInteger(scenario.rooms) ||
    scenario.rooms < 1 ||
    scenario.rooms > 2 ||
    !scenario.childAges.every(
      (age) => Number.isInteger(age) && age >= 0 && age <= 12
    ) ||
    !Number.isFinite(scenario.totalBudgetEuros) ||
    scenario.totalBudgetEuros <= 0 ||
    !MAX_DISTANCE_METERS.includes(scenario.maxDistanceMeters) ||
    scenario.currency !== "EUR" ||
    scenario.locale !== "it-IT" ||
    scenario.publicRatesRequired !== true ||
    scenario.plannedScenarioIsStatisticalEvidence !== false ||
    !isStableHashV3(scenario.searchRequestFingerprint) ||
    scenario.scenarioFingerprint !== scenarioFingerprint(payload)
  ) {
    violations.push(`live-scenario-invalid:${scenario.scenarioId}`);
  }
  return violations;
}

export function createGoldenControlledLiveCapturePlanV3(
  campaign: StayOptiGoldenCollectionCampaignV3,
  input: StayOptiGoldenControlledLiveCapturePlanInputV3
): StayOptiGoldenControlledLiveCapturePlanV3 {
  const campaignValidation = validateGoldenCollectionCampaignV3(campaign);
  if (!campaignValidation.valid) {
    throw new Error(
      `Cannot plan live capture for invalid Golden campaign V3: ${campaignValidation.violations.join(", ")}`
    );
  }
  if (
    !/^golden-controlled-live-plan-[a-z0-9-]+$/.test(input.planId) ||
    parseIsoDate(input.collectionAnchorDate) === null
  ) {
    throw new Error(`Golden controlled live plan input invalid: ${input.planId}`);
  }
  const receiptedSlots = new Set(
    campaign.caseReceipts.map(({ caseSlotId }) => caseSlotId)
  );
  const scenarios = campaign.caseSlots
    .filter(
      (slot) => slot.kind === "baseline" && !receiptedSlots.has(slot.caseSlotId)
    )
    .map((slot) => buildScenario(slot, input.collectionAnchorDate));
  const canonicalInput = {
    planId: input.planId,
    campaignFingerprint: campaign.fingerprint,
    collectionAnchorDate: input.collectionAnchorDate,
    availableCaseSlotIds: scenarios.map(({ caseSlotId }) => caseSlotId),
  };
  const inputFingerprint = createStableHashV3(
    canonicalInput,
    "stayopti-v3-golden-controlled-live-plan-input"
  );
  const payload: Omit<StayOptiGoldenControlledLiveCapturePlanV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3,
    captureVersion: STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3,
    planId: input.planId,
    campaignFingerprint: campaign.fingerprint,
    collectionAnchorDate: input.collectionAnchorDate,
    application: "controlled-live-capture-planning-only",
    scenarios,
    availableBaselineScenarios: scenarios.length,
    plannedScenariosCountedAsEvidence: false,
    providerCallsPerformed: 0,
    bookingCallsPerformed: 0,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    commercialSignalsUsed: false,
    inputFingerprint,
  };
  const plan = { ...payload, fingerprint: planFingerprint(payload) };
  const validation = validateGoldenControlledLiveCapturePlanV3(plan);
  if (!validation.valid) {
    throw new Error(
      `Golden controlled live capture plan V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return plan;
}

export function validateGoldenControlledLiveCapturePlanV3(
  plan: StayOptiGoldenControlledLiveCapturePlanV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  const scenarioIds = new Set<string>();
  const caseSlotIds = new Set<string>();
  for (const scenario of plan.scenarios) {
    violations.push(...validateScenario(scenario));
    if (scenarioIds.has(scenario.scenarioId)) {
      violations.push(`duplicate-live-scenario:${scenario.scenarioId}`);
    }
    if (caseSlotIds.has(scenario.caseSlotId)) {
      violations.push(`duplicate-live-case-slot:${scenario.caseSlotId}`);
    }
    scenarioIds.add(scenario.scenarioId);
    caseSlotIds.add(scenario.caseSlotId);
  }
  if (
    plan.schemaVersion !==
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3 ||
    plan.captureVersion !== STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3 ||
    plan.application !== "controlled-live-capture-planning-only" ||
    !/^golden-controlled-live-plan-[a-z0-9-]+$/.test(plan.planId) ||
    !isStableHashV3(plan.campaignFingerprint) ||
    parseIsoDate(plan.collectionAnchorDate) === null ||
    plan.availableBaselineScenarios !== plan.scenarios.length ||
    plan.scenarios.length >
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_TARGETS_V3.baselineScenarios ||
    plan.scenarios.some(({ sequence }) => sequence > 120) ||
    plan.plannedScenariosCountedAsEvidence !== false ||
    plan.providerCallsPerformed !== 0 ||
    plan.bookingCallsPerformed !== 0 ||
    plan.publicV2Changed !== false ||
    plan.publicV3Enabled !== false ||
    plan.splitEnabled !== false ||
    plan.commercialSignalsUsed !== false ||
    !isStableHashV3(plan.inputFingerprint)
  ) {
    violations.push("controlled-live-plan-contract-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = plan;
  if (
    !isStableHashV3(plan.fingerprint) ||
    plan.fingerprint !== planFingerprint(payload)
  ) {
    violations.push("controlled-live-plan-fingerprint-invalid");
  }
  const serialized = JSON.stringify(plan);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push("controlled-live-plan-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push("controlled-live-plan-premature-evaluation-field");
  }
  return { valid: violations.length === 0, violations: uniqueSorted(violations) };
}

export function createGoldenControlledLiveCaptureSessionV3(
  plan: StayOptiGoldenControlledLiveCapturePlanV3,
  input: StayOptiGoldenControlledLiveCaptureSessionInputV3
): StayOptiGoldenControlledLiveCaptureSessionV3 {
  const planValidation = validateGoldenControlledLiveCapturePlanV3(plan);
  if (!planValidation.valid) {
    throw new Error(
      `Cannot create session from invalid Golden live plan V3: ${planValidation.violations.join(", ")}`
    );
  }
  const violations: string[] = [];
  if (
    !/^golden-controlled-live-session-[a-z0-9-]+$/.test(input.sessionId) ||
    !/^golden-real-evidence-batch-[a-z0-9-]+$/.test(input.batchId) ||
    input.planFingerprint !== plan.fingerprint
  ) {
    violations.push("controlled-live-session-input-invalid");
  }
  if (
    input.requestedCaseSlotIds.length >
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_TARGETS_V3.maximumScenariosPerSession
  ) {
    violations.push("controlled-live-session-size-exceeded");
  }
  if (new Set(input.requestedCaseSlotIds).size !== input.requestedCaseSlotIds.length) {
    violations.push("controlled-live-session-duplicate-slot");
  }
  const scenarioByCaseSlotId = new Map(
    plan.scenarios.map((scenario) => [scenario.caseSlotId, scenario])
  );
  const scenarios = input.requestedCaseSlotIds
    .map((caseSlotId) => {
      const scenario = scenarioByCaseSlotId.get(caseSlotId);
      if (scenario === undefined) {
        violations.push(`controlled-live-session-slot-unavailable:${caseSlotId}`);
      }
      return scenario;
    })
    .filter(
      (scenario): scenario is StayOptiGoldenControlledLiveSearchScenarioV3 =>
        scenario !== undefined
    )
    .sort((left, right) => left.sequence - right.sequence);
  if (violations.length > 0) {
    throw new Error(
      `Golden controlled live capture session V3 invalid: ${uniqueSorted(violations).join(", ")}`
    );
  }
  const canonicalInput = {
    sessionId: input.sessionId,
    batchId: input.batchId,
    planFingerprint: input.planFingerprint,
    requestedCaseSlotIds: scenarios.map(({ caseSlotId }) => caseSlotId),
  };
  const inputFingerprint = createStableHashV3(
    canonicalInput,
    "stayopti-v3-golden-controlled-live-session-input"
  );
  const payload: Omit<StayOptiGoldenControlledLiveCaptureSessionV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3,
    captureVersion: STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3,
    sessionId: input.sessionId,
    batchId: input.batchId,
    planFingerprint: plan.fingerprint,
    campaignFingerprint: plan.campaignFingerprint,
    application: "external-controlled-live-execution-required",
    scenarios,
    status: scenarios.length === 0 ? "empty" : "ready",
    plannedScenariosCountedAsEvidence: false,
    externalLiveExecutorRequired: true,
    providerCallsPerformedByModule: 0,
    bookingCallsPerformedByModule: 0,
    inputFingerprint,
  };
  const session = { ...payload, fingerprint: sessionFingerprint(payload) };
  const validation = validateGoldenControlledLiveCaptureSessionV3(session);
  if (!validation.valid) {
    throw new Error(
      `Golden controlled live capture session result V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return session;
}

export function validateGoldenControlledLiveCaptureSessionV3(
  session: StayOptiGoldenControlledLiveCaptureSessionV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  const scenarioIds = new Set<string>();
  const caseSlotIds = new Set<string>();
  for (const scenario of session.scenarios) {
    violations.push(...validateScenario(scenario));
    if (scenarioIds.has(scenario.scenarioId)) {
      violations.push(`duplicate-session-scenario:${scenario.scenarioId}`);
    }
    if (caseSlotIds.has(scenario.caseSlotId)) {
      violations.push(`duplicate-session-case-slot:${scenario.caseSlotId}`);
    }
    scenarioIds.add(scenario.scenarioId);
    caseSlotIds.add(scenario.caseSlotId);
  }
  if (
    session.schemaVersion !==
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3 ||
    session.captureVersion !==
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3 ||
    !/^golden-controlled-live-session-[a-z0-9-]+$/.test(session.sessionId) ||
    !/^golden-real-evidence-batch-[a-z0-9-]+$/.test(session.batchId) ||
    !isStableHashV3(session.planFingerprint) ||
    !isStableHashV3(session.campaignFingerprint) ||
    session.application !== "external-controlled-live-execution-required" ||
    session.scenarios.length >
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_TARGETS_V3.maximumScenariosPerSession ||
    session.status !== (session.scenarios.length === 0 ? "empty" : "ready") ||
    session.plannedScenariosCountedAsEvidence !== false ||
    session.externalLiveExecutorRequired !== true ||
    session.providerCallsPerformedByModule !== 0 ||
    session.bookingCallsPerformedByModule !== 0 ||
    !isStableHashV3(session.inputFingerprint)
  ) {
    violations.push("controlled-live-session-contract-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = session;
  if (
    !isStableHashV3(session.fingerprint) ||
    session.fingerprint !== sessionFingerprint(payload)
  ) {
    violations.push("controlled-live-session-fingerprint-invalid");
  }
  const serialized = JSON.stringify(session);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push("controlled-live-session-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push("controlled-live-session-premature-evaluation-field");
  }
  return { valid: violations.length === 0, violations: uniqueSorted(violations) };
}

function canonicalAttempts(
  attempts: readonly StayOptiGoldenControlledLiveAttemptV3[],
  scenarioById: ReadonlyMap<string, StayOptiGoldenControlledLiveSearchScenarioV3>
): StayOptiGoldenControlledLiveAttemptV3[] {
  return attempts
    .map((attempt) => ({ ...attempt }))
    .sort((left, right) => {
      const leftSequence = scenarioById.get(left.scenarioId)?.sequence ?? 0;
      const rightSequence = scenarioById.get(right.scenarioId)?.sequence ?? 0;
      return leftSequence - rightSequence ||
        left.attemptId.localeCompare(right.attemptId);
    });
}

function validateCapturedAttempt(
  attempt: StayOptiGoldenControlledLiveCapturedAttemptV3,
  scenario: StayOptiGoldenControlledLiveSearchScenarioV3
): string[] {
  const violations: string[] = [];
  const fingerprints = [
    attempt.realSearchExecutionFingerprint,
    attempt.sourceSnapshotFingerprint,
    attempt.publicRatesVerificationFingerprint,
    attempt.v2DecisionFingerprint,
    attempt.v3DecisionFingerprint,
    attempt.auditWitnessFingerprint,
  ];
  const abstentionValid = scenario.abstentionChallengeRequired
    ? isStableHashV3(attempt.abstentionChallengeEvidenceFingerprint)
    : attempt.abstentionChallengeEvidenceFingerprint === null;
  const replayValid = scenario.providerNeutralReplayRequired
    ? isStableHashV3(attempt.providerNeutralReplayFingerprint)
    : attempt.providerNeutralReplayFingerprint === null;
  if (
    !/^collection-window-[a-z0-9-]+$/.test(attempt.collectionWindowId) ||
    !fingerprints.every(isStableHashV3) ||
    !abstentionValid ||
    !replayValid ||
    attempt.networkExecutionObserved !== true ||
    attempt.realProviderResponseObserved !== true ||
    attempt.testDoubleUsed !== false ||
    attempt.rawSnapshotRetainedForAudit !== true ||
    attempt.directIdentifiersRemoved !== true ||
    attempt.providerIdentityRemoved !== true ||
    attempt.commercialSignalsRemoved !== true ||
    attempt.teacherOutputUsedAsGroundTruth !== false
  ) {
    violations.push(`controlled-live-captured-attempt-invalid:${attempt.attemptId}`);
  }
  return violations;
}

function captureFromAttempt(
  attempt: StayOptiGoldenControlledLiveCapturedAttemptV3,
  scenario: StayOptiGoldenControlledLiveSearchScenarioV3
): StayOptiGoldenRealEvidenceCaptureV3 {
  const suffix = hashSuffix(attempt.realSearchExecutionFingerprint);
  return {
    captureId: `golden-real-evidence-capture-${pad(scenario.sequence)}-${suffix}`,
    caseSlotId: scenario.caseSlotId,
    collectionWindowId: attempt.collectionWindowId,
    sourceKind: "controlled-live-search",
    realSearchExecutionFingerprint: attempt.realSearchExecutionFingerprint,
    sourceSnapshotFingerprint: attempt.sourceSnapshotFingerprint,
    publicRatesVerificationFingerprint:
      attempt.publicRatesVerificationFingerprint,
    v2DecisionFingerprint: attempt.v2DecisionFingerprint,
    v3DecisionFingerprint: attempt.v3DecisionFingerprint,
    auditWitnessFingerprint: attempt.auditWitnessFingerprint,
    derivedFromCaseSlotId: null,
    derivationFingerprint: null,
    abstentionChallengeEvidenceFingerprint:
      attempt.abstentionChallengeEvidenceFingerprint,
    providerNeutralReplayFingerprint:
      attempt.providerNeutralReplayFingerprint,
    realSourceAttested: true,
    publicRatesVerified: true,
    rawSnapshotRetainedForAudit: true,
    directIdentifiersRemoved: true,
    providerIdentityRemoved: true,
    commercialSignalsRemoved: true,
    teacherOutputUsedAsGroundTruth: false,
    measurementState: "unmeasured",
  };
}

export function buildGoldenControlledLiveCaptureExportV3(
  session: StayOptiGoldenControlledLiveCaptureSessionV3,
  input: StayOptiGoldenControlledLiveCaptureExportInputV3
): StayOptiGoldenControlledLiveCaptureExportV3 {
  const sessionValidation = validateGoldenControlledLiveCaptureSessionV3(session);
  if (
    !sessionValidation.valid ||
    !isStableHashV3(session.fingerprint) ||
    input.sessionFingerprint !== session.fingerprint
  ) {
    throw new Error("Golden controlled live capture export session mismatch.");
  }
  const scenarioById = new Map(
    session.scenarios.map((scenario) => [scenario.scenarioId, scenario])
  );
  const attempts = canonicalAttempts(input.attempts, scenarioById);
  const violations: string[] = [];
  const attemptIds = new Set<string>();
  const attemptedScenarios = new Set<string>();
  for (const attempt of attempts) {
    const scenario = scenarioById.get(attempt.scenarioId);
    if (attemptIds.has(attempt.attemptId)) {
      violations.push(`duplicate-controlled-live-attempt:${attempt.attemptId}`);
    }
    if (attemptedScenarios.has(attempt.scenarioId)) {
      violations.push(`duplicate-controlled-live-scenario-attempt:${attempt.scenarioId}`);
    }
    attemptIds.add(attempt.attemptId);
    attemptedScenarios.add(attempt.scenarioId);
    if (
      scenario === undefined ||
      !/^golden-controlled-live-attempt-[a-z0-9-]+$/.test(attempt.attemptId) ||
      attempt.caseSlotId !== scenario?.caseSlotId ||
      attempt.searchRequestFingerprint !== scenario?.searchRequestFingerprint
    ) {
      violations.push(`controlled-live-attempt-binding-invalid:${attempt.attemptId}`);
      continue;
    }
    if (attempt.status === "captured") {
      violations.push(...validateCapturedAttempt(attempt, scenario));
    } else if (
      !FAILURE_CODES.has(attempt.failureCode) ||
      !isStableHashV3(attempt.failureFingerprint) ||
      attempt.countedAsEvidence !== false
    ) {
      violations.push(`controlled-live-failed-attempt-invalid:${attempt.attemptId}`);
    }
  }
  const serializedAttempts = JSON.stringify(attempts);
  if (FORBIDDEN_FIELDS.test(serializedAttempts)) {
    violations.push("controlled-live-attempt-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serializedAttempts)) {
    violations.push("controlled-live-attempt-premature-evaluation-field");
  }
  if (violations.length > 0) {
    throw new Error(
      `Golden controlled live capture export V3 invalid: ${uniqueSorted(violations).join(", ")}`
    );
  }
  const capturedAttempts = attempts.filter(
    (attempt): attempt is StayOptiGoldenControlledLiveCapturedAttemptV3 =>
      attempt.status === "captured"
  );
  const captures = capturedAttempts.map((attempt) => {
    const scenario = scenarioById.get(attempt.scenarioId);
    if (scenario === undefined) {
      throw new Error(`Controlled live scenario missing: ${attempt.scenarioId}`);
    }
    return captureFromAttempt(attempt, scenario);
  });
  const failed = attempts.length - capturedAttempts.length;
  const pending = session.scenarios.length - attempts.length;
  const counts: StayOptiGoldenControlledLiveCaptureExportCountsV3 = {
    requested: session.scenarios.length,
    captured: capturedAttempts.length,
    failed,
    pending,
    exportedCaptures: captures.length,
  };
  const status: StayOptiGoldenControlledLiveExportStatusV3 =
    session.scenarios.length === 0
      ? "empty"
      : pending === 0
        ? "complete"
        : "partial";
  const batchInput: StayOptiGoldenRealEvidenceBatchInputV3 = {
    batchId: session.batchId,
    campaignFingerprint: session.campaignFingerprint,
    captures,
  };
  const canonicalInput = {
    sessionFingerprint: input.sessionFingerprint,
    attempts,
  };
  const inputFingerprint = createStableHashV3(
    canonicalInput,
    "stayopti-v3-golden-controlled-live-export-input"
  );
  const payload: Omit<StayOptiGoldenControlledLiveCaptureExportV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3,
    captureVersion: STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3,
    sessionFingerprint: session.fingerprint,
    application: "controlled-live-capture-export-only",
    attempts,
    counts,
    status,
    batchInput,
    failedAttemptsCountedAsEvidence: false,
    pendingAttemptsCountedAsEvidence: false,
    plannedScenariosCountedAsEvidence: false,
    fabricatedCapturesAllowed: false,
    statisticalClaimAllowed: false,
    publicV3PromotionAllowed: false,
    splitEnabled: false,
    publicV2Changed: false,
    commercialSignalsUsed: false,
    inputFingerprint,
  };
  const result = { ...payload, fingerprint: exportFingerprint(payload) };
  const validation = validateGoldenControlledLiveCaptureExportV3(result);
  if (!validation.valid) {
    throw new Error(
      `Golden controlled live capture export result V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return result;
}

export function validateGoldenControlledLiveCaptureExportV3(
  result: StayOptiGoldenControlledLiveCaptureExportV3
): StayOptiGoldenCollectionValidationV3 {
  const violations: string[] = [];
  const captured = result.attempts.filter(({ status }) => status === "captured").length;
  const failed = result.attempts.filter(({ status }) => status === "failed").length;
  if (
    result.schemaVersion !==
      STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_SCHEMA_VERSION_V3 ||
    result.captureVersion !== STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_VERSION_V3 ||
    result.application !== "controlled-live-capture-export-only" ||
    !isStableHashV3(result.sessionFingerprint) ||
    result.counts.captured !== captured ||
    result.counts.failed !== failed ||
    result.counts.requested !==
      result.counts.captured + result.counts.failed + result.counts.pending ||
    result.counts.exportedCaptures !== result.batchInput.captures.length ||
    result.counts.exportedCaptures !== result.counts.captured ||
    result.failedAttemptsCountedAsEvidence !== false ||
    result.pendingAttemptsCountedAsEvidence !== false ||
    result.plannedScenariosCountedAsEvidence !== false ||
    result.fabricatedCapturesAllowed !== false ||
    result.statisticalClaimAllowed !== false ||
    result.publicV3PromotionAllowed !== false ||
    result.splitEnabled !== false ||
    result.publicV2Changed !== false ||
    result.commercialSignalsUsed !== false ||
    !isStableHashV3(result.batchInput.campaignFingerprint) ||
    !isStableHashV3(result.inputFingerprint)
  ) {
    violations.push("controlled-live-export-contract-invalid");
  }
  const expectedStatus: StayOptiGoldenControlledLiveExportStatusV3 =
    result.counts.requested === 0
      ? "empty"
      : result.counts.pending === 0
        ? "complete"
        : "partial";
  if (result.status !== expectedStatus) {
    violations.push("controlled-live-export-status-invalid");
  }
  if (
    result.batchInput.captures.some(
      (capture) =>
        capture.derivedFromCaseSlotId !== null ||
        capture.derivationFingerprint !== null ||
        capture.realSourceAttested !== true ||
        capture.publicRatesVerified !== true ||
        capture.measurementState !== "unmeasured"
    )
  ) {
    violations.push("controlled-live-export-capture-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = result;
  if (
    !isStableHashV3(result.fingerprint) ||
    result.fingerprint !== exportFingerprint(payload)
  ) {
    violations.push("controlled-live-export-fingerprint-invalid");
  }
  const serialized = JSON.stringify(result);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push("controlled-live-export-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push("controlled-live-export-premature-evaluation-field");
  }
  return { valid: violations.length === 0, violations: uniqueSorted(violations) };
}

export function verifyGoldenControlledLiveCaptureExportReplayV3(
  session: StayOptiGoldenControlledLiveCaptureSessionV3,
  input: StayOptiGoldenControlledLiveCaptureExportInputV3,
  expected: StayOptiGoldenControlledLiveCaptureExportV3
): boolean {
  const replay = buildGoldenControlledLiveCaptureExportV3(session, input);
  return (
    replay.inputFingerprint === expected.inputFingerprint &&
    replay.batchInput.captures.length === expected.batchInput.captures.length &&
    replay.fingerprint === expected.fingerprint
  );
}

export const STAYOPTI_GOLDEN_CONTROLLED_LIVE_CAPTURE_AUDIT_V3 = Object.freeze({
  application: "controlled-live-capture-protocol-only" as const,
  baselineScenarioCount: 120 as const,
  destinationCount: 20 as const,
  maximumScenariosPerSession: 10 as const,
  plannedScenariosCountedAsEvidence: false as const,
  failedAttemptsCountedAsEvidence: false as const,
  pendingAttemptsCountedAsEvidence: false as const,
  fabricatedCapturesAllowed: false as const,
  externalLiveExecutorRequired: true as const,
  providerCallsPerformedByModule: 0 as const,
  bookingCallsPerformedByModule: 0 as const,
  analyticsCallsPerformedByModule: 0 as const,
  deploysPerformedByModule: 0 as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  piiAllowed: false as const,
  providerIdentityAllowed: false as const,
  credentialsAllowed: false as const,
  commercialSignalsUsed: false as const,
  teacherOutputsUsedAsGroundTruth: false as const,
});
