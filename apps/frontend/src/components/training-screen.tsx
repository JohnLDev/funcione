import { AlertCircle, Clock3, Dumbbell, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingPlanProvider } from '@/training/training-plan-provider.js';
import { useTrainingPlan } from '@/training/use-training-plan.js';
import { TrainingActivePlan } from './training-active-plan.js';
import { TrainingPlanWizard } from './training-plan-wizard.js';
import { Button } from './ui/button.js';
import { Card, CardContent } from './ui/card.js';

function TrainingScreenContent() {
  const { t } = useTranslation();
  const { errorMessage, isLoading, reload, state } = useTrainingPlan();

  if (isLoading && !state) {
    return (
      <section className="mt-5">
        <p className="text-sm font-bold text-muted-foreground">
          {t('training.loading')}
        </p>
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
            onClick={() => void reload()}
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
      ) : state ? (
        <Card className="rounded-2xl">
          <CardContent className="grid justify-items-start gap-3 p-4">
            <Clock3 aria-hidden className="text-primary" size={24} />
            <p className="text-sm font-bold text-muted-foreground">
              {t('training.pendingMessage')}
            </p>
            {!errorMessage ? (
              <Button onClick={() => void reload()} type="button" variant="outline">
                <RefreshCw aria-hidden size={16} />
                {t('training.retry')}
              </Button>
            ) : null}
          </CardContent>
        </Card>
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
