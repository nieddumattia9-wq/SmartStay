import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

export const STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_VERSION_V3 =
  "3.0.0-negative-outcome-recheck-evidence.1" as const;

export const STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_SCHEMA_VERSION_V3 =
  "3.0.0-negative-outcome-recheck-evidence-schema.1" as const;

export const STAYOPTI_NEGATIVE_OUTCOME_CLASSIFICATIONS_V3 = Object.freeze([
  "source-no-usable-inventory",
  "offer-unavailable-at-recheck",
  "verified-recheck-total-increase",
  "mapping-contract-failure",
] as const);

export type StayOptiNegativeOutcomeClassificationV3 =
  typeof STAYOPTI_NEGATIVE_OUTCOME_CLASSIFICATIONS_V3[number];

export type StayOptiNegativeOutcomeDecisionUseV3 =
  | "availability-signal"
  | "offer-volatility-signal"
  | "price-risk-signal"
  | "technical-diagnostic-only";

export type StayOptiNegativeOutcomeRecommendedActionV3 =
  | "abstain-or-run-deterministic-recovery"
  | "reselect-offer-and-replay-decision"
  | "show-verified-total-and-request-confirmation"
  | "exclude-from-decision-and-repair-contract";

export type StayOptiNegativeOutcomeTechnicalBoundaryV3 =
  | "rates-mapping"
  | "prebook-mapping"
  | "prebook-binding";

export interface StayOptiNegativeOutcomeEvidenceCommonV3 {
  evidenceId: string;
  caseSlotId: string;
  scenarioId: string;
  searchRequestFingerprint: string;
  observationFingerprint: string;
  sourceKind: "controlled-live-search";
  boundAttemptCount: 1;
  successOnlyRetryUsed: false;
  realSourceAttested: true;
  semanticSummaryRetainedForAudit: true;
  directIdentifiersRemoved: true;
  propertyIdentityRemoved: true;
  providerIdentityRemoved: true;
  commercialSignalsRemoved: true;
  teacherOutputUsedAsGroundTruth: false;
  measurementState: "unmeasured";
}

export interface StayOptiSourceNoUsableInventoryObservationV3
  extends StayOptiNegativeOutcomeEvidenceCommonV3 {
  classification: "source-no-usable-inventory";
  ratesHttpStatus: number;
  mappedHotelCount: 0;
  mappedOfferCount: 0;
}

export interface StayOptiOfferUnavailableAtRecheckObservationV3
  extends StayOptiNegativeOutcomeEvidenceCommonV3 {
  classification: "offer-unavailable-at-recheck";
  originalOfferSnapshotFingerprint: string;
  recheckExecutionFingerprint: string;
  recheckHttpStatus: number;
  availabilityStatus: "unavailable";
}

export interface StayOptiVerifiedRecheckTotalIncreaseObservationV3
  extends StayOptiNegativeOutcomeEvidenceCommonV3 {
  classification: "verified-recheck-total-increase";
  originalOfferSnapshotFingerprint: string;
  recheckExecutionFingerprint: string;
  prebookCreateHttpStatus: number;
  prebookRetrieveHttpStatus: number;
  retrievedPrebookBinding: "verified";
  currency: string;
  searchTotal: number;
  verifiedPrebookTotal: number;
  retrievedPrebookTotal: number;
  roomTermsChanged: boolean;
  mealPlanChanged: boolean;
  cancellationTermsChanged: boolean;
}

export interface StayOptiMappingContractFailureObservationV3
  extends StayOptiNegativeOutcomeEvidenceCommonV3 {
  classification: "mapping-contract-failure";
  technicalBoundary: StayOptiNegativeOutcomeTechnicalBoundaryV3;
  failureCode: string;
  failureFingerprint: string;
}

export type StayOptiNegativeOutcomeObservationV3 =
  | StayOptiSourceNoUsableInventoryObservationV3
  | StayOptiOfferUnavailableAtRecheckObservationV3
  | StayOptiVerifiedRecheckTotalIncreaseObservationV3
  | StayOptiMappingContractFailureObservationV3;

