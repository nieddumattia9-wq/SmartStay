import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";
import {
  createNegativeOutcomeRecheckEvidenceLedgerV3,
  validateNegativeOutcomeRecheckEvidenceLedgerV3,
  type StayOptiNegativeOutcomeEvidenceLedgerV3,
  type StayOptiNegativeOutcomeObservationV3,
} from "./negativeOutcomeRecheckEvidenceV3";

export const STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_VERSION_V3 =
  "3.0.0-golden-negative-outcome-baseline.1" as const;

export const STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_SCHEMA_VERSION_V3 =
  "3.0.0-golden-negative-outcome-baseline-schema.1" as const;

export type StayOptiGoldenNegativeOutcomeProfileV3 =
  | "balanced"
  | "savings"
  | "comfort"
  | "maximum-comfort";

export type StayOptiGoldenNegativeOutcomeDestinationMarketV3 =
  | "central-europe-urban"
  | "southern-europe-urban"
  | "northern-europe-urban";

export type StayOptiGoldenNegativeOutcomeLeadTimeClassV3 =
  | "short"
  | "medium"
  | "long";

export type StayOptiGoldenNegativeOutcomeStayLengthClassV3 =
  | "medium-stay"
  | "long-stay";

export type StayOptiGoldenNegativeOutcomePartyClassV3 =
  | "group-adults"
  | "group-with-children";

export type StayOptiGoldenNegativeOutcomeBudgetBandV3 =
  | "100-149-eur-per-room-night"
  | "150-199-eur-per-room-night";

export interface StayOptiGoldenNegativeOutcomeDecisionContextV3 {
  evidenceId: string;
  caseSlotId: string;
  scenarioId: string;
  profile: StayOptiGoldenNegativeOutcomeProfileV3;
  destinationMarket: StayOptiGoldenNegativeOutcomeDestinationMarketV3;
  leadTimeDays: number;
  leadTimeClass: StayOptiGoldenNegativeOutcomeLeadTimeClassV3;
  nights: number;
  stayLengthClass: StayOptiGoldenNegativeOutcomeStayLengthClassV3;
  rooms: 2;
  partyClass: StayOptiGoldenNegativeOutcomePartyClassV3;
  budgetBand: StayOptiGoldenNegativeOutcomeBudgetBandV3;
  sourceEvidencePackage: string;
  sourceEvidenceSha256: string;
  contextFingerprint: string;
}

export interface StayOptiGoldenNegativeOutcomeBaselineCountsV3 {
  goldenReceipts: 115;
  negativeOutcomeCases: 5;
  decisionResearchUsableNegativeCases: 5;
  technicalDiagnosticOnlyCases: 0;
  baselineEvidenceCases: 120;
  targetBaselineEvidenceCases: 120;
  adversarialCasesRequiredNext: 40;
  counterfactualCasesRequiredNext: 40;
  targetGoldenDatasetCases: 200;
}

export interface StayOptiGoldenNegativeOutcomeBaselineV3 {
  schemaVersion:
    typeof STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_SCHEMA_VERSION_V3;
  baselineVersion: typeof STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_VERSION_V3;
  application: "offline-golden-negative-outcome-baseline-binding-only";
  sourceCampaignFingerprint: string;
  ledger: StayOptiNegativeOutcomeEvidenceLedgerV3;
  contexts: StayOptiGoldenNegativeOutcomeDecisionContextV3[];
  counts: StayOptiGoldenNegativeOutcomeBaselineCountsV3;
  baselineEvidenceCoverageComplete: true;
  goldenDatasetComplete: false;
  blindHumanJudgmentsStillRequired: 300;
  blindExpertJudgmentsStillRequired: 100;
  statisticalClaimAllowed: false;
  publicV3PromotionAllowed: false;
  automaticPolicyMutationAllowed: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  providerCallsPerformedByModule: 0;
  bookingCallsPerformedByModule: 0;
  paymentCallsPerformedByModule: 0;
  fingerprint: string;
}

export interface StayOptiGoldenNegativeOutcomeBaselineValidationV3 {
  valid: boolean;
  violations: string[];
}

