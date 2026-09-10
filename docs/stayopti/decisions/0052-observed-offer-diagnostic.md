# D-0052 — Execute observed-offer diagnostics without fabricated DTO facts

Date: 2026-09-10. Approver: Mattia's D-0052 instruction. Source:
`e3c6985cd5024d919a9d7af93bf421de6a85040b`. Evaluation-only.

## Context and decision

D-0051 R1 verifies geography, evidence applicability and original essential needs,
but its old conversion cannot faithfully carry observed availability and a source
centre into a Hotel DTO. Add a distinct executable diagnostic entry consuming R1
and its coverage, canonical facts and actual offer scope. Reuse the existing
dimension formulas and intent/role policy. Keep computational availability,
recommendation eligibility and Golden separate. All candidates and their evidence
gaps survive; partial facts cannot grant a complete cost, bookability or suitability.

## Rationale and rejected alternatives

Missing evidence is not low property quality. Reject fake coordinates/bookable
flags, placeholder totals, deletion of incomplete alternatives, a second scoring
formula, and another preparer labelled an engine abstention without executing it.
Do not consume human feedback as a desired winner or an exception authorization.
Common source-centre distances can be diagnostically scored against that centre;
they do not certify equivalence to a user-selected geographic point.

## Evidence, consequences and safeguards

See `docs/engine-v3/d0052-observed-offer-diagnostic.md` and the synthetic executable
tests. Shared extractions preserve legacy defaults; no policy weights, thresholds,
roles or public activation change. The reviewed normalizer advances to @2.2 with
bounded source-language additions and unchanged R1 integrity checks. Unknown and
unsupported clauses remain explicit. No implicit migration or new human review.

The reviewed entry always revalidates the confirmed journal and original need
coverage. Unrepresented needs block policy execution; missing candidate evidence
is passed faithfully to the existing policy, which may actually abstain. Diagnostic
calculation does not grant recommendation. Full robustness/regret are out of scope.

## Validation and rollback

Use clean isolated CurrentUser Windows canonical tests, V2 controls, typecheck,
build and lifecycle/security/release gates. Preserve seven excluded paths and the
seventeen sealed D-0037 files. Only synthetic fixtures and software/documentation
may be selectively committed. A rollback would require separate authorization;
this change does not rewrite the historical checkpoints or private evidence.

Selective work-branch publication is authorized after gates; exact local/remote
SHA, pending commit count and actual push outcome must be reported at delivery.
No main promotion, provider traffic, custody, new collection or Golden admission.

Supersedes only the executable diagnostic boundary limitation of D-0051/R1,
not its integrity rules, historical results, D-0050, or any promotion gate.
