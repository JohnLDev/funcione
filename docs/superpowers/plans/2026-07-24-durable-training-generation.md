# Durable Training Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a geracao mensal de treino em fluxo assincrono duravel com status consultavel, worker backend, OpenAPI atualizado e UX com polling.

**Architecture:** A API valida o payload, calcula snapshot/perfil, cria reserva mensal e registra um job duravel. Um worker do backend consome jobs, chama a IA e completa/falha a reserva. O frontend trata `202 Accepted` como processamento pendente e acompanha o job ate terminal.

**Tech Stack:** Fastify, TypeScript, Supabase Postgres/RLS/RPC, React/Vite, Playwright, npm workspaces.

## Global Constraints

- Toda mudanca de comportamento comeca por teste automatizado.
- Toda rota REST criada/alterada deve atualizar OpenAPI.
- Fluxos de frontend devem ter teste E2E.
- Layout segue mobile first.
- Supabase server-side precisa usar `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`; essa chave nunca vai para o frontend.
- O worker nao salva token do usuario.

---

### Task 1: Contrato de dominio e testes RED do backend

**Files:**
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.test.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.ts`
- Create: `apps/backend/src/modules/training/application/monthly-training-plan-generation-job-repository.ts`

**Interfaces:**
- Produces: `requestMonthlyTrainingPlanGeneration(user, payload, dependencies)`
- Produces: `processNextMonthlyTrainingPlanGenerationJob(dependencies)`
- Produces: `MonthlyTrainingPlanGenerationJobRepository`

- [x] Escrever teste que prova que `requestMonthlyTrainingPlanGeneration` retorna job `queued` sem chamar a IA.
- [x] Rodar `npm test --workspace @funcione/backend -- monthly-training-plan-service.test.ts` e confirmar falha por funcao ausente.
- [x] Escrever teste que prova que `processNextMonthlyTrainingPlanGenerationJob` chama a IA e conclui o plano.
- [x] Rodar o teste e confirmar falha por repositorio/worker ausente.
- [x] Escrever teste que prova que falha da IA marca job como `failed`, libera reserva e permite nova tentativa.
- [x] Rodar o teste e confirmar falha esperada.

### Task 2: Repositorios em memoria e service async

**Files:**
- Modify: `apps/backend/src/modules/training/infra/in-memory-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/application/training-repository-factory.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.ts`
- Modify: `apps/backend/src/modules/training/index.ts`

**Interfaces:**
- Consumes: `MonthlyTrainingPlanGenerationJobRepository`
- Produces: `findGenerationJobById`, `findPendingGenerationByUserId`, `enqueueGenerationJob`, `claimNextGenerationJob`, `completeGenerationJob`, `failGenerationJob`

- [x] Implementar o repositorio em memoria de jobs com status `queued`, `running`, `completed`, `failed`.
- [x] Implementar `requestMonthlyTrainingPlanGeneration` reaproveitando validacao/snapshot existentes.
- [x] Implementar `processNextMonthlyTrainingPlanGenerationJob` com release em falha.
- [x] Rodar teste focado e confirmar verde.

### Task 3: Contrato HTTP/OpenAPI

**Files:**
- Modify: `apps/backend/src/modules/training/http/training-routes.test.ts`
- Modify: `apps/backend/src/modules/training/http/training-routes.ts`
- Modify: `apps/backend/src/modules/training/http/training-json-schemas.ts`

**Interfaces:**
- Consumes: `requestMonthlyTrainingPlanGeneration`
- Consumes: `processNextMonthlyTrainingPlanGenerationJob`
- Produces: `POST /api/training-plans/monthly` com `202`
- Produces: `GET /api/training-plans/generations/:generationId`

- [x] Escrever teste que espera `POST /monthly` retornar `202` e schema OpenAPI de `202`.
- [x] Escrever teste que espera `GET /generations/:id` retornar status e plano quando completo.
- [x] Rodar teste focado e confirmar falhas esperadas.
- [x] Atualizar schemas JSON e rotas.
- [x] Disparar `worker.wake()` depois do enqueue, sem bloquear a resposta.
- [x] Rodar teste focado e confirmar verde.

### Task 4: Supabase duravel

**Files:**
- Create: `supabase/migrations/<generated>_create_training_plan_generation_jobs.sql`
- Modify: `apps/backend/src/shared/config/env.ts`
- Create: `apps/backend/src/modules/training/infra/supabase-service-client.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.test.ts`
- Modify: `apps/backend/src/modules/training/infra/training-plan-migration.test.ts`
- Modify: `apps/backend/src/app.ts`

**Interfaces:**
- Consumes: Supabase public client for authenticated read/enqueue RPC.
- Produces: server-side worker repository using `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

- [x] Criar migracao com tabela `training_monthly_plan_generation_jobs`, RLS e grants.
- [x] Criar RPCs de enqueue, claim, complete e fail.
- [x] Escrever/atualizar testes de migracao para grants, RLS e `FOR UPDATE SKIP LOCKED`.
- [x] Implementar env server-side opcional.
- [x] Implementar repositorio Supabase para job e worker.
- [x] Rodar testes de infra Supabase e migracao.

### Task 5: Frontend async e cache

