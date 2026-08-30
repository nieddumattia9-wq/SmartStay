import {
  type StayOptiGoldenCaseV3,
  type StayOptiGoldenCaseValidationResultV3,
  type StayOptiGoldenCorpusValidationResultV3,
  type StayOptiGoldenValidationIssueV3,
  type StayOptiGoldenValidationReasonCodeV3,
  STAYOPTI_GOLDEN_MAX_PRIMARY_CASES_PER_FAMILY_V3,
} from "./goldenCaseContractV3";

import {
  validateCounterfactualPairV3,
  validateGoldenCaseV3,
} from "./goldenCaseValidatorV3";

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function issueKey(issue: StayOptiGoldenValidationIssueV3) {
  return `${issue.path}\u0000${issue.reasonCode}`;
}

function sortedIssues(issues: readonly StayOptiGoldenValidationIssueV3[]) {
  return [...new Map(issues.map((issue) => [issueKey(issue), issue])).values()]
    .sort((left, right) =>
      compareStrings(left.path, right.path) ||
      compareStrings(left.reasonCode, right.reasonCode)
    );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? value as Record<string, unknown>
    : null;
}

function withCorpusRejection(
  report: StayOptiGoldenCaseValidationResultV3,
  reasonCode: StayOptiGoldenValidationReasonCodeV3,
  path: string
): StayOptiGoldenCaseValidationResultV3 {
  return {
    ...report,
    disposition: "REJECTED_CONTRACT",
    issues: sortedIssues([...report.issues, { reasonCode, path }]),
    providerNeutralReplayEligible: false,
    evaluableAbstention: false,
  };
}

