# AdSense Site Verification Fix

## Objetivo

Fazer o AdSense verificar o site publicado em `https://funcione.pages.dev` com as mudancas de anuncios realmente acessiveis ao crawler.

## Causa Raiz

- `https://funcione.pages.dev/ads.txt` estava retornando HTML de outro conteudo, nao o `ads.txt` do Funcione.
- O workflow de frontend estava usando `wrangler deploy`, que publicou o app em `https://funcione.john-lenon-dev.workers.dev`.
- A operacao e a `.env.production` esperavam `https://funcione.pages.dev`, criando desalinhamento entre dominio verificado e dominio publicado.

## Abordagem

- Manter `funcione.pages.dev` como URL de producao planejada.
- Publicar o build do frontend no Cloudflare Pages `funcione` usando `wrangler pages deploy dist --project-name=funcione --branch=main`.
- Adicionar a meta tag `google-adsense-account` no HTML base para que a verificacao nao dependa de React, login ou slots autenticados.

## Arquivos Afetados

- `.github/workflows/deploy-frontend.yml`
- `.gitignore`
- `apps/frontend/package.json`
- `apps/frontend/index.html`
- `apps/frontend/e2e/adsense-display.spec.ts`

## Checklist

- [x] Reproduzir o erro publico em `https://funcione.pages.dev/ads.txt`.
- [x] Confirmar que o deploy atual publicou em `workers.dev`.
- [x] Adicionar teste E2E para a meta tag de verificacao no HTML base.
- [x] Ver o teste falhar sem a meta tag.
- [x] Adicionar meta tag `google-adsense-account`.
- [x] Ajustar workflow para Cloudflare Pages.
- [x] Rodar E2E focado de AdSense.
- [x] Rodar build do frontend.
- [ ] Fazer commit e push para disparar o deploy.
- [ ] Validar `https://funcione.pages.dev/ads.txt` apos o deploy.

## Verificacao Esperada

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts -g "reads public AdSense config"
rtk npm run build --workspace @langchain-training/frontend
rtk gh run list --workflow deploy-frontend.yml --limit 1
rtk curl -sS https://funcione.pages.dev/ads.txt
```
