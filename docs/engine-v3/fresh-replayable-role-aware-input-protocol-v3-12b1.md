# StayOpti V3-12B1 — Fresh Replayable Role-Aware Input Protocol

Version: `stayopti.v3.fresh-role-aware-protocol@1`
Application: private offline technical infrastructure only

## Boundary

V3-12B1 accepts only newly captured, provider-neutral source capsules. A
capsule is forward-only, complete enough for deterministic replay, bound to
its canonical content with SHA-256, and free from PII, secrets, usable
provider/private identifiers, commission, markup and commercial ordering
signals.

The fifteen V3-12A records and every `case-<20 hex>` fingerprint are rejected.
They remain `LEGACY_DIAGNOSTIC_QUARANTINED`, non-replayable and available only
as frozen historical diagnostic context under D-0003.

This protocol creates technical infrastructure and synthetic contract
fixtures only. A capsule, packet, receipt or verdict created here is not a
Golden case, ground truth, training, tuning, calibration, scoring, ranking,
promotion evidence or proof of V3 superiority.

## Source capsule

Every capsule contains:

- a non-semantic opaque case ID and versioned schema, capture, provenance and
  canonicalization contracts;
- an explicit evaluation intent for exactly one of `best-choice`,
  `best-sensible-saving`, `worthwhile-comfort-upgrade`, `split-saver` or
  `abstention-near-tie`;
- complete search context, profile, preferences, hard and soft constraints;
- complete stay solutions and canonical offers, including total cost,
  currency, taxes, mandatory-cost completeness, room, treatment,
  cancellation, payment, availability, quality, reviews, location and
  comfort;
- explicit `known`, `estimated` or `unknown` status for every material data
  group;
- sanitized replay input, evidence, provenance and freshness;
- policy/config bindings and deterministic replay preconditions;
- declarations that PII, secrets and commercial signals are absent.

Canonical object-key ordering is deterministic. Both `contentDigest` and
`fingerprint` use the full SHA-256 of the canonical content while excluding
the two self-referential fields. FNV-1a is not a content binding for this
protocol.

## Blind evaluation pipeline

1. Validate and canonicalize the source capsule.
2. Verify its SHA-256 content digest and fingerprint.
3. Create two alternatives for the same requested role.
4. Produce deterministic opaque side labels in a visible blind packet.
5. Store engine, decision, solution and reason bindings only in a separate
   sealed assignment.
6. Collect a verdict into an immutable receipt bound to capsule, packet and
   role.
7. Validate the sealed mapping and receipt before deterministic deblind.
8. Produce a reason diff only between alternatives of the same role.
9. Require a later, separately authorized admission gate for any curriculum,
   holdout or Golden use.

The visible packet contains no V2/V3 label, policy version, provider identity,
original ordering, current-choice indicator, commission, markup, commercial
field, engine fingerprint or another evaluator's verdict.

## Role isolation

- Choice compares only Choice.
- Saving compares only Saving.
- Upgrade compares only Upgrade.
- Split compares only Split.
- Abstention is evaluated separately.

A role mismatch fails closed before packet creation. Split is an offline,
provider-neutral evaluation role only; this module does not enable public
SPLIT.

## Frozen public state

- V2 remains the sole public authority.
- V3 remains OFF/shadow.
- Public SPLIT remains disabled.
- No public barrel, decision core, frontend, provider, booking or deployment
  integration is introduced.
