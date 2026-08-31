import {
  createGoldenBlindCapsuleFingerprintV3,
  createGoldenBlindSha256DigestV3,
} from "./goldenBlindCapsuleV3";
import {
  STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3,
  STAYOPTI_GOLDEN_BLIND_MANIFEST_VERSION_V3,
  STAYOPTI_GOLDEN_DEBLIND_REPORT_VERSION_V3,
  type StayOptiGoldenBlindCapsuleV3,
  type StayOptiGoldenBlindJudgmentV3,
  type StayOptiGoldenBlindManifestV3,
  type StayOptiGoldenDeblindBreakdownV3,
  type StayOptiGoldenDeblindCountV3,
  type StayOptiGoldenDeblindReportV3,
  type StayOptiGoldenEvaluatorClassV3,
  type StayOptiGoldenEvaluatorConcentrationV3,
  type StayOptiGoldenJudgmentLedgerV3,
} from "./goldenJudgmentContractV3";
import {
  validateGoldenJudgmentLedgerV3,
} from "./goldenJudgmentValidatorV3";

function compareStrings(first: string, second: string) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function fingerprint(value: unknown, namespace: string) {
  return createGoldenBlindSha256DigestV3(value, namespace);
}

function expectedManifestFingerprint(manifest: StayOptiGoldenBlindManifestV3) {
  const { manifestFingerprint: _omitted, ...body } = manifest;
  return fingerprint(body, "stayopti-golden-blind-manifest");
}

function emptyCounts(): StayOptiGoldenDeblindCountV3 {
  return { v2: 0, v3: 0, tie: 0, insufficientEvidence: 0, total: 0 };
}

function addOutcome(
  counts: StayOptiGoldenDeblindCountV3,
  judgment: StayOptiGoldenBlindJudgmentV3,
  sideAEngine: "V2_BASELINE" | "V3_CANDIDATE",
  sideBEngine: "V2_BASELINE" | "V3_CANDIDATE",
) {
  counts.total += 1;
  if (judgment.choice === "TIE") counts.tie += 1;
  else if (judgment.choice === "INSUFFICIENT_EVIDENCE") counts.insufficientEvidence += 1;
  else {
    const selected = judgment.choice === "A" ? sideAEngine : sideBEngine;
    if (selected === "V2_BASELINE") counts.v2 += 1;
    else counts.v3 += 1;
  }
}

function breakdown(
  keys: readonly string[],
  judgments: readonly StayOptiGoldenBlindJudgmentV3[],
  keyFor: (judgment: StayOptiGoldenBlindJudgmentV3) => string,
  mapping: ReadonlyMap<string, { sideAEngine: "V2_BASELINE" | "V3_CANDIDATE"; sideBEngine: "V2_BASELINE" | "V3_CANDIDATE" }>,
): StayOptiGoldenDeblindBreakdownV3[] {
  return [...new Set(keys)].sort(compareStrings).map((key) => {
    const counts = emptyCounts();
    for (const judgment of judgments.filter((item) => keyFor(item) === key)) {
      const entry = mapping.get(judgment.evaluationTaskId);
      if (entry === undefined) throw new Error("Deblind mapping is incomplete.");
      addOutcome(counts, judgment, entry.sideAEngine, entry.sideBEngine);
    }
    return { key, counts };
  });
}

