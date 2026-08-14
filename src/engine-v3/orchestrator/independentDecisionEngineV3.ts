import type {
  SmartStayEngineV2SearchInput,
  SmartStayEngineV2SearchResult,
} from "../../engine-v2/orchestrator/smartStayEngineV2";

import {
  adaptV2SearchResultToDecisionV3,
  type StayOptiV3CompatibilityPolicyInput,
} from "../adapter/v2CompatibilityAdapterV3";

import {
  evaluateCommercialFirewallV3,
} from "../contract/commercialFirewallV3";

import {
  createStableHashV3,
} from "../contract/stableHashV3";

import {
  validateStayOptiDecisionV3,
  type StayOptiDecisionV3,
} from "../contract/stayOptiDecisionV3";

import {
  SMARTSTAY_ENGINE_VERSION_V3,
  SMARTSTAY_INDEPENDENT_DECISION_VERSION_V3,
  SMARTSTAY_POLICY_VERSION_V3,
} from "../contract/versionsV3";

import type {
  StayPublicRatesConsistencyV3,
} from "../integrity/integrityCoverageV3";

import {
  findOutcomePiiViolationsV3,
} from "../outcome/outcomeDataLoopV3";

import {
  runV3ShadowWithDerivedSafetySafelyV3,
  type StayOptiComparableDecisionRoleV3,
  type StayOptiComparableDecisionStatusV3,
  type StayOptiComparableDecisionV3,
  type StayOptiShadowObservationV3,
  type StayOptiShadowSafetySignalsV3,
} from "../promotion/shadowCanaryPromotionV3";

import {
  verifyDecisionReplayV3,
} from "../replay/decisionReplayV3";

import type {
  StayOptiEvaluationSegmentV3,
} from "../evaluation/evaluationCalibrationV3";

export interface RunIndependentDecisionShadowInputV3 {
  mode?: "off" | "shadow";
  comparisonToken: string;
  segment: StayOptiEvaluationSegmentV3;
  searchInput: SmartStayEngineV2SearchInput;
  publicV2Result: SmartStayEngineV2SearchResult;
  publicRateEvidence?: StayOptiBoundPublicRateEvidenceInputV3;
  compatibilityPolicy?: StayOptiV3CompatibilityPolicyInput;
}

export interface RunIndependentDecisionShadowResultV3 {
  publicResult: SmartStayEngineV2SearchResult;
  publicServingEngine: "v2";
  v3Executed: boolean;
  shadowObservation: StayOptiShadowObservationV3 | null;
}

type ComparableDecisionWithoutFingerprint =
  Omit<StayOptiComparableDecisionV3, "decisionFingerprint">;

export const STAYOPTI_PUBLIC_RATE_MAX_DELTA_V3 =
  0.02 as const;

export interface StayOptiBoundPublicRateEvidenceV3 {
  evidenceType:
    "rates-prebook-get-prebook";
  decisionFingerprint:
    string;
  hotelSelectionToken:
    string;
  currency:
    string;
  ratesTotal:
    number;
  prebookTotal:
    number;
  retrievedPrebookTotal:
    number;
  evidenceFingerprint:
    string;
}

export interface StayOptiBoundPublicRateAbstentionEvidenceV3 {
  evidenceType:
    "v3-abstention-no-selected-rate";
  decisionFingerprint:
    string;
  comparableDecisionFingerprint:
    string;
  comparableStatus:
    | "abstained"
    | "no-feasible-solution";
  hotelSelectionToken:
    null;
  evidenceFingerprint:
    string;
}

export type StayOptiBoundPublicRateEvidenceInputV3 =
  | StayOptiBoundPublicRateEvidenceV3
  | StayOptiBoundPublicRateAbstentionEvidenceV3;

type PublicRateEvidenceWithoutFingerprintV3 =
  Omit<
    StayOptiBoundPublicRateEvidenceV3,
    "evidenceFingerprint"
  >;

function createPublicRateEvidenceFingerprintV3(
  evidence:
    PublicRateEvidenceWithoutFingerprintV3
) {
  return createStableHashV3(
    evidence,
    "stayopti-v3-bound-public-rate-evidence"
  );
}

export function createBoundPublicRateEvidenceV3(
  input:
    PublicRateEvidenceWithoutFingerprintV3
): StayOptiBoundPublicRateEvidenceV3 {
  return {
    ...input,
    evidenceFingerprint:
      createPublicRateEvidenceFingerprintV3(
        input
      ),
  };
}

type PublicRateAbstentionEvidenceWithoutFingerprintV3 =
  Omit<
    StayOptiBoundPublicRateAbstentionEvidenceV3,
    "evidenceFingerprint"
  >;

