# D-0061 — Fresh LiteAPI observation diagnostic bridge (synthetic only)

Date: 2026-09-14. Authority: explicit D-0061 instruction by Mattia.
Source checkpoint: `34fa82087a8921ea4042b56a737dd93ffea59663`.
Work branch: `codex/evaluation-d0036-d0041`.

## Decision and boundary

Add a fresh-provider observation contract and pure source verifier, separate from
confirmed REVIEWED transcripts and historical appendices. Reuse the deterministic
requirements evaluators, scoped privacy/services, fact projection and observed
kernel. Do not import the public provider mapper or its unconditional bookable
flag, collapsed tax states, restored original identities or internal cache TTL.

The in-memory acquisition governor and fixture producer are SYNTHETIC_ONLY. No
credential loader or production HTTP transport is supplied. An exact declared
wire profile is exercised; notably raw GET-prebook schema compatibility has not
been tested against a real provider response. This is functioning offline code,
not certification of a production endpoint, account, custody or availability.

Price/verification uncertainties remain candidate-level observations and reasons.
Search and prebook versions remain separate. Prebook retrieval corroborates the
same session, not a second independent availability check. Null tax-list semantics
follow the source cited in the report, unlike omission/empty-list. Unsupported
remarks and mixed currency cannot silently produce a complete total.

Add explicit `not-requested` distance with null kilometers to the evaluation
requirements/kernel. Do not score geography or apply the strong-distance gate
when none was requested. Include eligible peers in market context without an
invented distance constraint. Existing requested-distance arithmetic and public
V2 behavior remain unchanged. Count actual policy calls, including the existing
strong-distance helper's preliminary call (two vs one when not requested).

## Alternatives rejected

- Relabel a fresh provider packet as REVIEWED or route it through SYNTHETIC truth
  flags; fabricate human review or tariff continuity.
- Invent coordinates, a conventional distance, tax completeness, bed places,
  response occupancy echoes or a ten-minute provider expiration.
- Normalize an unsupported GET response via single-record/price-only fallback.
- Drop incomplete selected candidates or replace failed samples with better ones.
- Call fewer-than-two candidates an engine abstention: preparation explicitly
  returns not executed, with zero kernel/policy invocations.

## Verification and remaining work

See `../../engine-v3/d0061-liteapi-fresh-observation-diagnostic.md` for the public
contract, observed local validation, source assumptions and production checklist.
Regression fixtures are entirely invented and do not encode private dossiers.
No role, weight, threshold, Golden gate or public integration is changed.

Observed local validation: targeted524/524 (107 new), canonicalV3 2431/2431 in
actual Windows CurrentUser, V2 196/196 and remaining canonical gates PASS, with
17 preexisting real-Valkey lifecycle skips. A first sandbox V3 2426/2431 is
retained; the five failures were isolated to CurrentUser DPAPI execution context
by an in-memory synthetic differential and the same candidate subsequently
passed without sealed-file changes. No local result is attributed to GitHub CI.

The synthetic governor reserves each attempt before its stub invocation, including
timeouts. Limits 1/5/1/5/5, total17, no retries/redirects/concurrency/resume. It does
not claim durable crash-safe state or single-use real authorization. Those, secure
credential handling, raw custody and endpoint/account qualification are explicit
requirements of a separately authorized operational launcher, not hidden extras.

Only selective software publication on the work branch is authorized. Main,
seven excluded files, seventeen sealed D-0037 files and private materials remain
unchanged. Local validation must not be described as GitHub CI. No real case has
advanced. Every phase reports push state and any local commits still pending.
