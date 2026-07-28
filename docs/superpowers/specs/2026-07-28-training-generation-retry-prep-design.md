# Training Generation Retry And Prep UX Design

## Contexto

As falhas observadas em producao nao indicaram fila lenta: os jobs foram
reivindicados em 1 a 2 segundos. Os casos de Yuri e Giordano falharam por
instabilidade de provider/modelo: resposta estruturada ausente ou erro interno
no OpenRouter e timeout no fallback NVIDIA. Hoje, quando isso acontece, o job
vira `failed`, a reserva e liberada e o usuario precisa solicitar o treino de
novo. Isso transforma uma falha transiente de infraestrutura em uma acao manual.

## Decisoes

- O backend deve tentar automaticamente o mesmo job enquanto `attempt_count` for
  menor que `max_attempts`.
- Uma tentativa de modelo que falha em todos os providers nao deve liberar a
  reserva mensal antes de esgotar as tentativas do job.
- O job deve voltar para a fila com `status = 'queued'`, `locked_at = null` e
  `lock_expires_at = null`; a proxima reivindicacao incrementa
  `attempt_count`.
- O campo `error_message` do job pode guardar o ultimo erro transiente enquanto
  o job ainda esta em fila, mas essa mensagem nao deve ser exibida diretamente
  para o usuario.
- Deve haver observabilidade por tentativa de provider/modelo em uma tabela
  propria, permitindo saber duracao, status, erro, timeout e numero da tentativa.
- O frontend deve trocar a linguagem de "geracao" por "preparo" quando se
  tratar de treino.
- O estado pendente deve mostrar uma barra estimada de ate 3 minutos com
  animacao continua, sem bloquear navegacao.
- O progresso visual e estimado, nao um percentual tecnico exato. Ao passar de 3
  minutos, a barra deve continuar viva em estado quase completo e a copia deve
  informar que o preparo continua.

## Referencias De UX

- NN/g recomenda indicadores de progresso para reduzir incerteza em operacoes
  lentas e usar percentuais quando a espera passa de cerca de 10 segundos:
  https://www.nngroup.com/articles/progress-indicators/
- Smashing Magazine recomenda feedback animado para acoes que levam mais de um
  segundo, porque a animacao ajuda a manter atencao durante a espera:
  https://www.smashingmagazine.com/2016/12/best-practices-for-animated-progress-indicators/
- Carbon Design diferencia indicador indeterminado de barra de progresso; para
  processos que duram mais que poucos momentos, a barra comunica melhor a
  continuidade do trabalho:
  https://v10.carbondesignsystem.com/patterns/loading-pattern/

## Contrato Tecnico

### Backend

- Novo metodo de repositorio:
  `retryGenerationJob(generationId, { errorMessage, retryAt })`.
- Novo metodo opcional de observabilidade:
  `recordGenerationAttemptLog(input)`.
- Nova tabela Supabase: `training_monthly_plan_generation_attempt_logs`.
- `processNextMonthlyTrainingPlanGenerationJob` deve:
  - processar o job normalmente;
  - registrar todos os attempts retornados por `generateTrainingPlan`;
  - se a geracao falhar e ainda houver tentativa disponivel, re-enfileirar o job;
  - somente chamar `failGenerationJobAndReleaseReservation` quando as tentativas
    estiverem esgotadas ou quando a persistencia final do plano falhar.

### Frontend

- `MonthlyTrainingPlanGeneration` passa a incluir `attemptCount` e
  `maxAttempts`.
- O estado pendente usa `createdAt`, `updatedAt`, `attemptCount` e `maxAttempts`
  para texto e progresso estimado.
- Copys em pt-BR:
  - `Preparando seu treino`
  - `Seu treino esta sendo preparado. Assim que terminar, ele aparece aqui.`
  - `Proxima solicitacao de treino apenas em {{date}}`
- Copys em en-US devem manter o mesmo sentido sem usar "generation" para o fluxo
  de treino.

## Fora De Escopo

- Criar worker dedicado no Render.
- Trocar provider/modelo.
- Expor nome tecnico de provider/modelo para usuario final.
- Criar painel admin de observabilidade.
