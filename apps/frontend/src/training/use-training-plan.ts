import { useContext } from 'react';
import { TrainingPlanContext } from './training-plan-provider.js';

export function useTrainingPlan() {
  const context = useContext(TrainingPlanContext);

  if (!context) {
    throw new Error('useTrainingPlan must be used inside TrainingPlanProvider.');
  }

  return context;
}
