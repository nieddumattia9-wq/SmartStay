# SmartStay Render staging deployment

## Status

This document defines the first public staging deployment only.

It does not authorize production deployment or a public beta.

The staging architecture is:

```text
Render Static Site
  smartstay-staging-web

Render Node Web Service
  smartstay-staging-api
  Frankfurt
  Starter plan
  exactly one instance
```

SmartStay must run exactly one backend instance because search sessions,
idempotency records, booking verifications, handoffs, and analytics are
currently stored in memory.

Do not enable horizontal scaling, autoscaling, rolling overlap, or a second
backend instance.

## Why the backend is not Free

A sleeping backend is incompatible with the current in-memory lifecycle and
with deterministic remote smoke expectations.

The backend therefore uses the Starter plan. The frontend remains a static
site.

## Deployment control

Both services use:

```text
autoDeployTrigger: off
```

Deploy only a reviewed commit whose release gate has passed. Do not enable
automatic deployment from every push.

The Blueprint pins Node to:

```text
24.18.0
```

Render exposes `RENDER_GIT_COMMIT` automatically at build time and runtime.

SmartStay maps it to the canonical `RELEASE_SHA` without creating a Blueprint
environment-variable reference:

```text
Backend start:
RELEASE_SHA=$RENDER_GIT_COMMIT npm start

Frontend build:
RELEASE_SHA=$RENDER_GIT_COMMIT npm run build
```

Do not add `RELEASE_SHA` with `fromService.envVarKey`. Render default
environment variables are not Blueprint-defined service environment
variables.

## Values to enter in Render

Never commit secrets and never paste their values into project documentation.

### Backend: smartstay-staging-api

Set these prompted values in the Render Dashboard:

```text
CLIENT_ORIGINS
VITE_API_URL
GEOAPIFY_API_KEY
LITEAPI_API_KEY
LITEAPI_WHITELABEL_BASE_URL
```

Use the exact deployed origins:

```text
CLIENT_ORIGINS=https://<actual-frontend-host>
VITE_API_URL=https://<actual-backend-host>/api
```

`LITEAPI_WHITELABEL_BASE_URL` must be the real HTTPS white-label checkout
origin approved for the SmartStay integration. Do not invent a domain.

Do not add RouteStack credentials. RouteStack remains disabled and frozen.

### Frontend: smartstay-staging-web

Set:

```text
VITE_API_URL=https://<actual-backend-host>/api
```

The value is embedded at frontend build time. After changing it, redeploy the
frontend.

## Analytics during the controlled beta

The first infrastructure smoke and provider journey were completed with
analytics disabled.

Controlled-beta analytics are enabled only after 39C24A passes:

```text
ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENABLED=true
ANALYTICS_STORAGE_MODE=in-memory-single-instance
ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED=true
```

`ANALYTICS_ADMIN_TOKEN` must be added manually in the Render backend
environment before the Blueprint is synchronized. The token value must never be
committed, placed in `render.yaml`, or shared with testers.

The current analytics store is volatile. Deploys, restarts, and service
replacement can erase raw events and aggregates. Capture the aggregate report
regularly and avoid unnecessary deploys during the controlled beta.

Analytics remain first-party, cookie-free, and disabled for browsers that send
Do Not Track or Global Privacy Control.

## Blueprint creation and recovery

1. Confirm `main` is clean and aligned with `origin/main`.
2. Confirm `npm run release:ci` passed for the exact commit.
3. Open Render and create or sync the Blueprint from the SmartStay repository.
4. Use the root `render.yaml`.
5. Enter the prompted values without committing them.
6. Confirm the backend is in Frankfurt, uses Starter, and has one instance.
7. Confirm automatic deploys remain off.
8. Deploy the reviewed commit manually.
9. Record the exact frontend URL, backend URL, service IDs, and deployed SHA.

If a Blueprint sync fails before deployment, correct `render.yaml`, validate
and commit the correction, then use Manual sync on the existing Blueprint. Do
not create duplicate services.

If a requested service name is unavailable, stop. Update the names in
`render.yaml`, validate the repository again, then update the exact deployed
origins in `CLIENT_ORIGINS` and `VITE_API_URL`.

## Required checks before provider traffic

Verify over HTTPS:

```text
GET <backend>/health/live
GET <backend>/health/ready
GET <backend>/health
```

The readiness response must identify the exact deployed `RELEASE_SHA`.

Then run the existing remote staging smoke with:

```text
STAGING_FRONTEND_URL
STAGING_BACKEND_URL
EXPECTED_RELEASE_SHA
```

The frontend URL must load the SPA directly and on a nested route refresh.

## Controlled live journey

A provider journey is separate from infrastructure smoke.

Run exactly one bounded journey only after:

- health and readiness pass;
- frontend and backend report the expected release;
- CORS is correct;
- HTTPS is correct;
- the white-label checkout origin is real;
- no unexpected analytics traffic is observed.

Record provider calls honestly.

## Rollback

Before any live journey, retain the previous valid release candidate and its
manifest.

If remote smoke fails:

1. stop provider tests;
2. preserve logs and smoke evidence;
3. roll back both services to the previous successful deploy;
4. verify health and release SHA after rollback;
5. do not open the beta.

Render rollback capability does not replace SmartStay's own candidate and
evidence gates.

## Exit criteria for 39C22D

39C22D is closed only when all of the following are proven:

- public frontend and backend staging URLs exist;
- both services run the same approved commit;
- backend is one paid instance in Frankfurt;
- remote HTTPS smoke passes;
- release SHA matches;
- CORS and trust proxy behave correctly;
- one bounded provider journey passes;
- booking recheck and handoff are verified;
- rollback target is known and verified;
- controlled-beta analytics use the reviewed first-party contract;
- the admin token is configured outside the repository;
- evidence ZIP is produced;
- production remains blocked.
