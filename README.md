# Funcione by MileX

Funcione e um app mobile-first para experiencias esportivas e geracao de planos
de treino. O projeto esta organizado como monorepo com backend REST documentado
por OpenAPI e frontend Vite/React.

## Visao Geral

- **Produto:** Funcione
- **Co-branding:** by MileX
- **Backend:** API REST em Fastify, TypeScript e monolito modular.
- **Frontend:** Vite, React, TypeScript, Tailwind CSS, componentes estilo
  shadcn/ui, i18n e tema claro/escuro.
- **Autenticacao:** Supabase Auth com e-mail/senha e Google OAuth.
- **Contratos:** toda rota REST deve manter OpenAPI atualizado.
- **Testes:** desenvolvimento orientado a testes, com E2E para fluxos de
  usuario.

## Estrutura

```txt
.
  apps/
    backend/
      src/
        modules/
          auth/
          training/
        shared/
    frontend/
      src/
        auth/
        components/
        i18n/
        theme/
  docs/
    authentication.md
    superpowers/
      plans/
      specs/
  AGENTS.md
  package.json
```

## Workspaces

A raiz usa npm workspaces:

- `apps/backend`: API REST.
- `apps/frontend`: app web Vite.

Scripts principais:

```bash
npm run dev:backend
npm run dev:frontend
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Setup Local

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente local:

```bash
cp .env.example .env
```

3. Preencha as variaveis necessarias no `.env`.

4. Inicie o backend:

```bash
npm run dev:backend
```

Backend local:

```txt
http://localhost:3000
```

5. Inicie o frontend:

```bash
npm run dev:frontend
```

Frontend local:

```txt
http://localhost:5173
```

O Vite usa proxy de desenvolvimento para `/api`, apontando para
`http://localhost:3000`.

## Variaveis De Ambiente

Baseie-se em `.env.example`.

Providers de geracao de treino:

```bash
NVIDIA_API_KEY=
NVIDIA_MODEL=openai/gpt-oss-120b

OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-oss-120b
OPENROUTER_SITE_URL=http://localhost
OPENROUTER_SITE_NAME=LangChain Training Plan

PRIMARY_PROVIDER=nvidia
```

Supabase Auth no backend:

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Supabase Auth no frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

E2E:

```bash
VITE_AUTH_MODE=mock
```

`VITE_AUTH_MODE=mock` deve ser usado apenas em testes automatizados. Nunca
exponha chaves `service_role` no frontend.

## Backend

O backend vive em `apps/backend` e deve continuar como monolito modular:

```txt
apps/backend/src/modules/<modulo>/
  domain/
  application/
  infra/
  http/
```

Modulos atuais:

- `auth`: validacao de sessao Supabase e perfil interno do usuario.
- `training`: geracao de planos de treino e regras de dominio.

Rotas principais:

```txt
GET /documentation
GET /documentation/json
GET /api/auth/me
GET /api/auth/profile
PUT /api/auth/profile
POST /api/training-plans
GET /api/training-plans/active
POST /api/training-plans/monthly
```

Regras obrigatorias para API:

- toda rota criada, alterada ou removida deve atualizar OpenAPI;
- nenhuma rota REST nova deve entrar sem schema de request, response e erro;
- rotas HTTP nao devem concentrar regra de dominio;
- mudancas de contrato precisam de teste que valide comportamento e
  documentacao.

## Frontend

O frontend vive em `apps/frontend`.

Stack atual:

- Vite;
- React;
- TypeScript;
- Tailwind CSS;
- componentes estilo shadcn/ui;
- lucide-react;
- react-i18next;
- React Router;
- Supabase client;
- Playwright para E2E.

Rotas atuais:

```txt
/login
/signup
/complete-profile
/dashboard
/training
```

Regras obrigatorias para frontend:

- todo layout deve ser mobile first;
- toda tela nova deve ser responsiva e sem overflow horizontal;
- textos visiveis devem usar i18n;
- tema deve respeitar `system`, `light` e `dark`;
- fluxos de usuario precisam de E2E cobrindo desktop e mobile quando aplicavel.

## Autenticacao

O projeto usa Supabase Auth como provedor unico de identidade:

