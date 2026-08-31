# D-0006 — External observational hotel-choice data remains a separate, fail-closed corpus

Date: 2026-08-31
Status: Accepted

## Context and problem

V3-17 needs provider-neutral replay evidence, while public Expedia and Trivago
datasets contain historical behavior shaped by ranking, advertising,
availability and interface design. Current access and license conditions are
not sufficient for persistent product ingestion.

## Decision and scope

Introduce `ExternalHotelChoiceSessionV3` and a provider-neutral replay adapter
as a private offline boundary. Keep behavioral labels outside pre-decision
features, require primary provenance and an admitted license, preserve the
complete observed choice set, deduplicate by search session and prohibit
automatic admission to the live Golden corpus or V3 weight changes.

The Trivago RecSys Challenge 2019 is the primary conditional source. No real
dataset is admitted in this checkpoint.

## Product rationale

A click or booking reveals a preference inside a historically exposed set; it
does not prove the objectively best stay. This distinction protects StayOpti's
decision thesis from platform ordering and commercial feedback loops while
retaining useful contextual behavior.

## Evidence reviewed

- Expedia Group RecTour paper and Expedia technical description;
- official RecSys Challenge 2019 and Trivago documentation;
- Kaggle Expedia competition metadata and access gate;
- official ExpediaGroup ECML/PKDD 2022 repository and data terms;
- V3-17O Golden contract, V3-17P blind capsule, V3-17Q/R provider-neutral
  projection, Decision Science Library and replay contracts.

## Alternatives rejected

- treating booking as objective ground truth;
- downloading from unverified mirrors;
- accepting competition terms automatically;
- treating hotel rows as independent sessions;
- placing booking/click outcome columns in ranking features;
- merging external observations into the live Golden corpus;
- inventing propensities or missing attributes.

## Risks and safeguards

Historical obsolescence, rank/advertising bias, missing visible information,
resampling and incomplete alternatives remain explicit bias flags. License and
primary-source checks fail closed. Dataset partitions isolate user/session
clusters. Split outcomes remain synthetic counterfactuals requiring separate
blind judgment.

## Implementation consequences

Private modules and tests may ingest only admitted, provider-neutral sessions.
No public runtime import, ranking weight, provider call, Golden count, V3 gate
or V3-18 authorization changes.

## Validation and rollback

The checkpoint requires targeted contract tests plus canonical Engine V2/V3,
B1/B2, quarantine, F0 and integrity gates. Rollback is removal of the private
modules, tests and documentation; public behavior is unaffected.

## Approver

User-authorized V3-17S scope, with source terms/license acceptance explicitly
reserved to the user.

## Supersedes / superseded by

Does not supersede D-0001 through D-0005. A later accepted source-access and
license decision may supersede only this decision's source hold.
