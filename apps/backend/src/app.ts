import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { trainingRoutes } from './modules/training/http/training-routes.js';
import type { TrainingPlanGenerator } from './modules/training/index.js';
import { createErrorResponse } from './shared/http/errors.js';

export type BuildAppOptions = {
  logger?: boolean;
  trainingPlanGenerator?: TrainingPlanGenerator;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
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
          name: 'training',
          description: 'Training plan generation',
        },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  });

  await app.register(trainingRoutes, {
    prefix: '/api',
    trainingPlanGenerator: options.trainingPlanGenerator,
  });

  return app;
}
