# Dashboard Shell Bottom Overflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o scroll vertical desnecessario causado pelo espaco final do dashboard desktop.

**Architecture:** Ajustar o calculo de `min-height` do shell desktop para descontar o padding vertical real do container externo. Proteger com E2E que compara `scrollHeight` e `clientHeight` no dashboard desktop.

**Tech Stack:** React 19, Tailwind CSS 4, Playwright 1.58.2.

## Global Constraints

- Nao alterar o conteudo nem a navegacao do dashboard.
- Preservar layout mobile com bottom navigation.
- Validar que o dashboard desktop nao cria overflow vertical quando o conteudo cabe na viewport.

---

### Task 1: E2E Red

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes: dashboard desktop autenticado.
- Produces: assercao de que `document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1`.

- [x] **Step 1: Add overflow assertion**

Add the assertion after the sidebar height check in `desktop dashboard shell uses only real navigation and state`.

- [x] **Step 2: Run focused E2E red**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "desktop dashboard shell uses only real navigation and state"`

Expected: FAIL with 16px overflow before the shell height fix.

### Task 2: Shell Height Fix

**Files:**
- Modify: `apps/frontend/src/components/app-shell.tsx`

**Interfaces:**
- Consumes: outer shell padding `pt-4 md:pb-8`.
- Produces: desktop `aside` and `main` min-height matching `100dvh - 3rem`.

- [x] **Step 1: Adjust desktop min-height**

Change `min-h-[calc(100dvh-2rem)]` on `aside` and `main` to include `md:min-h-[calc(100dvh-3rem)]`.

- [x] **Step 2: Run focused E2E green**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "desktop dashboard shell uses only real navigation and state"`

Expected: PASS.

### Task 3: Final Verification

**Files:**
- No production files.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verification evidence.

- [x] **Step 1: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 2: Focused E2E**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "desktop dashboard shell uses only real navigation and state"`

Expected: PASS.

- [x] **Step 3: Build**

Run: `npm run build`

Expected: PASS.
