import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";
import {
  validatePersonalUtilityRolePolicyV3,
  type StayOptiPersonalUtilityRolePolicyResultV3,
  type StayOptiRolePolicyRoleV3,
  type StayOptiRolePolicySelectionV3,
} from "../policy/personalUtilityRolePolicyV3";

export const STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3 =
  "3.0.0-v2-safety-kernel.1" as const;

export const STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3 =
  "3.0.0-v2-safety-kernel-schema.1" as const;

export const STAYOPTI_V2_SAFETY_ROLES_V3 = [
  "best-choice",
  "best-sensible-saving",
  "worthwhile-comfort-upgrade",
  "split",
] as const;

export const STAYOPTI_V2_SAFETY_MODES_V3 = [
  "off",
  "shadow",
  "canary",
] as const;

export const STAYOPTI_V3_EXECUTION_STATUSES_V3 = [
  "not-run",
  "success",
  "import-failure",
  "timeout",
  "error",
] as const;

export const STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3 = Object.freeze([
  Object.freeze({
    code: "v2-public-output-invalid",
    effect: "abstain",
    description: "V2 public output is missing, corrupt or not bound to its fingerprint.",
  }),
  Object.freeze({
    code: "kill-switch-engaged",
    effect: "serve-v2",
    description: "The fail-closed kill switch blocks all V3 consumption.",
  }),
  Object.freeze({
    code: "mode-off",
    effect: "serve-v2",
    description: "V3 execution and comparison are disabled.",
  }),
  Object.freeze({
    code: "v3-not-run",
    effect: "serve-v2",
    description: "No V3 execution result is available.",
  }),
  Object.freeze({
    code: "v3-import-failure",
    effect: "serve-v2",
    description: "V3 could not be imported.",
  }),
  Object.freeze({
    code: "v3-timeout",
    effect: "serve-v2",
    description: "V3 did not complete inside the bounded execution window.",
  }),
  Object.freeze({
    code: "v3-exception",
    effect: "serve-v2",
    description: "V3 failed with a safely classified execution error.",
  }),
  Object.freeze({
    code: "v3-result-invalid",
    effect: "serve-v2",
    description: "V3 output failed schema, replay or fingerprint validation.",
  }),
  Object.freeze({
    code: "v3-policy-unbound",
    effect: "serve-v2",
    description: "V3 role selections are not bound to comparable solution fingerprints.",
  }),
  Object.freeze({
    code: "v3-best-choice-missing",
    effect: "serve-v2",
    description: "A usable V3 policy has no valid Best Choice.",
  }),
  Object.freeze({
    code: "v3-hard-constraint-failure",
    effect: "serve-v2",
    description: "A selected V3 solution does not satisfy its hard constraints.",
  }),
  Object.freeze({
    code: "v3-offer-integrity-failure",
    effect: "serve-v2",
    description: "A selected V3 solution does not have verified offer integrity.",
  }),
  Object.freeze({
    code: "v3-dominated-choice",
    effect: "serve-v2",
    description: "The V3 Best Choice is dominated by another candidate.",
  }),
  Object.freeze({
    code: "v3-commercial-signal",
    effect: "serve-v2",
    description: "Forbidden commercial optimization data is present in V3.",
  }),
  Object.freeze({
    code: "divergence-proof-insufficient",
    effect: "serve-v2",
    description: "A V2/V3 divergence lacks complete evidence and trade-off proof.",
  }),
  Object.freeze({
    code: "public-promotion-disabled",
    effect: "serve-v2",
    description: "V3-16 has no authority to alter the public V2 decision.",
  }),
] as const);

export type StayOptiV2SafetyModeV3 =
  typeof STAYOPTI_V2_SAFETY_MODES_V3[number];

export type StayOptiV3ExecutionStatusV3 =
  typeof STAYOPTI_V3_EXECUTION_STATUSES_V3[number];

export type StayOptiV2SafetyHardVetoCodeV3 =
  typeof STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3[number]["code"];

export type StayOptiV2SafetyRoleStatusV3 =
  | "selected"
  | "abstained"
  | "not-applicable"
  | "disabled";

