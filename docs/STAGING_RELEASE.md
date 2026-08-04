# SmartStay distributed staging release contract

## Deployment shape

The canonical staging release contains:

1. one static Vite frontend;
2. two Node/Express API instances;
3. two dedicated BullMQ search-worker instances;
4. one private persistent Valkey-compatible datastore shared by state and
   queue.

This topology is a hosting configuration, not a domain dependency. SmartStay
continues to depend on the operational-state and queue ports rather than on
Render-specific APIs.

## Runtime contract

Every release API and worker must use:

```text
NODE_ENV=production
DEPLOYMENT_ENV=staging
RELEASE_SHA=<deployed Git commit>
RUNTIME_STATE_MODE=valkey-distributed
SMARTSTAY_OPERATIONAL_STATE_MODE=valkey-distributed
SMARTSTAY_STATE_REDIS_URL=<private authenticated redis/rediss URL>
SMARTSTAY_STATE_ENVIRONMENT=staging
SMARTSTAY_STATE_KEY_SECRET=<32+ byte secret>
SMARTSTAY_STATE_COMMAND_POOL_SIZE=4
SMARTSTAY_STATE_MAX_SESSIONS=1000
SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES=134217728
SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED=true
SMARTSTAY_QUEUE_REDIS_URL=<same private authenticated URL>
SMARTSTAY_QUEUE_ENVIRONMENT=staging
SMARTSTAY_QUEUE_KEY_SECRET=<32+ byte secret>
SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED=1000
SMARTSTAY_SEARCH_WORKER_CONCURRENCY=4
PROVIDER_MAX_CONCURRENT_OPERATIONS=8
PROVIDER_ACCOUNT_RATE_LIMITS_JSON=<confirmed account policy>
```

The API additionally requires exact HTTPS/CORS, Geoapify, LiteAPI and approved
white-label values. The worker needs the same LiteAPI account. RouteStack
remains disabled.

The release validator rejects:

- process-local state in production;
- a distributed API/worker with different state and queue URLs;
- namespaces that do not match `DEPLOYMENT_ENV`;
- a disabled asynchronous queue;
- weak or absent key secrets;
- fewer than 1,000 staging session/job slots;
- provider concurrency above eight;
- missing, malformed or LiteAPI-free account-rate policies;
- process-local analytics in a distributed release.

## Analytics boundary

Set both flags to false for 39C25A.4E:

```text
ANALYTICS_ENABLED=false
VITE_ANALYTICS_ENABLED=false
```

The current in-memory analytics adapter remains valid for local contract tests,
but not for multi-instance staging measurement.

## Build and local verification

```text
npm ci
npm ci --prefix server
npm run release:ci
```

`smoke:staging:local` remains an isolated, process-local CI compatibility
smoke. It does not claim that the distributed remote topology exists.

Create and verify the immutable candidate only after the full gate passes:

```text
npm run release:candidate -- --expected-sha <git-sha> --output .smartstay-release
npm run release:verify -- --manifest .smartstay-release/release-manifest.json --expected-sha <git-sha> --root .
```

The candidate records the distributed 2 API + 2 worker constraint.

## Remote acceptance sequence

Remote 4E acceptance is split into two reports:

1. infrastructure correctness with zero provider calls;
2. one separately approved bounded live journey inside the confirmed account
   quota.

The infrastructure report must prove release identity, instance counts,
worker readiness, shared session/queue behavior, restart survival, overload
fail-closed behavior, HTTPS/CORS and rollback readiness.

The live report must never be reused as a capacity test.

## Rollback

Rollback means returning both code and topology to a compatible state. Before
deploying a pre-4E single-instance candidate, scale API to one, stop workers,
then deploy and smoke the retained candidate. Never run process-local state on
two API instances.

Render provisioning, spend and live provider traffic always require explicit
human approval outside the source gate.
