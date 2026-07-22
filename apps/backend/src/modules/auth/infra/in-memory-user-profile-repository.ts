import type { UserProfileRepository } from '../application/user-profile-repository.js';
import type {
  CompleteUserProfileInput,
  UserProfile,
} from '../domain/user-profile.js';

export function createInMemoryUserProfileRepository(): UserProfileRepository {
  const profiles = new Map<string, UserProfile>();

  return {
    findByUserId: async (userId) => profiles.get(userId) ?? null,
    upsert: async (userId, profileInput: CompleteUserProfileInput) => {
      const existingProfile = profiles.get(userId);
      const now = new Date().toISOString();
      const profile: UserProfile = {
        ...profileInput,
        createdAt: existingProfile?.createdAt ?? now,
        updatedAt: now,
        userId,
      };

      profiles.set(userId, profile);

      return profile;
    },
  };
}
