# V3-17T1B — SerpApi staged canary and resumable pilot gate

Date: 2026-09-01

Source checkpoint: `4986771e17e9ba9c5649c2b4732d9a25dcccc991`

Status: `PASS_READY_FOR_CANARY_REAUTHORIZATION`

## Scope and preserved baseline

This phase is offline. It does not load credentials, call SerpApi or Google
Hotels, authorize retention, collect a real session, or admit a Golden case.
The immutable pilot remains
`V3_17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_PILOT_001` with manifest SHA-256
`e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
Its ordering, inputs, dates, budgets and twelve sessions are unchanged.

The prior T1A MAX48 literal is revoked without consumption:

`AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_67cfd073efbc3177590c9a05feafb1612cc09c359421791414a3c5fadd901cd6_RETENTION_V2_MAX48`

It cannot authorize either new stage.

## Frozen staged execution

The executable bundle is SHA-256
`c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01`.
The hash covers the Node runner, PowerShell launcher, gate and immutable
manifest, collector, adapter, retention and Evidence contracts, T3 validator,
stage/resume policy and request-ledger policy. The embedded hash value is
elided when hashing, so modifying any covered semantics invalidates the
literal without creating a self-reference.

### Stage A — `CANARY`

- exactly the first frozen manifest session, index `0`,
  `SERP_PILOT_01_FLORENCE_COUPLE_BALANCED`;
- one main Google Hotels search and at most three sequential property details;
- absolute cap four, concurrency one, retry zero and pagination zero;
- search snapshot must be exported, reread and T3-validated before detail 1;
- each detail is validated and its raw state deleted before the next detail;
- first failure stops all later requests and produces sanitized abort Evidence;
- completion always stops the process and records
  `remainingStageNotStarted=true`.

The only authorization string prepared by T1B is:

`AUTHORIZE_V3_17T2_CANARY_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01_RETENTION_V2_MAX4`

It is published but not granted. The current phase does not provide an
operational network command.

### Stage B — `REMAINING_11`

Stage B is a separate process over manifest indices 1–11, capped at 44 calls.
It cannot be reached by Stage A. Before key access or transport it requires:

- the canary Evidence ZIP path supplied explicitly;
- safe extraction into a new temporary directory;
- checksum, entry allowlist and archive roundtrip validation;
- matching pilot, manifest and runner-bundle hashes;
- canary stage `PASS`, request count 1–4 and the frozen canary session;
- complete T3-compatible canary snapshot;
- verified raw deletion, secret scan and raw-ID/token scan;
- `remainingStageNotStarted=true`;
- explicit manual-review confirmation.

Only after those checks may a later process calculate the canary ZIP SHA-256.
The Stage B literal is therefore not materialized in T1B. It must bind that
ZIP hash, `REMAINING_11` and `MAX44`, and needs a separate user authorization.
The API key must be supplied again in memory for that later process.

## Request ledger and fail-closed behavior

Every potential transmission is reserved before transport in a ledger bound
to pilot, manifest, bundle, stage, canonical session and request ordinal. Its
states are `PLANNED`, `TRANSMITTED`, `VALIDATED` and `FAILED`. It contains only
sanitized response fingerprints and cleanup/export flags; it excludes API
keys, sensitive URLs, property tokens, provider IDs and raw payloads.

The ledger blocks stage/session mismatch, request 5 or 45, duplicate requests
and concurrent requests before transport. Errors in HTTP, parsing,
normalization, export, reread or detail processing stop the stage. Raw payload
cleanup is always attempted; no retry, replacement session or continuation is
available.

## Canary Evidence contract

A canary ZIP is autonomous and sanitized. It includes the verifiable manifest
projection, stage and canary declarations, authorization receipt, ledger,
complete normalized snapshot, summary, deletion receipts, schema validation,
scan results, checksums and pre/postflight receipts. The validator rejects a
missing or altered entry, invalid checksum, wrong hash/session/stage, non-PASS
canary, request count outside 1–4, incomplete cleanup, unsafe field or
non-T3-compatible snapshot.

Raw JSON remains in a unique `%TEMP%` directory only until validation and is
deleted on success and abort. No HTML, images, API key, token-bearing URL or
opaque provider identifier is admitted to Evidence.

## Security and product boundary

The PowerShell 5.1 launcher performs the complete offline preflight before
`Read-Host -AsSecureString`. A later authorized invocation passes the key only
through the child process environment, clears it in `finally` and releases the
unmanaged conversion buffer. Stage A and B each require a fresh prompt.

The collector remains under `src/engine-v3/evaluation`. SerpApi is not added to
the provider registry or public runtime. No core weight, ranking, role,
robustness, regret or booking behavior changes. Any future snapshot remains a
real-market candidate, not an automatically admitted Golden case.

## Validation evidence

Targeted staged tests cover the thirty required control assertions, three
additional hard-limit assertions and eleven fault-injection boundaries:
`44/44 PASS`. T1A is `44/44`, T1 is `38/38`, the selected T and
provider-neutral/B1/B2/legacy regressions are `48/48`, and Engine V3 is
`1154/1154`; Engine V2 is `196/196`. TypeScript, PowerShell 5.1 parsing,
F0B/F0C/F0D, security, license/provenance and Git integrity gates pass. The
final checkpoint is recorded in `CURRENT_STATE.md` and the phase receipt.

## Decision

T1B prepares Stage A only. No call or retention authorization is inferred.
After all offline gates pass, the next phase is
`V3-17T2_SERPAPI_GOOGLE_HOTELS_ONE_SESSION_CANARY_REAUTHORIZATION`. A successful
canary still does not authorize Stage B; it only permits manual Evidence and
credit review followed by a separately hash-bound authorization gate.

## Prospective T1C operational supersession

The first user-operated handoff did not reach its key prompt and consumed no
authorization. V3-17T1C preserves this result, replaces only the fragile pasted
wrapper/launcher mechanics, and revokes the unconsumed `c412...MAX4` literal
because covered files changed. The immutable manifest, four-call Stage A,
separate Stage B and all Evidence requirements in this document remain in
force. See `v3-17-serpapi-google-hotels-canary-handoff-repair.md` and D-0013.
