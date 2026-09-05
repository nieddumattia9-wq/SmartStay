# D-0034 — Detached-head CI execution and bounded dependency audit repair

Date: 2026-09-05
Status: Accepted; validated on the isolated validation-branch candidate
Approver: Mattia, through the V3-17 D-0034 instruction

## Context and problem

The D-0033 pull-request workflow exposed three remaining clean-checkout
failures. GitHub checks out a pull-request merge candidate at detached HEAD,
so two Windows PowerShell 5.1 launchers received no text from
`git branch --show-current` and invoked `.Trim()` on a null value. This broke
eight tests before their intended offline behavior could be exercised. The
same workflow also reported production advisories in transitive `fast-uri`
and `qs` resolutions.

Detached HEAD is normal CI topology, but it is not authority to access real
custody, credentials, provider transport or mutable evidence. Dependency
repair must remain limited to the two vulnerable transitive resolutions.

## Decision and scope

- Capture Git output and exit status independently. Treat an empty branch as
  detached state without dereferencing a null value, and verify the exact HEAD
  before applying mode-specific branch rules.
- Permit the T5B launcher in detached state only for `dry-run` and
  `repair-dry-run`. Interactive and repair/export modes retain the `main`
  branch requirement.
- Permit the T1C handoff in detached state only when both `OfflineTestMode`
  and `HandoffPreflightOnly` are active. All other detached invocations fail
  before credentials or transport.
- Do not use GitHub environment variables as authorization evidence.
- Prove both allowances and prohibitions in genuine temporary detached Git
  worktrees.
- Update only root `fast-uri` from 3.1.5 to 3.1.7 and server `qs` from 6.15.3
  to 6.16.0 through npm-generated lockfile changes. Neither package becomes a
  direct dependency; package manifests remain unchanged.

## Product rationale

CI must reproduce valid offline proof without weakening real-world safety
boundaries. A checkout topology cannot authorize network or private custody.
Removing known production advisories without broad dependency movement keeps
the release candidate reviewable and leaves product behavior unchanged.

## Evidence reviewed

- D-0033 pull-request run `33970339678` and its eight Windows failures;
- both affected PowerShell launchers and their PowerShell 5.1 integration
  suites;
- repository execution guardrail prohibiting `.Trim()` on possibly null
  native-command output;
- root and server npm lock graphs showing the vulnerable transitive versions;
- npm advisory output after the bounded resolution updates.

## Alternatives rejected

- Reading `GITHUB_HEAD_REF`, `GITHUB_REF` or similar variables: CI metadata is
  not local execution authority.
- Allowing every detached invocation: this would weaken real custody and
  provider preflight gates.
- Skipping Windows integration tests: the required PowerShell 5.1 behavior
  would remain unproved.
- Adding direct `fast-uri` or `qs` dependencies, using forced audit repair or
  accepting unrelated lock churn: each would expand scope unnecessarily.

## Risks and safeguards

- Temporary detached tests share only the committed dependency installation
  through a junction and remove the junction before removing the worktree.
- Real modes retain their exact branch and HEAD gates.
- T1C remains offline/preflight-only in detached state and continues to
  report zero credential and provider activity.
- The T1C sealed runner hash changes because its launcher changes; prior
  literals do not gain authority.
- Lockfile review is limited to version, resolved URL and integrity for the
  two approved transitive packages.

## Implementation consequences

The change affects two private/offline PowerShell launchers, their regression
tests, the T1C seal constant, two lockfile resolutions and governance records.
It does not modify Engine V2, V3 decision logic, public runtime, provider
runtime, package manifests, real evidence or user credentials.

## Validation and rollback

Validation must use an isolated candidate containing D-0033 plus only D-0034,
with no ignored or untracked source, no `.env` and none of the seven preserved
developer paths. It must pass the eight prior failures, new detached-worktree
regressions, full Windows Engine V3 and V2 suites, supporting release suites,
typecheck/build, PowerShell 5.1 parsing, clean installs, production audits,
artifact scans and Git whitespace checks. A second full Engine V3 run must
execute from a genuine detached candidate worktree. Rollback, if authorized,
is forward-only.

Local validation on 2026-09-05 used a clean candidate at D-0033 plus the ten
D-0034 paths, with no ignored or untracked source, no `server/.env` and none
of the seven preserved developer paths. The two affected suites passed 78/78,
including all eight previously failing cases. Engine V3 passed 1509/1509 both
on attached `main` and from a genuine detached candidate worktree; Engine V2
passed 196/196. Lifecycle passed 530 with 17 canonical integration skips;
security 29/29, release 101/101, analytics 31/31, capacity 9/9 and beta 4/4
passed. TypeScript typecheck, production build, PowerShell 5.1 parsing 9/9,
both clean installs, private-artifact/secret scans and Git whitespace checks
passed. Root and server production audits each reported zero vulnerabilities.

## Supersession

This decision supplements D-0032 and D-0033. It does not relax their clean
candidate, operating-system split or final release-gate requirements.
