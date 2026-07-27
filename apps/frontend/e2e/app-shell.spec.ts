import { expect, test } from '@playwright/test';

test.describe('Funcione app shell', () => {
  test('shows a translated sport toast for invalid credentials without leaking provider text', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'funcione-mock-auth-scenario',
        JSON.stringify({
          signInWithPassword: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid login credentials',
          },
        }),
      );
    });

    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill('athlete@funcione.app');
    await page.getByLabel(/senha/i).fill('WrongPass123!');
    await page.getByRole('button', { name: /^entrar$/i }).click();

    const toast = page.getByRole('status', {
      name: /feedback do sistema/i,
    });
    await expect(toast).toContainText(/E-mail ou senha invalidos/i);
    await expect(page.getByTestId('app-toast-sport-icon')).toBeVisible();
    await expect(page.getByText(/Invalid login credentials/i)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('desktop auth pages stay balanced and use a standard Google button', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only layout');

    await page.setViewportSize({ height: 1264, width: 1313 });
    await page.goto('/login');

    const loginHeading = page.getByRole('heading', {
      name: /entrar no funcione/i,
    });
    await expect(loginHeading).toBeVisible();
    const loginHeadingBox = await loginHeading.boundingBox();
    expect(loginHeadingBox?.y).toBeLessThan(640);

    const authCard = loginHeading.locator(
      'xpath=ancestor::*[contains(@class, "border-primary/25")]',
    );
    const authCardBox = await authCard.boundingBox();

    const productLogo = page.getByTestId('auth-product-logo');
    await expect(productLogo).toBeVisible();
    await expect(productLogo).toHaveAttribute(
      'src',
      /\/brand\/funcione-logo-transparent\.png$/,
    );
    const productLogoBox = await productLogo.boundingBox();
    expect(productLogoBox?.width).toBeGreaterThan(
      (authCardBox?.width ?? 0) * 0.85,
    );
    expect((productLogoBox?.y ?? 0) + (productLogoBox?.height ?? 0)).toBeLessThan(
      (authCardBox?.y ?? 0) - 12,
    );

    const milexLogo = page.getByTestId('auth-milex-logo');
    await expect(milexLogo).toBeVisible();
    await expect(authCard.getByTestId('auth-milex-logo')).toBeVisible();
    await expect(milexLogo).toHaveAttribute(
      'src',
      /\/brand\/milex-logo-transparent\.png$/,
    );
    const milexLogoBox = await milexLogo.boundingBox();
    expect(milexLogoBox?.x ?? 0).toBeGreaterThan(
      (loginHeadingBox?.x ?? 0) + (loginHeadingBox?.width ?? 0),
    );
    expect(milexLogoBox?.y ?? 0).toBeLessThan(
      (loginHeadingBox?.y ?? 0) + (loginHeadingBox?.height ?? 0),
    );

    await expect(page.getByTestId('auth-product-logo')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /idioma|language/i }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /tema/i })).toHaveCount(0);
    const settingsButton = page.getByRole('button', {
      name: /configuracoes|settings/i,
    });
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await settingsButton.click();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('menu', { name: /configuracoes|settings/i }),
    ).toBeVisible();

    const googleButton = page.getByRole('button', {
      name: /continuar com google/i,
    });
    await expect(googleButton.getByRole('img', { name: 'Google' })).toBeVisible();
    await expect(googleButton).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );

    await page.getByRole('link', { name: /criar conta/i }).click();
    await expect(page).toHaveURL(/\/signup$/);

    const signupHeading = page.getByRole('heading', { name: /criar cadastro/i });
    await expect(signupHeading).toBeVisible();
    const signupHeadingBox = await signupHeading.boundingBox();
    expect(signupHeadingBox?.y).toBeLessThan(420);
    const signupCard = signupHeading.locator(
      'xpath=ancestor::*[contains(@class, "border-primary/25")]',
    );
    await expect(signupCard.getByTestId('auth-milex-logo')).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(1314);
  });

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
    await expect(
      page.getByRole('heading', { name: /solicitar treino|request workout/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('main').getByText('athlete@funcione.app').last(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /solicitar treino|request workout/i }),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);

    await page.getByRole('button', { name: /configuracoes|settings/i }).click();
    const themeButton = page.getByRole('button', { name: /tema/i });
    await themeButton.click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await themeButton.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const languageButton = page.getByRole('button', { name: /idioma|language/i });
    await languageButton.click();

    await expect(
      page.getByRole('link', { name: /request workout|solicitar treino/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /solicitar treino|request workout/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /sair|sign out/i }).first().click();
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
      page.getByRole('main').getByText('athlete@funcione.app').last(),
    ).toBeVisible();

    const passwordSignupProfiles = await page.evaluate(() =>
      JSON.parse(
        window.localStorage.getItem('funcione-mock-registration-profiles') ??
          '{}',
      ),
    );
    const passwordSignupProfileValues = Object.values(passwordSignupProfiles);
    expect(passwordSignupProfileValues).toHaveLength(1);
    expect(passwordSignupProfileValues[0]).not.toHaveProperty('password');
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
      page.getByRole('main').getByText('google@funcione.app').last(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /solicitar treino|request workout/i }),
    ).toBeVisible();

    const savedProfiles = await page.evaluate(() =>
      JSON.parse(
        window.localStorage.getItem('funcione-mock-registration-profiles') ??
          '{}',
      ),
    );
    const savedProfileValues = Object.values(savedProfiles);
    expect(savedProfileValues).toHaveLength(1);
    expect(savedProfileValues[0]).not.toHaveProperty('password');

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('desktop dashboard shell uses only real navigation and state', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only layout');

    await page.setViewportSize({ height: 1264, width: 1313 });
    await page.goto('/signup');
    await page.getByLabel(/^nome$/i).fill('Desktop');
    await page.getByLabel(/sobrenome/i).fill('Atleta');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1994-08-20');
    await page.getByLabel(/telefone/i).fill('11999999999');
    await page.getByLabel(/e-mail/i).fill('desktop@funcione.app');
    await page.getByLabel(/senha/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: /solicitar treino|request workout/i }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /progresso do treino|workout progress|68%|carga|load|impacto|impact|resumo da semana|weekly summary|aterrissagem controlada|controlled landing/i,
      ),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: /historico|history/i }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /sair|sign out/i })).toHaveCount(
      1,
    );
    await expect(page.getByRole('main').getByAltText(/funcione/i)).toBeHidden();
    await expect(page.locator('aside img').first()).toHaveAttribute(
      'src',
      /\/brand\/funcione-logo-transparent\.png$/,
    );

    const footer = page.getByRole('contentinfo', { name: /rodape|footer/i });
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole('link', { name: /termos de uso|terms of use/i }),
    ).toHaveAttribute('href', '/terms');
    await expect(
      footer.getByRole('link', {
        name: /politica de privacidade|privacy policy/i,
      }),
    ).toHaveAttribute('href', '/privacy');
    await expect(footer.getByTestId('footer-milex-logo')).toHaveAttribute(
      'src',
      /\/brand\/milex-logo-transparent\.png$/,
    );
    await footer
      .getByRole('link', { name: /termos de uso|terms of use/i })
      .click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(
      page.getByRole('heading', { name: /termos de uso|terms of use/i }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page
      .getByRole('contentinfo', { name: /rodape|footer/i })
      .getByRole('link', {
        name: /politica de privacidade|privacy policy/i,
      })
      .click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole('heading', {
        name: /politica de privacidade|privacy policy/i,
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);

    const sidebarBox = await page.locator('aside').first().boundingBox();
    expect(sidebarBox?.height).toBeGreaterThan(1120);

    const profileLink = page.getByRole('link', { name: /^perfil$|^profile$/i });
    await expect(profileLink).toHaveAttribute('href', '/profile');

    const requestWorkout = page.getByRole('link', {
      name: /solicitar treino|request workout/i,
    });
    await expect(requestWorkout).toHaveAttribute('href', '/training');
    await requestWorkout.click();
    await expect(page).toHaveURL(/\/training$/);
  });

  test('polishes the athlete shell with name greeting and settings menu', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only layout');

    await page.setViewportSize({ height: 1264, width: 1313 });
    await page.goto('/signup');
    await page.getByLabel(/^nome$/i).fill('John');
    await page.getByLabel(/sobrenome/i).fill('Lenon Oliveira da Silva');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1994-08-20');
    await page.getByLabel(/telefone/i).fill('11999999999');
    await page.getByLabel(/e-mail/i).fill('john-shell@funcione.app');
    await page.getByLabel(/senha/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('banner').getByText('John Lenon Oliveira da Silva'),
    ).toBeVisible();
    await expect(
      page.getByRole('banner').getByText('john-shell@funcione.app'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', {
        name: /pronto para deixar sua vida mais facil/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/vamos treinar/i)).toBeVisible();

    await expect(
      page.getByRole('button', { name: /idioma|language/i }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /tema/i })).toHaveCount(0);
    const settingsButton = page.getByRole('button', {
      name: /configuracoes|settings/i,
    });
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await settingsButton.click();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menu', { name: /configuracoes/i })).toBeVisible();
    await page.getByRole('button', { name: /tema/i }).click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await page.getByRole('link', { name: /^perfil$/i }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('main').getByText('by MileX')).toHaveCount(0);
    const profileCards = page
      .getByRole('main')
      .locator('section.mt-5 > div.grid > div.rounded-2xl');
    await expect(profileCards).toHaveCount(2);
    const firstCardBox = await profileCards.nth(0).boundingBox();
    const secondCardBox = await profileCards.nth(1).boundingBox();
    expect(secondCardBox?.y ?? 0).toBeGreaterThan(
      (firstCardBox?.y ?? 0) + (firstCardBox?.height ?? 0),
    );
  });

  test('opens the athlete profile route from dashboard navigation', async ({
    page,
  }) => {
    await page.goto('/signup');
    await page.getByLabel(/^nome$/i).fill('Perfil');
    await page.getByLabel(/sobrenome/i).fill('Atleta');
    await page.getByLabel(/cpf/i).fill('52998224725');
    await page.getByLabel(/data de nascimento/i).fill('1994-08-20');
    await page.getByLabel(/telefone/i).fill('11999999999');
    await page.getByLabel(/e-mail/i).fill('profile@funcione.app');
    await page.getByLabel(/senha/i).fill('StrongPass123!');
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('link', { name: /^perfil$/i }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(
      page.getByRole('heading', { name: /perfil do atleta|athlete profile/i }),
    ).toBeVisible();
    await expect(page.getByRole('main').getByText('profile@funcione.app').last()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /perfil atletico|athletic profile/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /solicitar treino|request workout/i }),
    ).toBeVisible();
  });

  test('opens localized public legal documents', async ({ page }) => {
    await page.goto('/terms');

    await expect(page).toHaveURL(/\/terms$/);
    await expect(
      page.getByRole('heading', { name: /termos de uso/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/planos de treino gerados por inteligencia artificial/i),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /voltar para login/i }))
      .toHaveAttribute('href', '/login');

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);

    await page.getByRole('button', { name: /configuracoes/i }).click();
    await page.getByRole('button', { name: /idioma/i }).click();
    await expect(
      page.getByRole('heading', { name: /terms of use/i }),
    ).toBeVisible();
    await expect(page.getByText(/AI-generated training plans/i)).toBeVisible();

    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole('heading', { name: /privacy policy/i }),
    ).toBeVisible();
    await expect(page.getByText(/sport profile/i)).toBeVisible();
  });
});
