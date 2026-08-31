# D-0004 — V3-17R LiteAPI Sandbox pre-network hold

Date: 2026-08-31

Status: Accepted

Approver: Mattia, explicit conditional pilot authorization

## Context and problem

V3-17Q qualified the existing LiteAPI Rates contract and provider-neutral projection for a bounded sandbox pilot. V3-17R authorized at most five Rates requests only if sandbox identity and zero account-specific cost were deterministically proven before the first request. Repository configuration and public documentation do not bind the configured account to sandbox or establish its billing terms.

## Decision and scope

Keep the pilot in `SAFE_HOLD_PRE_NETWORK`. Do not load credentials or transmit HTTP until both account/environment identity and zero account-specific cost are documented. Implement a private offline gate and bounded governor so a later phase can enforce five Rates requests, one wave, no retry, no redirect, concurrency one and 1,000 ms pacing without changing public runtime.

## Product rationale

Conditional authorization must not be broadened by inference. A public documentation estimate or configurable URL cannot substitute for account-specific evidence. Failing closed prevents unapproved cost and production access while preserving useful implementation progress.

## Evidence reviewed

- V3-17Q commit `69715d22fc16b75460a4517cf80dc56eb1f2e4f2` and parent `f5cba6b5a8c525682ebd9fc525659054da4614be`.
- Existing LiteAPI client, provider mapper, offer mapper, adapter and non-secret configuration contract.
- V3-17Q qualification document and 16-field Golden coverage matrix.
- Repository canonical Windows execution guardrails.
- Frozen V3-17R plan SHA-256 `34e450c9cfafad2fec76898dc74c4b935dbe7f6ac3485f45e9068078ae557c9a`.

## Alternatives rejected

- Treat the default URL as sandbox proof: configuration is mutable and does not attest account identity.
- Treat public pricing text as account-specific zero-cost proof: account plan, fair-use and entitlement terms remain unknown.
- Send one probe request to discover the environment: the gate explicitly prohibits network-based verification.
- Load credentials before deciding the gate: this would violate the pre-network boundary.

## Risks and safeguards

- The hold can delay the pilot; this is accepted because unverified account cost and environment are consequential.
- The governor admits only the exact Rates method/path/base candidate and rejects paid or mutative endpoints.
- Sandbox cases remain diagnostic, never real Golden evidence.
- The private module is absent from the public Engine V3 barrel and performs no network or environment access.

## Implementation consequences

Five future-dated search families are frozen and fingerprinted before network. A pure pre-network decision, counter, endpoint allowlist, pacing/concurrency control, fail-fast response accounting, deterministic 20-case selector and raw-material scan are available for offline verification. No live dispatcher is enabled while the observed gate remains on hold.

## Validation and rollback

Validation requires targeted V3-17R and V3-17Q tests, complete Engine V3 and V2 suites, TypeScript, B1/B2/quarantine/F0 regressions, secret/raw-ID scans, Git diff checks and worktree/env/package integrity. Rollback before commit consists of removing the new private module, test, V3-17R document and this append-only decision entry.

## Supersession

Supersedes no product policy. It narrows V3-17Q's future pilot eligibility with the explicit account/environment evidence conditions supplied for V3-17R.
