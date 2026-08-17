# StayOpti repository instructions

These instructions apply to the whole repository. Read them before planning, editing, testing, packaging, committing, or pushing.

## Required context

Read these files in order for every material task:

1. `docs/stayopti/PRODUCT_CONSTITUTION.md`
2. `docs/stayopti/CURRENT_STATE.md`
3. `docs/stayopti/EXECUTION_GUARDRAILS.md`
4. `docs/stayopti/DECISION_LOG.md`
5. `docs/stayopti/SOURCE_REGISTRY.md`

For a task touching a specific domain, also read the relevant original source listed in `SOURCE_REGISTRY.md`. Original sources are retained under `docs/stayopti/canonical-sources/` and must not be silently rewritten or shortened.

## Product invariant

StayOpti is a decision system for choosing which stay is worth booking. It is not an OTA clone, an infinite results list, a cheapest-price sorter, or a generic AI chatbot.

North Star:

> Maximum intelligence behind the scenes. Minimum effort from the traveler.

Every recommended choice must be supported by available evidence and communicate the decision thesis, decisive evidence, main sacrifice, best alternative, uncertainty, and—when material—the condition that would reverse the choice. If evidence is insufficient, abstain or reduce confidence; never invent.

## Mandatory engineering rules

- Protect the public V2 baseline until the frozen V3 promotion gates and manual authorization are satisfied.
- Keep ranking independent from commissions, provider ordering, and commercial fields.
- Separate accommodation/offer merit from purchase-provider selection.
- Keep bookability/freshness, data confidence, choice risk, and property quality distinct.
- Missing data lowers confidence; it does not automatically mean low quality.
- Preserve provider-agnostic domain contracts and deterministic decisions for identical inputs and policy versions.
- Do not force recommendation roles, upgrades, savings, or split stays when the evidence does not justify them.
- Passing tests is necessary but not sufficient. Do not tune fixtures merely to create PASS results; tests must represent meaningful traveler decisions.
- No provider calls, booking, payment, deployment, production rollout, commit, or push unless the task explicitly authorizes it.
- Inspect repository reality before acting: branch, HEAD, working tree, scripts, configs, and relevant tests. Stop on unexpected state.
- On Windows runner work, obey `EXECUTION_GUARDRAILS.md` and Windows PowerShell 5.1 compatibility.

## Documentation discipline

- A material product or architecture decision requires an append-only entry in `docs/stayopti/DECISION_LOG.md`.
- A validated checkpoint requires updating `docs/stayopti/CURRENT_STATE.md` with evidence, not assumptions.
- A new canonical source requires an entry and SHA-256 in `docs/stayopti/SOURCE_REGISTRY.md`; never overwrite an existing canonical source in place.
- When sources conflict, do not guess. Apply the precedence rules in `SOURCE_REGISTRY.md`, record the conflict, and ask for a decision if no explicit later authority resolves it.
- Do not change the Product Constitution implicitly as a side effect of implementation.

## Completion report

Report: files changed, product/decision impact, tests and evidence, external calls, repository mutations, remaining uncertainty, and whether commit/push occurred.
