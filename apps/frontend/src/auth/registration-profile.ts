import type { AppErrorInput } from '@/errors/app-error.js';

export type RegistrationProfileInput = {
  birthDate: string;
  cpf: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

export type RegistrationProfile = RegistrationProfileInput & {
  createdAt: string;
  updatedAt: string;
  userId: string;
};

export type RegistrationProfileState = {
  completed: boolean;
  profile: RegistrationProfile | null;
  requiredFields: Array<keyof RegistrationProfileInput>;
};

export type RegistrationProfileActionResult =
  | {
      ok: true;
      profile: RegistrationProfile;
    }
  | {
      error?: AppErrorInput;
      ok: false;
      message: string;
    };

export class RegistrationProfileGatewayError extends Error {
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly userMessageKey?: string;

  constructor({
    code,
    details,
    message,
    requestId,
    userMessageKey,
  }: {
    code?: string;
    details?: Record<string, unknown>;
    message: string;
    requestId?: string;
    userMessageKey?: string;
  }) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'RegistrationProfileGatewayError';
    this.requestId = requestId;
    this.userMessageKey = userMessageKey;
  }
}

export type RegistrationProfileGateway = {
  completeProfile: (
    accessToken: string,
    profile: RegistrationProfileInput,
  ) => Promise<RegistrationProfileActionResult>;
  getProfileState: (accessToken: string) => Promise<RegistrationProfileState>;
};
