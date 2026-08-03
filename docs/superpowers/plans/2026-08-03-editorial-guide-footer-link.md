# Editorial Guide Footer Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add footer navigation links to the public editorial training guide.

**Architecture:** Reuse existing React Router `Link` components and existing footer styles. Add a localized `footer.trainingGuide` label and render the `/treino-personalizado` link in the authenticated app footer and public legal-document footer.

**Tech Stack:** React 19, React Router 7, Vite 7, i18next, Playwright.

## Global Constraints

- Use `rtk` for shell commands.
- Follow TDD: update E2E first, confirm failure, then implement.
- Preserve existing footer links to terms and privacy.
- Keep the guide route public at `/treino-personalizado`.
- Do not alter AdSense slot eligibility.

---

### Task 1: Footer Links

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Modify: `apps/frontend/src/components/legal-document-screen.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: `footer.trainingGuide` i18n key.
- Produces: Footer links with `href="/treino-personalizado"`.

- [x] **Step 1: Write failing E2E assertions**

Add assertions that:

- the authenticated dashboard footer contains a guide link to `/treino-personalizado`;
- clicking that footer link opens the editorial guide;
- the public legal page footer contains the same guide link.

- [x] **Step 2: Verify RED**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project desktop-chromium`

Expected: FAIL because the footer guide link is missing.

- [x] **Step 3: Implement footer link and translations**

Add `footer.trainingGuide` in both locales and render the link in app and legal footers.

- [x] **Step 4: Verify GREEN**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --project desktop-chromium`

Expected: PASS.

- [x] **Step 5: Final checks**

Run:

```bash
rtk npm run typecheck --workspace @langchain-training/frontend
rtk npm run build --workspace @langchain-training/frontend
```
