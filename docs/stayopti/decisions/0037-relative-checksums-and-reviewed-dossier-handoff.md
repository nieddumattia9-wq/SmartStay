# D-0037 — Relative checksums and reviewed diagnostic dossier handoff

Date: 2026-09-06

## Context and problem

D-0036's custody helper parsed checksum entry names without the containing
checksum document's directory. A nested archive therefore failed validation
even when the preparation audit resolved the same checksums correctly. The
pure descriptor validator also accepts `NOT_REVIEWED` for preparatory checks;
that is not permission to import a real dossier. Custody originally retained
only the descriptor fingerprint, insufficient to reopen the reviewed mapping.

## Decision and scope

Resolve checksums once, relative to the checksum document, through the shared
intake parser. No basename search, alternative roots, rewritten checksums or
repackaging. ZIP backslash separators remain supported at the index boundary;
canonical paths and Windows aliases/collisions are checked before extraction.

Add a separate PowerShell 5.1-only `CodeManifest / Preflight / Import / Reopen`
handoff, not a T5B mode. Require exact executable/material hashes, a fresh
CurrentUser private destination, a separately declared human transcription
review and an exact import literal. Pending preparation cannot create custody.
Archive integrity and timestamp/reference validation precede encryption and
finalization. Descriptor, data map, review receipt and code manifest join the
originals as four encrypted review materials in the same atomic transaction.
Reopening verifies both exact file hashes and canonical fingerprints, then
rechecks review bindings. It never emits private document contents.

## Product rationale and evidence reviewed

Reviewed D-0031/D-0036, T5B, intake/indexer/custody code and the existing
AES-256-GCM/CurrentUser DPAPI retention implementation. Integrity does not
establish comparable decision evidence, human identity or retrospective
capture/scenario certification. Diagnostic status, missingness and exclusions
from blind judgment, V3 replay and Golden admission remain mandatory.

## Alternatives rejected

Do not fix the archive to fit the importer, pretend a pending review passed,
reuse manual T5B custody, discard screenshots, or treat a fixture/agent-visible
filesystem as proof of custody on the user's real dossier.

## Risks and safeguards

The receipt records human attestation; it is not a cryptographic identity
service. Actual human review and separate user authorization are operational
prerequisites, not supplied by the agent. Synthetic receipts use
`SYNTHETIC_TEST_ONLY` and cannot pass the real path. Links/junction ancestors,
repository destinations, collisions, existing sessions and altered materials
fail closed. Compilation and extraction are temporary; originals are never
modified. Controlled failures remove only newly created staging/extraction.
A process kill may leave an `.importing-*` directory, never a valid session;
it must not be renamed or resumed as finalized evidence.

## Retention audit — no policy change

Every successfully imported original and review material uses the existing
`PROCESSED_SUCCESS` disposition: 14 days from `custodyStartedAt`, passed to the
envelope as `capturedAt`. This is collector custody time, not the earlier
declared screenshot capture time. Expiry is metadata plus an explicit
`purgeExpired(evaluatedAt)` operation; no timer/background deletion exists.
Decrypt/reopen does not enforce the clock deadline. The lower-level extension
API adds 90 days before expiry; it does not track a one-extension-only limit.
This handoff exposes neither extension nor purge and changes neither behavior.
The human receipt must acknowledge these semantics. A retention decision and
an operator purge schedule are still needed before real import; the code does
not promise permanent preservation or automatic erasure on day 14.

## Implementation consequences, validation and rollback

Validator version advances to `@2`; descriptor `@1` and custody `@3` remain
compatible. Custody-v2 is untouched. The low-level optional review-material
extension remains readable for prior synthetic custody; the new handoff
requires the four materials and refuses to represent an older fingerprint-only
session as reviewed custody. Synthetic tests cover root/nested ZIP layouts,
hash/reference/path errors, Windows aliases, genuine JPEG bytes named `.png`,
interruption and overwrite, real PS5.1/DPAPI import/reopen and review-material
tampering. Exact executed results are recorded in the task receipt. No real
import, custody, review receipt or new preparation version is created here.
Rollback must be forward-only and never rewrite existing evidence.

## Approver / supersedes

User's offline checksum/handoff repair instruction, 2026-09-06. Extends
D-0036's supported handoff; does not supersede D-0031, retention authority or
Golden eligibility requirements. No commit, network or real-import authority.
