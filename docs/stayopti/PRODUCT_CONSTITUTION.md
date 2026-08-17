# StayOpti Product Constitution

Version: 1.0  
Consolidated: 2026-08-17  
Status: binding product intent; changes require an explicit decision record and Mattia's approval

## 1. Identity and promise

StayOpti is the evolution of the project historically called SmartStay/Stayvery. Its job is not to own the largest inventory or display the longest list. Its job is to interpret available offers and help a traveler make a better decision with less work.

Core promise:

> StayOpti does not merely find the cheapest stay. It identifies the stay solution most worth choosing for this traveler and explains why.

North Star:

> Maximum intelligence behind the scenes. Minimum effort from the traveler.

The intended mental model is: check StayOpti to decide, then book through the appropriate provider.

## 2. What the product is—and is not

StayOpti is:

- a provider-agnostic stay decision engine;
- an evidence-based, personalized, explainable ranking and recommendation layer;
- a system for compressing a complex market into a small number of meaningfully different choices;
- a best-value and best-fit product, not a minimum-price product;
- a product whose fundamental unit is the complete stay solution: accommodation, specific offer/unit, occupancy, dates, total price, taxes/fees, treatment, cancellation terms, availability, and bookability.

StayOpti is not:

- a Booking clone or infinite OTA results list;
- a generic AI chat interface that asks the traveler to write good prompts;
- a black box that invents reasons or hides missing evidence;
- a discount brand that treats comfort and stress as irrelevant;
- a system whose organic ranking is influenced by commission;
- a place to add features merely because they are technically possible.

## 3. The traveler decision contract

A primary recommendation is legitimate only when it can expose:

1. the decision thesis—why this option is worth choosing;
2. the decisive evidence actually available;
3. the main sacrifice or trade-off;
4. the best meaningful alternative and how it differs;
5. uncertainty, freshness, and decision risk;
6. the counterfactual condition that could reverse the recommendation, when material;
7. robustness: whether a small change in price, availability, or assumptions would change the winner.

If these cannot be supported, the system must reduce confidence, request a recheck, avoid the role, or abstain. A score difference alone is not decision proof.

The preferred public unit is a short, progressive card: thesis first, evidence and trade-off next, technical detail only on demand. The traveler should understand the choice in roughly ten seconds.

## 4. Evidence before eloquence

Every material datum needs provenance and semantics: value, source, availability, reliability, freshness/timestamp where relevant, transformation, and reason for absence. Direct, derived, estimated, stale, and unavailable data must not be conflated.

Correct flow:

```text
verified evidence → deterministic decision/explanation rule → optional controlled language polish
```

Forbidden flow:

```text
hotel payload + generic prompt → invented recommendation reason
```

Missing data is uncertainty, not evidence of bad quality. A negative value may reduce quality; missing evidence reduces confidence; risky conditions increase choice risk.

## 5. Separate the dimensions that answer different questions

Do not collapse these concepts into one score or badge:

- accommodation/offer quality;
- relative value and budget fit;
- location fit;
- comfort and flexibility;
- user utility/preference fit;
- data confidence;
- choice risk;
- availability/bookability/freshness;
- purchase-provider quality and commercial terms.

Property/offer selection answers “which stay is worth choosing?” Provider selection answers “where should this chosen offer be purchased?” Commercial fields must not leak into organic property ranking.

## 6. Recommendation roles compress—not decorate—the choice

The main roles may include:

- Best Choice / StayOpti Pick;
- Cheapest Sensible / best sensible saving;
- Comfort Upgrade worth paying for;
- Best Location;
- later, a split-stay solution when materially superior.

Each role requires a genuinely different, eligible candidate with sufficient evidence and a clear traveler purpose. Do not assign different badges to near-duplicates. Do not force a role if no candidate deserves it.

Savings must preserve a defensible quality floor. An upgrade is promoted only when the value gained per additional euro is material and evidenced. Split stay is a distinctive capability, not a default: it must beat the best single stay after switching cost, time, baggage, transfer, fragility, and recheck risk.

## 7. Personalization without burden

The engine supports five preference profiles:

- `maximum-comfort`
- `comfort`
- `balanced`
- `savings`
- `maximum-savings`

Profiles represent different decision policies, not superficial linear weight changes. Budget, duration, party/rooms, distance, property type, essential needs, comfort, and flexibility can affect the decision. The UI should infer or guide with simple choices; it should not transfer model complexity to the traveler.

The product must not assume that a premium is universally favorable. Maximum Comfort still rejects waste, fragile evidence, and unjustified overpricing. Maximum Savings still rejects false savings that destroy minimum suitability.

## 8. Provider neutrality and determinism

Provider APIs are inventory and transaction sources behind adapters. The domain model, engine, decision trace, public presenter, and frontend must not depend on provider-specific payloads or commercial ranking.

Required properties:

- identical normalized inputs and policy versions produce deterministic decisions;
- provider ordering does not change the decision;
- provider substitution does not require rewriting the core engine;
- recommendation score is independent from commission;
- sponsored results, if ever introduced, are separate and explicit.

## 9. Safety architecture

The public V2 baseline is the safety reference while V3 remains offline/shadow and has not passed the frozen promotion gates. V3 failure, timeout, invalid fingerprint, unjustified divergence, commercial-field injection, or critical regression must not corrupt V2 output.

The Safety Kernel/Governor validates invariants and can block, abstain, or fall back. It is not a disguised preference oracle that forces V3 to copy V2 forever.

No automatic learning or automatic public promotion is allowed. Policy candidates are evaluated offline, then shadowed, gated, canaried, and manually authorized with a reversible kill switch.

## 10. Meaningful data and falsifiable evaluation

Test PASS is not the product objective. Data, fixtures, and evaluations must help a real traveler choose better.

The evidence program includes:

- a Golden Decision Dataset of real, adversarial, and counterfactual cases;
- provider-neutral replay;
- blind human and expert comparisons;
- regret, calibration, robustness, stability, fairness, abstention, and provider-dependence metrics;
- post-stay outcome learning, especially “would you make the same choice again?”;
- a decision trace that makes each result auditable.

Do not manipulate fixtures to pass a gate. A policy that increases clicks or commission but worsens regret, satisfaction, fairness, or trust is rejected.

## 11. UX and language

The experience is mobile-first, calm, premium, concise, and human. It should present a shortlist before a complete list and progressively disclose detail.

Use concrete comparisons such as total euro difference, distance, cancellation, room setup, and evidence reliability. Do not expose internal jargon, meaningless percentages, provider internals, redundant risk/confidence badges, or technically correct comparisons between non-comparable categories.

Distinguish guest rating from StayOpti fit. Clearly state whether an option is directly bookable, requires recheck, hands off to a partner, or is comparison-only.

## 12. Decision authority

- Mattia is Product Founder and approves product-constitution changes and public rollout.
- Codex/assistant can research, implement, test, red-team, prepare evidence, and recommend decisions; it must block promotion when evidence is insufficient.
- Blind human, expert, and outcome evidence progressively reduce dependence on any one assistant or founder judgment.

Implementation convenience cannot silently change product intent. Material changes require an explicit decision record linked to evidence and to any superseded rule.

## 13. Definition of product success

StayOpti succeeds when it reliably helps the traveler decide faster, with lower avoidable regret and greater confidence—not when it merely returns more results or passes more tests. A mature V3 must understand the five profiles, separate roles correctly, preserve evidence through recheck, know when to abstain, outperform the protected baseline on frozen gates, keep ranking commercially neutral, and remain reversible under manual rollout control.
