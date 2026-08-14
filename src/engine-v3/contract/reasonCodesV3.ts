export const SMARTSTAY_REASON_CODES_V3 = [
  "adapter:from-v2",
  "adapter:v2-evidence-bridged",
  "counterfactual:exact-thresholds-unavailable",
  "counterfactual:exact-thresholds-available",
  "context:evaluated",
  "context:golden-gate-pending",
  "context:partial",
  "context:shadow-only",
  "context:unavailable",
  "context:unknown-not-penalty",
  "convenience:evaluated",
  "convenience:insufficient-coverage",
  "decision:abstained",
  "decision:no-feasible-solution",
  "decision:recommended",
  "firewall:commercial-fields-absent",
  "flexibility:cancellation-protection-evaluated",
  "flexibility:context-unavailable",
  "flexibility:monetary-value-available",
  "flexibility:monetary-value-unavailable",
  "flexibility:pay-later-value-available",
  "flexibility:payment-timing-unknown",
  "friction:evaluated",
  "geometry:commercially-neutral",
  "geometry:comparison-incomparable",
  "geometry:decision-map-internal",
  "geometry:diminishing-returns",
  "geometry:evaluated",
  "geometry:marginal-value-evaluated",
  "geometry:missing-data-not-disadvantage",
  "geometry:pairwise-equivalent",
  "geometry:pairwise-preferred",
  "geometry:partial",
  "geometry:shadow-only",
  "geometry:strong-pareto-dominated",
  "geometry:strong-pareto-frontier",
  "geometry:threshold-available",
  "geometry:threshold-unavailable",
  "geometry:unavailable",
  "geometry:weak-pareto-dominated",
  "geometry:weak-pareto-frontier",
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
  "interaction:context-unavailable",
  "interaction:destination-aware",
  "interaction:group",
  "interaction:long-stay",
  "location:destination-aware",
  "location:straight-line-fallback-only",
  "location:travel-time-evaluated",
  "location:travel-time-unavailable",
  "location:trip-specific",
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
  "risk:canonical-floor-applied",
  "risk:evaluated",
  "risk:insufficient-evidence",
  "risk:shadow-only",
  "risk:source-score-used",
  "risk:uncertainty-separate",
  "robustness:evaluated",
  "robustness:near-tie",
  "robustness:no-good-option",
  "robustness:scenario-evaluated",
  "robustness:scenario-not-applicable",
  "robustness:scenario-stable",
  "robustness:scenario-unstable",
  "robustness:shadow-only",
  "regret:evaluated",
  "abstention:indistinguishable-options",
  "abstention:insufficient-evidence",
  "abstention:no-feasible-solution",
  "abstention:no-good-option",
  "abstention:not-required",
  "abstention:unstable-choice",
  "relaxation:not-needed",
  "relaxation:recommended",
  "relaxation:unavailable",
  "role:best-choice",
  "role:best-sensible-saving",
  "role:split-saver",
  "role:worthwhile-comfort-upgrade",
  "room:upgrade-not-worthwhile",
  "room:upgrade-unavailable",
  "room:upgrade-worthwhile",
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
