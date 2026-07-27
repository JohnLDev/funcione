export { authRoutes, type AuthRoutesOptions } from './http/auth-routes.js';
export { extractBearerToken } from './application/bearer-token.js';
export { createInMemoryUserProfileRepository } from './infra/in-memory-user-profile-repository.js';
export {
  createSupabaseAuthVerifier,
  type SupabaseAuthConfig,
} from './infra/supabase-auth-verifier.js';
export {
  createSupabaseUserProfileRepository,
  type SupabaseUserProfileRepositoryConfig,
} from './infra/supabase-user-profile-repository.js';
export type { UserProfileRepository } from './application/user-profile-repository.js';
export type { UserProfileRepositoryFactory } from './application/user-profile-repository-factory.js';
export type {
  AuthVerifier,
  AuthVerificationFailure,
  AuthVerificationResult,
  AuthVerificationSuccess,
} from './application/auth-verifier.js';
export type { AuthenticatedUser } from './domain/authenticated-user.js';
export type {
  CompleteUserProfileInput,
  RequiredUserProfileField,
  UserProfile,
} from './domain/user-profile.js';
