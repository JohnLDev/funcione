# Mobile Training Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent workout session card titles from collapsing into a narrow vertical column on mobile.

**Architecture:** Keep the existing training card content and actions. Change only the session card header layout so mobile stacks title/metadata above actions, while desktop keeps the compact title/actions row.

**Tech Stack:** React, Tailwind utility classes, Playwright E2E.

## Global Constraints

- Work on branch `codex/mobile-training-card-layout`.
- Do not change training generation, workout execution, session storage, or modal behavior.
- Preserve current desktop layout intent.
- Mobile session titles must receive the full card width before action buttons render.
- Buttons must stay comfortable to tap and must not force title text into a narrow column.
- Use TDD: add an E2E reproduction and verify it fails before changing production code.

---

### Task 1: Add Mobile Layout Regression Test

**Files:**
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Consumes: existing `signUp` and `completeStandardTrainingWizard` helpers.
- Produces: a Playwright test that mutates the mock active plan to use a long workout focus title, reloads `/training` in mobile viewport, and asserts the title has usable width and does not become vertically stacked.

- [x] **Step 1: Write the failing test**

Add this helper near the existing training helpers:

```ts
async function replaceFirstWorkoutFocus(page: Page, focus: string) {
  await page.evaluate((nextFocus) => {
    const session = JSON.parse(
      window.localStorage.getItem('funcione-mock-session') ?? '{}',
    ) as { accessToken?: string; user?: { id?: string } };
    const accessToken = session.accessToken;
    const userId = session.user?.id;

    if (!accessToken || !userId) {
      throw new Error('Mock session not found.');
    }

    const plans = JSON.parse(
      window.localStorage.getItem('funcione-mock-training-plans') ?? '{}',
    ) as Record<string, { result?: { treinos?: { foco?: string }[] } }>;
    const plan = plans[accessToken];

    if (!plan?.result?.treinos?.[0]) {
      throw new Error('Mock training plan not found.');
    }

    plan.result.treinos[0].foco = nextFocus;
    window.localStorage.setItem(
      'funcione-mock-training-plans',
      JSON.stringify(plans),
    );
    window.localStorage.removeItem(`funcione-training-plan-cache:${userId}`);
  }, focus);
}
```

Add this test inside `monthly training plan route`:

```ts
test('keeps long workout card titles readable on mobile', async ({ page }) => {
  await page.setViewportSize({ height: 852, width: 393 });
  const email = 'mobile-card-layout@funcione.app';

  await signUp(page, email);
  await page.getByRole('link', { name: /^treino$/i }).click();
  await completeStandardTrainingWizard(page, /volei/i);

  const longFocus =
    'Pliometria explosiva, agilidade lateral e forca de membros superiores';
  await replaceFirstWorkoutFocus(page, longFocus);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill('StrongPass123!');
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: /^treino$/i }).click();
  await expect(page.getByRole('heading', { name: /plano ativo/i })).toBeVisible();

  const title = page.getByRole('heading', { name: longFocus });
  await expect(title).toBeVisible();

  const layout = await title.evaluate((element) => {
    const titleBox = element.getBoundingClientRect();
    const metricsBox = element.nextElementSibling?.getBoundingClientRect();

    return {
      metricsTop: metricsBox?.top ?? 0,
      titleHeight: titleBox.height,
      titleTop: titleBox.top,
      titleWidth: titleBox.width,
    };
  });

  expect(layout.titleWidth).toBeGreaterThan(250);
  expect(layout.titleHeight).toBeLessThan(140);
  expect(layout.metricsTop).toBeGreaterThan(layout.titleTop);
});
```

- [x] **Step 2: Run the focused E2E test to verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "keeps long workout card titles readable on mobile" --project mobile-chrome
```

Expected: FAIL because the title width is too small or the title height is too tall on mobile.

### Task 2: Fix Session Card Header Layout

**Files:**
- Modify: `apps/frontend/src/components/training-active-plan.tsx`

**Interfaces:**
- Consumes: existing session card data and buttons.
- Produces: mobile layout where the title/metadata block is full width above action buttons; `sm` and larger layouts can keep title and actions in one row.

- [x] **Step 1: Stack session header sections on mobile**

Change the session card header wrapper from a single mobile row:

```tsx
<div className="flex items-start justify-between gap-3">
```

to a mobile-first stacked layout:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
```

- [x] **Step 2: Let action buttons use full mobile width**

Change the actions wrapper from:

```tsx
<div className="flex shrink-0 flex-wrap justify-end gap-2">
```

to:

```tsx
<div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
```

Add `className="w-full justify-center sm:w-auto"` to both session action buttons.

- [x] **Step 3: Run the focused E2E test to verify GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "keeps long workout card titles readable on mobile" --project mobile-chrome
```

Expected: PASS.

### Task 3: Final Verification

**Files:**
- All files changed by Tasks 1-2.

- [x] **Step 1: Run focused training E2E**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --project mobile-chrome
```

Expected: PASS.

- [x] **Step 2: Run project checks**

Run:

```bash
npm run typecheck
npm run build
git diff --check
```

Expected: all pass.

- [x] **Step 3: Clean build artifacts**

If `apps/frontend/.wrangler/` is created by the build, remove it before staging.

- [x] **Step 4: Commit locally**

Run:

```bash
git add apps/frontend/e2e/training-plan.spec.ts apps/frontend/src/components/training-active-plan.tsx docs/superpowers/plans/2026-07-30-mobile-training-card-layout.md
git commit -m "fix(training): improve mobile card layout"
```
