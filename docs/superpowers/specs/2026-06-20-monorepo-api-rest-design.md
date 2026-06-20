# Monorepo API REST Design

## Contexto

O projeto atual e um aplicativo TypeScript pequeno com um fluxo CLI em `main.ts`, um agente LangChain para criar planos de treino e regras de dominio em `src/domain/training`. A nova direcao mantem o projeto, mas muda sua forma de entrega para uma API REST documentada e um monorepo com backend e frontend.

## Escopo Desta Etapa

Esta etapa cria apenas a fundacao estrutural:

- transformar o repositorio em um monorepo com npm workspaces;
- criar `apps/backend` como backend TypeScript;
- organizar o backend como monolito modular;
- mover o dominio e agente de treino existentes para o modulo `training`;
- criar `apps/frontend` com Vite minimo e compilavel;
- adicionar OpenAPI como contrato vivo da API;
- expor inicialmente o fluxo atual como endpoint REST.

Ficam fora desta etapa:

- tema visual, cores e identidade do frontend;
- telas finais de produto;
- autenticacao;
- persistencia em banco de dados;
- deploy e infraestrutura externa.

## Arquitetura Recomendada

Usaremos npm workspaces na raiz, com dois apps:

```txt
/
  package.json
  tsconfig.base.json
  apps/
    backend/
      src/
        modules/
          training/
            domain/
            application/
            infra/
            http/
        shared/
          config/
          http/
        server.ts
      package.json
      tsconfig.json
    frontend/
      src/
      index.html
      vite.config.ts
      package.json
      tsconfig.json
```

O backend sera um monolito modular: um unico processo e uma unica API, mas com modulos isolados por dominio. O modulo `training` sera o primeiro modulo e concentrara o dominio atual, os casos de uso de geracao de plano e as rotas REST relacionadas.

## Backend

O backend usara Fastify com TypeScript. Fastify foi escolhido porque combina bem com APIs REST documentadas: rotas podem declarar schema de entrada e saida, e o OpenAPI pode ser gerado a partir dessas rotas.

Estrutura inicial do modulo `training`:

- `domain/`: enums, schemas, policies, entidades e tipos de treino;
- `application/`: casos de uso, incluindo geracao de plano com fallback de provider;
- `infra/`: integracoes externas, como modelos LangChain e historico simulado;
- `http/`: rotas REST, schemas HTTP e adaptadores request/response.

Endpoint inicial:

```http
POST /api/training-plans
```

Entrada: o contrato equivalente a `DadosUsuario`.

Saida de sucesso: `PlanoTreino` mais metadados uteis da execucao, como provider, modelo, uso de fallback e tentativas.

Erros esperados:

- `400` para payload invalido;
- `503` quando nenhum provider configurado conseguir gerar o plano;
- `500` para erro inesperado.

## OpenAPI

Toda API criada, alterada ou removida deve manter a documentacao OpenAPI atualizada. A regra de implementacao sera: nenhuma rota nova entra sem schema de request, response e erro.

O backend servira:

- `GET /documentation` para Swagger UI;
- `GET /documentation/json` ou rota equivalente para o documento OpenAPI em JSON.

A documentacao deve ser derivada das rotas sempre que possivel, reduzindo duplicacao manual entre codigo e contrato.

## Frontend

O frontend sera criado com Vite e TypeScript, mas ficara visualmente minimo nesta etapa. Ele deve compilar, rodar em desenvolvimento e estar pronto para consumir o backend.

O Vite sera configurado com proxy de desenvolvimento para `/api`, apontando para o backend local. Tema, cores, layout final e componentes de produto serao definidos em etapa posterior.

## Scripts

A raiz do monorepo deve orquestrar os workspaces:

- `npm run build`: build de backend e frontend;
- `npm run test`: testes do backend;
- `npm run typecheck`: typecheck dos workspaces;
- `npm run dev:backend`: backend local;
- `npm run dev:frontend`: frontend Vite local.

Cada workspace tambem deve ter seus scripts locais.

## Testes

Os testes existentes de dominio devem continuar passando depois da mudanca de caminhos. A primeira entrega deve adicionar testes para o endpoint inicial sem chamar provedores externos reais, usando injecao ou mock controlado no nivel de aplicacao.

Cobertura minima desta etapa:

- policies de dominio existentes;
- validacao de payload invalido no endpoint;
- resposta de sucesso do endpoint com um gerador de plano falso;
- erro de indisponibilidade quando a geracao falhar em todos os providers.

## Criterios de Aceite

- O repositorio usa npm workspaces com `apps/backend` e `apps/frontend`.
- O backend inicia como API REST.
- O backend esta organizado como monolito modular.
- O dominio de treino atual esta preservado no modulo `training`.
- `POST /api/training-plans` existe e esta documentado no OpenAPI.
- Swagger UI esta disponivel em desenvolvimento.
- O frontend Vite existe, compila e tem proxy para `/api`.
- `npm run build`, `npm run typecheck` e `npm run test` passam na raiz.
