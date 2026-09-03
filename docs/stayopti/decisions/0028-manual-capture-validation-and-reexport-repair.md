# D-0028 — Repair manual-capture validation and allow correction-only export

Date: 2026-09-03

## Context and problem

The first completed T5B archive was correctly classified diagnostic-only, but
offline review found that its validator did not recognize lower-case explicit
unknown evidence, did not reconcile a fully known payment split to the
displayed total, and did not flag an implausible day in refundability text. The
capture UI also represented location only as metres, which could pressure a
human to fabricate distance from a valid textual position.

## Decision and scope

Normalize explicit unknown text case-insensitively, classify a known payment
decomposition mismatch as diagnostic, detect implausible calendar days in
textual cancellation/refundability evidence, and introduce a distinct verified
textual-position wrapper. Add a correction-only offline export mode for an
existing five-alternative session.

The repair mode permits one public field at a time, requires explicit
confirmation, and never modifies or displays encrypted private identity or
proof. It cannot create a blind capsule, execute V3, record or deblind a
judgment, or admit a case to Golden.

## Product rationale

Missing evidence must remain missing, payment semantics must reconcile when
all parts are known, and qualitative location evidence must not be coerced into
false precision. Recoverable clerical errors should not force a second market
observation when the original private evidence remains intact.

## Evidence reviewed

- the supplied ZIP matched its user-declared SHA-256;
- all nine checksummed artifacts passed;
- the sealed outcome was `DIAGNOSTIC_ONLY` with five alternatives;
- controlled structural inspection reproduced the missingness, reconciliation
  and textual-date gaps without exposing private evidence;
- the saved session remained outside the repository with zero network calls
  and zero credentials.

## Alternatives rejected

- Treating lower-case unknown as a literal meal plan: semantically false.
- Deriving metres from a landmark phrase: fabricates precision.
- Re-entering all five alternatives: unnecessary and increases transcription
  risk.
- Editing encrypted proof: outside scope and unnecessary.

## Risks and safeguards

Payment reconciliation is diagnostic rather than destructive because a
consumer surface may omit a component. Textual position remains explicit and
separate from distance. A correction is persisted only after `APPLICA`; a new
ZIP is emitted only after `RIESPORTA`. The old ZIP remains historical evidence.

## Implementation consequences

The manual capture contract gains optional verified textual location evidence,
deterministic reason codes and a private-proof-preserving offline repair path.
No provider, public runtime, ranking, weights or Golden gate changes.

## Validation and rollback

Synthetic targeted tests must cover case-insensitive unknown, payment mismatch,
textual location, implausible dates, correction confirmation and repair-only
export boundaries. Canonical V2/V3 regression, TypeScript, PowerShell parsing,
scans and Git checks remain required. Rollback is forward-only.

## Approver

User instruction dated 2026-09-03.

## Supersedes / superseded by

Extends D-0025 through D-0027 without superseding their privacy, confirmation
or non-admission safeguards.
