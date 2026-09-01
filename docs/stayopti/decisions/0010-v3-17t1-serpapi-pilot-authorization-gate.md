# D-0010 — Freeze a fail-closed SerpApi twelve-session pilot gate

Date: 2026-09-01
Status: Accepted

## Context and problem

V3-17T conditionally qualified SerpApi Google Hotels as a current public-market
evaluation source. The user then personally created a Free owner account with
API access and reported that signup requested neither VAT information nor a
payment card. A pilot still requires immutable search inputs, a bounded
collector, explicit retention consent and a post-manifest authorization.

## Decision and scope

Freeze twelve independent European search sessions, their dates, occupancy,
budgets, constraints and `no_cache=true` intent under SHA-256
`e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
The collector is evaluation-only, requires a literal containing that hash,
reserves each request before transport, allows only Google Hotels, limits the
run to 48 requests with concurrency one, and performs no automatic retry or
pagination.

T1 ends at `READY_FOR_EXPLICIT_AUTHORIZATION`. It grants neither calls nor
retention. A later user message must repeat the exact literal and explicitly
authorize the proposed retention policy before T2 can start.

## Product rationale

Precommitted context and budgets prevent adapting the sample after results are
seen. The evaluation boundary preserves provider neutrality and makes a real
market snapshot diagnostic evidence rather than a booking provider, objective
best label or automatic Golden case.

## Evidence reviewed

- D-0008 provider-ID-neutral decision ties;
- D-0009 SerpApi evaluation-source qualification;
- V3-17T source qualification and its official evidence register;
- external choice, replay, Golden, blind/deblind and Decision Science contracts;
- Windows PowerShell runner guardrails;
- user-reported account state in the V3-17T1 authorization-gate request.

No website, account, key, `.env` value or provider endpoint was accessed.

## Alternatives rejected

- treating account creation as call authorization;
- accepting generic “proceed” wording;
- materializing dates at execution without a new hash;
- deriving budgets or enrichment targets from attractive results;
- putting the key in command arguments, files, logs or receipts;
- importing the collector into core V3 or provider runtime;
- using provider identity to break enrichment ties;
- retaining raw HTML, images, URLs or responses.

## Risks and safeguards

Dates can expire, account terms can change and raw transport errors can contain
the key-bearing URL. Expiry invalidates the manifest. The future execution
must bind its exact HEAD, use a process-only key, redact before diagnostics,
classify unknown errors locally, and delete the unique temporary directory on
success or abort. A request counts once reserved; retry is zero.

## Implementation consequences

An evaluation-only gate/collector, a non-authorized Node runner, a PowerShell
5.1 secure launcher, deterministic tests and phase documentation are added.
The public runtime, provider registry, V2, V3 core, weights and booking flow
are unchanged.

## Validation and rollback

Acceptance requires targeted V3-17T1 plus all requested V3/V2 and historical
regressions, TypeScript, B1/B2, legacy quarantine, F0B/F0C/F0D, privacy and
license scans, dirty-path identity and both Git diff checks. Rollback requires
a later explicit commit; it cannot silently authorize collection.

## Approver

User-authorized V3-17T1 offline preparation scope. Provider calls remain
unauthorized.

## Supersedes / superseded by

Extends D-0009 with a frozen execution gate and preserves D-0008. It does not
supersede terms/retention limitations or authorize V3-17T2.
