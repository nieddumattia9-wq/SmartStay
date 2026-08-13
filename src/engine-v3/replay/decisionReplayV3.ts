import type {
  StayOptiDecisionV3,
} from "../contract/stayOptiDecisionV3";

import {
  createStableHashV3,
} from "../contract/stableHashV3";

export interface StayOptiDecisionReplayVerificationV3 {
  matches:
    boolean;

  expectedFingerprint:
    string;

  actualFingerprint:
    string;

  configHashMatches:
    boolean;

  inputFingerprintMatches:
    boolean;
}

export function createDecisionFingerprintV3(
  decision:
    StayOptiDecisionV3
) {
  const {
    decisionFingerprint:
      ignoredDecisionFingerprint,
    ...replayWithoutDecisionFingerprint
  } = decision.replay;

  void ignoredDecisionFingerprint;

  return createStableHashV3(
    {
      ...decision,
      replay:
        replayWithoutDecisionFingerprint,
    },
    "stayopti-v3-decision"
  );
}

export function verifyDecisionReplayV3(
  expected:
    StayOptiDecisionV3,
  actual:
    StayOptiDecisionV3
): StayOptiDecisionReplayVerificationV3 {
  const expectedFingerprint =
    createDecisionFingerprintV3(
      expected
    );

  const actualFingerprint =
    createDecisionFingerprintV3(
      actual
    );

  const configHashMatches =
    expected.configHash ===
    actual.configHash;

  const inputFingerprintMatches =
    expected.replay
      .inputFingerprint ===
    actual.replay
      .inputFingerprint;

  return {
    matches:
      expectedFingerprint ===
        actualFingerprint &&
      configHashMatches &&
      inputFingerprintMatches,

    expectedFingerprint,
    actualFingerprint,
    configHashMatches,
    inputFingerprintMatches,
  };
}

export function runDeterministicDecisionReplayV3(
  createDecision:
    () => StayOptiDecisionV3
) {
  const first =
    createDecision();

  const second =
    createDecision();

  return {
    first,
    second,
    verification:
      verifyDecisionReplayV3(
        first,
        second
      ),
  };
}
