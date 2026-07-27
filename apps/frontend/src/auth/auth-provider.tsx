import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  normalizeAppError,
  normalizeUnknownError,
  translateAppError,
  type AppErrorInput,
} from '@/errors/app-error.js';
import { useAppToast } from '@/toast/use-app-toast.js';
import { createAuthGateway } from './auth-gateway.js';
import { createRegistrationProfileGateway } from './registration-profile-gateway.js';
import type {
  RegistrationProfileInput,
  RegistrationProfileState,
} from './registration-profile.js';
import { RegistrationProfileGatewayError as ProfileGatewayError } from './registration-profile.js';
import type { AuthActionResult, AuthGateway, AuthSession } from './types.js';

type AuthProviderState = {
  authMessage: string | null;
  clearAuthMessage: () => void;
  completeRegistrationProfile: (
    profile: RegistrationProfileInput,
  ) => Promise<AuthActionResult>;
  isAuthActionRunning: boolean;
  isLoadingProfile: boolean;
  isLoadingSession: boolean;
  profileState: RegistrationProfileState | null;
  session: AuthSession | null;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  signUpWithPassword: (
    profile: RegistrationProfileInput,
    password: string,
  ) => Promise<AuthActionResult>;
};

export const AuthProviderContext = createContext<AuthProviderState | null>(null);

const authGateway: AuthGateway = createAuthGateway();
const registrationProfileGateway = createRegistrationProfileGateway();

