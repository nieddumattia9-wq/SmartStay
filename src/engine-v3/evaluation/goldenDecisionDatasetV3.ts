import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";
import {
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
  type StayOptiRolePolicyProfileV3,
} from "../policy/personalUtilityRolePolicyV3";

export const STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3 =
  "3.0.0-golden-decision-dataset.1" as const;

export const STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3 =
  "3.0.0-golden-decision-dataset-schema.1" as const;

export const STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_VERSION_V3 =
  "3.0.0-golden-external-baseline-registry.1" as const;

export const STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_SCHEMA_VERSION_V3 =
  "3.0.0-golden-external-baseline-registry-schema.1" as const;

export const STAYOPTI_GOLDEN_DECISION_CASE_KINDS_V3 = [
  "baseline",
  "adversarial",
  "counterfactual",
] as const;

export const STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3 = [
  "urban-short-budget",
  "urban-long-comfort",
  "leisure-short-balanced",
  "leisure-long-savings",
  "uncertain-evidence",
] as const;

export const STAYOPTI_GOLDEN_DECISION_ROLES_V3 = [
  "best-choice",
  "best-sensible-saving",
  "worthwhile-comfort-upgrade",
] as const;

export const STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3 = Object.freeze({
  goldenCases: 200,
  adversarialCases: 40,
  counterfactualCases: 40,
  humanBlindJudgments: 300,
  expertBlindJudgments: 100,
  evaluableAbstentions: 20,
  providerNeutralReplays: 100,
});

export const STAYOPTI_GOLDEN_DATASET_THRESHOLDS_V3 = Object.freeze({
  normalizedRegretV3Maximum: 0.2,
  regretImprovementOverV2Minimum: 0.02,
  humanPairwiseWinRateV3Minimum: 0.55,
  expertPairwiseWinRateV3Minimum: 0.55,
  expectedCalibrationErrorV3Maximum: 0.1,
  abstentionPrecisionMinimum: 0.8,
  robustChoiceRateMinimum: 0.8,
  instabilityRateMaximum: 0.1,
  maximumSegmentRegretGap: 0.1,
  maximumProviderDependenceGap: 0.05,
  criticalRegressionsMaximum: 0,
});

export type StayOptiGoldenDecisionCaseKindV3 =
  typeof STAYOPTI_GOLDEN_DECISION_CASE_KINDS_V3[number];

export type StayOptiGoldenDecisionSegmentV3 =
  typeof STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3[number];

export type StayOptiGoldenDecisionRoleV3 =
  typeof STAYOPTI_GOLDEN_DECISION_ROLES_V3[number];

export type StayOptiGoldenStatisticalEligibilityV3 =
  | "eligible"
  | "diagnostic-only";

export type StayOptiGoldenCaseOriginV3 =
  | "real-search-snapshot"
  | "adversarial-derived"
  | "counterfactual-derived"
  | "legacy-diagnostic";

export type StayOptiGoldenEvaluatorClassV3 = "human" | "expert";

export type StayOptiGoldenBlindPreferenceV3 =
  | "v2"
  | "v3"
  | "tie"
  | "abstain";

export interface StayOptiGoldenDecisionMeasurementV3 {
  normalizedRegretV2: number;
  normalizedRegretV3: number;
  predictedConfidenceV2: number;
  predictedConfidenceV3: number;
  outcomeCorrectV2: boolean;
  outcomeCorrectV3: boolean;
  v3Abstained: boolean;
  abstentionWarranted: boolean;
  v3RobustChoice: boolean;
  v3Unstable: boolean;
  providerNeutralReplay: boolean;
  providerDependenceGap: number;
  criticalRegression: boolean;
  adjudicationFingerprint: string;
}

export interface StayOptiGoldenDecisionCaseV3 {
  caseId: string;
  statisticalEligibility: StayOptiGoldenStatisticalEligibilityV3;
  kind: StayOptiGoldenDecisionCaseKindV3;
  origin: StayOptiGoldenCaseOriginV3;
  profile: StayOptiRolePolicyProfileV3;
  segment: StayOptiGoldenDecisionSegmentV3;
  role: StayOptiGoldenDecisionRoleV3;
  parentCaseId: string | null;
  externalParentReference?: StayOptiGoldenExternalParentReferenceV3 | null;
  technicalDiagnosticOnly?: true;
  sourceEvidenceFingerprints: string[];
  measurement: StayOptiGoldenDecisionMeasurementV3 | null;
}

export interface StayOptiGoldenExternalParentReferenceV3 {
  registryId: string;
  caseId: string;
  contentHash: string;
  datasetVersion: string;
  schemaVersion: string;
}

export interface StayOptiGoldenExternalBaselineRegistryEntryV3 {
  caseId: string;
  contentHash: string;
  datasetVersion: string;
  schemaVersion: string;
  kind: "baseline";
  statisticalEligibility: StayOptiGoldenStatisticalEligibilityV3;
}

export interface StayOptiGoldenExternalBaselineRegistryInputV3 {
  registryId: string;
  entries: StayOptiGoldenExternalBaselineRegistryEntryV3[];
}

