# V3-17T1A — SerpApi pilot sanitized snapshot and Evidence ZIP repair

Date: 2026-09-01
Source checkpoint: `ecdeda1edc3dc88044c59ac39807a30e478f215e`
Execution mode: offline only

## Decision

The T2 preflight correctly stopped before credentials and network because the
T1 runner could emit only snapshot fingerprints: it could neither persist a
replayable normalized snapshot nor create and validate the required Evidence
ZIP, and its live transport rejected property-detail execution. The previous
literal is therefore revoked as `REVOKED_AFTER_RUNNER_BUNDLE_CHANGE`. It was
not consumed; SerpApi and HTTP counts remain zero.

The frozen pilot manifest is unchanged:

- pilot ID: `V3_17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_PILOT_001`;
- manifest SHA-256: `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`;
- twelve sessions, maximum 48 calls, maximum three details per session;
- concurrency one, retry zero, no automatic pagination, `no_cache=true`.

## Repaired output boundary

For every future successful response the collector writes raw JSON only to a
unique `%TEMP%` directory, hashes it, normalizes through the existing
evaluation adapter, sanitizes and validates the complete choice-set snapshot,
writes the snapshot atomically, rereads and validates the exported bytes, and
only then deletes the raw file and verifies absence. Every created raw file is
also deleted on export, merge, validation, transport or abort failure.

The snapshot schema is
`stayopti.v3.serpapi-google-hotels-sanitized-snapshot@1`. It preserves session
context, the full visible choice set, price semantics, evidence, missingness,
bias flags and detail status. Pilot-local alternative pseudonyms are derived
from a one-way session hash plus displayed rank. Property tokens, source IDs,
sensitive URLs, raw fragments and commercial identifiers are not exported and
cannot enter decisions.

Property details now use the already frozen semantic selector and execute at
most three times per session. Selection excludes property token and opaque
identity. A detail fills only missing fields, retains the main-search hotel and
rank, and cannot replace a more reliable main value. A detail failure is
recorded as sanitized partial evidence and aborts without retry.

## Evidence bundle

The PowerShell 5.1 launcher creates staging and verification directories under
`%TEMP%`, outside the repository. After the child has ended it clears the
process credential and unmanaged conversion memory, writes postflight state,
finalizes scans and checksums, creates one ZIP, enumerates and checks entries,
extracts into a second unique directory, invokes the T3 validator, calculates
the final ZIP SHA-256, and deletes both temporary directories. The ZIP is
created on complete or sanitized partial execution and never contains raw
payloads.

The allowlist includes the frozen manifest, authorization receipt, sanitized
request ledger, pilot and session summaries, available session snapshots, raw
deletion receipts, credential-redaction receipt, scans, tests, preflight,
postflight and checksums. Absolute paths, traversal, links, hidden/unexpected
files, sensitive query URLs, secrets and raw provider identifiers fail closed.

The T3 contract version is
`stayopti.v3.serpapi-google-hotels-t3-input@1`. A complete bundle requires all
twelve valid snapshots. A partial/aborted bundle may contain fewer snapshots
and remains structurally valid only when its partial state, hashes and deletion
evidence are coherent. Neither class admits a Golden case automatically.

## Authorization binding

Runner bundle SHA-256:
`67cfd073efbc3177590c9a05feafb1612cc09c359421791414a3c5fadd901cd6`.

The bundle covers the Node runner, PowerShell launcher, pilot gate, SerpApi
evaluation adapter, collector, frozen manifest/retention policy, snapshot
schema and ZIP/T3 validator. The embedded hash field is normalized before
calculation, so the result is reproducible without a self-reference cycle.

Revoked literal:

```text
AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_MAX48
```

New required literal:

```text
AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_67cfd073efbc3177590c9a05feafb1612cc09c359421791414a3c5fadd901cd6_RETENTION_V2_MAX48
```

The retention policy version is
`stayopti.v3.serpapi-google-hotels-retention@2`. This phase grants neither the
new call authorization nor retention. A later user message must contain the
exact new literal and explicitly authorize this retention version.

## Validation and limits

Synthetic fixtures cover complete and partial choice sets, sponsored entries,
nightly/total prices, partial taxes, reviews, missing amenities and
cancellation, coordinates, multiple sellers, detail merge and a detail error.
The targeted suite includes raw lifecycle, full choice-set export, detail caps,
identity neutrality, ZIP allowlist/path/checksum/security failures, a real
PowerShell ZIP round-trip, corrupted-container rejection and old-literal
revocation. No test performs network I/O.

No real session, Golden candidate, Golden case or judgment is collected.
V3-17 remains unmet, V3-18 remains blocked, and public V2/V3 runtime, weights,
providers and booking flows remain unchanged.

Next recommendation:
`V3-17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_BOUNDED_PILOT_REAUTHORIZATION`.
