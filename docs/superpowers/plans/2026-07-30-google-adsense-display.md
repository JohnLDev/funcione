# Google AdSense Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled Google AdSense display to Funcione without interrupting workout generation, page navigation, or active workout execution.

**Architecture:** The frontend owns the first version through a small `src/ads` layer that reads public Vite envs, gates eligibility centrally, loads the AdSense script once, and renders manual slots. Slots are placed only in approved screen regions: async training preparation, desktop sidebars, and pre-footer content areas that appear before the `AppShell` footer.

**Tech Stack:** React 19, Vite 7.3.1, TypeScript, Playwright, Google AdSense, Cloudflare Pages static assets.

## Global Constraints

- Use Google AdSense, nao Google Ads, because the goal is to display ads in the web app.
- Use manual controlled placements in the first version.
- Do not add Auto ads in this version.
- Load the AdSense script once when ads are enabled.
- Do not copy the full AdSense snippet into each UI component.
- Do not show ads in modals, mobile bottom nav, short initial loading states, active workout execution, or near primary action buttons.
- Keep future segmentation behind a central eligibility boundary; do not create billing, premium plans, subscription tables, or backend segmentation in this delivery.
- Use the public AdSense IDs:
  `ca-pub-6699167964598590`,
  `9544709295`,
  `7261326735`,
  `6487869331`.
- Add `apps/frontend/public/ads.txt` with `google.com, pub-6699167964598590, DIRECT, f08c47fec0942fa0`.
- Update privacy documents in `pt-BR` and `en-US`.
- Use `rtk` for shell commands in this workspace.

---

## File Structure

- Create `apps/frontend/public/ads.txt`: AdSense seller declaration served at `/ads.txt`.
- Modify `.env.example`: document public AdSense env names with ads disabled by default.
- Modify `.env.production`: enable production AdSense IDs because they are public client-side values.
- Modify `apps/frontend/playwright.config.ts`: run E2E with mock auth and mock AdSense markers enabled.
- Modify `apps/frontend/src/vite-env.d.ts`: type the new public env variables. Keep this file import-free.
- Create `apps/frontend/src/ads/ads-config.ts`: parse Vite env strings into typed ad config.
- Create `apps/frontend/src/ads/use-ads-eligibility.ts`: expose central pure and hook-based eligibility checks, including desktop-only matching.
- Create `apps/frontend/src/ads/adsense-script.tsx`: load the AdSense script once in real runtime and avoid external loading in mock auth E2E.
- Create `apps/frontend/src/ads/adsense-slot.tsx`: render an AdSense `<ins>` in real runtime and a stable test marker in mock auth E2E.
- Create `apps/frontend/src/ads/ad-placements.tsx`: named wrappers for preparation, pre-footer, and desktop sidebar placements.
- Modify `apps/frontend/src/components/app-shell.tsx`: mount `AdSenseScript` once inside authenticated shell.
- Modify `apps/frontend/src/components/training-screen.tsx`: add the preparation slot in `pendingGeneration`.
- Modify `apps/frontend/src/components/training-plan-wizard.tsx`: add the desktop sidebar slot below the monthly notice.
- Modify `apps/frontend/src/components/training-active-plan.tsx`: add desktop sidebar and pre-footer slots only when no workout is in progress.
- Modify `apps/frontend/src/components/dashboard-screen.tsx`: add desktop sidebar and pre-footer slots.
- Modify `apps/frontend/src/components/athlete-profile-screen.tsx`: add the pre-footer slot after profile content.
- Modify `apps/frontend/src/i18n/locales/pt-BR/common.json`: add `ads.label`.
- Modify `apps/frontend/src/i18n/locales/en-US/common.json`: add `ads.label`.
- Modify `apps/frontend/src/legal/documents/pt-BR/privacy.md`: disclose Google AdSense advertising and cookies.
- Modify `apps/frontend/src/legal/documents/en-US/privacy.md`: disclose Google AdSense advertising and cookies.
- Create `apps/frontend/e2e/adsense-display.spec.ts`: focused E2E coverage for config, runtime markers, placement, and legal copy.
- Modify `apps/frontend/e2e/training-plan.spec.ts`: assert no ads appear during active workout execution.

---

### Task 1: Public AdSense Config

**Files:**
- Create: `apps/frontend/public/ads.txt`
- Create: `apps/frontend/src/ads/ads-config.ts`
- Create: `apps/frontend/e2e/adsense-display.spec.ts`
- Modify: `.env.example`
- Modify: `.env.production`
- Modify: `apps/frontend/playwright.config.ts`
- Modify: `apps/frontend/src/vite-env.d.ts`

