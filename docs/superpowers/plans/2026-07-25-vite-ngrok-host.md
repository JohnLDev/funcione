# Vite Ngrok Host Access Plan

**Goal:** Allow the Vite development server to respond through trusted ngrok free tunnel hosts without disabling Vite host protection.

**Architecture:** Configure `server.allowedHosts` with the explicit `.ngrok-free.app` domain pattern, which keeps localhost/IP defaults and permits ngrok tunnel subdomains while still blocking unrelated hosts.

**Files Affected:**
- `.gitignore`
- `apps/frontend/e2e/dev-server-hosts.spec.ts`
- `apps/frontend/vite.config.ts`

**Verification Commands:**
- `npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium apps/frontend/e2e/dev-server-hosts.spec.ts`
- `npm run typecheck --workspace @langchain-training/frontend`

## Tasks

- [x] Add failing E2E coverage for ngrok host access and unrelated host blocking.
- [x] Configure Vite `server.allowedHosts` with `.ngrok-free.app`.
- [x] Verify the targeted E2E and frontend typecheck.
