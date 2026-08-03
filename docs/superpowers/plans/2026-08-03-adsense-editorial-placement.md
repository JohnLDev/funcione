# AdSense Editorial Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a public editorial content screen and restrict AdSense placements to content-rich screens.

**Architecture:** Add one public React route for editorial content. Keep the existing ads primitives, but render slots only from eligible pages and load the AdSense script from `AdSenseSlot` when a real slot is mounted. Preserve current public AdSense config, metatag, and `ads.txt`.

**Tech Stack:** React 19, React Router 7, Vite 7, i18next, Playwright.

## Global Constraints

- Use `rtk` for shell commands in this workspace.
- Follow TDD: write E2E tests first and verify the expected failure before production code.
- Do not show ads on login, signup, complete-profile, profile, legal, loading, pending generation, wizard, errors, modals, or active workout execution.
- Keep `VITE_ADS_ENABLED=true`, existing AdSense client ID, existing slot IDs, metatag, and `ads.txt`.
- Keep the frontend mobile-first and avoid horizontal overflow.
- Do not change backend contracts.

---

## Files

- Modify: `docs/superpowers/specs/2026-07-30-google-adsense-display-design.md`
- Modify: `apps/frontend/e2e/adsense-display.spec.ts`
- Modify: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/components/editorial-training-screen.tsx`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Modify: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/src/components/dashboard-screen.tsx`
- Modify: `apps/frontend/src/components/athlete-profile-screen.tsx`
- Modify: `apps/frontend/src/ads/ad-placements.tsx`
- Modify: `apps/frontend/src/ads/adsense-script.tsx`
- Modify: `apps/frontend/src/ads/adsense-slot.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

---

### Task 1: E2E Policy Coverage

**Interfaces:**

- Consumes: existing mock auth helpers and `funcione-mock-training-plan-scenarios`.
- Produces: failing tests for editorial public route and restricted app slots.

- [x] **Step 1: Update `apps/frontend/e2e/adsense-display.spec.ts` tests**

Add or update tests with these behaviors:

```ts
test('shows a public editorial training page with a compliant pre-footer ad', async ({ page }) => {
  await page.goto('/treino-personalizado');

  await expect(page.getByRole('heading', { name: /treino personalizado/i })).toBeVisible();
  await expect(page.getByText(/frequencia, duracao, local de treino e equipamentos/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /entrar|comecar/i })).toHaveAttribute('href', '/login');
  await expect(page.getByTestId('adsense-slot-pre-footer')).toBeVisible();
  await expect(page.locator('script[src*="pagead2.googlesyndication.com"]')).toHaveCount(0);
});

test('keeps ads out of pending generation and profile screens', async ({ page }) => {
  await completeGoogleRegistration(page);
  await page.evaluate(() => {
    const session = JSON.parse(window.localStorage.getItem('funcione-mock-session') ?? '{}');
    window.localStorage.setItem(
      'funcione-mock-training-plan-scenarios',
      JSON.stringify({ [session.accessToken]: { pending: true } }),
    );
  });
  await expireTrainingPlanCache(page);
  await page.getByRole('link', { name: /^treino$/i }).click();

  await expect(page.getByRole('heading', { name: /preparando seu treino/i })).toBeVisible();
  await expect(page.locator('[data-testid^="adsense-slot-"]')).toHaveCount(0);

  await page.getByRole('link', { name: /^perfil$/i }).click();
  await expect(page.getByRole('heading', { name: /perfil do atleta/i })).toBeVisible();
  await expect(page.locator('[data-testid^="adsense-slot-"]')).toHaveCount(0);
});
```

Update existing assertions that currently expect ads on pending generation, profile, or dashboard without active plan so they expect no ads.

- [x] **Step 2: Run the focused E2E and verify RED**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium`

Expected: FAIL because `/treino-personalizado` does not exist yet and the old placements still render in forbidden states.

---

### Task 2: Public Editorial Route

**Interfaces:**

- Produces: `EditorialTrainingScreen` route component.
- Consumes: `PreFooterAd`, `ProductLogo`, `SettingsMenu`, `Button`, `Card`, i18n keys under `editorialTraining`.

- [x] **Step 1: Add i18n copy**

Add `editorialTraining` keys to both locale files for title, subtitle, section headings, paragraphs, CTA, privacy/terms links, and metadata-like copy visible on the page.

