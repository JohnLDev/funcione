# Durable Training Generation Design

## Contexto

Hoje a rota `POST /api/training-plans/monthly` cria uma reserva, chama a IA na mesma requisicao e so responde quando o plano foi persistido. Isso protege a regra de uma geracao por mes, mas cria uma experiencia ruim quando a IA demora.

## Decisoes

- A solicitacao de treino passa a ser assincrona: a API cria uma reserva mensal, registra um job duravel e responde `202 Accepted`.
- O processamento fica em um worker do backend, que consome jobs duraveis e persiste o plano quando a IA terminar.
- O frontend deve acompanhar o status com polling, mostrando feedback claro de fila/processamento/falha/conclusao.
- Nenhum token do usuario sera salvo no job. O job guarda apenas snapshot validado, perfil atletico derivado e metadados operacionais.
- Em Supabase, o job vive em tabela propria com RLS. Usuarios autenticados podem apenas ler os proprios jobs; escrita fica bloqueada para `anon` e `authenticated`.
- O worker usa credencial server-side (`SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`) para claim/processamento duravel. Essa chave nunca pode ir para o frontend.
- A claim de job deve ser atomica com lock de banco, usando `FOR UPDATE SKIP LOCKED` ou funcao equivalente, para evitar dois workers processando o mesmo job.

## Contrato REST

### `POST /api/training-plans/monthly`

- Entrada: permanece igual.
- Sucesso novo: `202 Accepted`.
- Corpo:

```json
{
  "generation": {
    "id": "uuid",
    "status": "queued",
    "createdAt": "2026-07-24T12:00:00.000Z",
    "updatedAt": "2026-07-24T12:00:00.000Z"
  }
}
```

- Erros existentes continuam:
  - `400` para payload/perfil invalido.
  - `401` para token ausente/invalido.
  - `409` quando ja existe plano ativo ou geracao pendente.
  - `503` quando storage/worker duravel nao esta configurado.

### `GET /api/training-plans/generations/:generationId`

- Retorna o status do job do usuario autenticado.
- Status possiveis: `queued`, `running`, `completed`, `failed`.
- Quando `completed`, inclui `plan`.
- Quando `failed`, inclui mensagem controlada.
- Nao revela jobs de outro usuario.

### `GET /api/training-plans/active`

- Continua retornando plano ativo, perfil atletico e disponibilidade.
- Passa a incluir `pendingGeneration` quando existir job `queued` ou `running`.

## Estados de usuario

- Sem plano ativo e sem job: pode gerar.
- Job `queued` ou `running`: nao pode gerar, UI mostra processamento.
- Job `completed`: UI mostra plano ativo.
- Job `failed`: reserva e liberada, UI mostra falha e permite nova tentativa.
- Plano ativo: nao pode gerar ate `availableForRegenerationAt`.

## Supabase

Nova tabela: `training_monthly_plan_generation_jobs`.

Campos principais:

- `id`
- `user_id`
- `reservation_id`
- `status`
- `snapshot`
- `athletic_profile`
- `attempt_count`
- `max_attempts`
- `locked_at`
- `lock_expires_at`
- `started_at`
- `completed_at`
- `failed_at`
- `error_message`
- `plan_id`
- `created_at`
- `updated_at`

Funcoes/RPCs previstas:

- `enqueue_training_monthly_plan_generation_job(...)`: chamada pelo backend com JWT do usuario, cria reserva e job.
- `claim_training_monthly_plan_generation_job(...)`: chamada pelo worker server-side, usa lock atomico.
- `complete_training_monthly_plan_generation_job(...)`: chamada pelo worker server-side, persiste plano e finaliza job.
- `fail_training_monthly_plan_generation_job(...)`: chamada pelo worker server-side, marca falha e libera reserva.

## Observabilidade e UX

- A resposta inicial deve deixar claro que o treino foi solicitado, nao concluido.
- O frontend deve usar loading padrao esportivo enquanto o status for `queued` ou `running`.
- Apos `202`, o cache frontend de plano ativo deve ser ignorado ate o polling confirmar plano completo ou falha.
- O polling deve ser leve e parar quando o status for terminal.

## Requisito operacional

Para testar nova geracao com o usuario John Lenon Oliveira da Silva, o plano ativo dele deve ser expirado na base real, com script/SQL controlado que:

- localize o perfil por nome e sobrenome;
- marque plano ativo como `expired`;
- coloque `available_for_regeneration_at` no passado;
- libere reservas pendentes;
- marque jobs pendentes como failed/cancelados se existirem.
