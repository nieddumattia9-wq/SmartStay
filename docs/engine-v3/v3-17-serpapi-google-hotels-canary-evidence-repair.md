# V3-17T2A/T2B — SerpApi canary Evidence audit and offline repair

Date: 2026-09-01

Source checkpoint: `e4edc0cdbf61764a992cc94a882837208e11aa26`

Mode: offline audit and repair; no credentials and no network

## Decision

`V3_17T2A_STATUS=SAFE_HOLD_CANARY_ABORTED`.

The PowerShell handoff completed successfully, but the data canary aborted.
These are separate outcomes:

- `HANDOFF_RESULT=PASS`;
- `CANARY_RESULT=ABORTED`;
- `EVIDENCE_RESULT=PASS`;
- `CURRENT_CANARY_EVIDENCE_ELIGIBLE_FOR_RESUME=NO`;
- `REMAINING_STAGE_AUTHORIZED=NO`.

The prior authorization was consumed by two transmitted requests. This audit
authorizes no retry, continuation, remaining stage, or new provider call.

## Inputs and integrity

The Evidence archive was inspected only outside the repository. Its SHA-256 is
`c01d8ef81d93ebde18d6eb7249827af2b114d68e04904a664f452bda8bd6333e`.
Archive integrity passed and all `17/17` internal checksums matched. The
separate handoff diagnostic SHA-256 is
`c5170157480e1d5d1e9cedfc51ac0904ad9cc202414900b75949a156c0e48d4b`.
Neither artifact, nor any real payload or provider identifier, is copied into
the repository.

The sanitized record establishes:

| Boundary | Result |
|---|---|
| Requests transmitted | 2 |
| Main search | 1, validated |
| Property detail | 1, failed |
| Failure class | `SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE` |
| Alternatives | 29 |
| Sponsored alternatives | 9 |
| Alternatives with observed displayed price | 20 |
| Rating / review count / coordinates | 29 / 29 / 29 |
| Amenities | 28 |
| Raw deletion | 2/2 |
| Snapshot | T3-compatible, `PARTIAL_DIAGNOSTIC_ONLY` |
| Evidence strength | `IMPRESSION_ONLY` |
| Automatic Golden admission | false |

## Property-detail diagnosis

The collector selected the frozen semantic detail candidate at displayed rank
25. Its opaque property token existed only in process memory and was not
persisted. The merge contract accepts a detail object only at `property`,
`properties[0]`, or `ads[0]` and fails closed otherwise.

The raw response was correctly deleted. The old sanitized Evidence does not
retain HTTP status, content type, byte length, top-level response keys,
`search_metadata.status`, or a controlled provider-error classification.
Consequently the precise cause cannot be distinguished among an unexpected
2xx schema, a provider error envelope, a non-object response, or another
contract boundary:

`ROOT_CAUSE=NOT_FULLY_REPRODUCIBLE_WITH_SANITIZED_EVIDENCE`.

For any separately authorized future canary, each response now emits an
allowlisted diagnostic envelope containing only request kind and ordinal,
alternative rank, HTTP status, sanitized media type, response byte length,
sorted safe top-level field names, normalized search status, error-field
presence, controlled error class, and schema-mismatch paths. Raw messages,
tokens, URLs, keys, identifiers, payloads and headers remain prohibited.

## Credential cleanup

The historical `credentialPersisted=false` and
`credentialClearedFromProcess=false` combination was caused by receipt timing:
the postflight receipt was written before the launcher's `finally` cleared the
process variable. The final cleanup path still removed the process value and
zero-freed the BSTR.

The repaired launcher clears the credential immediately after the child
returns and before writing postflight. It then repeats idempotent cleanup in
`finally`. Future success and abort Evidence must consistently record:

- `credentialPersisted=false`;
- `credentialPrinted=false`;
- `credentialClearedFromProcess=true`.

## Handoff, Evidence and resume semantics

The handoff now prints independent `HANDOFF_RESULT`, `CANARY_RESULT` and
`EVIDENCE_RESULT` fields. A sanitized, validated abort ZIP therefore remains a
successful handoff and valid Evidence, without being misreported as a canary
PASS.

The resume validator accepts only a `COMPLETED` canary with null failure,
`COMPLETED` session status, validated request ledger, `excludedFromRemaining`
true, verified credential cleanup, valid response diagnostics and at most two
requests. The historical ZIP is rejected because its pilot summary is
`ABORTED`, its session is `PARTIAL`, its failure is non-null,
`excludedFromRemaining=false`, and its old postflight cleanup flag is false.

## Observed display-price semantics

The Google Hotels response showed a nightly, total-stay and before-tax price
for 20 alternatives; nine sponsored alternatives had no displayed price. The
external contract correctly leaves exact price and price bucket unknown for
all 29 alternatives.

The evaluation boundary now preserves the available signal as
`OBSERVED_AGGREGATED_DISPLAY_PRICE` with currency, separate nightly/total and
before-tax values, provenance and explicit reliability. It is always marked
`exactBookable=false` and `sellerSpecific=false`. Missing prices remain
unknown. Provider-neutral replay carries this wrapper without changing V3
ranking, weights, roles, or decision identity.

## Repaired future canary gate

The immutable 12-session manifest remains
`e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
The historical canary consumed two calls. A future attempt, if explicitly
authorized later, is reduced to:

- first frozen session only;
- one main search and at most one sequential property detail;
- absolute cap 2;
- concurrency 1, retry 0, pagination 0, unconditional autostop;
- sanitized abort/pass Evidence with delete-always raw handling.

Runner bundle:
`f4649a0229b60e18908a09f5cf580bbf8e0648cadf987e0b442c6ce225e52e13`.

Required future literal:
`AUTHORIZE_V3_17T2_CANARY_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_f4649a0229b60e18908a09f5cf580bbf8e0648cadf987e0b442c6ce225e52e13_RETENTION_V2_MAX2`.

This document does not grant that authorization. Stage REMAINING remains
unreachable and requires a separate PASS Evidence ZIP, manual review and new
authorization.

## Product boundary

The snapshot remains external observational evidence, not a real Golden case,
booking outcome, market-frequency estimate, optimum claim or public-runtime
input. V3 weights and Engine V2 are unchanged; V3-17 is not met and V3-18
remains blocked.
