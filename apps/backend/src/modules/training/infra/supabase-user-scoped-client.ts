import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UserScopedSupabaseClientConfig = {
  accessToken: string;
  fetch?: typeof fetch;
  supabasePublishableKey: string;
  supabaseUrl: string;
};

export function createUserScopedSupabaseClient(
  config: UserScopedSupabaseClientConfig,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: config.fetch,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  });
}
