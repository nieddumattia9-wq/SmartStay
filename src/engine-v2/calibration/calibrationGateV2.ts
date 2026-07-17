import {
  SMARTSTAY_GOLDEN_DATASET_V2,
  SMARTSTAY_GOLDEN_DATASET_VERSION_V2,
  getSmartStayGoldenDatasetFingerprintV2,
  validateSmartStayGoldenDatasetV2,
  type SmartStayGoldenComparisonDirectionV2,
  type SmartStayGoldenInvariantCodeV2,
  type SmartStayGoldenScenarioV2,
} from "../golden-dataset/goldenDatasetV2";

import type {
  SmartStayCounterfactualVerdictV2,
} from "../comparisons/counterfactualComparisonsEngine";

export type SmartStayCalibrationGateStatusV2 =
  | "pass"
  | "fail";

export type SmartStayCalibrationIssueSeverityV2 =
  | "blocking"
  | "warning";

export type SmartStayCalibrationMetricCodeV2 =
  | "scenario-coverage"
  | "role-accuracy"
  | "best-choice-safety"
  | "visible-recall"
  | "visible-order-accuracy"
  | "pairwise-order-accuracy"
  | "pareto-accuracy"
  | "near-duplicate-accuracy"
  | "counterfactual-accuracy"
  | "mutation-pass-rate"
  | "determinism-pass-rate";

export type SmartStayCalibrationIssueCodeV2 =
  | "dataset-version-mismatch"
  | "dataset-fingerprint-mismatch"
  | "duplicate-scenario-observation"
  | "unknown-scenario-observation"
  | "missing-scenario-observation"
  | "best-choice-mismatch"
  | "saving-role-mismatch"
  | "upgrade-role-mismatch"
  | "unexpected-best-choice"
  | "best-choice-candidate-missing"
  | "best-choice-not-eligible"
  | "best-choice-outside-budget"
  | "best-choice-distance-violation"
  | "best-choice-mandatory-violation"
  | "best-choice-reliability-violation"
  | "best-choice-risk-violation"
  | "forbidden-best-choice"
  | "pareto-dominated-best-choice"
  | "duplicate-visible-hotel"
  | "visible-additional-overlap"
  | "expected-visible-hotel-missing"
  | "visible-order-regression"
  | "expected-additional-hotel-missing"
  | "expected-pairwise-order-missing"
  | "expected-pareto-dominated-hotel-missing"
  | "near-duplicate-group-missing"
  | "near-duplicate-primary-mismatch"
  | "near-duplicate-members-mismatch"
  | "near-duplicate-visible-duplication"
  | "counterfactual-missing"
  | "counterfactual-verdict-mismatch"
  | "counterfactual-cost-direction-mismatch"
  | "counterfactual-utility-direction-mismatch"
  | "mutation-observation-missing"
  | "mutation-invariant-failed"
  | "determinism-evidence-missing"
  | "determinism-regression"
  | "metric-below-threshold";

export interface SmartStayCalibrationPairwiseOrderObservationV2 {
  higherHotelId:
    string;

  lowerHotelId:
    string;
}

export interface SmartStayCalibrationCounterfactualObservationV2 {
  selectedHotelId:
    string;

  alternativeHotelId:
    string;

  verdict:
    SmartStayCounterfactualVerdictV2;

  costDirection:
    SmartStayGoldenComparisonDirectionV2;

  utilityDirection:
    SmartStayGoldenComparisonDirectionV2;
}

export interface SmartStayCalibrationNearDuplicateObservationV2 {
  canonicalPropertyKey:
    string;

  primaryHotelId:
    string;

  memberHotelIds:
    string[];
}

export interface SmartStayCalibrationMutationObservationV2 {
  mutationId:
    string;

  passedInvariantCodes:
    SmartStayGoldenInvariantCodeV2[];

  failedInvariantCodes?:
    SmartStayGoldenInvariantCodeV2[];
}

export interface SmartStayCalibrationScenarioObservationV2 {
  scenarioId:
    string;

  bestChoiceHotelId:
    string | null;

  bestSensibleSavingHotelId:
    string | null;

  worthwhileComfortUpgradeHotelId:
    string | null;

  visibleHotelIds:
    string[];

  additionalHotelIds:
    string[];

  paretoDominatedHotelIds:
    string[];

  nearDuplicateGroups:
    SmartStayCalibrationNearDuplicateObservationV2[];

  pairwiseOrder:
    SmartStayCalibrationPairwiseOrderObservationV2[];

  counterfactuals:
    SmartStayCalibrationCounterfactualObservationV2[];

  mutationOutcomes:
    SmartStayCalibrationMutationObservationV2[];

  runFingerprints:
    string[];
}

export interface SmartStayCalibrationGateInputV2 {
  datasetVersion:
    string;

  datasetFingerprint:
    string;

  scenarios:
    SmartStayCalibrationScenarioObservationV2[];
}

export interface SmartStayCalibrationGateOptionsV2 {
  minimumScenarioCoverage?:
    number;

  minimumRoleAccuracy?:
    number;

  minimumBestChoiceSafety?:
    number;

  minimumVisibleRecall?:
    number;

  minimumVisibleOrderAccuracy?:
    number;

  minimumPairwiseOrderAccuracy?:
    number;

  minimumParetoAccuracy?:
    number;

  minimumNearDuplicateAccuracy?:
    number;

  minimumCounterfactualAccuracy?:
    number;

  minimumMutationPassRate?:
    number;

  minimumDeterminismPassRate?:
    number;

  requireAllScenarios?:
    boolean;

  requireDeterminismEvidence?:
    boolean;
}

export interface SmartStayCalibrationMetricV2 {
  code:
    SmartStayCalibrationMetricCodeV2;

  numerator:
    number;

  denominator:
    number;

  value:
    number;

