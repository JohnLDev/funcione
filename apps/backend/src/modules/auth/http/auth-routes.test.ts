import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../../app.js';
import type { AuthVerifier } from '../application/auth-verifier.js';
import { createInMemoryUserProfileRepository } from '../infra/in-memory-user-profile-repository.js';

const authenticatedUser = {
  id: 'user-123',
  email: 'athlete@funcione.app',
  provider: 'email',
};

describe('auth routes', () => {
  const authenticatedAuthVerifier: AuthVerifier = async () => ({
    authenticated: true,
    user: authenticatedUser,
  });

  it('rejects requests without bearer token', async () => {
    const authVerifier: AuthVerifier = async () => ({
      authenticated: false,
      statusCode: 401,
      code: 'AUTH_TOKEN_MISSING',
      message: 'Authentication token is required.',
    });
    const app = await buildApp({ authVerifier });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'AUTH_TOKEN_MISSING');
  });

  it('returns the authenticated user for a valid bearer token', async () => {
    const authVerifier: AuthVerifier = async (authorizationHeader) => {
      assert.equal(authorizationHeader, 'Bearer valid-token');

      return {
        authenticated: true,
        user: authenticatedUser,
      };
    };
    const app = await buildApp({ authVerifier });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { user: authenticatedUser });
  });

  it('returns missing profile state for authenticated users without app registration', async () => {
    const app = await buildApp({
      authVerifier: authenticatedAuthVerifier,
      userProfileRepository: createInMemoryUserProfileRepository(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().completed, false);
    assert.equal(response.json().profile, null);
    assert.deepEqual(response.json().requiredFields, [
      'firstName',
      'lastName',
      'cpf',
      'birthDate',
      'phoneNumber',
      'email',
    ]);
  });

  it('uses a request scoped user profile repository when a factory is provided', async () => {
    const calls: string[] = [];
    const app = await buildApp({
      authVerifier: async () => ({
        authenticated: true,
        user: {
          email: 'athlete@funcione.app',
          id: 'user-123',
          provider: 'password',
        },
      }),
      userProfileRepositoryFactory: (accessToken) => {
        calls.push(accessToken);

        return createInMemoryUserProfileRepository();
      },
    });

    const response = await app.inject({
      headers: { authorization: 'Bearer scoped-token' },
      method: 'GET',
      url: '/api/auth/profile',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(calls, ['scoped-token']);
  });

  it('builds a user-scoped Supabase profile repository from server config', async () => {
    const originalSupabaseUrl = process.env.SUPABASE_URL;
    const originalSupabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    const requests: Request[] = [];
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';

    let app;
    try {
      app = await buildApp({
        authVerifier: authenticatedAuthVerifier,
        supabaseFetch: async (input, init) => {
          const request = new Request(input, init);
          requests.push(request);

          return Response.json({
            birth_date: '1994-08-20',
            cpf: '52998224725',
            created_at: '2026-07-23T12:00:00.000Z',
            email: 'athlete@funcione.app',
            first_name: 'Joao',
            last_name: 'Silva',
            phone_number: '11999999999',
            updated_at: '2026-07-23T12:00:00.000Z',
            user_id: 'user-123',
          });
        },
      });
    } finally {
      if (originalSupabaseUrl === undefined) {
        delete process.env.SUPABASE_URL;
      } else {
        process.env.SUPABASE_URL = originalSupabaseUrl;
      }
      if (originalSupabasePublishableKey === undefined) {
        delete process.env.SUPABASE_PUBLISHABLE_KEY;
      } else {
        process.env.SUPABASE_PUBLISHABLE_KEY = originalSupabasePublishableKey;
      }
    }

    const response = await app.inject({
      headers: { authorization: 'Bearer scoped-token' },
      method: 'GET',
      url: '/api/auth/profile',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().completed, true);
    assert.equal(requests.length, 1);
    assert.equal(
      requests[0]?.headers.get('authorization'),
      'Bearer scoped-token',
    );
  });

  it('persists a profile through the request scoped repository on PUT', async () => {
    const requestScopedRepository = createInMemoryUserProfileRepository();
    const factoryTokens: string[] = [];
    const app = await buildApp({
      authVerifier: authenticatedAuthVerifier,
      userProfileRepositoryFactory: (accessToken) => {
        factoryTokens.push(accessToken);

        return requestScopedRepository;
      },
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer scoped-put-token',
      },
      payload: {
        firstName: 'Joao',
        lastName: 'Silva',
        cpf: '52998224725',
        birthDate: '1994-08-20',
        phoneNumber: '11999999999',
        email: 'athlete@funcione.app',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(factoryTokens, ['scoped-put-token']);
    assert.deepEqual(await requestScopedRepository.findByUserId('user-123'), {
      birthDate: '1994-08-20',
      cpf: '52998224725',
      createdAt: response.json().profile.createdAt,
      email: 'athlete@funcione.app',
      firstName: 'Joao',
      lastName: 'Silva',
      phoneNumber: '11999999999',
      updatedAt: response.json().profile.updatedAt,
      userId: 'user-123',
    });
  });

  it('rejects invalid registration profile payloads', async () => {
    const app = await buildApp({
      authVerifier: authenticatedAuthVerifier,
      userProfileRepository: createInMemoryUserProfileRepository(),
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        firstName: 'Joao',
        lastName: 'Silva',
        cpf: '123',
        birthDate: '2035-01-01',
        phoneNumber: '11999999999',
        email: 'athlete@funcione.app',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'VALIDATION_ERROR');
  });

  it('rejects registration profile names longer than 80 characters', async () => {
    const app = await buildApp({
      authVerifier: authenticatedAuthVerifier,
      userProfileRepository: createInMemoryUserProfileRepository(),
    });
    const basePayload = {
      firstName: 'Joao',
      lastName: 'Silva',
      cpf: '52998224725',
      birthDate: '1994-08-20',
      phoneNumber: '11999999999',
      email: 'athlete@funcione.app',
    };

    const longFirstNameResponse = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        ...basePayload,
        firstName: 'A'.repeat(81),
      },
    });
    const longLastNameResponse = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        ...basePayload,
        lastName: 'B'.repeat(81),
      },
    });

    assert.equal(longFirstNameResponse.statusCode, 400);
    assert.equal(longFirstNameResponse.json().error.code, 'VALIDATION_ERROR');
    assert.equal(longLastNameResponse.statusCode, 400);
    assert.equal(longLastNameResponse.json().error.code, 'VALIDATION_ERROR');
  });

  it('creates and returns the authenticated user registration profile', async () => {
    const userProfileRepository = createInMemoryUserProfileRepository();
    const app = await buildApp({
      authVerifier: authenticatedAuthVerifier,
      userProfileRepository,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        firstName: 'Joao',
        lastName: 'Silva',
        cpf: '52998224725',
        birthDate: '1994-08-20',
        phoneNumber: '11999999999',
        email: 'athlete@funcione.app',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().completed, true);
    assert.equal(response.json().profile.userId, authenticatedUser.id);
    assert.equal(response.json().profile.firstName, 'Joao');
    assert.equal(response.json().profile.cpf, '52998224725');
  });

  it('rejects profile email changes that do not match the auth provider email', async () => {
    const app = await buildApp({
      authVerifier: authenticatedAuthVerifier,
      userProfileRepository: createInMemoryUserProfileRepository(),
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: {
        authorization: 'Bearer valid-token',
      },
      payload: {
        firstName: 'Joao',
        lastName: 'Silva',
        cpf: '52998224725',
        birthDate: '1994-08-20',
        phoneNumber: '11999999999',
        email: 'other@funcione.app',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'EMAIL_MISMATCH');
  });

  it('documents the auth route in OpenAPI', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    assert.equal(response.statusCode, 200);
    assert.ok(response.json().paths['/api/auth/me'].get);
    assert.ok(response.json().paths['/api/auth/profile'].get);
    assert.ok(response.json().paths['/api/auth/profile'].put);
    const profilePutBodySchema =
      response.json().paths['/api/auth/profile'].put.requestBody.content[
        'application/json'
      ].schema;
    assert.equal(profilePutBodySchema.properties.firstName.maxLength, 80);
    assert.equal(profilePutBodySchema.properties.lastName.maxLength, 80);
    assert.deepEqual(
      response.json().paths['/api/auth/me'].get.security,
      [{ bearerAuth: [] }],
    );
    assert.deepEqual(
      response.json().paths['/api/auth/profile'].put.security,
      [{ bearerAuth: [] }],
    );
    assert.ok(response.json().components.securitySchemes.bearerAuth);
  });
});
