import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthVerifier } from '../application/auth-verifier.js';
import { extractBearerToken } from '../application/bearer-token.js';

export type SupabaseAuthConfig = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

function createSupabaseAuthClient(config: Required<SupabaseAuthConfig>): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAuthVerifier(
  config: SupabaseAuthConfig,
): AuthVerifier {
  let authClient: SupabaseClient | null = null;

  return async (authorizationHeader) => {
    const token = extractBearerToken(authorizationHeader);

    if (!token) {
      return {
        authenticated: false,
        statusCode: 401,
        code: 'AUTH_TOKEN_MISSING',
        message: 'Authentication token is required.',
      };
    }

    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      return {
        authenticated: false,
        statusCode: 503,
        code: 'AUTH_PROVIDER_NOT_CONFIGURED',
        message: 'Authentication provider is not configured.',
      };
    }

    authClient ??= createSupabaseAuthClient({
      supabaseUrl: config.supabaseUrl,
      supabasePublishableKey: config.supabasePublishableKey,
    });

    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(token);

    if (error || !user) {
      return {
        authenticated: false,
        statusCode: 401,
        code: 'AUTH_TOKEN_INVALID',
        message: 'Authentication token is invalid or expired.',
      };
    }

    const provider =
      typeof user.app_metadata.provider === 'string'
        ? user.app_metadata.provider
        : null;

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email ?? null,
        provider,
      },
    };
  };
}
