# AdSense Site Verification Fix

## Objetivo

Fazer o AdSense verificar o site publicado com as mudancas de anuncios realmente acessiveis ao crawler.

## Causa Raiz

- `https://funcione.pages.dev/ads.txt` estava retornando HTML de outro conteudo, nao o `ads.txt` do Funcione.
- O workflow de frontend estava usando `wrangler deploy`, que publicou o app em `https://funcione.john-lenon-dev.workers.dev`.
- A operacao e a `.env.production` esperavam `https://funcione.pages.dev`, criando desalinhamento entre dominio verificado e dominio publicado.
- O workflow `30653369345` confirmou que o projeto Pages `funcione` nao existe na conta Cloudflare usada pelo CI. Como `funcione.pages.dev` ja responde com outro conteudo publico, esse nome nao deve ser usado como alvo de producao do Funcione.

## Abordagem

- Criar/publicar um Cloudflare Pages project temporario chamado `funcione-milex`, gerando `https://funcione-milex.pages.dev`.
- Publicar o build do frontend com `wrangler pages deploy dist --project-name=funcione-milex --branch=main`.
- Configurar `VITE_AUTH_REDIRECT_URL=https://funcione-milex.pages.dev` para o deploy temporario.
- Adicionar a meta tag `google-adsense-account` no HTML base para que a verificacao nao dependa de React, login ou slots autenticados.
- Verificar o AdSense usando `https://funcione-milex.pages.dev` ate existir dominio proprio.

## Arquivos Afetados

- `.github/workflows/deploy-frontend.yml`
- `.env.production`
- `.gitignore`
- `apps/frontend/package.json`
- `apps/frontend/index.html`
- `apps/frontend/e2e/adsense-display.spec.ts`
- `docs/authentication.md`
- `docs/superpowers/plans/2026-07-31-auth-redirect-and-ads-env.md`
- `docs/superpowers/specs/2026-07-30-google-adsense-display-design.md`

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
- [x] Fazer push da correcao de alvo.
- [x] Rerodar o workflow `Deploy frontend`.
- [x] Validar `https://funcione.john-lenon-dev.workers.dev/ads.txt` apos o deploy.
- [x] Validar meta tag `google-adsense-account` no HTML publico do Worker.
- [x] Configurar workflow para criar/publicar Pages project `funcione-milex`.
- [x] Atualizar redirect de producao para `https://funcione-milex.pages.dev`.
- [x] Rodar E2E focado de AdSense.
- [x] Rodar build do frontend.
- [x] Fazer commit da alternativa temporaria Pages.
- [ ] Fazer push da alternativa temporaria Pages.
- [ ] Validar `https://funcione-milex.pages.dev/ads.txt` apos o deploy.
- [ ] Validar meta tag `google-adsense-account` no HTML publico do Pages.

## Estado Em 2026-07-31

O workflow `30653369345` compilou com sucesso, mas falhou em `wrangler pages deploy dist --project-name=funcione --branch=main` com `Authentication error [code: 10000]` ao acessar `/pages/projects/funcione`. O token atual autentica no Cloudflare e ja publicava Workers, mas nao esta autorizado para Cloudflare Pages.

Em nova execucao com o token ajustado, o Cloudflare passou a retornar: `The Pages project "funcione" does not exist`. Isso invalida o alvo `funcione.pages.dev` para esta conta.

O workflow `30654540777` publicou com sucesso usando `wrangler deploy`. Depois do deploy, `https://funcione.john-lenon-dev.workers.dev/ads.txt` retornou `text/plain` com a linha do publisher, e o HTML publico da home retornou a meta tag `google-adsense-account` com `ca-pub-6699167964598590`.

O AdSense recusou `https://funcione.john-lenon-dev.workers.dev` como novo site e reduziu a sugestao para `john-lenon-dev.workers.dev`, que nao resolve DNS. A opcao temporaria escolhida passa a ser Cloudflare Pages em `https://funcione-milex.pages.dev`.

## Verificacao Esperada

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- adsense-display.spec.ts -g "reads public AdSense config"
rtk npm run build --workspace @langchain-training/frontend
rtk gh run list --workflow deploy-frontend.yml --limit 1
rtk curl -sS https://funcione-milex.pages.dev/ads.txt
```
