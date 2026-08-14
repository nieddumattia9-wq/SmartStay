import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfflineOutcomeDatasetV3,
  createOutcomeConsentStateV3,
  createOutcomeDataLoopPlanV3,
  createOutcomeEventV3,
  createStableHashV3,
  deleteOutcomeSubjectDataV3,
  findOutcomePiiViolationsV3,
  validateOfflineOutcomeDatasetV3,
  validateOutcomeConsentStateV3,
  validateOutcomeDataLoopPlanV3,
  validateOutcomeEventV3,
  type StayOptiOutcomeConsentStateV3,
  type StayOptiOutcomeEventV3,
} from "../../src/engine-v3";

const SUBJECT_TOKEN = "subject-token-00000001";
const CONSENT_TOKEN = "consent-token-00000001";
const DECISION_TOKEN = "decision-link-00000001";
const RECOMMENDED_TOKEN = "option-token-recommended-0001";
const ALTERNATIVE_TOKEN = "option-token-alternative-0001";

function consent(
  input: Partial<{
    status: "granted" | "denied" | "withdrawn";
    doNotTrack: boolean;
    globalPrivacyControl: boolean;
  }> = {}
) {
  return createOutcomeConsentStateV3({
    consentId: CONSENT_TOKEN,
    subjectToken: SUBJECT_TOKEN,
    status: input.status ?? "granted",
    recordedAt: "2026-08-14T10:00:00.000Z",
    expiresAt: "2027-08-14T10:00:00.000Z",
    doNotTrack: input.doNotTrack ?? false,
    globalPrivacyControl: input.globalPrivacyControl ?? false,
  });
}

function eventBase(index: number, occurredAt: string) {
  return {
    eventId: `outcome-event-${String(index).padStart(8, "0")}`,
    occurredAt,
    subjectToken: SUBJECT_TOKEN,
    decisionLinkToken: DECISION_TOKEN,
    consentId: CONSENT_TOKEN,
  };
}

function createDecisionShownEvent() {
  return createOutcomeEventV3({
    ...eventBase(1, "2026-08-14T10:01:00.000Z"),
    eventName: "decision-shown",
    payload: {
      decisionFingerprint: createStableHashV3({ decision: 1 }),
      engineVersion: "3.0.0-alpha.9",
      policyVersion: "3.0.0-policy.9",
      decisionSchemaVersion: "3.0.0-decision.9",
      evidenceSchemaVersion: "3.0.0-evidence.9",
      decisionStatus: "recommended",
      recommendedOptionToken: RECOMMENDED_TOKEN,
      alternativeOptionTokens: [ALTERNATIVE_TOKEN],
      recommendationKind: "single",
      confidenceBand: "high",
      coverageState: "current-analyzed-set",
    },
  });
}