function createPublicRateAbstentionEvidenceFingerprintV3(
  evidence:
    PublicRateAbstentionEvidenceWithoutFingerprintV3
) {
  return createStableHashV3(
    evidence,
    "stayopti-v3-bound-public-rate-abstention-evidence"
  );
}

export function createBoundPublicRateAbstentionEvidenceV3(
  input:
    PublicRateAbstentionEvidenceWithoutFingerprintV3
): StayOptiBoundPublicRateAbstentionEvidenceV3 {
  return {
    ...input,
    evidenceFingerprint:
      createPublicRateAbstentionEvidenceFingerprintV3(
        input
      ),
  };
}

function uniqueSorted(
  values: readonly string[]
) {
  return [
    ...new Set(
      values
    ),
  ].sort();
}

function createComparableDecision(
  input: ComparableDecisionWithoutFingerprint,
  namespace: string,
  sourceFingerprint?: string
): StayOptiComparableDecisionV3 {
  return {
    ...input,
    decisionFingerprint:
      createStableHashV3(
        {
          projection: input,
          sourceFingerprint:
            sourceFingerprint ??
            null,
        },
        namespace
      ),
  };
}

export function createHotelSelectionTokenV3(
  hotelId: string
) {
  if (
    typeof hotelId !==
      "string" ||
    hotelId.trim().length ===
      0 ||
    hotelId.length >
      512
  ) {
    throw new Error(
      "Independent V3 selection requires a bounded hotel ID."
    );
  }

  return createStableHashV3(
    {
      hotelId,
    },
    "stayopti-v3-hotel-selection-token"
  );
}

export function createV2ComparableDecisionV3(
  result: SmartStayEngineV2SearchResult
): StayOptiComparableDecisionV3 {
  const hotelId =
    result.recommendationRoles
      .bestChoiceHotelId;

  const status:
    StayOptiComparableDecisionStatusV3 =
      hotelId !==
        null
        ? "recommended"
        : result.evaluations.length >
            0
          ? "abstained"
          : "no-feasible-solution";

  const reasonCodes =
    status ===
      "recommended"
      ? [
          "v2:best-choice",
          "v2:recommended",
        ]
      : status ===
          "abstained"
        ? [
            "v2:abstained",
          ]
        : [
            "v2:no-feasible-solution",
          ];

  return createComparableDecision(
    {
      engine: "v2",
      engineVersion:
        result.engineVersion,
      policyVersion:
        result.pipelineVersion,
      status,
      selectedSolutionToken:
        hotelId ===
          null
          ? null
          : createHotelSelectionTokenV3(
              hotelId
            ),
      role:
        hotelId ===
          null
          ? null
          : "best-choice",
      reasonCodes,
    },
    "stayopti-v3-v2-comparable-decision"
  );
}

function findSingleSolutionForHotel(
  decision: StayOptiDecisionV3,
  hotelId: string
) {
  const matches =
    decision.solutions.filter(
      (solution) =>
        solution.kind ===
          "single" &&
        solution.segments.length ===
          1 &&
        solution.segments[0]
          ?.hotelId ===
          hotelId
    );

  if (
    matches.length !==
      1
  ) {
    return null;
  }

  return matches[0] ??
    null;
}

function resolveIndependentRole(
  decision: StayOptiDecisionV3,
  selectedHotelId: string,
  v2HotelId: string | null
): StayOptiComparableDecisionRoleV3 {
  if (
    v2HotelId ===
      null ||
    selectedHotelId ===
      v2HotelId
  ) {
    return "best-choice";
  }

  const selectedSolution =
    findSingleSolutionForHotel(
      decision,
      selectedHotelId
    );

  const v2Solution =
    findSingleSolutionForHotel(
      decision,
      v2HotelId
    );

  const selectedCost =
    selectedSolution
      ?.totalCost;

  const v2Cost =
    v2Solution
      ?.totalCost;

  if (
    selectedCost
      ?.amount ===
      null ||
    selectedCost
      ?.amount ===
      undefined ||
    v2Cost
      ?.amount ===
      null ||
    v2Cost
      ?.amount ===
      undefined ||
    selectedCost.currency ===
      null ||
    selectedCost.currency !==
      v2Cost.currency
  ) {
    return "best-choice";
  }

  if (
    selectedCost.amount <
      v2Cost.amount
  ) {
    return "best-sensible-saving";
  }

  if (
    selectedCost.amount >
      v2Cost.amount
  ) {
    return "worthwhile-comfort-upgrade";
  }

  return "best-choice";
}

