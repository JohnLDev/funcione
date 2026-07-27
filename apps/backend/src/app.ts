import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  authRoutes,
  createInMemoryUserProfileRepository,
  createSupabaseAuthVerifier,
  createSupabaseUserProfileRepository,
  type AuthVerifier,
  type UserProfileRepository,
  type UserProfileRepositoryFactory,
} from './modules/auth/index.js';
import { trainingRoutes } from './modules/training/http/training-routes.js';
import {
  createInMemoryTrainingRepositories,
  createSupabaseTrainingRepositories,
  createSupabaseTrainingWorkerRepositories,
  type TrainingPlanGenerator,
  type TrainingRepositories,
  type TrainingRepositoryFactory,
} from './modules/training/index.js';
import { getServerConfig } from './shared/config/env.js';
import { createErrorResponse } from './shared/http/errors.js';

export type BuildAppOptions = {
  authVerifier?: AuthVerifier;
  generationJobLeaseMs?: number;
  logger?: boolean;
  requiresTrainingWorkerRepositories?: boolean;
  supabaseFetch?: typeof fetch;
  trainingPlanGenerator?: TrainingPlanGenerator;
  trainingRepositories?: TrainingRepositories;
  trainingWorkerRepositories?: TrainingRepositories;
  trainingRepositoryFactory?: TrainingRepositoryFactory;
  userProfileRepository?: UserProfileRepository;
  userProfileRepositoryFactory?: UserProfileRepositoryFactory;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = getServerConfig();
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
      onCreate: (ajv) => {
        ajv.addKeyword({
          keyword: 'x-uniqueBy',
          schemaType: 'string',
          type: 'array',
          validate: (propertyName: string, values: unknown[]) => {
            const propertyValues = values.map((value) =>
              value && typeof value === 'object'
                ? (value as Record<string, unknown>)[propertyName]
                : undefined,
            );

            return new Set(propertyValues).size === propertyValues.length;
          },
        });
      },
    },
    logger: options.logger ?? false,
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return reply
        .status(400)
        .send(createErrorResponse('VALIDATION_ERROR', error.message));
    }

    request.log.error({ err: error }, 'Unhandled request error');

    return reply
      .status(500)
      .send(createErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error.'));
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Training Plan API',
        description: 'REST API for sport-specific training plan generation.',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      tags: [
        {
          name: 'system',
          description: 'System health and operational endpoints',
        },
        {
          name: 'auth',
          description: 'Authentication and current user session',
        },
        {
          name: 'training',
          description: 'Training plan generation',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  });

  app.get('/healthz', {
    schema: {
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          required: ['status'],
          additionalProperties: false,
          properties: {
            status: {
              type: 'string',
              enum: ['ok'],
            },
          },
        },
      },
    },
  }, async () => ({ status: 'ok' }));

  const fallbackUserProfileRepository =
    options.userProfileRepository ?? createInMemoryUserProfileRepository();
  const fallbackTrainingRepositories =
    options.trainingRepositories ?? createInMemoryTrainingRepositories();
  const supabasePersistenceConfig =
    config.supabasePublishableKey && config.supabaseUrl
      ? {
          supabasePublishableKey: config.supabasePublishableKey,
          supabaseUrl: config.supabaseUrl,
        }
      : null;
  const supabaseWorkerPersistenceConfig =
    config.supabaseSecretKey && config.supabaseUrl
      ? {
          supabaseSecretKey: config.supabaseSecretKey,
          supabaseUrl: config.supabaseUrl,
        }
      : null;
  const userProfileRepositoryFactory =
    options.userProfileRepositoryFactory ??
    (supabasePersistenceConfig
      ? ((accessToken: string) =>
          createSupabaseUserProfileRepository({
            ...supabasePersistenceConfig,
            accessToken,
            fetch: options.supabaseFetch,
          }))
      : undefined);
  const trainingRepositoryFactory =
    options.trainingRepositoryFactory ??
    (supabasePersistenceConfig
      ? ((accessToken: string) =>
          createSupabaseTrainingRepositories({
            ...supabasePersistenceConfig,
            accessToken,
            fetch: options.supabaseFetch,
          }))
      : undefined);
  const trainingWorkerRepositories =
    options.trainingWorkerRepositories ??
    (supabaseWorkerPersistenceConfig
      ? createSupabaseTrainingWorkerRepositories({
          ...supabaseWorkerPersistenceConfig,
          fetch: options.supabaseFetch,
        })
      : undefined);

  await app.register(authRoutes, {
    prefix: '/api',
    authVerifier:
      options.authVerifier ??
      createSupabaseAuthVerifier({
        supabasePublishableKey: config.supabasePublishableKey,
        supabaseUrl: config.supabaseUrl,
      }),
    userProfileRepository: fallbackUserProfileRepository,
    userProfileRepositoryFactory,
  });

  await app.register(trainingRoutes, {
    prefix: '/api',
    authVerifier:
      options.authVerifier ??
      createSupabaseAuthVerifier({
        supabasePublishableKey: config.supabasePublishableKey,
        supabaseUrl: config.supabaseUrl,
      }),
    trainingPlanGenerator: options.trainingPlanGenerator,
    generationJobLeaseMs:
      options.generationJobLeaseMs ?? config.trainingPlanGenerationJobLeaseMs,
    trainingRepositories: fallbackTrainingRepositories,
    trainingWorkerRepositories,
    requiresTrainingWorkerRepositories:
      options.requiresTrainingWorkerRepositories ?? Boolean(supabasePersistenceConfig),
    trainingRepositoryFactory,
    userProfileRepository: fallbackUserProfileRepository,
    userProfileRepositoryFactory,
  });

  return app;
}
