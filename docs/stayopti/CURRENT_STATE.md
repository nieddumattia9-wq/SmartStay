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

## V3-17T1 SerpApi Google Hotels pilot authorization gate — ready

Source checkpoint: `640570740317cd36901fb605d73e6b7aeeadaff5`; the implementation checkpoint is the local commit containing this entry and is reported in the V3-17T1 final receipt.

- The user reports a personally created SerpApi Free owner account with API access and no VAT-number or payment-card request during signup. No account interaction or independent credential inspection occurred in T1.
- Twelve independent European sessions, exact dates, occupancy, budgets, profiles and constraints are frozen under manifest SHA-256 `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
- The gate remains `READY_FOR_EXPLICIT_AUTHORIZATION`. Calls and retention are not authorized; credentials, provider calls and HTTP requests are zero.
- The future evaluation-only collector requires the exact hash-bound literal, an exact execution HEAD, explicit retention consent, an unexpired manifest and `SERPAPI_API_KEY` supplied only through the process environment.
- Hard limits are 12 main searches, at most three detail requests per session, 48 total, concurrency one, retry zero and no automatic pagination, reviews, photos, redirect, booking, prebook, payment or provider fallback.
- Raw JSON is temporary outside the repository and delete-always; only provider-neutral sanitized snapshots and receipts may persist after future authorization.
- Real sessions, Golden candidates, admitted Golden cases and judgments remain zero. V3-17 remains unmet and V3-18 remains blocked.
- Public V2, V3 decision core, weights, provider runtime, Split `OFF` and booking flow remain unchanged.
- Validation on 2026-09-01: V3-17T1 targeted `38/38 PASS`; V3-17T `25/25`; V3-17T0A provider-neutrality `5/5`; V3-17Q/R/S/S.1 `77/77`; Engine V3 `1066/1066 PASS`; Engine V2 `196/196 PASS`; TypeScript, B1 capsule, B1 blind pipeline, B2 corpus, legacy quarantine and F0B/F0C/F0D PASS. Secret, raw-ID, license/provenance and Git checks are recorded in the phase receipt.
- No credential, SerpApi call, Google Hotels query, provider call, HTTP request, account interaction, browser, deploy, push or fetch occurred. The seven pre-existing unrelated dirty paths remain outside this checkpoint and byte-identical.

Next recommendation: `V3-17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_BOUNDED_PILOT_EXECUTION`. It requires a new user message containing the exact published authorization literal and retention approval; this T1 checkpoint is not permission to call.

## V3-17T1A SerpApi pilot Evidence repair — ready for exact reauthorization

Source checkpoint: `ecdeda1edc3dc88044c59ac39807a30e478f215e`; the
implementation checkpoint is the local commit containing this entry and is
reported in the V3-17T1A final receipt.

- The T2 preflight root cause is preserved: the prior runner exported only
  fingerprints, produced no Evidence ZIP and did not execute details. It sent
  zero requests and consumed no authorization.
- The old manifest-only literal is revoked. The unchanged manifest
  `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`
  is now bound to runner bundle
  `67cfd073efbc3177590c9a05feafb1612cc09c359421791414a3c5fadd901cd6`,
  retention policy version 2 and the unchanged 48-call ceiling.
- The future evaluation collector exports and rereads the full sanitized
  choice-set snapshot before verified raw deletion, executes at most three
  semantic property details per session and keeps opaque identity out of
  selection and decision inputs.
- The PowerShell 5.1 launcher now creates, extracts and validates a sanitized
  Evidence ZIP outside the repository. Complete and partial bundles bind
  manifest, ledger, snapshots, deletion evidence, scans and checksums for T3.
- The new exact literal is published in the T1A phase document but remains
  unauthorized. Credentials, SerpApi calls, Google Hotels queries and HTTP
  requests in T1A are zero.
- Validation on 2026-09-01: V3-17T1A targeted `44/44 PASS`; selected
  V3-17T/T1/T0A/Q/R/S/S.1 plus B1/B2/legacy/F0 regressions `220/220 PASS`;
  Engine V3 `1110/1110 PASS`; Engine V2 `196/196 PASS`; TypeScript and the
  requested offline integrity gates PASS.
- Real sessions, Golden candidates, Golden cases and judgments remain zero;
  V3-17 remains unmet and V3-18 remains blocked. Public runtime, providers,
  weights, thresholds and booking remain unchanged.

Next recommendation:
`V3-17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_BOUNDED_PILOT_REAUTHORIZATION`.
It requires a later user message containing the exact new literal and explicit
retention-v2 approval.

## V3-17T1B SerpApi staged canary gate — ready for canary reauthorization

Source checkpoint: `4986771e17e9ba9c5649c2b4732d9a25dcccc991`; the
implementation checkpoint is the local commit containing this entry and is
reported in the V3-17T1B final receipt.

- The immutable twelve-session manifest remains
  `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
