# Google-Only Auth UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide email/password authentication from the frontend UI, redirect `/signup` to `/login`, and keep password auth available only as internal test/mock support.

**Architecture:** Add a small frontend auth option with `passwordAuthEnabled: false`. Use it in routes and the auth screen so production UI is Google-only, while keeping existing password gateway/provider methods untouched. Update E2E helpers to use the mock Google gateway plus `/complete-profile`, avoiding real Google OAuth.

**Tech Stack:** React, React Router, Vite, Playwright E2E, Supabase auth gateway abstractions.

## Global Constraints

- Work on branch `codex/google-only-auth-ui`.
- `/login` must show only the Google auth button when password auth is disabled.
- `/signup` must redirect to `/login` when password auth is disabled.
- Do not remove `signInWithPassword` or `signUpWithPassword` from auth gateways/providers in this change.
- E2E tests must not call real Google OAuth; they must use `VITE_AUTH_MODE=mock` and the mock Google gateway.
- The complete-profile flow remains the place where Google users finish the internal Funcione profile.
- Backend and Supabase schema stay unchanged.

---

### Task 1: Add RED Coverage For Google-Only UI

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`

**Interfaces:**
- Consumes: existing `/login`, `/signup`, and mock auth mode.
- Produces: E2E regression coverage for visible auth methods and signup redirect.

- [x] **Step 1: Write failing auth UI test**

Add this test in `Funcione app shell`:

```ts
test('uses Google as the only visible auth method', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: /entrar no funcione/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /continuar com google/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/e-mail/i)).toHaveCount(0);
  await expect(page.getByLabel(/senha/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^entrar$/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /criar conta/i })).toHaveCount(0);

  await page.goto('/signup');
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('button', { name: /continuar com google/i }),
  ).toBeVisible();
});
```

- [x] **Step 2: Run focused RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "uses Google as the only visible auth method" --project mobile-chrome
```

Expected: FAIL because `/login` still exposes email/password and `/signup` still renders signup.

### Task 2: Implement Google-Only UI Switch

**Files:**
- Create: `apps/frontend/src/auth/auth-options.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/auth-screen.tsx`

**Interfaces:**
- Produces: `authOptions.passwordAuthEnabled: false`.
- Consumes: existing `Navigate`, `AuthScreen`, and auth provider methods.

- [x] **Step 1: Add auth options**

Create:

```ts
export const authOptions = {
  passwordAuthEnabled: false,
} as const;
```

- [x] **Step 2: Redirect signup when password is disabled**

Import `authOptions` in `App.tsx` and change `/signup` route so anonymous users get:

```tsx
authOptions.passwordAuthEnabled ? (
  <AuthScreen mode="signup" />
) : (
  <Navigate replace to="/login" />
)
```

Authenticated redirects stay unchanged.

- [x] **Step 3: Hide password controls on login**

Import `authOptions` in `AuthScreen`. Render the email/password form, signup link, and divider only when `authOptions.passwordAuthEnabled` is `true`. Always render the Google button for signin.

- [x] **Step 4: Run focused GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts --grep "uses Google as the only visible auth method" --project mobile-chrome
```

Expected: PASS.

### Task 3: Migrate E2E Auth Setup To Mock Google

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Consumes: mock Google login button and `/complete-profile`.
- Produces: helpers that sign in through mock Google and complete the internal profile without password fields.

- [x] **Step 1: Add app-shell helper**

In `app-shell.spec.ts`, add:

```ts
async function completeGoogleRegistration(page: Page, profile = {
  firstName: 'Joao',
  lastName: 'Silva',
  cpf: '52998224725',
  birthDate: '1994-08-20',
  phoneNumber: '11999999999',
}) {
  await page.goto('/login');
  await page.getByRole('button', { name: /continuar com google/i }).click();
  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.getByLabel(/^nome$/i).fill(profile.firstName);
  await page.getByLabel(/sobrenome/i).fill(profile.lastName);
  await page.getByLabel(/cpf/i).fill(profile.cpf);
  await page.getByLabel(/data de nascimento/i).fill(profile.birthDate);
  await page.getByLabel(/telefone/i).fill(profile.phoneNumber);
  await page.getByRole('button', { name: /salvar cadastro/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
```

Then update app-shell tests that use `/signup` or password sign-in to use this helper or the Google button.

- [x] **Step 2: Add training helper**

Replace the `signUp(page, email)` helper in `training-plan.spec.ts` with a mock-Google profile completion helper that keeps the same function name for call sites:

```ts
async function signUp(page: Page, email: string) {
  void email;
  await page.goto('/login');
  await page.getByRole('button', { name: /continuar com google/i }).click();
  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.locator('#complete-firstName').fill('Estado');
  await page.locator('#complete-lastName').fill('Treino');
  await page.locator('#complete-cpf').fill('52998224725');
  await page.locator('#complete-birthDate').fill('1996-07-20');
  await page.locator('#complete-phoneNumber').fill('11999999999');
  await page.getByRole('button', { name: /salvar cadastro/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
```

Add:

```ts
async function signInWithMockGoogle(page: Page) {
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: /continuar com google/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
```

Update direct `/signup` training tests to call `signUp(page, '<old-email>')`. Update reload/password login sections to call `signInWithMockGoogle(page)`.

- [x] **Step 3: Run auth/training E2E**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- app-shell.spec.ts training-plan.spec.ts --project mobile-chrome
```

Expected: PASS.

### Task 4: Update Auth Documentation

**Files:**
- Modify: `docs/authentication.md`

**Interfaces:**
- Consumes: existing authentication design.
- Produces: docs that describe Google as the only visible app auth method and password auth as hidden/internal.

- [x] **Step 1: Update docs**

Update these sections:

- decision list: Google is the only visible app login method;
- flow: password methods remain implemented but hidden by frontend option;
- frontend routes: `/login` Google-only, `/signup` redirects to `/login`;
- internal registration: Google users complete `/complete-profile`;
- references: keep password reference as implementation reference, not visible user flow.

- [x] **Step 2: Run docs diff check**

Run:

```bash
git diff --check
```

Expected: PASS.

### Task 5: Final Verification And Commit

**Files:**
- All files changed by Tasks 1-4.

- [x] **Step 1: Run final checks**

Run:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected: all pass.

- [x] **Step 2: Clean local build artifacts**

If `apps/frontend/.wrangler/` exists after build, remove it before staging.

- [x] **Step 3: Commit locally**

Run:

```bash
git add apps/frontend/src/auth/auth-options.ts apps/frontend/src/App.tsx apps/frontend/src/components/auth-screen.tsx apps/frontend/e2e/app-shell.spec.ts apps/frontend/e2e/training-plan.spec.ts docs/authentication.md docs/superpowers/plans/2026-07-30-google-only-auth-ui.md
git commit -m "feat(auth): make frontend Google-only"
```
