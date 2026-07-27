import { expect, test } from '@playwright/test';
import { createSupabaseAuthGateway } from '../src/auth/supabase-auth-gateway.js';

test.describe('Supabase auth gateway', () => {
  test('uses the configured production redirect URL for Google login', async () => {
    let oauthRequest: unknown;
    const gateway = createSupabaseAuthGateway({
      authRedirectUrl: 'https://funcione.pages.dev/',
      clientFactory: () =>
        ({
          auth: {
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({
              data: { subscription: { unsubscribe: () => undefined } },
            }),
            signInWithOAuth: async (request: unknown) => {
              oauthRequest = request;

              return { data: {}, error: null };
            },
            signInWithPassword: async () => ({ data: {}, error: null }),
            signOut: async () => ({ error: null }),
            signUp: async () => ({ data: {}, error: null }),
          },
        }) as never,
      publishableKey: 'publishable-key',
      url: 'https://tnvvxmxefeglwcicqvbs.supabase.co',
    });

    const result = await gateway.signInWithGoogle();

    expect(result).toEqual({ ok: true });
    expect(oauthRequest).toEqual({
      options: { redirectTo: 'https://funcione.pages.dev' },
      provider: 'google',
    });
  });
});
