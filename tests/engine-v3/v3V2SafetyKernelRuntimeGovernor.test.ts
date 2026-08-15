import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3,
  STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3,
  STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3,
  createStableHashV3,
  createV2PublicDecisionEnvelopeV3,
  createV2SafetyKillSwitchV3,
  createV2SafetyTelemetryAggregateV3,
  engageV2SafetyKillSwitchV3,
  runPersonalUtilityRolePolicyV3,
  runV2SafetyKernelRuntimeGovernorV3,
  validateV2PublicDecisionEnvelopeV3,
  validateV2SafetyGovernorAuditV3,
  validateV2SafetyKillSwitchV3,
  validateV2SafetyTelemetryAggregateV3,
  verifyV2SafetyRollbackV3,
  type RunStayOptiPersonalUtilityRolePolicyInputV3,
  type StayOptiComparableRoleBindingV3,
  type StayOptiPersonalUtilityRolePolicyResultV3,
  type StayOptiRolePolicyRoleV3,
  type StayOptiRolePolicySolutionInputV3,
  type StayOptiV2PublicDecisionEnvelopeV3,
  type StayOptiV2SafetyGovernorAuditV3,
  type StayOptiV3SafetyExecutionV3,
} from "../../src/engine-v3";

interface SafetyFixtureV3 {
  fixtureVersion: string;
  v2: {
    policyVersion: string;
    publicOutput: {
      decision: string;
      headline: string;
      price: number;
      currency: string;
    };
    roles: Array<{
      role: StayOptiRolePolicyRoleV3;
      status: StayOptiComparableRoleBindingV3["status"];
      solutionId: string | null;
    }>;
  };
  expectedCriticalVetoes: string[];
}

interface PolicyFixtureV3 {
  candidateSets: Record<string, StayOptiRolePolicySolutionInputV3[]>;
}

const safetyFixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-16-v2-safety-kernel-v1.json"
);
const policyFixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-15-personal-utility-role-policy-v1.json"
);

function loadSafetyFixture(): SafetyFixtureV3 {
  return JSON.parse(readFileSync(safetyFixturePath, "utf8")) as SafetyFixtureV3;
}

function solutionFingerprint(solutionId: string): string {
  return createStableHashV3(
    { solutionId },
    "stayopti-v3-v2-safety-test-solution"
  );
}

function binding(
  role: StayOptiRolePolicyRoleV3,
  status: StayOptiComparableRoleBindingV3["status"],
  solutionId: string | null
): StayOptiComparableRoleBindingV3 {
  return {
    role,
    status,
    solutionId,
    solutionFingerprint:
      status === "selected" && solutionId !== null
        ? solutionFingerprint(solutionId)
        : null,
  };
}

function makeV2(): StayOptiV2PublicDecisionEnvelopeV3<
  SafetyFixtureV3["v2"]["publicOutput"]
> {
  const fixture = loadSafetyFixture();
  return createV2PublicDecisionEnvelopeV3({
    policyVersion: fixture.v2.policyVersion,
    publicOutput: structuredClone(fixture.v2.publicOutput),
    roleBindings: fixture.v2.roles.map(({ role, status, solutionId }) =>
      binding(role, status, solutionId)
    ),
  });
}

function makeV3Result(): StayOptiPersonalUtilityRolePolicyResultV3 {
  const fixture = JSON.parse(
    readFileSync(policyFixturePath, "utf8")
  ) as PolicyFixtureV3;
  const input: RunStayOptiPersonalUtilityRolePolicyInputV3 = {
    caseId: "case-v3-16-safety-kernel",
    profile: "balanced",
    totalBudget: 1000,
    currency: "EUR",
    nights: 3,
    solutions: structuredClone(fixture.candidateSets["profile-divergence"]),
  };
  return runPersonalUtilityRolePolicyV3(input);
}

