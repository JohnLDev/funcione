# Training Plan Cache Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-minute frontend cache for active training plan state and require explicit user confirmation before monthly plan generation.

**Architecture:** Keep caching in `TrainingPlanProvider`, keyed by authenticated user id and persisted in `localStorage` with a 5-minute TTL. Keep manual retry as a forced reload that bypasses cache. Add a mobile-first confirmation dialog in `TrainingPlanWizard` before calling `createMonthlyPlan`, with localized copy warning that regeneration is blocked for 30 days.

**Tech Stack:** React, Vite, TypeScript, i18next, Playwright E2E, localStorage.

## Global Constraints

- Desenvolvimento deve começar por testes automatizados.
- Funcionalidades de frontend devem ter testes E2E cobrindo comportamento principal e estados críticos.
- Layout deve continuar mobile first e responsivo.
- Como não há mudança de rota HTTP, OpenAPI não será alterado.
- Preserve alterações existentes no workspace.

---

### Task 1: E2E Coverage For Cache And Confirmation

**Files:**
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Consumes: existing `signUp(page, email)` and `setTrainingScenario(page, scenario)` helpers.
- Produces: tests requiring confirmation dialog and proving cached plan state suppresses a stale reload error for five minutes.

- [x] **Step 1: Write failing E2E tests**

Add a helper that clicks the final generate button and confirms the dialog. Update create-plan tests to assert the dialog copy includes 30 days before generation proceeds. Add a cache test that loads `/training`, stores the initial active-plan state in frontend cache, switches the mock gateway to return a load error, navigates away and back, and expects the wizard to render without showing the mocked error.

- [x] **Step 2: Run focused E2E to verify RED**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "monthly training plan route"`

Expected: FAIL because no confirmation dialog exists and no frontend training-plan cache key is written.

### Task 2: Training Plan Cache

**Files:**
- Create: `apps/frontend/src/training/training-plan-cache.ts`
- Modify: `apps/frontend/src/training/training-plan-provider.tsx`
- Modify: `apps/frontend/src/components/training-screen.tsx`

**Interfaces:**
- Produces: `readCachedTrainingPlanState(userId)`, `writeCachedTrainingPlanState(userId, state)`, `clearCachedTrainingPlanState(userId)`, and `trainingPlanCacheTtlMs`.
- Updates provider `reload(options?: { force?: boolean }): Promise<void>`.

- [x] **Step 1: Implement cache helper**

Create a focused module that stores `{ cachedAt, state }` under `funcione-training-plan-cache:<userId>`, validates TTL using `Date.now()`, and ignores invalid JSON or expired entries.

- [x] **Step 2: Wire cache into provider**

On automatic reload, serve fresh cached state without hitting the gateway. On successful gateway load or successful plan creation, write the cache. On missing session, clear in-memory state only.

- [x] **Step 3: Force manual retries**

Change retry buttons to `reload({ force: true })` so user-initiated recovery bypasses cache.

### Task 3: Generation Confirmation Dialog

**Files:**
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: existing `MonthlyTrainingPlanRequest`, `createMonthlyPlan`, `isGenerating`, and `training.monthlyLimitNotice`.
- Produces: accessible `role="alertdialog"` confirmation with cancel and confirm actions.

- [x] **Step 1: Add localized strings**

Add `training.confirmGeneration.title`, `message`, `cancel`, and `confirm` in Portuguese and English.

- [x] **Step 2: Add pending request state**

When the review button is clicked, validate the form and store the payload instead of immediately creating the plan.

- [x] **Step 3: Confirm generation**

The confirm button calls `createMonthlyPlan(pendingPayload)`, clears the dialog on success, keeps the existing generation feedback visible while request is running, and preserves retry behavior on errors.

### Task 4: Verification

**Files:**
- No production files expected beyond Tasks 1-3.

- [x] **Step 1: Run focused E2E**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "monthly training plan route"`

Expected: PASS.

- [x] **Step 2: Run full checks**

Run: `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, and `git diff --check`.

Expected: all commands exit 0.