export interface StayOptiAuthoritativeRecheckPriceV3 {
  source: "verified-prebook";
  currency: string;
  previousSearchTotal: number;
  amount: number;
  delta: number;
  direction: "increase";
  postGetParityVerified: true;
}

export interface StayOptiNegativeOutcomeEvidenceRecordV3 {
  observation: StayOptiNegativeOutcomeObservationV3;
  decisionUse: StayOptiNegativeOutcomeDecisionUseV3;
  evidenceUsableForDecisionResearch: boolean;
  technicalFailure: boolean;
  originalNegativeOutcomeRetained: true;
  replacementMayFillGoldenSlot: true;
  replacementMustNotEraseOriginal: true;
  countedAsGoldenReceipt: false;
  requiresDecisionReplay: boolean;
  requiresUserConfirmation: boolean;
  recommendedAction: StayOptiNegativeOutcomeRecommendedActionV3;
  authoritativePrice: StayOptiAuthoritativeRecheckPriceV3 | null;
  changedCommercialTerms: string[];
  reasonCodes: string[];
  fingerprint: string;
}

export interface StayOptiNegativeOutcomeEvidenceLedgerInputV3 {
  ledgerId: string;
  campaignFingerprint: string;
  goldenReceiptCountBefore: number;
  observations: StayOptiNegativeOutcomeObservationV3[];
}

export interface StayOptiNegativeOutcomeEvidenceCountsV3 {
  retained: number;
  decisionResearchUsable: number;
  technicalDiagnosticOnly: number;
  sourceNoUsableInventory: number;
  offerUnavailableAtRecheck: number;
  verifiedRecheckTotalIncrease: number;
  mappingContractFailure: number;
}

export interface StayOptiNegativeOutcomeEvidencePolicyV3 {
  failedOutcomesRetained: true;
  successOnlyRetryAllowed: false;
  deterministicReplacementQueueRequired: true;
  replacementMustNotEraseOriginal: true;
  verifiedPrebookTotalAuthoritative: true;
  postGetParityRequired: true;
  materialIncreaseRequiresUserConfirmation: true;
  technicalFailuresCountAsDecisionSuccess: false;
  automaticGoldenMutationAllowed: false;
  automaticPromotionAllowed: false;
}

export interface StayOptiNegativeOutcomeEvidenceLedgerV3 {
  schemaVersion:
    typeof STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_SCHEMA_VERSION_V3;
  ledgerVersion:
    typeof STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_VERSION_V3;
  ledgerId: string;
  campaignFingerprint: string;
  application: "offline-negative-outcome-decision-evidence-only";
  records: StayOptiNegativeOutcomeEvidenceRecordV3[];
  counts: StayOptiNegativeOutcomeEvidenceCountsV3;
  status: "empty" | "ready";
  policy: StayOptiNegativeOutcomeEvidencePolicyV3;
  goldenReceiptCountBefore: number;
  goldenReceiptCountAfter: number;
  goldenReceiptsCreated: 0;
  statisticalClaimAllowed: false;
  publicV3PromotionAllowed: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  providerCallsPerformedByModule: 0;
  bookingCallsPerformedByModule: 0;
  paymentCallsPerformedByModule: 0;
  inputFingerprint: string;
  fingerprint: string;
}

export interface StayOptiNegativeOutcomeEvidenceValidationV3 {
  valid: boolean;
  violations: string[];
}

const FORBIDDEN_FIELDS =
  /"(name|email|phone|address|providerId|providerName|providerSlug|hotelId|propertyId|offerId|prebookId|credential|token|apiKey|commission|markup|affiliateRevenue|clickProbability|userEconomicValue|rawProviderResponse)"\s*:/i;

const PREMATURE_EVALUATION_FIELDS =
  /"(judgmentId|preference|normalizedRegretV2|normalizedRegretV3|outcomeCorrectV2|outcomeCorrectV3)"\s*:/i;