export function createIndependentV3ComparableDecisionV3(
  decision: StayOptiDecisionV3,
  v2HotelId: string | null
): StayOptiComparableDecisionV3 {
  if (
    decision.temporalOptimization
      .status ===
      "split-recommended" ||
    decision.temporalOptimization
      .splitSolutionId !==
      null
  ) {
    throw new Error(
      "Independent V3 shadow comparison blocks SPLIT until the dedicated temporal gate is complete."
    );
  }

  const robustness =
    decision.robustness;

  if (
    robustness.recommendationPolicy ===
      "abstain"
  ) {
    const status:
      StayOptiComparableDecisionStatusV3 =
        robustness.abstentionCode ===
          "no-feasible-solution"
          ? "no-feasible-solution"
          : "abstained";

    return createComparableDecision(
      {
        engine: "v3",
        engineVersion:
          SMARTSTAY_ENGINE_VERSION_V3,
        policyVersion:
          SMARTSTAY_POLICY_VERSION_V3,
        status,
        selectedSolutionToken:
          null,
        role:
          null,
        reasonCodes:
          uniqueSorted([
            `independent:${status}`,
            "independent:single-stay-only",
            ...robustness.reasonCodes,
          ]),
      },
      "stayopti-v3-independent-comparable-decision",
      decision.replay
        .decisionFingerprint
    );
  }

  const selectedHotelId =
    robustness
      .policyPreferredHotelId;

  if (
    selectedHotelId ===
      null ||
    selectedHotelId !==
      robustness
        .robustChoiceHotelId
  ) {
    throw new Error(
      "Independent V3 recommendation lacks a consistent robust hotel selection."
    );
  }

  const selectedSolution =
    findSingleSolutionForHotel(
      decision,
      selectedHotelId
    );

  const robustnessCandidate =
    robustness.candidates.find(
      (candidate) =>
        candidate.hotelId ===
          selectedHotelId
    ) ??
    null;

  if (
    selectedSolution ===
      null ||
    selectedSolution.feasibility !==
      "feasible" ||
    robustnessCandidate
      ?.status !==
      "usable"
  ) {
    throw new Error(
      "Independent V3 recommendation is not backed by one feasible eligible single-stay solution."
    );
  }

  return createComparableDecision(
    {
      engine: "v3",
      engineVersion:
        SMARTSTAY_ENGINE_VERSION_V3,
      policyVersion:
        SMARTSTAY_POLICY_VERSION_V3,
      status: "recommended",
      selectedSolutionToken:
        createHotelSelectionTokenV3(
          selectedHotelId
        ),
      role:
        resolveIndependentRole(
          decision,
          selectedHotelId,
          v2HotelId
        ),
      reasonCodes:
        uniqueSorted([
          "independent:recommended",
          "independent:single-stay-only",
          ...robustness.reasonCodes,
          ...decision
            .decisionGeometry
            .reasonCodes,
          ...decision
            .contextualStayValue
            .reasonCodes,
        ]),
    },
    "stayopti-v3-independent-comparable-decision",
    decision.replay
      .decisionFingerprint
  );
}

function derivePriceIntegrity(
  decision: StayOptiDecisionV3,
  comparable: StayOptiComparableDecisionV3
): StayOptiShadowSafetySignalsV3["priceIntegrity"] {
  const coverage =
    decision.integrity
      .coverage;

  if (
    coverage.invalidIntegrityCount >
      0
  ) {
    return "fail";
  }

  if (
    comparable.status !==
      "recommended"
  ) {
    return coverage.offerSnapshotCount ===
      0
      ? "unknown"
      : "pass";
  }

  const hotelId =
    decision.robustness
      .policyPreferredHotelId;

  if (
    hotelId ===
      null
  ) {
    return "fail";
  }

  const solution =
    findSingleSolutionForHotel(
      decision,
      hotelId
    );

  if (
    solution ===
      null ||
    solution.feasibility !==
      "feasible"
  ) {
    return "fail";
  }

  if (
    solution.totalCost
      .amount ===
      null ||
    solution.totalCost
      .currency ===
      null ||
    solution.totalCost
      .completeness !==
      "reported-complete"
  ) {
    return "unknown";
  }

  const segment =
    solution.segments[0];

  const snapshot =
    segment ===
      undefined
      ? null
      : decision.integrity
          .offerSnapshots.find(
            (candidate) =>
              candidate.hotelId ===
                segment.hotelId &&
              candidate.offerId ===
                segment.offerId
          ) ??
        null;

  if (
    snapshot ===
      null
  ) {
    return "unknown";
  }

  if (
    snapshot.scope.status ===
      "conflicting" ||
    snapshot.cost
      .integrityStatus ===
      "conflicting" ||
    snapshot.temporalPriceEvidence
      .status ===
      "invalid"
  ) {
    return "fail";
  }

  return snapshot.scope.status ===
      "exact" &&
    snapshot.cost
      .integrityStatus ===
      "complete" &&
    snapshot.cost.total
      .state ===
      "known"
      ? "pass"
      : "unknown";
}

