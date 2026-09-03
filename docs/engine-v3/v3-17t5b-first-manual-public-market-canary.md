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
- opens a native private-file selector for optional screenshots or saved pages;
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
cycle covering progressive save, resume, validation, AES-GCM/DPAPI custody,
tamper rejection, provider-neutral snapshot, blind capsule, sanitized Evidence
ZIP and checksum roundtrip. Its unique temporary directories and ZIP are
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
