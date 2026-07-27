import { expect, test } from '@playwright/test';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const devPwaBuildDir = path.join(frontendRoot, 'dev-dist');

declare global {
  interface Window {
    __funcioneServiceWorkerRegistrations?: string[];
    __funcioneServiceWorkerUnregisters?: number;
  }
}

test.describe('PWA installability', () => {
  test('exposes installability metadata and app icons', async ({
    page,
    request,
  }) => {
    await page.goto('/login');

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      '/icons/funcione-milex-app-icon-48.png',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/icons/funcione-milex-app-icon-180.png',
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#0088ff',
    );

    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as {
      background_color?: string;
      description?: string;
      display?: string;
      icons?: Array<{
        purpose?: string;
        sizes?: string;
        src?: string;
        type?: string;
      }>;
      lang?: string;
      name?: string;
      scope?: string;
      short_name?: string;
      start_url?: string;
      theme_color?: string;
    };

    expect(manifest.name).toBe('Funcione');
    expect(manifest.short_name).toBe('Funcione');
    expect(manifest.description).toContain('MileX');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('pt-BR');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.theme_color).toBe('#0088ff');
    expect(manifest.background_color).toBe('#02040a');

    const icons = manifest.icons ?? [];
    expect(
      icons.some(
        (icon) =>
          icon.src === '/icons/funcione-milex-app-icon-192.png' &&
          icon.sizes === '192x192' &&
          icon.type === 'image/png',
      ),
    ).toBe(true);
    expect(
      icons.some(
        (icon) =>
          icon.src === '/icons/funcione-milex-app-icon-512.png' &&
          icon.sizes === '512x512' &&
          icon.type === 'image/png' &&
          icon.purpose === 'any maskable',
      ),
    ).toBe(true);

    for (const iconPath of [
      '/icons/funcione-milex-app-icon-48.png',
      '/icons/funcione-milex-app-icon-180.png',
      '/icons/funcione-milex-app-icon-192.png',
      '/icons/funcione-milex-app-icon-512.png',
      '/icons/funcione-milex-app-icon-1024.png',
      '/icons/funcione-milex-app-icon.png',
    ]) {
      const iconResponse = await request.get(iconPath);
      expect(iconResponse.ok()).toBe(true);
      expect(iconResponse.headers()['content-type']).toContain('image/png');
    }

  });

  test('does not fail when a stale browser asks for the development service worker', async ({
    request,
  }) => {
    rmSync(devPwaBuildDir, { force: true, recursive: true });

    const serviceWorkerResponse = await request.get('/dev-sw.js?dev-sw');
    const serviceWorkerBody = await serviceWorkerResponse.text();

    expect(serviceWorkerResponse.status()).not.toBe(500);
    expect(serviceWorkerBody).not.toContain('ENOENT');
  });

  test('does not register a development service worker from the app shell', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__funcioneServiceWorkerRegistrations = [];
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register: (scriptURL: string | URL) => {
            window.__funcioneServiceWorkerRegistrations?.push(
              String(scriptURL),
            );

            return Promise.resolve({});
          },
        },
      });
    });

    await page.goto('/login?pwa=1');
    await page.waitForLoadState('load');
    await page.waitForTimeout(100);

    await expect
      .poll(() =>
        page.evaluate(
          () => window.__funcioneServiceWorkerRegistrations?.length ?? 0,
        ),
      )
      .toBe(0);
  });

  test('clears stale service workers while running in development', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__funcioneServiceWorkerRegistrations = [];
      window.__funcioneServiceWorkerUnregisters = 0;
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistrations: () =>
            Promise.resolve([
              {
                unregister: () => {
                  window.__funcioneServiceWorkerUnregisters =
                    (window.__funcioneServiceWorkerUnregisters ?? 0) + 1;

                  return Promise.resolve(true);
                },
              },
            ]),
          register: (scriptURL: string | URL) => {
            window.__funcioneServiceWorkerRegistrations?.push(
              String(scriptURL),
            );

            return Promise.resolve({});
          },
        },
      });
    });

    await page.goto('/login');
    await page.waitForLoadState('load');

    await expect
      .poll(() =>
        page.evaluate(() => window.__funcioneServiceWorkerUnregisters ?? 0),
      )
      .toBe(1);
    expect(
      await page.evaluate(
        () => window.__funcioneServiceWorkerRegistrations?.length ?? 0,
      ),
    ).toBe(0);
  });
});
