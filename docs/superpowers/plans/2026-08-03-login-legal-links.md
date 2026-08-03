# Login Legal Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Terms of Use and Privacy Policy links directly on the sign-in screen.

**Architecture:** Reuse the existing public `/terms` and `/privacy` routes. Add a small legal navigation area to the sign-in card using React Router `Link`, with localized accessible labeling and no ad placement on the login screen.

**Tech Stack:** Vite, React, React Router, Playwright, i18next.

## Global Constraints

- Keep login as an authentication screen with no ads.
- Legal pages must remain public and reachable without a session.
- Keep the sign-in screen responsive and avoid horizontal overflow on mobile.
- Follow TDD: write the failing E2E test first, verify RED, then implement.

---

### Task 1: Add Legal Links To Sign-In

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: existing public legal routes `/terms` and `/privacy`.
- Produces: `/login` exposes links to `/terms` and `/privacy`, and both links navigate to their public pages.

- [x] **Step 1: Write the failing E2E test**

Add assertions in the sign-in test that `/login` shows Terms and Privacy links with `href` values `/terms` and `/privacy`. Click each link and verify the matching public document heading appears.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project desktop-chromium`

Expected: FAIL because the sign-in screen does not yet expose Terms and Privacy links.

- [x] **Step 3: Implement minimal legal navigation**

Add a compact `nav` below the guide link in `AuthScreen` with `Link` elements for `/terms` and `/privacy`. Add localized `auth.legalLinksLabel` for the navigation label.

- [x] **Step 4: Run focused E2E test to verify it passes**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project desktop-chromium`

Expected: PASS.

- [x] **Step 5: Run frontend verification**

Run: `npm run typecheck --workspace @langchain-training/frontend`

Run: `npm run build --workspace @langchain-training/frontend`

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project mobile-chrome`

Expected: all commands finish with exit code 0.
