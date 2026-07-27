import { expect, test } from '@playwright/test';
import { createApiRegistrationProfileGateway } from '../src/auth/api-registration-profile-gateway.js';
import type { RegistrationProfileInput } from '../src/auth/registration-profile.js';

test.describe('API registration profile gateway', () => {
  test('sends only registration profile fields when completing a profile', async () => {
    const originalFetch = globalThis.fetch;
    const profile: RegistrationProfileInput = {
      birthDate: '2000-09-19',
      cpf: '04640505027',
      email: 'john.lenon.dev@gmail.com',
      firstName: 'John',
      lastName: 'Oliveira da Silva',
      phoneNumber: '5398454362',
    };
    const profileWithPassword = {
      ...profile,
      password: '',
    };
    let requestBody: unknown;

    globalThis.fetch = async (...[, init]: Parameters<typeof fetch>) => {
      requestBody =
        typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

      return Response.json({
        profile: {
          ...profile,
          createdAt: '2026-07-24T00:00:00.000Z',
          updatedAt: '2026-07-24T00:00:00.000Z',
          userId: 'user-123',
        },
      });
    };

    try {
      const result = await createApiRegistrationProfileGateway().completeProfile(
        'access-token',
        profileWithPassword,
      );

      expect(result.ok).toBe(true);
      expect(requestBody).toEqual(profile);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('uses the configured backend URL when completing a profile', async () => {
    const originalFetch = globalThis.fetch;
    const profile: RegistrationProfileInput = {
      birthDate: '2000-09-19',
      cpf: '04640505027',
      email: 'john.lenon.dev@gmail.com',
      firstName: 'John',
      lastName: 'Oliveira da Silva',
      phoneNumber: '5398454362',
    };
    let requestUrl: string | undefined;

    globalThis.fetch = async (...[input]: Parameters<typeof fetch>) => {
      requestUrl = String(input);

      return Response.json({
        profile: {
          ...profile,
          createdAt: '2026-07-24T00:00:00.000Z',
          updatedAt: '2026-07-24T00:00:00.000Z',
          userId: 'user-123',
        },
      });
    };

    try {
      await createApiRegistrationProfileGateway({
        apiBaseUrl: 'https://funcione-api.onrender.com',
      }).completeProfile('access-token', profile);

      expect(requestUrl).toBe(
        'https://funcione-api.onrender.com/api/auth/profile',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
