# D-0007 — Correct external hotel-choice source roles without blocking real Golden collection

Date: 2026-08-31
Status: Accepted

## Context and problem

V3-17S correctly separated external observational behavior from real Golden
evidence, but named Trivago RecSys 2019 as the primary conditional source.
That ranking over-weighted present technical accessibility and under-weighted
the product signal. Trivago observes click-out, while Expedia RecTour documents
the closer decision target: ordered alternatives, clicks and attributed
bookings with richer search and hotel context.

## Decision and scope

Prospectively correct the strategic source roles:

- Expedia RecTour: `PRIMARY_BOOKING_CHOICE_DATASET_TARGET`;
- Trivago RecSys 2019:
  `SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK`;
- Expedia Personalized Sort:
  `CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK`.

Keep every source fail-closed for ingestion until the exact official file,
file-level provenance, file-level license and intended-use permission are
verified. Keep external observations separate from real Golden and prohibit
automatic V3 changes.

## Product rationale

Source priority must follow evidentiary fit to the StayOpti decision objective,
not the convenience of a currently described schema. A click is weaker than a
booking; a booking is still a confounded revealed preference, not proof of an
objectively best stay. External data is an accelerator and benchmark, not a
prerequisite for collecting current blind-adjudicated Golden cases.

## Evidence reviewed

- Expedia-authored RecTour paper and Expedia Group technical article;
- official RecTour workshop page and Expedia dataset presentation;
- official RecSys Challenge 2019 page, Trivago owner article and schema;
- current Trivago dataset portal result (`502 Bad Gateway`);
- official Expedia Personalized Sort Kaggle data/competition pages;
- V3-17S contract, replay adapter, documentation and D-0006;
- Product Constitution and integrated V3 roadmap.

## Alternatives rejected

- keeping Trivago primary merely because its click schema is well documented;
- treating click-out as booking;
- treating booking as objective ground truth;
- accepting Kaggle terms on the user's behalf;
- using an archived page or mirror as license proof;
- blocking LiteAPI real-Golden work until an external archive reappears.

## Risks and safeguards

Paper and presentation licenses can be mistaken for a file license. The source
registry therefore distinguishes access, provenance, file license, commercial
use and ingestion. Mirrors fail closed. External data stays non-Golden,
confounders remain explicit and V3 cannot change automatically.

## Implementation consequences

A private source registry and deterministic validator freeze roles and access
states. Tests reject Trivago primary-booking promotion, click-to-booking
promotion, unverified file ingestion, automatic V3 changes and external replay
admission to real Golden. No public runtime barrel exports the registry.

## Validation and rollback

Acceptance requires targeted V3-17S.1 tests, full Engine V2/V3 regressions,
TypeScript and repository integrity checks. Rollback removes only the private
registry/test and this prospective record; it does not rewrite D-0006 or the
historical V3-17S result.

## Approver

User-authorized V3-17S.1 scope. Any competition terms acceptance, external
dataset ingestion or LiteAPI production call remains separately authorized.

## Supersedes / superseded by

Prospectively supersedes only the source-role ordering in D-0006. All D-0006
corpus separation, confounder, license, leakage and no-automatic-change rules
remain accepted.
