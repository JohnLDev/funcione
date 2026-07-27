# Frontend Error Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize frontend-visible error mapping/translation and present expected errors through a sport-themed animated toast.

**Architecture:** Add a frontend error normalization module, a global toast provider, and route providers through mapped error keys instead of raw messages. Keep contextual retry banners where useful, but feed them with translated mapped copy. Update `AGENTS.md` with the permanent error-handling directive.

**Tech Stack:** React, TypeScript, react-i18next, Tailwind CSS, Playwright.

## Global Constraints

- Use `rtk proxy` for shell commands in this workspace.
- Start behavior changes with automated tests.
- Do not render raw provider/API error messages directly in UI.
- Every frontend-visible expected error must have an i18n key in `pt-BR` and `en-US`.
- Keep toast UI mobile-first, responsive, and free of horizontal overflow.
- Preserve unrelated workspace changes.

---

### Task 1: Error Feedback Contract And E2E

**Files:**
- Modify: `AGENTS.md`
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Produces: E2E expectations for translated toast feedback and absence of raw messages.

- [x] Add `AGENTS.md` section requiring all frontend-exposed errors to be mapped and translated.
- [x] Add an E2E test for invalid credentials that expects a toast containing `E-mail ou senha invalidos.` and expects `Invalid login credentials` to be absent.
- [x] Add an E2E test for training request failure that expects a toast containing `Nao foi possivel atualizar o plano de treino.` and preserves the retry button.
- [x] Add mobile assertions that the toast is visible and does not create horizontal overflow.
- [x] Run targeted E2E and verify it fails because the toast/translation layer does not exist yet.

### Task 2: Error Normalization And Toast Shell

**Files:**
- Create: `apps/frontend/src/errors/app-error.ts`
- Create: `apps/frontend/src/toast/app-toast-provider.tsx`
- Create: `apps/frontend/src/toast/use-app-toast.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/index.css`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Produces: `normalizeAppError(input): NormalizedAppError`
- Produces: `translateAppError(error, t): string`
- Produces: `useAppToast().showToast({ message, severity, source })`

- [x] Implement error code/message normalization with safe fallbacks.
- [x] Add i18n keys for auth, registration, training, network, and common expected errors.
- [x] Implement `AppToastProvider` with animated sport-ball visual, close button, auto-dismiss, and accessible live region.
- [x] Wrap the app with `AppToastProvider`.
- [x] Run targeted E2E and verify auth toast expectations pass.

### Task 3: Wire Auth And Training Errors

**Files:**
- Modify: `apps/frontend/src/auth/auth-provider.tsx`
- Modify: `apps/frontend/src/auth/supabase-auth-gateway.ts`
- Modify: `apps/frontend/src/auth/types.ts`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Modify: `apps/frontend/src/components/profile-completion-screen.tsx`
- Modify: `apps/frontend/src/training/training-plan-provider.tsx`
- Modify: `apps/frontend/src/components/dashboard-screen.tsx`
- Modify: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/training/mock-training-plan-gateway.ts`

**Interfaces:**
- Consumes: `normalizeAppError`, `translateAppError`, `useAppToast`
- Produces: UI that shows only mapped translated errors.

- [x] Return stable auth error codes from auth gateways where possible.
- [x] Normalize auth provider messages and dispatch toast on failed auth/profile actions.
- [x] Remove raw auth message rendering from auth screens.
- [x] Normalize training errors and dispatch toast on load/create/poll failures.
- [x] Keep training retry banners but render mapped translated text.
- [x] Update mock training gateway scenarios to provide stable codes for expected failures.
- [x] Run targeted E2E and verify training toast expectations pass.

### Task 4: Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-27-frontend-error-feedback.md`

**Interfaces:**
- Produces: verified implementation evidence.

- [x] Run `npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium apps/frontend/e2e/app-shell.spec.ts apps/frontend/e2e/training-plan.spec.ts`.
- [x] Run `npm run test:e2e --workspace @langchain-training/frontend`.
- [x] Run `npm run typecheck --workspace @langchain-training/frontend`.
- [x] Run `npm run build --workspace @langchain-training/frontend`.
- [x] Run `git diff --check`.