function finitePositiveAmount(
  value: unknown
): value is number {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >
      0;
}

export function deriveBoundPublicRateConsistencyV3(
  input: {
    decision:
      StayOptiDecisionV3;
    comparable:
      StayOptiComparableDecisionV3;
    evidence?:
      StayOptiBoundPublicRateEvidenceInputV3;
  }
): StayPublicRatesConsistencyV3 {
  const evidence =
    input.evidence;

  if (
    evidence ===
      undefined
  ) {
    return "unverified";
  }

  const evidenceKeys =
    Object.keys(
      evidence
    ).sort();

  if (
    evidence.evidenceType ===
      "v3-abstention-no-selected-rate"
  ) {
    const {
      evidenceFingerprint,
      ...withoutFingerprint
    } = evidence;

    const expectedEvidenceKeys = [
      "comparableDecisionFingerprint",
      "comparableStatus",
      "decisionFingerprint",
      "evidenceFingerprint",
      "evidenceType",
      "hotelSelectionToken",
    ];

    return JSON.stringify(
      evidenceKeys
    ) ===
        JSON.stringify(
          expectedEvidenceKeys
        ) &&
      evidenceFingerprint ===
        createPublicRateAbstentionEvidenceFingerprintV3(
          withoutFingerprint
        ) &&
      evidence.decisionFingerprint ===
        input.decision.replay
          .decisionFingerprint &&
      evidence.comparableDecisionFingerprint ===
        input.comparable
          .decisionFingerprint &&
      evidence.comparableStatus ===
        input.comparable.status &&
      input.comparable.selectedSolutionToken ===
        null &&
      evidence.hotelSelectionToken ===
        null &&
      input.decision.robustness
        .recommendationPolicy ===
        "abstain" &&
      input.decision.robustness
        .policyPreferredHotelId ===
        null
        ? "not-applicable"
        : "failed";
  }

  const {
    evidenceFingerprint,
    ...withoutFingerprint
  } = evidence;

  const expectedEvidenceKeys = [
    "currency",
    "decisionFingerprint",
    "evidenceFingerprint",
    "evidenceType",
    "hotelSelectionToken",
    "prebookTotal",
    "ratesTotal",
    "retrievedPrebookTotal",
  ];

  if (
    JSON.stringify(
      evidenceKeys
    ) !==
      JSON.stringify(
        expectedEvidenceKeys
      ) ||
    evidence.evidenceType !==
      "rates-prebook-get-prebook" ||
    evidenceFingerprint !==
      createPublicRateEvidenceFingerprintV3(
        withoutFingerprint
      ) ||
    evidence.decisionFingerprint !==
      input.decision.replay
        .decisionFingerprint ||
    input.comparable.status !==
      "recommended" ||
    input.comparable
      .selectedSolutionToken ===
      null ||
    evidence.hotelSelectionToken !==
      input.comparable
        .selectedSolutionToken ||
    !/^[A-Z]{3}$/.test(
      evidence.currency
    ) ||
    !finitePositiveAmount(
      evidence.ratesTotal
    ) ||
    !finitePositiveAmount(
      evidence.prebookTotal
    ) ||
    !finitePositiveAmount(
      evidence.retrievedPrebookTotal
    )
  ) {
    return "failed";
  }

  const selectedHotelId =
    input.decision
      .robustness
      .policyPreferredHotelId;

  const solution =
    selectedHotelId ===
      null
      ? null
      : findSingleSolutionForHotel(
          input.decision,
          selectedHotelId
        );

  if (
    solution ===
      null ||
    solution.totalCost
      .amount ===
      null ||
    solution.totalCost
      .currency !==
      evidence.currency
  ) {
    return "failed";
  }

  const amounts = [
    solution.totalCost
      .amount,
    evidence.ratesTotal,
    evidence.prebookTotal,
    evidence.retrievedPrebookTotal,
  ];

  return amounts.every(
    (
      amount,
      index
    ) =>
      index ===
        0 ||
      Math.abs(
        amount -
          amounts[
            index -
              1
          ]
      ) <=
        STAYOPTI_PUBLIC_RATE_MAX_DELTA_V3
  )
    ? "verified"
    : "failed";
}

