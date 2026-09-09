# D-0048 — Maximum Comfort anchored experience band

Date: 2026-09-09. Approver: Mattia, explicit D-0048 instruction.

## Context and decision

The finite D-0046 grid exposed a 100 EUR increase for 0.132 experience points.
Maximum Comfort already declared a 0.5-point choice tolerance but ignored it.
Apply that existing tolerance to the global eligible nondominated maximum,
then minimize complete cost within the band; retain higher experience at equal
cost and the existing identity-neutral exact tie contract.

## Rationale, alternatives and safeguards

Do not pay materially more for negligible experience improvement. Do not
reward unused budget universally, round distance, introduce a cost-per-metre
rule, chain approximate pairwise ties, or tune weights/thresholds/Upgrade.
Eligibility and explicit constraints precede band selection. Unknown evidence
stays unknown; missing coverage does not become low quality. No public change.

The explanation records actual comparison deltas and evidence. Policy/schema
advance to .3; historical payloads retain their version and cannot be silently
replayed as the new policy. The numeric configuration fingerprint is unchanged.

## Evidence and consequences

Initial bridge regression fails on R1 with 400 versus expected 300. All 187
frozen inputs retained, 186 execute and one unsupported contextual exception
remains unexecuted. Exactly two Best Choices and two dependent Saving roles
change; no Upgrade or other-profile change, no candidate metric change.
See `docs/engine-v3/d0048-maximum-comfort-experience-band.md` and delivery logs.
26 targeted tests and R1/D47/D46/D44 regressions pass. Full isolated gates,
exact-tree commit, actual PowerShell command and remote proof precede delivery.

## Scope, risk, validation and rollback

Evaluation-only, invented data, no human tuning or market-outcome claim.
Tolerance 0.5 is an existing configuration, not scientifically validated here.
Positive Upgrade coverage and full robustness stay unresolved. No custody,
Golden, public activation, main push or deploy. Seven excluded paths and 17
D-0037 seal files remain byte-identical. Any rollback needs a separately
authorized forward change; never rewrite prior history.

Supersedes only Maximum Comfort's experience-first exact-only tie behavior
and SC19's recorded failure expectation, not D-0046/R1 historical evidence.
