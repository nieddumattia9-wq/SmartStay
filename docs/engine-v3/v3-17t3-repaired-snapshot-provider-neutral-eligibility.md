# V3-17T3 — Repaired snapshot provider-neutral eligibility gate

Status: `PASS_DIAGNOSTIC_ONLY` on source checkpoint
`79e3a19d8bbdeb2032fd03d160ce6dbea6bdf302`.

## Evidence boundary

The T2E seal at
`27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`
passed all 14 internal checksums. Its original live-Evidence reference remains
`647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e`.
Both AES-256-GCM envelopes passed structural validation, CurrentUser DPAPI
unwrap and authenticated in-memory replay. The two encrypted files remained
byte-identical outside the repository; no plaintext file was created.

The historical outcome is immutable: the live canary remains `ABORTED`, the
collection remains `PARTIAL`, and the original sanitized Evidence remains
`PASS`. T3 executes no network request, loads no credential, grants no Stage
REMAINING authority and admits no Golden case.

## Provider-neutral projection

The repaired input reconstructs 29 alternatives. The decision projection
removes source name, source IDs, property reference, original order,
sponsorship, raw provenance, parser route, URLs and query data. Alternatives
are sorted by a SHA-256 fingerprint of decision evidence and receive stable
labels `A` through `AC`; the original rank is retained only in a private
audit ledger that is not shared with the decision artifact.

Twenty alternatives retain an
`OBSERVED_AGGREGATED_DISPLAY_PRICE`; nine retain an explicit missing price.
Every observed price remains `exactBookable=false`, `sellerSpecific=false`
and `verifiedCheckoutTotal=false`. Missing price is neither zero nor adverse
quality evidence.

The detail replay changed the selected item's nightly, total and before-tax
price fields. Those changes are classified
`SINGLE_ITEM_DIAGNOSTIC_ONLY` and are excluded from the decision projection.
The provider-neutral decision snapshot uses the main-search evidence for all
alternatives, so the enriched item receives neither a benefit nor a penalty.

## Feature eligibility

| Feature class | Treatment |
|---|---|
| Review rating, review count, hotel class, base amenities | Comparable across the visible set where explicitly observed |
| Repaired detail price fields | Single-item diagnostic only; excluded from decision |
| Aggregated display prices | Preserved with caveats; excluded from V3 decision because coverage and checkout semantics are insufficient |
| Coordinates | Availability is preserved; excluded because no canonical user-location anchor exists for a decision distance |
| Cancellation | Unknown where not observed; never converted to false |
| Original rank, sponsorship, source identity, detail selection, parser route | Audit-only; prohibited from ranking |

The generated matrix contains four `COMPARABLE_ACROSS_SET` features, one
`SINGLE_ITEM_DIAGNOSTIC_ONLY` feature and eight features that are not eligible
for decision use.

## Eligibility decision

- `SNAPSHOT_ELIGIBILITY=DIAGNOSTIC_ONLY`
- `BLIND_JUDGMENT_ELIGIBILITY=NO`
- `GOLDEN_ELIGIBILITY=NO`
- `V3_REPLAY_STATUS=NOT_ELIGIBLE`

Running V3 would require treating aggregated display evidence as canonical
cost or dropping nine alternatives after seeing the response. Both choices
would bias the comparison and violate the cost/evidence contracts. A blind
capsule is therefore not emitted: without a valid V3 replay there is no
decision to judge, and the unequal detail cannot be presented as comparable
evidence.

Future eligibility requires a separately governed collection that obtains a
fairly comparable set-wide evidence boundary, complete non-invented price
semantics, tax/fee status, and a canonical location reference. This finding
does not authorize that collection.

## Artifacts

The shared Evidence archive contains only the provider-neutral snapshot,
feature matrix, missingness summary, eligibility decision, integrity receipt,
manifest and checksums. It excludes raw, encrypted raw, private audit ledger,
source identifiers, secrets and deblind material. The private audit ledger is
stored separately under the user's private-evidence area.

No judgment was recorded, no deblind was executed, no ranking or weight was
changed, and the public runtime remains unchanged.
