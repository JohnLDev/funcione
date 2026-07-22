import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { createAuthGateway } from './auth-gateway.js';
import { createRegistrationProfileGateway } from './registration-profile-gateway.js';
import type {
  RegistrationProfileInput,
  RegistrationProfileState,
} from './registration-profile.js';
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

export function AuthProvider({ children }: PropsWithChildren) {
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthActionRunning, setIsAuthActionRunning] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [profileState, setProfileState] =
    useState<RegistrationProfileState | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

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
          setAuthMessage(
            error instanceof Error
              ? error.message
              : 'Registration profile request failed.',
          );
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
  }, [session]);

  const runAuthAction = useCallback(
    async (action: () => Promise<AuthActionResult>) => {
      setAuthMessage(null);
      setIsAuthActionRunning(true);

      try {
        const result = await action();

        if (!result.ok || result.message) {
          setAuthMessage(result.message ?? null);
        }

        return result;
      } finally {
        setIsAuthActionRunning(false);
      }
    },
    [],
  );

  const completeRegistrationProfile = useCallback(
    async (profile: RegistrationProfileInput): Promise<AuthActionResult> => {
      if (!session) {
        return {
          ok: false,
          message: 'You must be authenticated to complete registration.',
        };
      }

      return runAuthAction(async () => {
        const result = await registrationProfileGateway.completeProfile(
          session.accessToken,
          profile,
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
    [runAuthAction, session],
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
          const result = await authGateway.signUpWithPassword({
            email: profile.email,
            password,
          });

          if (!result.ok || !result.session) {
            return result;
          }

          const profileResult = await registrationProfileGateway.completeProfile(
            result.session.accessToken,
            profile,
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