export interface StayOptiComparableRoleBindingV3 {
  role: StayOptiRolePolicyRoleV3;
  status: StayOptiV2SafetyRoleStatusV3;
  solutionId: string | null;
  solutionFingerprint: string | null;
}

export interface StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput> {
  schemaVersion: typeof STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3;
  policyVersion: string;
  publicOutput: TPublicOutput;
  roleBindings: StayOptiComparableRoleBindingV3[];
  fingerprint: string;
}

export interface StayOptiV2SafetyKillSwitchStateV3 {
  schemaVersion: typeof STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3;
  engaged: boolean;
  generation: number;
  reasonCode: "not-engaged" | "manual-safety-stop" | "automatic-fail-closed";
  fingerprint: string;
}

export type StayOptiV3SafetyExecutionV3 =
  | { status: "not-run" }
  | { status: "import-failure"; safeErrorCode: string }
  | { status: "timeout"; safeErrorCode: string }
  | { status: "error"; safeErrorCode: string }
  | {
      status: "success";
      result: StayOptiPersonalUtilityRolePolicyResultV3;
      roleBindings: StayOptiComparableRoleBindingV3[];
    };

export type StayOptiV2V3ComparisonOutcomeV3 =
  | "aligned"
  | "diverged"
  | "v2-only"
  | "v3-only"
  | "both-abstain"
  | "unavailable";

export interface StayOptiV2V3RoleComparisonV3 {
  role: StayOptiRolePolicyRoleV3;
  outcome: StayOptiV2V3ComparisonOutcomeV3;
  sameSolution: boolean | null;
}

export interface StayOptiV2V3DivergenceProofRoleV3 {
  role: StayOptiRolePolicyRoleV3;
  outcome: StayOptiV2V3ComparisonOutcomeV3;
  evidenceLinked: boolean;
  candidateValidityProved: boolean;
  tradeOffProved: boolean;
  status: "not-required" | "complete-candidate" | "insufficient" | "blocked";
}

export interface StayOptiV2V3DivergenceProofV3 {
  status: "not-required" | "complete-candidate" | "insufficient" | "blocked";
  roles: StayOptiV2V3DivergenceProofRoleV3[];
  promotionAuthority: false;
}

export interface StayOptiV2SafetyGovernorAuditV3 {
  schemaVersion: typeof STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3;
  kernelVersion: typeof STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3;
  application: "safety-kernel-shadow-canary-only";
  mode: StayOptiV2SafetyModeV3;
  action: "serve-v2" | "abstain";
  v3ExecutionStatus: StayOptiV3ExecutionStatusV3;
  v3ConsumedForComparison: boolean;
  hardVetoes: StayOptiV2SafetyHardVetoCodeV3[];
  roleComparisons: StayOptiV2V3RoleComparisonV3[];
  divergenceProof: StayOptiV2V3DivergenceProofV3;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  providerCallsAllowed: false;
  bookingOrPaymentChanged: false;
  analyticsChanged: false;
  deployChanged: false;
  commercialSignalsUsed: false;
  teacherOutputsUsedAsGroundTruth: false;
  fingerprint: string;
}

export interface StayOptiV2SafetyGovernorResultV3<TPublicOutput> {
  publicResult: TPublicOutput | null;
  audit: StayOptiV2SafetyGovernorAuditV3;
}

export interface RunStayOptiV2SafetyGovernorInputV3<TPublicOutput> {
  mode: StayOptiV2SafetyModeV3;
  v2: StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput>;
  v3: StayOptiV3SafetyExecutionV3;
  killSwitch: StayOptiV2SafetyKillSwitchStateV3;
}

export interface StayOptiV2SafetyTelemetryAggregateV3 {
  schemaVersion: typeof STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3;
  kernelVersion: typeof STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3;
  aggregation: "privacy-safe-counts-only";
  total: number;
  actions: Record<"serve-v2" | "abstain", number>;
  modes: Record<StayOptiV2SafetyModeV3, number>;
  executions: Record<StayOptiV3ExecutionStatusV3, number>;
  vetoes: Record<StayOptiV2SafetyHardVetoCodeV3, number>;
  roleOutcomes: Record<StayOptiV2V3ComparisonOutcomeV3, number>;
  containsCaseLevelData: false;
  containsSolutionIdentifiers: false;
  containsCommercialData: false;
  fingerprint: string;
}