export interface StayOptiGoldenExternalBaselineRegistryV3
  extends StayOptiGoldenExternalBaselineRegistryInputV3 {
  registryVersion: typeof STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_VERSION_V3;
  schemaVersion: typeof STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_SCHEMA_VERSION_V3;
  application: "offline-canonical-parent-resolution-only";
  fingerprint: string;
}

export interface StayOptiGoldenDecisionDatasetValidationOptionsV3 {
  externalParentRegistry?: StayOptiGoldenExternalBaselineRegistryV3;
}

export interface StayOptiGoldenBlindJudgmentV3 {
  judgmentId: string;
  caseId: string;
  role: StayOptiGoldenDecisionRoleV3;
  evaluatorClass: StayOptiGoldenEvaluatorClassV3;
  evaluatorPseudonym: string;
  statisticalEligibility: StayOptiGoldenStatisticalEligibilityV3;
  assignmentFingerprint: string;
  preference: StayOptiGoldenBlindPreferenceV3;
  engineLabelsHidden: true;
  sameRoleComparison: true;
}

export interface StayOptiGoldenDiagnosticInventoryV3 {
  inventoryId: string;
  sourceFingerprint: string;
  judgmentCount: number;
  classification: "legacy-diagnostic";
  statisticalUseAllowed: false;
}

export interface StayOptiGoldenDecisionDatasetInputV3 {
  datasetId: string;
  cases: StayOptiGoldenDecisionCaseV3[];
  judgments: StayOptiGoldenBlindJudgmentV3[];
  diagnosticInventories: StayOptiGoldenDiagnosticInventoryV3[];
}

export interface StayOptiGoldenDecisionDatasetV3 {
  schemaVersion: typeof STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3;
  datasetVersion: typeof STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3;
  datasetId: string;
  application: "offline-real-dataset-collection-only";
  cases: StayOptiGoldenDecisionCaseV3[];
  judgments: StayOptiGoldenBlindJudgmentV3[];
  diagnosticInventories: StayOptiGoldenDiagnosticInventoryV3[];
  legacyDiagnosticsUsedAsStatisticalEvidence: false;
  teacherOutputsUsedAsGroundTruth: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  commercialSignalsUsed: false;
  inputFingerprint: string;
  fingerprint: string;
}

export type StayOptiGoldenDatasetGateStatusV3 =
  | "collection-required"
  | "measurement-required"
  | "failed"
  | "passed";

export type StayOptiGoldenDatasetCriterionStatusV3 =
  | "pass"
  | "fail"
  | "not-measurable";

export interface StayOptiGoldenDatasetCriterionV3 {
  criterionId: string;
  category: "sample" | "performance";
  comparator: "at-least" | "at-most" | "no-regression";
  threshold: number;
  actual: number | null;
  status: StayOptiGoldenDatasetCriterionStatusV3;
}

export interface StayOptiGoldenDatasetMetricsV3 {
  normalizedRegretV2: number | null;
  normalizedRegretV3: number | null;
  regretImprovementOverV2: number | null;
  humanPairwiseWinRateV3: number | null;
  expertPairwiseWinRateV3: number | null;
  expectedCalibrationErrorV2: number | null;
  expectedCalibrationErrorV3: number | null;
  abstentionPrecision: number | null;
  robustChoiceRate: number | null;
  instabilityRate: number | null;
  maximumSegmentRegretGap: number | null;
  providerDependenceGap: number | null;
  criticalRegressions: number;
}

export interface StayOptiGoldenDatasetCountsV3 {
  eligibleGoldenCases: number;
  adversarialCases: number;
  counterfactualCases: number;
  humanBlindJudgments: number;
  expertBlindJudgments: number;
  evaluableAbstentions: number;
  providerNeutralReplays: number;
  diagnosticCasesExcluded: number;
  diagnosticJudgmentsExcluded: number;
  legacyDiagnosticInventoryJudgmentsExcluded: number;
}

export interface StayOptiGoldenDatasetGateV3 {
  schemaVersion: typeof STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3;
  datasetVersion: typeof STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3;
  datasetFingerprint: string;
  status: StayOptiGoldenDatasetGateStatusV3;
  counts: StayOptiGoldenDatasetCountsV3;
  metrics: StayOptiGoldenDatasetMetricsV3;
  criteria: StayOptiGoldenDatasetCriterionV3[];
  statisticalClaimAllowed: boolean;
  publicV3PromotionAllowed: false;
  splitEnabled: false;
  legacyDiagnosticsUsedAsStatisticalEvidence: false;
  fingerprint: string;
}

export interface StayOptiGoldenDatasetValidationV3 {
  valid: boolean;
  violations: string[];
}

