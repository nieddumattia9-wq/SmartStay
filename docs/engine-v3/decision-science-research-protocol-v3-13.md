# StayOpti Engine V3-13 — Decision Science Library v1

Status: offline research infrastructure only
Public engine: V2 only
V3 modes: off or shadow
SPLIT: disabled

## Purpose

V3-13 creates the first versioned, test-linked specialist knowledge base used
to prepare future StayOpti decision-policy candidates. It does not select
hotels, change ranking weights, define thresholds, call providers or authorize
promotion.

The library separates four things that must not be collapsed:

1. a registered source and its provenance;
2. a narrowly scoped decision proposition;
3. the StayOpti dimensions the proposition may inform;
4. an offline test that can falsify or bound the proposition.

## Research protocol

### 1. Frame a falsifiable question

Each intake begins with a traveler decision question, target dimension,
population, geography, trip context and intended test. Questions that ask for
a universal coefficient without a population or context are rejected.

### 2. Search and screen evidence

Prefer peer-reviewed experiments and observational studies with inspectable
methods. Qualitative research may establish candidate concepts but not effect
sizes. Institutional reports and industry surveys remain exploratory, with
commercial-interest risk and missing metadata recorded explicitly.

Exclusion conditions include missing provenance, unverifiable locator,
undisclosed population, purely promotional material, circular citations and a
result that cannot be converted into a bounded proposition.

### 3. Register the source

Every source records ID and version, authors, year, source type, persistent
locator, peer-review status, domains, population, geography, context, method,
sample size when verified, limitations, commercial-interest risk, funding
disclosure status and review dates. `null` means not established by the
registry; it never means zero.

### 4. Encode a claim

Every claim records a proposition, source IDs, scope, evidence strength,
limits, bias axes, validity window, StayOpti dimensions, non-applicability
conditions and reciprocal test IDs. All claims have status
`candidate-research-only`; direct policy use and direct weight assignment are
always false.

Evidence strength has four levels:

- `exploratory`: concept or context signal requiring replication;
- `directional`: bounded relationship suitable for curriculum design;
- `moderate`: replicated or internally strong evidence with material external
  validity limits;
- `strong`: reserved for convergent, directly relevant evidence across
  contexts. No V3-13 claim is assigned this level.

Institutional and industry-only claims cannot exceed `exploratory`.

### 5. Map evidence to a test

The test map is reciprocal: a claim names its tests and every test names its
claims. V3-13 automates library integrity only. Behavioral cases marked for
V3-14 or policy-candidate tests marked for V3-15 remain specifications, not
implemented policy.

### 6. Red-team and review

All required bias axes must have an explicit risk, mitigation, linked claims
and required review. Each source and claim has a review-by date. Expired or
materially outdated evidence must be re-reviewed, downgraded or retired before
use in a later phase.

## Epistemic gate

A claim fails closed when any of the following is missing or inconsistent:

- source and persistent locator;
- population, geography or trip context;
- evidence strength;
- limits or bias axes;
- validity and review dates;
- StayOpti dimension mapping;
- non-applicability conditions;
- reciprocal test mapping;
- research-only and no-direct-weight firewalls.

Deterministic canonicalization and a stable fingerprint bind the complete
registry, claims, mappings, controls and derived counts.

## Source registry v1

| Source ID | Type | Domains | Scope summary | Registry use |
|---|---|---|---|---|
| `source-budget-constraint-pachali-2023` | Peer-reviewed experiment | Budget | Incentive-compatible constrained choice; non-hotel product | Methodological caution only; [DOI](https://doi.org/10.1177/00222437221145283) |
| `source-choice-attributes-assaker-2023` | Peer-reviewed experiment | Budget, quality, location, flexibility | 270 U.S. online shoppers, April 2020 | Context-bound attribute salience; [DOI](https://doi.org/10.1177/19389655231184474) |
| `source-flexibility-arenoe-2020` | Peer-reviewed experiment | Flexibility | 260 interviews, three Netherlands chain properties | Booking-window hypothesis; [DOI](https://doi.org/10.1177/1938965519864863) |
| `source-room-attributes-masiero-2015` | Peer-reviewed experiment | Room, comfort, flexibility | Single-property discrete choice | Context-sensitive room value; [DOI](https://doi.org/10.1016/j.ijhm.2015.06.001) |
| `source-location-masiero-2019` | Peer-reviewed experiment | Location, budget, quality | 719 Hong Kong tourist choices | Trip-specific location and regret candidate; [DOI](https://doi.org/10.1016/j.tourman.2018.12.002) |
| `source-trip-context-kim-2017` | Peer-reviewed experiment | Comfort, room, budget, quality | Business/leisure stated scenarios | Purpose as defeasible context; [DOI](https://doi.org/10.1016/j.tourman.2017.07.014) |
| `source-quality-segment-rhee-2015` | Peer-reviewed experiment | Quality and related dimensions | Four U.S. chain brands | Segment heterogeneity; [DOI](https://doi.org/10.1016/j.chb.2015.02.069) |
| `source-review-volume-gavilan-2018` | Peer-reviewed experiment | Quality | Controlled rating × volume design | Review credibility context; [DOI](https://doi.org/10.1016/j.tourman.2017.10.018) |
| `source-room-experience-lvov-2025` | Peer-reviewed qualitative | Room, comfort | 30 Finnish interviews | Candidate experience themes; [DOI](https://doi.org/10.54055/ejtr.v41i.4049) |
| `source-long-stay-gbta-2022` | Industry survey | Long stays and related dimensions | U.S.-based international business travelers | Exploratory capabilities only; [registry page](https://gbta.org/extended-stay-accommodations-satisfaction-preferences-challenges/) |
| `source-cultural-ratings-pingitore-2013` | Institutional report | Quality, comfort | Cross-country satisfaction analysis | Exploratory normalization warning; [Cornell record](https://ecommons.cornell.edu/entities/publication/78a05f62-dffc-4f3b-bc5b-f9aa20037776) |
| `source-official-vs-review-arzaghi-2023` | Peer-reviewed observational | Quality | Dubai official ratings and reviews | Preserve distinct signal provenance; [DOI](https://doi.org/10.1016/j.heliyon.2023.e16337) |

The machine-readable registry in
`tests/engine-v3/fixtures/v3-13-decision-science-library-v1.json` is canonical
for V3-13. This table is an operator-facing summary, not a second source of
truth.

## Frozen boundaries

V3-13 changes no public V2 behavior, public recommendation, V3 serving mode,
SPLIT allocation, ranking weight, threshold, offer selection, provider
integration, booking, payment, analytics or deployment. Later phases must
build a separate policy candidate and pass their own evaluation gates.
