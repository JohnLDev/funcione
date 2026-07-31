# Auth Redirect And Ads Env Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep AdSense enabled in production and make Google OAuth redirect work on localhost and deployed domains through environment configuration with a safe current-origin fallback.

**Architecture:** Preserve `VITE_AUTH_REDIRECT_URL` as the optional explicit redirect target. When it is empty or omitted, the Supabase auth gateway uses the current browser origin so localhost ports used by Vite/Codex and the current Worker deploy work without changing code. AdSense remains enabled with the existing public IDs.

**Tech Stack:** React 19, Vite 7.3.x, TypeScript, Playwright, Supabase Auth, Google OAuth, Google AdSense.

## Global Constraints

- Use `rtk` for shell commands in this workspace.
- Follow TDD: add or update tests before changing implementation/config behavior.
- Keep `VITE_ADS_ENABLED=true` for production.
- Keep AdSense public IDs unchanged.
- Keep `VITE_AUTH_REDIRECT_URL` optional: configured env wins; empty env falls back to the browser origin.
- Supabase Dashboard must allow every redirect URL used by Google OAuth, including the deploy URL and localhost origins used for local testing.

---

### Task 1: Auth Redirect Env Behavior

**Files:**
- Modify: `apps/frontend/e2e/supabase-auth-gateway.spec.ts`
- Modify: `apps/frontend/src/auth/supabase-auth-gateway.ts`
- Modify: `.env.example`
- Modify: `.env.production`
- Modify: `docs/authentication.md`
- Modify: `docs/superpowers/plans/2026-07-30-google-adsense-display.md`
- Modify: `docs/superpowers/specs/2026-07-30-google-adsense-display-design.md`

**Interfaces:**
- Consumes: `createSupabaseAuthGateway({ authRedirectUrl })`
- Produces: `resolveOAuthRedirectUrl(configuredRedirectUrl, currentOrigin)` behavior where configured env wins and blank env falls back to current origin.

- [x] **Step 1: Add failing redirect tests**

Add tests proving that a configured production URL trims trailing slash and that an empty env falls back to the current browser origin for localhost.

- [x] **Step 2: Run focused auth gateway test and verify it fails**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- supabase-auth-gateway.spec.ts --project desktop-chromium
```

Expected: FAIL before exporting/test-enabling the resolver fallback.

- [x] **Step 3: Implement redirect resolver behavior**

Export the resolver from `apps/frontend/src/auth/supabase-auth-gateway.ts` with a testable `currentOrigin` parameter. Keep `signInWithGoogle()` using the browser origin at runtime.

- [x] **Step 4: Update env files**

Set `.env.example` and `.env.production` to leave `VITE_AUTH_REDIRECT_URL` blank with comments explaining the current-origin fallback. Keep `VITE_ADS_ENABLED=true` in production.

- [x] **Step 5: Update docs**

Update auth and AdSense docs so localhost testing and the current Worker deploy use blank `VITE_AUTH_REDIRECT_URL` unless an explicit stable production domain is configured. AdSense production remains enabled per the current decision.

- [x] **Step 6: Run focused tests and typecheck**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- supabase-auth-gateway.spec.ts --project desktop-chromium
rtk npm run typecheck --workspace @langchain-training/frontend
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
rtk git add .env.example .env.production apps/frontend/e2e/supabase-auth-gateway.spec.ts apps/frontend/src/auth/supabase-auth-gateway.ts docs/authentication.md docs/superpowers/plans/2026-07-30-google-adsense-display.md docs/superpowers/specs/2026-07-30-google-adsense-display-design.md docs/superpowers/plans/2026-07-31-auth-redirect-and-ads-env.md
rtk git commit -m "fix(auth): support local OAuth redirects"
```

## Self-Review Notes

- Spec coverage: covers production ads enabled, redirect env precedence, localhost fallback, deploy URL, and Supabase allowlist requirement.
- Placeholder scan: no placeholders.
- Type consistency: resolver keeps the existing `authRedirectUrl` input and only adds a testable `currentOrigin` parameter.
