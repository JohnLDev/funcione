import { toApiUrl, type ApiUrlOptions } from '../api/api-url.js';
import type {
  RegistrationProfile,
  RegistrationProfileActionResult,
  RegistrationProfileGateway,
  RegistrationProfileInput,
  RegistrationProfileState,
} from './registration-profile.js';
import { RegistrationProfileGatewayError as ProfileGatewayError } from './registration-profile.js';

type ApiErrorResponse = {
  error?: {
    code?: string;
    details?: Record<string, unknown>;
    message?: string;
    requestId?: string;
    userMessageKey?: string;
  };
};

type ParsedRegistrationError = {
  code?: string;
  details?: Record<string, unknown>;
  message: string;
  requestId?: string;
  userMessageKey?: string;
};

export type ApiRegistrationProfileGatewayOptions = ApiUrlOptions;

async function parseApiError(response: Response): Promise<ParsedRegistrationError> {
  try {
    const body = (await response.json()) as ApiErrorResponse;

    return {
      code: body.error?.code,
      details: body.error?.details,
      message: body.error?.message ?? 'Registration profile request failed.',
      requestId: body.error?.requestId,
      userMessageKey: body.error?.userMessageKey,
    };
  } catch {
    return { message: 'Registration profile request failed.' };
  }
}

export function createApiRegistrationProfileGateway(
  options: ApiRegistrationProfileGatewayOptions = {},
): RegistrationProfileGateway {
  return {
    completeProfile: async (
      accessToken: string,
      profile: RegistrationProfileInput,
    ): Promise<RegistrationProfileActionResult> => {
      const requestBody: RegistrationProfileInput = {
        birthDate: profile.birthDate,
        cpf: profile.cpf,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
      };
      const response = await fetch(toApiUrl('/api/auth/profile', options), {
        body: JSON.stringify(requestBody),
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        method: 'PUT',
      });

      if (!response.ok) {
        const error = await parseApiError(response);

        return {
          error: {
            code: error.code ?? 'REGISTRATION_PROFILE_REQUEST_FAILED',
            details: error.details,
            message: error.message,
            requestId: error.requestId,
            source: 'registration',
            userMessageKey: error.userMessageKey,
          },
          ok: false,
          message: error.message,
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
      const response = await fetch(toApiUrl('/api/auth/profile', options), {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await parseApiError(response);

        throw new ProfileGatewayError({
          code: error.code ?? 'REGISTRATION_PROFILE_REQUEST_FAILED',
          details: error.details,
          message: error.message,
          requestId: error.requestId,
          userMessageKey: error.userMessageKey,
        });
      }

      return (await response.json()) as RegistrationProfileState;
    },
  };
}
