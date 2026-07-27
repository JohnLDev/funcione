# Binary Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o estado intermediario `system` do botao de tema e manter alternancia direta entre claro e escuro.

**Architecture:** O estado de tema do frontend passa a aceitar apenas `light` e `dark`. A inicializacao do provider normaliza preferencias legadas para o tema padrao, e o componente do menu continua consumindo a mesma API `cycleTheme`.

**Tech Stack:** React, TypeScript, react-i18next, Playwright E2E.

## Global Constraints

- Shell commands must run with `rtk`.
- Production code changes must start with a failing automated test.
- Keep the change scoped to frontend theme behavior and related docs/tests.
- Do not revert unrelated workspace changes.

---

### Task 1: E2E Regression

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes: existing settings menu and theme button roles.
- Produces: regression coverage for the binary theme contract.

- [x] Add assertions that the settings theme button does not contain `sistema` or `system`.
- [x] Verify the focused E2E test fails before production changes.

### Task 2: Binary Theme Provider

**Files:**
- Modify: `apps/frontend/src/theme/theme-provider.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: `useTheme()` and `ThemeToggle` existing API.
- Produces: `Theme` limited to `light | dark` and `cycleTheme()` alternating directly.

- [x] Change the theme type and storage normalization to remove `system`.
- [x] Set the app default theme to `dark`.
- [x] Remove unused localized `theme.system` labels.

### Task 3: Verification

**Files:**
- Test: `apps/frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes: updated binary theme behavior.
- Produces: fresh evidence for completion.

- [x] Run the focused E2E test and confirm it passes.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Run `npm run test:e2e`.
- [x] Run `npm run build`.
- [x] Check the browser menu no longer exposes `sistema`.
