# Frontend Theme Foundation Design

## Contexto

O frontend do monorepo existe hoje como uma casca Vite minima. A proxima etapa define a fundacao visual e tecnica para o app, antes de implementar telas finais.

Referencias fornecidas:

- uniforme MX Volley Ball em versao preta e branca;
- logos MileX/MX com preto, branco, azul eletrico e ciano;
- painel web Funcione como referencia de densidade, navegacao e estrutura, sem copiar a interface;
- regra permanente de mobile first registrada em `AGENTS.md`.

## Identidade

O nome do app sera `Funcione`.

A empresa/marca por tras do produto sera `MileX`.

O co-branding sera usado como `by MileX`. A hierarquia de marca deve ser:

- `Funcione` como nome principal em headers, splash, navegacao e textos de produto;
- `by MileX` como assinatura secundaria em pontos institucionais, header inicial, login, configuracoes, tela sobre e rodape quando existir.

O tom visual deve ser esportivo, tecnico, energetico e premium, sem perder clareza operacional para uso diario.

## Stack Frontend

O frontend deve migrar para:

- Vite;
- React;
- TypeScript;
- Tailwind CSS v4;
- shadcn/ui;
- lucide-react;
- react-i18next;
- Playwright para E2E quando houver fluxos testaveis de usuario.

O uso de shadcn/ui implica manter componentes no codigo do projeto, com customizacao por tokens CSS e Tailwind.

## Tema

O app deve ter tema claro e escuro.

O tema inicial deve seguir a preferencia do sistema do usuario (`system`), com toggle para alternar entre:

- `system`;
- `light`;
- `dark`.

O tema escuro sera a assinatura principal da marca. Ele deve usar preto profundo, grafite azulado, azul eletrico e ciano para energia e estados ativos.

O tema claro deve ser inspirado no uniforme branco. Ele deve ser frio, limpo e esportivo, usando branco, azul muito claro, cinzas frios e azul eletrico. O tema claro nao deve usar bege, creme ou paletas quentes como base.

## Paleta

Tokens de cor recomendados para a primeira implementacao:

```txt
primary: #0059ff
primary-alt: #0078ff
accent: #38bdf8
dark-background: #02040a
dark-surface: #050b18
dark-card: #080f1e
light-background: #ffffff
light-surface: #eef4ff
light-card: #ffffff
dark-foreground: #f8fafc
light-foreground: #020617
muted-dark: #94a3b8
muted-light: #64748b
```

Estados criticos podem usar vermelho e amber, mas nao devem competir visualmente com o azul primario.

## Design Tokens

Os tokens devem seguir a estrutura semantica esperada por shadcn/ui:

- `background`;
- `foreground`;
- `card`;
- `card-foreground`;
- `popover`;
- `popover-foreground`;
- `primary`;
- `primary-foreground`;
- `secondary`;
- `secondary-foreground`;
- `muted`;
- `muted-foreground`;
- `accent`;
- `accent-foreground`;
- `destructive`;
- `destructive-foreground`;
- `border`;
- `input`;
- `ring`;
- `radius`.

Os valores devem ser definidos por variaveis CSS e alternados via classe `.dark`. Tailwind deve consumir esses tokens sem duplicar paleta em varios lugares.

## Layout

Todo layout deve ser mobile first.

A primeira tela util do app deve parecer uma experiencia de produto, nao uma landing page. A estrutura inicial deve favorecer:

- header compacto com `Funcione` e assinatura `by MileX`;
- resumo do plano ou chamada principal;
- cards de metricas compactos;
- acoes principais com alvos de toque confortaveis;
- navegacao inferior no mobile;
- adaptacao posterior para sidebar ou shell lateral no desktop.

Desktop pode se inspirar na estrutura do painel de referencia, com navegacao lateral, cards de metricas e areas de conteudo, mas a experiencia mobile deve orientar a composicao primeiro.

## Componentes Iniciais

Os primeiros componentes shadcn/ui recomendados sao:

- `Button`;
- `Card`;
- `Badge`;
- `Tabs` ou controle segmentado equivalente;
- `Sheet` para menu, filtros ou detalhes mobile;
- `Select`;
- `Input`;
- `Textarea`;
- `Switch`;
- `DropdownMenu`;
- `Progress`;
- `Toast` ou feedback equivalente.

Icones devem vir de `lucide-react` quando existir icone apropriado.

## Internacionalizacao

O app deve nascer internacionalizado.

Idioma principal inicial:

- `pt-BR`.

Idioma estrutural secundario:

- `en-US`.

Estrutura recomendada:

```txt
apps/frontend/src/i18n/index.ts
apps/frontend/src/i18n/locales/pt-BR/common.json
apps/frontend/src/i18n/locales/en-US/common.json
```

Todo texto visivel novo deve usar chave de traducao. Evitar strings soltas em componentes, exceto textos tecnicos temporarios em testes.

O seletor de idioma deve existir quando houver uma tela de configuracoes, perfil ou menu de usuario. Na fundacao, a arquitetura de i18n deve estar pronta mesmo que o seletor visual seja simples.

## Responsividade E Acessibilidade

Toda tela ou componente novo deve ser validado em pelo menos:

- um viewport mobile;
- um viewport desktop.

Regras obrigatorias:

- sem overflow horizontal;
- sem sobreposicao incoerente de texto ou controles;
- botoes e elementos interativos com alvos confortaveis para toque;
- estados de foco visiveis;
- contraste adequado em light e dark;
- texto legivel sem depender de zoom;
- hierarquia visual clara em telas pequenas.

## Testes

O desenvolvimento deve seguir TDD para mudancas de comportamento.

Para a fundacao do frontend, a primeira implementacao deve verificar:

- build do frontend;
- typecheck;
- renderizacao basica do app React;
- troca de tema quando houver controle visual;
- carregamento de traducoes;
- ausencia de regressao nos testes do backend.

Quando houver fluxo real de usuario, a funcionalidade deve ter teste E2E com Playwright. Fluxos que impactem mobile devem incluir viewport mobile no E2E ou verificacao automatizada equivalente.

Antes de concluir uma entrega visual ou de frontend:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Se `npm run test:e2e` ainda nao existir, ele deve ser criado na mesma entrega que introduzir a primeira funcionalidade testavel por E2E.

## Criterios De Aceite Da Fundacao

- O frontend usa React com Vite e TypeScript.
- Tailwind CSS v4 esta configurado.
- shadcn/ui esta configurado com tokens CSS.
- O app possui suporte a tema `system`, `light` e `dark`.
- A paleta base reflete a identidade Funcione by MileX.
- O app possui estrutura i18n com `pt-BR` e `en-US`.
- A tela inicial continua mobile first e responsiva.
- Os textos visiveis da tela inicial passam por i18n.
- O projeto preserva os comandos de verificacao do monorepo.