- The unconsumed T1A MAX48 literal is revoked. Stage A is now only the first
  frozen session, capped at four calls and forced to stop; Stage B is a
  separate process for the remaining eleven, capped at 44.
- Stage B requires a PASS canary Evidence ZIP, checksum/archive/T3/cleanup
  validation, manual review and a new authorization literal bound to the ZIP
  SHA-256. That literal cannot exist before a successful canary.
- The new runner bundle is
  `c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01`.
  The exact canary literal is published in the phase document and remains
  unauthorized.
- A fail-closed staged request ledger prevents concurrency, duplicate,
  out-of-stage and over-cap requests before transport. Raw payloads remain
  temp-only and delete-always; abort Evidence is sanitized.
- Credentials, SerpApi calls, Google Hotels queries, provider calls and HTTP
  requests are zero. Real sessions, Golden candidates, Golden cases and
  judgments remain zero. V3-17 remains unmet and V3-18 remains blocked.
- Public V2, the V3 decision core, provider runtime, weights, thresholds,
  Split `OFF` and booking remain unchanged.

- Validation on 2026-09-01: V3-17T1B `44/44 PASS`, including all eleven
  injected fault boundaries; T1A `44/44`; T1 `38/38`; selected T,
  provider-neutrality, B1/B2 and legacy regressions `48/48`; Engine V3
  `1154/1154`; Engine V2 `196/196`; TypeScript, PowerShell 5.1 parsing,
  F0B/F0C/F0D, security, license/provenance and Git integrity gates PASS.

Next recommendation:
`V3-17T2_SERPAPI_GOOGLE_HOTELS_ONE_SESSION_CANARY_REAUTHORIZATION`.
It requires a later user message containing the exact canary literal and
retention-v2 authorization. It does not authorize Stage B.

## V3-17T1C SerpApi canary handoff repair — ready for new authorization

Source checkpoint: `126b178f8d380e3b5b849906b6ffc34787035f58`; the
implementation checkpoint is the local commit containing this entry and is
reported in the V3-17T1C final receipt.

- The attempted T2 handoff is preserved as unconsumed: no API-key prompt or
  entry, user-verified SerpApi calls and credits zero, and no Evidence ZIP.
- Offline reproduction identified Windows PowerShell 5.1 execution-policy
  rejection of the committed launcher before its body, followed by the pasted
  wrapper's process termination. No provider-capable code was reached.
- A committed handoff now performs all checkpoint, dirty-set, bundle,
  compilation, manifest, literal, runner and launcher checks; it uses a
  process-only policy allowance for the verified scripts and no process exit.
- The launcher exposes `-HandoffPreflightOnly`, which reaches immediately
  before the secure prompt with zero credentials, zero calls and no execution
  Evidence.
- PASS and FAIL both produce an atomic allowlisted diagnostic log and a visible
  final pause. Secret, URL, property-token, raw-payload and raw-ID values are
  excluded.
- The manifest is unchanged. Bundle
  `d3176600f3d028c450174b7e14de87084a3eab549eb60350f260043539a08683`
  revokes the unconsumed `c412...MAX4` literal. The new MAX4 literal is
  published but not authorized.
- The canary remains only Florence index 0, at most four sequential calls;
  Stage B remains unreachable and separately authorized.
- No credential, provider call, HTTP request, public-runtime change, push or
  fetch occurred. V3-17 remains unmet and V3-18 remains blocked.
- Validation on 2026-09-01: T1C `30/30`, T1B `44/44`, T1A `44/44`, T1
  `38/38`, T `25/25`, provider neutrality `5/5`, Engine V3 `1184/1184`,
  Engine V2 `196/196`, B1/B2/legacy `18/18`, F0 `39/39`, TypeScript,
  PowerShell 5.1 parsing and all requested integrity scans PASS.

Next recommendation:
`V3-17T2_SERPAPI_GOOGLE_HOTELS_ONE_SESSION_CANARY_REAUTHORIZATION_WITH_HANDOFF_V2`.

## V3-17T2A/T2B SerpApi canary abort audit — repaired MAX2 gate ready, unauthorized

Source checkpoint: `e4edc0cdbf61764a992cc94a882837208e11aa26`; the
implementation checkpoint is the local commit containing this entry and is
reported in the V3-17T2A/T2B final receipt.

- The first authorized data canary consumed exactly two calls: one validated
  main search and one failed property detail. Handoff and Evidence were PASS,
  but the canary is preserved as `ABORTED`, never PASS.
