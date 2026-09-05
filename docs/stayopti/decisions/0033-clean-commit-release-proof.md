# D-0033 — Clean-commit release proof without ignored or developer-dirty dependencies

Date: 2026-09-05
Status: Proposed; implemented and validated offline, not committed
Approver: Pending

## Context and problem

GitHub Actions run 82 showed that D-0032 corrected the operating-system job
topology but did not make the checked-in test corpus self-contained. The Linux
lifecycle gate read the ignored local file `server/.env`, which is absent from
a clean checkout. A clean Windows checkout also exposed ten failures that had
been hidden by the development working tree: five T1C checks depended on a
hardcoded seven-path dirty snapshot, four failures shared one legacy-fixture
line-ending digest cause, and one Decision Science `.gitattributes` assertion
read checkout-transformed bytes.

The seven paths are preserved as user work, but cannot be described as
unrelated to prior validation. The untracked real-measurement test adds ten V3
tests, while the T1C launcher explicitly required all seven path names and
hashes. A dirty, untracked or ignored worktree is therefore not acceptable
evidence that a commit will pass release gates.

## Decision and scope

Release proof must be produced from an isolated candidate derived only from
the proposed base commit plus the proposed patch. The candidate must contain
no copied ignored files, untracked files or developer dirty paths, and
specifically no `server/.env`.

- The Split R1 lifecycle test uses a unique synthetic `.env` fixture under the
  operating-system temporary directory. It supplies the fixture path
  explicitly to the same binding primitive, verifies before/after SHA-256 and
  removes the fixture in `finally`. It never opens the real `server/.env`.
- The SerpApi T1C handoff accepts only a clean committed snapshot. It no
  longer embeds developer path names, developer hashes or an ignored env-file
  hash. Tracked dependency manifests are checked against Git rather than
  against machine-specific checkout bytes.
- Canonical byte-digest assertions for the legacy diagnostic fixture and the
  Split R1/F0D probes read the committed Git blob. The frozen digests are not
  changed. The `.gitattributes` content assertion likewise reads the committed
  blob, so a legitimate CRLF checkout cannot change canonical repository
  evidence.
- The handoff bundle hash changes because the sealed PowerShell component
  changed. Earlier authorization literals remain historical and gain no new
  call authority.

## Root-cause accounting

| Failure group | Count | Root cause | Repair |
|---|---:|---|---|
| Linux lifecycle | 1 | ignored `server/.env` read by the test | explicit temporary synthetic fixture |
| Windows T1C | 5 | launcher required seven developer dirty paths | clean committed-snapshot gate |
| Windows legacy quarantine/constitution | 4 | LF canonical digest compared with CRLF checkout bytes | read immutable Git blob; digest unchanged |
| Windows Decision Science attributes | 1 | LF text assertion read CRLF checkout bytes | read immutable Git blob |

The lifecycle probe digest used the same checkout-byte anti-pattern and is
hardened prospectively without changing its frozen digest. A stricter CRLF
candidate also exposed four Split F0D test symptoms sharing one source-matrix
checkout-byte cause; binding validation to that unchanged Git blob resolves
all four without changing the plan hash. Two release-harness checks also used
LF-only marker parsing for YAML/TSX; their semantic parsing now normalizes only
line endings before locating unchanged markers.

## Product rationale

A release gate must validate the content that will be published, not hidden
machine state. Removing ignored and developer-dirty dependencies changes no
decision policy, weights, provider boundary or public runtime behavior; it
makes the existing safety evidence reproducible.

## Evidence reviewed

- GitHub Actions run 82 failure report supplied by the user;
- clean Linux and clean Windows failure counts supplied by the user;
- base commit `f54025aaaf1969859d71e86d105216f6b375d72b`;
- lifecycle env-binding test and Split R1 collector binding implementation;
- T1C PowerShell handoff and its Windows integration tests;
- legacy fixture/manifest Git blobs and their frozen digest;
- Decision Science Library `.gitattributes` Git blob;
- an isolated local candidate containing only the base commit plus D-0033.

## Alternatives rejected

- Copying `server/.env` into CI: would preserve an ignored secret-bearing
  machine dependency.
- Treating the seven local paths as harmless: contradicted by test discovery
  and the T1C hardcoded dirty contract.
- Updating legacy hashes to CRLF values: would replace canonical evidence with
  checkout-dependent bytes.
- Normalizing every fixture silently: would weaken byte-identity guarantees.
- Claiming a native Linux PASS without a native Linux Node runtime: would be a
  simulation claim rather than execution evidence.

## Risks and safeguards

- Git-blob reads require a Git checkout; the release tests already require and
  verify a commit-bound repository.
- T1C now refuses every dirty or untracked path, including convenient local
  development state, before credentials or transport.
- Synthetic env values exist only in a unique temporary fixture, are never
  provider credentials, and are deleted after the assertion.
- No provider network, credential loading, real collection or private
  Evidence access is part of this repair.

## Implementation consequences

The change is limited to lifecycle/Engine V3 test infrastructure, the sealed
T1C handoff and bundle hash, and governance records. It does not modify
Engine V2, V3 ranking, weights, public runtime, dependency manifests or the
real ignored env file.

## Validation and rollback

Validation must occur in an isolated clean candidate with ignored-file count
zero and `server/.env` absent. It includes targeted D-0033 checks, lifecycle,
the complete Engine V3 and V2 suites, release/supporting suites, typecheck,
build, PowerShell 5.1 parsing, secret/private-artifact scans and Git whitespace
checks. Native Linux CI is reported only when a native Linux Node runtime is
actually available. Rollback, if later approved, is a forward commit.

The isolated Windows candidate passed 151/151 targeted checks, Engine V3
1505/1505, Engine V2 196/196, lifecycle 530/530 with 17 canonical integration
skips, security 29/29, release 101/101, analytics 31/31, capacity 9/9 and beta
4/4. TypeScript typecheck, production build and all 9/9 tracked PowerShell
scripts parsed successfully under Windows PowerShell 5.1. Secret,
private-artifact and Git whitespace scans passed. After removal of temporary
tool dependency junctions and build output, the candidate again contained zero
ignored files, zero untracked files and no `server/.env`.

Native Linux execution is `NOT_EXECUTABLE_LOCALLY`: Ubuntu 24.04 and Ubuntu
26.04 are installed under WSL, but neither contains a native Linux `node`
binary. No package installation, network fallback or Windows-interoperability
simulation was used.

## Supersession

This decision supplements D-0032. It does not weaken the mandatory Linux and
Windows job split; it corrects the remaining checkout-state dependencies.
