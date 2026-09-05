# D-0032 — OS-split release gate for Windows PowerShell 5.1 coverage

Date: 2026-09-05
Status: Accepted
Approver: Mattia

## Context and problem

GitHub Actions run 81 failed on `ubuntu-latest` for commit
`1d6ae61007d2a07d7ec67130a5df2620f9e7725a`. The canonical Engine V3 suite
included tests that launch Windows PowerShell 5.1, but the only release job ran
on Linux. Fifteen handoff checks and the PowerShell Evidence ZIP roundtrip
therefore failed because `powershell.exe` was unavailable. A corrupted-ZIP
check could also pass for the wrong reason because it accepted any child
process exception, including executable-not-found.

The failure is CI topology and test-harness coupling, not a V2/V3 decision or
provider-runtime defect. The published 52-commit fast-forward remains valid.

## Decision and scope

The release workflow is split into three mandatory jobs:

1. `linux-release-gate` runs the universal release CI suite on
   `ubuntu-latest`;
2. `windows-powershell-51-gate` runs the complete Engine V3 suite on
   `windows-latest` after proving that the active shell is Windows PowerShell
   Desktop 5.1 and that the canonical executable exists;
3. `release-gate` may build the release payload, create its manifest and upload
   release evidence only after both preceding jobs report success.

Tests that actually launch Windows PowerShell 5.1 use an explicit,
reason-bearing non-Windows skip. Universal contract, domain and static checks
continue to run on every operating system. A Windows process check fails if
the executable does not start, returns `status=null`, omits stdout/stderr or
fails to produce its required diagnostic log.

## Test classification

| Test group | Classification | Required execution |
|---|---|---|
| T1C 01–15 and 17–19 | Windows PowerShell 5.1 integration | Required `windows-latest` job |
| T1C 16 and 20–30 | Universal static/domain contract | Linux and Windows Engine V3 suites |
| T1A 01–42 | Universal collector/Evidence contract | Linux and Windows Engine V3 suites |
| T1A 43–44 | Windows PowerShell 5.1 ZIP integration | Required `windows-latest` job |
| T5B 15–16, 31, 34 and 43 | Windows PowerShell 5.1 launcher/custody integration | Required `windows-latest` job |
| T5B 01–14, 17–30, 32–33 and 35–42 | Universal contract or Node-only integration | Linux and Windows Engine V3 suites |
| T2A-R0 22 | Windows PowerShell 5.1 DPAPI-script parse | Required `windows-latest` job |
| T2A-R0 01–21 and 23–25 | Universal quarantine/replay contract | Linux and Windows Engine V3 suites |

T1C 01 now supplies an explicit `Restricted` process execution policy rather
than relying on the host default. T1A 44 accepts only a controlled marker and
exit code emitted after the .NET ZIP parser rejects the corrupt file.

## Product rationale

Windows-specific operational guarantees remain real guarantees rather than
being weakened into Linux mocks or silently replaced with PowerShell 7.
Portable decision, safety and release contracts still receive Linux coverage.
No release artifact can be created from only one operating-system gate.

## Evidence reviewed

- GitHub Actions run 81 outcome reported by the user;
- clean-Linux reproduction reported for exact commit `1d6ae610...`;
- `.github/workflows/release-gate.yml` at that commit;
- `v3SerpApiGoogleHotelsCanaryHandoff.test.ts`;
- `v3SerpApiGoogleHotelsPilotEvidence.test.ts`;
- canonical Windows PowerShell runner guardrails;
- local Windows PowerShell 5.1 baseline execution.

## Alternatives rejected

- Skipping Windows tests on Linux without an obligatory Windows job: loses the
  operating-system guarantee.
- Replacing Windows PowerShell 5.1 with `pwsh`: changes the validated runtime.
- Treating every child-process error as a successful negative test: preserves
  false positives.
- Creating release artifacts in the Linux gate before Windows completes:
  violates the combined release boundary.

## Risks and safeguards

- Additional CI time: limited to one complete Engine V3 Windows run and a
  packaging job after both gates.
- Workflow drift: release regression tests verify job OS, dependencies,
  PowerShell edition/version, absence of `pwsh`/`continue-on-error`, and the
  location of manifest/artifact steps.
- Linux masking: skips include a stable reason and only wrap tests whose
  contract genuinely requires Windows PowerShell 5.1.

## Implementation consequences

No Engine V2, V3 core, provider runtime, ranking, weights, public runtime,
private Evidence, `_002` state or dependency manifest changes. The corrective
change is limited to the workflow, affected tests and governance records.

## Validation and rollback

Validation requires the targeted PowerShell suites on Windows, the complete
Engine V3 and V2 suites, Linux-equivalent execution with only the documented
Windows skips, lifecycle/security/release/analytics/capacity/beta, typecheck,
build, PowerShell 5.1 parsing, secret/private-artifact scans and Git whitespace
checks. Rollback is a normal forward commit; published history is not rewritten.

## Supersession

This decision does not supersede a product or provider decision. It corrects
the single-OS release-gate topology that produced run 81.
