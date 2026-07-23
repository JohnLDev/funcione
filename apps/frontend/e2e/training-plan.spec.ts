import { expect, test } from '@playwright/test';

test.describe('monthly training plan route', () => {
  test('opens the training route from dashboard navigation', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel(/^nome$/i).fill('Joao');
    await page.getByLabel(/sobrenome/i).fill('Silva');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1996-07-20');
    await page.getByLabel(/telefone/i).fill('11999999999');
    await page.getByLabel(/e-mail/i).fill('athlete@funcione.app');
    await page.getByLabel(/senha/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    const mobileNavigation = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await expect(mobileNavigation.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(
      mobileNavigation.getByRole('link', { name: /inicio/i }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByRole('link', { name: /treino/i }).click();

    await expect(page).toHaveURL(/\/training$/);
    await expect(
      page.getByRole('heading', { name: /novo plano de treino/i }),
    ).toBeVisible();
  });
});
