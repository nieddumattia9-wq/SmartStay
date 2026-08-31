# StayOpti Current State

Updated: 2026-08-17  
Status: last reported evidence-backed checkpoint, not a substitute for inspecting the repository

## Mandatory verification

Before any mutation, verify and report:

- repository path is the intended StayOpti repository;
- current branch and HEAD;
- `origin/main` relationship;
- staged, unstaged, and untracked state;
- canonical npm scripts and relevant tool versions;
- newest applicable Evidence artifact.

If repository reality differs from this file, stop and collect read-only evidence. Do not force the repository to match this document.

## Repository alignment after canonical-context installation

- repository `HEAD` immediately after the documentation-only canonical-context installation: `993da13330a96ef29cad8433b4a13a060dc6ed9a`;
- `origin/main` was aligned with that commit and the working tree was clean;
- the installation changed only `AGENTS.md` and `docs/stayopti/**`;
- no application code, dependencies, tests, or configuration files changed;
- the last functional V3-17BF checkpoint remains `12a39af8a5485ac92257fd8207282c6ae1c1810d`.

## Last functional checkpoint before context installation

The most recently accepted functional state reported in the working conversation is after V3-17BF, Golden Negative Outcome Baseline Binding:

- functional checkpoint commit: `12a39af8a5485ac92257fd8207282c6ae1c1810d`;
- Engine V2 canonical suite: `196/196 PASS`;
- Engine V3 suite: `360/360 PASS`;
- provider suite: `46/46 PASS`;
- lifecycle V2, typecheck, and build: PASS;
- working tree: reported clean;
- public baseline: V2 protected;
- V3: not public; promotion remains controlled and manual;
- split stay: not a substitute for an immature single-stay policy.

These values are historical assertions until revalidated locally.

## Program progress

- V3-00 through V3-16: reported complete in the integrated execution program.
- V3-17 Golden Decision Dataset work: active; numerous baseline cases and recovery cases have been executed.
- Multi-room prebook aggregation and failed-slot recovery underwent controlled repair and verification.
- Incorrect favorable-price/savings promotion, including behavior affecting Comfort and Maximum Comfort, was diagnosed and repaired.
- Negative-outcome and upstream failure accounting work reached V3-17BF.
- Dataset quality remains the objective: cases must contribute meaningful traveler decisions, not random test volume.

## Frozen direction

- V2 remains the public safety baseline.
- V3 remains offline/shadow until Golden Dataset, blind evaluation, calibration, robustness, fairness, abstention, and critical-regression gates are satisfied.
- No claim of V3 superiority or public readiness is valid from module count or test count alone.
- Public progression is `off → shadow → guarded-shadow → canary → public-eligible → manual authorization`.

## V3-17 Measurement Foundation Repair 001 — completed

Functional checkpoint: `0572b111fa4c98cfb16c32f9c6c294d6a1967155` (`feat(engine-v3): add measured decision foundation`). It was created from the verified `main` baseline `1a74be464bc56168d80a402663ad4a3bea103e5b`, which was aligned with `origin/main` and clean before implementation. Measurement Foundation Repair 001 is complete; the V3-17 audit verdict remains `GATE NOT MET`.

- The 115 existing Golden Receipts remain valid plumbing/binding evidence. They are not retroactively represented as decision-quality evidence.
- The five `decisionResearchUsable` cases remain useful research material, but they have not been blind-adjudicated and do not count as human or expert judgments.
- The Lisbon case cannot be retrofitted safely as Golden decision evidence because no complete replayable normalized snapshot was retained.
- Future real cases must use forward-only normalized source capsules with source hash, provenance, deterministic fingerprint and enough redacted evidence for offline replay.
- Blind review now supports `option-a`, `option-b`, `tie`, `no-good-option` and `insufficient-information` without requiring a role, engine, provider or original alternative order in the visible question. Role determination can occur only after a valid response.
- AI output is never counted as a human or expert judgment. Contract-test responses are explicitly technical, excluded from aggregation and leave the fixture `unmeasured`.
- External adversarial parents require an explicit canonical registry and exact case ID, content hash, dataset version and schema version; unresolved, ambiguous or altered references fail closed.
- This repair adds no real case and changes no V3-17 evidence count: Golden Receipts `115 → 115`, `decisionResearchUsable` `5 → 5`, eligible Golden cases `+0`, adversarial cases `+0`, counterfactual cases `+0`, human judgments `+0`, expert judgments `+0`.
- Validation on 2026-08-17: Engine V3 `370/370 PASS`; Engine V2 `196/196 PASS`; provider suite `46/46 PASS`; lifecycle V2 `122 PASS`, `17 SKIP`, `0 FAIL`; typecheck, build, repository-boundary checks and both Git diff checks PASS.
- Public V2 is protected and unchanged. V3 remains offline/shadow and non-public. SPLIT remains disabled. No provider or other external call, booking, payment or deployment occurred during implementation.

