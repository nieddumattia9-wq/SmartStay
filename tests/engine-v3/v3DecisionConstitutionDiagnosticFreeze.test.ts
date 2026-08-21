import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  STAYOPTI_DECISION_CONSTITUTION_V3,
  STAYOPTI_DECISION_CONSTITUTION_VERSION_V3,
  STAYOPTI_DIAGNOSTIC_JUDGMENT_SCHEMA_VERSION_V3,
  STAYOPTI_ROLE_AWARE_BLIND_PROTOCOL_VERSION_V3,
  evaluateBudgetExpansionInvariantV3,
  evaluateProfileCoherenceInvariantV3,
  evaluateRoleComparisonInvariantV3,
  summarizeDiagnosticJudgmentsV3,
  type StayOptiConstitutionProfileV3,
  type StayOptiDiagnosticEngineV3,
  type StayOptiDiagnosticJudgmentV3,
} from "../../src/engine-v3/evaluation/decisionConstitutionV3";

import {
  createBudgetUtilityV3,
} from "../../src/engine-v3/utility/personalUtilityV3";

import {
  STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3,
  admitLegacyDiagnosticFixtureV3,
} from "../../src/engine-v3/evaluation/legacyDiagnosticQuarantineV3";

interface DiagnosticFixtureCase {
  diagnosticId:
    string;

  sourceCaseFingerprint:
    string;

  sourceBatch:
    "v3-10c-pilot" |
    "v3-10f-batch";

  context: {
    profile:
      StayOptiConstitutionProfileV3;
  };

  comparedRole:
    "best-choice";

  selectionAgreement:
    boolean;

  outcome:
    "tie-identical-selection" |
    "human-preference";

  preferredEngine:
    StayOptiDiagnosticEngineV3 |
    null;

  secondaryRoleAnnotation?: {
    role:
      string;
  };

  diagnosticOnly:
    true;

  candidateGroundTruth:
    false;
}

interface DiagnosticFixture {
  schemaVersion:
    string;

  constitutionVersion:
    string;

  application:
    string;

  diagnosticOnly:
    boolean;

  candidateGroundTruth:
    boolean;

  thresholdTuningAllowed:
    boolean;

  publicPromotionAllowed:
    boolean;

  providerIdentityIncluded:
    boolean;

  propertyIdentityIncluded:
    boolean;

  piiAllowed:
    boolean;

  summary: {
    total:
      number;

    v2Wins:
      number;

    v3Wins:
      number;

    ties:
      number;

    divergentComfortFirstCases:
      number;

    v2WinsInDivergentComfortFirstCases:
      number;
  };

  cases:
    DiagnosticFixtureCase[];
}

function loadFixture() {
  const fixtureJsonText =
    readFileSync(
      resolve(
        process.cwd(),
        "tests/engine-v3/fixtures/v3-12a-diagnostic-judgments.json"
      ),
      "utf8"
    );
  const manifestJsonText =
    readFileSync(
      resolve(
        process.cwd(),
        "tests/engine-v3/fixtures/v3-12a-diagnostic-judgments.quarantine.json"
      ),
      "utf8"
    );
  const admitted =
    admitLegacyDiagnosticFixtureV3(
      fixtureJsonText,
      manifestJsonText,
      STAYOPTI_LEGACY_DIAGNOSTIC_ALLOWED_USE_V3
    );

  if (
    admitted.status !== "admitted"
  ) {
    assert.fail(
      `Legacy diagnostic fixture blocked: ${admitted.issueCode}`
    );
  }

  return admitted.fixture as unknown as DiagnosticFixture;
}

function collectObjectKeys(
  value:
    unknown,
  keys:
    string[] = []
) {
  if (
    Array.isArray(
      value
    )
  ) {
    for (
      const item
      of value
    ) {
      collectObjectKeys(
        item,
        keys
      );
    }

    return keys;
  }

  if (
    value !==
      null &&
    typeof value ===
      "object"
  ) {
    for (
      const [
        key,
        item,
      ]
      of Object.entries(
        value
      )
    ) {
      keys.push(
        key
      );
      collectObjectKeys(
        item,
        keys
      );
    }
  }

  return keys;
}

