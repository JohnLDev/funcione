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
});