function concentration(
  evaluatorClass: StayOptiGoldenEvaluatorClassV3,
  judgments: readonly StayOptiGoldenBlindJudgmentV3[],
): StayOptiGoldenEvaluatorConcentrationV3 {
  const selected = judgments.filter((judgment) => judgment.evaluatorClass === evaluatorClass);
  const counts = new Map<string, number>();
  for (const judgment of selected) {
    counts.set(judgment.evaluatorPseudonym, (counts.get(judgment.evaluatorPseudonym) ?? 0) + 1);
  }
  const maximum = selected.length === 0 ? null : Math.max(...counts.values());
  const maximumShareBps = maximum === null
    ? null
    : Math.ceil((maximum * 10_000) / selected.length);
  const limitBps = evaluatorClass === "HUMAN" ? 1000 as const : 2500 as const;
  const volumeReached = evaluatorClass === "HUMAN"
    ? selected.length >= 300 && counts.size >= 20
    : selected.length >= 100 && counts.size >= 5;
  return {
    evaluatorClass,
    distinctEvaluators: counts.size,
    judgmentCount: selected.length,
    maximumShareBps,
    limitBps,
    status: !volumeReached
      ? "NOT_YET_APPLICABLE"
      : maximumShareBps !== null && maximumShareBps <= limitBps
        ? "PASS"
        : "FAIL",
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function createGoldenDeblindReportV3(
  capsule: StayOptiGoldenBlindCapsuleV3,
  manifest: StayOptiGoldenBlindManifestV3,
  ledger: StayOptiGoldenJudgmentLedgerV3,
): StayOptiGoldenDeblindReportV3 {
  if (
    capsule.capsuleVersion !== STAYOPTI_GOLDEN_BLIND_CAPSULE_VERSION_V3 ||
    manifest.capsuleVersion !== capsule.capsuleVersion ||
    manifest.manifestVersion !== STAYOPTI_GOLDEN_BLIND_MANIFEST_VERSION_V3 ||
    manifest.batchId !== capsule.batchId || ledger.batchId !== capsule.batchId ||
    manifest.capsuleFingerprint !== createGoldenBlindCapsuleFingerprintV3(capsule) ||
    manifest.manifestFingerprint !== expectedManifestFingerprint(manifest)
  ) {
    throw new Error("Golden deblind rejected a version, batch or manifest binding mismatch.");
  }
  if (manifest.entries.length !== capsule.tasks.length || capsule.taskCount !== capsule.tasks.length) {
    throw new Error("Golden deblind requires one private manifest entry per capsule task.");
  }
  const entryByTask = new Map(manifest.entries.map((entry) => [entry.evaluationTaskId, entry]));
  if (entryByTask.size !== manifest.entries.length) {
    throw new Error("Golden deblind manifest contains duplicate task mappings.");
  }
  for (const task of capsule.tasks) {
    const entry = entryByTask.get(task.evaluationTaskId);
    if (
      entry === undefined || entry.blindedCaseId !== task.blindedCaseId ||
      entry.role !== task.role ||
      entry.taskFingerprint !== fingerprint(task, "stayopti-golden-blind-task")
    ) {
      throw new Error("Golden deblind manifest does not match its capsule task.");
    }
  }
  const ledgerValidation = validateGoldenJudgmentLedgerV3(ledger, capsule.tasks);
  if (!ledgerValidation.valid) {
    throw new Error("Golden deblind requires a valid immutable judgment ledger.");
  }
  const judgedTasks = new Set(ledger.judgments.map((judgment) => judgment.evaluationTaskId));
  const capsuleTasks = new Set(capsule.tasks.map((task) => task.evaluationTaskId));
  if (
    [...capsuleTasks].some((taskId) => !judgedTasks.has(taskId)) ||
    [...judgedTasks].some((taskId) => !capsuleTasks.has(taskId))
  ) {
    throw new Error("Golden deblind detected missing or additional task judgments.");
  }

  const overall = emptyCounts();
  for (const judgment of ledger.judgments) {
    const entry = entryByTask.get(judgment.evaluationTaskId);
    if (entry === undefined) throw new Error("Golden deblind mapping is incomplete.");
    addOutcome(overall, judgment, entry.sideAEngine, entry.sideBEngine);
  }
  const roleByTask = new Map(capsule.tasks.map((task) => [task.evaluationTaskId, task.role]));
  const familyByTask = new Map(
    manifest.entries.map((entry) => [entry.evaluationTaskId, entry.searchFamilyId]),
  );
  const caseIds = new Set<string>();
  const familyIds = new Set<string>();
  for (const judgment of ledger.judgments) {
    const entry = entryByTask.get(judgment.evaluationTaskId);
    if (entry === undefined) throw new Error("Golden deblind mapping is incomplete.");
    caseIds.add(entry.goldenCaseId);
    familyIds.add(entry.searchFamilyId);
  }
  const sideDistribution = {
    A: ledger.judgments.filter((judgment) => judgment.choice === "A").length,
    B: ledger.judgments.filter((judgment) => judgment.choice === "B").length,
    TIE: ledger.judgments.filter((judgment) => judgment.choice === "TIE").length,
    INSUFFICIENT_EVIDENCE: ledger.judgments.filter(
      (judgment) => judgment.choice === "INSUFFICIENT_EVIDENCE",
    ).length,
  };
  const body: Omit<StayOptiGoldenDeblindReportV3, "fingerprint"> = {
    reportVersion: STAYOPTI_GOLDEN_DEBLIND_REPORT_VERSION_V3,
    batchId: capsule.batchId,
    capsuleFingerprint: manifest.capsuleFingerprint,
    ledgerFingerprint: ledger.fingerprint,
    totalJudgments: ledger.judgments.length,
    caseDenominator: caseIds.size,
    searchFamilyDenominator: familyIds.size,
    overall,
    byRole: breakdown(
      [...roleByTask.values()],
      ledger.judgments,
      (judgment) => roleByTask.get(judgment.evaluationTaskId) ?? "UNKNOWN",
      entryByTask,
    ),
    byEvaluatorClass: breakdown(
      ["EXPERT", "HUMAN"],
      ledger.judgments,
      (judgment) => judgment.evaluatorClass,
      entryByTask,
    ),
    bySearchFamily: breakdown(
      [...familyByTask.values()],
      ledger.judgments,
      (judgment) => familyByTask.get(judgment.evaluationTaskId) ?? "UNKNOWN",
      entryByTask,
    ),
    sideDistribution,
    roleDistribution: [...new Set(roleByTask.values())].sort(compareStrings).map((role) => ({
      role,
      count: ledger.judgments.filter((judgment) =>
        roleByTask.get(judgment.evaluationTaskId) === role
      ).length,
    })),
    familyDistribution: [...familyIds].sort(compareStrings).map((searchFamilyId) => ({
      searchFamilyId,
      count: ledger.judgments.filter((judgment) =>
        familyByTask.get(judgment.evaluationTaskId) === searchFamilyId
      ).length,
    })),
    humanConcentration: concentration("HUMAN", ledger.judgments),
    expertConcentration: concentration("EXPERT", ledger.judgments),
    duplicateEvaluatorTaskCount: 0,
    v3GateEvaluated: false,
  };
  return deepFreeze({
    ...body,
    fingerprint: fingerprint(body, "stayopti-golden-deblind-report"),
  });
}

export const STAYOPTI_GOLDEN_DEBLIND_AUDIT_V3 = Object.freeze({
  deterministic: true as const,
  caseDenominator: true as const,
  searchFamilyDenominator: true as const,
  humanConcentrationLimitBps: 1000 as const,
  expertConcentrationLimitBps: 2500 as const,
  v3GateEvaluated: false as const,
  providerIdentityExposed: false as const,
  commercialFieldsExposed: false as const,
});
