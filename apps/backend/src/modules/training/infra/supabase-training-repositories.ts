import type { SupabaseClient } from '@supabase/supabase-js';
import type { AthleticProfileRepository } from '../application/athletic-profile-repository.js';
import type {
  ClaimMonthlyTrainingPlanGenerationJobInput,
  CompleteMonthlyTrainingPlanGenerationJobInput,
  EnqueueMonthlyTrainingPlanGenerationJobInput,
  FailMonthlyTrainingPlanGenerationJobInput,
  MonthlyTrainingPlanGenerationJobRepository,
} from '../application/monthly-training-plan-generation-job-repository.js';
import type { MonthlyTrainingPlanRepository } from '../application/monthly-training-plan-repository.js';
import type { TrainingRepositories } from '../application/training-repository-factory.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import type {
  AthleticProfile,
  AthleticProfileInput,
  MonthlyTrainingPlanGeneration,
  MonthlyTrainingPlanGenerationStatus,
  MonthlyTrainingPlan,
  MonthlyTrainingPlanMetadata,
} from '../domain/monthly-plan.js';
import type {
  DadosUsuario,
  EquipamentoUsuario,
  LesaoUsuario,
  PlanoTreino,
} from '../domain/schemas.js';
import {
  createServiceSupabaseClient,
  type ServiceSupabaseClientConfig,
} from './supabase-service-client.js';
import {
  createUserScopedSupabaseClient,
  type UserScopedSupabaseClientConfig,
} from './supabase-user-scoped-client.js';

export type SupabaseTrainingRepositoriesConfig = UserScopedSupabaseClientConfig;
export type SupabaseTrainingWorkerRepositoriesConfig = ServiceSupabaseClientConfig;

type AthleticProfileRow = {
  altura_cm: number;
  created_at: string;
  equipamentos_disponiveis: EquipamentoUsuario[];
  lesoes_recorrentes: LesaoUsuario[];
  local_treino_comum: AthleticProfile['localTreinoComum'];
  modalidade_preferida: AthleticProfile['modalidadePreferida'];
  nivel_experiencia: AthleticProfile['nivelExperiencia'];
  peso_kg: number;
  updated_at: string;
  user_id: string;
};

type MonthlyPlanRow = {
  available_for_regeneration_at: string;
  created_at: string;
  generated_at: string;
  id: string;
  metadata: MonthlyTrainingPlanMetadata;
  result: PlanoTreino;
  snapshot: DadosUsuario;
  status: MonthlyTrainingPlanStatus;
  updated_at: string;
  user_id: string;
};

type AthleticProfilePayload = Omit<
  AthleticProfileRow,
  'created_at' | 'updated_at' | 'user_id'
>;

type MonthlyTrainingPlanGenerationJobRow = {
  attempt_count: number;
  athletic_profile: AthleticProfilePayload;
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  failed_at: string | null;
  id: string;
  lock_expires_at: string | null;
  locked_at: string | null;
  max_attempts: number;
  plan_id: string | null;
  reservation_id: string;
  snapshot: DadosUsuario;
  started_at: string | null;
  status: MonthlyTrainingPlanGenerationStatus;
  updated_at: string;
  user_id: string;
};

type ActiveGenerationStateRow = {
  active_plan: MonthlyPlanRow | null;
  has_pending_generation: boolean;
};

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

function toAthleticProfileInput(row: AthleticProfilePayload): AthleticProfileInput {
  return {
    alturaCm: row.altura_cm,
    equipamentosDisponiveis: row.equipamentos_disponiveis,
    lesoesRecorrentes: row.lesoes_recorrentes,
    localTreinoComum: row.local_treino_comum,
    modalidadePreferida: row.modalidade_preferida,
    nivelExperiencia: row.nivel_experiencia,
    pesoKg: row.peso_kg,
  };
}