- External Evidence SHA-256
  `c01d8ef81d93ebde18d6eb7249827af2b114d68e04904a664f452bda8bd6333e`
  passed archive integrity and `17/17` internal checksums. It is not copied to
  the repository and is ineligible for Stage REMAINING.
- The sanitized snapshot contains 29 alternatives, including nine sponsored
  entries and 20 with displayed price evidence. It remains
  `IMPRESSION_ONLY`, partial diagnostic evidence and never auto-Golden.
- Because the detail raw response was correctly deleted, the precise provider
  cause is not reconstructable. Future Evidence adds only a fixed sanitized
  response-shape envelope.
- Credential postflight now follows process cleanup; handoff, canary and
  Evidence outcomes are printed separately.
- Displayed Google price evidence is preserved in provider-neutral replay as
  `OBSERVED_AGGREGATED_DISPLAY_PRICE`, never exact, seller-specific or
  checkout-verifiable.
- The new bundle is
  `f4649a0229b60e18908a09f5cf580bbf8e0648cadf987e0b442c6ce225e52e13`.
  A future first-session canary is capped at two calls (one search plus at most
  one detail), but its exact MAX2 literal remains unauthorized.
- This repair performs zero credential loads, SerpApi calls and HTTP requests.
  Stage REMAINING is unauthorized, V3-17 remains unmet and V3-18 remains
  blocked. V2, core V3, providers, ranking, weights and public runtime remain
  unchanged.

Next recommendation:
`V3-17T2C_SERPAPI_GOOGLE_HOTELS_REPAIRED_MAX2_CANARY_EXPLICIT_AUTHORIZATION_GATE`.

## V3-17T2A-R0 private provider-raw quarantine — offline repair complete

Adopted source checkpoint:
`0c052ad1efd579fc6d7ff5a16d7e0bfd8f1d3154`; it is the verified linear
successor of `e4edc0cdbf61764a992cc94a882837208e11aa26`. The implementation
checkpoint is the local commit containing this entry and is reported in the
final T2A-R0 receipt.

- The successor reconciliation passed: 19 evaluation/runner/test/doc paths,
  no merge, secret, raw provider data, real dataset, package, environment or
  public-runtime change.
- The historical Evidence was re-audited offline: ZIP SHA-256 `c01d8ef...6333e`,
  `17/17` checksums, two requests, main search usable, 29 alternatives and
  property detail failure. Handoff remains PASS while canary is ABORTED and
  collection PARTIAL. The deleted detail raw is irrecoverable.
- Provider raw may now persist only in the private `%LOCALAPPDATA%` quarantine:
  AES-256-GCM per payload, fresh data key, CurrentUser DPAPI key protection,
  authenticated metadata, secret rejection and no plaintext at rest.
- Retention is 14 days after successful processing, 90 days for unrecognized,
  partial or error responses, with one controlled 90-day extension before
  expiry. Permanent retention and redistribution remain prohibited.
- Offline replay verifies envelope integrity, AES-GCM authenticity and original
  SHA-256, decrypts in memory only and feeds the same SerpApi evaluation adapter.
  It records parser/schema diagnostics without network, credentials or V3 core
  coupling.
- The future MAX2 runner bundle is
  `e48525178e847c30e0c597ab67671327d5f972763b00882f33fdef111365ddde`.
  No new literal is authorized, no canary runs, Stage REMAINING stays blocked,
  V3-17 remains unmet and V3-18 remains blocked.
- Recovery validation after the interrupted run: targeted and fault-injection
  coverage `167/167 PASS`; Engine V3 `1233/1233 PASS`; Engine V2 `196/196
  PASS`; TypeScript, PowerShell 5.1 parsing, bundle integrity, secret/raw-ID,
  license/provenance and both Git diff gates PASS. The seven unrelated dirty
  paths and the protected environment/package files remain byte-identical.

Next recommendation:
`V3-17T2B_SERPAPI_PROPERTY_DETAIL_MAX2_REAUTHORIZATION_GATE`.

## V3-17T2B SerpApi property-detail MAX2 gate — ready, unauthorized

Source checkpoint: `ed2633c1fc700a9d9199ce920b826d2909543ab8`; the
implementation checkpoint is the local commit containing this entry and is
reported in the final T2B receipt.

- The immutable twelve-session manifest remains bound to
  `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`.
- The prior T2A MAX2 literal is revoked and unconsumed. The replacement literal
  binds the source checkpoint, manifest, complete runner bundle and explicit
  main/detail/session/concurrency/retry/pagination/quarantine/autostop limits.
- The new runner bundle is
  `891a8c2cbf564ab433ec6553f3dffe880981137797fda9ed3fbb513a5d3e7f9c`.
  Its literal is published for later review but remains unaccepted; no network
  authorization exists in T2B.
