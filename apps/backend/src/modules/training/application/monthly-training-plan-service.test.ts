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
  processAvailableMonthlyTrainingPlanGenerationJobs,
  processNextMonthlyTrainingPlanGenerationJob,
  requestMonthlyTrainingPlanGeneration,
  type MonthlyTrainingPlanServiceDependencies,
} from './monthly-training-plan-service.js';

const user = {
  email: 'athlete@funcione.app',
  id: 'user-123',
  provider: 'password',
};

const secondUser = {
  email: 'second-athlete@funcione.app',
  id: 'user-456',
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
  it('requests monthly generation as a queued durable job without calling the AI', async () => {
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

    const result = await requestMonthlyTrainingPlanGeneration(
      user,
      payload,
      dependencies,
    );

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.generation.status, 'queued');
    assert.equal(result.generation.userId, user.id);
    assert.equal(result.generation.snapshot.idade, 30);
    assert.equal(generationCalls, 0);

    const state = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(state.canGenerate, false);
    assert.equal(state.pendingGeneration?.id, result.generation.id);
  });

  it('processes the next queued monthly generation job and persists the active plan', async () => {
    const dependencies = await createDependencies();

    const requestResult = await requestMonthlyTrainingPlanGeneration(
      user,
      payload,
      dependencies,
    );

    assert.equal(requestResult.ok, true);
    const processResult = await processNextMonthlyTrainingPlanGenerationJob(
      dependencies,
    );

    assert.equal(processResult.ok, true);
    if (!processResult.ok) {
      return;
    }
    assert.equal(processResult.generation.status, 'completed');
    assert.equal(processResult.plan.snapshot.userId, user.id);
    assert.equal(processResult.plan.availableForRegenerationAt, '2026-08-22T12:00:00.000Z');

    const state = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(state.activePlan?.id, processResult.plan.id);
    assert.equal(state.pendingGeneration, null);
    assert.equal(state.canGenerate, false);
  });

  it('requeues a failed async generation job when attempts remain', async () => {
    const dependencies = await createDependencies();
    let currentNow = new Date('2026-07-23T12:00:00.000Z');
    dependencies.now = () => currentNow;
    let generationCalls = 0;
    dependencies.trainingPlanGenerator = async () => {
      generationCalls += 1;

      if (generationCalls === 1) {
        currentNow = new Date('2026-07-23T12:03:30.000Z');

        return {
          attempts: [
            {
              durationMs: 210000,
              error: 'provider timed out',
              model: 'slow-model',
              provider: 'test-provider',
              role: 'primary',
              status: 'error',
            },
          ],
          error: 'test generation failure: test-provider/slow-model: provider timed out',
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

    const requestResult = await requestMonthlyTrainingPlanGeneration(
      user,
      payload,
      dependencies,
    );
    assert.equal(requestResult.ok, true);

    const retryableProcessResult = await processNextMonthlyTrainingPlanGenerationJob(
      dependencies,
    );

    assert.equal(retryableProcessResult.ok, false);
    if (retryableProcessResult.ok) {
      return;
    }
    assert.equal(
      retryableProcessResult.error.code,
      'TRAINING_PLAN_GENERATION_FAILED',
    );

    const retryableGeneration = await dependencies
      .monthlyTrainingPlanGenerationJobRepository.findGenerationJobById(
        user.id,
        requestResult.generation.id,
      );
    assert.equal(retryableGeneration?.status, 'queued');
    assert.equal(retryableGeneration?.attemptCount, 1);
    assert.equal(
      retryableGeneration?.errorMessage,
      'test generation failure: test-provider/slow-model: provider timed out',
    );
    assert.equal(retryableGeneration?.failedAt, null);

    const stateAfterTransientFailure = await getActiveMonthlyTrainingPlan(
      user,
      dependencies,
    );
    assert.equal(stateAfterTransientFailure.canGenerate, false);
    assert.equal(
      stateAfterTransientFailure.pendingGeneration?.id,
      requestResult.generation.id,
    );

    currentNow = new Date('2026-07-23T12:03:45.000Z');
    const completedProcessResult = await processNextMonthlyTrainingPlanGenerationJob(
      dependencies,
    );
    assert.equal(completedProcessResult.ok, true);
    assert.equal(generationCalls, 2);

    const completedState = await getActiveMonthlyTrainingPlan(user, dependencies);
    assert.equal(completedState.activePlan?.userId, user.id);
    assert.equal(completedState.pendingGeneration, null);
  });

  it('keeps draining available generation jobs after a controlled job failure', async () => {
    const dependencies = await createDependencies();
    await dependencies.userProfileRepository.upsert(secondUser.id, {
      birthDate: '1992-05-10',
      cpf: '15350946056',
      email: secondUser.email,
      firstName: 'Maria',
      lastName: 'Atleta',
      phoneNumber: '11988888888',
    });
    let generationCalls = 0;
    dependencies.trainingPlanGenerator = async () => {
      generationCalls += 1;

      if (generationCalls === 1) {
        return {
          attempts: [],
          error: 'first job failed',
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

    const firstRequest = await requestMonthlyTrainingPlanGeneration(
      user,
      payload,
      dependencies,
    );
    const secondRequest = await requestMonthlyTrainingPlanGeneration(
      secondUser,
      payload,
      dependencies,
    );

    assert.equal(firstRequest.ok, true);
    assert.equal(secondRequest.ok, true);

    const results = await processAvailableMonthlyTrainingPlanGenerationJobs(
      dependencies,
    );

    assert.equal(results.length, 3);
    assert.equal(results[0]?.ok, false);
    assert.equal(results[1]?.ok, true);
    assert.equal(results[2]?.ok, true);
    assert.equal(generationCalls, 3);

    const secondState = await getActiveMonthlyTrainingPlan(secondUser, dependencies);
    assert.equal(secondState.activePlan?.userId, secondUser.id);
    assert.equal(secondState.pendingGeneration, null);
  });

  it('records provider attempt logs for async generation jobs', async () => {
    const dependencies = await createDependencies();
    const attemptLogs: Record<string, unknown>[] = [];

    Object.assign(dependencies.monthlyTrainingPlanGenerationJobRepository, {
      recordGenerationAttemptLog: async (input: Record<string, unknown>) => {
        attemptLogs.push(input);
      },
    });
    dependencies.trainingPlanGenerator = async () => ({
      attempts: [
        {
          durationMs: 1200,
          error: 'structured response missing',
          model: 'openai/gpt-oss-120b',
          provider: 'openrouter',
          role: 'primary',
          status: 'error',
        },
        {
          durationMs: 900,
          model: 'openai/gpt-oss-120b',
          provider: 'nvidia',
          role: 'fallback',
          status: 'success',
        },
      ],
      durationMs: 2100,
      fallbackUsed: true,
      model: 'openai/gpt-oss-120b',
      provider: 'nvidia',
      result: generatedPlan,
    });

    const requestResult = await requestMonthlyTrainingPlanGeneration(
      user,
      payload,
      dependencies,
    );
    assert.equal(requestResult.ok, true);
    if (!requestResult.ok) {
      return;
    }

    const processResult = await processNextMonthlyTrainingPlanGenerationJob(
      dependencies,
    );
    assert.equal(processResult.ok, true);

    assert.deepEqual(
      attemptLogs.map((log) => ({
        attemptNumber: log.attemptNumber,
        durationMs: log.durationMs,
        errorMessage: log.errorMessage,
        generationId: log.generationId,
        isTimeout: log.isTimeout,
        model: log.model,
        provider: log.provider,
        providerAttemptNumber: log.providerAttemptNumber,
        role: log.role,
        status: log.status,
      })),
      [
        {
          attemptNumber: 1,
          durationMs: 1200,
          errorMessage: 'structured response missing',
          generationId: requestResult.generation.id,
          isTimeout: false,
          model: 'openai/gpt-oss-120b',
          provider: 'openrouter',
          providerAttemptNumber: 1,
          role: 'primary',
          status: 'error',
        },
        {
          attemptNumber: 1,
          durationMs: 900,
          errorMessage: null,
          generationId: requestResult.generation.id,
          isTimeout: false,
          model: 'openai/gpt-oss-120b',
          provider: 'nvidia',
          providerAttemptNumber: 2,
          role: 'fallback',
          status: 'success',
        },
      ],
    );
  });

  it('uses a configured lease duration when claiming async generation jobs', async () => {
    const dependencies = await createDependencies();
    let claimInput:
      | {
          claimedAt: string;
          leaseExpiresAt: string;
        }
      | undefined;
    dependencies.generationJobLeaseMs = 60_000;
    dependencies.monthlyTrainingPlanGenerationJobRepository.claimNextGenerationJob =
      async (input) => {
        claimInput = input;
        return null;
      };

    const result = await processNextMonthlyTrainingPlanGenerationJob(dependencies);

    assert.equal(result.ok, false);
    assert.deepEqual(claimInput, {
      claimedAt: '2026-07-23T12:00:00.000Z',
      leaseExpiresAt: '2026-07-23T12:01:00.000Z',
    });
  });

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

  it('returns a controlled failure when completion and cleanup transports throw', async () => {
    const dependencies = await createDependencies();
    dependencies.monthlyTrainingPlanRepository.completeActiveGeneration = async () => {
      throw new Error('completion network failure');
    };
    dependencies.monthlyTrainingPlanRepository.releaseActiveGeneration = async () => {
      throw new Error('release network failure');
    };

    const result = await createMonthlyTrainingPlan(user, payload, dependencies);

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.error.code, 'TRAINING_PLAN_GENERATION_FAILED');
    assert.equal(result.error.statusCode, 503);
    assert.equal(
      result.error.message,
      'Monthly training plan could not be persisted.',
    );
  });

  it('recovers an abandoned pending reservation after its 15 minute lease', async () => {
    const dependencies = await createDependencies('2026-07-23T12:00:00.000Z');

    const reservation = await dependencies.monthlyTrainingPlanRepository
      .reserveActiveGeneration(user.id, '2026-07-23T12:00:00.000Z');
    assert.equal(reservation.ok, true);

    dependencies.now = () => new Date('2026-07-23T12:15:00.001Z');
    const recoveredState = await getActiveMonthlyTrainingPlan(user, dependencies);

    assert.equal(recoveredState.activePlan, null);
    assert.equal(recoveredState.canGenerate, true);
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
