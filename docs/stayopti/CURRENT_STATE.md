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

## V3-17S public real-world hotel-choice source qualification — source-access hold

Source checkpoint: `3d1f3591f4b89ae484d19cb4d7fdfbaf5526180c`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17S final receipt.

- Five primary candidate sources were audited. None currently combines ungated primary access with a dataset license verified for persistent StayOpti use: zero qualified, three conditional, two rejected for the decision-replay purpose.
- Trivago RecSys Challenge 2019 is the primary conditional candidate because it retains impression choice sets, displayed prices and click-out labels. Its dataset requires account access and acceptance of terms; neither action was performed and commercial use remains unknown.
- Expedia RecTour documents about 2.5M real lodging searches with impressions, clicks and bookings, but the active primary archive and exact dataset-license binding were not verifiable in this phase.
- A private `ExternalHotelChoiceSessionV3` contract, evidence/bias classifier, license/provenance gate, leakage audit and provider-neutral replay adapter are implemented with synthetic official-schema fixtures only.
- Clicks and bookings remain evaluation labels with confounders, never objective-best labels or pre-decision features. One search session is one replay unit; hotel rows do not inflate the denominator.
- External observational data remains separate from live Golden, Decision Science, synthetic counterfactual, blind judgment and future StayOpti outcome corpora. No automatic migration is allowed.
- The target of 100 independent provider-neutral replays is planned and stratified but remains uncollected. Real Golden cases and real judgments remain zero; V3-17 remains unmet and V3-18 remains blocked.
- No provider call, credential load, training, calibration, V3 weight change, public runtime change, booking, deploy, push or fetch occurred.
- Validation on 2026-08-31: V3-17S targeted `19/19 PASS`; combined V3-17Q/R/S targeted `67/67 PASS`; Engine V3 `984/984 PASS`; Engine V2 `196/196 PASS`; TypeScript, B1 capsule, B1 blind pipeline, B2 corpus, legacy quarantine, F0B/F0C/F0D, privacy/license scans and Git checks PASS.
- Public research used 29 bounded documentation/search fetch operations and downloaded no dataset archive. Provider HTTP requests remained zero.

Next recommendation: `V3-17S.1_TRIVAGO_DATASET_TERMS_LICENSE_AND_USER_ACCESS_DECISION_GATE`. The user must personally decide any terms acceptance; this recommendation is not authorization to ingest data or start V3-18.

## V3-17S.1 external source-role correction — source-access hold, real-Golden path open

Source checkpoint: `48ee75d72c4d15718ccc782922536c8712fb0cf5`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17S.1 final receipt.

- The V3-17S source-access hold remains historical and valid, but its source-role ordering is prospectively corrected: Expedia RecTour is the primary booking-choice target; Trivago RecSys 2019 is a secondary session-intent/click benchmark; Expedia Personalized Sort is a conditional click-and-booking ranking benchmark.
- The official Trivago data portal reproduced `502 Bad Gateway`. Its surviving official materials describe click-out prediction, not completed-booking ground truth.
- No current official RecTour data archive was found. The paper license, dataset-license statements and actual file license remain separate: the paper is CC BY 4.0, an official presentation describes dataset terms as CC BY-NC 4.0 plus additional terms, but the actual file and accompanying license were not retrievable.
- Official Kaggle metadata says Expedia Personalized Sort is subject to Competition Rules and requires the user to sign in or register and accept those rules before viewing data. No terms were accepted and no file was downloaded.
- A private provider-neutral source registry now freezes role, outcome, field coverage, access, provenance, license, commercial-use, ingestion and Golden-boundary status. Current admitted sources: zero.
- Click and booking remain confounded labels; external replay is never real Golden and never changes V3 automatically.
- External source access is a future accelerator, not a blocker for an independently authorized LiteAPI real-Golden pilot. Real Golden cases and judgments remain zero, V3-17 remains unmet and V3-18 remains blocked.
- No provider call, credential load, dataset ingestion, public runtime change, booking, deploy, push or fetch occurred.
- Validation on 2026-08-31: V3-17S.1 targeted `10/10 PASS`; combined V3-17S/S.1 `29/29 PASS`; Engine V3 `994/994 PASS`; Engine V2 `196/196 PASS`; TypeScript, source-license/provenance, privacy and Git checks PASS.

Next recommendation: `V3-17T_LITEAPI_BOUNDED_PRODUCTION_REAL_GOLDEN_PILOT_AUTHORIZATION_GATE`. It is an authorization gate only; no production call is permitted without a new explicit user authorization.

## V3-17T0A provider-ID-neutral decision boundary — completed

