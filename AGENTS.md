# AGENTS.md

## Modo De Trabalho

- Trabalhe de forma incremental e verificavel.
- Antes de implementar mudancas grandes, alinhe o desenho esperado e registre decisoes relevantes em `docs/`.
- Preserve alteracoes existentes no workspace; nao reverta trabalho que voce nao fez sem pedido explicito.
- Use `rg` para buscas quando possivel.
- Ao executar comandos de shell neste workspace, use `rtk`.

## Desenvolvimento Orientado A Testes

- Toda feature, bugfix ou mudanca de comportamento deve comecar por teste automatizado.
- O ciclo esperado e: escrever teste, ver falhar pelo motivo correto, implementar o minimo, ver passar, refatorar se necessario.
- Toda funcionalidade com fluxo de usuario deve incluir teste E2E cobrindo o comportamento principal e os estados criticos.
- Testes E2E devem validar o app como usuario real: navegacao, formularios, acoes, feedback visual, erros esperados e integracao com a API quando aplicavel.
- Fluxos mobile devem ter cobertura E2E ou verificacao automatizada em viewport mobile quando a funcionalidade impactar a experiencia mobile.
- Preferir um runner E2E unico para o frontend; se nenhum estiver definido, adotar Playwright como padrao inicial.
- Para rotas HTTP, teste pelo menos:
  - payload invalido;
  - resposta de sucesso;
  - erro esperado;
  - presenca/atualizacao da rota no OpenAPI quando aplicavel.
- Evite chamadas externas reais em testes; injete dependencias ou use doubles no nivel de aplicacao.

## OpenAPI E Contratos REST

- Toda API criada, alterada ou removida deve manter a documentacao OpenAPI atualizada.
- Nenhuma rota REST nova deve entrar sem schema de request, response e erro.
- Prefira gerar a documentacao a partir dos schemas das rotas para evitar duplicacao manual.
- O backend deve expor:
  - `GET /documentation` para Swagger UI;
  - `GET /documentation/json` para o documento OpenAPI.
- Mudancas de contrato devem vir acompanhadas de teste que valide o comportamento e a documentacao.

## Arquitetura Do Backend

- O backend vive em `apps/backend`.
- Mantenha o backend como monolito modular: um unico processo, com modulos isolados por dominio.
- Estrutura esperada para modulos:

```txt
apps/backend/src/modules/<modulo>/
  domain/
  application/
  infra/
  http/
```

- `domain/` contem regras puras, entidades, enums, schemas e policies.
- `application/` contem casos de uso e orquestracao.
- `infra/` contem integracoes externas e detalhes de provider.
- `http/` contem rotas, schemas HTTP e adaptadores request/response.
- Rotas HTTP nao devem concentrar regra de dominio; elas validam entrada, chamam casos de uso e formatam resposta.

## Frontend

- O frontend vive em `apps/frontend` e usa Vite.
- O Vite deve usar proxy de desenvolvimento para `/api`, apontando para o backend local.
- Todo layout deve ser mobile first: desenhe e implemente primeiro para telas pequenas, depois expanda para tablet e desktop.
- Toda tela ou componente novo deve contemplar responsividade de alto nivel, sem overflow horizontal, sobreposicao de texto ou controles dificeis de tocar no mobile.
- Componentes interativos devem ter alvos confortaveis para toque e estados visuais claros em mobile e desktop.
- Mudancas visuais devem ser verificadas em pelo menos um viewport mobile e um desktop antes de serem consideradas concluidas.
- Funcionalidades de frontend devem ter testes E2E que provem os principais caminhos de uso antes de serem consideradas concluidas.
- Nao definir tema visual, paleta, componentes finais ou identidade sem alinhamento previo.
- Ao implementar UI, mantenha o app utilizavel como primeira tela; evite landing page quando a tarefa pedir ferramenta/app.

## Monorepo E Scripts

- A raiz usa npm workspaces.
- Comandos principais:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run dev:backend
npm run dev:frontend
```

- Antes de considerar uma mudanca concluida, rode na raiz:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

- Se `npm run test:e2e` ainda nao existir no projeto, crie-o na mesma entrega que introduzir a primeira funcionalidade de frontend testavel por E2E.

## Documentacao Atualizada

- Use Context7 MCP para buscar documentacao atual sempre que a tarefa envolver biblioteca, framework, SDK, API, CLI tool ou cloud service.
- Comece por `resolve-library-id` usando o nome da biblioteca e a pergunta completa.
- Depois use `query-docs` com o library ID selecionado e a pergunta completa.
- Prefira Context7 a web search para documentacao de bibliotecas.

## Git E Revisao

- Leia `git status --short` antes de edicoes relevantes.
- Nao use comandos destrutivos como `git reset --hard` ou `git checkout --` sem pedido explicito.
- Ao revisar codigo, priorize bugs, riscos, regressoes e testes ausentes.
- Ao finalizar, reporte comandos executados e resultados de verificacao.