  minimum:
    number;

  passed:
    boolean;
}

export interface SmartStayCalibrationIssueV2 {
  code:
    SmartStayCalibrationIssueCodeV2;

  severity:
    SmartStayCalibrationIssueSeverityV2;

  scenarioId:
    string | null;

  message:
    string;

  expected:
    string | number | boolean | null;

  actual:
    string | number | boolean | null;
}

export interface SmartStayCalibrationScenarioEvaluationV2 {
  scenarioId:
    string;

  passed:
    boolean;

  issueCodes:
    SmartStayCalibrationIssueCodeV2[];
}

export interface SmartStayCalibrationGateEvaluationV2 {
  status:
    SmartStayCalibrationGateStatusV2;

  datasetVersion:
    string;

  datasetFingerprint:
    string;

  metrics:
    SmartStayCalibrationMetricV2[];

  issues:
    SmartStayCalibrationIssueV2[];

  scenarios:
    SmartStayCalibrationScenarioEvaluationV2[];

  reasonCodes:
    string[];
}

type MetricAccumulator = {
  numerator:
    number;

  denominator:
    number;
};

type ResolvedOptions = Required<
  SmartStayCalibrationGateOptionsV2
>;

const DEFAULT_OPTIONS:
  ResolvedOptions = {
  minimumScenarioCoverage:
    1,

  minimumRoleAccuracy:
    1,

  minimumBestChoiceSafety:
    1,

  minimumVisibleRecall:
    1,

  minimumVisibleOrderAccuracy:
    1,

  minimumPairwiseOrderAccuracy:
    1,

  minimumParetoAccuracy:
    1,

  minimumNearDuplicateAccuracy:
    1,

  minimumCounterfactualAccuracy:
    1,

  minimumMutationPassRate:
    1,

  minimumDeterminismPassRate:
    1,

  requireAllScenarios:
    true,

  requireDeterminismEvidence:
    true,
};

const METRIC_ORDER:
  readonly SmartStayCalibrationMetricCodeV2[] = [
  "scenario-coverage",
  "role-accuracy",
  "best-choice-safety",
  "visible-recall",
  "visible-order-accuracy",
  "pairwise-order-accuracy",
  "pareto-accuracy",
  "near-duplicate-accuracy",
  "counterfactual-accuracy",
  "mutation-pass-rate",
  "determinism-pass-rate",
];

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}

function round(
  value:
    number,
  decimalPlaces =
    4
) {
  const factor =
    10 ** decimalPlaces;

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
    factor
  ) /
  factor;
}

function normalizeRatio(
  value:
    unknown,
  fallback:
    number
) {
  return (
    typeof value === "number" &&
    Number.isFinite(
      value
    )
  )
    ? clamp(
        value,
        0,
        1
      )
    : fallback;
}

function resolveOptions(
  options:
    SmartStayCalibrationGateOptionsV2
): ResolvedOptions {
  return {
    minimumScenarioCoverage:
      normalizeRatio(
        options.minimumScenarioCoverage,
        DEFAULT_OPTIONS
          .minimumScenarioCoverage
      ),

    minimumRoleAccuracy:
      normalizeRatio(
        options.minimumRoleAccuracy,
        DEFAULT_OPTIONS
          .minimumRoleAccuracy
      ),

    minimumBestChoiceSafety:
      normalizeRatio(
        options.minimumBestChoiceSafety,
        DEFAULT_OPTIONS
          .minimumBestChoiceSafety
      ),

    minimumVisibleRecall:
      normalizeRatio(
        options.minimumVisibleRecall,
        DEFAULT_OPTIONS
          .minimumVisibleRecall
      ),

    minimumVisibleOrderAccuracy:
      normalizeRatio(
        options.minimumVisibleOrderAccuracy,
        DEFAULT_OPTIONS
          .minimumVisibleOrderAccuracy
      ),

    minimumPairwiseOrderAccuracy:
      normalizeRatio(
        options.minimumPairwiseOrderAccuracy,
        DEFAULT_OPTIONS
          .minimumPairwiseOrderAccuracy
      ),

    minimumParetoAccuracy:
      normalizeRatio(
        options.minimumParetoAccuracy,
        DEFAULT_OPTIONS
          .minimumParetoAccuracy
      ),

    minimumNearDuplicateAccuracy:
      normalizeRatio(
        options.minimumNearDuplicateAccuracy,
        DEFAULT_OPTIONS
          .minimumNearDuplicateAccuracy
      ),

    minimumCounterfactualAccuracy:
      normalizeRatio(
        options.minimumCounterfactualAccuracy,
        DEFAULT_OPTIONS
          .minimumCounterfactualAccuracy
      ),

    minimumMutationPassRate:
      normalizeRatio(
        options.minimumMutationPassRate,
        DEFAULT_OPTIONS
          .minimumMutationPassRate
      ),

    minimumDeterminismPassRate:
      normalizeRatio(
        options.minimumDeterminismPassRate,
        DEFAULT_OPTIONS
          .minimumDeterminismPassRate
      ),

    requireAllScenarios:
      options.requireAllScenarios ??
      DEFAULT_OPTIONS
        .requireAllScenarios,

    requireDeterminismEvidence:
      options.requireDeterminismEvidence ??
      DEFAULT_OPTIONS
        .requireDeterminismEvidence,
  };
}

function compareStrings(
  first:
    string,
  second:
    string
) {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

function uniqueSorted(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values
    ),
  ].sort(
    compareStrings
  );
}

function sameStringSet(
  first:
    readonly string[],
  second:
    readonly string[]
) {
  const normalizedFirst =
    uniqueSorted(
      first
    );

  const normalizedSecond =
    uniqueSorted(
      second
    );

  return (
    normalizedFirst.length ===
      normalizedSecond.length &&
    normalizedFirst.every(
      (
        value,
        index
      ) =>
        value ===
        normalizedSecond[index]
    )
  );
}

