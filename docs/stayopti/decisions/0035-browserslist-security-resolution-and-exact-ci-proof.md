# D-0035 — Browserslist security resolution and exact CI proof

Date: 2026-09-05
Status: Accepted; validated locally, pull-request update pending
Approver: Mattia, through the D-0035 instruction

## Context and problem

Pull-request run 84 passed typecheck, all test suites, the analytics gate and
the build, then failed only in `npm run audit:security`. The root audit used by
that command includes development dependencies and reported one high-severity
advisory in transitive `browserslist` 4.28.4. D-0034 had proved only
`npm audit --omit=dev` at the root, which correctly described production
dependencies but was not equivalent to the release gate.

## Decision and scope

- Update the root lockfile through npm from transitive `browserslist` 4.28.4
  to 4.28.9.
- Permit npm to refresh only the tightly coupled Browserslist data family:
  `baseline-browser-mapping`, `caniuse-lite`, `electron-to-chromium`,
  `node-releases` and `update-browserslist-db`.
- Do not add a direct dependency, change either package manifest, change the
  server lockfile, use a forced audit repair or accept unrelated lock churn.
- Name the two audit scopes unambiguously as
  `ROOT_ALL_DEPENDENCIES_AUDIT` and
  `SERVER_PRODUCTION_DEPENDENCIES_AUDIT`.
- Require pre-push proof from the exact repository commands
  `npm run audit:security` and `npm run release:ci`. Partial commands and
  different audit scopes are supporting evidence only, never CI-equivalent.

## Product rationale

Release evidence must represent the gate that actually controls publication.
A narrower audit can answer a useful question without answering the release
question. Keeping the repair lock-only and within one transitive browser-data
family removes the known advisory without changing product behavior, runtime
contracts or direct dependency policy.

## Evidence reviewed

- User-reproduced clean Linux output from run 84 showing the sole failure in
  `npm run audit:security`;
- `scripts/run-security-dependency-audit.mjs`, which audits all root
  dependencies and production-only server dependencies;
- the root dependency graph from ESLint/Babel through
  `@babel/helper-compilation-targets` to `browserslist`;
- npm advisory metadata identifying the patched range and target 4.28.9;
- the npm-generated root lockfile diff.

## Alternatives rejected

- Relying again on `npm audit --omit=dev` for the root: it does not exercise
  the release policy.
- Adding `browserslist` directly: the package is implementation-transitive and
  needs no application-level ownership.
- `npm audit fix --force`, a major update or broad lock refresh: each exceeds
  the demonstrated cause.
- Treating separately passing suites as a substitute for `release:ci`: that
  would repeat the methodological failure.

## Risks and safeguards

- The lock diff is reviewed package-by-package and must remain within the
  Browserslist family.
- `fast-uri` 3.1.7 and server `qs` 6.16.0 remain fixed.
- Validation occurs in a clean detached candidate without ignored,
  untracked, environment or developer-dirty inputs.
- The exact security and release commands must pass before commit and push.
- Final manifest creation and verification are exercised in a temporary
  directory and leave no release artifact behind.

## Implementation consequences

The implementation changes the root lockfile plus this decision, current
state and decision index. It does not change either package manifest, the
server lockfile, Engine V2, Engine V3 behavior, public runtime, provider code,
private evidence or user credentials.

## Validation and rollback

The decisive validation sequence is `npm ci`, server `npm ci`, root all-
dependency audit, server production audit, `npm run audit:security`, then the
exact `npm run release:ci`, all from an isolated clean detached candidate.
Engine V3, Engine V2, typecheck, build, PowerShell 5.1 parsing, secret/private-
artifact scans and Git whitespace checks remain required. Release candidate
creation and verification must bind the same explicit candidate SHA in a
temporary output directory. Any rollback is forward-only and separately
authorized.

The isolated clean detached candidate passed both zero-vulnerability audits,
the exact `npm run audit:security` command and the exact full `npm run
release:ci` command. Explicit reruns passed Engine V3 1509/1509, Engine V2
196/196, TypeScript, build and all 9/9 tracked scripts under Windows
PowerShell 5.1. Secret/private-artifact and Git whitespace scans passed.
Release candidate creation and manifest verification used the same explicit
candidate SHA and left no persistent release artifact. The terminal
pull-request workflow outcome remains pending publication of this commit.

## Supersession

This decision corrects the D-0034 audit-equivalence claim. It preserves
D-0034's dependency versions, detached-head boundaries and all D-0032/D-0033
release topology and clean-candidate requirements.