const TECHNICAL_BOUNDARIES = new Set<StayOptiNegativeOutcomeTechnicalBoundaryV3>([
  "rates-mapping",
  "prebook-mapping",
  "prebook-binding",
]);

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validHttpStatus(value: number): boolean {
  return Number.isInteger(value) && value >= 100 && value <= 599;
}

function successfulHttpStatus(value: number): boolean {
  return validHttpStatus(value) && value >= 200 && value <= 299;
}

function validMoney(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function commonObservationViolations(
  observation: StayOptiNegativeOutcomeObservationV3
): string[] {
  const violations: string[] = [];
  if (
    !/^negative-outcome-recheck-evidence-[a-z0-9-]+$/.test(
      observation.evidenceId
    ) ||
    !/^golden-collection-case-slot-\d{3}$/.test(observation.caseSlotId) ||
    !/^golden-controlled-live-scenario-\d{3}$/.test(observation.scenarioId) ||
    !isStableHashV3(observation.searchRequestFingerprint) ||
    !isStableHashV3(observation.observationFingerprint) ||
    observation.sourceKind !== "controlled-live-search" ||
    observation.boundAttemptCount !== 1 ||
    observation.successOnlyRetryUsed !== false ||
    observation.realSourceAttested !== true ||
    observation.semanticSummaryRetainedForAudit !== true ||
    observation.directIdentifiersRemoved !== true ||
    observation.propertyIdentityRemoved !== true ||
    observation.providerIdentityRemoved !== true ||
    observation.commercialSignalsRemoved !== true ||
    observation.teacherOutputUsedAsGroundTruth !== false ||
    observation.measurementState !== "unmeasured"
  ) {
    violations.push(`negative-outcome-common-contract-invalid:${observation.evidenceId}`);
  }
  const serialized = JSON.stringify(observation);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push(`negative-outcome-forbidden-field:${observation.evidenceId}`);
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push(
      `negative-outcome-premature-evaluation-field:${observation.evidenceId}`
    );
  }
  return violations;
}

function observationViolations(
  observation: StayOptiNegativeOutcomeObservationV3
): string[] {
  const violations = commonObservationViolations(observation);
  switch (observation.classification) {
    case "source-no-usable-inventory":
      if (
        !successfulHttpStatus(observation.ratesHttpStatus) ||
        observation.mappedHotelCount !== 0 ||
        observation.mappedOfferCount !== 0
      ) {
        violations.push(
          `source-no-usable-inventory-contract-invalid:${observation.evidenceId}`
        );
      }
      break;
    case "offer-unavailable-at-recheck":
      if (
        !isStableHashV3(observation.originalOfferSnapshotFingerprint) ||
        !isStableHashV3(observation.recheckExecutionFingerprint) ||
        !validHttpStatus(observation.recheckHttpStatus) ||
        observation.availabilityStatus !== "unavailable"
      ) {
        violations.push(
          `offer-unavailable-at-recheck-contract-invalid:${observation.evidenceId}`
        );
      }
      break;
    case "verified-recheck-total-increase": {
      const increase = observation.verifiedPrebookTotal - observation.searchTotal;
      const postGetDelta = Math.abs(
        observation.verifiedPrebookTotal - observation.retrievedPrebookTotal
      );
      if (
        !isStableHashV3(observation.originalOfferSnapshotFingerprint) ||
        !isStableHashV3(observation.recheckExecutionFingerprint) ||
        !successfulHttpStatus(observation.prebookCreateHttpStatus) ||
        !successfulHttpStatus(observation.prebookRetrieveHttpStatus) ||
        observation.retrievedPrebookBinding !== "verified" ||
        !/^[A-Z]{3}$/.test(observation.currency) ||
        !validMoney(observation.searchTotal) ||
        !validMoney(observation.verifiedPrebookTotal) ||
        !validMoney(observation.retrievedPrebookTotal) ||
        increase <= 0.01 ||
        postGetDelta > 0.01 ||
        typeof observation.roomTermsChanged !== "boolean" ||
        typeof observation.mealPlanChanged !== "boolean" ||
        typeof observation.cancellationTermsChanged !== "boolean"
      ) {
        violations.push(
          `verified-recheck-total-increase-contract-invalid:${observation.evidenceId}`
        );
      }
      break;
    }
    case "mapping-contract-failure":
      if (
        !TECHNICAL_BOUNDARIES.has(observation.technicalBoundary) ||
        !/^[A-Z][A-Z0-9_]{2,80}$/.test(observation.failureCode) ||
        !isStableHashV3(observation.failureFingerprint)
      ) {
        violations.push(
          `mapping-contract-failure-contract-invalid:${observation.evidenceId}`
        );
      }
      break;
  }
  return violations;
}

