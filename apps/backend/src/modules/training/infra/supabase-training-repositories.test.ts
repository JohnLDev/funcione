import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MonthlyTrainingPlanInput } from '../application/monthly-training-plan-repository.js';
import {
  EquipamentoTreino,
  LocalTreino,
  ModalidadeEsportiva,
  MonthlyTrainingPlanStatus,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  type AthleticProfileInput,
  type DadosUsuario,
} from '../domain/index.js';
import {
  createSupabaseTrainingRepositories,
  createSupabaseTrainingWorkerRepositories,
} from './supabase-training-repositories.js';

const athleticProfileRow = {
  altura_cm: 180,
  created_at: '2026-07-23T12:00:00.000Z',
  equipamentos_disponiveis: [{ tipo: EquipamentoTreino.Halteres }],
  lesoes_recorrentes: [],
  local_treino_comum: LocalTreino.Casa,
  modalidade_preferida: ModalidadeEsportiva.Volei,
  nivel_experiencia: NivelExperiencia.Intermediario,
  peso_kg: 82,
  updated_at: '2026-07-23T12:00:00.000Z',
  user_id: 'user-123',
};

const snapshot: DadosUsuario = {
  alturaCm: 180,
  duracaoTreinoMinutos: 60,
  equipamentos: [{ tipo: EquipamentoTreino.Halteres }],
  idade: 30,
  lesoes: [],
  localTreino: LocalTreino.Casa,
  modalidade: ModalidadeEsportiva.Volei,
  nivelExperiencia: NivelExperiencia.Intermediario,
  objetivos: [ObjetivoTreino.Performance],
  pesoKg: 82,
  tempoDisponivel: TempoDisponivel.TresVezesPorSemana,
  userId: 'user-123',
};

const monthlyPlanRow = {
  available_for_regeneration_at: '2026-08-22T12:00:00.000Z',
  created_at: '2026-07-23T12:00:01.000Z',
  generated_at: '2026-07-23T12:00:00.000Z',
  id: 'plan-123',
  metadata: {
    attempts: [],
    durationMs: 10,
    fallbackUsed: false,
    model: 'test-model',
    provider: 'test-provider',
  },
  result: {
    resumo: 'Plano semanal base.',
    treinos: [],
  },
  snapshot,
  status: MonthlyTrainingPlanStatus.Active,
  updated_at: '2026-07-23T12:00:01.000Z',
  user_id: 'user-123',
};

const generationJobRow = {
  attempt_count: 0,
  athletic_profile: {
    altura_cm: 180,
    equipamentos_disponiveis: [{ tipo: EquipamentoTreino.Halteres }],
    lesoes_recorrentes: [],
    local_treino_comum: LocalTreino.Casa,
    modalidade_preferida: ModalidadeEsportiva.Volei,
    nivel_experiencia: NivelExperiencia.Intermediario,
    peso_kg: 82,
  },
  completed_at: null,
  created_at: '2026-07-23T12:00:00.000Z',
  error_message: null,
  failed_at: null,
  id: 'generation-123',
  lock_expires_at: null,
  locked_at: null,
  max_attempts: 3,
  plan_id: null,
  reservation_id: 'reservation-123',
  snapshot,
  started_at: null,
  status: 'queued',
  updated_at: '2026-07-23T12:00:00.000Z',
  user_id: 'user-123',
};

const athleticProfileInput: AthleticProfileInput = {
  alturaCm: 180,
  equipamentosDisponiveis: [{ tipo: EquipamentoTreino.Halteres }],
  lesoesRecorrentes: [],
  localTreinoComum: LocalTreino.Casa,
  modalidadePreferida: ModalidadeEsportiva.Volei,
  nivelExperiencia: NivelExperiencia.Intermediario,
  pesoKg: 82,
};

const monthlyPlanInput: MonthlyTrainingPlanInput = {
  availableForRegenerationAt: monthlyPlanRow.available_for_regeneration_at,
  generatedAt: monthlyPlanRow.generated_at,
  metadata: monthlyPlanRow.metadata,
  result: monthlyPlanRow.result,
  snapshot: monthlyPlanRow.snapshot,
  status: MonthlyTrainingPlanStatus.Active,
  userId: 'user-123',
};

type CapturedRequest = {
  apikey: string | null;
  authorization: string | null;
  body: Record<string, unknown> | null;
  method: string;
  url: string;
};

