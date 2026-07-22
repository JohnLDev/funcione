import type {
  RegistrationProfile,
  RegistrationProfileActionResult,
  RegistrationProfileGateway,
  RegistrationProfileInput,
  RegistrationProfileState,
} from './registration-profile.js';

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    return body.error?.message ?? 'Registration profile request failed.';
  } catch {
    return 'Registration profile request failed.';
  }
}

export function createApiRegistrationProfileGateway(): RegistrationProfileGateway {
  return {
    completeProfile: async (
      accessToken: string,
      profile: RegistrationProfileInput,
    ): Promise<RegistrationProfileActionResult> => {
      const response = await fetch('/api/auth/profile', {
        body: JSON.stringify(profile),
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        method: 'PUT',
      });

      if (!response.ok) {
        return {
          ok: false,
          message: await parseErrorMessage(response),
        };
      }

      const body = (await response.json()) as {
        profile: RegistrationProfile;
      };

      return {
        ok: true,
        profile: body.profile,
      };
    },
    getProfileState: async (
      accessToken: string,
    ): Promise<RegistrationProfileState> => {
      const response = await fetch('/api/auth/profile', {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      return (await response.json()) as RegistrationProfileState;
    },
  };
}
