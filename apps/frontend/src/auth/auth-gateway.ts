import { createMockAuthGateway } from './mock-auth-gateway.js';
import { createSupabaseAuthGateway } from './supabase-auth-gateway.js';
import type { AuthGateway } from './types.js';

export function createAuthGateway(): AuthGateway {
  if (import.meta.env.VITE_AUTH_MODE === 'mock') {
    return createMockAuthGateway();
  }

  return createSupabaseAuthGateway({
    publishableKey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    url: import.meta.env.VITE_SUPABASE_URL,
  });
}
