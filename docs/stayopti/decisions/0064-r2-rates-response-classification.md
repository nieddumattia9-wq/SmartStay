# D-0064 R2 — Classify Rates outcomes before success-array validation

Date: 2026-09-17. Source: 3a13636eacc13fd8ed7c8832340caa4c37e5a6d2.
Authority: offline diagnosis and bounded evaluation-adapter repair; no commit,
push, new acquisition or historical-result mutation authorized by this task.

## Cause and decision

The success-only parser required a data array before inspecting application
errors. It therefore hid an explicitly declared Rates outcome behind a schema
failure. The same error is reproduced with a synthetic HTTP200/error.code2001
fixture before modification; the failure remains recorded separately.

The pure response diagnostic @1 authenticates exact bytes, then separates:
SUCCESS, DOCUMENTED_NO_RESULTS, PROVIDER_ERROR, UNKNOWN_FORMAT. The existing
frozen LiteAPI qualification documents HTTP200/code2001 as no availability.
Recognize it only at the Rates root error object, as numeric2001 or string2001,
with absent/null/empty-array data and no other applicable error. Record its
original error hash/path/code as a provider notice, not a silently erased error.
HTTP204 with no bytes and an explicit empty data array are separate empty-result
bases. No message-only inference, generic missing-data fallback or interpretation
of scoped property/rate errors as a global empty search is permitted.

Conflicting success data or other errors block comparison. Unknown formats
carry null counts, never invented zeros. Raw array records accompanying errors
remain counted for audit, but cannot become wire-bindable or comparable.
Catalog errors are likewise checked before its success schema; code2001 does
not become an empty valid catalog. The capture path rejects UNKNOWN_FORMAT,
continues to stop on true errors, and permits documented no-results for only
the other already-authorized arm. No retry, new operation or increased cap.

## Safeguards and consequences

The historical aborted result, encrypted originals, selection, journal and
consumed authorization remain immutable. A separate private derived diagnosis
binds exact response/request/code hashes and records zero kernel/policy calls.
This is not a new acquisition, a retrospective successful run, a provider
inventory census or commercial/bookability certification.

No plan, journal, credential path, public runtime, ranking or protected seal
changes. Existing operational inventories are not refreshed to accept modified
code. Publication and any new live attempt require their own authority.

Validation observed locally: initial new regression FAIL with
ROOT_SCHEMA_UNSUPPORTED, retained in the synthetic evidence JSON; final
71/71 focused tests PASS (35 new classification/integration tests and 36
existing MAX3 tests), zero skips. Includes actual Windows PowerShell 5.1,
CurrentUser DPAPI and local simulated-transport launcher checks. TypeScript
and build PASS. No full V3/V2 rerun, CI, external/provider request or engine
invocation. The private report binds the exact corrected code and authenticated
inputs; frozen historical results are not attributed to this corrected code.
The documented semantic source is the frozen repository qualification record,
not a claim of newly verified online provider documentation.

Supersedes only response classification in the R1 adapter, not historical
receipts, the approved MAX3 plan or authority boundaries.

## Subsequent consolidation authority — 2026-09-17

The user authorized selective commit/push of these seven software/test/doc
files on the existing evaluation work branch. Initial inventory reconciliation
matched all seven validated byte hashes, including the exact executable closure.
Only this authority addendum and the corresponding current-state/log entries
change after that comparison. Reuse the 71 runtime assertions; additionally
compile and typecheck/build the isolated candidate because the original working
tree compilation also included excluded developer files. Do not repeat engine
execution, refresh historical inventories or alter the consumed attempt.
The consolidation receipt must verify actual commit scope, remote destination,
non-force push, remote SHA, pending count and protected-file preservation.
No new operational coverage profile or acquisition is authorized by publication.
