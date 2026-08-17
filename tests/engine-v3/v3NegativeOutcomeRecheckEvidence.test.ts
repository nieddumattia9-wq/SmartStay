import assert from "node:assert/strict";
import test from "node:test";

import {
  STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_AUDIT_V3,
  createNegativeOutcomeRecheckEvidenceLedgerV3,
  createStableHashV3,
  validateNegativeOutcomeRecheckEvidenceLedgerV3,
  verifyNegativeOutcomeRecheckEvidenceReplayV3,
  type StayOptiMappingContractFailureObservationV3,
  type StayOptiNegativeOutcomeEvidenceCommonV3,
  type StayOptiNegativeOutcomeEvidenceLedgerInputV3,
  type StayOptiNegativeOutcomeObservationV3,
  type StayOptiOfferUnavailableAtRecheckObservationV3,
  type StayOptiSourceNoUsableInventoryObservationV3,
  type StayOptiVerifiedRecheckTotalIncreaseObservationV3,
} from "../../src/engine-v3";

function fingerprint(value: unknown, purpose: string): string {
  return createStableHashV3(value, `stayopti-v3-17be-test-${purpose}`);
}

function common(
  sequence: number,
  suffix: string
): StayOptiNegativeOutcomeEvidenceCommonV3 {
  const padded = String(sequence).padStart(3, "0");
  return {
    evidenceId: `negative-outcome-recheck-evidence-${padded}-${suffix}`,
    caseSlotId: `golden-collection-case-slot-${padded}`,
    scenarioId: `golden-controlled-live-scenario-${padded}`,
    searchRequestFingerprint: fingerprint({ sequence }, "search-request"),
    observationFingerprint: fingerprint({ sequence, suffix }, "observation"),
    sourceKind: "controlled-live-search",
    boundAttemptCount: 1,
    successOnlyRetryUsed: false,
    realSourceAttested: true,
    semanticSummaryRetainedForAudit: true,
    directIdentifiersRemoved: true,
    propertyIdentityRemoved: true,
    providerIdentityRemoved: true,
    commercialSignalsRemoved: true,
    teacherOutputUsedAsGroundTruth: false,
    measurementState: "unmeasured",
  };
}

function noInventory(): StayOptiSourceNoUsableInventoryObservationV3 {
  return {
    ...common(80, "no-inventory"),
    classification: "source-no-usable-inventory",
    ratesHttpStatus: 200,
    mappedHotelCount: 0,
    mappedOfferCount: 0,
  };
}

function recheckIncrease(): StayOptiVerifiedRecheckTotalIncreaseObservationV3 {
  return {
    ...common(85, "recheck-increase"),
    classification: "verified-recheck-total-increase",
    originalOfferSnapshotFingerprint: fingerprint("slot-085-offer", "offer"),
    recheckExecutionFingerprint: fingerprint("slot-085-recheck", "recheck"),
    prebookCreateHttpStatus: 200,
    prebookRetrieveHttpStatus: 200,
    retrievedPrebookBinding: "verified",
    currency: "EUR",
    searchTotal: 1602.69,
    verifiedPrebookTotal: 1615.74,
    retrievedPrebookTotal: 1615.74,
    roomTermsChanged: false,
    mealPlanChanged: false,
    cancellationTermsChanged: false,
  };
}

function unavailable(): StayOptiOfferUnavailableAtRecheckObservationV3 {
  return {
    ...common(97, "unavailable"),
    classification: "offer-unavailable-at-recheck",
    originalOfferSnapshotFingerprint: fingerprint("slot-097-offer", "offer"),
    recheckExecutionFingerprint: fingerprint("slot-097-recheck", "recheck"),
    recheckHttpStatus: 200,
    availabilityStatus: "unavailable",
  };
}

function technicalFailure(): StayOptiMappingContractFailureObservationV3 {
  return {
    ...common(105, "mapping-failure"),
    classification: "mapping-contract-failure",
    technicalBoundary: "prebook-mapping",
    failureCode: "PREBOOK_TOTAL_CONTRACT_INVALID",
    failureFingerprint: fingerprint("slot-105-failure", "failure"),
  };
}

function inputFor(
  observations: StayOptiNegativeOutcomeObservationV3[] = [
    noInventory(),
    recheckIncrease(),
  ]
): StayOptiNegativeOutcomeEvidenceLedgerInputV3 {
  return {
    ledgerId: "negative-outcome-recheck-ledger-v3-17be-test",
    campaignFingerprint: fingerprint("golden-campaign", "campaign"),
    goldenReceiptCountBefore: 115,
    observations,
  };
}

test("no inventory is retained as useful abstention or recovery evidence", () => {
  const ledger = createNegativeOutcomeRecheckEvidenceLedgerV3(
    inputFor([noInventory()])
  );
  const record = ledger.records[0];

  assert.equal(validateNegativeOutcomeRecheckEvidenceLedgerV3(ledger).valid, true);
  assert.equal(record?.decisionUse, "availability-signal");
  assert.equal(record?.evidenceUsableForDecisionResearch, true);
  assert.equal(record?.technicalFailure, false);
  assert.equal(record?.requiresDecisionReplay, true);
  assert.equal(record?.requiresUserConfirmation, false);
  assert.equal(
    record?.recommendedAction,
    "abstain-or-run-deterministic-recovery"
  );
  assert.equal(ledger.goldenReceiptCountBefore, 115);
  assert.equal(ledger.goldenReceiptCountAfter, 115);
  assert.equal(ledger.goldenReceiptsCreated, 0);
});

