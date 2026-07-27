import { TrainingPlanGatewayError } from './training-plan.js';
import type {
  MonthlyTrainingPlanGeneration,
  MonthlyTrainingPlanRequest,
  MonthlyTrainingPlanState,
  TrainingPlanActionResult,
  TrainingPlanGenerationStatusResult,
  TrainingPlanGateway,
} from './training-plan.js';

type ApiErrorResponse = {
  error?: {
    code?: string;
    details?: Record<string, unknown>;
    message?: string;
    requestId?: string;
    userMessageKey?: string;
  };
};

type ParsedApiError = {
  code?: string;
  details?: Record<string, unknown>;
  message: string;
  requestId?: string;
  userMessageKey?: string;
};

function formatApiError(error?: ApiErrorResponse['error']): ParsedApiError {
  return {
    code: error?.code,
    details: error?.details,
    message: error?.message ?? 'Training plan request failed.',
    requestId: error?.requestId,
    userMessageKey: error?.userMessageKey,
  };
}

async function parseApiError(response: Response): Promise<ParsedApiError> {
  try {
    const body = (await response.json()) as ApiErrorResponse;

    return formatApiError(body.error);
  } catch {
    return { message: 'Training plan request failed.' };
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
        const error = await parseApiError(response);

        return {
          code: error.code,
          error: {
            code: error.code ?? 'TRAINING_PLAN_REQUEST_FAILED',
            details: error.details,
            message: error.message,
            requestId: error.requestId,
            source: 'training',
            userMessageKey: error.userMessageKey,
          },
          message: error.message,
          ok: false,
        };
      }

      const body = (await response.json()) as {
        generation: MonthlyTrainingPlanGeneration;
      };

      return {
        generation: body.generation,
        ok: true,
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
        const error = await parseApiError(response);

        throw new TrainingPlanGatewayError(error);
      }

      return (await response.json()) as MonthlyTrainingPlanState;
    },
    getGenerationStatus: async (
      accessToken: string,
      generationId: string,
    ): Promise<TrainingPlanGenerationStatusResult> => {
      const response = await fetch(
        `/api/training-plans/generations/${generationId}`,
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const error = await parseApiError(response);

        throw new TrainingPlanGatewayError(error);
      }

      return (await response.json()) as TrainingPlanGenerationStatusResult;
    },
  };
}
