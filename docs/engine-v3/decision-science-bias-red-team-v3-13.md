# StayOpti Engine V3-13 — Evidence Bias Red Team

## Threat model

The principal failure mode is not a malformed citation. It is a valid result
being generalized beyond the population, geography, period, platform or
decision task that produced it. A second failure mode is translating a group
average into a stereotype about an individual traveler. A third is converting
directional evidence into a ranking coefficient without independent outcome
validation.

## Required controls

| Bias axis | Adversarial question | Fail-closed control |
|---|---|---|
| Geography and culture | Would the claim survive a different rating norm, transport system or service expectation? | Preserve geography; prohibit global normalization or coefficients without local replication. |
| Trip purpose | Is a business/leisure label being used as a fixed preference profile? | Treat purpose as defeasible context; support mixed and unknown; explicit preferences win. |
| Hotel segment | Is evidence from a chain, star class or extended-stay product being applied to another segment? | Require segment comparability and stratified cases. |
| Travel party | Does a solo-traveler average erase children, groups or multi-room constraints? | Keep party composition explicit and test solo, couple, family, group and multi-room cases. |
| Time period | Did a pandemic, inflation, platform redesign or policy change age the evidence? | Enforce review-by dates and re-review material context shifts. |
| Platform and measurement | Are stars, reviews, volumes, badges or rate terms being treated as interchangeable? | Preserve source, scale and collection provenance; reject silent substitution. |
| Accessibility | Does walking time or generic comfort assume a fully mobile, neurotypical traveler? | Require compatible accessibility facts and adversarial accessibility cases. |

## Deliberate challenges

### Budget

Challenge a linear price model with matched options around a declared hard
budget, missing budget and unusually high affordability. The research claim
must not invent a budget when none is defensible, and the non-hotel source must
not supply a lodging coefficient.

### Quality

Challenge equal review scores with different review counts, platform scales
and official star classifications. No star/review substitution and no global
raw-score normalization are allowed.

### Comfort and room

Challenge purpose averages using explicit contradictory preferences, children,
accessibility needs, repeat visits and ambiguous room descriptions. Qualitative
themes and single-property willingness-to-pay values remain non-numeric
curriculum hypotheses.

### Location

Challenge generic center distance using traveler-specific points of interest,
walking limitations, public transport and taxi-only scenarios. Regret-sensitive
comparison remains an offline candidate rather than a default rule.

### Flexibility

Challenge matched cancellation terms across short and long booking windows,
then repeat when the rate terms cannot be reliably parsed. No universal
flexibility premium is permitted.

### Long stays

Challenge the industry survey with leisure, family, domestic and stays under
five days. Kitchen and residential-feel percentages cannot become global
weights; missing sample metadata and the commercial partnership stay visible.

## Rejection conditions

Reject or quarantine a claim when:

- its source or reciprocal test no longer resolves;
- scope, limitations or non-applicability conditions are empty;
- an industry or institutional claim is elevated above exploratory;
- a review date expires without re-evaluation;
- platform evidence loses its original scale or provenance;
- a population average overrides an explicit traveler constraint;
- any field authorizes direct policy adoption, weight assignment, ranking
  mutation or public promotion.

## Promotion boundary

Passing V3-13 proves only that the research library is traceable, scoped,
deterministic and test-linked. It does not prove that a claim improves hotel
recommendations. V3-14 must convert selected propositions into balanced cases;
V3-15 must create a separate policy candidate and compare it against the frozen
decision constitution before any later promotion review.
