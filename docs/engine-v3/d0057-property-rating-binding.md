# D-0057 — Property rating scale and precise reviewed observation

Source: `da3b0ec75544180c7d5a07e4f7213309770143e1`, work branch
`codex/evaluation-d0036-d0041`. Evaluation-only, synthetic verification.

## Before and after

The preserved counterexample in `evidence/d0057-property-rating-before.json`
uses invented REVIEWED material and the old property-wide scale path without
rate continuity. On @1.2 its integration is REJECTED with
`APPENDIX_HISTORICAL_RATE_CONTINUITY_UNPROVEN`. The old executor still makes
one kernel call and two actual policy calls, producing an abstention on the
unchanged incomplete set. This is not a no-execution validation receipt.

The successor @1.3 adds a separate property-observation proof/review contract.
The legacy exact-offer proof and its commercial guards are unchanged. The new
path neither supplies nor requests `SAME_HISTORICAL_RATE`.
No existing @1/@1.1/@1.2 document is silently migrated or reapproved.

## Contract and exact bindings

- Appendix: `stayopti.reviewed-evidence-appendix@1.3`.
- Dedicated evidence: `stayopti.appendix-property-rating-evidence@1`.
- Dedicated point receipt: `stayopti.appendix-property-rating-review@1`.
- Only `ratingScale` with `PROPERTY_WIDE` is allowed in that evidence format.
  Mixed-domain documents, including hidden/unselected commercial or room facts,
  fail the whole input before the kernel. A shared multi-field exact-offer proof
  still requires complete, atomic validation under the existing contract.

`createReviewedPropertyRatingScope(request, alternativeId)` first validates the
complete immutable REVIEWED base. It returns bindings to the packet, journal,
projection, alternative, final reviewed property identity field, exact rating
field and original normalized rating observation. These include original field
hashes, retained evidence references/hashes, observed value and capture clock.
Neither equal property names nor equal numeric ratings establish identity.

The minimum supported identity relationship requires at least one retained
proof shared by the reviewed propertyName and rating fields. Cross-document
property matching without that shared proof is not automatically inferred.
The rating claim must actually link to the original `rating` field; unrelated
source links cannot supply a new property-rating certificate.

The new content uses this exact scope, not room/rate/stay/party scope:

```javascript
const scope = createReviewedPropertyRatingScope(request, alternativeId);
// Construct a NEW private evidence document; do not mutate a historical draft.
const link = {
  relation: 'SCALE_OF_THIS_PROPERTY_RATING_OBSERVATION',
  scopeSha256: hash(scope), ruleSourceRef: sourceRef,
  basis: '<documented property/observation-to-rule relationship>',
  historicalValidity: 'NOT_INDEPENDENTLY_CERTIFIED',
  historicalValidityLimitations: '<actual retained limitations>'
};
```

Content retains sourceRef/sourceKind, observationId, observedAt (rule acquisition),
timeSource, nullable documented validUntil, statement and prior-claim temporal
relation. Source kinds are PUBLIC_OBSERVATION or PROPERTY_DOCUMENT, not a
commercial verification record. The bounded D-0056 rating grammar and numerical
formula are unchanged: 1–10 is an observed interval, 10 is the denominator.

The point receipt must use
`SOURCE_CONTENT_AND_PROPERTY_RATING_OBSERVATION_CHECK`, bind source bytes,
transcription, full observation, exact scope and link hashes, identify only
`reviewedFields: ['ratingScale']`, and set
`commercialVerificationAttested: false`. It retains actual actor, reviewedAt,
scopeBasis, meaningBasis and limitations. A real base still requires a real HUMAN
review; fixture receipts are explicitly SYNTHETIC_TEST. There is no receipt
generator granting human authority, no broad review conversion and no automated
approval of private records. A receipt checksum is not human authentication.

For JSON/text artifacts the exact source bytes must equal the interpreted
content. Separate visual-source transcription retains the existing explicit
region/method and point-review requirements. Hashes prove bytes, not meaning.

## Time, applicability and claim materialization

Historical rating capture and rule acquisition remain separate clocks, with
their own sources. The rule can have been acquired before or after the rating;
neither order certifies historical validity. The review must occur after both.
This initial dedicated contract preserves the derived relationship as
NOT_INDEPENDENTLY_CERTIFIED with explicit limitations, not an independently
attested historical rule version. CapturedAt is the retained validated claim
timestamp, not a new independent clock certificate.