test(
  "V3-12A freezes the approved decision constitution without public promotion",
  () => {
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_VERSION_V3,
      "3.0.0-decision-constitution.1"
    );
    assert.equal(
      STAYOPTI_DIAGNOSTIC_JUDGMENT_SCHEMA_VERSION_V3,
      "3.0.0-diagnostic-judgment.1"
    );
    assert.equal(
      STAYOPTI_ROLE_AWARE_BLIND_PROTOCOL_VERSION_V3,
      "3.0.0-role-aware-blind-review.1"
    );
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_V3.publicRuntimeFreeze.authoritativeEngine,
      "v2"
    );
    assert.deepEqual(
      STAYOPTI_DECISION_CONSTITUTION_V3.publicRuntimeFreeze.v3AllowedModes,
      [
        "off",
        "shadow",
      ]
    );
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_V3.publicRuntimeFreeze.splitEnabled,
      false
    );
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_V3.publicRuntimeFreeze.automaticPromotionAllowed,
      false
    );
    assert.deepEqual(
      Object.keys(
        STAYOPTI_DECISION_CONSTITUTION_V3.profiles
      ),
      [
        "maximum-comfort",
        "comfort",
        "balanced",
        "savings",
        "maximum-savings",
      ]
    );
    assert.deepEqual(
      Object.keys(
        STAYOPTI_DECISION_CONSTITUTION_V3.roles
      ),
      [
        "best-choice",
        "best-sensible-saving",
        "worthwhile-comfort-upgrade",
        "split-saver",
        "abstention-near-tie",
      ]
    );
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_V3.profiles["maximum-comfort"].unspentBudgetIsIntrinsicBenefit,
      false
    );
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_V3.profiles.comfort.unspentBudgetIsIntrinsicBenefit,
      false
    );
    assert.equal(
      STAYOPTI_DECISION_CONSTITUTION_V3.profiles.savings.unspentBudgetIsIntrinsicBenefit,
      true
    );
  }
);

test(
  "the fifteen prior judgments are frozen as diagnostic evidence, not ground truth",
  () => {
    const fixture =
      loadFixture();

    assert.equal(
      fixture.schemaVersion,
      STAYOPTI_DIAGNOSTIC_JUDGMENT_SCHEMA_VERSION_V3
    );
    assert.equal(
      fixture.constitutionVersion,
      STAYOPTI_DECISION_CONSTITUTION_VERSION_V3
    );
    assert.equal(
      fixture.application,
      "offline-diagnostic-regression-only"
    );
    assert.equal(
      fixture.diagnosticOnly,
      true
    );
    assert.equal(
      fixture.candidateGroundTruth,
      false
    );
    assert.equal(
      fixture.thresholdTuningAllowed,
      false
    );
    assert.equal(
      fixture.publicPromotionAllowed,
      false
    );
    assert.equal(
      fixture.providerIdentityIncluded,
      false
    );
    assert.equal(
      fixture.propertyIdentityIncluded,
      false
    );
    assert.equal(
      fixture.piiAllowed,
      false
    );

    const diagnosticIds =
      fixture.cases.map(
        (candidate) =>
          candidate.diagnosticId
      );

    assert.equal(
      new Set(
        diagnosticIds
      ).size,
      15
    );

    const judgments:
      StayOptiDiagnosticJudgmentV3[] =
      fixture.cases.map(
        (candidate) => ({
          diagnosticId:
            candidate.diagnosticId,
          sourceCaseFingerprint:
            candidate.sourceCaseFingerprint,
          sourceBatch:
            candidate.sourceBatch,
          profile:
            candidate.context.profile,
          comparedRole:
            candidate.comparedRole,
          selectionAgreement:
            candidate.selectionAgreement,
          outcome:
            candidate.outcome,
          preferredEngine:
            candidate.preferredEngine,
          candidateGroundTruth:
            candidate.candidateGroundTruth,
          diagnosticOnly:
            candidate.diagnosticOnly,
        }));

    assert.deepEqual(
      summarizeDiagnosticJudgmentsV3(
        judgments
      ),
      fixture.summary
    );

    assert.deepEqual(
      fixture.summary,
      {
        total:
          15,
        v2Wins:
          6,
        v3Wins:
          1,
        ties:
          8,
        divergentComfortFirstCases:
          5,
        v2WinsInDivergentComfortFirstCases:
          5,
      }
    );

    assert.equal(
      fixture.cases.filter(
        (candidate) =>
          candidate.secondaryRoleAnnotation?.role ===
            "best-sensible-saving"
      ).length,
      1
    );

    const forbiddenIdentityKeys =
      new Set([
        "address",
        "city",
        "email",
        "hotel",
        "hotelId",
        "latitude",
        "longitude",
        "name",
        "phone",
        "property",
        "propertyId",
        "provider",
        "providerId",
      ]);

    const leakedKeys =
      collectObjectKeys(
        fixture
      ).filter(
        (key) =>
          forbiddenIdentityKeys.has(
            key
          )
      );

    assert.deepEqual(
      leakedKeys,
      []
    );
  }
);

