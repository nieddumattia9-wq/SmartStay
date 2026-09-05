# V3-17T5B — First manual public-market Decision Golden canary

Status: guided offline capture tool repaired and validated; real collection
must be performed by the user on the public consumer surface.

## Usability repair

The T5A gate exposed a technically valid but unsuitable JSON editor. T5B does
not begin real collection through that surface. The active launcher is now a
guided Italian questionnaire that:

- freezes the Florence scenario before any observation;
- collects exactly five eligible alternatives, one at a time;
- records controlled exclusions without cherry-picking;
- saves after every accepted or excluded result;
- resumes the same session automatically;
- permits correction before finalization;
- opens a native private-file selector; successor custody requires one private
  screenshot or saved-page envelope per accepted alternative;
- never asks for JSON editing, API keys, login, payment, or technical commands.

The execution command is intentionally supplied by Codex with the exact
execution HEAD. The user interacts only with the visible guided window.

## Frozen scenario

- destination: Florence, Italy;
- check-in/check-out: 2026-10-15 / 2026-10-18;
- three nights, two adults, zero children, one room;
- currency/locale/country: EUR / it-IT / Italy;
- total-stay budget: EUR 600;
- profile: `BALANCED`;
- hard requirements: private room or entire place, private bathroom and a
  reasonable center location.

The consumer protocol is one logged-out Booking.com public search, with no
Genius, membership, coupon or personal price. Booking.com is not integrated,
scraped or automated. The user performs the search manually in an incognito
window.

## Progressive private custody

Real property names, source URLs, screenshots and saved pages are encrypted
immediately into the existing private-evidence store under
`%LOCALAPPDATA%\StayOpti\private-evidence\manual-market-golden-capture`.
AES-256-GCM protects content, the data key is protected by Windows CurrentUser
DPAPI, SHA-256 and the authentication tag provide tamper detection, and the
progress file contains only sanitized fields and encrypted-envelope handles.
No plaintext private evidence is a stable artifact.

The shared ZIP contains only the sanitized manifest, provider-neutral
snapshot, completeness and missingness reports, sanitized provenance,
fingerprints, cryptographic receipts, outcome and internal checksums. It
excludes names, URLs, screenshots, original position, promotional status,
encrypted raw evidence and the private deblind ledger.

## Price and outcome semantics

Every observed price remains `PUBLIC_PRECHECKOUT_VERIFIED_PRICE` with:

- `purchaseCompleted=false`;
- `bookingConfirmed=false`;
- `exactBookable=false`;
- `verifiedCheckoutTotal=false`;
- `personalizedDiscount=false`.

The session can finish only as `ELIGIBLE_FOR_BLIND_JUDGMENT` or
`DIAGNOSTIC_ONLY`. No judgment, V3 execution, deblind, Decision Golden
admission or Live Bookable Golden admission occurs in T5B.

## Synthetic dry run

Before opening the real tool, the runner performs a five-alternative synthetic
cycle covering progressive save, resume, validation, AES-GCM custody, tamper
rejection, provider-neutral snapshot, sanitized Evidence ZIP, session reopen
and checksum roundtrip. Synthetic key protection is explicitly test-only;
CurrentUser DPAPI remains mandatory for real sessions. Blind-capsule creation
is deliberately absent from collection finalization. Its unique temporary directories and ZIP are
deleted at completion. The run performs zero HTTP and loads zero credentials.

## Non-goals

T5B implements no API, scraping, browser automation, login, booking, payment,
public runtime, ranking, weight, Golden admission, push or fetch capability.
The dormant SerpApi T5 gate remains `DORMANT_NOT_AUTHORIZED`.

## Interrupted-entry recovery and confirm-before-save repair

The first real entry attempt was interrupted after two URLs belonging to
different organic results were entered into the name and URL fields. No
alternative or encrypted evidence had yet been persisted. The empty session
directory was removed without touching other private evidence.

