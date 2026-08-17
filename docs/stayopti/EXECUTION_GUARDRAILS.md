# StayOpti Execution Guardrails

Version: 1.0  
Consolidated: 2026-08-17

The complete Windows history is preserved in `canonical-sources/05-*` and `canonical-sources/06-*`. Read the newest complete source before creating a Windows package or runner.

## 1. Inspect before acting

Start read-only. Verify branch, HEAD, upstream, staged/unstaged/untracked changes, package scripts, lockfile, configs, relevant tests, and tool paths. Preserve unrelated user work. Unexpected state is a stop condition, not permission to reset.

## 2. Separate failure domains

Classify failures before proposing a repair:

- application/domain logic;
- fixture or evaluation contract;
- provider behavior/no-results;
- runner, shell, quoting, archive, parser, or environment;
- infrastructure or external dependency.

After FAIL: establish root cause, add or identify the regression test, then prepare a new version. Never repeat a package blindly.

## 3. Mutation boundaries

No commit, push, provider call, booking, payment, deployment, production change, secret manipulation, or destructive cleanup without explicit authorization. State external calls and mutations in advance. Use a preflight that fails before mutation.

## 4. Evidence gates

Before accepting a checkpoint:

- run targeted regression tests;
- run every full suite required by the task;
- run typecheck/build/lifecycle checks when applicable;
- run `git diff --check` and staged equivalent;
- verify final HEAD and working-tree state;
- preserve structured evidence and exact exit codes;
- distinguish test PASS from product-policy validity.

## 5. Windows PowerShell 5.1

- Use Windows PowerShell 5.1-compatible syntax.
- Prefer repository canonical scripts such as `npm.cmd run test:engine-v2` and `npm.cmd run test:engine-v3`.
- Do not use `npx` when it could install packages.
- Do not use `Invoke-Expression`, improvised loaders, global `NODE_OPTIONS`, or fragile multiline quoting.
- Resolve `.cmd` executables explicitly and pass arguments separately.
- Keep stdout and stderr separate; never parse stderr as a path list.
- Check `$LASTEXITCODE` after native commands.
- Avoid ambiguous .NET overloads, untested `AddRange`, and methods on possibly null values.
- Do not treat a Linux-only test as proof that Windows quoting, archive behavior, or command invocation is correct.
- Keep evidence outside the repository and produce one final Evidence ZIP when a ZIP workflow is necessary.

## 6. Package design

Prefer direct work by Codex in the connected repository. If Mattia must run a package, minimize manual steps: one artifact, one tested command, built-in integrity check, preflight before patch, predictable naming, and a single Evidence artifact. Explain exactly what will and will not happen.

## 7. Stop criteria

Stop and report `BLOCKED` when root cause is unproven, repository state is unexpected, the invocation method is assumed, the new method repeats a known failure, evidence is incomplete, or authority for a consequential action is missing.