test(
  "the current budget utility defect is reproducible without changing the policy",
  () => {
    const lowerSpendUtility =
      createBudgetUtilityV3(
        500,
        1000
      );
    const higherSpendUtility =
      createBudgetUtilityV3(
        900,
        1000
      );

    assert.ok(
      lowerSpendUtility >
        higherSpendUtility
    );
    assert.equal(
      lowerSpendUtility,
      86.269778
    );
    assert.equal(
      higherSpendUtility,
      69.640443
    );
  }
);

test(
  "budget expansion blocks a comfort-first quality regression caused only by cheaper spend",
  () => {
    assert.deepEqual(
      evaluateBudgetExpansionInvariantV3({
        profile:
          "maximum-comfort",
        previousBudget:
          1000,
        expandedBudget:
          1400,
        previousExperienceOrder:
          9,
        expandedExperienceOrder:
          7,
        expandedChoiceIsCheaper:
          true,
        materialNonPriceGain:
          false,
      }),
      {
        pass:
          false,
        violations: [
          "budget-expansion-quality-regression",
        ],
      }
    );

    assert.equal(
      evaluateBudgetExpansionInvariantV3({
        profile:
          "comfort",
        previousBudget:
          1000,
        expandedBudget:
          1400,
        previousExperienceOrder:
          7,
        expandedExperienceOrder:
          9,
        expandedChoiceIsCheaper:
          false,
        materialNonPriceGain:
          true,
      }).pass,
      true
    );

    assert.equal(
      evaluateBudgetExpansionInvariantV3({
        profile:
          "savings",
        previousBudget:
          1000,
        expandedBudget:
          1400,
        previousExperienceOrder:
          9,
        expandedExperienceOrder:
          7,
        expandedChoiceIsCheaper:
          true,
        materialNonPriceGain:
          false,
      }).pass,
      true
    );
  }
);

test(
  "blind evaluation compares like roles and keeps labels hidden",
  () => {
    assert.equal(
      evaluateRoleComparisonInvariantV3({
        evaluationQuestionRole:
          "best-choice",
        leftRole:
          "best-choice",
        rightRole:
          "best-choice",
        labelsHidden:
          true,
      }).pass,
      true
    );

    assert.deepEqual(
      evaluateRoleComparisonInvariantV3({
        evaluationQuestionRole:
          "best-choice",
        leftRole:
          "best-choice",
        rightRole:
          "best-sensible-saving",
        labelsHidden:
          true,
      }).violations,
      [
        "role-comparison-mismatch",
      ]
    );

    assert.deepEqual(
      evaluateRoleComparisonInvariantV3({
        evaluationQuestionRole:
          "best-sensible-saving",
        leftRole:
          "best-sensible-saving",
        rightRole:
          "best-sensible-saving",
        labelsHidden:
          false,
      }).violations,
      [
        "role-comparison-mismatch",
      ]
    );
  }
);

test(
  "profile coherence rejects unspent-budget bias and all frozen safety violations",
  () => {
    assert.deepEqual(
      evaluateProfileCoherenceInvariantV3({
        profile:
          "comfort",
        selectedExperienceOrder:
          6,
        alternativeExperienceOrder:
          9,
        selectedCost:
          500,
        alternativeCost:
          850,
        decisiveReasonCodes: [
          "utility:unspent-budget-reward",
        ],
        selectedIsDominated:
          true,
        missingEvidencePenalized:
          true,
        commercialSignalPresent:
          true,
      }),
      {
        pass:
          false,
        violations: [
          "commercial-signal-present",
          "dominated-best-choice",
          "missing-evidence-penalized",
          "profile-objective-incoherent",
        ],
      }
    );

    assert.equal(
      evaluateProfileCoherenceInvariantV3({
        profile:
          "balanced",
        selectedExperienceOrder:
          8,
        alternativeExperienceOrder:
          8,
        selectedCost:
          700,
        alternativeCost:
          760,
        decisiveReasonCodes: [
          "geometry:marginal-value",
        ],
        selectedIsDominated:
          false,
        missingEvidencePenalized:
          false,
        commercialSignalPresent:
          false,
      }).pass,
      true
    );
  }
);