- The canary request ledger now enforces one validated main search before at
  most one detail, one session and two transmitted calls total. A second main,
  second detail, second session, concurrent request or third request fails
  before transport. Stage REMAINING remains unauthorized.
- Raw provider material remains private and encrypted before stable storage:
  AES-256-GCM, CurrentUser DPAPI-protected key, 14-day successful retention or
  90-day failure/partial retention, offline replay, tamper detection and no
  Evidence-ZIP or automatic-Golden admission.
- Handoff, canary, collection and Evidence outcomes are reported separately.
  A detail failure remains canary `ABORTED` plus collection `PARTIAL`, even when
  handoff and Evidence pass.
- Validation on 2026-09-01: targeted T2B `25/25 PASS`; impacted gate/quarantine
  regressions PASS; Engine V3 `1258/1258 PASS`; Engine V2 `196/196 PASS`;
  TypeScript, PowerShell 5.1, B1 capsule/blind, B2 corpus, legacy quarantine,
  provider neutrality, F0B/F0C/F0D and requested integrity scans PASS.
- Credentials loaded, SerpApi calls, provider calls and HTTP requests are all
  zero. V2, core V3, providers, ranking, weights and public runtime are
  unchanged. V3-17 remains unmet and V3-18 remains blocked.

Next recommendation:
`V3-17T2C_SERPAPI_GOOGLE_HOTELS_MAX2_CANARY_EXPLICIT_AUTHORIZATION_GATE`.

## V3-17T2C-PREFLIGHT SerpApi execution-head binding — ready, unauthorized

Gate checkpoint: `17432a19083403492e3dd28c62affad405c70737`; T2A source:
`ed2633c1fc700a9d9199ce920b826d2909543ab8`. The implementation checkpoint is
the local commit containing this entry and is reported in the final receipt.

- Audit confirmed that the unaccepted T2B literal ambiguously labelled the
  T2A source as `HEAD`; it did not name the actual executable gate commit.
- That literal is invalidated without acceptance or consumption. The final
  literal names `SOURCE_SHA` and `EXECUTION_HEAD` separately.
- Handoff, Node runner and collector now bind the literal to the exact observed
  Git HEAD before credential access and transport, while independently
  verifying manifest and normalized runner-bundle hashes.
- The final execution HEAD remains dynamic and is inserted after commit, so no
  circular commit/hash dependency exists. Any different HEAD needs a different
  literal and new explicit acceptance.
- MAX2, one main plus at most one detail, one session, zero retry/pagination,
  encrypted private quarantine, autostop, no remaining stage and no automatic
  Golden admission remain unchanged.
- T2C-PREFLIGHT loads no credential and performs zero SerpApi, provider or HTTP
  calls. The final literal remains unaccepted; V3-17 and V3-18 remain blocked.
- The normalized runner-bundle SHA-256 is
  `639e58d2ef2eba14741f0b670f2d4ad641e583f08056f2b179eac393d1a896e5`.
  Offline evidence passed: T2C targeted `14/14`, combined T2C/T2B/T2A
  `64/64`, PowerShell handoff `30/30`, Engine V3 `1272/1272`, Engine V2
  `196/196`, TypeScript build and PowerShell 5.1 parse.

Next recommendation:
`V3-17T2C_SERPAPI_GOOGLE_HOTELS_MAX2_CANARY_LITERAL_ACCEPTANCE_GATE`.

## V3-17T2D SerpApi property-detail offline replay — repaired

Source checkpoint: `5c4f2b36568fa825599a62f25e2d2c18b52fb085`; the
implementation checkpoint is the local commit containing this entry and is
reported in the final T2D receipt.

- The sanitized canary Evidence SHA-256 is
  `647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e`;
  all 18 listed internal checksums passed and the two encrypted raw envelopes
  matched the canary session uniquely.
- AES-256-GCM authentication and CurrentUser DPAPI unwrap passed. Replay used
  memory only, left both encrypted files byte-identical and created no
  plaintext file.
- Root cause is demonstrated: the HTTP 200 JSON detail was a valid property
  object returned directly at the response root, while the parser accepted
  only `property`, `properties[0]` or `ads[0]` wrappers.
- The evaluation boundary now supports the direct-root property shape using a
  structural allowlist. Provider errors, asynchronous incomplete statuses,
  non-JSON/wrong-content-type responses and ambiguous shapes remain
  fail-closed.
- Replay after repair preserved the 29-item main choice set and merged exactly
  one detail. The snapshot remains partial diagnostic external evidence,
  never automatically Golden.
