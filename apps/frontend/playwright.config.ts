import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.E2E_PORT ?? 5174);
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const e2eAdsTestMode = process.env.E2E_ADS_TEST_MODE ?? 'true';
const e2eEnv = [
  'VITE_AUTH_MODE=mock',
  'VITE_ADS_ENABLED=true',
  'VITE_ADSENSE_CLIENT_ID=ca-pub-6699167964598590',
  'VITE_ADSENSE_SLOT_TRAINING_PREPARATION=9544709295',
  'VITE_ADSENSE_SLOT_PRE_FOOTER=7261326735',
  'VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR=6487869331',
  `VITE_ADS_TEST_MODE=${e2eAdsTestMode}`,
].join(' ');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: e2eBaseUrl,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `${e2eEnv} npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
