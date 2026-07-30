# Google AdSense Display Design

## Objetivo

Adicionar exibicao de anuncios do Google AdSense ao Funcione sem prejudicar o fluxo principal do atleta. A primeira versao usa posicionamento manual controlado, com foco no tempo ocioso da geracao de treino e em areas secundarias da pagina.

## Contexto

O frontend vive em `apps/frontend`, usa React, Vite, Cloudflare Pages e rotas autenticadas dentro do `AppShell`. A geracao mensal de treino ja e assincrona: depois da solicitacao, a tela mostra `TrainingPreparationProgress` enquanto o backend processa o job e o frontend acompanha por polling.

Esse estado de preparo e o melhor momento para monetizacao inicial, porque o usuario esta aguardando o treino ficar pronto e a tela ja comunica que ele pode manter a navegacao sem bloquear o sistema. Em contrapartida, o fluxo de execucao de treino exige foco, checklists e botoes de conclusao; anuncios ali aumentariam risco de distracao e clique acidental.

## Decisoes

- Usar Google AdSense, nao Google Ads, porque o objetivo e exibir anuncios no app web.
- Usar abordagem manual controlada na primeira versao.
- Carregar o script do AdSense uma unica vez no frontend quando anuncios estiverem habilitados.
- Renderizar slots por componentes proprios, em vez de copiar o snippet completo do AdSense em cada tela.
- Preparar segmentacao futura desde a primeira entrega com uma regra central de elegibilidade.
- Nao exibir anuncios em modais, bottom nav mobile, loading inicial curto, execucao ativa de treino ou pontos proximos a botoes de acao.
- Nao adicionar Auto ads nesta versao. Auto ads pode ser avaliado depois, com exclusoes e metricas de UX ja estabelecidas.

## Credenciais e configuracao

As credenciais abaixo sao publicas no contexto do AdSense; elas aparecem no HTML servido ao navegador e nao devem ser tratadas como segredo backend.

```env
VITE_ADS_ENABLED=true
VITE_ADSENSE_CLIENT_ID=ca-pub-6699167964598590
VITE_ADSENSE_SLOT_TRAINING_PREPARATION=9544709295
VITE_ADSENSE_SLOT_PRE_FOOTER=7261326735
VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR=6487869331
```

O arquivo `apps/frontend/public/ads.txt` deve conter:

```txt
google.com, pub-6699167964598590, DIRECT, f08c47fec0942fa0
```

O site de producao precisa estar aprovado no AdSense antes de esperar entrega real de anuncios. O dominio aprovado deve corresponder ao dominio publico usado pelos usuarios, como `funcione.pages.dev` ou o dominio proprio final, conforme decisao operacional.

## Slots

### Preparo do treino

- Env: `VITE_ADSENSE_SLOT_TRAINING_PREPARATION`
- Valor: `9544709295`
- Formato: `auto`
- Responsivo: `data-full-width-responsive="true"`
- Local: dentro do estado `pendingGeneration`, abaixo do progresso/feedback de `TrainingPreparationProgress`.
- Objetivo: monetizar o tempo de espera do job de geracao sem cobrir conteudo nem acoes de retry.

### Pre-rodape

- Env: `VITE_ADSENSE_SLOT_PRE_FOOTER`
- Valor: `7261326735`
- Formato: `autorelaxed`
- Local: antes do rodape do `AppShell` em paginas elegiveis.
- Objetivo: criar inventario discreto no fim do conteudo rolavel.
- Restricao mobile: o bloco deve ficar acima do rodape e longe da bottom nav fixa.

### Sidebar desktop

- Env: `VITE_ADSENSE_SLOT_DESKTOP_SIDEBAR`
- Valor: `6487869331`
- Formato: `auto`
- Responsivo: `data-full-width-responsive="true"`
- Local: asides desktop de 320px ja existentes no wizard/plano/dashboard, quando houver espaco.
- Objetivo: aproveitar espaco secundario em desktop sem competir com o conteudo principal.
- Restricao mobile: nao renderizar esse slot em mobile.

## Regras de exibicao

Anuncios podem aparecer:

- na tela de preparo assincrono do treino;
- antes do rodape em paginas autenticadas elegiveis;
- em sidebars desktop de conteudo nao critico.

Anuncios nao devem aparecer:

- durante execucao ativa de treino;
- dentro de detalhes/checklists de treino em andamento;
- dentro de modais de confirmacao ou conclusao;
- junto aos botoes de solicitar, preparar, tentar novamente, comecar treino, finalizar treino, voltar ou continuar;
- no loading inicial curto de sessao/perfil/plano ativo;
- sobre ou dentro da bottom nav mobile;
- em telas de autenticacao e completacao de cadastro nesta primeira versao.

## Arquitetura frontend

Criar uma pequena camada de ads no frontend:

- `ads-config`: le envs publicas, normaliza booleanos e valida client/slots.
- `AdSenseScript`: injeta/carrega `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<clientId>` uma unica vez.
- `AdSenseSlot`: renderiza o `<ins class="adsbygoogle">` com `data-ad-client`, `data-ad-slot`, `data-ad-format` e `data-full-width-responsive` conforme o slot.
- `shouldShowAds`: regra central que considera `VITE_ADS_ENABLED`, client ID, slot ID, ambiente, segmento futuro e contexto de tela.