function createFullSequence(
  options: {
    choice?: "accepted-recommendation" | "different-option" | "abandoned";
    solutionKind?: "single" | "split";
    regret?: "none" | "low" | "medium" | "high";
    wouldChooseSameAgain?: boolean;
    splitFalsePositive?: boolean | null;
  } = {}
): StayOptiOutcomeEventV3[] {
  const choice = options.choice ?? "accepted-recommendation";
  const solutionKind = options.solutionKind ?? "single";
  const regret = options.regret ?? "none";
  const selectedOptionToken =
    choice === "abandoned"
      ? null
      : choice === "different-option"
        ? ALTERNATIVE_TOKEN
        : RECOMMENDED_TOKEN;

  return [
    createDecisionShownEvent(),
    createOutcomeEventV3({
      ...eventBase(2, "2026-08-14T10:02:00.000Z"),
      eventName: "choice-recorded",
      payload: {
        choiceOutcome: choice,
        selectedOptionToken,
        differentChoiceReason: choice === "different-option" ? "price" : "not-applicable",
        timeToDecisionBucket: "15-60s",
      },
    }),
    ...(choice === "abandoned"
      ? []
      : [
          createOutcomeEventV3({
            ...eventBase(3, "2026-08-14T10:03:00.000Z"),
            eventName: "recheck-recorded",
            payload: {
              optionToken: selectedOptionToken,
              recheckState: "confirmed",
              handoffState: "opened",
            },
          }),
          createOutcomeEventV3({
            ...eventBase(4, "2026-08-14T10:04:00.000Z"),
            eventName: "booking-attributed",
            payload: {
              attributionStatus: "attributed",
              optionToken: selectedOptionToken,
              attributionConfidence: "deterministic",
              recheckVerified: true,
            },
          }),
          createOutcomeEventV3({
            ...eventBase(5, "2026-08-20T10:00:00.000Z"),
            eventName: "post-stay-feedback",
            payload: {
              satisfaction: regret === "none" ? 5 : 2,
              wouldChooseSameAgain: options.wouldChooseSameAgain ?? regret === "none",
              declaredRegret: regret,
              regretCause: regret === "none" ? "none" : "price",
              mainIssue: regret === "none" ? "none" : "price",
              savingOutcome:
                regret === "none" ? "saved-without-quality-loss" : "saved-with-quality-loss",
              qualityPerEuroOutcome: regret === "none" ? "positive" : "negative",
              chosenSolutionKind: solutionKind,
              splitFalsePositive:
                solutionKind === "split" ? options.splitFalsePositive ?? false : null,
              regretComparedToBestSingle:
                solutionKind === "split" ? (regret === "none" ? "lower" : "higher") : null,
            },
          }),
        ]),
  ];
}

test("V3-09 plan is deterministic, disabled by default and cannot self-modify production", () => {
  const inputFingerprint = createStableHashV3({ input: "decision" });
  const first = createOutcomeDataLoopPlanV3({
    sourceDecisionInputFingerprint: inputFingerprint,
  });
  const second = createOutcomeDataLoopPlanV3({
    sourceDecisionInputFingerprint: inputFingerprint,
  });

  assert.deepEqual(first, second);
  assert.equal(first.collectionApplication, "disabled-by-default");
  assert.equal(first.runtimeApplication, "contract-only");
  assert.equal(first.publicPresentation, "disabled");
  assert.equal(first.learningPolicy.productionSelfModificationAllowed, false);
  assert.deepEqual(first.learningPolicy.promotionPath, [
    "offline-evaluation",
    "shadow",
    "controlled-promotion",
  ]);
  assert.equal(validateOutcomeDataLoopPlanV3(first).valid, true);
});

test("explicit consent enables collection while DNT, GPC, denial and withdrawal block it", () => {
  const granted = consent();
  const denied = consent({ status: "denied" });
  const withdrawn = consent({ status: "withdrawn" });
  const dnt = consent({ doNotTrack: true });
  const gpc = consent({ globalPrivacyControl: true });

  assert.equal(granted.collectionAllowed, true);
  assert.equal(denied.collectionAllowed, false);
  assert.equal(withdrawn.collectionAllowed, false);
  assert.equal(dnt.collectionAllowed, false);
  assert.equal(gpc.collectionAllowed, false);
  assert.equal(validateOutcomeConsentStateV3(granted).valid, true);
  assert.ok(dnt.reasonCodes.includes("outcome:privacy-signal-blocked"));
});

test("versioned events accept only pseudonymous consent-linked identifiers", () => {
  const state = consent();
  const event = createDecisionShownEvent();
  const validation = validateOutcomeEventV3(event, state);

  assert.equal(event.schemaVersion, "3.0.0-outcome-event.1");
  assert.equal(event.dataClassification, "pseudonymous");
  assert.equal(validation.valid, true);
  assert.equal(findOutcomePiiViolationsV3(event).length, 0);
});