export interface StayOptiV2SafetyValidationV3 {
  valid: boolean;
  violations: string[];
}

const FORBIDDEN_COMMERCIAL_FIELDS =
  /"(commission|markup|affiliateRevenue|clickProbability|providerPriority|userEconomicValue)"\s*:/i;

const FORBIDDEN_TELEMETRY_FIELDS =
  /"(caseId|solutionId|solutionFingerprint|publicOutput|provider|commission|markup|affiliateRevenue|clickProbability|userEconomicValue)"\s*:/i;

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function roleOrder(role: StayOptiRolePolicyRoleV3): number {
  return STAYOPTI_V2_SAFETY_ROLES_V3.indexOf(role);
}

function canonicalBindings(
  bindings: readonly StayOptiComparableRoleBindingV3[]
): StayOptiComparableRoleBindingV3[] {
  return bindings
    .map((binding) => ({ ...binding }))
    .sort((left, right) => roleOrder(left.role) - roleOrder(right.role));
}

function v2EnvelopeFingerprint<TPublicOutput>(
  payload: Omit<StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput>, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-v2-public-decision-envelope");
}

function killSwitchFingerprint(
  payload: Omit<StayOptiV2SafetyKillSwitchStateV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-v2-safety-kill-switch");
}

function auditFingerprint(
  payload: Omit<StayOptiV2SafetyGovernorAuditV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-v2-safety-governor-audit");
}

function telemetryFingerprint(
  payload: Omit<StayOptiV2SafetyTelemetryAggregateV3, "fingerprint">
): string {
  return createStableHashV3(payload, "stayopti-v3-v2-safety-telemetry");
}

function validateBindings(
  bindings: readonly StayOptiComparableRoleBindingV3[]
): boolean {
  if (bindings.length !== STAYOPTI_V2_SAFETY_ROLES_V3.length) return false;
  const byRole = new Map(bindings.map((binding) => [binding.role, binding]));
  if (byRole.size !== STAYOPTI_V2_SAFETY_ROLES_V3.length) return false;

  for (const role of STAYOPTI_V2_SAFETY_ROLES_V3) {
    const binding = byRole.get(role);
    if (binding === undefined) return false;
    if (binding.status === "selected") {
      if (
        binding.solutionId === null ||
        binding.solutionId.trim().length === 0 ||
        binding.solutionFingerprint === null ||
        !isStableHashV3(binding.solutionFingerprint)
      ) {
        return false;
      }
    } else if (binding.solutionId !== null || binding.solutionFingerprint !== null) {
      return false;
    }
  }
  return true;
}

export function createV2PublicDecisionEnvelopeV3<TPublicOutput>(input: {
  policyVersion: string;
  publicOutput: TPublicOutput;
  roleBindings: StayOptiComparableRoleBindingV3[];
}): StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput> {
  if (
    input.publicOutput === null ||
    input.publicOutput === undefined ||
    input.policyVersion.trim().length === 0 ||
    !validateBindings(input.roleBindings)
  ) {
    throw new Error("V2 public decision envelope input is invalid.");
  }

  const payload: Omit<StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput>, "fingerprint"> = {
    schemaVersion: STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3,
    policyVersion: input.policyVersion,
    publicOutput: input.publicOutput,
    roleBindings: canonicalBindings(input.roleBindings),
  };
  return { ...payload, fingerprint: v2EnvelopeFingerprint(payload) };
}

