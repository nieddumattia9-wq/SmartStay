# V3-17T2A-R0 — SerpApi canary reconciliation, private raw quarantine and replay repair

Date: 2026-09-01

Adopted source checkpoint: `0c052ad1efd579fc6d7ff5a16d7e0bfd8f1d3154`

Mode: offline implementation and audit; zero credentials, provider calls and HTTP

## Checkpoint reconciliation

The previously expected `e4edc0cdbf61764a992cc94a882837208e11aa26`
is the sole parent of `0c052ad1efd579fc6d7ff5a16d7e0bfd8f1d3154`.
The successor is a non-merge commit named
`fix(engine-v3): repair SerpApi canary evidence gate`. Its 19 paths are
limited to evaluation-side SerpApi contracts, offline runners, tests and
append-only documentation. The complete diff contains no credential, raw
provider response, real dataset, `.env`, package/lockfile or public-runtime
change. It is accepted as the T2A-R0 source.

The seven unrelated dirty paths were fingerprinted before work and remain out
of this change.

## Historical canary audit

The existing Evidence ZIP was re-read offline and remains immutable.

| Item | Verified result |
|---|---|
| ZIP SHA-256 | `c01d8ef81d93ebde18d6eb7249827af2b114d68e04904a664f452bda8bd6333e` |
| Diagnostic SHA-256 | `c5170157480e1d5d1e9cedfc51ac0904ad9cc202414900b75949a156c0e48d4b` |
| Archive entries | 18 |
| Internal checksums | 17/17 PASS |
| Handoff | PASS |
| Canary / collection | ABORTED / PARTIAL |
| Requests | 2: one main search and one property detail |
| Failure | `SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE` |
| Main alternatives | 29 |
| Sponsored | 9 |
| Observed displayed total prices | 20 |
| Rating / review / coordinate coverage | 29 / 29 / 29 |
| Amenities coverage | 28 |
| Raw deletion receipts | 2/2 |

The partial snapshot remains T3-compatible diagnostic evidence. It is
`IMPRESSION_ONLY`, never booking evidence, never an exact bookable-price claim
and never automatically Golden. The deleted detail raw cannot be recovered;
the precise historic detail shape remains unprovable.

## Private quarantine contract

Future authorized provider responses are captured behind the evaluation
boundary before JSON parsing. Stable persistence is allowed only as a
`stayopti.v3.provider-raw-quarantine@1` encrypted envelope under:

`%LOCALAPPDATA%\StayOpti\private-evidence\provider-raw-quarantine`

The archive uses:

- a fresh 256-bit key and 96-bit IV for every payload;
- AES-256-GCM authenticated encryption;
- canonical authenticated metadata covering controlled provider/endpoint,
  local session reference, request kind/ordinal, capture time, expiry,
  disposition, plaintext SHA-256 and protected key;
- Windows CurrentUser DPAPI protection for every data key;
- exclusive atomic envelope writes outside the repository;
- no API key, authorization header, secret, sensitive URL or plaintext JSON at
  rest.

The DPAPI bridge uses Windows PowerShell 5.1 and process stdin/stdout only. A
synthetic, escalated local roundtrip verified CurrentUser DPAPI on this PC. No
credential or provider data was involved.

## Retention and purge

| Disposition | Default retention |
|---|---:|
| Successfully processed raw | 14 days |
| Unrecognized, partial or error raw | 90 days |

A manual pre-expiry extension adds exactly 90 days and emits an allowlisted
reason receipt. Extension re-encrypts the payload and rebinds the new expiry
under AES-GCM; it is not a mutable unauthenticated metadata edit. Expiry audit
is deterministic and the private store removes expired encrypted envelopes.
Permanent retention is prohibited.

## Offline replay

The provider-neutral quarantine contract owns encryption, integrity,
retention and purge. The SerpApi-specific replay remains in the evaluation
adapter boundary. It:

1. validates the envelope fingerprint and DPAPI key-protection class;
2. authenticates AES-GCM metadata and ciphertext;
3. checks the original plaintext SHA-256;
4. decrypts only in process memory;
5. uses the same sanitized snapshot/adapter path as collection;
6. records parser version, schema fingerprint and safe unknown field names;
7. creates no plaintext replay file and performs no network or credential
   access.

Parser failure never deletes the encrypted envelope. Provider tokens and raw
identifiers may exist only inside ciphertext; they do not survive the
sanitized snapshot or influence V3 decisions.

## Artifact separation

- Private quarantine: encrypted raw only, local and expiring, never shared.
- Evidence ZIP: sanitized snapshot, manifest, ledger, hashes, scans and
  receipts; no ciphertext, raw, key or token.
- Repository: contracts, runners, tests, synthetic fixtures and docs only.

The collector still deletes every ephemeral plaintext copy in `finally`.
Successful processing shortens the initially fail-safe 90-day encrypted entry
to 14 days; parse/normalization/detail failures retain the 90-day class.

## Future gate

The immutable pilot manifest remains
`e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
The repaired bundle is
`e48525178e847c30e0c597ab67671327d5f972763b00882f33fdef111365ddde`.

Any later canary requires the exact new MAX2 literal produced from that bundle,
one search plus at most one sequential detail, encrypted quarantine ready
before network, retry/pagination zero, concurrency one and unconditional stop.
This phase grants no network authorization and does not execute that canary.

Offline validation after recovery from an interrupted run completed with
targeted/fault-injection coverage `167/167`, Engine V3 `1233/1233`, Engine V2
`196/196`, TypeScript and PowerShell 5.1 parsing all PASS. Static security and
provenance scans found only documented authorization literals and synthetic
test identifiers; no secret, real provider payload or redistributable dataset
is present.

Next recommendation:
`V3-17T2B_SERPAPI_PROPERTY_DETAIL_MAX2_REAUTHORIZATION_GATE`.
