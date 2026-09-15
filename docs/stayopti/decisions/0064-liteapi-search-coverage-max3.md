# D-0064 — Separate MAX3 diagnostic coverage acquisition

Date: 2026-09-15. Source: `c9aa2d901c43ecb3de56169ae1fb00da7a452191`.
Authority: explicit implementation and selective work-branch publication;
production acquisition requires its own later literal acceptance.

## Decision

Introduce `stayopti.liteapi-search-coverage@1`, a separate case/registry/root and
authorization, not a mutation or resumed use of D0062 MAX17. Reuse the existing
CurrentUser DPAPI protector, pure documentary wire decoder and checkpoint/hash
utilities. Version-isolate the existing durable journal and raw HTTPS mechanism
so historical executable files, inventory, markers and authorizations stay intact.

One catalog first page (100 maximum), one city Rates window (20), one Rates
request containing at most20 exact catalog-verified opaque IDs. Hash-sample the
verified first-page pool with the previously fixed seed, not names, rates or
provider order. Encrypt and authenticate the pool, all exclusions/duplicates and
derived request in a SEAL event before either Rates request. No replacement.

Reserve each attempt durably before transport. Caps are not transferable, and
case/authorization markers never refund after errors, crashes or restart. Failed
HTTP/semantic/transport responses and redirects terminate; Rates204 is explicitly
empty but allows the other planned arm. Empty valid catalog: city only. OneID:
query one, with a limitation. Invalid catalog container: stop.

Keep original encrypted responses and indexed observations, separately counting
raw rows, unique structures, offers, occupancy links and existing-wire exclusions.
Unexpected IDs/incomplete records remain visible. No preparation of decisions,
prebook, payment, booking, kernel, policy or public runtime imports.

## Limits

This is a bounded two-window coverage diagnostic, not a census or a randomized
market-quality experiment. The catalog is not availability; sequential results
need not be simultaneous. Rates `limit` selects a search window before available
results, and a timeout may limit supplier coverage. No declared exhaustion or
bookability is manufactured. Costs/account terms retain their documented limits.

The report `../../engine-v3/d0064-search-coverage-max3.md` records actual tests,
initial failures and publication status. Existing D0063 gates are reused for its
unchanged files; the new final isolated candidate runs the relevant canonical
gates. Local Windows results are not GitHub CI or live-provider qualification.
