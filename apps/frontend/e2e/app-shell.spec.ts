import { expect, test } from '@playwright/test';

test.describe('Funcione app shell', () => {
  test('starts on sign-in instead of registration when a stale mock session exists', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'funcione-mock-session',
        JSON.stringify({
          accessToken: 'google-Z29vZ2xlQGZ1bmNpb25lLmFwcA==-mock-token',
          user: {
            email: 'google@funcione.app',
            firstName: 'Google',
            fullName: 'Google Atleta',
            id: 'google-stale-user',
            lastName: 'Atleta',
            phoneNumber: null,
            provider: 'google',
          },
        }),
      );
      window.localStorage.removeItem('funcione-mock-registration-profiles');
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);

    await expect(
      page.getByRole('heading', { name: /entrar no funcione/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /complete seu cadastro/i }),
    ).toHaveCount(0);
  });

  test('creates a password account with required registration data and signs in again', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: /entrar no funcione/i }),
    ).toBeVisible();
    await page.getByRole('link', { name: /criar conta/i }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole('heading', { name: /criar cadastro/i }),
    ).toBeVisible();
    await page.goBack();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: /entrar no funcione/i }),
    ).toBeVisible();
    await page.getByRole('link', { name: /criar conta/i }).click();
    await expect(page).toHaveURL(/\/signup$/);

    await page.getByLabel(/^nome$/i).fill('Joao');
    await page.getByLabel(/sobrenome/i).fill('Silva');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1994-08-20');
    await page.getByLabel(/telefone/i).fill('11999999999');
    await page.getByLabel(/e-mail/i).fill('athlete@funcione.app');
    await page.getByLabel(/senha/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('main').getByText('by MileX')).toBeVisible();
    await expect(
      page.getByRole('main').getByText('athlete@funcione.app'),
    ).toBeVisible();
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

    await page
      .getByRole('main')
      .getByRole('button', { name: /sair|sign out/i })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', {
        name: /entrar no funcione|sign in to funcione/i,
      }),
    ).toBeVisible();

    await page.getByLabel(/e-mail|email/i).fill('athlete@funcione.app');
    await page.getByLabel(/senha|password/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^entrar$|^sign in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('main').getByText('athlete@funcione.app'),
    ).toBeVisible();
  });

  test('requires missing registration data after a new Google login', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: /entrar no funcione/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /continuar com google/i }).click();

    await expect(page).toHaveURL(/\/complete-profile$/);
    await expect(
      page.getByRole('heading', { name: /complete seu cadastro/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toHaveValue('google@funcione.app');
    await page.getByLabel(/^nome$/i).fill('Google');
    await page.getByLabel(/sobrenome/i).fill('Atleta');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1995-02-10');
    await page.getByLabel(/telefone/i).fill('11988887777');
    await page.getByRole('button', { name: /salvar cadastro/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('main').getByText('google@funcione.app'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar treino/i })).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
