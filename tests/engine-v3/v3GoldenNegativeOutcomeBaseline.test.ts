import test from "node:test";
import assert from "node:assert/strict";

import {
  STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_AUDIT_V3,
  createGoldenNegativeOutcomeBaselineV3,
  validateGoldenNegativeOutcomeBaselineV3,
  verifyGoldenNegativeOutcomeBaselineReplayV3,
  type StayOptiGoldenNegativeOutcomeBaselineV3,
} from "../../src/engine-v3/evaluation/goldenNegativeOutcomeBaselineV3";

function cloneBaseline(): StayOptiGoldenNegativeOutcomeBaselineV3 {
  return structuredClone(createGoldenNegativeOutcomeBaselineV3());
}

test("five retained negative outcomes complete the 120-case real baseline without inventing receipts", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();

  assert.equal(baseline.counts.goldenReceipts, 115);
  assert.equal(baseline.counts.negativeOutcomeCases, 5);
  assert.equal(baseline.counts.baselineEvidenceCases, 120);
  assert.equal(baseline.counts.targetBaselineEvidenceCases, 120);
  assert.equal(baseline.baselineEvidenceCoverageComplete, true);
  assert.equal(baseline.ledger.goldenReceiptsCreated, 0);
  assert.equal(baseline.ledger.goldenReceiptCountAfter, 115);
  assert.equal(baseline.goldenDatasetComplete, false);
});

test("the baseline retains no-inventory, unavailable-offer and verified price-risk signals", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();

  assert.equal(baseline.ledger.counts.sourceNoUsableInventory, 1);
  assert.equal(baseline.ledger.counts.offerUnavailableAtRecheck, 1);
  assert.equal(baseline.ledger.counts.verifiedRecheckTotalIncrease, 3);
  assert.equal(baseline.ledger.counts.mappingContractFailure, 0);
  assert.equal(baseline.ledger.counts.decisionResearchUsable, 5);
  assert.equal(baseline.ledger.counts.technicalDiagnosticOnly, 0);
  assert.ok(
    baseline.ledger.records.every(
      ({ countedAsGoldenReceipt }) => countedAsGoldenReceipt === false
    )
  );
});

test("verified Prebook increases remain authoritative and require replay plus user confirmation", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();
  const priceRiskRecords = baseline.ledger.records.filter(
    ({ observation }) =>
      observation.classification === "verified-recheck-total-increase"
  );

  assert.equal(priceRiskRecords.length, 3);
  assert.deepEqual(
    priceRiskRecords.map(({ authoritativePrice }) => authoritativePrice?.amount),
    [3153.81, 1615.74, 3483.65]
  );
  assert.ok(
    priceRiskRecords.every(
      ({ authoritativePrice, requiresDecisionReplay, requiresUserConfirmation }) =>
        authoritativePrice?.postGetParityVerified === true &&
        requiresDecisionReplay === true &&
        requiresUserConfirmation === true
    )
  );
});

test("every negative outcome is bound to a privacy-safe traveler decision context", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();
  const contextByEvidenceId = new Map(
    baseline.contexts.map((context) => [context.evidenceId, context])
  );

  assert.equal(baseline.contexts.length, 5);
  assert.ok(
    baseline.ledger.records.every(({ observation }) =>
      contextByEvidenceId.has(observation.evidenceId)
    )
  );
  assert.deepEqual(
    [...new Set(baseline.contexts.map(({ profile }) => profile))].sort(),
    ["balanced", "comfort", "maximum-comfort", "savings"]
  );
  assert.ok(
    baseline.contexts.every(
      ({ sourceEvidenceSha256, rooms, nights, leadTimeDays }) =>
        /^[a-f0-9]{64}$/.test(sourceEvidenceSha256) &&
        rooms === 2 &&
        nights > 0 &&
        leadTimeDays > 0
    )
  );
});

test("baseline replay is deterministic and validates exactly", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();

  assert.deepEqual(validateGoldenNegativeOutcomeBaselineV3(baseline), {
    valid: true,
    violations: [],
  });
  assert.equal(verifyGoldenNegativeOutcomeBaselineReplayV3(baseline), true);
  assert.equal(
    createGoldenNegativeOutcomeBaselineV3().fingerprint,
    baseline.fingerprint
  );
});

test("context, price and count tampering fail closed", () => {
  const contextTampered = cloneBaseline();
  contextTampered.contexts[0].profile = "comfort";
  assert.equal(validateGoldenNegativeOutcomeBaselineV3(contextTampered).valid, false);

  const priceTampered = cloneBaseline();
  const priceRecord = priceTampered.ledger.records.find(
    ({ authoritativePrice }) => authoritativePrice !== null
  );
  assert.ok(priceRecord?.authoritativePrice);
  priceRecord.authoritativePrice.amount += 1;
  assert.equal(validateGoldenNegativeOutcomeBaselineV3(priceTampered).valid, false);

  const countTampered = cloneBaseline();
  countTampered.counts.baselineEvidenceCases = 119 as 120;
  assert.equal(validateGoldenNegativeOutcomeBaselineV3(countTampered).valid, false);
});

test("the baseline cannot be used as a statistical or public promotion claim", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();

  assert.equal(baseline.statisticalClaimAllowed, false);
  assert.equal(baseline.publicV3PromotionAllowed, false);
  assert.equal(baseline.automaticPolicyMutationAllowed, false);
  assert.equal(baseline.publicV2Changed, false);
  assert.equal(baseline.publicV3Enabled, false);
  assert.equal(baseline.splitEnabled, false);
  assert.equal(baseline.counts.adversarialCasesRequiredNext, 40);
  assert.equal(baseline.counts.counterfactualCasesRequiredNext, 40);
  assert.equal(baseline.blindHumanJudgmentsStillRequired, 300);
  assert.equal(baseline.blindExpertJudgmentsStillRequired, 100);
});

test("the binding module performs no provider, booking, payment or commercial operation", () => {
  const baseline = createGoldenNegativeOutcomeBaselineV3();
  const serialized = JSON.stringify(baseline);

  assert.equal(baseline.providerCallsPerformedByModule, 0);
  assert.equal(baseline.bookingCallsPerformedByModule, 0);
  assert.equal(baseline.paymentCallsPerformedByModule, 0);
  assert.equal(STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_AUDIT_V3.providerCallsAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_AUDIT_V3.bookingCallsAllowed, false);
  assert.equal(STAYOPTI_GOLDEN_NEGATIVE_OUTCOME_BASELINE_AUDIT_V3.paymentCallsAllowed, false);
  assert.doesNotMatch(
    serialized,
    /"(providerId|propertyId|hotelId|offerId|prebookId|commission|markup|affiliateRevenue)"\s*:/i
  );
});
