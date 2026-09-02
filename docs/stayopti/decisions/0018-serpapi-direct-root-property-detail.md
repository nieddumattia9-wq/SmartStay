# D-0018 — Accept structurally valid direct-root SerpApi property details at the evaluation boundary

- Date: 2026-09-02
- Status: Accepted offline repair; no provider-call authority
- Approver: Mattia, through the V3-17T2D instruction
- Supersedes: no prior safety or authorization decision

## Context and problem

The MAX2 canary returned a successful JSON property detail directly at the
response root. The evaluation parser supported only `property`,
`properties[0]` and `ads[0]` wrappers, so it rejected valid captured evidence
despite successful transport and provider status.

## Decision and scope

Accept a direct-root property only when it has a non-empty property name and
at least one allowlisted material property-evidence field. Keep all historical
wrapper forms. Continue to reject ambiguous, incomplete, non-JSON,
wrong-content-type, provider-error and asynchronously incomplete responses.

This change is confined to SerpApi evaluation ingestion and private replay.
It does not change V3 core, weights, ranking, providers, public runtime,
authorization state or Golden admission.

## Product rationale

Provider-neutral evidence must preserve valid source information without
forcing source-specific payloads into the decision core. Structural support is
preferable to one-hotel exceptions, while fail-closed classification protects
against inventing evidence from ambiguous responses.

## Evidence reviewed

- sanitized canary Evidence archive and all internal checksums;
- two uniquely matched encrypted quarantine envelopes;
- authenticated in-memory replay before and after repair;
- collector diagnostics, property-detail merge and private replay code;
- synthetic regression fixtures containing no captured values.

## Alternatives rejected

- retrying the provider call: unauthorized and unnecessary for diagnosis;
- wrapping the captured payload manually: non-repeatable and unsafe;
- treating every root object as a property: insufficiently fail-closed;
- copying captured data into tests: prohibited;
- moving SerpApi shape handling into V3 core: violates provider neutrality.

## Risks and safeguards

Direct-root acceptance requires controlled structural evidence. Provider
errors and incomplete statuses are classified before merge. Raw remains
AES-256-GCM encrypted with CurrentUser DPAPI protection outside the repository;
tokens, provider IDs and raw values never enter durable diagnostics.

## Implementation consequences

The evaluation adapter contract recognizes one additional official response
shape, diagnostics explicitly reject wrong content types and incomplete async
states, and private replay parser version advances to `@2`. No new call,
credential, public endpoint or model-policy change is introduced.

## Validation and rollback

Acceptance requires the captured encrypted replay, synthetic T2D tests,
historical SerpApi regressions, both engine suites, TypeScript, PowerShell 5.1,
security/provenance scans and Git integrity checks. Rollback is the atomic T2D
commit; it does not alter or delete the retained encrypted evidence.
