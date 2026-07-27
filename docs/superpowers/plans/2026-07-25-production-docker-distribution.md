# Production Docker Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production-optimized Docker images for the Funcione frontend/backend, add a Compose workflow for local validation, and verify the containerized application.

**Architecture:** The monorepo uses one root multi-stage Dockerfile with named runtime targets for frontend and backend. The frontend runtime serves the Vite static build with unprivileged Nginx and proxies API/documentation traffic to the backend container. The backend runtime runs compiled Fastify code, while an optional worker profile runs the durable training generation worker from the same image.

**Tech Stack:** Docker, Docker Compose v2, Node.js 22 Alpine, npm workspaces, Fastify, Vite, React, unprivileged Nginx, Supabase.

## Global Constraints

- Preserve existing workspace changes and do not revert unrelated files.
- Use `rtk proxy` for shell commands in this workspace.
- Start behavior changes with automated tests.
- Keep backend OpenAPI updated for any new route.
- Do not expose Supabase secret/service role keys to the frontend image or browser runtime.
- Compose must support production-style local testing without starting local Supabase.

---

### Task 1: Health Endpoint Contract

**Files:**
- Modify: `apps/backend/src/app.ts`
- Create: `apps/backend/src/shared/http/health-routes.test.ts`

**Interfaces:**
- Produces: `GET /healthz -> { "status": "ok" }`
- Produces: OpenAPI path `/healthz` with `200` response schema.

- [x] Write failing backend test for `GET /healthz`.
- [x] Write failing backend test asserting `/healthz` appears in `/documentation/json`.
- [x] Implement Fastify route in `buildApp`.
- [x] Run backend tests and verify the new tests pass.

### Task 2: Worker Entrypoint

**Files:**
- Create: `apps/backend/src/training-worker.ts`
- Modify: `apps/backend/package.json`

**Interfaces:**
- Produces script: `npm run start:worker --workspace @langchain-training/backend`
- Produces runtime: `node dist/training-worker.js`

- [x] Write failing backend test for worker env validation or CLI script presence.
- [x] Implement worker entrypoint that loads env, builds Supabase worker repositories, polls `processAvailableMonthlyTrainingPlanGenerationJobs`, and handles shutdown signals.
- [x] Add `start:worker` script.
- [x] Run backend tests and build.

### Task 3: Production Docker Assets

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `apps/frontend/nginx.conf`

**Interfaces:**
- Produces Docker target: `frontend-runtime`
- Produces Docker target: `backend-runtime`

- [x] Write failing Docker config test asserting required files, targets, non-root runtime users, and Nginx proxy routes.
- [x] Implement `.dockerignore` excluding secrets, local deps, build artifacts, Playwright reports, and worktrees.
- [x] Implement multi-stage Dockerfile using `npm ci`, workspace builds, backend production deps, and named runtime targets.
- [x] Implement unprivileged Nginx config with SPA fallback and `/api` proxy.
- [x] Run Docker config tests.

### Task 4: Compose And Scripts

**Files:**
- Create: `compose.yaml`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Produces scripts:
  - `npm run docker:build`
  - `npm run docker:up`
  - `npm run docker:test`
  - `npm run docker:down`

- [x] Extend Docker config test for Compose services, healthchecks, and worker profile.
- [x] Add Compose services `backend`, `frontend`, and optional `worker`.
- [x] Add root npm Docker scripts.
- [x] Document Docker usage and required environment variables.
- [x] Run Docker config tests.

### Task 5: Container Verification

**Files:**
- No new source files expected.

**Interfaces:**
- Consumes: Docker scripts from Task 4.

- [x] Run `npm run docker:build`.
- [x] Run `npm run docker:up`.
- [x] Run `npm run docker:test`.
- [x] Run `npm run docker:down`.
- [x] Run final `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.
