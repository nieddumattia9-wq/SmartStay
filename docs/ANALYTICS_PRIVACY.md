# SmartStay Analytics Contract & Privacy

## Status

This document defines the analytics foundation for SmartStay beta measurement.

It does **not** enable analytics, add an SDK, create cookies, or send events. Instrumentation and first-party ingestion belong to 39C23B.

## Product purpose

Analytics must answer only questions that improve the user decision flow:

- Did a search start and complete?
- Which lifecycle outcome occurred?
- Were useful recommendation roles visible?
- Did the user open details, verify an offer, or continue to booking?
- Did recovery actions help?
- How long did each stage take, using coarse buckets?

Analytics must not become a parallel copy of search, booking, or provider data.

## Privacy rules

The canonical contract is:

`contracts/analytics-event-contract.v1.json`

Non-negotiable rules:

- first-party transport only;
- disabled by default until 39C23B explicitly enables it;
- no third-party analytics SDK;
- no analytics cookies;
- no `localStorage`;
- one random browser-tab session only;
- no cross-session user profile;
- no fingerprinting;
- respect Do Not Track and Global Privacy Control;
- maximum 30 days for raw events;
- maximum 180 days for aggregated metrics.

## Data that must never enter analytics

Examples include:

- destination text, destination IDs, coordinates, country or city;
- exact dates and exact budget;
- exact adults, children, or child ages;
- hotel names and IDs;
- offer, verification, handoff, search, request, or idempotency IDs;
- provider names, IDs, contexts, or proprietary payloads;
- email, phone, names, addresses, IP, user-agent, raw referrer, or full URL;
- API keys, tokens, authorization headers, cookies, or secrets.

The contract permits only coarse product buckets such as stay-length band, party-size band, result-count band, duration band, recommendation role, lifecycle outcome, and boolean states.

## Session model

A future analytics session may be generated randomly for one browser tab and stored only in `sessionStorage`.

It is not a user ID. It must expire at browser-tab end or after at most 120 minutes and must not be reused across sessions.

Existing SmartStay search/session storage is operational state and must not be copied into analytics.

## Event set

The beta contract includes:

- `page_view`
- `search_started`
- `search_completed`
- `search_failed`
- `results_viewed`
- `recommendation_selected`
- `hotel_details_opened`
- `explanation_toggled`
- `search_preferences_changed`
- `search_retried`
- `booking_recheck_started`
- `booking_recheck_completed`
- `booking_handoff_prepared`
- `booking_handoff_opened`
- `journey_abandoned`
- `results_recovery_applied`

Event names and allowed properties are provider-neutral.

## Validation

Run:

```bash
npm run validate:analytics
npm run test:analytics
```

The main `npm test` and release CI gate also include the analytics contract tests.

## Next block

39C23B will implement:

1. a small first-party client;
2. Do Not Track / Global Privacy Control enforcement;
3. event batching and strict payload limits;
4. a backend ingestion boundary;
5. instrumentation at selected frontend/backend decision points;
6. no external SDK and no persistent user identity.

This is a technical privacy-by-design policy, not legal advice. Before public production, the privacy notice and legal basis must be reviewed for the actual hosting, retention, and analytics configuration.