- [x] **Step 2: Create `apps/frontend/src/components/editorial-training-screen.tsx`**

Implement a public page that:

- uses `ProductLogo` and `SettingsMenu`;
- has a content-first layout with original editorial copy;
- links to `/login`, `/terms`, and `/privacy`;
- renders `<PreFooterAd />` only after several content sections;
- stays responsive on mobile.

- [x] **Step 3: Register the route**

Modify `apps/frontend/src/App.tsx`:

```tsx
<Route
  element={<EditorialTrainingScreen />}
  path="/treino-personalizado"
/>
```

- [x] **Step 4: Run focused E2E**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium`

Expected: editorial route assertions pass; remaining failures, if any, point to old forbidden app placements.

---

### Task 3: Restrict App Slots

**Interfaces:**

- Consumes: `PreFooterAd`, `DesktopSidebarAd`, `state.activePlan`, `shouldSuppressAds`.
- Produces: no ad slots in pending generation, wizard, profile, or dashboard without active plan.

- [x] **Step 1: Remove forbidden imports and usage**

Remove:

- `TrainingPreparationAd` usage from `training-screen.tsx`;
- `DesktopSidebarAd` usage from `training-plan-wizard.tsx`;
- `PreFooterAd` usage from `athlete-profile-screen.tsx`.

- [x] **Step 2: Restrict dashboard ads**

In `dashboard-screen.tsx`, compute `const hasPublisherContent = Boolean(state?.activePlan);` and pass it as suppression:

```tsx
<DesktopSidebarAd suppress={!hasPublisherContent} />
<PreFooterAd suppress={!hasPublisherContent} />
```

- [x] **Step 3: Keep active plan ads only outside execution**

Leave `training-active-plan.tsx` ads suppressed by `shouldSuppressAds`.

- [x] **Step 4: Remove obsolete preparation placement**

Remove `TrainingPreparationAd` from `ad-placements.tsx`. Keep the `trainingPreparation` config for env compatibility unless type cleanup is done in the same task with passing tests.

- [x] **Step 5: Run focused E2E**

Run: `rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium`

Expected: PASS for desktop focused tests.

---

### Task 4: Load Script Only For Eligible Slots

**Interfaces:**

- Consumes: `ensureAdSenseScript` from `adsense-script.tsx`.
- Produces: `AdSenseSlot` loads the script only when a real eligible slot mounts.

- [x] **Step 1: Refactor script helper**

Modify `apps/frontend/src/ads/adsense-script.tsx` to export:

```ts
export function ensureAdSenseScript() {
  if (!adsConfig.enabled || !adsConfig.clientId || adsConfig.testMode) {
    return;
  }

  if (document.getElementById(adsenseScriptElementId)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.id = adsenseScriptElementId;
  script.src = getAdSenseScriptSrc(adsConfig.clientId);
  document.head.append(script);
}
```

Keep `AdSenseScript` as a compatibility component that calls this helper, but stop using it globally.

- [x] **Step 2: Update `AdSenseSlot`**

In the real runtime effect, call `ensureAdSenseScript()` before pushing `adsbygoogle`.

- [x] **Step 3: Remove global script mount**

Remove `AdSenseScript` import and usage from `app-shell.tsx`.

- [x] **Step 4: Run real runtime E2E**

Run: `rtk E2E_ADS_TEST_MODE=false npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium`

Expected: PASS and script request count only increases when eligible slots render.

---

### Task 5: Verify And Update Docs

**Interfaces:**

- Produces: updated docs and passing verification.

- [x] **Step 1: Update old AdSense design doc**

Modify `docs/superpowers/specs/2026-07-30-google-adsense-display-design.md` so it no longer recommends the pending generation slot as valid. Mark the newer 2026-08-03 policy as the active placement policy.

- [x] **Step 2: Run verification**

Run:

```bash
rtk npm run typecheck --workspace @langchain-training/frontend
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project mobile-chrome
rtk E2E_ADS_TEST_MODE=false npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
rtk npm run build --workspace @langchain-training/frontend
```

- [x] **Step 3: Commit**

Run:

```bash
rtk git add docs/superpowers apps/frontend/e2e/adsense-display.spec.ts apps/frontend/src
rtk git commit -m "fix(ads): restrict AdSense to editorial content"
```
