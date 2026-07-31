import { expect, test } from '@playwright/test';
import {
  createSupabaseAuthGateway,
  resolveOAuthRedirectUrl,
} from '../src/auth/supabase-auth-gateway.js';

test.describe('Supabase auth gateway', () => {
  test('uses the current localhost origin when no redirect URL is configured', () => {
    expect(resolveOAuthRedirectUrl(undefined, 'http://localhost:51394/')).toBe(
      'http://localhost:51394',
    );
    expect(resolveOAuthRedirectUrl('   ', 'http://127.0.0.1:5173/')).toBe(
      'http://127.0.0.1:5173',
    );
  });

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
