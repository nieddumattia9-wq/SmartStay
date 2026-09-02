# D-0024 — Guided manual-market canary interface

Date: 2026-09-02

Status: Accepted offline usability repair; no real observation is committed

Approver: Mattia through the V3-17T5B instruction

## Context and problem

D-0023 established the correct manual Decision Golden boundary, but its first
local surface required direct JSON editing and separate technical handling of
private proof. That surface was not suitable for a real human canary under the
T5B usability gate.

## Decision and scope

The active T5B surface is a guided Italian local process with an immutable
Florence scenario, exactly five accepted alternatives, controlled exclusion
reasons, progressive save/resume, correction before finalization and a native
private-file selector. Real names, URLs and selected files are encrypted
immediately outside the repository. The JSON editor remains historical test
plumbing and is not the operational canary interface.

## Product rationale

Manual evidence is useful only if a careful evaluator can collect it without
editing implementation formats or accidentally leaking private provenance.
The guided process reduces transcription and selection risk while preserving
the strict separation between audit evidence, provider-neutral decision input
and blind judgment.

## Evidence reviewed

- D-0023 and the T5A capture contract;
- the T5B usability requirements and frozen Florence scenario;
- the existing AES-256-GCM/CurrentUser-DPAPI private quarantine;
- Golden, blind-capsule, provider-neutral identity and Evidence boundaries.

## Alternatives rejected

- Continue with the JSON editor: rejected as too technical and fragile.
- Automate Booking.com: rejected because scraping and browser automation are
  outside authority and unnecessary.
- Store screenshots or URLs in the draft: rejected because private evidence
  must be encrypted at rest.
- Run V3 or the blind judgment during capture: rejected to preserve blinding.

## Risks and safeguards

- Interruption: the sanitized progress state is written after each result and
  automatically resumed.
- Cherry-picking: rejected organic results receive controlled reasons and the
  next source position is preserved privately.
- Private leakage: real identity and proof are encrypted; shared Evidence is
  recursively scanned before creation.
- Overclaim: public pre-checkout prices remain non-exact and unbooked.
- Premature promotion: automatic Golden admission remains impossible.

## Implementation consequences

An evaluation-only Node runner and PowerShell launcher/helpers are added. The
canonical manual contract gains explicit meal-plan and refundability evidence.
Engine V2, V3 core, public runtime, provider registry, ranking and weights are
unchanged.

## Validation and rollback

The synthetic dry run must cover save/resume, DPAPI/AES-GCM encryption,
tamper detection, snapshot, capsule, sanitized ZIP and cleanup before the real
window is opened. Rollback removes only T5B evaluation-side artifacts; it does
not alter captured private evidence without separate authorization.

## Supersession

This record operationally refines D-0023 for the first canary. It does not
authorize network automation, create a judgment or admit a Golden case.
