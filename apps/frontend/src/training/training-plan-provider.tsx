import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useAuth } from '@/auth/use-auth.js';
import {
  normalizeAppError,
  translateAppError,
  type AppErrorInput,
} from '@/errors/app-error.js';
import { useAppToast } from '@/toast/use-app-toast.js';
import { useTranslation } from 'react-i18next';
import { createTrainingPlanGateway } from './training-plan-gateway.js';
import {
  TrainingPlanGatewayError,
  type MonthlyTrainingPlanRequest,
  type MonthlyTrainingPlanState,
  type TrainingPlanActionResult,
} from './training-plan.js';
import {
  clearCachedTrainingPlanState,
  readCachedTrainingPlanState,
  writeCachedTrainingPlanState,
} from './training-plan-cache.js';

type ReloadOptions = {
  force?: boolean;
};

type TrainingPlanProviderState = {
  createMonthlyPlan: (
    payload: MonthlyTrainingPlanRequest,
  ) => Promise<TrainingPlanActionResult>;
  errorMessage: string | null;
  isGenerating: boolean;
  isLoading: boolean;
  reload: (options?: ReloadOptions) => Promise<void>;
  state: MonthlyTrainingPlanState | null;
};

export const TrainingPlanContext =
  createContext<TrainingPlanProviderState | null>(null);

const trainingPlanGateway = createTrainingPlanGateway();
const authenticationErrorCodes = new Set([
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_MISSING',
]);
const generationPollingIntervalMs = 1_500;

function getUnknownErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null;
}

function createTrainingErrorInput(
  error: unknown,
  fallbackCode = 'TRAINING_PLAN_REQUEST_FAILED',
): AppErrorInput {
  if (error instanceof TrainingPlanGatewayError) {
    return {
      code: error.code ?? fallbackCode,
      details: error.details,
      fallbackKey: 'errors.training.requestFailed',
      message: error.message,
      requestId: error.requestId,
      source:
        error.code && authenticationErrorCodes.has(error.code)
          ? 'auth'
          : 'training',
      userMessageKey: error.userMessageKey,
    };
  }

  return {
    code: fallbackCode,
    fallbackKey: 'errors.training.requestFailed',
    message: getUnknownErrorMessage(error),
    source: 'training',
  };
}

