# D-0003 — V3-12A legacy diagnostic quarantine

Date: 2026-08-20

Status: Accepted

Approver: Mattia, explicit task authorization

## Context and problem

The fifteen judgments frozen by V3-12A retain historical diagnostic value, but the V3-12A.2 recovery found no complete source capsule, canonical source digest and case-ID derivation, or immutable verdict/deblind receipt. All fifteen records are partially recovered and non-replayable.

## Decision and scope

Classify exactly the fifteen records in `v3-12a-diagnostic-judgments.json` as `LEGACY_DIAGNOSTIC_QUARANTINED`. Preserve their original bytes and judgments. Permit access only as `FROZEN_HISTORICAL_DIAGNOSTIC_CONTEXT_ONLY` through a digest-bound, closed-case-set admission boundary.

The records cannot be used as replay input, Golden or ground truth, current human judgment, training, tuning, calibration, scoring, ranking, V2/V3 superiority evidence, trace or promotion evidence, V3-12B input, or authority to change policy, weights or thresholds.

## Product rationale

Historical memory should not be erased, but incomplete provenance cannot be promoted into decision evidence. A fail-closed boundary preserves the diagnostic record while preventing accidental reuse beyond what the evidence supports.

## Evidence reviewed

- V3-12A.0 Evidence SHA-256 `df3da0f6ef831d9e66887f7f0950ed9266cbc54dbd3f753386cd48f6e73f4942`.
- V3-12A.1 Evidence SHA-256 `3b18caad7c5933bcde37c7516621d8b97af8e524f09d2668f07de311c0674fb4`.
- V3-12A.2 Evidence SHA-256 `8b27692593d22df8d76acc262840352a7bbebba11de01e40da358adb7ab96af9`.
- Fixture SHA-256 `44c81f0a68f2551c53e6a348d963c1d1076ab2ac524a1723460463db7ca5fa20`.

## Alternatives rejected

- Deleting or rewriting the judgments: destroys useful historical context.
- Treating partial archives as replayable: missing source and verdict provenance cannot be reconstructed safely.
- Allowing V3-12B to ingest the records with warnings: warnings do not prevent accidental evidence promotion.

## Risks and safeguards

- Manifest drift, fixture drift or a changed case set blocks the entire admission.
- Unknown and explicitly prohibited uses block without exposing partial records.
- The module is private: no public barrel, decision-core, V2, provider, frontend or V3-12B import is introduced.

## Implementation consequences

The original fixture remains byte-identical. A separate manifest binds its exact SHA-256, all fifteen IDs, provenance status, quarantine status, sole allowed use and complete prohibited-use list. The existing diagnostic test reads the fixture through the quarantine boundary.

## Validation and rollback

Validation requires quarantine-specific tests, full V3 and V2 suites, offline provider and lifecycle suites, typecheck, build, release CI, dependency security audit and Git diff checks. Before commit, rollback consists only of removing the new manifest/module/test/decision record and restoring the single modified diagnostic test and decision-log row.

## Supersession

Supersedes no prior product policy. It narrows the allowed evidentiary use of the fifteen legacy diagnostic records and preserves D-0002's forward-only provenance rule.