const FORBIDDEN_FIELDS =
  /"(name|email|phone|address|providerId|providerName|providerSlug|commission|markup|affiliateRevenue|clickProbability|userEconomicValue)"\s*:/i;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function inUnitInterval(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function canonicalMeasurement(
  measurement: StayOptiGoldenDecisionMeasurementV3 | null
): StayOptiGoldenDecisionMeasurementV3 | null {
  return measurement === null ? null : { ...measurement };
}

function canonicalInput(
  input: StayOptiGoldenDecisionDatasetInputV3
): StayOptiGoldenDecisionDatasetInputV3 {
  return {
    datasetId: input.datasetId,
    cases: input.cases
      .map((candidate) => ({
        ...candidate,
        ...(candidate.externalParentReference === undefined
          ? {}
          : {
              externalParentReference:
                candidate.externalParentReference === null
                  ? null
                  : { ...candidate.externalParentReference },
            }),
        sourceEvidenceFingerprints: uniqueSorted(
          candidate.sourceEvidenceFingerprints
        ),
        measurement: canonicalMeasurement(candidate.measurement),
      }))
      .sort((left, right) => left.caseId.localeCompare(right.caseId)),
    judgments: input.judgments
      .map((judgment) => ({ ...judgment }))
      .sort((left, right) => left.judgmentId.localeCompare(right.judgmentId)),
    diagnosticInventories: input.diagnosticInventories
      .map((inventory) => ({ ...inventory }))
      .sort((left, right) => left.inventoryId.localeCompare(right.inventoryId)),
  };
}

function datasetFingerprint(
  payload: Omit<StayOptiGoldenDecisionDatasetV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-golden-decision-dataset");
}

function canonicalExternalRegistryInput(
  input: StayOptiGoldenExternalBaselineRegistryInputV3
): StayOptiGoldenExternalBaselineRegistryInputV3 {
  return {
    registryId: input.registryId,
    entries: input.entries
      .map((entry) => ({ ...entry }))
      .sort((left, right) => {
        const caseOrder = left.caseId.localeCompare(right.caseId);
        return caseOrder !== 0
          ? caseOrder
          : left.contentHash.localeCompare(right.contentHash);
      }),
  };
}

function externalRegistryFingerprint(
  registry: Omit<StayOptiGoldenExternalBaselineRegistryV3, "fingerprint">
): string {
  return createStableHashV3(
    registry,
    "stayopti-v3-golden-external-baseline-registry"
  );
}

function externalContentHashValid(value: string): boolean {
  return /^sha256-[0-9a-f]{64}$/.test(value);
}

export function validateGoldenExternalBaselineRegistryV3(
  registry: StayOptiGoldenExternalBaselineRegistryV3
): StayOptiGoldenDatasetValidationV3 {
  const violations: string[] = [];
  if (
    registry.registryVersion !==
      STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_VERSION_V3 ||
    registry.schemaVersion !==
      STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_SCHEMA_VERSION_V3 ||
    registry.application !== "offline-canonical-parent-resolution-only" ||
    !/^golden-parent-registry-[a-z0-9-]+$/.test(registry.registryId)
  ) {
    violations.push(`external-registry-contract-invalid:${registry.registryId}`);
  }

  const caseIds = new Set<string>();
  for (const entry of registry.entries) {
    if (caseIds.has(entry.caseId)) {
      violations.push(`external-registry-parent-ambiguous:${entry.caseId}`);
    }
    caseIds.add(entry.caseId);
    if (
      !/^golden-case-[a-z0-9-]+$/.test(entry.caseId) ||
      !externalContentHashValid(entry.contentHash) ||
      !/^[a-z0-9][a-z0-9.-]+$/i.test(entry.datasetVersion) ||
      !/^[a-z0-9][a-z0-9.-]+$/i.test(entry.schemaVersion) ||
      entry.kind !== "baseline" ||
      !["eligible", "diagnostic-only"].includes(entry.statisticalEligibility)
    ) {
      violations.push(`external-registry-entry-invalid:${entry.caseId}`);
    }
  }

  const { fingerprint: _fingerprint, ...payload } = registry;
  if (
    !isStableHashV3(registry.fingerprint) ||
    registry.fingerprint !== externalRegistryFingerprint(payload)
  ) {
    violations.push(`external-registry-fingerprint-invalid:${registry.registryId}`);
  }
  return { valid: violations.length === 0, violations: uniqueSorted(violations) };
}

export function createGoldenExternalBaselineRegistryV3(
  input: StayOptiGoldenExternalBaselineRegistryInputV3
): StayOptiGoldenExternalBaselineRegistryV3 {
  const canonical = canonicalExternalRegistryInput(input);
  const payload: Omit<StayOptiGoldenExternalBaselineRegistryV3, "fingerprint"> = {
    registryVersion: STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_VERSION_V3,
    schemaVersion:
      STAYOPTI_GOLDEN_EXTERNAL_BASELINE_REGISTRY_SCHEMA_VERSION_V3,
    registryId: canonical.registryId,
    application: "offline-canonical-parent-resolution-only",
    entries: canonical.entries,
  };
  const registry = {
    ...payload,
    fingerprint: externalRegistryFingerprint(payload),
  };
  const validation = validateGoldenExternalBaselineRegistryV3(registry);
  if (!validation.valid) {
    throw new Error(
      `Golden external baseline registry invalid: ${validation.violations.join(", ")}`
    );
  }
  return registry;
}

function gateFingerprint(
  payload: Omit<StayOptiGoldenDatasetGateV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-golden-decision-dataset-gate");
}

function caseOriginMatches(candidate: StayOptiGoldenDecisionCaseV3): boolean {
  if (
    candidate.statisticalEligibility === "diagnostic-only" &&
    candidate.technicalDiagnosticOnly !== true
  ) {
    return candidate.origin === "legacy-diagnostic";
  }
  if (candidate.kind === "baseline") {
    return candidate.origin === "real-search-snapshot";
  }
  if (candidate.kind === "adversarial") {
    return candidate.origin === "adversarial-derived";
  }
  return candidate.origin === "counterfactual-derived";
}

function measurementValid(
  measurement: StayOptiGoldenDecisionMeasurementV3
): boolean {
  return (
    inUnitInterval(measurement.normalizedRegretV2) &&
    inUnitInterval(measurement.normalizedRegretV3) &&
    inUnitInterval(measurement.predictedConfidenceV2) &&
    inUnitInterval(measurement.predictedConfidenceV3) &&
    inUnitInterval(measurement.providerDependenceGap) &&
    isStableHashV3(measurement.adjudicationFingerprint)
  );
}

export function validateGoldenDecisionDatasetV3(
  dataset: StayOptiGoldenDecisionDatasetV3,
  options: StayOptiGoldenDecisionDatasetValidationOptionsV3 = {}
): StayOptiGoldenDatasetValidationV3 {
  const violations: string[] = [];
  const add = (code: string, entityId: string) => {
    violations.push(`${code}:${entityId}`);
  };

  if (
    dataset.schemaVersion !== STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3 ||
    dataset.datasetVersion !== STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3 ||
    dataset.application !== "offline-real-dataset-collection-only" ||
    !/^golden-dataset-[a-z0-9-]+$/.test(dataset.datasetId)
  ) {
    add("dataset-contract-invalid", dataset.datasetId);
  }

  if (
    dataset.legacyDiagnosticsUsedAsStatisticalEvidence !== false ||
    dataset.teacherOutputsUsedAsGroundTruth !== false ||
    dataset.publicV2Changed !== false ||
    dataset.publicV3Enabled !== false ||
    dataset.splitEnabled !== false ||
    dataset.commercialSignalsUsed !== false
  ) {
    add("dataset-firewall-open", dataset.datasetId);
  }

  const caseById = new Map(dataset.cases.map((candidate) => [candidate.caseId, candidate]));
  const externalRegistry = options.externalParentRegistry;
  const externalRegistryValidation =
    externalRegistry === undefined
      ? null
      : validateGoldenExternalBaselineRegistryV3(externalRegistry);
  if (externalRegistryValidation !== null && !externalRegistryValidation.valid) {
    for (const violation of externalRegistryValidation.violations) {
      add("external-parent-registry-invalid", violation);
    }
  }
  if (caseById.size !== dataset.cases.length) {
    add("duplicate-case", dataset.datasetId);
  }

  for (const candidate of dataset.cases) {
    if (
      !/^golden-case-[a-z0-9-]+$/.test(candidate.caseId) ||
      !STAYOPTI_GOLDEN_DECISION_CASE_KINDS_V3.includes(candidate.kind) ||
      !STAYOPTI_ROLE_POLICY_PROFILES_V3.includes(candidate.profile) ||
      !STAYOPTI_GOLDEN_DECISION_SEGMENTS_V3.includes(candidate.segment) ||
      !STAYOPTI_GOLDEN_DECISION_ROLES_V3.includes(candidate.role) ||
      !caseOriginMatches(candidate) ||
      candidate.sourceEvidenceFingerprints.length === 0 ||
      candidate.sourceEvidenceFingerprints.some((value) => !isStableHashV3(value)) ||
      uniqueSorted(candidate.sourceEvidenceFingerprints).length !==
        candidate.sourceEvidenceFingerprints.length
    ) {
      add("case-contract-invalid", candidate.caseId);
    }

    if (candidate.kind === "baseline") {
      if (
        candidate.parentCaseId !== null ||
        (candidate.externalParentReference !== undefined &&
          candidate.externalParentReference !== null)
      ) {
        add("baseline-parent-invalid", candidate.caseId);
      }
    } else {
      const parent =
        candidate.parentCaseId === null
          ? undefined
          : caseById.get(candidate.parentCaseId);
      if (parent !== undefined) {
        if (
          parent.caseId === candidate.caseId ||
          parent.kind !== "baseline" ||
          parent.statisticalEligibility !== candidate.statisticalEligibility ||
          (candidate.externalParentReference !== undefined &&
            candidate.externalParentReference !== null)
        ) {
          add("derived-parent-invalid", candidate.caseId);
        }
      } else {
        const reference = candidate.externalParentReference;
        if (
          candidate.parentCaseId === null ||
          reference === undefined ||
          reference === null ||
          externalRegistry === undefined ||
          externalRegistryValidation === null ||
          !externalRegistryValidation.valid
        ) {
          add("external-derived-parent-unresolved", candidate.caseId);
        } else {
          const matches = externalRegistry.entries.filter(
            (entry) => entry.caseId === reference.caseId
          );
          if (matches.length !== 1) {
            add(
              matches.length === 0
                ? "external-derived-parent-unknown"
                : "external-derived-parent-ambiguous",
              candidate.caseId
            );
          } else {
            const [entry] = matches;
            if (
              reference.registryId !== externalRegistry.registryId ||
              reference.caseId !== candidate.parentCaseId ||
              reference.contentHash !== entry.contentHash ||
              reference.datasetVersion !== entry.datasetVersion ||
              reference.schemaVersion !== entry.schemaVersion ||
              entry.kind !== "baseline" ||
              entry.statisticalEligibility !== candidate.statisticalEligibility
            ) {
              add("external-derived-parent-mismatch", candidate.caseId);
            }
          }
        }
      }
    }

    if (
      candidate.technicalDiagnosticOnly === true &&
      candidate.statisticalEligibility !== "diagnostic-only"
    ) {
      add("technical-diagnostic-eligibility-invalid", candidate.caseId);
    }
    if (candidate.statisticalEligibility === "diagnostic-only") {
      if (candidate.measurement !== null) {
        add("diagnostic-measurement-forbidden", candidate.caseId);
      }
    } else if (candidate.measurement !== null && !measurementValid(candidate.measurement)) {
      add("measurement-invalid", candidate.caseId);
    }
  }

  const judgmentIds = new Set<string>();
  const evaluatorAssignments = new Set<string>();
  for (const judgment of dataset.judgments) {
    const candidate = caseById.get(judgment.caseId);
    const assignmentKey = [
      judgment.caseId,
      judgment.role,
      judgment.evaluatorClass,
      judgment.evaluatorPseudonym,
    ].join("|");
    if (judgmentIds.has(judgment.judgmentId)) {
      add("duplicate-judgment", judgment.judgmentId);
    }
    judgmentIds.add(judgment.judgmentId);
    if (evaluatorAssignments.has(assignmentKey)) {
      add("duplicate-evaluator-assignment", judgment.judgmentId);
    }
    evaluatorAssignments.add(assignmentKey);

    if (
      !/^golden-judgment-[a-z0-9-]+$/.test(judgment.judgmentId) ||
      candidate === undefined ||
      judgment.role !== candidate.role ||
      judgment.statisticalEligibility !== candidate.statisticalEligibility ||
      !isStableHashV3(judgment.evaluatorPseudonym) ||
      !isStableHashV3(judgment.assignmentFingerprint) ||
      judgment.engineLabelsHidden !== true ||
      judgment.sameRoleComparison !== true
    ) {
      add("blind-judgment-invalid", judgment.judgmentId);
    }
    if (candidate?.technicalDiagnosticOnly === true) {
      add("technical-diagnostic-judgment-forbidden", judgment.judgmentId);
    }
  }

  const inventoryIds = new Set<string>();
  for (const inventory of dataset.diagnosticInventories) {
    if (
      inventoryIds.has(inventory.inventoryId) ||
      !/^diagnostic-inventory-[a-z0-9-]+$/.test(inventory.inventoryId) ||
      !isStableHashV3(inventory.sourceFingerprint) ||
      !Number.isInteger(inventory.judgmentCount) ||
      inventory.judgmentCount < 0 ||
      inventory.classification !== "legacy-diagnostic" ||
      inventory.statisticalUseAllowed !== false
    ) {
      add("diagnostic-inventory-invalid", inventory.inventoryId);
    }
    inventoryIds.add(inventory.inventoryId);
  }

  if (FORBIDDEN_FIELDS.test(JSON.stringify(dataset))) {
    add("forbidden-field", dataset.datasetId);
  }

  const { fingerprint: _fingerprint, ...payload } = dataset;
  if (
    !isStableHashV3(dataset.inputFingerprint) ||
    !isStableHashV3(dataset.fingerprint) ||
    dataset.fingerprint !== datasetFingerprint(payload)
  ) {
    add("dataset-fingerprint-invalid", dataset.datasetId);
  }

  return { valid: violations.length === 0, violations: uniqueSorted(violations) };
}

export function createGoldenDecisionDatasetV3(
  input: StayOptiGoldenDecisionDatasetInputV3,
  options: StayOptiGoldenDecisionDatasetValidationOptionsV3 = {}
): StayOptiGoldenDecisionDatasetV3 {
  const canonical = canonicalInput(input);
  const inputFingerprint = createStableHashV3(
    canonical,
    "stayopti-v3-golden-decision-dataset-input"
  );
  const payload: Omit<StayOptiGoldenDecisionDatasetV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3,
    datasetVersion: STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3,
    datasetId: canonical.datasetId,
    application: "offline-real-dataset-collection-only",
    cases: canonical.cases,
    judgments: canonical.judgments,
    diagnosticInventories: canonical.diagnosticInventories,
    legacyDiagnosticsUsedAsStatisticalEvidence: false,
    teacherOutputsUsedAsGroundTruth: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    commercialSignalsUsed: false,
    inputFingerprint,
  };
  const dataset = { ...payload, fingerprint: datasetFingerprint(payload) };
  const validation = validateGoldenDecisionDatasetV3(dataset, options);
  if (!validation.valid) {
    throw new Error(
      `Golden Decision Dataset V3 invalid: ${validation.violations.join(", ")}`
    );
  }
  return dataset;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function pairwiseWinRate(
  judgments: readonly StayOptiGoldenBlindJudgmentV3[],
  evaluatorClass: StayOptiGoldenEvaluatorClassV3
): number | null {
  const comparable = judgments.filter(
    (judgment) =>
      judgment.evaluatorClass === evaluatorClass &&
      judgment.preference !== "abstain"
  );
  if (comparable.length === 0) return null;
  const score = comparable.reduce((sum, judgment) => {
    if (judgment.preference === "v3") return sum + 1;
    if (judgment.preference === "tie") return sum + 0.5;
    return sum;
  }, 0);
  return round(score / comparable.length);
}

function expectedCalibrationError(
  cases: readonly StayOptiGoldenDecisionCaseV3[],
  engine: "v2" | "v3"
): number | null {
  const measurements = cases
    .map(({ measurement }) => measurement)
    .filter(
      (measurement): measurement is StayOptiGoldenDecisionMeasurementV3 =>
        measurement !== null
    );
  if (measurements.length === 0) return null;

  const bins = Array.from({ length: 10 }, () => ({
    confidence: 0,
    correctness: 0,
    count: 0,
  }));
  for (const measurement of measurements) {
    const confidence = engine === "v2"
      ? measurement.predictedConfidenceV2
      : measurement.predictedConfidenceV3;
    const correct = engine === "v2"
      ? measurement.outcomeCorrectV2
      : measurement.outcomeCorrectV3;
    const index = Math.min(9, Math.floor(confidence * 10));
    const bin = bins[index];
    if (bin === undefined) continue;
    bin.confidence += confidence;
    bin.correctness += correct ? 1 : 0;
    bin.count += 1;
  }
  const error = bins.reduce((sum, bin) => {
    if (bin.count === 0) return sum;
    const averageConfidence = bin.confidence / bin.count;
    const averageCorrectness = bin.correctness / bin.count;
    return (
      sum +
      (bin.count / measurements.length) *
        Math.abs(averageConfidence - averageCorrectness)
    );
  }, 0);
  return round(error);
}

function maximumSegmentRegretGap(
  cases: readonly StayOptiGoldenDecisionCaseV3[]
): number | null {
  const bySegment = new Map<StayOptiGoldenDecisionSegmentV3, number[]>();
  for (const candidate of cases) {
    if (candidate.measurement === null) continue;
    const current = bySegment.get(candidate.segment) ?? [];
    current.push(candidate.measurement.normalizedRegretV3);
    bySegment.set(candidate.segment, current);
  }
  const segmentAverages = [...bySegment.values()]
    .map((values) => average(values))
    .filter((value): value is number => value !== null);
  if (segmentAverages.length < 2) return null;
  return round(Math.max(...segmentAverages) - Math.min(...segmentAverages));
}

function criterion(
  criterionId: string,
  category: StayOptiGoldenDatasetCriterionV3["category"],
  comparator: StayOptiGoldenDatasetCriterionV3["comparator"],
  threshold: number,
  actual: number | null,
  passes: (value: number) => boolean
): StayOptiGoldenDatasetCriterionV3 {
  return {
    criterionId,
    category,
    comparator,
    threshold,
    actual,
    status: actual === null ? "not-measurable" : passes(actual) ? "pass" : "fail",
  };
}

function metricsFor(
  cases: readonly StayOptiGoldenDecisionCaseV3[],
  judgments: readonly StayOptiGoldenBlindJudgmentV3[]
): StayOptiGoldenDatasetMetricsV3 {
  const measurements = cases
    .map(({ measurement }) => measurement)
    .filter(
      (measurement): measurement is StayOptiGoldenDecisionMeasurementV3 =>
        measurement !== null
    );
  const normalizedRegretV2 = average(
    measurements.map(({ normalizedRegretV2: value }) => value)
  );
  const normalizedRegretV3 = average(
    measurements.map(({ normalizedRegretV3: value }) => value)
  );
  const abstentions = measurements.filter(({ v3Abstained }) => v3Abstained);
  const providerReplays = measurements.filter(
    ({ providerNeutralReplay }) => providerNeutralReplay
  );

  return {
    normalizedRegretV2,
    normalizedRegretV3,
    regretImprovementOverV2:
      normalizedRegretV2 === null || normalizedRegretV3 === null
        ? null
        : round(normalizedRegretV2 - normalizedRegretV3),
    humanPairwiseWinRateV3: pairwiseWinRate(judgments, "human"),
    expertPairwiseWinRateV3: pairwiseWinRate(judgments, "expert"),
    expectedCalibrationErrorV2: expectedCalibrationError(cases, "v2"),
    expectedCalibrationErrorV3: expectedCalibrationError(cases, "v3"),
    abstentionPrecision:
      abstentions.length === 0
        ? null
        : round(
            abstentions.filter(({ abstentionWarranted }) => abstentionWarranted)
              .length / abstentions.length
          ),
    robustChoiceRate:
      measurements.length === 0
        ? null
        : round(
            measurements.filter(({ v3RobustChoice }) => v3RobustChoice).length /
              measurements.length
          ),
    instabilityRate:
      measurements.length === 0
        ? null
        : round(
            measurements.filter(({ v3Unstable }) => v3Unstable).length /
              measurements.length
          ),
    maximumSegmentRegretGap: maximumSegmentRegretGap(cases),
    providerDependenceGap:
      providerReplays.length === 0
        ? null
        : round(
            Math.max(...providerReplays.map(({ providerDependenceGap }) => providerDependenceGap))
          ),
    criticalRegressions: measurements.filter(
      ({ criticalRegression }) => criticalRegression
    ).length,
  };
}

export function evaluateGoldenDecisionDatasetGateV3(
  dataset: StayOptiGoldenDecisionDatasetV3,
  options: StayOptiGoldenDecisionDatasetValidationOptionsV3 = {}
): StayOptiGoldenDatasetGateV3 {
  const validation = validateGoldenDecisionDatasetV3(dataset, options);
  if (!validation.valid) {
    throw new Error(
      `Cannot evaluate invalid Golden Decision Dataset V3: ${validation.violations.join(", ")}`
    );
  }

  const eligibleCases = dataset.cases.filter(
    ({ statisticalEligibility }) => statisticalEligibility === "eligible"
  );
  const eligibleCaseIds = new Set(eligibleCases.map(({ caseId }) => caseId));
  const eligibleJudgments = dataset.judgments.filter(
    (judgment) =>
      judgment.statisticalEligibility === "eligible" &&
      eligibleCaseIds.has(judgment.caseId)
  );
  const measurements = eligibleCases
    .map(({ measurement }) => measurement)
    .filter(
      (measurement): measurement is StayOptiGoldenDecisionMeasurementV3 =>
        measurement !== null
    );
  const counts: StayOptiGoldenDatasetCountsV3 = {
    eligibleGoldenCases: eligibleCases.length,
    adversarialCases: eligibleCases.filter(({ kind }) => kind === "adversarial").length,
    counterfactualCases: eligibleCases.filter(({ kind }) => kind === "counterfactual").length,
    humanBlindJudgments: eligibleJudgments.filter(
      ({ evaluatorClass }) => evaluatorClass === "human"
    ).length,
    expertBlindJudgments: eligibleJudgments.filter(
      ({ evaluatorClass }) => evaluatorClass === "expert"
    ).length,
    evaluableAbstentions: measurements.filter(({ v3Abstained }) => v3Abstained).length,
    providerNeutralReplays: measurements.filter(
      ({ providerNeutralReplay }) => providerNeutralReplay
    ).length,
    diagnosticCasesExcluded: dataset.cases.length - eligibleCases.length,
    diagnosticJudgmentsExcluded: dataset.judgments.length - eligibleJudgments.length,
    legacyDiagnosticInventoryJudgmentsExcluded: dataset.diagnosticInventories.reduce(
      (sum, inventory) => sum + inventory.judgmentCount,
      0
    ),
  };
  const metrics = metricsFor(eligibleCases, eligibleJudgments);
  const minimums = STAYOPTI_GOLDEN_DATASET_MINIMUMS_V3;
  const thresholds = STAYOPTI_GOLDEN_DATASET_THRESHOLDS_V3;
  const criteria: StayOptiGoldenDatasetCriterionV3[] = [
    criterion("sample:golden-cases", "sample", "at-least", minimums.goldenCases, counts.eligibleGoldenCases, (value) => value >= minimums.goldenCases),
    criterion("sample:adversarial-cases", "sample", "at-least", minimums.adversarialCases, counts.adversarialCases, (value) => value >= minimums.adversarialCases),
    criterion("sample:counterfactual-cases", "sample", "at-least", minimums.counterfactualCases, counts.counterfactualCases, (value) => value >= minimums.counterfactualCases),
    criterion("sample:human-blind-judgments", "sample", "at-least", minimums.humanBlindJudgments, counts.humanBlindJudgments, (value) => value >= minimums.humanBlindJudgments),
    criterion("sample:expert-blind-judgments", "sample", "at-least", minimums.expertBlindJudgments, counts.expertBlindJudgments, (value) => value >= minimums.expertBlindJudgments),
    criterion("sample:evaluable-abstentions", "sample", "at-least", minimums.evaluableAbstentions, counts.evaluableAbstentions, (value) => value >= minimums.evaluableAbstentions),
    criterion("sample:provider-neutral-replays", "sample", "at-least", minimums.providerNeutralReplays, counts.providerNeutralReplays, (value) => value >= minimums.providerNeutralReplays),
    criterion("performance:normalized-regret-v3", "performance", "at-most", thresholds.normalizedRegretV3Maximum, metrics.normalizedRegretV3, (value) => value <= thresholds.normalizedRegretV3Maximum),
    criterion("performance:regret-improvement-v2", "performance", "at-least", thresholds.regretImprovementOverV2Minimum, metrics.regretImprovementOverV2, (value) => value >= thresholds.regretImprovementOverV2Minimum),
    criterion("performance:human-pairwise-win-rate", "performance", "at-least", thresholds.humanPairwiseWinRateV3Minimum, metrics.humanPairwiseWinRateV3, (value) => value >= thresholds.humanPairwiseWinRateV3Minimum),
    criterion("performance:expert-pairwise-win-rate", "performance", "at-least", thresholds.expertPairwiseWinRateV3Minimum, metrics.expertPairwiseWinRateV3, (value) => value >= thresholds.expertPairwiseWinRateV3Minimum),
    criterion("performance:ece-v3", "performance", "at-most", thresholds.expectedCalibrationErrorV3Maximum, metrics.expectedCalibrationErrorV3, (value) => value <= thresholds.expectedCalibrationErrorV3Maximum),
    criterion("performance:ece-no-v2-regression", "performance", "no-regression", 0, metrics.expectedCalibrationErrorV2 === null || metrics.expectedCalibrationErrorV3 === null ? null : round(metrics.expectedCalibrationErrorV2 - metrics.expectedCalibrationErrorV3), (value) => value >= 0),
    criterion("performance:abstention-precision", "performance", "at-least", thresholds.abstentionPrecisionMinimum, metrics.abstentionPrecision, (value) => value >= thresholds.abstentionPrecisionMinimum),
    criterion("performance:robust-choice-rate", "performance", "at-least", thresholds.robustChoiceRateMinimum, metrics.robustChoiceRate, (value) => value >= thresholds.robustChoiceRateMinimum),
    criterion("performance:instability-rate", "performance", "at-most", thresholds.instabilityRateMaximum, metrics.instabilityRate, (value) => value <= thresholds.instabilityRateMaximum),
    criterion("performance:segment-regret-gap", "performance", "at-most", thresholds.maximumSegmentRegretGap, metrics.maximumSegmentRegretGap, (value) => value <= thresholds.maximumSegmentRegretGap),
    criterion("performance:provider-dependence-gap", "performance", "at-most", thresholds.maximumProviderDependenceGap, metrics.providerDependenceGap, (value) => value <= thresholds.maximumProviderDependenceGap),
    criterion("performance:critical-regressions", "performance", "at-most", thresholds.criticalRegressionsMaximum, metrics.criticalRegressions, (value) => value <= thresholds.criticalRegressionsMaximum),
  ];

  const sampleCriteria = criteria.filter(({ category }) => category === "sample");
  const performanceCriteria = criteria.filter(({ category }) => category === "performance");
  let status: StayOptiGoldenDatasetGateStatusV3;
  if (sampleCriteria.some((item) => item.status !== "pass")) {
    status = "collection-required";
  } else if (performanceCriteria.some((item) => item.status === "not-measurable")) {
    status = "measurement-required";
  } else if (performanceCriteria.some((item) => item.status === "fail")) {
    status = "failed";
  } else {
    status = "passed";
  }

  const payload: Omit<StayOptiGoldenDatasetGateV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3,
    datasetVersion: STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3,
    datasetFingerprint: dataset.fingerprint,
    status,
    counts,
    metrics,
    criteria,
    statisticalClaimAllowed: status === "passed",
    publicV3PromotionAllowed: false,
    splitEnabled: false,
    legacyDiagnosticsUsedAsStatisticalEvidence: false,
  };
  return { ...payload, fingerprint: gateFingerprint(payload) };
}

