# StayOpti Engine V3-12B — Role-aware Blind Evaluation Repair

Status: offline evaluation infrastructure only
Public engine: V2 only
V3 modes: off or shadow
SPLIT: disabled

## Purpose

V3-12B repairs the V3-10 blind comparison protocol. The legacy packet placed
the V2 Best Choice beside the independent V3 selection even when that V3
selection represented a Best Sensible Saving or a Worthwhile Comfort Upgrade.
Those are different questions and their generic winner cannot be treated as
ground truth for ranking calibration.

The repair is fail-closed:

- Best Choice is compared only with Best Choice;
- Best Sensible Saving is compared only with Best Sensible Saving;
- Worthwhile Comfort Upgrade is compared only with Worthwhile Comfort Upgrade;
- abstention and near-tie behavior are evaluated in a separate packet;
- a role or status mismatch is excluded and recorded in the sealed audit;
- no rejected pair can enter a role-aware result or promotion gate.

## New offline contract

`createRoleAwareBlindReviewBundleV3` accepts explicit, PII-free V2 and V3
candidates. Each candidate carries its sealed engine label, decision role,
status, decision fingerprint and reason codes. Visible facts contain neither
engine labels nor provider, property or hotel identity.

The output contains one homogeneous packet per evaluation question. The
question role and question text are visible because reviewers must know which
decision they are judging. Side roles remain sealed; validation proves that
both equal the visible question.

The sealed section contains deterministic side assignments and a rejection
audit. It must never be distributed to blind reviewers.

## Deterministic deblind

`createRoleAwareDeblindReportV3` requires every response to bind both the
packet ID and packet fingerprint. It resolves the winning engine only after
validation, preserves the evaluation role on every judgment and reports:

- V2 wins, V3 wins, ties and neither by role;
- shared reasons, V2-only reasons and V3-only reasons by judgment;
- abstention outcomes independently from recommendation outcomes.

`neither` is valid only for `abstention-near-tie`. A response copied across
packets or changed after packet creation is rejected.

## Legacy V3-10 evidence

The V3-10 blind format remains replayable for forensic comparison, but it is
explicitly marked as ineligible for the V3-12B role-aware gate. Existing
V3-10C and V3-10F judgments remain diagnostic evidence and cannot be promoted
to candidate ground truth.

## Frozen boundaries

This phase does not change V2, public recommendations, ranking weights,
thresholds, offer selection, provider integrations, booking, payments,
analytics, deployment or SPLIT. It adds only offline evaluation contracts,
validation, deterministic deblind and regression tests.
