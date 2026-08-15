import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_AUDIT_V3,
  STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_VERSION_V3,
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
  assertPersonalUtilityRolePolicyV3,
  runPersonalUtilityRolePolicyV3,
  validatePersonalUtilityRolePolicyV3,
  verifyPersonalUtilityRolePolicyReplayV3,
  type RunStayOptiPersonalUtilityRolePolicyInputV3,
  type StayOptiPersonalUtilityRolePolicyResultV3,
  type StayOptiRolePolicyProfileV3,
  type StayOptiRolePolicySolutionInputV3,
} from "../../src/engine-v3";

interface PolicyFixtureV3 {
  fixtureVersion: string;
  candidateSets: Record<string, StayOptiRolePolicySolutionInputV3[]>;
  profileExpectations: Record<StayOptiRolePolicyProfileV3, string>;
}

interface CurriculumFixtureV3 {
  cases: Array<{
    id: string;
    profile: StayOptiRolePolicyProfileV3;
    context: {
      nights: number;
      budget: number;
      currency: string;
    };
    claimIds: string[];
    testIds: string[];
    options: Array<{
      optionId: string;
      kind: "single-stay" | "split-stay";
      totalCost: number | null;
      hardConstraintsSatisfied: boolean | null;
      offerIntegrity: "verified" | "partial" | "invalid";
      dimensions: {
        quality: number | null;
        comfort: number | null;
        location: number | null;
        room: number | null;
        flexibility: number | null;
        "long-stays": number | null;
      };
    }>;
  }>;
}

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-15-personal-utility-role-policy-v1.json"
);
const curriculumPath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-14-decision-curriculum-v1.json"
);

function loadFixture(): PolicyFixtureV3 {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as PolicyFixtureV3;
}

function makeInput(
  candidateSetId: string,
  profile: StayOptiRolePolicyProfileV3 = "balanced",
  totalBudget = 1000,
  nights = 3
): RunStayOptiPersonalUtilityRolePolicyInputV3 {
  const fixture = loadFixture();
  return {
    caseId: `case-${candidateSetId}-${profile}-${totalBudget}`,
    profile,
    totalBudget,
    currency: "EUR",
    nights,
    solutions: structuredClone(fixture.candidateSets[candidateSetId]),
  };
}

function curriculumInput(caseId: string): RunStayOptiPersonalUtilityRolePolicyInputV3 {
  const fixture = JSON.parse(
    readFileSync(curriculumPath, "utf8")
  ) as CurriculumFixtureV3;
  const candidate = fixture.cases.find(({ id }) => id === caseId);
  if (!candidate) throw new Error(`Missing curriculum case: ${caseId}.`);

  return {
    caseId: candidate.id,
    profile: candidate.profile,
    totalBudget: candidate.context.budget,
    currency: candidate.context.currency,
    nights: candidate.context.nights,
    solutions: candidate.options.map((option) => ({
      solutionId: option.optionId,
      solutionType: option.kind,
      totalCost: option.totalCost,
      currency: candidate.context.currency,
      hardConstraintsSatisfied: option.hardConstraintsSatisfied,
      offerIntegrity: option.offerIntegrity,
      dimensions: {
        quality: { score: option.dimensions.quality, evidenceIds: candidate.claimIds },
        comfort: { score: option.dimensions.comfort, evidenceIds: candidate.claimIds },
        location: { score: option.dimensions.location, evidenceIds: candidate.claimIds },
        room: { score: option.dimensions.room, evidenceIds: candidate.claimIds },
        flexibility: { score: option.dimensions.flexibility, evidenceIds: candidate.claimIds },
        "long-stays": {
          score: option.dimensions["long-stays"],
          evidenceIds: candidate.claimIds,
        },
      },
      evidenceIds: [...candidate.claimIds, ...candidate.testIds],
    })),
  };
}

function violationCodes(result: StayOptiPersonalUtilityRolePolicyResultV3): string[] {
  return validatePersonalUtilityRolePolicyV3(result).violations.map(({ code }) => code);
}

test("V3-15 creates a valid offline, versioned and fingerprinted policy candidate", () => {
  const result = runPersonalUtilityRolePolicyV3(makeInput("profile-divergence"));
  const validation = validatePersonalUtilityRolePolicyV3(result);

  assert.equal(result.policyVersion, STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_VERSION_V3);
  assert.equal(result.application, "offline-policy-candidate-only");
  assert.equal(result.status, "usable");
  assert.match(result.inputFingerprint, /^fnv1a32-[a-f0-9]{8}$/);
  assert.match(result.policyConfigurationFingerprint, /^fnv1a32-[a-f0-9]{8}$/);
  assert.match(result.fingerprint, /^fnv1a32-[a-f0-9]{8}$/);
  assert.equal(validation.valid, true, JSON.stringify(validation.violations));
  assert.doesNotThrow(() => assertPersonalUtilityRolePolicyV3(result));
});

