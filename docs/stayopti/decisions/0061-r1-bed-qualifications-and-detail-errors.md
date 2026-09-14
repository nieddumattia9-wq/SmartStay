# D-0061 R1 — Bed qualifications and semantic detail validity

Date: 2026-09-14. Authority: Mattia's explicit D-0061 R1 instruction.
Source: `3d94b9f45632260f65784d011c53366dc9f4f2b7`.
Work branch: `codex/evaluation-d0036-d0041` only.

## Decision

Version the fresh observation adapter as `@1.1`, without changing the original
synthetic wire profile, governor, fixture, shared requirements or policy. Parse
the selected rate's bed inventory together with its relevant qualifications.
Do not drop negative, conditional or unsupported bed clauses when extracting
positive quantities. Retain the clause classification and original source link.

An explicit restriction conflicting with the stated base inventory becomes
CONFLICTING; pending, ambiguous or unsupported qualifications remain UNKNOWN.
Neither certifies four usable places. No remaining bed count or zero inventory
is invented. Extra-bed restrictions stay separate from documented base beds;
unrelated breakfast/service conditions do not invalidate the base inventory.
Existing evaluators still distinguish insufficient information from an explicit
numeric capacity violation. Unknown sofa/bunk places remain unknown.

Property identity and semantic usability of HOTEL_DETAIL are independent.
Inspect `error` and `errors` in both the response container and the property
record. Nonempty error declarations block all detail-derived facts; unsupported
error representations fail closed. Absent/null/empty-list error markers are
distinct from errors. Preserve original payload, identity result, error paths
and source hashes, without treating a provider error as low property quality
or unavailable accommodation. Independent valid offers remain evaluable.

## Rejected alternatives and safeguards

- Blacklist only the two reproduced Italian sentences.
- Treat any negative word anywhere in a description as a bed contradiction.
- Ignore an error because its response still contains the expected property ID.
- Convert a failed detail into zero stars, remove the candidate, or revive its
  prior details as verified facts.
- Change ranking weights, roles, requirements or public integration.

The initial six executions and four failing safety assertions are retained,
including exact synthetic captures and hashes. Historical D-0061 results and
fixtures are not rewritten. See the R1 report for observed before/after results,
final isolated gates and remaining limits. Publication is selective and
conditional on gates; commit/push and pending counts require remote readback.
No live provider transport, private review or operational launcher is authorized
by this repair. Main and all excluded/sealed/private materials remain protected.

Initial isolated R1 validation: new39/39, targeted563/563, V3 2470/2470,
V2 196/196, mapper18/18, PS5.1 parse13/13 and remaining canonical gates PASS;
lifecycle530 PASS with17 preexisting real-Valkey skips. Actual CurrentUser DPAPI
is checked with synthetic bytes. Final reporting-only updates require the final
candidate/tree checks before publication. A further unpublished-candidate
counterexample (extra-bed mention hiding a base-bed restriction) was reproduced
then repaired by whole-clause extra scope, reaching40/40 targeted PASS. That
code requires its own isolated gates, not reuse of the earlier code's PASS.
No result is attributed to GitHub CI.

The corrected extra-scope candidate subsequently passed40/40 new,564/564
targeted,V3 2471/2471,V2 196/196 and all canonical gates/scans above. Final
reporting-only reseal preserves code/test/evidence bytes and requires the final
tested tree before the actual commit; the preliminary2470 result is not reused
as evidence for changed software.
