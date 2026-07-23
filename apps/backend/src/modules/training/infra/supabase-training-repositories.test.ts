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
import { createSupabaseTrainingRepositories } from './supabase-training-repositories.js';

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
      .findActiveGenerationStateByUserId('user-123');

    assert.equal(state.hasPendingGeneration, true);
    assert.equal(state.activePlan?.id, 'plan-123');
    assert.equal(requests.length, 1);
    assert.match(
      requests[0]?.url ?? '',
      /\/rest\/v1\/rpc\/get_training_monthly_plan_generation_state$/,
    );
    assert.deepEqual(requests[0]?.body, { p_user_id: 'user-123' });
  });

  it('reserves once, maps conflicts, and releases or expires user-owned state', async () => {
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
    await repository.expireActiveByUserId(
      'user-123',
      '2026-08-22T12:00:00.000Z',
    );

    assert.deepEqual(reservation, { ok: true, reservationId: 'reservation-123' });
    assert.deepEqual(conflict, { ok: false, reason: 'ACTIVE_PLAN_CONFLICT' });
    assert.deepEqual(requests[0]?.body, {
      p_reserved_at: '2026-07-23T12:00:00.000Z',
      p_user_id: 'user-123',
    });
    assert.deepEqual(requests[2]?.body, {
      released_at: '2026-07-23T12:01:00.000Z',
    });
    assert.match(
      requests[2]?.url ?? '',
      /training_monthly_plan_generation_reservations\?id=eq.reservation-123/,
    );
    assert.deepEqual(requests[3]?.body, {
      status: MonthlyTrainingPlanStatus.Expired,
      updated_at: '2026-08-22T12:00:00.000Z',
    });
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
});
