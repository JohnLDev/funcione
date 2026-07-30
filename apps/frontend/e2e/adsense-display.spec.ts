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

async function expireTrainingPlanCache(page: Page) {
  await page.evaluate(() => {
    const session = JSON.parse(
      window.localStorage.getItem('funcione-mock-session') ?? '{}',
    ) as { user?: { id?: string } };
    const userId = session.user?.id;

    if (userId) {
      window.localStorage.removeItem(`funcione-training-plan-cache:${userId}`);
    }
  });
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

type AdSenseRuntimeWindow = Window & {
  __adsensePushes?: unknown[];
  adsbygoogle?: unknown[];
};

const runsRealAdSenseRuntime = process.env.E2E_ADS_TEST_MODE === 'false';

async function interceptAdSenseScript(page: Page) {
  let requests = 0;

  await page.addInitScript(() => {
    const runtimeWindow = window as AdSenseRuntimeWindow;
    const adsbygoogle: unknown[] = [];
    const pushes: unknown[] = [];
    const push = adsbygoogle.push.bind(adsbygoogle);

    adsbygoogle.push = (...items: unknown[]) => {
      pushes.push(...items);
      return push(...items);
    };

    runtimeWindow.adsbygoogle = adsbygoogle;
    runtimeWindow.__adsensePushes = pushes;
  });
  await page.route(
    /https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/,
    async (route) => {
      requests += 1;
      await route.fulfill({
        body: 'window.adsbygoogle = window.adsbygoogle || [];',
        contentType: 'application/javascript',
      });
    },
  );

  return () => requests;
}

async function getAdSensePushCount(page: Page) {
  return page.evaluate(() => {
    const runtimeWindow = window as AdSenseRuntimeWindow;

    return runtimeWindow.__adsensePushes?.length ?? 0;
  });
}

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
        mockAuthWithRealRuntime: module.readAdsConfig({
          VITE_ADS_ENABLED: 'true',
          VITE_ADSENSE_CLIENT_ID: 'ca-pub-6699167964598590',
          VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR: '6487869331',
          VITE_ADSENSE_SLOT_PRE_FOOTER: '7261326735',
          VITE_ADSENSE_SLOT_TRAINING_PREPARATION: '9544709295',
          VITE_ADS_TEST_MODE: 'false',
          VITE_AUTH_MODE: 'mock',
        }).testMode,
      };
    });

    expect(parsed.disabled).toBe(false);
    expect(parsed.missingClient).toBe(false);
    expect(parsed.runtime.enabled).toBe(true);
    expect(parsed.runtime.clientId).toBe('ca-pub-6699167964598590');
    expect(parsed.runtime.testMode).toBe(true);
    expect(parsed.mockAuthWithRealRuntime).toBe(false);
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
    await expireTrainingPlanCache(page);
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

  test('runs the real AdSense runtime once with mock auth when explicitly requested', async ({
    page,
  }, testInfo) => {
    test.skip(!runsRealAdSenseRuntime, 'requires E2E_ADS_TEST_MODE=false');
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only runtime coverage');

    const getScriptRequestCount = await interceptAdSenseScript(page);
    await completeGoogleRegistration(page);

    const script = page.locator('#google-adsense-script');
    const ads = page.locator('ins.adsbygoogle');
    await expect(script).toHaveCount(1);
    await expect(ads).toHaveCount(2);
    await expect(page.getByTestId('adsense-slot-desktop-sidebar')).toBeVisible();
    await expect(page.getByTestId('adsense-slot-pre-footer')).toBeVisible();
    await expect.poll(() => getAdSensePushCount(page)).toBe(2);
    expect(getScriptRequestCount()).toBe(1);

    await page.getByRole('link', { name: /^perfil$/i }).click();
    await expect(ads).toHaveCount(1);
    await expect(page.getByTestId('adsense-slot-pre-footer')).toBeVisible();
    await expect.poll(() => getAdSensePushCount(page)).toBe(3);

    await page.getByRole('link', { name: /^inicio$/i }).click();
    await expect(ads).toHaveCount(2);
    await expect.poll(() => getAdSensePushCount(page)).toBe(5);

    await page.getByRole('button', { name: /sair/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('button', { name: /continuar com google/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(script).toHaveCount(1);
    await expect(ads).toHaveCount(2);
    await expect.poll(() => getAdSensePushCount(page)).toBe(7);
    expect(getScriptRequestCount()).toBe(1);
  });

  test('keeps the desktop sidebar absent in the real runtime on mobile', async ({
    page,
  }, testInfo) => {
    test.skip(!runsRealAdSenseRuntime, 'requires E2E_ADS_TEST_MODE=false');
    test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile-only runtime coverage');

    const getScriptRequestCount = await interceptAdSenseScript(page);
    await completeGoogleRegistration(page);

    await expect(page.locator('#google-adsense-script')).toHaveCount(1);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(1);
    await expect(page.getByTestId('adsense-slot-pre-footer')).toBeVisible();
    await expect(page.getByTestId('adsense-slot-desktop-sidebar')).toHaveCount(0);
    await expect.poll(() => getAdSensePushCount(page)).toBe(1);
    expect(getScriptRequestCount()).toBe(1);
  });

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

  test('discloses Google AdSense in privacy policy in both languages', async ({
    page,
  }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/Google AdSense/i).first()).toBeVisible();
    await expect(page.getByText(/cookies de publicidade/i)).toBeVisible();
    await expect(page.getByText('Atualizado em 30/07/2026')).toBeVisible();
    await expect(
      page.getByText(/anuncios podem ser personalizados ou nao personalizados/i),
    ).toBeVisible();

    await page.evaluate(() => {
      window.localStorage.setItem('funcione-language', 'en-US');
    });
    await page.reload();
    await expect(page.getByText(/Google AdSense/i).first()).toBeVisible();
    await expect(page.getByText(/advertising cookies/i)).toBeVisible();
    await expect(page.getByText('Updated on July 30, 2026')).toBeVisible();
    await expect(
      page.getByText(/ads may be personalized or non-personalized/i),
    ).toBeVisible();
  });
});