export function validateV2PublicDecisionEnvelopeV3<TPublicOutput>(
  envelope: StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput>
): StayOptiV2SafetyValidationV3 {
  const violations: string[] = [];
  if (
    envelope.schemaVersion !== STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3 ||
    envelope.policyVersion.trim().length === 0 ||
    envelope.publicOutput === null ||
    envelope.publicOutput === undefined ||
    !validateBindings(envelope.roleBindings)
  ) {
    violations.push("v2-envelope-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = envelope;
  if (
    !isStableHashV3(envelope.fingerprint) ||
    envelope.fingerprint !== v2EnvelopeFingerprint(payload)
  ) {
    violations.push("v2-envelope-fingerprint-invalid");
  }
  return { valid: violations.length === 0, violations };
}

export function createV2SafetyKillSwitchV3(): StayOptiV2SafetyKillSwitchStateV3 {
  const payload: Omit<StayOptiV2SafetyKillSwitchStateV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3,
    engaged: false,
    generation: 0,
    reasonCode: "not-engaged",
  };
  return { ...payload, fingerprint: killSwitchFingerprint(payload) };
}

export function engageV2SafetyKillSwitchV3(
  current: StayOptiV2SafetyKillSwitchStateV3,
  reasonCode: "manual-safety-stop" | "automatic-fail-closed" = "manual-safety-stop"
): StayOptiV2SafetyKillSwitchStateV3 {
  if (!validateV2SafetyKillSwitchV3(current).valid) {
    const failClosed: Omit<StayOptiV2SafetyKillSwitchStateV3, "fingerprint"> = {
      schemaVersion: STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3,
      engaged: true,
      generation: 1,
      reasonCode: "automatic-fail-closed",
    };
    return { ...failClosed, fingerprint: killSwitchFingerprint(failClosed) };
  }
  if (current.engaged) return current;

  const payload: Omit<StayOptiV2SafetyKillSwitchStateV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3,
    engaged: true,
    generation: current.generation + 1,
    reasonCode,
  };
  return { ...payload, fingerprint: killSwitchFingerprint(payload) };
}

