# D-0002 — V3-17 measurement foundation

Date: 2026-08-17

Status: Accepted

Approver: Mattia, task authorization

## Context and problem

The V3-17 audit concluded `GATE NOT MET`. No local bundle retains a complete normalized snapshot that can be replayed without a provider call. The 115 existing Golden Receipts prove plumbing and binding, while five cases marked `decisionResearchUsable` remain non-blind research evidence. The existing role-aware blind contract predetermines the comparison role, binds the mapping to V2/V3 and cannot distinguish every required abstention outcome. Derived Golden validation also requires a baseline parent inside the current dataset, so it cannot verify a canonical external baseline safely.

The Lisbon material cannot be retrofitted as Golden decision evidence because its complete replayable normalized source snapshot was not retained.

## Decision and scope

Adopt a minimal, versioned and backward-compatible measurement foundation for future evidence:

- a forward-only `Normalized Decision Source Capsule` that retains exact redacted decision context, normalized alternatives, evidence quality and freshness, transformation provenance, source SHA-256 and deterministic fingerprints;
- a new blind review extension whose visible A/B question is independent of final role, engine, provider and original alternative order, with five distinct verdicts and structured rationale fields;
- sealed optional engine, policy, role and opaque provider associations that are unnecessary to construct the visible question;
- post-response role assignment rather than mandatory preassignment;
- an explicitly supplied, fingerprinted external baseline registry whose unique entry must match case ID, SHA-256 content hash, dataset version and schema version;
- technical contract fixtures marked `technicalDiagnosticOnly`, excluded from every Golden, adversarial, counterfactual, human and expert count.

This decision creates infrastructure only. It does not create a real case, judgment or statistical claim.

## Product rationale

Decision-quality evidence must preserve the traveler trade-off that was actually available: total price, mandatory-cost completeness, cancellation flexibility, quality, location, relevant features and material missing evidence. Replayable redacted capsules prevent future work from treating receipt volume or passing tests as proof of decision quality. A role-independent blind question reduces anchoring and allows the evaluator's response to inform later role classification.

## Evidence reviewed

- Repository state at `main` / `1a74be464bc56168d80a402663ad4a3bea103e5b`, initially clean and aligned with `origin/main`.
- V3-17 audit findings: `GATE NOT MET`; 115 receipts classified as plumbing/binding evidence; five `decisionResearchUsable` cases not blind-adjudicated.
- Existing V3-12B role-aware blind contract and V3-17 Golden Dataset schema, fixtures and tests.
- Latest relevant local Evidence archive: `StayOpti-V3-17BF-Golden-Negative-Outcome-Baseline-Binding-v1-Evidence-20260817-143847.zip`, SHA-256 `bf969a8bd83a9600f6da8e590d26f8f072617e6254227d6c9b04ee284cee345a`.
- Frozen V3-17 thresholds and Windows execution guardrails in the canonical roadmap sources.

## Alternatives rejected

- Retrofitting Lisbon or any receipt without its normalized replay snapshot: provenance and missing decision facts cannot be reconstructed safely.
- Counting the 115 receipts as decision-quality cases: they establish transport and binding, not blind traveler adjudication.
- Reusing `neither` for multiple outcomes: it conflates no acceptable option with insufficient information.
- Replacing the V3-12B contract: it would break existing evidence and tests; the new protocol is an additive versioned extension.
- Accepting an unresolvable parent hash: a hash without an explicit canonical registry does not prove parent identity or content.

## Risks and safeguards

- Sensitive or commercial leakage: the capsule rejects PII, secrets, usable booking/prebook/rate identifiers, commissions, markup and raw provider payload fields.
- Blind-label leakage: visible packets contain no engine, policy, provider, commission, role or local alternative identifiers; optional associations remain sealed.
- Artificial evidence inflation: technical responses require `technical-contract-test`, cannot be human/expert and are excluded from aggregation.
- Parent substitution: unknown, missing, ambiguous, mismatched or tampered external parents fail closed.
- Runtime exposure: public V2 remains unchanged; V3 remains offline/shadow and non-public; SPLIT remains disabled.

## Implementation consequences

Future data collection must retain the normalized capsule at capture time. A future real case can be blind-reviewed without an engine mapping, then deblinded and role-classified after a real response. External derived cases can reference a canonical baseline only when the validation caller supplies the exact matching registry. Existing internal-parent datasets and V3-12B exports remain supported.

AI or Codex output must never be recorded as human or expert evidence. Real human and expert judgments must come from actual evaluators.

## Validation and rollback

Validation requires the targeted foundation tests, complete V3 and public V2 suites, provider suite, lifecycle V2, typecheck, build, V3-public and SPLIT boundaries, plus both Git diff checks. Counts must remain 115 receipts, five `decisionResearchUsable` cases and zero additions to every Golden or evaluator category.

Before commit, rollback consists of removing only the new foundation modules/tests/fixture and reverting the additive Golden Dataset, export and documentation changes. No data migration or public rollback is required.

## Supersession

Supersedes no prior accepted decision. It extends D-0001's repository memory discipline and preserves the legacy V3-12B blind protocol. A later decision may authorize real forward-collected cases and evaluator work, but may not reinterpret this technical repair as decision evidence.
