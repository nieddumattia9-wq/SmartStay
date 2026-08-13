export const SMARTSTAY_REASON_CODES_V3 = [
  "adapter:from-v2",
  "adapter:v2-evidence-bridged",
  "counterfactual:exact-thresholds-unavailable",
  "decision:abstained",
  "decision:no-feasible-solution",
  "decision:recommended",
  "firewall:commercial-fields-absent",
  "integrity:availability-recheck-required",
  "integrity:compatible-temporal-pair-unavailable",
  "integrity:cost-incomplete",
  "integrity:coverage-computed",
  "integrity:nightly-prices-invalid",
  "integrity:nightly-prices-not-provided",
  "integrity:offer-canonicalized",
  "integrity:public-rates-failed",
  "integrity:public-rates-unverified",
  "integrity:public-split-promotion-blocked",
  "integrity:public-v3-promotion-blocked",
  "integrity:recheck-decision-replay-required",
  "integrity:scope-incomplete",
  "integrity:temporal-evidence-complete",
  "outcome:not-instrumented",
  "peer:compatible-context",
  "peer:declared-fallback",
  "peer:direct-comparison-allowed",
  "peer:direct-comparison-blocked",
  "peer:exact-context",
  "peer:fallback-explicit",
  "peer:unavailable",
  "preference:declared",
  "preference:inferred",
  "preference:neutral-default",
  "robustness:not-evaluated",
  "role:best-choice",
  "role:best-sensible-saving",
  "role:split-saver",
  "role:worthwhile-comfort-upgrade",
  "solution:single",
  "solution:split",
  "temporal:not-evaluated",
  "utility:budget-no-spend-bias",
  "utility:evaluated",
  "utility:non-linear",
  "utility:shadow-only",
  "utility:unavailable",
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