- The repaired execution bundle is sealed by
  `e8f81dd4778aa6b15ace287d03bb2ebb908454a349b840357f7a8ac5df19e476`;
  the consumed T2C literal does not authorize this changed bundle and no new
  live authority is created.
- The 20 observed display prices remain
  `OBSERVED_AGGREGATED_DISPLAY_PRICE`; nine missing prices remain missing and
  none is promoted to exact or bookable.
- Credentials and external calls are zero. Stage REMAINING remains
  unauthorized and unstarted; Engine V2, V3 core, ranking, weights, providers
  and public runtime are unchanged.

Next recommendation:
`V3-17T2E_SERPAPI_REPAIRED_DETAIL_OFFLINE_EVIDENCE_SEAL`.

## V3-17T2E SerpApi repaired-detail offline Evidence seal

Source checkpoint: `2ec5cdaf314b363e2b48dbf856badd9c78591f66`; the
implementation checkpoint is the local commit containing this entry and is
reported in the final T2E receipt.

- The original live canary remains `ABORTED`, collection remains `PARTIAL`,
  and its sanitized Evidence remains `PASS`; no historical result is promoted
  or reinterpreted.
- The original Evidence ZIP SHA-256
  `647e4f3dd789e092eaf42a321580d135f3a99e2996d8787215bd984f2123591e`
  and all `18/18` internal checksums passed again.
- Both encrypted raw envelopes matched the canary session uniquely and passed
  AES-256-GCM authentication with CurrentUser DPAPI in memory. They remained
  byte-identical, outside the repository, and no plaintext file was created.
- The controlled pre-repair compatibility replay failed on the direct-root
  property shape as expected; parser
  `stayopti.v3.serpapi-google-hotels-private-replay-parser@2` accepted the
  same encrypted input as `UNWRAPPED_PROPERTY`, preserved 29 alternatives and
  merged one detail with zero network and zero credentials.
- The root cause remains
  `VALID_UNSUPPORTED_UNWRAPPED_PROPERTY_DETAIL_SHAPE`. The offline replay and
  parser repair pass; this does not change the original live abort.
- A fifteen-artifact sanitized Evidence seal binds source Evidence, encrypted
  envelope/file hashes, repair commit, parser fingerprints, before/after
  replay, price semantics, security, provider neutrality and regressions.
  The ZIP stays outside the repository and contains neither raw nor encrypted
  raw, secret, property reference, provider ID, URL or key material.
- The generated package is
  `StayOpti-V3-17T2E-SerpApi-Repaired-Detail-Offline-Evidence-Seal-20260902-095053.zip`
  with SHA-256
  `27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`;
  its 15-artifact roundtrip and 14 internal checksums pass.
- The 20 observed display prices remain
  `OBSERVED_AGGREGATED_DISPLAY_PRICE`; nine missing prices remain missing.
  Automatic Golden admission and Stage REMAINING are still disabled.
- T2E targeted tests pass `25/25`; the combined T2A/T2B/T2C/T2D,
  provider-neutrality and seal regression passes `137/137`; Engine V2 passes
  `196/196`; TypeScript and PowerShell 5.1 parsing pass. The complete Engine
  V3 and final Git postflight counts are reported in the final phase receipt.
- No provider call, HTTP, credential loading, public-runtime change, push or
  fetch occurred in T2E.

Next recommendation: determine the next offline or separately authorized
package from the sealed Evidence and current repository state; T2E grants no
new network authority.

## V3-17T3 repaired snapshot eligibility — diagnostic only

Source checkpoint: `79e3a19d8bbdeb2032fd03d160ce6dbea6bdf302`;
the implementation checkpoint is the local commit containing this entry and
is reported in the final T3 receipt.

- T2E seal SHA-256
  `27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`
  and all `14/14` internal checksums passed. Both encrypted raw envelopes
  authenticated via AES-256-GCM and CurrentUser DPAPI and remained unchanged.
- Offline base/detail replay reconstructed 29 alternatives. Twenty aggregated
  display prices remain observed and non-exact; nine remain missing.
- The detail changed nightly, total and before-tax price evidence for one
  alternative. Those fields are single-item diagnostic only and excluded from
  decision use.
- A provider-neutral diagnostic snapshot was created with SHA-256
  `5cae64e985f844ae89ea84f92458de2acf0aed812836e11b235c480b2bf63925`.
  Original order, sponsorship and source provenance remain only in a separate
  private audit ledger and cannot affect the snapshot fingerprint.
- Eligibility is `DIAGNOSTIC_ONLY`; V3 replay is `NOT_ELIGIBLE`, blind judgment
  is `NO`, Golden admission is `NO`. No capsule, judgment or deblind was
  produced.
