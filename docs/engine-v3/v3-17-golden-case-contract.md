# V3-17O — Golden Case contract, deterministic validator, and quarantine

Status: implemented offline on the V3-17N baseline. This checkpoint creates no Golden evidence, changes no public runtime, and does not satisfy V3-17.

## Baseline and scope

V3-17N remains authoritative: the verified corpus contains zero valid Golden cases, V3-17 is not met, V3-18 is not eligible, Split remains off, RouteStack Public remains in live hold, and RateHawk remains response-pending. The 115 historical operational receipts remain excluded; a receipt is not converted into a decision case by this validator.

V3-17O adds a private, provider-agnostic admission layer in the existing `src/engine-v3/evaluation` domain. It reuses the canonical V3 profile, role, reason-code, stable-serialization, and Node SHA-256 primitives. It does not export through the public Engine V3 boundary and does not alter V2, ranking, policy, Split, provider adapters, or deployment behavior.

The versioned identifiers are:

- schema: `stayopti.v3.golden-case@1`;
- validator: `stayopti.v3.golden-case-validator@1`;
- fingerprint domain: `sha256:stayopti-golden-canonical-json@1`.

## Contract

A case carries a corpus-local `goldenCaseId`, a statistical `searchFamilyId`, a case and schema version, a coarse creation bucket, sanitized provenance, trip and traveler contexts, at least two provider-neutral alternatives, separate V2 and V3-candidate decisions, an expected single-stay role, abstention eligibility, and evidence references.

The accepted source kinds are:

- `REAL_NORMALIZED_SNAPSHOT`;
- `CONTROLLED_ADVERSARIAL`;
- `COUNTERFACTUAL_DERIVED`.

Real snapshots must declare observed provider exhaustion within the authorized collection cap and no parent. Derived cases must declare a local parent, a controlled offline boundary, and at least one precommitted transformation. Counterfactual cases also require pair metadata.

All identifiers are local, uppercase, bounded tokens. Alternative identifiers are fixture-local (`ALT_*`). `searchFamilyId` identifies the common normalized search snapshot, not a provider. A controlled provider-source key is provenance only and cannot affect a decision.

Trip context covers valid check-in/check-out dates, exact nights, adults, canonical child ages (0–17), rooms, expected ISO-style currency, a sanitized destination bucket, lead-time bucket, stay-length bucket, and season bucket. Traveler context reuses the canonical V3 profile and expresses budget in non-negative integer minor units plus explicit distance, comfort, and flexibility requirements.

Each alternative contains total trip cost in integer minor units and explicit wrappers for taxes/fees, rating, review evidence, distance, accommodation category, room, cancellation, and comfort evidence. Reliability, cost completeness, bookability/recheck status, missing-evidence codes, and canonical V3 reason codes remain separate.

`UNKNOWN` is evidence. Every evidence wrapper must exist and contain an explicit state, reliability, null value, a non-empty reason, and its evidence references. An absent required wrapper is not equivalent to `UNKNOWN`.

V2 and V3-candidate decisions remain distinct. Each declares its engine key, policy version, status, exactly zero or one selected local alternative, role, confidence basis points, reason codes, evidence references, and fallback status. Single-stay selection cannot reference Split, multiple alternatives, or an unknown alternative. An abstention cannot carry an active choice.

## Validation dispositions

`GOLDEN_VALID` means the structure, references, identity, currency, prices, provenance, source-specific rules, fingerprint, and safety constraints all pass.

`QUARANTINED_INCOMPLETE` is reserved for potentially recoverable absence: a missing required wrapper or top-level field, unresolved evidence reference, incomplete provenance or transformation documentation, or a missing declared fingerprint. Quarantine never counts as Golden.

`REJECTED_CONTRACT` is fail-closed. It covers unsupported or ambiguous structure, invalid JSON values, unsafe object descriptors/prototypes, provider identifiers, raw material, secrets, PII, commercial fields, invalid IDs, duplicate local alternatives, dangling decision references, currency mismatch, invalid minor units, and fingerprint mismatch.

Issues contain only stable reason codes and sanitized paths. They are de-duplicated and sorted by path then reason code. No rejected value is echoed.

The stable reason families include schema, missing/type-invalid fields, unsafe fields, raw provider identity, secret/token, PII, commercial influence, duplicate IDs/fingerprints, decision references, currency and price, provenance, counterfactual integrity, family limits, exact duplicates, and accepted explicit-unknown evidence.

## Recursive safety firewall