export function validateV2SafetyKillSwitchV3(
  state: StayOptiV2SafetyKillSwitchStateV3
): StayOptiV2SafetyValidationV3 {
  const violations: string[] = [];
  if (
    state.schemaVersion !== STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3 ||
    !Number.isInteger(state.generation) ||
    state.generation < 0 ||
    (state.engaged && state.reasonCode === "not-engaged") ||
    (!state.engaged && (state.reasonCode !== "not-engaged" || state.generation !== 0))
  ) {
    violations.push("kill-switch-state-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = state;
  if (
    !isStableHashV3(state.fingerprint) ||
    state.fingerprint !== killSwitchFingerprint(payload)
  ) {
    violations.push("kill-switch-fingerprint-invalid");
  }
  return { valid: violations.length === 0, violations };
}

function selectionForRole(
  result: StayOptiPersonalUtilityRolePolicyResultV3,
  role: StayOptiRolePolicyRoleV3
): StayOptiRolePolicySelectionV3 {
  switch (role) {
    case "best-choice":
      return result.portfolio.bestChoice;
    case "best-sensible-saving":
      return result.portfolio.bestSensibleSaving;
    case "worthwhile-comfort-upgrade":
      return result.portfolio.worthwhileComfortUpgrade;
    case "split":
      return result.portfolio.split;
  }
}

function validateV3Bindings(
  result: StayOptiPersonalUtilityRolePolicyResultV3,
  bindings: readonly StayOptiComparableRoleBindingV3[]
): boolean {
  if (!validateBindings(bindings)) return false;
  const byRole = new Map(bindings.map((binding) => [binding.role, binding]));
  for (const role of STAYOPTI_V2_SAFETY_ROLES_V3) {
    const binding = byRole.get(role);
    if (binding === undefined) return false;
    const selection = selectionForRole(result, role);
    if (binding.status !== selection.status) return false;
    if (selection.status === "selected") {
      if (
        selection.solutionId === null ||
        binding.solutionId !== selection.solutionId ||
        binding.solutionFingerprint === null
      ) {
        return false;
      }
    } else if (binding.solutionId !== null || binding.solutionFingerprint !== null) {
      return false;
    }
  }
  return true;
}

function compareBindings(
  v2Bindings: readonly StayOptiComparableRoleBindingV3[],
  v3Bindings: readonly StayOptiComparableRoleBindingV3[]
): StayOptiV2V3RoleComparisonV3[] {
  const v2ByRole = new Map(v2Bindings.map((binding) => [binding.role, binding]));
  const v3ByRole = new Map(v3Bindings.map((binding) => [binding.role, binding]));

  return STAYOPTI_V2_SAFETY_ROLES_V3.map((role) => {
    const v2 = v2ByRole.get(role);
    const v3 = v3ByRole.get(role);
    if (v2 === undefined || v3 === undefined) {
      return { role, outcome: "unavailable", sameSolution: null };
    }
    const v2Selected = v2.status === "selected";
    const v3Selected = v3.status === "selected";
    if (!v2Selected && !v3Selected) {
      return { role, outcome: "both-abstain", sameSolution: null };
    }
    if (v2Selected && !v3Selected) {
      return { role, outcome: "v2-only", sameSolution: false };
    }
    if (!v2Selected && v3Selected) {
      return { role, outcome: "v3-only", sameSolution: false };
    }
    const sameSolution = v2.solutionFingerprint === v3.solutionFingerprint;
    return {
      role,
      outcome: sameSolution ? "aligned" : "diverged",
      sameSolution,
    };
  });
}

function candidateValidity(
  result: StayOptiPersonalUtilityRolePolicyResultV3,
  selection: StayOptiRolePolicySelectionV3
): boolean {
  if (selection.status !== "selected" || selection.solutionId === null) return true;
  const candidate = result.candidates.find(
    ({ solutionId }) => solutionId === selection.solutionId
  );
  return (
    candidate !== undefined &&
    candidate.status === "comparable" &&
    !candidate.reasonCodes.includes("policy:hard-constraint-unresolved") &&
    !candidate.reasonCodes.includes("policy:offer-not-verified") &&
    (selection.role !== "best-choice" || candidate.dominatedBySolutionIds.length === 0)
  );
}

function tradeOffProof(selection: StayOptiRolePolicySelectionV3): boolean {
  if (selection.status !== "selected") return true;
  if (selection.role === "best-sensible-saving") {
    return (
      selection.metrics.savingAmount !== null &&
      selection.metrics.savingAmount > 0 &&
      selection.metrics.qualityLoss !== null &&
      selection.metrics.qualityLossTolerance !== null &&
      selection.metrics.qualityLoss <= selection.metrics.qualityLossTolerance &&
      selection.metrics.experienceLoss !== null &&
      selection.metrics.experienceLossTolerance !== null &&
      selection.metrics.experienceLoss <= selection.metrics.experienceLossTolerance
    );
  }
  if (selection.role === "worthwhile-comfort-upgrade") {
    return (
      selection.metrics.upgradePremium !== null &&
      selection.metrics.upgradePremium > 0 &&
      selection.metrics.experienceGain !== null &&
      selection.metrics.experienceGain > 0 &&
      selection.metrics.marginalValuePer100 !== null &&
      selection.metrics.marginalValueThreshold !== null &&
      selection.metrics.marginalValuePer100 >= selection.metrics.marginalValueThreshold
    );
  }
  return true;
}

function createDivergenceProof(
  result: StayOptiPersonalUtilityRolePolicyResultV3,
  comparisons: readonly StayOptiV2V3RoleComparisonV3[]
): StayOptiV2V3DivergenceProofV3 {
  const roles: StayOptiV2V3DivergenceProofRoleV3[] = comparisons.map(
    (comparison) => {
      if (
        comparison.outcome === "aligned" ||
        comparison.outcome === "both-abstain"
      ) {
        return {
          role: comparison.role,
          outcome: comparison.outcome,
          evidenceLinked: true,
          candidateValidityProved: true,
          tradeOffProved: true,
          status: "not-required",
        };
      }
      const selection = selectionForRole(result, comparison.role);
      if (selection.status !== "selected") {
        return {
          role: comparison.role,
          outcome: comparison.outcome,
          evidenceLinked: false,
          candidateValidityProved: false,
          tradeOffProved: false,
          status: "blocked",
        };
      }
      const evidenceLinked = selection.explanation.evidenceIds.length > 0;
      const candidateValidityProved = candidateValidity(result, selection);
      const tradeOffProved = tradeOffProof(selection);
      return {
        role: comparison.role,
        outcome: comparison.outcome,
        evidenceLinked,
        candidateValidityProved,
        tradeOffProved,
        status:
          evidenceLinked && candidateValidityProved && tradeOffProved
            ? "complete-candidate"
            : "insufficient",
      };
    }
  );

  const divergenceRoles = roles.filter(({ status }) => status !== "not-required");
  let status: StayOptiV2V3DivergenceProofV3["status"] = "not-required";
  if (divergenceRoles.some((role) => role.status === "blocked")) status = "blocked";
  else if (divergenceRoles.some((role) => role.status === "insufficient")) {
    status = "insufficient";
  } else if (divergenceRoles.length > 0) {
    status = "complete-candidate";
  }
  return { status, roles, promotionAuthority: false };
}

function blockedProof(): StayOptiV2V3DivergenceProofV3 {
  return {
    status: "blocked",
    roles: STAYOPTI_V2_SAFETY_ROLES_V3.map((role) => ({
      role,
      outcome: "unavailable",
      evidenceLinked: false,
      candidateValidityProved: false,
      tradeOffProved: false,
      status: "blocked",
    })),
    promotionAuthority: false,
  };
}

function selectedV3Candidates(
  result: StayOptiPersonalUtilityRolePolicyResultV3
) {
  const selectedIds = new Set(
    STAYOPTI_V2_SAFETY_ROLES_V3.map((role) => selectionForRole(result, role))
      .filter(({ status, solutionId }) => status === "selected" && solutionId !== null)
      .map(({ solutionId }) => solutionId as string)
  );
  return result.candidates.filter(({ solutionId }) => selectedIds.has(solutionId));
}

function successVetoes(
  execution: Extract<StayOptiV3SafetyExecutionV3, { status: "success" }>
): StayOptiV2SafetyHardVetoCodeV3[] {
  const vetoes: StayOptiV2SafetyHardVetoCodeV3[] = [];
  const validation = validatePersonalUtilityRolePolicyV3(execution.result);
  if (!validation.valid) vetoes.push("v3-result-invalid");
  if (!validateV3Bindings(execution.result, execution.roleBindings)) {
    vetoes.push("v3-policy-unbound");
  }
  if (
    execution.result.status === "usable" &&
    (execution.result.portfolio.bestChoice.status !== "selected" ||
      execution.result.portfolio.bestChoice.solutionId === null)
  ) {
    vetoes.push("v3-best-choice-missing");
  }
  const selected = selectedV3Candidates(execution.result);
  if (
    selected.some(({ reasonCodes }) =>
      reasonCodes.includes("policy:hard-constraint-unresolved")
    )
  ) {
    vetoes.push("v3-hard-constraint-failure");
  }
  if (
    selected.some(({ reasonCodes }) => reasonCodes.includes("policy:offer-not-verified"))
  ) {
    vetoes.push("v3-offer-integrity-failure");
  }
  const bestChoiceId = execution.result.portfolio.bestChoice.solutionId;
  const bestChoice = bestChoiceId === null
    ? undefined
    : execution.result.candidates.find(({ solutionId }) => solutionId === bestChoiceId);
  if (bestChoice !== undefined && bestChoice.dominatedBySolutionIds.length > 0) {
    vetoes.push("v3-dominated-choice");
  }
  if (
    execution.result.commercialSignalsUsed !== false ||
    FORBIDDEN_COMMERCIAL_FIELDS.test(JSON.stringify(execution.result))
  ) {
    vetoes.push("v3-commercial-signal");
  }
  return uniqueSorted(vetoes);
}

export function runV2SafetyKernelRuntimeGovernorV3<TPublicOutput>(
  input: RunStayOptiV2SafetyGovernorInputV3<TPublicOutput>
): StayOptiV2SafetyGovernorResultV3<TPublicOutput> {
  const v2Valid = validateV2PublicDecisionEnvelopeV3(input.v2).valid;
  const killSwitchValid = validateV2SafetyKillSwitchV3(input.killSwitch).valid;
  const killSwitchEngaged = !killSwitchValid || input.killSwitch.engaged;
  const vetoes: StayOptiV2SafetyHardVetoCodeV3[] = [];
  let comparisons: StayOptiV2V3RoleComparisonV3[] = [];
  let divergenceProof = blockedProof();
  let v3ConsumedForComparison = false;

  if (!v2Valid) vetoes.push("v2-public-output-invalid");
  if (killSwitchEngaged) vetoes.push("kill-switch-engaged");
  if (input.mode === "off") vetoes.push("mode-off");

  if (!killSwitchEngaged && input.mode !== "off") {
    if (input.v3.status === "not-run") vetoes.push("v3-not-run");
    if (input.v3.status === "import-failure") vetoes.push("v3-import-failure");
    if (input.v3.status === "timeout") vetoes.push("v3-timeout");
    if (input.v3.status === "error") vetoes.push("v3-exception");
    if (input.v3.status === "success") {
      const v3Vetoes = successVetoes(input.v3);
      vetoes.push(...v3Vetoes);
      if (v3Vetoes.length === 0) {
        comparisons = compareBindings(input.v2.roleBindings, input.v3.roleBindings);
        divergenceProof = createDivergenceProof(input.v3.result, comparisons);
        v3ConsumedForComparison = true;
        if (
          divergenceProof.status === "insufficient" ||
          divergenceProof.status === "blocked"
        ) {
          vetoes.push("divergence-proof-insufficient");
        }
      }
    }
  }

  vetoes.push("public-promotion-disabled");
  const action = v2Valid ? "serve-v2" : "abstain";
  const auditPayload: Omit<StayOptiV2SafetyGovernorAuditV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3,
    kernelVersion: STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3,
    application: "safety-kernel-shadow-canary-only",
    mode: input.mode,
    action,
    v3ExecutionStatus: input.v3.status,
    v3ConsumedForComparison,
    hardVetoes: uniqueSorted(vetoes),
    roleComparisons: comparisons,
    divergenceProof,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    providerCallsAllowed: false,
    bookingOrPaymentChanged: false,
    analyticsChanged: false,
    deployChanged: false,
    commercialSignalsUsed: false,
    teacherOutputsUsedAsGroundTruth: false,
  };

  return {
    publicResult: v2Valid ? input.v2.publicOutput : null,
    audit: { ...auditPayload, fingerprint: auditFingerprint(auditPayload) },
  };
}

export function validateV2SafetyGovernorAuditV3(
  audit: StayOptiV2SafetyGovernorAuditV3
): StayOptiV2SafetyValidationV3 {
  const violations: string[] = [];
  const registryCodes = new Set(
    STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3.map(({ code }) => code)
  );
  if (
    audit.schemaVersion !== STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3 ||
    audit.kernelVersion !== STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3 ||
    audit.application !== "safety-kernel-shadow-canary-only" ||
    !STAYOPTI_V2_SAFETY_MODES_V3.includes(audit.mode) ||
    audit.hardVetoes.some((code) => !registryCodes.has(code)) ||
    audit.publicV2Changed !== false ||
    audit.publicV3Enabled !== false ||
    audit.splitEnabled !== false ||
    audit.providerCallsAllowed !== false ||
    audit.bookingOrPaymentChanged !== false ||
    audit.analyticsChanged !== false ||
    audit.deployChanged !== false ||
    audit.commercialSignalsUsed !== false ||
    audit.teacherOutputsUsedAsGroundTruth !== false ||
    audit.divergenceProof.promotionAuthority !== false
  ) {
    violations.push("governor-audit-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = audit;
  if (
    !isStableHashV3(audit.fingerprint) ||
    audit.fingerprint !== auditFingerprint(payload)
  ) {
    violations.push("governor-audit-fingerprint-invalid");
  }
  return { valid: violations.length === 0, violations };
}

export function verifyV2SafetyRollbackV3<TPublicOutput>(input: {
  v2: StayOptiV2PublicDecisionEnvelopeV3<TPublicOutput>;
  killSwitch: StayOptiV2SafetyKillSwitchStateV3;
  result: StayOptiV2SafetyGovernorResultV3<TPublicOutput>;
}): boolean {
  return (
    validateV2PublicDecisionEnvelopeV3(input.v2).valid &&
    validateV2SafetyKillSwitchV3(input.killSwitch).valid &&
    input.killSwitch.engaged &&
    input.result.publicResult === input.v2.publicOutput &&
    input.result.audit.action === "serve-v2" &&
    input.result.audit.v3ConsumedForComparison === false &&
    input.result.audit.hardVetoes.includes("kill-switch-engaged") &&
    input.result.audit.publicV2Changed === false
  );
}

function zeroRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

export function createV2SafetyTelemetryAggregateV3(
  audits: readonly StayOptiV2SafetyGovernorAuditV3[]
): StayOptiV2SafetyTelemetryAggregateV3 {
  for (const audit of audits) {
    if (!validateV2SafetyGovernorAuditV3(audit).valid) {
      throw new Error("Cannot aggregate an invalid V2 Safety Kernel audit.");
    }
  }

  const actions = zeroRecord(["serve-v2", "abstain"] as const);
  const modes = zeroRecord(STAYOPTI_V2_SAFETY_MODES_V3);
  const executions = zeroRecord(STAYOPTI_V3_EXECUTION_STATUSES_V3);
  const vetoes = zeroRecord(
    STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3.map(({ code }) => code)
  );
  const roleOutcomes = zeroRecord([
    "aligned",
    "diverged",
    "v2-only",
    "v3-only",
    "both-abstain",
    "unavailable",
  ] as const);

  for (const audit of audits) {
    actions[audit.action] += 1;
    modes[audit.mode] += 1;
    executions[audit.v3ExecutionStatus] += 1;
    for (const veto of audit.hardVetoes) vetoes[veto] += 1;
    for (const comparison of audit.roleComparisons) {
      roleOutcomes[comparison.outcome] += 1;
    }
  }

  const payload: Omit<StayOptiV2SafetyTelemetryAggregateV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3,
    kernelVersion: STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3,
    aggregation: "privacy-safe-counts-only",
    total: audits.length,
    actions,
    modes,
    executions,
    vetoes,
    roleOutcomes,
    containsCaseLevelData: false,
    containsSolutionIdentifiers: false,
    containsCommercialData: false,
  };
  return { ...payload, fingerprint: telemetryFingerprint(payload) };
}

export function validateV2SafetyTelemetryAggregateV3(
  aggregate: StayOptiV2SafetyTelemetryAggregateV3
): StayOptiV2SafetyValidationV3 {
  const violations: string[] = [];
  const serialized = JSON.stringify(aggregate);
  const actionTotal = aggregate.actions["serve-v2"] + aggregate.actions.abstain;
  const modeTotal = Object.values(aggregate.modes).reduce((sum, count) => sum + count, 0);
  const executionTotal = Object.values(aggregate.executions).reduce(
    (sum, count) => sum + count,
    0
  );
  if (
    aggregate.schemaVersion !== STAYOPTI_V2_SAFETY_KERNEL_SCHEMA_VERSION_V3 ||
    aggregate.kernelVersion !== STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3 ||
    aggregate.aggregation !== "privacy-safe-counts-only" ||
    !Number.isInteger(aggregate.total) ||
    aggregate.total < 0 ||
    actionTotal !== aggregate.total ||
    modeTotal !== aggregate.total ||
    executionTotal !== aggregate.total ||
    aggregate.containsCaseLevelData !== false ||
    aggregate.containsSolutionIdentifiers !== false ||
    aggregate.containsCommercialData !== false ||
    FORBIDDEN_TELEMETRY_FIELDS.test(serialized)
  ) {
    violations.push("telemetry-aggregate-invalid");
  }
  const numericCounts = [
    ...Object.values(aggregate.actions),
    ...Object.values(aggregate.modes),
    ...Object.values(aggregate.executions),
    ...Object.values(aggregate.vetoes),
    ...Object.values(aggregate.roleOutcomes),
  ];
  if (numericCounts.some((count) => !Number.isInteger(count) || count < 0)) {
    violations.push("telemetry-count-invalid");
  }
  const { fingerprint: _fingerprint, ...payload } = aggregate;
  if (
    !isStableHashV3(aggregate.fingerprint) ||
    aggregate.fingerprint !== telemetryFingerprint(payload)
  ) {
    violations.push("telemetry-fingerprint-invalid");
  }
  return { valid: violations.length === 0, violations };
}

export const STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3 = Object.freeze({
  application: "safety-kernel-shadow-canary-only" as const,
  v2Authoritative: true as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  automaticPromotionAllowed: false as const,
  splitEnabled: false as const,
  providerCallsAllowed: false as const,
  bookingOrPaymentChanged: false as const,
  analyticsChanged: false as const,
  deployChanged: false as const,
  telemetryAggregation: "privacy-safe-counts-only" as const,
  commercialSignalsUsed: false as const,
  teacherOutputsUsedAsGroundTruth: false as const,
});
