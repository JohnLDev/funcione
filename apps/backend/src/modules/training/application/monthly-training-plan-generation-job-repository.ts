import type {
  AthleticProfileInput,
  MonthlyTrainingPlanGeneration,
  MonthlyTrainingPlanGenerationStatus,
} from '../domain/monthly-plan.js';
import type { DadosUsuario } from '../domain/schemas.js';

export type EnqueueMonthlyTrainingPlanGenerationJobInput = {
  athleticProfile: AthleticProfileInput;
  createdAt: string;
  maxAttempts?: number;
  reservationId: string;
  snapshot: DadosUsuario;
  userId: string;
};

export type ClaimMonthlyTrainingPlanGenerationJobInput = {
  claimedAt: string;
  leaseExpiresAt: string;
};

export type CompleteMonthlyTrainingPlanGenerationJobInput = {
  completedAt: string;
  planId: string;
};

export type FailMonthlyTrainingPlanGenerationJobInput = {
  errorMessage: string;
  failedAt: string;
};

export type RetryMonthlyTrainingPlanGenerationJobInput = {
  errorMessage: string;
  retryAt: string;
};

export type RecordMonthlyTrainingPlanGenerationAttemptLogInput = {
  attemptNumber: number;
  durationMs: number;
  errorMessage: string | null;
  generationId: string;
  isTimeout: boolean;
  model: string;
  provider: string;
  providerAttemptNumber: number;
  recordedAt: string;
  role: 'primary' | 'fallback';
  status: 'success' | 'error';
};

export type MonthlyTrainingPlanGenerationJobRepository = {
  claimNextGenerationJob: (
    input: ClaimMonthlyTrainingPlanGenerationJobInput,
  ) => Promise<MonthlyTrainingPlanGeneration | null>;
  completeGenerationJob: (
    generationId: string,
    input: CompleteMonthlyTrainingPlanGenerationJobInput,
  ) => Promise<MonthlyTrainingPlanGeneration | null>;
  enqueueGenerationJob: (
    input: EnqueueMonthlyTrainingPlanGenerationJobInput,
  ) => Promise<MonthlyTrainingPlanGeneration>;
  failGenerationJob: (
    generationId: string,
    input: FailMonthlyTrainingPlanGenerationJobInput,
  ) => Promise<MonthlyTrainingPlanGeneration | null>;
  findGenerationJobById: (
    userId: string,
    generationId: string,
  ) => Promise<MonthlyTrainingPlanGeneration | null>;
  findPendingGenerationByUserId: (
    userId: string,
    observedAt: string,
  ) => Promise<MonthlyTrainingPlanGeneration | null>;
  listByStatus?: (
    status: MonthlyTrainingPlanGenerationStatus,
  ) => Promise<MonthlyTrainingPlanGeneration[]>;
  recordGenerationAttemptLog: (
    input: RecordMonthlyTrainingPlanGenerationAttemptLogInput,
  ) => Promise<void>;
  retryGenerationJob: (
    generationId: string,
    input: RetryMonthlyTrainingPlanGenerationJobInput,
  ) => Promise<MonthlyTrainingPlanGeneration | null>;
};
