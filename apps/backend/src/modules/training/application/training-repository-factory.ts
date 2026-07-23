import type { AthleticProfileRepository } from './athletic-profile-repository.js';
import type { MonthlyTrainingPlanRepository } from './monthly-training-plan-repository.js';

export type TrainingRepositories = {
  athleticProfileRepository: AthleticProfileRepository;
  monthlyTrainingPlanRepository: MonthlyTrainingPlanRepository;
};

export type TrainingRepositoryFactory = (
  accessToken: string,
) => TrainingRepositories;
