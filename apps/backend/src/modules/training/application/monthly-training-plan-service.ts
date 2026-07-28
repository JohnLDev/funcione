import type { AuthenticatedUser, UserProfileRepository } from '../../auth/index.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import {
  addDays,
  calculateAgeFromBirthDate,
  type AthleticProfileInput,
  type MonthlyTrainingPlanGeneration,
  type MonthlyTrainingPlan,
  type MonthlyTrainingPlanState,
} from '../domain/monthly-plan.js';
import {
  CreateMonthlyTrainingPlanRequestSchema,
  DadosUsuarioSchema,
  type DadosUsuario,
} from '../domain/schemas.js';
import type { AthleticProfileRepository } from './athletic-profile-repository.js';
import type {
  GenerateTrainingPlanResult,
  ModelAttempt,
  TrainingPlanGenerator,
} from './generate-training-plan.js';
import type { MonthlyTrainingPlanGenerationJobRepository } from './monthly-training-plan-generation-job-repository.js';
import type {
  ActiveGenerationState,
  MonthlyTrainingPlanRepository,
} from './monthly-training-plan-repository.js';

const defaultGenerationJobLeaseMs = 25 * 60 * 1_000;

export type MonthlyTrainingPlanServiceDependencies = {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanGenerationJobRepository: MonthlyTrainingPlanGenerationJobRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
  generationJobLeaseMs?: number;
  now?: () => Date;
  trainingPlanGenerator: TrainingPlanGenerator;
  userProfileRepository: UserProfileRepository;
};

export type CreateMonthlyTrainingPlanError = {
  code:
    | 'MONTHLY_PLAN_ALREADY_ACTIVE'
    | 'PROFILE_BIRTH_DATE_INVALID'
    | 'PROFILE_REQUIRED'
    | 'TRAINING_PLAN_GENERATION_FAILED'
    | 'VALIDATION_ERROR';
  details?: Record<string, unknown>[];
  message: string;
  statusCode: 400 | 409 | 503;
};

export type CreateMonthlyTrainingPlanResult =
  | { ok: true; plan: MonthlyTrainingPlan }
  | { error: CreateMonthlyTrainingPlanError; ok: false };

export type RequestMonthlyTrainingPlanGenerationResult =
  | { generation: MonthlyTrainingPlanGeneration; ok: true }
  | { error: CreateMonthlyTrainingPlanError; ok: false };

export type ProcessMonthlyTrainingPlanGenerationJobError = {
  code:
    | 'MONTHLY_GENERATION_JOB_NOT_AVAILABLE'
    | 'TRAINING_PLAN_GENERATION_FAILED';
  details?: Record<string, unknown>[];
  message: string;
  statusCode: 404 | 503;
};

export type ProcessMonthlyTrainingPlanGenerationJobResult =
  | {
      generation: MonthlyTrainingPlanGeneration;
      ok: true;
      plan: MonthlyTrainingPlan;
    }
  | {
      error: ProcessMonthlyTrainingPlanGenerationJobError;
      generation?: MonthlyTrainingPlanGeneration;
      ok: false;
    };

function toActivePlanConflict(): CreateMonthlyTrainingPlanResult {
  return {
    error: {
      code: 'MONTHLY_PLAN_ALREADY_ACTIVE',
      message: 'A monthly training plan is already active.',
      statusCode: 409,
    },
    ok: false,
  };
}

function toRequestActivePlanConflict(): RequestMonthlyTrainingPlanGenerationResult {
  return {
    error: {
      code: 'MONTHLY_PLAN_ALREADY_ACTIVE',
      message: 'A monthly training plan is already active.',
      statusCode: 409,
    },
    ok: false,
  };
}

async function getFreshActiveGenerationState(
  userId: string,
  now: Date,
  repository: MonthlyTrainingPlanRepository,
): Promise<ActiveGenerationState> {
  return repository.findActiveGenerationStateByUserId(userId, now.toISOString());
}

