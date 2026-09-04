# D-0030 — Require runtime-identical preflight for manual repair lookup

Date: 2026-09-04

## Context and problem

The explicit-session repair introduced by D-0029 still reported
`MANUAL_CAPTURE_REPAIR_SESSION_NOT_FOUND` when the user invoked the exact
PowerShell command. D-0029 therefore did not repair the real execution path.
Its positive `EXPECTED_LOOKUP=ACTUAL_LOOKUP` evidence came from an independent
PowerShell filesystem probe, not from the child Node process and lookup used by
`repair-export`.

The old runtime reduced lookup diagnosis to one `existsSync` branch. It did not
record the received Node arguments, parsed identity, effective CurrentUser
root, resolved state path, file type or read access. Consequently the exact
historical divergent path cannot be reconstructed after that process exited;
claiming a particular alternate directory would be speculation.

## Decision and scope

Use one `inspectRepairSession` function for both `repair-export` and a new
read-only `repair-preflight` mode. The function resolves the requested identity
once and reports only sanitized technical metadata. It distinguishes missing,
stat failure, non-file, unreadable, read failure, JSON failure, schema failure,
identity mismatch and concurrent state change.

The PowerShell launcher forwards its version, private root and explicit session
identity to the Node process. A synthetic end-to-end regression starts the real
PowerShell launcher as a child process and verifies the same resolver without
mutating the controlled state. Diagnostic-root injection is permitted only for
that read-only preflight, only below the operating-system temporary directory
and only with a dedicated synthetic prefix.

## Product rationale

A repair tool must prove that its own runtime can find and validate the exact
private state before asking the user to edit it. A parallel probe can establish
filesystem existence but cannot establish launcher-to-parser-to-resolver
equivalence. Fail-closed error classes also prevent a malformed or unreadable
state from being mislabeled as absent.

## Evidence reviewed

- the exact D-0029 launcher and Node argument parsing;
- the canonical CurrentUser private root and exact `_002` state path;
- sanitized state metadata only: supported version, matching identity, five
  alternatives, zero network calls and zero loaded credentials;
- a Windows PowerShell 5.1 end-to-end synthetic child-process test;
- a real read-only `repair-preflight` through the launcher path.

The real preflight reports matching session identity, an existing regular and
readable state file, parseable supported schema, five alternatives and no state
mutation. No hotel name, URL, proof content or encrypted payload was printed or
changed.

## Alternatives rejected

- Treat the independent PowerShell probe as runtime proof: it does not execute
  Node argument parsing or the repair resolver.
- Retry the unchanged D-0029 launcher: the user already demonstrated that it
  fails and it would add no causal evidence.
- Search or select another session heuristically: unsafe and ambiguous.
- Reconstruct the private state from shared Evidence: the shared archive is not
  an authoritative mutable source.

## Risks and safeguards

Diagnostics expose only technical arguments, local paths, booleans, a supported
schema result and alternative count. They never print state content. Repair
still requires an exact local session grammar and embedded identity match.
Preflight rereads the file and reports failure if it changes during inspection.
The real session remains read-only until the user separately starts and confirms
a correction.

## Implementation consequences

`repair-preflight` is a non-interactive, non-mutating launcher mode. Actual
`repair-export` uses the same resolver and emits its sanitized diagnostic before
a fail-closed lookup error. No collection, evidence, provider, browser, public
runtime, V3 decision, judgment, deblind or Golden-admission behavior changes.

## Validation and rollback

Run targeted T5B tests, the real PowerShell child-process regression,
PowerShell 5.1 parse, TypeScript compilation, canonical Engine V2/V3 suites,
leak scans and Git diff checks. Rollback is forward-only and must not alter the
private session.

## Approver

User instruction dated 2026-09-04.

## Supersedes / superseded by

Supersedes D-0029's claim that explicit session forwarding alone repaired the
operational lookup. D-0029's prohibition on heuristics, ZIP reconstruction and
implicit session selection remains in force.
