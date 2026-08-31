# StayOpti V3-17P — Private Golden blind-evaluation capsule

Status: frozen offline evaluation infrastructure
Blind capsule: `stayopti.golden-blind-capsule@1`
Judgment schema: `stayopti.golden-blind-judgment@1`

## Boundary

V3-17P implements a private, provider-agnostic blind-evaluation capsule for
cases accepted as `GOLDEN_VALID` by the V3-17O contract. It creates no real
Golden case and collects no real human or expert judgment. It does not score
V2 against V3, change a decision policy, enable Split, qualify LiteAPI, or
authorize V3-18.

The implementation is deliberately absent from the public Engine V3 barrel,
frontend routes, backend endpoints and runtime. Its HTML renderer produces a
standalone private document that has no network call, analytics, server,
persistent local storage or embedded deblind material.

## Reused contracts

The pipeline consumes `StayOptiGoldenCaseV3` and calls
`validateGoldenCaseV3` before any task is created. Quarantined or rejected
cases fail closed. The visible/sealed separation, homogeneous role comparison
and immutable-before-deblind model preserve the established B1 blind pipeline.
V3-17P adds the batch balancing, judgment ledger and dual-denominator report
needed by the V3-17N collection design; it does not replace either source
contract.

Split cases are not admitted. The four single-stay roles remain distinct:

- `best-choice`;
- `best-sensible-saving`;
- `worthwhile-comfort-upgrade`;
- `abstention-near-tie`.

Each visible task states its role and a neutral role-specific question. Its A
and B decisions always have that same sealed role.

## Capsule and task contract

A capsule contains a batch ID, ordered tasks, a task count and an offline-only
assertion. Each task contains:

- batch-local pseudonymous task and case IDs;
- the single-stay role and neutral evaluation question;
- the traveler and trip facts required to judge that role;
- provider-agnostic alternatives with explicit known/unknown evidence;
- two symmetrically represented decisions labelled A and B;
- the closed choice and judgment-reason allowlists.

Allowed choices are exactly `A`, `B`, `TIE` and
`INSUFFICIENT_EVIDENCE`. The latter is a reviewer conclusion about the visible
evidence and is not automatically an engine abstention.

The visible task omits local Golden IDs, search-family IDs, engine labels,
policy versions, provider identity, source keys, raw identifiers, Golden
fingerprints, internal reason codes, commissions, markup and sealed mapping
data. Material alternative values are copied without modification. Alternative
order may be blinded, but decision references are rebound to the corresponding
batch-local alternative pseudonyms.

## Deterministic randomization and pseudonymization

Generation requires all of the following caller inputs:

- an opaque batch ID;
- a private randomization seed;
- a private batch HMAC key;
- one or more V3-17O-valid cases.

There is no default seed or key. HMAC-SHA-256 derives task, case and alternative
pseudonyms. The seed deterministically orders tasks and alternatives. Candidate
assignment alternates after a seed-derived starting side, so the difference
between candidate-on-A and candidate-on-B is at most one task per batch.

Neither seed nor key is returned, logged, embedded in HTML, written to a
fixture, or placed in the private manifest. A different batch key produces
different pseudonyms, preventing cross-batch linkage. Synthetic explicit
values are permitted only inside tests.

## Private deblind manifest

The generator returns a separate private manifest. It records only the
bindings required after judgment:

- task and blinded-case pseudonyms;
- local Golden case and search-family IDs;
- role;
- which side maps to the baseline and candidate decision;
- task, Golden-case, capsule and manifest fingerprints;
- schema versions.

The manifest is not a member of the capsule and is never rendered into HTML,
DOM attributes, comments, source maps or evaluator-facing filenames. The
batch key is absent even from the manifest. Capsule and manifest must therefore
be stored and distributed separately by a future, separately authorized
collection phase.

## Anti-leak contract

Capsule creation performs a recursive scan over keys and string values. It
fails closed on engine labels, policy version, provider language, Golden or
family identity, manifest/seed/key material, commercial fields, raw payload or
response fields, booking/prebook/continuation identity and other sensitive
tokens. The rendered HTML is tested textually as well as structurally.

The scan reports paths, never values. This is an output-boundary control in
addition to, not a replacement for, the recursive unsafe-field validation in
V3-17O and the judgment validator.

## Judgment contract

Every judgment records only:

- schema, judgment, batch and task IDs;
- an externally supplied evaluator pseudonym;
- evaluator class `HUMAN` or `EXPERT`;
- one allowed choice;
- required integer confidence from 1 through 5;
- one or more allowlisted structured reasons;
- duration, consent and creation buckets.

Confidence means certainty in the judgment, not absolute accommodation
quality. The schema contains no free text, name, email, telephone, IP address,
user agent, precise location or precise timestamp. Evaluator pseudonyms must
be supplied externally and must not be derived from contact details.

The reason allowlist covers total value, quality, price, location, room,
flexibility, decision risk, evidence completeness, unjustified trade-off,
effective equivalence, insufficient evidence, role mismatch and one structured
catch-all reason. Unknown reasons fail closed.

The validator requires the exact schema keys, a known task in the same batch,
an opaque evaluator pseudonym, valid class/choice/confidence/reasons, consent
version and coarse time buckets. It recursively rejects PII, provider/raw IDs,
tokens, payloads, commercial fields, unexpected keys, non-plain objects,
getters, cycles, non-finite numbers and prototype-pollution keys. Reason codes
and paths are deterministic and sorted.

## Append-only ledger

The core ledger is pure and performs no file I/O. Append receives an existing
fingerprinted ledger, a new judgment and the capsule tasks. It:

1. validates the existing ledger and its canonical fingerprint;
2. validates the new judgment;
3. rejects a reused judgment ID;
4. rejects a second judgment by the same evaluator on the same task;
5. returns a newly allocated, canonically ordered ledger;
6. leaves every input unchanged;
7. computes a new SHA-256 fingerprint.

An altered historical entry invalidates the ledger rather than being silently
overwritten. A future file-oriented wrapper must use create-new semantics; no
such persistence runner is authorized or implemented here.

## Private offline interface

`renderGoldenBlindEvaluationHtmlV3` produces a static document from a validated
capsule. It shows one task at a time, presents A and B symmetrically, requires
choice, confidence and a structured reason, and exports a sanitized judgment
file containing the externally supplied evaluator pseudonym, class, consent
version and coarse creation bucket.

The document does not display aggregate results before completion, contain the
deblind manifest, call a server, open a port, emit analytics or use persistent
local storage. The caller is responsible for keeping evaluator bindings and
manifest material private. No public route is created.

## Deterministic deblind

Deblind requires the capsule, its private manifest and a validated immutable
ledger. It verifies:

- capsule, manifest and ledger batch binding;
- capsule and manifest versions;
- capsule and manifest fingerprints;
- exactly one manifest mapping per task;
- task fingerprints, pseudonyms and roles;
- absence of unknown or missing task IDs in the completed ledger.

It then maps A or B to the sealed baseline/candidate label. `TIE` and
`INSUFFICIENT_EVIDENCE` remain separate. Aggregates are emitted for overall
results, role, evaluator class and search family. No provider or commercial
field is introduced.

The report keeps both denominators:

- distinct Golden cases with judgments;
- distinct search families with judgments.

This prevents profile variants from being treated as independent search
families. V3-17P does not calculate or declare the V3-17 gate.

## Concentration checks

The report records distinct human and expert pseudonyms, judgment counts and
the maximum per-evaluator share in basis points. Frozen final-corpus limits are:

- humans: at least 20 evaluators and no evaluator above 1,000 bps;
- experts: at least 5 evaluators and no evaluator above 2,500 bps.

Before the corresponding final-volume thresholds of 300 human and 100 expert
judgments are reached, status is `NOT_YET_APPLICABLE`, not PASS. This permits
synthetic fixtures and the future pilot without falsely claiming the final
gate.

## Privacy, consent and retention boundary

V3-17P freezes structural minimization and consent-version requirements but
collects nothing. A future real collection must supply genuine consent,
document retention and deletion, keep qualification records outside the
decision ledger, and preserve no PII in the capsule, judgment or deblind
report. AI output cannot be labelled as human or expert evidence.

## Non-objectives and frozen state

This phase performs no provider call, network access, credential loading,
collection, recruitment, real judgment, deblind outcome decision, ranking or
threshold change. LiteAPI remains the future operational provider candidate
but is not used or qualified here. RouteStack remains historical evidence only
and on live hold; RateHawk remains an optional pending candidate.

Public V2 and the public runtime are unchanged. V3 is not promoted, Split
remains OFF, real Golden cases and real judgments remain zero, V3-17 remains
not met, and V3-18 remains unauthorized.