**Files:**
- Modify: `apps/frontend/src/training/training-plan.ts`
- Modify: `apps/frontend/src/training/api-training-plan-gateway.ts`
- Modify: `apps/frontend/src/training/mock-training-plan-gateway.ts`
- Modify: `apps/frontend/src/training/training-plan-provider.tsx`
- Modify: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`
- Modify: `apps/frontend/e2e/api-training-plan-gateway.spec.ts`

**Interfaces:**
- Consumes: `TrainingPlanGeneration`
- Produces: provider com polling ate status terminal.

- [x] Escrever E2E/mock gateway que valida estado pendente apos confirmar geracao.
- [x] Escrever teste de gateway API para `202 Accepted`.
- [x] Rodar E2E/API focado e confirmar falha esperada.
- [x] Implementar tipos e gateway.
- [x] Implementar polling no provider e bypass de cache enquanto pendente.
- [x] Melhorar mensagens de fila/processamento/falha.
- [x] Rodar testes focados e confirmar verde.

### Task 6: Expirar plano real para teste e verificar tudo

**Files:**
- Create: `scripts/expire-john-training-plan.sql` or usar MCP Supabase com SQL controlado

**Interfaces:**
- Consumes: projeto Supabase Funcione.
- Produces: usuario John Lenon Oliveira da Silva apto a gerar novo treino.

- [x] Aplicar migracao no Supabase Funcione.
- [x] Expirar plano ativo do John com SQL controlado.
- [x] Reiniciar backend e frontend para ler envs.
- [x] Executar `npm run typecheck`.
- [x] Executar `npm test`.
- [x] Executar `npm run test:e2e`.
- [x] Executar `npm run build`.
- [x] Validar manualmente fluxo login -> treino -> solicitar -> pendente -> concluido/falha controlada.

Nota: validacao real ate a conclusao do job depende de `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` no `.env`. Sem essa chave, a API retorna erro controlado `TRAINING_PLAN_WORKER_NOT_CONFIGURED` em vez de deixar jobs presos.

### Task 7: Carregamento de env em monorepo

**Files:**
- Modify: `apps/backend/src/shared/config/env.ts`
- Modify: `apps/backend/src/server.ts`
- Create/Modify: teste focado de configuracao do backend

**Interfaces:**
- Produces: carregamento explicito de `.env` da raiz do monorepo quando o backend roda via npm workspace em `apps/backend`.

- [x] Escrever teste que prova carregamento de `.env` a partir da raiz do monorepo mesmo com `cwd` em `apps/backend`.
- [x] Implementar helper de carregamento sem expor secrets.
- [x] Atualizar `server.ts` para usar o helper antes de `getServerConfig`.
- [x] Reiniciar backend e repetir validacao real com token Supabase.

Nota de validacao: em 24/07/2026, um usuario temporario autenticou via Supabase Auth, completou perfil, recebeu `202 Accepted` para `POST /api/training-plans/monthly`, acompanhou o job `queued -> running -> completed`, persistiu plano ativo e retornou `canGenerate=false` com proxima geracao em 23/08/2026. O usuario temporario e dados relacionados foram removidos por cascade apos o teste.

### Task 8: Diagnostico e correcao da falha real de geracao

**Files:**
- Modify: `apps/backend/src/modules/training/application/generate-training-plan.ts`
- Modify: `apps/backend/src/modules/training/application/generate-training-plan.test.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.test.ts`
- Modify: `apps/backend/src/modules/training/infra/instructor.ts`
- Modify: `apps/backend/src/modules/training/infra/instructor.test.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.test.ts`
- Modify: `apps/backend/src/modules/training/infra/training-plan-migration.test.ts`
- Modify: `apps/backend/src/shared/config/env.ts`
- Modify: `apps/backend/src/shared/config/env.test.ts`
- Modify: `apps/frontend/playwright.config.ts`
- Create: `supabase/migrations/20260724170000_harden_training_generation_job_claims.sql`
- Modify local: `.env`

**Interfaces:**
- Consumes: providers OpenAI-compatible NVIDIA/OpenRouter.
- Produces: timeout configuravel por env, erro detalhado por provider e timestamps reais de conclusao/falha do worker.

- [x] Reproduzir a falha real do usuario John Lenon Oliveira da Silva e identificar que os providers estavam estourando timeout.
- [x] Validar conectividade simples dos providers e configurar OpenRouter como provider primario local.
- [x] Aumentar `TRAINING_PLAN_MODEL_TIMEOUT_MS` local para 600000 ms.
- [x] Propagar timeout para o modelo OpenAI-compatible e desabilitar retries internos duplicados.
- [x] Melhorar erro final com resumo por provider/model quando todos falham.
- [x] Aumentar lease do worker para geracoes longas e salvar timestamps no momento real de conclusao/falha.
- [x] Cobrir a correcao com testes automatizados de application/infra.
- [x] Reiniciar backend para ler envs atualizadas.
- [x] Validar geracao real via UI/API: job `a7e6e086-f98b-4907-b98a-67252a285e72` concluiu com plano ativo `747a2867-c9b1-41a5-a49f-dad4b9808ca8` e proxima geracao em 23/08/2026.
- [x] Isolar Playwright em porta dedicada com `VITE_AUTH_MODE=mock` para nao reutilizar servidor manual real em `5173`.
- [x] Corrigir drenagem do worker para continuar processando jobs apos falhas controladas.
- [x] Evitar que jobs `running` expirados e sem tentativas restantes continuem bloqueando nova geracao.
- [x] Adicionar migration forward para falhar jobs exauridos e liberar a reserva em Supabase ja migrado.
- [x] Tornar o lease do worker configuravel via `TRAINING_PLAN_JOB_LEASE_MS`.