function canonicalInput(
  input: StayOptiNegativeOutcomeEvidenceLedgerInputV3
): StayOptiNegativeOutcomeEvidenceLedgerInputV3 {
  return {
    ledgerId: input.ledgerId,
    campaignFingerprint: input.campaignFingerprint,
    goldenReceiptCountBefore: input.goldenReceiptCountBefore,
    observations: input.observations
      .map((observation) => ({ ...observation }))
      .sort(
        (left, right) =>
          left.caseSlotId.localeCompare(right.caseSlotId) ||
          left.evidenceId.localeCompare(right.evidenceId)
      ),
  };
}

function changedCommercialTerms(
  observation: StayOptiVerifiedRecheckTotalIncreaseObservationV3
): string[] {
  const changed: string[] = [];
  if (observation.roomTermsChanged) {
    changed.push("room");
  }
  if (observation.mealPlanChanged) {
    changed.push("meal-plan");
  }
  if (observation.cancellationTermsChanged) {
    changed.push("cancellation");
  }
  return changed;
}

function fingerprintRecord(
  payload: Omit<StayOptiNegativeOutcomeEvidenceRecordV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-negative-outcome-recheck-evidence-record"
  );
}

function recordFromObservation(
  observation: StayOptiNegativeOutcomeObservationV3
): StayOptiNegativeOutcomeEvidenceRecordV3 {
  const violations = observationViolations(observation);
  if (violations.length > 0) {
    throw new Error(
      `Negative outcome observation V3 invalid: ${uniqueSorted(violations).join(", ")}`
    );
  }

  let decisionUse: StayOptiNegativeOutcomeDecisionUseV3 =
    "technical-diagnostic-only";
  let evidenceUsableForDecisionResearch = false;
  let technicalFailure = true;
  let requiresDecisionReplay = false;
  let requiresUserConfirmation = false;
  let recommendedAction: StayOptiNegativeOutcomeRecommendedActionV3 =
    "exclude-from-decision-and-repair-contract";
  let authoritativePrice: StayOptiAuthoritativeRecheckPriceV3 | null = null;
  let commercialTerms: string[] = [];
  let reasonCodes: string[] = [];

  switch (observation.classification) {
    case "source-no-usable-inventory":
      decisionUse = "availability-signal";
      evidenceUsableForDecisionResearch = true;
      technicalFailure = false;
      requiresDecisionReplay = true;
      requiresUserConfirmation = false;
      recommendedAction = "abstain-or-run-deterministic-recovery";
      reasonCodes = [
        "negative-outcome:source-no-usable-inventory",
        "negative-outcome:abstention-or-recovery-required",
      ];
      break;
    case "offer-unavailable-at-recheck":
      decisionUse = "offer-volatility-signal";
      evidenceUsableForDecisionResearch = true;
      technicalFailure = false;
      requiresDecisionReplay = true;
      requiresUserConfirmation = false;
      recommendedAction = "reselect-offer-and-replay-decision";
      reasonCodes = [
        "negative-outcome:offer-unavailable-at-recheck",
        "negative-outcome:decision-replay-required",
      ];
      break;
    case "verified-recheck-total-increase":
      decisionUse = "price-risk-signal";
      evidenceUsableForDecisionResearch = true;
      technicalFailure = false;
      requiresDecisionReplay = true;
      requiresUserConfirmation = true;
      recommendedAction = "show-verified-total-and-request-confirmation";
      authoritativePrice = {
        source: "verified-prebook",
        currency: observation.currency,
        previousSearchTotal: roundMoney(observation.searchTotal),
        amount: roundMoney(observation.verifiedPrebookTotal),
        delta: roundMoney(
          observation.verifiedPrebookTotal - observation.searchTotal
        ),
        direction: "increase",
        postGetParityVerified: true,
      };
      commercialTerms = changedCommercialTerms(observation);
      reasonCodes = [
        "negative-outcome:verified-recheck-total-increase",
        "negative-outcome:verified-prebook-total-authoritative",
        "negative-outcome:user-confirmation-required",
      ];
      break;
    case "mapping-contract-failure":
      decisionUse = "technical-diagnostic-only";
      evidenceUsableForDecisionResearch = false;
      technicalFailure = true;
      requiresDecisionReplay = false;
      requiresUserConfirmation = false;
      recommendedAction = "exclude-from-decision-and-repair-contract";
      reasonCodes = [
        "negative-outcome:mapping-contract-failure",
        "negative-outcome:not-a-decision-success",
      ];
      break;
  }

  const payload: Omit<StayOptiNegativeOutcomeEvidenceRecordV3, "fingerprint"> = {
    observation,
    decisionUse,
    evidenceUsableForDecisionResearch,
    technicalFailure,
    originalNegativeOutcomeRetained: true,
    replacementMayFillGoldenSlot: true,
    replacementMustNotEraseOriginal: true,
    countedAsGoldenReceipt: false,
    requiresDecisionReplay,
    requiresUserConfirmation,
    recommendedAction,
    authoritativePrice,
    changedCommercialTerms: commercialTerms,
    reasonCodes: uniqueSorted(reasonCodes),
  };
  return { ...payload, fingerprint: fingerprintRecord(payload) };
}

