import type { AppErrorInput } from '@/errors/app-error.js';

export type AuthUser = {
  firstName: string | null;
  fullName: string | null;
  id: string;
  email: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  provider: string | null;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type AuthActionResult =
  | {
      error?: AppErrorInput;
      ok: true;
      message?: string;
      session?: AuthSession;
    }
  | {
      error?: AppErrorInput;
      ok: false;
      message: string;
    };

export type AuthStateListener = (session: AuthSession | null) => void;

export type AuthSubscription = {
  unsubscribe: () => void;
};

export type PasswordCredentials = {
  email: string;
  password: string;
};

export type AuthGateway = {
  getSession: () => Promise<AuthSession | null>;
  onAuthStateChange: (listener: AuthStateListener) => AuthSubscription;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signInWithPassword: (
    credentials: PasswordCredentials,
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  signUpWithPassword: (
    credentials: PasswordCredentials,
  ) => Promise<AuthActionResult>;
};