- login por e-mail e senha;
- cadastro por e-mail e senha;
- login social com Google;
- sessao unificada;
- cadastro interno obrigatorio com dados do perfil Funcione.

O backend nao armazena senha nem hash. Senhas e segredos OAuth ficam sob
responsabilidade do Supabase Auth.

Mais detalhes: `docs/authentication.md`.

## Monthly Training Plans

- `GET /api/training-plans/active` retorna o plano mensal ativo atual e a
  elegibilidade para uma nova geracao.
- `POST /api/training-plans/monthly` cria um plano mensal quando o usuario esta
  elegivel.
- Cada plano gerado armazena o snapshot normalizado dos dados enviados a IA e
  bloqueia uma nova geracao por 30 dias.
- Execute as migrations do Supabase antes de usar perfis autenticados ou planos
  de treino persistidos:

```bash
supabase db push
```

O frontend usa `/training` como fluxo autenticado para criar e consultar o
plano mensal.

## Plugins Necessarios Para Desenvolvimento

Estes plugins/skills sao parte do modo de trabalho do projeto no Codex.

### Obrigatorios

- **Superpowers**
  - Usado antes de qualquer desenvolvimento para preparacao, brainstorming,
    planejamento e execucao orientada por plano.
  - Planos devem ficar em `docs/superpowers/plans/`.
  - Specs e decisoes devem ficar em `docs/superpowers/specs/`.
  - Skills esperadas: preparacao/brainstorming, planejamento,
    `executing-plans` e/ou `subagent-driven-development`.

- **Context7 MCP**
  - Obrigatorio sempre que uma tarefa envolver biblioteca, framework, SDK, API,
    CLI tool ou cloud service.
  - Fluxo esperado: resolver library ID e depois consultar a documentacao.

- **Supabase**
  - Obrigatorio para tarefas envolvendo Auth, Database, RLS, migrations,
    Storage, Edge Functions ou qualquer recurso Supabase.
  - Tambem deve ser usado em revisoes de seguranca de schema, auth e RLS.

### Recomendados

- **Browser / In-app Browser**
  - Recomendado para validar UI local, responsividade, navegacao e capturas.

- **GitHub**
  - Recomendado para PRs, revisoes, checks de CI e publicacao de branches.

Se o plugin Superpowers nao estiver disponivel na sessao, siga o fallback do
`AGENTS.md`: declare o impedimento, registre o plano em `docs/superpowers/` e
continue no mesmo formato ate o plugin voltar a estar disponivel.

## Modo De Desenvolvimento

Antes de implementar:

1. Leia `AGENTS.md`.
2. Use Superpowers para preparacao/planejamento.
3. Registre ou atualize o plano em `docs/superpowers/plans/` quando a mudanca
   tiver mais de um passo ou tocar varios arquivos.
4. Registre decisoes em `docs/superpowers/specs/` quando houver decisao de
   produto, arquitetura, tema, contrato ou fluxo.
5. Comece mudancas de comportamento por teste automatizado.

Ciclo esperado:

```txt
teste falhando -> implementacao minima -> teste passando -> refatoracao segura
```

Antes de concluir uma entrega:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Para alteracoes apenas documentais, uma revisao do markdown e `git status` sao
suficientes, salvo quando o conteudo documentado depender de comportamento de
codigo alterado na mesma entrega.

## Documentacao Do Projeto

- `AGENTS.md`: regras permanentes para agentes e desenvolvimento.
- `docs/authentication.md`: decisoes de autenticacao e rotas relacionadas.
- `docs/superpowers/plans/`: planos de implementacao.
- `docs/superpowers/specs/`: specs e decisoes de produto/arquitetura.

## Comandos Uteis

Rodar backend:

```bash
npm run dev:backend
```

Rodar frontend:

```bash
npm run dev:frontend
```

Typecheck:

```bash
npm run typecheck
```

Testes backend:

```bash
npm test
```

Testes E2E:

```bash
npm run test:e2e
```

Build completo:

```bash
npm run build
```

Inspecionar OpenAPI:

```txt
http://localhost:3000/documentation
http://localhost:3000/documentation/json
```
