import { expect, test } from '@playwright/test';

test.describe('Funcione app shell', () => {
  test('shows brand, toggles theme, and switches language', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Funcione' }),
    ).toBeVisible();
    await expect(page.getByRole('main').getByText('by MileX')).toBeVisible();
    const productLogo = page.getByRole('main').getByRole('img', {
      name: /logo oficial do funcione/i,
    });
    await expect(productLogo).toBeVisible();
    await expect(productLogo).toHaveAttribute(
      'src',
      /\/brand\/funcione-logo\.png$/,
    );
    const logoAspectRatio = await productLogo.evaluate((node) => {
      const image = node as HTMLImageElement;
      return image.naturalWidth / image.naturalHeight;
    });
    expect(logoAspectRatio).toBeGreaterThan(1.3);
    await expect(page.getByRole('button', { name: /iniciar treino/i })).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);

    const themeButton = page.getByRole('button', { name: /tema/i });
    await themeButton.click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await page.getByRole('button', { name: /tema/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const languageButton = page.getByRole('button', { name: /idioma|language/i });
    await languageButton.click();

    await expect(
      page.getByRole('button', { name: /start workout|iniciar treino/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Funcione' }),
    ).toBeVisible();
  });
});
