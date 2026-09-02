# V3-17T2D — SerpApi property-detail encrypted replay and parser repair

Date: 2026-09-02

Source checkpoint: `5c4f2b36568fa825599a62f25e2d2c18b52fb085`

Mode: offline diagnosis and evaluation-boundary repair; zero credentials,
provider calls and HTTP requests.

## Evidence and quarantine preflight

The sanitized canary Evidence archive remained outside the repository. Its
SHA-256 is
`647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e`;
all 18 listed internal checksums passed. The archive identifies one aborted
Florence canary with two transmitted requests.

Exactly two non-expired encrypted envelopes matched that session uniquely by
controlled session reference, request kind and ordinal: one processed main
search and one unrecognized property detail. Both envelope fingerprints,
AES-256-GCM authentication and Windows CurrentUser DPAPI unwrap passed. The
encrypted files were neither changed nor deleted, and no plaintext file was
created.

## Sanitized root cause

The property-detail response was HTTP 200, JSON, approximately 150 KB,
reported successful search metadata and contained no provider error field. It
was a valid property detail returned directly as the top-level object. Its
sanitized shape contained property evidence such as property type, class,
rating/review evidence, coordinates, amenities and observed display-price
structures alongside search metadata.

The parser accepted only these wrapper forms:

- `response.property`;
- `response.properties[0]`;
- `response.ads[0]`.

It therefore emitted `SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE` solely
because the valid direct-root property had none of those wrappers. The cause
is classified as `VALID_UNSUPPORTED_UNWRAPPED_PROPERTY_DETAIL_SHAPE`; it is
not a provider error, asynchronous response, invalid token, non-JSON body or
incomplete property.

The transient property reference was extracted from the selected main-search
candidate, selected by the pre-existing deterministic rank rule and passed
unchanged to the detail request builder. It was not truncated, normalized,
persisted or exported. The captured successful response provides no evidence
of a property-reference defect.

## Repair

The evaluation-side parser now classifies and extracts four structural forms:
wrapped property, first wrapped property, first wrapped ad and a direct-root
property. Direct-root acceptance requires a non-empty property name plus at
least one allowlisted material property-evidence field. This is structural and
does not depend on the captured hotel, token, provider identifier or payload
value.

Existing wrapped forms remain supported. Ambiguous or insufficient objects,
provider error fields, error status, asynchronous incomplete status,
non-JSON bodies and explicitly non-JSON content types remain fail-closed. The
private replay parser version advances to
`stayopti.v3.serpapi-google-hotels-private-replay-parser@2`.

Because the repair changes files covered by the execution seal, the runner
bundle was re-fingerprinted as
`e8f81dd4778aa6b15ace287d03bb2ebb908454a349b840357f7a8ac5df19e476`.
The previously consumed T2C literal cannot match the repaired bundle; this
offline phase grants no replacement network authorization.

## Replay result

Before repair, the authenticated main replay passed and the detail replay
failed with the historical parser classification. After repair, authenticated
replay of the same two untouched encrypted envelopes passed: the same 29-item
choice set was retained and exactly one detail was merged. The resulting
snapshot remains `PARTIAL_DIAGNOSTIC_ONLY`, provider-neutral, external
observational evidence and not automatically Golden.

The replay used zero network calls, loaded no credential, wrote no plaintext
temporary file and exported neither the property reference nor provider IDs.
The Evidence ZIP remains raw-free. The encrypted main/detail retention remains
14/90 days respectively.

## Price and product boundaries

The 20 main-search prices remain
`OBSERVED_AGGREGATED_DISPLAY_PRICE`; the nine alternatives without display
price remain missing. No value becomes exact, seller-specific, bookable or a
verified checkout total.

Engine V2, V3 decision core, weights, ranking, provider runtime and public
runtime are unchanged. Stage `REMAINING` is neither authorized nor started;
automatic Golden admission remains disabled. No new provider call is needed
to diagnose or confirm this captured response.
