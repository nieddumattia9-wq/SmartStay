# StayOpti Decision Log

This is an append-only index. Full records live in `decisions/`. Do not erase or rewrite an accepted decision; add a new record that explicitly supersedes it.

| ID | Date | Decision | Status | Record |
|---|---|---|---|---|
| D-0001 | 2026-08-17 | Store product memory, original sources, current state, and operating rules inside the repository and make Codex read them via `AGENTS.md`. | Accepted | `decisions/0001-persistent-project-memory.md` |

## Required fields for a new decision

- context and problem;
- decision and scope;
- product rationale;
- evidence reviewed;
- alternatives rejected;
- risks and safeguards;
- implementation consequences;
- validation and rollback;
- approver;
- supersedes / superseded by.

Material decisions include product promise, ranking semantics, recommendation roles, profile behavior, data contracts, safety gates, provider/commercial separation, public rollout, and changes to this Constitution.