async function releaseReservationSafely(
  repository: MonthlyTrainingPlanRepository,
  reservationId: string,
  releasedAt: string,
): Promise<void> {
  try {
    await repository.releaseActiveGeneration(reservationId, releasedAt);
  } catch {
    // The database lease is the final recovery path when transport cleanup fails.
  }
}

function getGenerationJobLeaseMs(
  dependencies: MonthlyTrainingPlanServiceDependencies,
): number {
  return dependencies.generationJobLeaseMs &&
    Number.isFinite(dependencies.generationJobLeaseMs) &&
    dependencies.generationJobLeaseMs > 0
    ? dependencies.generationJobLeaseMs
    : defaultGenerationJobLeaseMs;
}

export async function getActiveMonthlyTrainingPlan(
  user: AuthenticatedUser,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<MonthlyTrainingPlanState> {
  const now = dependencies.now?.() ?? new Date();
  const generationState = await getFreshActiveGenerationState(
    user.id,
    now,
    dependencies.monthlyTrainingPlanRepository,
  );
  const athleticProfile = await dependencies.athleticProfileRepository.findByUserId(user.id);
  const pendingGeneration = generationState.activePlan
    ? null
    : await dependencies.monthlyTrainingPlanGenerationJobRepository
        .findPendingGenerationByUserId(user.id, now.toISOString());

  return {
    activePlan: generationState.activePlan,
    athleticProfile,
    canGenerate:
      !generationState.activePlan &&
      !generationState.hasPendingGeneration &&
      !pendingGeneration,
    nextGenerationAvailableAt:
      generationState.activePlan?.availableForRegenerationAt ?? null,
    pendingGeneration,
  };
}

function toFailureFromGeneration(
  result: Extract<GenerateTrainingPlanResult, { error: string }>,
): CreateMonthlyTrainingPlanResult {
  return {
    error: {
      code: 'TRAINING_PLAN_GENERATION_FAILED',
      details: result.attempts.map((attempt) => ({ ...attempt })),
      message: result.error,
      statusCode: 503,
    },
    ok: false,
  };
}

function toProcessFailureFromGeneration(
  generation: MonthlyTrainingPlanGeneration,
  result: Extract<GenerateTrainingPlanResult, { error: string }>,
): ProcessMonthlyTrainingPlanGenerationJobResult {
  return {
    error: {
      code: 'TRAINING_PLAN_GENERATION_FAILED',
      details: result.attempts.map((attempt) => ({ ...attempt })),
      message: result.error,
      statusCode: 503,
    },
    generation,
    ok: false,
  };
}

function hasRemainingGenerationAttempts(
  generation: MonthlyTrainingPlanGeneration,
): boolean {
  return generation.attemptCount < generation.maxAttempts;
}

function isTimeoutAttempt(errorMessage: string | null): boolean {
  return Boolean(errorMessage && /timeout|timed out/i.test(errorMessage));
}

async function recordGenerationAttemptLogsSafely(
  generation: MonthlyTrainingPlanGeneration,
  attempts: ModelAttempt[],
  recordedAt: string,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<void> {
  try {
    await Promise.all(
      attempts.map((attempt, index) =>
        dependencies.monthlyTrainingPlanGenerationJobRepository
          .recordGenerationAttemptLog({
            attemptNumber: generation.attemptCount,
            durationMs: attempt.durationMs,
            errorMessage: attempt.error ?? null,
            generationId: generation.id,
            isTimeout: isTimeoutAttempt(attempt.error ?? null),
            model: attempt.model,
            provider: attempt.provider,
            providerAttemptNumber: index + 1,
            recordedAt,
            role: attempt.role,
            status: attempt.status,
          }),
      ),
    );
  } catch {
    // Observability must not block the user's workout preparation.
  }
}

type PreparedMonthlyTrainingPlanRequest =
  | {
      athleticProfile: AthleticProfileInput;
      now: Date;
      ok: true;
      snapshot: DadosUsuario;
    }
  | { error: CreateMonthlyTrainingPlanError; ok: false };

async function prepareMonthlyTrainingPlanRequest(
  user: AuthenticatedUser,
  payload: unknown,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<PreparedMonthlyTrainingPlanRequest> {
  const parsedPayload = CreateMonthlyTrainingPlanRequestSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        details: parsedPayload.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join('.'),
        })),
        message: 'Invalid monthly training plan request.',
        statusCode: 400,
      },
      ok: false,
    };
  }

  const now = dependencies.now?.() ?? new Date();
  const userProfile = await dependencies.userProfileRepository.findByUserId(user.id);

  if (!userProfile) {
    return {
      error: {
        code: 'PROFILE_REQUIRED',
        message: 'Complete the registration profile before generating a training plan.',
        statusCode: 400,
      },
      ok: false,
    };
  }

  const idade = calculateAgeFromBirthDate(userProfile.birthDate, now);

  if (idade === null) {
    return {
      error: {
        code: 'PROFILE_BIRTH_DATE_INVALID',
        message: 'Registration profile birth date is invalid.',
        statusCode: 400,
      },
      ok: false,
    };
  }

  const parsedSnapshot = DadosUsuarioSchema.safeParse({
    ...parsedPayload.data,
    idade,
    userId: user.id,
  });

  if (!parsedSnapshot.success) {
    return {
      error: {
        code: 'PROFILE_BIRTH_DATE_INVALID',
        message: 'Registration profile birth date is invalid.',
        statusCode: 400,
      },
      ok: false,
    };
  }

  const snapshot = parsedSnapshot.data;

  return {
    athleticProfile: {
      alturaCm: snapshot.alturaCm,
      equipamentosDisponiveis: snapshot.equipamentos,
      lesoesRecorrentes: snapshot.lesoes,
      localTreinoComum: snapshot.localTreino,
      modalidadePreferida: snapshot.modalidade,
      nivelExperiencia: snapshot.nivelExperiencia,
      pesoKg: snapshot.pesoKg,
    },
    now,
    ok: true,
    snapshot,
  };
}

