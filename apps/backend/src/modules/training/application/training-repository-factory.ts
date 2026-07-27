import type { AthleticProfileRepository } from './athletic-profile-repository.js';
import type { MonthlyTrainingPlanGenerationJobRepository } from './monthly-training-plan-generation-job-repository.js';
import type { MonthlyTrainingPlanRepository } from './monthly-training-plan-repository.js';

export type TrainingRepositories = {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanGenerationJobRepository: MonthlyTrainingPlanGenerationJobRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
};

export type TrainingRepositoryFactory = (
  accessToken: string,
) => TrainingRepositories;