function createRepositories(
  responder: (request: CapturedRequest) => Response | Promise<Response>,
) {
  const requests: CapturedRequest[] = [];
  const repositories = createSupabaseTrainingRepositories({
    accessToken: 'user-jwt',
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const captured = {
        apikey: request.headers.get('apikey'),
        authorization: request.headers.get('authorization'),
        body: init?.body
          ? (JSON.parse(String(init.body)) as Record<string, unknown>)
          : null,
        method: request.method,
        url: request.url,
      };
      requests.push(captured);

      return responder(captured);
    },
    supabasePublishableKey: 'publishable-key',
    supabaseUrl: 'https://project.supabase.co',
  });

  return { repositories, requests };
}

function createWorkerRepositories(
  responder: (request: CapturedRequest) => Response | Promise<Response>,
) {
  const requests: CapturedRequest[] = [];
  const repositories = createSupabaseTrainingWorkerRepositories({
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const captured = {
        apikey: request.headers.get('apikey'),
        authorization: request.headers.get('authorization'),
        body: init?.body
          ? (JSON.parse(String(init.body)) as Record<string, unknown>)
          : null,
        method: request.method,
        url: request.url,
      };
      requests.push(captured);

      return responder(captured);
    },
    supabaseSecretKey: 'secret-key',
    supabaseUrl: 'https://project.supabase.co',
  });

  return { repositories, requests };
}

