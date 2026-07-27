# Social Login Redirect URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Google social login returns to the deployed Funcione frontend instead of falling back to localhost.

**Architecture:** Add an explicit frontend auth redirect URL env consumed by the Supabase auth gateway. Keep local development behavior by falling back to `window.location.origin` when no env is configured. Cover the OAuth redirect target with an automated gateway test and document the matching Supabase allowlist requirement.

**Tech Stack:** React, Vite, `@supabase/supabase-js`, Playwright E2E module tests.

## Global Constraints

- Frontend environment variables exposed to browser code must use the `VITE_` prefix.
- Supabase OAuth `redirectTo` must match the project Site URL origin or an Additional Redirect URL allowlist entry.
- Do not expose any Supabase secret or `service_role` key in frontend env.
- Preserve local development behavior through the existing Vite dev server and localhost origin fallback.

---

### Task 1: Supabase OAuth Redirect Configuration

**Files:**
- Modify: `apps/frontend/src/auth/supabase-auth-gateway.ts`
- Modify: `apps/frontend/src/auth/auth-gateway.ts`
- Modify: `apps/frontend/src/vite-env.d.ts`
- Modify: `.env.production`
- Modify: `.env.example`
- Modify: `docs/authentication.md`
- Test: `apps/frontend/e2e/supabase-auth-gateway.spec.ts`

**Interfaces:**
- Consumes: `createSupabaseAuthGateway(config)`
- Produces: `VITE_AUTH_REDIRECT_URL` and a gateway that passes the resolved URL to `signInWithOAuth({ options: { redirectTo } })`

- [x] **Step 1: Write the failing test**

Add `apps/frontend/e2e/supabase-auth-gateway.spec.ts` with a fake Supabase client and a test asserting Google OAuth receives `https://funcione.pages.dev` as `options.redirectTo` when configured.

- [x] **Step 2: Run the focused test to verify RED**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- supabase-auth-gateway.spec.ts --project desktop-chromium`

Expected: fail because `createSupabaseAuthGateway` does not accept/use the explicit redirect URL yet.

Actual RED: failed with `ReferenceError: window is not defined` at `redirectTo: window.location.origin`, proving the gateway is still hard-coded to the runtime origin.

- [x] **Step 3: Implement the minimal fix**

Extend the gateway config with `authRedirectUrl`, normalize trailing slashes, pass `import.meta.env.VITE_AUTH_REDIRECT_URL` from `createAuthGateway`, and keep fallback to `window.location.origin`.

- [x] **Step 4: Run focused tests to verify GREEN**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- supabase-auth-gateway.spec.ts --project desktop-chromium`

Expected: pass.

Actual GREEN: `1 passed`.

- [x] **Step 5: Run full verification**

Run: `rtk npm run typecheck`, `rtk npm test`, `rtk npm run test:e2e`, and `rtk npm run build`.

Expected: all commands exit 0.

Actual:
- `rtk npm run typecheck`: exit 0.
- `rtk npm test`: `103 pass`, `0 fail`.
- `rtk npm run test:e2e`: `79 passed`, `3 skipped`.
- `rtk npm run build`: exit 0, with the existing Vite chunk-size warning.
- `rtk rg -l "https://funcione\\.pages\\.dev" apps/frontend/dist`: found the production bundle.
