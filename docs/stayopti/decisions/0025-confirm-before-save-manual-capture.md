# D-0025 — Confirm-before-save manual capture

Date: 2026-09-03

Status: Accepted usability repair after interrupted real preflight

Approver: Mattia through the V3-17T5B interruption and repair instruction

## Context and problem

During the first real T5B field entry, a URL for one organic result was entered
as the property name and a URL for a different result was entered as its source
URL. The process was interrupted before the category prompt was answered. The
runner had not persisted the incomplete alternative, but the prompt sequence
did not make the same-property constraint sufficiently clear and offered no
field-level review before encryption and save.

## Decision and scope

Every accepted alternative is now assembled only as an in-memory draft. Each
prompt carries the organic position and current property name. The name and URL
prompts explicitly prohibit a link in the name and require the URL of the same
property. A local-only plausibility check rejects detectable disagreement
without resolving or fetching the URL. Before any encryption or progress save,
the runner shows a complete summary and requires `SALVA`; `CORREGGI 1..17`
edits one field and `ANNULLA` discards the unsaved draft.

## Product rationale

Manual evidence cannot be decision-grade when two properties can accidentally
be merged. Confirmation at the persistence boundary is more reliable than
trying to repair encrypted evidence after collection and avoids asking the
user to disclose private capture data in chat.

## Evidence reviewed

- the interrupted T5B process and empty session directory;
- the guided runner persistence boundary;
- D-0023 and D-0024;
- the private AES-256-GCM and CurrentUser-DPAPI evidence store.

## Alternatives rejected

- Persist every answer progressively: rejected because it can create a partial
  or cross-property alternative.
- Validate name/URL over the network: rejected because the capture remains
  manual, offline and free of scraping or browser automation.
- Infer hidden fields: rejected; `UNKNOWN` remains the required representation.

## Risks and safeguards

The local URL-name check is only a plausibility guard and cannot prove semantic
identity. Final human confirmation therefore remains mandatory. Unsaved drafts
are deliberately lost on interruption; completed alternatives and controlled
exclusions retain the existing resumable storage behavior.

## Implementation consequences

Only the evaluation-side manual runner, its pure identity validator, tests and
documentation change. Engine V2, V3 decision semantics, public runtime,
providers, ranking, weights and Golden admission are unchanged.

## Validation and rollback

Targeted tests cover URL-in-name rejection, detectable cross-property mismatch,
field context, category examples, summary confirmation, field correction and
absence of partial persistence. The full synthetic dry run and canonical
regressions remain mandatory. Rollback must not delete any valid private
evidence without separate authorization.

## Supersession

This record refines D-0024's interaction contract. It does not authorize HTTP,
scraping, browser automation, judgment, V3 execution or Golden admission.
