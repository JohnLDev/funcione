import { randomUUID } from 'node:crypto';
import type { AthleticProfileRepository } from '../application/athletic-profile-repository.js';
import type { MonthlyTrainingPlanRepository } from '../application/monthly-training-plan-repository.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import type {
  AthleticProfile,
  AthleticProfileInput,
  MonthlyTrainingPlan,
} from '../domain/monthly-plan.js';

export function createInMemoryTrainingRepositories(): {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
} {
  const athleticProfiles = new Map<string, AthleticProfile>();
  const monthlyPlans = new Map<string, MonthlyTrainingPlan>();

  return {
    athleticProfileRepository: {
      findByUserId: async (userId) => athleticProfiles.get(userId) ?? null,
      upsert: async (userId, input: AthleticProfileInput) => {
        const existingProfile = athleticProfiles.get(userId);
        const now = new Date().toISOString();
        const profile: AthleticProfile = {
          ...input,
          createdAt: existingProfile?.createdAt ?? now,
          updatedAt: now,
          userId,
        };

        athleticProfiles.set(userId, profile);

        return profile;
      },
    },
    monthlyTrainingPlanRepository: {
      expireActiveByUserId: async (userId, expiredAt) => {
        for (const [id, plan] of monthlyPlans.entries()) {
          if (plan.userId === userId && plan.status === MonthlyTrainingPlanStatus.Active) {
            monthlyPlans.set(id, {
              ...plan,
              status: MonthlyTrainingPlanStatus.Expired,
              updatedAt: expiredAt,
            });
          }
        }
      },
      findActiveByUserId: async (userId) =>
        Array.from(monthlyPlans.values()).find(
          (plan) =>
            plan.userId === userId &&
            plan.status === MonthlyTrainingPlanStatus.Active,
        ) ?? null,
      saveActive: async (planInput) => {
        const now = new Date().toISOString();
        const plan: MonthlyTrainingPlan = {
          ...planInput,
          createdAt: now,
          id: randomUUID(),
          updatedAt: now,
        };

        monthlyPlans.set(plan.id, plan);

        return plan;
      },
    },
  };
}