test("the same solution set produces profile-coherent Best Choices", () => {
  const fixture = loadFixture();
  const selected = new Set<string>();

  for (const profile of STAYOPTI_ROLE_POLICY_PROFILES_V3) {
    const result = runPersonalUtilityRolePolicyV3(makeInput("profile-divergence", profile));
    assert.equal(
      result.portfolio.bestChoice.solutionId,
      fixture.profileExpectations[profile],
      profile
    );
    selected.add(result.portfolio.bestChoice.solutionId ?? "none");
  }
  assert.ok(selected.size >= 3);
});

test("Maximum Comfort treats budget as a ceiling and is monotonic under budget expansion", () => {
  const lowerBudget = runPersonalUtilityRolePolicyV3(
    makeInput("profile-divergence", "maximum-comfort", 1000)
  );
  const higherBudget = runPersonalUtilityRolePolicyV3(
    makeInput("profile-divergence", "maximum-comfort", 2000)
  );

  assert.equal(lowerBudget.portfolio.bestChoice.solutionId, "profile-premium");
  assert.equal(higherBudget.portfolio.bestChoice.solutionId, "profile-premium");
  assert.equal(lowerBudget.profileSettings.budgetTreatment, "hard-ceiling-experience-first");
  assert.equal(lowerBudget.profileSettings.opportunityCostPointsPerBudgetRatio, 0);
  assert.ok(
    lowerBudget.candidates.every(({ opportunityCostPoints }) => opportunityCostPoints === 0)
  );
});

test("a free materially better solution cannot worsen the decision", () => {
  const result = runPersonalUtilityRolePolicyV3(
    makeInput("free-better", "maximum-comfort", 500)
  );
  assert.equal(result.portfolio.bestChoice.solutionId, "free-materially-better");
  assert.equal(result.portfolio.bestChoice.metrics.totalCost, 0);
});

test("a dominated solution cannot become Best Choice", () => {
  const result = runPersonalUtilityRolePolicyV3(makeInput("dominated"));
  const dominated = result.candidates.find(({ solutionId }) => solutionId === "dominated");

  assert.deepEqual(dominated?.dominatedBySolutionIds, ["dominant"]);
  assert.equal(result.portfolio.bestChoice.solutionId, "dominant");
});

test("Saving stays separate from Choice and exposes bounded quality loss", () => {
  const result = runPersonalUtilityRolePolicyV3(makeInput("bounded-saving"));
  const choice = result.portfolio.bestChoice;
  const saving = result.portfolio.bestSensibleSaving;

  assert.equal(choice.solutionId, "saving-choice");
  assert.equal(saving.status, "selected");
  assert.equal(saving.solutionId, "saving-bounded");
  assert.notEqual(saving.solutionId, choice.solutionId);
  assert.equal(saving.metrics.savingAmount, 200);
  assert.ok((saving.metrics.qualityLoss ?? Infinity) <= (saving.metrics.qualityLossTolerance ?? -1));
  assert.ok(
    (saving.metrics.experienceLoss ?? Infinity) <=
      (saving.metrics.experienceLossTolerance ?? -1)
  );
  assert.ok(saving.reasonCodes.includes("role:saving-separated-from-choice"));
});

test("Upgrade stays separate and publishes explicit marginal value", () => {
  const result = runPersonalUtilityRolePolicyV3(
    makeInput("profile-divergence", "balanced")
  );
  const upgrade = result.portfolio.worthwhileComfortUpgrade;

  assert.equal(result.portfolio.bestChoice.solutionId, "profile-mid");
  assert.equal(upgrade.status, "selected");
  assert.equal(upgrade.solutionId, "profile-premium");
  assert.ok((upgrade.metrics.upgradePremium ?? 0) > 0);
  assert.ok((upgrade.metrics.experienceGain ?? 0) > 0);
  assert.ok(
    (upgrade.metrics.marginalValuePer100 ?? -1) >=
      (upgrade.metrics.marginalValueThreshold ?? Infinity)
  );
  assert.ok(upgrade.reasonCodes.includes("role:upgrade-separated-from-choice"));
});

test("premium quality keeps its raw scale without diminishing-return compression", () => {
  const result = runPersonalUtilityRolePolicyV3(
    makeInput("profile-divergence", "maximum-comfort")
  );
  const premium = result.candidates.find(({ solutionId }) => solutionId === "profile-premium");
  const quality = premium?.contributions.find(({ dimension }) => dimension === "quality");

  assert.equal(quality?.sourceScore, 94);
  assert.equal(quality?.transform, "identity-premium-preserving");
  assert.equal(result.legacyBudgetUtilityUsed, false);
});

test("missing evidence is neutral and lowers coverage instead of inventing a penalty", () => {
  const result = runPersonalUtilityRolePolicyV3(
    makeInput("missing-neutral", "maximum-comfort")
  );
  const missing = result.candidates.find(({ solutionId }) => solutionId === "missing-location");
  const complete = result.candidates.find(({ solutionId }) => solutionId === "complete-equal");
  const location = missing?.contributions.find(({ dimension }) => dimension === "location");

  assert.equal(missing?.experienceScore, 80);
  assert.equal(complete?.experienceScore, 80);
  assert.ok((missing?.evidenceCoverage ?? 1) < (complete?.evidenceCoverage ?? 0));
  assert.equal(location?.availability, "missing-neutral");
  assert.equal(location?.weightedValue, null);
  assert.equal(location?.normalizedAvailableWeight, 0);
});

