# D-0027 — Retire invalid T5B attempt and restart with a fresh session identity

Date: 2026-09-03

## Context and problem

The first T5B manual canary was interrupted before confirmation after several
fields were entered incorrectly. The user rejected recovery or correction of
that attempt and required a completely clean restart with no reuse of its
values or identity.

## Decision and scope

Classify `V3_17T5B_FLORENCE_20261015_001` only as
`ABORTED_INVALID_INPUT`, remove its empty private session directory, and use
`V3_17T5B_FLORENCE_20261015_002` for the replacement capture. The runner
explicitly rejects reuse of the retired identity.

This decision changes only local manual-capture orchestration and its tests and
documentation. The frozen scenario, validation contract, encryption boundary,
V3 logic and public runtime remain unchanged.

## Product rationale

A rejected human-entry attempt must not be recoverable as decision evidence.
A fresh local identity makes non-reuse auditable while preserving the fixed
scenario and the requirement for five uniformly collected alternatives.

## Evidence reviewed

- the old runner process was no longer active;
- the old session directory contained zero files and no state document;
- no encrypted envelope referenced the old session;
- no T5B shared Evidence ZIP was present;
- the seven unrelated dirty paths and protected repository files retained their
  recorded hashes.

## Alternatives rejected

- Resuming `_001`: rejected because the user invalidated the entire attempt.
- Prepopulating corrected values: rejected because no prior input may be reused.
- Deleting the full private-evidence root: rejected because it would exceed the
  narrow cleanup authority and risk unrelated evidence.

## Risks and safeguards

The cleanup target is restricted to the exact old session directory, verified
under the private capture root. The new runner identity is explicit and tested;
draft fields remain process-memory-only until the full summary receives
`SALVA`.

## Implementation consequences

The guided runner reports `_002` and `PREVIOUS_SESSION_REUSED=NO`. No API,
scraping, browser automation, judgment, snapshot, Evidence export or Golden
admission is introduced.

## Validation and rollback

Targeted T5B tests, canonical Engine regressions, TypeScript compilation,
PowerShell parsing, scans and Git checks must pass before restart. Rollback is a
forward corrective change only; the retired `_001` identity must never be
reactivated.

## Approver

User instruction dated 2026-09-03.

## Supersedes / superseded by

This operational recovery extends D-0025 and D-0026. It does not supersede the
T5B evidence or Golden-admission boundaries.