test("PII and free-form personal fields are rejected instead of entering the outcome schema", () => {
  assert.deepEqual(
    findOutcomePiiViolationsV3({
      profile: { email: "guest@example.com" },
    }),
    ["profile.email"]
  );

  assert.throws(
    () => createOutcomeEventV3({
      ...eventBase(9, "2026-08-14T10:02:00.000Z"),
      eventName: "choice-recorded",
      payload: {
        choiceOutcome: "different-option",
        selectedOptionToken: ALTERNATIVE_TOKEN,
        differentChoiceReason: "price",
        timeToDecisionBucket: "15-60s",
        email: "guest@example.com",
      },
    } as never),
    /Invalid choice-recorded|PII/
  );
});

test("a complete consented sequence measures choice, recheck, attribution and post-stay outcome", () => {
  const dataset = buildOfflineOutcomeDatasetV3({
    events: createFullSequence(),
    consents: [consent()],
  });

  assert.equal(dataset.status, "ready");
  assert.equal(dataset.metrics.decisionCount, 1);
  assert.equal(dataset.metrics.recommendationAcceptedCount, 1);
  assert.equal(dataset.metrics.attributedBookingCount, 1);
  assert.equal(dataset.metrics.postStayFeedbackCount, 1);
  assert.equal(dataset.metrics.wouldChooseSameAgainCount, 1);
  assert.equal(dataset.metrics.savedWithoutQualityLossCount, 1);
  assert.equal(dataset.records[0].outcomeComplete, true);
  assert.equal(validateOfflineOutcomeDatasetV3(dataset).valid, true);
});

test("a different choice preserves a closed reason code and declared regret", () => {
  const dataset = buildOfflineOutcomeDatasetV3({
    events: createFullSequence({
      choice: "different-option",
      regret: "high",
      wouldChooseSameAgain: false,
    }),
    consents: [consent()],
  });

  assert.equal(dataset.metrics.differentChoiceCount, 1);
  assert.equal(dataset.metrics.declaredRegretCount, 1);
  assert.equal(dataset.records[0].differentChoiceReason, "price");
  assert.equal(dataset.records[0].regretCause, "price");
  assert.equal(dataset.records[0].wouldChooseSameAgain, false);
});

test("an abandonment is measurable without fabricating booking or post-stay data", () => {
  const dataset = buildOfflineOutcomeDatasetV3({
    events: createFullSequence({ choice: "abandoned" }),
    consents: [consent()],
  });

  assert.equal(dataset.metrics.abandonmentCount, 1);
  assert.equal(dataset.metrics.attributedBookingCount, 0);
  assert.equal(dataset.records[0].bookingAttribution, "not-observed");
  assert.equal(dataset.records[0].satisfaction, null);
  assert.equal(dataset.records[0].outcomeComplete, false);
});

test("split outcomes expose false-positive and regret-versus-best-single metrics offline only", () => {
  const dataset = buildOfflineOutcomeDatasetV3({
    events: createFullSequence({
      solutionKind: "split",
      regret: "medium",
      splitFalsePositive: true,
    }),
    consents: [consent()],
  });

  assert.equal(dataset.metrics.splitOutcomeCount, 1);
  assert.equal(dataset.metrics.splitFalsePositiveCount, 1);
  assert.equal(dataset.records[0].regretComparedToBestSingle, "higher");
  assert.equal(dataset.learningSafety.candidateDestination, "offline-evaluation-only");
});

test("event permutation cannot change the pseudonymized offline dataset", () => {
  const events = createFullSequence();
  const first = buildOfflineOutcomeDatasetV3({ events, consents: [consent()] });
  const second = buildOfflineOutcomeDatasetV3({
    events: [...events].reverse(),
    consents: [consent()],
  });

  assert.deepEqual(first, second);
});

test("denied consent and active privacy signals prevent dataset construction", () => {
  const events = createFullSequence();
  for (const blocked of [
    consent({ status: "denied" }),
    consent({ doNotTrack: true }),
    consent({ globalPrivacyControl: true }),
  ]) {
    assert.throws(
      () => buildOfflineOutcomeDatasetV3({ events, consents: [blocked] }),
      /invalid or unconsented event/
    );
  }
});

