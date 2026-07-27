# Training Route State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the protected monthly training-plan route, its gateway state, and a mobile-first placeholder screen.

**Architecture:** Follow the existing auth gateway/provider pattern. The training provider reads `AuthSession.accessToken`, selects mock or API gateways from `VITE_AUTH_MODE`, and wraps the temporary `/training` screen. Dashboard navigation uses React Router `NavLink` targets so browser history remains native.

**Tech Stack:** React 19, React Router 7 declarative mode, TypeScript, Vite, i18next, Playwright.

## Global Constraints

- Use `AuthSession.accessToken` through `useAuth()`.
- Protect `/training` identically to `/dashboard`.
- Use real `Link`/`NavLink` navigation, not render-in-place buttons.
- Add matching Portuguese and English translations.
- Keep the screen mobile-first with no horizontal overflow.
- Run the route E2E in `mobile-chrome` mock auth mode before and after implementation.

---

### Task 1: Prove and Implement Training Route Navigation

**Files:**
- Create: `apps/frontend/e2e/training-plan.spec.ts`
- Create: `apps/frontend/src/training/training-plan.ts`
- Create: `apps/frontend/src/training/api-training-plan-gateway.ts`
- Create: `apps/frontend/src/training/mock-training-plan-gateway.ts`
- Create: `apps/frontend/src/training/training-plan-gateway.ts`
- Create: `apps/frontend/src/training/training-plan-provider.tsx`
- Create: `apps/frontend/src/training/use-training-plan.ts`
- Create: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

- [x] Write the mobile Playwright test that creates an account, follows the Treino link, and asserts `/training` plus the Portuguese heading.
- [x] Run the targeted E2E test and record the expected missing-link failure.
- [x] Add contract types, API/mock gateways, gateway factory, provider, and hook.
- [x] Add the protected route, temporary screen, and `NavLink` dashboard navigation.
- [x] Add translations in both locales.
- [x] Run frontend typecheck and the targeted mobile E2E test.
- [x] Self-review the diff and commit `feat: add training route state`.

### Task 2: Respect the Mock Monthly Generation Window

**Files:**
- Create: `apps/frontend/e2e/mock-training-plan-gateway.spec.ts`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`
- Modify: `apps/frontend/src/training/mock-training-plan-gateway.ts`
- Modify: `apps/frontend/src/components/app-shell.tsx`

- [x] Write focused mock-gateway coverage for active and regenerable stored plans, plus a mobile navigation assertion for a single active destination.
- [x] Run the focused tests in red.
- [x] Derive mock plan activity from its status and generation cutoff, and create timestamps from the current time.
- [x] Keep History and Profile as neutral links until they have distinct destinations, so only actual route destinations can be active.
- [x] Run focused tests, frontend typecheck, and the Task 7 mobile route test.
- [x] Append TDD evidence to the Task 7 report and commit `fix: respect monthly mock training window`.
