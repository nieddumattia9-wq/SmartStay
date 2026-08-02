# Search queue operations

The durable search queue is opt-in. `SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED`
remains `false` unless a controlled rollout explicitly enables the distributed
state and queue configuration together. Integrating this release does not start
a worker, enable the feature, call a provider, or deploy the service.

## Health contract

- `/health/live` reports only that the web process can serve HTTP. It does not
  contact Valkey, BullMQ, or an accommodation provider.
- `/health/ready` and `/health` are dependency-aware. When distributed state is
  enabled they require a compatible state schema, a compatible queue schema,
  and at least one current worker heartbeat in the `ready` state.
- A state or queue outage makes readiness return `503` while liveness remains
  `200`. Recovery is automatic on the same clients after connectivity and a
  current worker heartbeat return.
- Provider availability is not a readiness dependency. Provider limits and
  circuit breakers continue to protect provider calls independently.

Health responses expose only service status, version, environment, and request
identity. They do not expose queue internals, provider identities, payloads, or
credentials.

## Worker heartbeat and metrics

Each worker owns an opaque heartbeat record with a token that is never logged.
The heartbeat TTL must be at least twice the heartbeat interval. A heartbeat
failure pauses acquisition; a successful renewal resumes it. Stale records
expire automatically, and a graceful stop removes only the record owned by the
stopping process.

The structured `search.worker.heartbeat` event contains aggregate counters only:
queue depth and oldest age, active sessions, global provider capacity, worker
completion/failure/stall totals, and queue-wait percentiles. It never contains
raw jobs, searches, provider identifiers, request payloads, or secrets. No new
public metrics endpoint is added by this gate.

## Graceful drain

On web shutdown, readiness becomes false and the drain guard rejects new
work-admitting API requests with `503 SERVICE_DRAINING` before the HTTP listener
closes. Liveness and safe read requests remain available while existing
connections finish.

On worker shutdown, the runtime publishes `draining`, pauses BullMQ acquisition,
and waits for active processors up to
`SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS`. A completed processor releases the
exact fenced admission it owns. If the deadline expires, the worker closes
forcefully; BullMQ redelivery plus SmartStay fencing prevents the older attempt
from publishing a late result.

Recommended defaults:

| Setting | Default |
| --- | ---: |
| `SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS` | 5,000 ms |
| `SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS` | 20,000 ms |
| `SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS` | 30,000 ms |

During rollout, start workers and wait for `/health/ready` to return `200`
before admitting web traffic. During rollback, stop web admission first, drain
workers, and only then remove the queue-enabled release.
