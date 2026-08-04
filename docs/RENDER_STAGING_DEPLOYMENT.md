# SmartStay Render distributed staging deployment

## Status and authorization boundary

This document defines 39C25A.4E staging only. It does not authorize production deployment or a public beta.

The connected Render Blueprint path is `render.yaml`. That file deliberately
contains only the previously approved single-instance API and static frontend.
It must not declare workers, Key Value or a second API instance.

The paid distributed profile is isolated at
`deploy/render-staging-distributed.candidate.yaml`. It is not a connected
Blueprint and a source commit cannot activate it. Changing the Blueprint path,
enabling Auto Sync or pressing Manual Sync are platform mutations that require
separate explicit cost approval. Auto Sync must remain `No` throughout 4E.

The approved staging topology is deliberately fixed:

```text
Render Static Site
  smartstay-staging-web

Render Web Service
  smartstay-staging-api
  Frankfurt / Starter / two API instances

Render Background Worker
  smartstay-staging-search-worker
  Frankfurt / Starter / two search-worker instances

Render Key Value
  smartstay-staging-valkey
  Frankfurt / Starter / one private persistent Key Value instance
```

Manual instance counts are used. Autoscaling and automatic deploys stay off.

## Capacity basis and safety boundaries

39C25A.4D proved 1,000 active sessions with two API processes, two workers and
a global provider concurrency cap of eight against real Valkey and a local
deterministic provider. Peak Valkey usage was approximately 54 MB; the 4E
contract reserves 128 MiB for serialized session aggregates inside a 256 MB
Starter Key Value plan.

This sizing supports the bounded staging acceptance test. It is not evidence
for 1,000 simultaneous live-provider searches and must not be described as
such.

Key Value uses:

```text
ipAllowList: []
maxmemoryPolicy: noeviction
persistenceMode: journal-snapshot
```

Therefore external access remains disabled, queue/state writes fail closed at
the memory ceiling, and paid persistence is enabled. API and worker reference
the same private `connectionString`; no public datastore endpoint belongs in
SmartStay configuration.

## Shared runtime contract

Both API and worker receive the same reviewed environment group. It fixes:

- `RUNTIME_STATE_MODE=valkey-distributed`;
- `SMARTSTAY_OPERATIONAL_STATE_MODE=valkey-distributed`;
- state and queue namespaces to `staging`;
- 1,000 admitted sessions/jobs;
- a state command pool of four;
- worker concurrency of four per process;
- provider global concurrency at eight across all processes;
- bounded queues and graceful worker drain.

Render generates separate 256-bit state and queue key secrets. Their values
must never be copied into evidence, logs, documentation or chat.

The API and worker fail startup if their datastore URLs, namespaces, queue
mode, secrets, capacity limits or account-rate policy are missing or
inconsistent.

## Values that remain manual

Do not add RouteStack credentials. RouteStack remains disabled and frozen.

The API retains these Dashboard-only values:

```text
CLIENT_ORIGINS
VITE_API_URL
GEOAPIFY_API_KEY
LITEAPI_API_KEY
LITEAPI_WHITELABEL_BASE_URL
PROVIDER_ACCOUNT_RATE_LIMITS_JSON
```

The worker requires the exact same `LITEAPI_API_KEY` account and the exact same
`PROVIDER_ACCOUNT_RATE_LIMITS_JSON` value as the API.

Do not invent a provider quota. Confirm the real LiteAPI account limit first,
then encode it using the runtime schema, for example structurally:

```json
{
  "liteapi": {
    "maxRequests": 1,
    "windowMs": 1000
  }
}
```

The numbers above demonstrate the schema only; they are not an approved quota.

Render prompts for `sync: false` values only when a Blueprint is first
created. On an existing Blueprint, add every new manual value in the Dashboard
before deploying and verify the API/worker values match without placing them
in evidence.

The frontend retains:

```text
VITE_API_URL=https://<actual-backend-host>/api
VITE_GOOGLE_MAPS_EMBED_KEY=<restricted-browser-key>
```

## Analytics during 4E

Analytics stay disabled on both backend and frontend. The current analytics
adapter is process-local; enabling it on two API instances would make its
aggregates incomplete and instance-dependent.

The first-party analytics code and its local privacy gate remain in the
repository. Remote beta measurement stays blocked until a shared analytics
adapter is implemented and separately approved.

## Controlled provisioning sequence

Do not start this sequence without explicit cost approval and a confirmed
provider account quota.

1. Confirm `main`, `origin/main` and the reviewed release SHA are identical.
2. Confirm the complete local release gate passed for that SHA.
3. Confirm the Blueprint path is still `render.yaml` and Auto Sync is `No`.
4. Record the existing staging service IDs, instance counts and last known-good
   release.
5. Obtain explicit cost approval and confirm the real provider account quota.
6. Add every new Dashboard-only value before any deploy.
7. Change the existing Blueprint path to
   `deploy/render-staging-distributed.candidate.yaml`, review the complete diff,
   then use Manual Sync. Do not create a duplicate Blueprint or services.
8. Confirm one private persistent Key Value, two API instances and two worker
   instances exist in Frankfurt on Starter plans.
9. Enable Key Value internal authentication in the Dashboard.
10. Use Manual Sync again so both `fromService.connectionString` values include
   the authenticated internal URL, then redeploy the exact reviewed SHA.
11. Confirm automatic deploys, Auto Sync and autoscaling remain off.
12. Keep all beta invitations and provider traffic stopped.

The first sync can leave new processes not-ready until manual values and the
authenticated connection string are complete. This is an expected fail-closed
state, not permission to bypass validation.

## Zero-provider infrastructure acceptance

The first remote acceptance stage must declare zero live provider calls. It
must verify:

- exact release SHA on frontend, API and workers;
- two healthy API instances and two ready worker heartbeats;
- private authenticated Valkey connectivity;
- shared queue/schema readiness;
- search-session continuity across an API instance restart;
- queued-job survival across a worker restart;
- bounded overload returning canonical `503` responses;
- graceful shutdown and worker drain;
- CORS, HTTPS, security headers and public redaction;
- no external datastore access and no analytics traffic.

Only after that report passes may a separate tiny live-provider journey be
considered. It must remain inside the confirmed account quota. A live provider
load test is forbidden in 4E.

## Rollback

Rolling back to a pre-distributed commit while two API instances remain active
is unsafe. If 4E fails:

1. stop provider traffic and preserve evidence;
2. scale the API back to exactly one instance;
3. suspend the search-worker service;
4. suspend, but do not delete, the Key Value instance;
5. restore the Blueprint path to `render.yaml` with Auto Sync still `No`;
6. redeploy the previous validated single-instance commit only if the retained
   instance is not already serving it;
7. verify release SHA, liveness, readiness and CORS;
8. retain the suspended Key Value instance without exposing or deleting it until the
   incident is reviewed.

Do not delete persistent state as an automatic rollback step.

## Exit criteria for 39C25A.4E

39C25A.4E closes only after source readiness, paid topology review, remote
zero-provider acceptance, restart/rollback proof and the separately authorized
bounded live journey all pass; production remains blocked until 39C25A.4F.
