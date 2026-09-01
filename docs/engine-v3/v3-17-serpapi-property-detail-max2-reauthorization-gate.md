# V3-17T2B — SerpApi property-detail MAX2 reauthorization gate

Status: `READY_FOR_EXPLICIT_MAX2_AUTHORIZATION`

Source checkpoint: `ed2633c1fc700a9d9199ce920b826d2909543ab8`
Frozen pilot manifest: `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`
Runner bundle: `891a8c2cbf564ab433ec6553f3dffe880981137797fda9ed3fbb513a5d3e7f9c`

## Decision

T2B prepares one future, independently authorized canary invocation. It does
not execute it and grants no network authority. The canary is limited in code
to one frozen session, one Google Hotels main search and at most one property
detail: two transmitted requests in total, concurrency one, zero retry, zero
pagination and unconditional autostop. Stage `REMAINING_11` is not authorized
by this gate.

The immutable twelve-session manifest and its hash are unchanged. The prior
T2A runner literal is explicitly revoked and remains unconsumed. Any code or
policy change changes the normalized runner-bundle hash, therefore invalidating
the literal below.

## Exact unaccepted authorization literal

`AUTHORIZE_V3_17T2B_MAX2_HEAD_ed2633c1fc700a9d9199ce920b826d2909543ab8_MANIFEST_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_891a8c2cbf564ab433ec6553f3dffe880981137797fda9ed3fbb513a5d3e7f9c_MAIN1_DETAIL1_SESSIONS1_CONCURRENCY1_RETRIES0_PAGINATION0_QUARANTINE_AES256GCM_DPAPI_CURRENTUSER_AUTOSTOP_REMAINING_NO`

The literal is generated for later user review only. `AUTHORIZATION_LITERAL_ACCEPTED=NO`
and `NEW_NETWORK_AUTHORIZATION_GRANTED=NO` remain mandatory in T2B.

T2C-PREFLIGHT subsequently found that the `HEAD_` label above referred to the
T2A source rather than the execution commit. This literal was never accepted or
consumed and is now explicitly invalidated. It must not authorize a canary.

## Fail-closed request flow

1. Reserve the main-search request atomically in the stage ledger.
2. Transmit at most one main search for frozen session index `0`.
3. Persist provider raw only after secret redaction and AES-256-GCM encryption,
   with its data key protected by Windows CurrentUser DPAPI outside the
   repository.
4. Validate, normalize, export and reread the provider-neutral snapshot.
5. Only a ledger state of validated main search permits one property detail.
6. Validate the detail before completing the canary; any failure stops
   immediately and no other request is reachable.
7. Produce sanitized Evidence separately from the private raw quarantine and
   autostop.

The request ledger rejects a second main search, a detail before a validated
main search, a second detail, a second session, concurrent work and a third
request before transport.

## Private raw quarantine

Stable raw retention is permitted only in the private directory rooted under
`%LOCALAPPDATA%\StayOpti\private-evidence`, never in Git or the Evidence ZIP.
Each response is encrypted independently using AES-256-GCM before stable
persistence. The random data key is protected with Windows CurrentUser DPAPI;
authenticated metadata includes the controlled request kind, ordinal,
timestamp, disposition, expiry and integrity fingerprints. It excludes API
keys, authorization headers, property tokens, raw provider identifiers, URLs,
query strings and payload plaintext.

- successfully processed raw: 14 days;
- failed, partial or unrecognized raw: 90 days;
- offline replay: decrypt in memory, verify envelope/AES/hash integrity, then
  feed only the evaluation adapter;
- automatic Golden admission: prohibited;
- Evidence ZIP inclusion: prohibited.

The property token is transient in-process transport material only. It is not
part of quarantine metadata, Evidence, receipts, console output or repository
state.

## Sanitized diagnostic envelope

On a property-detail failure the durable diagnostic envelope contains only:
HTTP status, sanitized content type, response byte length, safe top-level field
names, controlled `search_metadata.status`, presence of an error field,
allowlisted error class, schema-mismatch paths, request kind and alternative
rank. Provider messages, token values, complete URLs and raw content are not
retained in this envelope.

## Outcome semantics

The handoff, data canary, collection and Evidence are separate facts:

- `HANDOFF_STATUS=PASS|FAIL` reports launcher/preflight execution only;
- `CANARY_STATUS=PASS|ABORTED|FAIL` reports the bounded data canary;
- `COLLECTION_STATUS=COMPLETE|PARTIAL|FAIL` reports usable collection scope;
- `EVIDENCE_STATUS=PASS|FAIL` reports sanitized archive integrity.

A detail failure therefore means `CANARY_STATUS=ABORTED` and
`COLLECTION_STATUS=PARTIAL`, even when the handoff and Evidence are valid. It
never unlocks Stage `REMAINING_11` or admits Golden data.

## Price semantics

Google Hotels display prices remain
`OBSERVED_AGGREGATED_DISPLAY_PRICE`. The normalized representation preserves
value, currency, nightly/total distinction, before-tax state, provenance,
missingness and reliability. It always keeps `exactBookable=false` and
`sellerSpecific=false`; it is not promoted to a checkout total.

## Scope and current state

T2B used no API key, SerpApi call, provider call or HTTP request. It did not
execute a canary, modify the frozen manifest, touch the public runtime or admit
Golden cases. V3-17 remains unmet and V3-18 remains blocked.

Next recommendation:
`V3-17T2C_SERPAPI_GOOGLE_HOTELS_MAX2_CANARY_EXPLICIT_AUTHORIZATION_GATE`.