export function validateGoldenDecisionDatasetGateV3(
  gate: StayOptiGoldenDatasetGateV3
): StayOptiGoldenDatasetValidationV3 {
  const violations: string[] = [];
  if (
    gate.schemaVersion !== STAYOPTI_GOLDEN_DECISION_DATASET_SCHEMA_VERSION_V3 ||
    gate.datasetVersion !== STAYOPTI_GOLDEN_DECISION_DATASET_VERSION_V3 ||
    !isStableHashV3(gate.datasetFingerprint) ||
    gate.statisticalClaimAllowed !== (gate.status === "passed") ||
    gate.publicV3PromotionAllowed !== false ||
    gate.splitEnabled !== false ||
    gate.legacyDiagnosticsUsedAsStatisticalEvidence !== false
  ) {
    violations.push("gate-contract-invalid");
  }
  const criterionIds = gate.criteria.map(({ criterionId }) => criterionId);
  if (new Set(criterionIds).size !== criterionIds.length) {
    violations.push("gate-criteria-duplicate");
  }
  const { fingerprint: _fingerprint, ...payload } = gate;
  if (
    !isStableHashV3(gate.fingerprint) ||
    gate.fingerprint !== gateFingerprint(payload)
  ) {
    violations.push("gate-fingerprint-invalid");
  }
  return { valid: violations.length === 0, violations };
}