O componente de slot deve chamar `(window.adsbygoogle = window.adsbygoogle || []).push({})` apenas no cliente e apenas depois que o elemento `<ins>` estiver montado. Em ambiente de teste/E2E e quando `VITE_ADS_ENABLED` estiver falso, o componente deve renderizar nada ou um marcador interno controlado por teste, sem carregar script externo.

Os slots devem reservar dimensoes minimas responsivas para reduzir mudanca de layout quando o anuncio carregar ou quando um bloqueador de anuncios impedir a renderizacao.

## Segmentacao futura

A primeira versao mostra anuncios para usuarios autenticados elegiveis quando `VITE_ADS_ENABLED=true`. A implementacao deve deixar uma fronteira clara para futura segmentacao, sem precisar espalhar condicionais pela UI.

Exemplos de segmentacao futura:

- ocultar anuncios para plano pago/premium;
- limitar por rota ou estado de produto;
- limitar por pais/regiao se requisitos de consentimento mudarem;
- habilitar experimentos A/B de slots;
- aplicar frequencia maxima por sessao.

Nao criar plano pago, billing, tabela de assinatura ou backend de segmentacao nesta entrega. Apenas preparar a interface tecnica para isso.

## Privacidade e consentimento

A politica de privacidade deve ser atualizada em `pt-BR` e `en-US` para informar uso de Google AdSense, cookies, identificadores, anuncios personalizados ou nao personalizados e compartilhamento com provedor de publicidade.

Antes de ativar para trafego real, a operacao deve revisar os requisitos de consentimento aplicaveis ao publico do app. O AdSense possui recursos de Privacy & messaging para mensagens de consentimento e revogacao; se o app atender usuarios em regioes que exigem consentimento especifico, a ativacao deve respeitar esse fluxo. Esta spec nao substitui revisao juridica.

## Impacto na experiencia do usuario

Beneficios:

- monetiza principalmente o periodo em que o usuario ja esta aguardando;
- preserva o fluxo de treino como tarefa focada;
- evita insercoes agressivas no mobile;
- cria inventario adicional no fim das paginas sem empurrar a acao principal.

Riscos e mitigacoes:

- Mudanca de layout quando o anuncio carrega: reservar altura minima por slot.
- Clique acidental: manter distancia de botoes e bottom nav.
- Poluicao visual: limitar primeira versao a tres tipos de slot.
- Performance: carregar script uma vez, de forma assincorna, e somente quando habilitado.
- Bloqueador de anuncios: UI deve continuar coerente se o slot nao renderizar.
- Revisao do AdSense: dominio, `ads.txt` e politica de privacidade precisam estar consistentes antes de ativar.

## Impacto tecnico

Arquivos provaveis de implementacao:

- `apps/frontend/public/ads.txt`
- `apps/frontend/src/vite-env.d.ts`
- `apps/frontend/src/ads/ads-config.ts`
- `apps/frontend/src/ads/adsense-script.tsx`
- `apps/frontend/src/ads/adsense-slot.tsx`
- `apps/frontend/src/ads/use-ads-eligibility.ts`
- `apps/frontend/src/components/training-screen.tsx`
- `apps/frontend/src/components/training-plan-wizard.tsx`
- `apps/frontend/src/components/training-active-plan.tsx`
- `apps/frontend/src/components/dashboard-screen.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/legal/documents/pt-BR/privacy.md`
- `apps/frontend/src/legal/documents/en-US/privacy.md`
- `apps/frontend/e2e/training-plan.spec.ts`
- `apps/frontend/e2e/app-shell.spec.ts`

O backend nao precisa mudar na primeira versao porque a elegibilidade inicial depende apenas de configuracao publica e contexto de UI. Se a segmentacao futura depender de assinatura, entitlement ou regras server-side, o backend deve passar a expor esse estado de forma explicita.

## Testes esperados

- Teste unitario ou E2E importando a config para provar que anuncios ficam desabilitados quando `VITE_ADS_ENABLED` nao e `true`.
- E2E do preparo do treino verificando que o slot de preparo aparece no estado `pendingGeneration` e nao substitui progresso, retry ou mensagens.
- E2E mobile verificando que o pre-rodape nao causa overflow horizontal e nao sobrepoe a bottom nav.
- E2E desktop verificando que o slot de sidebar aparece apenas em layout desktop.
- E2E do treino em execucao verificando que nenhum anuncio aparece durante checklist, confirmacao de finalizacao e modal de conclusao.
- E2E ou teste DOM garantindo que o script AdSense e registrado uma unica vez quando anuncios estao habilitados.
- Build e typecheck do frontend.

## Fora de escopo

- Auto ads.
- Google Ads para compra de midia.
- Pagamento, plano premium ou regra real de assinatura.
- Telemetria propria de receita ou impressoes alem do que o AdSense ja oferece.
- CMP customizada fora dos recursos do AdSense Privacy & messaging.
- Alteracoes no contrato REST do backend.

## Referencias

- Google AdSense: publisher ID em Account > Settings > Account information.
- Google AdSense: ad units em Ads > By ad unit, com `data-ad-slot` no codigo gerado.
- Google AdSense: `ads.txt` na raiz do site com `pub-6699167964598590`.