function makeV3Bindings(
  result: StayOptiPersonalUtilityRolePolicyResultV3
): StayOptiComparableRoleBindingV3[] {
  const selections = [
    result.portfolio.bestChoice,
    result.portfolio.bestSensibleSaving,
    result.portfolio.worthwhileComfortUpgrade,
    result.portfolio.split,
  ];
  return selections.map((selection) =>
    binding(selection.role, selection.status, selection.solutionId)
  );
}

function successExecution(): Extract<
  StayOptiV3SafetyExecutionV3,
  { status: "success" }
> {
  const result = makeV3Result();
  return { status: "success", result, roleBindings: makeV3Bindings(result) };
}

function runFailure(v3: StayOptiV3SafetyExecutionV3) {
  const v2 = makeV2();
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2,
    v3,
    killSwitch: createV2SafetyKillSwitchV3(),
  });
  return { v2, governed };
}

test("V3-16 hard-veto registry is frozen, unique and contains every critical gate", () => {
  const fixture = loadSafetyFixture();
  const codes = STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3.map(({ code }) => code);

  assert.equal(Object.isFrozen(STAYOPTI_V2_SAFETY_HARD_VETO_REGISTRY_V3), true);
  assert.equal(new Set(codes).size, codes.length);
  for (const expected of fixture.expectedCriticalVetoes) {
    assert.ok(codes.includes(expected as (typeof codes)[number]), expected);
  }
});

test("a valid shadow comparison returns the exact authoritative V2 object", () => {
  const v2 = makeV2();
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2,
    v3: successExecution(),
    killSwitch: createV2SafetyKillSwitchV3(),
  });

  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.equal(governed.audit.action, "serve-v2");
  assert.equal(governed.audit.publicV2Changed, false);
  assert.equal(governed.audit.publicV3Enabled, false);
  assert.equal(governed.audit.v3ConsumedForComparison, true);
  assert.equal(validateV2SafetyGovernorAuditV3(governed.audit).valid, true);
});

test("the comparator aligns only equal solution fingerprints within the same role", () => {
  const v2 = makeV2();
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2,
    v3: successExecution(),
    killSwitch: createV2SafetyKillSwitchV3(),
  });

  assert.deepEqual(
    governed.audit.roleComparisons.map(({ role, outcome }) => [role, outcome]),
    [
      ["best-choice", "aligned"],
      ["best-sensible-saving", "both-abstain"],
      ["worthwhile-comfort-upgrade", "aligned"],
      ["split", "both-abstain"],
    ]
  );
});

test("a V3 import failure cannot modify the public V2 output", () => {
  const { v2, governed } = runFailure({
    status: "import-failure",
    safeErrorCode: "module-unavailable",
  });
  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.ok(governed.audit.hardVetoes.includes("v3-import-failure"));
  assert.equal(governed.audit.v3ConsumedForComparison, false);
});

test("a V3 timeout cannot modify the public V2 output", () => {
  const { v2, governed } = runFailure({
    status: "timeout",
    safeErrorCode: "bounded-timeout",
  });
  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.ok(governed.audit.hardVetoes.includes("v3-timeout"));
  assert.equal(governed.audit.v3ConsumedForComparison, false);
});

test("a V3 exception cannot modify the public V2 output", () => {
  const { v2, governed } = runFailure({
    status: "error",
    safeErrorCode: "classified-execution-error",
  });
  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.ok(governed.audit.hardVetoes.includes("v3-exception"));
  assert.equal(governed.audit.v3ConsumedForComparison, false);
});

test("a corrupted V3 fingerprint is vetoed and V2 remains byte-identical by reference", () => {
  const execution = successExecution();
  const corrupted = structuredClone(execution.result);
  corrupted.fingerprint = "fnv1a32-00000000";
  const { v2, governed } = runFailure({
    status: "success",
    result: corrupted,
    roleBindings: execution.roleBindings,
  });

  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.ok(governed.audit.hardVetoes.includes("v3-result-invalid"));
  assert.equal(governed.audit.roleComparisons.length, 0);
});

