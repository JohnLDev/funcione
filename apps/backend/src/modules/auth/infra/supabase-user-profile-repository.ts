import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserProfileRepository } from '../application/user-profile-repository.js';
import type {
  CompleteUserProfileInput,
  UserProfile,
} from '../domain/user-profile.js';

export type SupabaseUserProfileRepositoryConfig = {
  accessToken: string;
  supabasePublishableKey: string;
  supabaseUrl: string;
};

type UserProfileRow = {
  birth_date: string;
  cpf: string;
  created_at: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  updated_at: string;
  user_id: string;
};

function createUserScopedClient(
  config: SupabaseUserProfileRepositoryConfig,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  });
}

function toProfile(row: UserProfileRow): UserProfile {
  return {
    birthDate: row.birth_date,
    cpf: row.cpf,
    createdAt: row.created_at,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function createSupabaseUserProfileRepository(
  config: SupabaseUserProfileRepositoryConfig,
): UserProfileRepository {
  const client = createUserScopedClient(config);

  return {
    findByUserId: async (userId) => {
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<UserProfileRow>();

      if (error) {
        throw new Error(error.message);
      }

      return data ? toProfile(data) : null;
    },
    upsert: async (userId, profile: CompleteUserProfileInput) => {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('user_profiles')
        .upsert(
          {
            birth_date: profile.birthDate,
            cpf: profile.cpf,
            email: profile.email,
            first_name: profile.firstName,
            last_name: profile.lastName,
            phone_number: profile.phoneNumber,
            updated_at: now,
            user_id: userId,
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single<UserProfileRow>();

      if (error) {
        throw new Error(error.message);
      }

      return toProfile(data);
    },
  };
}
