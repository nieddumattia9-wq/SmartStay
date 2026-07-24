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
- single-instance rate limits and observability.

A real hard access gate, if later required, must be enforced before the static
frontend or at the backend/edge. It must not be simulated with a frontend-only
password.

## Analytics enablement

The controlled beta enables the existing first-party analytics contract:

```text
ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENABLED=true
ANALYTICS_STORAGE_MODE=in-memory-single-instance
ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED=true
```

No cookies, advertising SDK, cross-session profile or exact travel data are
added.

`ANALYTICS_ADMIN_TOKEN` is required on the backend and must contain at least
32 characters.

Because this is an update to an existing Render Blueprint, add the token
manually to `smartstay-staging-api` in the Render Dashboard before syncing and
deploying the analytics-enabled configuration. Do not commit or paste the
token into chat.

Generate a token locally, for example:

```text
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## Storage truth

Analytics remain:

```text
in-memory-single-instance
```

A backend restart or deploy erases raw and aggregate analytics data. During the
controlled beta:

- keep exactly one backend instance;
- avoid unnecessary deploys;
- capture the aggregate report regularly;
- never describe the store as durable;
- stop measurement if the operational limitation becomes misleading.

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

## Measurement cadence

At least once per testing day:

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
