# Auth Entry Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar a tela de login para usar a marca Funcione como elemento visual de fundo e mover idioma/tema para um menu de configuracoes discreto.

**Architecture:** A tela de auth continua sendo um componente React unico em `AuthScreen`, reaproveitando `SettingsMenu` ja usado no app autenticado. A validacao fica em Playwright, cobrindo o comportamento visual desktop e preservando o botao Google padrao.

**Tech Stack:** React, Vite, Tailwind CSS, Playwright, i18next.

## Global Constraints

- Desenvolvimento deve seguir TDD: escrever teste, ver falhar, implementar, ver passar.
- Layout deve ser mobile first e sem overflow horizontal.
- Controles de idioma e tema devem ficar agrupados em configuracoes, sem aparecer como dois botoes soltos.
- A logo no login deve deixar de ser um item pequeno de cabecalho e virar elemento visual amplo acima/atras do formulario.
- Nao ha mudanca de API, portanto OpenAPI nao se aplica.

---

### Task 1: Auth Entry Composition

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Verify: `docs/superpowers/plans/2026-07-24-auth-entry-polish.md`

**Interfaces:**
- Consumes: `SettingsMenu` from `apps/frontend/src/components/settings-menu.tsx`.
- Produces: `data-testid="auth-brand-backdrop"` as a decorative auth brand landmark for E2E validation.

- [x] **Step 1: Write the failing E2E test**

Update `desktop auth pages stay balanced and use a standard Google button` to assert:

```ts
const brandBackdrop = page.getByTestId('auth-brand-backdrop');
await expect(brandBackdrop).toBeVisible();
const brandBackdropBox = await brandBackdrop.boundingBox();
expect(brandBackdropBox?.width).toBeGreaterThan(360);
expect(brandBackdropBox?.height).toBeGreaterThan(140);
expect(brandBackdropBox?.y).toBeLessThan(loginHeadingBox?.y ?? 9999);

await expect(page.getByRole('main').getByAltText(/logo/i)).toHaveCount(0);
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
await expect(page.getByRole('menu', { name: /configuracoes|settings/i })).toBeVisible();
```

- [x] **Step 2: Run focused E2E and verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
```

Expected: FAIL because `auth-brand-backdrop` does not exist and auth still renders the direct language/theme buttons.

- [x] **Step 3: Implement the auth layout**

Update `AuthScreen` to:

```tsx
import { SettingsMenu } from './settings-menu.js';

<div className="min-h-dvh overflow-x-hidden px-4 py-4 sm:px-6">
  <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
    <SettingsMenu />
  </div>
  <main className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col justify-center py-16 sm:max-w-lg sm:py-20">
    <img
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[8dvh] z-0 h-44 w-[min(92vw,34rem)] -translate-x-1/2 object-contain opacity-25 drop-shadow-[0_28px_68px_rgba(0,120,255,0.4)] sm:h-56 lg:top-[10dvh]"
      data-testid="auth-brand-backdrop"
      src="/brand/funcione-logo.png"
    />
    <Card className="relative z-10 mt-36 rounded-[2rem] border-primary/25 bg-card/92 shadow-xl sm:mt-44">
      ...
    </Card>
  </main>
</div>
```

Remove direct `ProductLogo`, `LanguageToggle`, and `ThemeToggle` usage from the login/signup auth header.

- [x] **Step 4: Run focused E2E and verify GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
```

Expected: PASS.

- [x] **Step 5: Run full verification**

Run from repository root:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected: all pass with no whitespace errors.

---

### Task 2: Brand Backdrop Emphasis

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Verify: `docs/superpowers/plans/2026-07-24-auth-entry-polish.md`

**Interfaces:**
- Consumes: `data-testid="auth-brand-backdrop"` created in Task 1.
- Produces: a more prominent decorative logo layer behind the auth card.

- [x] **Step 1: Write the failing E2E test**

Update `desktop auth pages stay balanced and use a standard Google button` to assert:

```ts
const authCard = loginHeading.locator('xpath=ancestor::*[contains(@class, "border-primary/25")]');
const authCardBox = await authCard.boundingBox();
expect(brandBackdropBox?.width).toBeGreaterThan((authCardBox?.width ?? 0) + 140);
expect(brandBackdropBox?.height).toBeGreaterThan(260);
const brandImageOpacity = await brandBackdrop
  .locator('img')
  .evaluate((element) => Number(window.getComputedStyle(element).opacity));
expect(brandImageOpacity).toBeGreaterThan(0.5);
```

