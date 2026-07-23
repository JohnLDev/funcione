import type { FastifyPluginAsync } from 'fastify';
import { createErrorResponse, errorResponseJsonSchema } from '../../../shared/http/errors.js';
import {
  generateTrainingPlan,
  type TrainingPlanGenerator,
} from '../application/generate-training-plan.js';
import { DadosUsuarioSchema } from '../domain/index.js';
import type {
  TrainingRepositories,
  TrainingRepositoryFactory,
} from '../application/training-repository-factory.js';
import {
  dadosUsuarioJsonSchema,
  generateTrainingPlanSuccessJsonSchema,
} from './training-json-schemas.js';

export type TrainingRoutesOptions = {
  trainingRepositories?: TrainingRepositories;
  trainingRepositoryFactory?: TrainingRepositoryFactory;
  trainingPlanGenerator?: TrainingPlanGenerator;
};

export const trainingRoutes: FastifyPluginAsync<TrainingRoutesOptions> = async (
  app,
  options,
) => {
  const trainingPlanGenerator =
    options.trainingPlanGenerator ?? generateTrainingPlan;

  app.post(
    '/training-plans',
    {
      schema: {
        tags: ['training'],
        summary: 'Create a sport-specific training plan',
        description:
          'Generates a weekly training plan from athlete data and returns provider execution metadata.',
        body: dadosUsuarioJsonSchema,
        response: {
          200: generateTrainingPlanSuccessJsonSchema,
          400: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const parsedInput = DadosUsuarioSchema.safeParse(request.body);

      if (!parsedInput.success) {
        return reply.status(400).send(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid request body.',
            parsedInput.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        );
      }

      const result = await trainingPlanGenerator(parsedInput.data);

      if ('result' in result) {
        return reply.status(200).send(result);
      }

      return reply.status(503).send(
        createErrorResponse(
          'TRAINING_PLAN_GENERATION_FAILED',
          result.error,
          result.attempts.map((attempt) => ({ ...attempt })),
        ),
      );
    },
  );
};