describe('Supabase training repositories', () => {
  it('maps athletic profile lookup and upsert rows', async () => {
    const { repositories, requests } = createRepositories(() =>
      Response.json(athleticProfileRow),
    );

    const found = await repositories.athleticProfileRepository.findByUserId(
      'user-123',
    );
    const saved = await repositories.athleticProfileRepository.upsert(
      'user-123',
      athleticProfileInput,
    );

    assert.deepEqual(found, {
      ...athleticProfileInput,
      createdAt: athleticProfileRow.created_at,
      updatedAt: athleticProfileRow.updated_at,
      userId: 'user-123',
    });
    assert.deepEqual(saved, found);
    assert.match(requests[0]?.url ?? '', /user_id=eq.user-123/);
    assert.deepEqual(
      { ...requests[1]?.body, updated_at: undefined },
      {
        altura_cm: 180,
        equipamentos_disponiveis: [{ tipo: EquipamentoTreino.Halteres }],
        lesoes_recorrentes: [],
        local_treino_comum: LocalTreino.Casa,
        modalidade_preferida: ModalidadeEsportiva.Volei,
        nivel_experiencia: NivelExperiencia.Intermediario,
        peso_kg: 82,
        updated_at: undefined,
        user_id: 'user-123',
      },
    );
    assert.match(String(requests[1]?.body?.updated_at), /^\d{4}-\d{2}-\d{2}T/);
  });

  it('reads active and pending generation state through one atomic RPC', async () => {
    const { repositories, requests } = createRepositories(() =>
      Response.json({
        active_plan: monthlyPlanRow,
        has_pending_generation: true,
      }),
    );

    const state = await repositories.monthlyTrainingPlanRepository
      .findActiveGenerationStateByUserId(
        'user-123',
        '2026-07-23T12:00:00.000Z',
      );

    assert.equal(state.hasPendingGeneration, true);
    assert.equal(state.activePlan?.id, 'plan-123');
    assert.equal(requests.length, 1);
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/get_training_monthly_plan_generation_state$/,
    );
    assert.deepEqual(requests[0]?.body, { p_user_id: 'user-123' });
  });

  it('reserves once, maps conflicts, and releases through owner-checked RPCs', async () => {
    let reserveCalls = 0;
    const { repositories, requests } = createRepositories((request) => {
      if (request.url.endsWith('/rpc/reserve_training_monthly_plan_generation')) {
        reserveCalls += 1;
        return Response.json(reserveCalls === 1 ? 'reservation-123' : null);
      }

      return Response.json([]);
    });
    const repository = repositories.monthlyTrainingPlanRepository;

    const reservation = await repository.reserveActiveGeneration(
      'user-123',
      '2026-07-23T12:00:00.000Z',
    );
    const conflict = await repository.reserveActiveGeneration(
      'user-123',
      '2026-07-23T12:00:00.001Z',
    );
    await repository.releaseActiveGeneration(
      'reservation-123',
      '2026-07-23T12:01:00.000Z',
    );

    assert.deepEqual(reservation, { ok: true, reservationId: 'reservation-123' });
    assert.deepEqual(conflict, { ok: false, reason: 'ACTIVE_PLAN_CONFLICT' });
    assert.deepEqual(requests[0]?.body, {
      p_user_id: 'user-123',
    });
    assert.deepEqual(requests[2]?.body, {
      p_reservation_id: 'reservation-123',
    });
    assert.match(
      requests[2]?.url ?? '',
      /\/rest\/v1\/rpc\/release_training_monthly_plan_generation$/,
    );
  });

  it('completes the plan and athletic profile through one transactional RPC', async () => {
    let completionCalls = 0;
    const { repositories, requests } = createRepositories((request) => {
      completionCalls += 1;
      return Response.json(completionCalls === 1 ? monthlyPlanRow : null);
    });
    const repository = repositories.monthlyTrainingPlanRepository;

    const completed = await repository.completeActiveGeneration(
      'reservation-123',
      monthlyPlanInput,
      athleticProfileInput,
    );
    const missing = await repository.completeActiveGeneration(
      'missing-reservation',
      monthlyPlanInput,
      athleticProfileInput,
    );

    assert.equal(completed.ok, true);
    if (completed.ok) {
      assert.equal(completed.plan.id, 'plan-123');
      assert.equal(completed.plan.snapshot.userId, 'user-123');
    }
    assert.deepEqual(missing, { ok: false, reason: 'RESERVATION_NOT_FOUND' });
    assert.equal(requests.length, 2);
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/complete_training_monthly_plan_generation$/,
    );
    assert.deepEqual(requests[0]?.body, {
      p_athletic_profile: {
        altura_cm: 180,
        equipamentos_disponiveis: [{ tipo: EquipamentoTreino.Halteres }],
        lesoes_recorrentes: [],
        local_treino_comum: LocalTreino.Casa,
        modalidade_preferida: ModalidadeEsportiva.Volei,
        nivel_experiencia: NivelExperiencia.Intermediario,
        peso_kg: 82,
      },
      p_plan: {
        available_for_regeneration_at: '2026-08-22T12:00:00.000Z',
        generated_at: '2026-07-23T12:00:00.000Z',
        metadata: monthlyPlanRow.metadata,
        result: monthlyPlanRow.result,
        snapshot: monthlyPlanRow.snapshot,
        status: MonthlyTrainingPlanStatus.Active,
        user_id: 'user-123',
      },
      p_reservation_id: 'reservation-123',
    });
  });

  it('enqueues, reads, and finds pending durable generation jobs', async () => {
    const { repositories, requests } = createRepositories((request) => {
      if (request.url.endsWith('/rpc/enqueue_training_monthly_plan_generation_job')) {
        return Response.json(generationJobRow);
      }

      return Response.json(generationJobRow);
    });
    const repository = repositories.monthlyTrainingPlanGenerationJobRepository;

    const enqueued = await repository.enqueueGenerationJob({
      athleticProfile: athleticProfileInput,
      createdAt: generationJobRow.created_at,
      reservationId: generationJobRow.reservation_id,
      snapshot,
      userId: 'user-123',
    });
    const found = await repository.findGenerationJobById(
      'user-123',
      'generation-123',
    );
    const pending = await repository.findPendingGenerationByUserId(
      'user-123',
      '2026-07-23T12:00:00.000Z',
    );

    assert.equal(enqueued.id, 'generation-123');
    assert.equal(enqueued.status, 'queued');
    assert.equal(enqueued.athleticProfile.pesoKg, 82);
    assert.equal(found?.id, 'generation-123');
    assert.equal(pending?.id, 'generation-123');
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/enqueue_training_monthly_plan_generation_job$/,
    );
    assert.deepEqual(requests[0]?.body, {
      p_athletic_profile: generationJobRow.athletic_profile,
      p_created_at: generationJobRow.created_at,
      p_reservation_id: generationJobRow.reservation_id,
      p_snapshot: snapshot,
      p_user_id: 'user-123',
    });
    assert.match(
      requests[1]?.url ?? '',
      /training_monthly_plan_generation_jobs/,
    );
    assert.match(requests[1]?.url ?? '', /id=eq.generation-123/);
    assert.match(requests[2]?.url ?? '', /status=in.%28queued%2Crunning%29/);
  });

  it('ignores exhausted expired running jobs when finding pending durable generation jobs', async () => {
    const exhaustedExpiredJobRow = {
      ...generationJobRow,
      attempt_count: 3,
      id: 'generation-exhausted',
      lock_expires_at: '2026-07-23T12:05:00.000Z',
      locked_at: '2026-07-23T11:40:00.000Z',
      max_attempts: 3,
      started_at: '2026-07-23T11:40:00.000Z',
      status: 'running',
    };
    const retryableExpiredJobRow = {
      ...generationJobRow,
      attempt_count: 2,
      created_at: '2026-07-23T12:00:01.000Z',
      id: 'generation-retryable',
      lock_expires_at: '2026-07-23T12:05:00.000Z',
      locked_at: '2026-07-23T11:40:00.000Z',
      max_attempts: 3,
      started_at: '2026-07-23T11:40:00.000Z',
      status: 'running',
    };
    const { repositories } = createRepositories(() =>
      Response.json([exhaustedExpiredJobRow, retryableExpiredJobRow]),
    );

    const pending = await repositories.monthlyTrainingPlanGenerationJobRepository
      .findPendingGenerationByUserId(
        'user-123',
        '2026-07-23T12:06:00.000Z',
      );

    assert.equal(pending?.id, 'generation-retryable');
  });

  it('claims, completes, and fails durable generation jobs through worker RPCs', async () => {
    const runningJobRow = {
      ...generationJobRow,
      attempt_count: 1,
      lock_expires_at: '2026-07-23T12:15:00.000Z',
      locked_at: '2026-07-23T12:00:00.000Z',
      started_at: '2026-07-23T12:00:00.000Z',
      status: 'running',
    };
    const completedJobRow = {
      ...runningJobRow,
      completed_at: '2026-07-23T12:01:00.000Z',
      lock_expires_at: null,
      locked_at: null,
      plan_id: 'plan-123',
      status: 'completed',
      updated_at: '2026-07-23T12:01:00.000Z',
    };
    const failedJobRow = {
      ...runningJobRow,
      error_message: 'model failed',
      failed_at: '2026-07-23T12:01:30.000Z',
      lock_expires_at: null,
      locked_at: null,
      status: 'failed',
      updated_at: '2026-07-23T12:01:30.000Z',
    };
    const responses = [runningJobRow, completedJobRow, failedJobRow];
    const { repositories, requests } = createRepositories(() =>
      Response.json(responses.shift() ?? null),
    );
    const repository = repositories.monthlyTrainingPlanGenerationJobRepository;

    const claimed = await repository.claimNextGenerationJob({
      claimedAt: '2026-07-23T12:00:00.000Z',
      leaseExpiresAt: '2026-07-23T12:15:00.000Z',
    });
    const completed = await repository.completeGenerationJob('generation-123', {
      completedAt: '2026-07-23T12:01:00.000Z',
      planId: 'plan-123',
    });
    const failed = await repository.failGenerationJob('generation-123', {
      errorMessage: 'model failed',
      failedAt: '2026-07-23T12:01:30.000Z',
    });

    assert.equal(claimed?.status, 'running');
    assert.equal(claimed?.attemptCount, 1);
    assert.equal(completed?.status, 'completed');
    assert.equal(completed?.planId, 'plan-123');
    assert.equal(failed?.status, 'failed');
    assert.equal(failed?.errorMessage, 'model failed');
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/claim_training_monthly_plan_generation_job$/,
    );
    assert.deepEqual(requests[0]?.body, {
      p_claimed_at: '2026-07-23T12:00:00.000Z',
      p_lease_expires_at: '2026-07-23T12:15:00.000Z',
    });
    assert.match(
      requests[1]?.url ?? '',
      /\/rest\/v1\/rpc\/complete_training_monthly_plan_generation_job$/,
    );
    assert.deepEqual(requests[1]?.body, {
      p_completed_at: '2026-07-23T12:01:00.000Z',
      p_generation_id: 'generation-123',
      p_plan_id: 'plan-123',
    });
    assert.match(
      requests[2]?.url ?? '',
      /\/rest\/v1\/rpc\/fail_training_monthly_plan_generation_job$/,
    );
    assert.deepEqual(requests[2]?.body, {
      p_error_message: 'model failed',
      p_failed_at: '2026-07-23T12:01:30.000Z',
      p_generation_id: 'generation-123',
    });
  });

  it('records attempt logs and requeues retryable durable generation jobs', async () => {
    const retryableJobRow = {
      ...generationJobRow,
      attempt_count: 1,
      error_message: 'provider failed',
      lock_expires_at: null,
      locked_at: null,
      status: 'queued',
      updated_at: '2026-07-23T12:02:00.000Z',
    };
    const responses = [null, retryableJobRow];
    const { repositories, requests } = createWorkerRepositories(() =>
      Response.json(responses.shift() ?? null),
    );
    const repository = repositories.monthlyTrainingPlanGenerationJobRepository;

    await repository.recordGenerationAttemptLog({
      attemptNumber: 1,
      durationMs: 1200,
      errorMessage: 'provider failed',
      generationId: 'generation-123',
      isTimeout: false,
      model: 'openai/gpt-oss-120b',
      provider: 'openrouter',
      providerAttemptNumber: 1,
      recordedAt: '2026-07-23T12:01:00.000Z',
      role: 'primary',
      status: 'error',
    });
    const retryable = await repository.retryGenerationJob('generation-123', {
      errorMessage: 'provider failed',
      retryAt: '2026-07-23T12:02:00.000Z',
    });

    assert.equal(retryable?.status, 'queued');
    assert.equal(retryable?.errorMessage, 'provider failed');
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/training_monthly_plan_generation_attempt_logs$/,
    );
    assert.equal(requests[0]?.method, 'POST');
    assert.deepEqual(requests[0]?.body, {
      attempt_number: 1,
      duration_ms: 1200,
      error_message: 'provider failed',
      generation_id: 'generation-123',
      is_timeout: false,
      model: 'openai/gpt-oss-120b',
      provider: 'openrouter',
      provider_attempt_number: 1,
      recorded_at: '2026-07-23T12:01:00.000Z',
      role: 'primary',
      status: 'error',
    });
    assert.match(
      requests[1]?.url ?? '',
      /\/rest\/v1\/training_monthly_plan_generation_jobs/,
    );
    assert.equal(requests[1]?.method, 'PATCH');
    assert.match(requests[1]?.url ?? '', /id=eq.generation-123/);
    assert.match(requests[1]?.url ?? '', /status=in.%28queued%2Crunning%29/);
    assert.deepEqual(requests[1]?.body, {
      error_message: 'provider failed',
      failed_at: null,
      lock_expires_at: null,
      locked_at: null,
      status: 'queued',
      updated_at: '2026-07-23T12:02:00.000Z',
    });
  });

  it('treats a null composite claim response as no available generation job', async () => {
    const nullCompositeJobRow = Object.fromEntries(
      Object.keys(generationJobRow).map((key) => [key, null]),
    );
    const { repositories, requests } = createWorkerRepositories(() =>
      Response.json(nullCompositeJobRow),
    );
    const repository = repositories.monthlyTrainingPlanGenerationJobRepository;

    const claimed = await repository.claimNextGenerationJob({
      claimedAt: '2026-07-23T12:00:00.000Z',
      leaseExpiresAt: '2026-07-23T12:15:00.000Z',
    });

    assert.equal(claimed, null);
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/claim_training_monthly_plan_generation_job$/,
    );
  });

  it('builds worker repositories with the Supabase secret key and internal plan RPCs', async () => {
    const { repositories, requests } = createWorkerRepositories(() =>
      Response.json(monthlyPlanRow),
    );

    const completed = await repositories.monthlyTrainingPlanRepository
      .completeActiveGeneration(
        'reservation-123',
        monthlyPlanInput,
        athleticProfileInput,
      );
    await repositories.monthlyTrainingPlanRepository.releaseActiveGeneration(
      'reservation-123',
      '2026-07-23T12:02:00.000Z',
    );

    assert.equal(completed.ok, true);
    assert.equal(requests[0]?.authorization, 'Bearer secret-key');
    assert.equal(requests[0]?.apikey, 'secret-key');
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/complete_training_monthly_plan_generation_as_worker$/,
    );
    assert.deepEqual(requests[0]?.body, {
      p_athletic_profile: generationJobRow.athletic_profile,
      p_completed_at: monthlyPlanInput.generatedAt,
      p_plan: {
        available_for_regeneration_at: '2026-08-22T12:00:00.000Z',
        generated_at: '2026-07-23T12:00:00.000Z',
        metadata: monthlyPlanRow.metadata,
        result: monthlyPlanRow.result,
        snapshot: monthlyPlanRow.snapshot,
        status: MonthlyTrainingPlanStatus.Active,
        user_id: 'user-123',
      },
      p_reservation_id: 'reservation-123',
    });
    assert.match(
      requests[1]?.url ?? '',
      /\/rest\/v1\/rpc\/release_training_monthly_plan_generation_as_worker$/,
    );
    assert.deepEqual(requests[1]?.body, {
      p_released_at: '2026-07-23T12:02:00.000Z',
      p_reservation_id: 'reservation-123',
    });
  });
});
