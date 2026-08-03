# Public Content For AdSense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five public editorial pages and link them from the public guide so AdSense review sees useful publisher content before sign-in.

**Architecture:** Add localized content data for public pages and render it through one reusable public editorial screen. Register new React Router routes and add crawlable internal links from the current training guide and public footers.

**Tech Stack:** Vite, React, React Router, Playwright, i18next, Tailwind.

## Global Constraints

- The `/sobre` page must not mention AI, artificial intelligence, IA, algorithms, models, or automated generation.
- Public pages should be editorial and practical, not marketing-only.
- Health and safety copy must avoid medical claims and make clear that professional guidance is appropriate for specific conditions.
- Ads can appear only after meaningful article content, using the existing pre-footer placement.
- Login, loading, legal-only navigation, profile completion, empty dashboard, and generation screens remain ad-free.
- Follow TDD: write the failing E2E test first, verify RED, then implement.

---

### Task 1: Public Content Route Coverage

**Files:**
- Modify: `apps/frontend/e2e/adsense-display.spec.ts`

**Interfaces:**
- Consumes: planned public routes `/sobre`, `/guias/rotina-de-treino-personalizada`, `/guias/treino-em-casa-academia-quadra`, `/guias/seguranca-recuperacao-lesoes`, and `/perguntas-frequentes`.
- Produces: E2E proof that the routes are public, navigable from `/treino-personalizado`, ad-supported only after content, mobile-safe, and that `/sobre` avoids AI wording.

- [x] **Step 1: Write the failing E2E test**

Add a test that starts at `/treino-personalizado`, asserts links to all five public pages, opens each page, checks a specific heading, checks the pre-footer ad appears after visible article content, checks mobile scroll width is not wider than the viewport, and asserts `/sobre` does not contain AI-related wording.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium`

Expected: FAIL because the new routes and links do not exist.

### Task 2: Public Content Implementation

**Files:**
- Create: `apps/frontend/src/content/public-editorial-pages.ts`
- Create: `apps/frontend/src/components/public-editorial-page-screen.tsx`
- Create: `apps/frontend/src/components/public-footer.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/editorial-training-screen.tsx`
- Modify: `apps/frontend/src/components/legal-document-screen.tsx`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: `PreFooterAd`, `ProductLogo`, `SettingsMenu`, `Button`, and React Router `Link`.
- Produces: shared `PublicFooter`, shared `PublicEditorialPageScreen`, and localized content data keyed by public page slug.

- [x] **Step 3: Implement localized content data**

Create public page data with titles, subtitles, sections, bullets, and related links. The Portuguese `/sobre` body must not include AI-related terms. English content should mirror the same restriction on the About page.

- [x] **Step 4: Implement shared public screen and footer**

Create `PublicFooter` for public/legal/authenticated footer links and `PublicEditorialPageScreen` for the five content pages. Place `PreFooterAd` after article sections and before the footer.

- [x] **Step 5: Register routes and internal links**

Add routes in `App.tsx`, add five content links to `/treino-personalizado`, and use `PublicFooter` in legal, editorial, and authenticated footer locations.

### Task 3: Verification And Publishing

**Files:**
- Modify: `docs/superpowers/plans/2026-08-03-public-content-adsense.md`

**Interfaces:**
- Consumes: completed implementation from Task 2.
- Produces: verified commit on `main` and pushed remote branch.

- [x] **Step 6: Run focused E2E to verify GREEN**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium`

Expected: PASS.

- [x] **Step 7: Run mobile E2E for public content**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project mobile-chrome`

Expected: PASS.

- [x] **Step 8: Run full verification**

Run: `npm run typecheck`

Run: `npm test`

Run: `npm run test:e2e`

Run: `npm run build`

Expected: all commands finish with exit code 0, allowing known non-blocking Vite chunk-size warnings.

- [ ] **Step 9: Commit and push**

Commit with: `feat(content): add public guide pages`

Push: `git push origin main`