**Interfaces:**
- Produces type: `type AdsSlotKey = 'trainingPreparation' | 'preFooter' | 'desktopSidebar'`
- Produces type: `type AdsFormat = 'auto' | 'autorelaxed'`
- Produces function: `readAdsConfig(env?: AdsEnv): AdsConfig`
- Produces const: `adsConfig: AdsConfig`
- Later tasks consume `adsConfig.enabled`, `adsConfig.clientId`, `adsConfig.testMode`, and `adsConfig.slots[slot]`.

- [x] **Step 1: Write the failing E2E config test**

Create `apps/frontend/e2e/adsense-display.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function completeGoogleRegistration(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /continuar com google/i }).click();
  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.getByLabel(/^nome$/i).fill('Ads');
  await page.getByLabel(/sobrenome/i).fill('Tester');
  await page.getByLabel(/cpf/i).fill('52998224725');
  await page.getByLabel(/data de nascimento/i).fill('1994-08-20');
  await page.getByLabel(/telefone/i).fill('11999999999');
  await page.getByRole('button', { name: /salvar cadastro/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

type ImportedAdsSlot = {
  format: string;
  fullWidthResponsive: boolean;
  id: string;
  label: string;
  testId: string;
};

type ImportedParsedAdsConfig = {
  clientId: string;
  enabled: boolean;
  slots: Record<string, ImportedAdsSlot>;
  testMode: boolean;
};

type ImportedAdsConfig = {
  adsConfig: ImportedParsedAdsConfig;
  readAdsConfig: (
    env?: Record<string, string | undefined>,
  ) => ImportedParsedAdsConfig;
};

type ImportedAdSenseScript = {
  adsenseScriptElementId: string;
  getAdSenseScriptSrc: (clientId: string) => string;
};

type ImportedAdsEligibility = {
  shouldShowAds: (
    config: ReturnType<ImportedAdsConfig['readAdsConfig']>,
    options: { isDesktop?: boolean; slot: string; suppress?: boolean },
  ) => boolean;
};

test.describe('Google AdSense display', () => {
  test('reads public AdSense config and serves ads.txt', async ({
    page,
    request,
  }) => {
    await page.goto('/login');

    const parsed = await page.evaluate(async () => {
      const module = (await import('/src/ads/ads-config.ts')) as unknown as ImportedAdsConfig;

      return {
        disabled: module.readAdsConfig({ VITE_ADS_ENABLED: 'false' }).enabled,
        missingClient: module.readAdsConfig({
          VITE_ADS_ENABLED: 'true',
          VITE_ADSENSE_CLIENT_ID: '',
          VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR: '6487869331',
          VITE_ADSENSE_SLOT_PRE_FOOTER: '7261326735',
          VITE_ADSENSE_SLOT_TRAINING_PREPARATION: '9544709295',
        }).enabled,
        runtime: module.adsConfig,
        trainingSlot: module.adsConfig.slots.trainingPreparation,
      };
    });

    expect(parsed.disabled).toBe(false);
    expect(parsed.missingClient).toBe(false);
    expect(parsed.runtime.enabled).toBe(true);
    expect(parsed.runtime.clientId).toBe('ca-pub-6699167964598590');
    expect(parsed.runtime.testMode).toBe(true);
    expect(parsed.trainingSlot).toEqual({
      format: 'auto',
      fullWidthResponsive: true,
      id: '9544709295',
      label: 'trainingPreparation',
      testId: 'adsense-slot-training-preparation',
    });

    const adsTxt = await request.get('/ads.txt');
    expect(adsTxt.ok()).toBe(true);
    expect(await adsTxt.text()).toBe(
      'google.com, pub-6699167964598590, DIRECT, f08c47fec0942fa0\n',
    );
  });
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
```

Expected: FAIL because `/src/ads/ads-config.ts` and `/ads.txt` do not exist.

- [x] **Step 3: Add Vite env declarations**

Update `apps/frontend/src/vite-env.d.ts` by adding these fields inside `ImportMetaEnv`. Do not add imports to this file.

```ts
  readonly VITE_ADS_ENABLED?: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR?: string;
  readonly VITE_ADSENSE_SLOT_PRE_FOOTER?: string;
  readonly VITE_ADSENSE_SLOT_TRAINING_PREPARATION?: string;
```

- [x] **Step 4: Add public env values**

Append this block to `.env.example`:

```env
# Google AdSense public configuration.
# These IDs are exposed in the browser by design. Keep disabled for local dev.
VITE_ADS_ENABLED=false
VITE_ADSENSE_CLIENT_ID=ca-pub-6699167964598590
VITE_ADSENSE_SLOT_TRAINING_PREPARATION=9544709295
VITE_ADSENSE_SLOT_PRE_FOOTER=7261326735
VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR=6487869331
```

Append this block to `.env.production`:

```env
VITE_ADS_ENABLED=true
VITE_ADSENSE_CLIENT_ID=ca-pub-6699167964598590
VITE_ADSENSE_SLOT_TRAINING_PREPARATION=9544709295
VITE_ADSENSE_SLOT_PRE_FOOTER=7261326735
VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR=6487869331
```

- [x] **Step 5: Enable mock AdSense values in Playwright**

Modify `apps/frontend/playwright.config.ts` so the web server command includes ads envs in E2E:

```ts
const e2eEnv = [
  'VITE_AUTH_MODE=mock',
  'VITE_ADS_ENABLED=true',
  'VITE_ADSENSE_CLIENT_ID=ca-pub-6699167964598590',
  'VITE_ADSENSE_SLOT_TRAINING_PREPARATION=9544709295',
  'VITE_ADSENSE_SLOT_PRE_FOOTER=7261326735',
  'VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR=6487869331',
].join(' ');
```

Then change the web server command to:

```ts
command: `${e2eEnv} npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
```

- [x] **Step 6: Add `ads.txt`**

Create `apps/frontend/public/ads.txt`:

```txt
google.com, pub-6699167964598590, DIRECT, f08c47fec0942fa0
```

- [x] **Step 7: Implement `ads-config.ts`**

Create `apps/frontend/src/ads/ads-config.ts`:

```ts
export type AdsSlotKey =
  | 'desktopSidebar'
  | 'preFooter'
  | 'trainingPreparation';

export type AdsFormat = 'auto' | 'autorelaxed';

export type AdsSlotConfig = {
  format: AdsFormat;
  fullWidthResponsive: boolean;
  id: string;
  label: AdsSlotKey;
  testId: string;
};

export type AdsConfig = {
  clientId: string;
  enabled: boolean;
  slots: Record<AdsSlotKey, AdsSlotConfig>;
  testMode: boolean;
};

export type AdsEnv = Partial<
  Pick<
    ImportMetaEnv,
    | 'VITE_ADS_ENABLED'
    | 'VITE_ADSENSE_CLIENT_ID'
    | 'VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR'
    | 'VITE_ADSENSE_SLOT_PRE_FOOTER'
    | 'VITE_ADSENSE_SLOT_TRAINING_PREPARATION'
    | 'VITE_AUTH_MODE'
  >
>;

function readEnvValue(value: string | undefined) {
  return value?.trim() ?? '';
}

function readEnabled(value: string | undefined) {
  return readEnvValue(value).toLowerCase() === 'true';
}

