import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseUserProfileRepository } from './supabase-user-profile-repository.js';

const profileRow = {
  birth_date: '1994-08-20',
  cpf: '52998224725',
  created_at: '2026-07-23T12:00:00.000Z',
  email: 'athlete@funcione.app',
  first_name: 'Joao',
  last_name: 'Silva',
  phone_number: '11999999999',
  updated_at: '2026-07-23T12:00:00.000Z',
  user_id: 'user-123',
};

describe('Supabase user profile repository', () => {
  it('uses the caller JWT and maps profile rows for lookup and upsert', async () => {
    const requests: Array<{ body: unknown; headers: Headers; url: string }> = [];
    const repository = createSupabaseUserProfileRepository({
      accessToken: 'user-jwt',
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : null,
          headers: request.headers,
          url: request.url,
        });

        return Response.json(profileRow);
      },
      supabasePublishableKey: 'publishable-key',
      supabaseUrl: 'https://project.supabase.co',
    });

    const found = await repository.findByUserId('user-123');
    const saved = await repository.upsert('user-123', {
      birthDate: '1994-08-20',
      cpf: '52998224725',
      email: 'athlete@funcione.app',
      firstName: 'Joao',
      lastName: 'Silva',
      phoneNumber: '11999999999',
    });

    assert.deepEqual(found, {
      birthDate: '1994-08-20',
      cpf: '52998224725',
      createdAt: '2026-07-23T12:00:00.000Z',
      email: 'athlete@funcione.app',
      firstName: 'Joao',
      lastName: 'Silva',
      phoneNumber: '11999999999',
      updatedAt: '2026-07-23T12:00:00.000Z',
      userId: 'user-123',
    });
    assert.deepEqual(saved, found);
    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.headers.get('authorization'), 'Bearer user-jwt');
    assert.match(requests[0]?.url ?? '', /user_profiles\?select=\*/);
    assert.match(requests[0]?.url ?? '', /user_id=eq.user-123/);
    const upsertRow = requests[1]?.body as Record<string, unknown>;
    assert.deepEqual(
      { ...upsertRow, updated_at: undefined },
      {
      birth_date: '1994-08-20',
      cpf: '52998224725',
      email: 'athlete@funcione.app',
      first_name: 'Joao',
      last_name: 'Silva',
      phone_number: '11999999999',
      updated_at: undefined,
      user_id: 'user-123',
      },
    );
    assert.match(String(upsertRow.updated_at), /^\d{4}-\d{2}-\d{2}T/);
    assert.match(requests[1]?.url ?? '', /on_conflict=user_id/);
    assert.match(
      requests[1]?.headers.get('prefer') ?? '',
      /resolution=merge-duplicates,\s*return=representation/,
    );
  });
});
