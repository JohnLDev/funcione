export type AppErrorSource =
  | 'auth'
  | 'registration'
  | 'training'
  | 'network'
  | 'unknown';

export type AppErrorSeverity = 'error' | 'warning' | 'info' | 'success';

export type NormalizedAppError = {
  code?: string;
  details?: Record<string, unknown>;
  debugMessage?: string;
  key: string;
  requestId?: string;
  severity: AppErrorSeverity;
  source: AppErrorSource;
};

export type AppErrorInput = {
  code?: string;
  details?: Record<string, unknown>;
  fallbackKey?: string;
  message?: string | null;
  requestId?: string;
  severity?: AppErrorSeverity;
  source?: AppErrorSource;
  userMessageKey?: string;
};

type ErrorMapping = {
  code: string;
  key: string;
  severity?: AppErrorSeverity;
  source: AppErrorSource;
};

type MessageMapping = Omit<ErrorMapping, 'code'> & {
  code?: string;
  pattern: RegExp;
};

const codeMappings: ErrorMapping[] = [
  {
    code: 'AUTH_INVALID_CREDENTIALS',
    key: 'errors.auth.invalidCredentials',
    source: 'auth',
  },
  {
    code: 'AUTH_SESSION_EXPIRED',
    key: 'errors.auth.sessionExpired',
    source: 'auth',
  },
  {
    code: 'AUTH_TOKEN_INVALID',
    key: 'errors.auth.sessionExpired',
    source: 'auth',
  },
  {
    code: 'AUTH_TOKEN_MISSING',
    key: 'errors.auth.sessionExpired',
    source: 'auth',
  },
  {
    code: 'AUTH_SUPABASE_NOT_CONFIGURED',
    key: 'errors.auth.supabaseNotConfigured',
    source: 'auth',
  },
  {
    code: 'AUTH_EMAIL_CONFIRMATION_REQUIRED',
    key: 'errors.auth.emailConfirmationRequired',
    severity: 'info',
    source: 'auth',
  },
  {
    code: 'AUTH_OAUTH_FAILED',
    key: 'errors.auth.socialLoginFailed',
    source: 'auth',
  },
  {
    code: 'AUTH_SIGN_IN_FAILED',
    key: 'errors.auth.signInFailed',
    source: 'auth',
  },
  {
    code: 'AUTH_SIGN_OUT_FAILED',
    key: 'errors.auth.signOutFailed',
    source: 'auth',
  },
  {
    code: 'AUTH_SIGN_UP_FAILED',
    key: 'errors.auth.signUpFailed',
    source: 'auth',
  },
  {
    code: 'REGISTRATION_PROFILE_REQUEST_FAILED',
    key: 'errors.registration.requestFailed',
    source: 'registration',
  },
  {
    code: 'REGISTRATION_PROFILE_INVALID_PAYLOAD',
    key: 'errors.registration.invalidPayload',
    source: 'registration',
  },
  {
    code: 'REGISTRATION_PROFILE_AUTH_REQUIRED',
    key: 'errors.registration.authRequired',
    source: 'registration',
  },
  {
    code: 'TRAINING_PLAN_REQUEST_FAILED',
    key: 'errors.training.requestFailed',
    source: 'training',
  },
  {
    code: 'TRAINING_GENERATION_FAILED',
    key: 'errors.training.generationFailed',
    source: 'training',
  },
  {
    code: 'TRAINING_MONTHLY_PLAN_ALREADY_ACTIVE',
    key: 'errors.training.monthlyPlanAlreadyActive',
    severity: 'warning',
    source: 'training',
  },
  {
    code: 'TRAINING_GENERATION_UNAVAILABLE',
    key: 'errors.training.generationUnavailable',
    source: 'training',
  },
  {
    code: 'NETWORK_REQUEST_FAILED',
    key: 'errors.network.requestFailed',
    source: 'network',
  },
  {
    code: 'COMMON_UNEXPECTED',
    key: 'errors.common.unexpected',
    source: 'unknown',
  },
];