function buildSlot(
  label: AdsSlotKey,
  id: string | undefined,
  format: AdsFormat,
  fullWidthResponsive: boolean,
): AdsSlotConfig {
  return {
    format,
    fullWidthResponsive,
    id: readEnvValue(id),
    label,
    testId: `adsense-slot-${label.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
  };
}

export function readAdsConfig(env: AdsEnv = import.meta.env): AdsConfig {
  const clientId = readEnvValue(env.VITE_ADSENSE_CLIENT_ID);
  const slots = {
    desktopSidebar: buildSlot(
      'desktopSidebar',
      env.VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR,
      'auto',
      true,
    ),
    preFooter: buildSlot(
      'preFooter',
      env.VITE_ADSENSE_SLOT_PRE_FOOTER,
      'autorelaxed',
      false,
    ),
    trainingPreparation: buildSlot(
      'trainingPreparation',
      env.VITE_ADSENSE_SLOT_TRAINING_PREPARATION,
      'auto',
      true,
    ),
  };
  const enabled =
    readEnabled(env.VITE_ADS_ENABLED) &&
    clientId.length > 0 &&
    Object.values(slots).some((slot) => slot.id.length > 0);

  return {
    clientId,
    enabled,
    slots,
    testMode: env.VITE_AUTH_MODE === 'mock',
  };
}

export const adsConfig = readAdsConfig();
```

- [x] **Step 8: Run the focused test and verify it passes**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
```

Expected: PASS.

- [x] **Step 9: Commit Task 1**

```bash
rtk git add .env.example .env.production apps/frontend/playwright.config.ts apps/frontend/public/ads.txt apps/frontend/src/vite-env.d.ts apps/frontend/src/ads/ads-config.ts apps/frontend/e2e/adsense-display.spec.ts
rtk git commit -m "feat(ads): add AdSense config"
```

---

### Task 2: AdSense Runtime Primitives

**Files:**
- Create: `apps/frontend/src/ads/adsense-script.tsx`
- Create: `apps/frontend/src/ads/adsense-slot.tsx`
- Create: `apps/frontend/src/ads/use-ads-eligibility.ts`
- Create: `apps/frontend/src/ads/ad-placements.tsx`
- Modify: `apps/frontend/e2e/adsense-display.spec.ts`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: `adsConfig`, `AdsConfig`, `AdsSlotKey`
- Produces const: `adsenseScriptElementId = 'google-adsense-script'`
- Produces function: `getAdSenseScriptSrc(clientId: string): string`
- Produces function: `shouldShowAds(config: AdsConfig, options: AdsEligibilityOptions): boolean`
- Produces component: `AdSenseScript(): JSX.Element | null`
- Produces component: `AdSenseSlot(props: AdSenseSlotProps): JSX.Element | null`
- Produces component: `TrainingPreparationAd(): JSX.Element | null`
- Produces component: `PreFooterAd(props?: { suppress?: boolean }): JSX.Element | null`
- Produces component: `DesktopSidebarAd(props?: { suppress?: boolean }): JSX.Element | null`

- [x] **Step 1: Extend the failing runtime test**

Append these tests inside `test.describe('Google AdSense display', ...)` in `apps/frontend/e2e/adsense-display.spec.ts`:

```ts
  test('builds the AdSense script URL without loading the network script in E2E', async ({
    page,
  }) => {
    await completeGoogleRegistration(page);

    const runtime = await page.evaluate(async () => {
      const module = (await import('/src/ads/adsense-script.tsx')) as unknown as ImportedAdSenseScript;

      return {
        id: module.adsenseScriptElementId,
        src: module.getAdSenseScriptSrc('ca-pub-6699167964598590'),
      };
    });

    expect(runtime).toEqual({
      id: 'google-adsense-script',
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6699167964598590',
    });
    await expect(
      page.locator('script[src*="pagead2.googlesyndication.com"]'),
    ).toHaveCount(0);
  });

  test('keeps AdSense eligibility centralized', async ({ page }) => {
    await page.goto('/login');

    const eligibility = await page.evaluate(async () => {
      const configModule = (await import('/src/ads/ads-config.ts')) as unknown as ImportedAdsConfig;
      const module = (await import('/src/ads/use-ads-eligibility.ts')) as unknown as ImportedAdsEligibility;
      const config = configModule.readAdsConfig({
        VITE_ADS_ENABLED: 'true',
        VITE_ADSENSE_CLIENT_ID: 'ca-pub-6699167964598590',
        VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR: '6487869331',
        VITE_ADSENSE_SLOT_PRE_FOOTER: '7261326735',
        VITE_ADSENSE_SLOT_TRAINING_PREPARATION: '9544709295',
      });

      return {
        disabled: module.shouldShowAds(configModule.readAdsConfig({}), {
          slot: 'preFooter',
        }),
        hiddenBySuppression: module.shouldShowAds(config, {
          slot: 'preFooter',
          suppress: true,
        }),
        hiddenOnMobile: module.shouldShowAds(config, {
          isDesktop: false,
          slot: 'desktopSidebar',
        }),
        visible: module.shouldShowAds(config, { slot: 'preFooter' }),
      };
    });

    expect(eligibility).toEqual({
      disabled: false,
      hiddenBySuppression: false,
      hiddenOnMobile: false,
      visible: true,
    });
  });
```

- [x] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
```

Expected: FAIL because `adsense-script.tsx` and `use-ads-eligibility.ts` do not exist.

- [x] **Step 3: Add ad label translations**

Add this object near the top-level keys in `apps/frontend/src/i18n/locales/pt-BR/common.json`:

```json
"ads": {
  "label": "Publicidade"
}
```

Add this object near the top-level keys in `apps/frontend/src/i18n/locales/en-US/common.json`:

```json
"ads": {
  "label": "Advertisement"
}
```

- [x] **Step 4: Implement eligibility**

Create `apps/frontend/src/ads/use-ads-eligibility.ts`:

```ts
import { useEffect, useState } from 'react';
import { adsConfig, type AdsConfig, type AdsSlotKey } from './ads-config.js';

export type AdsEligibilityOptions = {
  isDesktop?: boolean;
  slot: AdsSlotKey;
  suppress?: boolean;
};

export function shouldShowAds(
  config: AdsConfig,
  { isDesktop, slot, suppress = false }: AdsEligibilityOptions,
) {
  if (suppress || !config.enabled || !config.clientId) {
    return false;
  }

  if (!config.slots[slot]?.id) {
    return false;
  }

  if (slot === 'desktopSidebar' && isDesktop === false) {
    return false;
  }

  return true;
}

function getInitialMediaQueryMatch(query: string) {
  return typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getInitialMediaQueryMatch(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener('change', updateMatches);

    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

export function useAdsEligibility({
  slot,
  suppress,
}: Pick<AdsEligibilityOptions, 'slot' | 'suppress'>) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return shouldShowAds(adsConfig, {
    isDesktop,
    slot,
    suppress,
  });
}
```

- [x] **Step 5: Implement the script loader**

Create `apps/frontend/src/ads/adsense-script.tsx`:

```tsx
import { useEffect } from 'react';
import { adsConfig } from './ads-config.js';

export const adsenseScriptElementId = 'google-adsense-script';

export function getAdSenseScriptSrc(clientId: string) {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
}

export function AdSenseScript() {
  useEffect(() => {
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
  }, []);

  return null;
}
```

- [x] **Step 6: Implement the slot component**

Create `apps/frontend/src/ads/adsense-slot.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.js';
import { adsConfig, type AdsSlotKey } from './ads-config.js';
import { useAdsEligibility } from './use-ads-eligibility.js';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdSenseSlotProps = {
  className?: string;
  slot: AdsSlotKey;
  suppress?: boolean;
};

const minHeightBySlot: Record<AdsSlotKey, string> = {
  desktopSidebar: 'min-h-64',
  preFooter: 'min-h-32 sm:min-h-36',
  trainingPreparation: 'min-h-32',
};

export function AdSenseSlot({
  className,
  slot,
  suppress,
}: AdSenseSlotProps) {
  const { t } = useTranslation();
  const slotConfig = adsConfig.slots[slot];
  const shouldRender = useAdsEligibility({ slot, suppress });
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const ins = insRef.current;

    if (!shouldRender || adsConfig.testMode || !ins) {
      return;
    }

    if (ins.dataset.adsensePushed === 'true') {
      return;
    }

    ins.dataset.adsensePushed = 'true';
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
  }, [shouldRender, slotConfig.id]);

  if (!shouldRender) {
    return null;
  }

  const sharedProps = {
    'aria-label': t('ads.label'),
    'data-ad-client': adsConfig.clientId,
    'data-ad-slot': slotConfig.id,
    'data-testid': slotConfig.testId,
  };

  if (adsConfig.testMode) {
    return (
      <div
        {...sharedProps}
        className={cn(
          'grid place-items-center rounded-2xl border border-dashed border-border bg-secondary/60 p-3 text-xs font-bold text-muted-foreground',
          minHeightBySlot[slot],
          className,
        )}
      >
        {t('ads.label')}
      </div>
    );
  }

  return (
    <ins
      {...sharedProps}
      className={cn(
        'adsbygoogle block min-w-0',
        minHeightBySlot[slot],
        className,
      )}
      data-ad-format={slotConfig.format}
      data-full-width-responsive={
        slotConfig.fullWidthResponsive ? 'true' : undefined
      }
      ref={insRef}
      style={{ display: 'block' }}
    />
  );
}
```

- [x] **Step 7: Implement placement wrappers**

Create `apps/frontend/src/ads/ad-placements.tsx`:

```tsx
import { AdSenseSlot } from './adsense-slot.js';

export function TrainingPreparationAd() {
  return <AdSenseSlot slot="trainingPreparation" />;
}

export function PreFooterAd({ suppress = false }: { suppress?: boolean }) {
  return (
    <div className="mt-4">
      <AdSenseSlot slot="preFooter" suppress={suppress} />
    </div>
  );
}

export function DesktopSidebarAd({ suppress = false }: { suppress?: boolean }) {
  return (
    <AdSenseSlot
      className="hidden lg:grid"
      slot="desktopSidebar"
      suppress={suppress}
    />
  );
}
```

- [x] **Step 8: Mount the script once in the authenticated shell**

In `apps/frontend/src/components/app-shell.tsx`, add:

```tsx
import { AdSenseScript } from '@/ads/adsense-script.js';
```

Then render it as the first child inside the outer `<div>`:

```tsx
    <div className="min-h-dvh overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 md:px-8 md:pb-8">
      <AdSenseScript />
```

- [x] **Step 9: Run the focused tests and typecheck**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
rtk npm run typecheck --workspace @langchain-training/frontend
```

Expected: both PASS.

- [x] **Step 10: Commit Task 2**

```bash
rtk git add apps/frontend/src/ads apps/frontend/src/components/app-shell.tsx apps/frontend/src/i18n/locales/pt-BR/common.json apps/frontend/src/i18n/locales/en-US/common.json apps/frontend/e2e/adsense-display.spec.ts
rtk git commit -m "feat(ads): add AdSense runtime"
```

---

### Task 3: Training Preparation and Desktop Sidebar Slots

**Files:**
- Modify: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/src/components/training-active-plan.tsx`
- Modify: `apps/frontend/src/components/dashboard-screen.tsx`
- Modify: `apps/frontend/e2e/adsense-display.spec.ts`

**Interfaces:**
- Consumes component: `TrainingPreparationAd()`
- Consumes component: `DesktopSidebarAd(props?: { suppress?: boolean })`
- Produces visible mock marker: `data-testid="adsense-slot-training-preparation"` in pending training generation.
- Produces visible mock marker: `data-testid="adsense-slot-desktop-sidebar"` on desktop dashboard/sidebar states.

- [x] **Step 1: Add failing placement tests**

Append these tests to `apps/frontend/e2e/adsense-display.spec.ts`:

```ts
  test('shows the preparation ad during async training generation', async ({
    page,
  }) => {
    await completeGoogleRegistration(page);
    await page.evaluate(() => {
      const session = JSON.parse(
        window.localStorage.getItem('funcione-mock-session') ?? '{}',
      );
      window.localStorage.setItem(
        'funcione-mock-training-plan-scenarios',
        JSON.stringify({ [session.accessToken]: { pending: true } }),
      );
    });
    await page.getByRole('link', { name: /^treino$/i }).click();

    await expect(
      page.getByRole('heading', { name: /preparando seu treino/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: /preparo estimado do treino/i }),
    ).toBeVisible();
    const preparationAd = page.getByTestId('adsense-slot-training-preparation');
    await expect(preparationAd).toBeVisible();
    await expect(preparationAd).toHaveAttribute('data-ad-slot', '9544709295');
    await expect(page.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
  });

  test('shows desktop sidebar ad on dashboard without loading AdSense network script', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only ad');

    await completeGoogleRegistration(page);

    const sidebarAd = page.getByTestId('adsense-slot-desktop-sidebar');
    await expect(sidebarAd).toBeVisible();
    await expect(sidebarAd).toHaveAttribute('data-ad-slot', '6487869331');
    await expect(
      page.locator('script[src*="pagead2.googlesyndication.com"]'),
    ).toHaveCount(0);
  });
```

- [x] **Step 2: Run focused placement tests and verify they fail**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
```

Expected: FAIL because the placement components are not rendered in screens.

- [x] **Step 3: Add the training preparation slot**

In `apps/frontend/src/components/training-screen.tsx`, add:

```tsx
import { TrainingPreparationAd } from '@/ads/ad-placements.js';
```

Then render it directly after `TrainingPreparationProgress`:

```tsx
          <TrainingPreparationProgress generation={state.pendingGeneration} />
          <TrainingPreparationAd />
          <p className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm font-bold text-muted-foreground">
```

- [x] **Step 4: Add dashboard sidebar slot**

In `apps/frontend/src/components/dashboard-screen.tsx`, add:

```tsx
import { DesktopSidebarAd } from '@/ads/ad-placements.js';
```

Inside the existing dashboard `<aside className="grid content-start gap-4">`, render the sidebar slot after the profile card:

```tsx
          <DesktopSidebarAd />
```

Do not render `PreFooterAd` in this task; Task 4 adds pre-footer behavior and tests.

- [x] **Step 5: Add wizard sidebar slot**

In `apps/frontend/src/components/training-plan-wizard.tsx`, add:

```tsx
import { DesktopSidebarAd } from '@/ads/ad-placements.js';
```

Inside the wizard `<aside>`, render below the monthly limit card:

```tsx
        <div className="mt-4">
          <DesktopSidebarAd />
        </div>
```

- [x] **Step 6: Add active-plan sidebar slot with execution suppression**

In `apps/frontend/src/components/training-active-plan.tsx`, add:

```tsx
import { DesktopSidebarAd } from '@/ads/ad-placements.js';
```

Inside the existing desktop `<aside className="hidden lg:block">`, render below the monthly limit card:

```tsx
        <div className="mt-4">
          <DesktopSidebarAd suppress={hasInProgressSession} />
        </div>
```

- [x] **Step 7: Run focused placement tests and typecheck**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
rtk npm run typecheck --workspace @langchain-training/frontend
```

Expected: both PASS.

- [x] **Step 8: Commit Task 3**

```bash
rtk git add apps/frontend/src/components/training-screen.tsx apps/frontend/src/components/training-plan-wizard.tsx apps/frontend/src/components/training-active-plan.tsx apps/frontend/src/components/dashboard-screen.tsx apps/frontend/e2e/adsense-display.spec.ts
rtk git commit -m "feat(ads): place training ad slots"
```

---

### Task 4: Pre-Footer Slots and Active Workout Suppression

**Files:**
- Modify: `apps/frontend/src/components/dashboard-screen.tsx`
- Modify: `apps/frontend/src/components/athlete-profile-screen.tsx`
- Modify: `apps/frontend/src/components/training-active-plan.tsx`
- Modify: `apps/frontend/e2e/adsense-display.spec.ts`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Consumes component: `PreFooterAd(props?: { suppress?: boolean })`
- Produces pre-footer marker: `data-testid="adsense-slot-pre-footer"`
- Keeps `adsense-slot-pre-footer` and `adsense-slot-desktop-sidebar` absent while a workout execution panel is active.

- [ ] **Step 1: Add failing pre-footer and suppression tests**

Append this test to `apps/frontend/e2e/adsense-display.spec.ts`:

```ts
  test('shows pre-footer ad before the footer on mobile without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await completeGoogleRegistration(page);

    const preFooterAd = page.getByTestId('adsense-slot-pre-footer');
    await expect(preFooterAd).toBeVisible();
    await expect(preFooterAd).toHaveAttribute('data-ad-slot', '7261326735');

    const footer = page.getByRole('contentinfo');
    const adBox = await preFooterAd.boundingBox();
    const footerBox = await footer.boundingBox();
    expect(adBox?.y ?? 0).toBeLessThan(footerBox?.y ?? 0);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
```

In `apps/frontend/e2e/training-plan.spec.ts`, inside the test named `tracks workout execution progress in session storage and finishes with sport feedback`, add this assertion immediately after starting the first workout and before clicking finalization:

```ts
    await expect(page.getByTestId('adsense-slot-pre-footer')).toHaveCount(0);
    await expect(page.getByTestId('adsense-slot-desktop-sidebar')).toHaveCount(0);
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project mobile-chrome
rtk npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "tracks workout execution progress" --project desktop-chromium
```

Expected: first command FAILS because no pre-footer slot exists; second command FAILS if the sidebar remains rendered during execution.

- [ ] **Step 3: Add dashboard pre-footer slot**

In `apps/frontend/src/components/dashboard-screen.tsx`, render `PreFooterAd` after the `lg:grid-cols-[minmax(0,1fr)_320px]` content grid and before the closing `</section>`:

```tsx
      <PreFooterAd />
```

- [ ] **Step 4: Add profile pre-footer slot**

In `apps/frontend/src/components/athlete-profile-screen.tsx`, add:

```tsx
import { PreFooterAd } from '@/ads/ad-placements.js';
```

Render it after the profile cards and before the closing `</section>`:

```tsx
      <PreFooterAd />
```

- [ ] **Step 5: Add active-plan pre-footer slot with execution suppression**

In `apps/frontend/src/components/training-active-plan.tsx`, update the ads import to include `PreFooterAd`:

```tsx
import { DesktopSidebarAd, PreFooterAd } from '@/ads/ad-placements.js';
```

Render this after the desktop aside and before the confirmation modals:

```tsx
      <div className="lg:col-span-2">
        <PreFooterAd suppress={hasInProgressSession} />
      </div>
```

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project mobile-chrome
rtk npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "tracks workout execution progress" --project desktop-chromium
rtk npm run typecheck --workspace @langchain-training/frontend
```

Expected: all PASS.

- [ ] **Step 7: Commit Task 4**

```bash
rtk git add apps/frontend/src/components/dashboard-screen.tsx apps/frontend/src/components/athlete-profile-screen.tsx apps/frontend/src/components/training-active-plan.tsx apps/frontend/e2e/adsense-display.spec.ts apps/frontend/e2e/training-plan.spec.ts
rtk git commit -m "feat(ads): add pre-footer placements"
```

---

### Task 5: Privacy Disclosure

**Files:**
- Modify: `apps/frontend/src/legal/documents/pt-BR/privacy.md`
- Modify: `apps/frontend/src/legal/documents/en-US/privacy.md`
- Modify: `apps/frontend/e2e/adsense-display.spec.ts`

**Interfaces:**
- Produces Portuguese privacy copy mentioning `Google AdSense`.
- Produces English privacy copy mentioning `Google AdSense`.
- Produces E2E verification for both locales.

- [ ] **Step 1: Add failing legal-copy tests**

Append this test to `apps/frontend/e2e/adsense-display.spec.ts`:

```ts
  test('discloses Google AdSense in privacy policy in both languages', async ({
    page,
  }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/Google AdSense/i)).toBeVisible();
    await expect(page.getByText(/cookies de publicidade/i)).toBeVisible();

    await page.evaluate(() => {
      window.localStorage.setItem('funcione-language', 'en-US');
    });
    await page.reload();
    await expect(page.getByText(/Google AdSense/i)).toBeVisible();
    await expect(page.getByText(/advertising cookies/i)).toBeVisible();
  });
