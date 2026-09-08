# D-0045 — Explicit checkpoint for the synthetic D-0038 launcher

## Separate prerequisite repair

The D-0044 failure was a launcher prerequisite, not a failed intent assertion:
`verifyCode()` rejected the working branch before reaching the inventory check.
The literal historical branch is replaced by mandatory caller-supplied
`ExpectedBranch`, `ExpectedHead`, `CodeInventoryPath`, `CodeInventorySha256`.
The launcher passes these values unchanged to Node; none default to current Git.
`DETACHED` is an explicit branch value for an authorized detached CI fixture,
not a fallback for an existing session. Staging must remain empty.

The new inventory format `stayopti.synthetic.demo-code-inventory@2` contains
`expectedBranch`, `expectedHead`, `sourceFingerprint`, and `codeFiles` entries
with `path` and `sha256`. The source fingerprint covers every file under `src`
and `scripts`, followed by `tsconfig.tests.json`, `package.json`, and
`package-lock.json`, using the existing deterministic tree inventory order.
It is SHA-256 of the JSON array of `{path,sha256}` entries (UTF-8). Explicit
per-file inventory checks are retained. Inventories are prepared only for NEW
authorized synthetic runs. They must never be regenerated to reopen progress.

New demo config version `stayopti.synthetic.assisted-demo@2` retains the branch,
HEAD, inventory hash and source fingerprint, separately from the compiled tree
inventory. Reopening checks these bindings before directory/lock writes.
Actions check source/inventory and compiled bytes again before event writes.
Old configs are rejected without migration or lock recovery. Existing packages,
real progress and sealed D-0037 code are untouched.

## Invocation (new synthetic fixture only)

Use Windows PowerShell **5.1 Desktop**, not pwsh. Supply all four checkpoint
arguments explicitly to `scripts/invoke-prospective-assisted-evaluation-demo.ps1`,
with `-Mode PrepareOnly`, then `Start` or `Inspect` using the SAME values and
the SAME synthetic DataRoot. No real-data path is accepted. A changed checkout
or inventory requires a new authorized synthetic fixture, not rebinding.

## Proof and scope

The existing real PS5.1/CurrentUser DPAPI test remains intact and now reaches
inventory validation on the authorized work branch. It exercises both 5/8
alternative fixtures, two stale clients, correction, explicit confirmation,
synthetic diagnostic judgment, append-only events and reopen. Additional
assertions reject wrong/missing checkpoint, changed inventory/source/compiled
bindings and legacy config before progress writes; a separate temporary Git
repository proves nonempty staging rejection through the actual PS launcher.
No branch rename, assertion bypass or skip is introduced on Windows.

This addendum supersedes only the historical D-0044 launcher blocking outcome;
the eleven D-0044 source/document files remain byte-identical. Their reports
remain historical evidence. D-0044 does not supply full robustness, real-case
execution, Golden eligibility or public runtime activation. No ranking policy
changes belong to D-0045.

Consolidation evidence and actual test/push results are delivered separately in
the phase ZIP. Every completed software phase must report actual push status
and commits still local; successful local tests do not imply synchronization.

## Validated checkpoint (offline clean work-branch checkout)

Windows CurrentUser: Engine V3 1762/1762, no skips; both launcher tests PASS,
including the full two-client flow through real PowerShell 5.1 and synthetic
DPAPI custody. The 41 D-0044 regressions pass within that suite. V2 196/196;
lifecycle 530 PASS / 17 existing skips; security 29, release 101, analytics 31,
capacity 9, beta 4 PASS. Typecheck, build, analytics gate, all-script PS5.1 parse,
and local-loopback smoke PASS. No remote provider or real-data test ran.
Online dependency audit and release-environment checks are not claimed: this is
the offline software gate, not release:ci, production authorization or GitHub
workflow certification. The historical D-0044 V3 blocker is now resolved.

The requested eleven-file preservation keeps CURRENT_STATE and DECISION_LOG
byte-identical to D-0044. This separate append-only decision is the prerequisite
repair and checkpoint addendum, not a rewrite of the earlier failed evidence.
