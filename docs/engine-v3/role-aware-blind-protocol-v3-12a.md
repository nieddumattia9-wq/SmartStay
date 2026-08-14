# StayOpti V3-12A — Role-Aware Blind Evaluation Protocol

Version: `3.0.0-role-aware-blind-review.1`  
Application: offline evaluation only

## Purpose

The protocol prevents a recommendation that answers one question from winning or losing a judgment that asks a different question.

## Separate evaluation questions

Each blind comparison asks exactly one question:

1. `best-choice`: Which solution is the best overall fit for this user, profile, budget and trip?
2. `best-sensible-saving`: Which solution saves the most while keeping the experience loss acceptable?
3. `worthwhile-comfort-upgrade`: Which upgrade produces enough material benefit to justify its premium?
4. `split-saver`: Does this split create more verified net value than the best single stay after friction and risk?
5. `abstention-near-tie`: Is the evidence strong enough to recommend, or should the engine declare uncertainty?

The left and right sides must have the same role as the evaluation question. A role mismatch invalidates that comparison; it is not resolved by deblinding.

## Blindness and identity controls

- V2/V3 labels remain sealed until the judgment is committed.
- Property and provider identities are excluded.
- Raw provider identifiers and PII are excluded.
- Side order is deterministic from a sealed assignment and cannot depend on which engine is expected to win.
- Price, quality, location, flexibility, risk and relevant offer facts remain visible because they are needed for the judgment.

## Allowed judgments

- left;
- right;
- tie;
- neither/abstain when the question permits it;
- optional secondary-role annotation, recorded separately from the primary verdict.

A secondary-role annotation never changes the Best Choice verdict. It creates a candidate lesson for the appropriate role.

## Abstention

Abstention quality is evaluated separately from selection quality. Two equal abstentions are not proof of ranking superiority. A recommended option versus an abstention must be judged on whether the available evidence justified deciding, not on which side displayed more facts.

## Deblind and scoring

Deblinding occurs only after the verdict is immutable. Reports preserve:

- evaluation question and role;
- profile and segment;
- selected side, tie or abstention;
- V2/V3 assignment;
- decision and evidence fingerprints;
- evaluator pseudonym and duplicate controls;
- any secondary-role annotation;
- whether the case is diagnostic, Golden or outcome-backed.

Engine agreement is counted as an identical-selection tie, not a win for either engine. Pairwise win rates are reported both including ties as 0.5 and on genuine divergences.

## Anti-leak and anti-tuning rules

- No engine label, role label derived from engine identity or provider hint may enter the visible packet.
- No threshold may be changed after final evaluation outcomes are inspected and then scored on the same cases as proof.
- Diagnostic fixtures may be used as regressions but are excluded from untouched final holdouts.
- Teacher outputs remain candidate supervision and do not become ground truth automatically.
- Public promotion remains manual and requires the complete frozen Golden Dataset gates.

## V3-12A limitation

V3-12A freezes this protocol and validates its invariants. V3-12B must repair the executable blind packet generator so that it emits distinct role-homogeneous packets and a deterministic deblind report.