function toRegistrationProfileInput(
  profile: RegistrationProfileInput,
): RegistrationProfileInput {
  return {
    birthDate: profile.birthDate,
    cpf: profile.cpf,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phoneNumber: profile.phoneNumber,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { showToast } = useAppToast();
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthActionRunning, setIsAuthActionRunning] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [profileState, setProfileState] =
    useState<RegistrationProfileState | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  const showMappedError = useCallback(
    (input: AppErrorInput) => {
      const normalizedError = normalizeAppError(input);
      const message = translateAppError(normalizedError, t);

      setAuthMessage(message);
      showToast({
        message,
        severity: normalizedError.severity,
        source: normalizedError.source,
      });

      return message;
    },
    [showToast, t],
  );

  const showUnknownMappedError = useCallback(
    (error: unknown, fallback: Omit<AppErrorInput, 'message'>) => {
      const normalizedError = normalizeUnknownError(error, fallback);
      const message = translateAppError(normalizedError, t);

      setAuthMessage(message);
      showToast({
        message,
        severity: normalizedError.severity,
        source: normalizedError.source,
      });

      return message;
    },
    [showToast, t],
  );

  useEffect(() => {
    let active = true;

    authGateway.getSession().then((currentSession) => {
      if (active) {
        setSession(currentSession);
        setIsLoadingSession(false);
      }
    });

    const subscription = authGateway.onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setIsLoadingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!session) {
      setProfileState(null);
      setIsLoadingProfile(false);
      return () => {
        active = false;
      };
    }

    setIsLoadingProfile(true);
    registrationProfileGateway
      .getProfileState(session.accessToken)
      .then((nextProfileState) => {
        if (active) {
          setProfileState(nextProfileState);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          if (error instanceof ProfileGatewayError) {
            showMappedError({
              code: error.code ?? 'REGISTRATION_PROFILE_REQUEST_FAILED',
              details: error.details,
              fallbackKey: 'errors.registration.requestFailed',
              message: error.message,
              requestId: error.requestId,
              source: 'registration',
              userMessageKey: error.userMessageKey,
            });
          } else {
            showUnknownMappedError(error, {
              code: 'REGISTRATION_PROFILE_REQUEST_FAILED',
              fallbackKey: 'errors.registration.requestFailed',
              source: 'registration',
            });
          }
          setProfileState(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session, showMappedError, showUnknownMappedError]);

  const runAuthAction = useCallback(
    async (action: () => Promise<AuthActionResult>) => {
      setAuthMessage(null);
      setIsAuthActionRunning(true);

      try {
        const result = await action();

        if (!result.ok) {
          showMappedError({
            ...(result.error ?? {}),
            fallbackKey: result.error?.fallbackKey ?? 'errors.common.unexpected',
            message: result.error?.message ?? result.message,
            source: result.error?.source ?? 'auth',
          });
        } else if (result.message) {
          showMappedError({
            ...(result.error ?? {}),
            fallbackKey:
              result.error?.fallbackKey ??
              'errors.auth.emailConfirmationRequired',
            message: result.error?.message ?? result.message,
            severity: result.error?.severity ?? 'info',
            source: result.error?.source ?? 'auth',
          });
        }

        return result;
      } catch (error) {
        const errorInput: AppErrorInput = {
          fallbackKey: 'errors.common.unexpected',
          message: error instanceof Error ? error.message : null,
          source: 'unknown',
        };
        const message = showUnknownMappedError(error, {
          fallbackKey: 'errors.common.unexpected',
          source: 'unknown',
        });

        return {
          error: errorInput,
          ok: false as const,
          message,
        };
      } finally {
        setIsAuthActionRunning(false);
      }
    },
    [showMappedError, showUnknownMappedError],
  );

  const completeRegistrationProfile = useCallback(
    async (profile: RegistrationProfileInput): Promise<AuthActionResult> => {
      if (!session) {
        const error: AppErrorInput = {
          code: 'REGISTRATION_PROFILE_AUTH_REQUIRED',
          message: 'You must be authenticated to complete registration.',
          source: 'registration',
        };
        const message = showMappedError(error);

        return {
          error,
          ok: false,
          message,
        };
      }

      return runAuthAction(async () => {
        const safeProfile = toRegistrationProfileInput(profile);
        const result = await registrationProfileGateway.completeProfile(
          session.accessToken,
          safeProfile,
        );

        if (!result.ok) {
          return result;
        }

        setProfileState({
          completed: true,
          profile: result.profile,
          requiredFields: [
            'firstName',
            'lastName',
            'cpf',
            'birthDate',
            'phoneNumber',
            'email',
          ],
        });

        return { ok: true };
      });
    },
    [runAuthAction, session, showMappedError],
  );

  const value = useMemo<AuthProviderState>(
    () => ({
      authMessage,
      clearAuthMessage: () => setAuthMessage(null),
      completeRegistrationProfile,
      isAuthActionRunning,
      isLoadingProfile,
      isLoadingSession,
      profileState,
      session,
      signInWithGoogle: () => runAuthAction(authGateway.signInWithGoogle),
      signInWithPassword: (email, password) =>
        runAuthAction(() =>
          authGateway.signInWithPassword({
            email,
            password,
          }),
        ),
      signOut: () => runAuthAction(authGateway.signOut),
      signUpWithPassword: (profile, password) =>
        runAuthAction(async () => {
          const safeProfile = toRegistrationProfileInput(profile);
          const result = await authGateway.signUpWithPassword({
            email: safeProfile.email,
            password,
          });

          if (!result.ok || !result.session) {
            return result;
          }

          const profileResult = await registrationProfileGateway.completeProfile(
            result.session.accessToken,
            safeProfile,
          );

          if (!profileResult.ok) {
            return profileResult;
          }

          setProfileState({
            completed: true,
            profile: profileResult.profile,
            requiredFields: [
              'firstName',
              'lastName',
              'cpf',
              'birthDate',
              'phoneNumber',
              'email',
            ],
          });

          return result;
        }),
    }),
    [
      authMessage,
      completeRegistrationProfile,
      isAuthActionRunning,
      isLoadingProfile,
      isLoadingSession,
      profileState,
      runAuthAction,
      session,
    ],
  );

  return (
    <AuthProviderContext.Provider value={value}>
      {children}
    </AuthProviderContext.Provider>
  );
}
