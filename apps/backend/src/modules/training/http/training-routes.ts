import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createErrorResponse, errorResponseJsonSchema } from '../../../shared/http/errors.js';
import {
  extractBearerToken,
  type AuthenticatedUser,
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
import type { MonthlyTrainingPlan } from '../domain/index.js';
import type {
  TrainingRepositories,
  TrainingRepositoryFactory,
} from '../application/training-repository-factory.js';
import {
  activeMonthlyTrainingPlanResponseJsonSchema,
  createMonthlyTrainingPlanBodyJsonSchema,
  createMonthlyTrainingPlanResponseJsonSchema,
} from './training-json-schemas.js';
import { normalizePromptText } from '../domain/prompt-text.js';

export type TrainingRoutesOptions = {
  authVerifier?: AuthVerifier;
  trainingRepositories?: TrainingRepositories;
  trainingRepositoryFactory?: TrainingRepositoryFactory;
  trainingPlanGenerator?: TrainingPlanGenerator;
  userProfileRepository?: UserProfileRepository;
  userProfileRepositoryFactory?: UserProfileRepositoryFactory;
};

declare module 'fastify' {
  interface FastifyRequest {
    monthlyTrainingUser: AuthenticatedUser | null;
  }
}

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

async function authenticateMonthlyRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  authVerifier: AuthVerifier | undefined,
) {
  const verification = await authVerifier?.(request.headers.authorization);

  if (!verification?.authenticated) {
    return reply.status(verification?.statusCode ?? 401).send(
      createErrorResponse(
        verification?.code ?? 'AUTH_TOKEN_MISSING',
        verification?.message ?? 'Authentication token is required.',
      ),
    );
  }

  request.monthlyTrainingUser = verification.user;
}

function resolveMonthlyRouteDependencies(
  request: FastifyRequest,
  options: TrainingRoutesOptions,
) {
  const accessToken = extractBearerToken(request.headers.authorization);

  return {
    repositories:
      accessToken && options.trainingRepositoryFactory
        ? options.trainingRepositoryFactory(accessToken)
        : options.trainingRepositories,
    userProfileRepository:
      accessToken && options.userProfileRepositoryFactory
        ? options.userProfileRepositoryFactory(accessToken)
        : options.userProfileRepository,
  };
}

function normalizeTextValue(value: unknown): unknown {
  return typeof value === 'string' ? normalizePromptText(value) : value;
}

async function normalizeMonthlyPayloadForValidation(request: FastifyRequest) {
  if (!request.body || typeof request.body !== 'object') {
    return;
  }

  const payload = request.body as Record<string, unknown>;

  if (Array.isArray(payload.equipamentos)) {
    payload.equipamentos = payload.equipamentos.map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const equipment = item as Record<string, unknown>;

      const normalizedEquipment = { ...equipment };

      if ('descricao' in normalizedEquipment) {
        normalizedEquipment.descricao = normalizeTextValue(
          normalizedEquipment.descricao,
        );
      }

      return normalizedEquipment;
    });
  }

  if (Array.isArray(payload.lesoes)) {
    payload.lesoes = payload.lesoes.map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const injury = item as Record<string, unknown>;

      const normalizedInjury = { ...injury };

      if ('descricao' in normalizedInjury) {
        normalizedInjury.descricao = normalizeTextValue(
          normalizedInjury.descricao,
        );
      }

      if ('observacoes' in normalizedInjury) {
        normalizedInjury.observacoes = normalizeTextValue(
          normalizedInjury.observacoes,
        );
      }

      return normalizedInjury;
    });
  }
}

export const trainingRoutes: FastifyPluginAsync<TrainingRoutesOptions> = async (
  app,
  options,
) => {
  const trainingPlanGenerator =
    options.trainingPlanGenerator ?? generateTrainingPlan;

  app.decorateRequest('monthlyTrainingUser', null);

  app.get(
    '/training-plans/active',
    {
      onRequest: (request, reply) =>
        authenticateMonthlyRequest(request, reply, options.authVerifier),
      schema: {
        tags: ['training'],
        summary: 'Get the active monthly training plan',
        security: [{ bearerAuth: [] }],
        response: {
          200: activeMonthlyTrainingPlanResponseJsonSchema,
          401: errorResponseJsonSchema,
          500: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const { repositories, userProfileRepository } =
        resolveMonthlyRouteDependencies(request, options);

      if (!repositories || !userProfileRepository) {
        return reply.status(503).send(
          createErrorResponse(
            'TRAINING_PLAN_STORAGE_NOT_CONFIGURED',
            'Training plan storage is not configured.',
          ),
        );
      }

      const state = await getActiveMonthlyTrainingPlan(request.monthlyTrainingUser!, {
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
      onRequest: (request, reply) =>
        authenticateMonthlyRequest(request, reply, options.authVerifier),
      preValidation: normalizeMonthlyPayloadForValidation,
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
          500: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const { repositories, userProfileRepository } =
        resolveMonthlyRouteDependencies(request, options);

      if (!repositories || !userProfileRepository) {
        return reply.status(503).send(
          createErrorResponse(
            'TRAINING_PLAN_STORAGE_NOT_CONFIGURED',
            'Training plan storage is not configured.',
          ),
        );
      }

      const result = await createMonthlyTrainingPlan(request.monthlyTrainingUser!, request.body, {
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

};
