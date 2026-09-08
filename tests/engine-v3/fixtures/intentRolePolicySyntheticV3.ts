import {createSyntheticCapabilityInput} from '../../../src/engine-v3/evaluation/diagnosticCapabilityProbeV3';
import type {IntentRoleBridgeInputV3} from '../../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';

// D-0044 cases declared before execution; all observations and identities invented.
export function intentFixture(profile: string = 'balanced', origin: 'manual' | 'automatic' = 'manual'): IntentRoleBridgeInputV3 {
  const search = createSyntheticCapabilityInput('COMPLETE');
  search.preferenceId = profile;
  search.preferenceSource = origin;
  return {caseId: 'SYNTHETIC_INTENT_BRIDGE', search, profileOrigin: origin,
    distance: {semantics: 'not-requested', reference: 'selected-location', provenance: 'SYNTHETIC_PREDECLARED_INTENT'}};
}
export const FROZEN_INTENT_CASE_SPECIFICATIONS = [
  'same-day-multi-offer-non-pick-F3', 'single-offer-control',
  ...['maximum-comfort','comfort','balanced','savings','maximum-savings'].flatMap(p => [`manual-${p}`,`automatic-${p}`]),
  'per-room-night-one-room', 'per-room-night-two-rooms', 'per-room-night-seven-nights',
  'manual-balanced-high-budget-not-luxury', 'market-insufficient-fallback',
  'equivalent-experience-cheaper', 'explicit-private-bathroom', 'unknown-private-bathroom',
  'all-total-unknown', 'one-total-unknown', 'unknown-rating-scale',
  'hard-distance-1', 'strong-distance-1', 'strong-distance-3', 'all-outside-no-exception',
  'distance-unknown', 'unproven-exception-rejected', 'provider-order-identity-permutations',
  'exact-semantic-tie', 'same-policy-bounded-robustness', 'malformed-binding-rejected',
] as const;
