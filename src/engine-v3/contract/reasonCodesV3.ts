export const SMARTSTAY_REASON_CODES_V3 = [
  "adapter:from-v2",
  "adapter:v2-evidence-bridged",
  "counterfactual:exact-thresholds-unavailable",
  "decision:abstained",
  "decision:no-feasible-solution",
  "decision:recommended",
  "firewall:commercial-fields-absent",
  "outcome:not-instrumented",
  "robustness:not-evaluated",
  "role:best-choice",
  "role:best-sensible-saving",
  "role:split-saver",
  "role:worthwhile-comfort-upgrade",
  "solution:single",
  "solution:split",
  "temporal:not-evaluated",
] as const;

export type SmartStayReasonCodeV3 =
  typeof SMARTSTAY_REASON_CODES_V3[
    number
  ];

const REASON_CODE_SET_V3:
  ReadonlySet<string> =
    new Set<string>(
      SMARTSTAY_REASON_CODES_V3
    );

export function isSmartStayReasonCodeV3(
  value:
    unknown
): value is SmartStayReasonCodeV3 {
  return typeof value ===
      "string" &&
    REASON_CODE_SET_V3.has(
      value
    );
}

export function uniqueReasonCodesV3(
  values:
    readonly SmartStayReasonCodeV3[]
) {
  return [
    ...new Set(
      values
    ),
  ].sort() as SmartStayReasonCodeV3[];
}