Every explicit validUntil still limits use. No expiry is invented for a static
rule. Original prior-claim relationships, minimum/maximum checks and conflicting
interval fusion remain effective. Unknown, expired, unsupported or conflicting
scales do not silently normalize a rating.

`materializeClaim` derives `propertyBinding.reason` from the validated property
observation link, never from tariff continuity. It preserves scope/link hashes,
both clocks and limitations in provenance. The enclosing offer scope remains a
candidate lookup context, not a claim that the rule certifies that rate.

## Pure preparation versus execution

```javascript
const checked = prepareReviewedEvidenceAppendix(request, appendix);
// No callback, I/O, kernel, policy, decision or abstention in this function.
// Inspect integrations, consumedFacts, temporalGaps and integratedRequirements.
// A rejected individual integration is visible; preparation is not eligibility.

// Only in a separately authorized execution:
const measured = executeReviewedEvidenceAppendix(request, appendix, compute);
```

The executor calls the same preparation, then invokes the kernel once. A fatal
base/scope-selection error throws before computation; per-integration rejection
or insufficiency remains visible and does not necessarily prevent computation
on the remaining valid facts. Thus do not use the executor as a preflight.
Pure preparation exposes no output/decision/abstention. It does validate and
reproject diagnostic requirements, which is distinct from selecting a stay.

Rating-only integration cannot supply full cost, bookability or accommodation
eligibility. All candidates, original essential needs and missing facts remain.
Weights, thresholds, roles, public runtime and Golden gates are unchanged.

## Validation and operational limits

Local verification on 2026-09-13 used a clean isolated checkout with exactly the
eight phase files, no excluded local files, no remote and offline copies of the
already installed dependencies. Node v24.18.0 and actual Windows PowerShell
5.1.26100.9444 were used. The complete canonical commands ran from that checkout;
the source worktree and protected files were checked before and afterwards.

| Local check | Observed result |
| --- | --- |
| D-0057 new regressions | 59/59 PASS |
| D-0057 plus retained targeted suites | 417/417 PASS (59 new + 358 retained) |
| `npm run test:engine-v3` | 2324/2324 PASS, no skips |
| `npm run test:engine-v2` | 196/196 PASS |
| `npm run test:lifecycle` | 530 PASS, 17 existing real-Valkey integration skips, 0 FAIL |
| `npm run test:security` / `test:release` | 29/29 and 101/101 PASS |
| `npm run test:analytics` / `test:capacity-contract` / `test:beta` | 31/31, 9/9 and 4/4 PASS |
| `npm run typecheck` / `gate:analytics-beta` / `build` | PASS |
| `npm run smoke:staging:local` | PASS, 18 local-only mock checks |
| Windows PowerShell 5.1 parser | 13/13 scripts PASS |
| Scoped secret/private-artifact/raw-token and provenance inspection | PASS; invented fixtures only |
| Staged/unstaged whitespace checks; protected hashes | PASS; 7 excluded + 17 sealed + extra private report preserved |

The new suite records 42 pure preparation attempts with zero kernel and policy
invocations, including failing input checks. Instrumented executor tests record
15 kernel and 30 actual policy invocations. A separate original-path parity
baseline adds one kernel/two policy calls; it is not a pure-preparation call.
Every execution is synthetic. The original @1.2 reproduction's one/two counts
are separate historical evidence, not included in these new-suite counters.

The targeted regression file is
`tests/engine-v3/v3AppendixPropertyRatingBinding.test.ts`; it is also discovered
by the canonical V3 command. It covers exact identities with equal names/scores,
missing/wrong reviews, source alteration, old-version rejection, mixed-field
misuse, expiry, range/conflict behavior, independent clocks, materialization,
immutable originals, pure checks and actual usable/abstained policy output.
Only result documentation was finalized after the gates; executable/test bytes
remain identical to the isolated tested candidate and are checked at staging.

These are local results, not GitHub CI, native Linux, registry vulnerability
audit or a real custody certificate. Historical before evidence remains
byte-identical. Tests use invented
properties, sources, reviews and times only. No private appendix, original
approval, historical measurement or source dossier is opened or modified.

No independent source authentication, historical rule certification, general
property-matching service, custody migration, real execution, automatic Golden
admission or full robustness claim is added. Future real preparation must bind
the actual newly versioned documents to approvals that genuinely cover this
precise scope; prior approvals remain immutable records with their own scope.
It can use the pure preparation API before any separately authorized measure.

Publication: selective work-branch-only commit/push after required local gates.
The final delivery records actual local/remote SHA and pending count; local
tests do not assert GitHub CI success. Main and private materials remain intact.