function countsFor(
  records: readonly StayOptiNegativeOutcomeEvidenceRecordV3[]
): StayOptiNegativeOutcomeEvidenceCountsV3 {
  return {
    retained: records.length,
    decisionResearchUsable: records.filter(
      ({ evidenceUsableForDecisionResearch }) => evidenceUsableForDecisionResearch
    ).length,
    technicalDiagnosticOnly: records.filter(({ technicalFailure }) => technicalFailure)
      .length,
    sourceNoUsableInventory: records.filter(
      ({ observation }) =>
        observation.classification === "source-no-usable-inventory"
    ).length,
    offerUnavailableAtRecheck: records.filter(
      ({ observation }) =>
        observation.classification === "offer-unavailable-at-recheck"
    ).length,
    verifiedRecheckTotalIncrease: records.filter(
      ({ observation }) =>
        observation.classification === "verified-recheck-total-increase"
    ).length,
    mappingContractFailure: records.filter(
      ({ observation }) =>
        observation.classification === "mapping-contract-failure"
    ).length,
  };
}

function policyV3(): StayOptiNegativeOutcomeEvidencePolicyV3 {
  return {
    failedOutcomesRetained: true,
    successOnlyRetryAllowed: false,
    deterministicReplacementQueueRequired: true,
    replacementMustNotEraseOriginal: true,
    verifiedPrebookTotalAuthoritative: true,
    postGetParityRequired: true,
    materialIncreaseRequiresUserConfirmation: true,
    technicalFailuresCountAsDecisionSuccess: false,
    automaticGoldenMutationAllowed: false,
    automaticPromotionAllowed: false,
  };
}

function fingerprintLedger(
  payload: Omit<StayOptiNegativeOutcomeEvidenceLedgerV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-negative-outcome-recheck-evidence-ledger"
  );
}

