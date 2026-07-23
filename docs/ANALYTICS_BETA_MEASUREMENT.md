# SmartStay Beta Measurement Gate

## Purpose

39C23C turns the 16 canonical analytics events into a minimal first-party measurement system for a controlled beta.

It does not add a marketing tracker, user profile, advertising SDK or public dashboard. It adds:

- daily aggregate counters;
- journey-level first-action rates;
- search and first-choice duration buckets;
- an aggregate-only protected report;
- retention and deletion execution;
- browser-runtime simulation for disabled, enabled, DNT, GPC and failure modes;
- a synthetic local staging gate included in `release:ci`.

## Permanent command

```text
npm run gate:analytics-beta
```

The command starts a local real Express application with analytics enabled, injects no provider router, sends a synthetic canonical sample, verifies privacy modes and forbidden-field rejection, reads the protected aggregate report and exercises retention deletion.

Declared calls:

```text
Provider live calls: 0
External analytics calls: 0
Local first-party analytics requests: controlled synthetic sample only
```

## Report access

```text
GET /api/internal/analytics/report?windowDays=30
Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>
```

Accepted report windows are 1–180 days. The endpoint never returns raw events.

## Core beta metrics

The report exposes:

- `searchCompletionRate` — completed search journeys / started search journeys;
- `visibleResultsRate` — journeys producing results or partial results / started searches;
- `noResultsRate` — no-results journeys / terminal search journeys;
- `partialResultsRate` — partial-results journeys / terminal search journeys;
- `providerErrorRate` — provider-error journeys / terminal search journeys;
- `detailsOpenRate` — journeys opening details / journeys viewing results;
- `recommendationSelectionRate` — journeys selecting a recommendation / journeys viewing results;
- `recheckRate` — journeys starting recheck / journeys viewing results;
- `handoffRate` — journeys opening handoff / journeys viewing results;
- `recoveryUsageRate` — journeys using recovery / no-results plus failed journeys;
- `journeyAbandonmentRate` — abandoned journeys / started search journeys;
- median bucket for search duration;
- median bucket for time to first choice;
- event, outcome, role, recovery and abandonment distributions.

Rates are not allowed to fabricate certainty. A zero denominator returns `null`, not zero. If a retry journey first fails and later completes, the latest terminal outcome replaces the earlier failure in journey-level rates; both event occurrences remain visible in event-count distributions.

## Sample readiness

The report classifies only sample size, not product success:

```text
0–19 started search journeys
= insufficient-sample

20–99 started search journeys
= early-signal

100+ started search journeys
= usable-beta-sample
```

The first meaningful review begins at 100 started search journeys. This is a measurement threshold, not a guarantee that the product or ranking is good.

## Retention and deletion

Raw event maximum:

```text
30 days
```

Aggregate metric maximum:

```text
180 days
```

Manual deletion:

```text
DELETE /api/internal/analytics/data
Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>
Content-Type: application/json

{"scope":"expired"}
```

Other scopes are `raw`, `aggregates` and `all`.

## Storage limitation

The current store is `in-memory-single-instance`. All analytics data is lost when the backend restarts. It is suitable only for local validation, staging sampling and a tightly controlled first beta with explicit acknowledgement and regular report capture.

Before durable public measurement or horizontal scaling, SmartStay needs a first-party persistent storage adapter and a migration plan. This limitation is intentionally visible in the report and release environment contract.

## Browser validation truth

The permanent test suite runs the real TypeScript analytics client inside a browser-like runtime simulation. It validates tab-scoped storage, DNT, GPC, canonical delivery, transient retry isolation and permanent 4xx dropping.

This is not a claim that a remote public browser journey has been executed. The real deployed browser matrix remains a staging/beta release proof after public staging exists.
