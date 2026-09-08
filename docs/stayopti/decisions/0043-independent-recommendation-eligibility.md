# D-0043 - Eligibility before independent V3 selection

Date: 2026-09-08. Approved scope: offline V3 repair, synthetic proof and
work-branch publication only. Source: c525afacfac3138516e49497175eae61158ca272.

## Cause and decision

D-0042's measurements are retained as historical evidence, not rewritten.
The V2 compatibility adapter supplied reliability/bookability alone to geometry
and robustness. A provisional cost could be scored and win robustness although
the corresponding StaySolution was incomplete. The independent-output guard
then correctly rejected that inconsistent recommendation. The same boundary
lost V2's evaluated explicit maximum-distance constraint.

One assessment now feeds geometry and robustness BEFORE their cohort/selection:
canonical solution feasibility, source eligibility/bookability and the evaluated
explicit maximum-distance / mandatory-accommodation requirements. It does not
copy rankBand, price preference, every V2 exclusion, or a budget exceedance as
a blanket hard veto. Budget/profile policy remains unchanged.

An incomplete solution or unverifiable requested hard constraint keeps its
diagnostic utility, but has no recommendation/scenario score. Proven violations
are ineligible. Candidate and decision reason codes distinguish these states.
No usable candidate with unresolved evidence yields insufficient-evidence
abstention; all established exclusions yield no-feasible-solution. Mixed sets
are evaluated on the eligible cohort, with existing near-tie/risk abstention
unchanged. No post-winner substitution is performed.

The independent output guard, schema validators, replay fingerprints and
commercial firewall remain in place. No weights, curves, thresholds, public
configuration, runtime/UI files, provider, V2, Golden or custody gates change.
The generic robustness API still supports standalone diagnostic callers; the
canonical-solution adapter always supplies the explicit eligibility assessment.

## Synthetic proof

The existing synthetic-only proof runner now includes nine scenarios:
complete, total unknown, rating scale unknown, both unknown, mixed incomplete,
not bookable, strongest candidate outside max, all outside max, missing
distance/coordinates. Tests also exercise the full independent shadow
orchestrator, with the public V2 result preserved by reference and by value,
provider-label/order invariance, mandatory constraints and integrity mutation.

The V2 orchestrator currently passes providerDistanceReference=selected-location.
A bare number therefore is NOT a synthetic proof of unverified distance: the
missing-distance fixture supplies no numeric distance or coordinates. This
repair does not certify upstream provenance or alter that V2 assumption.

Schema validity alone is not replay integrity: a structurally valid incomplete
solution can pass schema validation, while a mutated recommendation still fails
the independent guard and replay comparison. Assertions test the actual rules.

## Validation and limits

Targeted proof: 55/55 PASS. The clean candidate's canonical V3 suite is
1720/1720 PASS under the D-0038 branch precondition below; V2 is 196/196.
Lifecycle, security, release, analytics, capacity, beta, typecheck, build and
local-loopback smoke pass. Exact final-byte revalidation, clean candidate
identity, final commit/push and preserved-file hashes are in delivery evidence.

D-0038 has an unchanged hardcoded launcher branch prerequisite
ci/d0033-clean-commit-proof. Its full-suite result must be reported with that
precondition in an isolated clone, NOT as unconditional work-branch PASS.
No launcher repair or branch change in the working repository is authorized here.

Historical D-0042 ZIP/results remain untouched. D-0041 real execution remains
disabled: reviewed-field mapping, the strong distance preference (not a hard
maximum), additional role semantics and separate real-execution authority remain
distinct tasks. Bologna review/feedback are not fixtures and are not executed.
No public integration, real custody, training or automatic Golden admission.

Rollback, if ever needed, requires a new authorized forward repair; no history
rewriting. Approver: Mattia's D-0043 task. Supersedes only D-0042's observed
feasibility/distance discrepancies prospectively, not its historical record.
