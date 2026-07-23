import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryUserProfileRepository } from '../../auth/index.js';
import {
  EquipamentoTreino,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  type PlanoTreino,
} from '../domain/index.js';
import { createInMemoryTrainingRepositories } from '../infra/in-memory-training-repositories.js';
import {
  createMonthlyTrainingPlan,
  getActiveMonthlyTrainingPlan,
  type MonthlyTrainingPlanServiceDependencies,
} from './monthly-training-plan-service.js';

const user = {
  email: 'athlete@funcione.app',
  id: 'user-123',
  provider: 'password',
};

const generatedPlan: PlanoTreino = {
  resumo: 'Plano semanal base.',
  treinos: [
    {
      alongamentos: [],
      dia: 'Segunda-feira',
      duracaoMinutos: 60,
      exercicios: [],
      foco: 'potencia',
    },
    {
      alongamentos: [],
      dia: 'Quarta-feira',
      duracaoMinutos: 60,
      exercicios: [],
      foco: 'agilidade',
    },
  ],
};

const payload = {
  alturaCm: 180,
  duracaoTreinoMinutos: 60,
  equipamentos: [{ tipo: EquipamentoTreino.Halteres }],
  lesoes: [],
  localTreino: LocalTreino.Casa,
  modalidade: ModalidadeEsportiva.Volei,
  nivelExperiencia: NivelExperiencia.Intermediario,
  objetivos: [ObjetivoTreino.Performance],
  pesoKg: 82,
  tempoDisponivel: TempoDisponivel.TresVezesPorSemana,
};

async function createDependencies(
  nowIso = '2026-07-23T12:00:00.000Z',
): Promise<MonthlyTrainingPlanServiceDependencies> {
  const userProfileRepository = createInMemoryUserProfileRepository();
  await userProfileRepository.upsert(user.id, {
    birthDate: '1996-07-20',
    cpf: '52998224725',
    email: 'athlete@funcione.app',
    firstName: 'Joao',
    lastName: 'Silva',
    phoneNumber: '11999999999',
  });

  return {
    ...createInMemoryTrainingRepositories(),
    now: () => new Date(nowIso),
    trainingPlanGenerator: async () => ({
      attempts: [],
      durationMs: 10,
      fallbackUsed: false,
      model: 'test-model',
      provider: 'test-provider',
      result: generatedPlan,
    }),
    userProfileRepository,
  };
}

