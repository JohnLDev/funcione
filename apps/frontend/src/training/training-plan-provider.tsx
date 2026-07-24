import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useAuth } from '@/auth/use-auth.js';
import { useTranslation } from 'react-i18next';
import { createTrainingPlanGateway } from './training-plan-gateway.js';
import type {
  MonthlyTrainingPlanRequest,
  MonthlyTrainingPlanState,
  TrainingPlanActionResult,
} from './training-plan.js';

type TrainingPlanProviderState = {
  createMonthlyPlan: (
    payload: MonthlyTrainingPlanRequest,
  ) => Promise<TrainingPlanActionResult>;
  errorMessage: string | null;
  isGenerating: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
  state: MonthlyTrainingPlanState | null;
};

export const TrainingPlanContext =
  createContext<TrainingPlanProviderState | null>(null);

const trainingPlanGateway = createTrainingPlanGateway();

export function TrainingPlanProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<MonthlyTrainingPlanState | null>(null);

  const reload = useCallback(async () => {
    if (!session) {
      setState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setState(await trainingPlanGateway.getActivePlan(session.accessToken));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('training.errors.requestFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [session, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createMonthlyPlan = useCallback(
    async (payload: MonthlyTrainingPlanRequest) => {
      if (!session) {
        return { message: 'You must be authenticated.', ok: false as const };
      }

      setIsGenerating(true);
      setErrorMessage(null);

      try {
        const result = await trainingPlanGateway.createMonthlyPlan(
          session.accessToken,
          payload,
        );

        if (result.ok) {
          setState({
            activePlan: result.plan,
            athleticProfile: null,
            canGenerate: false,
            nextGenerationAvailableAt: result.plan.availableForRegenerationAt,
          });
        } else {
          setErrorMessage(result.message);
        }

        return result;
      } catch {
        const message = t('training.errors.requestFailed');

        setErrorMessage(message);

        return { message, ok: false as const };
      } finally {
        setIsGenerating(false);
      }
    },
    [session, t],
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
