import { createApiTrainingPlanGateway } from './api-training-plan-gateway.js';
import { createMockTrainingPlanGateway } from './mock-training-plan-gateway.js';
import type { TrainingPlanGateway } from './training-plan.js';

export function createTrainingPlanGateway(): TrainingPlanGateway {
  if (import.meta.env.VITE_AUTH_MODE === 'mock') {
    return createMockTrainingPlanGateway();
  }

  return createApiTrainingPlanGateway();
}
