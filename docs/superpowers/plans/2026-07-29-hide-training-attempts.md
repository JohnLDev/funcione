# Hide Training Attempts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep workout preparation simple for users by hiding retry attempt counts from the pending preparation UI.

**Architecture:** Preserve backend retry counters and observability for diagnostics. Remove only the visible attempt text from the frontend preparation component and translations, then cover it with E2E assertions.

**Tech Stack:** React, Vite, i18next, Playwright.

## Global Constraints

- Do not remove `attemptCount` or `maxAttempts` from the API contract.
- Do not expose retry/attempt wording in the workout preparation UI.
- Keep "preparando/preparo" copy for workout wait states.
- Use TDD: failing E2E before production code.

---

### Task 1: Hide Attempt Counts From Preparation UI

**Files:**
- Modify: `apps/frontend/e2e/training-plan.spec.ts`
- Modify: `apps/frontend/src/components/training-preparation-progress.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: `MonthlyTrainingPlanGeneration.createdAt`.
- Produces: a pending preparation UI with timer/progress only, no visible attempt count.

- [x] Add E2E assertions that pending preparation states do not show `Tentativa X de Y` or `Attempt X of Y`.
- [x] Run the focused E2E and verify it fails because the current UI still shows the attempt count.
- [x] Remove `displayedAttempt` and the visible attempt `<span>` from `TrainingPreparationProgress`.
- [x] Remove the unused `training.preparationProgress.attempt` translation keys.
- [x] Run focused E2E and verify it passes.

### Task 2: Verification

**Files:**
- Verify all touched files.

- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Review `git diff --check`.