The repaired interface keeps every incomplete alternative only in process
memory. Every field displays the organic position and current property name,
and every prompt explains in Italian where to find the value. The category
prompt includes concrete examples and every unavailable value may be recorded
as `UNKNOWN`.

Before persistence, a complete summary is shown. The user must explicitly
choose `SALVA`, may use `CORREGGI 1..17` to revisit one field, or may choose
`ANNULLA` to discard the entire unsaved draft. Detectable URL-in-name and
same-property name/URL inconsistencies are rejected locally without HTTP. The
guard is a plausibility check, not a network-backed identity proof, so the
human confirmation remains authoritative.

## Mid-entry correction and field semantics

A second real preflight was interrupted before confirmation after values were
entered into the wrong payment/refundability fields. The incomplete alternative
was not persisted and produced no snapshot, Evidence or eligibility result.

The interface now exposes navigation after every field, not only at the final
summary. `INDIETRO` reopens the preceding field, `CORREGGI 1..17` edits any
field already reached, `RIEPILOGO` displays the current in-memory draft, and
`ANNULLA` discards only that draft while preserving the session. Ctrl+C before
`SALVA` leaves no partial alternative at rest.

Payment-now and payment-at-property are numeric amount fields. A statement that
nothing is payable immediately does not prove that the amount payable at the
property is zero; absent an explicit amount, the correct value is `UNKNOWN`.
Cancellation and refundability are textual condition fields, and a bare numeric
amount is rejected rather than coerced.

## Clean restart after invalid input

The incomplete `_001` attempt is retired as `ABORTED_INVALID_INPUT`. Recovery
inspection found no saved alternative, progress state, encrypted evidence or
shared Evidence ZIP; only its empty session directory existed and was removed
without touching other private evidence. No value from that attempt is reused,
recovered or prefilled.

The clean restart uses `V3_17T5B_FLORENCE_20261015_002`. The runner keeps the
same frozen Florence scenario and explicitly prevents the retired session ID
from becoming the active session. Every new alternative begins as a blank
in-memory draft and still requires a full summary plus explicit `SALVA` before
any encryption or persistence.

## Completed diagnostic session and correction-only export

The first completed `_002` session remains `DIAGNOSTIC_ONLY`. Its sanitized
archive passed all internal checksums, while offline audit found that the
initial validator did not fully model three recoverable input defects:
case-variant explicit unknown evidence, a mismatch between a known displayed
total and two known payment components, and an implausible calendar day in a
textual condition.

The validator now:

- normalizes `UNKNOWN` without case sensitivity;
- reports `MANUAL_CAPTURE_PAYMENT_SPLIT_MISMATCH` when both payment components
  are known but do not sum to the displayed total;
- reports `MANUAL_CAPTURE_TEXT_DATE_IMPLAUSIBLE` for an impossible day attached
  to a recognized month in cancellation/refundability text;
- accepts either a numeric distance genuinely shown by the consumer surface or
  a separate `VERIFIED_TEXTUAL_POSITION` wrapper. Textual position is never
  converted into fabricated metres.

The PowerShell runner exposes a separate `repair-export` mode. It loads the
existing five-alternative session, allows `CORREGGI <alternativa> <campo>` for
public fields 3–16, displays a scoped summary and writes the change only after
exact `APPLICA`. `RIESPORTA` creates a new sanitized archive from the corrected
state. Encrypted private identity/proof handles remain unchanged and are never
shown. The repair path expressly suppresses blind-capsule creation, V3
execution, judgment, deblind and Golden admission.

## Repair-session lookup reconciliation

Read-only recovery inspection found the completed five-alternative state at the
canonical CurrentUser root and confirmed that its embedded session identity is
`V3_17T5B_FLORENCE_20261015_002`. The collection runner and repaired runner use
the same state version, `session-state.json` filename and
`%LOCALAPPDATA%\StayOpti\private-evidence\manual-market-golden-capture` root.
No reconstruction from the sanitized ZIP is required.

