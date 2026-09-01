# V3-17T1C — SerpApi canary handoff visibility and no-exit repair

Date: 2026-09-01

Source checkpoint: `126b178f8d380e3b5b849906b6ffc34787035f58`

Status: `PASS_READY_FOR_NEW_CANARY_AUTHORIZATION`

## Preserved user-observed result

The attempted T2 handoff did not show the API-key prompt. The user did not
enter a key, independently observed zero SerpApi calls and zero consumed
credits, and found no canary Evidence ZIP in Downloads. The four-call canary
authorization bound to runner bundle
`c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01`
was therefore not consumed.

## Reproduced failure boundary

The delivered wrapper launched the committed PowerShell file with Windows
PowerShell 5.1 `-File` under the machine execution policy. A clean reproduction
returns `UnauthorizedAccess` before the script body and therefore before
`Read-Host -AsSecureString`. The wrapper then used an explicit process exit on
the non-zero launcher result. In a disposable console this removed both the
failure text and the shell itself. The observed behavior is thus explained by
two connected defects:

1. the handoff did not use a process-scoped execution-policy allowance for the
   already hash-bound committed script;
2. the wrapper terminated the calling PowerShell instead of returning a
   sanitized result and pausing.

The forensic run used no credential and stopped before any provider-capable
body. The earlier long wrapper also relied on command autoload and had no
persistent pre-key diagnostic artifact. Those weaknesses are removed without
changing the canary request semantics.

The sanitized forensic tuple is: failing step `POWERSHELL_LAUNCHER_START`,
exception type `System.Management.Automation.PSSecurityException`, error
identifier `UnauthorizedAccess`, child result code `1`, command class
`powershell.exe -NoProfile -File <committed-launcher>`, stdout empty and stderr
reduced to `SCRIPT_EXECUTION_POLICY_BLOCKED`. No dynamic stderr is retained.

## Committed handoff

`scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1` now owns the
complete visible-shell handoff. It verifies the branch/checkpoint, staged
state, exact seven unrelated dirty paths and SHA-256 values, runner bundle,
temporary TypeScript compilation, immutable manifest, old-literal revocation,
canary session/index, MAX4 cap, Node preflight and PowerShell launcher
preflight. SHA-256 uses the .NET cryptographic primitive and does not depend on
`Get-FileHash` module autoload.

The launcher has a deterministic `-HandoffPreflightOnly` mode. It performs the
same pre-key checks, emits `READY_FOR_SECURE_KEY_PROMPT=YES`, reports zero
runner calls, does not load credentials, does not create execution Evidence
and returns. The handoff invokes committed scripts with a process-only
`-ExecutionPolicy Bypass`; no machine or user policy is changed.

The future user invocation surface is seven short lines or fewer: reuse a
visible PowerShell, enter the repository, verify HEAD, invoke the committed
handoff with the exact separately authorized literal, and let the script own
all remaining checks. The operational network block is intentionally not
published in T1C.

## Failure visibility and secret handling

The handoff contains no PowerShell exit statement. Every path reaches one
cleanup block that clears the process environment, zero-frees the BSTR when it
exists, deletes only its validated unique temp directory, atomically writes a
diagnostic log under Downloads and pauses with:

`Read-Host 'Premi Invio dopo aver copiato il risultato'`

The same pause is used after PASS and FAIL. The log is an explicit allowlist of
timestamp, hashes, stage, last completed step, sanitized classification and
exception type, internal result code, Evidence presence, verified request
count and whether the prompt was reached. It never records exception text,
request URLs, API keys, secure strings, BSTR contents, property tokens,
provider IDs, raw payload, HTML or images. `Start-Transcript` is not used.

## Canary contract preserved

- immutable manifest SHA-256:
  `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`;
- only session index 0,
  `SERP_PILOT_01_FLORENCE_COUPLE_BALANCED`;
- maximum one search and three sequential details, four calls total;
- concurrency one, retry zero, pagination zero and unconditional Stage A stop;
- search snapshot validation before details and fail-closed detail ordering;
- delete-always raw handling, autonomous PASS/abort Evidence and T3 validation;
- Stage `REMAINING_11` unreachable from this invocation.

The bundle is now
`d3176600f3d028c450174b7e14de87084a3eab549eb60350f260043539a08683`.
Consequently the unconsumed `c412...` canary literal is revoked. The replacement
literal is:

`AUTHORIZE_V3_17T2_CANARY_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_d3176600f3d028c450174b7e14de87084a3eab549eb60350f260043539a08683_RETENTION_V2_MAX4`

It is published but not authorized. T1C performs zero HTTP requests, loads no
credential and grants neither canary nor retention authorization.

## Validation and product boundary

The targeted suite covers the reproduced policy failure, the real pre-key
path, zero-call/zero-credential properties, every injected pre-key boundary,
parent-process sentinels, empty-key fail-closed behavior, diagnostics,
Evidence/abort preservation, MAX4, autostop and provider neutrality. T1B/T1A/
T1/T and the requested Engine and integrity regressions are rerun before the
checkpoint is accepted.

Final offline evidence: T1C `30/30 PASS`; T1B `44/44`; T1A `44/44`; T1
`38/38`; T `25/25`; provider identity neutrality `5/5`; Engine V3
`1184/1184`; Engine V2 `196/196`; B1 capsule/blind, B2 corpus and legacy
quarantine `18/18`; F0 economic and lifecycle regressions `39/39`.
TypeScript, PowerShell 5.1 parsing, security, raw-ID/token,
license/provenance and Git integrity gates pass.

No Engine V2 or V3 decision semantics, provider runtime, weight, threshold,
UI, booking path, public runtime or manifest changes. No real session, Golden
candidate, Golden case or judgment is created. V3-17 remains unmet and V3-18
remains blocked.

Next recommendation:
`V3-17T2_SERPAPI_GOOGLE_HOTELS_ONE_SESSION_CANARY_REAUTHORIZATION_WITH_HANDOFF_V2`.