const CAMPAIGN_FINGERPRINT = "fnv1a32-beb2c25a";
const GOLDEN_RECEIPTS = 115;
const V3_17BA_EVIDENCE_PACKAGE =
  "StayOpti-V3-17BA-Golden-Baseline-Recovery-039-045-105-v1-Evidence-20260817-122702.zip";
const V3_17BA_EVIDENCE_SHA256 =
  "b26790fb8dd4aa2c431b209a667a0e1dd62cc82353447cb81933e282e4ea9944";
const V3_17BC_EVIDENCE_PACKAGE =
  "StayOpti-V3-17BC-Golden-Upstream-Semantics-Failure-Accounting-Diagnostic-v2-Evidence-20260817-135029.zip";
const V3_17BC_EVIDENCE_SHA256 =
  "cd34e4bc4e6ddf9f7ab8e5655ace601896b060bad8e96b1ebdf04b529451de38";

const REQUIRED_SLOTS = Object.freeze([
  "golden-collection-case-slot-039",
  "golden-collection-case-slot-045",
  "golden-collection-case-slot-080",
  "golden-collection-case-slot-085",
  "golden-collection-case-slot-105",
] as const);

const FORBIDDEN_FIELDS =
  /"(name|email|phone|address|providerId|providerName|providerSlug|hotelId|propertyId|offerId|prebookId|credential|token|apiKey|commission|markup|affiliateRevenue|clickProbability|userEconomicValue|rawProviderResponse)"\s*:/i;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function contextFingerprint(
  context: Omit<StayOptiGoldenNegativeOutcomeDecisionContextV3, "contextFingerprint">
): string {
  return createStableHashV3(
    context,
    "stayopti-v3-golden-negative-outcome-decision-context"
  );
}

function createContext(
  context: Omit<StayOptiGoldenNegativeOutcomeDecisionContextV3, "contextFingerprint">
): StayOptiGoldenNegativeOutcomeDecisionContextV3 {
  return { ...context, contextFingerprint: contextFingerprint(context) };
}

const CONTEXTS = Object.freeze([
  createContext({
    evidenceId: "negative-outcome-recheck-evidence-slot-039",
    caseSlotId: "golden-collection-case-slot-039",
    scenarioId: "golden-controlled-live-scenario-039",
    profile: "balanced",
    destinationMarket: "central-europe-urban",
    leadTimeDays: 30,
    leadTimeClass: "short",
    nights: 7,
    stayLengthClass: "medium-stay",
    rooms: 2,
    partyClass: "group-with-children",
    budgetBand: "100-149-eur-per-room-night",
    sourceEvidencePackage: V3_17BA_EVIDENCE_PACKAGE,
    sourceEvidenceSha256: V3_17BA_EVIDENCE_SHA256,
  }),
  createContext({
    evidenceId: "negative-outcome-recheck-evidence-slot-045",
    caseSlotId: "golden-collection-case-slot-045",
    scenarioId: "golden-controlled-live-scenario-045",
    profile: "savings",
    destinationMarket: "southern-europe-urban",
    leadTimeDays: 60,
    leadTimeClass: "medium",
    nights: 10,
    stayLengthClass: "long-stay",
    rooms: 2,
    partyClass: "group-with-children",
    budgetBand: "150-199-eur-per-room-night",
    sourceEvidencePackage: V3_17BA_EVIDENCE_PACKAGE,
    sourceEvidenceSha256: V3_17BA_EVIDENCE_SHA256,
  }),
  createContext({
    evidenceId: "negative-outcome-recheck-evidence-slot-080",
    caseSlotId: "golden-collection-case-slot-080",
    scenarioId: "golden-controlled-live-scenario-080",
    profile: "maximum-comfort",
    destinationMarket: "northern-europe-urban",
    leadTimeDays: 120,
    leadTimeClass: "long",
    nights: 10,
    stayLengthClass: "long-stay",
    rooms: 2,
    partyClass: "group-with-children",
    budgetBand: "150-199-eur-per-room-night",
    sourceEvidencePackage: V3_17BC_EVIDENCE_PACKAGE,
    sourceEvidenceSha256: V3_17BC_EVIDENCE_SHA256,
  }),
  createContext({
    evidenceId: "negative-outcome-recheck-evidence-slot-085",
    caseSlotId: "golden-collection-case-slot-085",
    scenarioId: "golden-controlled-live-scenario-085",
    profile: "comfort",
    destinationMarket: "southern-europe-urban",
    leadTimeDays: 210,
    leadTimeClass: "long",
    nights: 10,
    stayLengthClass: "long-stay",
    rooms: 2,
    partyClass: "group-adults",
    budgetBand: "150-199-eur-per-room-night",
    sourceEvidencePackage: V3_17BC_EVIDENCE_PACKAGE,
    sourceEvidenceSha256: V3_17BC_EVIDENCE_SHA256,
  }),
  createContext({
    evidenceId: "negative-outcome-recheck-evidence-slot-105",
    caseSlotId: "golden-collection-case-slot-105",
    scenarioId: "golden-controlled-live-scenario-105",
    profile: "maximum-comfort",
    destinationMarket: "southern-europe-urban",
    leadTimeDays: 14,
    leadTimeClass: "short",
    nights: 10,
    stayLengthClass: "long-stay",
    rooms: 2,
    partyClass: "group-with-children",
    budgetBand: "150-199-eur-per-room-night",
    sourceEvidencePackage: V3_17BA_EVIDENCE_PACKAGE,
    sourceEvidenceSha256: V3_17BA_EVIDENCE_SHA256,
  }),
] as const);

