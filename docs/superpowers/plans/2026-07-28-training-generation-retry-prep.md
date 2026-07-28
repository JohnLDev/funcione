# Training Generation Retry And Prep UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make monthly workout preparation resilient to transient model failures and give users an engaging 3-minute preparation experience.

**Architecture:** Keep the current durable job architecture. Add job requeue and attempt-log repository methods, backed by Supabase RPC/table changes and in-memory parity for tests. Expose retry counters to the frontend and replace pending loading with an estimated preparation progress component.

**Tech Stack:** TypeScript, Fastify, Supabase Postgres/RPC, React, Vite, Playwright, Node test runner.

## Global Constraints

- Use TDD: write failing tests before production code.
- Do not expose raw provider/model errors to the frontend.
- Use "preparando/preparo" for workout wait states, not "gerando/geracao".
- Keep retry automatic inside the existing job/reservation flow.
- Keep the frontend progress estimated over 180000ms and visually alive after that.

---

### Task 1: Backend Retry Contract

**Files:**
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-generation-job-repository.ts`
- Modify: `apps/backend/src/modules/training/infra/in-memory-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.test.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.ts`

**Interfaces:**
- Produces: `retryGenerationJob(generationId, { errorMessage, retryAt })`.
- Consumes: existing `attemptCount` and `maxAttempts` on `MonthlyTrainingPlanGeneration`.

- [x] Add a failing service test where first generation result has only failed attempts, `attemptCount` is below `maxAttempts`, and the job returns to `queued` without releasing the reservation.
- [x] Run the focused backend test and verify it fails because `retryGenerationJob`/retry behavior does not exist.
- [x] Add the repository type and in-memory implementation.
- [x] Update `processNextMonthlyTrainingPlanGenerationJob` to requeue retryable generation failures.
- [x] Run the focused backend test and verify it passes.

### Task 2: Attempt Observability

**Files:**
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-generation-job-repository.ts`
- Modify: `apps/backend/src/modules/training/infra/in-memory-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.test.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.ts`
- Add: `supabase/migrations/20260728120000_add_training_generation_attempt_logs.sql`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.test.ts`
- Modify: `apps/backend/src/modules/training/infra/training-plan-migration.test.ts`

**Interfaces:**
- Produces: `recordGenerationAttemptLog(input)` accepting generation id, attempt number, provider, model, role, status, duration, error and timestamps.
- Consumes: `GenerateTrainingPlanResult.attempts`.

- [x] Add failing tests that expect failed model attempts to be recorded.
- [x] Add failing migration tests for table, RLS, grants and indexes.
- [x] Implement the in-memory recorder and service call.
- [x] Add the Supabase migration and repository method.
- [x] Run focused backend tests and verify they pass.

### Task 3: Public Generation Retry Counters

**Files:**
- Modify: `apps/backend/src/modules/training/http/training-routes.ts`
- Modify: `apps/backend/src/modules/training/http/training-json-schemas.ts`
- Modify: `apps/backend/src/modules/training/http/training-routes.test.ts`
- Modify: `apps/frontend/src/training/training-plan.ts`
- Modify: `apps/frontend/src/training/mock-training-plan-gateway.ts`

**Interfaces:**
- Produces public fields `attemptCount` and `maxAttempts`.
- Consumes existing backend generation domain object.

- [x] Add a failing API test that serialized generation payload includes retry counters.
- [x] Update serializer and JSON schema.
- [x] Update frontend type and mock gateway defaults.
- [x] Run focused backend and frontend typecheck/tests.

### Task 4: Preparation Progress UX

**Files:**
- Add: `apps/frontend/src/components/training-preparation-progress.tsx`
- Modify: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/src/index.css`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Produces: `<TrainingPreparationProgress generation={generation} />`.
- Consumes: `MonthlyTrainingPlanGeneration.createdAt`, `updatedAt`, `attemptCount`, `maxAttempts`.

- [x] Add a failing E2E assertion for pending preparation copy and progressbar.
- [x] Add a failing unit/export test for estimated progress math if a suitable existing frontend test file exists.
- [x] Implement preparation progress with 180000ms estimate, animated bouncing dot, and accessible progressbar.
- [x] Replace pending `AppLoading` and inline wizard feedback copy to avoid "gerando/geracao" in workout wait states.
- [x] Run frontend E2E and typecheck.

### Task 5: Full Verification

**Files:**
- Verify all touched files.

- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Run `npm run test:e2e`.
- [x] Run `npm run build`.
- [x] Review `git diff` for accidental secret/log output and copy regressions.
