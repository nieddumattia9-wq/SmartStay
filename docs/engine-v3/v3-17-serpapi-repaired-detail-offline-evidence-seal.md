# V3-17T2E — SerpApi repaired property-detail offline evidence seal

## Decision boundary

V3-17T2E seals an offline replay of the already captured and encrypted
SerpApi canary material. It does not execute or authorize a new request. The
original live outcome remains immutable:

- `LIVE_CANARY_STATUS=ABORTED`;
- `LIVE_COLLECTION_STATUS=PARTIAL`;
- `LIVE_EVIDENCE_STATUS=PASS`;
- two requests were transmitted in the historical canary;
- the main search passed and the property-detail processing failed.

The offline result is separately recorded as `OFFLINE_REPLAY_STATUS=PASS`.
That result means the same authenticated encrypted inputs can be replayed by
the repaired evaluation parser. It does not retroactively make the live
canary pass, admit a Golden case, authorize Stage REMAINING, or authorize any
provider call.

## Bound provenance

The seal contract is
`stayopti.v3.serpapi-repaired-detail-offline-evidence-seal@1`. It binds:

- repair/source commit
  `2ec5cdaf314b363e2b48dbf856badd9c78591f66` and parent
  `5c4f2b36568fa825599a62f25e2d2c18b52fb085`;
- original sanitized Evidence ZIP SHA-256
  `647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e`
  and its `18/18` internal checksum result;
- the sanitized session fingerprint;
- SHA-256 values of the two encrypted envelope files and their envelope
  fingerprints, without paths or encrypted contents;
- parser version
  `stayopti.v3.serpapi-google-hotels-private-replay-parser@2`;
- the deterministic parser-contract fingerprint and the observed replay
  schema fingerprint;
- the expected pre-repair failure and the post-repair success;
- security, price-semantics, provider-neutrality and regression receipts.

Every JSON artifact carries one common seal-context hash. Fourteen JSON
artifacts are covered by `checksums.sha256`; together with that checksum file,
the ZIP contains exactly fifteen artifacts. Missing, added or changed
artifacts fail validation.

The generated offline package is
`StayOpti-V3-17T2E-SerpApi-Repaired-Detail-Offline-Evidence-Seal-20260902-095053.zip`
with SHA-256
`27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`.
It is stored outside the repository in the user's Downloads directory.

## Controlled replay proof

The two private raw envelopes were matched uniquely to
`SERP_PILOT_01_FLORENCE_COUPLE_BALANCED`. AES-256-GCM authentication and
Windows CurrentUser DPAPI unwrapping passed in memory. The encrypted files
were not modified or deleted and no plaintext file was created.

The compatibility probe representing the historical parser considered only
`property`, `properties[0]` and `ads[0]`, so the captured direct-root property
failed as expected. The repaired parser classified the same decrypted object
as `UNWRAPPED_PROPERTY`, preserved the 29-alternative main choice set and
merged exactly one property detail. No vulnerable historical parser was
restored to the current runtime.

The proved root cause is
`VALID_UNSUPPORTED_UNWRAPPED_PROPERTY_DETAIL_SHAPE`. Provider-error,
asynchronous, non-JSON, wrong-content-type and ambiguous shapes remain
fail-closed.

## Price and evidence semantics

The sealed snapshot preserves 20 observed display prices and nine missing
prices. Observed values remain
`OBSERVED_AGGREGATED_DISPLAY_PRICE`; they are not exact bookable offers,
seller-specific prices or verified checkout totals. Missing evidence remains
missing.

The replayed material remains external, provider-neutral diagnostic evidence.
`AUTOMATIC_GOLDEN_ADMISSION=NO`, `REMAINING_STAGE_AUTHORIZED=NO` and
`REMAINING_STAGE_STARTED=NO`.

## Security and storage

The seal ZIP contains neither plaintext nor encrypted raw, AES or DPAPI key
material, API credentials, property references, provider IDs, complete URLs,
query strings, provider messages or quarantine paths. The private quarantine
remains outside the repository. The property-detail envelope retains its
90-day failure retention; the main-search success envelope retains its
original 14-day policy outcome.

The seal builder is a pure evaluation-side contract. It has no filesystem,
network, credential or quarantine-path capability. ZIP creation is a one-time
offline packaging operation outside the repository, followed by independent
roundtrip validation and content scans.

Validation evidence: T2E targeted `25/25 PASS`; combined T2A/T2B/T2C/T2D,
provider-neutrality and T2E boundary tests `137/137 PASS`; Engine V2
`196/196 PASS`; TypeScript and PowerShell 5.1 parsing PASS. The final Engine
V3 regression count and Git postflight are reported by the phase receipt.

## Non-goals and next boundary

V3-17T2E does not change V2, V3 ranking, weights, roles, provider runtime,
public runtime or deployment. It does not reinterpret the canary, start a
collection wave, use Stage REMAINING, or train/calibrate the engine.

The next action must be chosen from the newly sealed evidence and current
repository state. No new network authority is implied by this seal.
