# Frontend Theme Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o frontend para React e implementar a fundacao mobile-first de tema, shadcn-style components, i18n e E2E do app Funcione by MileX.

**Architecture:** `apps/frontend` passa a ser um app Vite React TypeScript. Tailwind CSS v4 consome tokens CSS definidos em `src/index.css`, o tema e controlado por `ThemeProvider`, textos passam por `react-i18next`, e Playwright valida o fluxo principal em desktop e mobile.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui conventions, lucide-react, i18next, react-i18next, Playwright.

---

### Task 1: Frontend Dependencies and Config

**Files:**
- Modify: `package.json`
- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/tsconfig.json`
- Modify: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/components.json`
- Create: `apps/frontend/playwright.config.ts`

- [ ] **Step 1: Add root E2E script**

Root `package.json` must include:

```json
{
  "scripts": {
    "test:e2e": "npm run test:e2e --workspace @langchain-training/frontend"
  }
}
```

- [ ] **Step 2: Add frontend dependencies**

`apps/frontend/package.json` must include React, Tailwind, i18n, shadcn utilities and Playwright:

```json
{
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "i18next": "^25.7.2",
    "lucide-react": "^0.561.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-i18next": "^16.5.0",
    "tailwind-merge": "^3.4.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "@tailwindcss/vite": "^4.1.18",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.2",
    "tailwindcss": "^4.1.18"
  }
}
```

- [ ] **Step 3: Configure Vite plugins**

`apps/frontend/vite.config.ts` must use React and Tailwind plugins while preserving the `/api` proxy.

- [ ] **Step 4: Configure Playwright**

`apps/frontend/playwright.config.ts` must start Vite with `webServer`, use `baseURL: http://127.0.0.1:5173`, and define desktop Chromium plus mobile Chrome projects.

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: lockfile updates successfully.

### Task 2: E2E Tests First

**Files:**
- Create: `apps/frontend/e2e/app-shell.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Test must assert:

```ts
await expect(page.getByRole('heading', { name: 'Funcione' })).toBeVisible();
await expect(page.getByText('by MileX')).toBeVisible();
await page.getByRole('button', { name: /tema/i }).click();
await expect(page.locator('html')).toHaveClass(/dark|light/);
await page.getByRole('button', { name: /language|idioma/i }).click();
await expect(page.getByRole('heading', { name: 'Funcione' })).toBeVisible();
```

- [ ] **Step 2: Run E2E and verify RED**

Run: `npm run test:e2e --workspace @langchain-training/frontend`

Expected: fail because the current vanilla frontend does not expose the React/i18n/theme UI.

### Task 3: React, i18n, Theme, and UI Foundation

**Files:**
- Delete: `apps/frontend/src/style.css`
- Create: `apps/frontend/src/index.css`
- Create: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/main.ts`
- Create: `apps/frontend/src/lib/utils.ts`
- Create: `apps/frontend/src/i18n/index.ts`
- Create: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Create: `apps/frontend/src/i18n/locales/en-US/common.json`
- Create: `apps/frontend/src/theme/theme-provider.tsx`
- Create: `apps/frontend/src/theme/use-theme.ts`
- Create: `apps/frontend/src/components/theme-toggle.tsx`
- Create: `apps/frontend/src/components/language-toggle.tsx`
- Create: `apps/frontend/src/components/app-shell.tsx`
- Create: `apps/frontend/src/components/ui/button.tsx`
- Create: `apps/frontend/src/components/ui/card.tsx`
- Create: `apps/frontend/src/components/ui/badge.tsx`
- Create: `apps/frontend/src/components/ui/progress.tsx`

- [ ] **Step 1: Implement i18n resources**

Portuguese resources must include visible app-shell strings such as `brand.name`, `brand.byline`, `dashboard.title`, `actions.startWorkout`, and language/theme labels. English resources must provide equivalent keys.

- [ ] **Step 2: Implement theme provider**

`ThemeProvider` must support `system`, `light`, and `dark`, persist the choice in `localStorage`, and apply `.light` or `.dark` on `document.documentElement`.

- [ ] **Step 3: Implement shadcn-style utilities and components**

Create `cn()` in `src/lib/utils.ts` using `clsx` and `tailwind-merge`, then implement `Button`, `Card`, `Badge`, and `Progress` with Tailwind classes and `class-variance-authority` where useful.

- [ ] **Step 4: Implement mobile-first app shell**

`App.tsx` must render `ThemeProvider`, `I18nextProvider` integration through imported `i18n`, and `AppShell`. `AppShell` must show the Funcione by MileX brand, training summary, compact metric cards, theme toggle, language toggle, and bottom navigation.

- [ ] **Step 5: Implement Tailwind/shadcn tokens**

`src/index.css` must import Tailwind, define semantic tokens for light and `.dark`, include `@theme inline`, and apply base background/text styles.

- [ ] **Step 6: Run E2E and verify GREEN**

Run: `npm run test:e2e --workspace @langchain-training/frontend`

Expected: pass in desktop and mobile projects.

### Task 4: Workspace Verification

**Files:**
- Review: `apps/frontend/**`
- Review: `package-lock.json`

- [ ] **Step 1: Run root typecheck**

Run: `npm run typecheck`

Expected: backend and frontend typecheck pass.

- [ ] **Step 2: Run root tests**

Run: `npm test`

Expected: backend tests pass.

- [ ] **Step 3: Run root E2E**

Run: `npm run test:e2e`

Expected: frontend E2E passes in desktop and mobile projects.

- [ ] **Step 4: Run root build**

Run: `npm run build`

Expected: backend and frontend builds pass.

- [ ] **Step 5: Inspect status and diff**

Run: `git status --short` and `git diff --stat`

Expected: changes match the frontend foundation scope plus previously approved workspace changes.
