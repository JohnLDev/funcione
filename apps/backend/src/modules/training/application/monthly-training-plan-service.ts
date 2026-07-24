import type { AuthenticatedUser, UserProfileRepository } from '../../auth/index.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import {
  addDays,
  calculateAgeFromBirthDate,
  type MonthlyTrainingPlan,
  type MonthlyTrainingPlanState,
} from '../domain/monthly-plan.js';
import {
  CreateMonthlyTrainingPlanRequestSchema,
  DadosUsuarioSchema,
} from '../domain/schemas.js';
import type { AthleticProfileRepository } from './athletic-profile-repository.js';
import type {
  GenerateTrainingPlanResult,
  TrainingPlanGenerator,
} from './generate-training-plan.js';
import type {
  ActiveGenerationState,
  MonthlyTrainingPlanRepository,
} from './monthly-training-plan-repository.js';

export type MonthlyTrainingPlanServiceDependencies = {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
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

  return {
    activePlan: generationState.activePlan,
    athleticProfile,
    canGenerate:
      !generationState.activePlan && !generationState.hasPendingGeneration,
    nextGenerationAvailableAt:
      generationState.activePlan?.availableForRegenerationAt ?? null,
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

export async function createMonthlyTrainingPlan(
  user: AuthenticatedUser,
  payload: unknown,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<CreateMonthlyTrainingPlanResult> {
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
  const generationState = await getFreshActiveGenerationState(
    user.id,
    now,
    dependencies.monthlyTrainingPlanRepository,
  );

  if (generationState.activePlan || generationState.hasPendingGeneration) {
    return toActivePlanConflict();
  }

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

  const reservation = await dependencies.monthlyTrainingPlanRepository
    .reserveActiveGeneration(user.id, now.toISOString());

  if (!reservation.ok) {
    return toActivePlanConflict();
  }

  let generatedPlan: GenerateTrainingPlanResult;

  try {
    generatedPlan = await dependencies.trainingPlanGenerator(snapshot);
  } catch (error) {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      now.toISOString(),
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
      now.toISOString(),
    );

    return toFailureFromGeneration(generatedPlan);
  }

  let completion;

  try {
    completion = await dependencies.monthlyTrainingPlanRepository.completeActiveGeneration(
      reservation.reservationId,
      {
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
        userId: user.id,
      },
      {
        alturaCm: snapshot.alturaCm,
        equipamentosDisponiveis: snapshot.equipamentos,
        lesoesRecorrentes: snapshot.lesoes,
        localTreinoComum: snapshot.localTreino,
        modalidadePreferida: snapshot.modalidade,
        nivelExperiencia: snapshot.nivelExperiencia,
        pesoKg: snapshot.pesoKg,
      },
    );
  } catch {
    await releaseReservationSafely(
      dependencies.monthlyTrainingPlanRepository,
      reservation.reservationId,
      now.toISOString(),
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
      now.toISOString(),
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
