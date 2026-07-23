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
    await expect(
      page.getByRole('link', { name: /inicio/i }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByRole('link', { name: /treino/i }).click();

    await expect(page).toHaveURL(/\/training$/);
    await expect(
      page.getByRole('heading', { name: /novo plano de treino/i }),
    ).toBeVisible();
  });

  test('fills the mobile wizard and generates an active plan', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel(/^nome$/i).fill('Joao');
    await page.getByLabel(/sobrenome/i).fill('Silva');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1996-07-20');
    await page.getByLabel(/telefone/i).fill('11999999999');
    await page.getByLabel(/e-mail/i).fill('wizard@funcione.app');
    await page.getByLabel(/senha/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^criar conta$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('link', { name: /treino/i }).click();
    await expect(page).toHaveURL(/\/training$/);

    await page.getByRole('button', { name: /volei/i }).click();
    await page.getByRole('button', { name: /performance/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await page.getByLabel(/peso/i).fill('82');
    await page.getByLabel(/altura/i).fill('180');
    await page.getByRole('button', { name: /intermediario/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await page.getByRole('button', { name: /3x por semana/i }).click();
    await page.getByRole('button', { name: /60 minutos/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await page.getByRole('button', { name: /casa/i }).click();
    await page.getByRole('button', { name: /halteres/i }).click();
    await page.getByRole('button', { name: /nao tenho lesao/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await expect(page.getByText(/revisao/i)).toBeVisible();
    await page.getByRole('button', { name: /gerar plano/i }).click();

    await expect(page.getByRole('heading', { name: /plano ativo/i })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