function toMonthlyPlanInput(
  generatedPlan: Extract<GenerateTrainingPlanResult, { result: unknown }>,
  snapshot: DadosUsuario,
  userId: string,
  now: Date,
) {
  return {
    availableForRegenerationAt: addDays(now, 30).toISOString(),
    generatedAt: now.toISOString(),
    metadata: {
      attempts: generatedPlan.attempts,
      durationMs: generatedPlan.durationMs,
      fallbackUsed: generatedPlan.fallbackUsed,
      model: generatedPlan.model,
      provider: generatedPlan.provider,
    },
    result: generatedPlan.result,
    snapshot,
    status: MonthlyTrainingPlanStatus.Active,
    userId,
  };
}

async function failGenerationJobAndReleaseReservation(
  generation: MonthlyTrainingPlanGeneration,
  errorMessage: string,
  failedAt: string,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<MonthlyTrainingPlanGeneration> {
  const failedGeneration = await dependencies
    .monthlyTrainingPlanGenerationJobRepository.failGenerationJob(generation.id, {
      errorMessage,
      failedAt,
    });

  await releaseReservationSafely(
    dependencies.monthlyTrainingPlanRepository,
    generation.reservationId,
    failedAt,
  );

  return failedGeneration ?? generation;
}

async function retryGenerationJob(
  generation: MonthlyTrainingPlanGeneration,
  errorMessage: string,
  retryAt: string,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<MonthlyTrainingPlanGeneration> {
  const retryableGeneration = await dependencies
    .monthlyTrainingPlanGenerationJobRepository.retryGenerationJob(generation.id, {
      errorMessage,
      retryAt,
    });

  return retryableGeneration ?? generation;
}

export async function requestMonthlyTrainingPlanGeneration(
  user: AuthenticatedUser,
  payload: unknown,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<RequestMonthlyTrainingPlanGenerationResult> {
  const preparedRequest = await prepareMonthlyTrainingPlanRequest(
    user,
    payload,
    dependencies,
  );

  if (!preparedRequest.ok) {
    return preparedRequest;
  }

  const generationState = await getFreshActiveGenerationState(
    user.id,
    preparedRequest.now,
    dependencies.monthlyTrainingPlanRepository,
  );
  const pendingGeneration = await dependencies
    .monthlyTrainingPlanGenerationJobRepository.findPendingGenerationByUserId(
      user.id,
      preparedRequest.now.toISOString(),
    );

  if (generationState.activePlan || generationState.hasPendingGeneration || pendingGeneration) {
    return toRequestActivePlanConflict();
  }

  const reservation = await dependencies.monthlyTrainingPlanRepository
    .reserveActiveGeneration(user.id, preparedRequest.now.toISOString());

  if (!reservation.ok) {
    return toRequestActivePlanConflict();
  }

  try {
    const generation = await dependencies
      .monthlyTrainingPlanGenerationJobRepository.enqueueGenerationJob({
        athleticProfile: preparedRequest.athleticProfile,
        createdAt: preparedRequest.now.toISOString(),
        reservationId: reservation.reservationId,
        snapshot: preparedRequest.snapshot,
        userId: user.id,
      });

    return { generation, ok: true };
  } catch (error) {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      preparedRequest.now.toISOString(),
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        statusCode: 503,
      },
      ok: false,
    };
  }
}

export async function processNextMonthlyTrainingPlanGenerationJob(
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<ProcessMonthlyTrainingPlanGenerationJobResult> {
  const claimedAt = dependencies.now?.() ?? new Date();
  const generation = await dependencies
    .monthlyTrainingPlanGenerationJobRepository.claimNextGenerationJob({
      claimedAt: claimedAt.toISOString(),
      leaseExpiresAt: new Date(
        claimedAt.getTime() + getGenerationJobLeaseMs(dependencies),
      ).toISOString(),
    });

  if (!generation) {
    return {
      error: {
        code: 'MONTHLY_GENERATION_JOB_NOT_AVAILABLE',
        message: 'No monthly training generation job is available.',
        statusCode: 404,
      },
      ok: false,
    };
  }

  let generatedPlan: GenerateTrainingPlanResult;

  try {
    generatedPlan = await dependencies.trainingPlanGenerator(generation.snapshot);
  } catch (error) {
    const failedAt = dependencies.now?.() ?? new Date();
    const failedGeneration = await failGenerationJobAndReleaseReservation(
      generation,
      error instanceof Error ? error.message : String(error),
      failedAt.toISOString(),
      dependencies,
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        statusCode: 503,
      },
      generation: failedGeneration,
      ok: false,
    };
  }

  await recordGenerationAttemptLogsSafely(
    generation,
    generatedPlan.attempts,
    (dependencies.now?.() ?? new Date()).toISOString(),
    dependencies,
  );

  if (!('result' in generatedPlan)) {
    const failedAt = dependencies.now?.() ?? new Date();
    if (hasRemainingGenerationAttempts(generation)) {
      const retryableGeneration = await retryGenerationJob(
        generation,
        generatedPlan.error,
        failedAt.toISOString(),
        dependencies,
      );

      return toProcessFailureFromGeneration(retryableGeneration, generatedPlan);
    }

    const failedGeneration = await failGenerationJobAndReleaseReservation(
      generation,
      generatedPlan.error,
      failedAt.toISOString(),
      dependencies,
    );

    return toProcessFailureFromGeneration(failedGeneration, generatedPlan);
  }

  let completion;
  const completedAt = dependencies.now?.() ?? new Date();

  try {
    completion = await dependencies.monthlyTrainingPlanRepository.completeActiveGeneration(
      generation.reservationId,
      toMonthlyPlanInput(generatedPlan, generation.snapshot, generation.userId, completedAt),
      generation.athleticProfile,
    );
  } catch {
    const failedAt = dependencies.now?.() ?? new Date();
    const failedGeneration = await failGenerationJobAndReleaseReservation(
      generation,
      'Monthly training plan could not be persisted.',
      failedAt.toISOString(),
      dependencies,
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: 'Monthly training plan could not be persisted.',
        statusCode: 503,
      },
      generation: failedGeneration,
      ok: false,
    };
  }

  if (!completion.ok) {
    const failedAt = dependencies.now?.() ?? new Date();
    const failedGeneration = await failGenerationJobAndReleaseReservation(
      generation,
      'Monthly training plan could not be persisted.',
      failedAt.toISOString(),
      dependencies,
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: 'Monthly training plan could not be persisted.',
        statusCode: 503,
      },
      generation: failedGeneration,
      ok: false,
    };
  }

  const completedGeneration = await dependencies
    .monthlyTrainingPlanGenerationJobRepository.completeGenerationJob(generation.id, {
      completedAt: completedAt.toISOString(),
      planId: completion.plan.id,
    });

  return {
    generation: completedGeneration ?? generation,
    ok: true,
    plan: completion.plan,
  };
}