The initial repair launcher nevertheless did not bind a session identity in
its command line: the Node runner selected a hardcoded constant. In addition,
PowerShell's case-insensitive `ValidateSet` was followed by case-sensitive mode
comparisons, so a differently cased valid mode could incorrectly select a
synthetic temporary root. The original lookup failure cannot be reproduced at
the canonical path now, but this ambiguous boundary is removed rather than
treated as evidence loss.

`repair-export` now requires an explicit, pattern-validated `SessionId`; the
launcher passes it as `--session-id`, mode routing is case-insensitive, and the
loaded state's own identity must exactly match the requested identity. Missing,
invalid or wrong identities fail closed without fallback. Synthetic regression
tests place two sibling states under a temporary root and prove that only the
explicitly requested state is selected. The repair remains user-driven and no
real state is changed by this reconciliation.

## Runtime-identical repair preflight

The explicit-session D-0029 launcher still failed on the user's real invocation,
so its standalone filesystem probe is no longer treated as proof of the
operational path. That probe and `repair-export` did not execute the same
resolver, and the runtime exposed only a generic `existsSync` failure. The exact
historical alternate root is not recoverable from that output.

The launcher now provides a read-only `repair-preflight` mode that traverses the
same `inspectRepairSession` function used by `repair-export`. It records only
sanitized technical metadata: received CLI arguments, parsed session identity,
effective `LOCALAPPDATA`, private root, state path, file-existence/type/read
checks, parse/schema status, embedded identity match, alternative count and a
no-mutation check. Missing, unreadable, malformed, unsupported and mismatched
states have separate fail-closed classifications.

An end-to-end regression invokes the actual PowerShell launcher in a child
process against a synthetic five-alternative state. A second read-only run
through the same launcher against the real `_002` session confirms the exact
identity, canonical CurrentUser root, regular readable state file, supported
schema, five alternatives and no mutation. This diagnosis does not apply a
repair or produce a new export.

## Legacy custody incident closure

The user's direct Windows PowerShell inspection supersedes the prior
runtime-probe conclusion: the real CurrentUser root contains the legacy
`encrypted` directory but no `_002` session directory and no
`session-state.json`. Prior positive observations came from a divergent Codex
filesystem namespace or synthetic temporary fixtures and cannot prove the
user-visible filesystem.

The original ZIP identified by
`c0e26c01aab4f4cc5486345955a91cb74d9c0722b5591556ed996718ceccc598`
and the fifteen `.stayopti-rawq` envelopes remain immutable. The ZIP reliably
recovers five sanitized provider-neutral alternatives, while its relationship
to the encrypted custody is aggregate only. No per-file association is
asserted or retrofitted. Session `_002` remains `DIAGNOSTIC_ONLY`; blind
judgment, V3 replay, deblind, repair and Golden admission are prohibited.

## Successor custody contract

New sessions use state contract version 2 and must provide a fresh explicit
session ID. Their directory contains:

- `session-state.json`, atomically replaced after every accepted state change;
- `session-state.recovery.json` and immutable `state-history/` versions;
- a session-local `encrypted/` directory;
- `private-manifest.json` plus immutable manifest history, binding each local
  alternative to exactly one name, URL and screenshot envelope.

Before `SALVA`, the runner shows the full draft, requires explicit
confirmation, checks name/URL plausibility, requires all three private
envelopes and immediately checks that a fully known payment decomposition
matches the displayed total. `UNKNOWN` is case-insensitive. Verified textual
position and numeric distance remain distinct, and implausible textual dates
are rejected. The same public fields can be corrected after finalization, but
legacy `_002` cannot enter that path.

The sanitized Evidence package includes only non-identifying envelope and
file SHA-256 fingerprints. A separate PowerShell 5.1 post-finalization verifier
must be run directly against the user's CurrentUser filesystem; it checks
state, recovery/history, private manifest and all fifteen encrypted files
without decryption. Synthetic or `%TEMP%` runs are labeled non-promotable and
cannot establish real collection proof. Collection finalization does not create
a blind capsule or admit Golden evidence.