- [x] **Step 2: Run focused E2E and verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
```

Expected: FAIL because the current brand backdrop is about the same width as the card and uses `opacity-30`.

- [x] **Step 3: Increase the brand layer**

Update `AuthScreen` to make `auth-brand-backdrop` wider/taller and increase image opacity while keeping `aria-hidden` and `alt=""`.

- [x] **Step 4: Run focused E2E and verify GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
```

Expected: PASS.

- [x] **Step 5: Run verification**

Run:

```bash
npm run typecheck
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
npm run build
git diff --check
```

Expected: all pass.

---

### Task 4: Card Co-Branding And App Footer

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Modify: `apps/frontend/src/components/product-logo.tsx`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Consumes: `data-testid="auth-product-logo"` and `data-testid="auth-milex-logo"` from Task 3.
- Produces: `data-testid="footer-milex-logo"` and a shell `<footer>` with terms and privacy links.

- [x] **Step 1: Write the failing E2E test**

Update `desktop auth pages stay balanced and use a standard Google button` to assert that `auth-milex-logo` is inside the auth card, aligned to the title row, and still uses `/brand/milex-logo-transparent.png`.

Update `desktop dashboard shell uses only real navigation and state` to assert that the sidebar logo uses `/brand/funcione-logo-transparent.png`, and that the app footer exposes terms, privacy, and `footer-milex-logo`.

- [x] **Step 2: Run focused E2E and verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages|desktop dashboard shell"
```

Expected: FAIL because MileX is outside the card, `ProductLogo` still uses the old asset, and the app shell has no footer.

- [x] **Step 3: Implement card co-branding**

Move the MileX transparent logo into `CardHeader` in `AuthScreen`, aligned with the title and constrained for mobile.

- [x] **Step 4: Implement transparent shell logo**

Update `ProductLogo` to use `/brand/funcione-logo-transparent.png` and remove the baked-in card-like background/border around the image.

- [x] **Step 5: Implement app footer**

Add a responsive footer to `AppShell` after the page content with links to `/terms` and `/privacy`, plus the smaller MileX transparent logo.

- [x] **Step 6: Run focused E2E and verify GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages|desktop dashboard shell"
```

Expected: PASS.

- [x] **Step 7: Run full verification**

Run from repository root:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected: all pass with no whitespace errors.

---

### Task 3: Transparent Logo Lockup

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/components/auth-screen.tsx`
- Create: `apps/frontend/public/brand/funcione-logo-transparent.png`
- Create: `apps/frontend/public/brand/milex-logo-transparent.png`
- Verify: `docs/superpowers/plans/2026-07-24-auth-entry-polish.md`

**Interfaces:**
- Consumes: the transparent PNGs supplied at `/Users/john/Downloads/WhatsApp Image Jun 20 2026.png` and `/Users/john/Downloads/WhatsApp Image Jun 20 2026 (1).png`.
- Produces: `data-testid="auth-product-logo"` and `data-testid="auth-milex-logo"` in the login/signup visual lockup.

- [x] **Step 1: Write the failing E2E test**

Update `desktop auth pages stay balanced and use a standard Google button` to assert:

```ts
const productLogo = page.getByTestId('auth-product-logo');
await expect(productLogo).toBeVisible();
await expect(productLogo).toHaveAttribute(
  'src',
  /\/brand\/funcione-logo-transparent\.png$/,
);
const productLogoBox = await productLogo.boundingBox();
expect(productLogoBox?.width).toBeGreaterThan((authCardBox?.width ?? 0) * 0.85);
expect((productLogoBox?.y ?? 0) + (productLogoBox?.height ?? 0)).toBeLessThan(
  (authCardBox?.y ?? 0) - 12,
);
await expect(page.getByTestId('auth-milex-logo')).toHaveAttribute(
  'src',
  /\/brand\/milex-logo-transparent\.png$/,
);
```

- [x] **Step 2: Run focused E2E and verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
```

Expected: FAIL because `auth-product-logo` does not exist and the current logo is behind the card.

- [x] **Step 3: Copy the transparent assets**

Copy:

```bash
cp "/Users/john/Downloads/WhatsApp Image Jun 20 2026.png" apps/frontend/public/brand/funcione-logo-transparent.png
cp "/Users/john/Downloads/WhatsApp Image Jun 20 2026 (1).png" apps/frontend/public/brand/milex-logo-transparent.png
```

- [x] **Step 4: Implement the separated auth lockup**

Update `AuthScreen` so the logo lockup is normal document flow above the card, not an absolute backdrop behind it. Keep settings in the top-right, keep the Google button standard, and preserve mobile-first spacing.

- [x] **Step 5: Run focused E2E and verify GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "desktop auth pages"
```

Expected: PASS.

- [x] **Step 6: Run full verification**

Run:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected: all pass.
