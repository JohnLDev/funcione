import type {
  AthleticProfileInput,
  MonthlyTrainingPlan,
} from '../domain/monthly-plan.js';

export type MonthlyTrainingPlanInput = Omit<
  MonthlyTrainingPlan,
  'createdAt' | 'id' | 'updatedAt'
>;

export type ReserveActiveGenerationResult =
  | { ok: true; reservationId: string }
  | { ok: false; reason: 'ACTIVE_PLAN_CONFLICT' };

export type CompleteActiveGenerationResult =
  | { ok: true; plan: MonthlyTrainingPlan }
  | { ok: false; reason: 'RESERVATION_NOT_FOUND' };

export type ActiveGenerationState = {
  activePlan: MonthlyTrainingPlan | null;
  hasPendingGeneration: boolean;
};

export type MonthlyTrainingPlanRepository = {
  completeActiveGeneration: (
    reservationId: string,
    plan: MonthlyTrainingPlanInput,
    athleticProfile: AthleticProfileInput,
  ) => Promise<CompleteActiveGenerationResult>;
  expireActiveByUserId: (userId: string, expiredAt: string) => Promise<void>;
  findActiveGenerationStateByUserId: (
    userId: string,
  ) => Promise<ActiveGenerationState>;
  releaseActiveGeneration: (
    reservationId: string,
    releasedAt: string,
  ) => Promise<void>;
  reserveActiveGeneration: (
    userId: string,
    reservedAt: string,
  ) => Promise<ReserveActiveGenerationResult>;
};