export function TrainingPlanProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { showToast } = useAppToast();
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<MonthlyTrainingPlanState | null>(null);
  const pollingTimeoutRef = useRef<number | null>(null);

  const clearGenerationPolling = useCallback(() => {
    if (pollingTimeoutRef.current !== null) {
      window.clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const showTrainingError = useCallback(
    (input: AppErrorInput) => {
      const normalizedError = normalizeAppError(input);
      const message = translateAppError(normalizedError, t);

      setErrorMessage(message);
      showToast({
        message,
        severity: normalizedError.severity,
        source: normalizedError.source,
      });

      return message;
    },
    [showToast, t],
  );

  const pollGeneration = useCallback(
    (accessToken: string, userId: string, generationId: string) => {
      clearGenerationPolling();

      const runPoll = async () => {
        try {
          const result = await trainingPlanGateway.getGenerationStatus(
            accessToken,
            generationId,
          );

          if (result.generation.status === 'completed' && result.plan) {
            const nextState = {
              activePlan: result.plan,
              athleticProfile: null,
              canGenerate: false,
              nextGenerationAvailableAt:
                result.plan.availableForRegenerationAt,
              pendingGeneration: null,
            };

            setState(nextState);
            setErrorMessage(null);
            writeCachedTrainingPlanState(userId, nextState);
            clearGenerationPolling();
            return;
          }

          if (result.generation.status === 'failed') {
            setState((currentState) => ({
              activePlan: null,
              athleticProfile: currentState?.athleticProfile ?? null,
              canGenerate: true,
              nextGenerationAvailableAt: null,
              pendingGeneration: null,
            }));
            showTrainingError({
              code: 'TRAINING_GENERATION_FAILED',
              fallbackKey: 'errors.training.generationFailed',
              message: result.generation.errorMessage,
              source: 'training',
            });
            clearCachedTrainingPlanState(userId);
            clearGenerationPolling();
            return;
          }

          setState((currentState) => ({
            activePlan: null,
            athleticProfile: currentState?.athleticProfile ?? null,
            canGenerate: false,
            nextGenerationAvailableAt: null,
            pendingGeneration: result.generation,
          }));
          setErrorMessage(null);
          clearCachedTrainingPlanState(userId);
          pollingTimeoutRef.current = window.setTimeout(
            runPoll,
            generationPollingIntervalMs,
          );
        } catch (error) {
          showTrainingError(
            createTrainingErrorInput(
              error,
              error instanceof TrainingPlanGatewayError &&
                error.code === 'TRAINING_GENERATION_UNAVAILABLE'
                ? 'TRAINING_GENERATION_UNAVAILABLE'
                : 'TRAINING_PLAN_REQUEST_FAILED',
            ),
          );
          clearGenerationPolling();
        }
      };

      void runPoll();
    },
    [clearGenerationPolling, showTrainingError],
  );

  const reload = useCallback(async (options?: ReloadOptions) => {
    if (!session) {
      clearGenerationPolling();
      setState(null);
      setIsLoading(false);
      return;
    }

    if (!options?.force) {
      const cachedState = readCachedTrainingPlanState(session.user.id);

      if (cachedState) {
        if (cachedState.pendingGeneration) {
          clearCachedTrainingPlanState(session.user.id);
        } else {
          setState(cachedState);
          setErrorMessage(null);
          setIsLoading(false);
          return;
        }
      }
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextState = await trainingPlanGateway.getActivePlan(
        session.accessToken,
      );

      setState(nextState);
      if (nextState.pendingGeneration) {
        clearCachedTrainingPlanState(session.user.id);
        pollGeneration(
          session.accessToken,
          session.user.id,
          nextState.pendingGeneration.id,
        );
      } else {
        writeCachedTrainingPlanState(session.user.id, nextState);
      }
    } catch (error) {
      showTrainingError(createTrainingErrorInput(error));
    } finally {
      setIsLoading(false);
    }
  }, [clearGenerationPolling, pollGeneration, session, showTrainingError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () => () => {
      clearGenerationPolling();
    },
    [clearGenerationPolling],
  );

  const createMonthlyPlan = useCallback(
    async (payload: MonthlyTrainingPlanRequest) => {
      if (!session) {
        const error: AppErrorInput = {
          code: 'AUTH_TOKEN_MISSING',
          message: 'Authentication token is required.',
          source: 'auth',
        };
        const message = showTrainingError(error);

        return {
          code: 'AUTH_TOKEN_MISSING',
          error,
          message,
          ok: false as const,
        };
      }

      setIsGenerating(true);
      setErrorMessage(null);

      try {
        const result = await trainingPlanGateway.createMonthlyPlan(
          session.accessToken,
          payload,
        );

        if (result.ok) {
          const nextState = {
            activePlan: null,
            athleticProfile: state?.athleticProfile ?? null,
            canGenerate: false,
            nextGenerationAvailableAt: null,
            pendingGeneration: result.generation,
          };

          setState(nextState);
          clearCachedTrainingPlanState(session.user.id);
          pollGeneration(
            session.accessToken,
            session.user.id,
            result.generation.id,
          );
        } else {
          const message = showTrainingError({
            ...(result.error ?? {}),
            code: result.error?.code ?? result.code ?? 'TRAINING_PLAN_REQUEST_FAILED',
            fallbackKey: 'errors.training.requestFailed',
            message: result.error?.message ?? result.message,
            source: result.error?.source ?? 'training',
          });

          return {
            ...result,
            message,
          };
        }

        return result;
      } catch (error) {
        const errorInput = createTrainingErrorInput(error);
        const message = showTrainingError(errorInput);

        return {
          code: errorInput.code,
          error: errorInput,
          message,
          ok: false as const,
        };
      } finally {
        setIsGenerating(false);
      }
    },
    [pollGeneration, session, showTrainingError, state?.athleticProfile],
  );

  const value = useMemo(
    () => ({
      createMonthlyPlan,
      errorMessage,
      isGenerating,
      isLoading,
      reload,
      state,
    }),
    [createMonthlyPlan, errorMessage, isGenerating, isLoading, reload, state],
  );

  return (
    <TrainingPlanContext.Provider value={value}>
      {children}
    </TrainingPlanContext.Provider>
  );
}
