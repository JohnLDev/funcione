import { randomUUID } from 'node:crypto';
import type { AthleticProfileRepository } from '../application/athletic-profile-repository.js';
import type { MonthlyTrainingPlanRepository } from '../application/monthly-training-plan-repository.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import type {
  AthleticProfile,
  AthleticProfileInput,
  MonthlyTrainingPlan,
} from '../domain/monthly-plan.js';

const generationReservationLeaseMs = 15 * 60 * 1_000;

export function createInMemoryTrainingRepositories(): {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
} {
  const athleticProfiles = new Map<string, AthleticProfile>();
  const monthlyPlans = new Map<string, MonthlyTrainingPlan>();
  const reservations = new Map<
    string,
    { leaseExpiresAt: string; reservedAt: string; userId: string }
  >();

  function reconcileGenerationState(userId: string, observedAt: string) {
    const observedAtMs = new Date(observedAt).getTime();

    for (const [id, plan] of monthlyPlans.entries()) {
      if (
        plan.userId === userId &&
        plan.status === MonthlyTrainingPlanStatus.Active &&
        new Date(plan.availableForRegenerationAt).getTime() <= observedAtMs
      ) {
        monthlyPlans.set(id, {
          ...plan,
          status: MonthlyTrainingPlanStatus.Expired,
          updatedAt: observedAt,
        });
      }
    }

    for (const [id, reservation] of reservations.entries()) {
      if (
        reservation.userId === userId &&
        new Date(reservation.leaseExpiresAt).getTime() <= observedAtMs
      ) {
        reservations.delete(id);
      }
    }
  }

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
      completeActiveGeneration: async (reservationId, planInput, profileInput) => {
        const reservation = reservations.get(reservationId);

        if (!reservation || reservation.userId !== planInput.userId) {
          return { ok: false, reason: 'RESERVATION_NOT_FOUND' };
        }

        const now = new Date().toISOString();
        const existingProfile = athleticProfiles.get(reservation.userId);
        const profile: AthleticProfile = {
          ...profileInput,
          createdAt: existingProfile?.createdAt ?? now,
          updatedAt: now,
          userId: reservation.userId,
        };
        const plan: MonthlyTrainingPlan = {
          ...planInput,
          createdAt: now,
          id: randomUUID(),
          updatedAt: now,
        };

        monthlyPlans.set(plan.id, plan);
        athleticProfiles.set(reservation.userId, profile);
        reservations.delete(reservationId);

        return { ok: true, plan };
      },
      findActiveGenerationStateByUserId: async (userId, observedAt) => {
        reconcileGenerationState(userId, observedAt);

        return {
          activePlan: Array.from(monthlyPlans.values()).find(
            (plan) =>
              plan.userId === userId &&
              plan.status === MonthlyTrainingPlanStatus.Active,
          ) ?? null,
          hasPendingGeneration: Array.from(reservations.values()).some(
            (reservation) => reservation.userId === userId,
          ),
        };
      },
      releaseActiveGeneration: async (reservationId) => {
        reservations.delete(reservationId);
      },
      reserveActiveGeneration: async (userId, reservedAt) => {
        reconcileGenerationState(userId, reservedAt);

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

        reservations.set(reservationId, {
          leaseExpiresAt: new Date(
            new Date(reservedAt).getTime() + generationReservationLeaseMs,
          ).toISOString(),
          reservedAt,
          userId,
        });

        return { ok: true, reservationId };
      },
    },
  };
}
