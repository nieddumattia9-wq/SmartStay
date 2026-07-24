# SmartStay Analytics & Privacy — Contract v1

## Status

39C23C completes the first beta measurement gate on top of the canonical 39C23A contract and the 39C23B instrumentation.

The implementation is:

- first-party only;
- disabled by default;
- cookie-free;
- limited to browser-tab identifiers stored in `sessionStorage`;
- free of persistent user IDs and cross-session tracking;
- provider-neutral;
- failure-isolated from search, ranking and booking;
- respectful of Do Not Track and Global Privacy Control;
- measurable through aggregate-only administrative reports;
- explicit about its volatile in-memory storage boundary.

Enabling collection requires both:

```text
VITE_ANALYTICS_ENABLED=true
ANALYTICS_ENABLED=true
```

A staging or production release with analytics enabled additionally requires:

```text
ANALYTICS_ADMIN_TOKEN=<at least 32 random characters>
ANALYTICS_STORAGE_MODE=in-memory-single-instance
ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED=true
```

The frontend and backend flags must match. If analytics remains disabled, normal product flows continue and no analytics record is persisted.

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

The backend checks request headers again before validation or storage.

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

The request body and authorization header are not added to structured logs.

## Storage truth

The current beta sink is:

```text
in-memory-single-instance
```

It is bounded, deduplicates retries by opaque `eventId`, prunes raw records after at most 30 days, and keeps aggregate daily counters for at most 180 days.

It is **not durable**. Raw events, aggregate buckets and report state are lost when the backend restarts. Enabling this mode in a release environment therefore requires an explicit volatile-storage acknowledgement. It must not be described as persistent analytics storage.

The sink remains injected behind a small interface so a future first-party persistent adapter can replace it without coupling the frontend, provider layer or SmartStay Engine to an analytics vendor.

## Aggregate-only administration

No route exposes raw analytics records.

The protected administrative surfaces are:

```text
GET /api/internal/analytics/report?windowDays=30
DELETE /api/internal/analytics/data
```

They require a bearer token from `ANALYTICS_ADMIN_TOKEN`. If analytics or the token is unavailable, the administrative surface is hidden. Token comparison uses constant-time equality.

The report contains counts, rates, distributions, sample readiness and storage truth only. It does not include event, session or journey identifiers.

Deletion accepts an explicit scope:

```text
expired
raw
aggregates
all
```

Automatic pruning runs on write, read and status operations. Manual deletion exists for operational retention enforcement and incident response.

## Measurement limits

Rates are journey-level and use the first occurrence of an action within a journey. The current aggregate state is process-local and therefore cannot merge multiple backend instances. SmartStay staging and the first controlled beta must remain single-instance.

The detailed metric definitions and sample-readiness rules are documented in:

```text
docs/ANALYTICS_BETA_MEASUREMENT.md
```

## Legal boundary

This document is the technical privacy contract, not final legal advice. Before meaningful public traffic, the public privacy policy still needs professional legal review covering controller identity, lawful basis, processors, international transfers, rights, objections, complaints and incident handling.

## Public controlled-beta notice

The public route `/privacy` presents a concise notice for invited testers. It
does not replace this technical contract or professional legal review.

For the controlled beta:

- the staging URL is shared only through private invitations;
- search and booking data remain outside analytics events;
- first-party analytics use no cookies and no persistent cross-session ID;
- DNT and Global Privacy Control disable analytics collection;
- raw analytics are retained for at most 30 days and aggregates for at most
  180 days;
- the current in-memory store can lose data earlier after a restart or deploy;
- privacy requests are handled through the same private channel used for the
  tester invitation.

Before wider public traffic, SmartStay still needs a final public privacy
policy with verified controller details, contact information, legal basis,
processor list and professional legal review.
