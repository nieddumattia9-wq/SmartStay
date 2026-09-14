# D-0062 — Controlled LiteAPI acquisition launcher

Date: 2026-09-14. Authority: Mattia's explicit D-0062 instruction.
Source: `4e6467cdb9a5c8d6cf76ccefbccca938a3237da8`.
Work branch only: `codex/evaluation-d0036-d0041`.

## Decision

Add a separate controlled production acquisition boundary, qualified with
official-documentation shapes and entirely synthetic offline tests. Reuse the
D-0061/R1 semantic normalizer, existing requirements and kernel without changing
policy parameters, public provider mapping or historical REVIEWED inputs.

Production origin must be established by the controlled transport or an
authenticated CurrentUser journal, not by relabelling a fixture. Pure preparation
is separate from engine execution. An acquisition launcher never executes a
private decision. Retrieval reads the created prebook, not independent availability.

Require hash-bound explicit checkpoint, executable inventory, configuration and
one-shot authorization before credentials/transport. Enforce the D-0060 fixed
endpoint/subcaps and one-second pacing at the actual HTTP boundary, with no
redirect, retry, concurrent request or automatic restart. Persist reservations
before send; preserve uncertainty of remote effects after prebook timeout.

Keep AES-GCM originals under a new CurrentUser private root with DPAPI-protected
key, authenticated append-only events and durable case/authorization markers.
Retention and account conditions remain unconfirmed until explicit future
approval. Never use historical custody constructors as read-only preflight.

## Rejected alternatives

- Call the public provider orchestration, inherit its queue/retry/cache semantics
  or public `bookable` boolean as independent evidence.
- Treat every identifier as the fixture's short ASCII grammar, every JSON shape
  as the invented profile, or the GET as a second commercial verification.
- Store a credential in a command argument/environment, overwrite previous
  attempts, reset counters after timeout, or certify partial response bytes.
- Replace net/public price qualifications with an opaque free-text account flag.
- Use passing synthetic tests as production-account or real-market proof.

## Validation, risk and delivery

The report `../../engine-v3/d0062-controlled-acquisition.md` records the concrete
commands, documentary profile and final observed gates. Initial failed launcher
tests are retained, not recategorized as an environment-only success. Software
publication is selective and conditional on final isolated tests; no amend or
main integration. Every completed phase reports push and local-pending status.
Residual provider shapes and account-specific semantics remain explicit limits,
not facts manufactured to force recommendation. No real acquisition, prebook,
private measurement, HUMAN receipt, Golden admission or public change occurred.

Isolated CurrentUser software qualification:104/104 new,668/668 targeted,
V3 2575/2575,V2 196/196, mapper18/18 and PS5.1 parse14/14 PASS. All offline
canonical lifecycle/security/release/analytics/capacity/beta/typecheck/build/
smoke constituents pass;17 real-Valkey skips remain explicit. No online registry
audit, live-account qualification or CI result is claimed. The final reporting
tree is independently revalidated; no software/test byte changes are absorbed.
