# Complete Profile Field Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir CPF, telefone e logout na tela `/complete-profile`.

**Architecture:** Concentrar mascara e normalizacao no `RegistrationProfileForm`, preservando o contrato de `RegistrationProfileInput` com digitos no submit. Passar o handler de logout existente de `AppRoutes` para `ProfileCompletionScreen`, evitando duplicar regra de sessao.

**Tech Stack:** React 19, React Router 7, i18next, Tailwind CSS 4, Playwright 1.58.2.

## Global Constraints

- Manter backend e contrato REST sem mudancas.
- Enviar CPF e telefone somente com digitos no payload final.
- Validar via E2E em viewport mobile e desktop.
- Usar mensagens e labels existentes em i18n quando possivel.

---

### Task 1: E2E Do Complete Profile

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes: rota `/complete-profile`, formulario com labels `CPF` e `Numero de telefone`, mock auth em `localStorage`.
- Produces: teste que prova mascara, normalizacao e logout.

- [x] **Step 1: Write the failing test**

```ts
test('masks complete profile CPF and phone and allows signing out before saving', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /continuar com google/i }).click();

  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.getByLabel(/cpf/i).fill('abc52998224725z');
  await expect(page.getByLabel(/cpf/i)).toHaveValue('529.982.247-25');
  await page.getByLabel(/telefone/i).fill('tel11988887777x');
  await expect(page.getByLabel(/telefone/i)).toHaveValue('(11) 98888-7777');
  await expect(page.getByText('+55')).toBeVisible();
  await expect(page.getByLabel(/brasil/i)).toBeVisible();

  await page.getByRole('button', { name: /^sair$/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "masks complete profile CPF"`

Expected: FAIL because CPF and phone values remain unmasked and no `Sair` button exists on `/complete-profile`.

- [x] **Step 3: Add saved payload assertions to the existing Google profile test**

```ts
expect(savedProfileValues[0]).toMatchObject({
  cpf: '52998224725',
  phoneNumber: '11988887777',
});
```

### Task 2: Form Masking And Submit Normalization

**Files:**
- Modify: `apps/frontend/src/components/registration-profile-form.tsx`

**Interfaces:**
- Consumes: `RegistrationProfileInput` shape.
- Produces: `formatCpfInput`, `formatBrazilianPhoneInput`, `onlyDigits`, and submit values with CPF/telefone digits.

- [x] **Step 1: Implement minimal format helpers in the form file**

```ts
function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpfInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatBrazilianPhoneInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}
```

- [x] **Step 2: Use formatters in `updateValue` calls for CPF and phone**

`onChange` for CPF uses `formatCpfInput(event.target.value)`.

`onChange` for phone uses `formatBrazilianPhoneInput(event.target.value)`.

- [x] **Step 3: Normalize submit payload**

`handleSubmit` sends `cpf: onlyDigits(values.cpf)` and `phoneNumber: onlyDigits(values.phoneNumber)`.

- [x] **Step 4: Add phone prefix UI**

Wrap phone input in a flex container with a decorative Brazil flag, accessible text `Brasil +55`, and the existing input.

- [x] **Step 5: Run focused E2E**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "masks complete profile CPF"`

Expected: FAIL only if logout is still missing; field assertions pass.

### Task 3: Complete Profile Logout

**Files:**
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/profile-completion-screen.tsx`

**Interfaces:**
- Consumes: `handleSignOut` from `AppRoutes`.
- Produces: `ProfileCompletionScreen` prop `onSignOut: () => void`.

- [x] **Step 1: Pass logout handler from route**

`<ProfileCompletionScreen onSignOut={handleSignOut} />`

- [x] **Step 2: Render outline logout button in the complete profile header**

Use `LogOut` from `lucide-react`, `Button` with `variant="outline"` and label `t('auth.signOut')`.

- [x] **Step 3: Run focused E2E**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "masks complete profile CPF"`

Expected: PASS.

### Task 4: Verification

**Files:**
- No production files.

**Interfaces:**
- Consumes: complete implementation.
- Produces: verification evidence.

- [x] **Step 1: Typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 2: Backend tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 3: Focused E2E**

Run: `npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "complete profile|missing registration data after a new Google login"`

Expected: PASS on desktop and mobile projects.

- [x] **Step 4: Build**

Run: `npm run build`

Expected: PASS.
