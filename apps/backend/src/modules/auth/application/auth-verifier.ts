import type { AuthenticatedUser } from '../domain/authenticated-user.js';

export type AuthVerificationFailure = {
  authenticated: false;
  statusCode: 401 | 503;
  code: 'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_INVALID' | 'AUTH_PROVIDER_NOT_CONFIGURED';
  message: string;
};

export type AuthVerificationSuccess = {
  authenticated: true;
  user: AuthenticatedUser;
};

export type AuthVerificationResult =
  | AuthVerificationSuccess
  | AuthVerificationFailure;

export type AuthVerifier = (
  authorizationHeader: string | undefined,
) => Promise<AuthVerificationResult>;
