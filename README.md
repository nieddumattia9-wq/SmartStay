# SmartStay

SmartStay is a travel decision engine that turns accommodation inventory into a small set of explainable recommendations.

> SmartStay does not find the cheapest stay. It finds the smartest choice.

## Architecture

```text
Provider APIs
→ provider-specific adapters
→ canonical SmartStay contracts
→ provider orchestrator
→ SmartStay Engine V2
→ public presenters
→ React frontend
```

The core remains provider-agnostic. LiteAPI is the active accommodation provider. RouteStack is disabled and frozen.

## Project structure

```text
src/        React + TypeScript + Vite frontend
server/     Node.js + Express backend
scripts/    test, security and release runners
tests/      Engine V2, lifecycle, security and release tests
docs/       operational documentation
```

## Local development

Frontend:

```text
npm ci
npm run dev
```

Backend:

```text
cd server
npm ci
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001
API:      http://localhost:3001/api
```

Create local environment files from the examples and add real values only to ignored `.env` files.

## Quality gates

```text
npm run typecheck
npm test
npm run build
npm run audit:security
```

Release CI gate:

```text
npm run release:ci
```

Release environment validation:

```text
npm run check:release-env
```

Complete release gate:

```text
npm run release:gate
```

## Health endpoints

```text
GET /health/live
GET /health/ready
```

Health payloads expose the service version and deployment environment, but never secrets.

## Deployment

Read [`docs/STAGING_RELEASE.md`](docs/STAGING_RELEASE.md).

The current search, idempotency, verification and handoff stores are in-memory. Staging and controlled beta must therefore use one backend instance until shared persistence is implemented.

## Security

- secrets stay in backend environment variables;
- CORS uses an explicit allowlist;
- input is validated before provider operations;
- expensive endpoints have independent rate limits;
- logs are structured and redact sensitive fields;
- public errors hide internal provider details;
- dependency audits cover the root project and production backend dependencies.
