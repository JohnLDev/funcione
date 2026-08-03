# AdSense Editorial Placement Design

## Objetivo

Corrigir a estrategia de exibicao de anuncios do Funcione para reduzir risco de nova violacao do AdSense por telas sem conteudo do editor. A nova primeira versao cria uma tela publica de conteudo editorial e restringe os slots do app autenticado a telas com conteudo substantivo.

## Contexto

O AdSense aprovou a verificacao tecnica do site, mas apontou violacao por anuncios em telas sem conteudo do editor. A implementacao anterior exibia anuncios em estados operacionais, incluindo preparo assíncrono de treino, wizard de solicitacao, perfil e dashboard sem plano ativo. Esses pontos sao uteis para UX, mas podem ser lidos como telas de comportamento, navegacao, formulario, perfil privado ou baixo conteudo.

As regras atuais do Google destacam que anuncios nao devem aparecer em telas sem conteudo do editor, telas em construcao, telas usadas para alertas, navegacao ou fins comportamentais, nem perto de elementos interativos que possam gerar cliques acidentais.

## Decisoes

- Manter `ads.txt`, metatag do AdSense e `VITE_ADS_ENABLED=true`.
- Criar uma rota publica editorial acessivel sem login em `/treino-personalizado`.
- Colocar anuncio na tela editorial apenas depois de conteudo textual suficiente, nunca no topo isolado.
- Manter anuncio no app autenticado somente quando houver plano de treino ativo com conteudo real.
- Exibir anuncios no dashboard apenas quando o usuario tiver plano ativo.
- Exibir anuncios na tela de plano ativo apenas fora da execucao do treino.
- Remover anuncios do preparo/loading de geracao, wizard de solicitacao, perfil e dashboard sem plano.
- Carregar o script do AdSense junto dos slots elegiveis, em vez de carregar globalmente no `AppShell`.

## Tela editorial publica

A rota `/treino-personalizado` deve funcionar sem autenticacao e precisa ser rastreavel. Ela deve conter conteudo original em portugues sobre:

- como o Funcione monta um treino personalizado;
- informacoes usadas para personalizar o plano;
- como interpretar frequencia, duracao, local e equipamentos;
- cuidados de seguranca, progressao e consistencia;
- chamadas claras para entrar no app e solicitar um treino.

Tambem deve funcionar em ingles via i18n. O conteudo deve ficar no foco da pagina, com layout legivel em mobile e desktop. A pagina deve ter links para login, termos e privacidade.

## Locais de anuncio permitidos

- `/treino-personalizado`: um slot responsivo de pre-rodape apos secoes editoriais substanciais.
- `/dashboard`: sidebar desktop e pre-rodape apenas quando `state.activePlan` existir.
- `/training`: sidebar desktop e pre-rodape apenas quando `state.activePlan` existir e nenhuma sessao estiver em execucao, confirmacao ou conclusao.

## Locais de anuncio proibidos

- `/login`, `/signup`, `/complete-profile`;
- `/profile`;
- `/terms`, `/privacy`;
- estados de loading inicial;
- estado `pendingGeneration`;
- wizard de solicitacao do treino;
- mensagens de erro, retry, alertas e modais;
- execucao ativa do treino;
- telas vazias, dead-end ou apenas de navegacao.

## Arquitetura

O frontend continua com Vite, React, React Router e i18n. A nova tela publica sera um componente dedicado em `apps/frontend/src/components/editorial-training-screen.tsx`, registrado em `apps/frontend/src/App.tsx`.

Os componentes de ads existentes continuam sendo usados, mas os callers passam a decidir elegibilidade por contexto. `AppShell` deixa de montar `AdSenseScript` globalmente. `AdSenseSlot` passa a garantir o carregamento do script quando um slot elegivel real for renderizado.

## Impacto na experiencia

Beneficios:

- melhora a chance de revisao do AdSense encontrar conteudo publico de valor;
- reduz anuncios em momentos de tarefa, espera, cadastro ou execucao;
- preserva monetizacao em pontos menos intrusivos;
- diminui risco de clique acidental perto de botoes.

Trade-offs:

- menos inventario de anuncios no curto prazo;
- receita inicial pode ser menor;
- a tela editorial precisa ser mantida com conteudo util e atualizado.

## Testes esperados

- E2E prova que `/treino-personalizado` e publica, tem conteudo editorial e renderiza o pre-rodape sem login.
- E2E prova que `pendingGeneration` nao mostra anuncios.
- E2E prova que dashboard sem plano ativo nao mostra anuncios.
- E2E prova que dashboard com plano ativo mostra anuncios elegiveis.
- E2E prova que `/profile` nao mostra anuncios.
- E2E runtime prova que o script do AdSense carrega somente quando ha slot elegivel.
- Typecheck e build do frontend passam.

## Fora de escopo

- Auto ads.
- CMP customizada.
- Segmentacao por plano pago.
- Novos slots ou novos IDs do AdSense.
- Mudancas no backend.
