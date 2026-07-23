# SmartStay staging and release contract

## Deployment shape

SmartStay is deployed as two independently built services:

1. **Frontend:** static Vite build from `dist/`.
2. **Backend:** Node/Express process started from `server/` with `npm start`.

The release contract is hosting-provider neutral. A platform-specific manifest must not become part of the domain or provider architecture.

## Runtime constraint

Search sessions, idempotency records, booking verifications, and booking handoffs are currently stored in process memory.

Until persistent shared storage is introduced:

- run exactly **one backend instance**;
- disable horizontal autoscaling;
- do not use rolling overlap between two backend instances;
- expect active sessions to expire whenever the backend restarts;
- use `RUNTIME_STATE_MODE=in-memory-single-instance`.

This is acceptable for staging and a controlled beta, but not for multi-instance production.

## Frontend configuration

Set `VITE_API_URL` when building the frontend.

Same-origin reverse proxy:

```text
VITE_API_URL=/api
```

Separate backend origin:

```text
VITE_API_URL=https://api-staging.example.com/api
```

Release URLs must use HTTPS. Local HTTP is allowed only during development.

## Backend release variables

Required for staging and production:

```text
NODE_ENV=production
DEPLOYMENT_ENV=staging | production
CLIENT_ORIGINS=https://frontend-origin.example
TRUST_PROXY=1
VITE_API_URL=/api | https://api-origin.example/api
GEOAPIFY_API_KEY=<secret>
LITEAPI_API_KEY=<secret>
LITEAPI_WHITELABEL_BASE_URL=<approved HTTPS checkout origin>
RELEASE_SHA=<deployed Git commit>
RUNTIME_STATE_MODE=in-memory-single-instance
```

RouteStack remains disabled and its credentials are not release requirements.

## Build and install

```text
npm ci
npm ci --prefix server
npm run release:ci
```

Backend production install may omit development dependencies:

```text
npm ci --prefix server --omit=dev
```

Frontend artifact:

```text
dist/
```

Backend start command:

```text
cd server
npm start
```

## Environment validation

Run with the same environment that will be used by the deployment:

```text
npm run check:release-env
```

The command reports only field names and validation errors. It never prints secret values.

Full local/CI release gate:

```text
npm run release:gate
```

## Health checks

Liveness:

```text
GET /health/live
```

Readiness:

```text
GET /health/ready
```

A release is eligible for traffic only when readiness returns HTTP 200 and the expected `RELEASE_SHA` appears as `version`.

## Staging runtime smoke test

The permanent smoke runner supports two modes.

Local production-like backend process:

```text
npm run smoke:staging:local
```

This mode starts the real Node backend with controlled staging variables on an isolated local port. It verifies release identity, liveness, readiness, CORS, preflight, security headers, canonical public errors, request-ID propagation, structured logs, secret redaction, controlled shutdown, and zero provider calls.

Public staging endpoints:

```text
STAGING_FRONTEND_URL=https://staging.example.com
STAGING_BACKEND_URL=https://api-staging.example.com
EXPECTED_RELEASE_SHA=<deployed Git commit>
npm run smoke:staging
```

Remote mode verifies that the frontend loads through HTTPS and repeats the safe backend checks without issuing a valid provider-triggering search. It therefore proves deployment/runtime integrity, not live inventory correctness.

The full release smoke in 39C22C must additionally verify:

- one controlled live destination search;
- one controlled live hotel search;
- partial/complete lifecycle;
- details for the Engine-selected offer;
- offer recheck;
- secure handoff using the approved white-label domain;
- no secret or provider-private data in browser responses;
- rollback to the previously validated artifact.

## Rollback

Rollback means deploying the previously validated Git commit/artifact, not editing the live server.

Because runtime state is in-memory, rollback or restart invalidates active search and booking verification IDs. The frontend must recover through the existing session-expired flow.

Record for every release:

```text
Git commit
frontend artifact
backend artifact
environment name
deployment timestamp
smoke-test report
rollback commit/artifact
```
