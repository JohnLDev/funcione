import type { FastifyPluginAsync } from 'fastify';
import { createErrorResponse, errorResponseJsonSchema } from '../../../shared/http/errors.js';
import {
  extractBearerToken,
  type AuthVerifier,
  type UserProfileRepository,
  type UserProfileRepositoryFactory,
} from '../../auth/index.js';
import {
  generateTrainingPlan,
  type TrainingPlanGenerator,
} from '../application/generate-training-plan.js';
import {
  createMonthlyTrainingPlan,
  getActiveMonthlyTrainingPlan,
} from '../application/monthly-training-plan-service.js';
import { DadosUsuarioSchema, type MonthlyTrainingPlan } from '../domain/index.js';
import type {
  TrainingRepositories,
  TrainingRepositoryFactory,
} from '../application/training-repository-factory.js';
import {
  activeMonthlyTrainingPlanResponseJsonSchema,
  createMonthlyTrainingPlanBodyJsonSchema,
  createMonthlyTrainingPlanResponseJsonSchema,
  dadosUsuarioJsonSchema,
  generateTrainingPlanSuccessJsonSchema,
} from './training-json-schemas.js';

export type TrainingRoutesOptions = {
  authVerifier?: AuthVerifier;
  trainingRepositories?: TrainingRepositories;
  trainingRepositoryFactory?: TrainingRepositoryFactory;
  trainingPlanGenerator?: TrainingPlanGenerator;
  userProfileRepository?: UserProfileRepository;
  userProfileRepositoryFactory?: UserProfileRepositoryFactory;
};

function serializePublicMonthlyPlan(plan: MonthlyTrainingPlan) {
  return {
    availableForRegenerationAt: plan.availableForRegenerationAt,
    generatedAt: plan.generatedAt,
    id: plan.id,
    result: plan.result,
    snapshot: plan.snapshot,
    status: plan.status,
    userId: plan.userId,
  };
}

export const trainingRoutes: FastifyPluginAsync<TrainingRoutesOptions> = async (
  app,
  options,
) => {
  const trainingPlanGenerator =
    options.trainingPlanGenerator ?? generateTrainingPlan;

  app.get(
    '/training-plans/active',
    {
      schema: {
        tags: ['training'],
        summary: 'Get the active monthly training plan',
        security: [{ bearerAuth: [] }],
        response: {
          200: activeMonthlyTrainingPlanResponseJsonSchema,
          401: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const verification = await options.authVerifier?.(request.headers.authorization);

      if (!verification?.authenticated) {
        return reply.status(verification?.statusCode ?? 401).send(
          createErrorResponse(
            verification?.code ?? 'AUTH_TOKEN_MISSING',
            verification?.message ?? 'Authentication token is required.',
          ),
        );
      }

      const accessToken = extractBearerToken(request.headers.authorization);
      const repositories =
        accessToken && options.trainingRepositoryFactory
          ? options.trainingRepositoryFactory(accessToken)
          : options.trainingRepositories;
      const userProfileRepository =
        accessToken && options.userProfileRepositoryFactory
          ? options.userProfileRepositoryFactory(accessToken)
          : options.userProfileRepository;

      if (!repositories || !userProfileRepository) {
        return reply.status(503).send(
          createErrorResponse(
            'TRAINING_PLAN_STORAGE_NOT_CONFIGURED',
            'Training plan storage is not configured.',
          ),
        );
      }

      const state = await getActiveMonthlyTrainingPlan(verification.user, {
        ...repositories,
        trainingPlanGenerator,
        userProfileRepository,
      });

      return reply.status(200).send({
        activePlan: state.activePlan
          ? serializePublicMonthlyPlan(state.activePlan)
          : null,
        athleticProfile: state.athleticProfile,
        canGenerate: state.canGenerate,
        nextGenerationAvailableAt: state.nextGenerationAvailableAt,
      });
    },
  );

  app.post(
    '/training-plans/monthly',
    {
      schema: {
        tags: ['training'],
        summary: 'Create a monthly training plan',
        security: [{ bearerAuth: [] }],
        body: createMonthlyTrainingPlanBodyJsonSchema,
        response: {
          200: createMonthlyTrainingPlanResponseJsonSchema,
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          409: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const verification = await options.authVerifier?.(request.headers.authorization);

      if (!verification?.authenticated) {
        return reply.status(verification?.statusCode ?? 401).send(
          createErrorResponse(
            verification?.code ?? 'AUTH_TOKEN_MISSING',
            verification?.message ?? 'Authentication token is required.',
          ),
        );
      }

      const accessToken = extractBearerToken(request.headers.authorization);
      const repositories =
        accessToken && options.trainingRepositoryFactory
          ? options.trainingRepositoryFactory(accessToken)
          : options.trainingRepositories;
      const userProfileRepository =
        accessToken && options.userProfileRepositoryFactory
          ? options.userProfileRepositoryFactory(accessToken)
          : options.userProfileRepository;

      if (!repositories || !userProfileRepository) {
        return reply.status(503).send(
          createErrorResponse(
            'TRAINING_PLAN_STORAGE_NOT_CONFIGURED',
            'Training plan storage is not configured.',
          ),
        );
      }

      const result = await createMonthlyTrainingPlan(verification.user, request.body, {
        ...repositories,
        trainingPlanGenerator,
        userProfileRepository,
      });

      if (!result.ok) {
        return reply.status(result.error.statusCode).send(
          createErrorResponse(
            result.error.code,
            result.error.message,
            result.error.details,
          ),
        );
      }

      return reply.status(200).send({
        plan: serializePublicMonthlyPlan(result.plan),
      });
    },
  );

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
