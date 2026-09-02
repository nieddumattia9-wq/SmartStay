# D-0023 — Manual public-market Decision Golden capture

Date: 2026-09-02

Status: Accepted offline gate; no capture or network authority

Approver: Mattia through the V3-17T5A-R0 instruction

## Context and problem

D-0022 prepared a two-call SerpApi diagnostic canary, but that route does not
provide the principal Decision Golden evidence requested by the product. The
user cannot use the B2B Product route and requires a lawful, low-cost path
that does not inherit provider ordering or promote incomplete diagnostic data.

## Decision and scope

The D-0022 implementation remains in history as
`DORMANT_DIAGNOSTIC_ONLY`; its generated authorization is revoked and all
CANARY2/REMAINING10 execution stays unauthorized. The active path becomes an
offline manual public-market capture protocol with five to eight alternatives,
uniform logged-out consumer conditions, encrypted private proof,
provider-neutral snapshots, pre-decision blind judgment, and separate future
manual admission.

`DECISION_GOLDEN`, `LIVE_BOOKABLE_GOLDEN`, and `DIAGNOSTIC_ONLY` are distinct.
Manual evidence can only become a Decision Golden after future explicit
review. It cannot prove booking completion or become Live Bookable Golden.

## Product rationale

The protocol measures whether V3 makes a sound decision over evidence a
traveler could compare, without treating an API ordering, advertisement, or
commercial identifier as truth. Uniform capture conditions and blind review
reduce selection and interface leakage; explicit missingness preserves honest
uncertainty.

## Evidence reviewed

- D-0020 through D-0022 and the T3/T4 comparability findings.
- The committed T5 gate, its manifests, runner seal, tests, and zero-call
  receipt.
- Existing Golden, blind-capsule, provider-neutral identity, and private
  AES-256-GCM/CurrentUser-DPAPI quarantine contracts.

## Alternatives rejected

- Execute the dormant SerpApi canary: rejected because it remains diagnostic
  and is not the active Golden route.
- Use B2B Product access: unavailable to the user and not authorized.
- Scrape or automate OTA interfaces: rejected on legal, stability, and
  consent grounds.
- Treat screenshots or manually observed bookings as automatic Golden truth:
  rejected because evidence and judgment require separate validation.

## Risks and safeguards

- Manual transcription error: deterministic validation, completeness reports,
  capture fingerprinting, and encrypted source proof.
- Personalized pricing: logged-out, no-membership/no-personal-discount gates.
- Asymmetric detail: audit-only exclusion from decision input.
- Blind leakage: neutral labels and physically separate private ledger.
- Overclaim: pre-checkout prices remain non-exact, unbooked, and unverified at
  checkout; automatic admission is impossible.

## Implementation consequences

An evaluation-only TypeScript contract, local offline runner/interface,
tests, and documentation are added. Engine V2, V3 core, weights, ranking,
provider runtime, public UI, booking, analytics, package files, and deployment
configuration remain unchanged.

## Validation and rollback

Targeted tests cover authorization revocation, limits, comparability,
missingness, price semantics, encrypted evidence, tamper detection, blind
leakage, deterministic identity, lifecycle, and zero network. Rollback removes
only the isolated T5A evaluation artifacts and this forward decision; it does
not rewrite D-0022 or provider history.

## Supersession

This decision prospectively supersedes D-0022 as the active path toward
Decision Golden evidence. It does not erase D-0022, authorize any provider
call, admit a Golden case, or make V3-18 eligible.
