import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type {
  AuthActionResult,
  AuthGateway,
  AuthSession,
  AuthStateListener,
} from './types.js';

type SupabaseClientConfig = {
  publishableKey?: string;
  url?: string;
};

function getMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function mapSession(session: Session | null): AuthSession | null {
  if (!session) {
    return null;
  }

  const metadata = session.user.user_metadata;
  const fullName = getMetadataString(metadata, ['full_name', 'name']);
  const firstName =
    getMetadataString(metadata, ['given_name', 'first_name']) ??
    fullName?.split(/\s+/)[0] ??
    null;
  const lastName =
    getMetadataString(metadata, ['family_name', 'last_name']) ??
    fullName?.split(/\s+/).slice(1).join(' ') ??
    null;
  const provider =
    typeof session.user.app_metadata.provider === 'string'
      ? session.user.app_metadata.provider
      : null;

  return {
    accessToken: session.access_token,
    user: {
      firstName,
      fullName,
      id: session.user.id,
      email: session.user.email ?? null,
      lastName,
      phoneNumber: getMetadataString(metadata, ['phone', 'phone_number']),
      provider,
    },
  };
}

function createMissingConfigResult(): AuthActionResult {
  return {
    ok: false,
    message: 'Supabase authentication is not configured.',
  };
}

function createConfiguredSupabaseClient(
  config: Required<SupabaseClientConfig>,
): SupabaseClient {
  return createClient(config.url, config.publishableKey);
}

export function createSupabaseAuthGateway(
  config: SupabaseClientConfig,
): AuthGateway {
  const supabase =
    config.url && config.publishableKey
      ? createConfiguredSupabaseClient({
          publishableKey: config.publishableKey,
          url: config.url,
        })
      : null;

  return {
    getSession: async () => {
      if (!supabase) {
        return null;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      return mapSession(session);
    },
    onAuthStateChange: (listener: AuthStateListener) => {
      if (!supabase) {
        return { unsubscribe: () => undefined };
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          listener(mapSession(session));
        },
      );

      return {
        unsubscribe: () => subscription.unsubscribe(),
      };
    },
    signInWithGoogle: async () => {
      if (!supabase) {
        return createMissingConfigResult();
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    },
    signInWithPassword: async ({ email, password }) => {
      if (!supabase) {
        return createMissingConfigResult();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, session: mapSession(data.session) ?? undefined };
    },
    signOut: async () => {
      if (!supabase) {
        return createMissingConfigResult();
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    },
    signUpWithPassword: async ({ email, password }) => {
      if (!supabase) {
        return createMissingConfigResult();
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      if (!data.session) {
        return {
          ok: true,
          message: 'Check your email to confirm your account.',
        };
      }

      return { ok: true, session: mapSession(data.session) ?? undefined };
    },
  };
}
