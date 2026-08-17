# D-0001 — Persistent project memory

Date: 2026-08-17  
Status: Accepted  
Approver: Mattia, Product Founder

## Context

StayOpti has accumulated product philosophy, market strategy, engine architecture, roadmaps, safety rules, Windows runner incidents, and evidence-backed checkpoints across many chats. Depending on chat memory or repeatedly pasting long prompts creates a risk of lost logic, contradictory implementation, and avoidable manual work.

## Decision

Store a durable, versioned context system in the repository:

- root `AGENTS.md` as the mandatory reading index and compact invariants;
- `PRODUCT_CONSTITUTION.md` for stable intent;
- `CURRENT_STATE.md` for the last validated checkpoint;
- `EXECUTION_GUARDRAILS.md` for operational safety;
- an append-only `DECISION_LOG.md` and full decision records;
- `SOURCE_REGISTRY.md` and immutable copies of the original source documents.

## Rationale

The repository is the shared object available to Codex on PC and Remote. Keeping the context beside the code makes it reviewable, versioned, auditable, and independent from any one chat. Original sources preserve nuance; compact operational documents make the rules usable on every task.

## Safeguards

- Installation is documentation-only and non-destructive.
- Existing stronger instructions are preserved; conflicts block installation.
- Original sources are checksum-verified and never silently overwritten.
- State claims must be revalidated before mutation.
- Material changes require an explicit later decision.
- No automatic commit or push during installation.

## Alternatives rejected

- Re-pasting all sources in every chat: repetitive and error-prone.
- Relying only on conversation memory: not repository-auditable.
- Keeping only a short summary: risks losing nuance and provenance.
- Treating old roadmaps as live state: confuses intent with current evidence.

## Validation

Validate source SHA-256 values, confirm the root instruction file is discovered, review documentation-only diff, and open a read-only Codex thread asking it to state the North Star, protected baseline, source precedence, and last checkpoint.

## Rollback

Before commit, remove only the new package files. After commit, revert the dedicated documentation commit without touching unrelated history.

## Supersession

Supersedes no previous formal decision. A later decision may extend the structure but must preserve historical sources and this record.
