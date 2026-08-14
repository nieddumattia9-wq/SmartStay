# StayOpti V3-11C — Independent candidate runtime

## Scope

V3-11C closes the two application gaps found in the V3-11B evidence review:

- V3 builds a single-stay solution for every evaluated hotel with a selected offer, not only for hotels already chosen in `recommendationRoles.picks` by V2;
- the V3 robustness cohort has no V2 Best Choice anchor, so V2 recommendation output cannot choose the V3 robust winner.

The compatibility adapter still consumes the normalized evaluation evidence produced by V2. It does not yet replace provider ingestion or the V2 scoring pipeline. Independence in this increment means an independent V3 policy over the full evaluated candidate set, not a native end-to-end V3 search engine.

## Runtime contract

The Results page now obtains one exact frontend V2 runtime object containing the search input, public result and public view. The V3 hook receives that same immutable source after V2 evaluation.

- Default mode: `off`.
- Optional internal mode: `shadow`, selected only by `VITE_STAYOPTI_V3_SHADOW_MODE=shadow`.
- Public serving engine: always V2.
- V3 errors: isolated from the public V2 path.
- Observation storage: in-memory only, bounded to 100 items.
- External analytics or network transmission: none.
- SPLIT serving: disabled.

The pre-existing V2 view builder delegates to the new runtime builder and returns the same view. The public response is never replaced by a V3 result.

## Bound public-rate evidence

A plain caller-provided `verified` string is no longer accepted. Rate consistency can be verified only from an evidence object bound to:

- the V3 decision fingerprint;
- the selected hotel token;
- currency and finite positive totals for Rates, Prebook and retrieved Prebook;
- an evidence fingerprint computed over the complete object.

Verification requires every adjacent total to differ by no more than EUR 0.02. Missing evidence remains `unverified`; a malformed, mismatched or inconsistent proof is `failed`.

The frontend hook does not fabricate live rate evidence. Until a trusted Rates/Prebook/Get-Prebook capture is connected, shadow observations remain fail-closed for that signal.

## Evidence added

- An untouched deterministic search where V2 selects `candidate-1-0` and exposes only `candidate-1-0`/`candidate-1-1`, while V3 selects evaluated hotel `candidate-1-7`.
- Contract tests for bound public-rate evidence, including missing and mismatched evidence.
- Runtime tests for default off, shadow isolation, exact V2 result identity, bounded internal buffering and source linkage from Results.
- Existing V2, V3, lifecycle, typecheck and build gates remain mandatory before commit.

## Explicit non-goals

- no deploy;
- no provider-live or booking calls;
- no public V3 traffic;
- no SPLIT card or SPLIT recommendation;
- no claim that V3 has passed the Golden Set or blinded human evaluation.

## Next gate

After the application Evidence ZIP passes, run the real V3-10B evaluation protocol on locked inputs and stored outputs. Shadow volume, canary or public promotion remain blocked until that evaluation and its safety thresholds pass.
