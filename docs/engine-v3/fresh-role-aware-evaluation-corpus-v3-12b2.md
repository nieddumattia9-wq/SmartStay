# StayOpti V3-12B2 — Fresh Role-Aware Evaluation Corpus

Version: `stayopti.v3.fresh-role-aware-evaluation-corpus@1`
Application: private offline technical evaluation only

## Purpose

This corpus provides thirty deterministic, synthetic, provider-neutral source
capsules for exercising the V3-12B1 replay and blind-evaluation contracts. It
does not contain human verdicts and is not Golden, ground truth, training,
tuning, calibration, scoring, ranking, promotion evidence, or proof that one
engine is superior.

The quarantined V3-12A records are not source material. Their opaque legacy
fingerprints are rejected by the V3-12B1 capsule boundary and remain available
only as frozen historical diagnostic context under D-0003.

## Frozen matrix

The manifest binds one capsule for every combination of five evaluation roles
and six stay durations:

- roles: Best Choice, Best Sensible Saving, Worthwhile Comfort Upgrade,
  Split Saver, and Abstention/Near Tie;
- durations: 5, 7, 10, 14, 21, and 28 nights;
- partitions: 10 development, 5 frozen regression, 10 blind evaluation, and
  5 sealed holdout cases.

Every role has two development cases, one frozen-regression case, two
blind-evaluation cases, and one sealed-holdout case. The rotation prevents a
partition from being identified by a single duration, destination, or profile.
The manifest freezes case IDs, partitions, capsule fingerprints, content
digests, blind packet fingerprints, sealed assignment fingerprints, and bundle
fingerprints.

## Replay and blind boundary

Each record is created through `createFreshReplayableRoleAwareCapsuleV3`,
validated through `validateFreshReplayableRoleAwareCapsuleV3`, and replayed
through `verifyFreshReplayableRoleAwareCapsuleReplayV3`. Each blind bundle is
created and validated through the V3-12B1 role-aware pipeline.

Visible packets contain only opaque labels and decision facts. Engine labels,
policy/config versions, provider identity, original ordering, current choice,
previous verdicts, commissions, markup, and other commercial signals remain
absent. Sealed assignments remain separate. No record contains a verdict
receipt or deblind report.

Split cases are evaluation-only. They contain two complete two-segment split
alternatives plus a complete single-stay comparator, with one change,
contiguous segments, at least two nights per segment, and synthetic friction.
They do not enable public SPLIT.

## Frozen product state

- V2 remains the sole public authority.
- V3 remains OFF/shadow.
- Public SPLIT remains disabled.
- No public barrel, decision core, frontend, provider, booking, deployment, or
  public runtime integration is introduced.
