import type {
  CompleteUserProfileInput,
  UserProfile,
} from '../domain/user-profile.js';

export type UserProfileRepository = {
  findByUserId: (userId: string) => Promise<UserProfile | null>;
  upsert: (
    userId: string,
    profile: CompleteUserProfileInput,
  ) => Promise<UserProfile>;
};