## Next-action rule

## V3-17R LiteAPI Sandbox bounded pilot gate — safe hold

Source checkpoint: `69715d22fc16b75460a4517cf80dc56eb1f2e4f2`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17R final receipt.

- The conditional five-request LiteAPI Sandbox authorization was not consumed. Credentials were not loaded and provider/HTTP calls were zero.
- The pre-network result is `SAFE_HOLD_PRE_NETWORK`: neither sandbox account/base identity nor zero account-specific cost is deterministically attested by repository evidence.
- A private, offline governor now freezes five diagnostic search families and enforces Rates-only, five HTTP maximum, no retry/redirect, concurrency one, 1,000 ms pacing, one request per family, one wave and no production fallback.
- Frozen plan SHA-256: `34e450c9cfafad2fec76898dc74c4b935dbe7f6ac3485f45e9068078ae557c9a`.
- Any future sandbox output remains `SANDBOX_DIAGNOSTIC_NOT_REAL_GOLDEN`; real Golden cases and judgments remain zero, V3-17 remains unmet and V3-18 remains blocked.
- Validation on 2026-08-31: V3-17R targeted `23/23 PASS`; V3-17Q plus V3-17R `39/39 PASS`; Engine V3 `956/956 PASS`; Engine V2 `196/196 PASS`; TypeScript, B1 capsule, B1 blind pipeline, B2 corpus, legacy quarantine and F0B/F0C/F0D PASS. Final integrity scans and Git checks are recorded in the phase receipt.
- The hold can be reconsidered only after account-specific evidence binds the intended account and base URL to LiteAPI Sandbox and proves that the exact bounded Rates traffic has zero cost. A later live attempt requires an explicit authorization gate.

Next recommendation: `V3-17R.1_LITEAPI_SANDBOX_IDENTITY_AND_ACCOUNT_ZERO_COST_EVIDENCE_GATE`.

## V3-17R.2 LiteAPI Sandbox bounded pilot — completed

Source checkpoint: `2b448470c2782834da62d89850d2f4f127998b0d`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17R.2 final receipt.

- The prior safe hold remains historical evidence. The user prospectively supplied the Sandbox identity and zero-cost attestations and clarified that LiteAPI uses the common `https://api.liteapi.travel/v3.0` base while the credential prefix distinguishes Sandbox.
- A local, non-persisting check observed the exact base, exact Rates path, and an allowlisted Sandbox credential prefix. No credential value, length, hash, or fragment was printed or retained.
- The previously authorized wave was executed exactly once and consumed: five sequential Rates requests, zero retry, zero redirect, zero other endpoints, maximum concurrency one, and minimum observed request-start interval 1092.7414 ms.
- All five frozen families returned processable results. Raw/normalizable counts were 45/45, 39/39, 56/56, 22/22, and 23/23.
- Five provider-neutral snapshots and twenty sandbox diagnostics were created outside the public runtime. They are `SANDBOX_DIAGNOSTIC_NOT_REAL_GOLDEN`; all remain excluded from real Golden counts because bounded Sandbox collection does not prove provider exhaustion.
- Field coverage across five families was 45 available, 25 explicit unknown, and 10 not required observations over the sixteen-field contract. Missing evidence was not invented.
- No raw response, provider identifier, header, session value, credential, booking, prebook, payment, production request, RouteStack request, RateHawk request, deploy, push, or fetch was persisted or performed beyond the five authorized Sandbox Rates calls.
- Post-wave validation: targeted V3-17Q/R/R.2 `48/48 PASS`; Engine V3 `965/965 PASS`; Engine V2 `196/196 PASS`; TypeScript, B1 capsule, B1 blind pipeline, B2 corpus, legacy quarantine, F0B/F0C/F0D, integrity scans, and Git checks PASS.
- Real Golden cases remain zero; real judgments remain zero; V3-17 remains unmet; V3-18 remains blocked; public V2 and Split `OFF` remain unchanged.

Next recommendation: `V3-17S_LITEAPI_REAL_GOLDEN_COLLECTION_CONTRACT_AND_AUTHORIZATION_GATE`. This is an offline authorization/contract gate, not implicit permission for another provider call.

Determine the next package from the newest Evidence and repository state. Do not infer it only from an old alphabetical package label. After every accepted checkpoint, update this file with the exact commit, suites, evidence filename, external calls, and remaining blockers.
