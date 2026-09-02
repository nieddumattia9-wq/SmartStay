# V3-17T5A-R0 — Manual Public-Market Decision Golden Capture Gate

Status: offline gate implemented; no capture, judgment, network call, or
Golden admission has occurred.

## Reconciliation and active path

Commit `47b4075043afcd151a8f4f8fa8b5a8d3f2aaf669` is a safe linear child of
`d99982ab57d80b0d9d78b8e8470bfd6ed80cb821`. It added only the former
evaluation-side limited-comparable SerpApi CANARY2 gate. It made zero HTTP
requests, loaded zero credentials, persisted no provider raw data, and did
not change the public runtime. The commit remains in history, but its role is
now `DORMANT_DIAGNOSTIC_ONLY`, not the active Golden path.

The old authorization combination is explicitly revoked:

- execution HEAD `47b4075043afcd151a8f4f8fa8b5a8d3f2aaf669`;
- runner bundle `a3a4068e6af81f2a82b4cb2345ffc388f8ca057c46eca3db53d21766139ba206`;
- CANARY2 manifest `f41b10e2680bc885019c77b37ce4f5ed7f57d86e7afd87615f7a498ce375073c`;
- campaign manifest `679264c6952ec726825126b3e9fe3200f6222575a1223ef5a12a51bb117e208a`.

Any use of that combination fails closed as
`AUTHORIZATION_REVOKED_OR_EXECUTION_HEAD_MISMATCH`. Its literal is neither
valid nor accepted; CANARY2 and REMAINING10 are unauthorized and unreachable.

## Golden classes

`DECISION_GOLDEN` is a future, manually reviewed class for evidence that can
support a judgment about V3 decision quality. It does not establish that a
booking was completed. A valid capture is only a
`DECISION_GOLDEN_CANDIDATE` until a blind judgment and a separate explicit
admission action have occurred.

`LIVE_BOOKABLE_GOLDEN` requires a future end-to-end confirmation and is
unreachable in this phase. `DIAGNOSTIC_ONLY` applies whenever structural,
comparability, completeness, or verification requirements are not met. The
T3 sample remains `DIAGNOSTIC_ONLY`.

## Manual protocol

A capture uses one public consumer surface and one short collection window.
The collector must be logged out and must not apply membership, personalized,
or coupon discounts. Destination, dates, occupancy, rooms, currency, budget,
preferences, and hard constraints are frozen before the alternatives are
evaluated. The capture contains five to eight alternatives. Every alternative
must use the same guest configuration and must have observed availability,
a full-stay pre-checkout price, rating, review count, normalized distance,
category, room evidence, cancellation evidence, and an explicit amenities
wrapper.

Missing evidence is preserved. A missing critical comparable field makes the
capture diagnostic-only. A field with asymmetric detail coverage is
`AUDIT_ONLY`/`EXCLUDED_FROM_DECISION`; it cannot give the enriched item an
advantage or disadvantage.

The local interface is generated with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\invoke-v3-17t5a-manual-public-market-capture.ps1 -Mode initialize
```

It writes a unique workspace below
`%LOCALAPPDATA%\StayOpti\private-evidence\manual-market-golden-capture`, not
inside the repository. A draft can be saved and resumed. The HTML performs no
network operation, starts no server, uses no browser automation, and stores
nothing in local/session storage. Repository validation remains authoritative.

## Price semantics

Every admitted capture price is
`PUBLIC_PRECHECKOUT_VERIFIED_PRICE`. The contract preserves amount, currency,
full-stay scope, tax inclusion status, pay-now/pay-at-property components,
observation time, availability, provenance, reliability, and missingness.
The invariant fields are:

- `purchaseCompleted=false`;
- `bookingConfirmed=false`;
- `exactBookable=false`;
- `verifiedCheckoutTotal=false`;
- `personalizedDiscount=false`.

The observed price is therefore neither a purchased price nor a verified
checkout total.

## Private evidence boundary

Screenshots, saved pages, source URLs, and real property names stay below
`%LOCALAPPDATA%\StayOpti\private-evidence\manual-market-golden-capture`.
The existing provider-raw quarantine primitive is reused with controlled
manual-capture labels: AES-256-GCM encrypts the evidence; its data key is
protected by Windows CurrentUser DPAPI in operational use; SHA-256 and the
GCM authentication tag detect tampering. Plaintext temporaries are not stable
artifacts and must be removed in `finally` cleanup.

Private evidence, encrypted envelopes, source URLs, real names, and
screenshots are prohibited from the repository, shared Evidence, and the
blind capsule.

## Provider-neutral snapshot and blind judgment

The snapshot sorts alternatives from canonical decision material rather than
source order and assigns neutral `ALT_A`–`ALT_H` identifiers. Consumer
surface, real name, URL, source rank, sponsorship, screenshots, and private
evidence references are excluded. A private ledger alone maps neutral labels
back to local capture records.

The capsule contains only comparable trip and alternative evidence. It shows
no provider/seller, real property name, URL, source ID, original rank,
sponsorship, screenshot, V3 result, V3 score, or asymmetric single-item
detail. A judgment must be append-only and recorded before any V3 decision is
revealed. The capsule cannot itself admit a Golden record.

## Lifecycle and fail-closed behavior

The supported lifecycle is:

`DRAFT → CAPTURE_IN_PROGRESS → CAPTURE_COMPLETE →
ELIGIBLE_FOR_BLIND_JUDGMENT → BLIND_JUDGMENT_RECORDED →
ELIGIBLE_FOR_DECISION_GOLDEN_REVIEW`.

At validation boundaries a record may instead become `DIAGNOSTIC_ONLY` or
`REJECTED`. `DECISION_GOLDEN_ADMITTED` is reachable only from the review state
with a separate explicit future admission action.
`LIVE_BOOKABLE_GOLDEN_ADMITTED` is not a state and is unreachable.

## Scope and non-claims

V3-17T5A-R0 performs no HTTP, SerpApi, LiteAPI Product, scraping, browser
automation, credential loading, booking, provider call, public runtime change,
weight change, push, or fetch. No real capture or judgment is included in the
repository. A passing gate means only that a controlled manual canary may be
prepared next; it does not mean V3-17 is met.
