# D-0036 — Admit browser-assisted dossiers only through lossless diagnostic custody

Date: 2026-09-05

## Context and problem

The evaluation boundary previously supported direct manual capture with one
private screenshot per alternative. A preliminary browser-assisted dossier can
contain multiple screenshots for one alternative, an external capture log,
timestamp evidence and provenance documents. Reducing that package to one
image would discard evidence; treating an assisted capture as unassisted would
misstate provenance. The reviewed pilot remains `DIAGNOSTIC_ONLY` and is not
imported by this change.

## Decision and scope

Add a versioned, evaluation-only dossier descriptor and custody-v3 import
boundary. It records direct-manual versus browser-assisted acquisition,
discloses assisted browser interaction, keeps logged-out/incognito/no-
personalization as independent verified, declared or unknown states, and
binds every original archive artifact to an individually encrypted envelope.
Every screenshot retains an explicit alternative reference and capture-time
source.

The importer verifies the caller-supplied archive SHA-256, all internal file
checksums, safe unique archive paths, evidence references and timestamp
ordering before finalization. It then creates a new session-scoped custody,
reopens every encrypted artifact and atomically publishes only a finalized
`DIAGNOSTIC_ONLY` state. Existing custody-v2 sessions remain readable and are
never implicitly migrated.

## Product rationale

Evidence integrity and decision eligibility are separate claims. A successful
import proves only the archive and custody checks actually performed. It does
not prove that the scenario was frozen before observation, that capture-time
claims are independently certified, or that the alternatives have sufficient
set-wide coverage for replay, blind judgment or Golden admission.

## Evidence reviewed

- D-0023 through D-0031;
- the manual capture contract, validator, runner and custody-v2 manifest;
- the AES-256-GCM and Windows CurrentUser DPAPI quarantine primitive;
- the Golden unknown-evidence wrapper and blind-evaluation separation;
- the prior read-only compatibility audit of the preliminary dossier.

No real dossier, `_002` state, private evidence or provider endpoint was read
or modified during implementation.

## Alternatives rejected

- Reuse custody-v2 by selecting one screenshot: this loses evidence.
- Expand custody-v2 in place: this changes the meaning of existing manifests.
- Treat archive import as retroactive capture certification: import begins a
  new custody event and cannot prove earlier facts.
- Admit an integrity-valid dossier to replay or judgment automatically:
  eligibility remains a separate manual gate.

## Risks and safeguards

ZIP traversal, drive-qualified paths, case-folded collisions, missing files,
checksum gaps and incoherent screenshot references fail closed. General size
and entry-count ceilings protect extraction without encoding pilot-specific
counts. Interrupted staging is removed and cannot appear finalized; an
existing session is never overwritten.

The observed wording `Include tasse e costi` is retained independently from
an `UNKNOWN` itemized tax breakdown. It does not establish an exact checkout
total, bookability, complete fiscal composition or final budget fit.

## Implementation consequences

The new boundary is under `src/engine-v3/evaluation` plus offline custody and
archive-index helpers under `scripts`. It has no fetch, browser, provider-
registry, public-runtime, ranking, weight or Golden-admission path. Each
future real import requires a separately reviewed descriptor and a new,
non-colliding session identity.

## Validation and rollback

Synthetic validation covers fifteen byte-identical screenshot round trips,
variable evidence counts, bad hashes, missing/incoherent references, unsafe
paths, collisions, interruption, overwrite refusal, custody-v2 compatibility
and non-promotion. The Windows test uses real PowerShell 5.1 and CurrentUser
DPAPI with synthetic bytes; portable contract tests do not certify custody on
the user's real dossier. Rollback is forward-only and must not rewrite
custody-v2 or any real evidence.

## Approver

User instruction dated 2026-09-05.

## Supersedes / superseded by

Does not supersede D-0031. It adds a separate forward-only custody contract
for multi-evidence, browser-assisted dossier import.