- Shared Evidence is
  `StayOpti-V3-17T3-Provider-Neutral-Diagnostic-Evidence-20260902-124430.zip`
  with SHA-256
  `1a669961375fc3838c100c7d7ca03623a9902acab4c87621799366aa671f50a6`.
  It contains seven sanitized entries and six passing internal checksums; raw,
  encrypted raw and the private audit ledger are excluded.
- No network, credential, provider call, ranking/weight change, public-runtime
  change, Stage REMAINING authority, push or fetch occurred.

Next recommendation:
`V3-17T4_COMPARABLE_SET_WIDE_EVIDENCE_REQUIREMENTS_AND_COLLECTION_GATE`.

## V3-17T4 comparable set-wide evidence gate

Source checkpoint: `b859441705a3ef99f62644a05fbebcbeed9d09e7`;
the implementation checkpoint is the local commit containing this entry and
is reported in the final T4 receipt.

- T3 Evidence SHA-256
  `1a669961375fc3838c100c7d7ca03623a9902acab4c87621799366aa671f50a6`
  passes `6/6` checksums; T2E passes `14/14`. Both encrypted raw envelopes
  authenticate offline and remain outside the repository.
- The existing 29-alternative sample remains `DIAGNOSTIC_ONLY`; there is no
  automatic eligibility upgrade, replay, blind judgment or Golden admission.
- Evidence is frozen into diagnostic, limited-comparable and full-decision
  tiers. Comparable sets use minimum five, target eight and maximum ten.
- Full tier requires 100% exact-bookable price, availability, currency,
  stay/occupancy, tax/fee status, freshness, cancellation, room/offer,
  category and symmetric detail coverage. Missing critical fields are not
  allowed.
- The current public-market main search is only partially demonstrated for
  display prices, amenities and freshness. Property detail is demonstrated
  for one structural replay but not for set-wide exact bookability,
  cancellation or availability. Full-tier feasibility is therefore not
  demonstrated.
- The selected future strategy is a limited main-search-only frozen subset:
  one call per session, 12 sessions maximum, retries and pagination zero,
  concurrency one. The all-detail strategy is rejected because its 108 target
  or 132 worst-case calls still cannot prove the full tier.
- No manifest, runner hash or literal was materialized. No provider call,
  HTTP, credential, Stage REMAINING authority, ranking/weight change, public
  runtime change, push or fetch occurred.

Next recommendation:
`V3-17T5_LIMITED_COMPARABLE_MAIN_SEARCH_COLLECTION_AUTHORIZATION_GATE`.

## V3-17T5 limited-comparable CANARY2 gate

Source checkpoint: `d99982ab57d80b0d9d78b8e8470bfd6ed80cb821`;
the implementation checkpoint is the local commit containing this entry and
is reported in the final T5 receipt.

- The canonical twelve-session registry is frozen at SHA-256
  `59d84e01d7c46f8616ed64da90f25701ebd7c8fcc1730ec4c80d3c7100671cb0`.
- CANARY2 deterministically contains Rome solo/budget and Vienna
  family/comfort. REMAINING10 contains the disjoint other ten sessions; their
  union is exactly the original registry.
- The campaign is main-search-only: one request per session, two CANARY2
  calls, ten future remaining calls, twelve theoretical calls total,
  concurrency one, retry and pagination zero, property details zero and
  mandatory autostop.
- Both CANARY2 sessions must independently reach
  `LIMITED_COMPARABLE_JUDGMENT`; one diagnostic-only or failed session aborts
  the stage. Missing prices remain a separate denominator and observed display
  prices remain non-exact.
- The private encrypted quarantine is mandatory. Provider identity,
  sponsorship, original order and property tokens cannot affect selection or
  enter shared Evidence.
- The post-commit literal binds source SHA, exact execution HEAD, campaign,
  CANARY2, registry and runner-bundle hashes. It is generated for user review
  but remains unaccepted. No REMAINING10 literal exists.
- Targeted T5 tests pass `42/42`; full canonical regressions and the exact
  post-commit PowerShell preflight are reported in the final phase receipt.
- No HTTP, provider call, credential loading, public-runtime change, Golden
  admission, push or fetch occurred in T5.

Next recommendation:
`V3-17T6_CANARY2_LITERAL_ACCEPTANCE_AND_CONTROLLED_HANDOFF`.

## V3-17T5A-R0 manual public-market Decision Golden gate

Reconciled base: `47b4075043afcd151a8f4f8fa8b5a8d3f2aaf669`;
the implementation checkpoint is the local commit containing this entry and
is reported in the final T5A-R0 receipt.

- The previous T5 commit is preserved forward-only as
  `DORMANT_DIAGNOSTIC_ONLY`. Its CANARY2 literal is revoked, unaccepted, and
  rejected as `AUTHORIZATION_REVOKED_OR_EXECUTION_HEAD_MISMATCH`; REMAINING10
  is unauthorized and unreachable.
