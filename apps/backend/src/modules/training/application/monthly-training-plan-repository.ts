import type { MonthlyTrainingPlan } from '../domain/monthly-plan.js';

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

export type MonthlyTrainingPlanRepository = {
  completeActiveGeneration: (
    reservationId: string,
    plan: MonthlyTrainingPlanInput,
  ) => Promise<CompleteActiveGenerationResult>;
  expireActiveByUserId: (userId: string, expiredAt: string) => Promise<void>;
  findActiveByUserId: (userId: string) => Promise<MonthlyTrainingPlan | null>;
  hasPendingGenerationByUserId: (userId: string) => Promise<boolean>;
  releaseActiveGeneration: (
    reservationId: string,
    releasedAt: string,
  ) => Promise<void>;
  reserveActiveGeneration: (
    userId: string,
    reservedAt: string,
  ) => Promise<ReserveActiveGenerationResult>;
};
