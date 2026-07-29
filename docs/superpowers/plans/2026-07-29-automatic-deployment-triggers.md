# Automatic Deployment Triggers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic production deployment triggers for the frontend while preserving Render's native backend auto-deploy.

**Architecture:** Keep backend deployment in Render through `render.yaml` with `autoDeployTrigger: commit` and path filters. Add a GitHub Actions workflow for the Cloudflare frontend that runs on `main` pushes touching frontend-related files and can also be dispatched manually.

**Tech Stack:** GitHub Actions, Cloudflare Wrangler Action, Render Blueprint, npm workspaces.

## Global Constraints

- Do not store credentials in the repository.
- Use GitHub Secrets for Cloudflare token/account and public Vite deploy values when configured as secrets.
- Keep backend auto-deploy owned by Render to avoid duplicate backend deploys.
- Keep path filters so frontend deploys do not run for backend-only changes.

---

### Task 1: Frontend Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy-frontend.yml`
- Modify: `apps/frontend/wrangler.jsonc`

**Interfaces:**
- Consumes: GitHub Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Consumes: optional GitHub Variables `VITE_API_BASE_URL`, `VITE_AUTH_REDIRECT_URL`.
- Produces: automatic Cloudflare deploy for the frontend on filtered `main` pushes.

- [x] Create a workflow triggered by `push` to `main` with frontend path filters and `workflow_dispatch`.
- [x] Install dependencies with `npm ci`.
- [x] Run frontend typecheck and build.
- [x] Deploy using `cloudflare/wrangler-action` from `apps/frontend`.
- [x] Set `assets.directory` to `./dist` so `wrangler deploy` can publish the Vite build output.

### Task 2: Deployment Documentation

**Files:**
- Create: `docs/deployment-automation.md`

**Interfaces:**
- Produces: setup instructions for GitHub secrets/variables and deployment flow.

- [x] Document backend Render auto-deploy behavior.
- [x] Document frontend Cloudflare GitHub Actions behavior.
- [x] Document required GitHub secrets and optional variables.
- [x] Document manual dispatch path for redeploying.

### Task 3: Verification

**Files:**
- Verify: `.github/workflows/deploy-frontend.yml`
- Verify: `docs/deployment-automation.md`

- [x] Run `git diff --check`.
- [x] Verify no credential values are present.
- [x] Verify workflow paths match monorepo structure.
