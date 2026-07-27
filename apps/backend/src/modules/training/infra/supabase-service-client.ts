import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ServiceSupabaseClientConfig = {
  fetch?: typeof fetch;
  supabaseSecretKey: string;
  supabaseUrl: string;
};

export function createServiceSupabaseClient(
  config: ServiceSupabaseClientConfig,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: config.fetch,
    },
  });
}