- The active gate is a local manual capture of five to eight alternatives
  under one logged-out consumer surface, shared currency/occupancy/config and
  collection window, full pre-checkout prices, observed availability and
  frozen pre-judgment selection.
- `PUBLIC_PRECHECKOUT_VERIFIED_PRICE` preserves observed amounts and
  missingness while fixing purchase, booking, exact-bookability and verified
  checkout claims to false.
- Screenshots, URLs, saved pages and real names stay in the existing
  AES-256-GCM plus Windows CurrentUser DPAPI private-evidence boundary outside
  the repository. Shared Evidence and blind capsules exclude them.
- Provider-neutral snapshots exclude source order, sponsorship and private
  identity. Blind judgment is required before V3 reveal. Automatic Decision
  Golden admission is impossible; Live Bookable Golden is unavailable and
  the T3 sample remains diagnostic-only.
- No real capture, judgment, HTTP, provider call, Product API, credential,
  scraping, booking, public-runtime/weight change, push or fetch occurred.

Next recommendation:
`V3-17T5B_MANUAL_PUBLIC_MARKET_DECISION_GOLDEN_CANARY`.

## V3-17T5B guided manual capture repair

Source checkpoint: `c33406adcc71310f3f8c4fde2c716be120866696`;
the repair checkpoint is the local commit containing this entry and is
reported in the T5B receipt.

- The T5A JSON editor failed the T5B usability preflight before any real data
  was requested. No real collection was started through that interface.
- The operational T5B tool is a guided Italian flow for the frozen Florence
  scenario and exactly five accepted alternatives. It saves progress after
  every result, resumes automatically, supports corrections and selects
  optional private files through a native Windows dialog.
- Private identity, URLs and files are encrypted immediately with AES-256-GCM
  and CurrentUser DPAPI outside the repository; the progress file contains
  only sanitized values and encrypted handles.
- The synthetic five-alternative dry run validates save/resume, encryption,
  tamper rejection, provider-neutral snapshot, blind capsule, sanitized ZIP,
  checksums and cleanup with zero HTTP and zero credentials.
- The real session can finish only as `ELIGIBLE_FOR_BLIND_JUDGMENT` or
  `DIAGNOSTIC_ONLY`. Judgment, V3 execution, deblind and Golden admission
  remain outside this phase.

Next recommendation after the user completes the guided capture:
`V3-17T5B_MANUAL_CAPTURE_POSTFLIGHT_AND_ELIGIBILITY_DECISION`.

## V3-17T5B confirm-before-save recovery

- The first incomplete alternative was never persisted: the process stopped
  before category entry, the session directory was empty and the encrypted
  store contained no T5B evidence.
- The empty current-session directory was reset without touching other private
  evidence or the seven pre-existing unrelated dirty paths.
- The guided interface now holds an alternative only in memory until a full
  summary receives explicit `SALVA`; `CORREGGI 1..17` and `ANNULLA` are
  available before encryption or state persistence.
- Organic position and current property name remain visible throughout entry.
  Clear Italian guidance, category examples and `UNKNOWN` handling are part of
  every relevant prompt.
- A deterministic offline plausibility guard rejects a URL pasted as the name,
  a non-Booking URL and detectable name/URL disagreement without any network.
- No erroneous snapshot, Evidence ZIP, eligibility result, judgment or Golden
  admission was produced.

The active next action remains completion of the restarted T5B manual capture;
the runner must stop before finalization until the user has reviewed all five
alternatives.

## V3-17T5B mid-entry correction safe hold

- The restarted runner was interrupted with Ctrl+C before confirmation. Its
  current alternative was not persisted; the session directory again contained
  no state or encrypted evidence and was reset narrowly.
- After every field, the repaired draft flow now supports `INDIETRO`,
  `CORREGGI 1..17`, `RIEPILOGO` and `ANNULLA`. No action before final `SALVA`
  writes an alternative or encrypts private evidence.
- Numeric payment prompts are distinct from textual cancellation and
  refundability conditions. Bare numeric values are rejected in condition
  fields. A no-payment-now statement cannot become a zero pay-at-property
  amount; missing amount evidence remains `UNKNOWN`.
- No erroneous snapshot, Evidence ZIP, classification, judgment, V3 execution
  or Golden admission was produced.

The next action remains a clean restart of alternative one under the same
frozen Florence scenario, followed by manual completion and postflight only.

## V3-17T5B clean manual canary restart

- The prior `_001` attempt is classified only as `ABORTED_INVALID_INPUT`.
  Its process had ended before recovery inspection; its session directory was
  empty, with no progress state, encrypted evidence or shared Evidence ZIP.
