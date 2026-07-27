# Render Backend Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure the existing backend workspace for an initial free Render Web Service deployment while keeping the frontend on Cloudflare Pages.

**Architecture:** Render will run only the Fastify backend as a Node web service from the monorepo root, using npm workspaces for build and start commands. Supabase remains external infrastructure, and Cloudflare Pages will keep serving the frontend with a proxy to the Render API URL.

**Tech Stack:** Render Blueprint, Node.js 22, npm workspaces, Fastify, Supabase.

## Global Constraints

- Preserve the existing dirty workspace and avoid changing unrelated files.
- Keep frontend deployment on Cloudflare Pages.
- Do not add a separate Render worker service while targeting the free Render plan.
- Mark production secrets with `sync: false` so values are filled in the Render Dashboard.

---

### Task 1: Backend Render Blueprint

**Files:**
- Create: `render.yaml`
- Modify: `docs/superpowers/plans/2026-07-27-render-backend-deployment.md`

**Interfaces:**
- Consumes: root `package.json` workspace scripts and `apps/backend/package.json` `build`/`start` scripts.
- Produces: a Render Blueprint with one `funcione-api` web service, health check at `/healthz`, and Dashboard-provided secrets.

- [x] **Step 1: Add `render.yaml`**

Create one Render web service with:

```yaml
services:
  - type: web
    name: funcione-api
    runtime: node
    plan: free
    region: virginia
    branch: main
    autoDeployTrigger: commit
    buildCommand: npm ci && npm run build --workspace @langchain-training/backend
    startCommand: npm run start --workspace @langchain-training/backend
    healthCheckPath: /healthz
```

- [x] **Step 2: Declare runtime config and secrets**

Set non-sensitive values directly and require the Dashboard for Supabase/OpenRouter secrets:

```yaml
envVars:
  - key: NODE_VERSION
    value: 22.15.0
  - key: NODE_ENV
    value: production
  - key: HOST
    value: 0.0.0.0
  - key: SUPABASE_URL
    sync: false
  - key: SUPABASE_PUBLISHABLE_KEY
    sync: false
  - key: SUPABASE_SECRET_KEY
    sync: false
  - key: PRIMARY_PROVIDER
    value: openrouter
  - key: OPENROUTER_API_KEY
    sync: false
  - key: OPENROUTER_MODEL
    value: openai/gpt-oss-120b
  - key: OPENROUTER_SITE_URL
    sync: false
  - key: OPENROUTER_SITE_NAME
    value: Funcione
```

- [x] **Step 3: Verify backend build locally**

Run:

```bash
rtk npm run build --workspace @langchain-training/backend
```

Expected: command exits 0 and emits backend `dist/` files.

- [x] **Step 4: Check Blueprint availability**

Run:

```bash
rtk render --version
```

Expected: if the Render CLI is unavailable, skip CLI validation and use Dashboard Blueprint validation during deploy.

- [x] **Step 5: Provide deploy handoff**

Use the GitHub remote `git@github.com:JohnLDev/funcione.git` as:

```text
https://github.com/JohnLDev/funcione
```

Dashboard Blueprint URL:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/JohnLDev/funcione
```

After deployment, configure Cloudflare Pages to proxy `/api/*` to the generated Render service URL.