test("out-of-order and duplicate lifecycle events are rejected", () => {
  const events = createFullSequence();
  const earlyChoice = structuredClone(events[1]);
  earlyChoice.occurredAt = "2026-08-14T10:00:30.000Z";
  earlyChoice.fingerprint = createStableHashV3(
    {
      schemaVersion: earlyChoice.schemaVersion,
      dataClassification: earlyChoice.dataClassification,
      eventId: earlyChoice.eventId,
      occurredAt: earlyChoice.occurredAt,
      subjectToken: earlyChoice.subjectToken,
      decisionLinkToken: earlyChoice.decisionLinkToken,
      consentId: earlyChoice.consentId,
      eventName: earlyChoice.eventName,
      payload: earlyChoice.payload,
    },
    "stayopti-v3-outcome-event"
  );

  assert.throws(
    () => buildOfflineOutcomeDatasetV3({
      events: [events[0], events[1], { ...events[1], eventId: "outcome-event-duplicate-0001" }],
      consents: [consent()],
    }),
    /invalid or unconsented|duplicate choice-recorded/
  );
  assert.throws(
    () => buildOfflineOutcomeDatasetV3({
      events: [events[0], earlyChoice],
      consents: [consent()],
    }),
    /ordering must start/
  );
});

test("raw booking and provider references cannot be smuggled into attribution events", () => {
  assert.throws(
    () => createOutcomeEventV3({
      ...eventBase(12, "2026-08-14T10:03:00.000Z"),
      eventName: "booking-attributed",
      payload: {
        attributionStatus: "attributed",
        optionToken: RECOMMENDED_TOKEN,
        attributionConfidence: "deterministic",
        recheckVerified: true,
        bookingId: "booking-raw-123",
        providerId: "provider-raw-123",
      },
    } as never),
    /Invalid booking-attributed/
  );
});

test("subject deletion removes every linked event and returns a pseudonymous receipt", () => {
  const events = createFullSequence();
  const deletion = deleteOutcomeSubjectDataV3({
    events,
    subjectToken: SUBJECT_TOKEN,
    requestedAt: "2026-08-21T10:00:00.000Z",
  });

  assert.equal(deletion.retainedEvents.length, 0);
  assert.equal(deletion.receipt.status, "deleted");
  assert.equal(deletion.receipt.deletedEventCount, events.length);
  assert.equal(deletion.receipt.deletedDecisionCount, 1);
  assert.equal(deletion.receipt.subjectTokenHash.includes(SUBJECT_TOKEN), false);
  assert.equal(findOutcomePiiViolationsV3(deletion.receipt).length, 0);
});

test("dataset fingerprints expose mutation of an outcome or learning safety gate", () => {
  const dataset = buildOfflineOutcomeDatasetV3({
    events: createFullSequence(),
    consents: [consent()],
  });
  const mutated = structuredClone(dataset);
  mutated.records[0].wouldChooseSameAgain = false;

  assert.equal(validateOfflineOutcomeDatasetV3(mutated).valid, false);
  assert.ok(validateOfflineOutcomeDatasetV3(mutated).issues.includes("fingerprint-mismatch"));

  const unsafe = structuredClone(dataset);
  (unsafe.learningSafety as unknown as {
    productionPolicyMutationAllowed: boolean;
  }).productionPolicyMutationAllowed = true;
  assert.ok(validateOfflineOutcomeDatasetV3(unsafe).issues.includes("unsafe-learning-policy"));
});

test("mutated consent and event fingerprints are rejected before offline learning", () => {
  const state = consent();
  const invalidState = structuredClone(state) as StayOptiOutcomeConsentStateV3;
  invalidState.collectionAllowed = false;
  assert.equal(validateOutcomeConsentStateV3(invalidState).valid, false);

  const event = createDecisionShownEvent();
  const invalidEvent = structuredClone(event);
  invalidEvent.fingerprint = "fnv1a32-00000000";
  assert.ok(validateOutcomeEventV3(invalidEvent, state).issues.includes("fingerprint-mismatch"));
});
