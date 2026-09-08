# D-0044 — Evaluation-only intent / V3-15 bridge

Source: 93743a0f43b330c908a75fae3f74f5a0d12d7419, work branch
codex/evaluation-d0036-d0041. Authority: Mattia's instruction in the R2 intent
audit, 02-ISTRUZIONE-CODEX.txt. D-0043 remains historical and unchanged.

## Problem and decision

The frozen F3 regression fails before repair: the same-day Comfort evaluation
uses offer-2 / 420, but the adapter reselects offer-4 / 437 for a non-picked
hotel with the flexibility context omitted. Scores still describe offer-2.
Resolve the evaluated offer from recommendationRoles.evaluations for **every**
candidate; check source identity/values and pick agreement. No reduced-context
reselection or fallback. Genuine integrity discrepancies throw controlled errors.

A separate, opt-in evaluation bridge reuses V2 budget intent, automatic-profile
resolution and contextual dimensions, then calls the existing V3-15 role policy.
The old utility/output is diagnostic only. No public export, runtime switch,
frontend behavior, V2 implementation, weight/curve/threshold or Golden gate changes.

The policy's optional versioned contextual-admissibility input expresses missing
versus inadmissible context without forging quality or hard-constraint violations.
Policy/schema .2 makes this extension explicit; the profile configuration is
byte-unchanged. With no contextual input the historical numerical policy remains.
See the mapping document for retained limits, including the conservative common
experience floor across roles and unavailable full robustness/regret.

## Distance and safeguards

Reuse maximumDistanceKm and selectedLocation, with explicit mandatory-cap versus
strong-preference semantics. Outside a hard cap is never overridden. Outside a
strong preference is contextually ineligible, not a hard violation, unless a
case-specific accepted experience gain has supporting evidence and a verified
in-range comparable reference. Neither a general km tolerance nor a hidden
penalty is introduced. With all alternatives outside, request an explicit
exception rather than invent one. This does not implement Best Over Budget.

## Evidence, alternatives and limits

Frozen invented cases cover offer identity, five profiles/manual/automatic,
budget basis, market fallback, privacy, experience, distance, missing totals,
rating unknowns, ties, provider/ID/order invariance and policy-coherent outputs.
Do not tune any values to real feedback. Result files distinguish the previous
utility from the role policy and bounded sensitivity from full robustness.

Rejected: reselection followed by copying scores; copying all V2 ranking vetoes;
category confidence as a premium room score; inheriting legacy robustness PASS;
renaming the branch to conceal D-0038's launcher prerequisite.

Final clean CurrentUser validation: 41/41 targeted, V3 1760/1761 (only D-0038
DEMO_REPOSITORY_CHECKPOINT_CHANGED; no branch rename), V2 196/196. Lifecycle
530 pass/17 existing skips, security 29, release 101, analytics 31, capacity 9,
beta 4; typecheck, build, analytics gate and local-loopback smoke pass.
Initial sandbox DPAPI failures are not treated as PASS; the actual CurrentUser
rerun passes those synthetic tests. No real custody is certified or accessed.
The npm network dependency audit/release-environment gate was not executed;
this is not a claim of release:ci or GitHub PASS. Exact hashes/logs are in the
delivery. Required V3 gate blocks work-branch commit/push; source/remote remain
93743a0f43b330c908a75fae3f74f5a0d12d7419, no existing commit pending. No protected
file, private material or historic evidence is included. Any later correction
requires a forward change; no history rewriting. Approver: Mattia. No real
Bologna execution, review, import, custody, training or automatic Golden admission.