- The empty `_001` directory was removed narrowly. No other private evidence
  or repository dirty path was touched, and no prior value is reused or
  prefilled.
- The replacement capture uses the fresh local session identity
  `V3_17T5B_FLORENCE_20261015_002`; the runner explicitly rejects reuse of the
  retired identity and reports the active identity during preflight/startup.
- The frozen scenario, five-alternative protocol, in-memory draft, field
  correction, full summary and explicit `SALVA` confirmation remain unchanged.
- No snapshot, capsule, Evidence ZIP, eligibility classification, judgment or
  Golden admission was produced from the aborted attempt.

The next action remains manual entry from organic position one in a fresh
logged-out incognito Booking.com window.

## V3-17T5B completed diagnostic session audit and offline repair

- The supplied sanitized ZIP matched its declared SHA-256, contained ten
  entries, and passed all `9/9` internal artifact checksums.
- The sealed outcome remains `DIAGNOSTIC_ONLY`: five alternatives, no blind
  judgment, no V3 execution, no deblind and no Golden admission.
- Offline inspection reconfirmed the two declared missing comparable fields
  and exposed three validation gaps: lower-case explicit unknown evidence was
  not normalized, a known payment decomposition did not reconcile to its
  displayed total, and an implausible day remained accepted in a textual
  refundability condition.
- The contract now treats `UNKNOWN` case-insensitively, emits a deterministic
  diagnostic issue for a known payment split mismatch, and rejects implausible
  calendar days in cancellation/refundability text.
- A verified textual position is preserved independently from numeric
  distance. The system never fabricates a distance-from-centre value from a
  landmark or neighbourhood description.
- A new `repair-export` mode can amend one public field of one saved
  alternative after explicit confirmation and produce a new sanitized ZIP.
  It reuses the five alternatives but neither rewrites nor exposes encrypted
  names, URLs or private proof. The mode does not create a blind capsule,
  execute V3, record a judgment or admit Golden evidence.
- No real session field was changed and no corrected export was produced in
  this implementation phase.

The next action is an explicitly user-driven offline correction/export of the
existing T5B diagnostic session, followed by a fresh seal audit. No new market
collection is required or authorized.

## V3-17T5B repair-session lookup reconciliation

- Read-only inspection confirms that the `_002` state still exists under the
  canonical CurrentUser private root, contains five alternatives, remains
  finalized `DIAGNOSTIC_ONLY`, and records zero network calls and zero loaded
  credentials.
- Collection and repair use the same private root, state version and
  `session-state.json` filename. The saved state is structurally repairable;
  reconstruction from shared Evidence is neither needed nor permitted.
- The failed repair boundary used a hardcoded Node session constant rather than
  an explicit launcher parameter. It also mixed case-insensitive PowerShell
  mode validation with case-sensitive private-root routing, permitting a valid
  case variant to select a temporary root.
- `repair-export` now requires and forwards an explicit, validated session ID;
  loaded state identity must match exactly and no fallback lookup is allowed.
  Synthetic sibling-session tests prove deterministic selection and fail-closed
  behavior when the identity is omitted.
- No real correction, re-export, Evidence mutation, judgment, V3 execution,
  deblind or Golden admission occurred during diagnosis or repair.

Determine the next package from the newest Evidence and repository state. Do not infer it only from an old alphabetical package label. After every accepted checkpoint, update this file with the exact commit, suites, evidence filename, external calls, and remaining blockers.

## V3-17T5B runtime-identical repair lookup diagnosis

- The user-confirmed D-0029 command still failed with
  `MANUAL_CAPTURE_REPAIR_SESSION_NOT_FOUND`; D-0029 is therefore not accepted as
  proof that the operational lookup was repaired.
- The earlier positive path probe was independent PowerShell filesystem logic,
  not the Node resolver reached by `repair-export`. The old single
  `existsSync` branch did not preserve enough runtime diagnostics to reconstruct
  the exact historical divergent root after the failed process exited.
- `repair-export` and the read-only `repair-preflight` now call one shared
  resolver. The actual PowerShell launcher reports its effective Node
  arguments, parsed identity, CurrentUser root and state path, then separately
  classifies existence, file type, readability, parsing, schema, identity and
  no-mutation checks without printing private state content.
- A real read-only preflight for `V3_17T5B_FLORENCE_20261015_002` through that
  launcher reports: identity match, state file present/readable, supported
  schema, five alternatives and no state mutation.
- No real correction, re-export, Evidence mutation, judgment, V3 execution,
  deblind or Golden admission has occurred. A commit and a subsequent real
  repair invocation both remain outside this diagnostic checkpoint.
