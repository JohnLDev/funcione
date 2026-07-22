import type {
  AuthActionResult,
  AuthGateway,
  AuthSession,
  AuthStateListener,
  PasswordCredentials,
} from './types.js';

const mockSessionStorageKey = 'funcione-mock-session';

const listeners = new Set<AuthStateListener>();

function readSession(): AuthSession | null {
  window.localStorage.removeItem(mockSessionStorageKey);

  return null;
}

function writeSession(session: AuthSession | null) {
  if (session) {
    window.localStorage.setItem(mockSessionStorageKey, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(mockSessionStorageKey);
  }

  listeners.forEach((listener) => listener(session));
}

function createMockSession(
  email: string,
  provider: 'email' | 'google',
): AuthSession {
  const encodedEmail = window.btoa(email);

  return {
    accessToken: `${provider}-${encodedEmail}-mock-token`,
    user: {
      firstName: provider === 'google' ? 'Google' : null,
      fullName: provider === 'google' ? 'Google Atleta' : null,
      id: `${provider}-${encodedEmail}-mock-user`,
      email,
      lastName: provider === 'google' ? 'Atleta' : null,
      phoneNumber: null,
      provider,
    },
  };
}

function signInMockUser(credentials: PasswordCredentials): AuthActionResult {
  const session = createMockSession(credentials.email, 'email');

  writeSession(session);

  return { ok: true, session };
}

export function createMockAuthGateway(): AuthGateway {
  return {
    getSession: async () => readSession(),
    onAuthStateChange: (listener) => {
      listeners.add(listener);

      return {
        unsubscribe: () => listeners.delete(listener),
      };
    },
    signInWithGoogle: async () => {
      const session = createMockSession('google@funcione.app', 'google');

      writeSession(session);

      return { ok: true, session };
    },
    signInWithPassword: async (credentials) => signInMockUser(credentials),
    signOut: async () => {
      writeSession(null);

      return { ok: true };
    },
    signUpWithPassword: async (credentials) => signInMockUser(credentials),
  };
}