function commonObservation(
  context: StayOptiGoldenNegativeOutcomeDecisionContextV3,
  searchRequestFingerprint: string,
  sourceDescriptor: unknown
) {
  return {
    evidenceId: context.evidenceId,
    caseSlotId: context.caseSlotId,
    scenarioId: context.scenarioId,
    searchRequestFingerprint,
    observationFingerprint: createStableHashV3(
      {
        sourceEvidenceSha256: context.sourceEvidenceSha256,
        contextFingerprint: context.contextFingerprint,
        sourceDescriptor,
      },
      "stayopti-v3-golden-negative-outcome-observation"
    ),
    sourceKind: "controlled-live-search" as const,
    boundAttemptCount: 1 as const,
    successOnlyRetryUsed: false as const,
    realSourceAttested: true as const,
    semanticSummaryRetainedForAudit: true as const,
    directIdentifiersRemoved: true as const,
    propertyIdentityRemoved: true as const,
    providerIdentityRemoved: true as const,
    commercialSignalsRemoved: true as const,
    teacherOutputUsedAsGroundTruth: false as const,
    measurementState: "unmeasured" as const,
  };
}

function observations(): StayOptiNegativeOutcomeObservationV3[] {
  const bySlot = new Map(CONTEXTS.map((context) => [context.caseSlotId, context]));
  const context = (slot: string) => {
    const value = bySlot.get(slot);
    if (value === undefined) {
      throw new Error(`Missing Golden negative-outcome context: ${slot}`);
    }
    return value;
  };

  const slot039 = context("golden-collection-case-slot-039");
  const slot045 = context("golden-collection-case-slot-045");
  const slot080 = context("golden-collection-case-slot-080");
  const slot085 = context("golden-collection-case-slot-085");
  const slot105 = context("golden-collection-case-slot-105");

  return [
    {
      ...commonObservation(slot039, "fnv1a32-55dafe28", {
        source: "v3-17ba-golden-live-export",
        failureCode: "search-failed",
        prebookCreateHttpStatus: 409,
      }),
      classification: "offer-unavailable-at-recheck",
      originalOfferSnapshotFingerprint: createStableHashV3(
        {
          searchRequestFingerprint: "fnv1a32-55dafe28",
          scenarioId: slot039.scenarioId,
        },
        "stayopti-v3-golden-negative-outcome-original-offer"
      ),
      recheckExecutionFingerprint: "fnv1a32-cd84f789",
      recheckHttpStatus: 409,
      availabilityStatus: "unavailable",
    },
    {
      ...commonObservation(slot045, "fnv1a32-449a7945", {
        source: "v3-17ba-golden-live-export",
        failureCode: "public-rates-unverified",
        searchTotal: 3149.52,
        verifiedPrebookTotal: 3153.81,
        retrievedPrebookTotal: 3153.81,
      }),
      classification: "verified-recheck-total-increase",
      originalOfferSnapshotFingerprint: createStableHashV3(
        {
          searchRequestFingerprint: "fnv1a32-449a7945",
          scenarioId: slot045.scenarioId,
        },
        "stayopti-v3-golden-negative-outcome-original-offer"
      ),
      recheckExecutionFingerprint: "fnv1a32-a4a2d527",
      prebookCreateHttpStatus: 200,
      prebookRetrieveHttpStatus: 200,
      retrievedPrebookBinding: "verified",
      currency: "EUR",
      searchTotal: 3149.52,
      verifiedPrebookTotal: 3153.81,
      retrievedPrebookTotal: 3153.81,
      roomTermsChanged: false,
      mealPlanChanged: false,
      cancellationTermsChanged: false,
    },
    {
      ...commonObservation(slot080, "fnv1a32-9ed1c4d2", {
        source: "v3-17bc-retained-outcome-080",
        ratesHttpStatus: 200,
        mappedHotelCount: 0,
        mappedOfferCount: 0,
      }),
      classification: "source-no-usable-inventory",
      ratesHttpStatus: 200,
      mappedHotelCount: 0,
      mappedOfferCount: 0,
    },
    {
      ...commonObservation(slot085, "fnv1a32-707f8beb", {
        source: "v3-17bc-retained-outcome-085",
        searchTotal: 1602.69,
        verifiedPrebookTotal: 1615.74,
        retrievedPrebookTotal: 1615.74,
      }),
      classification: "verified-recheck-total-increase",
      originalOfferSnapshotFingerprint: createStableHashV3(
        {
          searchRequestFingerprint: "fnv1a32-707f8beb",
          scenarioId: slot085.scenarioId,
        },
        "stayopti-v3-golden-negative-outcome-original-offer"
      ),
      recheckExecutionFingerprint: createStableHashV3(
        {
          sourceEvidenceSha256: slot085.sourceEvidenceSha256,
          scenarioId: slot085.scenarioId,
          prebookCreateHttpStatus: 200,
          prebookRetrieveHttpStatus: 200,
        },
        "stayopti-v3-golden-negative-outcome-recheck-execution"
      ),
      prebookCreateHttpStatus: 200,
      prebookRetrieveHttpStatus: 200,
      retrievedPrebookBinding: "verified",
      currency: "EUR",
      searchTotal: 1602.69,
      verifiedPrebookTotal: 1615.74,
      retrievedPrebookTotal: 1615.74,
      roomTermsChanged: false,
      mealPlanChanged: false,
      cancellationTermsChanged: false,
    },
    {
      ...commonObservation(slot105, "fnv1a32-85bba019", {
        source: "v3-17ba-golden-live-export",
        failureCode: "public-rates-unverified",
        searchTotal: 3479.17,
        verifiedPrebookTotal: 3483.65,
        retrievedPrebookTotal: 3483.65,
      }),
      classification: "verified-recheck-total-increase",
      originalOfferSnapshotFingerprint: createStableHashV3(
        {
          searchRequestFingerprint: "fnv1a32-85bba019",
          scenarioId: slot105.scenarioId,
        },
        "stayopti-v3-golden-negative-outcome-original-offer"
      ),
      recheckExecutionFingerprint: "fnv1a32-f90ea099",
      prebookCreateHttpStatus: 200,
      prebookRetrieveHttpStatus: 200,
      retrievedPrebookBinding: "verified",
      currency: "EUR",
      searchTotal: 3479.17,
      verifiedPrebookTotal: 3483.65,
      retrievedPrebookTotal: 3483.65,
      roomTermsChanged: false,
      mealPlanChanged: false,
      cancellationTermsChanged: false,
    },
  ];
}