function toMonthlyTrainingPlanGeneration(
  row: MonthlyTrainingPlanGenerationJobRow,
): MonthlyTrainingPlanGeneration {
  return {
    attemptCount: row.attempt_count,
    athleticProfile: toAthleticProfileInput(row.athletic_profile),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    errorMessage: row.error_message,
    failedAt: row.failed_at,
    id: row.id,
    lockExpiresAt: row.lock_expires_at,
    lockedAt: row.locked_at,
    maxAttempts: row.max_attempts,
    planId: row.plan_id,
    reservationId: row.reservation_id,
    snapshot: row.snapshot,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function isGenerationJobRow(
  row: unknown,
): row is MonthlyTrainingPlanGenerationJobRow {
  return Boolean(
    row &&
      typeof row === 'object' &&
      typeof (row as Partial<MonthlyTrainingPlanGenerationJobRow>).id ===
        'string',
  );
}

function isPendingGenerationJobRow(
  row: MonthlyTrainingPlanGenerationJobRow,
  observedAt: string,
): boolean {
  if (row.status === 'queued') {
    return row.attempt_count < row.max_attempts;
  }

  if (row.status !== 'running') {
    return false;
  }

  const observedAtMs = new Date(observedAt).getTime();
  const lockExpiresAtMs = row.lock_expires_at
    ? new Date(row.lock_expires_at).getTime()
    : null;

  if (lockExpiresAtMs !== null && lockExpiresAtMs > observedAtMs) {
    return true;
  }

  return row.attempt_count < row.max_attempts;
}

function toAthleticProfile(row: AthleticProfileRow): AthleticProfile {
  return {
    alturaCm: row.altura_cm,
    createdAt: row.created_at,
    equipamentosDisponiveis: row.equipamentos_disponiveis,
    lesoesRecorrentes: row.lesoes_recorrentes,
    localTreinoComum: row.local_treino_comum,
    modalidadePreferida: row.modalidade_preferida,
    nivelExperiencia: row.nivel_experiencia,
    pesoKg: row.peso_kg,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function toMonthlyPlan(row: MonthlyPlanRow): MonthlyTrainingPlan {
  return {
    availableForRegenerationAt: row.available_for_regeneration_at,
    createdAt: row.created_at,
    generatedAt: row.generated_at,
    id: row.id,
    metadata: row.metadata,
    result: row.result,
    snapshot: row.snapshot,
    status: row.status,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function toAthleticProfileRow(
  userId: string,
  input: AthleticProfileInput,
): Omit<AthleticProfileRow, 'created_at' | 'updated_at'> {
  return {
    ...toAthleticProfilePayload(input),
    user_id: userId,
  };
}

function toAthleticProfilePayload(
  input: AthleticProfileInput,
): AthleticProfilePayload {
  return {
    altura_cm: input.alturaCm,
    equipamentos_disponiveis: input.equipamentosDisponiveis,
    lesoes_recorrentes: input.lesoesRecorrentes,
    local_treino_comum: input.localTreinoComum,
    modalidade_preferida: input.modalidadePreferida,
    nivel_experiencia: input.nivelExperiencia,
    peso_kg: input.pesoKg,
  };
}

function createAthleticProfileRepository(
  client: SupabaseClient,
): AthleticProfileRepository {
  return {
    findByUserId: async (userId) => {
      const { data, error } = await client
        .from('training_athletic_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<AthleticProfileRow>();

      throwIfError(error);

      return data ? toAthleticProfile(data) : null;
    },
    upsert: async (userId, input) => {
      const { data, error } = await client
        .from('training_athletic_profiles')
        .upsert(
          {
            ...toAthleticProfileRow(userId, input),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single<AthleticProfileRow>();

      throwIfError(error);

      if (!data) {
        throw new Error('Supabase athletic profile upsert returned no row.');
      }

      return toAthleticProfile(data);
    },
  };
}

function createMonthlyTrainingPlanRepository(
  client: SupabaseClient,
  options: {
    completeRpcName?: string;
    releaseRpcName?: string;
    workerMode?: boolean;
  } = {},
): MonthlyTrainingPlanRepository {
  const completeRpcName =
    options.completeRpcName ?? 'complete_training_monthly_plan_generation';
  const releaseRpcName =
    options.releaseRpcName ?? 'release_training_monthly_plan_generation';

  return {
    completeActiveGeneration: async (
      reservationId,
      plan,
      athleticProfile,
    ) => {
      const rpcPayload = options.workerMode
        ? {
            p_athletic_profile: toAthleticProfilePayload(athleticProfile),
            p_completed_at: plan.generatedAt,
            p_plan: {
              available_for_regeneration_at: plan.availableForRegenerationAt,
              generated_at: plan.generatedAt,
              metadata: plan.metadata,
              result: plan.result,
              snapshot: plan.snapshot,
              status: plan.status,
              user_id: plan.userId,
            },
            p_reservation_id: reservationId,
          }
        : {
            p_athletic_profile: toAthleticProfilePayload(athleticProfile),
            p_plan: {
              available_for_regeneration_at: plan.availableForRegenerationAt,
              generated_at: plan.generatedAt,
              metadata: plan.metadata,
              result: plan.result,
              snapshot: plan.snapshot,
              status: plan.status,
              user_id: plan.userId,
            },
            p_reservation_id: reservationId,
          };
      const { data, error } = await client.rpc(
        completeRpcName,
        rpcPayload,
      );

      throwIfError(error);

      if (!data) {
        return { ok: false, reason: 'RESERVATION_NOT_FOUND' };
      }

      return {
        ok: true,
        plan: toMonthlyPlan(data as MonthlyPlanRow),
      };
    },
    findActiveGenerationStateByUserId: async (userId, observedAt) => {
      void observedAt;
      const { data, error } = await client.rpc(
        'get_training_monthly_plan_generation_state',
        { p_user_id: userId },
      );

      throwIfError(error);

      const state = data as ActiveGenerationStateRow;

      return {
        activePlan: state.active_plan
          ? toMonthlyPlan(state.active_plan)
          : null,
        hasPendingGeneration: state.has_pending_generation,
      };
    },
    releaseActiveGeneration: async (reservationId, releasedAt) => {
      const rpcPayload = options.workerMode
        ? { p_released_at: releasedAt, p_reservation_id: reservationId }
        : { p_reservation_id: reservationId };
      const { error } = await client.rpc(
        releaseRpcName,
        rpcPayload,
      );

      throwIfError(error);
    },
    reserveActiveGeneration: async (userId, reservedAt) => {
      const { data, error } = await client.rpc(
        'reserve_training_monthly_plan_generation',
        {
          p_user_id: userId,
        },
      );

      void reservedAt;

      throwIfError(error);

      return data
        ? { ok: true, reservationId: data as string }
        : { ok: false, reason: 'ACTIVE_PLAN_CONFLICT' };
    },
  };
}

function createMonthlyTrainingPlanGenerationJobRepository(
  client: SupabaseClient,
): MonthlyTrainingPlanGenerationJobRepository {
  return {
    claimNextGenerationJob: async (
      input: ClaimMonthlyTrainingPlanGenerationJobInput,
    ) => {
      const { data, error } = await client.rpc(
        'claim_training_monthly_plan_generation_job',
        {
          p_claimed_at: input.claimedAt,
          p_lease_expires_at: input.leaseExpiresAt,
        },
      );

      throwIfError(error);

      return isGenerationJobRow(data)
        ? toMonthlyTrainingPlanGeneration(data)
        : null;
    },
    completeGenerationJob: async (
      generationId: string,
      input: CompleteMonthlyTrainingPlanGenerationJobInput,
    ) => {
      const { data, error } = await client.rpc(
        'complete_training_monthly_plan_generation_job',
        {
          p_completed_at: input.completedAt,
          p_generation_id: generationId,
          p_plan_id: input.planId,
        },
      );

      throwIfError(error);

      return isGenerationJobRow(data)
        ? toMonthlyTrainingPlanGeneration(data)
        : null;
    },
    enqueueGenerationJob: async (
      input: EnqueueMonthlyTrainingPlanGenerationJobInput,
    ) => {
      const { data, error } = await client.rpc(
        'enqueue_training_monthly_plan_generation_job',
        {
          p_athletic_profile: toAthleticProfilePayload(input.athleticProfile),
          p_created_at: input.createdAt,
          p_reservation_id: input.reservationId,
          p_snapshot: input.snapshot,
          p_user_id: input.userId,
        },
      );

      throwIfError(error);

      if (!isGenerationJobRow(data)) {
        throw new Error('Supabase generation job enqueue returned no row.');
      }

      return toMonthlyTrainingPlanGeneration(data);
    },
    failGenerationJob: async (
      generationId: string,
      input: FailMonthlyTrainingPlanGenerationJobInput,
    ) => {
      const { data, error } = await client.rpc(
        'fail_training_monthly_plan_generation_job',
        {
          p_error_message: input.errorMessage,
          p_failed_at: input.failedAt,
          p_generation_id: generationId,
        },
      );

      throwIfError(error);

      return isGenerationJobRow(data)
        ? toMonthlyTrainingPlanGeneration(data)
        : null;
    },
    findGenerationJobById: async (userId, generationId) => {
      const { data, error } = await client
        .from('training_monthly_plan_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('id', generationId)
        .maybeSingle<MonthlyTrainingPlanGenerationJobRow>();

      throwIfError(error);

      return isGenerationJobRow(data) ? toMonthlyTrainingPlanGeneration(data) : null;
    },
    findPendingGenerationByUserId: async (userId, observedAt) => {
      const { data, error } = await client
        .from('training_monthly_plan_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: true })
        .limit(20);

      throwIfError(error);

      const rows = Array.isArray(data)
        ? data.filter(isGenerationJobRow)
        : isGenerationJobRow(data)
          ? [data]
          : [];
      const pendingRow = rows.find((row) =>
        isPendingGenerationJobRow(row, observedAt),
      );

      return pendingRow ? toMonthlyTrainingPlanGeneration(pendingRow) : null;
    },
  };
}

export function createSupabaseTrainingRepositories(
  config: SupabaseTrainingRepositoriesConfig,
): TrainingRepositories {
  const client = createUserScopedSupabaseClient(config);

  return {
    athleticProfileRepository: createAthleticProfileRepository(client),
    monthlyTrainingPlanGenerationJobRepository:
      createMonthlyTrainingPlanGenerationJobRepository(client),
    monthlyTrainingPlanRepository: createMonthlyTrainingPlanRepository(client),
  };
}

export function createSupabaseTrainingWorkerRepositories(
  config: SupabaseTrainingWorkerRepositoriesConfig,
): TrainingRepositories {
  const client = createServiceSupabaseClient(config);

  return {
    athleticProfileRepository: createAthleticProfileRepository(client),
    monthlyTrainingPlanGenerationJobRepository:
      createMonthlyTrainingPlanGenerationJobRepository(client),
    monthlyTrainingPlanRepository: createMonthlyTrainingPlanRepository(client, {
      completeRpcName: 'complete_training_monthly_plan_generation_as_worker',
      releaseRpcName: 'release_training_monthly_plan_generation_as_worker',
      workerMode: true,
    }),
  };
}
