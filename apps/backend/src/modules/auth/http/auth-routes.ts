import type { FastifyPluginAsync } from 'fastify';
import type { AuthVerifier } from '../application/auth-verifier.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.js';
import {
  completeUserProfile,
  getUserProfileState,
} from '../application/user-profile-service.js';
import type { UserProfileRepository } from '../application/user-profile-repository.js';
import {
  createErrorResponse,
  errorResponseJsonSchema,
  type ErrorResponse,
} from '../../../shared/http/errors.js';
import {
  completeUserProfileBodyJsonSchema,
  completeUserProfileResponseJsonSchema,
  currentUserResponseJsonSchema,
  userProfileStateResponseJsonSchema,
} from './auth-json-schemas.js';

export type AuthRoutesOptions = {
  authVerifier: AuthVerifier;
  userProfileRepository: UserProfileRepository;
};

type VerifiedCurrentUser =
  | {
      user: AuthenticatedUser;
    }
  | {
      error: ErrorResponse;
      statusCode: 401 | 503;
    };

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  options,
) => {
  const verifyCurrentUser = async (
    authorizationHeader: string | undefined,
  ): Promise<VerifiedCurrentUser> => {
    const verification = await options.authVerifier(authorizationHeader);

    if (!verification.authenticated) {
      return {
        error: createErrorResponse(verification.code, verification.message),
        statusCode: verification.statusCode,
      };
    }

    return {
      user: verification.user,
    };
  };

  app.get(
    '/auth/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get current authenticated user',
        description:
          'Validates the Supabase Auth access token from the Authorization bearer header and returns the unified current user.',
        security: [{ bearerAuth: [] }],
        response: {
          200: currentUserResponseJsonSchema,
          401: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const currentUser = await verifyCurrentUser(
        request.headers.authorization,
      );

      if ('error' in currentUser) {
        return reply.status(currentUser.statusCode).send(currentUser.error);
      }

      return reply.status(200).send({ user: currentUser.user });
    },
  );

  app.get(
    '/auth/profile',
    {
      schema: {
        tags: ['auth'],
        summary: 'Get current user registration profile state',
        description:
          'Returns whether the authenticated user has completed the Funcione registration profile required after password or social login.',
        security: [{ bearerAuth: [] }],
        response: {
          200: userProfileStateResponseJsonSchema,
          401: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const currentUser = await verifyCurrentUser(
        request.headers.authorization,
      );

      if ('error' in currentUser) {
        return reply.status(currentUser.statusCode).send(currentUser.error);
      }

      const profileState = await getUserProfileState(
        currentUser.user,
        options.userProfileRepository,
      );

      return reply.status(200).send(profileState);
    },
  );

  app.put(
    '/auth/profile',
    {
      schema: {
        tags: ['auth'],
        summary: 'Complete current user registration profile',
        description:
          'Stores the required Funcione registration fields for the authenticated user. The profile email must match the Supabase Auth email when available.',
        security: [{ bearerAuth: [] }],
        body: completeUserProfileBodyJsonSchema,
        response: {
          200: completeUserProfileResponseJsonSchema,
          400: errorResponseJsonSchema,
          401: errorResponseJsonSchema,
          503: errorResponseJsonSchema,
        },
      },
    },
    async (request, reply) => {
      const currentUser = await verifyCurrentUser(
        request.headers.authorization,
      );

      if ('error' in currentUser) {
        return reply.status(currentUser.statusCode).send(currentUser.error);
      }

      const result = await completeUserProfile(
        currentUser.user,
        request.body,
        options.userProfileRepository,
      );

      if ('error' in result) {
        return reply.status(400).send(
          createErrorResponse(
            result.error.code,
            result.error.message,
            result.error.details,
          ),
        );
      }

      return reply.status(200).send(result);
    },
  );
};
