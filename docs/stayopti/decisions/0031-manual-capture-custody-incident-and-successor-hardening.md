# D-0031 — Close the legacy manual canary as diagnostic-only and require verifiable session custody

Date: 2026-09-04

## Context and problem

The completed manual-market session
`V3_17T5B_FLORENCE_20261015_002` produced a checksum-valid sanitized ZIP and
fifteen encrypted evidence envelopes. Direct inspection by the user in their
own Windows PowerShell session, however, found no session-scoped directory and
no `session-state.json`; the private root contained only the legacy
`encrypted` directory. Earlier positive probes observed a different filesystem
namespace or synthetic temporary fixtures and therefore did not prove the
state visible to the user.

The sanitized ZIP deterministically preserves five provider-neutral
alternatives, but it contains no per-envelope fingerprint or private handle.
The ZIP and legacy custody can therefore be associated only at aggregate
session level. Retrofitting file-level cryptographic links would manufacture
provenance after the fact.

## Decision and scope

Close `_002` permanently as `DIAGNOSTIC_ONLY`. Preserve its original ZIP with
SHA-256
`c0e26c01aab4f4cc5486345955a91cb74d9c0722b5591556ed996718ceccc598`
and all fifteen `.stayopti-rawq` files byte-for-byte. Do not reconstruct a
session-scoped private state from the ZIP and do not create retroactive links.
The session is prohibited from blind judgment, V3 replay, deblind and Golden
admission.

All successor captures use state/custody contract version 2. Each requires an
explicit new session ID, an actual session-scoped directory, an atomically
replaced `session-state.json`, immutable state history, a recovery copy and a
private manifest that binds each alternative to exactly three encrypted
envelopes. The sanitized package carries only non-identifying envelope and
file fingerprints, enabling file-by-file verification without exposing names,
URLs or screenshots.

## Product rationale

Decision evidence is useful only when its custody is independently
verifiable. A sanitized choice set can remain diagnostic evidence even when
its original private state is unavailable, but it cannot silently inherit the
stronger claims needed by blinded evaluation or Golden admission. Forward-only
hardening preserves the valid diagnostic result while preventing provenance
fabrication.

## Evidence reviewed

- the user-observed CurrentUser filesystem layout;
- the original sanitized ZIP hash and its internal checksum result;
- aggregate metadata for the fifteen encrypted envelopes, without decryption;
- Git history for the original collector and finalization flow;
- D-0028, D-0029 and D-0030;
- the current manual-capture validator, runner, launcher and quarantine store.

## Alternatives rejected

- Recreate `session-state.json` from the shared ZIP: private identity and
  evidence bindings are absent.
- Associate the ZIP with individual envelopes by position or timestamp:
  neither is a cryptographic file-level proof.
- Treat synthetic or Codex-visible paths as proof of the user's filesystem:
  those are explicitly non-promotable fixtures.
- Repeat the same repair launcher against `_002`: the legacy session is now
  immutable and non-repairable.

## Risks and safeguards

State and private manifests are written atomically and versioned before
replacement. Finalization never deletes them. Every successor alternative
requires three envelopes inside its own session directory. Payment
decomposition is checked before persistence; explicit unknown text remains
case-insensitive; verified textual position is separate from numeric distance;
and implausible textual dates fail validation.

A Windows PowerShell 5.1 post-finalization command verifies the real
CurrentUser path, state/recovery/history, private manifest and all fifteen
envelope hashes without decrypting content. Runs against `%TEMP%` or synthetic
fixtures identify themselves as non-promotable and can never establish real
operational proof.

## Implementation consequences

The legacy `_001` and `_002` identities are rejected by successor collection
and repair modes. New interactive captures require an explicit identity.
Blind capsule creation remains disabled during collection finalization; later
eligibility remains a separate authorized phase. No network, provider,
booking, ranking, weight or public-runtime behavior is added.

## Validation and rollback

Validation requires targeted state/custody tests, a true Windows PowerShell
5.1 launcher dry run that reopens the finalized synthetic session, PowerShell
parse, TypeScript compilation, full Engine V3 and Engine V2 suites, leak scans
and Git diff checks. Rollback is forward-only and must never modify the legacy
ZIP or encrypted envelopes.

## Approver

User instruction dated 2026-09-04.

## Supersedes / superseded by

Operationally supersedes D-0029 and D-0030 claims that `_002` had a verified
session-scoped private state. Their fail-closed lookup principles remain
applicable to successor sessions.
