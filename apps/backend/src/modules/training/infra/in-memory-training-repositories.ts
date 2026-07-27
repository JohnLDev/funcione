import { randomUUID } from 'node:crypto';
import type { AthleticProfileRepository } from '../application/athletic-profile-repository.js';
import type { MonthlyTrainingPlanGenerationJobRepository } from '../application/monthly-training-plan-generation-job-repository.js';
import type { MonthlyTrainingPlanRepository } from '../application/monthly-training-plan-repository.js';
import { MonthlyTrainingPlanStatus } from '../domain/enums.js';
import type {
  AthleticProfile,
  AthleticProfileInput,
  MonthlyTrainingPlanGeneration,
  MonthlyTrainingPlan,
} from '../domain/monthly-plan.js';

const generationReservationLeaseMs = 15 * 60 * 1_000;

export function createInMemoryTrainingRepositories(): {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanGenerationJobRepository: MonthlyTrainingPlanGenerationJobRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
} {
  const athleticProfiles = new Map<string, AthleticProfile>();
  const generationJobs = new Map<string, MonthlyTrainingPlanGeneration>();
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
    monthlyTrainingPlanGenerationJobRepository: {
      claimNextGenerationJob: async ({ claimedAt, leaseExpiresAt }) => {
        const claimableJob = Array.from(generationJobs.values())
          .filter((job) => {
            if (job.status === 'queued') {
              return true;
            }

            return (
              job.status === 'running' &&
              job.lockExpiresAt !== null &&
              new Date(job.lockExpiresAt).getTime() <= new Date(claimedAt).getTime()
            );
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

        if (!claimableJob) {
          return null;
        }

        const claimedJob: MonthlyTrainingPlanGeneration = {
          ...claimableJob,
          attemptCount: claimableJob.attemptCount + 1,
          lockExpiresAt: leaseExpiresAt,
          lockedAt: claimedAt,
          startedAt: claimableJob.startedAt ?? claimedAt,
          status: 'running',
          updatedAt: claimedAt,
        };

        generationJobs.set(claimedJob.id, claimedJob);

        return claimedJob;
      },
      completeGenerationJob: async (generationId, { completedAt, planId }) => {
        const job = generationJobs.get(generationId);

        if (!job) {
          return null;
        }

        const completedJob: MonthlyTrainingPlanGeneration = {
          ...job,
          completedAt,
          lockExpiresAt: null,
          lockedAt: null,
          planId,
          status: 'completed',
          updatedAt: completedAt,
        };

        generationJobs.set(generationId, completedJob);

        return completedJob;
      },
      enqueueGenerationJob: async (input) => {
        const now = input.createdAt;
        const job: MonthlyTrainingPlanGeneration = {
          attemptCount: 0,
          athleticProfile: input.athleticProfile,
          completedAt: null,
          createdAt: now,
          errorMessage: null,
          failedAt: null,
          id: randomUUID(),
          lockExpiresAt: null,
          lockedAt: null,
          maxAttempts: input.maxAttempts ?? 3,
          planId: null,
          reservationId: input.reservationId,
          snapshot: input.snapshot,
          startedAt: null,
          status: 'queued',
          updatedAt: now,
          userId: input.userId,
        };

        generationJobs.set(job.id, job);

        return job;
      },
      failGenerationJob: async (generationId, { errorMessage, failedAt }) => {
        const job = generationJobs.get(generationId);

        if (!job) {
          return null;
        }

        const failedJob: MonthlyTrainingPlanGeneration = {
          ...job,
          errorMessage,
          failedAt,
          lockExpiresAt: null,
          lockedAt: null,
          status: 'failed',
          updatedAt: failedAt,
        };

        generationJobs.set(generationId, failedJob);

        return failedJob;
      },
      findGenerationJobById: async (userId, generationId) => {
        const job = generationJobs.get(generationId);

        return job?.userId === userId ? job : null;
      },
      findPendingGenerationByUserId: async (userId, observedAt) => {
        const observedAtMs = new Date(observedAt).getTime();

        return Array.from(generationJobs.values())
          .filter(
            (job) =>
              job.userId === userId &&
              (job.status === 'queued' ||
                (job.status === 'running' &&
                  (job.lockExpiresAt === null ||
                    new Date(job.lockExpiresAt).getTime() > observedAtMs))),
          )
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null;
      },
      listByStatus: async (status) =>
        Array.from(generationJobs.values()).filter((job) => job.status === status),
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