function counts(): StayOptiGoldenNegativeOutcomeBaselineCountsV3 {
  return {
    goldenReceipts: 115,
    negativeOutcomeCases: 5,
    decisionResearchUsableNegativeCases: 5,
    technicalDiagnosticOnlyCases: 0,
    baselineEvidenceCases: 120,
    targetBaselineEvidenceCases: 120,
    adversarialCasesRequiredNext: 40,
    counterfactualCasesRequiredNext: 40,
    targetGoldenDatasetCases: 200,
  };
}

function fingerprintBaseline(
  payload: Omit<StayOptiGoldenNegativeOutcomeBaselineV3, "fingerprint">
): string {
  return createStableHashV3(
    payload,
    "stayopti-v3-golden-negative-outcome-baseline"
  );
}

export function createGoldenNegativeOutcomeBaselineV3(): StayOptiGoldenNegativeOutcomeBaselineV3 {
  const ledger = createNegativeOutcomeRecheckEvidenceLedgerV3({
    ledgerId: "negative-outcome-recheck-ledger-golden-baseline-120",
    campaignFingerprint: CAMPAIGN_FINGERPRINT,
    goldenReceiptCountBefore: GOLDEN_RECEIPTS,
    observations: observations(),
  });
  const payload: Omit<StayOptiGoldenNegativeOutcomeBaselineV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_SCHEMA_VERSION_V3,
    baselineVersion: STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_VERSION_V3,
    application: "offline-golden-negative-outcome-baseline-binding-only",
    sourceCampaignFingerprint: CAMPAIGN_FINGERPRINT,
    ledger,
    contexts: CONTEXTS.map((context) => ({ ...context })),
    counts: counts(),
    baselineEvidenceCoverageComplete: true,
    goldenDatasetComplete: false,
    blindHumanJudgmentsStillRequired: 300,
    blindExpertJudgmentsStillRequired: 100,
    statisticalClaimAllowed: false,
    publicV3PromotionAllowed: false,
    automaticPolicyMutationAllowed: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    providerCallsPerformedByModule: 0,
    bookingCallsPerformedByModule: 0,
    paymentCallsPerformedByModule: 0,
  };
  const result = { ...payload, fingerprint: fingerprintBaseline(payload) };
  const validation = validateGoldenNegativeOutcomeBaselineV3(result);
  if (!validation.valid) {
    throw new Error(
      `Golden negative-outcome baseline V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return result;
}

export function validateGoldenNegativeOutcomeBaselineV3(
  baseline: StayOptiGoldenNegativeOutcomeBaselineV3
): StayOptiGoldenNegativeOutcomeBaselineValidationV3 {
  const violations: string[] = [];
  const ledgerValidation = validateNegativeOutcomeRecheckEvidenceLedgerV3(
    baseline.ledger
  );
  if (!ledgerValidation.valid) {
    violations.push("golden-negative-outcome-ledger-invalid");
  }
  const contextSlots = baseline.contexts.map(({ caseSlotId }) => caseSlotId).sort();
  const recordSlots = baseline.ledger.records
    .map(({ observation }) => observation.caseSlotId)
    .sort();
  const contextEvidenceIds = new Set(
    baseline.contexts.map(({ evidenceId }) => evidenceId)
  );
  const contextsValid = baseline.contexts.every((context) => {
    const { contextFingerprint: _fingerprint, ...payload } = context;
    return (
      isStableHashV3(context.contextFingerprint) &&
      context.contextFingerprint === contextFingerprint(payload) &&
      /^[a-f0-9]{64}$/.test(context.sourceEvidenceSha256) &&
      context.rooms === 2 &&
      Number.isInteger(context.leadTimeDays) &&
      context.leadTimeDays > 0 &&
      Number.isInteger(context.nights) &&
      context.nights > 0
    );
  });
  if (
    !contextsValid ||
    stableSerializeV3(contextSlots) !== stableSerializeV3([...REQUIRED_SLOTS]) ||
    stableSerializeV3(recordSlots) !== stableSerializeV3([...REQUIRED_SLOTS]) ||
    baseline.ledger.records.some(
      ({ observation }) => !contextEvidenceIds.has(observation.evidenceId)
    )
  ) {
    violations.push("golden-negative-outcome-context-binding-invalid");
  }
  const expectedCounts = counts();
  if (
    baseline.schemaVersion !==
      STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_SCHEMA_VERSION_V3 ||
    baseline.baselineVersion !==
      STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_VERSION_V3 ||
    baseline.application !==
      "offline-golden-negative-outcome-baseline-binding-only" ||
    baseline.sourceCampaignFingerprint !== CAMPAIGN_FINGERPRINT ||
    baseline.ledger.goldenReceiptCountBefore !== GOLDEN_RECEIPTS ||
    baseline.ledger.goldenReceiptCountAfter !== GOLDEN_RECEIPTS ||
    baseline.ledger.goldenReceiptsCreated !== 0 ||
    baseline.ledger.counts.retained !== 5 ||
    baseline.ledger.counts.decisionResearchUsable !== 5 ||
    baseline.ledger.counts.technicalDiagnosticOnly !== 0 ||
    stableSerializeV3(baseline.counts) !== stableSerializeV3(expectedCounts) ||
    baseline.counts.goldenReceipts + baseline.counts.negativeOutcomeCases !==
      baseline.counts.baselineEvidenceCases ||
    baseline.counts.baselineEvidenceCases !==
      baseline.counts.targetBaselineEvidenceCases ||
    baseline.counts.baselineEvidenceCases +
        baseline.counts.adversarialCasesRequiredNext +
        baseline.counts.counterfactualCasesRequiredNext !==
      baseline.counts.targetGoldenDatasetCases ||
    baseline.baselineEvidenceCoverageComplete !== true ||
    baseline.goldenDatasetComplete !== false ||
    baseline.blindHumanJudgmentsStillRequired !== 300 ||
    baseline.blindExpertJudgmentsStillRequired !== 100 ||
    baseline.statisticalClaimAllowed !== false ||
    baseline.publicV3PromotionAllowed !== false ||
    baseline.automaticPolicyMutationAllowed !== false ||
    baseline.publicV2Changed !== false ||
    baseline.publicV3Enabled !== false ||
    baseline.splitEnabled !== false ||
    baseline.providerCallsPerformedByModule !== 0 ||
    baseline.bookingCallsPerformedByModule !== 0 ||
    baseline.paymentCallsPerformedByModule !== 0
  ) {
    violations.push("golden-negative-outcome-baseline-contract-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = baseline;
  if (
    !isStableHashV3(baseline.fingerprint) ||
    baseline.fingerprint !== fingerprintBaseline(payload)
  ) {
    violations.push("golden-negative-outcome-baseline-fingerprint-invalid");
  }
  if (FORBIDDEN_FIELDS.test(JSON.stringify(baseline))) {
    violations.push("golden-negative-outcome-baseline-forbidden-field");
  }
  return { valid: violations.length === 0, violations: uniqueSorted(violations) };
}

export function verifyGoldenNegativeOutcomeBaselineReplayV3(
  expected: StayOptiGoldenNegativeOutcomeBaselineV3
): boolean {
  const replay = createGoldenNegativeOutcomeBaselineV3();
  return (
    replay.ledger.inputFingerprint === expected.ledger.inputFingerprint &&
    replay.ledger.fingerprint === expected.ledger.fingerprint &&
    replay.fingerprint === expected.fingerprint
  );
}

export const STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_AUDIT_V3 = Object.freeze({
  application: "offline-golden-negative-outcome-baseline-binding-only" as const,
  goldenReceiptsRemain: 115 as const,
  negativeOutcomeCasesRetained: 5 as const,
  baselineEvidenceCasesCovered: 120 as const,
  adversarialCasesRequiredNext: 40 as const,
  counterfactualCasesRequiredNext: 40 as const,
  statisticalClaimsAllowed: false as const,
  publicV3PromotionAllowed: false as const,
  automaticPolicyMutationAllowed: false as const,
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
