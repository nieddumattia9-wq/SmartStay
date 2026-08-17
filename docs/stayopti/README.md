# StayOpti canonical context

This directory is the repository's durable product memory. It prevents philosophy, constraints, evidence, and decisions from being lost between chats or agents.

## Layers

- `PRODUCT_CONSTITUTION.md`: stable product and decision principles.
- `CURRENT_STATE.md`: last evidence-backed technical checkpoint; verify before use.
- `EXECUTION_GUARDRAILS.md`: safe operating and validation rules.
- `DECISION_LOG.md`: append-only index of material decisions.
- `SOURCE_REGISTRY.md`: canonical-source inventory, precedence, and hashes.
- `decisions/`: complete decision records.
- `canonical-sources/`: preserved original documents; never silently rewrite them.

`AGENTS.md` at repository root tells Codex to read this context automatically.

## Update rule

Do not replace history with a cleaner story. Add a new source or decision, state what it supersedes, retain the earlier artifact, and update `CURRENT_STATE.md` only after evidence exists.