test("V3 role bindings must name the exact selected solution", () => {
  const execution = successExecution();
  const unbound = structuredClone(execution.roleBindings);
  const best = unbound.find(({ role }) => role === "best-choice");
  assert.ok(best !== undefined);
  best.solutionId = "different-solution";
  best.solutionFingerprint = solutionFingerprint("different-solution");
  const { v2, governed } = runFailure({
    status: "success",
    result: execution.result,
    roleBindings: unbound,
  });

  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.ok(governed.audit.hardVetoes.includes("v3-policy-unbound"));
  assert.equal(governed.audit.v3ConsumedForComparison, false);
});

test("corrupt hard-constraint and offer-integrity evidence activates explicit vetoes", () => {
  const execution = successExecution();
  const corrupted = structuredClone(execution.result);
  const choiceId = corrupted.portfolio.bestChoice.solutionId;
  const choice = corrupted.candidates.find(({ solutionId }) => solutionId === choiceId);
  assert.ok(choice !== undefined);
  choice.reasonCodes.push(
    "policy:hard-constraint-unresolved",
    "policy:offer-not-verified"
  );
  const { governed } = runFailure({
    status: "success",
    result: corrupted,
    roleBindings: execution.roleBindings,
  });

  assert.ok(governed.audit.hardVetoes.includes("v3-hard-constraint-failure"));
  assert.ok(governed.audit.hardVetoes.includes("v3-offer-integrity-failure"));
  assert.equal(governed.audit.publicV2Changed, false);
});

test("kill switch is one-way, idempotent and verifies exact rollback to V2", () => {
  const initial = createV2SafetyKillSwitchV3();
  const engaged = engageV2SafetyKillSwitchV3(initial);
  const again = engageV2SafetyKillSwitchV3(engaged);
  const v2 = makeV2();
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "canary",
    v2,
    v3: successExecution(),
    killSwitch: engaged,
  });

  assert.equal(validateV2SafetyKillSwitchV3(engaged).valid, true);
  assert.strictEqual(again, engaged);
  assert.equal(engaged.generation, 1);
  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.equal(governed.audit.v3ConsumedForComparison, false);
  assert.ok(governed.audit.hardVetoes.includes("kill-switch-engaged"));
  assert.equal(verifyV2SafetyRollbackV3({ v2, killSwitch: engaged, result: governed }), true);
});

test("an invalid kill-switch state fails closed", () => {
  const invalid = createV2SafetyKillSwitchV3();
  invalid.fingerprint = "fnv1a32-00000000";
  const v2 = makeV2();
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2,
    v3: successExecution(),
    killSwitch: invalid,
  });

  assert.strictEqual(governed.publicResult, v2.publicOutput);
  assert.ok(governed.audit.hardVetoes.includes("kill-switch-engaged"));
  assert.equal(governed.audit.v3ConsumedForComparison, false);
});

test("an invalid V2 envelope abstains instead of leaking a V3 decision", () => {
  const v2 = makeV2();
  v2.fingerprint = "fnv1a32-00000000";
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "canary",
    v2,
    v3: successExecution(),
    killSwitch: createV2SafetyKillSwitchV3(),
  });

  assert.equal(validateV2PublicDecisionEnvelopeV3(v2).valid, false);
  assert.equal(governed.publicResult, null);
  assert.equal(governed.audit.action, "abstain");
  assert.ok(governed.audit.hardVetoes.includes("v2-public-output-invalid"));
  assert.equal(governed.audit.publicV3Enabled, false);
});

