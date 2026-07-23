import type {
  MonthlyTrainingPlan,
  MonthlyTrainingPlanRequest,
  MonthlyTrainingPlanState,
  TrainingPlanActionResult,
  TrainingPlanGateway,
} from './training-plan.js';

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };

    return body.error?.message ?? 'Training plan request failed.';
  } catch {
    return 'Training plan request failed.';
  }
}

export function createApiTrainingPlanGateway(): TrainingPlanGateway {
  return {
    createMonthlyPlan: async (
      accessToken: string,
      payload: MonthlyTrainingPlanRequest,
    ): Promise<TrainingPlanActionResult> => {
      const response = await fetch('/api/training-plans/monthly', {
        body: JSON.stringify(payload),
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        return {
          message: await parseErrorMessage(response),
          ok: false,
        };
      }

      const body = (await response.json()) as { plan: MonthlyTrainingPlan };

      return {
        ok: true,
        plan: body.plan,
      };
    },
    getActivePlan: async (
      accessToken: string,
    ): Promise<MonthlyTrainingPlanState> => {
      const response = await fetch('/api/training-plans/active', {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      return (await response.json()) as MonthlyTrainingPlanState;
    },
  };
}
