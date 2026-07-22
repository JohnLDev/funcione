import type { AuthenticatedUser } from '../domain/authenticated-user.js';
import {
  CompleteUserProfileInputSchema,
  requiredUserProfileFields,
  type UserProfile,
} from '../domain/user-profile.js';
import type { UserProfileRepository } from './user-profile-repository.js';

export type UserProfileState = {
  completed: boolean;
  profile: UserProfile | null;
  requiredFields: typeof requiredUserProfileFields;
};

export type CompleteUserProfileResult =
  | {
      completed: true;
      profile: UserProfile;
    }
  | {
      error: {
        code: 'VALIDATION_ERROR' | 'EMAIL_MISMATCH';
        details?: Record<string, unknown>[];
        message: string;
      };
    };

export async function getUserProfileState(
  user: AuthenticatedUser,
  userProfileRepository: UserProfileRepository,
): Promise<UserProfileState> {
  const profile = await userProfileRepository.findByUserId(user.id);

  return {
    completed: Boolean(profile),
    profile,
    requiredFields: requiredUserProfileFields,
  };
}

export async function completeUserProfile(
  user: AuthenticatedUser,
  payload: unknown,
  userProfileRepository: UserProfileRepository,
): Promise<CompleteUserProfileResult> {
  const parsedProfile = CompleteUserProfileInputSchema.safeParse(payload);

  if (!parsedProfile.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration profile.',
        details: parsedProfile.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }

  if (
    user.email &&
    parsedProfile.data.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return {
      error: {
        code: 'EMAIL_MISMATCH',
        message: 'Profile email must match the authenticated account email.',
      },
    };
  }

  const profile = await userProfileRepository.upsert(user.id, parsedProfile.data);

  return {
    completed: true,
    profile,
  };
}