```

- [ ] **Step 2: Run the focused legal test and verify it fails**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --grep "privacy policy" --project desktop-chromium
```

Expected: FAIL because the current privacy documents do not mention AdSense advertising cookies.

- [ ] **Step 3: Update Portuguese privacy policy**

In `apps/frontend/src/legal/documents/pt-BR/privacy.md`, update section `## 3. Finalidades de uso` to include publicidade:

```md
Usamos os dados para autenticar usuarios, manter o cadastro, personalizar solicitacoes de treino, gerar planos com apoio de inteligencia artificial, melhorar a experiencia, exibir publicidade por meio do Google AdSense, prevenir abuso, corrigir falhas e cumprir obrigacoes legais ou regulatórias aplicaveis.
```

Update section `## 4. Compartilhamento e operadores` to include Google AdSense:

```md
Podemos usar provedores de tecnologia para hospedagem, banco de dados, autenticacao, observabilidade, processamento por inteligencia artificial e publicidade. O Google AdSense pode usar cookies de publicidade, identificadores e sinais de navegacao para entregar, medir e proteger anuncios, conforme as configuracoes de consentimento e privacidade aplicaveis.
```

- [ ] **Step 4: Update English privacy policy**

In `apps/frontend/src/legal/documents/en-US/privacy.md`, update section `## 3. Purposes of use` to include advertising:

