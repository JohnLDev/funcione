import type { SupabaseClient } from '@supabase/supabase-js';
import type { AthleticProfileRepository } from '../application/athletic-profile-repository.js';
import type { MonthlyTrainingPlanRepository } from '../application/monthly-training-plan-repository.js';
import type { TrainingRepositories } from '../application/training-repository-factory.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import type {
  AthleticProfile,
  AthleticProfileInput,
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
  createUserScopedSupabaseClient,
  type UserScopedSupabaseClientConfig,
} from './supabase-user-scoped-client.js';

export type SupabaseTrainingRepositoriesConfig = UserScopedSupabaseClientConfig;

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

type ActiveGenerationStateRow = {
  active_plan: MonthlyPlanRow | null;
  has_pending_generation: boolean;
};

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
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
): Omit<AthleticProfileRow, 'created_at' | 'updated_at' | 'user_id'> {
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
): MonthlyTrainingPlanRepository {
  return {
    completeActiveGeneration: async (
      reservationId,
      plan,
      athleticProfile,
    ) => {
      const { data, error } = await client.rpc(
        'complete_training_monthly_plan_generation',
        {
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
        },
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
    expireActiveByUserId: async (userId, expiredAt) => {
      const { error } = await client
        .from('training_monthly_plans')
        .update({
          status: MonthlyTrainingPlanStatus.Expired,
          updated_at: expiredAt,
        })
        .eq('user_id', userId)
        .eq('status', MonthlyTrainingPlanStatus.Active);

      throwIfError(error);
    },
    findActiveGenerationStateByUserId: async (userId) => {
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
      const { error } = await client
        .from('training_monthly_plan_generation_reservations')
        .update({ released_at: releasedAt })
        .eq('id', reservationId)
        .is('completed_at', null)
        .is('released_at', null);

      throwIfError(error);
    },
    reserveActiveGeneration: async (userId, reservedAt) => {
      const { data, error } = await client.rpc(
        'reserve_training_monthly_plan_generation',
        {
          p_reserved_at: reservedAt,
          p_user_id: userId,
        },
      );

      throwIfError(error);

      return data
        ? { ok: true, reservationId: data as string }
        : { ok: false, reason: 'ACTIVE_PLAN_CONFLICT' };
    },
  };
}

export function createSupabaseTrainingRepositories(
  config: SupabaseTrainingRepositoriesConfig,
): TrainingRepositories {
  const client = createUserScopedSupabaseClient(config);

  return {
    athleticProfileRepository: createAthleticProfileRepository(client),
    monthlyTrainingPlanRepository: createMonthlyTrainingPlanRepository(client),
  };
}
