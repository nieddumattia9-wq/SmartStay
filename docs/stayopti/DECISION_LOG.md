# StayOpti Decision Log

This is an append-only index. Full records live in `decisions/`. Do not erase or rewrite an accepted decision; add a new record that explicitly supersedes it.

| ID | Date | Decision | Status | Record |
|---|---|---|---|---|
| D-0001 | 2026-08-17 | Store product memory, original sources, current state, and operating rules inside the repository and make Codex read them via `AGENTS.md`. | Accepted | `decisions/0001-persistent-project-memory.md` |
| D-0002 | 2026-08-17 | Repair the V3-17 measurement foundation with forward-only normalized source capsules, role-independent blind review and fail-closed external baseline parent resolution, without creating or counting decision evidence. | Accepted | `decisions/0002-v3-17-measurement-foundation.md` |
| D-0003 | 2026-08-20 | Preserve the fifteen V3-12A judgments as byte-bound legacy diagnostic context while blocking replay, Golden, tuning, scoring, ranking, trace, promotion and V3-12B use. | Accepted | `decisions/0003-v3-12a-legacy-diagnostic-quarantine.md` |

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