test("a divergence can produce complete evidence proof but never promotion authority", () => {
  const original = makeV2();
  const changedBindings = structuredClone(original.roleBindings);
  const choice = changedBindings.find(({ role }) => role === "best-choice");
  assert.ok(choice !== undefined);
  choice.solutionId = "profile-value";
  choice.solutionFingerprint = solutionFingerprint("profile-value");
  const v2 = createV2PublicDecisionEnvelopeV3({
    policyVersion: original.policyVersion,
    publicOutput: original.publicOutput,
    roleBindings: changedBindings,
  });
  const governed = runV2SafetyKernelRuntimeGovernorV3({
    mode: "canary",
    v2,
    v3: successExecution(),
    killSwitch: createV2SafetyKillSwitchV3(),
  });
  const comparison = governed.audit.roleComparisons.find(
    ({ role }) => role === "best-choice"
  );

  assert.equal(comparison?.outcome, "diverged");
  assert.equal(governed.audit.divergenceProof.status, "complete-candidate");
  assert.equal(governed.audit.divergenceProof.promotionAuthority, false);
  assert.ok(governed.audit.hardVetoes.includes("public-promotion-disabled"));
  assert.strictEqual(governed.publicResult, v2.publicOutput);
});

test("telemetry contains aggregate counts only and rejects tampering", () => {
  const successV2 = makeV2();
  const success = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2: successV2,
    v3: successExecution(),
    killSwitch: createV2SafetyKillSwitchV3(),
  });
  const failure = runFailure({
    status: "timeout",
    safeErrorCode: "bounded-timeout",
  }).governed;
  const aggregate = createV2SafetyTelemetryAggregateV3([
    success.audit,
    failure.audit,
  ]);
  const serialized = JSON.stringify(aggregate);

  assert.equal(aggregate.total, 2);
  assert.equal(aggregate.actions["serve-v2"], 2);
  assert.equal(aggregate.executions.success, 1);
  assert.equal(aggregate.executions.timeout, 1);
  assert.equal(validateV2SafetyTelemetryAggregateV3(aggregate).valid, true);
  assert.doesNotMatch(
    serialized,
    /"(caseId|solutionId|solutionFingerprint|publicOutput|provider|commission|markup|clickProbability)"\s*:/i
  );

  const tampered = structuredClone(aggregate);
  tampered.total += 1;
  assert.equal(validateV2SafetyTelemetryAggregateV3(tampered).valid, false);
});

test("governor replay is deterministic across role-binding order", () => {
  const firstV2 = makeV2();
  const secondV2 = createV2PublicDecisionEnvelopeV3({
    policyVersion: firstV2.policyVersion,
    publicOutput: structuredClone(firstV2.publicOutput),
    roleBindings: [...firstV2.roleBindings].reverse(),
  });
  const firstExecution = successExecution();
  const secondExecution = {
    ...firstExecution,
    roleBindings: [...firstExecution.roleBindings].reverse(),
  };
  const killSwitch = createV2SafetyKillSwitchV3();
  const first = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2: firstV2,
    v3: firstExecution,
    killSwitch,
  });
  const second = runV2SafetyKernelRuntimeGovernorV3({
    mode: "shadow",
    v2: secondV2,
    v3: secondExecution,
    killSwitch,
  });

  assert.equal(secondV2.fingerprint, firstV2.fingerprint);
  assert.deepEqual(second.audit, first.audit);
});

test("static audit freezes the V2 authority and all external side effects", () => {
  assert.equal(Object.isFrozen(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3), true);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.v2Authoritative, true);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.publicV2Changed, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.publicV3Enabled, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.automaticPromotionAllowed, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.splitEnabled, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.providerCallsAllowed, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.bookingOrPaymentChanged, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.analyticsChanged, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_AUDIT_V3.deployChanged, false);
  assert.equal(STAYOPTI_V2_SAFETY_KERNEL_VERSION_V3, "3.0.0-v2-safety-kernel.1");
});

test("audit fingerprints detect mutation", () => {
  const audit = runFailure({ status: "not-run" }).governed.audit;
  const tampered = structuredClone(audit) as StayOptiV2SafetyGovernorAuditV3;
  tampered.action = "abstain";

  assert.equal(validateV2SafetyGovernorAuditV3(audit).valid, true);
  assert.equal(validateV2SafetyGovernorAuditV3(tampered).valid, false);
});