function createMetricAccumulators() {
  return new Map<
    SmartStayCalibrationMetricCodeV2,
    MetricAccumulator
  >(
    METRIC_ORDER.map(
      (code) => [
        code,
        {
          numerator:
            0,

          denominator:
            0,
        },
      ]
    )
  );
}

function addMetricOutcome(
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  code:
    SmartStayCalibrationMetricCodeV2,
  passed:
    boolean,
  weight =
    1
) {
  const accumulator =
    accumulators.get(
      code
    );

  if (!accumulator) {
    throw new Error(
      `Unknown calibration metric: ${code}`
    );
  }

  accumulator.denominator +=
    weight;

  if (passed) {
    accumulator.numerator +=
      weight;
  }
}

function addIssue(
  issues:
    SmartStayCalibrationIssueV2[],
  input: {
    code:
      SmartStayCalibrationIssueCodeV2;

    severity?:
      SmartStayCalibrationIssueSeverityV2;

    scenarioId?:
      string | null;

    message:
      string;

    expected?:
      string | number | boolean | null;

    actual?:
      string | number | boolean | null;
  }
) {
  issues.push({
    code:
      input.code,

    severity:
      input.severity ??
      "blocking",

    scenarioId:
      input.scenarioId ??
      null,

    message:
      input.message,

    expected:
      input.expected ??
      null,

    actual:
      input.actual ??
      null,
  });
}

