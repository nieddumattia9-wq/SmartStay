# StayOpti Decision Log

This is an append-only index. Full records live in `decisions/`. Do not erase or rewrite an accepted decision; add a new record that explicitly supersedes it.

| ID | Date | Decision | Status | Record |
|---|---|---|---|---|
| D-0001 | 2026-08-17 | Store product memory, original sources, current state, and operating rules inside the repository and make Codex read them via `AGENTS.md`. | Accepted | `decisions/0001-persistent-project-memory.md` |
| D-0002 | 2026-08-17 | Repair the V3-17 measurement foundation with forward-only normalized source capsules, role-independent blind review and fail-closed external baseline parent resolution, without creating or counting decision evidence. | Accepted | `decisions/0002-v3-17-measurement-foundation.md` |
| D-0003 | 2026-08-20 | Preserve the fifteen V3-12A judgments as byte-bound legacy diagnostic context while blocking replay, Golden, tuning, scoring, ranking, trace, promotion and V3-12B use. | Accepted | `decisions/0003-v3-12a-legacy-diagnostic-quarantine.md` |
| D-0004 | 2026-08-31 | Hold the V3-17R LiteAPI Sandbox pilot before credentials and network until sandbox identity and zero account-specific cost are deterministically documented; keep a private five-request bounded governor ready offline. | Accepted | `decisions/0004-v3-17r-liteapi-sandbox-pre-network-hold.md` |
| D-0005 | 2026-08-31 | Accept the user's corrected LiteAPI Sandbox identity/cost attestations, verify the common base plus sandbox key class locally without retention, and execute the one authorized five-Rates diagnostic wave while excluding every result from real Golden counts. | Accepted; prospectively supersedes D-0004 hold-removal criteria | `decisions/0005-v3-17r2-liteapi-sandbox-bounded-pilot.md` |
| D-0006 | 2026-08-31 | Keep external observational hotel-choice behavior in a separate fail-closed corpus; treat click/booking only as confounded labels, require primary provenance and admitted license, and prohibit automatic Golden admission or V3 weight changes. | Accepted | `decisions/0006-v3-17s-external-observational-choice-data.md` |
| D-0007 | 2026-08-31 | Correct external source roles so Expedia RecTour is the primary booking-choice target, Trivago is a secondary click/session benchmark and external access never blocks independently governed real-Golden collection. | Accepted; prospectively supersedes only D-0006 source-role ordering | `decisions/0007-v3-17s1-external-source-role-correction.md` |
| D-0008 | 2026-09-01 | Keep provider identity as opaque lookup/provenance only; resolve V3 decision ties exclusively from canonical evidence and preserve exact semantic ties as `DECISIONALLY_EQUIVALENT`. | Accepted | `decisions/0008-provider-id-neutral-decision-ties.md` |
| D-0009 | 2026-09-01 | Qualify SerpApi Google Hotels only as a conditional real-market evaluation source behind the external choice contract; prohibit runtime/core coupling, raw persistence and automatic Golden or policy promotion. | Accepted | `decisions/0009-serpapi-google-hotels-evaluation-source.md` |
| D-0010 | 2026-09-01 | Freeze a fail-closed twelve-session SerpApi pilot gate with immutable inputs, exact post-manifest authorization, process-only secret handling and ephemeral raw retention. | Accepted; calls and retention remain unauthorized | `decisions/0010-v3-17t1-serpapi-pilot-authorization-gate.md` |
| D-0011 | 2026-09-01 | Revoke the incomplete manifest-only SerpApi literal and bind any future pilot authorization to a replayable sanitized snapshot/Evidence bundle, retention version and runner hash. | Accepted; calls and retention remain unauthorized | `decisions/0011-v3-17t1a-serpapi-evidence-bundle-repair.md` |
| D-0012 | 2026-09-01 | Revoke the direct MAX48 SerpApi path and require a four-call one-session canary followed by manual Evidence review and separately ZIP-hash-bound authorization for the remaining eleven sessions. | Accepted; calls and retention remain unauthorized | `decisions/0012-v3-17t1b-serpapi-staged-canary-gate.md` |
| D-0013 | 2026-09-01 | Replace the failed pasted canary wrapper with a hash-bound, fail-visible, no-exit PowerShell handoff that preserves MAX4 and separate authorization. | Accepted; calls and retention remain unauthorized | `decisions/0013-v3-17t1c-canary-handoff-failure-visibility.md` |
| D-0014 | 2026-09-01 | Preserve the first SerpApi data canary as aborted, reject its Evidence for resume, retain observed display prices without exact-price promotion and require a new two-call authorization. | Accepted; all new calls and Stage REMAINING remain unauthorized | `decisions/0014-v3-17t2ab-canary-abort-repair.md` |
| D-0015 | 2026-09-01 | Retain paid provider raw only in a private, AES-GCM-encrypted, Windows-user-protected and expiring quarantine; keep replay offline and adapter-bound. | Accepted; raw retention authorized, provider calls remain unauthorized | `decisions/0015-provider-raw-private-quarantine.md` |
| D-0016 | 2026-09-01 | Bind any future SerpApi repair canary to one session, one main search, one detail and two calls total, with encrypted quarantine, autostop and no remaining-stage authority. | Accepted; exact literal generated but calls remain unauthorized | `decisions/0016-v3-17t2b-max2-reauthorization-gate.md` |

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
