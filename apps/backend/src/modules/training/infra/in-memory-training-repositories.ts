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
  const reservations = new Map<string, { reservedAt: string; userId: string }>();

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
      completeActiveGeneration: async (reservationId, planInput) => {
        const reservation = reservations.get(reservationId);

        if (!reservation || reservation.userId !== planInput.userId) {
          return { ok: false, reason: 'RESERVATION_NOT_FOUND' };
        }

        const now = new Date().toISOString();
        const plan: MonthlyTrainingPlan = {
          ...planInput,
          createdAt: now,
          id: randomUUID(),
          updatedAt: now,
        };

        monthlyPlans.set(plan.id, plan);
        reservations.delete(reservationId);

        return { ok: true, plan };
      },
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
      hasPendingGenerationByUserId: async (userId) =>
        Array.from(reservations.values()).some(
          (reservation) => reservation.userId === userId,
        ),
      releaseActiveGeneration: async (reservationId) => {
        reservations.delete(reservationId);
      },
      reserveActiveGeneration: async (userId, reservedAt) => {
        const hasActivePlan = Array.from(monthlyPlans.values()).some(
          (plan) =>
            plan.userId === userId &&
            plan.status === MonthlyTrainingPlanStatus.Active,
        );
        const hasPendingGeneration = Array.from(reservations.values()).some(
          (reservation) => reservation.userId === userId,
        );

        if (hasActivePlan || hasPendingGeneration) {
          return { ok: false, reason: 'ACTIVE_PLAN_CONFLICT' };
        }

        const reservationId = randomUUID();

        reservations.set(reservationId, { reservedAt, userId });

        return { ok: true, reservationId };
      },
    },
  };
}