test("no-good-option abstains instead of forcing a recommendation", () => {
  const result = runPersonalUtilityRolePolicyV3(
    makeInput("no-good-option", "comfort", 700)
  );

  assert.equal(result.status, "abstained");
  assert.equal(result.portfolio.bestChoice.status, "abstained");
  assert.equal(result.portfolio.bestChoice.solutionId, null);
  assert.equal(result.portfolio.bestSensibleSaving.status, "abstained");
  assert.equal(result.portfolio.worthwhileComfortUpgrade.status, "abstained");
});

test("SPLIT remains represented but disabled in the V3-15 single-stay candidate", () => {
  const input = makeInput("profile-divergence");
  const split = structuredClone(input.solutions[1]);
  split.solutionId = "diagnostic-split";
  split.solutionType = "split-stay";
  input.solutions.push(split);

  const result = runPersonalUtilityRolePolicyV3(input);
  const splitCandidate = result.candidates.find(({ solutionId }) => solutionId === "diagnostic-split");

  assert.equal(splitCandidate?.status, "split-disabled");
  assert.equal(result.portfolio.split.status, "disabled");
  assert.equal(result.portfolio.split.solutionId, null);
  assert.equal(result.splitEnabled, false);
});

test("policy replay is deterministic across candidate and evidence ordering", () => {
  const input = makeInput("profile-divergence");
  const first = runPersonalUtilityRolePolicyV3(input);
  const reordered = structuredClone(input);
  reordered.solutions.reverse();
  for (const solution of reordered.solutions) {
    solution.evidenceIds.reverse();
    for (const dimension of Object.values(solution.dimensions)) {
      dimension.evidenceIds.reverse();
    }
  }
  const second = runPersonalUtilityRolePolicyV3(reordered);

  assert.deepEqual(second, first);
  assert.equal(verifyPersonalUtilityRolePolicyReplayV3(reordered, first), true);
});

test("Balanced curriculum regression preserves marginal-value choice and counterfactual", () => {
  const base = runPersonalUtilityRolePolicyV3(
    curriculumInput("case-balanced-marginal-value")
  );
  const counterfactual = runPersonalUtilityRolePolicyV3(
    curriculumInput("case-balanced-location-counterfactual")
  );

  assert.equal(base.portfolio.bestChoice.solutionId, "balanced-mid");
  assert.equal(base.portfolio.worthwhileComfortUpgrade.solutionId, "balanced-premium");
  assert.equal(counterfactual.portfolio.bestChoice.solutionId, "balanced-premium");
});

test("tampering, invented missing penalties and commercial/public fields fail closed", () => {
  const original = runPersonalUtilityRolePolicyV3(
    makeInput("missing-neutral", "maximum-comfort")
  );

  const publicTamper = structuredClone(original);
  publicTamper.publicApplicationEnabled = true as unknown as false;
  assert.ok(violationCodes(publicTamper).includes("public-firewall-open"));
  assert.ok(violationCodes(publicTamper).includes("fingerprint-invalid"));

  const missingPenalty = structuredClone(original);
  const missingCandidate = missingPenalty.candidates.find(
    ({ solutionId }) => solutionId === "missing-location"
  );
  const missingContribution = missingCandidate?.contributions.find(
    ({ dimension }) => dimension === "location"
  );
  if (!missingContribution) throw new Error("Missing diagnostic contribution.");
  missingContribution.weightedValue = 0;
  assert.ok(violationCodes(missingPenalty).includes("missing-evidence-penalized"));

  const commercial = structuredClone(original) as unknown as Record<string, unknown>;
  commercial.commission = 12;
  assert.ok(
    violationCodes(commercial as unknown as StayOptiPersonalUtilityRolePolicyResultV3).includes(
      "commercial-firewall-open"
    )
  );

  const commercialInput = makeInput("profile-divergence") as unknown as Record<
    string,
    unknown
  >;
  commercialInput.commission = 12;
  assert.throws(() =>
    runPersonalUtilityRolePolicyV3(
      commercialInput as unknown as RunStayOptiPersonalUtilityRolePolicyInputV3
    )
  );
});

test("V3-15 audit freezes runtime, V2, SPLIT, teacher and commercial boundaries", () => {
  assert.deepEqual(STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_AUDIT_V3, {
    application: "offline-policy-candidate-only",
    publicV2Changed: false,
    publicV3Enabled: false,
    runtimeIntegrationEnabled: false,
    splitEnabled: false,
    legacyBudgetUtilityUsed: false,
    rankingWeightsChangedInPublicRuntime: false,
    teacherOutputsUsedAsGroundTruth: false,
    commercialSignalsUsed: false,
    providerCallsAllowed: false,
    bookingOrPaymentChanged: false,
    analyticsChanged: false,
  });
  assert.equal(Object.isFrozen(STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_AUDIT_V3), true);
});
