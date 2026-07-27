# Legal Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar rotas publicas de Termos de uso e Politica de privacidade com conteudo localizavel em arquivos substituiveis.

**Architecture:** O frontend adiciona um modulo `legal/` com arquivos Markdown por documento e idioma, um resolver de documento e uma tela React reutilizavel. As rotas `/terms` e `/privacy` ficam publicas dentro do `BrowserRouter`, e o footer passa a navegar com `Link` para manter SPA routing.

**Tech Stack:** React, React Router, Vite raw imports, i18next, Tailwind CSS, Playwright.

## Global Constraints

- Desenvolvimento deve seguir TDD: escrever teste, ver falhar, implementar, ver passar.
- Layout deve ser mobile first e sem overflow horizontal.
- Conteudo deve existir em `pt-BR` e `en-US`.
- Troca futura dos textos deve exigir apenas substituir os arquivos Markdown do documento/idioma.
- Rotas de termos e privacidade devem ser publicas, acessiveis com ou sem usuario autenticado.
- Nao ha mudanca de API, portanto OpenAPI nao se aplica.
- O texto juridico e um modelo inicial do produto e deve passar por revisao juridica antes de uso formal.

---

### Task 1: Public Legal Routes

**Files:**
- Modify: `apps/frontend/e2e/app-shell.spec.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/components/app-shell.tsx`
- Create: `apps/frontend/src/components/legal-document-screen.tsx`
- Create: `apps/frontend/src/legal/legal-documents.ts`
- Create: `apps/frontend/src/legal/documents/pt-BR/terms.md`
- Create: `apps/frontend/src/legal/documents/pt-BR/privacy.md`
- Create: `apps/frontend/src/legal/documents/en-US/terms.md`
- Create: `apps/frontend/src/legal/documents/en-US/privacy.md`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`

**Interfaces:**
- Produces: public React Router paths `/terms` and `/privacy`.
- Produces: `getLegalDocument(document, language)` returning `{ title: string; updatedAt: string; body: string }`.
- Produces: `LegalDocumentScreen` receiving `document="terms" | "privacy"`.

- [x] **Step 1: Write the failing E2E test**

Add a Playwright test that:

```ts
await page.goto('/terms');
await expect(page.getByRole('heading', { name: /termos de uso/i })).toBeVisible();
await expect(page.getByText(/planos de treino gerados por inteligencia artificial/i)).toBeVisible();

await page.getByRole('button', { name: /configuracoes/i }).click();
await page.getByRole('button', { name: /idioma/i }).click();
await expect(page.getByRole('heading', { name: /terms of use/i })).toBeVisible();
await expect(page.getByText(/AI-generated training plans/i)).toBeVisible();

await page.goto('/privacy');
await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
await expect(page.getByText(/sport profile/i)).toBeVisible();
```

Extend the footer test to click `Termos de uso` and `Politica de privacidade` and assert the user lands on `/terms` and `/privacy`.

- [x] **Step 2: Run focused E2E and verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "legal documents|desktop dashboard shell"
```

Expected: FAIL because `/terms` and `/privacy` currently hit the wildcard route.

- [x] **Step 3: Add legal Markdown files**

Create four files under `apps/frontend/src/legal/documents/<language>/` with stable headings, dates, and project-specific model text.

- [x] **Step 4: Add legal document resolver**

Create `apps/frontend/src/legal/legal-documents.ts` importing the Markdown files with `?raw`, parsing the first H1, updated line, and body.

- [x] **Step 5: Add legal document screen**

Create `LegalDocumentScreen` with mobile-first layout, product/MileX branding, `SettingsMenu`, `Back` link, and a simple renderer for the controlled Markdown subset.

- [x] **Step 6: Wire routes and footer links**

Add public routes before the wildcard in `App.tsx` and replace footer `<a>` tags with React Router `Link`.

- [x] **Step 7: Run focused E2E and verify GREEN**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "legal documents|desktop dashboard shell"
```

Expected: PASS.

- [x] **Step 8: Run full verification**

Run from repository root:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected: all pass with no whitespace errors.