Source checkpoint: `3639761f5eca8a2990981e706ccde616cff21b67`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17T0A final receipt.

- The V3-17T0 root cause is confirmed: provider-derived `solutionId`/`hotelId` values were used to break otherwise exact ties in Personal Utility Role Policy, Search-wide Scale Coverage and Decision Robustness.
- A shared provider-neutral tie projection now excludes opaque identity, provider, raw payload and commercial fields. Exact semantic ties are `DECISIONALLY_EQUIVALENT`; no arbitrary winner or superiority claim is created.
- Opaque IDs remain available only for lookup, correlation, provenance, trace and source-output mapping. The LiteAPI provider runtime and public V2 remain unchanged.
- Dedicated regressions vary provider name, hotel ID, offer ID, solution ID and input order while preserving the identity-elided decision. Real semantic differences still produce a winner.
- The re-audit finds no provider-runtime import in the V3 core and no forbidden core dependency. LiteAPI-specific code remains confined to the private adapter/pilot boundary.
- Validation on 2026-09-01: targeted V3-17T0A `57/57 PASS`; V3-17Q `16/16`, V3-17R gate `23/23`, V3-17R execution `9/9`, V3-17S `19/19`, V3-17S.1 `10/10`; Engine V3 `1003/1003 PASS`; Engine V2 `196/196 PASS`; TypeScript, B1 capsule, B1 blind pipeline, B2 corpus, legacy quarantine and F0B/F0C/F0D PASS. Final integrity scans and Git checks are recorded in the phase receipt.
- No credential, provider call, HTTP request, deploy, push or fetch occurred. V3 remains non-public and the seven pre-existing unrelated dirty paths remain outside this checkpoint.

Next recommendation: `V3-17T_PROVIDER_AGNOSTIC_REAL_MARKET_SOURCE_QUALIFICATION_GATE`.

## V3-17T SerpApi Google Hotels source qualification — conditional user access

Source checkpoint: `bcce90c8663cce92c8242ad5451a5619158f6331`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17T final receipt.

- SerpApi Google Hotels is conditionally qualified as `REAL_PUBLIC_MARKET_CHOICE_SET_SOURCE`; its records are `REAL_PUBLIC_MARKET_SNAPSHOT_CANDIDATE`, never booking/click/outcome evidence, real Golden cases or a StayOpti runtime provider.
- Official pricing at the 2026-09-01 evidence cutoff listed a free tier with 250 searches/month and throughput 50/hour. Account and terms acceptance are required. Public pages did not state individual eligibility, a VAT-number requirement or card requirement, so none is inferred.
- Internal evaluation and sanitized persistence remain conditional on a later user/legal retention decision. Redistribution is prohibited absent express written permission. No account was created and no terms were accepted.
- An evaluation-only adapter maps caller-supplied synthetic/schema-compatible responses into `ExternalHotelChoiceSessionV3`. It performs no fetch or credential access, persists no source token/seller value/raw payload and cannot be imported by V3 core or provider runtime.
- Nightly, total, before-tax, lowest-observed, seller-specific, exact-bookability, freshness and cache semantics stay separate. Missing values remain unknown; sponsored/rank/pagination are bias evidence, not quality.
- A twelve-session future pilot and theoretical 48-call ceiling are proposed but not authorized. Dates, credits, rights, `no_cache`, enrichment selection and hard transport limits must be frozen in a separate gate.
- A pre-existing date-bound regression fixture reached its `2026-09-01` cancellation boundary during this phase. Three test-only fixtures were moved coherently to 2099; isolated probes confirmed the cause. No Engine V2/V3 runtime or policy changed.
- Validation on 2026-09-01: V3-17T targeted `25/25 PASS`; V3-17T0A `57/57`; V3-17Q/R/S/S.1 `77/77`; Engine V3 `1028/1028 PASS`; Engine V2 `196/196 PASS`; TypeScript, B1 capsule, B1 blind pipeline, B2 corpus, legacy quarantine, F0B/F0C/F0D, source-license/provenance and integrity scans PASS.
- Public research used 26 bounded official documentation/search operations. SerpApi API calls, Google Hotels queries, provider calls, credential loads, real sessions, Golden candidates, judgments, booking, deploy, push and fetch were zero.

Next recommendation: `V3-17T1_SERPAPI_GOOGLE_HOTELS_12_SESSION_PILOT_AUTHORIZATION_GATE`. It is an authorization gate only; V3-17 remains unmet and V3-18 remains blocked.

Determine the next package from the newest Evidence and repository state. Do not infer it only from an old alphabetical package label. After every accepted checkpoint, update this file with the exact commit, suites, evidence filename, external calls, and remaining blockers.
