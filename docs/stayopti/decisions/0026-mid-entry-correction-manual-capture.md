# D-0026 — Mid-entry correction for manual capture

Date: 2026-09-03

Status: Accepted usability repair after second interrupted real preflight

Approver: Mattia through the V3-17T5B safe-hold instruction

## Context and problem

The D-0025 interface allowed field-level correction at the final summary, but
not while the questionnaire was still advancing through its fields. During a
real preflight this made it impractical to correct an earlier payment amount
and allowed a numeric amount to be entered where textual refundability evidence
was expected. The runner was interrupted before confirmation, so the draft was
not persisted.

## Decision and scope

After every field, the local interface now accepts `INDIETRO`,
`CORREGGI 1..17`, `RIEPILOGO` or `ANNULLA`. Corrections update only the
in-memory draft. `ANNULLA` discards that draft while preserving the session.
Encryption and persistence remain behind the final summary and explicit
`SALVA` confirmation.

Payment prompts are explicitly numeric. The amount payable at the property
explains that a statement that nothing is due now does not establish a zero
amount payable later. Cancellation and refundability prompts are explicitly
textual and reject values that consist only of a monetary-looking number.
Unknown evidence remains `UNKNOWN`.

## Product rationale

The capture surface must prevent avoidable transcription errors before they
become encrypted evidence. A human should be able to correct the current draft
without waiting for all fields, without editing JSON and without sacrificing
already valid session progress.

## Evidence reviewed

- the interrupted runner and empty T5B session directory;
- D-0023, D-0024 and D-0025;
- the runner's encryption and persistence boundary;
- the manual price and missingness contracts.

## Alternatives rejected

- Save each field for crash recovery: rejected because interrupted partial
  alternatives must never become evidence.
- Coerce numeric refundability into text: rejected because it hides a field
  mapping error.
- Interpret no immediate payment as zero payable at property: rejected because
  it invents an amount not displayed by the source.

## Risks and safeguards

Unsaved draft values are deliberately lost after Ctrl+C. Completed alternatives
and controlled exclusions remain resumable. Numeric-looking condition text is
rejected with a controlled explanation and no private value is logged by the
validator.

## Implementation consequences

Only the evaluation-side runner, its pure field validator, tests and
documentation change. Public runtime, providers, V2, V3 decision semantics,
ranking, weights and Golden admission remain unchanged.

## Validation and rollback

Targeted tests cover mid-entry correction, backward navigation, numeric/text
separation, `UNKNOWN`, current-draft cancellation, confirmation-before-save
and zero partial persistence. The full synthetic DPAPI/AES-GCM dry run and
canonical V2/V3 regressions remain mandatory.

## Supersession

This record refines D-0025. It grants no HTTP, scraping, browser automation,
judgment, V3 execution or Golden admission authority.
