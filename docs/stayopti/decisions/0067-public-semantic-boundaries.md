# D-0067 — Public semantic boundaries

Date: 2026-09-19.
Base: `c5aa86615a344ff5cfe31e7c75fb6635f5395da8`.
Original package status: isolated candidate. Its evidence below is historical;
the separately authorized Windows integration is recorded in the final section.

## Context and decision

The rigidity audit reproduced four problems in the public path: an unknown
Rates response became no availability; amenity keywords overrode negation and
cost; opaque offer tokens/URLs were lowercased; missing numbers became zero.
Repair these boundaries without changing ranking weights, recommendation roles,
provider ordering, acquisition profiles or historical evidence.

### R01: classify a response before interpreting success records

The LiteAPI boundary distinguishes success, documented no results, provider
errors and unknown formats. Root code 2001, an explicit empty array and an empty
HTTP 204 remain separate bases. Other errors, contradictory envelopes, missing
data and unmappable nonempty records are not evidence of no availability.
Recognized legacy wrappers retain their application errors; unrelated metadata
does not become a protocol error. Unknown provider record counts are null.
The public delivered-list count is not an inventory count.

The public adapter and its no-results helper share a pure classifier. Synthetic
parity checks cover the shared documentary wire profile. Existing private
diagnostic/capture scripts are unchanged; this is not a migration of their
versioned inventories or captured results.

### R03: interpret bounded amenity assertions

A provider-neutral qualifier separates presence from free/paid/unknown cost,
retains source text and scope, and distinguishes explicit negation, conflict
and unsupported qualification. V2 receives a false fact for an explicit absence,
not a true keyword match. Unsupported conditions remain unknown. The display
uses the same qualifier: unpriced Wi-Fi is not labeled free. Qualified or
negative text remains reachable in the service details even with one group
and no positive highlights.

This changes public factual inputs and presentation. Decisions may consequently
change when previously false facts are corrected. It does not replace V2 with
V3 or change weights and policy parameters. The grammar is bounded; it is not a
general natural-language interpreter and does not guess missing conditions.

### R04: preserve opaque identities and open sessions

The v2 identity payload preserves exact provider token and URL bytes and uses
structured serialization. Token spelling does not decide whether an ID is
synthetic. The public `offer-...` syntax remains unchanged. Existing v1 tokens
are still resolvable against stored offers when unambiguous; distinct matching
records are refused regardless of array order. Deeply identical duplicate
records do not create artificial ambiguity. No stored session is rewritten.

### R05: preserve numeric absence

The public hotel mapper accepts finite numbers and nonempty numeric strings.
Null, blank strings, booleans, objects and arrays do not become zero. Explicit
zero remains known. The helper is shared by numeric fields, so this is a
semantic correction to numeric absence rather than a distance-only special case.

## Historical candidate evidence (not Windows integration proof)

The isolated snapshot contains 877 Git-blob-verified text files. Before the
repairs, the first 53 new regressions produced 15 PASS / 38 FAIL. Later legacy
wrapper counterexamples also failed before repair (0 PASS / 2 FAIL). Tests use
invented data, including another provider namespace, alternate representation,
array permutation, preserved ambiguity and missing/explicit numeric values.

The final combined runtime check on Linux / Node 24.19.0 passed 315/315 tests:
all 214 V2 runtime tests and 101 selected lifecycle tests, with zero skips.
61 are new regressions (18 V2 and 43 lifecycle). The V2 runtime check uses an
external TypeScript stripping/CommonJS compatibility harness with network
disabled; it is not the repository's TypeScript compiler or Windows runner.
The final 101 selected lifecycle tests also pass with standard `node --test`,
without that compatibility harness; these are the same tests, not another 101
distinct checks.
Canonical typecheck, build, compiled V2/V3 gates and browser verification have
not been executed in this environment. Dependency installation attempted only
offline and failed with ENOTCACHED; no dependency or lockfile changes are part
of this candidate. These results are not GitHub CI evidence.

Three existing metadata-enrichment test stubs returned `{ rates: true }`, which
is not a recognized response envelope. Their transport stubs now supply a data
array. Mapper doubles, enrichment expectations and all original assertions are
unchanged. The separate unknown-envelope rejection regression remains active.
Earlier harness failures and intermediate evidence are retained outside Git.

## Alternatives, risks and safeguards

Do not solve the issues by accepting every unknown response, discarding unknown
words, folding opaque IDs or inventing numeric zero. Conversely, do not reject
equivalent documented absence forms, paid-but-present services, identical
duplicate offers or an explicit zero. Ambiguous legacy booking tokens cannot
be silently resolved by choosing the first record. This compatibility limit
is preferable to selecting a different offer for an existing session.

Public service highlighting is intentionally narrower when the assertion is
unqualified; the original wording remains visible. Canonical compilation and
the affected V2/V3 and booking gates must be checked before accepting this as a
checkpoint. No full private offer qualification or recommendation is implied.

## Original candidate implementation and rollback

Scope: nine production source files, three test files and this decision plus
its append-only index entry. No package, lockfile, launcher, acquisition plan,
private journal, marker, canonical source or CURRENT_STATE change is included.
The transfer bundle contains a base/candidate SHA-256 manifest, an ordinary Git
patch and synthetic evidence. Check the actual target checkout before applying;
never reset unrelated user changes to match the base. A candidate can be
discarded without affecting the Windows checkout. If later integrated, use a
separately reviewed forward revert; do not rewrite historical receipts.

Approver: Mattia requested proceeding with the first audit corrections.
No production deployment, new acquisition, credential use or publication was
performed by this candidate preparation. Existing publication authority, if
applicable in the target session, still depends on its required validation gates.
Supersedes: only the four defective boundary behaviors above. All historical
capture results and all other audit findings remain separate and unchanged.

## Authorized Windows integration, 2026-09-19

Mattia subsequently authorized review, integration, the official Windows gates
and selective non-force work-branch publication. The actual base matches the
candidate. The final integration scope expands the original 14 paths to 21:
the validation report, CURRENT_STATE, additional Rates regressions, a fourth
legacy transport-stub correction in security, and three narrowly scoped files
closing a preexisting mandatory V3 regression (bed helper plus two tests).

Review additionally closes mapper-consumed nested error paths and contradictory
legacy result wrappers. The service presentation fixes a normalized-hyphen
alias mismatch, while unsupported words and qualifications remain uncertainty.
All four legacy transport-stub updates keep their original assertions intact.

The first official V3 run found that JavaScript's ASCII word boundary after
accented `disponibilità` silently discarded a subjectless bed condition. This
was present in D-0065/D-0066, not caused by this lot. The bounded Unicode token
boundary repair restores the existing LSI09 expectation; it does not change
bed counts, safety requirements or policy. HD23 retains the historical body
hash and proves only the explicitly authorized reversible delta. Historical
acquisition inventories and results are not rebound to the corrected helper.

Initial failures and results are preserved. Final measured gates, publication
scope, limits and synchronization requirements are reported in
`../../engine-v3/d0067-public-semantic-boundaries-validation.md`.

Integration result: exact Windows `release:ci` and `audit:security` PASS on the
clean final candidate. V2 226/226, V3 3042/3042, security 29/29, lifecycle
618 PASS / 17 explicitly configured real-Valkey SKIP; TypeScript/build and
PS5.1 parse 17/17 PASS. Local browser checks use invented service statements.
No provider request, production deploy or main promotion occurred. Work-branch
publication is authorized; direct remote readback, not local tests, determines
the final synchronization result supplied with the delivery.
