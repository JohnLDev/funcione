import type {
  AuthActionResult,
  AuthGateway,
  AuthSession,
  AuthStateListener,
  PasswordCredentials,
} from './types.js';

const mockSessionStorageKey = 'funcione-mock-session';
const mockAuthScenarioStorageKey = 'funcione-mock-auth-scenario';

const listeners = new Set<AuthStateListener>();

type MockAuthScenarioResult = {
  code?: string;
  message: string;
};

type MockAuthScenario = {
  signInWithGoogle?: MockAuthScenarioResult;
  signInWithPassword?: MockAuthScenarioResult;
  signOut?: MockAuthScenarioResult;
  signUpWithPassword?: MockAuthScenarioResult;
};

function readScenario(): MockAuthScenario | null {
  const storedScenario = window.localStorage.getItem(mockAuthScenarioStorageKey);

  if (!storedScenario) {
    return null;
  }

  return JSON.parse(storedScenario) as MockAuthScenario;
}

function createScenarioError(
  scenario: MockAuthScenarioResult,
): AuthActionResult {
  return {
    error: {
      code: scenario.code ?? 'AUTH_SIGN_IN_FAILED',
      message: scenario.message,
      source: 'auth',
    },
    ok: false,
    message: scenario.message,
  };
}

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
      const scenario = readScenario();

      if (scenario?.signInWithGoogle) {
        return createScenarioError({
          code: scenario.signInWithGoogle.code ?? 'AUTH_OAUTH_FAILED',
          message: scenario.signInWithGoogle.message,
        });
      }

      const session = createMockSession('google@funcione.app', 'google');

      writeSession(session);

      return { ok: true, session };
    },
    signInWithPassword: async (credentials) => {
      const scenario = readScenario();

      if (scenario?.signInWithPassword) {
        return createScenarioError(scenario.signInWithPassword);
      }

      return signInMockUser(credentials);
    },
    signOut: async () => {
      const scenario = readScenario();

      if (scenario?.signOut) {
        return createScenarioError({
          code: scenario.signOut.code ?? 'AUTH_SIGN_OUT_FAILED',
          message: scenario.signOut.message,
        });
      }

      writeSession(null);

      return { ok: true };
    },
    signUpWithPassword: async (credentials) => {
      const scenario = readScenario();

      if (scenario?.signUpWithPassword) {
        return createScenarioError({
          code: scenario.signUpWithPassword.code ?? 'AUTH_SIGN_UP_FAILED',
          message: scenario.signUpWithPassword.message,
        });
      }

      return signInMockUser(credentials);
    },
  };
}