describe('monthly training plan service', () => {
  it('returns generation availability when no active plan exists', async () => {
    const dependencies = await createDependencies();

    const state = await getActiveMonthlyTrainingPlan(user, dependencies);

    assert.equal(state.canGenerate, true);
    assert.equal(state.activePlan, null);
  });

  it('creates a monthly plan with calculated age, snapshot and reusable athletic profile', async () => {
    const dependencies = await createDependencies();

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.plan.snapshot.idade, 30);
    assert.equal(result.plan.snapshot.userId, user.id);
    assert.equal(result.plan.snapshot.equipamentos[0]?.tipo, EquipamentoTreino.Halteres);
    assert.equal(result.plan.availableForRegenerationAt, '2026-08-22T12:00:00.000Z');

    const profile = await dependencies.athleticProfileRepository.findByUserId(user.id);
    assert.equal(profile?.pesoKg, 82);
  });

  it('rejects client supplied user identity fields', async () => {
    const dependencies = await createDependencies();

    const result = await createMonthlyTrainingPlan(
      user,
      { ...payload, idade: 16, userId: 'another-user' },
      dependencies,
    );

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.equal(result.error.statusCode, 400);
  });

  it('completes the active plan and athletic profile through one repository operation', async () => {
    const dependencies = await createDependencies();
    dependencies.athleticProfileRepository.upsert = async () => {
      throw new Error('separate profile upsert should not run');
    };

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, true);
    const profile = await dependencies.athleticProfileRepository.findByUserId(user.id);
    assert.equal(profile?.pesoKg, payload.pesoKg);
  });

  it('releases a reservation when transactional completion fails', async () => {
    const dependencies = await createDependencies();
    const completeActiveGeneration =
      dependencies.monthlyTrainingPlanRepository.completeActiveGeneration;
    let completionProfile: { pesoKg: number } | undefined;
    dependencies.monthlyTrainingPlanRepository.completeActiveGeneration = async (...args) => {
      completionProfile = (args as unknown[])[2] as { pesoKg: number } | undefined;
      return { ok: false, reason: 'RESERVATION_NOT_FOUND' };
    };

    const failedResult = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(failedResult.ok, false);
    assert.equal(completionProfile?.pesoKg, payload.pesoKg);
    const stateAfterFailure = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(stateAfterFailure.activePlan, null);
    assert.equal(stateAfterFailure.athleticProfile, null);
    assert.equal(stateAfterFailure.canGenerate, true);

    dependencies.monthlyTrainingPlanRepository.completeActiveGeneration =
      completeActiveGeneration;
    const retryResult = await createMonthlyTrainingPlan(user, payload, dependencies);
    assert.equal(retryResult.ok, true);
  });

  it('blocks a second generation before 30 days', async () => {
    const dependencies = await createDependencies();

    await createMonthlyTrainingPlan(user, payload, dependencies);
    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error.code, 'MONTHLY_PLAN_ALREADY_ACTIVE');
    assert.equal(result.error.statusCode, 409);
  });

  it('allows only one active plan when generations run concurrently', async () => {
    const dependencies = await createDependencies();
    let generationCalls = 0;
    dependencies.trainingPlanGenerator = async () => {
      generationCalls += 1;
      return {
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      };
    };
    const rejectedPayload = { ...payload, pesoKg: 99 };

    const results = await Promise.all([
      createMonthlyTrainingPlan(user, payload, dependencies),
      createMonthlyTrainingPlan(user, rejectedPayload, dependencies),
    ]);

    assert.equal(generationCalls, 1);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const conflict = results.find((result) => !result.ok);
    assert.equal(conflict?.ok, false);
    if (!conflict || conflict.ok) {
      return;
    }
    assert.equal(conflict.error.code, 'MONTHLY_PLAN_ALREADY_ACTIVE');
    assert.equal(conflict.error.statusCode, 409);

    const state = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(state.activePlan?.snapshot.pesoKg, payload.pesoKg);
    assert.equal(state.athleticProfile?.pesoKg, payload.pesoKg);
  });

  it('blocks generation availability while a reservation is pending', async () => {
    const dependencies = await createDependencies();
    let resolveGeneration: (() => void) | undefined;
    let markGenerationStarted: (() => void) | undefined;
    const generationStarted = new Promise<void>((resolve) => {
      markGenerationStarted = resolve;
    });
    const generationBlocked = new Promise<void>((resolve) => {
      resolveGeneration = resolve;
    });
    dependencies.trainingPlanGenerator = async () => {
      markGenerationStarted?.();
      await generationBlocked;

      return {
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      };
    };

    const pendingGeneration = createMonthlyTrainingPlan(user, payload, dependencies);
    await generationStarted;

    const pendingState = await getActiveMonthlyTrainingPlan(user, dependencies);

    assert.equal(pendingState.activePlan, null);
    assert.equal(pendingState.canGenerate, false);
    resolveGeneration?.();
    const result = await pendingGeneration;
    assert.equal(result.ok, true);
  });

  it('reads active and pending generation state atomically', async () => {
    const dependencies = await createDependencies();
    let atomicStateReads = 0;
    Object.assign(dependencies.monthlyTrainingPlanRepository, {
      findActiveGenerationStateByUserId: async () => {
        atomicStateReads += 1;
        return { activePlan: null, hasPendingGeneration: true };
      },
    });

    const state = await getActiveMonthlyTrainingPlan(user, dependencies);

    assert.equal(atomicStateReads, 1);
    assert.equal(state.activePlan, null);
    assert.equal(state.canGenerate, false);
  });

  it('blocks regeneration one millisecond before 30 days', async () => {
    const dependencies = await createDependencies('2026-07-01T10:00:00.000Z');

    await createMonthlyTrainingPlan(user, payload, dependencies);
    dependencies.now = () => new Date('2026-07-31T09:59:59.999Z');

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error.code, 'MONTHLY_PLAN_ALREADY_ACTIVE');
  });

  it('allows regeneration exactly 30 days after generation', async () => {
    const dependencies = await createDependencies('2026-07-01T10:00:00.000Z');

    await createMonthlyTrainingPlan(user, payload, dependencies);
    dependencies.now = () => new Date('2026-07-31T10:00:00.000Z');

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, true);
    const state = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(state.activePlan?.generatedAt, '2026-07-31T10:00:00.000Z');
  });

  it('rejects generation when registration birth date is invalid', async () => {
    const dependencies = await createDependencies();
    await dependencies.userProfileRepository.upsert(user.id, {
      birthDate: 'invalid-date',
      cpf: '52998224725',
      email: 'athlete@funcione.app',
      firstName: 'Joao',
      lastName: 'Silva',
      phoneNumber: '11999999999',
    });

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error.code, 'PROFILE_BIRTH_DATE_INVALID');
    assert.equal(result.error.statusCode, 400);
  });

  it('rejects a derived age outside the training schema before generation', async () => {
    const dependencies = await createDependencies();
    await dependencies.userProfileRepository.upsert(user.id, {
      birthDate: '2011-07-23',
      cpf: '52998224725',
      email: 'athlete@funcione.app',
      firstName: 'Joao',
      lastName: 'Silva',
      phoneNumber: '11999999999',
    });
    let generationCalls = 0;
    dependencies.trainingPlanGenerator = async () => {
      generationCalls += 1;
      return {
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      };
    };

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error.code, 'PROFILE_BIRTH_DATE_INVALID');
    assert.equal(result.error.statusCode, 400);
    assert.equal(generationCalls, 0);
  });

  it('releases a failed generation reservation and permits retry', async () => {
    const dependencies = await createDependencies();
    let generationCalls = 0;
    dependencies.trainingPlanGenerator = async () => {
      generationCalls += 1;

      if (generationCalls === 1) {
        return {
          attempts: [],
          error: 'test generation failure',
          fallbackUsed: false,
        };
      }

      return {
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      };
    };

    const failedResult = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(failedResult.ok, false);
    if (failedResult.ok) {
      return;
    }
    assert.equal(failedResult.error.code, 'TRAINING_PLAN_GENERATION_FAILED');
    const stateAfterFailure = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(stateAfterFailure.canGenerate, true);
    assert.equal(stateAfterFailure.athleticProfile, null);

    const retryResult = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(retryResult.ok, true);
    assert.equal(generationCalls, 2);
  });

  it('releases a reservation when the generator throws and permits retry', async () => {
    const dependencies = await createDependencies();
    let generationCalls = 0;
    dependencies.trainingPlanGenerator = async () => {
      generationCalls += 1;

      if (generationCalls === 1) {
        throw new Error('thrown test generation failure');
      }

      return {
        attempts: [],
        durationMs: 10,
        fallbackUsed: false,
        model: 'test-model',
        provider: 'test-provider',
        result: generatedPlan,
      };
    };

    const failedResult = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(failedResult.ok, false);
    if (failedResult.ok) {
      return;
    }
    assert.equal(failedResult.error.code, 'TRAINING_PLAN_GENERATION_FAILED');
    const stateAfterFailure = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(stateAfterFailure.canGenerate, true);
    assert.equal(stateAfterFailure.athleticProfile, null);

    const retryResult = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(retryResult.ok, true);
    assert.equal(generationCalls, 2);
  });
});