export function validateGoldenCorpusV3(
  cases: readonly unknown[]
): StayOptiGoldenCorpusValidationResultV3 {
  let reports = cases.map(validateGoldenCaseV3);
  const corpusIssues: StayOptiGoldenValidationIssueV3[] = [];

  const indexesByCaseId = new Map<string, number[]>();
  const indexesByFingerprint = new Map<string, number[]>();
  for (const [index, value] of cases.entries()) {
    const record = asRecord(value);
    if (typeof record?.goldenCaseId === "string") {
      const indexes = indexesByCaseId.get(record.goldenCaseId) ?? [];
      indexes.push(index);
      indexesByCaseId.set(record.goldenCaseId, indexes);
    }
    const fingerprint = reports[index]?.computedFingerprint;
    if (fingerprint !== null && fingerprint !== undefined) {
      const indexes = indexesByFingerprint.get(fingerprint) ?? [];
      indexes.push(index);
      indexesByFingerprint.set(fingerprint, indexes);
    }
  }

  for (const indexes of indexesByCaseId.values()) {
    if (indexes.length < 2) continue;
    for (const index of indexes) {
      const report = reports[index];
      if (report !== undefined) {
        reports[index] = withCorpusRejection(
          report,
          "GOLDEN_DUPLICATE_CASE_ID",
          `cases[${index}].goldenCaseId`
        );
      }
    }
    corpusIssues.push({
      reasonCode: "GOLDEN_DUPLICATE_CASE_ID",
      path: "corpus.goldenCaseIds",
    });
  }

  let exactDuplicates = 0;
  for (const indexes of indexesByFingerprint.values()) {
    if (indexes.length < 2) continue;
    exactDuplicates += indexes.length - 1;
    for (const index of indexes) {
      const report = reports[index];
      if (report !== undefined) {
        reports[index] = withCorpusRejection(
          report,
          "GOLDEN_EXACT_DUPLICATE",
          `cases[${index}].declaredFingerprint`
        );
      }
    }
    corpusIssues.push({
      reasonCode: "GOLDEN_EXACT_DUPLICATE",
      path: "corpus.fingerprints",
    });
  }

  const candidateIndexesByFamily = new Map<string, number[]>();
  for (const [index, value] of cases.entries()) {
    if (reports[index]?.disposition !== "GOLDEN_VALID") continue;
    const record = asRecord(value);
    if (typeof record?.searchFamilyId !== "string") continue;
    const indexes = candidateIndexesByFamily.get(record.searchFamilyId) ?? [];
    indexes.push(index);
    candidateIndexesByFamily.set(record.searchFamilyId, indexes);
  }
  for (const indexes of candidateIndexesByFamily.values()) {
    if (indexes.length <= STAYOPTI_GOLDEN_MAX_PRIMARY_CASES_PER_FAMILY_V3) continue;
    for (const index of indexes) {
      const report = reports[index];
      if (report !== undefined) {
        reports[index] = withCorpusRejection(
          report,
          "GOLDEN_FAMILY_LIMIT_EXCEEDED",
          `cases[${index}].searchFamilyId`
        );
      }
    }
    corpusIssues.push({
      reasonCode: "GOLDEN_FAMILY_LIMIT_EXCEEDED",
      path: "corpus.searchFamilies",
    });
  }

  const counterfactualIndexesByPair = new Map<string, number[]>();
  for (const [index, value] of cases.entries()) {
    if (reports[index]?.disposition !== "GOLDEN_VALID") continue;
    const record = asRecord(value);
    if (record?.sourceKind !== "COUNTERFACTUAL_DERIVED") continue;
    const counterfactual = asRecord(record.counterfactual);
    if (typeof counterfactual?.counterfactualPairId !== "string") continue;
    const indexes = counterfactualIndexesByPair.get(counterfactual.counterfactualPairId) ?? [];
    indexes.push(index);
    counterfactualIndexesByPair.set(counterfactual.counterfactualPairId, indexes);
  }
  for (const indexes of counterfactualIndexesByPair.values()) {
    const validPair = indexes.length === 2 &&
      validateCounterfactualPairV3(
        cases[indexes[0] as number] as StayOptiGoldenCaseV3,
        cases[indexes[1] as number] as StayOptiGoldenCaseV3
      ).valid;
    if (validPair) continue;
    for (const index of indexes) {
      const report = reports[index];
      if (report !== undefined) {
        reports[index] = withCorpusRejection(
          report,
          "GOLDEN_COUNTERFACTUAL_INVALID",
          `cases[${index}].counterfactual`
        );
      }
    }
    corpusIssues.push({
      reasonCode: "GOLDEN_COUNTERFACTUAL_INVALID",
      path: "corpus.counterfactualPairs",
    });
  }

  const admittedIndexes = reports
    .map((report, index) => ({ report, index }))
    .filter(({ report }) => report.disposition === "GOLDEN_VALID")
    .map(({ index }) => index);
  const admittedRecords = admittedIndexes
    .map((index) => asRecord(cases[index]))
    .filter((record): record is Record<string, unknown> => record !== null);
  const familyCounts = new Map<string, number>();
  for (const record of admittedRecords) {
    if (typeof record.searchFamilyId !== "string") continue;
    familyCounts.set(record.searchFamilyId, (familyCounts.get(record.searchFamilyId) ?? 0) + 1);
  }
  const primaryCasesPerFamily = Object.fromEntries(
    [...familyCounts.entries()].sort(([left], [right]) => compareStrings(left, right))
  );

  const valid = reports.filter((report) => report.disposition === "GOLDEN_VALID").length;
  const quarantined = reports.filter((report) => report.disposition === "QUARANTINED_INCOMPLETE").length;
  const rejected = reports.filter((report) => report.disposition === "REJECTED_CONTRACT").length;
  const splitCasesExcluded = cases.filter((value) => {
    const record = asRecord(value);
    return record?.expectedRole === "split-saver";
  }).length;

  return {
    valid: quarantined === 0 && rejected === 0,
    reports,
    issues: sortedIssues(corpusIssues),
    counts: {
      totalReceived: cases.length,
      valid,
      quarantined,
      rejected,
      exactDuplicates,
      familyCount: familyCounts.size,
      adversarialCases: admittedRecords.filter((record) => record.sourceKind === "CONTROLLED_ADVERSARIAL").length,
      counterfactualCases: admittedRecords.filter((record) => record.sourceKind === "COUNTERFACTUAL_DERIVED").length,
      evaluableAbstentions: admittedIndexes.filter((index) => reports[index]?.evaluableAbstention === true).length,
      providerNeutralReplayEligibleCases: admittedIndexes.filter(
        (index) => reports[index]?.providerNeutralReplayEligible === true
      ).length,
      splitCasesExcluded,
    },
    caseDenominator: valid,
    searchFamilyDenominator: familyCounts.size,
    primaryCasesPerFamily,
    inputMutated: false,
    v3_17GateMet: false,
    v3_18EntryAllowed: false,
  };
}