export function createNegativeOutcomeRecheckEvidenceLedgerV3(
  input: StayOptiNegativeOutcomeEvidenceLedgerInputV3
): StayOptiNegativeOutcomeEvidenceLedgerV3 {
  const canonical = canonicalInput(input);
  const violations: string[] = [];
  if (
    !/^negative-outcome-recheck-ledger-[a-z0-9-]+$/.test(canonical.ledgerId) ||
    !isStableHashV3(canonical.campaignFingerprint) ||
    !Number.isInteger(canonical.goldenReceiptCountBefore) ||
    canonical.goldenReceiptCountBefore < 0
  ) {
    violations.push("negative-outcome-ledger-input-invalid");
  }
  const evidenceIds = new Set<string>();
  const scenarioIds = new Set<string>();
  for (const observation of canonical.observations) {
    violations.push(...observationViolations(observation));
    if (evidenceIds.has(observation.evidenceId)) {
      violations.push(`duplicate-negative-outcome-evidence:${observation.evidenceId}`);
    }
    if (scenarioIds.has(observation.scenarioId)) {
      violations.push(`duplicate-negative-outcome-scenario:${observation.scenarioId}`);
    }
    evidenceIds.add(observation.evidenceId);
    scenarioIds.add(observation.scenarioId);
  }
  if (violations.length > 0) {
    throw new Error(
      `Negative outcome evidence ledger V3 invalid: ${uniqueSorted(violations).join(", ")}`
    );
  }

  const records = canonical.observations.map(recordFromObservation);
  const inputFingerprint = createStableHashV3(
    canonical,
    "stayopti-v3-negative-outcome-recheck-evidence-input"
  );
  const payload: Omit<StayOptiNegativeOutcomeEvidenceLedgerV3, "fingerprint"> = {
    schemaVersion:
      STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_SCHEMA_VERSION_V3,
    ledgerVersion: STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_VERSION_V3,
    ledgerId: canonical.ledgerId,
    campaignFingerprint: canonical.campaignFingerprint,
    application: "offline-negative-outcome-decision-evidence-only",
    records,
    counts: countsFor(records),
    status: records.length === 0 ? "empty" : "ready",
    policy: policyV3(),
    goldenReceiptCountBefore: canonical.goldenReceiptCountBefore,
    goldenReceiptCountAfter: canonical.goldenReceiptCountBefore,
    goldenReceiptsCreated: 0,
    statisticalClaimAllowed: false,
    publicV3PromotionAllowed: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    providerCallsPerformedByModule: 0,
    bookingCallsPerformedByModule: 0,
    paymentCallsPerformedByModule: 0,
    inputFingerprint,
  };
  const result = { ...payload, fingerprint: fingerprintLedger(payload) };
  const validation = validateNegativeOutcomeRecheckEvidenceLedgerV3(result);
  if (!validation.valid) {
    throw new Error(
      `Negative outcome evidence ledger result V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return result;
}

export function validateNegativeOutcomeRecheckEvidenceLedgerV3(
  ledger: StayOptiNegativeOutcomeEvidenceLedgerV3
): StayOptiNegativeOutcomeEvidenceValidationV3 {
  const violations: string[] = [];
  const expectedCounts = countsFor(ledger.records);
  const evidenceIds = new Set<string>();
  const scenarioIds = new Set<string>();
  for (const record of ledger.records) {
    const observationIssues = observationViolations(record.observation);
    violations.push(...observationIssues);
    if (evidenceIds.has(record.observation.evidenceId)) {
      violations.push(
        `duplicate-negative-outcome-evidence:${record.observation.evidenceId}`
      );
    }
    if (scenarioIds.has(record.observation.scenarioId)) {
      violations.push(
        `duplicate-negative-outcome-scenario:${record.observation.scenarioId}`
      );
    }
    evidenceIds.add(record.observation.evidenceId);
    scenarioIds.add(record.observation.scenarioId);
    if (observationIssues.length === 0) {
      const expected = recordFromObservation(record.observation);
      if (stableSerializeV3(record) !== stableSerializeV3(expected)) {
        violations.push(
          `negative-outcome-record-derived-contract-invalid:${record.observation.evidenceId}`
        );
      }
    }
  }
  if (
    ledger.schemaVersion !==
      STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_SCHEMA_VERSION_V3 ||
    ledger.ledgerVersion !==
      STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_VERSION_V3 ||
    !/^negative-outcome-recheck-ledger-[a-z0-9-]+$/.test(ledger.ledgerId) ||
    !isStableHashV3(ledger.campaignFingerprint) ||
    ledger.application !== "offline-negative-outcome-decision-evidence-only" ||
    ledger.status !== (ledger.records.length === 0 ? "empty" : "ready") ||
    !Number.isInteger(ledger.goldenReceiptCountBefore) ||
    ledger.goldenReceiptCountBefore < 0 ||
    ledger.goldenReceiptCountAfter !== ledger.goldenReceiptCountBefore ||
    ledger.goldenReceiptsCreated !== 0 ||
    ledger.statisticalClaimAllowed !== false ||
    ledger.publicV3PromotionAllowed !== false ||
    ledger.publicV2Changed !== false ||
    ledger.publicV3Enabled !== false ||
    ledger.splitEnabled !== false ||
    ledger.providerCallsPerformedByModule !== 0 ||
    ledger.bookingCallsPerformedByModule !== 0 ||
    ledger.paymentCallsPerformedByModule !== 0 ||
    stableSerializeV3(ledger.counts) !== stableSerializeV3(expectedCounts) ||
    stableSerializeV3(ledger.policy) !== stableSerializeV3(policyV3()) ||
    !isStableHashV3(ledger.inputFingerprint)
  ) {
    violations.push("negative-outcome-ledger-contract-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = ledger;
  if (
    !isStableHashV3(ledger.fingerprint) ||
    ledger.fingerprint !== fingerprintLedger(payload)
  ) {
    violations.push("negative-outcome-ledger-fingerprint-invalid");
  }
  const serialized = JSON.stringify(ledger);
  if (FORBIDDEN_FIELDS.test(serialized)) {
    violations.push("negative-outcome-ledger-forbidden-field");
  }
  if (PREMATURE_EVALUATION_FIELDS.test(serialized)) {
    violations.push("negative-outcome-ledger-premature-evaluation-field");
  }
  return {
    valid: violations.length === 0,
    violations: uniqueSorted(violations),
  };
}

export function verifyNegativeOutcomeRecheckEvidenceReplayV3(
  input: StayOptiNegativeOutcomeEvidenceLedgerInputV3,
  expected: StayOptiNegativeOutcomeEvidenceLedgerV3
): boolean {
  const replay = createNegativeOutcomeRecheckEvidenceLedgerV3(input);
  return (
    replay.inputFingerprint === expected.inputFingerprint &&
    replay.fingerprint === expected.fingerprint
  );
}

export const STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_AUDIT_V3 = Object.freeze({
  application: "offline-negative-outcome-decision-evidence-only" as const,
  failedOutcomesRetained: true as const,
  successOnlyRetryAllowed: false as const,
  deterministicReplacementQueueRequired: true as const,
  replacementMustNotEraseOriginal: true as const,
  verifiedPrebookTotalAuthoritative: true as const,
  postGetParityRequired: true as const,
  materialIncreaseRequiresUserConfirmation: true as const,
  technicalFailuresCountAsDecisionSuccess: false as const,
  automaticGoldenMutationAllowed: false as const,
  automaticPromotionAllowed: false as const,
  providerCallsAllowed: false as const,
  bookingCallsAllowed: false as const,
  paymentCallsAllowed: false as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  piiAllowed: false as const,
  providerIdentityAllowed: false as const,
  propertyIdentityAllowed: false as const,
  commercialSignalsAllowed: false as const,
});