function normalizeHotelId(
  value:
    string | null
) {
  if (value === null) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

function normalizeObservation(
  observation:
    SmartStayCalibrationScenarioObservationV2
): SmartStayCalibrationScenarioObservationV2 {
  return {
    ...observation,

    scenarioId:
      observation.scenarioId
        .trim(),

    bestChoiceHotelId:
      normalizeHotelId(
        observation.bestChoiceHotelId
      ),

    bestSensibleSavingHotelId:
      normalizeHotelId(
        observation.bestSensibleSavingHotelId
      ),

    worthwhileComfortUpgradeHotelId:
      normalizeHotelId(
        observation
          .worthwhileComfortUpgradeHotelId
      ),

    visibleHotelIds:
      observation.visibleHotelIds.map(
        (hotelId) =>
          hotelId.trim()
      ),

    additionalHotelIds:
      observation.additionalHotelIds.map(
        (hotelId) =>
          hotelId.trim()
      ),

    paretoDominatedHotelIds:
      observation
        .paretoDominatedHotelIds
        .map(
          (hotelId) =>
            hotelId.trim()
        ),

    nearDuplicateGroups:
      observation
        .nearDuplicateGroups
        .map(
          (group) => ({
            canonicalPropertyKey:
              group
                .canonicalPropertyKey
                .trim(),

            primaryHotelId:
              group
                .primaryHotelId
                .trim(),

            memberHotelIds:
              group
                .memberHotelIds
                .map(
                  (hotelId) =>
                    hotelId.trim()
                ),
          })
        ),

    pairwiseOrder:
      observation
        .pairwiseOrder
        .map(
          (order) => ({
            higherHotelId:
              order
                .higherHotelId
                .trim(),

            lowerHotelId:
              order
                .lowerHotelId
                .trim(),
          })
        ),

    counterfactuals:
      observation
        .counterfactuals
        .map(
          (comparison) => ({
            ...comparison,

            selectedHotelId:
              comparison
                .selectedHotelId
                .trim(),

            alternativeHotelId:
              comparison
                .alternativeHotelId
                .trim(),
          })
        ),

    mutationOutcomes:
      observation
        .mutationOutcomes
        .map(
          (mutation) => ({
            ...mutation,

            mutationId:
              mutation.mutationId
                .trim(),

            passedInvariantCodes:
              [
                ...mutation
                  .passedInvariantCodes,
              ],

            failedInvariantCodes:
              [
                ...(
                  mutation
                    .failedInvariantCodes ??
                  []
                ),
              ],
          })
        ),

    runFingerprints:
      observation
        .runFingerprints
        .map(
          (fingerprint) =>
            fingerprint.trim()
        )
        .filter(
          Boolean
        ),
  };
}

function getMetricMinimum(
  code:
    SmartStayCalibrationMetricCodeV2,
  options:
    ResolvedOptions
) {
  switch (code) {
    case "scenario-coverage":
      return options
        .minimumScenarioCoverage;

    case "role-accuracy":
      return options
        .minimumRoleAccuracy;

    case "best-choice-safety":
      return options
        .minimumBestChoiceSafety;

    case "visible-recall":
      return options
        .minimumVisibleRecall;

    case "visible-order-accuracy":
      return options
        .minimumVisibleOrderAccuracy;

    case "pairwise-order-accuracy":
      return options
        .minimumPairwiseOrderAccuracy;

    case "pareto-accuracy":
      return options
        .minimumParetoAccuracy;

    case "near-duplicate-accuracy":
      return options
        .minimumNearDuplicateAccuracy;

    case "counterfactual-accuracy":
      return options
        .minimumCounterfactualAccuracy;

    case "mutation-pass-rate":
      return options
        .minimumMutationPassRate;

    case "determinism-pass-rate":
      return options
        .minimumDeterminismPassRate;
  }
}

function createMetrics(
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  options:
    ResolvedOptions
) {
  return METRIC_ORDER.map(
    (
      code
    ): SmartStayCalibrationMetricV2 => {
      const accumulator =
        accumulators.get(
          code
        ) ?? {
          numerator:
            0,

          denominator:
            0,
        };

      const value =
        accumulator.denominator >
        0
          ? accumulator.numerator /
            accumulator.denominator
          : 1;

      const minimum =
        getMetricMinimum(
          code,
          options
        );

      return {
        code,

        numerator:
          round(
            accumulator.numerator,
            4
          ),

        denominator:
          round(
            accumulator.denominator,
            4
          ),

        value:
          round(
            value,
            4
          ),

        minimum:
          round(
            minimum,
            4
          ),

        passed:
          value + 1e-12 >=
          minimum,
      };
    }
  );
}

function evaluateRole(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  input: {
    label:
      "best-choice" |
      "best-sensible-saving" |
      "worthwhile-comfort-upgrade";

    expected:
      string | null;

    actual:
      string | null;

    issueCode:
      | "best-choice-mismatch"
      | "saving-role-mismatch"
      | "upgrade-role-mismatch";
  },
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const passed =
    input.expected ===
    input.actual;

  addMetricOutcome(
    accumulators,
    "role-accuracy",
    passed
  );

  if (!passed) {
    addIssue(
      issues,
      {
        code:
          input.issueCode,

        scenarioId:
          scenario.id,

        message:
          `${input.label} does not match the Golden Dataset expectation.`,

        expected:
          input.expected,

        actual:
          input.actual,
      }
    );
  }

  if (
    input.label ===
      "best-choice" &&
    input.expected ===
      null &&
    input.actual !==
      null
  ) {
    addIssue(
      issues,
      {
        code:
          "unexpected-best-choice",

        scenarioId:
          scenario.id,

        message:
          "A Best Choice was returned even though no compliant within-budget primary choice is expected.",

        expected:
          null,

        actual:
          input.actual,
      }
    );
  }

  void observation;
}

function evaluateBestChoiceSafety(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const hotelId =
    observation
      .bestChoiceHotelId;

  if (hotelId === null) {
    const noCompliantCandidateExpected =
      scenario
        .expectations
        .bestChoiceHotelId ===
      null;

    addMetricOutcome(
      accumulators,
      "best-choice-safety",
      noCompliantCandidateExpected
    );

    return;
  }

  const candidate =
    scenario.candidates.find(
      (entry) =>
        entry.hotelId ===
        hotelId
    ) ??
    null;

  if (!candidate) {
    addMetricOutcome(
      accumulators,
      "best-choice-safety",
      false
    );

    addIssue(
      issues,
      {
        code:
          "best-choice-candidate-missing",

        scenarioId:
          scenario.id,

        message:
          "Observed Best Choice does not exist in the Golden Dataset scenario.",

        expected:
          "known-candidate",

        actual:
          hotelId,
      }
    );

    return;
  }

  const checks: {
    passed:
      boolean;

    code:
      SmartStayCalibrationIssueCodeV2;

    message:
      string;

    expected:
      string | number | boolean | null;

    actual:
      string | number | boolean | null;
  }[] = [
    {
      passed:
        candidate
          .eligibleForPrimaryRanking ===
        true,

      code:
        "best-choice-not-eligible",

      message:
        "Best Choice is not eligible for primary ranking.",

      expected:
        true,

      actual:
        candidate
          .eligibleForPrimaryRanking,
    },

    {
      passed:
        candidate.withinBudget ===
        true,

      code:
        "best-choice-outside-budget",

      message:
        "Best Choice is not verified within budget.",

      expected:
        true,

      actual:
        candidate.withinBudget,
    },

    {
      passed:
        candidate
          .distanceConstraintSatisfied !==
        false,

      code:
        "best-choice-distance-violation",

      message:
        "Best Choice violates the explicit distance constraint.",

      expected:
        true,

      actual:
        candidate
          .distanceConstraintSatisfied,
    },

    {
      passed:
        candidate
          .mandatoryRequirementsSatisfied ===
        true,

      code:
        "best-choice-mandatory-violation",

      message:
        "Best Choice violates a mandatory requirement.",

      expected:
        true,

      actual:
        candidate
          .mandatoryRequirementsSatisfied,
    },

    {
      passed:
        candidate
          .reliabilityStatus !==
          "invalid" &&
        candidate
          .reliabilityStatus !==
          "low-confidence",

      code:
        "best-choice-reliability-violation",

      message:
        "Best Choice has an invalid or low-confidence reliability status.",

      expected:
        "usable-or-strong-data",

      actual:
        candidate
          .reliabilityStatus,
    },

    {
      passed:
        candidate.riskLevel !==
        "high",

      code:
        "best-choice-risk-violation",

      message:
        "Best Choice has high risk.",

      expected:
        "low-or-medium",

      actual:
        candidate.riskLevel,
    },

    {
      passed:
        !scenario
          .expectations
          .mustNotBeBestChoiceHotelIds
          .includes(
            hotelId
          ),

      code:
        "forbidden-best-choice",

      message:
        "Best Choice belongs to the explicit must-not-win set.",

      expected:
        false,

      actual:
        true,
    },

    {
      passed:
        !scenario
          .expectations
          .paretoDominatedHotelIds
          .includes(
            hotelId
          ),

      code:
        "pareto-dominated-best-choice",

      message:
        "Best Choice is Pareto dominated in the Golden Dataset.",

      expected:
        false,

      actual:
        true,
    },
  ];

  for (
    const check
    of checks
  ) {
    addMetricOutcome(
      accumulators,
      "best-choice-safety",
      check.passed
    );

    if (!check.passed) {
      addIssue(
        issues,
        {
          code:
            check.code,

          scenarioId:
            scenario.id,

          message:
            check.message,

          expected:
            check.expected,

          actual:
            check.actual,
        }
      );
    }
  }
}

function evaluateVisibleResults(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const visibleIds =
    observation.visibleHotelIds;

  const additionalIds =
    observation.additionalHotelIds;

  const visibleSet =
    new Set(
      visibleIds
    );

  const additionalSet =
    new Set(
      additionalIds
    );

  if (
    visibleSet.size !==
    visibleIds.length
  ) {
    addIssue(
      issues,
      {
        code:
          "duplicate-visible-hotel",

        scenarioId:
          scenario.id,

        message:
          "Visible ranking contains duplicate hotel ids.",

        expected:
          visibleSet.size,

        actual:
          visibleIds.length,
      }
    );
  }

  const overlap =
    visibleIds.filter(
      (hotelId) =>
        additionalSet.has(
          hotelId
        )
    );

  if (overlap.length > 0) {
    addIssue(
      issues,
      {
        code:
          "visible-additional-overlap",

        scenarioId:
          scenario.id,

        message:
          "Visible and additional result sets overlap.",

        expected:
          0,

        actual:
          overlap.length,
      }
    );
  }

  for (
    const expectedHotelId
    of scenario
      .expectations
      .visibleHotelIds
  ) {
    const present =
      visibleSet.has(
        expectedHotelId
      );

    addMetricOutcome(
      accumulators,
      "visible-recall",
      present
    );

    if (!present) {
      addIssue(
        issues,
        {
          code:
            "expected-visible-hotel-missing",

          scenarioId:
            scenario.id,

          message:
            "Expected visible hotel is missing.",

          expected:
            expectedHotelId,

          actual:
            null,
        }
      );
    }
  }

  for (
    const expectedHotelId
    of scenario
      .expectations
      .additionalHotelIds
  ) {
    if (
      !additionalSet.has(
        expectedHotelId
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "expected-additional-hotel-missing",

          severity:
            "warning",

          scenarioId:
            scenario.id,

          message:
            "Expected additional hotel is missing.",

          expected:
            expectedHotelId,

          actual:
            null,
        }
      );
    }
  }

  const expectedVisibleOrder =
    scenario
      .expectations
      .visibleHotelIds;

  for (
    let firstIndex = 0;
    firstIndex <
      expectedVisibleOrder.length;
    firstIndex++
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        expectedVisibleOrder.length;
      secondIndex++
    ) {
      const firstHotelId =
        expectedVisibleOrder[
          firstIndex
        ];

      const secondHotelId =
        expectedVisibleOrder[
          secondIndex
        ];

      const actualFirstIndex =
        visibleIds.indexOf(
          firstHotelId
        );

      const actualSecondIndex =
        visibleIds.indexOf(
          secondHotelId
        );

      const passed =
        actualFirstIndex >=
          0 &&
        actualSecondIndex >=
          0 &&
        actualFirstIndex <
          actualSecondIndex;

      addMetricOutcome(
        accumulators,
        "visible-order-accuracy",
        passed
      );

      if (!passed) {
        addIssue(
          issues,
          {
            code:
              "visible-order-regression",

            severity:
              "warning",

            scenarioId:
              scenario.id,

            message:
              "Expected visible ordering was not preserved.",

            expected:
              `${firstHotelId}>${secondHotelId}`,

            actual:
              actualFirstIndex >=
                0 &&
              actualSecondIndex >=
                0
                ? `${
                    actualFirstIndex <
                    actualSecondIndex
                      ? firstHotelId
                      : secondHotelId
                  }>${
                    actualFirstIndex <
                    actualSecondIndex
                      ? secondHotelId
                      : firstHotelId
                  }`
                : "missing",
          }
        );
      }
    }
  }
}

