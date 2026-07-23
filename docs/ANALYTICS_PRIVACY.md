# SmartStay Analytics & Privacy — Contract v1

## Status

39C23B instruments the canonical 39C23A event contract.

The implementation is:

- first-party only;
- disabled by default;
- cookie-free;
- limited to browser-tab identifiers stored in `sessionStorage`;
- free of persistent user IDs and cross-session tracking;
- provider-neutral;
- failure-isolated from search, ranking and booking;
- respectful of Do Not Track and Global Privacy Control.

Enabling analytics requires both:

```text
VITE_ANALYTICS_ENABLED=true
ANALYTICS_ENABLED=true
```

If either side remains disabled, normal product flows continue and no analytics record is persisted.

## Transport

Frontend batches are sent only to:

```text
POST /api/analytics/events
```

The client uses:

- `credentials: "omit"`;
- `cache: "no-store"`;
- `referrerPolicy: "no-referrer"`;
- an in-memory queue scoped to the current tab;
- a maximum of 20 events per request;
- a smaller keepalive batch when the page is leaving;
- a maximum canonical event size of 4 KB.

Transient network, rate-limit and server failures are retried in memory. Permanent 4xx contract failures are dropped instead of creating an infinite retry loop. Delivery failures are swallowed by the analytics boundary and cannot fail search, results, recheck or handoff.

## Privacy signals

Collection is skipped when the browser exposes either:

```text
DNT: 1
Sec-GPC: 1
navigator.globalPrivacyControl === true
```

The backend checks the request headers again before validation or storage.

## Identifiers

The only analytics identifiers are random opaque IDs for:

- the current browser-tab session;
- the current search journey;
- the individual event.

They are not derived from account, device, IP, search, booking, hotel or provider data. They are not stored in cookies or `localStorage`.

## Prohibited data

The contract and server validator reject raw values or keys for:

- destination, city, country or coordinates;
- exact check-in/check-out dates;
- exact budget;
- exact adult/child ages or child-age arrays;
- search/request/idempotency identifiers;
- hotel, offer, verification or handoff identifiers;
- provider identifiers or provider context;
- names, email, phone, address or authentication data;
- IP, user agent, full URL, referrer, query, cookie, token, secret or API key.

Only bucketed, enumerated or boolean decision-support properties are accepted.

## Backend validation

`server/analytics/analyticsEventValidator.js` loads the canonical JSON contract and enforces:

- exact envelope keys;
- exact event names and event version;
- required and optional properties per event;
- property types, enums, ranges and patterns;
- recursive forbidden-field rejection;
- maximum event and batch sizes;
- bounded event timestamps.

The request body is not added to structured logs.

## Storage truth

The MVP sink is:

```text
in-memory-single-instance
```

It is bounded, deduplicates retries by opaque `eventId`, and prunes raw records after at most 30 days. It is not durable and is lost when the backend restarts. This is intentional for the first instrumentation gate and must not be described as persistent analytics storage.

The sink is injected behind a small `write(events)` boundary so a future first-party database can replace it without coupling the frontend or domain engine to a vendor.

Aggregate retention remains capped at 180 days when aggregation is implemented in 39C23C.

## Canonical events

The 16 events remain defined in:

```text
contracts/analytics-event-contract.v1.json
```

They cover page views, search lifecycle, recommendation engagement, recovery, booking recheck/handoff and journey abandonment. Abandonment is captured both when the browser page is left and when an active SPA journey returns to Home.

## Next gate

39C23C must add and validate:

- aggregate metrics and minimal reporting;
- deletion/retention execution;
- browser tests for enabled, disabled, DNT and GPC modes;
- staged sampling with zero forbidden fields;
- analytics release evidence;
- beta measurement thresholds.
