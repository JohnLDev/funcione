import type { UserProfileRepository } from './user-profile-repository.js';

export type UserProfileRepositoryFactory = (
  accessToken: string,
) => UserProfileRepository;