function evaluatePairwiseOrder(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const observedPairs =
    new Set(
      observation
        .pairwiseOrder
        .map(
          (order) =>
            `${order.higherHotelId}>${order.lowerHotelId}`
        )
    );

  for (
    const expected
    of scenario
      .expectations
      .pairwiseOrder
  ) {
    const signature =
      `${expected.higherHotelId}>${expected.lowerHotelId}`;

    const passed =
      observedPairs.has(
        signature
      );

    addMetricOutcome(
      accumulators,
      "pairwise-order-accuracy",
      passed
    );

    if (!passed) {
      addIssue(
        issues,
        {
          code:
            "expected-pairwise-order-missing",

          scenarioId:
            scenario.id,

          message:
            "Expected pairwise ordering is missing.",

          expected:
            signature,

          actual:
            null,
        }
      );
    }
  }
}

function evaluatePareto(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const actualDominated =
    new Set(
      observation
        .paretoDominatedHotelIds
    );

  for (
    const expectedHotelId
    of scenario
      .expectations
      .paretoDominatedHotelIds
  ) {
    const passed =
      actualDominated.has(
        expectedHotelId
      );

    addMetricOutcome(
      accumulators,
      "pareto-accuracy",
      passed
    );

    if (!passed) {
      addIssue(
        issues,
        {
          code:
            "expected-pareto-dominated-hotel-missing",

          scenarioId:
            scenario.id,

          message:
            "Expected Pareto-dominated hotel was not reported.",

          expected:
            expectedHotelId,

          actual:
            null,
        }
      );
    }
  }
}