const messageMappings: MessageMapping[] = [
  {
    code: 'AUTH_INVALID_CREDENTIALS',
    key: 'errors.auth.invalidCredentials',
    pattern: /invalid login credentials/i,
    source: 'auth',
  },
  {
    code: 'AUTH_SUPABASE_NOT_CONFIGURED',
    key: 'errors.auth.supabaseNotConfigured',
    pattern: /supabase authentication is not configured/i,
    source: 'auth',
  },
  {
    code: 'AUTH_EMAIL_CONFIRMATION_REQUIRED',
    key: 'errors.auth.emailConfirmationRequired',
    pattern: /check your email to confirm your account|email not confirmed/i,
    severity: 'info',
    source: 'auth',
  },
  {
    code: 'REGISTRATION_PROFILE_AUTH_REQUIRED',
    key: 'errors.registration.authRequired',
    pattern: /must be authenticated to complete registration/i,
    source: 'registration',
  },
  {
    code: 'REGISTRATION_PROFILE_INVALID_PAYLOAD',
    key: 'errors.registration.invalidPayload',
    pattern: /must not have additional properties|body must not/i,
    source: 'registration',
  },
  {
    code: 'REGISTRATION_PROFILE_REQUEST_FAILED',
    key: 'errors.registration.requestFailed',
    pattern: /registration profile request failed/i,
    source: 'registration',
  },
  {
    code: 'AUTH_SESSION_EXPIRED',
    key: 'errors.auth.sessionExpired',
    pattern: /authentication token is required|authentication token is invalid/i,
    source: 'auth',
  },
  {
    code: 'TRAINING_MONTHLY_PLAN_ALREADY_ACTIVE',
    key: 'errors.training.monthlyPlanAlreadyActive',
    pattern: /monthly training plan is already active/i,
    severity: 'warning',
    source: 'training',
  },
  {
    code: 'TRAINING_GENERATION_UNAVAILABLE',
    key: 'errors.training.generationUnavailable',
    pattern: /generation not found/i,
    source: 'training',
  },
  {
    code: 'NETWORK_REQUEST_FAILED',
    key: 'errors.network.requestFailed',
    pattern: /network|failed to fetch|connection reset/i,
    source: 'network',
  },
  {
    code: 'TRAINING_PLAN_REQUEST_FAILED',
    key: 'errors.training.requestFailed',
    pattern: /training plan request failed|atualizar o plano de treino/i,
    source: 'training',
  },
];

function normalizeTechnicalMessage(message?: string | null) {
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

export function normalizeAppError(input: AppErrorInput): NormalizedAppError {
  const technicalMessage = normalizeTechnicalMessage(input.message);
  const codeMapping = input.code
    ? codeMappings.find((mapping) => mapping.code === input.code)
    : undefined;

  if (codeMapping) {
    return {
      code: codeMapping.code,
      details: input.details,
      debugMessage: technicalMessage ?? undefined,
      key: input.userMessageKey ?? codeMapping.key,
      requestId: input.requestId,
      severity: input.severity ?? codeMapping.severity ?? 'error',
      source: input.source ?? codeMapping.source,
    };
  }

  const messageMapping = technicalMessage
    ? messageMappings.find((mapping) => mapping.pattern.test(technicalMessage))
    : undefined;

  if (messageMapping) {
    return {
      code: messageMapping.code ?? input.code,
      details: input.details,
      debugMessage: technicalMessage ?? undefined,
      key: input.userMessageKey ?? messageMapping.key,
      requestId: input.requestId,
      severity: input.severity ?? messageMapping.severity ?? 'error',
      source: input.source ?? messageMapping.source,
    };
  }

  return {
    code: input.code,
    details: input.details,
    debugMessage: technicalMessage ?? undefined,
    key: input.userMessageKey ?? input.fallbackKey ?? 'errors.common.unexpected',
    requestId: input.requestId,
    severity: input.severity ?? 'error',
    source: input.source ?? 'unknown',
  };
}

export function normalizeUnknownError(
  error: unknown,
  fallback?: Omit<AppErrorInput, 'message'>,
): NormalizedAppError {
  return normalizeAppError({
    ...fallback,
    message: error instanceof Error ? error.message : null,
  });
}

export function translateAppError(
  error: NormalizedAppError,
  t: (key: string) => unknown,
) {
  return String(t(error.key));
}
