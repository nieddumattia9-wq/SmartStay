# D-0017 — Bind SerpApi authorization to source and execution HEAD separately

- Date: 2026-09-02
- Status: Accepted; final literal remains unaccepted and calls unauthorized
- Approver: Mattia, through the V3-17T2C-PREFLIGHT instruction
- Supersedes: the unaccepted ambiguous T2B literal only

## Context and problem

The T2B authorization string labelled the T2A source checkpoint as `HEAD`.
The executable runner separately checked the current Git HEAD and bundle, but
the user-visible literal did not name the exact execution commit. Multiple
commits directly based on the same source could therefore satisfy the ancestry
shape while sharing the same bundle.

## Decision and scope

Authorization now distinguishes immutable `SOURCE_SHA` from dynamic
`EXECUTION_HEAD`. The exact execution HEAD is read from Git and must be present
in the accepted literal. Handoff, Node runner and collector independently
verify the same value before transport. The literal is generated only after the
implementation commit, avoiding a commit-hash self-reference in bundled files.

## Product rationale

Paid real-market evidence collection must be attributable to one reviewable
code checkpoint. Bundle integrity protects executable bytes; execution-head
binding protects the repository state from which those bytes are invoked.

## Evidence reviewed

- T2B gate commit and parent relation;
- normalized runner-bundle implementation;
- PowerShell handoff checkpoint rules;
- Node runner preflight ordering;
- collector authorization boundary;
- immutable twelve-session manifest.

## Alternatives rejected

- accepting the ambiguous T2B literal: rejected because its `HEAD` label was
  the source rather than the executable commit;
- hard-coding the final commit in bundled source: rejected because it creates
  a circular commit/hash dependency;
- relying on bundle hash alone: rejected because non-bundle commit state would
  remain unnamed by the authorization.

## Risks and safeguards

The exact literal is not stable across execution commits by design. Any HEAD,
manifest or bundle mismatch fails before credential access and network. The
seven pre-existing dirty paths remain an exact allowlist with content hashes.

## Implementation consequences

Only evaluation-side authorization, private runner/handoff, tests and
documentation change. MAX2, encrypted quarantine, Engine V2, V3 decision core,
provider runtime, ranking, UI and booking remain unchanged.

## Validation and rollback

Validation covers prior/successor HEAD rejection, altered manifest and bundle,
dirty-state rejection, T2B/T2A regressions, full engines, PowerShell parsing and
security scans. Reverting this commit restores the ambiguous literal, which is
explicitly invalidated and must not be used.
