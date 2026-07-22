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
      ok: false;
      message: string;
    };

export type RegistrationProfileGateway = {
  completeProfile: (
    accessToken: string,
    profile: RegistrationProfileInput,
  ) => Promise<RegistrationProfileActionResult>;
  getProfileState: (accessToken: string) => Promise<RegistrationProfileState>;
};
