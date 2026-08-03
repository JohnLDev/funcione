# Public Guide Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editorial training guide the public entry point for visitors and expose it from the sign-in screen.

**Architecture:** Keep the existing React Router route table and change only the unauthenticated `/` target. Add one sign-in screen link using the existing internal `Link` pattern and localized copy.

**Tech Stack:** Vite, React, React Router, Playwright, i18next.

## Global Constraints

- Preserve authenticated routing: completed users still land on `/dashboard`; incomplete profiles still land on `/complete-profile`.
- Public content must remain reachable without login for AdSense crawler review.
- Keep the sign-in screen mobile friendly and avoid adding ads to navigation or login-only screens.
- Follow TDD: write the failing E2E test first, verify RED, then implement.

---

### Task 1: Public Guide Navigation

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: existing route `/treino-personalizado` and existing sign-in screen.
- Produces: unauthenticated `/` redirects to `/treino-personalizado`; `/login` has a localized link to `/treino-personalizado`.

- [x] **Step 1: Write the failing E2E test**

Add a Playwright test that visits `/`, expects `/treino-personalizado`, verifies the editorial heading and login CTA, then visits `/login` and verifies a guide link navigates to `/treino-personalizado`.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project desktop-chromium`

Expected: FAIL because `/` still redirects to `/login` and the sign-in screen does not yet expose the guide link.

- [x] **Step 3: Implement minimal routing and sign-in link**

Change the unauthenticated root route target from `/login` to `/treino-personalizado`. Add one ghost button link on the sign-in screen with localized text.

- [x] **Step 4: Run focused E2E test to verify it passes**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project desktop-chromium`

Expected: PASS.

- [x] **Step 5: Run frontend verification**

Run: `npm run typecheck --workspace @langchain-training/frontend`

Run: `npm run build --workspace @langchain-training/frontend`

Expected: both commands finish with exit code 0.