The validator traverses own data properties only and rejects symbols, accessors without invoking them, cycles, sparse or non-JSON values, non-plain objects, unexpected prototypes, and prototype-pollution keys. Field names are normalized case-insensitively with punctuation and separators removed, so spellings such as `provider_id` cannot evade the denylist.

Denied families include provider/hotel/rate/offer/search/booking/prebook/continuation/correlation identifiers, raw request/payload/response, authentication material, secrets and credentials, personal contact/identity fields, commissions, markup, affiliate revenue, commercial ordering, and commercial probability/value fields. Values are never logged. General controlled source classes are permitted only in sanitized provenance.

## Canonical serialization and fingerprint

The fingerprint is a standard Node SHA-256 digest over canonical JSON in the dedicated Golden domain. No HMAC or secret is used.

Canonicalization:

- recursively sorts object keys;
- rejects `undefined`, functions, symbols, bigint, non-finite numbers, accessors, sparse arrays, non-plain objects, and cycles;
- excludes `declaredFingerprint`;
- excludes `goldenCaseId`, because that ID is an address rather than decision evidence and exact content must remain detectable under a renamed ID;
- includes all material trip, traveler, provenance, alternative, evidence, transformation, decision, and family information;
- sorts alternatives by local alternative ID, independent of provider arrival order;
- sorts set-like arrays: child ages, evidence references, reason codes, missing-evidence codes, constraint/requirement/comfort feature codes, decision selections, and counterfactual changed paths;
- preserves semantic order for transformation arrays through their required contiguous ordinal.

The serialization and digest are OS-independent. A supplied fingerprint must equal the computed digest. The serializer never prints its canonical input.

## Corpus validator

`validateGoldenCorpusV3` is pure and does not mutate the input. It returns ordered per-case reports, corpus issues, admission counts, the case denominator, the distinct-search-family denominator, and deterministic per-family counts.

It rejects every colliding member rather than choosing a favorable winner when it finds:

- duplicate `goldenCaseId`;
- duplicate content fingerprint;
- more than four admitted primary cases in one search family;
- an incomplete or invalid counterfactual pair.

It separately counts valid, quarantined, rejected, exact duplicates, families, controlled adversarial cases, counterfactual cases, evaluable abstentions, replay-eligible real cases, and excluded Split cases. Profile variants are not independent observations. Split fixtures never count automatically as single-stay Golden evidence. The result always keeps `v3_17GateMet=false` and `v3_18EntryAllowed=false`; V3-17T owns the future gate decision.

Provider-neutral replay eligibility is conservative: a valid real normalized case must have observed provider exhaustion within its authorized boundary. Derived fixtures remain valid Golden subsets when their source rules pass, but do not masquerade as new provider observations.

## Counterfactual pair validator

A valid pair consists of exactly two individually valid `COUNTERFACTUAL_DERIVED` cases with the same pair ID, search family, parent, precommit flag, and one allowlisted changed dimension. The allowlist is budget, profile, distance preference, comfort requirement, flexibility requirement, price, quality, or evidence availability.

The declared dimension must actually differ. All other material dimensions must remain canonically equal. Parent provenance and changed paths must be explicit. This prevents post-result construction and multi-variable counterfactuals from entering the corpus.

## Quarantine workflow

Quarantine is a separate non-counting corpus. A producer may repair only the stated missing or unresolved contract material, increment `caseVersion`, recompute the fingerprint, and resubmit. A rejected case is not automatically repairable: unsafe/raw/commercial data must be removed at its source and the complete candidate rebuilt. Validators never fill missing evidence, infer identifiers, invent provenance, or mutate the submitted object.

## Synthetic verification coverage

The offline tests cover complete real, adversarial, and counterfactual cases; explicit unknown evidence; absent wrappers; every unsafe-field family; invalid decisions, currencies, minor units and schemas; duplicate IDs/fingerprints; a fifth family variant; invalid counterfactuals; canonical key and alternative ordering; material fingerprint change; prototype/accessor attacks; deterministic issue ordering; dual denominators; and explicit Split exclusion. All fixtures are synthetic and controlled.

## Privacy and non-objectives

No provider identifier, payload, response, booking identifier, continuation identifier, token, credential, PII, or commission is persisted by this contract. No `.env` value is read. This phase performs zero HTTP and provider calls.

V3-17O does not implement collection, provider integration, evaluation UI, human or expert judgments, deblinding, V2/V3 metrics, ranking or policy changes, Outcome Pilot, or Split. It creates zero real Golden cases and grants no provider-call or promotion authority.

The next authorized roadmap step is `V3-17P_BLIND_EVALUATION_CAPSULE`.