export function verifyGoldenDecisionDatasetReplayV3(
  input: StayOptiGoldenDecisionDatasetInputV3,
  expected: StayOptiGoldenDecisionDatasetV3,
  options: StayOptiGoldenDecisionDatasetValidationOptionsV3 = {}
): boolean {
  const replay = createGoldenDecisionDatasetV3(input, options);
  return (
    replay.inputFingerprint === expected.inputFingerprint &&
    replay.fingerprint === expected.fingerprint &&
    replay.datasetVersion === expected.datasetVersion
  );
}

export const STAYOPTI_GOLDEN_DECISION_DATASET_AUDIT_V3 = Object.freeze({
  application: "offline-real-dataset-collection-only" as const,
  minimumGoldenCases: 200 as const,
  minimumHumanBlindJudgments: 300 as const,
  minimumExpertBlindJudgments: 100 as const,
  legacyDiagnosticsUsedAsStatisticalEvidence: false as const,
  teacherOutputsUsedAsGroundTruth: false as const,
  statisticalClaimsBeforeGatePassAllowed: false as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  providerIdentitiesAllowed: false as const,
  commercialSignalsUsed: false as const,
  providerCallsAllowed: false as const,
  bookingOrPaymentChanged: false as const,
  analyticsChanged: false as const,
  deployChanged: false as const,
});