function evaluateNearDuplicates(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const visibleSet =
    new Set(
      observation.visibleHotelIds
    );

  for (
    const expectedGroup
    of scenario
      .expectations
      .nearDuplicateGroups
  ) {
    const actualGroup =
      observation
        .nearDuplicateGroups
        .find(
          (group) =>
            group
              .canonicalPropertyKey ===
            expectedGroup
              .canonicalPropertyKey
        ) ??
      null;

    const present =
      actualGroup !==
      null;

    addMetricOutcome(
      accumulators,
      "near-duplicate-accuracy",
      present
    );

    if (!actualGroup) {
      addIssue(
        issues,
        {
          code:
            "near-duplicate-group-missing",

          scenarioId:
            scenario.id,

          message:
            "Expected near-duplicate group is missing.",

          expected:
            expectedGroup
              .canonicalPropertyKey,

          actual:
            null,
        }
      );

      continue;
    }

    const primaryMatches =
      actualGroup
        .primaryHotelId ===
      expectedGroup
        .primaryHotelId;

    addMetricOutcome(
      accumulators,
      "near-duplicate-accuracy",
      primaryMatches
    );

    if (!primaryMatches) {
      addIssue(
        issues,
        {
          code:
            "near-duplicate-primary-mismatch",

          scenarioId:
            scenario.id,

          message:
            "Near-duplicate primary hotel does not match.",

          expected:
            expectedGroup
              .primaryHotelId,

          actual:
            actualGroup
              .primaryHotelId,
        }
      );
    }

    const membersMatch =
      sameStringSet(
        actualGroup
          .memberHotelIds,
        expectedGroup
          .memberHotelIds
      );

    addMetricOutcome(
      accumulators,
      "near-duplicate-accuracy",
      membersMatch
    );

    if (!membersMatch) {
      addIssue(
        issues,
        {
          code:
            "near-duplicate-members-mismatch",

          scenarioId:
            scenario.id,

          message:
            "Near-duplicate member set does not match.",

          expected:
            uniqueSorted(
              expectedGroup
                .memberHotelIds
            ).join(
              ","
            ),

          actual:
            uniqueSorted(
              actualGroup
                .memberHotelIds
            ).join(
              ","
            ),
        }
      );
    }

    const visibleMembers =
      actualGroup
        .memberHotelIds
        .filter(
          (hotelId) =>
            visibleSet.has(
              hotelId
            )
        );

    const visibleGroupingPass =
      visibleMembers.length <=
        1 &&
      (
        visibleMembers.length ===
          0 ||
        visibleMembers[0] ===
          actualGroup
            .primaryHotelId
      );

    addMetricOutcome(
      accumulators,
      "near-duplicate-accuracy",
      visibleGroupingPass
    );

    if (!visibleGroupingPass) {
      addIssue(
        issues,
        {
          code:
            "near-duplicate-visible-duplication",

          scenarioId:
            scenario.id,

          message:
            "More than one offer for the same property is visible.",

          expected:
            1,

          actual:
            visibleMembers.length,
        }
      );
    }
  }
}

function evaluateCounterfactuals(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  for (
    const expected
    of scenario
      .expectations
      .counterfactuals
  ) {
    const actual =
      observation
        .counterfactuals
        .find(
          (comparison) =>
            comparison
              .selectedHotelId ===
              expected
                .selectedHotelId &&
            comparison
              .alternativeHotelId ===
              expected
                .alternativeHotelId
        ) ??
      null;

    if (!actual) {
      addMetricOutcome(
        accumulators,
        "counterfactual-accuracy",
        false,
        3
      );

      addIssue(
        issues,
        {
          code:
            "counterfactual-missing",

          scenarioId:
            scenario.id,

          message:
            "Expected counterfactual comparison is missing.",

          expected:
            `${expected.selectedHotelId}->${expected.alternativeHotelId}`,

          actual:
            null,
        }
      );

      continue;
    }

    const checks: {
      passed:
        boolean;

      code:
        SmartStayCalibrationIssueCodeV2;

      message:
        string;

      expected:
        string;

      actual:
        string;
    }[] = [
      {
        passed:
          actual.verdict ===
          expected.verdict,

        code:
          "counterfactual-verdict-mismatch",

        message:
          "Counterfactual verdict does not match.",

        expected:
          expected.verdict,

        actual:
          actual.verdict,
      },

      {
        passed:
          actual
            .costDirection ===
          expected
            .expectedCostDirection,

        code:
          "counterfactual-cost-direction-mismatch",

        message:
          "Counterfactual cost direction does not match.",

        expected:
          expected
            .expectedCostDirection,

        actual:
          actual
            .costDirection,
      },

      {
        passed:
          actual
            .utilityDirection ===
          expected
            .expectedUtilityDirection,

        code:
          "counterfactual-utility-direction-mismatch",

        message:
          "Counterfactual utility direction does not match.",

        expected:
          expected
            .expectedUtilityDirection,

        actual:
          actual
            .utilityDirection,
      },
    ];

    for (
      const check
      of checks
    ) {
      addMetricOutcome(
        accumulators,
        "counterfactual-accuracy",
        check.passed
      );

      if (!check.passed) {
        addIssue(
          issues,
          {
            code:
              check.code,

            scenarioId:
              scenario.id,

            message:
              check.message,

            expected:
              check.expected,

            actual:
              check.actual,
          }
        );
      }
    }
  }
}

function evaluateMutations(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  for (
    const expected
    of scenario.mutations
  ) {
    const actual =
      observation
        .mutationOutcomes
        .find(
          (outcome) =>
            outcome
              .mutationId ===
            expected.id
        ) ??
      null;

    if (!actual) {
      addMetricOutcome(
        accumulators,
        "mutation-pass-rate",
        false,
        expected
          .expectationCodes
          .length
      );

      addIssue(
        issues,
        {
          code:
            "mutation-observation-missing",

          scenarioId:
            scenario.id,

          message:
            "Expected metamorphic mutation outcome is missing.",

          expected:
            expected.id,

          actual:
            null,
        }
      );

      continue;
    }

    const passedSet =
      new Set(
        actual
          .passedInvariantCodes
      );

    const failedSet =
      new Set(
        actual
          .failedInvariantCodes ??
        []
      );

    for (
      const invariant
      of expected
        .expectationCodes
    ) {
      const passed =
        passedSet.has(
          invariant
        ) &&
        !failedSet.has(
          invariant
        );

      addMetricOutcome(
        accumulators,
        "mutation-pass-rate",
        passed
      );

      if (!passed) {
        addIssue(
          issues,
          {
            code:
              "mutation-invariant-failed",

            scenarioId:
              scenario.id,

            message:
              "Metamorphic mutation failed an expected invariant.",

            expected:
              invariant,

            actual:
              expected.id,
          }
        );
      }
    }
  }
}

