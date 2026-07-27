# Production Docker Distribution Design

## Objective

Dockerize the Funcione monorepo for production-style execution and provide a Docker Compose workflow that makes local validation close to deployment: build optimized images, start frontend/backend/worker, run health checks, and execute automated tests against the containerized app.

## Decisions

- Use separate runtime services for `frontend`, `backend`, and `worker`.
- Use multi-stage Docker builds with `npm ci`, cached dependency layers, and non-root runtime users.
- Serve the Vite build with `nginxinc/nginx-unprivileged` on port `8080`.
- Run the Fastify backend from compiled JavaScript on Node 22 Alpine.
- Run the training generation worker as a separate Node process using the backend build output.
- Keep Supabase as an external managed service; Compose does not start local Supabase in this phase.
- Keep browser-safe `VITE_*` variables only in the frontend build and backend-only secrets only in backend/worker services.

## Services

### Frontend

- Build target: `frontend-runtime`.
- Exposes container port `8080`.
- Proxies `/api` and `/documentation` to the backend service inside Compose.
- Uses static SPA fallback to `/index.html`.

### Backend

- Build target: `backend-runtime`.
- Exposes container port `3000`.
- Runs `node apps/backend/dist/server.js`.
- Provides `GET /healthz` for container health and load balancer checks.

### Worker

- Build target: `backend-runtime`.
- Runs `node apps/backend/dist/training-worker.js`.
- Polls durable monthly training generation jobs.
- Requires `SUPABASE_URL` and `SUPABASE_SECRET_KEY` when persistent generation is enabled.

## Environment

Compose reads `.env` for local testing. Production platforms should inject the same variables through their secret managers. The frontend must only receive:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The backend and worker may receive:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- AI provider keys and model settings
- `TRAINING_PLAN_MODEL_TIMEOUT_MS`
- `TRAINING_PLAN_JOB_LEASE_MS`

## Testing Strategy

- Add automated tests for the new `/healthz` API contract and OpenAPI visibility.
- Add automated tests for Docker configuration files so build targets, healthchecks, service separation, and secret boundaries are enforced.
- Add npm scripts for Docker build, Docker up, Docker tests, and Docker down.
- Validate with:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run docker:build`
  - `npm run docker:up`
  - `npm run docker:test`
  - `npm run docker:down`

## Risks And Constraints

- Dockerized E2E against real Supabase depends on local `.env` credentials and network access.
- The worker can call paid/limited AI providers if real queued jobs are present, so local Compose starts it only when explicitly enabled through the `worker` profile.
- Supabase migrations still need to be applied outside Compose against the configured project.