function selectedRecommendationIsSafe(
  decision: StayOptiDecisionV3,
  comparable: StayOptiComparableDecisionV3
) {
  const robustness =
    decision.robustness;

  if (
    comparable.status !==
      "recommended"
  ) {
    return robustness.recommendationPolicy ===
      "abstain" &&
      robustness.policyPreferredHotelId ===
        null;
  }

  const selectedHotelId =
    robustness.policyPreferredHotelId;

  if (
    robustness.recommendationPolicy !==
      "recommend" ||
    selectedHotelId ===
      null ||
    selectedHotelId !==
      robustness.robustChoiceHotelId
  ) {
    return false;
  }

  const solution =
    findSingleSolutionForHotel(
      decision,
      selectedHotelId
    );

  const robustnessCandidate =
    robustness.candidates.find(
      (item) =>
        item.hotelId ===
          selectedHotelId
    ) ??
    null;

  return solution !==
      null &&
    solution.kind ===
      "single" &&
    solution.feasibility ===
      "feasible" &&
    robustnessCandidate
      ?.status ===
      "usable";
}

export function deriveIndependentShadowSafetySignalsV3(
  input: {
    decision: StayOptiDecisionV3;
    comparable: StayOptiComparableDecisionV3;
    publicRateEvidence?: StayOptiBoundPublicRateEvidenceInputV3;
    deterministicReplayMatches: boolean;
  }
): StayOptiShadowSafetySignalsV3 {
  const decisionValidation =
    validateStayOptiDecisionV3(
      input.decision
    );

  const recommendationSafe =
    decisionValidation.valid &&
    selectedRecommendationIsSafe(
      input.decision,
      input.comparable
    );

  return {
    priceIntegrity:
      derivePriceIntegrity(
        input.decision,
        input.comparable
      ),
    publicRateConsistency:
      deriveBoundPublicRateConsistencyV3({
        decision:
          input.decision,
        comparable:
          input.comparable,
        evidence:
          input.publicRateEvidence,
      }),
    commercialFirewall:
      evaluateCommercialFirewallV3(
        input.decision
      ).passed
        ? "pass"
        : "fail",
    privacyFirewall:
      findOutcomePiiViolationsV3(
        input.decision
      ).length ===
        0
        ? "pass"
        : "fail",
    deterministicReplay:
      input.deterministicReplayMatches
        ? "pass"
        : "fail",
    hardConstraints:
      recommendationSafe
        ? "pass"
        : "fail",
    recommendationSafety:
      recommendationSafe
        ? "pass"
        : "fail",
  };
}

export function runIndependentDecisionShadowV3(
  input: RunIndependentDecisionShadowInputV3
): RunIndependentDecisionShadowResultV3 {
  const v2Decision =
    createV2ComparableDecisionV3(
      input.publicV2Result
    );

  return runV3ShadowWithDerivedSafetySafelyV3({
    mode:
      input.mode ??
      "off",
    comparisonToken:
      input.comparisonToken,
    segment:
      input.segment,
    publicV2Result:
      input.publicV2Result,
    v2Decision,
    runV3: () => {
      const createDecision =
        () =>
          adaptV2SearchResultToDecisionV3({
            searchInput:
              input.searchInput,
            result:
              input.publicV2Result,
            policy:
              input.compatibilityPolicy,
          });

      const first =
        createDecision();

      const second =
        createDecision();

      const validation =
        validateStayOptiDecisionV3(
          first
        );

      if (
        !validation.valid
      ) {
        throw new Error(
          "Independent V3 shadow decision failed contract validation."
        );
      }

      const comparable =
        createIndependentV3ComparableDecisionV3(
          first,
          input.publicV2Result
            .recommendationRoles
            .bestChoiceHotelId
        );

      const replay =
        verifyDecisionReplayV3(
          first,
          second
        );

      return {
        decision:
          comparable,
        safety:
          deriveIndependentShadowSafetySignalsV3({
            decision:
              first,
            comparable,
            publicRateEvidence:
              input.publicRateEvidence,
            deterministicReplayMatches:
              replay.matches,
          }),
      };
    },
  });
}

export const STAYOPTI_INDEPENDENT_DECISION_AUDIT_V3 =
  Object.freeze({
    version:
      SMARTSTAY_INDEPENDENT_DECISION_VERSION_V3,
    application:
      "internal-shadow-only" as const,
    publicV2Unchanged:
      true as const,
    splitRecommendationEnabled:
      false as const,
  });
