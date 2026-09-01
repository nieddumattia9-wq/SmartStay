# D-0012 — Split the SerpApi pilot into canary and reviewed resume stages

Date: 2026-09-01
Status: Accepted; prospectively supersedes D-0011's MAX48 authorization literal

## Context and problem

T1A made sanitized snapshots and Evidence replayable, but its literal could
authorize all twelve sessions directly. Credit protection and operational
review require a hard stop after one session before the remaining eleven can
be considered.

## Decision and scope

Revoke the unconsumed T1A MAX48 literal. Bind a new Stage A authorization to
the unchanged manifest and a new runner-bundle hash, with one frozen canary
session and a four-call cap. Make Stage B a separate process with an eleven-
session, 44-call cap. It requires a valid canary Evidence ZIP, explicit manual
review and a new literal containing that ZIP's SHA-256. T1B remains offline and
grants neither stage authorization nor retention.

## Product rationale

A small real-market canary can expose schema, freshness, credit or evidence
problems before the rest of the bounded pilot is reachable. A process boundary
and hash-bound resume proof make the pause enforceable rather than advisory.

## Evidence reviewed

- D-0008 provider-ID-neutral decisions;
- D-0009 evaluation-only SerpApi boundary;
- D-0010 immutable twelve-session manifest;
- D-0011 sanitized snapshot and Evidence repair;
- T3 replay-input contract and PowerShell 5.1 guardrails.

## Alternatives rejected

- a runtime flag that can continue from canary into the remaining sessions;
- reusing the MAX48 literal;
- materializing the Stage B literal before canary Evidence exists;
- relying on manual bookkeeping instead of a request ledger;
- retaining raw responses to support resume;
- persisting a key between stages.

## Risks and safeguards

Evidence could be altered, incomplete or replayed against another bundle.
Stage B verifies archive checksums, manifest/bundle/session binding, request
count, T3 snapshot validity, cleanup and scans, then binds a fresh literal to
the ZIP hash. Duplicate, concurrent and out-of-stage requests fail before
transport. Cleanup and abort Evidence cover injected failures.

## Implementation consequences

The evaluation runner gains staged policy, ledger, canary Evidence validation
and separate-process resume. Core V3, V2, providers, public runtime, weights,
thresholds and booking remain unchanged. The twelve-session manifest does not
change.

## Validation and rollback

Acceptance requires the staged and fault-injection suites, all requested
historical regressions, PowerShell parsing, integrity scans and byte-identical
preservation of unrelated dirty paths. Rollback is a later explicit commit;
it must not reactivate either revoked literal.

## Approver

User-authorized V3-17T1B offline gate scope. Provider calls, credentials and
retention remain unauthorized.

## Supersedes / superseded by

Supersedes only D-0011's executable MAX48 authorization path. It preserves the
manifest, retention-v2 contract, Evidence model and evaluation-only boundary.
