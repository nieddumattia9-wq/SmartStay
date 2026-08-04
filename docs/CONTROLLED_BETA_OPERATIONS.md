# SmartStay Controlled Beta Operations

## Scope

The first beta is invitation-only and limited to approximately 10-20 real
testers.

Do not publish the staging URL on social networks, public forums, advertising
campaigns or searchable pages.

The frontend deliberately has no client-side access code. A secret embedded in
a Vite bundle would be recoverable and would create false security. The
controlled beta instead uses:

- private invitations;
- explicit `noindex`;
- `X-Robots-Tag`;
- a `robots.txt` disallow rule;
- a visible request not to share the link;
- shared distributed rate limits and operational readiness.

A real hard access gate, if later required, must be enforced before the static
frontend or at the backend/edge. It must not be simulated with a frontend-only
password.

## Analytics hold during distributed acceptance

39C25A.4E keeps the existing first-party analytics contract disabled:

```text
ANALYTICS_ENABLED=false
VITE_ANALYTICS_ENABLED=false
```

The local analytics contract, privacy controls and synthetic measurement gate
remain active in CI. They add no cookies, advertising SDK, cross-session
profile or exact travel data.

## Storage truth

The implemented analytics adapter remains:

```text
in-memory-single-instance
```

A backend restart or deploy erases raw and aggregate analytics data. On a
multi-instance API, each process would also expose only its own partial view.
Therefore:

- do not enable the analytics flags during 4E;
- do not request or configure `ANALYTICS_ADMIN_TOKEN` for distributed staging;
- do not describe process-local reports as staging-wide aggregates;
- keep tester invitations paused until a shared analytics adapter is reviewed
  or the measurement plan is explicitly redesigned.

Raw retention is at most 30 days. Aggregate retention is at most 180 days, but
a restart can delete both earlier.

## Tester workflow

Each invitation should state:

1. SmartStay is a private beta and the link must not be shared.
2. Testers should perform a real search but must not complete a purchase unless
   they independently choose to do so outside the test protocol.
3. Feedback must avoid names, email addresses, booking references, payment data
   and other sensitive information.
4. Feedback is copied from `/feedback` and returned through the same private
   invitation channel.
5. The beta privacy notice is available at `/privacy`.

## Measurement cadence after a shared adapter exists

Only after a separate analytics release gate passes, at least once per testing
day:

1. read the aggregate-only analytics report;
2. save the report outside the volatile service;
3. record started searches, completion, visible results, details, selection,
   recheck, handoff, recovery and abandonment;
4. record backend restarts or deploys that invalidate continuity;
5. inspect errors without copying request bodies or secret values.

No route exposes raw analytics events.

## Stop conditions

Pause invitations immediately if any of these occurs:

- prices or booking conditions appear incorrect;
- an invalid offer is recommended;
- booking handoff opens the wrong partner or offer;
- repeated provider errors or timeouts occur;
- logs expose secrets or travel data;
- analytics contain a forbidden field;
- the backend restarts repeatedly;
- the privacy or feedback pages become unavailable.

## Exit criteria

39C24 can close only after:

- noindex, privacy and feedback are remotely verified;
- analytics enabled and privacy opt-out modes are remotely verified;
- a small invited tester cohort completes real journeys;
- feedback and aggregate reports are reviewed;
- critical defects are resolved;
- no payment or booking is represented as part of the test;
- a decision is made to continue, pause or redesign the beta.

39C25A.4E infrastructure acceptance alone does not reopen invitations.
