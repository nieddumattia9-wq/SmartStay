# D-0066 — Bounded, authenticated hotel-detail enrichment

Date: 2026-09-18. Base: `2005caed11a469ada3b00658a786a1d412278f51`.
Evaluation-only. Selective publication on the evaluation work branch is
authorized after validation; production acquisition requires its own new literal.

## Decision

Bind a new details-only plan to the authenticated completed coverage journal,
exact original Rates requests/responses, scenario and every offer variant.
Derive exact hotel/mapped-room identities rather than copying a report or
selecting one favorable rate per property. Seal the unique hotel order before
any response. The new case, root, registry, authorization and retention are
independent of consumed MAX3/MAX17 cases; no historical inventory is regenerated.

Expose only planned GET `/v3.0/data/hotel`, at most five, with one attempt per
hotel and no replacement. Reuse the bounded HTTP primitive, existing encrypted
journal algorithm through fixed profile wrappers, and protected PowerShell
prompt. Preserve legacy versions, roots, caps and receipt semantics. The new
profile authenticates and validates exact request order during both reservation
and replay. Reserve before send; interruption never refunds the attempt.

Use the operation's documented default timeout explicitly: four seconds on
the provider, twenty seconds on the client. Concurrency is one, pacing at least
one second, response ceiling 32 MiB; retries, redirects and pagination are zero.
An error stops the attempt. A valid property response without the requested
room is missing evidence, not a reason to retry. A response with a provider
error cannot contribute details merely because its hotel identity matches.

After authenticated reading, compare exact mapped rooms using the existing
bounded bed/capacity qualifiers. Preserve all variants, OR assignments,
contradictions, qualifiers and unknowns. The D-0065 bed-clause function is
relocated unchanged into a pure helper; it is not redesigned. Collection
completion, room found and assessable compatibility are different outcomes.

New details never refresh historical prices, availability, expiry or custody
retention. They are separately timed observations, not a retroactive room
assignment or commercial guarantee. No engine, ranking, weights, roles, public
behavior or Golden gate changes.

## Evidence and operational boundary

The report `../../engine-v3/d0066-hotel-detail-enrichment.md` records the actual
isolated tests and publication scope. Official operation documentation and
room-mapping semantics are linked there. Synthetic DPAPI/prompt tests do not
certify a future provider response. Private identities and commercial data
remain outside Git.

Final operational preparation must use Inventory and Preflight on the actual
published checkpoint. It checks the existing source in read-only mode and
does not create the new custody. The new literal remains unaccepted; only the
Acquire prompt may request the key, after explicit literal acceptance. Retain
new encrypted originals for fourteen days from acquisition, under the named
responsible user's management, without automatic deletion. Actual local/remote
SHA and remaining local commits must be reported independently of test PASS.
