# V3-17T5 — Limited comparable main-search collection gate

Status: `PASS_READY_FOR_CANARY2_LITERAL_ACCEPTANCE` on source checkpoint
`d99982ab57d80b0d9d78b8e8470bfd6ed80cb821`.

This phase is offline. It performs no HTTP request, loads no credential and
does not accept or consume an authorization literal. It prepares a two-stage,
main-search-only collection gate for the limited-comparable tier defined in
V3-17T4. It does not make the T3 sample replay-eligible and does not authorize
Golden admission.

## Preserved evidence and boundary

- T3 Evidence SHA-256
  `1a669961375fc3838c100c7d7ca03623a9902acab4c87621799366aa671f50a6`
  passes `6/6` internal checksums.
- T2E Evidence SHA-256
  `27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`
  passes `14/14` internal checksums.
- The two encrypted raw envelopes authenticate offline under AES-256-GCM and
  Windows CurrentUser DPAPI. No plaintext is written at rest and neither raw
  nor encrypted raw enters the repository or shared Evidence.
- The T3 result remains `DIAGNOSTIC_ONLY`: 29 alternatives, 20 observed
  aggregated display prices, nine missing prices and one asymmetric detail.

T5 creates a future collection boundary. It does not reinterpret any earlier
live result and does not use provider identity, source ordering, sponsorship
or an opaque property reference as decision evidence.

## Immutable session registry

The registry projects the existing canonical twelve-session SerpApi pilot
manifest into provider-neutral scenario records. Every record binds:

- stable local session ID and scenario fingerprint;
- normalized destination, exact dates, stay duration and lead time;
- adults, child ages and rooms;
- EUR currency, `gl=it` and `hl=it`;
- pre-frozen budget, preference profile, user context and hard constraints;
- expected tier `LIMITED_COMPARABLE_JUDGMENT`;
- a diagnostic inclusion rationale.

The registry contains exactly twelve sessions and retains the original order.
Its canonical SHA-256 is
`59d84e01d7c46f8616ed64da90f25701ebd7c8fcc1730ec4c80d3c7100671cb0`.
Changing any session field changes the registry and stage seals.

## Stage split

CANARY2 is selected before observation by deterministic maximum input
diversity over party context, children, profile, duration, lead time and
budget buckets. Provider results, names, IDs, sponsorship and ranking order
are excluded from selection.

The selected CANARY2 sessions are:

1. index 1 — `SERP_PILOT_02_ROME_SOLO_BUDGET`;
2. index 9 — `SERP_PILOT_10_VIENNA_FAMILY_COMFORT`.

The other ten canonical sessions form REMAINING10. The stages are disjoint,
their union is the complete registry, and neither can reach the other in the
same invocation.

| Seal | SHA-256 |
|---|---|
| Campaign manifest | `679264c6952ec726825126b3e9fe3200f6222575a1223ef5a12a51bb117e208a` |
| CANARY2 manifest | `f41b10e2680bc885019c77b37ce4f5ed7f57d86e7afd87615f7a498ce375073c` |
| REMAINING10 manifest | `0bfc9f65982ea7909a4a9dd101d7ee02ee4097fa207d370860ebf49ff39c0f5c` |

## Frozen request policy

| Property | CANARY2 | REMAINING10 | Campaign |
|---|---:|---:|---:|
| Sessions | 2 | 10 | 12 |
| Main searches per session | 1 | 1 | 1 |
| Property details | 0 | 0 | 0 |
| Maximum calls | 2 | 10 | 12 |
| Concurrency | 1 | 1 | 1 |
| Automatic retries | 0 | 0 | 0 |
| Automatic pagination | 0 | 0 | 0 |
| Autostop | Yes | Yes | Yes |

The request ledger atomically reserves one `MAIN_SEARCH` per registered
session. It rejects an out-of-stage session, a duplicate request, property
detail, a third CANARY2 call and concurrent work. A failed transmission
consumes its session budget and does not trigger compensation or retry.

## Limited-comparable output

Each successful main-search response is first stored in the mandatory private
encrypted quarantine. Only then may it be normalized into a sanitized search
snapshot. The T4 selector freezes a set of minimum five, target eight and
maximum ten alternatives from fields available across the search response.

Prices retain semantic `OBSERVED_AGGREGATED_DISPLAY_PRICE`; they are never
promoted to exact-bookable, seller-specific or verified checkout totals.
Unpriced alternatives remain in a separate missing-price denominator and are
not treated as expensive or low quality. Sponsorship, original rank, provider
identity and property tokens cannot affect selection.

CANARY2 passes only when both transmitted sessions independently produce a
valid limited-comparable set. No diagnostic-only allowance exists. One failed
or merely diagnostic session aborts CANARY2 and leaves REMAINING10 unavailable.

## Authorization and runner seal

The authorization literal is generated only after the implementation commit
exists. It binds byte-for-byte:

- source SHA and exact execution HEAD;
- campaign, CANARY2 and registry hashes;
- the runner-bundle hash covering launcher, Node runner, gate, canonical
  session manifest, T4 selector, adapter, Evidence contract, replay boundary,
  encrypted quarantine and canonical hashing;
- CANARY2, two sessions, two calls, main-search only, detail zero,
  concurrency one, retry/pagination zero, autostop, CurrentUser encrypted
  quarantine, REMAINING10 off and Golden admission off.

T5 does not accept that literal. A later user message must reproduce it
exactly. The PowerShell launcher performs a credential-free preflight before
`Read-Host -AsSecureString`; the key is process-only, absent from the command
line and cleared in `finally`. The runner permits only
`https://serpapi.com/search.json` with `engine=google_hotels`, no property
token, no pagination token and manual redirect handling.

No REMAINING10 literal is created. It may be prepared only after a separate
manual review of a passing CANARY2 Evidence seal and requires a new explicit
authorization.

## Evidence contract

A future CANARY2 Evidence package must include the campaign and stage seals,
registry receipt, authorization receipt, request and spend ledgers,
per-session sanitized snapshots, comparable subsets, missing-price strata,
exclusion ledger, quarantine receipts, credential cleanup, stop receipt,
provider-neutrality receipt, campaign decision and checksums.

It must exclude raw payloads, encrypted raw, API keys, authorization headers,
property tokens, provider IDs, full URLs/query strings, provider order and
automatic Golden claims. Raw remains only in the private encrypted quarantine
outside the repository.

## Product decision

T5 is ready for a separately accepted CANARY2 literal. It does not execute the
canary, authorize REMAINING10, create a replay/blind judgment, or admit Golden
evidence. V3-17 remains unmet and V3-18 remains blocked.
