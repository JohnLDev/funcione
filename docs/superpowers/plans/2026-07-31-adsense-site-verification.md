# AdSense Site Verification Fix

## Objetivo

Fazer o AdSense verificar o site publicado com as mudancas de anuncios realmente acessiveis ao crawler.

## Causa Raiz

- `https://funcione.pages.dev/ads.txt` estava retornando HTML de outro conteudo, nao o `ads.txt` do Funcione.
- O workflow de frontend estava usando `wrangler deploy`, que publicou o app em `https://funcione.john-lenon-dev.workers.dev`.
- A operacao e a `.env.production` esperavam `https://funcione.pages.dev`, criando desalinhamento entre dominio verificado e dominio publicado.
- O workflow `30653369345` confirmou que o projeto Pages `funcione` nao existe na conta Cloudflare usada pelo CI. Como `funcione.pages.dev` ja responde com outro conteudo publico, esse nome nao deve ser usado como alvo de producao do Funcione.

## Abordagem

- Usar o Worker existente `https://funcione.john-lenon-dev.workers.dev` como URL publica imediata.
- Publicar o build do frontend com `wrangler deploy`, mantendo o `wrangler.jsonc` atual de Workers Assets.
- Deixar `VITE_AUTH_REDIRECT_URL` sem default hardcoded para `pages.dev`, permitindo fallback para `window.location.origin` no deploy atual e em localhost.
- Adicionar a meta tag `google-adsense-account` no HTML base para que a verificacao nao dependa de React, login ou slots autenticados.
- Verificar o AdSense usando `https://funcione.john-lenon-dev.workers.dev` ate existir dominio proprio ou Pages project com nome disponivel.

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
- [x] Tentar ajustar workflow para Cloudflare Pages.
- [x] Rodar E2E focado de AdSense.
- [x] Rodar build do frontend.
- [x] Fazer commit e push para disparar o deploy.
- [x] Identificar que o projeto Pages `funcione` nao existe na conta.
- [x] Voltar workflow para deploy no Worker existente.
- [x] Remover default `funcione.pages.dev` do redirect de producao.
- [x] Fazer commit da correcao de alvo.
- [ ] Fazer push da correcao de alvo.
- [ ] Rerodar o workflow `Deploy frontend`.
- [ ] Validar `https://funcione.john-lenon-dev.workers.dev/ads.txt` apos o deploy.
- [ ] Validar meta tag `google-adsense-account` no HTML publico do Worker.

## Estado Em 2026-07-31

O workflow `30653369345` compilou com sucesso, mas falhou em `wrangler pages deploy dist --project-name=funcione --branch=main` com `Authentication error [code: 10000]` ao acessar `/pages/projects/funcione`. O token atual autentica no Cloudflare e ja publicava Workers, mas nao esta autorizado para Cloudflare Pages.

Em nova execucao com o token ajustado, o Cloudflare passou a retornar: `The Pages project "funcione" does not exist`. Isso invalida o alvo `funcione.pages.dev` para esta conta.

## Verificacao Esperada

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts -g "reads public AdSense config"
rtk npm run build --workspace @langchain-training/frontend
rtk gh run list --workflow deploy-frontend.yml --limit 1
rtk curl -sS https://funcione.john-lenon-dev.workers.dev/ads.txt
```
