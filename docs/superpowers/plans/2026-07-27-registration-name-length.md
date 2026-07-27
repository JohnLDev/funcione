# Registration Name Length Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limitar nome e sobrenome do cadastro a 80 caracteres por campo.

**Architecture:** Aplicar limite no componente compartilhado `RegistrationProfileForm` para feedback imediato e repetir a regra no domínio backend para proteger chamadas diretas de API. Atualizar OpenAPI para manter o contrato documentado.

**Tech Stack:** React 19, Fastify 5, Zod 4, Playwright 1.58.2, Node test runner.

## Global Constraints

- Usar 80 caracteres como limite de `firstName` e `lastName`.
- Manter os mesmos labels e mensagens de erro existentes.
- Preservar os fluxos `/signup` e `/complete-profile`.
- Atualizar OpenAPI junto com qualquer alteração de contrato REST.

---

### Task 1: Backend Contract

**Files:**
- Modify: `apps/backend/src/modules/auth/domain/user-profile.ts`
- Modify: `apps/backend/src/modules/auth/http/auth-json-schemas.ts`
- Modify: `apps/backend/src/modules/auth/http/auth-routes.test.ts`

**Interfaces:**
- Consumes: `CompleteUserProfileInputSchema`.
- Produces: limite `max(80)` para `firstName` e `lastName`, OpenAPI com `maxLength: 80`.

- [x] **Step 1: Write failing route tests**

Add a case that sends `firstName: 'A'.repeat(81)` and expects `400`.

Add a case that sends `lastName: 'B'.repeat(81)` and expects `400`.

- [x] **Step 2: Write failing OpenAPI assertions**

Assert:

```ts
assert.equal(bodySchema.properties.firstName.maxLength, 80);
assert.equal(bodySchema.properties.lastName.maxLength, 80);
```

- [x] **Step 3: Run backend auth route tests red**

Run: `npm test --workspace @langchain-training/backend -- auth-routes.test.js`

Expected: FAIL because the schema does not reject 81-character names and OpenAPI lacks `maxLength`.

- [x] **Step 4: Implement backend limit**

Add `max(80)` to `firstName` and `lastName`.

Add `maxLength: 80` to both OpenAPI properties.

- [x] **Step 5: Run backend auth route tests green**

Run: `npm test --workspace @langchain-training/backend -- auth-routes.test.js`

Expected: PASS.

### Task 2: Frontend Input Limit

**Files:**
- Modify: `apps/frontend/src/components/registration-profile-form.tsx`
- Modify: `apps/frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes: labels `Nome` and `Sobrenome`.
- Produces: `maxLength={80}` on both inputs and E2E coverage.

- [x] **Step 1: Write failing E2E assertion**

In the Google complete profile test, fill `Nome` and `Sobrenome` with 81-character values and expect the fields to contain 80 characters.

- [x] **Step 2: Run focused E2E red**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "requires missing registration data after a new Google login"`

Expected: FAIL because the inputs currently accept all 81 characters.

- [x] **Step 3: Implement frontend limit**

Add `maxLength={80}` to `firstName` and `lastName` inputs.

- [x] **Step 4: Run focused E2E green**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "requires missing registration data after a new Google login"`

Expected: PASS on desktop and mobile.

### Task 3: Final Verification

**Files:**
- No production files.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verification evidence.

- [x] **Step 1: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 2: Backend tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 3: E2E**

Run: `npm run test:e2e`

Expected: PASS except existing project-specific skipped tests.

- [x] **Step 4: Build**

Run: `npm run build`

Expected: PASS.
