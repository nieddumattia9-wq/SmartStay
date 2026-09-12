# D-0056 — Documented rating interval at the REVIEWED appendix boundary

Source: `f3de6d6bb2583d8954385845cd99284b4ddc0dd2`, evaluation work branch only.
D-0055 denotes a separate private evidence preparation; no private names, source
extracts, observations, point reviews or measurements belong in this checkpoint.

## Observed defect and narrow correction

The preserved pure-decoder reproduction in
`evidence/d0056-rating-range-before.json` returns UNKNOWN for `Rating scale: 1-10`
and KNOWN maximum 10 for the synthetic `Rating scale: 0-10` control. It executes
no kernel or policy. The control is not attributed to any actual source.

Appendix `@1.2` adds exactly `Rating scale: 1-10` and `Rating scale: 1–10` (U+2013).
The existing ASCII `Rating scale: 0-N` form remains accepted, where N is a finite
positive number written as digits with an optional decimal part. Outer whitespace
is trimmed for recognition only; original statement bytes remain in the proof
and `sourceStatement`. Capitalization and internal spacing remain exact. No
other lower bound, prose, negation, condition, inferred interval or page-wide
rating assignment is accepted. Unsupported statements remain explicit UNKNOWN.

`interpretAppendixStatement` now returns the original statement and
`sourceInterval: {minimum, maximum}` separately from `value`, the numerical
maximum. `materializeClaim` takes these only from verified source content, not
caller extras or a historical spread. Old maximum-only claims do not retroactively
gain a documented minimum. The requirement validator checks any supplied interval
and both bounds of a known observation. The numerical calculation in
`reprojectObservedRequirementCandidate` remains **observed / maximum × 10**.
No subtraction of the minimum, new quality penalty, threshold or ranking change.

## Integrity and conflicting evidence

Original REVIEWED journal, transformation and essential-need validation still
precede appendix processing. Hashes, point-review receipt, exact historical rating
claim/value, scope, applicability and temporal checks precede interval authority.
An expired, inapplicable or falsely bound proof cannot acquire such authority.

An applicable interval excluding the observed vote cannot normalize that vote:

- With an UNKNOWN historical scale and no other accepted scale, the integration
  is rejected and the original UNKNOWN remains (the existing EA47 control).
- With an otherwise usable historical scale, an active CONFLICTING claim prevents
  stale normalization; the historical value is retained separately.
- With multiple integrations, a validated contradictory interval participates in
  conflict resolution instead of disappearing behind a favorable scale. Bounds
  are compared, not just the common maximum. Integration order is not authority.

The original proof text, interval, historical claim hash, source artifact hash,
receipt, applicability and consumed/active facts remain traceable. A rejected
single integration is not necessarily an input rejection: the executor can still
invoke the actual kernel and policy on remaining evidence. Invocation counts in
the after evidence measure the kernel callback and actual role-policy export
separately (baseline distance policy and final role selection).

## Verification and limitations

Targeted and canonical candidate results are recorded below from execution.
Historical D-0054 R1 evidence/fixtures are not rewritten. All new cases are
invented, use the supported REVIEWED entry, and keep feedback outside the input.

Old appendix documents retain their old version and source binding. This change
does not migrate them, apply private evidence, produce human receipts or change
private historical measurements. Real use still requires an actual point review
and an exact observation link. A scale alone does not certify complete stay cost,
bookability, room allocation, rate continuity or Golden eligibility.

### Observed local results

New suite: **41/41 PASS**. With existing appendix and R1: **145/145 PASS**.
The full targeted group (D-0050, D-0051/R1, D-0052/R1/R2, D-0054/R1 and new
rating tests) passes **358/358**, zero skips/failures, on the isolated candidate.
The new suite measures **28 kernel / 56 actual policy calls per run**; the separate
invalid base-binding case calls neither. These are not total counts for all
historical suites or exploratory development runs. Private calls remain zero.

| Final software candidate gate | Observed result |
|---|---|
| Canonical Engine V3 | 2265/2265 PASS, zero skips |
| Canonical Engine V2 | 196/196 PASS, zero skips |
| Lifecycle | 530 PASS, 17 existing integration skips, zero failures |
| Security / release / analytics / capacity / beta tests | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript and build | PASS |
| Analytics-beta measurement gate | PASS |
| Synthetic loopback staging smoke | PASS, 18 checks; no provider |
| Windows PowerShell 5.1 parser | 13/13 PASS, actual 5.1.26100.9444 |
| Scope, secret/private-artifact/raw-token scans; diff checks | PASS |

Tests ran on a clean local candidate with installed dependencies copied offline,
without the seven excluded paths or the private report copy. The canonical V3
gate actually ran its Windows launcher/CurrentUser DPAPI synthetic regressions;
this does not certify any private real custody. No skipped Windows substitute.
Only reporting documents were updated afterwards with these results; tested
software and synthetic test bytes were checked unchanged before resealing.
GitHub CI, native Linux and the network package-registry audit were not executed
or claimed. No workflow was dispatched. The validation branch does not trigger
the main-only push Release Gate.

Initial test-authoring errors (relative import and synthetic field binding) were
fixed without changing historical fixtures; their logs are retained locally,
separate from the real initial decoder reproduction. No product exception or
failing gate is being accepted. The final work-branch publication is authorized
after PASS; exact commit, remote SHA, preserved bytes and pending count are
verified at delivery. Main is not a publication target.
