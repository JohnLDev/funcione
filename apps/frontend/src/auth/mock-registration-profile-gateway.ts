import type {
  RegistrationProfile,
  RegistrationProfileActionResult,
  RegistrationProfileGateway,
  RegistrationProfileInput,
  RegistrationProfileState,
} from './registration-profile.js';

const profileStorageKey = 'funcione-mock-registration-profiles';

function readProfiles(): Record<string, RegistrationProfile> {
  const storedProfiles = window.localStorage.getItem(profileStorageKey);

  if (!storedProfiles) {
    return {};
  }

  return JSON.parse(storedProfiles) as Record<string, RegistrationProfile>;
}

function writeProfiles(profiles: Record<string, RegistrationProfile>) {
  window.localStorage.setItem(profileStorageKey, JSON.stringify(profiles));
}

function getRequiredFields(): RegistrationProfileState['requiredFields'] {
  return ['firstName', 'lastName', 'cpf', 'birthDate', 'phoneNumber', 'email'];
}

export function createMockRegistrationProfileGateway(): RegistrationProfileGateway {
  return {
    completeProfile: async (
      accessToken: string,
      profileInput: RegistrationProfileInput,
    ): Promise<RegistrationProfileActionResult> => {
      const profiles = readProfiles();
      const existingProfile = profiles[accessToken];
      const now = new Date().toISOString();
      const profile: RegistrationProfile = {
        ...profileInput,
        createdAt: existingProfile?.createdAt ?? now,
        updatedAt: now,
        userId: accessToken,
      };

      writeProfiles({
        ...profiles,
        [accessToken]: profile,
      });

      return {
        ok: true,
        profile,
      };
    },
    getProfileState: async (accessToken): Promise<RegistrationProfileState> => {
      const profile = readProfiles()[accessToken] ?? null;

      return {
        completed: Boolean(profile),
        profile,
        requiredFields: getRequiredFields(),
      };
    },
  };
}