```md
We use data to authenticate users, maintain registration, personalize training requests, generate plans with artificial intelligence support, improve the experience, display advertising through Google AdSense, prevent abuse, fix issues, and comply with applicable legal or regulatory obligations.
```

Update section `## 4. Sharing and processors` to include Google AdSense:

```md
We may use technology providers for hosting, database, authentication, observability, artificial intelligence processing, and advertising. Google AdSense may use advertising cookies, identifiers, and browsing signals to deliver, measure, and protect ads, according to the applicable consent and privacy settings.
```

- [ ] **Step 5: Run the focused legal test**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --grep "privacy policy" --project desktop-chromium
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
rtk git add apps/frontend/src/legal/documents/pt-BR/privacy.md apps/frontend/src/legal/documents/en-US/privacy.md apps/frontend/e2e/adsense-display.spec.ts
rtk git commit -m "docs(privacy): disclose AdSense ads"
```

---

### Task 6: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-30-google-adsense-display.md`

**Interfaces:**
- Produces completed checklist in this plan.
- Produces verified frontend ads behavior across desktop and mobile.

- [ ] **Step 1: Run frontend typecheck**

Run:

```bash
rtk npm run typecheck --workspace @langchain-training/frontend
```

Expected: PASS.

- [ ] **Step 2: Run focused E2E**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project desktop-chromium
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts --project mobile-chrome
rtk npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "tracks workout execution progress" --project desktop-chromium
```

Expected: all PASS.

- [ ] **Step 3: Run full frontend E2E**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend
```

Expected: PASS.

- [ ] **Step 4: Run root verification**

Run:

```bash
rtk npm run typecheck
rtk npm test
rtk npm run test:e2e
rtk npm run build
```

Expected: all PASS.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
rtk git status --short
rtk git diff --stat
```

Expected: only intentional AdSense config, frontend ads, placement, E2E, privacy, and plan files changed.

- [ ] **Step 6: Commit plan checklist updates**

```bash
rtk git add docs/superpowers/plans/2026-07-30-google-adsense-display.md
rtk git commit -m "docs(ads): mark implementation plan progress"
```

---

## Self-Review Notes

- Spec coverage: the plan covers AdSense IDs, `ads.txt`, manual slots, no Auto ads, future segmentation boundary, privacy copy, UX risks, E2E coverage, and no backend REST changes.
- Type consistency: slot names are `trainingPreparation`, `preFooter`, and `desktopSidebar` across config, eligibility, components, and tests.
- Test strategy: each behavior task starts with an E2E failure, implements the minimal surface, and reruns focused tests before commit.
