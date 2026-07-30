import { AlertCircle, Dumbbell, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingPreparationAd } from '@/ads/ad-placements.js';
import { TrainingPlanProvider } from '@/training/training-plan-provider.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import { AppLoading } from './app-loading.js';
import { TrainingActivePlan } from './training-active-plan.js';
import { TrainingPreparationProgress } from './training-preparation-progress.js';
import { TrainingPlanWizard } from './training-plan-wizard.js';
import { Button } from './ui/button.js';

function TrainingScreenContent() {
  const { t } = useTranslation();
  const { errorMessage, isLoading, reload, state } = useTrainingPlan();

  if (isLoading && !state) {
    return (
      <section className="mt-5">
        <AppLoading
          className="min-h-56"
          description={t('training.loadingDescription')}
          label={t('training.loading')}
        />
      </section>
    );
  }

  const isPending = Boolean(state && !state.activePlan && !state.canGenerate);

  return (
    <section className="mt-5 grid w-full gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell aria-hidden="true" size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
          <h1 className="text-2xl font-black leading-tight text-foreground">
            {state?.activePlan
              ? t('training.activeTitle')
              : isPending
                ? t('training.pendingTitle')
                : t('training.newTitle')}
          </h1>
        </div>
      </div>
      {errorMessage ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-destructive/35 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="flex min-w-0 items-start gap-2 break-words text-sm font-bold text-foreground">
            <AlertCircle aria-hidden className="mt-0.5 shrink-0" size={18} />
            {errorMessage}
          </p>
          <Button
            className="shrink-0"
            onClick={() => void reload({ force: true })}
            type="button"
            variant="outline"
          >
            <RefreshCw aria-hidden size={16} />
            {t('training.retry')}
          </Button>
        </div>
      ) : null}
      {state?.activePlan ? (
        <TrainingActivePlan plan={state.activePlan} />
      ) : state?.canGenerate ? (
        <TrainingPlanWizard />
      ) : state?.pendingGeneration ? (
        <div className="grid gap-3">
          <TrainingPreparationProgress generation={state.pendingGeneration} />
          <TrainingPreparationAd />
          <p className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm font-bold text-muted-foreground">
            {t('training.pendingMessage')}
          </p>
          {!errorMessage ? (
            <Button
              className="justify-self-start"
              onClick={() => void reload({ force: true })}
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden size={16} />
              {t('training.retry')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function TrainingScreen() {
  return (
    <TrainingPlanProvider>
      <TrainingScreenContent />
    </TrainingPlanProvider>
  );
}
