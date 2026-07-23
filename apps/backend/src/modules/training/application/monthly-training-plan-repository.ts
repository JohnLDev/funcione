import type { MonthlyTrainingPlan } from '../domain/monthly-plan.js';

export type SaveActiveMonthlyTrainingPlanResult =
  | { ok: true; plan: MonthlyTrainingPlan }
  | { ok: false; reason: 'ACTIVE_PLAN_CONFLICT' };

export type MonthlyTrainingPlanRepository = {
  expireActiveByUserId: (userId: string, expiredAt: string) => Promise<void>;
  findActiveByUserId: (userId: string) => Promise<MonthlyTrainingPlan | null>;
  saveActive: (
    plan: Omit<MonthlyTrainingPlan, 'createdAt' | 'id' | 'updatedAt'>,
  ) => Promise<SaveActiveMonthlyTrainingPlanResult>;
};
