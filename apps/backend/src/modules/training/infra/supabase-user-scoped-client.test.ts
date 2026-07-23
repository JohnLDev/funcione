import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createUserScopedSupabaseClient } from './supabase-user-scoped-client.js';

describe('Supabase user-scoped client', () => {
  it('uses the publishable key with the caller JWT and injected fetch', async () => {
    const requests: Request[] = [];
    const client = createUserScopedSupabaseClient({
      accessToken: 'user-jwt',
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);

        return Response.json({ user_id: 'user-123' });
      },
      supabasePublishableKey: 'publishable-key',
      supabaseUrl: 'https://project.supabase.co',
    });

    const { error } = await client
      .from('training_athletic_profiles')
      .select('user_id')
      .eq('user_id', 'user-123')
      .maybeSingle();

    assert.equal(error, null);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.headers.get('authorization'), 'Bearer user-jwt');
    assert.equal(requests[0]?.headers.get('apikey'), 'publishable-key');
    assert.match(
      requests[0]?.url ?? '',
      /training_athletic_profiles\?select=user_id&user_id=eq.user-123/,
    );
  });
});
