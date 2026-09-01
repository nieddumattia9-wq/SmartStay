# D-0009 — Qualify SerpApi Google Hotels only as a conditional evaluation source

Date: 2026-09-01
Status: Accepted

## Context and problem

Public observational datasets audited in V3-17S/S.1 were unavailable or
license-gated. StayOpti still needs current, real-market hotel choice sets for
provider-neutral replay and blind evaluation without making the source a
booking provider or coupling Engine V3 to a vendor. SerpApi documents an
official Google Hotels extraction API and a free account tier, but public
terms do not unambiguously grant persistent or redistributable use of
Google-derived results.

## Decision and scope

`SERPAPI_GOOGLE_HOTELS` is conditionally qualified as
`REAL_PUBLIC_MARKET_CHOICE_SET_SOURCE`. Its records are
`REAL_PUBLIC_MARKET_SNAPSHOT_CANDIDATE`, never booking/click/outcome evidence,
real Golden cases or public-runtime provider data.

The only permitted architecture is an evaluation-side adapter into the
existing `ExternalHotelChoiceSessionV3` contract and, after a separate rights
admission, provider-neutral replay. The adapter cannot fetch, read credentials,
enter the provider registry, convert through LiteAPI or be imported by V3
core. Source property/seller tokens are discarded after local pseudonymous
mapping and cannot enter decision features.

Public technical access is qualified, but live access is not authorized.
Account creation and terms acceptance remain personal user actions. Internal
evaluation and sanitized persistence are conditional; redistribution is
prohibited absent express written permission. The public pages do not state a
VAT-number requirement, individual-account eligibility or card requirement,
and no stronger inference is made.

## Product rationale

A current public-market choice set can test missingness, ranking robustness
and provider dependence while keeping StayOpti's choice logic independent of
SerpApi, Google order and seller coverage. Fail-closed rights and price
semantics prevent an observed aggregate price or impression from becoming a
false bookable offer or objective-best label.

## Evidence reviewed

- official SerpApi Google Hotels API documentation;
- official SerpApi pricing;
- official SerpApi terms and privacy page;
- official Google hotel ranking/price explanation;
- official Google hotel tax-and-fee policy;
- V3-17Q/R/S/S.1 evaluation contracts and source registry;
- V3-17T0/T0A provider-neutral boundary and tie-resolution tests;
- synthetic adapter fixtures only.

Evidence cutoff and full URL register are recorded in
`docs/engine-v3/v3-17-serpapi-google-hotels-source-qualification.md`.

## Alternatives rejected

- making SerpApi a StayOpti runtime or booking provider;
- routing its response through the LiteAPI adapter;
- calling the API during qualification;
- treating Google ranking, ads, lowest price or popularity as quality;
- claiming that public silence proves no VAT number or card is required;
- persisting raw responses, search URLs, property tokens or seller values;
- treating one hotel row or pagination page as an independent session;
- enabling `no_cache` or property detail enrichment without a frozen budget;
- falling back to manual scraping or browser automation.

## Risks and safeguards

Terms, quotas, fields and Google presentation can change. The next gate must
re-check official evidence and freeze a bounded request budget. The adapter
marks the source as terms-gated and non-persistent, separates nightly, total,
before-tax, lowest-observed and bookability semantics, maps missing values to
unknown, and carries mandatory bias diagnostics. Static tests prohibit core
and runtime imports.

## Implementation consequences

An evaluation-only adapter and a synthetic test suite are added. A proposed
twelve-session plan has a theoretical 48-call ceiling (12 main searches plus
at most three property details per session), but neither the plan nor this
record authorizes a request. Engine V3 core, weights, public runtime, LiteAPI,
RouteStack, V2 and booking flows are unchanged.

## Validation and rollback

Acceptance requires targeted V3-17T/T0A tests, T0 re-audit, V3-17Q/R/S/S.1,
full Engine V3/V2, TypeScript, B1/B2, legacy quarantine, F0B/F0C/F0D,
privacy/source-license scans and both Git diff checks. Rollback requires a
later explicit commit; no rollback may introduce a direct provider-to-core
path.

## Approver

User-authorized V3-17T scope.

## Supersedes / superseded by

This record extends D-0006 and D-0007 with a current API-based evaluation
source and preserves D-0008 provider-identity neutrality. It does not
supersede the existing external-dataset access holds or authorize collection.