function evaluateDeterminism(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  options:
    ResolvedOptions,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const fingerprints =
    observation
      .runFingerprints;

  if (
    fingerprints.length <
    2
  ) {
    const passed =
      !options
        .requireDeterminismEvidence;

    addMetricOutcome(
      accumulators,
      "determinism-pass-rate",
      passed
    );

    if (!passed) {
      addIssue(
        issues,
        {
          code:
            "determinism-evidence-missing",

          scenarioId:
            scenario.id,

          message:
            "At least two deterministic run fingerprints are required.",

          expected:
            2,

          actual:
            fingerprints.length,
        }
      );
    }

    return;
  }

  const passed =
    new Set(
      fingerprints
    ).size ===
    1;

  addMetricOutcome(
    accumulators,
    "determinism-pass-rate",
    passed
  );

  if (!passed) {
    addIssue(
      issues,
      {
        code:
          "determinism-regression",

        scenarioId:
          scenario.id,

        message:
          "Repeated runs produced different fingerprints.",

        expected:
          1,

        actual:
          new Set(
            fingerprints
          ).size,
      }
    );
  }
}

function evaluateScenario(
  scenario:
    SmartStayGoldenScenarioV2,
  observation:
    SmartStayCalibrationScenarioObservationV2,
  options:
    ResolvedOptions,
  accumulators:
    Map<
      SmartStayCalibrationMetricCodeV2,
      MetricAccumulator
    >,
  issues:
    SmartStayCalibrationIssueV2[]
) {
  const issueStart =
    issues.length;

  evaluateRole(
    scenario,
    observation,
    {
      label:
        "best-choice",

      expected:
        scenario
          .expectations
          .bestChoiceHotelId,

      actual:
        observation
          .bestChoiceHotelId,

      issueCode:
        "best-choice-mismatch",
    },
    accumulators,
    issues
  );

  evaluateRole(
    scenario,
    observation,
    {
      label:
        "best-sensible-saving",

      expected:
        scenario
          .expectations
          .bestSensibleSavingHotelId,

      actual:
        observation
          .bestSensibleSavingHotelId,

      issueCode:
        "saving-role-mismatch",
    },
    accumulators,
    issues
  );

  evaluateRole(
    scenario,
    observation,
    {
      label:
        "worthwhile-comfort-upgrade",

      expected:
        scenario
          .expectations
          .worthwhileComfortUpgradeHotelId,

      actual:
        observation
          .worthwhileComfortUpgradeHotelId,

      issueCode:
        "upgrade-role-mismatch",
    },
    accumulators,
    issues
  );

  evaluateBestChoiceSafety(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluateVisibleResults(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluatePairwiseOrder(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluatePareto(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluateNearDuplicates(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluateCounterfactuals(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluateMutations(
    scenario,
    observation,
    accumulators,
    issues
  );

  evaluateDeterminism(
    scenario,
    observation,
    options,
    accumulators,
    issues
  );

  const scenarioIssues =
    issues
      .slice(
        issueStart
      )
      .filter(
        (issue) =>
          issue.scenarioId ===
          scenario.id &&
          issue.severity ===
          "blocking"
      );

  return {
    scenarioId:
      scenario.id,

    passed:
      scenarioIssues.length ===
      0,

    issueCodes:
      uniqueSorted(
        scenarioIssues.map(
          (issue) =>
            issue.code
        )
      ) as SmartStayCalibrationIssueCodeV2[],
  };
}

export function evaluateSmartStayCalibrationGateV2(
  input:
    SmartStayCalibrationGateInputV2,
  options:
    SmartStayCalibrationGateOptionsV2 = {}
): SmartStayCalibrationGateEvaluationV2 {
  const resolvedOptions =
    resolveOptions(
      options
    );

  validateSmartStayGoldenDatasetV2(
    SMARTSTAY_GOLDEN_DATASET_V2
  );

  const expectedFingerprint =
    getSmartStayGoldenDatasetFingerprintV2(
      SMARTSTAY_GOLDEN_DATASET_V2
    );

  const issues:
    SmartStayCalibrationIssueV2[] = [];

  const accumulators =
    createMetricAccumulators();

  if (
    input.datasetVersion !==
    SMARTSTAY_GOLDEN_DATASET_VERSION_V2
  ) {
    addIssue(
      issues,
      {
        code:
          "dataset-version-mismatch",

        message:
          "Calibration input uses a different Golden Dataset version.",

        expected:
          SMARTSTAY_GOLDEN_DATASET_VERSION_V2,

        actual:
          input.datasetVersion,
      }
    );
  }

  if (
    input.datasetFingerprint !==
    expectedFingerprint
  ) {
    addIssue(
      issues,
      {
        code:
          "dataset-fingerprint-mismatch",

        message:
          "Calibration input does not match the current Golden Dataset fingerprint.",

        expected:
          expectedFingerprint,

        actual:
          input.datasetFingerprint,
      }
    );
  }

  const observationsByScenarioId =
    new Map<
      string,
      SmartStayCalibrationScenarioObservationV2
    >();

  for (
    const rawObservation
    of input.scenarios
  ) {
    const observation =
      normalizeObservation(
        rawObservation
      );

    if (
      observationsByScenarioId.has(
        observation.scenarioId
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "duplicate-scenario-observation",

          scenarioId:
            observation.scenarioId,

          message:
            "Calibration input contains duplicate scenario observations.",

          expected:
            1,

          actual:
            2,
        }
      );

      continue;
    }

    observationsByScenarioId.set(
      observation.scenarioId,
      observation
    );
  }

  const knownScenarioIds =
    new Set(
      SMARTSTAY_GOLDEN_DATASET_V2
        .map(
          (scenario) =>
            scenario.id
        )
    );

  for (
    const scenarioId
    of observationsByScenarioId
      .keys()
  ) {
    if (
      !knownScenarioIds.has(
        scenarioId
      )
    ) {
      addIssue(
        issues,
        {
          code:
            "unknown-scenario-observation",

          scenarioId,

          message:
            "Calibration input contains an unknown scenario.",

          expected:
            "known-scenario",

          actual:
            scenarioId,
        }
      );
    }
  }

  const scenarioEvaluations:
    SmartStayCalibrationScenarioEvaluationV2[] = [];

  for (
    const scenario
    of SMARTSTAY_GOLDEN_DATASET_V2
  ) {
    const observation =
      observationsByScenarioId.get(
        scenario.id
      ) ??
      null;

    const observed =
      observation !==
      null;

    addMetricOutcome(
      accumulators,
      "scenario-coverage",
      observed
    );

    if (!observation) {
      if (
        resolvedOptions
          .requireAllScenarios
      ) {
        addIssue(
          issues,
          {
            code:
              "missing-scenario-observation",

            scenarioId:
              scenario.id,

            message:
              "Golden Dataset scenario has no calibration observation.",

            expected:
              true,

            actual:
              false,
          }
        );
      }

      scenarioEvaluations.push({
        scenarioId:
          scenario.id,

        passed:
          !resolvedOptions
            .requireAllScenarios,

        issueCodes:
          resolvedOptions
            .requireAllScenarios
            ? [
                "missing-scenario-observation",
              ]
            : [],
      });

      continue;
    }

    scenarioEvaluations.push(
      evaluateScenario(
        scenario,
        observation,
        resolvedOptions,
        accumulators,
        issues
      )
    );
  }

  const metrics =
    createMetrics(
      accumulators,
      resolvedOptions
    );

  for (
    const metric
    of metrics
  ) {
    if (!metric.passed) {
      addIssue(
        issues,
        {
          code:
            "metric-below-threshold",

          message:
            `Calibration metric ${metric.code} is below its minimum threshold.`,

          expected:
            metric.minimum,

          actual:
            metric.value,
        }
      );
    }
  }

  const normalizedIssues =
    issues
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first.scenarioId ??
              "",
            second.scenarioId ??
              ""
          ) ||
          compareStrings(
            first.code,
            second.code
          ) ||
          compareStrings(
            first.message,
            second.message
          )
      );

  const blockingIssues =
    normalizedIssues.filter(
      (issue) =>
        issue.severity ===
        "blocking"
    );

  const status:
    SmartStayCalibrationGateStatusV2 =
      blockingIssues.length ===
      0
        ? "pass"
        : "fail";

  const reasonCodes =
    uniqueSorted([
      status === "pass"
        ? "calibration-gate-pass"
        : "calibration-gate-fail",

      input.datasetVersion ===
        SMARTSTAY_GOLDEN_DATASET_VERSION_V2
        ? "calibration-dataset-version-matched"
        : "calibration-dataset-version-mismatch",

      input.datasetFingerprint ===
        expectedFingerprint
        ? "calibration-dataset-fingerprint-matched"
        : "calibration-dataset-fingerprint-mismatch",

      metrics.every(
        (metric) =>
          metric.passed
      )
        ? "calibration-metrics-passed"
        : "calibration-metrics-failed",

      scenarioEvaluations.every(
        (scenario) =>
          scenario.passed
      )
        ? "calibration-scenarios-passed"
        : "calibration-scenarios-failed",
    ]);

  return {
    status,

    datasetVersion:
      SMARTSTAY_GOLDEN_DATASET_VERSION_V2,

    datasetFingerprint:
      expectedFingerprint,

    metrics,

    issues:
      normalizedIssues,

    scenarios:
      scenarioEvaluations.sort(
        (
          first,
          second
        ) =>
          compareStrings(
            first.scenarioId,
            second.scenarioId
          )
      ),

    reasonCodes,
  };
}

export function assertSmartStayCalibrationPassedV2(
  evaluation:
    SmartStayCalibrationGateEvaluationV2
) {
  if (
    evaluation.status ===
    "pass"
  ) {
    return;
  }

  const blockingIssues =
    evaluation.issues.filter(
      (issue) =>
        issue.severity ===
        "blocking"
    );

  throw new Error(
    [
      "SmartStay Calibration Gate V2 failed:",
      ...blockingIssues.map(
        (issue) =>
          [
            "-",
            issue.scenarioId
              ? `[${issue.scenarioId}]`
              : "[global]",
            issue.code,
            issue.message,
          ].join(
            " "
          )
      ),
    ].join(
      "\n"
    )
  );
}

export function formatSmartStayCalibrationReportV2(
  evaluation:
    SmartStayCalibrationGateEvaluationV2
) {
  const metricLines =
    evaluation.metrics.map(
      (metric) =>
        [
          metric.passed
            ? "PASS"
            : "FAIL",
          metric.code,
          `${(
            metric.value *
            100
          ).toFixed(1)}%`,
          `(min ${(
            metric.minimum *
            100
          ).toFixed(1)}%)`,
        ].join(
          " - "
        )
    );

  const issueLines =
    evaluation.issues.length ===
    0
      ? [
          "No calibration issues.",
        ]
      : evaluation.issues.map(
          (issue) =>
            [
              issue.severity
                .toUpperCase(),
              issue.scenarioId ??
                "global",
              issue.code,
              issue.message,
            ].join(
              " - "
            )
        );

  return [
    `SMARTSTAY CALIBRATION GATE V2: ${evaluation.status.toUpperCase()}`,
    `Dataset: ${evaluation.datasetVersion}`,
    `Fingerprint: ${evaluation.datasetFingerprint}`,
    "",
    ...metricLines,
    "",
    ...issueLines,
  ].join(
    "\n"
  );
}