export async function processAvailableMonthlyTrainingPlanGenerationJobs(
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<ProcessMonthlyTrainingPlanGenerationJobResult[]> {
  const results: ProcessMonthlyTrainingPlanGenerationJobResult[] = [];

  for (;;) {
    const result = await processNextMonthlyTrainingPlanGenerationJob(dependencies);

    if (!result.ok && result.error.code === 'MONTHLY_GENERATION_JOB_NOT_AVAILABLE') {
      return results;
    }

    results.push(result);
  }
}

export async function createMonthlyTrainingPlan(
  user: AuthenticatedUser,
  payload: unknown,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<CreateMonthlyTrainingPlanResult> {
  const preparedRequest = await prepareMonthlyTrainingPlanRequest(
    user,
    payload,
    dependencies,
  );

  if (!preparedRequest.ok) {
    return preparedRequest;
  }

  const generationState = await getFreshActiveGenerationState(
    user.id,
    preparedRequest.now,
    dependencies.monthlyTrainingPlanRepository,
  );
  const pendingGeneration = await dependencies
    .monthlyTrainingPlanGenerationJobRepository.findPendingGenerationByUserId(
      user.id,
      preparedRequest.now.toISOString(),
    );

  if (generationState.activePlan || generationState.hasPendingGeneration || pendingGeneration) {
    return toActivePlanConflict();
  }

  const reservation = await dependencies.monthlyTrainingPlanRepository
    .reserveActiveGeneration(user.id, preparedRequest.now.toISOString());

  if (!reservation.ok) {
    return toActivePlanConflict();
  }

  let generatedPlan: GenerateTrainingPlanResult;

  try {
    generatedPlan = await dependencies.trainingPlanGenerator(preparedRequest.snapshot);
  } catch (error) {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      preparedRequest.now.toISOString(),
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        statusCode: 503,
      },
      ok: false,
    };
  }

  if (!('result' in generatedPlan)) {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      preparedRequest.now.toISOString(),
    );

    return toFailureFromGeneration(generatedPlan);
  }

  let completion;

  try {
    completion = await dependencies.monthlyTrainingPlanRepository.completeActiveGeneration(
      reservation.reservationId,
      toMonthlyPlanInput(
        generatedPlan,
        preparedRequest.snapshot,
        user.id,
        preparedRequest.now,
      ),
      preparedRequest.athleticProfile,
    );
  } catch {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      preparedRequest.now.toISOString(),
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: 'Monthly training plan could not be persisted.',
        statusCode: 503,
      },
      ok: false,
    };
  }

  if (!completion.ok) {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      preparedRequest.now.toISOString(),
    );

    return {
      error: {
        code: 'TRAINING_PLAN_GENERATION_FAILED',
        message: 'Monthly training plan could not be persisted.',
        statusCode: 503,
      },
      ok: false,
    };
  }

  return { ok: true, plan: completion.plan };
}
