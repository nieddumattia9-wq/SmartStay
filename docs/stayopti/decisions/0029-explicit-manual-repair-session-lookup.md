# D-0029 — Bind manual repair to an explicit session identity

Date: 2026-09-04

## Context and problem

The first invocation of `repair-export` reported that its state file was not
found. Read-only inspection subsequently found the completed five-alternative
state at the canonical CurrentUser private root, with the expected state
version, filename and embedded session identity. The collection and repair
paths are compatible, so the private state is not missing and must not be
reconstructed from the sanitized ZIP.

The repair runner selected a hardcoded session constant rather than receiving
the intended identity from the launcher. The launcher also combined a
case-insensitive mode allowlist with case-sensitive comparisons when deciding
whether to use the real private root or a synthetic temporary root. The exact
failed process environment is no longer observable, but the lookup contract
was ambiguous and its failure message did not distinguish these cases.

## Decision and scope

Require the caller to provide the repair session identity explicitly. The
PowerShell launcher validates a local T5B identifier, forwards it as a distinct
Node argument and uses case-insensitive mode routing. The Node runner validates
the identity again, resolves only that child directory and requires the loaded
state's identity to match exactly.

There is no directory scan, newest-session heuristic, alias, fallback or ZIP
reconstruction. Capture mode retains its frozen session identity; only the
offline repair lookup becomes caller-bound.

## Product rationale

Repairing the wrong private session would be worse than stopping. An explicit
identity makes the user-visible command, filesystem lookup and state contract
agree, while preserving the existing evidence and avoiding re-entry of five
alternatives.

## Evidence reviewed

- canonical private root resolved identically from `.NET` and `LOCALAPPDATA`;
- one `_002` state at the expected technical path;
- five alternatives, finalized diagnostic lifecycle, zero network calls and
  zero loaded credentials;
- identical root, filename and state version between the original collection
  and repair code;
- fifteen encrypted evidence files kept separately under the same private
  custody root;
- no plaintext, hotel name, URL or evidence content inspected.

## Alternatives rejected

- Continue relying on a hardcoded identity: ambiguous and not auditable from
  the invocation.
- Select the newest directory: nondeterministic and unsafe.
- Search every state and choose one with five alternatives: could repair the
  wrong session.
- Reconstruct state from the sanitized ZIP: shared Evidence intentionally lacks
  private identity/proof and is not the authoritative mutable state.

## Risks and safeguards

Session IDs are restricted to the local T5B identifier grammar, preventing path
traversal. Missing, malformed, nonexistent and mismatched identities fail
closed. No private values are logged. Synthetic tests use sibling session
directories to prove exact selection and absence of implicit fallback.

## Implementation consequences

`repair-export` requires `-SessionId` in PowerShell and `--session-id` in Node.
Other modes reject this parameter. Mode comparisons used for private-root
selection are case-insensitive. No evidence schema, public runtime, ranking,
provider, browser or network behavior changes.

## Validation and rollback

Run targeted T5B tests, the synthetic repair/export regression, PowerShell 5.1
parse, TypeScript compilation, canonical Engine V2/V3 suites, leak scans and Git
diff checks. Rollback is forward-only; never mutate the private session to undo
runner code.

## Approver

User instruction dated 2026-09-04.

## Supersedes / superseded by

Extends D-0028's correction-only export boundary. It does not supersede the
diagnostic classification or non-admission rules.
