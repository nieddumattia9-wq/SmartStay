# D-0056 — Preserve documented rating bounds without changing scoring

Date: 2026-09-13. Source: `f3de6d6bb2583d8954385845cd99284b4ddc0dd2`.
Scope: pure evaluation-only appendix and its requirement validation, synthetic
tests and public technical evidence. D-0055 is the separate private preparation.

## Decision and evidence

Retain the documented interval separately from its numerical maximum. Add only
the bounded 1-10 / 1–10 statement forms and preserve existing 0-N forms, original
wording, provenance, point review, exact observation and applicability checks.
Validate the lower bound; do not change the existing observed/max normalization.
Validated contradictory scales cannot hide behind a historical or supplemental
favorable maximum. Maximum-only history remains history, not an invented range.

The initial decoder failure is preserved in `../../engine-v3/evidence/d0056-rating-range-before.json`.
The report `../../engine-v3/d0056-rating-source-interval.md` explains the exact
grammar, actual REVIEWED-to-policy controls, invocation accounting and gates.

## Alternatives rejected

- Rewriting a source interval as 0-10 to pass the old grammar.
- A free-text interpreter or changing the rating normalization formula.
- Treating matching hashes as proof of meaning or applying a page's scale to
  unrelated historical observations.
- Letting a rejected but applicable contradictory range leave a positive rating
  silently active; dropping all ratings regardless of available valid evidence.

## Safeguards and state

Appendix version is now `@1.2`; no implicit migration of `@1.1` documents or
historic measurements. Requirements retain their compatible optional metadata
extension. No private execution, new review, source acquisition, provider call,
score/role/public-runtime change or Golden admission. The private preparation
remains PENDING; its scope correction is delivered privately and excluded from Git.

Approved scope: user's targeted correction and conditional work-branch publication.
Gates and exact push state must be reported, not inferred from local tests or CI.
No previous commit, evidence artifact or canonical source is replaced.

Observed local validation: 41 new / 358 combined targeted / 2265 canonical V3 /
196 canonical V2 PASS; typecheck/build and the other gates pass as itemized in the
phase report. Lifecycle retains 17 explicit pre-existing integration skips.
The new test run measures 28 kernel and 56 actual policy invocations, separately
from its zero-invocation rejected base-binding case. Private execution stays zero.
Seven excluded paths, seventeen sealed files and the private report copy were
verified byte-identical. Publication is a selective non-force work-branch push,
with exact remote verification at delivery; no main push, CI PASS claim or deploy.
