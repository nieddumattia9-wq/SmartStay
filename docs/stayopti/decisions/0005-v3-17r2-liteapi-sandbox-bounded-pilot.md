# D-0005 — V3-17R.2 LiteAPI Sandbox bounded pilot

Date: 2026-08-31
Status: Accepted
Approver: User, through explicit V3-17R, V3-17R.1 and V3-17R.2 instructions

## Context and problem

V3-17R froze and tested a private five-request Rates-only governor but stopped before credentials and network because its original proof rule demanded a distinct Sandbox host and account-specific provider evidence. The user then clarified that LiteAPI uses a common API base, attested that the available credential is Sandbox, and accepted Sandbox Rates as zero-cost. The remaining safe local discriminator was the credential class prefix, which could be checked without exposing or retaining the credential.

## Decision and scope

Prospectively supersede only D-0004's hold-removal criteria. Treat all of the following as jointly sufficient for this one wave:

- exact base `https://api.liteapi.travel/v3.0`;
- exact `POST /hotels/rates` allowlist;
- local in-process key-class result `sand_` or `sandbox_`;
- explicit user Sandbox and zero-cost attestations;
- unchanged frozen plan SHA-256 `34e450c9cfafad2fec76898dc74c4b935dbe7f6ac3485f45e9068078ae557c9a`;
- the existing five-request, zero-retry, zero-redirect, concurrency-one, one-wave governor.

The decision authorizes no production traffic, paid or mutative endpoint, retry, replacement family, additional wave, booking, prebook, payment, deploy, push, or fetch.

## Product rationale

The pilot tests whether the qualified Rates response can cross the provider-neutral projection boundary without weakening StayOpti's evidence rules. It does not test market frequency, economic superiority, booking validity, or V3 promotion. Explicitly keeping bounded Sandbox projections outside real Golden counts prevents diagnostic availability from masquerading as decision evidence.

## Evidence reviewed

- source checkpoint `2b448470c2782834da62d89850d2f4f127998b0d` and parent `69715d22fc16b75460a4517cf80dc56eb1f2e4f2`;
- frozen plan and governor tests;
- exact base/path configuration and local sandbox key-class result, without credential retention;
- one completed wave: five Rates requests, five processable responses, zero other endpoints, zero retry and zero redirect;
- five provider-neutral snapshots, twenty diagnostic projections, and the sixteen-field coverage report;
- sanitized Evidence receipt SHA-256 `6cab9c87014f69429083f0582f26d699d78e8ca14972adbc767c0765741a45fe`;
- post-wave targeted, Engine V2/V3, B1/B2, quarantine, F0 and integrity gates.

## Alternatives rejected

- Requiring a hostname containing `sandbox`: incompatible with the common LiteAPI base described by the corrected authority.
- Requesting the key from the user or printing a prefix fragment: unnecessary and privacy-unsafe.
- Treating Sandbox results as real Golden cases: violates the frozen provenance and provider-exhaustion contract.
- Retrying or replacing a family: violates the single frozen wave.
- Proceeding directly to V3-18: the Golden and judgment gates remain empty.

## Risks and safeguards

- Credential risk is bounded by an in-process boolean prefix classification; no value, length, hash, fragment, or header is retained.
- Cost and environment uncertainty are bounded by explicit user attestations and the exact one-wave technical limits.
- Provider ordering and identity are removed before projection; only local alternative identifiers survive.
- Missing evidence remains explicit unknown.
- Bounded snapshots remain diagnostic and cannot pass real-source Golden admission without provider exhaustion.
- Authorization is consumed after the first transmitted request and cannot be reused.

## Implementation consequences

A private execution binding connects the tested governor to native Rates transport and the existing LiteAPI mapper. It is not exported through the public Engine V3 boundary. A private host writes only a sanitized provider-neutral receipt outside the repository. The historical safe-hold record remains intact; current state records the completed bounded wave separately.

## Validation and rollback

The wave cannot be rolled back or repeated. The code change is locally reversible through a later explicit Git change, but provider calls remain historical facts. Post-wave validation passed with targeted V3-17Q/R/R.2 `48/48`, Engine V3 `965/965`, Engine V2 `196/196`, TypeScript, B1/B2, legacy quarantine, F0B/F0C/F0D, privacy scans and Git checks.

## Supersedes / superseded by

Prospectively supersedes D-0004 only for the evidence needed to release this exact V3-17R wave. It does not authorize later LiteAPI traffic. No later decision supersedes this record.
