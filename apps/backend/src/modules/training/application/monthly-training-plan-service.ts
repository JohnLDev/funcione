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
  type DadosUsuario,
} from '../domain/schemas.js';
import type { AthleticProfileRepository } from './athletic-profile-repository.js';
import type {
  GenerateTrainingPlanResult,
  TrainingPlanGenerator,
} from './generate-training-plan.js';
import type { MonthlyTrainingPlanRepository } from './monthly-training-plan-repository.js';

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

function hasPlanExpired(plan: MonthlyTrainingPlan, now: Date): boolean {
  return new Date(plan.availableForRegenerationAt).getTime() <= now.getTime();
}

async function getFreshActivePlan(
  userId: string,
  now: Date,
  repository: MonthlyTrainingPlanRepository,
): Promise<MonthlyTrainingPlan | null> {
  const activePlan = await repository.findActiveByUserId(userId);

  if (!activePlan) {
    return null;
  }

  if (!hasPlanExpired(activePlan, now)) {
    return activePlan;
  }

  await repository.expireActiveByUserId(userId, now.toISOString());

  return null;
}

export async function getActiveMonthlyTrainingPlan(
  user: AuthenticatedUser,
  dependencies: MonthlyTrainingPlanServiceDependencies,
): Promise<MonthlyTrainingPlanState> {
  const now = dependencies.now?.() ?? new Date();
  const activePlan = await getFreshActivePlan(
    user.id,
    now,
    dependencies.monthlyTrainingPlanRepository,
  );
  const athleticProfile = await dependencies.athleticProfileRepository.findByUserId(user.id);

  return {
    activePlan,
    athleticProfile,
    canGenerate: !activePlan,
    nextGenerationAvailableAt: activePlan?.availableForRegenerationAt ?? null,
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
  const activePlan = await getFreshActivePlan(
    user.id,
    now,
    dependencies.monthlyTrainingPlanRepository,
  );

  if (activePlan) {
    return {
      error: {
        code: 'MONTHLY_PLAN_ALREADY_ACTIVE',
        message: 'A monthly training plan is already active.',
        statusCode: 409,
      },
      ok: false,
    };
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

  const snapshot: DadosUsuario = {
    ...parsedPayload.data,
    idade,
    userId: user.id,
  };

  const generatedPlan = await dependencies.trainingPlanGenerator(snapshot);

  if (!('result' in generatedPlan)) {
    return toFailureFromGeneration(generatedPlan);
  }

  await dependencies.athleticProfileRepository.upsert(user.id, {
    alturaCm: snapshot.alturaCm,
    equipamentosDisponiveis: snapshot.equipamentos,
    lesoesRecorrentes: snapshot.lesoes,
    localTreinoComum: snapshot.localTreino,
    modalidadePreferida: snapshot.modalidade,
    nivelExperiencia: snapshot.nivelExperiencia,
    pesoKg: snapshot.pesoKg,
  });

  const plan = await dependencies.monthlyTrainingPlanRepository.saveActive({
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
  });

  return { ok: true, plan };
}
