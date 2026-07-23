# SmartStay production release and rollback gate

## Status

This contract prepares and verifies a release. It does **not** deploy SmartStay and does not choose a hosting provider.

Production promotion remains blocked until all required evidence exists.

## Non-negotiable runtime constraint

The backend stores search sessions, idempotency records, booking verifications, and handoffs in process memory.

Until shared persistence exists:

- deploy exactly one backend instance;
- disable horizontal autoscaling;
- do not use rolling overlap;
- expect active sessions to expire on restart or rollback;
- keep `RUNTIME_STATE_MODE=in-memory-single-instance`.

## 1. Create an immutable release candidate

Run the complete gate and build:

```text
npm ci
npm ci --prefix server
npm run release:ci
```

Create the candidate manifest:

```text
npm run release:candidate -- --expected-sha <git-sha> --output .smartstay-release
```

Verify it against the built frontend and tracked backend files:

```text
npm run release:verify -- --manifest .smartstay-release/release-manifest.json --expected-sha <git-sha> --root .
```

The manifest records:

- exact Git SHA;
- frontend file hashes and aggregate SHA-256;
- backend file hashes and aggregate SHA-256;
- root and backend lockfile hashes;
- single-instance constraint;
- absence of automatic deploy, tag, or release actions.

The GitHub release gate uploads this evidence for pushes to `main` and manual workflow runs.

## 2. Deploy the exact candidate to staging

Configure staging with the release SHA and the environment contract in `STAGING_RELEASE.md`.

Do not rebuild from an unspecified branch. Deploy the exact retained candidate/commit.

## 3. Collect safe remote staging smoke evidence

```text
STAGING_FRONTEND_URL=https://staging.example.com
STAGING_BACKEND_URL=https://api-staging.example.com
EXPECTED_RELEASE_SHA=<candidate-sha>
SMARTSTAY_SMOKE_OUTPUT=<path-to-report.json>
npm run smoke:staging
```

The report must be remote, PASS, match the candidate SHA, use HTTPS, and contain zero provider calls.

## 4. Collect a controlled live staging journey

Production promotion also requires a separate report:

```text
reportVersion: 39C22C-live-staging-journey-v1
validationResult: PASS
releaseSha: <candidate-sha>
liveProviderCalls: 2..20
```

Required PASS checks:

- destination search;
- hotel search;
- lifecycle completion or valid partial completion;
- details for the Engine-selected offer;
- selected-offer identity integrity;
- live offer recheck;
- secure HTTPS handoff;
- public response redaction;
- clean browser console.

The report must also state:

```text
checkoutHttps: true
secretLeaks: 0
providerPrivateLeaks: 0
```

This live test is intentionally bounded. It must not become a load test.

## 5. Retain and verify a rollback candidate

Production promotion requires a previous retained release-candidate manifest.

```text
npm run rollback:verify --   --current-sha <candidate-sha>   --rollback-sha <previous-candidate-sha>   --rollback-manifest <previous-release-manifest.json>   --root .
```

The rollback SHA must:

- differ from the candidate;
- exist in Git;
- be an ancestor of the candidate;
- remain reachable from `origin/main`;
- match its retained manifest.

The first production release is blocked until a previous retained candidate exists. SmartStay does not silently waive this safeguard.

## 6. Create the production release plan

```text
npm run release:evidence --   --candidate-manifest <candidate-manifest.json>   --staging-smoke-report <remote-smoke.json>   --live-journey-report <live-staging-journey.json>   --rollback-manifest <rollback-manifest.json>   --production-frontend-url https://www.example.com   --production-backend-url https://api.example.com   --output <production-release-plan.json>
```

The generated plan contains evidence hashes and confirms that no deploy, tag, release, or rollback was executed.

A human approval is required after reviewing that plan.

## 7. Production deployment

The hosting-specific deployment command belongs outside the SmartStay domain and must deploy the exact candidate SHA/artifact.

After deployment:

1. check `/health/live`;
2. check `/health/ready`;
3. verify the production `RELEASE_SHA`;
4. run a safe production smoke without provider calls;
5. perform one bounded live journey;
6. retain the reports;
7. only then mark the release as last known good.

## 8. Tagging

Create an annotated production tag only after successful production verification:

```text
smartstay-prod-YYYYMMDD-HHMM-<short-sha>
```

The tag message should reference the candidate manifest and evidence hashes.

Do not move or reuse production tags.

## 9. Rollback

Rollback means redeploying the retained previous candidate, not editing the live server.

Sequence:

1. stop routing new traffic if supported;
2. deploy the rollback candidate;
3. set `RELEASE_SHA` to the rollback SHA;
4. verify liveness/readiness and SHA;
5. run the remote safe smoke;
6. run the bounded live journey if booking flow was affected;
7. record the rollback report.

Restart or rollback invalidates in-memory search and booking IDs. The frontend must recover through the existing expired-session flow.

## 10. Evidence retention

Retain for every production release:

- release-candidate manifest;
- frontend/backend aggregate hashes;
- exact Git SHA;
- remote staging smoke report;
- controlled live staging journey report;
- production release plan;
- rollback manifest and SHA;
- production smoke reports;
- deployment timestamp;
- annotated production tag.

No evidence file may contain environment values, API keys, tokens, provider-private references, guest data, or payment data.