test("verified Prebook total becomes authoritative after a material increase", () => {
  const ledger = createNegativeOutcomeRecheckEvidenceLedgerV3(
    inputFor([recheckIncrease()])
  );
  const record = ledger.records[0];

  assert.equal(record?.decisionUse, "price-risk-signal");
  assert.deepEqual(record?.authoritativePrice, {
    source: "verified-prebook",
    currency: "EUR",
    previousSearchTotal: 1602.69,
    amount: 1615.74,
    delta: 13.05,
    direction: "increase",
    postGetParityVerified: true,
  });
  assert.equal(record?.requiresDecisionReplay, true);
  assert.equal(record?.requiresUserConfirmation, true);
  assert.equal(
    record?.recommendedAction,
    "show-verified-total-and-request-confirmation"
  );
  assert.deepEqual(record?.changedCommercialTerms, []);
});

test("unavailable offers remain volatility evidence and require a new decision", () => {
  const ledger = createNegativeOutcomeRecheckEvidenceLedgerV3(
    inputFor([unavailable()])
  );
  const record = ledger.records[0];

  assert.equal(record?.decisionUse, "offer-volatility-signal");
  assert.equal(record?.evidenceUsableForDecisionResearch, true);
  assert.equal(record?.requiresDecisionReplay, true);
  assert.equal(
    record?.recommendedAction,
    "reselect-offer-and-replay-decision"
  );
});

test("mapping failures are retained but never counted as decision success", () => {
  const ledger = createNegativeOutcomeRecheckEvidenceLedgerV3(
    inputFor([technicalFailure()])
  );
  const record = ledger.records[0];

  assert.equal(record?.decisionUse, "technical-diagnostic-only");
  assert.equal(record?.evidenceUsableForDecisionResearch, false);
  assert.equal(record?.technicalFailure, true);
  assert.equal(ledger.counts.technicalDiagnosticOnly, 1);
  assert.equal(ledger.counts.decisionResearchUsable, 0);
  assert.equal(ledger.policy.technicalFailuresCountAsDecisionSuccess, false);
});

test("unverified or non-increasing totals cannot enter the price-risk ledger", () => {
  const parityMismatch = recheckIncrease();
  parityMismatch.retrievedPrebookTotal = 1614.5;
  assert.throws(
    () => createNegativeOutcomeRecheckEvidenceLedgerV3(inputFor([parityMismatch])),
    /verified-recheck-total-increase-contract-invalid/
  );

  const notAnIncrease = recheckIncrease();
  notAnIncrease.verifiedPrebookTotal = notAnIncrease.searchTotal;
  notAnIncrease.retrievedPrebookTotal = notAnIncrease.searchTotal;
  assert.throws(
    () => createNegativeOutcomeRecheckEvidenceLedgerV3(inputFor([notAnIncrease])),
    /verified-recheck-total-increase-contract-invalid/
  );
});

test("record order is canonical and replay is deterministic", () => {
  const forwardInput = inputFor([noInventory(), recheckIncrease()]);
  const reverseInput = inputFor([recheckIncrease(), noInventory()]);
  const forward = createNegativeOutcomeRecheckEvidenceLedgerV3(forwardInput);
  const reverse = createNegativeOutcomeRecheckEvidenceLedgerV3(reverseInput);

  assert.equal(forward.inputFingerprint, reverse.inputFingerprint);
  assert.equal(forward.fingerprint, reverse.fingerprint);
  assert.deepEqual(
    forward.records.map(({ observation }) => observation.caseSlotId),
    ["golden-collection-case-slot-080", "golden-collection-case-slot-085"]
  );
  assert.equal(
    verifyNegativeOutcomeRecheckEvidenceReplayV3(forwardInput, forward),
    true
  );
});

test("tampering, success-only retries and private identifiers fail closed", () => {
  const ledger = createNegativeOutcomeRecheckEvidenceLedgerV3(inputFor());
  const tampered = structuredClone(ledger);
  const price = tampered.records[1]?.authoritativePrice;
  assert.ok(price !== null && price !== undefined);
  price.amount = 1602.69;
  assert.equal(validateNegativeOutcomeRecheckEvidenceLedgerV3(tampered).valid, false);

  const retried = noInventory();
  (retried as unknown as { successOnlyRetryUsed: boolean }).successOnlyRetryUsed = true;
  assert.throws(
    () => createNegativeOutcomeRecheckEvidenceLedgerV3(inputFor([retried])),
    /negative-outcome-common-contract-invalid/
  );

  const identified = Object.assign(noInventory(), { propertyId: "forbidden" });
  assert.throws(
    () =>
      createNegativeOutcomeRecheckEvidenceLedgerV3(
        inputFor([identified as StayOptiSourceNoUsableInventoryObservationV3])
      ),
    /negative-outcome-forbidden-field/
  );
});

test("V3-17BE freezes the non-promotional decision-evidence boundary", () => {
  assert.deepEqual(STAYOPTI_NEGATIVE_OUTCOME_RECHECK_EVIDENCE_AUDIT_V3, {
    application: "offline-negative-outcome-decision-evidence-only",
    failedOutcomesRetained: true,
    successOnlyRetryAllowed: false,
    deterministicReplacementQueueRequired: true,
    replacementMustNotEraseOriginal: true,
    verifiedPrebookTotalAuthoritative: true,
    postGetParityRequired: true,
    materialIncreaseRequiresUserConfirmation: true,
    technicalFailuresCountAsDecisionSuccess: false,
    automaticGoldenMutationAllowed: false,
    automaticPromotionAllowed: false,
    providerCallsAllowed: false,
    bookingCallsAllowed: false,
    paymentCallsAllowed: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    piiAllowed: false,
    providerIdentityAllowed: false,
    propertyIdentityAllowed: false,
    commercialSignalsAllowed: false,
  });
});
