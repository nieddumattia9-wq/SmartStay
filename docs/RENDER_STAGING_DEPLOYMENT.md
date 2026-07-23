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

The release SHA is copied from Render's `RENDER_GIT_COMMIT` into the
application's canonical `RELEASE_SHA`.

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

## Analytics during the first remote smoke

Analytics remain disabled:

```text
ANALYTICS_ENABLED=false
VITE_ANALYTICS_ENABLED=false
ANALYTICS_STORAGE_MODE=in-memory-single-instance
ANALYTICS_VOLATILE_STORAGE_ACKNOWLEDGED=false
```

Do not set `ANALYTICS_ADMIN_TOKEN` while analytics are disabled.

Analytics can be enabled later only through a separate reviewed staging
decision and with the volatile-storage acknowledgement required by the release
contract.

## Blueprint creation

1. Confirm `main` is clean and aligned with `origin/main`.
2. Confirm `npm run release:ci` passed for the exact commit.
3. Open Render and create a new Blueprint from the SmartStay repository.
4. Use the root `render.yaml`.
5. Keep the service names unchanged. The release SHA self-references depend on
   those names.
6. Enter the prompted values without committing them.
7. Confirm the backend is in Frankfurt, uses Starter, and has one instance.
8. Confirm automatic deploys remain off.
9. Deploy the reviewed commit manually.
10. Record the exact frontend URL, backend URL, service IDs, and deployed SHA.

If a requested service name is unavailable, stop. Update both the service name
and every matching `fromService.name` reference in `render.yaml`, validate the
repository again, then commit the change.

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
- analytics remain disabled unless separately approved;
- evidence ZIP is produced;
- production remains blocked.
